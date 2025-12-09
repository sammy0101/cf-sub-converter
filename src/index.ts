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

// --- 前端頁面 HTML (包含 CSS 和 JS) ---
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>訂閱轉換器 | Sub Converter</title>
  <style>
    :root { --bg: #111827; --card: #1f2937; --text: #f3f4f6; --accent: #3b82f6; --accent-hover: #2563eb; --border: #374151; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { background: var(--card); padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); width: 100%; max-width: 480px; border: 1px solid var(--border); }
    h1 { margin-top: 0; text-align: center; font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #9ca3af; }
    input, select, textarea { width: 100%; background: #111827; border: 1px solid var(--border); color: #fff; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; box-sizing: border-box; font-size: 1rem; outline: none; transition: border-color 0.2s; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); }
    button { width: 100%; background: var(--accent); color: white; border: none; padding: 0.75rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: var(--accent-hover); }
    .result-group { margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem; display: none; }
    .result-group.show { display: block; }
    .copy-btn { background: #059669; margin-top: 0.5rem; }
    .copy-btn:hover { background: #047857; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .footer { text-align: center; margin-top: 2rem; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 訂閱轉換器</h1>
    
    <label>訂閱連結 (Subscription URL)</label>
    <textarea id="url" rows="3" placeholder="貼上你的機場訂閱連結 (vless/vmess/hy2...)"></textarea>

    <label>轉換目標 (Target Client)</label>
    <select id="target">
      <option value="singbox">Sing-Box (JSON)</option>
      <option value="clash">Clash Meta / Mihomo (YAML)</option>
    </select>

    <label style="display:flex; align-items:center; cursor:pointer;">
      <input type="checkbox" id="renew" style="width:auto; margin:0 8px 0 0;"> 強制刷新緩存 (Renew Cache)
    </label>

    <button onclick="generate()">生成訂閱連結</button>

    <div class="result-group" id="resultArea">
      <label>轉換後的訂閱連結</label>
      <input type="text" id="finalUrl" readonly onclick="this.select()">
      <button class="copy-btn" onclick="copyUrl()">複製連結</button>
    </div>
    
    <div class="footer">Powered by Cloudflare Workers</div>
  </div>
  <div id="toast" class="toast">複製成功！</div>

  <script>
    function generate() {
      const url = document.getElementById('url').value.trim();
      const target = document.getElementById('target').value;
      const renew = document.getElementById('renew').checked;
      
      if (!url) { alert('請先輸入訂閱連結！'); return; }

      const host = window.location.origin;
      let final = \`\${host}/?url=\${encodeURIComponent(url)}&target=\${target}\`;
      if (renew) final += '&renew=true';

      document.getElementById('finalUrl').value = final;
      document.getElementById('resultArea').classList.add('show');
    }

    function copyUrl() {
      const copyText = document.getElementById("finalUrl");
      copyText.select();
      copyText.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(copyText.value).then(() => {
        const toast = document.getElementById('toast');
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', 2000);
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
      node.reality = {
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || '',
      };
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
    if (l.startsWith('vless://')) {
      const n = parseVless(l); if (n) nodes.push(n);
    } else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) {
      const n = parseHysteria2(l); if (n) nodes.push(n);
    } else if (l.startsWith('vmess://')) {
      const n = parseVmess(l); if (n) nodes.push(n);
    }
  }
  return nodes;
}

// --- 生成器 (Generator) ---
function toSingBox(nodes: ProxyNode[]) {
  const outbounds = nodes.map(node => {
    const base: any = { tag: node.name, type: node.type, server: node.server, server_port: node.port };
    if (node.type === 'vless' || node.type === 'vmess') {
      base.uuid = node.uuid;
      if (node.type === 'vmess') base.security = 'auto';
      if (node.flow) base.flow = node.flow;
      base.tls = {
        enabled: node.tls,
        server_name: node.sni || node.server,
        insecure: node.skipCertVerify,
        utls: { enabled: true, fingerprint: node.fingerprint || 'chrome' }
      };
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
  return JSON.stringify({
    log: { level: "info" },
    dns: { servers: [{ tag: "google", address: "8.8.8.8", detour: "PROXY" }, { tag: "local", address: "223.5.5.5", detour: "DIRECT" }], rules: [{ outbound: "any", server: "local" }] },
    inbounds: [{ type: "tun", interface_name: "tun0", stack: "system", auto_route: true, strict_route: true }],
    outbounds: [{ type: "selector", tag: "PROXY", outbounds: ["AUTO", ...outbounds.map(o => o.tag)] }, { type: "urltest", tag: "AUTO", outbounds: outbounds.map(o => o.tag) }, ...outbounds, { type: "direct", tag: "DIRECT" }],
    route: { rules: [{ protocol: "dns", outbound: "dns-out" }, { geosite: "cn", outbound: "DIRECT" }, { geoip: "cn", outbound: "DIRECT" }] }
  }, null, 2);
}

function toClash(nodes: ProxyNode[]) {
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
  return yaml.dump({
    'port': 7890, 'socks-port': 7891, 'allow-lan': true, 'mode': 'rule', 'log-level': 'info', 'external-controller': '127.0.0.1:9090',
    'proxies': proxies,
    'proxy-groups': [{ name: 'PROXY', type: 'select', proxies: ['AUTO', ...proxies.map(p => p.name)] }, { name: 'AUTO', type: 'url-test', proxies: proxies.map(p => p.name), url: 'http://www.gstatic.com/generate_204', interval: 300 }],
    'rules': ['GEOIP,CN,DIRECT', 'MATCH,PROXY']
  });
}

// --- Worker 主要邏輯 ---
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const subUrl = url.searchParams.get('url');
    
    // 如果沒有提供 url 參數，則回傳前端頁面 (HTML)
    if (!subUrl) {
      return new Response(HTML_PAGE, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // 以下為 API 邏輯 (保持不變)
    const target = url.searchParams.get('target') || 'singbox';
    const forceRenew = url.searchParams.get('renew') === 'true';

    // 生成 Cache Key
    const safeKey = btoa(subUrl + target).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
    
    // 檢查 Cache
    if (!forceRenew) {
      const cached = await env.SUB_CACHE.get(safeKey);
      if (cached) {
        return new Response(cached, { headers: { 'Content-Type': target === 'clash' ? 'text/yaml; charset=utf-8' : 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'HIT' } });
      }
    }

    try {
      const headers = { 'User-Agent': 'v2rayng/1.8.5' };
      const resp = await fetch(subUrl, { headers });
      if (!resp.ok) return new Response('無法獲取訂閱內容', { status: 500 });
      const content = await resp.text();
      const nodes = await parseSubscription(content);

      if (nodes.length === 0) return new Response('未解析到節點', { status: 400 });

      const result = target === 'clash' ? toClash(nodes) : toSingBox(nodes);
      const contentType = target === 'clash' ? 'text/yaml; charset=utf-8' : 'application/json; charset=utf-8';

      // 寫入 Cache
      ctx.waitUntil(env.SUB_CACHE.put(safeKey, result, { expirationTtl: 3600 }));

      return new Response(result, { headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'MISS' } });
    } catch (err: any) { return new Response(`轉換錯誤: ${err.message}`, { status: 500 }); }
  },
};
