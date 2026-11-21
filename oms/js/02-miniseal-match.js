// Luna Luce OMS 部品JS: 02-miniseal-match（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    const SEAL_LABELS = [
      '01.ティアラ-P', '02.ティアラ-B', '03.ティアラ-V', '04.ティアラ-G', '05.チェック-B', '06.チェック-P', '07.ピンキー', '08.ハート', '09.ウサギ', '10.タグ',
      '11.ローズ', '12.もみじ', '13.カラフル', '14.pop', '15.幸せカップル', '16.秋ウェディング', '17.桜咲く', '18.和紋鶴', '19.うぐいす', '20.薔薇',
      '21.angel', '22.ありがとウサギ', '23.寿', '24.鶴', '25.ありがとパンダVt.（バレンタイン仕様　名前単独）', '26.バレンタインハート（バレンタイン仕様　名前単独）', '27.くまサンタ（クリスマス仕様）', '28.ホーリーナイト（クリスマス仕様）', '29.クリスマスギフト（クリスマス仕様）', '30.ほっこり雪だるま',
      '31.スノウクリスタル', '32.ラブツリー（クリスマス仕様）', '33.ドット（ピンク）', '34.ドット（ブルー）', '35.フラワー（ピンク）', '36.フラワー（ブルー）', '37.ベビー（ピンク）', '38.ベビー（ブルー）', '39.ブルースカイ', '40.ハロウィンA（ハロウィン仕様）',
      '41.オータム', '42.クローバー', '43.リボン', '44.エアメール', '45.キスマーク', '46.クラシッククラウン', '47.クラシックバタフライ', '48.チェリーブロッサム', '49.ホワイトローズ', '50.ストライプ（オレンジ）',
      '51.ストライプ（ブルー）', '52.バースデイ', '53.ハロウィンB（ハロウィン仕様）', '54.ドライウッド', '55.クマちゃん', '56.幼稚園・保育園', '57.小学校', '58.中学校', '59.高校'
    ];
    function miniSealFile(label) {
      const id = label.slice(0, 2);
      const ext = Number(id) >= 33 ? '.png' : '.jpg';
      return id + '-' + label.slice(3) + ext;
    }
    const SEAL_BY_ID = {};
    SEAL_LABELS.forEach(function (label) {
      const id = label.slice(0, 2);
      SEAL_BY_ID[id] = { id: id, label: label, cartValue: label, file: miniSealFile(label) };
    });
    const SEAL_GROUPS = [
      { name: 'ウェディング・定番', ids: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '15', '16', '20', '21'] },
      { name: '和風', ids: ['12', '17', '18', '19', '23', '24'] },
      { name: 'かわいい・お祝い', ids: ['13', '14', '22', '52', '55', '43', '45'] },
      { name: 'バレンタイン', ids: ['25', '26'] },
      { name: 'クリスマス・冬', ids: ['27', '28', '29', '30', '31', '32'] },
      { name: 'ハロウィン・秋・季節', ids: ['40', '53', '41', '39', '48'] },
      { name: 'ドット・フラワー・ベビー', ids: ['33', '34', '35', '36', '37', '38'] },
      { name: 'クラシック・おしゃれ', ids: ['42', '44', '46', '47', '49', '50', '51', '54'] },
      { name: '学校・園', ids: ['56', '57', '58', '59'] }
    ];
    /* 販路ごとの言い換え。正規化した文字 → 図柄番号。楽天・Yahoo!の実際の選択肢を確認してから足す。 */
    const SEAL_ALIASES = {};
    function normSeal(text) {
      return String(text == null ? '' : text).normalize('NFKC').toLowerCase().replace(/[\s　・･\-－ー―‐_]/g, '');
    }
    function sealCoreName(label) {
      return label.slice(3).replace(/（[^）]*仕様[^）]*）$/, '');
    }
    const SEAL_NAME_KEYS = SEAL_LABELS.map(function (label) {
      return { id: label.slice(0, 2), full: normSeal(label.slice(3)), core: normSeal(sealCoreName(label)) };
    });
    function matchSealText(text) {
      const raw = String(text == null ? '' : text).trim();
      const result = { text: raw, status: 'none', id: '', candidates: [] };
      if (!raw) return result;
      const norm = normSeal(raw);
      if (SEAL_ALIASES[norm] && SEAL_BY_ID[SEAL_ALIASES[norm]]) {
        result.status = 'alias';
        result.id = SEAL_ALIASES[norm];
        return result;
      }
      const numHit = raw.normalize('NFKC').match(/(?:^|[^0-9])([0-9]{1,2})\s*[.．、:：]/);
      const num = numHit ? ('0' + numHit[1]).slice(-2) : '';
      const named = SEAL_NAME_KEYS.filter(function (key) {
        return norm.indexOf(key.full) >= 0 || norm.indexOf(key.core) >= 0;
      });
      const longest = named.filter(function (key) {
        return !named.some(function (other) {
          return other !== key && other.core !== key.core && other.core.indexOf(key.core) >= 0 && norm.indexOf(other.core) >= 0;
        });
      });
      result.candidates = longest.map(function (key) { return key.id; });
      if (num && SEAL_BY_ID[num]) {
        if (longest.length === 1 && longest[0].id === num) {
          result.status = 'exact';
          result.id = num;
        } else if (longest.length === 0 && norm === normSeal(num + '.')) {
          result.status = 'number-only';
          result.candidates = [num];
        } else {
          result.status = 'mismatch';
          if (result.candidates.indexOf(num) < 0) result.candidates.unshift(num);
        }
        return result;
      }
      if (longest.length === 1) {
        result.status = 'name';
        result.id = longest[0].id;
      } else if (longest.length > 1) {
        result.status = 'ambiguous';
      } else {
        const value = normSeal(raw.normalize('NFKC').split(/[:=]/).pop());
        if (value.length >= 2) {
          result.candidates = SEAL_NAME_KEYS.filter(function (key) { return key.full.indexOf(value) >= 0; }).map(function (key) { return key.id; });
          if (result.candidates.length) result.status = 'partial';
        }
      }
      return result;
    }
    function applySealText(order) {
      if (!order || !order.line || !order.sealText) return;
      const line = order.line;
      if (line.templateId === 'paper-diy-blanc') return;
      const match = matchSealText(order.sealText);
      line.sealMatch = match;
      if (match.id && !line.designId) {
        line.designId = match.id;
        if (!line.templateId) {
          line.templateId = 'mini-seal-d30';
          line.templateVersion = '2026.11.20';
        }
      }
    }
    function sealSrc(file) {
      return 'miniseal/' + encodeURIComponent(file);
    }
    function currentSeal() {
      return state.sealPickId && SEAL_BY_ID[state.sealPickId] ? SEAL_BY_ID[state.sealPickId] : null;
    }
    function sealFrameInner(seal) {
      if (!seal) return '<p class="miss">未選択</p>';
      if (!seal.file) return '<p class="miss">' + escapeHtml(seal.label) + '</p><p class="miss">画像なし</p>';
      return '<img data-seal-img src="' + sealSrc(seal.file) + '" alt="' + escapeHtml(seal.label) + '">';
    }
