// Luna Luce OMS 部品JS: 42-header-user（上の帯に、ログインしている人の名前・アカウント・ログアウトを出す）
// ログインの仕組み（VPS の oms-app の oms-auth）があるときだけ出す。手元で開いたとき（/auth/api/me が無い）は何も出さない。
    function renderHeaderUser(host) {
      if (!host || location.protocol === 'file:') return;
      fetch('/auth/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (res) {
        return res.ok ? res.json() : null;
      }).then(function (r) {
        if (!r || !r.ok || !r.me) return;
        state.me = r.me;
        // 作業員なら住所などを隠して描き直す（js/52-work-log）。見えないタブを開いていたら統合受注に戻す
        if (piiHidden()) {
          if (WORKER_TABS.indexOf(state.activeTab) < 0) switchTab('dashboard');
          // ログインの確認より先に描いたほかのタブ（送り状CSVなど住所が入るもの）は中身ごと消す
          document.querySelectorAll('[data-tab-panel]').forEach(function (panel) { if (WORKER_TABS.indexOf(panel.dataset.tabPanel) < 0) panel.innerHTML = ''; });
        }
        emit('oms:me'); emit('oms:list');
        host.innerHTML = '<span class="who-name" title="' + escapeHtml(r.me.name + '・' + r.me.roleLabel) + '">' + escapeHtml(r.me.display) + '</span>' +
          '<a class="who-link" href="/account">' + (r.me.role === 'admin' ? 'アカウント管理' : 'アカウント') + '</a>' +
          '<button type="button" class="who-out" data-who="logout">ログアウト</button>';
        host.querySelector('[data-who="logout"]').addEventListener('click', function () {
          fetch('/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' })
            .finally(function () { location.href = '/login'; });
        });
      }).catch(function () { /* ログインの仕組みが無い所では出さない */ });
    }
