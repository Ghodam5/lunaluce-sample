'use strict';
// oms-work の確かめ: 作業カード（住所・電話・メールを持たない）・工程の完了と取り消し・コメント・作業ログの検索・5年で消す・作業員にできないこと
// 使い方: node --test ops/vps/oms-app/work.test.js
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const W = require('./work.js');

function start(dir) {
  const port = 18900 + Math.floor(Math.random() * 300);
  fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ users: [{ name: 'tanaka', display: '田中' }, { name: 'boss', display: '林' }] }));
  const p = cp.spawn(process.execPath, [path.join(__dirname, 'work.js')], { env: Object.assign({}, process.env, { WORK_PORT: String(port), AUTH_DIR: dir }), stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise(ok => p.stdout.once('data', () => ok({ p, url: 'http://127.0.0.1:' + port })));
}
function as(base, user, role) {
  const h = { 'content-type': 'application/json', 'x-oms-user': user, 'x-oms-role': role, 'x-forwarded-host': 'oms.test' };
  const go = async (method, p, b) => { const r = await fetch(base + '/work-api' + p, { method, headers: h, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };
  return { get: p => go('GET', p), post: (p, b) => go('POST', p, b) };
}
const CARD = {
  id: 'RK-1-2026', productName: 'リングピロー「Étoile」', sku: 'LL-RP-014-BRS', qty: 1, coupleNames: 'Koji ♡ Rika', customerName: '山本 梨花',
  address: '大阪府大阪市中央区南船場2-4-12', phone: '090-1234-5678', email: 'x@example.com', postalCode: '542-0081',
  texts: [['お名前', 'Koji ♡ Rika'], ['電話番号', '090-1234-5678'], ['メール', 'x@example.com']],
  steps: [{ id: 'pick', label: 'ピッキング', note: 'そろえた' }, { id: 'laser', label: 'レーザー彫刻', note: '彫刻した' }]
};

test('あいまい検索: 全角半角・カナかな・空白記号・1文字ちがい', () => {
  a.equal(W.fold('ＬＬ－ＲＰ ０１４'), 'llrp014');
  a.equal(W.fold('タカハシ'), 'たかはし');
  a.ok(W.fuzzyMatch('高橋 拓也 LL-WB-001-GLD', 'll wb001'));
  a.ok(W.fuzzyMatch('Takuya & Misaki', 'misaki takuya'));
  a.ok(W.fuzzyMatch('ウェルカムボード', 'うぇるかむ'));
  a.ok(W.fuzzyMatch('Takuya & Misaki', 'misaky'), '1文字ちがい');
  a.ok(!W.fuzzyMatch('Takuya & Misaki', 'mai'));
  a.ok(!W.fuzzyMatch('Takuya', 'koji'));
});

test('作業カードは決めた項目だけ残し、住所・電話・メールは捨てる', () => {
  const c = W.cleanCard(CARD);
  const s = JSON.stringify(c);
  a.ok(!s.includes('南船場') && !s.includes('090-1234') && !s.includes('example.com') && !s.includes('542-0081'), s);
  a.equal(c.texts.length, 1);
  a.equal(c.steps.length, 2);
  a.throws(() => W.cleanCard({ id: '../x', steps: CARD.steps }), /注文番号/);
});

test('工程を終える・取り消す・コメント・ログ検索・作業員にできないこと', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-work-'));
  const s = await start(dir);
  try {
    const boss = as(s.url, 'boss', 'admin'), w = as(s.url, 'tanaka', 'worker');
    a.equal((await fetch(s.url + '/work-api/me')).status, 401, '名前の見出しがなければ断る');
    a.equal((await w.post('/card', { card: CARD })).status, 403, '作業員はカードを作れない');
    a.equal((await w.post('/step', { id: CARD.id, step: 'pick', done: true })).status, 404, 'カードが無いうちは工程を押せない');
    const made = await boss.post('/card', { card: CARD });
    a.equal(made.status, 200);
    const r1 = await w.post('/step', { id: CARD.id, step: 'pick', done: true, comment: '部品OK' });
    a.equal(r1.status, 200);
    a.equal(r1.body.state.steps.pick.display, '田中');
    a.equal((await w.post('/step', { id: CARD.id, step: 'nope', done: true })).status, 400);
    await w.post('/step', { id: CARD.id, step: 'pick', done: false });
    await w.post('/comment', { id: CARD.id, step: 'laser', text: '彫刻機の調子が悪い' });
    a.equal((await w.post('/status', { id: CARD.id, from: 'a', to: 'b' })).status, 403);
    await boss.post('/status', { id: CARD.id, from: '名入れ確認中', to: '製造・レーザー加工' });

    const view = await w.get('/order?id=' + CARD.id);
    a.equal(view.body.log.length, 5, 'カード作成・完了・取り消し・コメント・段階');
    a.deepEqual(view.body.log.map(e => e.action), ['status', 'comment', 'step-undo', 'step-done', 'card']);
    a.ok(!view.body.state.steps.pick);

    const byWorker = await boss.get('/log?user=' + encodeURIComponent('田中'));
    a.equal(byWorker.body.entries.length, 3);
    a.equal((await boss.get('/log?q=' + encodeURIComponent('ちょうし'))).body.entries.length, 0, '漢字の読みまでは拾わない');
    a.equal((await boss.get('/log?q=' + encodeURIComponent('調子 レーザー'))).body.entries.length, 1);
    a.equal((await boss.get('/log?customer=' + encodeURIComponent('やまもと'))).body.entries.length, 0);
    a.equal((await boss.get('/log?customer=' + encodeURIComponent('山本'))).body.entries.length, 5);
    a.equal((await boss.get('/log?sku=llrp014')).body.entries.length, 5);
    a.equal((await boss.get('/log?couple=rika')).body.entries.length, 5);
    a.equal((await boss.get('/log?step=laser')).body.entries.length, 1);
    a.equal((await boss.get('/log?from=2000-01-01&to=2000-12-31')).body.entries.length, 0);
    a.equal((await boss.get('/suggest?q=' + encodeURIComponent('エトワール'))).body.items.length, 0);
    a.equal((await boss.get('/suggest?q=etoile')).body.items[0].id, CARD.id, 'é も e で拾う');
    const st = (await boss.get('/states')).body.states[CARD.id];
    a.deepEqual([st.done, st.total], [0, 2]);

    // 保存した中身に住所・電話・メールが無い
    const all = fs.readdirSync(path.join(dir, 'work', 'log')).map(f => fs.readFileSync(path.join(dir, 'work', 'log', f), 'utf8')).join('') + fs.readFileSync(path.join(dir, 'work', 'cards.json'), 'utf8');
    a.ok(!/南船場|090-1234|example\.com/.test(all));
  } finally { s.p.kill(); }
});

test('5年より古い月の作業ログを消す', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-work-prune-'));
  const log = path.join(dir, 'work', 'log');
  fs.mkdirSync(log, { recursive: true });
  for (const m of ['2021-10', '2021-11', '2021-12', '2026-11']) fs.writeFileSync(path.join(log, m + '.jsonl'), '{}\n');
  const env = process.env.AUTH_DIR;
  process.env.AUTH_DIR = dir;
  delete require.cache[require.resolve('./work.js')];
  const W2 = require('./work.js');
  const gone = W2.prune(Date.parse('2026-11-23T00:00:00Z'));
  process.env.AUTH_DIR = env;
  a.deepEqual(gone.sort(), ['2021-10.jsonl']);
  a.deepEqual(fs.readdirSync(log).sort(), ['2021-11.jsonl', '2021-12.jsonl', '2026-11.jsonl']);
});
