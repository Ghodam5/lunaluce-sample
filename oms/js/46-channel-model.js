// Luna Luce OMS 部品JS: 46-channel-model（販路ごとの値段・出す出さない・モールの決まり。データと計算だけ。画面は 47-channel-tab）
// 考え方: 商品は1つ（基準の値段＝本店のバックアップから取った値段）。販路ごとに「基準のまま／基準の○%上げ／この値段に固定」を選ぶ。
// 販路の標準の決め方を1つ決めておき、商品ごとに上書きできる。モールの決まり（上げ幅の上限・下限の値段・使えない言葉など）は
// あとからいつでも足せて、値段の画面が決まりに合わない所を「注意」として出す（送るのは止めない。決めるのは人）。
// 保存: いまはこのブラウザ（localStorage）。サーバーのDBに移すときは「3 DBスキーマ」の channel_* の表に同じ形で入れる。
    const CH_STORE_KEY = 'luna-oms-channels-v1';
    const CH_DEFAULT_CHANNELS = [
      { id: 'honten', name: '本店（Welcart）', on: true, base: true, note: '基準の値段の販路' },
      { id: 'rakuten', name: '楽天', on: true, note: 'RMSはつながっているらしい（APIの状態は未確認）' },
      { id: 'yahoo', name: 'Yahoo', on: true, note: '出店中。情報は届き次第' },
      { id: 'amazon', name: 'Amazon', on: false, note: 'いま出品しているか確認中' }
    ];
    const CH_MODES = [
      { id: 'base', label: '基準のまま' },
      { id: 'up', label: '基準の○%上げ' },
      { id: 'fixed', label: 'この値段に固定' }
    ];
    // 決まりの種類。check があるものは値段の画面で自動で確かめる。memo は書いておくだけ（人が見て判断する）。
    const CH_RULE_KINDS = [
      { id: 'up-max', label: '基準からの上げ幅の上限', unit: '%', check: true, help: '販路の値段が基準より何%まで高くしてよいか' },
      { id: 'diff-max', label: '基準との差の上限（上げ・下げとも）', unit: '%', check: true, help: '本店との値段の差を何%までにするか' },
      { id: 'min-yen', label: '値段の下限', unit: '円', check: true, help: 'これより安く出さない' },
      { id: 'ng-words', label: '商品名に使えない言葉', unit: '言葉（、で区切る）', check: true, help: '例: ％OFF、定価、通常価格（二重価格の表示など）' },
      { id: 'memo', label: '書いておくだけの決まり', unit: '', check: false, help: 'セールの期間の決まりなど、画面で確かめられないもの' }
    ];
    const CH_ROUNDS = [1, 10, 100];

    function chEmpty() {
      return { channels: CH_DEFAULT_CHANNELS.map(function (c) { return Object.assign({}, c); }), defaults: {}, items: {}, rules: [], history: [], pick: 'site' };
    }
    function chNorm(data) {
      const d = chEmpty();
      if (!data || typeof data !== 'object') return d;
      if (Array.isArray(data.channels) && data.channels.length) {
        d.channels = data.channels.filter(function (c) { return c && c.id && c.name; }).map(function (c) { return { id: String(c.id), name: String(c.name), on: c.on !== false, base: !!c.base, note: String(c.note || '') }; });
        if (!d.channels.some(function (c) { return c.base; })) d.channels[0].base = true;
      }
      if (data.defaults && typeof data.defaults === 'object') d.defaults = data.defaults;
      if (data.items && typeof data.items === 'object') d.items = data.items;
      if (Array.isArray(data.rules)) d.rules = data.rules.filter(function (r) { return r && r.id && r.ch && r.kind; });
      if (Array.isArray(data.history)) d.history = data.history.slice(-500);
      if (data.pick === 'site' || data.pick === 'all' || data.pick === 'none') d.pick = data.pick;
      return d;
    }
    function chBaseChannel(d) {
      return d.channels.filter(function (c) { return c.base; })[0] || d.channels[0];
    }
    // 販路の標準の決め方（無ければ基準のまま・10円単位で切り上げ）
    function chDefaultRule(d, chId) {
      const r = d.defaults[chId] || {};
      return { mode: r.mode === 'up' || r.mode === 'fixed' ? r.mode : 'base', pct: Number(r.pct) || 0, round: CH_ROUNDS.indexOf(Number(r.round)) >= 0 ? Number(r.round) : 10 };
    }
    // 商品が「扱う商品」に入っているか。pick: site=新サイトにある商品を最初から扱う / all=全部 / none=選んだものだけ
    function chPicked(d, product) {
      const it = d.items[product.id];
      if (it && typeof it.on === 'boolean') return it.on;
      if (d.pick === 'all') return true;
      if (d.pick === 'none') return false;
      return product.onSite === true;
    }
    // 商品×販路の決め方（商品ごとの上書きがあればそれ、無ければ販路の標準）
    function chRuleOf(d, productId, chId) {
      const it = d.items[productId];
      const own = it && it.ch && it.ch[chId];
      const def = chDefaultRule(d, chId);
      if (!own || !own.mode) return Object.assign({ own: false, list: own ? own.list !== false : true, yen: {} }, def);
      return { own: true, mode: own.mode, pct: own.mode === 'up' ? Number(own.pct) || 0 : def.pct, round: CH_ROUNDS.indexOf(Number(own.round)) >= 0 ? Number(own.round) : def.round, yen: own.yen || {}, list: own.list !== false };
    }
    function chRoundUp(yen, unit) {
      return Math.ceil(Math.round(yen * 100) / 100 / unit) * unit;
    }
    // 1つの種類（SKU）の、その販路での値段
    function chPrice(d, product, sku, chId) {
      const base = Number(sku ? sku.price : product.price) || 0;
      const ch = d.channels.filter(function (c) { return c.id === chId; })[0];
      if (!ch || ch.base) return base;
      const r = chRuleOf(d, product.id, chId);
      if (r.mode === 'up') return chRoundUp(base * (1 + r.pct / 100), r.round);
      if (r.mode === 'fixed') {
        const key = sku ? sku.code : product.code;
        const v = Number(r.yen[key]);
        return v > 0 ? v : base;
      }
      return base;
    }
    function chSkus(product) {
      return Array.isArray(product.skus) && product.skus.length ? product.skus : [{ code: product.code, t: '', price: product.price }];
    }
    // 決まりに合わない所を出す（[{ch, rule, msg}]）
    function chCheck(d, product, chId) {
      const out = [];
      const ch = d.channels.filter(function (c) { return c.id === chId; })[0];
      if (!ch || !ch.on) return out;
      const r = chRuleOf(d, product.id, chId);
      if (!r.list) return out;
      d.rules.filter(function (x) { return x.ch === chId && x.on !== false; }).forEach(function (rule) {
        const v = rule.kind === 'ng-words' ? String(rule.value || '') : Number(rule.value);
        chSkus(product).forEach(function (s) {
          const base = Number(s.price) || 0;
          const yen = chPrice(d, product, s, chId);
          const name = s.t ? '（' + s.t + '）' : '';
          if (rule.kind === 'up-max' && v >= 0 && base > 0 && yen > base * (1 + v / 100) + 0.5) out.push({ ch: chId, rule: rule.id, msg: ch.name + name + ': ' + yen + '円は基準' + base + '円の' + v + '%上げを超えています' });
          if (rule.kind === 'diff-max' && v >= 0 && base > 0 && Math.abs(yen - base) > base * v / 100 + 0.5) out.push({ ch: chId, rule: rule.id, msg: ch.name + name + ': 本店との差が' + v + '%を超えています（' + base + '円→' + yen + '円）' });
          if (rule.kind === 'min-yen' && v > 0 && yen < v) out.push({ ch: chId, rule: rule.id, msg: ch.name + name + ': ' + yen + '円は下限' + v + '円より安いです' });
        });
        if (rule.kind === 'ng-words' && v) {
          v.split(/[、,，\s]+/).filter(Boolean).forEach(function (w) {
            if (String(product.title || '').toLowerCase().indexOf(w.toLowerCase()) >= 0) out.push({ ch: chId, rule: rule.id, msg: ch.name + ': 商品名に「' + w + '」が入っています' });
          });
        }
      });
      // 同じ注意が種類の数だけ並ばないようにまとめる
      const seen = {};
      return out.filter(function (x) { if (seen[x.msg]) return false; seen[x.msg] = 1; return true; });
    }
    // 商品×販路の決め方を変える（変わった値段は履歴に残す）
    function chSetRule(d, product, chId, patch, who) {
      const before = chSkus(product).map(function (s) { return chPrice(d, product, s, chId); });
      const it = d.items[product.id] || (d.items[product.id] = {});
      it.ch = it.ch || {};
      const cur = it.ch[chId] || {};
      const next = Object.assign({}, cur, patch);
      if (next.mode === 'default') { delete next.mode; delete next.pct; delete next.round; delete next.yen; }
      if (!next.mode && next.list !== false) delete it.ch[chId]; else it.ch[chId] = next;
      const after = chSkus(product).map(function (s) { return chPrice(d, product, s, chId); });
      chSkus(product).forEach(function (s, i) {
        if (before[i] !== after[i]) d.history.push({ at: new Date().toISOString(), who: who || '', pid: product.id, code: s.code, ch: chId, from: before[i], to: after[i] });
      });
      if (d.history.length > 500) d.history = d.history.slice(-500);
    }
    function chRuleErrors(rule) {
      const kind = CH_RULE_KINDS.filter(function (k) { return k.id === rule.kind; })[0];
      const out = [];
      if (!kind) out.push('決まりの種類を選んでください');
      if (!rule.title || !String(rule.title).trim()) out.push('決まりの名前を入れてください');
      if (kind && kind.check && kind.unit !== '言葉（、で区切る）' && !(Number(rule.value) >= 0 && String(rule.value).trim() !== '')) out.push('数字を入れてください');
      if (kind && rule.kind === 'ng-words' && !String(rule.value || '').trim()) out.push('言葉を入れてください');
      return out;
    }
    // 書き出し（販路ごとのCSV用の行）: 商品コード, 種類コード, 種類, 基準の値段, この販路の値段, 決め方, 出す
    function chExportRows(d, products, chId) {
      const head = ['商品コード', '種類コード', '種類', '基準の値段', '値段', '決め方', '出す'];
      const rows = [head];
      products.filter(function (p) { return chPicked(d, p); }).forEach(function (p) {
        const r = chRuleOf(d, p.id, chId);
        const label = r.mode === 'up' ? '基準の' + r.pct + '%上げ（' + r.round + '円単位）' : r.mode === 'fixed' ? '固定' : '基準のまま';
        chSkus(p).forEach(function (s) {
          rows.push([p.code, s.code, s.t || '', String(s.price), String(chPrice(d, p, s, chId)), label + (r.own ? '' : '（販路の標準）'), r.list ? '出す' : '出さない']);
        });
      });
      return rows;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { chEmpty: chEmpty, chNorm: chNorm, chDefaultRule: chDefaultRule, chPicked: chPicked, chRuleOf: chRuleOf, chPrice: chPrice, chCheck: chCheck, chSetRule: chSetRule, chRuleErrors: chRuleErrors, chExportRows: chExportRows, chSkus: chSkus, CH_RULE_KINDS: CH_RULE_KINDS };
