// Luna Luce OMS 部品JS: 54-day-sheet（統合受注の「作業QR表（PDF印刷）」。一覧でチェックを入れた注文を1枚の表にして PDF保存・印刷、または画面にQRコードを並べる）
// 表の1行 = 1注文: スマホ作業用のQRコード・注文番号・商品・数・名入れ・納期/挙式日・工程・特急/注意・済の欄。住所・電話・メールは載せない。
// 出す前に、載せる注文の作業カードをサーバーへ送る（QRを写したらすぐ作業画面が開くように。js/52-work-log）。
// 2.54 で「日付で選ぶ」をやめ、チェックした注文が対象になった（林さんの指示）。
// 2.58（林さんの指示）: 「PDF保存」は「PDF印刷」と同じなので消した。「スマホで作業」を足した: チェックした注文をまとめた1つのQRコード（とこのパソコンで開くリンク）を出し、
//   スマホの作業画面でこの表の注文を「前へ・次へ」や一覧から選んで次々に開ける（work.html?o=最初の注文&l=注文番号,注文番号,…）。
    function daySheetOrders() {
      return state.orders.filter(function (o) { return o.selected; })
        .sort(function (a, b) { return (b.rushTicket ? 1 : 0) - (a.rushTicket ? 1 : 0) || dueInfo(a).time - dueInfo(b).time || String(a.id).localeCompare(String(b.id)); });
    }
    function openDaySheet() {
      const list = daySheetOrders();
      if (!list.length) { showToast('一覧でQR表に載せる注文にチェックを入れてください'); return; }
      let host = document.getElementById('ds-modal');
      if (!host) { host = document.createElement('div'); host.id = 'ds-modal'; host.className = 'wk-modal'; document.body.appendChild(host); }
      host.hidden = false;
      host.innerHTML = '<div class="wk-sheet ds-sheet" role="dialog" aria-modal="true" aria-labelledby="ds-t"><h3 id="ds-t">作業QR表（PDF印刷）</h3>' +
        '<p class="wk-lead">チェックした注文を1枚の表にします。注文ごとのQRコードをiPhone・Androidのカメラで写すと、その注文のスマホ作業画面が開きます（住所・電話・メールは載せません）。</p>' +
        '<p class="ds-count">' + list.length + '件の注文が載ります</p>' +
        '<ul class="ds-pre">' + list.slice(0, 8).map(function (o) { return '<li>' + (o.rushTicket ? '<b>特急</b> ' : '') + escapeHtml(o.id) + '　' + escapeHtml(o.productName) + '</li>'; }).join('') + (list.length > 8 ? '<li>ほか' + (list.length - 8) + '件</li>' : '') + '</ul>' +
        '<div class="ds-btns"><button type="button" class="wo-btn" data-ds="print">PDF印刷</button><button type="button" class="wo-btn is-qr" data-ds="phone">スマホで作業</button><button type="button" class="wo-btn is-show" data-ds="show">QRコードを画面に出す</button></div>' +
        '<div class="ds-show"></div><p class="wk-state" role="status"></p><button type="button" class="wk-close" data-ds="close">閉じる</button></div>';
      const status = host.querySelector('.wk-state');
      host.querySelector('[data-ds="close"]').addEventListener('click', function () { host.hidden = true; });
      host.onclick = function (e) { if (e.target === host) host.hidden = true; };
      host.querySelector('[data-ds="print"]').addEventListener('click', function () { printDaySheet(list, status); });
      host.querySelector('[data-ds="phone"]').addEventListener('click', function () {
        const box = host.querySelector('.ds-show');
        if (!workServerOn()) { box.innerHTML = '<p class="sub">手元のファイルで開いているので、スマホの作業画面は使えません（VPSのOMSで開くと使えます）</p>'; return; }
        daySheetReady(list, status).then(function () {
          const link = workListLink(list);
          box.innerHTML = '<div class="ds-phone"><div class="wk-qr">' + workQrSvg(link, 4) + '</div><div><p><b>スマホのカメラでこのQRコードを写してください。</b></p>' +
            '<p class="sub">チェックした' + list.length + '件の注文がまとめて開きます。作業画面の「次の注文へ」や「この表の注文から選ぶ」で、次の注文に直接進めます。</p>' +
            '<p><a class="ds-open-link" href="' + escapeHtml(link) + '" target="_blank" rel="noopener">このパソコンで作業画面を開く</a></p></div></div>';
        }, function () {});
      });
      host.querySelector('[data-ds="show"]').addEventListener('click', function () {
        const box = host.querySelector('.ds-show');
        daySheetReady(list, status).then(function () {
          box.innerHTML = workServerOn() ? '<div class="ds-grid">' + list.map(function (o) {
            return '<figure>' + workQrSvg(workLink(o.id), 4) + '<figcaption><b>' + escapeHtml(o.id) + '</b>' + escapeHtml(o.productName) + '</figcaption></figure>';
          }).join('') + '</div>' : '<p class="sub">手元のファイルで開いているので、QRコードは出せません（VPSのOMSで開くと出ます）</p>';
        });
      });
    }
    // 載せる注文の作業カードを送る
    function daySheetReady(list, status) {
      if (!workServerOn()) return Promise.resolve();
      if (status) { status.textContent = 'スマホ用の作業カードを送っています…'; status.classList.remove('is-ng'); }
      return Promise.all(list.map(function (o) { return piiHidden() ? null : sendWorkCard(o); })).then(function () { if (status) status.textContent = ''; }, function (e) {
        if (status) { status.textContent = '作業カードを送れませんでした: ' + e.message; status.classList.add('is-ng'); }
        throw e;
      });
    }
    function daySheetHtml(list) {
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
      return '<header class="ds-head"><div><p class="ds-title">作業QR表</p><p class="ds-sub">QRコードをスマホのカメラで写すと、その注文の作業画面が開きます。全' + list.length + '件</p></div><div class="ds-made">出力 ' + escapeHtml(new Date().toLocaleString('ja-JP', { hour12: false })) + '</div></header>' +
        '<table class="ds-table"><thead><tr><th>QR</th><th>注文番号</th><th>商品・数・内訳</th><th>名入れ</th><th>日付</th><th>工程</th><th>済</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    // スマホ作業画面で、この表の注文を順に開くリンク（最初の注文を開き、l= に表の注文番号を並べる）
    function workListLink(list) {
      return workLink(list[0].id) + '&l=' + list.map(function (o) { return encodeURIComponent(o.id); }).join(',');
    }
    function printDaySheet(list, status) {
      if (!list.length) return;
      if (!workServerOn() && status) status.textContent = '手元のファイルで開いているので、QRコードは載りません（VPSのOMSで開くと載ります）';
      daySheetReady(list, status).then(function () {
        let host = document.getElementById('day-sheet-print');
        if (!host) { host = document.createElement('div'); host.id = 'day-sheet-print'; document.body.appendChild(host); }
        host.innerHTML = daySheetHtml(list);
        document.documentElement.classList.add('is-printing-day-sheet');
        const done = function () { document.documentElement.classList.remove('is-printing-day-sheet'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        showToast('紙に印刷するか、送り先（プリンター）で「PDFに保存」を選んでください');
        window.print();
      }, function () { /* 状態の欄に出した */ });
    }
