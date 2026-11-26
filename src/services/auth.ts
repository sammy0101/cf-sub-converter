// src/services/auth.ts
import { Env } from '../types';
import { timingSafeEqualStr } from '../utils';

export function hasPasswordConfigured(env: Env): boolean {
  return Boolean(env.PAGE_PASSWORD && env.PAGE_PASSWORD.trim() !== '');
}

export function checkAuth(request: Request, env: Env): boolean {
  if (!hasPasswordConfigured(env)) {
    return true;
  }
  const clientPwd = request.headers.get('X-Password') || '';
  return timingSafeEqualStr(clientPwd, env.PAGE_PASSWORD!.trim());
}
