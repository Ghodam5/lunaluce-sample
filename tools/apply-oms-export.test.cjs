'use strict';
// OMSの書き出しをサイトの編集元に入れる: 同じ内容なら何も変えない・部品ごとに入れる・だめな部品は元に戻す
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function sandbox() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'luna-apply-oms-'));
  for (const f of ['tools/apply-oms-export.cjs', 'tools/home-sections.cjs', 'tools/promos.cjs', 'tools/product-layout.cjs', 'tools/notice-templates.cjs', 'site-src/product-layout.json', 'site-src/notice-templates.json', 'site-src/home-sections.json', 'site-src/site-notices.json', 'site-src/home-promos', 'site-src/pages', 'site-src/sections/top', 'site-src/products']) {
    fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
    fs.cpSync(path.join(root, f), path.join(tmp, f), { recursive: true });
  }
  fs.mkdirSync(path.join(tmp, 'images'));
  for (const f of fs.readdirSync(path.join(root, 'images'))) if (f !== 'uploads') fs.symlinkSync(path.join(root, 'images', f), path.join(tmp, 'images', f));
  return tmp;
}
// いまのサイトと同じ内容の書き出し
function draftOf(tmp) {
  const ids = read(path.join(tmp, 'site-src/home-promos/manifest.json'));
  return {
    schemaVersion: 1, kind: 'luna-site-builder-draft', exportedAt: new Date().toISOString(),
    manifest: ids, cards: ids.map(id => read(path.join(tmp, 'site-src/home-promos', id + '.json'))),
    notices: read(path.join(tmp, 'site-src/site-notices.json')).notices,
    homeSections: read(path.join(tmp, 'site-src/home-sections.json')).sections,
    news: [], themes: [], stock: [], businessDays: null, newCategories: [], listing: {}, plans: [], products: [], edits: [], uploads: []
  };
}
function run(tmp, draft) {
  const f = path.join(tmp, 'draft.json');
  fs.writeFileSync(f, JSON.stringify(draft));
  const r = cp.spawnSync(process.execPath, [path.join(tmp, 'tools/apply-oms-export.cjs'), f], { encoding: 'utf8' });
  a.ok(r.status === 0 || r.status === 2, r.stderr);
  return JSON.parse(r.stdout);
}
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('いまと同じ内容なら、どのファイルも変えない', () => {
  const tmp = sandbox();
  try {
    const r = run(tmp, draftOf(tmp));
    a.deepEqual(r.errors, []);
    a.deepEqual(r.applied.flatMap(x => x.files), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('段・流れる文言・カードと画像を入れ、まだ入れない部品は一覧にする', () => {
  const tmp = sandbox();
  try {
    const d = draftOf(tmp);
    d.homeSections.reverse();
    d.homeSections.find(s => s.id === 'dragee').active = false;
    d.homeSections.unshift({ id: 'xmas', kind: 'row', active: true, title: 'クリスマス', ids: ['43569', '43374'], source: { plan: 'xmas' } });
    d.notices.push({ id: 'oms-days-newyear', auto: 'days', active: true, text: '年末年始のお休み', startsAt: '2026-11-01T00:00:00+09:00', endsAt: '2027-01-05T00:00:00+09:00' });
    d.cards[0].title = 'OMSで直した題名';
    d.cards[0].image = 'images/uploads/new-card-20261122.png';
    d.uploads.push({ path: 'images/uploads/new-card-20261122.png', dataUrl: PNG });
    d.news.push({ id: 'news-1', kind: 'news', title: 'お知らせ', blocks: [] });
    const r = run(tmp, d);
    a.deepEqual(r.errors, []);
    const files = r.applied.flatMap(x => x.files);
    a.ok(files.includes('site-src/home-sections.json'));
    a.ok(files.includes('site-src/site-notices.json'));
    a.ok(files.includes('images/uploads/new-card-20261122.png'));
    a.ok(files.includes('site-src/home-promos/' + d.manifest[0] + '.json'));
    const secs = read(path.join(tmp, 'site-src/home-sections.json')).sections;
    a.equal(secs[0].id, 'xmas');
    a.equal(secs[0].source, undefined);
    a.equal(read(path.join(tmp, 'site-src/site-notices.json')).notices.at(-1).href, 'news.html');
    a.deepEqual(r.later.map(x => x.part), ['news']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('だめな部品は元に戻し、ほかの部品は入れる', () => {
  const tmp = sandbox();
  try {
    const d = draftOf(tmp);
    const before = fs.readFileSync(path.join(tmp, 'site-src/home-promos', d.manifest[0] + '.json'), 'utf8');
    d.cards[0].theme = 'no-such-theme';
    d.cards[0].title = '変えた';
    d.uploads.push({ path: 'images/uploads/x-1.png', dataUrl: PNG });
    d.homeSections.reverse();
    const r = run(tmp, d);
    a.deepEqual(r.errors.map(x => x.part), ['cards']);
    a.equal(fs.readFileSync(path.join(tmp, 'site-src/home-promos', d.manifest[0] + '.json'), 'utf8'), before);
    a.ok(!fs.existsSync(path.join(tmp, 'images/uploads/x-1.png')));
    a.ok(r.applied.find(x => x.part === 'homeSections').files.length);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('置き場の外の画像や、サイトにないリンク先は入れない', () => {
  const tmp = sandbox();
  try {
    const d = draftOf(tmp);
    d.uploads.push({ path: '../evil.png', dataUrl: PNG });
    d.notices.push({ id: 'x', active: true, text: 'x', href: 'nothing.html' });
    const r = run(tmp, d);
    a.deepEqual(r.errors.map(x => x.part).sort(), ['cards', 'notices']);
    a.ok(!fs.existsSync(path.join(tmp, '..', 'evil.png')));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('v66 商品ページの段組みと注意事項の定型文を入れる（SNSを外す段組みは断って元に戻す）', () => {
  const tmp = sandbox();
  try {
    const d = draftOf(tmp);
    d.productLayout = { side: ['notes', 'description', 'buy', 'spec', 'source'], below: ['delivery', 'share', 'recommend', 'trial'] };
    d.noticeTemplates = read(path.join(tmp, 'site-src/notice-templates.json')).templates.slice(0, 3);
    let r = run(tmp, d);
    a.deepEqual(r.errors, []);
    a.deepEqual(read(path.join(tmp, 'site-src/product-layout.json')).side.slice(0, 2), ['notes', 'description']);
    const nt = read(path.join(tmp, 'site-src/notice-templates.json'));
    a.equal(nt.templates.length, 3);
    a.ok(nt.auto, '自動で出す決まりは残す');
    const before = fs.readFileSync(path.join(tmp, 'site-src/product-layout.json'), 'utf8');
    d.productLayout = { side: ['buy', 'notes'], below: ['recommend'] };
    d.noticeTemplates = [];
    r = run(tmp, d);
    a.equal(r.errors.length, 1);
    a.equal(r.errors[0].part, 'productLayout');
    a.equal(fs.readFileSync(path.join(tmp, 'site-src/product-layout.json'), 'utf8'), before);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
