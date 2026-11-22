// Luna Luce OMS 部品JS: 44-option-catalog（受注明細の「のし・包装の見本一覧」。普段は畳んでおき、押したときだけ開く）
// 見本の中身は下の OPTION_CATALOG だけを直せば変わる。画像は images/ の本店サイトと同じもの。
    const OPTION_CATALOG = [
      { id: 'noshi', title: 'のし', note: '表書き（寿・内祝など）は上、お名前は下に入ります。大きな商品はたんざくのし。', items: [
        { file: 'opt-noshi-musubikiri.jpg', label: '結び切り（婚礼）', test: /結び切り|結切/ },
        { file: 'opt-noshi-chou.jpg', label: '蝶結び（一般）', test: /蝶結び/ },
        { file: 'opt-noshi-heart.jpg', label: 'ハートのし', test: /ハート/ },
        { file: 'opt-nosi-tanzaku.jpg', label: 'たんざくのし', test: /たんざく|短冊/ }
      ] },
      { id: 'wrap', title: '包装紙', note: '型番に「dol」が入る商品（ウェイトドール）は包装紙おまかせ。', items: [
        ['01', 'ブラウン'], ['02', 'ブルー'], ['03', 'ピンク'], ['04', '花畑'], ['05', 'オリビア'], ['06', 'ブルックリン'],
        ['07', '桜'], ['08', 'オレンジ'], ['09', 'ゴールドスター'], ['10', 'うぐいす'], ['11', '鶴'], ['12', '金銀振り白']
      ].map(function (w) { return { file: 'opt-wrap-' + w[0] + '.jpg', label: w[0] + w[1], test: new RegExp(w[1]) }; }) },
      { id: 'bag', title: '小袋・紙袋', note: '小袋は1枚5円、ギフト用紙袋は1枚50円。', items: [
        { file: 'opt-bag-sakura.jpg', label: '小袋 さくら', test: /さくら/ },
        { file: 'opt-bag-lace.jpg', label: '小袋 レース', test: /レース/ },
        { file: 'opt-bag-bear.jpg', label: '小袋 キャンディベア', test: /キャンディベア/ },
        { file: 'opt-bag-natural.jpg', label: '小袋 ナチュラルバイン', test: /ナチュラルバイン/ },
        { file: 'opt-minibag.jpg', label: '小袋 季節限定', test: /季節限定/ },
        { file: 'opt-giftbag.jpg', label: 'ギフト用紙袋', test: /紙袋/ }
      ] }
    ];
    // 注文の文字（のし・包装の欄）
    function catalogOrderText(order) {
      return [order.noshiType, order.noshiSeal, order.wrap, order.wrapping, order.bag].filter(Boolean).join(' ');
    }
    // この注文の見本。担当者が選んだ（または外した）ものが優先、無ければ注文の文字から見つけたもの
    function optionChosen(order, groupId) {
      const group = OPTION_CATALOG.find(function (g) { return g.id === groupId; });
      if (!order || !group) return null;
      const pick = order.optionPick && Object.prototype.hasOwnProperty.call(order.optionPick, groupId) ? order.optionPick[groupId] : null;
      if (pick !== null) return group.items.find(function (it) { return it.file === pick; }) || null;
      const text = catalogOrderText(order);
      return (text && group.items.find(function (it) { return it.test.test(text); })) || null;
    }
    function renderDrawerCatalog(host) {
      const opened = {};
      host.addEventListener('toggle', function (event) {
        const d = event.target;
        if (d && d.dataset && d.dataset.catalog) opened[d.dataset.catalog] = d.open;
      }, true);
      host.addEventListener('error', function (event) {
        const img = event.target;
        if (!img || img.tagName !== 'IMG') return;
        img.replaceWith(Object.assign(document.createElement('span'), { className: 'miss', textContent: '画像なし' }));
      }, true);
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        host.innerHTML = '<div class="head"><h3>のし・包装の見本</h3><p class="sub">押すと開きます</p></div>' + OPTION_CATALOG.map(function (group) {
          const chosen = optionChosen(order, group.id);
          const figs = group.items.map(function (it) {
            const hit = chosen === it;
            return '<button type="button" data-action="pick-option" data-group="' + group.id + '" data-file="' + escapeHtml(it.file) + '" class="' + (hit ? 'is-on' : '') + '" aria-pressed="' + (hit ? 'true' : 'false') + '"><img src="../images/' + escapeHtml(it.file) + '" alt="' + escapeHtml(it.label) + '" loading="lazy"><span class="nm">' + escapeHtml(it.label) + (hit ? '<b>この注文</b>' : '') + '</span></button>';
          }).join('');
          const sum = escapeHtml(group.title) + '<span class="cnt">' + group.items.length + '種類・' + (chosen ? 'この注文：' + escapeHtml(chosen.label) : '未指定') + '</span>';
          const clear = chosen ? '<button type="button" class="clear" data-action="pick-option" data-group="' + group.id + '" data-file="">' + escapeHtml(group.title) + 'を外す（未指定に戻す）</button>' : '';
          return '<details class="fold" data-catalog="' + group.id + '"' + (opened[group.id] ? ' open' : '') + '><summary>' + sum + '</summary><p class="note">' + escapeHtml(group.note) + ' 押すとこの注文に選びます。選んでいるものをもう一度押すと外れます。</p>' + clear + '<div class="grid">' + figs + '</div></details>';
        }).join('');
      }
      on('oms:open', paint);
      on('oms:seal', paint);
    }
