'use strict';
// 商品コードの台帳（builder-codes.json）と、Yahoo/楽天CSVからコードを拾う部分（oms/js/26-product-codes.js）
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../oms/js/26-product-codes.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'state', 'emit', 'showToast', src)(mod, {}, () => {}, () => {});
test('YahooのCSVから code と sub-code のコードを拾う', () => {
  const r = mod.exports.codeCsvCodes('path,name,code,sub-code,price\r\n,"テスト, 商品",ABC-1,"種類:S=abc-1-s&種類:M=abc-1-m",100\r\n,b,xyz,,200\r\n');
  assert.deepEqual(r.columns, ['code', 'sub-code']);
  assert.deepEqual(r.codes, ['abc-1', 'abc-1-m', 'abc-1-s', 'xyz']);
});
test('楽天のCSVから商品管理番号・商品番号・SKUのコードを拾う', () => {
  const r = mod.exports.codeCsvCodes('商品管理番号（商品URL）,商品番号,SKU管理番号,システム連携用SKU番号\npb-a,PB-A,normal-inventory,\npb-a,,pb-a-1,PB-A-1\n');
  assert.deepEqual(r.codes, ['pb-a', 'pb-a-1']);
});
test('台帳に新サイト・本店・楽天のコードが入っていて、法則の ll- はまだ使われていない', () => {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../oms/builder-codes.json'), 'utf8'));
  assert.ok(d.sources.s && d.sources.w && d.sources.r);
  const keys = Object.keys(d.codes);
  assert.ok(keys.length > 1000);
  assert.ok(keys.every((k) => k === k.toLowerCase()));
  assert.ok(!keys.some((k) => k.startsWith('ll-')));
});
