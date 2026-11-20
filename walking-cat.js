/* 白猫の歩行部品。4本の脚・しっぽ・顔を別要素で編集する。 */
(()=>{'use strict';window.LunaWalkingCat=Object.freeze({markup:()=>`<svg class="announcement-cat walking-cat" viewBox="0 0 112 60" aria-hidden="true" focusable="false">
 <g class="cat-leg cat-front-far"><path d="M43 34Q44 43 37 51L31 52"/></g>
 <g class="cat-leg cat-back-far"><path d="M79 36Q73 44 81 51L87 52"/></g>
 <g class="cat-upper">
  <g class="cat-tail"><path d="M87 30C100 30 109 22 103 11Q100 6 103 4"/></g>
  <path class="cat-body" d="M35 24Q43 16 60 17C77 16 91 22 91 34Q91 44 75 45H48Q34 44 34 35Z"/>
  <path class="cat-head" d="M15 19L16 5Q16 2 20 5L29 12L38 5Q42 2 42 7L42 20Q47 27 40 34Q33 42 22 37L12 30Q6 26 15 19Z"/>
  <path class="cat-inner-ear" d="M18 8L25 14L18 17ZM38 9L39 19L32 15Z"/>
  <g class="cat-eyes"><ellipse cx="21" cy="24" rx="1.6" ry="2.2"/><ellipse cx="33" cy="24" rx="1.6" ry="2.2"/></g>
  <path class="cat-nose" d="M24 29Q27 27 29 29L26.5 31Z"/>
  <path class="cat-mouth" d="M26.5 31V33M26.5 33Q23 35 21 33M26.5 33Q29 35 31 33"/>
  <path class="cat-whiskers" d="M18 29L5 27M18 32L4 34M35 29L47 27M35 32L47 35"/>
 </g>
 <g class="cat-leg cat-front-near"><path d="M44 36Q45 45 39 53L32 54"/><path class="cat-toes" d="M33 52V54M36 52V54"/></g>
 <g class="cat-leg cat-back-near"><path d="M80 37Q76 45 84 53L91 54"/><path class="cat-toes" d="M86 52V54M89 52V54"/></g>
</svg>`});})();
