import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import { toSingBoxWithTemplate, toClashWithTemplate, toBase64 } from './generator';
import { deduplicateNodeNames } from './utils';

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url); 
    
    // 1. 處理 POST 請求 (儲存短連結到 KV)
    if (request.method === 'POST' && url.pathname === '/save') {
      try {
        const body: any = await request.json();
        if (!body.path || !body.content) return new Response('Missing path or content', { status: 400 });
        await env.SUB_CACHE.put(body.path, body.content);
        return new Response('OK', { status: 200 });
      } catch (e) { return new Response('Error saving profile', { status: 500 }); }
    }

    // 2. 處理 GET 請求 (讀取短連結)
    let urlParam = url.searchParams.get('url');
    const path = url.pathname.slice(1);
    // 如果路徑存在且不是 favicon，嘗試從 KV 讀取
    if (path && path !== 'favicon.ico' && !urlParam) {
      const storedContent = await env.SUB_CACHE.get(path);
      if (storedContent) { urlParam = storedContent; }
    }

    // 3. 如果沒有訂閱連結，顯示前端頁面
    if (!urlParam) return new Response(HTML_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    
    const target = url.searchParams.get('target') || 'singbox';
    
    try {
      // 4. 解析訂閱來源
      const inputs = urlParam.split('|'); 
      const allNodes: ProxyNode[] = [];
      
      await Promise.all(inputs.map(async (input) => { 
        const trimmed = input.trim(); 
        if (!trimmed) return;
        
        if (trimmed.startsWith('http')) { 
          try { 
            // 這裡保留時間戳，是為了確保 Worker 去抓機場時拿到最新的，不被 Cloudflare 緩存
            const separator = trimmed.includes('?') ? '&' : '?';
            const resp = await fetch(`${trimmed}${separator}t=${Date.now()}`, { 
              headers: { 'User-Agent': 'v2rayng/1.8.5' } 
            }); 
            
            if (resp.ok) { 
              const text = await resp.text(); 
              allNodes.push(...await parseContent(text)); 
            } 
          } catch (e) {} 
        } else { 
          // 處理直接貼上的節點 (vmess://...)
          allNodes.push(...await parseContent(trimmed)); 
        }
      }));

      if (allNodes.length === 0) return new Response('未解析到任何有效節點', { status: 400 });
      
      // 5. 節點去重 (防止名稱衝突)
      const uniqueNodes = deduplicateNodeNames(allNodes);

      // 6. 生成配置
      let result = ''; 
      let contentType = 'text/plain; charset=utf-8';
      
      if (target === 'clash') { 
        result = await toClashWithTemplate(uniqueNodes); 
        contentType = 'text/yaml; charset=utf-8'; 
      } else if (target === 'base64') { 
        result = toBase64(uniqueNodes); 
        contentType = 'text/plain; charset=utf-8'; 
      } else { 
        result = await toSingBoxWithTemplate(uniqueNodes); 
        contentType = 'application/json; charset=utf-8'; 
      }

      // 7. 回傳結果 (加入防快取 Header)
      // 這裡最重要：告訴 App 不要快取這個回應，這樣下次更新時才會重新抓取
      return new Response(result, { 
        headers: { 
          'Content-Type': contentType, 
          'Access-Control-Allow-Origin': '*', 
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        } 
      });

    } catch (err: any) { return new Response(`轉換錯誤: ${err.message}`, { status: 500 }); }
  },
};
