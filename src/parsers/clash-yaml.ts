// src/parsers/clash-yaml.ts
import yaml from 'js-yaml';
import { ProxyNode, WireGuardConfig } from '../types';
import { parseEchInfo } from './common';
import { RawMasqueConfig, buildMasqueNode } from './masque';

export function parseClashProxyItem(p: Record<string, unknown>, index: number): ProxyNode {
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
    const sni = p.servername ? String(p.servername).trim() : p.sni ? String(p.sni) : server;
    const flow = p.flow ? String(p.flow).trim() : undefined;
    const network = p.network
      ? String(p.network).toLowerCase()
      : p['ws-opts']
        ? 'ws'
        : p['xhttp-opts']
          ? 'xhttp'
          : p['grpc-opts']
            ? 'grpc'
            : 'tcp';

    const wsOpts = p['ws-opts'] as Record<string, unknown> | undefined;
    const wsPath = wsOpts?.path ? String(wsOpts.path) : undefined;
    const wsHeaders = wsOpts?.headers as Record<string, string> | undefined;

    const xhttpOpts = (p['xhttp-opts'] || p['splithttp-opts']) as Record<string, unknown> | undefined;
    const xhttpPath = xhttpOpts?.path ? String(xhttpOpts.path) : undefined;
    const xhttpHost = xhttpOpts?.host ? String(xhttpOpts.host) : undefined;
    const xhttpMode = xhttpOpts?.mode ? String(xhttpOpts.mode) : undefined;

    const grpcOpts = p['grpc-opts'] as Record<string, unknown> | undefined;
    const grpcServiceName = grpcOpts?.['grpc-service-name'] ? String(grpcOpts['grpc-service-name']) : undefined;

    const isXhttp = network === 'xhttp' || network === 'splithttp';
    const isGrpc = network === 'grpc';

    const realityOpts = p['reality-opts'] as Record<string, unknown> | undefined;
    const reality =
      p.reality || realityOpts
        ? {
            publicKey: String(realityOpts?.['public-key'] || ''),
            shortId: String(realityOpts?.['short-id'] || ''),
            spiderX: realityOpts?.['spider-x'] ? String(realityOpts['spider-x']) : undefined,
            supportX25519Mlkem768:
              realityOpts?.['support-x25519mlkem768'] !== undefined
                ? Boolean(realityOpts['support-x25519mlkem768'])
                : true
          }
        : undefined;

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
      const rawDoh = echOpts['doh-server'] || echOpts.doh;
      if (rawDoh && /^https?:\/\//i.test(String(rawDoh))) {
        echDoh = String(rawDoh);
      }
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

    if (reality) {
      const ro = { ...((clashObjCopy['reality-opts'] as Record<string, unknown>) || {}) };
      ro['public-key'] = reality.publicKey;
      ro['short-id'] = reality.shortId;
      if (reality.spiderX) ro['spider-x'] = reality.spiderX;
      if (ro['support-x25519mlkem768'] === undefined) {
        ro['support-x25519mlkem768'] = true;
      }
      clashObjCopy['reality-opts'] = ro;
      clashObjCopy.reality = true;
    }

    const node: ProxyNode = {
      type: 'vless',
      name,
      server,
      port,
      uuid,
      tls,
      sni,
      network,
      flow,
      wsPath,
      wsHeaders,
      reality,
      xhttpPath,
      xhttpHost,
      xhttpMode,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      skipCertVerify,
      fingerprint,
      alpn,
      ech: echEnabled,
      echQueryServerName: echDomain,
      echDoh,
      clashObj: clashObjCopy
    };

    const sb: Record<string, unknown> = {
      tag: name,
      type: 'vless',
      server,
      server_port: port,
      uuid,
      packet_encoding: 'xudp'
    };
    if (tls) {
      const tlsObj: Record<string, unknown> = {
        enabled: true,
        server_name: sni,
        insecure: skipCertVerify,
        utls: { enabled: true, fingerprint }
      };
      if (alpn) tlsObj.alpn = alpn;
      if (echEnabled) {
        const echObj: Record<string, unknown> = { enabled: true };
        if (echDomain) echObj.query_server_name = echDomain;
        tlsObj.ech = echObj;
      }
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
    } else if (isXhttp) {
      sb.transport = {
        type: 'splithttp',
        path: xhttpPath || '/',
        headers: xhttpHost ? { Host: xhttpHost } : undefined,
        mode: xhttpMode || 'auto'
      };
    } else if (isGrpc) {
      sb.transport = {
        type: 'grpc',
        service_name: grpcServiceName || ''
      };
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
      type: 'shadowsocks',
      name,
      server,
      port,
      cipher,
      password,
      udp,
      clashObj: { ...p }
    };
    node.singboxObj = {
      tag: name,
      type: 'shadowsocks',
      server,
      server_port: port,
      method: cipher,
      password
    };
    return node;
  }

  // 3. VMess
  if (type === 'vmess') {
    const uuid = String(p.uuid || '');
    if (!uuid) throw new Error(`[Clash YAML] VMess 節點 [${name}] 缺少 uuid`);
    const tls = Boolean(p.tls);
    const sni = p.servername ? String(p.servername) : p.sni ? String(p.sni) : server;
    const network = p.network ? String(p.network).toLowerCase() : p['ws-opts'] ? 'ws' : 'tcp';
    const wsOpts = p['ws-opts'] as Record<string, unknown> | undefined;
    const wsPath = wsOpts?.path ? String(wsOpts.path) : undefined;
    const wsHeaders = wsOpts?.headers as Record<string, string> | undefined;

    const node: ProxyNode = {
      type: 'vmess',
      name,
      server,
      port,
      uuid,
      tls,
      sni,
      network,
      wsPath,
      wsHeaders,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      clashObj: { ...p, network }
    };
    const sb: Record<string, unknown> = {
      tag: name,
      type: 'vmess',
      server,
      server_port: port,
      uuid,
      security: 'auto',
      packet_encoding: 'xudp'
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
    const sni = p.sni ? String(p.sni) : p.servername ? String(p.servername) : server;
    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;

    const node: ProxyNode = {
      type: 'trojan',
      name,
      server,
      port,
      password,
      tls: true,
      sni,
      skipCertVerify,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      clashObj: { ...p }
    };
    node.singboxObj = {
      tag: name,
      type: 'trojan',
      server,
      server_port: port,
      password,
      tls: { enabled: true, server_name: sni, insecure: skipCertVerify }
    };
    return node;
  }

  // 5. Hysteria 2
  if (type === 'hysteria2' || type === 'hy2') {
    const password = String(p.password || p.auth || '');
    if (!password) throw new Error(`[Clash YAML] Hysteria2 節點 [${name}] 缺少 password / auth`);
    const sni = p.sni ? String(p.sni) : p.servername ? String(p.servername) : server;
    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;

    const node: ProxyNode = {
      type: 'hysteria2',
      name,
      server,
      port,
      password,
      tls: true,
      sni,
      skipCertVerify,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      obfs: p.obfs ? String(p.obfs) : undefined,
      obfsPassword: p['obfs-password'] ? String(p['obfs-password']) : undefined,
      clashObj: { ...p }
    };
    const sb: Record<string, unknown> = {
      tag: name,
      type: 'hysteria2',
      server,
      server_port: port,
      password,
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
    const sni = p.sni ? String(p.sni) : p.servername ? String(p.servername) : server;
    const skipCertVerify = p['skip-cert-verify'] !== undefined ? Boolean(p['skip-cert-verify']) : false;
    const congestion_control = p['congestion-controller'] ? String(p['congestion-controller']) : 'bbr';
    const udp_relay_mode = p['udp-relay-mode'] ? String(p['udp-relay-mode']) : 'native';
    const alpn = Array.isArray(p.alpn) ? p.alpn.map(String) : ['h3'];

    const node: ProxyNode = {
      type: 'tuic',
      name,
      server,
      port,
      uuid,
      password,
      tls: true,
      sni,
      skipCertVerify,
      congestion_control,
      udp_relay_mode,
      alpn,
      udp: p.udp !== undefined ? Boolean(p.udp) : true,
      clashObj: { ...p }
    };
    node.singboxObj = {
      tag: name,
      type: 'tuic',
      server,
      server_port: port,
      uuid,
      password,
      congestion_control,
      udp_relay_mode,
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
      privateKey,
      localAddress,
      publicKey,
      presharedKey,
      mtu,
      reserved,
      dns: dnsList[0]
    };
    const node: ProxyNode = {
      type: 'wireguard',
      name,
      server,
      port,
      udp: true,
      wireguard: wgConfig,
      clashObj: { ...p, dns: dnsList }
    };
    node.singboxObj = {
      type: 'wireguard',
      tag: name,
      address: localAddress,
      private_key: privateKey,
      peers: [{ address: server, port, public_key: publicKey, allowed_ips: ['0.0.0.0/0', '::/0'] }],
      mtu
    };
    return node;
  }

  // 8. 兜底通用節點
  return {
    type,
    name,
    server,
    port,
    udp: true,
    clashObj: { ...p }
  };
}

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
