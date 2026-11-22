// Luna Luce OMS 部品JS: 51-fuzzy（あいまい検索。統合受注の検索・候補、作業ログの検索で使う）
// 全角半角・大文字小文字・カタカナひらがなの違いと、空白・記号（- ・ & ♡ など）を気にしない。
// 空白で区切った言葉は全部ふくむものだけ（順番は問わない）。4文字以上の言葉は1文字の打ち間違い（抜け・余分・ちがい）まで拾う。
// サーバーの作業ログ（ops/vps/oms-app/work.js）も同じ決まり。片方を直したらもう片方も直す（tools/fuzzy.test.cjs で確かめる）。
    function fuzzyFold(s) {
      return String(s == null ? '' : s).normalize('NFKC').toLowerCase()
        .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
        .replace(/[\s\-‐‑–—―ー・_/.,，、。:：;'"`()（）［］\[\]「」『』&＆+＋♡♥☆★~〜!！?？#＃]/g, '');
    }
    function fuzzyWords(q) {
      return String(q || '').normalize('NFKC').split(/\s+/).map(fuzzyFold).filter(Boolean);
    }
    function fuzzyNear(a, b) {
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0, j = 0, miss = 0;
      while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++miss > 1) return false;
        if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
      }
      return miss + (a.length - i) + (b.length - j) <= 1;
    }
    function fuzzyHitWord(hay, w) {
      if (hay.indexOf(w) >= 0) return true;
      if (w.length < 4) return false;
      for (let len = w.length - 1; len <= w.length + 1; len++) {
        for (let i = 0; i + len <= hay.length; i++) if (fuzzyNear(hay.slice(i, i + len), w)) return true;
      }
      return false;
    }
    // text に q（言葉の並び、または fuzzyWords の結果）が全部ふくまれるか
    function fuzzyMatch(text, q) {
      const ws = Array.isArray(q) ? q : fuzzyWords(q);
      if (!ws.length) return true;
      const hay = fuzzyFold(text);
      return ws.every(function (w) { return fuzzyHitWord(hay, w); });
    }
    // 注文を探すときに見る文字（作業員には住所・電話を入れない）
    function orderSearchText(order) {
      const parts = [order.id, order.customerName, order.coupleNames, order.productName, order.sku, order.campaignMark || '', order.channelLabel];
      if (!piiHidden()) parts.push(order.shippingTo);
      return parts.join(' ');
    }
    // 統合受注の検索欄の下に出す候補（最大8件）。押すとその注文の明細が開く
    function renderSearchSuggest(input) {
      const wrap = input.closest('.search-wrap');
      if (!wrap) return;
      let box = wrap.querySelector('.fz-suggest');
      if (!box) { box = document.createElement('div'); box.className = 'fz-suggest'; box.setAttribute('role', 'listbox'); wrap.appendChild(box); }
      const ws = fuzzyWords(input.value);
      const hits = ws.length ? state.orders.filter(function (o) { return fuzzyMatch(orderSearchText(o), ws); }).slice(0, 8) : [];
      box.hidden = !hits.length || document.activeElement !== input;
      box.innerHTML = hits.map(function (o) {
        return '<button type="button" role="option" data-action="open-order" data-id="' + escapeHtml(o.id) + '"><b>' + escapeHtml(o.id) + '</b><span>' + escapeHtml(o.productName) + '</span><small>' + escapeHtml([o.coupleNames, o.customerName ? o.customerName + ' 様' : '', o.sku].filter(Boolean).join('　')) + '</small></button>';
      }).join('');
    }
    // 検索欄から離れたら候補を閉じる（候補を押す時間を少し待つ）
    document.addEventListener('focusout', function (event) {
      if (!event.target.matches || !event.target.matches('[data-action="search"]')) return;
      setTimeout(function () { const box = event.target.closest('.search-wrap') && event.target.closest('.search-wrap').querySelector('.fz-suggest'); if (box) box.hidden = true; }, 200);
    });
    if (typeof module !== 'undefined') module.exports = { fuzzyFold: fuzzyFold, fuzzyWords: fuzzyWords, fuzzyMatch: fuzzyMatch };
