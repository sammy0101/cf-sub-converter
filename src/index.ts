import { Env, ProxyNode } from './types';
import { HTML_PAGE } from './constants';
import { parseContent } from './parser';
import { toSingBoxWithTemplate, toClashWithTemplate, toBase64 } from './generator';
import { deduplicateNodeNames } from './utils';

// 定義 User-Agent 列表
const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Chrome Windows
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Chrome Mac
  'v2rayNG/1.8.5', // 備用：直接表明身份
];

async function fetchSubContent(url: string): Promise<string | null> {
  const separator = url.includes('?') ? '&' : '?';
  // 加入隨機參數防止快取
  const targetUrl = `${url}${separator}t=${Date.now()}`;

  for (const ua of UA_LIST) {
    try {
      // 構建完整的瀏覽器標頭，騙過防火牆
      const headers: any = {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive'
      };

      const resp = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      if (resp.ok) {
        const text = await resp.text();
        // 簡單驗證內容是否有效 (不是 HTML 錯誤頁面)
        if (text.length > 0 && !text.includes('<!DOCTYPE html>')) {
           return text;
        }
        // 如果是 Base64 或純文本，通常不會包含 doctype
        if (text.length > 0) return text;
      }
      
      console.log(`UA [${ua}] failed for ${url}: ${resp.status}`);
      
    } catch (e) {
      console.error(`Fetch error with UA [${ua}]:`, e);
    }
  }
  return null;
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
          // 使用新的強力偽裝函數
          const content = await fetchSubContent(trimmed);
          
          if (content) {
            const nodes = await parseContent(content);
            if (nodes.length > 0) {
              allNodes.push(...nodes);
            } else {
              debugInfo += `\n[解析失敗] ${trimmed}: 內容無效 (可能是錯誤頁面)\n`;
            }
          } else {
            debugInfo += `\n[下載失敗] ${trimmed} (被防火牆攔截)\n`;
          }
        } else { 
          const nodes = await parseContent(trimmed);
          if (nodes.length > 0) allNodes.push(...nodes);
        }
      }));

      if (allNodes.length === 0) {
        return new Response(`錯誤：無法獲取訂閱內容 (400 Bad Request)。\n\n原因可能是：\n1. 您的機場開啟了「防機器人/WAF」模式，攔截了轉換器。\n2. 訂閱連結失效。\n\n詳細錯誤:${debugInfo}`, { 
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
