// Luna Luce OMS 部品JS: 06-order-helpers（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function dateValue(value) {
      if (value == null || String(value).trim() === '') return null;
      const text = String(value).trim();
      const iso = text.indexOf(' ') >= 0 ? text.replace(' ', 'T') : (text.length === 10 ? text + 'T00:00:00' : text);
      const time = new Date(iso).getTime();
      if (isNaN(time)) return null;
      return { time: time, label: text.slice(0, 10) };
    }
    function dueInfo(order) {
      const explicit = dateValue(order.deliveryDate) || dateValue(order.dueDate) || dateValue(order.requestedDelivery);
      if (explicit) return { missing: false, time: explicit.time, label: explicit.label };
      return { missing: true, time: Infinity, label: '' };
    }
    function orderSortTime(order) {
      if (state.orderSort === 'ordered') {
        const parsed = dateValue(order.orderDate);
        return parsed ? parsed.time : Infinity;
      }
      if (state.orderSort === 'wedding') {
        const parsed = dateValue(order.weddingDate);
        return parsed ? parsed.time : Infinity;
      }
      return dueInfo(order).time;
    }
    function visibleOrders() {
      const query = fuzzyWords(state.query); // あいまい検索（js/51-fuzzy）
      return state.orders.slice().sort(function (a, b) {
        return orderSortTime(a) - orderSortTime(b);
      }).filter(function (order) {
        if (state.activeChannel !== 'ALL' && order.channel !== state.activeChannel) return false;
        if (state.activeStatus !== 'ALL' && order.status !== state.activeStatus) return false;
        if (state.onlyUrgent && !(daysUntil(order.weddingDate) <= 7 && order.status !== '梱包・出荷済')) return false;
        if (state.onlyWarning && !order.warning) return false;
        if (query.length && !fuzzyMatch(orderSearchText(order), query)) return false;
        return true;
      });
    }
    function statusOptions(selected) {
      return STATUS_OPTIONS.map(function (status) {
        return '<option value="' + escapeHtml(status) + '"' + (status === selected ? ' selected' : '') + '>' + escapeHtml(status) + '</option>';
      }).join('');
    }
    function mountOrdered(parent, pieces) {
      pieces.forEach(function (piece) {
        const node = document.createElement('div');
        node.className = 'part';
        node.dataset.part = piece.name;
        parent.appendChild(node);
        piece.render(node);
      });
    }

