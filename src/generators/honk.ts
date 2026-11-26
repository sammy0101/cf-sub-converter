// src/generators/honk.ts
import { ProxyNode } from '../types';
import { REMOTE_CONFIG, FALLBACK_HONK_RULES } from '../config/rules';
import { fetchTemplateDirect } from './common';

const AI_DAE_URL = 'https://raw.githubusercontent.com/sammy0101/myself/refs/heads/main/geosite_ai_hk_proxy.dae';
const FALLBACK_AI_DAE_RULE = 'domain(geosite:openai, geosite:anthropic) -> AI';

export async function toHonk(
  _nodes: ProxyNode[],
  subUrl?: string,
  profileName?: string,
  forceRefresh = false
): Promise<string> {
  const [template, aiRawText] = await Promise.all([
    fetchTemplateDirect(REMOTE_CONFIG.honk, FALLBACK_HONK_RULES, forceRefresh),
    fetchTemplateDirect(AI_DAE_URL, '', forceRefresh)
  ]);

  let aiRulesBody = FALLBACK_AI_DAE_RULE;
  if (aiRawText && aiRawText.includes('domain(')) {
    aiRulesBody = aiRawText.replace(/->\s*proxy/g, '-> AI').trim();
  }

  const finalSubTag = (profileName || 'My_Sub').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetSubUrl = subUrl || 'https://sub.myvs.dpdns.org/EDT?target=base64';

  return template
    .replace(/{{SUB_TAG}}/g, finalSubTag)
    .replace(/{{SUB_URL}}/g, targetSubUrl)
    .replace(/{{AI_RULES}}/g, aiRulesBody);
}
