// src/services/node-loader.ts
import { ProxyNode } from '../types';
import { parseContent } from '../parsers';
import { deduplicateNodeNames, groupNodesByFlag } from '../utils';
import { fetchWithTimeout } from '../generators/common';

export interface TrafficInfo {
  totalUpload: number;
  totalDownload: number;
  totalTotal: number;
  minExpire: number;
  hasTrafficInfo: boolean;
}

export interface LoadNodesResult {
  nodes: ProxyNode[];
  errors: string[];
  traffic: TrafficInfo;
}

interface UpstreamFetchOutcome {
  parsed: ProxyNode[];
  hasInfo: boolean;
  upload: number;
  download: number;
  total: number;
  expire: number;
  error?: string;
}

function parseUserInfoHeader(userInfo: string | null): {
  hasInfo: boolean;
  upload: number;
  download: number;
  total: number;
  expire: number;
} {
  if (!userInfo) {
    return { hasInfo: false, upload: 0, download: 0, total: 0, expire: 0 };
  }
  const uploadMatch = userInfo.match(/upload=(\d+)/i);
  const downloadMatch = userInfo.match(/download=(\d+)/i);
  const totalMatch = userInfo.match(/total=(\d+)/i);
  const expireMatch = userInfo.match(/expire=(\d+)/i);

  return {
    hasInfo: true,
    upload: uploadMatch ? parseInt(uploadMatch[1], 10) : 0,
    download: downloadMatch ? parseInt(downloadMatch[1], 10) : 0,
    total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    expire: expireMatch ? parseInt(expireMatch[1], 10) : 0
  };
}

async function fetchUpstreamDirect(upstreamUrl: string): Promise<UpstreamFetchOutcome> {
  const userAgents = ['v2rayNG/1.8.5', 'clash.meta'];
  let lastError = '無法獲取上游訂閱內容';

  for (let attempt = 0; attempt < userAgents.length; attempt++) {
    try {
      const separator = upstreamUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${upstreamUrl}${separator}t=${Date.now()}`;
      const resp = await fetchWithTimeout(
        fetchUrl,
        { headers: { 'User-Agent': userAgents[attempt], Accept: '*/*' } },
        9000
      );

      if (!resp.ok) {
        lastError = `HTTP ${resp.status}`;
      } else {
        const text = await resp.text();
        if (!text || text.trim().startsWith('<')) {
          lastError = '上游回傳空白或 HTML 頁面';
        } else {
          const parsed = await parseContent(text);
          if (parsed.length > 0) {
            const info = parseUserInfoHeader(resp.headers.get('subscription-userinfo'));
            return { parsed, ...info };
          }
          lastError = '未解析到任何有效節點';
        }
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  return {
    parsed: [],
    hasInfo: false,
    upload: 0,
    download: 0,
    total: 0,
    expire: 0,
    error: `[${upstreamUrl}] 失敗原因: ${lastError}`
  };
}

export async function loadNodes(urlParam: string): Promise<ProxyNode[]> {
  const trimmed = urlParam.trim();
  if (!trimmed) return [];

  if (/\[Interface\]/i.test(trimmed) && /\[Peer\]/i.test(trimmed)) {
    try {
      return await parseContent(trimmed);
    } catch {
      return [];
    }
  }

  if (/["']private_key["']/i.test(trimmed) && (trimmed.includes('{') || trimmed.includes('['))) {
    try {
      return await parseContent(trimmed);
    } catch {
      return [];
    }
  }

  if (/(^|\n)\s*proxies\s*:/i.test(trimmed)) {
    try {
      return await parseContent(trimmed);
    } catch {
      return [];
    }
  }

  const inputs = urlParam
    .split(/[\n\r|]+/)
    .map(i => i.trim())
    .filter(Boolean);

  const results = await Promise.all(
    inputs.map(async t => {
      if (t.startsWith('http')) {
        const res = await fetchUpstreamDirect(t);
        return res.parsed;
      }
      try {
        return await parseContent(t);
      } catch {
        return [] as ProxyNode[];
      }
    })
  );

  return results.flat();
}

export async function loadNodesWithTraffic(urlParam: string): Promise<LoadNodesResult> {
  const allNodes: ProxyNode[] = [];
  const errors: string[] = [];
  let totalUpload = 0;
  let totalDownload = 0;
  let totalTotal = 0;
  let minExpire = 0;
  let hasTrafficInfo = false;

  const trimmedParam = urlParam.trim();

  if (/\[Interface\]/i.test(trimmedParam) && /\[Peer\]/i.test(trimmedParam)) {
    try {
      const parsed = await parseContent(trimmedParam);
      allNodes.push(...parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[WireGuard 配置] 失敗原因: ${msg}`);
    }
  } else if (/["']private_key["']/i.test(trimmedParam) && (trimmedParam.includes('{') || trimmedParam.includes('['))) {
    try {
      const parsed = await parseContent(trimmedParam);
      allNodes.push(...parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[MASQUE 配置] 失敗原因: ${msg}`);
    }
  } else if (/(^|\n)\s*proxies\s*:/i.test(trimmedParam)) {
    try {
      const parsed = await parseContent(trimmedParam);
      allNodes.push(...parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[Clash YAML 配置] 失敗原因: ${msg}`);
    }
  } else {
    const inputs = urlParam
      .split(/[\n\r|]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const batchResults = await Promise.all(
      inputs.map(async (trimmed): Promise<UpstreamFetchOutcome> => {
        if (trimmed.startsWith('http')) {
          return fetchUpstreamDirect(trimmed);
        }

        try {
          const parsed = await parseContent(trimmed);
          return { parsed, hasInfo: false, upload: 0, download: 0, total: 0, expire: 0 };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { parsed: [], hasInfo: false, upload: 0, download: 0, total: 0, expire: 0, error: msg };
        }
      })
    );

    for (const item of batchResults) {
      allNodes.push(...item.parsed);
      if (item.error) {
        errors.push(item.error);
      }

      if (item.hasInfo) {
        hasTrafficInfo = true;
        totalUpload += item.upload;
        totalDownload += item.download;
        totalTotal += item.total;
        if (item.expire > 0 && (minExpire === 0 || item.expire < minExpire)) {
          minExpire = item.expire;
        }
      }
    }
  }

  return {
    nodes: allNodes,
    errors,
    traffic: { totalUpload, totalDownload, totalTotal, minExpire, hasTrafficInfo }
  };
}

function buildFilterRegex(param: string): RegExp {
  const parts = param
    .split('|')
    .map(part => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped.replace(/[xXｘＸ×]/g, '[xXｘＸ×]');
    })
    .filter(Boolean);
  return new RegExp(parts.join('|'), 'i');
}

export function filterAndRenameNodes(
  nodes: ProxyNode[],
  includeParam: string,
  excludeParam: string,
  renameParam: string
): ProxyNode[] {
  let filteredNodes = nodes;

  if (renameParam) {
    const rules = renameParam.split('|');
    for (const rule of rules) {
      const trimmedRule = rule.trim();
      if (!trimmedRule) continue;

      if (trimmedRule.startsWith('DEL-')) {
        const search = trimmedRule.substring(4);
        if (search) {
          filteredNodes.forEach(node => {
            if (node.name) node.name = node.name.split(search).join('');
          });
        }
      } else if (trimmedRule.includes('-')) {
        const idx = trimmedRule.indexOf('-');
        const search = trimmedRule.substring(0, idx).trim();
        const replace = trimmedRule.substring(idx + 1).trim();

        if (search && replace !== undefined) {
          if (search.toUpperCase() === 'ALL') {
            filteredNodes.forEach(node => {
              node.name = replace;
            });
          } else {
            filteredNodes.forEach(node => {
              if (node.name) node.name = node.name.split(search).join(replace);
            });
          }
        }
      }
    }
  }

  if (includeParam) {
    const includeRegex = buildFilterRegex(includeParam);
    filteredNodes = filteredNodes.filter(node => includeRegex.test(node.name));
  }

  if (excludeParam) {
    const excludeRegex = buildFilterRegex(excludeParam);
    filteredNodes = filteredNodes.filter(node => !excludeRegex.test(node.name));
  }

  const sortedNodes = groupNodesByFlag(filteredNodes);
  return deduplicateNodeNames(sortedNodes);
}
