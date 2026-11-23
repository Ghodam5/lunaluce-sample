// Luna Luce OMS 部品JS: 52-work-log（工程と作業ログをサーバーに残す・スマホで作業・作業員に住所などを見せない）
// サーバーの受け手は VPS の oms-app の中の oms-work（ops/vps/oms-app/work.js、/work-api/）。手元で開いたとき（file:）は使えない。
// - 作業カード: スマホの作業画面（work.html）に出す中身。住所・電話・メールは入れない（サーバーでも捨てる）
// - 「PDF保存」「PDF印刷」「スマホで作業開始」の3つのボタン（受注明細の「この注文の出力」）
// - 工程の段階（新規受付→…→梱包・出荷済）を変えたら作業ログに残す
    const PII_HIDDEN_TEXT = '（作業員には表示しません）';
    const WORKER_TABS = ['dashboard', 'worklog'];
    // 作業員でログインしているとき true。住所・電話・メール・お届け先を出さない（お名前は名入れに要るので出す）
    function piiHidden() { return !!(state.me && state.me.role === 'worker'); }
    function piiText(v) { return piiHidden() ? PII_HIDDEN_TEXT : v; }
    function workServerOn() { return location.protocol !== 'file:'; }
    function workApi(method, p, body) {
      if (!workServerOn()) return Promise.reject(Error('作業の記録はVPSのOMSで開いたときだけ使えます'));
      return fetch('/work-api' + p, { method: method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false, error: '返事が読めません（' + res.status + '）' }; }).then(function (r) {
            if (!res.ok || !r.ok) throw Error(r.error || ('失敗しました（' + res.status + '）'));
            return r;
          });
        });
    }
    function workStepsOf(order) {
      return WORK_STEPS.filter(function (s) { return !s.when || s.when(order); }).map(function (s) { return { id: s.id, label: s.label, note: s.note }; });
    }
    // スマホの作業画面に出す中身（決めた項目だけ。住所・電話・メールは入れない）
    function workCardOf(order) {
      const counts = partCounts(order);
      return {
        id: order.id, channelLabel: order.channelLabel, productName: order.productName, sku: order.sku, qty: order.qty,
        coupleNames: order.coupleNames, customerName: order.customerName, weddingDate: order.weddingDate, deliveryDate: order.deliveryDate || '',
        orderDate: order.orderDate, headerMsg: order.headerMsg, design: designView(order).headline, noshi: order.noshiSeal,
        warning: order.warning || '', rush: order.rushTicket ? 'yes' : '', status: order.status,
        items: orderedItems(order).map(function (it) { return { kind: it.kind, label: it.label, src: it.src }; }),
        texts: [['上の一文', order.headerMsg], ['お名前', order.coupleNames], ['日付', dotted(order.weddingDate)], ['のしの上（表書き）', order.noshiUpper], ['のしの下（お名前）', order.noshiName], ['のし・シール', order.noshiSeal]].filter(function (r) { return r[1]; }),
        parts: PART_KEYS.map(function (p) { return [p.label, String(counts[p.key])]; }).filter(function (r) { return r[1] !== '0'; }),
        steps: workStepsOf(order)
      };
    }
    function workLink(id) { return location.origin + '/oms/work.html?o=' + encodeURIComponent(id); }
    // QRコード（SVG）。vendor/qrcode.js（MIT, Kazuhiko Arase）を使う
    function workQrSvg(text, cell) {
      if (typeof qrcode !== 'function') return '';
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: cell || 4, margin: (cell || 4) * 4, scalable: true, alt: 'スマホで作業画面を開くQRコード' });
    }
    function sendWorkCard(order) {
      if (!workServerOn() || !order) return Promise.resolve(null);
      return workApi('POST', '/card', { card: workCardOf(order) });
    }
    // 工程の段階を変えたら作業ログに残す（サーバーが無いときは何もしない）
    function workLogStatus(order, from, to) {
      if (!workServerOn() || !order || from === to || piiHidden()) return;
      workApi('POST', '/status', { id: order.id, from: from || '', to: to || '' }).catch(function (e) { showToast('作業ログに残せませんでした: ' + e.message); });
    }
    // 受注明細の3つのボタン
    function workOutput(kind) {
      const order = currentOrder();
      if (!order) return;
      if (kind === 'phone') { openPhoneWork(order); return; }
      sendWorkCard(order).catch(function () { /* 紙は出せるので止めない */ });
      if (kind === 'pdf') showToast('印刷の画面が開いたら、送り先（プリンター）で「PDFに保存」を選んでください');
      printWorkOrder();
    }
    function openPhoneWork(order) {
      const link = workLink(order.id);
      let host = document.getElementById('wk-phone');
      if (!host) { host = document.createElement('div'); host.id = 'wk-phone'; host.className = 'wk-modal'; document.body.appendChild(host); }
      const close = function () { host.hidden = true; };
      host.hidden = false;
      host.innerHTML = '<div class="wk-sheet" role="dialog" aria-modal="true" aria-labelledby="wk-phone-t"><h3 id="wk-phone-t">スマホで作業開始</h3>' +
        '<p class="wk-lead">' + escapeHtml(order.id) + '　' + escapeHtml(order.productName) + '</p>' +
        '<div class="wk-qr">' + workQrSvg(link, 6) + '</div>' +
        '<ol class="wk-how"><li>iPhoneのカメラでこのQRコードを写して、出てきた黄色い帯を押す</li><li>初めてのときはOMSのログイン画面が出るので、自分のログイン名でログインする</li><li>工程ごとに「終わった」を押す。気づいたことはコメントに書く</li></ol>' +
        '<p class="wk-link"><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">この画面で開く</a>　<button type="button" data-wk="copy">リンクをコピー</button></p>' +
        '<p class="wk-state" role="status">' + (workServerOn() ? '作業カードを送っています…' : 'この画面は手元のファイルで開いています。VPSのOMSで開くとスマホで使えます。') + '</p>' +
        '<button type="button" class="wk-close" data-wk="close">閉じる</button></div>';
      host.querySelector('[data-wk="close"]').addEventListener('click', close);
      host.addEventListener('click', function (e) { if (e.target === host) close(); });
      host.querySelector('[data-wk="copy"]').addEventListener('click', function () {
        (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { showToast('作業画面のリンクをコピーしました'); }, function () { showToast(link); });
      });
      const st = host.querySelector('.wk-state');
      if (workServerOn()) sendWorkCard(order).then(function () { st.textContent = '準備できました。スマホで開けます。'; }, function (e) { st.textContent = '作業カードを送れませんでした: ' + e.message; st.classList.add('is-ng'); });
    }

    // 受注明細の「作業の記録」（工程の進み具合とログ。VPSのOMSで開いたときだけ）
    // 受注明細の「工程の流れ」: パソコンでも工程ごとに「終わった」を付けたり取り消したりできる（スマホと同じ作業ログに残る）
    function renderDrawerWorkLog(host) {
      let armed = '';
      function paint() {
        const order = currentOrder();
        if (!order || !workServerOn()) { host.innerHTML = ''; return; }
        host.innerHTML = '<h3>工程の流れ・作業の記録</h3><p class="sub">工程ごとに「終わった」を付ける・取り消すと、スマホで押したのと同じように作業ログに残ります（誰が・いつ・何をしたか。記録は消えません）</p><div class="wk-log">読み込み中…</div>';
        load(order);
      }
      function load(order) {
        workApi('GET', '/order?id=' + encodeURIComponent(order.id)).then(function (r) { show(order, r); }, function (e) {
          const box = host.querySelector('.wk-log'); if (box) box.textContent = '読み込めませんでした: ' + e.message;
        });
      }
      function show(order, r) {
        if (state.currentId !== order.id) return;
        const box = host.querySelector('.wk-log');
        if (!box) return;
        const done = r.state && r.state.steps || {};
        const list = r.card ? r.card.steps : workStepsOf(order);
        const n = list.filter(function (s) { return done[s.id]; }).length;
        const steps = list.map(function (s) {
          const d = done[s.id];
          const btn = d
            ? '<button type="button" class="wk-undo' + (armed === s.id ? ' is-armed' : '') + '" data-wks="' + escapeHtml(s.id) + '" data-done="0">' + (armed === s.id ? 'もう一度押すと取り消し' : '取り消す') + '</button>'
            : '<button type="button" class="wk-done" data-wks="' + escapeHtml(s.id) + '" data-done="1">終わった</button>';
          return '<li class="' + (d ? 'is-done' : '') + '"><div><b>' + escapeHtml(s.label) + '</b><span>' + (d ? '済　' + escapeHtml(d.display || d.by) + '　' + escapeHtml(workTime(d.at)) : 'まだ') + '</span></div>' + btn + '</li>';
        }).join('');
        box.innerHTML = '<p class="wk-progress">進み具合 <b>' + n + ' / ' + list.length + '</b></p><ul class="wk-steps">' + steps + '</ul>' +
          '<div class="wk-cm"><select data-wkc="step"><option value="">工程を選ばない</option>' + list.map(function (s) { return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.label) + '</option>'; }).join('') + '</select>' +
          '<input type="text" data-wkc="text" maxlength="500" placeholder="コメント（取り消した理由など）"><button type="button" data-wkc="send">残す</button></div>' +
          workLogTable(r.log.slice(0, 20), false);
        box.querySelectorAll('[data-wks]').forEach(function (b) {
          b.addEventListener('click', function () { step(order, b.dataset.wks, b.dataset.done === '1'); });
        });
        box.querySelector('[data-wkc="send"]').addEventListener('click', function () {
          const text = box.querySelector('[data-wkc="text"]').value.trim();
          if (!text) { showToast('コメントを入れてください'); return; }
          withCard(order).then(function () { return workApi('POST', '/comment', { id: order.id, step: box.querySelector('[data-wkc="step"]').value, text: text }); })
            .then(function (r2) { show(order, r2); showToast('コメントを残しました'); }, function (e) { showToast('残せませんでした: ' + e.message); });
        });
      }
      // 作業カードがまだ無い注文は、先にカードを作ってから押す
      function withCard(order) { return piiHidden() ? Promise.resolve() : sendWorkCard(order); } // 作業員はカードを作れない（事務の人が作ったものを使う）
      function step(order, id, done) {
        if (!done && armed !== id) { armed = id; load(order); setTimeout(function () { if (armed === id) { armed = ''; if (state.currentId === order.id) load(order); } }, 4000); return; }
        armed = '';
        host.querySelectorAll('[data-wks]').forEach(function (b) { b.disabled = true; });
        withCard(order).then(function () { return workApi('POST', '/step', { id: order.id, step: id, done: done }); }).then(function (r) {
          show(order, r);
          const s = r.card && r.card.steps.filter(function (x) { return x.id === id; })[0];
          showToast((s ? s.label : '') + (done ? 'を「済」にしました' : 'の「済」を取り消しました'));
        }, function (e) { showToast('変えられませんでした: ' + e.message); load(order); });
      }
      on('oms:open', paint);
    }
    function workTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    // 作業ログの表（受注明細と「9 作業ログ」タブで使う）
    function workLogTable(entries, withOrder) {
      if (!entries.length) return '<p class="sub">記録はまだありません</p>';
      return '<table class="wk-table"><thead><tr><th>日時</th><th>した人</th>' + (withOrder ? '<th>注文</th>' : '') + '<th>工程</th><th>したこと</th><th>中身</th></tr></thead><tbody>' + entries.map(function (e) {
        const what = e.action === 'status' ? escapeHtml(e.from || '') + ' → ' + escapeHtml(e.to || '') : e.action === 'step-done' || e.action === 'step-undo' ? escapeHtml(e.from || '') + ' → ' + escapeHtml(e.to || '') : '';
        return '<tr><td>' + escapeHtml(workTime(e.at)) + '</td><td>' + escapeHtml(e.display || e.user) + '</td>' +
          (withOrder ? '<td><button type="button" class="wk-order" data-action="open-order" data-id="' + escapeHtml(e.order) + '">' + escapeHtml(e.order) + '</button><small>' + escapeHtml(e.productName || '') + '</small></td>' : '') +
          '<td>' + escapeHtml(e.stepLabel || '') + '</td><td>' + escapeHtml(e.actionLabel || e.action) + '</td><td>' + [what, e.text ? escapeHtml(e.text) : ''].filter(Boolean).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table>';
    }
