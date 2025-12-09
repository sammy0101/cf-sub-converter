import yaml from 'js-yaml';

// --- 環境變數介面 ---
interface Env {
  SUB_CACHE: KVNamespace;
}

// --- 外部配置連結 (請確保 GitHub 上檔案已更新) ---
const REMOTE_CONFIG = {
  singbox: 'https://github.com/sammy0101/myself/raw/refs/heads/main/Sing-Box_Rules.JSON',
  clash: 'https://github.com/sammy0101/myself/raw/refs/heads/main/Clash_Rules.YAML'
};

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
  singboxObj?: any; 
  clashObj?: any;
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
    :root { 
      --bg: #0f172a; --card-bg: #1e293b; --input-bg: #020617;
      --text-main: #f8fafc; --text-sub: #94a3b8;
      --accent: #38bdf8; --accent-hover: #0ea5e9; --border: #334155; --success: #22c55e;
      --card-hover: #2d3a52;
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text-main); margin: 0; padding: 40px 20px; display: flex; justify-content: center; min-height: 100vh; }
    .container { background: var(--card-bg); padding: 2.5rem; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); width: 100%; max-width: 1000px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 2rem; }
    .header { text-align: center; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    .header h1 { margin: 0; font-size: 2rem; font-weight: 800; background: linear-gradient(90deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: var(--text-sub); margin-top: 0.5rem; font-size: 1rem; }
    .main-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
    label { display: block; margin-bottom: 0.8rem; font-size: 0.95rem; color: var(--accent); font-weight: 600; }
    textarea { width: 100%; background: var(--input-bg); border: 1px solid var(--border); color: var(--text-main); padding: 1.2rem; border-radius: 12px; font-family: monospace; font-size: 0.95rem; outline: none; transition: all 0.2s; resize: vertical; min-height: 200px; line-height: 1.6; }
    textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1); }
    .controls { display: grid; grid-template-columns: 1fr 200px; gap: 1.5rem; align-items: end; }
    select, button { width: 100%; border-radius: 10px; font-size: 1rem; height: 52px; }
    select { background: var(--input-bg); border: 1px solid var(--border); color: var(--text-main); padding: 1rem; outline: none; }
    button { background: var(--accent); color: #0f172a; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    button:hover { background: var(--accent-hover); transform: translateY(-2px); }
    .result-group { margin-top: 1rem; display: none; background: #0f172a; padding: 1.5rem; border-radius: 12px; border: 1px dashed var(--border); }
    .result-group.show { display: block; }
    .result-row { display: flex; gap: 1rem; }
    .result-row input { flex: 1; background: #1e293b; border: none; color: #fff; padding: 0.8rem; border-radius: 6px; font-family: monospace; }
    .copy-btn { width: auto; background: var(--success); height: auto; padding: 0 2rem; }
    
    .rules-section { margin-top: 1rem; }
    .rules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .rule-card { background: #253045; padding: 1rem 1.2rem; border-radius: 10px; border: 1px solid transparent; transition: all 0.2s; }
    .rule-card:hover { border-color: var(--border); background: var(--card-hover); transform: translateY(-2px); }
    .rule-name { display: block; font-weight: 600; color: #e2e8f0; margin-bottom: 0.2rem; }
    .rule-desc { font-size: 0.8rem; color: #94a3b8; }

    .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: var(--success); color: white; padding: 12px 24px; border-radius: 50px; opacity: 0; transition: 0.3s; pointer-events: none; font-weight: 600; }
    .toast.show { opacity: 1; }
    @media (max-width: 768px) { .controls { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 訂閱轉換中心</h1>
      <p>客製化遠端規則 • 智能合併多訂閱</p>
    </div>

    <div class="main-grid">
      <div>
        <label>📥 訂閱連結或節點 (一行一個)</label>
        <textarea id="url" placeholder="在此貼上機場訂閱連結或節點..."></textarea>
      </div>

      <div class="controls">
        <div>
          <label>🛠 轉換目標</label>
          <select id="target">
            <option value="singbox">Sing-Box (JSON 模板)</option>
            <option value="clash">Clash Meta (YAML 模板)</option>
            <option value="base64">Base64 (純節點)</option>
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
      <label>🛡️ 內建分流群組 (排序由上至下)</label>
      <div class="rules-grid">
        <div class="rule-card"><span class="rule-name">🚀 節點選擇</span><span class="rule-desc">手動切換節點</span></div>
        <div class="rule-card"><span class="rule-name">⚡ 自動選擇</span><span class="rule-desc">自動測速切換</span></div>
        <div class="rule-card"><span class="rule-name">💬 AI 服務</span><span class="rule-desc">ChatGPT / Gemini</span></div>
        <div class="rule-card"><span class="rule-name">🌐 非中國</span><span class="rule-desc">Google / TG</span></div>
        <div class="rule-card"><span class="rule-name">🔒 國內服務</span><span class="rule-desc">CN Direct</span></div>
        <div class="rule-card"><span class="rule-name">🏠 私有網絡</span><span class="rule-desc">Local Direct</span></div>
        <div class="rule-card"><span class="rule-name">🛑 廣告攔截</span><span class="rule-desc">AdBlock</span></div>
        <div class="rule-card"><span class="rule-name">🐟 漏網之魚</span><span class="rule-desc">Final Match</span></div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">✅ 複製成功！</div>

  <script>
    function generate() {
      const rawInput = document.getElementById('url').value;
      const target = document.getElementById('target').value;
      const urls = rawInput.split(/\\n/).map(u => u.trim()).filter(u => u.length > 0).join('|'); 
      if (!urls) { alert('請至少輸入一個連結！'); return; }
      const host = window.location.origin;
      const final = \`\${host}/?url=\${encodeURIComponent(urls)}&target=\${target}\`;
      document.getElementById('finalUrl').value = final;
      document.getElementById('resultArea').classList.add('show');
    }
    function copyUrl() {
      const copyText = document.getElementById("finalUrl");
      copyText.select();
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

// --- 解析器 ---
function parseVless(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    const name = decodeURIComponent(url.hash.slice(1)) || 'VLESS';
    const node: ProxyNode = {
      type: 'vless', name, server: url.hostname, port: parseInt(url.port), uuid: url.username,
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
    // SingBox Obj
    const sb: any = { tag: name, type: 'vless', server: node.server, server_port: node.port, uuid: node.uuid };
    if(node.flow) sb.flow = node.flow;
    sb.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: node.skipCertVerify, utls: { enabled: true, fingerprint: node.fingerprint }};
    if(node.reality) sb.tls.reality = { enabled: true, public_key: node.reality.publicKey, short_id: node.reality.shortId };
    if(node.network === 'ws') sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    node.singboxObj = sb;
    // Clash Obj
    const cl: any = { name, type: 'vless', server: node.server, port: node.port, uuid: node.uuid, tls: node.tls, servername: node.sni || node.server, 'skip-cert-verify': node.skipCertVerify, 'client-fingerprint': node.fingerprint };
    if(node.flow) cl.flow = node.flow;
    if(node.reality) { cl.reality = true; cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId }; }
    if(node.network === 'ws') { cl.network = 'ws'; cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders }; }
    node.clashObj = cl;
    return node;
  } catch (e) { return null; }
}

function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    const name = decodeURIComponent(url.hash.slice(1)) || 'Hy2';
    const node: ProxyNode = {
      type: 'hysteria2', name, server: url.hostname, port: parseInt(url.port), password: url.username,
      tls: true, sni: params.get('sni') || url.hostname, skipCertVerify: params.get('insecure') === '1',
      obfs: params.get('obfs') || undefined, obfsPassword: params.get('obfs-password') || undefined,
    };
    // SingBox Obj
    const sb: any = { tag: name, type: 'hysteria2', server: node.server, server_port: node.port, password: node.password };
    sb.tls = { enabled: true, server_name: node.sni, insecure: node.skipCertVerify };
    if(node.obfs) sb.obfs = { type: node.obfs, password: node.obfsPassword };
    node.singboxObj = sb;
    // Clash Obj
    const cl: any = { name, type: 'hysteria2', server: node.server, port: node.port, password: node.password, sni: node.sni, 'skip-cert-verify': node.skipCertVerify };
    if(node.obfs) { cl.obfs = node.obfs; cl['obfs-password'] = node.obfsPassword; }
    node.clashObj = cl;
    return node;
  } catch (e) { return null; }
}

function parseVmess(vmessUrl: string): ProxyNode | null {
  try {
    const b64 = vmessUrl.replace('vmess://', '');
    const jsonStr = safeBase64Decode(b64);
    const config = JSON.parse(jsonStr);
    const name = config.ps || 'VMess';
    const node: ProxyNode = {
      type: 'vmess', name, server: config.add, port: parseInt(config.port), uuid: config.id, cipher: 'auto',
      tls: config.tls === 'tls', sni: config.sni || config.host, network: config.net || 'tcp',
      wsPath: config.path, wsHeaders: config.host ? { Host: config.host } : undefined, skipCertVerify: true
    };
    // SingBox
    const sb: any = { tag: name, type: 'vmess', server: node.server, server_port: node.port, uuid: node.uuid, security: 'auto' };
    sb.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: true };
    if(node.network === 'ws') sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    node.singboxObj = sb;
    // Clash
    const cl: any = { name, type: 'vmess', server: node.server, port: node.port, uuid: node.uuid, cipher: 'auto', tls: node.tls, servername: node.sni, network: node.network };
    if(node.network === 'ws') cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders };
    node.clashObj = cl;
    return node;
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
      return null;
    } catch { return null; }
  }).filter(l => l !== null);
  return utf8ToBase64(links.join('\n'));
}

// --- 生成器: SingBox (JSON Template) ---
async function toSingBoxWithTemplate(nodes: ProxyNode[]) {
  const resp = await fetch(REMOTE_CONFIG.singbox);
  if (!resp.ok) throw new Error('無法讀取 Sing-Box_Rules.JSON');
  const text = await resp.text();
  let config;
  try { config = JSON.parse(text); } catch (e) { throw new Error('Sing-Box_Rules.JSON 格式錯誤'); }
  
  const outbounds = nodes.map(n => n.singboxObj);
  const nodeTags = outbounds.map(o => o.tag);

  if (!Array.isArray(config.outbounds)) config.outbounds = [];
  config.outbounds.push(...outbounds);

  config.outbounds.forEach((out: any) => {
    if (out.type === 'selector' || out.type === 'urltest') {
      if (!Array.isArray(out.outbounds)) out.outbounds = [];
      out.outbounds.push(...nodeTags);
    }
  });

  return JSON.stringify(config, null, 2);
}

// --- 生成器: Clash Meta (YAML Template) ---
async function toClashWithTemplate(nodes: ProxyNode[]) {
  const resp = await fetch(REMOTE_CONFIG.clash);
  if (!resp.ok) throw new Error('無法讀取 Clash_Rules.YAML');
  const text = await resp.text();
  let config: any;
  try { config = yaml.load(text); } catch (e) { throw new Error('Clash_Rules.YAML 格式錯誤'); }

  const proxies = nodes.map(n => n.clashObj);
  const proxyNames = proxies.map(p => p.name);

  if (!Array.isArray(config.proxies)) config.proxies = [];
  config.proxies.push(...proxies);

  if (Array.isArray(config['proxy-groups'])) {
    config['proxy-groups'].forEach((group: any) => {
      if (!Array.isArray(group.proxies)) group.proxies = [];
      group.proxies.push(...proxyNames);
    });
  }

  return yaml.dump(config);
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
        if (trimmed.startsWith('http')) {
          try {
            const resp = await fetch(trimmed, { headers: { 'User-Agent': 'v2rayng/1.8.5' } });
            if (resp.ok) {
              const text = await resp.text();
              allNodes.push(...await parseContent(text));
            }
          } catch (e) {}
        } else {
          allNodes.push(...await parseContent(trimmed));
        }
      }));

      if (allNodes.length === 0) return new Response('未解析到任何有效節點', { status: 400 });

      let result = '';
      let contentType = 'text/plain; charset=utf-8';

      if (target === 'clash') {
        result = await toClashWithTemplate(allNodes);
        contentType = 'text/yaml; charset=utf-8';
      } else if (target === 'base64') {
        result = toBase64(allNodes);
        contentType = 'text/plain; charset=utf-8';
      } else {
        result = await toSingBoxWithTemplate(allNodes);
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
