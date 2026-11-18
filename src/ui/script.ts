// src/ui/script.ts
export const UI_SCRIPT = `
    var favs = [];
    var operationLogs = [];
    var tgConfigState = { enabled: false, hasToken: false, maskedToken: '', chatId: '' };
    var isFavLocked = false;
    var isLogsUnconfigured = false;
    var isLogsCollapsed = false;
    var isTgCollapsed = false;
    var parsedArgoNodesCache = [];

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getStoredPwd() {
      return localStorage.getItem('sub_fav_pwd') || '';
    }

    function showToast(msg, isSuccess) {
      if (isSuccess === undefined) isSuccess = true;
      var t = document.getElementById('toast');
      var m = document.getElementById('toastMsg');
      m.textContent = msg;
      t.className = 'toast show ' + (isSuccess ? 'success' : 'error');
      setTimeout(function() {
        t.className = 'toast';
      }, 3000);
    }

    function parseErrorResponse(resp, fallbackMsg) {
      return resp.text().then(function(txt) {
        var detail = txt;
        try {
          var parsed = JSON.parse(txt);
          if (parsed && parsed.error) detail = parsed.error;
        } catch {}
        return detail || fallbackMsg || ('HTTP ' + resp.status);
      }).catch(function() {
        return fallbackMsg || ('HTTP ' + resp.status);
      });
    }

    function generateRandomToken(targetId) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var bytes = new Uint8Array(24);
      window.crypto.getRandomValues(bytes);
      var token = '';
      for (var i = 0; i < bytes.length; i++) {
        token += chars.charAt(bytes[i] % chars.length);
      }
      var el = document.getElementById(targetId);
      if (el) {
        el.value = token;
        showToast('已生成 24 位高強度隨機 Token');
      }
    }

    function copyResult(id) {
      var input = document.getElementById(id);
      if (!input || !input.value) return;
      input.select();
      navigator.clipboard.writeText(input.value).then(function() {
        showToast('已複製訂閱連結至剪貼簿！');
      }).catch(function() {
        document.execCommand('copy');
        showToast('已複製訂閱連結至剪貼簿！');
      });
    }

    function copyText(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var text = el.value || el.textContent;
      navigator.clipboard.writeText(text).then(function() {
        showToast('複製成功！');
      }).catch(function() {
        showToast('複製失敗，請手動複製', false);
      });
    }

    function openModal() {
      document.getElementById('modalTitle').textContent = '新增配置';
      document.getElementById('favName').value = '';
      document.getElementById('favUrl').value = '';
      document.getElementById('favInclude').value = '';
      document.getElementById('favExclude').value = '';
      document.getElementById('favRename').value = '';
      document.getElementById('favToken').value = '';
      document.getElementById('modal').dataset.edit = '';
      document.getElementById('modal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('show');
    }

    function loadFavs(isInitialLogin) {
      var pwd = getStoredPwd();
      var reqHeaders = { 'X-Password': pwd };
      if (isInitialLogin && pwd) {
        reqHeaders['X-Login-Attempt'] = '1';
      }

      fetch('/favs?t=' + Date.now(), {
        headers: reqHeaders
      }).then(function(resp) {
        if (resp.status === 401) {
          isFavLocked = true;
          renderLockScreen();
          hideLogsPanel();
          hideTgPanel();
          return;
        }
        if (resp.ok) {
          resp.json().then(function(data) {
            favs = data;
            isFavLocked = false;
            renderFavs();
            loadLogs();
            loadTgConfig();
          });
        } else {
          renderErrorScreen('載入配置失敗 (HTTP ' + resp.status + ')');
        }
      }).catch(function() {
        renderErrorScreen('網路連線失敗');
      });
    }

    function hideLogsPanel() {
      operationLogs = [];
      var panel = document.getElementById('logsPanel');
      if (panel) panel.style.display = 'none';
      closeLogsModal();
    }

    function hideTgPanel() {
      tgConfigState = { enabled: false, hasToken: false, maskedToken: '', chatId: '' };
      var panel = document.getElementById('tgPanel');
      if (panel) panel.style.display = 'none';
      closeTgModal();
      closeTgHelpModal();
    }

    function loadTgConfig() {
      var pwd = getStoredPwd();
      var panel = document.getElementById('tgPanel');

      fetch('/tg-config?t=' + Date.now(), {
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.status === 403 || resp.status === 401) {
          hideTgPanel();
          return;
        }
        if (resp.ok) {
          resp.json().then(function(data) {
            tgConfigState = data || { enabled: false, hasToken: false, maskedToken: '', chatId: '' };
            panel.style.display = 'block';
            renderTgPanel();
          });
        }
      }).catch(function() {
        hideTgPanel();
      });
    }

    function renderTgPanel() {
      var cb = document.getElementById('tgEnabledCheckbox');
      var badge = document.getElementById('tgStatusBadge');
      if (cb) cb.checked = Boolean(tgConfigState.enabled);

      if (badge) {
        if (tgConfigState.hasToken && tgConfigState.chatId) {
          badge.style.display = 'inline-block';
          badge.textContent = tgConfigState.enabled ? '已配置 · 運行中' : '已配置 · 已暫停';
          if (tgConfigState.enabled) {
            badge.style.background = 'rgba(16, 185, 129, 0.1)';
            badge.style.color = 'var(--success)';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
          } else {
            badge.style.background = 'rgba(59, 130, 246, 0.1)';
            badge.style.color = 'var(--primary)';
            badge.style.borderColor = 'rgba(59, 130, 246, 0.2)';
          }
        } else {
          badge.style.display = 'inline-block';
          badge.textContent = '未配置';
          badge.style.background = 'rgba(148, 163, 184, 0.1)';
          badge.style.color = 'var(--text-muted)';
          badge.style.borderColor = 'rgba(148, 163, 184, 0.2)';
        }
      }
    }

    function toggleTgCollapse() {
      isTgCollapsed = !isTgCollapsed;
      var header = document.getElementById('tgPanelHeader');
      var body = document.getElementById('tgBody');
      var icon = document.getElementById('toggleTgIcon');
      var text = document.getElementById('toggleTgText');
      if (isTgCollapsed) {
        body.style.display = 'none';
        header.style.marginBottom = '0';
        icon.style.transform = 'rotate(-90deg)';
        if (text) text.textContent = '展開';
      } else {
        body.style.display = 'block';
        header.style.marginBottom = '1.25rem';
        icon.style.transform = 'rotate(0deg)';
        if (text) text.textContent = '收合';
      }
    }

    function toggleTgEnabled(checkbox) {
      var targetEnabled = checkbox.checked;
      if (targetEnabled && (!tgConfigState.hasToken || !tgConfigState.chatId)) {
        checkbox.checked = false;
        showToast('請先完成參數配置（Bot Token 與 Chat ID）', false);
        openTgModal();
        return;
      }

      var pwd = getStoredPwd();
      fetch('/tg-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Password': pwd
        },
        body: JSON.stringify({ enabled: targetEnabled })
      }).then(function(resp) {
        if (!resp.ok) {
          return parseErrorResponse(resp, '更新失敗').then(function(msg) {
            throw new Error(msg);
          });
        }
        return resp.json();
      }).then(function(data) {
        tgConfigState = data;
        renderTgPanel();
        showToast(tgConfigState.enabled ? '已啟用 Telegram 通知' : '已暫停 Telegram 通知');
      }).catch(function(e) {
        checkbox.checked = !targetEnabled;
        showToast(e.message, false);
      });
    }

    function openTgModal() {
      var tokenInput = document.getElementById('tgBotTokenInput');
      var chatIdInput = document.getElementById('tgChatIdInput');
      var hint = document.getElementById('tgTokenHint');

      tokenInput.value = '';
      if (tgConfigState.hasToken) {
        tokenInput.placeholder = '已設定 (' + tgConfigState.maskedToken + ')，留空保留原 Token';
        hint.textContent = '目前已有儲存的 Bot Token (' + tgConfigState.maskedToken + ')，留空代表維持原密鑰不變。';
      } else {
        tokenInput.placeholder = '例如: 123456789:AAHxxxxxxxxxxxxxxxxxxxx';
        hint.textContent = '請從 @BotFather 取得 Bot Token。';
      }
      chatIdInput.value = tgConfigState.chatId || '';
      document.getElementById('tgModal').classList.add('show');
    }

    function closeTgModal() {
      document.getElementById('tgModal').classList.remove('show');
    }

    function openTgHelpModal() {
      document.getElementById('tgHelpModal').classList.add('show');
    }

    function closeTgHelpModal() {
      document.getElementById('tgHelpModal').classList.remove('show');
    }

    function saveTgConfig() {
      var tokenVal = document.getElementById('tgBotTokenInput').value.trim();
      var chatIdVal = document.getElementById('tgChatIdInput').value.trim();

      if (!tgConfigState.hasToken && !tokenVal) {
        return showToast('請輸入 Bot Token', false);
      }
      if (!chatIdVal) {
        return showToast('請輸入 Chat ID', false);
      }

      var pwd = getStoredPwd();
      var shouldEnable = tgConfigState.hasToken ? tgConfigState.enabled : true;

      fetch('/tg-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Password': pwd
        },
        body: JSON.stringify({
          enabled: shouldEnable,
          botToken: tokenVal,
          chatId: chatIdVal
        })
      }).then(function(resp) {
        if (!resp.ok) {
          return parseErrorResponse(resp, '儲存失敗').then(function(msg) {
            throw new Error(msg);
          });
        }
        return resp.json();
      }).then(function(data) {
        tgConfigState = data;
        renderTgPanel();
        closeTgModal();
        showToast('Telegram 通知參數已儲存！');
      }).catch(function(e) {
        showToast('儲存失敗: ' + e.message, false);
      });
    }

    function testTgConfig() {
      var tokenVal = document.getElementById('tgBotTokenInput').value.trim();
      var chatIdVal = document.getElementById('tgChatIdInput').value.trim();

      if (!tgConfigState.hasToken && !tokenVal) {
        return showToast('請先輸入 Bot Token', false);
      }
      if (!chatIdVal && !tgConfigState.chatId) {
        return showToast('請先輸入 Chat ID', false);
      }

      var btn = document.getElementById('tgTestBtn');
      var oldHtml = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '發送中...';

      var pwd = getStoredPwd();
      fetch('/tg-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Password': pwd
        },
        body: JSON.stringify({
          botToken: tokenVal,
          chatId: chatIdVal
        })
      }).then(function(resp) {
        return resp.json().then(function(data) {
          if (!resp.ok || !data.ok) {
            throw new Error(data.error || '發送失敗');
          }
          showToast('測試訊息已發送，請檢查 Telegram！');
        });
      }).catch(function(e) {
        showToast('測試失敗: ' + e.message, false);
      }).finally(function() {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      });
    }

    function clearTgConfig() {
      if (!confirm('確定要清除 Telegram 通知配置嗎？')) return;
      var pwd = getStoredPwd();
      fetch('/tg-config', {
        method: 'DELETE',
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.ok) {
          return resp.json().then(function(data) {
            tgConfigState = data;
            renderTgPanel();
            showToast('已清除 Telegram 通知配置');
          });
        } else {
          return parseErrorResponse(resp, '清除失敗').then(function(msg) {
            showToast('清除失敗：' + msg, false);
          });
        }
      }).catch(function(e) {
        showToast('清除失敗: ' + e.message, false);
      });
    }

    function loadLogs(showSuccessToast) {
      var pwd = getStoredPwd();
      var panel = document.getElementById('logsPanel');
      var container = document.getElementById('logsTableContainer');
      var footer = document.getElementById('logsFooter');

      fetch('/logs?t=' + Date.now(), {
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.status === 403) {
          isLogsUnconfigured = true;
          panel.style.display = 'block';
          footer.style.display = 'none';
          container.innerHTML = '<div class="empty-state" style="padding: 1.5rem;">🔒 未設定管理密碼 (PAGE_PASSWORD)，基於隱私保護，操作日誌與消息通知功能預設禁用。<br>請至 Cloudflare Workers 設定 PAGE_PASSWORD 環境變數即可自動啟用。</div>';
          return;
        }
        if (resp.status === 401) {
          hideLogsPanel();
          return;
        }
        if (resp.ok) {
          isLogsUnconfigured = false;
          resp.json().then(function(data) {
            operationLogs = Array.isArray(data) ? data : [];
            panel.style.display = 'block';
            footer.style.display = 'flex';
            renderCompactLogs();
            if (document.getElementById('logsModal').classList.contains('show')) {
              renderAllLogsModal();
            }
            if (showSuccessToast) {
              showToast('已同步最新操作日誌');
            }
          });
        }
      }).catch(function() {
        hideLogsPanel();
      });
    }

    function refreshLogsNow() {
      loadLogs(true);
    }

    function getLogBadgeClass(action) {
      if (action === '獲取訂閱') return 'log-badge log-badge-sub';
      if (action === '登入後台') return 'log-badge log-badge-login';
      if (action === '登入失敗' || action === '異常存取') return 'log-badge log-badge-fail';
      return 'log-badge log-badge-edit';
    }

    function renderCompactLogs() {
      var container = document.getElementById('logsTableContainer');
      if (!operationLogs || operationLogs.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 1.5rem;">尚無任何操作日誌記錄</div>';
        return;
      }

      var previewLogs = operationLogs.slice(0, 5);
      var html = '<div class="logs-table-wrap"><table class="logs-table">' +
        '<thead><tr>' +
          '<th>時間 (UTC+8)</th>' +
          '<th>IP</th>' +
          '<th>地區</th>' +
          '<th>操作</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < previewLogs.length; i++) {
        var item = previewLogs[i];
        html += '<tr>' +
          '<td class="logs-mono" style="white-space:nowrap;">' + escapeHtml(item.time) + '</td>' +
          '<td class="logs-mono">' + escapeHtml(item.ip) + '</td>' +
          '<td>' + escapeHtml(item.region) + '</td>' +
          '<td><span class="' + getLogBadgeClass(item.action) + '">' + escapeHtml(item.action) + '</span></td>' +
        '</tr>';
      }

      html += '</tbody></table></div>';
      container.innerHTML = html;
    }

    function renderAllLogsModal() {
      var container = document.getElementById('allLogsTableContainer');
      if (!operationLogs || operationLogs.length === 0) {
        container.innerHTML = '<div class="empty-state" style="border: none;">目前沒有任何操作日誌記錄</div>';
        return;
      }

      var html = '<table class="logs-table">' +
        '<thead><tr>' +
          '<th>時間 (UTC+8)</th>' +
          '<th>IP</th>' +
          '<th>地區</th>' +
          '<th>ASN</th>' +
          '<th>操作</th>' +
          '<th>URL</th>' +
          '<th>UA</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < operationLogs.length; i++) {
        var item = operationLogs[i];
        html += '<tr>' +
          '<td class="logs-mono" style="white-space:nowrap;">' + escapeHtml(item.time) + '</td>' +
          '<td class="logs-mono" style="white-space:nowrap;">' + escapeHtml(item.ip) + '</td>' +
          '<td style="white-space:nowrap;">' + escapeHtml(item.region) + '</td>' +
          '<td class="logs-mono" style="min-width:140px;">' + escapeHtml(item.asn) + '</td>' +
          '<td><span class="' + getLogBadgeClass(item.action) + '">' + escapeHtml(item.action) + '</span></td>' +
          '<td class="logs-url-cell">' + escapeHtml(item.url) + '</td>' +
          '<td class="logs-ua-cell">' + escapeHtml(item.ua) + '</td>' +
        '</tr>';
      }

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    function toggleLogsCollapse() {
      isLogsCollapsed = !isLogsCollapsed;
      var header = document.getElementById('logsPanelHeader');
      var body = document.getElementById('logsBody');
      var icon = document.getElementById('toggleLogsIcon');
      var text = document.getElementById('toggleLogsText');
      if (isLogsCollapsed) {
        body.style.display = 'none';
        header.style.marginBottom = '0';
        icon.style.transform = 'rotate(-90deg)';
        if (text) text.textContent = '展開';
      } else {
        body.style.display = 'block';
        header.style.marginBottom = '1.25rem';
        icon.style.transform = 'rotate(0deg)';
        if (text) text.textContent = '收合';
      }
    }

    function openLogsModal() {
      renderAllLogsModal();
      document.getElementById('logsModal').classList.add('show');
      loadLogs();
    }

    function closeLogsModal() {
      document.getElementById('logsModal').classList.remove('show');
    }

    function clearLogs() {
      if (!confirm('確定要清空所有操作日誌嗎？此動作無法復原。')) return;
      var pwd = getStoredPwd();
      fetch('/logs', {
        method: 'DELETE',
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.ok) {
          operationLogs = [];
          renderCompactLogs();
          renderAllLogsModal();
          showToast('已清空所有操作日誌');
        } else {
          return parseErrorResponse(resp, '清空失敗').then(function(msg) {
            showToast('清空失敗：' + msg, false);
          });
        }
      }).catch(function(e) {
        showToast('清空失敗: ' + e.message, false);
      });
    }

    function renderLockScreen() {
      var headerActions = document.getElementById('favHeaderActions');
      headerActions.innerHTML = '';

      var grid = document.getElementById('favGrid');
      grid.className = '';
      grid.innerHTML = '<div class="lock-card" id="lockCardElement">' +
        '<div class="lock-icon-badge">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>' +
            '<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' +
          '</svg>' +
        '</div>' +
        '<div class="lock-title">私密配置與審計通知已鎖定</div>' +
        '<div class="lock-desc">此區域受管理密碼保護，請輸入密碼解鎖</div>' +
        '<div class="lock-form">' +
          '<input type="password" id="lockPwdInput" placeholder="請輸入管理密碼..." onkeydown="if(event.key===\\'Enter\\') unlockFavs()">' +
          '<button class="btn btn-primary" onclick="unlockFavs()">' +
            '<svg viewBox="0 0 24 24" style="width:16px;height:16px;margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>' +
            '解鎖全部功能' +
          '</button>' +
        '</div>' +
      '</div>';
    }

    function renderErrorScreen(msg) {
      document.getElementById('favHeaderActions').innerHTML = '';
      document.getElementById('favGrid').innerHTML = '<div class="empty-state">' + escapeHtml(msg) + '</div>';
    }

    function unlockFavs() {
      var input = document.getElementById('lockPwdInput');
      var pwd = input ? input.value.trim() : '';
      if (!pwd) {
        triggerShake();
        return showToast('請輸入管理密碼', false);
      }

      showToast('正在驗證密碼...');
      
      fetch('/favs?t=' + Date.now(), {
        headers: {
          'X-Password': pwd,
          'X-Login-Attempt': '1'
        }
      }).then(function(resp) {
        if (resp.ok) {
          localStorage.setItem('sub_fav_pwd', pwd);
          resp.json().then(function(data) {
            favs = data;
            isFavLocked = false;
            renderFavs();
            loadLogs();
            loadTgConfig();
            showToast('🔓 解鎖成功！已記住登入狀態');
          });
        } else {
          triggerShake();
          showToast('❌ 密碼錯誤，請重新輸入', false);
        }
      }).catch(function() {
        triggerShake();
        showToast('❌ 網路請求失敗', false);
      });
    }

    function triggerShake() {
      var el = document.getElementById('lockCardElement');
      if (el) {
        el.classList.add('shake');
        setTimeout(function() { el.classList.remove('shake'); }, 400);
      }
    }

    function lockFavs() {
      localStorage.removeItem('sub_fav_pwd');
      isFavLocked = true;
      hideLogsPanel();
      hideTgPanel();
      renderLockScreen();
      showToast('🔒 已鎖定配置、日誌與通知設定');
    }
    
    function renderFavs() {
      var headerActions = document.getElementById('favHeaderActions');
      headerActions.innerHTML = '<button class="btn btn-ghost" onclick="openModal()">' +
        '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
        '新增配置' +
      '</button>' +
      '<button class="btn btn-ghost" onclick="lockFavs()" title="鎖定配置清單">' +
        '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
        '鎖定' +
      '</button>';

      var grid = document.getElementById('favGrid');
      if (!favs || favs.length === 0) {
        grid.className = '';
        grid.innerHTML = '<div class="empty-state">目前尚未儲存配置，請點擊上方按鈕新增</div>';
        return;
      }

      grid.className = 'fav-grid';
      var html = '';
      for (var i = 0; i < favs.length; i++) {
        var f = favs[i];
        var includeBadge = f.include ? '<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.2); margin-right: 4px;">保: ' + escapeHtml(f.include) + '</span>' : '';
        var excludeBadge = f.exclude ? '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2); margin-right: 4px;">排: ' + escapeHtml(f.exclude) + '</span>' : '';
        var renameBadge = f.rename ? '<span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); border-color: rgba(59, 130, 246, 0.2); margin-right: 4px;">替: ' + escapeHtml(f.rename) + '</span>' : '';
        var tokenBadge = f.token ? '<span class="badge" style="background: rgba(245, 158, 11, 0.12); color: var(--warning); border-color: rgba(245, 158, 11, 0.3);">🔒 Token 保護</span>' : '';

        html += '<div class="fav-card" onclick="useFav(' + i + ')">' +
          '<div class="fav-title">' +
            '<svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' +
            escapeHtml(f.name) +
          '</div>' +
          '<div class="fav-url">' + escapeHtml(f.url) + '</div>' +
          '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">' +
            includeBadge + excludeBadge + renameBadge + tokenBadge +
          '</div>' +
          '<div class="fav-actions">' +
            '<button class="btn btn-ghost" onclick="event.stopPropagation(); editFav(' + i + ')">編輯</button>' +
            '<button class="btn btn-ghost btn-danger" onclick="event.stopPropagation(); deleteFav(' + i + ')">刪除</button>' +
          '</div>' +
        '</div>';
      }
      grid.innerHTML = html;
    }

    function useFav(index) {
      if (!favs[index]) return;
      var f = favs[index];
      document.getElementById('urlInput').value = f.url || '';
      document.getElementById('shortCode').value = f.name || '';
      document.getElementById('shortToken').value = f.token || '';
      document.getElementById('includeKeywords').value = f.include || '';
      document.getElementById('excludeKeywords').value = f.exclude || '';
      document.getElementById('renameKeywords').value = f.rename || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('已載入配置：' + f.name);
      generate();
    }

    function editFav(index) {
      if (!favs[index]) return;
      var f = favs[index];
      document.getElementById('modalTitle').textContent = '編輯配置';
      document.getElementById('favName').value = f.name || '';
      document.getElementById('favUrl').value = f.url || '';
      document.getElementById('favInclude').value = f.include || '';
      document.getElementById('favExclude').value = f.exclude || '';
      document.getElementById('favRename').value = f.rename || '';
      document.getElementById('favToken').value = f.token || '';
      document.getElementById('modal').dataset.edit = index;
      document.getElementById('modal').classList.add('show');
    }

    function deleteFav(index) {
      if (!confirm('確定要刪除這筆配置嗎？')) return;
      var pwd = getStoredPwd();
      fetch('/favs', { 
        method: 'DELETE', 
        headers: { 
          'Content-Type': 'application/json',
          'X-Password': pwd
        }, 
        body: JSON.stringify({ index: index }) 
      }).then(function(resp) {
        if (resp.ok) {
          loadFavs(false);
          showToast('已成功刪除配置');
        } else {
          return parseErrorResponse(resp, '刪除失敗').then(function(msg) {
            showToast('刪除失敗 (HTTP ' + resp.status + ')：' + msg, false);
          });
        }
      }).catch(function(e) {
        showToast('刪除失敗: ' + e.message, false);
      });
    }

    function saveFav() {
      var name = document.getElementById('favName').value.trim();
      var url = document.getElementById('favUrl').value.trim();
      var include = document.getElementById('favInclude').value.trim();
      var exclude = document.getElementById('favExclude').value.trim();
      var rename = document.getElementById('favRename').value.trim();
      var token = document.getElementById('favToken').value.trim();
      if (!name || !url) return showToast('請完整填寫名稱與節點內容', false);

      var editIndex = document.getElementById('modal').dataset.edit;
      var pwd = getStoredPwd();
      var reqMethod = (editIndex !== '' && editIndex !== undefined) ? 'PUT' : 'POST';
      var reqBody = {
        name: name,
        url: url,
        include: include,
        exclude: exclude,
        rename: rename,
        token: token
      };
      if (reqMethod === 'PUT') {
        reqBody.index = parseInt(editIndex, 10);
      }

      fetch('/favs', {
        method: reqMethod,
        headers: { 
          'Content-Type': 'application/json',
          'X-Password': pwd
        },
        body: JSON.stringify(reqBody)
      }).then(function(resp) {
        if (resp.ok) {
          closeModal();
          loadFavs(false);
          showToast('配置儲存成功！');
        } else if (resp.status === 401) {
          showToast('儲存失敗：密碼錯誤或未授權，請先鎖定後重新登入', false);
        } else {
          return parseErrorResponse(resp, '伺服器處理錯誤').then(function(msg) {
            showToast('儲存失敗 (HTTP ' + resp.status + ')：' + msg, false);
          });
        }
      }).catch(function(e) {
        showToast('儲存失敗，網路異常: ' + e.message, false);
      });
    }

    function generate() {
      var raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點連結或訂閱網址', false);

      var host = window.location.origin;
      var shortCode = document.getElementById('shortCode').value.trim();
      var shortToken = document.getElementById('shortToken').value.trim();
      var include = document.getElementById('includeKeywords').value.trim();
      var exclude = document.getElementById('excludeKeywords').value.trim();
      var rename = document.getElementById('renameKeywords').value.trim();
      
      var proceed = function(baseUrl) {
        var sep = baseUrl.indexOf('?') !== -1 ? '&' : '?';

        var buildUrl = function(target) {
          if (!target) return baseUrl;
          return baseUrl + sep + 'target=' + target;
        };

        document.getElementById('adaptiveUrl').value = buildUrl('');
        document.getElementById('clashUrl').value = buildUrl('clash');
        document.getElementById('singboxUrl').value = buildUrl('singbox');
        document.getElementById('surgeUrl').value = buildUrl('surge');
        document.getElementById('quanxUrl').value = buildUrl('quanx');
        document.getElementById('loonUrl').value = buildUrl('loon');
        document.getElementById('base64Url').value = buildUrl('base64');
        document.getElementById('honkUrl').value = buildUrl('honk');

        document.getElementById('results').classList.add('show');
        showToast('全客戶端連結生成完畢！');
      };

      if (shortCode) {
        showToast('正在儲存短代碼配置...');
        fetch('/save', { 
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
            'X-Password': getStoredPwd()
          }, 
          body: JSON.stringify({
            path: shortCode,
            content: raw,
            include: include,
            exclude: exclude,
            rename: rename,
            token: shortToken
          }) 
        }).then(function(resp) {
          if (!resp.ok) {
            return parseErrorResponse(resp, 'HTTP ' + resp.status).then(function(msg) {
              throw new Error(msg);
            });
          }
          var targetBase = host + '/' + encodeURIComponent(shortCode);
          if (shortToken) {
            targetBase += '?token=' + encodeURIComponent(shortToken);
          }
          proceed(targetBase);
          if (!isFavLocked && !isLogsUnconfigured) loadLogs();
        }).catch(function(err) {
          showToast('短連結儲存失敗: ' + err.message, false);
        });
      } else {
        var bUrl = host + '/?url=' + encodeURIComponent(raw);
        if (include) bUrl += '&include=' + encodeURIComponent(include);
        if (exclude) bUrl += '&exclude=' + encodeURIComponent(exclude);
        if (rename) bUrl += '&rename=' + encodeURIComponent(rename);
        proceed(bUrl);
      }
    }

    function showQr(id, clientType) {
      if (!clientType) clientType = 'auto';
      var rawUrl = document.getElementById(id).value;
      if (!rawUrl) return showToast('請先生成訂閱連結', false);

      var profileName = document.getElementById('shortCode').value.trim();
      if (!profileName) {
        try {
          var u = new URL(rawUrl);
          profileName = decodeURIComponent(u.pathname.slice(1)) || 'SubConverter';
        } catch {
          profileName = 'SubConverter';
        }
      }
      
      var cleanHttpUrl = rawUrl.split('#')[0];
      var qrTargetText = cleanHttpUrl;
      var deepLink = cleanHttpUrl;
      var displayTitle = '掃碼導入配置';
      var clientName = '客戶端';

      if (clientType === 'singbox') {
        deepLink = 'sing-box://import-remote-profile?url=' + encodeURIComponent(cleanHttpUrl) + '#' + encodeURIComponent(profileName);
        qrTargetText = deepLink;
        displayTitle = 'Sing-Box 專屬掃碼導入';
        clientName = 'Sing-Box';
      } else if (clientType === 'clash') {
        deepLink = 'clash://install-config?url=' + encodeURIComponent(cleanHttpUrl) + '&name=' + encodeURIComponent(profileName);
        qrTargetText = deepLink;
        displayTitle = 'Clash / Mihomo 專屬導入';
        clientName = 'Clash';
      } else if (clientType === 'surge') {
        deepLink = 'surge:///install-config?url=' + encodeURIComponent(cleanHttpUrl);
        qrTargetText = cleanHttpUrl;
        displayTitle = 'Surge 5 專屬導入';
        clientName = 'Surge';
      } else if (clientType === 'quanx') {
        deepLink = 'quantumult-x:///add-resource?remote-resource=' + encodeURIComponent(JSON.stringify({ server_remote: [cleanHttpUrl + ', tag=' + profileName] }));
        qrTargetText = cleanHttpUrl;
        displayTitle = 'Quantumult X 專屬導入';
        clientName = 'Quantumult X';
      } else if (clientType === 'loon') {
        deepLink = 'loon://import?type=config&url=' + encodeURIComponent(cleanHttpUrl);
        qrTargetText = cleanHttpUrl;
        displayTitle = 'Loon 專屬導入';
        clientName = 'Loon';
      } else if (clientType === 'shadowrocket') {
        deepLink = 'shadowrocket://add/sub://' + btoa(cleanHttpUrl) + '?remark=' + encodeURIComponent(profileName);
        qrTargetText = cleanHttpUrl + '#' + encodeURIComponent(profileName);
        displayTitle = 'Shadowrocket 專屬導入';
        clientName = 'Shadowrocket';
      }

      var win = window.open('', '_blank', 'width=460,height=600');
      if (!win) return showToast('請允許瀏覽器開啟彈出視窗', false);

      var qrHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(displayTitle) + '</title>' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\\/script>' +
        '<style>' +
          'body { background: #0f172a; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }' +
          'h2 { font-size: 1.15rem; margin-bottom: 8px; }' +
          'p { color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px; }' +
          '#qrcode { background: #ffffff; padding: 16px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); margin-bottom: 20px; }' +
          '#qrcode img { display: block; }' +
          '.btn { display: inline-flex; align-items: center; justify-content: center; background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; cursor: pointer; width: 100%; max-width: 280px; font-size: 0.95rem; margin-bottom: 10px; transition: background 0.2s; }' +
          '.btn:hover { background: #2563eb; }' +
          '.btn-ghost { background: transparent; border: 1px solid #334155; color: #94a3b8; }' +
          '.btn-ghost:hover { background: #1e293b; color: white; }' +
        '</style>' +
        '</head><body>' +
        '<h2>' + escapeHtml(displayTitle) + '</h2>' +
        '<p>使用手機相機或對應客戶端掃描二維碼</p>' +
        '<div id="qrcode"></div>' +
        '<a href="' + escapeHtml(deepLink) + '" class="btn">🚀 一鍵打開並導入 ' + escapeHtml(clientName) + '</a>' +
        '<button onclick="window.close()" class="btn btn-ghost">關閉視窗</button>' +
        '<script>' +
          'new QRCode(document.getElementById("qrcode"), {' +
            'text: ' + JSON.stringify(qrTargetText) + ',' +
            'width: 220,' +
            'height: 220,' +
            'correctLevel: QRCode.CorrectLevel.M' +
          '});' +
        '<\\/script>' +
        '</body></html>';

      win.document.open();
      win.document.write(qrHtml);
      win.document.close();
    }

    function parseVlessNodes() {
      var raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先在最上方輸入框貼入節點內容', false);

      showToast('正在解析 VLESS / VMess 節點...');
      fetch('/api/parse-argo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw })
      }).then(function(res) {
        if (!res.ok) throw new Error('解析請求失敗');
        return res.json();
      }).then(function(nodes) {
        if (!nodes || nodes.length === 0) {
          return showToast('未找到可轉換的 VLESS / VMess 節點', false);
        }
        parsedArgoNodesCache = nodes;
        var listEl = document.getElementById('vlessCheckboxList');
        var html = '';
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          html += '<label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">' +
            '<input type="checkbox" name="argoNodeIdx" value="' + n.index + '" data-port="' + escapeHtml(n.port) + '" ' + (i === 0 ? 'checked' : '') + ' onchange="updateArgoPort(this)">' +
            '<span>' + escapeHtml(n.name) + ' (' + escapeHtml(n.server) + ':' + escapeHtml(n.port) + ', ' + escapeHtml(n.type) + ')</span>' +
          '</label>';
        }
        listEl.innerHTML = html;
        document.getElementById('argoLocalPort').value = nodes[0].port || '8080';
        document.getElementById('vlessSelectorWrapper').style.display = 'block';
        showToast('成功解析 ' + nodes.length + ' 個相容節點！');
      }).catch(function(e) {
        showToast('解析失敗: ' + e.message, false);
      });
    }

    function updateArgoPort(checkbox) {
      if (checkbox.checked && checkbox.dataset.port) {
        document.getElementById('argoLocalPort').value = checkbox.dataset.port;
      }
    }

    function generateArgo() {
      var raw = document.getElementById('urlInput').value.trim();
      var checkedBoxes = document.querySelectorAll('input[name="argoNodeIdx"]:checked');
      var indices = [];
      checkedBoxes.forEach(function(box) {
        indices.push(parseInt(box.value, 10));
      });

      if (indices.length === 0) return showToast('請至少勾選一個欲轉換的節點', false);

      var port = document.getElementById('argoLocalPort').value.trim() || '8080';
      var cleanIp = document.getElementById('argoCleanIp').value.trim();
      var token = document.getElementById('argoTunnelToken').value.trim();
      var domain = document.getElementById('argoCustomDomain').value.trim();

      if (token && !domain) {
        return showToast('使用固定隧道模式時，必須填寫自訂綁定域名', false);
      }

      showToast('正在生成 Argo 腳本與配置...');
      fetch('/api/argo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: raw,
          indices: indices,
          port: port,
          cleanIp: cleanIp,
          token: token,
          domain: domain
        })
      }).then(function(res) {
        if (!res.ok) throw new Error('生成失敗');
        return res.json();
      }).then(function(data) {
        var host = window.location.origin;
        var curlCmd = 'curl -sSL ' + host + '/argo/sh/' + data.scriptId + ' | bash';
        document.getElementById('argoCurlCmd').value = curlCmd;

        var links = (data.argoNodes || []).map(function(item) { return item.link; });
        document.getElementById('argoBase64Sub').value = links.join('\\n');

        document.getElementById('argoResults').classList.add('show');
        showToast('Argo 腳本與節點已成功生成！');
      }).catch(function(e) {
        showToast('生成失敗: ' + e.message, false);
      });
    }

    window.addEventListener('DOMContentLoaded', function() {
      loadFavs(true);
    });

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && !isFavLocked && !isLogsUnconfigured) {
        loadLogs();
      }
    });

    setInterval(function() {
      if (!document.hidden && !isFavLocked && !isLogsUnconfigured) {
        loadLogs();
      }
    }, 15000);
`;
