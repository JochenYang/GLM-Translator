# Changelog

All notable changes to GLM Translator are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-09-25

### Added

- **Microsoft free translation restored on the new Edge endpoint**: Microsoft
  replaced the retired JWT auth flow with a keyless
  `edge.microsoft.com/translate/translatetext` endpoint (verified live:
  Japanese, long sentences and mixed-language batches all translate).
  `microsoftTranslate.js` is rebuilt around it — no token machinery, with
  429/5xx backoff (Retry-After aware), in-memory LRU cache, abort support and
  a 20k-char limit with 10k chunking for long text.
- **Engine switcher in the popup**: a dropdown under the language selects
  switches engines in place. Keyless engines (Microsoft/Youdao) switch
  instantly; AI engines appear once configured in Settings, with inline
  warning + revert when unconfigured. Switching re-translates pending input.
- **Project conventions**: `AGENTS.md` documents architecture, the engine
  checklist, i18n rules, design tokens and release steps.
- `tests/unit/providerModels.test.mjs` guards model-list sync between
  `providers.js` and i18n (missing keys and orphans both fail the run).

### Changed

- **Settings page redesign** (design-system pass): semantic Tailwind colors
  (`primary/success/danger/warning`) + `--gt-*` CSS tokens + shared component
  classes; Options gets a sidebar navigation with icon tabs; provider cards
  show in-use/configured states; all strings i18n'd (zh/en). Deprecated
  `SettingsPanel.vue`, `AnimatedCard.vue`, `ParticleBackground.vue` removed.
- **Model lists refreshed for translation** (verified against official docs):
  GLM defaults to `glm-4.7-flash` (4.5-flash retires 2026-01-30) and adds
  `glm-5.3`; Volcengine adds the dedicated
  `doubao-seed-translation-250915`; Hunyuan/Qwen-MT/DeepSeek descriptions
  updated to current facts.
- **Toasts unified top-center** (save/success notifications).
- Microsoft four-square logo icon regenerated (`public/icons/microsoft.png`).

### Fixed

- **Model dropdown showed raw i18n keys** for models without translations
  (e.g. `provider.model.hunyuan-turbos-latest`): `t()` returns the key when
  missing, so `|| fallback` never fired. Model labels now fall back to the
  canonical name/description after an explicit key-existence check.

## [1.4.0] - 2026-09-05

### Changed

- **Default engine switched from Microsoft free to Youdao free**: Microsoft
  retired `edge.microsoft.com/translate/auth`, so the Microsoft provider,
  its token/queue machinery (`src/services/microsoftTranslate.js`), usage
  stats, Edge host permissions and `public/icons/microsoft.png` are removed.
  The new default `youdao` provider needs no key (official-dict web channel);
  users with a Youdao AI Cloud `appKey/appSecret` automatically use the
  official OpenAPI instead.

### Fixed

- **Youdao requests 403 inside the extension**: `dict.youdao.com` enforces an
  `Origin` allowlist (no `Origin` or `fanyi.youdao.com` → 200, anything else
  including `chrome-extension://` → 403, reproduced with plain HTTPS). Since
  `fetch` cannot touch the forbidden `Origin` header, static
  `declarativeNetRequest` rules (`public/rules/youdao_headers.json`) now strip
  it for the two Youdao translate hosts before sending.

## [1.3.3] - 2026-08-03

### Fixed

- **Microsoft free auth endpoint shut down**: Microsoft retired
  `edge.microsoft.com/translate/auth` (returns 404 for all clients), so the
  free translate path can no longer obtain a JWT. The token fetch now treats
  404/410 as a deterministic shutdown: it raises a clear, actionable error
  telling the user to switch engines, does not burn retries, and remembers the
  endpoint as dead for 5 minutes to avoid re-requesting on every selection.
  No code change can restore this endpoint — switch to a key-based engine
  (e.g. GLM, SiliconFlow) or a custom API in Settings.

## [1.3.2] - 2026-07-24

### Fixed

- **Microsoft free translate 429 storms**: Restored a light serial queue + 1s
  min-interval. On 429, limited backoff respects `Retry-After`, rotates the JWT
  token (per-token rate limit — new token recovers immediately), and sets a
  global cooldown to block queued requests from hammering the server. After
  retries are exhausted, a 10s cooldown is set and the user is told to wait or
  switch engines.
- **Throttle bug fix**: The previous cooldown check used a single `if` that
  could re-enter the rate-limit window immediately after cooldown expired,
  causing back-to-back requests. Now uses a `while` loop to guarantee the full
  cooldown is served before any request proceeds.
- **In-flight dedup**: Concurrent calls with identical text share a single
  network request via an in-flight promise map, preventing duplicate queued
  requests on rapid re-selection.
- **In-memory result cache**: Identical text (same from→to) is served from an
  LRU cache (60 entries, SW lifetime) instead of re-hitting the network.
- **Removed forced `User-Agent`**: MV3 service worker ignores custom UA and it
  may trigger anomalies; auth now uses `cache: "no-store"` only.
- **Cancel/supersede**: Microsoft requests now honor `AbortSignal` via the
  unified `translateTextChunked` cancel path.

## [1.3.1] - 2026-07-10

### Fixed

- **Microsoft free translate rate limits / slowness after 1.3.0**: Reverted
  over-aggressive client throttling (serial queue, min-interval delays, multi-
  retry on 429) that caused more 429s and slower responses. Restored the 1.2.7
  lean path (token cache + 401 single retry). Microsoft requests no longer go
  through AI preprocess/chunking/cancel supersede.

## [1.3.0] - 2026-07-10

### Security

- Selection UI now renders translation/error text via `textContent` (XSS fix).
- API keys moved to `chrome.storage.local`; sync stores non-secret metadata only,
  with migration from older sync-stored configs.
- `host_permissions` narrowed to known provider origins; custom APIs use optional
  host permissions.

### Added

- Shared language detection (`detectLanguage`); detected language shown in
  selection popup and toolbar popup.
- Selection window: original + translation, in-window language controls, Esc /
  outside-click dismiss, multi-chunk progress, drag listener cleanup.
- Options: translation history, domain blacklist, min selection length, save
  toast, **Chinese/English TTS preview**.
- Speech: prefer high-quality system voices; fall back to free Google TTS when
  only robotic Chinese Desktop voices are available.
- Unit tests: `pnpm test` (`tests/unit/helpers.test.mjs`).

### Fixed

- Microsoft free translate: rate-limit backoff, request serialization, remove
  unreliable User-Agent override, larger chunks to reduce 429s.
- Connection test no longer temporarily overwrites saved API configs.
- Translate path ensures optional host permission from the selected custom URL
  (not only when `customUrl` is sent by the UI).

### Changed

- Unified OpenAI-compatible chat-completions path; default single strategy;
  reduced rejection-pattern false positives.
- Version bump to 1.3.0.

## [1.2.7] - 2026-06-10

### Fixed

- **Long text translation failure**: Text longer than ~5000 characters failed with
  `Resource::kQuotaBytesPerItem quota exceeded`. This was a Chrome storage quota
  limit on the message payload, not an API limit. Translation now chunks long
  text into <=2000-character blocks (preserving paragraph/sentence boundaries),
  translates each block serially, and merges the results.
- **Prompt injection leaking into translated output**: Fake system tags
  (`<system-reminder>`, `<system>`, `<<SYS>>`, `<|system|>`, `### System:`,
  `[SYSTEM]`, `<!-- system ... -->`) and command-like sentences hidden in user
  input were sometimes echoed back in the translation. A zero-trust sanitization
  layer now strips these before sending text to the LLM.

### Changed

- Removed the hard `maxlength="5000"` cap on the popup textarea.
- Popup now shows progress (`正在翻译 N/M 段…`) during long translations.
- Trimmed the `professional` system prompt to reduce per-request payload.
- Translation cache moved from `chrome.storage.sync` (8 KB/item limit) to
  `chrome.storage.local` (10 MB/item).

### Added

- `src/utils/textChunker.js`: paragraph / sentence / line / space aware text
  splitter. `parts.join('')` is byte-identical to the input.

## [1.2.6] - 2026-06-08

### Fixed

- Missing GLM provider name in i18n bundles.

## [1.2.5] - 2026-06-05

### Fixed

- Race condition when waking up the MV3 service worker for translation.

[1.2.7]: https://github.com/JochenYang/GLM-Translator/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/JochenYang/GLM-Translator/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/JochenYang/GLM-Translator/compare/v1.2.4...v1.2.5