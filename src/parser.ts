import { ProxyNode } from "./types";
import { safeBase64Decode } from "./utils";

// --- 解析 Shadowsocks (增強版) ---
function parseShadowsocks(urlStr: string): ProxyNode | null {
  try {
    // 1. 基本清理
    let raw = urlStr.trim();
    if (!raw.startsWith('ss://')) return null;
    raw = raw.substring(5); // 去掉 ss://

    // 2. 提取名稱 (Hash)
    let name = 'Shadowsocks';
    const hashIndex = raw.indexOf('#');
    if (hashIndex !== -1) {
      name = decodeURIComponent(raw.substring(hashIndex + 1));
      raw = raw.substring(0, hashIndex);
    }

    let method = '';
    let password = '';
    let server = '';
    let portStr = '';

    // 3. 判斷格式
    // 格式 A: 包含 @ (SIP002 或 明文) -> userinfo@server:port
    if (raw.includes('@')) {
      const parts = raw.split('@');
      const serverPart = parts[parts.length - 1]; // 最後一部分是 server:port
      const userPart = parts.slice(0, parts.length - 1).join('@'); // 前面是 userinfo

      // 解析 Server:Port
      // 處理 IPv6 (例如 [::1]:80) 或 IPv4
      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      server = serverPart.substring(0, lastColonIndex);
      portStr = serverPart.substring(lastColonIndex + 1);

      // 解析 UserInfo (method:password)
      // 可能是 Base64 編碼，也可能是明文
      try {
        // 先嘗試 Base64 解碼
        const decoded = safeBase64Decode(userPart);
        if (decoded && decoded.includes(':')) {
          const up = decoded.split(':');
          method = up[0];
          password = up.slice(1).join(':');
        } else {
          throw new Error('Not Base64');
        }
      } catch (e) {
        // 如果解碼失敗或不含冒號，當作明文處理
        const up = userPart.split(':');
        method = up[0];
        password = up.slice(1).join(':');
      }
    } 
    // 格式 B: 不含 @ (Legacy) -> 全 Base64 (method:password@server:port)
    else {
      const decoded = safeBase64Decode(raw);
      if (!decoded) return null;

      // 解碼後應為 method:password@server:port
      const atIndex = decoded.lastIndexOf('@');
      if (atIndex === -1) return null;

      const userPart = decoded.substring(0, atIndex);
      const serverPart = decoded.substring(atIndex + 1);

      // 解析 Server:Port
      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      server = serverPart.substring(0, lastColonIndex);
      portStr = serverPart.substring(lastColonIndex + 1);

      // 解析 Method:Password
      const firstColonIndex = userPart.indexOf(':');
      if (firstColonIndex === -1) return null;
      method = userPart.substring(0, firstColonIndex);
      password = userPart.substring(firstColonIndex + 1);
    }

    if (!server || !portStr || !method || !password) return null;
    const port = parseInt(portStr);
    if (isNaN(port)) return null;

    const node: ProxyNode = {
      type: 'shadowsocks',
      name,
      server,
      port,
      cipher: method,
      password,
      udp: true
    };

    // SingBox 物件
    node.singboxObj = {
      tag: name,
      type: 'shadowsocks',
      server: node.server,
      server_port: node.port,
      method: node.cipher,
      password: node.password,
      plugin: "", 
      plugin_opts: ""
    };

    // Clash 物件
    node.clashObj = {
      name: name,
      type: 'ss',
      server: node.server,
      port: node.port,
      cipher: node.cipher,
      password: node.password,
      udp: true
    };

    return node;
  } catch (e) { 
    // console.error('SS Parse Error:', e); 
    return null; 
  }
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
  // 智能判斷是否需要 Base64 解碼
  // 如果內容不包含 :// (例如不是 vless:// 開頭)，或者看起來像純亂碼，就嘗試解碼
  if (!content.includes('://') || !content.match(/^[a-z0-9]+:\/\//i)) {
    const decoded = safeBase64Decode(content);
    if (decoded) plainText = decoded;
  }

  const lines = plainText.split(/\r?\n/);
  const nodes: ProxyNode[] = [];
  
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    
    // 依序嘗試解析
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
