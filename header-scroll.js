/* 全ページ共通。収納する最初の上スワイプだけを受け止め、次の指操作からページを動かす。 */
(function(){
'use strict';
var hd=document.querySelector('header.hd'),cats=hd&&hd.querySelector('.cats');if(!cats)return;
var root=document.documentElement,mobile=matchMedia('(max-width:1023px)'),gesture=null,held=null,last=scrollY,changingUntil=0;
function zoomed(){return window.visualViewport&&visualViewport.scale>1.02}
function instant(y){window.scrollTo({top:y,left:scrollX,behavior:'auto'})}
function release(){held=null;root.classList.remove('category-scroll-hold');last=scrollY}
function measure(){if(mobile.matches&&!hd.classList.contains('min')&&performance.now()>=changingUntil)hd.style.setProperty('--category-height',cats.getBoundingClientRect().height+'px')}
function fold(value){
 if(hd.classList.contains('min')===value)return;
 if(value)measure();hd.classList.toggle('min',value);cats.inert=value;cats.setAttribute('aria-hidden',String(value));changingUntil=performance.now()+300;
 if(!value)setTimeout(measure,330);
}
function excluded(target){
 if(!target.closest||target.closest('input,textarea,select,[contenteditable=true],dialog,.drawer,.qty,.picker-wheel,.viewer-viewport'))return true;
 if(document.body.classList.contains('menu-open')||document.querySelector('dialog[open]'))return true;
 for(var el=target;el&&el!==document.body&&el!==root;el=el.parentElement){var s=getComputedStyle(el);if(/auto|scroll/.test(s.overflowY)&&el.scrollHeight>el.clientHeight+2&&el.clientHeight>0)return true}
 return false;
}
document.addEventListener('touchstart',function(e){
 release();gesture=null;if(!mobile.matches||e.touches.length!==1||zoomed()||excluded(e.target))return;
 var t=e.touches[0];gesture={x:t.clientX,y:t.clientY,pageY:scrollY,consumed:false,ignore:false,canFold:!hd.classList.contains('min')};
},{passive:true,capture:true});
document.addEventListener('touchmove',function(e){
 if(!gesture)return;
 if(e.touches.length!==1||zoomed()){release();gesture.ignore=true;return}
 if(gesture.ignore)return;
 if(gesture.consumed){if(e.cancelable)e.preventDefault();return}
 var t=e.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
 if(Math.abs(dx)>Math.abs(dy)+4){gesture.ignore=true;return}
 if(gesture.canFold&&dy<0&&Math.abs(dy)>=Math.abs(dx)){
  // 最初の縦移動から既定のスクロールを止め、同じ指の勢いを持ち越さない。
  if(e.cancelable)e.preventDefault();else{gesture.ignore=true;return}
  if(dy<=-10){held=gesture.pageY;root.classList.add('category-scroll-hold');gesture.consumed=true;fold(true);instant(held)}
 }else if(!gesture.canFold&&dy>10&&dy>Math.abs(dx)){
  fold(false);gesture.ignore=true;
 }
},{passive:false,capture:true});
document.addEventListener('touchend',function(e){if(!e.touches.length)gesture=null},{passive:true,capture:true});
document.addEventListener('touchcancel',function(){gesture=null;release()},{passive:true,capture:true});
addEventListener('scroll',function(){
 var y=scrollY;
 if(!mobile.matches||zoomed()){last=y;return}
 if(held!==null){var max=Math.max(0,document.scrollingElement.scrollHeight-innerHeight);held=Math.min(held,max);if(Math.abs(y-held)>.5)instant(held);last=held;return}
 if(performance.now()<changingUntil){last=y;return}
 // タッチ中の収納はtouchmoveだけが担当。キー・ホイール・ページ内移動も閉じ込めない。
 if(!gesture){if(y<last-6||y===0)fold(false);else if(y>160&&y>last+6)fold(true)}
 last=y;
},{passive:true});
document.addEventListener('wheel',release,{passive:true,capture:true});
document.addEventListener('pointerdown',function(e){if(e.pointerType!=='touch')release()},{passive:true,capture:true});
document.addEventListener('keydown',function(e){if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Tab'].indexOf(e.key)>=0)release()},true);
document.addEventListener('focusin',release);
function reset(){release();gesture=null;if(!mobile.matches)fold(false);measure()}
addEventListener('resize',reset);addEventListener('pagehide',release);addEventListener('pageshow',reset);
if(window.visualViewport)visualViewport.addEventListener('resize',function(){if(zoomed())release()});
if(mobile.addEventListener)mobile.addEventListener('change',reset);
// これまでヘッダーがなかったページに付けた共通メニュー。
if(hd.hasAttribute('data-shared-menu')){
 document.addEventListener('click',function(e){if(e.target.closest('[data-open-menu]')){release();document.body.classList.add('menu-open')}if(e.target.closest('[data-close-menu]'))document.body.classList.remove('menu-open');var button=e.target.closest('.drawer .acc>button');if(button)button.parentElement.classList.toggle('open')});
}
measure();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
if(window.ResizeObserver)new ResizeObserver(measure).observe(cats);
})();
