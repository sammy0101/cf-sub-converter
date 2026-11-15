// src/ui/markup.ts
export const UI_MARKUP = `
  <header class="header">
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
      SubConverter Pro
    </div>
    <span class="badge" id="appVersionBadge">PRO</span>
  </header>

  <div class="container">
    <main class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          資料來源與規則設定
        </h2>
      </div>
      
      <div class="form-group">
        <label for="urlInput">節點連結或訂閱地址 (支援多筆換行，含 WireGuard/MASQUE/WARP/AnyTLS)</label>
        <textarea id="urlInput" placeholder="vmess://...&#10;vless://...&#10;wireguard://...&#10;masque://...&#10;hysteria2://...&#10;https://example.com/sub"></textarea>
      </div>

      <div class="form-group">
        <label for="includeKeywords">僅保留關鍵字節點 (選填，多個用 | 分隔)</label>
        <input type="text" id="includeKeywords" placeholder="例如: 🇭🇰|台灣|TW|IPLC">
      </div>

      <div class="form-group">
        <label for="excludeKeywords">排除關鍵字節點 (選填，多個用 | 分隔)</label>
        <input type="text" id="excludeKeywords" placeholder="例如: 流量|官網|重置|5x">
      </div>

      <div class="form-group">
        <label for="renameKeywords">節點名稱替換 (選填，多個用 | 分隔)</label>
        <input type="text" id="renameKeywords" placeholder="例如: DEL-[69云]|移动优化-專線|ALL-JP">
      </div>
      
      <div class="form-group">
        <label for="shortCode">自訂路徑短連結 (選填)</label>
        <input type="text" id="shortCode" placeholder="例如: proton_vpn">
      </div>
      
      <button class="btn btn-primary" id="generateBtn" onclick="generate()" style="margin-top: 1.5rem;">
        <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>執行全客戶端轉換</span>
      </button>
    </main>

    <section class="results-wrapper" id="results">
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            多平台訂閱連結
          </h2>
        </div>
        
        <!-- 自適應 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">自適應 (Auto)</div><div class="result-desc">自動識別客戶端協議</div></div>
          <div class="result-input-wrapper"><input type="text" id="adaptiveUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('adaptiveUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('adaptiveUrl', 'auto')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Sing-Box -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Sing-Box</div><div class="result-desc">JSON 配置 · 雙 DoH 高可用</div></div>
          <div class="result-input-wrapper"><input type="text" id="singboxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('singboxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('singboxUrl', 'singbox')" title="顯示 Sing-Box 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Clash Meta -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Clash Meta (Mihomo)</div><div class="result-desc">YAML 配置 · 並發 DoH 競速</div></div>
          <div class="result-input-wrapper"><input type="text" id="clashUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('clashUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('clashUrl', 'clash')" title="顯示 Clash 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Surge 5 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">Surge 5</div><div class="result-desc">標準 Surge .conf 格式 · 小火箭首選</div></div>
          <div class="result-input-wrapper"><input type="text" id="surgeUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('surgeUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('surgeUrl', 'surge')" title="顯示 Surge 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Quantumult X -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div class="result-info"><div class="result-name">Quantumult X</div><div class="result-desc">server_remote 遠端節點列表</div></div>
          <div class="result-input-wrapper"><input type="text" id="quanxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('quanxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('quanxUrl', 'quanx')" title="顯示 Quantumult X 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Loon -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          </div>
          <div class="result-info"><div class="result-name">Loon</div><div class="result-desc">Loon 代理配置清單</div></div>
          <div class="result-input-wrapper"><input type="text" id="loonUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('loonUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('loonUrl', 'loon')" title="顯示 Loon 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Base64 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">Base64 / 通用</div><div class="result-desc">通用明文 / v2rayNG / Shadowrocket</div></div>
          <div class="result-input-wrapper"><input type="text" id="base64Url" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('base64Url')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('base64Url', 'shadowrocket')" title="顯示通用掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Honk / DAE (放在最下面) -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </div>
          <div class="result-info"><div class="result-name">Honk / DAE</div><div class="result-desc">OpenWrt eBPF 內核級配置 · Doona UI</div></div>
          <div class="result-input-wrapper"><input type="text" id="honkUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('honkUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
          </div>
        </div>
      </div>
    </section>

    <!-- Argo 隧道 2.0 生成器 -->
    <main class="panel">
      <div class="panel-header">
        <h2 class="panel-title" style="color: var(--primary);">
          <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          Argo 隧道 2.0 (支援優選 IP / 多端口部署)
        </h2>
      </div>
      
      <div class="form-group">
        <button class="btn btn-ghost" id="parseVlessBtn" onclick="parseVlessNodes()" style="width: 100%; justify-content: center; font-weight: 600;">
          第一步：解析並載入目前輸入的 VLESS / VMess 節點
        </button>
      </div>

      <div id="vlessSelectorWrapper" style="display: none; margin-top: 1.25rem; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; background: var(--bg-input);">
        <label style="margin-bottom: 0.75rem; display: block; font-weight: 600;">選擇要轉換的原始節點 (可多選)：</label>
        <div id="vlessCheckboxList" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; margin-bottom: 1.25rem;"></div>
        
        <div class="form-group">
          <label>1. VPS 本地監聽連接埠 (預設匹配選中節點)</label>
          <input type="text" id="argoLocalPort" value="8080">
        </div>

        <div class="form-group">
          <label>2. Cloudflare 優選 IP / 優選官方域名 (選填，例如 104.16.80.1)</label>
          <input type="text" id="argoCleanIp" placeholder="若留空則預設直接使用 Argo 分配域名">
        </div>

        <div class="form-group">
          <label>3. Cloudflare Tunnel Token (選填，留空啟用臨時隨機隧道)</label>
          <input type="text" id="argoTunnelToken" placeholder="若使用固定隧道請貼上 Token">
        </div>

        <div class="form-group">
          <label>4. 自訂綁定域名 (固定隧道必填)</label>
          <input type="text" id="argoCustomDomain" placeholder="例如: argo.yourdomain.com">
        </div>

        <button class="btn btn-primary" id="generateArgoBtn" onclick="generateArgo()" style="margin-top: 1rem; background: var(--success);">
          第二步：生成 Argo 一鍵部署指令與節點
        </button>
      </div>
    </main>

    <!-- Argo 結果區 -->
    <section class="results-wrapper" id="argoResults">
      <div class="panel">
        <div class="panel-header"><h2 class="panel-title" style="color: var(--success);">Argo 部署指令與節點列表</h2></div>
        <div class="form-group">
          <label>📋 VPS 一鍵部署命令 (root 權限執行)：</label>
          <div class="cmd-group">
            <input type="text" id="argoCurlCmd" readonly>
            <button class="btn btn-ghost" onclick="copyText('argoCurlCmd')">複製指令</button>
          </div>
        </div>
        <div class="form-group">
          <label>🔗 新生成的 Argo 節點列表：</label>
          <textarea id="argoBase64Sub" readonly style="min-height: 120px; font-size: 0.8rem;"></textarea>
          <button class="btn btn-ghost" onclick="copyText('argoBase64Sub')" style="margin-top: 0.5rem; width: 100%;">複製全部節點</button>
        </div>
      </div>
    </section>

    <!-- 已儲存的配置 -->
    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          已儲存的配置
        </h2>
        <div id="favHeaderActions" style="display: flex; gap: 8px;"></div>
      </div>
      
      <div id="favGrid"></div>
    </section>

    <!-- 查看操作日誌 -->
    <section class="panel" id="logsPanel" style="display: none;">
      <div class="panel-header" id="logsPanelHeader">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          查看操作日誌
        </h2>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost" id="refreshLogsBtn" onclick="refreshLogsNow()" title="立即刷新日誌">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            刷新
          </button>
          <button class="btn btn-ghost" id="toggleLogsBtn" onclick="toggleLogsCollapse()" title="收合 / 展開">
            <svg id="toggleLogsIcon" viewBox="0 0 24 24" style="width:16px;height:16px;transition:transform 0.2s"><polyline points="6 9 12 15 18 9"></polyline></svg>
            <span id="toggleLogsText">收合</span>
          </button>
        </div>
      </div>
      <div id="logsBody">
        <div id="logsTableContainer"></div>
        <div class="logs-footer" id="logsFooter">
          <span class="logs-note">因為 KV 空間與 Workers CPU 限制，只保留最新 200 筆操作日誌，超過該數量會自動清理最舊的日誌記錄。</span>
          <button class="btn btn-primary" style="width: auto; padding: 0.65rem 1.25rem; font-size: 0.9rem;" onclick="openLogsModal()">全部日誌</button>
        </div>
      </div>
    </section>

    <!-- 消息通知設定 -->
    <section class="panel" id="tgPanel" style="display: none;">
      <div class="panel-header" id="tgPanelHeader">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          消息通知設定
        </h2>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost" id="toggleTgBtn" onclick="toggleTgCollapse()" title="收合 / 展開">
            <svg id="toggleTgIcon" viewBox="0 0 24 24" style="width:16px;height:16px;transition:transform 0.2s"><polyline points="6 9 12 15 18 9"></polyline></svg>
            <span id="toggleTgText">收合</span>
          </button>
        </div>
      </div>
      <div id="tgBody">
        <div class="tg-control-row">
          <div class="tg-left-group">
            <span class="tg-label-text">Telegram Bot 通知設定</span>
            <label class="tg-checkbox-label" for="tgEnabledCheckbox">
              <input type="checkbox" id="tgEnabledCheckbox" onchange="toggleTgEnabled(this)">
              <span>啟用</span>
            </label>
            <span class="badge" id="tgStatusBadge" style="display: none;"></span>
          </div>
          <div class="tg-actions-group">
            <button class="btn btn-ghost" onclick="openTgHelpModal()" title="查看申請教學與設定說明" style="padding: 0.5rem 0.7rem; font-weight: 700;">?</button>
            <button class="btn btn-primary" style="width: auto; padding: 0.55rem 1rem; font-size: 0.85rem;" onclick="openTgModal()">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              參數配置
            </button>
            <button class="btn btn-ghost btn-danger" onclick="clearTgConfig()">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              清除配置
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- 全部日誌彈窗 -->
  <div class="modal-overlay" id="logsModal">
    <div class="modal-content logs-modal-content">
      <div class="panel-header" style="margin-bottom: 1.25rem;">
        <h3 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          所有操作日誌
        </h3>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost" onclick="refreshLogsNow()" title="立即刷新">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            刷新
          </button>
        </div>
      </div>
      <div class="logs-modal-scroll" id="allLogsTableContainer"></div>
      <div class="modal-footer" style="margin-top: 1.5rem; justify-content: space-between; flex-wrap: wrap;">
        <button class="btn btn-ghost btn-danger" onclick="clearLogs()">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          清空日誌
        </button>
        <button class="btn btn-primary" onclick="closeLogsModal()" style="width: auto; padding: 0.65rem 1.5rem; font-size: 0.95rem;">關閉</button>
      </div>
    </div>
  </div>

  <!-- Telegram Bot 參數配置彈窗 -->
  <div class="modal-overlay" id="tgModal">
    <div class="modal-content" style="max-width: 540px;">
      <div class="panel-header" style="margin-bottom: 1.25rem;">
        <h3 class="panel-title">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          Telegram Bot 參數配置
        </h3>
        <button class="btn btn-ghost" onclick="openTgHelpModal()" title="查看設定教學" style="padding: 0.4rem 0.65rem; font-weight: 700;">?</button>
      </div>
      <div class="form-group">
        <label for="tgBotTokenInput">Bot Token</label>
        <input type="password" id="tgBotTokenInput" placeholder="例如: 123456789:AAHxxxxxxxxxxxxxxxxxxxx">
        <div class="hint" id="tgTokenHint">若已配置過 Token，留空不填代表維持原本設定的密鑰。</div>
      </div>
      <div class="form-group">
        <label for="tgChatIdInput">Chat ID</label>
        <input type="text" id="tgChatIdInput" placeholder="例如: 987654321 或 -1001234567890">
        <div class="hint">啟用後將自動推送所有事件通知（含操作類型、時間 UTC+8、IP、地區、ASN、URL 與 UA）。</div>
      </div>
      <div class="modal-footer" style="margin-top: 1.75rem; justify-content: space-between; flex-wrap: wrap;">
        <button class="btn btn-ghost" id="tgTestBtn" onclick="testTgConfig()">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          發送測試訊息
        </button>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-ghost" onclick="closeTgModal()">取消</button>
          <button class="btn btn-primary" onclick="saveTgConfig()" style="width: auto; padding: 0.65rem 1.5rem; font-size: 0.95rem;">儲存</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Telegram Bot ? 說明教學彈窗 -->
  <div class="modal-overlay" id="tgHelpModal">
    <div class="modal-content" style="max-width: 600px;">
      <div class="panel-header" style="margin-bottom: 1.25rem;">
        <h3 class="panel-title">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          Telegram Bot 申請與設定說明
        </h3>
      </div>
      <div class="tg-help-box">
        <div class="tg-help-step">
          <div class="tg-help-step-title">第一步：申請機器人並取得 Bot Token</div>
          <div>
            1. 在 Telegram 搜尋並開啟官方帳號 <code>@BotFather</code>。<br>
            2. 發送指令 <code>/newbot</code>，依提示輸入機器人的顯示名稱與用戶名（用戶名必須以 <code>bot</code> 結尾，例如 <code>my_sub_alert_bot</code>）。<br>
            3. 建立成功後，複製訊息中類似 <code>123456789:AAHxxx...</code> 的字串，填入 <strong>Bot Token</strong>。
          </div>
        </div>
        <div class="tg-help-step">
          <div class="tg-help-step-title">第二步：查詢個人或群組 Chat ID</div>
          <div>
            1. 在 Telegram 搜尋並開啟 <code>@userinfobot</code>（或 <code>@getidsbot</code>），點擊 <code>Start</code>。<br>
            2. 機器人會回覆一串純數字 <code>Id</code>（例如 <code>987654321</code>），填入 <strong>Chat ID</strong>。<br>
            3. 若要通知至群組，請先將機器人加入群組並查出以 <code>-100</code> 開頭的群組 ID。
          </div>
        </div>
        <div class="tg-help-step">
          <div class="tg-help-step-title">第三步：必做！先啟動機器人對話</div>
          <div>
            設定完成前，請務必親自搜尋並開啟您剛建立的機器人視窗，點擊底部的 <strong><code>Start</code></strong>（發送 <code>/start</code>）。<br>
            若未先主動發起對話，Telegram 安全機制會阻擋機器人主動傳訊（測試時將顯示 Forbidden 錯誤）。
          </div>
        </div>
        <div class="tg-help-step">
          <div class="tg-help-step-title">第四步：測試與安全機制</div>
          <div>
            填妥後點擊 <strong>「發送測試訊息」</strong> 驗證連線正常即可儲存。所有憑證皆受 <code>PAGE_PASSWORD</code> 保護並儲存於 Cloudflare KV，讀取時會自動遮罩敏感字元。
          </div>
        </div>
      </div>
      <div class="modal-footer" style="margin-top: 1.5rem;">
        <button class="btn btn-primary" onclick="closeTgHelpModal()" style="width: auto; padding: 0.65rem 1.5rem; font-size: 0.95rem;">我知道了</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="modal">
    <div class="modal-content">
      <h3 id="modalTitle" style="margin-bottom: 1rem;">新增配置</h3>
      <div class="form-group"><label>配置名稱</label><input type="text" id="favName"></div>
      <div class="form-group"><label>節點內容 / 訂閱連結</label><textarea id="favUrl"></textarea></div>
      <div class="form-group"><label>保留關鍵字</label><input type="text" id="favInclude"></div>
      <div class="form-group"><label>排除關鍵字</label><input type="text" id="favExclude"></div>
      <div class="form-group"><label>名稱替換規則</label><input type="text" id="favRename"></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="saveFav()" style="width: auto;">儲存</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast">
    <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span id="toastMsg">提示訊息</span>
  </div>
`;
