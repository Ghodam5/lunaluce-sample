// Luna Luce OMS 部品JS: 13-site-tab（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderSiteNotices(host) {
      function noticeFields() {
        return state.siteNotices.editor.notices.map(function (item, index) {
          return '<div class="row"><div><label>ID<input data-action="site-field" data-site="notices" data-path="notices.' + index + '.id" value="' + escapeHtml(item.id) + '"></label></div><label class="check"><input type="checkbox" data-action="site-field" data-site="notices" data-path="notices.' + index + '.active"' + (item.active ? ' checked' : '') + '>表示する</label><div class="wide"><label>トップの一文<input data-action="site-field" data-site="notices" data-path="notices.' + index + '.text" value="' + escapeHtml(item.text) + '"></label></div><div><label>リンク<input data-action="site-field" data-site="notices" data-path="notices.' + index + '.href" value="' + escapeHtml(item.href) + '"></label></div><div><label>開始（任意）<input data-action="site-field" data-site="notices" data-path="notices.' + index + '.startsAt" value="' + escapeHtml(item.startsAt) + '" placeholder="2026-11-01T00:00:00+09:00"></label></div><div><label>終了（含まない）<input data-action="site-field" data-site="notices" data-path="notices.' + index + '.endsAt" value="' + escapeHtml(item.endsAt) + '" placeholder="2026-12-01T00:00:00+09:00"></label></div><div class="bar"><button type="button" data-action="site-remove" data-site="notices" data-list="notices" data-index="' + index + '">この帯を削除</button></div></div>';
        }).join('');
      }
      function newsFields() {
        return state.siteNotices.editor.news.map(function (item, index) {
          return '<div class="row"><div><label>ID<input data-action="site-field" data-site="notices" data-path="news.' + index + '.id" value="' + escapeHtml(item.id) + '"></label></div><div class="wide"><label>題名<input data-action="site-field" data-site="notices" data-path="news.' + index + '.title" value="' + escapeHtml(item.title) + '"></label></div><div class="wide"><label>本文<textarea data-action="site-field" data-site="notices" data-path="news.' + index + '.body">' + escapeHtml(item.body) + '</textarea></label></div><div class="bar"><button type="button" data-action="site-remove" data-site="notices" data-list="news" data-index="' + index + '">この本文を削除</button></div></div>';
        }).join('');
      }
      function paintForm() {
        const editor = state.siteNotices.editor;
        host.innerHTML = '<section class="panel"><h2>お知らせ</h2><p class="lead">トップの一文と、お知らせ本文は別です。商品・価格・在庫・注文は入れません。</p><p class="meta" data-meta></p><label>更新者<input data-action="site-field" data-site="notices" data-path="updatedBy" value="' + escapeHtml(editor.updatedBy) + '"></label><h3>トップの一文</h3>' + noticeFields() + '<div class="bar"><button type="button" data-action="site-add" data-site="notices" data-list="notices">帯を追加</button></div><h3>お知らせ本文</h3>' + newsFields() + '<div class="bar"><button type="button" data-action="site-add" data-site="notices" data-list="news">本文を追加</button></div><div data-preview></div><p class="checkline" data-check></p><div class="actions"><button type="button" class="export" data-action="site-export" data-site="notices">下書き書き出し</button><label class="file">JSONを読み込む<input data-action="site-load" data-site="notices" type="file" accept="application/json,.json" hidden></label></div></section>';
        fill();
      }
      function fill() {
        const editor = state.siteNotices.editor;
        const built = validateNotices(editor);
        const meta = host.querySelector('[data-meta]');
        const preview = host.querySelector('[data-preview]');
        const check = host.querySelector('[data-check]');
        if (!meta || !preview || !check) return;
        const status = siteStatus(state.siteNotices, built);
        meta.textContent = '下書き版 ' + editor.draftRevision + ' / 公開済み版 ' + editor.publishedRevision + ' / 更新 ' + tokyoLabel(editor.updatedAt) + '。保存先は未接続です。自動公開はしません。';
        const now = '2026-11-20T12:00:00+09:00';
        const bands = editor.notices.filter(function (item) { return noticeOn(item, now); }).map(function (item) {
          return '<p class="band">' + escapeHtml(item.text) + '</p>';
        }).join('') || '<p class="news">いま出る帯はありません。</p>';
        const notes = editor.notices.map(function (item) {
          return '<p class="news">' + escapeHtml(item.id) + ' ' + escapeHtml(periodSamples(item)) + '</p>';
        }).join('');
        const bodies = editor.news.map(function (item) {
          return '<article class="news"><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.body) + '</p></article>';
        }).join('');
        preview.innerHTML = '<h3>プレビュー（' + tokyoLabel(now) + '）</h3>' + bands + notes + bodies;
        check.textContent = status.text;
        check.classList.toggle('is-bad', status.bad);
      }
      paintForm();
      on('oms:site-notices-form', paintForm);
      on('oms:site-notices', fill);
    }
    function renderSiteCalendar(host) {
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      function weeks() {
        return state.siteCalendar.editor.base.map(function (days, week) {
          const cells = days.map(function (flag, day) {
            const options = [['', '営業'], ['all', '休業'], ['am', '一部']].map(function (opt) {
              return '<option value="' + opt[0] + '"' + (opt[0] === flag ? ' selected' : '') + '>' + opt[1] + '</option>';
            }).join('');
            return '<label>' + dayNames[day] + '<select data-action="site-field" data-site="calendar" data-path="base.' + week + '.' + day + '">' + options + '</select></label>';
          }).join('');
          return '<div class="week"><span>第' + (week + 1) + '週</span>' + cells + '</div>';
        }).join('');
      }
      function paintForm() {
        const editor = state.siteCalendar.editor;
        host.innerHTML = '<section class="panel"><h2>営業日</h2><p class="lead">曜日設定と例外日だけを編集します。お知らせ本文の日付は、休業日にしません。</p><p class="meta" data-meta></p><label>更新者<input data-action="site-field" data-site="calendar" data-path="updatedBy" value="' + escapeHtml(editor.updatedBy) + '"></label>' + weeks() + '<div class="row"><label>追加の休業（1行に1日）<textarea data-action="site-field" data-site="calendar" data-path="includeText">' + escapeHtml(editor.includeText) + '</textarea></label><label>例外で営業（1行に1日）<textarea data-action="site-field" data-site="calendar" data-path="excludeText">' + escapeHtml(editor.excludeText) + '</textarea></label></div><div class="months" data-preview></div><p class="checkline" data-check></p><div class="actions"><button type="button" class="export" data-action="site-export" data-site="calendar">下書き書き出し</button><label class="file">JSONを読み込む<input data-action="site-load" data-site="calendar" type="file" accept="application/json,.json" hidden></label></div></section>';
        fill();
      }
      function fill() {
        const editor = state.siteCalendar.editor;
        const built = validateCalendar(editor);
        const meta = host.querySelector('[data-meta]');
        const preview = host.querySelector('[data-preview]');
        const check = host.querySelector('[data-check]');
        if (!meta || !preview || !check) return;
        const status = siteStatus(state.siteCalendar, built);
        const include = textToException(editor.includeText).map;
        const exclude = textToException(editor.excludeText).map;
        meta.textContent = '下書き版 ' + editor.draftRevision + ' / 公開済み版 ' + editor.publishedRevision + ' / 更新 ' + tokyoLabel(editor.updatedAt) + '。保存先は未接続です。自動公開はしません。';
        preview.innerHTML = monthTable(2026, 10, editor.base, include, exclude) + monthTable(2026, 11, editor.base, include, exclude);
        check.textContent = status.text;
        check.classList.toggle('is-bad', status.bad);
      }
      paintForm();
      on('oms:site-calendar-form', paintForm);
      on('oms:site-calendar', fill);
    }
    function renderSitePromos(host) {
      function rows() {
        return state.sitePromos.editor.promos.map(function (item, index) {
          return '<div class="row"><div><label>ID<input data-action="site-field" data-site="promos" data-path="promos.' + index + '.id" value="' + escapeHtml(item.id) + '"></label></div><label class="check"><input type="checkbox" data-action="site-field" data-site="promos" data-path="promos.' + index + '.active"' + (item.active ? ' checked' : '') + '>掲載する</label><div class="wide"><label>題名<input data-action="site-field" data-site="promos" data-path="promos.' + index + '.title" value="' + escapeHtml(item.title) + '"></label></div><div class="wide"><label>一文<input data-action="site-field" data-site="promos" data-path="promos.' + index + '.text" value="' + escapeHtml(item.text) + '"></label></div><div class="wide"><label>リンク<input data-action="site-field" data-site="promos" data-path="promos.' + index + '.href" value="' + escapeHtml(item.href) + '"></label></div><div><label>開始<input data-action="site-field" data-site="promos" data-path="promos.' + index + '.startsAt" value="' + escapeHtml(item.startsAt) + '" placeholder="2026-11-01T00:00:00+09:00"></label></div><div><label>終了（含まない）<input data-action="site-field" data-site="promos" data-path="promos.' + index + '.endsAt" value="' + escapeHtml(item.endsAt) + '" placeholder="2026-12-26T00:00:00+09:00"></label></div><div class="bar"><button type="button" data-action="site-move" data-site="promos" data-dir="up" data-index="' + index + '">上へ</button><button type="button" data-action="site-move" data-site="promos" data-dir="down" data-index="' + index + '">下へ</button></div></div>';
        }).join('');
      }
      function paintForm() {
        const editor = state.sitePromos.editor;
        host.innerHTML = '<section class="panel"><h2>特集</h2><p class="lead">掲載順と、題名・一文・期間だけです。商品ID・価格・在庫は入れません。</p><p class="meta" data-meta></p><label>更新者<input data-action="site-field" data-site="promos" data-path="updatedBy" value="' + escapeHtml(editor.updatedBy) + '"></label>' + rows() + '<div data-preview></div><p class="checkline" data-check></p><div class="actions"><button type="button" class="export" data-action="site-export" data-site="promos">下書き書き出し</button><label class="file">JSONを読み込む<input data-action="site-load" data-site="promos" type="file" accept="application/json,.json" hidden></label></div></section>';
        fill();
      }
      function fill() {
        const editor = state.sitePromos.editor;
        const built = validatePromos(editor);
        const meta = host.querySelector('[data-meta]');
        const preview = host.querySelector('[data-preview]');
        const check = host.querySelector('[data-check]');
        if (!meta || !preview || !check) return;
        const status = siteStatus(state.sitePromos, built);
        const now = '2026-11-20T12:00:00+09:00';
        meta.textContent = '下書き版 ' + editor.draftRevision + ' / 公開済み版 ' + editor.publishedRevision + ' / 更新 ' + tokyoLabel(editor.updatedAt) + '。保存先は未接続です。自動公開はしません。';
        preview.innerHTML = editor.promos.map(function (item, index) {
          const onNow = noticeOn(item, now);
          return '<article class="card"><strong>' + (index + 1) + '. ' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.text) + '</p><p>' + (onNow ? 'いま掲載' : 'いまは掲載しない') + '。' + escapeHtml(periodSamples(item)) + '</p></article>';
        }).join('');
        check.textContent = status.text;
        check.classList.toggle('is-bad', status.bad);
      }
      paintForm();
      on('oms:site-promos-form', paintForm);
      on('oms:site-promos', fill);
    }
    const SITE_PARTS = [
      { name: 'site-notices', render: renderSiteNotices },
      { name: 'site-calendar', render: renderSiteCalendar },
      { name: 'site-promos', render: renderSitePromos }
    ];
    function renderSiteTab(host) {
      mountOrdered(host, SITE_PARTS);
    }
