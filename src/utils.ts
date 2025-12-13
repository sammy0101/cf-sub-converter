import { ProxyNode } from "./types";

export function safeBase64Decode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  try {
    return atob(str);
  } catch {
    return "";
  }
}

export function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function deduplicateNodeNames(nodes: ProxyNode[]): ProxyNode[] {
  const nameCounts = new Map<string, number>();
  
  return nodes.map(node => {
    let finalName = node.name;
    if (nameCounts.has(node.name)) {
      const count = nameCounts.get(node.name)! + 1;
      nameCounts.set(node.name, count);
      finalName = `${node.name} ${count}`;
    } else {
      nameCounts.set(node.name, 1);
    }
    
    // Update internal names
    const newNode = { ...node, name: finalName };
    if (newNode.singboxObj) newNode.singboxObj.tag = finalName;
    if (newNode.clashObj) newNode.clashObj.name = finalName;
    
    return newNode;
  });
}

// --- 新增：SIP022 標準金鑰處理 ---
export function getExact32ByteKey(key: string): string {
  if (!key) return "";

  // 1. 如果有冒號，通常格式是 ServerKey:ClientKey
  // 我們只需要第一部分 (ServerKey)
  if (key.includes(':')) {
    key = key.split(':')[0];
  }

  try {
    // 2. 處理 URL-Safe
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/');
    
    // 3. 補齊 Padding (這一步很重要，否則 atob 會失敗)
    while (base64.length % 4) {
      base64 += '=';
    }

    // 4. 解碼為二進制字串
    const binary = atob(base64);

    // 5. 強制截取前 32 bytes (Shadowsocks-2022-256 規範)
    if (binary.length >= 32) {
      const sliced = binary.substring(0, 32);
      // 6. 重新編碼為標準 Base64
      return btoa(sliced);
    } 
    
    // 如果長度不足 32 (例如是 aes-128)，則原樣返回，或截取 16
    // 這裡假設是 256 為主，如果遇到 16 bytes 的 key 也不會報錯
    return btoa(binary);

  } catch (e) {
    // 如果解碼失敗，回傳原始值試試運氣
    return key;
  }
}
