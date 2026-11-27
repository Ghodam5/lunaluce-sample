'use strict';
// 部品: oms-intake（検証用サイトからの試験注文の受け口）。
// 本番の受注DB（PostgreSQL の oms.orders）には接続しない・書き込まない。
// 保存先はこの部品専用のファイルストア /data/oms_test/test_order_inbox.json だけ。
// 初期状態はオフ（ORDER_INTAKE_ENABLED が 1 / true / on のときだけ受け取る）。
// 外からの認証は試験用トークン（ORDER_INTAKE_TOKEN）。OMSのログインCookieは使わない。
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8091);
const DATA = process.env.DATA_DIR || '/data';
const STORE_DIR = path.join(DATA, 'oms_test');
const INBOX = path.join(STORE_DIR, 'test_order_inbox.json');
const PINNED_SOURCE_HOST = 'renewal-test.luna-luce.info';
const TOKEN = process.env.ORDER_INTAKE_TOKEN || '';
const MAX_BODY = 1 * 1024 * 1024;

function enabled() {
  const v = String(process.env.ORDER_INTAKE_ENABLED || '0').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}
function hide(s) {
  const secrets = [TOKEN].filter(Boolean);
  return secrets.reduce((t, k) => t.split(k).join('＊＊＊'), String(s || ''));
}
function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function tokenOf(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}
function tokenOk(got) {
  if (!TOKEN || !got) return false;
  const a = Buffer.from(String(TOKEN));
  const b = Buffer.from(String(got));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function readInbox() {
  try { return JSON.parse(fs.readFileSync(INBOX, 'utf8')); } catch { return { kind: 'oms_test.test_order_inbox', items: [] }; }
}
function writeInbox(obj) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const tmp = INBOX + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, INBOX);
}
function sourceHost(body, req) {
  const fromBody = String((body && body.source) || '').trim();
  if (fromBody) {
    try { return new URL(fromBody.includes('://') ? fromBody : 'https://' + fromBody).hostname; } catch { return fromBody; }
  }
  const hdr = String(req.headers['x-luna-oms-source'] || '');
  if (hdr) {
    try { return new URL(hdr.includes('://') ? hdr : 'https://' + hdr).hostname; } catch { return hdr; }
  }
  return '';
}
function sanitize(body) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 200).map((it) => ({
    code: String((it && it.code) || '').slice(0, 64),
    name: String((it && it.name) || '').slice(0, 200),
    qty: Number((it && it.qty) || 0),
    price: Number((it && it.price) || 0),
  })) : [];
  return {
    source: PINNED_SOURCE_HOST,
    order_id: String(body.order_id || '').slice(0, 64),
    items,
    totals: {
      total: Number((body.totals && body.totals.total) || 0),
    },
    payment: String((body.payment && (body.payment.name || body.payment)) || '').slice(0, 80),
    at: new Date().toISOString(),
  };
}

function readBody(req) {
  return new Promise((ok, ng) => {
    let size = 0; const parts = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { ng(Error('本体が大きすぎます')); req.destroy(); } else parts.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(parts).toString('utf8') || '';
      if (!raw) return ok({});
      try { ok(JSON.parse(raw)); } catch { ng(Error('JSONが読めません')); }
    });
    req.on('error', ng);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/intake-api/status' || url.pathname === '/status')) {
      return send(res, 200, {
        ok: true,
        enabled: enabled(),
        store: 'oms_test.test_order_inbox',
        neverWrites: 'oms.orders',
        source: PINNED_SOURCE_HOST,
        count: enabled() ? readInbox().items.length : 0,
      });
    }
    if (req.method === 'POST' && (url.pathname === '/intake-api/test-orders' || url.pathname === '/test-orders')) {
      if (!tokenOk(tokenOf(req))) return send(res, 401, { ok: false, error: '認証できません' });
      if (!enabled()) return send(res, 403, { ok: false, error: '試験の受け口はオフです（ORDER_INTAKE_ENABLED=0）', neverWrites: 'oms.orders' });
      const body = await readBody(req);
      const host = sourceHost(body, req);
      if (host !== PINNED_SOURCE_HOST) {
        return send(res, 403, { ok: false, error: '受け付けるのは ' + PINNED_SOURCE_HOST + ' だけです', neverWrites: 'oms.orders' });
      }
      if (!String(body.order_id || '').trim()) return send(res, 400, { ok: false, error: 'order_id がありません' });
      const row = sanitize(body);
      const box = readInbox();
      box.items.unshift(row);
      box.items = box.items.slice(0, 500);
      writeInbox(box);
      return send(res, 200, { ok: true, stored: 'oms_test.test_order_inbox', order_id: row.order_id, neverWrites: 'oms.orders' });
    }
    return send(res, 404, { ok: false, error: 'ありません' });
  } catch (e) {
    return send(res, 400, { ok: false, error: hide(e.message).slice(0, 200) });
  }
});

if (require.main === module) server.listen(PORT, () => console.log('oms-intake: ' + PORT + ' で待っています（enabled=' + enabled() + '・ストア=oms_test.test_order_inbox・oms.ordersには書きません）'));
module.exports = { server, enabled, PINNED_SOURCE_HOST, hide };
