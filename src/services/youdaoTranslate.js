/**
 * 有道免费翻译（默认引擎，免 Key）。
 *
 * 通道：
 * 1) 有智云 appKey/appSecret → 官方 OpenAPI（最稳定）：
 *    POST https://openapi.youdao.com/api，
 *    sign = SHA256(appKey + input + salt + curtime + appSecret)，
 *    input = q.length<=20 ? q : q前10+q长度+q后10。
 * 2) 无 key → 官网词典接口（免 key 兜底）：
 *    POST https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4，
 *    a = (q+keyfrom).length%10；t = Date.now()+""+a；
 *    inner = MD5(q+keyfrom)；
 *    sign = MD5("webmain" + q + t + SECRET + inner)。
 *
 * 注意：旧 webtranslate 通道已降级（返回译文与原文无关），PC 截图通道需
 * 原生 secretKey，均未采用。
 */

const TEXT_OPENAPI_URL = "https://openapi.youdao.com/api";
const JSONAPI_URL =
  "https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4";

// 官网公开 JS 内嵌的 Web 签名密钥（Public Web Key，非私有密钥）。
const JSONAPI_SECRET = "t2he2k4m2g6QKRigK0KAmSpXKgAezywG";
const JSONAPI_KEYFROM = "webfanyi.webmain";
const JSONAPI_CLIENT = "webmain";

const MAX_TEXT_LEN = 5000;

// 本项目短码（zh/en/ja…）→ 有道码；官网词典接口实际自动识别，这里只用于
// OpenAPI 与兜底解析的目标语言判断。
const TO_YOUDAO_LANG = {
  zh: "zh-CHS",
  "zh-CN": "zh-CHS",
  "zh-TW": "zh-CHT",
  "zh-HK": "zh-CHT",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  pt: "pt",
  ru: "ru",
  auto: "auto",
};

export function toYoudaoLang(code) {
  if (!code || code === "auto") return "auto";
  return TO_YOUDAO_LANG[code] || code;
}

const OPENAPI_ERRORS = {
  108: "appKey 无效（请检查有道智云配置）",
  202: "签名检验失败（请检查 appSecret）",
  401: "账户欠费",
  411: "访问频率受限，请稍后重试",
};

// ---------- MD5（RFC1321，输入 Uint8Array，输出 16 字节） ----------

function md5Bytes(input) {
  const origLen = input.length;
  const bitLen = origLen * 8;
  const withOne = origLen + 1;
  const padLen = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + padLen + 8;
  const msg = new Uint8Array(total);
  msg.set(input, 0);
  msg[origLen] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 8, bitLen >>> 0, true);
  dv.setUint32(total - 4, Math.floor(bitLen / 4294967296), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  }
  const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;

  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let k = 0; k < 64; k++) {
      let F;
      let g;
      if (k < 16) {
        F = (B & C) | (~B & D);
        g = k;
      } else if (k < 32) {
        F = (D & B) | (~D & C);
        g = (5 * k + 1) % 16;
      } else if (k < 48) {
        F = B ^ C ^ D;
        g = (3 * k + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * k) % 16;
      }
      F = (F + A + K[k] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[k])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true);
  odv.setUint32(4, b0, true);
  odv.setUint32(8, c0, true);
  odv.setUint32(12, d0, true);
  return out;
}

function bytesToHex(bytes) {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

const utf8Bytes = (str) => new TextEncoder().encode(str);
const md5Hex = (str) => bytesToHex(md5Bytes(utf8Bytes(str)));

function sha256Hex(str) {
  const subtle =
    globalThis.crypto?.subtle ||
    (typeof crypto !== "undefined" ? crypto.subtle : null);
  if (!subtle) return Promise.reject(new Error("当前环境不支持 SHA-256"));
  return subtle.digest("SHA-256", utf8Bytes(str)).then((d) => bytesToHex(new Uint8Array(d)));
}

// 有道 v3 input 截断
function truncateInput(q) {
  if (q.length <= 20) return q;
  return q.slice(0, 10) + q.length + q.slice(-10);
}

function randomSalt() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    /* 忽略，使用回退 */
  }
  const chars = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function buildOpenApiParams({ q, from, to, appKey, appSecret, translateOption = 0 }) {
  const curtime = Math.floor(Date.now() / 1000).toString();
  const salt = randomSalt();
  const signText = appKey + truncateInput(q) + salt + curtime + appSecret;
  return sha256Hex(signText).then((sign) => {
    const params = {
      q,
      from,
      to,
      appKey,
      salt,
      sign,
      signType: "v3",
      curtime,
    };
    // 0=NMT（默认），1=大模型 pro，2=大模型 lite（官方文档）
    if (translateOption === 1 || translateOption === 2) {
      params.translateOption = String(translateOption);
    }
    return params;
  });
}

function parseOpenApiResponse(json) {
  const code = String(json?.errorCode ?? "");
  if (code !== "0") {
    throw new Error(OPENAPI_ERRORS[code] || `翻译失败（errorCode=${code}）`);
  }
  const list = json?.translation || [];
  if (!list.length) throw new Error("翻译结果为空");
  return list.join("\n");
}

function buildJsonApiParams(q) {
  const a = (q + JSONAPI_KEYFROM).length % 10;
  const t = Date.now().toString() + a;
  const inner = md5Hex(q + JSONAPI_KEYFROM);
  const sign = md5Hex(JSONAPI_CLIENT + q + t + JSONAPI_SECRET + inner);
  return { q, t, client: JSONAPI_CLIENT, sign, keyfrom: JSONAPI_KEYFROM };
}

function firstString(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  return "";
}

function parseJsonApiResponse(json, to) {
  if (!json || typeof json !== "object") throw new Error("翻译响应解析失败");
  // 整句翻译：fanyi.tran 即直接译文（长句返回中只有该字段），优先级最高
  if (
    json.fanyi &&
    typeof json.fanyi.tran === "string" &&
    json.fanyi.tran.trim()
  ) {
    return json.fanyi.tran.trim();
  }
  const wantZh = /zh|chs|cht|cn/i.test(to || "");
  const cands = [];
  const ec = json.ec || {};
  if (Array.isArray(ec.web_trans) && ec.web_trans.length) {
    cands.push({ zh: 3, text: firstString(ec.web_trans) });
  }
  const trs = ec.word?.trs;
  if (Array.isArray(trs) && trs.length && trs[0]?.tran) {
    cands.push({ zh: 2, text: firstString(trs[0].tran) });
  }
  const ceTrs = json.ce?.word?.trs;
  if (Array.isArray(ceTrs) && ceTrs.length) {
    const texts = [];
    for (const item of ceTrs) {
      if (texts.length >= 3) break;
      if (typeof item["#text"] === "string" && item["#text"].trim()) {
        texts.push(item["#text"].trim());
      }
    }
    if (texts.length) cands.push({ zh: 0, text: texts.join("; ") });
  }
  const webT = json.web_trans?.["web-translation"];
  if (Array.isArray(webT) && webT.length) {
    const val = webT[0]?.trans?.[0] ? firstString(webT[0].trans[0].value) : "";
    if (val) cands.push({ zh: 1, text: val });
  }
  if (!cands.length) throw new Error("未找到译文");
  cands.sort((x, y) => (wantZh ? y.zh - x.zh : x.zh - y.zh));
  return cands[0].text;
}

function postForm(url, params, signal, fetchImpl) {
  const body = new URLSearchParams();
  for (const k of Object.keys(params)) body.append(k, params[k]);
  return fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal,
  }).then((resp) => {
    if (!resp.ok) throw new Error(`翻译请求失败（HTTP ${resp.status}）`);
    return resp.text();
  });
}

function normalizeQuery(text) {
  let q = text == null ? "" : String(text);
  if (q.length > MAX_TEXT_LEN) q = q.slice(0, MAX_TEXT_LEN);
  if (!q.trim()) throw new Error("翻译文本不能为空");
  return q;
}

function makeAbortError() {
  if (typeof DOMException === "function") {
    return new DOMException("Aborted", "AbortError");
  }
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

/**
 * 有道翻译（与 translator.js 约定的 provider translate 同签名）。
 * @returns {Promise<{ translatedText: string, via: string }>}
 */
export async function translate(text, from = "auto", to = "zh", options = {}) {
  const {
    signal,
    appKey = "",
    appSecret = "",
    translateOption = 0,
    fetchImpl = globalThis.fetch,
  } = options;
  if (signal?.aborted) throw makeAbortError();
  if (!fetchImpl) throw new Error("当前环境不支持网络请求");
  const q = normalizeQuery(text);
  const ydFrom = toYoudaoLang(from);
  const ydTo = toYoudaoLang(to);

  if (appKey && appSecret) {
    const params = await buildOpenApiParams({
      q,
      from: ydFrom,
      to: ydTo,
      appKey,
      appSecret,
      translateOption,
    });
    const raw = await postForm(TEXT_OPENAPI_URL, params, signal, fetchImpl);
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("翻译响应解析失败");
    }
    return { translatedText: parseOpenApiResponse(json), via: "youdao-openapi" };
  }

  const params = buildJsonApiParams(q);
  const raw = await postForm(JSONAPI_URL, params, signal, fetchImpl);
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("翻译响应解析失败");
  }
  return { translatedText: parseJsonApiResponse(json, ydTo), via: "youdao-web-dict" };
}

export const __test__ = {
  toYoudaoLang,
  truncateInput,
  md5Hex,
  md5Bytes,
  sha256Hex,
  buildOpenApiParams,
  parseOpenApiResponse,
  buildJsonApiParams,
  parseJsonApiResponse,
  MAX_TEXT_LEN,
};
