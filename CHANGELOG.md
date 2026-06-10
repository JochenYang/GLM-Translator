# Changelog

All notable changes to GLM Translator are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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