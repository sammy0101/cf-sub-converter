// src/routes/favs.ts
import { Env } from '../types';
import { hasPasswordConfigured, checkAuth } from '../services/auth';
import { appendOperationLog } from '../services/audit';

const FAVS_KEY = 'favorites';

const RESERVED_EXACT_KEYS = new Set([
  'favorites',
  'operation_logs',
  'tg_config',
  'sub',
  'logs',
  'favs',
  'tg-config',
  'tg-test',
  'version',
  'favicon.ico',
  'argo',
  'api'
]);

const RESERVED_PREFIXES = ['script:', 'lkg:', 'argo/', 'api/'];

function isReservedPath(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) return true;
  if (RESERVED_EXACT_KEYS.has(lower)) return true;
  if (RESERVED_PREFIXES.some(prefix => lower.startsWith(prefix))) return true;
  if (lower.includes('/') || lower.includes('?') || lower.includes('#')) return true;
  return false;
}

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
      if (isReservedPath(cleanPath)) {
        return jsonError('該短連結名稱為系統保留字或包含不合法字元 (/, ?, #)', 400);
      }

      const cleanToken = (body.token || '').trim();
      const passwordConfigured = hasPasswordConfigured(env);
      const isAdmin = checkAuth(request, env);

      // 安全防線 1：禁止未經授權透過 /save 覆蓋後台「已儲存的配置」所管理的短連結
      const favs = await getFavs(env);
      const matchedFavIdx = favs.findIndex(
        f => f.name && f.name.trim().toLowerCase() === cleanPath.toLowerCase()
      );
      if (matchedFavIdx !== -1 && passwordConfigured && !isAdmin) {
        return jsonError('該配置屬於後台管理收藏，需要管理密碼授權才可修改', 403);
      }

      // 安全防線 2：若該短連結已存在且設有 Token 保護，禁止未授權或 Token 不符的覆蓋
      const existingRaw =
        (await env.SUB_CACHE.get(cleanPath)) ||
        (cleanPath !== cleanPath.toLowerCase() ? await env.SUB_CACHE.get(cleanPath.toLowerCase()) : null);
      if (existingRaw) {
        try {
          const existingParsed = JSON.parse(existingRaw) as { token?: string };
          const existingToken = (existingParsed.token || '').trim();
          if (existingToken) {
            if (passwordConfigured && !isAdmin) {
              return jsonError('該短連結已受 Token 保護，需要管理密碼授權才可修改', 403);
            }
            if (!passwordConfigured && cleanToken !== existingToken) {
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

      // 若管理員已解鎖且該短連結存在於 favorites，同步更新 favorites 以避免前後端資料漂移
      if (matchedFavIdx !== -1 && (!passwordConfigured || isAdmin)) {
        favs[matchedFavIdx] = {
          name: favs[matchedFavIdx].name || cleanPath,
          url: body.content,
          include: body.include || '',
          exclude: body.exclude || '',
          rename: body.rename || '',
          token: cleanToken
        };
        await saveFavs(env, favs);
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
      const cleanName = body.name.trim();
      if (isReservedPath(cleanName)) {
        return jsonError('該配置名稱為系統保留字或包含不合法字元 (/, ?, #)', 400);
      }

      const cleanToken = (body.token || '').trim();
      const favs = await getFavs(env);
      if (favs.some(f => f.name && f.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        return jsonError('已存在相同名稱的配置，請改用編輯或更換名稱', 400);
      }

      favs.push({
        name: cleanName,
        url: body.url,
        include: body.include || '',
        exclude: body.exclude || '',
        rename: body.rename || '',
        token: cleanToken
      });
      await saveFavs(env, favs);

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
        origName?: string;
        name?: string;
        url?: string;
        include?: string;
        exclude?: string;
        rename?: string;
        token?: string;
      };
      if ((body.index === undefined && !body.origName) || !body.name || !body.url) {
        return jsonError('缺少配置識別資訊、名稱或節點內容', 400);
      }
      const newName = body.name.trim();
      if (isReservedPath(newName)) {
        return jsonError('該配置名稱為系統保留字或包含不合法字元 (/, ?, #)', 400);
      }

      const cleanToken = (body.token || '').trim();
      const favs = await getFavs(env);

      let targetIdx =
        typeof body.origName === 'string' && body.origName.trim() !== ''
          ? favs.findIndex(f => f.name && f.name.trim() === body.origName!.trim())
          : -1;
      if (targetIdx === -1 && body.index !== undefined) {
        targetIdx = body.index;
      }

      if (targetIdx < 0 || targetIdx >= favs.length) {
        return jsonError('欲修改的配置不存在，請重新整理頁面', 400);
      }

      const duplicateIdx = favs.findIndex(
        (f, idx) => idx !== targetIdx && f.name && f.name.trim().toLowerCase() === newName.toLowerCase()
      );
      if (duplicateIdx !== -1) {
        return jsonError('已存在相同名稱的其他配置', 400);
      }

      const oldName = favs[targetIdx]?.name?.trim();

      favs[targetIdx] = {
        name: newName,
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
      const body = (await request.json()) as { index?: number; origName?: string };
      if (body.index === undefined && !body.origName) return jsonError('缺少識別參數', 400);
      const favs = await getFavs(env);

      let targetIdx =
        typeof body.origName === 'string' && body.origName.trim() !== ''
          ? favs.findIndex(f => f.name && f.name.trim() === body.origName!.trim())
          : -1;
      if (targetIdx === -1 && body.index !== undefined) {
        targetIdx = body.index;
      }

      if (targetIdx >= 0 && targetIdx < favs.length) {
        const removed = favs.splice(targetIdx, 1)[0];
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
