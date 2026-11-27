'use strict';
// OMS のあいまい検索（oms/js/51-fuzzy.js）。サーバーの作業ログ（ops/vps/oms-app/work.js）と同じ決まり
const test = require('node:test'), a = require('node:assert/strict');
global.document = { addEventListener() {} };
const F = require('../oms/js/51-fuzzy.js');
test('全角半角・カナかな・空白記号・1文字ちがい・全部の言葉をふくむ', () => {
  a.equal(F.fuzzyFold('ＬＬ－ＲＰ ０１４'), 'llrp014');
  a.equal(F.fuzzyFold('タカハシ'), 'たかはし');
  a.ok(F.fuzzyMatch('高橋 拓也 LL-WB-001-GLD', 'll wb001'));
  a.ok(F.fuzzyMatch('Takuya & Misaki', 'misaki takuya'));
  a.ok(F.fuzzyMatch('ウェルカムボード', 'うぇるかむ'));
  a.ok(F.fuzzyMatch('Takuya & Misaki', 'misaky'));
  a.ok(F.fuzzyMatch('リングピロー「Étoile」', 'etoile'));
  a.ok(!F.fuzzyMatch('Takuya & Misaki', 'mai'));
  a.ok(!F.fuzzyMatch('Takuya', 'koji'));
});
