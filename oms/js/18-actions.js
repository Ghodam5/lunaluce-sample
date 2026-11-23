// Luna Luce OMS 部品JS: 18-actions（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function switchTab(tabName) {
      if (piiHidden() && WORKER_TABS.indexOf(tabName) < 0) tabName = 'dashboard'; // 作業員が開けるタブ（js/52-work-log）
      state.activeTab = tabName;
      if (tabName === 'worklog') emit('oms:worklog');
      document.querySelectorAll('[data-tab-panel]').forEach(function (panel) {
        panel.hidden = panel.dataset.tabPanel !== tabName;
      });
      emit('oms:tab', tabName);
      if (tabName === 'simulator') emit('oms:simulator');
      if (tabName === 'schema') emit('oms:schema');
      if (tabName === 'carrier') emit('oms:carrier');
    }
    function triggerManualSync() {
      const now = new Date();
      state.lastSync = TODAY + ' ' + now.toTimeString().split(' ')[0];
      emit('oms:sync');
      showToast('本番の取込は行っていません。楽天・Yahoo・本店には接続せず、ダミー注文のままです。');
    }
    function setChannelFilter(channel) {
      state.activeChannel = channel;
      emit('oms:filters');
      emit('oms:list');
    }
    function setStatusFilter(status) {
      state.activeStatus = status;
      emit('oms:filters');
      emit('oms:list');
    }
    function filterByUrgency() {
      state.onlyUrgent = true;
      state.onlyWarning = false;
      emit('oms:filters');
      emit('oms:list');
      showToast('挙式日7日以内の要急ぎ注文に絞り込みました');
    }
    function filterByWarning() {
      state.onlyWarning = true;
      state.onlyUrgent = false;
      emit('oms:filters');
      emit('oms:list');
      showToast('名入れパース警告のある注文に絞り込みました');
    }
    function resetSpecialFilters() {
      state.onlyUrgent = false;
      state.onlyWarning = false;
      emit('oms:filters');
      emit('oms:list');
    }
    function onSearch(el) {
      state.query = el.value;
      emit('oms:list');
      renderSearchSuggest(el); // 候補（js/51-fuzzy）
    }
    function setOrderSort(sort) {
      if (sort !== 'due' && sort !== 'wedding' && sort !== 'ordered') return;
      state.orderSort = sort;
      emit('oms:list');
    }
    function toggleSelectAll(el) {
      state.orders.forEach(function (order) { order.selected = el.checked; });
      emit('oms:list');
    }
    function toggleSingleSelect(el) {
      const order = state.orders.find(function (item) { return item.id === el.dataset.id; });
      if (!order) return;
      order.selected = el.checked;
      emit('oms:list');
    }
    function quickChangeStatus(el) {
      const order = state.orders.find(function (item) { return item.id === el.dataset.id; });
      if (!order) return;
      workLogStatus(order, order.status, el.value); // 作業ログ（js/52-work-log）
      order.status = el.value;
      emit('oms:change');
      showToast('注文 ' + order.id + ' の工程を「' + order.status + '」に更新しました');
    }
    // 図柄を選ぶ。選ばれている図柄をもう一度押すと外れる（未指定に戻る）
    function pickMiniSeal(id) {
      if (!id || !SEAL_BY_ID[id]) return;
      const order = currentOrder();
      if (!order) return;
      if (state.sealPickId === id) { clearMiniSeal(); return; }
      state.sealPickId = id;
      const line = order.line;
      const diy = line && line.templateId === 'paper-diy-blanc';
      if (line && !diy) {
        // 担当者が初めて触る前のテンプレートを覚えておく（外したときに戻すため）
        if (!line.sealBefore) line.sealBefore = { templateId: line.templateId || '', templateVersion: line.templateVersion || '' };
        line.designId = id;
        line.sealPickedBy = 'staff';
        if (!line.templateId) {
          line.templateId = 'mini-seal-d30';
          line.templateVersion = '2026.11.20';
        }
      }
      emit('oms:seal');
    }
    // 図柄を外して未指定に戻す。自動で入った図柄も外せる
    function clearMiniSeal() {
      const order = currentOrder();
      if (!order) return;
      state.sealPickId = '';
      const line = order.line;
      if (line && line.templateId !== 'paper-diy-blanc') {
        if (!line.sealBefore) line.sealBefore = { templateId: line.templateId || '', templateVersion: line.templateVersion || '' };
        line.designId = '';
        line.sealPickedBy = 'staff-clear';
        // 図柄を選んだときに入れたテンプレートだけを元に戻す
        if (line.sealBefore.templateId !== 'mini-seal-d30' && line.templateId === 'mini-seal-d30') {
          line.templateId = line.sealBefore.templateId;
          line.templateVersion = line.sealBefore.templateVersion;
        }
      }
      emit('oms:seal');
    }
    // のし・包装紙・小袋の見本を選ぶ。選ばれているものをもう一度押すと外れる
    function pickOption(group, file) {
      const order = currentOrder();
      if (!order || !group) return;
      const now = optionChosen(order, group);
      if (!order.optionPick) order.optionPick = {};
      order.optionPick[group] = (now && now.file === file) || !file ? '' : file;
      emit('oms:seal');
    }

    function openOrderDrawer(id) {
      const order = state.orders.find(function (item) { return item.id === id; });
      if (!order) return;
      state.currentId = id;
      state.draft = readDraft(order);
      state.sealPickId = (order.line && order.line.designId && SEAL_BY_ID[order.line.designId]) ? order.line.designId : '';
      const root = document.querySelector('[data-part="drawer"]');
      root.querySelector('.drawer-backdrop').hidden = false;
      root.querySelector('.drawer-panel').hidden = false;
      document.body.classList.add('scroll-lock');
      emit('oms:open');
      const body = root.querySelector('.drawer-body');
      if (body) body.scrollTop = 0;
    }
    function closeOrderDrawer() {
      const root = document.querySelector('[data-part="drawer"]');
      root.querySelector('.drawer-backdrop').hidden = true;
      root.querySelector('.drawer-panel').hidden = true;
      document.body.classList.remove('scroll-lock');
      state.currentId = null;
      state.draft = null;
    }
    function onEditInput(el) {
      if (!state.draft) return;
      if (el.dataset.field === 'clearWarning') state.draft.clearWarning = el.checked;
      else state.draft[el.dataset.field] = el.value;
      emit('oms:draft');
    }
    function saveDrawerEdits() {
      const order = currentOrder();
      if (!order || !state.draft) return;
      order.coupleNames = state.draft.couple;
      order.weddingDate = state.draft.wedding;
      order.deliveryDate = state.draft.delivery;
      order.headerMsg = state.draft.message;
      order.fontStyle = state.draft.font;
      order.noshiSeal = state.draft.noshi;
      workLogStatus(order, order.status, state.draft.status);
      order.status = state.draft.status;
      if (state.draft.clearWarning) order.warning = null;
      emit('oms:change');
      emit('oms:open');
      showToast('注文 ' + order.id + ' の正規化データを保存しました');
    }
    function toggleRushTicket() {
      const order = currentOrder();
      if (!order) return;
      order.rushTicket = !order.rushTicket;
      emit('oms:change');
      showToast(order.rushTicket ? order.id + ' に特急チケットを付けました' : order.id + ' の特急チケットを外しました');
    }
    function markProofSent() {
      const order = currentOrder();
      if (!order || order.proofStatus !== '未送付') return;
      order.proofStatus = '送付済';
      if (order.line) order.line.proofStatus = order.proofStatus;
      emit('oms:change');
      showToast(order.id + ' の校正を送付済みにしました');
    }
    function markProofApproved() {
      const order = currentOrder();
      if (!order || order.proofStatus !== '送付済') return;
      order.proofStatus = '承認済';
      if (order.line) order.line.proofStatus = order.proofStatus;
      emit('oms:change');
      showToast(order.id + ' の校正を承認済みにしました');
    }
    function confirmOrderStock() {
      const order = currentOrder();
      if (!order) return;
      if (order.stockCommitted) {
        showToast('この注文の部品在庫はすでに引き落とし済みです');
        return;
      }
      const counts = partCounts(order);
      const short = PART_KEYS.filter(function (part) { return state.partStock[part.key] < counts[part.key]; });
      if (short.length) {
        showToast('在庫が足りないので確定できません（' + short.map(function (part) { return part.label; }).join('・') + '）');
        return;
      }
      PART_KEYS.forEach(function (part) { state.partStock[part.key] -= counts[part.key]; });
      order.stockCommitted = true;
      state.lastStockMove = order.id + ' を確定。' + PART_KEYS.map(function (part) {
        return part.short + ' -' + counts[part.key] + '（残 ' + state.partStock[part.key] + '）';
      }).join('、');
      emit('oms:change');
      showToast(order.id + ' の内訳数を部品在庫から引き落としました');
    }
    function triggerSingleAction(kind) {
      const order = currentOrder();
      if (!order) return;
      if (kind === 'laser' || kind === 'yamato') {
        state.orders.forEach(function (item) { item.selected = item.id === order.id; });
        closeOrderDrawer();
        switchTab('simulator');
        showToast(order.id + (kind === 'laser' ? ' のレーザー加工用CSVを生成しました' : ' のヤマトB2送り状CSVを生成しました'));
        return;
      }
      if (kind === 'email') {
        showToast(order.customerName + ' 様の校正確認を記録しました。メールの本番送信はまだありません。');
        return;
      }
      if (kind === 'ship') {
        workLogStatus(order, order.status, '梱包・出荷済');
        order.status = '梱包・出荷済';
        emit('oms:change');
        closeOrderDrawer();
        showToast(order.id + ' を出荷済みにしました。モールAPIへは送っていません。');
      }
    }
    function openManualOrderModal() {
      const host = document.querySelector('[data-part="manual-modal"]');
      host.hidden = false;
      document.body.classList.add('scroll-lock');
    }
    function closeManualOrderModal() {
      document.querySelector('[data-part="manual-modal"]').hidden = true;
      if (!state.currentId) document.body.classList.remove('scroll-lock');
    }
    function submitManualOrder() {
      const type = document.getElementById('manual-type').value;
      const order = applyStaffDefaults({
        id: (type.indexOf('FAX') === 0 ? 'FAX' : 'TEL') + '-20261119-' + String(state.orders.length + 1).padStart(2, '0'),
        channel: 'MANUAL',
        channelLabel: type,
        orderDate: TODAY + ' 10:19',
        weddingDate: document.getElementById('manual-wedding').value || '2026-12-12',
        deliveryDate: document.getElementById('manual-delivery').value || '2026-12-05',
        partPer: { sweets: 1, box: 1, thanksCard: 0, miniSeal: 1 },
        customerName: document.getElementById('manual-customer').value.trim() || '新規電話・FAX顧客',
        shippingTo: document.getElementById('manual-venue').value.trim() || 'ご自宅配送',
        postalCode: '460-0001',
        address: document.getElementById('manual-venue').value.trim() || 'ご自宅配送',
        phone: '0586-86-1150',
        productName: document.getElementById('manual-product').value.trim() || 'ブライダルプチギフト',
        sku: 'LL-MAN-001',
        qty: 1,
        amount: 27300,
        coupleNames: document.getElementById('manual-couple').value.trim() || 'New Couple',
        headerMsg: 'THANK YOU FOR COMING',
        fontStyle: FONT_OPTIONS[0],
        noshiSeal: document.getElementById('manual-noshi').value.trim() || 'オリジナルタグ',
        status: '新規受付',
        warning: null,
        selected: true,
        rawPayload: { source: 'Manual ' + type, entered_at: TODAY + ' 10:19' }
      });
      state.orders.unshift(order);
      closeManualOrderModal();
      emit('oms:change');
      emit('oms:list');
      showToast(order.channelLabel + '（' + order.id + '）を受注の列へ追加しました');
    }
    function selectSchemaTable(index) {
      state.schemaIndex = Number(index) || 0;
      emit('oms:schema');
    }
    function copySqlDdl() {
      const table = dbSchemaTables[state.schemaIndex];
      const ddl = 'CREATE TABLE ' + table.name + ' (\n' + table.columns.map(function (column) {
        return '  ' + column.col + ' ' + column.type + (column.key === 'PK' ? ' PRIMARY KEY' : '') + ', -- ' + column.note;
      }).join('\n') + '\n);';
      const done = function () { showToast(table.name + ' の CREATE TABLE DDL をコピーしました'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ddl).then(done).catch(function () {
          const area = document.createElement('textarea');
          area.value = ddl;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
          done();
        });
      }
    }
    function goToSimulatorWithSelected() {
      switchTab('simulator');
    }
    function downloadSimulatedCsv(kind) {
      if (kind !== 'laser' && piiHidden()) { showToast('作業員のログインでは送り状CSV（住所・電話番号入り）は出せません'); return; }
      const content = kind === 'laser' ? laserCsv() : yamatoCsv();
      const filename = kind === 'laser' ? 'lunaluce_laser_engraving_' + TODAY + '.csv' : 'lunaluce_yamato_b2_' + TODAY + '.csv';
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(filename + ' をダウンロードしました');
    }
    let toastTimer = null;
    function showToast(message) {
      const host = document.querySelector('[data-part="toast"]');
      host.hidden = false;
      host.querySelector('[data-toast-text]').textContent = message;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { host.hidden = true; }, 3200);
    }

    function runAction(name, el) {
      if (name === 'switch-tab') switchTab(el.dataset.tab);
      else if (name === 'manual-sync') triggerManualSync();
      else if (name === 'channel') setChannelFilter(el.dataset.channel);
      else if (name === 'status') setStatusFilter(el.dataset.status);
      else if (name === 'filter-urgent') filterByUrgency();
      else if (name === 'filter-warning') filterByWarning();
      else if (name === 'reset-special') resetSpecialFilters();
      else if (name === 'search') onSearch(el);
      else if (name === 'toggle-all') toggleSelectAll(el);
      else if (name === 'toggle-one') toggleSingleSelect(el);
      else if (name === 'quick-status') quickChangeStatus(el);
      else if (name === 'open-order') openOrderDrawer(el.dataset.id);
      else if (name === 'close-drawer') closeOrderDrawer();
      else if (name === 'edit-field') onEditInput(el);
      else if (name === 'save-edit') saveDrawerEdits();
      else if (name === 'toggle-rush') toggleRushTicket();
      else if (name === 'proof-send') markProofSent();
      else if (name === 'proof-approve') markProofApproved();
      else if (name === 'commit-stock') confirmOrderStock();
      else if (name === 'single') triggerSingleAction(el.dataset.kind);
      else if (name === 'open-manual') openManualOrderModal();
      else if (name === 'close-manual') closeManualOrderModal();
      else if (name === 'submit-manual') submitManualOrder();
      else if (name === 'schema') selectSchemaTable(el.dataset.index);
      else if (name === 'copy-ddl') copySqlDdl();
      else if (name === 'open-simulator') goToSimulatorWithSelected();
      else if (name === 'download') downloadSimulatedCsv(el.dataset.kind);
      else if (name === 'product-query') onProductQuery(el);
      else if (name === 'product-pick') pickCatalogProduct(el);
      else if (name === 'match-query') onMatchQuery(el);
      else if (name === 'sort-orders') setOrderSort(el.dataset.sort);
      else if (name === 'site-field') onSiteField(el);
      else if (name === 'site-export') exportSiteDraft(el.dataset.site);
      else if (name === 'site-load') loadSiteFile(el);
      else if (name === 'site-move') moveSitePromo(el);
      else if (name === 'site-add') addSiteRow(el);
      else if (name === 'site-remove') removeSiteRow(el);
      else if (name === 'carrier-mode') setCarrierMode(el.dataset.mode);
      else if (name === 'carrier-zone') setCarrierZone(el);
      else if (name === 'carrier-size') setCarrierSize(el);
      else if (carrierAction(name, el)) return; // 36-carrier-rates: 契約送料を直す
      else if (name === 'pick-seal') pickMiniSeal(el.dataset.sealId);
      else if (name === 'clear-seal') clearMiniSeal();
      else if (name === 'work-order') printWorkOrder(); // 45-work-order
      else if (name === 'work-output') workOutput(el.dataset.kind); // 52-work-log
      else if (name === 'day-sheet') openDaySheet(); // 54-day-sheet
      else if (name === 'pick-option') pickOption(el.dataset.group, el.dataset.file || '');
    }
    document.addEventListener('click', function (event) {
      const interactive = event.target.closest('button, a, input, select, textarea, label');
      if (interactive) {
        if (!interactive.matches('button, a')) return;
        if (interactive.hasAttribute('data-action')) runAction(interactive.dataset.action, interactive);
        return;
      }
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) runAction(actionEl.dataset.action, actionEl);
    });
    document.addEventListener('change', function (event) {
      if (event.target.hasAttribute('data-action')) runAction(event.target.dataset.action, event.target);
    });
    document.addEventListener('input', function (event) {
      const name = event.target.dataset.action;
      if (name === 'search' || name === 'edit-field' || name === 'product-query' || name === 'match-query' || name === 'site-field') runAction(name, event.target);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (state.currentId) closeOrderDrawer();
        else closeManualOrderModal();
      }
    });

