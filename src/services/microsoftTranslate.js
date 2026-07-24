/**
 * 微软免费翻译服务
 *
 * 实现原理（逆向自 Edge 内置翻译）：
 * 1. 从 edge.microsoft.com/translate/auth 获取 JWT token
 * 2. 用 Bearer token 调 api-edge.cognitive.microsofttranslator.com/translate
 * 3. Token 缓存 + 预过期刷新 + 并发去重
 * 4. 全局轻量串行 + 短间隔，避免划词重入打满免费接口
 * 5. 401 换 token；429/403 有限退避（尊重 Retry-After），不在 429 上狂刷 token
 *
 * 配额机制：
 * 微软的限频是 token 粒度的——每个 JWT 可用一定次数
 * 用完返回 401 "Max count exceeded" → 自动换新 token 续命
 */

// ─── 语言代码映射 ─────────────────────────────────────────────
// 项目内使用短代码（zh/en/ja），微软使用带 region 的代码（zh-Hans/zh-Hant）
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
  "pt-PT": "pt-pt",
  "pt-BR": "pt-br",
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

// Prefer short project codes for reverse map
const REVERSE_LANG_MAP = {};
for (const [short, ms] of Object.entries(LANG_MAP)) {
  if (!REVERSE_LANG_MAP[ms]) {
    REVERSE_LANG_MAP[ms] = short;
  }
}
REVERSE_LANG_MAP["zh-Hans"] = "zh";
REVERSE_LANG_MAP["zh-Hant"] = "zh-TW";

function toMicrosoftLang(code) {
  if (!code || code === "auto") return null;
  return LANG_MAP[code] || code;
}

function fromMicrosoftLang(msCode) {
  return REVERSE_LANG_MAP[msCode] || msCode;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(timer);
      reject(makeAbortError());
    };
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
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

/**
 * @param {Response} response
 * @param {number} attempt 0-based rate-limit attempt
 * @returns {number} wait ms, capped
 */
function parseRetryAfterMs(response, attempt) {
  const header = response?.headers?.get?.("Retry-After");
  if (header) {
    const asSec = Number(header);
    if (Number.isFinite(asSec) && asSec >= 0) {
      return Math.min(asSec * 1000, 10_000);
    }
    const asDate = Date.parse(header);
    if (!Number.isNaN(asDate)) {
      return Math.min(Math.max(0, asDate - Date.now()), 10_000);
    }
  }
  // 0.8s, 1.6s, 3.2s… capped at 5s
  return Math.min(800 * Math.pow(2, attempt), 5_000);
}

// ─── Token 管理器 ─────────────────────────────────────────────
// 单例 — 浏览器插件生命周期内只有一个实例

class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = 0; // 毫秒时间戳
    this.refreshPromise = null; // 去重锁
  }

  /**
   * 获取有效 token
   * 缓冲 60 秒提前刷新（token 实际有效期约 10 分钟）
   */
  async getToken() {
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }
    return this._refresh();
  }

  /**
   * 刷新 token，带去重：并发请求只触发一次网络调用
   */
  async _refresh() {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async _doRefresh() {
    // MV3 service worker: do not override browser identity headers
    const response = await fetch("https://edge.microsoft.com/translate/auth", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `微软翻译 Token 获取失败 (HTTP ${response.status})${
          body ? `: ${body.slice(0, 120)}` : ""
        }`
      );
    }

    const token = (await response.text()).trim();
    if (!token || token.split(".").length < 2) {
      throw new Error("微软翻译 Token 无效，请稍后重试");
    }

    this.token = token;

    try {
      const payloadBase64 = token
        .split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const padded = payloadBase64.padEnd(
        payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
        "="
      );
      const payload = JSON.parse(atob(padded));
      this.expiresAt = (payload.exp || 0) * 1000;
      if (!this.expiresAt) {
        this.expiresAt = Date.now() + 8 * 60 * 1000;
      }
    } catch {
      this.expiresAt = Date.now() + 8 * 60 * 1000;
    }

    return token;
  }

  /** 强制标记 token 失效，下次 getToken 会刷新 */
  invalidate() {
    this.token = null;
    this.expiresAt = 0;
    this.refreshPromise = null;
  }
}

// 全局单例
const tokenManager = new TokenManager();

// ─── 轻量串行队列 + 间隔 ───────────────────────────────────
// 实测：同 token 连发两次请求就会触发 per-token 429。
// 间隔需 ≥ 1s 才稳定；冷却期后续请求必须等满，不能再发。
let chain = Promise.resolve();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000;

// 429 冷却锁：一旦被限流，全局暂停一段时间，避免重试风暴
let cooldownUntil = 0;

// 同文本 in-flight 去重：避免划词重复时并发排队重复打网络
const inflight = new Map();

function enqueue(task) {
  const run = chain.then(task, task);
  // 防止上一次 rejection 阻断队列
  chain = run.catch(() => {});
  return run;
}

async function throttle(signal) {
  throwIfAborted(signal);
  // 冷却期：必须等满到 cooldownUntil，期间不发请求
  while (cooldownUntil > Date.now()) {
    await sleep(cooldownUntil - Date.now(), signal);
    throwIfAborted(signal);
  }
  // 间隔节流：距上次请求至少 MIN_INTERVAL_MS
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait, signal);
  throwIfAborted(signal);
  lastRequestAt = Date.now();
}

/** 设置冷却：后续请求统一等待 waitMs */
function setCooldown(waitMs) {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + Math.max(500, waitMs));
}

// ─── 结果缓存（避免重复翻译相同文本）──────────────────────────
// 内存 LRU，SW 生命周期内有效；不持久化（翻译结果可能含隐私）
const CACHE_MAX = 60;
const cache = new Map();

function cacheKey(text, from, to) {
  return `${from || "auto"}→${to || "zh"}|${text}`;
}

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  // LRU: move to end
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

// ─── 透明的用量统计（仅显示用，不做硬限制）─────────────────────
// local 即可，不必占 sync 配额

async function getUsageStats() {
  const storage = chrome?.storage?.local || chrome?.storage?.sync;
  if (!storage?.get) return { date: new Date().toISOString().slice(0, 10), count: 0 };
  const { msTranslateUsage } = await storage.get("msTranslateUsage");
  const today = new Date().toISOString().slice(0, 10);

  if (!msTranslateUsage || msTranslateUsage.date !== today) {
    return { date: today, count: 0 };
  }
  return msTranslateUsage;
}

async function incrementUsage() {
  const stats = await getUsageStats();
  stats.count = (stats.count || 0) + 1;
  const storage = chrome?.storage?.local || chrome?.storage?.sync;
  if (storage?.set) {
    await storage.set({ msTranslateUsage: stats });
  }
  return stats;
}

// ─── 核心翻译 ─────────────────────────────────────────────────

/**
 * @typedef {Object} MicrosoftTranslateResult
 * @property {string} originalText
 * @property {string} translatedText
 * @property {string} from
 * @property {string} to
 * @property {string} [detectedLanguage]
 * @property {number} todayCount - 今日累计翻译次数（仅统计用）
 */

/**
 * 主翻译函数
 * - 自动管理 token：获取 → 缓存 → 预刷新
 * - 全局串行 + 短间隔
 * - 401 换 token 重试；429/403 有限退避
 *
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {Object}  [options]
 * @param {number}  [options.authRetries=1]  401 时额外重试次数
 * @param {number}  [options.rateLimitRetries=2]  429/403 时额外重试次数
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<MicrosoftTranslateResult>}
 */
export async function translate(
  text,
  from = "auto",
  to = "zh",
  { authRetries = 1, rateLimitRetries = 2, signal } = {}
) {
  if (!text?.trim()) {
    throw new Error("翻译文本不能为空");
  }

  const key = cacheKey(text, from, to);

  // 命中缓存则直接返回，不打网络
  const cached = cacheGet(key);
  if (cached) return cached;

  // 同文本 in-flight 去重：并发划同一段话只发一次请求
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = enqueue(() =>
    translateOnce(text, from, to, { authRetries, rateLimitRetries, signal })
  )
    .then((result) => {
      cacheSet(key, result);
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

async function translateOnce(
  text,
  from,
  to,
  { authRetries, rateLimitRetries, signal }
) {
  const msFrom = toMicrosoftLang(from);
  const msTo = toMicrosoftLang(to) || "zh-Hans";

  let url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(
    msTo
  )}`;
  if (msFrom) url += `&from=${encodeURIComponent(msFrom)}`;

  const body = JSON.stringify([{ Text: text }]);

  let lastError;
  let authAttempt = 0;
  let rateAttempt = 0;
  // 总循环上限：避免理论死循环（auth + rate + 少量缓冲）
  const maxLoops = authRetries + rateLimitRetries + 3;

  for (let loop = 0; loop < maxLoops; loop++) {
    throwIfAborted(signal);
    await throttle(signal);

    let token;
    try {
      token = await tokenManager.getToken();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (authAttempt < authRetries) {
        authAttempt += 1;
        tokenManager.invalidate();
        await sleep(400 * authAttempt, signal);
        continue;
      }
      break;
    }

    throwIfAborted(signal);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") throw makeAbortError();
      lastError = new Error(`网络请求失败: ${err.message}`);
      // 短暂网络抖动可重试一次档位（计入 rate 预算，避免无限）
      if (rateAttempt < rateLimitRetries) {
        rateAttempt += 1;
        await sleep(500 * rateAttempt, signal);
        continue;
      }
      break;
    }

    if (response.ok) {
      return await parseSuccess(response, text, from, to);
    }

    // ── 401: token 额度用尽 / 过期 → 刷新后重试 ──
    if (response.status === 401) {
      tokenManager.invalidate();
      lastError = new Error("微软翻译凭证失效，正在刷新后重试…");
      if (authAttempt < authRetries) {
        authAttempt += 1;
        console.warn(
          `[Microsoft] 401 (auth ${authAttempt}/${authRetries})，刷新 token 重试`
        );
        await sleep(200 * authAttempt, signal);
        continue;
      }
      lastError = new Error("微软翻译凭证失效，请稍后重试");
      break;
    }

    // ── 429: 限流 → 拉长退避 + 全局冷却 + 轮换 token ──
    // 实测：换新 token 后请求立即恢复（per-token 限流）
    if (response.status === 429) {
      lastError = new Error("微软翻译请求过于频繁，正在自动重试…");
      if (rateAttempt < rateLimitRetries) {
        const waitMs = parseRetryAfterMs(response, rateAttempt);
        rateAttempt += 1;
        // 设置全局冷却，阻止后续排队请求冲击服务端
        setCooldown(waitMs);
        // 轮换 token：per-token 限流下，换新 token 可立即恢复
        tokenManager.invalidate();
        console.warn(
          `[Microsoft] 429 (rate ${rateAttempt}/${rateLimitRetries})，冷却 ${waitMs}ms + 换 token 重试`
        );
        await sleep(waitMs, signal);
        continue;
      }
      // 耗尽后仍设一个较长冷却，避免用户立即重试再次触发
      setCooldown(10_000);
      lastError = new Error(
        "微软翻译请求过于频繁，请稍等 10 秒后重试，或切换其他翻译引擎"
      );
      break;
    }

    // ── 403: 可能限流或区域/策略限制 ──
    if (response.status === 403) {
      const bodyText = await response.text().catch(() => "");
      const looksLikeQuota =
        /max\s*count|exceeded|quota|limit/i.test(bodyText || "");
      if (looksLikeQuota) {
        tokenManager.invalidate();
      }
      lastError = new Error(
        looksLikeQuota
          ? "微软翻译额度暂时用尽，正在刷新凭证重试…"
          : "微软翻译服务暂时受限（403）"
      );
      if (rateAttempt < rateLimitRetries) {
        const waitMs = parseRetryAfterMs(response, rateAttempt);
        rateAttempt += 1;
        await sleep(waitMs, signal);
        continue;
      }
      lastError = new Error(
        looksLikeQuota
          ? "微软翻译额度暂时用尽，请稍后重试或切换其他翻译引擎"
          : "微软翻译服务暂时受限，请稍后重试或切换其他翻译引擎"
      );
      break;
    }

    // ── 5xx 可短暂重试 ──
    if (response.status >= 500 && rateAttempt < rateLimitRetries) {
      lastError = await parseError(response);
      rateAttempt += 1;
      await sleep(500 * rateAttempt, signal);
      continue;
    }

    lastError = await parseError(response);
    break;
  }

  throw lastError || new Error("微软翻译失败");
}

// ─── 响应解析 ─────────────────────────────────────────────────

async function parseSuccess(response, text, from, to) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("翻译响应解析失败：非法的 JSON 格式");
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("翻译响应格式异常");
  }

  const item = data[0];
  const translatedText = item.translations?.[0]?.text;
  if (!translatedText && translatedText !== "") {
    throw new Error("翻译结果为空");
  }

  let stats = { count: 0 };
  try {
    stats = await incrementUsage();
  } catch (_) {
    /* 统计失败不影响翻译 */
  }

  const output = {
    originalText: text,
    translatedText: translatedText || "",
    from,
    to,
    todayCount: stats.count,
  };

  if (item.detectedLanguage) {
    output.detectedLanguage = fromMicrosoftLang(
      item.detectedLanguage.language
    );
  }

  return output;
}

async function parseError(response) {
  const status = response.status;
  const body = await response.text().catch(() => "");

  if (status === 403) {
    return new Error(
      "微软翻译服务暂时受限，请稍后重试或切换其他翻译引擎"
    );
  }

  if (status === 429) {
    return new Error("微软翻译请求过于频繁，请稍后重试");
  }

  return new Error(
    `微软翻译 API 错误 (HTTP ${status}): ${body || response.statusText}`
  );
}

// ─── 工具函数 ─────────────────────────────────────────────────

/**
 * 获取今日用量（仅统计，不做限制）
 */
export async function getUsageStatsAPI() {
  const stats = await getUsageStats();
  return { todayCount: stats.count, date: stats.date };
}

/**
 * 测试连接
 */
export async function testConnection() {
  try {
    const result = await translate("Hello", "en", "zh");
    return {
      success: true,
      message: `连接成功！"Hello" → "${result.translatedText}"`,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/** @internal 单测用 */
export const __test__ = {
  toMicrosoftLang,
  fromMicrosoftLang,
  LANG_MAP,
  parseRetryAfterMs,
  MIN_INTERVAL_MS,
  makeAbortError,
  resetForTests() {
    tokenManager.invalidate();
    chain = Promise.resolve();
    lastRequestAt = 0;
    cooldownUntil = 0;
    cache.clear();
    inflight.clear();
  },
};
