// src/parsers/index.ts
import { ProxyNode } from '../types';
import { parseMasqueConfigs, parseMasqueUri } from './masque';
import { parseWireGuardConf, parseWireGuard, parseShadowrocketWireGuard } from './wireguard';
import { parseClashYaml } from './clash-yaml';
import {
  parseShadowsocks,
  parseVless,
  parseHysteria2,
  parseTuic,
  parseAnytls,
  parseVmess,
  parseTrojan
} from './uri';

export { parseMasqueConfigs, parseClashYaml };

export async function parseContent(content: string): Promise<ProxyNode[]> {
  let plainText = content.replace(/^\uFEFF/, '').trim();

  if (/\[Interface\]/i.test(plainText) && /\[Peer\]/i.test(plainText)) {
    const wgNodes = parseWireGuardConf(plainText);
    if (wgNodes.length > 0) return wgNodes;
  }

  if (/["']private_key["']/i.test(plainText) && (plainText.includes('{') || plainText.includes('['))) {
    const masqueNodes = parseMasqueConfigs(plainText);
    if (masqueNodes.length > 0) return masqueNodes;
  }

  if (/(^|\n)\s*proxies\s*:/i.test(plainText)) {
    const clashNodes = parseClashYaml(plainText);
    if (clashNodes.length > 0) return clashNodes;
  }

  const protocols = [
    'ss://', 'vmess://', 'vless://', 'trojan://', 'tuic://',
    'hysteria2://', 'hy2://', 'anytls://', 'wireguard://', 'warp://', 'masque://'
  ];

  const nonCommentLines = plainText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  const isPlainText = nonCommentLines.some(
    l => protocols.some(p => l.startsWith(p)) || (l.includes('=') && l.includes('wireguard'))
  );

  if (!isPlainText) {
    try {
      let b64 = plainText.replace(/[\s\r\n]+/g, '').replace(/-/g, '+').replace(/_/g, '/');
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

      if (/["']private_key["']/i.test(decoded) && (decoded.includes('{') || decoded.includes('['))) {
        const masqueNodes = parseMasqueConfigs(decoded);
        if (masqueNodes.length > 0) return masqueNodes;
      }

      if (/(^|\n)\s*proxies\s*:/i.test(decoded)) {
        const clashNodes = parseClashYaml(decoded);
        if (clashNodes.length > 0) return clashNodes;
      }

      if (decoded && (protocols.some(p => decoded.includes(p)) || decoded.includes('wireguard'))) {
        plainText = decoded.replace(/^\uFEFF/, '').trim();
      } else {
        throw new Error('Base64 解碼成功，但內容並非有效的代理節點。');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Base64 暴力解碼失敗: ${msg}`);
    }
  }

  const lines = plainText.split(/\r?\n/);
  const nodes: ProxyNode[] = [];

  // 逐行容錯隔離：單一異常節點絕不影響同一份訂閱中其餘正常節點之解析
  for (const line of lines) {
    const l = line.replace(
      /^[\s\uFEFF\xA0\u200B\u200C\u200D\u200E\u200F]+|[\s\uFEFF\xA0\u200B\u200C\u200D\u200E\u200F]+$/g,
      ''
    );
    if (!l || l.startsWith('#') || l.startsWith('//')) continue;

    try {
      if (l.startsWith('ss://')) {
        nodes.push(parseShadowsocks(l));
      } else if (l.startsWith('vless://')) {
        nodes.push(parseVless(l));
      } else if (l.startsWith('hysteria2://') || l.startsWith('hy2://')) {
        nodes.push(parseHysteria2(l));
      } else if (l.startsWith('vmess://')) {
        nodes.push(parseVmess(l));
      } else if (l.startsWith('tuic://')) {
        nodes.push(parseTuic(l));
      } else if (l.startsWith('anytls://')) {
        nodes.push(parseAnytls(l));
      } else if (l.startsWith('trojan://')) {
        nodes.push(parseTrojan(l));
      } else if (l.startsWith('wireguard://') || l.startsWith('warp://')) {
        nodes.push(parseWireGuard(l));
      } else if (l.startsWith('masque://')) {
        nodes.push(parseMasqueUri(l));
      } else if (l.includes('=') && l.includes('wireguard')) {
        nodes.push(parseShadowrocketWireGuard(l));
      }
    } catch {}
  }

  if (nodes.length === 0) {
    throw new Error('資料獲取成功，但未能成功配對到任何支援的節點格式。');
  }

  return nodes;
}
