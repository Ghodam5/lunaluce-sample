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
      ]},
      { name: 'channels', jpName: '販路', description: '本店・楽天・Yahoo・Amazonなど。本店が基準の値段。後から足せる（2.46）。', indexes: ['UNIQUE (code)'], columns: [
        { col: 'code', type: 'VARCHAR(32)', key: 'PK', note: 'honten | rakuten | yahoo | amazon | 足した販路' },
        { col: 'name', type: 'VARCHAR(60)', key: '', note: '表示名' },
        { col: 'is_base', type: 'BOOLEAN', key: '', note: '基準の値段の販路（本店）' },
        { col: 'default_mode', type: 'VARCHAR(10)', key: '', note: 'base | up（販路の標準の決め方）' },
        { col: 'default_pct', type: 'NUMERIC(5,1)', key: '', note: '上げ幅（%）' },
        { col: 'round_unit', type: 'INTEGER', key: '', note: '端数の切り上げ単位 1 | 10 | 100' }
      ]},
      { name: 'channel_listings', jpName: '販路ごとの出品', description: '1種類（SKU）×1販路。出す・出さない、決め方、固定の値段、モール側の番号。', indexes: ['UNIQUE (sku_code, channel)'], columns: [
        { col: 'sku_code', type: 'VARCHAR(64)', key: 'FK', note: '種類コード' },
        { col: 'channel', type: 'VARCHAR(32)', key: 'FK', note: 'channels.code' },
        { col: 'listed', type: 'BOOLEAN', key: '', note: '出す・出さない' },
        { col: 'mode', type: 'VARCHAR(10)', key: '', note: 'NULL=販路の標準 | base | up | fixed' },
        { col: 'pct', type: 'NUMERIC(5,1)', key: '', note: 'up のときの上げ幅' },
        { col: 'fixed_yen', type: 'INTEGER', key: '', note: 'fixed のときの値段' },
        { col: 'mall_item_id', type: 'VARCHAR(64)', key: 'IDX', note: '楽天の商品管理番号・Yahooの商品コード・AmazonのSKU/ASIN' }
      ]},
      { name: 'channel_rules', jpName: 'モールの決まり', description: '上げ幅の上限・差の上限・下限・使えない言葉・メモ。出どころと確かめた日を残す。', indexes: ['INDEX (channel)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '決まりID' },
        { col: 'channel', type: 'VARCHAR(32)', key: 'FK', note: 'channels.code' },
        { col: 'kind', type: 'VARCHAR(16)', key: '', note: 'up-max | diff-max | min-yen | ng-words | memo' },
        { col: 'value', type: 'TEXT', key: '', note: '数字または言葉' },
        { col: 'source', type: 'TEXT', key: '', note: '出どころ（URL・資料名）' },
        { col: 'checked_at', type: 'DATE', key: '', note: '確かめた日' }
      ]},
      { name: 'channel_price_history', jpName: '値段を変えた記録', description: '誰がいつ、どの販路の値段をいくらからいくらにしたか。', indexes: ['INDEX (sku_code, channel, changed_at)'], columns: [
        { col: 'sku_code', type: 'VARCHAR(64)', key: 'IDX', note: '種類コード' },
        { col: 'channel', type: 'VARCHAR(32)', key: 'IDX', note: '販路' },
        { col: 'from_yen', type: 'INTEGER', key: '', note: '前' },
        { col: 'to_yen', type: 'INTEGER', key: '', note: '後' },
        { col: 'changed_by', type: 'VARCHAR(60)', key: '', note: 'ログインした人' },
        { col: 'changed_at', type: 'TIMESTAMPTZ', key: '', note: 'いつ' }
      ]},
      { name: 'voice_items', jpName: 'お客様の声', description: '口コミ・質問・意見・苦情。受け口（楽天・Yahoo・本店・メール・LINE・SMS・電話）から。名前はニックネームだけ、メール・電話は伏せ字。', indexes: ['INDEX (source, received_on)', 'INDEX (topic_id)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: '声ID' },
        { col: 'source', type: 'VARCHAR(32)', key: 'IDX', note: '受け口' },
        { col: 'kind', type: 'VARCHAR(12)', key: '', note: 'review | question | opinion | complaint' },
        { col: 'received_on', type: 'DATE', key: 'IDX', note: '日付' },
        { col: 'product_code', type: 'VARCHAR(64)', key: 'IDX', note: '商品コード（任意）' },
        { col: 'rating', type: 'SMALLINT', key: '', note: '口コミの評価 1〜5' },
        { col: 'body', type: 'TEXT', key: '', note: '本文（伏せ字済み）' },
        { col: 'status', type: 'VARCHAR(8)', key: '', note: 'new | doing | done' },
        { col: 'topic_id', type: 'BIGINT', key: 'FK', note: 'voice_topics.id（質問のまとまり）' }
      ]},
      { name: 'voice_topics', jpName: '質問のまとまりとよくある質問', description: '似た質問のまとまり。件数が決めた数に届くと候補。入れる・入れない・保留と、その理由・決めた人を残す。', indexes: ['INDEX (decision)'], columns: [
        { col: 'id', type: 'BIGSERIAL', key: 'PK', note: 'まとまりID' },
        { col: 'title', type: 'VARCHAR(200)', key: '', note: '代表の質問' },
        { col: 'decision', type: 'VARCHAR(6)', key: 'IDX', note: "'' | in | out | hold" },
        { col: 'faq_q', type: 'TEXT', key: '', note: 'よくある質問の質問' },
        { col: 'faq_a', type: 'TEXT', key: '', note: '答え（空なら答え待ち）' },
        { col: 'count_at_decision', type: 'INTEGER', key: '', note: '決めたときの件数（入れないの後に増えたら再び候補）' },
        { col: 'decided_by', type: 'VARCHAR(60)', key: '', note: '決めた人' }
      ]}
    ];

