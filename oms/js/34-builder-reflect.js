// Luna Luce OMS 部品JS: 34-builder-reflect（反映: OMSで直したものを新サイト・Welcart・楽天・Yahooへ）
// 2.26 で追加。前回反映したときの形と今の下書きを比べて変更点を出し、行き先ごとに「試しに見る」「反映する」を押す。
//   新サイト: OMSのサーバー（oms-reflect）がサイトに入れてビルドし、GitHubにプルリクエストを作る（マージは人が確かめてから）
//   Welcart: サーバーがテスト環境の受け取りプラグインへ送る（本番には送らない）。鍵はサーバーの環境欄だけにあり、画面には出さない
//   楽天・Yahoo: API の申請がすむまでは、CSV・お休み一覧をダウンロードして各店に入れ、「入れた」と記録する
// サーバーがまだ無いときは、記録はこの端末（ブラウザ）だけに残し、新サイトは書き出しファイルのダウンロードで代わりにする。
    const REFLECT_KEY = 'luna-oms-reflect-v1';
    const REFLECT_API = '../api/reflect/';
    const REFLECT_PARTS = [
      ['cards', 'トップのカード'], ['notices', '流れる文言'], ['news', 'お知らせ本文'], ['homeSections', 'トップの商品の段'],
      ['themes', '色のテーマ'], ['plans', '企画'], ['listing', '出す・出さないと販売期間'], ['stock', '在庫の状態'],
      ['newCategories', '新しいカテゴリー'], ['categoryNames', 'カテゴリーの名前'], ['hiddenCategories', '消すカテゴリー'], ['productLayout', '商品ページの段組み'], ['texts', '表示する文字'], ['noticeTemplates', '注意事項の定型文'], ['products', '新しい商品'], ['edits', '商品の直し'], ['businessDays', '営業日'], ['storeInfo', 'お店の案内・送料・税率'], ['productTax', '商品の税の種類'], ['uploads', '取り込んだ画像']
    ];
    const REFLECT_DESTS = [
      { id: 'site', name: '新サイト（GitHub）', parts: ['cards', 'notices', 'news', 'homeSections', 'themes', 'plans', 'listing', 'stock', 'newCategories', 'categoryNames', 'hiddenCategories', 'productLayout', 'texts', 'businessDays', 'noticeTemplates', 'storeInfo', 'productTax', 'products', 'edits', 'uploads'], lead: '変わったファイルをプルリクエストにします。中身を確かめてマージすると、見本サイトに出ます。' },
      { id: 'welcart', name: '本店 Welcart（検証用 renewal-test.luna-luce.info）', parts: ['products', 'edits', 'stock', 'businessDays', 'newCategories', 'categoryNames', 'hiddenCategories', 'uploads'], lead: '送り先は renewal-test.luna-luce.info に固定しています。商品・在庫の状態・営業日を入れます。本番（luna-luce.jp）には送りません。GitHubへの反映は上の別ボタンです。' },
      { id: 'rakuten', name: '楽天', parts: ['products', 'edits', 'businessDays'], lead: 'API の申請がすむまでは、CSVとお休み一覧をダウンロードして楽天の管理画面に入れます。' },
      { id: 'yahoo', name: 'Yahoo', parts: ['products', 'edits', 'businessDays'], lead: 'API の申請がすむまでは、CSVとお休み一覧をダウンロードしてYahooの管理画面に入れます。' }
    ];
    function reflectState() {
      const b = state.builder;
      if (!b.reflect) b.reflect = { server: null, checked: false, busy: '', confirm: '', result: {}, local: reflectLocalRead() };
      return b.reflect;
    }
    function reflectLocalRead() {
      try { const v = JSON.parse(localStorage.getItem(REFLECT_KEY) || 'null'); if (v && v.last && Array.isArray(v.history)) return v; } catch (e) { /* 読めないときは空から */ }
      return { last: {}, history: [] };
    }
    function reflectLocalRecord(row, snapshot) {
      const r = reflectState();
      const log = r.local;
      row.at = row.at || new Date().toISOString();
      log.history.unshift(row);
      log.history = log.history.slice(0, 100);
      if (row.action === 'apply' && row.ok && snapshot) log.last[row.dest] = { at: row.at, by: row.by || '', snapshot: snapshot };
      if (row.action === 'apply' && !row.ok) log.last[row.dest] = Object.assign({}, log.last[row.dest] || {}, { failedAt: row.at, failNote: row.note });
      try { localStorage.setItem(REFLECT_KEY, JSON.stringify(log)); } catch (e) { /* 入りきらないときは画面を閉じるまで */ }
    }
    // いまの記録（サーバーがあればサーバー、無ければこの端末）
    function reflectLog() {
      const r = reflectState();
      return r.server && r.server.ok ? { last: r.server.last || {}, history: r.server.history || [], shared: true } : { last: r.local.last, history: r.local.history, shared: false };
    }
    // 中身の目印（同じ中身なら同じ値）。比べるためだけなので短い数字にする
    function reflectHash(v) {
      const s = JSON.stringify(v);
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(36);
    }
    // 部品ごとに「項目の名前 → 中身の目印」と並び順を作る
    function reflectSnapshot(payload) {
      const out = {};
      REFLECT_PARTS.forEach(function (pt) {
        const key = pt[0];
        let v = payload[key];
        const items = {};
        let order = [];
        if (key === 'cards') { (v || []).forEach(function (c) { items[c.id] = reflectHash(c); }); order = payload.manifest || []; }
        else if (key === 'uploads') { (v || []).forEach(function (u) { items[u.path] = reflectHash([u.width, u.height, (u.dataUrl || '').length, (u.dataUrl || '').slice(-64)]); }); }
        else if (key === 'businessDays') { v = v || {}; (v.holidays || []).forEach(function (d) { items[d] = '休'; }); (v.halfDays || []).forEach(function (d) { items[d] = '午前'; }); }
        else if (Array.isArray(v)) { v.forEach(function (x, i) { const k = x && (x.id || x.code || x.path || x.k) || String(i); items[k] = reflectHash(x); order.push(k); }); }
        else if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { items[k] = reflectHash(v[k]); }); }
        out[key] = { items: items, order: reflectHash(order) };
      });
      return out;
    }
    function reflectDiff(now, before) {
      return REFLECT_PARTS.map(function (pt) {
        const a = now[pt[0]] || { items: {} }, b = before && before[pt[0]] || { items: {}, order: reflectHash([]) };
        let add = 0, change = 0, remove = 0;
        Object.keys(a.items).forEach(function (k) { if (!(k in b.items)) add += 1; else if (a.items[k] !== b.items[k]) change += 1; });
        Object.keys(b.items).forEach(function (k) { if (!(k in a.items)) remove += 1; });
        const moved = !add && !remove && a.order !== b.order;
        return { part: pt[0], label: pt[1], add: add, change: change, remove: remove, moved: moved, any: !!(add || change || remove || moved) };
      });
    }
    function reflectDiffText(d) {
      const parts = [];
      if (d.add) parts.push(d.part === 'businessDays' ? 'お休み+' + d.add + '日' : '追加' + d.add);
      if (d.change) parts.push('変更' + d.change);
      if (d.remove) parts.push(d.part === 'businessDays' ? 'お休み−' + d.remove + '日' : '削除' + d.remove);
      if (d.moved) parts.push('並び順');
      return parts.join('・');
    }
    function reflectWhen(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return '';
      const p = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    function reflectDestDiff(dest, snap) {
      const log = reflectLog();
      const last = log.last[dest.id];
      return reflectDiff(snap, last && last.snapshot).filter(function (d) { return dest.parts.indexOf(d.part) >= 0 && d.any; });
    }
    function reflectStatus(dest, diffs) {
      const last = reflectLog().last[dest.id];
      if (last && last.failedAt && (!last.at || last.failedAt > last.at)) return { cls: 'is-bad', text: '失敗（' + reflectWhen(last.failedAt) + '）' };
      if (!last || !last.at) return { cls: 'is-wait', text: 'まだ一度も反映していません' };
      if (diffs.length) return { cls: 'is-wait', text: '未反映の変更あり' };
      return { cls: 'is-ok', text: '反映済み（' + reflectWhen(last.at) + (last.by ? '・' + last.by : '') + '）' };
    }
    function reflectCheckServer(force) {
      const r = reflectState();
      if (r.checked && !force) return;
      r.checked = true;
      fetch(REFLECT_API + 'status', { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      }).then(function (json) { r.server = json; }).catch(function () { r.server = { ok: false }; }).then(function () { emit('oms:builder', { form: true }); });
    }
    function reflectServerReady(id) {
      const s = reflectState().server;
      if (!s || !s.ok) return false;
      return id === 'site' ? !!(s.site && s.site.ready) : id === 'welcart' ? !!(s.welcart && s.welcart.ready) : true;
    }
    // 中央: 行き先ごとの「試しに見る」「反映する」
    function builderReflectForm() {
      reflectCheckServer(false);
      const r = reflectState();
      const snap = reflectSnapshot(builderExportPayload());
      const errs = builderAllErrors();
      const server = r.server;
      const conn = !server ? '<p class="muted">反映用のサーバーを確かめています…</p>' : server.ok ? '<p class="reflect-conn is-ok">反映用のサーバーにつながっています。記録はみんなで同じものを見られます。</p>' : '<p class="reflect-conn is-wait">反映用のサーバー（oms-reflect）がまだつながっていません。新サイトは書き出しファイルのダウンロードで代わりにし、記録はこの端末だけに残します。</p>';
      const cards = REFLECT_DESTS.map(function (dest) {
        const diffs = reflectDestDiff(dest, snap);
        const st = reflectStatus(dest, diffs);
        const busy = r.busy === dest.id;
        const res = r.result[dest.id];
        const manual = dest.id === 'rakuten' || dest.id === 'yahoo';
        const ready = manual || reflectServerReady(dest.id) || dest.id === 'site';
        let note = '';
        if (dest.id === 'welcart' && server && server.ok && !reflectServerReady('welcart')) note = '<p class="muted">' + escapeHtml(server.welcart && server.welcart.note || 'Welcartのテスト環境の設定がまだです') + '</p>';
        if (dest.id === 'welcart' && (!server || !server.ok)) note = '<p class="muted">サーバーがつながると押せます。</p>';
        const confirmOn = r.confirm === dest.id;
        const applyLabel = dest.id === 'site' ? (reflectServerReady('site') ? 'GitHubに反映する' : '書き出しファイルを保存') : manual ? 'CSVと一覧をダウンロード' : '反映する';
        return '<li class="reflect-dest"><div class="row"><b>' + escapeHtml(dest.name) + '</b><span class="reflect-st ' + st.cls + '">' + escapeHtml(st.text) + '</span></div>' +
          '<p class="muted">' + escapeHtml(dest.lead) + '</p>' +
          (diffs.length ? '<ul class="reflect-diff">' + diffs.map(function (d) { return '<li>' + escapeHtml(d.label) + '<small>' + escapeHtml(reflectDiffText(d)) + '</small></li>'; }).join('') + '</ul>' : '<p class="muted">前回の反映から変わったところはありません。</p>') + note +
          '<div class="reflect-btns"><button type="button" data-b="reflect-try" data-dest="' + dest.id + '"' + (busy || !ready || (dest.id === 'welcart' && !reflectServerReady('welcart')) ? ' disabled' : '') + '>試しに見る</button>' +
          (confirmOn ? '<span class="reflect-confirm">' + escapeHtml(dest.name) + 'に反映します。よろしいですか？<button type="button" class="go" data-b="reflect-go" data-dest="' + dest.id + '">はい、反映する</button><button type="button" data-b="reflect-cancel">やめる</button></span>'
            : '<button type="button" class="go" data-b="reflect-apply" data-dest="' + dest.id + '"' + (busy || errs.length || !ready || (dest.id === 'welcart' && !reflectServerReady('welcart')) ? ' disabled' : '') + '>' + escapeHtml(applyLabel) + '</button>') +
          (manual && res && res.downloaded ? '<button type="button" data-b="reflect-done" data-dest="' + dest.id + '">各店に入れました（記録する）</button>' : '') +
          '</div>' + (busy ? '<p class="muted">動いています…（新サイトは1分ほどかかります）</p>' : '') + (res ? reflectResultHtml(dest, res) : '') + '</li>';
      }).join('');
      return '<h2>反映</h2><p class="lead">OMSで直したものを、行き先ごとに反映します。まず「試しに見る」で何が変わるかを確かめてから「反映する」を押してください。</p>' + conn +
        (errs.length ? '<p class="reflect-conn is-bad">直すところが ' + errs.length + '件あるので、反映はできません（右の「直すところ」を見てください）。</p>' : '') +
        '<ol class="reflect-dests">' + cards + '</ol><button type="button" data-b="reflect-refresh">つながりと記録を読み直す</button>';
    }
    // プラグインは days.changes を {date, from, to} の配列で返す。文字列としてつなぐと [object Object] になる
    function reflectDaysText(days) {
      if (!days) return '';
      if (typeof days === 'string') return days;
      const changes = days.changes || [];
      if (!changes.length) return '入れました';
      const dates = changes.map(function (c) {
        if (typeof c === 'string') return c.replace(/-/g, '/');
        const d = String((c && c.date) || '').replace(/-/g, '/');
        return d;
      }).filter(Boolean);
      const n = dates.length || changes.length;
      const shown = dates.slice(0, 8);
      const more = dates.length > shown.length ? ' ほか' + (dates.length - shown.length) + '日' : '';
      return 'お休み ' + n + '日（' + shown.join('・') + more + '）';
    }
    function reflectResultHtml(dest, res) {
      if (res.error) return '<div class="reflect-res is-bad"><b>うまくいきませんでした</b><p>' + escapeHtml(res.error) + '</p></div>';
      if (dest.id === 'site') {
        if (res.local) return '<div class="reflect-res"><p>' + escapeHtml(res.local) + '</p></div>';
        const rep = res.report || { applied: [], later: [], errors: [] };
        return '<div class="reflect-res' + (rep.errors.length ? ' is-bad' : '') + '"><b>' + (res.pr ? 'プルリクエストを作りました' : res.nothing ? 'サイトで変わるファイルはありませんでした' : res.dry ? '試しに見た結果（まだ何も変えていません）' : '') + '</b>' +
          (res.pr ? '<p><a href="' + escapeHtml(res.pr.url) + '" target="_blank" rel="noopener">プルリクエスト #' + escapeHtml(String(res.pr.number)) + ' を開く</a>（確かめてマージすると見本サイトに出ます）</p>' : '') +
          (rep.applied.length ? '<p>入れるもの: ' + rep.applied.map(function (x) { return escapeHtml(x.label) + (x.files.length ? '（' + x.files.length + 'ファイル）' : '（変更なし）'); }).join('、') + '</p>' : '') +
          (res.files && res.files.length && !res.pr ? '<details><summary>変わるファイル ' + res.files.length + '件</summary><ul>' + res.files.slice(0, 40).map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul></details>' : '') +
          (rep.later.length ? '<p class="muted">まだサイトに入れない部品: ' + rep.later.map(function (x) { return escapeHtml(x.label) + ' ' + x.count + '件'; }).join('、') + '（サイト側の受け口ができたら入ります）</p>' : '') +
          (rep.errors.length ? '<p>入れられなかった部品（元のまま）: ' + rep.errors.map(function (x) { return escapeHtml(x.label + ': ' + x.error); }).join('、') + '</p>' : '') + '</div>';
      }
      if (dest.id === 'welcart') {
        const items = (res.items || []).concat(res.stock || []);
        return '<div class="reflect-res' + (res.ok === false ? ' is-bad' : '') + '"><b>' + (res.dry ? '試しに見た結果（まだ何も変えていません）' : 'テスト環境に入れました') + '</b>' + (res.error ? '<p>' + escapeHtml(res.error) + '</p>' : '') +
          (items.length ? '<ul>' + items.slice(0, 30).map(function (x) { return '<li>' + escapeHtml((x.code || '') + ' ' + (x.title || '') + ' … ' + (x.action || '') + (x.changes && x.changes.length ? '（' + x.changes.slice(0, 3).join('・') + '）' : '')) + '</li>'; }).join('') + '</ul>' : '<p class="muted">商品・在庫の変更はありません。</p>') +
          (res.days ? '<p>営業日: ' + escapeHtml(reflectDaysText(res.days)) + '</p>' : '') + '</div>';
      }
      return '<div class="reflect-res"><b>' + (res.downloaded ? 'ダウンロードしました' : '入れるもの') + '</b><p>' + escapeHtml(res.text || '') + '</p></div>';
    }
    // 右: 変更点のまとめと記録
    function builderReflectPreview() {
      const log = reflectLog();
      const rows = log.history.slice(0, 20).map(function (h) {
        const dest = REFLECT_DESTS.find(function (d) { return d.id === h.dest; });
        return '<li class="' + (h.ok ? '' : 'is-bad') + '"><small>' + escapeHtml(reflectWhen(h.at)) + (h.by ? '・' + escapeHtml(h.by) : '') + '</small><b>' + escapeHtml(dest ? dest.name : h.dest) + ' ' + (h.action === 'apply' ? '反映' : '試し') + (h.ok ? '' : '（失敗）') + '</b>' +
          (h.url ? '<a href="' + escapeHtml(h.url) + '" target="_blank" rel="noopener">' + escapeHtml(h.note || '開く') + '</a>' : '<span>' + escapeHtml(h.note || '') + '</span>') + '</li>';
      }).join('');
      return '<p class="pv-note">反映の記録' + (log.shared ? '' : '（この端末だけ）') + '</p>' + (rows ? '<ul class="reflect-log">' + rows + '</ul>' : '<p class="muted">まだ記録はありません。</p>');
    }
    function reflectPost(name, body) {
      return fetch(REFLECT_API + name, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (res) {
        return res.json().catch(function () { return { ok: false, error: 'サーバーの返事が読めません（' + res.status + '）' }; }).then(function (json) {
          if (!res.ok && !json.error) json.error = 'サーバーの返事 ' + res.status;
          return json;
        });
      });
    }
    function reflectManualText(dest, payload) {
      const n = payload.products.length + payload.edits.length;
      const days = payload.businessDays && payload.businessDays.holidays ? payload.businessDays.holidays.length : 0;
      return (n ? '商品 ' + n + '件のCSV（' + dest.name + '用）' : '商品のCSVはありません') + '・' + (days ? 'お休み ' + days + '日の一覧' : 'お休みの一覧はありません（Welcartの設定のまま）');
    }
    function reflectDownloadText(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }
    function reflectRun(destId, dry) {
      const r = reflectState();
      const dest = REFLECT_DESTS.find(function (d) { return d.id === destId; });
      const payload = builderExportPayload();
      const snapshot = reflectSnapshot(payload);
      r.confirm = '';
      if (destId === 'rakuten' || destId === 'yahoo') {
        const text = reflectManualText(dest, payload);
        if (dry) { r.result[destId] = { text: text }; reflectLocalRecordOrServer({ dest: destId, action: 'try', ok: true, note: text }); emit('oms:builder', { form: true }); return; }
        if (payload.products.length + payload.edits.length) builderChannelExport();
        if (payload.businessDays && payload.businessDays.holidays) reflectDownloadText(destId + '-holidays.txt', payload.businessDays.holidays.map(function (d) { return d.replace(/-/g, '/'); }).join('\n') + '\n');
        r.result[destId] = { text: text + '。各店の管理画面に入れたら「各店に入れました」を押してください。', downloaded: true, snapshot: snapshot };
        emit('oms:builder', { form: true });
        return;
      }
      if (destId === 'site' && !reflectServerReady('site')) {
        if (dry) { r.result.site = { local: '反映用のサーバーがつながると、変わるファイルの一覧が出ます。' }; emit('oms:builder', { form: true }); return; }
        downloadJson('site-builder-draft.json', payload);
        r.result.site = { local: 'site-builder-draft.json を保存しました。担当者がサイトに入れます（サーバーがつながると、このボタンでGitHubに直接プルリクエストを作れます）。' };
        emit('oms:builder', { form: true });
        return;
      }
      r.busy = destId;
      r.result[destId] = null;
      emit('oms:builder', { form: true });
      reflectPost(destId, { draft: payload, dry_run: dry, snapshot: snapshot }).then(function (json) {
        r.result[destId] = json.ok === false && json.error ? { error: json.error } : json;
      }).catch(function () {
        r.result[destId] = { error: '反映用のサーバーにつながりませんでした。少し待ってからもう一度押してください。' };
      }).then(function () {
        r.busy = '';
        r.checked = false;
        reflectCheckServer(true);
        if (!dry && r.result[destId] && !r.result[destId].error) showToast(dest.name + 'に反映しました。');
      });
    }
    function reflectLocalRecordOrServer(row, snapshot) {
      if (reflectState().server && reflectState().server.ok) {
        reflectPost('log', Object.assign({ snapshot: snapshot }, row)).then(function () { reflectCheckServer(true); }).catch(function () { reflectLocalRecord(row, snapshot); });
      } else reflectLocalRecord(row, snapshot);
    }
    function builderReflectAction(name, el) {
      if (name.indexOf('reflect-') !== 0) return false;
      const r = reflectState();
      const dest = el && el.dataset.dest;
      if (name === 'reflect-refresh') { r.checked = false; reflectCheckServer(true); return true; }
      if (name === 'reflect-try') { reflectRun(dest, true); return true; }
      if (name === 'reflect-apply') {
        if (builderAllErrors().length) { showToast('直すところが残っているので反映できません。'); return true; }
        if (dest === 'rakuten' || dest === 'yahoo' || (dest === 'site' && !reflectServerReady('site'))) { reflectRun(dest, false); return true; }
        r.confirm = dest; emit('oms:builder', { form: true }); return true;
      }
      if (name === 'reflect-cancel') { r.confirm = ''; emit('oms:builder', { form: true }); return true; }
      if (name === 'reflect-go') { reflectRun(dest, false); return true; }
      if (name === 'reflect-done') {
        const res = r.result[dest];
        reflectLocalRecordOrServer({ dest: dest, action: 'apply', ok: true, note: res && res.text ? res.text.split('。')[0] : '手で入れた' }, res && res.snapshot);
        r.result[dest] = null;
        showToast('記録しました。');
        emit('oms:builder', { form: true });
        return true;
      }
      return false;
    }
    // 左の一覧に出す一言（未反映の行き先の数）
    function builderReflectSub() {
      const snap = reflectSnapshot(builderExportPayload());
      const n = REFLECT_DESTS.filter(function (d) { return reflectDestDiff(d, snap).length; }).length;
      return n ? '未反映 ' + n + 'か所' : 'すべて反映済み';
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { reflectSnapshot: reflectSnapshot, reflectDiff: reflectDiff, reflectHash: reflectHash, reflectDaysText: reflectDaysText };
