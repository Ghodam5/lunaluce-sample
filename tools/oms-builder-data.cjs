#!/usr/bin/env node
// OMSサイトビルダー用のデータ(oms/builder-data.json)を、サイトの元データから作る。
// 読むだけ: site-src/home-promos/*.json, site-src/site-notices.json, site-src/sections/top/manifest.json・pages/top.html（トップの商品の段）, site-src/products/*.json, home-promos.css,
//          cat2.js（カテゴリの並び）, feature-data.js（特集ページ）, site-src/pages/*.html（ページの題名）
// 使い方: node tools/oms-builder-data.cjs          … 書き出し
//         node tools/oms-builder-data.cjs --check  … 書き出し済みの内容が最新か確認
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'oms', 'builder-data.json');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const THEME_NAMES = { cream: 'クリーム', rose: 'ローズ', mint: 'ミント', lavender: 'ラベンダー', sky: 'スカイ', seasonal: '季節' };

function themesFromCss() {
  const css = fs.readFileSync(path.join(root, 'home-promos.css'), 'utf8');
  return Object.keys(THEME_NAMES).map((id) => {
    const re = new RegExp('\\.home-promo-card\\[data-theme="' + id + '"\\]\\{([^}]*)\\}', 'g');
    const props = {};
    let m;
    while ((m = re.exec(css))) {
      m[1].split(';').forEach((decl) => {
        const i = decl.indexOf(':');
        if (i > 0) props[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
      });
    }
    const top = (props['border-top'] || '').split(' ').pop();
    const theme = { id, name: THEME_NAMES[id], builtIn: true, background: props.background, border: props['border-color'], top, accent: props['--promo-accent'] };
    for (const k of ['background', 'border', 'top', 'accent']) {
      if (!/^#[0-9a-f]{6}$/i.test(theme[k] || '')) throw new Error('テーマの色が読めません: ' + id + ' ' + k);
    }
    return theme;
  });
}

// リンク先を「名前で選ぶ」ための一覧。担当者がURLを打たずに済むようにする。
const PAGE_SKIP = new Set(['article.html', 'category.html', 'checkout.html', 'index.html', 'item.html', 'login.html', 'mypage.html', 'naire.html', 'register.html', 'sample-cart.html', 'survey.html', 'tailor-input.html', 'top.html', 'email-help.html']);
const PAGE_NAMES = { 'feature-list.html': '特集の一覧', 'name-preview.html': '名入れお試し', 'ranking.html': '人気ランキング' };
const PAGE_GROUPS = [
  ['campaign', 'キャンペーン・読みもの', ['campaign.html', 'campaign-5yen.html', 'charity-santa.html', 'ranking.html', 'news.html', 'columns.html', 'brands.html', 'monitor.html', 'name-preview.html']],
  ['guide', 'ご案内・ガイド', ['shopping-guide.html', 'product-guide.html', 'wedding-guide.html', 'shipping.html', 'noshi.html', 'option.html', 'bulk-pricing.html', 'speed.html', 'faq.html', 'contact.html', 'bulk-order.html', 'telephone-order.html', 'fax-order.html', 'overseas-shipping.html', 'partners.html', 'company.html', 'legal.html', 'privacy.html']]
];
function linkTargets() {
  const catSrc = fs.readFileSync(path.join(root, 'cat2.js'), 'utf8');
  const start = catSrc.indexOf('var GROUPS=');
  const end = catSrc.indexOf('\n];', start) + 3;
  if (start < 0 || end < 3) throw new Error('cat2.js のカテゴリが読めません');
  const helpers = 'function h(it,c){return it.c.indexOf(c)>=0}function s(it,x){return it.s.indexOf(x)>=0}function sa(it,a){return a.some(function(x){return s(it,x)})}function re(r){return function(it){return r.test(it.t)}}';
  const groups = vm.runInNewContext(helpers + ';(' + catSrc.slice(start + 11, end - 1) + ')');
  // 置き場所ごとに、いま並んでいる商品のカテゴリ設定で一番多い形を「お手本」にする（新しい商品をそこに並べるため）
  const items = productRows().map((p) => ({ t: p.title, c: p.categories, s: p.subs }));
  const titleHint = (fn) => { const m = String(fn).match(/\/([^/]+)\/\.test\(it\.t\)/); return m && !/!\s*\/[^/]+\/\.test\(it\.t\)/.test(String(fn)) ? m[1].split('|')[0] : ''; };
  const subHint = (m, key) => { const mm = m.sf && String(m.sf).match(new RegExp("x==='" + key + "'\\?\\/([^/|]+)")); return mm ? mm[1] : ''; };
  // 空から始め、置き場所の条件を満たすまで、並んでいる商品でよく使われている設定を足していく
  const place = (match, hint, prefer) => {
    const hits = items.filter(match);
    const freq = (key) => { const n = {}; hits.forEach((it) => it[key].forEach((v) => { if (v !== 'nairi') n[v] = (n[v] || 0) + 1; })); return n; };
    const fc = freq('c'), fs2 = freq('s');
    const cand = { t: hint || '', c: [], s: [] };
    let pool = Object.keys(fc).map((v) => ['c', v, fc[v]]).concat(Object.keys(fs2).map((v) => ['s', v, fs2[v]])).sort((a, b) => b[2] - a[2] || (a[1] < b[1] ? -1 : 1));
    if (prefer && fs2[prefer]) pool = [['s', prefer, Infinity]].concat(pool);
    for (let k = 0; k < pool.length && hits.length && !match(cand); k += 1) {
      const [key, v] = pool[k];
      if (cand[key].indexOf(v) >= 0) continue;
      const trial = { t: cand.t, c: cand.c.slice(), s: cand.s.slice() };
      trial[key].push(v);
      if (match(trial)) { cand.c = trial.c; cand.s = trial.s; break; }
      if (key === 'c' || v === prefer) { cand.c = trial.c; cand.s = trial.s; }
    }
    if (hits.length && !match(cand)) {
      // 見つからなければ、よく使われている設定の組み合わせ（3つまで）を順に試す
      const top = pool.slice(0, 10);
      const combos = [];
      for (let a = 0; a < top.length; a += 1) { combos.push([top[a]]); for (let b = a + 1; b < top.length; b += 1) { combos.push([top[a], top[b]]); for (let c = b + 1; c < top.length; c += 1) combos.push([top[a], top[b], top[c]]); } }
      combos.sort((x, y) => x.length - y.length);
      const hit = combos.find((cb) => { const t = { t: cand.t, c: [], s: [] }; cb.forEach(([k, v]) => t[k].push(v)); return match(t); });
      if (hit) { cand.c = []; cand.s = []; hit.forEach(([k, v]) => cand[k].push(v)); }
    }
    const ok = hits.length > 0 && match(cand);
    return { categories: ok ? cand.c.sort() : [], subs: ok ? cand.s.sort() : [], count: hits.length, titleHint: hint, ok };
  };
  const categories = groups.map((g) => ({ k: g.k, name: g.name, mids: g.mids.map((m) => ({
    k: m.k, name: m.name, place: place(m.f, titleHint(m.f)),
    subs: (m.subs || []).map((x) => [x[0], x[1], place((it) => m.f(it) && (x[2] ? x[2].test(it.t) : m.sf ? m.sf(it, x[0]) : true), x[2] ? x[2].source.split('|')[0] : subHint(m, x[0]) || titleHint(m.f), x[0])])
  })) }));
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'feature-data.js'), 'utf8'), ctx);
  const defs = ctx.window.FEATURE_CATALOG.definitions;
  const features = Object.keys(defs).map((k) => ({ href: defs[k].file, label: defs[k].title, image: defs[k].banner || '' }));
  features.push({ href: 'feature-list.html', label: '特集の一覧', image: '' });
  const titleOf = (file) => {
    if (PAGE_NAMES[file]) return PAGE_NAMES[file];
    const html = fs.readFileSync(path.join(root, 'site-src/pages', file), 'utf8');
    const m = html.match(/<title>([^<|｜]+)/);
    return m ? m[1].trim() : file;
  };
  const exists = (f) => fs.existsSync(path.join(root, 'site-src/pages', f));
  const used = new Set(features.map((f) => f.href));
  const pageGroups = PAGE_GROUPS.map(([k, name, list]) => ({ k, name, pages: list.filter((f) => exists(f) && !used.has(f)).map((f) => { used.add(f); return { href: f, label: titleOf(f) }; }) }));
  const rest = fs.readdirSync(path.join(root, 'site-src/pages')).filter((f) => f.endsWith('.html') && !PAGE_SKIP.has(f) && !used.has(f)).sort();
  if (rest.length) pageGroups.push({ k: 'other', name: 'そのほかのページ', pages: rest.map((f) => ({ href: f, label: titleOf(f) })) });
  return { categories, features, pageGroups };
}

// お届けまでの日数（2.29）。商品に delivery があればそれ、無ければ本文の「お届けまで(に)約14日」などから読む（サイトの tools/delivery-days.cjs と同じ読み方）
const LEAD_RE = /お届けまで(?:に|の目安は)?\s*(?:約|およそ)?\s*(\d{1,2})\s*(?:[~〜～\-－]\s*(\d{1,2}))?\s*(日|週間)/;
function leadOf(p) {
  if (p.delivery) return p.delivery;
  const text = [p.notice, p.description, p.minnote].join('\n');
  const m = LEAD_RE.exec(text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)));
  if (!m) return null;
  const k = m[3] === '週間' ? 7 : 1;
  return { min: Number(m[1]) * k, max: Number(m[2] || m[1]) * k, made: /受注|製造|生産|制作/.test(text), source: '本文' };
}
// 商品ページの段組み。サイトに site-src/product-layout.json があればそれ（無ければOMSの標準を使う）
function productLayout() {
  const f = path.join(root, 'site-src/product-layout.json');
  if (!fs.existsSync(f)) return undefined;
  const d = read('site-src/product-layout.json');
  return { side: d.side, below: d.below };
}
// お店の案内・送料・税率と商品ごとの税の種類（サイトの site-src/store-info.json・product-tax.json。無ければ null）
function storeInfo() { return fs.existsSync(path.join(root, 'site-src/store-info.json')) ? read('site-src/store-info.json') : null; }
function productTax() { return fs.existsSync(path.join(root, 'site-src/product-tax.json')) ? read('site-src/product-tax.json') : null; }
// 表示する文字。サイトに site-src/site-texts.json があればそれ（無ければOMSの標準を使う）
function siteTexts() {
  const f = path.join(root, 'site-src/site-texts.json');
  if (!fs.existsSync(f)) return undefined;
  return read('site-src/site-texts.json').texts.map(t => ({ key: t.key, group: t.group, label: t.label, text: t.text }));
}
// 注意事項の定型文。サイトに site-src/notice-templates.json があればそれ（無ければOMSの標準を使う）
function noticeTemplates() {
  const f = path.join(root, 'site-src/notice-templates.json');
  return fs.existsSync(f) ? read('site-src/notice-templates.json').templates : undefined;
}

function productRows() {
  return JSON.parse(fs.readFileSync(path.join(root, 'site-src/products/manifest.json'), 'utf8')).map((id) => read('site-src/products/' + id + '.json')).filter((r) => r.product).map((r) => r.product);
}
// お手本用の商品データ（商品登録で「似ている商品から作る」ときに使う）。画面は必要になってから読む。
function templateProducts() {
  return JSON.parse(fs.readFileSync(path.join(root, 'site-src/products/manifest.json'), 'utf8')).map((id) => read('site-src/products/' + id + '.json')).filter((r) => r.active && r.product).map((r) => { const p = Object.assign({}, r.product); const lead = leadOf(p); if (lead) p.delivery = lead; const photos = ((r.detail && r.detail.photos) || []).map((x) => x.src).filter(Boolean); const base = (x) => path.basename(x || ''); if (photos.length) p.photos = [p.image].concat(photos.filter((x) => base(x) !== base(p.image))).filter(Boolean); return p; });
}

// トップ本文の商品の段（いまの並び）。site-src/home-sections.json があればそれ、なければ top.html の並びから作る
const SECTION_NAMES = { finder: '3つの方法でさがす' };
function homeSections() {
  const titleOf = (id) => {
    if (SECTION_NAMES[id]) return SECTION_NAMES[id];
    const f = path.join(root, 'site-src/sections/top', id + '.html');
    const m = fs.existsSync(f) && fs.readFileSync(f, 'utf8').match(/<h2>([^<]*)/);
    return m ? m[1].trim() : id;
  };
  let rows;
  if (fs.existsSync(path.join(root, 'site-src/home-sections.json'))) rows = read('site-src/home-sections.json').sections;
  else {
    const top = fs.readFileSync(path.join(root, 'site-src/pages/top.html'), 'utf8');
    const ids = Array.from(top.matchAll(/\{\{@ top\/([a-z0-9-]+)\}\}/g)).map((m) => m[1]).filter((id) => id !== 'christmas');
    ids.splice(1, 0, 'finder');
    rows = ids.map((id) => ({ id: id, kind: 'fixed', active: true }));
  }
  return rows.map((r) => r.kind === 'fixed' ? Object.assign({ title: titleOf(r.id) }, r) : r);
}

function build() {
  const order = read('site-src/home-promos/manifest.json');
  const files = fs.readdirSync(path.join(root, 'site-src/home-promos')).filter((f) => f.endsWith('.json') && f !== 'manifest.json').map((f) => f.replace(/\.json$/, '')).sort();
  const ids = order.concat(files.filter((id) => !order.includes(id)));
  const cards = ids.map((id) => Object.assign({ inManifest: order.includes(id) }, read('site-src/home-promos/' + id + '.json')));
  const notices = read('site-src/site-notices.json');
  const products = fs.readdirSync(path.join(root, 'site-src/products')).filter((f) => /^\d+\.json$/.test(f)).map((f) => read('site-src/products/' + f)).filter((p) => p.active && p.product).map((p) => Object.assign({ id: String(p.product.id), code: p.product.code, title: p.product.title, price: p.product.price, image: p.product.image || '', lead: !!leadOf(p.product) }, p.stock ? { stock: p.stock } : {})).sort((a, b) => Number(a.id) - Number(b.id));
  const images = Array.from(new Set(cards.flatMap((c) => [c.image].concat((c.tiles || []).map((t) => t.image))).filter(Boolean))).sort();
  return { schemaVersion: 1, note: 'tools/oms-builder-data.cjs で作る。直接編集しない。', themes: themesFromCss(), cards, notices, products, images, links: linkTargets(), homeSections: homeSections(), noticeTemplates: noticeTemplates(), productLayout: productLayout(), siteTexts: siteTexts(), storeInfo: storeInfo(), productTax: productTax() };
}

// 使われている商品コードの台帳（商品コードの重複チェック用）。小文字にそろえ、どこで使っているかを文字で持つ
// s=新サイト（site-src/products）、w=本店Welcart（oms-products.json）、r=楽天（oms-channel-match.json の楽天商品データ）
function codeRegistry() {
  const codes = {};
  const add = (code, ch) => {
    const k = String(code || '').trim().toLowerCase();
    if (!k || k === 'normal-inventory') return;
    if (!codes[k]) codes[k] = '';
    if (!codes[k].includes(ch)) codes[k] += ch;
  };
  productRows().forEach((p) => { add(p.code, 's'); (p.skus || []).forEach((x) => add(x.code, 's')); });
  const sources = { s: { name: '新サイト', count: productRows().length } };
  const wf = path.join(root, 'oms/oms-products.json');
  if (fs.existsSync(wf)) {
    const w = read('oms/oms-products.json').products || [];
    w.forEach((p) => { add(p.item_code, 'w'); add(p.sku, 'w'); });
    sources.w = { name: '本店（Welcart）', count: w.length };
  }
  const mf = path.join(root, 'oms/oms-channel-match.json');
  if (fs.existsSync(mf)) {
    const m = read('oms/oms-channel-match.json');
    (m.rakuten || []).forEach((r) => { add(r.manage_no, 'r'); add(r.item_no, 'r'); add(r.sku_no, 'r'); });
    sources.r = { name: '楽天', count: (m.counts && m.counts.rakuten_products) || 0, asOf: m.as_of };
    sources.w.asOf = m.welcart_as_of;
  }
  const sorted = {};
  Object.keys(codes).sort().forEach((k) => { sorted[k] = codes[k]; });
  return { note: 'tools/oms-builder-data.cjs で作る。直接編集しない。Yahooは画面からCSVを読み込んで足す。', sources, codes: sorted };
}

// 本店（Welcart）にあって新サイトにまだ出していない商品（在庫の画面の「未出店」で、出す・出さないを決める）
function unlistedProducts() {
  const wf = path.join(root, 'oms/oms-products.json');
  if (!fs.existsSync(wf)) return [];
  const onSite = new Set(productRows().map((p) => String(p.id)));
  const seen = new Set();
  return (read('oms/oms-products.json').products || []).filter((p) => {
    const id = String(p.id);
    if (onSite.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((p) => ({ id: String(p.id), code: p.item_code || '', title: String(p.name || '').replace(/[\s　]+/g, ' ').trim(), price: p.price_tax_in || 0, cat: String((p.category || [])[0] || '').replace(/^商品 \/ /, '') }))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

const outputs = [
  [out, JSON.stringify(build(), null, 2) + '\n'],
  [path.join(root, 'oms', 'builder-products.json'), JSON.stringify({ note: 'tools/oms-builder-data.cjs で作る。直接編集しない。', products: templateProducts() }) + '\n'],
  [path.join(root, 'oms', 'builder-codes.json'), JSON.stringify(codeRegistry()) + '\n'],
  [path.join(root, 'oms', 'builder-unlisted.json'), JSON.stringify({ note: 'tools/oms-builder-data.cjs で作る。直接編集しない。本店にあって新サイトにない商品。', products: unlistedProducts() }) + '\n']
];
if (process.argv.includes('--check')) {
  for (const [file, text] of outputs) {
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (now !== text) { console.error(path.relative(root, file) + ' が古いです。node tools/oms-builder-data.cjs を実行してください。'); process.exit(1); }
  }
  console.log('oms/builder-data.json・builder-products.json・builder-codes.json・builder-unlisted.json は最新です');
} else {
  for (const [file, text] of outputs) fs.writeFileSync(file, text);
  console.log('oms/builder-data.json・builder-products.json・builder-codes.json・builder-unlisted.json を書き出しました');
}
