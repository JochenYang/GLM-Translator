/**
 * 微软免费翻译（免 Key，逆向自 Edge 内置翻译 2026-08 后的新接口）。
 *
 * 通道：
 *   POST https://edge.microsoft.com/translate/translatetext
 *        ?from=<源语言，省略即自动检测>&to=<目标语言>&isEnterpriseClient=false
 *   body = JSON 字符串数组 ["text1", "text2"]，
 *   响应 = [{ detectedLanguage: { language }, translations: [{ text, to }] }]
 *
 * 无需任何 token / API Key / 浏览器伪装头。旧接口
 * edge.microsoft.com/translate/auth（JWT）已于 2026-07-30 停用。
 * 实测该端点支持日文与单请求多段文本（每段独立语言检测）。
 */

const TRANSLATE_URL = "https://edge.microsoft.com/translate/translatetext";
const MAX_TEXT_LEN = 20000;
const REQUEST_TIMEOUT_MS = 15000;

// 项目内短码（zh/en/ja…）→ 微软语言码
const LANG_MAP = {
  zh: "zh-Hans",
  "zh-CN": "zh-Hans",
  "zh-TW": "zh-Hant",
  "zh-HK": "zh-Hant",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  pt: "pt",
  "pt-PT": "pt-PT",
  "pt-BR": "pt-BR",
  it: "it",
  ru: "ru",
  ar: "ar",
  pl: "pl",
  da: "da",
  nl: "nl",
  cs: "cs",
  fi: "fi",
  sv: "sv",
  th: "th",
  tr: "tr",
  hu: "hu",
  vi: "vi",
};

const REVERSE_LANG_MAP = {};
for (const [short, ms] of Object.entries(LANG_MAP)) {
  if (!REVERSE_LANG_MAP[ms]) REVERSE_LANG_MAP[ms] = short;
}
REVERSE_LANG_MAP["zh-Hans"] = "zh";
REVERSE_LANG_MAP["zh-Hant"] = "zh-TW";

export function toMicrosoftLang(code) {
  if (!code || code === "auto") return "";
  return LANG_MAP[code] || code;
}

export function fromMicrosoftLang(msCode) {
  if (!msCode) return null;
  return REVERSE_LANG_MAP[msCode] || msCode;
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

/** 合并调用方 signal 与超时信号；返回清理函数。 */
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

function parseRetryAfterMs(response, attempt) {
  const header = response?.headers?.get?.("Retry-After");
  if (header) {
    const asSec = Number(header);
    if (Number.isFinite(asSec) && asSec >= 0) return Math.min(asSec * 1000, 10_000);
    const asDate = Date.parse(header);
    if (!Number.isNaN(asDate)) {
      return Math.min(Math.max(0, asDate - Date.now()), 10_000);
    }
  }
  // 0.8s, 1.6s, 3.2s… 上限 5s
  return Math.min(800 * Math.pow(2, attempt), 5_000);
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(timer);
      reject(makeAbortError());
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

// ─── 结果缓存（SW 生命周期内的内存 LRU，不持久化）──────────────
const CACHE_MAX = 60;
const cache = new Map();

function cacheKey(text, from, to) {
  return `${from || "auto"}→${to || "zh"}|${text}`;
}

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val); // LRU: 移到末尾
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
    throw new Error(`文本超出微软翻译长度上限（${MAX_TEXT_LEN} 字符），请分段翻译`);
  }
  if (!q.trim()) throw new Error("翻译文本不能为空");
  return q;
}

/**
 * 解析 translatetext 响应为项目统一结果。
 * @param {Array} data 响应数组（单元素）
 * @returns {{ translatedText: string, detectedLanguage: string|null }}
 */
export function parseTranslateResponse(data) {
  if (!Array.isArray(data) || !data.length) {
    throw new Error("微软翻译响应为空");
  }
  const first = data[0];
  const translation = first?.translations?.[0];
  if (!translation || typeof translation.text !== "string") {
    throw new Error("微软翻译响应格式异常");
  }
  const detected =
    fromMicrosoftLang(first?.detectedLanguage?.language) || null;
  return { translatedText: translation.text, detectedLanguage: detected };
}

/**
 * 微软免费翻译（与 translator.js 约定的 provider translate 同签名）。
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {{ signal?: AbortSignal, fetchImpl?: Function, rateLimitRetries?: number }} [options]
 * @returns {Promise<{ translatedText: string, from: string, to: string, detectedLanguage?: string, via: string }>}
 */
export async function translate(text, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    fetchImpl = globalThis.fetch,
    rateLimitRetries = 2,
  } = options;
  throwIfAborted(signal);
  if (!fetchImpl) throw new Error("当前环境不支持网络请求");

  const q = normalizeQuery(text);
  const key = cacheKey(q, from, to);
  const cached = cacheGet(key);
  if (cached) return cached;

  const msFrom = toMicrosoftLang(from);
  const msTo = toMicrosoftLang(to);
  const url = new URL(TRANSLATE_URL);
  if (msFrom) url.searchParams.set("from", msFrom);
  url.searchParams.set("to", msTo || to);
  url.searchParams.set("isEnterpriseClient", "false");

  let lastError;
  for (let attempt = 0; attempt <= rateLimitRetries; attempt++) {
    throwIfAborted(signal);
    const { signal: reqSignal, cleanup } = withTimeout(signal, REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "*/*" },
        body: JSON.stringify([q]),
        credentials: "omit",
        cache: "no-store",
        signal: reqSignal,
      });
    } catch (err) {
      cleanup();
      if (err?.name === "AbortError") {
        if (!signal?.aborted) throw new Error("微软翻译请求超时");
        throw makeAbortError();
      }
      throw err;
    }

    if (response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {
        cleanup();
        throw new Error("微软翻译响应解析失败");
      }
      cleanup();
      const parsed = parseTranslateResponse(data);
      const result = {
        translatedText: parsed.translatedText,
        from,
        to,
        via: "microsoft-edge",
      };
      if (parsed.detectedLanguage && from === "auto") {
        result.detectedLanguage = parsed.detectedLanguage;
      }
      cacheSet(key, result);
      return result;
    }

    // 可重试状态：429 / 403 / 5xx
    const status = response.status;
    const retryable = status === 429 || status === 403 || status >= 500;
    if (!retryable || attempt === rateLimitRetries) {
      let body = "";
      try {
        body = (await response.text()).slice(0, 200);
      } catch { /* ignore */ }
      cleanup();
      throw new Error(
        `微软翻译请求失败（HTTP ${status}）${body ? `: ${body}` : ""}`
      );
    }
    const waitMs = parseRetryAfterMs(response, attempt);
    cleanup();
    // 先读完 body 再等待，避免连接悬挂
    await response.text().catch(() => "");
    await sleep(waitMs, signal);
    lastError = new Error(`微软翻译请求失败（HTTP ${status}）`);
  }

  throw lastError || new Error("微软翻译请求失败");
}

export const __test__ = {
  toMicrosoftLang,
  fromMicrosoftLang,
  parseTranslateResponse,
  TRANSLATE_URL,
  MAX_TEXT_LEN,
  cacheKey,
  cacheGet,
  cacheSet,
};
