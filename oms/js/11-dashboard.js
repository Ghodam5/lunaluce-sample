// Luna Luce OMS 部品JS: 11-dashboard（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    const DASHBOARD_PARTS = [
      { name: 'kpi-strip', render: renderKpiStrip },
      { name: 'part-stock', render: renderPartStockStrip },
      { name: 'product-search', render: renderProductSearch },
      { name: 'channel-match', render: renderChannelMatch },
      { name: 'order-filters', render: renderOrderFilters },
      { name: 'order-list', render: renderOrderList }
    ];
    function renderDashboard(host) {
      mountOrdered(host, DASHBOARD_PARTS);
    }

