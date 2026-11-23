// Luna Luce OMS 部品JS: 16-drawer（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderDrawerHead(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        host.innerHTML = '<div class="titles"><div class="meta"><span class="ch">' + escapeHtml(order.channelLabel) + '</span><span class="oid">' + escapeHtml(order.id) + '</span></div><h2 id="drawer-title">' + escapeHtml(order.productName) + '（× ' + order.qty + '点）</h2></div><button type="button" class="close" data-action="close-drawer" aria-label="閉じる">×</button>';
      }
      on('oms:open', paint);
    }
    function renderDrawerWarning(host) {
      function paint() {
        const order = currentOrder();
        if (!order || !order.warning) { host.hidden = true; host.innerHTML = ''; return; }
        host.hidden = false;
        host.innerHTML = '<div class="warn"><strong>要確認</strong><span>' + escapeHtml(order.warning) + '</span></div>';
      }
      on('oms:open', paint);
      on('oms:change', paint);
    }
    function designView(order) {
      const line = order && order.line ? order.line : null;
      const template = line && line.templateId
        ? (DESIGN_TEMPLATES.find(function (item) {
          return item.templateId === line.templateId && item.templateVersion === line.templateVersion;
        }) || null)
        : null;
      const seal = line && line.designId && SEAL_BY_ID[line.designId] ? SEAL_BY_ID[line.designId] : null;
      const view = {
        line: line,
        template: template,
        seal: seal,
        status: 'missing',
        headline: '図柄未登録・共通参考見本',
        detail: '実製造のプレビューではありません。共通の参考見本です。図柄画像の固定名を白塗りして、入力名へ置き換えてはいません。'
      };
      if (line && line.templateId && !template) {
        view.status = 'version-missing';
        view.headline = '注文時のテンプレート版がありません';
        view.detail = '版 ' + (line.templateVersion || '不明') + ' は、いまのマスタにありません。別の版には替えません。実製造には使えません。';
        return view;
      }
      if (template && template.kind === 'diy') {
        view.status = 'diy';
        view.headline = '汎用の入力配置見本';
        view.detail = '席次表・メニュー表は手作り・テンプレート編集印刷です。購入用テンプレートは再配布しません。余白・書体・面付けの確定前に、実寸PDFを製造へ回しません。';
        return view;
      }
      if (template && template.kind === 'miniSeal') {
        if (line.designId && !seal) {
          view.headline = '図柄未登録';
          view.detail = 'この明細の図柄IDは、この端末の図柄一覧にありません。実製造には使えません。画像は読み込んでいません。';
          return view;
        }
        view.status = 'sample';
        view.headline = seal ? ('画面見本 ' + seal.label) : '図柄未選択';
        const linked = template.skus.indexOf(order.sku) >= 0;
        const fileNote = !seal ? '図柄は一覧から選びます。' : (seal.file ? '図柄画像はこの端末のファイルです。' : 'この図柄の画像ファイルはありません。');
        view.detail = '公開見本です。製造原稿ではありません。枠は角丸スクエアです。' + fileNote + '名前は図柄の上に載せていません（図柄の画像そのままです）。寸法は約35×25mmで、再構築サイト option.html のミニシール表に書かれています。' + (linked ? 'このSKUに紐付いています。' : 'このSKUの紐付けはありません。');
      }
      return view;
    }
    function renderDrawerPreview(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const view = designView(order);
        const line = view.line;
        const meta = [
          ['明細ID', line ? line.lineId : 'なし'],
          ['関連ID', line ? line.relatedId : 'なし'],
          ['図柄', view.seal ? view.seal.id + ' / ' + view.seal.cartValue : '未登録'],
          ['テンプレート', line && line.templateId ? line.templateId + ' / ' + line.templateVersion : 'なし'],
          ['校正', line ? line.proofStatus : 'なし'],
          ['入力原文', line ? line.sourceText : '']
        ].map(function (row) {
          return '<p>' + escapeHtml(row[0]) + ' ' + escapeHtml(row[1]) + '</p>';
        }).join('');
        // 印刷イメージ（ミニシール・熨斗・リボンシール・レーザー彫刻）があれば、それを出す（js/43-print-preview）
        const prints = printPreviewHtml(order, view);
        if (prints) {
          host.innerHTML = '<div class="card">' + (prints.indexOf('ミニシール ') >= 0 ? '<p class="flag">' + escapeHtml(view.headline) + '</p>' : '') + '<div class="preview-head"><h3>ご注文の印刷イメージ</h3><p class="sub">画面の見本です。製造原稿ではありません。名前・日付は下の入力欄の内容です。</p></div><div class="pp-list">' + prints + '</div><div class="meta">' + meta + '</div></div>';
          printPreviewWire(host);
          return;
        }
        host.innerHTML = '<div class="card"><p class="flag">' + escapeHtml(view.headline) + '</p><div class="preview-head"><h3>画面の参考見本</h3><p class="sub">' + escapeHtml(view.detail) + '</p></div><div class="frame"><svg viewBox="0 0 460 210" role="img" aria-label="共通参考見本"><rect x="8" y="8" width="444" height="194" rx="12" fill="#FAF8F5" stroke="#B8965C" stroke-width="2"/><text data-sample="message" x="230" y="48" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="15" fill="#8A7B76"></text><text data-sample="name" x="230" y="112" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="30" fill="#433936"></text><text data-sample="date" x="230" y="148" text-anchor="middle" font-size="16" fill="#9E7B43"></text><text data-sample="note" x="230" y="178" text-anchor="middle" font-size="10" fill="#7A6B66"></text></svg></div><div class="meta">' + meta + '</div><p class="limit" data-limit></p></div>';
        applyPreview(host);
      }
      function applyPreview(root) {
        const node = root || host;
        if (!node.querySelector('svg')) return;
        const order = currentOrder();
        const view = order ? designView(order) : null;
        const draft = state.draft || {};
        node.querySelector('[data-sample="message"]').textContent = draft.message || '';
        node.querySelector('[data-sample="name"]').textContent = draft.couple || '';
        node.querySelector('[data-sample="date"]').textContent = dotted(draft.wedding || '');
        node.querySelector('[data-sample="note"]').textContent = '参考文字。図柄画像の上には載せていません';
        const limit = node.querySelector('[data-limit]');
        const max = view && view.template ? view.template.maxChars : 0;
        if (limit) limit.textContent = max && String(draft.couple || '').length > max ? '文字数超過（上限 ' + max + '）' : '';
      }
      on('oms:open', paint);
      on('oms:draft', function () { if (host.querySelector('.pp-list')) paint(); else applyPreview(); });
      on('oms:seal', paint);
    }
    let sealFoldOpen = false;
    function renderDrawerMiniseal(host) {
      host.addEventListener('error', function (event) {
        const img = event.target;
        if (img && img.tagName === 'IMG' && img.hasAttribute('data-item-img')) { img.replaceWith(Object.assign(document.createElement('p'), { className: 'miss', textContent: '画像なし' })); return; }
        if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-seal-img')) return;
        const frame = img.closest('.seal-frame');
        if (!frame) return;
        frame.classList.add('is-empty');
        frame.innerHTML = '<p class="miss">' + escapeHtml(img.alt || '') + '</p><p class="miss">画像なし</p>';
      }, true);
      // この注文で受けた品（商品・ミニシール・のし・ラッピング・小袋・紙袋・バッグ）を全部並べる
      function chosenBlock() {
        const order = currentOrder();
        const items = orderedItems(order);
        const tiles = items.map(function (it) {
          const pic = it.src ? '<img src="' + escapeHtml(it.src) + '" alt="' + escapeHtml(it.label) + '" data-item-img>' : '<p class="miss">画像なし</p>';
          const clear = it.group === 'seal' ? '<button type="button" class="clear" data-action="clear-seal">外す</button>'
            : (it.group ? '<button type="button" class="clear" data-action="pick-option" data-group="' + it.group + '" data-file="">外す</button>' : '');
          return '<div class="pick' + (it.group === 'seal' ? ' is-seal' : '') + '"><p class="kind">' + escapeHtml(it.kind) + '</p><div class="item-frame">' + pic + '</div><p class="cap">' + escapeHtml(it.label) + '</p>' + clear + '</div>';
        }).join('');
        const has = items.map(function (it) { return it.kind; });
        const none = ['ミニシール', 'のし', 'ラッピング', '小袋', '紙袋・バッグ'].filter(function (k) { return has.indexOf(k) < 0; });
        return '<div class="items">' + tiles + '</div>' + (none.length ? '<p class="none">指定なし：' + escapeHtml(none.join('・')) + '（ミニシールは下の図柄一覧、ほかは「のし・包装の見本」から選べます）</p>' : '');
      }
      function names(ids) {
        return ids.map(function (id) { return SEAL_BY_ID[id] ? SEAL_BY_ID[id].label : id; }).join('、');
      }
      function matchBlock() {
        const order = currentOrder();
        const line = order && order.line;
        if (!order || !order.sealText || !line || !line.sealMatch) return '';
        const m = line.sealMatch;
        const said = '受注の指定「' + escapeHtml(m.text) + '」';
        if (line.sealPickedBy === 'staff-clear') return '<p class="match is-warn">' + said + '。担当者が図柄を外しました（未指定）。下の一覧から選び直せます。</p>';
        const picked = line.sealPickedBy === 'staff' && line.designId;
        if (picked) {
          const same = line.designId === m.id;
          return '<p class="match' + (same ? ' is-auto' : '') + '">' + said + '。担当者が <b>' + escapeHtml(names([line.designId])) + '</b> を選びました。' + (same || !m.id ? '' : '自動の判定（' + escapeHtml(names([m.id])) + '）とは違います。') + '</p>';
        }
        if (m.status === 'exact') return '<p class="match is-auto">' + said + ' → 番号と名前が一致したので <b>' + escapeHtml(names([m.id])) + '</b> を自動で入れました。</p>';
        if (m.status === 'name') return '<p class="match is-auto">' + said + ' → 名前が1つに決まったので <b>' + escapeHtml(names([m.id])) + '</b> を自動で入れました。番号は書かれていません。</p>';
        if (m.status === 'alias') return '<p class="match is-auto">' + said + ' → 販路の言い換え表から <b>' + escapeHtml(names([m.id])) + '</b> を自動で入れました。</p>';
        if (m.status === 'ambiguous') return '<p class="match is-warn">' + said + ' → 候補が複数あるので自動では入れていません。候補：' + escapeHtml(names(m.candidates)) + '。下の一覧から選んでください。</p>';
        if (m.status === 'mismatch') return '<p class="match is-warn">' + said + ' → 番号と名前が食い違うので自動では入れていません。候補：' + escapeHtml(names(m.candidates)) + '。お客様に確認してから選んでください。</p>';
        if (m.status === 'partial') return '<p class="match is-warn">' + said + ' → 名前が完全には一致しないので自動では入れていません。候補：' + escapeHtml(names(m.candidates)) + '。下の一覧から選んでください。</p>';
        if (m.status === 'number-only') return '<p class="match is-warn">' + said + ' → 番号だけで名前がないので自動では入れていません。候補：' + escapeHtml(names(m.candidates)) + '。</p>';
        return '<p class="match is-warn">' + said + ' → 図柄の一覧に見つかりません。お客様に確認してから選んでください。</p>';
      }
      function paint() {
        if (!currentOrder()) { host.innerHTML = ''; return; }
        const groups = SEAL_GROUPS.map(function (group) {
          const buttons = group.ids.map(function (id) {
            const seal = SEAL_BY_ID[id];
            if (!seal) return '';
            const on = state.sealPickId === id;
            return '<button type="button" data-action="pick-seal" data-seal-id="' + escapeHtml(id) + '" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span class="seal-frame">' + sealFrameInner(seal) + '</span><span class="nm">' + escapeHtml(seal.label) + '</span></button>';
          }).join('');
          return '<h4 class="group">' + escapeHtml(group.name) + '</h4><div class="grid">' + buttons + '</div>';
        }).join('');
        const count = SEAL_GROUPS.reduce(function (n, g) { return n + g.ids.filter(function (id) { return SEAL_BY_ID[id]; }).length; }, 0);
        // 図柄の一覧は普段は畳む。押したときだけ開く（開いたかどうかは注文を替えても覚えておく）
        host.innerHTML = '<div class="head"><h3>ご注文の品</h3><p class="sub">受けた品の画像を全部並べています</p></div><div data-seal-match>' + matchBlock() + '</div><div class="chosen" data-seal-chosen>' + chosenBlock() + '</div><details class="fold" data-seal-fold' + (sealFoldOpen ? ' open' : '') + '><summary>図柄の見本一覧<span class="cnt">' + count + '種類・押すと開きます</span></summary><p class="note">枠は角丸スクエアです。画像がない図柄は、名前と「画像なし」だけを出します。押すとこの注文の図柄になります。選んでいる図柄をもう一度押すと外れます。</p>' + groups + '</details>';
        host.querySelector('[data-seal-fold]').addEventListener('toggle', function (e) { sealFoldOpen = e.target.open; });
      }
      function refresh() {
        if (!host.querySelector('[data-seal-chosen]')) { paint(); return; }
        host.querySelector('[data-seal-match]').innerHTML = matchBlock();
        host.querySelector('[data-seal-chosen]').innerHTML = chosenBlock();
        host.querySelectorAll('[data-seal-id]').forEach(function (button) {
          const on = button.dataset.sealId === state.sealPickId;
          button.classList.toggle('is-on', on);
          button.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      on('oms:open', paint);
      on('oms:seal', refresh);
    }
    function renderDrawerParts(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const counts = partCounts(order);
        const lines = PART_KEYS.map(function (part) {
          const per = Number(order.partPer[part.key]) || 0;
          const retired = part.key === 'thanksCard' && per === 0 ? '（新規では選びません）' : '';
          return '<div class="line"><span>' + escapeHtml(part.label + retired) + '</span><span class="qty">親 ' + order.qty + ' × ' + per + ' ＝ ' + counts[part.key] + '</span></div>';
        }).join('');
        host.innerHTML = '<div class="head"><h3>部品内訳</h3><p class="sub">親数量 ' + order.qty + '</p></div><div class="body">' + lines + '</div>';
      }
      on('oms:open', paint);
      on('oms:change', paint);
    }
    function renderDrawerFees(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const fees = feeNumbers(order);
        const extra = fees.extraTotal > 0
          ? '文字数超過 ' + formatYen(fees.extraBase) + ' ＋ ' + formatYen(fees.extraPer) + ' × ' + fees.extraCount + '文字 ＝ ' + formatYen(fees.extraTotal) + '（1注文につき1回）'
          : '文字数超過 ' + formatYen(0);
        const total = fees.extraTotal + fees.noshi + fees.wrapping;
        host.innerHTML = '<div class="card"><h3>この注文の料金</h3><div class="lines"><p data-fee="extra">' + escapeHtml(extra) + '</p><p data-fee="noshi">のし ' + formatYen(fees.noshi) + '</p><p data-fee="wrap">ラッピング ' + formatYen(fees.wrapping) + '</p><p class="total">オプション計 ' + formatYen(total) + '</p></div></div>';
      }
      on('oms:open', paint);
    }
    function renderDrawerCampaign(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const text = order.campaignMark ? '本店カートから渡された印: 「' + order.campaignMark + '」' : '本店カートから渡された印: なし';
        host.innerHTML = '<div class="card"><h3>キャンペーン印</h3><p>' + escapeHtml(text) + '</p><p class="sub">名前だけです。金額は計算しません。例: 5円ご縁</p></div>';
      }
      on('oms:open', paint);
    }
    function renderDrawerSchedule(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const clock = orderClock(order);
        host.innerHTML = '<div class="card"><h3>賞味期限と即日締切</h3><div class="grid"><p class="cell">賞味期限 ' + escapeHtml(order.bestBefore || 'なし') + '</p><p class="cell">即日締切 ' + SAME_DAY_CUTOFF + '。受付 ' + escapeHtml(clock.time) + (clock.within ? '（締切内）' : '（締切後）') + '</p></div></div>';
      }
      on('oms:open', paint);
    }
    function renderDrawerRush(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        host.innerHTML = '<div class="card"><h3>特急チケット</h3><div class="row"><button type="button" data-action="toggle-rush" class="' + (order.rushTicket ? 'is-on' : '') + '">' + (order.rushTicket ? '特急チケットを外す' : '特急チケットを付ける') + '</button><span>' + (order.rushTicket ? '特急チケット付き' : '特急チケットなし') + '</span></div></div>';
      }
      on('oms:open', paint);
      on('oms:change', paint);
    }
    function renderDrawerProof(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        host.innerHTML = '<div class="card"><h3>校正</h3><div class="row"><span class="state">校正: ' + escapeHtml(order.proofStatus) + '</span><button type="button" class="send" data-action="proof-send"' + (order.proofStatus !== '未送付' ? ' disabled' : '') + '>校正を送付済みにする</button><button type="button" class="approve" data-action="proof-approve"' + (order.proofStatus !== '送付済' ? ' disabled' : '') + '>校正を承認済みにする</button></div></div>';
      }
      on('oms:open', paint);
      on('oms:change', paint);
    }
    function renderDrawerSheet(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const fees = feeNumbers(order);
        const counts = partCounts(order);
        const clock = orderClock(order);
        const rows = [
          ['販路', order.channelLabel],
          ['注文者', order.customerName + ' 様'],
          ['お届け先', piiText(order.shippingTo)],
          ['商品', order.productName + ' / ' + order.sku],
          ['親数量', String(order.qty)],
          ['内訳', PART_KEYS.map(function (part) { return part.label + ' ' + counts[part.key]; }).join('、')],
          ['名入れ', draftCouple()],
          ['日付', dotted(draftWedding())],
          ['挙式日', draftWedding()],
          ['納期', (state.draft && state.draft.delivery) || order.deliveryDate || 'なし'],
          ['図柄', designView(order).headline],
          ['テンプレート', order.line && order.line.templateId ? order.line.templateId + ' / ' + order.line.templateVersion : 'なし'],
          ['明細ID', order.line ? order.line.lineId : 'なし'],
          ['入力原文', order.line ? order.line.sourceText : ''],
          ['料金', '超過 ' + formatYen(fees.extraTotal) + ' / のし ' + formatYen(fees.noshi) + ' / ラッピング ' + formatYen(fees.wrapping)],
          ['賞味期限', order.bestBefore || 'なし'],
          ['即日締切', SAME_DAY_CUTOFF + ' / ' + clock.time + ' / ' + (clock.within ? '締切内' : '締切後')],
          ['特急', order.rushTicket ? 'あり' : 'なし'],
          ['校正', order.proofStatus],
          ['キャンペーン印', order.campaignMark ? '「' + order.campaignMark + '」' : 'なし']
        ].map(function (row) {
          return '<tr><th>' + escapeHtml(row[0]) + '</th><td>' + escapeHtml(row[1]) + '</td></tr>';
        }).join('');
        host.innerHTML = '<div class="head"><h3>受注管理表</h3><p class="sub">この画面の控です。PDFではありません</p></div><div class="sheet"><div class="sheet-top"><strong>受注管理表</strong><span>' + escapeHtml(order.id) + '</span></div><table><tbody>' + rows + '</tbody></table></div>';
      }
      on('oms:open', paint);
      on('oms:change', paint);
      on('oms:draft', paint);
      on('oms:seal', paint);
    }
    function renderDrawerRealSize(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const counts = partCounts(order);
        const view = designView(order);
        const thanks = counts.thanksCard > 0
          ? '<div class="piece"><div class="thanks"><p class="cap">THANK YOU</p><p class="name" data-sample="name"></p><p class="date" data-sample="date"></p></div><p class="caption">過去明細のサンクスカード 91×55mm</p></div>'
          : '';
        let piece = '';
        if (view.status === 'diy') {
          piece = '<div class="piece"><div class="thanks"><p class="cap">配置見本</p><p class="name" data-sample="name"></p><p class="date" data-sample="date"></p></div><p class="caption">汎用の入力配置見本。購入用テンプレートではありません</p></div>';
        } else if (view.status === 'version-missing') {
          piece = '<p class="caption">' + escapeHtml(view.headline) + '</p>';
        } else {
          const seal = currentSeal() || view.seal;
          const caption = seal && seal.file
            ? seal.label + '・角丸・約35×25mm（option.html のサイズ欄）・画面見本'
            : (seal ? seal.label + '・画像なし' : '図柄未選択');
          piece = '<div class="piece"><div class="seal">' + sealFrameInner(seal) + '</div><p class="caption">' + escapeHtml(caption) + '</p></div>';
        }
        host.innerHTML = '<div class="head"><h3>画面の寸法見本</h3><p class="sub">実寸PDFは、余白・書体・面付けの確定前に製造へ回しません</p></div><div class="stage"><div class="row">' + thanks + piece + '</div></div><p class="limit">' + escapeHtml(view.detail) + '</p>';
        fill();
      }
      function fill() {
        host.querySelectorAll('[data-sample="name"]').forEach(function (node) { node.textContent = draftCouple(); });
        host.querySelectorAll('[data-sample="date"]').forEach(function (node) { node.textContent = dotted(draftWedding()); });
      }
      on('oms:open', paint);
      on('oms:draft', fill);
      on('oms:seal', paint);
    }
    function renderDrawerStock(host) {
      function paint() {
        const order = currentOrder();
        if (!order) { host.innerHTML = ''; return; }
        const counts = partCounts(order);
        const plan = PART_KEYS.map(function (part) { return part.short + ' ' + counts[part.key]; }).join('、');
        const now = PART_KEYS.map(function (part) { return part.label + ' ' + state.partStock[part.key]; }).join('、');
        host.innerHTML = '<div class="card"><h3>部品在庫の確定</h3><p>いまの部品在庫 ' + escapeHtml(now) + '</p><p>' + (order.stockCommitted ? '確定済み。引き落とした数: ' + escapeHtml(plan) : '未確定。確定すると ' + escapeHtml(plan) + ' を引き落とします。') + '</p><button type="button" data-action="commit-stock"' + (order.stockCommitted ? ' disabled' : '') + '>' + (order.stockCommitted ? '部品在庫は引き落とし済み' : 'この注文を確定して部品在庫を引き落とす') + '</button></div>';
      }
      on('oms:open', paint);
      on('oms:change', paint);
    }
    function renderDrawerEdit(host) {
      function paint() {
        const order = currentOrder();
        const draft = state.draft;
        if (!order || !draft) { host.innerHTML = ''; return; }
        const fees = feeNumbers(order);
        const badge = fees.extraTotal > 0
          ? '文字数超過 ' + formatYen(fees.extraBase) + '＋' + formatYen(fees.extraPer) + '×' + fees.extraCount + '＝' + formatYen(fees.extraTotal)
          : '文字数超過 ' + formatYen(0);
        const fonts = FONT_OPTIONS.map(function (font) {
          return '<option' + (font === draft.font ? ' selected' : '') + '>' + escapeHtml(font) + '</option>';
        }).join('');
        host.innerHTML = '<div class="head"><h3>名入れ・工程の編集</h3><span class="fee-badge' + (fees.extraTotal > 0 ? ' is-on' : '') + '">' + escapeHtml(badge) + '</span></div><div class="grid"><div><label for="edit-couple">新郎・新婦名</label><input id="edit-couple" data-action="edit-field" data-field="couple" value="' + escapeHtml(draft.couple) + '"></div><div><label for="edit-date">挙式日</label><input id="edit-date" type="date" data-action="edit-field" data-field="wedding" value="' + escapeHtml(draft.wedding) + '"></div><div><label for="edit-delivery">納期（納品日）</label><input id="edit-delivery" type="date" data-action="edit-field" data-field="delivery" value="' + escapeHtml(draft.delivery || '') + '"></div><div><label for="edit-message">見出し・定型メッセージ</label><input id="edit-message" data-action="edit-field" data-field="message" value="' + escapeHtml(draft.message) + '"></div><div><label for="edit-font">書体</label><select id="edit-font" data-action="edit-field" data-field="font">' + fonts + '</select></div><div><label for="edit-noshi">熨斗・サンクスシール</label><input id="edit-noshi" data-action="edit-field" data-field="noshi" value="' + escapeHtml(draft.noshi) + '"></div><div><label for="edit-status">工程ステータス</label><select id="edit-status" data-action="edit-field" data-field="status">' + statusOptions(draft.status) + '</select></div></div><div class="save-row"><label class="check"><input type="checkbox" data-action="edit-field" data-field="clearWarning"' + (draft.clearWarning ? ' checked' : '') + '>名入れ内容を目視確認済みにする（パース警告を解除）</label><button type="button" class="save" data-action="save-edit">変更内容を保存する</button></div>';
      }
      on('oms:open', paint);
    }
    function renderDrawerRaw(host) {
      function paint() {
        const order = currentOrder();
        if (!order || piiHidden()) { host.innerHTML = ''; return; } // 原文には住所・電話が入ることがある
        host.innerHTML = '<h3>受信メモ</h3><p class="sub">ダミーの原文です。本番の取込ではありません</p><pre></pre>';
        host.querySelector('pre').textContent = JSON.stringify(order.rawPayload, null, 2);
      }
      on('oms:open', paint);
    }
    function renderDrawerActions(host) {
      function paint() {
        if (!currentOrder()) { host.innerHTML = ''; return; }
        host.innerHTML = '<h3>この注文の出力</h3><p class="sub">作業指示書（各部署に回す紙）。右上のQRコードをiPhoneで写すと、その注文のスマホ作業画面が開きます</p><div class="wk-out">' +
          '<button type="button" class="wo-btn" data-action="work-output" data-kind="pdf"><span>PDF保存</span><span>作業指示書をPDFにする</span></button>' +
          '<button type="button" class="wo-btn" data-action="work-output" data-kind="print"><span>PDF印刷</span><span>作業指示書を紙に出す</span></button>' +
          '<button type="button" class="wo-btn is-phone" data-action="work-output" data-kind="phone"><span>スマホで作業開始</span><span>QRコードを出す</span></button></div>' +
          (piiHidden() ? '' : '<div class="grid"><button type="button" class="a1" data-action="single" data-kind="laser"><span>レーザー加工用CSV出力</span><span>CSV</span></button><button type="button" class="a2" data-action="single" data-kind="yamato"><span>ヤマトB2クラウドCSV出力</span><span>B2</span></button><button type="button" class="a3" data-action="single" data-kind="email"><span>校正確認メールを記録</span><span>記録</span></button><button type="button" class="a4" data-action="single" data-kind="ship"><span>出荷済みにする（API送信なし）</span><span>状態</span></button></div>');
      }
      on('oms:open', paint);
    }

    const DRAWER_PARTS = [
      { name: 'drawer-warning', render: renderDrawerWarning },
      { name: 'drawer-worklog', render: function (host) { renderDrawerWorkLog(host); } }, // 工程の流れ（終わった・取り消し）。本体は js/52-work-log
      { name: 'drawer-preview', render: renderDrawerPreview },
      { name: 'drawer-miniseal', render: renderDrawerMiniseal },
      { name: 'drawer-catalog', render: function (host) { renderDrawerCatalog(host); } }, // 本体は js/44-option-catalog
      { name: 'drawer-parts', render: renderDrawerParts },
      { name: 'drawer-fees', render: renderDrawerFees },
      { name: 'drawer-campaign', render: renderDrawerCampaign },
      { name: 'drawer-schedule', render: renderDrawerSchedule },
      { name: 'drawer-rush', render: renderDrawerRush },
      { name: 'drawer-proof', render: renderDrawerProof },
      { name: 'drawer-sheet', render: renderDrawerSheet },
      { name: 'drawer-realsize', render: renderDrawerRealSize },
      { name: 'drawer-stock', render: renderDrawerStock },
      { name: 'drawer-edit', render: renderDrawerEdit },
      { name: 'drawer-raw', render: renderDrawerRaw },
      { name: 'drawer-actions', render: renderDrawerActions }
    ];
    function renderDrawer(host) {
      host.innerHTML = '<div class="drawer-backdrop" data-action="close-drawer" hidden></div><aside class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden><div data-slot="head"></div><div class="drawer-body" data-slot="body"></div></aside>';
      mountOrdered(host.querySelector('[data-slot="head"]'), [{ name: 'drawer-head', render: renderDrawerHead }]);
      mountOrdered(host.querySelector('[data-slot="body"]'), DRAWER_PARTS);
    }

