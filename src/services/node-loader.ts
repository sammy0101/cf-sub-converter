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
        try {
          const separator = t.includes('?') ? '&' : '?';
          const fetchUrl = `${t}${separator}t=${Date.now()}`;
          const resp = await fetchWithTimeout(
            fetchUrl,
            { headers: { 'User-Agent': 'v2rayNG/1.8.5', Accept: '*/*' } },
            6000
          );
          if (resp.ok) {
            const text = await resp.text();
            if (!text.trim().startsWith('<')) {
              return await parseContent(text);
            }
          }
        } catch {}
        return [] as ProxyNode[];
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

    // 並行抓取所有上游訂閱，並為每筆 HTTP 請求設定 6 秒超時保護
    const batchResults = await Promise.all(
      inputs.map(async trimmed => {
        if (trimmed.startsWith('http')) {
          try {
            const separator = trimmed.includes('?') ? '&' : '?';
            const fetchUrl = `${trimmed}${separator}t=${Date.now()}`;
            const resp = await fetchWithTimeout(
              fetchUrl,
              { headers: { 'User-Agent': 'v2rayNG/1.8.5' } },
              6000
            );

            if (resp.ok) {
              const text = await resp.text();
              const userInfo = resp.headers.get('subscription-userinfo');
              let upload = 0;
              let download = 0;
              let total = 0;
              let expire = 0;
              let hasInfo = false;

              if (userInfo) {
                hasInfo = true;
                const uploadMatch = userInfo.match(/upload=(\d+)/i);
                const downloadMatch = userInfo.match(/download=(\d+)/i);
                const totalMatch = userInfo.match(/total=(\d+)/i);
                const expireMatch = userInfo.match(/expire=(\d+)/i);

                upload = uploadMatch ? parseInt(uploadMatch[1], 10) : 0;
                download = downloadMatch ? parseInt(downloadMatch[1], 10) : 0;
                total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
                expire = expireMatch ? parseInt(expireMatch[1], 10) : 0;
              }

              let parsed: ProxyNode[] = [];
              if (!text.trim().startsWith('<')) {
                try {
                  parsed = await parseContent(text);
                } catch {}
              }

              return { parsed, hasInfo, upload, download, total, expire };
            }
          } catch {}
          return { parsed: [] as ProxyNode[], hasInfo: false, upload: 0, download: 0, total: 0, expire: 0 };
        }

        try {
          const parsed = await parseContent(trimmed);
          return { parsed, hasInfo: false, upload: 0, download: 0, total: 0, expire: 0 };
        } catch {
          return { parsed: [] as ProxyNode[], hasInfo: false, upload: 0, download: 0, total: 0, expire: 0 };
        }
      })
    );

    for (const item of batchResults) {
      allNodes.push(...item.parsed);
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
