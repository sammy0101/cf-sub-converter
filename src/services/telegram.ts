// src/services/telegram.ts
import {
  Env,
  OperationLogAction,
  OperationLogEntry,
  TgConfig,
  TgConfigPublicView
} from '../types';

export const TG_CONFIG_KEY = 'tg_config';

export function maskBotToken(token: string): string {
  const t = token.trim();
  if (!t) return '';
  if (t.length <= 12) return '***';
  return `${t.slice(0, 6)}***${t.slice(-4)}`;
}

export function escapeHtmlForTg(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getActionEmoji(action: OperationLogAction): string {
  if (action === '獲取訂閱') return '🟢';
  if (action === '登入後台') return '🟠';
  if (action === '登入失敗' || action === '異常存取') return '🔴';
  return '🔵';
}

export async function getStoredTgConfig(env: Env): Promise<TgConfig> {
  if (!env.SUB_CACHE) {
    return { enabled: false, botToken: '', chatId: '' };
  }
  try {
    const raw = await env.SUB_CACHE.get(TG_CONFIG_KEY);
    if (!raw) return { enabled: false, botToken: '', chatId: '' };
    const parsed = JSON.parse(raw) as Partial<TgConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      botToken: typeof parsed.botToken === 'string' ? parsed.botToken : '',
      chatId: typeof parsed.chatId === 'string' ? parsed.chatId : ''
    };
  } catch {
    return { enabled: false, botToken: '', chatId: '' };
  }
}

export function toPublicTgView(cfg: TgConfig): TgConfigPublicView {
  return {
    enabled: cfg.enabled,
    hasToken: Boolean(cfg.botToken),
    maskedToken: maskBotToken(cfg.botToken),
    chatId: cfg.chatId
  };
}

export async function postTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanToken = botToken.trim().replace(/[^a-zA-Z0-9:_-]/g, '');
    if (!cleanToken) return { ok: false, error: 'Bot Token 格式無效' };
    const resp = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = (await resp.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!resp.ok || !data?.ok) {
      return { ok: false, error: data?.description || `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendTgNotification(env: Env, entry: OperationLogEntry): Promise<void> {
  if (!env.SUB_CACHE) return;
  try {
    const cfg = await getStoredTgConfig(env);
    if (!cfg.enabled || !cfg.botToken || !cfg.chatId) return;

    const emoji = getActionEmoji(entry.action);
    const msg = [
      `🔔 <b>SubConverter Pro 操作通知</b>`,
      ``,
      `📌 <b>操作類型：</b>${emoji} ${escapeHtmlForTg(entry.action)}`,
      `🕒 <b>時間 (UTC+8)：</b><code>${escapeHtmlForTg(entry.time)}</code>`,
      `🌐 <b>IP：</b><code>${escapeHtmlForTg(entry.ip)}</code>`,
      `📍 <b>地區：</b>${escapeHtmlForTg(entry.region)}`,
      `🏢 <b>ASN：</b>${escapeHtmlForTg(entry.asn)}`,
      `🔗 <b>URL：</b><code>${escapeHtmlForTg(entry.url)}</code>`,
      `📱 <b>UA：</b><code>${escapeHtmlForTg(entry.ua)}</code>`
    ].join('\n');

    await postTelegramMessage(cfg.botToken, cfg.chatId, msg);
  } catch {}
}
