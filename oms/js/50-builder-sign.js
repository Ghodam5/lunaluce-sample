// Luna Luce OMS 部品JS: 50-builder-sign（サイトビルダー「いちばん上の看板」: トップの最初に出る大きなカード）
// 形: 写真・バッジ・見出し（強調する言葉は色が変わる）・説明・ボタン2つ。サイトの site-src/home-promos/*.json の kind: "message"（tools/home-message.cjs）と同じ形。
// 看板は「トップのカード」とは別の枠で並べ、サイトではいつもトップのカードより前（左）に出る。最初の1枚の見出しがページの見出し（h1）になる。
    const SIGN_BTN_STYLES = [
      { id: 'main', label: '目立つボタン（コーラル色）' },
      { id: 'sub', label: '控えめなボタン（白地に緑の線）' }
    ];
    // ページの中の行き先（#印）。サイトのトップにある場所だけ
    const SIGN_ANCHORS = [{ href: '#rank', label: 'トップの売れ筋ランキング' }];

    function builderIsSign(card) { return !!card && card.kind === 'message'; }
    function builderSignFlat(card) { return String(card.headline || '').replace(/\n/g, ''); }
    // 一覧やエラーで使う呼び名（title）は見出しから自動で付ける。サイトには書き出さない
    function builderSignSyncTitle(card) { if (builderIsSign(card)) card.title = builderSignFlat(card); }
    // 見出しの中で強調する言葉の場所（改行は飛ばして探す。サイトの tools/home-message.cjs と同じ決まり）
    function builderSignAccentRange(headline, accent) {
      const a = String(accent || '').replace(/\n/g, '');
      if (!a) return null;
      const pos = [];
      let flat = '';
      for (let i = 0; i < headline.length; i++) if (headline[i] !== '\n') { pos.push(i); flat += headline[i]; }
      const at = flat.indexOf(a);
      return at < 0 ? null : [pos[at], pos[at + a.length - 1] + 1];
    }
    function builderSignHeadlineHtml(headline, accent) {
      const h = String(headline || '');
      const r = builderSignAccentRange(h, accent);
      const lines = function (s) { return escapeHtml(s).replace(/\n/g, '<br>'); };
      if (!r) return lines(h);
      return lines(h.slice(0, r[0])) + '<span>' + lines(h.slice(r[0], r[1])) + '</span>' + lines(h.slice(r[1]));
    }
    function builderSignHrefOk(href) {
      return builderLocalLink(href) || SIGN_ANCHORS.some(function (a) { return a.href === href; });
    }
    function builderSignNew(list) {
      const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      return { id: builderUniqueId('sign-' + day, list), active: false, kind: 'message', theme: 'cream', image: '', alt: '', badge: '', headline: '', accent: '', text: '', title: '',
        buttons: [{ label: '', href: '', style: 'main' }, { label: '', href: '', style: 'sub' }] };
    }
    function builderSignErrors(card) {
      const out = [];
      if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(card.id)) out.push('看板の名前（英小文字・数字・-）を確認してください');
      if (state.builder.cards.filter(function (c) { return c.id === card.id; }).length > 1) out.push('同じ名前の看板があります');
      if (!String(card.headline || '').trim()) out.push('見出しを入れてください');
      if (String(card.headline || '').length > 80) out.push('見出しは80文字までにしてください');
      if (card.accent && !builderSignAccentRange(String(card.headline || ''), card.accent)) out.push('強調する言葉が見出しの中にありません。見出しの言葉をそのまま入れてください');
      if (!String(card.text || '').trim()) out.push('説明を入れてください');
      if (String(card.badge || '').length > 30) out.push('バッジは30文字までにしてください');
      if (!card.image || !builderImageOk(card.image)) out.push('写真を選んでください');
      if (!state.builder.themes.some(function (t) { return t.id === card.theme && t.builtIn; })) out.push('色は標準のテーマから選んでください');
      const btns = card.buttons || [];
      if (!btns.length) out.push('ボタンを1つ以上入れてください');
      btns.forEach(function (b, i) {
        const n = 'ボタン' + (i + 1) + ': ';
        if (!String(b.label || '').trim()) out.push(n + '文字を入れてください');
        if (!builderSignHrefOk(b.href)) out.push(n + '押したときに開くページを選んでください');
      });
      return out.concat(builderPeriodErrors(card, false));
    }
    // 書き出し（サイトの形に合わせる。空のバッジ・写真の説明は書かない。呼び名 title は書かない）
    function builderSignExport(out) {
      delete out.title; delete out.imageHeight; delete out.useImage;
      if (!String(out.badge || '').trim()) delete out.badge;
      if (!String(out.alt || '').trim()) delete out.alt;
      if (!String(out.accent || '').trim()) delete out.accent;
      return out;
    }

    // 編集欄
    function builderSignForm(card) {
      const choices = Array.from(new Set(builderImageChoices().concat(card.image ? [card.image] : [])));
      const archived = builderHiddenImages();
      const tiles = choices.filter(function (src) { return src === card.image || archived.indexOf(src) < 0; }).map(function (src) { return builderImgTile(src, src === card.image); }).join('');
      const btns = (card.buttons || []).map(function (btn, i) {
        const anchors = SIGN_ANCHORS.map(function (a) { return '<button type="button" class="' + (btn.href === a.href ? 'is-on' : '') + '" data-b="link-set" data-field="buttons.' + i + '.href" data-href="' + escapeHtml(a.href) + '">' + escapeHtml(a.label) + 'へ</button>'; }).join('');
        return '<li class="sign-btn"><div class="row"><b class="tile-no">' + (i + 1) + '</b>' + builderField('ボタンの文字', 'buttons.' + i + '.label', btn.label, { max: 30, placeholder: i === 0 ? '例: 名入れを試してみる' : '例: 売れ筋を見る' }) + '</div>' +
          '<div class="sign-styles" role="radiogroup" aria-label="ボタンの色">' + SIGN_BTN_STYLES.map(function (s) {
            return '<button type="button" role="radio" aria-checked="' + (btn.style === s.id) + '" class="sign-style ' + s.id + (btn.style === s.id ? ' is-on' : '') + '" data-b="sign-btn-style" data-btn="' + i + '" data-style="' + s.id + '">' + escapeHtml(s.label) + '</button>';
          }).join('') + '</div>' +
          builderLinkPicker('押したときに開くページ', 'buttons.' + i + '.href', btn.href, false) +
          '<div class="row sign-anchors"><small>トップの中へ飛ばすとき:</small>' + anchors + '</div>' +
          '<div class="row"><span class="tools"><button type="button" data-b="sign-btn-move" data-btn="' + i + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-b="sign-btn-move" data-btn="' + i + '" data-dir="1"' + (i === card.buttons.length - 1 ? ' disabled' : '') + '>↓</button>' +
          (card.buttons.length > 1 ? '<button type="button" data-b="sign-btn-remove" data-btn="' + i + '">このボタンを外す</button>' : '') + '</span></div></li>';
      }).join('');
      return '<h2>いちばん上の看板</h2><p class="lead">トップを開いて最初に見える大きなカードです。「トップのカード」より前（左）に出ます。上の看板の見出しが、トップページの見出しとして検索にも使われます。</p>' +
        '<div class="row">' + builderSwitch('トップに表示する', 'active', card.active) + '<span class="tools"><button type="button" data-b="card-copy">複製</button><button type="button" data-b="card-remove">この看板を削除</button></span></div>' +
        '<h3>写真</h3>' + builderImportButton('card') + '<div class="img-grid">' + tiles + '</div>' +
        builderField('写真の説明（目の見えない方の読み上げ用・任意）', 'alt', card.alt, { wide: true, max: 120, placeholder: '例: 水引の箱に入ったシフォンケーキと、披露宴のテーブル' }) +
        '<h3>文字</h3>' +
        builderField('バッジ（左上の丸い札・任意）', 'badge', card.badge, { max: 30, placeholder: '例: 10個からお名入れOK' }) +
        builderField('見出し', 'headline', card.headline, { wide: true, area: true, max: 80, placeholder: 'ゲストの数だけ、\n名前入りの\nありがとうを。', hint: '改行したところで、サイトでも改行します' }).replace('rows="2"', 'rows="4"') +
        builderField('色を変える言葉', 'accent', card.accent, { wide: true, max: 80, placeholder: '例: 名前入りのありがとう', hint: '見出しの中の言葉をそのまま入れると、そこだけコーラル色になります（改行はまたいでも大丈夫）。空なら全部いつもの色' }) +
        builderField('説明', 'text', card.text, { wide: true, area: true, max: 160, placeholder: '例: 結婚式・発表会・部活の記念品に。カートでお名前を入れるだけ。' }) +
        '<h3>ボタン（1〜2つ）</h3><ol class="sign-btns">' + btns + '</ol>' +
        (card.buttons.length < 2 ? '<button type="button" class="add" data-b="sign-btn-add">＋ ボタンを足す</button>' : '') +
        '<h3>カードの色</h3>' + builderSignThemes(card) +
        '<h3>表示する期間</h3>' + builderPeriod(card, '', false);
    }
    // 色（サイトに色の用意がある標準のテーマだけ）
    function builderSignThemes(card) {
      return '<div class="themes" role="radiogroup" aria-label="カードの色">' + state.builder.themes.filter(function (t) { return t.builtIn; }).map(function (t) {
        const on = t.id === card.theme;
        return '<button type="button" role="radio" aria-checked="' + on + '" class="theme' + (on ? ' is-on' : '') + '" data-b="card-theme" data-theme="' + escapeHtml(t.id) + '" style="background:' + escapeHtml(t.background) + ';border-top-color:' + escapeHtml(t.top) + ';color:' + escapeHtml(t.accent) + '">' + escapeHtml(t.name) + '</button>';
      }).join('') + '</div>';
    }
    // 右の見本（サイトの看板の形に寄せた簡易表示）
    function builderSignPreview(card) {
      const t = builderTheme(card.theme);
      const style = 'background:' + t.background + ';border-color:' + t.border + ';border-top-color:' + t.top;
      return '<article class="pv-card pv-sign" style="' + escapeHtml(style) + '">' +
        (card.image ? '<div class="pv-sign-ph"><img src="' + escapeHtml(builderImg(card.image)) + '" alt=""></div>' : '<div class="pv-sign-ph pv-empty">写真を選ぶ</div>') +
        '<div class="pv-sign-tx">' + (String(card.badge || '').trim() ? '<span class="pv-pill">' + escapeHtml(card.badge) + '</span>' : '') +
        '<h4>' + (String(card.headline || '').trim() ? builderSignHeadlineHtml(card.headline, card.accent) : '見出し') + '</h4>' +
        '<p>' + escapeHtml(card.text || '説明') + '</p>' +
        '<div class="pv-sign-btns">' + (card.buttons || []).map(function (b) { return '<span class="' + (b.style === 'sub' ? 'wh' : 'co') + '">' + escapeHtml(b.label || 'ボタン') + '</span>'; }).join('') + '</div></div></article>';
    }
    // 看板のボタンの操作（23-builder-tab の builderAction から呼ぶ）
    function builderSignAction(name, el) {
      const b = state.builder;
      const card = b.sel.type === 'card' ? builderSelected() : null;
      if (!builderIsSign(card) || name.indexOf('sign-btn') !== 0) return false;
      const i = Number(el.dataset.btn);
      if (name === 'sign-btn-style') { card.buttons[i].style = el.dataset.style; builderChanged(true); return true; }
      if (name === 'sign-btn-add') { if (card.buttons.length < 2) { card.buttons.push({ label: '', href: '', style: card.buttons.some(function (x) { return x.style === 'main'; }) ? 'sub' : 'main' }); builderChanged(true); } return true; }
      if (name === 'sign-btn-remove') { if (card.buttons.length > 1) { card.buttons.splice(i, 1); builderChanged(true); } return true; }
      if (name === 'sign-btn-move') { if (builderMove(card.buttons, i, Number(el.dataset.dir)) !== false) builderChanged(true); return true; }
      return true;
    }
    // 並べ替え: 看板は看板どうし、カードはカードどうしで入れ替える
    function builderCardMoveInGroup(index, dir) {
      const list = state.builder.cards;
      const sign = builderIsSign(list[index]);
      let to = index + dir;
      while (to >= 0 && to < list.length && builderIsSign(list[to]) !== sign) to += dir;
      if (to < 0 || to >= list.length) return false;
      const tmp = list[index]; list[index] = list[to]; list[to] = tmp;
      return to;
    }
    // 書き出しの並び: 看板が先、そのあとトップのカード（サイトの表示の順と同じ）
    function builderCardOrder(cards) {
      return cards.filter(builderIsSign).concat(cards.filter(function (c) { return !builderIsSign(c); }));
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { builderSignAccentRange: builderSignAccentRange, builderSignHeadlineHtml: builderSignHeadlineHtml };
