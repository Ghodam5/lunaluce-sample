#!/usr/bin/env node
// OMSサイトビルダー用のデータ(oms/builder-data.json)を、サイトの元データから作る。
// 読むだけ: site-src/home-promos/*.json, site-src/site-notices.json, site-src/products/*.json, home-promos.css,
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
  const groups = vm.runInNewContext('(' + catSrc.slice(start + 11, end - 1) + ')');
  const categories = groups.map((g) => ({ k: g.k, name: g.name, mids: g.mids.map((m) => ({ k: m.k, name: m.name, subs: (m.subs || []).map((x) => [x[0], x[1]]) })) }));
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

function build() {
  const order = read('site-src/home-promos/manifest.json');
  const files = fs.readdirSync(path.join(root, 'site-src/home-promos')).filter((f) => f.endsWith('.json') && f !== 'manifest.json').map((f) => f.replace(/\.json$/, '')).sort();
  const ids = order.concat(files.filter((id) => !order.includes(id)));
  const cards = ids.map((id) => Object.assign({ inManifest: order.includes(id) }, read('site-src/home-promos/' + id + '.json')));
  const notices = read('site-src/site-notices.json');
  const products = fs.readdirSync(path.join(root, 'site-src/products')).filter((f) => /^\d+\.json$/.test(f)).map((f) => read('site-src/products/' + f)).filter((p) => p.active && p.product).map((p) => ({ id: String(p.product.id), title: p.product.title, price: p.product.price, image: p.product.image || '' })).sort((a, b) => Number(a.id) - Number(b.id));
  const images = Array.from(new Set(cards.flatMap((c) => [c.image].concat((c.tiles || []).map((t) => t.image))).filter(Boolean))).sort();
  return { schemaVersion: 1, note: 'tools/oms-builder-data.cjs で作る。直接編集しない。', themes: themesFromCss(), cards, notices, products, images, links: linkTargets() };
}

const text = JSON.stringify(build(), null, 2) + '\n';
if (process.argv.includes('--check')) {
  const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (now !== text) { console.error('oms/builder-data.json が古いです。node tools/oms-builder-data.cjs を実行してください。'); process.exit(1); }
  console.log('oms/builder-data.json は最新です');
} else {
  fs.writeFileSync(out, text);
  console.log('oms/builder-data.json を書き出しました');
}
