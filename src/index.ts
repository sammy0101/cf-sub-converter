import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import { toSingBoxWithTemplate, toClashWithTemplate, toBase64 } from './generator';
import { deduplicateNodeNames } from './utils';

// 定義 User-Agent 列表，輪流嘗試，直到成功為止
const UA_LIST = [
  'v2rayNG/1.8.5', // 首選：模仿安卓客戶端
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // 次選：模仿 Chrome 瀏覽器
  'Clash/1.0.0', // 備選：模仿 Clash
  'Shadowrocket/1982' // 備選：模仿小火箭
];

async function fetchSubContent(url: string): Promise<string | null> {
  const separator = url.includes('?') ? '&' : '?';
  const targetUrl = `${url}${separator}t=${Date.now()}`; // 加時間戳防緩存

  // 輪詢所有 User-Agent
  for (const ua of UA_LIST) {
    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': ua,
          'Accept': '*/*',
          'Connection': 'close'
        }
      });

      // 如果成功拿到 200 OK，回傳內容
      if (resp.ok) {
        const text = await resp.text();
        if (text.length > 10) { // 確保不是空回應
           return text;
        }
      }
      // 如果是 404 或 403，繼續嘗試下一個 UA
      console.log(`UA [${ua}] failed for ${url}: ${resp.status}`);
    } catch (e) {
      console.error(`Fetch error with UA [${ua}]:`, e);
    }
  }
  return null; // 全部失敗
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url); 
    
    // 1. POST /save
    if (request.method === 'POST' && url.pathname === '/save') {
      try {
        const body: any = await request.json();
        if (!body.path || !body.content) return new Response('Missing path or content', { status: 400 });
        await env.SUB_CACHE.put(body.path, body.content);
        return new Response('OK', { status: 200 });
      } catch (e) { return new Response('Error saving profile', { status: 500 }); }
    }

    // 2. GET /path
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
      // 4. 解析訂閱
      const inputs = urlParam.split('|'); 
      const allNodes: ProxyNode[] = [];
      
      await Promise.all(inputs.map(async (input) => { 
        const trimmed = input.trim(); 
        if (!trimmed) return;
        
        if (trimmed.startsWith('http')) { 
          // 使用新的智慧重試函數
          const content = await fetchSubContent(trimmed);
          
          if (content) {
            const nodes = await parseContent(content);
            if (nodes.length > 0) {
              allNodes.push(...nodes);
            } else {
              debugInfo += `\n[解析失敗] ${trimmed}: 內容無法識別\n`;
            }
          } else {
            debugInfo += `\n[下載失敗 (所有 UA 都試過了)] ${trimmed} (Status: 404/403/Error)\n`;
          }
        } else { 
          const nodes = await parseContent(trimmed);
          if (nodes.length > 0) allNodes.push(...nodes);
        }
      }));

      if (allNodes.length === 0) {
        return new Response(`錯誤：無法獲取訂閱內容。\n\n系統已嘗試使用 v2rayNG, Chrome, Clash 等多種身分存取您的連結，但全部回應 404 或失敗。\n\n請確認：\n1. 您的訂閱連結是否已過期？(請嘗試在瀏覽器無痕模式打開)\n2. 您的機場是否封鎖了 Cloudflare IP？\n\n詳細錯誤:${debugInfo}`, { 
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      
      const uniqueNodes = deduplicateNodeNames(allNodes);

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
