// Luna Luce OMS 部品JS: 37-builder-delivery（お届けまでの日数・注意事項の定型文）
// 2.29 で追加。商品の登録・編集で「ご注文からお届けまで 約◯日（受注生産）」を必ず入れ、「ご注文の前に」に出す注意事項を定型文から選ぶ。
// 定型文はサイトビルダー「注意事項の定型文」で直す（書き出しの noticeTemplates → サイトの site-src/notice-templates.json）。
// 商品の書き出しには delivery {min, max, made, source} と notes [定型文の id] が入る（サイト v64 と同じ形）。
    const NOTE_TONES = [['important', '大事（目立つ色）'], ['caution', '注意（青）'], ['info', 'ふつう']];
    // サイトの site-src/notice-templates.json と同じ中身（builder-data に無いときに使う）
    const NOTE_TEMPLATES_DEFAULT = [
      { id: 'order-mail', label: 'ご注文確認メール', tone: 'important', text: 'ご注文後にお送りする「ご注文確認メール」を必ずご確認ください。配送予定日はメールでご連絡します（自動配信メールはご注文確定のご連絡ではありません）。' },
      { id: 'made-to-order', label: '受注生産（お届け日数）', tone: 'important', text: '受注生産のため、ご注文からお届けまで{days}のお時間をいただきます。お急ぎの場合は、ご注文手続きの「お急ぎ制作を希望する」をお選びください（1,000円〜・日数により変わります）。' },
      { id: 'cancel-if-late', label: '使用日に間に合わない場合', tone: 'important', text: 'ご注文確認時に、ご使用日までのお届けが難しいと判断した場合は、キャンセルさせていただくことがあります。ご連絡は原則メールで行いますので、ご注文が成立しているかを必ずご確認ください。' },
      { id: 'min-qty', label: '最低購入数', tone: 'caution', text: '一部の商品は最低購入数をお願いしています。数量をご確認のうえご注文ください。' },
      { id: 'no-cancel-after', label: '確定後の減数・キャンセル', tone: 'caution', text: 'ご注文確定後の減数・キャンセルはお受けできません。増数はお届けが遅れる場合があります。数量・配送日・お届け先の変更には手数料がかかります。' },
      { id: 'food-no-return', label: '食品の返品', tone: 'info', text: '食品のため、天候や交通事情などでお届けが遅れた場合でも、返品はお受けできません。' },
      { id: 'bulk-100', label: '100個以上', tone: 'info', text: '100個（10セット）以上のご注文は、先にお問い合わせください。通常の日数でお届けできない場合があります。' },
      { id: 'spec-change', label: '仕様の変更', tone: 'info', text: '商品の仕様（色柄・デザイン・リボン・お菓子などの付属品）は、販売時期により予告なく変わる場合があります。' },
      { id: 'no-noshi', label: 'のし・包装対象外', tone: 'info', text: 'のし・包装の対象外の商品です。化粧箱のご用意はありません。' },
      { id: 'free-ship-no-date', label: '送料無料の配送', tone: 'info', text: '送料無料の配送は当店指定の方法でお届けするため、日時のご指定ができない場合があります。' },
      { id: 'season-delay', label: '地域・季節による遅れ', tone: 'info', text: '地域によりお届け日数は前後します。冬季や母の日・バレンタインなどのイベント時期は配送が遅れることがありますので、ご使用日まで余裕をもってご注文ください。' },
      { id: 'nekopos', label: 'ネコポス', tone: 'caution', text: 'ネコポス（ポスト投函）でお届けします。ほかの商品との同梱、日時指定、代金引換はできません。ほかの商品と一緒にご注文の場合は宅配便でのお届けとなり、送料がかかります。' },
      { id: 'post-size', label: 'ポスト投函のサイズ', tone: 'caution', text: 'ポストに投函してお届けします（約31.5×22.5×3cm）。ポストに入らない場合や表札のないお宅にはお届けできません。発送からお届けまで2〜6日ほどかかり、日時のご指定はできません。会社あてのときは会社名までご記入ください。' }
    ];
    const NOTE_MADE_DEFAULT = ['order-mail', 'made-to-order', 'cancel-if-late', 'no-cancel-after', 'season-delay'];
    function builderNoteTemplates() {
      const b = state.builder;
      if (!Array.isArray(b.noteTemplates)) b.noteTemplates = cloneData(NOTE_TEMPLATES_DEFAULT);
      return b.noteTemplates;
    }
    function builderLeadText(d) {
      if (!d || !(Number(d.min) > 0)) return '';
      const min = Number(d.min), max = Number(d.max) || min;
      return '約' + (max > min ? min + '〜' + max : min) + '日';
    }
    // お手本・いまの商品から写す。日数が無い商品は空のまま（担当者が入れる）
    function builderDeliveryInit(p, t) {
      const d = t && t.delivery;
      p.delivery = d ? { min: String(d.min), max: String(d.max), made: !!d.made } : { min: '', max: '', made: false };
      p.notes = t && Array.isArray(t.notes) ? t.notes.slice() : d && d.made ? NOTE_MADE_DEFAULT.slice() : [];
    }
    function builderDeliveryErrors(p) {
      const d = p.delivery || {};
      const min = Number(d.min), max = Number(d.max || d.min);
      if (!d.min) return ['お届けまでの日数を入れてください（例: 14日）'];
      if (!Number.isInteger(min) || min < 1 || min > 120) return ['お届けまでの日数は1〜120日の数字で入れてください'];
      if (!Number.isInteger(max) || max < min || max > 120) return ['お届けまでの日数（最長）は最短と同じか、それより長くしてください'];
      return [];
    }
    function builderDeliveryRow(p) {
      const d = p.delivery || {};
      if (!d.min) return {};
      const min = Number(d.min);
      const ids = builderNoteTemplates().map(function (t) { return t.id; });
      return { delivery: { min: min, max: Number(d.max || d.min), made: !!d.made, source: 'OMS' }, notes: (p.notes || []).filter(function (id) { return ids.indexOf(id) >= 0; }).sort(function (x, y) { return ids.indexOf(x) - ids.indexOf(y); }) };
    }
    // 商品の登録・編集の画面に出す欄
    function builderDeliveryBlock(p) {
      const d = p.delivery || { min: '', max: '', made: false };
      const notes = p.notes || [];
      const days = builderLeadText(d);
      return '<div data-jump="delivery"><h3>お届けまでの日数 <small class="req">必須</small></h3>' +
        '<p class="muted">商品ページの価格の下に「ご注文からお届けまで ' + escapeHtml(days || '約◯日') + '」と出ます。決まった日数なら最短だけでかまいません。</p>' +
        '<div class="row lead-row"><label class="fld"><span>最短（日）</span><input type="number" min="1" max="120" data-dl="min" value="' + escapeHtml(String(d.min || '')) + '" placeholder="例: 14"></label>' +
        '<label class="fld"><span>最長（日・任意）</span><input type="number" min="1" max="120" data-dl="max" value="' + escapeHtml(String(d.max && d.max !== d.min ? d.max : '')) + '" placeholder="例: 21"></label></div>' +
        builderSwitchRaw('受注生産（ご注文を受けてから作る）', 'data-dl="made"', !!d.made) +
        '<h3>ご注文の前に（注意事項）</h3><p class="muted">出したい定型文にチェックを入れます。並びは定型文の順です。文章は左の「注意事項の定型文」で直せます（すべての商品に効きます）。</p>' +
        '<ul class="note-pick">' + builderNoteTemplates().map(function (t) {
          const on = notes.indexOf(t.id) >= 0;
          return '<li class="tone-' + escapeHtml(t.tone) + (on ? ' is-on' : '') + '"><label><input type="checkbox" data-note="' + escapeHtml(t.id) + '"' + (on ? ' checked' : '') + '><b>' + escapeHtml(t.label) + '</b></label><small>' + escapeHtml(t.text.replace(/\{days\}/g, days || '約◯日')) + '</small></li>';
        }).join('') + '</ul>' + (d.made && notes.indexOf('made-to-order') < 0 ? '<p class="muted">受注生産の商品は「受注生産（お届け日数）」を選ぶのがおすすめです。</p>' : '') + '</div>';
    }
    // 右の見え方に足す
    function builderDeliveryPreview(p) {
      const d = p.delivery || {};
      const days = builderLeadText(d);
      const list = builderNoteTemplates().filter(function (t) { return (p.notes || []).indexOf(t.id) >= 0; });
      return (days ? '<p class="pv-lead">ご注文からお届けまで <b>' + escapeHtml(days) + '</b>' + (d.made ? '<small>受注生産</small>' : '') + '</p>' : '<p class="pv-lead is-none">お届けまでの日数が未入力です</p>') +
        (list.length ? '<ul class="pv-notes">' + list.map(function (t) { return '<li class="tone-' + escapeHtml(t.tone) + '"><b>' + escapeHtml(t.label) + '</b>' + escapeHtml(t.text.replace(/\{days\}/g, days || '約◯日')) + '</li>'; }).join('') + '</ul>' : '');
    }
    function builderDeliveryInput(el, isChange) {
      if (el.dataset.dl === undefined && el.dataset.note === undefined) return false;
      const p = builderSelected();
      if (!p || state.builder.sel.type !== 'product') return true;
      if (!p.delivery) builderDeliveryInit(p, null);
      if (el.dataset.dl === 'made') {
        p.delivery.made = el.checked;
        if (el.checked && !(p.notes || []).length) p.notes = NOTE_MADE_DEFAULT.slice();
      } else if (el.dataset.dl) {
        p.delivery[el.dataset.dl] = el.value;
        if (el.dataset.dl === 'min' && !p.delivery.max) p.delivery.max = '';
      }
      if (el.dataset.note !== undefined) {
        const id = el.dataset.note;
        p.notes = (p.notes || []).filter(function (x) { return x !== id; });
        if (el.checked) p.notes.push(id);
      }
      builderChanged(el.type === 'checkbox'); // 数字の欄で描き直すと、次の欄への入力が消えるので描き直さない
      return true;
    }

    // ---- 注意事項の定型文（左の一覧「商品」から開く） ----
    function builderNotesForm() {
      const list = builderNoteTemplates();
      const used = function (id) { return state.builder.newProducts.filter(function (p) { return (p.notes || []).indexOf(id) >= 0; }).length; };
      return '<h2>注意事項の定型文</h2><p class="lead">商品ページの「ご注文の前に」に出す文章です。ここで直すと、その定型文を選んだすべての商品に効きます。{days} と書いたところは、その商品のお届け日数（例: 約14日）になります。</p>' +
        '<ol class="note-tpls">' + list.map(function (t, i) {
          const n = used(t.id);
          return '<li class="note-tpl tone-' + escapeHtml(t.tone) + '"><div class="row"><b>' + (i + 1) + '</b><span class="tools"><button type="button" data-b="note-move" data-index="' + i + '" data-dir="-1" aria-label="上へ">↑</button><button type="button" data-b="note-move" data-index="' + i + '" data-dir="1" aria-label="下へ">↓</button><button type="button" data-b="note-remove" data-index="' + i + '"' + (n ? ' disabled title="下書きの商品で使っています"' : '') + '>削除</button></span></div>' +
            '<label class="fld wide"><span>名前（商品ページの小見出し）</span><input type="text" data-nt="' + i + '.label" value="' + escapeHtml(t.label) + '" maxlength="30"></label>' +
            '<label class="fld"><span>色</span><select data-nt="' + i + '.tone">' + NOTE_TONES.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === t.tone ? ' selected' : '') + '>' + escapeHtml(x[1]) + '</option>'; }).join('') + '</select></label>' +
            '<label class="fld wide"><span>文章（800文字まで）</span><textarea rows="3" data-nt="' + i + '.text" maxlength="800">' + escapeHtml(t.text) + '</textarea></label>' +
            (n ? '<p class="muted">下書きの商品 ' + n + '件で使っています。</p>' : '') + '</li>';
        }).join('') + '</ol><button type="button" class="add" data-b="note-add">＋ 定型文を足す</button>';
    }
    function builderNotesPreview() {
      return '<p class="pv-note">商品ページでの見え方（例: お届け 約14日の商品）</p><ul class="pv-notes">' + builderNoteTemplates().map(function (t) {
        return '<li class="tone-' + escapeHtml(t.tone) + '"><b>' + escapeHtml(t.label || '（名前なし）') + '</b>' + escapeHtml((t.text || '').replace(/\{days\}/g, '約14日')) + '</li>';
      }).join('') + '</ul>';
    }
    function builderNotesErrors() {
      const out = [];
      builderNoteTemplates().forEach(function (t, i) {
        const nm = '注意事項の定型文 ' + (i + 1) + '件目';
        if (!(t.label || '').trim()) out.push(nm + ': 名前が空です');
        if (!(t.text || '').trim()) out.push(nm + ': 文章が空です');
      });
      return out;
    }
    function builderNotesExport() {
      return builderNoteTemplates().map(function (t) { return { id: t.id, label: (t.label || '').trim(), tone: t.tone, text: (t.text || '').trim() }; });
    }
    // 在庫と出店の一覧: お届け日数が無いサイトの商品（編集の下書きで日数を入れたものは除く）
    function builderNoLead(item) {
      if (item.src !== 'site' || item.lead !== false) return false;
      const d = builderDraftOf(item.id);
      return !(d && d.delivery && d.delivery.min);
    }
    function builderNotesAction(name, el) {
      if (name === 'lead-filter') { state.builder.leadFilter = !state.builder.leadFilter; state.builder.stockPage = 1; emit('oms:builder', { form: true }); return true; }
      if (name.indexOf('note-') !== 0) return false;
      const list = builderNoteTemplates();
      const i = Number(el && el.dataset.index);
      if (name === 'note-add') {
        let n = list.length + 1, id = 'note-' + n;
        while (list.some(function (t) { return t.id === id; })) { n += 1; id = 'note-' + n; }
        list.push({ id: id, label: '', tone: 'info', text: '' });
      } else if (name === 'note-remove') list.splice(i, 1);
      else if (name === 'note-move') { const j = i + Number(el.dataset.dir); if (j < 0 || j >= list.length) return true; const x = list[i]; list[i] = list[j]; list[j] = x; }
      else return false;
      builderChanged(true);
      return true;
    }
    function builderNotesInput(el, isChange) {
      if (el.dataset.nt === undefined) return false;
      const parts = el.dataset.nt.split('.');
      const t = builderNoteTemplates()[Number(parts[0])];
      if (!t) return true;
      t[parts[1]] = el.value;
      builderChanged(!!isChange && el.tagName === 'SELECT');
      return true;
    }
