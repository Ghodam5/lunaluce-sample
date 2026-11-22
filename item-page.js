(function(){
'use strict';
var host=document.getElementById('sample-item');if(!host)return;
var id=new URLSearchParams(location.search).get('id'),p=ShopCatalog.get(id||'ecoflavor-104-101'),esc=OrderForm.escape;
/* お届けまでの日数と、注意事項の定型文（v64）。データは product-data.js の delivery / notes と notice-templates-data.js */
function leadDays(d){return d?'約'+(d.min===d.max?d.min:d.min+'〜'+d.max)+'日':''}
/* 表示する文字（site-src/site-texts.json → site-texts-data.js。OMSの「表示する文字」で直す） */
function T(k,d){var t=window.SITE_TEXTS&&window.SITE_TEXTS[k];return typeof t==='string'&&t?t:d}
function leadHtml(p){var d=p.delivery;if(!d)return '';return '<div class="lead-time"><span class="lead-time-label">'+esc(T('item.leadTime','ご注文からお届けまで'))+'</span><b>'+leadDays(d)+'</b>'+(d.made?'<span class="lead-time-tag">受注生産</span>':'')+(d.made?'<p>お急ぎの場合は、ご注文手続きで「お急ぎ制作を希望する」をお選びください（1,000円〜・日数によりお受けできない場合があります）。</p>':'')+'</div>'}
function autoNotes(p){var a=window.NOTICE_AUTO||{},on={};(a.all||[]).forEach(function(id){on[id]=1});if(p.delivery&&p.delivery.made)(a.made||[]).forEach(function(id){on[id]=1});if(p.expiry||p.allergens)(a.food||[]).forEach(function(id){on[id]=1});if(p.minq>1)(a.minq||[]).forEach(function(id){on[id]=1});return (window.NOTICE_TEMPLATES||[]).map(function(t){return t.id}).filter(function(id){return on[id]})}
function notesHtml(p){var all=window.NOTICE_TEMPLATES||[],ids=Array.isArray(p.notes)?p.notes:autoNotes(p),list=ids.map(function(id){return all.find(function(t){return t.id===id})}).filter(Boolean);if(!list.length)return p.notice?'<h2>'+esc(T('item.notes','ご注文の前に'))+'</h2><p class="product-description">'+esc(p.notice)+'</p>':'';return '<h2>'+esc(T('item.notes','ご注文の前に'))+'</h2><ul class="order-notes">'+list.map(function(t){return '<li class="order-note tone-'+esc(t.tone)+'"><b>'+esc(t.label)+'</b><span>'+esc(t.text.replace(/\{days\}/g,leadDays(p.delivery)||'数日'))+'</span></li>'}).join('')+'</ul>'+(p.notice?'<details class="order-notes-src"><summary>本店の注意書き（原文）</summary><p class="product-description">'+esc(p.notice)+'</p></details>':'')}
/* 商品ページの段組み（v66）。buy（数量・カートに入れる）は写真の右に必ず置き、その前の部品は購入欄の上、後ろの部品は下に出す。site-src/product-layout.json → product-layout-data.js。商品ごとの layout があればそちらを使う */
function layoutOf(p){var d=window.PRODUCT_LAYOUT||{side:['delivery','buy','description','spec','notes','source'],below:['recommend','share','trial']},l=p.layout&&Array.isArray(p.layout.side)&&Array.isArray(p.layout.below)?p.layout:d,side=l.side.filter(function(id){return id!=='buy'}),below=l.below.filter(function(id){return id!=='buy'}),at=l.side.indexOf('buy');side.splice(at<0?0:at,0,'buy');if(side.concat(below).indexOf('share')<0)below.push('share');return {side:side,below:below}}
/* こちらもおすすめ: 同じ小カテゴリー→同じカテゴリーの順に、写真のある商品を10件まで */
function recoList(p){var all=(ShopCatalog.products||[]).filter(function(x){return x.id!==p.id&&x.image&&!x.archived}),pick=[],seen={};function add(list){list.forEach(function(x){if(pick.length<10&&!seen[x.id]){seen[x.id]=1;pick.push(x)}})}
 var subs=p.subs||[],cats=p.categories||[];add(all.filter(function(x){return (x.subs||[]).some(function(k){return subs.indexOf(k)>=0})}));add(all.filter(function(x){return (x.categories||[]).some(function(k){return cats.indexOf(k)>=0})}));add(all);return pick}
function recoHtml(p){var list=recoList(p);if(!list.length)return '';return '<h2>'+esc(T('item.recommend','こちらもおすすめ'))+'</h2><div class="rail-wrap reco-wrap"><button class="rail-nav prev" type="button" aria-label="前の商品へ">‹</button><div class="rail reco-rail" data-standard-rail>'+list.map(function(x){return '<a class="prod" href="item.html?id='+encodeURIComponent(x.id)+'"><div class="ph"><img src="'+esc(x.image)+'" alt="'+esc(x.title)+'" loading="lazy" width="520" height="520"></div><div class="b">'+(x.hasName?'<div class="tags"><span class="n">名入れ</span></div>':'')+'<h4>'+esc(x.title)+'</h4><div class="price">'+x.price.toLocaleString('ja-JP')+'円<small> 税込</small></div></div></a>'}).join('')+'</div><button class="rail-nav next" type="button" aria-label="次の商品へ">›</button></div>'}
function partHtml(id,p){
 if(id==='delivery')return leadHtml(p);
 if(id==='description')return '<h2>'+esc(T('item.description','商品の説明'))+'</h2><p class="product-description">'+esc(p.description||'商品情報は本店ページでもご確認いただけます。')+'</p>';
 if(id==='spec'){var rows=spec('内容量',p.contents)+spec('サイズ',p.size)+spec('材質',p.material)+spec('賞味期限',p.expiry)+spec('アレルゲン',p.allergens)+spec('保存方法',p.storage);return rows?'<table class="spec">'+rows+'</table>':''}
 if(id==='notes')return notesHtml(p);
 if(id==='source')return p.sourceUrl?'<a class="source-link" href="'+esc(p.sourceUrl)+'" target="_blank" rel="noopener">'+esc(T('item.source','本店の商品情報を見る ↗'))+'</a>':'';
 if(id==='recommend')return recoHtml(p);
 if(id==='share')return '<div data-share-slot></div>';
 if(id==='trial')return '<h2>'+esc(T('item.trial','名入れができる商品'))+'</h2><div class="sample-trial-links"><a href="item.html?id=58190">GOEN PB（ふたりの名前・日付）</a><a href="item.html?id=69417">melody piano box（20文字・追加料金）</a><a href="item.html?id=42902">ウェイトドール（刺繍・メッセージ・お急ぎ）</a><a href="category.html?g=all&n=1">'+esc(T('item.trialAll','名入れできる商品一覧へ'))+'</a></div>';
 return ''}
function sideHtml(p,l,ids){return (ids||l.side).map(function(id){var h=partHtml(id,p);return h?'<div class="pd-part pd-'+id+'">'+h+'</div>':''}).join('')}
function belowHtml(p,l){return l.below.map(function(id){var h=partHtml(id,p);return h?'<section class="sec pd-below pd-'+id+'">'+h+'</section>':''}).join('')}
if(!p){host.innerHTML='<h1>商品が見つかりません</h1><p>商品一覧から選び直してください。</p><a class="btn wh" href="category.html?g=all">商品一覧へ</a>';document.querySelector('.sticky-buy').hidden=true;return}
document.title=p.title+'｜ルナルーチェ（サンプル）';
function money(n){return n.toLocaleString('ja-JP')+'円'}
function spec(label,value){return value?'<tr><th>'+label+'</th><td>'+esc(value)+'</td></tr>':''}
var L=layoutOf(p);host.innerHTML='<nav class="crumb"><a href="top.html">ホーム</a><span>›</span><a href="category.html?g=all">商品一覧</a><span>›</span>'+esc(p.title)+'</nav><div class="pdp" style="margin-top:14px"><div class="gal"><div class="sample-product-photo">'+(p.image?'<img src="'+esc(p.image)+'" alt="'+esc(p.title)+'">':'<div class="sample-noimage">商品写真は準備中です</div>')+'</div></div><div class="pinfo"><div class="brand">'+esc(p.category||'サンプル商品')+'</div><h1>'+esc(p.title)+'</h1><p class="product-code">商品番号：'+esc(p.code||p.id)+'</p><div class="tags">'+(p.hasName?'<span class="n">名入れをカートで試せます</span>':'')+'</div><div class="pp" id="product-price"></div>'+sideHtml(p,L,L.side.slice(0,L.side.indexOf('buy')))+'<div class="demo-notice"><strong>お買い物の動作確認用です</strong><p>このページから実際の注文・決済は行いません。</p></div><form id="product-buy" class="buy">'+(p.skus.length>1?'<label for="product-sku">タイプ</label><select id="product-sku" name="sku">'+p.skus.map(function(s,i){return '<option value="'+i+'">'+esc(s.t)+'／'+money(s.price)+'</option>'}).join('')+'</select>':'')+'<label for="qq">数量'+(p.pack===50?'（50個セット）':'')+'</label><div class="qty"><button type="button" data-q="-1" aria-label="数量を減らす">−</button><input id="qq" data-quantity-picker type="number" min="1" max="999" step="1" value="1" inputmode="numeric" aria-label="数量" required><button type="button" data-q="1" aria-label="数量を増やす">＋</button></div>'+(p.hasName?'<p>名入れはカートで選択・入力できます。'+(p.minq>1?p.minq+'個から。':'')+'</p>'+(p.minq>1?'<button id="use-minimum" class="source-link" type="button">名入れを試す数量（'+p.minq+'個）にする</button>':'')+(p.minnote?'<p class="note">'+esc(p.minnote)+'</p>':''):'')+'<div class="calc"><span id="sum2"></span>（税込）<div class="ship"><span id="bar2"></span></div><div class="ship-t" id="ship2"></div></div><button class="btn co pcbuy" type="submit">'+esc(T('item.cart','ダミーカートに入れる'))+'</button><p id="product-feedback" class="cart-feedback" role="status" aria-live="polite"></p></form><div class="details">'+sideHtml(p,L,L.side.slice(L.side.indexOf('buy')+1))+'</div></div></div>'+belowHtml(p,L);
// 確認用5商品のみ、元の商品データを保ったまま詳細表示を置き換える。
var detail=window.PRODUCT_DETAIL_DATA&&PRODUCT_DETAIL_DATA[p.id];
if(detail){
 document.body.classList.add('rich-product');
 host.querySelector('.crumb').outerHTML=ProductDetail.crumbs(p,detail);
 host.querySelector('.gal').innerHTML=ProductDetail.gallery(p,detail);
 var keepNotes=host.querySelector('.pinfo .details .pd-notes');keepNotes=keepNotes?'<section class="sec pd-below pd-notes">'+keepNotes.innerHTML+'</section>':'';
 var keepLead=host.querySelector('.pinfo .details .pd-delivery');if(keepLead)host.querySelector('.pinfo .details').before(keepLead);
 host.querySelector('.pinfo .details').remove();
 host.querySelector('.pdp').insertAdjacentHTML('afterend',ProductDetail.backLink(detail)+ProductDetail.content(detail,p)+keepNotes+ProductDetail.help(p)+ProductDetail.related(detail));
 ProductDetail.bind(host,p,detail);
}
var q=document.getElementById('qq'),select=document.getElementById('product-sku');
function unit(){return window.ShopServices?ShopServices.unit(p,select?Number(select.value):0,Number(q.value)||1):p.price}
function update(){var n=Number(q.value),valid=Number.isInteger(n)&&n>0&&n<=999,total=valid?n*unit():0;document.getElementById('product-price').innerHTML=money(unit())+'<small> 税込'+(p.pack===50?'／50個セット':'')+'</small>';document.getElementById('sum2').textContent=valid?money(total):'数量を確認してください';document.getElementById('bar2').style.width=Math.min(100,total/20000*100)+'%';document.getElementById('ship2').textContent=total>=20000?'送料無料になりました':'あと'+money(20000-total)+'で送料無料';document.getElementById('spp').innerHTML=valid?money(total)+'<small>税込・'+n+(p.pack===50?'セット':'個')+'</small>':'数量を確認してください'}
host.querySelectorAll('[data-q]').forEach(function(b){b.addEventListener('click',function(){q.value=Math.max(1,Math.min(999,(Number(q.value)||1)+Number(b.dataset.q)));update()})});q.addEventListener('input',update);if(select)select.addEventListener('change',update);
var minimum=document.getElementById('use-minimum');if(minimum)minimum.addEventListener('click',function(){q.value=p.minq;update()});
function add(){var feedback=document.getElementById('product-feedback');try{if(!q.reportValidity())return;DemoCart.add(p.id,q.value,select?Number(select.value):0);feedback.innerHTML='追加しました。<a href="sample-cart.html">カートで'+(p.hasName?'名入れ・内容を入力する':'内容を確認する')+'</a>';document.getElementById('sticky-feedback').innerHTML='追加しました。<a href="sample-cart.html">カートへ</a>'}catch(e){feedback.textContent=e.message}}
document.getElementById('product-buy').addEventListener('submit',function(e){e.preventDefault();add()});document.querySelector('.sticky-buy button').addEventListener('click',add);update();
})();
