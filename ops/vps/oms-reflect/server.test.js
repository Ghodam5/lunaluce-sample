'use strict';
// oms-reflect の確かめ: 試しに見る（新サイト）で変わるファイルが分かる・送り先は renewal-test.luna-luce.info だけ・本番や旧環境には送らない・鍵を出さない
// 使い方: SITE_REMOTE=サイトのgitの写し SITE_BASE_BRANCH=ブランチ node --test ops/vps/oms-reflect/server.test.js
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-reflect-data-'));
function start(env) {
  const port = 18090 + Math.floor(Math.random() * 500);
  const p = cp.spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: String(port), DATA_DIR: data }, env), stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise(ok => p.stdout.once('data', () => ok({ p, url: 'http://127.0.0.1:' + port })));
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-oms-user': 'test' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));

test('本番の住所のWelcartには送らず、鍵はどこにも出さない', async () => {
  const s = await start({ WELCART_TEST_URL: 'https://www.luna-luce.jp', WELCART_TEST_USER: 'u', WELCART_TEST_APP_PASSWORD: 'secret-pass-123', GITHUB_TOKEN: '' });
  try {
    const st = await fetch(s.url + '/api/reflect/status').then(r => r.json());
    a.equal(st.welcart.ready, false);
    a.match(st.welcart.note, /renewal-test\.luna-luce\.info|送り先は/);
    const r = await post(s.url + '/api/reflect/welcart', { draft: { kind: 'luna-site-builder-draft', schemaVersion: 1 }, dry_run: true });
    a.equal(r.status, 502);
    a.ok(!JSON.stringify(r.body).includes('secret-pass-123'));
    a.ok(!fs.readFileSync(path.join(data, 'reflect-log.json'), 'utf8').includes('secret-pass-123'));
    const bad = await fetch(s.url + '/api/reflect/site', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
    a.equal(bad.status, 415);
  } finally { s.p.kill(); }
});

test('送り先は renewal-test.luna-luce.info だけ ready になる', async () => {
  const s = await start({ WELCART_TEST_URL: 'https://renewal-test.luna-luce.info', WELCART_TEST_USER: 'yoshi', WELCART_TEST_APP_PASSWORD: 'secret-pass-123', GITHUB_TOKEN: '' });
  try {
    const st = await fetch(s.url + '/api/reflect/status').then(r => r.json());
    a.equal(st.welcart.ready, true);
    a.equal(st.welcart.host, 'renewal-test.luna-luce.info');
    a.equal(st.welcart.note, '');
  } finally { s.p.kill(); }
});

test('旧コアサーバー・本番・http には送らない', async () => {
  const blocked = [
    'https://lunaluce.s196.coreserver.jp/wordpress',
    'https://luna-luce.jp',
    'https://www.luna-luce.jp',
    'http://renewal-test.luna-luce.info',
    'https://renewal-test.luna-luce.info/extra',
  ];
  for (const url of blocked) {
    const s = await start({ WELCART_TEST_URL: url, WELCART_TEST_USER: 'u', WELCART_TEST_APP_PASSWORD: 'secret-pass-123', GITHUB_TOKEN: '' });
    try {
      const st = await fetch(s.url + '/api/reflect/status').then(r => r.json());
      a.equal(st.welcart.ready, false, url);
      a.match(st.welcart.note, /送り先は|https の住所|本番/, url);
      const r = await post(s.url + '/api/reflect/welcart', { draft: { kind: 'luna-site-builder-draft', schemaVersion: 1 }, dry_run: true });
      a.equal(r.status, 502, url);
      a.ok(!JSON.stringify(r.body).includes('secret-pass-123'));
    } finally { s.p.kill(); }
  }
});

test('楽天・Yahooの手での記録と、反映済みの写し', async () => {
  const s = await start({});
  try {
    const r = await post(s.url + '/api/reflect/log', { dest: 'rakuten', action: 'apply', ok: true, note: 'CSVを取り込んだ', snapshot: { x: 1 } });
    a.equal(r.body.ok, true);
    const st = await fetch(s.url + '/api/reflect/status').then(r => r.json());
    a.deepEqual(st.last.rakuten.snapshot, { x: 1 });
    a.equal(st.last.rakuten.by, 'test');
    a.equal((await post(s.url + '/api/reflect/log', { dest: 'site' })).status, 400);
  } finally { s.p.kill(); }
});

test('新サイトを試しに見ると、変わるファイルが分かる（プルリクエストは作らない）', { skip: !process.env.SITE_REMOTE && 'SITE_REMOTE がないので飛ばす' }, async () => {
  const s = await start({});
  try {
    const remote = process.env.SITE_REMOTE;
    const ref = process.env.SITE_BASE_BRANCH || 'main';
    const show = f => JSON.parse(cp.execFileSync('git', ['-C', remote, 'show', ref + ':' + f], { encoding: 'utf8' }));
    const sections = show('site-src/home-sections.json').sections.reverse();
    const r = await post(s.url + '/api/reflect/site', { dry_run: true, draft: { kind: 'luna-site-builder-draft', schemaVersion: 1, homeSections: sections, notices: show('site-src/site-notices.json').notices, cards: [], news: [{ id: 'n' }] } });
    a.equal(r.status, 200, JSON.stringify(r.body));
    a.equal(r.body.dry, true);
    a.ok(r.body.files.includes('site-src/home-sections.json'), r.body.files.join(','));
    a.ok(r.body.files.some(f => /top\.html$/.test(f)));
    a.deepEqual(r.body.report.later.map(x => x.part), ['news']);
    a.equal(r.body.pr, undefined);
  } finally { s.p.kill(); }
});
