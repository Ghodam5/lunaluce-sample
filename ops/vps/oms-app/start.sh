#!/bin/sh
# oms-app の起動（docker-compose.yml の command から呼ぶ）。
# 1) GitHub から OMS の画面（OMS_REF）を取り込む  2) ログインの仕組み（oms-auth）と工程の記録（oms-work）を動かす  3) Caddy で受け付ける
# 4) 自動入れ替え: GitHub のブランチが進んだら（マージ・push）、hPanel を触らなくても入れ替わる
#    - OMS_REF（OMSの画面）が進んだ → 画面のファイルだけ入れ替える（止まらない。ログインもそのまま）
#    - OPS_REF（この start.sh・ログインの仕組み）が進んだ → 入れ物ごと起こし直す（20秒ほど止まる）
#    見に行く間隔は OMS_POLL 秒（省略時 60）。0 にすると自動入れ替えをしない。
#    GitHub の公開の住所（git の refs 一覧）を見るだけなので、鍵やトークンは要らない。
set -e
SRC=/tmp/ops   # この start.sh と auth.js・Caddyfile がある所（compose が取り込み済み）
REPO=Ghodam5/lunaluce-sample
POLL=${OMS_POLL:-60}
mkdir -p /srv/oms /srv/images /tmp/src /auth

# ブランチのいまのコミット（40桁）。取れないときは空
ref_sha() {
  wget -qO- "https://github.com/$REPO.git/info/refs?service=git-upload-pack" 2>/dev/null | tr -d '\000' |
    sed -n "s#^[0-9a-f]\{4\}\([0-9a-f]\{40\}\) refs/heads/$1\$#\1#p" | head -n 1
}
# OMSの画面を、そのコミットの中身で入れ替える（別の場所に用意してから差し替えるので、途中の形は見えない）
put_oms() {
  sha=$1
  rm -rf /tmp/src /srv/oms.new && mkdir -p /tmp/src
  wget -qO- "https://codeload.github.com/$REPO/tar.gz/${sha:-refs/heads/$OMS_REF}" | tar -xz -C /tmp/src || return 1
  dir=$(ls -d /tmp/src/*/ | head -n 1)
  [ -f "${dir}oms/luna_luce_oms_ui_v2.html" ] || { echo "取り込んだ中身にOMSの画面がありません（入れ替えません）"; return 1; }
  cp -R "${dir}images/." /srv/images/
  cp -R "${dir}oms" /srv/oms.new
  cp /srv/oms.new/luna_luce_oms_ui_v2.html /srv/oms.new/index.html
  # 画面のJS/CSSは Cache-Control: no-cache でも、ブラウザが古いファイルを使い続けることがある。
  # コミットをURLに足すと、新しい版に入れ替わったあと必ず新しいファイルを取りに行く。
  if [ -n "$sha" ]; then
    for html in /srv/oms.new/index.html /srv/oms.new/luna_luce_oms_ui_v2.html /srv/oms.new/work.html; do
      [ -f "$html" ] || continue
      sed -i 's#src="js/\([^"]*\.js\)"#src="js/\1?v='"$sha"'"#g; s#href="css/\([^"]*\.css\)"#href="css/\1?v='"$sha"'"#g' "$html"
    done
  fi
  printf '{"ref":"%s","commit":"%s","at":"%s"}\n' "$OMS_REF" "$sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /srv/oms.new/version.json
  rm -rf /srv/oms.old
  if [ -d /srv/oms ]; then mv /srv/oms /srv/oms.old; fi
  mv /srv/oms.new /srv/oms
  rm -rf /srv/oms.old /tmp/src
}

OMS_SHA=$(ref_sha "$OMS_REF")
OPS_SHA=$(ref_sha "$OPS_REF")
put_oms "$OMS_SHA"
echo "OMS画面を取り込みました（${OMS_REF} ${OMS_SHA%"${OMS_SHA#???????}"}）"

# yaml が取り込むのは start.sh・auth.js・auth-pages.js・Caddyfile の4つだけなので、あとから足した部品はここで取り込む（yaml を変えずに済む）
for f in work.js; do
  [ -f "$SRC/$f" ] || cp /tmp/ops-src/*/ops/vps/oms-app/$f "$SRC/" 2>/dev/null || echo "$f がありません（工程の記録は使えません）"
done

# oms-work（工程の状態と作業ログ）も止まったら起こし直す。データは oms-auth-data の中の work/
( while true; do node "$SRC/work.js" || true; echo "oms-work が止まったので起こし直します"; sleep 2; done ) &

# oms-auth は止まってもすぐ起こし直す
( while true; do node "$SRC/auth.js" || true; echo "oms-auth が止まったので起こし直します"; sleep 2; done ) &

# 自動入れ替え
if [ "$POLL" -gt 0 ] 2>/dev/null; then
  echo "自動入れ替え: ${POLL}秒ごとに ${OMS_REF}（画面）と ${OPS_REF}（仕組み）を見ます"
  ( while true; do
      sleep "$POLL"
      now=$(ref_sha "$OMS_REF")
      if [ -n "$now" ] && [ "$now" != "$OMS_SHA" ]; then
        if put_oms "$now"; then
          echo "新しい版に入れ替えました（${OMS_REF} ${now%"${now#???????}"}）"
          OMS_SHA=$now
        else
          echo "入れ替えに失敗しました。前の版のまま動かし、次の回にもう一度試します"
        fi
      fi
      ops=$(ref_sha "$OPS_REF")
      if [ -n "$ops" ] && [ -n "$OPS_SHA" ] && [ "$ops" != "$OPS_SHA" ]; then
        echo "仕組み（${OPS_REF}）が新しくなったので、入れ物ごと起こし直します"
        kill -TERM 1
      fi
    done ) &
fi

exec caddy run --config "$SRC/Caddyfile" --adapter caddyfile
