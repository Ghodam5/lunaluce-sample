'use strict';
// 画像の頼み方（oms/js/56-image-words-model.js）: 使う場所・選び方・指示文・お店のことば
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(__dirname, '../oms/js/56-image-words-model.js'), 'utf8'))(mod);
const v = mod.exports;
const words = JSON.parse(fs.readFileSync(path.join(__dirname, '../oms/image-words/words.json'), 'utf8'));
const cats = v.imgwMerge(words, v.imgwEmpty());
test('見本帳の156のことばがあり、見本画像のファイルもそろっている', () => {
  const all = cats.flatMap((c) => c.sections.flatMap((s) => s.terms));
  assert.equal(cats.length, 6);
  assert.equal(all.length, 156);
  all.forEach((t) => { assert.ok(t.en, t.id + ' に英語がない'); assert.ok(fs.existsSync(path.join(__dirname, '../oms/image-words', t.img)), t.img); });
});
test('使う場所のおすすめのことばは、全部見本帳にある', () => {
  v.IMGW_USES.forEach((u) => assert.equal(v.imgwUsePicks(cats, u.id).length, u.picks.length, u.id));
});
test('1つしか選べない段では入れかわり、飾りはいくつでも選べる', () => {
  const top = v.imgwPickId(cats, 'photo-angle:真上'), low = v.imgwPickId(cats, 'photo-angle:あおり');
  let p = v.imgwToggle([], cats, top);
  p = v.imgwToggle(p, cats, low);
  assert.deepEqual(p, [low]);
  const flower = v.imgwPickId(cats, 'photo-props:花'), season = v.imgwPickId(cats, 'photo-props:季節小物');
  p = v.imgwToggle(v.imgwToggle(p, cats, flower), cats, season);
  assert.deepEqual(p, [low, flower, season]);
  assert.deepEqual(v.imgwToggle(p, cats, flower), [low, season]);
});
test('指示文に商品名・使う場所・ことば・守ることが入り、箱は商品に置きかわる', () => {
  const out = v.imgwCompose(cats, { kind: 'photo', use: 'sign', picks: v.imgwUsePicks(cats, 'sign'), product: { title: 'ペンダントクロック', code: 'WB-1' }, extra: 'リボンはゴールド' });
  assert.match(out.jp, /ルナルーチェの「ペンダントクロック（WB-1）」/);
  assert.match(out.jp, /トップの看板/);
  assert.match(out.jp, /左に寄せて、右に余白を残して/);
  assert.match(out.jp, /右の3分の1は何も置かない/);
  assert.match(out.jp, /リボンはゴールド/);
  assert.doesNotMatch(out.jp, /箱/);
  assert.match(out.en, /16:9/);
  assert.match(out.en, /on white marble/);
});
test('おすすめの組み合わせから、ことばを選べる', () => {
  const photo = v.imgwFindCat(cats, 'photo');
  const picks = v.imgwComboPicks(photo, photo.combos[1].text).map((id) => v.imgwTerm(cats, id).term.name);
  assert.deepEqual(picks, ['真上', '中央', '白背景', '花', '明るい']);
});
test('お店のことばは名前と言い方が要り、足すと段の最後に並ぶ', () => {
  const store = v.imgwEmpty();
  assert.ok(v.imgwCustomCheck({ sec: 'photo-props', name: '', say: '' }).length);
  const t = v.imgwCustomAdd(store, { sec: 'photo-props', name: 'ゴールドの縁', say: '縁を金色で' });
  const merged = v.imgwMerge(words, store);
  const sec = merged[0].sections.find((s) => s.id === 'photo-props');
  assert.equal(sec.terms[sec.terms.length - 1].id, t.id);
  assert.equal(v.imgwSaveEntry(store, { jp: 'a' }).id, v.imgwSaveEntry(store, { jp: 'a' }).id);
  assert.equal(store.saved.length, 1);
});
