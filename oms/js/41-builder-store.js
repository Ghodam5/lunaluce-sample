// Luna Luce OMS 部品JS: 41-builder-store（お店の案内・送料・税率）
// 2.36 で追加。書き出しの storeInfo → サイトの site-src/store-info.json、productTax → site-src/product-tax.json。
// ・ヘッダーの案内バー（1行）とフッターの「お届けと送料」は、1つずつ「表示する」を選べる。外しても消えず、あとで使える。
// ・送料無料の金額と、税別・税込のどちらで判定するか。地域ごとの送料。
// ・税率表: 切替日ごとに標準・食品の税率。「使う」にした行のうち、今日までで一番新しい行がサイトで使われる。
// ・商品ごとの税の種類（標準・食品・セット）。セット（お菓子と雑貨など）は税理士さんに確認するまで「要確認」に出す。
    const STORE_PAGES = [
      ['shipping.html', '送料・お届けのご案内'], ['shipping.html#fee', '送料（地域別の表）'], ['shipping.html#lead-time', '発送までの日数'], ['shipping.html#nekopos', 'ネコポス（ポスト投函）'],
      ['bulk-order.html', '大口注文のご相談'], ['overseas-shipping.html', '海外発送について'], ['shopping-guide.html', 'お買い物ガイド'], ['faq.html', 'よくあるご質問'], ['contact.html', 'お問い合わせ']
    ];
    const STORE_CLASS = [['standard', '標準（雑貨など）'], ['food', '食品（軽減税率）'], ['set', 'セット（税理士さんに確認）']];
    function builderStore() {
      const b = state.builder;
      if (!b.store) b.store = b.storeBase ? cloneData(b.storeBase) : null;
      return b.store;
    }
    function builderStoreTax() { const b = state.builder; if (!b.storeTax || typeof b.storeTax !== 'object') b.storeTax = {}; return b.storeTax; }
    function builderStoreTaxRow(id) { const own = builderStoreTax()[id]; return own || (state.builder.storeTaxBase || {})[id] || { class: 'standard', checked: false }; }
    function builderStoreChanged() {
      const b = state.builder;
      return (b.store && b.storeBase && JSON.stringify(b.store) !== JSON.stringify(b.storeBase) ? 1 : 0) + Object.keys(builderStoreTax()).length;
    }
    function builderStoreMoney(n) { return Number(n || 0).toLocaleString('ja-JP'); }
    function builderStoreFill(t) {
      const s = builderStore();
      return String(t || '').replace(/{free}/g, builderStoreMoney(s.shipping.freeThreshold)).replace(/{fee:([a-z0-9-]+)}/g, function (_, id) {
        const r = s.shipping.regions.find(function (x) { return x.id === id; });
        return r ? builderStoreMoney(r.fee) + '円（' + (r.feeBasis === 'incl' ? '税込' : '税別') + '）' : '｛地域がありません｝';
      });
    }
    // セット商品で、まだ「税理士さんに確認した」になっていないもの（要確認に出す）
    function builderStoreSetsToCheck() {
      return state.builder.products.filter(function (p) { const r = builderStoreTaxRow(p.id); return r.class === 'set' && !r.checked; });
    }
    function builderStoreErrors() {
      const s = builderStore();
      if (!s) return [];
      const out = [], N = 'お店の案内・送料・税率: ';
      const bad = function (t, max) { return typeof t !== 'string' || !t.trim() || t.length > max || /[<>]/.test(t); };
      s.bar.forEach(function (x, i) { if (bad(x.label, 6) || bad(x.text, 40)) out.push(N + '案内バー ' + (i + 1) + 'つ目は見出し6文字・文40文字まで（空はだめ）'); });
      if (bad(s.footer.title, 20)) out.push(N + 'フッターの見出しは20文字まで');
      s.footer.lines.forEach(function (x, i) { if (bad(x.text, 80)) out.push(N + 'フッター ' + (i + 1) + '行目は80文字まで（空はだめ）'); });
      const sh = s.shipping;
      if (!Number.isInteger(sh.freeThreshold) || sh.freeThreshold < 0 || sh.freeThreshold > 1000000) out.push(N + '送料無料の金額を整数で入れてください');
      sh.regions.forEach(function (r) { if (!r.name || !Number.isInteger(r.fee) || r.fee < 0 || r.fee > 100000) out.push(N + '送料「' + (r.name || '名前なし') + '」の金額を整数で入れてください'); });
      const dates = {};
      s.tax.rates.forEach(function (r) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.from || '')) out.push(N + '税率表に切替日が空の行があります');
        else if (dates[r.from]) out.push(N + '税率表の切替日 ' + r.from + ' が重なっています');
        dates[r.from] = 1;
        ['standard', 'food'].forEach(function (k) { if (typeof r[k] !== 'number' || !(r[k] >= 0 && r[k] <= 30)) out.push(N + '税率表 ' + (r.from || '') + ' の税率を0〜30で入れてください'); });
      });
      if (!s.tax.rates.some(function (r) { return r.active && r.from <= s.tax.priceBasisDate; })) out.push(N + 'いまの価格のもとになる税率（' + s.tax.priceBasisDate + ' より前の「使う」の行）がありません');
      return out;
    }
    // 要確認（反映は止めない）: セット商品と、切替日が近いのに「使う」になっていない税率
    function builderStoreChecks() {
      const s = builderStore();
      if (!s) return [];
      const out = [];
      const sets = builderStoreSetsToCheck();
      if (sets.length) out.push({ id: 'store-sets', text: 'セット商品 ' + sets.length + '件（' + sets.slice(0, 3).map(function (p) { return p.title; }).join('、') + (sets.length > 3 ? ' ほか' : '') + '）は、税理士さんに税率を確認してください。お菓子と雑貨のセットは「税抜1万円以下・食品の割合が3分の2以上」なら食品の税率、それ以外は10%です。確認したら「お店の案内・送料・税率」で食品か標準を選びます。', sel: { type: 'store', index: 0 } });
      const today = builderDaysToday();
      s.tax.rates.forEach(function (r) {
        if (!r.active && r.from > today && r.from <= builderDaysAddMonths(today, 6)) out.push({ id: 'store-rate-' + r.id, text: '税率表の ' + r.from + ' の行（' + (r.note || '') + '）がまだ「使う」になっていません。法律が決まったら「使う」にしてください。', sel: { type: 'store', index: 0 } });
      });
      return out;
    }
    function builderStoreForm() {
      const s = builderStore();
      if (!s) return '<h2>お店の案内・送料・税率</h2><p class="muted">サイトの元データ（site-src/store-info.json）がまだ読み込まれていません。</p>';
      const b = state.builder;
      const pageSel = function (path, v) {
        return '<select data-store="' + path + '">' + STORE_PAGES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === v ? ' selected' : '') + '>' + escapeHtml(p[1]) + '</option>'; }).join('') + (STORE_PAGES.some(function (p) { return p[0] === v; }) ? '' : '<option value="' + escapeHtml(v) + '" selected>' + escapeHtml(v) + '</option>') + '</select>';
      };
      const sw = function (path, on) { return '<label class="switch"><input type="checkbox" data-store="' + path + '"' + (on ? ' checked' : '') + '><span>表示する</span></label>'; };
      const bar = s.bar.map(function (x, i) {
        return '<li class="notice' + (x.active ? '' : ' is-off') + '"><div class="row">' + sw('bar.' + i + '.active', x.active) + '<span class="tools"><button type="button" data-b="store-move" data-list="bar" data-index="' + i + '" data-dir="-1">↑</button><button type="button" data-b="store-move" data-list="bar" data-index="' + i + '" data-dir="1">↓</button></span></div>' +
          '<div class="row"><label class="fld"><span>見出し（6文字）</span><input type="text" maxlength="6" data-store="bar.' + i + '.label" value="' + escapeHtml(x.label) + '"></label><label class="fld wide"><span>文（40文字）</span><input type="text" maxlength="40" data-store="bar.' + i + '.text" value="' + escapeHtml(x.text) + '"></label></div>' +
          '<label class="fld"><span>押したときに開くページ</span>' + pageSel('bar.' + i + '.href', x.href) + '</label></li>';
      }).join('');
      const lines = s.footer.lines.map(function (x, i) {
        return '<li class="notice' + (x.active ? '' : ' is-off') + '"><div class="row">' + sw('footer.lines.' + i + '.active', x.active) + '<span class="tools"><button type="button" data-b="store-move" data-list="footer.lines" data-index="' + i + '" data-dir="-1">↑</button><button type="button" data-b="store-move" data-list="footer.lines" data-index="' + i + '" data-dir="1">↓</button></span></div>' +
          '<label class="fld wide"><span>文（80文字）</span><input type="text" maxlength="80" data-store="footer.lines.' + i + '.text" value="' + escapeHtml(x.text) + '"></label></li>';
      }).join('');
      const sh = s.shipping;
      const regions = sh.regions.map(function (r, i) {
        return '<tr><th scope="row"><input type="text" maxlength="20" data-store="shipping.regions.' + i + '.name" value="' + escapeHtml(r.name) + '" aria-label="地域名"></th>' +
          '<td><input type="number" min="0" max="100000" step="10" data-store="shipping.regions.' + i + '.fee" data-num="1" value="' + r.fee + '" aria-label="送料"> 円</td>' +
          '<td><select data-store="shipping.regions.' + i + '.feeBasis"><option value="incl"' + (r.feeBasis === 'incl' ? ' selected' : '') + '>税込</option><option value="excl"' + (r.feeBasis === 'excl' ? ' selected' : '') + '>税別</option></select></td>' +
          '<td><label class="switch"><input type="checkbox" data-store="shipping.regions.' + i + '.freeApplies"' + (r.freeApplies ? ' checked' : '') + '><span>送料無料の対象</span></label></td></tr>';
      }).join('');
      const today = builderDaysToday();
      const usedId = (function () { let u = null; s.tax.rates.filter(function (r) { return r.active; }).sort(function (a, c) { return a.from < c.from ? -1 : 1; }).forEach(function (r) { if (r.from <= today) u = r.id; }); return u; })();
      const rates = s.tax.rates.map(function (r, i) {
        return '<tr class="' + (r.active ? '' : 'is-off') + (r.id === usedId ? ' is-now' : '') + '"><td><input type="date" data-store="tax.rates.' + i + '.from" value="' + escapeHtml(r.from) + '" aria-label="切替日"></td>' +
          '<td><input type="number" min="0" max="30" step="0.1" data-store="tax.rates.' + i + '.standard" data-num="1" value="' + r.standard + '" aria-label="標準の税率"> %</td>' +
          '<td><input type="number" min="0" max="30" step="0.1" data-store="tax.rates.' + i + '.food" data-num="1" value="' + r.food + '" aria-label="食品の税率"> %</td>' +
          '<td><label class="switch"><input type="checkbox" data-store="tax.rates.' + i + '.active"' + (r.active ? ' checked' : '') + '><span>使う</span></label>' + (r.id === usedId ? ' <b class="store-now">いま使っている</b>' : '') + '</td>' +
          '<td><input type="text" maxlength="60" data-store="tax.rates.' + i + '.note" value="' + escapeHtml(r.note || '') + '" aria-label="メモ"></td>' +
          '<td><button type="button" data-b="store-rate-remove" data-index="' + i + '"' + (r.id === usedId ? ' disabled title="いま使っている行は消せません"' : '') + '>消す</button></td></tr>';
      }).join('');
      // 商品の税の種類
      const f = b.storeTaxFilter || 'set', q = (b.storeTaxQuery || '').trim();
      const rows = b.products.filter(function (p) {
        const r = builderStoreTaxRow(p.id);
        if (f === 'unchecked' ? r.checked : f !== 'all' && r.class !== f) return false;
        return !q || (p.title + ' ' + p.id + ' ' + (p.code || '')).indexOf(q) >= 0;
      });
      const count = function (c) { return b.products.filter(function (p) { return builderStoreTaxRow(p.id).class === c; }).length; };
      const taxList = rows.slice(0, 80).map(function (p) {
        const r = builderStoreTaxRow(p.id);
        return '<li class="store-tax' + (r.class === 'set' && !r.checked ? ' is-warn' : '') + '"><span class="nm"><b>' + escapeHtml(p.title) + '</b><small>' + escapeHtml(p.id) + '・' + builderStoreMoney(p.price) + '円' + (r.why ? '・' + escapeHtml(r.why) : '') + '</small></span>' +
          '<select data-store-tax="' + escapeHtml(p.id) + '.class" aria-label="税の種類">' + STORE_CLASS.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === r.class ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select>' +
          '<label class="switch"><input type="checkbox" data-store-tax="' + escapeHtml(p.id) + '.checked"' + (r.checked ? ' checked' : '') + '><span>' + (r.class === 'set' ? '税理士さんに確認した' : '確認した') + '</span></label></li>';
      }).join('');
      const sets = builderStoreSetsToCheck().length;
      return '<h2>お店の案内・送料・税率</h2><p class="lead">ヘッダーの案内バー・フッターの「お届けと送料」・送料・税率をここで変えます。文の中の {free} は送料無料の金額、{fee:honshu} などは地域の送料に置きかわります。</p>' +
        '<h3>ヘッダーの案内バー（1行）</h3><p class="muted">「表示する」を外すと、消さずにしまっておけます。</p><ol class="notices">' + bar + '</ol><button type="button" class="add" data-b="store-bar-add">＋ 案内を足す</button>' +
        '<h3>フッターの「お届けと送料」</h3><label class="fld"><span>見出し</span><input type="text" maxlength="20" data-store="footer.title" value="' + escapeHtml(s.footer.title) + '"></label><ol class="notices">' + lines + '</ol><button type="button" class="add" data-b="store-line-add">＋ 行を足す</button>' +
        '<h3>送料</h3><div class="row"><label class="fld"><span>送料無料になる金額</span><input type="number" min="0" max="1000000" step="1000" data-store="shipping.freeThreshold" data-num="1" value="' + sh.freeThreshold + '"> 円以上</label>' +
        '<label class="fld"><span>金額の判定</span><select data-store="shipping.freeBasis"><option value="excl"' + (sh.freeBasis === 'excl' ? ' selected' : '') + '>税別（税抜）の合計で</option><option value="incl"' + (sh.freeBasis === 'incl' ? ' selected' : '') + '>税込の合計で</option></select></label></div>' +
        '<table class="store-tbl"><thead><tr><th>地域</th><th>送料</th><th>税</th><th>送料無料</th></tr></thead><tbody>' + regions + '</tbody></table>' +
        '<h3>税率表</h3><p class="muted">切替日になると自動でその税率になります（「使う」の行だけ）。食品1%など、法律が決まったら「使う」にしてください。商品の価格は ' + escapeHtml(s.tax.priceBasisDate) + ' の税率で税込になっていて、食品の税率が変わった日から税込の価格をつけ直します（セットは変えません）。</p>' +
        '<table class="store-tbl store-rates"><thead><tr><th>切替日</th><th>標準</th><th>食品</th><th>使う</th><th>メモ</th><th></th></tr></thead><tbody>' + rates + '</tbody></table><button type="button" class="add" data-b="store-rate-add">＋ 税率の行を足す</button>' +
        '<h3>商品ごとの税の種類</h3>' + (sets ? '<p class="store-warn"><b>セット商品 ' + sets + '件は税理士さんに確認してください。</b>お菓子と雑貨などのセットは、税抜1万円以下で食品の割合が3分の2以上なら食品の税率、それ以外は10%です。確認したら食品か標準を選び、「確認した」にチェックします。確認するまで価格は自動で変えません。</p>' : '') +
        '<div class="row"><label class="fld"><span>見る商品</span><select data-store-filter="1">' + [['set', 'セット（' + count('set') + '）'], ['food', '食品（' + count('food') + '）'], ['standard', '標準（' + count('standard') + '）'], ['unchecked', 'まだ確認していない'], ['all', 'すべて']].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === f ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' +
        '<label class="fld"><span>さがす</span><input type="search" data-store-query="1" value="' + escapeHtml(q) + '" placeholder="商品名・番号"></label></div>' +
        '<p class="muted">名前や原材料から自動で仮に分けています。違っていたら直してください。' + (rows.length > 80 ? '（' + rows.length + '件のうち80件を表示）' : '') + '</p><ul class="store-taxes">' + (taxList || '<li class="muted">該当する商品はありません。</li>') + '</ul>' +
        (builderStoreChanged() ? '<div class="row"><button type="button" data-b="store-reset">全部サイトの今の設定に戻す</button></div>' : '');
    }
    function builderStorePreview() {
      const s = builderStore();
      if (!s) return '';
      const bar = s.bar.filter(function (x) { return x.active; });
      const lines = s.footer.lines.filter(function (x) { return x.active; });
      const sh = s.shipping, bb = (sh.freeBasis === 'excl' ? '税別' : '税込') + builderStoreMoney(sh.freeThreshold) + '円';
      // 食品の税率が変わる行があれば、食品の価格がどう変わるかの例
      const on = s.tax.rates.filter(function (r) { return r.active; }).sort(function (a, c) { return a.from < c.from ? -1 : 1; });
      const rateOn = function (cls, d) { let r = on[0]; on.forEach(function (x) { if (x.from <= d) r = x; }); return r ? r[cls] : 0; };
      const today = builderDaysToday();
      const next = on.find(function (r) { return r.from > today; });
      let sample = '';
      if (next) {
        const r0 = rateOn('food', s.tax.priceBasisDate), r1 = next.food;
        const foods = state.builder.products.filter(function (p) { return builderStoreTaxRow(p.id).class === 'food'; }).slice(0, 4);
        if (r0 !== r1 && foods.length) sample = '<p class="pv-note">' + escapeHtml(next.from) + ' からの食品の価格（例）</p><ul class="txt-pv">' + foods.map(function (p) {
          const v = Math.floor(Math.round(p.price / (1 + r0 / 100)) * (1 + r1 / 100) + 1e-9);
          return '<li class="is-changed"><small>' + escapeHtml(p.title) + '</small><b>' + builderStoreMoney(p.price) + '円 → ' + builderStoreMoney(v) + '円</b></li>';
        }).join('') + '</ul>';
      }
      return '<p class="pv-note">ヘッダーの案内バー</p><div class="pv-storebar">' + (bar.map(function (x) { return '<span><b>' + escapeHtml(x.label) + '</b>' + escapeHtml(builderStoreFill(x.text)) + '</span>'; }).join('') || '<span class="muted">出しません</span>') + '</div>' +
        '<p class="pv-note">フッター</p><div class="pv-storeft"><b>' + escapeHtml(s.footer.title) + '</b><ul>' + lines.map(function (x) { return '<li>' + escapeHtml(builderStoreFill(x.text)) + '</li>'; }).join('') + '</ul></div>' +
        '<p class="pv-note">送料表（送料のページ）</p><table class="store-tbl"><thead><tr><th>配送先</th><th>' + bb + '未満</th><th>' + bb + '以上</th></tr></thead><tbody>' + sh.regions.map(function (r) {
          const fee = builderStoreMoney(r.fee) + '円（' + (r.feeBasis === 'incl' ? '税込' : '税別') + '）';
          return '<tr><th>' + escapeHtml(r.name) + '</th><td>' + fee + '</td><td>' + (r.freeApplies ? '送料無料' : fee) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="pv-note">今日（' + today + '）の税率: 標準 ' + rateOn('standard', today) + '%・食品 ' + rateOn('food', today) + '%</p>' + sample;
    }
    function builderStoreSet(path, value) {
      const keys = path.split('.');
      let o = builderStore();
      for (let i = 0; i < keys.length - 1; i += 1) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
    }
    function builderStoreInput(el, isChange) {
      if (el.dataset.storeFilter !== undefined) { state.builder.storeTaxFilter = el.value; builderChanged(true); return true; }
      if (el.dataset.storeQuery !== undefined) { state.builder.storeTaxQuery = el.value; if (isChange) builderChanged(true); return true; }
      if (el.dataset.storeTax !== undefined) {
        const parts = el.dataset.storeTax.split('.');
        const row = Object.assign({}, builderStoreTaxRow(parts[0]));
        if (parts[1] === 'checked') row.checked = el.checked; else { row.class = el.value; row.checked = false; }
        builderStoreTax()[parts[0]] = row;
        builderChanged(true);
        return true;
      }
      if (el.dataset.store === undefined) return false;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.num) v = el.value === '' ? NaN : Number(el.value);
      builderStoreSet(el.dataset.store, v);
      builderChanged(isChange && (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date' || el.type === 'number'));
      return true;
    }
    function builderStoreAction(name, el) {
      const s = builderStore();
      if (!s || name.indexOf('store-') !== 0) return false;
      const i = Number(el && el.dataset.index);
      const stamp = Date.now().toString(36);
      if (name === 'store-bar-add') s.bar.push({ id: 'bar-' + stamp, active: true, label: 'ご案内', text: '', href: 'shipping.html' });
      else if (name === 'store-line-add') s.footer.lines.push({ id: 'ft-' + stamp, active: true, text: '' });
      else if (name === 'store-rate-add') s.tax.rates.push({ id: 'r-' + stamp, from: '', active: false, standard: 10, food: 8, note: '' });
      else if (name === 'store-rate-remove') s.tax.rates.splice(i, 1);
      else if (name === 'store-move') {
        const list = el.dataset.list.split('.').reduce(function (o, k) { return o[k]; }, s);
        const j = i + Number(el.dataset.dir);
        if (j < 0 || j >= list.length) return true;
        const x = list[i]; list[i] = list[j]; list[j] = x;
      } else if (name === 'store-reset') { state.builder.store = null; state.builder.storeTax = {}; }
      else return false;
      builderChanged(true);
      return true;
    }
    function builderStoreExport() {
      const b = state.builder, s = builderStore();
      if (!s) return {};
      const products = Object.assign({}, b.storeTaxBase || {}, builderStoreTax());
      Object.keys(products).forEach(function (id) { if (products[id].class === 'standard' && !products[id].checked) delete products[id]; });
      return { storeInfo: s, productTax: { products: products } };
    }
