// Luna Luce OMS 部品JS: 25-channel-export（楽天・Yahoo用の一括登録CSVを作る）
// 下書きの商品（新しい商品と編集した商品）を、各店の「商品一括登録CSV」の形に並べ替える。
// 列の名前と中身は CHANNEL_COLUMNS にまとめた。店の画面からダウンロードした最新のCSVと見比べて、
// 違うところはここだけ直せばよい（試作。初回は各店のテスト用商品で取り込みを確かめてから使う）。
// 文字コードは両店とも Shift_JIS。ブラウザの TextDecoder から逆引き表を作って変換する（外部の部品は使わない）。
    const CHANNEL_NOTE = '試作: 各店の管理画面からダウンロードした最新のCSVと列名を見比べてから取り込んでください';
    function channelText(v) { return String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim(); }
    function channelHtml(v) {
      return channelText(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
    }
    // 楽天の商品管理番号（URLになる）: 英小文字・数字・-・_ の32文字まで
    function channelManageNo(code) { return String(code || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32); }
    // 写真の名前: 楽天・Yahooとも「商品コード.jpg」「商品コード_1.jpg」…（Yahooの決まりに合わせ、楽天も同じ名前で置く）
    function channelPhotoNames(row) {
      const code = channelManageNo(row.product.code);
      return (row.photos && row.photos.length ? row.photos : [row.product.image]).filter(Boolean).slice(0, 20).map(function (src, i) {
        const ext = /\.png$/i.test(src) ? '.png' : /\.gif$/i.test(src) ? '.gif' : '.jpg';
        return { src: src, name: code + (i ? '_' + i : '') + ext };
      });
    }
    function channelCaption(p) {
      const rows = [['内容', p.contents], ['サイズ', p.size], ['素材', p.material], ['賞味期限', p.expiry], ['アレルギー', p.allergens], ['保存方法', p.storage]].filter(function (r) { return channelText(r[1]); });
      return { text: p.description, spec: rows, notice: p.notice };
    }
    function channelCaptionHtml(p) {
      const c = channelCaption(p);
      return channelHtml(c.text) + (c.spec.length ? '<br><br>' + c.spec.map(function (r) { return '【' + channelHtml(r[0]) + '】' + channelHtml(r[1]); }).join('<br>') : '') + (channelText(c.notice) ? '<br><br>' + channelHtml(c.notice) : '');
    }
    function channelCaptionPlain(p) {
      const c = channelCaption(p);
      return channelText(c.text) + (c.spec.length ? '\n\n' + c.spec.map(function (r) { return '【' + r[0] + '】' + channelText(r[1]); }).join('\n') : '') + (channelText(c.notice) ? '\n\n' + channelText(c.notice) : '');
    }

    // ---- 楽天（RMS 商品一括編集CSV・新形式）: 商品の行のあとに、種類（SKU）ごとの行を並べる ----
    function channelRakutenRows(rows, opt) {
      opt = opt || {};
      const folder = (opt.cabinetFolder || '').replace(/^\/+|\/+$/g, '');
      const head = ['商品管理番号（商品URL）', '商品番号', '商品名', 'キャッチコピー', 'PC用商品説明文', 'スマートフォン用商品説明文', 'PC用販売説明文', '倉庫指定',
        'バリエーション項目キー定義', 'バリエーション項目名定義'];
      for (let i = 1; i <= 20; i += 1) head.push('商品画像タイプ' + i, '商品画像パス' + i, '商品画像名（ALT）' + i);
      head.push('SKU管理番号', 'システム連携用SKU番号', 'バリエーション項目キー1', 'バリエーション項目選択肢1', '通常購入販売価格', '在庫数');
      const out = [head];
      rows.forEach(function (row) {
        const p = row.product;
        const no = channelManageNo(p.code);
        const many = p.skus.length > 1;
        const line = {};
        line['商品管理番号（商品URL）'] = no;
        line['商品番号'] = p.code;
        line['商品名'] = channelText(p.title).slice(0, 127);
        line['キャッチコピー'] = p.hasName ? '名入れできます' : '';
        line['PC用商品説明文'] = channelCaptionHtml(p);
        line['スマートフォン用商品説明文'] = channelCaptionHtml(p);
        line['PC用販売説明文'] = '';
        // 販売終了・サイトに出さない商品は倉庫に入れる（1）
        line['倉庫指定'] = row.active ? '0' : '1';
        line['バリエーション項目キー定義'] = many ? 'type' : '';
        line['バリエーション項目名定義'] = many ? '種類' : '';
        channelPhotoNames(row).forEach(function (ph, i) {
          line['商品画像タイプ' + (i + 1)] = 'CABINET';
          line['商品画像パス' + (i + 1)] = (folder ? '/' + folder : '') + '/' + ph.name;
          line['商品画像名（ALT）' + (i + 1)] = channelText(p.title).slice(0, 255);
        });
        out.push(head.map(function (h) { return line[h] == null ? '' : line[h]; }));
        p.skus.forEach(function (s) {
          const sku = {};
          sku['商品管理番号（商品URL）'] = no;
          sku['SKU管理番号'] = channelManageNo(s.code || p.code);
          sku['システム連携用SKU番号'] = s.code || p.code;
          sku['バリエーション項目キー1'] = many ? 'type' : '';
          sku['バリエーション項目選択肢1'] = many ? channelText(s.t).slice(0, 32) : '';
          sku['通常購入販売価格'] = String(s.price);
          // 在庫数は OMS が別に送るので空（欠品の商品だけ 0）
          sku['在庫数'] = row.stock && row.stock.status === 'out' ? '0' : '';
          out.push(head.map(function (h) { return sku[h] == null ? '' : sku[h]; }));
        });
      });
      return out;
    }

    // ---- Yahoo!ショッピング（ストアクリエイターPro 商品データCSV data.csv）: 1商品1行 ----
    function channelYahooRows(rows) {
      const head = ['path', 'name', 'code', 'sub-code', 'price', 'options', 'headline', 'caption', 'explanation', 'abstract', 'taxable', 'display'];
      const out = [head];
      rows.forEach(function (row) {
        const p = row.product;
        const many = p.skus.length > 1;
        const code = channelManageNo(p.code);
        const line = {
          path: '', name: channelText(p.title).slice(0, 150), code: code,
          // 種類ごとの商品コード: 「種類:Sサイズ=code-1&種類:Mサイズ=code-2」
          'sub-code': many ? p.skus.map(function (s) { return '種類:' + channelText(s.t).replace(/[:=&]/g, ' ') + '=' + channelManageNo(s.code); }).join('&') : '',
          price: String(Math.min.apply(null, p.skus.map(function (s) { return s.price; }))),
          options: many ? '種類 ' + p.skus.map(function (s) { return channelText(s.t).replace(/\s+/g, '_'); }).join(' ') : '',
          headline: p.hasName ? '名入れできます' : '',
          caption: channelCaptionHtml(p),
          explanation: channelCaptionPlain(p).slice(0, 500),
          abstract: channelText(p.description).slice(0, 80),
          taxable: '1',
          display: row.active ? '1' : '0'
        };
        out.push(head.map(function (h) { return line[h]; }));
      });
      return out;
    }
    function channelPhotoRows(rows) {
      const out = [['商品コード', '商品名', '何枚目', 'OMSでの画像', '楽天・Yahooに置く名前']];
      rows.forEach(function (row) {
        channelPhotoNames(row).forEach(function (ph, i) { out.push([row.product.code, row.product.title, String(i + 1) + (i ? '' : '（メイン）'), ph.src, ph.name]); });
      });
      return out;
    }
    // 値の中に , " 改行 があれば " で囲む。改行は CRLF
    function channelCsv(table) {
      return table.map(function (r) {
        return r.map(function (v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',');
      }).join('\r\n') + '\r\n';
    }
    // Shift_JIS（Windows-31J）に変換。表にない文字（絵文字など）は 〓 にして、どの文字だったかを返す
    let channelSjisTable = null;
    function channelSjis(text) {
      if (!channelSjisTable) {
        channelSjisTable = new Map();
        const dec = new TextDecoder('shift_jis');
        const add = function (bytes) { const ch = dec.decode(new Uint8Array(bytes)); if (ch.length === 1 && ch !== '�' && !channelSjisTable.has(ch)) channelSjisTable.set(ch, bytes); };
        for (let b = 0x20; b < 0x7f; b += 1) add([b]);
        for (let b = 0xa1; b <= 0xdf; b += 1) add([b]);
        for (let hi = 0x81; hi <= 0xfc; hi += 1) {
          if (hi > 0x9f && hi < 0xe0) continue;
          for (let lo = 0x40; lo <= 0xfc; lo += 1) if (lo !== 0x7f) add([hi, lo]);
        }
        // 波ダッシュなど、Unicode の別の字で入ってきやすいものを寄せる
        [['〜', '～'], ['−', '－'], ['‖', '∥'], ['¢', '￠'], ['£', '￡'], ['¬', '￢'], ['—', '―']].forEach(function (x) { if (!channelSjisTable.has(x[0]) && channelSjisTable.has(x[1])) channelSjisTable.set(x[0], channelSjisTable.get(x[1])); });
      }
      const bytes = [], missing = [];
      for (const ch of text) {
        if (ch === '\r' || ch === '\n' || ch === '\t') { bytes.push(ch.charCodeAt(0)); continue; }
        const b = channelSjisTable.get(ch);
        if (b) b.forEach(function (x) { bytes.push(x); });
        else { if (missing.indexOf(ch) < 0) missing.push(ch); bytes.push(0x81, 0xac); }
      }
      return { bytes: new Uint8Array(bytes), missing: missing };
    }
    function channelBuild(rows, opt) {
      const files = [
        { name: 'rakuten-item.csv', label: '楽天', table: channelRakutenRows(rows, opt) },
        { name: 'yahoo-data.csv', label: 'Yahoo', table: channelYahooRows(rows) },
        { name: 'photo-names.csv', label: '写真の名前の対応表', table: channelPhotoRows(rows) }
      ];
      return files.map(function (f) { const enc = channelSjis(channelCsv(f.table)); return { name: f.name, label: f.label, rows: f.table.length - 1, bytes: enc.bytes, missing: enc.missing }; });
    }

    // OMSの画面から: 下書きの商品を3つのCSVにしてダウンロードする
    function builderChannelExport() {
      const b = state.builder;
      const bad = [];
      b.newProducts.forEach(function (p) { if (builderProductErrors(p).length) bad.push(p.title || p.id); });
      if (bad.length) { showToast('直すところが残っている商品があります: ' + bad.join('、') + '。赤い注意を直してから書き出してください。'); return; }
      const rows = b.newProducts.map(builderProductRow);
      if (!rows.length) { showToast('書き出す商品がありません。商品を登録するか編集してください。'); return; }
      const files = channelBuild(rows, { cabinetFolder: '' });
      files.forEach(function (f, i) {
        setTimeout(function () {
          const url = URL.createObjectURL(new Blob([f.bytes], { type: 'text/csv;charset=Shift_JIS' }));
          const a = document.createElement('a');
          a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        }, i * 400);
      });
      const missing = Array.from(new Set(files.reduce(function (all, f) { return all.concat(f.missing); }, [])));
      showToast(rows.length + '商品を楽天用・Yahoo用・写真の対応表の3つのCSVにしました。' + (missing.length ? '各店で使えない文字（' + missing.join(' ') + '）は〓にしたので直してください。' : '') + CHANNEL_NOTE);
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { channelRakutenRows: channelRakutenRows, channelYahooRows: channelYahooRows, channelPhotoRows: channelPhotoRows, channelCsv: channelCsv, channelSjis: channelSjis, channelBuild: channelBuild, channelManageNo: channelManageNo };
