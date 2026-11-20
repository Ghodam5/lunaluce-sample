/* スマホ共通：文書のスクロール距離と同じ速度で収納・復帰する。 */
(()=>{'use strict';const hd=document.querySelector('header.hd');if(!hd)return;
const mq=matchMedia('(max-width:1023px)'),logo=hd.querySelector('.hd-in'),cats=hd.querySelector('.cats'),nav=document.querySelector('.tabs-bottom');if(!logo||!cats)return;
const marker=document.createElement('div');marker.className='mobile-header-marker';marker.setAttribute('aria-hidden','true');hd.before(marker);const space=document.createElement('div');space.className='mobile-header-space';space.setAttribute('aria-hidden','true');hd.after(space);
function slot(el,cls){const s=document.createElement('div');s.className=cls;el.before(s);s.append(el);return s;}
slot(logo,'mobile-logo-slot');slot(cats,'mobile-category-slot');let start=0,lh=58,ch=0,range=1,anchor=scrollY,raf=0;
function bottom(v){document.body.classList.toggle('mobile-nav-away',v);if(nav){nav.inert=v;nav.setAttribute('aria-hidden',String(v));}}
function measure(){start=marker.getBoundingClientRect().top+scrollY;lh=logo.offsetHeight;ch=cats.offsetHeight;range=Math.max(1,lh+ch);hd.style.setProperty('--logo-full',lh+'px');hd.style.setProperty('--cats-full',ch+'px');space.style.height=(lh+ch+hd.querySelector('.hd-search').offsetHeight+1)+'px';update();}
function update(){raf=0;const y=Math.max(0,scrollY),p=mq.matches?Math.min(1,Math.max(0,(y-start)/range)):0;hd.classList.toggle('mobile-scroll-header',mq.matches&&y>start);hd.style.setProperty('--header-progress',String(p));hd.dataset.collapse=String(p);hd.style.setProperty('--logo-offset',Math.min(lh,p*range)+'px');hd.style.setProperty('--cats-offset',Math.max(0,p*range-lh)+'px');logo.inert=cats.inert=p>=.999;cats.setAttribute('aria-hidden',String(p>=.999));if(!mq.matches||y<=2){bottom(false);anchor=y;}else if(y-anchor>12){bottom(true);anchor=y;}else if(anchor-y>12){bottom(false);anchor=y;}}
addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(update);},{passive:true});let width=innerWidth;addEventListener('resize',()=>{if(width!==innerWidth){width=innerWidth;measure();}});mq.addEventListener('change',()=>{hd.classList.remove('mobile-scroll-header');hd.style.setProperty('--header-progress','0');measure();});
if(window.ResizeObserver){const ro=new ResizeObserver(measure);ro.observe(logo);ro.observe(cats);ro.observe(hd.querySelector('.hd-search'));}
document.addEventListener('focusin',e=>{if(nav?.contains(e.target))bottom(false);});
if(hd.hasAttribute('data-shared-menu'))document.addEventListener('click',e=>{if(e.target.closest('[data-open-menu]'))document.body.classList.add('menu-open');if(e.target.closest('[data-close-menu]'))document.body.classList.remove('menu-open');const b=e.target.closest('.drawer .acc>button');if(b)b.parentElement.classList.toggle('open');});
measure();if(document.fonts?.ready)document.fonts.ready.then(measure);
})();
