// Luna Luce OMS 部品JS: 24-builder-products（サイトビルダーの「商品」: 欠品・入荷待ちの切り替えと、単品商品の登録）
// 在庫の状態は OMS が正（3販路まとめ）。ここで切り替えたものは下書きの stock に入り、反映ツールでサイトへ送る。
// 商品の登録は「お手本の商品」をテンプレートにして、変えるところだけ直す。書き出しは site-src/products/<番号>.json と同じ形。
    const STOCK_STATES = [
      { id: 'in', label: '販売中', short: '販売中', hint: 'ふつうに注文できます' },
      { id: 'few', label: '残りわずか', short: '残りわずか', hint: '注文できます。商品ページに「残りわずか」と出します' },
      { id: 'wait', label: '入荷待ち（予約を受ける）', short: '入荷待ち', hint: '注文はできます。入荷予定日を商品ページに出します' },
      { id: 'out', label: '欠品（いまは注文できない）', short: '欠品', hint: 'カートに入れられなくなります。商品ページは残ります' },
      { id: 'end', label: '販売終了（サイトから外す）', short: '販売終了', hint: '一覧と検索から外れます' }
    ];
    const PRODUCT_TEXT_FIELDS = [
      ['description', '商品の説明', true],
      ['contents', '内容・セット内容', false],
      ['size', 'サイズ', false],
      ['material', '素材', false],
      ['expiry', '賞味期限', false],
      ['allergens', 'アレルギー', false],
      ['storage', '保存方法', false],
      ['notice', '注意事項', true]
    ];
    function stockState(id) {
      return STOCK_STATES.find(function (s) { return s.id === id; }) || STOCK_STATES[0];
    }
    // いまの在庫状態: 下書きで変えたもの → サイトのデータ → 販売中
    function builderStockOf(id) {
      const b = state.builder;
      if (b.stock[id]) return b.stock[id];
      const p = builderProduct(id);
      return (p && p.stock) || { status: 'in' };
    }
    function builderSetStock(id, patch) {
      const b = state.builder;
      const p = builderProduct(id);
      const base = (p && p.stock) || { status: 'in' };
      const next = Object.assign({}, builderStockOf(id), patch);
      if (next.status !== 'wait') delete next.eta;
      if (next.status === base.status && (next.eta || '') === (base.eta || '')) delete b.stock[id];
      else b.stock[id] = next;
    }
    function builderStockErrors() {
      const out = [];
      Object.keys(state.builder.stock).forEach(function (id) {
        const s = state.builder.stock[id];
        const p = builderProduct(id);
        if (s.status === 'wait' && !s.eta) out.push('入荷待ち: ' + (p ? p.title : id) + ' の入荷予定日を入れてください');
      });
      return out;
    }

    // お手本（テンプレート）の商品データは大きいので、商品の登録を開いたときに読む
    function builderLoadTemplates() {
      const b = state.builder;
      if (b.templates || b.templatesLoading) return;
      b.templatesLoading = true;
      fetch('builder-products.json').then(function (res) {
        if (!res.ok) throw new Error('builder-products.json を読めません');
        return res.json();
      }).then(function (data) {
        b.templates = data.products || [];
        b.templatesLoading = false;
        emit('oms:builder', { form: true });
      }).catch(function (err) {
        b.templatesLoading = false;
        b.templatesError = err.message;
        emit('oms:builder', { form: true });
      });
    }
    function builderTemplate(id) {
      return (state.builder.templates || []).find(function (p) { return String(p.id) === String(id); });
    }
    function builderNextProductId() {
      const b = state.builder;
      const nums = b.products.map(function (p) { return Number(p.id); }).concat(b.newProducts.map(function (p) { return Number(p.id); }));
      return String(Math.max.apply(null, nums.concat([0])) + 1);
    }
    function builderPlaceFind(pl) {
      const g = state.builder.links.categories.find(function (x) { return x.k === pl.g; });
      const m = g && g.mids.find(function (x) { return x.k === pl.m; });
      const sub = m && pl.s ? m.subs.find(function (x) { return x[0] === pl.s; }) : null;
      return { g: g, m: m, sub: sub, rule: sub ? sub[2] : m ? m.place : null };
    }
    function builderPlaceLabel(pl) {
      const f = builderPlaceFind(pl);
      return [f.g && f.g.name, f.m && f.m.name, f.sub && f.sub[1]].filter(Boolean).join(' › ');
    }
    // 選んだ置き場所から、サイトの分類の印（categories / subs）を組み立てる
    function builderPlaceTags(product) {
      const cats = [], subs = [];
      (product.places || []).forEach(function (pl) {
        const r = builderPlaceFind(pl).rule;
        if (!r) return;
        r.categories.forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });
        r.subs.forEach(function (x) { if (subs.indexOf(x) < 0) subs.push(x); });
      });
      if (product.hasName && cats.indexOf('nairi') < 0) cats.push('nairi');
      return { categories: cats, subs: subs };
    }
    function builderNewProduct(templateId) {
      const b = state.builder;
      const t = templateId ? builderTemplate(templateId) : null;
      const p = {
        id: builderNextProductId(), active: true, from: t ? String(t.id) : '',
        code: '', title: '', price: t ? t.price : 0, minq: t ? t.minq : 1, image: '',
        places: [], hasName: t ? !!t.hasName : false,
        skus: t ? t.skus.map(function (s) { return { t: t.skus.length > 1 ? s.t : '', price: s.price }; }) : [{ t: '', price: 0 }],
        spec: t ? cloneData(t.spec) : null, pack: t ? t.pack : 1, seal: t ? !!t.seal : false,
        stock: { status: 'in' }
      };
      PRODUCT_TEXT_FIELDS.forEach(function (f) { p[f[0]] = t ? (t[f[0]] || '') : ''; });
      if (t) {
        // お手本が並んでいる置き場所を、そのまま最初の置き場所にする
        b.links.categories.forEach(function (g) {
          g.mids.forEach(function (m) {
            if (p.places.length >= 2 || !m.place.ok) return;
            const ok = m.place.categories.every(function (c) { return t.categories.indexOf(c) >= 0; }) && m.place.subs.every(function (x) { return t.subs.indexOf(x) >= 0; }) && (!m.place.titleHint || t.title.indexOf(m.place.titleHint) >= 0);
            if (ok) p.places.push({ g: g.k, m: m.k, s: '' });
          });
        });
      }
      if (!p.places.length) p.places.push({ g: '', m: '', s: '' });
      return p;
    }
    function builderProductErrors(p) {
      const out = [];
      const codes = state.builder.products.map(function (x) { return (x.code || '').toLowerCase(); });
      if (!(p.title || '').trim()) out.push('商品名を入れてください');
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(p.code || '')) out.push('商品コードを英数字で入れてください（楽天・Yahooと同じものにすると照合が楽です）');
      else if (codes.indexOf(p.code.toLowerCase()) >= 0 || state.builder.newProducts.filter(function (x) { return (x.code || '').toLowerCase() === p.code.toLowerCase(); }).length > 1) out.push('同じ商品コードの商品がもうあります');
      if (!builderImageOk(p.image)) out.push('商品の画像を選ぶか取り込んでください');
      if (!(Number(p.minq) >= 1)) out.push('最低数量は1以上にしてください');
      if (!p.skus.length) out.push('種類（価格）を1つ以上入れてください');
      p.skus.forEach(function (s, i) {
        if (!(Number(s.price) > 0)) out.push('種類' + (i + 1) + 'の価格を入れてください');
        if (p.skus.length > 1 && !(s.t || '').trim()) out.push('種類' + (i + 1) + 'の名前を入れてください');
      });
      const places = (p.places || []).filter(function (pl) { return pl.g; });
      if (!places.length) out.push('サイトのどこに並べるか（置き場所）を選んでください');
      places.forEach(function (pl) {
        const f = builderPlaceFind(pl);
        if (!f.m) out.push(builderPlaceLabel(pl) + ': その中の分類まで選んでください');
        else if (!f.rule || !f.rule.ok) out.push(builderPlaceLabel(pl) + ': この置き場所は自動で並べられません。別の置き場所を選んでください');
        else if (f.rule.titleHint && (p.title || '').indexOf(f.rule.titleHint) < 0) out.push(builderPlaceLabel(pl) + 'に並べるには、商品名に「' + f.rule.titleHint + '」を入れてください');
      });
      if (!(p.description || '').trim()) out.push('商品の説明を入れてください');
      if (p.stock.status === 'wait' && !p.stock.eta) out.push('入荷予定日を入れてください');
      return out;
    }
    // サイトの商品ファイル（site-src/products/<番号>.json）と同じ形にする
    function builderProductRow(p) {
      const tags = builderPlaceTags(p);
      const skus = p.skus.map(function (s, i) { return { code: p.skus.length > 1 ? p.code + '-' + (i + 1) : p.code, t: (s.t || '').trim() || p.title, price: Number(s.price) }; });
      const firstPlace = builderPlaceFind((p.places || []).filter(function (pl) { return pl.g; })[0] || {});
      const product = {
        id: p.id, code: p.code, title: p.title.trim(), price: Math.min.apply(null, skus.map(function (s) { return s.price; })), image: p.image, sourceUrl: ''
      };
      PRODUCT_TEXT_FIELDS.forEach(function (f) { product[f[0]] = (p[f[0]] || '').trim(); });
      Object.assign(product, {
        category: firstPlace.m ? firstPlace.m.name : '', categories: tags.categories, subs: tags.subs,
        tags: p.hasName ? ['名入れ'] : [], skus: skus,
        spec: Object.assign({ fields: [], skus: [], minq: null, notes: [] }, p.spec || {}, { code: p.code, pid: p.id }),
        minq: Number(p.minq), minnote: '', hasName: !!p.hasName, petit: tags.categories.indexOf('petit') >= 0, seal: !!p.seal, pack: Number(p.pack) || 1
      });
      return { active: p.active !== false && p.stock.status !== 'end', product: product, stock: p.stock.status === 'in' ? undefined : cloneData(p.stock), template: p.from || undefined };
    }

    // ---- 真ん中の列 ----
    const STOCK_PAGE_SIZE = 20;
    // 在庫の一覧: 上の数字（すべて・販売中・欠品…）を押すとその状態だけに絞り、ページ送りで全部を順に見られる
    function builderStockForm() {
      const b = state.builder;
      const q = foldText(b.stockQuery || '');
      const filter = b.stockFilter || '';
      const list = b.products.filter(function (p) {
        if (filter && builderStockOf(p.id).status !== filter) return false;
        return !q || p.id.indexOf(q) === 0 || foldText(p.title).indexOf(q) >= 0 || foldText(p.code || '').indexOf(q) >= 0;
      });
      const pages = Math.max(1, Math.ceil(list.length / STOCK_PAGE_SIZE));
      const page = Math.min(Math.max(1, b.stockPage || 1), pages);
      const shown = list.slice((page - 1) * STOCK_PAGE_SIZE, page * STOCK_PAGE_SIZE);
      const chips = [['', 'すべて', b.products.length]].concat(STOCK_STATES.map(function (s) { return [s.id, s.short, b.products.filter(function (p) { return builderStockOf(p.id).status === s.id; }).length]; }));
      const nav = function (where) {
        if (pages <= 1) return '';
        const nums = [];
        for (let n = 1; n <= pages; n += 1) {
          if (n === 1 || n === pages || Math.abs(n - page) <= 2) nums.push(n);
          else if (nums[nums.length - 1] !== '…') nums.push('…');
        }
        return '<nav class="pager" aria-label="ページ送り（' + where + '）"><button type="button" data-b="stock-page" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹ 前へ</button>' +
          nums.map(function (n) { return n === '…' ? '<span class="gap">…</span>' : '<button type="button" data-b="stock-page" data-page="' + n + '"' + (n === page ? ' aria-current="page" class="is-on"' : '') + '>' + n + '</button>'; }).join('') +
          '<button type="button" data-b="stock-page" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>次へ ›</button></nav>';
      };
      const range = list.length ? ((page - 1) * STOCK_PAGE_SIZE + 1) + '〜' + Math.min(page * STOCK_PAGE_SIZE, list.length) + '件目 ／ ' + list.length + '件' : '0件';
      return '<h2>在庫の状態（欠品・入荷待ち）</h2><p class="lead">商品ごとに「いま売れるか」を切り替えます。楽天・Yahoo・本店の在庫をまとめた OMS の状態が正になります。</p>' +
        '<div class="stock-sum" role="group" aria-label="状態で絞り込む">' + chips.map(function (c) {
          return '<button type="button" class="st st-' + (c[0] || 'all') + (c[0] === filter ? ' is-on' : '') + '" data-b="stock-filter" data-filter="' + c[0] + '" aria-pressed="' + (c[0] === filter) + '">' + escapeHtml(c[1]) + ' <b>' + c[2] + '</b></button>';
        }).join('') + '</div>' +
        '<label class="fld"><span>商品名・商品番号・商品コードで探す（空なら全部）</span><input type="search" data-sq value="' + escapeHtml(b.stockQuery || '') + '" placeholder="例: シフォン / 48734"></label>' +
        '<p class="stock-range">' + escapeHtml((filter ? stockState(filter).short + 'の商品' : 'すべての商品') + '・' + range) + '</p>' + nav('上') +
        '<ol class="stock-list">' + shown.map(function (p) {
          const st = builderStockOf(p.id);
          return '<li class="stock-row st-' + st.status + (b.stockDetail === p.id ? ' is-open' : '') + '"><button type="button" class="open" data-b="stock-detail" data-id="' + escapeHtml(p.id) + '" title="商品の詳細を見る"><img src="' + escapeHtml(builderImg(p.image)) + '" alt="" loading="lazy"><span class="nm"><b>' + escapeHtml(p.title) + '</b><small>商品番号 ' + escapeHtml(p.id) + (p.code ? '・' + escapeHtml(p.code) : '') + '・' + formatYen(p.price) + '</small><em>詳細を見る ›</em></span></button>' +
            '<span class="ctl"><select data-stock="' + escapeHtml(p.id) + '" aria-label="在庫の状態">' + STOCK_STATES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === st.status ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>'; }).join('') + '</select>' +
            (st.status === 'wait' ? '<label class="eta"><span>入荷予定日</span><input type="date" data-stock-eta="' + escapeHtml(p.id) + '" value="' + escapeHtml(st.eta || '') + '"></label>' : '') + '</span></li>';
        }).join('') + '</ol>' + (list.length ? nav('下') : '<p class="muted">' + (filter ? stockState(filter).short + 'の商品はありません' : '見つかりません') + '</p>') +
        '<p class="muted">' + STOCK_STATES.map(function (s) { return s.short + ': ' + s.hint; }).join(' ／ ') + '</p>';
    }
    function builderSwitchRaw(label, attr, on) {
      return '<label class="switch"><input type="checkbox" ' + attr + (on ? ' checked' : '') + '><span>' + escapeHtml(label) + '</span></label>';
    }
    function builderProductStart() {
      const b = state.builder;
      builderLoadTemplates();
      const q = foldText(b.templateQuery || '');
      let hits = '';
      if (b.templates && q) {
        const found = b.templates.filter(function (p) { return String(p.id).indexOf(q) === 0 || foldText(p.title).indexOf(q) >= 0; }).slice(0, 8);
        hits = found.length ? found.map(function (p) {
          return '<button type="button" class="hit" data-b="product-new" data-template="' + escapeHtml(String(p.id)) + '"><img src="' + escapeHtml(builderImg(p.image)) + '" alt="" loading="lazy"><span>' + escapeHtml(p.title) + '<small>' + escapeHtml(String(p.id)) + '・' + formatYen(p.price) + '</small></span></button>';
        }).join('') : '<p class="muted">見つかりません</p>';
      }
      return '<h2>単品商品を登録する</h2><p class="lead">似ている商品を「お手本」に選ぶと、説明・注意事項・名入れの入力欄・置き場所をまるごと写します。変えるところだけ直してください。</p>' +
        '<h3>1. お手本にする商品を選ぶ</h3>' + (b.templatesError ? '<p class="muted">' + escapeHtml(b.templatesError) + '</p>' : !b.templates ? '<p class="muted">商品データを読み込み中…</p>' :
        '<label class="fld"><span>商品名か商品番号で探す</span><input type="search" data-tq value="' + escapeHtml(b.templateQuery || '') + '" placeholder="例: ドラジェ / 48734"></label><div class="hits" data-thits>' + hits + '</div>') +
        '<p class="muted">似ている商品がないときは <button type="button" data-b="product-new" data-template="">白紙から作る</button></p>';
    }
    function builderProductForm(p) {
      const b = state.builder;
      const t = p.from ? (b.products.find(function (x) { return x.id === p.from; }) || { title: p.from }) : null;
      const placeRows = p.places.map(function (pl, i) {
        const f = builderPlaceFind(pl);
        const g = f.g, m = f.m;
        let html = '<li class="place"><div class="row"><label class="fld"><span>大きな分類</span><select data-place="' + i + '" data-pp="g"><option value="">選んでください</option>' + b.links.categories.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === pl.g ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>';
        if (g) html += '<label class="fld"><span>その中の分類</span><select data-place="' + i + '" data-pp="m"><option value="">選んでください</option>' + g.mids.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === pl.m ? ' selected' : '') + (x.place.ok ? '' : ' disabled') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>';
        if (m && m.subs.length) html += '<label class="fld"><span>さらに細かく（任意）</span><select data-place="' + i + '" data-pp="s"><option value="">' + escapeHtml(m.name) + '</option>' + m.subs.map(function (x) { return '<option value="' + escapeHtml(x[0]) + '"' + (x[0] === pl.s ? ' selected' : '') + (x[2].ok ? '' : ' disabled') + '>' + escapeHtml(x[1]) + '</option>'; }).join('') + '</select></label>';
        html += '</div>';
        if (f.rule && f.rule.titleHint) html += '<small class="muted">ここに並べるには、商品名に「' + escapeHtml(f.rule.titleHint) + '」が入っている必要があります。</small>';
        if (p.places.length > 1) html += '<span class="tools"><button type="button" data-b="place-remove" data-index="' + i + '">この置き場所を外す</button></span>';
        return html + '</li>';
      }).join('');
      const st = p.stock;
      return '<h2>単品商品の登録</h2>' + (t ? '<p class="lead">お手本: ' + escapeHtml(t.title) + '（ここから写しました）</p>' : '<p class="lead">白紙から作っています。</p>') +
        '<div class="row">' + builderSwitch('サイトに出す', 'active', p.active !== false) + '<span class="tools"><button type="button" data-b="product-remove">この登録をやめる</button></span></div>' +
        '<h3>基本</h3>' + builderField('商品名', 'title', p.title, { wide: true, max: 80 }) +
        '<div class="row">' + builderField('商品コード', 'code', p.code, { placeholder: '例: kashi-xmas2', max: 40, hint: '楽天・Yahooと同じにすると、注文と在庫の照合が自動でできます' }) + builderField('最低数量', 'minq', String(p.minq), { type: 'number' }) + '</div>' +
        '<p class="muted">商品番号は自動で ' + escapeHtml(p.id) + ' になります。</p>' +
        '<h3>種類と価格（税込）</h3><ol class="skus">' + p.skus.map(function (s, i) {
          return '<li class="row">' + builderField(p.skus.length > 1 ? '種類' + (i + 1) + 'の名前' : '種類の名前（1つだけなら空でよい）', 'skus.' + i + '.t', s.t, { placeholder: '例: Sサイズ / 白' }) + builderField('価格（円）', 'skus.' + i + '.price', String(s.price || ''), { type: 'number' }) + (p.skus.length > 1 ? '<span class="tools"><button type="button" data-b="sku-remove" data-index="' + i + '">外す</button></span>' : '') + '</li>';
        }).join('') + '</ol><button type="button" class="add" data-b="sku-add">＋ 種類を足す（サイズ・色など）</button>' +
        '<h3>画像</h3><div class="imgs">' + builderImportButton('card') + '<div class="img-grid">' + builderProductImages(p) + '</div><small>「取り込み」の札が付いた画像は、ここで取り込んだものです。× で消せます。</small></div>' +
        '<h3>サイトのどこに並べるか（置き場所）</h3><ol class="places">' + placeRows + '</ol>' + (p.places.length < 3 ? '<button type="button" class="add" data-b="place-add">＋ 置き場所を足す</button>' : '') +
        builderSwitch('名入れできる商品にする（「名入れできる」の絞り込みに出ます）', 'hasName', !!p.hasName) +
        (p.spec && p.spec.fields && p.spec.fields.length ? '<p class="muted">名入れなどの入力欄 ' + p.spec.fields.length + '項目は、お手本から写しています。</p>' : '') +
        '<h3>説明</h3>' + PRODUCT_TEXT_FIELDS.map(function (f) { return builderField(f[1], f[0], p[f[0]], { wide: true, area: f[2] }); }).join('') +
        '<h3>在庫の状態</h3><label class="fld"><span>いまの状態</span><select data-f="stock.status">' + STOCK_STATES.filter(function (s) { return s.id !== 'end'; }).map(function (s) { return '<option value="' + s.id + '"' + (s.id === st.status ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>'; }).join('') + '</select></label>' +
        (st.status === 'wait' ? builderField('入荷予定日', 'stock.eta', st.eta || '', { type: 'date' }) : '');
    }
    function builderProductImages(p) {
      const b = state.builder;
      const choices = Array.from(new Set(builderImageChoices().concat(p.image ? [p.image] : []).concat(p.from && builderProduct(p.from) ? [builderProduct(p.from).image] : []))).filter(Boolean);
      return choices.map(function (src) { return builderImgTile(src, src === p.image); }).join('');
    }

    // ---- 右の列（見え方） ----
    function builderProductPreview(p) {
      const st = stockState(p.stock.status);
      const prices = p.skus.map(function (s) { return Number(s.price) || 0; });
      const min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
      return '<article class="pv-item">' + (p.image ? '<img src="' + escapeHtml(builderImg(p.image)) + '" alt="">' : '<div class="pv-empty">画像</div>') +
        '<h4>' + escapeHtml(p.title || '商品名') + '</h4><p class="pv-price">' + formatYen(min) + (max > min ? '〜' : '') + '<small>（税込）</small></p>' +
        (p.stock.status !== 'in' ? '<p class="pv-stock st-' + st.id + '">' + escapeHtml(st.short) + (p.stock.status === 'wait' && p.stock.eta ? '・' + escapeHtml(p.stock.eta.replace(/-/g, '/')) + '入荷予定' : '') + '</p>' : '') +
        (p.hasName ? '<p class="pv-tag">名入れできます</p>' : '') +
        '<p class="pv-desc">' + escapeHtml((p.description || '').slice(0, 120)) + ((p.description || '').length > 120 ? '…' : '') + '</p>' +
        '<p class="pv-place">並ぶ場所: ' + escapeHtml(p.places.filter(function (pl) { return pl.g; }).map(builderPlaceLabel).join(' ／ ') || '未選択') + '</p>' +
        '<p class="pv-all">' + (p.stock.status === 'out' ? 'いまは注文できません' : 'カートに入れる') + '</p></article>';
    }
    // 商品の詳細（右の列）。お手本用の商品データ（builder-products.json）から、説明・種類・名入れの入力欄まで出す
    function builderStockDetail(id) {
      const b = state.builder;
      builderLoadTemplates();
      const p = builderTemplate(id);
      const sum = builderProduct(id);
      if (!p) return '<p class="pv-note">' + (b.templatesError ? escapeHtml(b.templatesError) : sum ? '商品の詳細を読み込み中…' : 'この商品の詳細はありません') + '</p>';
      const st = builderStockOf(id);
      const state0 = stockState(st.status);
      const places = [];
      b.links.categories.forEach(function (g) {
        g.mids.forEach(function (m) {
          const r = m.place;
          if (r.ok && r.categories.every(function (c) { return p.categories.indexOf(c) >= 0; }) && r.subs.every(function (x) { return p.subs.indexOf(x) >= 0; }) && (!r.titleHint || p.title.indexOf(r.titleHint) >= 0)) places.push(g.name + ' › ' + m.name);
        });
      });
      const rows = [['内容', p.contents], ['サイズ', p.size], ['素材', p.material], ['賞味期限', p.expiry], ['アレルギー', p.allergens], ['保存方法', p.storage]].filter(function (r) { return r[1]; });
      const fields = (p.spec && p.spec.fields) || [];
      return '<div class="pv-detail"><p class="pv-note"><button type="button" data-b="stock-detail" data-id="">‹ 切り替えた商品の一覧に戻る</button></p>' +
        '<article class="pv-item">' + (p.image ? '<img src="' + escapeHtml(builderImg(p.image)) + '" alt="">' : '') +
        '<h4>' + escapeHtml(p.title) + '</h4><p class="pv-price">' + formatYen(p.price) + (p.skus.some(function (s) { return s.price !== p.price; }) ? '〜' : '') + '<small>（税込）</small></p>' +
        '<p class="pv-stock st-' + state0.id + '">' + escapeHtml(state0.short) + (st.eta ? '・' + escapeHtml(st.eta.replace(/-/g, '/')) + '入荷予定' : '') + '</p>' +
        '<dl class="pv-dl"><dt>商品番号</dt><dd>' + escapeHtml(String(p.id)) + '</dd><dt>商品コード</dt><dd>' + escapeHtml(p.code || '—') + '</dd><dt>最低数量</dt><dd>' + escapeHtml(String(p.minq || 1)) + '</dd>' +
        '<dt>並ぶ場所</dt><dd>' + escapeHtml(places.join(' ／ ') || '—') + '</dd><dt>名入れ</dt><dd>' + (p.hasName ? 'できる' : 'なし') + '</dd>' +
        rows.map(function (r) { return '<dt>' + escapeHtml(r[0]) + '</dt><dd>' + escapeHtml(r[1]) + '</dd>'; }).join('') + '</dl>' +
        (p.skus.length > 1 ? '<h5>種類と価格</h5><ul class="pv-ul">' + p.skus.map(function (s) { return '<li>' + escapeHtml(s.t) + '<b>' + formatYen(s.price) + '</b></li>'; }).join('') + '</ul>' : '') +
        (fields.length ? '<h5>注文時の入力欄（' + fields.length + '）</h5><ul class="pv-ul">' + fields.map(function (f) { return '<li>' + escapeHtml(f.label || f.k) + '<small>' + escapeHtml(f.form || '') + (f.req ? '・必須' : '') + '</small></li>'; }).join('') + '</ul>' : '') +
        (p.description ? '<h5>説明</h5><p class="pv-desc">' + escapeHtml(p.description) + '</p>' : '') +
        (p.notice ? '<h5>注意事項</h5><p class="pv-desc">' + escapeHtml(p.notice) + '</p>' : '') +
        '</article><p class="pv-actions"><button type="button" data-b="product-new" data-template="' + escapeHtml(String(p.id)) + '">この商品をお手本に新しい商品を登録</button></p></div>';
    }
    function builderStockPreview() {
      const b = state.builder;
      if (b.stockDetail) return builderStockDetail(b.stockDetail);
      const ids = Object.keys(b.stock);
      if (!ids.length) return '<p class="pv-note">まだ切り替えた商品はありません。</p>';
      return '<p class="pv-note">切り替えた商品 ' + ids.length + '件（書き出すとサイトへ反映できます）</p><ul class="pv-stock-list">' + ids.map(function (id) {
        const p = builderProduct(id);
        const s = b.stock[id];
        return '<li><b class="st st-' + s.status + '">' + escapeHtml(stockState(s.status).short) + '</b>' + escapeHtml(p ? p.title : id) + (s.eta ? '<small>' + escapeHtml(s.eta.replace(/-/g, '/')) + '入荷予定</small>' : '') + '</li>';
      }).join('') + '</ul>';
    }
