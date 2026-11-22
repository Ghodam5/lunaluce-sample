'use strict';
// お届け日数の読み取り・定型文と商品の notes / delivery の確かめ
const test = require('node:test'), a = require('node:assert/strict');
const { read } = require('./delivery-days.cjs');
const nt = require('./notice-templates.cjs');
test('本文からお届け日数を読む（出荷・賞味期限の日数は読まない）', () => {
  a.deepEqual(read('※受注生産品の為お届けまでに14日ほどお時間をいただきます'), { min: 14, max: 14, made: true, source: '本文' });
  a.deepEqual(read('※お届けまでに約1~2週間ほどお時間'), { min: 7, max: 14, made: false, source: '本文' });
  a.deepEqual(read('お届けまでの目安は約１週間です。受注生産のため'), { min: 7, max: 7, made: true, source: '本文' });
  a.equal(read('賞味期限：出荷日より180日'), null);
});
test('定型文は全部正しく、商品の notes・delivery の間違いは止める', () => {
  const ids = new Set(nt.load().templates.map(t => t.id));
  a.ok(ids.has('made-to-order'));
  a.doesNotThrow(() => nt.checkProduct({ id: '1', delivery: { min: 7, max: 14, made: true }, notes: ['made-to-order'] }, ids));
  a.throws(() => nt.checkProduct({ id: '1', notes: ['no-such'] }, ids), /notes/);
  a.throws(() => nt.checkProduct({ id: '1', delivery: { min: 14, max: 7, made: true } }, ids), /delivery/);
  a.throws(() => nt.checkProduct({ id: '1', notes: ['min-qty', 'min-qty'] }, ids), /notes/);
});
