// src/index.ts
// @ts-ignore
import packageJson from '../package.json';
import { Env } from './types';
import { handleArgoRoutes } from './routes/argo';
import { handleAdminRoutes } from './routes/admin';
import { handleFavsRoutes } from './routes/favs';
import { handleSubRoute } from './routes/sub';

const version = packageJson.version;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Password, X-Login-Attempt'
        }
      });
    }

    if (request.method === 'GET' && url.pathname === '/version') {
      return new Response(`subconverter v${version} ${url.host} backend\n`, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const argoResp = await handleArgoRoutes(request, env, url);
    if (argoResp) return argoResp;

    const adminResp = await handleAdminRoutes(request, env, ctx, url);
    if (adminResp) return adminResp;

    const favsResp = await handleFavsRoutes(request, env, ctx, url);
    if (favsResp) return favsResp;

    return handleSubRoute(request, env, ctx, url, version);
  }
};
