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

// --- 前端頁面 HTML ---
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>訂閱轉換器</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --accent: #38bdf8; --accent-hover: #0ea5e9; --border: #334155; --success: #22c55e; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { background: var(--card); padding: 2rem; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); width: 100%; max-width: 520px; border: 1px solid var(--border); }
    h1 { margin-top: 0; text-align: center; font-size: 1.6rem; margin-bottom: 0.5rem; color: #fff; letter-spacing: 0.5px; }
    .subtitle { text-align: center; color: #94a3b8; font-size: 0.9rem; margin-bottom: 2rem; }
    
    label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cbd5e1; font-weight: 500; }
    input, select, textarea { width: 100%; background: #0f172a; border: 1px solid var(--border); color: #fff; padding: 0.85rem; border-radius: 8px; margin-bottom: 1.5rem; box-sizing: border-box; font-size: 1rem; outline: none; transition: all 0.2s; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
    
    button { width: 100%; background: var(--accent); color: #0f172a; border: none; padding: 0.85rem; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    button:hover { background: var(--accent-hover); transform: translateY(-1px); }
    
    .result-group { margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem; display: none; animation: fadeIn 0.3s ease; }
    .result-group.show { display: block; }
    .copy-btn { background: var(--success); color: white; margin-top: 0.5rem; }
    .copy-btn:hover { background: #16a34a; }
    
    .rules-box { background: #0f172a; border-radius: 8px; padding: 1rem; margin-top: 2rem; border: 1px solid var(--border); }
    .rules-box h3 { margin: 0 0 0.8rem 0; font-size: 1rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .rules-list { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; }
    .rules-list li { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px dashed #334155; }
    .rules-list li:last-child { border-bottom: none; }
    .rule-name { color: #e2e8f0; font-weight: 500; }
    .rule-source { color: #64748b; }

    .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px); background: var(--success); color: white; padding: 10px 20px; border-radius: 50px; opacity: 0; transition: all 0.3s; pointer-events: none; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: 600; }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 訂閱轉換器</h1>
    <div class="subtitle">SingBox • Clash • Base64</div>
    
    <label>訂閱連結 (Subscription URL)</label>
    <textarea id="url" rows="3" placeholder="請貼上機場訂閱連結 (vless/vmess/hy2...)"></textarea>

    <label>轉換目標 (Target Client)</label>
    <select id="target">
      <option value="singbox">Sing-Box (含分流規則)</option>
      <option value="clash">Clash Meta (含分流規則)</option>
      <option value="base64">Base64 (v2rayNG / Shadowrocket)</option>
    </select>

    <button onclick="generate()">⚡ 立即生成配置</button>

    <div class="result-group" id="resultArea">
      <label>轉換後的連結</label>
      <input type="text" id="finalUrl" readonly onclick="this.select()">
      <button class="copy-btn" onclick="copyUrl()">複製連結</button>
    </div>

    <div class="rules-box">
      <h3>📜 目前生效的分流規則 (Base64 除外)</h3>
      <ul class="rules-list">
        <li><span class="rule-name">💬 AI 服務</span><span class="rule-source">Sammy Custom</span></li>
        <li><span class="rule-name">🌐 非中國</span><span class="rule-source">MetaCubeX</span></li>
        <li><span class="rule-name">🛑 廣告攔截</span><span class="rule-source">MetaCubeX</span></li>
        <li><span class="rule-name">🔒 國內服務</span><span class="rule-source">MetaCubeX</span></li>
        <li><span class="rule-name">🏠 私人網路</span><span class="rule-source">MetaCubeX</span></li>
      </ul>
    </div>
  </div>

  <div id="toast" class="toast">✅ 複製成功！</div>

  <script>
    function generate() {
      const url = document.getElementById('url').value.trim();
      const target = document.getElementById('target').value;
      if (!url) { alert('請先輸入訂閱連結！'); return; }

      const host = window.location.origin;
      const final = \`\${host}/?url=\${encodeURIComponent(url)}&target=\${target}\`;

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

async function parseSubscription(content: string): Promise<ProxyNode[]> {
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

// --- 生成器: Base64 (還原為連結列表) ---
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
        if (node.reality) {
          params.set('pbk', node.reality.publicKey);
          params.set('sid', node.reality.shortId);
        }
        if (node.network === 'ws') {
          if (node.wsPath) params.set('path', node.wsPath);
          if (node.wsHeaders?.Host) params.set('host', node.wsHeaders.Host);
        }
        return `vless://${node.uuid}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }

      if (node.type === 'hysteria2') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.obfs) {
          params.set('obfs', node.obfs);
          if (node.obfsPassword) params.set('obfs-password', node.obfsPassword);
        }
        if (node.skipCertVerify) params.set('insecure', '1');
        return `hysteria2://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }

      if (node.type === 'vmess') {
        const vmessObj = {
          v: "2", ps: node.name, add: node.server, port: node.port, id: node.uuid,
          aid: 0, scy: "auto", net: node.network, type: "none",
          host: node.wsHeaders?.Host || "", path: node.wsPath || "",
          tls: node.tls ? "tls" : "", sni: node.sni || ""
        };
        return 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
      }
    } catch (e) { return null; }
    return null;
  }).filter(link => link !== null);

  return utf8ToBase64(links.join('\n'));
}

// --- 生成器: SingBox (SRS) ---
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
    inbounds: [{ type: "tun", interface_name: "tun0", stack: "system", auto_route: true, strict_route: true }],
    outbounds: [...groups, ...proxies],
    route: { rule_set: ruleSets, rules: [...rules, { outbound: "🐟 漏網之魚" }], auto_detect_interface: true }
  }, null, 2);
}

// --- 生成器: Clash Meta (List) ---
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
    const subUrl = url.searchParams.get('url');
    if (!subUrl) return new Response(HTML_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

    const target = url.searchParams.get('target') || 'singbox';
    
    try {
      const headers = { 'User-Agent': 'v2rayng/1.8.5' };
      const resp = await fetch(subUrl, { headers });
      if (!resp.ok) return new Response('無法獲取訂閱內容', { status: 500 });
      const content = await resp.text();
      const nodes = await parseSubscription(content);

      if (nodes.length === 0) return new Response('未解析到任何有效節點', { status: 400 });

      let result = '';
      let contentType = 'text/plain; charset=utf-8';

      if (target === 'clash') {
        result = toClash(nodes);
        contentType = 'text/yaml; charset=utf-8';
      } else if (target === 'base64') {
        result = toBase64(nodes);
        contentType = 'text/plain; charset=utf-8';
      } else {
        result = toSingBox(nodes);
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
