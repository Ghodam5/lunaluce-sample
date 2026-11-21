// Luna Luce OMS 部品JS: 21-builder-editor（サイトビルダー真ん中の列: 選んだ部品を、ボタン・選択肢・入力欄で直す）
// data-f="項目名" の入力は 23-builder-tab の builderInput が受け取る。JSONやCSSの文字は画面に出さない。
    function builderField(label, field, value, opts) {
      opts = opts || {};
      const attrs = ' data-f="' + field + '"' + (opts.placeholder ? ' placeholder="' + escapeHtml(opts.placeholder) + '"' : '') + (opts.max ? ' maxlength="' + opts.max + '"' : '');
      const input = opts.area
        ? '<textarea' + attrs + ' rows="2">' + escapeHtml(value || '') + '</textarea>'
        : '<input type="' + (opts.type || 'text') + '"' + attrs + ' value="' + escapeHtml(value || '') + '">';
      return '<label class="fld' + (opts.wide ? ' wide' : '') + '"><span>' + escapeHtml(label) + '</span>' + input + (opts.hint ? '<small>' + escapeHtml(opts.hint) + '</small>' : '') + '</label>';
    }
    function builderSwitch(label, field, on) {
      return '<label class="switch"><input type="checkbox" data-f="' + field + '"' + (on ? ' checked' : '') + '><span>' + escapeHtml(label) + '</span></label>';
    }
    function builderPageSelect(label, field, value) {
      const known = BUILDER_PAGES.some(function (p) { return p[0] === value; });
      const opts = BUILDER_PAGES.map(function (p) {
        return '<option value="' + p[0] + '"' + (p[0] === value ? ' selected' : '') + '>' + escapeHtml(p[1]) + '</option>';
      }).join('') + (known ? '' : '<option value="' + escapeHtml(value) + '" selected>いまのリンク（' + escapeHtml(value) + '）</option>');
      return '<label class="fld"><span>' + escapeHtml(label) + '</span><select data-f="' + field + '">' + opts + '</select></label>';
    }
    function builderPeriod(item, prefix, required) {
      return '<div class="period">' +
        builderField('開始日' + (required ? '' : '（任意）'), prefix + 'startDate', builderDateOf(item.startsAt), { type: 'date' }) +
        builderField('最終日' + (required ? '' : '（任意）'), prefix + 'lastDay', builderLastDayOf(item.endsAt), { type: 'date', hint: 'この日の終わりまで表示します' }) + '</div>';
    }
    function builderThemePicker(card) {
      return '<div class="themes" role="radiogroup" aria-label="色のテーマ">' + state.builder.themes.map(function (t) {
        const on = t.id === card.theme;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="theme' + (on ? ' is-on' : '') + '" data-b="card-theme" data-theme="' + escapeHtml(t.id) + '" style="background:' + escapeHtml(t.background) + ';border-top-color:' + escapeHtml(t.top) + ';color:' + escapeHtml(t.accent) + '">' + escapeHtml(t.name) + '</button>';
      }).join('') + '</div>';
    }
    // 画像を取り込むボタン（パソコン・スマホの画像を選ぶ）。data-import の行き先: card=カードの上 / tile番号=その特集
    function builderImportButton(target) {
      return '<label class="import"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-import="' + escapeHtml(String(target)) + '"><span>＋ 画像を取り込む</span></label>';
    }
    function builderImageLabel(src) {
      const up = state.builder.uploads[src];
      return up ? '取り込み: ' + up.name : src.replace(/^images\//, '');
    }
    function builderImagePicker(card) {
      const b = state.builder;
      const choices = Array.from(new Set(builderImageChoices().concat(card.image ? [card.image] : []).concat((card.ids || []).map(function (id) { const p = builderProduct(id); return p && p.image; }).filter(Boolean))));
      const tiles = choices.map(function (src) {
        const on = src === card.image;
        return '<button type="button" class="img' + (on ? ' is-on' : '') + (b.uploads[src] ? ' is-up' : '') + '" data-b="card-image" data-src="' + escapeHtml(src) + '" aria-pressed="' + on + '" title="' + escapeHtml(builderImageLabel(src)) + '"><img src="' + escapeHtml(builderImg(src)) + '" alt="" loading="lazy"></button>';
      }).join('');
      return '<div class="imgs">' + builderSwitch('カードの上に画像を出す', 'useImage', !!card.image) + (card.image || card.useImage ? builderImportButton('card') + '<div class="img-grid">' + tiles + '</div><small>取り込んだ画像（緑の枠）、トップのカードで使っている画像、選んだ商品の画像から選べます。</small>' : '') + '</div>';
    }
    function builderSlots(card) {
      return '<ol class="slots">' + (card.ids || ['', '', '', '']).map(function (id, i) {
        const p = id ? builderProduct(id) : null;
        if (p) {
          return '<li class="slot"><img src="' + escapeHtml(builderImg(p.image)) + '" alt=""><span><b>' + escapeHtml(p.title) + '</b><small>商品番号 ' + escapeHtml(p.id) + '・' + formatYen(p.price) + '</small></span><button type="button" data-b="slot-clear" data-slot="' + i + '">外す</button></li>';
        }
        const q = state.builder.query[i] || '';
        return '<li class="slot empty"><label class="fld"><span>' + (i + 1) + 'つ目の商品を探す</span><input type="search" data-q="' + i + '" value="' + escapeHtml(q) + '" placeholder="商品名か商品番号"></label><div class="hits" data-hits="' + i + '">' + builderHits(i) + '</div></li>';
      }).join('') + '</ol>';
    }
    function builderHits(slot) {
      const q = foldText(state.builder.query[slot] || '');
      if (!q) return '';
      const taken = (builderSelected().ids || []);
      const hits = state.builder.products.filter(function (p) {
        return taken.indexOf(p.id) < 0 && (p.id.indexOf(q) === 0 || foldText(p.title).indexOf(q) >= 0);
      }).slice(0, 6);
      if (!hits.length) return '<p class="muted">見つかりません</p>';
      return hits.map(function (p) {
        return '<button type="button" class="hit" data-b="slot-pick" data-slot="' + slot + '" data-id="' + escapeHtml(p.id) + '"><img src="' + escapeHtml(builderImg(p.image)) + '" alt="" loading="lazy"><span>' + escapeHtml(p.title) + '<small>' + escapeHtml(p.id) + '・' + formatYen(p.price) + '</small></span></button>';
      }).join('');
    }
    function builderTiles(card) {
      const list = card.tiles || [];
      const full = list.length >= BUILDER_TILE_MAX;
      return '<p class="muted">いま' + list.length + 'つ（1〜' + BUILDER_TILE_MAX + 'つ）。2列に並び、数が奇数のときは最後の1つが真ん中に来ます。</p><ol class="tiles">' + list.map(function (t, i) {
        const opts = builderImageChoices().concat(builderImageOk(t.image) || !t.image ? [] : [t.image]).map(function (src) {
          return '<option value="' + escapeHtml(src) + '"' + (src === t.image ? ' selected' : '') + '>' + escapeHtml(builderImageLabel(src)) + '</option>';
        }).join('');
        return '<li class="tile"><div class="row"><b class="tile-no">' + (i + 1) + '</b>' + builderField('特集の名前', 'tiles.' + i + '.label', t.label) + builderPageSelect('リンク先', 'tiles.' + i + '.href', t.href) + '</div>' +
          '<div class="row"><img class="tile-thumb" src="' + escapeHtml(builderImg(t.image)) + '" alt=""><label class="fld"><span>画像</span><select data-f="tiles.' + i + '.image">' + opts + '</select></label>' + builderImportButton(i) + '</div>' +
          '<div class="row"><span class="tools"><button type="button" data-b="tile-move" data-tile="' + i + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-b="tile-move" data-tile="' + i + '" data-dir="1"' + (i === list.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-b="tile-remove" data-tile="' + i + '">この特集を外す</button></span></div></li>';
      }).join('') + '</ol><button type="button" class="add" data-b="tile-add"' + (full ? ' disabled' : '') + '>＋ 特集を足す</button>' + (full ? '<small class="muted">' + BUILDER_TILE_MAX + 'つまでです。</small>' : '');
    }

    function renderBuilderEditor(host) {
      function tickerForm() {
        const rows = state.builder.notices.map(function (n, i) {
          return '<li class="notice"><div class="row">' + builderSwitch('表示する', 'n.' + i + '.active', n.active !== false) +
            '<span class="tools"><button type="button" data-b="notice-move" data-index="' + i + '" data-dir="-1">↑</button><button type="button" data-b="notice-move" data-index="' + i + '" data-dir="1">↓</button><button type="button" data-b="notice-remove" data-index="' + i + '">削除</button></span></div>' +
            builderField('流れる文', 'n.' + i + '.text', n.text, { wide: true, max: 60, hint: '60文字まで。商品の価格・在庫・注文のことは書かない' }) +
            builderPageSelect('押したときに開くページ', 'n.' + i + '.href', n.href || '') + builderPeriod(n, 'n.' + i + '.', false) + '</li>';
        }).join('');
        return '<h2>流れる文言</h2><p class="lead">サイトの一番上に流れる一文です。上から順に流れます。</p><ol class="notices">' + rows + '</ol><button type="button" class="add" data-b="notice-add">＋ 文言を足す</button>';
      }
      function cardForm(card) {
        const kind = card.kind || 'products';
        let body = '<h2>' + escapeHtml(BUILDER_KINDS[kind].label) + '</h2>' +
          '<div class="row">' + builderSwitch('トップに表示する', 'active', card.active) + '<span class="tools"><button type="button" data-b="card-copy">複製</button><button type="button" data-b="card-remove">このカードを削除</button></span></div>' +
          '<h3>色</h3>' + builderThemePicker(card) +
          '<h3>文字</h3>' + (kind === 'campaign' ? builderField('目印（バッジ）', 'badge', card.badge, { placeholder: '例: 5円ご縁 / 10%OFF', max: 16 }) : '') +
          builderField('題名', 'title', card.title, { wide: true, max: 40 }) + builderField('一文', 'text', card.text, { wide: true, max: 60, area: true }) +
          '<div class="row">' + builderField('ボタンの文字', 'cta', card.cta, { max: 24 }) + builderPageSelect('ボタンのリンク先', 'href', card.href) + '</div>';
        if (kind === 'features') {
          body += '<h3>画像</h3>' + builderImagePicker(card) + '<h3>並べる特集</h3>' + builderTiles(card);
        } else {
          body += '<h3>画像</h3>' + builderImagePicker(card) + '<h3>並べる商品（4つ）</h3>' + builderSlots(card);
        }
        body += '<h3>表示する期間</h3>' + builderPeriod(card, '', kind === 'campaign') +
          (kind === 'campaign' ? builderSwitch('「あと○日」を出す', 'showCountdown', card.showCountdown !== false) : '') +
          '<details class="adv"><summary>カードの名前（いつもは触らない）</summary>' + builderField('カードの名前', 'id', card.id, { hint: '英小文字・数字・-。書き出すファイル名になります' }) + '</details>';
        return body;
      }
      function themeForm(theme) {
        if (theme.builtIn) {
          return '<h2>テーマ: ' + escapeHtml(theme.name) + '</h2><p class="lead">標準のテーマは変えられません。新しい色の組み合わせは「＋ テーマを追加」で作れます。</p>';
        }
        function color(label, key) {
          return '<label class="fld color"><span>' + label + '</span><input type="color" data-f="' + key + '" value="' + escapeHtml(theme[key]) + '"></label>';
        }
        return '<h2>テーマ: ' + escapeHtml(theme.name) + '</h2><p class="lead">追加したテーマは、どのカードでも選べるようになります。</p>' +
          builderField('表示名', 'name', theme.name, { max: 12 }) + builderField('テーマの名前（英小文字）', 'id', theme.id, { max: 20 }) +
          '<div class="colors">' + color('カードの背景', 'background') + color('ふちの線', 'border') + color('上の太い線', 'top') + color('題名・ボタンの文字', 'accent') + '</div>' +
          '<button type="button" data-b="theme-remove">このテーマを削除</button>';
      }
      function paint() {
        const b = state.builder;
        if (!b.ready) { host.innerHTML = ''; return; }
        const s = b.sel;
        const target = builderSelected();
        host.innerHTML = s.type === 'ticker' ? tickerForm() : s.type === 'card' && target ? cardForm(target) : target ? themeForm(target) : '<p class="muted">左の一覧から選んでください。</p>';
      }
      paint();
      on('oms:builder', function (detail) { if (!detail || detail.form) paint(); });
    }
