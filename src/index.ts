import yaml from 'js-yaml';

// --- 環境變數介面 ---
interface Env {
  SUB_CACHE: KVNamespace;
}

// --- 類型定義 ---
interface ProxyNode {
  type: string;
  name: string;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  udp?: boolean;
  tls?: boolean;
  sni?: string;
  alpn?: string[];
  fingerprint?: string;
  flow?: string;
  network?: string;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  reality?: { publicKey: string; shortId: string };
  obfs?: string;
  obfsPassword?: string;
  skipCertVerify?: boolean;
}

// --- 前端頁面 HTML (寬版 Dashboard) ---
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>訂閱轉換器</title>
  <style>
    :root { 
      --bg: #0f172a; 
      --card-bg: #1e293b; 
      --input-bg: #020617;
      --text-main: #f8fafc;
      --text-sub: #94a3b8;
      --accent: #38bdf8; 
      --accent-hover: #0ea5e9; 
      --border: #334155; 
      --success: #22c55e;
      --card-hover: #2d3a52;
    }
    
    * { box-sizing: border-box; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
      background: var(--bg); 
      color: var(--text-main); 
      margin: 0; 
      padding: 40px 20px; 
      display: flex; 
      justify-content: center; 
      min-height: 100vh; 
    }

    .container { 
      background: var(--card-bg); 
      padding: 2.5rem; 
      border-radius: 20px; 
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); 
      width: 100%; 
      max-width: 1000px; 
      border: 1px solid var(--border); 
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .header { text-align: center; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    .header h1 { margin: 0; font-size: 2rem; font-weight: 800; background: linear-gradient(90deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: var(--text-sub); margin-top: 0.5rem; font-size: 1rem; }

    .main-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
    
    label { display: block; margin-bottom: 0.8rem; font-size: 0.95rem; color: var(--accent); font-weight: 600; letter-spacing: 0.5px; }
    
    textarea { 
      width: 100%; 
      background: var(--input-bg); 
      border: 1px solid var(--border); 
      color: var(--text-main); 
      padding: 1.2rem; 
      border-radius: 12px; 
      font-family: monospace;
      font-size: 0.95rem; 
      outline: none; 
      transition: all 0.2s; 
      resize: vertical;
      min-height: 250px; 
      line-height: 1.6;
    }
    textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1); }
    textarea::placeholder { color: #475569; }

    .controls { display: grid; grid-template-columns: 1fr 200px; gap: 1.5rem; align-items: end; }
    
    select { 
      width: 100%; 
      background: var(--input-bg); 
      border: 1px solid var(--border); 
      color: var(--text-main); 
      padding: 1rem; 
      border-radius: 10px; 
      font-size: 1rem; 
      outline: none; 
      cursor: pointer;
    }
    
    button { 
      width: 100%; 
      background: var(--accent); 
      color: #0f172a; 
      border: none; 
      padding: 1rem; 
      border-radius: 10px; 
      font-size: 1rem; 
      font-weight: 700; 
      cursor: pointer; 
      transition: all 0.2s; 
      height: 52px;
    }
    button:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3); }

    .result-group { margin-top: 1rem; display: none; animation: slideDown 0.4s ease; background: #0f172a; padding: 1.5rem; border-radius: 12px; border: 1px dashed var(--border); }
    .result-group.show { display: block; }
    .result-row { display: flex; gap: 1rem; }
    .result-row input { flex: 1; background: #1e293b; border: none; color: #fff; padding: 0.8rem; border-radius: 6px; font-family: monospace; }
    .copy-btn { width: auto; background: var(--success); height: auto; padding: 0 2rem; }
    .copy-btn:hover { background: #16a34a; }

    .rules-section { margin-top: 1rem; }
    .rules-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
      gap: 1rem; 
      margin-top: 1rem;
    }
    
    .rule-card {
      background: #253045;
      padding: 1rem 1.2rem;
      border-radius: 10px;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .rule-card:hover { border-color: var(--border); background: var(--card-hover); transform: translateY(-2px); }
    
    .rule-icon { font-size: 1.5rem; margin-bottom: 0.5rem; display: block; }
    .rule-name { display: block; font-weight: 600; color: #e2e8f0; margin-bottom: 0.2rem; }
    .rule-desc { font-size: 0.8rem; color: #94a3b8; }

    .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: var(--success); color: white; padding: 12px 24px; border-radius: 50px; opacity: 0; transition: all 0.3s; pointer-events: none; box-shadow: 0 10px 15px rgba(0,0,0,0.3); font-weight: 600; z-index: 100; }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 768px) { .controls { grid-template-columns: 1fr; } .container { padding: 1.5rem; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 訂閱轉換中心</h1>
      <p>支援 SingBox / Clash / Base64 • 智能合併多訂閱</p>
    </div>

    <div class="main-grid">
      <div>
        <label>📥 訂閱連結或節點 (一行一個)</label>
        <textarea id="url" placeholder="在此貼上：
1. 機場訂閱連結 (https://...)
2. 自建節點連結 (vless://..., hysteria2://...)
3. Base64 內容

系統會自動合併所有連結並生成統一的配置文件。"></textarea>
      </div>

      <div class="controls">
        <div>
          <label>🛠 轉換目標 (Target)</label>
          <select id="target">
            <option value="singbox">Sing-Box (含分流規則)</option>
            <option value="clash">Clash Meta (含分流規則)</option>
            <option value="base64">Base64 (純節點列表)</option>
          </select>
        </div>
        <button onclick="generate()">⚡ 立即生成</button>
      </div>
    </div>

    <div class="result-group" id="resultArea">
      <label>🎉 您的專屬訂閱連結</label>
      <div class="result-row">
        <input type="text" id="finalUrl" readonly onclick="this.select()">
        <button class="copy-btn" onclick="copyUrl()">複製</button>
      </div>
    </div>

    <div class="rules-section">
      <label>🛡️ 內建智能分流規則</label>
      <div class="rules-grid">
        <div class="rule-card">
          <span class="rule-icon">💬</span>
          <span class="rule-name">AI 服務優化</span>
          <span class="rule-desc">ChatGPT, Gemini, Claude</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🌐</span>
          <span class="rule-name">非中國流量</span>
          <span class="rule-desc">Google, Telegram, Netflix</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🛑</span>
          <span class="rule-name">廣告攔截</span>
          <span class="rule-desc">過濾常見廣告與追蹤器</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🔒</span>
          <span class="rule-name">國內直連</span>
          <span class="rule-desc">中國大陸服務不走代理</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🏠</span>
          <span class="rule-name">私人網路</span>
          <span class="rule-desc">區域網路直連</span>
        </div>
        <div class="rule-card">
          <span class="rule-icon">🐟</span>
          <span class="rule-name">漏網之魚</span>
          <span class="rule-desc">其他未匹配流量</span>
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">✅ 複製成功！</div>

  <script>
    function generate() {
      const rawInput = document.getElementById('url').value;
      const target = document.getElementById('target').value;
      
      const urls = rawInput.split(/\\n/)
        .map(u => u.trim())
        .filter(u => u.length > 0)
        .join('|'); 

      if (!urls) { alert('請至少輸入一個連結！'); return; }

      const host = window.location.origin;
      const final = \`\${host}/?url=\${encodeURIComponent(urls)}&target=\${target}\`;

      document.getElementById('finalUrl').value = final;
      document.getElementById('resultArea').classList.add('show');
    }

    function copyUrl() {
      const copyText = document.getElementById("finalUrl");
      copyText.select();
      copyText.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(copyText.value).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      });
    }
  </script>
</body>
</html>
`;

// --- 輔助函數 ---
function safeBase64Decode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  try { return atob(str); } catch { return ""; }
}

function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// --- 解析器 (Parser) ---
function parseVless(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    const node: ProxyNode = {
      type: 'vless',
      name: decodeURIComponent(url.hash.slice(1)) || 'VLESS',
      server: url.hostname,
      port: parseInt(url.port),
      uuid: url.username,
      tls: params.get('security') === 'tls' || params.get('security') === 'reality',
      flow: params.get('flow') || undefined,
      network: params.get('type') || 'tcp',
      sni: params.get('sni') || params.get('host') || undefined,
      fingerprint: params.get('fp') || 'chrome',
      skipCertVerify: params.get('allowInsecure') === '1',
    };
    if (params.get('security') === 'reality') {
      node.reality = { publicKey: params.get('pbk') || '', shortId: params.get('sid') || '' };
      if (!node.sni) node.sni = node.server;
    }
    if (node.network === 'ws') {
      node.wsPath = params.get('path') || '/';
      node.wsHeaders = { Host: params.get('host') || node.server };
    }
    return node;
  } catch (e) { return null; }
}

function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    return {
      type: 'hysteria2',
      name: decodeURIComponent(url.hash.slice(1)) || 'Hy2',
      server: url.hostname,
      port: parseInt(url.port),
      password: url.username,
      tls: true,
      sni: params.get('sni') || url.hostname,
      skipCertVerify: params.get('insecure') === '1',
      obfs: params.get('obfs') || undefined,
      obfsPassword: params.get('obfs-password') || undefined,
    };
  } catch (e) { return null; }
}

function parseVmess(vmessUrl: string): ProxyNode | null {
  try {
    const b64 = vmessUrl.replace('vmess://', '');
    const jsonStr = safeBase64Decode(b64);
    const config = JSON.parse(jsonStr);
    return {
      type: 'vmess',
      name: config.ps || 'VMess',
      server: config.add,
      port: parseInt(config.port),
      uuid: config.id,
      cipher: 'auto',
      tls: config.tls === 'tls',
      sni: config.sni || config.host,
      network: config.net || 'tcp',
      wsPath: config.path,
      wsHeaders: config.host ? { Host: config.host } : undefined,
      skipCertVerify: true
    };
  } catch (e) { return null; }
}

async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content;
  if (!content.includes('://')) {
    const decoded = safeBase64Decode(content);
    if (decoded) plainText = decoded;
  }
  const lines = plainText.split(/\r?\n/);
  const nodes: ProxyNode[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith('vless://')) { const n = parseVless(l); if (n) nodes.push(n); } 
    else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) { const n = parseHysteria2(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vmess://')) { const n = parseVmess(l); if (n) nodes.push(n); }
  }
  return nodes;
}

// --- 生成器: Base64 ---
function toBase64(nodes: ProxyNode[]) {
  const links = nodes.map(node => {
    try {
      if (node.type === 'vless') {
        const params = new URLSearchParams();
        params.set('security', node.reality ? 'reality' : (node.tls ? 'tls' : 'none'));
        params.set('type', node.network || 'tcp');
        if (node.flow) params.set('flow', node.flow);
        if (node.sni) params.set('sni', node.sni);
        if (node.fingerprint) params.set('fp', node.fingerprint);
        if (node.reality) { params.set('pbk', node.reality.publicKey); params.set('sid', node.reality.shortId); }
        if (node.network === 'ws') { if (node.wsPath) params.set('path', node.wsPath); if (node.wsHeaders?.Host) params.set('host', node.wsHeaders.Host); }
        return `vless://${node.uuid}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'hysteria2') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.obfs) { params.set('obfs', node.obfs); if (node.obfsPassword) params.set('obfs-password', node.obfsPassword); }
        if (node.skipCertVerify) params.set('insecure', '1');
        return `hysteria2://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'vmess') {
        const vmessObj = { v: "2", ps: node.name, add: node.server, port: node.port, id: node.uuid, aid: 0, scy: "auto", net: node.network, type: "none", host: node.wsHeaders?.Host || "", path: node.wsPath || "", tls: node.tls ? "tls" : "", sni: node.sni || "" };
        return 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
      }
    } catch (e) { return null; }
    return null;
  }).filter(link => link !== null);
  return utf8ToBase64(links.join('\n'));
}

// --- 生成器: SingBox (修正版) ---
function toSingBox(nodes: ProxyNode[]) {
  const proxies = nodes.map(node => {
    const base: any = { tag: node.name, type: node.type, server: node.server, server_port: node.port };
    if (node.type === 'vless' || node.type === 'vmess') {
      base.uuid = node.uuid;
      if (node.type === 'vmess') base.security = 'auto';
      if (node.flow) base.flow = node.flow;
      base.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: node.skipCertVerify, utls: { enabled: true, fingerprint: node.fingerprint || 'chrome' } };
      if (node.reality) base.tls.reality = { enabled: true, public_key: node.reality.publicKey, short_id: node.reality.shortId };
      if (node.network === 'ws') base.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    }
    if (node.type === 'hysteria2') {
      base.password = node.password;
      base.tls = { enabled: true, server_name: node.sni, insecure: node.skipCertVerify };
      if (node.obfs) base.obfs = { type: node.obfs, password: node.obfsPassword };
    }
    return base;
  });

  const proxyTags = proxies.map(o => o.tag);
  const groups = [
    { type: "selector", tag: "💬 AI 服務", outbounds: ["🚀 節點選擇", ...proxyTags] },
    { type: "selector", tag: "🌐 非中國", outbounds: ["🚀 節點選擇", ...proxyTags] },
    { type: "selector", tag: "🐟 漏網之魚", outbounds: ["🚀 節點選擇", ...proxyTags] },
    { type: "selector", tag: "🚀 節點選擇", outbounds: ["⚡ 自動選擇", ...proxyTags] },
    { type: "urltest", tag: "⚡ 自動選擇", outbounds: proxyTags },
    { type: "direct", tag: "DIRECT" },
    { type: "block", tag: "REJECT" }
  ];

  const ruleSets = [
    { type: "remote", tag: "rs-ai", format: "binary", url: "https://github.com/sammy0101/myself/raw/refs/heads/main/geosite_ai_hk_proxy.srs", download_detour: "🚀 節點選擇" },
    { type: "remote", tag: "rs-non-cn", format: "binary", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/geolocation-!cn.srs", download_detour: "🚀 節點選擇" },
    { type: "remote", tag: "rs-cn", format: "binary", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/geolocation-cn.srs", download_detour: "🚀 節點選擇" },
    { type: "remote", tag: "rs-ads", format: "binary", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/category-ads-all.srs", download_detour: "🚀 節點選擇" },
    { type: "remote", tag: "rs-private", format: "binary", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geosite/private.srs", download_detour: "🚀 節點選擇" },
    { type: "remote", tag: "ip-cn", format: "binary", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geoip/cn.srs", download_detour: "🚀 節點選擇" },
    { type: "remote", tag: "ip-private", format: "binary", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/sing/geo/geoip/private.srs", download_detour: "🚀 節點選擇" }
  ];

  const rules = [
    { rule_set: "rs-ads", outbound: "REJECT" },
    { rule_set: "rs-private", outbound: "DIRECT" },
    { rule_set: "ip-private", outbound: "DIRECT" },
    { rule_set: "rs-ai", outbound: "💬 AI 服務" },
    { rule_set: "rs-cn", outbound: "DIRECT" },
    { rule_set: "ip-cn", outbound: "DIRECT" },
    { rule_set: "rs-non-cn", outbound: "🌐 非中國" }
  ];

  return JSON.stringify({
    log: { level: "info" },
    dns: {
      servers: [
        { tag: "google", address: "8.8.8.8", detour: "🚀 節點選擇" },
        { tag: "local", address: "223.5.5.5", detour: "DIRECT" }
      ],
      rules: [{ outbound: "any", server: "local" }, { rule_set: "rs-cn", server: "local" }]
    },
    inbounds: [
      {
        type: "tun",
        tag: "tun-in",
        interface_name: "tun0",
        inet4_address: "172.19.0.1/30", // 修正錯誤：給予 /30 網段
        inet6_address: "fd00::1/126",   // 修正錯誤：加入 IPv6
        stack: "system",
        auto_route: true,
        strict_route: true,
        sniff: true
      }
    ],
    outbounds: [...groups, ...proxies],
    route: { rule_set: ruleSets, rules: [...rules, { outbound: "🐟 漏網之魚" }], auto_detect_interface: true }
  }, null, 2);
}

// --- 生成器: Clash Meta ---
function toClash(nodes: ProxyNode[]) {
  const proxyNames = nodes.map(n => n.name);
  const proxies = nodes.map(node => {
    const base: any = { name: node.name, type: node.type, server: node.server, port: node.port };
    if (node.type === 'vless') {
      base.uuid = node.uuid; base.tls = node.tls; base.servername = node.sni || node.server; base['client-fingerprint'] = node.fingerprint || 'chrome'; base['skip-cert-verify'] = node.skipCertVerify;
      if (node.flow) base.flow = node.flow;
      if (node.reality) { base.reality = true; base['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId }; }
      if (node.network === 'ws') { base.network = 'ws'; base['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders }; }
    }
    if (node.type === 'vmess') {
      base.uuid = node.uuid; base.cipher = 'auto'; base.tls = node.tls; base.servername = node.sni; base.network = node.network;
      if(node.network === 'ws') base['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders };
    }
    if (node.type === 'hysteria2') {
      base.password = node.password; base.sni = node.sni; base['skip-cert-verify'] = node.skipCertVerify;
      if(node.obfs) { base.obfs = node.obfs; base['obfs-password'] = node.obfsPassword; }
    }
    return base;
  });

  const groups = [
    { name: "💬 AI 服務", type: "select", proxies: ["🚀 節點選擇", ...proxyNames] },
    { name: "🌐 非中國", type: "select", proxies: ["🚀 節點選擇", ...proxyNames] },
    { name: "🐟 漏網之魚", type: "select", proxies: ["🚀 節點選擇", ...proxyNames] },
    { name: "🔒 國內服務", type: "select", proxies: ["DIRECT", "🚀 節點選擇"] },
    { name: "🛑 廣告攔截", type: "select", proxies: ["REJECT", "DIRECT"] },
    { name: "🚀 節點選擇", type: "select", proxies: ["⚡ 自動選擇", ...proxyNames] },
    { name: "⚡ 自動選擇", type: "url-test", proxies: proxyNames, url: 'http://www.gstatic.com/generate_204', interval: 300 }
  ];

  const ruleProviders = {
    "my-ai": { type: "http", behavior: "classical", path: "./ruleset/my-ai.yaml", url: "https://github.com/sammy0101/myself/raw/refs/heads/main/geosite_ai_hk_proxy.list", interval: 86400 },
    "meta-non-cn": { type: "http", behavior: "domain", path: "./ruleset/non-cn.yaml", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/geolocation-!cn.list", interval: 86400 },
    "meta-cn": { type: "http", behavior: "domain", path: "./ruleset/cn.yaml", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/geolocation-cn.list", interval: 86400 },
    "meta-ip-cn": { type: "http", behavior: "ipcidr", path: "./ruleset/ip-cn.yaml", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/cn.list", interval: 86400 },
    "meta-ads": { type: "http", behavior: "domain", path: "./ruleset/ads.yaml", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-ads-all.list", interval: 86400 },
    "meta-private": { type: "http", behavior: "domain", path: "./ruleset/private.yaml", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/private.list", interval: 86400 },
    "meta-ip-private": { type: "http", behavior: "ipcidr", path: "./ruleset/ip-private.yaml", url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/private.list", interval: 86400 }
  };

  const rules = [
    "RULE-SET,meta-ads,🛑 廣告攔截",
    "RULE-SET,meta-private,DIRECT",
    "RULE-SET,meta-ip-private,DIRECT",
    "RULE-SET,my-ai,💬 AI 服務",
    "RULE-SET,meta-cn,🔒 國內服務",
    "RULE-SET,meta-ip-cn,🔒 國內服務",
    "RULE-SET,meta-non-cn,🌐 非中國",
    "GEOIP,CN,🔒 國內服務",
    "MATCH,🐟 漏網之魚"
  ];

  return yaml.dump({
    'port': 7890, 'socks-port': 7891, 'allow-lan': true, 'mode': 'rule', 'log-level': 'info', 'external-controller': '127.0.0.1:9090',
    'proxies': proxies, 'proxy-groups': groups, 'rule-providers': ruleProviders, 'rules': rules
  });
}

// --- Worker 主要邏輯 ---
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const urlParam = url.searchParams.get('url');
    if (!urlParam) return new Response(HTML_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

    const target = url.searchParams.get('target') || 'singbox';
    
    try {
      const inputs = urlParam.split('|');
      const allNodes: ProxyNode[] = [];

      await Promise.all(inputs.map(async (input) => {
        const trimmed = input.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          try {
            const headers = { 'User-Agent': 'v2rayng/1.8.5' };
            const resp = await fetch(trimmed, { headers });
            if (resp.ok) {
              const text = await resp.text();
              const nodes = await parseContent(text);
              allNodes.push(...nodes);
            }
          } catch (e) { console.error(`Fetch error for ${trimmed}`, e); }
        } else {
          const nodes = await parseContent(trimmed);
          allNodes.push(...nodes);
        }
      }));

      if (allNodes.length === 0) return new Response('未解析到任何有效節點', { status: 400 });

      let result = '';
      let contentType = 'text/plain; charset=utf-8';

      if (target === 'clash') {
        result = toClash(allNodes);
        contentType = 'text/yaml; charset=utf-8';
      } else if (target === 'base64') {
        result = toBase64(allNodes);
        contentType = 'text/plain; charset=utf-8';
      } else {
        result = toSingBox(allNodes);
        contentType = 'application/json; charset=utf-8';
      }

      return new Response(result, {
        headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'BYPASS' },
      });

    } catch (err: any) {
      return new Response(`轉換錯誤: ${err.message}`, { status: 500 });
    }
  },
};
