/**
 * Unit tests for transmartTranslate (Tencent TranSmart free endpoint):
 * lang mapping, response parsing, error handling, caching, abort.
 * Run: node --test tests/unit/transmartTranslate.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  translate,
  toTransmartLang,
  fromTransmartLang,
  parseTransmartResponse,
  __test__,
} = await import("../../src/services/transmartTranslate.js");

const OK_TRANSMART_JSON = {
  header: { fn: "auto_translation", ret_code: "succ", time_cost: 30 },
  auto_translation: ["你好，世界"],
  src_lang: "en",
  tgt_lang: "zh",
};

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

describe("transmartTranslate lang map", () => {
  it("maps internal language codes to TranSmart codes", () => {
    assert.equal(toTransmartLang("zh"), "zh");
    assert.equal(toTransmartLang("zh-CN"), "zh");
    assert.equal(toTransmartLang("zh-TW"), "zh-TW");
    assert.equal(toTransmartLang("en"), "en");
    assert.equal(toTransmartLang("auto"), "auto");
  });

  it("reverse maps TranSmart detected language codes", () => {
    assert.equal(fromTransmartLang("zh"), "zh");
    assert.equal(fromTransmartLang("zh-TW"), "zh-TW");
    assert.equal(fromTransmartLang("en"), "en");
    assert.equal(fromTransmartLang(null), null);
  });
});

describe("transmartTranslate response parsing", () => {
  it("joins segments and extracts detected language", () => {
    const res = parseTransmartResponse(OK_TRANSMART_JSON);
    assert.equal(res.translatedText, "你好，世界");
    assert.equal(res.detectedLanguage, "en");
  });

  it("throws on error ret_code", () => {
    assert.throws(
      () =>
        parseTransmartResponse({
          header: { ret_code: "Auth-Failed" },
          message: "Rejected",
        }),
      /Auth-Failed/
    );
  });
});

describe("transmartTranslate dispatch & caching", () => {
  it("dispatches POST request with correct client key and headers", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, OK_TRANSMART_JSON);
    };

    const res = await translate("hello world", "auto", "zh", { fetchImpl });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, __test__.ENDPOINT);
    assert.equal(calls[0].init.method, "POST");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.header.fn, "auto_translation");
    assert.ok(body.header.client_key.startsWith("browser-chrome-130"));
    assert.equal(body.source.lang, "auto");
    assert.equal(body.target.lang, "zh");

    assert.equal(res.translatedText, "你好，世界");
    assert.equal(res.via, "tencent-transmart");
    assert.equal(res.detectedLanguage, "en");
  });

  it("caches duplicate requests", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_TRANSMART_JSON);
    };

    const r1 = await translate("cache tm test", "auto", "zh", { fetchImpl });
    const r2 = await translate("cache tm test", "auto", "zh", { fetchImpl });
    assert.equal(calls, 1);
    assert.equal(r1.translatedText, r2.translatedText);
  });

  it("rejects overlong text before network request", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_TRANSMART_JSON);
    };

    await assert.rejects(
      translate("y".repeat(__test__.MAX_TEXT_LEN + 1), "auto", "zh", {
        fetchImpl,
      }),
      /长度上限/
    );
    assert.equal(calls, 0);
  });
});
