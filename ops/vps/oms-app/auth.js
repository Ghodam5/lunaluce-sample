'use strict';
// 部品: oms-auth（OMSのログイン）。oms-app の中で Caddy の後ろに置く。外の部品は使わない（Node 22 だけ）。
// - ログイン・ログアウト・招待リンクで新規登録・パスワードを忘れたとき（管理者が再設定リンクを出す）・アカウント管理
// - パスワードは scrypt で暗号化して保存し、画面・記録・エラー文に出さない
// - 最初の管理者（オーナー）は環境欄の OMS_USER / OMS_PASSWORD。環境欄のパスワードを変えて再起動すると、オーナーのパスワードがそれに戻る（忘れたときの最後の手）
// - Caddy は forward_auth で GET /auth/check を呼び、通れば X-OMS-User / X-OMS-Role をつけて画面と /api/ へ渡す
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

const PORT = Number(process.env.AUTH_PORT || 8070);
const DATA = process.env.AUTH_DIR || '/auth';
const OWNER = String(process.env.OMS_USER || 'lunaluce').trim().toLowerCase();
const OWNER_PASS = process.env.OMS_PASSWORD || '';
const COOKIE = 'oms_s';
const SESSION_IDLE = 14 * 864e5, SESSION_MAX = 30 * 864e5;
const INVITE_TTL = 3 * 864e5, RESET_TTL = 864e5;
const MIN_PASS = 10, MAX_FAILS = 5, LOCK_MS = 15 * 60e3;
// 作業員: 工程の記録とスマホの作業画面だけ。住所・電話・メールは見せない（林さん 2026-11-23）
const ROLES = { admin: '管理者', staff: 'スタッフ', worker: '作業員' };
const NAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

// ---- 保存（1ファイル。書くときは一時ファイル→名前を変える） ----
const FILE = path.join(DATA, 'auth.json');
function load() {
  let d;
  try { d = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { d = {}; }
  return Object.assign({ users: [], sessions: {}, invites: [], resets: [], requests: [], log: [] }, d);
}
let db = load();
function save() {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(FILE + '.tmp', JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(FILE + '.tmp', FILE);
}
function log(what, by, note) {
  db.log.unshift({ at: new Date().toISOString(), what, by: by || '', note: note || '' });
  db.log = db.log.slice(0, 500);
}

// ---- パスワード ----
function hashPass(pass) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pass, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('base64') + '$' + key.toString('base64');
}
function checkPass(pass, stored) {
  const m = /^scrypt\$([^$]+)\$([^$]+)$/.exec(stored || '');
  if (!m) return false;
  const want = Buffer.from(m[2], 'base64');
  const got = crypto.scryptSync(String(pass), Buffer.from(m[1], 'base64'), want.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(want, got);
}
function passProblem(pass, name) {
  pass = String(pass || '');
  if (pass.length < MIN_PASS) return 'パスワードは' + MIN_PASS + '文字以上にしてください';
  if (pass.length > 200) return 'パスワードが長すぎます';
  if (name && pass.toLowerCase().includes(name)) return 'パスワードにログイン名を入れないでください';
  return '';
}
const token = () => crypto.randomBytes(32).toString('base64url');
const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const user = name => db.users.find(u => u.name === name);
const isAdmin = u => !!u && (u.owner || u.role === 'admin');
const pub = u => ({ /* hash は出さない */ name: u.name, display: u.display || u.name, role: u.role, roleLabel: ROLES[u.role], owner: !!u.owner, active: u.active !== false, createdAt: u.createdAt, createdBy: u.createdBy || '', lastLogin: u.lastLogin || '' });

// オーナーを環境欄から用意する
// 環境欄のパスワードが前回と変わったときだけ、オーナーのパスワードをそれに戻す（画面で変えたパスワードは再起動では消さない）
function ensureOwner() {
  if (!OWNER_PASS) return;
  let u = user(OWNER);
  if (!u) {
    u = { name: OWNER, display: OWNER, createdAt: new Date().toISOString(), createdBy: '環境欄', hash: hashPass(OWNER_PASS) };
    db.users.push(u);
    log('オーナーを用意', OWNER);
  } else if (!checkPass(OWNER_PASS, u.ownerEnvHash)) {
    u.hash = hashPass(OWNER_PASS);
    endSessions(u.name);
    log('オーナーのパスワードを環境欄の値に戻した', OWNER);
  }
  Object.assign(u, { owner: true, role: 'admin', active: true });
  if (!checkPass(OWNER_PASS, u.ownerEnvHash)) u.ownerEnvHash = hashPass(OWNER_PASS);
  for (const o of db.users) if (o !== u && o.owner) delete o.owner;
  save();
}

// ---- セッション ----
function endSessions(name, except) {
  for (const [k, s] of Object.entries(db.sessions)) if (s.user === name && k !== except) delete db.sessions[k];
}
function cookies(req) {
  const out = {};
  for (const p of String(req.headers.cookie || '').split(';')) { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }
  return out;
}
function session(req) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  const k = sha(t), s = db.sessions[k], now = Date.now();
  if (!s) return null;
  const u = user(s.user);
  if (!u || u.active === false || now - s.seen > SESSION_IDLE || now - s.created > SESSION_MAX) { delete db.sessions[k]; save(); return null; }
  if (now - s.seen > 60e3) { s.seen = now; save(); }
  return { key: k, user: u };
}
function setCookie(res, value, maxAge) {
  res.setHeader('set-cookie', COOKIE + '=' + value + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge);
}

// ---- 失敗が続いたら止める ----
const fails = new Map();
function locked(key) { const f = fails.get(key); return f && f.until > Date.now(); }
function failed(key) {
  const f = fails.get(key) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= MAX_FAILS) { f.until = Date.now() + LOCK_MS; f.n = 0; }
  fails.set(key, f);
}
const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// ---- 送受信 ----
function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readJson(req) {
  return new Promise((ok, ng) => {
    let size = 0; const parts = [];
    req.on('data', c => { size += c.length; if (size > 64 * 1024) { ng(Error('大きすぎます')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { ng(Error('JSONが読めません')); } });
    req.on('error', ng);
  });
}
function baseUrl(req) {
  // リンクは https で作る（手元の確かめ localhost / 127.0.0.1 だけ http のまま）
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return (local ? String(req.headers['x-forwarded-proto'] || 'http').split(',')[0] : 'https') + '://' + host;
}
// 別のサイトからの送信を断る（Cookie は SameSite=Strict。そのうえ Origin も見る）
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === String(req.headers['x-forwarded-host'] || req.headers.host || ''); } catch { return false; }
}
function cleanup() {
  const now = Date.now();
  db.invites = db.invites.filter(x => x.expires > now && !x.used);
  db.resets = db.resets.filter(x => x.expires > now && !x.used);
  db.requests = db.requests.filter(x => now - Date.parse(x.at) < 7 * 864e5);
}

// ---- 画面（ログイン・登録・再設定・アカウント） ----
const PAGES = require('./auth-pages.js');
function page(res, name, data) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'" });
  res.end(PAGES.render(name, data || {}));
}

// ---- 入口 ----
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  // Caddy の forward_auth から
  if (p === '/auth/check') {
    const s = session(req);
    if (s) { res.writeHead(200, { 'x-oms-user': s.user.name, 'x-oms-role': isAdmin(s.user) ? 'admin' : (s.user.role === 'worker' ? 'worker' : 'staff') }); return res.end(); }
    const uri = String(req.headers['x-forwarded-uri'] || '/');
    if (uri.startsWith('/api/') || uri.startsWith('/work-api/')) return send(res, 401, { ok: false, error: 'ログインが切れました。画面を読み込み直してログインしてください', login: true });
    res.writeHead(302, { location: '/login?next=' + encodeURIComponent(uri.startsWith('/') && !uri.startsWith('//') ? uri : '/oms/') });
    return res.end();
  }

  if (req.method === 'GET') {
    if (p === '/login') return page(res, 'login', { next: url.searchParams.get('next') || '/oms/' });
    if (p === '/forgot') return page(res, 'forgot');
    if (p === '/join') {
      const inv = db.invites.find(x => x.tokenHash === sha(url.searchParams.get('t') || '') && !x.used && x.expires > Date.now());
      return page(res, 'join', { ok: !!inv, role: inv ? ROLES[inv.role] : '' });
    }
    if (p === '/reset') {
      const r = db.resets.find(x => x.tokenHash === sha(url.searchParams.get('t') || '') && !x.used && x.expires > Date.now());
      return page(res, 'reset', { ok: !!r, name: r ? r.user : '' });
    }
    if (p === '/account') {
      const s = session(req);
      if (!s) { res.writeHead(302, { location: '/login?next=/account' }); return res.end(); }
      return page(res, 'account', { admin: isAdmin(s.user) });
    }
    if (p === '/auth/api/me') {
      const s = session(req);
      return s ? send(res, 200, { ok: true, me: pub(s.user) }) : send(res, 401, { ok: false, error: 'ログインしていません' });
    }
    if (p === '/auth/api/users') {
      const s = session(req);
      if (!s) return send(res, 401, { ok: false, error: 'ログインしていません' });
      if (!isAdmin(s.user)) return send(res, 403, { ok: false, error: '管理者だけが見られます' });
      cleanup();
      return send(res, 200, {
        ok: true, me: pub(s.user), users: db.users.map(pub),
        invites: db.invites.map(x => ({ id: x.id, role: x.role, roleLabel: ROLES[x.role], createdBy: x.createdBy, expires: new Date(x.expires).toISOString() })),
        requests: db.requests, log: db.log.slice(0, 100)
      });
    }
    return send(res, 404, { ok: false, error: 'ありません' });
  }

  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'できません' });
  if (!/^application\/json/.test(req.headers['content-type'] || '') || !sameOrigin(req)) return send(res, 415, { ok: false, error: 'OMSの画面から送ってください' });
  const body = await readJson(req);
  const ip = ipOf(req);

  if (p === '/auth/login') {
    const name = String(body.name || '').trim().toLowerCase();
    if (locked('ip:' + ip) || locked('u:' + name)) return send(res, 429, { ok: false, error: '失敗が続いたので15分止めています。少し待ってからもう一度どうぞ' });
    const u = user(name);
    const good = u && u.active !== false && checkPass(body.password, u.hash);
    if (!good) {
      // ない名前でも同じだけ時間をかけて、名前があるかどうかを分からないようにする
      if (!u) checkPass(body.password, hashPass('x'));
      failed('ip:' + ip); failed('u:' + name);
      log('ログイン失敗', name.slice(0, 32), ip);
      save();
      return send(res, 401, { ok: false, error: 'ログイン名かパスワードが違います' });
    }
    fails.delete('u:' + name);
    const t = token();
    db.sessions[sha(t)] = { user: u.name, created: Date.now(), seen: Date.now(), ua: String(req.headers['user-agent'] || '').slice(0, 120) };
    u.lastLogin = new Date().toISOString();
    log('ログイン', u.name, ip);
    save();
    setCookie(res, t, Math.floor(SESSION_IDLE / 1000));
    const next = String(body.next || '/oms/');
    return send(res, 200, { ok: true, next: next.startsWith('/') && !next.startsWith('//') ? next : '/oms/' });
  }

  if (p === '/auth/logout') {
    const s = session(req);
    if (s) { delete db.sessions[s.key]; log('ログアウト', s.user.name); save(); }
    setCookie(res, '', 0);
    return send(res, 200, { ok: true });
  }

  if (p === '/auth/forgot') {
    // 名前があってもなくても同じ返事にする。管理者の「アカウント」画面に出す
    const name = String(body.name || '').trim().toLowerCase().slice(0, 32);
    if (locked('forgot:' + ip)) return send(res, 429, { ok: false, error: '少し待ってからもう一度どうぞ' });
    failed('forgot:' + ip);
    if (user(name) && !db.requests.some(x => x.user === name)) { db.requests.push({ user: name, at: new Date().toISOString() }); log('パスワードを忘れた連絡', name, ip); save(); }
    return send(res, 200, { ok: true, message: '管理者に知らせました。管理者から再設定のリンクを受け取ってください' });
  }

  if (p === '/auth/join') {
    cleanup();
    const inv = db.invites.find(x => x.tokenHash === sha(body.token || ''));
    if (!inv) return send(res, 400, { ok: false, error: '招待リンクが使えません（期限切れか、使用済み）。管理者に新しいリンクをもらってください' });
    const name = String(body.name || '').trim().toLowerCase();
    if (!NAME_RE.test(name)) return send(res, 400, { ok: false, error: 'ログイン名は英小文字・数字・. _ - で3〜32文字にしてください' });
    if (user(name)) return send(res, 400, { ok: false, error: 'そのログイン名はもう使われています' });
    const bad = passProblem(body.password, name);
    if (bad) return send(res, 400, { ok: false, error: bad });
    const u = { name, display: String(body.display || name).trim().slice(0, 30) || name, role: inv.role, active: true, createdAt: new Date().toISOString(), createdBy: inv.createdBy, hash: hashPass(body.password) };
    db.users.push(u);
    inv.used = true;
    log('招待で登録', name, ROLES[inv.role] + '・招待した人 ' + inv.createdBy);
    cleanup(); save();
    return send(res, 200, { ok: true, next: '/login' });
  }

  if (p === '/auth/reset') {
    cleanup();
    const r = db.resets.find(x => x.tokenHash === sha(body.token || ''));
    if (!r) return send(res, 400, { ok: false, error: '再設定リンクが使えません（期限切れか、使用済み）。管理者に新しいリンクをもらってください' });
    const u = user(r.user);
    if (!u) return send(res, 400, { ok: false, error: 'アカウントがありません' });
    const bad = passProblem(body.password, u.name);
    if (bad) return send(res, 400, { ok: false, error: bad });
    u.hash = hashPass(body.password);
    r.used = true;
    endSessions(u.name);
    db.requests = db.requests.filter(x => x.user !== u.name);
    log('パスワードを再設定', u.name, 'リンクを出した人 ' + r.createdBy);
    cleanup(); save();
    return send(res, 200, { ok: true, next: '/login' });
  }

  // ここから先はログインしている人だけ
  const s = session(req);
  if (!s) return send(res, 401, { ok: false, error: 'ログインしていません' });
  const me = s.user;

  if (p === '/auth/api/password') {
    if (!checkPass(body.current, me.hash)) return send(res, 400, { ok: false, error: '今のパスワードが違います' });
    const bad = passProblem(body.password, me.name);
    if (bad) return send(res, 400, { ok: false, error: bad });
    me.hash = hashPass(body.password);
    endSessions(me.name, s.key);
    log('パスワードを変更', me.name);
    save();
    return send(res, 200, { ok: true });
  }
  if (p === '/auth/api/display') {
    me.display = String(body.display || '').trim().slice(0, 30) || me.name;
    save();
    return send(res, 200, { ok: true, me: pub(me) });
  }

  if (!isAdmin(me)) return send(res, 403, { ok: false, error: '管理者だけができます' });

  if (p === '/auth/api/invite') {
    const role = ROLES[body.role] ? body.role : 'staff';
    const t = token();
    db.invites.push({ id: token().slice(0, 10), tokenHash: sha(t), role, createdBy: me.name, expires: Date.now() + INVITE_TTL });
    log('招待リンクを作成', me.name, ROLES[role]);
    save();
    return send(res, 200, { ok: true, link: baseUrl(req) + '/join?t=' + t, expires: new Date(Date.now() + INVITE_TTL).toISOString() });
  }
  if (p === '/auth/api/invite-cancel') {
    db.invites = db.invites.filter(x => x.id !== body.id);
    log('招待リンクを取り消し', me.name);
    save();
    return send(res, 200, { ok: true });
  }

  const target = user(String(body.name || ''));
  if (!target) return send(res, 404, { ok: false, error: 'そのアカウントはありません' });

  if (p === '/auth/api/reset-link') {
    const t = token();
    db.resets = db.resets.filter(x => x.user !== target.name);
    db.resets.push({ tokenHash: sha(t), user: target.name, createdBy: me.name, expires: Date.now() + RESET_TTL });
    log('再設定リンクを作成', me.name, target.name);
    save();
    return send(res, 200, { ok: true, link: baseUrl(req) + '/reset?t=' + t, expires: new Date(Date.now() + RESET_TTL).toISOString() });
  }
  if (p === '/auth/api/dismiss-request') {
    db.requests = db.requests.filter(x => x.user !== target.name);
    save();
    return send(res, 200, { ok: true });
  }
  if (target.owner) return send(res, 400, { ok: false, error: 'オーナー（環境欄のアカウント）は止めたり消したり、権限を変えたりできません' });
  if (target.name === me.name) return send(res, 400, { ok: false, error: '自分のアカウントはここでは変えられません' });

  if (p === '/auth/api/update') {
    if (body.role && ROLES[body.role]) target.role = body.role;
    if (typeof body.active === 'boolean') { target.active = body.active; if (!body.active) endSessions(target.name); }
    log('アカウントを変更', me.name, target.name + '：' + ROLES[target.role] + (target.active === false ? '・停止' : ''));
    save();
    return send(res, 200, { ok: true, user: pub(target) });
  }
  if (p === '/auth/api/delete') {
    db.users = db.users.filter(u => u !== target);
    endSessions(target.name);
    db.resets = db.resets.filter(x => x.user !== target.name);
    log('アカウントを削除', me.name, target.name);
    save();
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { ok: false, error: 'ありません' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(e => { try { send(res, 400, { ok: false, error: String(e.message || e).slice(0, 200) }); } catch { /* 送れない */ } });
});

if (require.main === module) {
  ensureOwner();
  server.listen(PORT, '127.0.0.1', () => console.log('oms-auth: ' + PORT + ' で待っています（アカウント ' + db.users.length + '件）'));
}
module.exports = { server, ensureOwner, hashPass, checkPass, passProblem, reload: () => { db = load(); } };
