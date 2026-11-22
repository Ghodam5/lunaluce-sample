#!/bin/sh
# oms-app の起動（docker-compose.yml の command から呼ぶ）。
# 1) GitHub から OMS の画面（OMS_REF）を取り込む  2) ログインの仕組み（oms-auth）を動かす  3) Caddy で受け付ける
set -e
SRC=/tmp/ops   # この start.sh と auth.js・Caddyfile がある所（compose が取り込み済み）
mkdir -p /srv/oms /srv/images /tmp/src /auth
wget -qO- "https://codeload.github.com/Ghodam5/lunaluce-sample/tar.gz/refs/heads/${OMS_REF}" | tar -xz -C /tmp/src
cp -R /tmp/src/*/oms/. /srv/oms/
cp -R /tmp/src/*/images/. /srv/images/
cp /srv/oms/luna_luce_oms_ui_v2.html /srv/oms/index.html
echo "OMS画面を取り込みました（${OMS_REF}）"
# oms-auth は止まってもすぐ起こし直す
( while true; do node "$SRC/auth.js" || true; echo "oms-auth が止まったので起こし直します"; sleep 2; done ) &
exec caddy run --config "$SRC/Caddyfile" --adapter caddyfile
