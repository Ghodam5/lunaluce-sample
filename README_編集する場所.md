# 編集する場所（v30以降）

制作ルール.md・更新履歴.mdを先に読む。林さんの指示がない限り、共通部分は変更しない。

## 商品ページを作る・直す

- ページの外枠・固有の本文：`site-src/pages/item.html`
- 商品ページ内の表示・購入欄：`item-page.js`、`product-detail.js`
- 商品専用の見た目：`product-detail.css`、`pilot-inputs.css`
- 商品の写真・説明・価格・名入れ条件：`site-src/products/<商品ID>.json`（1商品1ファイル。元DB・元シートは変更しない）
- `product-data.js`／`product-detail-data.js`は自動生成物。直接読んだり編集したりしない。
- 他のページの本文：`site-src/pages/ページ名.html`

本文の前後にある `{{> header}}` などは共通部品を差し込む印。商品ページの編集ではこの印を残し、本文だけを変更する。
直下のitem.htmlやtop.html等は公開用に生成したファイル。直接直すと編集元と食い違い、生成時に戻るため、編集しない。

## 共通部分を直す（林さんの明示指示がある場合）

| 内容 | 編集元 |
|---|---|
| 上下で使うロゴ画像と代替テキスト | site-src/shared/logo.html |
| 上の配置・検索・大カテゴリ・キャンペーン導線 | site-src/shared/header.html |
| 開閉メニュー | site-src/shared/drawer.html |
| 下のロゴ・会社名・案内・会社情報・カレンダー | site-src/shared/footer.html |
| スマホ下部メニュー | site-src/shared/bottom.html |
| 送料無料などの帯 | site-src/shared/shipping.html |
| 共通の見た目 | style.css |
| 大カテゴリ収納の操作 | header-scroll.js |
| 共通アイコン・横スクロール | catico.js、hscroll.js |

現在のページ差はsite-src/pages.jsonに明記。ホームの選択状態、キャンペーン導線やおすすめ特集の有無、簡易ページの下部ナビなど、従来の状態を保持している。フッターがなかった5ページへ新しく追加する変更はしていない。

共通部品・共通CSSと操作はsite-src/shared.lock.jsonで変更を検知する。商品作業でここが変わったら、意図せず触っていないか調べて戻す。この検知は誤操作防止でありアクセス制限ではない。

## 生成して確かめる

1. 版番号はsite-src/version.jsonの数字を一つ上げる。各ページ・共通部品の `?v={{version}}` は自動で同じ番号になる。
2. `node tools/build-site.cjs` を実行し、直下の公開HTMLへ反映する。
3. `node tools/build-site.cjs --check` で生成漏れと共通部分の保護を確認する。
4. `node --test tools/build-site.test.cjs` で本文編集・共通変更検知・生成HTML直接編集検知の仕組みを確認する。
5. 従来通りluna-qa.cjsの5幅とvisual-checkを実行する。商品作業でも表示確認は省略しない。

林さんの指示による共通部分の変更を確認した場合だけ、`node tools/build-site.cjs --update-shared-lock` で変更済みの共通部品を記録して生成する。商品ページだけの作業でこの指定を使わない。
新しいページはsite-src/pages/とpages.jsonに追加する。既存ページの設定を参考にする。

## 公開の仕組み

ビルドで作った直下のHTMLをGitHub Pagesがそのまま配信する。表示中に共通部品を通信で読み込む方式ではないため、JavaScriptの読込順・カート・メニューの初期化は従来通り。
.nojekyllはテンプレートをGitHub側で再解釈させず、生成済みの静的ファイルを配信するために置いている。
将来のWordPress＋Welcart実装でも共通部分と商品テンプレートを分ける方針を引き継ぐ。この変更で本番WordPressや元DBを変更していない。

GitHubへの送信時にも「共通部品と公開HTMLの一致確認」が生成漏れと部品保護を検査する。これは5幅・visual-checkの代わりではない。

## 印刷と備考欄（v31）
印刷ページの記入例・印刷準備はsupport-ui.jsとsupport.cssで統一する。記入例と実入力を区別し、beforeprint/afterprintで記入例を除外・復帰する。印刷のために元データを消さない。
全ページの備考・複数行欄はnotes-resize.js／notes-resize.cssが担当し、site-src/shared/notes-head.htmlとnotes-script.htmlから読み込む。後から表示される欄も自動で対象になる。共通部品として保護するため、全体変更が依頼された場合だけ変更する。

## トップの案内カード（v32）
9項目のリンクと文言はsite-src/pages/top.htmlの#home-guides、専用の見た目はhome-guides.css。既存のimages/guides/のアイコンを使う。Q&Aだけ濃い背景にせず、白地・細枠と従来の印象を保つ。

## ページ移動の表示位置（v33）
navigation-position.jsを共通navigation-head.htmlから早期に読み込み、通常のページ移動・戻る・進む・再読込は先頭表示。見出しへのhashリンクと読込中に始めた操作は尊重する。カテゴリの中分類・小分類はcat2.jsから専用イベントで先頭に戻す。もっと見る・並べ替え・絞り込みでは位置を維持する。移動の仕組みを変更する場合だけ共通部品の保護を更新する。

## SNS共有（v34）
トップの配置はsite-src/pages/top.htmlのdata-share-page、商品の配置はpage-share.jsが購入欄の直後へ追加する。見た目はpage-share.css。商品・トップ以外では読み込まない。共有URLは現在のサンプル公開先を基準とし、商品IDだけを付ける。本番移行時は公開先と商品ごとのOGPを整備する。SNSへ自動投稿せず、共有画面を開く機能。


v35：5つのSNSロゴはimages/social/。Font Awesome Brands由来、同フォルダのREADME・LICENSEを保持する。スマホでも5ロゴを常時表示。Threadsは投稿画面へ、Instagramは端末共有またはコピーと案内。専用のURL投稿機能を装わず、自動投稿しない。


## 低い読み取り量で商品を編集する（v36）

最初にこの節と制作ルールの該当箇所を読む。通常はページ全体・商品全件・共通HTMLを読み直さない。

1. `node tools/products.cjs find キーワード` でIDを探す（結果はID・コード・商品名だけ）。
2. `node tools/products.cjs show 47484` または `site-src/products/47484.json` だけを読む。
3. 当該JSONのproduct（価格・SKU・名入れ等）／detail（写真・詳細説明）だけを編集する。商品IDと既存コードは維持する。
4. `node tools/products.cjs build` で一覧・詳細・カート共通の公開データを生成。`check`で生成漏れを機械検出する。
5. 型・見た目を変える場合だけitem-page.js／product-detail.js等を読む。ヘッダーやフッターは読まず・触らず、共通部品の保護チェックで確認する。
6. 公開時の版上げ・5幅・visual-checkは省略しない。ただしログは要約、異常が出た箇所だけ詳細を読む。

商品追加：既存JSONを参考に新規JSONを作り、画像をimagesへ置き、`node tools/products.cjs add 新規JSONのパス`。既存ID・コードの上書きは拒否する。ページの複製は不要、`item.html?id=ID`が共通の型で表示する。
掲載停止：`node tools/products.cjs archive ID`。元の商品JSONは残る。復帰：`node tools/products.cjs restore ID`。掲載中の一覧・商品詳細・カート参照は同一データを使用する。
順序はsite-src/products/manifest.json、旧サンプルとの対応はcatalog-meta.json。通常の1商品編集では触らない。元DB・元シートへは書き戻さない。
先行5商品の詳細だけを分離して移行した。残り274件の詳細充実は引き続き保留。

## SNS独立共通パーツ（v36）
全ページでshare-head／share-scriptを必須とし、生成時に組込漏れを検出する。page-share.js/cssも共通保護の対象。トップはメイン案内下、商品は購入欄直後、その他は見出し・導入文の近く。商品編集時は変更しない。カート・マイページではお店のトップを共有し、入力した個人情報や検索語は共有しない。

一覧固有の短縮名・写真・分類が従来の商品詳細と異なる場合は、同じ商品JSONのlistingに保持する。通常はproductを参照し、listingがあればその項目だけ一覧用の指定を優先する。分類や一覧画像を変える場合は同じファイル内のlistingも確認する。価格・SKUは常にproductが正で、一覧・商品・カートへ反映する。

現在の生成チェックは商品JSON→公開バンドルの一致も確認する。CIでは商品追加・停止／復帰・他商品の不変性・価格の一覧反映・重複拒否も検証する。通常の編集で全商品JSONをチャットへ出力したり、生成HTMLや生成バンドルを全文表示したりしない。

特集70商品の紹介文・写真・所属は同じ商品JSONのfeatureに保持する。特集の商品名・写真を別指定している場合もそのファイルだけで編集できる。feature.groupsに特集キーを指定して追加可能。特集の価格・SKU・掲載状態はproduct／activeを参照し、停止商品は特集からも外れる。feature-data.jsの固定商品リストは従来互換の控えで、実表示は商品JSONから生成した値に置換する。

旧特集で別IDが同じ商品に対応している場合、featureは配列として旧入口を保持する。価格は両入口とも実際に入る商品／SKUの価格に統一する（54865→72383の旧対応も保持）。
