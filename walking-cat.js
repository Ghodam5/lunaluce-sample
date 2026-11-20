/* ご提供SVGの猫と蝶々。位置だけ帯の幅に合わせる共通部品。 */
(()=>{'use strict';window.LunaWalkingCat=Object.freeze({markup:()=>`<div class="cat-banner-wrap"><svg class="gemini-cat" viewBox="0 0 1000 80" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">


    <!-- 蝶々 -->
    <g class="butterfly">
      <g class="wing-l">
        <ellipse cx="-4" cy="-3" rx="5" ry="3.5" fill="#fff59d" transform="rotate(-25 -4 -3)"/>
        <ellipse cx="-3" cy="2" rx="3.5" ry="2.5" fill="#ffe082" transform="rotate(20 -3 2)"/>
      </g>
      <g class="wing-r">
        <ellipse cx="4" cy="-3" rx="5" ry="3.5" fill="#fff59d" transform="rotate(25 4 -3)"/>
        <ellipse cx="3" cy="2" rx="3.5" ry="2.5" fill="#ffe082" transform="rotate(-20 3 2)"/>
      </g>
      <ellipse cx="0" cy="0" rx="1.2" ry="4" fill="#5d4037"/>
    </g>

    <!-- 猫本体 -->
    <g class="cat-mover">
      <g class="cat-size" transform="scale(.9)"><g class="cat-pose">
        <!-- 奥側の足 -->
        <rect class="leg-br" x="-18" y="-16" width="5.5" height="16" rx="2.75" fill="#e8e2d5"/>
        <rect class="leg-fr" x="9" y="-16" width="5.5" height="16" rx="2.75" fill="#e8e2d5"/>

        <!-- しっぽ -->
        <path class="cat-tail" d="M -20 -19 C -32 -22, -36 -36, -27 -40" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round"/>

        <!-- 胴体 -->
        <ellipse cx="-2" cy="-19" rx="20" ry="11" fill="#fffdf7"/>
        <!-- 背中のワンポイント模様（不要なら削除可） -->
        <ellipse cx="-5" cy="-25" rx="7" ry="4" fill="#f3dfc1" opacity="0.8"/>

        <!-- 手前側の足 -->
        <rect class="leg-bl" x="-13" y="-16" width="6" height="16" rx="3" fill="#fffdf7"/>
        <rect class="leg-fl" x="13" y="-16" width="6" height="16" rx="3" fill="#fffdf7"/>

        <!-- 頭 -->
        <g class="cat-head">
          <!-- 耳（左・右） -->
          <polygon points="11,-36 9,-48 19,-40" fill="#fffdf7"/>
          <polygon points="12,-37 11,-44 17,-40" fill="#ffb7c5"/>
          <polygon points="21,-40 28,-48 29,-35" fill="#fffdf7"/>
          <polygon points="22,-39 27,-44 27,-36" fill="#ffb7c5"/>
          <!-- 顔の輪郭 -->
          <circle cx="20" cy="-30" r="11.5" fill="#fffdf7"/>
          <!-- 目 -->
          <circle cx="17.5" cy="-31" r="1.6" fill="#333333"/>
          <circle cx="25.5" cy="-31" r="1.6" fill="#333333"/>
          <circle cx="18" cy="-31.5" r="0.5" fill="#ffffff"/>
          <circle cx="26" cy="-31.5" r="0.5" fill="#ffffff"/>
          <!-- 鼻と口 -->
          <polygon points="21.5,-28.5 23.5,-28.5 22.5,-27.2" fill="#ff9eb5"/>
          <path d="M 20.5 -26.5 Q 21.5 -25.2 22.5 -26.5 Q 23.5 -25.2 24.5 -26.5" fill="none" stroke="#555555" stroke-width="0.9" stroke-linecap="round"/>
          <!-- ひげ -->
          <line x1="11" y1="-29" x2="6" y2="-30" stroke="#bdbdbd" stroke-width="0.8"/>
          <line x1="11" y1="-27" x2="6" y2="-26.5" stroke="#bdbdbd" stroke-width="0.8"/>
          <line x1="29" y1="-29" x2="34" y2="-30" stroke="#bdbdbd" stroke-width="0.8"/>
          <line x1="29" y1="-27" x2="34" y2="-26.5" stroke="#bdbdbd" stroke-width="0.8"/>
        </g>
      </g>
    </g>
</g>  </svg></div>`});})();
