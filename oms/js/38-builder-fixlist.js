// Luna Luce OMS 部品JS: 38-builder-fixlist（「直すところ」をどれの話か分かる形で出し、その場で開ける・作りかけのカードは消せる）
// 2.30 で追加。2.33 で「要確認」（oms/builder-checks.json。反映は止めない）を足した。直すところの文言は 19 の builderAllErrors と同じものを、カード・商品ごとにまとめて出す。
    // 作りかけのカード: 題名・一文・ボタン・商品・特集がどれも空（「＋ 商品」などを押しただけ）
    function builderCardIsBlank(card) {
      const filled = function (v) { return String(v || '').trim() !== ''; };
      if (filled(card.title) || filled(card.text) || filled(card.cta) || filled(card.href) || filled(card.image)) return false;
      if ((card.ids || []).some(filled)) return false;
      if ((card.tiles || []).length) return false;
      return true;
    }
    function builderCardLabel(card, i) {
      if ((card.title || '').trim()) return 'トップのカード「' + card.title.trim() + '」';
      return 'トップのカード ' + (i + 1) + '枚目（題名なし' + (builderCardIsBlank(card) ? '・中身が空の作りかけ' : '') + '）';
    }
    // カード・商品ごとにまとめる。それ以外（お知らせ・営業日など）は「そのほか」にまとめる
    function builderFixGroups() {
      const b = state.builder;
      const groups = [];
      b.newProducts.forEach(function (p, i) {
        const errs = builderProductErrors(p);
        if (errs.length) groups.push({ label: (p.edit ? '編集中の商品「' : '新しい商品「') + (p.title || p.id || '商品名なし') + '」', sel: { type: 'product', index: i }, errs: errs });
      });
      b.cards.forEach(function (card, i) {
        const errs = builderCardErrors(card);
        if (errs.length) groups.push({ label: builderCardLabel(card, i), sel: { type: 'card', index: i }, errs: errs, blank: builderCardIsBlank(card), cardIndex: i });
      });
      const known = {};
      groups.forEach(function (g) { known[g.label] = true; });
      const others = builderAllErrors().filter(function (e) {
        return !/^(編集中の商品 |新しい商品 )/.test(e) && !b.cards.some(function (c) { return e.indexOf((c.title || '題名なしのカード') + ': ') === 0; });
      });
      if (others.length) groups.push({ label: 'そのほか', sel: null, errs: others });
      return groups;
    }
    function builderFixListHtml() {
      const groups = builderFixGroups();
      const total = groups.reduce(function (n, g) { return n + g.errs.length; }, 0);
      if (!total) return '<div class="pv-check"><b>確認OK</b></div>';
      const blanks = groups.filter(function (g) { return g.blank; }).length;
      return '<div class="pv-check is-bad"><b>直すところ ' + total + '件</b>' +
        (blanks ? '<p class="fix-hint">「中身が空の作りかけ」は、「＋ 商品」などを押したまま何も入れていないカードです。使わないなら「このカードを消す」で消せます（「↶ 元に戻す」で戻せます）。</p>' : '') +
        '<ol class="fix-groups">' + groups.map(function (g) {
          const tools = (g.sel ? '<button type="button" data-b="select" data-type="' + g.sel.type + '" data-index="' + g.sel.index + '">開いて直す</button>' : '') +
            (g.blank ? '<button type="button" class="danger" data-b="fix-card-del" data-index="' + g.cardIndex + '">このカードを消す</button>' : '');
          return '<li><div class="fix-head"><b>' + escapeHtml(g.label) + '</b><span class="fix-n">' + g.errs.length + '件</span>' + (tools ? '<span class="fix-tools">' + tools + '</span>' : '') + '</div>' +
            '<ul>' + g.errs.slice(0, 6).map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') + (g.errs.length > 6 ? '<li>ほか' + (g.errs.length - 6) + '件</li>' : '') + '</ul></li>';
        }).join('') + '</ol></div>';
    }

    // 要確認（oms/builder-checks.json）。反映は止めない。「確認した」はこのブラウザに覚える
    const CHECKS_DONE_KEY = 'luna-oms-builder-checks-done';
    let builderChecksList = [];
    function builderChecksDone() { try { return JSON.parse(localStorage.getItem(CHECKS_DONE_KEY) || '{}') || {}; } catch (e) { return {}; } }
    function builderChecksOpen() { const done = builderChecksDone(); return builderChecksList.filter(function (c) { return !done[c.id]; }); }
    function builderChecksLoad() {
      fetch('builder-checks.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        builderChecksList = d && Array.isArray(d.checks) ? d.checks.filter(function (c) { return c && c.id && c.text; }) : [];
        if (builderChecksList.length) emit('oms:builder', { form: false });
      }).catch(function () { /* 無くても動く */ });
    }
    function builderChecksHtml() {
      const list = builderChecksOpen();
      if (!list.length) return '';
      return '<div class="pv-check is-warn"><b>要確認 ' + list.length + '件</b><p class="fix-hint">反映は止めません。決まったら直して「確認した」を押してください。</p><ol class="fix-groups">' + list.map(function (c) {
        return '<li><div class="fix-head"><b>' + escapeHtml(c.title || c.productId || '') + '</b>' + (c.productId ? '<span class="fix-n">商品 ' + escapeHtml(c.productId) + '</span>' : '') +
          '<span class="fix-tools">' + (c.url ? '<a class="btn-link" href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener">本店で見る</a>' : '') + '<button type="button" data-b="check-done" data-id="' + escapeHtml(c.id) + '">確認した</button></span></div><p>' + escapeHtml(c.text) + '</p></li>';
      }).join('') + '</ol></div>';
    }
    function builderFixAction(name, el) {
      if (name === 'check-done') { const d = builderChecksDone(); d[el.dataset.id] = new Date().toISOString(); try { localStorage.setItem(CHECKS_DONE_KEY, JSON.stringify(d)); } catch (e) { /* 覚えられない環境 */ } emit('oms:builder', { form: false }); showToast('確認済みにしました。'); return true; }
      if (name !== 'fix-card-del') return false;
      const b = state.builder;
      const i = Number(el.dataset.index);
      const card = b.cards[i];
      if (!card || !builderCardIsBlank(card)) { showToast('中身が入っているカードは、開いてから「削除」で消してください。'); return true; }
      b.cards.splice(i, 1);
      if (b.sel.type === 'card') b.sel = { type: 'ticker', index: 0 };
      builderChanged(true);
      showToast('作りかけのカードを消しました。「↶ 元に戻す」で戻せます。');
      return true;
    }
