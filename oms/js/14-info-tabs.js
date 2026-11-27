// Luna Luce OMS 部品JS: 14-info-tabs（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderArchitectureTab(host) {
      host.innerHTML = [
        '<section class="panel">',
        '<p class="banner">この図は設計の見取り図です。楽天・Yahoo・本店の本番取込はせず、キャンペーン金額も計算しません。</p>',
        '<p class="kicker">System Architecture</p>',
        '<h2>4販路の見取り図と、名入れ・制作の流れ</h2>',
        '<p class="lead">自社Welcart・楽天・Yahoo!・電話/FAXを、同じ制作の列で見るための図です。いま画面に出ている注文はダミーです。</p>',
        '<div class="flow">',
        '<div class="stage"><p class="stage-title">① 受注データ取込層（4販路）</p>',
        '<article class="card"><span class="tag green">自社 WordPress / Welcart</span><h3>特注欄の直接抽出（未接続）</h3><p>role=n/d/w/h/m/s を取る想定です。この画面はAPIを呼びません。</p></article>',
        '<article class="card"><span class="tag rose">楽天市場</span><h3>searchOrder / getOrder（未接続）</h3><p>項目選択肢と備考を後で取る想定です。いまはサンプル注文だけです。</p></article>',
        '<article class="card"><span class="tag amber">Yahoo!ショッピング</span><h3>orderList / orderInfo（未接続）</h3><p>オプション項目を後で取る想定です。いまはサンプル注文だけです。</p></article>',
        '<article class="card"><span class="tag sky">電話・FAX</span><h3>0586-86-1150 / 1140</h3><p>この画面の手動登録から、同じ制作の列に入ります。</p></article>',
        '</div>',
        '<div class="arrow"><span>RAW</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></div>',
        '<div class="stage core"><p class="stage-title">② 現場で使う決まり</p><div class="core-box">',
        '<article class="card"><h3>1. 名入れの確認</h3><p>名前・日付・書体・のしをそろえます。空欄や特殊記号は要確認にします。</p></article>',
        '<article class="card"><h3>2. 料金は決めた式だけ</h3><p>文字数超過は1注文につき1回、¥500＋¥20×文字数。のし¥20、ラッピング¥90。キャンペーンは渡された名前を出すだけです。</p></article>',
        '<article class="card"><h3>3. 納期と挙式日</h3><p>初期の並びは納期です。納期は納品日、挙式日は別の日付です。即日の締切は13:00です。</p></article>',
        '<article class="card"><h3>4. 部品在庫はこの画面の中だけ</h3><p>確定すると菓子・箱・サンクスカード・ミニシールが1回だけ減ります。再読込で戻ります。</p></article>',
        '</div></div>',
        '<div class="arrow"><span>OUT</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></div>',
        '<div class="stage"><p class="stage-title">③ 制作・出荷の出力</p>',
        '<article class="card"><span class="tag gold">加工CSV</span><h3>レーザー・印字用CSV</h3><p>選んだ注文から、名前と日付のCSVを出します。</p></article>',
        '<article class="card"><span class="tag sage">送り状</span><h3>ヤマトB2クラウド</h3><p>式場名と挙式日を記事欄に入れたCSVを出します。</p></article>',
        '<article class="card"><span class="tag taupe">校正</span><h3>送付してから承認</h3><p>校正は未送付 → 送付済 → 承認済の順です。</p></article>',
        '<article class="card"><span class="tag forest">実寸</span><h3>サンクスカードとミニシール</h3><p>カードは91×55mmです。ミニシールは角丸スクエアで、円ではありません。ページのサイズ欄は約35×25mmです。</p></article>',
        '</div></div></section>',
        '<section class="panel"><h2>外部APIの接続予定</h2><p class="lead">期限の見本です。この画面はキーを持たず、ポーリングもしません。</p><div class="monitors">',
        '<article class="monitor"><header><h3>WordPress / Welcart</h3><span class="tag forest">未接続</span></header><p>認証の想定: Application Password。いまは呼びません。</p></article>',
        '<article class="monitor"><header><h3>楽天市場 RMS</h3><span class="tag amber">未接続</span></header><p>ライセンスキーの更新は、接続してから監視します。</p></article>',
        '<article class="monitor"><header><h3>Yahoo!ショッピング</h3><span class="tag forest">未接続</span></header><p>OAuthの更新は、接続してから監視します。</p></article>',
        '</div></section>'
      ].join('');
    }

    function renderSchemaTab(host) {
      function paint() {
        const list = dbSchemaTables.map(function (table, index) {
          return '<button type="button" data-action="schema" data-index="' + index + '" class="' + (index === state.schemaIndex ? 'is-on' : '') + '"><span class="name">' + escapeHtml(table.name) + '</span>' + escapeHtml(table.jpName) + '</button>';
        }).join('');
        const table = dbSchemaTables[state.schemaIndex];
        const head = '<div class="schema-head"><div>カラム名</div><div>データ型</div><div>制約</div><div>説明</div></div>';
        const rows = table.columns.map(function (column) {
          const key = column.key
            ? '<span class="key ' + (column.key === 'PK' || column.key === 'FK' ? column.key : 'other') + '">' + escapeHtml(column.key) + '</span>'
            : '-';
          return '<div class="schema-row"><div class="c-name"><span class="k">カラム</span>' + escapeHtml(column.col) + '</div><div><span class="k">型</span>' + escapeHtml(column.type) + '</div><div><span class="k">制約</span>' + key + '</div><div><span class="k">説明</span>' + escapeHtml(column.note) + '</div></div>';
        }).join('');
        host.innerHTML = '<section class="panel"><div class="head"><div><p class="kicker">Database Schema</p><h2>統合受注のテーブル見取り図</h2><p class="lead">左の名前を選ぶと、列の意味が出ます。キャンペーンは印の名前だけです。</p></div><button type="button" class="copy" data-action="copy-ddl">CREATE TABLE DDLをコピー</button></div><div class="layout"><div class="tables">' + list + '</div><div class="detail"><h3>' + escapeHtml(table.name) + '</h3><span class="jp">' + escapeHtml(table.jpName) + '</span><p>' + escapeHtml(table.description) + '</p><div class="indexes">' + table.indexes.map(function (index) { return '<span>' + escapeHtml(index) + '</span>'; }).join('') + '</div>' + head + rows + '</div></div></section>';
      }
      paint();
      on('oms:schema', paint);
    }

    function csvTargets() {
      const selected = state.orders.filter(function (order) { return order.selected; });
      return selected.length ? selected : state.orders.slice(0, 3);
    }
    function laserCsv() {
      const header = '注文ID,販路,挙式日,商品SKU,数量,新郎新婦名,印字日付,見出し,書体,色,熨斗シール,キャンペーン印';
      const rows = csvTargets().map(function (order) {
        return [order.id, order.channelLabel, order.weddingDate, order.sku, order.qty, '"' + order.coupleNames + '"', dotted(order.weddingDate), '"' + order.headerMsg + '"', '"' + (order.fontStyle || '') + '"', '"' + (order.textColor || '') + '"', '"' + order.noshiSeal + '"', order.campaignMark ? '"' + order.campaignMark + '"' : 'なし'].join(',');
      });
      return [header].concat(rows).join('\n');
    }
    function yamatoCsv() {
      if (piiHidden()) return '作業員のログインでは、住所・電話番号が入る送り状CSVは出せません（js/52-work-log）';
      const header = 'お客様管理番号,送り状種類,お届け先郵便番号,お届け先住所,お届け先名称,お届け先電話番号,品名1,記事欄';
      const rows = csvTargets().map(function (order) {
        return [order.id, '0', order.postalCode, '"' + order.address + '"', '"' + order.shippingTo + '（' + order.customerName + '様）"', order.phone, '"' + order.productName + '"', '"【挙式日:' + order.weddingDate + '】' + order.coupleNames + '様分"'].join(',');
      });
      return [header].concat(rows).join('\n');
    }
    function renderSimulatorTab(host) {
      function paint() {
        const count = csvTargets().length;
        host.innerHTML = '<section class="panel"><p class="kicker">Production and Logistics</p><h2>レーザー加工CSV と ヤマトB2送り状CSV</h2><p class="lead">ダッシュボードで選んだ注文からCSVを作ります。未選択のときは先頭3件です。</p><div class="actions"><button type="button" class="laser" data-action="download" data-kind="laser">レーザー加工用CSVをダウンロード</button><button type="button" class="b2" data-action="download" data-kind="yamato">ヤマトB2送り状CSVをダウンロード</button></div><div class="grid"><div><div class="csv-head"><h3>1. 加工・印字用 CSV</h3><span>' + count + '件</span></div><pre id="csv-laser"></pre></div><div><div class="csv-head"><h3>2. ヤマトB2 送り状 CSV</h3><span>' + count + '件</span></div><pre id="csv-yamato"></pre></div></div></section>';
        host.querySelector('#csv-laser').textContent = laserCsv();
        host.querySelector('#csv-yamato').textContent = yamatoCsv();
      }
      paint();
      on('oms:simulator', paint);
    }

    function setCarrierMode(mode) {
      if (mode !== 'size' && mode !== 'nekopos') return;
      state.carrierMode = mode;
      emit('oms:carrier');
    }
    function setCarrierZone(el) {
      const zone = el.value;
      if (zone && !YAMATO_CONTRACT.some(function (item) { return item.zone === zone; })) return;
      state.carrierZone = zone;
      emit('oms:carrier');
    }
    function setCarrierSize(el) {
      if (el.value === '') {
        state.carrierSize = '';
        emit('oms:carrier');
        return;
      }
      const size = Number(el.value);
      if (YAMATO_SIZES.indexOf(size) < 0) return;
      state.carrierSize = size;
      emit('oms:carrier');
    }
    function renderCarrierTab(host) {
      function paint() {
        const sizeMode = state.carrierMode === 'size';
        const yen = sizeMode ? yamatoContractCost(state.carrierZone, state.carrierSize) : nekoposContract();
        const zoneOptions = '<option value="">区分を選ぶ</option>' + YAMATO_CONTRACT.map(function (item) {
          return '<option value="' + escapeHtml(item.zone) + '"' + (item.zone === state.carrierZone ? ' selected' : '') + '>' + escapeHtml(item.zone) + '</option>';
        }).join('');
        const sizeOptions = '<option value="">サイズを選ぶ</option>' + YAMATO_SIZES.map(function (size) {
          return '<option value="' + size + '"' + (size === state.carrierSize ? ' selected' : '') + '>' + size + '</option>';
        }).join('');
        let result;
        if (!sizeMode) {
          result = '<span class="tag">ネコポス ' + formatYen(nekoposContract()) + '</span><strong data-carrier-yen="' + nekoposContract() + '">' + formatYen(nekoposContract()) + '</strong><p>定額です。サイズ表の行ではありません。ルナルーチェがヤマトに払う金額です。</p>';
        } else if (yen == null) {
          result = '<span class="tag">ヤマト契約送料</span><strong data-carrier-yen="">未選択</strong><p>区分とサイズを選ぶと、契約送料が出ます。</p>';
        } else {
          result = '<span class="tag">ヤマト契約送料</span><strong data-carrier-yen="' + yen + '">' + formatYen(yen) + '</strong><p>' + escapeHtml(state.carrierZone) + '・サイズ' + state.carrierSize + '。ルナルーチェがヤマトに払う金額です。</p>';
        }
        host.innerHTML = '<section class="panel"><p class="kicker">Carrier cost</p><h2>ヤマト契約送料</h2><p class="lead">黒猫ヤマトの契約運賃です。電話などのお問い合わせで、当店の送料がいくらかかるかを見るためのものです。お客様が払う送料には入れません。名入れ・のし・包装はこの計算の外です。</p><div class="modes"><button type="button" data-action="carrier-mode" data-mode="size" aria-pressed="' + (sizeMode ? 'true' : 'false') + '">宅急便サイズ</button><button type="button" data-action="carrier-mode" data-mode="nekopos" aria-pressed="' + (sizeMode ? 'false' : 'true') + '">ネコポス</button></div><div class="pick"' + (sizeMode ? '' : ' hidden') + '><label>区分<select data-action="carrier-zone">' + zoneOptions + '</select></label><label>サイズ<select data-action="carrier-size">' + sizeOptions + '</select></label></div><div class="result" data-carrier-result>' + result + '<p>お客様への請求送料ではありません。</p></div>' + carrierEditBar() + '<div class="scroll">' + carrierTable(sizeMode) + '</div><aside class="nekopos"><h3>ネコポス ' + formatYen(nekoposContract()) + '</h3><p>定額です。上のサイズ表の行ではありません。お客様への請求送料ではありません。</p></aside></section>';
      }
      paint();
      on('oms:carrier', paint);
    }

