/**
 * Unit tests for MV3 messaging error classification.
 * Run: node --test tests/unit/messagingErrors.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  classifyMessagingError,
  MESSAGING_ERROR_KIND,
} from "../../src/utils/messagingErrors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

describe("classifyMessagingError (shipped)", () => {
  it("marks an invalidated extension context as unrecoverable", () => {
    assert.equal(
      classifyMessagingError(new Error("Extension context invalidated.")),
      MESSAGING_ERROR_KIND.CONTEXT_INVALIDATED
    );
  });

  it("marks a service worker script load failure as unrecoverable", () => {
    assert.equal(
      classifyMessagingError(
        new Error("Failed to load the script unexpectedly")
      ),
      MESSAGING_ERROR_KIND.SCRIPT_LOAD_FAILED
    );
  });

  it("retries connection errors raised while the worker wakes up", () => {
    assert.equal(
      classifyMessagingError(
        new Error("Could not establish connection. Receiving end does not exist.")
      ),
      MESSAGING_ERROR_KIND.RETRYABLE
    );
  });

  it("retries a worker recycled mid-request", () => {
    assert.equal(
      classifyMessagingError(
        new Error(
          "A listener indicated an asynchronous response by returning true, " +
            "but the message channel closed before a response was received"
        )
      ),
      MESSAGING_ERROR_KIND.RETRYABLE
    );
  });

  it("leaves provider and unrelated errors alone", () => {
    assert.equal(
      classifyMessagingError(new Error("微软翻译请求失败（HTTP 429）")),
      MESSAGING_ERROR_KIND.OTHER
    );
    assert.equal(classifyMessagingError(undefined), MESSAGING_ERROR_KIND.OTHER);
    assert.equal(classifyMessagingError(""), MESSAGING_ERROR_KIND.OTHER);
  });

  it("accepts a raw message string", () => {
    assert.equal(
      classifyMessagingError("Failed to load the script"),
      MESSAGING_ERROR_KIND.SCRIPT_LOAD_FAILED
    );
  });
});

describe("popup/content retry wrapper wiring", () => {
  it("stops retrying unrecoverable connection errors and keeps the raw error", () => {
    for (const file of ["src/popup/Popup.vue", "src/content/content.js"]) {
      const src = readFileSync(join(root, file), "utf8");
      assert.match(src, /classifyMessagingError/, `${file} must classify errors`);
      assert.match(
        src,
        /MESSAGING_ERROR_KIND\.CONTEXT_INVALIDATED/,
        `${file} must special-case an invalidated context`
      );
      assert.match(
        src,
        /MESSAGING_ERROR_KIND\.SCRIPT_LOAD_FAILED/,
        `${file} must special-case a failed service worker script load`
      );
      assert.match(src, /chrome:\/\/extensions/, `${file} must state the recovery step`);
      assert.match(src, /lastError\?\.message/, `${file} must keep the raw error`);
    }
  });
});
