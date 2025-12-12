import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import { toSingBoxWithTemplate, toClashWithTemplate, toBase64 } from './generator';
import { deduplicateNodeNames } from './utils';

// 修改：改回 v2rayNG，這是面板最信任的 UA，不會被當成瀏覽器攔截
const CLIENT_UA = 'v2rayNG/1.8.5';

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url); 
    
    // 1. POST /save (KV 短鏈)
    if (request.method === 'POST' && url.pathname === '/save') {
      try {
        const body: any = await request.json();
        if (!body.path || !body.content) return new Response('Missing path or content', { status: 400 });
        await env.SUB_CACHE.put(body.path, body.content);
        return new Response('OK', { status: 200 });
      } catch (e) { return new Response('Error saving profile', { status: 500 }); }
    }

    // 2. GET /path (讀取短鏈)
    let urlParam = url.searchParams.get('url');
    const path = url.pathname.slice(1);
    if (path && path !== 'favicon.ico' && !urlParam) {
      const storedContent = await env.SUB_CACHE.get(path);
      if (storedContent) { urlParam = storedContent; }
    }

    // 3. 顯示前端
    if (!urlParam) return new Response(HTML_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    
    const target = url.searchParams.get('target') || 'singbox';
    
    let debugInfo = "";

    try {
      // 4. 解析訂閱來源
      const inputs = urlParam.split('|'); 
      const allNodes: ProxyNode[] = [];
      
      await Promise.all(inputs.map(async (input) => { 
        const trimmed = input.trim(); 
        if (!trimmed) return;
        
        if (trimmed.startsWith('http')) { 
          try { 
            const separator = trimmed.includes('?') ? '&' : '?';
            // 這裡使用 CLIENT_UA (v2rayNG)
            const resp = await fetch(`${trimmed}${separator}t=${Date.now()}`, { 
              headers: { 
                'User-Agent': CLIENT_UA,
                'Accept': '*/*'
              } 
            }); 
            
            if (resp.ok) { 
              const text = await resp.text(); 
              const nodes = await parseContent(text);
              if (nodes.length > 0) {
                allNodes.push(...nodes);
              } else {
                debugInfo += `\n[解析失敗] ${trimmed}: 內容長度 ${text.length} (可能是空內容)\n`;
              }
            } else {
              debugInfo += `\n[下載失敗] ${trimmed} (Status: ${resp.status})\n`;
            }
          } catch (e: any) { 
            debugInfo += `\n[連線錯誤] ${trimmed}: ${e.message}\n`;
          } 
        } else { 
          // 處理直接貼上的節點
          const nodes = await parseContent(trimmed);
          if (nodes.length > 0) allNodes.push(...nodes);
        }
      }));

      // 如果全部失敗，回傳詳細錯誤
      if (allNodes.length === 0) {
        return new Response(`錯誤：未解析到任何有效節點 (400 Bad Request)。\n\n如果狀態碼是 404，請檢查您的訂閱連結是否正確，或者面板是否開啟了瀏覽器攔截。\n\n詳細資訊:${debugInfo}`, { 
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      
      // 5. 去重
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

      // 7. 回傳
      return new Response(result, { 
        headers: { 
          'Content-Type': contentType, 
          'Access-Control-Allow-Origin': '*', 
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        } 
      });

    } catch (err: any) { 
      return new Response(`轉換程式內部錯誤: ${err.message}`, { status: 500 }); 
    }
  },
};
