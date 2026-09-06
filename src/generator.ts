// src/generator.ts
import yaml from 'js-yaml';
import { Env, ProxyNode } from './types';
import { REMOTE_CONFIG, FALLBACK_SINGBOX_RULES, FALLBACK_CLASH_RULES } from './constants';
import { utf8ToBase64 } from './utils';

// --- 明文 URI 格式導出 ---
export function toRawLinks(nodes: ProxyNode[]): string {
  const links = nodes.map(node => {
    try {
      if (node.type === 'vless') {
        const params = new URLSearchParams();
        params.set('security', node.reality ? 'reality' : (node.tls ? 'tls' : 'none'));
        params.set('type', node.network || 'tcp');
        if (node.flow) params.set('flow', node.flow);
        if (node.sni) params.set('sni', node.sni);
        if (node.fingerprint) params.set('fp', node.fingerprint);
        if (node.ech) params.set('ech', 'https://cloudflare-dns.com/dns-query');
        if (node.reality) { params.set('pbk', node.reality.publicKey); params.set('sid', node.reality.shortId); }
        if (node.network === 'ws') { if (node.wsPath) params.set('path', node.wsPath); if (node.wsHeaders?.Host) params.set('host', node.wsHeaders.Host); }
        if (node.network === 'xhttp' || node.network === 'splithttp') {
          if (node.xhttpPath) params.set('path', node.xhttpPath);
          if (node.xhttpHost) params.set('host', node.xhttpHost);
          if (node.xhttpMode) params.set('mode', node.xhttpMode);
        }
        return `vless://${node.uuid}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'hysteria2') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.obfs) { params.set('obfs', node.obfs); if (node.obfsPassword) params.set('obfs-password', node.obfsPassword); }
        if (node.skipCertVerify) params.set('insecure', '1');
        return `hysteria2://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'vmess') {
        const vmessObj = {
          v: "2", ps: node.name, add: node.server, port: node.port, id: node.uuid,
          aid: (node.clashObj as Record<string, unknown>)?.alterId || 0, scy: "auto", net: node.network, type: "none",
          host: node.wsHeaders?.Host || "", path: node.wsPath || "",
          tls: node.tls ? "tls" : "", sni: node.sni || ""
        };
        return 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
      }
      if (node.type === 'shadowsocks') {
        const method = encodeURIComponent(node.cipher || '');
        const pass = encodeURIComponent(node.password || '');
        const params = new URLSearchParams();
        if (node.tls) {
          params.set('security', 'tls');
          if (node.sni) params.set('sni', node.sni);
          if (node.alpn) params.set('alpn', node.alpn.join(','));
          if (node.fingerprint) params.set('fp', node.fingerprint);
          if (node.ech) params.set('ech', '1');
          params.set('type', node.network || 'tcp');
        }
        const clashPlugin = (node.clashObj as Record<string, unknown>)?.plugin as string | undefined;
        if (clashPlugin && !node.tls) {
          const pluginOpts = (node.clashObj as Record<string, unknown>)?.['plugin-opts'] as Record<string, string> | undefined;
          const optStr = pluginOpts ? ';' + new URLSearchParams(pluginOpts).toString().replace(/&/g, ';') : '';
          params.set('plugin', clashPlugin + optStr);
        }
        const query = params.toString();
        return `ss://${method}:${pass}@${node.server}:${node.port}${query ? '/?' + query : ''}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'tuic') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.congestion_control) params.set('congestion_control', node.congestion_control);
        if (node.udp_relay_mode) params.set('udp_relay_mode', node.udp_relay_mode);
        if (node.alpn && node.alpn.length > 0) params.set('alpn', node.alpn.join(','));
        if (node.skipCertVerify) params.set('allow_insecure', '1');
        return `tuic://${node.uuid || ''}:${node.password || ''}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'anytls') {
        const params = new URLSearchParams();
        params.set('security', 'tls');
        if (node.sni) params.set('sni', node.sni);
        params.set('insecure', node.skipCertVerify ? '1' : '0');
        if (node.fingerprint) params.set('fp', node.fingerprint);
        if (node.alpn && node.alpn.length > 0) params.set('alpn', node.alpn.join(','));
        params.set('type', 'tcp'); 
        return `anytls://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'trojan') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.skipCertVerify) params.set('allowInsecure', '1');
        if (node.ech) params.set('ech', '1');
        return `trojan://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      // 💥 WireGuard Shadowrocket / 現代客戶端雙相容輸出
      if (node.type === 'wireguard' && node.wireguard) {
        const wg = node.wireguard;
        const params = new URLSearchParams();
        params.set('publickey', wg.publicKey || '');
        params.set('privatekey', wg.privateKey || '');
        params.set('address', wg.localAddress.join(','));
        if (wg.dns) params.set('dns', wg.dns);
        if (wg.presharedKey) params.set('presharedkey', wg.presharedKey);
        if (wg.mtu) params.set('mtu', String(wg.mtu));
        if (wg.reserved) params.set('reserved', wg.reserved.join(','));
        return `wireguard://${encodeURIComponent(wg.privateKey)}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'masque' && node.masque) {
        const m = node.masque;
        const params = new URLSearchParams();
        params.set('public_key', m.publicKey);
        if (m.localIpv4) params.set('ip', m.localIpv4);
        if (m.localIpv6) params.set('ipv6', m.localIpv6);
        if (m.mtu) params.set('mtu', String(m.mtu));
        return `masque://${encodeURIComponent(m.privateKey)}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      return null;
    } catch {
      return null;
    }
  }).filter((l): l is string => Boolean(l));

  return links.join('\n');
}

// 導出 Base64 訂閱
export function toBase64(nodes: ProxyNode[]): string {
  const rawLinks = toRawLinks(nodes);
  return utf8ToBase64(rawLinks);
}

// --- 動態 SWR 模板拉取機制 ---
async function fetchTemplateWithSWR(
  url: string,
  cacheType: 'singbox' | 'clash',
  fallbackJsonStr: string,
  env?: Env,
  forceRefresh = false
): Promise<string> {
  const dynamicKey = `tpl:${cacheType}`;

  if (!forceRefresh && env?.SUB_CACHE) {
    try {
      const cached = await env.SUB_CACHE.get(dynamicKey);
      if (cached) {
        fetch(`${url}?t=${Date.now()}`, {
          headers: { 'User-Agent': 'v2rayNG/1.8.5' }
        }).then(async res => {
          if (res.ok) {
            const freshText = await res.text();
            await env.SUB_CACHE.put(dynamicKey, freshText, { expirationTtl: 600 });
          }
        }).catch(() => {});
        return cached;
      }
    } catch {}
  }

  try {
    const resp = await fetch(`${url}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (resp.ok) {
      const text = await resp.text();
      if (env?.SUB_CACHE) {
        await env.SUB_CACHE.put(dynamicKey, text, { expirationTtl: 600 });
      }
      return text;
    }
  } catch {}

  return fallbackJsonStr;
}

// --- Sing-Box 配置生成 ---
export async function toSingBoxWithTemplate(nodes: ProxyNode[], env?: Env, forceRefresh = false): Promise<string> {
  const text = await fetchTemplateWithSWR(REMOTE_CONFIG.singbox, 'singbox', FALLBACK_SINGBOX_RULES, env, forceRefresh);
  const config = JSON.parse(text);
  
  if (!config.http_clients || !Array.isArray(config.http_clients) || config.http_clients.length === 0) {
    config.http_clients = [{ tag: 'default' }];
  } else {
    config.http_clients.forEach((hc: Record<string, unknown>) => {
      if (hc.detour === 'direct' || hc.detour === 'DIRECT') {
        delete hc.detour;
      }
    });
  }

  if (config.dns) {
    config.dns.final = 'local-dns';
    if (Array.isArray(config.dns.servers)) {
      config.dns.servers = config.dns.servers.filter((s: Record<string, unknown>) => s.type !== 'rcode');
      config.dns.servers.forEach((s: Record<string, unknown>) => {
        if (s.detour === 'direct') delete s.detour;
      });
    }
    if (Array.isArray(config.dns.rules)) {
      config.dns.rules = config.dns.rules.filter((r: Record<string, unknown>) => !('outbound' in r));
    }
  }

  if (!config.route) config.route = {};
  config.route.default_domain_resolver = 'local-dns';
  config.route.default_http_client = 'default';
  
  if (Array.isArray(config.route.rule_set)) {
    config.route.rule_set.forEach((rs: Record<string, unknown>) => {
      delete rs.download_detour;
    });
  }

  if (Array.isArray(config.inbounds)) {
    config.inbounds.forEach((ib: Record<string, unknown>) => {
      delete ib.sniff;
      delete ib.sniff_override_destination;
    });
  }

  const outbounds: Record<string, unknown>[] = [];
  const allNodeTags: string[] = [];

  nodes.forEach(n => {
    allNodeTags.push(n.name);
    if (n.type === 'wireguard' && n.wireguard) {
      const wg = n.wireguard;
      const wgOutbound: Record<string, unknown> = {
        type: 'wireguard',
        tag: n.name,
        server: n.server,
        server_port: n.port,
        local_address: wg.localAddress,
        private_key: wg.privateKey,
        peer_public_key: wg.publicKey,
        mtu: wg.mtu || 1420
      };
      if (wg.presharedKey) wgOutbound.pre_shared_key = wg.presharedKey;
      outbounds.push(wgOutbound);
    } else {
      const obj = JSON.parse(JSON.stringify(n.singboxObj));
      if (obj.transport?.type === 'ws' && obj.tls?.enabled === true && (!obj.tls.alpn || obj.tls.alpn.length === 0)) {
        obj.tls.alpn = ['http/1.1'];
      }
      outbounds.push(obj);
    }
  });

  if (!Array.isArray(config.outbounds)) config.outbounds = [];
  config.outbounds.push(...outbounds);

  const lowRateTags = nodes.filter(n => n.multiplier !== undefined && n.multiplier < 1.0).map(n => n.name);
  const iplcTags = nodes.filter(n => n.isIplc).map(n => n.name);

  if (lowRateTags.length > 0) {
    config.outbounds.unshift({
      type: 'selector',
      tag: '🏎️ 低倍率節點',
      outbounds: lowRateTags
    });
  }

  if (iplcTags.length > 0) {
    config.outbounds.unshift({
      type: 'selector',
      tag: '⚡ 專線加速',
      outbounds: iplcTags
    });
  }

  config.outbounds.forEach((out: Record<string, unknown>) => {
    if (out.type === 'selector' || out.type === 'urltest') {
      if (!Array.isArray(out.outbounds)) out.outbounds = [];
      const arr = out.outbounds as string[];
      allNodeTags.forEach(tag => {
        if (!arr.includes(tag)) arr.push(tag);
      });
    }
  });

  return JSON.stringify(config, null, 2);
}

// --- Clash Meta 配置生成 ---
export async function toClashWithTemplate(nodes: ProxyNode[], env?: Env, forceRefresh = false): Promise<string> {
  const text = await fetchTemplateWithSWR(REMOTE_CONFIG.clash, 'clash', FALLBACK_CLASH_RULES, env, forceRefresh);
  const config = yaml.load(text) as Record<string, unknown>;
  
  const proxies = nodes.map(n => {
    const obj = JSON.parse(JSON.stringify(n.clashObj));
    Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
    return obj;
  });
  const proxyNames = proxies.map((p: Record<string, unknown>) => p.name as string);

  if (!Array.isArray(config.proxies)) config.proxies = [];
  config.proxies.push(...proxies);

  const lowRateNames = nodes.filter(n => n.multiplier !== undefined && n.multiplier < 1.0).map(n => n.name);
  const iplcNames = nodes.filter(n => n.isIplc).map(n => n.name);

  if (Array.isArray(config['proxy-groups'])) {
    const groups = config['proxy-groups'] as Array<Record<string, unknown>>;

    if (lowRateNames.length > 0) {
      groups.unshift({
        name: '🏎️ 低倍率節點',
        type: 'select',
        proxies: lowRateNames
      });
    }

    if (iplcNames.length > 0) {
      groups.unshift({
        name: '⚡ 專線加速',
        type: 'select',
        proxies: iplcNames
      });
    }

    groups.forEach(group => {
      if (!Array.isArray(group.proxies)) group.proxies = [];
      const arr = group.proxies as string[];
      proxyNames.forEach(name => {
        if (!arr.includes(name)) arr.push(name);
      });
    });
  }

  return yaml.dump(config, { indent: 2, noRefs: true });
}

// --- Surge 5 配置生成 ---
export function toSurge(nodes: ProxyNode[]): string {
  const lines: string[] = ['[Proxy]'];
  const nodeNames: string[] = [];
  const wgSections: string[] = [];

  for (const node of nodes) {
    let line = '';
    const name = node.name.replace(/[,=]/g, '').trim();

    if (node.type === 'shadowsocks') {
      line = `${name} = ss, ${node.server}, ${node.port}, encrypt-method=${node.cipher}, password=${node.password}, udp-relay=true`;
      if (node.sni) line += `, sni=${node.sni}`;
    } else if (node.type === 'trojan') {
      line = `${name} = trojan, ${node.server}, ${node.port}, password=${node.password}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, udp-relay=true`;
      if (node.network === 'ws') {
        line += `, ws=true, ws-path=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) line += `, ws-headers=Host:${node.wsHeaders.Host}`;
      }
    } else if (node.type === 'vmess') {
      line = `${name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, tls=${node.tls ? 'true' : 'false'}, udp-relay=true`;
      if (node.sni) line += `, sni=${node.sni}`;
      if (node.network === 'ws') {
        line += `, ws=true, ws-path=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) line += `, ws-headers=Host:${node.wsHeaders.Host}`;
      }
    } else if (node.type === 'vless') {
      line = `${name} = vless, ${node.server}, ${node.port}, username=${node.uuid}, tls=${node.tls ? 'true' : 'false'}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, udp-relay=true`;
      if (node.network === 'ws') {
        line += `, ws=true, ws-path=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) line += `, ws-headers=Host:${node.wsHeaders.Host}`;
      }
    } else if (node.type === 'hysteria2') {
      line = `${name} = hysteria2, ${node.server}, ${node.port}, password=${node.password}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, udp-relay=true`;
    } else if (node.type === 'tuic') {
      line = `${name} = tuic, ${node.server}, ${node.port}, token=${node.password}, sni=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}`;
    } else if (node.type === 'wireguard' && node.wireguard) {
      const wg = node.wireguard;
      const safeSecName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
      line = `${name} = wireguard, section-name=${safeSecName}`;
      
      let wgSec = `\n[WireGuard ${safeSecName}]\n`;
      wgSec += `private-key = ${wg.privateKey}\n`;
      wgSec += `self-ip = ${wg.localAddress[0]?.split('/')[0] || '10.2.0.2'}\n`;
      if (wg.localAddress[1]) {
        wgSec += `self-ip-v6 = ${wg.localAddress[1]?.split('/')[0]}\n`;
      }
      if (wg.dns) {
        wgSec += `dns-server = ${wg.dns}\n`;
      }
      wgSec += `peer = (public-key = ${wg.publicKey || ''}, allowed-ips = "0.0.0.0/0, ::/0", endpoint = ${node.server}:${node.port}, keepalive = 25)\n`;
      wgSections.push(wgSec);
    }

    if (line) {
      lines.push(line);
      nodeNames.push(name);
    }
  }

  lines.push('\n[Proxy Group]');
  if (nodeNames.length > 0) {
    lines.push(`🚀 節點選擇 = select, ⚡ 自動選擇, DIRECT, ${nodeNames.join(', ')}`);
    lines.push(`⚡ 自動選擇 = url-test, ${nodeNames.join(', ')}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50`);
  } else {
    lines.push(`🚀 節點選擇 = select, DIRECT`);
    lines.push(`⚡ 自動選擇 = select, DIRECT`);
  }
  lines.push(`🐟 漏網之魚 = select, 🚀 節點選擇, DIRECT`);

  lines.push('\n[Rule]');
  lines.push('GEOIP,CN,DIRECT');
  lines.push('FINAL,🐟 漏網之魚\n');

  if (wgSections.length > 0) {
    lines.push(wgSections.join('\n'));
  }

  return lines.join('\n');
}

// --- Quantumult X (server_remote) ---
export function toQuantumultX(nodes: ProxyNode[]): string {
  const lines: string[] = [];

  for (const node of nodes) {
    const name = node.name.replace(/[,=]/g, '').trim();

    if (node.type === 'shadowsocks') {
      lines.push(`shadowsocks=${node.server}:${node.port}, method=${node.cipher}, password=${node.password}, fast-open=false, udp-relay=true, tag=${name}`);
    } else if (node.type === 'trojan') {
      lines.push(`trojan=${node.server}:${node.port}, password=${node.password}, over-tls=true, tls-host=${node.sni || node.server}, fast-open=false, udp-relay=true, tag=${name}`);
    } else if (node.type === 'vmess') {
      let vmessLine = `vmess=${node.server}:${node.port}, method=none, password=${node.uuid}, fast-open=false, udp-relay=true, tag=${name}`;
      if (node.tls) vmessLine += `, over-tls=true, tls-host=${node.sni || node.server}`;
      if (node.network === 'ws') vmessLine += `, obfs=ws, obfs-uri=${node.wsPath || '/'}`;
      lines.push(vmessLine);
    } else if (node.type === 'vless') {
      let vlessLine = `vless=${node.server}:${node.port}, method=none, password=${node.uuid}, fast-open=false, udp-relay=true, tag=${name}`;
      if (node.tls) vlessLine += `, over-tls=true, tls-host=${node.sni || node.server}`;
      if (node.network === 'ws') {
        vlessLine += `, obfs=ws, obfs-uri=${node.wsPath || '/'}`;
        if (node.wsHeaders?.Host) vlessLine += `, obfs-host=${node.wsHeaders.Host}`;
      }
      lines.push(vlessLine);
    } else if (node.type === 'hysteria2') {
      lines.push(`hysteria2=${node.server}:${node.port}, password=${node.password}, tls-host=${node.sni || node.server}, skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'}, tag=${name}`);
    }
  }

  if (lines.length === 0) {
    return '# 未在該訂閱中找到相容的節點';
  }

  return lines.join('\n');
}

// --- Loon 格式生成 ---
export function toLoon(nodes: ProxyNode[]): string {
  const lines: string[] = ['[Proxy]'];

  for (const node of nodes) {
    const name = node.name.replace(/,/g, '');
    if (node.type === 'shadowsocks') {
      lines.push(`${name} = Shadowsocks,${node.server},${node.port},${node.cipher},"${node.password}",fast-open=false,udp=true`);
    } else if (node.type === 'trojan') {
      lines.push(`${name} = Trojan,${node.server},${node.port},"${node.password}",sni=${node.sni || node.server},skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'},udp=true`);
    } else if (node.type === 'vless') {
      let l = `${name} = Vless,${node.server},${node.port},"${node.uuid}",tls=${node.tls ? 'true' : 'false'},sni=${node.sni || node.server},skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'},udp=true`;
      if (node.network === 'ws') l += `,transport=ws,path=${node.wsPath || '/'}`;
      lines.push(l);
    } else if (node.type === 'vmess') {
      let v = `${name} = vmess,${node.server},${node.port},auto,"${node.uuid}",fast-open=false,udp=true`;
      if (node.tls) v += `,over-tls=true,tls-name=${node.sni || node.server}`;
      if (node.network === 'ws') v += `,transport=ws,path=${node.wsPath || '/'}`;
      lines.push(v);
    } else if (node.type === 'hysteria2') {
      lines.push(`${name} = Hysteria2,${node.server},${node.port},password=${node.password},sni=${node.sni || node.server},skip-cert-verify=${node.skipCertVerify ? 'true' : 'false'},udp=true`);
    }
  }

  return lines.join('\n');
}
