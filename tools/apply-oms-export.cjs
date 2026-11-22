'use strict';
// OMSのサイトビルダーの書き出し（site-builder-draft.json）を、サイトの編集元（site-src）に入れる。
// 使い方: node tools/apply-oms-export.cjs 書き出し.json   → 結果をJSONで出す（入れたもの・まだ入れないもの・入れられなかったもの）
// このあと node tools/build-site.cjs でページを作り直す。OMSの「反映」画面からはサーバーがこの2つを続けて動かし、プルリクエストにする。
// 部品ごとに入れて確かめ、だめな部品は元に戻して他は続ける（1つの間違いで全部止めない）。
// いま入れる部品: トップの商品の段（home-sections.json）・流れる文言（site-notices.json）・トップのカード（home-promos/）とその画像。
// それ以外（お知らせ本文・商品・在庫・企画など）はサイト側の受け口ができたらここに足す。
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const rel = p => path.relative(root, p).split(path.sep).join('/');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
// 中身が同じ（キーの順番だけ違う）ときは書かない。差分を小さくするため
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v;
const writeJson = (p, v) => { if (fs.existsSync(p) && JSON.stringify(canon(readJson(p))) === JSON.stringify(canon(v))) return; fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
const isTime = v => typeof v === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
const PAGES = path.join(root, 'site-src/pages');

// 部品の変更を試し、だめなら書いたファイルを元に戻す
function part(report, key, label, fn) {
  const saved = new Map();
  const touch = p => { if (!saved.has(p)) saved.set(p, fs.existsSync(p) ? fs.readFileSync(p) : null); };
  try {
    const files = fn(touch);
    const changed = files.filter(p => { const before = saved.get(p); return before === null || before === undefined || !before.equals(fs.readFileSync(p)); });
    report.applied.push({ part: key, label, files: changed.map(rel) });
  } catch (e) {
    for (const [p, before] of saved) { if (before === null) { if (fs.existsSync(p)) fs.rmSync(p); } else fs.writeFileSync(p, before); }
    report.errors.push({ part: key, label, error: e.message });
  }
}

function sections(draft, touch) {
  const p = path.join(root, 'site-src/home-sections.json');
  touch(p);
  const cur = readJson(p);
  cur.sections = draft.homeSections.map(s => { const o = Object.assign({}, s); delete o.source; return o; });
  writeJson(p, cur);
  require('./home-sections.cjs').load();
  return [p];
}

function notices(draft, touch) {
  const p = path.join(root, 'site-src/site-notices.json');
  touch(p);
  const cur = readJson(p);
  const ids = new Set();
  cur.notices = draft.notices.map(n => {
    const o = { id: String(n.id || ''), active: n.active !== false, text: String(n.text || '').trim(), href: n.href || 'news.html' };
    if (!/^[a-z0-9-]{1,60}$/.test(o.id) || ids.has(o.id)) throw Error('流れる文言のIDが不正か重複: ' + o.id);
    ids.add(o.id);
    if (!o.text || o.text.length > 200) throw Error('流れる文言は1〜200文字: ' + o.id);
    if (!/^[a-z0-9-]+\.html(?:[?#].*)?$/.test(o.href) || !fs.existsSync(path.join(PAGES, o.href.split(/[?#]/)[0]))) throw Error('流れる文言のリンク先がサイトにありません: ' + o.id + ' ' + o.href);
    for (const k of ['startsAt', 'endsAt']) if (n[k]) { if (!isTime(n[k])) throw Error('流れる文言の日時を確認: ' + o.id); o[k] = n[k]; }
    if (o.startsAt && o.endsAt && Date.parse(o.startsAt) >= Date.parse(o.endsAt)) throw Error('流れる文言の期間が逆: ' + o.id);
    return o;
  });
  writeJson(p, cur);
  return [p];
}

function cards(draft, touch) {
  const dir = path.join(root, 'site-src/home-promos');
  const files = [];
  // 画像（OMSで取り込んだもの）を先に置く。置き場は images/uploads/ だけ
  for (const u of draft.uploads || []) {
    if (typeof u.path !== 'string' || !/^images\/uploads\/[a-z0-9][a-z0-9_-]{0,80}\.(?:jpg|png)$/.test(u.path)) throw Error('画像の置き場が不正: ' + u.path);
    const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(u.dataUrl || '');
    if (!m || (m[1] === 'png') !== u.path.endsWith('.png')) throw Error('画像の中身が不正: ' + u.path);
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 3 * 1024 * 1024) throw Error('画像が3MBを超えています: ' + u.path);
    const p = path.join(root, u.path);
    touch(p);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buf);
    files.push(p);
  }
  const manifest = Array.isArray(draft.manifest) ? draft.manifest : draft.cards.map(c => c.id);
  const byId = new Map(draft.cards.map(c => [c.id, c]));
  if (manifest.some(id => !byId.has(id))) throw Error('カードの並びに無いカードがあります');
  for (const id of manifest) {
    if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(id)) throw Error('カードのIDが不正: ' + id);
    const p = path.join(dir, id + '.json');
    touch(p);
    writeJson(p, byId.get(id));
    files.push(p);
  }
  const mp = path.join(dir, 'manifest.json');
  touch(mp);
  writeJson(mp, manifest);
  files.push(mp);
  // 並びから外れたカードのファイルは残す（掲載はmanifestで決まる。消すのは人が確かめてから）
  delete require.cache[require.resolve('./promos.cjs')];
  require('./promos.cjs').all();
  return files;
}

// 商品ページの段組み（OMSのサイトビルダー「商品ページの段組み」）。部品の名前（parts）はサイト側のものを使う
function productLayout(draft, touch) {
  const p = path.join(root, 'site-src/product-layout.json');
  touch(p);
  const cur = readJson(p);
  const l = draft.productLayout;
  cur.side = (l.side || []).map(String);
  cur.below = (l.below || []).map(String);
  writeJson(p, cur);
  delete require.cache[require.resolve('./product-layout.cjs')];
  require('./product-layout.cjs').load();
  return [p];
}
// 注意事項の定型文（自動で出す決まり auto はサイト側のものを残す）
function noticeTemplates(draft, touch) {
  const p = path.join(root, 'site-src/notice-templates.json');
  touch(p);
  const cur = readJson(p);
  cur.templates = draft.noticeTemplates.map(t => ({ id: String(t.id || ''), tone: t.tone, label: String(t.label || '').trim(), text: String(t.text || '').trim() }));
  // OMSで消した定型文は、自動で出す決まりからも外す
  const ids = new Set(cur.templates.map(t => t.id));
  for (const k of ['all', 'made', 'food', 'minq']) if (cur.auto && Array.isArray(cur.auto[k])) cur.auto[k] = cur.auto[k].filter(id => ids.has(id));
  writeJson(p, cur);
  delete require.cache[require.resolve('./notice-templates.cjs')];
  require('./notice-templates.cjs').load();
  return [p];
}

const LATER = [
  ['news', 'お知らせ本文', d => (d.news || []).length],
  ['themes', '追加した色のテーマ', d => (d.themes || []).length],
  ['products', '新しい商品', d => (d.products || []).length],
  ['edits', '商品の直し', d => (d.edits || []).length],
  ['stock', '在庫の状態', d => (d.stock || []).length],
  ['listing', '出す・出さないと販売期間', d => Object.keys(d.listing || {}).length],
  ['plans', '企画', d => (d.plans || []).length],
  ['newCategories', '新しいカテゴリー', d => (d.newCategories || []).length],
  ['categoryNames', 'カテゴリーの名前', d => (d.categoryNames || []).length],
  ['hiddenCategories', '消すカテゴリー', d => (d.hiddenCategories || []).length],
  ['businessDays', '営業日', d => (d.businessDays && d.businessDays.holidays ? d.businessDays.holidays.length : 0)]
];

function apply(draft) {
  if (!draft || draft.kind !== 'luna-site-builder-draft' || draft.schemaVersion !== 1) throw Error('OMSのサイトビルダーの書き出しではありません');
  const report = { applied: [], later: [], errors: [] };
  if (Array.isArray(draft.homeSections) && draft.homeSections.length) part(report, 'homeSections', 'トップの商品の段', t => sections(draft, t));
  if (Array.isArray(draft.notices)) part(report, 'notices', '流れる文言', t => notices(draft, t));
  if (Array.isArray(draft.cards) && draft.cards.length) part(report, 'cards', 'トップのカード', t => cards(draft, t));
  if (draft.productLayout && Array.isArray(draft.productLayout.side)) part(report, 'productLayout', '商品ページの段組み', t => productLayout(draft, t));
  if (Array.isArray(draft.noticeTemplates) && draft.noticeTemplates.length) part(report, 'noticeTemplates', '注意事項の定型文', t => noticeTemplates(draft, t));
  for (const [key, label, count] of LATER) { const n = count(draft); if (n) report.later.push({ part: key, label, count: n, reason: 'サイト側の受け口はこれから作ります' }); }
  return report;
}

module.exports = { apply };
if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) throw Error('使い方: node tools/apply-oms-export.cjs 書き出し.json');
    const report = apply(readJson(path.resolve(file)));
    console.log(JSON.stringify(report, null, 2));
    if (report.errors.length) process.exitCode = 2;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
