// Luna Luce OMS 部品JS: 23-builder-tab（サイトビルダーのタブ: 3列の枠と、ボタン・入力の受け取り）
// 3列の中身は 20-builder-list / 21-builder-editor / 22-builder-preview。ここは並びと操作だけを持つ。
    const BUILDER_PARTS = [
      { name: 'builder-list', render: renderBuilderList },
      { name: 'builder-editor', render: renderBuilderEditor },
      { name: 'builder-preview', render: renderBuilderPreview }
    ];
    function builderSetPath(target, path, value) {
      const keys = path.split('.');
      let obj = target;
      for (let i = 0; i < keys.length - 1; i += 1) obj = obj[keys[i]];
      const last = keys[keys.length - 1];
      if (last === 'startDate') obj.startsAt = builderIsoOf(value);
      else if (last === 'lastDay') obj.endsAt = builderEndIsoOf(value);
      else obj[last] = value;
      if ((last === 'startDate' || last === 'lastDay') && (obj.startsAt || obj.endsAt)) obj.timeZone = 'Asia/Tokyo';
    }
    function builderInput(el, repaintForm) {
      const b = state.builder;
      const field = el.dataset.f;
      const value = el.type === 'checkbox' ? el.checked : el.value;
      if (b.sel.type === 'ticker') {
        builderSetPath({ n: b.notices }, field, value);
      } else if (b.sel.type === 'theme') {
        const theme = builderSelected();
        if (field === 'id') {
          b.cards.forEach(function (c) { if (c.theme === theme.id) c.theme = value; });
        }
        theme[field] = value;
      } else {
        const card = builderSelected();
        if (field === 'useImage') {
          if (!value) card.image = '';
          else if (!card.image) card.image = (b.images.find(function (src) { return /main|xmas|feature/.test(src); }) || b.images[0] || '');
        } else {
          builderSetPath(card, field, value);
        }
      }
      builderChanged(repaintForm);
    }
    function builderMove(list, index, dir) {
      const to = index + dir;
      if (to < 0 || to >= list.length) return false;
      const item = list.splice(index, 1)[0];
      list.splice(to, 0, item);
      return to;
    }
    function builderAction(name, el) {
      const b = state.builder;
      const card = b.sel.type === 'card' ? builderSelected() : null;
      const index = Number(el.dataset.index);
      if (name === 'select') { b.sel = { type: el.dataset.type, index: index }; b.query = {}; emit('oms:builder', { form: true }); return; }
      if (name === 'card-move') { const to = builderMove(b.cards, index, Number(el.dataset.dir)); if (to !== false) { b.sel = { type: 'card', index: to }; builderChanged(true); } return; }
      if (name === 'card-add') { b.cards.push(builderNewCard(el.dataset.kind)); b.sel = { type: 'card', index: b.cards.length - 1 }; builderChanged(true); showToast('新しいカードは「トップに表示する」が切れた状態で作りました。'); return; }
      if (name === 'card-copy' && card) { const copy = cloneData(card); copy.id = card.id + '-copy'; copy.active = false; b.cards.splice(b.sel.index + 1, 0, copy); b.sel.index += 1; builderChanged(true); return; }
      if (name === 'card-remove' && card) { b.cards.splice(b.sel.index, 1); b.sel = { type: 'ticker', index: 0 }; builderChanged(true); showToast('カードを削除しました。「変更を取り消す」で元に戻せます。'); return; }
      if (name === 'card-theme' && card) { card.theme = el.dataset.theme; builderChanged(true); return; }
      if (name === 'card-image' && card) { card.image = el.dataset.src; builderChanged(true); return; }
      if (name === 'slot-pick' && card) { card.ids[Number(el.dataset.slot)] = el.dataset.id; b.query = {}; builderChanged(true); return; }
      if (name === 'slot-clear' && card) { card.ids[Number(el.dataset.slot)] = ''; builderChanged(true); return; }
      if (name === 'tile-add' && card) { if (card.tiles.length >= BUILDER_TILE_MAX) return; card.tiles.push({ label: '', href: '', image: b.images[0] || '' }); builderChanged(true); return; }
      if (name === 'tile-remove' && card) { card.tiles.splice(Number(el.dataset.tile), 1); builderChanged(true); return; }
      if (name === 'tile-move' && card) { if (builderMove(card.tiles, Number(el.dataset.tile), Number(el.dataset.dir)) !== false) builderChanged(true); return; }
      if (name === 'notice-add') { b.notices.push({ id: 'notice-' + Date.now().toString(36), active: true, text: '', href: '' }); builderChanged(true); return; }
      if (name === 'notice-move') { if (builderMove(b.notices, index, Number(el.dataset.dir)) !== false) builderChanged(true); return; }
      if (name === 'notice-remove') { b.notices.splice(index, 1); builderChanged(true); return; }
      if (name === 'theme-add') {
        let id = 'custom-' + (b.themes.length + 1);
        while (b.themes.some(function (t) { return t.id === id; })) id += '-2';
        b.themes.push({ id: id, name: '新しいテーマ', builtIn: false, background: '#fdf2e9', border: '#ecd5c0', top: '#e3a87a', accent: '#8a5530' });
        b.sel = { type: 'theme', index: b.themes.length - 1 };
        builderChanged(true);
        return;
      }
      if (name === 'theme-remove') {
        const theme = builderSelected();
        if (b.cards.some(function (c) { return c.theme === theme.id; })) { showToast('このテーマを使っているカードがあります。先にカードの色を変えてください。'); return; }
        b.themes.splice(b.sel.index, 1);
        b.sel = { type: 'ticker', index: 0 };
        builderChanged(true);
        return;
      }
      if (name === 'export') { downloadJson('site-builder-draft.json', builderExportPayload()); showToast('site-builder-draft.json を書き出しました。サイトへの反映は担当者が確認してから行います。'); return; }
      if (name === 'reset') { builderResetDraft(); showToast('変更を取り消して、いまのサイトの内容に戻しました。'); }
    }
    // 画像の取り込み: 選んだ画像を縮めて一時保存し、そのままカード（または特集）に使う
    function builderImportFrom(el) {
      const card = builderSelected();
      const file = el.files && el.files[0];
      const target = el.dataset.import;
      el.value = '';
      if (!file || state.builder.sel.type !== 'card' || !card) return;
      builderImportImage(file).then(function (res) {
        if (target === 'card') card.image = res.path;
        else if (card.tiles && card.tiles[Number(target)]) card.tiles[Number(target)].image = res.path;
        builderChanged(true);
        showToast(res.stored ? '画像を取り込みました。' : '画像を取り込みましたが、このブラウザに保存しきれません。画面を閉じる前に下書きを書き出してください。');
      }).catch(function (err) { showToast(err.message); });
    }
    function renderBuilderTab(host) {
      host.innerHTML = '<p class="builder-lead">左で直したい部品を選び、真ん中で直し、右で見え方を確かめます。JSONやCSSを触る必要はありません。</p><div class="builder-cols"></div>';
      mountOrdered(host.querySelector('.builder-cols'), BUILDER_PARTS);
      host.addEventListener('click', function (event) {
        const el = event.target.closest('[data-b]');
        if (el && !el.disabled) builderAction(el.dataset.b, el);
      });
      host.addEventListener('input', function (event) {
        const el = event.target;
        if (el.dataset.q !== undefined) {
          state.builder.query[el.dataset.q] = el.value;
          const box = host.querySelector('[data-hits="' + el.dataset.q + '"]');
          if (box) box.innerHTML = builderHits(el.dataset.q);
          return;
        }
        if (el.dataset.f && el.type !== 'checkbox' && el.tagName !== 'SELECT' && el.type !== 'date') builderInput(el, false);
      });
      host.addEventListener('change', function (event) {
        const el = event.target;
        if (el.dataset.import !== undefined) { builderImportFrom(el); return; }
        if (el.dataset.f && (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date')) builderInput(el, true);
      });
      loadBuilder();
    }
