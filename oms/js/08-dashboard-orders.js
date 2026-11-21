// Luna Luce OMS 部品JS: 08-dashboard-orders（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderKpiStrip(host) {
      function paint() {
        const urgent = state.orders.filter(function (order) {
          return daysUntil(order.weddingDate) <= 7 && order.status !== '梱包・出荷済';
        }).length;
        const warning = state.orders.filter(function (order) { return !!order.warning; }).length;
        const production = state.orders.filter(function (order) {
          return order.status === '製造・レーザー加工' || order.status === '校正・データ作成';
        }).length;
        const shipping = state.orders.filter(function (order) { return order.status === '梱包・出荷済'; }).length;
        const cards = [
          ['本日新規受注（4販路計）', state.orders.length, '全販路統合済', ''],
          ['挙式日7日以内・要急ぎ', urgent, '最優先制作', 'is-urgent', 'filter-urgent'],
          ['名入れ要確認（パース警告）', warning, '要チェック', 'is-warn', 'filter-warning'],
          ['制作・レーザー加工待ち', production, 'バッチ出力可', 'is-make'],
          ['本日出荷予定（B2/佐川連携）', shipping, '伝票発行準備', 'is-ship']
        ];
        host.innerHTML = cards.map(function (card) {
          const inner = '<p class="label' + (card[3] === 'is-urgent' ? ' urgent-label' : '') + (card[3] === 'is-warn' ? ' warn-label' : '') + '">' + escapeHtml(card[0]) + '</p><div class="row"><span class="num">' + card[1] + '</span><span class="pill">' + escapeHtml(card[2]) + '</span></div>';
          if (card[4]) {
            return '<article class="' + card[3] + '"><button type="button" data-action="' + card[4] + '">' + inner + '</button></article>';
          }
          return '<article class="' + card[3] + '">' + inner + '</article>';
        }).join('');
      }
      paint();
      on('oms:change', paint);
    }
    function renderPartStockStrip(host) {
      function paint() {
        const cells = PART_KEYS.map(function (part) {
          const count = state.partStock[part.key];
          return '<div class="cell' + (count < 80 ? ' is-low' : '') + '"><p>' + escapeHtml(part.label) + '</p><strong data-stock="' + part.key + '">' + count + '</strong></div>';
        }).join('');
        host.innerHTML = '<h2>部品在庫（菓子・箱・サンクスカード・ミニシール）</h2><p class="lead">この画面の中だけ。注文を確定すると、その注文の内訳数だけ減ります。再読込で元に戻ります。新規の注文ではサンクスカードを選びません。過去の内訳と在庫は残します。</p><p class="note" data-stock-note>' + escapeHtml(state.lastStockMove || 'まだ引き落としはありません') + '</p><div class="grid">' + cells + '</div>';
      }
      paint();
      on('oms:change', paint);
    }
    function renderOrderFilters(host) {
      function paint() {
        const search = state.query;
        const channels = CHANNELS.map(function (channel) {
          return '<button type="button" data-action="channel" data-channel="' + channel.id + '" class="' + (state.activeChannel === channel.id ? 'is-on' : '') + '">' + escapeHtml(channel.label) + '</button>';
        }).join('');
        const statuses = [{ id: 'ALL', label: '全工程' }].concat(STATUS_OPTIONS.map(function (status) {
          return { id: status, label: status };
        })).map(function (status) {
          return '<button type="button" data-action="status" data-status="' + escapeHtml(status.id) + '" class="' + (state.activeStatus === status.id ? 'is-on' : '') + '">' + escapeHtml(status.label) + '</button>';
        }).join('');
        const reset = (state.onlyUrgent || state.onlyWarning)
          ? '<button type="button" class="reset" data-action="reset-special">× 特別絞り込み解除</button>'
          : '';
        host.innerHTML = '<div class="block"><span class="cap">販路:</span>' + channels + '</div><div class="block"><label class="search-wrap">検索<input data-action="search" type="search" placeholder="注文番号・顧客名・新郎新婦名・商品名" value="' + escapeHtml(search) + '"></label><button type="button" class="manual" data-action="open-manual">＋ 電話・FAX注文 手動登録</button></div><div class="block status"><span class="cap">工程:</span>' + statuses + reset + '</div>';
      }
      paint();
      on('oms:filters', paint);
    }
    function renderOrderList(host) {
      function card(order) {
        const days = order.weddingDate ? daysUntil(order.weddingDate) : null;
        const clock = orderClock(order);
        const fees = feeNumbers(order);
        const counts = partCounts(order);
        let when = days == null ? '' : '<span class="mini calm">あと' + days + '日</span>';
        if (order.status === '梱包・出荷済') when = '<span class="mini done">出荷完了</span>';
        else if (days != null && days <= 7) when = '<span class="mini hot">挙式まであと' + days + '日</span>';
        else if (days != null && days <= 16) when = '<span class="mini soon">あと' + days + '日</span>';
        const extra = fees.extraTotal > 0
          ? '超過 ' + formatYen(fees.extraBase) + '+' + formatYen(fees.extraPer) + '×' + fees.extraCount + '=' + formatYen(fees.extraTotal)
          : '超過 ' + formatYen(0);
        const due = dueInfo(order);
        const dueText = due.missing
          ? '<span class="mini soon">日付はありません</span>'
          : escapeHtml(due.label);
        const fields = [
          ['挙式日 / 残日数', escapeHtml(order.weddingDate || '—') + (when ? '<br>' + when : '') + (order.rushTicket ? ' <span class="mini rush">特急チケット</span>' : '')],
          ['納期', dueText],
          ['販路 / 注文番号', '<span class="badge ch-' + order.channel + '">' + escapeHtml(order.channelLabel) + '</span><br>' + escapeHtml(order.id)],
          ['注文者 / 配送先', escapeHtml(order.customerName) + ' 様<br>' + escapeHtml(order.shippingTo)],
          ['商品・数量・金額', escapeHtml(order.productName) + '<br>' + escapeHtml(order.sku) + ' × ' + order.qty + '点 ' + formatYen(order.amount) + '<br>内訳 ' + PART_KEYS.map(function (part) { return part.short + counts[part.key]; }).join('・')],
          ['名入れ', escapeHtml(order.coupleNames) + (order.warning ? ' <span class="mini soon">要確認</span>' : ' <span class="mini done">正規化済</span>') + '<br>' + escapeHtml(order.fontStyle)],
          ['オプション・料金・印', escapeHtml(order.noshiSeal) + '<br>' + escapeHtml(extra) + '<br>のし ' + formatYen(fees.noshi) + ' / 包装 ' + formatYen(fees.wrapping) + (order.campaignMark ? '<br><span class="mini mark">「' + escapeHtml(order.campaignMark) + '」</span>' : '')],
          ['期限', '賞味 ' + escapeHtml(order.bestBefore || 'なし') + '<br>' + (clock.within ? '13:00まで（内） ' : '13:00過ぎ ') + escapeHtml(clock.time)],
          ['工程', '<select data-action="quick-status" data-id="' + escapeHtml(order.id) + '" aria-label="工程">' + statusOptions(order.status) + '</select><br>校正: ' + escapeHtml(order.proofStatus) + '<br>' + (order.stockCommitted ? '在庫引当済' : '在庫未確定')]
        ].map(function (field) {
          return '<div class="field"><span>' + field[0] + '</span><strong>' + field[1] + '</strong></div>';
        }).join('');
        return '<article class="card' + (order.warning ? ' is-warn' : '') + '" data-action="open-order" data-id="' + escapeHtml(order.id) + '"><div class="card-bar"><label class="check">選択<input type="checkbox" data-action="toggle-one" data-id="' + escapeHtml(order.id) + '"' + (order.selected ? ' checked' : '') + '></label><button type="button" class="open" data-action="open-order" data-id="' + escapeHtml(order.id) + '">名入れ詳細</button></div><div class="fields">' + fields + '</div></article>';
      }
      function paint() {
        const rows = visibleOrders();
        const selected = state.orders.filter(function (order) { return order.selected; }).length;
        const allOn = state.orders.length > 0 && selected === state.orders.length;
        const sortKey = state.orderSort === 'wedding' || state.orderSort === 'ordered' ? state.orderSort : 'due';
        const sortTitle = sortKey === 'wedding' ? '受注一覧（挙式日が近い順）' : (sortKey === 'ordered' ? '受注一覧（受注日が近い順）' : '受注一覧（納期が近い順）');
        const sorts = [
          ['due', '納期'],
          ['wedding', '挙式日'],
          ['ordered', '受注日']
        ].map(function (item) {
          const onSort = sortKey === item[0];
          return '<button type="button" data-action="sort-orders" data-sort="' + item[0] + '" class="' + (onSort ? 'is-on' : '') + '" aria-pressed="' + (onSort ? 'true' : 'false') + '">' + item[1] + '</button>';
        }).join('');
        host.innerHTML = '<div class="list-head"><h2>' + sortTitle + '</h2><div class="sort" role="group" aria-label="並び順"><span class="cap">並び:</span>' + sorts + '</div><p class="hint">納期は納品日、挙式日は挙式の日付です。近い日付が上です。行を開くと、内訳・図柄の見本・受注管理表が出ます</p><label class="select-all"><input id="select-all" type="checkbox" data-action="toggle-all"' + (allOn ? ' checked' : '') + '>すべて選択</label><p class="count">表示: ' + rows.length + '件 / 全' + state.orders.length + '件</p><p class="count">選択中: ' + selected + '件</p><button type="button" class="batch" data-action="open-simulator">選択注文の加工・送り状CSVを生成</button></div>' + (rows.length ? rows.map(card).join('') : '<p class="empty">該当する注文はありません</p>');
      }
      paint();
      on('oms:list', paint);
      on('oms:change', paint);
    }
