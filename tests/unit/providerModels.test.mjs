/**
 * Guard against model-list drift: every model in providers.js must have
 * i18n keys (name + desc) in both locales, and every provider.model.* i18n
 * key must map to a real model (no orphans after removals).
 * Run: node --test tests/unit/providerModels.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { PROVIDER_PRESETS } = await import("../../src/config/providers.js");
const { __translations } = await import("../../src/utils/i18n.js");

// 不在 providers.js 模型清单中、但 i18n 键仍需保留的 ID：
// - custom-model：模型下拉的“自定义”选项
// - glm-4.5-flash：已从清单移除的旧免费模型，保留键用于旧存档配置的显示
const KEY_ALLOWLIST = new Set(["custom-model", "glm-4.5-flash"]);

function allModelIds() {
  const ids = [];
  for (const provider of Object.values(PROVIDER_PRESETS)) {
    for (const model of provider.models || []) {
      ids.push(model.id);
    }
  }
  return ids;
}

describe("provider model lists are in sync with i18n", () => {
  it("every model in providers.js has name & desc keys in zh and en", () => {
    for (const id of allModelIds()) {
      for (const lang of ["zh", "en"]) {
        const nameKey = `provider.model.${id}`;
        const descKey = `${nameKey}.desc`;
        assert.ok(
          __translations[lang][nameKey] !== undefined,
          `missing i18n key ${nameKey} in ${lang}`
        );
        assert.ok(
          __translations[lang][descKey] !== undefined,
          `missing i18n key ${descKey} in ${lang}`
        );
      }
    }
  });

  it("no orphan provider.model.* keys (removed models get cleaned up)", () => {
    const known = new Set(allModelIds());
    for (const lang of ["zh", "en"]) {
      for (const key of Object.keys(__translations[lang])) {
        if (!key.startsWith("provider.model.")) continue;
        const id = key
          .slice("provider.model.".length)
          .replace(/\.desc$/, "");
        if (KEY_ALLOWLIST.has(id)) continue;
        assert.ok(
          known.has(id),
          `orphan i18n key "${key}" in ${lang} has no model in providers.js`
        );
      }
    }
  });
});
