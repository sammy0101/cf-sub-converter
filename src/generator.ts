// src/generator.ts
import yaml from 'js-yaml';
import { Env, ProxyNode } from './types';
import { REMOTE_CONFIG, FALLBACK_SINGBOX_RULES, FALLBACK_CLASH_RULES } from './constants';
import { utf8ToBase64 } from './utils';

function isIpAddress(str: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) || str.includes(':');
}

// 防禦性濾網：安全過濾 JSON 字串中意外存在的單行與多行註解，防止 JSON.parse 報錯
function stripJsonComments(jsonStr: string): string {
  return jsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match, group) => {
    return group ? '' : match;
  });
}

// --- 明文 URI / 節點行格式導出 ---
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
        if (node.ech) {
          if (node.echDoh && node.echQueryServerName) {
            params.set('ech', `${node.echQueryServerName}+${node.echDoh}`);
          } else if (node.echDoh) {
            params.set('ech', node.echDoh);
          } else if (node.echQueryServerName) {
            params.set('ech', node.echQueryServerName);
          } else {
            params.set('ech', '1');
          }
        }
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
          if (node.ech) {
            if (node.echDoh && node.echQueryServerName) {
              params.set('ech', `${node.echQueryServerName}+${node.echDoh}`);
            } else if (node.echDoh) {
              params.set('ech', node.echDoh);
            } else if (node.echQueryServerName) {
              params.set('ech', node.echQueryServerName);
            } else {
              params.set('ech', '1');
            }
          }
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
        if (node.ech) {
          if (node.echDoh && node.echQueryServerName) {
            params.set('ech', `${node.echQueryServerName}+${node.echDoh}`);
          } else if (node.echDoh) {
            params.set('ech', node.echDoh);
          } else if (node.echQueryServerName) {
            params.set('ech', node.echQueryServerName);
          } else {
            params.set('ech', '1');
          }
        }
        return `trojan://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      
      // WireGuard 標準格式
      if (node.type === 'wireguard' && node.wireguard) {
        const wg = node.wireguard;
        const cleanIp = wg.localAddress[0]?.split('/')[0] || '10.2.0.2';
        const params = new URLSearchParams();
        params.set('publickey', wg.publicKey || '');
        params.set('privatekey', wg.privateKey || '');
        params.set('ip', cleanIp);
        params.set('address', cleanIp);
        if (wg.dns) params.set('dns', wg.dns);
        if (wg.presharedKey) params.set('presharedkey', wg.presharedKey);
        params.set('mtu', String(wg.mtu || 1420));
        params.set('keepalive', '25');
        return `wireguard://${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }

      // MASQUE 標準格式
      if (node.type === 'masque' && node.masque) {
        const m = node.masque;
        const params = new URLSearchParams();
        params.set('public_key', m.publicKey);
        if (m.localIpv4) params.set('ip', m.localIpv4.split('/')[0]);
        if (m.localIpv6) params.set('ipv6', m.localIpv6.split('/')[0]);
        if (m.mtu) params.set('mtu', String(m.mtu));
        if (m.uri) params.set('uri', m.uri);
        if (m.sni) params.set('sni', m.sni);
        
        const cc = m.congestion_controller || 'bbr';
        params.set('cca', cc);
        params.set('cc', cc);
        params.set('congestion_control', cc);
        params.set('congestion_controller', cc);
        params.set('congestion-controller', cc);
        
        if (m.dns && m.dns.length > 0) params.set('dns', m.dns.join(','));
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

// --- 直接自 GitHub 讀取遠端模板 ---
async function fetchTemplateDirect(
  url: string,
  fallbackStr: string
): Promise<string> {
  try {
    const resp = await fetch(`${url}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (resp.ok) {
      return await resp.text();
    }
  } catch {}

  return fallbackStr;
}

// --- Sing-Box 配置生成 ---
export async function toSingBoxWithTemplate(nodes: ProxyNode[], _env?: Env, _forceRefresh = false): Promise<string> {
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
      const dohMap = new Map<string, string>(); // domain -> dohUrl
      for (const n of nodesWithCustomDoh) {
        const domain = n.echQueryServerName || n.sni || n.server;
        const dohUrl = n.echDoh!;
        if (domain && !isIpAddress(domain) && !dohMap.has(domain)) {
          dohMap.set(domain, dohUrl);
        }
      }

      for (const [domain, dohUrl] of dohMap.entries()) {
        let serverHost = dohUrl;
        try {
          const u = new URL(dohUrl);
          serverHost = u.hostname;
        } catch {}

        const tag = `ech-doh-${domain.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        if (!config.dns.servers.some((s: Record<string, unknown>) => s.tag === tag)) {
          config.dns.servers.push({
            tag,
            type: 'https',
            server: serverHost
          });
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
        allowed_ips: ["0.0.0.0/0", "::/0"]
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
export async function toClashWithTemplate(nodes: ProxyNode[], _env?: Env, _forceRefresh = false): Promise<string> {
  const text = await fetchTemplateDirect(REMOTE_CONFIG.clash, FALLBACK_CLASH_RULES);
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

// --- Honk / DAE (config.dae) 配置生成 ---
export async function toHonk(nodes: ProxyNode[], subUrl?: string, profileName?: string): Promise<string> {
  const AI_DAE_URL = 'https://raw.githubusercontent.com/sammy0101/myself/refs/heads/main/geosite_ai_hk_proxy.dae';
  let aiRulesBody = '';
  
  try {
    const aiResp = await fetch(`${AI_DAE_URL}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (aiResp.ok) {
      const text = await aiResp.text();
      if (text.includes('domain(')) {
        aiRulesBody = text.replace(/->\s*proxy/g, "-> '💬 AI 服務'").trim();
      }
    } else {
      throw new Error(`GitHub HTTP ${aiResp.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`無法動態獲取遠端 AI 規則檔案 (${AI_DAE_URL}): ${msg}`);
  }

  const finalSubTag = (profileName || 'My_Sub').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetSubUrl = subUrl || 'https://sub.myvs.dpdns.org/EDT?target=base64';

  return `# ==============================================================================
# OpenWrt Honk-Core / DAE 完整設定檔 (由 CF Sub Converter 動態產生)
# 儲存路徑: /etc/honk/config.dae
# ==============================================================================

global {
    # 綁定外網介面 (預設 auto 自動偵測。若為 PPPoE 撥接上網，可能需手動改為 pppoe-wan)
    wan_interface: auto
    # 綁定內網介面 (請務必確認你的路由器 LAN 網卡名稱，預設為 br-lan。多網卡可用逗號隔開)
    lan_interface: br-lan

    dial_mode: domain++
    auto_config_kernel_parameter: true
    data_dir: '/etc/honk'
    log_level: info
    log_file: ''

    tcp_check_url: 'https://www.gstatic.com/generate_204'
    tcp_check_http_method: HEAD
    check_interval: 300s
    check_tolerance: 50ms

    # 基礎引導 DNS (用於節點與訂閱連結的初始解析)
    bootstrap_resolver: '1.1.1.1:53'
}

# ==============================================================================
# 原生 Web API 與 Doona Web UI (內網瀏覽 http://<路由器IP>:9527)
# ==============================================================================
experimental {
    native_api {
        enabled: true
        # Doona 面板監聽位址 (0.0.0.0 代表允許內網所有設備透過路由器 IP 訪問)
        listen: '0.0.0.0:9527'
        password_auth: true
        config_write: true
        ui: 'embedded'
    }
    cache_file {
        enabled: true
        store_dns: true
    }
}

# ==============================================================================
# 訂閱配置 (直連下載，每 12 小時自動更新)
# ==============================================================================
subscription {
    ${finalSubTag}: '${targetSubUrl}' {
        route: direct
        # 訂閱自動更新間隔 (43200 秒 = 12 小時，可自行更改)
        interval: 43200s
    }
}

# ==============================================================================
# 策略分流群組 (Group)
# ==============================================================================
group {
    '💬 AI 服務' {
        policy: min_moving_avg
    }

    'Ⓜ️ 微軟服務' {
        policy: min_moving_avg
    }

    '🎮 遊戲平台' {
        policy: min_moving_avg
    }

    '🍎 蘋果服務' {
        policy: min_moving_avg
    }

    '🌐 非中國' {
        policy: min_moving_avg
    }

    # 🐟 漏網之魚專用：採用 score (綜合評分)
    '🐟 漏網之魚' {
        policy: score
    }
}

# ==============================================================================
# DNS 智慧解析 (localdns 走本機 dnsmasq，即 OpenWrt 原生 system DNS)
# ==============================================================================
dns {
    upstream {
        # 預設指向 OpenWrt 本機 dnsmasq (若有自建 AdGuardHome 或 SmartDNS 亦可改為對應 IP:Port)
        localdns: 'udp://127.0.0.1:53'
        cfdoh: 'https://1.1.1.1/dns-query'
        googledns: 'tcp+udp://dns.google:53'
    }
    routing {
        request {
            qname(geosite:category-ads-all) -> reject
            qname(geosite:cn) -> localdns
            fallback: cfdoh
        }
        response {
            upstream(cfdoh) && ip(geoip:cn) -> localdns
            fallback: accept
        }
    }
}

# ==============================================================================
# eBPF 流量路由規則
# ==============================================================================
routing {
    pname(NetworkManager, systemd-resolved, dnsmasq) -> direct(must)
    dip(224.0.0.0/3, 'ff00::/8') -> direct

    # 1. 🏠 私有網絡
    dip(geoip:private) -> direct

    # 2. 🛑 廣告攔截
    domain(geosite:category-ads-all) -> block

    # 3. 💬 AI 服務 (100% 即時從你的 GitHub 獲取)
    ${aiRulesBody}

    # 4. Ⓜ️ 微軟服務
    domain(geosite:microsoft) -> 'Ⓜ️ 微軟服務'

    # 5. 🎮 遊戲平台
    domain(geosite:steam, geosite:epicgames, geosite:ea, geosite:ubisoft, geosite:blizzard) -> '🎮 遊戲平台'

    # 6. 🍎 蘋果服務
    domain(geosite:apple) -> '🍎 蘋果服務'

    # 7. 🌐 非中國 (國外網站)
    domain(geosite:geolocation-!cn) -> '🌐 非中國'

    # 8. 🇨🇳 國內服務 (中國國內網域與 IP 全部直連)
    domain(geosite:cn) -> direct
    dip(geoip:cn) -> direct

    # 9. 🐟 漏網之魚 (最終兜底)
    fallback: '🐟 漏網之魚'
}
`;
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
