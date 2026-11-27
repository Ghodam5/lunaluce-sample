// Luna Luce OMS 部品JS: 55-name-rules（「10 名入れの決まり」タブ: 文字数超過の決まり・書体の一覧・色の一覧）
// - 文字数超過の料金の決まり: 商品や加工（シール・のし・カード・レーザー彫刻など）ごとに複数持てる（2.57、林さん「商品によって違う」）。
//   決まりごとに「どの商品に当てるか（SKU・商品名の言葉。空なら全商品）」「どの文字を数えるか」「上限の文字数」「基本料金」「超えた1文字ごとの料金」。
//   注文に当てはまる決まりを全部計算して足す。受注明細で決まりごとに超えた文字数を自動で数え、手で直せる
// - 加工の種類（シール・のし・カード・レーザー彫刻など）は足す・消す・名前を変える・並べ替えができる（2.57、林さん「増やしたり減らしたりできるように」）
// - 書体・色: 一覧を足す・消す・並べ替える。シール・のし・カードのどれに使うかを選ぶ。受注明細の「書体」「色」の選択肢になる
// 保存はまだこのブラウザ（localStorage）。共有する前にサーバーへ移す（作業ログと同じ oms-work に足す予定）。
    const NAME_RULES_KEY = 'luna-oms-name-rules-v1';
    function nameRulesDefault() {
      const fonts = [], colors = [];
      FONT_OPTIONS.forEach(function (f) {
        const m = /^(.*)（(.+)）$/.exec(f);
        const font = m ? m[1] : f, color = m ? m[2] : '';
        if (fonts.indexOf(font) < 0) fonts.push(font);
        if (color && colors.indexOf(color) < 0) colors.push(color);
      });
      const row = function (name, i) { return { id: 'r' + i + '-' + Date.now().toString(36), name: name, uses: { seal: true, noshi: true, card: true } }; };
      return { kinds: NAME_KINDS.map(function (k) { return { id: k.id, name: k.label }; }), feeRules: [nameRuleNew('名入れ（全商品・仮）')], fonts: fonts.map(row), colors: colors.map(row), note: '最初の値はダミー注文の見本から作った仮のもの。お店の決まりに直してください' };
    }
    function nameRulesLoad() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(NAME_RULES_KEY) || 'null'); } catch (e) { saved = null; }
      const d = nameRulesDefault();
      if (!saved || typeof saved !== 'object') return d;
      // 2.56 の1つだけの決まり（extra）は、全商品に当てる決まり1つとして読む
      const old = saved.extra ? [Object.assign(nameRuleNew('名入れ（全商品）'), { limit: saved.extra.limit, base: saved.extra.base, per: saved.extra.per, skipSpaces: saved.extra.skipSpaces !== false })] : null;
      return {
        kinds: Array.isArray(saved.kinds) && saved.kinds.length ? saved.kinds : d.kinds,
        feeRules: Array.isArray(saved.feeRules) ? saved.feeRules : old || d.feeRules,
        fonts: Array.isArray(saved.fonts) ? saved.fonts : d.fonts,
        colors: Array.isArray(saved.colors) ? saved.colors : d.colors,
        note: ''
      };
    }
    // 数える文字（注文のどの欄か）
    const NAME_FIELDS = [
      { id: 'couple', label: '新郎新婦のお名前', get: function (o, d) { return d && d.couple != null ? d.couple : o.coupleNames; } },
      { id: 'message', label: '上の一文（見出し）', get: function (o, d) { return d && d.message != null ? d.message : o.headerMsg; } },
      { id: 'noshiName', label: 'のしの下のお名前', get: function (o) { return o.noshiName; } },
      { id: 'noshiUpper', label: 'のしの上（表書き）', get: function (o) { return o.noshiUpper; } }
    ];
    const NAME_KINDS = [{ id: 'seal', label: 'シール' }, { id: 'noshi', label: 'のし' }, { id: 'card', label: 'カード' }, { id: 'laser', label: 'レーザー彫刻' }, { id: 'print', label: '印刷（その他）' }];
    function nameRuleNew(name) {
      return { id: 'f' + Math.random().toString(36).slice(2, 8), name: name || '新しい決まり', kind: 'seal', match: '', field: 'couple', limit: 12, base: 500, per: 20, skipSpaces: true, on: true };
    }
    // この注文に当てはまるか（match が空なら全商品。読点・カンマで区切った言葉のどれかが SKU か商品名に入っていれば当てはまる）
    function nameRuleHits(rule, order) {
      if (rule.on === false) return false;
      const words = String(rule.match || '').split(/[、,，\n]/).map(function (w) { return w.trim(); }).filter(Boolean);
      if (!words.length) return true;
      const hay = (order.sku || '') + ' ' + (order.productName || '');
      return words.some(function (w) { return fuzzyMatch(hay, w); });
    }
    function nameRulesSave() {
      try { localStorage.setItem(NAME_RULES_KEY, JSON.stringify(state.nameRules)); } catch (e) { showToast('このブラウザに保存できませんでした'); }
      emit('oms:change');
    }
    state.nameRules = nameRulesLoad();

    // 文字数（空白を数えない決まりなら空白を抜く）
    function nameCharCount(text, skipSpaces) {
      const t = String(text || '');
      return Array.from(skipSpaces !== false ? t.replace(/[\s　]/g, '') : t).length;
    }
    // 注文の文字数超過（当てはまる決まりごと）。draft は受注明細で編集中の中身（省略可）。手で入れた数（order.extraCharManual[決まりのid]）があればそれを使う
    function nameExtraLines(order, draft) {
      const manual = draft && draft.extraManual ? draft.extraManual : (order.extraCharManual && typeof order.extraCharManual === 'object' ? order.extraCharManual : {});
      return state.nameRules.feeRules.filter(function (r) { return nameRuleHits(r, order); }).map(function (r) {
        const f = NAME_FIELDS.filter(function (x) { return x.id === r.field; })[0] || NAME_FIELDS[0];
        const chars = nameCharCount(f.get(order, draft), r.skipSpaces);
        const auto = Math.max(0, chars - (Number(r.limit) || 0));
        const m = manual[r.id];
        const count = m != null && m !== '' ? Math.max(0, Number(m) || 0) : auto;
        const base = Number(r.base) || 0, per = Number(r.per) || 0;
        return { id: r.id, name: r.name, field: f.label, chars: chars, limit: Number(r.limit) || 0, auto: auto, manual: m != null && m !== '', count: count, base: base, per: per, total: count > 0 ? base + per * count : 0 };
      });
    }
    // 料金の文字（受注明細・一覧で使う）
    function feeExtraText(fees, short) {
      const on = (fees.extraLines || []).filter(function (l) { return l.total > 0; });
      if (!on.length) return (short ? '超過 ' : '文字数超過 ') + formatYen(0);
      return on.map(function (l) { return (short ? '' : l.name + ' ') + formatYen(l.base) + '＋' + formatYen(l.per) + '×' + l.count + '＝' + formatYen(l.total); }).join(short ? ' / ' : '　') + (on.length > 1 ? '（計 ' + formatYen(fees.extraTotal) + '）' : '');
    }
    // 注文の書体と色を分ける（前の形「書体（色）」を読めるように）
    function nameSplitFont(order) {
      if (order.textColor !== undefined) return;
      const m = /^(.*)（(.+)）$/.exec(String(order.fontStyle || ''));
      if (m) { order.fontStyle = m[1]; order.textColor = m[2]; } else order.textColor = '';
    }
    function nameOptions(list, cur, use) {
      const names = list.filter(function (r) { return !use || !r.uses || r.uses[use] !== false; }).map(function (r) { return r.name; });
      if (cur && names.indexOf(cur) < 0) names.unshift(cur);
      return '<option value="">（なし・未定）</option>' + names.map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + escapeHtml(n) + '</option>'; }).join('');
    }

    function renderNameRulesTab(host) {
      function listHtml(kind, title, lead) {
        const list = state.nameRules[kind];
        return '<section class="nr-sec"><h3>' + title + '</h3><p class="sub">' + lead + '</p><table class="nr-table"><thead><tr><th>名前</th>' + state.nameRules.kinds.map(function (u) { return '<th>' + escapeHtml(u.name) + '</th>'; }).join('') + '<th>並び</th><th></th></tr></thead><tbody>' +
          list.map(function (r, i) {
            return '<tr><td><input type="text" maxlength="40" value="' + escapeHtml(r.name) + '" data-nr="name" data-kind="' + kind + '" data-i="' + i + '"></td>' +
              state.nameRules.kinds.map(function (u) { return '<td class="nr-c"><input type="checkbox" data-nr="use" data-use="' + u.id + '" data-kind="' + kind + '" data-i="' + i + '"' + (!r.uses || r.uses[u.id] !== false ? ' checked' : '') + ' aria-label="' + escapeHtml(u.name) + 'に使う"></td>'; }).join('') +
              '<td class="nr-c"><button type="button" data-nr="up" data-kind="' + kind + '" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-nr="down" data-kind="' + kind + '" data-i="' + i + '"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button></td>' +
              '<td class="nr-c"><button type="button" class="nr-del" data-nr="del" data-kind="' + kind + '" data-i="' + i + '">消す</button></td></tr>';
          }).join('') + '</tbody></table><button type="button" class="nr-add" data-nr="add" data-kind="' + kind + '">＋ ' + title + 'を足す</button></section>';
      }
      function kindsHtml() {
        const ks = state.nameRules.kinds;
        return '<section class="nr-sec"><h3>加工の種類</h3><p class="sub">シール・のし・カード・レーザー彫刻など、名入れする物や作業の種類。足す・消す・名前を変える・並べ替えができます。料金の決まりと、書体・色の「どこに使うか」の欄になります。</p><table class="nr-table"><thead><tr><th>名前</th><th>使っている料金の決まり</th><th>並び</th><th></th></tr></thead><tbody>' +
          ks.map(function (k, i) {
            const used = state.nameRules.feeRules.filter(function (r) { return r.kind === k.id; }).length;
            return '<tr><td><input type="text" maxlength="30" value="' + escapeHtml(k.name) + '" data-nr="kname" data-i="' + i + '" aria-label="加工の種類の名前"></td><td class="nr-c">' + used + '件</td>' +
              '<td class="nr-c"><button type="button" data-nr="kup" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-nr="kdown" data-i="' + i + '"' + (i < ks.length - 1 ? '' : ' disabled') + '>↓</button></td>' +
              '<td class="nr-c"><button type="button" class="nr-del" data-nr="kdel" data-i="' + i + '"' + (used || ks.length < 2 ? ' disabled title="料金の決まりで使っている間は消せません"' : '') + '>消す</button></td></tr>';
          }).join('') + '</tbody></table><button type="button" class="nr-add" data-nr="kadd">＋ 加工の種類を足す</button></section>';
      }
      function paint() {
        const rules = state.nameRules.feeRules;
        const ruleRows = rules.map(function (r, i) {
          const sel = function (list, cur, key) { return '<select data-nr="rule" data-k="' + key + '" data-i="' + i + '">' + list.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + '>' + escapeHtml(x.label || x.name) + '</option>'; }).join('') + '</select>'; };
          const num = function (key, step) { return '<input type="number" min="0" step="' + step + '" data-nr="rule" data-k="' + key + '" data-i="' + i + '" value="' + escapeHtml(r[key]) + '">'; };
          const ex = 3, exT = (Number(r.base) || 0) + (Number(r.per) || 0) * ex;
          return '<div class="nr-rule' + (r.on === false ? ' is-off' : '') + '"><div class="nr-rule-head"><input type="text" maxlength="40" data-nr="rule" data-k="name" data-i="' + i + '" value="' + escapeHtml(r.name) + '" aria-label="決まりの名前">' +
            '<label class="nr-chk"><input type="checkbox" data-nr="rule" data-k="on" data-i="' + i + '"' + (r.on !== false ? ' checked' : '') + '> 使う</label>' +
            '<button type="button" data-nr="rup" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-nr="rdown" data-i="' + i + '"' + (i < rules.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="nr-del" data-nr="rdel" data-i="' + i + '">消す</button></div>' +
            '<div class="nr-form">' +
            '<label><span>加工の種類</span>' + sel(state.nameRules.kinds, r.kind, 'kind') + '</label>' +
            '<label class="nr-wide"><span>当てる商品（SKU・商品名の言葉。読点で区切る。空なら全商品）</span><input type="text" data-nr="rule" data-k="match" data-i="' + i + '" value="' + escapeHtml(r.match) + '" placeholder="例: LL-PG, プチギフト"></label>' +
            '<label><span>数える文字</span>' + sel(NAME_FIELDS, r.field, 'field') + '</label>' +
            '<label><span>上限の文字数</span>' + num('limit', 1) + '</label>' +
            '<label><span>基本料金（円）</span>' + num('base', 10) + '</label>' +
            '<label><span>超えた1文字ごと（円）</span>' + num('per', 10) + '</label>' +
            '<label class="nr-chk"><input type="checkbox" data-nr="rule" data-k="skipSpaces" data-i="' + i + '"' + (r.skipSpaces !== false ? ' checked' : '') + '> 空白は数えない</label></div>' +
            '<p class="nr-eg">例: 上限' + escapeHtml(r.limit) + '文字を3文字超える → ' + formatYen(Number(r.base) || 0) + '＋' + formatYen(Number(r.per) || 0) + '×3＝' + formatYen(exT) + '　／　当てはまる注文: ' + state.orders.filter(function (o) { return nameRuleHits(r, o); }).length + '件</p></div>';
        }).join('');
        host.innerHTML = '<section class="nr-tab"><h2>名入れの決まり</h2><p class="sub">ここで決めたことが、受注明細の「文字数超過」の計算と、「書体」「色」の選択肢になります。直すとすぐ反映されます（いまはこのブラウザに保存）。</p>' +
          (state.nameRules.note ? '<p class="nr-note">' + escapeHtml(state.nameRules.note) + '</p>' : '') +
          kindsHtml() +
          '<section class="nr-sec"><h3>文字数超過の料金</h3><p class="sub">商品や加工（シール・のし・レーザー彫刻など）ごとに決まりを作ります。注文に当てはまる決まりを全部計算して足します（決まりごとに1注文1回）。</p>' + ruleRows +
          '<button type="button" class="nr-add" data-nr="radd">＋ 料金の決まりを足す</button></section>' +
          listHtml('fonts', '書体', 'シール・のし・カードに入れる文字の書体。使う所にチェックを入れると、受注明細の選択肢に出ます。') +
          listHtml('colors', '色', '文字や箔の色（例: ゴールド＝金色の文字、トープ＝灰色がかった茶色、金箔＝金の箔押し）。シールなどで使える色が違うときは、使う所のチェックで分けます。') +
          '</section>';
      }
      host.addEventListener('change', function (e) {
        const el = e.target, nr = el.dataset.nr;
        if (!nr) return;
        const r = state.nameRules;
        if (nr === 'rule') {
          const rule = r.feeRules[el.dataset.i], k = el.dataset.k;
          if (k === 'name') { const v = el.value.trim(); if (!v) { el.value = rule.name; showToast('名前を入れてください'); return; } rule.name = v; }
          else if (k === 'on' || k === 'skipSpaces') rule[k] = el.checked;
          else if (k === 'kind' || k === 'field' || k === 'match') rule[k] = el.value.trim();
          else rule[k] = Math.max(0, Number(el.value) || 0);
        }
        else if (nr === 'kname') { const v = el.value.trim(); if (!v) { el.value = r.kinds[el.dataset.i].name; showToast('名前を入れてください'); return; } r.kinds[el.dataset.i].name = v; }
        else if (nr === 'name') { const v = el.value.trim(); if (!v) { el.value = r[el.dataset.kind][el.dataset.i].name; showToast('名前を入れてください'); return; } r[el.dataset.kind][el.dataset.i].name = v; }
        else if (nr === 'use') r[el.dataset.kind][el.dataset.i].uses[el.dataset.use] = el.checked;
        else return;
        r.note = '';
        nameRulesSave(); paint();
      });
      host.addEventListener('click', function (e) {
        const el = e.target.closest('button[data-nr]');
        if (!el) return;
        if (/^k(add|del|up|down)$/.test(el.dataset.nr)) {
          const ks = state.nameRules.kinds, j = Number(el.dataset.i), a = el.dataset.nr;
          if (a === 'kadd') ks.push({ id: 'k' + Math.random().toString(36).slice(2, 8), name: '新しい加工' });
          else if (a === 'kdel') { if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.textContent = 'もう一度で消す'; setTimeout(function () { if (el.isConnected) { el.dataset.armed = ''; el.textContent = '消す'; } }, 3000); return; } ks.splice(j, 1); }
          else if (a === 'kup' && j > 0) ks.splice(j - 1, 0, ks.splice(j, 1)[0]);
          else if (a === 'kdown' && j < ks.length - 1) ks.splice(j + 1, 0, ks.splice(j, 1)[0]);
          state.nameRules.note = '';
          nameRulesSave(); paint();
          if (a === 'kadd') { const ins = host.querySelectorAll('input[data-nr="kname"]'); if (ins.length) { ins[ins.length - 1].focus(); ins[ins.length - 1].select(); } }
          return;
        }
        if (/^r(add|del|up|down)$/.test(el.dataset.nr)) {
          const rs = state.nameRules.feeRules, j = Number(el.dataset.i), a = el.dataset.nr;
          if (a === 'radd') rs.push(Object.assign(nameRuleNew(), { kind: (state.nameRules.kinds[0] || {}).id || '' }));
          else if (a === 'rdel') { if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.textContent = 'もう一度で消す'; setTimeout(function () { if (el.isConnected) { el.dataset.armed = ''; el.textContent = '消す'; } }, 3000); return; } rs.splice(j, 1); }
          else if (a === 'rup' && j > 0) rs.splice(j - 1, 0, rs.splice(j, 1)[0]);
          else if (a === 'rdown' && j < rs.length - 1) rs.splice(j + 1, 0, rs.splice(j, 1)[0]);
          state.nameRules.note = '';
          nameRulesSave(); paint();
          if (a === 'radd') { const ins = host.querySelectorAll('input[data-k="name"]'); if (ins.length) { ins[ins.length - 1].focus(); ins[ins.length - 1].select(); } }
          return;
        }
        const list = state.nameRules[el.dataset.kind], i = Number(el.dataset.i), nr = el.dataset.nr;
        if (nr === 'add') list.push({ id: 'r' + Date.now().toString(36), name: el.dataset.kind === 'fonts' ? '新しい書体' : '新しい色', uses: {} });
        else if (nr === 'del') { if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.textContent = 'もう一度で消す'; setTimeout(function () { if (el.isConnected) { el.dataset.armed = ''; el.textContent = '消す'; } }, 3000); return; } list.splice(i, 1); }
        else if (nr === 'up' && i > 0) list.splice(i - 1, 0, list.splice(i, 1)[0]);
        else if (nr === 'down' && i < list.length - 1) list.splice(i + 1, 0, list.splice(i, 1)[0]);
        else return;
        state.nameRules.note = '';
        nameRulesSave(); paint();
        if (nr === 'add') { const ins = host.querySelectorAll('input[data-nr="name"][data-kind="' + el.dataset.kind + '"]'); if (ins.length) { ins[ins.length - 1].focus(); ins[ins.length - 1].select(); } }
      });
      paint();
    }
