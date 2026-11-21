// Luna Luce OMS 部品JS: 36-carrier-rates（ヤマトの契約送料・ネコポスの金額を画面で直す）
// 2.28 で追加。「5 契約送料」の表の数字を「料金を直す」で変えられる。電話などのお問い合わせで、当店の送料がいくらかかるかを見るためのもの。
// お客様が払う送料（サイト・Welcart の送料設定）には使わない。直した料金は、データベースにつながるまではこの端末（ブラウザ）に保存する。
    const CARRIER_KEY = 'luna-oms-carrier-v1';
    const CARRIER_DEFAULT = { rates: YAMATO_CONTRACT.map(function (r) { return r.rates.slice(); }), nekopos: NEKOPOS_CONTRACT };
    function carrierSaved() {
      try {
        const v = JSON.parse(localStorage.getItem(CARRIER_KEY) || 'null');
        if (v && Array.isArray(v.rates) && v.rates.length === YAMATO_CONTRACT.length && v.rates.every(function (r) { return Array.isArray(r) && r.length === YAMATO_SIZES.length && r.every(carrierOk); }) && carrierOk(v.nekopos)) return v;
      } catch (e) { /* 読めないときは最初の料金 */ }
      return null;
    }
    function carrierOk(n) { return Number.isInteger(n) && n > 0 && n < 100000; }
    // 保存した料金を表に当てる（読み込み時・保存時・最初に戻したとき）
    function carrierApply() {
      const v = carrierSaved() || CARRIER_DEFAULT;
      YAMATO_CONTRACT.forEach(function (row, i) { row.rates = v.rates[i].slice(); });
      state.nekopos = v.nekopos;
      state.carrierInfo = carrierSaved() ? { from: carrierSaved().from || '', at: carrierSaved().at || '' } : null;
    }
    function nekoposContract() { return state.nekopos || NEKOPOS_CONTRACT; }
    function carrierStartEdit() {
      state.carrierEdit = { rates: YAMATO_CONTRACT.map(function (r) { return r.rates.map(String); }), nekopos: String(nekoposContract()), from: (state.carrierInfo && state.carrierInfo.from) || '', error: '' };
      emit('oms:carrier');
    }
    function carrierInput(el) {
      const d = state.carrierEdit;
      if (!d) return;
      if (el.dataset.action === 'carrier-rate') d.rates[Number(el.dataset.row)][Number(el.dataset.col)] = el.value;
      if (el.dataset.action === 'carrier-neko') d.nekopos = el.value;
      if (el.dataset.action === 'carrier-from') d.from = el.value;
    }
    function carrierSave() {
      const d = state.carrierEdit;
      if (!d) return;
      const num = function (s) { const t = String(s).replace(/[,，円\s]/g, '').replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); return /^\d+$/.test(t) ? Number(t) : NaN; };
      const rates = d.rates.map(function (r) { return r.map(num); });
      const neko = num(d.nekopos);
      const bad = [];
      rates.forEach(function (r, i) { r.forEach(function (n, j) { if (!carrierOk(n)) bad.push(YAMATO_CONTRACT[i].zone + '・' + YAMATO_SIZES[j]); }); });
      if (!carrierOk(neko)) bad.push('ネコポス');
      if (bad.length) { d.error = '数字（円）を入れてください: ' + bad.slice(0, 6).join('、') + (bad.length > 6 ? ' ほか' + (bad.length - 6) + 'か所' : ''); emit('oms:carrier'); return; }
      try {
        localStorage.setItem(CARRIER_KEY, JSON.stringify({ rates: rates, nekopos: neko, from: d.from || '', at: new Date().toISOString() }));
      } catch (e) { d.error = 'この端末に保存できませんでした（ブラウザの保存容量を確かめてください）'; emit('oms:carrier'); return; }
      state.carrierEdit = null;
      carrierApply();
      emit('oms:carrier');
      showToast('契約送料を保存しました。');
    }
    function carrierReset() {
      try { localStorage.removeItem(CARRIER_KEY); } catch (e) { /* 何もしない */ }
      state.carrierEdit = null;
      carrierApply();
      emit('oms:carrier');
      showToast('最初の契約送料に戻しました。');
    }
    // 表（直しているときは数字の入力欄）
    function carrierTable(sizeMode) {
      const d = state.carrierEdit;
      const head = '<tr><th scope="col">区分</th>' + YAMATO_SIZES.map(function (size) { return '<th scope="col">' + size + '</th>'; }).join('') + '</tr>';
      const body = YAMATO_CONTRACT.map(function (item, i) {
        const cells = item.rates.map(function (rate, j) {
          if (d) return '<td><input type="text" inputmode="numeric" class="rate-in" data-action="carrier-rate" data-row="' + i + '" data-col="' + j + '" value="' + escapeHtml(d.rates[i][j]) + '" aria-label="' + escapeHtml(item.zone) + ' サイズ' + YAMATO_SIZES[j] + '"></td>';
          const on = sizeMode && item.zone === state.carrierZone && YAMATO_SIZES[j] === state.carrierSize;
          const changed = rate !== CARRIER_DEFAULT.rates[i][j];
          return '<td class="' + (on ? 'is-on' : '') + (changed ? ' is-changed' : '') + '">' + rate.toLocaleString('ja-JP') + '</td>';
        }).join('');
        return '<tr><th scope="row">' + escapeHtml(item.zone) + '</th>' + cells + '</tr>';
      }).join('');
      return '<table><thead>' + head + '</thead><tbody>' + body + '</tbody><caption>単位は円。サイズ60から200は契約表の列です。商品の箱サイズとは結びつけていません。</caption></table>';
    }
    function carrierEditBar() {
      const d = state.carrierEdit;
      const info = state.carrierInfo;
      if (!d) {
        return '<div class="rate-bar"><button type="button" data-action="carrier-edit">料金を直す</button>' +
          (info ? '<span class="muted">直した料金を使っています' + (info.from ? '（' + escapeHtml(info.from.replace(/-/g, '/')) + 'からの料金）' : '') + '</span><button type="button" data-action="carrier-reset">最初の料金に戻す</button>' : '<span class="muted">ヤマトとの契約が変わったら、ここで数字を直します。</span>') + '</div>';
      }
      return '<div class="rate-bar is-edit"><label>ネコポス（1通）<input type="text" inputmode="numeric" class="rate-in" data-action="carrier-neko" value="' + escapeHtml(d.nekopos) + '">円</label>' +
        '<label>いつからの料金か（任意）<input type="date" data-action="carrier-from" value="' + escapeHtml(d.from) + '"></label>' +
        '<button type="button" class="primary" data-action="carrier-save">保存する</button><button type="button" data-action="carrier-cancel">やめる</button>' +
        (d.error ? '<p class="rate-err">' + escapeHtml(d.error) + '</p>' : '<p class="muted">表の数字を直して「保存する」。この端末に保存します（お客様の送料には使いません）。</p>') + '</div>';
    }
    function carrierAction(name, el) {
      if (name === 'carrier-edit') { carrierStartEdit(); return true; }
      if (name === 'carrier-cancel') { state.carrierEdit = null; emit('oms:carrier'); return true; }
      if (name === 'carrier-save') { carrierSave(); return true; }
      if (name === 'carrier-reset') { carrierReset(); return true; }
      if (name === 'carrier-rate' || name === 'carrier-neko' || name === 'carrier-from') { carrierInput(el); return true; }
      return false;
    }
    document.addEventListener('input', function (event) {
      const el = event.target;
      if (el.dataset && /^carrier-(rate|neko|from)$/.test(el.dataset.action || '')) carrierInput(el);
    });
    carrierApply();
