// src/routes/argo.ts
import { Env, ProxyNode } from '../types';
import { utf8ToBase64 } from '../utils';
import { loadNodes } from '../services/node-loader';

async function getArgoScriptFromGithub(
  node: ProxyNode,
  port: string,
  token: string,
  domain: string
): Promise<string> {
  const GITHUB_TEMPLATE_URL = `https://raw.githubusercontent.com/sammy0101/cf-sub-converter/main/argo.sh?t=${Date.now()}`;
  let template = '';

  try {
    const res = await fetch(GITHUB_TEMPLATE_URL, { headers: { 'User-Agent': 'v2rayNG/1.8.5' } });
    if (res.ok) {
      template = await res.text();
    } else {
      throw new Error('GitHub Fetch Failed');
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
  const isTls = node.tls ? 'true' : 'false';
  const realHost = node.wsHeaders?.Host || node.sni || node.server;

  return template
    .replace('{{NODE_TYPE}}', node.type)
    .replace('{{VLESS_UUID}}', node.uuid || '')
    .replace('{{VLESS_PATH}}', vlessPath)
    .replace('{{VLESS_TYPE}}', vlessType)
    .replace('{{VLESS_PORT}}', port)
    .replace('{{NODE_NAME}}', argoNodeName)
    .replace('{{TUNNEL_TOKEN}}', token.trim())
    .replace('{{CUSTOM_DOMAIN}}', domain.trim())
    .replace('{{VLESS_TLS}}', isTls)
    .replace('{{ORIGIN_HOST}}', realHost);
}

export async function handleArgoRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
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
      const argoCompatibleNodes = allNodes
        .filter(n => n.type === 'vless' || n.type === 'vmess')
        .map((n, idx) => ({
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

        scripts += (await getArgoScriptFromGithub(node, port, token, domain)) + '\n\n';

        const targetDomain =
          token.trim() && domain.trim()
            ? domain.trim()
            : '請在VPS執行一鍵安裝腳本獲取臨時域名.trycloudflare.com';
        const connectionServer = cleanIp || targetDomain;
        const argoNodeName = `${node.name}_Argo${cleanIp ? '_優選' : ''}`;

        let argoLink = '';
        if (node.type === 'vless') {
          argoLink = `vless://${node.uuid}@${connectionServer}:443?encryption=none&security=tls&type=${node.network || 'ws'}&host=${targetDomain}&sni=${targetDomain}&path=${node.wsPath || '/'}#${argoNodeName}`;
        } else {
          const vmessObj = {
            v: '2',
            ps: argoNodeName,
            add: connectionServer,
            port: 443,
            id: node.uuid,
            aid: 0,
            scy: 'auto',
            net: node.network || 'ws',
            type: 'none',
            host: targetDomain,
            path: node.wsPath || '/',
            tls: 'tls',
            sni: targetDomain
          };
          argoLink = 'vmess://' + utf8ToBase64(JSON.stringify(vmessObj));
        }

        generatedNodesData.push({ originalIndex, link: argoLink });
      }

      let scriptId = '';
      if (env.SUB_CACHE) {
        scriptId = crypto.randomUUID();
        await env.SUB_CACHE.put('script:' + scriptId, scripts, { expirationTtl: 3600 });
      }

      return new Response(
        JSON.stringify({
          scriptId,
          argoNodes: generatedNodesData
        }),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return null;
}
