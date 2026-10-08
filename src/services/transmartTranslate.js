/**
 * 腾讯交互翻译（免 Key，基于 Tencent TranSmart 端点）。
 *
 * 端点：
 *   POST https://transmart.qq.com/api/imt
 * 优势：
 *   国内服务器直连，响应通常仅需 0.2 秒左右，开箱即用。
 */

const ENDPOINT = "https://transmart.qq.com/api/imt";
const MAX_TEXT_LEN = 10000;
const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// 项目内短码 → 腾讯 TranSmart 语言代码
const LANG_MAP = {
  zh: "zh",
  "zh-CN": "zh",
  "zh-TW": "zh-TW",
  "zh-HK": "zh-TW",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
  ru: "ru",
  pt: "pt",
  "pt-PT": "pt",
  "pt-BR": "pt",
  ar: "ar",
  th: "th",
  vi: "vi",
  id: "id",
  tr: "tr",
  ms: "ms",
};

const REVERSE_LANG_MAP = {
  zh: "zh",
  "zh-TW": "zh-TW",
  "zh-CN": "zh",
};
for (const [short, code] of Object.entries(LANG_MAP)) {
  if (!REVERSE_LANG_MAP[code]) REVERSE_LANG_MAP[code] = short;
}

export function toTransmartLang(code) {
  if (!code || code === "auto") return "auto";
  return LANG_MAP[code] || code;
}

export function fromTransmartLang(code) {
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
    throw new Error(
      `文本超出腾讯交互翻译长度上限（${MAX_TEXT_LEN} 字符），请分段翻译`
    );
  }
  if (!q.trim()) throw new Error("翻译文本不能为空");
  return q;
}

export function parseTransmartResponse(json) {
  if (json?.header?.ret_code && json.header.ret_code !== "succ") {
    const detail = json.message
      ? `${json.header.ret_code}: ${json.message}`
      : json.header.ret_code;
    throw new Error(`腾讯交互翻译错误: ${detail}`);
  }
  const list = json && json.auto_translation;
  if (!Array.isArray(list) || typeof list[0] !== "string") {
    throw new Error("腾讯交互翻译响应格式异常");
  }
  const translatedText = list.join("\n");
  const detected = fromTransmartLang(json.src_lang) || null;
  return { translatedText, detectedLanguage: detected };
}

/**
 * 腾讯交互翻译（与 translator.js 约定的 provider translate 同签名）。
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

  const sl = toTransmartLang(from);
  const tl = toTransmartLang(to);

  const clientKey = `browser-chrome-130-${Math.random()
    .toString(36)
    .slice(2, 10)}-${Date.now()}`;

  const body = {
    header: {
      fn: "auto_translation",
      client_key: clientKey,
    },
    type: "plain",
    model_category: "normal",
    source: {
      lang: sl,
      text_list: q.split("\n"),
    },
    target: {
      lang: tl,
    },
  };

  const { signal: reqSignal, cleanup } = withTimeout(signal, timeoutMs);
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Referer: "https://transmart.qq.com/",
      },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      signal: reqSignal,
    });

    if (!response.ok) {
      cleanup();
      throw new Error(`腾讯交互翻译请求失败（HTTP ${response.status}）`);
    }

    let json;
    try {
      json = await response.json();
    } catch {
      cleanup();
      throw new Error("腾讯交互翻译响应解析失败");
    }
    cleanup();

    const parsed = parseTransmartResponse(json);
    const result = {
      translatedText: parsed.translatedText,
      from,
      to,
      via: "tencent-transmart",
    };
    if (parsed.detectedLanguage && from === "auto") {
      result.detectedLanguage = parsed.detectedLanguage;
    }
    cacheSet(key, result);
    return result;
  } catch (err) {
    cleanup();
    if (err?.name === "AbortError") {
      if (!signal?.aborted) throw new Error("腾讯交互翻译请求超时");
      throw makeAbortError();
    }
    throw err;
  }
}

export const __test__ = {
  toTransmartLang,
  fromTransmartLang,
  parseTransmartResponse,
  ENDPOINT,
  MAX_TEXT_LEN,
  cacheKey,
  cacheGet,
  cacheSet,
};
