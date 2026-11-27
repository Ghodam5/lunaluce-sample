'use strict';
// 販路ごとの値段（oms/js/46-channel-model.js）の計算と決まりの確認
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(__dirname, '../oms/js/46-channel-model.js'), 'utf8'))(mod);
const m = mod.exports;
const one = { id: '1', code: 'a-1', title: 'テスト【25％OFF】', price: 3300, skus: [{ code: 'a-1', t: '', price: 3300 }], onSite: true };
const two = { id: '2', code: 'b', title: 'セット', price: 300, skus: [{ code: 'b-1', t: 'S', price: 300 }, { code: 'b-2', t: 'M', price: 455 }], onSite: false };
test('標準は基準のまま、%上げは端数を切り上げ、本店は基準', () => {
  const d = m.chEmpty();
  assert.equal(m.chPrice(d, one, one.skus[0], 'rakuten'), 3300);
  d.defaults.rakuten = { mode: 'up', pct: 10, round: 10 };
  assert.equal(m.chPrice(d, one, one.skus[0], 'rakuten'), 3630);
  assert.equal(m.chPrice(d, two, two.skus[1], 'rakuten'), 510); // 455×1.1=500.5 → 510
  assert.equal(m.chPrice(d, one, one.skus[0], 'honten'), 3300);
});
test('固定は本店の値段を変えても変わらない。標準に戻すと標準に従う', () => {
  const d = m.chEmpty();
  m.chSetRule(d, one, 'amazon', { mode: 'fixed', yen: { 'a-1': 3980 } }, 'テスト');
  assert.equal(m.chPrice(d, one, one.skus[0], 'amazon'), 3980);
  assert.equal(m.chPrice(d, Object.assign({}, one, { price: 3500 }), { code: 'a-1', price: 3500 }, 'amazon'), 3980);
  assert.equal(d.history.length, 1);
  assert.deepEqual([d.history[0].from, d.history[0].to], [3300, 3980]);
  m.chSetRule(d, one, 'amazon', { mode: 'default' });
  assert.equal(m.chPrice(d, one, one.skus[0], 'amazon'), 3300);
});
test('扱う商品: 最初は新サイトにある商品、個別に外せる', () => {
  const d = m.chEmpty();
  assert.equal(m.chPicked(d, one), true);
  assert.equal(m.chPicked(d, two), false);
  d.items['1'] = { on: false };
  assert.equal(m.chPicked(d, one), false);
  d.pick = 'all';
  assert.equal(m.chPicked(d, two), true);
});
test('決まり: 上げ幅の上限・下限・使えない言葉で注意が出る', () => {
  const d = m.chEmpty();
  d.defaults.rakuten = { mode: 'up', pct: 20, round: 10 };
  d.rules.push({ id: 'r1', ch: 'rakuten', kind: 'up-max', title: '上げ幅', value: 15 });
  d.rules.push({ id: 'r2', ch: 'rakuten', kind: 'ng-words', title: '二重価格', value: '％OFF、定価' });
  d.rules.push({ id: 'r3', ch: 'rakuten', kind: 'min-yen', title: '下限', value: 400 });
  const w1 = m.chCheck(d, one, 'rakuten');
  assert.ok(w1.some((w) => w.rule === 'r1'));
  assert.ok(w1.some((w) => w.rule === 'r2' && /％OFF/.test(w.msg)));
  const w2 = m.chCheck(d, two, 'rakuten');
  assert.ok(w2.some((w) => w.rule === 'r3')); // 300×1.2=360 < 400
  d.rules[0].on = false;
  assert.ok(!m.chCheck(d, one, 'rakuten').some((w) => w.rule === 'r1'));
  assert.deepEqual(m.chRuleErrors({ kind: 'up-max', title: '', value: '' }), ['決まりの名前を入れてください', '数字を入れてください']);
});
test('書き出しは扱う商品だけ、種類ごとに1行', () => {
  const d = m.chEmpty();
  d.pick = 'all';
  const rows = m.chExportRows(d, [one, two], 'yahoo');
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[2].slice(0, 5), ['b', 'b-1', 'S', '300', '300']);
});
