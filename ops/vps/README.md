# OMSのVPS構成（ホスティンガー KVM 1）

OMSは新サイトから切り分けた独立システムとして、ホスティンガーのVPS（Ubuntu 24.04＋Docker＋Traefik）に置く。
処理ごとに部品（Composeアプリ）を分け、1つ直しても他に影響しないようにする。

| 部品 | 役割 | 外から見えるか | ファイル |
|---|---|---|---|
| oms-db | データベース（PostgreSQL 16） | 見えない（oms-net内だけ） | oms-db/docker-compose.yml |
| oms-backup | 毎日03:00(日本時間)にDBの写しを取り14日残す | 見えない | oms-backup/docker-compose.yml |
| oms-app | OMSの画面とログイン（oms-auth: ログイン・ログアウト・招待で登録・パスワード再設定・アカウント管理） | Traefik経由でHTTPS | oms-app/docker-compose.yml・start.sh・auth.js・auth-pages.js・Caddyfile |
| oms-reflect | OMSの「反映」ボタンの受け手（新サイトはGitHubにプルリクエスト、Welcartはテスト環境だけ） | 見えない（oms-app の /api/ から） | oms-reflect/docker-compose.yml |
| oms-intake | 検証用サイトからの試験注文の受け口（初期オフ。専用ストアのみ。本番の oms.orders には書かない） | Traefik経由で /intake-api だけ | oms-intake/docker-compose.yml |
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
5. 順番は oms-db → oms-backup → oms-reflect → oms-app

## 環境欄に入れるもの（値はGitHub・記録に書かない）
- oms-db: `POSTGRES_PASSWORD`
- oms-backup: `POSTGRES_PASSWORD`（oms-dbと同じ）、任意で `KEEP_DAYS`
- oms-app: `OMS_PASSWORD`（オーナーのパスワード）、任意で `OMS_USER`（オーナーのログイン名。省略時 lunaluce）・`OMS_HOST`・`OMS_REF`・`OPS_REF`
- oms-reflect: `GITHUB_TOKEN`（lunaluce-sample だけに Contents と Pull requests の読み書きを付けた fine-grained トークン）。任意で `WELCART_TEST_URL`・`WELCART_TEST_USER`・`WELCART_TEST_APP_PASSWORD`（送り先は `https://renewal-test.luna-luce.info` に固定。それ以外の住所は断る）・`REFLECT_REF`
- oms-intake: 任意で `ORDER_INTAKE_ENABLED`（省略時 0＝オフ）、`ORDER_INTAKE_TOKEN`（試験用。値は書かない）、`INTAKE_REF`

## 反映ボタンの流れ
- 新サイト: oms-reflect がサイトを写し、`tools/apply-oms-export.cjs` とビルドを動かして、変わったファイルをプルリクエストにする。マージは人が確かめてから（マージすると GitHub Pages に出る）。
- Welcart: 固定の検証用サイト（`https://renewal-test.luna-luce.info`）の受け取りプラグイン `POST /wp-json/luna-oms/v1/import` へ送る。「試しに見る」は dry_run。本番・旧コアサーバーの住所は送らない。
- 試験注文の受け口（oms-intake）は初期オフ。オンにしても保存先は専用ストアだけで、本番の `oms.orders` には書かない。
- 楽天・Yahoo: API の申請がすむまではCSV・一覧をダウンロードして手で入れ、画面で「入れた」と記録する。
- 記録は oms-reflect のボリューム（reflect-data）に残る。確かめ: `node --test ops/vps/oms-reflect/server.test.js`

## 住所
- 当面: `https://oms.srv2050136.hstgr.cloud`（VPSの初期ホスト名の下。ホスティンガー側でDNS済み）
- luna-luce.jp のDNS（バリュードメイン）を触れるようになったら、`oms.luna-luce.jp` のAレコードをVPSのIPに向け、oms-app の `OMS_HOST` を変えて再起動する。

## 注意
- 顧客の個人情報はテストに入れない。本番データの取り込みは別途手順を決めてから。
- oms-app は起動時にGitHubから oms/ を取り込み、その後も60秒ごとにブランチを見て、マージ・pushで進んだら自動で入れ替える（OMS_REF=画面は止まらずに入れ替え、OPS_REF=仕組みは入れ物ごと起こし直し）。鍵は要らない（公開の refs 一覧を見るだけ）。入れ替わった版は /oms/version.json とログの「新しい版に入れ替えました」で分かる。yaml を変えたときだけ hPanel で差し替えて展開。
- DBの写しはまだVPSの中だけ。VPS外（Dropbox等）への持ち出しは次の段階で追加する。

## ログイン（oms-app の oms-auth）
- オーナー（最初の管理者）は環境欄の OMS_USER / OMS_PASSWORD。ほかの人は、管理者が「アカウント」画面（/account）で招待リンク（3日・1回だけ）を作って本人に渡し、本人がログイン名とパスワードを決める。誰でも登録できる入口は作らない（林さんの決定 2026-11-22）。
- 権限は 管理者（アカウント管理もできる）と スタッフ。
- パスワードを忘れたら /forgot から管理者に知らせ、管理者が再設定リンク（24時間・1回だけ）を作って渡す。オーナーが忘れたら環境欄の OMS_PASSWORD を新しい値にして再起動。
- パスワードは scrypt で暗号化して oms-auth-data ボリュームに保存。ログインは Cookie（HttpOnly・Secure・SameSite=Strict、14日使わなければ切れる）。5回続けて間違えると15分止まる。
- ログイン・ログアウト・アカウントの変更は記録に残り、/api/ にはログインした人の名前（X-OMS-User）がつく（反映の記録に名前が出る）。
- 確かめ: `node --test ops/vps/oms-app/auth.test.js`
