import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import { toSingBoxWithTemplate, toClashWithTemplate, toBase64 } from './generator';
import { deduplicateNodeNames } from './utils';

// 改回 v2rayNG，這是機場最喜歡的 UA，通常會直接給 Base64 訂閱
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
    
    // 用來記錄最後一次抓取的錯誤內容，方便除錯
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
            // 使用 v2rayNG UA
            const resp = await fetch(`${trimmed}${separator}t=${Date.now()}`, { 
              headers: { 
                'User-Agent': CLIENT_UA,
                'Accept': '*/*'
              } 
            }); 
            
            if (resp.ok) { 
              const text = await resp.text(); 
              // 嘗試解析
              const nodes = await parseContent(text);
              if (nodes.length > 0) {
                allNodes.push(...nodes);
              } else {
                // 雖然成功下載，但解析不出節點，記錄下來
                debugInfo += `\n[解析失敗] ${trimmed}:\n內容預覽: ${text.substring(0, 150)}...\n`;
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

      // 如果全部失敗，回傳詳細錯誤訊息給客戶端
      if (allNodes.length === 0) {
        return new Response(`錯誤：未解析到任何有效節點 (400 Bad Request)。\n\n詳細除錯資訊:${debugInfo}`, { 
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
