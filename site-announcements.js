/* お知らせ帯：文字の流れと白猫の動き（v58 林さん指示）。
   猫は文字と文字のすき間だけを歩く。文字より少しだけ遅く歩き、遅れすぎたら走って追いつく。
   2〜3回走ると数秒眠り、その間は文字が止まる。猫をタップするとじゃれるか水を飲み、その間も文字が止まる。
   左端まで行ったら右端から出てくる。停止ボタン・マウスを乗せたとき・キーボードで文字を選んだときは止まる。 */
(()=>{'use strict';
const strip=document.querySelector('[data-site-announcements]');if(!strip)return;
const rows=(window.SITE_NOTICES?.notices||[]).filter(x=>x.active&&window.ShopPlacements?.visible({...x,active:true}));
const win=strip.querySelector('.announcement-window'),track=strip.querySelector('.announcement-track');
if(!rows.length){strip.hidden=true;return;}
const C=window.LunaWalkingCat;
track.replaceChildren();
for(let k=0;k<2;k++)rows.forEach(row=>{const a=document.createElement('a');a.href=row.href;a.textContent=row.text;if(k)a.setAttribute('aria-hidden','true'),a.tabIndex=-1;const g=document.createElement('span');g.className='cat-gap';track.append(a,g);});
const slot=document.createElement('span');slot.innerHTML=C.markup();const cat=slot.firstElementChild;win.append(cat);
const sprite=cat.querySelector('.cat-sprite');
const button=strip.querySelector('[data-notice-pause]');
let manual=false;
button.onclick=()=>{manual=strip.classList.toggle('is-paused');button.setAttribute('aria-pressed',String(manual));button.textContent=manual?'再生':'停止';};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const gaps=[...track.querySelectorAll('.cat-gap')],half=gaps.length/2;
const GAP=200,CAT=C.WIDTH,EDGE=6,MIN_OFF=EDGE,MAX_OFF=GAP-CAT-EDGE;
const TEXT_V=42,WALK_V=TEXT_V*0.8,RUN_V=TEXT_V*2.4;
const rnd=(a,b)=>a+Math.random()*(b-a);
let textX=0,gi=0,off=MIN_OFF,state='walk',until=0,frame=0,lastFrame=0,runsLeft=Math.round(rnd(2,3)),nextJump=0,prev=0;
const W=()=>win.clientWidth;
const gapLeft=i=>gaps[i].offsetLeft+textX;
const set=(s,ms,t)=>{state=s;frame=0;until=ms?t+ms:0;cat.classList.toggle('is-sleeping',s==='sleep');};
function enterFromRight(){const o=Math.min(MAX_OFF,Math.max(MIN_OFF,off));let best=-1;for(let i=0;i<gaps.length;i++){const x=gapLeft(i)+o;if(x>=W()-CAT/2&&(best<0||x<gapLeft(best)+o))best=i}gi=best<0?0:best;off=o;}
// 文字にマウスを乗せたとき・キーボードで文字を選んだときだけ止める（猫を押したときは止めない）
const held=()=>manual||!!track.querySelector('a:hover')||track.contains(document.activeElement);
cat.addEventListener('click',()=>{if(manual||reduce.matches||state==='sleep')return;const t=performance.now();set(Math.random()<0.5?'play':'drink',rnd(2600,3600),t);});
function draw(t){
  let y=0;if(state==='jump'){y=-Math.sin(((t%650)/650)*Math.PI)*8}
  track.style.transform=`translateX(${textX}px)`;
  // 枠の外にいる間は隠す（枠が勝手に横へずれて猫と文字の位置が狂うのを防ぐ）
  const x=gapLeft(gi)+off,inside=x>-CAT&&x<W();
  cat.style.visibility=inside?'':'hidden';
  cat.style.transform=`translate(${inside?x:-CAT*2}px,${y}px)`;
  if(win.scrollLeft&&!manual&&!reduce.matches)win.scrollLeft=0;
  C.show(sprite,state,frame);
}
function tick(t){
  const dt=prev?Math.min(64,t-prev)/1000:0;prev=t;
  if(reduce.matches){textX=0;gi=0;off=MIN_OFF;state='walk';frame=0;draw(t);requestAnimationFrame(tick);return}
  if(!held()){
    const stopped=state==='sleep'||state==='play'||state==='drink';
    if(!stopped){textX-=TEXT_V*dt;const L=track.scrollWidth/2;if(-textX>=L){textX+=L;if(gi>=half)gi-=half}}
    if(until&&t>until){if(state==='sleep')runsLeft=Math.round(rnd(2,3));set('walk',0,t);nextJump=t+rnd(4000,8000)}
    if(!nextJump)nextJump=t+rnd(4000,8000);
    if(state==='walk'||state==='run'||state==='jump'){
      off+=(TEXT_V-(state==='run'?RUN_V:WALK_V))*dt;
      if(state!=='run'&&off>=MAX_OFF-4){off=MAX_OFF;set('run',0,t)}
      else if(state==='run'&&off<=MIN_OFF){off=MIN_OFF;runsLeft--;if(runsLeft<=0)set('sleep',rnd(3000,4500),t);else set('walk',0,t)}
      else if(state==='walk'&&t>nextJump){set('jump',rnd(900,1300),t);nextJump=t+rnd(5000,9000)}
      off=Math.min(MAX_OFF,Math.max(MIN_OFF,off));
      if(gapLeft(gi)+off<-CAT)enterFromRight();
    }
    if(t-lastFrame>(C.FRAME_MS[state]||200)){frame++;lastFrame=t}
  }
  draw(t);requestAnimationFrame(tick);
}
enterFromRight();off=MIN_OFF;gi=0;requestAnimationFrame(tick);
})();
