// Luna Luce OMS 部品JS: 30-builder-plans（企画: 季節・イベント・セール）
// 企画ごとに「名前・種類・期間・対象の商品」を決める。対象はカテゴリーでまとめて選び、1つずつ足す・外すこともできる。
// 企画に入った商品は、販売期間が企画の期間に自動でそろう（入れ間違い・入れ忘れを防ぐ）。トップのカードは任意で、作るとカードの表示期間も企画にそろう。
    const PLAN_KINDS = [['season', '季節'], ['event', 'イベント'], ['sale', 'セール・特売']];
    function builderPlanKind(k) { const x = PLAN_KINDS.find(function (y) { return y[0] === k; }); return x ? x[1] : '企画'; }
    function builderPlanNew(kind, from) {
      const b = state.builder;
      const id = 'plan-' + Date.now().toString(36);
      const plan = { id: id, kind: kind || 'season', name: '', from: '', to: '', cats: [], ids: [], exclude: [], note: '', cardId: '' };
      if (from) {
        plan.name = from.title || '';
        plan.from = builderDateOf(from.startsAt);
        plan.to = builderLastDayOf(from.endsAt);
        const l = builderLinkParse(from.href || '');
        if (l.type === 'category' && l.g && l.g !== 'all') plan.cats.push({ g: l.g, m: l.m || '', s: l.s || '' });
        plan.ids = (from.ids || []).filter(Boolean).slice();
        plan.cardId = from.id;
      }
      b.plans.push(plan);
      b.sel = { type: 'plan', index: b.plans.length - 1 };
      return plan;
    }
    // その商品がカテゴリーの条件に合うか
    function builderPlanCatHit(c, item) {
      const b = state.builder;
      if (item.src === 'new') {
        const p = builderDraftOf(item.id);
        return !!p && (p.places || []).some(function (pl) { return pl.g === c.g && (!c.m || pl.m === c.m) && (!c.s || pl.s === c.s); });
      }
      if (item.src !== 'site' || !b.templates) return false;
      if (!b.templatesById || b.templatesById.n !== b.templates.length) { b.templatesById = { n: b.templates.length }; b.templates.forEach(function (x) { b.templatesById['#' + x.id] = x; }); }
      const t = b.templatesById['#' + item.id];
      if (!t) return false;
      const g = b.links.categories.find(function (x) { return x.k === c.g; });
      if (!g) return false;
      const rules = [];
      if (c.s) { const f = builderPlaceFind(c); if (f.rule) rules.push(f.rule); }
      else if (c.m) { const m = g.mids.find(function (x) { return x.k === c.m; }); if (m) rules.push(m.place); }
      else g.mids.forEach(function (m) { rules.push(m.place); });
      return rules.some(function (r) {
        return r && r.ok && (r.categories.length || r.subs.length) && r.categories.every(function (x) { return (t.categories || []).indexOf(x) >= 0; }) && r.subs.every(function (x) { return (t.subs || []).indexOf(x) >= 0; }) && (!r.titleHint || t.title.indexOf(r.titleHint) >= 0);
      });
    }
    // 企画の対象の商品（カテゴリーで合うもの＋足したもの−外したもの）
    function builderPlanMembers(plan) {
      if (plan.cats.length) builderLoadTemplates();
      return builderListingItems().filter(function (item) {
        if (plan.exclude.indexOf(item.id) >= 0) return false;
        return plan.ids.indexOf(item.id) >= 0 || plan.cats.some(function (c) { return builderPlanCatHit(c, item); });
      });
    }
    // 商品番号 → 入っている企画（描くたびに作り直さないよう、条件が同じなら使い回す）
    let planIndexCache = { key: '', map: {} };
    function builderPlansOf(id) {
      const b = state.builder;
      if (!b.plans || !b.plans.length) return [];
      builderLoadTemplates();
      const key = JSON.stringify(b.plans) + '|' + (b.templates ? 1 : 0) + '|' + (b.unlisted ? b.unlisted.length : 0) + '|' + JSON.stringify(b.newProducts.map(function (p) { return [p.id, p.places]; }));
      if (planIndexCache.key !== key) {
        const map = {};
        b.plans.forEach(function (plan) { builderPlanMembers(plan).forEach(function (item) { (map[item.id] = map[item.id] || []).push(plan); }); });
        planIndexCache = { key: key, map: map };
      }
      return planIndexCache.map[String(id)] || [];
    }
    // 企画の期間を、つながっているトップのカードにも入れる
    function builderPlanSyncCard(plan) {
      const card = plan.cardId && state.builder.cards.find(function (c) { return c.id === plan.cardId; });
      if (!card) return;
      card.startsAt = builderIsoOf(plan.from);
      card.endsAt = builderEndIsoOf(plan.to);
      if (card.startsAt || card.endsAt) card.timeZone = 'Asia/Tokyo'; else delete card.timeZone;
    }
    function builderPlanStatus(plan, today) {
      if (plan.from && today < plan.from) return '開催前';
      if (plan.to && today > plan.to) return '終了';
      return plan.from || plan.to ? '開催中' : '期間なし';
    }
    function builderPlanCatLabel(c) {
      const g = state.builder.links.categories.find(function (x) { return x.k === c.g; });
      if (!g) return c.g;
      const m = c.m && g.mids.find(function (x) { return x.k === c.m; });
      const s = m && c.s && m.subs.find(function (x) { return x[0] === c.s; });
      return [g.name, m ? m.name : c.m ? c.m : 'すべての中カテゴリー', s ? s[1] : ''].filter(Boolean).join(' › ');
    }
    function builderPlanForm(plan) {
      const b = state.builder;
      const today = builderDaysToday();
      const members = builderPlanMembers(plan);
      const card = plan.cardId && b.cards.find(function (c) { return c.id === plan.cardId; });
      const catRows = plan.cats.map(function (c, i) {
        const g = b.links.categories.find(function (x) { return x.k === c.g; });
        const m = g && c.m && g.mids.find(function (x) { return x.k === c.m; });
        return '<li class="row"><label class="fld"><span>大カテゴリー</span><select data-plan-cat="' + i + '" data-pp="g"><option value="">選んでください</option>' + b.links.categories.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === c.g ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>' +
          (g ? '<label class="fld"><span>中カテゴリー</span><select data-plan-cat="' + i + '" data-pp="m"><option value="">（大カテゴリーのすべて）</option>' + g.mids.map(function (x) { return '<option value="' + escapeHtml(x.k) + '"' + (x.k === c.m ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>'; }).join('') + '</select></label>' : '') +
          (m && m.subs.length ? '<label class="fld"><span>小カテゴリー</span><select data-plan-cat="' + i + '" data-pp="s"><option value="">（中カテゴリーのすべて）</option>' + m.subs.map(function (x) { return '<option value="' + escapeHtml(x[0]) + '"' + (x[0] === c.s ? ' selected' : '') + '>' + escapeHtml(x[1]) + '</option>'; }).join('') + '</select></label>' : '') +
          '<span class="tools"><button type="button" data-b="plan-cat-remove" data-index="' + i + '">外す</button></span></li>';
      }).join('');
      return '<h2>企画（' + escapeHtml(builderPlanKind(plan.kind)) + '）</h2><p class="lead">期間を決めると、この企画に入っている商品の販売期間がすべてこの期間にそろいます。トップのカードは出しても出さなくてもかまいません。</p>' +
        '<div class="row"><span class="plan-state">' + escapeHtml(builderPlanStatus(plan, today)) + '</span><span class="tools"><button type="button" data-b="plan-remove">この企画を削除</button></span></div>' +
        '<h3>名前と種類</h3><label class="fld wide"><span>企画の名前</span><input type="text" data-plan="name" value="' + escapeHtml(plan.name) + '" maxlength="40" placeholder="例: クリスマス2026 / 母の日 / 年末セール"></label>' +
        '<div class="newcat-level" role="radiogroup" aria-label="企画の種類">' + PLAN_KINDS.map(function (k) { return '<label class="switch"><input type="radio" name="plankind" data-plan="kind" value="' + k[0] + '"' + (plan.kind === k[0] ? ' checked' : '') + '><span>' + k[1] + '</span></label>'; }).join('') + '</div>' +
        '<h3>期間</h3><div class="row"><label class="fld"><span>いつから</span><input type="date" data-plan="from" value="' + escapeHtml(plan.from) + '"></label><label class="fld"><span>いつまで</span><input type="date" data-plan="to" value="' + escapeHtml(plan.to) + '"><small>この日の終わりまで出します</small></label></div>' +
        '<h3>対象の商品（' + members.length + '件）</h3><p class="muted">カテゴリーで選ぶと、そこに並んでいる商品がまとめて入ります（あとから足した商品も自動で入ります）。1つずつ足したり外したりもできます。</p>' +
        (plan.cats.length ? '<ol class="places">' + catRows + '</ol>' : '') + '<button type="button" class="add" data-b="plan-cat-add">＋ カテゴリーでまとめて選ぶ</button>' +
        '<label class="fld"><span>商品を1つずつ足す（商品名・商品番号・商品コード）</span><input type="search" data-planq value="' + escapeHtml(b.planQuery || '') + '" placeholder="例: サンタ / 53691"></label><div class="hits" data-plan-hits>' + builderPlanHits(plan) + '</div>' +
        '<ol class="plan-members">' + members.slice(0, 60).map(function (item) {
          const viaCat = plan.ids.indexOf(item.id) < 0;
          return '<li>' + (item.image ? '<img src="' + escapeHtml(builderImg(item.image)) + '" alt="" loading="lazy">' : '<span class="noimg">本店</span>') + '<span class="nm">' + escapeHtml(item.title) + '<small>' + escapeHtml(item.id) + (viaCat ? '・カテゴリーで' : '・足した商品') + (item.src === 'w' ? '・新サイト未出店' : '') + '</small></span><button type="button" data-b="plan-item-remove" data-id="' + escapeHtml(item.id) + '">外す</button></li>';
        }).join('') + '</ol>' + (members.length > 60 ? '<p class="muted">ほか ' + (members.length - 60) + '件</p>' : '') +
        builderPlanExcluded(plan) +
        '<h3>トップのカード（任意）</h3>' + (card ? '<p>トップのカード「' + escapeHtml(card.title || '題名なし') + '」とつながっています。カードの表示期間はこの企画の期間にそろえます。</p><button type="button" data-b="plan-card-open">カードを開く</button>' :
          '<p class="muted">カードを出さなくても、企画の期間と商品の販売期間はそのまま使えます。</p><button type="button" class="add" data-b="plan-card">＋ この企画のカードをトップに作る</button>') +
        builderSectionPlanHint(plan) +
        '<h3>メモ</h3><label class="fld wide"><span>メモ（社内用・サイトには出ません）</span><textarea data-plan="note" rows="2">' + escapeHtml(plan.note || '') + '</textarea></label>';
    }
    // 外した商品（カテゴリーで入ったものも、足したものも）。1つずつ戻すか、全部戻す
    function builderPlanExcluded(plan) {
      if (!plan.exclude.length) return '';
      const all = builderListingItems();
      return '<div class="plan-excluded"><h4>外した商品（' + plan.exclude.length + '件）<button type="button" data-b="plan-exclude-clear">全部戻す</button></h4><p class="muted">まちがえて外したときは「戻す」で企画に戻せます。</p><ol class="plan-members">' + plan.exclude.map(function (id) {
        const item = all.find(function (x) { return x.id === id; }) || { id: id, title: '商品番号 ' + id, image: '' };
        return '<li>' + (item.image ? '<img src="' + escapeHtml(builderImg(item.image)) + '" alt="" loading="lazy">' : '<span class="noimg">本店</span>') + '<span class="nm">' + escapeHtml(item.title) + '<small>' + escapeHtml(id) + '・外した商品</small></span><button type="button" data-b="plan-exclude-back" data-id="' + escapeHtml(id) + '">戻す</button></li>';
      }).join('') + '</ol></div>';
    }
    function builderPlanHits(plan) {
      const q = foldText(state.builder.planQuery || '');
      if (!q) return '';
      const found = builderListingItems().filter(function (p) { return p.id.indexOf(q) === 0 || foldText(p.title).indexOf(q) >= 0 || foldText(p.code || '').indexOf(q) >= 0; }).slice(0, 8);
      if (!found.length) return '<p class="muted">見つかりません</p>';
      return found.map(function (p) {
        const inPlan = plan.ids.indexOf(p.id) >= 0 && plan.exclude.indexOf(p.id) < 0;
        return '<button type="button" class="hit" data-b="plan-item-add" data-id="' + escapeHtml(p.id) + '"' + (inPlan ? ' disabled' : '') + '>' + (p.image ? '<img src="' + escapeHtml(builderImg(p.image)) + '" alt="" loading="lazy">' : '<span class="noimg">本店</span>') + '<span>' + escapeHtml(p.title) + '<small>' + escapeHtml(p.id) + '・' + formatYen(p.price) + (p.src === 'w' ? '・新サイト未出店' : '') + (inPlan ? '・足し済み' : '') + '</small></span></button>';
      }).join('');
    }
    // 右の列: 企画のまとめ
    function builderPlanPreview(plan) {
      const members = builderPlanMembers(plan);
      return '<p class="pv-note">企画「' + escapeHtml(plan.name || '名前なし') + '」（' + escapeHtml(builderPlanKind(plan.kind)) + '）・' + escapeHtml(builderPlanStatus(plan, builderDaysToday())) + '</p>' +
        '<div class="pv-plan"><p><b>' + escapeHtml(builderPeriodText(plan.from, plan.to)) + '</b>・対象 ' + members.length + '件</p>' +
        '<div class="pv-thumbs">' + members.filter(function (m) { return m.image; }).slice(0, 24).map(function (m) { return '<span class="pv-thumb"><img src="' + escapeHtml(builderImg(m.image)) + '" alt="' + escapeHtml(m.title) + '" title="' + escapeHtml(m.title) + '"></span>'; }).join('') + '</div>' +
        (members.some(function (m) { return !m.image; }) ? '<p class="pv-note">写真のない ' + members.filter(function (m) { return !m.image; }).length + '件は、本店にあって新サイトにまだない商品です。</p>' : '') + '</div>';
    }
    function builderPlanAction(name, el) {
      const b = state.builder;
      if (name === 'plan-add') { builderPlanNew(el.dataset.kind); builderChanged(true); return true; }
      if (name === 'plan-from-card') {
        const card = b.sel.type === 'card' ? builderSelected() : null;
        if (!card) return true;
        const plan = builderPlanNew('season', card);
        builderPlanSyncCard(plan);
        builderChanged(true);
        showToast('カード「' + (card.title || '') + '」から企画を作りました。期間と商品を確かめてください。');
        return true;
      }
      if (b.sel.type !== 'plan') return false;
      const plan = b.plans[b.sel.index];
      if (!plan) return false;
      const index = Number(el.dataset.index);
      if (name === 'plan-remove') { b.plans.splice(b.sel.index, 1); b.sel = { type: 'stock', index: 0 }; builderChanged(true); return true; }
      if (name === 'plan-cat-add') { plan.cats.push({ g: '', m: '', s: '' }); builderChanged(true); return true; }
      if (name === 'plan-cat-remove') { plan.cats.splice(index, 1); builderChanged(true); return true; }
      if (name === 'plan-item-add') { const id = el.dataset.id; if (plan.ids.indexOf(id) < 0) plan.ids.push(id); plan.exclude = plan.exclude.filter(function (x) { return x !== id; }); builderChanged(true); return true; }
      if (name === 'plan-item-remove') {
        // 足した商品もカテゴリーで入った商品も「外した商品」に残す（あとで1つずつ戻せる）
        const id = el.dataset.id;
        if (plan.exclude.indexOf(id) < 0) plan.exclude.push(id);
        builderChanged(true);
        return true;
      }
      if (name === 'plan-exclude-clear') { const n = plan.exclude.length; plan.exclude = []; builderChanged(true); showToast('外した商品 ' + n + '件をすべて戻しました。'); return true; }
      if (name === 'plan-exclude-back') { const id = el.dataset.id; plan.exclude = plan.exclude.filter(function (x) { return x !== id; }); builderChanged(true); showToast('商品番号 ' + id + ' を企画に戻しました。'); return true; }
      if (name === 'plan-card-open') { const i = b.cards.findIndex(function (c) { return c.id === plan.cardId; }); if (i >= 0) { b.sel = { type: 'card', index: i }; builderChanged(true); } return true; }
      if (name === 'plan-card') {
        const site = builderPlanMembers(plan).filter(function (m) { return m.src === 'site'; }).slice(0, 4).map(function (m) { return m.id; });
        const c0 = plan.cats[0];
        const id = builderUniqueId(plan.id, b.cards);
        const card = { id: id, active: true, kind: plan.kind === 'sale' ? 'campaign' : 'products', theme: plan.kind === 'season' ? 'seasonal' : 'rose', title: plan.name || '', text: (plan.from || plan.to ? builderPeriodText(plan.from, plan.to) + 'の' : '') + builderPlanKind(plan.kind) + '企画です。', href: c0 && c0.g ? builderCategoryHref(c0.g, c0.m, c0.s, false) : '', cta: '一覧を見る', ids: site };
        while (card.ids.length < 4) card.ids.push('');
        b.cards.unshift(card);
        plan.cardId = id;
        builderPlanSyncCard(plan);
        builderChanged(true);
        showToast('トップのいちばん上にカードを作りました。左の「トップのカード」から文言や画像を整えてください。');
        return true;
      }
      return false;
    }
    function builderPlanInput(el, isChange) {
      const b = state.builder;
      if (b.sel.type !== 'plan') return false;
      const plan = b.plans[b.sel.index];
      if (!plan) return false;
      if (el.dataset.plan !== undefined) {
        plan[el.dataset.plan] = el.value;
        if (el.dataset.plan === 'from' || el.dataset.plan === 'to') builderPlanSyncCard(plan);
        if (el.dataset.plan === 'name') { const card = plan.cardId && b.cards.find(function (c) { return c.id === plan.cardId; }); if (card && (!card.title || card.title === plan.prevName)) card.title = el.value; plan.prevName = el.value; }
        builderChanged(isChange && el.dataset.plan !== 'name' && el.dataset.plan !== 'note');
        return true;
      }
      if (el.dataset.planCat !== undefined && isChange) {
        const c = plan.cats[Number(el.dataset.planCat)];
        c[el.dataset.pp] = el.value;
        if (el.dataset.pp === 'g') { c.m = ''; c.s = ''; }
        if (el.dataset.pp === 'm') c.s = '';
        builderChanged(true);
        return true;
      }
      if (el.dataset.planq !== undefined && !isChange) {
        b.planQuery = el.value;
        const hits = document.querySelector('[data-plan-hits]');
        if (hits) hits.innerHTML = builderPlanHits(plan);
        return true;
      }
      return false;
    }
    function builderPlanErrors() {
      const out = [];
      state.builder.plans.forEach(function (p) {
        const nm = '企画「' + (p.name || '名前なし') + '」';
        if (!p.name.trim()) out.push('企画: 名前を入れてください');
        if (p.from && p.to && p.from > p.to) out.push(nm + ': 「いつから」が「いつまで」より後になっています');
        if (!p.from && !p.to) out.push(nm + ': 期間（いつから・いつまで）を入れてください');
        if (p.cats.some(function (c) { return !c.g; })) out.push(nm + ': カテゴリーを選んでいない行があります');
      });
      return out;
    }
    function builderPlanExport() {
      return state.builder.plans.map(function (p) {
        return { id: p.id, kind: p.kind, name: p.name.trim(), from: p.from, to: p.to, cats: p.cats.filter(function (c) { return c.g; }), ids: p.ids.slice(), exclude: p.exclude.slice(), cardId: p.cardId || undefined, note: p.note || undefined, members: builderPlanMembers(p).map(function (m) { return m.id; }) };
      });
    }
    // カードの画面の下に出す: このカードから企画を作る／つながっている企画
    function builderPlanCardHint(card) {
      const b = state.builder;
      const i = b.plans.findIndex(function (p) { return p.cardId === card.id; });
      if (i >= 0) return '<h3>企画</h3><p>企画「' + escapeHtml(b.plans[i].name || '名前なし') + '」とつながっています。表示期間は企画の期間にそろいます。</p><button type="button" data-b="select" data-type="plan" data-index="' + i + '">企画を開く</button>';
      if ((card.kind || 'products') === 'features') return '';
      return '<h3>企画</h3><p class="muted">このカードの期間・商品を、季節・イベント・セールの企画として管理できます。企画にすると、入っている商品の販売期間がそろいます。</p><button type="button" class="add" data-b="plan-from-card">このカードから企画を作る</button>';
    }
