import { ProxyNode } from "./types";

// --- 修正：支援 UTF-8 的 Base64 解碼 ---
export function safeBase64Decode(str: string): string {
  // 1. 補齊 Padding
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';

  try {
    // 2. 使用標準 atob 解碼為二進制字串
    const binaryString = atob(str);
    
    // 3. 將二進制字串轉換為 Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. 使用 TextDecoder 以 UTF-8 格式解碼 (解決中文亂碼的關鍵)
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error('Base64 decode failed:', e);
    return "";
  }
}

export function utf8ToBase64(str: string): string {
  // 編碼時同樣要確保 UTF-8 兼容性
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
          return String.fromCharCode(parseInt(p1, 16));
      }));
}

export function deduplicateNodeNames(nodes: ProxyNode[]): ProxyNode[] {
  const nameCounts = new Map<string, number>();
  
  return nodes.map(node => {
    // 強制再次解碼名稱，防止有漏網之魚的 URL 編碼
    let finalName = tryDecodeURIComponent(node.name);

    if (nameCounts.has(finalName)) {
      const count = nameCounts.get(finalName)! + 1;
      nameCounts.set(finalName, count);
      finalName = `${finalName} ${count}`;
    } else {
      nameCounts.set(finalName, 1);
    }
    
    // Update internal names
    const newNode = { ...node, name: finalName };
    if (newNode.singboxObj) newNode.singboxObj.tag = finalName;
    if (newNode.clashObj) newNode.clashObj.name = finalName;
    
    return newNode;
  });
}

// 輔助：安全的 URL 解碼 (防止 % 符號報錯)
export function tryDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

// 輔助：SS-2022 智慧金鑰調整
export function adjustSS2022Key(key: string, method: string): string {
  if (!key) return "";
  const targetBytes = method.includes('128-gcm') ? 16 : 32;

  try {
    let base64 = key.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    const binaryString = atob(base64); // Key 是 raw bytes，不需要 TextDecoder
    
    if (binaryString.length >= targetBytes) {
      const sliced = binaryString.substring(0, targetBytes);
      return btoa(sliced);
    } 
    return base64;
  } catch (e) {
    return key;
  }
}
