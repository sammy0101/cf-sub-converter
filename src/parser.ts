// src/parser.ts
import { ProxyNode, WireGuardConfig } from "./types";
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

function isIpAddress(host: string): boolean {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host) || /^[a-fA-F0-9:]+$/.test(host);
}

// --- 解析 WireGuard 官方 .conf 格式 ---
function parseWireGuardConf(text: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  const sections = text.split(/(?=\[Interface\])/i).filter(s => s.trim().length > 0);

  for (const sec of sections) {
    if (!/\[Interface\]/i.test(sec) || !/\[Peer\]/i.test(sec)) continue;

    const getVal = (key: string): string => {
      const match = sec.match(new RegExp(`^[ \\t]*${key}[ \\t]*=[ \\t]*(.*?)[ \\t]*(?:#.*)?$`, 'mi'));
      return match ? match[1].trim() : '';
    };

    let name = '';
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

    const privateKey = getVal('PrivateKey');
    const addressStr = getVal('Address');
    const localAddress = addressStr ? addressStr.split(',').map(s => s.trim()) : ['10.2.0.2/32'];
    const publicKey = getVal('PublicKey');
    const presharedKey = getVal('PresharedKey') || undefined;
    const endpoint = getVal('Endpoint');
    const mtuStr = getVal('MTU');
    const mtu = mtuStr ? parseInt(mtuStr, 10) : 1420;
    
    const keepaliveStr = getVal('PersistentKeepalive');
    const keepalive = keepaliveStr ? parseInt(keepaliveStr, 10) : 25;

    if (!endpoint || !privateKey || !publicKey) continue;

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

    if (!name) {
      name = `Proton-WG-${server}`;
    }

    const wgConfig: WireGuardConfig = {
      privateKey,
      localAddress,
      publicKey,
      presharedKey,
      mtu
    };

    const node: ProxyNode = {
      type: 'wireguard',
      name,
      server,
      port,
      udp: true,
      wireguard: wgConfig
    };

    const hasIpv6 = localAddress.some(addr => addr.includes(':'));
    const allowedIps = ['0.0.0.0/0'];
    if (hasIpv6) {
      allowedIps.push('::/0');
    }

    // 💥 移除 detour: direct 以消除 empty direct outbound 語法錯誤
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
          allowed_ips: allowedIps,
          pre_shared_key: presharedKey,
          persistent_keepalive_interval: keepalive
        }
      ],
      mtu: mtu || 1420
    };

    // Clash Meta Outbound
    node.clashObj = {
      name,
      type: 'wireguard',
      server: node.server,
      port: node.port,
      ip: localAddress[0]?.split('/')[0] || '10.2.0.2',
      ipv6: localAddress[1]?.split('/')[0],
      'public-key': publicKey,
      'private-key': privateKey,
      'preshared-key': presharedKey,
      mtu,
      udp: true,
      'remote-dns-resolve': true
    };

    nodes.push(node);
  }

  return nodes;
}

// --- 解析 Shadowsocks ---
function parseShadowsocks(urlStr: string): ProxyNode | null {
  try {
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
      if (lastColonIndex === -1) return null;
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
    const port = parseInt(portStr, 10);
    if (isNaN(port)) return null;

    const pluginStr = getParam(urlStr, 'plugin');
    const security = getParam(urlStr, 'security');
    const sni = getParam(urlStr, 'sni') || getParam(urlStr, 'host') || server;
    const alpnStr = getParam(urlStr, 'alpn');
    const fp = getParam(urlStr, 'fp') || 'chrome';
    const isEch = Boolean(getParam(urlStr, 'ech'));

    const isTls = security === 'tls' || urlStr.includes('obfs=tls') || (alpnStr && alpnStr.length > 0) || isEch;
    const alpn = alpnStr ? alpnStr.split(',') : undefined;
    const isSs2022 = method.toLowerCase().includes('2022');

    const node: ProxyNode = {
      type: 'shadowsocks', name, server, port, cipher: method, password, udp: true,
      tls: isTls, sni, alpn, fingerprint: fp, ech: isEch
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
    if (isEch) {
      cl['ech-opts'] = { enable: true };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 VLESS ---
function parseVless(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'VLESS';
    
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

    if (netType === 'ws' && !rawPath) {
      rawPath = '/';
    }
    if (rawPath && !rawPath.startsWith('/')) {
      rawPath = '/' + rawPath;
    }

    let earlyDataLength: number | undefined = undefined;
    const edMatch = rawPath.match(/[?&]ed=([0-9]+)/) || (params.get('ed') ? [null, params.get('ed')] : null);
    if (edMatch && edMatch[1]) {
      earlyDataLength = parseInt(edMatch[1], 10);
    }

    const cleanPath = rawPath ? (rawPath.replace(/[?&]ed=[0-9]+/g, '').replace(/\?$/, '') || '/') : '/';

    const isXhttp = netType === 'xhttp' || netType === 'splithttp';
    const isGrpc = netType === 'grpc';
    const isEch = Boolean(params.get('ech'));

    const security = params.get('security') || (params.get('tls') === '1' || params.get('tls') === 'tls' || isEch ? 'tls' : (parsed.port === 443 ? 'tls' : 'none'));
    const isTls = security === 'tls' || security === 'reality' || isEch;
    const hostHeader = params.get('host') || params.get('sni') || parsed.hostname;
    const sniHost = params.get('sni') || params.get('host') || parsed.hostname;

    const customAlpn = params.get('alpn') ? params.get('alpn')!.split(',') : (netType === 'ws' ? ['http/1.1'] : undefined);
    const singboxServer = (isEch && isIpAddress(parsed.hostname) && sniHost) ? sniHost : parsed.hostname;

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
      ech: isEch
    };

    if (security === 'reality') {
      node.reality = {
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || ''
      };
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
    
    // Sing-Box Outbound
    const sb: Record<string, unknown> = {
      tag: name,
      type: 'vless',
      server: singboxServer,
      server_port: node.port,
      uuid: node.uuid,
      packet_encoding: 'xudp'
    };

    if (node.tls) {
      const tlsObj: Record<string, unknown> = {
        enabled: true,
        server_name: node.sni || node.server,
        alpn: node.alpn || (node.network === 'ws' ? ['http/1.1'] : undefined),
        insecure: node.skipCertVerify,
        utls: { enabled: true, fingerprint: node.fingerprint }
      };

      if (node.ech) {
        tlsObj.ech = { enabled: true };
      }

      if (node.reality) {
        tlsObj.reality = {
          enabled: true,
          public_key: node.reality.publicKey,
          short_id: node.reality.shortId
        };
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
    
    // Clash Meta Outbound
    const cl: Record<string, unknown> = {
      name,
      type: 'vless',
      server: node.server,
      port: node.port,
      uuid: node.uuid,
      udp: true,
      tls: node.tls,
      servername: node.sni || node.server,
      alpn: node.alpn,
      'skip-cert-verify': node.skipCertVerify,
      'client-fingerprint': node.fingerprint
    };
    if (node.ech) {
      cl['ech-opts'] = { enable: true };
    }
    if (node.flow) cl.flow = node.flow; 
    if (node.reality) {
      cl.reality = true;
      cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId };
    }
    if (node.network === 'ws') {
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
  } catch {
    return null;
  }
}

// --- 解析 WireGuard (URI 格式) ---
function parseWireGuard(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 2408);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'WireGuard';

    const privateKey = parsed.username;
    const localIps = (params.get('ip') || params.get('address') || '172.16.0.2/32,fd00::2/128').split(',');
    const publicKey = params.get('public_key') || params.get('pk') || '';
    const presharedKey = params.get('preshared_key') || params.get('psk') || undefined;
    const mtu = parseInt(params.get('mtu') || '1420', 10);
    const reserved = params.get('reserved') ? params.get('reserved')!.split(',').map(n => parseInt(n.trim(), 10)) : undefined;

    const wgConfig: WireGuardConfig = {
      privateKey,
      localAddress: localIps,
      publicKey,
      presharedKey,
      mtu,
      reserved
    };

    const node: ProxyNode = {
      type: 'wireguard',
      name,
      server: parsed.hostname,
      port: parsed.port,
      udp: true,
      wireguard: wgConfig
    };

    const hasIpv6 = localIps.some(ip => ip.includes(':'));
    const allowedIps = ['0.0.0.0/0'];
    if (hasIpv6) {
      allowedIps.push('::/0');
    }

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
          allowed_ips: allowedIps,
          pre_shared_key: presharedKey,
          persistent_keepalive_interval: 25
        }
      ],
      mtu: mtu || 1420
    };

    node.clashObj = {
      name,
      type: 'wireguard',
      server: node.server,
      port: node.port,
      ip: localIps[0]?.split('/')[0] || '10.2.0.2',
      ipv6: localIps[1]?.split('/')[0],
      'public-key': publicKey,
      'private-key': privateKey,
      'preshared-key': presharedKey,
      mtu,
      udp: true,
      'remote-dns-resolve': true
    };

    return node;
  } catch {
    return null;
  }
}

// --- 解析 Hysteria2 ---
function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'Hy2';
    
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
  } catch {
    return null;
  }
}

// --- 解析 TUIC ---
function parseTuic(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'TUIC';

    const congestion_control = params.get('congestion_control') || 'bbr';
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
  } catch {
    return null;
  }
}

// --- 解析 AnyTLS ---
function parseAnytls(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'AnyTLS';
    const uuid = parsed.username;
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
  } catch {
    return null;
  }
}

// --- 解析 VMess ---
function parseVmess(vmessUrl: string): ProxyNode | null {
  try {
    const b64 = vmessUrl.replace('vmess://', '');
    const jsonStr = safeBase64Decode(b64);
    const config = JSON.parse(jsonStr);
    const name = config.ps || 'VMess';
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
        alpn: netType === 'ws' ? ['http/1.1'] : undefined,
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
  } catch {
    return null;
  }
}

// --- 解析 Trojan ---
function parseTrojan(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'Trojan';
    const isEch = Boolean(params.get('ech'));

    const node: ProxyNode = {
      type: 'trojan',
      name,
      server: parsed.hostname,
      port: parsed.port,
      password: parsed.username,
      tls: true,
      sni: params.get('sni') || params.get('peer') || parsed.hostname,
      skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1',
      ech: isEch
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
  } catch {
    return null;
  }
}

// --- 主解析入口 ---
export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content.replace(/^\uFEFF/, '').trim(); 

  if (/\[Interface\]/i.test(plainText) && /\[Peer\]/i.test(plainText)) {
    const wgNodes = parseWireGuardConf(plainText);
    if (wgNodes.length > 0) {
      return wgNodes;
    }
  }
  
  const protocols = ['ss://', 'vmess://', 'vless://', 'trojan://', 'tuic://', 'hysteria2://', 'hy2://', 'anytls://', 'wireguard://', 'warp://'];
  const firstLine = plainText.split(/\r?\n/)[0].trim();
  const isPlainText = protocols.some(p => firstLine.startsWith(p));
  
  if (!isPlainText) { 
    try {
      let b64 = plainText.replace(/[\s\r\n]+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      b64 = b64.replace(/=+$/, '');
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
      
      if (decoded && protocols.some(p => decoded.includes(p))) {
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
    
    if (l.startsWith('ss://')) { const n = parseShadowsocks(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vless://')) { const n = parseVless(l); if (n) nodes.push(n); } 
    else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) { const n = parseHysteria2(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vmess://')) { const n = parseVmess(l); if (n) nodes.push(n); } 
    else if (l.startsWith('tuic://')) { const n = parseTuic(l); if (n) nodes.push(n); } 
    else if (l.startsWith('anytls://')) { const n = parseAnytls(l); if (n) nodes.push(n); } 
    else if (l.startsWith('trojan://')) { const n = parseTrojan(l); if (n) nodes.push(n); }
    else if (l.startsWith('wireguard://') || l.startsWith('warp://')) { const n = parseWireGuard(l); if (n) nodes.push(n); }
  } 
  
  if (nodes.length === 0) {
    throw new Error("資料獲取成功，但未能成功配對到任何支援的節點格式。");
  }
  
  return nodes;
}
