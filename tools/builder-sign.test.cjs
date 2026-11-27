'use strict';
// OMS サイトビルダー「いちばん上の看板」: 見出しの強調の決まりがサイト（tools/home-message.cjs）と同じになること
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../oms/js/50-builder-sign.js'), 'utf8');
const mod = { exports: {} };
global.escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
new Function('module', 'state', src)(mod, { builder: {} });
test('見出しの改行を残し、強調の言葉（改行をまたいでも）だけ色の印を付ける', () => {
  a.equal(mod.exports.builderSignHeadlineHtml('ゲストの数だけ、\n名前入りの\nありがとうを。', '名前入りのありがとう'), 'ゲストの数だけ、<br><span>名前入りの<br>ありがとう</span>を。');
  a.equal(mod.exports.builderSignHeadlineHtml('見出し', '無い言葉'), '見出し');
  a.equal(mod.exports.builderSignAccentRange('あい\nうえお', 'いう').join(','), '1,4');
  a.equal(mod.exports.builderSignHeadlineHtml('<b>', ''), '&lt;b&gt;');
});
