'use strict';
// oms-intake の確かめ: 初期オフでは保存しない・許可した送信元以外は拒否・oms.orders には触れない・鍵を出さない
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-intake-data-'));
function start(env) {
  const port = 19091 + Math.floor(Math.random() * 500);
  const p = cp.spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(port), DATA_DIR: data, ORDER_INTAKE_TOKEN: 'intake-secret-123' }, env),
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((ok) => p.stdout.once('data', () => ok({ p, url: 'http://127.0.0.1:' + port })));
}
const post = (url, body, token) => fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: token ? 'Bearer ' + token : '' },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const sample = { source: 'https://renewal-test.luna-luce.info', order_id: '1001', items: [{ code: 'ABC', name: '試験', qty: 1, price: 100 }], totals: { total: 100 }, payment: { name: '銀行振込' } };

test('初期オフでは 403 で、ストアにも本番を意味するファイルも作らない', async () => {
  const s = await start({ ORDER_INTAKE_ENABLED: '0' });
  try {
    const st = await fetch(s.url + '/intake-api/status').then((r) => r.json());
    a.equal(st.enabled, false);
    a.equal(st.neverWrites, 'oms.orders');
    a.equal(st.store, 'oms_test.test_order_inbox');
    const r = await post(s.url + '/intake-api/test-orders', sample, 'intake-secret-123');
    a.equal(r.status, 403);
    a.match(r.body.error, /オフ/);
    a.equal(r.body.neverWrites, 'oms.orders');
    a.equal(fs.existsSync(path.join(data, 'oms_test', 'test_order_inbox.json')), false);
    a.equal(fs.existsSync(path.join(data, 'orders')), false);
  } finally { s.p.kill(); }
});

test('トークンが違うと 401 で、鍵は返事に出さない', async () => {
  const s = await start({ ORDER_INTAKE_ENABLED: '1' });
  try {
    const r = await post(s.url + '/intake-api/test-orders', sample, 'wrong');
    a.equal(r.status, 401);
    a.ok(!JSON.stringify(r.body).includes('intake-secret-123'));
  } finally { s.p.kill(); }
});

test('オンでも本番ホストからの注文は保存しない', async () => {
  const s = await start({ ORDER_INTAKE_ENABLED: '1' });
  try {
    const r = await post(s.url + '/intake-api/test-orders', Object.assign({}, sample, { source: 'https://www.luna-luce.jp' }), 'intake-secret-123');
    a.equal(r.status, 403);
    a.match(r.body.error, /renewal-test\.luna-luce\.info/);
    a.equal(fs.existsSync(path.join(data, 'oms_test', 'test_order_inbox.json')), false);
  } finally { s.p.kill(); }
});

test('オンかつ検証用サイトからなら、専用ストアにだけ保存する', async () => {
  const s = await start({ ORDER_INTAKE_ENABLED: '1' });
  try {
    const r = await post(s.url + '/intake-api/test-orders', sample, 'intake-secret-123');
    a.equal(r.status, 200, JSON.stringify(r.body));
    a.equal(r.body.stored, 'oms_test.test_order_inbox');
    a.equal(r.body.neverWrites, 'oms.orders');
    const box = JSON.parse(fs.readFileSync(path.join(data, 'oms_test', 'test_order_inbox.json'), 'utf8'));
    a.equal(box.kind, 'oms_test.test_order_inbox');
    a.equal(box.items[0].order_id, '1001');
    a.equal(box.items[0].source, 'renewal-test.luna-luce.info');
    a.ok(!JSON.stringify(box).includes('intake-secret-123'));
    a.equal(fs.existsSync(path.join(data, 'orders')), false);
  } finally { s.p.kill(); }
});
