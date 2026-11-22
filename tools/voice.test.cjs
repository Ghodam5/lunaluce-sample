'use strict';
// お客様の声（oms/js/48-voice-model.js）: 伏せ字・まとまり・よくある質問の候補・CSV
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(__dirname, '../oms/js/48-voice-model.js'), 'utf8'))(mod);
const v = mod.exports;
test('メールアドレスと電話番号は伏せ字になる', () => {
  assert.equal(v.voiceMask('連絡は test.user@example.com か 090-1234-5678 へ'), '連絡は ［メール］ か ［電話］ へ');
});
test('似た質問は同じまとまりに入り、3件で候補に出る', () => {
  const d = v.voiceEmpty();
  v.voiceAdd(d, { src: 'mail', kind: 'question', at: '2026-11-01', text: '名入れの文字数は何文字まで入りますか？' });
  v.voiceAdd(d, { src: 'line', kind: 'question', at: '2026-11-02', text: '名入れは何文字まで入れられますか' });
  v.voiceAdd(d, { src: 'mail', kind: 'question', at: '2026-11-03', text: '送料はいくらですか' });
  assert.equal(d.topics.length, 2);
  assert.equal(v.voiceCandidates(d).length, 0);
  v.voiceAdd(d, { src: 'yahoo-ask', kind: 'question', at: '2026-11-04', text: '名入れの文字は何文字までですか？' });
  const c = v.voiceCandidates(d);
  assert.equal(c.length, 1);
  assert.equal(c[0].count, 3);
});
test('入れないと決めたら消え、さらに3件増えたらまた出る', () => {
  const d = v.voiceEmpty();
  const qs = ['名入れの文字数は何文字までですか', '名入れの文字数は何文字まで？', '名入れ文字数は何文字までですか', '名入れの文字数は何文字までOK？', '名入れの文字数は何文字まで可能？', '名入れの文字数は何文字までいけますか'];
  qs.slice(0, 3).forEach((t, i) => v.voiceAdd(d, { src: 'mail', kind: 'question', at: '2026-11-0' + (i + 1), text: t }));
  const id = v.voiceCandidates(d)[0].topic.id;
  v.voiceDecide(d, id, 'out', { reason: '商品ページに書いてある' }, 'テスト');
  assert.equal(v.voiceCandidates(d).length, 0);
  qs.slice(3).forEach((t, i) => v.voiceAdd(d, { src: 'mail', kind: 'question', at: '2026-11-1' + (i + 1), text: t }));
  assert.equal(v.voiceCandidates(d).length, 1);
});
test('自動で入れる設定では、件数に届いたものが「入れる」になる（答えは空）', () => {
  const d = v.voiceEmpty();
  d.settings.mode = 'auto';
  ['送料はいくらですか', '送料はいくらかかりますか', '送料っていくら？'].forEach((t, i) => v.voiceAdd(d, { src: 'mail', kind: 'question', at: '2026-11-0' + (i + 1), text: t }));
  const added = v.voiceAutoAdd(d);
  assert.equal(added.length, 1);
  const faq = v.voiceFaqExport(d);
  assert.equal(faq.length, 1);
  assert.equal(faq[0].ready, false);
});
test('同じものは2回入らない。CSVは見出しで列を当てる', () => {
  const d = v.voiceEmpty();
  assert.equal(v.voiceAdd(d, { src: 'mail', kind: 'opinion', at: '2026-11-01', text: 'かわいい' }).ok, true);
  assert.equal(v.voiceAdd(d, { src: 'mail', kind: 'opinion', at: '2026-11-01', text: 'かわいい' }).dup, true);
  const csv = '投稿日,商品管理番号,評価,レビュー本文\r\n2026/11/05,kashi-xmas,5,"とても良い,また買います"\r\n2026/11/06,kashi-xmas,2,届くのが遅い\r\n';
  const r = v.voiceCsvItems(csv, 'rakuten-review', 'review');
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].text, 'とても良い,また買います');
  assert.equal(r.items[0].at, '2026-11-05');
  r.items.forEach((x) => v.voiceAdd(d, x));
  const s = v.voiceReviewSummary(d);
  assert.equal(s.total, 2);
  assert.equal(s.avg, 3.5);
  assert.equal(s.lowOpen.length, 1);
});
