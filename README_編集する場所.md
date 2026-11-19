# 編集する場所（v30以降）

制作ルール.md・更新履歴.mdを先に読む。林さんの指示がない限り、共通部分は変更しない。

## 商品ページを作る・直す

- ページの外枠・固有の本文：`site-src/pages/item.html`
- 商品ページ内の表示・購入欄：`item-page.js`、`product-detail.js`
- 商品専用の見た目：`product-detail.css`、`pilot-inputs.css`
- 商品専用の写真・説明など：`product-detail-data.js`（既存の元DB・元シートは変更しない）
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
