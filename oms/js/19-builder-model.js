// Luna Luce OMS 部品JS: 19-builder-model（サイトビルダーのデータ・検査・書き出し。画面は20〜23）
// データの元は builder-data.json（tools/oms-builder-data.cjs が site-src から作る）。
// 担当者はJSONを触らない。書き出しは site-builder-draft.json 1つにまとめ、tools/oms-builder-apply.cjs で site-src に反映する。
    const BUILDER_IMAGE_BASE = '../';
    const BUILDER_KINDS = {
      products: { label: '商品を並べるカード（2〜6つ）', short: '商品' },
      features: { label: '特集一覧のカード', short: '特集' },
      campaign: { label: 'キャンペーンのカード', short: 'キャンペーン' },
      message: { label: 'いちばん上の看板', short: '看板' } // 50-builder-sign
    };
    const BUILDER_STORE_KEY = 'luna-oms-builder-draft-v1';
    const BUILDER_UPLOAD_KEY = 'luna-oms-builder-uploads-v1';
    const BUILDER_TILE_MAX = 8;

    state.builder = { ready: false, error: '', themes: [], cards: [], notices: [], products: [], images: [], sel: { type: 'ticker', index: 0 }, query: {}, base: '', uploads: {}, links: { categories: [], features: [], pageGroups: [] }, linkOpen: '', linkTab: '', linkQuery: '', stock: {}, newProducts: [], newCats: [], catNames: {}, catHidden: {}, pageLayout: null, pageLayoutBase: null, catNameQuery: '', noteTemplates: null, days: null, news: [], sections: [], secOpen: '', secQuery: '', listing: {}, plans: [], planQuery: '', listFilter: '', stockQuery: '', stockFilter: '', stockPage: 1, templateQuery: '' };

    function builderSnapshot() {
      const b = state.builder;
      return JSON.stringify({ themes: b.themes.filter(function (t) { return !t.builtIn; }), cards: b.cards, notices: b.notices, uploads: Object.keys(b.uploads).sort(), stock: b.stock, newProducts: b.newProducts, newCats: b.newCats, catNames: b.catNames, catHidden: b.catHidden, pageLayout: b.pageLayout, texts: b.texts, noteTemplates: b.noteTemplates, days: b.days, news: b.news, sections: b.sections, listing: b.listing, plans: b.plans, store: b.store, storeTax: b.storeTax, noteTemplatesKnown: (b.noteTemplatesBase || []).map(function (t) { return t.id; }) });
    }
    function builderDirty() {
      return state.builder.ready && builderSnapshot() !== state.builder.base;
    }
    function builderSave() {
      try { localStorage.setItem(BUILDER_STORE_KEY, builderSnapshot()); } catch (e) { /* 保存できない環境では何もしない */ }
      builderHistRecord(); // 31-builder-history: 元に戻す用に前の形を覚える
    }
    // 取り込んだ画像は下書きとは別の場所に一時保存する（容量が大きいため）。入りきらない時は画面を閉じるまでだけ保持。
    function builderSaveUploads() {
      try { localStorage.setItem(BUILDER_UPLOAD_KEY, JSON.stringify(state.builder.uploads)); return true; } catch (e) { return false; }
    }
    function builderChanged(repaintForm) {
      builderSave();
      emit('oms:builder', { form: !!repaintForm });
    }
    function loadBuilder() {
      builderChecksLoad(); // 38-builder-fixlist: 要確認
      fetch('builder-data.json').then(function (res) {
        if (!res.ok) throw new Error('builder-data.json を読めません');
        return res.json();
      }).then(function (data) {
        const b = state.builder;
        b.themes = data.themes.map(cloneData);
        b.cards = data.cards.map(function (card) { const c = cloneData(card); delete c.inManifest; builderSignSyncTitle(c); return c; });
        b.notices = cloneData(data.notices.notices || []);
        b.products = data.products;
        b.images = data.images;
        b.links = data.links || b.links;
        b.uploads = {};
        b.stock = {};
        b.newProducts = [];
        b.newCats = [];
        b.catNames = {};
        b.catHidden = {};
        b.pageLayoutBase = data.productLayout || null; // 39-builder-layout（サイトの site-src/product-layout.json）
        b.pageLayout = null;
        b.textsBase = Array.isArray(data.siteTexts) ? data.siteTexts : null; // 40-builder-texts（サイトの site-src/site-texts.json）
        b.texts = {};
        b.storeBase = data.storeInfo || null; // 41-builder-store（サイトの site-src/store-info.json）
        b.store = null;
        b.storeTaxBase = data.productTax && data.productTax.products ? data.productTax.products : {}; // site-src/product-tax.json
        b.storeTax = {};
        b.noteTemplates = Array.isArray(data.noticeTemplates) ? cloneData(data.noticeTemplates) : null;
        b.noteTemplatesBase = Array.isArray(data.noticeTemplates) ? data.noticeTemplates : []; // 37-builder-delivery（無ければ標準の定型文）
        b.days = { weekly: [0, 6], off: [], on: [], am: [], long: [] }; // 営業日はOMSで管理するのが基本（2.21）
        b.news = [];
        b.sections = cloneData(data.homeSections || []); // トップの商品の段（2.24）
        b.listing = {};
        b.plans = [];
        b.base = builderSnapshot();
        try {
          const ups = JSON.parse(localStorage.getItem(BUILDER_UPLOAD_KEY) || 'null');
          if (ups && typeof ups === 'object') Object.keys(ups).forEach(function (k) { if (builderUploadPath(k) && /^data:image\/(jpeg|png);base64,/.test(ups[k].dataUrl || '')) b.uploads[k] = ups[k]; });
        } catch (e) { /* 壊れていたら取り込み画像なし */ }
        try {
          const saved = JSON.parse(localStorage.getItem(BUILDER_STORE_KEY) || 'null');
          if (saved && Array.isArray(saved.cards)) {
            b.cards = saved.cards;
            b.notices = saved.notices || b.notices;
            b.stock = saved.stock || {};
            b.newProducts = saved.newProducts || [];
            if ('days' in saved) b.days = builderDaysNorm(saved.days);
            b.news = saved.news || [];
            if (Array.isArray(saved.sections)) b.sections = saved.sections;
            b.newCats = saved.newCats || [];
            b.catNames = saved.catNames && typeof saved.catNames === 'object' ? saved.catNames : {};
            b.catHidden = saved.catHidden && typeof saved.catHidden === 'object' ? saved.catHidden : {};
            if (saved.pageLayout && Array.isArray(saved.pageLayout.side)) b.pageLayout = builderLayoutClean(saved.pageLayout);
            if (saved.texts && typeof saved.texts === 'object') b.texts = saved.texts;
            if (saved.store && saved.store.shipping) b.store = saved.store;
            if (saved.storeTax && typeof saved.storeTax === 'object') b.storeTax = saved.storeTax;
            if (Array.isArray(saved.noteTemplates)) {
              // 2.36: 古い下書きはサイトで後から足した定型文を知らないので、無いものはサイトの元データから足す（消したものが戻らないよう、下書きを作った後に足されたものだけ）
              const known = saved.noteTemplatesKnown || saved.noteTemplates.map(function (t) { return t.id; });
              const have = {}; saved.noteTemplates.forEach(function (t) { have[t.id] = 1; });
              const add = (Array.isArray(data.noticeTemplates) ? data.noticeTemplates : []).filter(function (t) { return !have[t.id] && known.indexOf(t.id) < 0; });
              b.noteTemplates = saved.noteTemplates.concat(cloneData(add));
            }
            b.listing = saved.listing || {};
            b.plans = saved.plans || [];
            b.themes = b.themes.filter(function (t) { return t.builtIn; }).concat(saved.themes || []);
          }
        } catch (e) { /* 下書きが壊れていたら元データのまま */ }
        builderApplyNewCats();
        builderApplyCatNames(); // 35-builder-catnames: 変えた名前を当てる
        b.ready = true;
        builderHistStart();
        emit('oms:builder', { form: true });
      }).catch(function (err) {
        state.builder.error = err.message;
        emit('oms:builder', { form: true });
      });
    }
    function builderResetDraft() {
      builderHistBeforeReset();
      try { localStorage.removeItem(BUILDER_STORE_KEY); localStorage.removeItem(BUILDER_UPLOAD_KEY); } catch (e) { /* 何もしない */ }
      state.builder.ready = false;
      state.builder.sel = { type: 'ticker', index: 0 };
      loadBuilder();
    }

    function builderTheme(id) {
      return state.builder.themes.find(function (t) { return t.id === id; }) || state.builder.themes[0];
    }
    function builderProduct(id) {
      return state.builder.products.find(function (p) { return p.id === String(id); });
    }
    function builderImg(src) {
      if (!src) return '';
      const up = state.builder.uploads[src];
      return up ? up.dataUrl : BUILDER_IMAGE_BASE + src;
    }
    function builderUploadPath(src) {
      return /^images\/uploads\/[a-z0-9][a-z0-9-]{0,60}\.(jpg|png)$/.test(src || '');
    }
    // 選べる画像: 取り込んだ画像（新しい順）→ サイトにある画像
    function builderImageChoices() {
      const b = state.builder;
      const ups = Object.keys(b.uploads).sort(function (x, y) { return (b.uploads[y].at || '').localeCompare(b.uploads[x].at || ''); });
      const hidden = builderHiddenImages();
      return ups.filter(function (src) { return hidden.indexOf(src) < 0; }).concat(b.images.filter(function (src) { return !b.uploads[src] && hidden.indexOf(src) < 0; }));
    }
    // アーカイブした画像（一覧から外すだけで画像は消さない。このブラウザに覚えておき、いつでも呼び戻せる）
    const BUILDER_HIDDEN_KEY = 'luna-oms-hidden-images-v1';
    function builderHiddenImages() {
      const b = state.builder;
      if (!b.hiddenImages) { try { b.hiddenImages = JSON.parse(localStorage.getItem(BUILDER_HIDDEN_KEY) || '[]'); } catch (e) { b.hiddenImages = []; } }
      return b.hiddenImages;
    }
    function builderSaveHidden() {
      try { localStorage.setItem(BUILDER_HIDDEN_KEY, JSON.stringify(state.builder.hiddenImages || [])); } catch (e) { /* 画面を開いている間だけ */ }
    }
    // その画像を使っているところ（カードの画像・特集のバナー）
    function builderImageUsers(src) {
      const users = [];
      state.builder.cards.forEach(function (c) {
        if (c.image === src) users.push('カード「' + (c.title || '題名なし') + '」');
        (c.tiles || []).forEach(function (t) { if (t.image === src) users.push('カード「' + (c.title || '') + '」の特集「' + (t.label || '') + '」'); });
      });
      return users;
    }
    function builderImageOk(src) {
      const b = state.builder;
      if (!src) return false;
      if (b.images.indexOf(src) >= 0 || b.uploads[src]) return true;
      // 商品の画像（いまの商品の写真）も使える
      return b.products.some(function (p) { return p.image === src; }) || (b.templates || []).some(function (p) { return p.image === src || (p.photos || []).indexOf(src) >= 0; });
    }
    // 画像の取り込み: 長い辺を1600pxまでに縮め、写真はJPEG・透過のあるPNGはPNGのまま。ファイル名は英数字に置き換える。
    function builderImportImage(file) {
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { reject(new Error('JPEG・PNG・WebP・GIFの画像を選んでください')); return; }
        if (file.size > 20 * 1024 * 1024) { reject(new Error('20MBより大きい画像は取り込めません')); return; }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          let png = false;
          if (file.type === 'image/png') {
            const px = ctx.getImageData(0, 0, w, h).data;
            for (let i = 3; i < px.length; i += 4) { if (px[i] < 255) { png = true; break; } }
          }
          if (!png) { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
          const dataUrl = png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
          const stem = (file.name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)) || 'image';
          const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
          let path = 'images/uploads/' + stem + '-' + day + '.' + (png ? 'png' : 'jpg');
          let n = 2;
          while (state.builder.uploads[path] || state.builder.images.indexOf(path) >= 0) { path = 'images/uploads/' + stem + '-' + day + '-' + n + '.' + (png ? 'png' : 'jpg'); n += 1; }
          state.builder.uploads[path] = { name: file.name, width: w, height: h, at: new Date().toISOString(), dataUrl: dataUrl };
          resolve({ path: path, stored: builderSaveUploads() });
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('画像を読めませんでした')); };
        img.src = url;
      });
    }
    function builderUsedUploads() {
      const used = {};
      state.builder.cards.forEach(function (c) {
        [c.image].concat((c.tiles || []).map(function (t) { return t.image; })).forEach(function (src) { if (state.builder.uploads[src]) used[src] = true; });
      });
      state.builder.newProducts.forEach(function (p) { (p.photos || []).concat([p.image]).forEach(function (src) { if (state.builder.uploads[src]) used[src] = true; }); });
      return Object.keys(used).sort();
    }
    function builderSelected() {
      const s = state.builder.sel;
      if (s.type === 'card') return state.builder.cards[s.index];
      if (s.type === 'theme') return state.builder.themes[s.index];
      if (s.type === 'product') return state.builder.newProducts[s.index];
      if (s.type === 'plan') return state.builder.plans[s.index];
      if (s.type === 'sections') return builderSectionOpen();
      return null;
    }

    // 日付: 画面では「開始日」「最終日」で選び、保存は時差付きISO（終了は最終日の翌日0時・含まない）
    function builderDateOf(iso) {
      if (!iso) return '';
      const t = Date.parse(iso);
      if (!Number.isFinite(t)) return '';
      return new Date(t + 9 * 3600000).toISOString().slice(0, 10);
    }
    function builderIsoOf(date) {
      return date ? date + 'T00:00:00+09:00' : '';
    }
    function builderLastDayOf(endIso) {
      if (!endIso) return '';
      const t = Date.parse(endIso);
      return Number.isFinite(t) ? builderDateOf(new Date(t - 86400000).toISOString()) : '';
    }
    function builderEndIsoOf(lastDay) {
      if (!lastDay) return '';
      const next = new Date(Date.parse(lastDay + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
      return builderIsoOf(next);
    }
    function builderDaysLeft(card, nowIso) {
      if (!card.endsAt) return null;
      return Math.ceil((Date.parse(card.endsAt) - Date.parse(nowIso)) / 86400000);
    }
    function builderOnNow(item, nowIso) {
      const now = Date.parse(nowIso);
      if (item.active === false) return false;
      if (item.startsAt && Date.parse(item.startsAt) > now) return false;
      if (item.endsAt && Date.parse(item.endsAt) <= now) return false;
      return true;
    }

    // リンク先: URLの文字を、担当者が読める名前に直す（カテゴリ・特集・ページ・商品）
    function builderLinkParse(href) {
      href = href || '';
      if (!href) return { type: 'none' };
      const q = href.indexOf('?');
      const file = q < 0 ? href.split('#')[0] : href.slice(0, q);
      const params = new URLSearchParams(q < 0 ? '' : href.slice(q + 1).split('#')[0]);
      if (file === 'category.html') return { type: 'category', g: params.get('g') || 'all', m: params.get('m') || '', s: params.get('s') || '', n: params.get('n') === '1', extra: Array.from(params.keys()).some(function (k) { return ['g', 'm', 's', 'n'].indexOf(k) < 0; }) };
      if (file === 'item.html' && params.get('id')) return { type: 'product', id: params.get('id') };
      return { type: 'page', file: file, plain: q < 0 && href.indexOf('#') < 0 };
    }
    function builderCategoryHref(g, m, sub, n) {
      let h = 'category.html?g=' + encodeURIComponent(g || 'all');
      if (m) h += '&m=' + encodeURIComponent(m);
      if (m && sub) h += '&s=' + encodeURIComponent(sub);
      if (n) h += '&n=1';
      return h;
    }
    function builderPageInfo(file) {
      const L = state.builder.links;
      const f = L.features.find(function (x) { return x.href === file; });
      if (f) return { label: f.label, image: f.image, group: '特集' };
      for (let i = 0; i < L.pageGroups.length; i += 1) {
        const p = L.pageGroups[i].pages.find(function (x) { return x.href === file; });
        if (p) return { label: p.label, image: '', group: L.pageGroups[i].name };
      }
      return null;
    }
    function builderLinkInfo(href) {
      const p = builderLinkParse(href);
      if (p.type === 'none') return { kind: 'なし', label: 'リンクなし', image: '' };
      if (/^#/.test(href || '')) { const a = SIGN_ANCHORS.find(function (x) { return x.href === href; }); return a ? { kind: 'トップの中', label: a.label, image: '' } : { kind: 'ページの中', label: href, image: '', bad: true }; }
      if (p.type === 'product') {
        const prod = builderProduct(p.id);
        return prod ? { kind: '商品', label: prod.title, image: prod.image } : { kind: '商品', label: '商品番号 ' + p.id + '（掲載中の商品にありません）', image: '', bad: true };
      }
      if (p.type === 'category') {
        if (p.g === 'all') return { kind: 'カテゴリ', label: 'すべての商品' + (p.n ? '（名入れできる商品だけ）' : ''), image: '' };
        const g = state.builder.links.categories.find(function (x) { return x.k === p.g; });
        if (!g) return { kind: 'カテゴリ', label: href, image: '', bad: true };
        const m = g.mids.find(function (x) { return x.k === p.m; });
        const sub = m && m.subs.find(function (x) { return x[0] === p.s; });
        return { kind: 'カテゴリ', label: [g.name, m && m.name, sub && sub[1]].filter(Boolean).join(' › ') + (p.n ? '（名入れできる商品だけ）' : ''), image: '' };
      }
      const info = builderPageInfo(p.file);
      return info ? { kind: info.group, label: info.label + (p.plain ? '' : '（くわしい指定あり）'), image: info.image } : { kind: 'ページ', label: href, image: '' };
    }
    function builderLocalLink(href) {
      return /^[a-z0-9][a-z0-9-]*\.html(?:[?#][^\s"'<>]*)?$/.test(href || '');
    }
    function builderPeriodErrors(item, required) {
      const out = [];
      if (required && (!item.startsAt || !item.endsAt)) out.push('開始日と最終日を選んでください');
      if (item.startsAt && item.endsAt && Date.parse(item.startsAt) >= Date.parse(item.endsAt)) out.push('最終日が開始日より前です');
      return out;
    }
    function builderCardErrors(card) {
      if (builderIsSign(card)) return builderSignErrors(card); // 50-builder-sign
      const out = [];
      if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(card.id)) out.push('カードの名前（英小文字・数字・-）を確認してください');
      if (state.builder.cards.filter(function (c) { return c.id === card.id; }).length > 1) out.push('同じ名前のカードがあります');
      if (!(card.title || '').trim()) out.push('題名を入れてください');
      if (!(card.text || '').trim()) out.push('一文を入れてください');
      if (!(card.cta || '').trim()) out.push('ボタンの文字を入れてください');
      if (!builderLocalLink(card.href)) out.push('ボタンのリンク先を選んでください');
      if (!state.builder.themes.some(function (t) { return t.id === card.theme; })) out.push('色のテーマを選んでください');
      if (card.image && !builderImageOk(card.image)) out.push('カードの上の画像が見つかりません。選び直してください');
      if (card.imageHeight && !(card.imageHeight >= 80 && card.imageHeight <= 400)) out.push('画像の大きさを選び直してください');
      if (card.kind === 'features') {
        if (!(card.tiles || []).length) out.push('特集を1つ以上入れてください');
        if ((card.tiles || []).length > BUILDER_TILE_MAX) out.push('特集は' + BUILDER_TILE_MAX + 'つまでにしてください');
        (card.tiles || []).forEach(function (tile, i) {
          if (!(tile.label || '').trim() || !builderLocalLink(tile.href) || !builderImageOk(tile.image)) out.push('特集' + (i + 1) + 'の名前・リンク・画像を確認してください');
        });
      } else {
        const ids = (card.ids || []).filter(Boolean);
        if (ids.length < 2 || ids.length > 6) out.push('商品を2〜6つ選んでください');
        if ((card.ids || []).some(function (x) { return !x; })) out.push('商品が空いている枠があります。選ぶか「この枠を消す」で消してください');
        if (new Set(ids).size !== ids.length) out.push('同じ商品が2回入っています');
        ids.forEach(function (id) { if (!builderProduct(id)) out.push('商品 ' + id + ' は掲載中の商品にありません'); });
        if (card.kind === 'campaign' && !(card.badge || '').trim()) out.push('キャンペーンの目印（例: 5円ご縁、10%OFF）を入れてください');
      }
      return out.concat(builderPeriodErrors(card, card.kind === 'campaign'));
    }
    function builderNoticeErrors() {
      const out = [];
      state.builder.notices.forEach(function (n, i) {
        const label = '流れる文言' + (i + 1) + ': ';
        if (!(n.text || '').trim()) out.push(label + '文を入れてください');
        if (n.href && !builderLocalLink(n.href)) out.push(label + 'リンク先を選び直してください');
        builderPeriodErrors(n, false).forEach(function (e) { out.push(label + e); });
      });
      return out;
    }
    function builderThemeErrors(theme) {
      const out = [];
      if (!/^[a-z][a-z0-9-]{1,20}$/.test(theme.id)) out.push('テーマの名前（英小文字）を確認してください');
      if (state.builder.themes.filter(function (t) { return t.id === theme.id; }).length > 1) out.push('同じ名前のテーマがあります');
      if (!(theme.name || '').trim()) out.push('表示名を入れてください');
      ['background', 'border', 'top', 'accent'].forEach(function (k) { if (!/^#[0-9a-f]{6}$/i.test(theme[k] || '')) out.push('色を選んでください'); });
      return out;
    }
    function builderAllErrors() {
      const out = builderTextsErrors().concat(builderNoticeErrors()).concat(builderStockErrors()).concat(builderDaysErrors()).concat(builderNewsErrors()).concat(builderSectionsErrors()).concat(builderListingErrors()).concat(builderPlanErrors()).concat(builderCatNamesErrors()).concat(builderNotesErrors()).concat(builderStoreErrors());
      state.builder.newProducts.forEach(function (p) {
        builderProductErrors(p).forEach(function (e) { out.push((p.edit ? '編集中の商品 ' : '新しい商品 ') + (p.title || p.id) + ': ' + e); });
      });
      state.builder.cards.forEach(function (card) {
        builderCardErrors(card).forEach(function (e) { out.push((card.title || '題名なしのカード') + ': ' + e); });
      });
      state.builder.themes.filter(function (t) { return !t.builtIn; }).forEach(function (t) {
        builderThemeErrors(t).forEach(function (e) { out.push('テーマ ' + (t.name || t.id) + ': ' + e); });
      });
      return out;
    }

    // 内部の名前（書き出すファイル名）は担当者に見せず、自動で重ならない名前を付ける
    function builderUniqueId(base, list) {
      let id = base, n = 2;
      while (list.some(function (x) { return x.id === id; })) { id = base + '-' + n; n += 1; }
      return id;
    }
    function builderNewCard(kind) {
      if (kind === 'message') return builderSignNew(state.builder.cards); // 50-builder-sign
      const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      const card = { id: builderUniqueId(kind + '-' + day, state.builder.cards), active: false, kind: kind, theme: kind === 'campaign' ? 'rose' : 'cream', title: '', text: '', href: '', cta: '' };
      if (kind === 'features') { card.tiles = []; card.image = ''; }
      else { card.image = ''; card.ids = ['', '', '', '']; }
      if (kind === 'campaign') { card.badge = ''; card.showCountdown = true; card.startsAt = ''; card.endsAt = ''; card.timeZone = 'Asia/Tokyo'; }
      return card;
    }
    function builderExportPayload() {
      const b = state.builder;
      return {
        schemaVersion: 1,
        kind: 'luna-site-builder-draft',
        exportedAt: new Date().toISOString(),
        manifest: builderCardOrder(b.cards).map(function (c) { return c.id; }), // 看板が先（50-builder-sign）
        cards: b.cards.map(function (c) {
          const out = cloneData(c);
          if (builderIsSign(out)) { ['startsAt', 'endsAt'].forEach(function (k) { if (!out[k]) delete out[k]; }); if (!out.startsAt && !out.endsAt) delete out.timeZone; return builderSignExport(out); }
          if (out.kind === 'products') delete out.kind;
          if (out.kind === 'features' && !out.image) delete out.image;
          if (!out.image || !out.imageHeight || out.imageHeight === 130) delete out.imageHeight;
          ['startsAt', 'endsAt'].forEach(function (k) { if (!out[k]) delete out[k]; });
          if (!out.startsAt && !out.endsAt) delete out.timeZone;
          return out;
        }),
        notices: b.notices.map(function (n) {
          const out = cloneData(n);
          ['href', 'startsAt', 'endsAt'].forEach(function (k) { if (!out[k]) delete out[k]; });
          return out;
        }).concat(builderAutoBands()), // 長期休暇から自動で出す文言（auto: 'days'）
        // お知らせ本文（手で書いた記事＋長期休暇から自動で作った記事 auto: 'days'）
        news: builderNewsExport(),
        // トップの商品の段（site-src/home-sections.json と同じ形）。並び順・表示する/しない・期間・足した段
        homeSections: builderSectionsExport(),
        themes: b.themes.filter(function (t) { return !t.builtIn; }).map(function (t) {
          return { id: t.id, name: t.name, background: t.background, border: t.border, top: t.top, accent: t.accent };
        }),
        // 在庫の状態を切り替えた商品（OMSが正）。status: in/few/wait/out/end、wait は eta（入荷予定日）付き
        stock: Object.keys(b.stock).map(function (id) { const p = builderProduct(id); return Object.assign({ id: id, code: p ? p.code : '' }, b.stock[id]); }),
        // 営業日（OMSで管理しているときだけ）: 今日から1年分のお休みの日。Welcartの受け取りプラグインがこの通りにする
        businessDays: builderDaysExport(),
        // OMSで新しく作ったカテゴリー（level g/m/s、k は英字の名前）。反映ツールとWelcartの受け取りプラグインが作る
        newCategories: (b.newCats || []).map(cloneData),
        // カテゴリーの名前を変えたもの（level g/m/s・k は英字の名前・before は元の名前）。英字の名前は変えない
        categoryNames: builderCatNamesExport(),
        // 消すカテゴリー（商品0件のものだけ。level g/m/s・k は英字の名前）。サイトのメニューと一覧に出さない
        hiddenCategories: builderCatHiddenExport(),
        // 商品ページの段組み（side = 写真の右 / below = 写真の下）。サイトの site-src/product-layout.json
        productLayout: builderLayoutExport(),
        // 表示する文字（{ key, text } の並び）。サイトの site-src/site-texts.json
        texts: builderTextsExport(),
        // お店の案内・送料・税率（site-src/store-info.json）と商品ごとの税の種類（site-src/product-tax.json）
        storeInfo: builderStoreExport().storeInfo,
        productTax: builderStoreExport().productTax,
        // 注意事項の定型文（site-src/notice-templates.json の templates と同じ形）。商品の notes はこの id を並べる
        noticeTemplates: builderNotesExport(),
        // 出す・出さないと販売期間（source: site=新サイト / w=本店だけ / new=新しい商品）。企画に入った商品は企画の期間
        listing: builderListingExport(),
        // 企画（季節・イベント・セール）。members は書き出した時点の対象の商品
        plans: builderPlanExport(),
        // 新しく登録する商品（site-src/products/<id>.json と同じ形）。photos は写真の並び（1枚目がメイン）
        products: b.newProducts.filter(function (p) { return !p.edit; }).map(builderProductRow),
        // 登録済みの商品を直したもの（同じ形。商品番号は元のまま）
        edits: b.newProducts.filter(function (p) { return p.edit; }).map(builderProductRow),
        // 取り込んだ画像（カードで使っているものだけ）。反映ツールが path の場所に書き出す。
        uploads: builderUsedUploads().map(function (src) {
          const u = b.uploads[src];
          return { path: src, originalName: u.name, width: u.width, height: u.height, dataUrl: u.dataUrl };
        })
      };
    }
