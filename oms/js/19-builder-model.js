// Luna Luce OMS 部品JS: 19-builder-model（サイトビルダーのデータ・検査・書き出し。画面は20〜23）
// データの元は builder-data.json（tools/oms-builder-data.cjs が site-src から作る）。
// 担当者はJSONを触らない。書き出しは site-builder-draft.json 1つにまとめ、tools/oms-builder-apply.cjs で site-src に反映する。
    const BUILDER_IMAGE_BASE = '../';
    const BUILDER_KINDS = {
      products: { label: '商品4つのカード', short: '商品' },
      features: { label: '特集一覧のカード', short: '特集' },
      campaign: { label: 'キャンペーンのカード', short: 'キャンペーン' }
    };
    const BUILDER_PAGES = [
      ['', 'リンクなし'],
      ['feature-list.html', '特集の一覧'],
      ['new-arrivals.html', '新着商品'],
      ['sale.html', '数量限定・特価'],
      ['campaign.html', 'キャンペーン'],
      ['name-preview.html', '名入れお試し'],
      ['contact.html', 'お問い合わせ'],
      ['shopping-guide.html', 'ご利用ガイド'],
      ['shipping.html', '送料・お届け'],
      ['news.html', 'お知らせ']
    ];
    const BUILDER_STORE_KEY = 'luna-oms-builder-draft-v1';

    state.builder = { ready: false, error: '', themes: [], cards: [], notices: [], products: [], images: [], sel: { type: 'ticker', index: 0 }, query: {}, base: '' };

    function builderSnapshot() {
      const b = state.builder;
      return JSON.stringify({ themes: b.themes.filter(function (t) { return !t.builtIn; }), cards: b.cards, notices: b.notices });
    }
    function builderDirty() {
      return state.builder.ready && builderSnapshot() !== state.builder.base;
    }
    function builderSave() {
      try { localStorage.setItem(BUILDER_STORE_KEY, builderSnapshot()); } catch (e) { /* 保存できない環境では何もしない */ }
    }
    function builderChanged(repaintForm) {
      builderSave();
      emit('oms:builder', { form: !!repaintForm });
    }
    function loadBuilder() {
      fetch('builder-data.json').then(function (res) {
        if (!res.ok) throw new Error('builder-data.json を読めません');
        return res.json();
      }).then(function (data) {
        const b = state.builder;
        b.themes = data.themes.map(cloneData);
        b.cards = data.cards.map(function (card) { const c = cloneData(card); delete c.inManifest; return c; });
        b.notices = cloneData(data.notices.notices || []);
        b.products = data.products;
        b.images = data.images;
        b.base = builderSnapshot();
        try {
          const saved = JSON.parse(localStorage.getItem(BUILDER_STORE_KEY) || 'null');
          if (saved && Array.isArray(saved.cards)) {
            b.cards = saved.cards;
            b.notices = saved.notices || b.notices;
            b.themes = b.themes.filter(function (t) { return t.builtIn; }).concat(saved.themes || []);
          }
        } catch (e) { /* 下書きが壊れていたら元データのまま */ }
        b.ready = true;
        emit('oms:builder', { form: true });
      }).catch(function (err) {
        state.builder.error = err.message;
        emit('oms:builder', { form: true });
      });
    }
    function builderResetDraft() {
      try { localStorage.removeItem(BUILDER_STORE_KEY); } catch (e) { /* 何もしない */ }
      state.builder.ready = false;
      state.builder.sel = { type: 'ticker', index: 0 };
      loadBuilder();
    }

    function builderTheme(id) {
      return state.builder.themes.find(function (t) { return t.id === id; }) || state.builder.themes[0];
    }
    function builderProduct(id) {
      return state.builder.products.find(function (p) { return p.id === String(id); });
    }
    function builderImg(src) {
      return src ? BUILDER_IMAGE_BASE + src : '';
    }
    function builderSelected() {
      const s = state.builder.sel;
      if (s.type === 'card') return state.builder.cards[s.index];
      if (s.type === 'theme') return state.builder.themes[s.index];
      return null;
    }

    // 日付: 画面では「開始日」「最終日」で選び、保存は時差付きISO（終了は最終日の翌日0時・含まない）
    function builderDateOf(iso) {
      if (!iso) return '';
      const t = Date.parse(iso);
      if (!Number.isFinite(t)) return '';
      return new Date(t + 9 * 3600000).toISOString().slice(0, 10);
    }
    function builderIsoOf(date) {
      return date ? date + 'T00:00:00+09:00' : '';
    }
    function builderLastDayOf(endIso) {
      if (!endIso) return '';
      const t = Date.parse(endIso);
      return Number.isFinite(t) ? builderDateOf(new Date(t - 86400000).toISOString()) : '';
    }
    function builderEndIsoOf(lastDay) {
      if (!lastDay) return '';
      const next = new Date(Date.parse(lastDay + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
      return builderIsoOf(next);
    }
    function builderDaysLeft(card, nowIso) {
      if (!card.endsAt) return null;
      return Math.ceil((Date.parse(card.endsAt) - Date.parse(nowIso)) / 86400000);
    }
    function builderOnNow(item, nowIso) {
      const now = Date.parse(nowIso);
      if (item.active === false) return false;
      if (item.startsAt && Date.parse(item.startsAt) > now) return false;
      if (item.endsAt && Date.parse(item.endsAt) <= now) return false;
      return true;
    }

    function builderLocalLink(href) {
      return /^[a-z0-9][a-z0-9-]*\.html(?:[?#][^\s"'<>]*)?$/.test(href || '');
    }
    function builderPeriodErrors(item, required) {
      const out = [];
      if (required && (!item.startsAt || !item.endsAt)) out.push('開始日と最終日を選んでください');
      if (item.startsAt && item.endsAt && Date.parse(item.startsAt) >= Date.parse(item.endsAt)) out.push('最終日が開始日より前です');
      return out;
    }
    function builderCardErrors(card) {
      const out = [];
      if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(card.id)) out.push('カードの名前（英小文字・数字・-）を確認してください');
      if (state.builder.cards.filter(function (c) { return c.id === card.id; }).length > 1) out.push('同じ名前のカードがあります');
      if (!(card.title || '').trim()) out.push('題名を入れてください');
      if (!(card.text || '').trim()) out.push('一文を入れてください');
      if (!(card.cta || '').trim()) out.push('ボタンの文字を入れてください');
      if (!builderLocalLink(card.href)) out.push('ボタンのリンク先を選んでください');
      if (!state.builder.themes.some(function (t) { return t.id === card.theme; })) out.push('色のテーマを選んでください');
      if (card.kind === 'features') {
        if (!(card.tiles || []).length) out.push('特集を1つ以上入れてください');
        (card.tiles || []).forEach(function (tile, i) {
          if (!(tile.label || '').trim() || !builderLocalLink(tile.href) || !tile.image) out.push('特集' + (i + 1) + 'の名前・リンク・画像を確認してください');
        });
      } else {
        const ids = (card.ids || []).filter(Boolean);
        if (ids.length !== 4) out.push('商品を4つ選んでください');
        if (new Set(ids).size !== ids.length) out.push('同じ商品が2回入っています');
        ids.forEach(function (id) { if (!builderProduct(id)) out.push('商品 ' + id + ' は掲載中の商品にありません'); });
        if (card.kind === 'campaign' && !(card.badge || '').trim()) out.push('キャンペーンの目印（例: 5円ご縁、10%OFF）を入れてください');
      }
      return out.concat(builderPeriodErrors(card, card.kind === 'campaign'));
    }
    function builderNoticeErrors() {
      const out = [];
      state.builder.notices.forEach(function (n, i) {
        const label = '流れる文言' + (i + 1) + ': ';
        if (!(n.text || '').trim()) out.push(label + '文を入れてください');
        if (n.href && !builderLocalLink(n.href)) out.push(label + 'リンク先を選び直してください');
        builderPeriodErrors(n, false).forEach(function (e) { out.push(label + e); });
      });
      return out;
    }
    function builderThemeErrors(theme) {
      const out = [];
      if (!/^[a-z][a-z0-9-]{1,20}$/.test(theme.id)) out.push('テーマの名前（英小文字）を確認してください');
      if (state.builder.themes.filter(function (t) { return t.id === theme.id; }).length > 1) out.push('同じ名前のテーマがあります');
      if (!(theme.name || '').trim()) out.push('表示名を入れてください');
      ['background', 'border', 'top', 'accent'].forEach(function (k) { if (!/^#[0-9a-f]{6}$/i.test(theme[k] || '')) out.push('色を選んでください'); });
      return out;
    }
    function builderAllErrors() {
      const out = builderNoticeErrors();
      state.builder.cards.forEach(function (card) {
        builderCardErrors(card).forEach(function (e) { out.push((card.title || card.id) + ': ' + e); });
      });
      state.builder.themes.filter(function (t) { return !t.builtIn; }).forEach(function (t) {
        builderThemeErrors(t).forEach(function (e) { out.push('テーマ ' + (t.name || t.id) + ': ' + e); });
      });
      return out;
    }

    function builderNewCard(kind) {
      const n = state.builder.cards.length + 1;
      const card = { id: kind + '-' + n, active: false, kind: kind, theme: kind === 'campaign' ? 'rose' : 'cream', title: '', text: '', href: '', cta: '' };
      if (kind === 'features') card.tiles = [];
      else { card.image = ''; card.ids = ['', '', '', '']; }
      if (kind === 'campaign') { card.badge = ''; card.showCountdown = true; card.startsAt = ''; card.endsAt = ''; card.timeZone = 'Asia/Tokyo'; }
      while (state.builder.cards.some(function (c) { return c.id === card.id; })) card.id += '-2';
      return card;
    }
    function builderExportPayload() {
      const b = state.builder;
      return {
        schemaVersion: 1,
        kind: 'luna-site-builder-draft',
        exportedAt: new Date().toISOString(),
        manifest: b.cards.map(function (c) { return c.id; }),
        cards: b.cards.map(function (c) {
          const out = cloneData(c);
          if (out.kind === 'products') delete out.kind;
          ['startsAt', 'endsAt'].forEach(function (k) { if (!out[k]) delete out[k]; });
          if (!out.startsAt && !out.endsAt) delete out.timeZone;
          return out;
        }),
        notices: b.notices.map(function (n) {
          const out = cloneData(n);
          ['href', 'startsAt', 'endsAt'].forEach(function (k) { if (!out[k]) delete out[k]; });
          return out;
        }),
        themes: b.themes.filter(function (t) { return !t.builtIn; }).map(function (t) {
          return { id: t.id, name: t.name, background: t.background, border: t.border, top: t.top, accent: t.accent };
        })
      };
    }
