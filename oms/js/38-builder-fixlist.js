// Luna Luce OMS 部品JS: 38-builder-fixlist（「直すところ」をどれの話か分かる形で出し、その場で開ける・作りかけのカードは消せる）
// 2.30 で追加。2.33 で「要確認」（oms/builder-checks.json。反映は止めない）を足した。直すところの文言は 19 の builderAllErrors と同じものを、カード・商品ごとにまとめて出す。
// 2.59 で、直すところ・要確認・試しに見るの各行から「直す」で編集欄へ飛び、「削除」（下書きの新規だけ）または「下書きの変更をやめる」（編集中の登録済み商品）を足した。
    // 作りかけのカード: 題名・一文・ボタン・商品・特集がどれも空（「＋ 商品」などを押しただけ）
    function builderCardIsBlank(card) {
      const filled = function (v) { return String(v || '').trim() !== ''; };
      if (filled(card.title) || filled(card.text) || filled(card.cta) || filled(card.href) || filled(card.image)) return false;
      if ((card.ids || []).some(filled)) return false;
      if ((card.tiles || []).length) return false;
      return true;
    }
    function builderCardLabel(card, i) {
      if ((card.title || '').trim()) return 'トップのカード「' + card.title.trim() + '」';
      return 'トップのカード ' + (i + 1) + '枚目（題名なし' + (builderCardIsBlank(card) ? '・中身が空の作りかけ' : '') + '）';
    }
    // 空の新規は「（名前なしの新しい商品）」。編集中で名前が無いときも分かるようにする。
    function builderProductLabel(p) {
      if (!p) return '（名前なしの新しい商品）';
      const title = String(p.title || '').trim();
      if (p.edit) return title ? '編集中の商品「' + title + '」' : '編集中の商品（名前なし）';
      if (title) return '新しい商品「' + title + '」';
      return '（名前なしの新しい商品）';
    }
    function builderProductShortName(p) {
      const title = p && String(p.title || '').trim();
      return title || '（名前なしの新しい商品）';
    }
    // エラー文言から、編集欄のどこを目立たせるか
    function builderFixField(err) {
      const e = String(err || '');
      if (/商品名|題名が空/.test(e)) return 'title';
      if (/商品コード/.test(e)) return 'code';
      if (/画像を選ぶ|写真/.test(e)) return 'photos';
      if (/価格/.test(e)) return 'price';
      if (/カテゴリー/.test(e)) return 'places';
      if (/商品の説明/.test(e)) return 'description';
      if (/お届けまでの日数/.test(e)) return 'delivery';
      if (/入荷予定日/.test(e)) return 'eta';
      if (/税率/.test(e)) return 'tax';
      return '';
    }
    // 「そのほか」の一文から、左の一覧のどの項目を開くか
    function builderFixOtherTarget(err) {
      const e = String(err || '');
      if (/^営業日:/.test(e)) return { type: 'days', index: 0, label: '営業日' };
      if (/^お店の案内|^セット商品|税率表|の税率/.test(e)) return { type: 'store', index: 0, label: 'お店の案内・送料・税率', focus: /税率/.test(e) ? 'tax' : '' };
      if (/^注意事項の定型文/.test(e)) return { type: 'notes', index: 0, label: '注意事項の定型文' };
      if (/^トップの商品の段/.test(e)) return { type: 'sections', index: 0, label: 'トップの商品の段' };
      if (/^お知らせ本文/.test(e)) return { type: 'news', index: 0, label: 'お知らせ本文' };
      if (/^企画「/.test(e)) return { type: 'plan', index: 0, label: '企画', planName: (e.match(/^企画「([^」]*)」/) || [])[1] };
      if (/販売期間/.test(e)) return { type: 'stock', index: 0, label: '在庫と出店' };
      if (/^テーマ /.test(e)) return { type: 'theme', index: 0, label: '色のテーマ' };
      if (/カテゴリーの名前|商品が入っているので消せません|新しいカテゴリー/.test(e)) return { type: 'cats', index: 0, label: 'カテゴリー' };
      if (/表示する文字|見出し・ボタン/.test(e)) return { type: 'texts', index: 0, label: '表示する文字' };
      if (/在庫|builder-products\.json/.test(e)) return { type: 'stock', index: 0, label: '在庫と出店' };
      if (/流れる文言|お知らせ:/.test(e)) return { type: 'ticker', index: 0, label: '流れる文言' };
      return { type: 'reflect', index: 0, label: 'そのほか' };
    }
    // 試しに見るの1行から、下書きの商品（または登録済み商品の編集）を探す。本番データは消さない。
    function builderFixTargetFromItem(item) {
      const b = state.builder;
      const code = String((item && item.code) || '').trim();
      const title = String((item && item.title) || '').trim();
      if (!code && !title) {
        const i = b.newProducts.findIndex(function (p) { return !p.edit && builderProductBlank(p); });
        if (i >= 0) return { type: 'product', index: i, draftOnly: true };
        return { type: 'stock', index: 0 };
      }
      let i = b.newProducts.findIndex(function (p) { return code && String(p.code || '').trim() === code; });
      if (i < 0 && title) i = b.newProducts.findIndex(function (p) { return String(p.title || '').trim() === title; });
      if (i >= 0) return { type: 'product', index: i, draftOnly: !b.newProducts[i].edit };
      const catalog = (b.products || []).find(function (p) { return (code && p.code === code) || (title && p.title === title); });
      if (catalog) return { type: 'product-edit', id: String(catalog.id), draftOnly: false };
      return { type: 'stock', index: 0 };
    }
    function builderFixJumpBtn(sel, focus, label) {
      if (!sel) return '';
      const lab = label || '直す';
      if (sel.type === 'product-edit' && sel.id) return '<button type="button" data-b="fix-jump" data-type="product-edit" data-id="' + escapeHtml(String(sel.id)) + '"' + (focus ? ' data-focus="' + escapeHtml(focus) + '"' : '') + '>' + escapeHtml(lab) + '</button>';
      if (!sel.type) return '';
      return '<button type="button" data-b="fix-jump" data-type="' + escapeHtml(sel.type) + '" data-index="' + escapeHtml(String(sel.index || 0)) + '"' + (focus ? ' data-focus="' + escapeHtml(focus) + '"' : '') + '>' + escapeHtml(lab) + '</button>';
    }
    function builderFixDelBtn(p, index) {
      if (!p) return '';
      if (!p.edit) return '<button type="button" class="danger" data-b="fix-product-del" data-index="' + index + '">削除</button>';
      return '<button type="button" data-b="fix-product-revert" data-index="' + index + '">下書きの変更をやめる</button>';
    }
    // カード・商品ごとにまとめる。お知らせ・営業日などは種類ごとにまとめ、それぞれ「直す」を付ける
    function builderFixGroups() {
      const b = state.builder;
      const groups = [];
      b.newProducts.forEach(function (p, i) {
        const errs = builderProductErrors(p);
        if (errs.length) groups.push({ label: builderProductLabel(p), sel: { type: 'product', index: i }, errs: errs, product: p, productIndex: i, blank: !p.edit && builderProductBlank(p) });
      });
      b.cards.forEach(function (card, i) {
        const errs = builderCardErrors(card);
        if (errs.length) groups.push({ label: builderCardLabel(card, i), sel: { type: 'card', index: i }, errs: errs, blank: builderCardIsBlank(card), cardIndex: i });
      });
      const used = {};
      groups.forEach(function (g) { used[g.label] = true; });
      const others = builderAllErrors().filter(function (e) {
        return !/^(編集中の商品|新しい商品|（名前なしの新しい商品）)/.test(e) && !b.cards.some(function (c) { return e.indexOf((c.title || '題名なしのカード') + ': ') === 0; });
      });
      const buckets = {};
      others.forEach(function (e) {
        const t = builderFixOtherTarget(e);
        let key = t.type;
        if (t.type === 'plan' && t.planName) {
          const i = (b.plans || []).findIndex(function (p) { return p.name === t.planName; });
          if (i >= 0) { t.index = i; key = 'plan:' + i; }
        }
        if (t.type === 'theme') {
          const m = e.match(/^テーマ (.+): /);
          if (m) {
            const i = b.themes.findIndex(function (x) { return (x.name || x.id) === m[1]; });
            if (i >= 0) { t.index = i; key = 'theme:' + i; t.label = 'テーマ「' + m[1] + '」'; }
          }
        }
        if (!buckets[key]) buckets[key] = { label: t.label, sel: { type: t.type, index: t.index }, focus: t.focus || '', errs: [] };
        buckets[key].errs.push(e);
      });
      Object.keys(buckets).forEach(function (k) { groups.push(buckets[k]); });
      return groups;
    }
    function builderFixListHtml() {
      const groups = builderFixGroups();
      const total = groups.reduce(function (n, g) { return n + g.errs.length; }, 0);
      if (!total) return '<div class="pv-check"><b>確認OK</b></div>';
      const blanks = groups.filter(function (g) { return g.blank; }).length;
      return '<div class="pv-check is-bad"><b>直すところ ' + total + '件</b>' +
        (blanks ? '<p class="fix-hint">「（名前なしの新しい商品）」や「中身が空の作りかけ」は、足したまま中身を書いていない下書きです。使わないなら「削除」で下書きから消せます（本店の商品は消えません。「↶ 元に戻す」で戻せます）。</p>' : '<p class="fix-hint">「直す」を押すと、該当の編集欄を開いて目印を付けます。まだ本店に出していない新しい商品だけ「削除」できます。</p>') +
        '<ol class="fix-groups">' + groups.map(function (g) {
          const tools = (g.sel ? builderFixJumpBtn(g.sel, g.focus) : '') +
            (g.product ? builderFixDelBtn(g.product, g.productIndex) : '') +
            (g.blank && g.cardIndex != null ? '<button type="button" class="danger" data-b="fix-card-del" data-index="' + g.cardIndex + '">削除</button>' : '');
          return '<li><div class="fix-head"><b>' + escapeHtml(g.label) + '</b><span class="fix-n">' + g.errs.length + '件</span>' + (tools ? '<span class="fix-tools">' + tools + '</span>' : '') + '</div>' +
            '<ul>' + g.errs.slice(0, 8).map(function (e) {
              const field = builderFixField(e);
              return '<li class="fix-line"><span>' + escapeHtml(e) + '</span>' + (g.sel ? builderFixJumpBtn(g.sel, field || g.focus) : '') + '</li>';
            }).join('') + (g.errs.length > 8 ? '<li>ほか' + (g.errs.length - 8) + '件</li>' : '') + '</ul></li>';
        }).join('') + '</ol></div>';
    }

    // 要確認（oms/builder-checks.json）。反映は止めない。「確認した」はこのブラウザに覚える
    const CHECKS_DONE_KEY = 'luna-oms-builder-checks-done';
    let builderChecksList = [];
    function builderChecksDone() { try { return JSON.parse(localStorage.getItem(CHECKS_DONE_KEY) || '{}') || {}; } catch (e) { return {}; } }
    function builderChecksOpen() { const done = builderChecksDone(); return builderChecksList.filter(function (c) { return !done[c.id]; }); }
    function builderChecksLoad() {
      fetch('builder-checks.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        builderChecksList = d && Array.isArray(d.checks) ? d.checks.filter(function (c) { return c && c.id && c.text; }) : [];
        if (builderChecksList.length) emit('oms:builder', { form: false });
      }).catch(function () { /* 無くても動く */ });
    }
    function builderChecksHtml() {
      const list = builderChecksOpen();
      const dyn = typeof builderStoreChecks === 'function' ? builderStoreChecks() : []; // 2.36 セット商品の税率・税率表（41-builder-store。直すと消える）
      if (!list.length && !dyn.length) return '';
      return '<div class="pv-check is-warn"><b>要確認 ' + (list.length + dyn.length) + '件</b><p class="fix-hint">反映は止めません。「直す」で該当の編集欄を開きます。決まったら直して「確認した」を押してください。本店の商品そのものは、ここでは消しません。</p><ol class="fix-groups">' + list.map(function (c) {
        const jump = c.productId ? builderFixJumpBtn({ type: 'product-edit', id: String(c.productId) }, 'price') : '';
        return '<li><div class="fix-head"><b>' + escapeHtml(c.title || c.productId || '') + '</b>' + (c.productId ? '<span class="fix-n">商品 ' + escapeHtml(c.productId) + '</span>' : '') +
          '<span class="fix-tools">' + jump + (c.url ? '<a class="btn-link" href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener">本店で見る</a>' : '') + '<button type="button" data-b="check-done" data-id="' + escapeHtml(c.id) + '">確認した</button></span></div><p>' + escapeHtml(c.text) + '</p></li>';
      }).join('') + dyn.map(function (c) {
        return '<li><div class="fix-head"><b>' + (c.id === 'store-sets' ? 'セット商品の税率（税理士さんに確認）' : '税率表') + '</b><span class="fix-tools">' + builderFixJumpBtn({ type: 'store', index: 0 }, 'tax') + '</span></div><p>' + escapeHtml(c.text) + '</p></li>';
      }).join('') + '</ol></div>';
    }
    function builderFixItemTools(item) {
      const sel = builderFixTargetFromItem(item);
      const tools = builderFixJumpBtn(sel, builderFixField((item.changes || []).join(' ')));
      const p = sel.type === 'product' ? state.builder.newProducts[sel.index] : null;
      return '<span class="fix-tools">' + tools + (p ? builderFixDelBtn(p, sel.index) : '') + '</span>';
    }
    function builderJumpTo(sel, focus) {
      const b = state.builder;
      if (!sel || !sel.type) return;
      if (sel.type === 'product-edit' && sel.id) {
        builderOpenEdit(sel.id);
      } else {
        b.linkOpen = '';
        b.sel = { type: sel.type, index: Number(sel.index || 0) };
        b.query = {};
        b.slotSwap = null;
        if (sel.type === 'product') b.stockDetail = '';
        emit('oms:builder', { form: true });
      }
      setTimeout(function () {
        const ed = document.querySelector('[data-part="builder-editor"]');
        if (!ed) { builderScrollToEditor(); return; }
        const key = focus || '';
        let target = null;
        if (key) {
          target = ed.querySelector('[data-jump="' + key + '"]') ||
            ed.querySelector('[data-f="' + key + '"]') ||
            (key === 'price' ? ed.querySelector('[data-f="skus.0.price"]') : null) ||
            (key === 'delivery' ? ed.querySelector('[data-dl="min"]') : null) ||
            (key === 'eta' ? ed.querySelector('[data-f="stock.eta"]') : null);
          if (target && target.closest) target = target.closest('[data-jump], .fld, .code-block, h3') || target;
        }
        if (!target) target = ed;
        document.querySelectorAll('.is-jump').forEach(function (el) { el.classList.remove('is-jump'); });
        target.classList.add('is-jump');
        const top = target.getBoundingClientRect().top;
        if (top < 80 || top > window.innerHeight - 80) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const input = target.matches && (target.matches('input,textarea,select') ? target : target.querySelector('input, textarea, select'));
        if (input && !input.disabled) { try { input.focus(); } catch (e) { /* フォーカスできない欄もある */ } }
        setTimeout(function () { target.classList.remove('is-jump'); }, 2800);
      }, 0);
    }
    function builderFixAction(name, el) {
      if (name === 'check-done') { const d = builderChecksDone(); d[el.dataset.id] = new Date().toISOString(); try { localStorage.setItem(CHECKS_DONE_KEY, JSON.stringify(d)); } catch (e) { /* 覚えられない環境 */ } emit('oms:builder', { form: false }); showToast('確認済みにしました。'); return true; }
      if (name === 'fix-jump') {
        const sel = el.dataset.type === 'product-edit' ? { type: 'product-edit', id: el.dataset.id } : { type: el.dataset.type, index: Number(el.dataset.index || 0) };
        builderJumpTo(sel, el.dataset.focus || '');
        return true;
      }
      const b = state.builder;
      if (name === 'fix-product-del' || name === 'fix-product-revert') {
        const i = Number(el.dataset.index);
        const p = b.newProducts[i];
        if (!p) { showToast('対象の下書きが見つかりません。'); return true; }
        if (name === 'fix-product-del' && p.edit) { showToast('本店に出ている商品は、ここでは消しません。「下書きの変更をやめる」で編集だけやめられます。'); return true; }
        if (name === 'fix-product-revert' && !p.edit) { showToast('これはまだ本店に出ていない新しい商品です。「削除」で下書きから消せます。'); return true; }
        const ok = window.confirm(p.edit
          ? builderProductLabel(p) + 'の編集を下書きからやめますか？本店に出ている商品そのものは消えません。「↶ 元に戻す」で戻せます。'
          : '下書きの' + builderProductLabel(p) + 'を消しますか？まだ本店には出ていないので、この下書きからだけ消えます。「↶ 元に戻す」で戻せます。');
        if (!ok) return true;
        b.newProducts.splice(i, 1);
        if (b.sel.type === 'product') b.sel = { type: 'stock', index: 0 };
        builderChanged(true);
        builderScrollToEditor();
        showToast(p.edit ? '下書きの編集をやめました。本店の商品はそのままです。' : '下書きの新しい商品を消しました。「↶ 元に戻す」で戻せます。');
        return true;
      }
      if (name !== 'fix-card-del') return false;
      const i = Number(el.dataset.index);
      const card = b.cards[i];
      if (!card || !builderCardIsBlank(card)) { showToast('中身が入っているカードは、開いてから「削除」で消してください。'); return true; }
      if (!window.confirm(builderCardLabel(card, i) + 'を下書きから消しますか？「↶ 元に戻す」で戻せます。')) return true;
      b.cards.splice(i, 1);
      if (b.sel.type === 'card') b.sel = { type: 'ticker', index: 0 };
      builderChanged(true);
      showToast('作りかけのカードを消しました。「↶ 元に戻す」で戻せます。');
      return true;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { builderProductLabel: builderProductLabel, builderFixField: builderFixField, builderFixOtherTarget: builderFixOtherTarget, builderCardIsBlank: builderCardIsBlank };
