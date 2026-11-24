// Luna Luce OMS 部品JS: 57-image-words-tab（「11 画像の頼み方」タブ: 何の画像か → どこに使うか → ことばを選ぶ → 仕上がりの見本 → 指示文。計算は 56-image-words-model）
// 2.59 で追加。サイトビルダーの商品の編集画面の「この商品の画像の頼み方を作る」からも開ける（商品が入った状態で開く）。
    state.imgw = { words: null, error: '', kind: 'photo', use: 'item-main', picks: [], product: null, extra: '', q: '', store: null, adding: false, addImg: '', openSaved: '' };

    function imgwLoad() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(IMGW_STORE_KEY) || 'null'); } catch (e) { saved = null; }
      state.imgw.store = imgwNorm(saved);
      fetch('image-words/words.json').then(function (res) {
        if (!res.ok) throw new Error('image-words/words.json を読めません');
        return res.json();
      }).then(function (data) {
        state.imgw.words = data;
        if (!state.imgw.picks.length) state.imgw.picks = imgwUsePicks(imgwCats(), state.imgw.use);
        emit('oms:imgw');
      }).catch(function (err) { state.imgw.error = err.message; emit('oms:imgw'); });
    }
    function imgwStoreSave() {
      try { localStorage.setItem(IMGW_STORE_KEY, JSON.stringify(state.imgw.store)); return true; } catch (e) { showToast('このブラウザに保存できませんでした（足した写真が大きすぎるかもしれません）。'); return false; }
    }
    function imgwCats() { return imgwMerge(state.imgw.words, state.imgw.store); }
    function imgwWho() { return state.me ? state.me.display || state.me.name || '' : ''; }
    function imgwImgSrc(t) { return !t.img ? '' : /^data:/.test(t.img) ? t.img : 'image-words/' + t.img; }
    function imgwProductImg(p) { return p && p.image ? (typeof builderImg === 'function' ? builderImg(p.image) : '../' + p.image) : ''; }
    // ほかの画面（サイトビルダーの商品の編集）から、商品を入れて開く
    function imgwOpenFor(p) {
      const v = state.imgw;
      v.product = { id: p.id || '', code: p.code || '', title: p.title || '', image: p.image || (p.photos && p.photos[0]) || '' };
      if (v.use === 'free') v.use = 'item-main';
      v.kind = imgwUse(v.use).kind || v.kind;
      if (v.words) v.picks = imgwUsePicks(imgwCats(), v.use);
      switchTab('imgwords');
      emit('oms:imgw');
      window.scrollTo(0, 0);
    }
    function imgwCopy(text) {
      function done() { showToast('コピーしました。画像を作るAIや、頼む人に貼り付けてください。'); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); return; }
      fallback();
      function fallback() {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { showToast('コピーできませんでした。文を選んでコピーしてください。'); }
        ta.remove();
      }
    }
    // 足すことばの見本写真は、長い辺400pxに縮めてこのブラウザに置く
    function imgwShrink(file, cb) {
      const r = new FileReader();
      r.onload = function () {
        const im = new Image();
        im.onload = function () {
          const k = Math.min(1, 400 / Math.max(im.width, im.height));
          const c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          cb(c.toDataURL('image/jpeg', 0.8));
        };
        im.onerror = function () { showToast('この画像は読めませんでした。'); };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    }

    function renderImageWordsTab(host) {
      function productBox() {
        const v = state.imgw;
        const p = v.product;
        const chosen = p ? '<div class="iw-product is-on"><span class="iw-pimg">' + (imgwProductImg(p) ? '<img src="' + escapeHtml(imgwProductImg(p)) + '" alt="">' : '') + '</span><span class="iw-pname"><b>' + escapeHtml(p.title) + '</b><small>' + escapeHtml(p.code || '') + '</small><small>この写真を、指示文と一緒にAIへ渡します（形・色を合わせるため）</small></span><button type="button" data-iw="product-clear">ほかの商品にする</button></div>' : '';
        return '<section class="iw-box"><h3><span class="iw-step">1</span>何の画像？</h3>' + chosen +
          (p ? '' : '<p class="muted">商品を選ぶと、商品名が指示文に入り、商品の写真を「この商品で」と渡せます。商品を決めずに作ることもできます。</p>' +
            '<input type="search" placeholder="商品名・商品コードで探す" value="' + escapeHtml(v.q) + '" data-iw-q="1" aria-label="商品を探す"><ul class="iw-results" data-iw-results="1">' + resultsHtml() + '</ul>') + '</section>';
      }
      function resultsHtml() {
        const v = state.imgw;
        const list = state.builder && state.builder.products || [];
        if (!list.length) return '<li class="muted">商品の一覧を読み込み中…</li>';
        const q = v.q.trim();
        const hits = (q ? list.filter(function (p) { return fuzzyMatch(p.title + ' ' + p.code, q); }) : list.filter(function (p) { return p.lead; }).concat(list)).slice(0, 6);
        if (!hits.length) return '<li class="muted">見つかりません。言葉を短くしてみてください。</li>';
        return hits.map(function (p) {
          return '<li><button type="button" data-iw="product" data-id="' + escapeHtml(p.id) + '"><span class="iw-pimg">' + (p.image ? '<img src="' + escapeHtml(imgwProductImg(p)) + '" alt="" loading="lazy">' : '') + '</span><span class="iw-pname"><b>' + escapeHtml(p.title) + '</b><small>' + escapeHtml(p.code || '') + '</small></span></button></li>';
        }).join('');
      }
      function useBox() {
        const v = state.imgw;
        return '<section class="iw-box"><h3><span class="iw-step">2</span>どこに使う？</h3><p class="muted">選ぶと、画面の形とおすすめのことばが入ります。あとから自由に変えられます。</p><div class="iw-uses">' +
          IMGW_USES.map(function (u) {
            const k = u.kind ? IMGW_KINDS[u.kind].jp : '';
            return '<button type="button" data-iw="use" data-id="' + u.id + '" aria-pressed="' + (v.use === u.id) + '"><b>' + escapeHtml(u.label) + '</b>' + (u.ratio || k ? '<small>' + escapeHtml([k, u.ratio].filter(Boolean).join('・')) + '</small>' : '') + '</button>';
          }).join('') + '</div></section>';
      }
      function termCard(t, sec) {
        const v = state.imgw;
        const on = v.picks.indexOf(t.id) >= 0;
        const src = imgwImgSrc(t);
        return '<li class="iw-term' + (t.wide ? ' is-wide' : '') + (on ? ' is-on' : '') + '"><button type="button" class="iw-pick" data-iw="pick" data-id="' + escapeHtml(t.id) + '" aria-pressed="' + on + '">' +
          '<span class="iw-thumb">' + (src ? '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(t.name) + 'の見本" loading="lazy">' : '<span class="iw-noimg">見本なし</span>') + (on ? '<i class="iw-check" aria-hidden="true">✓</i>' : '') + '</span>' +
          '<span class="iw-tname">' + escapeHtml(t.name) + (t.custom ? '<em>お店で足した</em>' : '') + '</span><span class="iw-blurb">' + escapeHtml(t.blurb || '') + '</span><span class="iw-say">「' + escapeHtml(t.say || '') + '」</span></button>' +
          (t.custom ? '<button type="button" class="iw-del" data-iw="custom-del" data-id="' + escapeHtml(t.id) + '">このことばを消す</button>' : '') + '</li>';
      }
      function wordsBox(cats) {
        const v = state.imgw;
        const cat = imgwFindCat(cats, v.kind) || cats[0];
        const tabs = '<div class="iw-kinds" role="tablist">' + cats.map(function (c) {
          const n = c.sections.reduce(function (a, s) { return a + s.terms.length; }, 0);
          return '<button type="button" role="tab" data-iw="kind" data-id="' + c.id + '" aria-selected="' + (c.id === cat.id) + '">' + escapeHtml(c.name) + '<small>' + n + '</small></button>';
        }).join('') + '</div>';
        const combos = cat.combos.length ? '<div class="iw-combos"><p class="iw-sub">おすすめの組み合わせ（押すと、まとめて選びます）</p>' + cat.combos.map(function (co, i) {
          return '<button type="button" data-iw="combo" data-i="' + i + '" title="' + escapeHtml(co.text) + '">' + escapeHtml(co.title) + '</button>';
        }).join('') + '</div>' : '';
        const secs = cat.sections.map(function (s) {
          const multi = IMGW_MULTI.indexOf(s.id) >= 0;
          return '<section class="iw-sec"><h4>' + escapeHtml(s.title) + '<small>' + (multi ? 'いくつでも' : '1つ選ぶ（もう一度押すと外れます）') + '</small></h4>' + (s.note ? '<p class="muted">' + escapeHtml(s.note) + '</p>' : '') +
            '<ul class="iw-terms">' + s.terms.map(function (t) { return termCard(t, s); }).join('') + '</ul></section>';
        }).join('');
        return '<section class="iw-box"><h3><span class="iw-step">3</span>ことばを選ぶ</h3><p class="muted">' + escapeHtml(cat.intro) + '</p>' + tabs + combos + secs + addBox(cat) + '</section>';
      }
      function addBox(cat) {
        const v = state.imgw;
        if (!v.adding) return '<p class="iw-addrow"><button type="button" data-iw="add-open">＋ お店のことばを足す（' + escapeHtml(cat.name) + '）</button></p>';
        return '<section class="iw-add"><h4>お店のことばを足す</h4><p class="muted">よく使う言い方を足しておくと、次から選ぶだけで使えます。見本の写真は、うまくいった画像を入れるとわかりやすくなります。</p>' +
          '<div class="iw-grid"><label>どの段に足す <select data-iw-f="sec">' + cat.sections.map(function (s) { return '<option value="' + s.id + '">' + escapeHtml(s.title) + '</option>'; }).join('') + '</select></label>' +
          '<label>ことばの名前 <input type="text" maxlength="20" data-iw-f="name" placeholder="例: ゴールドの縁取り"></label>' +
          '<label>どんな感じか <input type="text" maxlength="80" data-iw-f="blurb" placeholder="例: 縁を細い金色で囲む"></label>' +
          '<label>例の言い方 <input type="text" maxlength="60" data-iw-f="say" placeholder="例: 縁を細い金色で囲んで"></label>' +
          '<label>英語のことば（あれば） <input type="text" maxlength="80" data-iw-f="en" placeholder="例: thin gold border"></label>' +
          '<label class="iw-file">見本の写真（あれば）<input type="file" accept="image/jpeg,image/png,image/webp" data-iw-file="1">' + (v.addImg ? '<img src="' + escapeHtml(v.addImg) + '" alt="">' : '') + '</label></div>' +
          '<p class="iw-acts"><button type="button" class="primary" data-iw="add-save">足す</button><button type="button" data-iw="add-cancel">やめる</button></p></section>';
      }
      function resultBox(cats) {
        const v = state.imgw;
        const out = imgwCompose(cats, { kind: v.kind, use: v.use, picks: v.picks, product: v.product, extra: v.extra });
        const picked = v.picks.map(function (id) { return imgwTerm(cats, id); }).filter(Boolean);
        const preview = picked.length ? '<ul class="iw-preview">' + picked.map(function (x) {
          const src = imgwImgSrc(x.term);
          return '<li' + (x.term.wide ? ' class="is-wide"' : '') + '>' + (src ? '<img src="' + escapeHtml(src) + '" alt="">' : '<span class="iw-noimg">見本なし</span>') + '<span>' + escapeHtml(x.secTitle) + '：' + escapeHtml(x.term.name) + '</span><button type="button" data-iw="pick" data-id="' + escapeHtml(x.term.id) + '" aria-label="' + escapeHtml(x.term.name) + 'を外す">×</button></li>';
        }).join('') + '</ul><p class="muted">見本はクリームの箱で作ったイメージです。角度・光・背景などの「感じ」を見比べてください。実際の商品は、1で選んだ商品の写真で作ります。</p>' : '<p class="muted">左でことばを選ぶと、ここに見本が並びます。</p>';
        return '<section class="iw-box iw-result"><h3><span class="iw-step">4</span>仕上がりの見本</h3>' + preview +
          '<label class="iw-extra">足したいこと（自由に） <textarea rows="2" maxlength="300" data-iw-extra="1" placeholder="例: リボンはゴールド。名入れの部分が見えるように">' + escapeHtml(v.extra) + '</textarea></label>' +
          '<h3><span class="iw-step">5</span>できた指示文</h3>' +
          '<p class="iw-sub">日本語（人に頼むとき・日本語がわかるAIに）</p><pre class="iw-out" data-iw-jp="1">' + escapeHtml(out.jp) + '</pre>' +
          '<p class="iw-sub">英語（画像を作るAIに。こちらの方が思いどおりになりやすい）</p><pre class="iw-out iw-en" data-iw-en="1">' + escapeHtml(out.en) + '</pre>' +
          '<div class="iw-acts"><button type="button" class="primary" data-iw="copy-jp">日本語をコピー</button><button type="button" class="primary" data-iw="copy-en">英語をコピー</button><button type="button" data-iw="copy-both">両方をコピー</button><button type="button" data-iw="save"' + (out.count ? '' : ' disabled') + '>この頼み方を保存</button><button type="button" data-iw="reset">選んだことばを外す</button></div>' +
          (v.product ? '<p class="muted">AIに渡すときは、この指示文と一緒に「' + escapeHtml(v.product.title) + '」の写真（1で出ている写真）も添えてください。</p>' : '') +
          savedBox() + '</section>';
      }
      function savedBox() {
        const v = state.imgw, list = v.store.saved;
        if (!list.length) return '<h3 class="iw-savedh">保存した頼み方</h3><p class="muted">まだありません。うまくいった頼み方を保存しておくと、次の商品でも同じ感じで作れます。</p>';
        return '<h3 class="iw-savedh">保存した頼み方 <small>' + list.length + '件・このブラウザに保存</small></h3><ul class="iw-saved">' + list.slice(0, 30).map(function (s) {
          return '<li><div><b>' + escapeHtml(s.product ? s.product.title : '商品なし') + '</b><small>' + escapeHtml(imgwUse(s.use).label + '・' + (IMGW_KINDS[s.kind] ? IMGW_KINDS[s.kind].jp : '') + '・' + String(s.at || '').slice(0, 16).replace('T', ' ') + (s.who ? '・' + s.who : '')) + '</small></div>' +
            '<span><button type="button" data-iw="saved-open" data-id="' + s.id + '">開く</button><button type="button" data-iw="saved-del" data-id="' + s.id + '">消す</button></span></li>';
        }).join('') + '</ul>';
      }
      function paint() {
        const v = state.imgw;
        if (!v.store) imgwLoad();
        const head = '<section class="iw-head"><p class="kicker">Image words</p><h2>画像の頼み方（指示ことば）</h2><p class="lead">商品写真・動画・イラスト・図解・SNS画像・画面を作るとき、ことばと見本を見ながら選ぶと、そのまま渡せる指示文ができます。画像はここでは作りません（できた文を画像を作るAIや、撮影・制作をお願いする人に渡します）。</p></section>';
        if (!v.words) { host.innerHTML = head + '<p class="muted">' + escapeHtml(v.error || 'ことばを読み込み中…') + '</p>'; return; }
        const cats = imgwCats();
        host.innerHTML = head + '<div class="iw-cols"><div class="iw-main">' + productBox() + useBox() + wordsBox(cats) + '</div><aside class="iw-side">' + resultBox(cats) + '</aside></div>';
      }
      function act(name, el) {
        const v = state.imgw;
        const cats = imgwCats();
        const id = el.dataset.id;
        if (name === 'product') { const p = (state.builder.products || []).filter(function (x) { return String(x.id) === id; })[0]; if (p) v.product = { id: p.id, code: p.code, title: p.title, image: p.image }; v.q = ''; }
        if (name === 'product-clear') v.product = null;
        if (name === 'use') { v.use = id; const u = imgwUse(id); if (u.kind) v.kind = u.kind; v.picks = imgwUsePicks(cats, id); }
        if (name === 'kind') { if (v.kind !== id) { v.kind = id; v.picks = []; v.adding = false; if (imgwUse(v.use).kind && imgwUse(v.use).kind !== id) v.use = 'free'; } }
        if (name === 'pick') v.picks = imgwToggle(v.picks, cats, id);
        if (name === 'combo') { const cat = imgwFindCat(cats, v.kind); const co = cat.combos[Number(el.dataset.i)]; v.picks = imgwComboPicks(cat, co.text); showToast('「' + co.title + '」のことばを選びました。'); }
        if (name === 'reset') v.picks = [];
        if (name === 'copy-jp' || name === 'copy-en' || name === 'copy-both') {
          const out = imgwCompose(cats, { kind: v.kind, use: v.use, picks: v.picks, product: v.product, extra: v.extra });
          imgwCopy(name === 'copy-jp' ? out.jp : name === 'copy-en' ? out.en : out.jp + '\n\n' + out.en); return;
        }
        if (name === 'save') {
          const out = imgwCompose(cats, { kind: v.kind, use: v.use, picks: v.picks, product: v.product, extra: v.extra });
          imgwSaveEntry(v.store, { at: new Date().toISOString(), who: imgwWho(), kind: v.kind, use: v.use, picks: v.picks.slice(), product: v.product, extra: v.extra, jp: out.jp, en: out.en });
          if (imgwStoreSave()) showToast('保存しました。下の「保存した頼み方」から開けます。');
        }
        if (name === 'saved-open') { const s = v.store.saved.filter(function (x) { return x.id === id; })[0]; if (s) { v.kind = s.kind; v.use = s.use; v.picks = s.picks.slice(); v.product = s.product; v.extra = s.extra || ''; window.scrollTo(0, 0); } }
        if (name === 'saved-del') { v.store.saved = v.store.saved.filter(function (x) { return x.id !== id; }); imgwStoreSave(); }
        if (name === 'add-open') { v.adding = true; v.addImg = ''; }
        if (name === 'add-cancel') { v.adding = false; v.addImg = ''; }
        if (name === 'add-save') {
          const f = {};
          host.querySelectorAll('[data-iw-f]').forEach(function (x) { f[x.dataset.iwF] = x.value; });
          f.img = v.addImg; f.by = imgwWho(); f.at = new Date().toISOString();
          const errs = imgwCustomCheck(f);
          if (errs.length) { showToast(errs[0]); return; }
          const t = imgwCustomAdd(v.store, f);
          if (!imgwStoreSave()) { v.store.custom.pop(); return; }
          v.adding = false; v.addImg = ''; v.picks = imgwToggle(v.picks, imgwCats(), t.id);
          showToast('「' + t.name + '」を足して、選んだ状態にしました。');
        }
        if (name === 'custom-del') { v.store.custom = v.store.custom.filter(function (x) { return x.id !== id; }); v.picks = v.picks.filter(function (p) { return p !== id; }); imgwStoreSave(); }
        emit('oms:imgw');
      }
      host.addEventListener('click', function (event) {
        const el = event.target.closest('[data-iw]');
        if (el && host.contains(el)) act(el.dataset.iw, el);
      });
      host.addEventListener('input', function (event) {
        const el = event.target;
        if (el.dataset.iwQ) { state.imgw.q = el.value; const ul = host.querySelector('[data-iw-results]'); if (ul) ul.innerHTML = resultsHtml(); }
        if (el.dataset.iwExtra) {
          const v = state.imgw;
          v.extra = el.value;
          const out = imgwCompose(imgwCats(), { kind: v.kind, use: v.use, picks: v.picks, product: v.product, extra: v.extra });
          host.querySelector('[data-iw-jp]').textContent = out.jp;
          host.querySelector('[data-iw-en]').textContent = out.en;
        }
      });
      host.addEventListener('change', function (event) {
        const el = event.target;
        if (el.dataset.iwFile && el.files && el.files[0]) imgwShrink(el.files[0], function (url) { state.imgw.addImg = url; const lab = el.closest('.iw-file'); let im = lab.querySelector('img'); if (!im) { im = document.createElement('img'); lab.appendChild(im); } im.src = url; });
      });
      paint();
      on('oms:imgw', paint);
      on('oms:builder', function () { if (state.imgw.words && !state.imgw.product) { const ul = host.querySelector('[data-iw-results]'); if (ul) ul.innerHTML = resultsHtml(); } });
    }
