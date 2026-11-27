# oms-intake（試験注文の受け口）

検証用サイト `https://renewal-test.luna-luce.info` から、注文の送受信が通るかを確かめるための受け口です。

- **初期状態はオフ**（`ORDER_INTAKE_ENABLED=0`）。オフのときは 403 で捨て、何も保存しません。
- 保存先はこの部品専用のファイルストア `oms_test/test_order_inbox.json` だけです。**本番PostgreSQLの `oms.orders` には接続しません。書き込みもしません。**
- 受け付ける送信元は `renewal-test.luna-luce.info` だけです。本番本店の住所は拒否します。
- 認証は環境欄の `ORDER_INTAKE_TOKEN`（Bearer）。値は記録・GitHubに書かないでください。
- オンにするのは、林さんの了承後だけです。試したらオフに戻します。

## 確かめ
`node --test ops/vps/oms-intake/server.test.js`
