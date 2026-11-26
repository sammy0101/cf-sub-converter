// src/config/rules.ts
export const REMOTE_CONFIG = {
  singbox: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Sing-Box_Rules.JSON',
  clash: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Clash_Rules.YAML',
  honk: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Honk_Rules.DAE'
};

// 內嵌緊急降級模板 (Sing-Box 純 IPv4 純淨版，已修正 Fake-IP 查詢過濾)
export const FALLBACK_SINGBOX_RULES = JSON.stringify({
  log: { level: "info" },
  http_clients: [
    { tag: "default" }
  ],
  dns: {
    servers: [
      { tag: "remote-dns", type: "https", server: "8.8.8.8", detour: "🚀 節點選擇" },
      { tag: "remote-cf-dns", type: "https", server: "1.1.1.1", detour: "🚀 節點選擇" },
      { tag: "system-dns", type: "local" },
      { tag: "local-dns", type: "local" },
      { tag: "fakeip-dns", type: "fakeip", inet4_range: "198.18.0.0/15" }
    ],
    rules: [
      { rule_set: ["rs-private"], server: "system-dns" },
      { rule_set: ["rs-cn"], server: "system-dns", disable_cache: true },
      { rule_set: ["rs-apple"], server: "system-dns", disable_cache: true },
      {
        query_type: ["A", "AAAA"],
        rule_set: [
          "rs-geolocation-!cn",
          "rs-ai"
        ],
        server: "fakeip-dns"
      }
    ],
    final: "remote-dns",
    strategy: "ipv4_only"
  },
  inbounds: [{ type: "tun", tag: "tun-in", interface_name: "tun0", auto_route: true, address: ["172.19.0.1/30"], stack: "mixed" }],
  outbounds: [
    { type: "selector", tag: "🚀 節點選擇", outbounds: ["⚡ 自動選擇", "direct"] },
    { type: "urltest", tag: "⚡ 自動選擇", outbounds: [], url: "https://www.gstatic.com/generate_204", interval: "3m" },
    { type: "selector", tag: "🛑 廣告攔截", outbounds: ["block", "direct"] },
    { type: "direct", tag: "direct" },
    { type: "block", tag: "block" }
  ],
  route: {
    default_domain_resolver: "system-dns",
    default_http_client: "default",
    rules: [
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" },
      { rule_set: "rs-ads", outbound: "🛑 廣告攔截" }
    ],
    auto_detect_interface: true
  },
  experimental: {
    cache_file: { enabled: true, store_fakeip: true }
  }
});

export const FALLBACK_CLASH_RULES = `
port: 7890
allow-lan: true
mode: rule
log-level: info
proxies: []
proxy-groups:
  - name: 🚀 節點選擇
    type: select
    proxies:
      - ⚡ 自動選擇
      - DIRECT
  - name: ⚡ 自動選擇
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    proxies: []
  - name: 🛑 廣告攔截
    type: select
    proxies:
      - REJECT
      - DIRECT
dns:
  enable: true
  enhanced-mode: fake-ip
  fake-ip-filter:
    - '*.lan'
    - '*.localdomain'
    - '*.example'
    - '*.invalid'
    - '*.localhost'
    - '*.test'
    - '*.local'
    - '*.home.arpa'
    - '*.msftconnecttest.com'
    - '*.msftncsi.com'
    - 'msftconnecttest.com'
    - 'msftncsi.com'
    - 'captive.apple.com'
    - 'connectivitycheck.gstatic.com'
    - 'connectivitycheck.platform.hicloud.com'
    - 'detectportal.firefox.com'
    - '+.market.xiaomi.com'
    - 'time.*.com'
    - 'time.*.gov'
    - 'time.*.edu.cn'
    - 'time.*.apple.com'
    - 'time.apple.com'
    - 'time-ios.apple.com'
    - 'ntp.*.com'
    - '+.pool.ntp.org'
    - 'stun.*.*'
    - 'stun.*.*.*'
    - '+.stun.*.*'
    - '+.stun.*.*.*'
    - '*.srv.nintendo.net'
    - '*.stun.playstation.net'
    - '+.playstation.net'
    - '+.playstation.com'
    - '+.sonyentertainmentnetwork.com'
    - 'xbox.*.microsoft.com'
    - '*.xboxlive.com'
    - '*.battlenet.com.cn'
    - '*.wotblitz.cn'
    - '*.wggames.cn'
    - '*.wowsblitz.cn'
    - '+.services.googleapis.cn'
    - '+.googleapis.cn'
    - '+.xn--ngstr-lra8j.com'
    - 'clientservices.googleapis.com'
    - 'rule-set:cn'
    - 'rule-set:private'
    - 'rule-set:apple'
  default-nameserver:
    - system
    - 119.29.29.29
    - 223.5.5.5
    - 1.1.1.1
    - 8.8.8.8
  direct-nameserver:
    - system
  nameserver-policy:
    "rule-set:private":
      - system
    "rule-set:cn":
      - system
      - https://223.5.5.5/dns-query
      - https://doh.pub/dns-query
    "rule-set:apple":
      - system
  nameserver:
    - https://8.8.8.8/dns-query
    - https://1.1.1.1/dns-query
rules:
  - RULE-SET,category-ads-all,🛑 廣告攔截
  - GEOIP,CN,DIRECT
  - MATCH,🚀 節點選擇
`;

export const FALLBACK_HONK_RULES = `# ==============================================================================
# OpenWrt Honk-Core / DAE 完整設定檔 (降級應急模板)
# 儲存路徑: /etc/honk/config.dae
# ==============================================================================

global {
    wan_interface: auto
    lan_interface: br-lan
    dial_mode: domain
    allow_insecure: false
    auto_config_kernel_parameter: true
    data_dir: '/etc/honk'
    log_level: info
    log_file: ''
    tcp_check_url: 'https://www.gstatic.com/generate_204'
    tcp_check_http_method: HEAD
    udp_check_dns: 'dns.google:53', '8.8.8.8', '2001:4860:4860::8888'
    check_interval: 300s
    check_tolerance: 50ms
    bootstrap_resolver: '1.1.1.1:53'
    store_subscribe: true
    nfqueue_enable: true
    udp_warm_node_count: 0
    preconnect_node_count: 0
}

experimental {
    native_api {
        enabled: true
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

subscription {
    {{SUB_TAG}}: '{{SUB_URL}}' {
        route: direct
        interval: 43200s
    }
}

group {
    AI {
        policy: score
    }
    Microsoft {
        policy: score
    }
    Game {
        policy: score
    }
    Apple {
        policy: score
    }
    Global {
        policy: score
    }
    Fallback {
        policy: score
    }
}

dns {
    client_subnet: auto
    upstream {
        googledns: 'tcp+udp://8.8.8.8:53'
        googledoh: 'https://8.8.8.8/dns-query'
        cfdns: 'tcp+udp://1.1.1.1:53'
        cfdoh: 'https://1.1.1.1/dns-query'
        localdns: 'udp://127.0.0.1:53'
    }
    routing {
        request {
            qtype(https) -> reject
            qname(geosite:category-ads-all) -> reject
            qname(geosite:cn) -> localdns
            fallback: googledoh
        }
        response {
            upstream(googledoh) && ip(geoip:cn) -> localdns
            upstream(cfdoh) && ip(geoip:cn) -> localdns
            fallback: accept
        }
    }
}

routing {
    pname(dnsmasq, systemd-resolved) && l4proto(udp) && dport(53) -> direct(must)
    pname(NetworkManager, systemd-networkd, systemd-resolved, dhcpcd) -> direct
    pname(sing-box, mihomo, frpc, einat) -> direct(must)
    dip(224.0.0.0/3, 'ff00::/8') -> direct
    dip(geoip:private) -> direct
    domain(geosite:category-ads-all) -> block

    {{AI_RULES}}

    domain(geosite:microsoft) -> Microsoft
    domain(geosite:steam, geosite:epicgames, geosite:ea, geosite:ubisoft, geosite:blizzard) -> Game
    domain(geosite:apple) -> Apple
    domain(geosite:geolocation-!cn) -> Global
    domain(geosite:cn) -> direct
    dip(geoip:cn) -> direct
    fallback: Fallback
}
`;
