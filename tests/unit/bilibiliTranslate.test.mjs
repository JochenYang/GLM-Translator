/**
 * Unit tests for bilibili Index-Translate:
 * prompt, request body, model fallback, response parsing, no Authorization header.
 * Run: node --test tests/unit/bilibiliTranslate.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  translate,
  normalizeModel,
  buildPrompt,
  buildRequestBody,
  parseBilibiliResponse,
  __test__,
} = await import("../../src/services/bilibiliTranslate.js");

const OK_JSON = {
  id: "chatcmpl-test",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "你好" },
      finish_reason: "stop",
    },
  ],
};

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return typeof body === "string" ? JSON.parse(body) : body;
    },
  };
}

describe("bilibiliTranslate prompt and body", () => {
  it("uses the official prompt and disables thinking", () => {
    assert.equal(
      buildPrompt("Hello", "en", "zh"),
      "请将以下英语文本翻译为中文，直接输出翻译结果，不要进行任何解释。\n\nHello"
    );
    const body = buildRequestBody("Hello", "en", "zh", "Index-Translate-9B");
    assert.equal(body.model, "Index-Translate-9B");
    assert.equal(body.temperature, 0);
    assert.equal(body.stream, false);
    assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
    assert.equal(body.messages.length, 1);
    assert.equal(body.messages[0].role, "user");
    assert.ok(body.max_tokens >= 256);
  });

  it("falls back to Index-Translate-2B for unknown models", () => {
    assert.equal(normalizeModel("nope"), __test__.DEFAULT_MODEL);
    assert.equal(normalizeModel(undefined), "Index-Translate-2B");
    assert.equal(buildRequestBody("Hi", "en", "zh", "gpt-4").model, "Index-Translate-2B");
  });

  it("omits the source name when language is auto", () => {
    assert.match(buildPrompt("Hello", "auto", "ja"), /^请将以下文本翻译为日语/);
  });
});

describe("bilibiliTranslate response parsing", () => {
  it("reads choices[0].message.content and strips think tags", () => {
    assert.equal(parseBilibiliResponse(OK_JSON), "你好");
    assert.equal(
      parseBilibiliResponse({
        choices: [{ message: { content: "<think>draft</think>\n你好" } }],
      }),
      "你好"
    );
  });

  it("throws on error payload and empty content", () => {
    assert.throws(
      () => parseBilibiliResponse({ error: { message: "overloaded" } }),
      /overloaded/
    );
    assert.throws(
      () => parseBilibiliResponse({ choices: [{ message: { content: "  " } }] }),
      /结果为空/
    );
  });
});

describe("bilibiliTranslate dispatch", () => {
  it("posts chat completions without an Authorization header", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, OK_JSON);
    };

    const res = await translate("Hello there", "en", "zh", {
      fetchImpl,
      model: "Index-Translate-35B-A3B",
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, __test__.ENDPOINT);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, undefined);
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.model, "Index-Translate-35B-A3B");
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    assert.match(body.messages[0].content, /Hello there$/);
    assert.equal(res.translatedText, "你好");
    assert.equal(res.via, "bilibili-index-translate");
  });

  it("caches the same text, direction and model", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_JSON);
    };
    await translate("cache bili phrase", "en", "zh", { fetchImpl });
    await translate("cache bili phrase", "en", "zh", { fetchImpl });
    assert.equal(calls, 1);
  });

  it("does not send overlong text", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse(200, OK_JSON);
    };
    await assert.rejects(
      translate("y".repeat(__test__.MAX_TEXT_LEN + 1), "en", "zh", { fetchImpl }),
      /长度上限/
    );
    assert.equal(calls, 0);
  });
});
