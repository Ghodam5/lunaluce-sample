/* スマホ共通：先頭以外は検索＋メニューだけ。PCの配置は変更しない。 */
(()=>{'use strict';
const hd=document.querySelector('header.hd');if(!hd)return;
const mq=matchMedia('(max-width:1023px)'),cats=hd.querySelector('.cats'),nav=document.querySelector('.tabs-bottom'),space=document.createElement('div');space.className='mobile-header-space';space.setAttribute('aria-hidden','true');hd.after(space);let last=scrollY,anchor=last,away=false,compact=false,height=hd.offsetHeight;
function bottom(value){away=value;document.body.classList.toggle('mobile-nav-away',value);if(nav){nav.inert=value;nav.setAttribute('aria-hidden',String(value));}}
function fold(value){if(compact===value)return;if(value){height=hd.offsetHeight;space.style.height=height+'px';}compact=value;hd.classList.toggle('min',value);const logo=hd.querySelector('.hd-in');if(logo)logo.inert=value;if(cats){cats.inert=value;cats.setAttribute('aria-hidden',String(value));}}
function update(){const y=Math.max(0,scrollY);if(!mq.matches){fold(false);bottom(false);last=anchor=y;return;}if(y<=2){fold(false);bottom(false);anchor=y;}else{if(y>32)fold(true);if(y-anchor>12){bottom(true);anchor=y;}else if(anchor-y>12){bottom(false);anchor=y;}}last=y;}
addEventListener('scroll',update,{passive:true});mq.addEventListener('change',()=>{fold(false);bottom(false);update();});let width=innerWidth;addEventListener('resize',()=>{if(width!==innerWidth){width=innerWidth;fold(false);bottom(false);update();}});
// 先頭での文字・画像読込による高さ変更だけを測る。
if(window.ResizeObserver)new ResizeObserver(()=>{if(!compact)height=hd.offsetHeight;}).observe(hd);
document.addEventListener('focusin',e=>{if(nav?.contains(e.target))bottom(false);});
if(hd.hasAttribute('data-shared-menu'))document.addEventListener('click',e=>{if(e.target.closest('[data-open-menu]'))document.body.classList.add('menu-open');if(e.target.closest('[data-close-menu]'))document.body.classList.remove('menu-open');const b=e.target.closest('.drawer .acc>button');if(b)b.parentElement.classList.toggle('open');});
update();
})();
