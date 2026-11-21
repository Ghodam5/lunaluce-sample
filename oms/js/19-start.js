// Luna Luce OMS 部品JS: 19-start（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    seedOrders();
    seedSiteContent();
    mountOrdered(document.getElementById('app'), APP_PARTS);
    switchTab('dashboard');
