// Luna Luce OMS 部品JS: 47-channel-tab（「7 販路と価格」タブ: 値段・モールの決まり・販路・変更の記録。計算は 46-channel-model）
// 商品の元: builder-products.json（新サイトにある商品）＋ builder-unlisted.json（本店だけの商品）。基準の値段はどちらも本店のバックアップの値段。
    state.ch = { ready: false, error: '', data: null, products: [], view: 'price', q: '', show: 'picked', page: 0, open: '', ruleDraft: null };

    function chLoad() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(CH_STORE_KEY) || 'null'); } catch (e) { saved = null; }
      state.ch.data = chNorm(saved);
      Promise.all(['builder-products.json', 'builder-unlisted.json'].map(function (f) {
        return fetch(f).then(function (r) { if (!r.ok) throw new Error(f + ' を読めません'); return r.json(); });
      })).then(function (res) {
        const site = (res[0].products || []).map(function (p) { return { id: String(p.id), code: p.code, title: p.title, price: p.price, image: p.image, skus: chSkus(p), onSite: true }; });
        const only = (res[1].products || []).map(function (p) { return { id: String(p.id), code: p.code, title: p.title, price: p.price, skus: chSkus(p), onSite: false, cat: p.cat }; });
        state.ch.products = site.concat(only);
        state.ch.ready = true;
        emit('oms:ch');
      }).catch(function (err) { state.ch.error = err.message; emit('oms:ch'); });
    }
    function chSave() {
      try { localStorage.setItem(CH_STORE_KEY, JSON.stringify(state.ch.data)); } catch (e) { showToast('このブラウザに保存できませんでした。「保存用に書き出す」で控えを取ってください。'); }
      emit('oms:ch');
    }
    function chWho() { return state.me ? state.me.display || state.me.name || '' : ''; }
    function chProductById(id) { return state.ch.products.filter(function (p) { return p.id === id; })[0]; }
    function chSellChannels() { return state.ch.data.channels.filter(function (c) { return !c.base; }); }
    function chVisible() {
      const c = state.ch, d = c.data;
      const q = c.q.trim().toLowerCase();
      return c.products.filter(function (p) {
        if (q && (p.code + ' ' + p.title).toLowerCase().indexOf(q) < 0) return false;
        if (c.show === 'picked') return chPicked(d, p);
        if (c.show === 'warn') return chPicked(d, p) && d.channels.some(function (ch) { return chCheck(d, p, ch.id).length; });
        if (c.show === 'own') return chPicked(d, p) && d.items[p.id] && d.items[p.id].ch && Object.keys(d.items[p.id].ch).length;
        if (c.show === 'site') return p.onSite;
        if (c.show === 'honten') return !p.onSite;
        return true;
      });
    }
    function chModeBadge(r) {
      if (!r.list) return '<span class="m off">出さない</span>';
      if (r.mode === 'up') return '<span class="m up">+' + r.pct + '%</span>';
      if (r.mode === 'fixed') return '<span class="m fix">固定</span>';
      return '<span class="m">基準</span>';
    }
    function chPriceText(d, p, chId) {
      const ys = chSkus(p).map(function (s) { return chPrice(d, p, s, chId); });
      const lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
      return formatYen(lo) + (hi !== lo ? '〜' : '');
    }

    function chPriceView() {
      const c = state.ch, d = c.data;
      const sell = chSellChannels();
      const defaults = '<section class="ch-box"><h3>販路の標準の決め方</h3><p class="muted">商品ごとに決めていない商品は、この決め方で値段が決まります。上げ幅はまだ決まっていなくても、あとでここを変えるだけで全部に当たります。</p><div class="ch-defs">' +
        sell.map(function (ch) {
          const r = chDefaultRule(d, ch.id);
          return '<div class="ch-def' + (ch.on ? '' : ' is-off') + '"><strong>' + escapeHtml(ch.name) + (ch.on ? '' : '（使っていない）') + '</strong>' +
            '<label>決め方 <select data-c="def-mode" data-ch="' + ch.id + '">' + CH_MODES.filter(function (m) { return m.id !== 'fixed'; }).map(function (m) { return '<option value="' + m.id + '"' + (r.mode === m.id ? ' selected' : '') + '>' + m.label + '</option>'; }).join('') + '</select></label>' +
            (r.mode === 'up' ? '<label class="unit-in">上げ幅 <input type="number" min="0" max="200" step="0.1" value="' + r.pct + '" data-c="def-pct" data-ch="' + ch.id + '"><span>%</span></label>' +
              '<label>端数 <select data-c="def-round" data-ch="' + ch.id + '">' + CH_ROUNDS.map(function (u) { return '<option value="' + u + '"' + (r.round === u ? ' selected' : '') + '>' + u + '円単位で切り上げ</option>'; }).join('') + '</select></label>' : '') +
            '</div>';
        }).join('') + '</div></section>';
      const list = chVisible();
      const per = 20, pages = Math.max(1, Math.ceil(list.length / per));
      if (c.page >= pages) c.page = pages - 1;
      const shown = list.slice(c.page * per, c.page * per + per);
      const counts = { picked: c.products.filter(function (p) { return chPicked(d, p); }).length };
      const filter = '<div class="ch-filter"><input type="search" placeholder="商品コード・商品名で探す" value="' + escapeHtml(c.q) + '" data-c="q">' +
        '<select data-c="show">' + [['picked', '扱う商品（' + counts.picked + '）'], ['warn', '決まりに合わない所あり'], ['own', '商品ごとに決めた物'], ['site', '新サイトにある商品'], ['honten', '本店だけの商品'], ['all', '全部（' + c.products.length + '）']].map(function (o) { return '<option value="' + o[0] + '"' + (c.show === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        '<label>最初から扱う商品 <select data-c="pick">' + [['site', '新サイトにある商品'], ['all', '全部'], ['none', '選んだ物だけ']].map(function (o) { return '<option value="' + o[0] + '"' + (d.pick === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>';
      const head = '<tr><th class="pk">扱う</th><th>商品</th><th>本店（基準）</th>' + sell.filter(function (ch) { return ch.on; }).map(function (ch) { return '<th>' + escapeHtml(ch.name) + '</th>'; }).join('') + '</tr>';
      const rows = shown.map(function (p) {
        const picked = chPicked(d, p);
        const warns = picked ? sell.reduce(function (n, ch) { return n + chCheck(d, p, ch.id).length; }, 0) : 0;
        const cells = sell.filter(function (ch) { return ch.on; }).map(function (ch) {
          const r = chRuleOf(d, p.id, ch.id);
          const w = picked ? chCheck(d, p, ch.id).length : 0;
          return '<td class="yen' + (w ? ' is-warn' : '') + '">' + (picked ? chPriceText(d, p, ch.id) + ' ' + chModeBadge(r) + (r.own ? '<span class="own" title="この商品だけの決め方">個別</span>' : '') : '<span class="muted">—</span>') + '</td>';
        }).join('');
        const isOpen = c.open === p.id;
        return '<tr class="' + (picked ? '' : 'is-out') + (isOpen ? ' is-open' : '') + '"><td class="pk"><input type="checkbox" data-c="pick-one" data-id="' + p.id + '"' + (picked ? ' checked' : '') + ' aria-label="扱う"></td>' +
          '<td class="nm"><button type="button" data-c="open" data-id="' + p.id + '"><span class="code">' + escapeHtml(p.code) + (p.onSite ? '' : ' <em>本店だけ</em>') + (warns ? ' <b class="warn">注意 ' + warns + '</b>' : '') + '</span>' + escapeHtml(p.title) + '</button></td>' +
          '<td class="yen">' + formatYen(p.price) + (chSkus(p).length > 1 ? '〜' : '') + '</td>' + cells + '</tr>' +
          (isOpen ? '<tr class="ch-edit-row"><td colspan="' + (3 + sell.filter(function (ch) { return ch.on; }).length) + '">' + chEditor(p) + '</td></tr>' : '');
      }).join('');
      const pager = '<div class="ch-pager"><button type="button" data-c="page" data-dir="-1"' + (c.page ? '' : ' disabled') + '>← 前</button><span>' + (list.length ? (c.page * per + 1) + '〜' + Math.min(list.length, c.page * per + per) + ' / ' + list.length + '件' : '0件') + '</span><button type="button" data-c="page" data-dir="1"' + (c.page < pages - 1 ? '' : ' disabled') + '>次 →</button>' +
        (shown.length ? '<button type="button" data-c="pick-page" data-on="1">このページを全部扱う</button><button type="button" data-c="pick-page" data-on="0">このページを全部外す</button>' : '') + '</div>';
      const out = '<section class="ch-box"><h3>書き出し</h3><p class="muted">扱う商品の、販路ごとの値段の一覧です。モールへはまだ送りません（API接続は情報がそろってから）。</p><div class="ch-out">' +
        sell.filter(function (ch) { return ch.on; }).map(function (ch) { return '<button type="button" data-c="csv" data-ch="' + ch.id + '">' + escapeHtml(ch.name) + 'の値段一覧（CSV）</button>'; }).join('') +
        '<button type="button" data-c="backup">保存用に書き出す（JSON）</button><label class="ch-file">保存用を読み込む<input type="file" accept="application/json" data-c="restore"></label></div></section>';
      return defaults + '<section class="ch-box"><h3>商品ごとの値段</h3>' + filter + '<div class="ch-scroll"><table class="ch-table">' + head + rows + '</table></div>' + pager + '</section>' + out;
    }
    function chEditor(p) {
      const d = state.ch.data;
      const skus = chSkus(p);
      const blocks = chSellChannels().filter(function (ch) { return ch.on; }).map(function (ch) {
        const r = chRuleOf(d, p.id, ch.id);
        const sel = r.own ? r.mode : 'default';
        const def = chDefaultRule(d, ch.id);
        const defText = def.mode === 'up' ? '基準の' + def.pct + '%上げ' : '基準のまま';
        const warns = chCheck(d, p, ch.id);
        return '<div class="ch-ed"><div class="ch-ed-head"><strong>' + escapeHtml(ch.name) + '</strong><label><input type="checkbox" data-c="list" data-id="' + p.id + '" data-ch="' + ch.id + '"' + (r.list ? ' checked' : '') + '> この販路に出す</label></div>' +
          '<label>決め方 <select data-c="mode" data-id="' + p.id + '" data-ch="' + ch.id + '"><option value="default"' + (sel === 'default' ? ' selected' : '') + '>販路の標準（' + defText + '）</option>' + CH_MODES.map(function (m) { return '<option value="' + m.id + '"' + (sel === m.id ? ' selected' : '') + '>' + m.label + '</option>'; }).join('') + '</select></label>' +
          (r.own && r.mode === 'up' ? '<label class="unit-in">上げ幅 <input type="number" min="0" max="200" step="0.1" value="' + r.pct + '" data-c="pct" data-id="' + p.id + '" data-ch="' + ch.id + '"><span>%</span></label>' : '') +
          (r.own && r.mode === 'fixed' ? skus.map(function (s) { return '<label class="unit-in">' + escapeHtml(s.t || '値段') + ' <input type="number" min="1" step="1" value="' + (Number(r.yen[s.code]) || s.price) + '" data-c="yen" data-id="' + p.id + '" data-ch="' + ch.id + '" data-sku="' + escapeHtml(s.code) + '"><span>円</span></label>'; }).join('') : '') +
          '<ul class="ch-prices">' + skus.map(function (s) { return '<li>' + escapeHtml(s.t || p.title).slice(0, 40) + '：基準 ' + formatYen(s.price) + ' → <strong>' + formatYen(chPrice(d, p, s, ch.id)) + '</strong></li>'; }).join('') + '</ul>' +
          (warns.length ? '<ul class="ch-warns">' + warns.map(function (w) { return '<li>' + escapeHtml(w.msg) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      }).join('');
      return '<div class="ch-editor"><p class="muted">「この値段に固定」は、本店の値段を変えてもこの販路は決めた金額のまま変わりません。「販路の標準」に戻すと、販路の決め方に従います。</p><div class="ch-eds">' + blocks + '</div><button type="button" data-c="open" data-id="' + p.id + '">閉じる</button></div>';
    }

    function chRulesView() {
      const d = state.ch.data;
      const draft = state.ch.ruleDraft;
      const kindOf = function (id) { return CH_RULE_KINDS.filter(function (k) { return k.id === id; })[0] || { label: id, unit: '' }; };
      const picked = state.ch.products.filter(function (p) { return chPicked(d, p); });
      const groups = d.channels.filter(function (c) { return !c.base; }).map(function (ch) {
        const rules = d.rules.filter(function (r) { return r.ch === ch.id; });
        return '<div class="ch-rule-group"><h4>' + escapeHtml(ch.name) + '<small>' + rules.length + '件</small></h4>' + (rules.length ? '<ul class="ch-rules">' + rules.map(function (r) {
          const k = kindOf(r.kind);
          const hits = k.check && r.on !== false ? picked.filter(function (p) { return chCheck(d, p, ch.id).some(function (w) { return w.rule === r.id; }); }).length : 0;
          return '<li class="' + (r.on === false ? 'is-off' : '') + '"><div><strong>' + escapeHtml(r.title) + '</strong><span class="kind">' + escapeHtml(k.label) + (r.value !== '' && r.value != null && k.unit ? '：' + escapeHtml(r.value) + (k.unit === '%' || k.unit === '円' ? k.unit : '') : '') + '</span>' +
            (r.text ? '<p>' + escapeHtml(r.text) + '</p>' : '') +
            '<small>' + (r.source ? '出どころ: ' + (/^https?:\/\//.test(r.source) ? '<a href="' + escapeHtml(r.source) + '" target="_blank" rel="noopener">' + escapeHtml(r.source) + '</a>' : escapeHtml(r.source)) : '出どころ未記入') + (r.checkedAt ? '・確かめた日 ' + escapeHtml(r.checkedAt) : '') + '</small>' +
            (k.check ? '<small class="' + (hits ? 'warn' : '') + '">' + (r.on === false ? '使っていない' : hits ? '合わない商品 ' + hits + '件' : '扱う商品はすべて合っています') + '</small>' : '<small>画面では確かめません（人が見て判断）</small>') + '</div>' +
            '<span class="acts"><button type="button" data-c="rule-edit" data-id="' + r.id + '">直す</button><button type="button" data-c="rule-toggle" data-id="' + r.id + '">' + (r.on === false ? '使う' : '止める') + '</button><button type="button" data-c="rule-del" data-id="' + r.id + '">消す</button></span></li>';
        }).join('') + '</ul>' : '<p class="muted">まだありません。</p>') + '</div>';
      }).join('');
      const form = draft ? (function () {
        const k = kindOf(draft.kind);
        const errs = draft.tried ? chRuleErrors(draft) : [];
        return '<section class="ch-box ch-rule-form"><h3>' + (draft.id ? '決まりを直す' : '決まりを足す') + '</h3>' +
          '<label>販路 <select data-c="rd" data-k="ch">' + d.channels.filter(function (c) { return !c.base; }).map(function (c) { return '<option value="' + c.id + '"' + (draft.ch === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>'; }).join('') + '</select></label>' +
          '<label>種類 <select data-c="rd" data-k="kind">' + CH_RULE_KINDS.map(function (x) { return '<option value="' + x.id + '"' + (draft.kind === x.id ? ' selected' : '') + '>' + x.label + '</option>'; }).join('') + '</select><small>' + escapeHtml(k.help) + '</small></label>' +
          '<label>決まりの名前 <input type="text" maxlength="60" value="' + escapeHtml(draft.title || '') + '" data-c="rd" data-k="title" placeholder="例: 二重価格の表示"></label>' +
          (k.unit ? '<label>' + (k.unit === '%' || k.unit === '円' ? '数字（' + k.unit + '）' : k.unit) + ' <input type="' + (k.unit === '%' || k.unit === '円' ? 'number' : 'text') + '" value="' + escapeHtml(draft.value == null ? '' : draft.value) + '" data-c="rd" data-k="value"></label>' : '') +
          '<label>説明（任意） <textarea rows="3" maxlength="800" data-c="rd" data-k="text">' + escapeHtml(draft.text || '') + '</textarea></label>' +
          '<label>出どころ（モールのページのURLや資料の名前） <input type="text" maxlength="300" value="' + escapeHtml(draft.source || '') + '" data-c="rd" data-k="source"></label>' +
          '<label>確かめた日 <input type="date" value="' + escapeHtml(draft.checkedAt || '') + '" data-c="rd" data-k="checkedAt"></label>' +
          (errs.length ? '<ul class="ch-warns">' + errs.map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') + '</ul>' : '') +
          '<div class="ch-out"><button type="button" class="primary" data-c="rule-save">保存する</button><button type="button" data-c="rule-cancel">やめる</button></div></section>';
      })() : '';
      return '<section class="ch-box"><h3>モールの決まり</h3><p class="muted">二重価格やセールの決まりなど、調べて分かったものからいつでも足せます。数字や言葉で確かめられる決まりは、「値段」の画面で合わない商品に注意が出ます（送るのは止めません）。</p>' +
        '<div class="ch-out"><button type="button" class="primary" data-c="rule-add">＋ 決まりを足す</button></div></section>' + form + '<section class="ch-box">' + groups + '</section>';
    }
    function chChannelsView() {
      const d = state.ch.data;
      return '<section class="ch-box"><h3>販路</h3><p class="muted">値段を分けて持つ販路です。本店が基準の値段です。新しい販路（例: LINEギフトなど）も足せます。使っていない販路は「使う」を外すと値段の表と書き出しに出ません。</p>' +
        '<ul class="ch-channels">' + d.channels.map(function (c) {
          return '<li><label><input type="checkbox" data-c="ch-on" data-ch="' + c.id + '"' + (c.on ? ' checked' : '') + (c.base ? ' disabled' : '') + '> 使う</label>' +
            '<input type="text" maxlength="30" value="' + escapeHtml(c.name) + '" data-c="ch-name" data-ch="' + c.id + '" aria-label="販路の名前">' +
            '<input type="text" maxlength="120" value="' + escapeHtml(c.note) + '" data-c="ch-note" data-ch="' + c.id + '" placeholder="メモ（つながり方・確認中のことなど）" aria-label="メモ">' +
            (c.base ? '<span class="tag">基準</span>' : (CH_DEFAULT_CHANNELS.some(function (x) { return x.id === c.id; }) ? '' : '<button type="button" data-c="ch-del" data-ch="' + c.id + '">消す</button>')) + '</li>';
        }).join('') + '</ul><div class="ch-out"><button type="button" data-c="ch-add">＋ 販路を足す</button></div></section>';
    }
    function chHistoryView() {
      const d = state.ch.data;
      const name = function (id) { const c = d.channels.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; };
      const rows = d.history.slice().reverse().slice(0, 200);
      return '<section class="ch-box"><h3>値段を変えた記録</h3><p class="muted">新しい順に200件まで。誰がいつ、どの販路の値段をいくらからいくらにしたかが残ります。</p>' +
        (rows.length ? '<div class="ch-scroll"><table class="ch-table"><tr><th>いつ</th><th>誰</th><th>販路</th><th>種類コード</th><th>前</th><th>後</th></tr>' + rows.map(function (h) {
          return '<tr><td>' + escapeHtml(h.at.slice(0, 16).replace('T', ' ')) + '</td><td>' + escapeHtml(h.who || '—') + '</td><td>' + escapeHtml(name(h.ch)) + '</td><td>' + escapeHtml(h.code) + '</td><td class="yen">' + formatYen(h.from) + '</td><td class="yen">' + formatYen(h.to) + '</td></tr>';
        }).join('') + '</table></div>' : '<p class="muted">まだありません。</p>') + '</section>';
    }

    function renderChannelTab(host) {
      function paint() {
        const c = state.ch;
        if (!c.data) chLoad();
        if (!c.ready) { host.innerHTML = '<section class="ch-box"><p class="muted">' + escapeHtml(c.error || '商品を読み込んでいます…') + '</p></section>'; return; }
        const tabs = [['price', '値段'], ['rules', 'モールの決まり（' + c.data.rules.length + '）'], ['channels', '販路'], ['history', '変更の記録']];
        host.innerHTML = '<div class="ch-head"><div><p class="kicker">Channels and prices</p><h2>販路と価格</h2><p class="lead">商品は1つ、値段と出す・出さないは販路ごと。基準の値段は本店（バックアップから取った値段）です。いまはこのブラウザに保存しています。</p></div>' +
          '<nav class="ch-nav">' + tabs.map(function (t) { return '<button type="button" data-c="view" data-v="' + t[0] + '" aria-pressed="' + (c.view === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</nav></div>' +
          (c.view === 'rules' ? chRulesView() : c.view === 'channels' ? chChannelsView() : c.view === 'history' ? chHistoryView() : chPriceView());
      }
      function chFind(id) { return state.ch.data.channels.filter(function (x) { return x.id === id; })[0]; }
      function act(el, ev) {
        const c = state.ch, d = c.data, k = el.dataset.c;
        if (k === 'view') { c.view = el.dataset.v; paint(); return; }
        if (k === 'q') { c.q = el.value; c.page = 0; paint(); const i = host.querySelector('[data-c="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; }
        if (k === 'show') { c.show = el.value; c.page = 0; paint(); return; }
        if (k === 'pick') { d.pick = el.value; chSave(); return; }
        if (k === 'page') { c.page += Number(el.dataset.dir); paint(); return; }
        if (k === 'open') { c.open = c.open === el.dataset.id ? '' : el.dataset.id; paint(); return; }
        if (k === 'pick-one') { const it = d.items[el.dataset.id] || (d.items[el.dataset.id] = {}); it.on = el.checked; chSave(); return; }
        if (k === 'pick-page') {
          const per = 20, list = chVisible().slice(c.page * per, c.page * per + per);
          list.forEach(function (p) { const it = d.items[p.id] || (d.items[p.id] = {}); it.on = el.dataset.on === '1'; });
          chSave(); return;
        }
        if (k === 'def-mode' || k === 'def-pct' || k === 'def-round') {
          const before = {};
          c.products.filter(function (p) { return chPicked(d, p); }).forEach(function (p) { before[p.id] = chSkus(p).map(function (s) { return chPrice(d, p, s, el.dataset.ch); }); });
          const r = d.defaults[el.dataset.ch] || (d.defaults[el.dataset.ch] = {});
          if (k === 'def-mode') r.mode = el.value;
          if (k === 'def-pct') r.pct = Math.max(0, Math.min(200, Number(el.value) || 0));
          if (k === 'def-round') r.round = Number(el.value);
          let n = 0;
          c.products.filter(function (p) { return chPicked(d, p); }).forEach(function (p) {
            chSkus(p).forEach(function (s, i) { const to = chPrice(d, p, s, el.dataset.ch); if (before[p.id][i] !== to) { n += 1; d.history.push({ at: new Date().toISOString(), who: chWho(), pid: p.id, code: s.code, ch: el.dataset.ch, from: before[p.id][i], to: to }); } });
          });
          if (d.history.length > 500) d.history = d.history.slice(-500);
          chSave();
          if (n) showToast(chFind(el.dataset.ch).name + 'の標準を変えました。値段が変わった種類 ' + n + '件。');
          return;
        }
        const p = el.dataset.id ? chProductById(el.dataset.id) : null;
        if (k === 'list' && p) { chSetRule(d, p, el.dataset.ch, { list: el.checked }, chWho()); chSave(); return; }
        if (k === 'mode' && p) {
          const patch = { mode: el.value };
          if (el.value === 'up') { patch.pct = chDefaultRule(d, el.dataset.ch).pct || 10; patch.round = chDefaultRule(d, el.dataset.ch).round; }
          if (el.value === 'fixed') { patch.yen = {}; chSkus(p).forEach(function (s) { patch.yen[s.code] = chPrice(d, p, s, el.dataset.ch); }); }
          chSetRule(d, p, el.dataset.ch, patch, chWho()); chSave(); return;
        }
        if (k === 'pct' && p) { chSetRule(d, p, el.dataset.ch, { pct: Math.max(0, Math.min(200, Number(el.value) || 0)) }, chWho()); chSave(); return; }
        if (k === 'yen' && p) {
          const cur = chRuleOf(d, p.id, el.dataset.ch);
          const yen = Object.assign({}, cur.yen); const v = Math.round(Number(el.value));
          if (!(v > 0)) { showToast('値段は1円以上の数字にしてください。'); paint(); return; }
          yen[el.dataset.sku] = v;
          chSetRule(d, p, el.dataset.ch, { yen: yen }, chWho()); chSave(); return;
        }
        if (k === 'csv') {
          const ch = chFind(el.dataset.ch);
          const rows = chExportRows(d, c.products, ch.id);
          const text = '﻿' + rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n') + '\r\n';
          const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
          const a = document.createElement('a'); a.href = url; a.download = 'prices-' + ch.id + '.csv'; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
          showToast(ch.name + 'の値段一覧（' + (rows.length - 1) + '行）を書き出しました。'); return;
        }
        if (k === 'backup') { downloadJson('oms-channels.json', Object.assign({ kind: 'luna-oms-channels', exportedAt: new Date().toISOString() }, d)); showToast('販路と価格の設定を書き出しました。'); return; }
        if (k === 'restore') {
          const f = el.files && el.files[0]; if (!f) return;
          f.text().then(function (t) { const v = JSON.parse(t); if (v.kind !== 'luna-oms-channels') throw new Error('kind'); c.data = chNorm(v); chSave(); showToast('読み込みました。'); })
            .catch(function () { showToast('「保存用に書き出す」で作ったファイルを選んでください。'); });
          return;
        }
        if (k === 'rule-add') { c.ruleDraft = { ch: chSellChannels()[0].id, kind: 'ng-words', title: '', value: '', text: '', source: '', checkedAt: '' }; paint(); return; }
        if (k === 'rule-edit') { c.ruleDraft = Object.assign({}, d.rules.filter(function (r) { return r.id === el.dataset.id; })[0]); paint(); return; }
        if (k === 'rule-cancel') { c.ruleDraft = null; paint(); return; }
        if (k === 'rd') { c.ruleDraft[el.dataset.k] = el.value; if (el.dataset.k === 'kind') paint(); return; }
        if (k === 'rule-save') {
          const r = c.ruleDraft; r.tried = true;
          if (chRuleErrors(r).length) { paint(); return; }
          delete r.tried;
          if (!r.id) { r.id = 'rule-' + Date.now().toString(36); r.on = true; r.addedBy = chWho(); d.rules.push(r); }
          else d.rules = d.rules.map(function (x) { return x.id === r.id ? r : x; });
          c.ruleDraft = null; chSave(); showToast('決まりを保存しました。'); return;
        }
        if (k === 'rule-toggle') { d.rules.forEach(function (r) { if (r.id === el.dataset.id) r.on = r.on === false; }); chSave(); return; }
        if (k === 'rule-del') { if (window.confirm('この決まりを消しますか？')) { d.rules = d.rules.filter(function (r) { return r.id !== el.dataset.id; }); chSave(); } return; }
        if (k === 'ch-on') { chFind(el.dataset.ch).on = el.checked; chSave(); return; }
        if (k === 'ch-name') { const v = el.value.trim(); if (v) { chFind(el.dataset.ch).name = v; chSave(); } else paint(); return; }
        if (k === 'ch-note') { chFind(el.dataset.ch).note = el.value; chSave(); return; }
        if (k === 'ch-add') { d.channels.push({ id: 'ch-' + Date.now().toString(36), name: '新しい販路', on: true, base: false, note: '' }); chSave(); return; }
        if (k === 'ch-del') { if (window.confirm('この販路を消しますか？（この販路の決まりと値段の設定も消えます）')) { d.channels = d.channels.filter(function (x) { return x.id !== el.dataset.ch; }); d.rules = d.rules.filter(function (r) { return r.ch !== el.dataset.ch; }); chSave(); } return; }
      }
      host.addEventListener('click', function (e) { const el = e.target.closest('button[data-c]'); if (el) act(el, e); });
      host.addEventListener('change', function (e) { const el = e.target.closest('[data-c]'); if (el && el.tagName !== 'BUTTON' && el.dataset.c !== 'q') act(el, e); });
      host.addEventListener('input', function (e) { const el = e.target.closest('[data-c="q"]'); if (el) act(el, e); });
      paint();
      on('oms:ch', paint);
      on('oms:tab', function (t) { if (t === 'channels') paint(); });
    }
    // 25-channel-export（楽天・Yahoo用CSV）に、販路ごとの値段を渡す（扱う商品で個別に決めたものがあるときだけ効く）
    function chPriceForExport(chId, product, sku) {
      const c = state.ch;
      if (!c || !c.data) return sku.price;
      const ch = c.data.channels.filter(function (x) { return x.id === chId; })[0];
      if (!ch || !ch.on) return sku.price;
      return chPrice(c.data, { id: String(product.id), code: product.code, price: product.price }, sku, chId);
    }
