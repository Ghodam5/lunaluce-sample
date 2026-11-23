// Luna Luce OMS 部品JS: 55-name-rules（「10 名入れの決まり」タブ: 文字数超過の決まり・書体の一覧・色の一覧）
// - 文字数超過: 名入れ（新郎新婦名）の文字数が上限を超えたら「基本料金＋超えた1文字ごとの料金」（1注文1回）。受注明細で自動で数え、手で直せる
// - 書体・色: 一覧を足す・消す・並べ替える。シール・のし・カードのどれに使うかを選ぶ。受注明細の「書体」「色」の選択肢になる
// 保存はまだこのブラウザ（localStorage）。共有する前にサーバーへ移す（作業ログと同じ oms-work に足す予定）。
    const NAME_RULES_KEY = 'luna-oms-name-rules-v1';
    const NAME_USES = [{ id: 'seal', label: 'シール' }, { id: 'noshi', label: 'のし' }, { id: 'card', label: 'カード' }];
    function nameRulesDefault() {
      const fonts = [], colors = [];
      FONT_OPTIONS.forEach(function (f) {
        const m = /^(.*)（(.+)）$/.exec(f);
        const font = m ? m[1] : f, color = m ? m[2] : '';
        if (fonts.indexOf(font) < 0) fonts.push(font);
        if (color && colors.indexOf(color) < 0) colors.push(color);
      });
      const row = function (name, i) { return { id: 'r' + i + '-' + Date.now().toString(36), name: name, uses: { seal: true, noshi: true, card: true } }; };
      return { extra: { limit: 12, base: 500, per: 20, skipSpaces: true }, fonts: fonts.map(row), colors: colors.map(row), note: '最初の値はダミー注文の見本から作った仮のもの。お店の決まりに直してください' };
    }
    function nameRulesLoad() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(NAME_RULES_KEY) || 'null'); } catch (e) { saved = null; }
      const d = nameRulesDefault();
      if (!saved || typeof saved !== 'object') return d;
      return {
        extra: Object.assign({}, d.extra, saved.extra || {}),
        fonts: Array.isArray(saved.fonts) ? saved.fonts : d.fonts,
        colors: Array.isArray(saved.colors) ? saved.colors : d.colors,
        note: ''
      };
    }
    function nameRulesSave() {
      try { localStorage.setItem(NAME_RULES_KEY, JSON.stringify(state.nameRules)); } catch (e) { showToast('このブラウザに保存できませんでした'); }
      emit('oms:change');
    }
    state.nameRules = nameRulesLoad();

    // 名入れの文字数（空白を数えない設定なら空白を抜く）
    function nameCharCount(text) {
      const t = String(text || '');
      return Array.from(state.nameRules.extra.skipSpaces ? t.replace(/[\s　]/g, '') : t).length;
    }
    // 超えた文字数（受注明細で手で入れた数があればそれ）
    function nameExtraCount(order, coupleText) {
      if (order.extraCharManual != null && order.extraCharManual !== '') return Math.max(0, Number(order.extraCharManual) || 0);
      const limit = Number(state.nameRules.extra.limit) || 0;
      if (!limit) return 0;
      return Math.max(0, nameCharCount(coupleText != null ? coupleText : order.coupleNames) - limit);
    }
    // 注文の書体と色を分ける（前の形「書体（色）」を読めるように）
    function nameSplitFont(order) {
      if (order.textColor !== undefined) return;
      const m = /^(.*)（(.+)）$/.exec(String(order.fontStyle || ''));
      if (m) { order.fontStyle = m[1]; order.textColor = m[2]; } else order.textColor = '';
    }
    function nameOptions(list, cur, use) {
      const names = list.filter(function (r) { return !use || r.uses[use]; }).map(function (r) { return r.name; });
      if (cur && names.indexOf(cur) < 0) names.unshift(cur);
      return '<option value="">（なし・未定）</option>' + names.map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + escapeHtml(n) + '</option>'; }).join('');
    }

    function renderNameRulesTab(host) {
      function listHtml(kind, title, lead) {
        const list = state.nameRules[kind];
        return '<section class="nr-sec"><h3>' + title + '</h3><p class="sub">' + lead + '</p><table class="nr-table"><thead><tr><th>名前</th>' + NAME_USES.map(function (u) { return '<th>' + u.label + '</th>'; }).join('') + '<th>並び</th><th></th></tr></thead><tbody>' +
          list.map(function (r, i) {
            return '<tr><td><input type="text" maxlength="40" value="' + escapeHtml(r.name) + '" data-nr="name" data-kind="' + kind + '" data-i="' + i + '"></td>' +
              NAME_USES.map(function (u) { return '<td class="nr-c"><input type="checkbox" data-nr="use" data-use="' + u.id + '" data-kind="' + kind + '" data-i="' + i + '"' + (r.uses[u.id] ? ' checked' : '') + ' aria-label="' + u.label + 'に使う"></td>'; }).join('') +
              '<td class="nr-c"><button type="button" data-nr="up" data-kind="' + kind + '" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-nr="down" data-kind="' + kind + '" data-i="' + i + '"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button></td>' +
              '<td class="nr-c"><button type="button" class="nr-del" data-nr="del" data-kind="' + kind + '" data-i="' + i + '">消す</button></td></tr>';
          }).join('') + '</tbody></table><button type="button" class="nr-add" data-nr="add" data-kind="' + kind + '">＋ ' + title + 'を足す</button></section>';
      }
      function paint() {
        const x = state.nameRules.extra;
        const ex = Math.max(0, 15 - (Number(x.limit) || 0));
        host.innerHTML = '<section class="nr-tab"><h2>名入れの決まり</h2><p class="sub">ここで決めたことが、受注明細の「文字数超過」の計算と、「書体」「色」の選択肢になります。直すとすぐ反映されます（いまはこのブラウザに保存）。</p>' +
          (state.nameRules.note ? '<p class="nr-note">' + escapeHtml(state.nameRules.note) + '</p>' : '') +
          '<section class="nr-sec"><h3>文字数超過</h3><p class="sub">名入れ（新郎新婦のお名前）の文字数が上限を超えたら、追加料金をいただきます。1注文につき1回です。</p><div class="nr-form">' +
          '<label><span>上限の文字数</span><input type="number" min="0" max="200" data-nr="extra" data-k="limit" value="' + escapeHtml(x.limit) + '"></label>' +
          '<label><span>基本料金（円）</span><input type="number" min="0" step="10" data-nr="extra" data-k="base" value="' + escapeHtml(x.base) + '"></label>' +
          '<label><span>超えた1文字ごと（円）</span><input type="number" min="0" step="10" data-nr="extra" data-k="per" value="' + escapeHtml(x.per) + '"></label>' +
          '<label class="nr-chk"><input type="checkbox" data-nr="extra" data-k="skipSpaces"' + (x.skipSpaces ? ' checked' : '') + '> 空白は数えない</label></div>' +
          '<p class="nr-eg">例: 15文字の名入れ → 上限' + escapeHtml(x.limit) + '文字を ' + ex + '文字超える → ' + (ex ? formatYen(Number(x.base) || 0) + '＋' + formatYen(Number(x.per) || 0) + '×' + ex + '＝' + formatYen((Number(x.base) || 0) + (Number(x.per) || 0) * ex) : '追加料金なし') + '</p></section>' +
          listHtml('fonts', '書体', 'シール・のし・カードに入れる文字の書体。使う所にチェックを入れると、受注明細の選択肢に出ます。') +
          listHtml('colors', '色', '文字や箔の色（例: ゴールド＝金色の文字、トープ＝灰色がかった茶色、金箔＝金の箔押し）。シールなどで使える色が違うときは、使う所のチェックで分けます。') +
          '</section>';
      }
      host.addEventListener('change', function (e) {
        const el = e.target, nr = el.dataset.nr;
        if (!nr) return;
        const r = state.nameRules;
        if (nr === 'extra') { const k = el.dataset.k; r.extra[k] = el.type === 'checkbox' ? el.checked : Math.max(0, Number(el.value) || 0); }
        else if (nr === 'name') { const v = el.value.trim(); if (!v) { el.value = r[el.dataset.kind][el.dataset.i].name; showToast('名前を入れてください'); return; } r[el.dataset.kind][el.dataset.i].name = v; }
        else if (nr === 'use') r[el.dataset.kind][el.dataset.i].uses[el.dataset.use] = el.checked;
        else return;
        r.note = '';
        nameRulesSave(); paint();
      });
      host.addEventListener('click', function (e) {
        const el = e.target.closest('button[data-nr]');
        if (!el) return;
        const list = state.nameRules[el.dataset.kind], i = Number(el.dataset.i), nr = el.dataset.nr;
        if (nr === 'add') list.push({ id: 'r' + Date.now().toString(36), name: el.dataset.kind === 'fonts' ? '新しい書体' : '新しい色', uses: { seal: true, noshi: true, card: true } });
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
