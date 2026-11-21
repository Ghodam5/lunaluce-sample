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
    // 選んでいる部品（流れる文言・テーマ・カード）の項目に値を入れる
    function builderSetField(field, value) {
      const b = state.builder;
      if (b.sel.type === 'ticker') {
        builderSetPath({ n: b.notices }, field, value);
      } else if (b.sel.type === 'theme') {
        builderSelected()[field] = value;
      } else {
        const card = builderSelected();
        if (field === 'useImage') {
          if (!value) card.image = '';
          else if (!card.image) card.image = (b.images.find(function (src) { return /main|xmas|feature/.test(src); }) || b.images[0] || '');
        } else {
          builderSetPath(card, field, value);
        }
      }
    }
    function builderInput(el, repaintForm) {
      builderSetField(el.dataset.f, el.type === 'checkbox' ? el.checked : el.value);
      builderChanged(repaintForm);
    }
    function builderGetField(field) {
      const b = state.builder;
      let obj = b.sel.type === 'ticker' ? { n: b.notices } : builderSelected();
      field.split('.').forEach(function (k) { obj = obj == null ? obj : obj[k]; });
      return obj || '';
    }
    // カテゴリの選択肢が変わったら、URLを組み立て直す（大分類を変えたら下の段は選び直し）
    function builderLinkCat(el) {
      const field = el.dataset.field;
      const cur = builderLinkParse(builderGetField(field));
      const c = cur.type === 'category' ? cur : { g: '', m: '', s: '', n: false };
      const part = el.dataset.linkCat;
      if (part === 'g') { c.g = el.value; c.m = ''; c.s = ''; }
      if (part === 'm') { c.m = el.value; c.s = ''; }
      if (part === 's') c.s = el.value;
      if (part === 'n') c.n = el.checked;
      builderSetField(field, c.g ? builderCategoryHref(c.g === 'all' ? 'all' : c.g, c.g === 'all' ? '' : c.m, c.s, c.n) : '');
      builderChanged(true);
    }
    function builderMove(list, index, dir) {
      const to = index + dir;
      if (to < 0 || to >= list.length) return false;
      const item = list.splice(index, 1)[0];
      list.splice(to, 0, item);
      return to;
    }
    function builderAction(name, el) {
      if (builderHistAction(name)) return;
      const b = state.builder;
      const card = b.sel.type === 'card' ? builderSelected() : null;
      const index = Number(el.dataset.index);
      if (builderDaysAction(name, el)) return;
      if (builderNewsAction(name, el)) return;
      if (builderCatAction(name, el)) return;
      if (builderPlanAction(name, el)) return;
      if (name === 'list-filter') { b.listFilter = el.dataset.filter; b.stockPage = 1; emit('oms:builder', { form: true }); return; }
      if (name === 'link-open') { b.linkOpen = b.linkOpen === el.dataset.field ? '' : el.dataset.field; b.linkTab = ''; b.linkQuery = ''; emit('oms:builder', { form: true }); return; }
      if (name === 'link-tab') { b.linkTab = el.dataset.tab; emit('oms:builder', { form: true }); return; }
      if (name === 'link-set') { builderSetField(el.dataset.field, el.dataset.href); b.linkOpen = ''; b.linkTab = ''; b.linkQuery = ''; builderChanged(true); return; }
      if (name === 'select') { b.linkOpen = ''; b.sel = { type: el.dataset.type, index: index }; b.query = {}; b.slotSwap = null; emit('oms:builder', { form: true }); return; }
      if (name === 'card-move') { const to = builderMove(b.cards, index, Number(el.dataset.dir)); if (to !== false) { b.sel = { type: 'card', index: to }; builderChanged(true); } return; }
      if (name === 'card-add') { b.cards.push(builderNewCard(el.dataset.kind)); b.sel = { type: 'card', index: b.cards.length - 1 }; builderChanged(true); showToast('新しいカードは「トップに表示する」が切れた状態で作りました。'); return; }
      if (name === 'card-copy' && card) { const copy = cloneData(card); copy.id = builderUniqueId(card.id.replace(/-copy(-\d+)?$|-\d+$/, '') + '-copy', b.cards); copy.active = false; b.cards.splice(b.sel.index + 1, 0, copy); b.sel.index += 1; builderChanged(true); return; }
      if (name === 'card-remove' && card) { b.cards.splice(b.sel.index, 1); b.sel = { type: 'ticker', index: 0 }; builderChanged(true); showToast('カードを削除しました。「↶ 元に戻す」で戻せます。'); return; }
      if (name === 'card-theme' && card) { card.theme = el.dataset.theme; builderChanged(true); return; }
      if (name === 'card-image' && b.sel.type === 'product') { builderAddPhotos(builderSelected(), [el.dataset.src]); builderChanged(true); return; }
      if (name === 'card-image' && card) { card.image = el.dataset.src; builderChanged(true); return; }
      if (name === 'slot-pick' && card) { card.ids[Number(el.dataset.slot)] = el.dataset.id; b.query = {}; b.slotSwap = null; builderChanged(true); return; }
      if (name === 'slot-clear' && card) { card.ids[Number(el.dataset.slot)] = ''; b.slotSwap = null; builderChanged(true); return; }
      if (name === 'slot-move' && card) { if (builderMove(card.ids, Number(el.dataset.slot), Number(el.dataset.dir)) !== false) { b.slotSwap = null; builderChanged(true); } return; }
      if (name === 'slot-add' && card) { if (card.ids.length < 6) { card.ids.push(''); b.slotSwap = null; builderChanged(true); } return; }
      if (name === 'slot-remove' && card) { if (card.ids.length > 2) { card.ids.splice(Number(el.dataset.slot), 1); b.slotSwap = null; b.query = {}; builderChanged(true); } return; }
      if (name === 'slot-swap' && card) { const i = Number(el.dataset.slot); b.slotSwap = b.slotSwap === i ? null : i; b.query = {}; emit('oms:builder', { form: true }); return; }
      if (name === 'slot-cand' && card) {
        const i = b.slotSwap !== null && b.slotSwap !== undefined && card.ids[b.slotSwap] ? b.slotSwap : card.ids.indexOf('');
        if (i < 0) { showToast('枠が全部埋まっています。「＋ 商品の枠を足す」か、替えたい商品の「別の商品に替える」を押してから選んでください。'); return; }
        card.ids[i] = el.dataset.id; b.slotSwap = null; b.query = {}; builderChanged(true); return;
      }
      if (name === 'tile-add' && card) { if (card.tiles.length >= BUILDER_TILE_MAX) return; card.tiles.push({ label: '', href: '', image: b.images[0] || '' }); builderChanged(true); return; }
      if (name === 'tile-remove' && card) { card.tiles.splice(Number(el.dataset.tile), 1); builderChanged(true); return; }
      if (name === 'tile-move' && card) { if (builderMove(card.tiles, Number(el.dataset.tile), Number(el.dataset.dir)) !== false) builderChanged(true); return; }
      if (name === 'product-new') { b.newProducts.push(builderNewProduct(el.dataset.template)); b.sel = { type: 'product', index: b.newProducts.length - 1 }; b.templateQuery = ''; builderChanged(true); return; }
      if (name === 'product-edit') { builderOpenEdit(el.dataset.id); return; }
      if (name === 'photo-move' && b.sel.type === 'product') { const p = builderSelected(); builderSyncPhotos(p); if (builderMove(p.photos, index, Number(el.dataset.dir)) !== false) { p.image = p.photos[0]; builderChanged(true); } return; }
      if (name === 'photo-main' && b.sel.type === 'product') { const p = builderSelected(); builderSyncPhotos(p); p.photos.unshift(p.photos.splice(index, 1)[0]); p.image = p.photos[0]; builderChanged(true); return; }
      if (name === 'photo-remove' && b.sel.type === 'product') { const p = builderSelected(); builderSyncPhotos(p); p.photos.splice(index, 1); p.image = p.photos[0] || ''; builderChanged(true); return; }
      if (name === 'code-suggest' && b.sel.type === 'product') { const p = builderSelected(); p.code = el.dataset.code; p.codeAuto = el.dataset.code; builderChanged(true); return; }
      if (name === 'place-edit' && b.sel.type === 'product') { builderSelected().placesTouched = true; builderChanged(true); return; }
      if (name === 'channel-export') { builderChannelExport(); return; }
      if (name === 'product-remove' && b.sel.type === 'product') { b.newProducts.splice(b.sel.index, 1); b.sel = { type: 'stock', index: 0 }; builderChanged(true); return; }
      if (name === 'sku-add' && b.sel.type === 'product') { builderSelected().skus.push({ t: '', price: 0 }); builderChanged(true); return; }
      if (name === 'sku-remove' && b.sel.type === 'product') { builderSelected().skus.splice(index, 1); builderChanged(true); return; }
      if (name === 'place-add' && b.sel.type === 'product') { builderSelected().places.push({ g: '', m: '', s: '' }); builderChanged(true); return; }
      if (name === 'place-remove' && b.sel.type === 'product') { builderSelected().places.splice(index, 1); builderChanged(true); return; }
      if (name === 'stock-detail') { b.stockDetail = el.dataset.id; emit('oms:builder', { form: true }); const pv = document.querySelector('[data-part="builder-preview"]'); if (pv && el.dataset.id && window.innerWidth < 1100) pv.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if (name === 'stock-filter') { b.stockFilter = el.dataset.filter; b.stockPage = 1; emit('oms:builder', { form: true }); return; }
      if (name === 'stock-page') { b.stockPage = Number(el.dataset.page); emit('oms:builder', { form: true }); const top = document.querySelector('[data-part="builder-editor"] .stock-range'); if (top && el.closest('.pager') && el.closest('.pager').nextElementSibling === null) top.scrollIntoView({ block: 'start' }); return; }
      if (name === 'upload-remove') { builderRemoveUpload(el.dataset.src); return; }
      if (name === 'image-hide') {
        const src = el.dataset.src;
        const users = builderImageUsers(src);
        if (users.length) { showToast('この画像は使われているのでアーカイブできません: ' + users.join('、') + '。先に別の画像に変えてください。'); return; }
        const h = builderHiddenImages();
        if (h.indexOf(src) < 0) h.push(src);
        builderSaveHidden();
        emit('oms:builder', { form: true });
        showToast('画像をアーカイブしました（消えてはいません）。下の「アーカイブ」から呼び戻せます。');
        return;
      }
      if (name === 'image-unhide') { b.hiddenImages = builderHiddenImages().filter(function (x) { return x !== el.dataset.src; }); builderSaveHidden(); b.showHidden = true; emit('oms:builder', { form: true }); return; }
      if (name === 'image-unhide-all') { b.hiddenImages = []; builderSaveHidden(); emit('oms:builder', { form: true }); showToast('アーカイブした画像をすべて呼び戻しました。'); return; }
      if (name === 'img-size' && card) { builderSetImgH(card, (card.imageHeight || 130) + Number(el.dataset.step)); builderChanged(true); return; }
      if (name === 'img-size-reset' && card) { delete card.imageHeight; builderChanged(true); return; }
      if (name === 'img-fit' && card) { builderFitImage(card); return; }
      if (name === 'notice-add') { b.notices.push({ id: 'notice-' + Date.now().toString(36), active: true, text: '', href: '' }); builderChanged(true); return; }
      if (name === 'notice-move') { if (builderMove(b.notices, index, Number(el.dataset.dir)) !== false) builderChanged(true); return; }
      if (name === 'notice-remove') { b.notices.splice(index, 1); builderChanged(true); return; }
      if (name === 'theme-add') {
        const id = builderUniqueId('custom', b.themes);
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
      if (name === 'reset') { builderResetDraft(); showToast('変更を取り消して、いまのサイトの内容に戻しました。「↶ 元に戻す」で取り消す前に戻せます。'); }
    }
    function builderAddPhotos(p, list) {
      builderSyncPhotos(p);
      list.forEach(function (src) { if (src && p.photos.indexOf(src) < 0) p.photos.push(src); });
      p.image = p.photos[0] || '';
    }
    // 登録済みの商品の編集を開く（同じ商品の編集中の下書きがあればそれを開く）
    function builderOpenEdit(id) {
      const b = state.builder;
      let i = b.newProducts.findIndex(function (x) { return x.edit && x.id === String(id); });
      if (i < 0) {
        const p = builderEditProduct(id);
        if (!p) { showToast('商品の詳細を読み込み中です。少し待ってからもう一度押してください。'); return; }
        b.newProducts.push(p);
        i = b.newProducts.length - 1;
      }
      b.sel = { type: 'product', index: i };
      b.stockDetail = '';
      builderChanged(true);
      const ed = document.querySelector('[data-part="builder-editor"]');
      if (ed && window.innerWidth < 1100) ed.scrollIntoView({ block: 'start' });
    }
    // 画像の取り込み: 選んだ画像を縮めて一時保存し、そのままカード（または特集）に使う。商品の写真は何枚でもまとめて取り込める
    function builderImportFrom(el) {
      const card = builderSelected();
      const files = Array.from(el.files || []);
      const file = files[0];
      const target = el.dataset.import;
      el.value = '';
      if (target === 'photo' && state.builder.sel.type === 'product' && card && files.length) {
        Promise.all(files.map(builderImportImage)).then(function (res) {
          builderAddPhotos(card, res.map(function (r) { return r.path; }));
          builderChanged(true);
          showToast(res.length + '枚の写真を取り込みました。' + (res.every(function (r) { return r.stored; }) ? '' : 'このブラウザに保存しきれません。画面を閉じる前に下書きを書き出してください。'));
        }).catch(function (err) { showToast(err.message); });
        return;
      }
      if (!file || (state.builder.sel.type !== 'card' && state.builder.sel.type !== 'product') || !card) return;
      builderImportImage(file).then(function (res) {
        if (target === 'card') card.image = res.path;
        else if (card.tiles && card.tiles[Number(target)]) card.tiles[Number(target)].image = res.path;
        builderChanged(true);
        showToast(res.stored ? '画像を取り込みました。' : '画像を取り込みましたが、このブラウザに保存しきれません。画面を閉じる前に下書きを書き出してください。');
      }).catch(function (err) { showToast(err.message); });
    }
    // 検索欄の入力で一覧を描き直しても、入力中の欄から抜けないようにする
    function builderRepaintKeepFocus(el) {
      const attr = el.dataset.sq !== undefined ? 'data-sq' : 'data-tq';
      const pos = el.selectionStart;
      emit('oms:builder', { form: true });
      const again = document.querySelector('[' + attr + ']');
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* 何もしない */ } }
    }
    // 取り込んだ画像を消す。カード・特集・新しい商品で使っていたら消さずに知らせる
    function builderRemoveUpload(src) {
      const b = state.builder;
      if (!b.uploads[src]) return;
      const users = [];
      b.cards.forEach(function (c) {
        if (c.image === src) users.push(c.title || 'カード');
        (c.tiles || []).forEach(function (t) { if (t.image === src) users.push((c.title || 'カード') + 'の特集「' + (t.label || '') + '」'); });
      });
      b.newProducts.forEach(function (p) { if (p.image === src || (p.photos || []).indexOf(src) >= 0) users.push((p.edit ? '編集中の商品「' : '新しい商品「') + (p.title || p.id) + '」の写真'); });
      if (users.length) { showToast('この画像は使われているので消せません: ' + users.join('、') + '。先に別の画像に変えてください。'); return; }
      const name = b.uploads[src].name;
      delete b.uploads[src];
      builderSaveUploads();
      builderChanged(true);
      showToast('取り込んだ画像「' + name + '」を消しました。');
    }
    function builderSetImgH(card, h) {
      h = Math.max(BUILDER_IMG_H.min, Math.min(BUILDER_IMG_H.max, Math.round(h / 10) * 10));
      if (h === BUILDER_IMG_H.base) delete card.imageHeight; else card.imageHeight = h;
    }
    // 画像の縦横の比率から、カードの幅いっぱいに出る高さにする（サイトの画像の幅はおよそ300px）
    function builderFitImage(card) {
      const img = new Image();
      img.onload = function () { builderSetImgH(card, 300 * img.naturalHeight / img.naturalWidth); builderChanged(true); };
      img.src = builderImg(card.image);
    }
    // 見本の画像の下端をつまんで、上下に動かすと高さが変わる
    function builderResizeStart(event, host) {
      const card = builderSelected();
      if (!card || state.builder.sel.type !== 'card') return;
      event.preventDefault();
      const box = event.target.closest('.pv-img');
      const startY = event.clientY;
      const startH = card.imageHeight || BUILDER_IMG_H.base;
      const move = function (e) {
        builderSetImgH(card, startH + (e.clientY - startY) * 130 / 110);
        const h = card.imageHeight || BUILDER_IMG_H.base;
        box.style.height = Math.round(h * 110 / 130) + 'px';
        const range = host.querySelector('[data-imgh]');
        const out = host.querySelector('[data-imgh-out]');
        if (range) range.value = h;
        if (out) out.textContent = Math.round(h / BUILDER_IMG_H.base * 100) + '%';
      };
      const up = function () { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); builderChanged(true); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
    function renderBuilderTab(host) {
      host.innerHTML = '<p class="builder-lead">左で直したい部品を選び、真ん中で直し、右で見え方を確かめます。JSONやCSSを触る必要はありません。</p><div class="builder-cols"></div>';
      mountOrdered(host.querySelector('.builder-cols'), BUILDER_PARTS);
      host.addEventListener('click', function (event) {
        const el = event.target.closest('[data-b]');
        if (el && !el.disabled) builderAction(el.dataset.b, el);
      });
      host.addEventListener('pointerdown', function (event) {
        if (event.target.closest('[data-resize]')) builderResizeStart(event, host);
      });
      host.addEventListener('input', function (event) {
        const el = event.target;
        if (el.dataset.catd !== undefined && el.type !== 'radio' && el.tagName !== 'SELECT') { builderCatInput(el, false); return; }
        if ((el.dataset.plan !== undefined && el.type !== 'radio' && el.type !== 'date') || el.dataset.planq !== undefined) { builderPlanInput(el, false); return; }
        if (el.dataset.news !== undefined && el.type !== 'checkbox' && el.type !== 'date') { builderNewsInput(el, false); return; }
        if (el.dataset.long !== undefined && (el.type === 'text' || el.tagName === 'TEXTAREA')) { builderDaysLongInput(el, false); return; }
        if (el.dataset.imgh !== undefined) {
          const card = builderSelected();
          builderSetImgH(card, Number(el.value));
          const out = host.querySelector('[data-imgh-out]');
          if (out) out.textContent = Math.round((card.imageHeight || BUILDER_IMG_H.base) / BUILDER_IMG_H.base * 100) + '%';
          const box = host.querySelector('.pv-img');
          if (box) box.style.height = Math.round((card.imageHeight || BUILDER_IMG_H.base) * 110 / 130) + 'px';
          builderSave();
          return;
        }
        if (el.dataset.f === 'code' && state.builder.sel.type === 'product') {
          builderInput(el, false);
          const out = host.querySelector('[data-codecheck]');
          if (out) { const c = builderCodeCheck(builderSelected()); out.className = 'code-check is-' + c.level; out.textContent = c.msg; }
          return;
        }
        if (el.dataset.sq !== undefined) { state.builder.stockQuery = el.value; state.builder.stockPage = 1; builderRepaintKeepFocus(el); return; }
        if (el.dataset.tq !== undefined) { state.builder.templateQuery = el.value; builderRepaintKeepFocus(el); return; }
        if (el.dataset.lq !== undefined) {
          state.builder.linkQuery = el.value;
          const box = host.querySelector('[data-lhits="' + el.dataset.lq + '"]');
          if (box) box.innerHTML = builderLinkHits(el.dataset.lq);
          return;
        }
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
        if (el.dataset.codesImport !== undefined) { builderImportCodes(el); return; }
        if (el.dataset.catd !== undefined) { builderCatInput(el, true); return; }
        if (el.dataset.plan !== undefined || el.dataset.planCat !== undefined) { if (el.type === 'text' || el.tagName === 'TEXTAREA') return; builderPlanInput(el, true); return; }
        if (builderListingChange(el)) return;
        if (el.dataset.news !== undefined) { if (el.type === 'checkbox' || el.type === 'date') builderNewsInput(el, true); return; }
        if (el.dataset.long !== undefined && (el.type === 'text' || el.tagName === 'TEXTAREA')) return;
        if (builderDaysChange(el)) return;
        if (el.dataset.imgh !== undefined) { builderChanged(true); return; }
        if (el.dataset.linkCat !== undefined) { builderLinkCat(el); return; }
        if (el.dataset.stock !== undefined) { builderSetStock(el.dataset.stock, { status: el.value }); builderChanged(true); return; }
        if (el.dataset.stockEta !== undefined) { builderSetStock(el.dataset.stockEta, { eta: el.value }); builderChanged(true); return; }
        if (el.dataset.place !== undefined) {
          const pl = builderSelected().places[Number(el.dataset.place)];
          pl[el.dataset.pp] = el.value;
          if (el.dataset.pp === 'g') { pl.m = ''; pl.s = ''; }
          if (el.dataset.pp === 'm') pl.s = '';
          builderCodeAuto(builderSelected());
          builderChanged(true);
          return;
        }
        if (el.dataset.f && (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date')) builderInput(el, true);
      });
      loadBuilder();
    }
