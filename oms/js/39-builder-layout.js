// Luna Luce OMS 部品JS: 39-builder-layout（商品ページの段組み）
// 2.30 で追加。商品ページの「写真の右（スマホでは購入ボタンの下）」と「写真の下（横幅いっぱい）」に何をどの順で出すかを決める。
// 2.31: お届けまでの日数（delivery）と購入欄（buy）も部品に。購入欄は写真の右に必須。枠は実際のページと同じ形（左に写真・右に写真の右・下に写真の下）で並べ、ドラッグでも移せる。
// 全商品の決まり → 書き出しの productLayout（サイトの site-src/product-layout.json）。
// 商品ごとに変えるとき → 商品の layout（同じ形 { side, below }）。SNSでシェアは全ページ共通の必須部品なので外せない。
    const LAYOUT_PARTS = [
      ['delivery', 'お届けまでの日数'], ['buy', '購入欄（数量・カートに入れる）'], ['description', '商品の説明'], ['spec', '内容量・サイズなどの表'], ['notes', 'ご注文の前に（注意事項）'], ['source', '本店の商品情報へのリンク'],
      ['recommend', 'こちらもおすすめ（ほかの商品）'], ['share', 'SNSでシェア'], ['trial', '名入れを試せる商品']
    ];
    const LAYOUT_DEFAULT = { side: ['delivery', 'buy', 'description', 'spec', 'notes', 'source'], below: ['recommend', 'share', 'trial'] };
    function builderLayoutLabel(id) { const x = LAYOUT_PARTS.find(function (p) { return p[0] === id; }); return x ? x[1] : id; }
    function builderLayoutClean(l) {
      const ok = LAYOUT_PARTS.map(function (p) { return p[0]; });
      const seen = {};
      const pick = function (list) { return (Array.isArray(list) ? list : []).filter(function (id) { if (ok.indexOf(id) < 0 || seen[id]) return false; seen[id] = true; return true; }); };
      const old = l && Array.isArray(l.side) && (l.side.concat(l.below || [])).every(function (id) { return id !== 'buy' && id !== 'delivery'; });
      const out = { side: pick(old ? ['delivery', 'buy'].concat(l.side) : l && l.side), below: pick(l && l.below) };
      // 2.30 までの並び（お届け日数・購入欄が無い）は、上に足す
      if (out.below.indexOf('buy') >= 0) out.below.splice(out.below.indexOf('buy'), 1);
      if (out.side.indexOf('buy') < 0) out.side.unshift('buy');
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
    // 並べ替えの画面（scope: page = 全商品 / product = この商品だけ）。実際のページと同じ形に並べる
    function builderLayoutEditor(l, scope) {
      const col = function (where, title, hint) {
        const list = l[where];
        return '<div class="lay-col lay-at-' + where + '"><h4>' + title + '</h4><p class="muted">' + hint + '</p><ol class="lay-list" data-lay-drop="' + where + '" data-scope="' + scope + '">' + (list.length ? list.map(function (id, i) {
          const other = where === 'side' ? 'below' : 'side';
          const at = ' data-scope="' + scope + '" data-where="' + where + '" data-i="' + i + '"';
          return '<li draggable="true" data-lay-drag="1"' + at + (id === 'buy' ? ' class="is-fixed"' : '') + '><span class="lay-grip" aria-hidden="true">⠿</span><span class="lay-name">' + escapeHtml(builderLayoutLabel(id)) + (id === 'buy' ? '<small>（写真の右に必ず出します）</small>' : '') + '</span><span class="lay-tools">' +
            '<button type="button" data-b="lay-move"' + at + ' data-dir="-1" aria-label="上へ"' + (i ? '' : ' disabled') + '>↑</button>' +
            '<button type="button" data-b="lay-move"' + at + ' data-dir="1" aria-label="下へ"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button>' +
            (id === 'buy' ? '' : '<button type="button" data-b="lay-swap"' + at + '>' + (other === 'below' ? '写真の下へ' : '写真の右へ') + '</button>') +
            (id === 'share' || id === 'buy' ? '' : '<button type="button" data-b="lay-hide"' + at + '>出さない</button>') +
            '</span></li>';
        }).join('') : '<li class="muted">ここには何も出しません（ここへドラッグで移せます）</li>') + '</ol></div>';
      };
      const hidden = builderLayoutHidden(l);
      return '<p class="muted lay-how">項目は ↑↓ とボタンのほか、つかんで（ドラッグで）別の枠へも移せます。</p><div class="lay-cols"><div class="lay-col lay-at-photo"><div class="lay-photo-ph">写真</div><p class="muted">商品名・値段は写真の右のいちばん上に出ます</p></div>' +
        col('side', '写真の右', 'スマホでは写真の下に、この順で出ます') + col('below', '写真の下（横幅いっぱい）', 'おすすめ商品やSNSなど') + '</div>' +
        (hidden.length ? '<p class="lay-hidden">出さない部品: ' + hidden.map(function (id) { return '<button type="button" data-b="lay-show" data-scope="' + scope + '" data-id="' + id + '">＋ ' + escapeHtml(builderLayoutLabel(id)) + '</button>'; }).join('') + '</p>' : '') +
        '<p class="muted">「SNSでシェア」は全ページ共通の部品なので、外せません（場所は変えられます）。「購入欄」は写真の右のどこかに必ず出します。</p>';
    }
    // ドラッグで移す（同じ枠の中の並べ替えも、写真の右⇔写真の下も）
    function builderLayoutMoveTo(l, from, i, to, j) {
      const id = l[from][i];
      if (id === undefined || (id === 'buy' && to !== 'side')) return false;
      l[from].splice(i, 1);
      if (from === to && j > i) j -= 1;
      l[to].splice(Math.max(0, Math.min(j, l[to].length)), 0, id);
      return true;
    }
    function builderLayoutDnd(host) {
      let drag = null;
      host.addEventListener('dragstart', function (event) {
        const li = event.target.closest && event.target.closest('[data-lay-drag]');
        if (!li) return;
        drag = { scope: li.dataset.scope, where: li.dataset.where, i: Number(li.dataset.i) };
        event.dataTransfer.effectAllowed = 'move';
        try { event.dataTransfer.setData('text/plain', 'lay'); } catch (e) { /* 古いブラウザ */ }
        li.classList.add('is-dragging');
      });
      host.addEventListener('dragend', function () { drag = null; host.querySelectorAll('.lay-drop-over').forEach(function (x) { x.classList.remove('lay-drop-over'); }); });
      host.addEventListener('dragover', function (event) {
        const ol = drag && event.target.closest && event.target.closest('[data-lay-drop]');
        if (!ol || ol.dataset.scope !== drag.scope) return;
        event.preventDefault();
        host.querySelectorAll('.lay-drop-over').forEach(function (x) { if (x !== ol) x.classList.remove('lay-drop-over'); });
        ol.classList.add('lay-drop-over');
      });
      host.addEventListener('drop', function (event) {
        const ol = drag && event.target.closest && event.target.closest('[data-lay-drop]');
        if (!ol || ol.dataset.scope !== drag.scope) return;
        event.preventDefault();
        const l = builderLayoutTarget(drag.scope);
        const to = ol.dataset.layDrop;
        const li = event.target.closest('[data-lay-drag]');
        let j = l[to].length;
        if (li && li.dataset.where === to) { const r = li.getBoundingClientRect(); j = Number(li.dataset.i) + (event.clientY > r.top + r.height / 2 ? 1 : 0); }
        const ok = l && builderLayoutMoveTo(l, drag.where, drag.i, to, j);
        drag = null;
        if (ok) builderChanged(true); else showToast('購入欄は写真の右に置きます。');
      });
    }
    function builderLayoutForm() {
      const l = builderPageLayout();
      return '<h2>商品ページの段組み</h2><p class="lead">商品ページに何をどの順で出すかを決めます。全部の商品に効きます。1つの商品だけ変えたいときは、その商品の編集画面の「この商品のページの並び」で変えます。</p>' +
        builderLayoutEditor(l, 'page') + '<div class="row"><button type="button" data-b="lay-reset" data-scope="page">最初の並びに戻す</button></div>';
    }
    // 右の見え方: 商品ページの骨組み
    function builderLayoutPreview(l) {
      l = l || builderPageLayout();
      const box = function (id) { return '<div class="lay-box lay-' + id + (id === 'buy' ? ' lay-fixed' : '') + '">' + escapeHtml(builderLayoutLabel(id)) + '</div>'; };
      return '<p class="pv-note">商品ページの骨組み（パソコン）</p><div class="lay-pv"><div class="lay-top"><div class="lay-photo">写真</div><div class="lay-info"><div class="lay-box lay-fixed">商品名・値段</div>' + l.side.map(box).join('') + '</div></div>' + l.below.map(box).join('') + '</div>';
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
      if (name === 'lay-swap') { if (l[where][i] !== 'buy') { const x = l[where].splice(i, 1)[0]; l[where === 'side' ? 'below' : 'side'].push(x); } }
      if (name === 'lay-hide') { if (l[where][i] !== 'share' && l[where][i] !== 'buy') l[where].splice(i, 1); }
      if (name === 'lay-show') { const id = el.dataset.id; if (l.side.concat(l.below).indexOf(id) < 0) { if (['recommend', 'share', 'trial'].indexOf(id) >= 0) l.below.push(id); else if (id === 'delivery') l.side.splice(Math.max(0, l.side.indexOf('buy')), 0, id); else l.side.push(id); } }
      builderChanged(true);
      return true;
    }
    // 商品の「この商品だけ並びを変える」スイッチ
    function builderLayoutSwitch(p, on) {
      if (on) p.layout = builderLayoutClean(builderPageLayout());
      else delete p.layout;
    }
