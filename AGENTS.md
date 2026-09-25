# AGENTS.md

GLM Translator 的项目规范。更具体的优先级：用户直接指示 > 本文 > 用户全局 `~/.zcode/AGENTS.md`。

## 项目概览

Chrome MV3 翻译扩展。技术栈：Vue 3（Options API）+ Tailwind CSS 3 + Vite（@crxjs/vite-plugin）。UI 文案中英双语（自研 i18n）。包管理用 npm（`npm test` / `npm run build` / `npm run dev`）。

## 目录结构

- `src/services/translator.js` — 翻译统一入口：provider 分发、分块、取消、历史、连接测试
- `src/services/*Translate.js` — 各引擎实现（youdao / microsoft；AI 厂商走统一 chat-completions）
- `src/config/providers.js` — **引擎与模型清单的唯一事实来源**（名称、图标、模型列表、默认模型）
- `src/utils/secureStorage.js` — 密钥只存 `chrome.storage.local`（`apiSecrets`），sync 只存元数据
- `src/utils/i18n.js` — 全部 UI 文案（zh/en 两段，键名式扁平结构）
- `src/popup/`、`src/options/`、`src/components/` — UI；`src/background/` — Service Worker
- `public/rules/` — declarativeNetRequest 规则；`public/icons/` — 引擎图标

## 新增 / 修改翻译引擎的检查单

1. 引擎实现放 `src/services/`，导出 `translate(text, from, to, options)`，返回 `{ translatedText, from, to, via, detectedLanguage? }`，支持 `options.signal`（AbortSignal）
2. 免 Key 引擎：在 `providers.js` 标 `noApiKeyRequired: true`，并加入 `secureStorage.js` 的免 Key 分支与 `providerOrigins.js` 域名列表
3. 域名进 `manifest.json` 的 `host_permissions`
4. `providers.js` 加 preset 与模型列表；`i18n.js` 补齐中英键
5. `ProviderSetup.vue` 的 `getProviderLogo` 映射图标（`public/icons/*.png`）
6. 新增模型必须同步 i18n 键——`tests/unit/providerModels.test.mjs` 会拦截漂移
7. 引擎逻辑配单测（参考 `microsoftTranslate.test.mjs` 的 mock fetch 模式）

## i18n 规则

- 所有用户可见文案走 `t(key)`，zh/en 两段都要补；硬编码中文进模板视为缺陷
- `t()` 缺键时返回键名本身；做兜底必须先比较 `translated !== key`
- 模型名称显示用 `ProviderSetup.modelLabel()`，不要在模板里手拼 `provider.model.` 键

## 设计系统

- 语义色走 Tailwind 别名：`primary / success / danger / warning`（`tailwind.config.cjs`）
- scoped 样式里的视觉值用 `src/assets/tailwind.css` 的 `--gt-*` CSS 变量，禁止新写硬编码 hex
- 组件类优先：`.btn-primary / .btn-secondary / .input / .select / .card-section / .badge-* / .notice-*`
- toast 通知统一**顶部居中**（`fixed left-1/2 top-4 -translate-x-1/2`）
- 图标风格统一 stroke（`fill="none" stroke="currentColor" stroke-width="2"`）

## 安全底线

- API Key / appSecret 只进 `chrome.storage.local`，永不写入 sync、日志或返回值
- 翻译请求只发往对应引擎的 preset 域名或用户自定义 URL；自定义域名走 optional host permission
- 免费逆向接口（微软 Edge 通道等）无官方 SLA，UI 文案需保留"可能失效"的说明

## 测试与发布

- `npm test` — node:test 单测（引擎签名/解析/重试、清单同步守卫）；改引擎必跑
- `npm run build` — 产物输出 `dist/`（已 gitignore）；发布/加载扩展前必须重新构建
- 版本号三处同步：`manifest.json`、`package.json`、`CHANGELOG.md`（新增版本条目置顶）

## Git 约定

- 提交格式 `<type>(<scope>): <subject>`，body 用 `-` 分点，末尾独立一行 `Verified: <验证结论>`
- 涉及密钥存储、权限边界的改动，提交前过一遍安全自查（输入校验、错误信息不泄露细节）
