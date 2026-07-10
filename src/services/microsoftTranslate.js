/**
 * 微软免费翻译（Edge 内置同款接口）
 *
 * 1. GET https://edge.microsoft.com/translate/auth → JWT
 * 2. POST https://api-edge.cognitive.microsofttranslator.com/translate
 * 3. Token 缓存 + 预过期刷新 + 并发去重
 * 4. 401（token 额度用尽）→ 换 token 重试
 * 5. 429 / 短暂 403 → 退避重试，避免把接口“打爆”
 *
 * 注意：扩展 service worker 里不要强行改 User-Agent（会被忽略且易触发异常）。
 */

// ─── 语言代码映射 ─────────────────────────────────────────────
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
  he: "he",
  hi: "hi",
};

// Prefer short project codes for reverse map (zh over zh-CN when both map to zh-Hans)
const REVERSE_LANG_MAP = {};
const REVERSE_PRIORITY = ["zh", "en", "pt", "zh-TW", "zh-HK", "pt-PT", "pt-BR"];
for (const [short, ms] of Object.entries(LANG_MAP)) {
  if (!REVERSE_LANG_MAP[ms] || REVERSE_PRIORITY.includes(short)) {
    // only upgrade if empty or short is preferred primary
    if (!REVERSE_LANG_MAP[ms]) {
      REVERSE_LANG_MAP[ms] = short;
    }
  }
}
// Explicit canonical reverses
REVERSE_LANG_MAP["zh-Hans"] = "zh";
REVERSE_LANG_MAP["zh-Hant"] = "zh-TW";

function toMicrosoftLang(code) {
  if (!code || code === "auto") return null;
  return LANG_MAP[code] || code;
}

function fromMicrosoftLang(msCode) {
  return REVERSE_LANG_MAP[msCode] || msCode;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Token 管理器 ─────────────────────────────────────────────

class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = 0;
    this.refreshPromise = null;
  }

  async getToken() {
    // 缓冲 60s 提前刷新（token 约 10 分钟有效）
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }
    return this._refresh();
  }

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

  invalidate() {
    this.token = null;
    this.expiresAt = 0;
    this.refreshPromise = null;
  }
}

const tokenManager = new TokenManager();

// 全局串行队列：避免划词/分块并发打满免费接口
let chain = Promise.resolve();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 280;

function enqueue(task) {
  const run = chain.then(task, task);
  // 防止上一次 rejection 阻断队列
  chain = run.catch(() => {});
  return run;
}

async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

// ─── 用量统计（仅展示）───────────────────────────────────────

async function getUsageStats() {
  const { msTranslateUsage } = await chrome.storage.local.get(
    "msTranslateUsage"
  );
  const today = new Date().toISOString().slice(0, 10);
  if (!msTranslateUsage || msTranslateUsage.date !== today) {
    return { date: today, count: 0 };
  }
  return msTranslateUsage;
}

async function incrementUsage() {
  const stats = await getUsageStats();
  stats.count = (stats.count || 0) + 1;
  // local 即可，不必占 sync 配额
  await chrome.storage.local.set({ msTranslateUsage: stats });
  return stats;
}

// ─── 核心翻译 ─────────────────────────────────────────────────

/**
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {Object}  [options]
 * @param {number}  [options.retries=3]
 * @returns {Promise<object>}
 */
export async function translate(
  text,
  from = "auto",
  to = "zh",
  { retries = 3 } = {}
) {
  if (!text?.trim()) {
    throw new Error("翻译文本不能为空");
  }

  return enqueue(() => translateOnce(text, from, to, retries));
}

async function translateOnce(text, from, to, retries) {
  const msFrom = toMicrosoftLang(from);
  const msTo = toMicrosoftLang(to) || "zh-Hans";

  let url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(
    msTo
  )}`;
  if (msFrom) url += `&from=${encodeURIComponent(msFrom)}`;

  // 微软接口支持多段；当前单段即可
  const body = JSON.stringify([{ Text: text }]);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle();

    let token;
    try {
      token = await tokenManager.getToken();
    } catch (err) {
      lastError = err;
      // token 失败：短退避再试
      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
        tokenManager.invalidate();
        continue;
      }
      break;
    }

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
      });
    } catch (err) {
      lastError = new Error(`网络请求失败: ${err.message}`);
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      break;
    }

    if (response.ok) {
      return await parseSuccess(response, text, from, to);
    }

    // 401：token 用尽 / 过期 → 换新 token
    if (response.status === 401) {
      tokenManager.invalidate();
      lastError = new Error("微软翻译凭证失效，正在刷新后重试…");
      if (attempt < retries) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      break;
    }

    // 429：限流 → 退避后重试（可换 token）
    if (response.status === 429) {
      tokenManager.invalidate();
      lastError = new Error("微软翻译请求过于频繁，正在自动重试…");
      if (attempt < retries) {
        await sleep(800 * Math.pow(2, attempt)); // 0.8s, 1.6s, 3.2s…
        continue;
      }
      lastError = new Error("微软翻译请求过于频繁，请稍后再试");
      break;
    }

    // 403：可能限流或区域限制
    if (response.status === 403) {
      tokenManager.invalidate();
      const bodyText = await response.text().catch(() => "");
      lastError = new Error(
        bodyText.includes("Max") || bodyText.includes("count")
          ? "微软翻译额度暂时用尽，正在刷新凭证重试…"
          : "微软翻译服务暂时受限（403）"
      );
      if (attempt < retries) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      lastError = new Error(
        "微软翻译服务暂时受限，请稍后再试或切换其他翻译引擎"
      );
      break;
    }

    lastError = await parseError(response);
    // 其它 5xx 可重试
    if (response.status >= 500 && attempt < retries) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    break;
  }

  throw lastError || new Error("微软翻译失败");
}

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

  if (item.detectedLanguage?.language) {
    output.detectedLanguage = fromMicrosoftLang(
      item.detectedLanguage.language
    );
  }

  return output;
}

async function parseError(response) {
  const status = response.status;
  const body = await response.text().catch(() => "");
  return new Error(
    `微软翻译 API 错误 (HTTP ${status}): ${body || response.statusText}`
  );
}

export async function getUsageStatsAPI() {
  const stats = await getUsageStats();
  return { todayCount: stats.count, date: stats.date };
}

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

/** @internal test helpers */
export const __test__ = {
  toMicrosoftLang,
  fromMicrosoftLang,
  LANG_MAP,
};
