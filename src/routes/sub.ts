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

  if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
    if (!detectedProfileName) {
      detectedProfileName = path;
    }

    let stored = await env.SUB_CACHE.get(path);
    if (!stored && path !== path.toLowerCase()) {
      stored = await env.SUB_CACHE.get(path.toLowerCase());
    }
    if (!stored && path !== path.toUpperCase()) {
      stored = await env.SUB_CACHE.get(path.toUpperCase());
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          content?: string;
          include?: string;
          exclude?: string;
          rename?: string;
        };
        if (parsed && parsed.content) {
          urlParam = parsed.content;
          if (!includeParam) includeParam = parsed.include || '';
          if (!excludeParam) excludeParam = parsed.exclude || '';
          if (!renameParam) renameParam = parsed.rename || '';
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
            urlParam = matched.url;
            if (!includeParam) includeParam = matched.include || '';
            if (!excludeParam) excludeParam = matched.exclude || '';
            if (!renameParam) renameParam = matched.rename || '';
            detectedProfileName = matched.name;
          }
        }
      } catch {}
    }
  }

  if (!urlParam || urlParam.trim() === '') {
    if (path === 'sub') {
      return new Response('Error: Missing parameter "url"', { status: 400 });
    }
    const dynamicHtml = HTML_PAGE.replace('id="appVersionBadge">PRO</span>', `id="appVersionBadge">v${version}</span>`);
    return new Response(dynamicHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const { nodes: allNodes, errors, traffic } = await loadNodesWithTraffic(urlParam);

  if (allNodes.length === 0) {
    const errorMsg = errors.length > 0 ? errors.join('\n') : '未解析到任何有效節點。';
    return new Response(errorMsg, { status: 400 });
  }

  const uniqueNodes = filterAndRenameNodes(allNodes, includeParam, excludeParam, renameParam);

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

  if (!target) {
    scheduleLog(request, env, ctx, '獲取訂閱');

    const host = `https://${url.host}`;
    const encodedUrl = encodeURIComponent(urlParam);
    let filterQuery = '';
    if (includeParam) filterQuery += `&include=${encodeURIComponent(includeParam)}`;
    if (excludeParam) filterQuery += `&exclude=${encodeURIComponent(excludeParam)}`;
    if (renameParam) filterQuery += `&rename=${encodeURIComponent(renameParam)}`;
    if (detectedProfileName) filterQuery += `&name=${encodeURIComponent(detectedProfileName)}`;

    const htmlInfo = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>轉換完成</title><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center;}a{display:inline-block;margin:10px;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;}</style></head>
<body>
  <h1>⚡ 成功轉換 ${uniqueNodes.length} 個節點</h1>
  <div>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=clash">Clash Meta (YAML)</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=singbox">Sing-Box (JSON)</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=surge">Surge 5</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=quanx">Quantumult X</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=loon">Loon</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=base64">Base64</a>
    <a href="${host}/?url=${encodedUrl}${filterQuery}&target=honk">Honk / dae (config.dae)</a>
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
    } else if (target === 'honk' || target === 'dae') {
      const host = `https://${url.host}`;
      let base64SubUrl = `${host}/?url=${encodeURIComponent(urlParam)}&target=base64`;
      if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
        base64SubUrl = `${host}/${encodeURIComponent(path)}?target=base64`;
      }
      if (includeParam) base64SubUrl += `&include=${encodeURIComponent(includeParam)}`;
      if (excludeParam) base64SubUrl += `&exclude=${encodeURIComponent(excludeParam)}`;
      if (renameParam) base64SubUrl += `&rename=${encodeURIComponent(renameParam)}`;

      result = await toHonk(uniqueNodes, base64SubUrl, finalProfileName);
      contentType = 'text/plain';
      fileExt = '.dae';
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
