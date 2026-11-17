/* ブライダルバッグ専用のダミーカート。保存するのは商品IDと数量だけ。 */
(function(){
'use strict';
var KEY='lunaluce-demo-cart-v1',catalog=window.FEATURE_CATALOG.products.filter(function(p){return p.canDemo===true||!p.groups});
function item(id){return catalog.find(function(p){return p.id===id})}
function qty(n){n=Number(n);if(!Number.isInteger(n)||n<1||n>999)throw Error('数量は1〜999の整数で入力してください。');return n}
function read(){try{var rows=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(rows))return [];var clean=[];rows.forEach(function(r){if(!r||!item(r.id)||!Number.isInteger(r.qty)||r.qty<1||r.qty>999)return;var old=clean.find(function(x){return x.id===r.id});if(old)old.qty=Math.min(999,old.qty+r.qty);else clean.push({id:r.id,qty:r.qty})});return clean}catch(e){return []}}
function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows))}catch(e){throw Error('このブラウザではカートを保存できません。ブラウザの保存設定をご確認ください。')}updateBadges();if(document.getElementById('demo-cart-lines'))render()}
function add(id,n){if(!item(id))throw Error('この商品はダミーカートに追加できません。');n=qty(n);var rows=read(),r=rows.find(function(r){return r.id===id});if(r)r.qty=qty(r.qty+n);else rows.push({id:id,qty:n});write(rows)}
function set(id,n){n=qty(n);var rows=read(),r=rows.find(function(r){return r.id===id});if(!r)throw Error('商品がカートにありません。');r.qty=n;write(rows)}
function remove(id){write(read().filter(function(r){return r.id!==id}))}
function summary(){return read().reduce(function(s,r){var p=item(r.id);s.total+=p.price*r.qty;s.pieces+=p.pack*r.qty;s.units+=r.qty;return s},{total:0,pieces:0,units:0})}
window.DemoCart={read:read,add:add,set:set,remove:remove,summary:summary};
function money(n){return n.toLocaleString('ja-JP')+'円'}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function updateBadges(){var n=summary().units;document.querySelectorAll('.hd .cnt').forEach(function(e){e.textContent=n});document.querySelectorAll('a.tab.cart').forEach(function(a){a.setAttribute('href','sample-cart.html');Array.from(a.childNodes).filter(function(n){return n.nodeType===3}).forEach(function(t){t.textContent=' カート（'+n+'）'})})}
function render(){var host=document.getElementById('demo-cart-lines');if(!host)return;var rows=read(),sum=summary();host.innerHTML=rows.length?rows.map(function(r){var p=item(r.id);return '<article class="demo-line"><img src="'+esc(p.image)+'" alt="'+esc(p.title)+'"><div><h2>'+esc(p.title)+'</h2><p class="product-code">商品番号：'+esc(p.code)+'</p><p>'+money(p.price)+'（税込）／'+(p.pack===50?'50個セット':'1個')+'</p><form data-cart-update="'+p.id+'"><label>数量（'+(p.pack===50?'セット':'個')+'） <input name="quantity" type="number" min="1" max="999" step="1" value="'+r.qty+'" required inputmode="numeric"></label><button type="submit">更新</button><button type="button" data-remove="'+p.id+'">削除</button><p class="cart-error" role="alert"></p></form><strong>'+money(p.price*r.qty)+'</strong>'+(p.pack===50?'<p>バッグ '+(p.pack*r.qty)+'個分</p>':'')+'</div></article>'}).join(''):'<div class="empty-cart"><h2>カートは空です</h2><p>ブライダルバッグを選び、数量を指定して追加してください。</p></div>';document.getElementById('demo-cart-total').innerHTML=rows.length?'<p>バッグ合計 '+sum.pieces+'個分</p><p>商品代金合計（税込）<strong>'+money(sum.total)+'</strong></p><small>送料は含みません。実際の注文は作成されません。</small>':''}
function boot(){updateBadges();render();document.addEventListener('submit',function(e){var f=e.target.closest('[data-cart-update]');if(!f)return;e.preventDefault();try{set(f.dataset.cartUpdate,f.elements.quantity.value)}catch(err){f.querySelector('.cart-error').textContent=err.message}});document.addEventListener('click',function(e){var b=e.target.closest('[data-remove]');if(b)remove(b.dataset.remove)});window.addEventListener('storage',function(e){if(e.key===KEY){updateBadges();render()}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
