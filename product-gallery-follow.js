/* 商品ページ専用：PC幅（1024px以上）で左の商品写真を右側の内容に合わせて付いてこさせる部品。
   2026-11-26 林さん依頼。スマホ・タブレットの縦並び（1023px以下）では何もしない。
   - 付いてくる位置＝固定ヘッダーの高さ＋16px（ヘッダーに隠れない）
   - 写真・サムネ・拡大ボタンが画面に収まるよう、写真の大きさを画面の高さに合わせて小さくする
   - 低い画面では写真と「‹ 1/4 ›」が収まる大きさにする（サムネ・拡大ボタンは付いてこない）
   - 写真が300pxより小さくなるほど低い画面では付いてこさせない（写真が見えなくなるため） */
(function(){
'use strict';
var mq=matchMedia('(min-width:1024px)'),GAP=16,GOOD_PHOTO=440,MIN_PHOTO=300,gal=null,photo=null,hd=null,raf=0;
function clear(){if(!gal)return;gal.classList.remove('pd-follow','pd-follow-off');gal.style.removeProperty('--pd-follow-top');gal.style.removeProperty('--pd-photo-max');}
function fit(){raf=0;if(!gal||!document.contains(gal))return;
 if(!mq.matches){clear();return;}
 var top=(hd?hd.offsetHeight:0)+GAP,room=innerHeight-top-GAP;
 gal.style.setProperty('--pd-follow-top',top+'px');
 var ok=true;
 if(photo){gal.style.removeProperty('--pd-photo-max');
  var w=photo.offsetWidth,h=photo.offsetHeight,gt=gal.getBoundingClientRect().top,pt=photo.getBoundingClientRect().top,
   all=gal.offsetHeight-h,ctrl=gal.querySelector('.detail-gallery-controls'),
   arrows=ctrl?ctrl.getBoundingClientRect().bottom-gt-h:pt-gt,photoFor=function(extra){return w&&h?Math.floor(w*(room-extra)/h):0;};
  if(gal.offsetHeight>room){
   /* 1) サムネ・拡大ボタンまで全部収まる大きさ  2) 無理なら写真と「‹ 1/4 ›」だけ収まる大きさ（サムネは最初と最後に見える） */
   var size=photoFor(all);if(size<Math.min(w,GOOD_PHOTO))size=photoFor(arrows);
   ok=size>=MIN_PHOTO;if(ok)gal.style.setProperty('--pd-photo-max',Math.min(w,size)+'px');}}
 else ok=gal.offsetHeight<=room;
 gal.classList.toggle('pd-follow',ok);gal.classList.toggle('pd-follow-off',!ok);}
function later(){if(!raf)raf=requestAnimationFrame(fit);}
function start(){gal=document.querySelector('#sample-item .pdp > .gal');if(!gal)return false;photo=gal.querySelector('.detail-gallery-track,.sample-product-photo');hd=document.querySelector('header.hd');
 fit();addEventListener('resize',later);if(mq.addEventListener)mq.addEventListener('change',later);
 if(window.ResizeObserver){var ro=new ResizeObserver(later);if(hd)ro.observe(hd);ro.observe(gal);}
 gal.querySelectorAll('img').forEach(function(img){if(!img.complete)img.addEventListener('load',later,{once:true});});return true;}
/* 商品の中身はitem-page.jsが後から描くので、描かれるまで待つ */
function boot(){if(start())return;var host=document.getElementById('sample-item');if(!host)return;var mo=new MutationObserver(function(){if(start())mo.disconnect();});mo.observe(host,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
