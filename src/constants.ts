// src/constants.ts
export const REMOTE_CONFIG = {
  singbox: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Sing-Box_Rules.JSON',
  clash: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Clash_Rules.YAML'
};

// 方案 B1 內嵌緊急降級模板 (Sing-Box 1.14+ 規範，experimental.cache_file)
export const FALLBACK_SINGBOX_RULES = JSON.stringify({
  log: { level: "info" },
  dns: {
    servers: [
      { tag: "remote-dns", type: "https", server: "8.8.8.8", detour: "🚀 節點選擇" },
      { tag: "local-dns", type: "udp", server: "223.5.5.5", detour: "direct" },
      { tag: "system-dns", type: "local", detour: "direct" },
      { tag: "fakeip-dns", type: "fakeip", inet4_range: "198.18.0.0/15", inet6_range: "fc00::/18" }
    ],
    rules: [
      { outbound: "any", server: "system-dns" },
      { rule_set: "rs-ads", action: "reject" }
    ],
    final: "remote-dns",
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
    rules: [
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

export const HTML_PAGE = `
<!DOCTYPE html>
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
    textarea, input[type="text"] {
      width: 100%; background-color: var(--bg-input); border: 1px solid var(--border); color: var(--text-main); border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
    }
    textarea { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; min-height: 140px; resize: vertical; }
    textarea:focus, input[type="text"]:focus { border-color: var(--primary); }
    .hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem; display: flex; align-items: flex-start; gap: 6px; }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem; border: none; cursor: pointer; transition: background-color 0.2s; user-select: none;
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
    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; border: 1px dashed var(--border); border-radius: var(--radius-md); }

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

    <!-- ⚡ 轉換結果面板 -->
    <section class="results-wrapper" id="results">
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            多平台訂閱連結
          </h2>
        </div>
        
        <!-- 1. 自適應 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">自適應 (Auto)</div><div class="result-desc">自動識別客戶端協議</div></div>
          <div class="result-input-wrapper"><input type="text" id="adaptiveUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('adaptiveUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('adaptiveUrl')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- 2. Clash Meta -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Clash Meta (Mihomo)</div><div class="result-desc">YAML 配置 · 含低倍率/專線分組</div></div>
          <div class="result-input-wrapper"><input type="text" id="clashUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('clashUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('clashUrl')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- 3. Sing-Box -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Sing-Box</div><div class="result-desc">JSON 配置 · Mixed TUN / 智慧路由</div></div>
          <div class="result-input-wrapper"><input type="text" id="singboxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('singboxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('singboxUrl')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- 4. Surge 5 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">Surge 5</div><div class="result-desc">標準 Surge .conf 格式</div></div>
          <div class="result-input-wrapper"><input type="text" id="surgeUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('surgeUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('surgeUrl')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- 5. Quantumult X -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div class="result-info"><div class="result-name">Quantumult X</div><div class="result-desc">server_remote 遠端節點列表</div></div>
          <div class="result-input-wrapper"><input type="text" id="quanxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('quanxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('quanxUrl')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- 6. Loon -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          </div>
          <div class="result-info"><div class="result-name">Loon</div><div class="result-desc">Loon 代理配置清單</div></div>
          <div class="result-input-wrapper"><input type="text" id="loonUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('loonUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('loonUrl')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- 7. Base64 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">Base64</div><div class="result-desc">通用明文 / v2rayNG / PassWall</div></div>
          <div class="result-input-wrapper"><input type="text" id="base64Url" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('base64Url')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('base64Url')" title="顯示 QR Code"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>
      </div>
    </section>

    <!-- ⚡ Argo 隧道 2.0 生成器 -->
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

    <!-- 配置收藏 -->
    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">已儲存的配置</h2>
        <button class="btn btn-ghost" onclick="openModal()">新增配置</button>
      </div>
      <div id="favGrid" class="fav-grid"></div>
    </section>
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

  <script>
    let favs = [];

    async function loadFavs() {
      try {
        const resp = await fetch('/favs');
        if (resp.ok) favs = await resp.json();
        renderFavs();
      } catch(e) {
        console.error('載入配置失敗:', e);
      }
    }
    
    function renderFavs() {
      const grid = document.getElementById('favGrid');
      if (!favs || favs.length === 0) {
        grid.innerHTML = '<div class="empty-state">目前尚未儲存配置</div>';
        return;
      }
      grid.innerHTML = favs.map((f, i) => {
        const includeBadge = f.include ? \`<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.2); margin-right: 4px;">保: \${f.include}</span>\` : '';
        const excludeBadge = f.exclude ? \`<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2); margin-right: 4px;">排: \${f.exclude}</span>\` : '';
        const renameBadge = f.rename ? \`<span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); border-color: rgba(59, 130, 246, 0.2)">替: \${f.rename}</span>\` : '';

        return \`
        <div class="fav-card" onclick="useFav(\${i})">
          <div class="fav-title">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            \${f.name}
          </div>
          <div class="fav-url">\${f.url}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
            \${includeBadge}
            \${excludeBadge}
            \${renameBadge}
          </div>
          <div class="fav-actions">
            <button class="btn btn-ghost" onclick="event.stopPropagation(); editFav(\${i})">編輯</button>
            <button class="btn btn-ghost btn-danger" onclick="event.stopPropagation(); deleteFav(\${i})">刪除</button>
          </div>
        </div>\`;
      }).join('');
    }

    function useFav(index) {
      if (!favs[index]) return;
      const f = favs[index];
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
      const f = favs[index];
      document.getElementById('modalTitle').textContent = '編輯配置';
      document.getElementById('favName').value = f.name || '';
      document.getElementById('favUrl').value = f.url || '';
      document.getElementById('favInclude').value = f.include || '';
      document.getElementById('favExclude').value = f.exclude || '';
      document.getElementById('favRename').value = f.rename || '';
      document.getElementById('modal').dataset.edit = index;
      document.getElementById('modal').classList.add('show');
    }

    async function deleteFav(index) {
      if (!confirm('確定要刪除這筆配置嗎？')) return;
      try {
        const resp = await fetch('/favs', { 
          method: 'DELETE', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ index }) 
        });
        if (resp.ok) {
          await loadFavs();
          showToast('已成功刪除配置');
        } else {
          showToast('刪除失敗', false);
        }
      } catch(e) {
        showToast('刪除失敗: ' + e.message, false);
      }
    }

    async function saveFav() {
      const name = document.getElementById('favName').value.trim();
      const url = document.getElementById('favUrl').value.trim();
      const include = document.getElementById('favInclude').value.trim();
      const exclude = document.getElementById('favExclude').value.trim();
      const rename = document.getElementById('favRename').value.trim();
      if (!name || !url) return showToast('請完整填寫名稱與節點內容', false);

      const editIndex = document.getElementById('modal').dataset.edit;
      try {
        if (editIndex !== '' && editIndex !== undefined) {
          await fetch('/favs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: parseInt(editIndex, 10), name, url, include, exclude, rename })
          });
        } else {
          await fetch('/favs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url, include, exclude, rename })
          });
        }
        closeModal();
        await loadFavs();
        showToast('配置儲存成功！');
      } catch(e) {
        showToast('儲存失敗，請重試', false);
      }
    }

    async function generate() {
      const raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點連結或訂閱網址', false);

      const host = window.location.origin;
      const shortCode = document.getElementById('shortCode').value.trim();
      const include = document.getElementById('includeKeywords').value.trim();
      const exclude = document.getElementById('excludeKeywords').value.trim();
      const rename = document.getElementById('renameKeywords').value.trim();
      
      let baseUrl = '';
      if (shortCode) {
        await fetch('/save', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ path: shortCode, content: raw, include, exclude, rename }) 
        });
        baseUrl = host + '/' + shortCode;
      } else {
        baseUrl = host + '/?url=' + encodeURIComponent(raw);
        if (include) baseUrl += '&include=' + encodeURIComponent(include);
        if (exclude) baseUrl += '&exclude=' + encodeURIComponent(exclude);
        if (rename) baseUrl += '&rename=' + encodeURIComponent(rename);
      }

      const sep = baseUrl.includes('?') ? '&' : '?';
      document.getElementById('adaptiveUrl').value = baseUrl;
      document.getElementById('clashUrl').value = baseUrl + sep + 'target=clash';
      document.getElementById('singboxUrl').value = baseUrl + sep + 'target=singbox';
      document.getElementById('surgeUrl').value = baseUrl + sep + 'target=surge';
      document.getElementById('quanxUrl').value = baseUrl + sep + 'target=quanx';
      document.getElementById('loonUrl').value = baseUrl + sep + 'target=loon';
      document.getElementById('base64Url').value = baseUrl + sep + 'target=base64';

      document.getElementById('results').classList.add('show');
      showToast('全客戶端連結生成完畢！');
    }

    function showQr(id) {
      const url = document.getElementById(id).value;
      if (!url) return;
      const win = window.open('', '_blank', 'width=420,height=480');
      if (!win) return showToast('請允許瀏覽器開啟彈出視窗', false);
      win.document.write(\`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>掃碼訂閱</title>
        <style>
          body { margin:0; background:#0f172a; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
          .qr-container { padding:24px; background:#ffffff; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.5); }
          .title { margin-top:24px; font-size:16px; color:#f8fafc; font-weight:600; letter-spacing:0.5px; }
          .subtitle { margin-top:8px; font-size:13px; color:#94a3b8; text-align:center; max-width:280px; word-break:break-all;}
        </style>
        </head><body>
        <div class="qr-container"><div id="qr"></div></div>
        <div class="title">使用客戶端掃描行動條碼</div>
        <div class="subtitle\">\${url}</div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\\/script>
        <script>
          setTimeout(() => {
            new QRCode(document.getElementById('qr'), { text: "\${url}", width: 260, height: 260, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
          }, 100);
        <\\/script>
        </body></html>
      \`);
    }

    async function parseVlessNodes() {
      const raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點內容', false);
      const resp = await fetch('/api/parse-argo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: raw }) });
      const nodes = await resp.json();
      if (!nodes || nodes.length === 0) return showToast('未找到 VLESS/VMess 節點', false);

      const listEl = document.getElementById('vlessCheckboxList');
      listEl.innerHTML = nodes.map(n => \`
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 0;">
          <input type="checkbox" class="vless-chk" value="\${n.index}" data-port="\${n.port}">
          <span>\${n.name} (\${n.server}:\${n.port})</span>
        </label>
      \`).join('');
      document.getElementById('vlessSelectorWrapper').style.display = 'block';
    }

    async function generateArgo() {
      const raw = document.getElementById('urlInput').value.trim();
      const checkboxes = document.querySelectorAll('.vless-chk:checked');
      if (checkboxes.length === 0) return showToast('請至少選擇一個節點', false);

      const indices = Array.from(checkboxes).map(cb => parseInt(cb.value));
      const port = document.getElementById('argoLocalPort').value.trim() || '8080';
      const cleanIp = document.getElementById('argoCleanIp').value.trim();
      const token = document.getElementById('argoTunnelToken').value.trim();
      const domain = document.getElementById('argoCustomDomain').value.trim();

      const resp = await fetch('/api/argo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw, indices, port, cleanIp, token, domain })
      });
      const res = await resp.json();
      const host = window.location.origin;

      if (res.scriptId) {
        document.getElementById('argoCurlCmd').value = \`curl -sSL \${host}/argo/sh/\${res.scriptId} | bash\`;
      }
      document.getElementById('argoBase64Sub').value = res.argoNodes.map(x => x.link).join('\\n');
      document.getElementById('argoResults').classList.add('show');
      showToast('Argo 部署指令與節點已生成！');
    }

    function copyResult(id) {
      const el = document.getElementById(id);
      navigator.clipboard.writeText(el.value).then(() => showToast('已複製連結'));
    }
    function copyText(id) {
      const el = document.getElementById(id);
      navigator.clipboard.writeText(el.value).then(() => showToast('已成功複製到剪貼簿！'));
    }
    function showToast(msg, isSuccess = true) {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      t.className = 'toast show' + (isSuccess ? ' success' : '');
      setTimeout(() => t.classList.remove('show'), 3000);
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