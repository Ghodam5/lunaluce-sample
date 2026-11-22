// Luna Luce OMS 部品JS: 15-main（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderMain(host) {
      host.setAttribute('role', 'main');
      host.innerHTML = '<div data-tab-panel="dashboard"></div><div data-tab-panel="architecture" hidden></div><div data-tab-panel="schema" hidden></div><div data-tab-panel="simulator" hidden></div><div data-tab-panel="carrier" hidden></div><div data-tab-panel="builder" hidden></div><div data-tab-panel="channels" hidden></div><div data-tab-panel="voice" hidden></div>';
      mountOrdered(host.querySelector('[data-tab-panel="dashboard"]'), [{ name: 'tab-dashboard', render: renderDashboard }]);
      mountOrdered(host.querySelector('[data-tab-panel="architecture"]'), [{ name: 'tab-architecture', render: renderArchitectureTab }]);
      mountOrdered(host.querySelector('[data-tab-panel="schema"]'), [{ name: 'tab-schema', render: renderSchemaTab }]);
      mountOrdered(host.querySelector('[data-tab-panel="simulator"]'), [{ name: 'tab-simulator', render: renderSimulatorTab }]);
      mountOrdered(host.querySelector('[data-tab-panel="carrier"]'), [{ name: 'tab-carrier', render: renderCarrierTab }]);
      mountOrdered(host.querySelector('[data-tab-panel="builder"]'), [{ name: 'tab-builder', render: renderBuilderTab }]);
      mountOrdered(host.querySelector('[data-tab-panel="channels"]'), [{ name: 'tab-channels', render: renderChannelTab }]);
      mountOrdered(host.querySelector('[data-tab-panel="voice"]'), [{ name: 'tab-voice', render: renderVoiceTab }]);
    }

