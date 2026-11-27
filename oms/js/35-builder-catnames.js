// Luna Luce OMS 部品JS: 35-builder-catnames（カテゴリーの名前を変える: 大・中・小）
// 2.27 で追加。サイトに出るカテゴリーの名前だけを変える。英字の名前（URL・商品コードに使う）は変えない。
// 下書きの catNames に { 英字の名前: 新しい名前 } で持ち、書き出しの categoryNames に入る（反映ツール・Welcartの受け取りプラグインが使う）。
// 2.30: この画面からカテゴリーを足す（28 の作る画面を使う）・減らす（商品が0件のものだけ。下書きの catHidden → 書き出しの hiddenCategories）。
    const CATNAME_MAX = 20;
    function builderCatNames() {
      const b = state.builder;
      if (!b.catNames || typeof b.catNames !== 'object') b.catNames = {};
      return b.catNames;
    }
    // 大・中・小を同じ形で並べる（level, k, 親の英字, ノード）
    function builderCatNodes() {
      const out = [];
      state.builder.links.categories.forEach(function (g) {
        out.push({ level: 'g', k: g.k, node: g, set: function (v) { g.name = v; }, get: function () { return g.name; } });
        g.mids.forEach(function (m) {
          out.push({ level: 'm', k: m.k, g: g.k, node: m, set: function (v) { m.name = v; }, get: function () { return m.name; } });
          m.subs.forEach(function (s) {
            out.push({ level: 's', k: s[0], g: g.k, m: m.k, node: s, set: function (v) { s[1] = v; }, get: function () { return s[1]; } });
          });
        });
      });
      return out;
    }
    // 元の名前を覚えておき、変えた名前を一覧に当てる（読み込み・元に戻す・名前の入力のたびに呼ぶ）
    function builderApplyCatNames() {
      const names = builderCatNames();
      builderCatNodes().forEach(function (c) {
        const store = c.level === 's' ? c.node : c.node;
        if (c.level === 's') { if (store[3] === undefined) store[3] = store[1]; }
        else if (store.orig === undefined) store.orig = store.name;
        const orig = c.level === 's' ? store[3] : store.orig;
        c.set(names[c.k] ? names[c.k] : orig);
      });
    }
    function builderCatHidden() {
      const b = state.builder;
      if (!b.catHidden || typeof b.catHidden !== 'object') b.catHidden = {};
      return b.catHidden;
    }
    // そのカテゴリーに入っている商品の数（大は中の合計）。新しく作ったものは下書きの商品で数える
    function builderCatCount(c) {
      if (c.level === 's') return (c.node[2] && c.node[2].count) || 0;
      if (c.level === 'm') return (c.node.place && c.node.place.count) || 0;
      return c.node.mids.reduce(function (n, m) { return n + ((m.place && m.place.count) || 0); }, 0);
    }
    function builderCatNewIndex(c) {
      return (state.builder.newCats || []).findIndex(function (x) { return x.level === 'g' ? (c.level === 'g' && x.k === c.k) : x.level === c.level && x.k === c.k && (c.level === 'm' ? x.g === c.g : x.m === c.m); });
    }
    function builderCatTools(c) {
      const hidden = !!builderCatHidden()[c.k];
      const add = c.level === 'g' ? '<button type="button" data-b="catname-add" data-level="m" data-g="' + escapeHtml(c.k) + '">＋ 中を足す</button>' :
        c.level === 'm' ? '<button type="button" data-b="catname-add" data-level="s" data-g="' + escapeHtml(c.g) + '" data-m="' + escapeHtml(c.k) + '">＋ 小を足す</button>' : '';
      const ni = builderCatNewIndex(c);
      let del;
      if (ni >= 0) del = '<button type="button" data-b="cat-remove" data-index="' + ni + '">取り消す</button>';
      else if (hidden) del = '<button type="button" data-b="catname-show" data-k="' + escapeHtml(c.k) + '">戻す</button>';
      else {
        const n = builderCatCount(c);
        del = n ? '<button type="button" disabled title="入っている商品のカテゴリーを先に変えてください">消す（商品' + n + '件あり）</button>' : '<button type="button" class="danger" data-b="catname-hide" data-k="' + escapeHtml(c.k) + '">消す</button>';
      }
      return '<span class="cat-tools">' + add + del + '</span>';
    }
    function builderCatOrig(c) { return c.level === 's' ? (c.node[3] !== undefined ? c.node[3] : c.node[1]) : (c.node.orig !== undefined ? c.node.orig : c.node.name); }
    function builderCatRenameCount() { return Object.keys(builderCatNames()).length; }
    function builderCatNamesForm() {
      const names = builderCatNames();
      const q = (state.builder.catNameQuery || '').trim();
      const rows = state.builder.links.categories.map(function (g) {
        const field = function (c, label) {
          const orig = builderCatOrig(c);
          const changed = !!names[c.k];
          const hidden = !!builderCatHidden()[c.k];
          return '<div class="catname' + (changed ? ' is-changed' : '') + (hidden ? ' is-hidden' : '') + (c.node.isNew || (c.level === 's' && c.node[2] && c.node[2].isNew) ? ' is-new' : '') + '"><span class="lv">' + label + '</span><input type="text" data-catname="' + escapeHtml(c.k) + '" value="' + escapeHtml(names[c.k] || orig) + '" maxlength="' + CATNAME_MAX + '" aria-label="' + escapeHtml(orig) + 'の名前"' + (hidden ? ' disabled' : '') + '>' +
            (hidden ? '<small>消す予定（サイトに出しません）</small>' : '') +
            (changed ? '<small>元: ' + escapeHtml(orig) + '</small><button type="button" data-b="catname-reset" data-k="' + escapeHtml(c.k) + '">元に戻す</button>' : '') + builderCatTools(c) + '</div>';
        };
        const nodes = builderCatNodes();
        const find = function (k) { return nodes.find(function (x) { return x.k === k; }); };
        const hit = function (c) { return !q || builderCatOrig(c).indexOf(q) >= 0 || (names[c.k] || '').indexOf(q) >= 0; };
        const gc = find(g.k);
        const mids = g.mids.map(function (m) {
          const mc = find(m.k);
          const subs = m.subs.map(function (s) { const sc = find(s[0]); return hit(sc) || hit(mc) || hit(gc) ? '<li>' + field(sc, '小') + '</li>' : ''; }).join('');
          return subs || hit(mc) || hit(gc) ? '<li>' + field(mc, '中') + (subs ? '<ul>' + subs + '</ul>' : '') + '</li>' : '';
        }).join('');
        return mids || hit(gc) ? '<li class="cat-g">' + field(gc, '大') + (mids ? '<ul>' + mids + '</ul>' : '') + '</li>' : '';
      }).join('');
      const b = state.builder;
      const creator = b.catOpen && b.catFrom === 'names' ? builderCatCreator(null) : '<button type="button" class="add" data-b="catname-add" data-level="g">＋ 大カテゴリーを足す</button>';
      return '<h2>カテゴリー（大・中・小）</h2><p class="lead">名前を変える・足す・消すができます。URLや商品コードに使う英字の名前は変わりません。商品が入っているカテゴリーは、商品のカテゴリーを先に変えてから消します。</p>' +
        '<div class="catname-create">' + creator + '</div>' +
        '<label class="fld wide"><span>名前でさがす</span><input type="search" data-catname-q value="' + escapeHtml(q) + '" placeholder="例: タオル"></label>' +
        '<ul class="catnames">' + (rows || '<li class="muted">見つかりません。</li>') + '</ul>';
    }
    function builderCatNamesPreview() {
      const names = builderCatNames();
      const nodes = builderCatNodes();
      const keys = Object.keys(names);
      const hid = Object.keys(builderCatHidden());
      const added = state.builder.newCats || [];
      return '<p class="pv-note">変えた名前 ' + keys.length + '件</p>' + (keys.length ? '<ul class="pv-ul">' + keys.map(function (k) {
        const c = nodes.find(function (x) { return x.k === k; });
        return '<li>' + escapeHtml(c ? builderCatOrig(c) : k) + ' → <b>' + escapeHtml(names[k]) + '</b></li>';
      }).join('') + '</ul>' : '<p class="muted">まだ変えていません。</p>') +
        '<p class="pv-note">足したカテゴリー ' + added.length + '件・消すカテゴリー ' + hid.length + '件</p>' +
        (added.length || hid.length ? '<ul class="pv-ul">' + added.map(function (c) { return '<li>＋ ' + escapeHtml(builderCatLabel(c)) + '</li>'; }).join('') + hid.map(function (k) {
          const c = nodes.find(function (x) { return x.k === k; });
          return '<li>− ' + escapeHtml(c ? builderCatOrig(c) : k) + '</li>';
        }).join('') + '</ul>' : '');
    }
    function builderCatNamesErrors() {
      const out = [];
      const names = builderCatNames();
      Object.keys(names).forEach(function (k) {
        const v = names[k];
        if (!String(v).trim()) out.push('カテゴリーの名前（' + k + '）: 空です');
        else if (String(v).length > CATNAME_MAX) out.push('カテゴリーの名前（' + k + '）: ' + CATNAME_MAX + '文字までです');
      });
      return out;
    }
    function builderCatNamesExport() {
      const names = builderCatNames();
      return builderCatNodes().filter(function (c) { return names[c.k]; }).map(function (c) {
        const row = { level: c.level, k: c.k, name: names[c.k], before: builderCatOrig(c) };
        if (c.g) row.g = c.g;
        if (c.m) row.m = c.m;
        return row;
      });
    }
    function builderCatHiddenExport() {
      const nodes = builderCatNodes();
      return Object.keys(builderCatHidden()).map(function (k) {
        const c = nodes.find(function (x) { return x.k === k; });
        const row = { level: c ? c.level : '', k: k, name: c ? builderCatOrig(c) : k };
        if (c && c.g) row.g = c.g;
        if (c && c.m) row.m = c.m;
        return row;
      });
    }
    function builderCatNamesAction(name, el) {
      const b = state.builder;
      if (name === 'catname-add') {
        b.catOpen = true; b.catFrom = 'names';
        b.catDraft = { level: el.dataset.level, g: el.dataset.g || '', m: el.dataset.m || '' };
        emit('oms:builder', { form: true });
        setTimeout(function () { const box = document.querySelector('.catname-create'); if (box) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 0);
        return true;
      }
      if (name === 'catname-hide') {
        const c = builderCatNodes().find(function (x) { return x.k === el.dataset.k; });
        if (!c) return true;
        if (builderCatCount(c)) { showToast('商品が入っているので消せません。先に商品のカテゴリーを変えてください。'); return true; }
        builderCatHidden()[c.k] = true;
        builderChanged(true);
        showToast('「' + builderCatOrig(c) + '」を消す予定にしました。書き出すとサイトに出なくなります（「戻す」で取り消せます）。');
        return true;
      }
      if (name === 'catname-show') { delete builderCatHidden()[el.dataset.k]; builderChanged(true); return true; }
      if (name !== 'catname-reset') return false;
      delete builderCatNames()[el.dataset.k];
      builderApplyCatNames();
      builderChanged(true);
      return true;
    }
    function builderCatNamesInput(el, isChange) {
      if (el.dataset.catnameQ !== undefined) { state.builder.catNameQuery = el.value; if (!isChange) builderRepaintKeepFocus(el); return true; }
      if (el.dataset.catname === undefined) return false;
      const k = el.dataset.catname;
      const c = builderCatNodes().find(function (x) { return x.k === k; });
      if (!c) return true;
      const v = el.value.trim();
      const names = builderCatNames();
      if (!v || v === builderCatOrig(c)) delete names[k]; else names[k] = v;
      builderApplyCatNames();
      builderChanged(!!isChange);
      return true;
    }
