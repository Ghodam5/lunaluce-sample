// Luna Luce OMS スマホの作業画面: 「QRを読む」（カメラで作業指示書・作業QR表のQRコードを写すと、その注文を開く）
// iPhone（Safari）・Android（Chrome）どちらも、ページの中でカメラの映像を出し、../vendor/jsQR.js で読む。
// カメラを使えないとき（許可しなかった・古い機種）は、写真を撮って読む方法に切り替える。
// 読めた中身が「このOMSの work.html?o=注文番号」か、注文番号そのものなら開く。ほかの住所（外のサイト）には行かない。
(function () {
  'use strict';
  const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  let stream = null, raf = 0, box = null;

  function orderFrom(text) {
    const t = String(text || '').trim();
    try {
      const u = new URL(t, location.href);
      if (u.origin === location.origin && /\/oms\/work\.html$/.test(u.pathname) && ID_RE.test(u.searchParams.get('o') || '')) return u.searchParams.get('o');
    } catch (e) { /* URL ではない */ }
    return ID_RE.test(t) && !/^https?$/i.test(t) ? t : '';
  }
  function go(id) { stop(); location.href = 'work.html?o=' + encodeURIComponent(id); }
  function stop() {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (box) box.hidden = true;
  }
  function say(msg, bad) { const m = box.querySelector('.sc-msg'); m.textContent = msg; m.className = 'sc-msg' + (bad ? ' ng' : ''); }
  function readCanvas(canvas, ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const code = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
    if (!code) return false;
    const id = orderFrom(code.data);
    if (id) { if (navigator.vibrate) navigator.vibrate(40); go(id); return true; }
    say('OMSの作業用QRコードではありません', true);
    return false;
  }
  function ui() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'scan';
    box.innerHTML = '<div class="sc-top"><b>QRコードを写してください</b><button type="button" class="sc-x">閉じる</button></div>' +
      '<div class="sc-view"><video playsinline muted></video><span class="sc-frame"></span></div>' +
      '<p class="sc-msg" role="status">カメラを起動しています…</p>' +
      '<label class="sc-photo">写真を撮って読む<input type="file" accept="image/*" capture="environment"></label>';
    document.body.appendChild(box);
    box.querySelector('.sc-x').addEventListener('click', stop);
    box.querySelector('input[type="file"]').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) readPhoto(f); e.target.value = ''; });
    return box;
  }
  function readPhoto(file) {
    say('写真を読んでいます…');
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      if (!readCanvas(c, ctx, w, h)) say('QRコードが見つかりませんでした。QRが大きく、まっすぐ写るように撮り直してください', true);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => say('写真を開けませんでした', true);
    img.src = URL.createObjectURL(file);
  }
  function start() {
    ui().hidden = false;
    if (typeof window.jsQR !== 'function') { say('読み取りの部品を読み込めませんでした。ページを読み込み直してください', true); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('この機種ではページの中でカメラを使えません。下の「写真を撮って読む」を使ってください', true); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(s => {
      stream = s;
      const video = box.querySelector('video');
      video.srcObject = s;
      return video.play().then(() => {
        say('枠の中にQRコードを入れてください');
        const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
        let last = 0;
        const tick = now => {
          if (!stream) return;
          raf = requestAnimationFrame(tick);
          if (now - last < 180 || video.readyState < 2) return;
          last = now;
          const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
          const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
          if (!w || !h) return;
          c.width = w; c.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          readCanvas(c, ctx, w, h);
        };
        raf = requestAnimationFrame(tick);
      });
    }).catch(e => {
      say((e && e.name === 'NotAllowedError' ? 'カメラの使用が許可されていません。設定でこのサイトのカメラを「許可」にするか、' : 'カメラを起動できませんでした。') + '下の「写真を撮って読む」を使ってください', true);
    });
  }
  window.workScan = { start, stop, orderFrom };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();
