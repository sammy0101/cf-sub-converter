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

// --- 新增：SS-2022 智慧金鑰調整 ---
export function adjustSS2022Key(key: string, method: string): string {
  if (!key) return "";

  // 1. 判斷目標長度 (Bytes)
  // aes-128-gcm -> 16 bytes
  // aes-256-gcm / chacha20 -> 32 bytes
  const targetBytes = method.includes('128-gcm') ? 16 : 32;

  try {
    // 2. 處理 URL-Safe 並補齊 Padding
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    // 3. 解碼為二進制字串
    const binary = atob(base64);

    // 4. 如果長度超過目標，進行截斷
    // 這能處理 ServerKey:ClientKey 的情況，也能處理單純 Key 過長的情況
    if (binary.length >= targetBytes) {
      const sliced = binary.substring(0, targetBytes);
      // 5. 重新編碼為標準 Base64
      return btoa(sliced);
    } 
    
    // 如果長度不足，直接回傳原始處理過的 Base64
    return base64;

  } catch (e) {
    // 如果解碼失敗，回傳原始值
    return key;
  }
}
