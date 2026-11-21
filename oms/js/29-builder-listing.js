// Luna Luce OMS 部品JS: 29-builder-listing（出す・出さない と 販売期間）
// 在庫の画面で、商品ごとに「サイトに出す／出さない」と「いつから・いつまで出すか」を決める。
// 対象: 新サイトの商品（site）・本店にあって新サイトにまだない商品（w、builder-unlisted.json）・この下書きの新しい商品（new）。
// 企画（30-builder-plans）に入っている商品は、期間が企画の期間にそろう（ここでは変えられない）。
    const LISTING_STATES = [
      { id: 'on', short: '出店中', label: '出す' },
      { id: 'todo', short: '未出店（まだ決めていない）', label: 'まだ決めていない' },
      { id: 'off', short: '出さない', label: '出さない' }
    ];
    function builderLoadUnlisted() {
      const b = state.builder;
      if (b.unlisted || b.unlistedLoading) return;
      b.unlistedLoading = true;
      fetch('builder-unlisted.json').then(function (res) {
        if (!res.ok) throw new Error('builder-unlisted.json を読めません');
        return res.json();
      }).then(function (data) {
        b.unlisted = data.products || [];
        b.unlistedLoading = false;
        emit('oms:builder', { form: true });
      }).catch(function (err) {
        b.unlistedLoading = false;
        b.unlisted = [];
        b.unlistedError = err.message;
        emit('oms:builder', { form: true });
      });
    }
    // 決める対象の商品をぜんぶ（新しい商品 → 新サイト → 本店だけの商品）
    function builderListingItems() {
      const b = state.builder;
      builderLoadUnlisted();
      const out = b.newProducts.filter(function (p) { return !p.edit; }).map(function (p) {
        return { id: p.id, code: p.code || '', title: p.title || '（商品名なし）', price: Math.min.apply(null, p.skus.map(function (s) { return Number(s.price) || 0; })), image: p.image || '', src: 'new' };
      });
      b.products.forEach(function (p) { out.push({ id: p.id, code: p.code || '', title: p.title, price: p.price, image: p.image, src: 'site' }); });
      (b.unlisted || []).forEach(function (p) { out.push({ id: p.id, code: p.code, title: p.title, price: p.price, image: '', src: 'w', cat: p.cat }); });
      return out;
    }
    function builderDraftOf(id) {
      return state.builder.newProducts.find(function (p) { return p.id === String(id); });
    }
    // その商品の決まり: { on: on/todo/off, from, to, plans: [企画], lock: 企画で期間が決まるか }
    function builderListingOf(item) {
      const b = state.builder;
      const draft = builderDraftOf(item.id);
      const rec = b.listing[item.id] || {};
      const r = { on: '', from: '', to: '', plans: builderPlansOf(item.id), lock: false };
      if (draft && !draft.edit) r.on = draft.active === false ? 'off' : 'on';
      else r.on = rec.on || (item.src === 'w' ? 'todo' : 'on');
      r.from = draft ? draft.saleFrom || '' : rec.from || '';
      r.to = draft ? draft.saleTo || '' : rec.to || '';
      const dated = r.plans.filter(function (pl) { return pl.from || pl.to; });
      if (dated.length) {
        r.lock = true;
        r.from = dated.some(function (pl) { return !pl.from; }) ? '' : dated.map(function (pl) { return pl.from; }).sort()[0];
        r.to = dated.some(function (pl) { return !pl.to; }) ? '' : dated.map(function (pl) { return pl.to; }).sort().pop();
      }
      if (r.plans.length && r.on === 'todo') r.on = 'on';
      return r;
    }
    function builderSetListing(id, patch) {
      const b = state.builder;
      const draft = builderDraftOf(id);
      if (draft) {
        if (patch.on !== undefined && !draft.edit) draft.active = patch.on !== 'off';
        if (patch.from !== undefined) draft.saleFrom = patch.from;
        if (patch.to !== undefined) draft.saleTo = patch.to;
        if (draft.edit && patch.on !== undefined) b.listing[id] = Object.assign({}, b.listing[id], { on: patch.on });
        return;
      }
      const next = Object.assign({}, b.listing[id], patch);
      Object.keys(next).forEach(function (k) { if (!next[k]) delete next[k]; });
      const item = builderProduct(id);
      if (next.on === (item ? 'on' : 'todo')) delete next.on;
      if (Object.keys(next).length) b.listing[id] = next; else delete b.listing[id];
    }
    function builderPeriodText(from, to) {
      const f = function (d) { return d ? d.slice(5).replace('-', '/') : ''; };
      if (!from && !to) return 'いつでも';
      return (from ? f(from) + 'から' : '') + (to ? f(to) + 'まで' : '');
    }
    // いま出ているか: 出す と決めて、期間の中にあるとき
    function builderListingNow(lst, today) {
      if (lst.on !== 'on') return lst.on;
      if (lst.from && today < lst.from) return 'before';
      if (lst.to && today > lst.to) return 'after';
      return 'on';
    }
    function builderListingFilterOk(lst, filter, today) {
      if (!filter) return true;
      if (filter === 'period') return !!(lst.from || lst.to);
      if (filter === 'on') return lst.on === 'on';
      return lst.on === filter;
    }
    // 在庫の画面の行の右側: 出す・出さない と 期間
    function builderListingCtl(item, lst) {
      const opts = LISTING_STATES.filter(function (s) { return s.id !== 'todo' || item.src === 'w'; });
      let html = '<label class="lst"><span>サイトに</span><select data-listing="' + escapeHtml(item.id) + '" aria-label="サイトに出すか">' + opts.map(function (s) { return '<option value="' + s.id + '"' + (s.id === lst.on ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>'; }).join('') + '</select></label>';
      if (lst.lock) {
        html += '<p class="lst-plan">企画「' + escapeHtml(lst.plans.map(function (p) { return p.name || '名前なし'; }).join('・')) + '」で ' + escapeHtml(builderPeriodText(lst.from, lst.to)) + '</p>';
      } else if (lst.on !== 'off') {
        html += '<span class="lst-dates"><label><span>いつから</span><input type="date" data-listing-from="' + escapeHtml(item.id) + '" value="' + escapeHtml(lst.from) + '"></label><label><span>いつまで</span><input type="date" data-listing-to="' + escapeHtml(item.id) + '" value="' + escapeHtml(lst.to) + '"></label></span>';
      }
      return html;
    }
    function builderListingChange(el) {
      if (el.dataset.listing !== undefined) { builderSetListing(el.dataset.listing, { on: el.value }); builderChanged(true); return true; }
      if (el.dataset.listingFrom !== undefined) { builderSetListing(el.dataset.listingFrom, { from: el.value }); builderChanged(true); return true; }
      if (el.dataset.listingTo !== undefined) { builderSetListing(el.dataset.listingTo, { to: el.value }); builderChanged(true); return true; }
      return false;
    }
    // 商品の登録・編集の画面に出す「販売期間」
    function builderSalePeriodBlock(p) {
      const lst = builderListingOf({ id: p.id, src: p.edit ? 'site' : 'new' });
      if (lst.lock) return '<p class="lst-plan">この商品は企画「' + escapeHtml(lst.plans.map(function (x) { return x.name || '名前なし'; }).join('・')) + '」に入っているので、販売期間は企画にそろいます（' + escapeHtml(builderPeriodText(lst.from, lst.to)) + '）。変えるときは企画の画面で直してください。</p>';
      return '<div class="row">' + builderField('いつから（空ならすぐ）', 'saleFrom', p.saleFrom || '', { type: 'date' }) + builderField('いつまで（空ならずっと）', 'saleTo', p.saleTo || '', { type: 'date', hint: 'この日の終わりまで出します' }) + '</div>';
    }
    function builderListingErrors() {
      const out = [];
      const b = state.builder;
      Object.keys(b.listing).forEach(function (id) {
        const r = b.listing[id];
        if (r.from && r.to && r.from > r.to) out.push('商品番号 ' + id + ' の販売期間: 「いつから」が「いつまで」より後になっています');
      });
      b.newProducts.forEach(function (p) {
        if (p.saleFrom && p.saleTo && p.saleFrom > p.saleTo) out.push((p.title || p.id) + ' の販売期間: 「いつから」が「いつまで」より後になっています');
      });
      return out;
    }
    // 書き出す形: 決めた商品・期間のある商品・企画に入っている商品だけ
    function builderListingExport() {
      const b = state.builder;
      if (!b.unlisted && !Object.keys(b.listing).length && !b.plans.length) return [];
      const out = builderListingItems().map(function (item) {
        const lst = builderListingOf(item);
        const touched = b.listing[item.id] || lst.plans.length || lst.from || lst.to;
        if (!touched) return null;
        return { id: item.id, code: item.code, source: item.src, on: lst.on, from: lst.from || undefined, to: lst.to || undefined, plans: lst.plans.length ? lst.plans.map(function (p) { return p.id; }) : undefined };
      }).filter(Boolean);
      // 本店だけの商品の一覧をまだ読み込めていないときも、決めた分は落とさない
      Object.keys(b.listing).forEach(function (id) {
        if (!out.some(function (x) { return x.id === id; })) out.push(Object.assign({ id: id, source: 'w' }, b.listing[id]));
      });
      return out;
    }
