/**
 * Microsoft free translate (Edge translatetext endpoint): lang map,
 * request shape, response parsing, 429 backoff, cache, abort.
 * Run: node --test tests/unit/microsoftTranslate.test.mjs
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const {
  translate,
  __test__,
} = await import("../../src/services/microsoftTranslate.js");

const OK_BODY = [
  {
    detectedLanguage: { language: "en", score: 0.9 },
    translations: [{ text: "你好，世界", to: "zh-Hans" }],
  },
];

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    async json() {
      return typeof body === "string" ? JSON.parse(body) : body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

describe("microsoftTranslate lang map", () => {
  it("maps project codes to Microsoft codes", () => {
    assert.equal(__test__.toMicrosoftLang("zh"), "zh-Hans");
    assert.equal(__test__.toMicrosoftLang("zh-TW"), "zh-Hant");
    assert.equal(__test__.toMicrosoftLang("ja"), "ja");
    assert.equal(__test__.toMicrosoftLang("auto"), "");
    assert.equal(__test__.toMicrosoftLang(""), "");
  });

  it("reverse maps detected language back to project codes", () => {
    assert.equal(__test__.fromMicrosoftLang("zh-Hans"), "zh");
    assert.equal(__test__.fromMicrosoftLang("zh-Hant"), "zh-TW");
    assert.equal(__test__.fromMicrosoftLang("ja"), "ja");
    assert.equal(__test__.fromMicrosoftLang(null), null);
  });
});

describe("microsoftTranslate request shape", () => {
  beforeEach(() => {
    // 清空模块级 LRU 缓存：写入一条占位再整体淘汰不可行，改为逐 key 失效
    // —— 简化：每个用例用不同文本，天然绕开缓存
  });

  it("sends a JSON string array to translatetext, omits from when auto", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, OK_BODY);
    };

    const result = await translate("hello world", "auto", "zh", { fetchImpl });

    assert.equal(calls.length, 1);
    const { url, init } = calls[0];
    assert.ok(url.startsWith(__test__.TRANSLATE_URL));
    assert.ok(url.includes("to=zh-Hans"));
    assert.ok(url.includes("isEnterpriseClient=false"));
    assert.ok(!url.includes("from="));
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "omit");
    assert.deepEqual(JSON.parse(init.body), ["hello world"]);

    assert.equal(result.translatedText, "你好，世界");
    assert.equal(result.detectedLanguage, "en");
    assert.equal(result.via, "microsoft-edge");
  });

  it("sets explicit from param when source language given", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url });
      return jsonResponse(
        200,
        [
          {
            translations: [{ text: "こんにちは", to: "ja" }],
          },
        ],
        {}
      );
    };

    await translate("你好", "zh", "ja", { fetchImpl });

    assert.ok(calls[0].url.includes("from=zh-Hans"));
    assert.ok(calls[0].url.includes("to=ja"));
  });

  it("rejects overlong text before any network call", async () => {
    let called = 0;
    const fetchImpl = async () => {
      called += 1;
      return jsonResponse(200, OK_BODY);
    };

    await assert.rejects(
      translate("a".repeat(__test__.MAX_TEXT_LEN + 1), "auto", "zh", {
        fetchImpl,
      }),
      /长度上限/
    );
    assert.equal(called, 0);
  });
});

describe("microsoftTranslate response parsing", () => {
  it("throws on empty or malformed payloads", () => {
    assert.throws(() => __test__.parseTranslateResponse([]), /响应为空/);
    assert.throws(
      () => __test__.parseTranslateResponse([{ foo: 1 }]),
      /格式异常/
    );
  });

  it("extracts text and maps detected language", () => {
    const parsed = __test__.parseTranslateResponse([
      {
        detectedLanguage: { language: "zh-Hans", score: 1 },
        translations: [{ text: "你好", to: "en" }],
      },
    ]);
    assert.equal(parsed.translatedText, "你好");
    assert.equal(parsed.detectedLanguage, "zh");
  });
});

describe("microsoftTranslate retry & cache", () => {
  it("retries on 429 respecting Retry-After then succeeds", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(url);
      if (calls.length === 1) {
        return jsonResponse(429, "rate limited", { "retry-after": "0" });
      }
      return jsonResponse(200, OK_BODY);
    };

    const result = await translate("retry case", "auto", "zh", {
      fetchImpl,
      rateLimitRetries: 2,
    });

    assert.equal(calls.length, 2);
    assert.equal(result.translatedText, "你好，世界");
  });

  it("gives up after rateLimitRetries and surfaces HTTP status", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(429, "rate limited", { "retry-after": "0" });
    };

    await assert.rejects(
      translate("always 429", "auto", "zh", { fetchImpl, rateLimitRetries: 1 }),
      /HTTP 429/
    );
    assert.equal(calls, 2);
  });

  it("does not retry 4xx client errors", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(400, "bad request");
    };

    await assert.rejects(
      translate("bad request case", "auto", "zh", { fetchImpl }),
      /HTTP 400/
    );
    assert.equal(calls, 1);
  });

  it("caches identical (text, from, to) results", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_BODY);
    };

    const first = await translate("cache me", "auto", "zh", { fetchImpl });
    const second = await translate("cache me", "auto", "zh", { fetchImpl });

    assert.equal(calls, 1);
    assert.equal(second.translatedText, first.translatedText);
  });

  it("aborts via caller signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      translate("abort case", "auto", "zh", {
        fetchImpl: async () => jsonResponse(200, OK_BODY),
        signal: controller.signal,
      }),
      (err) => err.name === "AbortError" || /取消/.test(err.message)
    );
  });
});
