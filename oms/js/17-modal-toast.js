// Luna Luce OMS 部品JS: 17-modal-toast（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function renderManualModal(host) {
      host.hidden = true;
      host.innerHTML = '<div class="card" role="dialog" aria-modal="true" aria-labelledby="manual-title"><div class="top"><div><span class="tag">電話・FAX受注入力</span><h2 id="manual-title">電話・FAX・大口注文 新規登録</h2></div><button type="button" class="x" data-action="close-manual" aria-label="閉じる">×</button></div><div class="grid"><div><label for="manual-type">受付経路</label><select id="manual-type"><option>FAX注文 (0586-86-1140)</option><option>電話注文 (0586-86-1150)</option></select></div><div><label for="manual-wedding">挙式日</label><input id="manual-wedding" type="date" value="2026-12-12"></div><div><label for="manual-delivery">納期（希望納品日）</label><input id="manual-delivery" type="date" value="2026-12-05"></div><div><label for="manual-customer">ご注文者名</label><input id="manual-customer" placeholder="例: 佐藤 健太"></div><div><label for="manual-venue">お届け先</label><input id="manual-venue" placeholder="例: 式場名"></div><div class="span-2"><label for="manual-product">商品名・数量</label><input id="manual-product" value="プチギフト Merci アールグレイ＆フィナンシェ × 65個"></div><div><label for="manual-couple">名入れ新郎新婦名</label><input id="manual-couple" placeholder="例: Kenta & Yui"></div><div><label for="manual-noshi">熨斗・タグ指定</label><input id="manual-noshi" value="オリジナルサンクスタグ付"></div></div><p class="retired">サンクスカードは新規では選べません。過去の注文の内訳は残します。</p><div class="buttons"><button type="button" class="cancel" data-action="close-manual">キャンセル</button><button type="button" class="ok" data-action="submit-manual">受注キューへ登録する</button></div></div>';
    }
    function renderToast(host) {
      host.hidden = true;
      host.innerHTML = '<div class="bubble" role="status"><span class="dot"></span><span data-toast-text>処理が完了しました</span></div>';
    }

    const APP_PARTS = [
      { name: 'header', render: renderHeader },
      { name: 'main', render: renderMain },
      { name: 'drawer', render: renderDrawer },
      { name: 'manual-modal', render: renderManualModal },
      { name: 'toast', render: renderToast }
    ];

