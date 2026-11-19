(()=>{'use strict';
const base='https://ghodam5.github.io/lunaluce-sample/';
let bar=document.querySelector('[data-share-page="top"]'),product=null;
if(!bar){
 const host=document.getElementById('sample-item'),buy=host&&host.querySelector('#product-buy');if(!buy)return;
 const id=new URLSearchParams(location.search).get('id')||'ecoflavor-104-101';product=window.ShopCatalog&&ShopCatalog.get(id);if(!product)return;
 bar=document.createElement('div');bar.className='page-share';bar.dataset.sharePage='item';buy.after(bar);
}
const url=new URL(product?'item.html':'top.html',base);if(product)url.searchParams.set('id',String(product.id));
const title=product?(document.querySelector('#sample-item h1')?.textContent.trim()||product.title)+'｜ルナルーチェ':'ルナルーチェ｜名入れギフト・ブライダルグッズ';
bar.setAttribute('role','group');bar.setAttribute('aria-label',product?'この商品をシェア':'このページをシェア');
const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4M8.5 13.5l7 4"/></svg>';
bar.innerHTML='<p class="share-label">'+icon+(product?'この商品をシェア':'このページをシェア')+'</p><div class="share-actions"><button class="share-control share-native" type="button" hidden>'+icon+'シェア</button><span class="share-platforms"></span><button class="share-control share-copy" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/></svg>コピー</button></div><p class="share-status" role="status" aria-live="polite"></p><input class="share-manual" aria-label="共有するページのリンク" readonly hidden>';
const platforms=bar.querySelector('.share-platforms'),native=bar.querySelector('.share-native'),copy=bar.querySelector('.share-copy'),status=bar.querySelector('.share-status'),manual=bar.querySelector('.share-manual');
for(const [name,endpoint,params] of [['X','https://twitter.com/intent/tweet',{text:title,url:url.href}],['LINE','https://social-plugins.line.me/lineit/share',{url:url.href}],['Facebook','https://www.facebook.com/sharer/sharer.php',{u:url.href}]]){
 const link=document.createElement('a');const endpointURL=new URL(endpoint);Object.entries(params).forEach(([k,v])=>endpointURL.searchParams.set(k,v));link.className='share-control';link.href=endpointURL.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=name;link.setAttribute('aria-label',name+'でシェア（別の画面で開きます）');platforms.append(link);
}
manual.value=url.href;copy.setAttribute('aria-label',(product?'この商品':'このページ')+'のリンクをコピー');native.setAttribute('aria-label','共有メニューを開く');
const mobile=matchMedia('(max-width:767px), (pointer:coarse)');let nativeFailed=false;
function mode(){const available=typeof navigator.share==='function'&&mobile.matches&&!nativeFailed;native.hidden=!available;platforms.hidden=available;}
mode();if(mobile.addEventListener)mobile.addEventListener('change',mode);else mobile.addListener(mode);
native.addEventListener('click',async()=>{
 status.textContent='';native.disabled=true;
 try{await navigator.share({title,url:url.href});}
 catch(error){if(error?.name!=='AbortError'){nativeFailed=true;mode();status.textContent='共有メニューを開けませんでした。SNSを選ぶか、リンクをコピーしてください。';}}
 finally{native.disabled=false;}
});
function legacyCopy(){const active=document.activeElement,input=document.createElement('input');input.value=url.href;input.readOnly=true;input.style.cssText='position:fixed;left:-9999px;top:0;font-size:16px';document.body.append(input);input.select();let result=false;try{result=document.execCommand('copy');}finally{input.remove();if(active&&active.focus)active.focus({preventScroll:true});}return result;}
copy.addEventListener('click',async()=>{
 status.textContent='';manual.hidden=true;
 try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(url.href);else if(!legacyCopy())throw Error('copy unavailable');status.textContent='リンクをコピーしました';}
 catch{manual.hidden=false;manual.focus();manual.select();status.textContent='このリンクを選択してコピーしてください';}
});
})();
