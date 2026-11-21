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
    // リンク先を名前で選ぶ部品。閉じているときは「いまの行き先」だけ、開くとカテゴリ・特集・ページ・商品から選べる。
    function builderLinkPicker(label, field, value, allowNone) {
      const b = state.builder;
      const info = builderLinkInfo(value);
      const open = b.linkOpen === field;
      let html = '<div class="link-pick' + (open ? ' is-open' : '') + '"><span class="lp-label">' + escapeHtml(label) + '</span>' +
        '<div class="lp-now' + (info.bad ? ' is-bad' : '') + '">' + (info.image ? '<img src="' + escapeHtml(builderImg(info.image)) + '" alt="">' : '') + '<span><small>' + escapeHtml(info.kind) + '</small><b>' + escapeHtml(info.label) + '</b></span>' +
        '<button type="button" data-b="link-open" data-field="' + field + '">' + (open ? '閉じる' : '変える') + '</button></div>';
      if (!open) return html + '</div>';
      const parsed = builderLinkParse(value);
      const tab = b.linkTab || (parsed.type === 'product' ? 'product' : parsed.type === 'category' ? 'category' : 'page');
      const tabs = [['category', 'カテゴリ'], ['page', '特集・ページ'], ['product', '商品']];
      html += '<div class="lp-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t[0] === tab) + '" data-b="link-tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + (allowNone ? '<button type="button" class="lp-none" data-b="link-set" data-field="' + field + '" data-href="">リンクなしにする</button>' : '') + '</div>';
      if (tab === 'category') {
        const c = parsed.type === 'category' ? parsed : { g: '', m: '', s: '', n: false };
        const g = b.links.categories.find(function (x) { return x.k === c.g; });
        const m = g && g.mids.find(function (x) { return x.k === c.m; });
        html += '<div class="lp-cat"><label class="fld"><span>大きな分類</span><select data-link-cat="g" data-field="' + field + '"><option value="">選んでください</option><option value="all"' + (c.g === 'all' ? ' selected' : '') + '>すべての商品</option>' +
          b.links.categories.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === c.g ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>';
        if (g) html += '<label class="fld"><span>その中の分類（任意）</span><select data-link-cat="m" data-field="' + field + '"><option value="">' + escapeHtml(g.name) + 'のすべて</option>' + g.mids.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === c.m ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>';
        if (m && m.subs.length) html += '<label class="fld"><span>さらに細かく（任意）</span><select data-link-cat="s" data-field="' + field + '"><option value="">' + escapeHtml(m.name) + 'のすべて</option>' + m.subs.map(function (x) { return '<option value="' + escapeHtml(x[0]) + '"' + (x[0] === c.s ? ' selected' : '') + '>' + escapeHtml(x[1]) + '</option>'; }).join('') + '</select></label>';
        if (c.g) html += '<label class="switch"><input type="checkbox" data-link-cat="n" data-field="' + field + '"' + (c.n ? ' checked' : '') + '><span>名入れできる商品だけにする</span></label>';
        html += '</div>';
      } else if (tab === 'page') {
        const cur = parsed.type === 'page' ? parsed.file : '';
        html += '<p class="lp-h">特集</p><div class="lp-feats">' + b.links.features.map(function (f) {
          return '<button type="button" class="lp-feat' + (f.href === cur ? ' is-on' : '') + '" data-b="link-set" data-field="' + field + '" data-href="' + escapeHtml(f.href) + '">' + (f.image ? '<img src="' + escapeHtml(builderImg(f.image)) + '" alt="" loading="lazy">' : '<i>一覧</i>') + '<span>' + escapeHtml(f.label) + '</span></button>';
        }).join('') + '</div>' + b.links.pageGroups.map(function (grp) {
          return '<p class="lp-h">' + escapeHtml(grp.name) + '</p><div class="lp-pages">' + grp.pages.map(function (p) {
            return '<button type="button" class="lp-page' + (p.href === cur ? ' is-on' : '') + '" data-b="link-set" data-field="' + field + '" data-href="' + escapeHtml(p.href) + '">' + escapeHtml(p.label) + '</button>';
          }).join('') + '</div>';
        }).join('');
      } else {
        html += '<label class="fld"><span>商品名か商品番号で探す</span><input type="search" data-lq="' + field + '" value="' + escapeHtml(b.linkQuery) + '" placeholder="例: シフォン / 48734"></label><div class="hits" data-lhits="' + field + '">' + builderLinkHits(field) + '</div>';
      }
      html += '<details class="adv"><summary>URLを直接入れる（くわしい人向け）</summary>' + builderField('URL', field, value, { wide: true, hint: 'サイト内のページだけ。例: category.html?g=food' }) + '</details>';
      return html + '</div>';
    }
    function builderLinkHits(field) {
      const q = foldText(state.builder.linkQuery || '');
      if (!q) return '';
      const hits = state.builder.products.filter(function (p) { return p.id.indexOf(q) === 0 || foldText(p.title).indexOf(q) >= 0; }).slice(0, 6);
      if (!hits.length) return '<p class="muted">見つかりません</p>';
      return hits.map(function (p) {
        return '<button type="button" class="hit" data-b="link-set" data-field="' + field + '" data-href="item.html?id=' + escapeHtml(p.id) + '"><img src="' + escapeHtml(builderImg(p.image)) + '" alt="" loading="lazy"><span>' + escapeHtml(p.title) + '<small>' + escapeHtml(p.id) + '・' + formatYen(p.price) + '</small></span></button>';
      }).join('');
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
      return '<label class="import"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-import="' + escapeHtml(String(target)) + '"' + (target === 'photo' ? ' multiple' : '') + '><span>＋ ' + (target === 'photo' ? '写真を取り込む（複数可）' : '画像を取り込む') + '</span></label>';
    }
    function builderImageLabel(src) {
      const up = state.builder.uploads[src];
      return up ? '取り込み: ' + up.name : src.replace(/^images\//, '');
    }
    // 画像の一枚: 取り込んだ画像には「取り込み」の札と消すボタンを付ける（サイトにある画像・商品画像は消せない）
    function builderImgTile(src, on) {
      const up = state.builder.uploads[src];
      return '<span class="img-wrap' + (up ? ' is-up' : '') + '"><button type="button" class="img' + (on ? ' is-on' : '') + (up ? ' is-up' : '') + '" data-b="card-image" data-src="' + escapeHtml(src) + '" aria-pressed="' + on + '" title="' + escapeHtml(builderImageLabel(src)) + '"><img src="' + escapeHtml(builderImg(src)) + '" alt="" loading="lazy"></button>' +
        (up ? '<em class="up-badge">取り込み</em>' : '') + '<button type="button" class="img-del" data-b="image-hide" data-src="' + escapeHtml(src) + '" aria-label="この画像をアーカイブする" title="アーカイブする（画像は消えません）">×</button></span>';
    }
    // カードの上の画像の高さ（サイトでの高さ px。標準130）。つまみと、右の見本の下端のドラッグで変えられる
    const BUILDER_IMG_H = { min: 80, max: 400, base: 130 };
    function builderImageSize(card) {
      const h = card.imageHeight || BUILDER_IMG_H.base;
      return '<div class="img-size"><label class="fld"><span>画像の大きさ（カードの縦の長さも変わります）</span><span class="size-row"><button type="button" data-b="img-size" data-step="-20" aria-label="小さく">−</button><input type="range" min="' + BUILDER_IMG_H.min + '" max="' + BUILDER_IMG_H.max + '" step="10" value="' + h + '" data-imgh aria-label="画像の高さ"><button type="button" data-b="img-size" data-step="20" aria-label="大きく">＋</button><output data-imgh-out>' + Math.round(h / BUILDER_IMG_H.base * 100) + '%</output></span></label>' +
        '<span class="tools"><button type="button" data-b="img-fit">画像に合わせる</button><button type="button" data-b="img-size-reset"' + (card.imageHeight ? '' : ' disabled') + '>標準に戻す</button></span><small>右の見本の画像の下の線をつまんで、上下に動かしても変えられます。画像の縦横の比率はそのままです。</small></div>';
    }
    function builderImagePicker(card) {
      const b = state.builder;
      const choices = Array.from(new Set(builderImageChoices().concat(card.image ? [card.image] : []).concat((card.ids || []).map(function (id) { const p = builderProduct(id); return p && p.image; }).filter(Boolean))));
      const archived = builderHiddenImages();
      const tiles = choices.filter(function (src) { return src === card.image || archived.indexOf(src) < 0; }).map(function (src) { return builderImgTile(src, src === card.image); }).join('');
      const hidden = archived.filter(function (src) { return b.uploads[src] || !/^images\/uploads\//.test(src); });
      const hiddenBox = hidden.length ? '<details class="img-hidden"' + (b.showHidden ? ' open' : '') + '><summary>アーカイブ（' + hidden.length + '件）: 押すと開きます</summary><p class="muted">アーカイブした画像です。「呼び戻す」で上の一覧に戻ります。' + (hidden.some(function (src) { return b.uploads[src]; }) ? '取り込んだ画像だけは「完全に消す」もできます。' : '') + '</p><div class="img-grid">' + hidden.map(function (src) {
        const up = b.uploads[src];
        return '<span class="img-wrap img-arch"><img src="' + escapeHtml(builderImg(src)) + '" alt="" title="' + escapeHtml(builderImageLabel(src)) + '"><button type="button" data-b="image-unhide" data-src="' + escapeHtml(src) + '">呼び戻す</button>' + (up ? '<button type="button" class="danger" data-b="upload-remove" data-src="' + escapeHtml(src) + '">完全に消す</button>' : '') + '</span>';
      }).join('') + '</div><button type="button" data-b="image-unhide-all">全部呼び戻す</button></details>' : '';
      return '<div class="imgs">' + builderSwitch('カードの上に画像を出す', 'useImage', !!card.image) + (card.image || card.useImage ? builderImportButton('card') + '<div class="img-grid">' + tiles + '</div><small>× でアーカイブします（一覧から外すだけで、画像は消えません。下の「アーカイブ」から呼び戻せます）。使っている画像はアーカイブできません。</small>' + hiddenBox + (card.image ? builderImageSize(card) : '') : '') + '</div>';
    }
    // 並べる商品（2〜6つ）。← → で並び順を変え、「別の商品に替える」で入れ替え、下の候補から押して選べる。数に合わせてサイトでバランスよく並ぶ
    function builderSlots(card) {
      const b = state.builder;
      const ids = card.ids || ['', '', '', ''];
      const search = function (i, label) {
        const q = b.query[i] || '';
        return '<label class="fld"><span>' + label + '</span><input type="search" data-q="' + i + '" value="' + escapeHtml(q) + '" placeholder="商品名か商品番号"></label><div class="hits" data-hits="' + i + '">' + builderHits(i) + '</div>';
      };
      const n = ids.length;
      const rows = { 2: '1段に2つ', 3: '1段に3つ', 4: '2つずつ2段', 5: '上に3つ・下に2つ', 6: '3つずつ2段' }[n] || '';
      return '<p class="muted">いま ' + n + 'つ（' + rows + '）。左上から順に並びます。← → で並び順を変えられます。2〜6つにでき、数に合わせて自動でバランスよく並びます。</p><ol class="slots">' + ids.map(function (id, i) {
        const p = id ? builderProduct(id) : null;
        const move = '<span class="slot-move"><button type="button" data-b="slot-move" data-slot="' + i + '" data-dir="-1" aria-label="' + (i + 1) + 'つ目を前へ"' + (i === 0 ? ' disabled' : '') + '>←</button><button type="button" data-b="slot-move" data-slot="' + i + '" data-dir="1" aria-label="' + (i + 1) + 'つ目を後ろへ"' + (i === ids.length - 1 ? ' disabled' : '') + '>→</button></span>';
        if (p) {
          const swapping = b.slotSwap === i;
          return '<li class="slot' + (swapping ? ' is-swap' : '') + '"><b class="slot-no">' + (i + 1) + '</b><img src="' + escapeHtml(builderImg(p.image)) + '" alt=""><span><b>' + escapeHtml(p.title) + '</b><small>商品番号 ' + escapeHtml(p.id) + '・' + formatYen(p.price) + '</small></span>' +
            '<span class="slot-tools">' + move + '<button type="button" data-b="slot-swap" data-slot="' + i + '">' + (swapping ? 'やめる' : '別の商品に替える') + '</button><button type="button" data-b="slot-clear" data-slot="' + i + '">外す</button></span>' +
            (swapping ? '<div class="slot-search">' + search(i, (i + 1) + 'つ目と入れ替える商品を探す（下の候補を押しても替わります）') + '</div>' : '') + '</li>';
        }
        return '<li class="slot empty"><b class="slot-no">' + (i + 1) + '</b>' + search(i, (i + 1) + 'つ目の商品を探す') + '<span class="slot-tools">' + move + (n > 2 ? '<button type="button" data-b="slot-remove" data-slot="' + i + '">この枠を消す</button>' : '') + '</span></li>';
      }).join('') + '</ol>' + (n < 6 ? '<button type="button" class="add" data-b="slot-add">＋ 商品の枠を足す（いま' + n + 'つ・6つまで）</button>' : '') + builderSlotCandidates(card);
    }
    // 候補: つながっている企画の商品、なければボタンのリンク先のカテゴリーの商品
    function builderSlotCandidates(card) {
      const b = state.builder;
      const plan = b.plans.find(function (p) { return p.cardId === card.id; });
      let src = null, label = '';
      if (plan) { src = plan; label = '企画「' + (plan.name || '名前なし') + '」の商品'; }
      else {
        const l = builderLinkParse(card.href || '');
        if (l.type === 'category' && l.g && l.g !== 'all') { src = { cats: [{ g: l.g, m: l.m || '', s: l.s || '' }], ids: [], exclude: [] }; label = 'リンク先のカテゴリー（' + builderPlanCatLabel(src.cats[0]) + '）の商品'; }
      }
      if (!src) return '<p class="muted">ボタンのリンク先をカテゴリーにすると、ここにそのカテゴリーの商品が候補として並びます。</p>';
      const list = builderPlanMembers(src).filter(function (m) { return m.src === 'site'; });
      if (!list.length) return '<p class="muted">' + escapeHtml(label) + ': 候補を読み込み中か、まだありません。</p>';
      const target = b.slotSwap !== undefined && b.slotSwap !== null && card.ids[b.slotSwap] ? b.slotSwap : card.ids.indexOf('');
      return '<details class="slot-cands" open><summary>候補から選ぶ: ' + escapeHtml(label) + ' ' + list.length + '件</summary><p class="muted">' + (target >= 0 ? '押すと ' + (target + 1) + 'つ目に入ります。' : '枠が全部埋まっています。「＋ 商品の枠を足す」か、「別の商品に替える」を押してから選んでください。') + '</p><div class="cand-grid">' + list.slice(0, 40).map(function (m) {
        const used = card.ids.indexOf(m.id) >= 0;
        return '<button type="button" class="cand' + (used ? ' is-used' : '') + '" data-b="slot-cand" data-id="' + escapeHtml(m.id) + '"' + (used || target < 0 ? ' disabled' : '') + ' title="' + escapeHtml(m.title) + '"><img src="' + escapeHtml(builderImg(m.image)) + '" alt="" loading="lazy"><span>' + escapeHtml(m.title) + '</span>' + (used ? '<i>' + (card.ids.indexOf(m.id) + 1) + 'つ目</i>' : '') + '</button>';
      }).join('') + '</div></details>';
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
        return '<li class="tile"><div class="row"><b class="tile-no">' + (i + 1) + '</b>' + builderField('特集の名前', 'tiles.' + i + '.label', t.label) + '</div>' + builderLinkPicker('押したときに開くページ', 'tiles.' + i + '.href', t.href, false) +
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
            builderLinkPicker('押したときに開くページ', 'n.' + i + '.href', n.href || '', true) + builderPeriod(n, 'n.' + i + '.', false) + '</li>';
        }).join('');
        return '<h2>流れる文言</h2><p class="lead">サイトの一番上に流れる一文です。上から順に流れます。</p><ol class="notices">' + rows + '</ol><button type="button" class="add" data-b="notice-add">＋ 文言を足す</button>' + builderAutoBandsForm();
      }
      function cardForm(card) {
        const kind = card.kind || 'products';
        let body = '<h2>' + escapeHtml(BUILDER_KINDS[kind].label) + '</h2>' +
          '<div class="row">' + builderSwitch('トップに表示する', 'active', card.active) + '<span class="tools"><button type="button" data-b="card-copy">複製</button><button type="button" data-b="card-remove">このカードを削除</button></span></div>' +
          '<h3>色</h3>' + builderThemePicker(card) +
          '<h3>文字</h3>' + (kind === 'campaign' ? builderField('目印（バッジ）', 'badge', card.badge, { placeholder: '例: 5円ご縁 / 10%OFF', max: 16 }) : '') +
          builderField('題名', 'title', card.title, { wide: true, max: 40 }) + builderField('一文', 'text', card.text, { wide: true, max: 60, area: true }) +
          builderField('ボタンの文字', 'cta', card.cta, { max: 24 }) + builderLinkPicker('ボタンを押したときに開くページ（カードの画像を押したときも同じ）', 'href', card.href, false);
        if (kind === 'features') {
          body += '<h3>画像</h3>' + builderImagePicker(card) + '<h3>並べる特集</h3>' + builderTiles(card);
        } else {
          body += '<h3>画像</h3>' + builderImagePicker(card) + '<h3>並べる商品（2〜6つ）</h3>' + builderSlots(card);
        }
        body += '<h3>表示する期間</h3>' + builderPeriod(card, '', kind === 'campaign') +
          (kind === 'campaign' ? builderSwitch('「あと○日」を出す', 'showCountdown', card.showCountdown !== false) : '') + builderPlanCardHint(card);
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
          builderField('表示名', 'name', theme.name, { max: 12 }) +
          '<div class="colors">' + color('カードの背景', 'background') + color('ふちの線', 'border') + color('上の太い線', 'top') + color('題名・ボタンの文字', 'accent') + '</div>' +
          '<button type="button" data-b="theme-remove">このテーマを削除</button>';
      }
      function paint() {
        const b = state.builder;
        if (!b.ready) { host.innerHTML = ''; return; }
        const s = b.sel;
        const target = builderSelected();
        host.innerHTML = s.type === 'ticker' ? tickerForm() : s.type === 'card' && target ? cardForm(target) : s.type === 'stock' ? builderStockForm() : s.type === 'days' ? builderDaysForm() : s.type === 'news' ? builderNewsForm() : s.type === 'sections' ? builderSectionsForm() : s.type === 'reflect' ? builderReflectForm() : s.type === 'cats' ? builderCatNamesForm() : s.type === 'plan' && target ? builderPlanForm(target) : s.type === 'product-start' ? builderProductStart() : s.type === 'product' && target ? builderProductForm(target) : s.type === 'theme' && target ? themeForm(target) : '<p class="muted">左の一覧から選んでください。</p>';
      }
      paint();
      on('oms:builder', function (detail) { if (!detail || detail.form) paint(); });
    }
