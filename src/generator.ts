import yaml from 'js-yaml';
import { ProxyNode } from './types';
import { REMOTE_CONFIG } from './constants';
import { utf8ToBase64 } from './utils';

// V2RayN Base64 生成邏輯 (保持不變，因為你說這部分通了)
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
          aid: 0, scy: "auto", net: node.network, type: "none",
          host: node.wsHeaders?.Host || "", path: node.wsPath || "",
          tls: node.tls ? "tls" : "", sni: node.sni || ""
        };
        return 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
      }

      // SS Base64 (保持原樣，因為 V2RayN 已通)
      if (node.type === 'shadowsocks') {
        const userInfo = `${node.cipher}:${node.password}`;
        const base64User = utf8ToBase64(userInfo).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const params = new URLSearchParams();
        
        // 這裡保留你目前能通的邏輯：如果有 TLS，generator 還是會幫 V2RayN 加上參數
        // 但因為 parser 已經強制關閉 TLS 讀取，所以這裡實際上生成的會是純 SS，這也是 V2RayN 能通的原因
        if (node.tls) {
            params.set('security', 'tls');
            if (node.sni) params.set('sni', node.sni);
            if (node.alpn) params.set('alpn', node.alpn.join(','));
            if (node.fingerprint) params.set('fp', node.fingerprint);
            params.set('type', 'tcp');
        }
        
        if (node.clashObj && node.clashObj.plugin && !node.tls) {
             params.set('plugin', node.clashObj.plugin + (node.clashObj['plugin-opts'] ? ';' + new URLSearchParams(node.clashObj['plugin-opts']).toString().replace(/&/g, ';') : ''));
        }

        const query = params.toString();
        return `ss://${base64User}@${node.server}:${node.port}${query ? '/?' + query : ''}#${encodeURIComponent(node.name)}`;
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

// --- SingBox 生成器 (針對性優化) ---
export async function toSingBoxWithTemplate(nodes: ProxyNode[]) {
  const text = await fetchWithUA(REMOTE_CONFIG.singbox);
  let config;
  try { config = JSON.parse(text); } catch (e) { throw new Error('Sing-Box_Rules.JSON 格式錯誤'); }

  const outbounds = nodes.map(n => {
     // 深拷貝一份 SingBox 物件
     const obj = JSON.parse(JSON.stringify(n.singboxObj));
     
     // 針對 Shadowsocks-2022 的特別處理
     if (obj.type === 'shadowsocks' && obj.method.toLowerCase().includes('2022')) {
         // 1. 密碼清洗：只取前半段 (Server Key)
         if (obj.password.includes(':')) {
             obj.password = obj.password.split(':')[0];
         }
         
         // 2. 清洗非 Base64 字符並強制截斷
         let clean = obj.password.replace(/-/g, '+').replace(/_/g, '/');
         clean = clean.replace(/[^A-Za-z0-9\+\/]/g, "");
         if (clean.length > 44) clean = clean.substring(0, 44);
         // 補齊 Padding
         const pad = clean.length % 4;
         if (pad) clean += '='.repeat(4 - pad);
         obj.password = clean;

         // 3. 移除可能導致問題的額外設定，回歸最純粹的 TCP
         // 根據你的經驗，純 TCP 是能通的，所以我們移除所有花俏的設定
         delete obj.plugin;
         delete obj.plugin_opts;
         delete obj.transport;
         delete obj.tls;
         delete obj.multiplex;
         
         // 4. UDP over TCP: 雖然規範建議開，但如果連不上，有些伺服器不支援
         // 我們暫時保留它，因為這是 SS-2022 的特性。如果還是不通，可以試著把這行也註解掉
         obj.udp_over_tcp = true; 
     }
     return obj;
  });
  
  const nodeTags = outbounds.map((o:any) => o.tag);

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
  const text = await fetchWithUA(REMOTE_CONFIG.clash);
  let config: any;
  try { config = yaml.load(text); } catch (e) { throw new Error('Clash_Rules.YAML 格式錯誤'); }
  const proxies = nodes.map(n => n.clashObj); const proxyNames = proxies.map(p => p.name);
  if (!Array.isArray(config.proxies)) config.proxies = []; config.proxies.push(...proxies);
  if (Array.isArray(config['proxy-groups'])) { config['proxy-groups'].forEach((group: any) => { if (!Array.isArray(group.proxies)) group.proxies = []; group.proxies.push(...proxyNames); }); }
  return yaml.dump(config);
}
