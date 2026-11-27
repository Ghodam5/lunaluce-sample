'use strict';
// 部品: oms-reflect（OMSの「反映」ボタンの受け手）。外の部品は使わない（Node 22 だけ）。
// OMSの画面（oms-app）の /api/ からだけ呼ばれる（oms-app のパスワードの内側）。この部品自体は外に出さない。
//   GET  /api/reflect/status            つながり先の用意と、反映の記録
//   POST /api/reflect/site    {draft, dry_run, snapshot}  新サイト: 書き出しをサイトに入れてビルドし、GitHubにプルリクエストを作る（dry_run は変わるファイルを見るだけ）
//   POST /api/reflect/welcart {draft, dry_run, snapshot}  Welcart: テスト環境の受け取りプラグインへ送る（本番の住所は断る）
//   POST /api/reflect/log     {dest, action, ok, note, snapshot}  楽天・Yahoo など手で入れた分の記録
// 鍵（GITHUB_TOKEN・WELCART_TEST_APP_PASSWORD）は環境欄から読むだけで、画面・記録・エラー文に出さない。
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');

const PORT = Number(process.env.PORT || 8090);
const DATA = process.env.DATA_DIR || '/data';
const LOG = path.join(DATA, 'reflect-log.json');
const REPO = process.env.GITHUB_REPO || 'Ghodam5/lunaluce-sample';
const BASE = process.env.SITE_BASE_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || '';
const WP_URL = (process.env.WELCART_TEST_URL || '').replace(/\/+$/, '');
const WP_USER = process.env.WELCART_TEST_USER || '';
const WP_PASS = process.env.WELCART_TEST_APP_PASSWORD || '';
// 送り先は検証用サイトに固定。環境欄がこれ以外（本番・旧コアサーバーなど）なら送らない
const PINNED_WELCART_URL = 'https://renewal-test.luna-luce.info';
const ALLOWED_WELCART_HOSTS = ['renewal-test.luna-luce.info'];
const MAX_BODY = 25 * 1024 * 1024;
// テスト用: 手元の写し（git の住所）を使う。本番では空
const SITE_REMOTE = process.env.SITE_REMOTE || '';

const secrets = [TOKEN, WP_PASS].filter(Boolean);
const hide = s => secrets.reduce((t, k) => t.split(k).join('＊＊＊'), String(s || ''));

function readLog() {
  try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch { return { last: {}, history: [] }; }
}
function record(entry, snapshot) {
  const log = readLog();
  const row = Object.assign({ at: new Date().toISOString() }, entry);
  log.history.unshift(row);
  log.history = log.history.slice(0, 200);
  if (entry.action === 'apply' && entry.ok && snapshot && typeof snapshot === 'object') log.last[entry.dest] = { at: row.at, by: row.by || '', snapshot };
  if (entry.action === 'apply' && !entry.ok) log.last[entry.dest] = Object.assign({}, log.last[entry.dest] || {}, { failedAt: row.at, failNote: row.note || '' });
  fs.mkdirSync(DATA, { recursive: true });
  const tmp = LOG + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(log));
  fs.renameSync(tmp, LOG);
  return row;
}

function welcartHost() {
  if (!WP_URL) return '';
  try { return new URL(WP_URL).hostname; } catch { return ''; }
}
function welcartReady() {
  const host = welcartHost();
  if (!host || !WP_USER || !WP_PASS) return 'Welcartのテスト環境の住所・ユーザー名・アプリケーションパスワードが環境欄にありません';
  if (!/^https:/.test(WP_URL)) return 'https の住所だけにします';
  if (!ALLOWED_WELCART_HOSTS.includes(host) || WP_URL !== PINNED_WELCART_URL) {
    return '送り先は ' + PINNED_WELCART_URL + ' だけです（' + (WP_URL || host || '空') + ' には送りません）';
  }
  return '';
}

function run(cmd, args, opts = {}) {
  const r = cp.spawnSync(cmd, args, Object.assign({ encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 }, opts));
  if (r.error) throw Error(hide(cmd + ': ' + r.error.message));
  return r;
}
// エラーの見出し（Error: …）を先に出す。Node の呼び出し履歴（at …）は画面に出さない
function errorLines(text) {
  const lines = String(text).trim().split('\n');
  const msg = lines.filter(function (l) { return /^\s*(\w*Error|fatal|error):/i.test(l); });
  const rest = lines.filter(function (l) { return l.trim() && !/^\s+at /.test(l) && !/^Node\.js v/.test(l) && !/^\s*\^+\s*$/.test(l); });
  return (msg.length ? msg.concat(rest.filter(function (l) { return msg.indexOf(l) < 0; }).slice(-2)) : rest.slice(-5)).join('\n');
}
function must(cmd, args, opts) {
  const r = run(cmd, args, opts);
  if (r.status !== 0) throw Error(hide(errorLines(r.stderr || r.stdout || '')) || cmd + ' に失敗');
  return r.stdout;
}

async function github(method, url, body) {
  const res = await fetch('https://api.github.com/repos/' + REPO + url, {
    method, headers: { authorization: 'Bearer ' + TOKEN, accept: 'application/vnd.github+json', 'user-agent': 'luna-oms-reflect', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw Error('GitHub ' + res.status + ': ' + hide(text).slice(0, 300));
  return text ? JSON.parse(text) : {};
}

function stamp() {
  // 日本時間の 20261122-0315 の形
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
}

let busy = false;
async function reflectSite(body, by) {
  if (!TOKEN && !SITE_REMOTE) throw Error('GITHUB_TOKEN が環境欄にありません');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-reflect-'));
  try {
    const remote = SITE_REMOTE || 'https://x-access-token:' + TOKEN + '@github.com/' + REPO + '.git';
    must('git', ['clone', '-q', '--depth', '1', '--branch', BASE, remote, dir]);
    if (!fs.existsSync(path.join(dir, 'tools/apply-oms-export.cjs'))) throw Error('サイト側の受け口（tools/apply-oms-export.cjs）がまだ ' + BASE + ' に入っていません');
    const draftFile = path.join(os.tmpdir(), path.basename(dir) + '-draft.json');
    fs.writeFileSync(draftFile, JSON.stringify(body.draft));
    let report;
    try {
      const r = run(process.execPath, ['tools/apply-oms-export.cjs', draftFile], { cwd: dir });
      if (r.status !== 0 && r.status !== 2) throw Error(hide(r.stderr).trim() || '書き出しを入れられませんでした');
      report = JSON.parse(r.stdout);
    } finally { fs.rmSync(draftFile, { force: true }); }
    must(process.execPath, ['tools/build-site.cjs'], { cwd: dir });
    const files = must('git', ['status', '--porcelain'], { cwd: dir }).split('\n').filter(Boolean).map(l => l.slice(3));
    if (body.dry_run !== false) return { ok: true, dry: true, report, files };
    if (!files.length) return { ok: true, dry: false, report, files, nothing: true };
    const branch = 'oms-reflect/' + stamp();
    const author = ['-c', 'user.name=OMS 反映', '-c', 'user.email=oms-reflect@users.noreply.github.com'];
    must('git', ['checkout', '-q', '-b', branch], { cwd: dir });
    must('git', ['add', '-A'], { cwd: dir });
    const applied = report.applied.filter(x => x.files.length).map(x => x.label);
    must('git', author.concat(['commit', '-q', '-m', 'OMSから反映: ' + (applied.join('・') || 'ページの作り直し') + (by ? '（' + by + '）' : '')]), { cwd: dir });
    must('git', ['push', '-q', 'origin', branch], { cwd: dir });
    const lines = ['OMSのサイトビルダーの「反映する」で作ったプルリクエストです。' + (by ? '操作した人: ' + by : ''), '', '## 入れたもの'];
    for (const x of report.applied) lines.push('- ' + x.label + (x.files.length ? '（' + x.files.length + 'ファイル）' : '（変更なし）'));
    if (report.later.length) { lines.push('', '## まだサイトに入れない部品'); for (const x of report.later) lines.push('- ' + x.label + ' ' + x.count + '件'); }
    if (report.errors.length) { lines.push('', '## 入れられなかった部品（元のまま）'); for (const x of report.errors) lines.push('- ' + x.label + ': ' + x.error); }
    lines.push('', '中身を確かめてからマージしてください。マージすると GitHub Pages の見本サイトに出ます。');
    const pr = await github('POST', '/pulls', { title: 'OMSから反映 ' + stamp(), head: branch, base: BASE, body: lines.join('\n') });
    return { ok: true, dry: false, report, files, pr: { number: pr.number, url: pr.html_url } };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}


// プラグインは days.changes を {date, from, to} の配列で返す。古いOMS画面はこれを文字のようにつないで [object Object] になる。
// 反映サーバーで見られる文にして渡す。画面の #31 修正がまだ入っていない端末でも、試し結果が読める。
function daysText(days) {
  if (!days) return '';
  if (typeof days === 'string') return days;
  const changes = days.changes || [];
  if (!changes.length) return '入れました';
  const dates = changes.map(function (c) {
    if (typeof c === 'string') return String(c).replace(/-/g, '/');
    return String((c && c.date) || '').replace(/-/g, '/');
  }).filter(Boolean);
  const n = dates.length || changes.length;
  const shown = dates.slice(0, 8);
  const more = dates.length > shown.length ? ' ほか' + (dates.length - shown.length) + '日' : '';
  return 'お休み ' + n + '日（' + shown.join('・') + more + '）';
}
function withDaysText(out) {
  if (!out || out.days == null || out.days === '') return out;
  const text = daysText(out.days);
  return Object.assign({}, out, { days: text, daysText: text });
}

async function reflectWelcart(body) {
  const bad = welcartReady();
  if (bad) throw Error(bad);
  const res = await fetch(PINNED_WELCART_URL + '/wp-json/luna-oms/v1/import', {
    method: 'POST',
    headers: { authorization: 'Basic ' + Buffer.from(WP_USER + ':' + WP_PASS).toString('base64'), 'content-type': 'application/json', 'user-agent': 'luna-oms-reflect' },
    body: JSON.stringify({ draft: body.draft, dry_run: body.dry_run !== false })
  });
  const text = await res.text();
  let out;
  try { out = JSON.parse(text); } catch { throw Error('Welcartの返事が読めません（' + res.status + '）'); }
  if (!res.ok) throw Error('Welcart ' + res.status + ': ' + hide(out.message || text).slice(0, 300));
  return withDaysText(out);
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((ok, ng) => {
    let size = 0; const parts = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { ng(Error('書き出しが大きすぎます（25MBまで）')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { ng(Error('JSONが読めません')); } });
    req.on('error', ng);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const by = String(req.headers['x-oms-user'] || '').slice(0, 40);
  try {
    if (req.method === 'GET' && url.pathname === '/api/reflect/status') {
      const log = readLog();
      return send(res, 200, { ok: true, site: { ready: !!(TOKEN || SITE_REMOTE), repo: REPO, base: BASE }, welcart: { ready: !welcartReady(), host: welcartHost(), note: welcartReady() }, last: log.last, history: log.history.slice(0, 50), busy });
    }
    if (req.method !== 'POST') return send(res, 404, { ok: false, error: 'ありません' });
    // 同じ住所からのフォーム送信など、OMSの画面以外からの呼び出しを断る
    if (!/^application\/json/.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, error: 'JSONで送ってください' });
    const body = await readBody(req);
    if (url.pathname === '/api/reflect/log') {
      if (!['rakuten', 'yahoo'].includes(body.dest)) return send(res, 400, { ok: false, error: '手で記録できるのは楽天・Yahooだけです' });
      return send(res, 200, { ok: true, row: record({ dest: body.dest, action: body.action === 'try' ? 'try' : 'apply', ok: body.ok !== false, note: String(body.note || '').slice(0, 300), by }, body.snapshot) });
    }
    const dest = url.pathname === '/api/reflect/site' ? 'site' : url.pathname === '/api/reflect/welcart' ? 'welcart' : '';
    if (!dest) return send(res, 404, { ok: false, error: 'ありません' });
    if (!body.draft || body.draft.kind !== 'luna-site-builder-draft') return send(res, 400, { ok: false, error: 'OMSの書き出しがありません' });
    if (busy) return send(res, 409, { ok: false, error: 'ほかの反映が動いています。少し待ってからもう一度押してください' });
    busy = true;
    const action = body.dry_run === false ? 'apply' : 'try';
    try {
      const out = dest === 'site' ? await reflectSite(body, by) : await reflectWelcart(body);
      const note = dest === 'site' ? (out.pr ? 'プルリクエスト #' + out.pr.number : out.nothing ? '変わるファイルはありませんでした' : out.files.length + 'ファイルが変わる') : (out.ok === false ? (out.error || '登録できない商品があります') : (out.items || []).length + '商品・在庫' + (out.stock || []).length + '件');
      const row = record({ dest, action, ok: out.ok !== false, note, by, url: out.pr ? out.pr.url : undefined }, body.snapshot);
      return send(res, 200, Object.assign({ row }, out));
    } catch (e) {
      const row = record({ dest, action, ok: false, note: hide(e.message).slice(0, 300), by });
      return send(res, 502, { ok: false, error: hide(e.message), row });
    } finally { busy = false; }
  } catch (e) {
    return send(res, 400, { ok: false, error: hide(e.message) });
  }
});

if (require.main === module) server.listen(PORT, () => console.log('oms-reflect: ' + PORT + ' で待っています（新サイト ' + (TOKEN ? '用意あり' : '鍵なし') + '・Welcart ' + (welcartReady() || welcartHost()) + '）'));
module.exports = { server, welcartReady, hide, record, readLog, PINNED_WELCART_URL, ALLOWED_WELCART_HOSTS, daysText, withDaysText };
