/**
 * Unit tests for googleTranslate (GTX free endpoint):
 * lang mapping, response parsing, error handling, caching, abort.
 * Run: node --test tests/unit/googleTranslate.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  translate,
  toGoogleLang,
  fromGoogleLang,
  parseGoogleResponse,
  __test__,
} = await import("../../src/services/googleTranslate.js");

const OK_GOOGLE_JSON = [
  [
    ["你好", "hello", null, null, 1],
    ["，世界", ", world", null, null, 1],
  ],
  null,
  "en",
];

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return typeof body === "string" ? JSON.parse(body) : body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

describe("googleTranslate lang map", () => {
  it("maps internal language codes to Google codes", () => {
    assert.equal(toGoogleLang("zh"), "zh-CN");
    assert.equal(toGoogleLang("zh-CN"), "zh-CN");
    assert.equal(toGoogleLang("zh-TW"), "zh-TW");
    assert.equal(toGoogleLang("en"), "en");
    assert.equal(toGoogleLang("ja"), "ja");
    assert.equal(toGoogleLang("auto"), "auto");
    assert.equal(toGoogleLang(""), "auto");
  });

  it("reverse maps Google detected language codes to internal codes", () => {
    assert.equal(fromGoogleLang("zh-CN"), "zh");
    assert.equal(fromGoogleLang("zh-TW"), "zh-TW");
    assert.equal(fromGoogleLang("en"), "en");
    assert.equal(fromGoogleLang("ja"), "ja");
    assert.equal(fromGoogleLang(null), null);
  });
});

describe("googleTranslate response parsing", () => {
  it("joins segments and extracts detected language", () => {
    const res = parseGoogleResponse(OK_GOOGLE_JSON);
    assert.equal(res.translatedText, "你好，世界");
    assert.equal(res.detectedLanguage, "en");
  });

  it("throws on empty or non-array payload", () => {
    assert.throws(() => parseGoogleResponse(null), /格式异常/);
    assert.throws(() => parseGoogleResponse([]), /格式异常/);
    assert.throws(() => parseGoogleResponse([[[]]]), /为空/);
  });
});

describe("googleTranslate dispatch & caching", () => {
  it("dispatches GET request with correct gtx query params", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return jsonResponse(200, OK_GOOGLE_JSON);
    };

    const res = await translate("hello, world", "auto", "zh", { fetchImpl });
    assert.equal(calls.length, 1);
    const u = new URL(calls[0]);
    assert.equal(u.searchParams.get("client"), "gtx");
    assert.equal(u.searchParams.get("sl"), "auto");
    assert.equal(u.searchParams.get("tl"), "zh-CN");
    assert.equal(u.searchParams.get("dt"), "t");
    assert.equal(u.searchParams.get("q"), "hello, world");

    assert.equal(res.translatedText, "你好，世界");
    assert.equal(res.via, "google-gtx");
    assert.equal(res.detectedLanguage, "en");
  });

  it("caches duplicate requests", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_GOOGLE_JSON);
    };

    const r1 = await translate("cache test text", "auto", "zh", { fetchImpl });
    const r2 = await translate("cache test text", "auto", "zh", { fetchImpl });
    assert.equal(calls, 1);
    assert.equal(r1.translatedText, r2.translatedText);
  });

  it("rejects overlong text before network request", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_GOOGLE_JSON);
    };

    await assert.rejects(
      translate("x".repeat(__test__.MAX_TEXT_LEN + 1), "auto", "zh", {
        fetchImpl,
      }),
      /长度上限/
    );
    assert.equal(calls, 0);
  });

  it("aborts when signal is triggered", async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      translate("abort test", "auto", "zh", {
        signal: controller.signal,
        fetchImpl: async () => jsonResponse(200, OK_GOOGLE_JSON),
      }),
      (err) => err.name === "AbortError" || /取消/.test(err.message)
    );
  });
});
