import yaml from 'js-yaml';
import { ProxyNode } from './types';
import { REMOTE_CONFIG } from './constants';
import { utf8ToBase64 } from './utils';

export function toBase64(nodes: ProxyNode[]) {
  const links = nodes.map(node => {
    try {
      // VLESS
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
      
      // Hysteria2
      if (node.type === 'hysteria2') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.obfs) { params.set('obfs', node.obfs); if (node.obfsPassword) params.set('obfs-password', node.obfsPassword); }
        if (node.skipCertVerify) params.set('insecure', '1');
        return `hysteria2://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }

      // VMess
      if (node.type === 'vmess') {
        const vmessObj = {
          v: "2", ps: node.name, add: node.server, port: node.port, id: node.uuid,
          aid: 0, scy: "auto", net: node.network, type: "none",
          host: node.wsHeaders?.Host || "", path: node.wsPath || "",
          tls: node.tls ? "tls" : "", sni: node.sni || ""
        };
        return 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
      }

      // --- [關鍵修正] Shadowsocks 改用明文格式輸出 ---
      if (node.type === 'shadowsocks') {
        // 不再對 UserInfo 進行 Base64 編碼，而是使用 URL Encode
        // 格式: ss://method:password@server:port
        const method = encodeURIComponent(node.cipher);
        const pass = encodeURIComponent(node.password); // 這裡包含完整的 Key (含冒號)
        
        const params = new URLSearchParams();
        
        if (node.tls) {
            params.set('security', 'tls');
            if (node.sni) params.set('sni', node.sni);
            if (node.alpn) params.set('alpn', node.alpn.join(','));
            if (node.fingerprint) params.set('fp', node.fingerprint);
            
            // 補上 ECH (存在 reality.shortId 裡)
            if (node.reality && node.reality.shortId) {
                params.set('ech', decodeURIComponent(node.reality.shortId));
            }
            
            params.set('type', 'tcp');
        }
        
        const query = params.toString();
        // 使用明文格式
        return `ss://${method}:${pass}@${node.server}:${node.port}${query ? '?' + query : ''}#${encodeURIComponent(node.name)}`;
      }

      return null;
    } catch { return null; }
  }).filter(l => l !== null);
  
  return utf8ToBase64(links.join('\n'));
}

async function fetchWithUA(url: string) {
  const resp = await fetch(url + `?t=${Math.random()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  if (!resp.ok) throw new Error(`GitHub fetch failed: ${resp.status}`);
  return await resp.text();
}

export async function toSingBoxWithTemplate(nodes: ProxyNode[]) {
  const text = await fetchWithUA(REMOTE_CONFIG.singbox);
  let config;
  try { config = JSON.parse(text); } catch (e) { throw new Error('Sing-Box_Rules.JSON 格式錯誤'); }
  const outbounds = nodes.map(n => n.singboxObj); const nodeTags = outbounds.map(o => o.tag);
  if (!Array.isArray(config.outbounds)) config.outbounds = []; config.outbounds.push(...outbounds);
  config.outbounds.forEach((out: any) => { if (out.type === 'selector' || out.type === 'urltest') { if (!Array.isArray(out.outbounds)) out.outbounds = []; out.outbounds.push(...nodeTags); } });
  return JSON.stringify(config, null, 2);
}

export async function toClashWithTemplate(nodes: ProxyNode[]) {
  const text = await fetchWithUA(REMOTE_CONFIG.clash);
  let config: any;
  try { config = yaml.load(text); } catch (e) { throw new Error('Clash_Rules.YAML 格式錯誤'); }
  const proxies = nodes.map(n => n.clashObj); const proxyNames = proxies.map(p => p.name);
  if (!Array.isArray(config.proxies)) config.proxies = []; config.proxies.push(...proxies);
  if (Array.isArray(config['proxy-groups'])) { config['proxy-groups'].forEach((group: any) => { if (!Array.isArray(group.proxies)) group.proxies = []; group.proxies.push(...proxyNames); }); }
  return yaml.dump(config);
}
