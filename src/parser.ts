// src/parser.ts
import yaml from "js-yaml";
import { ProxyNode, WireGuardConfig, MasqueConfig } from "./types";
import { safeBase64Decode, tryDecodeURIComponent } from "./utils";

// --- 安全的通用代理 URI 正則解析器 ---
interface ParsedUri {
  protocol: string;
  username: string;
  password?: string;
  hostname: string;
  port: number;
  params: URLSearchParams;
  hash: string;
}

function parseProxyUri(urlStr: string, defaultPort = 443): ParsedUri | null {
  try {
    const trimmed = urlStr.trim();
    const match = trimmed.match(/^([a-zA-Z0-9_-]+):\/\/(?:([^:@/?#]+)(?::([^@/?#]*))?@)?(\[[a-fA-F0-9:]+\]|[^:/?#]+)(?::([0-9]+))?(?:\?([^#]*))?(?:#(.*))?$/);
    if (!match) return null;

    const protocol = match[1].toLowerCase();
    const username = match[2] ? decodeURIComponent(match[2]) : '';
    const password = match[3] ? decodeURIComponent(match[3]) : undefined;
    let hostname = match[4];
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }
    const port = match[5] ? parseInt(match[5], 10) : defaultPort;
    const query = match[6] || '';
    const hash = match[7] ? tryDecodeURIComponent(match[7]) : '';

    const params = new URLSearchParams(query);
    return { protocol, username, password, hostname, port, params, hash };
  } catch {
    return null;
  }
}

function parsePluginParams(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  str.split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (k && v) params[k] = v;
  });
  return params;
}

function isIpAddress(str: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) || str.includes(':');
}

// 智慧解析 ECH 參數，動態提取網域與 DoH URL (嚴格防呆排除 IP 充當網域)
function parseEchInfo(val: string | null | undefined): { enabled: boolean; domain?: string; doh?: string } {
  if (!val) return { enabled: false };
  const raw = val.trim();
  const clean = raw.toLowerCase();
  if (['0', 'false', 'off', 'none', 'no', ''].includes(clean)) {
    return { enabled: false };
  }
  
  // 1. domain+doh 格式 (例如: cloudflare-ech.com+https://1.1.1.1/dns-query)
  if (raw.includes('+')) {
    const parts = raw.split('+');
    const domain = parts[0]?.trim();
    const doh = parts.slice(1).join('+').trim();
    const validDomain = (domain && !isIpAddress(domain)) ? domain : undefined;
    return { enabled: true, domain: validDomain, doh: doh || undefined };
  }

  // 2. 若直接輸入 DoH 網址 (例如: https://1.1.1.1/dns-query)
  if (/^https?:\/\//i.test(raw)) {
    return { enabled: true, doh: raw };
  }

  // 3. 若輸入純 IP 地址 (例如: 1.1.1.1 或 223.5.5.5)，則是 DoH 伺服器 IP
  if (isIpAddress(raw)) {
    return { enabled: true, doh: `https://${raw}/dns-query` };
  }

  // 4. 若為單純網域名稱 (例如: cloudflare-ech.com)
  if (clean !== '1' && clean !== 'true') {
    return { enabled: true, domain: raw };
  }

  return { enabled: true };
}

// --- 解析 Cloudflare WARP MASQUE 配置 ---
interface RawMasqueConfig {
  private_key?: string;
  'private-key'?: string;
  endpoint_v4?: string;
  endpoint_v6?: string;
  endpoint_pub_key?: string;
  'public-key'?: string;
  public_key?: string;
  server?: string;
  port?: number | string;
  ipv4?: string;
  ipv6?: string;
  ip?: string;
  name?: string;
  uri?: string;
  sni?: string;
  servername?: string;
  server_name?: string;
  congestion_controller?: string;
  'congestion-controller'?: string;
  congestion_control?: string;
  cca?: string;
  cc?: string;
  dns?: string[] | string;
  mtu?: number | string;
  udp?: boolean;
  'remote-dns-resolve'?: boolean;
  [key: string]: unknown;
}

function buildMasqueNode(config: RawMasqueConfig, index = 0): ProxyNode {
  const privateKey = (config.private_key || config['private-key'] || '').trim();
  const rawPubKey = (config.endpoint_pub_key || config.public_key || config['public-key'] || '').trim();
  const publicKey = rawPubKey.replace(/-----BEGIN[^-]+-----|-----END[^-]+-----|[\r\n\s]/g, '');
  const server = (config.server || config.endpoint_v4 || '').trim();
  const port = parseInt(String(config.port || 443), 10) || 443;
  const rawIpv4 = (config.ip || config.ipv4 || '').trim();

  if (!privateKey) throw new Error(`[MASQUE] 第 ${index + 1} 個節點缺少必要欄位: private_key (私鑰)`);
  if (!publicKey) throw new Error(`[MASQUE] 第 ${index + 1} 個節點缺少必要欄位: public_key / endpoint_pub_key (公鑰)`);
  if (!server) throw new Error(`[MASQUE] 第 ${index + 1} 個節點缺少必要欄位: server / endpoint_v4 (伺服器端點)`);
  if (!rawIpv4) throw new Error(`[MASQUE] 第 ${index + 1} 個節點缺少必要欄位: ip / ipv4 (客戶端內網 IP)`);

  const localIpv4 = rawIpv4.includes('/') ? rawIpv4 : `${rawIpv4}/32`;
  
  let localIpv6: string | undefined = undefined;
  if (config.ipv6) {
    const rawIpv6 = String(config.ipv6).trim();
    localIpv6 = rawIpv6.includes('/') ? rawIpv6 : `${rawIpv6}/128`;
  }

  const name = config.name || (index > 0 ? `WARP-MASQUE-${index + 1}` : 'WARP-MASQUE');
  const uri = (config.uri && String(config.uri).trim()) ? String(config.uri).trim() : 'https://cloudflareaccess.com';
  const customSni = config.sni || config.servername || config.server_name;
  const sni = (customSni && String(customSni).trim()) ? String(customSni).trim() : 'www.microsoft.com';

  const rawCc = (
    config.cca ||
    config.cc ||
    config.congestion_control ||
    config.congestion_controller ||
    config['congestion-controller']
  );
  const congestionController = (rawCc && String(rawCc).trim()) ? String(rawCc).trim() : 'bbr';
  const mtu = config.mtu ? (parseInt(String(config.mtu), 10) || 1280) : 1280;
  
  let dnsList: string[] = [];
  if (Array.isArray(config.dns) && config.dns.length > 0) {
    dnsList = config.dns.map(d => String(d).trim()).filter(Boolean);
  } else if (typeof config.dns === 'string' && config.dns.trim()) {
    dnsList = config.dns.split(',').map(d => d.trim()).filter(Boolean);
  } else {
    dnsList = ['1.1.1.1', '8.8.8.8'];
  }

  const remoteDnsResolve = config['remote-dns-resolve'] !== undefined 
    ? Boolean(config['remote-dns-resolve']) 
    : true;

  const masqueConfig: MasqueConfig = {
    privateKey,
    publicKey,
    localIpv4,
    localIpv6,
    mtu,
    uri,
    sni,
    congestion_controller: congestionController,
    dns: dnsList
  };

  const node: ProxyNode = {
    type: 'masque',
    name,
    server,
    port,
    udp: true,
    sni,
    masque: masqueConfig
  };

  node.singboxObj = {
    type: 'masque',
    tag: name,
    server,
    server_port: port,
    private_key: privateKey,
    public_key: publicKey,
    ip: localIpv4,
    ...(localIpv6 ? { ipv6: localIpv6 } : {}),
    uri,
    congestion_control: congestionController,
    mtu,
    tls: {
      enabled: true,
      server_name: sni
    }
  };

  const originalClashProps = { ...config };
  const cleanKeys = [
    'private_key', 'private-key', 'public_key', 'public-key', 'endpoint_pub_key',
    'endpoint_v4', 'endpoint_v6', 'endpoint_h2_v4', 'endpoint_h2_v6',
    'ipv4', 'license', 'id', 'access_token', 'MASQUE导航'
  ];
  for (const k of cleanKeys) {
    delete originalClashProps[k];
  }

  node.clashObj = {
    ...originalClashProps,
    name,
    type: 'masque',
    server,
    port,
    'private-key': privateKey,
    'public-key': publicKey,
    ip: localIpv4.split('/')[0],
    ...(localIpv6 ? { ipv6: localIpv6.split('/')[0] } : {}),
    uri,
    mtu,
    udp: config.udp !== undefined ? Boolean(config.udp) : true,
    'remote-dns-resolve': remoteDnsResolve,
    'congestion-controller': congestionController,
    dns: dnsList,
    sni
  };

  return node;
}

export function parseMasqueConfigs(text: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      parsed.forEach((item, idx) => {
        const n = buildMasqueNode(item, idx);
        if (n) nodes.push(n);
      });
      if (nodes.length > 0) return nodes;
    } else if (typeof parsed === 'object' && parsed !== null) {
      const n = buildMasqueNode(parsed, 0);
      if (n) return [n];
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('[MASQUE]')) {
      throw err;
    }
  }

  const objectMatches = trimmed.match(/\{[^{}]*["']private_key["'][^{}]*\}/g);
  if (objectMatches) {
    objectMatches.forEach((rawObj, idx) => {
      const obj = JSON.parse(rawObj) as RawMasqueConfig;
      const n = buildMasqueNode(obj, idx);
      if (n) nodes.push(n);
    });
  }

  return nodes;
}

// --- 解析 masque:// URI 格式 ---
function parseMasqueUri(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 443);
  if (!parsed) throw new Error('[MASQUE] URI 格式無效，無法解析');

  const privateKey = parsed.username;
  const params = parsed.params;
  const publicKey = params.get('public_key') || params.get('pk') || '';
  const ipv4 = params.get('ip') || '';
  const ipv6 = params.get('ipv6') || undefined;
  const mtu = parseInt(params.get('mtu') || '1280', 10);
  const name = parsed.hash || 'WARP-MASQUE';
  
  if (!privateKey) throw new Error('[MASQUE] 缺少必要欄位: private_key (私鑰)');
  if (!publicKey) throw new Error('[MASQUE] 缺少必要欄位: public_key (公鑰)');
  if (!parsed.hostname) throw new Error('[MASQUE] 缺少必要欄位: server (伺服器地址)');
  if (!ipv4) throw new Error('[MASQUE] 缺少必要欄位: ip (客戶端內網 IP)');

  const uri = (params.get('uri') && params.get('uri')!.trim()) ? params.get('uri')!.trim() : 'https://cloudflareaccess.com';
  const sni = (params.get('sni') && params.get('sni')!.trim()) ? params.get('sni')!.trim() : 'www.microsoft.com';
  
  const rawCc = params.get('cca') || params.get('cc') || params.get('congestion_control') || params.get('congestion_controller') || params.get('congestion-controller');
  const congestionController = (rawCc && rawCc.trim()) ? rawCc.trim() : 'bbr';
  
  const dnsParam = params.get('dns');
  const dnsList = dnsParam ? dnsParam.split(',').map(d => d.trim()).filter(Boolean) : ['1.1.1.1', '8.8.8.8'];

  const masqueConfig: MasqueConfig = {
    privateKey,
    publicKey,
    localIpv4: ipv4.includes('/') ? ipv4 : `${ipv4}/32`,
    localIpv6: ipv6 ? (ipv6.includes('/') ? ipv6 : `${ipv6}/128`) : undefined,
    mtu,
    uri,
    sni,
    congestion_controller: congestionController,
    dns: dnsList
  };

  const node: ProxyNode = {
    type: 'masque',
    name,
    server: parsed.hostname,
    port: parsed.port,
    udp: true,
    sni,
    masque: masqueConfig
  };

  node.singboxObj = {
    type: 'masque',
    tag: name,
    server: parsed.hostname,
    server_port: parsed.port,
    private_key: privateKey,
    public_key: publicKey,
    ip: masqueConfig.localIpv4,
    ...(masqueConfig.localIpv6 ? { ipv6: masqueConfig.localIpv6 } : {}),
    uri,
    congestion_control: congestionController,
    mtu,
    tls: {
      enabled: true,
      server_name: sni
    }
  };

  node.clashObj = {
    name,
    type: 'masque',
    server: parsed.hostname,
    port: parsed.port,
    'private-key': privateKey,
    'public-key': publicKey,
    ip: ipv4.split('/')[0],
    ...(ipv6 ? { ipv6: ipv6.split('/')[0] } : {}),
    uri,
    mtu,
    udp: true,
    'remote-dns-resolve': true,
    'congestion-controller': congestionController,
    dns: dnsList,
    sni
  };

  return node;
}

// --- 解析 Shadowrocket 行格式 WireGuard ---
function parseShadowrocketWireGuard(line: string): ProxyNode {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) throw new Error('[WireGuard] Shadowrocket 行格式錯誤');

  const name = line.substring(0, eqIdx).trim();
  const rightPart = line.substring(eqIdx + 1).trim();
  const parts = rightPart.split(',').map(s => s.trim());

  if (parts[0]?.toLowerCase() !== 'wireguard') throw new Error('[WireGuard] 非 WireGuard 行格式');

  const server = parts[1];
  const port = parseInt(parts[2], 10) || 51820;

  let privateKey = '';
  let publicKey = '';
  let presharedKey: string | undefined = undefined;
  let ip = '';
  let dns = '';
  let mtu = 1420;
  let reserved: number[] | undefined = undefined;

  for (let i = 3; i < parts.length; i++) {
    const p = parts[i];
    const kvIdx = p.indexOf('=');
    if (kvIdx === -1) continue;
    const k = p.substring(0, kvIdx).trim().toLowerCase();
    const v = p.substring(kvIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (k === 'private-key' || k === 'privatekey') privateKey = v;
    else if (k === 'public-key' || k === 'publickey') publicKey = v;
    else if (k === 'preshared-key' || k === 'presharedkey') presharedKey = v;
    else if (k === 'ip') ip = v;
    else if (k === 'dns') dns = v;
    else if (k === 'mtu') mtu = parseInt(v, 10) || 1420;
    else if (k === 'reserved') reserved = v.split(',').map(n => parseInt(n.trim(), 10));
  }

  if (!server) throw new Error(`[WireGuard] 節點 [${name}] 缺少伺服器地址`);
  if (!privateKey) throw new Error(`[WireGuard] 節點 [${name}] 缺少 private-key (私鑰)`);
  if (!publicKey) throw new Error(`[WireGuard] 節點 [${name}] 缺少 public-key (公鑰)`);
  if (!ip) throw new Error(`[WireGuard] 節點 [${name}] 缺少 ip (內網 IP)`);
  if (!dns) throw new Error(`[WireGuard] 節點 [${name}] 缺少 dns 設定（例如 dns=10.2.0.1）`);

  const localAddress = ip.includes('/') ? [ip] : [`${ip}/32`];
  const dnsArray = dns.split(',').map(d => d.trim()).filter(Boolean);

  const wgConfig: WireGuardConfig = {
    privateKey,
    localAddress,
    publicKey,
    presharedKey,
    mtu,
    dns,
    reserved
  };

  const node: ProxyNode = {
    type: 'wireguard',
    name,
    server,
    port,
    udp: true,
    wireguard: wgConfig
  };

  node.singboxObj = {
    type: 'wireguard',
    tag: name,
    address: localAddress,
    private_key: privateKey,
    peers: [
      {
        address: server,
        port,
        public_key: publicKey,
        allowed_ips: ['0.0.0.0/0', '::/0']
      }
    ],
    mtu
  };

  node.clashObj = {
    name,
    type: 'wireguard',
    server: node.server,
    port: node.port,
    ip: localAddress[0]?.split('/')[0],
    ipv6: localAddress[1]?.split('/')[0],
    'public-key': publicKey,
    'private-key': privateKey,
    'preshared-key': presharedKey,
    mtu,
    udp: true,
    'remote-dns-resolve': true,
    dns: dnsArray
  };

  return node;
}

// --- 解析 WireGuard 官方 .conf 格式 ---
function parseWireGuardConf(text: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  const sections = text.split(/(?=\[Interface\])/i).filter(s => s.trim().length > 0);

  for (let idx = 0; idx < sections.length; idx++) {
    const sec = sections[idx];
    if (!/\[Interface\]/i.test(sec)) continue;

    const getVal = (key: string): string => {
      const match = sec.match(new RegExp(`^[ \\t]*${key}[ \\t]*=[ \\t]*(.*?)[ \\t]*(?:#.*)?$`, 'mi'));
      return match ? match[1].trim() : '';
    };

    let name = '';
    const peerPart = sec.split(/\[Peer\]/i)[1] || '';
    const peerComments = peerPart.match(/^[ \t]*#[ \t]*(.*?)$/gm);
    if (peerComments) {
      for (const c of peerComments) {
        const clean = c.replace(/^[ \t]*#[ \t]*/, '').trim();
        if (clean && !clean.includes('=') && !clean.toLowerCase().startsWith('key for')) {
          name = clean;
          break;
        }
      }
    }

    if (!name) {
      const comments = sec.match(/^[ \t]*#[ \t]*(.*?)$/gm);
      if (comments) {
        for (const c of comments) {
          const clean = c.replace(/^[ \t]*#[ \t]*/, '').trim();
          if (clean && !clean.includes('=') && !clean.toLowerCase().startsWith('key for')) {
            name = clean;
            break;
          }
        }
      }
    }

    const privateKey = getVal('PrivateKey');
    const addressStr = getVal('Address');
    const rawDns = getVal('DNS');
    const publicKey = getVal('PublicKey');
    const presharedKey = getVal('PresharedKey') || undefined;
    const endpoint = getVal('Endpoint');
    const mtuStr = getVal('MTU');
    const mtu = mtuStr ? parseInt(mtuStr, 10) : 1420;

    if (!privateKey) throw new Error(`[WireGuard] 第 ${idx + 1} 組配置缺少必要欄位: PrivateKey (私鑰)`);
    if (!addressStr) throw new Error(`[WireGuard] 第 ${idx + 1} 組配置缺少必要欄位: Address (客戶端內網 IP)`);
    if (!rawDns) throw new Error(`[WireGuard] 第 ${idx + 1} 組配置缺少必要欄位: DNS。請在 [Interface] 中填入 DNS = ...（例如 DNS = 10.2.0.1）`);
    if (!/\[Peer\]/i.test(sec)) throw new Error(`[WireGuard] 第 ${idx + 1} 組配置缺少 [Peer] 節點區塊`);
    if (!publicKey) throw new Error(`[WireGuard] 第 ${idx + 1} 組配置缺少必要欄位: PublicKey (節點公鑰)`);
    if (!endpoint) throw new Error(`[WireGuard] 第 ${idx + 1} 組配置缺少必要欄位: Endpoint (伺服器端點 IP:Port)`);

    let server = endpoint;
    let port = 51820;
    const lastColon = endpoint.lastIndexOf(':');
    if (lastColon !== -1) {
      server = endpoint.slice(0, lastColon).trim();
      if (server.startsWith('[') && server.endsWith(']')) {
        server = server.slice(1, -1);
      }
      port = parseInt(endpoint.slice(lastColon + 1).trim(), 10) || 51820;
    }

    if (!name) name = `WireGuard-${server}`;

    const localAddress = addressStr.split(',').map(s => s.trim()).filter(Boolean);
    const dnsArray = rawDns.split(',').map(s => s.trim()).filter(Boolean);

    const wgConfig: WireGuardConfig = {
      privateKey,
      localAddress,
      publicKey,
      presharedKey,
      mtu,
      dns: rawDns
    };

    const node: ProxyNode = {
      type: 'wireguard',
      name,
      server,
      port,
      udp: true,
      wireguard: wgConfig
    };

    node.singboxObj = {
      type: 'wireguard',
      tag: name,
      address: localAddress,
      private_key: privateKey,
      peers: [
        {
          address: server,
          port,
          public_key: publicKey,
          allowed_ips: ['0.0.0.0/0', '::/0']
        }
      ],
      mtu
    };

    node.clashObj = {
      name,
      type: 'wireguard',
      server: node.server,
      port: node.port,
      ip: localAddress[0]?.split('/')[0],
      ipv6: localAddress[1]?.split('/')[0],
      'public-key': publicKey,
      'private-key': privateKey,
      'preshared-key': presharedKey,
      mtu,
      udp: true,
      'remote-dns-resolve': true,
      dns: dnsArray
    };

    nodes.push(node);
  }

  return nodes;
}

// --- 解析 Shadowsocks ---
function parseShadowsocks(urlStr: string): ProxyNode {
  const getParam = (str: string, key: string): string => {
    const regex = new RegExp(`[?&]${key}=([^&#]*)`, 'i');
    const match = str.match(regex);
    return match ? tryDecodeURIComponent(match[1]) : '';
  };

  let raw = urlStr.replace('ss://', '');
  const hashIndex = raw.indexOf('#');
  let name = 'Shadowsocks';
  if (hashIndex !== -1) {
    name = tryDecodeURIComponent(raw.substring(hashIndex + 1));
    raw = raw.substring(0, hashIndex);
  }
  if (raw.includes('?')) { raw = raw.split('?')[0]; }

  let method = '';
  let password = '';
  let server = '';
  let portStr = '';
  
  if (raw.includes('@')) {
    const parts = raw.split('@');
    const serverPart = parts[parts.length - 1];
    const userPart = parts.slice(0, parts.length - 1).join('@');
    const lastColonIndex = serverPart.lastIndexOf(':');
    if (lastColonIndex === -1) throw new Error('[Shadowsocks] 連接埠格式無效');
    server = serverPart.substring(0, lastColonIndex);
    portStr = serverPart.substring(lastColonIndex + 1);
    if (server.startsWith('[') && server.endsWith(']')) server = server.slice(1, -1);
    try {
      const decoded = safeBase64Decode(userPart);
      if (decoded && decoded.includes(':')) { 
        const up = decoded.split(':');
        method = up[0];
        password = up.slice(1).join(':');
      } else {
        const up = userPart.split(':');
        method = up[0];
        password = up.slice(1).join(':');
      }
    } catch {
      const up = userPart.split(':');
      method = up[0];
      password = up.slice(1).join(':');
    }
  } else {
    const decoded = safeBase64Decode(raw);
    if (!decoded) throw new Error('[Shadowsocks] Base64 解碼失敗');
    const atIndex = decoded.lastIndexOf('@');
    if (atIndex === -1) throw new Error('[Shadowsocks] 缺少 @ 分隔符號');
    const userPart = decoded.substring(0, atIndex);
    const serverPart = decoded.substring(atIndex + 1);
    const lastColonIndex = serverPart.lastIndexOf(':');
    if (lastColonIndex === -1) throw new Error('[Shadowsocks] 缺少連接埠');
    server = serverPart.substring(0, lastColonIndex);
    portStr = serverPart.substring(lastColonIndex + 1);
    if (server.startsWith('[') && server.endsWith(']')) server = server.slice(1, -1);
    const firstColonIndex = userPart.indexOf(':');
    if (firstColonIndex === -1) throw new Error('[Shadowsocks] 缺少加密方式');
    method = userPart.substring(0, firstColonIndex);
    password = userPart.substring(firstColonIndex + 1);
  }

  if (!server) throw new Error('[Shadowsocks] 缺少伺服器地址');
  if (!portStr) throw new Error('[Shadowsocks] 缺少連接埠');
  if (!method) throw new Error('[Shadowsocks] 缺少 cipher (加密方式)');
  if (!password) throw new Error('[Shadowsocks] 缺少 password (密碼)');
  const port = parseInt(portStr, 10);
  if (isNaN(port)) throw new Error('[Shadowsocks] 連接埠非有效數字');

  const pluginStr = getParam(urlStr, 'plugin');
  const security = getParam(urlStr, 'security');
  const sni = getParam(urlStr, 'sni') || getParam(urlStr, 'host') || server;
  const alpnStr = getParam(urlStr, 'alpn');
  const fp = getParam(urlStr, 'fp') || 'chrome';
  const echInfo = parseEchInfo(getParam(urlStr, 'ech'));

  const isTls = security === 'tls' || urlStr.includes('obfs=tls') || (alpnStr && alpnStr.length > 0) || echInfo.enabled;
  const alpn = alpnStr ? alpnStr.split(',') : undefined;
  const isSs2022 = method.toLowerCase().includes('2022');

  const node: ProxyNode = {
    type: 'shadowsocks', name, server, port, cipher: method, password, udp: true,
    tls: isTls, sni, alpn, fingerprint: fp,
    ech: echInfo.enabled, echQueryServerName: echInfo.domain, echDoh: echInfo.doh
  };

  const sb: Record<string, unknown> = {
    tag: name,
    type: 'shadowsocks',
    server: node.server,
    server_port: node.port,
    method: node.cipher,
    password: node.password
  };
  if (isSs2022) {
    sb.udp_over_tcp = true;
  }
  node.singboxObj = sb;

  const cl: Record<string, unknown> = {
    name,
    type: 'ss',
    server: node.server,
    port: node.port,
    cipher: node.cipher,
    password: node.password,
    udp: true,
    plugin: pluginStr ? pluginStr.split(';')[0] : undefined,
    'plugin-opts': pluginStr ? parsePluginParams(pluginStr.split(';').slice(1).join(';')) : undefined
  };
  if (isTls) {
    cl.smux = { enabled: true };
  }
  if (node.ech) {
    cl['ech-opts'] = { enable: true };
  }
  node.clashObj = cl;

  return node;
}

// --- 解析 VLESS ---
function parseVless(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 443);
  if (!parsed) throw new Error('[VLESS] URI 格式無效，無法解析');

  const params = parsed.params;
  const name = parsed.hash || 'VLESS';
  
  if (!parsed.username) throw new Error(`[VLESS] 節點 [${name}] 缺少必要欄位: uuid`);
  if (!parsed.hostname) throw new Error(`[VLESS] 節點 [${name}] 缺少必要欄位: server (伺服器地址)`);

  let rawPath = params.get('path') || '';
  const explicitNet = (params.get('type') || params.get('net') || params.get('network') || params.get('transport') || '').toLowerCase();
  let netType = explicitNet;
  if (!netType) {
    if (rawPath || params.has('ed') || params.has('host')) {
      netType = 'ws';
    } else {
      netType = 'tcp';
    }
  }

  if (netType === 'ws' && !rawPath) rawPath = '/';
  if (rawPath && !rawPath.startsWith('/')) rawPath = '/' + rawPath;

  let earlyDataLength: number | undefined = undefined;
  const edMatch = rawPath.match(/[?&]ed=([0-9]+)/) || (params.get('ed') ? [null, params.get('ed')] : null);
  if (edMatch && edMatch[1]) {
    earlyDataLength = parseInt(edMatch[1], 10);
  }

  const cleanPath = rawPath ? (rawPath.replace(/[?&]ed=[0-9]+/g, '').replace(/\?$/, '') || '/') : '/';
  const isXhttp = netType === 'xhttp' || netType === 'splithttp';
  const isGrpc = netType === 'grpc';
  const echInfo = parseEchInfo(params.get('ech'));

  const security = params.get('security') || (params.get('tls') === '1' || params.get('tls') === 'tls' || echInfo.enabled ? 'tls' : (parsed.port === 443 ? 'tls' : 'none'));
  const isTls = security === 'tls' || security === 'reality' || echInfo.enabled;
  const hostHeader = params.get('host') || params.get('sni') || parsed.hostname;
  const sniHost = params.get('sni') || params.get('host') || parsed.hostname;
  const customAlpn = params.get('alpn') ? params.get('alpn')!.split(',') : undefined;

  const node: ProxyNode = {
    type: 'vless',
    name,
    server: parsed.hostname,
    port: parsed.port,
    uuid: parsed.username,
    tls: isTls,
    flow: params.get('flow') || undefined,
    network: netType,
    sni: sniHost,
    alpn: customAlpn,
    fingerprint: params.get('fp') || 'chrome',
    skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1',
    ech: echInfo.enabled,
    echQueryServerName: echInfo.domain,
    echDoh: echInfo.doh
  };

  if (security === 'reality') {
    node.reality = {
      publicKey: params.get('pbk') || '',
      shortId: params.get('sid') || ''
    };
    if (!node.reality.publicKey) throw new Error(`[VLESS] Reality 節點 [${name}] 缺少 pbk (公鑰)`);
    if (!node.sni) node.sni = node.server;
  }

  if (node.network === 'ws') {
    node.wsPath = cleanPath;
    node.wsHeaders = { Host: hostHeader };
  }

  if (isXhttp) {
    node.xhttpPath = cleanPath;
    node.xhttpHost = hostHeader;
    node.xhttpMode = params.get('mode') || 'auto';
  }
  
  const sb: Record<string, unknown> = {
    tag: name,
    type: 'vless',
    server: node.server,
    server_port: node.port,
    uuid: node.uuid,
    packet_encoding: 'xudp'
  };

  if (node.tls) {
    const tlsObj: Record<string, unknown> = {
      enabled: true,
      server_name: node.sni || node.server,
      insecure: node.skipCertVerify,
      utls: { enabled: true, fingerprint: node.fingerprint }
    };
    if (node.alpn) tlsObj.alpn = node.alpn;
    if (node.ech) tlsObj.ech = { enabled: true };
    if (node.reality) {
      tlsObj.reality = { enabled: true, public_key: node.reality.publicKey, short_id: node.reality.shortId };
    }
    sb.tls = tlsObj;
  }

  if (node.flow) sb.flow = node.flow;

  if (node.network === 'ws') {
    const wsTransport: Record<string, unknown> = {
      type: 'ws',
      path: cleanPath,
      headers: node.wsHeaders
    };
    if (earlyDataLength) {
      wsTransport.max_early_data = earlyDataLength;
      wsTransport.early_data_header_name = 'Sec-WebSocket-Protocol';
    }
    sb.transport = wsTransport;
  } else if (isXhttp) {
    sb.transport = {
      type: 'splithttp',
      path: cleanPath,
      headers: { Host: node.xhttpHost },
      mode: node.xhttpMode
    };
  } else if (isGrpc) {
    sb.transport = {
      type: 'grpc',
      service_name: params.get('serviceName') || ''
    };
  }
  node.singboxObj = sb;
  
  const cl: Record<string, unknown> = {
    name,
    type: 'vless',
    server: node.server,
    port: node.port,
    uuid: node.uuid,
    udp: true,
    tls: node.tls,
    servername: node.sni || node.server,
    'skip-cert-verify': node.skipCertVerify,
    'client-fingerprint': node.fingerprint
  };

  if (node.alpn) cl.alpn = node.alpn;
  if (node.ech) cl['ech-opts'] = { enable: true };
  if (node.flow) cl.flow = node.flow; 
  if (node.reality) {
    cl.reality = true;
    cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId };
  }

  if (node.network === 'ws') {
    cl.network = 'ws';
    cl['ws-opts'] = {
      path: cleanPath,
      headers: node.wsHeaders,
      'max-early-data': earlyDataLength,
      'early-data-header-name': earlyDataLength ? 'Sec-WebSocket-Protocol' : undefined
    };
  } else if (isXhttp) {
    cl.network = 'xhttp';
    cl['xhttp-opts'] = { path: cleanPath, host: node.xhttpHost, mode: node.xhttpMode };
  } else if (isGrpc) {
    cl.network = 'grpc';
    cl['grpc-opts'] = { 'grpc-service-name': params.get('serviceName') || '' };
  }
  node.clashObj = cl;

  return node;
}

// --- 解析 WireGuard (URI 格式) ---
function parseWireGuard(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 51820);
  if (!parsed) throw new Error('[WireGuard] URI 格式無效');

  const params = parsed.params;
  const name = parsed.hash || 'WireGuard';
  const privateKey = parsed.username;
  const rawIp = params.get('address') || params.get('ip') || '';
  const publicKey = params.get('publickey') || params.get('public_key') || params.get('pk') || '';
  const presharedKey = params.get('presharedkey') || params.get('preshared_key') || params.get('psk') || undefined;
  const mtu = parseInt(params.get('mtu') || '1420', 10);
  const rawDns = params.get('dns') || '';
  const reserved = params.get('reserved') ? params.get('reserved')!.split(',').map(n => parseInt(n.trim(), 10)) : undefined;

  if (!privateKey) throw new Error(`[WireGuard] 節點 [${name}] 缺少 privatekey (私鑰)`);
  if (!publicKey) throw new Error(`[WireGuard] 節點 [${name}] 缺少 publickey (公鑰)`);
  if (!parsed.hostname) throw new Error(`[WireGuard] 節點 [${name}] 缺少伺服器地址`);
  if (!rawIp) throw new Error(`[WireGuard] 節點 [${name}] 缺少 address / ip (內網 IP)`);
  if (!rawDns) throw new Error(`[WireGuard] 節點 [${name}] 缺少 dns 設定`);

  const localIps = rawIp.split(',').map(s => s.trim().includes('/') ? s.trim() : `${s.trim()}/32`);
  const dnsList = rawDns.split(',').map(d => d.trim()).filter(Boolean);

  const wgConfig: WireGuardConfig = {
    privateKey,
    localAddress: localIps,
    publicKey,
    presharedKey,
    mtu,
    reserved,
    dns: rawDns
  };

  const node: ProxyNode = {
    type: 'wireguard',
    name,
    server: parsed.hostname,
    port: parsed.port,
    udp: true,
    wireguard: wgConfig
  };

  node.singboxObj = {
    type: 'wireguard',
    tag: name,
    address: localIps,
    private_key: privateKey,
    peers: [
      {
        address: parsed.hostname,
        port: parsed.port,
        public_key: publicKey,
        allowed_ips: ['0.0.0.0/0', '::/0']
      }
    ],
    mtu
  };

  node.clashObj = {
    name,
    type: 'wireguard',
    server: node.server,
    port: node.port,
    ip: localIps[0]?.split('/')[0],
    ipv6: localIps[1]?.split('/')[0],
    'public-key': publicKey,
    'private-key': privateKey,
    'preshared-key': presharedKey,
    mtu,
    udp: true,
    'remote-dns-resolve': true,
    dns: dnsList
  };

  return node;
}

// --- 解析 Hysteria2 ---
function parseHysteria2(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 443);
  if (!parsed) throw new Error('[Hysteria2] URI 格式無效');

  const params = parsed.params;
  const name = parsed.hash || 'Hy2';
  
  if (!parsed.username) throw new Error(`[Hysteria2] 節點 [${name}] 缺少密碼 (auth)`);
  if (!parsed.hostname) throw new Error(`[Hysteria2] 節點 [${name}] 缺少伺服器地址`);

  const node: ProxyNode = {
    type: 'hysteria2',
    name,
    server: parsed.hostname,
    port: parsed.port,
    password: parsed.username,
    tls: true,
    sni: params.get('sni') || parsed.hostname,
    skipCertVerify: params.get('insecure') === '1' || params.get('allowInsecure') === '1',
    obfs: params.get('obfs') || undefined,
    obfsPassword: params.get('obfs-password') || undefined
  };

  const sb: Record<string, unknown> = {
    tag: name,
    type: 'hysteria2',
    server: node.server,
    server_port: node.port,
    password: node.password,
    tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify }
  };
  if (node.obfs) {
    sb.obfs = { type: node.obfs, password: node.obfsPassword };
  }
  node.singboxObj = sb;

  const cl: Record<string, unknown> = {
    name,
    type: 'hysteria2',
    server: node.server,
    port: node.port,
    password: node.password,
    sni: node.sni,
    'skip-cert-verify': node.skipCertVerify
  };
  if (node.obfs) {
    cl.obfs = node.obfs;
    cl['obfs-password'] = node.obfsPassword;
  }
  node.clashObj = cl;

  return node;
}

// --- 解析 TUIC ---
function parseTuic(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 443);
  if (!parsed) throw new Error('[TUIC] URI 格式無效');

  const params = parsed.params;
  const name = parsed.hash || 'TUIC';
  
  if (!parsed.username) throw new Error(`[TUIC] 節點 [${name}] 缺少 uuid`);
  if (!parsed.hostname) throw new Error(`[TUIC] 節點 [${name}] 缺少伺服器地址`);

  const congestion_control = params.get('congestion_control') || params.get('cca') || params.get('cc') || 'bbr';
  const udp_relay_mode = params.get('udp_relay_mode') || 'native';
  const alpnStr = params.get('alpn');
  const skipCertVerify = params.get('allow_insecure') === '1' || params.get('insecure') === '1';

  const node: ProxyNode = {
    type: 'tuic',
    name,
    server: parsed.hostname,
    port: parsed.port,
    uuid: parsed.username,
    password: parsed.password || '',
    tls: true,
    sni: params.get('sni') || parsed.hostname,
    alpn: alpnStr ? alpnStr.split(',') : ['h3'],
    skipCertVerify,
    congestion_control,
    udp_relay_mode
  };

  node.singboxObj = {
    tag: name,
    type: 'tuic',
    server: node.server,
    server_port: node.port,
    uuid: node.uuid,
    password: node.password,
    congestion_control: node.congestion_control,
    udp_relay_mode: node.udp_relay_mode,
    tls: { enabled: true, server_name: node.sni, alpn: node.alpn, insecure: node.skipCertVerify }
  };

  node.clashObj = {
    name,
    type: 'tuic',
    server: node.server,
    port: node.port,
    uuid: node.uuid,
    password: node.password,
    sni: node.sni,
    alpn: node.alpn,
    'skip-cert-verify': node.skipCertVerify,
    'congestion-controller': node.congestion_control,
    'udp-relay-mode': node.udp_relay_mode
  };

  return node;
}

// --- 解析 AnyTLS ---
function parseAnytls(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 443);
  if (!parsed) throw new Error('[AnyTLS] URI 格式無效');

  const params = parsed.params;
  const name = parsed.hash || 'AnyTLS';
  const uuid = parsed.username;
  if (!uuid) throw new Error(`[AnyTLS] 節點 [${name}] 缺少密碼 / UUID`);
  if (!parsed.hostname) throw new Error(`[AnyTLS] 節點 [${name}] 缺少伺服器地址`);

  const skipCertVerify = params.get('allowInsecure') === '1' || params.get('insecure') === '1';
  const alpnStr = params.get('alpn');

  const node: ProxyNode = {
    type: 'anytls',
    name,
    server: parsed.hostname,
    port: parsed.port,
    uuid,
    password: uuid,
    tls: true,
    sni: params.get('sni') || parsed.hostname,
    fingerprint: params.get('fp') || 'chrome',
    skipCertVerify,
    alpn: alpnStr ? alpnStr.split(',') : undefined
  };

  node.singboxObj = { 
    tag: name, 
    type: 'anytls', 
    server: node.server, 
    server_port: node.port, 
    password: node.password, 
    tls: { 
      enabled: true, 
      server_name: node.sni, 
      insecure: node.skipCertVerify, 
      utls: { enabled: true, fingerprint: node.fingerprint } 
    } 
  };
  if (node.alpn) (node.singboxObj.tls as Record<string, unknown>).alpn = node.alpn;

  node.clashObj = {
    name,
    type: 'anytls',
    server: node.server,
    port: node.port,
    password: node.password,
    sni: node.sni,
    'skip-cert-verify': node.skipCertVerify,
    'client-fingerprint': node.fingerprint,
    udp: true
  };
  if (node.alpn) node.clashObj.alpn = node.alpn;

  return node;
}

// --- 解析 VMess ---
function parseVmess(vmessUrl: string): ProxyNode {
  const b64 = vmessUrl.replace('vmess://', '');
  const jsonStr = safeBase64Decode(b64);
  if (!jsonStr) throw new Error('[VMess] Base64 解碼失敗');
  
  const config = JSON.parse(jsonStr);
  const name = config.ps || 'VMess';
  if (!config.add) throw new Error(`[VMess] 節點 [${name}] 缺少伺服器地址 (add)`);
  if (!config.id) throw new Error(`[VMess] 節點 [${name}] 缺少 UUID (id)`);

  let rawPath = config.path || '';
  const explicitNet = (config.net || '').toLowerCase();
  let netType = explicitNet;
  if (!netType) {
    netType = rawPath ? 'ws' : 'tcp';
  }

  if (netType === 'ws' && !rawPath) rawPath = '/';
  if (rawPath && !rawPath.startsWith('/')) rawPath = '/' + rawPath;

  let earlyDataLength: number | undefined = undefined;
  const edMatch = rawPath.match(/[?&]ed=([0-9]+)/);
  if (edMatch && edMatch[1]) {
    earlyDataLength = parseInt(edMatch[1], 10);
  }
  const cleanPath = rawPath ? (rawPath.replace(/[?&]ed=[0-9]+/g, '').replace(/\?$/, '') || '/') : '/';

  const isTls = config.tls === 'tls';

  const node: ProxyNode = {
    type: 'vmess',
    name,
    server: config.add,
    port: parseInt(config.port, 10) || (isTls ? 443 : 80),
    uuid: config.id,
    cipher: 'auto',
    tls: isTls,
    sni: config.sni || config.host,
    network: netType,
    wsPath: cleanPath,
    wsHeaders: config.host ? { Host: config.host } : undefined,
    skipCertVerify: true
  };
  
  const sb: Record<string, unknown> = {
    tag: name,
    type: 'vmess',
    server: node.server,
    server_port: node.port,
    uuid: node.uuid,
    security: 'auto',
    packet_encoding: 'xudp'
  };

  if (node.tls) {
    sb.tls = {
      enabled: true,
      server_name: node.sni || node.server,
      insecure: true
    };
  }
  if (node.network === 'ws') {
    const wsTransport: Record<string, unknown> = { type: 'ws', path: cleanPath, headers: node.wsHeaders };
    if (earlyDataLength) {
      wsTransport.max_early_data = earlyDataLength;
      wsTransport.early_data_header_name = 'Sec-WebSocket-Protocol';
    }
    sb.transport = wsTransport;
  }
  node.singboxObj = sb;
  
  const cl: Record<string, unknown> = {
    name,
    type: 'vmess',
    server: node.server,
    port: node.port,
    uuid: node.uuid,
    alterId: parseInt(config.aid, 10) || 0,
    cipher: config.scy || 'auto',
    udp: true,
    tls: node.tls,
    servername: node.sni || config.host || node.server,
    network: node.network
  };
  if (node.network === 'ws') {
    cl['ws-opts'] = {
      path: cleanPath,
      headers: node.wsHeaders,
      'max-early-data': earlyDataLength,
      'early-data-header-name': earlyDataLength ? 'Sec-WebSocket-Protocol' : undefined
    };
  }
  node.clashObj = cl;

  return node;
}

// --- 解析 Trojan ---
function parseTrojan(urlStr: string): ProxyNode {
  const parsed = parseProxyUri(urlStr, 443);
  if (!parsed) throw new Error('[Trojan] URI 格式無效');

  const params = parsed.params;
  const name = parsed.hash || 'Trojan';
  if (!parsed.username) throw new Error(`[Trojan] 節點 [${name}] 缺少密碼`);
  if (!parsed.hostname) throw new Error(`[Trojan] 節點 [${name}] 缺少伺服器地址`);

  const echInfo = parseEchInfo(params.get('ech'));

  const node: ProxyNode = {
    type: 'trojan',
    name,
    server: parsed.hostname,
    port: parsed.port,
    password: parsed.username,
    tls: true,
    sni: params.get('sni') || params.get('peer') || parsed.hostname,
    skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1',
    ech: echInfo.enabled,
    echQueryServerName: echInfo.domain,
    echDoh: echInfo.doh
  };

  const tlsObj: Record<string, unknown> = {
    enabled: true,
    server_name: node.sni,
    insecure: node.skipCertVerify
  };
  if (node.ech) {
    tlsObj.ech = { enabled: true };
  }

  node.singboxObj = {
    tag: name,
    type: 'trojan',
    server: node.server,
    server_port: node.port,
    password: node.password,
    tls: tlsObj
  };

  const cl: Record<string, unknown> = {
    name,
    type: 'trojan',
    server: node.server,
    port: node.port,
    password: node.password,
    sni: node.sni,
    'skip-cert-verify': node.skipCertVerify,
    udp: true
  };
  if (node.ech) {
    cl['ech-opts'] = { enable: true };
  }
  node.clashObj = cl;

  return node;
}

// --- 解析 Clash YAML 格式的單一 Proxy 項目 ---
function parseClashProxyItem(p: Record<string, unknown>, index: number): ProxyNode {
  const type = String(p.type || '').toLowerCase();
  const name = String(p.name || `Node-${index + 1}`).trim();
  const server = String(p.server || '').trim();
  const port = parseInt(String(p.port || 443), 10) || 443;

  if (type === 'masque') {
    return buildMasqueNode(p as RawMasqueConfig, index);
  }

  if (!server) throw new Error(`[Clash YAML] 第 ${index + 1} 個節點缺少 server (伺服器地址)`);

  // 1. VLESS
  if (type === 'vless') {
    const uuid = String(p.uuid || '').trim();
    if (!uuid) throw new Error(`[Clash YAML] VLESS 節點 [${name}] 缺少 uuid`);
    
    const tls = Boolean(p.tls);
    const sni = p.servername ? String(p.servername).trim() : (p.sni ? String(p.sni) : server);
    const flow = p.flow ? String(p.flow).trim() : undefined;
    const network = p.network ? String(p.network).toLowerCase() : (p['ws-opts'] ? 'ws' : (p['xhttp-opts'] ? 'xhttp' : (p['grpc-opts'] ? 'grpc' : 'tcp')));
    
    const wsOpts = p['ws-opts'] as Record<string, unknown> | undefined;
    const wsPath = wsOpts?.path ? String(wsOpts.path) : undefined;
    const wsHeaders = wsOpts?.headers as Record<string, string> | undefined;

    const realityOpts = p['reality-opts'] as Record<string, unknown> | undefined;
    const reality = (p.reality || realityOpts) ? {
      publicKey: String(realityOpts?.['public-key'] || ''),
      shortId: String(realityOpts?.['short-id'] || '')
    } : undefined;

    const echOpts = p['ech-opts'] as Record<string, unknown> | undefined;
    let echEnabled = false;
    let echDomain: string | undefined = undefined;
    let echDoh: string | undefined = undefined;

    if (p.ech) {
      const info = parseEchInfo(String(p.ech));
      echEnabled = info.enabled;
      echDomain = info.domain;
      echDoh = info.doh;
    } else if (echOpts && echOpts.enable === true) {
      echEnabled = true;
      if (echOpts['query-server-name']) echDomain = String(echOpts['query-server-name']);
      if (echOpts['doh-server']) echDoh = String(echOpts['doh-server']);
      else if (echOpts.doh) echDoh = String(echOpts.doh);
    }

    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;
    const fingerprint = p['client-fingerprint'] ? String(p['client-fingerprint']).trim() : 'chrome';
    const alpn = Array.isArray(p.alpn) ? p.alpn.map(String) : undefined;

    let earlyDataLength: number | undefined = undefined;
    if (wsOpts?.['max-early-data']) {
      earlyDataLength = parseInt(String(wsOpts['max-early-data']), 10);
    } else if (wsPath) {
      const edMatch = wsPath.match(/[?&]ed=([0-9]+)/);
      if (edMatch && edMatch[1]) {
        earlyDataLength = parseInt(edMatch[1], 10);
      }
    }

    const clashObjCopy: Record<string, unknown> = { ...p };
    clashObjCopy.network = network;
    if (!alpn) {
      delete clashObjCopy.alpn;
    }

    const node: ProxyNode = {
      type: 'vless', name, server, port, uuid, tls, sni, network, flow,
      wsPath, wsHeaders, reality,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      skipCertVerify,
      fingerprint,
      alpn,
      ech: echEnabled,
      echQueryServerName: echDomain,
      echDoh: echDoh,
      clashObj: clashObjCopy
    };

    const sb: Record<string, unknown> = {
      tag: name, type: 'vless', server, server_port: port, uuid, packet_encoding: 'xudp'
    };
    if (tls) {
      const tlsObj: Record<string, unknown> = {
        enabled: true,
        server_name: sni,
        insecure: skipCertVerify,
        utls: { enabled: true, fingerprint }
      };
      if (alpn) tlsObj.alpn = alpn;
      if (echEnabled) tlsObj.ech = { enabled: true };
      if (reality) {
        tlsObj.reality = { enabled: true, public_key: reality.publicKey, short_id: reality.shortId };
      }
      sb.tls = tlsObj;
    }
    if (flow) sb.flow = flow;
    if (network === 'ws') {
      const wsTransport: Record<string, unknown> = {
        type: 'ws',
        path: wsPath || '/',
        headers: wsHeaders
      };
      if (earlyDataLength) {
        wsTransport.max_early_data = earlyDataLength;
        wsTransport.early_data_header_name = 'Sec-WebSocket-Protocol';
      }
      sb.transport = wsTransport;
    }
    node.singboxObj = sb;
    return node;
  }

  // 2. Shadowsocks
  if (type === 'ss' || type === 'shadowsocks') {
    const cipher = String(p.cipher || '');
    const password = String(p.password || '');
    if (!cipher) throw new Error(`[Clash YAML] Shadowsocks 節點 [${name}] 缺少 cipher (加密方法)`);
    if (!password) throw new Error(`[Clash YAML] Shadowsocks 節點 [${name}] 缺少 password (密碼)`);
    const udp = p.udp !== false;

    const node: ProxyNode = {
      type: 'shadowsocks', name, server, port, cipher, password, udp,
      clashObj: { ...p }
    };
    node.singboxObj = {
      tag: name, type: 'shadowsocks', server, server_port: port, method: cipher, password
    };
    return node;
  }

  // 3. VMess
  if (type === 'vmess') {
    const uuid = String(p.uuid || '');
    if (!uuid) throw new Error(`[Clash YAML] VMess 節點 [${name}] 缺少 uuid`);
    const tls = Boolean(p.tls);
    const sni = p.servername ? String(p.servername) : (p.sni ? String(p.sni) : server);
    const network = p.network ? String(p.network).toLowerCase() : (p['ws-opts'] ? 'ws' : 'tcp');
    const wsOpts = p['ws-opts'] as Record<string, unknown> | undefined;
    const wsPath = wsOpts?.path ? String(wsOpts.path) : undefined;
    const wsHeaders = wsOpts?.headers as Record<string, string> | undefined;

    const node: ProxyNode = {
      type: 'vmess', name, server, port, uuid, tls, sni, network, wsPath, wsHeaders,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      clashObj: { ...p, network }
    };
    const sb: Record<string, unknown> = {
      tag: name, type: 'vmess', server, server_port: port, uuid, security: 'auto', packet_encoding: 'xudp'
    };
    if (tls) {
      sb.tls = { enabled: true, server_name: sni, insecure: p['skip-cert-verify'] ? Boolean(p['skip-cert-verify']) : false };
    }
    if (network === 'ws') {
      sb.transport = { type: 'ws', path: wsPath || '/', headers: wsHeaders };
    }
    node.singboxObj = sb;
    return node;
  }

  // 4. Trojan
  if (type === 'trojan') {
    const password = String(p.password || '');
    if (!password) throw new Error(`[Clash YAML] Trojan 節點 [${name}] 缺少 password (密碼)`);
    const sni = p.sni ? String(p.sni) : (p.servername ? String(p.servername) : server);
    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;

    const node: ProxyNode = {
      type: 'trojan', name, server, port, password, tls: true, sni, skipCertVerify,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      clashObj: { ...p }
    };
    node.singboxObj = {
      tag: name, type: 'trojan', server, server_port: port, password,
      tls: { enabled: true, server_name: sni, insecure: skipCertVerify }
    };
    return node;
  }

  // 5. Hysteria 2
  if (type === 'hysteria2' || type === 'hy2') {
    const password = String(p.password || p.auth || '');
    if (!password) throw new Error(`[Clash YAML] Hysteria2 節點 [${name}] 缺少 password / auth`);
    const sni = p.sni ? String(p.sni) : (p.servername ? String(p.servername) : server);
    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;

    const node: ProxyNode = {
      type: 'hysteria2', name, server, port, password, tls: true, sni, skipCertVerify,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      obfs: p.obfs ? String(p.obfs) : undefined,
      obfsPassword: p['obfs-password'] ? String(p['obfs-password']) : undefined,
      clashObj: { ...p }
    };
    const sb: Record<string, unknown> = {
      tag: name, type: 'hysteria2', server, server_port: port, password,
      tls: { enabled: true, server_name: sni, insecure: skipCertVerify }
    };
    if (node.obfs) {
      sb.obfs = { type: node.obfs, password: node.obfsPassword };
    }
    node.singboxObj = sb;
    return node;
  }

  // 6. TUIC
  if (type === 'tuic') {
    const uuid = String(p.uuid || '');
    const password = String(p.password || '');
    if (!uuid) throw new Error(`[Clash YAML] TUIC 節點 [${name}] 缺少 uuid`);
    const sni = p.sni ? String(p.sni) : (p.servername ? String(p.servername) : server);
    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;
    const congestion_control = p['congestion-controller'] ? String(p['congestion-controller']) : 'bbr';
    const udp_relay_mode = p['udp-relay-mode'] ? String(p['udp-relay-mode']) : 'native';
    const alpn = Array.isArray(p.alpn) ? p.alpn.map(String) : ['h3'];

    const node: ProxyNode = {
      type: 'tuic', name, server, port, uuid, password, tls: true, sni, skipCertVerify,
      congestion_control, udp_relay_mode, alpn,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      clashObj: { ...p }
    };
    node.singboxObj = {
      tag: name, type: 'tuic', server, server_port: port, uuid, password,
      congestion_control, udp_relay_mode,
      tls: { enabled: true, server_name: sni, alpn, insecure: skipCertVerify }
    };
    return node;
  }

  // 7. WireGuard
  if (type === 'wireguard') {
    const privateKey = String(p['private-key'] || '');
    const publicKey = String(p['public-key'] || '');
    if (!privateKey) throw new Error(`[Clash YAML] WireGuard 節點 [${name}] 缺少 private-key (私鑰)`);
    if (!publicKey) throw new Error(`[Clash YAML] WireGuard 節點 [${name}] 缺少 public-key (公鑰)`);
    if (!p.ip) throw new Error(`[Clash YAML] WireGuard 節點 [${name}] 缺少 ip (內網 IP)`);
    
    const ip = String(p.ip);
    const ipv6 = p.ipv6 ? String(p.ipv6) : undefined;
    const localAddress = [ip.includes('/') ? ip : `${ip}/32`];
    if (ipv6) localAddress.push(ipv6.includes('/') ? ipv6 : `${ipv6}/128`);
    const presharedKey = p['preshared-key'] ? String(p['preshared-key']) : undefined;
    const mtu = parseInt(String(p.mtu || 1420), 10) || 1420;
    const reserved = Array.isArray(p.reserved) ? p.reserved.map(Number) : undefined;
    
    let dnsList: string[] = [];
    if (p.dns) {
      dnsList = Array.isArray(p.dns) ? p.dns.map(String) : [String(p.dns)];
    } else {
      throw new Error(`[Clash YAML] WireGuard 節點 [${name}] 缺少 dns 設定（例如 dns: [10.2.0.1]）`);
    }

    const wgConfig: WireGuardConfig = {
      privateKey, localAddress, publicKey, presharedKey, mtu, reserved, dns: dnsList[0]
    };
    const node: ProxyNode = {
      type: 'wireguard', name, server, port, udp: true, wireguard: wgConfig,
      clashObj: { ...p, dns: dnsList }
    };
    node.singboxObj = {
      type: 'wireguard', tag: name, address: localAddress, private_key: privateKey,
      peers: [{ address: server, port, public_key: publicKey, allowed_ips: ['0.0.0.0/0', '::/0'] }],
      mtu
    };
    return node;
  }

  // 8. 兜底通用節點
  return {
    type, name, server, port, udp: true,
    clashObj: { ...p }
  };
}

// --- 解析完整 Clash YAML 配置中的 proxies 陣列 ---
export function parseClashYaml(content: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  if (!/(^|\n)\s*proxies\s*:/i.test(content)) {
    return [];
  }
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object') return [];
  
  const rawProxies = (parsed as Record<string, unknown>).proxies;
  if (!Array.isArray(rawProxies)) return [];

  for (let i = 0; i < rawProxies.length; i++) {
    const p = rawProxies[i];
    if (!p || typeof p !== 'object') continue;
    const node = parseClashProxyItem(p as Record<string, unknown>, i);
    if (node) nodes.push(node);
  }
  return nodes;
}

// --- 主解析入口 ---
export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content.replace(/^\uFEFF/, '').trim(); 

  if (/\[Interface\]/i.test(plainText) && /\[Peer\]/i.test(plainText)) {
    const wgNodes = parseWireGuardConf(plainText);
    if (wgNodes.length > 0) return wgNodes;
  }

  if (/["']private_key["']/i.test(plainText) && (plainText.includes('{') || plainText.includes('['))) {
    const masqueNodes = parseMasqueConfigs(plainText);
    if (masqueNodes.length > 0) return masqueNodes;
  }

  if (/(^|\n)\s*proxies\s*:/i.test(plainText)) {
    const clashNodes = parseClashYaml(plainText);
    if (clashNodes.length > 0) return clashNodes;
  }
  
  const protocols = ['ss://', 'vmess://', 'vless://', 'trojan://', 'tuic://', 'hysteria2://', 'hy2://', 'anytls://', 'wireguard://', 'warp://', 'masque://'];
  const firstLine = plainText.split(/\r?\n/)[0].trim();
  const isPlainText = protocols.some(p => firstLine.startsWith(p)) || (firstLine.includes('=') && firstLine.includes('wireguard'));
  
  if (!isPlainText) { 
    try {
      let b64 = plainText.replace(/[\s\r\n]+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 > 0) b64 += '=';
      
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const decoded = new TextDecoder('utf-8').decode(bytes);

      if (/\[Interface\]/i.test(decoded) && /\[Peer\]/i.test(decoded)) {
        const wgNodes = parseWireGuardConf(decoded);
        if (wgNodes.length > 0) return wgNodes;
      }

      if (/["']private_key["']/i.test(decoded) && (decoded.includes('{') || decoded.includes('['))) {
        const masqueNodes = parseMasqueConfigs(decoded);
        if (masqueNodes.length > 0) return masqueNodes;
      }

      if (/(^|\n)\s*proxies\s*:/i.test(decoded)) {
        const clashNodes = parseClashYaml(decoded);
        if (clashNodes.length > 0) return clashNodes;
      }
      
      if (decoded && (protocols.some(p => decoded.includes(p)) || decoded.includes('wireguard'))) {
        plainText = decoded.replace(/^\uFEFF/, '').trim(); 
      } else {
        throw new Error("Base64 解碼成功，但內容並非有效的代理節點。");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Base64 暴力解碼失敗: ${msg}`);
    }
  }
  
  const lines = plainText.split(/\r?\n/); 
  const nodes: ProxyNode[] = [];
  
  for (const line of lines) { 
    const l = line.replace(/^[\s\uFEFF\xA0\u200B\u200C\u200D\u200E\u200F]+|[\s\uFEFF\xA0\u200B\u200C\u200D\u200E\u200F]+$/g, ''); 
    if (!l) continue;
    
    if (l.startsWith('ss://')) { nodes.push(parseShadowsocks(l)); } 
    else if (l.startsWith('vless://')) { nodes.push(parseVless(l)); } 
    else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) { nodes.push(parseHysteria2(l)); } 
    else if (l.startsWith('vmess://')) { nodes.push(parseVmess(l)); } 
    else if (l.startsWith('tuic://')) { nodes.push(parseTuic(l)); } 
    else if (l.startsWith('anytls://')) { nodes.push(parseAnytls(l)); } 
    else if (l.startsWith('trojan://')) { nodes.push(parseTrojan(l)); } 
    else if (l.startsWith('wireguard://') || l.startsWith('warp://')) { nodes.push(parseWireGuard(l)); } 
    else if (l.startsWith('masque://')) { nodes.push(parseMasqueUri(l)); } 
    else if (l.includes('=') && l.includes('wireguard')) {
      nodes.push(parseShadowrocketWireGuard(l));
    }
  } 
  
  if (nodes.length === 0) {
    throw new Error("資料獲取成功，但未能成功配對到任何支援的節點格式。");
  }
  
  return nodes;
}
