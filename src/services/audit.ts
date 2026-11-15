// src/services/audit.ts
import { Env, OperationLogAction, OperationLogEntry } from '../types';
import { sendTgNotification } from './telegram';

export const LOGS_KEY = 'operation_logs';
export const MAX_LOGS = 200;

interface CfProperties {
  country?: string;
  city?: string;
  asn?: number;
  asOrganization?: string;
}

export function formatUtc8Time(date = new Date()): string {
  const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = utc8.getUTCFullYear();
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc8.getUTCDate()).padStart(2, '0');
  const hh = String(utc8.getUTCHours()).padStart(2, '0');
  const mm = String(utc8.getUTCMinutes()).padStart(2, '0');
  const ss = String(utc8.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function sanitizeLogUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const urlVal = u.searchParams.get('url');
    if (urlVal && urlVal.length > 48) {
      u.searchParams.set('url', urlVal.slice(0, 48) + '...');
    }
    const result = u.toString();
    return result.length > 160 ? result.slice(0, 157) + '...' : result;
  } catch {
    return rawUrl.length > 160 ? rawUrl.slice(0, 157) + '...' : rawUrl;
  }
}

export function getClientMeta(request: Request): { ip: string; region: string; asn: string; ua: string } {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'Unknown';
  const cf = (request as unknown as { cf?: CfProperties }).cf;
  const country = cf?.country ? String(cf.country) : '';
  const city = cf?.city ? String(cf.city) : '';
  const region = [country, city].filter(Boolean).join(' ') || 'Unknown';
  const asnNum = cf?.asn ? `AS${cf.asn}` : '';
  const asOrg = cf?.asOrganization ? String(cf.asOrganization) : '';
  const asn = [asnNum, asOrg].filter(Boolean).join(' ') || 'Unknown';
  const rawUa = request.headers.get('User-Agent') || 'Unknown';
  const ua = rawUa.length > 150 ? rawUa.slice(0, 147) + '...' : rawUa;
  return { ip, region, asn, ua };
}

export async function appendOperationLog(
  request: Request,
  env: Env,
  action: OperationLogAction,
  ctxForTg?: ExecutionContext
): Promise<void> {
  if (!env.SUB_CACHE) return;
  try {
    const meta = getClientMeta(request);
    const entry: OperationLogEntry = {
      time: formatUtc8Time(),
      ip: meta.ip,
      region: meta.region,
      asn: meta.asn,
      action,
      url: sanitizeLogUrl(request.url),
      ua: meta.ua
    };
    const raw = await env.SUB_CACHE.get(LOGS_KEY);
    let logs: OperationLogEntry[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        logs = parsed as OperationLogEntry[];
      }
    }
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS;
    }
    await env.SUB_CACHE.put(LOGS_KEY, JSON.stringify(logs));

    if (ctxForTg && typeof ctxForTg.waitUntil === 'function') {
      ctxForTg.waitUntil(sendTgNotification(env, entry));
    } else {
      await sendTgNotification(env, entry);
    }
  } catch {}
}

export function scheduleLog(
  request: Request,
  env: Env,
  ctx: ExecutionContext | undefined,
  action: OperationLogAction
): void {
  const task = appendOperationLog(request, env, action);
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  } else {
    void task;
  }
}
