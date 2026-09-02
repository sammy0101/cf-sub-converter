// src/constants.ts
export const REMOTE_CONFIG = {
  singbox: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Sing-Box_Rules.JSON',
  clash: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Clash_Rules.YAML'
};

// 方案 B1 內嵌緊急降級模板 (Sing-Box 1.14+ 規範)
export const FALLBACK_SINGBOX_RULES = JSON.stringify({
  log: { level: "info" },
  http_clients: [
    { tag: "default" }
  ],
  dns: {
    servers: [
      { tag: "remote-dns", type: "https", server: "8.8.8.8", detour: "🚀 節點選擇" },
      { tag: "local-dns", type: "udp", server: "223.5.5.5" },
      { tag: "system-dns", type: "local" },
      { tag: "fakeip-dns", type: "fakeip", inet4_range: "198.18.0.0/15", inet6_range: "fc00::/18" }
    ],
    rules: [
      { rule_set: "rs-ads", action: "reject" },
      {
        rule_set: [
          "rs-cn",
          "rs-private"
        ],
        server: "local-dns"
      },
      {
        rule_set: [
          "rs-geolocation-!cn",
          "rs-ai"
        ],
        server: "fakeip-dns"
      }
    ],
    final: "local-dns",
    strategy: "ipv4_only"
  },
  inbounds: [{ type: "tun", tag: "tun-in", interface_name: "tun0", auto_route: true, stack: "mixed" }],
  outbounds: [
    { type: "selector", tag: "🚀 節點選擇", outbounds: ["⚡ 自動選擇", "direct"] },
    { type: "urltest", tag: "⚡ 自動選擇", outbounds: [], url: "https://www.gstatic.com/generate_204", interval: "3m" },
    { type: "direct", tag: "direct" },
    { type: "block", tag: "block" }
  ],
  route: {
    default_domain_resolver: "local-dns",
    default_http_client: "default",
    rules: [
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" }
    ],
    auto_detect_interface: true
  },
  experimental: {
    cache_file: { enabled: true, store_fakeip: true }
  }
});

export const FALLBACK_CLASH_RULES = `
port: 7890
allow-lan: true
mode: rule
log-level: info
proxies: []
proxy-groups:
  - name: 🚀 節點選擇
    type: select
    proxies:
      - ⚡ 自動選擇
      - DIRECT
  - name: ⚡ 自動選擇
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    proxies: []
rules:
  - GEOIP,CN,DIRECT
  - MATCH,🚀 節點選擇
`;

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SubConverter Pro | 全能訂閱轉換器</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  
  <style>
    :root {
      --bg-app: #0f172a;
      --bg-panel: #1e293b;
      --bg-input: #0f172a;
      --bg-hover: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-app); color: var(--text-main); line-height: 1.5; min-height: 100vh;
    }
    svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .header {
      background-color: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.25rem; }
    .brand svg { color: var(--primary); width: 1.75rem; height: 1.75rem; }
    .badge { background: rgba(59, 130, 246, 0.1); color: var(--primary); font-size: 0.75rem; padding: 4px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(59, 130, 246, 0.2); }
    .container { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .panel { background-color: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel-title { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group:last-child { margin-bottom: 0; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); margin-bottom: 0.5rem; }
    textarea, input[type="text"], input[type="password"] {
      width: 100%; background-color: var(--bg-input); border: 1px solid var(--border); color: var(--text-main); border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
    }
    textarea { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; min-height: 140px; resize: vertical; }
    textarea:focus, input[type="text"]:focus, input[type="password"]:focus { border-color: var(--primary); }
    .hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem; display: flex; align-items: flex-start; gap: 6px; }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem; border: none; cursor: pointer; transition: all 0.2s; user-select: none;
    }
    .btn-primary { background-color: var(--primary); color: white; width: 100%; padding: 1rem; font-size: 1.05rem; }
    .btn-primary:hover { background-color: var(--primary-hover); }
    .btn-icon { background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border); padding: 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; }
    .btn-icon:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--text-muted); }
    .btn-ghost { background: transparent; color: var(--text-muted); padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem;}
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-main); }
    .btn-danger:hover { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }

    .results-wrapper { display: none; }
    .results-wrapper.show { display: block; animation: slideUp 0.3s ease forwards; }
    .result-item { display: flex; align-items: center; gap: 1rem; background-color: var(--bg-input); border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; }
    .result-icon-box { width: 44px; height: 44px; border-radius: var(--radius-sm); background-color: var(--bg-panel); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
    .result-info { flex: 1; min-width: 140px; }
    .result-name { font-weight: 600; font-size: 0.95rem; color: var(--text-main); }
    .result-desc { font-size: 0.8rem; color: var(--text-muted); }
    .result-input-wrapper { flex: 2; position: relative; }
    .result-input-wrapper input { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-panel); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-muted); }
    .result-actions { display: flex; gap: 6px; flex-shrink: 0; }

    .fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .fav-card { 
      background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; cursor: pointer; transition: all 0.2s ease; 
    }
    .fav-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .fav-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .fav-url { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fav-actions { display: flex; gap: 8px; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); justify-content: flex-end; }
    .empty-state { text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.9rem; border: 1px dashed var(--border); border-radius: var(--radius-md); }

    /* 鎖定區域樣式 */
    .lock-card {
      background: radial-gradient(circle at top, rgba(59, 130, 246, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-lg);
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 440px;
      margin: 1rem auto;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    .lock-icon-badge {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.05));
      border: 1px solid rgba(59, 130, 246, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      color: var(--primary);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
    }
    .lock-icon-badge svg {
      width: 28px;
      height: 28px;
    }
    .lock-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }
    .lock-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      max-width: 320px;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }
    .lock-form {
      display: flex;
      gap: 10px;
      width: 100%;
      max-width: 340px;
    }
    .lock-form input {
      flex: 1;
      text-align: center;
      letter-spacing: 2px;
      font-size: 1rem;
      padding: 0.75rem 1rem;
    }
    .lock-form .btn {
      padding: 0 1.5rem;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .shake {
      animation: shake 0.4s ease-in-out;
      border-color: var(--danger) !important;
    }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); z-index: 100; display: none; align-items: center; justify-content: center; }
    .modal-overlay.show { display: flex; }
    .modal-content { background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 92%; max-width: 720px; padding: 2rem; max-height: 92vh; overflow-y: auto; }
    .modal-footer { display: flex; gap: 12px; margin-top: 2rem; justify-content: flex-end; }

    .toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: var(--bg-panel); color: var(--text-main); border: 1px solid var(--border); padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.3s; z-index: 200; }
    .toast.show { opacity: 1; }
    .toast.success svg { color: var(--success); }
    .cmd-group { display: flex; gap: 8px; margin-top: 8px; align-items: center; width: 100%; }
    .cmd-group input { flex: 1; }
    .cmd-group .btn { flex-shrink: 0; }

    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 640px) {
      .result-item { flex-direction: column; align-items: stretch; gap: 8px; padding: 1rem; }
      .result-icon-box { display: none; }
      .result-actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
      .result-actions .btn-icon { height: 38px; display: flex; justify-content: center; align-items: center; }
      .lock-form { flex-direction: column; }
      .lock-form .btn { width: 100%; }
    }
  </style>
</head>
<body>

  <header class="header">
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
      SubConverter Pro
    </div>
    <span class="badge">v3.5.0</span>
  </header>

  <div class="container">
    <!-- 1. 資料來源設定 (公開使用) -->
    <main class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          資料來源與規則設定
        </h2>
      </div>
      
      <div class="form-group">
        <label for="urlInput">節點連結或訂閱地址 (支援多筆換行，含 WireGuard/WARP/AnyTLS)</label>
        <textarea id="urlInput" placeholder="vmess://...\nvless://...\nwireguard://...\nhysteria2://...\nhttps://example.com/sub"></textarea>
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
        <input type="text" id="shortCode" placeholder="例如: my-sub-vip">
      </div>
      
      <button class="btn btn-primary" id="generateBtn" onclick="generate()" style="margin-top: 1.5rem;">
        <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>執行全客戶端轉換</span>
      </button>
    </main>

    <!-- 2. 轉換結果面板 (公開使用) -->
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
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">自適應 (Auto)</div><div class="result-desc">自動識別客戶端協議</div></div>
          <div class="result-input-wrapper"><input type="text" id="adaptiveUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('adaptiveUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('adaptiveUrl', 'auto')" title="顯示專屬 QR Code / 一鍵喚醒"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Sing-Box -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Sing-Box</div><div class="result-desc">JSON 配置 · 支援掃碼自動填入</div></div>
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
          <div class="result-info"><div class="result-name">Clash Meta (Mihomo)</div><div class="result-desc">YAML 配置 · 含低倍率/專線分組</div></div>
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
          <div class="result-info"><div class="result-name">Surge 5</div><div class="result-desc">標準 Surge .conf 格式</div></div>
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
      </div>
    </section>

    <!-- 3. Argo 隧道 2.0 生成器 (公開使用) -->
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
          <label>2. Cloudflare 優選 IP / 優選官方域名 (方案 D1：可填寫如 104.16.80.1 或 hk.cf.090227.xyz，選填)</label>
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

    <!-- Argo 結果區 (公開使用) -->
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

    <!-- 4. 已儲存的配置 (受密碼保護區域) -->
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
  </div>

  <!-- 新增/編輯配置對話框 -->
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

  <script>
    var favs = [];
    var isFavLocked = false;

    // 使用 sessionStorage：關閉分頁或瀏覽器後全自動鎖定
    function getStoredPwd() {
      return sessionStorage.getItem('sub_fav_pwd') || '';
    }

    function loadFavs() {
      var pwd = getStoredPwd();
      fetch('/favs', {
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.status === 401) {
          isFavLocked = true;
          renderLockScreen();
          return;
        }
        if (resp.ok) {
          resp.json().then(function(data) {
            favs = data;
            isFavLocked = false;
            renderFavs();
          });
        } else {
          renderErrorScreen('載入配置失敗');
        }
      }).catch(function(e) {
        renderErrorScreen('網路連線失敗');
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
        '<div class="lock-title">私密配置已鎖定</div>' +
        '<div class="lock-desc">此區域受管理密碼保護，請輸入密碼以檢視、新增或編輯私密訂閱與節點</div>' +
        '<div class="lock-form">' +
          '<input type="password" id="lockPwdInput" placeholder="請輸入密碼..." onkeydown="if(event.key===\\'Enter\\') unlockFavs()">' +
          '<button class="btn btn-primary" onclick="unlockFavs()">解鎖</button>' +
        '</div>' +
      '</div>';
    }

    function renderErrorScreen(msg) {
      document.getElementById('favHeaderActions').innerHTML = '';
      document.getElementById('favGrid').innerHTML = '<div class="empty-state">' + msg + '</div>';
    }

    function unlockFavs() {
      var input = document.getElementById('lockPwdInput');
      var pwd = input ? input.value.trim() : '';
      if (!pwd) {
        triggerShake();
        return showToast('請輸入管理密碼', false);
      }

      sessionStorage.setItem('sub_fav_pwd', pwd);
      showToast('正在驗證密碼...');
      
      fetch('/favs', {
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.ok) {
          resp.json().then(function(data) {
            favs = data;
            isFavLocked = false;
            renderFavs();
            showToast('🔓 解鎖成功！已載入私密配置');
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
      sessionStorage.removeItem('sub_fav_pwd');
      isFavLocked = true;
      renderLockScreen();
      showToast('🔒 已鎖定配置清單');
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
        var includeBadge = f.include ? '<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.2); margin-right: 4px;">保: ' + f.include + '</span>' : '';
        var excludeBadge = f.exclude ? '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2); margin-right: 4px;">排: ' + f.exclude + '</span>' : '';
        var renameBadge = f.rename ? '<span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); border-color: rgba(59, 130, 246, 0.2)">替: ' + f.rename + '</span>' : '';

        html += '<div class="fav-card" onclick="useFav(' + i + ')">' +
          '<div class="fav-title">' +
            '<svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' +
            f.name +
          '</div>' +
          '<div class="fav-url">' + f.url + '</div>' +
          '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">' +
            includeBadge + excludeBadge + renameBadge +
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
      document.getElementById('shortCode').value = (f.name || '').replace(/\\s+/g, '-').toLowerCase();
      document.getElementById('includeKeywords').value = f.include || '';
      document.getElementById('excludeKeywords').value = f.exclude || '';
      document.getElementById('renameKeywords').value = f.rename || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('已載入配置：' + f.name);
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
          loadFavs();
          showToast('已成功刪除配置');
        } else {
          showToast('刪除失敗：未授權或密碼錯誤', false);
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
      if (!name || !url) return showToast('請完整填寫名稱與節點內容', false);

      var editIndex = document.getElementById('modal').dataset.edit;
      var pwd = getStoredPwd();
      var reqMethod = (editIndex !== '' && editIndex !== undefined) ? 'PUT' : 'POST';
      var reqBody = {
        name: name,
        url: url,
        include: include,
        exclude: exclude,
        rename: rename
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
          loadFavs();
          showToast('配置儲存成功！');
        } else {
          showToast('儲存失敗：密碼錯誤或未授權', false);
        }
      }).catch(function() {
        showToast('儲存失敗，請重試', false);
      });
    }

    function generate() {
      var raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點連結或訂閱網址', false);

      var host = window.location.origin;
      var shortCode = document.getElementById('shortCode').value.trim();
      var include = document.getElementById('includeKeywords').value.trim();
      var exclude = document.getElementById('excludeKeywords').value.trim();
      var rename = document.getElementById('renameKeywords').value.trim();
      
      var proceed = function(baseUrl) {
        var sep = baseUrl.indexOf('?') !== -1 ? '&' : '?';
        document.getElementById('adaptiveUrl').value = baseUrl;
        document.getElementById('clashUrl').value = baseUrl + sep + 'target=clash';
        document.getElementById('singboxUrl').value = baseUrl + sep + 'target=singbox';
        document.getElementById('surgeUrl').value = baseUrl + sep + 'target=surge';
        document.getElementById('quanxUrl').value = baseUrl + sep + 'target=quanx';
        document.getElementById('loonUrl').value = baseUrl + sep + 'target=loon';
        document.getElementById('base64Url').value = baseUrl + sep + 'target=base64';

        document.getElementById('results').classList.add('show');
        showToast('全客戶端連結生成完畢！');
      };

      if (shortCode) {
        fetch('/save', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ path: shortCode, content: raw, include: include, exclude: exclude, rename: rename }) 
        }).then(function() {
          proceed(host + '/' + shortCode);
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
      if (!rawUrl) return;

      var profileName = document.getElementById('shortCode').value.trim() || 'SubConverter';
      var deepLink = rawUrl;
      var displayTitle = '掃碼導入配置';
      var clientName = '客戶端';

      if (clientType === 'singbox') {
        deepLink = 'sing-box://import-remote-profile?url=' + encodeURIComponent(rawUrl) + '#' + encodeURIComponent(profileName);
        displayTitle = 'Sing-Box 專屬掃碼導入';
        clientName = 'Sing-Box';
      } else if (clientType === 'clash') {
        deepLink = 'clash://install-config?url=' + encodeURIComponent(rawUrl) + '&name=' + encodeURIComponent(profileName);
        displayTitle = 'Clash / Mihomo 專屬導入';
        clientName = 'Clash';
      } else if (clientType === 'surge') {
        deepLink = 'surge:///install-config?url=' + encodeURIComponent(rawUrl);
        displayTitle = 'Surge 5 專屬導入';
        clientName = 'Surge';
      } else if (clientType === 'quanx') {
        deepLink = 'quantumult-x:///add-resource?remote-resource=' + encodeURIComponent(JSON.stringify({ server_remote: [rawUrl + ', tag=' + profileName] }));
        displayTitle = 'Quantumult X 專屬導入';
        clientName = 'Quantumult X';
      } else if (clientType === 'loon') {
        deepLink = 'loon://import?type=config&url=' + encodeURIComponent(rawUrl);
        displayTitle = 'Loon 專屬導入';
        clientName = 'Loon';
      } else if (clientType === 'shadowrocket') {
        deepLink = 'shadowrocket://add/sub://' + btoa(rawUrl) + '?title=' + encodeURIComponent(profileName);
        displayTitle = 'Shadowrocket 專屬導入';
        clientName = 'Shadowrocket';
      }

      var win = window.open('', '_blank', 'width=440,height=560');
      if (!win) return showToast('請允許瀏覽器開啟彈出視窗', false);

      var qrHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + displayTitle + '</title>' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<style>' +
          'body { margin:0; background:#0f172a; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,sans-serif; color:#f8fafc; padding:20px; box-sizing:border-box; text-align:center;}' +
          '.qr-container { padding:20px; background:#ffffff; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:inline-block; }' +
          '.title { margin-top:20px; font-size:18px; font-weight:700; color:#38bdf8; letter-spacing:0.5px; }' +
          '.subtitle { margin-top:6px; font-size:12px; color:#94a3b8; max-width:320px; word-break:break-all; font-family:monospace; line-height:1.4; }' +
          '.btn-open { margin-top:20px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 28px; background:#3b82f6; color:#fff; text-decoration:none; border-radius:10px; font-weight:600; font-size:15px; box-shadow:0 4px 14px rgba(59,130,246,0.4); transition:transform 0.2s;}' +
          '.btn-open:hover { transform:translateY(-1px); background:#2563eb; }' +
          '.hint-box { margin-top:14px; font-size:12px; color:#10b981; background:rgba(16,185,129,0.1); padding:8px 14px; border-radius:8px; border:1px solid rgba(16,185,129,0.2); max-width:320px; }' +
        '</style>' +
        '</head><body>' +
        '<div class="qr-container"><div id="qr"></div></div>' +
        '<div class="title">' + displayTitle + '</div>' +
        '<div class="subtitle">' + rawUrl + '</div>' +
        '<a class="btn-open" href="' + deepLink + '">🚀 一鍵打開並導入 ' + clientName + '</a>' +
        '<div class="hint-box">✨ 手機相機或 ' + clientName + ' App 掃描此二維碼，即可全自動填入名稱與網址！</div>' +
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><' + '/script>' +
        '<script>' +
          'setTimeout(function() {' +
            'new QRCode(document.getElementById("qr"), {' +
              'text: "' + deepLink.replace(/"/g, '\\\\"') + '",' +
              'width: 240,' +
              'height: 240,' +
              'colorDark: "#0f172a",' +
              'colorLight: "#ffffff",' +
              'correctLevel: QRCode.CorrectLevel.L' +
            '});' +
          '}, 100);' +
        '<' + '/script>' +
        '</body></html>';

      win.document.write(qrHtml);
    }

    function parseVlessNodes() {
      var raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點內容', false);
      fetch('/api/parse-argo', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ url: raw }) 
      }).then(function(resp) {
        return resp.json();
      }).then(function(nodes) {
        if (!nodes || nodes.length === 0) return showToast('未找到 VLESS/VMess 節點', false);
        var listEl = document.getElementById('vlessCheckboxList');
        var html = '';
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          html += '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 0;">' +
            '<input type="checkbox" class="vless-chk" value="' + n.index + '" data-port="' + n.port + '">' +
            '<span>' + n.name + ' (' + n.server + ':' + n.port + ')</span>' +
          '</label>';
        }
        listEl.innerHTML = html;
        document.getElementById('vlessSelectorWrapper').style.display = 'block';
      });
    }

    function generateArgo() {
      var raw = document.getElementById('urlInput').value.trim();
      var checkboxes = document.querySelectorAll('.vless-chk:checked');
      if (checkboxes.length === 0) return showToast('請至少選擇一個節點', false);

      var indices = [];
      for (var i = 0; i < checkboxes.length; i++) {
        indices.push(parseInt(checkboxes[i].value, 10));
      }
      var port = document.getElementById('argoLocalPort').value.trim() || '8080';
      var cleanIp = document.getElementById('argoCleanIp').value.trim();
      var token = document.getElementById('argoTunnelToken').value.trim();
      var domain = document.getElementById('argoCustomDomain').value.trim();

      fetch('/api/argo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw, indices: indices, port: port, cleanIp: cleanIp, token: token, domain: domain })
      }).then(function(resp) {
        return resp.json();
      }).then(function(res) {
        var host = window.location.origin;
        if (res.scriptId) {
          document.getElementById('argoCurlCmd').value = 'curl -sSL ' + host + '/argo/sh/' + res.scriptId + ' | bash';
        }
        var links = res.argoNodes.map(function(x) { return x.link; }).join('\\n');
        document.getElementById('argoBase64Sub').value = links;
        document.getElementById('argoResults').classList.add('show');
        showToast('Argo 部署指令與節點已生成！');
      });
    }

    function copyResult(id) {
      var el = document.getElementById(id);
      navigator.clipboard.writeText(el.value).then(function() { showToast('已複製連結'); });
    }
    function copyText(id) {
      var el = document.getElementById(id);
      navigator.clipboard.writeText(el.value).then(function() { showToast('已成功複製到剪貼簿！'); });
    }
    function showToast(msg, isSuccess) {
      if (isSuccess === undefined) isSuccess = true;
      var t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      t.className = 'toast show' + (isSuccess ? ' success' : '');
      setTimeout(function() { t.classList.remove('show'); }, 3000);
    }
    function openModal() { 
      document.getElementById('modalTitle').textContent = '新增配置';
      document.getElementById('favName').value = '';
      document.getElementById('favUrl').value = '';
      document.getElementById('favInclude').value = '';
      document.getElementById('favExclude').value = '';
      document.getElementById('favRename').value = '';
      delete document.getElementById('modal').dataset.edit;
      document.getElementById('modal').classList.add('show'); 
    }
    function closeModal() { document.getElementById('modal').classList.remove('show'); }
    
    loadFavs();
  </script>
</body>
</html>
`;
