// Luna Luce OMS 部品JS: 31-builder-history（元に戻す・やり直す）
// サイトビルダーで触ったことを1つずつ前に戻せる・戻したのをやり直せる。
// 変えるたびに（builderSave のたび）変える前の形を覚える。文字を打っている間・つまみを動かしている間は1回分にまとめる。
// 覚えるのはこの画面を開いている間だけ（最大60回分）。「変更を取り消す」（サイトの今の内容に戻す）も元に戻せる。
// キーボード: Ctrl+Z（Macは⌘Z）で元に戻す、Ctrl+Shift+Z または Ctrl+Y でやり直す（文字を打っている欄の中では使わない）。
    const BUILDER_HIST_MAX = 60;
    function builderHistData() {
      const b = state.builder;
      return JSON.stringify({ themes: b.themes.filter(function (t) { return !t.builtIn; }), cards: b.cards, notices: b.notices, stock: b.stock, newProducts: b.newProducts, newCats: b.newCats, catNames: b.catNames, noteTemplates: b.noteTemplates, days: b.days, news: b.news, sections: b.sections, listing: b.listing, plans: b.plans, links: b.links });
    }
    function builderHist() {
      const b = state.builder;
      if (!b.hist) b.hist = { undo: [], redo: [], cur: '', sel: null, at: 0 };
      return b.hist;
    }
    // 読み込みが終わったとき: いまの形を起点にする（それまでの戻り先は残す）
    function builderHistStart() {
      const h = builderHist();
      h.cur = builderHistData();
      h.sel = cloneData(state.builder.sel);
      h.at = 0;
    }
    function builderHistTyping() {
      const el = document.activeElement;
      if (!el) return false;
      if (el.tagName === 'TEXTAREA') return true;
      return el.tagName === 'INPUT' && /^(text|search|number|range|url|email|tel|color)$/.test(el.type || 'text');
    }
    // builderSave から呼ぶ: 変わっていたら前の形を戻り先に積む
    function builderHistRecord() {
      const b = state.builder;
      if (!b.ready) return;
      const h = builderHist();
      const now = builderHistData();
      if (now === h.cur) return;
      const t = Date.now();
      const merge = h.at && t - h.at < 1200 && builderHistTyping() && h.undo.length;
      if (!merge && h.cur) {
        h.undo.push({ data: h.cur, sel: cloneData(h.actSel || b.sel) }); // 触った場所（押したときに選んでいた部品）に戻る
        if (h.undo.length > BUILDER_HIST_MAX) h.undo.shift();
      }
      h.redo = [];
      h.cur = now;
      h.sel = cloneData(b.sel);
      h.at = builderHistTyping() ? t : 0;
    }
    // 「変更を取り消す」の前に呼ぶ（取り消しも元に戻せるように）
    function builderHistBeforeReset() {
      const h = builderHist();
      if (!h.cur) return;
      h.undo.push({ data: h.cur, sel: cloneData(state.builder.sel) });
      if (h.undo.length > BUILDER_HIST_MAX) h.undo.shift();
      h.redo = [];
      h.cur = '';
    }
    function builderHistApply(entry) {
      const b = state.builder;
      const d = JSON.parse(entry.data);
      b.themes = b.themes.filter(function (t) { return t.builtIn; }).concat(d.themes || []);
      b.cards = d.cards; b.notices = d.notices; b.stock = d.stock; b.newProducts = d.newProducts; b.newCats = d.newCats; b.catNames = d.catNames || {}; b.noteTemplates = d.noteTemplates || null;
      b.days = d.days; b.news = d.news || []; b.sections = d.sections || b.sections; b.listing = d.listing; b.plans = d.plans; b.links = d.links;
      b.templatesById = null; b.plansIndex = null;
      const sel = entry.sel || { type: 'ticker', index: 0 };
      const len = { card: b.cards.length, theme: b.themes.length, product: b.newProducts.length, plan: b.plans.length }[sel.type];
      b.sel = len !== undefined && sel.index >= len ? { type: 'ticker', index: 0 } : sel;
      b.slotSwap = null;
    }
    function builderHistStep(dir) {
      const b = state.builder;
      if (!b.ready) return false;
      const h = builderHist();
      const from = dir < 0 ? h.undo : h.redo;
      const to = dir < 0 ? h.redo : h.undo;
      if (!from.length) { showToast(dir < 0 ? 'これより前には戻れません。' : 'やり直せる操作がありません。'); return false; }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      to.push({ data: h.cur || builderHistData(), sel: cloneData(b.sel) });
      const entry = from.pop();
      builderHistApply(entry);
      h.cur = entry.data;
      h.sel = cloneData(b.sel);
      h.at = 0;
      try { localStorage.setItem(BUILDER_STORE_KEY, builderSnapshot()); } catch (e) { /* 保存できない環境では何もしない */ }
      emit('oms:builder', { form: true });
      showToast(dir < 0 ? '1つ前に戻しました（あと' + h.undo.length + '回戻せます）' : 'やり直しました');
      return true;
    }
    // 左の列の上に出す「元に戻す・やり直す」
    function builderHistBar() {
      const h = builderHist();
      return '<div class="hist-bar"><button type="button" data-b="hist-undo"' + (h.undo.length ? '' : ' disabled') + ' title="Ctrl+Z / ⌘Z">↶ 元に戻す' + (h.undo.length ? '<small>' + h.undo.length + '</small>' : '') + '</button><button type="button" data-b="hist-redo"' + (h.redo.length ? '' : ' disabled') + ' title="Ctrl+Shift+Z / Ctrl+Y">↷ やり直す' + (h.redo.length ? '<small>' + h.redo.length + '</small>' : '') + '</button></div>';
    }
    function builderHistAction(name) {
      // 押したときに選んでいた部品を覚えておく（カードを消したあと戻すと、そのカードを選んだ形に戻るように）
      const h = builderHist();
      h.actSel = cloneData(state.builder.sel);
      setTimeout(function () { h.actSel = null; }, 0);
      if (name === 'hist-undo') { builderHistStep(-1); return true; }
      if (name === 'hist-redo') { builderHistStep(1); return true; }
      return false;
    }
    document.addEventListener('keydown', function (event) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const panel = document.querySelector('[data-part="builder-list"]');
      if (!panel || !panel.offsetParent || !state.builder.ready) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|range|date)$/.test(el.type)) || el.isContentEditable)) return;
      event.preventDefault();
      builderHistStep(key === 'y' || event.shiftKey ? 1 : -1);
    });
