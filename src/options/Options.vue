<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50"
  >
    <!-- 顶部导航栏 -->
    <header
      class="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20"
    >
      <div
        class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center"
      >
        <div class="flex items-center">
          <img :src="logoUrl" alt="GLM Translator" class="h-8 w-auto mr-3" />
          <h1 class="text-xl font-semibold text-gray-800">
            {{ t('settings.title') }}
          </h1>
        </div>

        <!-- 语言切换按钮 -->
        <div class="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            @click="switchLanguage('zh')"
            :class="[
              'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200',
              currentLanguage === 'zh'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            ]"
          >
            {{ t('lang.chinese') }}
          </button>
          <button
            @click="switchLanguage('en')"
            :class="[
              'px-3 py-1 rounded-md text-sm font-medium transition-all duration-200',
              currentLanguage === 'en'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            ]"
          >
            {{ t('lang.english') }}
          </button>
        </div>

        <div class="text-sm text-gray-500">{{ t('settings.version') }} {{ version }}</div>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- 导航标签 -->
      <div class="mb-8">
        <nav class="flex space-x-8 border-b border-gray-200">
          <button
            @click="activeTab = 'provider'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === 'provider'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ]"
          >
            {{ t('settings.providerConfig') }}
          </button>
          <button
            @click="activeTab = 'general'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ]"
          >
            {{ t('settings.generalSettings') }}
          </button>
          <button
            @click="activeTab = 'about'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === 'about'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ]"
          >
            {{ t('settings.about') }}
          </button>
        </nav>
      </div>

      <!-- 标签内容 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <!-- 翻译服务配置 -->
        <div v-if="activeTab === 'provider'">
          <ProviderSetup />
        </div>

        <!-- 通用设置 -->
        <div v-else-if="activeTab === 'general'" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold mb-4 text-gray-800">{{ t('settings.language.title') }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('settings.language.defaultSource') }}
                </label>
                <select
                  v-model="settings.sourceLang"
                  @change="saveSettings"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">{{ t('lang.auto') }}</option>
                  <option
                    v-for="(name, code) in languages"
                    :key="code"
                    :value="code"
                  >
                    {{ getLanguageDisplayName(code) }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('settings.language.defaultTarget') }}
                </label>
                <select
                  v-model="settings.targetLang"
                  @change="saveSettings"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option
                    v-for="(name, code) in languages"
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
              {{ t('settings.selection.title') }}
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
                  {{ t('settings.selection.enable') }}
                </label>
              </div>
              <div v-if="settings.enableSelection">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ t('settings.selection.triggerMethod') }}
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
                      {{ t('settings.selection.showIcon') }}
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
                      {{ t('settings.selection.instantTranslate') }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div v-else-if="activeTab === 'about'" class="text-center space-y-6">
          <div>
            <img
              :src="logoUrl"
              alt="GLM Translator"
              class="h-16 w-auto mx-auto mb-4"
            />
            <h3 class="text-2xl font-bold text-gray-800">{{ t('about.title') }}</h3>
            <p class="text-gray-600 mt-2">{{ t('about.subtitle') }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ t('settings.version') }} {{ version }}</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-6">
            <h4 class="font-semibold text-gray-800 mb-3">{{ t('translate.selectProvider') }}</h4>
            <div
              class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600"
            >
              <div>智谱 GLM</div>
              <div>火山引擎</div>
              <div>硅基流动</div>
              <div>腾讯混元</div>
              <div>阿里通义</div>
              <div>DeepSeek</div>
              <div>OpenAI</div>
              <div>Claude</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <p class="flex items-center justify-center bg-gray-50 rounded-lg py-3 px-4">{{ t('about.aiServices') }}</p>
            <p class="flex items-center justify-center bg-gray-50 rounded-lg py-3 px-4">{{ t('about.sensitiveHandling') }}</p>
            <p class="flex items-center justify-center bg-gray-50 rounded-lg py-3 px-4">{{ t('about.shortcuts') }}</p>
            <p class="flex items-center justify-center bg-gray-50 rounded-lg py-3 px-4">{{ t('about.interface') }}</p>
          </div>

          <div class="pt-4 border-t border-gray-200">
            <p class="text-xs text-gray-500">
              {{ t('about.copyright') }}
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import ProviderSetup from "../components/ProviderSetup.vue";
import { allLanguages } from "../common/languages.js";
import { initLanguage, getCurrentLanguage, setLanguage, t, getLanguageDisplayName, setupLanguageListener } from "../utils/i18n.js";

export default {
  name: "Options",
  components: {
    ProviderSetup,
  },
  data() {
    return {
      activeTab: "provider",
      version: "1.2.2",
      logoUrl: chrome.runtime.getURL("icons/icon48.png"),
      languages: allLanguages,
      currentLanguage: "zh",
      t,
      getLanguageDisplayName,
      settings: {
        sourceLang: "auto",
        targetLang: "zh",
        enableSelection: true,
        selectionTrigger: "icon",
      },
    };
  },
  async mounted() {
    await this.initI18nLanguage();
    await this.loadSettings();
  },
  methods: {
    async initI18nLanguage() {
      try {
        await initLanguage();
        this.currentLanguage = await getCurrentLanguage();
        this.setupLanguageListener();
        console.log('Options page language initialized:', this.currentLanguage);
      } catch (error) {
        console.error('Failed to initialize language:', error);
      }
    },

    setupLanguageListener() {
      setupLanguageListener((newLanguage) => {
        this.currentLanguage = newLanguage;
        this.$forceUpdate();
        console.log('Options page language changed to:', newLanguage);
      });
    },

    async switchLanguage(newLang) {
      if (this.currentLanguage === newLang) return;
      try {
        await setLanguage(newLang);
        this.currentLanguage = newLang;
        console.log('Language switched to:', newLang);
      } catch (error) {
        console.error('Failed to switch language:', error);
      }
    },

    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get(["general"]);
        if (result.general) {
          this.settings = { ...this.settings, ...result.general };
        }
      } catch (error) {
        console.error("加载设置失败:", error);
      }
    },

    async saveSettings() {
      try {
        await chrome.storage.sync.set({ general: this.settings });
        console.log("设置已保存:", this.settings);
      } catch (error) {
        console.error("保存设置失败:", error);
      }
    },

    // 打开设置页面（供Popup调用）
    openSettings() {
      chrome.runtime.openOptionsPage();
    },
  },
};
</script>

<style scoped>
/* 自定义样式 */
</style>
