// src/routes/argo.ts
import { Env, ProxyNode } from '../types';
import { utf8ToBase64 } from '../utils';
import { loadNodes } from '../services/node-loader';

function escapeBashDoubleQuoted(val: string): string {
  return val
    .replace(/[\r\n\0]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

function replaceAllTokens(template: string, token: string, value: string): string {
  return template.split(token).join(escapeBashDoubleQuoted(value));
}

function formatHost(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

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
  const safePort = String(parseInt(port, 10) || 8080);

  let rendered = template;
  rendered = replaceAllTokens(rendered, '{{NODE_TYPE}}', node.type);
  rendered = replaceAllTokens(rendered, '{{VLESS_UUID}}', node.uuid || '');
  rendered = replaceAllTokens(rendered, '{{VLESS_PATH}}', vlessPath);
  rendered = replaceAllTokens(rendered, '{{VLESS_TYPE}}', vlessType);
  rendered = replaceAllTokens(rendered, '{{VLESS_PORT}}', safePort);
  rendered = replaceAllTokens(rendered, '{{NODE_NAME}}', argoNodeName);
  rendered = replaceAllTokens(rendered, '{{TUNNEL_TOKEN}}', token.trim());
  rendered = replaceAllTokens(rendered, '{{CUSTOM_DOMAIN}}', domain.trim());
  rendered = replaceAllTokens(rendered, '{{VLESS_TLS}}', isTls);
  rendered = replaceAllTokens(rendered, '{{ORIGIN_HOST}}', realHost);
  return rendered;
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
      const selectedPairs = selectedIndices
        .map(idx => ({ originalIndex: idx, node: compatibleNodes[idx] }))
        .filter((item): item is { originalIndex: number; node: ProxyNode } => Boolean(item.node));

      if (selectedPairs.length === 0) {
        return new Response(JSON.stringify({ error: '找不到對應的節點索引' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const scriptParts: string[] = [];
      const generatedNodesData: Array<{ originalIndex: number; link: string }> = [];
      const isFixedTunnel = Boolean(token.trim() && domain.trim());

      for (let i = 0; i < selectedPairs.length; i++) {
        const { originalIndex, node } = selectedPairs[i];

        // 固定隧道僅有一個全域 cloudflared 服務實例，避免重複卸載與安裝
        if (!isFixedTunnel || i === 0) {
          scriptParts.push(await getArgoScriptFromGithub(node, port, token, domain));
        }

        const targetDomain = isFixedTunnel
          ? domain.trim()
          : '請在VPS執行一鍵安裝腳本獲取臨時域名.trycloudflare.com';
        const connectionServer = formatHost(cleanIp || targetDomain);
        const argoNodeName = `${node.name}_Argo${cleanIp ? '_優選' : ''}`;

        let argoLink = '';
        if (node.type === 'vless') {
          const params = new URLSearchParams({
            encryption: 'none',
            security: 'tls',
            type: node.network || 'ws',
            host: targetDomain,
            sni: targetDomain,
            path: node.wsPath || '/'
          });
          argoLink = `vless://${encodeURIComponent(node.uuid || '')}@${connectionServer}:443?${params.toString()}#${encodeURIComponent(argoNodeName)}`;
        } else {
          const vmessObj = {
            v: '2',
            ps: argoNodeName,
            add: cleanIp || targetDomain,
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

      const scripts = scriptParts.join('\n\n');
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
