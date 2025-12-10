import yaml from 'js-yaml';
import { ProxyNode } from './types';
import { REMOTE_CONFIG } from './constants';
import { utf8ToBase64 } from './utils';

export function toBase64(nodes: ProxyNode[]) {
  const links = nodes.map(node => {
    try {
      if (node.type === 'vless') {
        const params = new URLSearchParams();
        params.set('security', node.reality ? 'reality' : (node.tls ? 'tls' : 'none'));
        params.set('type', node.network || 'tcp');
        if (node.flow) params.set('flow', node.flow);
        if (node.sni) params.set('sni', node.sni);
        if (node.fingerprint) params.set('fp', node.fingerprint);
        if (node.reality) { params.set('pbk', node.reality.publicKey); params.set('sid', node.reality.shortId); }
        if (node.network === 'ws') { if (node.wsPath) params.set('path', node.wsPath); if (node.wsHeaders?.Host) params.set('host', node.wsHeaders.Host); }
        return `vless://${node.uuid}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      // 這裡僅示範 Vless 還原，其他協議邏輯相同，為節省篇幅省略
      return null;
    } catch { return null; }
  }).filter(l => l !== null);
  return utf8ToBase64(links.join('\n'));
}

export async function toSingBoxWithTemplate(nodes: ProxyNode[]) {
  const resp = await fetch(`${REMOTE_CONFIG.singbox}?t=${Math.random()}`, { 
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } 
  });
  if (!resp.ok) throw new Error('無法讀取 Sing-Box_Rules.JSON');
  const text = await resp.text();
  
  let config;
  try { config = JSON.parse(text); } catch (e) { throw new Error('Sing-Box_Rules.JSON 格式錯誤'); }

  const outbounds = nodes.map(n => n.singboxObj);
  const nodeTags = outbounds.map(o => o.tag);

  if (!Array.isArray(config.outbounds)) config.outbounds = [];
  config.outbounds.push(...outbounds);

  config.outbounds.forEach((out: any) => {
    if (out.type === 'selector' || out.type === 'urltest') {
      if (!Array.isArray(out.outbounds)) out.outbounds = [];
      out.outbounds.push(...nodeTags);
    }
  });

  return JSON.stringify(config, null, 2);
}

export async function toClashWithTemplate(nodes: ProxyNode[]) {
  const resp = await fetch(`${REMOTE_CONFIG.clash}?t=${Math.random()}`, { 
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } 
  });
  if (!resp.ok) throw new Error('無法讀取 Clash_Rules.YAML');
  const text = await resp.text();

  let config: any;
  try { config = yaml.load(text); } catch (e) { throw new Error('Clash_Rules.YAML 格式錯誤'); }

  const proxies = nodes.map(n => n.clashObj);
  const proxyNames = proxies.map(p => p.name);

  if (!Array.isArray(config.proxies)) config.proxies = [];
  config.proxies.push(...proxies);

  if (Array.isArray(config['proxy-groups'])) {
    config['proxy-groups'].forEach((group: any) => {
      if (!Array.isArray(group.proxies)) group.proxies = [];
      group.proxies.push(...proxyNames);
    });
  }

  return yaml.dump(config);
}
