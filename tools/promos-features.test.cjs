// おすすめ特集（特集一覧のカード）: 上の画像は任意・あれば実在すること、特集は1〜8つ
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
test('特集一覧のカードは上の画像を任意で持てて、特集は8つまで', () => {
  const root = path.resolve(__dirname, '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'luna-features-'));
  const copy = (f) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.cpSync(path.join(root, f), path.join(tmp, f), { recursive: true }); };
  try {
    copy('tools/promos.cjs'); copy('site-src/home-promos'); copy('site-src/pages'); copy('site-src/products'); copy('images');
    const file = path.join(tmp, 'site-src/home-promos/recommended-features.json');
    const base = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ok = (row) => { fs.writeFileSync(file, JSON.stringify(row)); return cp.spawnSync(process.execPath, ['-e', "require('./tools/promos.cjs').load()"], { cwd: tmp, encoding: 'utf8' }).status === 0; };
    a.ok(ok(base), '画像なしの今の形は通る');
    a.ok(ok({ ...base, image: 'images/main-flavor.jpg' }), '実在する画像は通る');
    a.ok(!ok({ ...base, image: 'images/uploads/none.jpg' }), '無い画像は止める');
    a.ok(!ok({ ...base, tiles: Array(9).fill(base.tiles[0]) }), '9つは止める');
    a.ok(ok({ ...base, tiles: base.tiles.slice(0, 2) }), '2つに減らしても通る');
    a.ok(ok({ ...base, image: 'images/main-flavor.jpg', imageHeight: 240 }), '画像の高さ240pxは通る');
    a.ok(!ok({ ...base, image: 'images/main-flavor.jpg', imageHeight: 999 }), '高すぎる画像は止める');
  } finally {
    a.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
