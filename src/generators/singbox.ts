// src/generators/singbox.ts
import { Env, ProxyNode } from '../types';
import { REMOTE_CONFIG, FALLBACK_SINGBOX_RULES } from '../config/rules';
import { isIpAddress, stripJsonComments, fetchTemplateDirect } from './common';

export async function toSingBoxWithTemplate(
  nodes: ProxyNode[],
  _env?: Env,
  _forceRefresh = false
): Promise<string> {
  const text = await fetchTemplateDirect(REMOTE_CONFIG.singbox, FALLBACK_SINGBOX_RULES);
  const config = JSON.parse(stripJsonComments(text));

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
    config.dns.final = 'remote-dns';
    if (Array.isArray(config.dns.servers)) {
      config.dns.servers = config.dns.servers.filter((s: Record<string, unknown>) => s.type !== 'rcode');
      config.dns.servers.forEach((s: Record<string, unknown>) => {
        if (s.detour === 'direct' || s.detour === 'DIRECT') delete s.detour;
      });
    }
    if (Array.isArray(config.dns.rules)) {
      config.dns.rules = config.dns.rules.filter((r: Record<string, unknown>) => !('outbound' in r));
    }

    const nodesWithCustomDoh = nodes.filter(n => n.ech && n.echDoh && /^https?:\/\//i.test(n.echDoh));
    if (nodesWithCustomDoh.length > 0) {
      const dohMap = new Map<string, string>();
      for (const n of nodesWithCustomDoh) {
        const domain = n.echQueryServerName || n.sni || n.server;
        const dohUrl = n.echDoh!;
        if (domain && !isIpAddress(domain) && !dohMap.has(domain)) {
          dohMap.set(domain, dohUrl);
        }
      }

      for (const [domain, dohUrl] of dohMap.entries()) {
        let serverHost = dohUrl;
        let serverPath = '/dns-query';
        try {
          const u = new URL(dohUrl);
          serverHost = u.hostname;
          serverPath = u.pathname || '/dns-query';
        } catch {}

        const tag = `ech-doh-${domain.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        if (!config.dns.servers.some((s: Record<string, unknown>) => s.tag === tag)) {
          const dnsServerObj: Record<string, unknown> = {
            tag,
            type: 'https',
            server: serverHost,
            domain_resolver: 'system-dns'
          };
          if (serverPath && serverPath !== '/') {
            dnsServerObj.path = serverPath;
          }
          config.dns.servers.push(dnsServerObj);
        }

        const alreadyExists = config.dns.rules.some((r: Record<string, unknown>) => {
          const doms = r.domain as string[] | undefined;
          return Array.isArray(doms) && doms.includes(domain);
        });

        if (!alreadyExists) {
          config.dns.rules.unshift({
            domain: [domain],
            domain_suffix: [domain],
            server: tag
          });
        }
      }
    }

    // 遍歷所有 DNS 伺服器，確保域名地址均帶有 domain_resolver (Sing-Box 1.14+ 強制規範)
    if (Array.isArray(config.dns.servers)) {
      config.dns.servers.forEach((s: Record<string, unknown>) => {
        if (s.server && typeof s.server === 'string' && !isIpAddress(s.server)) {
          if (!s.domain_resolver) {
            s.domain_resolver = 'system-dns';
          }
        }
      });
    }
  }

  if (!config.route) config.route = {};
  config.route.default_domain_resolver = 'system-dns';
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
      delete ib.domain_strategy;
    });
  }

  const outbounds: Record<string, unknown>[] = [];
  const endpoints: Record<string, unknown>[] = [];
  const allNodeTags: string[] = [];

  nodes.forEach(n => {
    allNodeTags.push(n.name);

    if (n.type === 'wireguard' && n.wireguard) {
      const wg = n.wireguard;
      const peerObj: Record<string, unknown> = {
        address: n.server,
        port: n.port,
        public_key: wg.publicKey,
        allowed_ips: ['0.0.0.0/0', '::/0']
      };
      if (wg.presharedKey) peerObj.pre_shared_key = wg.presharedKey;
      if (wg.reserved && wg.reserved.length > 0) peerObj.reserved = wg.reserved;

      endpoints.push({
        type: 'wireguard',
        tag: n.name,
        address: wg.localAddress,
        private_key: wg.privateKey,
        peers: [peerObj],
        mtu: wg.mtu || 1420
      });
    } else {
      const obj = JSON.parse(JSON.stringify(n.singboxObj));
      if (obj.transport?.type === 'ws' && obj.tls?.enabled === true && (!obj.tls.alpn || obj.tls.alpn.length === 0)) {
        obj.tls.alpn = ['http/1.1'];
      }

      if (n.ech && obj.tls) {
        const echObj: Record<string, unknown> = { enabled: true };
        if (n.echQueryServerName && !isIpAddress(n.echQueryServerName)) {
          echObj.query_server_name = n.echQueryServerName;
        }
        obj.tls.ech = echObj;
      }

      outbounds.push(obj);
    }
  });

  if (endpoints.length > 0) {
    if (!config.endpoints || !Array.isArray(config.endpoints)) {
      config.endpoints = [];
    }
    config.endpoints.push(...endpoints);
  }

  if (!Array.isArray(config.outbounds)) config.outbounds = [];
  config.outbounds.push(...outbounds);

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
