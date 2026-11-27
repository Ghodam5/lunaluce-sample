// Luna Luce OMS 部品JS: 10-channel-match（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function matchPrice(amount) {
      if (amount == null || amount === '') return '価格なし';
      return formatYen(amount);
    }
    function matchLinkText(label) {
      const names = {
        'code=manage': '本店の商品コード = 楽天の商品管理番号',
        'code=item': '本店の商品コード = 楽天の商品番号',
        'code=sku': '本店の商品コード = 楽天のSKU管理番号',
        'sku=manage': '本店のSKU = 楽天の商品管理番号',
        'sku=item': '本店のSKU = 楽天の商品番号',
        'sku=sku': '本店のSKU = 楽天のSKU管理番号'
      };
      return names[label] || label;
    }
    function matchPassText(pass) {
      if (pass === 'case') return '大文字と小文字だけが違います。同一にはしていません。';
      if (pass === 'hyphen') return 'ハイフンとアンダースコアだけが違います。同一にはしていません。';
      if (pass === 'shared_code') return 'その番号は、同じ販路の中で複数の商品に付いています。自動ではまとめていません。';
      return pass;
    }
    function matchFlagText(flag) {
      if (flag === 'one_to_many') return '1対多';
      if (flag === 'in_channel_duplicate') return '販路内で番号が重複';
      if (flag === 'delete_candidate') return '削除候補（両方停止）';
      return flag;
    }
    function renderChannelMatch(host) {
      let pack = null;
      let query = '';
      let status = 'loading';
      let index = null;
      host.innerHTML = '<section class="panel"><h2>本店と楽天の突き合わせ</h2><p class="lead">名前か、本店の商品コード・SKU、楽天の商品管理番号・商品番号・SKU管理番号で探します。一致した組は左右に並べます。大文字小文字、ハイフンとアンダースコア、販路内で重なった番号は候補で、同一にはしていません。価格はそれぞれの欄のままです。Yahooのファイルはないので空です。</p><div class="counts" data-counts></div><label class="query">商品名・番号<input data-action="match-query" type="search" placeholder="例: ペンダントクロック / j_b050 / fla208Heartydc" autocomplete="off" spellcheck="false"></label><p class="note" data-meta>突き合わせを読み込んでいます</p><div class="hits" data-hits></div></section>';
      const countsHost = host.querySelector('[data-counts]');
      const meta = host.querySelector('[data-meta]');
      const hits = host.querySelector('[data-hits]');

      function cluster(rows, key) {
        const order = [];
        const map = {};
        rows.forEach(function (row) {
          const id = String(row[key]);
          if (!map[id]) {
            map[id] = [];
            order.push(id);
          }
          map[id].push(row);
        });
        return order.map(function (id) { return map[id]; });
      }
      function field(label, value, wide) {
        return '<div' + (wide ? ' class="wide"' : '') + '><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
      }
      function plainName(value) {
        return String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
      }
      function welcartBlocks(rows) {
        const groups = cluster(rows, 'product_id');
        const shown = groups.slice(0, 8);
        const more = groups.length > shown.length ? '<p class="more">ほか ' + (groups.length - shown.length) + ' 商品</p>' : '';
        return shown.map(function (lines) {
          const head = lines[0];
          const skuLines = lines.slice(0, 8).map(function (line) {
            return field('SKU ' + line.id, (line.sku || 'なし') + ' · ' + matchPrice(line.price_tax_in), true);
          }).join('');
          const rest = lines.length > 8 ? '<p class="more">ほか SKU ' + (lines.length - 8) + ' 件</p>' : '';
          return '<div class="side-card"><h4>' + escapeHtml(plainName(head.name)) + '</h4><div class="grid">' + field('状態', head.status + ' · ' + (head.stock_status || 'なし')) + field('商品コード', head.code || 'なし') + skuLines + '</div>' + rest + '</div>';
        }).join('') + more;
      }
      function rakutenBlocks(rows) {
        const groups = cluster(rows, 'manage_no');
        const shown = groups.slice(0, 8);
        const more = groups.length > shown.length ? '<p class="more">ほか ' + (groups.length - shown.length) + ' 商品</p>' : '';
        return shown.map(function (lines) {
          const head = lines[0];
          const skuLines = lines.slice(0, 8).map(function (line) {
            const tax = line.tax == null || line.tax === '' ? '' : ' · 消費税フラグ ' + line.tax;
            const house = line.sku_warehouse === '1' ? ' · SKU倉庫指定 1' : '';
            return field('SKU管理番号 ' + line.id, (line.sku_no || 'なし') + ' · ' + matchPrice(line.price) + tax + house, true);
          }).join('');
          const rest = lines.length > 8 ? '<p class="more">ほか SKU ' + (lines.length - 8) + ' 件</p>' : '';
          return '<div class="side-card"><h4>' + escapeHtml(plainName(head.name)) + '</h4><div class="grid">' + field('状態', head.status || 'なし') + field('商品管理番号', head.manage_no || 'なし') + field('商品番号', head.item_no || 'なし') + skuLines + '</div>' + rest + '</div>';
        }).join('') + more;
      }
      function sides(welcartRows, rakutenRows) {
        const left = welcartRows.length ? welcartBlocks(welcartRows) : '<p class="empty">本店にはありません。</p>';
        const right = rakutenRows.length ? rakutenBlocks(rakutenRows) : '<p class="empty">楽天にはありません。</p>';
        return '<div class="sides"><section class="side"><h3>本店</h3>' + left + '</section><section class="side"><h3>楽天</h3>' + right + '</section></div><p class="yahoo">Yahoo なし</p>';
      }
      function candidateNote(item) {
        const pairs = (item.pairs || []).map(function (pair) {
          return matchLinkText(pair.link) + ' ' + (pair.welcart || '') + ' / ' + (pair.rakuten || '');
        }).join('。');
        return '<p class="note">' + escapeHtml(item.id + ' ' + matchPassText(item.pass) + (pairs ? ' ' + pairs : '')) + '</p>';
      }
      function groupCard(group) {
        const flags = (group.flags || []).map(function (flag) {
          const kind = flag === 'delete_candidate' ? ' is-stop' : (flag === 'one_to_many' ? ' is-wait' : '');
          return '<span class="tag' + kind + '">' + escapeHtml(matchFlagText(flag)) + '</span>';
        }).join('');
        const links = (group.links || []).map(matchLinkText).join('、');
        const wobble = group.other_field_wobble && group.other_field_wobble.length
          ? '<p class="note">別の番号欄は大文字小文字かハイフンが違います。その欄ではまとめていません。</p>'
          : '';
        const extras = (index.candidatesByGroup[group.id] || []).map(candidateNote).join('');
        const stopped = group.delete_candidate ? '<p class="note">削除候補の印だけです。商品は消していません。</p>' : '';
        return '<article class="card"><header><span class="tag">一致 ' + escapeHtml(group.id) + '</span>' + flags + '</header><p class="links">' + escapeHtml(links || '番号が一致') + '</p>' + wobble + stopped + sides(index.welcartByGroup[group.id] || [], index.rakutenByGroup[group.id] || []) + extras + '</article>';
      }
      function candidateCard(item) {
        const welcartRows = [];
        const rakutenRows = [];
        item.welcart_product_ids.forEach(function (id) {
          (index.welcartByProduct[id] || []).forEach(function (row) { welcartRows.push(row); });
        });
        item.rakuten_manage_nos.forEach(function (manage) {
          (index.rakutenByManage[manage] || []).forEach(function (row) { rakutenRows.push(row); });
        });
        const groupId = welcartRows[0] && welcartRows[0].group;
        const elsewhere = groupId ? '<p class="note">本店側の一致グループは ' + escapeHtml(groupId) + ' です。この候補とは別です。</p>' : '';
        return '<article class="card"><header><span class="tag is-wait">候補 ' + escapeHtml(item.id) + '</span><span class="tag is-wait">同一にしていない</span></header>' + candidateNote(item) + elsewhere + sides(welcartRows, rakutenRows) + '</article>';
      }
      function aloneCard(kind, rows) {
        const welcartRows = kind === 'welcart' ? rows : [];
        const rakutenRows = kind === 'rakuten' ? rows : [];
        const flags = (rows[0].flags || []).map(function (flag) {
          return '<span class="tag is-wait">' + escapeHtml(matchFlagText(flag)) + '</span>';
        }).join('');
        return '<article class="card"><header><span class="tag">片方だけ</span>' + flags + '</header>' + sides(welcartRows, rakutenRows) + '</article>';
      }
      function paintCounts() {
        if (!pack) {
          countsHost.innerHTML = '';
          return;
        }
        const counts = pack.counts || {};
        const chips = [
          '一致 ' + Number(counts.exact_groups || 0).toLocaleString('ja-JP') + '（1対1 ' + Number(counts.exact_groups_one_to_one || 0).toLocaleString('ja-JP') + '、1対多 ' + Number(counts.exact_groups_one_to_many || 0).toLocaleString('ja-JP') + '）',
          '候補 ' + Number((counts.case_candidates || 0) + (counts.hyphen_candidates || 0) + (counts.shared_code_candidates || 0)).toLocaleString('ja-JP'),
          '本店だけ ' + Number(counts.welcart_without_exact || 0).toLocaleString('ja-JP'),
          '楽天の販売中で本店なし ' + Number(counts.rakuten_on_sale_without_exact || 0).toLocaleString('ja-JP'),
          '削除候補 ' + Number(counts.delete_candidate_groups || 0).toLocaleString('ja-JP'),
          'Yahoo ' + Number(counts.yahoo_rows || 0).toLocaleString('ja-JP')
        ];
        countsHost.innerHTML = chips.map(function (chip) { return '<span>' + escapeHtml(chip) + '</span>'; }).join('');
      }
      function paintHits() {
        if (status !== 'ready') {
          hits.innerHTML = '<p class="empty">' + escapeHtml(status === 'error' ? '突き合わせを出せません' : '読み込みが終わるまでお待ちください') + '</p>';
          return;
        }
        const q = foldText(query);
        if (!q) {
          hits.innerHTML = '<p class="empty">名前か番号を入れると、組と左右の状態・価格・番号が出ます。</p>';
          return;
        }
        const groups = {};
        const candidates = {};
        const aloneW = {};
        const aloneR = {};
        index.welcart.forEach(function (row) {
          if (row.hay.indexOf(q) === -1) return;
          if (row.group) groups[row.group] = true;
          else if ((index.candidatesByProduct[row.product_id] || []).length) {
            index.candidatesByProduct[row.product_id].forEach(function (item) { candidates[item.id] = item; });
          } else aloneW[row.product_id] = true;
        });
        index.rakuten.forEach(function (row) {
          if (row.hay.indexOf(q) === -1) return;
          if (row.group) groups[row.group] = true;
          else if ((index.candidatesByManage[row.manage_no] || []).length) {
            index.candidatesByManage[row.manage_no].forEach(function (item) {
              const owner = item.welcart_product_ids[0];
              const ownerRows = index.welcartByProduct[owner] || [];
              if (ownerRows[0] && ownerRows[0].group && groups[ownerRows[0].group]) return;
              candidates[item.id] = item;
            });
          } else aloneR[row.manage_no] = true;
        });
        const cards = [];
        Object.keys(groups).sort().forEach(function (id) {
          if (index.groupById[id]) cards.push(groupCard(index.groupById[id]));
        });
        Object.keys(candidates).sort().forEach(function (id) { cards.push(candidateCard(candidates[id])); });
        Object.keys(aloneW).forEach(function (id) { cards.push(aloneCard('welcart', index.welcartByProduct[id] || [])); });
        Object.keys(aloneR).forEach(function (id) { cards.push(aloneCard('rakuten', index.rakutenByManage[id] || [])); });
        if (!cards.length) {
          hits.innerHTML = '<p class="empty">該当する商品はありません。</p>';
          return;
        }
        const shown = cards.slice(0, 20);
        const more = cards.length > shown.length
          ? '<p class="more">該当 ' + cards.length + ' 件のうち先頭20件です。もう少し絞ってください。</p>'
          : '<p class="more">該当 ' + cards.length + ' 件</p>';
        hits.innerHTML = more + shown.join('');
      }
      function paint() {
        paintCounts();
        paintHits();
      }
      paint();
      on('oms:match-query', function (value) {
        query = value || '';
        paintHits();
      });
      const url = new URL('oms-channel-match.json', window.location.href);
      fetch(url.href).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      }).then(function (data) {
        if (!data || !Array.isArray(data.welcart) || !Array.isArray(data.rakuten)) throw new Error('match');
        pack = data;
        index = {
          welcart: data.welcart,
          rakuten: data.rakuten,
          groupById: {},
          welcartByProduct: {},
          rakutenByManage: {},
          welcartByGroup: {},
          rakutenByGroup: {},
          candidatesByProduct: {},
          candidatesByManage: {},
          candidatesByGroup: {}
        };
        data.groups.forEach(function (group) { index.groupById[group.id] = group; });
        data.welcart.forEach(function (row) {
          row.hay = foldText([row.id, row.product_id, row.name, row.code, row.sku, row.group].join(' '));
          (index.welcartByProduct[row.product_id] = index.welcartByProduct[row.product_id] || []).push(row);
          if (row.group) (index.welcartByGroup[row.group] = index.welcartByGroup[row.group] || []).push(row);
        });
        data.rakuten.forEach(function (row) {
          row.hay = foldText([row.id, row.name, row.manage_no, row.item_no, row.sku_no, row.group].join(' '));
          (index.rakutenByManage[row.manage_no] = index.rakutenByManage[row.manage_no] || []).push(row);
          if (row.group) (index.rakutenByGroup[row.group] = index.rakutenByGroup[row.group] || []).push(row);
        });
        (data.candidates || []).forEach(function (item) {
          item.welcart_product_ids.forEach(function (id) {
            (index.candidatesByProduct[id] = index.candidatesByProduct[id] || []).push(item);
            const rows = index.welcartByProduct[id] || [];
            if (rows[0] && rows[0].group) (index.candidatesByGroup[rows[0].group] = index.candidatesByGroup[rows[0].group] || []).push(item);
          });
          item.rakuten_manage_nos.forEach(function (manage) {
            (index.candidatesByManage[manage] = index.candidatesByManage[manage] || []).push(item);
          });
        });
        status = 'ready';
        const counts = data.counts || {};
        meta.textContent = '本店の公開商品 ' + Number(counts.welcart_products || 0).toLocaleString('ja-JP') + '、楽天 ' + Number(counts.rakuten_products || 0).toLocaleString('ja-JP') + '。価格は上書きしていません。';
        paint();
      }).catch(function () {
        status = 'error';
        meta.textContent = '同じフォルダの oms-channel-match.json を読めませんでした。';
        paintHits();
      });
    }
    function onMatchQuery(el) {
      emit('oms:match-query', el.value);
    }
