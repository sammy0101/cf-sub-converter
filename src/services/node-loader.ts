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

async function fetchUpstreamWithResilience(
  upstreamUrl: string,
  ctx?: ExecutionContext,
  cacheHost?: string
): Promise<UpstreamFetchOutcome> {
  const emptyResult: UpstreamFetchOutcome = {
    parsed: [],
    hasInfo: false,
    upload: 0,
    download: 0,
    total: 0,
    expire: 0
  };

  const edgeCache =
    cacheHost && typeof caches !== 'undefined'
      ? (caches as unknown as { default?: Cache }).default
      : undefined;
  const cacheKey = cacheHost
    ? new Request(`https://${cacheHost}/__upstream_cache?u=${encodeURIComponent(upstreamUrl)}`, { method: 'GET' })
    : null;

  const userAgents = ['v2rayNG/1.8.5', 'clash.meta'];

  for (let attempt = 0; attempt < userAgents.length; attempt++) {
    try {
      const separator = upstreamUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${upstreamUrl}${separator}t=${Date.now()}`;
      const resp = await fetchWithTimeout(
        fetchUrl,
        { headers: { 'User-Agent': userAgents[attempt], Accept: '*/*' } },
        9000
      );

      if (resp.ok) {
        const text = await resp.text();
        if (text && !text.trim().startsWith('<')) {
          const parsed = await parseContent(text);
          if (parsed.length > 0) {
            const userInfoStr = resp.headers.get('subscription-userinfo');
            const info = parseUserInfoHeader(userInfoStr);

            // 背景寫入 Last-Known-Good 邊緣容災快取 (24 小時有效，不消耗 KV 寫入額度)
            if (edgeCache && cacheKey) {
              const cacheHeaders: Record<string, string> = {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=86400'
              };
              if (userInfoStr) {
                cacheHeaders['subscription-userinfo'] = userInfoStr;
              }
              const putPromise = edgeCache
                .put(cacheKey, new Response(text, { headers: cacheHeaders }))
                .catch(() => undefined);
              if (ctx && typeof ctx.waitUntil === 'function') {
                ctx.waitUntil(putPromise);
              } else {
                await putPromise;
              }
            }

            return { parsed, ...info };
          }
        }
      }
    } catch {}

    if (attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  // 若實時抓取兩次皆失敗（例如單台 VPS 瞬斷或跨區超時），從邊緣快取搶救最後一次成功節點，避免截斷遺失
  if (edgeCache && cacheKey) {
    try {
      const cachedResp = await edgeCache.match(cacheKey);
      if (cachedResp) {
        const cachedText = await cachedResp.text();
        if (cachedText && !cachedText.trim().startsWith('<')) {
          const parsed = await parseContent(cachedText);
          if (parsed.length > 0) {
            const info = parseUserInfoHeader(cachedResp.headers.get('subscription-userinfo'));
            return { parsed, ...info };
          }
        }
      }
    } catch {}
  }

  return emptyResult;
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
        const res = await fetchUpstreamWithResilience(t);
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

export async function loadNodesWithTraffic(
  urlParam: string,
  ctx?: ExecutionContext,
  cacheHost?: string
): Promise<LoadNodesResult> {
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
      inputs.map(async trimmed => {
        if (trimmed.startsWith('http')) {
          return fetchUpstreamWithResilience(trimmed, ctx, cacheHost);
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
