// Luna Luce OMS スマホの作業画面（work.html）。作業指示書のQRコードから ?o=注文番号 で開く。
// 工程ごとに「終わった」を押す・取り消す・コメントを書く。押したことは作業ログに残る（誰が・いつ・何を）。
// サーバーは /work-api/（VPS の oms-work）。ログインが切れていたらログイン画面へ送る。
(function () {
  'use strict';
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);
  let orderId = params.get('o') || '';
  let view = null, armed = '', timer = 0;

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const time = iso => iso ? new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  function api(method, p, body) {
    return fetch('/work-api' + p, { method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(res => res.json().catch(() => ({ ok: false, error: '返事が読めません（' + res.status + '）' })).then(r => {
        if (res.status === 401 || r.login) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); throw Error('ログインしてください'); }
        if (!res.ok || !r.ok) throw Error(r.error || '失敗しました');
        return r;
      }));
  }
  function toast(msg, bad) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = bad ? 'is-ng' : ''; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 3500);
  }

  // 注文番号を打って探す（QRが読めないとき）
  function paintFind(msg) {
    app.innerHTML = '<section class="card"><h1>注文を開く</h1>' + (msg ? '<p class="ng">' + esc(msg) + '</p>' : '') +
      '<p class="muted">作業指示書のQRコードをカメラで写すと開きます。読めないときは注文番号・お名前・商品名を打ってください。</p>' +
      '<input id="find" type="search" inputmode="search" autocomplete="off" placeholder="注文番号・お名前・商品名・SKU"><div id="hits" class="hits"></div></section>';
    const input = document.getElementById('find'), hits = document.getElementById('hits');
    let seq = 0;
    input.addEventListener('input', () => {
      const n = ++seq, q = input.value.trim();
      if (!q) { hits.innerHTML = ''; return; }
      api('GET', '/suggest?q=' + encodeURIComponent(q)).then(r => {
        if (n !== seq) return;
        hits.innerHTML = r.items.length ? r.items.map(it => '<a href="?o=' + encodeURIComponent(it.id) + '"><b>' + esc(it.id) + '</b><span>' + esc(it.productName) + '</span><small>' + esc([it.coupleNames, it.sku].filter(Boolean).join('　')) + '</small></a>').join('')
          : '<p class="muted">見つかりません（事務の人が「スマホで作業開始」を押した注文だけ出ます）</p>';
      }).catch(e => { hits.innerHTML = '<p class="ng">' + esc(e.message) + '</p>'; });
    });
    input.focus();
  }

  function paint() {
    const c = view.card, done = (view.state && view.state.steps) || {};
    if (!c) { paintFind('この注文の作業カードがまだありません。事務の人に、OMSの受注明細で「スマホで作業開始」を押してもらってください。（' + orderId + '）'); return; }
    const n = c.steps.filter(s => done[s.id]).length;
    const steps = c.steps.map(s => {
      const d = done[s.id];
      const btn = d
        ? '<button type="button" class="undo' + (armed === s.id ? ' is-armed' : '') + '" data-step="' + esc(s.id) + '" data-done="0">' + (armed === s.id ? 'もう一度押すと取り消し' : '取り消す') + '</button>'
        : '<button type="button" class="go" data-step="' + esc(s.id) + '" data-done="1">終わった</button>';
      return '<li class="step' + (d ? ' is-done' : '') + '"><div><b>' + esc(s.label) + '</b><small>' + esc(s.note) + '</small>' +
        (d ? '<em>済　' + esc(d.display || d.by) + '　' + esc(time(d.at)) + '</em>' : '') + '</div>' + btn + '</li>';
    }).join('');
    const items = (c.items || []).filter(it => it.src).map(it => '<figure><img src="' + esc(it.src) + '" alt="" loading="lazy"><figcaption><b>' + esc(it.kind) + '</b>' + esc(it.label) + '</figcaption></figure>').join('');
    const texts = (c.texts || []).map(r => '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>').join('');
    const parts = (c.parts || []).map(r => '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>').join('');
    const stepOpts = '<option value="">工程を選ばない</option>' + c.steps.map(s => '<option value="' + esc(s.id) + '">' + esc(s.label) + '</option>').join('');
    const log = view.log.slice(0, 30).map(e => '<li><span>' + esc(time(e.at)) + '　' + esc(e.display || e.user) + '</span><b>' + esc(e.stepLabel ? e.stepLabel + '：' : '') + esc(e.actionLabel) + '</b>' +
      (e.action === 'status' ? '<small>' + esc(e.from) + ' → ' + esc(e.to) + '</small>' : '') + (e.text ? '<p>' + esc(e.text) + '</p>' : '') + '</li>').join('');
    app.innerHTML =
      (c.rush ? '<div class="rush">特急チケット　最優先で作業してください</div>' : '') +
      '<section class="card head"><p class="id">' + esc(c.id) + '　' + esc(c.channelLabel || '') + '</p><h1>' + esc(c.productName) + '</h1>' +
      '<p class="sku">' + esc(c.sku || '') + '　× ' + esc(c.qty || '') + '</p>' +
      '<div class="keys"><div><span>納期</span><b>' + esc(c.deliveryDate || '—') + '</b></div><div><span>挙式日</span><b>' + esc(c.weddingDate || '—') + '</b></div><div><span>進み具合</span><b>' + n + ' / ' + c.steps.length + '</b></div></div>' +
      (c.warning ? '<p class="warn">注意：' + esc(c.warning) + '</p>' : '') + '</section>' +
      '<section class="card"><h2>工程</h2><ol class="steps">' + steps + '</ol></section>' +
      '<section class="card"><h2>コメント</h2><form id="cm"><select id="cm-step">' + stepOpts + '</select><textarea id="cm-text" rows="3" maxlength="500" placeholder="気づいたこと・困ったこと（500文字まで）"></textarea><button type="submit" class="go">送る</button></form></section>' +
      (texts ? '<section class="card"><h2>入れる文字</h2><table>' + texts + '</table></section>' : '') +
      (items ? '<section class="card"><h2>ご注文の品</h2><div class="items">' + items + '</div></section>' : '') +
      (parts ? '<section class="card"><h2>部品内訳</h2><table>' + parts + '</table></section>' : '') +
      '<section class="card"><h2>この注文の記録</h2><ul class="log">' + (log || '<li class="muted">まだありません</li>') + '</ul></section>' +
      '<p class="foot"><a href="work.html">別の注文を開く</a>　<button type="button" id="reload">最新にする</button></p>';
    app.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => step(b.dataset.step, b.dataset.done === '1')));
    document.getElementById('cm').addEventListener('submit', e => { e.preventDefault(); comment(); });
    document.getElementById('reload').addEventListener('click', load);
  }
  function step(id, done) {
    if (!done && armed !== id) { armed = id; paint(); setTimeout(() => { if (armed === id) { armed = ''; paint(); } }, 4000); return; }
    armed = '';
    app.querySelectorAll('[data-step]').forEach(b => { b.disabled = true; });
    api('POST', '/step', { id: orderId, step: id, done }).then(r => {
      view = r; paint();
      const s = r.card.steps.find(x => x.id === id);
      toast((s ? s.label : '') + (done ? 'を「済」にしました' : 'の「済」を取り消しました'));
      if (done && navigator.vibrate) navigator.vibrate(30);
    }).catch(e => { toast(e.message, true); paint(); });
  }
  function comment() {
    const text = document.getElementById('cm-text').value.trim();
    if (!text) { toast('コメントを入れてください', true); return; }
    api('POST', '/comment', { id: orderId, step: document.getElementById('cm-step').value, text }).then(r => { view = r; paint(); toast('コメントを残しました'); })
      .catch(e => toast(e.message, true));
  }
  function load() {
    if (!orderId) { paintFind(''); return; }
    api('GET', '/order?id=' + encodeURIComponent(orderId)).then(r => { view = r; paint(); }).catch(e => paintFind(e.message));
  }
  api('GET', '/me').then(r => {
    document.getElementById('who').innerHTML = esc(r.me.display) + '　<a href="/oms/">OMS</a>';
    load();
  }).catch(e => { app.innerHTML = '<p class="ng">' + esc(e.message) + '</p>'; });
  // ほかの人が押した分も見えるように、画面を開いている間は30秒ごとに読み直す（入力中は待つ）
  timer = setInterval(() => {
    if (document.hidden || !view || !view.card) return;
    const a = document.activeElement;
    if (a && (a.id === 'cm-text' || a.id === 'cm-step') || armed) return;
    api('GET', '/order?id=' + encodeURIComponent(orderId)).then(r => { view = r; paint(); }).catch(() => {});
  }, 30000);
})();
