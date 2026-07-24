/**
 * Microsoft free-translate: rate-limit, serial queue, abort.
 * Run: node --test tests/unit/microsoftTranslate.test.mjs
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// Minimal chrome.storage for usage stats
globalThis.chrome = {
  storage: {
    local: {
      _data: {},
      async get(key) {
        if (typeof key === "string") {
          return { [key]: this._data[key] };
        }
        const out = {};
        for (const k of key) out[k] = this._data[k];
        return out;
      },
      async set(obj) {
        Object.assign(this._data, obj);
      },
    },
    sync: {
      async get() {
        return {};
      },
      async set() {},
    },
  },
};

const {
  translate,
  __test__,
} = await import("../../src/services/microsoftTranslate.js");

function makeJwt(expSec = Math.floor(Date.now() / 1000) + 600) {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSec })).toString(
    "base64url"
  );
  return `${header}.${payload}.sig`;
}

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: {
      get(name) {
        const key = Object.keys(headers).find(
          (k) => k.toLowerCase() === String(name).toLowerCase()
        );
        return key ? headers[key] : null;
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

function successBody(text = "你好") {
  return [
    {
      detectedLanguage: { language: "en", score: 1 },
      translations: [{ text, to: "zh-Hans" }],
    },
  ];
}

describe("microsoftTranslate rate-limit & queue", () => {
  /** @type {import('node:test').MockFunctionContext | null} */
  let fetchMock;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    __test__.resetForTests();
    chrome.storage.local._data = {};
    fetchMock = mock.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  it("parseRetryAfterMs prefers Retry-After seconds and caps", () => {
    const res = jsonResponse(429, "", { "Retry-After": "3" });
    assert.equal(__test__.parseRetryAfterMs(res, 0), 3000);
    const big = jsonResponse(429, "", { "Retry-After": "99" });
    assert.equal(__test__.parseRetryAfterMs(big, 0), 10_000);
    const fallback = jsonResponse(429, "");
    assert.equal(__test__.parseRetryAfterMs(fallback, 0), 800);
    assert.equal(__test__.parseRetryAfterMs(fallback, 1), 1600);
  });

  it("retries once on 429 then succeeds (rotates token on 429)", async () => {
    let authN = 0;
    let translateCalls = 0;
    fetchMock.mock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/translate/auth")) {
        authN += 1;
        return jsonResponse(200, makeJwt());
      }
      if (u.includes("/translate")) {
        translateCalls += 1;
        if (translateCalls === 1) {
          return jsonResponse(429, "Too Many Requests", {
            "Retry-After": "0",
          });
        }
        return jsonResponse(200, successBody("世界"));
      }
      throw new Error(`unexpected url ${u}`);
    });

    const result = await translate("Hello-rotate", "en", "zh", {
      rateLimitRetries: 2,
      authRetries: 1,
    });
    assert.equal(result.translatedText, "世界");
    assert.equal(translateCalls, 2);
    // 429 must rotate token (invalidate → re-auth)
    assert.ok(authN >= 2, `expected authN>=2, got ${authN}`);
  });

  it("401 invalidates token and retries with new token", async () => {
    let authN = 0;
    let translateN = 0;
    fetchMock.mock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/translate/auth")) {
        authN += 1;
        return jsonResponse(200, makeJwt());
      }
      if (u.includes("/translate")) {
        translateN += 1;
        if (translateN === 1) return jsonResponse(401, "Max count exceeded");
        return jsonResponse(200, successBody("好的"));
      }
      throw new Error(`unexpected url ${u}`);
    });

    const result = await translate("ok", "en", "zh", {
      authRetries: 1,
      rateLimitRetries: 0,
    });
    assert.equal(result.translatedText, "好的");
    assert.equal(authN, 2);
    assert.equal(translateN, 2);
  });

  it("serializes concurrent translate calls", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    fetchMock.mock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/translate/auth")) {
        return jsonResponse(200, makeJwt());
      }
      if (u.includes("/translate")) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 40));
        inFlight -= 1;
        return jsonResponse(200, successBody("串行"));
      }
      throw new Error(`unexpected url ${u}`);
    });

    // 三段不同文本，确保不命中缓存
    await Promise.all([
      translate("a-different", "en", "zh", { rateLimitRetries: 0 }),
      translate("b-different", "en", "zh", { rateLimitRetries: 0 }),
      translate("c-different", "en", "zh", { rateLimitRetries: 0 }),
    ]);
    assert.equal(maxInFlight, 1);
  });

  it("serves repeated translate from cache (no second network call)", async () => {
    let translateCalls = 0;
    fetchMock.mock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/translate/auth")) {
        return jsonResponse(200, makeJwt());
      }
      if (u.includes("/translate")) {
        translateCalls += 1;
        return jsonResponse(200, successBody("缓存测试"));
      }
      throw new Error(`unexpected url ${u}`);
    });

    const r1 = await translate("cached-text", "en", "zh", {
      rateLimitRetries: 0,
    });
    const r2 = await translate("cached-text", "en", "zh", {
      rateLimitRetries: 0,
    });
    assert.equal(r1.translatedText, "缓存测试");
    assert.equal(r2.translatedText, "缓存测试");
    assert.equal(translateCalls, 1, "second call should hit cache");
  });

  it("aborts when signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    await assert.rejects(
      () =>
        translate("x", "en", "zh", {
          signal: ac.signal,
          rateLimitRetries: 0,
        }),
      (err) => err?.name === "AbortError"
    );
  });

  it("throws final 429 message after exhausting retries", async () => {
    fetchMock.mock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/translate/auth")) {
        return jsonResponse(200, makeJwt());
      }
      return jsonResponse(429, "Too Many Requests", { "Retry-After": "0" });
    });

    await assert.rejects(
      () =>
        translate("spam-text-unique-2", "en", "zh", {
          rateLimitRetries: 1,
          authRetries: 0,
        }),
      /请求过于频繁/
    );
  });
});
