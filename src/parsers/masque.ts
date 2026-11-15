// src/parsers/masque.ts
import { ProxyNode, MasqueConfig } from '../types';
import { parseProxyUri } from './common';

export interface RawMasqueConfig {
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

export function buildMasqueNode(config: RawMasqueConfig, index = 0): ProxyNode {
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
  const uri = config.uri && String(config.uri).trim() ? String(config.uri).trim() : 'https://cloudflareaccess.com';
  const customSni = config.sni || config.servername || config.server_name;
  const sni = customSni && String(customSni).trim() ? String(customSni).trim() : 'www.microsoft.com';

  const rawCc =
    config.cca ||
    config.cc ||
    config.congestion_control ||
    config.congestion_controller ||
    config['congestion-controller'];
  const congestionController = rawCc && String(rawCc).trim() ? String(rawCc).trim() : 'bbr';
  const mtu = config.mtu ? parseInt(String(config.mtu), 10) || 1280 : 1280;

  let dnsList: string[] = [];
  if (Array.isArray(config.dns) && config.dns.length > 0) {
    dnsList = config.dns.map(d => String(d).trim()).filter(Boolean);
  } else if (typeof config.dns === 'string' && config.dns.trim()) {
    dnsList = config.dns.split(',').map(d => d.trim()).filter(Boolean);
  } else {
    dnsList = ['1.1.1.1', '8.8.8.8'];
  }

  const remoteDnsResolve =
    config['remote-dns-resolve'] !== undefined ? Boolean(config['remote-dns-resolve']) : true;

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
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      parsed.forEach((item, idx) => {
        const n = buildMasqueNode(item as RawMasqueConfig, idx);
        if (n) nodes.push(n);
      });
      if (nodes.length > 0) return nodes;
    } else if (typeof parsed === 'object' && parsed !== null) {
      const n = buildMasqueNode(parsed as RawMasqueConfig, 0);
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

export function parseMasqueUri(urlStr: string): ProxyNode {
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

  const uri = params.get('uri') && params.get('uri')!.trim() ? params.get('uri')!.trim() : 'https://cloudflareaccess.com';
  const sni = params.get('sni') && params.get('sni')!.trim() ? params.get('sni')!.trim() : 'www.microsoft.com';

  const rawCc =
    params.get('cca') ||
    params.get('cc') ||
    params.get('congestion_control') ||
    params.get('congestion_controller') ||
    params.get('congestion-controller');
  const congestionController = rawCc && rawCc.trim() ? rawCc.trim() : 'bbr';

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
