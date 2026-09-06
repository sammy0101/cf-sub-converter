// src/index.ts
// @ts-ignore
import packageJson from '../package.json';
import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import {
  toSingBoxWithTemplate,
  toClashWithTemplate,
  toBase64,
  toSurge,
  toQuantumultX,
  toLoon
} from './generator';
import { deduplicateNodeNames, groupNodesByFlag } from './utils';

const version = packageJson.version || '3.5.0';

// 密碼鑒權校驗
function checkAuth(request: Request, env: Env): boolean {
  if (!env.PAGE_PASSWORD || env.PAGE_PASSWORD.trim() === '') {
    return true;
  }
  const clientPwd = request.headers.get('X-Password') || '';
  return clientPwd === env.PAGE_PASSWORD.trim();
}

// 輔助載入與解析節點
async function loadNodes(urlParam: string): Promise<ProxyNode[]> {
  const allNodes: ProxyNode[] = [];
  const trimmed = urlParam.trim();
  if (!trimmed) return allNodes;

  // 1. 優先完整辨識多行 WireGuard 或 MASQUE JSON
  if (/\[Interface\]/i.test(trimmed) && /\[Peer\]/i.test(trimmed)) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  if (trimmed.startsWith('{') && /["']private_key["']/i.test(trimmed)) {
    try {
      const parsed = await parseContent(trimmed);
      allNodes.push(...parsed);
    } catch {}
    return allNodes;
  }

  // 2. 傳統單行節點或訂閱連結
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
            'Accept': '*/*'
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

function safeBtoa(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch {
    return btoa(str);
  }
}

async function getArgoScriptFromGithub(node: ProxyNode, port: string, token: string, domain: string): Promise<string> {
  const GITHUB_TEMPLATE_URL = `https://raw.githubusercontent.com/sammy0101/cf-sub-converter/main/argo.sh?t=${Date.now()}`;
  let template = "";
  
  try {
    const res = await fetch(GITHUB_TEMPLATE_URL, { headers: { 'User-Agent': 'v2rayNG/1.8.5' } });
    if (res.ok) {
      template = await res.text();
    } else {
      throw new Error("GitHub Fetch Failed");
    }
  } catch {
    template = `#!/bin/bash
if ! command -v cloudflared &> /dev/null; then
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
fi
cloudflared tunnel --url http://127.0.0.1:{{VLESS_PORT}}
`;
  }

  const vlessType = node.network || 'ws';
  const vlessPath = node.wsPath || '/';
  const argoNodeName = `${node.name}_Argo`;
  const isTls = node.tls ? "true" : "false";
  const realHost = node.wsHeaders?.Host || node.sni || node.server; 

  return template
    .replace("{{NODE_TYPE}}", node.type)
    .replace("{{VLESS_UUID}}", node.uuid || '')
    .replace("{{VLESS_PATH}}", vlessPath)
    .replace("{{VLESS_TYPE}}", vlessType)
    .replace("{{VLESS_PORT}}", port)
    .replace("{{NODE_NAME}}", argoNodeName)
    .replace("{{TUNNEL_TOKEN}}", token.trim())
    .replace("{{CUSTOM_DOMAIN}}", domain.trim())
    .replace("{{VLESS_TLS}}", isTls)
    .replace("{{ORIGIN_HOST}}", realHost);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Password',
        }
      });
    }

    // GET /argo/sh/:id
    if (request.method === 'GET' && url.pathname.startsWith('/argo/sh/')) {
      const scriptId = url.pathname.split('/').pop();
      if (env.SUB_CACHE && scriptId) {
        const script = await env.SUB_CACHE.get(`script:${scriptId}`);
        if (script) {
          return new Response(script, {
            headers: { 
              'Content-Type': 'text/plain; charset=utf-8', 
              'Access-Control-Allow-Origin': '*' 
            }
          });
        }
      }
      return new Response('# 錯誤: 該腳本不存在或已過期，請重新在網頁上生成。\nexit 1\n', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // POST /api/parse-argo
    if (request.method === 'POST' && (url.pathname === '/api/parse-vless' || url.pathname === '/api/parse-argo')) {
      try {
        const body = (await request.json()) as { url?: string };
        const rawUrl = body.url || '';
        if (!rawUrl.trim()) {
          return new Response(JSON.stringify({ error: '請輸入有效的節點內容' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const allNodes = await loadNodes(rawUrl);
        const argoCompatibleNodes = allNodes.filter(n => n.type === 'vless' || n.type === 'vmess').map((n, idx) => ({
          index: idx,
          name: n.name,
          server: n.server,
          port: n.port,
          type: n.type,
          host: n.wsHeaders?.Host || n.sni || n.server
        }));

        return new Response(JSON.stringify(argoCompatibleNodes), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }

    // POST /api/argo-generate
    if (request.method === 'POST' && url.pathname === '/api/argo-generate') {
      try {
        const body = (await request.json()) as {
          url?: string;
          indices?: number[];
          port?: string;
          cleanIp?: string;
          token?: string;
          domain?: string;
        };

        const rawUrl = body.url || '';
        const selectedIndices = body.indices || [];
        const port = body.port || '8080';
        const cleanIp = (body.cleanIp || '').trim();
        const token = body.token || '';
        const domain = body.domain || '';

        if (!rawUrl.trim() || selectedIndices.length === 0) {
          return new Response(JSON.stringify({ error: '無效的參數或未選擇節點' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }

        const allNodes = await loadNodes(rawUrl);
        const compatibleNodes = allNodes.filter(n => n.type === 'vless' || n.type === 'vmess');
        const selectedObjects = selectedIndices.map(idx => compatibleNodes[idx]).filter(Boolean);

        let scripts = '';
        const generatedNodesData: Array<{ originalIndex: number; link: string }> = [];

        for (let i = 0; i < selectedObjects.length; i++) {
          const node = selectedObjects[i];
          const originalIndex = selectedIndices[i];
          
          scripts += await getArgoScriptFromGithub(node, port, token, domain) + '\n\n';

          const targetDomain = (token.trim() && domain.trim()) ? domain.trim() : "請在VPS執行一鍵安裝腳本獲取臨時域名.trycloudflare.com";
          const connectionServer = cleanIp || targetDomain;
          const argoNodeName = `${node.name}_Argo${cleanIp ? '_優選' : ''}`;

          let argoLink = '';
          if (node.type === 'vless') {
            argoLink = `vless://${node.uuid}@${connectionServer}:443?encryption=none&security=tls&type=${node.network || 'ws'}&host=${targetDomain}&sni=${targetDomain}&path=${node.wsPath || '/'}#${encodeURIComponent(argoNodeName)}`;
          } else {
            const vmessObj = {
              v: "2", ps: argoNodeName, add: connectionServer, port: 443, id: node.uuid,
              aid: 0, scy: "auto", net: node.network || 'ws', type: "none",
              host: targetDomain, path: node.wsPath || '/', tls: "tls", sni: targetDomain
            };
            argoLink = 'vmess://' + safeBtoa(JSON.stringify(vmessObj));
          }

          generatedNodesData.push({ originalIndex, link: argoLink });
        }

        let scriptId = '';
        if (env.SUB_CACHE) {
          scriptId = crypto.randomUUID();
          await env.SUB_CACHE.put('script:' + scriptId, scripts, { expirationTtl: 3600 });
        }

        return new Response(JSON.stringify({ 
          scriptId, 
          argoNodes: generatedNodesData 
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }

    // GET /version
    if (request.method === 'GET' && url.pathname === '/version') {
      return new Response(`subconverter v${version} ${url.host} backend\n`, {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8', 
          'Access-Control-Allow-Origin': '*'
        } 
      });
    }

    // POST /save 
    if (request.method === 'POST' && url.pathname === '/save') {
      try {
        const body = (await request.json()) as { path?: string; content?: string; include?: string; exclude?: string; rename?: string };
        if (!body.path || !body.content) return new Response('Missing path or content', { status: 400 });
        
        const saveData = {
          content: body.content,
          include: body.include || '',
          exclude: body.exclude || '',
          rename: body.rename || ''
        };
        await env.SUB_CACHE.put(body.path, JSON.stringify(saveData));
        
        return new Response('OK', { status: 200 });
      } catch {
        return new Response('Error saving profile', { status: 500 });
      }
    }

    // --- Favorites API ---
    const FAVS_KEY = 'favorites';
    const getFavs = async (): Promise<Array<Record<string, string>>> => {
      const data = await env.SUB_CACHE.get(FAVS_KEY);
      return data ? JSON.parse(data) : [];
    };
    const saveFavs = async (favs: Array<Record<string, string>>): Promise<void> => {
      await env.SUB_CACHE.put(FAVS_KEY, JSON.stringify(favs));
    };

    if (request.method === 'GET' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '密碼錯誤或未授權', locked: true }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const favs = await getFavs();
      return new Response(JSON.stringify(favs), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (request.method === 'POST' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '未授權' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      try {
        const body = (await request.json()) as Record<string, string>;
        if (!body.name || !body.url) return new Response('Missing name or url', { status: 400 });
        const favs = await getFavs();
        favs.push({
          name: body.name,
          url: body.url,
          include: body.include || '',
          exclude: body.exclude || '',
          rename: body.rename || ''
        });
        await saveFavs(favs);
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('Error saving favorite', { status: 500 });
      }
    }

    if (request.method === 'PUT' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '未授權' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      try {
        const body = (await request.json()) as { index?: number; name?: string; url?: string; include?: string; exclude?: string; rename?: string };
        if (body.index === undefined || !body.name || !body.url) return new Response('Missing data', { status: 400 });
        const favs = await getFavs();
        if (body.index >= 0 && body.index < favs.length) {
          favs[body.index] = {
            name: body.name,
            url: body.url,
            include: body.include || '',
            exclude: body.exclude || '',
            rename: body.rename || ''
          };
          await saveFavs(favs);
        }
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('Error updating favorite', { status: 500 });
      }
    }

    if (request.method === 'DELETE' && url.pathname === '/favs') {
      if (!checkAuth(request, env)) {
        return new Response(JSON.stringify({ error: '未授權' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      try {
        const body = (await request.json()) as { index?: number };
        if (body.index === undefined) return new Response('Missing index', { status: 400 });
        const favs = await getFavs();
        if (body.index >= 0 && body.index < favs.length) {
          favs.splice(body.index, 1);
          await saveFavs(favs);
        }
        return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch {
        return new Response('Error deleting favorite', { status: 500 });
      }
    }

    // GET 訂閱路由
    let urlParam = url.searchParams.get('url') || '';
    let includeParam = url.searchParams.get('include') || '';
    let excludeParam = url.searchParams.get('exclude') || '';
    let renameParam = url.searchParams.get('rename') || '';
    const forceRefresh = url.searchParams.has('force') || url.searchParams.has('nocache');

    const path = decodeURIComponent(url.pathname.slice(1)); 

    if (path && path !== 'sub' && path !== 'favicon.ico' && path !== '') {
      let stored = await env.SUB_CACHE.get(path);
      if (!stored && path !== path.toLowerCase()) {
        stored = await env.SUB_CACHE.get(path.toLowerCase());
      }

      if (stored) { 
        try {
          const parsed = JSON.parse(stored);
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
    }

    if (!urlParam || urlParam.trim() === '') {
      if (path === 'sub') {
        return new Response('Error: Missing parameter "url"', { status: 400 });
      }
      const dynamicHtml = HTML_PAGE.replace('v3.5.0', `v${version}`);
      return new Response(dynamicHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // --- 💥 核心節點解析（支援 WireGuard INI 與 MASQUE JSON 完整結構） ---
    const allNodes: ProxyNode[] = [];
    const errors: string[] = [];
    let totalUpload = 0;
    let totalDownload = 0;
    let totalTotal = 0;
    let minExpire = 0;
    let hasTrafficInfo = false;

    const trimmedParam = urlParam.trim();

    // 1. 優先完整辨識多行 WireGuard 配置
    if (/\[Interface\]/i.test(trimmedParam) && /\[Peer\]/i.test(trimmedParam)) {
      try {
        const parsed = await parseContent(trimmedParam);
        allNodes.push(...parsed);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`[WireGuard 配置] 失敗原因: ${msg}`);
      }
    } 
    // 💥 2. 優先完整辨識 Cloudflare WARP MASQUE JSON 配置
    else if (trimmedParam.startsWith('{') && /["']private_key["']/i.test(trimmedParam)) {
      try {
        const parsed = await parseContent(trimmedParam);
        allNodes.push(...parsed);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`[MASQUE 配置] 失敗原因: ${msg}`);
      }
    } 
    // 3. 傳統單行 URI 節點或訂閱網址 (依換行分割)
    else {
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

    if (allNodes.length === 0) {
      const errorMsg = errors.length > 0 ? errors.join('\n') : '未解析到任何有效節點。';
      return new Response(errorMsg, { status: 400 });
    }

    let filteredNodes = allNodes;

    // 替換
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
              filteredNodes.forEach(node => { node.name = replace; });
            } else {
              filteredNodes.forEach(node => {
                if (node.name) node.name = node.name.split(search).join(replace);
              });
            }
          }
        }
      }
    }

    const buildFilterRegex = (param: string): RegExp => {
      const parts = param.split('|').map(part => {
        const trimmed = part.trim();
        if (!trimmed) return '';
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped.replace(/[xXｘＸ×]/g, '[xXｘＸ×]');
      }).filter(Boolean);
      return new RegExp(parts.join('|'), 'i');
    };

    if (includeParam) {
      const includeRegex = buildFilterRegex(includeParam);
      filteredNodes = filteredNodes.filter(node => includeRegex.test(node.name));
    }

    if (excludeParam) {
      const excludeRegex = buildFilterRegex(excludeParam);
      filteredNodes = filteredNodes.filter(node => !excludeRegex.test(node.name));
    }

    const sortedNodes = groupNodesByFlag(filteredNodes);
    const uniqueNodes = deduplicateNodeNames(sortedNodes);

    let target = url.searchParams.get('target');

    // 自動探測 User-Agent
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
      } else if (ua.includes('v2ray') || ua.includes('shadowrocket')) {
        target = 'base64';
      }
    }

    if (!target) {
      const host = `https://${url.host}`;
      const encodedUrl = encodeURIComponent(urlParam);
      let filterQuery = '';
      if (includeParam) filterQuery += `&include=${encodeURIComponent(includeParam)}`;
      if (excludeParam) filterQuery += `&exclude=${encodeURIComponent(excludeParam)}`;
      if (renameParam) filterQuery += `&rename=${encodeURIComponent(renameParam)}`;

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

    const filename = `subscription${fileExt}`;
    const responseHeaders: Record<string, string> = {
      'Content-Type': `${contentType}; charset=utf-8`, 
      'Access-Control-Allow-Origin': '*', 
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Profile-Update-Interval': '3600',
    };

    if (hasTrafficInfo) {
      let userInfoHeader = `upload=${totalUpload}; download=${totalDownload}; total=${totalTotal}`;
      if (minExpire > 0) userInfoHeader += `; expire=${minExpire}`;
      responseHeaders['subscription-userinfo'] = userInfoHeader;
    }

    return new Response(result, { headers: responseHeaders });
  }
};
