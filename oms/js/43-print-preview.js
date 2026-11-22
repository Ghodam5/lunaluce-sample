// Luna Luce OMS 部品JS: 43-print-preview（受注明細の「印刷イメージ」。ミニシール・熨斗・リボンシール・レーザー彫刻の商品）
// 画面見本だけ。製造原稿ではない。名前・日付は明細の入力欄（state.draft）をそのまま使う。
    const NOSHI_KINDS = [
      // 見本画像 images/opt-nosi-mihon.jpg（700×700）の中の1枚ずつの位置
      { id: 'musubi', label: '結び切り（婚礼）', test: /結び切り|結切/, pos: '8.9% 15.3%' },
      { id: 'cho', label: '蝶結び（一般）', test: /蝶結び/, pos: '91.6% 15.3%' },
      { id: 'heart', label: 'ハートのし', test: /ハート/, pos: '50.6% 81%' }
    ];
    const LASER_TEST = /ウェルカムボード|ウェルカム|証明書|時計|リングピロー|彫刻|レーザー|アクリル|木製|ボード/;
    function printNoshiKind(order) {
      const text = String(order.noshiType || order.noshiSeal || '');
      if (!/熨斗|のし|結び切り|蝶結び|ハート/.test(text)) return null;
      return NOSHI_KINDS.find(function (k) { return k.test.test(text); }) || null;
    }
    function printIsRibbon(order) {
      return /リボンシール/.test(String(order.noshiSeal || ''));
    }
    function printIsLaser(order) {
      return LASER_TEST.test(String(order.productName || '')) || /レーザー/.test(String(order.status || ''));
    }
    function printTexts() {
      const d = state.draft || {};
      return { message: d.message || '', couple: d.couple || '', date: dotted(d.wedding || '') };
    }
    // 印字内容を四角で囲んだ文字の枠
    function printTextBox(t, title) {
      const rows = [['上の一文', t.message], ['お名前', t.couple], ['日付', t.date]].filter(function (r) { return r[1]; });
      return '<div class="pp-text"><p class="pp-text-title">' + escapeHtml(title || 'ご注文の印字内容') + '</p>' +
        (rows.length ? rows.map(function (r) { return '<p class="pp-line"><span>' + escapeHtml(r[0]) + '</span><b>' + escapeHtml(r[1]) + '</b></p>'; }).join('') : '<p class="pp-miss">印字内容が入っていません</p>') + '</div>';
    }
    function printCard(title, body, note) {
      return '<section class="pp-card"><h4>' + escapeHtml(title) + '</h4>' + body + (note ? '<p class="pp-note">' + escapeHtml(note) + '</p>' : '') + '</section>';
    }
    function printMiniSeal(seal, t) {
      // 図柄の画像（見本の名前入り）と、その図柄に入れる印字内容を並べる
      const pic = '<figure class="pp-pic pp-seal"><img src="' + sealSrc(seal.file) + '" alt="' + escapeHtml(seal.label) + '" data-pp-img><figcaption>' + escapeHtml(seal.label) + '</figcaption></figure>';
      return printCard('ミニシール ' + seal.label, '<div class="pp-row">' + pic + printTextBox(t, 'このシールに入れる文字') + '</div>', '図柄の見本の名前・日付のところに、枠の中の文字が入ります。');
    }
    function printNoshi(order, kind, t) {
      const upper = order.noshiUpper || '';
      const name = order.noshiName || t.couple;
      const paper = '<div class="pp-noshi" style="background-position:' + kind.pos + '" role="img" aria-label="' + escapeHtml(kind.label + ' ' + upper + ' ' + name) + '">' +
        '<span class="pp-noshi-up' + (upper ? (upper.length > 3 ? ' is-long' : '') : ' is-empty') + '">' + escapeHtml(upper || '表書きなし') + '</span>' +
        '<span class="pp-noshi-name' + (name ? (/[A-Za-z]/.test(name) ? ' is-latin' : '') : ' is-empty') + '">' + escapeHtml(name || 'お名前なし') + '</span></div>';
      const box = '<div class="pp-text"><p class="pp-text-title">熨斗の内容</p>' +
        [['種類', kind.label], ['注文の文字', order.noshiSeal || ''], ['のしの上（表書き）', upper || '未入力（印刷なし）'], ['のしの下（お名前）', name || '未入力（印刷なし）']].map(function (r) { return '<p class="pp-line"><span>' + escapeHtml(r[0]) + '</span><b>' + escapeHtml(r[1]) + '</b></p>'; }).join('') + '</div>';
      return printCard('熨斗 ' + kind.label, '<div class="pp-row">' + paper + box + '</div>', '熨斗の見本画像に、表書きとお名前を重ねたイメージです。実際は文字の大きさや配置を整えて印刷します。');
    }
    function printRibbon(order, t) {
      // リボンシールの画像はまだ無いので、汎用の形に名前と日付を載せる
      const svg = '<svg class="pp-ribbon" viewBox="0 0 300 220" role="img" aria-label="' + escapeHtml(order.noshiSeal + ' ' + t.couple) + '">' +
        '<rect x="6" y="6" width="288" height="208" rx="18" fill="#fffdf7" stroke="#c9a45c" stroke-width="3"/>' +
        '<rect x="138" y="6" width="24" height="208" fill="#d8b56a"/><rect x="6" y="56" width="288" height="18" fill="#d8b56a"/>' +
        '<path d="M150 65 C120 30 92 36 100 62 C108 86 136 74 150 65 Z M150 65 C180 30 208 36 200 62 C192 86 164 74 150 65 Z" fill="#c9a45c"/><circle cx="150" cy="65" r="8" fill="#b08a3e"/>' +
        '<rect x="40" y="110" width="220" height="86" rx="10" fill="#ffffff" opacity="0.92"/>' +
        '<text x="150" y="146" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="24" fill="#433936">' + escapeHtml(t.couple || 'お名前') + '</text>' +
        '<text x="150" y="178" text-anchor="middle" font-size="15" fill="#9e7b43">' + escapeHtml(t.date || '') + '</text></svg>';
      return printCard(order.noshiSeal, '<div class="pp-row">' + svg + printTextBox(t, 'このシールに入れる文字') + '</div>', 'このリボンシールの画像はまだOMSにありません。汎用の形に文字を載せた仮の見本です。画像をもらえば差し替えます。');
    }
    function printLaser(order, t) {
      const pic = order.productImage
        ? '<figure class="pp-pic"><img src="../' + escapeHtml(order.productImage) + '" alt="' + escapeHtml(order.productName) + '" data-pp-img><figcaption>' + escapeHtml(order.sku || '') + '</figcaption></figure>'
        : '<figure class="pp-pic is-empty"><p class="pp-miss">商品画像なし</p><figcaption>' + escapeHtml(order.sku || '') + '</figcaption></figure>';
      return printCard('レーザー彫刻 ' + order.productName, '<div class="pp-row">' + pic + printTextBox(t, '彫刻する文字') + '</div>', '写真は商品のサンプル画像です。枠の中の文字を彫刻します。');
    }
    // 受注明細に出す印刷イメージをまとめて作る。無ければ空文字
    function printPreviewHtml(order, view) {
      if (!order) return '';
      const t = printTexts();
      const out = [];
      if (view && view.seal && view.seal.file && view.status !== 'diy') out.push(printMiniSeal(view.seal, t));
      const noshi = printNoshiKind(order);
      if (noshi) out.push(printNoshi(order, noshi, t));
      if (printIsRibbon(order)) out.push(printRibbon(order, t));
      if (printIsLaser(order)) out.push(printLaser(order, t));
      return out.join('');
    }
    // 画像が読めなかったときは「画像なし」にする
    function printPreviewWire(host) {
      host.querySelectorAll('[data-pp-img]').forEach(function (img) {
        img.addEventListener('error', function () {
          const fig = img.closest('.pp-pic');
          if (fig) { fig.classList.add('is-empty'); img.replaceWith(Object.assign(document.createElement('p'), { className: 'pp-miss', textContent: '画像なし' })); }
        });
      });
    }
