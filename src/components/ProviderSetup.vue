<template>
  <div class="provider-setup">
    <!-- 已保存配置列表 -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">
        {{ t("provider.savedConfigs") }}
      </h3>
      <div v-if="localizedSavedApis.length > 0" class="space-y-2">
        <div
          v-for="api in localizedSavedApis"
          :key="api.id"
          @click="selectSavedApi(api)"
          :class="[
            'p-3 border rounded-lg cursor-pointer transition-all duration-200',
            selectedApiId === api.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50',
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <img
                v-if="getProviderLogo(api.provider)"
                :src="getProviderLogo(api.provider)"
                :alt="api.name"
                class="w-6 h-6 object-contain"
              />
              <span v-else class="text-xl">{{
                getProviderIcon(api.provider)
              }}</span>
              <div>
                <p class="font-medium text-gray-800">{{ api.name }}</p>
                <p class="text-sm text-gray-600">
                  {{ api.localizedModelName }}
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span
                v-if="api.provider === 'custom'"
                class="text-xs text-gray-500"
              >
                自定义
              </span>
              <button
                @click.stop="deleteApiConfig(api.id)"
                class="text-red-500 hover:text-red-700 p-1"
                :title="t('common.delete')"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else-if="savedApis.length === 0"
        class="text-sm text-gray-500 italic"
      >
        {{ t("provider.noSavedConfigs") }}
      </div>
    </div>

    <!-- 提供商选择 -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">
          {{ t("translate.selectProvider") }}
        </h3>
        <button
          @click="showAllProviders = !showAllProviders"
          class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          {{
            showAllProviders
              ? t("provider.showRecommended")
              : t("provider.showAll")
          }}
          <svg
            :class="[
              'w-4 h-4 ml-1 transition-transform',
              showAllProviders ? 'rotate-180' : '',
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="provider in localizedProviders"
          :key="provider.id"
          @click="selectProvider(provider.id)"
          :class="[
            'provider-card cursor-pointer p-4 border-2 rounded-lg transition-all duration-300',
            selectedProvider === provider.id
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md',
          ]"
        >
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img
                v-if="getProviderLogo(provider.id)"
                :src="getProviderLogo(provider.id)"
                :alt="provider.name"
                class="w-8 h-8 object-contain"
              />
              <span v-else class="text-2xl">{{ provider.icon }}</span>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-800">{{ provider.name }}</h4>
              <p class="text-sm text-gray-600 mt-1">
                {{ provider.description }}
              </p>
              <div class="flex flex-wrap gap-2 mt-2">
                <span
                  class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                >
                  {{ provider.pricing }}
                </span>
                <span
                  v-for="feature in provider.features.slice(0, 2)"
                  :key="feature"
                  class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                >
                  {{ feature }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 自定义API快速入口 -->
      <div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-gray-800">
              ⚙️ {{ t("provider.customApi") }}
            </h4>
            <p class="text-sm text-gray-600">
              {{ t("provider.customApiDesc") }}
            </p>
          </div>
          <button
            @click="selectProvider('custom')"
            :class="[
              'px-4 py-2 rounded-md transition-colors duration-200',
              selectedProvider === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50',
            ]"
          >
            {{
              selectedProvider === "custom"
                ? t("provider.selected")
                : t("provider.config")
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- API配置 -->
    <div v-if="selectedProvider" class="mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">
        {{ t("translate.apiConfig") }}
      </h3>
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div class="space-y-4">
          <!-- API Key输入 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t("translate.apiKey") }}
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                v-model="apiKey"
                :type="showApiKey ? 'text' : 'password'"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :placeholder="`请输入 ${currentProviderConfig?.name} 的 API Key`"
              />
              <button
                @click="showApiKey = !showApiKey"
                class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg
                  v-if="showApiKey"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  ></path>
                </svg>
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  ></path>
                </svg>
              </button>
            </div>
            <p class="text-sm text-gray-500 mt-1">
              <a
                :href="currentProviderConfig?.apiKeyUrl"
                target="_blank"
                class="text-blue-600 hover:underline"
              >
                {{ t(currentProviderConfig?.apiKeyHelp) }}
              </a>
            </p>
          </div>

          <!-- 自定义API URL（仅自定义API显示） -->
          <div v-if="currentProviderConfig?.isCustom">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              API地址
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="customUrl"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://api.example.com/v1/chat/completions"
            />
            <p class="text-sm text-gray-500 mt-1">
              请输入兼容OpenAI格式的API地址
            </p>
          </div>

          <!-- 模型选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t("translate.modelSelection") }}
            </label>

            <!-- 自定义API的模型输入 -->
            <div v-if="currentProviderConfig?.isCustom">
              <input
                v-model="customModel"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入模型名称，如：gpt-3.5-turbo"
              />
              <p class="text-sm text-gray-500 mt-1">请输入您要使用的模型名称</p>
            </div>

            <!-- 预设提供商的模型选择 -->
            <div v-else>
              <select
                v-model="selectedModel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              >
                <option
                  v-for="model in currentProviderConfig?.models"
                  :key="model.id"
                  :value="model.id"
                >
                  {{ t("provider.model." + model.id) || model.name }} -
                  {{
                    t("provider.model." + model.id + ".desc") ||
                    model.description
                  }}
                </option>
                <option value="custom">
                  {{ t("provider.model.custom-model") }}
                </option>
              </select>

              <!-- 自定义模型输入框 -->
              <div v-if="selectedModel === 'custom'" class="mt-2">
                <input
                  v-model="customModelName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :placeholder="`请输入${currentProviderConfig?.name}的自定义模型名称`"
                />
                <p class="text-sm text-gray-500 mt-1">
                  例如：{{ getModelExample() }}
                </p>
                <div v-if="customModelName" class="mt-1 text-sm text-green-600">
                  ✓ 当前模型：{{ customModelName }}
                </div>
              </div>
            </div>
          </div>

          <!-- 测试连接 -->
          <div class="flex items-center space-x-4">
            <button
              @click="testConnection"
              :disabled="!apiKey || testing"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <span v-if="testing">{{ t("provider.testing") }}</span>
              <span v-else>{{ t("provider.testBtn") }}</span>
            </button>

            <div v-if="testResult" class="flex items-center">
              <svg
                v-if="testResult.success"
                class="w-5 h-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-red-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
              <span
                :class="testResult.success ? 'text-green-600' : 'text-red-600'"
                class="text-sm"
              >
                {{ testResult.message }}
              </span>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="pt-4 border-t border-gray-200">
            <button
              @click="saveConfig"
              :disabled="!apiKey"
              class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {{ t("provider.saveConfig") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 当前配置状态 -->
    <div v-if="selectedProvider && (apiKey || customUrl)" class="mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">
        {{ t("provider.configStatus") }}
      </h3>
      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">{{ t("provider.provider") }}</span>
            <span class="font-medium">{{ currentProviderConfig?.name }}</span>
          </div>
          <div
            v-if="currentProviderConfig?.isCustom"
            class="flex justify-between"
          >
            <span class="text-gray-600">{{ t("provider.url") }}</span>
            <span class="font-medium text-xs">{{
              customUrl || t("provider.notSet")
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">{{ t("provider.model") }}</span>
            <span class="font-medium">{{
              getFinalModelName() || t("provider.notSet")
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">{{ t("provider.apiKey") }}</span>
            <span class="font-medium">{{
              apiKey
                ? t("provider.apiKeySet") + " (" + apiKey.slice(0, 8) + "...)"
                : t("provider.notSet")
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置指南 -->
    <div v-if="selectedProvider && currentProviderConfig" class="mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">
        {{ t("provider.setupGuide") }}
      </h3>
      <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <ol class="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li
            v-for="(step, index) in getSetupGuideSteps(selectedProvider)"
            :key="index"
          >
            {{ step }}
          </li>
        </ol>
      </div>
    </div>

    <!-- 成功提示 -->
    <div
      v-if="showSuccess"
      class="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
        配置保存成功！
      </div>
    </div>
  </div>
</template>

<script>
import {
  getRecommendedProviders,
  getAllProviders,
  getProviderConfig,
  createApiConfig,
} from "../config/providers.js";
import { translateText } from "../services/translator.js";
import {
  initLanguage,
  getCurrentLanguage,
  t,
  setupLanguageListener,
} from "../utils/i18n.js";

export default {
  name: "ProviderSetup",
  data() {
    return {
      recommendedProviders: getRecommendedProviders(),
      allProviders: getAllProviders(),
      showAllProviders: false,
      selectedProvider: null,
      currentLanguage: "zh",
      t,
      apiKey: "",
      selectedModel: "",
      customUrl: "",
      customModel: "",
      customModelName: "",
      showApiKey: false,
      testing: false,
      testResult: null,
      showSuccess: false,
      savedApis: [],
      selectedApiId: null,
      // 语言依赖键，用于强制重新计算本地化数据
      languageKey: Date.now(),
    };
  },
  computed: {
    currentProviderConfig() {
      return this.selectedProvider
        ? getProviderConfig(this.selectedProvider)
        : null;
    },
    displayProviders() {
      return this.showAllProviders
        ? this.allProviders
        : this.recommendedProviders;
    },
    localizedProviders() {
      // 添加 currentLanguage 和 languageKey 作为依赖，确保语言切换时重新计算
      const lang = this.currentLanguage;
      const key = this.languageKey;
      return this.displayProviders.map((provider) =>
        this.getLocalizedProvider(provider)
      );
    },
    // 计算属性：获取本地化后的已保存配置列表
    localizedSavedApis() {
      // 使用 languageKey 作为依赖，确保语言切换时重新计算
      const key = this.languageKey;
      return this.savedApis.map((api) => ({
        ...api,
        localizedModelName: this.getLocalizedModelName(api.model),
      }));
    },
  },
  watch: {
    selectedProvider(newProvider) {
      if (newProvider && this.currentProviderConfig) {
        // 只重置测试结果，不重置模型选择（由 loadProviderConfig 处理）
        this.testResult = null;
      }
    },
  },
  async mounted() {
    await this.initI18nLanguage();
    // 初始化语言键
    this.languageKey = Date.now();
    await this.loadCurrentConfig();
  },
  methods: {
    // 加载已保存的配置
    async loadSavedApis() {
      try {
        const settings = await chrome.storage.sync.get([
          "savedApis",
          "selectedApiId",
        ]);
        this.savedApis = settings.savedApis || [];
        this.selectedApiId = settings.selectedApiId || null;
      } catch (error) {
        console.error("加载已保存配置失败:", error);
      }
    },

    // 选择已保存的配置
    async selectSavedApi(apiConfig) {
      // 更新选中的API到存储
      await chrome.storage.sync.set({
        selectedApiId: apiConfig.id,
        selectedProvider: apiConfig.provider,
      });

      // 重新加载配置
      await this.loadCurrentConfig();
    },

    // 删除已保存的配置
    async deleteApiConfig(apiId) {
      if (!confirm("确定要删除这个配置吗？")) return;

      try {
        const settings = await chrome.storage.sync.get(["savedApis"]);
        const savedApis = settings.savedApis || [];
        const filteredApis = savedApis.filter((api) => api.id !== apiId);

        // 如果删除的是当前选中的配置，清除选择
        if (this.selectedApiId === apiId) {
          await chrome.storage.sync.set({
            savedApis: filteredApis,
            selectedApiId: null,
            selectedProvider: null,
          });
        } else {
          await chrome.storage.sync.set({
            savedApis: filteredApis,
          });
        }

        // 重新加载配置
        await this.loadCurrentConfig();
        this.showSuccessMessage("删除成功！");
      } catch (error) {
        console.error("删除配置失败:", error);
        alert("删除配置失败");
      }
    },

    // 获取提供商图标
    getProviderIcon(providerId) {
      const provider = getProviderConfig(providerId);
      return provider ? provider.icon : "⚙️";
    },

    // 显示成功消息
    showSuccessMessage(message) {
      this.showSuccess = true;
      const originalText = message;
      setTimeout(() => {
        this.showSuccess = false;
      }, 2000);
    },

    // 初始化语言设置
    async initI18nLanguage() {
      try {
        await initLanguage();
        this.currentLanguage = await getCurrentLanguage();
        // 初始化时也设置语言键
        this.languageKey = Date.now();
        this.setupLanguageListener();
      } catch (error) {
        console.error("Failed to initialize language:", error);
      }
    },

    setupLanguageListener() {
      setupLanguageListener(async (newLanguage) => {
        this.currentLanguage = newLanguage;
        // 更新语言键，触发 localizedSavedApis 重新计算
        this.languageKey = Date.now();
        // 重新加载配置
        await this.loadCurrentConfig();
        // 等待DOM更新
        this.$nextTick(() => {
          // 强制重新渲染
          this.$forceUpdate();
        });
      });

      // 额外监听所有存储变化，确保不遗漏
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "sync" && changes.interfaceLanguage) {
          this.currentLanguage = changes.interfaceLanguage.newValue;
          this.languageKey = Date.now();
          this.$forceUpdate();
        }
      });
    },

    // 获取本地化的服务商信息
    getLocalizedProvider(provider) {
      return {
        ...provider,
        name: t(`provider.name.${provider.id}`) || provider.name,
        description: t(`provider.desc.${provider.id}`) || provider.description,
        pricing: this.getLocalizedPricing(provider.pricing),
        features: provider.features.map((feature) =>
          this.getLocalizedFeature(feature)
        ),
      };
    },

    // 获取提供商logo
    getProviderLogo(providerId) {
      const logoMap = {
        glm: chrome.runtime.getURL("icons/zhipuAI.png"),
        volcengine: chrome.runtime.getURL("icons/huoshanyinqin.png"),
        siliconflow: chrome.runtime.getURL("icons/siliconflow.png"),
        hunyuan: chrome.runtime.getURL("icons/tengxunhunyuan.png"),
        tongyi: chrome.runtime.getURL("icons/tongyiqianwen.png"),
        deepseek: chrome.runtime.getURL("icons/deepseek.png"),
        custom: chrome.runtime.getURL("icons/custom.png"),
      };
      return logoMap[providerId] || null;
    },

    // 获取设置指南步骤的翻译
    getSetupGuideSteps(providerId) {
      const steps = [];
      for (let i = 1; i <= 4; i++) {
        const stepKey = `provider.setupGuide.${providerId}.step${i}`;
        const stepText = t(stepKey);
        if (stepText && stepText !== stepKey) {
          steps.push(stepText);
        }
      }
      return steps;
    },

    // 获取本地化的定价信息
    getLocalizedPricing(pricing) {
      const pricingMap = {
        "免费额度 + 按量计费": "provider.pricing.free",
        按量计费: "provider.pricing.volume",
        "免费额度 + 优惠价格": "provider.pricing.freeVolume",
        Lite版本免费: "provider.pricing.freeLite",
        优惠价格: "provider.pricing.discount",
        根据服务商而定: "provider.pricing.custom",
      };
      const key = pricingMap[pricing] || pricing;
      const translated = t(key);
      return translated === key ? pricing : translated;
    },

    // 获取本地化的特性信息
    getLocalizedFeature(feature) {
      const featureMap = {
        高质量翻译: "provider.feature.highQuality",
        多语言支持: "provider.feature.multiLang",
        快速响应: "provider.feature.fastResponse",
        豆包模型: "provider.feature.doubao",
        长文本支持: "provider.feature.longText",
        高并发: "provider.feature.highConcurrency",
        开源模型: "provider.feature.openSource",
        价格优惠: "provider.feature.priceAdvantage",
        多模型选择: "provider.feature.modelChoice",
        免费额度: "provider.feature.freeQuota",
        腾讯云服务: "provider.feature.tencentCloud",
        稳定可靠: "provider.feature.reliable",
        通义千问: "provider.feature.qwen",
        阿里云服务: "provider.feature.aliyun",
        多模型支持: "provider.feature.multiModel",
        高性价比: "provider.feature.costEffective",
        专业模型: "provider.feature.professional",
        GPT模型: "provider.feature.gptModel",
        全球服务: "provider.feature.globalService",
        Claude模型: "provider.feature.claudeModel",
        安全可靠: "provider.feature.safe",
        自定义配置: "provider.feature.customConfig",
        灵活接入: "provider.feature.flexible",
        兼容OpenAI格式: "provider.feature.openaiCompatible",
      };
      const key = featureMap[feature] || feature;
      const translated = t(key);
      return translated === key ? feature : translated;
    },

    selectProvider(providerId) {
      // 只有在真正切换提供商时才清空配置
      if (this.selectedProvider !== providerId) {
        this.selectedProvider = providerId;
        this.apiKey = "";
        this.customUrl = "";
        this.customModel = "";
        this.customModelName = "";
        this.testResult = null;

        // 设置默认模型
        const providerConfig = getProviderConfig(providerId);
        if (providerConfig) {
          this.selectedModel = providerConfig.defaultModel;
        }

        // 尝试加载该提供商的已保存配置（会覆盖默认设置）
        this.loadProviderConfig(providerId);
      }
    },

    async loadCurrentConfig() {
      try {
        const settings = await chrome.storage.sync.get([
          "selectedProvider",
          "savedApis",
          "selectedApiId",
        ]);

        // 更新已保存配置列表
        if (settings.savedApis) {
          this.savedApis = settings.savedApis;
          this.selectedApiId = settings.selectedApiId || null;
        }

        if (settings.selectedProvider) {
          this.selectedProvider = settings.selectedProvider;
        }

        if (settings.savedApis && settings.selectedApiId) {
          const currentApi = settings.savedApis.find(
            (api) => api.id === settings.selectedApiId
          );
          if (currentApi) {
            this.selectedProvider = currentApi.provider;
            this.apiKey = currentApi.apiKey;

            // 处理自定义API
            if (currentApi.provider === "custom") {
              this.customUrl = currentApi.url;
              this.customModel = currentApi.model;
            } else {
              // 处理预设提供商的模型
              const providerConfig = getProviderConfig(currentApi.provider);
              if (providerConfig) {
                // 检查是否是预设模型
                const isPresetModel = providerConfig.models.some(
                  (model) => model.id === currentApi.model
                );

                if (isPresetModel) {
                  // 是预设模型，直接设置
                  this.selectedModel = currentApi.model;
                } else {
                  // 是自定义模型，设置为custom并保存自定义名称
                  this.selectedModel = "custom";
                  this.customModelName = currentApi.model;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("加载配置失败:", error);
      }
    },

    async testConnection() {
      if (!this.apiKey || !this.selectedProvider) return;

      this.testing = true;
      this.testResult = null;

      try {
        let tempConfig;

        if (this.currentProviderConfig?.isCustom) {
          // 自定义API测试
          if (!this.customUrl || !this.customModel) {
            this.testResult = {
              success: false,
              message: "请填写完整的自定义API配置",
            };
            this.testing = false;
            return;
          }

          tempConfig = {
            id: `test_${Date.now()}`,
            name: "测试配置",
            provider: "custom",
            url: this.customUrl,
            apiKey: this.apiKey,
            model: this.customModel,
            headers: {},
          };
        } else {
          // 预设提供商测试
          const modelToUse = this.getFinalModelName();
          if (this.selectedModel === "custom" && !this.customModelName) {
            this.testResult = {
              success: false,
              message: "请输入自定义模型名称",
            };
            this.testing = false;
            return;
          }

          tempConfig = createApiConfig(
            this.selectedProvider,
            this.apiKey,
            modelToUse
          );
        }

        // **关键修复：使用临时存储，不影响已保存的配置**
        // 先获取现有配置（不在这里保存）
        const originalSettings = await chrome.storage.sync.get([
          "savedApis",
          "selectedApiId",
        ]);
        const originalSavedApis = originalSettings.savedApis || [];
        const originalSelectedApiId = originalSettings.selectedApiId || null;

        // 临时保存测试配置
        await chrome.storage.sync.set({
          selectedProvider: this.selectedProvider,
          savedApis: [tempConfig],
          selectedApiId: tempConfig.id,
        });

        // 测试翻译
        const result = await translateText("Hello", "en", "zh");

        // **重要：测试完成后立即恢复原始配置**
        await chrome.storage.sync.set({
          savedApis: originalSavedApis,
          selectedApiId: originalSelectedApiId,
        });

        if (result && result.translatedText) {
          this.testResult = {
            success: true,
            message: this.t("provider.connectionSuccess"),
          };
        } else {
          throw new Error("翻译结果为空");
        }
      } catch (error) {
        // **错误时也要恢复原始配置**
        try {
          const originalSettings = await chrome.storage.sync.get([
            "savedApis",
            "selectedApiId",
          ]);
          await chrome.storage.sync.set({
            savedApis: originalSettings.savedApis || [],
            selectedApiId: originalSettings.selectedApiId || null,
          });
        } catch (restoreError) {
          console.error("恢复配置失败:", restoreError);
        }

        this.testResult = {
          success: false,
          message: this.t("provider.connectionFailed", {
            error: error.message,
          }),
        };
      } finally {
        this.testing = false;
      }
    },

    async saveConfig() {
      if (!this.apiKey || !this.selectedProvider) return;

      try {
        let config;

        if (this.currentProviderConfig?.isCustom) {
          // 自定义API配置
          if (!this.customUrl || !this.customModel) {
            alert("请填写完整的自定义API配置");
            return;
          }

          config = {
            id: `custom_${Date.now()}`,
            name: "自定义API",
            provider: "custom",
            url: this.customUrl,
            apiKey: this.apiKey,
            model: this.customModel,
            headers: {},
            createdAt: Date.now(),
            lastUsed: null,
          };
        } else {
          // 预设提供商配置
          const modelToUse = this.getFinalModelName();
          if (this.selectedModel === "custom" && !this.customModelName) {
            alert("请输入自定义模型名称");
            return;
          }
          config = createApiConfig(
            this.selectedProvider,
            this.apiKey,
            modelToUse
          );
        }

        // 获取现有配置并去重添加
        const settings = await chrome.storage.sync.get(["savedApis"]);
        const savedApis = settings.savedApis || [];

        // 检查是否已存在相同provider的配置
        const existingIndex = savedApis.findIndex(
          (api) => api.provider === this.selectedProvider
        );

        if (existingIndex !== -1) {
          // 替换已存在的配置
          savedApis[existingIndex] = config;
        } else {
          // 添加新配置
          savedApis.push(config);
        }

        // 保存配置
        await chrome.storage.sync.set({
          selectedProvider: this.selectedProvider,
          savedApis: savedApis,
          selectedApiId: config.id,
        });

        // 刷新已保存配置列表
        await this.loadCurrentConfig();

        // 显示成功提示
        this.showSuccess = true;
        setTimeout(() => {
          this.showSuccess = false;
        }, 3000);
      } catch (error) {
        console.error("保存配置失败:", error);
        alert("保存配置失败: " + error.message);
      }
    },

    getModelExample() {
      if (!this.currentProviderConfig) return "";

      const examples = {
        glm: "glm-4-flash, glm-4-air, glm-4-flashx",
        volcengine: "doubao-lite-4k, doubao-pro-128k",
        siliconflow: "Qwen/Qwen2.5-72B-Instruct, deepseek-ai/DeepSeek-V2.5",
        hunyuan: "hunyuan-lite, hunyuan-standard, hunyuan-pro",
        tongyi: "qwen-turbo, qwen-plus, qwen-max, qwen2.5-72b-instruct",
        deepseek: "deepseek-chat, deepseek-coder",
        openai: "gpt-4o, gpt-4o-mini, gpt-3.5-turbo",
        claude: "claude-3-5-sonnet-20241022, claude-3-haiku-20240307",
      };

      return examples[this.selectedProvider] || "请输入完整的模型名称";
    },

    getFinalModelName() {
      if (this.currentProviderConfig?.isCustom) {
        return this.customModel;
      } else if (this.selectedModel === "custom") {
        return this.customModelName;
      } else {
        return this.selectedModel || this.currentProviderConfig?.defaultModel;
      }
    },

    async loadProviderConfig(providerId) {
      try {
        const settings = await chrome.storage.sync.get(["savedApis"]);
        if (settings.savedApis) {
          // 查找该提供商的已保存配置
          const providerApi = settings.savedApis.find(
            (api) => api.provider === providerId
          );
          if (providerApi) {
            this.apiKey = providerApi.apiKey;

            if (providerId === "custom") {
              this.customUrl = providerApi.url;
              this.customModel = providerApi.model;
            } else {
              const providerConfig = getProviderConfig(providerId);
              if (providerConfig) {
                const isPresetModel = providerConfig.models.some(
                  (model) => model.id === providerApi.model
                );

                if (isPresetModel) {
                  this.selectedModel = providerApi.model;
                } else {
                  this.selectedModel = "custom";
                  this.customModelName = providerApi.model;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("加载提供商配置失败:", error);
      }
    },

    // 获取本地化的模型名称
    getLocalizedModelName(modelId) {
      const modelKey = `provider.model.${modelId}`;
      const translated = this.t(modelKey);
      return translated === modelKey ? modelId : translated;
    },
  },
};
</script>

<style scoped>
.provider-card {
  transition: all 0.3s ease;
}

.provider-card:hover {
  transform: translateY(-2px);
}
</style>
