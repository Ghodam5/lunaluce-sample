// Luna Luce OMS 部品JS: 27-builder-days（営業日・発送のお休み）
// OMS が正（2026-11-21 林さん了承）。書き出すと businessDays に「今日から1年分のお休みの日」が入り、
// Welcart 側の受け取りプラグイン（wordpress/luna-oms-receiver）が営業日カレンダーをその通りにする。
// 決め方: 毎週のお休み（曜日）＋お休みにする日（年末年始など）−営業する日（祝日だけ開けるなど）。お休み・営業する日は何件でも足せ、カレンダーで1日ずつ切り替えられる。
// 標準はOMSで管理（下書きに営業日の設定がないときは、毎週土日休みから始める）。
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
    // 続いている日をまとめる: ['2026-12-29','2026-12-30'] → [{ from, to, days }]
    function builderDaysRanges(list) {
      const sorted = list.slice().sort();
      const out = [];
      sorted.forEach(function (iso) {
        const last = out[out.length - 1];
        if (last && builderDaysAdd(last.to, 1) === iso) { last.to = iso; last.days += 1; } else out.push({ from: iso, to: iso, days: 1 });
      });
      return out;
    }
    function builderDaysLabel(iso) {
      return iso.slice(5).replace('-', '/') + '（' + DAYS_WEEK[new Date(iso + 'T00:00:00Z').getUTCDay()] + '）';
    }
    function builderDaysList(list, kind) {
      const today = builderDaysToday();
      const ranges = builderDaysRanges(list.filter(function (x) { return x >= today; }));
      if (!ranges.length) return '<p class="muted">まだありません</p>';
      return '<ul class="days-list">' + ranges.map(function (r) {
        const label = r.days === 1 ? builderDaysLabel(r.from) : builderDaysLabel(r.from) + '〜' + builderDaysLabel(r.to) + '・' + r.days + '日間';
        return '<li><span>' + escapeHtml(label) + '</span><button type="button" data-b="days-remove" data-kind="' + kind + '" data-from="' + r.from + '" data-to="' + r.to + '" aria-label="' + escapeHtml(label) + ' を外す">外す</button></li>';
      }).join('') + '</ul>';
    }
    // 真ん中の列のカレンダー: 日を押すと お休み⇔営業 が切り替わる（飛び石の休みも1日ずつ決められる）
    function builderDaysEditCal(d) {
      const b = state.builder;
      const today = builderDaysToday();
      const start = b.daysMonth || today.slice(0, 7);
      let y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
      let html = '<div class="days-cal-nav"><button type="button" data-b="days-month" data-step="-1">‹ 前の月</button><button type="button" data-b="days-month" data-step="0">今月</button><button type="button" data-b="days-month" data-step="1">次の月 ›</button></div><div class="days-cals">';
      for (let k = 0; k < 2; k += 1) {
        const first = new Date(Date.UTC(y, m - 1, 1));
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        let cells = '';
        for (let i = 0; i < first.getUTCDay(); i += 1) cells += '<span></span>';
        for (let day = 1; day <= last; day += 1) {
          const iso = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          const off = builderDaysIsOff(d, iso);
          const mark = d.off.indexOf(iso) >= 0 ? ' is-extra' : d.on.indexOf(iso) >= 0 ? ' is-open' : '';
          cells += iso < today ? '<span class="past' + (off ? ' off' : '') + '">' + day + '</span>' :
            '<button type="button" class="' + (off ? 'off' : 'on') + mark + (iso === today ? ' today' : '') + '" data-b="days-toggle" data-date="' + iso + '" aria-pressed="' + off + '" aria-label="' + escapeHtml(builderDaysLabel(iso)) + (off ? ' お休み（押すと営業日）' : ' 営業日（押すとお休み）') + '">' + day + '</button>';
        }
        html += '<div class="days-cal"><b>' + y + '年' + m + '月</b><div class="days-cal-grid">' + DAYS_WEEK.map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div></div>';
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      return html + '</div><p class="muted days-legend"><span><span class="lg off"></span>お休み</span><span><span class="lg on"></span>営業日</span><span><span class="lg is-extra"></span>足したお休み</span><span><span class="lg is-open"></span>毎週のお休みだけど営業</span></p>';
    }
    function builderDaysForm() {
      const b = state.builder;
      const head = '<h2>営業日（発送のお休み）</h2><p class="lead">営業日はOMSで決めます。書き出すと本店（Welcart）の営業日カレンダーにそのまま入ります（今日から1年分）。楽天・Yahooには、下の「楽天・Yahoo用のお休み一覧」を各店の営業日設定に写してください（API の申請がすんだら自動にします）。</p>';
      if (!b.days) {
        return head + '<p>いまはOMSで管理していません（本店のWelcartの設定のまま）。</p><button type="button" class="add" data-b="days-start">営業日をOMSで管理する</button>' +
          '<p class="muted">始めると、毎週土曜・日曜をお休みにした形から始まります。違うときは直してください。</p>';
      }
      const d = b.days;
      const range = function (kind, label, btn) {
        return '<div class="row days-add"><label class="fld"><span>' + label + '（この日から）</span><input type="date" data-days-input="' + kind + '" min="' + builderDaysToday() + '"></label><label class="fld"><span>この日まで（1日だけなら空）</span><input type="date" data-days-to="' + kind + '" min="' + builderDaysToday() + '"></label><span class="tools"><button type="button" data-b="days-add" data-kind="' + kind + '">' + btn + '</button></span></div>';
      };
      return head +
        '<h3>毎週のお休み</h3><div class="days-week">' + DAYS_WEEK.map(function (w, i) {
          return '<label class="switch"><input type="checkbox" data-days-week="' + i + '"' + (d.weekly.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + w + '</span></label>';
        }).join('') + '</div>' +
        '<h3>カレンダーで1日ずつ切り替える</h3><p class="muted">日を押すと「お休み」と「営業日」が入れ替わります。飛び石の連休や、毎週のお休みの日に営業するときもここで押すだけです。</p>' + builderDaysEditCal(d) +
        '<h3>お休みにする日（年末年始・夏休みなど）</h3><p class="muted">何件でも足せます。続いた期間は1つにまとめて表示します。</p>' + range('off', 'お休みにする日', 'お休みに足す') + builderDaysList(d.off, 'off') +
        '<h3>この日は営業する（毎週のお休みの例外）</h3><p class="muted">何件でも足せます。</p>' + range('on', '営業する日', '営業日に足す') + builderDaysList(d.on, 'on') +
        '<h3>楽天・Yahoo用のお休み一覧</h3><p class="muted">今日から1年分のお休み（毎週のお休みも含む）です。各店の営業日設定に写すときに使ってください。</p><textarea class="days-copy" rows="4" readonly>' + escapeHtml(builderDaysRanges(builderDaysExport().holidays).map(function (r) { return r.days === 1 ? r.from.replace(/-/g, '/') : r.from.replace(/-/g, '/') + '〜' + r.to.replace(/-/g, '/'); }).join('\n')) + '</textarea><button type="button" data-b="days-copy">一覧をコピー</button>' +
        '<p class="days-stop"><button type="button" data-b="days-stop">OMSでの管理をやめる（本店のWelcartの設定のままにする）</button></p>';
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
        const toEl = host && host.querySelector('[data-days-to="' + kind + '"]');
        if (!input || !input.value) { showToast('日付を選んでください'); return true; }
        let from = input.value, to = (toEl && toEl.value) || input.value;
        if (to < from) { const x = from; from = to; to = x; }
        if (builderDaysAdd(from, 366) < to) { showToast('1年より長い期間は足せません'); return true; }
        const other = kind === 'off' ? b.days.on : b.days.off;
        for (let iso = from; iso <= to; iso = builderDaysAdd(iso, 1)) {
          if (other.indexOf(iso) >= 0) other.splice(other.indexOf(iso), 1);
          if (b.days[kind].indexOf(iso) < 0) b.days[kind].push(iso);
        }
        b.days[kind].sort();
        builderChanged(true);
        return true;
      }
      if (name === 'days-remove' && b.days) {
        const from = el.dataset.from, to = el.dataset.to;
        b.days[el.dataset.kind] = b.days[el.dataset.kind].filter(function (x) { return x < from || x > to; });
        builderChanged(true);
        return true;
      }
      if (name === 'days-toggle' && b.days) {
        const iso = el.dataset.date;
        const d = b.days;
        const rm = function (list) { const i = list.indexOf(iso); if (i >= 0) list.splice(i, 1); };
        const weeklyOff = d.weekly.indexOf(new Date(iso + 'T00:00:00Z').getUTCDay()) >= 0;
        if (builderDaysIsOff(d, iso)) { rm(d.off); if (weeklyOff && d.on.indexOf(iso) < 0) d.on.push(iso); }
        else { rm(d.on); if (!weeklyOff && d.off.indexOf(iso) < 0) d.off.push(iso); }
        d.off.sort(); d.on.sort();
        builderChanged(true);
        return true;
      }
      if (name === 'days-month') {
        const step = Number(el.dataset.step);
        const cur = b.daysMonth || builderDaysToday().slice(0, 7);
        if (!step) b.daysMonth = '';
        else { const dt = new Date(Date.UTC(Number(cur.slice(0, 4)), Number(cur.slice(5, 7)) - 1 + step, 1)); b.daysMonth = dt.toISOString().slice(0, 7); }
        emit('oms:builder', { form: true });
        return true;
      }
      if (name === 'days-copy') {
        const ta = document.querySelector('.days-copy');
        if (ta) { ta.select(); const done = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(ta.value) : null; if (done && done.catch) done.catch(function () { document.execCommand('copy'); }); else document.execCommand('copy'); showToast('お休みの一覧をコピーしました。'); }
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
