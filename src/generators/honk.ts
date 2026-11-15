// src/generators/honk.ts
import { ProxyNode } from '../types';
import { REMOTE_CONFIG, FALLBACK_HONK_RULES } from '../config/rules';
import { fetchTemplateDirect } from './common';

export async function toHonk(_nodes: ProxyNode[], subUrl?: string, profileName?: string): Promise<string> {
  const AI_DAE_URL = 'https://raw.githubusercontent.com/sammy0101/myself/refs/heads/main/geosite_ai_hk_proxy.dae';
  let aiRulesBody = 'domain(geosite:openai, geosite:anthropic) -> AI';

  try {
    const aiResp = await fetch(`${AI_DAE_URL}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (aiResp.ok) {
      const text = await aiResp.text();
      if (text.includes('domain(')) {
        aiRulesBody = text.replace(/->\s*proxy/g, '-> AI').trim();
      }
    }
  } catch {}

  const finalSubTag = (profileName || 'My_Sub').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetSubUrl = subUrl || 'https://sub.myvs.dpdns.org/EDT?target=base64';

  const template = await fetchTemplateDirect(REMOTE_CONFIG.honk, FALLBACK_HONK_RULES);

  return template
    .replace(/{{SUB_TAG}}/g, finalSubTag)
    .replace(/{{SUB_URL}}/g, targetSubUrl)
    .replace(/{{AI_RULES}}/g, aiRulesBody);
}
