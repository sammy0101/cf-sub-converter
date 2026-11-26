// src/parsers/wireguard.ts
import { ProxyNode, WireGuardConfig } from '../types';
import { parseProxyUri } from './common';

export function parseShadowrocketWireGuard(line: string): ProxyNode {
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

  const localAddress = ip.includes('/') ? [ip] : [`${ip}/32`];
  const dnsList = dns ? dns.split(',').map(d => d.trim()).filter(Boolean) : [];

  const wgConfig: WireGuardConfig = {
    privateKey,
    localAddress,
    publicKey,
    presharedKey,
    mtu,
    dns: dns || undefined,
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

  const clashObj: Record<string, unknown> = {
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
    'remote-dns-resolve': true
  };
  if (dnsList.length > 0) clashObj.dns = dnsList;
  node.clashObj = clashObj;

  return node;
}

export function parseWireGuardConf(text: string): ProxyNode[] {
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
    const dnsList = rawDns ? rawDns.split(',').map(s => s.trim()).filter(Boolean) : [];

    const wgConfig: WireGuardConfig = {
      privateKey,
      localAddress,
      publicKey,
      presharedKey,
      mtu,
      dns: rawDns || undefined
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

    const clashObj: Record<string, unknown> = {
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
      'remote-dns-resolve': true
    };
    if (dnsList.length > 0) clashObj.dns = dnsList;
    node.clashObj = clashObj;

    nodes.push(node);
  }

  return nodes;
}

export function parseWireGuard(urlStr: string): ProxyNode {
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

  const localIps = rawIp.split(',').map(s => (s.trim().includes('/') ? s.trim() : `${s.trim()}/32`));
  const dnsList = rawDns ? rawDns.split(',').map(d => d.trim()).filter(Boolean) : [];

  const wgConfig: WireGuardConfig = {
    privateKey,
    localAddress: localIps,
    publicKey,
    presharedKey,
    mtu,
    reserved,
    dns: rawDns || undefined
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

  const clashObj: Record<string, unknown> = {
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
    'remote-dns-resolve': true
  };
  if (dnsList.length > 0) clashObj.dns = dnsList;
  node.clashObj = clashObj;

  return node;
}
