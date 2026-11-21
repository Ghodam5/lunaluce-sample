#!/usr/bin/env node
// OMSサイトビルダー用のデータ(oms/builder-data.json)を、サイトの元データから作る。
// 読むだけ: site-src/home-promos/*.json, site-src/site-notices.json, site-src/products/*.json, home-promos.css
// 使い方: node tools/oms-builder-data.cjs          … 書き出し
//         node tools/oms-builder-data.cjs --check  … 書き出し済みの内容が最新か確認
'use strict';
const fs = require('fs');
const path = require('path');

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

function build() {
  const order = read('site-src/home-promos/manifest.json');
  const files = fs.readdirSync(path.join(root, 'site-src/home-promos')).filter((f) => f.endsWith('.json') && f !== 'manifest.json').map((f) => f.replace(/\.json$/, '')).sort();
  const ids = order.concat(files.filter((id) => !order.includes(id)));
  const cards = ids.map((id) => Object.assign({ inManifest: order.includes(id) }, read('site-src/home-promos/' + id + '.json')));
  const notices = read('site-src/site-notices.json');
  const products = fs.readdirSync(path.join(root, 'site-src/products')).filter((f) => /^\d+\.json$/.test(f)).map((f) => read('site-src/products/' + f)).filter((p) => p.active && p.product).map((p) => ({ id: String(p.product.id), title: p.product.title, price: p.product.price, image: p.product.image || '' })).sort((a, b) => Number(a.id) - Number(b.id));
  const images = Array.from(new Set(cards.flatMap((c) => [c.image].concat((c.tiles || []).map((t) => t.image))).filter(Boolean))).sort();
  return { schemaVersion: 1, note: 'tools/oms-builder-data.cjs で作る。直接編集しない。', themes: themesFromCss(), cards, notices, products, images };
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
