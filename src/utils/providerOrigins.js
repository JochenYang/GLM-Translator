/**
 * Known provider origins for MV3 host_permissions (least privilege).
 */

export const KNOWN_PROVIDER_ORIGINS = [
  "https://open.bigmodel.cn/*",
  "https://ark.cn-beijing.volces.com/*",
  "https://api.siliconflow.cn/*",
  "https://hunyuan.tencentcloudapi.com/*",
  "https://dashscope.aliyuncs.com/*",
  "https://api.deepseek.com/*",
  "https://edge.microsoft.com/*",
  "https://api-edge.cognitive.microsofttranslator.com/*",
];

/**
 * Extract origin pattern for chrome.permissions from a URL.
 * @param {string} url
 * @returns {string|null}
 */
export function originPatternFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return `${u.protocol}//${u.host}/*`;
  } catch {
    return null;
  }
}

/**
 * Whether URL is a known provider origin (no extra permission needed).
 * @param {string} url
 * @returns {boolean}
 */
export function isKnownProviderUrl(url) {
  const pattern = originPatternFromUrl(url);
  if (!pattern) return false;
  return KNOWN_PROVIDER_ORIGINS.some((p) => {
    // compare host part
    try {
      const known = new URL(p.replace("/*", "/"));
      const actual = new URL(url);
      return known.host === actual.host && known.protocol === actual.protocol;
    } catch {
      return false;
    }
  });
}
