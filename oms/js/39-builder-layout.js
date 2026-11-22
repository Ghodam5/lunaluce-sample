// Luna Luce OMS 部品JS: 39-builder-layout（商品ページの段組み）
// 2.30 で追加。商品ページの「写真の右（スマホでは購入ボタンの下）」と「写真の下（横幅いっぱい）」に何をどの順で出すかを決める。
// 全商品の決まり → 書き出しの productLayout（サイトの site-src/product-layout.json）。
// 商品ごとに変えるとき → 商品の layout（同じ形 { side, below }）。SNSでシェアは全ページ共通の必須部品なので外せない。
    const LAYOUT_PARTS = [
      ['description', '商品の説明'], ['spec', '内容量・サイズなどの表'], ['notes', 'ご注文の前に（注意事項）'], ['source', '本店の商品情報へのリンク'],
      ['recommend', 'こちらもおすすめ（ほかの商品）'], ['share', 'SNSでシェア'], ['trial', '名入れを試せる商品']
    ];
    const LAYOUT_DEFAULT = { side: ['description', 'spec', 'notes', 'source'], below: ['recommend', 'share', 'trial'] };
    function builderLayoutLabel(id) { const x = LAYOUT_PARTS.find(function (p) { return p[0] === id; }); return x ? x[1] : id; }
    function builderLayoutClean(l) {
      const ok = LAYOUT_PARTS.map(function (p) { return p[0]; });
      const seen = {};
      const pick = function (list) { return (Array.isArray(list) ? list : []).filter(function (id) { if (ok.indexOf(id) < 0 || seen[id]) return false; seen[id] = true; return true; }); };
      const out = { side: pick(l && l.side), below: pick(l && l.below) };
      if (!seen.share) out.below.push('share');
      return out;
    }
    function builderPageLayout() {
      const b = state.builder;
      if (!b.pageLayout || !Array.isArray(b.pageLayout.side)) b.pageLayout = builderLayoutClean(b.pageLayoutBase || LAYOUT_DEFAULT);
      return b.pageLayout;
    }
    function builderLayoutHidden(l) {
      const on = l.side.concat(l.below);
      return LAYOUT_PARTS.map(function (p) { return p[0]; }).filter(function (id) { return on.indexOf(id) < 0; });
    }
    // 並べ替えの画面（scope: page = 全商品 / product = この商品だけ）
    function builderLayoutEditor(l, scope) {
      const col = function (where, title, hint) {
        const list = l[where];
        return '<div class="lay-col"><h4>' + title + '</h4><p class="muted">' + hint + '</p><ol class="lay-list">' + (list.length ? list.map(function (id, i) {
          const other = where === 'side' ? 'below' : 'side';
          return '<li><span class="lay-name">' + escapeHtml(builderLayoutLabel(id)) + '</span><span class="lay-tools">' +
            '<button type="button" data-b="lay-move" data-scope="' + scope + '" data-where="' + where + '" data-i="' + i + '" data-dir="-1" aria-label="上へ"' + (i ? '' : ' disabled') + '>↑</button>' +
            '<button type="button" data-b="lay-move" data-scope="' + scope + '" data-where="' + where + '" data-i="' + i + '" data-dir="1" aria-label="下へ"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button>' +
            '<button type="button" data-b="lay-swap" data-scope="' + scope + '" data-where="' + where + '" data-i="' + i + '">' + (other === 'below' ? '写真の下へ' : '写真の右へ') + '</button>' +
            (id === 'share' ? '' : '<button type="button" data-b="lay-hide" data-scope="' + scope + '" data-where="' + where + '" data-i="' + i + '">出さない</button>') +
            '</span></li>';
        }).join('') : '<li class="muted">ここには何も出しません</li>') + '</ol></div>';
      };
      const hidden = builderLayoutHidden(l);
      return '<div class="lay-cols">' + col('side', '写真の右', 'スマホでは購入ボタンの下に出ます') + col('below', '写真の下（横幅いっぱい）', 'おすすめ商品やSNSなど') + '</div>' +
        (hidden.length ? '<p class="lay-hidden">出さない部品: ' + hidden.map(function (id) { return '<button type="button" data-b="lay-show" data-scope="' + scope + '" data-id="' + id + '">＋ ' + escapeHtml(builderLayoutLabel(id)) + '</button>'; }).join('') + '</p>' : '') +
        '<p class="muted">「SNSでシェア」は全ページ共通の部品なので、外せません（場所は変えられます）。</p>';
    }
    function builderLayoutForm() {
      const l = builderPageLayout();
      return '<h2>商品ページの段組み</h2><p class="lead">商品ページに何をどの順で出すかを決めます。全部の商品に効きます。1つの商品だけ変えたいときは、その商品の編集画面の「この商品のページの並び」で変えます。</p>' +
        builderLayoutEditor(l, 'page') + '<div class="row"><button type="button" data-b="lay-reset" data-scope="page">最初の並びに戻す</button></div>';
    }
    // 右の見え方: 商品ページの骨組み
    function builderLayoutPreview(l) {
      l = l || builderPageLayout();
      const box = function (id) { return '<div class="lay-box lay-' + id + '">' + escapeHtml(builderLayoutLabel(id)) + '</div>'; };
      return '<p class="pv-note">商品ページの骨組み（パソコン）</p><div class="lay-pv"><div class="lay-top"><div class="lay-photo">写真</div><div class="lay-info"><div class="lay-box lay-fixed">商品名・値段・お届け日数・カートに入れる</div>' + l.side.map(box).join('') + '</div></div>' + l.below.map(box).join('') + '</div>';
    }
    // 商品の編集画面に出す「この商品のページの並び」
    function builderLayoutBlock(p) {
      const own = !!(p.layout && Array.isArray(p.layout.side));
      return '<h3>この商品のページの並び</h3>' + builderSwitchRaw('この商品だけ並びを変える（切ると全商品の並びに戻ります）', 'data-layown', own) +
        (own ? builderLayoutEditor(p.layout, 'product') : '<p class="muted">いまは全商品の並び（サイトビルダー「商品ページの段組み」）を使っています。</p>');
    }
    function builderLayoutRow(p) { return p.layout && Array.isArray(p.layout.side) ? { layout: builderLayoutClean(p.layout) } : {}; }
    function builderLayoutExport() { const l = builderPageLayout(); return { side: l.side.slice(), below: l.below.slice() }; }
    function builderLayoutTarget(scope) {
      if (scope === 'product') { const p = state.builder.sel.type === 'product' ? builderSelected() : null; return p && p.layout ? p.layout : null; }
      return builderPageLayout();
    }
    function builderLayoutAction(name, el) {
      if (!/^lay-/.test(name)) return false;
      const scope = el.dataset.scope;
      if (name === 'lay-reset') { state.builder.pageLayout = builderLayoutClean(LAYOUT_DEFAULT); builderChanged(true); return true; }
      const l = builderLayoutTarget(scope);
      if (!l) return true;
      const where = el.dataset.where, i = Number(el.dataset.i);
      if (name === 'lay-move') { const to = i + Number(el.dataset.dir); if (to >= 0 && to < l[where].length) { const x = l[where].splice(i, 1)[0]; l[where].splice(to, 0, x); } }
      if (name === 'lay-swap') { const x = l[where].splice(i, 1)[0]; l[where === 'side' ? 'below' : 'side'].push(x); }
      if (name === 'lay-hide') { if (l[where][i] !== 'share') l[where].splice(i, 1); }
      if (name === 'lay-show') { const id = el.dataset.id; if (l.side.concat(l.below).indexOf(id) < 0) (['recommend', 'share', 'trial'].indexOf(id) >= 0 ? l.below : l.side).push(id); }
      builderChanged(true);
      return true;
    }
    // 商品の「この商品だけ並びを変える」スイッチ
    function builderLayoutSwitch(p, on) {
      if (on) p.layout = builderLayoutClean(builderPageLayout());
      else delete p.layout;
    }
