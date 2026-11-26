// src/parsers/uri.ts
import { ProxyNode } from '../types';
import { safeBase64Decode, tryDecodeURIComponent } from '../utils';
import { parseProxyUri, parsePluginParams, parseEchInfo } from './common';

function stripEarlyDataParam(rawPath: string): string {
  if (!rawPath) return '/';
  const cleaned = rawPath
    .replace(/([?&])ed=[0-9]+(&?)/g, (_, sep: string, trailing: string) => {
      if (sep === '?' && trailing) return '?';
      return trailing ? '&' : '';
    })
    .replace(/\?$/, '');
  return cleaned || '/';
}

export function parseShadowsocks(urlStr: string): ProxyNode {
  let raw = urlStr.replace(/^ss:\/\//i, '');
  const hashIndex = raw.indexOf('#');
  let name = 'Shadowsocks';
  if (hashIndex !== -1) {
    name = tryDecodeURIComponent(raw.substring(hashIndex + 1));
    raw = raw.substring(0, hashIndex);
  }

  let queryPart = '';
  const queryIndex = raw.indexOf('?');
  if (queryIndex !== -1) {
    queryPart = raw.substring(queryIndex + 1);
    raw = raw.substring(0, queryIndex);
  }
  raw = raw.replace(/\/+$/, '');

  const queryParams = new URLSearchParams(queryPart);
  const getParam = (key: string): string => {
    for (const [k, v] of queryParams.entries()) {
      if (k.toLowerCase() === key.toLowerCase()) return v;
    }
    return '';
  };

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

    const decoded = safeBase64Decode(userPart);
    if (decoded && decoded.includes(':')) {
      const firstColon = decoded.indexOf(':');
      method = decoded.slice(0, firstColon);
      password = decoded.slice(firstColon + 1);
    } else {
      const firstColon = userPart.indexOf(':');
      method = firstColon !== -1 ? tryDecodeURIComponent(userPart.slice(0, firstColon)) : userPart;
      password = firstColon !== -1 ? tryDecodeURIComponent(userPart.slice(firstColon + 1)) : '';
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

  const pluginStr = getParam('plugin');
  const security = getParam('security');
  const sni = getParam('sni') || getParam('host') || server;
  const alpnStr = getParam('alpn');
  const fp = getParam('fp') || 'chrome';
  const echInfo = parseEchInfo(getParam('ech'));

  const isTls = Boolean(
    security === 'tls' || pluginStr.includes('obfs=tls') || (alpnStr && alpnStr.length > 0) || echInfo.enabled
  );
  const alpn = alpnStr ? alpnStr.split(',') : undefined;
  const isSs2022 = method.toLowerCase().includes('2022');

  const node: ProxyNode = {
    type: 'shadowsocks',
    name,
    server,
    port,
    cipher: method,
    password,
    udp: true,
    tls: isTls,
    sni,
    alpn,
    fingerprint: fp,
    ech: echInfo.enabled,
    echQueryServerName: echInfo.domain,
    echDoh: echInfo.doh
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
  if (isTls) {
    const tlsObj: Record<string, unknown> = {
      enabled: true,
      server_name: sni,
      utls: { enabled: true, fingerprint: fp }
    };
    if (alpn) tlsObj.alpn = alpn;
    if (echInfo.enabled) {
      const echObj: Record<string, unknown> = { enabled: true };
      if (echInfo.domain) echObj.query_server_name = echInfo.domain;
      tlsObj.ech = echObj;
    }
    sb.tls = tlsObj;
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
    const echOpts: Record<string, unknown> = { enable: true };
    if (node.echQueryServerName) echOpts['query-server-name'] = node.echQueryServerName;
    cl['ech-opts'] = echOpts;
  }
  node.clashObj = cl;

  return node;
}

export function parseVless(urlStr: string): ProxyNode {
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

  const cleanPath = stripEarlyDataParam(rawPath);
  const isXhttp = netType === 'xhttp' || netType === 'splithttp';
  const isGrpc = netType === 'grpc';
  const grpcServiceName = isGrpc ? params.get('serviceName') || '' : undefined;
  const echInfo = parseEchInfo(params.get('ech'));

  const security =
    params.get('security') ||
    (params.get('tls') === '1' || params.get('tls') === 'tls' || echInfo.enabled ? 'tls' : parsed.port === 443 ? 'tls' : 'none');
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
    grpcServiceName,
    sni: sniHost,
    alpn: customAlpn,
    fingerprint: params.get('fp') || 'chrome',
    skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1',
    ech: echInfo.enabled,
    echQueryServerName: echInfo.domain,
    echDoh: echInfo.doh
  };

  if (security === 'reality') {
    const pbk = params.get('pbk') || '';
    const sid = params.get('sid') || '';
    const spx = params.get('spx') || params.get('spider-x') || params.get('spiderX') || '';
    const mlkemParam = params.get('support-x25519mlkem768') || params.get('mlkem768') || params.get('pqc');
    const supportMlkem = mlkemParam !== null ? mlkemParam !== '0' && mlkemParam !== 'false' : true;

    node.reality = {
      publicKey: pbk,
      shortId: sid,
      spiderX: spx || undefined,
      supportX25519Mlkem768: supportMlkem
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
    if (node.ech) {
      const echObj: Record<string, unknown> = { enabled: true };
      if (node.echQueryServerName) {
        echObj.query_server_name = node.echQueryServerName;
      }
      tlsObj.ech = echObj;
    }
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
      service_name: grpcServiceName || ''
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
  if (node.ech) {
    const echOpts: Record<string, unknown> = { enable: true };
    if (node.echQueryServerName) echOpts['query-server-name'] = node.echQueryServerName;
    cl['ech-opts'] = echOpts;
  }
  if (node.flow) cl.flow = node.flow;
  if (node.reality) {
    cl.reality = true;
    const realityOpts: Record<string, unknown> = {
      'public-key': node.reality.publicKey,
      'short-id': node.reality.shortId,
      'support-x25519mlkem768': node.reality.supportX25519Mlkem768 !== false
    };
    if (node.reality.spiderX) {
      realityOpts['spider-x'] = node.reality.spiderX;
    }
    cl['reality-opts'] = realityOpts;
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
    cl['grpc-opts'] = { 'grpc-service-name': grpcServiceName || '' };
  }
  node.clashObj = cl;

  return node;
}

export function parseHysteria2(urlStr: string): ProxyNode {
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

export function parseTuic(urlStr: string): ProxyNode {
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

export function parseAnytls(urlStr: string): ProxyNode {
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

interface RawVmessJson {
  ps?: string;
  add?: string;
  port?: string | number;
  id?: string;
  aid?: string | number;
  scy?: string;
  net?: string;
  path?: string;
  host?: string;
  tls?: string;
  sni?: string;
}

export function parseVmess(vmessUrl: string): ProxyNode {
  let b64 = vmessUrl.replace(/^vmess:\/\//i, '');
  let hashName = '';
  const hashIndex = b64.indexOf('#');
  if (hashIndex !== -1) {
    hashName = tryDecodeURIComponent(b64.substring(hashIndex + 1));
    b64 = b64.substring(0, hashIndex);
  }

  const jsonStr = safeBase64Decode(b64);
  if (!jsonStr) throw new Error('[VMess] Base64 解碼失敗');

  const config = JSON.parse(jsonStr) as RawVmessJson;
  const name = config.ps || hashName || 'VMess';
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
  const cleanPath = stripEarlyDataParam(rawPath);

  const isTls = config.tls === 'tls';

  const node: ProxyNode = {
    type: 'vmess',
    name,
    server: config.add,
    port: parseInt(String(config.port || ''), 10) || (isTls ? 443 : 80),
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
    alterId: parseInt(String(config.aid || 0), 10) || 0,
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

export function parseTrojan(urlStr: string): ProxyNode {
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
    const echObj: Record<string, unknown> = { enabled: true };
    if (node.echQueryServerName) echObj.query_server_name = node.echQueryServerName;
    tlsObj.ech = echObj;
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
    const echOpts: Record<string, unknown> = { enable: true };
    if (node.echQueryServerName) echOpts['query-server-name'] = node.echQueryServerName;
    cl['ech-opts'] = echOpts;
  }
  node.clashObj = cl;

  return node;
}
