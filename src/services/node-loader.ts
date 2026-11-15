// src/services/node-loader.ts
import { ProxyNode } from '../types';
import { parseContent } from '../parsers';
import { deduplicateNodeNames, groupNodesByFlag } from '../utils';

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
  const allNodes: ProxyNode[] = [];
  const trimmed = urlParam.trim();
  if (!trimmed) return allNodes;

  if (/\[Interface\]/i.test(trimmed) && /\[Peer\]/i.test(trimmed)) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  if (/["']private_key["']/i.test(trimmed) && (trimmed.includes('{') || trimmed.includes('['))) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  if (/(^|\n)\s*proxies\s*:/i.test(trimmed)) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  const inputs = urlParam.split(/[\n\r|]+/);
  for (const input of inputs) {
    const t = input.trim();
    if (!t) continue;

    if (t.startsWith('http')) {
      try {
        const separator = t.includes('?') ? '&' : '?';
        const fetchUrl = `${t}${separator}t=${Date.now()}`;

        const resp = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'v2rayNG/1.8.5',
            Accept: '*/*'
          }
        });

        if (resp.ok) {
          const text = await resp.text();
          if (!text.trim().startsWith('<')) {
            try {
              const parsed = await parseContent(text);
              allNodes.push(...parsed);
            } catch {}
          }
        }
      } catch {}
    } else {
      try {
        const parsed = await parseContent(t);
        allNodes.push(...parsed);
      } catch {}
    }
  }
  return allNodes;
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
    const inputs = urlParam.split(/[\n\r|]+/);
    for (const input of inputs) {
      const trimmed = input.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('http')) {
        try {
          const separator = trimmed.includes('?') ? '&' : '?';
          const fetchUrl = `${trimmed}${separator}t=${Date.now()}`;
          const resp = await fetch(fetchUrl, { headers: { 'User-Agent': 'v2rayNG/1.8.5' } });

          if (resp.ok) {
            const text = await resp.text();
            const userInfo = resp.headers.get('subscription-userinfo');
            if (userInfo) {
              hasTrafficInfo = true;
              const uploadMatch = userInfo.match(/upload=(\d+)/i);
              const downloadMatch = userInfo.match(/download=(\d+)/i);
              const totalMatch = userInfo.match(/total=(\d+)/i);
              const expireMatch = userInfo.match(/expire=(\d+)/i);

              totalUpload += uploadMatch ? parseInt(uploadMatch[1], 10) : 0;
              totalDownload += downloadMatch ? parseInt(downloadMatch[1], 10) : 0;
              totalTotal += totalMatch ? parseInt(totalMatch[1], 10) : 0;

              const expireVal = expireMatch ? parseInt(expireMatch[1], 10) : 0;
              if (expireVal > 0) {
                if (minExpire === 0 || expireVal < minExpire) minExpire = expireVal;
              }
            }

            if (!text.trim().startsWith('<')) {
              try {
                const parsed = await parseContent(text);
                allNodes.push(...parsed);
              } catch {}
            }
          }
        } catch {}
      } else {
        try {
          const parsed = await parseContent(trimmed);
          allNodes.push(...parsed);
        } catch {}
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
