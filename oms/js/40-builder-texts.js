// Luna Luce OMS 部品JS: 40-builder-texts（表示する文字）
// 2.32 で追加。ページの見出し・ボタンの文字を、JSONを触らずに変える。書き出しの texts → サイトの site-src/site-texts.json。
// キー（item.trial など）はサイトの部品が使う名前なので変えない。文字だけを直す。空にすると元の文字に戻る。
// 文字の一覧はサイトの site-texts.json（builder-data の siteTexts）。無いときは下の標準を使う。
    const TEXTS_DEFAULT = [
      { key: 'item.description', group: '商品ページ', label: '商品の説明の見出し', text: '商品の説明' },
      { key: 'item.notes', group: '商品ページ', label: '注意事項の見出し', text: 'ご注文の前に' },
      { key: 'item.leadTime', group: '商品ページ', label: 'お届けまでの日数の見出し', text: 'ご注文からお届けまで' },
      { key: 'item.source', group: '商品ページ', label: '本店の商品情報へのリンク', text: '本店の商品情報を見る ↗' },
      { key: 'item.recommend', group: '商品ページ', label: 'おすすめ商品の見出し', text: 'こちらもおすすめ' },
      { key: 'item.trial', group: '商品ページ', label: '名入れの商品の見出し', text: '名入れができる商品' },
      { key: 'item.trialAll', group: '商品ページ', label: '名入れの商品一覧へのリンク', text: '名入れできる商品一覧へ' },
      { key: 'item.cart', group: '商品ページ', label: 'カートに入れるボタン', text: 'ダミーカートに入れる' }
    ];
    function builderTextsBase() { const b = state.builder; return Array.isArray(b.textsBase) && b.textsBase.length ? b.textsBase : TEXTS_DEFAULT; }
    function builderTexts() { const b = state.builder; if (!b.texts || typeof b.texts !== 'object') b.texts = {}; return b.texts; }
    function builderTextValue(t) { const v = builderTexts()[t.key]; return typeof v === 'string' && v.trim() ? v : t.text; }
    function builderTextsChanged() { const own = builderTexts(); return builderTextsBase().filter(function (t) { return typeof own[t.key] === 'string' && own[t.key].trim() && own[t.key].trim() !== t.text; }).length; }
    function builderTextsErrors() {
      const own = builderTexts();
      return builderTextsBase().filter(function (t) { const v = own[t.key]; return typeof v === 'string' && (v.length > 60 || /[<>]/.test(v)); })
        .map(function (t) { return '表示する文字「' + t.label + '」は60文字までで、< > は使えません'; });
    }
    function builderTextsForm() {
      const groups = {};
      builderTextsBase().forEach(function (t, i) { (groups[t.group || 'そのほか'] = groups[t.group || 'そのほか'] || []).push([t, i]); });
      return '<h2>表示する文字</h2><p class="lead">ページの見出しやボタンの文字を変えます。空にすると元の文字に戻ります。60文字まで。</p>' +
        Object.keys(groups).map(function (g) {
          return '<h3>' + escapeHtml(g) + '</h3><div class="txt-list">' + groups[g].map(function (x) {
            const t = x[0], own = builderTexts()[t.key];
            const changed = typeof own === 'string' && own.trim() && own.trim() !== t.text;
            return '<label class="fld wide txt-row"><span>' + escapeHtml(t.label) + (changed ? ' <small class="txt-was">元: ' + escapeHtml(t.text) + '</small>' : '') + '</span><input type="text" maxlength="60" data-txt="' + escapeHtml(t.key) + '" value="' + escapeHtml(builderTextValue(t)) + '" placeholder="' + escapeHtml(t.text) + '"></label>';
          }).join('') + '</div>';
        }).join('') + (builderTextsChanged() ? '<div class="row"><button type="button" data-b="txt-reset">全部元の文字に戻す</button></div>' : '');
    }
    function builderTextsPreview() {
      return '<p class="pv-note">いまの文字（変えたものは色つき）</p><ul class="txt-pv">' + builderTextsBase().map(function (t) {
        const v = builderTextValue(t);
        return '<li' + (v !== t.text ? ' class="is-changed"' : '') + '><small>' + escapeHtml(t.label) + '</small><b>' + escapeHtml(v) + '</b></li>';
      }).join('') + '</ul>';
    }
    function builderTextsInput(el, isChange) {
      if (el.dataset.txt === undefined) return false;
      const key = el.dataset.txt;
      const base = builderTextsBase().find(function (t) { return t.key === key; });
      if (!base) return true;
      const v = el.value.trim();
      if (!v || v === base.text) delete builderTexts()[key]; else builderTexts()[key] = el.value;
      builderChanged(!!isChange);
      return true;
    }
    function builderTextsAction(name) {
      if (name !== 'txt-reset') return false;
      state.builder.texts = {};
      builderChanged(true);
      return true;
    }
    // 書き出し: 全部のキーといまの文字（サイト側は key で照らし合わせて文字だけ入れる）
    function builderTextsExport() { return builderTextsBase().map(function (t) { return { key: t.key, text: builderTextValue(t).trim() }; }); }
