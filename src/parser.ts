import { ProxyNode } from "./types";
import { safeBase64Decode } from "./utils";

// --- 輔助：完美修復 SS-2022 Key ---
function fixSS2022Key(key: string, method: string): string {
  if (!key) return "";
  
  try { key = decodeURIComponent(key); } catch(e) {}

  if (key.includes(':')) {
    key = key.split(':')[0];
  }

  let clean = key.replace(/-/g, '+').replace(/_/g, '/');
  clean = clean.replace(/[^A-Za-z0-9\+\/]/g, ""); // 白名單

  // 根據加密算法決定長度
  // aes-128-gcm -> 16 bytes -> 24 base64 chars
  // aes-256-gcm / chacha20 -> 32 bytes -> 44 base64 chars
  let expectedLen = 44;
  if (method.includes('128-gcm')) expectedLen = 24;

  if (clean.length > expectedLen) {
    clean = clean.substring(0, expectedLen);
  }

  const pad = clean.length % 4;
  if (pad) {
    clean += '='.repeat(4 - pad);
  }
  
  return clean;
}

// 輔助：解析 Plugin 參數字串 (obfs=http;obfs-host=...)
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
    
    // 1. 提取名稱
    let raw = urlStr.replace('ss://', '');
    const hashIndex = raw.indexOf('#');
    let name = 'Shadowsocks';
    
    if (hashIndex !== -1) {
      name = decodeURIComponent(raw.substring(hashIndex + 1));
      raw = raw.substring(0, hashIndex);
    }

    // 2. 解析 userinfo@server:port
    let method = '';
    let password = '';
    let server = '';
    let portStr = '';

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
          const up = decoded.split(':');
          method = up[0];
          password = up.slice(1).join(':');
        } else {
          throw new Error('Not Base64');
        }
      } catch (e) {
        const up = userPart.split(':');
        method = up[0];
        password = up.slice(1).join(':');
      }
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

    // --- 密碼修復 (針對 SS-2022) ---
    if (method.toLowerCase().includes('2022')) {
        password = fixSS2022Key(password, method.toLowerCase());
    }

    // --- Plugin 轉換 (關鍵修改) ---
    // 獲取原始 plugin 參數
    let pluginStr = params.get('plugin') || '';
    // 如果 URL 裡沒有，可能在 userinfo 解碼後有 (較少見但防呆)
    
    // 準備 SingBox 的額外物件
    let sbTransport: any = undefined;
    let sbObfs: any = undefined;

    if (pluginStr) {
        // 解碼 plugin 參數 (例如: v2ray-plugin;mode=websocket;host=...)
        try { pluginStr = decodeURIComponent(pluginStr); } catch(e){}
        const pSplit = pluginStr.split(';');
        const pluginName = pSplit[0];
        const pluginArgs = parsePluginParams(pSplit.slice(1).join(';'));

        // 轉換 v2ray-plugin -> transport (ws/http/quic)
        if (pluginName === 'v2ray-plugin') {
            const mode = pluginArgs['mode'] || 'websocket';
            if (mode === 'websocket') {
                sbTransport = {
                    type: 'ws',
                    path: pluginArgs['path'] || '/',
                    headers: pluginArgs['host'] ? { Host: pluginArgs['host'] } : undefined
                };
                // 如果有 tls
                if (pluginArgs['tls'] === 'true') {
                    // SS 原生不支援 TLS 包裹，通常由 transport 處理，但 SingBox 結構不同
                    // 這裡通常假設 SS over WS (無 TLS) 或 SS over WSS
                    // SingBox 的 SS outbound 沒有直接的 tls 字段，除非用 transport 嵌套
                    // 簡化處理：通常 SS+V2RayPlugin 不會太複雜
                }
            } else if (mode === 'quic') {
                sbTransport = { type: 'quic' };
            }
        }
        
        // 轉換 obfs-local -> obfs
        else if (pluginName === 'obfs-local' || pluginName === 'simple-obfs') {
            const obfsMode = pluginArgs['obfs'] || 'http';
            sbObfs = {
                type: obfsMode,
                host: pluginArgs['obfs-host'] || 'www.bing.com'
            };
        }
    }

    // --- 構建節點 ---
    const node: ProxyNode = {
      type: 'shadowsocks',
      name,
      server,
      port,
      cipher: method,
      password,
      udp: true
    };

    // SingBox Config
    node.singboxObj = {
      tag: name,
      type: 'shadowsocks',
      server: node.server,
      server_port: node.port,
      method: node.cipher,
      password: node.password,
    };

    // 注入轉換後的 Transport / Obfs
    if (sbTransport) node.singboxObj.transport = sbTransport;
    if (sbObfs) node.singboxObj.obfs = sbObfs;

    // Clash Config (直接傳遞 plugin 參數，因為 Clash Meta 支援比較好)
    node.clashObj = {
      name: name,
      type: 'ss',
      server: node.server,
      port: node.port,
      cipher: node.cipher,
      password: node.password,
      udp: true,
      plugin: pluginStr ? pluginStr.split(';')[0] : undefined,
      'plugin-opts': pluginStr ? parsePluginParams(pluginStr.split(';').slice(1).join(';')) : undefined
    };

    return node;
  } catch (e) { return null; }
}

// --- 解析 VLESS ---
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

    const sb: any = { tag: name, type: 'vless', server: node.server, server_port: node.port, uuid: node.uuid };
    if(node.flow) sb.flow = node.flow;
    sb.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: node.skipCertVerify, utls: { enabled: true, fingerprint: node.fingerprint }};
    if(node.reality) sb.tls.reality = { enabled: true, public_key: node.reality.publicKey, short_id: node.reality.shortId };
    if(node.network === 'ws') sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    node.singboxObj = sb;

    const cl: any = { name, type: 'vless', server: node.server, port: node.port, uuid: node.uuid, tls: node.tls, servername: node.sni || node.server, 'skip-cert-verify': node.skipCertVerify, 'client-fingerprint': node.fingerprint };
    if(node.flow) cl.flow = node.flow;
    if(node.reality) { cl.reality = true; cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId }; }
    if(node.network === 'ws') { cl.network = 'ws'; cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders }; }
    node.clashObj = cl;

    return node;
  } catch (e) { return null; }
}

// --- 解析 Hysteria2 ---
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

    const sb: any = { tag: name, type: 'hysteria2', server: node.server, server_port: node.port, password: node.password };
    sb.tls = { enabled: true, server_name: node.sni, insecure: node.skipCertVerify };
    if(node.obfs) sb.obfs = { type: node.obfs, password: node.obfsPassword };
    node.singboxObj = sb;

    const cl: any = { name, type: 'hysteria2', server: node.server, port: node.port, password: node.password, sni: node.sni, 'skip-cert-verify': node.skipCertVerify };
    if(node.obfs) { cl.obfs = node.obfs; cl['obfs-password'] = node.obfsPassword; }
    node.clashObj = cl;

    return node;
  } catch (e) { return null; }
}

// --- 解析 Vmess ---
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

    const sb: any = { tag: name, type: 'vmess', server: node.server, server_port: node.port, uuid: node.uuid, security: 'auto' };
    sb.tls = { enabled: node.tls, server_name: node.sni || node.server, insecure: true };
    if(node.network === 'ws') sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    node.singboxObj = sb;

    const cl: any = { name, type: 'vmess', server: node.server, port: node.port, uuid: node.uuid, cipher: 'auto', tls: node.tls, servername: node.sni, network: node.network };
    if(node.network === 'ws') cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders };
    node.clashObj = cl;

    return node;
  } catch (e) { return null; }
}

// --- 主解析函數 ---
export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content;
  if (!content.includes('://') || !content.match(/^[a-z0-9]+:\/\//i)) {
    const decoded = safeBase64Decode(content);
    if (decoded) plainText = decoded;
  }

  const lines = plainText.split(/\r?\n/);
  const nodes: ProxyNode[] = [];
  
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    
    if (l.startsWith('ss://')) { 
      const n = parseShadowsocks(l); 
      if (n) nodes.push(n); 
    } 
    else if (l.startsWith('vless://')) { 
      const n = parseVless(l); 
      if (n) nodes.push(n); 
    } 
    else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) { 
      const n = parseHysteria2(l); 
      if (n) nodes.push(n); 
    } 
    else if (l.startsWith('vmess://')) { 
      const n = parseVmess(l); 
      if (n) nodes.push(n); 
    }
  }
  return nodes;
}
