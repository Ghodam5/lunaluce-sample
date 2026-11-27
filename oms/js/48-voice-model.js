// Luna Luce OMS 部品JS: 48-voice-model（お客様の声: 口コミ・質問・意見の受け口と、よくある質問の候補。データと計算だけ。画面は 49-voice-tab）
// 受け口（どこから来たか）は後からいくらでも足せる: 楽天・Yahoo・本店・メール・SMS・LINE公式アカウント・電話など。
// いまは手で入れるか、各所から落としたCSVを読み込む。APIでの自動の吸い上げは、つながったら受け口の「つなぎ方」を変えて足す。
// よくある質問: 似た質問を自動でまとめ（文字の並びの近さ）、決めた件数に届いたら「候補」に出す。入れる・入れない・保留は人が決める。
// 「入れない」と決めたものは、その後さらに決めた件数ぶん増えたときだけ、もう一度候補に出す。
// 保存: いまはこのブラウザ（localStorage）。サーバーのDBに移すときは「3 DBスキーマ」の voice_* の表に同じ形で入れる。
// 個人情報: 名前はニックネームだけ。本文のメールアドレス・電話番号は保存の前に伏せ字にする（設定で外せる）。
    const VOICE_STORE_KEY = 'luna-oms-voice-v1';
    const VOICE_KINDS = [
      { id: 'review', label: '口コミ・レビュー' },
      { id: 'question', label: '質問' },
      { id: 'opinion', label: '意見・要望' },
      { id: 'complaint', label: '苦情・不具合' }
    ];
    const VOICE_STATUS = [
      { id: 'new', label: '未対応' },
      { id: 'doing', label: '対応中' },
      { id: 'done', label: '済み' }
    ];
    const VOICE_HOW = [
      { id: 'manual', label: '手で入れる' },
      { id: 'csv', label: 'CSVを読み込む' },
      { id: 'api', label: '自動で取り込む（API・未接続）' }
    ];
    const VOICE_DEFAULT_SOURCES = [
      { id: 'rakuten-review', name: '楽天 レビュー', how: 'csv', on: true, note: 'RMSのレビューCSV。APIは状態を確認してから' },
      { id: 'rakuten-ask', name: '楽天 問い合わせ', how: 'manual', on: true, note: 'R-Messe' },
      { id: 'yahoo-review', name: 'Yahoo レビュー', how: 'csv', on: true, note: '情報が届いたらつなぎ方を決める' },
      { id: 'yahoo-ask', name: 'Yahoo 質問', how: 'manual', on: true, note: 'ストアへの質問' },
      { id: 'honten-form', name: '本店 問い合わせ', how: 'manual', on: true, note: 'お問い合わせフォーム' },
      { id: 'mail', name: 'メール（info@）', how: 'manual', on: true, note: '' },
      { id: 'line', name: 'LINE公式アカウント', how: 'manual', on: false, note: 'これから作る' },
      { id: 'sms', name: 'SMS', how: 'manual', on: false, note: 'これから' },
      { id: 'phone', name: '電話・FAX', how: 'manual', on: true, note: '' }
    ];

    function voiceEmpty() {
      return { sources: VOICE_DEFAULT_SOURCES.map(function (s) { return Object.assign({}, s); }), items: [], topics: [], settings: { threshold: 3, mode: 'ask', mask: true } };
    }
    function voiceNorm(data) {
      const d = voiceEmpty();
      if (!data || typeof data !== 'object') return d;
      if (Array.isArray(data.sources) && data.sources.length) d.sources = data.sources.filter(function (s) { return s && s.id && s.name; });
      if (Array.isArray(data.items)) d.items = data.items.filter(function (x) { return x && x.id && x.text != null; });
      if (Array.isArray(data.topics)) d.topics = data.topics.filter(function (t) { return t && t.id; });
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings;
        d.settings = { threshold: Math.max(2, Math.min(50, Number(s.threshold) || 3)), mode: s.mode === 'auto' ? 'auto' : 'ask', mask: s.mask !== false };
      }
      return d;
    }
    // 本文のメールアドレス・電話番号を伏せ字にする
    function voiceMask(text) {
      return String(text || '')
        .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '［メール］')
        .replace(/(?:\+?81[-\s]?)?0\d{1,4}[-\s(（]?\d{1,4}[-\s)）]?\d{3,4}/g, '［電話］');
    }
    // 似ている度合い（文字の2つ並びの重なり）。よくある質問のまとめに使う
    function voiceNormText(text) {
      return String(text || '').toLowerCase()
        .replace(/[\s　、。,.!?！？「」『』（）()【】［］\[\]・…~〜ー-]/g, '')
        .replace(/(お世話になっております|お世話になります|よろしくお願いします|よろしくお願いいたします|ありがとうございます|すみません|教えてください|でしょうか|ですか|ますか)/g, '');
    }
    function voiceGrams(text) {
      const t = voiceNormText(text);
      const g = {};
      for (let i = 0; i < t.length - 1; i += 1) g[t.slice(i, i + 2)] = 1;
      if (t.length === 1) g[t] = 1;
      return g;
    }
    function voiceSimilar(a, b) {
      const ga = voiceGrams(a), gb = voiceGrams(b);
      const ka = Object.keys(ga), kb = Object.keys(gb);
      if (!ka.length || !kb.length) return 0;
      let both = 0;
      ka.forEach(function (k) { if (gb[k]) both += 1; });
      return both / (ka.length + kb.length - both);
    }
    const VOICE_SIMILAR_MIN = 0.3;
    // 質問を、いちばん近いまとまりに入れる（無ければ新しいまとまりを作る）。戻り値はまとまりのid
    function voiceAutoTopic(d, item) {
      let best = null, bestScore = 0;
      d.topics.forEach(function (t) {
        const members = d.items.filter(function (x) { return x.topic === t.id && x.id !== item.id; });
        const texts = [t.title].concat(members.slice(0, 8).map(function (x) { return x.text; }));
        const score = Math.max.apply(null, texts.map(function (s) { return voiceSimilar(item.text, s); }));
        if (score > bestScore) { bestScore = score; best = t; }
      });
      if (best && bestScore >= VOICE_SIMILAR_MIN) return best.id;
      const t = { id: 'topic-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), title: String(item.text).slice(0, 60), decision: '', faqQ: '', faqA: '', decidedAt: '', decidedBy: '', reason: '', countAtDecision: 0 };
      d.topics.push(t);
      return t.id;
    }
    function voiceTopicCount(d, topicId) {
      return d.items.filter(function (x) { return x.topic === topicId && x.kind === 'question'; }).length;
    }
    // 候補に出すまとまり: 決めた件数以上で、まだ決めていないもの＋保留＋「入れない」から決めた件数ぶん増えたもの
    function voiceCandidates(d) {
      const n = d.settings.threshold;
      return d.topics.map(function (t) { return { topic: t, count: voiceTopicCount(d, t.id) }; }).filter(function (x) {
        const t = x.topic;
        if (t.decision === 'in') return false;
        if (t.decision === 'out') return x.count >= (t.countAtDecision || 0) + n;
        return x.count >= n;
      }).sort(function (a, b) { return b.count - a.count; });
    }
    function voiceDecide(d, topicId, decision, patch, who) {
      const t = d.topics.filter(function (x) { return x.id === topicId; })[0];
      if (!t) return null;
      Object.assign(t, patch || {});
      t.decision = decision;
      t.decidedAt = new Date().toISOString();
      t.decidedBy = who || '';
      t.countAtDecision = voiceTopicCount(d, topicId);
      if (decision === 'in' && !t.faqQ) t.faqQ = t.title;
      return t;
    }
    // 「自動で入れる」にしているとき: 件数に届いたまとまりを入れる（入れないと決めたもの・保留は人の判断のまま）。答えは空のまま「答え待ち」
    function voiceAutoAdd(d, who) {
      if (d.settings.mode !== 'auto') return [];
      const added = [];
      voiceCandidates(d).forEach(function (x) {
        if (!x.topic.decision) { voiceDecide(d, x.topic.id, 'in', {}, who || '自動'); added.push(x.topic); }
      });
      return added;
    }
    // 1件を足す（伏せ字・まとまり・重なりの確認）。同じ受け口・日付・本文のものは足さない
    function voiceAdd(d, raw, who) {
      const text = d.settings.mask ? voiceMask(raw.text) : String(raw.text || '');
      if (!text.trim()) return { ok: false, msg: '本文が空です' };
      const key = [raw.src, String(raw.at || '').slice(0, 10), voiceNormText(text).slice(0, 80)].join('|');
      if (d.items.some(function (x) { return [x.src, String(x.at || '').slice(0, 10), voiceNormText(x.text).slice(0, 80)].join('|') === key; })) return { ok: false, dup: true, msg: '同じものがもう入っています' };
      const kind = VOICE_KINDS.some(function (k) { return k.id === raw.kind; }) ? raw.kind : 'opinion';
      const rating = kind === 'review' && Number(raw.rating) >= 1 && Number(raw.rating) <= 5 ? Math.round(Number(raw.rating)) : null;
      const item = {
        id: 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        src: String(raw.src || ''), kind: kind, at: String(raw.at || new Date().toISOString().slice(0, 10)).slice(0, 16),
        product: String(raw.product || '').trim(), order: String(raw.order || '').trim(), nick: String(raw.nick || '').slice(0, 30),
        title: d.settings.mask ? voiceMask(raw.title) : String(raw.title || ''), text: text, rating: rating,
        status: 'new', reply: '', memo: '', topic: '', addedBy: who || '', addedAt: new Date().toISOString(), sample: !!raw.sample
      };
      d.items.push(item);
      if (kind === 'question') item.topic = voiceAutoTopic(d, item);
      return { ok: true, item: item };
    }
    // CSV（RMS・Yahoo・LINEなど、どこのCSVでも）の見出しから列を当てる
    const VOICE_COLS = {
      at: ['日付', '投稿日', '投稿日時', 'レビュー日', '受付日', '日時', 'date', 'created_at'],
      text: ['本文', 'レビュー本文', 'レビュー内容', 'コメント', '内容', '質問', '質問内容', '問い合わせ内容', 'メッセージ', 'text', 'body', 'comment'],
      title: ['タイトル', 'レビュータイトル', '件名', 'title', 'subject'],
      rating: ['評価', '総合評価', '星', '★', 'rating', 'score'],
      product: ['商品番号', '商品管理番号', '商品コード', '商品URL', 'item_code', 'code', 'sku'],
      order: ['注文番号', '受注番号', 'order_id'],
      nick: ['ニックネーム', '投稿者', 'レビュアー', 'nickname', 'name']
    };
    function voiceParseCsv(text) {
      const rows = []; let row = [], cell = '', q = false;
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else q = false; } else cell += ch; continue; }
        if (ch === '"') q = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
        else cell += ch;
      }
      if (cell !== '' || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
      return rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    }
    function voiceCsvItems(text, src, kind) {
      const rows = voiceParseCsv(String(text).replace(/^﻿/, ''));
      if (rows.length < 2) return { items: [], missing: ['本文'] };
      const head = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
      const col = {};
      Object.keys(VOICE_COLS).forEach(function (k) {
        const names = VOICE_COLS[k].map(function (x) { return x.toLowerCase(); });
        const i = head.findIndex(function (h) { return names.indexOf(h) >= 0; });
        col[k] = i >= 0 ? i : head.findIndex(function (h) { return names.some(function (n) { return h.indexOf(n) >= 0; }); });
      });
      if (col.text < 0) return { items: [], missing: ['本文'] };
      const items = rows.slice(1).map(function (r) {
        const g = function (k) { return col[k] >= 0 ? String(r[col[k]] || '').trim() : ''; };
        const at = g('at').replace(/\//g, '-').replace(/年|月/g, '-').replace(/日/, '');
        return { src: src, kind: kind, at: at, text: g('text'), title: g('title'), rating: parseFloat(g('rating').replace(/[^\d.]/g, '')) || null, product: g('product'), order: g('order'), nick: g('nick') };
      }).filter(function (x) { return x.text; });
      return { items: items, missing: [] };
    }
    // 口コミのまとめ（受け口ごと・商品ごとの件数と平均の評価）
    function voiceReviewSummary(d) {
      const reviews = d.items.filter(function (x) { return x.kind === 'review' && x.rating; });
      function agg(keyOf) {
        const m = {};
        reviews.forEach(function (x) { const k = keyOf(x) || '（なし）'; const a = m[k] || (m[k] = { key: k, n: 0, sum: 0, low: 0 }); a.n += 1; a.sum += x.rating; if (x.rating <= 2) a.low += 1; });
        return Object.keys(m).map(function (k) { const a = m[k]; return { key: k, n: a.n, avg: Math.round(a.sum / a.n * 10) / 10, low: a.low }; }).sort(function (a, b) { return b.n - a.n; });
      }
      return {
        total: reviews.length,
        avg: reviews.length ? Math.round(reviews.reduce(function (s, x) { return s + x.rating; }, 0) / reviews.length * 10) / 10 : 0,
        bySource: agg(function (x) { return x.src; }),
        byProduct: agg(function (x) { return x.product; }),
        lowOpen: d.items.filter(function (x) { return x.kind === 'review' && x.rating && x.rating <= 2 && x.status !== 'done'; })
      };
    }
    // よくある質問の書き出し（サイトのよくある質問のページに使う形）
    function voiceFaqExport(d) {
      return d.topics.filter(function (t) { return t.decision === 'in'; }).map(function (t) {
        return { id: t.id, q: t.faqQ || t.title, a: t.faqA || '', ready: !!(t.faqA && t.faqA.trim()), count: voiceTopicCount(d, t.id) };
      });
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { voiceEmpty: voiceEmpty, voiceNorm: voiceNorm, voiceMask: voiceMask, voiceSimilar: voiceSimilar, voiceAutoTopic: voiceAutoTopic, voiceCandidates: voiceCandidates, voiceDecide: voiceDecide, voiceAutoAdd: voiceAutoAdd, voiceAdd: voiceAdd, voiceParseCsv: voiceParseCsv, voiceCsvItems: voiceCsvItems, voiceReviewSummary: voiceReviewSummary, voiceFaqExport: voiceFaqExport, voiceTopicCount: voiceTopicCount };
