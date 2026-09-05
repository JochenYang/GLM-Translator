/**
 * Youdao free translate (default engine): signing, parsing, dispatch.
 * Run: node --test tests/unit/youdaoTranslate.test.mjs
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const {
  translate,
  __test__,
} = await import("../../src/services/youdaoTranslate.js");

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    async json() {
      return typeof body === "string" ? JSON.parse(body) : body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

describe("youdaoTranslate signing (cross-checked with node:crypto)", () => {
  it("md5Hex matches node crypto (incl. CJK + sign shapes)", () => {
    for (const s of [
      "",
      "abc",
      "hello world",
      "你好世界",
      "webmainhello world17880000000001t2he2k4m2g6QKRigK0KAmSpXKgAezywG5eb63b",
    ]) {
      assert.equal(
        __test__.md5Hex(s),
        crypto.createHash("md5").update(s, "utf8").digest("hex")
      );
    }
  });

  it("sha256Hex matches node crypto", async () => {
    assert.equal(
      await __test__.sha256Hex("abc"),
      crypto.createHash("sha256").update("abc").digest("hex")
    );
  });

  it("truncateInput follows v3 rule", () => {
    assert.equal(__test__.truncateInput("hello"), "hello");
    assert.equal(
      __test__.truncateInput("12345678901234567890"),
      "12345678901234567890"
    );
    assert.equal(
      __test__.truncateInput("1234567890123456789012345"),
      "1234567890" + 25 + "6789012345"
    );
  });

  it("toYoudaoLang maps short codes", () => {
    assert.equal(__test__.toYoudaoLang("zh"), "zh-CHS");
    assert.equal(__test__.toYoudaoLang("zh-TW"), "zh-CHT");
    assert.equal(__test__.toYoudaoLang("en"), "en");
    assert.equal(__test__.toYoudaoLang("auto"), "auto");
    assert.equal(__test__.toYoudaoLang("ja"), "ja");
  });

  it("buildJsonApiParams signs like the web client", () => {
    const qp = __test__.buildJsonApiParams("hello world");
    assert.equal(qp.client, "webmain");
    assert.equal(qp.keyfrom, "webfanyi.webmain");
    const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");
    const suffix = String(("hello world" + "webfanyi.webmain").length % 10);
    assert.ok(qp.t.endsWith(suffix), qp.t);
    assert.equal(
      qp.sign,
      md5(
        "webmain" +
          "hello world" +
          qp.t +
          "t2he2k4m2g6QKRigK0KAmSpXKgAezywG" +
          md5("hello world" + "webfanyi.webmain")
      )
    );
  });

  it("buildOpenApiParams signs with sha256", async () => {
    const p = await __test__.buildOpenApiParams({
      q: "hello",
      from: "en",
      to: "zh-CHS",
      appKey: "k",
      appSecret: "s",
    });
    assert.equal(p.signType, "v3");
    assert.equal(p.translateOption, undefined);
    assert.equal(
      p.sign,
      crypto
        .createHash("sha256")
        .update("k" + "hello" + p.salt + p.curtime + "s", "utf8")
        .digest("hex")
    );
    const p2 = await __test__.buildOpenApiParams({
      q: "hello",
      from: "en",
      to: "zh-CHS",
      appKey: "k",
      appSecret: "s",
      translateOption: 2,
    });
    assert.equal(p2.translateOption, "2");
  });
});

describe("youdaoTranslate parsing", () => {
  it("prefers fanyi.tran for sentences", () => {
    const en2zh = {
      fanyi: { input: "hello world", type: "en2zh-CHS", tran: "你好，世界。" },
    };
    assert.equal(__test__.parseJsonApiResponse(en2zh, "zh"), "你好，世界。");
    const zh2en = {
      fanyi: {
        input: "今天天气不错",
        type: "zh-CHS2en",
        tran: "The weather is nice today.",
      },
    };
    assert.equal(
      __test__.parseJsonApiResponse(zh2en, "en"),
      "The weather is nice today."
    );
  });

  it("prefers ec.web_trans for Chinese targets", () => {
    const out = __test__.parseJsonApiResponse(
      { ec: { web_trans: ["你好世界"] } },
      "zh-CHS"
    );
    assert.equal(out, "你好世界");
  });

  it("joins ce trs for English targets", () => {
    const out = __test__.parseJsonApiResponse(
      {
        ce: {
          word: {
            trs: [
              { "#text": "The weather is good today." },
              { "#text": "It's a fine day today." },
            ],
          },
        },
      },
      "en"
    );
    assert.equal(out, "The weather is good today.; It's a fine day today.");
  });

  it("falls back to web_trans value", () => {
    const out = __test__.parseJsonApiResponse(
      {
        web_trans: {
          "web-translation": [{ trans: [{ value: "你好世界" }] }],
        },
      },
      "zh"
    );
    assert.equal(out, "你好世界");
  });

  it("throws when nothing usable", () => {
    assert.throws(() => __test__.parseJsonApiResponse({}, "zh"), /未找到译文/);
  });

  it("maps openapi error codes", () => {
    assert.throws(
      () => __test__.parseOpenApiResponse({ errorCode: "108" }),
      /appKey/
    );
  });
});

describe("youdaoTranslate dispatch (mocked fetch)", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock;

  beforeEach(() => {
    fetchMock = mock.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  it("keyless path posts jsonapi and returns via youdao-web-dict", async () => {
    fetchMock.mock.mockImplementation(async (url) => {
      assert.match(String(url), /jsonapi_s/);
      return jsonResponse(200, { ec: { web_trans: ["你好"] } });
    });
    const r = await translate("hello", "en", "zh");
    assert.equal(r.translatedText, "你好");
    assert.equal(r.via, "youdao-web-dict");
  });

  it("key path posts openapi and returns via youdao-openapi", async () => {
    fetchMock.mock.mockImplementation(async (url) => {
      assert.match(String(url), /openapi\.youdao\.com\/api/);
      return jsonResponse(200, { errorCode: "0", translation: ["你好"] });
    });
    const r = await translate("hello", "en", "zh", {
      appKey: "k",
      appSecret: "s",
    });
    assert.equal(r.translatedText, "你好");
    assert.equal(r.via, "youdao-openapi");
  });

  it("rejects empty text", async () => {
    await assert.rejects(() => translate("   ", "en", "zh"), /不能为空/);
  });

  it("aborts when signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    await assert.rejects(
      () => translate("x", "en", "zh", { signal: ac.signal }),
      { name: "AbortError" }
    );
  });
});
