/* お知らせ帯：文字の流れと猫の動き（v58 林さん指示、v69 で全部のすき間に色違いの猫）。
   停止ボタン・マウスを乗せたとき・キーボードで文字を選んだときは止まる。 */
(()=>{'use strict';
const strip=document.querySelector('[data-site-announcements]');if(!strip)return;
const rows=(window.SITE_NOTICES?.notices||[]).filter(x=>x.active&&window.ShopPlacements?.visible({...x,active:true}));
const win=strip.querySelector('.announcement-window'),track=strip.querySelector('.announcement-track');
if(!rows.length){strip.hidden=true;return;}
const C=window.LunaWalkingCat;
track.replaceChildren();
for(let k=0;k<2;k++)rows.forEach(row=>{const a=document.createElement('a');a.href=row.href;a.textContent=row.text;if(k)a.setAttribute('aria-hidden','true'),a.tabIndex=-1;const g=document.createElement('span');g.className='cat-gap';track.append(a,g);});
// v69（林さん指示）：文言と文言のすき間すべてに猫が1匹ずついる。毛色は1匹ずつ違う（白・茶トラ・黒・グレー・クリーム・サバ）。
// 猫は自分のすき間の中だけを歩き、遅れすぎたら走って追いつく。2〜3回走ると数秒眠る（すき間ごと文字と一緒に流れる）。
// 猫をタップするとじゃれるか水を飲み、その間は文字が止まる。
const COATS=['white','tabby','black','gray','cream','mackerel'];
const button=strip.querySelector('[data-notice-pause]');
let manual=false;
button.onclick=()=>{manual=strip.classList.toggle('is-paused');button.setAttribute('aria-pressed',String(manual));button.textContent=manual?'再生':'停止';};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const gaps=[...track.querySelectorAll('.cat-gap')],half=gaps.length/2;
const GAP=200,CAT=C.WIDTH,EDGE=6,MIN_OFF=EDGE,MAX_OFF=GAP-CAT-EDGE;
const TEXT_V=42,WALK_V=TEXT_V*0.8,RUN_V=TEXT_V*2.4;
const rnd=(a,b)=>a+Math.random()*(b-a);
let textX=0,prev=0,holdUntil=0;
const W=()=>win.clientWidth;
// 2周目（つなぎ目用）の猫は1周目と同じ毛色にして、ループの継ぎ目でも色が入れ替わらないようにする
const cats=gaps.map((g,i)=>{const slot=document.createElement('span');slot.innerHTML=C.markup();const el=slot.firstElementChild;
  el.classList.add('coat-'+COATS[(i%half)%COATS.length]);if(i>=half){el.tabIndex=-1;el.setAttribute('aria-hidden','true')}g.append(el);
  return{el,sprite:el.querySelector('.cat-sprite'),off:rnd(MIN_OFF,MAX_OFF),state:'walk',until:0,frame:Math.floor(rnd(0,4)),lastFrame:0,runsLeft:Math.round(rnd(2,3)),nextJump:0};});
const set=(c,s,ms,t)=>{c.state=s;c.frame=0;c.until=ms?t+ms:0;c.el.classList.toggle('is-sleeping',s==='sleep');};
// 文字にマウスを乗せたとき・キーボードで文字を選んだときだけ止める（猫を押したときは止めない）
const held=()=>manual||!!track.querySelector('a:hover')||track.contains(document.activeElement);
cats.forEach(c=>c.el.addEventListener('click',()=>{if(manual||reduce.matches||c.state==='sleep')return;const t=performance.now(),ms=rnd(2600,3600);set(c,Math.random()<0.5?'play':'drink',ms,t);holdUntil=Math.max(holdUntil,t+ms);}));
function draw(c,t){
  let y=0;if(c.state==='jump'){y=-Math.sin(((t%650)/650)*Math.PI)*8}
  c.el.style.transform=`translate(${c.off}px,${y}px)`;
  C.show(c.sprite,c.state,c.frame);
}
function tick(t){
  const dt=prev?Math.min(64,t-prev)/1000:0;prev=t;
  if(reduce.matches){textX=0;track.style.transform='';cats.forEach(c=>{c.state='walk';c.frame=0;draw(c,t)});requestAnimationFrame(tick);return}
  if(!held()){
    if(t>=holdUntil){textX-=TEXT_V*dt;const L=track.scrollWidth/2;if(-textX>=L)textX+=L}
    cats.forEach(c=>{
      if(c.until&&t>c.until){if(c.state==='sleep')c.runsLeft=Math.round(rnd(2,3));set(c,'walk',0,t);c.nextJump=t+rnd(4000,8000)}
      if(!c.nextJump)c.nextJump=t+rnd(4000,8000);
      if(c.state==='walk'||c.state==='run'||c.state==='jump'){
        // すき間の中で、歩くと少しずつ遅れ、走ると前へ追いつく
        c.off+=(TEXT_V-(c.state==='run'?RUN_V:WALK_V))*dt*(t>=holdUntil?1:0);
        if(c.state!=='run'&&c.off>=MAX_OFF-4){c.off=MAX_OFF;set(c,'run',0,t)}
        else if(c.state==='run'&&c.off<=MIN_OFF){c.off=MIN_OFF;c.runsLeft--;if(c.runsLeft<=0)set(c,'sleep',rnd(3000,4500),t);else set(c,'walk',0,t)}
        else if(c.state==='walk'&&t>c.nextJump){set(c,'jump',rnd(900,1300),t);c.nextJump=t+rnd(5000,9000)}
        c.off=Math.min(MAX_OFF,Math.max(MIN_OFF,c.off));
      }
      if(t-c.lastFrame>(C.FRAME_MS[c.state]||200)){c.frame++;c.lastFrame=t}
    });
  }
  track.style.transform=`translateX(${textX}px)`;
  if(win.scrollLeft&&!manual&&!reduce.matches)win.scrollLeft=0;
  cats.forEach(c=>draw(c,t));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
})();
