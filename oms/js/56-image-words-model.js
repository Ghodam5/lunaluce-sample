// Luna Luce OMS 部品JS: 56-image-words-model（「11 画像の頼み方」の計算: ことばの読み込み・使う場所・選び方・指示文づくり。画面は 57-image-words-tab）
// 2.59 で追加（林さんの「指示ことば見本帳」をもとに）。ことばと見本画像は oms/image-words/（words.json・img/）。
//   words.json は tools/image-words.py が見本帳のHTMLから作る（直接編集しない）。お店で足したことばは、この画面の「ことばを足す」で足す。
// 選ぶ → 見本で仕上がりを確かめる → 日本語の指示文（人や日本語のAIに渡す）と英語の指示文（画像を作るAIに渡す）ができる。
// 保存はまだこのブラウザ（localStorage）。共有する前にサーバーへ移す。
    const IMGW_STORE_KEY = 'luna-oms-image-words-v1';
    // 1つしか選べない段と、いくつでも選べる段（飾り・画面の部品・動き・カルーセルの工夫）
    const IMGW_MULTI = ['photo-props', 'slides-carousel', 'app-parts', 'app-parts2', 'app-motion'];
    // 種類ごとの、指示文の頭と守ること
    const IMGW_KINDS = {
      photo: { jp: '商品写真', en: 'Product photograph', rules: ['商品は添付の写真と同じ物にする（形・色・名入れの文字・ロゴを変えない）', '画像の中に文字やすかしを入れない'], enRules: ['Keep the product exactly as in the attached reference photo: same shape, colors, printed names and logo.', 'No text, no watermark, no extra logos.'] },
      video: { jp: '商品の動画', en: 'Short product video', rules: ['商品は添付の写真と同じ物にする（形・色・名入れの文字・ロゴを変えない）', '音楽や文字は後から入れるので、映像だけで'], enRules: ['Keep the product exactly as in the attached reference photo.', 'Video only, no on-screen text or music.'] },
      illustration: { jp: 'イラスト', en: 'Illustration', rules: ['実物の写真と間違えない、絵とわかる仕上がりにする'], enRules: ['Clearly an illustration, not a photo.'] },
      slides: { jp: '図解・スライド', en: 'Infographic slide design', rules: ['文字は後から入れるので、文字の場所は灰色の帯でよい'], enRules: ['Use grey placeholder bars for body text.'] },
      sns: { jp: 'SNS投稿画像・バナー', en: 'Social media post image', rules: ['文字は後から入れるので、文字の場所を空けておく（AIに文字を書かせると崩れやすい）'], enRules: ['Leave clean space for text; do not render text.'] },
      app: { jp: 'アプリ・Web画面の見本', en: 'App / web UI mockup', rules: ['ほかのお店の画面をまねない', '本文は灰色の帯でよい'], enRules: ['Original layout, do not copy any existing brand.', 'Grey placeholder bars for body text.'] }
    };
    // どこに使うか（選ぶと、種類・画面の形・おすすめのことばが入る）。picks は「段の番号:ことばの名前」
    const IMGW_USES = [
      { id: 'item-main', label: '商品ページの1枚目', kind: 'photo', ratio: '正方形 1:1', enRatio: 'square 1:1 aspect ratio', picks: ['photo-angle:俯瞰45度', 'photo-composition:中央', 'photo-background:白背景', 'photo-light:やわらかい光', 'photo-mood:明るい'], rules: ['一覧の小さい画像でも商品がわかるように、商品を大きめに'] },
      { id: 'item-scene', label: '商品ページの2枚目から（使う場面）', kind: 'photo', ratio: '正方形 1:1', enRatio: 'square 1:1 aspect ratio', picks: ['photo-angle:目線の高さ', 'photo-light:自然光の窓辺', 'photo-background:木のテーブル', 'photo-props:花', 'photo-mood:あたたか'], rules: [] },
      { id: 'sign', label: 'トップの看板（横長・文字は後から）', kind: 'photo', ratio: '横長 16:9', enRatio: 'wide 16:9 aspect ratio', picks: ['photo-angle:俯瞰45度', 'photo-composition:左寄せ右に余白', 'photo-background:大理石', 'photo-light:やわらかい光', 'photo-mood:上品'], rules: ['右側に見出しを入れるので、右の3分の1は何も置かない'], enRules: ['Keep the right third empty for a headline.'] },
      { id: 'mall', label: '楽天・Yahooの1枚目', kind: 'photo', ratio: '正方形 1:1', enRatio: 'square 1:1 aspect ratio', picks: ['photo-angle:俯瞰45度', 'photo-composition:中央', 'photo-background:白背景', 'photo-light:やわらかい光'], rules: ['楽天の1枚目は、文字は画面の20%まで・枠線なし・背景は白か写真（モールの決まりは変わるので、出す前に「7 販路と価格」のモールの決まりで確かめる）'], enRules: ['Plain white or natural photo background, no frame, no text.'] },
      { id: 'insta-feed', label: 'Instagramのフィード投稿', kind: 'sns', ratio: '少し縦長 4:5', enRatio: '4:5 portrait aspect ratio', picks: ['sns-ratio:4:5', 'sns-eye:商品が主役', 'sns-margin:余白多め', 'sns-color:明るくやさしい', 'sns-textplace:下に帯を敷いて'], rules: [] },
      { id: 'story', label: 'ストーリー・リール（縦の動画）', kind: 'video', ratio: '縦長 9:16', enRatio: 'vertical 9:16 aspect ratio', picks: ['video-shape:縦型9:16', 'video-shape:短い（15秒まで）', 'video-shot:ミディアムショット', 'video-move:ドリーイン', 'video-mood:テンポよく'], rules: [] },
      { id: 'banner', label: '横長のバナー（セール・お知らせ）', kind: 'sns', ratio: '横長 16:9', enRatio: 'wide 16:9 aspect ratio', picks: ['sns-ratio:16:9', 'sns-color:暗い背景に白文字', 'sns-eye:数字を大きく', 'sns-textplace:空きに乗せる'], rules: [] },
      { id: 'free', label: '決めずに選ぶ', kind: '', ratio: '', enRatio: '', picks: [], rules: [] }
    ];

    function imgwEmpty() { return { custom: [], saved: [] }; }
    function imgwNorm(d) {
      const e = imgwEmpty();
      if (!d || typeof d !== 'object') return e;
      return { custom: Array.isArray(d.custom) ? d.custom : [], saved: Array.isArray(d.saved) ? d.saved : [] };
    }
    // 見本帳のことばに、お店で足したことばを混ぜる（足したことばは段の最後に並ぶ）
    function imgwMerge(words, store) {
      const cats = (words && words.categories || []).map(function (c) {
        return Object.assign({}, c, { sections: c.sections.map(function (s) { return Object.assign({}, s, { terms: s.terms.slice() }); }) });
      });
      (store && store.custom || []).forEach(function (t) {
        cats.forEach(function (c) { c.sections.forEach(function (s) { if (s.id === t.sec) s.terms.push(Object.assign({ custom: true }, t)); }); });
      });
      return cats;
    }
    function imgwFindCat(cats, kind) { return cats.filter(function (c) { return c.id === kind; })[0] || null; }
    function imgwAllTerms(cats) {
      const out = [];
      cats.forEach(function (c) { c.sections.forEach(function (s) { s.terms.forEach(function (t) { out.push({ cat: c.id, sec: s.id, secTitle: s.title, term: t }); }); }); });
      return out;
    }
    function imgwTerm(cats, id) { return imgwAllTerms(cats).filter(function (x) { return x.term.id === id; })[0] || null; }
    // 「段:名前」→ ことばの番号
    function imgwPickId(cats, key) {
      const i = key.indexOf(':');
      const sec = key.slice(0, i), name = key.slice(i + 1);
      const hit = imgwAllTerms(cats).filter(function (x) { return x.sec === sec && x.term.name === name; })[0];
      return hit ? hit.term.id : '';
    }
    // 選ぶ・外す。1つしか選べない段では、同じ段の別のことばを外す
    function imgwToggle(picks, cats, id) {
      const hit = imgwTerm(cats, id);
      if (!hit) return picks;
      const next = picks.slice();
      const at = next.indexOf(id);
      if (at >= 0) { next.splice(at, 1); return next; }
      if (IMGW_MULTI.indexOf(hit.sec) < 0) {
        return next.filter(function (p) { const h = imgwTerm(cats, p); return !h || h.sec !== hit.sec; }).concat([id]);
      }
      return next.concat([id]);
    }
    function imgwUse(id) { return IMGW_USES.filter(function (u) { return u.id === id; })[0] || IMGW_USES[IMGW_USES.length - 1]; }
    function imgwUsePicks(cats, useId) { return imgwUse(useId).picks.map(function (k) { return imgwPickId(cats, k); }).filter(Boolean); }
    // 「こう言えば伝わる」の組み合わせに出てくることばを選ぶ（名前か、例の言い方の頭が文に入っていれば）
    function imgwComboPicks(cat, text) {
      const t = String(text || '');
      let picks = [];
      const flat = imgwAllTerms([cat]);
      flat.forEach(function (x) {
        const name = x.term.name.replace(/（.*?）/g, '');
        const say = String(x.term.say || '').replace(/[、。].*$/, '').replace(/(で|して|に|を)$/, '');
        if (t.indexOf(name) >= 0 || (say.length >= 4 && t.indexOf(say) >= 0)) {
          const same = picks.filter(function (p) { const h = flat.filter(function (y) { return y.term.id === p; })[0]; return h && h.sec === x.sec; });
          // 1つしか選べない段は、長い名前（より詳しい方）を残す
          if (same.length && IMGW_MULTI.indexOf(x.sec) < 0) {
            const prev = flat.filter(function (y) { return y.term.id === same[0]; })[0];
            if (prev.term.name.length >= x.term.name.length) return;
            picks = picks.filter(function (p) { return p !== same[0]; });
          }
          picks.push(x.term.id);
        }
      });
      return picks;
    }
    // 例の言い方を、見本の「箱」から、作りたい商品のことばに置きかえる
    function imgwSay(term, noun) { return String(term.say || term.name).replace(/箱/g, noun || '商品'); }
    // 指示文を作る。sel = { kind, use, picks, product: {title, code}, extra }
    function imgwCompose(cats, sel) {
      const use = imgwUse(sel.use);
      const kind = IMGW_KINDS[sel.kind] || IMGW_KINDS.photo;
      const items = sel.picks.map(function (id) { return imgwTerm(cats, id); }).filter(Boolean);
      const p = sel.product || null;
      const name = p ? (p.title || '') + (p.code ? '（' + p.code + '）' : '') : '';
      const jp = [];
      jp.push('【つくるもの】' + kind.jp + (name ? '：ルナルーチェの「' + name + '」' : ''));
      if (use.id !== 'free') jp.push('【使う場所】' + use.label + (use.ratio ? '（' + use.ratio + '）' : ''));
      if (p && sel.kind !== 'app' && sel.kind !== 'slides') jp.push('【商品】添付の商品写真と同じ商品で作ってください。');
      if (items.length) {
        jp.push('【見え方】');
        items.forEach(function (x) { jp.push('・' + imgwSay(x.term, p ? '商品' : '') + '（' + x.term.name + '）'); });
      }
      if (sel.extra && sel.extra.trim()) jp.push('【足したいこと】' + sel.extra.trim());
      const rules = (p || sel.kind === 'photo' || sel.kind === 'video' ? kind.rules : kind.rules.filter(function (r) { return r.indexOf('添付の写真') < 0; })).concat(use.rules || []);
      if (rules.length) { jp.push('【守ること】'); rules.forEach(function (r) { jp.push('・' + r); }); }
      const en = [];
      en.push(kind.en + (p ? ' of a Japanese gift product ("' + (p.title || '') + '")' : '') + '.');
      const words = items.map(function (x) { return x.term.en; }).filter(Boolean);
      if (words.length) en.push(words.join(', ') + '.');
      if (use.enRatio) en.push(use.enRatio.charAt(0).toUpperCase() + use.enRatio.slice(1) + '.');
      if (sel.extra && sel.extra.trim()) en.push('Also: ' + sel.extra.trim());
      (p || sel.kind === 'photo' || sel.kind === 'video' ? kind.enRules : kind.enRules.filter(function (r) { return r.indexOf('reference') < 0; })).concat(use.enRules || []).forEach(function (r) { en.push(r); });
      return { jp: jp.join('\n'), en: en.join(' '), count: items.length };
    }
    // 保存する（新しいものが上）。同じ商品・同じ使う場所・同じ文は二重に残さない
    function imgwSaveEntry(store, entry) {
      const dup = store.saved.filter(function (s) { return s.jp === entry.jp; })[0];
      if (dup) return dup;
      const e = Object.assign({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }, entry);
      store.saved.unshift(e);
      if (store.saved.length > 200) store.saved.length = 200;
      return e;
    }
    // お店で足すことば。名前と例の言い方は必須
    function imgwCustomCheck(t) {
      const out = [];
      if (!String(t.name || '').trim()) out.push('ことばの名前を入れてください');
      if (!String(t.say || '').trim()) out.push('例の言い方を入れてください（「〜で撮って」など）');
      if (!t.sec) out.push('どの段に足すかを選んでください');
      return out;
    }
    function imgwCustomAdd(store, t) {
      const e = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), sec: t.sec, name: String(t.name).trim(), blurb: String(t.blurb || '').trim(), say: String(t.say).trim(), en: String(t.en || '').trim(), img: t.img || '', by: t.by || '', at: t.at || '' };
      store.custom.push(e);
      return e;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { IMGW_USES: IMGW_USES, IMGW_KINDS: IMGW_KINDS, imgwEmpty: imgwEmpty, imgwNorm: imgwNorm, imgwMerge: imgwMerge, imgwFindCat: imgwFindCat, imgwTerm: imgwTerm, imgwPickId: imgwPickId, imgwToggle: imgwToggle, imgwUsePicks: imgwUsePicks, imgwComboPicks: imgwComboPicks, imgwCompose: imgwCompose, imgwSaveEntry: imgwSaveEntry, imgwCustomCheck: imgwCustomCheck, imgwCustomAdd: imgwCustomAdd };
