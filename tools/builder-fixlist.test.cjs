'use strict';
// 直すところ: 空の新規の呼び方、エラーから飛ぶ欄、そのほかの開き先
const test = require('node:test'), a = require('node:assert/strict');
const { builderProductLabel, builderFixField, builderFixOtherTarget } = require('../oms/js/38-builder-fixlist.js');

test('空の新規は「（名前なしの新しい商品）」と出す', () => {
  a.equal(builderProductLabel({ title: '', code: '', edit: false }), '（名前なしの新しい商品）');
  a.equal(builderProductLabel({ title: '  ', code: '', edit: false }), '（名前なしの新しい商品）');
  a.equal(builderProductLabel({ title: '時計', code: 'wb', edit: false }), '新しい商品「時計」');
  a.equal(builderProductLabel({ title: '時計', edit: true }), '編集中の商品「時計」');
  a.equal(builderProductLabel({ title: '', edit: true }), '編集中の商品（名前なし）');
});

test('エラー文言から飛ぶ欄が分かる', () => {
  a.equal(builderFixField('商品コードを入れてください。カテゴリーを選ぶと候補が出ます。'), 'code');
  a.equal(builderFixField('商品名を入れてください'), 'title');
  a.equal(builderFixField('種類1の価格を入れてください'), 'price');
  a.equal(builderFixField('お届けまでの日数を入れてください（例: 14日）'), 'delivery');
  a.equal(builderFixField('商品の画像を選ぶか取り込んでください'), 'photos');
  a.equal(builderFixField('商品の説明を入れてください'), 'description');
  a.equal(builderFixField('カテゴリー（大・中）を選んでください'), 'places');
});

test('そのほかのエラーは開く場所が分かる', () => {
  a.equal(builderFixOtherTarget('営業日: 長期休暇の名前が空です').type, 'days');
  a.equal(builderFixOtherTarget('お店の案内・送料・税率: 送料無料の金額を整数で入れてください').type, 'store');
  a.equal(builderFixOtherTarget('セット商品の税率を確認してください').type, 'store');
  a.equal(builderFixOtherTarget('セット商品の税率を確認してください').focus, 'tax');
  a.equal(builderFixOtherTarget('お知らせ本文 1件目: 題名が空です').type, 'news');
  a.equal(builderFixOtherTarget('トップの商品の段「春」: 題名が空です').type, 'sections');
  a.equal(builderFixOtherTarget('企画「父の日」: 期間が逆です').type, 'plan');
  a.equal(builderFixOtherTarget('企画「父の日」: 期間が逆です').planName, '父の日');
});
