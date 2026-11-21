'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

test('OMSサイトビルダーのデータが site-src と一致している', () => {
  const out = execFileSync('node', [path.join(__dirname, 'oms-builder-data.cjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /最新/);
});

test('OMSのHTMLが読み込む css/js がすべてあり、起動ファイルが最後', () => {
  const dir = path.join(__dirname, '..', 'oms');
  const html = fs.readFileSync(path.join(dir, 'luna_luce_oms_ui_v2.html'), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 20);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(dir, ref)), ref + ' がありません');
  const scripts = refs.filter((r) => r.startsWith('js/'));
  assert.strictEqual(scripts[scripts.length - 1], 'js/90-start.js');
  assert.doesNotMatch(html, /<script>/, 'HTMLに直接スクリプトを書かない');
});
