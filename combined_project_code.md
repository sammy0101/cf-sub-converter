# Complete Project Codebase
Generated on: Sat Aug 22 13:23:32 UTC 2026

## File: argo.sh
````sh
#!/bin/bash
# Cloudflare Argo Tunnel 一鍵部署腳本 (由 cf-sub-converter 動態配置)
# 專案網址: https://github.com/sammy0101/cf-sub-converter

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 動態變數佔位符 (由 Worker 自動替換)
NODE_TYPE="{{NODE_TYPE}}"
VLESS_UUID="{{VLESS_UUID}}"
VLESS_PATH="{{VLESS_PATH}}"
VLESS_TYPE="{{VLESS_TYPE}}"
VLESS_PORT="{{VLESS_PORT}}"
NODE_NAME="{{NODE_NAME}}"
TUNNEL_TOKEN="{{TUNNEL_TOKEN}}"
CUSTOM_DOMAIN="{{CUSTOM_DOMAIN}}"
VLESS_TLS="{{VLESS_TLS}}"
ORIGIN_HOST="{{ORIGIN_HOST}}"

echo -e "${GREEN}=== 開始部署 Cloudflare Argo 隧道 (${NODE_NAME}) ===${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}錯誤: 請使用 root 權限執行此腳本！${NC}"
  exit 1
fi

# 1. 安裝 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "正在下載安裝 cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
else
    echo "cloudflared 已存在，跳過安裝。"
fi

SAFE_NODE_NAME=$(echo "$NODE_NAME" | sed 's/[^a-zA-Z0-9]/_/g')

# 2. 雙重保險：VPS 本地執行期自動檢測並修正連接埠與 TLS 加密衝突
DETECTED_PORT="$VLESS_PORT"

if command -v ss &> /dev/null; then
    if ! ss -tln | grep -qE ":$VLESS_PORT([[:space:]]|$)"; then
        echo -e "${RED}警告: 本地轉發埠 $VLESS_PORT 似乎未在本地監聽。正在探測常用埠...${NC}"
        if ss -tln | grep -qE ":443([[:space:]]|$)"; then
            echo -e "${GREEN}自動修正成功：偵測到 VPS 本地 Nginx/443 埠正在運行！已將轉發目標自動修正為: 443 埠。${NC}"
            DETECTED_PORT="443"
        elif ss -tln | grep -qE ":80([[:space:]]|$)"; then
            echo -e "${GREEN}自動修正成功：偵測到 VPS 本地 80 埠正在運行！已將轉發目標自動修正為: 80 埠。${NC}"
            DETECTED_PORT="80"
        fi
    fi
fi

# 智慧探測：自動探測目標連接埠是否啟用 TLS 加密
DETECTED_TLS="false"
if curl -s -k --connect-timeout 2 "https://127.0.0.1:$DETECTED_PORT" &>/dev/null; then
    echo "偵測到本地轉發埠 $DETECTED_PORT 為 TLS 加密連接埠，自動開啟 HTTPS 轉發與 SNI 對齊模式。"
    DETECTED_TLS="true"
else
    echo "偵測到本地轉發埠 $DETECTED_PORT 為明文連接埠，自動開啟 HTTP 轉發模式。"
fi

LOCAL_URL="http://127.0.0.1:$DETECTED_PORT"
EXTRA_ARGS=""
if [ "$DETECTED_TLS" = "true" ]; then
    LOCAL_URL="https://127.0.0.1:$DETECTED_PORT"
    EXTRA_ARGS="--no-tls-verify"
fi

# 重寫 Host Header 與 TLS SNI
if [ -n "$ORIGIN_HOST" ]; then
    echo "已自動啟用 HTTP 主機頭部重寫 (Host Header 重寫為: $ORIGIN_HOST)"
    EXTRA_ARGS="$EXTRA_ARGS --http-host-header $ORIGIN_HOST"
    if [ "$DETECTED_TLS" = "true" ]; then
        echo "已自動啟用 TLS SNI 重寫為: $ORIGIN_HOST"
        EXTRA_ARGS="$EXTRA_ARGS --origin-server-name $ORIGIN_HOST"
    fi
fi

# 4. 判斷並執行部署
if [ -n "$TUNNEL_TOKEN" ]; then
    echo -e "${GREEN}【固定隧道模式】正在配置服務...${NC}"
    cloudflared service uninstall &> /dev/null
    cloudflared service install "$TUNNEL_TOKEN"
    systemctl daemon-reload
    systemctl enable cloudflared
    systemctl restart cloudflared
    
    echo -e "\n${GREEN}=== 部署成功 【固定域名模式】 ===${NC}"
    echo -e "原節點名稱: $NODE_NAME"
    echo -e "轉發連接埠: $DETECTED_PORT"
    echo -e "綁定自訂域名: $CUSTOM_DOMAIN"
    
    if [ "$NODE_TYPE" = "vless" ]; then
        FINAL_LINK="vless://$VLESS_UUID@$CUSTOM_DOMAIN:443?encryption=none&security=tls&type=$VLESS_TYPE&host=$CUSTOM_DOMAIN"
        if [ "$VLESS_TYPE" = "ws" ]; then
            FINAL_LINK="$FINAL_LINK&path=$VLESS_PATH"
        fi
        FINAL_LINK="$FINAL_LINK#$NODE_NAME"
    else
        VMESS_JSON="{\"v\":\"2\",\"ps\":\"$NODE_NAME\",\"add\":\"$CUSTOM_DOMAIN\",\"port\":443,\"id\":\"$VLESS_UUID\",\"aid\":0,\"scy\":\"auto\",\"net\":\"$VLESS_TYPE\",\"type\":\"none\",\"host\":\"$CUSTOM_DOMAIN\",\"path\":\"$VLESS_PATH\",\"tls\":\"tls\",\"sni\":\"$CUSTOM_DOMAIN\"}"
        VMESS_B64=$(echo -n "$VMESS_JSON" | base64 | tr -d '\n')
        FINAL_LINK="vmess://$VMESS_B64"
    fi
    echo -e "\n${GREEN}您的 Argo $NODE_TYPE 訂閱連結為:${NC}"
    echo -e "${GREEN}$FINAL_LINK${NC}\n"
else
    echo -e "${GREEN}【臨時隧道模式】正在啟動 Quick Tunnel...${NC}"
    systemctl stop cloudflared-argo-${SAFE_NODE_NAME} &> /dev/null
    
    cat <<EOF > /etc/systemd/system/cloudflared-argo-${SAFE_NODE_NAME}.service
[Unit]
Description=Cloudflare Argo Temporary Tunnel for ${NODE_NAME}
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --url $LOCAL_URL $EXTRA_ARGS
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable cloudflared-argo-${SAFE_NODE_NAME}
    systemctl start cloudflared-argo-${SAFE_NODE_NAME}
    
    echo "正在等待 Cloudflare 分配臨時域名 (約需 10-15 秒)..."
    TEMP_DOMAIN=""
    for i in {1..15}; do
        sleep 1
        # 💥 核心修正：改用系統級 journalctl 探測，並搭配 tail -n 1 永遠提取最新活著的網域，徹底解決 530 緩存！
        TEMP_DOMAIN=$(journalctl -u cloudflared-argo-${SAFE_NODE_NAME} -n 50 --no-pager 2>/dev/null | grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' | tail -n 1 | cut -d'/' -f3)
        if [ -n "$TEMP_DOMAIN" ]; then
            break
        fi
    done
    
    if [ -n "$TEMP_DOMAIN" ]; then
        echo -e "${GREEN}獲取臨時域名成功: $TEMP_DOMAIN${NC}"
        if [ "$NODE_TYPE" = "vless" ]; then
            FINAL_LINK="vless://$VLESS_UUID@$TEMP_DOMAIN:443?encryption=none&security=tls&type=$VLESS_TYPE&host=$TEMP_DOMAIN"
            if [ "$VLESS_TYPE" = "ws" ]; then
                FINAL_LINK="$FINAL_LINK&path=$VLESS_PATH"
            fi
            FINAL_LINK="$FINAL_LINK#$NODE_NAME"
        else
            VMESS_JSON="{\"v\":\"2\",\"ps\":\"$NODE_NAME\",\"add\":\"$TEMP_DOMAIN\",\"port\":443,\"id\":\"$VLESS_UUID\",\"aid\":0,\"scy\":\"auto\",\"net\":\"$VLESS_TYPE\",\"type\":\"none\",\"host\":\"$TEMP_DOMAIN\",\"path\":\"$VLESS_PATH\",\"tls\":\"tls\",\"sni\":\"$TEMP_DOMAIN\"}"
            VMESS_B64=$(echo -n "$VMESS_JSON" | base64 | tr -d '\n')
            FINAL_LINK="vmess://$VMESS_B64"
        fi
        
        echo -e "\n${GREEN}=== 部署成功 【臨時域名模式】 ===${NC}"
        echo -e "原節點名稱: $NODE_NAME"
        echo -e "轉發連接埠: $DETECTED_PORT"
        echo -e "分配的臨時域名: $TEMP_DOMAIN"
        echo -e "您的臨時 Argo 節點 $NODE_TYPE 連結為 (注意：VPS 重啟或重開服務後域名會刷新):"
        echo -e "${GREEN}$FINAL_LINK${NC}\n"
    else
        echo -e "${RED}錯誤: 獲取臨時域名超時！請執行 'journalctl -u cloudflared-argo-${SAFE_NODE_NAME} -n 30' 檢查日誌。${NC}"
    fi
fi

````

## File: Clash_Rules.YAML
````YAML
port: 7890
socks-port: 7891
mixed-port: 7893
redir-port: 7892
tproxy-port: 7895
allow-lan: true
bind-address: "*"
mode: rule
log-level: info
ipv6: false
external-controller: 0.0.0.0:9090
tcp-concurrent: true
unified-delay: true

# 啟用 TCP Fast Open，降低建立連線的握手延遲
fast-open: true

# ==================== 設定檔快取 ====================
profile:
  store-selected: true
  store-fake-ip: true

# ==================== 流量嗅探器 Sniffer ====================
sniffer:
  enable: true
  override-destination: true
  sniff:
    QUIC:
      ports:
        - 443
    TLS:
      ports:
        - 443
        - 8443
    HTTP:
      ports:
        - 80
        - 8080-8880
      override-destination: true
  force-domain:
    - "+.netflix.com"
    - "+.nflxvideo.net"
    - "+.amazonaws.com"
    - "+.media.dssott.com"
  skip-domain:
    - "+.apple.com"
    - "Mijia Cloud"
    - "dlg.io.mi.com"
    - "+.oray.com"
    - "+.sunlogin.net"
    - "+.push.apple.com"
  parse-pure-ip: true
  force-dns-mapping: true

# ==================== 進階 DNS 設定 ====================
dns:
  enable: true
  ipv6: false
  listen: 0.0.0.0:1053
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter-mode: blacklist
  respect-rules: true  # 開啟：讓海外 DoH 安全地走代理，防止國內 DNS 污染
  fake-ip-filter:
    - '*.lan'
    - '*.local'
    - '*.localhost'
    - '*.home.arpa'
    - 'captive.apple.com'
    - 'time.apple.com'
    - 'time.*.apple.com'
    - 'time.*.com'
    - 'time.*.gov'
    - 'time.*.edu.cn'
    - 'ntp.*.com'
    # 讓國內網站與蘋果服務強制返回真實 IP（配合 rule-set 屬性）
    - 'rule-set:cn'
    - 'rule-set:private'
    - 'rule-set:apple'
  
  # 💥 1. 基礎 DNS：必須使用傳統實體 IP（不可改動）
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 8.8.8.8
    - 1.1.1.1

  # 💥 2. 節點專用 DNS（全部使用 IP 型 DoH，免除任何域名解析，極速啟動）
  proxy-server-nameserver:
    - https://223.5.5.5/dns-query
    - https://8.8.8.8/dns-query

  # 💥 3. 網域特殊分流（國內、蘋果獨立優化）
  nameserver-policy:
    # 國內直連網站
    "rule-set:cn":
      - https://223.5.5.5/dns-query
      - https://doh.pub/dns-query

    # 蘋果服務
    "rule-set:apple":
      - https://223.5.5.5/dns-query
      - https://8.8.8.8/dns-query

  # 💥 4. 國外網站兜底 DNS（推薦使用海外頂級 IP 型 DoH，自動走代理，防污染且速度最快）
  nameserver:
    - https://8.8.8.8/dns-query
    - https://1.1.1.1/dns-query

# ==================================================
# 代理節點設定
# ==================================================
proxies:

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
    proxies:

  - name: 💬 AI 服務
    type: select
    proxies:
      - ⚡ 自動選擇
      - 🚀 節點選擇

  - name: 🍎 蘋果服務
    type: select
    proxies:
      - DIRECT
      - 🚀 節點選擇

  - name: Ⓜ️ 微軟服務
    type: select
    proxies:
      - DIRECT
      - 🚀 節點選擇

  - name: 🎮 遊戲平台
    type: select
    proxies:
      - DIRECT
      - 🚀 節點選擇

  - name: 🌐 非中國
    type: select
    proxies:
      - 🚀 節點選擇
      - DIRECT

  - name: 🇨🇳 國內服務
    type: select
    proxies:
      - DIRECT
      - 🚀 節點選擇

  - name: 🏠 私有網絡
    type: select
    proxies:
      - DIRECT

  - name: 🐟 漏網之魚
    type: select
    proxies:
      - 🚀 節點選擇
      - DIRECT

  - name: 🛑 廣告攔截
    type: select
    proxies:
      - REJECT
      - DIRECT

# ==================================================
# 規則集 Rule Providers (採用 MetaCubeX meta 格式優化)
# ==================================================
rule-providers:
  my-ai:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/sammy0101/myself/refs/heads/main/geosite_ai_hk_proxy.mrs"
    path: ./ruleset/my-ai.mrs
    interval: 86400

  category-ads-all:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ads-all.mrs"
    path: ./ruleset/category-ads-all.mrs
    interval: 86400

  private:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs"
    path: ./ruleset/private.mrs
    interval: 86400

  private-ip:
    type: http
    behavior: ipcidr
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs"
    path: ./ruleset/private-ip.mrs
    interval: 86400

  microsoft:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs"
    path: ./ruleset/microsoft.mrs
    interval: 86400

  steam:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/steam.mrs"
    path: ./ruleset/steam.mrs
    interval: 86400

  epicgames:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/epicgames.mrs"
    path: ./ruleset/epicgames.mrs
    interval: 86400

  ea:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ea.mrs"
    path: ./ruleset/ea.mrs
    interval: 86400

  ubisoft:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ubisoft.mrs"
    path: ./ruleset/ubisoft.mrs
    interval: 86400

  blizzard:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/blizzard.mrs"
    path: ./ruleset/blizzard.mrs
    interval: 86400

  apple:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs"
    path: ./ruleset/apple.mrs
    interval: 86400

  geolocation-non-cn:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs"
    path: ./ruleset/geolocation-non-cn.mrs
    interval: 86400

  cn:
    type: http
    behavior: domain
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs"
    path: ./ruleset/cn.mrs
    interval: 86400

  cn-ip:
    type: http
    behavior: ipcidr
    format: mrs
    url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs"
    path: ./ruleset/cn-ip.mrs
    interval: 86400

# ==================================================
# 流量路由 Rules
# ==================================================
rules:
  # 1. 廣告與內網
  - RULE-SET,category-ads-all,🛑 廣告攔截
  - RULE-SET,private,🏠 私有網絡
  - RULE-SET,private-ip,🏠 私有網絡,no-resolve

  # 2. 強制代理業務 (專屬 AI 規則集)
  - RULE-SET,my-ai,💬 AI 服務

  # 3. Microsoft 服務分流
  - RULE-SET,microsoft,Ⓜ️ 微軟服務

  # 4. 遊戲平台分流
  - RULE-SET,steam,🎮 遊戲平台
  - RULE-SET,epicgames,🎮 遊戲平台
  - RULE-SET,ea,🎮 遊戲平台
  - RULE-SET,ubisoft,🎮 遊戲平台
  - RULE-SET,blizzard,🎮 遊戲平台

  # 5. Apple 服務分流
  - RULE-SET,apple,🍎 蘋果服務

  # 6. 非中國網站：走代理
  - RULE-SET,geolocation-non-cn,🌐 非中國

  # 7. 中國國內網域與 IP：走直連
  - RULE-SET,cn,🇨🇳 國內服務
  - RULE-SET,cn-ip,🇨🇳 國內服務,no-resolve

  # 8. 國外網站兜底：全走代理
  - MATCH,🐟 漏網之魚

````

## File: Sing-Box_Rules.JSON
````JSON
{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "dns": {
    "servers": [
      {
        "tag": "remote-dns",
        "address": "https://dns.google/dns-query",
        "address_resolver": "local-dns",
        "detour": "🚀 節點選擇"
      },
      {
        "tag": "local-dns",
        "address": "223.5.5.5",
        "detour": "direct"
      },
      {
        "tag": "system-dns",
        "address": "local",
        "detour": "direct"
      },
      {
        "tag": "block-dns",
        "address": "rcode://success"
      }
    ],
    "rules": [
      { "outbound": "any", "server": "system-dns" },
      { "clash_mode": "Direct", "server": "system-dns" },
      { "clash_mode": "Global", "server": "remote-dns" },
      { "rule_set": "rs-ads", "server": "block-dns" },
      {
        "domain": [
          "github.com",
          "raw.githubusercontent.com",
          "githubusercontent.com",
          "gh-proxy.com"
        ],
        "server": "local-dns"
      },
      {
        "rule_set": [
          "rs-cn",
          "rs-private"
        ],
        "server": "local-dns",
        "disable_cache": true
      },
      {
        "rule_set": [
          "rs-apple"
        ],
        "server": "system-dns",
        "disable_cache": true
      }
    ],
    "fakeip": {
      "enabled": true,
      "inet4_range": "198.18.0.0/15",
      "inet6_range": "fc00::/18"
    },
    "independent_cache": true,
    "final": "remote-dns",
    "strategy": "ipv4_only"
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in",
      "interface_name": "tun0",
      "address": [
        "172.19.0.1/30",
        "fd00::1/126"
      ],
      "stack": "mixed",
      "auto_route": true,
      "strict_route": true,
      "sniff": true,
      "sniff_override_destination": true
    }
  ],
  "outbounds": [
    { "type": "selector", "tag": "🚀 節點選擇", "outbounds": ["⚡ 自動選擇", "direct"] },
    { "type": "urltest", "tag": "⚡ 自動選擇", "outbounds": [], "url": "https://www.gstatic.com/generate_204", "interval": "3m", "tolerance": 50 },
    { "type": "selector", "tag": "💬 AI 服務", "outbounds": ["⚡ 自動選擇", "🚀 節點選擇"] },
    { "type": "selector", "tag": "🍎 蘋果服務", "outbounds": ["direct", "🚀 節點選擇"] },
    { "type": "selector", "tag": "Ⓜ️ 微軟服務", "outbounds": ["direct", "🚀 節點選擇"] },
    { "type": "selector", "tag": "🎮 遊戲平台", "outbounds": ["direct", "🚀 節點選擇"] },
    { "type": "selector", "tag": "🌐 非中國", "outbounds": ["🚀 節點選擇", "direct"] },
    { "type": "selector", "tag": "🇨🇳 國內服務", "outbounds": ["direct", "🚀 節點選擇"] },
    { "type": "selector", "tag": "🏠 私有網絡", "outbounds": ["direct"] },
    { "type": "selector", "tag": "🐟 漏網之魚", "outbounds": ["🚀 節點選擇", "direct"] },
    { "type": "selector", "tag": "🛑 廣告攔截", "outbounds": ["block", "direct"] },
    
    { "type": "direct", "tag": "direct" },
    { "type": "direct", "tag": "DIRECT" },
    { "type": "block", "tag": "block" },
    { "type": "block", "tag": "REJECT" },
    { "type": "dns", "tag": "dns-out" }
  ],
  "route": {
    "rule_set": [
      { "type": "remote", "tag": "rs-ai", "format": "binary", "url": "https://raw.githubusercontent.com/sammy0101/myself/refs/heads/main/geosite_ai_hk_proxy.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-apple", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/apple.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-microsoft", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/microsoft.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-steam", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/steam.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-epicgames", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/epicgames.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-ea", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/ea.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-ubisoft", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/ubisoft.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-blizzard", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/blizzard.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-geolocation-!cn", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/geolocation-!cn.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-cn", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/cn.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "ip-cn", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/cn.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-ads", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/category-ads-all.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "rs-private", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/private.srs", "download_detour": "direct" },
      { "type": "remote", "tag": "ip-private", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/private.srs", "download_detour": "direct" }
    ],
    "rules": [
      { "protocol": "dns", "outbound": "dns-out" },
      { "clash_mode": "Direct", "outbound": "direct" },
      { "clash_mode": "Global", "outbound": "🚀 節點選擇" },
      { "rule_set": "rs-ads", "outbound": "block" },
      { "rule_set": ["rs-private", "ip-private"], "outbound": "🏠 私有網絡" },
      { "rule_set": "rs-ai", "outbound": "💬 AI 服務" },
      { "rule_set": "rs-microsoft", "outbound": "Ⓜ️ 微軟服務" },
      { "rule_set": ["rs-steam", "rs-epicgames", "rs-ea", "rs-ubisoft", "rs-blizzard"], "outbound": "🎮 遊戲平台" },
      { "rule_set": "rs-geolocation-!cn", "outbound": "🌐 非中國" },
      { "rule_set": "rs-apple", "outbound": "🍎 蘋果服務" },
      { "rule_set": ["rs-cn", "ip-cn"], "outbound": "🇨🇳 國內服務" },
      { "outbound": "🐟 漏網之魚" }
    ],
    "auto_detect_interface": true
  },
  "experimental": {
    "clash_api": {
      "external_controller": "127.0.0.1:9090",
      "external_ui": "ui",
      "secret": "",
      "default_mode": "rule"
    },
    "cache_file": {
      "enabled": true,
      "store_fakeip": true
    }
  }
}

````

## File: src/index.ts
````ts
// src/index.ts
// @ts-ignore
import packageJson from '../package.json';
import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import { toSingBoxWithTemplate, toClashWithTemplate, toBase64 } from './generator';
import { deduplicateNodeNames, groupNodesByFlag } from './utils';

const version = packageJson.version || '2.5.0';

// 輔助載入與解析節點（不含流量統計，專供 API 使用）
async function loadNodes(urlParam: string): Promise<ProxyNode[]> {
  const inputs = urlParam.split(/[\n\r|]+/); 
  const allNodes: ProxyNode[] = [];

  for (const input of inputs) {
    const trimmed = input.trim(); 
    if (!trimmed) continue;
    
    if (trimmed.startsWith('http')) { 
      try { 
        const separator = trimmed.includes('?') ? '&' : '?';
        const fetchUrl = `${trimmed}${separator}t=${Date.now()}`;
        
        const resp = await fetch(fetchUrl, { 
          headers: { 
            'User-Agent': 'v2rayNG/1.8.5',
            'Accept': '*/*'
          } 
        }); 
        
        if (resp.ok) { 
          const text = await resp.text(); 
          if (!text.trim().startsWith('<')) {
             try {
               const parsed = await parseContent(text);
               allNodes.push(...parsed);
             } catch(err) {}
          }
        }
      } catch (e) {} 
    } else { 
      try {
        const parsed = await parseContent(trimmed);
        allNodes.push(...parsed); 
      } catch(err) {}
    }
  }
  return allNodes;
}

// 安全的 Base64 編碼，防止中文節點名解析錯誤
function safeBtoa(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    return btoa(str);
  }
}

// 動態從 GitHub 獲取模板腳本並進行變數置換
async function getArgoScriptFromGithub(node: ProxyNode, port: string, token: string, domain: string): Promise<string> {
  const GITHUB_TEMPLATE_URL = `https://raw.githubusercontent.com/sammy0101/cf-sub-converter/main/argo.sh?t=${Date.now()}`;
  let template = "";
  
  try {
    const res = await fetch(GITHUB_TEMPLATE_URL, { headers: { 'User-Agent': 'v2rayNG/1.8.5' } });
    if (res.ok) {
      template = await res.text();
    } else {
      throw new Error("GitHub Fetch Failed");
    }
  } catch(e) {
    // 降級備用本地極簡模板 
    template = `#!/bin/bash
echo "警告: 無法從 GitHub 獲取最新 argo.sh 模板，正在使用降級極簡部署..."
if ! command -v cloudflared &> /dev/null; then
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
fi
cloudflared tunnel --url http://127.0.0.1:{{VLESS_PORT}}
`;
  }

  const vlessType = node.network || 'ws';
  const vlessPath = node.wsPath || '/';
  
  // 統一節點名稱格式為：[原節點名]_Argo
  const argoNodeName = `${node.name}_Argo`;
  const isTls = node.tls ? "true" : "false";
  const realHost = node.wsHeaders?.Host || node.sni || node.server; 

  // 替換模板中的自訂佔位符
  return template
    .replace("{{NODE_TYPE}}", node.type)
    .replace("{{VLESS_UUID}}", node.uuid || '')
    .replace("{{VLESS_PATH}}", vlessPath)
    .replace("{{VLESS_TYPE}}", vlessType)
    .replace("{{VLESS_PORT}}", port)
    .replace("{{NODE_NAME}}", argoNodeName)
    .replace("{{TUNNEL_TOKEN}}", token.trim())
    .replace("{{CUSTOM_DOMAIN}}", domain.trim())
    .replace("{{VLESS_TLS}}", isTls)
    .replace("{{ORIGIN_HOST}}", realHost);
}

export default {
async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
const url = new URL(request.url);

// 跨域預檢
if (request.method === 'OPTIONS') {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// GET /argo/sh/:id 路由 (供 VPS 執行 wget/curl 讀取一鍵安裝腳本)
if (request.method === 'GET' && url.pathname.startsWith('/argo/sh/')) {
  const scriptId = url.pathname.split('/').pop();
  if (env.SUB_CACHE && scriptId) {
    const script = await env.SUB_CACHE.get(`script:${scriptId}`);
    if (script) {
      return new Response(script, {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8', 
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
  }
  return new Response('# 錯誤: 該腳本不存在或已過期 (有效期 1 小時)，請重新在網頁上生成。\nexit 1\n', { 
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
  });
}

// POST /api/parse-argo (同時解析並篩選 VLESS 和 VMess 節點)
if (request.method === 'POST' && (url.pathname === '/api/parse-vless' || url.pathname === '/api/parse-argo')) {
  try {
    const body: any = await request.json();
    const rawUrl = body.url || '';
    if (!rawUrl.trim()) {
      return new Response(JSON.stringify({ error: '請輸入有效的節點內容' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }

    const allNodes = await loadNodes(rawUrl);
    // 篩選 VLESS & VMess
    const argoCompatibleNodes = allNodes.filter(n => n.type === 'vless' || n.type === 'vmess').map((n, idx) => ({
      index: idx,
      name: n.name,
      server: n.server,
      port: n.port,
      type: n.type,
      host: n.wsHeaders?.Host || n.sni || n.server
    }));

    return new Response(JSON.stringify(argoCompatibleNodes), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });
  }
}

// POST /api/argo-generate (生成 VPS 腳本與獨立 Argo 明文節點)
if (request.method === 'POST' && url.pathname === '/api/argo-generate') {
  try {
    const body: any = await request.json();
    const rawUrl = body.url || '';
    const selectedIndices: number[] = body.indices || [];
    const port = body.port || '8080';
    const token = body.token || '';
    const domain = body.domain || '';

    if (!rawUrl.trim() || selectedIndices.length === 0) {
      return new Response(JSON.stringify({ error: '無效的參數或未選擇 any 節點' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }

    const allNodes = await loadNodes(rawUrl);
    const compatibleNodes = allNodes.filter(n => n.type === 'vless' || n.type === 'vmess');
    const selectedObjects = selectedIndices.map(idx => compatibleNodes[idx]).filter(Boolean);

    if (selectedObjects.length === 0) {
      return new Response(JSON.stringify({ error: '選擇的節點不存在' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }

    let scripts = '';
    const generatedNodesData: any[] = [];

    for (let i = 0; i < selectedObjects.length; i++) {
      const node = selectedObjects[i];
      const originalIndex = selectedIndices[i];
      
      scripts += await getArgoScriptFromGithub(node, port, token, domain) + '\n\n';

      const targetDomain = (token.trim() && domain.trim()) ? domain.trim() : "請在VPS執行一鍵安裝腳本獲取臨時域名.trycloudflare.com";
      
      // 格式優化：統一變更節點名字後置：[原節點名]_Argo
      const argoNodeName = `${node.name}_Argo`;

      let argoLink = '';
      if (node.type === 'vless') {
        argoLink = `vless://${node.uuid}@${targetDomain}:443?encryption=none&security=tls&type=${node.network || 'ws'}&host=${targetDomain}&path=${node.wsPath || '/'}#${encodeURIComponent(argoNodeName)}`;
      } else {
        const vmessObj = {
          v: "2", ps: argoNodeName, add: targetDomain, port: 443, id: node.uuid,
          aid: 0, scy: "auto", net: node.network || 'ws', type: "none",
          host: targetDomain, path: node.wsPath || '/', tls: "tls", sni: targetDomain
        };
        argoLink = 'vmess://' + safeBtoa(JSON.stringify(vmessObj));
      }

      generatedNodesData.push({ originalIndex, link: argoLink });
    }

    // 將 Bash 腳本存入 KV 中 (保留 1 小時)
    let scriptId = '';
    if (env.SUB_CACHE) {
      scriptId = crypto.randomUUID();
      await env.SUB_CACHE.put('script:' + scriptId, scripts, { expirationTtl: 3600 });
    }

    return new Response(JSON.stringify({ 
      scriptId: scriptId, 
      argoNodes: generatedNodesData 
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });
  }
}

// 0. GET /version 
if (request.method === 'GET' && url.pathname === '/version') {
  return new Response(`subconverter v${version} ${url.host} backend\n`, {
    headers: { 
      'Content-Type': 'text/plain; charset=utf-8', 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*'
    } 
  });
}

// 1. POST /save 
if (request.method === 'POST' && url.pathname === '/save') {
  try {
    const body: any = await request.json();
    if (!body.path || !body.content) return new Response('Missing path or content', { status: 400 });
    
    const saveData = {
      content: body.content,
      include: body.include || '',
      exclude: body.exclude || '',
      rename: body.rename || ''
    };
    await env.SUB_CACHE.put(body.path, JSON.stringify(saveData));
    
    const redirectUrl = `/?url=${encodeURIComponent(body.content)}&include=${encodeURIComponent(body.include || '')}&exclude=${encodeURIComponent(body.exclude || '')}&rename=${encodeURIComponent(body.rename || '')}`;
    return new Response(null, { 
      status: 302, 
      headers: { 'Location': redirectUrl } 
    });
  } catch (e) { return new Response('Error saving profile', { status: 500 }); }
}

// 2. KV 收藏 API
const FAVS_KEY = 'favorites';

async function getFavs(): Promise<any[]> {
  const data = await env.SUB_CACHE.get(FAVS_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveFavs(favs: any[]): Promise<void> {
  await env.SUB_CACHE.put(FAVS_KEY, JSON.stringify(favs));
}

if (request.method === 'GET' && url.pathname === '/favs') {
  const favs = await getFavs();
  return new Response(JSON.stringify(favs), { 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
  });
}

if (request.method === 'POST' && url.pathname === '/favs') {
  try {
    const body: any = await request.json();
    if (!body.name || !body.url) return new Response('Missing name or url', { status: 400 });
    const favs = await getFavs();
    favs.push({ 
      name: body.name, 
      url: body.url, 
      include: body.include || '', 
      exclude: body.exclude || '',
      rename: body.rename || ''
    });
    await saveFavs(favs);
    return new Response('OK', { status: 200 });
  } catch (e) { return new Response('Error saving favorite', { status: 500 }); }
}

if (request.method === 'PUT' && url.pathname === '/favs') {
  try {
    const body: any = await request.json();
    if (body.index === undefined || !body.name || !body.url) return new Response('Missing data', { status: 400 });
    const favs = await getFavs();
    if (body.index >= 0 && body.index < favs.length) {
      favs[body.index] = { 
        name: body.name, 
        url: body.url, 
        include: body.include || '', 
        exclude: body.exclude || '',
        rename: body.rename || ''
      };
      await saveFavs(favs);
    }
    return new Response('OK', { status: 200 });
  } catch (e) { return new Response('Error updating favorite', { status: 500 }); }
}

if (request.method === 'DELETE' && url.pathname === '/favs') {
  try {
    const body: any = await request.json();
    if (body.index === undefined) return new Response('Missing index', { status: 400 });
    const favs = await getFavs();
    if (body.index >= 0 && body.index < favs.length) {
      favs.splice(body.index, 1);
      await saveFavs(favs);
    }
    return new Response('OK', { status: 200 });
  } catch (e) { return new Response('Error deleting favorite', { status: 500 }); }
}

// 3. GET /path (讀取短連結或一般轉換)
let urlParam = url.searchParams.get('url') || '';
let includeParam = url.searchParams.get('include') || '';
let excludeParam = url.searchParams.get('exclude') || '';
let renameParam = url.searchParams.get('rename') || '';

const path = decodeURIComponent(url.pathname.slice(1)); 

if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
  const stored = await env.SUB_CACHE.get(path);
  if (stored) { 
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.content) {
        urlParam = parsed.content;
        if (!includeParam) includeParam = parsed.include || '';
        if (!excludeParam) excludeParam = parsed.exclude || '';
        if (!renameParam) renameParam = parsed.rename || '';
      }
    } catch (e) {
      urlParam = stored; 
    }
  }
}

if (!urlParam || urlParam.trim() === '') {
  if (path === 'sub') {
    return new Response('Error: Missing parameter "url"', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  const dynamicHtml = HTML_PAGE.replace('v2.5.0', `v${version}`);
  return new Response(dynamicHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// 4. 解析並下載 
const inputs = urlParam.split(/[\n\r|]+/); 
const allNodes: ProxyNode[] = [];
const errors: string[] = [];

let totalUpload = 0;
let totalDownload = 0;
let totalTotal = 0;
let minExpire = 0;
let hasTrafficInfo = false;

for (const input of inputs) {
  const trimmed = input.trim(); 
  if (!trimmed) continue;
  
  if (trimmed.startsWith('http')) { 
    try { 
      const separator = trimmed.includes('?') ? '&' : '?';
      const fetchUrl = `${trimmed}${separator}t=${Date.now()}`;
      
      const resp = await fetch(fetchUrl, { 
        headers: { 
          'User-Agent': 'v2rayNG/1.8.5',
          'Accept': '*/*'
        } 
      }); 
      
      if (resp.ok) { 
        const text = await resp.text(); 
        
        const userInfo = resp.headers.get('subscription-userinfo');
        if (userInfo) {
          hasTrafficInfo = true;
          const uploadMatch = userInfo.match(/upload=(\d+)/i);
          const downloadMatch = userInfo.match(/download=(\d+)/i);
          const totalMatch = userInfo.match(/total=(\d+)/i);
          const expireMatch = userInfo.match(/expire=(\d+)/i);

          totalUpload += uploadMatch ? parseInt(uploadMatch[1]) : 0;
          totalDownload += downloadMatch ? parseInt(downloadMatch[1]) : 0;
          totalTotal += totalMatch ? parseInt(totalMatch[1]) : 0;
          
          const expireVal = expireMatch ? parseInt(expireMatch[1]) : 0;
          if (expireVal > 0) {
            if (minExpire === 0 || expireVal < minExpire) {
              minExpire = expireVal; 
            }
          }
        }

        if (text.trim().startsWith('<')) {
           errors.push(`❌ [${trimmed}]\n失敗原因: 伺服器回傳了 HTML 網頁而不是訂閱代碼。`);
        } else {
           try {
             const parsed = await parseContent(text);
             allNodes.push(...parsed);
           } catch(err: any) {
             errors.push(`⚠️ [${trimmed}]\n失敗原因: ${err.message}\n內容預覽: ${text.substring(0, 100)}...`);
           }
        }
      } else {
        errors.push(`❌ [${trimmed}]\n失敗原因: HTTP 狀態碼 ${resp.status} ${resp.statusText}`);
      }
    } catch (e: any) {
      errors.push(`❌ [${trimmed}]\n連線錯誤: ${e.message}`);
    } 
  } else { 
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed); 
    } catch(err: any) {
      errors.push(`⚠️ [手動輸入內容]\n失敗原因: ${err.message}`);
    }
  }
}

if (allNodes.length === 0) {
  const errorReport = `未解析到任何有效節點。\n\n🔍 詳細錯誤診斷報告：\n-------------------------\n${errors.join('\n\n-------------------------\n')}`;
  return new Response(errorReport, { 
    status: 400, 
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' } 
  });
}

let filteredNodes = allNodes;

// 智慧節點名稱替換邏輯
if (renameParam) {
  try {
    const rules = renameParam.split('|');
    for (const rule of rules) {
      const trimmedRule = rule.trim();
      if (!trimmedRule) continue;

      if (trimmedRule.startsWith('DEL-')) {
        const search = trimmedRule.substring(4); 
        if (search) {
          filteredNodes.forEach(node => {
            if (node.name) {
              node.name = node.name.split(search).join('');
            }
          });
        }
      } else if (trimmedRule.includes('-')) {
        const index = trimmedRule.indexOf('-');
        const search = trimmedRule.substring(0, index).trim();
        const replace = trimmedRule.substring(index + 1).trim();
        
        if (search && replace !== undefined) {
          if (search.toUpperCase() === 'ALL') {
            filteredNodes.forEach(node => {
              node.name = replace;
            });
          } else {
            filteredNodes.forEach(node => {
              if (node.name) {
                node.name = node.name.split(search).join(replace);
              }
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Rename replacement failed:', e);
  }
}

// 💥 重構：正則表達式構建器，修復二次替換破壞正則表達式的重大 Bug
const buildFilterRegex = (param: string): RegExp => {
  const parts = param.split('|').map(part => {
    const trimmed = part.trim();
    if (!trimmed) return '';
    // 對正則表達式特殊字元進行安全轉義
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 單一次進行 x/X/x/X/× 字符相容替換
    return escaped.replace(/[xXｘＸ×]/g, '[xXｘＸ×]');
  }).filter(Boolean);
  
  return new RegExp(parts.join('|'), 'i');
};

if (includeParam) {
  try {
    const includeRegex = buildFilterRegex(includeParam);
    filteredNodes = filteredNodes.filter(node => includeRegex.test(node.name));
  } catch (e) {
    console.error('Invalid include regex:', e);
  }
}

if (excludeParam) {
  try {
    const excludeRegex = buildFilterRegex(excludeParam);
    filteredNodes = filteredNodes.filter(node => !excludeRegex.test(node.name));
  } catch (e) {
    console.error('Invalid exclude regex:', e);
  }
}

if (filteredNodes.length === 0) {
  return new Response('篩選與替換後，未剩下 any 有效節點。', { 
    status: 400, 
    headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
  });
}

// 智慧分群與去重複命名
const sortedNodes = groupNodesByFlag(filteredNodes);
const uniqueNodes = deduplicateNodeNames(sortedNodes);

let target = url.searchParams.get('target');

// 自適應 User-Agent 偵測邏輯
if (!target) {
  const ua = (request.headers.get('User-Agent') || '').toLowerCase();
  
  const isAgent = ua.includes('clash') || 
                  ua.includes('mihomo') || 
                  ua.includes('stash') || 
                  ua.includes('sing-box') || 
                  ua.includes('singbox') || 
                  ua.includes('shadowrocket') || 
                  ua.includes('v2ray') || 
                  ua.includes('surfboard') || 
                  ua.includes('quantumult') || 
                  ua.includes('hiddify') || 
                  ua.includes('subconverter');

  if (isAgent) {
    if (ua.includes('clash') || ua.includes('mihomo') || ua.includes('stash') || ua.includes('surfboard')) {
      target = 'clash';
    } else if (ua.includes('sing-box') || ua.includes('singbox') || ua.includes('hiddify')) {
      target = 'singbox';
    } else {
      target = 'base64';
    }
  }
}

if (!target) {
  const host = `https://${url.host}`;
  const encodedUrl = encodeURIComponent(urlParam);
  let filterQuery = '';
  if (includeParam) filterQuery += `&include=${encodeURIComponent(includeParam)}`;
  if (excludeParam) filterQuery += `&exclude=${encodeURIComponent(excludeParam)}`;
  if (renameParam) filterQuery += `&rename=${encodeURIComponent(renameParam)}`;

  const adaptiveLink = path ? `${host}/${path}` : `${host}/?url=${encodedUrl}${filterQuery}`;

  const htmlInfo = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>訂閱轉換結果</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; display: flex; justify-content: center; }
    .container { background: #1e293b; padding: 2rem; border-radius: 16px; max-width: 600px; width: 100%; }
    h1 { margin: 0 0 1.5rem 0; font-size: 1.5rem; text-align: center; }
    .result { background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .result-title { font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px; }
    .result-link { background: #334155; padding: 0.8rem; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 0.85rem; }
    .btn { display: block; color: white; text-align: center; padding: 1rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ 篩選並轉換完成 (${uniqueNodes.length} 節點)</h1>
    <div class="result">
      <div class="result-title">🔗 自適應 (自動辨識客戶端)</div>
      <div class="result-link">${adaptiveLink}</div>
    </div>
    <div class="result">
      <div class="result-title">📄 Sing-Box (JSON)</div>
      <div class="result-link">${host}/?url=${encodedUrl}${filterQuery}&target=singbox</div>
    </div>
    <div class="result">
      <div class="result-title">📋 Clash Meta (YAML)</div>
      <div class="result-link">${host}/?url=${encodedUrl}${filterQuery}&target=clash</div>
    </div>
    <div class="result">
      <div class="result-title">🔗 Base64</div>
      <div class="result-link">${host}/?url=${encodedUrl}${filterQuery}&target=base64</div>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 1.5rem;">
      <a class="btn" style="background: #3b82f6; margin-top: 0;" href="${host}/?url=${encodedUrl}${filterQuery}&target=base64">📥 下載 Base64 訂閱</a>
      <a class="btn" style="background: #f59e0b; margin-top: 0;" href="${host}/?url=${encodedUrl}${filterQuery}&target=clash">📥 下載 Clash Meta 訂閱</a>
      <a class="btn" style="background: #10b981; margin-top: 0;" href="${host}/?url=${encodedUrl}${filterQuery}&target=singbox">📥 下載 Sing-Box 訂閱</a>
    </div>
  </div>
</body>
</html>
`;
  return new Response(htmlInfo, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

let result = '';
let contentType = 'text/plain';
let fileExt = '.txt';

if (target === 'clash') { 
  result = await toClashWithTemplate(uniqueNodes); 
  contentType = 'text/yaml'; 
  fileExt = '.yaml';
} else if (target === 'base64') { 
  result = toBase64(uniqueNodes); 
  contentType = 'text/plain'; 
  fileExt = '.txt';
} else { 
  result = await toSingBoxWithTemplate(uniqueNodes); 
  contentType = 'application/json'; 
  fileExt = '.json';
}

const filename = `subscription${fileExt}`;

const responseHeaders: Record<string, string> = {
  'Content-Type': `${contentType}; charset=utf-8`, 
  'Access-Control-Allow-Origin': '*', 
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'profile-title': filename, 
  'subscription-title': filename,
  'Content-Disposition': `inline; filename="${filename}"`,
  'Profile-Update-Interval': '3600',
};

if (hasTrafficInfo) {
  let userInfoHeader = `upload=${totalUpload}; download=${totalDownload}; total=${totalTotal}`;
  if (minExpire > 0) {
    userInfoHeader += `; expire=${minExpire}`;
  }
  responseHeaders['subscription-userinfo'] = userInfoHeader;
}

return new Response(result, { headers: responseHeaders });
}
};

````

## File: src/constants.ts
````ts
// src/constants.ts
export const REMOTE_CONFIG = {
  singbox: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Sing-Box_Rules.JSON',
  clash: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Clash_Rules.YAML'
};

export const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SubConverter Pro | 專業訂閱轉換器</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  
  <style>
    :root {
      --bg-app: #0f172a;
      --bg-panel: #1e293b;
      --bg-input: #0f172a;
      --bg-hover: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --border-focus: #3b82f6;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-app); color: var(--text-main); line-height: 1.5; min-height: 100vh; -webkit-font-smoothing: antialiased;
    }
    svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .header {
      background-color: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.25rem; letter-spacing: -0.025em; }
    .brand svg { color: var(--primary); width: 1.75rem; height: 1.75rem; }
    .badge { background: rgba(59, 130, 246, 0.1); color: var(--primary); font-size: 0.75rem; padding: 4px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(59, 130, 246, 0.2); }
    .container { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .panel { 
      background-color: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow); 
      transform: translate3d(0,0,0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel-title { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .panel-title svg { color: var(--text-muted); }
    .form-group { margin-bottom: 1.25rem; }
    .form-group:last-child { margin-bottom: 0; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); margin-bottom: 0.5rem; }
    textarea, input[type="text"] {
      width: 100%; background-color: var(--bg-input); border: 1px solid var(--border); color: var(--text-main); border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: 0.95rem; transition: border-color 0.2s ease, box-shadow 0.2s ease; outline: none;
    }
    textarea { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; min-height: 140px; resize: vertical; line-height: 1.6; }
    textarea::placeholder, input::placeholder { color: #475569; }
    textarea:focus, input[type="text"]:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    
    .hint { 
      font-size: 0.8rem; 
      color: var(--text-muted); 
      margin-top: 0.4rem; 
      display: flex; 
      align-items: flex-start; 
      gap: 6px; 
    }
    .hint svg {
      flex-shrink: 0;
      margin-top: 2px;
      width: 14px;
      height: 14px;
    }
    .hint span {
      display: inline;
      white-space: normal;
      word-break: break-word;
    }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem; border: none; cursor: pointer; 
      transition: background-color 0.2s ease, transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; 
      user-select: none;
      transform: translate3d(0,0,0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .btn-primary { background-color: var(--primary); color: white; width: 100%; padding: 1rem; font-size: 1.05rem; }
    .btn-primary:hover:not(:disabled) { background-color: var(--primary-hover); transform: translate3d(0, -1px, 0); }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    .btn-icon { background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border); padding: 0.6rem; border-radius: var(--radius-sm); }
    .btn-icon:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--text-muted); }
    .btn-ghost { background: transparent; color: var(--text-muted); padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem;}
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-main); }
    .btn-danger:hover { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
    .results-wrapper { display: none; animation: slideUp 0.4s ease forwards; }
    .results-wrapper.show { display: block; }
    .result-item {
      display: flex; align-items: center; gap: 1rem; background-color: var(--bg-input); border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; transition: border-color 0.2s;
    }
    .result-item:hover { border-color: var(--text-muted); }
    .result-icon-box {
      width: 44px; height: 44px; border-radius: var(--radius-sm); background-color: var(--bg-panel); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary);
    }
    .result-info { flex: 1; min-width: 0; }
    .result-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; color: var(--text-main); }
    .result-desc { font-size: 0.8rem; color: var(--text-muted); }
    .result-input-wrapper { flex: 2; position: relative; }
    .result-input-wrapper input { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-panel); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-muted); }
    .result-actions { display: flex; gap: 6px; }
    
    .fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .fav-card {
      background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; cursor: pointer; 
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; 
      position: relative;
      transform: translate3d(0,0,0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      min-width: 0; 
    }
    .fav-card:hover { border-color: var(--primary); transform: translate3d(0, -2px, 0); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .fav-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    
    .fav-url { 
      font-family: 'JetBrains Mono', monospace; 
      font-size: 0.75rem; 
      color: var(--text-muted); 
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
    }
    
    .fav-actions { display: flex; gap: 8px; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); justify-content: flex-end; }
    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; border: 1px dashed var(--border); border-radius: var(--radius-md); }
    
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); z-index: 100; display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease;
    }
    .modal-overlay.show { display: flex; opacity: 1; }
    
    /* 💥 彈出視窗樣式優化：寬度放大到 720px，新增最大高度及滾動條 */
    .modal-content {
      background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 92%; max-width: 720px; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); transform: scale(0.95); transition: transform 0.2s ease;
      max-height: 92vh;
      overflow-y: auto;
    }
    
    /* 💥 節點內容與訂閱連結加高、字型調整，看的更清楚 */
    #favUrl {
      min-height: 280px;
      font-size: 0.85rem;
    }
    
    .modal-footer { 
      display: flex; 
      gap: 12px; 
      margin-top: 2rem; 
      justify-content: flex-end; 
    }
    
    .toast {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px); background: var(--bg-panel); color: var(--text-main); border: 1px solid var(--border); padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 500; font-size: 0.9rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 200; display: flex; align-items: center; gap: 8px;
    }
    .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    .toast.success svg { color: var(--success); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { animation: spin 1s linear infinite; }

    .cmd-group {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      align-items: center;
      width: 100%;
    }
    .cmd-group input {
      flex: 1;
      min-width: 0;
    }
    .cmd-group .btn {
      flex-shrink: 0;
      min-width: 110px;
    }

    @media (max-width: 768px) {
      textarea, input[type="text"] {
        font-size: 16px !important;
      }
    }

    @media (max-width: 640px) {
      .header {
        padding: 0.85rem 1.25rem;
      }
      .brand {
        font-size: 1.1rem;
      }
      .container {
        margin: 1.25rem auto;
        padding: 0 0.85rem;
        gap: 1rem;
      }
      .panel {
        padding: 1.25rem;
      }
      .panel-title {
        font-size: 1rem;
      }
      textarea {
        min-height: 110px;
      }
      .cmd-group {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
      }
      .cmd-group .btn {
        width: 100%;
      }
      
      .result-item {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 1rem;
      }
      .result-icon-box { 
        display: none; 
      }
      .result-info {
        margin-bottom: 2px;
      }
      .result-name {
        font-size: 0.9rem;
      }
      .result-desc {
        font-size: 0.75rem;
      }
      .result-input-wrapper input {
        font-size: 0.75rem;
        padding: 0.5rem;
      }
      .result-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
        margin-top: 4px;
      }
      .result-actions .btn-icon {
        width: 100%;
        height: 38px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    @media (max-width: 520px) {
      .fav-grid {
        grid-template-columns: 1fr;
        gap: 0.85rem;
      }
      .fav-card {
        padding: 1rem;
      }
      .modal-content {
        padding: 1.25rem;
      }
    }
  </style>
</head>
<body>

  <header class="header">
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
      SubConverter Pro
    </div>
    <span class="badge">v2.5.0</span>
  </header>

  <div class="container">
    <main class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          資料來源設定
        </h2>
      </div>
      
      <div class="form-group">
        <label for="urlInput">節點連結或訂閱地址 (支援多筆換行)</label>
        <textarea id="urlInput" placeholder="vmess://...\nvless://...\ntuic://...\nanytls://...\nhttps://example.com/sub"></textarea>
      </div>

      <div class="form-group" style="margin-top: 1.5rem;">
        <label for="includeKeywords">僅保留關鍵字節點 (選填，多個用 | 分隔)</label>
        <input type="text" id="includeKeywords" placeholder="例如: 🇭🇰|台灣|TW">
        <div class="hint">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>只保留名稱符合關鍵字的節點。例如輸入 <code>HK|TW</code>。</span>
        </div>
      </div>

      <div class="form-group" style="margin-top: 1.5rem;">
        <label for="excludeKeywords">排除關鍵字節點 (選填，多個用 | 分隔)</label>
        <input type="text" id="excludeKeywords" placeholder="examples: 流量|官網|重置|5x">
        <div class="hint">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>排除名稱符合關鍵字的節點（過濾垃圾廣告）。例如輸入 <code>5x</code>。</span>
        </div>
      </div>

      <div class="form-group" style="margin-top: 1.5rem;">
        <label for="renameKeywords">節點名稱替換 (選填，多個用 | 分隔)</label>
        <input type="text" id="renameKeywords" placeholder="例如: DEL-[69云]|移动优化-專線">
        <div class="hint">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>刪除用 <code>DEL-關鍵字</code>，替換用 <code>尋找-替換</code>。若要將所有節點統一改名，請用 <code>ALL-新名稱</code>（例如 <code>ALL-JP</code>）。多組規則用 <code>|</code> 隔開。</span>
        </div>
      </div>
      
      <div class="form-group" style="margin-top: 1.5rem;">
        <label for="shortCode">自訂路徑短連結 (選填)</label>
        <input type="text" id="shortCode" placeholder="例如: my-sub-2026">
        <div class="hint">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>設定後將儲存於雲端，生成固定不變的短連結</span>
        </div>
      </div>
      
      <button class="btn btn-primary" id="generateBtn" onclick="generate()" style="margin-top: 2rem;">
        <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>執行轉換</span>
      </button>
    </main>

    <!-- ⚡ 轉換結果面板 -->
    <section class="results-wrapper" id="results">
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            轉換結果
          </h2>
        </div>
        
        <!-- 1. 自適應 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <div class="result-info">
            <div class="result-name">自適應</div>
            <div class="result-desc">自動辨識客戶端 · 適用所有主流行動軟體</div>
          </div>
          <div class="result-input-wrapper"><input type="text" id="adaptiveUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('adaptiveUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('adaptiveUrl')" title="顯示 QR Code">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1"></rect>
                <rect width="5" height="5" x="16" y="3" rx="1"></rect>
                <rect width="5" height="5" x="3" y="16" rx="1"></rect>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
                <path d="M21 21v.01"></path>
                <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
                <path d="M3 12h.01"></path>
                <path d="M12 3h.01"></path>
                <path d="M12 16v.01"></path>
                <path d="M16 12h1"></path>
                <path d="M21 12v.01"></path>
                <path d="M12 21v-1"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 2. Base64 -->
        <div class="result-item">
          <div class="result-icon-box"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></div>
          <div class="result-info">
            <div class="result-name">Base64</div>
            <div class="result-desc">Base64 格式 · 適用 V2RayNG, PassWall</div>
          </div>
          <div class="result-input-wrapper"><input type="text" id="base64Url" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('base64Url')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('base64Url')" title="顯示 QR Code">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1"></rect>
                <rect width="5" height="5" x="16" y="3" rx="1"></rect>
                <rect width="5" height="5" x="3" y="16" rx="1"></rect>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
                <path d="M21 21v.01"></path>
                <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
                <path d="M3 12h.01"></path>
                <path d="M12 3h.01"></path>
                <path d="M12 16v.01"></path>
                <path d="M16 12h1"></path>
                <path d="M21 12v.01"></path>
                <path d="M12 21v-1"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 3. Clash Meta -->
        <div class="result-item">
          <div class="result-icon-box"><svg viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg></div>
          <div class="result-info">
            <div class="result-name">Clash Meta</div>
            <div class="result-desc">YAML 格式 · 適用 Clash Verge, ClashX</div>
          </div>
          <div class="result-input-wrapper"><input type="text" id="clashUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('clashUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('clashUrl')" title="顯示 QR Code">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1"></rect>
                <rect width="5" height="5" x="16" y="3" rx="1"></rect>
                <rect width="5" height="5" x="3" y="16" rx="1"></rect>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
                <path d="M21 21v.01"></path>
                <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
                <path d="M3 12h.01"></path>
                <path d="M12 3h.01"></path>
                <path d="M12 16v.01"></path>
                <path d="M16 12h1"></path>
                <path d="M21 12v.01"></path>
                <path d="M12 21v-1"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 4. Sing-Box -->
        <div class="result-item">
          <div class="result-icon-box"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>
          <div class="result-info">
            <div class="result-name">Sing-Box</div>
            <div class="result-desc">JSON 格式 · 適用 Surge, v2rayN 等</div>
          </div>
          <div class="result-input-wrapper"><input type="text" id="singboxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('singboxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('singboxUrl')" title="顯示 QR Code">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1"></rect>
                <rect width="5" height="5" x="16" y="3" rx="1"></rect>
                <rect width="5" height="5" x="3" y="16" rx="1"></rect>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
                <path d="M21 21v.01"></path>
                <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
                <path d="M3 12h.01"></path>
                <path d="M12 3h.01"></path>
                <path d="M12 16v.01"></path>
                <path d="M16 12h1"></path>
                <path d="M21 12v.01"></path>
                <path d="M12 21v-1"></path>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </section>

    <!-- ⚡ Argo 隧道一鍵生成器區塊 -->
    <main class="panel" style="margin-top: 1rem;">
      <div class="panel-header">
        <h2 class="panel-title" style="color: var(--primary);">
          <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          Argo 隧道一鍵生成器
        </h2>
      </div>
      
      <div class="form-group">
        <button class="btn btn-ghost" id="parseVlessBtn" onclick="parseVlessNodes()" style="width: 100%; justify-content: center; font-weight: 600;">
          第一步：解析並載入目前輸入的 VLESS / VMess 節點
        </button>
      </div>

      <div id="vlessSelectorWrapper" style="display: none; margin-top: 1.25rem; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; background: var(--bg-input);">
        <label style="margin-bottom: 0.75rem; display: block; font-weight: 600; color: var(--text-main);">選擇要複製並轉換的原始節點 (支援 VLESS / VMess，可多選)：</label>
        <div id="vlessCheckboxList" style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 4px; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
          <!-- 複選框動態生成 -->
        </div>
        
        <div class="form-group">
          <label>1. VPS 本地監聽連接埠 (預設已自動匹配您所選節點之端口，可手動修改)</label>
          <input type="text" id="argoLocalPort" value="8080" placeholder="例如: 8080、12345 等">
        </div>

        <div class="form-group" style="margin-top: 1rem;">
          <label>2. Cloudflare Tunnel Token (選填，若留空則自動啟用臨時隨機隧道)</label>
          <input type="text" id="argoTunnelToken" placeholder="若使用臨時隧道請留空；固定隧道請貼上 eyJhIjoiY2...">
        </div>

        <div class="form-group" style="margin-top: 1rem;">
          <label>3. 自訂綁定域名 (固定隧道必填，臨時隨機隧道免填)</label>
          <input type="text" id="argoCustomDomain" placeholder="例如: argo.yourdomain.com">
        </div>

        <button class="btn btn-primary" id="generateArgoBtn" onclick="generateArgo()" style="margin-top: 1.5rem; background: var(--success);">
          第二步：一鍵生成 Argo 節點與一鍵部署腳本
        </button>
      </div>
    </main>

    <!-- ⚡ Argo 轉換結果看板 -->
    <section class="results-wrapper" id="argoResults" style="margin-top: 1rem;">
      <div class="panel">
        <div class="panel-header" style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
          <h2 class="panel-title" style="color: var(--success);">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Argo 隧道生成成功
          </h2>
        </div>
        
        <!-- 一鍵極速部署指令 -->
        <div class="form-group" style="margin-top: 1.25rem;">
          <label style="color: var(--text-main); font-weight: 600;">📋 第一步：請在您的 VPS 上執行以下「一鍵極速安裝指令」【二選一，效果完全相同】(以 root 權限)：</label>
          
          <!-- curl 方案 -->
          <div class="cmd-group">
            <input type="text" id="argoCurlCmd" readonly style="font-family: monospace; font-size: 0.85rem; padding: 0.6rem 0.8rem; background: var(--bg-input);">
            <button class="btn btn-ghost" onclick="copyText('argoCurlCmd')">複製 curl 指令</button>
          </div>
          
          <div style="text-align: center; margin: 6px 0; font-size: 0.8rem; color: var(--text-muted); font-weight: bold;">或 (OR)</div>
          
          <!-- wget 方案 -->
          <div class="cmd-group">
            <input type="text" id="argoWgetCmd" readonly style="font-family: monospace; font-size: 0.85rem; padding: 0.6rem 0.8rem; background: var(--bg-input);">
            <button class="btn btn-ghost" onclick="copyText('argoWgetCmd')">複製 wget 指令</button>
          </div>
          
          <div class="hint" style="margin-top: 5px;">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;color: var(--success);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            VPS 將自動下載服務配置、啟動隧道。臨時隧道模式將在部署成功後直接於 VPS 終端機顯示最終 active 的節點連結！
          </div>
        </div>

        <!-- 第二步：顯示與複製整合後的明文列表 -->
        <div class="form-group" style="margin-top: 1.5rem;">
          <label style="color: var(--text-main); font-weight: 600;">🔗 第二步：新產生的 Argo 明文節點連結列表 (僅固定域名模式生效，臨時域名模式請直接在 VPS 複製)：</label>
          <textarea id="argoBase64Sub" placeholder="臨時域名具有動態性，一鍵指令部署成功後請直接於您 VPS 終端機內進行拷貝..." readonly style="min-height: 140px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; line-height:1.6;"></textarea>
          <button class="btn btn-ghost" onclick="copyText('argoBase64Sub')" style="margin-top: 0.5rem; width: 100%; justify-content: center;">複製明文節點列表</button>
          <div class="hint" style="margin-top: 8px; color: var(--success);">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;color: var(--success);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>💡 提示：請複製第一步的指令至您的 VPS 執行。如果是臨時隧道，運行成功後請直接在您 VPS 終端機複製最終連線連結！</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 已儲存的配置 -->
    <section class="panel">
      <div class="panel-header" style="margin-bottom: 0;">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          已儲存的配置
        </h2>
        <button class="btn btn-ghost" onclick="openModal()">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          新增配置
        </button>
      </div>
      
      <div id="favGrid" class="fav-grid">
        <div class="empty-state">目前尚未儲存 any 配置</div>
      </div>
    </section>
  </div>

  <div class="modal-overlay" id="modal">
    <div class="modal-content">
      <h3 class="modal-title" id="modalTitle">新增配置</h3>
      <div class="form-group">
        <label>配置名稱</label>
        <input type="text" id="favName" placeholder="例如: 公司專線">
      </div>
      <div class="form-group">
        <label>節點內容 / 訂閱連結</label>
        <textarea id="favUrl" placeholder="貼上節點內容..."></textarea>
      </div>
      <div class="form-group">
        <label>保留關鍵字 (選填)</label>
        <input type="text" id="favInclude" placeholder="例如: HK|TW">
      </div>
      <div class="form-group">
        <label>排除關鍵字 (選填)</label>
        <input type="text" id="favExclude" placeholder="例如: 流量|重置|官網">
      </div>
      <div class="form-group">
        <label>節點名稱替換 (選填，多個用 | 分隔)</label>
        <input type="text" id="favRename" placeholder="例如: DEL-[69云]|移动优化-專線">
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="saveFav()" style="width: auto; padding: 0.6rem 1.25rem; font-size: 16px;">儲存配置</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast">
    <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span id="toastMsg">提示訊息</span>
  </div>

  <script>
    let favs = [];
    
    async function loadFavs() {
      try {
        const resp = await fetch('/favs');
        if (resp.ok) favs = await resp.json();
        renderFavs();
      } catch(e) { console.error('Failed to load favs'); }
    }
    
    function renderFavs() {
      const grid = document.getElementById('favGrid');
      if (favs.length === 0) {
        grid.style.display = 'block';
        grid.innerHTML = '<div class="empty-state">目前尚未儲存 any 配置</div>';
        return;
      }
      grid.style.display = 'grid';
      grid.innerHTML = favs.map((f, i) => {
        const includeBadge = f.include ? \`<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.2); margin-right: 4px;">保: \${f.include}</span>\` : '';
        const excludeBadge = f.exclude ? \`<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2); margin-right: 4px;">排: \${f.exclude}</span>\` : '';
        const renameBadge = f.rename ? \`<span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); border-color: rgba(59, 130, 246, 0.2)">替: \${f.rename}</span>\` : '';
        
        return \`
          <div class="fav-card" onclick="useFav(\${i})">
            <div class="fav-title">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              \${f.name}
            </div>
            <div class="fav-url">\${f.url}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
              \${includeBadge}
              \${excludeBadge}
              \${renameBadge}
            </div>
            <div class="fav-actions">
              <button class="btn btn-ghost" onclick="event.stopPropagation(); editFav(\${i})">編輯</button>
              <button class="btn btn-ghost btn-danger" onclick="event.stopPropagation(); deleteFav(\${i})">刪除</button>
            </div>
          </div>\`;
      }).join('');
    }
    
    async function saveFav() {
      const name = document.getElementById('favName').value.trim();
      const url = document.getElementById('favUrl').value.trim();
      const include = document.getElementById('favInclude').value.trim();
      const exclude = document.getElementById('favExclude').value.trim();
      const rename = document.getElementById('favRename').value.trim();
      if (!name || !url) return showToast('請完整填寫名稱與內容', false);
      
      const editIndex = document.getElementById('modal').dataset.edit;
      const saveBtn = document.querySelector('.modal-footer .btn-primary');
      const originalSaveText = saveBtn.textContent;
      saveBtn.textContent = '儲存中...';
      
      try {
        if (editIndex !== '') {
          await fetch('/favs', { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ index: parseInt(editIndex), name, url, include, exclude, rename }) 
          });
        } else {
          await fetch('/favs', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, url, include, exclude, rename }) 
          });
        }
        closeModal();
        loadFavs();
        showToast('配置儲存成功');
      } catch(e) { 
        showToast('儲存失敗，請重試', false); 
      } finally {
        saveBtn.textContent = originalSaveText;
      }
    }
    
    async function deleteFav(index) {
      if (!confirm('確定要刪除這筆配置嗎？')) return;
      try {
        await fetch('/favs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index }) });
        loadFavs();
        showToast('已刪除配置');
      } catch(e) { showToast('刪除失敗', false); }
    }
    
    function useFav(index) {
      document.getElementById('urlInput').value = favs[index].url;
      document.getElementById('shortCode').value = favs[index].name.replace(/\\s+/g, '-').toLowerCase();
      document.getElementById('includeKeywords').value = favs[index].include || '';
      document.getElementById('excludeKeywords').value = favs[index].exclude || '';
      document.getElementById('renameKeywords').value = favs[index].rename || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('已載入配置：' + favs[index].name);
    }
    
    function editFav(index) {
      document.getElementById('modalTitle').textContent = '編輯配置';
      document.getElementById('favName').value = favs[index].name;
      document.getElementById('favUrl').value = favs[index].url;
      document.getElementById('favInclude').value = favs[index].include || '';
      document.getElementById('favExclude').value = favs[index].exclude || '';
      document.getElementById('favRename').value = favs[index].rename || '';
      document.getElementById('modal').dataset.edit = index;
      document.getElementById('modal').classList.add('show');
    }
    
    function openModal() {
      document.getElementById('modalTitle').textContent = '新增配置';
      document.getElementById('favName').value = '';
      document.getElementById('favUrl').value = '';
      document.getElementById('favInclude').value = '';
      document.getElementById('favExclude').value = '';
      document.getElementById('favRename').value = '';
      document.getElementById('modal').dataset.edit = '';
      document.getElementById('modal').classList.add('show');
    }
    
    function closeModal() {
      document.getElementById('modal').classList.remove('show');
    }
    
    async function generate() {
      const raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點連結 or 訂閱地址', false);
      
      const btn = document.getElementById('generateBtn');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg><span>處理中...</span>';
      
      const host = window.location.origin;
      const shortCode = document.getElementById('shortCode').value.trim();
      const include = document.getElementById('includeKeywords').value.trim();
      const exclude = document.getElementById('excludeKeywords').value.trim();
      const rename = document.getElementById('renameKeywords').value.trim();
      
      try {
        let baseUrl = '';
        if (shortCode) {
          await fetch('/save', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ path: shortCode, content: raw, include, exclude, rename }) 
          });
          baseUrl = host + '/' + shortCode;
        } else {
          baseUrl = host + '/?url=' + encodeURIComponent(raw);
          if (include) baseUrl += '&include=' + encodeURIComponent(include);
          if (exclude) baseUrl += '&exclude=' + encodeURIComponent(exclude);
          if (rename) baseUrl += '&rename=' + encodeURIComponent(rename);
        }
        
        const sep = baseUrl.includes('?') ? '&' : '?';
        document.getElementById('adaptiveUrl').value = baseUrl;
        document.getElementById('singboxUrl').value = baseUrl + sep + 'target=singbox';
        document.getElementById('clashUrl').value = baseUrl + sep + 'target=clash';
        document.getElementById('base64Url').value = baseUrl + sep + 'target=base64';
        
        document.getElementById('results').classList.add('show');
        showToast('轉換成功！請複製對應的訂閱連結');
        
      } catch(e) {
        showToast('生成失敗：' + e.message, false);
      }
      
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
    
    // ⚡ Argo 隧道前端解析邏輯 (支援 VLESS 與 VMess)
    async function parseVlessNodes() {
      const raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先在上方輸入節點連結或訂閱地址', false);
      
      const btn = document.getElementById('parseVlessBtn');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '正在與後端解析節點...';
      
      try {
        const resp = await fetch('/api/parse-argo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw })
        });
        
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || '解析失敗');
        }
        
        const nodes = await resp.json();
        const listEl = document.getElementById('vlessCheckboxList');
        
        if (nodes.length === 0) {
          showToast('目前輸入內容中未找到任何 VLESS / VMess 節點', false);
          document.getElementById('vlessSelectorWrapper').style.display = 'none';
          return;
        }
        
        listEl.innerHTML = nodes.map(n => \`
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <input type="checkbox" class="vless-chk" value="\${n.index}" data-port="\${n.port}" data-server="\${n.server}" data-host="\${n.host}" style="width: auto; height: auto; cursor: pointer;" onchange="syncDefaultPort()">
            <span style="font-size: 0.9rem; color: var(--text-main);">\${n.name} <span style="color: var(--text-muted); font-size: 0.8rem;">(\${n.server}:\${n.port} - \${n.type.toUpperCase()})</span></span>
          </label>
        \`).join('');
        
        document.getElementById('vlessSelectorWrapper').style.display = 'block';
        
        syncDefaultPort();
        
        showToast(\`解析完成，成功載入 \${nodes.length} 個 VLESS/VMess 節點！\`);
      } catch(e) {
        showToast('解析出錯: ' + e.message, false);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }

    // ⚡ 當勾選狀態改變時同步為所選節點之原生連接埠
    function syncDefaultPort() {
      const checkedInput = document.querySelector('.vless-chk:checked');
      if (checkedInput) {
        const port = checkedInput.getAttribute('data-port');
        document.getElementById('argoLocalPort').value = port;
      }
    }

    // ⚡ Argo 隧道一鍵生成
    async function generateArgo() {
      const raw = document.getElementById('urlInput').value.trim();
      const checkboxes = document.querySelectorAll('.vless-chk:checked');
      if (checkboxes.length === 0) return showToast('請至少選擇一個節點進行轉換', false);
      
      const indices = Array.from(checkboxes).map(cb => parseInt(cb.value));
      const port = document.getElementById('argoLocalPort').value.trim() || '8080';
      const token = document.getElementById('argoTunnelToken').value.trim();
      const domain = document.getElementById('argoCustomDomain').value.trim();
      
      if (token && !domain) return showToast('若使用固定隧道，必須填寫對應的自訂域名', false);
      
      const btn = document.getElementById('generateArgoBtn');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '正在生成中...';
      
      try {
        const resp = await fetch('/api/argo-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw, indices, port, token, domain })
        });
        
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || '生成失敗');
        }
        
        const res = await resp.json();
        const host = window.location.origin;

        // 1. 填入極簡一鍵指令
        const hasKv = res.scriptId && res.scriptId.trim() !== '';
        if (hasKv) {
          document.getElementById('argoCurlCmd').value = \`curl -sSL \${host}/argo/sh/\${res.scriptId} | bash\`;
          document.getElementById('argoWgetCmd').value = \`wget -qO- \${host}/argo/sh/\${res.scriptId} | bash\`;
        } else {
          document.getElementById('argoCurlCmd').value = "請綁定 KV 命名空間以解鎖極簡一鍵命令";
          document.getElementById('argoWgetCmd').value = "或在 wrangler.toml 中設定並部署。";
        }

        // 2. 下方明文文字框只顯示新產生的 Argo 節點
        const argoPlainLinks = res.argoNodes.map(x => x.link).join('\\n');
        document.getElementById('argoBase64Sub').value = argoPlainLinks;

        document.getElementById('argoResults').classList.add('show');
        showToast('🎉 Argo 隧道部署指令已成功生成！');
        document.getElementById('argoResults').scrollIntoView({ behavior: 'smooth' });
      } catch(e) {
        showToast('生成失敗: ' + e.message, false);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }

    function copyResult(id) {
      const input = document.getElementById(id);
      input.select();
      navigator.clipboard.writeText(input.value).then(() => showToast('已複製到剪貼簿'));
    }
    
    function copyText(id) {
      const el = document.getElementById(id);
      el.select();
      navigator.clipboard.writeText(el.value).then(() => showToast('已成功複製到剪貼簿！'));
    }

    function showQr(id) {
      const url = document.getElementById(id).value;
      if(!url) return;
      const win = window.open('', '_blank', 'width=420,height=480');
      if (!win) return showToast('請允許瀏覽器開啟彈出視窗', false);
      win.document.write(\`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>掃碼訂閱</title>
        <style>
          body { margin:0; background:#0f172a; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
          .qr-container { padding:24px; background:#ffffff; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.5); }
          .title { margin-top:24px; font-size:16px; color:#f8fafc; font-weight:600; letter-spacing:0.5px; }
          .subtitle { margin-top:8px; font-size:13px; color:#94a3b8; text-align:center; max-width:280px; word-break:break-all;}
        </style>
        </head><body>
        <div class="qr-container"><div id="qr"></div></div>
        <div class="title">使用客戶端掃描行動條碼</div>
        <div class="subtitle\">\${url}</div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\\/script>
        <script>
          setTimeout(() => {
            new QRCode(document.getElementById('qr'), { text: "\${url}", width: 260, height: 260, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
          }, 100);
        <\\/script>
        </body></html>
      \` );
    }
    
    function showToast(msg, isSuccess = true) {
      const t = document.getElementById('toast');
      const msgEl = document.getElementById('toastMsg');
      
      if(isSuccess) {
        t.classList.add('success');
        t.querySelector('svg').innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
      } else {
        t.classList.remove('success');
        t.querySelector('svg').innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
        t.querySelector('svg').style.color = 'var(--danger)';
      }
      
      msgEl.textContent = msg;
      t.classList.add('show');
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.querySelector('svg').style.color = '', 300);
      }, 3000);
    }
    
    loadFavs();
  </script>
</body>
</html>
`;

````

## File: src/parser.ts
````ts
// src/parser.ts
import { ProxyNode, WireGuardConfig } from "./types";
import { safeBase64Decode, tryDecodeURIComponent } from "./utils";

function parsePluginParams(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  str.split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (k && v) params[k] = v;
  });
  return params;
}

// --- 解析 Shadowsocks (含 Shadowsocks-2022 深度解析) ---
function parseShadowsocks(urlStr: string): ProxyNode | null {
  try {
    const getParam = (str: string, key: string): string => {
      const regex = new RegExp(`[?&]${key}=([^&#]*)`, 'i');
      const match = str.match(regex);
      return match ? tryDecodeURIComponent(match[1]) : '';
    };

    let raw = urlStr.replace('ss://', '');
    const hashIndex = raw.indexOf('#');
    let name = 'Shadowsocks';
    if (hashIndex !== -1) {
      name = tryDecodeURIComponent(raw.substring(hashIndex + 1));
      raw = raw.substring(0, hashIndex);
    }
    if (raw.includes('?')) { raw = raw.split('?')[0]; }

    let method = '';
    let password = '';
    let server = '';
    let portStr = '';
    
    if (raw.includes('@')) {
      const parts = raw.split('@');
      const serverPart = parts[parts.length - 1];
      const userPart = parts.slice(0, parts.length - 1).join('@');
      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      server = serverPart.substring(0, lastColonIndex);
      portStr = serverPart.substring(lastColonIndex + 1);
      if (server.startsWith('[') && server.endsWith(']')) server = server.slice(1, -1);
      try {
        const decoded = safeBase64Decode(userPart);
        if (decoded && decoded.includes(':')) { 
          const up = decoded.split(':');
          method = up[0];
          password = up.slice(1).join(':');
        } else {
          const up = userPart.split(':');
          method = up[0];
          password = up.slice(1).join(':');
        }
      } catch {
        const up = userPart.split(':');
        method = up[0];
        password = up.slice(1).join(':');
      }
    } else {
      const decoded = safeBase64Decode(raw);
      if (!decoded) return null;
      const atIndex = decoded.lastIndexOf('@');
      if (atIndex === -1) return null;
      const userPart = decoded.substring(0, atIndex);
      const serverPart = decoded.substring(atIndex + 1);
      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      server = serverPart.substring(0, lastColonIndex);
      portStr = serverPart.substring(lastColonIndex + 1);
      if (server.startsWith('[') && server.endsWith(']')) server = server.slice(1, -1);
      const firstColonIndex = userPart.indexOf(':');
      if (firstColonIndex === -1) return null;
      method = userPart.substring(0, firstColonIndex);
      password = userPart.substring(firstColonIndex + 1);
    }

    if (!server || !portStr || !method || !password) return null;
    const port = parseInt(portStr);
    if (isNaN(port)) return null;

    const pluginStr = getParam(urlStr, 'plugin');
    const security = getParam(urlStr, 'security');
    const sni = getParam(urlStr, 'sni') || getParam(urlStr, 'host') || server;
    const alpnStr = getParam(urlStr, 'alpn');
    const fp = getParam(urlStr, 'fp') || 'chrome';
    const echStr = getParam(urlStr, 'ech');

    const isTls = security === 'tls' || urlStr.includes('obfs=tls') || (alpnStr && alpnStr.length > 0) || (echStr && echStr.length > 0);
    const alpn = alpnStr ? alpnStr.split(',') : undefined;

    const isSs2022 = method.toLowerCase().includes('2022');

    const node: ProxyNode = {
      type: 'shadowsocks', name, server, port, cipher: method, password, udp: true,
      tls: isTls, sni, alpn, fingerprint: fp
    };

    const sb: Record<string, unknown> = {
      tag: name,
      type: 'shadowsocks',
      server: node.server,
      server_port: node.port,
      method: node.cipher,
      password: node.password
    };
    if (isSs2022) {
      sb.udp_over_tcp = true;
    }
    node.singboxObj = sb;

    const cl: Record<string, unknown> = {
      name,
      type: 'ss',
      server: node.server,
      port: node.port,
      cipher: node.cipher,
      password: node.password,
      udp: true,
      plugin: pluginStr ? pluginStr.split(';')[0] : undefined,
      'plugin-opts': pluginStr ? parsePluginParams(pluginStr.split(';').slice(1).join(';')) : undefined
    };
    if (isTls) {
      cl.smux = { enabled: true };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 VLESS (含 xhttp / SplitHTTP 與 Reality / Vision) ---
function parseVless(urlStr: string): ProxyNode | null {
  try {
    const fakeUrlStr = urlStr.replace(/^[^:]+:\/\//i, 'http://');
    const url = new URL(fakeUrlStr); 
    const params = url.searchParams; 
    const name = tryDecodeURIComponent(url.hash.slice(1)) || 'VLESS';
    
    let wsPath = params.get('path') || '/';
    if (!wsPath.startsWith('/')) wsPath = '/' + wsPath;

    const netType = params.get('type') || 'tcp';
    const isXhttp = netType === 'xhttp' || netType === 'splithttp';

    const node: ProxyNode = {
      type: 'vless',
      name,
      server: url.hostname,
      port: parseInt(url.port) || 443,
      uuid: url.username,
      tls: params.get('security') === 'tls' || params.get('security') === 'reality',
      flow: params.get('flow') || undefined,
      network: netType,
      sni: params.get('sni') || params.get('host') || undefined,
      fingerprint: params.get('fp') || 'chrome',
      skipCertVerify: params.get('allowInsecure') === '1'
    };

    if (params.get('security') === 'reality') {
      node.reality = {
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || ''
      };
      if (!node.sni) node.sni = node.server;
    }

    if (node.network === 'ws') {
      node.wsPath = wsPath;
      node.wsHeaders = { Host: params.get('host') || node.server };
    }

    // 支援 xhttp / SplitHTTP
    if (isXhttp) {
      node.xhttpPath = params.get('path') || '/';
      node.xhttpHost = params.get('host') || params.get('sni') || node.server;
      node.xhttpMode = params.get('mode') || 'auto';
    }
    
    // Sing-Box Outbound
    const sb: Record<string, unknown> = {
      tag: name,
      type: 'vless',
      server: node.server,
      server_port: node.port,
      uuid: node.uuid,
      packet_encoding: 'xudp',
      tls: {
        enabled: node.tls,
        server_name: node.sni || node.server,
        insecure: node.skipCertVerify,
        utls: { enabled: true, fingerprint: node.fingerprint }
      }
    };
    if (node.flow) sb.flow = node.flow;
    if (node.reality) {
      (sb.tls as Record<string, unknown>).reality = {
        enabled: true,
        public_key: node.reality.publicKey,
        short_id: node.reality.shortId
      };
    }
    if (node.network === 'ws') {
      sb.transport = { type: 'ws', path: node.wsPath, headers: node.wsHeaders };
    } else if (isXhttp) {
      sb.transport = {
        type: 'splithttp',
        path: node.xhttpPath,
        headers: { Host: node.xhttpHost },
        mode: node.xhttpMode
      };
    }
    node.singboxObj = sb;
    
    // Clash Meta Outbound
    const cl: Record<string, unknown> = {
      name,
      type: 'vless',
      server: node.server,
      port: node.port,
      uuid: node.uuid,
      udp: true,
      tls: node.tls,
      servername: node.sni || node.server,
      'skip-cert-verify': node.skipCertVerify,
      'client-fingerprint': node.fingerprint
    };
    if (node.flow) cl.flow = node.flow; 
    if (node.reality) {
      cl.reality = true;
      cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId };
    }
    if (node.network === 'ws') {
      cl.network = 'ws';
      cl['ws-opts'] = { path: node.wsPath, headers: node.wsHeaders };
    } else if (isXhttp) {
      cl.network = 'xhttp';
      cl['xhttp-opts'] = { path: node.xhttpPath, host: node.xhttpHost, mode: node.xhttpMode };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 WireGuard / WARP ---
function parseWireGuard(urlStr: string): ProxyNode | null {
  try {
    const fakeUrlStr = urlStr.replace(/^(wireguard|warp):\/\//i, 'http://');
    const url = new URL(fakeUrlStr);
    const params = url.searchParams;
    const name = tryDecodeURIComponent(url.hash.slice(1)) || 'WireGuard';

    const privateKey = decodeURIComponent(url.username);
    const localIps = (params.get('ip') || params.get('address') || '172.16.0.2/32,fd00::2/128').split(',');
    const publicKey = params.get('public_key') || params.get('pk') || '';
    const presharedKey = params.get('preshared_key') || params.get('psk') || undefined;
    const mtu = parseInt(params.get('mtu') || '1420', 10);
    const reserved = params.get('reserved') ? params.get('reserved')!.split(',').map(n => parseInt(n.trim(), 10)) : undefined;

    const wgConfig: WireGuardConfig = {
      privateKey,
      localAddress: localIps,
      publicKey,
      presharedKey,
      mtu,
      reserved
    };

    const node: ProxyNode = {
      type: 'wireguard',
      name,
      server: url.hostname,
      port: parseInt(url.port, 10) || 2408,
      udp: true,
      wireguard: wgConfig
    };

    // Sing-box
    node.singboxObj = {
      tag: name,
      type: 'wireguard',
      server: node.server,
      server_port: node.port,
      system_interface: false,
      interface_name: 'wg0',
      local_address: localIps,
      private_key: privateKey,
      peer_public_key: publicKey,
      pre_shared_key: presharedKey,
      reserved: reserved,
      mtu: mtu
    };

    // Clash Meta
    node.clashObj = {
      name,
      type: 'wireguard',
      server: node.server,
      port: node.port,
      ip: localIps[0]?.split('/')[0],
      ipv6: localIps[1]?.split('/')[0],
      'public-key': publicKey,
      'private-key': privateKey,
      'preshared-key': presharedKey,
      reserved: reserved,
      mtu: mtu,
      udp: true
    };

    return node;
  } catch {
    return null;
  }
}

// --- 解析 Hysteria2 ---
function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const fakeUrlStr = urlStr.replace(/^[^:]+:\/\//i, 'http://');
    const url = new URL(fakeUrlStr); 
    const params = url.searchParams; 
    const name = tryDecodeURIComponent(url.hash.slice(1)) || 'Hy2';
    
    const node: ProxyNode = {
      type: 'hysteria2',
      name,
      server: url.hostname,
      port: parseInt(url.port) || 443,
      password: url.username,
      tls: true,
      sni: params.get('sni') || url.hostname,
      skipCertVerify: params.get('insecure') === '1',
      obfs: params.get('obfs') || undefined,
      obfsPassword: params.get('obfs-password') || undefined
    };

    const sb: Record<string, unknown> = {
      tag: name,
      type: 'hysteria2',
      server: node.server,
      server_port: node.port,
      password: node.password,
      tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify }
    };
    if (node.obfs) {
      sb.obfs = { type: node.obfs, password: node.obfsPassword };
    }
    node.singboxObj = sb;

    const cl: Record<string, unknown> = {
      name,
      type: 'hysteria2',
      server: node.server,
      port: node.port,
      password: node.password,
      sni: node.sni,
      'skip-cert-verify': node.skipCertVerify
    };
    if (node.obfs) {
      cl.obfs = node.obfs;
      cl['obfs-password'] = node.obfsPassword;
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 TUIC ---
function parseTuic(urlStr: string): ProxyNode | null {
  try {
    const fakeUrlStr = urlStr.replace(/^[^:]+:\/\//i, 'http://');
    const url = new URL(fakeUrlStr);
    const params = url.searchParams;
    const name = tryDecodeURIComponent(url.hash.slice(1)) || 'TUIC';

    const congestion_control = params.get('congestion_control') || 'bbr';
    const udp_relay_mode = params.get('udp_relay_mode') || 'native';
    const alpnStr = params.get('alpn');
    const skipCertVerify = params.get('allow_insecure') === '1' || params.get('insecure') === '1';

    const node: ProxyNode = {
      type: 'tuic',
      name,
      server: url.hostname,
      port: parseInt(url.port) || 443,
      uuid: url.username,
      password: url.password,
      tls: true,
      sni: params.get('sni') || url.hostname,
      alpn: alpnStr ? alpnStr.split(',') : ['h3'],
      skipCertVerify,
      congestion_control,
      udp_relay_mode
    };

    node.singboxObj = {
      tag: name,
      type: 'tuic',
      server: node.server,
      server_port: node.port,
      uuid: node.uuid,
      password: node.password,
      congestion_control: node.congestion_control,
      udp_relay_mode: node.udp_relay_mode,
      tls: { enabled: true, server_name: node.sni, alpn: node.alpn, insecure: node.skipCertVerify }
    };

    node.clashObj = {
      name,
      type: 'tuic',
      server: node.server,
      port: node.port,
      uuid: node.uuid,
      password: node.password,
      sni: node.sni,
      alpn: node.alpn,
      'skip-cert-verify': node.skipCertVerify,
      'congestion-controller': node.congestion_control,
      'udp-relay-mode': node.udp_relay_mode
    };

    return node;
  } catch {
    return null;
  }
}

// --- 解析 AnyTLS ---
function parseAnytls(urlStr: string): ProxyNode | null {
  try {
    const fakeUrlStr = urlStr.replace(/^[^:]+:\/\//i, 'http://');
    const url = new URL(fakeUrlStr);
    const params = url.searchParams;
    const name = tryDecodeURIComponent(url.hash.slice(1)) || 'AnyTLS';
    
    const uuid = url.username; 
    const skipCertVerify = params.get('allowInsecure') === '1' || params.get('insecure') === '1';
    const alpnStr = params.get('alpn');

    const node: ProxyNode = {
      type: 'anytls',
      name,
      server: url.hostname,
      port: parseInt(url.port) || 443,
      uuid,
      password: uuid,
      tls: true,
      sni: params.get('sni') || url.hostname,
      fingerprint: params.get('fp') || 'chrome',
      skipCertVerify,
      alpn: alpnStr ? alpnStr.split(',') : undefined
    };

    const sb: Record<string, unknown> = { 
      tag: name, 
      type: 'anytls', 
      server: node.server, 
      server_port: node.port, 
      password: node.password, 
      tls: { 
        enabled: true, 
        server_name: node.sni, 
        insecure: node.skipCertVerify, 
        utls: { enabled: true, fingerprint: node.fingerprint } 
      } 
    };
    if (node.alpn) (sb.tls as Record<string, unknown>).alpn = node.alpn;
    node.singboxObj = sb;

    const cl: Record<string, unknown> = {
      name,
      type: 'anytls',
      server: node.server,
      port: node.port,
      password: node.password,
      sni: node.sni,
      'skip-cert-verify': node.skipCertVerify,
      'client-fingerprint': node.fingerprint,
      udp: true
    };
    if (node.alpn) cl.alpn = node.alpn;
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 VMess ---
function parseVmess(vmessUrl: string): ProxyNode | null {
  try {
    const b64 = vmessUrl.replace('vmess://', '');
    const jsonStr = safeBase64Decode(b64);
    const config = JSON.parse(jsonStr);
    const name = config.ps || 'VMess';
    let wsPath = config.path || '/';
    if (!wsPath.startsWith('/')) wsPath = '/' + wsPath;

    const node: ProxyNode = {
      type: 'vmess',
      name,
      server: config.add,
      port: parseInt(config.port) || 443,
      uuid: config.id,
      cipher: 'auto',
      tls: config.tls === 'tls',
      sni: config.sni || config.host,
      network: config.net || 'tcp',
      wsPath,
      wsHeaders: config.host ? { Host: config.host } : undefined,
      skipCertVerify: true
    };
    
    node.singboxObj = {
      tag: name,
      type: 'vmess',
      server: node.server,
      server_port: node.port,
      uuid: node.uuid,
      security: 'auto',
      packet_encoding: 'xudp',
      tls: { enabled: node.tls, server_name: node.sni || node.server, insecure: true },
      transport: node.network === 'ws' ? { type: 'ws', path: node.wsPath, headers: node.wsHeaders } : undefined
    };
    
    const cl: Record<string, unknown> = {
      name,
      type: 'vmess',
      server: node.server,
      port: node.port,
      uuid: node.uuid,
      alterId: parseInt(config.aid) || 0,
      cipher: config.scy || 'auto',
      udp: true,
      tls: node.tls,
      servername: node.sni || config.host || node.server,
      network: node.network
    };
    if (node.network === 'ws') cl['ws-opts'] = { path: wsPath, headers: node.wsHeaders }; 
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 Trojan ---
function parseTrojan(urlStr: string): ProxyNode | null {
  try {
    const fakeUrlStr = urlStr.replace(/^[^:]+:\/\//i, 'http://');
    const url = new URL(fakeUrlStr); 
    const params = url.searchParams; 
    const name = tryDecodeURIComponent(url.hash.slice(1)) || 'Trojan';

    const node: ProxyNode = {
      type: 'trojan',
      name,
      server: url.hostname,
      port: parseInt(url.port) || 443,
      password: url.username,
      tls: true,
      sni: params.get('sni') || params.get('peer') || url.hostname,
      skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1'
    };

    node.singboxObj = {
      tag: name,
      type: 'trojan',
      server: node.server,
      server_port: node.port,
      password: node.password,
      tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify }
    };

    node.clashObj = {
      name,
      type: 'trojan',
      server: node.server,
      port: node.port,
      password: node.password,
      sni: node.sni,
      'skip-cert-verify': node.skipCertVerify,
      udp: true
    };

    return node;
  } catch {
    return null;
  }
}

// --- 主解析入口 ---
export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content.replace(/^\uFEFF/, '').trim(); 
  
  const protocols = ['ss://', 'vmess://', 'vless://', 'trojan://', 'tuic://', 'hysteria2://', 'hy2://', 'anytls://', 'wireguard://', 'warp://'];
  const firstLine = plainText.split(/\r?\n/)[0].trim();
  const isPlainText = protocols.some(p => firstLine.startsWith(p));
  
  if (!isPlainText) { 
    try {
      let b64 = plainText.replace(/[\s\r\n]+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      b64 = b64.replace(/=+$/, '');
      while (b64.length % 4 > 0) b64 += '=';
      
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const decoded = new TextDecoder('utf-8').decode(bytes);
      
      if (decoded && protocols.some(p => decoded.includes(p))) {
        plainText = decoded.replace(/^\uFEFF/, '').trim(); 
      } else {
        throw new Error("Base64 解碼成功，但內容並非有效的代理節點。");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Base64 暴力解碼失敗: ${msg}`);
    }
  }
  
  const lines = plainText.split(/\r?\n/); 
  const nodes: ProxyNode[] = [];
  
  for (const line of lines) { 
    const l = line.replace(/^[\s\uFEFF\xA0\u200B\u200C\u200D\u200E\u200F]+|[\s\uFEFF\xA0\u200B\u200C\u200D\u200E\u200F]+$/g, ''); 
    if (!l) continue;
    
    if (l.startsWith('ss://')) { const n = parseShadowsocks(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vless://')) { const n = parseVless(l); if (n) nodes.push(n); } 
    else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) { const n = parseHysteria2(l); if (n) nodes.push(n); } 
    else if (l.startsWith('vmess://')) { const n = parseVmess(l); if (n) nodes.push(n); } 
    else if (l.startsWith('tuic://')) { const n = parseTuic(l); if (n) nodes.push(n); } 
    else if (l.startsWith('anytls://')) { const n = parseAnytls(l); if (n) nodes.push(n); } 
    else if (l.startsWith('trojan://')) { const n = parseTrojan(l); if (n) nodes.push(n); }
    else if (l.startsWith('wireguard://') || l.startsWith('warp://')) { const n = parseWireGuard(l); if (n) nodes.push(n); }
  } 
  
  if (nodes.length === 0) {
    throw new Error("資料獲取成功，但未能成功配對到任何支援的節點格式。");
  }
  
  return nodes;
}

````

## File: src/types.ts
````ts
export interface Env {
  SUB_CACHE: KVNamespace;
}

export interface WireGuardConfig {
  privateKey: string;
  localAddress: string[];
  publicKey?: string;
  presharedKey?: string;
  mtu?: number;
  reserved?: number[];
}

export interface ProxyNode {
  type: string;
  name: string;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  udp?: boolean;
  tls?: boolean;
  sni?: string;
  alpn?: string[];
  fingerprint?: string;
  flow?: string;
  network?: string;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  reality?: { publicKey: string; shortId: string };
  obfs?: string;
  obfsPassword?: string;
  skipCertVerify?: boolean;
  singboxObj?: Record<string, unknown>;
  clashObj?: Record<string, unknown>;
  congestion_control?: string;
  udp_relay_mode?: string;
  // VLESS SplitHTTP (xhttp)
  xhttpPath?: string;
  xhttpHost?: string;
  xhttpMode?: string;
  // WireGuard / WARP
  wireguard?: WireGuardConfig;
  // 標籤特徵 (B2 方案)
  multiplier?: number;
  isIplc?: boolean;
}

export interface CachedTemplate {
  content: string;
  updatedAt: number;
}

````

## File: src/generator.ts
````ts
import yaml from 'js-yaml';
import { ProxyNode } from './types';
import { REMOTE_CONFIG } from './constants';
import { utf8ToBase64 } from './utils';

// 💥 新增：導出明文連結列表（一列一條節點，多筆換行）
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
          aid: node.clashObj?.alterId || 0, scy: "auto", net: node.network, type: "none",
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
            params.set('type', node.network || 'tcp');
        }
        if (node.clashObj && node.clashObj.plugin && !node.tls) {
             const pluginOpts = node.clashObj['plugin-opts'];
             const optStr = pluginOpts ? ';' + new URLSearchParams(pluginOpts).toString().replace(/&/g, ';') : '';
             params.set('plugin', node.clashObj.plugin + optStr);
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
        
        const uuid = node.uuid || '';
        const password = node.password || '';
        return `tuic://${uuid}:${password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'anytls') {
        const params = new URLSearchParams();
        params.set('security', 'tls');
        if (node.sni) params.set('sni', node.sni);
        params.set('insecure', node.skipCertVerify ? '1' : '0');
        params.set('allowInsecure', node.skipCertVerify ? '1' : '0');
        if (node.fingerprint) params.set('fp', node.fingerprint);
        if (node.alpn && node.alpn.length > 0) params.set('alpn', node.alpn.join(','));
        params.set('type', 'tcp'); 
        return `anytls://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      if (node.type === 'trojan') {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.skipCertVerify) params.set('allowInsecure', '1');
        return `trojan://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
      }
      return null;
    } catch { return null; }
  }).filter(l => l !== null);
  return links.join('\n');
}

// 導出 Base64 訂閱
export function toBase64(nodes: ProxyNode[]) {
  const rawLinks = toRawLinks(nodes);
  return utf8ToBase64(rawLinks);
}

async function fetchWithUA(url: string) {
  const resp = await fetch(`${url}?t=${Math.random()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  if (!resp.ok) throw new Error(`Template fetch failed: ${resp.status}`);
  return await resp.text();
}

export async function toSingBoxWithTemplate(nodes: ProxyNode[]) {
  const text = await fetchWithUA(REMOTE_CONFIG.singbox);
  let config = JSON.parse(text);
  const outbounds = nodes.map(n => JSON.parse(JSON.stringify(n.singboxObj)));
  const nodeTags = outbounds.map((o:any) => o.tag);
  
  if (!Array.isArray(config.outbounds)) config.outbounds = [];
  config.outbounds.push(...outbounds);
  config.outbounds.forEach((out: any) => {
    if (out.type === 'selector' || out.type === 'urltest') {
      if (!Array.isArray(out.outbounds)) out.outbounds = [];
      nodeTags.forEach(tag => { if (!out.outbounds.includes(tag)) out.outbounds.push(tag); });
    }
  });
  return JSON.stringify(config, null, 2);
}

export async function toClashWithTemplate(nodes: ProxyNode[]) {
  const text = await fetchWithUA(REMOTE_CONFIG.clash);
  let config: any = yaml.load(text);
  
  const proxies = nodes.map(n => {
    const obj = JSON.parse(JSON.stringify(n.clashObj));
    Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
    return obj;
  }); 
  const proxyNames = proxies.map((p: any) => p.name);

  if (!Array.isArray(config.proxies)) config.proxies = [];
  config.proxies.push(...proxies);

  if (Array.isArray(config['proxy-groups'])) {
    config['proxy-groups'].forEach((group: any) => {
      if (!Array.isArray(group.proxies)) group.proxies = [];
      proxyNames.forEach(name => { if (!group.proxies.includes(name)) group.proxies.push(name); });
    });
  }
  return yaml.dump(config, { indent: 2, noRefs: true });
}

````

## File: src/utils.ts
````ts
import { ProxyNode } from "./types";

// --- 安全 Base64 解碼 ---
export function safeBase64Decode(str: string): string {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
    while (b64.length % 4) b64 += '=';
    
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return "";
  }
}

export function utf8ToBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch {
    return btoa(str);
  }
}

export function tryDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// --- 節點倍率與專線特徵提取 (方案 B2) ---
export function enrichNodeFeatures(node: ProxyNode): void {
  const name = node.name || '';
  
  // 倍率識別 (例如: 0.1x, 0.5X, 1.5倍, 2×)
  const multiplierMatch = name.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:x|X|倍|×)/);
  if (multiplierMatch) {
    const val = parseFloat(multiplierMatch[1]);
    if (!isNaN(val)) {
      node.multiplier = val;
    }
  }

  // 專線特徵識別 (IPLC / IEPL / 專線 / 內網)
  if (/(IPLC|IEPL|专线|專線|内网|內網|BGP专线)/i.test(name)) {
    node.isIplc = true;
  }
}

// --- 自動加入國旗 Emoji 的智慧辨識系統 ---
export function addFlag(name: string): string {
  if (/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/.test(name)) {
    return name;
  }

  const upper = name.toUpperCase();

  const isMatch = (codes: string, keywords: string): boolean => {
    const codeRegex = new RegExp(`(?:^|[^A-Z])(${codes})(?![A-Z])`);
    const keywordRegex = new RegExp(`(${keywords})`);
    return codeRegex.test(upper) || keywordRegex.test(upper);
  };

  if (isMatch('HK|HKG', '香港|深港|HONGKONG|HONG KONG')) return "🇭🇰 " + name;
  if (isMatch('TW|TWN|TPE', '台灣|台湾|台北|新北|彰化')) return "🇹🇼 " + name;
  if (isMatch('JP|JPN|TYO|OSA|NRT|HND|KIX', '日本|东京|大阪|埼玉|慢日|川日|JAPAN')) return "🇯🇵 " + name;
  if (isMatch('SG|SGP|SIN', '新加坡|狮城|SINGAPORE')) return "🇸🇬 " + name;
  if (isMatch('US|USA|LAX|SFO|SJC|SEA|NYC|JFK|EWR', '美国|美利堅|洛杉矶|圣何塞|硅谷|波特兰|西雅图|AMERICA|UNITED STATES')) return "🇺🇸 " + name;
  if (isMatch('KR|KOR|ICN|SEL', '韩国|首尔|KOREA')) return "🇰🇷 " + name;
  if (isMatch('UK|GB|GBR|LHR|LON', '英国|英國|伦敦|BRITAIN|ENGLAND')) return "🇬🇧 " + name;
  if (isMatch('NL|NLD|AMS', '荷兰|荷蘭|阿姆斯特丹|NETHERLANDS')) return "🇳🇱 " + name;
  if (isMatch('BR|BRA|SAO', '巴西|圣保罗|聖保羅|BRAZIL')) return "🇧🇷 " + name;
  if (isMatch('EG|EGY|CAI', '埃及|开罗|開羅|EGYPT')) return "🇪🇬 " + name;
  if (isMatch('VN|VNM|HAN|SGN', '越南|河内|河內|西贡|VIETNAM')) return "🇻🇳 " + name;
  if (isMatch('MO|MAC|MFM', '澳門|澳门')) return "🇲🇴 " + name;
  if (isMatch('KH|KHM|PNH', '柬埔寨|金边|金邊|CAMBODIA')) return "🇰🇭 " + name;
  if (isMatch('GR|GRC|ATH', '希腊|希臘|雅典|GREECE')) return "🇬🇷 " + name;
  if (isMatch('PL|POL|WAW', '波兰|波蘭|华沙|華沙|POLAND')) return "🇵🇱 " + name;
  if (isMatch('IT|ITA|MIL', '意大利|義大和|米兰|羅馬|ITALY')) return "🇮🇹 " + name;
  if (isMatch('ES|ESP|MAD', '西班牙|马德里|巴塞隆納|SPAIN')) return "🇪🇸 " + name;
  if (isMatch('DE|DEU|FRA', '德国|德國|法兰克福|GERMANY')) return "🇩🇪 " + name;
  if (isMatch('FR|FRA|CDG', '法国|法國|巴黎|FRANCE')) return "🇫🇷 " + name;
  if (isMatch('RU|RUS', '俄罗斯|俄羅斯|莫斯科|RUSSIA')) return "🇷🇺 " + name;
  if (isMatch('CH|CHE|ZRH', '瑞士|苏黎世|日内瓦|SWITZERLAND')) return "🇨🇭 " + name;
  if (isMatch('SE|SWE|ARN', '瑞典|斯德哥尔摩|SWEDEN')) return "🇸🇪 " + name;
  if (isMatch('NO|NOR|OSL', '挪威|奥斯陆|NORWAY')) return "🇳🇴 " + name;
  if (isMatch('FI|FIN|HEL', '芬兰|芬蘭|赫尔辛基|FINLAND')) return "🇫🇮 " + name;
  if (isMatch('DK|DNK|CPH', '丹麦|丹麥|哥本哈根|DENMARK')) return "🇩🇰 " + name;
  if (isMatch('IE|IRL|DUB', '爱尔兰|愛爾蘭|都柏林|IRELAND')) return "🇮🇪 " + name;
  if (isMatch('PT|PRT|LIS', '葡萄牙|里斯本|PORTUGAL')) return "🇵🇹 " + name;
  if (isMatch('TH|THA|BKK', '泰国|泰國|曼谷|THAILAND')) return "🇹🇭 " + name;
  if (isMatch('MY|MYS|KUL', '马来西亚|馬來西亞|吉隆坡|MALAYSIA')) return "🇲🇾 " + name;
  if (isMatch('PH|PHL|MNL', '菲律宾|菲律賓|马尼拉|PHILIPPINES')) return "🇵🇭 " + name;
  if (isMatch('ID|IDN|CGK', '印度尼西亚|印尼|雅加达|INDONESIA')) return "🇮🇩 " + name;
  if (isMatch('TR|TUR|IST', '土耳其|伊斯坦堡|TURKEY')) return "🇹🇷 " + name;
  if (isMatch('IN|IND|BOM', '印度|孟买|INDIA')) return "🇮🇳 " + name;
  if (isMatch('CA|CAN|YVR|YYZ', '加拿大|多伦多|温哥华|CANADA')) return "🇨🇦 " + name;
  if (isMatch('AU|AUS|SYD|MEL', '澳大利亚|澳洲|悉尼|墨本|AUSTRALIA')) return "🇦🇺 " + name;
  if (isMatch('CN|CHN', '中国|回国|国内|北京|上海|廣州|深圳|CHINA')) return "🇨🇳 " + name;
  if (isMatch('NZ|NZL|AKL', '新西兰|紐西蘭|奥克兰|NEW ZEALAND')) return "🇳🇿 " + name;
  if (isMatch('AE|ARE|DXB', '阿联酋|迪拜|杜拜|UAE')) return "🇦🇪 " + name;
  if (isMatch('SA|SAU|RUH', '沙特|沙烏地阿拉伯|利雅德|SAUDI')) return "🇸🇦 " + name;
  if (isMatch('IL|ISR|TLV', '以色列|特拉维夫|ISRAEL')) return "🇮🇱 " + name;
  if (isMatch('KZ|KAZ', '哈萨克斯坦|哈薩克|KAZAKHSTAN')) return "🇰🇿 " + name;
  if (isMatch('PK|PAK', '巴基斯坦|PAKISTAN')) return "🇵🇰 " + name;
  if (isMatch('ZA|ZAF|CPT', '南非|开普敦|SOUTH AFRICA')) return "🇿🇦 " + name;

  return "🇺🇳 " + name;
}

// 按國旗進行歸類排序（🇺🇳 置於頂部）
export function groupNodesByFlag(nodes: ProxyNode[]): ProxyNode[] {
  const groups = new Map<string, ProxyNode[]>();
  const flagOrder: string[] = [];
  
  for (const node of nodes) {
    const flaggedName = addFlag(node.name || 'node');
    
    let flag = '🇺🇳';
    const match = flaggedName.match(/^([\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF])/);
    if (match) {
      flag = match[1];
    }
    
    if (!groups.has(flag)) {
      groups.set(flag, []);
      flagOrder.push(flag);
    }
    groups.get(flag)!.push(node);
  }
  
  const standardOrder = [
    '🇭🇰', '🇹🇼', '🇯🇵', '🇸🇬', '🇰🇷',
    '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺',
    '🇲🇴', '🇨🇳', '🇹🇭', '🇻🇳', '🇲🇾', '🇵🇭', '🇮🇩',
    '🇩🇪', '🇫🇷', '🇳🇱', '🇷🇺', '🇮🇳', '🇹🇷'
  ];
  
  flagOrder.sort((a, b) => {
    if (a === '🇺🇳' && b !== '🇺🇳') return -1;
    if (b === '🇺🇳' && a !== '🇺🇳') return 1;
    
    const idxA = standardOrder.indexOf(a);
    const idxB = standardOrder.indexOf(b);
    
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    
    return a.localeCompare(b);
  });
  
  const result: ProxyNode[] = [];
  for (const flag of flagOrder) {
    result.push(...groups.get(flag)!);
  }
  return result;
}

// 去重複命名與賦予特徵標記
export function deduplicateNodeNames(nodes: ProxyNode[]): ProxyNode[] {
  const seenKey = new Set<string>();
  const nameCount = new Map<string, number>();

  return nodes.filter(node => {
    const key = `${node.server}:${node.port}:${node.uuid || node.password || ''}:${node.type}`;

    if (seenKey.has(key)) return false;
    seenKey.add(key);

    let baseName = node.name || 'node';
    baseName = addFlag(baseName);

    if (!nameCount.has(baseName)) {
      nameCount.set(baseName, 1);
      node.name = baseName;
    } else {
      const count = nameCount.get(baseName)! + 1;
      nameCount.set(baseName, count);
      node.name = `${baseName}_${count}`;
    }
    
    enrichNodeFeatures(node);

    if (node.singboxObj) {
      node.singboxObj.tag = node.name;
    }
    if (node.clashObj) {
      node.clashObj.name = node.name;
    }

    return true;
  });
}

````

## File: package.json
````json
{
  "name": "cf-sub-converter",
  "version": "3.0.6",
  "private": true,
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev",
    "start": "wrangler dev",
    "argo": "tsx scripts/argo-converter.ts"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240208.0",
    "@types/js-yaml": "^4.0.9",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "wrangler": "^3.28.1"
  }
}

````

## File: .github/workflows/deploy.yml
````yml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  # 1. 當推送到 main 或 master 分支時自動執行
  push:
    branches:
      - main
      - master
  
  # 2. 保留手動執行按鈕
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
      
      # 已將 Node.js 環境升級至 Node 24 以消除棄用警告
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          # 暫時移除 cache: 'npm'，避免因缺少 package-lock.json 報錯

      # 替換成相容無鎖定檔的普通安裝（加入 --prefer-offline 稍微加速）
      - name: Install dependencies
        run: npm install --prefer-offline

      # 替換 KV ID
      - name: Inject KV ID from Secrets
        run: |
          sed -i 's/KV_ID_PLACEHOLDER/${{ secrets.CF_KV_ID }}/g' wrangler.toml

      # 部署步驟
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}

````

## File: .github/workflows/combine-code.yml
````yml
name: Generate All Codebase to MD

on:
  push:
    branches:
      - main
    paths-ignore:
      - 'combined_project_code.md' # 避免此檔案自身更新引發無限循環
  workflow_dispatch: # 支援在 GitHub 網頁上手動觸發執行

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Combine All Files into MD
        run: |
          OUT_FILE="combined_project_code.md"
          echo "# Complete Project Codebase" > "$OUT_FILE"
          echo "Generated on: $(date)" >> "$OUT_FILE"
          echo "" >> "$OUT_FILE"

          # 遍歷專案內的所有檔案，排除依賴、Git 歷史、打包產物及二進位檔案
          find . -type f \
            -not -path "*/node_modules/*" \
            -not -path "*/.git/*" \
            -not -path "*/dist/*" \
            -not -name "package-lock.json" \
            -not -name "yarn.lock" \
            -not -name "pnpm-lock.yaml" \
            -not -name "$OUT_FILE" \
            -not -name "*.png" \
            -not -name "*.jpg" \
            -not -name "*.jpeg" \
            -not -name "*.gif" \
            -not -name "*.ico" \
            -not -name "*.woff*" \
            -not -name "*.ttf" | while read -r file; do
              
              # 取得相對路徑與副檔名
              rel_path="${file#./}"
              ext="${file##*.}"
              
              # 如果無副檔名，清除變數避免格式混亂
              if [ "$ext" = "$rel_path" ]; then
                ext=""
              fi
              
              # 寫入檔案標題
              echo "## File: $rel_path" >> "$OUT_FILE"
              # 使用四個反單引號（````）包裹，防止內部程式碼的三個反單引號造成排版衝突
              echo "\`\`\`\`$ext" >> "$OUT_FILE"
              cat "$file" >> "$OUT_FILE"
              echo "" >> "$OUT_FILE"
              echo "\`\`\`\`" >> "$OUT_FILE"
              echo "" >> "$OUT_FILE"
          done

      - name: Commit and Push changes
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add combined_project_code.md
          
          if git diff --staged --quiet; then
            echo "No changes in codebase."
          else
            git commit -m "docs: auto-generate complete codebase [skip ci]"
            git push origin main
          fi

````

## File: README.md
````md
# ⚡ CF Sub Converter Pro

基於 Cloudflare Workers 的 Serverless 訂閱轉換工具。擁有全新專業級的無廣告深色 UI，內建智慧過濾、替換、智慧國旗萬國對齊系統，以及 **Argo 隧道一鍵生成器**。一鍵將雜亂的訂閱或節點轉換為 Sing-Box / Clash Meta (Mihomo) / Base64 格式，亦可直接作為第三方轉換網頁（如 `sub-web`）的自定義後端。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sammy0101/cf-sub-converter)

## 🌟 特性

- 🎨 **專業級 UI** - 全新深色主題設計 (Slate/Zinc)，無廣告、純淨排版，搭配流暢的互動動畫與一鍵掃碼功能。
- 🌀 **Argo 隧道一鍵生成器** - 
  - **自動化克隆轉換**：一鍵載入貼入的節點，勾選 VLESS 或 VMess 節點，系統自動拷貝並轉換為對應的 Argo 隧道節點。
  - **超簡短一鍵 VPS 命令**：結合 Cloudflare KV 雲端動態腳本快取技術與 `curl | bash` 轉換，產生極簡 VPS 一鍵部署命令。
  - **雙層智慧探測校正**：VPS 部署時自動檢測本地連接埠與 TLS 加密，智慧避免 Proxy Protocol / TLS 握手衝突，並自動重寫 Host Header 與 TLS SNI。
- 📊 **流量與到期日智慧透傳** - 自動從上游多個機場擷取並**加總多個訂閱的流量（上傳、下載、總量），並自動計算最近的到期時間**，透過標準 `subscription-userinfo` 標頭透傳，完美點亮客戶端的流量條！
- ⚡ **標準 SubConverter 後端支援** - 內建 **`/sub`** 和 **`/version`** API 路由，回傳與您專案版本和網域動態對齊的標準格式（如 `subconverter v2.5.0 <your-worker-domain> backend`）並全面支援跨域 (CORS)。這使其可以直接做為任何第三方訂閱前端網頁（如 `sub-web`）的自定義後端。
- 🔍 **智慧過濾與替換** - 
  - **節點篩選**：支援「僅保留」與「排除」雙向過濾（使用 `|` 隔開，如 `HK|TW` 或 `5x`）。後端內建字元智慧相容技術，自動將 `x`、`X`、全形 `ｘ` 與數學乘號 `×` 進行互通匹配。
  - **名稱替換**：支援極簡統一的替換與刪除語法。刪除請用 `DEL-關鍵字`，替換請用 `尋找-替換`。
  - **💥 首創 `ALL-` 一鍵統改名稱**：若要將所有節點統一改名，請用 `ALL-新名稱`（例如 `ALL-JP`）。此功能配合我們的「智慧國旗」與「去重自動編號」系統，能將所有節點完美格式化為：`🇯🇵 JP`、`🇯🇵 JP_2`、`🇯🇵 JP_3` 等極致工整的排版。
- 🚩 **自動國旗與萬國標註** - 
  - **國旗智慧分群與 22 國黃金多梯隊排序**：自動將相同國家的節點緊密歸類在一起。並配有內建的黃金梯隊排序（港 🇭🇰 ➔ 台 🇹🇼 ➔ 日 🇯🇵 ➔ 星 🇸🇬 ➔ 美 🇺🇸 ➔ 英 🇬🇧 ➔ 澳 🇦🇺 等 22 個熱門地區），且會**自動將帶有 🇺🇳 標誌的臨時 Argo 佔位符或提醒節點置於列表最頂部（排在最前面）**，保證最流暢直觀的訂閱體驗。
  - 若遇到無對應國家的節點（如流量提示、機場官網），自動補上 🇺🇳 (聯合國國旗)，達成 100% 工整排版。
- 🔌 **全協議支援** - 完美解析 `Trojan`, `VLESS`, `VMess`, `Shadowsocks`, `Hysteria2 (hy2)`, `TUIC`, `AnyTLS` 等主流與新興協議。
- 🚀 **極速路由與 DNS** - 轉換出的配置檔內建頂級路由規則：
  - **Clash Meta**：流量嗅探 (Sniffer)、Fake-IP、TProxy 軟路由最佳化、中外 DNS 智慧解析。
  - **Sing-Box**：Mixed TUN 堆疊優化、獨立 DNS Kay、蘋果/國內服務精準直連。
- ☁️ **雲端與配置同步** - 運行在 Cloudflare 邊緣網絡，零成本運維。生成短連結時，**系統會將「資料來源、過濾規則、替換規則」打包存入 KV**，客戶端直接更新短連結即可自動套用所有規則，不需在客戶端 URL 後手動外掛複雜參數。

<img width="2559" height="1204" alt="螢幕擷取畫面 2026-06-29 181504" src="https://github.com/user-attachments/assets/c412badb-14ae-4a2c-937f-bd5ce3444b77" />

## 🚀 部署教學

### 方法一：一鍵快速部署 (最推薦、最簡單)

點擊本說明文件上方的 **Deploy to Cloudflare Workers** 藍色按鈕。

* **零設定自動託管**：Cloudflare 網頁部署精靈會引導您登入，並**在背景全自動為您建立並對接好所需的 KV 命名空間（`SUB_CACHE`）**，完全不需要您手動至儀表板綁定。
* **自建 CI/CD (Workers Builds)**：Cloudflare 會在您的 GitHub 下自動建立此專案的複製倉庫。未來您只要在 GitHub 修改並 `git push`，Cloudflare 就會自動在端點編譯部署，**此模式完全不需要設定 GitHub Secrets 密鑰**。

---

### 方法二：手動 Fork 本項目並使用 GitHub Actions 自動部署 (需要設定 Secrets)

如果您選擇**不使用**一鍵部署按鈕，而是打算手動 Fork 本項目，並利用專案內建的 GitHub Actions 自動進行部署，請按照以下步驟操作：

1. **Fork 本項目**：
   請先點擊本專案右上角的 **`Fork`** 按鈕，將專案複製一份到您自己的 GitHub 帳號下。

2. **設定 GitHub Repository Secrets**：
   前往您 GitHub 專案頁面，依次點擊 **`Settings`** -> **`Secrets and variables`** -> **`Actions`** -> **`New repository secret`**，並添加以下三個密鑰，否則 GitHub 部署工作流會報錯：
   * **`CF_API_TOKEN`**：您的 Cloudflare API 權杖。
     * *獲取方式*：Cloudflare 首頁 -> 我的個人資料 -> API 權杖 -> 建立具有「編輯 Workers 與 KV」權限的權杖。
   * **`CF_ACCOUNT_ID`**：您的 Cloudflare 帳戶 ID（可在 Worker 頁面右側找到）。
   * **`CF_KV_ID`**：您在 Cloudflare 上建立的 KV 命名空間 ID。
     * *獲取方式*：Cloudflare 儀表板 -> 鍵值儲存 (KV) -> 建立一個空間（例如 `SUB_CACHE`）並複製其 ID。

3. **Actions 執行部署**：
   設定完成後，當您對專案進行任何修改並推送（Push），或手動在倉庫的 **`Actions`** 頁面觸發 **`Deploy to Cloudflare Workers`** 工作流，GitHub 就會全自動為您編譯並完成部署。

---

### 方法三：本地手動編譯部署 (Wrangler CLI)

1. **克隆本專案**：
   ```bash
   git clone https://github.com/sammy0101/cf-sub-converter.git
   cd cf-sub-converter
   ```

2. **安裝專案依賴**：
   ```bash
   npm install
   ```

3. **創建並綁定 KV 命名空間**：
   ```bash
   wrangler kv:namespace create SUB_CACHE
   ```
   *執行後，將終端機回傳的配置代碼（包含 binding 和 id），複製並貼上取代您 `wrangler.toml` 中的 `KV_ID_PLACEHOLDER` 佔位符。*

4. **發布至 Cloudflare**：
   ```bash
   wrangler deploy
   ```

## 📖 使用指南

訪問你部署完成的 Workers 網址即可進入視覺化面板。

### 面板功能
- **資料來源設定**：支援貼上機場訂閱連結、Base64 字串，或直接貼上多行節點 URI。支援多個訂閱地址換行輸入，系統將保持原始順序進行合併。
- **Argo 隧道一鍵生成**：
  1. 在資料來源貼入您的機場訂閱或明文連結。
  2. 點選「解析並載入目前輸入的 VLESS / VMess 節點」，介面會自動拉出節點列表。
  3. 勾選您要轉換的節點，系統會自動在下方同步該節點的原生埠號。
  4. 設定 VPS 本地對接連接埠，點選「一鍵生成 Argo 節點與一鍵部署腳本」。
  5. 複製產生的簡短 `curl` 或 `wget` 指令至您的 VPS 上執行。
  6. 腳本成功執行後：
     * **臨時域名模式**：請在您的 VPS 終端機內直接複製最終生成、連通的 VLESS/VMess 節點。
     * **固定域名模式**：新生成的 Argo 節點（原節點名末尾加 `_Argo` 後綴）會直接顯示在網頁下方的明文列表框中，方便拷貝。
- **過濾與替換**：
  - **僅保留關鍵字**：只留下符合關鍵字的節點。例如輸入 `HK|TW`。
  - **排除關鍵字**：過濾掉垃圾或高倍率節點。例如輸入 `5x`（系統會自動相容 `5×` 乘號）。
  - **節點名稱替換**：刪除寫 `DEL-關鍵字`，替換寫 `尋找-替換`。若要一鍵重命名所有節點，請用 `ALL-新名稱`。多組規則用 `|` 隔開。
- **配置收藏**：常用的節點與過濾替換規則可以儲存到「已儲存的配置」區塊。卡片上會直觀地以綠色 `保`、紅色 `排` 和藍色 `替` 標籤顯示你所設定的規則，點擊卡片即可自動載入所有設定。

---

### 🔑 Cloudflare 固定隧道 (免費) 申請與配置教學

臨時隨機隧道（trycloudflare）雖然完全免設定，但缺點是每次 VPS 重啟或服務重開時，網域名稱都會改變。如果您想要擁有**永久固定不變的網域**，請依照以下步驟免費建立 Cloudflare 固定隧道：

#### 準備工作：
1. 一個 Cloudflare 帳戶。
2. 一個已成功託管（啟用橘色雲端 CDN）在您 Cloudflare 帳戶下的自訂域名（例如：`yourdomain.com`）。

#### 申請與設定步驟：

1. **進入 Zero Trust 面板**：
   登入 Cloudflare 儀表板，點擊左側選單中的 **`Zero Trust`**（首次進入需要點擊訂閱，選擇 Free 0元計劃並綁定卡片，完全不會扣款）。

2. **建立 Tunnel 隧道**：
   在 Zero Trust 介面中，點擊左側選單的 **`Networks`** -> **`Tunnels`**，然後點擊 **`Create a Tunnel`**。

3. **選擇安裝方式並複製 Token**：
   * 選擇 **`cloudflared`**，並為您的隧道取個名字（例如 `my-vps-tunnel`），點擊 Next。
   * 在安裝指令頁面，您會看到一串安裝指令。**請注意指令最末端的一長串 Base64 字元（這就是您的 Tunnel Token）**，將其複製下來，例如：
     `eyJhIjoiY2... (約 100~200 字元的超長字串)`

4. **配置域名路由（Public Hostname）**：
   * 在同一個頁面下方（或點擊已建立隧道的 Edit -> Public Hostname 標籤），點擊 **`Add a public hostname`**。
   * **Domain**：填入您要分配給此節點的子網域，例如：`vless.yourdomain.com`。
   * **Service**：
     * **Type（服務類型）**：
       * 如果您在網頁端對接的是 TLS 埠（如 **`8443`** 或 **`443`**）➔ 選擇 **`HTTPS`**。
       * 如果對接的是無加密明文埠（如 **`27110`** 或 **`31297`**）➔ 選擇 **`HTTP`**。
     * **URL**：輸入本地地址與埠，例如：`127.0.0.1:8443` 或 `127.0.0.1:27110`。
   * **💥 極致關鍵（HTTPS 模式必填）**：
     如果您在 Type 選擇了 `HTTPS`，請展開下方的 **`Additional HTTP settings`**，**並將 `No TLS Verify` 選項開啟（設定為 Enabled）**！這是為了允許隧道跳過 VPS 本地自我簽署證書的安全驗證，否則會出現 `530` 錯誤。
   * 設定完成後，點擊 **`Save hostname`** 保存。

5. **在網頁端生成固定隧道指令**：
   回到您部署的 **SubConverter Pro** 網頁：
   * 本地監聽連接埠：填入您 VPS 的真實埠（例如 `8443` 或 `27110`）。
   * Cloudflare Tunnel Token：貼上您剛才複製的超長 Token。
   * 自訂綁定域名：輸入您剛才在第 4 步綁定的網域（如 `vless.yourdomain.com`）。
   * 點擊生成指令，貼上 VPS 執行。您的固定安全隧道即告部署完成，節點將永遠不變！

---

### API 調用與外部前端對接

#### 1. 當作標準 SubConverter 後端使用
本專案內建對應 `/sub` 與 `/version` 端點。你可以打開任何一個開源的 `sub-web` 網頁（例如：`sub.id9.cc` 或其他的轉換前端），並在**「後端地址 (Backend URL)」**中，填入你的 Cloudflare Workers 網址：
```text
https://your-worker.workers.dev
```

#### 2. 自訂 API 參數格式
你也可以直接透過 URL 參數進行手動調用與過濾：

```http
# 轉換原始連結 + 僅保留港台 + 排除 5x 節點 + 移除 [69云] 廣告 + 將 移动优化 替換為 專線
https://your-worker.workers.dev/sub?url=<URL編碼後的訂閱連結>&target=singbox&include=HK|TW&exclude=5x&rename=DEL-[69云]|移动优化-專線

# 轉換短連結 + 自動套用在雲端 KV 中存好的過濾與名稱替換規則
https://your-worker.workers.dev/<自訂短連結名稱>?target=clash
```

## 🛡️ 內建分流規則群組

轉換出的 Sing-Box / Clash 配置文件預設包含以下精心設計的分流群組，開箱即用：

| 圖標 | 群組名稱 | 路由說明 |
| :--- | :--- | :--- |
| 🚀 | 節點選擇 | 手動切換所有可用節點 |
| ⚡ | 自動選擇 | 基於 URL Test 自動測速切換延遲最低的節點 |
| 💬 | AI 服務 | ChatGPT / Claude / 香港專屬分流 |
| 🍎 | 蘋果服務 | Apple 相關服務直連 or 代理 (自動依據網路環境切換最快 CDN) |
| Ⓜ️ | 微軟服務 | Microsoft 服務直連 or 代理 |
| 🎮 | 遊戲平台 | Steam / Epic / EA / Ubisoft / Blizzard |
| 🌐 | 非中國 | 全球主流網站 (Google, Telegram 等) |
| 🇨🇳 | 國內服務 | 中國大陸 IP 與網域自動直連 (精準 IP 解析) |
| 🏠 | 私有網絡 | 區域網路 (LAN / 內網) 直連 |
| 🛑 | 廣告攔截 | 阻擋常見廣告、追蹤器 (AdBlock) |
| 🐟 | 漏網之魚 | Final Match (未匹配規則的最終去向) |

## 📁 專案結構

```text
cf-sub-converter/
├── src/
│   ├── index.ts          # Worker 主入口路由、並發請求控制、智慧過濾、雲端配置同步與 /version 後端模擬
│   ├── constants.ts      # 專業版 HTML 視圖模板與遠端規則常數 (含過濾、收藏與 Argo 隧道 UI)
│   ├── parser.ts         # 節點解析器 (支援 Trojan, AnyTLS, TUIC, Hy2 等)
│   ├── generator.ts      # 格式生成器 (映射為 Sing-Box / Clash Meta / Base64 / 原始連結明文導出)
│   ├── utils.ts          # Base64 淨化與智慧國旗自動標註系統 (豪華全球版 + 萬國 🇺🇳 對齊)
│   └── types.ts          # TypeScript 類型定義
├── argo.sh               # 上傳至 GitHub 倉庫的一鍵 VPS 隧道部署通用腳本
├── Sing-Box_Rules.JSON   # 遠端 Sing-Box 路由規則範本 (極速混合堆疊版)
├── Clash_Rules.YAML      # 遠端 Clash Meta 路由規則範本 (軟路由透明代理版)
└── wrangler.toml         # Cloudflare Workers 設定檔
```

## ⚠️ 免責聲明

本專案僅供技術交流與網路安全學習研究使用，不提供任何節點服務。請使用者務必遵守當地法律法規，勿將其用於任何違法用途，開發者對使用者的行為不承擔任何責任。

````

## File: scripts/argo-converter.ts
````ts
// scripts/argo-converter.ts
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Buffer } from 'buffer';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

interface VlessNode {
  originalLink: string;
  uuid: string;
  server: string;
  port: string;
  type: string;
  path: string;
  host: string;
  sni: string;
  name: string;
}

// 簡易 VLESS 連結解析器
function parseVlessLink(link: string): VlessNode | null {
  try {
    const urlStr = link.replace('vless://', 'http://');
    const url = new URL(urlStr);
    const params = url.searchParams;
    return {
      originalLink: link,
      uuid: url.username,
      server: url.hostname,
      port: url.port,
      type: params.get('type') || 'ws',
      path: params.get('path') || '/',
      host: params.get('host') || params.get('sni') || url.hostname,
      sni: params.get('sni') || url.hostname,
      name: decodeURIComponent(url.hash.slice(1)) || 'VLESS Node'
    };
  } catch (e) {
    return null;
  }
}

// 獲取並解析訂閱
async function fetchAndParse(input: string): Promise<VlessNode[]> {
  let content = input.trim();
  if (input.startsWith('http')) {
    console.log('正在獲取網址內容...');
    try {
      const res = await fetch(input, {
        headers: { 'User-Agent': 'v2rayNG/1.8.5' }
      });
      if (!res.ok) throw new Error(`HTTP 狀態碼 ${res.status}`);
      content = await res.text();
    } catch (e: any) {
      console.log(`獲取訂閱失敗: ${e.message}`);
      return [];
    }
  }

  // 嘗試 Base64 解碼
  let decoded = content;
  try {
    const cleaned = content.replace(/[\s\r\n]+/g, '');
    decoded = Buffer.from(cleaned, 'base64').toString('utf8');
  } catch (e) {
    // 解碼失敗則視為純文字
  }

  const lines = decoded.split(/\r?\n/);
  const vlessNodes: VlessNode[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('vless://')) {
      const parsed = parseVlessLink(trimmed);
      if (parsed) vlessNodes.push(parsed);
    }
  }
  return vlessNodes;
}

// 生成 VPS 安裝腳本模板
function generateVpsScript(node: VlessNode, port: string, token: string, domain: string): string {
  return `#!/bin/bash
# Cloudflare Argo Tunnel 一鍵部署腳本 (由 cf-sub-converter 自動生成)
# 適用於已使用 mack-a v2ray-agent 部署之 Xray/Sing-box 環境

GREEN='\\033[0;32m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "\${GREEN}=== 開始部署 Cloudflare Argo 隧道 ===\${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "\${RED}錯誤: 請使用 root 權限執行此腳本！\${NC}"
  exit 1
fi

# 節點參數配置
VLESS_UUID="${node.uuid}"
VLESS_PATH="${node.path}"
VLESS_TYPE="${node.type}"
VLESS_PORT="${port}"
NODE_NAME="${node.name}"
TUNNEL_TOKEN="${token.trim()}"
CUSTOM_DOMAIN="${domain.trim()}"

# 下載安裝 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "正在下載安裝 cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
    echo "cloudflared 安裝完成！"
else
    echo "cloudflared 已存在，跳過安裝。"
fi

# 判斷是否使用固定隧道
if [ -n "$TUNNEL_TOKEN" ]; then
    echo -e "\${GREEN}【固定隧道模式】正在配置服務...\${NC}"
    cloudflared service uninstall &> /dev/null
    cloudflared service install "$TUNNEL_TOKEN"
    systemctl daemon-reload
    systemctl enable cloudflared
    systemctl restart cloudflared
    
    echo -e "\${GREEN}部署成功！\${NC}"
    echo "請確保已在 Cloudflare Dashboard 中將網域 '$CUSTOM_DOMAIN' 指向本地 'http://localhost:$VLESS_PORT'"
    
    # 輸出用戶端連結
    FINAL_LINK="vless://$VLESS_UUID@$CUSTOM_DOMAIN:443?encryption=none&security=tls&type=$VLESS_TYPE&host=$CUSTOM_DOMAIN"
    if [ "$VLESS_TYPE" = "ws" ]; then
        FINAL_LINK="$FINAL_LINK&path=$(echo -n "$VLESS_PATH" | jq -s -R -r @uri 2>/dev/null || echo -n "$VLESS_PATH")"
    fi
    FINAL_LINK="$FINAL_LINK#Argo-$NODE_NAME"
    echo -e "\n\${GREEN}您的 Argo VLESS 訂閱連結為:\${NC}"
    echo -e "\${GREEN}$FINAL_LINK\${NC}\n"
else
    echo -e "\${GREEN}【臨時隧道模式】正在啟動 Quick Tunnel...\${NC}"
    systemctl stop cloudflared-argo &> /dev/null
    
    # 寫入 systemd 臨時隧道服務
    cat <<EOF > /etc/systemd/system/cloudflared-argo.service
[Unit]
Description=Cloudflare Argo Temporary Tunnel for VLESS
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:$VLESS_PORT
Restart=always
RestartSec=5
StandardOutput=file:/var/log/cloudflared-argo.log
StandardError=file:/var/log/cloudflared-argo.log

[Install]
WantedBy=multi-user.target
EOF

    touch /var/log/cloudflared-argo.log
    systemctl daemon-reload
    systemctl enable cloudflared-argo
    systemctl start cloudflared-argo
    
    echo "正在等待 Cloudflare 分配臨時域名 (約需 10-15 秒)..."
    TEMP_DOMAIN=""
    for i in {1..15}; do
        sleep 1
        TEMP_DOMAIN=$(grep -oE 'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com' /var/log/cloudflared-argo.log | head -n 1 | sed 's/https:\\/\\///')
        if [ -n "$TEMP_DOMAIN" ]; then
            break
        fi
    done
    
    if [ -n "$TEMP_DOMAIN" ]; then
        echo -e "\${GREEN}獲取域名成功: \$TEMP_DOMAIN\${NC}"
        FINAL_LINK="vless://$VLESS_UUID@\$TEMP_DOMAIN:443?encryption=none&security=tls&type=$VLESS_TYPE&host=\$TEMP_DOMAIN"
        if [ "$VLESS_TYPE" = "ws" ]; then
            FINAL_LINK="$FINAL_LINK&path=$(echo -n "$VLESS_PATH" | jq -s -R -r @uri 2>/dev/null || echo -n "$VLESS_PATH")"
        fi
        FINAL_LINK="$FINAL_LINK#Argo-Temp-$NODE_NAME"
        
        echo -e "\n\${GREEN}=== 部署成功 ===\${NC}"
        echo -e "原節點名稱: $NODE_NAME"
        echo -e "轉發連接埠: $VLESS_PORT"
        echo -e "您的臨時 Argo 節點 VLESS 連結為 (注意：VPS 重啟或重開服務後域名會刷新):"
        echo -e "\${GREEN}\$FINAL_LINK\${NC}\n"
    else
        echo -e "\${RED}錯誤: 獲取臨時域名超時！請執行 'cat /var/log/cloudflared-argo.log' 檢查日誌。\${NC}"
    fi
fi
`;
}

async function main() {
  console.log('==============================================');
  console.log('      VLESS -> Cloudflare Argo 轉換工具');
  console.log('==============================================');

  const input = await question('請輸入訂閱地址、多個 VLESS 節點、或儲存配置的訂閱網址:\n> ');
  if (!input.trim()) {
    console.log('輸入不能為空。');
    rl.close();
    return;
  }

  const nodes = await fetchAndParse(input);
  if (nodes.length === 0) {
    console.log('未找到任何有效的 VLESS 節點。');
    rl.close();
    return;
  }

  console.log(`\n成功解析出 ${nodes.length} 個 VLESS 節點:`);
  nodes.forEach((node, i) => {
    console.log(`  [${i + 1}] ${node.name} (${node.server}:${node.port}, 傳輸協定: ${node.type})`);
  });

  const select = await question('\n請選擇要複製並轉換的節點 (輸入數字並用逗號隔開，例如: 1,3 ；或輸入 all 代表全部):\n> ');
  let selectedNodes: VlessNode[] = [];
  if (select.trim().toLowerCase() === 'all') {
    selectedNodes = nodes;
  } else {
    const indices = select.split(',').map(s => parseInt(s.trim()) - 1);
    selectedNodes = indices.map(idx => nodes[idx]).filter(Boolean);
  }

  if (selectedNodes.length === 0) {
    console.log('選擇無效，程式結束。');
    rl.close();
    return;
  }

  console.log(`\n已選擇 ${selectedNodes.length} 個節點進行轉換...`);

  // 本地連接埠設定
  const port = await question('\n1. 請輸入該 VLESS 節點在 VPS 上監聽的本地連接埠 (預設 8080，請與 mack-a 配置一致):\n> ') || '8080';

  // Argo Tunnel 授權設定
  console.log('\n2. 隧道設定（直接斷行即代表隨機生成臨時隧道）：');
  const token = await question('   請貼上您的 Cloudflare Tunnel Token (選填):\n   > ');

  let domain = '';
  if (token.trim()) {
    domain = await question('   請輸入該隧道綁定的自訂域名 (例如: vless.domain.com):\n   > ');
    if (!domain.trim()) {
      console.log('   錯誤: 固定隧道模式必須提供自訂域名。');
      rl.close();
      return;
    }
  }

  // 建立腳本存放目錄
  const outputDir = path.join(process.cwd(), 'argo_outputs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const generatedNodes: string[] = [];

  for (const node of selectedNodes) {
    // 保留原本節點
    generatedNodes.push(node.originalLink);

    // 生成並寫入一鍵 VPS 腳本
    const vpsScript = generateVpsScript(node, port, token, domain);
    const safeNodeName = node.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const scriptPath = path.join(outputDir, `argo-install-${safeNodeName}.sh`);
    
    fs.writeFileSync(scriptPath, vpsScript, { encoding: 'utf8', mode: 0o755 });
    console.log(`\n[✓] 成功生成 VPS 安裝腳本: ${scriptPath}`);

    // 如果是固定隧道，可以直接在本地計算出新的 Argo 節點
    if (token.trim() && domain.trim()) {
      const argoLink = `vless://${node.uuid}@${domain.trim()}:443?encryption=none&security=tls&type=${node.type}&host=${domain.trim()}${node.type === 'ws' ? `&path=${encodeURIComponent(node.path)}` : ''}#Argo-${node.name}`;
      generatedNodes.push(argoLink);
      console.log(`    └─ 同步生成 Argo 節點連結: ${argoLink}`);
    } else {
      console.log(`    └─ 臨時隧道模式：節點連結需在 VPS 上執行腳本後動態輸出。`);
    }
  }

  // 如果有生成固定隧道的節點，將新舊節點整合寫入訂閱文件
  if (generatedNodes.length > selectedNodes.length) {
    const subPath = path.join(outputDir, 'argo_subscription.txt');
    fs.writeFileSync(subPath, generatedNodes.join('\n'), 'utf8');
    const base64Sub = Buffer.from(generatedNodes.join('\n')).toString('base64');
    fs.writeFileSync(path.join(outputDir, 'argo_subscription_base64.txt'), base64Sub, 'utf8');
    
    console.log(`\n[✓] 整合訂閱已生成（含原節點 + 新 Argo 節點）:`);
    console.log(`    - 明文列表: ${path.join(outputDir, 'argo_subscription.txt')}`);
    console.log(`    - Base64 格式: ${path.join(outputDir, 'argo_subscription_base64.txt')}`);
  }

  console.log('\n==============================================');
  console.log('部署說明：');
  console.log('1. 請將 argo_outputs 目錄內對應的 .sh 腳本上傳至您的 VPS。');
  console.log('2. 執行命令賦予執行權限並啟動：');
  console.log('   chmod +x argo-install-*.sh && ./argo-install-*.sh');
  console.log('==============================================');

  rl.close();
}

main();

````

## File: wrangler.toml
````toml
name = "my-sub-converter"
main = "src/index.ts"
compatibility_date = "2024-04-01"

[placement]
mode = "smart"

[[kv_namespaces]]
binding = "SUB_CACHE"
id = "KV_ID_PLACEHOLDER"

````

