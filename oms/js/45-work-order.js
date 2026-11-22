// Luna Luce OMS 部品JS: 45-work-order（作業指示書。各部署にファイリングして回す紙。画面をそのまま印刷せず、作業用に組み直す）
// 受注明細の「作業指示書（印刷・PDF保存）」ボタンで、印刷画面を開く。PDFにするときは印刷先で「PDFに保存」を選ぶ。
// 工程のチェック欄は WORK_STEPS だけを直せば変わる。
    const WORK_STEPS = [
      { id: 'pick', label: 'ピッキング', note: '部品・資材をそろえた' },
      { id: 'print', label: '名入れ・印刷', note: 'シール・カード・のしを印刷した' },
      { id: 'laser', label: 'レーザー彫刻', note: '彫刻した', when: function (order) { return printIsLaser(order); } },
      { id: 'make', label: '製造・組立', note: '詰め・組立をした' },
      { id: 'check', label: '検品', note: '名前・日付・数を確かめた' },
      { id: 'pack', label: '梱包', note: 'のし・ラッピング・袋を付けた' },
      { id: 'ship', label: '出荷', note: '送り状を貼って出した' }
    ];
    // 右上のQRコード: iPhoneのカメラで写すと、この注文のスマホ作業画面（work.html）が開く（js/52-work-log）
    function woQr(order) {
      if (!workServerOn()) return '';
      const svg = workQrSvg(workLink(order.id), 3);
      return svg ? '<div class="wo-qr">' + svg + '<span>スマホで作業</span></div>' : '';
    }
    function woBox(label, value, strong) {
      return '<div class="wo-box' + (strong ? ' is-strong' : '') + '"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(value || 'なし') + '</b></div>';
    }
    function workOrderHtml(order) {
      const view = designView(order);
      const counts = partCounts(order);
      const fees = feeNumbers(order);
      const d = state.draft || {};
      const delivery = d.delivery || order.deliveryDate || '';
      const rush = order.rushTicket
        ? '<div class="wo-rush">特急チケット　最優先で作業してください</div>'
        : '<div class="wo-rush is-off">特急チケットなし</div>';
      const head = '<header class="wo-head"><div><p class="wo-title">作業指示書</p><p class="wo-id">' + escapeHtml(order.id) + '　' + escapeHtml(order.channelLabel || '') + '</p></div><div class="wo-made">出力 ' + escapeHtml(new Date().toLocaleString('ja-JP', { hour12: false })) + '</div>' + woQr(order) + '</header>';
      const keys = '<div class="wo-keys">' + woBox('納期（納品日）', delivery, true) + woBox('挙式日', d.wedding || order.weddingDate) + woBox('賞味期限', order.bestBefore, !!order.bestBefore) + woBox('数量', String(order.qty)) + '</div>';
      const product = '<p class="wo-product">' + escapeHtml(order.productName) + '<span>' + escapeHtml(order.sku || '') + '</span></p>';
      const items = '<section class="wo-sec"><h2>ご注文の品</h2><div class="wo-items">' + orderedItems(order).map(function (it) {
        return '<figure><div class="wo-pic">' + (it.src ? '<img src="' + escapeHtml(it.src) + '" alt="">' : '<span>画像なし</span>') + '</div><figcaption><b>' + escapeHtml(it.kind) + '</b>' + escapeHtml(it.label) + '</figcaption></figure>';
      }).join('') + '</div></section>';
      const text = '<section class="wo-sec"><h2>入れる文字</h2><table class="wo-table">' + [
        ['上の一文', d.message || order.headerMsg], ['お名前', draftCouple()], ['日付', dotted(draftWedding())],
        ['のしの上（表書き）', order.noshiUpper], ['のしの下（お名前）', order.noshiName], ['注文ののし・シール欄', order.noshiSeal]
      ].filter(function (r) { return r[1]; }).map(function (r) { return '<tr><th>' + escapeHtml(r[0]) + '</th><td>' + escapeHtml(r[1]) + '</td></tr>'; }).join('') + '</table></section>';
      const parts = '<section class="wo-sec"><h2>部品内訳（ピッキング）</h2><table class="wo-table wo-check">' + PART_KEYS.map(function (part) {
        const per = Number(order.partPer[part.key]) || 0;
        return '<tr><td class="wo-cb"><span></span></td><th>' + escapeHtml(part.label) + '</th><td>' + order.qty + ' × ' + per + ' ＝ <b>' + counts[part.key] + '</b></td></tr>';
      }).join('') + '</table></section>';
      const sizes = ['ミニシール 約35×25mm（角丸）'];
      if (counts.thanksCard > 0) sizes.push('サンクスカード 91×55mm');
      const size = '<section class="wo-sec"><h2>寸法</h2><p>' + escapeHtml(sizes.join('　／　')) + '</p></section>';
      const money = '<section class="wo-sec"><h2>この注文の料金</h2><p>文字数超過 ' + escapeHtml(formatYen(fees.extraTotal)) + '　のし ' + escapeHtml(formatYen(fees.noshi)) + '　ラッピング ' + escapeHtml(formatYen(fees.wrapping)) + '　オプション計 <b>' + escapeHtml(formatYen(fees.extraTotal + fees.noshi + fees.wrapping)) + '</b></p></section>';
      const sheet = '<section class="wo-sec"><h2>受注管理表</h2><table class="wo-table">' + [
        ['販路', order.channelLabel], ['注文者', order.customerName ? order.customerName + ' 様' : ''], ['お届け先', piiText(order.shippingTo)],
        ['受付', order.orderDate], ['校正', order.proofStatus], ['工程', d.status || order.status], ['図柄', view.headline],
        ['キャンペーン印', order.campaignMark ? '「' + order.campaignMark + '」' : ''], ['明細ID', order.line ? order.line.lineId : ''], ['入力原文', order.line ? order.line.sourceText : '']
      ].filter(function (r) { return r[1]; }).map(function (r) { return '<tr><th>' + escapeHtml(r[0]) + '</th><td>' + escapeHtml(r[1]) + '</td></tr>'; }).join('') + '</table></section>';
      const warn = order.warning ? '<div class="wo-warn">注意：' + escapeHtml(order.warning) + '</div>' : '';
      const prints = printPreviewHtml(order, view);
      const printSec = prints ? '<section class="wo-sec wo-prints"><h2>印刷・彫刻のイメージ（画面の見本。製造原稿ではありません）</h2><div data-part="drawer-preview"><div class="pp-list">' + prints + '</div></div></section>' : '';
      const steps = '<section class="wo-sec wo-steps"><h2>工程チェック（終わったら□に✓、担当と日付）</h2>' + WORK_STEPS.filter(function (s) { return !s.when || s.when(order); }).map(function (s) {
        return '<div class="wo-step"><span class="wo-big"></span><div><b>' + escapeHtml(s.label) + '</b><small>' + escapeHtml(s.note) + '</small></div><span class="wo-sign">担当</span><span class="wo-sign">日付</span></div>';
      }).join('') + '</section>';
      return rush + head + keys + warn + product + items + '<div class="wo-two">' + text + parts + '</div>' + '<div class="wo-two">' + size + money + '</div>' + steps + printSec + sheet;
    }
    // 印刷画面を開く。印刷が終わったら作業指示書を片づける
    function printWorkOrder() {
      const order = currentOrder();
      if (!order) return;
      let host = document.getElementById('work-order-print');
      if (!host) { host = document.createElement('div'); host.id = 'work-order-print'; document.body.appendChild(host); }
      host.innerHTML = workOrderHtml(order);
      document.documentElement.classList.add('is-printing-work-order');
      const done = function () { document.documentElement.classList.remove('is-printing-work-order'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      const imgs = Array.prototype.slice.call(host.querySelectorAll('img'));
      Promise.all(imgs.map(function (img) { return img.complete ? null : new Promise(function (r) { img.onload = img.onerror = r; }); })).then(function () { window.print(); });
    }
