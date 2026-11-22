// Luna Luce OMS 部品JS: 49-voice-tab（「8 お客様の声」タブ: 受信箱・よくある質問の候補・よくある質問・口コミのまとめ・受け口・設定。計算は 48-voice-model）
    state.voice = { data: null, view: 'inbox', kind: '', src: '', status: 'open', q: '', open: '', adding: false, page: 0 };

    function voiceLoad() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(VOICE_STORE_KEY) || 'null'); } catch (e) { saved = null; }
      state.voice.data = voiceNorm(saved);
    }
    function voiceSave() {
      const d = state.voice.data;
      const added = voiceAutoAdd(d, voiceWho() || '自動');
      try { localStorage.setItem(VOICE_STORE_KEY, JSON.stringify(d)); } catch (e) { showToast('このブラウザに保存できませんでした。「保存用に書き出す」で控えを取ってください。'); }
      if (added.length) showToast('よくある質問に自動で ' + added.length + '件入れました。答えを書いてください。');
      emit('oms:voice');
    }
    function voiceWho() { return state.me ? state.me.display || state.me.name || '' : ''; }
    function voiceLabel(list, id) { const x = list.filter(function (k) { return k.id === id; })[0]; return x ? x.label || x.name : id; }
    function voiceSrcName(id) { const s = state.voice.data.sources.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id || '—'; }
    function voiceStars(n) { return n ? '<span class="stars" title="' + n + '">' + '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i></span>' : ''; }
    function voiceOpts(list, cur, first) {
      return (first ? '<option value="">' + first + '</option>' : '') + list.map(function (x) { return '<option value="' + escapeHtml(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + escapeHtml(x.label || x.name) + '</option>'; }).join('');
    }

    function voiceInboxView() {
      const v = state.voice, d = v.data;
      const q = v.q.trim().toLowerCase();
      const list = d.items.filter(function (x) {
        if (v.kind && x.kind !== v.kind) return false;
        if (v.src && x.src !== v.src) return false;
        if (v.status === 'open' && x.status === 'done') return false;
        if (v.status && v.status !== 'open' && x.status !== v.status) return false;
        if (q && (x.text + ' ' + x.title + ' ' + x.product + ' ' + x.nick).toLowerCase().indexOf(q) < 0) return false;
        return true;
      }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
      const per = 30, pages = Math.max(1, Math.ceil(list.length / per));
      if (v.page >= pages) v.page = pages - 1;
      const shown = list.slice(v.page * per, v.page * per + per);
      const srcs = d.sources.filter(function (s) { return s.on; });
      const filter = '<div class="vo-filter"><input type="search" placeholder="本文・商品コードで探す" value="' + escapeHtml(v.q) + '" data-v="q">' +
        '<select data-v="kind">' + voiceOpts(VOICE_KINDS, v.kind, '種類：全部') + '</select>' +
        '<select data-v="src">' + voiceOpts(d.sources, v.src, '受け口：全部') + '</select>' +
        '<select data-v="status">' + voiceOpts([{ id: 'open', label: '未対応と対応中' }].concat(VOICE_STATUS), v.status, '状態：全部') + '</select></div>';
      const add = v.adding ? '<section class="vo-box vo-add"><h3>手で入れる</h3>' +
        '<div class="vo-grid"><label>受け口 <select data-f="src">' + voiceOpts(srcs, srcs[0] && srcs[0].id) + '</select></label>' +
        '<label>種類 <select data-f="kind">' + voiceOpts(VOICE_KINDS, 'question') + '</select></label>' +
        '<label>日付 <input type="date" data-f="at" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
        '<label>評価（口コミのとき） <select data-f="rating"><option value="">なし</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>' +
        '<label>商品コード（任意） <input type="text" data-f="product" maxlength="40"></label>' +
        '<label>注文番号（任意） <input type="text" data-f="order" maxlength="40"></label>' +
        '<label>ニックネーム（任意・本名は入れない） <input type="text" data-f="nick" maxlength="30"></label></div>' +
        '<label>本文 <textarea rows="4" maxlength="3000" data-f="text"></textarea></label>' +
        '<p class="muted">' + (d.settings.mask ? 'メールアドレスと電話番号は保存の前に［メール］［電話］に置き換わります。' : '伏せ字は設定で切っています。') + '</p>' +
        '<div class="vo-acts"><button type="button" class="primary" data-v="add-save">入れる</button><button type="button" data-v="add-cancel">やめる</button></div></section>' : '';
      const csv = '<section class="vo-box"><h3>CSVを読み込む</h3><p class="muted">楽天のレビューCSV・Yahooのレビュー・LINEの書き出しなど。見出し（日付・本文・評価・商品番号など）から列を当てます。同じものは2回入りません。</p>' +
        '<div class="vo-grid"><label>受け口 <select data-v="csv-src">' + voiceOpts(srcs, v.csvSrc || (srcs[0] && srcs[0].id)) + '</select></label><label>種類 <select data-v="csv-kind">' + voiceOpts(VOICE_KINDS, v.csvKind || 'review') + '</select></label>' +
        '<label class="vo-file">ファイルを選ぶ<input type="file" accept=".csv,text/csv" data-v="csv"></label></div></section>';
      const cards = shown.map(function (x) {
        const isOpen = v.open === x.id;
        const t = x.topic ? d.topics.filter(function (t) { return t.id === x.topic; })[0] : null;
        return '<li class="vo-item k-' + x.kind + ' s-' + x.status + (isOpen ? ' is-open' : '') + (x.kind === 'review' && x.rating && x.rating <= 2 ? ' is-low' : '') + '"><button type="button" class="vo-sum" data-v="open" data-id="' + x.id + '">' +
          '<span class="meta"><span class="kind">' + escapeHtml(voiceLabel(VOICE_KINDS, x.kind)) + '</span>' + voiceStars(x.rating) + '<span>' + escapeHtml(voiceSrcName(x.src)) + '</span><span>' + escapeHtml(String(x.at).slice(0, 10)) + '</span>' + (x.product ? '<span class="code">' + escapeHtml(x.product) + '</span>' : '') + '<span class="st">' + escapeHtml(voiceLabel(VOICE_STATUS, x.status)) + '</span>' + (x.sample ? '<span class="sample">見本</span>' : '') + '</span>' +
          (x.title ? '<strong>' + escapeHtml(x.title) + '</strong>' : '') + '<span class="text">' + escapeHtml(isOpen ? x.text : String(x.text).slice(0, 90) + (String(x.text).length > 90 ? '…' : '')) + '</span></button>' +
          (isOpen ? '<div class="vo-detail"><div class="vo-grid"><label>状態 <select data-v="status-one" data-id="' + x.id + '">' + voiceOpts(VOICE_STATUS, x.status) + '</select></label>' +
            (x.kind === 'question' ? '<label>まとまり（よくある質問） <select data-v="topic" data-id="' + x.id + '">' + d.topics.filter(function (t) { return voiceTopicCount(d, t.id) || t.id === x.topic; }).map(function (tp) { return '<option value="' + tp.id + '"' + (tp.id === x.topic ? ' selected' : '') + '>' + escapeHtml(tp.title.slice(0, 30)) + '（' + voiceTopicCount(d, tp.id) + '）</option>'; }).join('') + '<option value="__new">新しいまとまりにする</option></select></label>' : '') +
            '<label>種類 <select data-v="kind-one" data-id="' + x.id + '">' + voiceOpts(VOICE_KINDS, x.kind) + '</select></label></div>' +
            (t && t.decision === 'in' ? '<p class="muted">このまとまりは、よくある質問に入っています。</p>' : '') +
            '<label>返した内容・対応のメモ <textarea rows="3" maxlength="3000" data-v="reply" data-id="' + x.id + '">' + escapeHtml(x.reply || '') + '</textarea></label>' +
            '<div class="vo-acts"><button type="button" data-v="open" data-id="' + x.id + '">閉じる</button><button type="button" data-v="del" data-id="' + x.id + '">消す</button></div></div>' : '') + '</li>';
      }).join('');
      const pager = '<div class="vo-pager"><button type="button" data-v="page" data-dir="-1"' + (v.page ? '' : ' disabled') + '>← 前</button><span>' + (list.length ? (v.page * per + 1) + '〜' + Math.min(list.length, v.page * per + per) + ' / ' + list.length + '件' : '0件') + '</span><button type="button" data-v="page" data-dir="1"' + (v.page < pages - 1 ? '' : ' disabled') + '>次 →</button></div>';
      return '<div class="vo-acts top"><button type="button" class="primary" data-v="add">＋ 手で入れる</button>' + (d.items.some(function (x) { return x.sample; }) ? '<button type="button" data-v="sample-del">見本を消す</button>' : '<button type="button" data-v="sample">見本を入れて試す</button>') + '</div>' +
        add + '<section class="vo-box"><h3>受信箱</h3>' + filter + (cards ? '<ul class="vo-list">' + cards + '</ul>' + pager : '<p class="muted">ありません。「手で入れる」かCSVの読み込みで入ります。</p>') + '</section>' + csv;
    }
    function voiceCandidatesView() {
      const d = state.voice.data;
      const cands = voiceCandidates(d);
      const held = d.topics.filter(function (t) { return t.decision === 'hold'; });
      const outs = d.topics.filter(function (t) { return t.decision === 'out'; });
      function block(x, again) {
        const t = x.topic;
        const qs = d.items.filter(function (i) { return i.topic === t.id && i.kind === 'question'; }).slice(-4);
        return '<li class="vo-cand"><div class="vo-cand-head"><strong>' + escapeHtml(t.title) + '</strong><span class="n">' + x.count + '件</span>' + (again ? '<span class="again">入れないと決めた後に ' + (x.count - t.countAtDecision) + '件増えました</span>' : '') + (t.decision === 'hold' ? '<span class="again">保留中</span>' : '') + '</div>' +
          '<ul class="vo-qs">' + qs.map(function (i) { return '<li>' + escapeHtml(voiceSrcName(i.src)) + '・' + escapeHtml(String(i.at).slice(0, 10)) + '：' + escapeHtml(String(i.text).slice(0, 100)) + '</li>'; }).join('') + '</ul>' +
          '<div class="vo-acts"><button type="button" class="primary" data-v="decide" data-d="in" data-id="' + t.id + '">よくある質問に入れる</button><button type="button" data-v="decide" data-d="out" data-id="' + t.id + '">入れない</button>' + (t.decision === 'hold' ? '' : '<button type="button" data-v="decide" data-d="hold" data-id="' + t.id + '">保留</button>') + '</div></li>';
      }
      return '<section class="vo-box"><h3>よくある質問の候補</h3><p class="muted">似た質問を自動でまとめ、' + d.settings.threshold + '件に届いたまとまりをここに出します（件数と、自動で入れるかどうかは「設定」で変えられます）。「入れない」と決めたものは、その後さらに' + d.settings.threshold + '件増えたときだけ、もう一度出します。</p>' +
        (cands.length ? '<ul class="vo-cands">' + cands.map(function (x) { return block(x, x.topic.decision === 'out'); }).join('') + '</ul>' : '<p class="muted">いまはありません。</p>') + '</section>' +
        (held.length ? '<section class="vo-box"><h3>保留</h3><ul class="vo-cands">' + held.filter(function (t) { return !cands.some(function (c) { return c.topic.id === t.id; }); }).map(function (t) { return block({ topic: t, count: voiceTopicCount(d, t.id) }, false); }).join('') + '</ul></section>' : '') +
        (outs.length ? '<section class="vo-box"><h3>入れないと決めたもの</h3><ul class="vo-outs">' + outs.map(function (t) {
          return '<li><strong>' + escapeHtml(t.title) + '</strong><span>' + voiceTopicCount(d, t.id) + '件・' + escapeHtml(String(t.decidedAt).slice(0, 10)) + ' ' + escapeHtml(t.decidedBy || '') + (t.reason ? '・理由: ' + escapeHtml(t.reason) : '') + '</span><button type="button" data-v="decide" data-d="" data-id="' + t.id + '">決め直す</button></li>';
        }).join('') + '</ul></section>' : '');
    }
    function voiceFaqView() {
      const d = state.voice.data;
      const faq = d.topics.filter(function (t) { return t.decision === 'in'; });
      return '<section class="vo-box"><h3>よくある質問</h3><p class="muted">入れると決めた質問と答えです。答えが空のものは「答え待ち」です。サイトのよくある質問のページに使えるよう書き出せます。</p>' +
        (faq.length ? '<ol class="vo-faq">' + faq.map(function (t) {
          return '<li class="' + (t.faqA && t.faqA.trim() ? '' : 'is-wait') + '"><label>質問 <input type="text" maxlength="200" value="' + escapeHtml(t.faqQ || t.title) + '" data-v="faq-q" data-id="' + t.id + '"></label>' +
            '<label>答え' + (t.faqA && t.faqA.trim() ? '' : '<em>答え待ち</em>') + ' <textarea rows="3" maxlength="2000" data-v="faq-a" data-id="' + t.id + '">' + escapeHtml(t.faqA || '') + '</textarea></label>' +
            '<small>' + voiceTopicCount(d, t.id) + '件の質問から・' + escapeHtml(String(t.decidedAt).slice(0, 10)) + ' ' + escapeHtml(t.decidedBy || '') + '</small><button type="button" data-v="decide" data-d="" data-id="' + t.id + '">よくある質問から外す</button></li>';
        }).join('') + '</ol><div class="vo-acts"><button type="button" data-v="faq-export">よくある質問を書き出す（JSON）</button></div>' : '<p class="muted">まだありません。「よくある質問の候補」から入れます。</p>') + '</section>';
    }
    function voiceReviewsView() {
      const d = state.voice.data;
      const s = voiceReviewSummary(d);
      const table = function (rows, label) {
        return '<table class="vo-table"><tr><th>' + label + '</th><th>件数</th><th>平均</th><th>★2以下</th></tr>' + rows.slice(0, 30).map(function (r) {
          return '<tr><td>' + escapeHtml(label === '受け口' ? voiceSrcName(r.key) : r.key) + '</td><td>' + r.n + '</td><td>' + r.avg.toFixed(1) + '</td><td class="' + (r.low ? 'warn' : '') + '">' + r.low + '</td></tr>';
        }).join('') + '</table>';
      };
      return '<section class="vo-box"><h3>口コミのまとめ</h3><p class="vo-kpi"><span><b>' + s.total + '</b>件</span><span>平均 <b>' + (s.total ? s.avg.toFixed(1) : '—') + '</b></span><span class="' + (s.lowOpen.length ? 'warn' : '') + '">★2以下で未対応 <b>' + s.lowOpen.length + '</b>件</span></p>' +
        (s.lowOpen.length ? '<ul class="vo-low">' + s.lowOpen.map(function (x) { return '<li><button type="button" data-v="goto" data-id="' + x.id + '">' + voiceStars(x.rating) + ' ' + escapeHtml(voiceSrcName(x.src)) + '・' + escapeHtml(String(x.at).slice(0, 10)) + '：' + escapeHtml(String(x.text).slice(0, 80)) + '</button></li>'; }).join('') + '</ul>' : '') + '</section>' +
        (s.total ? '<section class="vo-box"><h3>受け口ごと</h3>' + table(s.bySource, '受け口') + '</section><section class="vo-box"><h3>商品ごと（件数の多い順）</h3>' + table(s.byProduct, '商品コード') + '</section>' : '');
    }
    function voiceSourcesView() {
      const d = state.voice.data;
      return '<section class="vo-box"><h3>受け口</h3><p class="muted">お客様の声が来る場所です。いつでも足せます（LINE公式アカウント・SMSなど）。「つなぎ方」は、いまは手で入れるかCSVです。APIでつながったら「自動で取り込む」にします。</p>' +
        '<ul class="vo-srcs">' + d.sources.map(function (s) {
          const n = d.items.filter(function (x) { return x.src === s.id; }).length;
          return '<li><label><input type="checkbox" data-v="src-on" data-id="' + s.id + '"' + (s.on ? ' checked' : '') + '> 使う</label><input type="text" maxlength="30" value="' + escapeHtml(s.name) + '" data-v="src-name" data-id="' + s.id + '" aria-label="名前">' +
            '<select data-v="src-how" data-id="' + s.id + '">' + voiceOpts(VOICE_HOW, s.how) + '</select><input type="text" maxlength="120" value="' + escapeHtml(s.note || '') + '" data-v="src-note" data-id="' + s.id + '" placeholder="メモ" aria-label="メモ"><span class="n">' + n + '件</span>' +
            (VOICE_DEFAULT_SOURCES.some(function (x) { return x.id === s.id; }) || n ? '' : '<button type="button" data-v="src-del" data-id="' + s.id + '">消す</button>') + '</li>';
        }).join('') + '</ul><div class="vo-acts"><button type="button" data-v="src-add">＋ 受け口を足す</button></div></section>';
    }
    function voiceSettingsView() {
      const st = state.voice.data.settings;
      return '<section class="vo-box"><h3>設定</h3>' +
        '<label class="unit-in">よくある質問の候補に出す件数 <input type="number" min="2" max="50" value="' + st.threshold + '" data-v="set-th"><span>件</span></label>' +
        '<fieldset class="vo-mode"><legend>件数に届いたとき</legend><label><input type="radio" name="vo-mode" value="ask" data-v="set-mode"' + (st.mode === 'ask' ? ' checked' : '') + '> 候補に出して、人が「入れる・入れない」を決める</label>' +
        '<label><input type="radio" name="vo-mode" value="auto" data-v="set-mode"' + (st.mode === 'auto' ? ' checked' : '') + '> 自動で入れる（入れないと決めたもの・保留は除く。答えは人が書く）</label></fieldset>' +
        '<label><input type="checkbox" data-v="set-mask"' + (st.mask ? ' checked' : '') + '> 本文のメールアドレス・電話番号を伏せ字にしてから保存する</label></section>' +
        '<section class="vo-box"><h3>控え</h3><p class="muted">いまはこのブラウザに保存しています。ほかの人と分けて使う前に、サーバーのデータベースへ移します。</p><div class="vo-acts"><button type="button" data-v="backup">保存用に書き出す（JSON）</button><label class="vo-file">保存用を読み込む<input type="file" accept="application/json" data-v="restore"></label></div></section>';
    }
    // 見本（試す用。お客様の情報は入れない。消すと見本だけ消える）
    function voiceSampleItems() {
      return [
        ['mail', 'question', '2026-11-02', '', '名入れの文字は何文字まで入りますか？'],
        ['line', 'question', '2026-11-05', '', '名入れは何文字まで入れられますか'],
        ['yahoo-ask', 'question', '2026-11-08', '', '名入れの文字数は何文字までですか？'],
        ['rakuten-ask', 'question', '2026-11-09', '', '挙式日に間に合うように届けてもらえますか'],
        ['mail', 'question', '2026-11-12', '', '送料はいくらかかりますか'],
        ['rakuten-review', 'review', '2026-11-03', 'kashi-xmas', 'お菓子がたくさん入っていて子どもたちが喜んでいました。', 5],
        ['rakuten-review', 'review', '2026-11-06', 'kashi-xmas', '届くのが思ったより遅かったです。', 2],
        ['yahoo-review', 'review', '2026-11-10', 'WB-C165N_C165B', '写真どおりのきれいな時計でした。', 4],
        ['honten-form', 'opinion', '2026-11-11', '', 'ラッピングの色をもっと選べるとうれしいです。']
      ].map(function (r) { return { src: r[0], kind: r[1], at: r[2], product: r[3], text: r[4], rating: r[5] || null, sample: true }; });
    }

    function renderVoiceTab(host) {
      function paint() {
        const v = state.voice;
        if (!v.data) voiceLoad();
        const d = v.data;
        const open = d.items.filter(function (x) { return x.status !== 'done'; }).length;
        const cands = voiceCandidates(d).length;
        const tabs = [['inbox', '受信箱（未対応 ' + open + '）'], ['cands', 'よくある質問の候補（' + cands + '）'], ['faq', 'よくある質問'], ['reviews', '口コミのまとめ'], ['sources', '受け口'], ['settings', '設定']];
        host.innerHTML = '<div class="vo-head"><div><p class="kicker">Customer voice</p><h2>お客様の声</h2><p class="lead">口コミ・質問・意見・苦情を、楽天・Yahoo・本店・メール・LINE・SMS・電話から1か所に集めます。いまはこのブラウザに保存しています。</p></div>' +
          '<nav class="vo-nav">' + tabs.map(function (t) { return '<button type="button" data-v="view" data-to="' + t[0] + '" aria-pressed="' + (v.view === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</nav></div>' +
          (v.view === 'cands' ? voiceCandidatesView() : v.view === 'faq' ? voiceFaqView() : v.view === 'reviews' ? voiceReviewsView() : v.view === 'sources' ? voiceSourcesView() : v.view === 'settings' ? voiceSettingsView() : voiceInboxView());
      }
      function item(id) { return state.voice.data.items.filter(function (x) { return x.id === id; })[0]; }
      function topic(id) { return state.voice.data.topics.filter(function (x) { return x.id === id; })[0]; }
      function src(id) { return state.voice.data.sources.filter(function (x) { return x.id === id; })[0]; }
      function act(el) {
        const v = state.voice, d = v.data, k = el.dataset.v;
        if (k === 'view') { v.view = el.dataset.to; paint(); return; }
        if (k === 'q') { v.q = el.value; v.page = 0; paint(); const i = host.querySelector('[data-v="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; }
        if (k === 'kind' || k === 'src' || k === 'status') { v[k] = el.value; v.page = 0; paint(); return; }
        if (k === 'page') { v.page += Number(el.dataset.dir); paint(); return; }
        if (k === 'open') { v.open = v.open === el.dataset.id ? '' : el.dataset.id; paint(); return; }
        if (k === 'goto') { v.view = 'inbox'; v.status = ''; v.kind = ''; v.src = ''; v.q = ''; v.open = el.dataset.id; paint(); return; }
        if (k === 'add') { v.adding = true; paint(); return; }
        if (k === 'add-cancel') { v.adding = false; paint(); return; }
        if (k === 'add-save') {
          const f = {}; host.querySelectorAll('.vo-add [data-f]').forEach(function (x) { f[x.dataset.f] = x.value; });
          const r = voiceAdd(d, f, voiceWho());
          if (!r.ok) { showToast(r.msg); return; }
          v.adding = false; voiceSave(); showToast('入れました。' + (r.item.kind === 'question' ? '似た質問のまとまりにも入れました。' : '')); return;
        }
        if (k === 'csv-src') { v.csvSrc = el.value; return; }
        if (k === 'csv-kind') { v.csvKind = el.value; return; }
        if (k === 'csv') {
          const file = el.files && el.files[0]; if (!file) return;
          const s = v.csvSrc || (d.sources.filter(function (x) { return x.on; })[0] || {}).id, kind = v.csvKind || 'review';
          file.arrayBuffer().then(function (buf) {
            let text = new TextDecoder('utf-8').decode(buf);
            if (text.indexOf('�') >= 0) text = new TextDecoder('shift_jis').decode(buf); // 楽天・YahooのCSVはShift_JISのことが多い
            const r = voiceCsvItems(text, s, kind);
            if (r.missing.length) { showToast('本文の列が見つかりません。1行目に「本文」「レビュー本文」「コメント」などの見出しがあるCSVを選んでください。'); return; }
            let added = 0, dup = 0;
            r.items.forEach(function (x) { const res = voiceAdd(d, x, voiceWho()); if (res.ok) added += 1; else if (res.dup) dup += 1; });
            voiceSave(); showToast(added + '件を入れました' + (dup ? '（同じもの ' + dup + '件は入れていません）' : '') + '。');
          }).catch(function () { showToast('CSVを読めませんでした。'); });
          return;
        }
        if (k === 'status-one') { item(el.dataset.id).status = el.value; voiceSave(); return; }
        if (k === 'kind-one') {
          const x = item(el.dataset.id); x.kind = el.value;
          if (x.kind === 'question' && !x.topic) x.topic = voiceAutoTopic(d, x);
          voiceSave(); return;
        }
        if (k === 'topic') {
          const x = item(el.dataset.id);
          if (el.value === '__new') { const t = { id: 'topic-' + Date.now().toString(36), title: String(x.text).slice(0, 60), decision: '', faqQ: '', faqA: '', decidedAt: '', decidedBy: '', reason: '', countAtDecision: 0 }; d.topics.push(t); x.topic = t.id; }
          else x.topic = el.value;
          voiceSave(); return;
        }
        if (k === 'reply') { item(el.dataset.id).reply = el.value; if (el.value.trim() && item(el.dataset.id).status === 'new') item(el.dataset.id).status = 'doing'; voiceSave(); return; }
        if (k === 'del') { if (window.confirm('この1件を消しますか？')) { d.items = d.items.filter(function (x) { return x.id !== el.dataset.id; }); v.open = ''; voiceSave(); } return; }
        if (k === 'sample') { let n = 0; voiceSampleItems().forEach(function (x) { if (voiceAdd(d, x, '見本').ok) n += 1; }); voiceSave(); showToast('見本を' + n + '件入れました（「見本を消す」で消えます）。'); return; }
        if (k === 'sample-del') {
          d.items = d.items.filter(function (x) { return !x.sample; });
          d.topics = d.topics.filter(function (t) { return t.decision === 'in' || d.items.some(function (x) { return x.topic === t.id; }); });
          voiceSave(); showToast('見本を消しました。'); return;
        }
        if (k === 'decide') {
          const t = topic(el.dataset.id), dec = el.dataset.d;
          if (dec === 'out') {
            const why = window.prompt('入れない理由（任意。例: 商品ページに書いてある）', '');
            if (why === null) return;
            voiceDecide(d, t.id, 'out', { reason: why }, voiceWho());
          } else if (dec === '') { t.decision = ''; t.reason = ''; t.countAtDecision = 0; }
          else voiceDecide(d, t.id, dec, {}, voiceWho());
          if (dec === 'in') v.view = 'faq';
          voiceSave(); return;
        }
        if (k === 'faq-q') { topic(el.dataset.id).faqQ = el.value; voiceSave(); return; }
        if (k === 'faq-a') { topic(el.dataset.id).faqA = el.value; voiceSave(); return; }
        if (k === 'faq-export') { downloadJson('faq.json', { kind: 'luna-faq', exportedAt: new Date().toISOString(), items: voiceFaqExport(d) }); return; }
        if (k === 'src-on') { src(el.dataset.id).on = el.checked; voiceSave(); return; }
        if (k === 'src-name') { if (el.value.trim()) src(el.dataset.id).name = el.value.trim(); voiceSave(); return; }
        if (k === 'src-how') { src(el.dataset.id).how = el.value; voiceSave(); return; }
        if (k === 'src-note') { src(el.dataset.id).note = el.value; voiceSave(); return; }
        if (k === 'src-add') { d.sources.push({ id: 'src-' + Date.now().toString(36), name: '新しい受け口', how: 'manual', on: true, note: '' }); voiceSave(); return; }
        if (k === 'src-del') { d.sources = d.sources.filter(function (x) { return x.id !== el.dataset.id; }); voiceSave(); return; }
        if (k === 'set-th') { d.settings.threshold = Math.max(2, Math.min(50, Math.round(Number(el.value)) || 3)); voiceSave(); return; }
        if (k === 'set-mode') { d.settings.mode = el.value === 'auto' ? 'auto' : 'ask'; voiceSave(); return; }
        if (k === 'set-mask') { d.settings.mask = el.checked; voiceSave(); return; }
        if (k === 'backup') { downloadJson('oms-voice.json', Object.assign({ kind: 'luna-oms-voice', exportedAt: new Date().toISOString() }, d)); return; }
        if (k === 'restore') {
          const f = el.files && el.files[0]; if (!f) return;
          f.text().then(function (t) { const x = JSON.parse(t); if (x.kind !== 'luna-oms-voice') throw new Error('kind'); v.data = voiceNorm(x); voiceSave(); showToast('読み込みました。'); })
            .catch(function () { showToast('「保存用に書き出す」で作ったファイルを選んでください。'); });
        }
      }
      host.addEventListener('click', function (e) { const el = e.target.closest('button[data-v]'); if (el) act(el); });
      host.addEventListener('change', function (e) { const el = e.target.closest('[data-v]'); if (el && el.tagName !== 'BUTTON' && el.dataset.v !== 'q') act(el); });
      host.addEventListener('input', function (e) { const el = e.target.closest('[data-v="q"]'); if (el) act(el); });
      paint();
      on('oms:voice', paint);
    }
