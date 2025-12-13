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

// --- 智慧 Shadowsocks 金鑰標準化 ---
export function normalizeSSKey(key: string, method: string): string {
  if (!key) return "";
  const lowerMethod = method.toLowerCase();

  // 情況 A: 傳統加密 (aes-256-gcm, chacha20-poly1305 等)
  // 不需要做任何 Base64 清洗或切割，直接回傳原密碼
  if (!lowerMethod.includes('2022')) {
    return key;
  }

  // 情況 B: SS-2022 (BLAKE3)
  // 必須進行嚴格的 Base64 清洗和長度控制
  try { 
    key = decodeURIComponent(key); 
  } catch(e) {}

  // 1. 如果格式是 ServerKey:ClientKey，只取 ServerKey
  if (key.includes(':')) {
    key = key.split(':')[0];
  }

  // 2. Base64 符號標準化
  let clean = key.replace(/-/g, '+').replace(/_/g, '/');
  clean = clean.replace(/[^A-Za-z0-9\+\/]/g, ""); // 白名單過濾

  // 3. 根據算法決定截斷長度
  // 128-bit key = 16 bytes = 24 base64 chars
  // 256-bit key = 32 bytes = 44 base64 chars
  let limit = 44; 
  if (lowerMethod.includes('128-gcm')) {
    limit = 24;
  }

  if (clean.length > limit) {
    clean = clean.substring(0, limit);
  }

  // 4. 補齊 Padding
  const pad = clean.length % 4;
  if (pad) {
    clean += '='.repeat(4 - pad);
  }
  
  return clean;
}
