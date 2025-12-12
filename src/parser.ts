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
    const getParam = (str: string, key: string) => {
        const regex = new RegExp(`[?&]${key}=([^&#]*)`, 'i');
        const match = str.match(regex);
        return match ? decodeURIComponent(match[1]) : '';
    };

    let raw = urlStr.replace('ss://', '');
    const hashIndex = raw.indexOf('#');
    let name = 'Shadowsocks';
    if (hashIndex !== -1) {
      name = decodeURIComponent(raw.substring(hashIndex + 1));
      raw = raw.substring(0, hashIndex);
    }
    if (raw.includes('?')) { raw = raw.split('?')[0]; }

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

    if (method.toLowerCase().includes('2022')) { password = fixSS2022Key(password); }

    const pluginStr = getParam(urlStr, 'plugin');
    const security = getParam(urlStr, 'security');
    const sni = getParam(urlStr, 'sni') || getParam(urlStr, 'host') || server;
    const alpnStr = getParam(urlStr, 'alpn');
    const fp = getParam(urlStr, 'fp') || 'chrome';

    const isTls = security === 'tls' || urlStr.includes('obfs=tls') || (alpnStr && alpnStr.length > 0);
    const alpn = alpnStr ? decodeURIComponent(alpnStr).split(',') : undefined;

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
    
    // SS-2022 UoT
    if (method.toLowerCase().includes('2022')) { 
        node.singboxObj.udp_over_tcp = true; 
    }

    // --- 關鍵修正：針對 Shadowsocks 使用 Plugin 來實現 TLS ---
    // SingBox 的 shadowsock type 不支援直接寫 "tls": {...} 或 "transport": {...}
    // 必須使用 plugin (obfs-local) 來包裹 TLS 流量
    
    if (isTls) {
        node.singboxObj.plugin = "obfs-local";
        // 這裡一定要填入正確的 sni，否則伺服器會拒絕握手
        node.singboxObj.plugin_opts = `obfs=tls;obfs-host=${sni}`;
    } else if (pluginStr) {
        // 處理原本就有 plugin 的情況 (例如 v2ray-plugin)
        // 這裡簡化處理，直接透傳 plugin 參數
        const pSplit = decodeURIComponent(pluginStr).split(';');
        node.singboxObj.plugin = pSplit[0];
        node.singboxObj.plugin_opts = pSplit.slice(1).join(';');
    }
    // ----------------------------------------------------

    // 構建 Clash 物件
    node.clashObj = {
      name: name, type: 'ss', server: node.server, port: node.port, cipher: node.cipher, password: node.password, udp: true,
      plugin: pluginStr ? decodeURIComponent(pluginStr).split(';')[0] : undefined,
      'plugin-opts': pluginStr ? parsePluginParams(decodeURIComponent(pluginStr).split(';').slice(1).join(';')) : undefined
    };
    
    if (isTls) { 
        // 確保 Clash 也使用 obfs
        if (!node.clashObj.plugin) {
            node.clashObj.plugin = 'obfs-local';
            node.clashObj['plugin-opts'] = { obfs: 'tls', 'obfs-host': sni };
        }
    }

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
