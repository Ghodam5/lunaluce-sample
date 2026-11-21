'use strict';
// OMSの反映: 前回の形と比べて、追加・変更・削除・並び順・お休みの増減が分かる
const test = require('node:test'), a = require('node:assert/strict');
const { reflectSnapshot, reflectDiff } = require('../oms/js/34-builder-reflect.js');
const base = () => ({ manifest: ['a', 'b'], cards: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], notices: [{ id: 'n1', text: 'x' }], homeSections: [{ id: 's1' }, { id: 's2' }], products: [], edits: [], stock: [], listing: {}, plans: [], news: [], themes: [], newCategories: [], uploads: [], businessDays: { holidays: ['2026-12-29'], halfDays: [] } });
const pick = (d, k) => d.find(x => x.part === k);
test('同じなら変更なし', () => {
  a.ok(reflectDiff(reflectSnapshot(base()), reflectSnapshot(base())).every(d => !d.any));
});
test('追加・変更・削除・並び順・お休みの増減', () => {
  const b = base();
  b.cards[0].title = 'A2';
  b.manifest = ['b', 'a'];
  b.notices = [];
  b.homeSections.reverse();
  b.products.push({ id: 'p1', code: 'x' });
  b.businessDays.holidays.push('2026-12-30');
  const d = reflectDiff(reflectSnapshot(b), reflectSnapshot(base()));
  a.equal(pick(d, 'cards').change, 1);
  a.equal(pick(d, 'notices').remove, 1);
  a.equal(pick(d, 'homeSections').moved, true);
  a.equal(pick(d, 'products').add, 1);
  a.equal(pick(d, 'businessDays').add, 1);
  a.equal(pick(d, 'news').any, false);
});
test('一度も反映していなければ、中身があるものは全部追加', () => {
  const d = reflectDiff(reflectSnapshot(base()), null);
  a.equal(pick(d, 'cards').add, 2);
  a.equal(pick(d, 'news').any, false);
});
