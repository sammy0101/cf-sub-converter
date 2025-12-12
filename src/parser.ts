import { ProxyNode } from "./types";
import { safeBase64Decode } from "./utils";

// --- 輔助：完美修復 SS-2022 Key ---
function fixSS2022Key(key: string): string {
  if (!key) return "";
  try { key = decodeURIComponent(key); } catch(e) {}
  if (key.includes(':')) { key = key.split(':')[0]; }
  let clean = key.replace(/-/g, '+').replace(/_/g, '/');
  clean = clean.replace(/[^A-Za-z0-9\+\/]/g, "");
  if (clean.length > 44) { clean = clean.substring(0, 44); }
  const pad = clean.length % 4;
  if (pad) { clean += '='.repeat(4 - pad); }
  return clean;
}

function parsePluginParams(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  str.split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (k && v) params[k] = v;
  });
  return params;
}

// --- 解析 Shadowsocks ---
function parseShadowsocks(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    let raw = urlStr.replace('ss://', '');
    const hashIndex = raw.indexOf('#');
    let name = 'Shadowsocks';
    if (hashIndex !== -1) {
      name = decodeURIComponent(raw.substring(hashIndex + 1));
      raw = raw.substring(0, hashIndex);
    }
    
    // 基本解析
    let method = ''; let password = ''; let server = ''; let portStr = '';
    if (raw.includes('@')) {
      const parts = raw.split('@');
      const serverPart = parts[parts.length - 1];
      const userPart = parts.slice(0, parts.length - 1).join('@');
      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      server = serverPart.substring(0, lastColonIndex);
      portStr = serverPart.substring(lastColonIndex + 1);
      if (server.startsWith('[') && server.endsWith(']')) server = server.slice(1, -1);
      try {
        const decoded = safeBase64Decode(userPart);
        if (decoded && decoded.includes(':') && !decoded.includes('@')) {
          const up = decoded.split(':'); method = up[0]; password = up.slice(1).join(':');
        } else { throw new Error('Not Base64'); }
      } catch (e) { const up = userPart.split(':'); method = up[0]; password = up.slice(1).join(':'); }
    } else {
      const decoded = safeBase64Decode(raw);
      if (!decoded) return null;
      const atIndex = decoded.lastIndexOf('@');
      if (atIndex === -1) return null;
      const userPart = decoded.substring(0, atIndex);
      const serverPart = decoded.substring(atIndex + 1);
      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      server = serverPart.substring(0, lastColonIndex);
      portStr = serverPart.substring(lastColonIndex + 1);
      if (server.startsWith('[') && server.endsWith(']')) server = server.slice(1, -1);
      const firstColonIndex = userPart.indexOf(':');
      if (firstColonIndex === -1) return null;
      method = userPart.substring(0, firstColonIndex);
      password = userPart.substring(firstColonIndex + 1);
    }

    if (!server || !portStr || !method || !password) return null;
    const port = parseInt(portStr);
    if (isNaN(port)) return null;

    // 密碼修復
    if (method.toLowerCase().includes('2022')) { password = fixSS2022Key(password); }

    // --- Plugin 處理 ---
    let pluginStr = params.get('plugin') || '';
    // 有些連結把 plugin 放在 userinfo 裡，雖然不標準但防呆
    if (!pluginStr && raw.includes('plugin=')) {
        // 簡單提取
        const match = raw.match(/plugin=([^&]+)/);
        if (match) pluginStr = decodeURIComponent(match[1]);
    }

    let sbTransport: any = undefined;
    let sbObfs: any = undefined;

    if (pluginStr) {
        try { pluginStr = decodeURIComponent(pluginStr); } catch(e){}
        const pSplit = pluginStr.split(';');
        const pluginName = pSplit[0];
        const pluginArgs = parsePluginParams(pSplit.slice(1).join(';'));
        if (pluginName === 'v2ray-plugin') {
            sbTransport = { type: 'ws', path: pluginArgs['path'] || '/', headers: pluginArgs['host'] ? { Host: pluginArgs['host'] } : undefined };
        } else if (pluginName === 'obfs-local' || pluginName === 'simple-obfs') {
            sbObfs = { type: pluginArgs['obfs'] || 'http', host: pluginArgs['obfs-host'] || 'www.bing.com' };
        }
    }

    // --- 關鍵：判斷是否開啟 TLS ---
    // 1. 標準參數 security=tls
    // 2. 插件參數 obfs=tls
    const isTls = params.get('security') === 'tls' || (pluginStr && pluginStr.includes('obfs=tls'));
    
    const sni = params.get('sni') || params.get('host') || server;
    const alpn = params.get('alpn') ? decodeURIComponent(params.get('alpn')!).split(',') : undefined;
    const fp = params.get('fp') || 'chrome';

    const node: ProxyNode = {
      type: 'shadowsocks', name, server, port, cipher: method, password, udp: true,
      tls: isTls, sni: sni, alpn: alpn, fingerprint: fp
    };

    // --- 構建 SingBox 物件 ---
    node.singboxObj = {
      tag: name,
      type: 'shadowsocks',
      server: node.server,
      server_port: node.port,
      method: node.cipher,
      password: node.password
    };
    
    if (method.toLowerCase().includes('2022')) { 
        node.singboxObj.udp_over_tcp = true; 
    }
    
    if (sbTransport) node.singboxObj.transport = sbTransport;
    if (sbObfs) node.singboxObj.obfs = sbObfs;

    // *** 強制寫入 TLS 設定 ***
    if (isTls) {
        node.singboxObj.tls = {
            enabled: true,
            server_name: sni,
            alpn: alpn,
            utls: { enabled: true, fingerprint: fp }
        };
        // 根據你之前的 log，這些節點是 h2，我們這裡保守一點，如果有 h2 就加上 multiplex
        // 但為了避免上次的錯誤，我們不強制開，除非 alpn 明確寫了 h2
        if (alpn && alpn.includes('h2')) {
             node.singboxObj.multiplex = { enabled: true, protocol: "h2", max_connections: 1, min_streams: 2, padding: true };
        }
    }

    // --- 構建 Clash 物件 ---
    node.clashObj = {
      name: name, type: 'ss', server: node.server, port: node.port, cipher: node.cipher, password: node.password, udp: true,
      plugin: pluginStr ? pluginStr.split(';')[0] : undefined,
      'plugin-opts': pluginStr ? parsePluginParams(pluginStr.split(';').slice(1).join(';')) : undefined
    };
    if (isTls) { node.clashObj.smux = { enabled: true }; }

    return node;
  } catch (e) { return null; }
}

// ... (以下 Vless, Hysteria2, Vmess 函數內容保持不變，請保留原有的) ...

function parseVless(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr); const params = url.searchParams; const name = decodeURIComponent(url.hash.slice(1)) || 'VLESS';
    const node: ProxyNode = { type: 'vless', name, server: url.hostname, port: parseInt(url.port), uuid: url.username, tls: params.get('security') === 'tls' || params.get('security') === 'reality', flow: params.get('flow') || undefined, network: params.get('type') || 'tcp', sni: params.get('sni') || params.get('host') || undefined, fingerprint: params.get('fp') || 'chrome', skipCertVerify: params.get('allowInsecure') === '1' };
    if (params.get('security') === 'reality') { node.reality = { publicKey: params.get('pbk') || '', shortId: params.get('sid') || '' }; if (!node.sni) node.sni = node.server; }
    if (node.network === 'ws') { node.wsPath = params.get('path') || '/'; node.wsHeaders = { Host: params.get('host') || node.server }; }
    const sb: any = { tag: name, type: 'vless', server: node.server, server_port: node.port, uuid: node.uuid };
    if(node.flow) sb.flow = node.flow; sb.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: node.skipCertVerify, utls: { enabled: true, fingerprint: node.fingerprint }};
    if(node.reality) sb.tls.reality = { enabled: true, public_key: node.reality.publicKey, short_id: node.reality.shortId };
    if(node.network === 'ws') sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    node.singboxObj = sb;
    const cl: any = { name, type: 'vless', server: node.server, port: node.port, uuid: node.uuid, tls: node.tls, servername: node.sni || node.server, 'skip-cert-verify': node.skipCertVerify, 'client-fingerprint': node.fingerprint };
    if(node.flow) cl.flow = node.flow; if(node.reality) { cl.reality = true; cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId }; }
    if(node.network === 'ws') { cl.network = 'ws'; cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders }; }
    node.clashObj = cl;
    return node;
  } catch (e) { return null; }
}
function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr); const params = url.searchParams; const name = decodeURIComponent(url.hash.slice(1)) || 'Hy2';
    const node: ProxyNode = { type: 'hysteria2', name, server: url.hostname, port: parseInt(url.port), password: url.username, tls: true, sni: params.get('sni') || url.hostname, skipCertVerify: params.get('insecure') === '1', obfs: params.get('obfs') || undefined, obfsPassword: params.get('obfs-password') || undefined };
    const sb: any = { tag: name, type: 'hysteria2', server: node.server, server_port: node.port, password: node.password };
    sb.tls = { enabled: true, server_name: node.sni, insecure: node.skipCertVerify }; if(node.obfs) sb.obfs = { type: node.obfs, password: node.obfsPassword }; node.singboxObj = sb;
    const cl: any = { name, type: 'hysteria2', server: node.server, port: node.port, password: node.password, sni: node.sni, 'skip-cert-verify': node.skipCertVerify };
    if(node.obfs) { cl.obfs = node.obfs; cl['obfs-password'] = node.obfsPassword; } node.clashObj = cl;
    return node;
  } catch (e) { return null; }
}
function parseVmess(vmessUrl: string): ProxyNode | null {
  try {
    const b64 = vmessUrl.replace('vmess://', ''); const jsonStr = safeBase64Decode(b64); const config = JSON.parse(jsonStr); const name = config.ps || 'VMess';
    const node: ProxyNode = { type: 'vmess', name, server: config.add, port: parseInt(config.port), uuid: config.id, cipher: 'auto', tls: config.tls === 'tls', sni: config.sni || config.host, network: config.net || 'tcp', wsPath: config.path, wsHeaders: config.host ? { Host: config.host } : undefined, skipCertVerify: true };
    const sb: any = { tag: name, type: 'vmess', server: node.server, server_port: node.port, uuid: node.uuid, security: 'auto' };
    sb.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: true }; if(node.network === 'ws') sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders }; node.singboxObj = sb;
    const cl: any = { name, type: 'vmess', server: node.server, port: node.port, uuid: node.uuid, cipher: 'auto', tls: node.tls, servername: node.sni, network: node.network };
    if(node.network === 'ws') cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders }; node.clashObj = cl;
    return node;
  } catch (e) { return null; }
}
export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content; if (!content.includes('://') || !content.match(/^[a-z0-9]+:\/\//i)) { const decoded = safeBase64Decode(content); if (decoded) plainText = decoded; }
  const lines = plainText.split(/\r?\n/); const nodes: ProxyNode[] = [];
  for (const line of lines) { const l = line.trim(); if (!l) continue;
    if (l.startsWith('ss://')) { const n = parseShadowsocks(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vless://')) { const n = parseVless(l); if (n) nodes.push(n); } 
    else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) { const n = parseHysteria2(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vmess://')) { const n = parseVmess(l); if (n) nodes.push(n); }
  } return nodes;
}
