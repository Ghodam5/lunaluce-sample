// Luna Luce OMS 部品JS: 27-builder-days（営業日・発送のお休み）
// OMS が正（2026-11-21 林さん了承）。書き出すと businessDays に「今日から1年分のお休みの日」が入り、
// Welcart 側の受け取りプラグイン（wordpress/luna-oms-receiver）が営業日カレンダーをその通りにする。
// 決め方: 毎週のお休み（曜日）＋お休みにする日（年末年始など）−営業する日（祝日だけ開けるなど）
    const DAYS_WEEK = ['日', '月', '火', '水', '木', '金', '土'];
    function builderDaysToday() {
      return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    }
    function builderDaysAdd(iso, n) {
      const d = new Date(iso + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    }
    function builderDaysIsOff(d, iso) {
      if (d.on.indexOf(iso) >= 0) return false;
      if (d.off.indexOf(iso) >= 0) return true;
      return d.weekly.indexOf(new Date(iso + 'T00:00:00Z').getUTCDay()) >= 0;
    }
    // 書き出す形: { from, to, holidays: [...] }（from〜to の間でお休みの日だけ並べる）
    function builderDaysExport() {
      const d = state.builder.days;
      if (!d) return undefined;
      const from = builderDaysToday();
      const to = builderDaysAdd(from, 365);
      const holidays = [];
      for (let iso = from; iso <= to; iso = builderDaysAdd(iso, 1)) if (builderDaysIsOff(d, iso)) holidays.push(iso);
      return { from: from, to: to, holidays: holidays };
    }
    function builderDaysErrors() {
      const d = state.builder.days;
      if (!d) return [];
      return d.weekly.length >= 7 ? ['営業日: 毎週すべての曜日がお休みになっています'] : [];
    }
    function builderDaysList(list, kind) {
      const today = builderDaysToday();
      const shown = list.filter(function (x) { return x >= today; }).sort();
      if (!shown.length) return '<p class="muted">まだありません</p>';
      return '<ul class="days-list">' + shown.map(function (iso) {
        const w = DAYS_WEEK[new Date(iso + 'T00:00:00Z').getUTCDay()];
        return '<li><span>' + escapeHtml(iso.replace(/-/g, '/')) + '（' + w + '）</span><button type="button" data-b="days-remove" data-kind="' + kind + '" data-date="' + escapeHtml(iso) + '" aria-label="' + escapeHtml(iso) + ' を外す">外す</button></li>';
      }).join('') + '</ul>';
    }
    function builderDaysForm() {
      const b = state.builder;
      const head = '<h2>営業日（発送のお休み）</h2><p class="lead">OMSで決めた営業日を、書き出すと本店（Welcart）の営業日カレンダーにそのまま入れます（今日から1年分）。楽天・Yahooの発送日の目安にも使います。</p>';
      if (!b.days) {
        return head + '<p>いまはまだOMSで管理していません（Welcartの設定のまま）。</p><button type="button" class="add" data-b="days-start">営業日をOMSで管理する</button>' +
          '<p class="muted">始めると、毎週土曜・日曜をお休みにした形から始まります。違うときは下で直してください。</p>';
      }
      const d = b.days;
      return head +
        '<h3>毎週のお休み</h3><div class="days-week">' + DAYS_WEEK.map(function (w, i) {
          return '<label class="switch"><input type="checkbox" data-days-week="' + i + '"' + (d.weekly.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + w + '</span></label>';
        }).join('') + '</div>' +
        '<h3>お休みにする日（年末年始・夏休みなど）</h3><div class="row"><label class="fld"><span>日付</span><input type="date" data-days-input="off" min="' + builderDaysToday() + '"></label><label class="fld"><span>何日間</span><input type="number" data-days-len="off" value="1" min="1" max="31"></label><span class="tools"><button type="button" data-b="days-add" data-kind="off">お休みに足す</button></span></div>' + builderDaysList(d.off, 'off') +
        '<h3>この日は営業する（毎週のお休みの例外）</h3><div class="row"><label class="fld"><span>日付</span><input type="date" data-days-input="on" min="' + builderDaysToday() + '"></label><span class="tools"><button type="button" data-b="days-add" data-kind="on">営業日に足す</button></span></div>' + builderDaysList(d.on, 'on') +
        '<p><button type="button" data-b="days-stop">OMSでの管理をやめる（Welcartの設定のままにする）</button></p>';
    }
    // 右の列: 3か月分のカレンダー
    function builderDaysPreview() {
      const d = state.builder.days;
      if (!d) return '<p class="pv-note">営業日はまだOMSで管理していません。</p>';
      const today = builderDaysToday();
      let y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
      let html = '<p class="pv-note">発送のお休み（色つき）。書き出すとWelcartがこの通りになります。</p>';
      for (let k = 0; k < 3; k += 1) {
        const first = new Date(Date.UTC(y, m - 1, 1));
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        let cells = '';
        for (let i = 0; i < first.getUTCDay(); i += 1) cells += '<span></span>';
        for (let day = 1; day <= last; day += 1) {
          const iso = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          cells += '<span class="' + (builderDaysIsOff(d, iso) ? 'off' : '') + (iso === today ? ' today' : '') + (iso < today ? ' past' : '') + '">' + day + '</span>';
        }
        html += '<div class="pv-cal"><b>' + y + '年' + m + '月</b><div class="pv-cal-grid">' + DAYS_WEEK.map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div></div>';
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      return html;
    }
    // ボタン（23-builder-tab の builderAction から最初に呼ぶ）。扱ったら true
    function builderDaysAction(name, el) {
      const b = state.builder;
      if (name === 'days-start') { b.days = { weekly: [0, 6], off: [], on: [] }; builderChanged(true); return true; }
      if (name === 'days-stop') { b.days = null; builderChanged(true); return true; }
      if (name === 'days-add' && b.days) {
        const kind = el.dataset.kind;
        const host = el.closest('[data-part="builder-editor"]');
        const input = host && host.querySelector('[data-days-input="' + kind + '"]');
        const len = kind === 'off' ? Math.max(1, Math.min(31, Number((host.querySelector('[data-days-len="off"]') || {}).value) || 1)) : 1;
        if (!input || !input.value) { showToast('日付を選んでください'); return true; }
        for (let i = 0; i < len; i += 1) {
          const iso = builderDaysAdd(input.value, i);
          const other = kind === 'off' ? b.days.on : b.days.off;
          if (other.indexOf(iso) >= 0) other.splice(other.indexOf(iso), 1);
          if (b.days[kind].indexOf(iso) < 0) b.days[kind].push(iso);
        }
        b.days[kind].sort();
        builderChanged(true);
        return true;
      }
      if (name === 'days-remove' && b.days) {
        const list = b.days[el.dataset.kind];
        const i = list.indexOf(el.dataset.date);
        if (i >= 0) list.splice(i, 1);
        builderChanged(true);
        return true;
      }
      return false;
    }
    function builderDaysChange(el) {
      const d = state.builder.days;
      if (!d || el.dataset.daysWeek === undefined) return false;
      const w = Number(el.dataset.daysWeek);
      const i = d.weekly.indexOf(w);
      if (el.checked && i < 0) d.weekly.push(w);
      if (!el.checked && i >= 0) d.weekly.splice(i, 1);
      d.weekly.sort();
      builderChanged(true);
      return true;
    }
