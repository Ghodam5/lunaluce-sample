'use strict';
// 注意事項の定型文（site-src/notice-templates.json）を確かめ、notice-templates-data.js を作る。
// 商品の notes（定型文の id の並び）と delivery（お届けまでの日数）も、ここの check で確かめる（products.cjs から呼ぶ）。
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const SRC = path.join(root, 'site-src/notice-templates.json');
const OUT = path.join(root, 'notice-templates-data.js');
const TONES = ['important', 'caution', 'info'];
function load() {
  const d = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  if (d.schemaVersion !== 1 || !Array.isArray(d.templates)) throw Error('notice-templates.json の形が違います');
  const ids = new Set();
  for (const t of d.templates) {
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(t.id || '') || ids.has(t.id)) throw Error('定型文のIDが不正か重複: ' + t.id);
    ids.add(t.id);
    if (!TONES.includes(t.tone)) throw Error('定型文の色（tone）は important / caution / info: ' + t.id);
    if (typeof t.label !== 'string' || !t.label.trim() || t.label.length > 30) throw Error('定型文の名前は1〜30文字: ' + t.id);
    if (typeof t.text !== 'string' || !t.text.trim() || t.text.length > 300) throw Error('定型文の本文は1〜300文字: ' + t.id);
  }
  return d;
}
// 商品ごとの確かめ（products.cjs の validate から）
function checkProduct(p, ids) {
  if (p.delivery !== undefined) {
    const d = p.delivery;
    if (!d || typeof d !== 'object' || !Number.isInteger(d.min) || !Number.isInteger(d.max) || d.min < 1 || d.max < d.min || d.max > 120 || typeof d.made !== 'boolean') throw Error(p.id + ': お届け日数（delivery）が不正');
  }
  if (p.notes !== undefined) {
    if (!Array.isArray(p.notes) || new Set(p.notes).size !== p.notes.length || p.notes.some(id => !ids.has(id))) throw Error(p.id + ': 注意事項（notes）に無い定型文があります');
  }
}
function build(check = false) {
  const d = load();
  const text = '/* 編集元 site-src/notice-templates.json（OMSのサイトビルダー「注意事項の定型文」） */\nwindow.NOTICE_TEMPLATES=' + JSON.stringify(d.templates) + ';\n';
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== text) { if (check) throw Error('notice-templates-data.js の生成漏れ'); fs.writeFileSync(OUT, text); }
  return d.templates.length;
}
module.exports = { load, build, checkProduct };
if (require.main === module) { try { console.log('定型文: ' + build(process.argv.includes('--check')) + '件'); } catch (e) { console.error(e.message); process.exitCode = 1; } }
