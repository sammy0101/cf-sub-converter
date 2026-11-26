// src/generators/common.ts
export function isIpAddress(str: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) || str.includes(':');
}

// 防禦性濾網：安全過濾 JSON 字串中意外存在的單行與多行註解，防止 JSON.parse 報錯
export function stripJsonComments(jsonStr: string): string {
  return jsonStr.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match, group) => {
    return group ? '' : match;
  });
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 具備 Cloudflare 60 秒邊緣快取與 4 秒超時降級的遠端模板直讀（帶 ?force=1 可強制穿透刷新）
export async function fetchTemplateDirect(
  url: string,
  fallbackStr: string,
  forceRefresh = false
): Promise<string> {
  const edgeCache = (typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined);
  const cacheKey = new Request(url, { method: 'GET' });

  if (!forceRefresh && edgeCache) {
    try {
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        return await cached.text();
      }
    } catch {}
  }

  try {
    const fetchUrl = forceRefresh ? `${url}?t=${Date.now()}` : url;
    const resp = await fetchWithTimeout(
      fetchUrl,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      4000
    );
    if (resp.ok) {
      const text = await resp.text();
      if (edgeCache && text.trim()) {
        try {
          await edgeCache.put(
            cacheKey,
            new Response(text, {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=60'
              }
            })
          );
        } catch {}
      }
      return text;
    }
  } catch {}

  return fallbackStr;
}
