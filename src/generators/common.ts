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

// 直接自 GitHub 讀取遠端模板，失敗時無縫回退至內嵌應急模板
export async function fetchTemplateDirect(url: string, fallbackStr: string): Promise<string> {
  try {
    const resp = await fetch(`${url}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (resp.ok) {
      return await resp.text();
    }
  } catch {}

  return fallbackStr;
}
