// Luna Luce OMS 部品JS: 05-db-schema（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    const dbSchemaTables = [
      { name: 'orders', jpName: '統合受注ヘッダ（全販路共通マスター）', description: 'Welcart・楽天・Yahoo!・電話/FAXの注文を一つの形で置く中核テーブルです。この画面の注文はダミーで、本番の取込はまだ接続していません。', indexes: ['UNIQUE (channel, channel_order_id)', 'INDEX idx_orders_wedding_date (wedding_date, status)'], columns: [
        { col: 'id', type: 'UUID / BIGSERIAL', key: 'PK', note: 'OMS内部一意注文ID' },
        { col: 'channel', type: 'VARCHAR(20)', key: 'UQ1', note: 'WELCART | RAKUTEN | YAHOO | MANUAL' },
        { col: 'channel_order_id', type: 'VARCHAR(64)', key: 'UQ1', note: '各販路の元注文番号' },
        { col: 'wedding_date', type: 'DATE', key: 'IDX', note: '挙式日・記念日' },
        { col: 'customer_name', type: 'VARCHAR(100)', key: '', note: '注文者氏名' },
        { col: 'shipping_venue_name', type: 'VARCHAR(150)', key: '', note: '式場名・会場担当' },
        { col: 'oms_status', type: 'VARCHAR(30)', key: 'IDX', note: '新規受付 / 名入れ確認中 / 校正 / 加工 / 出荷済' },
        { col: 'has_parse_warning', type: 'BOOLEAN', key: 'IDX', note: '名入れ要確認フラグ' }
      ]},
      { name: 'item_personalizations', jpName: '名入れ正規化テーブル', description: '名前・日付・見出し・書体・のしを、プリントと管理表にそのまま出せる形で持ちます。', indexes: ['INDEX idx_pers_order_item (order_item_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '名入れ明細ID' },
        { col: 'order_item_id', type: 'BIGINT', key: 'FK', note: 'order_items.id' },
        { col: 'role_n_couple_names', type: 'VARCHAR(120)', key: '', note: '新郎新婦名' },
        { col: 'role_d_event_date_text', type: 'VARCHAR(40)', key: '', note: '印字用日付' },
        { col: 'role_m_header_message', type: 'VARCHAR(160)', key: '', note: '見出し・定型メッセージ' },
        { col: 'role_wh_font_style', type: 'VARCHAR(60)', key: '', note: '書体' },
        { col: 'role_s_noshi_seal', type: 'VARCHAR(80)', key: '', note: '熨斗・シール' },
        { col: 'over_char_fee', type: 'INTEGER', key: '', note: '文字数超過。1注文につき1回。¥500＋¥20×文字数' },
        { col: 'noshi_fee', type: 'INTEGER', key: '', note: 'のし ¥20' },
        { col: 'wrapping_fee', type: 'INTEGER', key: '', note: 'ラッピング ¥90' }
      ]},
      { name: 'order_items', jpName: '受注明細・SKU', description: '商品SKU・数量。親数量から菓子・箱・サンクスカード・ミニシールへ展開します。', indexes: ['INDEX idx_items_order_id (order_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '明細ID' },
        { col: 'order_id', type: 'UUID', key: 'FK', note: 'orders.id' },
        { col: 'unified_sku', type: 'VARCHAR(50)', key: 'IDX', note: '統一SKU' },
        { col: 'product_name', type: 'VARCHAR(200)', key: '', note: '商品名' },
        { col: 'quantity', type: 'INTEGER', key: '', note: '親数量' }
      ]},
      { name: 'campaign_marks', jpName: 'キャンペーン印（名前のみ）', description: '本店カートから渡された印の名前だけを残します。判定や金額の計算はしません。例: 5円ご縁', indexes: ['INDEX idx_mark_order (order_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '印ID' },
        { col: 'order_id', type: 'UUID', key: 'FK', note: 'orders.id' },
        { col: 'mark_name', type: 'VARCHAR(40)', key: '', note: '印の名前。例: 5円ご縁' }
      ]},
      { name: 'channel_raw_payloads', jpName: '受信メモ（ダミー）', description: 'サンプルの受信メモです。楽天・Yahoo・本店の本番取込はまだしません。', indexes: ['INDEX idx_raw_order_id (order_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: 'メモID' },
        { col: 'order_id', type: 'UUID', key: 'FK', note: 'orders.id' },
        { col: 'raw_json', type: 'JSONB', key: '', note: 'ダミーの原文' }
      ]},
      { name: 'production_batches', jpName: '加工CSV出力履歴', description: 'レーザー加工・印字CSVを出した履歴です。', indexes: ['INDEX idx_batch_created_at (created_at)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: 'バッチID' },
        { col: 'batch_code', type: 'VARCHAR(32)', key: 'UQ', note: '例: LASER-20261119-01' },
        { col: 'machine_type', type: 'VARCHAR(40)', key: '', note: 'LASER | CARD | SEAL' }
      ]},
      { name: 'shipments', jpName: '送り状', description: 'ヤマトB2の送り状CSVに出す項目です。モールへの書き戻しはまだ接続していません。', indexes: ['INDEX idx_ship_order_id (order_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '出荷ID' },
        { col: 'order_id', type: 'UUID', key: 'FK', note: 'orders.id' },
        { col: 'carrier_code', type: 'VARCHAR(20)', key: '', note: 'YAMATO' },
        { col: 'tracking_number', type: 'VARCHAR(32)', key: '', note: '伝票番号' }
      ]},
      { name: 'part_stock_moves', jpName: '部品在庫の画面内引当', description: '菓子・箱・サンクスカード・ミニシール。確定で1回だけ減り、再読込で戻ります。', indexes: ['INDEX idx_stock_order (order_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '引当ID' },
        { col: 'order_id', type: 'UUID', key: 'FK', note: 'orders.id' },
        { col: 'part_code', type: 'VARCHAR(20)', key: '', note: 'sweets | box | thanksCard | miniSeal' },
        { col: 'quantity', type: 'INTEGER', key: '', note: '引き落とした数' }
      ]},
      { name: 'personalization_lines', jpName: '名入れ明細の図柄', description: '明細ごとの図柄です。画面の並び番号は恒久キーにしません。未登録は共通参考見本で、実製造には使いません。', indexes: ['UNIQUE (line_id)', 'INDEX idx_line_template (template_id, template_version)'], columns: [
        { col: 'line_id', type: 'VARCHAR(64)', key: 'UQ', note: '明細ID' },
        { col: 'related_id', type: 'VARCHAR(64)', key: 'FK', note: '本体の受注ID' },
        { col: 'design_id', type: 'VARCHAR(16)', key: 'IDX', note: '選択した図柄。空なら未登録' },
        { col: 'source_text', type: 'VARCHAR(200)', key: '', note: '入力原文' },
        { col: 'template_id', type: 'VARCHAR(64)', key: '', note: 'テンプレート' },
        { col: 'template_version', type: 'VARCHAR(32)', key: '', note: '注文時の版' },
        { col: 'proof_status', type: 'VARCHAR(20)', key: '', note: '確認・校正' }
      ]}
    ];

