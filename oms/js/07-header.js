// Luna Luce OMS 部品JS: 07-header（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderHeaderBrand(host) {
      host.innerHTML = '<div class="brand"><div class="mark" aria-hidden="true">L</div><h1>Luna Luce<span class="badge">OMS 2.36</span></h1></div>';
    }
    function renderHeaderStatus(host) {
      function paint() {
        host.innerHTML = '<div class="status-row"><div class="status-copy"><p class="status-live"><span class="dot"></span>ダミー注文 · 本番取込は未接続</p><p class="status-time">最終同期: ' + escapeHtml(state.lastSync) + '</p></div><button type="button" data-action="manual-sync">今すぐ全販路取込</button></div>';
      }
      paint();
      on('oms:sync', paint);
    }
    function renderHeaderTabs(host) {
      function paint() {
        host.setAttribute('role', 'tablist');
        host.innerHTML = HEADER_TABS.map(function (tab) {
          const onTab = state.activeTab === tab.id;
          return '<button type="button" role="tab" data-action="switch-tab" data-tab="' + tab.id + '" aria-selected="' + (onTab ? 'true' : 'false') + '">' + escapeHtml(tab.label) + '</button>';
        }).join('');
      }
      paint();
      on('oms:tab', paint);
    }
    const HEADER_PARTS = [
      { name: 'header-brand', render: renderHeaderBrand },
      { name: 'header-status', render: renderHeaderStatus },
      { name: 'header-tabs', render: renderHeaderTabs }
    ];
    function renderHeader(host) {
      host.innerHTML = '<div class="header-spacer"></div><div class="header-bar"><div class="header-stack" data-slot="stack"></div></div>';
      mountOrdered(host.querySelector('[data-slot="stack"]'), HEADER_PARTS);
      const bar = host.querySelector('.header-bar');
      let away = false;
      function measure() {
        host.style.setProperty('--header-h', bar.offsetHeight + 'px');
      }
      measure();
      if (window.ResizeObserver) {
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
      }
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', function () {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        let next = away;
        if (!away && y > bar.offsetHeight + 24) next = true;
        else if (away && y <= 2) next = false;
        if (next === away) return;
        away = next;
        host.classList.toggle('is-away', away);
      }, { passive: true });
    }

