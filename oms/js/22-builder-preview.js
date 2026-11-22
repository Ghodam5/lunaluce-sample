// Luna Luce OMS 部品JS: 22-builder-preview（サイトビルダー右の列: サイトでの見え方）
// 見本はサイトの home-promos.css の形に合わせた簡易表示。色はテーマの値をそのまま使う。
    // 見本の画像。サイトの高さ（標準130px）を見本の大きさ（標準110px）に縮めて出し、下端をつまんで高さを変えられる
    function builderPreviewImg(card) {
      const h = Math.round((card.imageHeight || 130) * 110 / 130);
      return '<div class="pv-img" style="height:' + h + 'px"><img src="' + escapeHtml(builderImg(card.image)) + '" alt=""><span class="pv-resize" data-resize title="上下に動かして大きさを変える" aria-hidden="true"></span></div>';
    }
    function builderCardPreview(card, nowIso) {
      const t = builderTheme(card.theme);
      const kind = card.kind || 'products';
      const style = 'background:' + t.background + ';border-color:' + t.border + ';border-top-color:' + t.top + ';--accent:' + t.accent;
      let html = '<article class="pv-card" style="' + escapeHtml(style) + '">';
      if (kind === 'features') {
        if (card.image) html += '<div class="pv-banner">' + builderPreviewImg(card) + '<h4>' + escapeHtml(card.title || '題名') + '</h4><p>' + escapeHtml(card.text || '') + '</p></div><div class="pv-tiles">';
        else html += '<div class="pv-head"><h4>' + escapeHtml(card.title || '題名') + '</h4><p>' + escapeHtml(card.text || '') + '</p></div><div class="pv-tiles">';
        html += (card.tiles || []).map(function (tile) {
            return '<span><img src="' + escapeHtml(builderImg(tile.image)) + '" alt=""><em>' + escapeHtml(tile.label) + '</em></span>';
          }).join('') + '</div>';
      } else {
        html += '<div class="pv-banner">';
        if (kind === 'campaign') {
          const left = builderDaysLeft(card, nowIso);
          html += '<p class="pv-badge">' + escapeHtml(card.badge || 'キャンペーン') + (card.showCountdown !== false && left !== null && left > 0 ? '<b>あと' + left + '日</b>' : '') + '</p>';
        }
        html += (card.image ? builderPreviewImg(card) : '') + '<h4>' + escapeHtml(card.title || '題名') + '</h4><p>' + escapeHtml(card.text || '') + '</p></div><div class="pv-products" data-count="' + (card.ids || []).length + '">' +
          (card.ids || []).map(function (id) {
            const p = builderProduct(id);
            return p ? '<span><img src="' + escapeHtml(builderImg(p.image)) + '" alt=""><em>' + escapeHtml(p.title) + '</em></span>' : '<span class="pv-empty">商品を選ぶ</span>';
          }).join('') + '</div>';
      }
      html += '<p class="pv-all">' + escapeHtml(card.cta || 'ボタン') + '</p></article>';
      return html;
    }
    function renderBuilderPreview(host) {
      function paint() {
        const b = state.builder;
        if (!b.ready) { host.innerHTML = ''; return; }
        const nowIso = new Date().toISOString();
        const s = b.sel;
        const shown = b.notices.concat(builderAutoBands()).filter(function (n) { return builderOnNow(n, nowIso); });
        const ticker = '<div class="pv-ticker">' + (shown.length ? shown.map(function (n) { return '<span>' + escapeHtml(n.text) + '</span>'; }).join('') : '<span>（いま流れる文言はありません）</span>') + '</div>';
        let main = '';
        if (s.type === 'card' && builderSelected()) {
          const card = builderSelected();
          main = '<p class="pv-note">' + (builderOnNow(card, nowIso) ? 'いまトップに表示されます' : card.active ? '期間外のため、いまは表示されません' : '「トップに表示する」が切れています') + '</p>' + builderCardPreview(card, nowIso);
        } else if (s.type === 'product' && builderSelected()) {
          main = '<p class="pv-note">商品ページの見え方（簡易）</p>' + builderProductPreview(builderSelected());
        } else if (s.type === 'plan' && builderSelected()) {
          main = builderPlanPreview(builderSelected());
        } else if (s.type === 'days') {
          main = builderDaysPreview();
        } else if (s.type === 'news') {
          main = builderNewsPreview();
        } else if (s.type === 'sections') {
          main = builderSectionsPreview();
        } else if (s.type === 'texts') {
          main = builderTextsPreview();
        } else if (s.type === 'layout') {
          main = builderLayoutPreview();
        } else if (s.type === 'notes') {
          main = builderNotesPreview();
        } else if (s.type === 'cats') {
          main = builderCatNamesPreview();
        } else if (s.type === 'reflect') {
          main = builderReflectPreview();
        } else if (s.type === 'stock') {
          main = builderStockPreview();
        } else if (s.type === 'product-start') {
          main = '<p class="pv-note">お手本を選ぶと、ここに見え方が出ます。</p>';
        } else if (s.type === 'theme' && builderSelected()) {
          const t = builderSelected();
          main = builderCardPreview({ kind: 'products', theme: t.id, title: t.name + 'のカード', text: 'この色の組み合わせで表示されます。', cta: 'ボタンの見え方', ids: [] }, nowIso);
        } else {
          main = '<p class="pv-note">トップのカード（表示されるものだけ・上から順）</p><div class="pv-rail">' + b.cards.filter(function (c) { return builderOnNow(c, nowIso); }).map(function (c) { return builderCardPreview(c, nowIso); }).join('') + '</div>';
        }
        const errs = builderAllErrors();
        const dirty = builderDirty();
        host.innerHTML = '<div class="pv-phone">' + ticker + main + '</div>' +
          builderFixListHtml() +
          '<div class="pv-actions"><button type="button" class="export" data-b="export"' + (errs.length || !dirty ? ' disabled' : '') + '>下書きを書き出す</button><button type="button" data-b="reset"' + (dirty ? '' : ' disabled') + '>変更を取り消す</button></div>' +
          '<p class="muted">' + (dirty ? '変更はこのブラウザに一時保存しています。' : '変更はありません。') + '保存先（本番サイト）にはまだつないでいません。</p>';
      }
      paint();
      on('oms:builder', paint);
    }
