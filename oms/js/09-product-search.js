// Luna Luce OMS 部品JS: 09-product-search（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function foldText(value) {
      const text = String(value == null ? '' : value);
      const normalized = text.normalize ? text.normalize('NFKC') : text;
      return normalized.toLowerCase().replace(/\s+/g, '');
    }
    function buildCatalogLines(products) {
      const lines = [];
      (products || []).forEach(function (product) {
        const naire = !!(product.naire && product.naire.exists);
        const variants = product.skus && product.skus.length ? product.skus : [null];
        variants.forEach(function (sku, index) {
          const code = sku ? (sku.sku || '') : (product.sku || '');
          const skuName = sku ? (sku.name || '') : (product.sku_name || '');
          const line = {
            key: String(product.id) + '|' + code + '|' + index,
            productId: product.id,
            name: product.name || '',
            skuName: skuName,
            sku: code,
            itemCode: product.item_code || '',
            priceTaxIn: sku ? sku.price_tax_in : product.price_tax_in,
            stock: sku ? sku.stock : product.stock,
            naire: naire,
            noshi: !!product.noshi,
            wrapping: !!product.wrapping
          };
          line.hay = foldText([line.name, line.skuName, line.sku, line.itemCode].join(' '));
          lines.push(line);
        });
      });
      return lines;
    }
    function renderProductSearch(host) {
      let lines = [];
      let query = '';
      let pickedKey = '';
      let status = 'loading';

      host.innerHTML = '<section class="panel"><h2>商品検索</h2><p class="lead">バックアップの公開商品です。商品名かSKUを入れて選びます。選ぶと注文明細に、名前・SKU・税込価格・在庫（あるとき）・名入れ／のし／包装が入ります。ダミー注文はそのままです。</p><label class="query">商品名・SKU<input data-action="product-query" type="search" placeholder="例: ペンダントクロック / pb-hansel" autocomplete="off" spellcheck="false"></label><p class="meta" data-meta>商品データを読み込んでいます</p><div class="line" data-line aria-live="polite"></div><div class="hits" data-hits></div></section>';
      const meta = host.querySelector('[data-meta]');
      const lineHost = host.querySelector('[data-line]');
      const hits = host.querySelector('[data-hits]');
      const input = host.querySelector('[data-action="product-query"]');

      function flagChip(label, on) {
        return '<span class="flag' + (on ? ' is-on' : '') + '">' + escapeHtml(label) + (on ? 'あり' : 'なし') + '</span>';
      }
      function paintLine() {
        const line = lines.find(function (item) { return item.key === pickedKey; });
        if (!line) {
          lineHost.innerHTML = '<h3>注文明細</h3><p class="empty">まだ商品を選んでいません。</p>';
          return;
        }
        const skuName = line.skuName && line.skuName !== line.name
          ? '<div class="wide"><span>SKU名</span><strong>' + escapeHtml(line.skuName) + '</strong></div>'
          : '';
        const stock = line.stock == null
          ? ''
          : '<div><span>在庫</span><strong>' + escapeHtml(String(line.stock)) + '</strong></div>';
        lineHost.innerHTML = '<h3>注文明細</h3><div class="grid"><div class="wide"><span>商品名</span><strong>' + escapeHtml(line.name) + '</strong></div>' + skuName + '<div><span>SKU</span><strong>' + escapeHtml(line.sku) + '</strong></div><div><span>税込価格</span><strong>' + escapeHtml(formatYen(line.priceTaxIn)) + '</strong></div>' + stock + '</div><div class="flags">' + flagChip('名入れ', line.naire) + flagChip('のし', line.noshi) + flagChip('包装', line.wrapping) + '</div>';
      }
      function paintHits() {
        if (status !== 'ready') {
          hits.innerHTML = '<p class="empty">' + escapeHtml(status === 'error' ? '候補を出せません' : '読み込みが終わるまでお待ちください') + '</p>';
          return;
        }
        const q = foldText(query);
        if (!q) {
          hits.innerHTML = '<p class="empty">商品名かSKUを入れると、ここに候補が出ます。</p>';
          return;
        }
        const found = lines.filter(function (line) { return line.hay.indexOf(q) !== -1; });
        const shown = found.slice(0, 30);
        if (!shown.length) {
          hits.innerHTML = '<p class="empty">該当する商品はありません。</p>';
          return;
        }
        const more = found.length > shown.length
          ? '<p class="more">該当 ' + found.length + '件のうち先頭30件です。もう少し絞ってください。</p>'
          : '<p class="more">該当 ' + found.length + '件</p>';
        hits.innerHTML = more + shown.map(function (line) {
          const on = line.key === pickedKey;
          const variant = line.skuName && line.skuName !== line.name
            ? '<span>' + escapeHtml(line.skuName) + '</span>'
            : '';
          return '<button type="button" data-action="product-pick" data-key="' + escapeHtml(line.key) + '" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '"><strong>' + escapeHtml(line.name) + '</strong><span>' + escapeHtml(line.sku) + ' · ' + escapeHtml(formatYen(line.priceTaxIn)) + '</span>' + variant + '</button>';
        }).join('');
      }
      function paint() {
        paintLine();
        paintHits();
      }
      paint();
      on('oms:product-query', function (value) {
        query = value || '';
        paintHits();
      });
      on('oms:product-pick', function (key) {
        if (!lines.some(function (line) { return line.key === key; })) return;
        pickedKey = key;
        paint();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const first = hits.querySelector('button');
        if (first) pickCatalogProduct(first);
      });

      const url = new URL('oms-products.json', window.location.href);
      fetch(url.href).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      }).then(function (data) {
        const products = data && data.products;
        if (!Array.isArray(products)) throw new Error('products');
        lines = buildCatalogLines(products);
        status = 'ready';
        const ids = {};
        lines.forEach(function (line) { ids[line.productId] = true; });
        meta.textContent = '公開商品 ' + Object.keys(ids).length + '件、SKU ' + lines.length + '件。楽天・Yahoo・本店へは接続していません。';
        paint();
      }).catch(function () {
        status = 'error';
        meta.textContent = '同じフォルダの oms-products.json を読めませんでした。';
        paintHits();
      });
    }
    function onProductQuery(el) {
      emit('oms:product-query', el.value);
    }
    function pickCatalogProduct(el) {
      emit('oms:product-pick', el.dataset.key);
    }
