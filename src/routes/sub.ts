// src/routes/sub.ts
import { Env } from '../types';
import { HTML_PAGE } from '../ui';
import {
  toSingBoxWithTemplate,
  toClashWithTemplate,
  toBase64,
  toSurge,
  toQuantumultX,
  toLoon,
  toHonk
} from '../generators';
import { loadNodesWithTraffic, filterAndRenameNodes } from '../services/node-loader';
import { scheduleLog } from '../services/audit';
import { timingSafeEqualStr } from '../utils';

function buildExactBase64SubUrl(url: URL, storedToken: string): string {
  const u = new URL(url.toString());
  const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (!isLocal) {
    u.protocol = 'https:';
  }
  u.searchParams.delete('force');
  u.searchParams.delete('nocache');
  if (storedToken && !u.searchParams.has('token')) {
    u.searchParams.set('token', storedToken);
  }
  u.searchParams.set('target', 'base64');
  return u.toString();
}

export async function handleSubRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL,
  version: string
): Promise<Response> {
  let urlParam = url.searchParams.get('url') || '';
  let includeParam = url.searchParams.get('include') || '';
  let excludeParam = url.searchParams.get('exclude') || '';
  let renameParam = url.searchParams.get('rename') || '';
  const nameParam = url.searchParams.get('name') || '';
  const forceRefresh = url.searchParams.has('force') || url.searchParams.has('nocache');

  const rawPath = url.pathname.replace(/^\/+/, '');
  const path = decodeURIComponent(rawPath).trim();
  let detectedProfileName = nameParam;
  let storedToken = '';
  let foundInKv = false;

  if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
    if (!detectedProfileName) {
      detectedProfileName = path;
    }

    const candidateKeys = Array.from(new Set([path, path.toLowerCase(), path.toUpperCase()]));
    const kvResults = await Promise.all(candidateKeys.map(k => env.SUB_CACHE.get(k)));
    const stored = kvResults.find(v => Boolean(v)) || null;

    if (stored) {
      foundInKv = true;
      try {
        const parsed = JSON.parse(stored) as {
          content?: string;
          include?: string;
          exclude?: string;
          rename?: string;
          token?: string;
        };
        if (parsed && parsed.content) {
          urlParam = parsed.content;
          if (!includeParam) includeParam = parsed.include || '';
          if (!excludeParam) excludeParam = parsed.exclude || '';
          if (!renameParam) renameParam = parsed.rename || '';
          storedToken = (parsed.token || '').trim();
        }
      } catch {
        urlParam = stored;
      }
    }

    if (!urlParam || urlParam.trim() === '') {
      try {
        const favsData = await env.SUB_CACHE.get('favorites');
        if (favsData) {
          const favsList = JSON.parse(favsData) as Array<Record<string, string>>;
          const matched = favsList.find(f => f.name && f.name.trim().toLowerCase() === path.toLowerCase());
          if (matched && matched.url) {
            foundInKv = true;
            urlParam = matched.url;
            if (!includeParam) includeParam = matched.include || '';
            if (!excludeParam) excludeParam = matched.exclude || '';
            if (!renameParam) renameParam = matched.rename || '';
            storedToken = (matched.token || '').trim();
            detectedProfileName = matched.name;
          }
        }
      } catch {}
    }

    // 防掃描校驗：若配置設有 Token，無 Token 或錯誤 Token 統一回傳 404 Not Found（防列舉），並記為異常存取
    if (foundInKv && storedToken) {
      const providedToken = (url.searchParams.get('token') || '').trim();
      if (!providedToken || !timingSafeEqualStr(providedToken, storedToken)) {
        scheduleLog(request, env, ctx, '異常存取');
        return new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
  }

  if (!urlParam || urlParam.trim() === '') {
    if (path === 'sub') {
      return new Response('Error: Missing parameter "url"', { status: 400 });
    }
    if (path === 'favicon.ico') {
      return new Response(null, { status: 204 });
    }
    if (path !== '') {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    const dynamicHtml = HTML_PAGE.replace('id="appVersionBadge">PRO</span>', `id="appVersionBadge">v${version}</span>`);
    return new Response(dynamicHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  let target = url.searchParams.get('target');

  if (!target) {
    const ua = (request.headers.get('User-Agent') || '').toLowerCase();
    if (ua.includes('clash') || ua.includes('mihomo') || ua.includes('stash') || ua.includes('surfboard')) {
      target = 'clash';
    } else if (ua.includes('sing-box') || ua.includes('singbox') || ua.includes('hiddify')) {
      target = 'singbox';
    } else if (ua.includes('surge')) {
      target = 'surge';
    } else if (ua.includes('quantumult')) {
      target = 'quanx';
    } else if (ua.includes('loon')) {
      target = 'loon';
    } else if (ua.includes('honk') || ua.includes('dae')) {
      target = 'honk';
    } else if (ua.includes('v2ray') || ua.includes('shadowrocket')) {
      target = 'base64';
    }
  }

  const finalProfileName = detectedProfileName || 'subscription';

  // Honk / DAE 快速通道：僅需產出引用 Base64 訂閱的 config.dae，無需浪費時間重複抓取與解析所有上游節點
  if (target === 'honk' || target === 'dae') {
    try {
      const base64SubUrl = buildExactBase64SubUrl(url, storedToken);
      const result = await toHonk([], base64SubUrl, finalProfileName, forceRefresh);
      scheduleLog(request, env, ctx, '獲取訂閱');

      const filenameAscii = `${finalProfileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.dae`;
      const filenameUtf8 = encodeURIComponent(`${finalProfileName}.dae`);

      return new Response(result, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers':
            'Content-Disposition, Profile-Title, Subscription-Title, Profile-Update-Interval, subscription-userinfo',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Disposition': `inline; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`,
          'Profile-Title': finalProfileName,
          'Subscription-Title': finalProfileName,
          'profile-update-interval': '3600'
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(`轉換配置失敗: ${msg}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  const { nodes: allNodes, errors, traffic } = await loadNodesWithTraffic(urlParam);

  if (allNodes.length === 0) {
    const errorMsg = errors.length > 0 ? errors.join('\n') : '未解析到任何有效節點。';
    return new Response(errorMsg, { status: 400 });
  }

  const uniqueNodes = filterAndRenameNodes(allNodes, includeParam, excludeParam, renameParam);

  if (uniqueNodes.length === 0) {
    return new Response('所有節點均已被過濾條件排除，無可用節點。', { status: 400 });
  }

  if (!target) {
    scheduleLog(request, env, ctx, '獲取訂閱');

    const host = `https://${url.host}`;
    let basePreview = `${host}/?url=${encodeURIComponent(urlParam)}`;
    if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
      basePreview = `${host}/${encodeURIComponent(path)}`;
      if (storedToken) basePreview += `?token=${encodeURIComponent(storedToken)}`;
    }
    const sep = basePreview.includes('?') ? '&' : '?';

    let filterQuery = '';
    if (includeParam && !foundInKv) filterQuery += `&include=${encodeURIComponent(includeParam)}`;
    if (excludeParam && !foundInKv) filterQuery += `&exclude=${encodeURIComponent(excludeParam)}`;
    if (renameParam && !foundInKv) filterQuery += `&rename=${encodeURIComponent(renameParam)}`;
    if (detectedProfileName && !foundInKv) filterQuery += `&name=${encodeURIComponent(detectedProfileName)}`;

    const htmlInfo = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>轉換完成</title><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: radial-gradient(ellipse at 50% 0%, #0d1633 0%, #040711 75%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow-x: hidden; }
body::before, body::after { content: ""; position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: -1; }
body::before { width: 420px; height: 420px; top: -100px; left: -80px; background: rgba(59, 130, 246, 0.34); }
body::after { width: 440px; height: 440px; bottom: -120px; right: -80px; background: rgba(6, 182, 212, 0.25); }
.glass-panel { background: linear-gradient(145deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 100%); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); border: 1px solid rgba(255,255,255,0.16); border-radius: 24px; padding: 36px 28px; max-width: 680px; width: 100%; text-align: center; box-shadow: 0 24px 56px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22); }
h1 { font-size: 1.5rem; margin-bottom: 22px; font-weight: 700; }
.links { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
a { display: inline-flex; align-items: center; justify-content: center; padding: 12px 20px; background: linear-gradient(135deg, rgba(59,130,246,0.88), rgba(37,99,235,0.85)); color: #fff; text-decoration: none; border-radius: 14px; font-weight: 600; font-size: 0.92rem; border: 1px solid rgba(255,255,255,0.24); box-shadow: 0 8px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.32); transition: transform 0.2s, box-shadow 0.2s; }
a:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(59,130,246,0.48), inset 0 1px 0 rgba(255,255,255,0.4); }
@media (prefers-reduced-motion: reduce) { a { transition: none; } }
</style></head>
<body>
  <div class="glass-panel">
    <h1>⚡ 成功轉換 ${uniqueNodes.length} 個節點</h1>
    <div class="links">
      <a href="${basePreview}${sep}target=clash${filterQuery}">Clash Meta (YAML)</a>
      <a href="${basePreview}${sep}target=singbox${filterQuery}">Sing-Box (JSON)</a>
      <a href="${basePreview}${sep}target=surge${filterQuery}">Surge 5</a>
      <a href="${basePreview}${sep}target=quanx${filterQuery}">Quantumult X</a>
      <a href="${basePreview}${sep}target=loon${filterQuery}">Loon</a>
      <a href="${basePreview}${sep}target=base64${filterQuery}">Base64</a>
      <a href="${basePreview}${sep}target=honk${filterQuery}">Honk / dae (config.dae)</a>
    </div>
  </div>
</body></html>`;
    return new Response(htmlInfo, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  let result = '';
  let contentType = 'text/plain';
  let fileExt = '.txt';

  try {
    if (target === 'clash') {
      result = await toClashWithTemplate(uniqueNodes, env, forceRefresh);
      contentType = 'text/yaml';
      fileExt = '.yaml';
    } else if (target === 'surge') {
      result = toSurge(uniqueNodes);
      contentType = 'text/plain';
      fileExt = '.conf';
    } else if (target === 'quanx' || target === 'qx') {
      result = toQuantumultX(uniqueNodes);
      contentType = 'text/plain';
      fileExt = '.txt';
    } else if (target === 'loon') {
      result = toLoon(uniqueNodes);
      contentType = 'text/plain';
      fileExt = '.conf';
    } else if (target === 'base64') {
      result = toBase64(uniqueNodes);
      contentType = 'text/plain';
      fileExt = '.txt';
    } else {
      result = await toSingBoxWithTemplate(uniqueNodes, env, forceRefresh);
      contentType = 'application/json';
      fileExt = '.json';
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`轉換配置失敗: ${msg}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  }

  scheduleLog(request, env, ctx, '獲取訂閱');

  const filenameAscii = `${finalProfileName.replace(/[^a-zA-Z0-9_-]/g, '_')}${fileExt}`;
  const filenameUtf8 = encodeURIComponent(`${finalProfileName}${fileExt}`);

  const responseHeaders: Record<string, string> = {
    'Content-Type': `${contentType}; charset=utf-8`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers':
      'Content-Disposition, Profile-Title, Subscription-Title, Profile-Update-Interval, subscription-userinfo',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Disposition': `inline; filename="${filenameAscii}"; filename*=UTF-8''${filenameUtf8}`,
    'Profile-Title': finalProfileName,
    'Subscription-Title': finalProfileName,
    'profile-update-interval': '3600'
  };

  if (traffic.hasTrafficInfo) {
    let userInfoHeader = `upload=${traffic.totalUpload}; download=${traffic.totalDownload}; total=${traffic.totalTotal}`;
    if (traffic.minExpire > 0) userInfoHeader += `; expire=${traffic.minExpire}`;
    responseHeaders['subscription-userinfo'] = userInfoHeader;
  }

  return new Response(result, { headers: responseHeaders });
}
