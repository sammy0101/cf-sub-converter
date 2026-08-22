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
