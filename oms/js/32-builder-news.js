// Luna Luce OMS 部品JS: 32-builder-news（お知らせ本文）
// サイトの「お知らせ」ページに出す記事。手で書く記事と、営業日の長期休暇から自動で作る記事（27-builder-days）の2種類。
// 2.23 で「5 サイト掲載」タブのお知らせ本文をここに移した。書き出しの news に入る（反映ツールが site-src/editorial の記事にする）。
// 掲載期間（開始日・最終日）は任意。自動の記事は長期休暇の画面で直す（ここでは見るだけ）。
    function builderNewsList() {
      const b = state.builder;
      if (!b.news) b.news = [];
      return b.news;
    }
    function builderNewsNew() {
      return { id: 'news-' + Date.now().toString(36), active: true, title: '', body: '', startDate: builderDaysToday(), lastDay: '' };
    }
    function builderNewsOn(n, today) {
      if (n.active === false) return false;
      if (n.startDate && today < n.startDate) return false;
      if (n.lastDay && today > n.lastDay) return false;
      return true;
    }
    function builderNewsWhen(n) {
      if (!n.startDate && !n.lastDay) return 'いつでも';
      return (n.startDate ? builderDaysLabel(n.startDate) + 'から' : '') + (n.lastDay ? builderDaysLabel(n.lastDay) + 'まで' : '');
    }
    function builderNewsForm() {
      const today = builderDaysToday();
      const rows = builderNewsList().map(function (n, i) {
        return '<li class="news-item"><div class="row"><label class="switch"><input type="checkbox" data-news="' + i + '.active"' + (n.active !== false ? ' checked' : '') + '><span>表示する</span></label>' +
          '<span class="tools"><button type="button" data-b="news-move" data-index="' + i + '" data-dir="-1" aria-label="上へ">↑</button><button type="button" data-b="news-move" data-index="' + i + '" data-dir="1" aria-label="下へ">↓</button><button type="button" data-b="news-remove" data-index="' + i + '">削除</button></span></div>' +
          '<label class="fld wide"><span>題名</span><input type="text" data-news="' + i + '.title" value="' + escapeHtml(n.title || '') + '" maxlength="60" placeholder="例: 【お知らせ】年末年始の発送について"></label>' +
          '<label class="fld wide"><span>本文</span><textarea rows="5" data-news="' + i + '.body">' + escapeHtml(n.body || '') + '</textarea><small>段落は空行で分けます。商品の価格・在庫は書かない</small></label>' +
          '<div class="period"><label class="fld"><span>開始日（任意）</span><input type="date" data-news="' + i + '.startDate" value="' + escapeHtml(n.startDate || '') + '"></label><label class="fld"><span>最終日（任意）</span><input type="date" data-news="' + i + '.lastDay" value="' + escapeHtml(n.lastDay || '') + '"><small>この日の終わりまで出します</small></label></div>' +
          '<p class="muted">' + (builderNewsOn(n, today) ? 'いま出ています' : 'いまは出ていません') + '（' + escapeHtml(builderNewsWhen(n)) + '）</p></li>';
      }).join('');
      const autos = builderDaysLongNotices();
      return '<h2>お知らせ本文</h2><p class="lead">サイトの「お知らせ」ページに出す記事です。上から新しい順に並びます。</p>' +
        '<h3>長期休暇のお知らせ（営業日から自動）</h3>' + (autos.length ? '<ul class="news-autos">' + autos.map(function (n) {
          return '<li><b>' + escapeHtml(n.title) + '</b><small>' + escapeHtml(builderDaysLabel(n.startDate)) + '〜' + escapeHtml(builderDaysLabel(n.lastDay)) + ' に掲載' + (n.band ? '・流れる文言にも出す' : '') + '</small></li>';
        }).join('') + '</ul>' : '<p class="muted">まだありません。営業日の「長期休暇」でお知らせを出す時期を選ぶと、ここに自動で入ります。</p>') +
        '<button type="button" data-b="select" data-type="days" data-index="0">営業日の長期休暇を開く</button>' +
        '<h3>手で書くお知らせ</h3><ol class="news-items">' + rows + '</ol><button type="button" class="add" data-b="news-add">＋ お知らせを書く</button>';
    }
    function builderNewsPreview() {
      const today = builderDaysToday();
      const autos = builderDaysLongNotices().map(function (n) { return Object.assign({ active: true }, n); });
      const all = autos.concat(builderNewsList());
      const now = all.filter(function (n) { return builderNewsOn(n, today); });
      const later = all.filter(function (n) { return n.active !== false && n.startDate && n.startDate > today; });
      const art = function (n) {
        const body = Array.isArray(n.body) ? n.body : String(n.body || '').split(/\n\s*\n/);
        return '<article class="pv-news"><small>' + (n.auto ? '自動・' : '') + escapeHtml(builderNewsWhen(n)) + '</small><h4>' + escapeHtml(n.title || '（題名なし）') + '</h4>' + body.filter(Boolean).map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('') + '</article>';
      };
      return '<p class="pv-note">いまのお知らせページ（' + now.length + '件）</p>' + (now.map(art).join('') || '<p class="muted">いま出るお知らせはありません。</p>') +
        (later.length ? '<p class="pv-note">これから出るお知らせ</p>' + later.map(art).join('') : '');
    }
    function builderNewsErrors() {
      const out = [];
      builderNewsList().forEach(function (n, i) {
        const nm = 'お知らせ本文 ' + (i + 1) + '件目';
        if (!n.title) out.push(nm + ': 題名が空です');
        if (!n.body) out.push(nm + ': 本文が空です');
        if (n.startDate && n.lastDay && n.startDate > n.lastDay) out.push(nm + ': 開始日が最終日より後です');
      });
      return out;
    }
    // 書き出す形（site-src/editorial の記事に近い形）。自動の記事も一緒に入れる
    function builderNewsExport() {
      const row = function (n, auto) {
        const body = Array.isArray(n.body) ? n.body : String(n.body || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        return { id: n.id, kind: 'news', auto: auto || undefined, title: n.title, blocks: body.map(function (t) { return { type: 'p', text: t }; }), startsAt: n.startDate ? n.startDate + 'T00:00:00+09:00' : undefined, endsAt: n.lastDay ? builderDaysAdd(n.lastDay, 1) + 'T00:00:00+09:00' : undefined };
      };
      return builderDaysLongNotices().map(function (n) { return row(n, 'days'); }).concat(builderNewsList().filter(function (n) { return n.active !== false; }).map(function (n) { return row(n); }));
    }
    // 長期休暇から自動で出す流れる文言（書き出しの notices の後ろに足す）
    function builderAutoBands() {
      return builderDaysLongNotices().filter(function (n) { return n.band; }).map(function (n) {
        return { id: n.id, auto: 'days', active: true, text: n.band, startsAt: n.startsAt, endsAt: n.endsAt };
      });
    }
    // 長期休暇から自動で作る文言も、1つずつ「出す・出さない」を選べる（自動でも必ず出るわけではない）
    function builderAutoBandsForm() {
      const d = builderDaysNorm(state.builder.days);
      if (!d) return '';
      const rows = d.long.map(function (L, i) {
        const n = builderDaysLongNotice(Object.assign({}, L, { band: true }), d);
        if (!n) return '';
        return '<li class="' + (L.band ? '' : 'is-off') + '"><label class="switch"><input type="checkbox" data-long="' + i + '.band"' + (L.band ? ' checked' : '') + '><span>表示する</span></label> <b>' + escapeHtml(n.band) + '</b><small>' + (L.band ? escapeHtml(builderDaysLabel(n.startsAt.slice(0, 10))) + 'から出ます' : '出しません（設定は残してあります）') + '・日付や名前は営業日の長期休暇で直す</small></li>';
      }).join('');
      if (!rows) return '';
      return '<h3>長期休暇から自動で作る文言</h3><p class="muted">自動で作りますが、出すかどうかはここで1つずつ選べます。</p><ul class="news-autos">' + rows + '</ul>';
    }
    function builderNewsAction(name, el) {
      const list = builderNewsList();
      const i = Number(el && el.dataset.index);
      if (name === 'news-add') { list.unshift(builderNewsNew()); builderChanged(true); return true; }
      if (name === 'news-remove') { list.splice(i, 1); builderChanged(true); return true; }
      if (name === 'news-move') {
        const j = i + Number(el.dataset.dir);
        if (j < 0 || j >= list.length) return true;
        const x = list[i]; list[i] = list[j]; list[j] = x;
        builderChanged(true);
        return true;
      }
      return false;
    }
    function builderNewsInput(el, isChange) {
      if (el.dataset.news === undefined) return false;
      const parts = el.dataset.news.split('.');
      const n = builderNewsList()[Number(parts[0])];
      if (!n) return true;
      if (parts[1] === 'active') n.active = el.checked; else n[parts[1]] = el.value;
      builderChanged(isChange && (el.type === 'checkbox' || el.type === 'date'));
      return true;
    }
