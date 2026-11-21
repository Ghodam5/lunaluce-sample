// Luna Luce OMS 部品JS: 27-builder-days（営業日・発送のお休み・長期休暇のお知らせ）
// OMS が正（2026-11-21 林さん了承）。書き出すと businessDays に「今日から1年分のお休みの日」が入り、
// Welcart 側の受け取りプラグイン（wordpress/luna-oms-receiver）が営業日カレンダーをその通りにする。
// 決め方: 毎週のお休み（曜日）＋お休みにする日＋長期休暇 − 営業する日。午前だけ営業（一部）の日もある。
// カレンダーは1か月ずつ「次の月」で1年先まで送れる。日を押すたびに 営業 → お休み → 午前だけ → 営業 と変わる（色で一目でわかる）。
// 長期休暇（お正月・GW・お盆・秋の連休など）は名前と期間を決めると、その日はお休みになり、
// お知らせ本文（32-builder-news）とトップの流れる文言に自動で載る。出し始めは休暇の1〜4か月前から選べ、出さないこともできる。
// 標準はOMSで管理（下書きに営業日の設定がないときは、毎週土日休みから始める）。
    const DAYS_WEEK = ['日', '月', '火', '水', '木', '金', '土'];
    const DAYS_LEAD = [[0, 'お知らせに出さない'], [1, '1か月前から'], [2, '2か月前から'], [3, '3か月前から'], [4, '4か月前から']];
    // 長期休暇の名前のお手本と、だいたいの日付（月-日）。押すと次に来る分で足す。日付はあとで直す
    const DAYS_LONG_PRESETS = [
      { name: 'お正月休み', from: '12-29', to: '01-04' },
      { name: 'ゴールデンウィーク', from: '05-02', to: '05-06' },
      { name: 'お盆休み', from: '08-12', to: '08-16' },
      { name: '秋の連休', from: '09-19', to: '09-23' },
      { name: 'その他の長期休暇', from: '', to: '' }
    ];
    function builderDaysToday() {
      return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    }
    function builderDaysAdd(iso, n) {
      const d = new Date(iso + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    }
    function builderDaysAddMonths(iso, n) {
      const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1 + n, day = Number(iso.slice(8, 10));
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y, m, Math.min(day, last))).toISOString().slice(0, 10);
    }
    // 古い下書きに足りない欄をそろえる
    function builderDaysNorm(d) {
      if (!d) return d;
      if (!d.am) d.am = [];
      if (!d.long) d.long = [];
      return d;
    }
    function builderDaysLongOf(d, iso) {
      return (d.long || []).find(function (L) { return L.from && L.to && L.from <= iso && iso <= L.to; }) || null;
    }
    // その日: 'on'（営業）/ 'off'（お休み）/ 'am'（午前だけ営業）
    function builderDaysState(d, iso) {
      if ((d.am || []).indexOf(iso) >= 0) return 'am';
      if (d.on.indexOf(iso) >= 0) return 'on';
      if (d.off.indexOf(iso) >= 0) return 'off';
      if (builderDaysLongOf(d, iso)) return 'off';
      return d.weekly.indexOf(new Date(iso + 'T00:00:00Z').getUTCDay()) >= 0 ? 'off' : 'on';
    }
    function builderDaysIsOff(d, iso) {
      return builderDaysState(d, iso) === 'off';
    }
    // 書き出す形: { from, to, holidays: [...], halfDays: [...], longHolidays: [...] }
    function builderDaysExport() {
      const d = builderDaysNorm(state.builder.days);
      if (!d) return undefined;
      const from = builderDaysToday();
      const to = builderDaysAdd(from, 365);
      const holidays = [], halfDays = [];
      for (let iso = from; iso <= to; iso = builderDaysAdd(iso, 1)) {
        const s = builderDaysState(d, iso);
        if (s === 'off') holidays.push(iso);
        if (s === 'am') halfDays.push(iso);
      }
      return { from: from, to: to, holidays: holidays, halfDays: halfDays, longHolidays: d.long.filter(function (L) { return L.from && L.to; }).map(function (L) { return { id: L.id, name: L.name, from: L.from, to: L.to, noticeMonthsBefore: L.lead || 0, band: L.lead ? !!L.band : false }; }) };
    }
    function builderDaysErrors() {
      const d = state.builder.days;
      if (!d) return [];
      const out = d.weekly.length >= 7 ? ['営業日: 毎週すべての曜日がお休みになっています'] : [];
      (d.long || []).forEach(function (L) {
        const nm = '長期休暇「' + (L.name || '名前なし') + '」';
        if (!L.name) out.push('営業日: 長期休暇の名前が空です');
        if (!L.from || !L.to) out.push('営業日: ' + nm + ' の期間（いつから・いつまで）を入れてください');
        else if (L.from > L.to) out.push('営業日: ' + nm + ' の「いつから」が「いつまで」より後です');
        else if (builderDaysAdd(L.from, 62) < L.to) out.push('営業日: ' + nm + ' が2か月より長くなっています');
      });
      return out;
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
    // お知らせの文に使う形: 12月29日（火）
    function builderDaysJp(iso) {
      return Number(iso.slice(5, 7)) + '月' + Number(iso.slice(8, 10)) + '日（' + DAYS_WEEK[new Date(iso + 'T00:00:00Z').getUTCDay()] + '）';
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
    // 長期休暇から作るお知らせ（休みの前の最後の出荷日・休み明けの出荷日も入れる）
    function builderDaysLongNotice(L, d) {
      if (!L.from || !L.to || L.from > L.to || !L.lead) return null;
      let last = builderDaysAdd(L.from, -1), resume = builderDaysAdd(L.to, 1);
      for (let i = 0; i < 31 && builderDaysState(d, last) === 'off'; i += 1) last = builderDaysAdd(last, -1);
      for (let i = 0; i < 31 && builderDaysState(d, resume) === 'off'; i += 1) resume = builderDaysAdd(resume, 1);
      const name = L.name || '長期休暇';
      const body = [
        '誠に勝手ながら、' + builderDaysJp(L.from) + '〜' + builderDaysJp(L.to) + 'は' + name + 'のため、お問い合わせ・受注・出荷業務をお休みいたします。',
        '休業期間中もご注文は通常どおり承りますが、出荷は' + builderDaysJp(resume) + 'より順次となります。休業前の最終出荷は' + builderDaysJp(last) + 'です。',
        '休業期間の前後はご注文が混み合い、発送までにお時間をいただく場合がございます。ご使用予定日がお決まりの際は、ご注文時に必ずご記入ください。'
      ];
      if (L.note) body.push(L.note);
      const start = builderDaysAddMonths(L.from, -L.lead);
      return {
        id: 'days-' + L.id,
        auto: true,
        title: '【お知らせ】' + name + 'のお知らせ',
        body: body,
        band: L.band ? (name + '：' + builderDaysLabel(L.from) + '〜' + builderDaysLabel(L.to) + 'は発送をお休みします').slice(0, 60) : '',
        startDate: start,
        lastDay: L.to,
        startsAt: start + 'T00:00:00+09:00',
        endsAt: builderDaysAdd(L.to, 1) + 'T00:00:00+09:00'
      };
    }
    function builderDaysLongNotices() {
      const d = builderDaysNorm(state.builder.days);
      if (!d) return [];
      return d.long.map(function (L) { return builderDaysLongNotice(L, d); }).filter(Boolean);
    }
    // 真ん中の列のカレンダー: 1か月ずつ。「次の月」で1年先まで。日を押すたびに 営業 → お休み → 午前だけ → 営業
    function builderDaysEditCal(d) {
      const b = state.builder;
      const today = builderDaysToday();
      const first = today.slice(0, 7);
      const lastMonth = builderDaysAddMonths(today.slice(0, 8) + '01', 12).slice(0, 7);
      const cur = b.daysMonth && b.daysMonth >= first && b.daysMonth <= lastMonth ? b.daysMonth : first;
      const y = Number(cur.slice(0, 4)), m = Number(cur.slice(5, 7));
      const months = [];
      for (let k = 0; k <= 12; k += 1) months.push(builderDaysAddMonths(first + '-01', k).slice(0, 7));
      let html = '<div class="days-cal-nav"><button type="button" data-b="days-month" data-step="-1"' + (cur <= first ? ' disabled' : '') + '>‹ 前の月</button>' +
        '<b class="days-cal-title">' + y + '年' + m + '月</b>' +
        '<button type="button" data-b="days-month" data-step="1"' + (cur >= lastMonth ? ' disabled' : '') + '>次の月 ›</button></div>' +
        '<div class="days-months" role="group" aria-label="月を選ぶ">' + months.map(function (mm) {
          return '<button type="button" data-b="days-month" data-month="' + mm + '"' + (mm === cur ? ' class="is-on" aria-pressed="true"' : '') + '>' + (mm.slice(5, 7) === '01' || mm === first ? mm.slice(0, 4) + '年' : '') + Number(mm.slice(5, 7)) + '月</button>';
        }).join('') + '</div>';
      const firstDay = new Date(Date.UTC(y, m - 1, 1));
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const cells = [];
      for (let i = 0; i < firstDay.getUTCDay(); i += 1) cells.push('<span></span>');
      for (let day = 1; day <= last; day += 1) {
        const iso = cur + '-' + String(day).padStart(2, '0');
        const st = builderDaysState(d, iso);
        const L = builderDaysLongOf(d, iso);
        const mark = (d.off.indexOf(iso) >= 0 ? ' is-extra' : '') + (d.on.indexOf(iso) >= 0 ? ' is-open' : '') + (L ? ' is-long' : '');
        const word = st === 'off' ? 'お休み' : st === 'am' ? '午前だけ' : '営業';
        cells.push(iso < today ? '<span class="past ' + st + '">' + day + '</span>' :
          '<button type="button" class="' + st + mark + (iso === today ? ' today' : '') + '" data-b="days-toggle" data-date="' + iso + '" aria-label="' + escapeHtml(builderDaysLabel(iso) + ' ' + word + (L ? '（' + (L.name || '長期休暇') + '）' : '') + '。押すと切り替わります') + '"' + (L ? ' title="' + escapeHtml(L.name || '長期休暇') + '"' : '') + '>' + day + '<small>' + (st === 'off' ? '休' : st === 'am' ? '午前' : '') + '</small></button>');
      }
      while (cells.length % 7) cells.push('<span></span>');
      let rows = '';
      for (let w = 0; w < cells.length / 7; w += 1) rows += '<em>第' + (w + 1) + '週</em>' + cells.slice(w * 7, w * 7 + 7).join('');
      html += '<div class="days-cal"><div class="days-cal-grid"><em></em>' + DAYS_WEEK.map(function (w) { return '<i>' + w + '</i>'; }).join('') + rows + '</div></div>';
      return html + '<p class="muted days-legend"><span><span class="lg on"></span>営業</span><span><span class="lg off"></span>お休み</span><span><span class="lg am"></span>午前だけ営業</span><span><span class="lg is-long"></span>長期休暇</span><span><span class="lg is-open"></span>毎週のお休みだけど営業</span></p>';
    }
    function builderDaysLongForm(d) {
      const rows = d.long.map(function (L, i) {
        const n = builderDaysLongNotice(L, d);
        const leadSel = '<select data-long="' + i + '.lead" aria-label="お知らせを出し始める時期">' + DAYS_LEAD.map(function (x) { return '<option value="' + x[0] + '"' + (Number(L.lead || 0) === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>';
        return '<li class="days-long"><div class="row"><label class="fld"><span>名前</span><input type="text" data-long="' + i + '.name" value="' + escapeHtml(L.name || '') + '" maxlength="20"></label><span class="tools"><button type="button" data-b="days-long-remove" data-index="' + i + '">この長期休暇を消す</button></span></div>' +
          '<div class="row"><label class="fld"><span>いつから</span><input type="date" data-long="' + i + '.from" value="' + escapeHtml(L.from || '') + '"></label><label class="fld"><span>いつまで</span><input type="date" data-long="' + i + '.to" value="' + escapeHtml(L.to || '') + '"></label></div>' +
          '<div class="row"><label class="fld"><span>お知らせ</span>' + leadSel + '</label>' + (L.lead ? '<label class="switch"><input type="checkbox" data-long="' + i + '.band"' + (L.band ? ' checked' : '') + '><span>トップの流れる文言にも出す</span></label>' : '') + '</div>' +
          (L.lead ? '<label class="fld wide"><span>お知らせに書き足すこと（任意）</span><textarea rows="2" data-long="' + i + '.note" placeholder="例: シフォンケーキの休業前最終出荷は8/7です">' + escapeHtml(L.note || '') + '</textarea></label>' : '') +
          '<p class="days-long-out">' + (n ? 'お知らせは <b>' + escapeHtml(builderDaysLabel(n.startDate)) + '</b> から <b>' + escapeHtml(builderDaysLabel(n.lastDay)) + '</b> まで出ます（「' + escapeHtml(n.title) + '」）' : L.from && L.to ? 'お知らせには出しません（お休みにはなります）' : '期間を入れるとカレンダーがお休みになります') + '</p></li>';
      }).join('');
      return '<h3>長期休暇（お正月・GW・お盆など）</h3><p class="muted">期間を入れると、その日はお休みになります。お知らせを出す時期を選ぶと、お知らせ本文に自動で載ります（早く出しすぎないよう、最長4か月前まで）。</p>' +
        '<ol class="days-longs">' + rows + '</ol><div class="adds">' + DAYS_LONG_PRESETS.map(function (p, i) { return '<button type="button" data-b="days-long-add" data-preset="' + i + '">＋ ' + escapeHtml(p.name) + '</button>'; }).join('') + '</div>';
    }
    function builderDaysForm() {
      const b = state.builder;
      const head = '<h2>営業日（発送のお休み）</h2><p class="lead">営業日はOMSで決めます。書き出すと本店（Welcart）の営業日カレンダーにそのまま入ります（今日から1年分）。楽天・Yahooには、下の「楽天・Yahoo用のお休み一覧」を各店の営業日設定に写してください（API の申請がすんだら自動にします）。</p>';
      if (!b.days) {
        return head + '<p>いまはOMSで管理していません（本店のWelcartの設定のまま）。</p><button type="button" class="add" data-b="days-start">営業日をOMSで管理する</button>' +
          '<p class="muted">始めると、毎週土曜・日曜をお休みにした形から始まります。違うときは直してください。</p>';
      }
      const d = builderDaysNorm(b.days);
      const range = function (kind, label, btn) {
        return '<div class="row days-add"><label class="fld"><span>' + label + '（この日から）</span><input type="date" data-days-input="' + kind + '" min="' + builderDaysToday() + '"></label><label class="fld"><span>この日まで（1日だけなら空）</span><input type="date" data-days-to="' + kind + '" min="' + builderDaysToday() + '"></label><span class="tools"><button type="button" data-b="days-add" data-kind="' + kind + '">' + btn + '</button></span></div>';
      };
      const copy = builderDaysRanges(builderDaysExport().holidays).map(function (r) { return r.days === 1 ? r.from.replace(/-/g, '/') : r.from.replace(/-/g, '/') + '〜' + r.to.replace(/-/g, '/'); }).join('\n');
      const half = builderDaysExport().halfDays;
      return head +
        '<h3>カレンダー（1年先まで）</h3><p class="muted">日を押すたびに「営業 → お休み → 午前だけ営業 → 営業」と変わります。「次の月」や上の月の名前で、先の月のお休みも決めておけます。</p>' + builderDaysEditCal(d) +
        '<h3>毎週のお休み</h3><div class="days-week">' + DAYS_WEEK.map(function (w, i) {
          return '<label class="switch"><input type="checkbox" data-days-week="' + i + '"' + (d.weekly.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + w + '</span></label>';
        }).join('') + '</div>' +
        builderDaysLongForm(d) +
        '<details class="days-more"><summary>日付をまとめて入れる（お休み・営業する日・午前だけ）</summary>' +
        '<h3>お休みにする日</h3><p class="muted">何件でも足せます。続いた期間は1つにまとめて表示します。</p>' + range('off', 'お休みにする日', 'お休みに足す') + builderDaysList(d.off, 'off') +
        '<h3>この日は営業する（毎週のお休みの例外）</h3>' + range('on', '営業する日', '営業日に足す') + builderDaysList(d.on, 'on') +
        '<h3>午前だけ営業（一部）</h3>' + range('am', '午前だけの日', '午前だけに足す') + builderDaysList(d.am, 'am') + '</details>' +
        '<h3>楽天・Yahoo用のお休み一覧</h3><p class="muted">今日から1年分のお休み（毎週のお休み・長期休暇も含む）です。各店の営業日設定に写すときに使ってください。' + (half.length ? '午前だけ営業の日は ' + half.map(function (x) { return x.replace(/-/g, '/'); }).join('・') + ' です。' : '') + '</p><textarea class="days-copy" rows="4" readonly>' + escapeHtml(copy) + '</textarea><button type="button" data-b="days-copy">一覧をコピー</button>' +
        '<p class="days-stop"><button type="button" data-b="days-stop">OMSでの管理をやめる（本店のWelcartの設定のままにする）</button></p>';
    }
    function builderDaysPreview() {
      const d = builderDaysNorm(state.builder.days);
      if (!d) return '<p class="pv-note">営業日はまだOMSで管理していません。</p>';
      const today = builderDaysToday();
      const start = state.builder.daysMonth && state.builder.daysMonth > today.slice(0, 7) ? state.builder.daysMonth : today.slice(0, 7);
      let y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
      let html = '<p class="pv-note">発送のお休み（色つき）。書き出すとWelcartがこの通りになります。</p>';
      for (let k = 0; k < 3; k += 1) {
        const first = new Date(Date.UTC(y, m - 1, 1));
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        let cells = '';
        for (let i = 0; i < first.getUTCDay(); i += 1) cells += '<span></span>';
        for (let day = 1; day <= last; day += 1) {
          const iso = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          const st = builderDaysState(d, iso);
          cells += '<span class="' + (st === 'on' ? '' : st) + (iso === today ? ' today' : '') + (iso < today ? ' past' : '') + '">' + day + '</span>';
        }
        html += '<div class="pv-cal"><b>' + y + '年' + m + '月</b><div class="pv-cal-grid">' + DAYS_WEEK.map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div></div>';
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      const notes = builderDaysLongNotices();
      if (notes.length) {
        html += '<p class="pv-note">長期休暇のお知らせ（自動）</p>' + notes.map(function (n) {
          return '<article class="pv-news"><small>' + escapeHtml(builderDaysLabel(n.startDate)) + '〜' + escapeHtml(builderDaysLabel(n.lastDay)) + ' に掲載</small><h4>' + escapeHtml(n.title) + '</h4>' + n.body.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('') + (n.band ? '<p class="pv-band">流れる文言: ' + escapeHtml(n.band) + '</p>' : '') + '</article>';
        }).join('');
      }
      return html;
    }
    // ボタン（23-builder-tab の builderAction から最初に呼ぶ）。扱ったら true
    function builderDaysAction(name, el) {
      const b = state.builder;
      if (name === 'days-start') { b.days = { weekly: [0, 6], off: [], on: [], am: [], long: [] }; builderChanged(true); return true; }
      if (name === 'days-stop') { b.days = null; builderChanged(true); return true; }
      if (name === 'days-add' && b.days) {
        const d = builderDaysNorm(b.days);
        const kind = el.dataset.kind;
        const host = el.closest('[data-part="builder-editor"]');
        const input = host && host.querySelector('[data-days-input="' + kind + '"]');
        const toEl = host && host.querySelector('[data-days-to="' + kind + '"]');
        if (!input || !input.value) { showToast('日付を選んでください'); return true; }
        let from = input.value, to = (toEl && toEl.value) || input.value;
        if (to < from) { const x = from; from = to; to = x; }
        if (builderDaysAdd(from, 366) < to) { showToast('1年より長い期間は足せません'); return true; }
        ['off', 'on', 'am'].forEach(function (k) { if (k !== kind) d[k] = d[k].filter(function (x) { return x < from || x > to; }); });
        for (let iso = from; iso <= to; iso = builderDaysAdd(iso, 1)) if (d[kind].indexOf(iso) < 0) d[kind].push(iso);
        d[kind].sort();
        builderChanged(true);
        return true;
      }
      if (name === 'days-remove' && b.days) {
        const from = el.dataset.from, to = el.dataset.to;
        const d = builderDaysNorm(b.days);
        d[el.dataset.kind] = d[el.dataset.kind].filter(function (x) { return x < from || x > to; });
        builderChanged(true);
        return true;
      }
      if (name === 'days-toggle' && b.days) {
        const iso = el.dataset.date;
        const d = builderDaysNorm(b.days);
        const cur = builderDaysState(d, iso);
        ['off', 'on', 'am'].forEach(function (k) { const i = d[k].indexOf(iso); if (i >= 0) d[k].splice(i, 1); });
        const baseOff = builderDaysState(d, iso) === 'off'; // 毎週のお休み・長期休暇なら、何も書かないとお休み
        if (cur === 'on' && !baseOff) d.off.push(iso);
        if (cur === 'off') d.am.push(iso);
        if (cur === 'am' && baseOff) d.on.push(iso);
        d.off.sort(); d.on.sort(); d.am.sort();
        builderChanged(true);
        return true;
      }
      if (name === 'days-month') {
        const today = builderDaysToday();
        if (el.dataset.month) b.daysMonth = el.dataset.month;
        else {
          const cur = b.daysMonth || today.slice(0, 7);
          b.daysMonth = builderDaysAddMonths(cur + '-01', Number(el.dataset.step)).slice(0, 7);
        }
        emit('oms:builder', { form: true });
        return true;
      }
      if (name === 'days-long-add' && b.days) {
        const d = builderDaysNorm(b.days);
        const p = DAYS_LONG_PRESETS[Number(el.dataset.preset)] || DAYS_LONG_PRESETS[4];
        const today = builderDaysToday();
        let from = '', to = '';
        if (p.from) {
          let y = Number(today.slice(0, 4));
          from = y + '-' + p.from;
          if (from < today) { y += 1; from = y + '-' + p.from; }
          to = (p.to < p.from ? y + 1 : y) + '-' + p.to;
        }
        d.long.push({ id: 'long-' + Date.now().toString(36), name: p.name === 'その他の長期休暇' ? '' : p.name, from: from, to: to, lead: 2, band: true, note: '' });
        if (from) b.daysMonth = from.slice(0, 7);
        builderChanged(true);
        return true;
      }
      if (name === 'days-long-remove' && b.days) {
        builderDaysNorm(b.days).long.splice(Number(el.dataset.index), 1);
        builderChanged(true);
        return true;
      }
      if (name === 'days-copy') {
        const ta = document.querySelector('textarea.days-copy');
        if (ta) {
          ta.select();
          const done = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(ta.value) : null;
          if (done && done.catch) done.catch(function () { document.execCommand('copy'); }); else document.execCommand('copy');
          showToast('お休みの一覧をコピーしました。');
        }
        return true;
      }
      return false;
    }
    // 長期休暇の入力（名前・期間・お知らせの時期など）。打っている間は描き直さない
    function builderDaysLongInput(el, isChange) {
      const d = builderDaysNorm(state.builder.days);
      if (!d || el.dataset.long === undefined) return false;
      const parts = el.dataset.long.split('.');
      const L = d.long[Number(parts[0])];
      if (!L) return true;
      const k = parts[1];
      if (k === 'band') L.band = el.checked;
      else if (k === 'lead') L.lead = Number(el.value) || 0;
      else L[k] = el.value;
      if (k === 'from' && L.from) state.builder.daysMonth = L.from.slice(0, 7);
      builderChanged(isChange && k !== 'name' && k !== 'note');
      return true;
    }
    function builderDaysChange(el) {
      if (el.dataset.long !== undefined) return builderDaysLongInput(el, true);
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
