/**
 * Unit tests for shipped pure helpers.
 * Run: node --test tests/unit/helpers.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { escapeHtml, setTextContentSafe } from "../../src/utils/escapeHtml.js";
import {
  detectLanguage,
  resolveSourceLanguage,
  toSpeechLang,
} from "../../src/utils/detectLanguage.js";
import {
  isDomainBlacklisted,
  parseBlacklistInput,
  normalizeHost,
} from "../../src/utils/domainBlacklist.js";
import {
  splitApiSecrets,
  mergeApiSecrets,
  planSecretsMigration,
} from "../../src/utils/secureStorage.js";
import {
  containsRejectionPattern,
  pickDetectedLanguage,
} from "../../src/services/translator.js";
import { normalizeGeneralSettings } from "../../src/utils/generalSettings.js";
import { __test__ as msTest } from "../../src/services/microsoftTranslate.js";
import {
  speakText,
  scoreVoice,
  pickBestVoice,
  isHighQualityVoice,
  shouldUseOnlineTts,
  splitTtsChunks,
  buildGoogleTtsUrl,
  resolveSpeakLang,
} from "../../src/utils/speak.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

describe("escapeHtml (shipped)", () => {
  it("escapes script tags so they are not markup", () => {
    const evil = `<script>alert("xss")</script>`;
    const out = escapeHtml(evil);
    assert.equal(out.includes("<script>"), false);
    assert.equal(out.includes("&lt;script&gt;"), true);
    assert.match(out, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
  });

  it("escapes ampersand and quotes", () => {
    assert.equal(escapeHtml(`a&b<"'>`), "a&amp;b&lt;&quot;&#39;&gt;");
  });

  it("setTextContentSafe never assigns HTML", () => {
    // minimal element mock
    const el = { textContent: "" };
    setTextContentSafe(el, `<img onerror=alert(1) src=x>`);
    assert.equal(el.textContent, `<img onerror=alert(1) src=x>`);
  });
});

describe("detectLanguage (shipped)", () => {
  it("detects simplified Chinese", () => {
    const r = detectLanguage("这是一段中文测试内容，用于语言检测。");
    assert.equal(r.code, "zh");
    assert.ok(r.confidence > 0.4);
  });

  it("detects Japanese via kana (not Han alone)", () => {
    const r = detectLanguage("こんにちは、世界。これは日本語のテストです。");
    assert.equal(r.code, "ja");
  });

  it("detects Korean hangul", () => {
    const r = detectLanguage("안녕하세요 이것은 한국어 테스트입니다");
    assert.equal(r.code, "ko");
  });

  it("detects English", () => {
    const r = detectLanguage(
      "This is a short English paragraph for language detection tests."
    );
    assert.equal(r.code, "en");
  });

  it("resolveSourceLanguage respects fixed source", () => {
    const r = resolveSourceLanguage("Hello world", "fr");
    assert.equal(r.sourceLang, "fr");
    assert.equal(r.detected, null);
  });

  it("resolveSourceLanguage auto detects", () => {
    const r = resolveSourceLanguage("你好世界", "auto");
    assert.equal(r.sourceLang, "zh");
    assert.equal(r.detected, "zh");
  });

  it("toSpeechLang maps zh to zh-CN", () => {
    assert.equal(toSpeechLang("zh"), "zh-CN");
    assert.equal(toSpeechLang("en"), "en-US");
    assert.equal(toSpeechLang("ja"), "ja-JP");
  });
});

describe("domainBlacklist (shipped)", () => {
  it("matches exact and subdomain", () => {
    assert.equal(isDomainBlacklisted("github.com", ["github.com"]), true);
    assert.equal(isDomainBlacklisted("www.github.com", ["github.com"]), true);
    assert.equal(isDomainBlacklisted("gitlab.com", ["github.com"]), false);
  });

  it("matches leading-dot entries", () => {
    assert.equal(
      isDomainBlacklisted("docs.google.com", [".google.com"]),
      true
    );
  });

  it("parseBlacklistInput dedupes", () => {
    const list = parseBlacklistInput("a.com\na.com, b.com");
    assert.deepEqual(list, ["a.com", "b.com"]);
  });

  it("normalizeHost lowercases", () => {
    assert.equal(normalizeHost("Example.COM."), "example.com");
  });
});

describe("secureStorage split (shipped pure)", () => {
  it("strips apiKey from meta", () => {
    const { meta, secret } = splitApiSecrets({
      id: "x",
      provider: "glm",
      apiKey: "sk-secret",
      model: "m",
    });
    assert.equal(meta.apiKey, undefined);
    assert.equal(meta.hasApiKey, true);
    assert.equal(secret.apiKey, "sk-secret");
    const merged = mergeApiSecrets(meta, secret);
    assert.equal(merged.apiKey, "sk-secret");
  });
});

describe("planSecretsMigration (shipped pure)", () => {
  it("moves savedApis apiKey into secrets map and strips from meta", () => {
    const plan = planSecretsMigration({
      savedApis: [
        { id: "glm_1", provider: "glm", apiKey: "sk-live", model: "m" },
      ],
      existingSecrets: {},
    });
    assert.equal(plan.savedApis[0].apiKey, undefined);
    assert.equal(plan.secrets.glm_1.apiKey, "sk-live");
    assert.equal(plan.didMigrateSecrets, true);
  });

  it("assigns id when missing so secret is not dropped", () => {
    const plan = planSecretsMigration({
      savedApis: [{ provider: "custom", apiKey: "sk-no-id", url: "https://x.test/v1" }],
      existingSecrets: {},
    });
    assert.equal(plan.savedApis.length, 1);
    assert.ok(plan.savedApis[0].id, "must assign stable id");
    assert.equal(plan.savedApis[0].apiKey, undefined);
    const id = plan.savedApis[0].id;
    assert.equal(plan.secrets[id].apiKey, "sk-no-id");
  });

  it("migrates legacy glmConfig/customConfig keys out of sync shape", () => {
    const plan = planSecretsMigration({
      savedApis: [],
      legacyConfigs: {
        glmConfig: { apiKey: "sk-glm", model: "glm-4" },
        customConfig: { apiKey: "sk-custom", url: "https://api.example.com/v1" },
        volcengineConfig: { apiKey: "sk-volc", model: "doubao" },
      },
      existingSecrets: {},
    });
    assert.equal(plan.legacyConfigs.glmConfig.apiKey, undefined);
    assert.equal(plan.legacyConfigs.customConfig.apiKey, undefined);
    assert.equal(plan.legacyConfigs.volcengineConfig.apiKey, undefined);
    assert.equal(plan.secrets.legacy_glm.apiKey, "sk-glm");
    assert.equal(plan.secrets.legacy_custom.apiKey, "sk-custom");
    assert.equal(plan.secrets.legacy_volcengine.apiKey, "sk-volc");
    // Promoted into savedApis without raw keys
    for (const api of plan.savedApis) {
      assert.equal(api.apiKey, undefined);
    }
    assert.ok(plan.savedApis.length >= 3);
  });
});

describe("pickDetectedLanguage (shipped)", () => {
  it("prefers Microsoft/provider detectedLanguage over local", () => {
    const r = pickDetectedLanguage({
      sourceLang: "auto",
      localDetected: "zh",
      localConfidence: 0.9,
      providerDetected: "en",
    });
    assert.equal(r.detectedLanguage, "en");
    assert.equal(r.detectionSource, "provider");
  });

  it("falls back to local when provider silent and source auto", () => {
    const r = pickDetectedLanguage({
      sourceLang: "auto",
      localDetected: "ja",
      localConfidence: 0.8,
      providerDetected: null,
    });
    assert.equal(r.detectedLanguage, "ja");
    assert.equal(r.detectionSource, "local");
  });
});

describe("containsRejectionPattern (shipped)", () => {
  it("does not false-positive on benign words like weapon/sorry alone", () => {
    assert.equal(containsRejectionPattern("The weapon was found."), false);
    assert.equal(containsRejectionPattern("I am sorry for the delay."), false);
    assert.equal(containsRejectionPattern("Access blocked by firewall."), false);
  });

  it("flags explicit refusal phrases", () => {
    assert.equal(
      containsRejectionPattern("抱歉，我无法翻译该内容"),
      true
    );
    assert.equal(
      containsRejectionPattern("I cannot translate this material"),
      true
    );
  });
});

describe("normalizeGeneralSettings", () => {
  it("applies defaults and clamps", () => {
    const g = normalizeGeneralSettings({ minSelectionLength: 9999 });
    assert.equal(g.minSelectionLength, 500);
    assert.equal(g.enableSelection, true);
  });
});

describe("selection content path XSS static contract", () => {
  it("content.js applies result via textContent not unescaped innerHTML templates", () => {
    const src = readFileSync(join(root, "src/content/content.js"), "utf8");
    // Must use textContent for result
    assert.match(src, /resultEl\.textContent\s*=\s*response\.translatedText/);
    assert.match(src, /resultEl\.textContent\s*=\s*response\.error/);
    // Must not embed translatedText into innerHTML template strings
    assert.equal(
      /innerHTML\s*=\s*[`'"][\s\S]*\$\{[^}]*translatedText/.test(src),
      false
    );
    assert.equal(
      /innerHTML\s*=\s*[`'"][\s\S]*\$\{[^}]*response\.error/.test(src),
      false
    );
  });
});

describe("manifest least-privilege host_permissions", () => {
  it("does not grant blanket http://*/ and https://*/ as host_permissions", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "manifest.json"), "utf8")
    );
    const hosts = manifest.host_permissions || [];
    assert.equal(hosts.includes("http://*/"), false);
    assert.equal(hosts.includes("https://*/"), false);
    assert.ok(
      (manifest.optional_host_permissions || []).some(
        (p) => p.includes("https://") || p.includes("http://")
      ),
      "custom endpoints should use optional_host_permissions"
    );
    assert.ok(hosts.some((h) => h.includes("open.bigmodel.cn")));
  });
});

describe("background translate path ensures host permission from selected config", () => {
  it("index.js loads selected config URL, not only request.customUrl", () => {
    const src = readFileSync(join(root, "src/background/index.js"), "utf8");
    assert.match(src, /getSelectedApiConfig/);
    assert.match(src, /ensureHostPermission/);
    // Must not only gate on request.customUrl
    assert.match(src, /resolveConfigUrl|selected\?\.config\?\.url|getSelectedApiConfig/);
    assert.equal(
      /if\s*\(\s*request\.customUrl\s*\)\s*\{\s*await ensureHostPermission/.test(
        src
      ),
      false,
      "must not only call ensureHostPermission when request.customUrl is set"
    );
  });
});

describe("microsoftTranslate helpers (shipped)", () => {
  it("maps zh/en and leaves auto as null from", () => {
    assert.equal(msTest.toMicrosoftLang("zh"), "zh-Hans");
    assert.equal(msTest.toMicrosoftLang("en"), "en");
    assert.equal(msTest.toMicrosoftLang("auto"), null);
    // 原版 LANG_MAP 后写覆盖：zh-CN 与 zh 均映射 zh-Hans，反向可能是 zh 或 zh-CN
    const back = msTest.fromMicrosoftLang("zh-Hans");
    assert.ok(back === "zh" || back === "zh-CN", `got ${back}`);
  });

  it("matches pre-1.3.0 lean path (no throttle queue)", () => {
    const src = readFileSync(
      join(root, "src/services/microsoftTranslate.js"),
      "utf8"
    );
    assert.match(src, /edge\.microsoft\.com\/translate\/auth/);
    assert.match(
      src,
      /api-edge\.cognitive\.microsofttranslator\.com\/translate/
    );
    // 1.3.0 过度优化已回退：不得再有串行队列/强制间隔
    assert.equal(/MIN_INTERVAL_MS/.test(src), false);
    assert.equal(/function enqueue\(/.test(src), false);
    assert.equal(/rateLimitRetries/.test(src), false);
    // 401 才重试，与 1.2.7 一致
    assert.match(src, /retries\s*=\s*1/);
  });
});

describe("speakText Web Speech helper (shipped)", () => {
  it("is implemented with local + online Chinese fallback", () => {
    const src = readFileSync(join(root, "src/utils/speak.js"), "utf8");
    assert.match(src, /speechSynthesis/);
    assert.match(src, /SpeechSynthesisUtterance/);
    assert.match(src, /translate\.google\.com\/translate_tts/);
    assert.match(src, /shouldUseOnlineTts/);
    assert.equal(typeof speakText, "function");
  });

  it("pickBestVoice prefers Natural Microsoft English over generic", () => {
    const voices = [
      { name: "Microsoft David", lang: "en-US", voiceURI: "david", localService: true, default: false },
      {
        name: "Microsoft Aria Online (Natural) - English (United States)",
        lang: "en-US",
        voiceURI: "aria",
        localService: false,
        default: false,
      },
      { name: "Google 普通话", lang: "zh-CN", voiceURI: "zh", localService: false, default: false },
    ];
    const best = pickBestVoice(voices, "en");
    assert.equal(best.voiceURI, "aria");
    assert.ok(scoreVoice(voices[1], "en-US") > scoreVoice(voices[0], "en-US"));
  });

  it("treats Huihui Desktop as low quality and prefers online Chinese TTS", () => {
    const huihui = {
      name: "Microsoft Huihui Desktop - Chinese (Simplified)",
      lang: "zh-CN",
      voiceURI: "huihui",
      localService: true,
      default: true,
    };
    const xiaoxiao = {
      name: "Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)",
      lang: "zh-CN",
      voiceURI: "xiaoxiao",
      localService: false,
      default: false,
    };
    assert.equal(isHighQualityVoice(huihui), false);
    assert.equal(isHighQualityVoice(xiaoxiao), true);
    assert.equal(shouldUseOnlineTts(huihui, scoreVoice(huihui, "zh-CN"), "zh-CN"), true);
    assert.equal(shouldUseOnlineTts(xiaoxiao, scoreVoice(xiaoxiao, "zh-CN"), "zh-CN"), false);
    assert.ok(scoreVoice(xiaoxiao, "zh-CN") > scoreVoice(huihui, "zh-CN"));
  });

  it("splitTtsChunks and google url helpers work", () => {
    const chunks = splitTtsChunks("你好。".repeat(80), 40);
    assert.ok(chunks.length > 1);
    const url = buildGoogleTtsUrl("你好世界", "zh-CN");
    assert.match(url, /translate\.google\.com\/translate_tts/);
    assert.match(url, /tl=zh-CN/);
    assert.equal(resolveSpeakLang("这是一段中文", "en").startsWith("zh"), true);
  });

  it("content.js uses speakText for selection TTS", () => {
    const src = readFileSync(join(root, "src/content/content.js"), "utf8");
    assert.match(src, /speakText/);
    assert.match(src, /rate:\s*0\.85/);
  });

  it("background proxies fetchTtsAudio", () => {
    const src = readFileSync(join(root, "src/background/index.js"), "utf8");
    assert.match(src, /fetchTtsAudio/);
    assert.match(src, /translate\.google\.com/);
  });
});
