'use strict';
// 部品: oms-work（工程の状態と作業ログをサーバーに残す）。oms-app の中で Caddy の後ろに置く（127.0.0.1:8071）。外の部品は使わない（Node 22 だけ）。
// - 誰が・いつ・どの注文の・どの工程を・どう変えたか を作業ログに足していく（書き足すだけ。直したり消したりしない）
// - 作業ログは文字だけ。5年（60か月）より古い月のファイルは自動で消す
// - スマホの作業画面に出すのは「作業カード」（商品・数・名入れの名前・日付など）だけ。住所・電話・メールは受け取らない（項目を決め打ちで拾う）
// - 誰なのかは Caddy がログインを確かめてつける X-OMS-User / X-OMS-Role で知る（外から来た同じ見出しは Caddy が捨てる）
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');

const PORT = Number(process.env.WORK_PORT || 8071);
const DATA = process.env.WORK_DIR || path.join(process.env.AUTH_DIR || '/auth', 'work');
const AUTH_FILE = path.join(process.env.AUTH_DIR || '/auth', 'auth.json');
const KEEP_MONTHS = 60;               // 作業ログを残す長さ（林さん: 文字だけなら5年）
const MAX_TEXT = 500;                 // コメント1件の長さ
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const STEP_RE = /^[a-z][a-z0-9-]{0,23}$/;
const ACTIONS = { 'step-done': '工程を終えた', 'step-undo': '工程の完了を取り消した', comment: 'コメント', status: '工程の段階を変えた', card: '作業カードを作った・更新した' };

// ---- あいまい検索（OMS の js/51-fuzzy と同じ決まり） ----
// 全角半角・大文字小文字・カタカナひらがなの違いと、空白・記号を気にしない。言葉は空白で区切って全部ふくむものだけ。
// 4文字以上の言葉は1文字の打ち間違い（抜け・余分・ちがい）まで拾う。
function fold(s) {
  return String(s == null ? '' : s).normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\-‐‑–—―ー・_/.,，、。:：;'"`()（）［］\[\]「」『』&＆+＋♡♥☆★~〜!！?？#＃]/g, '');
}
function words(q) { return String(q || '').normalize('NFKC').split(/\s+/).map(fold).filter(Boolean); }
function near(a, b) { // 1文字ちがいまでなら true（a, b は長さの差が1以内）
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, miss = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++miss > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return miss + (a.length - i) + (b.length - j) <= 1;
}
function hitWord(hay, w) {
  if (hay.includes(w)) return true;
  if (w.length < 4) return false;
  for (let len = w.length - 1; len <= w.length + 1; len++) {
    for (let i = 0; i + len <= hay.length; i++) if (near(hay.slice(i, i + len), w)) return true;
  }
  return false;
}
function fuzzyMatch(text, q) {
  const ws = Array.isArray(q) ? q : words(q);
  if (!ws.length) return true;
  const hay = fold(text);
  return ws.every(w => hitWord(hay, w));
}

// ---- 保存 ----
function readJson(file, empty) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return empty; } }
function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(obj), { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}
const CARDS = () => path.join(DATA, 'cards.json');
const STATE = () => path.join(DATA, 'state.json');
const LOGDIR = () => path.join(DATA, 'log');
let cards = {}, steps = {};
function load() { cards = readJson(CARDS(), {}); steps = readJson(STATE(), {}); }

function monthOf(iso) { return iso.slice(0, 7); }
function appendLog(entry) {
  fs.mkdirSync(LOGDIR(), { recursive: true });
  fs.appendFileSync(path.join(LOGDIR(), monthOf(entry.at) + '.jsonl'), JSON.stringify(entry) + '\n', { mode: 0o600 });
}
function logFiles() {
  try { return fs.readdirSync(LOGDIR()).filter(f => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort().reverse(); } catch { return []; }
}
// 新しい順に読む（見つけたら止める）
function* readLogNewest() {
  for (const f of logFiles()) {
    let lines;
    try { lines = fs.readFileSync(path.join(LOGDIR(), f), 'utf8').split('\n'); } catch { continue; }
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i]) continue;
      try { yield JSON.parse(lines[i]); } catch { /* 壊れた行は飛ばす */ }
    }
  }
}
// 5年より古い月を消す
function prune(now) {
  const d = new Date(now || Date.now());
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - KEEP_MONTHS);
  const limit = d.toISOString().slice(0, 7);
  const gone = [];
  for (const f of logFiles()) if (f.slice(0, 7) < limit) { try { fs.unlinkSync(path.join(LOGDIR(), f)); gone.push(f); } catch { /* 次の回 */ } }
  return gone;
}

// ---- 名前（表示名は oms-auth のアカウントから） ----
let names = { mtime: -1, map: {} };
function displayOf(user) {
  // アカウントのファイルが変わったときだけ読み直す（招待で増えた人も、表示名を変えた人もすぐ反映）
  let mtime = 0;
  try { mtime = fs.statSync(AUTH_FILE).mtimeMs; } catch { /* まだ無い */ }
  if (mtime !== names.mtime) {
    const d = readJson(AUTH_FILE, { users: [] });
    names = { mtime, map: Object.fromEntries((d.users || []).map(u => [u.name, u.display || u.name])) };
  }
  return names.map[user] || user;
}

// ---- 作業カード（住所・電話・メールは持たない。ここに無い項目は捨てる） ----
const CARD_FIELDS = { id: 64, channelLabel: 40, productName: 120, sku: 60, qty: 8, coupleNames: 120, customerName: 80, weddingDate: 20, deliveryDate: 20, orderDate: 20, headerMsg: 120, design: 120, noshi: 120, warning: 300, rush: 5, status: 40 };
const NOT_ALLOWED = /住所|address|postal|郵便|電話|phone|tel|mail|メール/i;
// 写真はサイトの images/ と OMS の miniseal/ の中だけ（.. で外に出るものは捨てる）
function imgSrc(v) {
  const s = String(v || '').slice(0, 300);
  const m = /^(?:\.\.\/images\/|images\/|miniseal\/)(.+)$/.exec(s);
  return m && !/\.\.|["'<>\\?#]/.test(m[1]) ? s : '';
}
function cleanCard(raw) {
  if (!raw || typeof raw !== 'object') throw Error('作業カードがありません');
  const c = {};
  for (const [k, max] of Object.entries(CARD_FIELDS)) {
    if (raw[k] === undefined || raw[k] === null || raw[k] === '') continue;
    c[k] = String(raw[k]).slice(0, max);
  }
  if (!ID_RE.test(c.id || '')) throw Error('注文番号が不正です');
  c.steps = (Array.isArray(raw.steps) ? raw.steps : []).slice(0, 20).map(s => ({ id: String(s && s.id || ''), label: String(s && s.label || '').slice(0, 30), note: String(s && s.note || '').slice(0, 60) }))
    .filter(s => STEP_RE.test(s.id) && s.label);
  if (!c.steps.length) throw Error('工程がありません');
  c.items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 12).map(it => ({ kind: String(it && it.kind || '').slice(0, 20), label: String(it && it.label || '').slice(0, 80), src: imgSrc(it && it.src) }));
  c.texts = (Array.isArray(raw.texts) ? raw.texts : []).slice(0, 10).map(r => [String(r && r[0] || '').slice(0, 30), String(r && r[1] || '').slice(0, 200)])
    .filter(r => r[0] && r[1] && !NOT_ALLOWED.test(r[0]));
  c.parts = (Array.isArray(raw.parts) ? raw.parts : []).slice(0, 12).map(r => [String(r && r[0] || '').slice(0, 30), String(r && r[1] || '').slice(0, 40)]).filter(r => r[0]);
  return c;
}

// ---- 送受信 ----
function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((ok, ng) => {
    let size = 0; const parts = [];
    req.on('data', c => { size += c.length; if (size > 64 * 1024) { ng(Error('大きすぎます')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { ng(Error('JSONが読めません')); } });
    req.on('error', ng);
  });
}
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === String(req.headers['x-forwarded-host'] || req.headers.host || ''); } catch { return false; }
}
function who(req) {
  const user = String(req.headers['x-oms-user'] || '').trim();
  const role = String(req.headers['x-oms-role'] || '').trim();
  return user ? { user, role: ['admin', 'staff', 'worker'].includes(role) ? role : 'worker', display: displayOf(user) } : null;
}
function record(me, order, action, extra) {
  const e = Object.assign({ at: new Date().toISOString(), user: me.user, display: me.display, role: me.role, order, action }, extra || {});
  if (e.text) e.text = String(e.text).slice(0, MAX_TEXT);
  appendLog(e);
  return e;
}
// 検索の対象の文字（ログ1件＋その注文の作業カード）
function hayOf(e) {
  const c = cards[e.order] || {};
  return [e.order, e.display, e.user, e.stepLabel, e.text, e.from, e.to, ACTIONS[e.action], c.customerName, c.coupleNames, c.productName, c.sku, c.channelLabel].join(' ');
}
function withCard(e) {
  const c = cards[e.order] || {};
  return Object.assign({}, e, { actionLabel: ACTIONS[e.action] || e.action, productName: c.productName || '', sku: c.sku || '', coupleNames: c.coupleNames || '', customerName: c.customerName || '' });
}
function search(qs) {
  const ws = words(qs.get('q'));
  const order = fold(qs.get('order')), user = fold(qs.get('user')), step = String(qs.get('step') || '');
  const product = words(qs.get('product')), customer = words(qs.get('customer')), couple = words(qs.get('couple')), sku = fold(qs.get('sku'));
  const from = String(qs.get('from') || ''), to = String(qs.get('to') || '');
  const limit = Math.min(500, Math.max(1, Number(qs.get('limit')) || 200));
  const out = [];
  let scanned = 0;
  for (const e of readLogNewest()) {
    scanned++;
    const day = e.at.slice(0, 10);
    if (to && day > to) continue;
    if (from && day < from) break; // 新しい順なので、ここから先は全部古い
    const c = cards[e.order] || {};
    if (order && !fold(e.order).includes(order)) continue;
    if (user && !(fold(e.user).includes(user) || fold(e.display).includes(user))) continue;
    if (step && e.step !== step) continue;
    if (sku && !fold(c.sku).includes(sku)) continue;
    if (product.length && !fuzzyMatch(c.productName, product)) continue;
    if (customer.length && !fuzzyMatch(c.customerName, customer)) continue;
    if (couple.length && !fuzzyMatch(c.coupleNames, couple)) continue;
    if (ws.length && !fuzzyMatch(hayOf(e), ws)) continue;
    out.push(withCard(e));
    if (out.length >= limit) break;
  }
  return { entries: out, more: out.length >= limit, scanned };
}
function orderView(id) {
  const log = [];
  for (const e of readLogNewest()) { if (e.order === id) log.push(withCard(e)); if (log.length >= 100) break; }
  return { card: cards[id] || null, state: steps[id] || { steps: {} }, log };
}

// ---- 入口 ----
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/work-api/, '');
  const me = who(req);
  if (!me) return send(res, 401, { ok: false, error: 'ログインしていません', login: true });

  if (req.method === 'GET') {
    if (p === '/me') return send(res, 200, { ok: true, me });
    if (p === '/order') {
      const id = String(url.searchParams.get('id') || '');
      if (!ID_RE.test(id)) return send(res, 400, { ok: false, error: '注文番号が不正です' });
      return send(res, 200, Object.assign({ ok: true }, orderView(id)));
    }
    if (p === '/states') { // 一覧の工程の進み具合（注文番号 → 終えた工程の数／全部）
      const out = {};
      for (const [id, s] of Object.entries(steps)) {
        const c = cards[id];
        if (!c) continue;
        out[id] = { done: c.steps.filter(x => s.steps && s.steps[x.id]).length, total: c.steps.length, at: s.at || '' };
      }
      return send(res, 200, { ok: true, states: out });
    }
    if (p === '/log') return send(res, 200, Object.assign({ ok: true }, search(url.searchParams)));
    if (p === '/suggest') { // 打っている途中の候補（注文）
      const ws = words(url.searchParams.get('q'));
      if (!ws.length) return send(res, 200, { ok: true, items: [] });
      const items = Object.values(cards).filter(c => fuzzyMatch([c.id, c.customerName, c.coupleNames, c.productName, c.sku].join(' '), ws)).slice(0, 8)
        .map(c => ({ id: c.id, productName: c.productName || '', sku: c.sku || '', coupleNames: c.coupleNames || '', customerName: c.customerName || '' }));
      return send(res, 200, { ok: true, items });
    }
    return send(res, 404, { ok: false, error: 'ありません' });
  }

  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'できません' });
  if (!/^application\/json/.test(req.headers['content-type'] || '') || !sameOrigin(req)) return send(res, 415, { ok: false, error: 'OMSの画面から送ってください' });
  const b = await body(req);

  if (p === '/card') {
    if (me.role === 'worker') return send(res, 403, { ok: false, error: '作業カードは事務の人が作ります' });
    const c = cleanCard(b.card);
    const before = cards[c.id];
    c.updatedAt = new Date().toISOString(); c.updatedBy = me.user;
    cards[c.id] = c;
    writeJson(CARDS(), cards);
    if (!before) record(me, c.id, 'card');
    return send(res, 200, { ok: true, card: c });
  }

  const id = String(b.id || '');
  if (!ID_RE.test(id)) return send(res, 400, { ok: false, error: '注文番号が不正です' });
  const card = cards[id];

  if (p === '/step') {
    if (!card) return send(res, 404, { ok: false, error: 'この注文の作業カードがまだありません。事務の人に「スマホで作業開始」を押してもらってください' });
    const st = card.steps.find(s => s.id === b.step);
    if (!st) return send(res, 400, { ok: false, error: 'その工程はこの注文にありません' });
    const s = steps[id] || (steps[id] = { steps: {} });
    const done = !!b.done;
    const was = !!s.steps[st.id];
    if (was === done) return send(res, 200, Object.assign({ ok: true, same: true }, orderView(id)));
    if (done) s.steps[st.id] = { by: me.user, display: me.display, at: new Date().toISOString() };
    else delete s.steps[st.id];
    s.at = new Date().toISOString();
    writeJson(STATE(), steps);
    record(me, id, done ? 'step-done' : 'step-undo', { step: st.id, stepLabel: st.label, from: was ? '済' : '未', to: done ? '済' : '未', text: b.comment ? String(b.comment) : undefined });
    return send(res, 200, Object.assign({ ok: true }, orderView(id)));
  }
  if (p === '/comment') {
    const text = String(b.text || '').trim();
    if (!text) return send(res, 400, { ok: false, error: 'コメントを入れてください' });
    const st = card && card.steps.find(s => s.id === b.step);
    record(me, id, 'comment', { step: st ? st.id : undefined, stepLabel: st ? st.label : undefined, text });
    return send(res, 200, Object.assign({ ok: true }, orderView(id)));
  }
  if (p === '/status') {
    if (me.role === 'worker') return send(res, 403, { ok: false, error: '工程の段階は事務の人が変えます' });
    const from = String(b.from || '').slice(0, 40), to = String(b.to || '').slice(0, 40);
    if (!to || from === to) return send(res, 400, { ok: false, error: '変えた後の段階がありません' });
    if (card) { card.status = to; writeJson(CARDS(), cards); }
    record(me, id, 'status', { from, to });
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { ok: false, error: 'ありません' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(e => { try { send(res, 400, { ok: false, error: String(e.message || e).slice(0, 200) }); } catch { /* 送れない */ } });
});

if (require.main === module) {
  load();
  const gone = prune();
  if (gone.length) console.log('oms-work: 5年より古い作業ログを消しました ' + gone.join(', '));
  setInterval(() => prune(), 24 * 3600e3).unref();
  server.listen(PORT, '127.0.0.1', () => console.log('oms-work: ' + PORT + ' で待っています（作業カード ' + Object.keys(cards).length + '件）'));
}
module.exports = { server, load, prune, fold, words, fuzzyMatch, cleanCard, KEEP_MONTHS };
