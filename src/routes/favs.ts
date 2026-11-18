// src/routes/favs.ts
import { Env } from '../types';
import { hasPasswordConfigured, checkAuth } from '../services/auth';
import { appendOperationLog } from '../services/audit';

const FAVS_KEY = 'favorites';

async function getFavs(env: Env): Promise<Array<Record<string, string>>> {
  const data = await env.SUB_CACHE.get(FAVS_KEY);
  return data ? (JSON.parse(data) as Array<Record<string, string>>) : [];
}

async function saveFavs(env: Env, favs: Array<Record<string, string>>): Promise<void> {
  await env.SUB_CACHE.put(FAVS_KEY, JSON.stringify(favs));
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function handleFavsRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL
): Promise<Response | null> {
  if (request.method === 'POST' && url.pathname === '/save') {
    try {
      const body = (await request.json()) as {
        path?: string;
        content?: string;
        include?: string;
        exclude?: string;
        rename?: string;
        token?: string;
      };
      const cleanPath = (body.path || '').trim();
      if (!cleanPath || !body.content) return jsonError('缺少短連結名稱或節點內容', 400);

      const cleanToken = (body.token || '').trim();

      // 安全防線：若該短連結已存在且設有 Token 保護，禁止未經管理密碼授權的公開覆蓋
      const existingRaw =
        (await env.SUB_CACHE.get(cleanPath)) ||
        (cleanPath !== cleanPath.toLowerCase() ? await env.SUB_CACHE.get(cleanPath.toLowerCase()) : null);
      if (existingRaw) {
        try {
          const existingParsed = JSON.parse(existingRaw) as { token?: string };
          const existingToken = (existingParsed.token || '').trim();
          if (existingToken) {
            if (hasPasswordConfigured(env) && !checkAuth(request, env)) {
              return jsonError('該短連結已受 Token 保護，需要管理密碼授權才可修改', 403);
            }
            if (!hasPasswordConfigured(env) && cleanToken !== existingToken) {
              return jsonError('Token 不符，禁止覆蓋', 403);
            }
          }
        } catch {}
      }

      const saveData = {
        content: body.content,
        include: body.include || '',
        exclude: body.exclude || '',
        rename: body.rename || '',
        token: cleanToken
      };
      const jsonStr = JSON.stringify(saveData);

      await env.SUB_CACHE.put(cleanPath, jsonStr);
      if (cleanPath !== cleanPath.toLowerCase()) {
        await env.SUB_CACHE.put(cleanPath.toLowerCase(), jsonStr);
      }

      await appendOperationLog(request, env, '儲存短連結', ctx);

      return new Response('OK', {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(`儲存短連結失敗: ${msg}`, 500);
    }
  }

  if (url.pathname !== '/favs') {
    return null;
  }

  if (request.method === 'GET') {
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
    if (hasPasswordConfigured(env) && request.headers.get('X-Login-Attempt') === '1') {
      await appendOperationLog(request, env, '登入後台', ctx);
    }
    const favs = await getFavs(env);
    return new Response(JSON.stringify(favs), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (request.method === 'POST') {
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return jsonError('密碼錯誤或未授權', 401);
    }
    try {
      const body = (await request.json()) as Record<string, string>;
      if (!body.name || !body.url) return jsonError('缺少配置名稱或節點內容', 400);
      const cleanToken = (body.token || '').trim();
      const favs = await getFavs(env);
      favs.push({
        name: body.name,
        url: body.url,
        include: body.include || '',
        exclude: body.exclude || '',
        rename: body.rename || '',
        token: cleanToken
      });
      await saveFavs(env, favs);

      const cleanName = body.name.trim();
      const syncData = JSON.stringify({
        content: body.url,
        include: body.include || '',
        exclude: body.exclude || '',
        rename: body.rename || '',
        token: cleanToken
      });
      await env.SUB_CACHE.put(cleanName, syncData);
      if (cleanName !== cleanName.toLowerCase()) {
        await env.SUB_CACHE.put(cleanName.toLowerCase(), syncData);
      }

      await appendOperationLog(request, env, '新增配置', ctx);

      return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(`新增配置寫入 KV 失敗: ${msg}`, 500);
    }
  }

  if (request.method === 'PUT') {
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return jsonError('密碼錯誤或未授權', 401);
    }
    try {
      const body = (await request.json()) as {
        index?: number;
        name?: string;
        url?: string;
        include?: string;
        exclude?: string;
        rename?: string;
        token?: string;
      };
      if (body.index === undefined || !body.name || !body.url) {
        return jsonError('缺少配置索引、名稱或節點內容', 400);
      }
      const cleanToken = (body.token || '').trim();
      const favs = await getFavs(env);
      if (body.index < 0 || body.index >= favs.length) {
        return jsonError('欲修改的配置索引不存在，請重新整理頁面', 400);
      }

      const oldName = favs[body.index]?.name?.trim();
      const newName = body.name.trim();

      favs[body.index] = {
        name: body.name,
        url: body.url,
        include: body.include || '',
        exclude: body.exclude || '',
        rename: body.rename || '',
        token: cleanToken
      };
      await saveFavs(env, favs);

      if (oldName && oldName !== newName) {
        await env.SUB_CACHE.delete(oldName);
        if (oldName !== oldName.toLowerCase()) {
          await env.SUB_CACHE.delete(oldName.toLowerCase());
        }
      }

      const syncData = JSON.stringify({
        content: body.url,
        include: body.include || '',
        exclude: body.exclude || '',
        rename: body.rename || '',
        token: cleanToken
      });
      await env.SUB_CACHE.put(newName, syncData);
      if (newName !== newName.toLowerCase()) {
        await env.SUB_CACHE.put(newName.toLowerCase(), syncData);
      }

      await appendOperationLog(request, env, '修改配置', ctx);

      return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(`修改配置寫入 KV 失敗: ${msg}`, 500);
    }
  }

  if (request.method === 'DELETE') {
    if (!checkAuth(request, env)) {
      if ((request.headers.get('X-Password') || '').trim() !== '') {
        await appendOperationLog(request, env, '登入失敗', ctx);
      }
      return jsonError('密碼錯誤或未授權', 401);
    }
    try {
      const body = (await request.json()) as { index?: number };
      if (body.index === undefined) return jsonError('缺少索引參數', 400);
      const favs = await getFavs(env);
      if (body.index >= 0 && body.index < favs.length) {
        const removed = favs.splice(body.index, 1)[0];
        await saveFavs(env, favs);
        if (removed && removed.name) {
          const rName = removed.name.trim();
          await env.SUB_CACHE.delete(rName);
          if (rName !== rName.toLowerCase()) {
            await env.SUB_CACHE.delete(rName.toLowerCase());
          }
        }
        await appendOperationLog(request, env, '刪除配置', ctx);
      }
      return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(`刪除配置失敗: ${msg}`, 500);
    }
  }

  return null;
}
