// Luna Luce OMS 部品JS: 03-core（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    const DESIGN_TEMPLATES = [
      {
        templateId: 'mini-seal-d30',
        templateVersion: '2026.11.20',
        productIds: [],
        skus: ['LL-PG-082-EARL'],
        kind: 'miniSeal',
        printAreaMm: null,
        paper: 'ミニシール',
        sides: 1,
        fonts: FONT_OPTIONS,
        maxChars: 24,
        required: ['couple', 'date'],
        sourceFile: '',
        sampleNote: '公開見本。製造原稿ではない'
      },
      {
        templateId: 'paper-diy-blanc',
        templateVersion: '2026.11.20',
        productIds: [],
        skus: ['LL-PPR-031-WHT'],
        kind: 'diy',
        printAreaMm: null,
        paper: '席次表・メニュー表（手作り・テンプレート編集印刷）',
        sides: 1,
        fonts: ['クラシック明朝（トープ）'],
        maxChars: 40,
        required: ['couple'],
        sourceFile: '',
        sampleNote: '汎用の入力配置見本。購入用テンプレートは再配布しない'
      }
    ];
    const STATUS_OPTIONS = ['新規受付', '名入れ確認中', '校正・データ作成', '製造・レーザー加工', '梱包・出荷済'];
    const HEADER_TABS = [
      { id: 'dashboard', label: '1 統合受注' },
      { id: 'architecture', label: '2 システム' },
      { id: 'schema', label: '3 DBスキーマ' },
      { id: 'simulator', label: '4 加工・CSV' },
      { id: 'carrier', label: '5 契約送料' },
      { id: 'builder', label: '6 サイトビルダー' }
    ];
    const CHANNELS = [
      { id: 'ALL', label: 'すべて' },
      { id: 'WELCART', label: '自社Welcart' },
      { id: 'RAKUTEN', label: '楽天市場' },
      { id: 'YAHOO', label: 'Yahoo!ショッピング' },
      { id: 'MANUAL', label: '電話・FAX注文' }
    ];

    const state = {
      orders: [],
      partStock: { sweets: 500, box: 340, thanksCard: 360, miniSeal: 200 },
      lastStockMove: '',
      activeChannel: 'ALL',
      activeStatus: 'ALL',
      onlyUrgent: false,
      onlyWarning: false,
      query: '',
      currentId: null,
      draft: null,
      activeTab: 'dashboard',
      schemaIndex: 0,
      carrierMode: 'size',
      carrierZone: '',
      carrierSize: '',
      lastSync: TODAY + ' 10:15:00',
      orderSort: 'due',
      sealPickId: ''
    };

    function emit(name, detail) {
      document.dispatchEvent(new CustomEvent(name, { detail: detail }));
    }
    function on(name, fn) {
      document.addEventListener(name, function (event) { fn(event.detail); });
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function formatYen(amount) {
      return '¥' + Number(amount || 0).toLocaleString('ja-JP');
    }
    function daysUntil(iso) {
      const today = new Date(TODAY + 'T00:00:00');
      const date = new Date(iso + 'T00:00:00');
      return Math.ceil((date - today) / 86400000);
    }
    function orderClock(order) {
      const time = String((order.orderDate || '').split(' ')[1] || '00:00').slice(0, 5);
      return { time: time, within: time <= SAME_DAY_CUTOFF };
    }
    function currentOrder() {
      return state.orders.find(function (order) { return order.id === state.currentId; }) || null;
    }
    function dotted(iso) {
      return String(iso || '').replace(/-/g, '.');
    }

    const YAMATO_SIZES = [60, 80, 100, 120, 140, 160, 180, 200];
    const YAMATO_CONTRACT = [
      { zone: '北海道', rates: [790, 930, 1080, 1370, 1690, 1870, 3170, 3940] },
      { zone: '北東北', rates: [590, 730, 880, 1140, 1440, 1630, 2400, 3050] },
      { zone: '南東北', rates: [520, 670, 810, 1070, 1370, 1550, 2200, 2650] },
      { zone: '関東', rates: [460, 610, 750, 1000, 1290, 1480, 1810, 2190] },
      { zone: '信越', rates: [460, 610, 750, 1000, 1290, 1480, 1810, 2190] },
      { zone: '北陸', rates: [460, 610, 750, 1000, 1290, 1480, 1810, 2190] },
      { zone: '中部', rates: [460, 610, 750, 1000, 1290, 1480, 1810, 2190] },
      { zone: '関西', rates: [460, 610, 750, 1000, 1290, 1480, 1810, 2190] },
      { zone: '中国', rates: [520, 670, 810, 1070, 1370, 1550, 2200, 2650] },
      { zone: '四国', rates: [520, 670, 810, 1070, 1370, 1550, 2200, 2650] },
      { zone: '九州', rates: [590, 730, 880, 1140, 1440, 1630, 2400, 3050] },
      { zone: '沖縄', rates: [720, 1020, 1330, 1650, 1980, 2300, 3530, 4340] }
    ];
    const NEKOPOS_CONTRACT = 280;
    function yamatoContractCost(zone, size) {
      const row = YAMATO_CONTRACT.find(function (item) { return item.zone === zone; });
      const index = YAMATO_SIZES.indexOf(Number(size));
      if (!row || index < 0) return null;
      return row.rates[index];
    }

    function feeNumbers(order) {
      const applies = !!order.extraCharApplies;
      const count = applies ? Number(order.extraCharCount) || 0 : 0;
      const extraTotal = applies ? 500 + 20 * count : 0;
      return {
        extraBase: applies ? 500 : 0,
        extraCount: count,
        extraPer: 20,
        extraTotal: extraTotal,
        noshi: Number(order.noshiFee) || 0,
        wrapping: Number(order.wrappingFee) || 0
      };
    }
    function partCounts(order) {
      const per = order.partPer || {};
      const qty = Number(order.qty) || 0;
      const counts = {};
      PART_KEYS.forEach(function (part) {
        counts[part.key] = (Number(per[part.key]) || 0) * qty;
      });
      return counts;
    }
    function applyStaffDefaults(order) {
      if (!order.partPer) order.partPer = { sweets: 1, box: 1, thanksCard: 1, miniSeal: 1 };
      if (order.extraCharApplies == null) order.extraCharApplies = false;
      if (order.extraCharCount == null) order.extraCharCount = 0;
      if (order.noshiFee == null) order.noshiFee = 0;
      if (order.wrappingFee == null) order.wrappingFee = 0;
      if (order.campaignMark === undefined) order.campaignMark = null;
      if (order.bestBefore === undefined) order.bestBefore = null;
      if (!order.proofStatus) order.proofStatus = '未送付';
      if (order.rushTicket == null) order.rushTicket = false;
      if (order.stockCommitted == null) order.stockCommitted = false;
      if (!order.line) {
        order.line = {
          lineId: order.id + '-L1',
          relatedId: order.id,
          designId: '',
          sourceText: order.coupleNames || '',
          templateId: '',
          templateVersion: '',
          proofStatus: order.proofStatus || '未送付'
        };
      } else if (!order.line.proofStatus) {
        order.line.proofStatus = order.proofStatus || '未送付';
      }
      return order;
    }
    function readDraft(order) {
      return {
        couple: order.coupleNames,
        wedding: order.weddingDate,
        delivery: order.deliveryDate || '',
        message: order.headerMsg,
        font: order.fontStyle,
        noshi: order.noshiSeal,
        status: order.status,
        clearWarning: !order.warning
      };
    }
    function draftCouple() {
      return state.draft ? state.draft.couple : (currentOrder() ? currentOrder().coupleNames : '');
    }
    function draftWedding() {
      return state.draft ? state.draft.wedding : (currentOrder() ? currentOrder().weddingDate : '');
    }

