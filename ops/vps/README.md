# OMSのVPS構成（ホスティンガー KVM 1）

OMSは新サイトから切り分けた独立システムとして、ホスティンガーのVPS（Ubuntu 24.04＋Docker＋Traefik）に置く。
処理ごとに部品（Composeアプリ）を分け、1つ直しても他に影響しないようにする。

| 部品 | 役割 | 外から見えるか | ファイル |
|---|---|---|---|
| oms-db | データベース（PostgreSQL 16） | 見えない（oms-net内だけ） | oms-db/docker-compose.yml |
| oms-backup | 毎日03:00(日本時間)にDBの写しを取り14日残す | 見えない | oms-backup/docker-compose.yml |
| oms-app | OMSの画面（いまは試作画面をパスワード付きで表示） | Traefik経由でHTTPS | oms-app/docker-compose.yml |
| oms-worker | 夜間のAI整理（問い合わせ・注文の取り込み） | 見えない | 次の段階で追加 |

部品どうしは `oms-net` というDocker内のネットワークでつながる（oms-dbが作る）。

## 作り方（hPanel）
1. hPanel → VPS → Dockerマネージャー → Compose → 「URLから作成」
2. URLに次のどれかを入れる（ブランチ名は使う版に合わせる）
   - `https://raw.githubusercontent.com/Ghodam5/lunaluce-sample/main/ops/vps/oms-db/docker-compose.yml`
   - `.../ops/vps/oms-backup/docker-compose.yml`
   - `.../ops/vps/oms-app/docker-compose.yml`
3. アプリ名はフォルダ名と同じ（oms-db / oms-backup / oms-app）にする
4. 環境欄にパスワード等を**本人が**入れて「展開する」
5. 順番は oms-db → oms-backup → oms-app

## 環境欄に入れるもの（値はGitHub・記録に書かない）
- oms-db: `POSTGRES_PASSWORD`
- oms-backup: `POSTGRES_PASSWORD`（oms-dbと同じ）、任意で `KEEP_DAYS`
- oms-app: `OMS_PASSWORD`、任意で `OMS_USER`（省略時 lunaluce）・`OMS_HOST`・`OMS_REF`

## 住所
- 当面: `https://oms.srv2050136.hstgr.cloud`（VPSの初期ホスト名の下。ホスティンガー側でDNS済み）
- luna-luce.jp のDNS（バリュードメイン）を触れるようになったら、`oms.luna-luce.jp` のAレコードをVPSのIPに向け、oms-app の `OMS_HOST` を変えて再起動する。

## 注意
- 顧客の個人情報はテストに入れない。本番データの取り込みは別途手順を決めてから。
- oms-app は起動時にGitHubから oms/ を取り込む。GitHubの更新を反映するには oms-app を再起動。
- DBの写しはまだVPSの中だけ。VPS外（Dropbox等）への持ち出しは次の段階で追加する。
