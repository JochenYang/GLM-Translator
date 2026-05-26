/**
 * 微软免费翻译服务
 *
 * 实现原理（逆向自 Edge 内置翻译）：
 * 1. 从 edge.microsoft.com/translate/auth 获取 JWT token
 * 2. 用 Bearer token 调 api-edge.cognitive.microsofttranslator.com/translate
 * 3. Token 缓存 + 预过期刷新 + 并发去重
 *
 * 配额机制：
 * 微软的限频是 token 粒度的——每个 JWT 可用一定次数
 * 用完返回 401 "Max count exceeded" → 自动换新 token 续命
 * 所以没有"每日上限"，只有 per-token 的透明管理
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

// 反向映射（微软代码 → 项目短代码）
const REVERSE_LANG_MAP = {};
for (const [short, ms] of Object.entries(LANG_MAP)) {
  REVERSE_LANG_MAP[ms] = short;
}

function toMicrosoftLang(code) {
  if (!code || code === "auto") return null;
  return LANG_MAP[code] || code;
}

function fromMicrosoftLang(msCode) {
  return REVERSE_LANG_MAP[msCode] || msCode;
}

// ─── Token 管理器 ─────────────────────────────────────────────
// 单例 — 浏览器插件生命周期内只有一个实例

class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = 0; // 毫秒时间戳
    this.refreshPromise = null; // 去重锁（对应 IMT 的 BP()）
  }

  /**
   * 获取有效 token
   * 缓冲 90 秒提前刷新（token 实际有效期约 10 分钟）
   */
  async getToken() {
    if (this.token && Date.now() < this.expiresAt - 90_000) {
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
    const response = await fetch("https://edge.microsoft.com/translate/auth", {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Token 获取失败 (HTTP ${response.status})`
      );
    }

    const token = await response.text();
    this.token = token;

    // 解析 JWT payload 获取过期时间
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
    } catch {
      this.expiresAt = Date.now() + 5 * 60 * 1000;
    }

    return token;
  }

  /** 强制标记 token 过期，下次 getToken 会刷新 */
  invalidate() {
    this.expiresAt = 0;
    this.refreshPromise = null;
  }
}

// 全局单例
const tokenManager = new TokenManager();

// ─── 透明的用量统计（仅显示用，不做硬限制）─────────────────────
// 微软的限额在服务端（per-token），客户端不需要计数器拦截
// 这里只记个数让用户在 UI 里看到 "已用 X 次"

async function getUsageStats() {
  const { msTranslateUsage } = await chrome.storage.sync.get("msTranslateUsage");
  const today = new Date().toISOString().slice(0, 10);

  if (!msTranslateUsage || msTranslateUsage.date !== today) {
    return { date: today, count: 0 };
  }
  return msTranslateUsage;
}

async function incrementUsage() {
  const stats = await getUsageStats();
  stats.count = (stats.count || 0) + 1;
  await chrome.storage.sync.set({ msTranslateUsage: stats });
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
 * - 遇到 401（token 额度用尽）自动换新 token 重试一次
 *
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {Object}  [options]
 * @param {number}  [options.retries=1]  401 时最多重试次数
 * @returns {Promise<MicrosoftTranslateResult>}
 */
export async function translate(text, from = "auto", to = "zh", { retries = 1 } = {}) {
  if (!text?.trim()) {
    throw new Error("翻译文本不能为空");
  }

  const msFrom = toMicrosoftLang(from);
  const msTo = toMicrosoftLang(to) || "zh-Hans";

  // 构建 URL
  let url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${msTo}`;
  if (msFrom) url += `&from=${msFrom}`;

  const body = JSON.stringify([{ Text: text }]);

  // 尝试请求（401 时可重试）
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    // 每次重试都用最新 token（第一次正常拿，重试时已刷新）
    const token = await tokenManager.getToken();

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
        },
        body,
      });
    } catch (err) {
      lastError = new Error(`网络请求失败: ${err.message}`);
      break; // 网络错误不可重试
    }

    // ── 正常返回 ──
    if (response.ok) {
      return await parseSuccess(response, text, from, to);
    }

    // ── 401: token 额度用尽 → 刷新后重试 ──
    if (response.status === 401) {
      console.warn(
        `[Microsoft] 401 (attempt ${attempt + 1}/${retries + 1})，刷新 token 重试`
      );
      tokenManager.invalidate();
      lastError = new Error("翻译额度暂时用尽，正在换新 token 重试…");
      continue; // 进入下一轮循环，拿新 token 重试
    }

    // ── 其他错误 ──
    lastError = await parseError(response);
    break;
  }

  throw lastError;
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
  if (!translatedText) {
    throw new Error("翻译结果为空");
  }

  // 累计用量（不影响功能）
  const stats = await incrementUsage();

  const output = {
    originalText: text,
    translatedText,
    from,
    to,
    todayCount: stats.count,
  };

  if (item.detectedLanguage) {
    output.detectedLanguage = fromMicrosoftLang(item.detectedLanguage.language);
  }

  return output;
}

async function parseError(response) {
  const status = response.status;
  const body = await response.text().catch(() => "");

  if (status === 403) {
    tokenManager.invalidate();
    return new Error(
      "微软翻译服务暂时受限（403），可能是请求过于频繁，请稍后重试"
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
