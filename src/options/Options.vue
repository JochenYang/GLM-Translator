<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <!-- 顶部栏 -->
    <header
      class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"
    >
      <div class="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
        <img
          :src="logoUrl"
          alt="GLM Translator"
          class="h-8 w-auto"
        />
        <h1 class="text-base font-semibold">
          {{ t("settings.title") }}
        </h1>

        <div class="ml-auto flex items-center gap-3">
          <div
            class="flex items-center rounded-lg bg-slate-100 p-1"
            role="group"
            :aria-label="t('settings.language.title')"
          >
            <button
              v-for="lang in ['zh', 'en']"
              :key="lang"
              @click="switchLanguage(lang)"
              :class="[
                'rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                currentLanguage === lang
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900',
              ]"
            >
              {{ lang === "zh" ? t("lang.chinese") : t("lang.english") }}
            </button>
          </div>
          <span class="badge-neutral">v{{ version }}</span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-6 py-6">
      <div class="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <!-- 侧边导航 -->
        <nav
          class="md:sticky md:top-[72px] md:self-start"
          :aria-label="t('settings.title')"
        >
          <div class="card flex gap-1 p-2 md:flex-col">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="['nav-item', activeTab === tab.id ? 'nav-item-active' : '']"
              :aria-current="activeTab === tab.id ? 'page' : undefined"
            >
              <svg
                class="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path :d="tab.icon" />
              </svg>
              {{ tab.label }}
            </button>
          </div>
        </nav>

        <!-- 内容区 -->
        <div class="min-w-0">
          <!-- 翻译服务 -->
          <ProviderSetup v-if="activeTab === 'provider'" />

          <!-- 通用设置 -->
          <div v-else-if="activeTab === 'general'" class="space-y-5">
            <!-- 语言设置 -->
            <section class="card-section">
              <h2 class="section-title">
                {{ t("settings.language.title") }}
              </h2>
              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label class="field-label" for="default-source">
                    {{ t("settings.language.defaultSource") }}
                  </label>
                  <select
                    id="default-source"
                    v-model="settings.sourceLang"
                    class="select"
                    @change="saveSettings"
                  >
                    <option value="auto">{{ t("lang.auto") }}</option>
                    <option
                      v-for="(name, code) in languageOptions"
                      :key="code"
                      :value="code"
                    >
                      {{ getLanguageDisplayName(code) }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="field-label" for="default-target">
                    {{ t("settings.language.defaultTarget") }}
                  </label>
                  <select
                    id="default-target"
                    v-model="settings.targetLang"
                    class="select"
                    @change="saveSettings"
                  >
                    <option
                      v-for="(name, code) in languageOptions"
                      :key="code"
                      :value="code"
                    >
                      {{ getLanguageDisplayName(code) }}
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <!-- 划词翻译 -->
            <section class="card-section">
              <h2 class="section-title">
                {{ t("settings.selection.title") }}
              </h2>
              <div class="mt-4 space-y-4">
                <label class="flex items-center gap-2 text-sm" for="enableSelection">
                  <input
                    id="enableSelection"
                    v-model="settings.enableSelection"
                    @change="saveSettings"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-slate-700">
                    {{ t("settings.selection.enable") }}
                  </span>
                </label>

                <div v-if="settings.enableSelection" class="space-y-4">
                  <fieldset>
                    <legend class="field-label">
                      {{ t("settings.selection.triggerMethod") }}
                    </legend>
                    <div class="flex flex-wrap gap-2">
                      <label
                        v-for="option in triggerOptions"
                        :key="option.value"
                        :class="[
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                          settings.selectionTrigger === option.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        ]"
                      >
                        <input
                          v-model="settings.selectionTrigger"
                          @change="saveSettings"
                          type="radio"
                          :value="option.value"
                          class="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        {{ option.label }}
                      </label>
                    </div>
                  </fieldset>

                  <div>
                    <label class="field-label" for="min-selection-length">
                      {{ t("settings.selection.minChars") }}
                    </label>
                    <input
                      id="min-selection-length"
                      type="number"
                      min="1"
                      max="500"
                      v-model.number="settings.minSelectionLength"
                      @change="saveSettings"
                      class="input w-32"
                    />
                    <p class="field-hint">
                      {{ t("settings.selection.minCharsHint") }}
                    </p>
                  </div>

                  <div>
                    <label class="field-label" for="domain-blacklist">
                      {{ t("settings.selection.blacklist") }}
                    </label>
                    <textarea
                      id="domain-blacklist"
                      v-model="blacklistText"
                      @change="saveBlacklist"
                      rows="4"
                      class="input font-mono"
                      :placeholder="t('settings.selection.blacklistPlaceholder')"
                    ></textarea>
                    <p class="field-hint">
                      {{ t("settings.selection.blacklistHint") }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- 语音朗读预览 -->
            <section class="card-section">
              <h2 class="section-title">
                {{ t("settings.voice.title") }}
              </h2>
              <p class="section-desc mt-1">
                {{ t("settings.voice.desc") }}
              </p>
              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <div
                  v-for="lang in ['zh', 'en']"
                  :key="lang"
                  class="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium">
                      {{ lang === "zh" ? t("settings.voice.zh") : t("settings.voice.en") }}
                    </span>
                    <button
                      type="button"
                      @click="previewSpeak(lang)"
                      :disabled="speakingPreview === lang"
                      class="btn-primary px-3 py-1.5"
                    >
                      {{
                        speakingPreview === lang
                          ? t("settings.voice.playing")
                          : lang === "zh"
                            ? t("settings.voice.previewZh")
                            : t("settings.voice.previewEn")
                      }}
                    </button>
                  </div>
                  <p class="mt-2 text-sm leading-relaxed text-slate-700">
                    {{ voiceSamples[lang] }}
                  </p>
                  <p class="mt-2 text-xs text-slate-500">
                    {{ t("settings.voice.engine") }}:
                    {{ voiceEngines[lang].voiceName }}
                  </p>
                  <p class="mt-0.5 text-xs text-slate-400">
                    {{ voiceEngines[lang].detail }}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <!-- 翻译历史 -->
          <div v-else-if="activeTab === 'history'" class="card-section">
            <div class="flex items-center justify-between">
              <h2 class="section-title">
                {{ t("settings.tab.history") }}
              </h2>
              <button @click="clearHistory" class="btn-danger-ghost px-3 py-1.5">
                {{ t("settings.history.clear") }}
              </button>
            </div>
            <p v-if="history.length === 0" class="mt-6 text-sm text-slate-500">
              {{ t("settings.history.empty") }}
            </p>
            <ul v-else class="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              <li
                v-for="(item, idx) in history"
                :key="idx"
                class="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>{{ formatTime(item.timestamp) }}</span>
                  <span v-if="item.from || item.detectedLanguage" class="badge-neutral">
                    {{ item.detectedLanguage || item.from || "?" }} →
                    {{ item.to || "?" }}
                  </span>
                </div>
                <div class="whitespace-pre-wrap break-words text-slate-500">
                  {{ item.originalText }}
                </div>
                <div
                  class="mt-2 whitespace-pre-wrap break-words border-t border-slate-100 pt-2 text-slate-800"
                >
                  {{ item.translatedText }}
                </div>
              </li>
            </ul>
          </div>

          <!-- 关于 -->
          <div v-else-if="activeTab === 'about'" class="card-section space-y-5">
            <div class="text-center">
              <img
                :src="logoUrl"
                alt="GLM Translator"
                class="mx-auto mb-3 h-14 w-auto"
              />
              <h2 class="text-xl font-bold text-slate-800">
                {{ t("about.title") }}
              </h2>
              <p class="mt-1 text-sm text-slate-500">{{ t("about.subtitle") }}</p>
              <p class="mt-0.5 text-xs text-slate-400">
                {{ t("settings.version") }} {{ version }}
              </p>
            </div>

            <div class="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <h3 class="mb-2 font-semibold text-slate-800">
                {{ t("about.privacy.title") }}
              </h3>
              <ul class="list-inside list-disc space-y-1">
                <li>{{ t("about.privacy.keys") }}</li>
                <li>{{ t("about.privacy.requests") }}</li>
                <li>{{ t("about.privacy.history") }}</li>
                <li>{{ t("about.privacy.microsoft") }}</li>
              </ul>
            </div>

            <div class="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p class="rounded-lg bg-slate-50 px-4 py-3 text-center">
                {{ t("about.aiServices") }}
              </p>
              <p class="rounded-lg bg-slate-50 px-4 py-3 text-center">
                {{ t("about.shortcuts") }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 保存提示 -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="saveToast"
        class="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
        role="status"
      >
        {{ saveToast }}
      </div>
    </transition>
  </div>
</template>

<script>
import ProviderSetup from "../components/ProviderSetup.vue";
import { allLanguages } from "../common/languages.js";
import {
  initLanguage,
  getCurrentLanguage,
  setLanguage,
  t,
  getLanguageDisplayName,
  setupLanguageListener,
} from "../utils/i18n.js";
import { normalizeGeneralSettings } from "../utils/generalSettings.js";
import { parseBlacklistInput } from "../utils/domainBlacklist.js";
import {
  getTranslationHistory,
  clearTranslationHistory,
} from "../utils/storage.js";
import { speakText, describeSpeakEngine, loadVoices } from "../utils/speak.js";

const NAV_ICONS = {
  provider:
    "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  general:
    "M12 15a3 3 0 100-6 3 3 0 000 6zm6-3a8.96 8.96 0 01-.22 2l2.05 1.58a.5.5 0 01.12.64l-1.94 3.36a.5.5 0 01-.6.22l-2.42-.97a8.9 8.9 0 01-1.73 1L13 22.4a.5.5 0 01-.5.42h-3.88a.5.5 0 01-.5-.42l-.36-2.57a8.9 8.9 0 01-1.73-1l-2.42.97a.5.5 0 01-.6-.22l-1.94-3.36a.5.5 0 01.12-.64L4.22 14a8.96 8.96 0 010-4L2.17 8.42a.5.5 0 01-.12-.64l1.94-3.36a.5.5 0 01.6-.22l2.42.97a8.9 8.9 0 011.73-1L9.1 1.6a.5.5 0 01.5-.42h3.88a.5.5 0 01.5.42l.36 2.57c.62.25 1.2.58 1.73 1l2.42-.97a.5.5 0 01.6.22l1.94 3.36a.5.5 0 01-.12.64L20.9 10c.06.65.1 1.32.1 2z",
  history:
    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  about:
    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default {
  name: "Options",
  components: {
    ProviderSetup,
  },
  data() {
    return {
      activeTab: "provider",
      version: chrome.runtime.getManifest().version,
      logoUrl: chrome.runtime.getURL("icons/icon48.png"),
      languages: allLanguages,
      currentLanguage: "zh",
      t,
      getLanguageDisplayName,
      settings: normalizeGeneralSettings(),
      blacklistText: "",
      history: [],
      saveToast: "",
      saveToastTimer: null,
      speakingPreview: "",
      voiceSamples: {
        zh: "你好，这是 GLM Translator 的中文朗读预览。希望听起来自然流畅。",
        en: "Hello, this is a voice preview from GLM Translator. I hope it sounds clear and natural.",
      },
      voiceEngines: {
        zh: { mode: "online", voiceName: "…", detail: "" },
        en: { mode: "local", voiceName: "…", detail: "" },
      },
    };
  },
  computed: {
    tabs() {
      return [
        { id: "provider", label: this.t("settings.providerConfig"), icon: NAV_ICONS.provider },
        { id: "general", label: this.t("settings.generalSettings"), icon: NAV_ICONS.general },
        { id: "history", label: this.t("settings.tab.history"), icon: NAV_ICONS.history },
        { id: "about", label: this.t("settings.about"), icon: NAV_ICONS.about },
      ];
    },
    triggerOptions() {
      return [
        { value: "icon", label: this.t("settings.selection.showIcon") },
        { value: "instant", label: this.t("settings.selection.instantTranslate") },
      ];
    },
    languageOptions() {
      const out = {};
      for (const [code, name] of Object.entries(this.languages || {})) {
        if (code === "detect" || code === "auto") continue;
        out[code] = name;
      }
      return out;
    },
  },
  watch: {
    activeTab(val) {
      if (val === "history") this.loadHistory();
    },
  },
  async mounted() {
    await this.initI18nLanguage();
    await this.loadSettings();
    this.refreshVoiceEngines();
    // Chrome 音色列表常异步就绪
    if (typeof window !== "undefined" && window.speechSynthesis) {
      loadVoices(window.speechSynthesis);
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        this.refreshVoiceEngines();
      });
    }
  },
  methods: {
    refreshVoiceEngines() {
      try {
        this.voiceEngines = {
          zh: describeSpeakEngine("zh"),
          en: describeSpeakEngine("en"),
        };
      } catch (e) {
        console.warn("刷新朗读引擎信息失败:", e);
      }
    },

    previewSpeak(lang) {
      const text =
        lang === "en" ? this.voiceSamples.en : this.voiceSamples.zh;
      this.speakingPreview = lang;
      this.refreshVoiceEngines();
      speakText(text, {
        lang,
        rate: 0.85,
        onUnsupported: (msg) => {
          alert(msg);
          this.speakingPreview = "";
        },
      });
      // 预估时长后恢复按钮（在线/本地结束事件不统一，用定时器即可）
      const ms = Math.min(20000, Math.max(2500, text.length * 120));
      setTimeout(() => {
        if (this.speakingPreview === lang) this.speakingPreview = "";
      }, ms);
    },

    showSaveToast(msg) {
      this.saveToast = msg || this.t("settings.saved");
      if (this.saveToastTimer) clearTimeout(this.saveToastTimer);
      this.saveToastTimer = setTimeout(() => {
        this.saveToast = "";
      }, 2000);
    },

    async initI18nLanguage() {
      try {
        await initLanguage();
        this.currentLanguage = await getCurrentLanguage();
        this.setupLanguageListener();
      } catch (error) {
        console.error("Failed to initialize language:", error);
      }
    },

    setupLanguageListener() {
      setupLanguageListener((newLanguage) => {
        this.currentLanguage = newLanguage;
        this.$forceUpdate();
      });
    },

    async switchLanguage(newLang) {
      if (this.currentLanguage === newLang) return;
      try {
        await setLanguage(newLang);
        this.currentLanguage = newLang;
      } catch (error) {
        console.error("Failed to switch language:", error);
      }
    },

    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get(["general"]);
        this.settings = normalizeGeneralSettings(result.general || {});
        this.blacklistText = (this.settings.domainBlacklist || []).join("\n");
      } catch (error) {
        console.error("加载设置失败:", error);
      }
    },

    async saveSettings() {
      try {
        this.settings = normalizeGeneralSettings({
          ...this.settings,
          domainBlacklist: parseBlacklistInput(this.blacklistText),
        });
        await chrome.storage.sync.set({ general: this.settings });
        this.showSaveToast();
      } catch (error) {
        console.error("保存设置失败:", error);
        this.showSaveToast(this.t("settings.saveFailed"));
      }
    },

    async saveBlacklist() {
      this.settings.domainBlacklist = parseBlacklistInput(this.blacklistText);
      await this.saveSettings();
    },

    async loadHistory() {
      try {
        this.history = await getTranslationHistory(100);
      } catch (e) {
        console.error(e);
        this.history = [];
      }
    },

    async clearHistory() {
      if (!confirm(this.t("settings.history.clearConfirm"))) return;
      await clearTranslationHistory();
      this.history = [];
      this.showSaveToast(this.t("settings.history.cleared"));
    },

    formatTime(ts) {
      if (!ts) return "";
      try {
        return new Date(ts).toLocaleString();
      } catch {
        return "";
      }
    },
  },
};
</script>
