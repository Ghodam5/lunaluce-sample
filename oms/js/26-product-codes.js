// Luna Luce OMS 部品JS: 26-product-codes（商品コードの法則と重複チェック）
// 法則: ll-<中カテゴリーの名前>-<3けたの番号>（例: ll-doll-003）。英小文字・数字・ハイフンだけ、32文字まで（楽天の商品管理番号の決まりに合わせる）。
// 照合先: 新サイト・本店（Welcart）・楽天は builder-codes.json（tools/oms-builder-data.cjs が作る）。
// Yahoo（と最新の楽天）は、各店の管理画面から落とした商品CSVをこの画面で読み込んで足す（このブラウザに保存）。
    const CODE_PREFIX = 'll';
    const CODE_STORE_KEY = 'luna-oms-channel-codes-v1';
    const CODE_CHANNELS = { s: '新サイト', w: '本店（Welcart）', r: '楽天', y: 'Yahoo', d: 'この下書きの別の商品' };
    function builderLoadCodes() {
      const b = state.builder;
      if (b.codes || b.codesLoading) return;
      b.codesLoading = true;
      try { b.extraCodes = JSON.parse(localStorage.getItem(CODE_STORE_KEY) || '{}'); } catch (e) { b.extraCodes = {}; }
      fetch('builder-codes.json').then(function (res) {
        if (!res.ok) throw new Error('builder-codes.json を読めません');
        return res.json();
      }).then(function (data) {
        b.codes = data;
        b.codesLoading = false;
        emit('oms:builder', { form: true });
      }).catch(function (err) {
        b.codesLoading = false;
        b.codesError = err.message;
        emit('oms:builder', { form: true });
      });
    }
    function codeKey(code) { return String(code || '').trim().toLowerCase(); }
    function codeLoose(code) { return codeKey(code).replace(/[^a-z0-9]/g, ''); }
    // そのコードを使っているところ（文字の並び: s w r y d）
    function builderCodeUsers(code, self) {
      const b = state.builder;
      const k = codeKey(code);
      let out = (b.codes && b.codes.codes[k]) || '';
      Object.keys(b.extraCodes || {}).forEach(function (ch) {
        const list = b.extraCodes[ch].codes || [];
        if (list.indexOf(k) >= 0 && out.indexOf(ch) < 0) out += ch;
      });
      if (b.newProducts.some(function (p) { return p !== self && builderProductCodes(p).indexOf(k) >= 0; })) out += 'd';
      return out;
    }
    // その商品が使うコード（商品コードと、種類ごとのコード）
    function builderProductCodes(p) {
      const k = codeKey(p.code);
      if (!k) return [];
      const list = [k];
      if (p.skus && p.skus.length > 1) p.skus.forEach(function (s, i) { list.push(codeKey(s.code && p.edit && p.code === p.orig.code ? s.code : p.code + '-' + (i + 1))); });
      return list;
    }
    function builderCodeChannels(users) {
      return users.split('').map(function (ch) { return CODE_CHANNELS[ch] || ch; }).join('・');
    }
    // 判定: { level: 'ok' | 'warn' | 'error' | 'wait', msg }
    function builderCodeCheck(p) {
      const b = state.builder;
      builderLoadCodes();
      const code = String(p.code || '').trim();
      if (p.edit && p.orig && codeKey(code) === codeKey(p.orig.code)) return { level: 'ok', msg: '元の商品コードのままです（楽天・Yahooとの照合も元のまま）。' };
      if (!code) return { level: 'error', msg: '商品コードを入れてください。カテゴリーを選ぶと候補が出ます。' };
      if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(code)) return { level: 'error', msg: '商品コードは英小文字・数字・ハイフン（-）だけで、2〜32文字にしてください（楽天の決まりに合わせています）。' };
      if (!b.codes) return { level: b.codesError ? 'error' : 'wait', msg: b.codesError ? '照合用の台帳を読めません: ' + b.codesError : '使われているコードを確かめています…' };
      const hits = [];
      builderProductCodes(p).forEach(function (k) { const u = builderCodeUsers(k, p); if (u) hits.push(k + '（' + builderCodeChannels(u) + '）'); });
      if (hits.length) return { level: 'error', msg: 'もう使われているコードです: ' + hits.join('、') + '。別のコードにしてください。' };
      const loose = codeLoose(code);
      const near = Object.keys(b.codes.codes).filter(function (k) { return codeLoose(k) === loose; }).slice(0, 3);
      if (near.length) return { level: 'warn', msg: '使えますが、記号だけ違うよく似たコードがあります: ' + near.join('、') + '。取り違えに注意してください。' };
      return { level: 'ok', msg: '使えます（新サイト・本店・楽天' + (b.extraCodes && b.extraCodes.y ? '・Yahoo' : '') + 'のどれとも重なりません）。' };
    }
    // 法則に沿った候補: ll-<中カテゴリー（なければ大カテゴリー）>-<空いている一番小さい3けたの番号>
    function builderCodeSuggest(p) {
      const pl = (p.places || []).filter(function (x) { return x.g; })[0];
      if (!pl || !state.builder.codes) return '';
      const key = (pl.m || pl.g).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
      for (let n = 1; n < 1000; n += 1) {
        const code = CODE_PREFIX + '-' + key + '-' + String(n).padStart(3, '0');
        const probe = { code: code, skus: p.skus };
        if (!builderProductCodes(probe).some(function (k) { return builderCodeUsers(k, p); })) return code;
      }
      return '';
    }
    // カテゴリーを選んだとき、コードが空（か前の候補のまま）なら候補を入れる
    function builderCodeAuto(p) {
      if (p.edit || (p.code && p.code !== p.codeAuto)) return;
      const s = builderCodeSuggest(p);
      if (s) { p.code = s; p.codeAuto = s; }
    }
    function builderCodeSources() {
      const b = state.builder;
      if (!b.codes) return '';
      const src = b.codes.sources || {};
      const parts = Object.keys(src).map(function (ch) { return src[ch].name + ' ' + src[ch].count + '件' + (src[ch].asOf ? '（' + src[ch].asOf.slice(5).replace('-', '/') + '時点）' : ''); });
      const y = (b.extraCodes || {}).y;
      parts.push(y ? 'Yahoo ' + y.count + '件（' + y.at.slice(5, 10).replace('-', '/') + '読み込み）' : 'Yahoo まだ読み込んでいません');
      const r = (b.extraCodes || {}).r;
      if (r) parts.push('楽天CSV ' + r.count + '件（' + r.at.slice(5, 10).replace('-', '/') + '読み込み）');
      return parts.join('・');
    }
    // 商品コード欄（候補・判定・照合先・CSVの読み込み）
    function builderCodeBlock(p) {
      const sug = p.edit ? '' : builderCodeSuggest(p);
      if (sug && !p.code) { p.code = sug; p.codeAuto = sug; }
      const check = builderCodeCheck(p);
      return '<div class="code-block"><label class="fld"><span>商品コード</span><input type="text" data-f="code" maxlength="32" value="' + escapeHtml(p.code || '') + '" placeholder="例: ll-doll-001" autocapitalize="off" spellcheck="false"></label>' +
        (sug && sug !== p.code ? '<p class="code-sug">法則の候補: <b>' + escapeHtml(sug) + '</b> <button type="button" data-b="code-suggest" data-code="' + escapeHtml(sug) + '">この候補を使う</button></p>' : '') +
        '<p class="code-check is-' + check.level + '" data-codecheck role="status">' + escapeHtml(check.msg) + '</p>' +
        (p.edit ? '<small class="muted">商品コードを変えると、楽天・Yahooの商品と照合できなくなります。ふつうは変えません。</small>' : '<small class="muted">法則: ll-（中カテゴリー）-（番号）。自分で入れてもよく、どこかで使われているコードは登録できません。</small>') +
        '<details class="code-src"><summary>照合先: ' + escapeHtml(builderCodeSources() || '読み込み中') + '</summary>' +
        '<p class="muted">Yahoo（と最新の楽天）の商品CSVを読み込むと、そのコードとも照合します。ストアクリエイターProの商品データ（data.csv）や、RMSの商品CSVをそのまま選んでください。</p>' +
        '<label class="import"><input type="file" accept=".csv,text/csv" data-codes-import="y"><span>Yahooの商品CSVを読み込む</span></label> ' +
        '<label class="import"><input type="file" accept=".csv,text/csv" data-codes-import="r"><span>楽天の商品CSVを読み込む</span></label></details></div>';
    }
    // CSV（Shift_JIS か UTF-8）から商品コードの列だけを拾う
    const CODE_COLUMNS = ['code', 'sub-code', '商品管理番号（商品URL）', '商品管理番号(商品URL)', '商品番号', 'SKU管理番号', 'システム連携用SKU番号', '商品コード'];
    function codeCsvParse(text) {
      const rows = [];
      let row = [], cell = '', q = false;
      for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (q) {
          if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') q = false; else cell += c;
        } else if (c === '"') q = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
        else cell += c;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      return rows;
    }
    function codeCsvCodes(text) {
      const rows = codeCsvParse(text.replace(/^﻿/, ''));
      const head = (rows[0] || []).map(function (h) { return h.trim(); });
      const cols = head.map(function (h, i) { return CODE_COLUMNS.indexOf(h) >= 0 ? i : -1; }).filter(function (i) { return i >= 0; });
      const sub = head.indexOf('sub-code');
      const set = new Set();
      rows.slice(1).forEach(function (r) {
        cols.forEach(function (i) {
          const v = r[i] || '';
          if (i === sub) v.split('&').forEach(function (x) { const m = x.split('='); if (m[1]) set.add(codeKey(m[1])); });
          else if (v.trim()) set.add(codeKey(v));
        });
      });
      set.delete('');
      set.delete('normal-inventory');
      return { columns: cols.map(function (i) { return head[i]; }), codes: Array.from(set).sort() };
    }
    function builderImportCodes(el) {
      const b = state.builder;
      const file = el.files && el.files[0];
      const ch = el.dataset.codesImport;
      el.value = '';
      if (!file) return;
      file.arrayBuffer().then(function (buf) {
        const bytes = new Uint8Array(buf);
        let text;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { text = new TextDecoder('shift_jis').decode(bytes); }
        const res = codeCsvCodes(text);
        if (!res.codes.length) { showToast('商品コードの列（code・商品管理番号・商品番号など）が見つかりませんでした。各店から落とした商品CSVを選んでください。'); return; }
        b.extraCodes = b.extraCodes || {};
        b.extraCodes[ch] = { at: new Date().toISOString(), count: res.codes.length, file: file.name, codes: res.codes };
        try { localStorage.setItem(CODE_STORE_KEY, JSON.stringify(b.extraCodes)); } catch (e) { showToast('このブラウザに保存しきれませんでした。画面を開いている間だけ照合します。'); }
        builderChanged(true);
        showToast(CODE_CHANNELS[ch] + 'の商品コード ' + res.codes.length + '件を読み込みました（列: ' + res.columns.join('・') + '）。');
      }).catch(function (err) { showToast('読み込めませんでした: ' + err.message); });
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { codeCsvCodes: codeCsvCodes, codeCsvParse: codeCsvParse };
