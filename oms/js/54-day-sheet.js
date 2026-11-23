// Luna Luce OMS 部品JS: 54-day-sheet（統合受注の「日付で作業QR表」。日付を1日選んで、その日の作業を1枚の表にして PDF保存・印刷する）
// 表の1行 = 1注文: スマホ作業用のQRコード・注文番号・商品・数・名入れ・納期/挙式日・工程・特急/注意。住所・電話・メールは載せない。
// 表を出す前に、載せる注文の作業カードをサーバーへ送る（QRを写したらすぐ作業画面が開くように。js/52-work-log）。
    const DAY_SHEET_BASES = [
      { id: 'due', label: '納期（お届け日）', get: function (o) { return dueInfo(o).label; } },
      { id: 'wedding', label: '挙式日', get: function (o) { return o.weddingDate ? String(o.weddingDate).slice(0, 10) : ''; } },
      { id: 'ordered', label: '受付日', get: function (o) { return o.orderDate ? String(o.orderDate).slice(0, 10) : ''; } }
    ];
    state.daySheet = { date: TODAY, base: 'due', shipped: false };

    function daySheetOrders() {
      const d = state.daySheet;
      const base = DAY_SHEET_BASES.filter(function (b) { return b.id === d.base; })[0] || DAY_SHEET_BASES[0];
      return state.orders.filter(function (o) {
        if (!d.shipped && o.status === '梱包・出荷済') return false;
        return base.get(o) === d.date;
      }).sort(function (a, b) { return (b.rushTicket ? 1 : 0) - (a.rushTicket ? 1 : 0) || String(a.id).localeCompare(String(b.id)); });
    }
    // 初めて開いたとき: 納期のある注文があれば、いちばん近い納期の日。無ければ挙式日でいちばん近い日を選んでおく
    function daySheetDefault() {
      const d = state.daySheet;
      if (d.touched) return;
      ['due', 'wedding'].some(function (id) {
        const base = DAY_SHEET_BASES.filter(function (b) { return b.id === id; })[0];
        const days = state.orders.filter(function (o) { return o.status !== '梱包・出荷済'; }).map(base.get).filter(Boolean).sort();
        const next = days.filter(function (x) { return x >= TODAY; })[0] || days[0];
        if (next) { d.base = id; d.date = next; return true; }
        return false;
      });
    }
    function openDaySheet() {
      daySheetDefault();
      let host = document.getElementById('ds-modal');
      if (!host) { host = document.createElement('div'); host.id = 'ds-modal'; host.className = 'wk-modal'; document.body.appendChild(host); }
      host.hidden = false;
      function paint() {
        const d = state.daySheet, list = daySheetOrders();
        host.innerHTML = '<div class="wk-sheet ds-sheet" role="dialog" aria-modal="true" aria-labelledby="ds-t"><h3 id="ds-t">日付で作業QR表</h3>' +
          '<p class="wk-lead">選んだ日の作業を1枚の表にします。注文ごとのQRコードをiPhone・Androidのカメラで写すと、その注文のスマホ作業画面が開きます（住所・電話・メールは載せません）。</p>' +
          '<div class="ds-form"><label><span>日付</span><input type="date" data-ds="date" value="' + escapeHtml(d.date) + '"></label>' +
          '<label><span>どの日付で</span><select data-ds="base">' + DAY_SHEET_BASES.map(function (b) { return '<option value="' + b.id + '"' + (b.id === d.base ? ' selected' : '') + '>' + b.label + '</option>'; }).join('') + '</select></label>' +
          '<label class="ds-check"><input type="checkbox" data-ds="shipped"' + (d.shipped ? ' checked' : '') + '> 出荷済みも入れる</label></div>' +
          '<p class="ds-count">' + (list.length ? list.length + '件の注文が載ります' : 'この日の注文はありません') + '</p>' +
          (list.length ? '<ul class="ds-pre">' + list.slice(0, 8).map(function (o) { return '<li>' + (o.rushTicket ? '<b>特急</b> ' : '') + escapeHtml(o.id) + '　' + escapeHtml(o.productName) + '</li>'; }).join('') + (list.length > 8 ? '<li>ほか' + (list.length - 8) + '件</li>' : '') + '</ul>' : '') +
          '<div class="ds-btns"><button type="button" class="wo-btn" data-ds="pdf"' + (list.length ? '' : ' disabled') + '>PDF保存</button><button type="button" class="wo-btn" data-ds="print"' + (list.length ? '' : ' disabled') + '>PDF印刷</button></div>' +
          '<p class="wk-state" role="status"></p><button type="button" class="wk-close" data-ds="close">閉じる</button></div>';
        host.querySelector('[data-ds="date"]').addEventListener('change', function (e) { d.date = e.target.value; d.touched = true; paint(); });
        host.querySelector('[data-ds="base"]').addEventListener('change', function (e) { d.base = e.target.value; d.touched = true; paint(); });
        host.querySelector('[data-ds="shipped"]').addEventListener('change', function (e) { d.shipped = e.target.checked; paint(); });
        host.querySelector('[data-ds="close"]').addEventListener('click', function () { host.hidden = true; });
        host.querySelectorAll('[data-ds="pdf"], [data-ds="print"]').forEach(function (b) {
          b.addEventListener('click', function () { printDaySheet(list, b.dataset.ds === 'pdf', host.querySelector('.wk-state')); });
        });
      }
      host.onclick = function (e) { if (e.target === host) host.hidden = true; };
      paint();
    }
    function daySheetHtml(list) {
      const d = state.daySheet;
      const base = DAY_SHEET_BASES.filter(function (b) { return b.id === d.base; })[0];
      const rows = list.map(function (o) {
        const qr = workServerOn() ? workQrSvg(workLink(o.id), 2) : '';
        const counts = partCounts(o);
        const parts = PART_KEYS.map(function (p) { return counts[p.key] ? p.short + counts[p.key] : ''; }).filter(Boolean).join(' ');
        return '<tr class="' + (o.rushTicket ? 'is-rush' : '') + '"><td class="ds-qr">' + (qr || '—') + '</td>' +
          '<td><b>' + escapeHtml(o.id) + '</b><small>' + escapeHtml(o.channelLabel || '') + '</small>' + (o.rushTicket ? '<em>特急</em>' : '') + '</td>' +
          '<td>' + escapeHtml(o.productName) + '<small>' + escapeHtml(o.sku || '') + '　×' + escapeHtml(o.qty) + (parts ? '　' + escapeHtml(parts) : '') + '</small></td>' +
          '<td>' + escapeHtml(o.coupleNames || '') + '<small>' + escapeHtml(o.headerMsg || '') + '</small></td>' +
          '<td>納期 ' + escapeHtml(dueInfo(o).label || '—') + '<small>挙式 ' + escapeHtml(o.weddingDate || '—') + '</small></td>' +
          '<td>' + escapeHtml(o.status || '') + (o.warning ? '<small class="ds-warn">注意あり</small>' : '') + '</td>' +
          '<td class="ds-done"></td></tr>';
      }).join('');
      return '<header class="ds-head"><div><p class="ds-title">作業QR表　' + escapeHtml(d.date) + '（' + escapeHtml(base.label) + '）</p><p class="ds-sub">QRコードをスマホのカメラで写すと、その注文の作業画面が開きます。全' + list.length + '件</p></div><div class="ds-made">出力 ' + escapeHtml(new Date().toLocaleString('ja-JP', { hour12: false })) + '</div></header>' +
        '<table class="ds-table"><thead><tr><th>QR</th><th>注文番号</th><th>商品・数・内訳</th><th>名入れ</th><th>日付</th><th>工程</th><th>済</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    function printDaySheet(list, pdf, status) {
      if (!list.length) return;
      const ready = workServerOn() ? Promise.all(list.map(function (o) { return sendWorkCard(o); })) : Promise.resolve();
      if (status) status.textContent = workServerOn() ? 'スマホ用の作業カードを送っています…' : '手元のファイルで開いているので、QRコードは載りません（VPSのOMSで開くと載ります）';
      ready.then(function () {
        if (status) status.textContent = '';
        let host = document.getElementById('day-sheet-print');
        if (!host) { host = document.createElement('div'); host.id = 'day-sheet-print'; document.body.appendChild(host); }
        host.innerHTML = daySheetHtml(list);
        document.documentElement.classList.add('is-printing-day-sheet');
        const done = function () { document.documentElement.classList.remove('is-printing-day-sheet'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        if (pdf) showToast('印刷の画面が開いたら、送り先（プリンター）で「PDFに保存」を選んでください');
        window.print();
      }, function (e) { if (status) { status.textContent = '作業カードを送れませんでした: ' + e.message; status.classList.add('is-ng'); } });
    }
