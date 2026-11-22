'use strict';
// 部品: oms-auth の画面（ログイン・パスワードを忘れたとき・招待で登録・再設定・アカウント）
// 見た目だけをここに置き、処理は auth.js。画面の文字は利用者が入れたものを必ず esc() してから出す。
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CSS = `
:root{--ink:#2b2620;--forest:#2f5d50;--line:#e5dccf;--bg:#f7f3ec;--muted:#7a6f63;--warn:#b3412e}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 "Hiragino Sans","Noto Sans JP",system-ui,sans-serif}
main{max-width:440px;margin:48px auto;padding:0 16px}
main.wide{max-width:920px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px 20px;margin-bottom:16px}
h1{font-size:20px;margin:0 0 4px}
h2{font-size:16px;margin:0 0 10px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:18px;font-weight:700}
.brand .mark{width:34px;height:34px;border-radius:10px;background:var(--forest);color:#fff;display:flex;align-items:center;justify-content:center}
label{display:block;margin:12px 0 4px;font-size:13px;font-weight:600}
input,select{width:100%;font:inherit;padding:10px 12px;border:1px solid #d8cfc2;border-radius:10px;background:#fff}
button{white-space:nowrap;font:inherit;font-weight:600;padding:10px 16px;border-radius:999px;border:1px solid #d8cfc2;background:#fff;cursor:pointer;min-height:44px}
button.main{background:var(--forest);border-color:var(--forest);color:#fff;width:100%;margin-top:18px}
button.small{min-height:34px;padding:4px 12px;font-size:13px}
button.danger{color:var(--warn);border-color:#e7b9ae}
button:disabled{opacity:.5;cursor:default}
.muted{color:var(--muted);font-size:13px}
.msg{margin-top:12px;font-size:14px;min-height:1.7em}
.msg.ng{color:var(--warn)}.msg.ok{color:var(--forest)}
.links{display:flex;justify-content:space-between;gap:10px;margin-top:14px;font-size:13px}
a{color:var(--forest)}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;vertical-align:middle}
th{font-size:12px;color:var(--muted);font-weight:600}
td .acts{display:flex;flex-wrap:wrap;gap:6px}
.tag{display:inline-block;font-size:12px;border-radius:999px;padding:0 8px;background:#eef3ef;color:var(--forest)}
.tag.off{background:#f6e7e3;color:var(--warn)}
.linkbox{display:flex;gap:8px;margin-top:10px}
.linkbox input{font-size:13px}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:end}
.row>*{flex:1 1 180px}
.row>button{flex:0 0 auto}
.req{background:#fff4e5;border:1px solid #f3c98b;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
ol.log{list-style:none;padding:0;margin:0;font-size:13px;max-height:320px;overflow:auto}
ol.log li{border-bottom:1px dashed var(--line);padding:4px 0}
@media (max-width:640px){
  table.users thead{display:none}
  table.users tr{display:block;border:1px solid var(--line);border-radius:10px;padding:8px;margin-bottom:8px}
  table.users td{display:block;border:0;padding:3px 0}
}`;

// どの画面でも使う送信の仕組み
const JS_POST = `
async function post(url, body){
  const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{}),credentials:'same-origin'});
  let j={}; try{ j=await r.json(); }catch(e){}
  if(!r.ok||j.ok===false) throw new Error(j.error||('うまくいきませんでした（'+r.status+'）'));
  return j;
}
function say(el,text,ok){ el.textContent=text; el.className='msg '+(ok?'ok':'ng'); }
function form(id,fn){
  const f=document.getElementById(id), m=f.querySelector('.msg'), b=f.querySelector('button.main');
  f.addEventListener('submit',async e=>{ e.preventDefault(); b.disabled=true; say(m,'',true);
    try{ await fn(Object.fromEntries(new FormData(f)), m); }catch(err){ say(m,err.message,false); } finally{ b.disabled=false; } });
}`;

function shell(title, inner, wide) {
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">' +
    '<title>' + esc(title) + '｜Luna Luce OMS</title><style>' + CSS + '</style></head><body><main' + (wide ? ' class="wide"' : '') + '>' +
    '<div class="brand"><div class="mark" aria-hidden="true">L</div>Luna Luce OMS</div>' + inner + '</main></body></html>';
}

const PASS_HINT = '<p class="muted">10文字以上。ログイン名を含めないでください。ほかのサイトと同じパスワードは使わないでください。</p>';

const pages = {
  login: d => shell('ログイン', '<form class="card" id="f"><h1>ログイン</h1>' +
    '<label for="name">ログイン名</label><input id="name" name="name" autocomplete="username" autocapitalize="none" required>' +
    '<label for="password">パスワード</label><input id="password" name="password" type="password" autocomplete="current-password" required>' +
    '<input type="hidden" name="next" value="' + esc(d.next) + '"><button class="main">ログインする</button><p class="msg" role="status"></p>' +
    '<div class="links"><a href="/forgot">パスワードを忘れたとき</a><span class="muted">新しく使う人は管理者に招待リンクをもらってください</span></div></form>' +
    '<script>' + JS_POST + 'form("f",async v=>{ const j=await post("/auth/login",v); location.href=j.next; });</script>'),

  forgot: () => shell('パスワードを忘れたとき', '<form class="card" id="f"><h1>パスワードを忘れたとき</h1>' +
    '<p class="muted">ログイン名を送ると、管理者の「アカウント」画面にお知らせが出ます。管理者から再設定のリンク（24時間有効）を受け取って、新しいパスワードを決めてください。</p>' +
    '<label for="name">ログイン名</label><input id="name" name="name" autocomplete="username" autocapitalize="none" required>' +
    '<button class="main">管理者に知らせる</button><p class="msg" role="status"></p><div class="links"><a href="/login">ログインに戻る</a></div>' +
    '<p class="muted">オーナー（最初の管理者）がパスワードを忘れたときは、hPanel の oms-app の環境欄 OMS_PASSWORD を新しい値に変えて再起動すると、その値でログインできます。</p></form>' +
    '<script>' + JS_POST + 'form("f",async (v,m)=>{ const j=await post("/auth/forgot",v); say(m,j.message,true); });</script>'),

  join: d => shell('新規登録', d.ok ? '<form class="card" id="f"><h1>新規登録</h1><p class="muted">招待された権限: ' + esc(d.role) + '</p>' +
    '<label for="name">ログイン名（英小文字・数字・. _ - で3〜32文字）</label><input id="name" name="name" autocomplete="username" autocapitalize="none" pattern="[a-z0-9][a-z0-9._\\-]{2,31}" required>' +
    '<label for="display">表示名（画面と記録に出る名前）</label><input id="display" name="display" maxlength="30" placeholder="例: 山田">' +
    '<label for="password">パスワード</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="10" required>' +
    '<label for="password2">パスワード（もう一度）</label><input id="password2" name="password2" type="password" autocomplete="new-password" minlength="10" required>' + PASS_HINT +
    '<button class="main">登録する</button><p class="msg" role="status"></p></form>' +
    '<script>' + JS_POST + 'const t=new URLSearchParams(location.search).get("t");form("f",async (v,m)=>{ if(v.password!==v.password2) throw new Error("2つのパスワードが違います"); await post("/auth/join",{token:t,name:v.name,display:v.display,password:v.password}); say(m,"登録しました。ログイン画面に移ります",true); setTimeout(()=>location.href="/login",1200); });</script>'
    : '<div class="card"><h1>このリンクは使えません</h1><p>期限（3日）が切れたか、もう使われています。管理者に新しい招待リンクをもらってください。</p><div class="links"><a href="/login">ログインへ</a></div></div>'),

  reset: d => shell('パスワードの再設定', d.ok ? '<form class="card" id="f"><h1>パスワードの再設定</h1><p class="muted">ログイン名: ' + esc(d.name) + '</p>' +
    '<label for="password">新しいパスワード</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="10" required>' +
    '<label for="password2">新しいパスワード（もう一度）</label><input id="password2" name="password2" type="password" autocomplete="new-password" minlength="10" required>' + PASS_HINT +
    '<button class="main">この内容で再設定する</button><p class="msg" role="status"></p></form>' +
    '<script>' + JS_POST + 'const t=new URLSearchParams(location.search).get("t");form("f",async (v,m)=>{ if(v.password!==v.password2) throw new Error("2つのパスワードが違います"); await post("/auth/reset",{token:t,password:v.password}); say(m,"再設定しました。ログイン画面に移ります（ほかの端末はログアウトしました）",true); setTimeout(()=>location.href="/login",1500); });</script>'
    : '<div class="card"><h1>このリンクは使えません</h1><p>期限（24時間）が切れたか、もう使われています。もう一度「パスワードを忘れたとき」から管理者に知らせてください。</p><div class="links"><a href="/forgot">パスワードを忘れたとき</a><a href="/login">ログインへ</a></div></div>'),

  account: d => shell('アカウント', '<div class="top"><h1>アカウント</h1><div class="acts"><a href="/oms/">OMSに戻る</a> ・ <button type="button" class="small" id="logout">ログアウト</button></div></div>' +
    '<div class="card"><h2>自分のアカウント</h2><p id="me" class="muted">読み込み中…</p>' +
    '<form id="fd" class="row"><div><label for="display">表示名</label><input id="display" name="display" maxlength="30"></div><button class="main" style="width:auto">表示名を変える</button><p class="msg" role="status"></p></form></div>' +
    '<form class="card" id="fp"><h2>パスワードを変える</h2>' +
    '<label for="current">今のパスワード</label><input id="current" name="current" type="password" autocomplete="current-password" required>' +
    '<label for="password">新しいパスワード</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="10" required>' +
    '<label for="password2">新しいパスワード（もう一度）</label><input id="password2" name="password2" type="password" autocomplete="new-password" minlength="10" required>' + PASS_HINT +
    '<button class="main">パスワードを変える</button><p class="msg" role="status"></p><p class="muted">変えると、ほかの端末ではログアウトします。</p></form>' +
    (d.admin ? '<div class="card"><h2>パスワードを忘れた人からの連絡</h2><div id="reqs" class="muted">なし</div><div id="resetbox"></div></div>' +
      '<div class="card"><h2>新しい人を招待する</h2><p class="muted">招待リンク（3日有効・1回だけ使える）を作って、本人だけに渡してください。受け取った人が自分でログイン名とパスワードを決めます。</p>' +
      '<form id="fi" class="row"><div><label for="role">権限</label><select id="role" name="role"><option value="staff">スタッフ（OMSの作業）</option><option value="admin">管理者（アカウントの管理もできる）</option></select></div><button class="main" style="width:auto">招待リンクを作る</button><p class="msg" role="status"></p></form><div id="invbox"></div><div id="invites"></div></div>' +
      '<div class="card"><h2>アカウントの一覧</h2><div id="users">読み込み中…</div><p class="msg" id="um" role="status"></p></div>' +
      '<div class="card"><h2>ログインと操作の記録</h2><p class="muted">ログイン・ログアウト・アカウントの変更を残します（新しい順に100件）。反映ボタンを誰が押したかは、反映の画面の記録に名前で出ます。</p><ol class="log" id="log"></ol></div>' : '') +
    '<script>' + JS_POST + `
const ADMIN=${d.admin ? 'true' : 'false'};
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const T=s=>s?new Date(s).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
function linkBox(el,title,j){ el.innerHTML='<p class="msg ok">'+E(title)+'（'+T(j.expires)+' まで）</p><div class="linkbox"><input readonly value="'+E(j.link)+'"><button type="button" class="small">コピー</button></div><p class="muted">このリンクは今しか表示しません。メールやLINEで本人だけに送ってください。</p>';
  el.querySelector('button').onclick=e=>{ const i=el.querySelector('input'); i.select(); navigator.clipboard&&navigator.clipboard.writeText(i.value); e.target.textContent='コピーしました'; }; }
async function me(){ const r=await fetch('/auth/api/me',{credentials:'same-origin'}).then(r=>r.json()); if(!r.ok){ location.href='/login?next=/account'; return; }
  document.getElementById('me').textContent=r.me.display+'（'+r.me.name+'）・'+r.me.roleLabel+(r.me.owner?'・オーナー':'');
  document.getElementById('display').value=r.me.display; }
async function load(){ if(!ADMIN) return; const r=await fetch('/auth/api/users',{credentials:'same-origin'}).then(r=>r.json()); if(!r.ok) return;
  document.getElementById('reqs').innerHTML=r.requests.length?r.requests.map(x=>'<div class="req"><span><b>'+E(x.user)+'</b> がパスワードを忘れました（'+T(x.at)+'）</span><span class="acts"><button class="small" data-reset="'+E(x.user)+'">再設定リンクを作る</button> <button class="small" data-dismiss="'+E(x.user)+'">消す</button></span></div>').join(''):'なし';
  document.getElementById('invites').innerHTML=r.invites.length?'<p class="muted">まだ使われていない招待リンク</p>'+r.invites.map(x=>'<div class="req"><span>'+E(x.roleLabel)+'・作った人 '+E(x.createdBy)+'・'+T(x.expires)+' まで</span><button class="small danger" data-cancel="'+E(x.id)+'">取り消す</button></div>').join(''):'';
  document.getElementById('users').innerHTML='<table class="users"><thead><tr><th>名前</th><th>権限</th><th>状態</th><th>最後のログイン</th><th></th></tr></thead><tbody>'+r.users.map(u=>{
    const fixed=u.owner||u.name===r.me.name;
    return '<tr><td><b>'+E(u.display)+'</b><br><span class="muted">'+E(u.name)+(u.owner?'・オーナー':'')+'</span></td>'+
      '<td>'+(fixed?E(u.roleLabel):'<select data-role="'+E(u.name)+'"><option value="staff"'+(u.role==='staff'?' selected':'')+'>スタッフ</option><option value="admin"'+(u.role==='admin'?' selected':'')+'>管理者</option></select>')+'</td>'+
      '<td>'+(u.active?'<span class="tag">使える</span>':'<span class="tag off">止めている</span>')+'</td><td>'+T(u.lastLogin)+'</td>'+
      '<td><div class="acts"><button class="small" data-reset="'+E(u.name)+'">再設定リンク</button>'+(fixed?'':'<button class="small" data-active="'+E(u.name)+'" data-to="'+(!u.active)+'">'+(u.active?'止める':'使えるようにする')+'</button><button class="small danger" data-del="'+E(u.name)+'">削除</button>')+'</div></td></tr>'; }).join('')+'</tbody></table>';
  document.getElementById('log').innerHTML=r.log.map(x=>'<li>'+T(x.at)+'　'+E(x.what)+'　'+E(x.by)+(x.note?'　<span class="muted">'+E(x.note)+'</span>':'')+'</li>').join('');
}
document.getElementById('logout').onclick=async()=>{ await post('/auth/logout'); location.href='/login'; };
form('fd',async (v,m)=>{ await post('/auth/api/display',v); say(m,'変えました',true); me(); });
form('fp',async (v,m)=>{ if(v.password!==v.password2) throw new Error('2つのパスワードが違います'); await post('/auth/api/password',{current:v.current,password:v.password}); document.getElementById('fp').reset(); say(m,'パスワードを変えました',true); });
if(ADMIN){
  form('fi',async v=>{ const j=await post('/auth/api/invite',v); linkBox(document.getElementById('invbox'),'招待リンクを作りました',j); load(); });
  document.addEventListener('click',async e=>{ const b=e.target.closest('button'); if(!b) return; const um=document.getElementById('um');
    try{
      if(b.dataset.reset){ const j=await post('/auth/api/reset-link',{name:b.dataset.reset}); linkBox(document.getElementById('resetbox'),b.dataset.reset+' の再設定リンクを作りました',j); window.scrollTo(0,0); }
      else if(b.dataset.dismiss){ await post('/auth/api/dismiss-request',{name:b.dataset.dismiss}); }
      else if(b.dataset.cancel){ await post('/auth/api/invite-cancel',{id:b.dataset.cancel}); }
      else if(b.dataset.active){ await post('/auth/api/update',{name:b.dataset.active,active:b.dataset.to==='true'}); }
      else if(b.dataset.del){ if(!confirm(b.dataset.del+' を削除します。元に戻せません。よろしいですか？')) return; await post('/auth/api/delete',{name:b.dataset.del}); }
      else return;
      load();
    }catch(err){ say(um,err.message,false); } });
  document.addEventListener('change',async e=>{ const s=e.target.closest('select[data-role]'); if(!s) return;
    try{ await post('/auth/api/update',{name:s.dataset.role,role:s.value}); say(document.getElementById('um'),'権限を変えました',true); }catch(err){ say(document.getElementById('um'),err.message,false); } load(); });
}
me(); load();` + '</script>', true)
};

module.exports = { render: (name, data) => pages[name](data), esc };
