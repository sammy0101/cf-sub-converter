// src/parsers/common.ts
import { tryDecodeURIComponent } from '../utils';

export interface ParsedUri {
  protocol: string;
  username: string;
  password?: string;
  hostname: string;
  port: number;
  params: URLSearchParams;
  hash: string;
}

export interface EchInfo {
  enabled: boolean;
  domain?: string;
  doh?: string;
}

export function parseProxyUri(urlStr: string, defaultPort = 443): ParsedUri | null {
  try {
    const trimmed = urlStr.trim();
    const match = trimmed.match(
      /^([a-zA-Z0-9_-]+):\/\/(?:([^:@/?#]+)(?::([^@/?#]*))?@)?(\[[a-fA-F0-9:]+\]|[^:/?#]+)(?::([0-9]+))?\/?(?:\?([^#]*))?(?:#(.*))?$/
    );
    if (!match) return null;

    const protocol = match[1].toLowerCase();
    const username = match[2] ? tryDecodeURIComponent(match[2]) : '';
    const password = match[3] ? tryDecodeURIComponent(match[3]) : undefined;
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

export function parsePluginParams(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  str.split(';').forEach(p => {
    const eqIdx = p.indexOf('=');
    if (eqIdx !== -1) {
      const k = p.slice(0, eqIdx).trim();
      const v = p.slice(eqIdx + 1).trim();
      if (k && v) params[k] = v;
    }
  });
  return params;
}

export function isIpAddress(str: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) || str.includes(':');
}

// 嚴格依據輸入解析 ECH，不腦補任何預設網域
export function parseEchInfo(val: string | null | undefined): EchInfo {
  if (!val) return { enabled: false };
  const raw = val.trim();
  const clean = raw.toLowerCase();
  if (['0', 'false', 'off', 'none', 'no', ''].includes(clean)) {
    return { enabled: false };
  }

  // 1. 純開關 (例如: ech=1 或 ech=true)，網域與 DoH 均為 undefined
  if (clean === '1' || clean === 'true') {
    return { enabled: true };
  }

  // 2. 格式: domain+doh (例如: custom-domain.com+https://1.1.1.1/dns-query)
  if (raw.includes('+')) {
    const parts = raw.split('+');
    const domainPart = parts[0]?.trim();
    const dohPart = parts.slice(1).join('+').trim();
    const validDoh = /^https?:\/\//i.test(dohPart) ? dohPart : undefined;
    const validDomain = domainPart && !isIpAddress(domainPart) ? domainPart : undefined;
    return {
      enabled: true,
      domain: validDomain,
      doh: validDoh
    };
  }

  // 3. 只有以 https:// 或 http:// 開頭，才認定為 DoH
  if (/^https?:\/\//i.test(raw)) {
    return {
      enabled: true,
      doh: raw
    };
  }

  // 4. 其餘普通字串且非 IP，視為使用者明確輸入的自訂 ECH 查詢網域名稱
  if (!isIpAddress(raw)) {
    return {
      enabled: true,
      domain: raw
    };
  }

  return { enabled: true };
}
