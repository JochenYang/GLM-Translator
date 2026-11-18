/**
 * 哔哩哔哩 Index-Translate（免 Key）。
 *
 * 请求对齐官方客户端 inference/llm/call_api.py：
 *   POST https://index-translate.bilibili.com/v1/chat/completions
 *   无 Authorization。body 为 OpenAI Chat Completions，
 *   temperature=0，stream=false，chat_template_kwargs.enable_thinking=false。
 *
 * 短词场景会把 max_tokens 限制在 128。这里按整段翻译，按原文长度放大，上限 4096。
 * 非官方接口，没有 SLA，可能失效。
 */

const ENDPOINT = "https://index-translate.bilibili.com/v1/chat/completions";
const DEFAULT_MODEL = "Index-Translate-2B";
const MODELS = [
  "Index-Translate-2B",
  "Index-Translate-9B",
  "Index-Translate-35B-A3B",
];
const MAX_TEXT_LEN = 8000;
const REQUEST_TIMEOUT_MS = 20000;
const MIN_MAX_TOKENS = 256;
const MAX_MAX_TOKENS = 4096;

// 与官方客户端 LANG_NAMES 一致，并补上本插件语言列表里的其余语种。
const LANG_NAMES = {
  zh: "中文",
  "zh-CN": "中文",
  "zh-TW": "繁体中文",
  "zh-HK": "繁体中文",
  en: "英语",
  ja: "日语",
  ko: "韩语",
  fr: "法语",
  de: "德语",
  es: "西班牙语",
  ru: "俄语",
  th: "泰语",
  vi: "越南语",
  it: "意大利语",
  ar: "阿拉伯语",
  pl: "波兰语",
  da: "丹麦语",
  fi: "芬兰语",
  nl: "荷兰语",
  cs: "捷克语",
  pt: "葡萄牙语",
  "pt-PT": "葡萄牙语",
  "pt-BR": "葡萄牙语",
  sv: "瑞典语",
  tr: "土耳其语",
  hu: "匈牙利语",
  id: "印尼语",
  ms: "马来语",
  hi: "印地语",
};

export function normalizeModel(model) {
  return MODELS.includes(model) ? model : DEFAULT_MODEL;
}

export function languageName(code) {
  if (!code || code === "auto" || code === "detect") return "";
  return LANG_NAMES[code] || code;
}

export function buildPrompt(text, source, target) {
  const targetName = languageName(target) || target || "中文";
  const sourceName = languageName(source);
  const head = sourceName
    ? `请将以下${sourceName}文本翻译为${targetName}，直接输出翻译结果，不要进行任何解释。`
    : `请将以下文本翻译为${targetName}，直接输出翻译结果，不要进行任何解释。`;
  return `${head}\n\n${text}`;
}

export function maxTokensFor(text) {
  const estimate = Math.ceil(String(text).length * 2);
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, estimate));
}

export function buildRequestBody(text, source, target, model) {
  return {
    model: normalizeModel(model),
    messages: [{ role: "user", content: buildPrompt(text, source, target) }],
    temperature: 0,
    max_tokens: maxTokensFor(text),
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  };
}

const IMAGE_MAX_TOKENS = 1024;
const MAX_IMAGE_URL_LEN = 8_000_000;

export function buildImagePrompt(source, target) {
  const targetName = languageName(target) || "中文";
  const sourceName = languageName(source);
  if (sourceName) {
    return `请将图片中的${sourceName}文本翻译为${targetName}，直接输出翻译结果，不要进行任何解释。`;
  }
  return `请将图片中的文本翻译为${targetName}，直接输出翻译结果，不要进行任何解释。`;
}

export function buildImageRequestBody(dataUrl, source, target, model) {
  return {
    model: normalizeModel(model),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildImagePrompt(source, target) },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: IMAGE_MAX_TOKENS,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  };
}

/** 从一段 SSE 缓冲里取出已完整的 data 行，返回剩余半行和增量文本。 */
export function takeSseDeltas(buffer) {
  const lines = String(buffer).split(/\r?\n/);
  const rest = lines.pop() ?? "";
  const deltas = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) deltas.push(delta);
    } catch {
      /* 半截 JSON 留到下一包，这里的行已经以换行结束，解析失败就丢掉 */
    }
  }
  return { rest, deltas };
}

export function parseBilibiliResponse(json) {
  if (json?.error) {
    const msg = json.error.message || json.error.code || "请求失败";
    throw new Error(`哔哩哔哩翻译错误: ${String(msg).slice(0, 200)}`);
  }
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("哔哩哔哩翻译响应格式异常");
  }
  const translatedText = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (!translatedText) throw new Error("哔哩哔哩翻译结果为空");
  return translatedText;
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

const CACHE_MAX = 60;
const cache = new Map();

function cacheKey(text, from, to, model) {
  return `${normalizeModel(model)}|${from || "auto"}→${to || "zh"}|${text}`;
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
  const q = text == null ? "" : String(text);
  if (q.length > MAX_TEXT_LEN) {
    throw new Error(
      `文本超出哔哩哔哩翻译长度上限（${MAX_TEXT_LEN} 字符），请分段翻译`
    );
  }
  if (!q.trim()) throw new Error("翻译文本不能为空");
  return q;
}

/**
 * @param {string} text
 * @param {string} [from="auto"]
 * @param {string} [to="zh"]
 * @param {{ signal?: AbortSignal, fetchImpl?: Function, timeoutMs?: number, model?: string }} [options]
 * @returns {Promise<{ translatedText: string, from: string, to: string, via: string }>}
 */
export async function translate(text, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    fetchImpl = globalThis.fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
    model,
  } = options;
  throwIfAborted(signal);
  if (!fetchImpl) throw new Error("当前环境不支持网络请求");

  const q = normalizeQuery(text);
  const usedModel = normalizeModel(model);
  const key = cacheKey(q, from, to, usedModel);
  const cached = cacheGet(key);
  if (cached) return cached;

  const body = buildRequestBody(q, from, to, usedModel);
  const { signal: reqSignal, cleanup } = withTimeout(signal, timeoutMs);
  try {
    // 页面脚本改不了 Origin。扩展自带的 chrome-extension Origin 会被接口 412 拒绝，
    // 由 public/rules/provider_headers.json 改写成接口自己的源。
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      signal: reqSignal,
    });

    let json;
    try {
      json = await response.json();
    } catch {
      cleanup();
      throw new Error("哔哩哔哩翻译响应解析失败");
    }
    cleanup();

    if (!response.ok) {
      const msg = json?.error?.message || `HTTP ${response.status}`;
      throw new Error(`哔哩哔哩翻译请求失败（${String(msg).slice(0, 200)}）`);
    }

    const result = {
      translatedText: parseBilibiliResponse(json),
      from,
      to,
      via: "bilibili-index-translate",
    };
    cacheSet(key, result);
    return result;
  } catch (err) {
    cleanup();
    if (err?.name === "AbortError") {
      if (!signal?.aborted) throw new Error("哔哩哔哩翻译请求超时");
      throw makeAbortError();
    }
    throw err;
  }
}

/**
 * 图片里的文字翻译。content 是文本段加 image_url，返回仍是纯文本。
 * @param {string} dataUrl data:image/... 或 http(s) 图片地址
 */
export async function translateImage(dataUrl, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    fetchImpl = globalThis.fetch,
    timeoutMs = 60000,
    model,
    onChunk,
  } = options;
  throwIfAborted(signal);
  if (!fetchImpl) throw new Error("当前环境不支持网络请求");
  const url = dataUrl == null ? "" : String(dataUrl).trim();
  if (!url.startsWith("data:image/") && !url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("图片格式无法识别");
  }
  if (url.length > MAX_IMAGE_URL_LEN) {
    throw new Error("图片太大，请缩小截图后再试");
  }

  const body = buildImageRequestBody(url, from, to, model);
  body.stream = true;
  const { signal: reqSignal, cleanup } = withTimeout(signal, timeoutMs);
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      signal: reqSignal,
    });
    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        msg = json?.error?.message || msg;
      } catch {
        /* 风控页不是 JSON */
      }
      cleanup();
      throw new Error(`哔哩哔哩翻译请求失败（${String(msg).slice(0, 200)}）`);
    }

    const contentType = response.headers?.get?.("content-type") || "";
    if (!response.body || contentType.includes("application/json")) {
      const json = await response.json();
      cleanup();
      const translatedText = parseBilibiliResponse(json);
      onChunk?.(translatedText);
      return {
        translatedText,
        from,
        to,
        via: "bilibili-index-translate-image",
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const taken = takeSseDeltas(pending);
      pending = taken.rest;
      if (taken.deltas.length) {
        full += taken.deltas.join("");
        onChunk?.(full);
      }
    }
    pending += decoder.decode();
    const tail = takeSseDeltas(pending + "\n");
    if (tail.deltas.length) {
      full += tail.deltas.join("");
      onChunk?.(full);
    }
    cleanup();
    const translatedText = full.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!translatedText) throw new Error("哔哩哔哩翻译结果为空");
    return {
      translatedText,
      from,
      to,
      via: "bilibili-index-translate-image",
    };
  } catch (err) {
    cleanup();
    if (err?.name === "AbortError") {
      if (!signal?.aborted) throw new Error("哔哩哔哩翻译请求超时");
      throw makeAbortError();
    }
    throw err;
  }
}

export const __test__ = {
  ENDPOINT,
  DEFAULT_MODEL,
  MODELS,
  MAX_TEXT_LEN,
  normalizeModel,
  buildPrompt,
  buildRequestBody,
  buildImagePrompt,
  buildImageRequestBody,
  takeSseDeltas,
  parseBilibiliResponse,
  maxTokensFor,
};
