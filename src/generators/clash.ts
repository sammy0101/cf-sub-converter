// src/generators/clash.ts
import yaml from 'js-yaml';
import { Env, ProxyNode } from '../types';
import { REMOTE_CONFIG, FALLBACK_CLASH_RULES } from '../config/rules';
import { isIpAddress, fetchTemplateDirect } from './common';

export async function toClashWithTemplate(
  nodes: ProxyNode[],
  _env?: Env,
  forceRefresh = false
): Promise<string> {
  const text = await fetchTemplateDirect(REMOTE_CONFIG.clash, FALLBACK_CLASH_RULES, forceRefresh);
  const config = yaml.load(text) as Record<string, unknown>;

  const proxies = nodes.map(n => {
    const obj = JSON.parse(JSON.stringify(n.clashObj));
    Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);

    if (n.ech) {
      const echOpts: Record<string, unknown> = { enable: true };
      if (n.echQueryServerName && !isIpAddress(n.echQueryServerName)) {
        echOpts['query-server-name'] = n.echQueryServerName;
      }
      obj['ech-opts'] = echOpts;
    }

    return obj;
  });
  const proxyNames = proxies.map((p: Record<string, unknown>) => p.name as string);

  if (!Array.isArray(config.proxies)) config.proxies = [];
  config.proxies.push(...proxies);

  if (Array.isArray(config['proxy-groups'])) {
    const groups = config['proxy-groups'] as Array<Record<string, unknown>>;

    groups.forEach(group => {
      if (!Array.isArray(group.proxies)) group.proxies = [];
      const arr = group.proxies as string[];
      proxyNames.forEach(name => {
        if (!arr.includes(name)) arr.push(name);
      });
    });
  }

  const nodesWithCustomDoh = nodes.filter(n => n.ech && n.echDoh && /^https?:\/\//i.test(n.echDoh));
  if (nodesWithCustomDoh.length > 0 && config.dns && typeof config.dns === 'object') {
    const dnsObj = config.dns as Record<string, unknown>;
    if (!dnsObj['nameserver-policy'] || typeof dnsObj['nameserver-policy'] !== 'object') {
      dnsObj['nameserver-policy'] = {};
    }
    const policy = dnsObj['nameserver-policy'] as Record<string, string[]>;
    for (const n of nodesWithCustomDoh) {
      const domain = n.echQueryServerName || n.sni || n.server;
      if (domain && !isIpAddress(domain)) {
        policy[domain] = [n.echDoh!];
      }
    }
  }

  return yaml.dump(config, { indent: 2, noRefs: true });
}
