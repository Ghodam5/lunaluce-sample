'use strict';
// 楽天・Yahoo用CSV（oms/js/25-channel-export.js）の形を確かめる
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../oms/js/25-channel-export.js'), 'utf8');
const mod = { exports: {} };
new Function('module', src)(mod);
const ch = mod.exports;
const row = {
  active: true,
  photos: ['images/a.jpg', 'images/b.png'],
  product: { id: '90001', code: 'Test-Item_1', title: 'テスト商品 〜名入れ〜', description: '説明です。\n2行目', notice: '※注意', contents: '1個', size: '', material: '', expiry: '', allergens: '', storage: '', hasName: true, price: 300,
    skus: [{ code: 'Test-Item_1-1', t: 'Sサイズ', price: 300 }, { code: 'Test-Item_1-2', t: 'Mサイズ', price: 450 }] }
};
test('楽天: 商品の行のあとに種類ごとの行が並ぶ', () => {
  const t = ch.channelRakutenRows([row], { cabinetFolder: 'luna' });
  const h = t[0];
  assert.equal(t.length, 4);
  assert.equal(t[1][h.indexOf('商品管理番号（商品URL）')], 'test-item_1');
  assert.equal(t[1][h.indexOf('商品画像パス2')], '/luna/test-item_1_1.png');
  assert.equal(t[2][h.indexOf('通常購入販売価格')], '300');
  assert.equal(t[3][h.indexOf('バリエーション項目選択肢1')], 'Mサイズ');
  assert.match(t[1][h.indexOf('PC用商品説明文')], /説明です。<br>2行目/);
});
test('Yahoo: 1商品1行、種類はoptionsとsub-code、価格は最低価格', () => {
  const t = ch.channelYahooRows([row]);
  const h = t[0];
  assert.equal(t.length, 2);
  assert.equal(t[1][h.indexOf('price')], '300');
  assert.equal(t[1][h.indexOf('options')], '種類 Sサイズ Mサイズ');
  assert.equal(t[1][h.indexOf('sub-code')], '種類:Sサイズ=test-item_1-1&種類:Mサイズ=test-item_1-2');
});
test('CSVは , " 改行を囲み、Shift_JISにする', () => {
  assert.equal(ch.channelCsv([['a,b', 'x"y', 'p\nq']]), '"a,b","x""y","p\nq"\r\n');
  const enc = ch.channelSjis('あA〜😀');
  assert.deepEqual(Array.from(enc.bytes), [0x82, 0xa0, 0x41, 0x81, 0x60, 0x81, 0xac]);
  assert.deepEqual(enc.missing, ['😀']);
  const files = ch.channelBuild([row], {});
  assert.deepEqual(files.map((f) => f.name), ['rakuten-item.csv', 'yahoo-data.csv', 'photo-names.csv']);
  assert.equal(new TextDecoder('shift_jis').decode(files[2].bytes).split('\r\n')[2].split(',')[4], 'test-item_1_1.png');
});
