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
        // 看板（いちばん上の看板・50-builder-sign）とトップのカードは別の枠に分け、番号もそれぞれで数える
        let nSign = 0, nCard = 0;
        const signs = [], cards = [];
        b.cards.forEach(function (card, i) {
          if (builderIsSign(card)) { nSign += 1; signs.push(item({ type: 'card', index: i }, card.active, nSign + '. ' + (card.title || '（見出しなし）'), (card.badge ? card.badge + '・' : '') + 'ボタン' + (card.buttons || []).length + 'つ', builderTheme(card.theme), builderOnNow(card, now))); }
          else { nCard += 1; cards.push(item({ type: 'card', index: i }, card.active, nCard + '. ' + (card.title || '（題名なし）'), BUILDER_KINDS[card.kind || 'products'].short, builderTheme(card.theme), builderOnNow(card, now))); }
        });
        const selCard = b.sel.type === 'card' ? builderSelected() : null;
        const themes = b.themes.map(function (t, i) {
          return item({ type: 'theme', index: i }, true, t.name, t.builtIn ? '標準' : '追加', t);
        }).join('');
        // 2.27 項目ごとに枠で区切る（いまどこを操作しているかが分かるように、選んでいる枠は色を付ける）
        const sel = b.sel.type;
        function grp(types, title, inner, extra, on) {
          return '<section class="grp' + (extra ? ' ' + extra : '') + ((on === undefined ? types.indexOf(sel) >= 0 : on) ? ' is-on' : '') + '"><h3>' + title + '</h3>' + inner + '</section>';
        }
        host.innerHTML = builderHistBar() +
          grp(['reflect'], '反映', '<ul class="reflect-item">' + item({ type: 'reflect', index: 0 }, true, '反映（GitHub・Welcart・楽天・Yahoo）', builderReflectSub()) + '</ul>') +
          grp(['ticker'], 'サイトの上の帯', '<ul>' + ticker + '</ul>') +
          grp(['news'], 'お知らせ本文', '<ul>' + item({ type: 'news', index: 0 }, true, 'お知らせ本文', builderNewsList().length + '件' + (builderDaysLongNotices().length ? '＋長期休暇' + builderDaysLongNotices().length + '件（自動）' : '')) + '</ul>') +
          grp(['card'], 'いちばん上の看板 <small>トップを開いて最初に見える大きなカード</small>', '<ul>' + signs.join('') + '</ul>' +
            '<div class="adds"><button type="button" data-b="card-add" data-kind="message">＋ 看板を足す</button></div>', 'grp-sign', !!selCard && builderIsSign(selCard)) +
          grp(['card'], 'トップのカード <small>看板の次に、上から順に表示</small>', '<ul>' + cards.join('') + '</ul>' +
            '<div class="adds"><button type="button" data-b="card-add" data-kind="products">＋ 商品</button><button type="button" data-b="card-add" data-kind="campaign">＋ キャンペーン</button><button type="button" data-b="card-add" data-kind="features">＋ 特集一覧</button></div>', '', !!selCard && !builderIsSign(selCard)) +
          grp(['sections'], 'トップの商品の段', '<ul>' + item({ type: 'sections', index: 0 }, true, 'トップの商品の段（並び・表示）', builderSections().filter(function (x) { return x.active; }).length + '段を表示・全' + builderSections().length + '段') + '</ul>') +
          grp(['store'], 'お店の案内・送料・税率', '<ul>' + item({ type: 'store', index: 0 }, true, 'お店の案内・送料・税率', (builderStoreSetsToCheck().length ? 'セット要確認 ' + builderStoreSetsToCheck().length + '件・' : '') + (builderStoreChanged() ? '変更あり' : '案内バー・送料・税率表')) + '</ul>') +
          grp(['stock', 'product', 'product-start', 'cats', 'notes', 'layout', 'texts'], '商品', '<ul>' + item({ type: 'stock', index: 0 }, true, '在庫と出店（出す・出さない・期間）', Object.keys(b.stock).length ? Object.keys(b.stock).length + '件を切り替え中' : '販売中以外 ' + b.products.filter(function (p) { return p.stock && p.stock.status !== 'in'; }).length + '件') +
            item({ type: 'notes', index: 0 }, true, '注意事項の定型文', builderNoteTemplates().length + '件') +
            item({ type: 'layout', index: 0 }, true, '商品ページの段組み', '写真の右 ' + builderPageLayout().side.length + '・写真の下 ' + builderPageLayout().below.length) +
            item({ type: 'texts', index: 0 }, true, '表示する文字（見出し・ボタン）', builderTextsChanged() ? builderTextsChanged() + '件を変更中' : builderTextsBase().length + '件') +
            item({ type: 'cats', index: 0 }, true, 'カテゴリー（大・中・小）', (function () { const n = builderCatRenameCount() + (state.builder.newCats || []).length + Object.keys(builderCatHidden()).length; return n ? n + '件を変更中' : '名前を変える・足す・消す'; })()) +
            b.newProducts.map(function (p, i) { return item({ type: 'product', index: i }, p.active, builderProductShortName(p), (p.edit ? '編集中' : '新しい商品') + '・' + stockState(builderProductStock(p).status).short); }).join('') + '</ul>' +
            '<div class="adds"><button type="button" data-b="select" data-type="product-start" data-index="0">＋ 単品商品を登録</button>' + (b.newProducts.length ? '<button type="button" data-b="channel-export">楽天・Yahoo用に書き出す</button>' : '') + '</div>') +
          grp(['plan'], '企画（季節・イベント・セール）', '<ul>' + b.plans.map(function (p, i) { return item({ type: 'plan', index: i }, true, p.name || '（名前なし）', builderPlanKind(p.kind) + '・' + builderPeriodText(p.from, p.to) + '・' + builderPlanStatus(p, builderDaysToday())); }).join('') + '</ul>' +
            '<div class="adds">' + PLAN_KINDS.map(function (k) { return '<button type="button" data-b="plan-add" data-kind="' + k[0] + '">＋ ' + k[1] + '</button>'; }).join('') + '</div>') +
          grp(['days'], '営業日', '<ul>' + item({ type: 'days', index: 0 }, true, '営業日（発送のお休み）', b.days ? 'OMSで管理中' : 'Welcartの設定のまま') + '</ul>') +
          grp(['theme'], '色のテーマ', '<ul>' + themes + '</ul><div class="adds"><button type="button" data-b="theme-add">＋ テーマを追加</button></div>');
      }
      paint();
      on('oms:builder', paint);
    }
