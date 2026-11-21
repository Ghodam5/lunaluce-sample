// Luna Luce OMS 部品JS: 28-builder-categories（カテゴリーを新しく作る）
// 商品の登録・編集の「カテゴリー（大・中・小）」から、今ないカテゴリーを作れる。
// 英字の名前（例: towel）はサイトのURLと商品コード（ll-<中カテゴリーの英字>-001）に使うので、作るときに決める。
// 作ったカテゴリーは下書きの newCategories に入り、書き出すとサイトの反映ツールとWelcartの受け取りプラグインが使う。
    const CAT_KEY_RE = /^[a-z][a-z0-9]{1,15}$/;
    // いまある英字の名前（大・中・小すべて）
    function builderCatKeys() {
      const keys = ['all', 'nairi', 'petit'];
      state.builder.links.categories.forEach(function (g) {
        keys.push(g.k);
        g.mids.forEach(function (m) { keys.push(m.k); m.subs.forEach(function (s) { keys.push(s[0]); }); });
      });
      return keys;
    }
    function builderCatKeyCheck(k, extra) {
      if (!k) return '英字の名前を入れてください';
      if (!CAT_KEY_RE.test(k)) return '英字の名前は英小文字で始めて、英小文字・数字だけで2〜16文字にしてください（例: towel）';
      if (builderCatKeys().concat(extra || []).indexOf(k) >= 0) return '「' + k + '」はもう使われています。別の名前にしてください';
      return '';
    }
    // 新しい中カテゴリー: その英字の名前を印（subs）にして並べる
    function builderCatMid(k, name) {
      return { k: k, name: name, isNew: true, place: { categories: [], subs: [k], count: 0, titleHint: '', ok: true }, subs: [] };
    }
    // 下書きの newCategories を、選べるカテゴリーの一覧（links.categories）に足す
    function builderApplyNewCats() {
      const b = state.builder;
      (b.newCats || []).forEach(function (c) {
        const cats = b.links.categories;
        if (c.level === 'g') {
          if (!cats.some(function (g) { return g.k === c.k; })) cats.push({ k: c.k, name: c.name, isNew: true, mids: [builderCatMid(c.mid.k, c.mid.name)] });
          return;
        }
        const g = cats.find(function (x) { return x.k === c.g; });
        if (!g) return;
        if (c.level === 'm') {
          if (!g.mids.some(function (m) { return m.k === c.k; })) g.mids.push(builderCatMid(c.k, c.name));
          return;
        }
        const m = g.mids.find(function (x) { return x.k === c.m; });
        if (m && !m.subs.some(function (s) { return s[0] === c.k; })) m.subs.push([c.k, c.name, { categories: m.place.categories.slice(), subs: m.place.subs.concat([c.k]), count: 0, titleHint: '', ok: true, isNew: true }]);
      });
    }
    // 新しいカテゴリーを外す（下書きの商品で使っていたら外さない）
    function builderCatUsed(c) {
      return state.builder.newProducts.some(function (p) {
        return (p.places || []).some(function (pl) { return c.level === 'g' ? pl.g === c.k : c.level === 'm' ? pl.g === c.g && pl.m === c.k : pl.m === c.m && pl.s === c.k; });
      });
    }
    function builderCatLabel(c) {
      const g = state.builder.links.categories.find(function (x) { return x.k === (c.level === 'g' ? c.k : c.g); });
      if (c.level === 'g') return c.name + ' › ' + c.mid.name + '（大・中）';
      if (c.level === 'm') return (g ? g.name : c.g) + ' › ' + c.name + '（中）';
      const m = g && g.mids.find(function (x) { return x.k === c.m; });
      return (g ? g.name : c.g) + ' › ' + (m ? m.name : c.m) + ' › ' + c.name + '（小）';
    }
    // カテゴリーの欄の下に出す「新しいカテゴリーを作る」
    function builderCatCreator(p) {
      const b = state.builder;
      const list = (b.newCats || []).length ? '<ul class="newcat-list">' + b.newCats.map(function (c, i) {
        return '<li><span>新しく作ったカテゴリー: ' + escapeHtml(builderCatLabel(c)) + ' <code>' + escapeHtml(c.level === 'g' ? c.k + '/' + c.mid.k : c.k) + '</code></span><button type="button" data-b="cat-remove" data-index="' + i + '">取り消す</button></li>';
      }).join('') + '</ul>' : '';
      if (!b.catOpen) return list + '<button type="button" class="add" data-b="cat-open">＋ 新しいカテゴリーを作る</button>';
      const f = b.catDraft || (b.catDraft = { level: 'm', g: '', m: '' });
      const gSel = '<label class="fld"><span>どの大カテゴリーの中に</span><select data-catd="g"><option value="">選んでください</option>' + b.links.categories.map(function (g) { return '<option value="' + escapeHtml(g.k) + '"' + (g.k === f.g ? ' selected' : '') + '>' + escapeHtml(g.name) + '</option>'; }).join('') + '</select></label>';
      const g = b.links.categories.find(function (x) { return x.k === f.g; });
      const mSel = '<label class="fld"><span>どの中カテゴリーの中に</span><select data-catd="m"><option value="">選んでください</option>' + (g ? g.mids.map(function (m) { return '<option value="' + escapeHtml(m.k) + '"' + (m.k === f.m ? ' selected' : '') + '>' + escapeHtml(m.name) + '</option>'; }).join('') : '') + '</select></label>';
      const nameRow = function (label, nameKey, keyKey, ph) {
        return '<div class="row"><label class="fld"><span>' + escapeHtml(label) + 'の名前（画面に出る名前）</span><input type="text" data-catd="' + nameKey + '" value="' + escapeHtml(f[nameKey] || '') + '" maxlength="30" placeholder="' + escapeHtml(ph[0]) + '"></label>' +
          '<label class="fld"><span>英字の名前（URL・商品コードに使う）</span><input type="text" data-catd="' + keyKey + '" value="' + escapeHtml(f[keyKey] || '') + '" maxlength="16" placeholder="' + escapeHtml(ph[1]) + '" autocapitalize="off" spellcheck="false"></label></div>';
      };
      let body = '';
      if (f.level === 'm') body = gSel + nameRow('中カテゴリー', 'name', 'k', ['例: タオル', '例: towel']);
      else if (f.level === 's') body = gSel + mSel + nameRow('小カテゴリー', 'name', 'k', ['例: フェイスタオル', '例: facetowel']);
      else body = nameRow('大カテゴリー', 'name', 'k', ['例: 生活雑貨', '例: living']) + nameRow('その中の中カテゴリー', 'midName', 'midK', ['例: タオル', '例: towel']) + '<small class="muted">大カテゴリーには商品を直接並べられないので、中カテゴリーも一緒に作ります。</small>';
      const code = f.level === 'g' ? f.midK : f.level === 'm' ? f.k : (g && f.m) || '';
      return list + '<div class="newcat"><h4>新しいカテゴリーを作る</h4>' +
        '<div class="newcat-level" role="radiogroup" aria-label="作るカテゴリー">' + [['m', '中カテゴリー'], ['s', '小カテゴリー'], ['g', '大カテゴリー（中も一緒に）']].map(function (x) {
          return '<label class="switch"><input type="radio" name="catlevel" data-catd="level" value="' + x[0] + '"' + (f.level === x[0] ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
        }).join('') + '</div>' + body +
        (code ? '<p class="muted">この中の商品コードは <b>ll-' + escapeHtml(code) + '-001</b> のようになります。</p>' : '') +
        '<p class="code-check is-error" data-caterr hidden></p>' +
        '<div class="row"><button type="button" class="primary" data-b="cat-create">このカテゴリーを作って選ぶ</button><button type="button" data-b="cat-cancel">やめる</button></div></div>';
    }
    function builderCatAction(name, el) {
      const b = state.builder;
      if (name === 'cat-open') { b.catOpen = true; b.catDraft = { level: 'm', g: '', m: '' }; emit('oms:builder', { form: true }); return true; }
      if (name === 'cat-cancel') { b.catOpen = false; b.catDraft = null; emit('oms:builder', { form: true }); return true; }
      if (name === 'cat-remove') {
        const c = b.newCats[Number(el.dataset.index)];
        if (!c) return true;
        if (builderCatUsed(c)) { showToast('このカテゴリーを選んでいる商品があります。先にその商品のカテゴリーを変えてください。'); return true; }
        b.newCats.splice(Number(el.dataset.index), 1);
        builderReloadCats();
        builderChanged(true);
        return true;
      }
      if (name === 'cat-create') {
        const f = b.catDraft || {};
        const errs = [];
        const name1 = (f.name || '').trim();
        if (!name1) errs.push('名前を入れてください');
        if ((f.level === 'm' || f.level === 's') && !f.g) errs.push('大カテゴリーを選んでください');
        if (f.level === 's' && !f.m) errs.push('中カテゴリーを選んでください');
        const e1 = builderCatKeyCheck(f.k);
        if (e1) errs.push(e1);
        if (f.level === 'g') {
          if (!(f.midName || '').trim()) errs.push('中カテゴリーの名前を入れてください');
          const e2 = builderCatKeyCheck(f.midK, [f.k]);
          if (e2) errs.push('中カテゴリー: ' + e2);
        }
        const out = document.querySelector('[data-caterr]');
        if (errs.length) { if (out) { out.hidden = false; out.textContent = errs.join(' ／ '); } return true; }
        const c = f.level === 'g' ? { level: 'g', k: f.k, name: name1, mid: { k: f.midK, name: f.midName.trim() } } : f.level === 'm' ? { level: 'm', g: f.g, k: f.k, name: name1 } : { level: 's', g: f.g, m: f.m, k: f.k, name: name1 };
        b.newCats = (b.newCats || []).concat([c]);
        builderApplyNewCats();
        // いま編集している商品の、空いている（か1つ目の）カテゴリーに選んでおく
        const p = b.sel.type === 'product' ? builderSelected() : null;
        if (p) {
          if (p.edit) p.placesTouched = true;
          let pl = p.places.find(function (x) { return !x.g; }) || p.places[0];
          if (!pl) { pl = { g: '', m: '', s: '' }; p.places.push(pl); }
          if (c.level === 'g') { pl.g = c.k; pl.m = c.mid.k; pl.s = ''; }
          else if (c.level === 'm') { pl.g = c.g; pl.m = c.k; pl.s = ''; }
          else { pl.g = c.g; pl.m = c.m; pl.s = c.k; }
          builderCodeAuto(p);
        }
        b.catOpen = false;
        b.catDraft = null;
        builderChanged(true);
        showToast('カテゴリー「' + builderCatLabel(c) + '」を作りました。書き出すとサイトとWelcartに入ります。');
        return true;
      }
      return false;
    }
    // 入力欄（作りかけの内容）。種類や大カテゴリーを変えたら描き直す
    function builderCatInput(el, isChange) {
      const b = state.builder;
      if (el.dataset.catd === undefined || !b.catDraft) return false;
      const k = el.dataset.catd;
      b.catDraft[k] = k === 'k' || k === 'midK' ? el.value.trim().toLowerCase() : el.value;
      if (k === 'g') b.catDraft.m = '';
      if (isChange && (k === 'level' || k === 'g' || k === 'm')) emit('oms:builder', { form: true });
      return true;
    }
    // 取り消したときは、元の一覧を読み直してから足し直す
    function builderReloadCats() {
      fetch('builder-data.json').then(function (res) { return res.json(); }).then(function (data) {
        state.builder.links.categories = data.links.categories;
        builderApplyNewCats();
        emit('oms:builder', { form: true });
      });
    }
