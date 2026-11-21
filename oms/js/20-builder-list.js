// Luna Luce OMS 部品JS: 20-builder-list（サイトビルダー左列: 部品の一覧・並べ替え・追加）
    function renderBuilderList(host) {
      function item(sel, active, label, sub, swatch, onNow) {
        const s = state.builder.sel;
        const on = s.type === sel.type && s.index === sel.index;
        return '<li class="item' + (on ? ' is-on' : '') + '"><button type="button" class="pick" data-b="select" data-type="' + sel.type + '" data-index="' + sel.index + '">' +
          (swatch ? '<span class="sw" style="background:' + escapeHtml(swatch.background) + ';border-color:' + escapeHtml(swatch.top) + '"></span>' : '') +
          '<span class="name">' + escapeHtml(label) + '</span><span class="sub">' + escapeHtml(sub) + (active === false ? '・非表示' : onNow === false ? '・期間外' : '') + '</span></button>' +
          (sel.type === 'card' ? '<span class="move"><button type="button" data-b="card-move" data-index="' + sel.index + '" data-dir="-1" aria-label="上へ">↑</button><button type="button" data-b="card-move" data-index="' + sel.index + '" data-dir="1" aria-label="下へ">↓</button></span>' : '') + '</li>';
      }
      function paint() {
        const b = state.builder;
        if (!b.ready) { host.innerHTML = '<p class="muted">' + escapeHtml(b.error || '読み込み中…') + '</p>'; return; }
        const now = new Date().toISOString();
        const ticker = item({ type: 'ticker', index: 0 }, true, '流れる文言', b.notices.length + '件');
        const cards = b.cards.map(function (card, i) {
          return item({ type: 'card', index: i }, card.active, (i + 1) + '. ' + (card.title || '（題名なし）'), BUILDER_KINDS[card.kind || 'products'].short, builderTheme(card.theme), builderOnNow(card, now));
        }).join('');
        const themes = b.themes.map(function (t, i) {
          return item({ type: 'theme', index: i }, true, t.name, t.builtIn ? '標準' : '追加', t);
        }).join('');
        host.innerHTML = '<h3>サイトの上の帯</h3><ul>' + ticker + '</ul>' +
          '<h3>トップのカード <small>上から順に表示</small></h3><ul>' + cards + '</ul>' +
          '<div class="adds"><button type="button" data-b="card-add" data-kind="products">＋ 商品4つ</button><button type="button" data-b="card-add" data-kind="campaign">＋ キャンペーン</button><button type="button" data-b="card-add" data-kind="features">＋ 特集一覧</button></div>' +
          '<h3>商品</h3><ul>' + item({ type: 'stock', index: 0 }, true, '在庫と出店（出す・出さない・期間）', Object.keys(b.stock).length ? Object.keys(b.stock).length + '件を切り替え中' : '販売中以外 ' + b.products.filter(function (p) { return p.stock && p.stock.status !== 'in'; }).length + '件') +
          b.newProducts.map(function (p, i) { return item({ type: 'product', index: i }, p.active, p.title || '（商品名なし）', (p.edit ? '編集中' : '新しい商品') + '・' + stockState(builderProductStock(p).status).short); }).join('') + '</ul>' +
          '<div class="adds"><button type="button" data-b="select" data-type="product-start" data-index="0">＋ 単品商品を登録</button>' + (b.newProducts.length ? '<button type="button" data-b="channel-export">楽天・Yahoo用に書き出す</button>' : '') + '</div>' +
          '<h3>企画（季節・イベント・セール）</h3><ul>' + b.plans.map(function (p, i) { return item({ type: 'plan', index: i }, true, p.name || '（名前なし）', builderPlanKind(p.kind) + '・' + builderPeriodText(p.from, p.to) + '・' + builderPlanStatus(p, builderDaysToday())); }).join('') + '</ul>' +
          '<div class="adds">' + PLAN_KINDS.map(function (k) { return '<button type="button" data-b="plan-add" data-kind="' + k[0] + '">＋ ' + k[1] + '</button>'; }).join('') + '</div>' +
          '<h3>営業日</h3><ul>' + item({ type: 'days', index: 0 }, true, '営業日（発送のお休み）', b.days ? 'OMSで管理中' : 'Welcartの設定のまま') + '</ul>' +
          '<h3>色のテーマ</h3><ul>' + themes + '</ul><div class="adds"><button type="button" data-b="theme-add">＋ テーマを追加</button></div>';
      }
      paint();
      on('oms:builder', paint);
    }
