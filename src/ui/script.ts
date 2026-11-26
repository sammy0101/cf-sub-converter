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
    var lastLogsFetchAt = 0;

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function utf8ToBase64Client(str) {
      try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(_, p1) {
          return String.fromCharCode(parseInt(p1, 16));
        }));
      } catch {
        return btoa(str);
      }
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
      document.getElementById('modal').dataset.origName = '';
      document.getElementById('modal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('show');
    }

    function openArgoHelpModal() {
      document.getElementById('argoHelpModal').classList.add('show');
    }

    function closeArgoHelpModal() {
      document.getElementById('argoHelpModal').classList.remove('show');
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
            badge.style.background = 'rgba(16, 185, 129, 0.14)';
            badge.style.color = '#6ee7b7';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
          } else {
            badge.style.background = 'rgba(59, 130, 246, 0.14)';
            badge.style.color = '#93c5fd';
            badge.style.borderColor = 'rgba(96, 165, 250, 0.3)';
          }
        } else {
          badge.style.display = 'inline-block';
          badge.textContent = '未配置';
          badge.style.background = 'rgba(148, 163, 184, 0.12)';
          badge.style.color = 'var(--text-muted)';
          badge.style.borderColor = 'rgba(148, 163, 184, 0.24)';
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
