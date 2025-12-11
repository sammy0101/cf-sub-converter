import { ProxyNode } from "./types";
import { safeBase64Decode } from "./utils";

// --- 輔助：完美修復 SS-2022 Key ---
function fixSS2022Key(key: string): string {
  if (!key) return "";
  
  // 1. 先解碼 URL 編碼 (處理 %3A)
  try { key = decodeURIComponent(key); } catch(e) {}

  // 2. 切割冒號 (取第一部分)
  if (key.includes(':')) {
    key = key.split(':')[0];
  }

  // 3. 替換 URL-Safe
  let clean = key.replace(/-/g, '+').replace(/_/g, '/');
  
  // 4. 白名單過濾 (只留標準 Base64)
  clean = clean.replace(/[^A-Za-z0-9\+\/]/g, "");
  
  // 5. 強制長度截斷
  // SS-2022 的 key 絕對不會超過 44 個 Base64 字元
  if (clean.length > 44) {
    clean = clean.substring(0, 44);
  }

  // 6. 補齊 Padding
  const pad = clean.length % 4;
  if (pad) {
    clean += '='.repeat(4 - pad);
  }
  
  return clean;
}

// --- 解析 Shadowsocks ---
function parseShadowsocks(urlStr: string): ProxyNode | null {
  try {
    let raw = urlStr.trim();
    if (!raw.startsWith('ss://')) return null;
    raw = raw.substring(5);

    // 提取名稱
    let name = 'Shadowsocks';
    const hashIndex = raw.indexOf('#');
    if (hashIndex !== -1) {
      name = decodeURIComponent(raw.substring(hashIndex + 1));
      raw = raw.substring(0, hashIndex);
    }

    let method = '';
    let password = '';
    let server = '';
    let portStr = '';

    // 解析邏輯
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
        if (decoded && decoded.includes(':') && !decoded.includes('@')) {
          const up = decoded.split(':');
          method = up[0];
          // 先保留完整密碼字串，交給後面處理
          password = up.slice(1).join(':');
        } else {
          throw new Error('Not Base64');
        }
      } catch (e) {
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

    // --- 應用修復 ---
    // 針對 2022 協議進行修復
    if (method.toLowerCase().includes('2022')) {
        const originalPwd = password;
        password = fixSS2022Key(password);
        
        // 驗證標記：如果密碼有變短，代表修復生效，在名字後面加標記
        // 這可以讓你知道你的 Worker 是否已經更新
        if (password.length < originalPwd.length) {
            // name += " [Fix]"; 
            // 註解掉上面那行，確認生效後可以拿掉。
            // 目前先不加，以免影響你的使用體驗，但邏輯已經確保會截斷。
        }
    }
    // ------------------

    const node: ProxyNode = { type: 'shadowsocks', name, server, port, cipher: method, password, udp: true };

    node.singboxObj = {
      tag: name, type: 'shadowsocks', server: node.server, server_port: node.port, method: node.cipher, password: node.password, plugin: "", plugin_opts: ""
    };

    node.clashObj = {
      name: name, type: 'ss', server: node.server, port: node.port, cipher: node.cipher, password: node.password, udp: true
    };

    return node;
  } catch (e) { return null; }
}

// ... (以下 Vless, Hysteria2, Vmess 的代碼保持不變，為了節省篇幅省略) ...
// 請保留檔案原本下方的 parseVless, parseHysteria2, parseVmess, parseContent 函數
// 只要替換最上面的 parseShadowsocks 和 fixSS2022Key 即可
// 或者你可以把剛剛給你的完整 parser.ts 再貼一次，只改了 fixSS2022Key
