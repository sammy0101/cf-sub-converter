// src/generators/clash.ts
import yaml from 'js-yaml';
import { Env, ProxyNode } from '../types';
import { REMOTE_CONFIG, FALLBACK_CLASH_RULES } from '../config/rules';
import { isIpAddress, fetchTemplateDirect } from './common';

const SKIP_NODE_INJECTION_GROUPS = new Set(['🏠 私有網絡', '🛑 廣告攔截']);
const BUILTIN_ONLY_PROXIES = new Set(['DIRECT', 'REJECT']);

export async function toClashWithTemplate(
  nodes: ProxyNode[],
  _env?: Env,
  forceRefresh = false
): Promise<string> {
  const text = await fetchTemplateDirect(REMOTE_CONFIG.clash, FALLBACK_CLASH_RULES, forceRefresh);
  const config = yaml.load(text) as Record<string, unknown>;

  const proxies = nodes.map(n => {
    const obj = JSON.parse(JSON.stringify(n.clashObj));

    if (n.ech) {
      const echOpts: Record<string, unknown> = { enable: true };
      if (n.echQueryServerName && !isIpAddress(n.echQueryServerName)) {
        echOpts['query-server-name'] = n.echQueryServerName;
      }
      obj['ech-opts'] = echOpts;
    }

    return obj as Record<string, unknown>;
  });
  const proxyNames = proxies.map(p => p.name as string);

  if (!Array.isArray(config.proxies)) config.proxies = [];
  config.proxies.push(...proxies);

  if (Array.isArray(config['proxy-groups'])) {
    const groups = config['proxy-groups'] as Array<Record<string, unknown>>;

    groups.forEach(group => {
      const groupName = String(group.name || '');
      if (SKIP_NODE_INJECTION_GROUPS.has(groupName)) return;

      if (!Array.isArray(group.proxies)) group.proxies = [];
      const arr = group.proxies as string[];
      if (arr.length > 0 && arr.every(item => BUILTIN_ONLY_PROXIES.has(item))) {
        return;
      }

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
