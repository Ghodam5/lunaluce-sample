'use strict';
// oms-auth の確かめ: ログイン・ログアウト・招待で登録・忘れたときの再設定・権限・失敗が続いたら止める・パスワードを保存しない
// 使い方: node --test ops/vps/oms-app/auth.test.js
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');

const OWNER_PASS = 'owner-pass-' + Date.now();
function start(dir, env) {
  const port = 18600 + Math.floor(Math.random() * 300);
  const p = cp.spawn(process.execPath, [path.join(__dirname, 'auth.js')], { env: Object.assign({}, process.env, { AUTH_PORT: String(port), AUTH_DIR: dir, OMS_USER: 'owner', OMS_PASSWORD: OWNER_PASS }, env), stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise(ok => p.stdout.once('data', () => ok({ p, url: 'http://127.0.0.1:' + port })));
}
function client(base) {
  let cookie = '';
  const req = async (method, p, body, headers) => {
    const r = await fetch(base + p, { method, redirect: 'manual', headers: Object.assign({ 'content-type': 'application/json', 'x-forwarded-host': 'oms.test', cookie }, headers || {}), body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* 画面 */ }
    return { status: r.status, body: json, text, headers: r.headers };
  };
  return { get: (p, h) => req('GET', p, null, h), post: (p, b, h) => req('POST', p, b || {}, h), get cookie() { return cookie; } };
}
const tokenOf = link => new URL(link).searchParams.get('t');

test('オーナーでログインし、招待した人が登録・ログインでき、スタッフは管理できない', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-auth-'));
  const s = await start(dir);
  try {
    const anon = client(s.url);
    // ログインしていないと、画面はログインへ、/api/ は 401
    let r = await anon.get('/auth/check', { 'x-forwarded-uri': '/oms/' });
    a.equal(r.status, 302); a.match(r.headers.get('location'), /^\/login\?next=%2Foms%2F/);
    r = await anon.get('/auth/check', { 'x-forwarded-uri': '/api/reflect/status' });
    a.equal(r.status, 401);
    // 違うパスワード
    r = await anon.post('/auth/login', { name: 'owner', password: 'nope' });
    a.equal(r.status, 401);
    // オーナー
    const owner = client(s.url);
    r = await owner.post('/auth/login', { name: 'Owner', password: OWNER_PASS, next: '//evil.example/' });
    a.equal(r.status, 200); a.equal(r.body.next, '/oms/');
    a.match(r.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
    r = await owner.get('/auth/check');
    a.equal(r.status, 200); a.equal(r.headers.get('x-oms-user'), 'owner'); a.equal(r.headers.get('x-oms-role'), 'admin');
    // 別のサイトからの送信は断る
    r = await owner.post('/auth/api/invite', { role: 'staff' }, { origin: 'https://evil.example' });
    a.equal(r.status, 415);
    // 招待 → 登録
    r = await owner.post('/auth/api/invite', { role: 'staff' });
    a.equal(r.status, 200); a.match(r.body.link, /^https:\/\/oms\.test\/join\?t=/);
    const t = tokenOf(r.body.link);
    r = await anon.get('/join?t=' + t); a.match(r.text, /新規登録/);
    r = await anon.post('/auth/join', { token: t, name: 'yamada', password: 'short' });
    a.equal(r.status, 400); a.match(r.body.error, /10文字/);
    r = await anon.post('/auth/join', { token: t, name: 'yamada', display: '山田', password: 'yamada-secret-1' });
    a.equal(r.status, 400); a.match(r.body.error, /ログイン名/);
    r = await anon.post('/auth/join', { token: t, name: 'yamada', display: '山田', password: 'good-staff-pass-1' });
    a.equal(r.status, 200);
    r = await anon.post('/auth/join', { token: t, name: 'second', password: 'good-staff-pass-2' });
    a.equal(r.status, 400, '招待リンクは1回だけ');
    // スタッフでログイン
    const staff = client(s.url);
    r = await staff.post('/auth/login', { name: 'yamada', password: 'good-staff-pass-1' });
    a.equal(r.status, 200);
    r = await staff.get('/auth/check'); a.equal(r.headers.get('x-oms-role'), 'staff');
    a.equal((await staff.get('/auth/api/users')).status, 403);
    a.equal((await staff.post('/auth/api/invite', { role: 'admin' })).status, 403);
    a.equal((await staff.post('/auth/api/delete', { name: 'owner' })).status, 403);
    // オーナーは消せない・止められない
    a.equal((await owner.post('/auth/api/update', { name: 'owner', active: false })).status, 400);
    // 忘れたとき → 管理者に出る → 再設定リンク → 新しいパスワード
    r = await anon.post('/auth/forgot', { name: 'yamada' }); a.equal(r.status, 200);
    r = await anon.post('/auth/forgot', { name: 'nobody' }); a.equal(r.status, 200, 'ない名前でも同じ返事');
    r = await owner.get('/auth/api/users');
    a.deepEqual(r.body.requests.map(x => x.user), ['yamada']);
    a.ok(!JSON.stringify(r.body).includes('scrypt$'), 'パスワードの暗号は画面に出さない');
    r = await owner.post('/auth/api/reset-link', { name: 'yamada' });
    const rt = tokenOf(r.body.link);
    r = await anon.post('/auth/reset', { token: rt, password: 'new-staff-pass-9' }); a.equal(r.status, 200);
    a.equal((await staff.get('/auth/check')).status, 302, '再設定したら前のログインは切れる');
    a.equal((await anon.post('/auth/reset', { token: rt, password: 'again-pass-123' })).status, 400, '再設定リンクは1回だけ');
    r = await staff.post('/auth/login', { name: 'yamada', password: 'new-staff-pass-9' }); a.equal(r.status, 200);
    // 自分でパスワードを変える
    a.equal((await staff.post('/auth/api/password', { current: 'wrong', password: 'another-pass-77' })).status, 400);
    a.equal((await staff.post('/auth/api/password', { current: 'new-staff-pass-9', password: 'another-pass-77' })).status, 200);
    // 管理者が止める → すぐ入れない
    a.equal((await owner.post('/auth/api/update', { name: 'yamada', active: false })).status, 200);
    a.equal((await staff.get('/auth/check')).status, 302);
    a.equal((await staff.post('/auth/login', { name: 'yamada', password: 'another-pass-77' })).status, 401);
    // ログアウト
    r = await owner.post('/auth/logout'); a.equal(r.status, 200);
    a.equal((await owner.get('/auth/check')).status, 302);
    // 保存ファイルにパスワードそのものは入っていない
    const saved = fs.readFileSync(path.join(dir, 'auth.json'), 'utf8');
    for (const p of [OWNER_PASS, 'good-staff-pass-1', 'new-staff-pass-9', 'another-pass-77']) a.ok(!saved.includes(p));
    a.ok(!saved.includes(t) && !saved.includes(rt), 'リンクの鍵もそのままは残さない');
    a.equal((fs.statSync(path.join(dir, 'auth.json')).mode & 0o077), 0, 'ほかの人が読めない');
  } finally { s.p.kill(); }
});

test('失敗が続いたら止める・環境欄のパスワードを変えるとオーナーが戻る', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-auth-'));
  let s = await start(dir);
  try {
    const c = client(s.url);
    for (let i = 0; i < 5; i++) a.equal((await c.post('/auth/login', { name: 'owner', password: 'bad' })).status, 401);
    a.equal((await c.post('/auth/login', { name: 'owner', password: OWNER_PASS })).status, 429);
  } finally { s.p.kill(); }
  // 同じパスワードで起こし直しても、画面で変えたパスワードは消えない（ここでは確かめとして新しい値で起こす）
  s = await start(dir, { OMS_PASSWORD: 'changed-owner-pass-1' });
  try {
    const c = client(s.url);
    a.equal((await c.post('/auth/login', { name: 'owner', password: OWNER_PASS })).status, 401);
    a.equal((await c.post('/auth/login', { name: 'owner', password: 'changed-owner-pass-1' })).status, 200);
    a.equal((await c.post('/auth/api/password', { current: 'changed-owner-pass-1', password: 'set-on-screen-pass' })).status, 200);
  } finally { s.p.kill(); }
  s = await start(dir, { OMS_PASSWORD: 'changed-owner-pass-1' });
  try {
    const c = client(s.url);
    a.equal((await c.post('/auth/login', { name: 'owner', password: 'set-on-screen-pass' })).status, 200, '環境欄が同じなら画面で変えたパスワードのまま');
  } finally { s.p.kill(); }
});

test('ログインの後に別のサイトへ飛ばさない・失敗はCaddyがつけた住所で数える', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-auth-'));
  const s = await start(dir);
  try {
    const anon = client(s.url);
    // /\evil や //evil はブラウザが別のサイトとして開くので、/oms/ に直す
    for (const bad of ['/\\evil.example', '//evil.example', '/\t/evil.example', 'https://evil.example', '']) {
      let r = await anon.get('/login?next=' + encodeURIComponent(bad));
      a.ok(!r.text.includes('evil.example'), 'ログイン画面に ' + JSON.stringify(bad) + ' を入れない');
      r = await anon.get('/auth/check', { 'x-forwarded-uri': bad || '/' });
      a.ok(!String(r.headers.get('location')).includes('evil'), 'check の戻り先 ' + JSON.stringify(bad));
    }
    const owner = client(s.url);
    const r = await owner.post('/auth/login', { name: 'owner', password: OWNER_PASS, next: '/\\evil.example' });
    a.equal(r.body.next, '/oms/');
    a.equal((await client(s.url).get('/auth/check', { 'x-forwarded-uri': '/oms/work.html?o=A-1' })).headers.get('location'), '/login?next=' + encodeURIComponent('/oms/work.html?o=A-1'));
    // X-Forwarded-For を毎回変えても、Caddy がつけた X-OMS-Client-IP が同じなら止まる
    const c = client(s.url);
    for (let i = 0; i < 5; i++) a.equal((await c.post('/auth/login', { name: 'nobody' + i, password: 'bad' }, { 'x-forwarded-for': '10.0.0.' + i, 'x-oms-client-ip': '203.0.113.5' })).status, 401);
    a.equal((await c.post('/auth/login', { name: 'owner', password: OWNER_PASS }, { 'x-forwarded-for': '10.0.9.9', 'x-oms-client-ip': '203.0.113.5' })).status, 429);
    // 別の住所からは入れる
    a.equal((await client(s.url).post('/auth/login', { name: 'owner', password: OWNER_PASS }, { 'x-oms-client-ip': '198.51.100.7' })).status, 200);
  } finally { s.p.kill(); }
});
