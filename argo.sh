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
