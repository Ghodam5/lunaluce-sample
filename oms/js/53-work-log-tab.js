// Luna Luce OMS 部品JS: 53-work-log-tab（「9 作業ログ」タブ: 誰が・いつ・どの注文の・どの工程を・どう変えたかを探す）
// 探せるもの: フリーワード・注文番号・お客様・新郎新婦・商品・SKU・作業した人・工程・日付（から／まで）。どれもあいまい検索（js/51-fuzzy と同じ決まり。探すのはサーバー）。
// 記録は書き足すだけで、直したり消したりはできない。文字だけで5年残す（ops/vps/oms-app/work.js）。
    state.worklog = { f: { q: '', order: '', customer: '', couple: '', product: '', sku: '', user: '', step: '', from: '', to: '' }, result: null, busy: false, error: '' };
    const WORKLOG_FIELDS = [
      { k: 'q', label: 'フリーワード', ph: 'コメント・工程・人・商品…（空白で区切ると全部ふくむもの）', wide: true },
      { k: 'order', label: '注文番号', ph: '一部だけでも可' },
      { k: 'customer', label: 'お客様', ph: '注文した人の名前' },
      { k: 'couple', label: '新郎新婦', ph: 'Takuya など' },
      { k: 'product', label: '商品', ph: 'リングピロー など' },
      { k: 'sku', label: 'SKU', ph: 'LL-RP など' },
      { k: 'user', label: '作業した人', ph: '名前かログイン名' }
    ];
    function renderWorkLogTab(host) {
      function paint() {
        const w = state.worklog, f = w.f;
        if (!workServerOn()) { host.innerHTML = '<section class="wk-tab"><h2>作業ログ</h2><p class="sub">作業ログはVPSのOMS（https://oms.srv2050136.hstgr.cloud/oms/）で開いたときだけ使えます。</p></section>'; return; }
        const stepOpts = '<option value="">工程：全部</option>' + WORK_STEPS.map(function (s) { return '<option value="' + s.id + '"' + (f.step === s.id ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>'; }).join('');
        const fields = WORKLOG_FIELDS.map(function (x) {
          return '<label class="' + (x.wide ? 'is-wide' : '') + '"><span>' + x.label + '</span><input type="search" data-wl="' + x.k + '" value="' + escapeHtml(f[x.k]) + '" placeholder="' + escapeHtml(x.ph) + '" autocomplete="off"></label>';
        }).join('');
        const r = w.result;
        const list = w.error ? '<p class="wk-ng">' + escapeHtml(w.error) + '</p>'
          : !r ? '<p class="sub">条件を入れて「探す」を押してください（何も入れずに押すと新しい順に200件）</p>'
          : '<p class="wk-count">' + r.entries.length + '件' + (r.more ? '（多いので新しい順に' + r.entries.length + '件まで。条件を足して絞ってください）' : '') + '</p>' + workLogTable(r.entries, true);
        host.innerHTML = '<section class="wk-tab"><h2>作業ログを探す</h2><p class="sub">スマホの作業画面で押した工程・コメントと、統合受注で変えた工程の段階が残ります。全角半角・カタカナひらがな・記号の違いや1文字の打ち間違いは気にせず探せます。</p>' +
          '<form class="wk-form" data-wl="form">' + fields +
          '<label><span>工程</span><select data-wl="step">' + stepOpts + '</select></label>' +
          '<label><span>日付（から）</span><input type="date" data-wl="from" value="' + escapeHtml(f.from) + '"></label>' +
          '<label><span>日付（まで）</span><input type="date" data-wl="to" value="' + escapeHtml(f.to) + '"></label>' +
          '<div class="wk-btns"><button type="submit" class="wk-go"' + (w.busy ? ' disabled' : '') + '>' + (w.busy ? '探しています…' : '探す') + '</button><button type="button" data-wl="clear">条件を消す</button></div></form>' +
          '<div class="wk-result">' + list + '</div></section>';
        host.querySelector('[data-wl="form"]').addEventListener('submit', function (e) { e.preventDefault(); workLogSearch(); });
        host.querySelector('[data-wl="clear"]').addEventListener('click', function () { Object.keys(f).forEach(function (k) { f[k] = ''; }); w.result = null; w.error = ''; paint(); });
        host.querySelectorAll('input[data-wl], select[data-wl]').forEach(function (el) {
          el.addEventListener('input', function () { f[el.dataset.wl] = el.value; });
          el.addEventListener('change', function () { f[el.dataset.wl] = el.value; });
        });
      }
      function workLogSearch() {
        const w = state.worklog;
        const qs = Object.keys(w.f).filter(function (k) { return String(w.f[k]).trim(); }).map(function (k) { return k + '=' + encodeURIComponent(String(w.f[k]).trim()); }).join('&');
        w.busy = true; w.error = ''; paint();
        workApi('GET', '/log' + (qs ? '?' + qs : '')).then(function (r) { w.result = r; }, function (e) { w.error = '探せませんでした: ' + e.message; })
          .then(function () { w.busy = false; paint(); });
      }
      paint();
      on('oms:worklog', function () { if (!state.worklog.result && workServerOn()) workLogSearch(); else paint(); });
    }
