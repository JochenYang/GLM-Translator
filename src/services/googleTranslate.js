/**
 * 谷歌免费翻译（免 Key，基于 Google GTX / translate_a/single 端点）。
 *
 * 端点：
 *   GET https://translate.googleapis.com/translate_a/single
 *       ?client=gtx&sl=<源语言代码，auto为自动检测>&tl=<目标语言代码>&dt=t&q=<文本>
 * 备用端点：
 *   GET https://translate.google.com/translate_a/single
 *
 * 响应结构：
 *   [[[translatedChunk, originalChunk], ...], null, detectedLang]
 */

const ENDPOINT_PRIMARY = "https://translate.googleapis.com/translate_a/single";
const ENDPOINT_FALLBACK = "https://translate.google.com/translate_a/single";
const MAX_TEXT_LEN = 10000;
const REQUEST_TIMEOUT_MS = 10000;

// 项目内短码 → 谷歌语言代码
const LANG_MAP = {
  zh: "zh-CN",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  "zh-HK": "zh-TW",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  pt: "pt",
  "pt-PT": "pt-PT",
  "pt-BR": "pt",
  it: "it",
  ru: "ru",
  ar: "ar",
  th: "th",
  vi: "vi",
  nl: "nl",
  pl: "pl",
  tr: "tr",
  id: "id",
  hi: "hi",
  uk: "uk",
  el: "el",
  he: "he",
  cs: "cs",
  sv: "sv",
  da: "da",
  fi: "fi",
};

const REVERSE_LANG_MAP = {
  "zh-CN": "zh",
  "zh-TW": "zh-TW",
  "zh-Hans": "zh",
  "zh-Hant": "zh-TW",
};
for (const [short, code] of Object.entries(LANG_MAP)) {
  if (!REVERSE_LANG_MAP[code]) REVERSE_LANG_MAP[code] = short;
}

export function toGoogleLang(code) {
  if (!code || code === "auto") return "auto";
  return LANG_MAP[code] || code;
}

export function fromGoogleLang(code) {
  if (!code) return null;
  return REVERSE_LANG_MAP[code] || code;
}

function makeAbortError() {
  if (typeof DOMException === "function") {
    return new DOMException("翻译已取消", "AbortError");
  }
  const err = new Error("翻译已取消");
  err.name = "AbortError";
  return err;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw makeAbortError();
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`请求超时（${timeoutMs}ms）`)),
    timeoutMs
  );
  const onOuterAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) onOuterAbort();
    else signal.addEventListener("abort", onOuterAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onOuterAbort);
    },
  };
}

// ─── 结果缓存（LRU）──────────────────────────────────────────
const CACHE_MAX = 60;
const cache = new Map();

function cacheKey(text, from, to) {
  return `${from || "auto"}→${to || "zh"}|${text}`;
}

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val);
  return val;
}

function cacheSet(key, val) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, val);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

function normalizeQuery(text) {
  let q = text == null ? "" : String(text);
  if (q.length > MAX_TEXT_LEN) {
    throw new Error(`文本超出谷歌翻译长度上限（${MAX_TEXT_LEN} 字符），请分段翻译`);
  }
  if (!q.trim()) throw new Error("翻译文本不能为空");
  return q;
}

/**
 * 解析 Google GTX 响应为项目统一结果。
 * 格式：[ [ [ "译文分段", "原文分段", ... ], ... ], null, "detected_lang" ]
 * @param {Array} json 响应数组
 * @returns {{ translatedText: string, detectedLanguage: string|null }}
 */
export function parseGoogleResponse(json) {
  const segments = json && json[0];
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("谷歌翻译响应格式异常");
  }
  let out = "";
  for (const seg of segments) {
    if (Array.isArray(seg) && typeof seg[0] === "string") {
      out += seg[0];
    }
  }
  if (!out) {
    throw new Error("谷歌翻译结果为空");
  }

  // 提取检测到的语言代码
  let detected = null;
  if (typeof json[2] === "string") {
    detected = fromGoogleLang(json[2]);
  } else if (Array.isArray(json[8]) && Array.isArray(json[8][0]) && typeof json[8][0][0] === "string") {
    detected = fromGoogleLang(json[8][0][0]);
  }

  return { translatedText: out, detectedLanguage: detected };
}

/**
 * 谷歌免费翻译（与 translator.js 约定的 provider translate 同签名）。
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {{ signal?: AbortSignal, fetchImpl?: Function, timeoutMs?: number }} [options]
 * @returns {Promise<{ translatedText: string, from: string, to: string, detectedLanguage?: string, via: string }>}
 */
export async function translate(text, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    fetchImpl = globalThis.fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;
  throwIfAborted(signal);
  if (!fetchImpl) throw new Error("当前环境不支持网络请求");

  const q = normalizeQuery(text);
  const key = cacheKey(q, from, to);
  const cached = cacheGet(key);
  if (cached) return cached;

  const sl = toGoogleLang(from);
  const tl = toGoogleLang(to);

  const endpoints = [ENDPOINT_PRIMARY, ENDPOINT_FALLBACK];
  let lastError = null;

  for (let idx = 0; idx < endpoints.length; idx++) {
    throwIfAborted(signal);
    const endpoint = endpoints[idx];
    const url = new URL(endpoint);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", sl);
    url.searchParams.set("tl", tl);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", q);

    const { signal: reqSignal, cleanup } = withTimeout(signal, timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        credentials: "omit",
        cache: "no-store",
        signal: reqSignal,
      });

      if (response.ok) {
        let json;
        try {
          json = await response.json();
        } catch {
          cleanup();
          throw new Error("谷歌翻译响应解析失败");
        }
        cleanup();

        const parsed = parseGoogleResponse(json);
        const result = {
          translatedText: parsed.translatedText,
          from,
          to,
          via: "google-gtx",
        };
        if (parsed.detectedLanguage && from === "auto") {
          result.detectedLanguage = parsed.detectedLanguage;
        }
        cacheSet(key, result);
        return result;
      }

      cleanup();
      lastError = new Error(`谷歌翻译请求失败（HTTP ${response.status}）`);
    } catch (err) {
      cleanup();
      if (err?.name === "AbortError") {
        if (!signal?.aborted) throw new Error("谷歌翻译请求超时");
        throw makeAbortError();
      }
      lastError = err;
    }
  }

  throw lastError || new Error("谷歌翻译请求失败");
}

export const __test__ = {
  toGoogleLang,
  fromGoogleLang,
  parseGoogleResponse,
  ENDPOINT_PRIMARY,
  ENDPOINT_FALLBACK,
  MAX_TEXT_LEN,
  cacheKey,
  cacheGet,
  cacheSet,
};
