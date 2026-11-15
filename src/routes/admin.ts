// src/routes/admin.ts
import { Env, OperationLogEntry, TgConfig } from '../types';
import { hasPasswordConfigured, checkAuth } from '../services/auth';
import { LOGS_KEY, getClientMeta, formatUtc8Time, appendOperationLog } from '../services/audit';
import {
  TG_CONFIG_KEY,
  getStoredTgConfig,
  toPublicTgView,
  postTelegramMessage,
  escapeHtmlForTg
} from '../services/telegram';

export async function handleAdminRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL
): Promise<Response | null> {
  // --- Telegram 通知設定 API ---
  if (url.pathname === '/tg-config') {
    if (!hasPasswordConfigured(env)) {
      return new Response(JSON.stringify({ error: '未設定管理密碼 (PAGE_PASSWORD)，禁止存取通知設定', unconfigured: true }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return new Response(JSON.stringify({ error: '密碼錯誤或未授權', locked: true }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (request.method === 'GET') {
      const cfg = await getStoredTgConfig(env);
      return new Response(JSON.stringify(toPublicTgView(cfg)), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (request.method === 'POST') {
      try {
        const body = (await request.json()) as { enabled?: boolean; botToken?: string; chatId?: string };
        const existing = await getStoredTgConfig(env);

        const rawToken = typeof body.botToken === 'string' ? body.botToken.trim() : '';
        const nextToken = rawToken && !rawToken.includes('***') ? rawToken : existing.botToken;
        const nextChatId = typeof body.chatId === 'string' ? body.chatId.trim() : existing.chatId;
        const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : existing.enabled;

        if (nextEnabled && (!nextToken || !nextChatId)) {
          return new Response(JSON.stringify({ error: '請先填寫有效的 Bot Token 與 Chat ID 後再啟用通知' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const updated: TgConfig = {
          enabled: nextEnabled,
          botToken: nextToken,
          chatId: nextChatId
        };

        if (env.SUB_CACHE) {
          await env.SUB_CACHE.put(TG_CONFIG_KEY, JSON.stringify(updated));
        }

        return new Response(JSON.stringify(toPublicTgView(updated)), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch {
        return new Response(JSON.stringify({ error: '儲存 Telegram 設定失敗' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (request.method === 'DELETE') {
      if (env.SUB_CACHE) {
        await env.SUB_CACHE.delete(TG_CONFIG_KEY);
      }
      return new Response(JSON.stringify(toPublicTgView({ enabled: false, botToken: '', chatId: '' })), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // --- Telegram 測試訊息發送 API ---
  if (request.method === 'POST' && url.pathname === '/tg-test') {
    if (!hasPasswordConfigured(env)) {
      return new Response(JSON.stringify({ ok: false, error: '未設定管理密碼 (PAGE_PASSWORD)' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return new Response(JSON.stringify({ ok: false, error: '密碼錯誤或未授權' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const body = (await request.json()) as { botToken?: string; chatId?: string };
      const existing = await getStoredTgConfig(env);
      const rawToken = typeof body.botToken === 'string' ? body.botToken.trim() : '';
      const tokenToUse = rawToken && !rawToken.includes('***') ? rawToken : existing.botToken;
      const chatIdToUse =
        typeof body.chatId === 'string' && body.chatId.trim() ? body.chatId.trim() : existing.chatId;

      if (!tokenToUse || !chatIdToUse) {
        return new Response(JSON.stringify({ ok: false, error: '請先輸入 Bot Token 與 Chat ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const meta = getClientMeta(request);
      const testMsg = [
        `✅ <b>SubConverter Pro Telegram 測試通知</b>`,
        ``,
        `🎉 恭喜！您的機器人連線正常，已準備好接收即時操作通知。`,
        `🕒 <b>時間 (UTC+8)：</b><code>${escapeHtmlForTg(formatUtc8Time())}</code>`,
        `🌐 <b>測試來源 IP：</b><code>${escapeHtmlForTg(meta.ip)}</code>`,
        `📍 <b>地區：</b>${escapeHtmlForTg(meta.region)}`
      ].join('\n');

      const sendRes = await postTelegramMessage(tokenToUse, chatIdToUse, testMsg);
      if (!sendRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: sendRes.error || 'Telegram API 回傳失敗' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // --- 操作日誌 API ---
  if (request.method === 'GET' && url.pathname === '/logs') {
    if (!hasPasswordConfigured(env)) {
      return new Response(JSON.stringify({ error: '未設定管理密碼 (PAGE_PASSWORD)，日誌 API 預設禁止公開讀取', unconfigured: true }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return new Response(JSON.stringify({ error: '密碼錯誤或未授權', locked: true }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const raw = env.SUB_CACHE ? await env.SUB_CACHE.get(LOGS_KEY) : null;
    const logs: OperationLogEntry[] = raw ? (JSON.parse(raw) as OperationLogEntry[]) : [];
    return new Response(JSON.stringify(logs), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (request.method === 'DELETE' && url.pathname === '/logs') {
    if (!hasPasswordConfigured(env)) {
      return new Response(JSON.stringify({ error: '未設定 PAGE_PASSWORD，禁止操作', unconfigured: true }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return new Response(JSON.stringify({ error: '未授權' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    if (env.SUB_CACHE) {
      await env.SUB_CACHE.put(LOGS_KEY, '[]');
    }
    return new Response('OK', {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  return null;
}
