# Complete Project Codebase
Generated on: Sun Sep  6 12:12:44 UTC 2026

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

[vars]
# 💥 私密管理密碼（選填）：設定後將保護「已儲存的配置」管理區域，避免他人檢視或竄改
# PAGE_PASSWORD = "your_secret_password"

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

## File: argo.sh
````sh
#!/bin/bash
# Cloudflare Argo Tunnel 一鍵部署腳本 (增強版 2.0)
# 專案網址: https://github.com/sammy0101/cf-sub-converter

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

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

# 2. 自動探測與修正連接埠
DETECTED_PORT="$VLESS_PORT"
if command -v ss &> /dev/null; then
    if ! ss -tln | grep -qE ":$VLESS_PORT([[:space:]]|$)"; then
        echo -e "${RED}警告: 本地轉發埠 $VLESS_PORT 未監聽，正在探測...${NC}"
        if ss -tln | grep -qE ":443([[:space:]]|$)"; then
            echo -e "${GREEN}自動修正：轉發目標為 443 埠。${NC}"
            DETECTED_PORT="443"
        elif ss -tln | grep -qE ":80([[:space:]]|$)"; then
            echo -e "${GREEN}自動修正：轉發目標為 80 埠。${NC}"
            DETECTED_PORT="80"
        fi
    fi
fi

# 3. 智慧探測 TLS
DETECTED_TLS="false"
if curl -s -k --connect-timeout 2 "https://127.0.0.1:$DETECTED_PORT" &>/dev/null; then
    echo "偵測到本地為 HTTPS 加密埠，開啟 TLS 轉發與 SNI 對齊。"
    DETECTED_TLS="true"
fi

LOCAL_URL="http://127.0.0.1:$DETECTED_PORT"
EXTRA_ARGS=""
if [ "$DETECTED_TLS" = "true" ]; then
    LOCAL_URL="https://127.0.0.1:$DETECTED_PORT"
    EXTRA_ARGS="--no-tls-verify"
fi

if [ -n "$ORIGIN_HOST" ]; then
    EXTRA_ARGS="$EXTRA_ARGS --http-host-header $ORIGIN_HOST"
    if [ "$DETECTED_TLS" = "true" ]; then
        EXTRA_ARGS="$EXTRA_ARGS --origin-server-name $ORIGIN_HOST"
    fi
fi

# 4. 啟動隧道
if [ -n "$TUNNEL_TOKEN" ]; then
    echo -e "${GREEN}【固定隧道模式】正在啟動服務...${NC}"
    cloudflared service uninstall &> /dev/null
    cloudflared service install "$TUNNEL_TOKEN"
    systemctl daemon-reload
    systemctl enable cloudflared
    systemctl restart cloudflared
    echo -e "${GREEN}固定域名隧道部署完成！${NC}"
else
    echo -e "${GREEN}【臨時隧道模式】正在啟動 Quick Tunnel...${NC}"
    systemctl stop cloudflared-argo-${SAFE_NODE_NAME} &> /dev/null
    
    cat <<EOF > /etc/systemd/system/cloudflared-argo-${SAFE_NODE_NAME}.service
[Unit]
Description=Cloudflare Argo Tunnel for ${NODE_NAME}
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --url $LOCAL_URL $EXTRA_ARGS
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable cloudflared-argo-${SAFE_NODE_NAME}
    systemctl start cloudflared-argo-${SAFE_NODE_NAME}
    
    echo "正在等待 Cloudflare 分配臨時域名..."
    TEMP_DOMAIN=""
    for i in {1..15}; do
        sleep 1
        TEMP_DOMAIN=$(journalctl -u cloudflared-argo-${SAFE_NODE_NAME} -n 50 --no-pager 2>/dev/null | grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' | tail -n 1 | cut -d'/' -f3)
        if [ -n "$TEMP_DOMAIN" ]; then
            break
        fi
    done
    
    if [ -n "$TEMP_DOMAIN" ]; then
        echo -e "${GREEN}獲取臨時域名成功: $TEMP_DOMAIN${NC}"
    else
        echo -e "${RED}超時未獲取到域名，請手動檢查 journalctl -u cloudflared-argo-${SAFE_NODE_NAME}${NC}"
    fi
fi

````

## File: package.json
````json
{
  "name": "cf-sub-converter",
  "version": "3.5.0",
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

## File: README.md
````md
# ⚡ CF Sub Converter Pro

基於 Cloudflare Workers 的全能 Serverless 訂閱轉換與節點中樞。擁有現代深色 UI、SWR 高可用快取容災架構、私密配置管理安全鎖、智慧倍率/專線分組、國旗萬國對齊系統，以及 **Argo 隧道 2.0 自動化生成器**。支援將各類代理節點一鍵轉換為 **Sing-Box / Clash Meta (Mihomo) / Surge 5 / Quantumult X / Loon / Base64** 格式，並提供全平台專屬喚醒協議（Deep Link）與行動條碼掃描自動導入。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sammy0101/cf-sub-converter)

---

## 🌟 核心特性

### 1. 🔌 全主流與新興協議深度解析
- **WireGuard 官方 `.conf` 深度支援**：直接貼入 Proton VPN、Mullvad 或 WARP 等多行 `[Interface] ... [Peer] ...` 設定檔，自動轉換為各平台出站，並智慧識別國家標籤（如 `🇳🇱 NL-FREE#246`）。
- **VLESS**：支援最新 `xhttp` / `splithttp`、`Reality`、`Vision`、`WebSocket (含 ?ed=2560 Early Data 淨化)`、`gRPC`。
- **ECH (Encrypted Client Hello)**：自動解析 `&ech=` 參數，在 Sing-Box 與 Clash 中開啟 ECH 加密問候，徹底繞過 GFW 針對 SNI 網域的阻斷。
- **WebSocket ALPN 智慧鎖定**：自動為 WS+TLS 節點指定 `alpn: ["http/1.1"]`，解決 Cloudflare 邊緣節點錯誤協商 HTTP/2 導致的斷流問題。
- **Shadowsocks-2022**：完整支援 `2022-blake3-*` 多端口與服務端密鑰。
- **其他協議**：Trojan、VMess、Hysteria 2 (`hy2`)、TUIC、AnyTLS。

### 2. 📱 全生態客戶端適配與一鍵喚醒 (Deep Link)
- **自適應識別 (Adaptive)**：自動依據請求客戶端的 `User-Agent` 回傳對應格式。
- **Clash Meta (Mihomo)**：YAML 格式，內建 Fake-IP、DoH 分流、流量嗅探與動態策略組。
- **Sing-Box (1.14+ 現代規範)**：
  - 完整符合 1.14+ 規範，徹底消除 `download_detour`、`missing default_domain_resolver`、`outbound DNS rule`、`dns-out` 等廢棄警告。
  - WireGuard 自動轉化為頂層現代 `endpoints` 結構，由策略組直接切換。
  - 國外代理流量採用 Fake-IP 封裝網域名稱，國內/內網流量自動使用 Real-IP 直連。
- **Surge 5**：標準 `.conf` 格式，支援 Proxy、Proxy Group、分流規則與 `[WireGuard ...]` 獨立專屬區塊。
- **Quantumult X**：支援包含 `vless=` 在內的標準 `server_remote` 節點清單。
- **Loon**：標準 `[Proxy]` 格式。
- **通用 Base64**：相容 v2rayNG、PassWall、Shadowrocket 等。
- **🚀 專屬喚醒二維碼**：
  - 點擊 QR Code 圖示自動產生客戶端專屬協議條碼（如 `sing-box://...`、`clash://...`、`surge:///...`）。
  - 手機相機或 App 掃描**全自動填入名稱與網址**，亦可點擊按鈕直接喚醒 App 一鍵導入。

### 3. 🔐 私密配置管理安全鎖 (PAGE_PASSWORD)
- **公私分明**：
  - **公開使用**：通用訂閱轉換、節點過濾、Argo 隧道生成、客戶端訂閱更新一律開放。
  - **私密保護**：下方的「已儲存的配置」受密碼保護，需輸入管理密碼才能檢視、新增或編輯私密節點。
- **永久記住登入狀態**：解鎖成功後瀏覽器（`localStorage`）自動保持登入，重開網頁免重複輸入，並提供隨時「🔒 鎖定」按鈕。
- **後端安全攔截**：`/favs` 路由全面校驗 `X-Password`，未授權請求直接回傳 `401 Unauthorized`。

### 4. 🛡️ 99.99% 高可用 SWR 容災架構 (Zero Downtime)
- **Stale-While-Revalidate + KV 快取**：遠端規則模板自動在邊緣快取，背景非同步靜默更新。
- **三重容災降級保證**：`KV 快取優先` ➔ `GitHub 即時獲取` ➔ `內嵌應急模板兜底`，徹底杜絕因 GitHub 429 限流或連線波動導致的轉換失敗。
- **支援即時穿透**：訂閱網址後外掛 `&force=1` 或 `&nocache=1` 即可跳過快取即時拉取最新規則。

### 5. 🏎️ 智慧倍率與專線動態策略組
- **倍率辨識**：自動識別節點名稱中的倍率特徵（如 `0.1x`、`0.5X`、`0.2倍`），並在 Sing-Box 與 Clash Meta 中動態建立「🏎️ 低倍率節點」策略組。
- **專線辨識**：自動擷取 `IPLC`、`IEPL`、`專線`、`內網` 特徵，動態生成「⚡ 專線加速」策略組。

### 6. 🌀 Argo 隧道 2.0 一鍵生成器
- **優選 IP / 官方域名注入**：支援填入 Cloudflare Clean IP（如 `104.16.80.1`）或優選網域，自動完成連接伺服器與 SNI/Host 映射，顯著降低延遲。
- **極簡 VPS 命令**：腳本自動上傳至 KV 快取，透過 `curl -sSL ... | bash` 極速完成部署。
- **智慧探測與修復**：VPS 端自動探測 443 / 80 本地監聽連接埠、TLS 狀態與 Host Header 重寫。

### 7. 🔍 智慧篩選、名稱替換與黃金國旗排版
- **雙向過濾**：支援「僅保留」與「排除」規則（多組用 `|` 隔開，如 `HK|TW` 或 `5x`），內建 `x`/`X`/`×` 字符相容匹配。
- **名稱替換**：支援 `DEL-關鍵字`（刪除）、`尋找-替換`，以及 `ALL-新名稱`（一鍵統改所有節點名稱）。
- **黃金 22 地區國旗排序**：自動為節點補上國旗 Emoji，依亞太核心（港、台、日、星、韓）➔ 歐美主流（美、英、加、澳）順序緊密分群，並自動對重複節點編號。

### 8. 📊 流量與到期日加總透傳
- 自動從上游多個機場擷取並加總上傳、下載與總流量，計算最近的到期時間，透過標準 `subscription-userinfo` 標頭透傳，完美點亮客戶端流量資訊條。

---

## 🚀 部署教學

### 方法一：一鍵按鈕快速部署 (最推薦、零設定自動託管)

點擊本說明文件上方的 **Deploy to Cloudflare Workers** 按鈕。

* **零設定自動託管**：Cloudflare 網頁部署精靈會引導您登入，並**在背景全自動為您建立並對接好所需的 KV 命名空間（`SUB_CACHE`）**。
* **自建 CI/CD (Workers Builds)**：Cloudflare 會在您的 GitHub 下自動建立此專案的複製倉庫。未來只要在 GitHub 修改並 `git push`，Cloudflare 就會自動在端點編譯部署。

---

### 方法二：手動 Fork 本專案並使用 GitHub Actions 自動部署 (需設定 Secrets)

如果您選擇**手動 Fork 本項目**並利用倉庫內建的 GitHub Actions 自動進行 CI/CD 部署，請依照以下步驟操作：

1. **Fork 本專案**：
   點擊本倉庫右上角的 **`Fork`** 按鈕，將專案複製一份到您的 GitHub 帳號下。

2. **建立 Cloudflare KV 命名空間**：
   - 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
   - 點擊左側選單的 **`Storage & Databases` (儲存與資料庫)** ➔ **`KV`**。
   - 點擊 **`Create a namespace`**，輸入名稱（例如 `SUB_CACHE`），建立完成後複製其 **Namespace ID**。

3. **設定 GitHub Repository Secrets**：
   前往您 Fork 出來的 GitHub 倉庫頁面，依次點擊：
   **`Settings`** ➔ **`Secrets and variables`** ➔ **`Actions`** ➔ **`New repository secret`**，添加以下三個密鑰：

   | 密鑰名稱 (Secret Name) | 說明與獲取方式 |
   | :--- | :--- |
   | **`CF_API_TOKEN`** | **Cloudflare API 權杖**<br>獲取方式：Cloudflare 首頁 ➔ 右上角「我的個人資料」➔「API 權杖」➔「建立權杖」➔ 選擇「編輯 Cloudflare Workers」模板（需具備 Workers 與 KV 的編輯權限）。 |
   | **`CF_ACCOUNT_ID`** | **Cloudflare 帳戶 ID**<br>獲取方式：登入 Cloudflare ➔ 點擊任意網域或 Worker 頁面，在右側欄位即可找到「帳戶 ID (Account ID)」。 |
   | **`CF_KV_ID`** | **KV 命名空間 ID**<br>獲取方式：填入步驟 2 中建立的 `SUB_CACHE` 命名空間 ID。 |

4. **觸發自動部署**：
   - 前往 GitHub 倉庫的 **`Actions`** 標籤頁。
   - 點擊左側的 **`Deploy to Cloudflare Workers`** 工作流，點擊 **`Run workflow`** 手動執行部署。
   - 後續只要您對 `main` 或 `master` 分支推送（Push）任何代碼變更，GitHub Actions 就會全自動為您編譯並發布至 Cloudflare Workers。

---

### 方法三：本地手動編譯部署 (Wrangler CLI)

1. **克隆專案並安裝依賴**：
   ```bash
   git clone https://github.com/sammy0101/cf-sub-converter.git
   cd cf-sub-converter
   npm install
   ```

2. **建立 KV 命名空間**：
   ```bash
   wrangler kv:namespace create SUB_CACHE
   ```
   *將終端機回傳的 `id` 替換至 `wrangler.toml` 中的 `KV_ID_PLACEHOLDER`。*

3. **發布至 Cloudflare**：
   ```bash
   npm run deploy
   ```

---

## 🔐 設定私密管理密碼（PAGE_PASSWORD）

若要啟用「已儲存的配置」安全密碼鎖，推薦直接在 Cloudflare Dashboard 中設定為 **Secret（加密機密）**，無論重新部署多少次都**永遠不會丟失**：

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ 點進您的 Worker。
2. 點擊頂部的 **`Settings` (設定)** ➔ **`Variables and Secrets` (變數與機密)**。
3. 點擊 **`Add variable`** 或 **`Add secret`**：
   - **名稱**：`PAGE_PASSWORD`
   - **值**：輸入您的管理密碼（例如 `MyPass888`）
   - 點擊欄位旁的 **`Encrypt` (加密)** 按鈕鎖定。
4. 點擊 **`Save and deploy` (儲存並部署)** 即可立即生效！

---

## 📖 使用指南

### 1. 視覺化 Web 面板
訪問您部署完成的 Workers 網址：
- **資料來源設定**：貼上機場訂閱連結、WireGuard `.conf` 設定檔或各類協議節點（支援多行混合輸入）。
- **過濾與替換**：設定保留/排除關鍵字或名稱替換規則。
- **短連結雲端儲存**：設定自訂短代碼，規則將自動打包存入 KV。
- **多平台訂閱面板**：
  - 複製對應客戶端的訂閱連結。
  - 點擊 QR Code 圖示彈出專屬喚醒視窗，手機相機掃描自動填入，或點擊「🚀 一鍵打開並導入」直接喚醒 App。
- **配置收藏管理**：輸入管理密碼解鎖後，可自由新增、編輯、刪除或一鍵套用常用的私密配置，瀏覽器會自動記住登入狀態。

---

### 2. Argo 隧道 2.0 部署步驟

1. 在網頁主輸入框貼入您的 VLESS / VMess 節點內容。
2. 點擊 **「第一步：解析並載入目前輸入的 VLESS / VMess 節點」**。
3. 勾選欲轉換之節點，系統會自動匹配原埠號。
4. （選填）填入 **Cloudflare 優選 IP**（例如 `104.16.80.1`）以加速連線。
5. （選填）填入固定 Tunnel Token 與自訂綁定域名（若留空則為臨時隨機隧道）。
6. 點擊 **「第二步：生成 Argo 一鍵部署指令與節點」**。
7. 將產生的 `curl -sSL ... | bash` 指令複製至 VPS（以 root 權限執行）。
8. 部署成功後：
   - **固定域名模式**：下方文字框直接複製已轉換好的 `_Argo_優選` 節點。
   - **臨時隨機模式**：VPS 終端機將動態輸出最終分配的節點連結。

---

### 3. API 調用與外部前端對接

#### 當作標準 SubConverter 後端使用
本專案內建標準 `/sub` 與 `/version` 端點，可直接填入任何開源 `sub-web` 前端的「後端地址 (Backend URL)」：
```text
https://your-worker.workers.dev
```

#### URL 參數手動轉換

| 參數 | 說明 | 範例 |
| :--- | :--- | :--- |
| `url` | 原始訂閱連結或節點內容（需 URL 編碼） | `https://example.com/sub` |
| `target` | 目標格式：`clash` / `singbox` / `surge` / `quanx` / `loon` / `base64` | `target=clash` |
| `include` | 僅保留符合正則之節點 | `include=HK\|TW` |
| `exclude` | 排除符合正則之節點（自動相容乘號 `×`） | `exclude=5x\|官網` |
| `rename` | 名稱替換（刪除：`DEL-字串`、替換：`A-B`、統改：`ALL-名稱`） | `rename=DEL-[69云]\|ALL-JP` |
| `force` / `nocache` | 強制穿透 KV 快取，即時拉取最新遠端規則模板 | `force=1` |

**完整調用範例**：
```http
# 轉換原始訂閱為 Clash Meta 格式，僅保留香港，並刪除廣告名稱
https://your-worker.workers.dev/sub?url=<URL編碼>&target=clash&include=HK&rename=DEL-[廣告]

# 讀取已存於雲端 KV 的短連結配置
https://your-worker.workers.dev/<自訂短連結名稱>?target=singbox

# 強制刷新快取獲取最新 Sing-Box 規則
https://your-worker.workers.dev/<自訂短連結名稱>?target=singbox&force=1
```

---

## 🛡️ 內建分流群組 (Sing-Box / Clash Meta)

| 圖示 | 策略組名稱 | 路由邏輯 |
| :--- | :--- | :--- |
| 🏎️ | 低倍率節點 | 自動彙整倍率 `< 1.0x` 的節點（省流專用） |
| ⚡ | 專線加速 | 自動彙整包含 `IPLC` / `IEPL` / `專線` 的低延遲節點 |
| 🚀 | 節點選擇 | 手動指定出站節點 |
| ⚡ | 自動選擇 | URL Test 自動測速切換最低延遲節點 |
| 💬 | AI 服務 | 針對 OpenAI / Claude / Gemini / AI Studio 專屬分流 |
| 🍎 | 蘋果服務 | Apple 相關服務直連或代理 |
| Ⓜ️ | 微軟服務 | Microsoft 服務直連或代理 |
| 🎮 | 遊戲平台 | Steam / Epic / EA / Ubisoft / Blizzard |
| 🌐 | 非中國 | 全球主流網站（Google、Telegram、YouTube 等） |
| 🇨🇳 | 國內服務 | 中國大陸 IP 與網域自動精準直連 |
| 🏠 | 私有網絡 | 區域網路 (LAN) 直連 |
| 🛑 | 廣告攔截 | 阻擋常見廣告與追蹤器 (AdBlock) |
| 🐟 | 漏網之魚 | Final Match 未命中規則之預設路由 |

---

## ❓ 常見問題排錯 (FAQ)

### 1. Windows 上運行 WireGuard 節點報錯 `listen udp6: An invalid argument was supplied`？
- **原因**：Windows 電腦未開啟 IPv6 協議元件，導致 Sing-Box 核心在嘗試雙棧 UDP 監聽時被 Windows Winsock 攔截。
- **解法**：在 Windows 按 `Win + R` ➔ 輸入 `ncpa.cpl` ➔ 在連線的網卡（乙太網路或 Wi-Fi）點右鍵「內容」➔ **將「網際網路通訊協定第 6 版 (TCP/IPv6)」打勾啟用** 即可正常握手連通。若電腦完全無法開啟 IPv6，建議使用 **Clash Meta** 格式訂閱。

### 2. Cloudflare EdgeTunnel 節點在手機端連線逾時？
- **原因**：部分 Cloudflare 節點啟用了 ECH（加密問候）或自訂 WebSocket Early Data。
- **解法**：本工具已全面自動淨化路徑中的 `?ed=2560`，並鎖定 `alpn: ["http/1.1"]`，只要透過本轉換器更新至最新訂閱，即可完美相容。

---

## 📁 專案架構

```text
cf-sub-converter/
├── src/
│   ├── index.ts          # Worker 核心路由、並發請求控制、安全鑒權與 API 接口
│   ├── constants.ts      # 響應式深色 UI 模板、QR Code 生成器與 SWR 內嵌降級規則
│   ├── parser.ts         # 萬能節點解析器 (WireGuard .conf, VLESS SplitHTTP/EarlyData, ECH 等)
│   ├── generator.ts      # 多平台格式生成器 (Sing-Box 1.14+, Clash, Surge 5, QuanX, Loon, Base64)
│   ├── utils.ts          # 倍率與專線特徵提取、Base64 安全編碼、萬國國旗對齊演算法
│   └── types.ts          # 嚴格 TypeScript 類型定義
├── argo.sh               # VPS Argo 隧道 2.0 一鍵安裝與自我修復通用腳本
├── Sing-Box_Rules.JSON   # 遠端 Sing-Box 混合 TUN 規則模板 (1.14+ 現代無警告規範)
├── Clash_Rules.YAML      # 遠端 Clash Meta (Mihomo) 規則模板
├── wrangler.toml         # Cloudflare Workers 配置檔
└── .github/workflows/
    └── deploy.yml        # GitHub Actions 自動化部署工作流
```

---

## ⚠️ 免責聲明

本專案僅供網路安全、分散式架構學習與技術交流使用，不提供任何代理伺服器或節點服務。請使用者自覺遵守當地法律法規，切勿用於任何非法用途。

````

## File: src/index.ts
````ts
// src/index.ts
// @ts-ignore
import packageJson from '../package.json';
import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import {
  toSingBoxWithTemplate,
  toClashWithTemplate,
  toBase64,
  toSurge,
  toQuantumultX,
  toLoon
} from './generator';
import { deduplicateNodeNames, groupNodesByFlag } from './utils';

const version = packageJson.version || '3.5.0';

// 密碼鑒權校驗
function checkAuth(request: Request, env: Env): boolean {
  if (!env.PAGE_PASSWORD || env.PAGE_PASSWORD.trim() === '') {
    return true;
  }
  const clientPwd = request.headers.get('X-Password') || '';
  return clientPwd === env.PAGE_PASSWORD.trim();
}

// 輔助載入與解析節點
async function loadNodes(urlParam: string): Promise<ProxyNode[]> {
  const allNodes: ProxyNode[] = [];
  const trimmed = urlParam.trim();
  if (!trimmed) return allNodes;

  // 1. 優先完整辨識多行 WireGuard 或 MASQUE JSON
  if (/\[Interface\]/i.test(trimmed) && /\[Peer\]/i.test(trimmed)) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  if (trimmed.startsWith('{') && /["']private_key["']/i.test(trimmed)) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  // 2. 傳統單行節點或訂閱連結
  const inputs = urlParam.split(/[\n\r|]+/); 
  for (const input of inputs) {
    const t = input.trim(); 
    if (!t) continue;
    
    if (t.startsWith('http')) { 
      try { 
        const separator = t.includes('?') ? '&' : '?';
        const fetchUrl = `${t}${separator}t=${Date.now()}`;
        
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
            } catch {}
          }
        }
      } catch {} 
    } else { 
      try {
        const parsed = await parseContent(t);
        allNodes.push(...parsed); 
      } catch {}
    }
  }
  return allNodes;
}

function safeBtoa(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch {
    return btoa(str);
  }
}

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
  } catch {
    template = `#!/bin/bash
if ! command -v cloudflared &> /dev/null; then
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
fi
cloudflared tunnel --url http://127.0.0.1:{{VLESS_PORT}}
`;
  }

  const vlessType = node.network || 'ws';
  const vlessPath = node.wsPath || '/';
  const argoNodeName = `${node.name}_Argo`;
  const isTls = node.tls ? "true" : "false";
  const realHost = node.wsHeaders?.Host || node.sni || node.server; 

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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Password',
        }
      });
    }

    // GET /argo/sh/:id
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
      return new Response('# 錯誤: 該腳本不存在或已過期，請重新在網頁上生成。\nexit 1\n', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // POST /api/parse-argo
    if (request.method === 'POST' && (url.pathname === '/api/parse-vless' || url.pathname === '/api/parse-argo')) {
      try {
        const body = (await request.json()) as { url?: string };
        const rawUrl = body.url || '';
        if (!rawUrl.trim()) {
          return new Response(JSON.stringify({ error: '請輸入有效的節點內容' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const allNodes = await loadNodes(rawUrl);
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }

    // POST /api/argo-generate
    if (request.method === 'POST' && url.pathname === '/api/argo-generate') {
      try {
        const body = (await request.json()) as {
          url?: string;
          indices?: number[];
          port?: string;
          cleanIp?: string;
          token?: string;
          domain?: string;
        };

        const rawUrl = body.url || '';
        const selectedIndices = body.indices || [];
        const port = body.port || '8080';
        const cleanIp = (body.cleanIp || '').trim();
        const token = body.token || '';
        const domain = body.domain || '';

        if (!rawUrl.trim() || selectedIndices.length === 0) {
          return new Response(JSON.stringify({ error: '無效的參數或未選擇節點' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const allNodes = await loadNodes(rawUrl);
        const compatibleNodes = allNodes.filter(n => n.type === 'vless' || n.type === 'vmess');
        const selectedObjects = selectedIndices.map(idx => compatibleNodes[idx]).filter(Boolean);

        let scripts = '';
        const generatedNodesData: Array<{ originalIndex: number; link: string }> = [];

        for (let i = 0; i < selectedObjects.length; i++) {
          const node = selectedObjects[i];
          const originalIndex = selectedIndices[i];
          
          scripts += await getArgoScriptFromGithub(node, port, token, domain) + '\n\n';

          const targetDomain = (token.trim() && domain.trim()) ? domain.trim() : "請在VPS執行一鍵安裝腳本獲取臨時域名.trycloudflare.com";
          const connectionServer = cleanIp || targetDomain;
          const argoNodeName = `${node.name}_Argo${cleanIp ? '_優選' : ''}`;

          let argoLink = '';
          if (node.type === 'vless') {
            argoLink = `vless://${node.uuid}@${connectionServer}:443?encryption=none&security=tls&type=${node.network || 'ws'}&host=${targetDomain}&sni=${targetDomain}&path=${node.wsPath || '/'}#${encodeURIComponent(argoNodeName)}`;
          } else {
            const vmessObj = {
              v: "2", ps: argoNodeName, add: connectionServer, port: 443, id: node.uuid,
              aid: 0, scy: "auto", net: node.network || 'ws', type: "none",
              host: targetDomain, path: node.wsPath || '/', tls: "tls", sni: targetDomain
            };
            argoLink = 'vmess://' + safeBtoa(JSON.stringify(vmessObj));
          }

          generatedNodesData.push({ originalIndex, link: argoLink });
        }

        let scriptId = '';
        if (env.SUB_CACHE) {
          scriptId = crypto.randomUUID();
          await env.SUB_CACHE.put('script:' + scriptId, scripts, { expirationTtl: 3600 });
        }

        return new Response(JSON.stringify({ 
          scriptId, 
          argoNodes: generatedNodesData 
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }

    // GET /version
    if (request.method === 'GET' && url.pathname === '/version') {
      return new Response(`subconverter v${version} ${url.host} backend\n`, {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8', 
          'Access-Control-Allow-Origin': '*'
        } 
      });
    }

    // POST /save 
    if (request.method === 'POST' && url.pathname === '/save') {
      try {
        const body = (await request.json()) as { path?: string; content?: string; include?: string; exclude?: string; rename?: string };
        if (!body.path || !body.content) return new Response('Missing path or content', { status: 400 });
        
        const saveData = {
          content: body.content,
          include: body.include || '',
          exclude: body.exclude || '',
          rename: body.rename || ''
        };
        await env.SUB_CACHE.put(body.path, JSON.stringify(saveData));
        
        return new Response('OK', { status: 200 });
      } catch {
        return new Response('Error saving profile', { status: 500 });
      }
    }

    // --- Favorites API ---
    const FAVS_KEY = 'favorites';
    const getFavs = async (): Promise<Array<Record<string, string>>> => {
      const data = await env.SUB_CACHE.get(FAVS_KEY);
      return data ? JSON.parse(data) : [];
    };
    const saveFavs = async (favs: Array<Record<string, string>>): Promise<void> => {
      await env.SUB_CACHE.put(FAVS_KEY, JSON.stringify(favs));
    };

    if (request.method === 'GET' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '密碼錯誤或未授權', locked: true }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const favs = await getFavs();
      return new Response(JSON.stringify(favs), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (request.method === 'POST' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '未授權' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      try {
        const body = (await request.json()) as Record<string, string>;
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
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('Error saving favorite', { status: 500 });
      }
    }

    if (request.method === 'PUT' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '未授權' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      try {
        const body = (await request.json()) as { index?: number; name?: string; url?: string; include?: string; exclude?: string; rename?: string };
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
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('Error updating favorite', { status: 500 });
      }
    }

    if (request.method === 'DELETE' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '未授權' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      try {
        const body = (await request.json()) as { index?: number };
        if (body.index === undefined) return new Response('Missing index', { status: 400 });
        const favs = await getFavs();
        if (body.index >= 0 && body.index < favs.length) {
          favs.splice(body.index, 1);
          await saveFavs(favs);
        }
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('Error deleting favorite', { status: 500 });
      }
    }

    // GET 訂閱路由
    let urlParam = url.searchParams.get('url') || '';
    let includeParam = url.searchParams.get('include') || '';
    let excludeParam = url.searchParams.get('exclude') || '';
    let renameParam = url.searchParams.get('rename') || '';
    const forceRefresh = url.searchParams.has('force') || url.searchParams.has('nocache');

    const path = decodeURIComponent(url.pathname.slice(1)); 

    if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
      let stored = await env.SUB_CACHE.get(path);
      if (!stored && path !== path.toLowerCase()) {
        stored = await env.SUB_CACHE.get(path.toLowerCase());
      }

      if (stored) { 
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.content) {
            urlParam = parsed.content;
            if (!includeParam) includeParam = parsed.include || '';
            if (!excludeParam) excludeParam = parsed.exclude || '';
            if (!renameParam) renameParam = parsed.rename || '';
          }
        } catch {
          urlParam = stored; 
        }
      }
    }

    if (!urlParam || urlParam.trim() === '') {
      if (path === 'sub') {
        return new Response('Error: Missing parameter "url"', { status: 400 });
      }
      const dynamicHtml = HTML_PAGE.replace('v3.5.0', `v${version}`);
      return new Response(dynamicHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // --- 💥 核心節點解析（支援 WireGuard INI 與 MASQUE JSON 完整結構） ---
    const allNodes: ProxyNode[] = [];
    const errors: string[] = [];
    let totalUpload = 0;
    let totalDownload = 0;
    let totalTotal = 0;
    let minExpire = 0;
    let hasTrafficInfo = false;

    const trimmedParam = urlParam.trim();

    // 1. 優先完整辨識多行 WireGuard 配置
    if (/\[Interface\]/i.test(trimmedParam) && /\[Peer\]/i.test(trimmedParam)) {
      try {
        const parsed = await parseContent(trimmedParam);
        allNodes.push(...parsed);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`[WireGuard 配置] 失敗原因: ${msg}`);
      }
    } 
    // 💥 2. 優先完整辨識 Cloudflare WARP MASQUE JSON 配置
    else if (trimmedParam.startsWith('{') && /["']private_key["']/i.test(trimmedParam)) {
      try {
        const parsed = await parseContent(trimmedParam);
        allNodes.push(...parsed);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`[MASQUE 配置] 失敗原因: ${msg}`);
      }
    } 
    // 3. 傳統單行 URI 節點或訂閱網址 (依換行分割)
    else {
      const inputs = urlParam.split(/[\n\r|]+/); 
      for (const input of inputs) {
        const trimmed = input.trim(); 
        if (!trimmed) continue;
        
        if (trimmed.startsWith('http')) { 
          try { 
            const separator = trimmed.includes('?') ? '&' : '?';
            const fetchUrl = `${trimmed}${separator}t=${Date.now()}`;
            const resp = await fetch(fetchUrl, { headers: { 'User-Agent': 'v2rayNG/1.8.5' } }); 
            
            if (resp.ok) { 
              const text = await resp.text(); 
              const userInfo = resp.headers.get('subscription-userinfo');
              if (userInfo) {
                hasTrafficInfo = true;
                const uploadMatch = userInfo.match(/upload=(\d+)/i);
                const downloadMatch = userInfo.match(/download=(\d+)/i);
                const totalMatch = userInfo.match(/total=(\d+)/i);
                const expireMatch = userInfo.match(/expire=(\d+)/i);

                totalUpload += uploadMatch ? parseInt(uploadMatch[1], 10) : 0;
                totalDownload += downloadMatch ? parseInt(downloadMatch[1], 10) : 0;
                totalTotal += totalMatch ? parseInt(totalMatch[1], 10) : 0;
                
                const expireVal = expireMatch ? parseInt(expireMatch[1], 10) : 0;
                if (expireVal > 0) {
                  if (minExpire === 0 || expireVal < minExpire) minExpire = expireVal; 
                }
              }

              if (!text.trim().startsWith('<')) {
                try {
                  const parsed = await parseContent(text);
                  allNodes.push(...parsed);
                } catch {}
              }
            }
          } catch {} 
        } else { 
          try {
            const parsed = await parseContent(trimmed);
            allNodes.push(...parsed); 
          } catch {}
        }
      }
    }

    if (allNodes.length === 0) {
      const errorMsg = errors.length > 0 ? errors.join('\n') : '未解析到任何有效節點。';
      return new Response(errorMsg, { status: 400 });
    }

    let filteredNodes = allNodes;

    // 替換
    if (renameParam) {
      const rules = renameParam.split('|');
      for (const rule of rules) {
        const trimmedRule = rule.trim();
        if (!trimmedRule) continue;

        if (trimmedRule.startsWith('DEL-')) {
          const search = trimmedRule.substring(4); 
          if (search) {
            filteredNodes.forEach(node => {
              if (node.name) node.name = node.name.split(search).join('');
            });
          }
        } else if (trimmedRule.includes('-')) {
          const idx = trimmedRule.indexOf('-');
          const search = trimmedRule.substring(0, idx).trim();
          const replace = trimmedRule.substring(idx + 1).trim();
          
          if (search && replace !== undefined) {
            if (search.toUpperCase() === 'ALL') {
              filteredNodes.forEach(node => { node.name = replace; });
            } else {
              filteredNodes.forEach(node => {
                if (node.name) node.name = node.name.split(search).join(replace);
              });
            }
          }
        }
      }
    }

    const buildFilterRegex = (param: string): RegExp => {
      const parts = param.split('|').map(part => {
        const trimmed = part.trim();
        if (!trimmed) return '';
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped.replace(/[xXｘＸ×]/g, '[xXｘＸ×]');
      }).filter(Boolean);
      return new RegExp(parts.join('|'), 'i');
    };

    if (includeParam) {
      const includeRegex = buildFilterRegex(includeParam);
      filteredNodes = filteredNodes.filter(node => includeRegex.test(node.name));
    }

    if (excludeParam) {
      const excludeRegex = buildFilterRegex(excludeParam);
      filteredNodes = filteredNodes.filter(node => !excludeRegex.test(node.name));
    }

    const sortedNodes = groupNodesByFlag(filteredNodes);
    const uniqueNodes = deduplicateNodeNames(sortedNodes);

    let target = url.searchParams.get('target');

    // 自動探測 User-Agent
    if (!target) {
      const ua = (request.headers.get('User-Agent') || '').toLowerCase();
      if (ua.includes('clash') || ua.includes('mihomo') || ua.includes('stash') || ua.includes('surfboard')) {
        target = 'clash';
      } else if (ua.includes('sing-box') || ua.includes('singbox') || ua.includes('hiddify')) {
        target = 'singbox';
      } else if (ua.includes('surge')) {
        target = 'surge';
      } else if (ua.includes('quantumult')) {
        target = 'quanx';
      } else if (ua.includes('loon')) {
        target = 'loon';
      } else if (ua.includes('v2ray') || ua.includes('shadowrocket')) {
        target = 'base64';
      }
    }

    if (!target) {
      const host = `https://${url.host}`;
      const encodedUrl = encodeURIComponent(urlParam);
      let filterQuery = '';
      if (includeParam) filterQuery += `&include=${encodeURIComponent(includeParam)}`;
      if (excludeParam) filterQuery += `&exclude=${encodeURIComponent(excludeParam)}`;
      if (renameParam) filterQuery += `&rename=${encodeURIComponent(renameParam)}`;

      const htmlInfo = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>轉換完成</title><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center;}a{display:inline-block;margin:10px;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;}</style></head>
<body>
  <h1>⚡ 成功轉換 ${uniqueNodes.length} 個節點</h1>
  <div>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=clash">Clash Meta (YAML)</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=singbox">Sing-Box (JSON)</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=surge">Surge 5</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=quanx">Quantumult X</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=loon">Loon</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=base64">Base64</a>
  </div>
</body></html>`;
      return new Response(htmlInfo, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    let result = '';
    let contentType = 'text/plain';
    let fileExt = '.txt';

    try {
      if (target === 'clash') {
        result = await toClashWithTemplate(uniqueNodes, env, forceRefresh);
        contentType = 'text/yaml';
        fileExt = '.yaml';
      } else if (target === 'surge') {
        result = toSurge(uniqueNodes);
        contentType = 'text/plain';
        fileExt = '.conf';
      } else if (target === 'quanx' || target === 'qx') {
        result = toQuantumultX(uniqueNodes);
        contentType = 'text/plain';
        fileExt = '.txt';
      } else if (target === 'loon') {
        result = toLoon(uniqueNodes);
        contentType = 'text/plain';
        fileExt = '.conf';
      } else if (target === 'base64') {
        result = toBase64(uniqueNodes);
        contentType = 'text/plain';
        fileExt = '.txt';
      } else {
        result = await toSingBoxWithTemplate(uniqueNodes, env, forceRefresh);
        contentType = 'application/json';
        fileExt = '.json';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(`轉換配置失敗: ${msg}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const filename = `subscription${fileExt}`;
    const responseHeaders: Record<string, string> = {
      'Content-Type': `${contentType}; charset=utf-8`, 
      'Access-Control-Allow-Origin': '*', 
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Profile-Update-Interval': '3600',
    };

    if (hasTrafficInfo) {
      let userInfoHeader = `upload=${totalUpload}; download=${totalDownload}; total=${totalTotal}`;
      if (minExpire > 0) userInfoHeader += `; expire=${minExpire}`;
      responseHeaders['subscription-userinfo'] = userInfoHeader;
    }

    return new Response(result, { headers: responseHeaders });
  }
};

````

## File: src/parser.ts
````ts
// src/parser.ts
import { ProxyNode, WireGuardConfig, MasqueConfig } from "./types";
import { safeBase64Decode, tryDecodeURIComponent } from "./utils";

// --- 安全的通用代理 URI 正則解析器 ---
interface ParsedUri {
  protocol: string;
  username: string;
  password?: string;
  hostname: string;
  port: number;
  params: URLSearchParams;
  hash: string;
}

function parseProxyUri(urlStr: string, defaultPort = 443): ParsedUri | null {
  try {
    const trimmed = urlStr.trim();
    const match = trimmed.match(/^([a-zA-Z0-9_-]+):\/\/(?:([^:@/?#]+)(?::([^@/?#]*))?@)?(\[[a-fA-F0-9:]+\]|[^:/?#]+)(?::([0-9]+))?(?:\?([^#]*))?(?:#(.*))?$/);
    if (!match) return null;

    const protocol = match[1].toLowerCase();
    const username = match[2] ? decodeURIComponent(match[2]) : '';
    const password = match[3] ? decodeURIComponent(match[3]) : undefined;
    let hostname = match[4];
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }
    const port = match[5] ? parseInt(match[5], 10) : defaultPort;
    const query = match[6] || '';
    const hash = match[7] ? tryDecodeURIComponent(match[7]) : '';

    const params = new URLSearchParams(query);
    return { protocol, username, password, hostname, port, params, hash };
  } catch {
    return null;
  }
}

function parsePluginParams(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  str.split(';').forEach(p => {
    const [k, v] = p.split('=');
    if (k && v) params[k] = v;
  });
  return params;
}

function isIpAddress(host: string): boolean {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host) || /^[a-fA-F0-9:]+$/.test(host);
}

// --- 解析 Cloudflare WARP MASQUE JSON 配置 ---
interface RawMasqueConfig {
  private_key?: string;
  endpoint_v4?: string;
  endpoint_v6?: string;
  endpoint_pub_key?: string;
  ipv4?: string;
  ipv6?: string;
  name?: string;
}

function parseMasqueJson(text: string): ProxyNode | null {
  try {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
    const config = JSON.parse(trimmed) as RawMasqueConfig;

    if (!config.private_key || (!config.endpoint_pub_key && !config.endpoint_v4)) {
      return null;
    }

    const privateKey = config.private_key.trim();
    const rawPubKey = config.endpoint_pub_key || '';
    const publicKey = rawPubKey.replace(/-----BEGIN[^-]+-----|-----END[^-]+-----|[\r\n\s]/g, '');
    const server = (config.endpoint_v4 || '162.159.198.2').trim();
    const port = 443;
    const rawIpv4 = (config.ipv4 || '172.16.0.2').trim();
    const localIpv4 = rawIpv4.includes('/') ? rawIpv4 : `${rawIpv4}/32`;
    
    let localIpv6: string | undefined = undefined;
    if (config.ipv6) {
      const rawIpv6 = config.ipv6.trim();
      localIpv6 = rawIpv6.includes('/') ? rawIpv6 : `${rawIpv6}/128`;
    }

    const name = config.name || 'WARP-MASQUE';

    const masqueConfig: MasqueConfig = {
      privateKey,
      publicKey,
      localIpv4,
      localIpv6,
      mtu: 1280
    };

    const node: ProxyNode = {
      type: 'masque',
      name,
      server,
      port,
      udp: true,
      masque: masqueConfig
    };

    node.singboxObj = {
      type: 'masque',
      tag: name,
      server,
      server_port: port,
      private_key: privateKey,
      public_key: publicKey,
      ip: localIpv4,
      ipv6: localIpv6
    };

    node.clashObj = {
      name,
      type: 'masque',
      server,
      port,
      'private-key': privateKey,
      'public-key': publicKey,
      ip: localIpv4,
      ipv6: localIpv6,
      mtu: 1280,
      udp: true,
      'remote-dns-resolve': true
    };

    return node;
  } catch {
    return null;
  }
}

// --- 💥 解析 masque:// URI 格式 (支援小火箭與通用客戶端雙向解析) ---
function parseMasqueUri(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const privateKey = parsed.username;
    const params = parsed.params;
    const publicKey = params.get('public_key') || params.get('pk') || '';
    const ipv4 = params.get('ip') || '172.16.0.2/32';
    const ipv6 = params.get('ipv6') || undefined;
    const mtu = parseInt(params.get('mtu') || '1280', 10);
    const name = parsed.hash || 'WARP-MASQUE';

    if (!privateKey || !publicKey) return null;

    const masqueConfig: MasqueConfig = {
      privateKey,
      publicKey,
      localIpv4: ipv4,
      localIpv6: ipv6,
      mtu
    };

    const node: ProxyNode = {
      type: 'masque',
      name,
      server: parsed.hostname,
      port: parsed.port,
      udp: true,
      masque: masqueConfig
    };

    node.singboxObj = {
      type: 'masque',
      tag: name,
      server: parsed.hostname,
      server_port: parsed.port,
      private_key: privateKey,
      public_key: publicKey,
      ip: ipv4,
      ipv6: ipv6
    };

    node.clashObj = {
      name,
      type: 'masque',
      server: parsed.hostname,
      port: parsed.port,
      'private-key': privateKey,
      'public-key': publicKey,
      ip: ipv4,
      ipv6: ipv6,
      mtu,
      udp: true,
      'remote-dns-resolve': true
    };

    return node;
  } catch {
    return null;
  }
}

// --- 解析 WireGuard 官方 .conf 格式 ---
function parseWireGuardConf(text: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  const sections = text.split(/(?=\[Interface\])/i).filter(s => s.trim().length > 0);

  for (const sec of sections) {
    if (!/\[Interface\]/i.test(sec) || !/\[Peer\]/i.test(sec)) continue;

    const getVal = (key: string): string => {
      const match = sec.match(new RegExp(`^[ \\t]*${key}[ \\t]*=[ \\t]*(.*?)[ \\t]*(?:#.*)?$`, 'mi'));
      return match ? match[1].trim() : '';
    };

    let name = '';
    const comments = sec.match(/^[ \t]*#[ \t]*(.*?)$/gm);
    if (comments) {
      for (const c of comments) {
        const clean = c.replace(/^[ \t]*#[ \t]*/, '').trim();
        if (clean && !clean.includes('=') && !clean.toLowerCase().startsWith('key for')) {
          name = clean;
          break;
        }
      }
    }

    const privateKey = getVal('PrivateKey');
    const addressStr = getVal('Address');
    const localAddress = addressStr ? addressStr.split(',').map(s => s.trim()) : ['10.2.0.2/32'];
    const publicKey = getVal('PublicKey');
    const presharedKey = getVal('PresharedKey') || undefined;
    const endpoint = getVal('Endpoint');
    const mtuStr = getVal('MTU');
    const mtu = mtuStr ? parseInt(mtuStr, 10) : 1420;
    
    const keepaliveStr = getVal('PersistentKeepalive');
    const keepalive = keepaliveStr ? parseInt(keepaliveStr, 10) : 25;

    if (!endpoint || !privateKey || !publicKey) continue;

    let server = endpoint;
    let port = 51820;
    const lastColon = endpoint.lastIndexOf(':');
    if (lastColon !== -1) {
      server = endpoint.slice(0, lastColon).trim();
      if (server.startsWith('[') && server.endsWith(']')) {
        server = server.slice(1, -1);
      }
      port = parseInt(endpoint.slice(lastColon + 1).trim(), 10) || 51820;
    }

    if (!name) {
      name = `Proton-WG-${server}`;
    }

    const wgConfig: WireGuardConfig = {
      privateKey,
      localAddress,
      publicKey,
      presharedKey,
      mtu
    };

    const node: ProxyNode = {
      type: 'wireguard',
      name,
      server,
      port,
      udp: true,
      wireguard: wgConfig
    };

    const hasIpv6 = localAddress.some(addr => addr.includes(':'));
    const allowedIps = ['0.0.0.0/0'];
    if (hasIpv6) {
      allowedIps.push('::/0');
    }

    node.singboxObj = {
      type: 'wireguard',
      tag: name,
      address: localAddress,
      private_key: privateKey,
      peers: [
        {
          address: server,
          port,
          public_key: publicKey,
          allowed_ips: allowedIps,
          pre_shared_key: presharedKey,
          persistent_keepalive_interval: keepalive
        }
      ],
      mtu: mtu || 1420
    };

    node.clashObj = {
      name,
      type: 'wireguard',
      server: node.server,
      port: node.port,
      ip: localAddress[0]?.split('/')[0] || '10.2.0.2',
      ipv6: localAddress[1]?.split('/')[0],
      'public-key': publicKey,
      'private-key': privateKey,
      'preshared-key': presharedKey,
      mtu,
      udp: true,
      'remote-dns-resolve': true
    };

    nodes.push(node);
  }

  return nodes;
}

// --- 解析 Shadowsocks ---
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
    const port = parseInt(portStr, 10);
    if (isNaN(port)) return null;

    const pluginStr = getParam(urlStr, 'plugin');
    const security = getParam(urlStr, 'security');
    const sni = getParam(urlStr, 'sni') || getParam(urlStr, 'host') || server;
    const alpnStr = getParam(urlStr, 'alpn');
    const fp = getParam(urlStr, 'fp') || 'chrome';
    const isEch = Boolean(getParam(urlStr, 'ech'));

    const isTls = security === 'tls' || urlStr.includes('obfs=tls') || (alpnStr && alpnStr.length > 0) || isEch;
    const alpn = alpnStr ? alpnStr.split(',') : undefined;
    const isSs2022 = method.toLowerCase().includes('2022');

    const node: ProxyNode = {
      type: 'shadowsocks', name, server, port, cipher: method, password, udp: true,
      tls: isTls, sni, alpn, fingerprint: fp, ech: isEch
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
    if (isEch) {
      cl['ech-opts'] = { enable: true };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 VLESS ---
function parseVless(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'VLESS';
    
    let rawPath = params.get('path') || '';
    
    const explicitNet = (params.get('type') || params.get('net') || params.get('network') || params.get('transport') || '').toLowerCase();
    let netType = explicitNet;
    if (!netType) {
      if (rawPath || params.has('ed') || params.has('host')) {
        netType = 'ws';
      } else {
        netType = 'tcp';
      }
    }

    if (netType === 'ws' && !rawPath) {
      rawPath = '/';
    }
    if (rawPath && !rawPath.startsWith('/')) {
      rawPath = '/' + rawPath;
    }

    let earlyDataLength: number | undefined = undefined;
    const edMatch = rawPath.match(/[?&]ed=([0-9]+)/) || (params.get('ed') ? [null, params.get('ed')] : null);
    if (edMatch && edMatch[1]) {
      earlyDataLength = parseInt(edMatch[1], 10);
    }

    const cleanPath = rawPath ? (rawPath.replace(/[?&]ed=[0-9]+/g, '').replace(/\?$/, '') || '/') : '/';

    const isXhttp = netType === 'xhttp' || netType === 'splithttp';
    const isGrpc = netType === 'grpc';
    const isEch = Boolean(params.get('ech'));

    const security = params.get('security') || (params.get('tls') === '1' || params.get('tls') === 'tls' || isEch ? 'tls' : (parsed.port === 443 ? 'tls' : 'none'));
    const isTls = security === 'tls' || security === 'reality' || isEch;
    const hostHeader = params.get('host') || params.get('sni') || parsed.hostname;
    const sniHost = params.get('sni') || params.get('host') || parsed.hostname;

    const customAlpn = params.get('alpn') ? params.get('alpn')!.split(',') : (netType === 'ws' ? ['http/1.1'] : undefined);
    const singboxServer = (isEch && isIpAddress(parsed.hostname) && sniHost) ? sniHost : parsed.hostname;

    const node: ProxyNode = {
      type: 'vless',
      name,
      server: parsed.hostname,
      port: parsed.port,
      uuid: parsed.username,
      tls: isTls,
      flow: params.get('flow') || undefined,
      network: netType,
      sni: sniHost,
      alpn: customAlpn,
      fingerprint: params.get('fp') || 'chrome',
      skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1',
      ech: isEch
    };

    if (security === 'reality') {
      node.reality = {
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || ''
      };
      if (!node.sni) node.sni = node.server;
    }

    if (node.network === 'ws') {
      node.wsPath = cleanPath;
      node.wsHeaders = { Host: hostHeader };
    }

    if (isXhttp) {
      node.xhttpPath = cleanPath;
      node.xhttpHost = hostHeader;
      node.xhttpMode = params.get('mode') || 'auto';
    }
    
    // Sing-Box Outbound
    const sb: Record<string, unknown> = {
      tag: name,
      type: 'vless',
      server: singboxServer,
      server_port: node.port,
      uuid: node.uuid,
      packet_encoding: 'xudp'
    };

    if (node.tls) {
      const tlsObj: Record<string, unknown> = {
        enabled: true,
        server_name: node.sni || node.server,
        alpn: node.alpn || (node.network === 'ws' ? ['http/1.1'] : undefined),
        insecure: node.skipCertVerify,
        utls: { enabled: true, fingerprint: node.fingerprint }
      };

      if (node.ech) {
        tlsObj.ech = { enabled: true };
      }

      if (node.reality) {
        tlsObj.reality = {
          enabled: true,
          public_key: node.reality.publicKey,
          short_id: node.reality.shortId
        };
      }
      sb.tls = tlsObj;
    }

    if (node.flow) sb.flow = node.flow;

    if (node.network === 'ws') {
      const wsTransport: Record<string, unknown> = {
        type: 'ws',
        path: cleanPath,
        headers: node.wsHeaders
      };
      if (earlyDataLength) {
        wsTransport.max_early_data = earlyDataLength;
        wsTransport.early_data_header_name = 'Sec-WebSocket-Protocol';
      }
      sb.transport = wsTransport;
    } else if (isXhttp) {
      sb.transport = {
        type: 'splithttp',
        path: cleanPath,
        headers: { Host: node.xhttpHost },
        mode: node.xhttpMode
      };
    } else if (isGrpc) {
      sb.transport = {
        type: 'grpc',
        service_name: params.get('serviceName') || ''
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
      alpn: node.alpn,
      'skip-cert-verify': node.skipCertVerify,
      'client-fingerprint': node.fingerprint
    };
    if (node.ech) {
      cl['ech-opts'] = { enable: true };
    }
    if (node.flow) cl.flow = node.flow; 
    if (node.reality) {
      cl.reality = true;
      cl['reality-opts'] = { 'public-key': node.reality.publicKey, 'short-id': node.reality.shortId };
    }
    if (node.network === 'ws') {
      cl['ws-opts'] = {
        path: cleanPath,
        headers: node.wsHeaders,
        'max-early-data': earlyDataLength,
        'early-data-header-name': earlyDataLength ? 'Sec-WebSocket-Protocol' : undefined
      };
    } else if (isXhttp) {
      cl.network = 'xhttp';
      cl['xhttp-opts'] = { path: cleanPath, host: node.xhttpHost, mode: node.xhttpMode };
    } else if (isGrpc) {
      cl.network = 'grpc';
      cl['grpc-opts'] = { 'grpc-service-name': params.get('serviceName') || '' };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 WireGuard (URI 格式) ---
function parseWireGuard(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 2408);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'WireGuard';

    const privateKey = parsed.username;
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
      server: parsed.hostname,
      port: parsed.port,
      udp: true,
      wireguard: wgConfig
    };

    const hasIpv6 = localIps.some(ip => ip.includes(':'));
    const allowedIps = ['0.0.0.0/0'];
    if (hasIpv6) {
      allowedIps.push('::/0');
    }

    node.singboxObj = {
      type: 'wireguard',
      tag: name,
      address: localIps,
      private_key: privateKey,
      peers: [
        {
          address: parsed.hostname,
          port: parsed.port,
          public_key: publicKey,
          allowed_ips: allowedIps,
          pre_shared_key: presharedKey,
          persistent_keepalive_interval: 25
        }
      ],
      mtu: mtu || 1420
    };

    node.clashObj = {
      name,
      type: 'wireguard',
      server: node.server,
      port: node.port,
      ip: localIps[0]?.split('/')[0] || '10.2.0.2',
      ipv6: localIps[1]?.split('/')[0],
      'public-key': publicKey,
      'private-key': privateKey,
      'preshared-key': presharedKey,
      mtu,
      udp: true,
      'remote-dns-resolve': true
    };

    return node;
  } catch {
    return null;
  }
}

// --- 解析 Hysteria2 ---
function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'Hy2';
    
    const node: ProxyNode = {
      type: 'hysteria2',
      name,
      server: parsed.hostname,
      port: parsed.port,
      password: parsed.username,
      tls: true,
      sni: params.get('sni') || parsed.hostname,
      skipCertVerify: params.get('insecure') === '1' || params.get('allowInsecure') === '1',
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
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'TUIC';

    const congestion_control = params.get('congestion_control') || 'bbr';
    const udp_relay_mode = params.get('udp_relay_mode') || 'native';
    const alpnStr = params.get('alpn');
    const skipCertVerify = params.get('allow_insecure') === '1' || params.get('insecure') === '1';

    const node: ProxyNode = {
      type: 'tuic',
      name,
      server: parsed.hostname,
      port: parsed.port,
      uuid: parsed.username,
      password: parsed.password || '',
      tls: true,
      sni: params.get('sni') || parsed.hostname,
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
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'AnyTLS';
    const uuid = parsed.username;
    const skipCertVerify = params.get('allowInsecure') === '1' || params.get('insecure') === '1';
    const alpnStr = params.get('alpn');

    const node: ProxyNode = {
      type: 'anytls',
      name,
      server: parsed.hostname,
      port: parsed.port,
      uuid,
      password: uuid,
      tls: true,
      sni: params.get('sni') || parsed.hostname,
      fingerprint: params.get('fp') || 'chrome',
      skipCertVerify,
      alpn: alpnStr ? alpnStr.split(',') : undefined
    };

    node.singboxObj = { 
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
    if (node.alpn) (node.singboxObj.tls as Record<string, unknown>).alpn = node.alpn;

    node.clashObj = {
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
    if (node.alpn) node.clashObj.alpn = node.alpn;

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
    let rawPath = config.path || '';

    const explicitNet = (config.net || '').toLowerCase();
    let netType = explicitNet;
    if (!netType) {
      netType = rawPath ? 'ws' : 'tcp';
    }

    if (netType === 'ws' && !rawPath) rawPath = '/';
    if (rawPath && !rawPath.startsWith('/')) rawPath = '/' + rawPath;

    let earlyDataLength: number | undefined = undefined;
    const edMatch = rawPath.match(/[?&]ed=([0-9]+)/);
    if (edMatch && edMatch[1]) {
      earlyDataLength = parseInt(edMatch[1], 10);
    }
    const cleanPath = rawPath ? (rawPath.replace(/[?&]ed=[0-9]+/g, '').replace(/\?$/, '') || '/') : '/';

    const isTls = config.tls === 'tls';

    const node: ProxyNode = {
      type: 'vmess',
      name,
      server: config.add,
      port: parseInt(config.port, 10) || (isTls ? 443 : 80),
      uuid: config.id,
      cipher: 'auto',
      tls: isTls,
      sni: config.sni || config.host,
      network: netType,
      wsPath: cleanPath,
      wsHeaders: config.host ? { Host: config.host } : undefined,
      skipCertVerify: true
    };
    
    const sb: Record<string, unknown> = {
      tag: name,
      type: 'vmess',
      server: node.server,
      server_port: node.port,
      uuid: node.uuid,
      security: 'auto',
      packet_encoding: 'xudp'
    };

    if (node.tls) {
      sb.tls = {
        enabled: true,
        server_name: node.sni || node.server,
        alpn: netType === 'ws' ? ['http/1.1'] : undefined,
        insecure: true
      };
    }
    if (node.network === 'ws') {
      const wsTransport: Record<string, unknown> = { type: 'ws', path: cleanPath, headers: node.wsHeaders };
      if (earlyDataLength) {
        wsTransport.max_early_data = earlyDataLength;
        wsTransport.early_data_header_name = 'Sec-WebSocket-Protocol';
      }
      sb.transport = wsTransport;
    }
    node.singboxObj = sb;
    
    const cl: Record<string, unknown> = {
      name,
      type: 'vmess',
      server: node.server,
      port: node.port,
      uuid: node.uuid,
      alterId: parseInt(config.aid, 10) || 0,
      cipher: config.scy || 'auto',
      udp: true,
      tls: node.tls,
      servername: node.sni || config.host || node.server,
      network: node.network
    };
    if (node.network === 'ws') {
      cl['ws-opts'] = {
        path: cleanPath,
        headers: node.wsHeaders,
        'max-early-data': earlyDataLength,
        'early-data-header-name': earlyDataLength ? 'Sec-WebSocket-Protocol' : undefined
      };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 解析 Trojan ---
function parseTrojan(urlStr: string): ProxyNode | null {
  try {
    const parsed = parseProxyUri(urlStr, 443);
    if (!parsed) return null;

    const params = parsed.params;
    const name = parsed.hash || 'Trojan';
    const isEch = Boolean(params.get('ech'));

    const node: ProxyNode = {
      type: 'trojan',
      name,
      server: parsed.hostname,
      port: parsed.port,
      password: parsed.username,
      tls: true,
      sni: params.get('sni') || params.get('peer') || parsed.hostname,
      skipCertVerify: params.get('allowInsecure') === '1' || params.get('insecure') === '1',
      ech: isEch
    };

    const tlsObj: Record<string, unknown> = {
      enabled: true,
      server_name: node.sni,
      insecure: node.skipCertVerify
    };
    if (node.ech) {
      tlsObj.ech = { enabled: true };
    }

    node.singboxObj = {
      tag: name,
      type: 'trojan',
      server: node.server,
      server_port: node.port,
      password: node.password,
      tls: tlsObj
    };

    const cl: Record<string, unknown> = {
      name,
      type: 'trojan',
      server: node.server,
      port: node.port,
      password: node.password,
      sni: node.sni,
      'skip-cert-verify': node.skipCertVerify,
      udp: true
    };
    if (node.ech) {
      cl['ech-opts'] = { enable: true };
    }
    node.clashObj = cl;

    return node;
  } catch {
    return null;
  }
}

// --- 主解析入口 ---
export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content.replace(/^\uFEFF/, '').trim(); 

  // 1. 優先檢查是否為標準 WireGuard INI 配置 ([Interface] 與 [Peer])
  if (/\[Interface\]/i.test(plainText) && /\[Peer\]/i.test(plainText)) {
    const wgNodes = parseWireGuardConf(plainText);
    if (wgNodes.length > 0) {
      return wgNodes;
    }
  }

  // 2. 優先檢查是否為 Cloudflare WARP MASQUE JSON 配置
  if (plainText.startsWith('{') && /["']private_key["']/i.test(plainText)) {
    const masqueNode = parseMasqueJson(plainText);
    if (masqueNode) {
      return [masqueNode];
    }
  }
  
  const protocols = ['ss://', 'vmess://', 'vless://', 'trojan://', 'tuic://', 'hysteria2://', 'hy2://', 'anytls://', 'wireguard://', 'warp://', 'masque://'];
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

      if (/\[Interface\]/i.test(decoded) && /\[Peer\]/i.test(decoded)) {
        const wgNodes = parseWireGuardConf(decoded);
        if (wgNodes.length > 0) return wgNodes;
      }

      if (decoded.startsWith('{') && /["']private_key["']/i.test(decoded)) {
        const masqueNode = parseMasqueJson(decoded);
        if (masqueNode) return [masqueNode];
      }
      
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
    // 💥 支援 masque:// 單行 URI 格式
    else if (l.startsWith('masque://')) { const n = parseMasqueUri(l); if (n) nodes.push(n); }
  } 
  
  if (nodes.length === 0) {
    throw new Error("資料獲取成功，但未能成功配對到任何支援的節點格式。");
  }
  
  return nodes;
}

````

## File: src/generator.ts
````ts
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
      if (node.type === 'wireguard' && node.wireguard) {
        const wg = node.wireguard;
        const params = new URLSearchParams();
        params.set('ip', wg.localAddress.join(','));
        if (wg.publicKey) params.set('public_key', wg.publicKey);
        if (wg.presharedKey) params.set('psk', wg.presharedKey);
        if (wg.reserved) params.set('reserved', wg.reserved.join(','));
        if (wg.mtu) params.set('mtu', String(wg.mtu));
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
  
  // 1. 自動補全 Sing-Box 1.14+ 規範之 http_clients
  if (!config.http_clients || !Array.isArray(config.http_clients) || config.http_clients.length === 0) {
    config.http_clients = [{ tag: 'default' }];
  } else {
    config.http_clients.forEach((hc: Record<string, unknown>) => {
      if (hc.detour === 'direct' || hc.detour === 'DIRECT') {
        delete hc.detour;
      }
    });
  }

  // 2. 自動淨化 DNS 規範
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

  // 3. 自動補充 route.default_domain_resolver 與 default_http_client
  if (!config.route) config.route = {};
  config.route.default_domain_resolver = 'local-dns';
  config.route.default_http_client = 'default';
  
  if (Array.isArray(config.route.rule_set)) {
    config.route.rule_set.forEach((rs: Record<string, unknown>) => {
      delete rs.download_detour;
    });
  }

  // 4. 自動清理 inbounds
  if (Array.isArray(config.inbounds)) {
    config.inbounds.forEach((ib: Record<string, unknown>) => {
      delete ib.sniff;
      delete ib.sniff_override_destination;
    });
  }

  // 5. 核心分流：WireGuard 節點歸入頂層 endpoints[]，代理節點歸入 outbounds[]
  const wireguardEndpoints: Record<string, unknown>[] = [];
  const proxyOutbounds: Record<string, unknown>[] = [];

  nodes.forEach(n => {
    if (n.type === 'wireguard') {
      const wgObj = JSON.parse(JSON.stringify(n.singboxObj));
      delete wgObj.detour;
      wireguardEndpoints.push(wgObj);
    } else {
      const obj = JSON.parse(JSON.stringify(n.singboxObj));
      if (obj.transport?.type === 'ws' && obj.tls?.enabled === true && (!obj.tls.alpn || obj.tls.alpn.length === 0)) {
        obj.tls.alpn = ['http/1.1'];
      }
      proxyOutbounds.push(obj);
    }
  });

  if (wireguardEndpoints.length > 0) {
    if (!config.endpoints || !Array.isArray(config.endpoints)) {
      config.endpoints = [];
    }
    config.endpoints.push(...wireguardEndpoints);
  }

  if (!Array.isArray(config.outbounds)) config.outbounds = [];
  config.outbounds.push(...proxyOutbounds);

  const allNodeTags = nodes.map(n => n.name);

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

// --- Clash Meta 配置生成 (支援 type: masque) ---
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

````

## File: src/constants.ts
````ts
// src/constants.ts
export const REMOTE_CONFIG = {
  singbox: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Sing-Box_Rules.JSON',
  clash: 'https://raw.githubusercontent.com/sammy0101/cf-sub-converter/refs/heads/main/Clash_Rules.YAML'
};

// 方案 B1 內嵌緊急降級模板 (純 IPv4 純淨版)
export const FALLBACK_SINGBOX_RULES = JSON.stringify({
  log: { level: "info" },
  http_clients: [
    { tag: "default" }
  ],
  dns: {
    servers: [
      { tag: "remote-dns", type: "https", server: "8.8.8.8", detour: "🚀 節點選擇" },
      { tag: "local-dns", type: "udp", server: "223.5.5.5" },
      { tag: "system-dns", type: "local" },
      { tag: "fakeip-dns", type: "fakeip", inet4_range: "198.18.0.0/15" }
    ],
    rules: [
      { rule_set: "rs-ads", action: "reject" },
      {
        rule_set: [
          "rs-cn",
          "rs-private"
        ],
        server: "local-dns"
      },
      {
        rule_set: [
          "rs-geolocation-!cn",
          "rs-ai"
        ],
        server: "fakeip-dns"
      }
    ],
    final: "local-dns",
    strategy: "ipv4_only"
  },
  inbounds: [{ type: "tun", tag: "tun-in", interface_name: "tun0", auto_route: true, address: ["172.19.0.1/30"], stack: "mixed" }],
  outbounds: [
    { type: "selector", tag: "🚀 節點選擇", outbounds: ["⚡ 自動選擇", "direct"] },
    { type: "urltest", tag: "⚡ 自動選擇", outbounds: [], url: "https://www.gstatic.com/generate_204", interval: "3m" },
    { type: "direct", tag: "direct" },
    { type: "block", tag: "block" }
  ],
  route: {
    default_domain_resolver: "local-dns",
    default_http_client: "default",
    rules: [
      { action: "sniff" },
      { protocol: "dns", action: "hijack-dns" }
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
rules:
  - GEOIP,CN,DIRECT
  - MATCH,🚀 節點選擇
`;

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SubConverter Pro | 全能訂閱轉換器</title>
  
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
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-app); color: var(--text-main); line-height: 1.5; min-height: 100vh;
    }
    svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .header {
      background-color: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 1.25rem; }
    .brand svg { color: var(--primary); width: 1.75rem; height: 1.75rem; }
    .badge { background: rgba(59, 130, 246, 0.1); color: var(--primary); font-size: 0.75rem; padding: 4px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(59, 130, 246, 0.2); }
    .container { max-width: 860px; margin: 2.5rem auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .panel { background-color: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel-title { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group:last-child { margin-bottom: 0; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); margin-bottom: 0.5rem; }
    textarea, input[type="text"], input[type="password"] {
      width: 100%; background-color: var(--bg-input); border: 1px solid var(--border); color: var(--text-main); border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
    }
    textarea { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; min-height: 140px; resize: vertical; }
    textarea:focus, input[type="text"]:focus, input[type="password"]:focus { border-color: var(--primary); }
    .hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem; display: flex; align-items: flex-start; gap: 6px; }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.95rem; border: none; cursor: pointer; transition: all 0.2s; user-select: none;
    }
    .btn-primary { background-color: var(--primary); color: white; width: 100%; padding: 1rem; font-size: 1.05rem; }
    .btn-primary:hover { background-color: var(--primary-hover); }
    .btn-icon { background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border); padding: 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; }
    .btn-icon:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--text-muted); }
    .btn-ghost { background: transparent; color: var(--text-muted); padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem;}
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-main); }
    .btn-danger:hover { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }

    .results-wrapper { display: none; }
    .results-wrapper.show { display: block; animation: slideUp 0.3s ease forwards; }
    .result-item { display: flex; align-items: center; gap: 1rem; background-color: var(--bg-input); border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; }
    .result-icon-box { width: 44px; height: 44px; border-radius: var(--radius-sm); background-color: var(--bg-panel); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
    .result-info { flex: 1; min-width: 140px; }
    .result-name { font-weight: 600; font-size: 0.95rem; color: var(--text-main); }
    .result-desc { font-size: 0.8rem; color: var(--text-muted); }
    .result-input-wrapper { flex: 2; position: relative; }
    .result-input-wrapper input { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-panel); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-muted); }
    .result-actions { display: flex; gap: 6px; flex-shrink: 0; }

    .fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .fav-card { 
      background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; cursor: pointer; transition: all 0.2s ease; 
    }
    .fav-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .fav-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .fav-url { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fav-actions { display: flex; gap: 8px; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); justify-content: flex-end; }
    .empty-state { text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.9rem; border: 1px dashed var(--border); border-radius: var(--radius-md); }

    /* 鎖定區域樣式 */
    .lock-card {
      background: radial-gradient(circle at top, rgba(59, 130, 246, 0.08) 0%, rgba(15, 23, 42, 0.5) 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-md);
      padding: 1.75rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 340px;
      width: 100%;
      margin: 0.75rem auto;
      box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);
    }
    .lock-icon-badge {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05));
      border: 1px solid rgba(59, 130, 246, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      color: var(--primary);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.2);
    }
    .lock-icon-badge svg {
      width: 22px;
      height: 22px;
    }
    .lock-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.25rem;
    }
    .lock-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      max-width: 280px;
      line-height: 1.4;
      margin-bottom: 1.25rem;
    }
    .lock-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 280px;
    }
    .lock-form input {
      width: 100% !important;
      text-align: center;
      letter-spacing: 2px;
      font-size: 0.95rem;
      padding: 0.7rem 1rem;
      background: var(--bg-app);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    .lock-form .btn {
      width: 100% !important;
      padding: 0.7rem;
      font-size: 0.92rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .shake {
      animation: shake 0.4s ease-in-out;
      border-color: var(--danger) !important;
    }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); z-index: 100; display: none; align-items: center; justify-content: center; }
    .modal-overlay.show { display: flex; }
    .modal-content { background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 92%; max-width: 720px; padding: 2rem; max-height: 92vh; overflow-y: auto; }
    .modal-footer { display: flex; gap: 12px; margin-top: 2rem; justify-content: flex-end; }

    .toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: var(--bg-panel); color: var(--text-main); border: 1px solid var(--border); padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.3s; z-index: 200; pointer-events: none; }
    .toast.show { opacity: 1; }
    .toast.success svg { color: var(--success); }
    .toast.error svg { color: var(--danger); }
    .cmd-group { display: flex; gap: 8px; margin-top: 8px; align-items: center; width: 100%; }
    .cmd-group input { flex: 1; }
    .cmd-group .btn { flex-shrink: 0; }

    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 640px) {
      .result-item { flex-direction: column; align-items: stretch; gap: 8px; padding: 1rem; }
      .result-icon-box { display: none; }
      .result-actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
      .result-actions .btn-icon { height: 38px; display: flex; justify-content: center; align-items: center; }
      .lock-card { padding: 1.5rem 1rem; }
    }
  </style>
</head>
<body>

  <header class="header">
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
      SubConverter Pro
    </div>
    <span class="badge" id="appVersionBadge">PRO</span>
  </header>

  <div class="container">
    <!-- 1. 資料來源設定 (公開使用) -->
    <main class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          資料來源與規則設定
        </h2>
      </div>
      
      <div class="form-group">
        <label for="urlInput">節點連結或訂閱地址 (支援多筆換行，含 WireGuard/MASQUE/WARP/AnyTLS)</label>
        <textarea id="urlInput" placeholder="vmess://...&#10;vless://...&#10;wireguard://...&#10;masque://...&#10;hysteria2://...&#10;https://example.com/sub"></textarea>
      </div>

      <div class="form-group">
        <label for="includeKeywords">僅保留關鍵字節點 (選填，多個用 | 分隔)</label>
        <input type="text" id="includeKeywords" placeholder="例如: 🇭🇰|台灣|TW|IPLC">
      </div>

      <div class="form-group">
        <label for="excludeKeywords">排除關鍵字節點 (選填，多個用 | 分隔)</label>
        <input type="text" id="excludeKeywords" placeholder="例如: 流量|官網|重置|5x">
      </div>

      <div class="form-group">
        <label for="renameKeywords">節點名稱替換 (選填，多個用 | 分隔)</label>
        <input type="text" id="renameKeywords" placeholder="例如: DEL-[69云]|移动优化-專線|ALL-JP">
      </div>
      
      <div class="form-group">
        <label for="shortCode">自訂路徑短連結 (選填)</label>
        <input type="text" id="shortCode" placeholder="例如: my-sub-vip">
      </div>
      
      <button class="btn btn-primary" id="generateBtn" onclick="generate()" style="margin-top: 1.5rem;">
        <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>執行全客戶端轉換</span>
      </button>
    </main>

    <!-- 2. 轉換結果面板 (公開使用) -->
    <section class="results-wrapper" id="results">
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            多平台訂閱連結
          </h2>
        </div>
        
        <!-- 自適應 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">自適應 (Auto)</div><div class="result-desc">自動識別客戶端協議</div></div>
          <div class="result-input-wrapper"><input type="text" id="adaptiveUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('adaptiveUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('adaptiveUrl', 'auto')" title="顯示專屬 QR Code / 一鍵喚醒"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Sing-Box -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Sing-Box</div><div class="result-desc">JSON 配置 · 支援掃碼自動填入</div></div>
          <div class="result-input-wrapper"><input type="text" id="singboxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('singboxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('singboxUrl', 'singbox')" title="顯示 Sing-Box 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Clash Meta -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg>
          </div>
          <div class="result-info"><div class="result-name">Clash Meta (Mihomo)</div><div class="result-desc">YAML 配置 · 支援 MASQUE / WireGuard</div></div>
          <div class="result-input-wrapper"><input type="text" id="clashUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('clashUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('clashUrl', 'clash')" title="顯示 Clash 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Surge 5 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">Surge 5</div><div class="result-desc">標準 Surge .conf 格式</div></div>
          <div class="result-input-wrapper"><input type="text" id="surgeUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('surgeUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('surgeUrl', 'surge')" title="顯示 Surge 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Quantumult X -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div class="result-info"><div class="result-name">Quantumult X</div><div class="result-desc">server_remote 遠端節點列表</div></div>
          <div class="result-input-wrapper"><input type="text" id="quanxUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('quanxUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('quanxUrl', 'quanx')" title="顯示 Quantumult X 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Loon -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          </div>
          <div class="result-info"><div class="result-name">Loon</div><div class="result-desc">Loon 代理配置清單</div></div>
          <div class="result-input-wrapper"><input type="text" id="loonUrl" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('loonUrl')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('loonUrl', 'loon')" title="顯示 Loon 專屬掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>

        <!-- Base64 -->
        <div class="result-item">
          <div class="result-icon-box">
            <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </div>
          <div class="result-info"><div class="result-name">Base64 / 通用</div><div class="result-desc">通用明文 / v2rayNG / Shadowrocket</div></div>
          <div class="result-input-wrapper"><input type="text" id="base64Url" readonly></div>
          <div class="result-actions">
            <button class="btn-icon" onclick="copyResult('base64Url')" title="複製連結"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="btn-icon" onclick="showQr('base64Url', 'shadowrocket')" title="顯示通用掃碼條碼"><svg viewBox="0 0 24 24"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg></button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Argo 隧道 2.0 生成器 (公開使用) -->
    <main class="panel">
      <div class="panel-header">
        <h2 class="panel-title" style="color: var(--primary);">
          <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          Argo 隧道 2.0 (支援優選 IP / 多端口部署)
        </h2>
      </div>
      
      <div class="form-group">
        <button class="btn btn-ghost" id="parseVlessBtn" onclick="parseVlessNodes()" style="width: 100%; justify-content: center; font-weight: 600;">
          第一步：解析並載入目前輸入的 VLESS / VMess 節點
        </button>
      </div>

      <div id="vlessSelectorWrapper" style="display: none; margin-top: 1.25rem; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; background: var(--bg-input);">
        <label style="margin-bottom: 0.75rem; display: block; font-weight: 600;">選擇要轉換的原始節點 (可多選)：</label>
        <div id="vlessCheckboxList" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; margin-bottom: 1.25rem;"></div>
        
        <div class="form-group">
          <label>1. VPS 本地監聽連接埠 (預設匹配選中節點)</label>
          <input type="text" id="argoLocalPort" value="8080">
        </div>

        <div class="form-group">
          <label>2. Cloudflare 優選 IP / 優選官方域名 (選填，例如 104.16.80.1)</label>
          <input type="text" id="argoCleanIp" placeholder="若留空則預設直接使用 Argo 分配域名">
        </div>

        <div class="form-group">
          <label>3. Cloudflare Tunnel Token (選填，留空啟用臨時隨機隧道)</label>
          <input type="text" id="argoTunnelToken" placeholder="若使用固定隧道請貼上 Token">
        </div>

        <div class="form-group">
          <label>4. 自訂綁定域名 (固定隧道必填)</label>
          <input type="text" id="argoCustomDomain" placeholder="例如: argo.yourdomain.com">
        </div>

        <button class="btn btn-primary" id="generateArgoBtn" onclick="generateArgo()" style="margin-top: 1rem; background: var(--success);">
          第二步：生成 Argo 一鍵部署指令與節點
        </button>
      </div>
    </main>

    <!-- Argo 結果區 (公開使用) -->
    <section class="results-wrapper" id="argoResults">
      <div class="panel">
        <div class="panel-header"><h2 class="panel-title" style="color: var(--success);">Argo 部署指令與節點列表</h2></div>
        <div class="form-group">
          <label>📋 VPS 一鍵部署命令 (root 權限執行)：</label>
          <div class="cmd-group">
            <input type="text" id="argoCurlCmd" readonly>
            <button class="btn btn-ghost" onclick="copyText('argoCurlCmd')">複製指令</button>
          </div>
        </div>
        <div class="form-group">
          <label>🔗 新生成的 Argo 節點列表：</label>
          <textarea id="argoBase64Sub" readonly style="min-height: 120px; font-size: 0.8rem;"></textarea>
          <button class="btn btn-ghost" onclick="copyText('argoBase64Sub')" style="margin-top: 0.5rem; width: 100%;">複製全部節點</button>
        </div>
      </div>
    </section>

    <!-- 4. 已儲存的配置 (受密碼保護區域) -->
    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          已儲存的配置
        </h2>
        <div id="favHeaderActions" style="display: flex; gap: 8px;"></div>
      </div>
      
      <div id="favGrid"></div>
    </section>
  </div>

  <!-- 新增/編輯配置對話框 -->
  <div class="modal-overlay" id="modal">
    <div class="modal-content">
      <h3 id="modalTitle" style="margin-bottom: 1rem;">新增配置</h3>
      <div class="form-group"><label>配置名稱</label><input type="text" id="favName"></div>
      <div class="form-group"><label>節點內容 / 訂閱連結</label><textarea id="favUrl"></textarea></div>
      <div class="form-group"><label>保留關鍵字</label><input type="text" id="favInclude"></div>
      <div class="form-group"><label>排除關鍵字</label><input type="text" id="favExclude"></div>
      <div class="form-group"><label>名稱替換規則</label><input type="text" id="favRename"></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="saveFav()" style="width: auto;">儲存</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast">
    <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span id="toastMsg">提示訊息</span>
  </div>

  <script>
    var favs = [];
    var isFavLocked = false;
    var parsedArgoNodesCache = [];

    function getStoredPwd() {
      return localStorage.getItem('sub_fav_pwd') || '';
    }

    function showToast(msg, isSuccess) {
      if (isSuccess === undefined) isSuccess = true;
      var t = document.getElementById('toast');
      var m = document.getElementById('toastMsg');
      m.textContent = msg;
      t.className = 'toast show ' + (isSuccess ? 'success' : 'error');
      setTimeout(function() {
        t.className = 'toast';
      }, 2500);
    }

    function copyResult(id) {
      var input = document.getElementById(id);
      if (!input || !input.value) return;
      input.select();
      navigator.clipboard.writeText(input.value).then(function() {
        showToast('已複製訂閱連結至剪貼簿！');
      }).catch(function() {
        document.execCommand('copy');
        showToast('已複製訂閱連結至剪貼簿！');
      });
    }

    function copyText(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var text = el.value || el.textContent;
      navigator.clipboard.writeText(text).then(function() {
        showToast('複製成功！');
      }).catch(function() {
        showToast('複製失敗，請手動複製', false);
      });
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

    function loadFavs() {
      var pwd = getStoredPwd();
      fetch('/favs', {
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.status === 401) {
          isFavLocked = true;
          renderLockScreen();
          return;
        }
        if (resp.ok) {
          resp.json().then(function(data) {
            favs = data;
            isFavLocked = false;
            renderFavs();
          });
        } else {
          renderErrorScreen('載入配置失敗');
        }
      }).catch(function(e) {
        renderErrorScreen('網路連線失敗');
      });
    }

    function renderLockScreen() {
      var headerActions = document.getElementById('favHeaderActions');
      headerActions.innerHTML = '';

      var grid = document.getElementById('favGrid');
      grid.className = '';
      grid.innerHTML = '<div class="lock-card" id="lockCardElement">' +
        '<div class="lock-icon-badge">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>' +
            '<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>' +
          '</svg>' +
        '</div>' +
        '<div class="lock-title">私密配置已鎖定</div>' +
        '<div class="lock-desc">此區域受管理密碼保護，請輸入密碼解鎖</div>' +
        '<div class="lock-form">' +
          '<input type="password" id="lockPwdInput" placeholder="請輸入管理密碼..." onkeydown="if(event.key===\\'Enter\\') unlockFavs()">' +
          '<button class="btn btn-primary" onclick="unlockFavs()">' +
            '<svg viewBox="0 0 24 24" style="width:16px;height:16px;margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>' +
            '解鎖配置' +
          '</button>' +
        '</div>' +
      '</div>';
    }

    function renderErrorScreen(msg) {
      document.getElementById('favHeaderActions').innerHTML = '';
      document.getElementById('favGrid').innerHTML = '<div class="empty-state">' + msg + '</div>';
    }

    function unlockFavs() {
      var input = document.getElementById('lockPwdInput');
      var pwd = input ? input.value.trim() : '';
      if (!pwd) {
        triggerShake();
        return showToast('請輸入管理密碼', false);
      }

      showToast('正在驗證密碼...');
      
      fetch('/favs', {
        headers: { 'X-Password': pwd }
      }).then(function(resp) {
        if (resp.ok) {
          localStorage.setItem('sub_fav_pwd', pwd);
          resp.json().then(function(data) {
            favs = data;
            isFavLocked = false;
            renderFavs();
            showToast('🔓 解鎖成功！已記住登入狀態');
          });
        } else {
          triggerShake();
          showToast('❌ 密碼錯誤，請重新輸入', false);
        }
      }).catch(function() {
        triggerShake();
        showToast('❌ 網路請求失敗', false);
      });
    }

    function triggerShake() {
      var el = document.getElementById('lockCardElement');
      if (el) {
        el.classList.add('shake');
        setTimeout(function() { el.classList.remove('shake'); }, 400);
      }
    }

    function lockFavs() {
      localStorage.removeItem('sub_fav_pwd');
      isFavLocked = true;
      renderLockScreen();
      showToast('🔒 已鎖定配置清單');
    }
    
    function renderFavs() {
      var headerActions = document.getElementById('favHeaderActions');
      headerActions.innerHTML = '<button class="btn btn-ghost" onclick="openModal()">' +
        '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
        '新增配置' +
      '</button>' +
      '<button class="btn btn-ghost" onclick="lockFavs()" title="鎖定配置清單">' +
        '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
        '鎖定' +
      '</button>';

      var grid = document.getElementById('favGrid');
      if (!favs || favs.length === 0) {
        grid.className = '';
        grid.innerHTML = '<div class="empty-state">目前尚未儲存配置，請點擊上方按鈕新增</div>';
        return;
      }

      grid.className = 'fav-grid';
      var html = '';
      for (var i = 0; i < favs.length; i++) {
        var f = favs[i];
        var includeBadge = f.include ? '<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); border-color: rgba(16, 185, 129, 0.2); margin-right: 4px;">保: ' + f.include + '</span>' : '';
        var excludeBadge = f.exclude ? '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2); margin-right: 4px;">排: ' + f.exclude + '</span>' : '';
        var renameBadge = f.rename ? '<span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); border-color: rgba(59, 130, 246, 0.2)">替: ' + f.rename + '</span>' : '';

        html += '<div class="fav-card" onclick="useFav(' + i + ')">' +
          '<div class="fav-title">' +
            '<svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' +
            f.name +
          '</div>' +
          '<div class="fav-url">' + f.url + '</div>' +
          '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">' +
            includeBadge + excludeBadge + renameBadge +
          '</div>' +
          '<div class="fav-actions">' +
            '<button class="btn btn-ghost" onclick="event.stopPropagation(); editFav(' + i + ')">編輯</button>' +
            '<button class="btn btn-ghost btn-danger" onclick="event.stopPropagation(); deleteFav(' + i + ')">刪除</button>' +
          '</div>' +
        '</div>';
      }
      grid.innerHTML = html;
    }

    function useFav(index) {
      if (!favs[index]) return;
      var f = favs[index];
      document.getElementById('urlInput').value = f.url || '';
      document.getElementById('shortCode').value = (f.name || '').replace(/\\s+/g, '-').toLowerCase();
      document.getElementById('includeKeywords').value = f.include || '';
      document.getElementById('excludeKeywords').value = f.exclude || '';
      document.getElementById('renameKeywords').value = f.rename || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('已載入配置：' + f.name);
    }

    function editFav(index) {
      if (!favs[index]) return;
      var f = favs[index];
      document.getElementById('modalTitle').textContent = '編輯配置';
      document.getElementById('favName').value = f.name || '';
      document.getElementById('favUrl').value = f.url || '';
      document.getElementById('favInclude').value = f.include || '';
      document.getElementById('favExclude').value = f.exclude || '';
      document.getElementById('favRename').value = f.rename || '';
      document.getElementById('modal').dataset.edit = index;
      document.getElementById('modal').classList.add('show');
    }

    function deleteFav(index) {
      if (!confirm('確定要刪除這筆配置嗎？')) return;
      var pwd = getStoredPwd();
      fetch('/favs', { 
        method: 'DELETE', 
        headers: { 
          'Content-Type': 'application/json',
          'X-Password': pwd
        }, 
        body: JSON.stringify({ index: index }) 
      }).then(function(resp) {
        if (resp.ok) {
          loadFavs();
          showToast('已成功刪除配置');
        } else {
          showToast('刪除失敗：未授權或密碼錯誤', false);
        }
      }).catch(function(e) {
        showToast('刪除失敗: ' + e.message, false);
      });
    }

    function saveFav() {
      var name = document.getElementById('favName').value.trim();
      var url = document.getElementById('favUrl').value.trim();
      var include = document.getElementById('favInclude').value.trim();
      var exclude = document.getElementById('favExclude').value.trim();
      var rename = document.getElementById('favRename').value.trim();
      if (!name || !url) return showToast('請完整填寫名稱與節點內容', false);

      var editIndex = document.getElementById('modal').dataset.edit;
      var pwd = getStoredPwd();
      var reqMethod = (editIndex !== '' && editIndex !== undefined) ? 'PUT' : 'POST';
      var reqBody = {
        name: name,
        url: url,
        include: include,
        exclude: exclude,
        rename: rename
      };
      if (reqMethod === 'PUT') {
        reqBody.index = parseInt(editIndex, 10);
      }

      fetch('/favs', {
        method: reqMethod,
        headers: { 
          'Content-Type': 'application/json',
          'X-Password': pwd
        },
        body: JSON.stringify(reqBody)
      }).then(function(resp) {
        if (resp.ok) {
          closeModal();
          loadFavs();
          showToast('配置儲存成功！');
        } else {
          showToast('儲存失敗：密碼錯誤或未授權', false);
        }
      }).catch(function() {
        showToast('儲存失敗，請重試', false);
      });
    }

    function generate() {
      var raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先輸入節點連結或訂閱網址', false);

      var host = window.location.origin;
      var shortCode = document.getElementById('shortCode').value.trim();
      var include = document.getElementById('includeKeywords').value.trim();
      var exclude = document.getElementById('excludeKeywords').value.trim();
      var rename = document.getElementById('renameKeywords').value.trim();
      
      var proceed = function(baseUrl) {
        var sep = baseUrl.indexOf('?') !== -1 ? '&' : '?';
        document.getElementById('adaptiveUrl').value = baseUrl;
        document.getElementById('clashUrl').value = baseUrl + sep + 'target=clash';
        document.getElementById('singboxUrl').value = baseUrl + sep + 'target=singbox';
        document.getElementById('surgeUrl').value = baseUrl + sep + 'target=surge';
        document.getElementById('quanxUrl').value = baseUrl + sep + 'target=quanx';
        document.getElementById('loonUrl').value = baseUrl + sep + 'target=loon';
        document.getElementById('base64Url').value = baseUrl + sep + 'target=base64';

        document.getElementById('results').classList.add('show');
        showToast('全客戶端連結生成完畢！');
      };

      if (shortCode) {
        fetch('/save', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ path: shortCode, content: raw, include: include, exclude: exclude, rename: rename }) 
        }).then(function() {
          proceed(host + '/' + shortCode);
        }).catch(function() {
          showToast('短連結儲存失敗，請檢查 KV 配置', false);
        });
      } else {
        var bUrl = host + '/?url=' + encodeURIComponent(raw);
        if (include) bUrl += '&include=' + encodeURIComponent(include);
        if (exclude) bUrl += '&exclude=' + encodeURIComponent(exclude);
        if (rename) bUrl += '&rename=' + encodeURIComponent(rename);
        proceed(bUrl);
      }
    }

    // 專屬 QR Code 生成與原生喚醒協議
    function showQr(id, clientType) {
      if (!clientType) clientType = 'auto';
      var rawUrl = document.getElementById(id).value;
      if (!rawUrl) return showToast('請先生成訂閱連結', false);

      var profileName = document.getElementById('shortCode').value.trim() || 'SubConverter';
      
      // QR Code 核心修復：所有客戶端掃碼器（尤其 Shadowrocket 小火箭）均要求掃描純 HTTP/HTTPS 訂閱 URL
      var qrTargetText = rawUrl;
      var deepLink = rawUrl;
      var displayTitle = '掃碼導入配置';
      var clientName = '客戶端';

      if (clientType === 'singbox') {
        deepLink = 'sing-box://import-remote-profile?url=' + encodeURIComponent(rawUrl) + '#' + encodeURIComponent(profileName);
        displayTitle = 'Sing-Box 專屬掃碼導入';
        clientName = 'Sing-Box';
      } else if (clientType === 'clash') {
        deepLink = 'clash://install-config?url=' + encodeURIComponent(rawUrl) + '&name=' + encodeURIComponent(profileName);
        displayTitle = 'Clash / Mihomo 專屬導入';
        clientName = 'Clash';
      } else if (clientType === 'surge') {
        deepLink = 'surge:///install-config?url=' + encodeURIComponent(rawUrl);
        displayTitle = 'Surge 5 專屬導入';
        clientName = 'Surge';
      } else if (clientType === 'quanx') {
        deepLink = 'quantumult-x:///add-resource?remote-resource=' + encodeURIComponent(JSON.stringify({ server_remote: [rawUrl + ', tag=' + profileName] }));
        displayTitle = 'Quantumult X 專屬導入';
        clientName = 'Quantumult X';
      } else if (clientType === 'loon') {
        deepLink = 'loon://import?type=config&url=' + encodeURIComponent(rawUrl);
        displayTitle = 'Loon 專屬導入';
        clientName = 'Loon';
      } else if (clientType === 'shadowrocket') {
        // Shadowrocket 點擊一鍵喚醒使用標準 add/sub 格式；二維碼保持純 URL 以便 App 內建相機掃碼識別
        deepLink = 'shadowrocket://add/sub://' + btoa(rawUrl) + '?remark=' + encodeURIComponent(profileName);
        displayTitle = 'Shadowrocket 專屬導入';
        clientName = 'Shadowrocket';
      }

      var win = window.open('', '_blank', 'width=460,height=600');
      if (!win) return showToast('請允許瀏覽器開啟彈出視窗', false);

      var qrHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + displayTitle + '</title>' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\\/script>' +
        '<style>' +
          'body { background: #0f172a; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }' +
          'h2 { font-size: 1.15rem; margin-bottom: 8px; }' +
          'p { color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px; }' +
          '#qrcode { background: #ffffff; padding: 16px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); margin-bottom: 20px; }' +
          '#qrcode img { display: block; }' +
          '.btn { display: inline-flex; align-items: center; justify-content: center; background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; cursor: pointer; width: 100%; max-width: 280px; font-size: 0.95rem; margin-bottom: 10px; transition: background 0.2s; }' +
          '.btn:hover { background: #2563eb; }' +
          '.btn-ghost { background: transparent; border: 1px solid #334155; color: #94a3b8; }' +
          '.btn-ghost:hover { background: #1e293b; color: white; }' +
        '</style>' +
        '</head><body>' +
        '<h2>' + displayTitle + '</h2>' +
        '<p>使用手機相機或對應客戶端掃描二維碼</p>' +
        '<div id="qrcode"></div>' +
        '<a href="' + deepLink + '" class="btn">🚀 一鍵打開並導入 ' + clientName + '</a>' +
        '<button onclick="window.close()" class="btn btn-ghost">關閉視窗</button>' +
        '<script>' +
          'new QRCode(document.getElementById("qrcode"), {' +
            'text: ' + JSON.stringify(qrTargetText) + ',' +
            'width: 220,' +
            'height: 220,' +
            'correctLevel: QRCode.CorrectLevel.M' +
          '});' +
        '<\\/script>' +
        '</body></html>';

      win.document.open();
      win.document.write(qrHtml);
      win.document.close();
    }

    // Argo 隧道第一步：解析節點
    function parseVlessNodes() {
      var raw = document.getElementById('urlInput').value.trim();
      if (!raw) return showToast('請先在最上方輸入框貼入節點內容', false);

      showToast('正在解析 VLESS / VMess 節點...');
      fetch('/api/parse-argo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw })
      }).then(function(res) {
        if (!res.ok) throw new Error('解析請求失敗');
        return res.json();
      }).then(function(nodes) {
        if (!nodes || nodes.length === 0) {
          return showToast('未找到可轉換的 VLESS / VMess 節點', false);
        }
        parsedArgoNodesCache = nodes;
        var listEl = document.getElementById('vlessCheckboxList');
        var html = '';
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          html += '<label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">' +
            '<input type="checkbox" name="argoNodeIdx" value="' + n.index + '" data-port="' + n.port + '" ' + (i === 0 ? 'checked' : '') + ' onchange="updateArgoPort(this)">' +
            '<span>' + n.name + ' (' + n.server + ':' + n.port + ', ' + n.type + ')</span>' +
          '</label>';
        }
        listEl.innerHTML = html;
        document.getElementById('argoLocalPort').value = nodes[0].port || '8080';
        document.getElementById('vlessSelectorWrapper').style.display = 'block';
        showToast('成功解析 ' + nodes.length + ' 個相容節點！');
      }).catch(function(e) {
        showToast('解析失敗: ' + e.message, false);
      });
    }

    function updateArgoPort(checkbox) {
      if (checkbox.checked && checkbox.dataset.port) {
        document.getElementById('argoLocalPort').value = checkbox.dataset.port;
      }
    }

    // Argo 隧道第二步：生成命令與節點
    function generateArgo() {
      var raw = document.getElementById('urlInput').value.trim();
      var checkedBoxes = document.querySelectorAll('input[name="argoNodeIdx"]:checked');
      var indices = [];
      checkedBoxes.forEach(function(box) {
        indices.push(parseInt(box.value, 10));
      });

      if (indices.length === 0) return showToast('請至少勾選一個欲轉換的節點', false);

      var port = document.getElementById('argoLocalPort').value.trim() || '8080';
      var cleanIp = document.getElementById('argoCleanIp').value.trim();
      var token = document.getElementById('argoTunnelToken').value.trim();
      var domain = document.getElementById('argoCustomDomain').value.trim();

      if (token && !domain) {
        return showToast('使用固定隧道模式時，必須填寫自訂綁定域名', false);
      }

      showToast('正在生成 Argo 腳本與配置...');
      fetch('/api/argo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: raw,
          indices: indices,
          port: port,
          cleanIp: cleanIp,
          token: token,
          domain: domain
        })
      }).then(function(res) {
        if (!res.ok) throw new Error('生成失敗');
        return res.json();
      }).then(function(data) {
        var host = window.location.origin;
        var curlCmd = 'curl -sSL ' + host + '/argo/sh/' + data.scriptId + ' | bash';
        document.getElementById('argoCurlCmd').value = curlCmd;

        var links = (data.argoNodes || []).map(function(item) { return item.link; });
        document.getElementById('argoBase64Sub').value = links.join('\\n');

        document.getElementById('argoResults').classList.add('show');
        showToast('Argo 腳本與節點已成功生成！');
      }).catch(function(e) {
        showToast('生成失敗: ' + e.message, false);
      });
    }

    // 初始化載入已儲存的配置
    window.addEventListener('DOMContentLoaded', function() {
      loadFavs();
    });
  </script>
</body>
</html>
`;

````

## File: src/types.ts
````ts
export interface Env {
  SUB_CACHE: KVNamespace;
  PAGE_PASSWORD?: string;
}

export interface WireGuardConfig {
  privateKey: string;
  localAddress: string[];
  publicKey?: string;
  presharedKey?: string;
  mtu?: number;
  reserved?: number[];
}

export interface MasqueConfig {
  privateKey: string;
  publicKey: string;
  localIpv4?: string;
  localIpv6?: string;
  mtu?: number;
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
  // 💥 Cloudflare WARP MASQUE
  masque?: MasqueConfig;
  // ECH (Encrypted Client Hello)
  ech?: boolean;
  // 標籤特徵
  multiplier?: number;
  isIplc?: boolean;
}

export interface CachedTemplate {
  content: string;
  updatedAt: number;
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

## File: Sing-Box_Rules.JSON
````JSON
{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "http_clients": [
    {
      "tag": "default"
    }
  ],
  "dns": {
    "servers": [
      {
        "tag": "remote-dns",
        "type": "https",
        "server": "8.8.8.8",
        "detour": "🚀 節點選擇"
      },
      {
        "tag": "local-dns",
        "type": "udp",
        "server": "223.5.5.5"
      },
      {
        "tag": "system-dns",
        "type": "local"
      },
      {
        "tag": "fakeip-dns",
        "type": "fakeip",
        "inet4_range": "198.18.0.0/15"
      }
    ],
    "rules": [
      { "clash_mode": "Direct", "server": "system-dns" },
      { "clash_mode": "Global", "server": "fakeip-dns" },
      { "rule_set": "rs-ads", "action": "reject" },
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
      },
      {
        "rule_set": [
          "rs-geolocation-!cn",
          "rs-ai"
        ],
        "server": "fakeip-dns"
      }
    ],
    "final": "local-dns",
    "strategy": "ipv4_only"
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in",
      "interface_name": "tun0",
      "address": [
        "172.19.0.1/30"
      ],
      "stack": "mixed",
      "auto_route": true,
      "strict_route": true
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
    { "type": "block", "tag": "REJECT" }
  ],
  "route": {
    "default_domain_resolver": "local-dns",
    "default_http_client": "default",
    "rule_set": [
      { "type": "remote", "tag": "rs-ai", "format": "binary", "url": "https://raw.githubusercontent.com/sammy0101/myself/refs/heads/main/geosite_ai_hk_proxy.srs" },
      { "type": "remote", "tag": "rs-apple", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/apple.srs" },
      { "type": "remote", "tag": "rs-microsoft", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/microsoft.srs" },
      { "type": "remote", "tag": "rs-steam", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/steam.srs" },
      { "type": "remote", "tag": "rs-epicgames", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/epicgames.srs" },
      { "type": "remote", "tag": "rs-ea", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/ea.srs" },
      { "type": "remote", "tag": "rs-ubisoft", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/ubisoft.srs" },
      { "type": "remote", "tag": "rs-blizzard", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/blizzard.srs" },
      { "type": "remote", "tag": "rs-geolocation-!cn", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/geolocation-!cn.srs" },
      { "type": "remote", "tag": "rs-cn", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/cn.srs" },
      { "type": "remote", "tag": "ip-cn", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/cn.srs" },
      { "type": "remote", "tag": "rs-ads", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/category-ads-all.srs" },
      { "type": "remote", "tag": "rs-private", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/private.srs" },
      { "type": "remote", "tag": "ip-private", "format": "binary", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/private.srs" }
    ],
    "rules": [
      { "action": "sniff" },
      { "protocol": "dns", "action": "hijack-dns" },
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
    "cache_file": {
      "enabled": true,
      "store_fakeip": true
    },
    "clash_api": {
      "external_controller": "127.0.0.1:9090",
      "external_ui": "ui",
      "secret": "",
      "default_mode": "rule"
    }
  }
}

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

