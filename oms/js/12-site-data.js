// Luna Luce OMS 部品JS: 12-site-data（元は luna_luce_oms_ui_v2.html の <script>。並び順どおりに読み込む）
    function cloneData(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function tokyoStamp(date) {
      const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      return shifted.toISOString().slice(0, 19) + '+09:00';
    }
    function tokyoLabel(iso) {
      const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(iso || ''));
      return match ? match[1] + ' ' + match[2] + '（日本時間）' : '未設定';
    }
    function siteMeta() {
      return {
        schemaVersion: 1,
        timeZone: 'Asia/Tokyo',
        draftRevision: 1,
        publishedRevision: 1,
        updatedBy: 'サンプル読込',
        updatedAt: '2026-11-20T09:00:00+09:00'
      };
    }
    function setByPath(root, path, value) {
      const parts = String(path || '').split('.');
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
        if (!node || node[key] == null) return;
        node = node[key];
      }
      const last = parts[parts.length - 1];
      node[/^\d+$/.test(last) ? Number(last) : last] = value;
    }
    function extraKeys(obj, allowed) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['形がオブジェクトではありません'];
      return Object.keys(obj).filter(function (key) { return allowed.indexOf(key) < 0; }).map(function (key) {
        return '未知のキー ' + key;
      });
    }
    function bannedKey(obj, path) {
      const banned = { sku: 1, price: 1, price_tax_in: 1, stock: 1, quantity: 1, customername: 1, couplenames: 1, orderid: 1, password: 1, secret: 1, token: 1, apikey: 1, clientsecret: 1, authorization: 1, amount: 1, ids: 1 };
      if (!obj || typeof obj !== 'object') return '';
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const here = (path ? path + '.' : '') + key;
        if (banned[String(key).toLowerCase()]) return here;
        const nested = bannedKey(obj[key], here);
        if (nested) return nested;
      }
      return '';
    }
    function validPublicHref(href) {
      const text = String(href == null ? '' : href);
      if (!text || text.trim() !== text || /\s/.test(text)) return false;
      if (/[\u0000-\u001f\\]/.test(text)) return false;
      if (/^(javascript|data|vbscript):/i.test(text)) return false;
      if (text.indexOf('..') >= 0) return false;
      if (/^https?:\/\//i.test(text)) {
        try {
          const url = new URL(text);
          if (url.username || url.password) return false;
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (err) {
          return false;
        }
      }
      if (text.indexOf('//') >= 0 || text.indexOf(':') >= 0) return false;
      return /^[A-Za-z0-9._~/-]+(\?[A-Za-z0-9._~=&%-]*)?(#[A-Za-z0-9._~-]*)?$/.test(text);
    }
    function periodError(startsAt, endsAt, label) {
      const start = startsAt || '';
      const end = endsAt || '';
      if (!start && !end) return '';
      if (!start || !end) return label + 'は開始と終了を両方入れるか、両方空にしてください';
      const shape = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;
      if (!shape.test(start) || !shape.test(end)) return label + 'は日本時間のISO（+09:00）にしてください';
      if (start >= end) return label + 'の終了は開始より後です。終了の時刻は含みません';
      return '';
    }
    function validSiteId(id) {
      return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(String(id || ''));
    }
    function duplicateIds(list) {
      const seen = {};
      for (let i = 0; i < list.length; i++) {
        const id = list[i].id;
        if (!id) continue;
        if (seen[id]) return id;
        seen[id] = true;
      }
      return '';
    }
    function metaErrors(data) {
      const errors = [];
      if (data.schemaVersion !== 1) errors.push('schemaVersion は 1 です');
      if (data.timeZone !== 'Asia/Tokyo') errors.push('timeZone は Asia/Tokyo です');
      if (!Number.isInteger(data.draftRevision) || data.draftRevision < 1) errors.push('draftRevision が不正です');
      if (!Number.isInteger(data.publishedRevision) || data.publishedRevision < 1) errors.push('publishedRevision が不正です');
      if (typeof data.updatedBy !== 'string' || !data.updatedBy.trim()) errors.push('更新者を入れてください');
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(data.updatedAt || '')) errors.push('更新日時は日本時間のISOです');
      return errors;
    }
    function orderLeak(text) {
      const blob = String(text || '');
      for (let i = 0; i < state.orders.length; i++) {
        const order = state.orders[i];
        const fields = [order.customerName, order.coupleNames, order.phone, order.address, order.id];
        for (let j = 0; j < fields.length; j++) {
          if (fields[j] && String(fields[j]).length > 2 && blob.indexOf(String(fields[j])) >= 0) return String(fields[j]);
        }
      }
      return '';
    }
    function copyMeta(from, to) {
      to.schemaVersion = from.schemaVersion;
      to.timeZone = from.timeZone;
      to.draftRevision = from.draftRevision;
      to.publishedRevision = from.publishedRevision;
      to.updatedBy = from.updatedBy;
      to.updatedAt = from.updatedAt;
    }
    function metaOf(editor) {
      return {
        schemaVersion: editor.schemaVersion,
        timeZone: editor.timeZone,
        draftRevision: editor.draftRevision,
        publishedRevision: editor.publishedRevision,
        updatedBy: editor.updatedBy,
        updatedAt: editor.updatedAt
      };
    }
    function readRows(list, allow, label, mapRow) {
      const errors = [];
      const rows = [];
      if (!Array.isArray(list)) return { errors: [label + 'が配列ではありません'], rows: [] };
      list.forEach(function (item, index) {
        const name = label + (index + 1);
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(name + 'の形が違います');
          return;
        }
        const unknown = extraKeys(item, allow);
        if (unknown.length) {
          errors.push(name + ' ' + unknown.join('、'));
          return;
        }
        rows.push(mapRow(item));
      });
      return { errors: errors, rows: rows };
    }
    function noticeOn(item, instant) {
      if (!item.active) return false;
      if (item.startsAt && instant < item.startsAt) return false;
      if (item.endsAt && instant >= item.endsAt) return false;
      return true;
    }
    function shiftIso(iso, deltaMs) {
      const time = new Date(iso).getTime();
      if (isNaN(time)) return '';
      return tokyoStamp(new Date(time + deltaMs));
    }
    function periodSamples(item) {
      if (!item.startsAt && !item.endsAt) return '期間の指定はありません';
      const startBefore = shiftIso(item.startsAt, -1000);
      const endBefore = shiftIso(item.endsAt, -1000);
      if (!startBefore || !endBefore) return '期間の形が違います';
      return [
        '開始直前は' + (noticeOn(item, startBefore) ? '出る' : '出ない'),
        '開始は' + (noticeOn(item, item.startsAt) ? '出る' : '出ない'),
        '終了直前は' + (noticeOn(item, endBefore) ? '出る' : '出ない'),
        '終了は' + (noticeOn(item, item.endsAt) ? '出る' : '出ない')
      ].join('、');
    }
    function noticePayload(editor) {
      const payload = metaOf(editor);
      payload.notices = editor.notices.map(function (item) {
        const row = { id: item.id, active: !!item.active, text: item.text, href: item.href };
        if (item.startsAt) row.startsAt = item.startsAt;
        if (item.endsAt) row.endsAt = item.endsAt;
        return row;
      });
      payload.news = editor.news.map(function (item) {
        return { id: item.id, title: item.title, body: item.body };
      });
      return payload;
    }
    function validateNotices(editor) {
      const errors = metaErrors(editor);
      const dupNotice = duplicateIds(editor.notices);
      const dupNews = duplicateIds(editor.news);
      if (dupNotice) errors.push('帯のIDが重複しています: ' + dupNotice);
      if (dupNews) errors.push('本文のIDが重複しています: ' + dupNews);
      editor.notices.forEach(function (item, index) {
        const label = '帯' + (index + 1);
        if (!validSiteId(item.id)) errors.push(label + 'のIDが不正です');
        if (typeof item.active !== 'boolean') errors.push(label + 'の表示が不正です');
        if (!String(item.text || '').trim()) errors.push(label + 'の一文を入れてください');
        if (!validPublicHref(item.href)) errors.push(label + 'のURLが不正です');
        const period = periodError(item.startsAt, item.endsAt, label);
        if (period) errors.push(period);
      });
      editor.news.forEach(function (item, index) {
        const label = '本文' + (index + 1);
        if (!validSiteId(item.id)) errors.push(label + 'のIDが不正です');
        if (!String(item.title || '').trim()) errors.push(label + 'の題名を入れてください');
        if (!String(item.body || '').trim()) errors.push(label + 'の本文を入れてください');
      });
      const payload = noticePayload(editor);
      const banned = bannedKey(payload, '');
      if (banned) errors.push('公開しないキーがあります: ' + banned);
      return { ok: errors.length === 0, errors: errors, payload: payload };
    }
    function acceptNotices(data) {
      const bucket = state.siteNotices;
      const banned = bannedKey(data, '');
      if (banned) return { ok: false, errors: ['公開しないキーがあります: ' + banned] };
      const oms = Object.prototype.hasOwnProperty.call(data, 'draftRevision');
      const allow = oms
        ? ['schemaVersion', 'timeZone', 'draftRevision', 'publishedRevision', 'updatedBy', 'updatedAt', 'notices', 'news']
        : ['schemaVersion', 'timeZone', 'notices'];
      const unknown = extraKeys(data, allow);
      if (unknown.length) return { ok: false, errors: unknown };
      if (oms && data.publishedRevision !== bucket.published.publishedRevision) {
        return { ok: false, errors: ['別の公開版です。競合のため読み込みを止め、公開済み版を残しました。'] };
      }
      const notices = readRows(data.notices, ['id', 'active', 'text', 'href', 'startsAt', 'endsAt'], '帯', function (item) {
        return { id: item.id, active: item.active, text: item.text, href: item.href, startsAt: item.startsAt || '', endsAt: item.endsAt || '' };
      });
      if (notices.errors.length) return { ok: false, errors: notices.errors };
      const editor = cloneData(bucket.editor);
      editor.notices = notices.rows;
      if (oms) {
        copyMeta(data, editor);
        const news = readRows(data.news || [], ['id', 'title', 'body'], '本文', function (item) {
          return { id: item.id, title: item.title, body: item.body };
        });
        if (news.errors.length) return { ok: false, errors: news.errors };
        editor.news = news.rows;
      }
      const check = validateNotices(editor);
      if (!check.ok) return check;
      return { ok: true, editor: editor };
    }
    function parseBase(base) {
      const weeks = String(base || '').split('&');
      if (weeks.length !== 5) return null;
      const grid = [];
      for (let i = 0; i < 5; i++) {
        const pair = weeks[i].split('=');
        if (pair.length !== 2 || pair[0] !== String(i + 1)) return null;
        const days = pair[1].split(',');
        if (days.length !== 7) return null;
        for (let d = 0; d < 7; d++) {
          if (days[d] !== '' && days[d] !== 'all' && days[d] !== 'am') return null;
        }
        grid.push(days);
      }
      return grid;
    }
    function serializeBase(grid) {
      return grid.map(function (days, index) { return (index + 1) + '=' + days.join(','); }).join('&');
    }
    function textToException(text) {
      const map = {};
      const errors = [];
      const seen = {};
      String(text || '').split(/\r?\n/).forEach(function (raw) {
        const line = raw.trim();
        if (!line) return;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(line);
        if (!match) { errors.push('例外日は YYYY-MM-DD です: ' + line); return; }
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const max = new Date(year, month, 0).getDate();
        if (month < 1 || month > 12 || day < 1 || day > max) { errors.push('実在しない日付です: ' + line); return; }
        if (seen[line]) { errors.push('例外日が重複しています: ' + line); return; }
        seen[line] = true;
        const key = year + '-' + month;
        if (!map[key]) map[key] = [];
        map[key].push(day);
      });
      return { map: map, errors: errors };
    }
    function readExceptionMap(map, label) {
      const errors = [];
      const lines = [];
      if (!map || typeof map !== 'object' || Array.isArray(map)) return { errors: [label + 'の形が違います'], text: '' };
      Object.keys(map).forEach(function (key) {
        const match = /^(\d{4})-(\d{1,2})$/.exec(key);
        if (!match) errors.push(label + 'の月が不正です: ' + key);
        if (!Array.isArray(map[key])) {
          errors.push(label + 'の日が不正です');
          return;
        }
        map[key].forEach(function (day) {
          if (!Number.isInteger(day)) errors.push(label + 'の日が不正です');
          else if (match) lines.push(match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + day).slice(-2));
        });
      });
      lines.sort();
      return { errors: errors, text: lines.join('\n') };
    }
    function calendarPayload(editor) {
      const include = textToException(editor.includeText);
      const exclude = textToException(editor.excludeText);
      const payload = metaOf(editor);
      payload.calendar = {
        source: editor.source,
        fetchedAt: editor.fetchedAt,
        base: serializeBase(editor.base),
        include: include.map,
        exclude: exclude.map
      };
      return { payload: payload, errors: include.errors.concat(exclude.errors) };
    }
    function validateCalendar(editor) {
      const built = calendarPayload(editor);
      const errors = metaErrors(editor).concat(built.errors);
      if (!editor.base || editor.base.length !== 5) errors.push('曜日設定が不正です');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(editor.fetchedAt || '')) errors.push('fetchedAt は日付です');
      if (!validPublicHref(editor.source)) errors.push('参照元URLが不正です');
      const both = {};
      String(editor.includeText || '').split(/\r?\n/).forEach(function (line) { const t = line.trim(); if (t) both[t] = true; });
      String(editor.excludeText || '').split(/\r?\n/).forEach(function (line) {
        const t = line.trim();
        if (t && both[t]) errors.push('同じ日が休業と営業の両方にあります: ' + t);
      });
      const banned = bannedKey(built.payload, '');
      if (banned) errors.push('公開しないキーがあります: ' + banned);
      return { ok: errors.length === 0, errors: errors, payload: built.payload };
    }
    function editorFromCalendar(bucket, calendar) {
      const unknown = extraKeys(calendar, ['source', 'fetchedAt', 'base', 'include', 'exclude']);
      if (unknown.length) return { ok: false, errors: unknown };
      const grid = parseBase(calendar.base);
      if (!grid) return { ok: false, errors: ['曜日設定 base が読めません'] };
      const inc = readExceptionMap(calendar.include || {}, '追加休業');
      const exc = readExceptionMap(calendar.exclude || {}, '例外営業');
      if (inc.errors.length || exc.errors.length) return { ok: false, errors: inc.errors.concat(exc.errors) };
      const editor = cloneData(bucket.editor);
      editor.source = calendar.source || '';
      editor.fetchedAt = calendar.fetchedAt || '';
      editor.base = grid;
      editor.includeText = inc.text;
      editor.excludeText = exc.text;
      const check = validateCalendar(editor);
      if (!check.ok) return check;
      return { ok: true, editor: editor };
    }
    function acceptCalendar(data) {
      const bucket = state.siteCalendar;
      const banned = bannedKey(data, '');
      if (banned) return { ok: false, errors: ['公開しないキーがあります: ' + banned] };
      if (Object.prototype.hasOwnProperty.call(data, 'draftRevision')) {
        const unknown = extraKeys(data, ['schemaVersion', 'timeZone', 'draftRevision', 'publishedRevision', 'updatedBy', 'updatedAt', 'calendar']);
        if (unknown.length) return { ok: false, errors: unknown };
        if (data.publishedRevision !== bucket.published.publishedRevision) {
          return { ok: false, errors: ['別の公開版です。競合のため読み込みを止め、公開済み版を残しました。'] };
        }
        const next = editorFromCalendar(bucket, data.calendar || {});
        if (!next.ok) return next;
        copyMeta(data, next.editor);
        const check = validateCalendar(next.editor);
        if (!check.ok) return check;
        return next;
      }
      const unknown = extraKeys(data, ['checkedAt', 'sendingEnabled', 'serviceEndpoint', 'shipping', 'calendar', 'brands']);
      if (unknown.length) return { ok: false, errors: unknown };
      if (!data.calendar) return { ok: false, errors: ['営業日の calendar がありません'] };
      return editorFromCalendar(bucket, data.calendar);
    }
    function monthTable(year, monthIndex, grid, include, exclude) {
      const count = new Date(year, monthIndex + 1, 0).getDate();
      const first = new Date(year, monthIndex, 1).getDay();
      const key = year + '-' + (monthIndex + 1);
      const inc = include[key] || [];
      const exc = exclude[key] || [];
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<td></td>';
      for (let day = 1; day <= count; day++) {
        const wd = new Date(year, monthIndex, day).getDay();
        let flag = (grid[Math.min(4, Math.floor((day - 1) / 7))] || [])[wd] || '';
        if (exc.indexOf(day) >= 0) flag = '';
        if (inc.indexOf(day) >= 0) flag = 'all';
        const cls = flag === 'all' ? 'off' : (flag ? 'partial' : '');
        const label = flag === 'all' ? '休業' : (flag ? '一部' : '営業');
        cells += '<td class="' + cls + '">' + day + '<br>' + label + '</td>';
        if (wd === 6 && day !== count) cells += '</tr><tr>';
      }
      return '<div class="month"><p>' + year + '年' + (monthIndex + 1) + '月</p><table><thead><tr><th>日</th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th>土</th></tr></thead><tbody><tr>' + cells + '</tr></tbody></table></div>';
    }
    function promoPayload(editor) {
      const payload = metaOf(editor);
      payload.order = editor.promos.map(function (item) { return item.id; });
      payload.promos = editor.promos.map(function (item) {
        const row = { id: item.id, active: !!item.active, title: item.title, text: item.text, href: item.href };
        if (item.startsAt) row.startsAt = item.startsAt;
        if (item.endsAt) row.endsAt = item.endsAt;
        return row;
      });
      return payload;
    }
    function validatePromos(editor) {
      const errors = metaErrors(editor);
      const dup = duplicateIds(editor.promos);
      if (dup) errors.push('特集IDが重複しています: ' + dup);
      editor.promos.forEach(function (item, index) {
        const label = '特集' + (index + 1);
        if (!validSiteId(item.id)) errors.push(label + 'のIDが不正です');
        if (typeof item.active !== 'boolean') errors.push(label + 'の表示が不正です');
        if (!String(item.title || '').trim()) errors.push(label + 'の題名を入れてください');
        if (!String(item.text || '').trim()) errors.push(label + 'の一文を入れてください');
        if (!validPublicHref(item.href)) errors.push(label + 'のURLが不正です');
        const period = periodError(item.startsAt, item.endsAt, label);
        if (period) errors.push(period);
      });
      const payload = promoPayload(editor);
      const banned = bannedKey(payload, '');
      if (banned) errors.push('公開しないキーがあります: ' + banned);
      return { ok: errors.length === 0, errors: errors, payload: payload };
    }
    function acceptPromos(data) {
      const bucket = state.sitePromos;
      const banned = bannedKey(data, '');
      if (banned) return { ok: false, errors: ['公開しないキーがあります: ' + banned] };
      const unknown = extraKeys(data, ['schemaVersion', 'timeZone', 'draftRevision', 'publishedRevision', 'updatedBy', 'updatedAt', 'order', 'promos']);
      if (unknown.length) return { ok: false, errors: unknown };
      if (data.publishedRevision !== bucket.published.publishedRevision) {
        return { ok: false, errors: ['別の公開版です。競合のため読み込みを止め、公開済み版を残しました。'] };
      }
      const promos = readRows(data.promos, ['id', 'active', 'title', 'text', 'href', 'startsAt', 'endsAt'], '特集', function (item) {
        return { id: item.id, active: item.active, title: item.title, text: item.text, href: item.href, startsAt: item.startsAt || '', endsAt: item.endsAt || '' };
      });
      if (promos.errors.length) return { ok: false, errors: promos.errors };
      if (!Array.isArray(data.order) || data.order.length !== promos.rows.length) return { ok: false, errors: ['掲載順が特集と一致しません'] };
      const byId = {};
      promos.rows.forEach(function (item) { byId[item.id] = item; });
      const ordered = [];
      for (let i = 0; i < data.order.length; i++) {
        const item = byId[data.order[i]];
        if (!item || ordered.indexOf(item) >= 0) return { ok: false, errors: ['掲載順が特集と一致しません'] };
        ordered.push(item);
      }
      const editor = cloneData(bucket.editor);
      copyMeta(data, editor);
      editor.promos = ordered;
      const check = validatePromos(editor);
      if (!check.ok) return check;
      return { ok: true, editor: editor };
    }
    function siteBucket(name) {
      if (name === 'notices') return state.siteNotices;
      if (name === 'calendar') return state.siteCalendar;
      if (name === 'promos') return state.sitePromos;
      return null;
    }
    function siteEvent(name) { return 'oms:site-' + name; }
    function siteValidate(name, editor) {
      if (name === 'notices') return validateNotices(editor);
      if (name === 'calendar') return validateCalendar(editor);
      if (name === 'promos') return validatePromos(editor);
      return { ok: false, errors: ['不明な部品です'], payload: {} };
    }
    function siteAccept(name, data) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['JSONの形が違います'] };
      if (name === 'notices') return acceptNotices(data);
      if (name === 'calendar') return acceptCalendar(data);
      if (name === 'promos') return acceptPromos(data);
      return { ok: false, errors: ['不明な部品です'] };
    }
    function downloadJson(filename, payload) {
      const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
    function exportSiteDraft(name) {
      const bucket = siteBucket(name);
      if (!bucket) return;
      const built = siteValidate(name, bucket.editor);
      if (!built.ok) {
        bucket.message = built.errors.join(' ');
        bucket.bad = true;
        emit(siteEvent(name));
        showToast('検証で止めたので、書き出していません');
        return;
      }
      bucket.editor.draftRevision += 1;
      bucket.editor.updatedAt = tokyoStamp(new Date());
      const again = siteValidate(name, bucket.editor);
      const leak = orderLeak(JSON.stringify(again.payload));
      if (!again.ok || leak) {
        bucket.editor.draftRevision -= 1;
        bucket.message = leak ? '受注の内容が混ざるので止めました' : again.errors.join(' ');
        bucket.bad = true;
        emit(siteEvent(name));
        showToast('書き出しを止めました。公開済み版はそのままです');
        return;
      }
      const file = (name === 'notices' ? 'site-notices' : name === 'calendar' ? 'site-calendar' : 'site-promos') + '-draft-r' + bucket.editor.draftRevision + '.json';
      try {
        downloadJson(file, again.payload);
      } catch (err) {
        bucket.editor.draftRevision -= 1;
        bucket.message = '書き出しに失敗しました。公開済み版はそのままです。';
        bucket.bad = true;
        emit(siteEvent(name));
        return;
      }
      bucket.message = '新しい下書きを書き出しました。元のファイルは上書きしていません。公開済み版は残しています。';
      bucket.bad = false;
      emit(siteEvent(name) + '-form');
      showToast('下書きを書き出しました');
    }
    function loadSiteFile(el) {
      const name = el.dataset.site;
      const bucket = siteBucket(name);
      const file = el.files && el.files[0];
      el.value = '';
      if (!bucket || !file) return;
      const reader = new FileReader();
      reader.onload = function () {
        let data;
        try { data = JSON.parse(String(reader.result || '')); }
        catch (err) {
          bucket.message = 'JSONとして読めません。公開済み版はそのままです。';
          bucket.bad = true;
          emit(siteEvent(name));
          return;
        }
        const result = siteAccept(name, data);
        if (!result.ok) {
          bucket.message = result.errors.join(' ');
          bucket.bad = true;
          emit(siteEvent(name));
          showToast('読み込みを止めました');
          return;
        }
        bucket.editor = result.editor;
        bucket.message = '下書きへ読み込みました。元のファイルは上書きしていません。';
        bucket.bad = false;
        emit(siteEvent(name) + '-form');
        showToast('下書きへ読み込みました');
      };
      reader.readAsText(file, 'utf-8');
    }
    function onSiteField(el) {
      const bucket = siteBucket(el.dataset.site);
      if (!bucket) return;
      setByPath(bucket.editor, el.dataset.path, el.type === 'checkbox' ? el.checked : el.value);
      bucket.message = '';
      bucket.bad = false;
      emit(siteEvent(el.dataset.site));
    }
    function moveSitePromo(el) {
      const bucket = state.sitePromos;
      const index = Number(el.dataset.index);
      const next = index + (el.dataset.dir === 'up' ? -1 : 1);
      const list = bucket.editor.promos;
      if (next < 0 || next >= list.length) return;
      const item = list[index];
      list[index] = list[next];
      list[next] = item;
      bucket.message = '';
      bucket.bad = false;
      emit('oms:site-promos-form');
    }
    function addSiteRow(el) {
      const bucket = siteBucket(el.dataset.site);
      if (!bucket) return;
      const list = bucket.editor[el.dataset.list];
      if (!list || list.length >= 20) return;
      if (el.dataset.list === 'notices') list.push({ id: '', active: true, text: '', href: '', startsAt: '', endsAt: '' });
      if (el.dataset.list === 'news') list.push({ id: '', title: '', body: '' });
      bucket.message = '';
      bucket.bad = false;
      emit(siteEvent(el.dataset.site) + '-form');
    }
    function removeSiteRow(el) {
      const bucket = siteBucket(el.dataset.site);
      if (!bucket) return;
      const list = bucket.editor[el.dataset.list];
      const index = Number(el.dataset.index);
      if (!list || index < 0 || index >= list.length) return;
      list.splice(index, 1);
      bucket.message = '';
      bucket.bad = false;
      emit(siteEvent(el.dataset.site) + '-form');
    }
    function siteStatus(bucket, built) {
      return {
        text: !built.ok ? built.errors.join(' ') : (bucket.message || '検証できました。書き出しは下書きです。'),
        bad: !built.ok || !!bucket.bad
      };
    }
    function seedSiteContent() {
      const base = '1=all,,,,,,all&2=all,,,,,,all&3=all,,,,,,am&4=am,,,,,,all&5=all,,,,,,all';
      const notices = Object.assign(siteMeta(), {
        notices: [
          { id: 'name-preview', active: true, text: '名入れの見え方は、お試しページでご確認いただけます。', href: 'name-preview.html', startsAt: '', endsAt: '' },
          { id: 'consultation', active: true, text: 'ご使用日や数量のご相談は、お問い合わせからお気軽にどうぞ。', href: 'contact.html', startsAt: '', endsAt: '' }
        ],
        news: [
          { id: 'entry-88', title: '【お知らせ】夏季長期休業のお知らせ', body: '期間内でのご注文は通常通り可能ですが、お問い合わせ・受注・出荷業務は休業明けより順次での対応とさせていただきます。この本文の日付は、営業日の休業には入れません。' }
        ]
      });
      const calendar = Object.assign(siteMeta(), {
        source: 'https://www.luna-luce.jp/',
        fetchedAt: '2026-11-20',
        base: parseBase(base),
        includeText: '2026-12-29\n2026-12-30\n2026-12-31\n2027-01-01\n2027-01-02\n2027-01-03\n2027-01-04\n2027-01-05',
        excludeText: ''
      });
      const promos = Object.assign(siteMeta(), {
        promos: [
          { id: 'recommended-features', active: true, title: 'おすすめ特集', text: '気になる特集から、贈り物を選びましょう。', href: 'feature-list.html', startsAt: '', endsAt: '' },
          { id: 'christmas', active: true, title: '季節のプチギフト｜クリスマス', text: '冬のありがとうを、小さな贈り物に。', href: 'category.html?g=season&m=xmas&s=petit', startsAt: '2026-11-01T00:00:00+09:00', endsAt: '2026-12-26T00:00:00+09:00' },
          { id: 'named-gifts', active: true, title: '名前を添える、小さな贈り物', text: '発表会にも、結婚式にも。ありがとうが伝わる4品。', href: 'category.html?g=all&n=1', startsAt: '', endsAt: '' },
          { id: 'flavor', active: true, title: 'ふんわり、FLAVORの贈り物', text: 'お祝いにも手土産にも。選ぶ時間まで楽しく。', href: 'category.html?g=food&m=chiffon', startsAt: '', endsAt: '' },
          { id: 'parents', active: true, title: 'ご両親へ、ありがとうを形に', text: '生まれた日の重さと、大切な思い出を贈る。', href: 'category.html?g=parents&m=doll', startsAt: '', endsAt: '' }
        ]
      });
      state.siteNotices = { editor: notices, published: noticePayload(notices), message: '', bad: false };
      state.siteCalendar = { editor: calendar, published: calendarPayload(calendar).payload, message: '', bad: false };
      state.sitePromos = { editor: promos, published: promoPayload(promos), message: '', bad: false };
    }
