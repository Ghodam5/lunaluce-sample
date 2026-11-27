# Luna OMS Receiver（OMSからの受け取り）

ルナルーチェOMSのサイトビルダーで書き出した `site-builder-draft.json` を、Welcart 2.x に登録する WordPress プラグイン。

- 入れる場所: まず検証用サイト（https://renewal-test.luna-luce.info）だけ。本番（luna-luce.jp）には入れない。
- 使い方: WordPress 管理画面 → ツール → **OMSから取り込む** → ファイルを選ぶ →「何が変わるかを見る」→ 確認して「この内容でWelcartに登録する」。
- 自動で送るとき: `POST /wp-json/luna-oms/v1/import`（`{draft, dry_run}`、dry_run を省くと試しだけ）。認証は WordPress のアプリケーションパスワード。パスワードは記録しない。

## 何をどう入れるか
| OMS | Welcart |
|---|---|
| 商品コード | 商品コード（itemCode）。この値で既存の商品を探す |
| 商品名・説明・仕様・注意事項 | 投稿のタイトル・本文 |
| 種類（skus） | SKU（code・name・price・stock）。Welcartにだけある種類は消さずに知らせる |
| 在庫の状態 in/few/wait/out/end | SKUの在庫状態（usces_zaiko_status の名前で探す。end は下書きに戻す） |
| 写真（1枚目がメイン） | メディア。題名は「商品コード」「商品コード__1」…（Welcartの決まり）。このプラグインが入れた写真だけ入れ替える |
| 最低数量・入荷予定日・OMSの商品番号 | 投稿メタ `_luna_oms_minq` `_luna_oms_eta` `_luna_oms_id` |
| 営業日 businessDays {from,to,holidays} | `usces` オプションの business_days[年][月][日]（1=営業・0=発送休み） |

## 確かめ方
`php wordpress/luna-oms-receiver/tests/run.php`（WordPressなしで、代わりの関数を使って流れを確かめる）

## 注文の試験送信（初期オフ）

検証用サイトから OMS の試験受け口（`https://oms.srv2050136.hstgr.cloud/intake-api/test-orders`）へ、注文が届くかを確かめるスイッチです。

- 初期値はオフ。オフのときは Welcart のフック `usces_action_reg_orderdata`（Welcart 2.12.9）を登録しません。
- オンにするには、管理画面で確認文「試験送信をオンにする」を再入力し、試験用トークンを入れます。
- 送り先は固定です。本番の受注データ（`oms.orders`）には書きません。住所・電話・メールは送りません。在庫の書き戻しはありません。
- オンにするのは林さんの了承後だけ。試したらオフに戻します。
