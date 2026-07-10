<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50"
  >
    <header
      class="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20"
    >
      <div
        class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center"
      >
        <div class="flex items-center">
          <img :src="logoUrl" alt="GLM Translator" class="h-8 w-auto mr-3" />
          <h1 class="text-xl font-semibold text-gray-800">
            {{ t("settings.title") }}
          </h1>
        </div>

        <div class="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            @click="switchLanguage('zh')"
            :class="[
              'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200',
              currentLanguage === 'zh'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800',
            ]"
          >
            {{ t("lang.chinese") }}
          </button>
          <button
            @click="switchLanguage('en')"
            :class="[
              'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200',
              currentLanguage === 'en'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800',
            ]"
          >
            {{ t("lang.english") }}
          </button>
        </div>

        <div class="text-sm text-gray-500">
          {{ t("settings.version") }} {{ version }}
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8">
      <div class="mb-8">
        <nav class="flex flex-wrap gap-4 border-b border-gray-200">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div v-if="activeTab === 'provider'">
          <ProviderSetup />
        </div>

        <div v-else-if="activeTab === 'general'" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold mb-4 text-gray-800">
              {{ t("settings.language.title") }}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t("settings.language.defaultSource") }}
                </label>
                <select
                  v-model="settings.sourceLang"
                  @change="saveSettings"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t("settings.language.defaultTarget") }}
                </label>
                <select
                  v-model="settings.targetLang"
                  @change="saveSettings"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-4 text-gray-800">
              {{ t("settings.selection.title") }}
            </h3>
            <div class="space-y-4">
              <div class="flex items-center">
                <input
                  id="enableSelection"
                  v-model="settings.enableSelection"
                  @change="saveSettings"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  for="enableSelection"
                  class="ml-2 block text-sm text-gray-700"
                >
                  {{ t("settings.selection.enable") }}
                </label>
              </div>
              <div v-if="settings.enableSelection" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    {{ t("settings.selection.triggerMethod") }}
                  </label>
                  <div class="space-y-2">
                    <div class="flex items-center">
                      <input
                        id="trigger-icon"
                        v-model="settings.selectionTrigger"
                        @change="saveSettings"
                        type="radio"
                        value="icon"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label
                        for="trigger-icon"
                        class="ml-2 block text-sm text-gray-700"
                      >
                        {{ t("settings.selection.showIcon") }}
                      </label>
                    </div>
                    <div class="flex items-center">
                      <input
                        id="trigger-instant"
                        v-model="settings.selectionTrigger"
                        @change="saveSettings"
                        type="radio"
                        value="instant"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label
                        for="trigger-instant"
                        class="ml-2 block text-sm text-gray-700"
                      >
                        {{ t("settings.selection.instantTranslate") }}
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    最短选中字符数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    v-model.number="settings.minSelectionLength"
                    @change="saveSettings"
                    class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    短于该长度的选中不会触发划词翻译
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    划词黑名单域名
                  </label>
                  <textarea
                    v-model="blacklistText"
                    @change="saveBlacklist"
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="每行一个域名，例如：&#10;github.com&#10;docs.google.com"
                  ></textarea>
                  <p class="text-xs text-gray-500 mt-1">
                    匹配该域名及其子域名时禁用划词翻译
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 语音朗读预览 -->
          <div>
            <h3 class="text-lg font-semibold mb-2 text-gray-800">
              语音朗读预览
            </h3>
            <p class="text-sm text-gray-500 mb-4">
              划词翻译结果窗的「朗读」与此处相同：优先本机高质量音色；中文若只有机械 Desktop
              音，会自动使用在线自然音（需可访问 Google）。
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 中文 -->
              <div
                class="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium text-gray-800">中文预览</span>
                  <button
                    type="button"
                    @click="previewSpeak('zh')"
                    :disabled="speakingPreview === 'zh'"
                    class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {{ speakingPreview === "zh" ? "播放中…" : "试听中文" }}
                  </button>
                </div>
                <p class="text-sm text-gray-700 leading-relaxed">
                  {{ voiceSamples.zh }}
                </p>
                <p class="text-xs text-gray-500">
                  当前引擎：{{ voiceEngines.zh.voiceName }}
                </p>
                <p class="text-xs text-gray-400">{{ voiceEngines.zh.detail }}</p>
              </div>
              <!-- 英文 -->
              <div
                class="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium text-gray-800">English preview</span>
                  <button
                    type="button"
                    @click="previewSpeak('en')"
                    :disabled="speakingPreview === 'en'"
                    class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {{
                      speakingPreview === "en" ? "Playing…" : "试听英文"
                    }}
                  </button>
                </div>
                <p class="text-sm text-gray-700 leading-relaxed">
                  {{ voiceSamples.en }}
                </p>
                <p class="text-xs text-gray-500">
                  当前引擎：{{ voiceEngines.en.voiceName }}
                </p>
                <p class="text-xs text-gray-400">{{ voiceEngines.en.detail }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'history'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800">翻译历史</h3>
            <button
              @click="clearHistory"
              class="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
            >
              清空历史
            </button>
          </div>
          <div v-if="history.length === 0" class="text-sm text-gray-500 italic">
            暂无翻译历史
          </div>
          <div v-else class="space-y-3 max-h-[28rem] overflow-y-auto">
            <div
              v-for="(item, idx) in history"
              :key="idx"
              class="border border-gray-200 rounded-lg p-3 text-sm"
            >
              <div class="text-xs text-gray-400 mb-1">
                {{ formatTime(item.timestamp) }}
                <span v-if="item.from || item.detectedLanguage">
                  ·
                  {{ item.detectedLanguage || item.from || "?" }} →
                  {{ item.to || "?" }}
                </span>
              </div>
              <div class="text-gray-600 whitespace-pre-wrap break-words mb-2">
                {{ item.originalText }}
              </div>
              <div
                class="text-gray-900 whitespace-pre-wrap break-words border-t border-gray-100 pt-2"
              >
                {{ item.translatedText }}
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'about'" class="text-center space-y-6">
          <div>
            <img
              :src="logoUrl"
              alt="GLM Translator"
              class="h-16 w-auto mx-auto mb-4"
            />
            <h3 class="text-2xl font-bold text-gray-800">
              {{ t("about.title") }}
            </h3>
            <p class="text-gray-600 mt-2">{{ t("about.subtitle") }}</p>
            <p class="text-sm text-gray-500 mt-1">
              {{ t("settings.version") }} {{ version }}
            </p>
          </div>

          <div class="bg-gray-50 rounded-lg p-6 text-left text-sm text-gray-600">
            <h4 class="font-semibold text-gray-800 mb-2">隐私与数据</h4>
            <ul class="list-disc list-inside space-y-1">
              <li>API 密钥仅保存在本机扩展本地存储，不会写入浏览器同步存储。</li>
              <li>
                翻译请求仅发送至您选择的服务商域名（或自定义 API 地址）。
              </li>
              <li>翻译历史保存在本机，可随时清空。</li>
              <li>
                微软免费翻译基于公开 Edge 翻译接口，非官方订阅，可能随时失效。
              </li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <p
              class="flex items-center justify-center bg-gray-50 rounded-lg py-3 px-4"
            >
              {{ t("about.aiServices") }}
            </p>
            <p
              class="flex items-center justify-center bg-gray-50 rounded-lg py-3 px-4"
            >
              {{ t("about.shortcuts") }}
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Save toast -->
    <div
      v-if="saveToast"
      class="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50"
    >
      {{ saveToast }}
    </div>
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
        zh: { mode: "online", voiceName: "检测中…", detail: "" },
        en: { mode: "local", voiceName: "检测中…", detail: "" },
      },
    };
  },
  computed: {
    tabs() {
      return [
        { id: "provider", label: this.t("settings.providerConfig") },
        { id: "general", label: this.t("settings.generalSettings") },
        { id: "history", label: "翻译历史" },
        { id: "about", label: this.t("settings.about") },
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

    showSaveToast(msg = "设置已保存") {
      this.saveToast = msg;
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
        this.showSaveToast("保存失败");
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
      if (!confirm("确定清空全部翻译历史？")) return;
      await clearTranslationHistory();
      this.history = [];
      this.showSaveToast("历史已清空");
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
