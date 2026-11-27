// Luna Luce OMS 部品JS: 04-seed-orders（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function seedOrders() {
      const orders = [
        { id: 'WC-20261119-01', channel: 'WELCART', channelLabel: '自社Welcart', orderDate: '2026-11-19 08:42', weddingDate: '2026-11-24', customerName: '高橋 拓也', shippingTo: 'アニヴェルセル表参道 婚礼サロン気付', postalCode: '107-0061', address: '東京都港区北青山3-5-30', phone: '03-5410-8988', productName: '透明アクリル ウェルカムボード「Lumière」', sku: 'LL-WB-001-GLD', qty: 1, amount: 15300, coupleNames: 'Takuya & Misaki', headerMsg: 'WELCOME TO OUR WEDDING', fontStyle: 'モダンカリグラフィ（ゴールド）', noshiSeal: '蝶結び熨斗（内熨斗）', status: '製造・レーザー加工', warning: null, selected: true, rawPayload: { source: 'WordPress Welcart REST / wp_usces_order_meta', usces_order_id: 10842, custom_order: { role_n_couple: 'Takuya & Misaki', role_d_wedding_date: '2026.11.24', role_m_message: 'WELCOME TO OUR WEDDING', role_w_font: 'Modern Calligraphy Gold', role_s_noshi: '蝶結び（内熨斗）' } } },
        { id: 'RK-394810-20261119', channel: 'RAKUTEN', channelLabel: '楽天市場', orderDate: '2026-11-19 07:15', weddingDate: '2026-11-25', customerName: '山本 梨花', shippingTo: 'ご自宅配送（大阪府大阪市中央区）', postalCode: '542-0081', address: '大阪府大阪市中央区南船場2-4-12', phone: '090-1234-5678', productName: '真鍮ガラスケース リングピロー「Étoile」', sku: 'LL-RP-014-BRS', qty: 1, amount: 6930, coupleNames: 'Koji ♡ Rika（旧字体確認要）', headerMsg: 'FOREVER & ALWAYS', fontStyle: 'クラシック明朝（トープ）', noshiSeal: 'ギフトBOXリボン包装', status: '名入れ確認中', warning: '楽天市場の備考欄に特殊記号「♡」が含まれています。レーザー彫刻機用フォントでは「&」への置換推奨のため確認してください。', selected: true, rawPayload: { source: 'Rakuten RMS getOrder API v2.0', orderNumber: '394810-20261119-08419201', remarks: '挙式が来週水曜日のため急ぎでお願いします！ハート記号入れられますか？' } },
        { id: 'YH-lunaluce-100492', channel: 'YAHOO', channelLabel: 'Yahoo!ショッピング', orderDate: '2026-11-18 22:10', weddingDate: '2026-12-03', customerName: '鈴木 健一', shippingTo: 'ザ・リッツ・カールトン東京 宴会デスク気付', postalCode: '107-6245', address: '東京都港区赤坂9-7-1', phone: '03-3423-8000', productName: 'プチギフト「Merci」アールグレイ＆フィナンシェ', sku: 'LL-PG-082-EARL', qty: 72, amount: 30240, coupleNames: 'Kenichi & Ayaka', headerMsg: 'THANK YOU FOR COMING', fontStyle: 'ナチュラル筆記体（ホワイト）', noshiSeal: 'オリジナルサンクスタグ付', status: '校正・データ作成', warning: null, selected: true, rawPayload: { source: 'Yahoo! Shopping orderInfo API', OrderId: 'lunaluce-100492', ShipRequest: '12月1日午前中に会場へ直送希望' } },
        { id: 'WC-20261119-02', channel: 'WELCART', channelLabel: '自社Welcart', orderDate: '2026-11-19 09:30', weddingDate: '2026-12-12', customerName: '伊藤 美咲', shippingTo: 'ご自宅配送（愛知県名古屋市中区）', postalCode: '460-0008', address: '愛知県名古屋市中区栄3-15-8', phone: '080-9876-5432', productName: '【引出物】今治オーガニックタオル木箱セット＋5円ご縁ギフト', sku: 'LL-HG-105-SET', qty: 35, amount: 38675, coupleNames: 'Daisuke & Misaki', headerMsg: 'WITH HEARTFELT THANKS', fontStyle: '和モダン毛筆体（金箔）', noshiSeal: '結び切り10本（新郎新婦連名）', status: '新規受付', warning: null, selected: false, rawPayload: { source: 'WordPress Welcart REST', usces_order_id: 10843, campaign_mark: '5円ご縁' } },
        { id: 'FAX-20261119-01', channel: 'MANUAL', channelLabel: '電話・FAX注文', orderDate: '2026-11-19 09:50', weddingDate: '2026-12-14', customerName: '株式会社ブライダルプロデュース東海', shippingTo: '名古屋マリオットアソシアホテル 資材室気付', postalCode: '450-6002', address: '愛知県名古屋市中村区名駅1-1-4', phone: '052-584-1111', productName: '大口法人注文：オリジナル名入れドラジェBOX', sku: 'LL-BLK-020-DRG', qty: 120, amount: 45600, coupleNames: 'Shota & Haruka', headerMsg: 'HAPPY WEDDING', fontStyle: 'モダンカリグラフィ（ゴールド）', noshiSeal: 'ゴールドリボンシール', status: '校正・データ作成', warning: null, selected: false, rawPayload: { source: 'Manual FAX Order Entry (0586-86-1140)', fax_received_at: '2026-11-19 09:45', corporate_estimate_id: 'EST-2026-889' } },
        { id: 'RK-394810-20261118', channel: 'RAKUTEN', channelLabel: '楽天市場', orderDate: '2026-11-18 19:05', weddingDate: '2026-12-19', customerName: '中村 翔太', shippingTo: 'ご自宅配送（神奈川県横浜市西区）', postalCode: '220-0012', address: '神奈川県横浜市西区みなとみらい2-3-1', phone: '090-5555-1212', productName: 'プリザーブドフラワー 感謝状時計「Grâce」', sku: 'LL-PGF-003-CLK', qty: 2, amount: 33000, coupleNames: '（未入力・備考欄確認要）', headerMsg: 'THANK YOU MOM & DAD', fontStyle: 'クラシック明朝（トープ）', noshiSeal: '贈呈用化粧箱ラッピング', status: '名入れ確認中', warning: '注文時の選択肢で「新郎新婦名・生年月日」が空欄です。サンクスメールにてヒアリングが必要です。', selected: false, rawPayload: { source: 'Rakuten RMS getOrder API v2.0', orderNumber: '394810-20261118-08415590' } },
        { id: 'YH-lunaluce-100488', channel: 'YAHOO', channelLabel: 'Yahoo!ショッピング', orderDate: '2026-11-17 15:20', weddingDate: '2026-11-28', customerName: '小林 結衣', shippingTo: '八芳園 バンケットオフィス気付', postalCode: '108-8631', address: '東京都港区白金台1-1-1', phone: '03-3443-3111', productName: '木製結婚証明書「Chêne（シェーヌ）」ゲスト参加型', sku: 'LL-CRT-009-WOD', qty: 1, amount: 18900, coupleNames: 'Ryosuke & Yui', headerMsg: 'MARRIAGE CERTIFICATE', fontStyle: 'モダンカリグラフィ（ゴールド）', noshiSeal: '専用スタンド＆化粧箱付', status: '梱包・出荷済', warning: null, selected: false, rawPayload: { source: 'Yahoo! Shopping orderInfo API', OrderId: 'lunaluce-100488', tracking_number: '4912-8841-9023' } },
        { id: 'WC-20261117-09', channel: 'WELCART', channelLabel: '自社Welcart', orderDate: '2026-11-17 11:10', weddingDate: '2026-11-29', customerName: '渡辺 麻衣', shippingTo: 'ご自宅配送（兵庫県神戸市中央区）', postalCode: '650-0021', address: '兵庫県神戸市中央区三宮町1-4-3', phone: '070-3322-9988', productName: '席次表・メニュー表 DIY印刷キット「Blanc」', sku: 'LL-PPR-031-WHT', qty: 80, amount: 22400, coupleNames: 'Naoki & Mai', headerMsg: 'WEDDING RECEPTION', fontStyle: 'クラシック明朝（トープ）', noshiSeal: 'ゴールドゴム紐付属', status: '梱包・出荷済', warning: null, selected: false, rawPayload: { source: 'WordPress Welcart REST', usces_order_id: 10831, tracking_number: '4912-8841-8810' } }
      ];
      const extras = {
        'WC-20261119-01': { extraCharApplies: true, extraCharCount: 6, noshiFee: 20, wrappingFee: 0, noshiUpper: '内祝', noshiName: '拓也 美咲', productImage: 'images/products/39600.jpg' },
        'RK-394810-20261119': { wrappingFee: 90 },
        'YH-lunaluce-100492': { bestBefore: '2027-02-28', proofStatus: '送付済' },
        'WC-20261119-02': { campaignMark: '5円ご縁', noshiFee: 20, noshiUpper: '寿', noshiName: '大輔 美咲', wrap: '包装紙 07桜', bag: 'ブライダルバッグ' },
        'FAX-20261119-01': { extraCharApplies: true, extraCharCount: 2, bestBefore: '2027-04-30', proofStatus: '承認済', rushTicket: true, bag: '小袋 キャンディベア／ギフト用紙袋' },
        'RK-394810-20261118': { wrappingFee: 90 },
        'YH-lunaluce-100488': { proofStatus: '承認済', productImage: 'images/products/50447.jpg' }
      };
      const deliveries = {
        'WC-20261119-01': '2026-11-21',
        'RK-394810-20261119': '2026-11-22',
        'YH-lunaluce-100492': '2026-12-01',
        'WC-20261119-02': '2026-12-08',
        'FAX-20261119-01': '2026-12-10',
        'RK-394810-20261118': '2026-12-15',
        'YH-lunaluce-100488': '2026-11-26',
        'WC-20261117-09': '2026-11-23'
      };
      const designLines = {
        'YH-lunaluce-100492': { designId: '', templateId: 'mini-seal-d30', templateVersion: '2026.11.20' },
        'WC-20261117-09': { designId: '', templateId: 'paper-diy-blanc', templateVersion: '2026.11.20' }
      };
      /* 受注で届く選択肢の文字の見本。番号と名前・名前だけ・あいまいの3通り。 */
      const sealTexts = {
        'YH-lunaluce-100492': 'ミニシール柄：08.ハート',
        'RK-394810-20261119': 'シールデザイン=ほっこり雪だるま',
        'WC-20261119-02': 'ミニシール：ティアラ'
      };
      orders.forEach(function (order) {
        if (extras[order.id]) Object.assign(order, extras[order.id]);
        if (sealTexts[order.id]) order.sealText = sealTexts[order.id];
        if (deliveries[order.id]) order.deliveryDate = deliveries[order.id];
        applyStaffDefaults(order);
        const spec = designLines[order.id];
        if (spec) {
          order.line.designId = spec.designId;
          order.line.templateId = spec.templateId;
          order.line.templateVersion = spec.templateVersion;
        }
        order.line.proofStatus = order.proofStatus;
        order.line.sourceText = order.coupleNames;
        applySealText(order);
      });
      state.orders = orders;
    }

