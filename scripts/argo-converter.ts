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
  } catch {
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`獲取訂閱失敗: ${msg}`);
      return [];
    }
  }

  // 嘗試 Base64 解碼
  let decoded = content;
  try {
    const cleaned = content.replace(/[\s\r\n]+/g, '');
    decoded = Buffer.from(cleaned, 'base64').toString('utf8');
  } catch {
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
    const indices = select.split(',').map(s => parseInt(s.trim(), 10) - 1);
    selectedNodes = indices.map(idx => nodes[idx]).filter((n): n is VlessNode => Boolean(n));
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
