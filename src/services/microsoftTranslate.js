/**
 * 微软免费翻译（免 Key，逆向自 Edge 内置翻译 2026-08 后的新接口，并支持 Bing Web 备用容灾）。
 *
 * 通道 1（主通道）：
 *   POST https://edge.microsoft.com/translate/translatetext
 *        ?from=<源语言，省略即自动检测>&to=<目标语言>&isEnterpriseClient=false
 *   body = JSON 字符串数组 ["text1", "text2"]，
 *   响应 = [{ detectedLanguage: { language }, translations: [{ text, to }] }]
 *
 * 通道 2（备用容灾通道）：
 *   逆向自 cn.bing.com/translator 短期 token + POST https://cn.bing.com/ttranslatev3
 *   当 Edge 接口网络受限或服务异常时自动降级无缝切换，确保高可用。
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

// ─── 备用 Bing Web 通道（逆向自 cn.bing.com/translator）──────
const BING_PAGE_URL = "https://cn.bing.com/translator";
const BING_TRANSLATE_URL = "https://cn.bing.com/ttranslatev3";
let bingCached = null;
let bingPending = null;

export function resetBingTokenCache() {
  bingCached = null;
  bingPending = null;
}

export function parseBingAuth(html, now = Date.now()) {
  const abuse = String(html).match(
    /params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*\]/
  );
  const ig = String(html).match(/IG\s*:\s*"([A-Fa-f0-9]+)"/);
  const iid = String(html).match(/data-iid\s*=\s*"([^"]+)"/);
  if (!abuse || !ig || !iid) throw new Error("微软 Bing 认证凭据解析失败");
  const ttl = Number(abuse[3]);
  return {
    ig: ig[1],
    iid: iid[1],
    key: abuse[1],
    token: abuse[2],
    exp: now + Math.max(ttl - 60_000, 0),
  };
}

export async function getBingSession(fetchImpl, signal, timeoutMs, force = false) {
  const now = Date.now();
  if (!force && bingCached && bingCached.exp > now + 15_000) return bingCached;
  if (!force && bingPending) return bingPending;

  const fetchSession = async () => {
    const { signal: reqSignal, cleanup } = withTimeout(signal, timeoutMs);
    try {
      const res = await fetchImpl(BING_PAGE_URL, {
        method: "GET",
        signal: reqSignal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) throw new Error(`微软 Bing 页面访问失败（HTTP ${res.status}）`);
      const html = await res.text();
      const auth = parseBingAuth(html, now);
      bingCached = { auth, exp: auth.exp };
      return bingCached;
    } finally {
      cleanup();
    }
  };

  const p = fetchSession();
  bingPending = p;
  try {
    return await p;
  } finally {
    if (bingPending === p) bingPending = null;
  }
}

export async function translateViaBing(text, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    fetchImpl = globalThis.fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;
  const msFrom = toMicrosoftLang(from);
  const msTo = toMicrosoftLang(to) || "zh-Hans";

  const once = async (force) => {
    const session = await getBingSession(fetchImpl, signal, timeoutMs, force);
    const url = new URL(BING_TRANSLATE_URL);
    url.searchParams.set("isVertical", "1");
    url.searchParams.set("IG", session.auth.ig);
    url.searchParams.set("IID", session.auth.iid);

    const body = new URLSearchParams({
      fromLang: msFrom || "auto-detect",
      text,
      to: msTo,
      token: session.auth.token,
      key: session.auth.key,
    });

    const { signal: reqSignal, cleanup } = withTimeout(signal, timeoutMs);
    try {
      const res = await fetchImpl(url.toString(), {
        method: "POST",
        signal: reqSignal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: BING_PAGE_URL,
        },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`微软 Bing 请求失败（HTTP ${res.status}）`);
      const json = await res.json();
      if (json && typeof json.statusCode === "number" && json.statusCode !== 200) {
        const err = new Error(`Bing 状态码异常: ${json.statusCode}`);
        err.bingStatus = json.statusCode;
        throw err;
      }
      const transText = json?.[0]?.translations?.[0]?.text;
      if (typeof transText !== "string") throw new Error("Bing 翻译响应格式异常");
      const detected = fromMicrosoftLang(json?.[0]?.detectedLanguage?.language);
      return {
        translatedText: transText,
        from,
        to,
        detectedLanguage: detected,
        via: "microsoft-bing",
      };
    } finally {
      cleanup();
    }
  };

  try {
    return await once(false);
  } catch (err) {
    if (err?.bingStatus === 205) return once(true);
    throw err;
  }
}

/**
 * 微软免费翻译（与 translator.js 约定的 provider translate 同签名）。
 * 默认走 Edge 极速端点；在端点失效（404/503/网络故障）时自动降级到 Bing Web 备用端点。
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {{ signal?: AbortSignal, fetchImpl?: Function, rateLimitRetries?: number, enableBingFallback?: boolean }} [options]
 * @returns {Promise<{ translatedText: string, from: string, to: string, detectedLanguage?: string, via: string }>}
 */
export async function translate(text, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    fetchImpl = globalThis.fetch,
    rateLimitRetries = 2,
    enableBingFallback = true,
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
  let canFallbackToBing = false;

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
      canFallbackToBing = true;
      lastError = err;
      break;
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
    if (status === 404 || status === 502 || status === 503) {
      canFallbackToBing = true;
    }
    const retryable = status === 429 || status === 403 || status >= 500;
    if (!retryable || attempt === rateLimitRetries) {
      let body = "";
      try {
        body = (await response.text()).slice(0, 200);
      } catch { /* ignore */ }
      cleanup();
      lastError = new Error(
        `微软翻译请求失败（HTTP ${status}）${body ? `: ${body}` : ""}`
      );
      break;
    }
    const waitMs = parseRetryAfterMs(response, attempt);
    cleanup();
    // 先读完 body 再等待，避免连接悬挂
    await response.text().catch(() => "");
    await sleep(waitMs, signal);
    lastError = new Error(`微软翻译请求失败（HTTP ${status}）`);
  }

  // 若 Edge 接口不可达（404/503/网络断开）且允许备用通道，尝试 Bing 备用通道
  if (enableBingFallback && canFallbackToBing) {
    try {
      const bingResult = await translateViaBing(q, from, to, options);
      cacheSet(key, bingResult);
      return bingResult;
    } catch (bingErr) {
      console.warn("微软 Bing 备用通道失败:", bingErr.message);
    }
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
  translateViaBing,
  parseBingAuth,
  resetBingTokenCache,
};
