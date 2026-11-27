// Luna Luce OMS 部品JS: 33-builder-sections（トップの商品の段）
// トップ本文に横に並ぶ商品の段（売れ筋TOP10・3つの方法でさがす・いま人気のプチギフト・シフォン・ご両親・クッキー・
// 金平糖キャンディ・ドラジェ・和風・バームクーヘン・ウェルカムボード）を、上下に並べ替え・表示する/しない・期間つきにする。
// 段を足すこともできる: 企画（クリスマス・GW・お盆・セールなど）から / カテゴリーから / 商品を選んで。足した段は消せる。
// 書き出しの homeSections は site-src/home-sections.json と同じ形（サイト側は tools/home-sections.cjs が top.html を作る）。
    const SECTION_MAX = 30;
    const SECTION_SRC = { plan: '企画から', cat: 'カテゴリーから', pick: '選んだ商品' };
    function builderSections() {
      const b = state.builder;
      if (!b.sections) b.sections = [];
      return b.sections;
    }
    function builderSectionOpen() {
      const b = state.builder;
      return builderSections().find(function (s) { return s.id === b.secOpen; }) || null;
    }
    function builderSectionNewId(base) {
      const used = builderSections().map(function (s) { return s.id; });
      let id = String(base || 'row').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'row';
      if (!/^[a-z]/.test(id)) id = 'row-' + id;
      let n = 1, out = id;
      while (used.indexOf(out) >= 0) { n += 1; out = id + '-' + n; }
      return out;
    }
    function builderSectionCatHref(c) {
      if (!c || !c.g) return '';
      return 'category.html?g=' + encodeURIComponent(c.g) + (c.m ? '&m=' + encodeURIComponent(c.m) : '') + (c.s ? '&s=' + encodeURIComponent(c.s) : '');
    }
    // 段に並ぶ商品（新サイトにある商品だけ。外した商品は除く。多いときは max 件まで）
    function builderSectionIds(s) {
      if (s.kind !== 'row') return [];
      const ex = s.exclude || [];
      let ids = [];
      if (s.src === 'pick') ids = (s.ids || []).slice();
      else {
        const plan = s.src === 'plan' ? state.builder.plans.find(function (p) { return p.id === s.planId; }) : (s.cat && s.cat.g ? { cats: [s.cat], ids: [], exclude: [] } : null);
        if (plan) ids = builderPlanMembers(plan).filter(function (m) { return m.src === 'site'; }).map(function (m) { return m.id; });
      }
      return ids.filter(function (id) { return ex.indexOf(id) < 0 && builderProduct(id); }).slice(0, Number(s.max) || 12);
    }
    function builderSectionLabel(s) {
      if (s.kind !== 'row') return 'いまある段';
      if (s.src === 'plan') { const p = state.builder.plans.find(function (x) { return x.id === s.planId; }); return '企画「' + (p ? p.name || '名前なし' : 'なくなった企画') + '」から'; }
      if (s.src === 'cat') return 'カテゴリー「' + (s.cat && s.cat.g ? builderPlanCatLabel(s.cat) : '未選択') + '」から';
      return '選んだ商品';
    }
    function builderSectionCatSel(c) {
      const b = state.builder;
      const g = b.links.categories.find(function (x) { return x.k === c.g; });
      const m = g && c.m && g.mids.find(function (x) { return x.k === c.m; });
      return '<div class="row"><label class="fld"><span>大カテゴリー</span><select data-sec-cat="g"><option value="">選んでください</option>' + b.links.categories.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === c.g ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>' +
        (g ? '<label class="fld"><span>中カテゴリー</span><select data-sec-cat="m"><option value="">（すべて）</option>' + g.mids.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === c.m ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>' : '') +
        (m && m.subs.length ? '<label class="fld"><span>小カテゴリー</span><select data-sec-cat="s"><option value="">（すべて）</option>' + m.subs.map(function (x) { return '<option value="' + escapeHtml(x[0]) + '"' + (x[0] === c.s ? ' selected' : '') + '>' + escapeHtml(x[1]) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
    }
    // 開いた段の中身（足した段: 題名・一言・すべて見る・商品。どの段も: 期間）
    function builderSectionDetail(s) {
      const b = state.builder;
      let html = '<div class="sec-detail">';
      if (s.kind === 'row') {
        const ids = builderSectionIds(s);
        html += '<div class="row">' + builderField('段の題名', 'title', s.title, { max: 40, wide: true }) + '</div>' +
          '<div class="row">' + builderField('題名の横の一言（任意）', 'sub', s.sub || '', { max: 60, wide: true, placeholder: '例: 12/25まで' }) + '</div>' +
          builderLinkPicker('「すべて見る」で開くページ', 'href', s.href || '', true);
        if (s.src === 'plan') {
          html += '<label class="fld"><span>どの企画の商品を並べるか</span><select data-sec-plan><option value="">選んでください</option>' + b.plans.map(function (p) { return '<option value="' + escapeHtml(p.id) + '"' + (p.id === s.planId ? ' selected' : '') + '>' + escapeHtml((p.name || '名前なし') + '（' + builderPlanKind(p.kind) + '）') + '</option>'; }).join('') + '</select><small>企画の商品が変わると、段の商品も変わります</small></label>';
        } else if (s.src === 'cat') {
          html += builderSectionCatSel(s.cat || { g: '', m: '', s: '' });
        } else {
          const q = b.secQuery || '';
          const hits = q ? b.products.filter(function (p) { return (p.title + ' ' + (p.code || '') + ' ' + p.id).indexOf(q) >= 0 && (s.ids || []).indexOf(p.id) < 0; }).slice(0, 12) : [];
          html += '<label class="fld wide"><span>商品をさがして足す</span><input type="search" data-secq value="' + escapeHtml(q) + '" placeholder="商品名・商品コード"></label>' +
            (hits.length ? '<div class="sec-hits">' + hits.map(function (p) { return '<button type="button" data-b="sec-pick" data-id="' + escapeHtml(p.id) + '">' + (p.image ? '<img src="' + escapeHtml(builderImg(p.image)) + '" alt="">' : '') + '<span>' + escapeHtml(p.title) + '</span></button>'; }).join('') + '</div>' : q ? '<p class="muted">見つかりません</p>' : '');
        }
        if (s.src !== 'pick') html += '<label class="fld"><span>並べる数（多いときはここまで）</span><input type="number" min="1" max="' + SECTION_MAX + '" data-f="max" value="' + escapeHtml(String(s.max || 12)) + '"></label>';
        html += '<p class="sec-count">いま並ぶ商品: ' + ids.length + '件' + (s.exclude && s.exclude.length ? '（外した商品 ' + s.exclude.length + '件 <button type="button" data-b="sec-unexclude">外した商品を全部戻す</button>）' : '') + '</p>' +
          '<ol class="sec-prods">' + ids.map(function (id, i) {
            const p = builderProduct(id);
            return '<li>' + (p.image ? '<img src="' + escapeHtml(builderImg(p.image)) + '" alt="">' : '<span class="noimg"></span>') + '<span>' + escapeHtml(p.title) + '</span>' +
              (s.src === 'pick' ? '<span class="mv"><button type="button" data-b="sec-prod-move" data-i="' + i + '" data-dir="-1" aria-label="前へ">←</button><button type="button" data-b="sec-prod-move" data-i="' + i + '" data-dir="1" aria-label="後へ">→</button></span>' : '') +
              '<button type="button" data-b="sec-prod-remove" data-id="' + escapeHtml(id) + '" aria-label="この商品を段から外す">×</button></li>';
          }).join('') + '</ol>';
      }
      html += '<h4>出す期間（任意）</h4>' + builderPeriod(s, '', false) + '<p class="muted">空なら、表示する にしている間ずっと出ます。</p></div>';
      return html;
    }
    function builderSectionsForm() {
      const b = state.builder;
      const nowIso = new Date().toISOString();
      const list = builderSections();
      const rows = list.map(function (s, i) {
        const open = b.secOpen === s.id;
        const now = builderOnNow(s, nowIso);
        return '<li class="sec-item' + (open ? ' is-open' : '') + (s.active ? '' : ' is-off') + '"><div class="sec-head">' +
          '<span class="mv"><button type="button" data-b="sec-move" data-index="' + i + '" data-dir="-1" aria-label="上へ"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-b="sec-move" data-index="' + i + '" data-dir="1" aria-label="下へ"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button></span>' +
          '<button type="button" class="sec-name" data-b="sec-open" data-id="' + escapeHtml(s.id) + '"><b>' + (i + 1) + '. ' + escapeHtml(s.title || '（題名なし）') + '</b><small>' + escapeHtml(builderSectionLabel(s)) + (s.kind === 'row' ? '・' + builderSectionIds(s).length + '件' : '') + (s.startsAt || s.endsAt ? '・' + escapeHtml(builderPeriodText(builderDateOf(s.startsAt), builderLastDayOf(s.endsAt))) : '') + (s.active && !now ? '・いまは期間外' : '') + '</small></button>' +
          '<label class="switch"><input type="checkbox" data-sec-active="' + i + '"' + (s.active ? ' checked' : '') + '><span>表示する</span></label>' +
          (s.kind === 'row' ? '<button type="button" class="danger" data-b="sec-remove" data-index="' + i + '">削除</button>' : '') + '</div>' +
          (open ? builderSectionDetail(s) : '') + '</li>';
      }).join('');
      const planOpts = b.plans.map(function (p) { return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml((p.name || '名前なし') + '（' + builderPlanKind(p.kind) + '）') + '</option>'; }).join('');
      return '<h2>トップの商品の段</h2><p class="lead">トップの本文に横に並ぶ商品の段です。↑↓で順番を変え、「表示する」で出す・出さないを決めます。名前を押すと、期間や中身を直せます。クリスマス・GW・お盆・セールなどの段は、企画やカテゴリーから足せます（足した段は削除できます）。</p>' +
        '<ol class="sec-list">' + rows + '</ol>' +
        '<h3>段を足す</h3><div class="sec-adds">' +
        '<div class="row"><label class="fld"><span>企画から（企画の商品を並べる）</span><select data-sec-newplan><option value="">企画を選ぶ</option>' + planOpts + '</select></label><span class="tools"><button type="button" data-b="sec-add" data-src="plan"' + (b.plans.length ? '' : ' disabled') + '>＋ 企画の段を足す</button></span></div>' +
        (b.plans.length ? '' : '<p class="muted">企画がまだありません。左の「企画」で ＋季節・＋イベント・＋セール から作れます。</p>') +
        '<div class="adds"><button type="button" data-b="sec-add" data-src="cat">＋ カテゴリーから段を足す</button><button type="button" data-b="sec-add" data-src="pick">＋ 商品を選んで段を足す</button></div></div>';
    }
    function builderSectionsPreview() {
      const nowIso = new Date().toISOString();
      return '<p class="pv-note">トップの本文（いま出る段・上から順）</p><ol class="pv-secs">' + builderSections().map(function (s) {
        const on = builderOnNow(s, nowIso);
        const ids = builderSectionIds(s);
        return '<li class="' + (on ? '' : 'is-off') + '"><b>' + escapeHtml(s.title || '（題名なし）') + '</b><small>' + (on ? '表示中' : s.active ? '期間外' : '表示しない') + '</small>' +
          (s.kind === 'row' && ids.length ? '<div class="pv-sec-rail">' + ids.slice(0, 6).map(function (id) { const p = builderProduct(id); return p.image ? '<img src="' + escapeHtml(builderImg(p.image)) + '" alt="">' : '<span></span>'; }).join('') + '</div>' : '') + '</li>';
      }).join('') + '</ol>';
    }
    function builderSectionsErrors() {
      const out = [];
      builderSections().forEach(function (s) {
        const nm = 'トップの商品の段「' + (s.title || s.id) + '」';
        if (s.startsAt && s.endsAt && s.startsAt >= s.endsAt) out.push(nm + ': 期間が逆です');
        if (s.kind !== 'row' || !s.active) return;
        if (!s.title) out.push(nm + ': 題名が空です');
        if (!builderSectionIds(s).length) out.push(nm + ': 並べる商品がありません');
      });
      return out;
    }
    function builderSectionsExport() {
      return builderSections().map(function (s) {
        const out = { id: s.id, kind: s.kind, active: !!s.active };
        if (s.kind === 'row') {
          out.title = s.title;
          if (s.sub) out.sub = s.sub;
          if (s.href) out.href = s.href;
          out.ids = builderSectionIds(s);
          out.source = s.src === 'plan' ? { plan: s.planId } : s.src === 'cat' ? { category: s.cat } : { pick: true };
        }
        if (s.startsAt) out.startsAt = s.startsAt;
        if (s.endsAt) out.endsAt = s.endsAt;
        return out;
      });
    }
    // 企画の画面に出す「トップに段を出す」
    function builderSectionPlanHint(plan) {
      const s = builderSections().find(function (x) { return x.kind === 'row' && x.src === 'plan' && x.planId === plan.id; });
      return '<h3>トップの商品の段</h3>' + (s ? '<p>この企画の段があります（' + (s.active ? '表示する' : '表示しない') + '）。<button type="button" data-b="sec-goto" data-id="' + escapeHtml(s.id) + '">段を開く</button></p>' : '<p class="muted">この企画の商品を、トップに横並びの段で出せます。</p><button type="button" data-b="sec-add" data-src="plan" data-plan="' + escapeHtml(plan.id) + '">＋ トップにこの企画の段を出す</button>');
    }
    function builderSectionAction(name, el) {
      const b = state.builder;
      if (name.indexOf('sec-') !== 0) return false;
      const list = builderSections();
      const s = builderSectionOpen();
      if (name === 'sec-open') { b.secOpen = b.secOpen === el.dataset.id ? '' : el.dataset.id; b.secQuery = ''; emit('oms:builder', { form: true }); return true; }
      if (name === 'sec-goto') { b.sel = { type: 'sections', index: 0 }; b.secOpen = el.dataset.id; emit('oms:builder', { form: true }); return true; }
      if (name === 'sec-move') { builderMove(list, Number(el.dataset.index), Number(el.dataset.dir)); builderChanged(true); return true; }
      if (name === 'sec-remove') {
        const x = list[Number(el.dataset.index)];
        if (!x || x.kind !== 'row') return true;
        list.splice(Number(el.dataset.index), 1);
        if (b.secOpen === x.id) b.secOpen = '';
        builderChanged(true);
        showToast('段「' + (x.title || '題名なし') + '」を消しました。「↶ 元に戻す」で戻せます。');
        return true;
      }
      if (name === 'sec-add') {
        const src = el.dataset.src;
        let row;
        if (src === 'plan') {
          const pick = el.dataset.plan || (document.querySelector('[data-sec-newplan]') || {}).value;
          const plan = b.plans.find(function (p) { return p.id === pick; });
          if (!plan) { showToast('企画を選んでください'); return true; }
          const c = plan.cats.find(function (x) { return x.g; });
          row = { id: builderSectionNewId('plan-' + plan.id.replace(/^plan-/, '')), kind: 'row', src: 'plan', planId: plan.id, title: plan.name || '企画の商品', sub: '', href: c ? builderSectionCatHref(c) : '', max: 12, exclude: [], active: true };
          if (plan.from) row.startsAt = builderIsoOf(plan.from);
          if (plan.to) row.endsAt = builderEndIsoOf(plan.to);
          if (row.startsAt || row.endsAt) row.timeZone = 'Asia/Tokyo';
        } else if (src === 'cat') {
          row = { id: builderSectionNewId('cat'), kind: 'row', src: 'cat', cat: { g: '', m: '', s: '' }, title: '', sub: '', href: '', max: 12, exclude: [], active: true };
        } else {
          row = { id: builderSectionNewId('pick'), kind: 'row', src: 'pick', ids: [], title: '', sub: '', href: '', exclude: [], active: true };
        }
        list.unshift(row);
        b.sel = { type: 'sections', index: 0 };
        b.secOpen = row.id;
        b.secQuery = '';
        builderLoadTemplates();
        builderChanged(true);
        return true;
      }
      if (!s) return true;
      if (name === 'sec-pick') { s.ids = (s.ids || []).concat([el.dataset.id]).slice(0, SECTION_MAX); builderChanged(true); return true; }
      if (name === 'sec-prod-move') {
        const ids = builderSectionIds(s);
        if (s.src === 'pick') { s.ids = ids; builderMove(s.ids, Number(el.dataset.i), Number(el.dataset.dir)); builderChanged(true); }
        return true;
      }
      if (name === 'sec-prod-remove') {
        if (s.src === 'pick') s.ids = (s.ids || []).filter(function (x) { return x !== el.dataset.id; });
        else s.exclude = (s.exclude || []).concat([el.dataset.id]);
        builderChanged(true);
        return true;
      }
      if (name === 'sec-unexclude') { s.exclude = []; builderChanged(true); return true; }
      return true;
    }
    // 入力（表示する・企画・カテゴリー・商品さがし）。扱ったら true
    function builderSectionInput(el, isChange) {
      const b = state.builder;
      if (el.dataset.secActive !== undefined) {
        if (!isChange) return true;
        const s = builderSections()[Number(el.dataset.secActive)];
        if (s) s.active = el.checked;
        builderChanged(true);
        return true;
      }
      if (el.dataset.secq !== undefined) {
        b.secQuery = el.value;
        if (!isChange) {
          emit('oms:builder', { form: true });
          const again = document.querySelector('[data-secq]');
          if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
        }
        return true;
      }
      if (el.dataset.secNewplan !== undefined) return true;
      const s = builderSectionOpen();
      if (el.dataset.secPlan !== undefined) {
        if (!isChange || !s) return true;
        s.planId = el.value;
        const plan = b.plans.find(function (p) { return p.id === el.value; });
        if (plan && !s.title) s.title = plan.name || '';
        builderChanged(true);
        return true;
      }
      if (el.dataset.secCat !== undefined) {
        if (!isChange || !s) return true;
        const c = s.cat || (s.cat = { g: '', m: '', s: '' });
        const part = el.dataset.secCat;
        c[part] = el.value;
        if (part === 'g') { c.m = ''; c.s = ''; }
        if (part === 'm') c.s = '';
        const label = c.g ? builderPlanCatLabel(c).split(' › ').filter(function (x) { return x !== 'すべての中カテゴリー'; }).pop() : '';
        if (!s.title || s.autoTitle) { s.title = label; s.autoTitle = true; }
        if (!s.href || s.autoHref) { s.href = builderSectionCatHref(c); s.autoHref = true; }
        builderLoadTemplates();
        builderChanged(true);
        return true;
      }
      return false;
    }
