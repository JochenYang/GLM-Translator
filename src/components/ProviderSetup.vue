<template>
  <div class="space-y-5">
    <!-- 已保存配置 -->
    <section v-if="localizedSavedApis.length > 0" class="card-section">
      <h2 class="section-title">{{ t("provider.savedConfigs") }}</h2>
      <ul class="mt-4 space-y-2">
        <li v-for="api in localizedSavedApis" :key="api.id">
          <button
            type="button"
            @click="selectSavedApi(api)"
            :class="[
              'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              selectedApiId === api.id
                ? 'border-primary-500 bg-primary-50/60'
                : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50',
            ]"
            :aria-pressed="selectedApiId === api.id"
          >
            <img
              v-if="getProviderLogo(api.provider)"
              :src="getProviderLogo(api.provider)"
              :alt="api.name"
              class="h-6 w-6 shrink-0 object-contain"
            />
            <span v-else class="shrink-0 text-xl">{{ getProviderIcon(api.provider) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-slate-800">{{ api.name }}</span>
              <span class="block truncate text-sm text-slate-500">{{ api.localizedModelName }}</span>
            </span>
            <span
              v-if="selectedApiId === api.id"
              class="badge-primary shrink-0"
            >{{ t("provider.inUse") }}</span>
            <span
              @click.stop="deleteApiConfig(api.id)"
              role="button"
              :aria-label="t('common.delete')"
              tabindex="0"
              class="shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              @keydown.enter.stop="deleteApiConfig(api.id)"
              @keydown.space.stop="deleteApiConfig(api.id)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- 引擎选择 -->
    <section class="card-section">
      <div class="flex items-center justify-between gap-3">
        <h2 class="section-title">{{ t("translate.selectProvider") }}</h2>
        <button
          type="button"
          @click="showAllProviders = !showAllProviders"
          class="btn-ghost px-2 py-1 text-sm"
        >
          {{ showAllProviders ? t("provider.showRecommended") : t("provider.showAll") }}
          <svg
            :class="['h-4 w-4 transition-transform', showAllProviders ? 'rotate-180' : '']"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          v-for="provider in localizedProviders"
          :key="provider.id"
          type="button"
          @click="selectProvider(provider.id)"
          :class="[
            'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
            selectedProvider === provider.id
              ? 'border-primary-500 bg-primary-50/60 shadow-md'
              : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-sm',
          ]"
          :aria-pressed="selectedProvider === provider.id"
        >
          <img
            v-if="getProviderLogo(provider.id)"
            :src="getProviderLogo(provider.id)"
            :alt="provider.name"
            class="h-8 w-8 shrink-0 object-contain"
          />
          <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center text-2xl">{{ provider.icon }}</span>
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-semibold text-slate-800">{{ provider.name }}</span>
              <span v-if="selectedProvider === provider.id" class="badge-primary">
                {{ t("provider.inUse") }}
              </span>
              <span
                v-else-if="configuredProviderIds.has(provider.id)"
                class="badge-neutral"
              >{{ t("provider.configured") }}</span>
            </span>
            <span class="mt-1 block text-sm text-slate-500">{{ provider.description }}</span>
            <span class="mt-2 flex flex-wrap gap-1.5">
              <span class="badge-success">{{ provider.pricing }}</span>
              <span
                v-for="feature in provider.features.slice(0, 2)"
                :key="feature"
                class="badge-primary"
              >{{ feature }}</span>
            </span>
          </span>
        </button>
      </div>

      <!-- 自定义 API 快捷入口 -->
      <div
        v-if="!showAllProviders && !localizedProviders.some((p) => p.id === 'custom')"
        class="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div>
          <p class="font-medium text-slate-800">⚙️ {{ t("provider.customApi") }}</p>
          <p class="text-sm text-slate-500">{{ t("provider.customApiDesc") }}</p>
        </div>
        <button
          type="button"
          @click="selectProvider('custom')"
          :class="selectedProvider === 'custom' ? 'btn-primary' : 'btn-secondary'"
          class="px-4 py-2"
        >
          {{ selectedProvider === "custom" ? t("provider.selected") : t("provider.config") }}
        </button>
      </div>
    </section>

    <!-- API 配置 -->
    <section v-if="selectedProvider" class="card-section">
      <h2 class="section-title">{{ t("translate.apiConfig") }}</h2>

      <div class="mt-4 space-y-4">
        <!-- 免 Key 引擎提示 -->
        <div v-if="currentProviderConfig?.noApiKeyRequired" class="notice-success flex items-start gap-3">
          <svg class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-medium">{{ t("provider.freeEngine") }}</p>
            <p class="mt-1">{{ t("provider.freeEngineDesc") }}</p>
          </div>
        </div>

        <!-- API Key -->
        <div v-if="!currentProviderConfig?.noApiKeyRequired">
          <label class="field-label" for="api-key-input">
            {{ t("translate.apiKey") }} <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="api-key-input"
              v-model="apiKey"
              :type="showApiKey ? 'text' : 'password'"
              class="input pr-10"
              :placeholder="`请输入 ${currentProviderConfig?.name} 的 API Key`"
              :autocomplete="showApiKey ? 'off' : 'new-password'"
            />
            <button
              type="button"
              @click="showApiKey = !showApiKey"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              :aria-label="showApiKey ? t('common.hide') : t('common.show')"
            >
              <svg v-if="showApiKey" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            </button>
          </div>
          <p v-if="currentProviderConfig?.apiKeyUrl" class="field-hint">
            <a
              :href="currentProviderConfig?.apiKeyUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-600 hover:underline"
            >{{ t(currentProviderConfig?.apiKeyHelp) }}</a>
          </p>
        </div>

        <!-- 自定义 API 地址 -->
        <div v-if="currentProviderConfig?.isCustom">
          <label class="field-label" for="custom-api-url">
            {{ t("translate.apiUrl") }} <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="custom-api-url"
            v-model="customUrl"
            type="url"
            class="input"
            placeholder="https://api.example.com/v1/chat/completions"
          />
          <p class="field-hint">{{ t("provider.apiUrlDesc") }}</p>
        </div>

        <!-- 模型选择 -->
        <div v-if="!currentProviderConfig?.noApiKeyRequired">
          <label class="field-label" for="model-select">
            {{ t("translate.modelSelection") }}
          </label>

          <input
            v-if="currentProviderConfig?.isCustom"
            id="model-select"
            v-model="customModel"
            type="text"
            class="input"
            :placeholder="t('provider.modelPlaceholder')"
          />
          <template v-else>
            <select id="model-select" v-model="selectedModel" class="select">
              <option
                v-for="model in currentProviderConfig?.models"
                :key="model.id"
                :value="model.id"
              >
                {{ modelLabel(model) }}
              </option>
              <option value="custom">{{ t("provider.model.custom-model") }}</option>
            </select>

            <div v-if="selectedModel === 'custom'" class="mt-2">
              <input
                v-model="customModelName"
                type="text"
                class="input"
                :placeholder="`请输入${currentProviderConfig?.name}的自定义模型名称`"
              />
              <p class="field-hint">{{ t("provider.exampleModel", { examples: getModelExample() }) }}</p>
            </div>
          </template>
        </div>

        <!-- 操作区 -->
        <div class="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            @click="testConnection"
            :disabled="(currentProviderConfig?.noApiKeyRequired ? false : !apiKey) || testing"
            class="btn-secondary px-4 py-2"
          >
            <svg v-if="testing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {{ testing ? t("provider.testing") : t("provider.testBtn") }}
          </button>

          <button
            type="button"
            @click="saveConfig"
            :disabled="currentProviderConfig?.noApiKeyRequired ? false : !apiKey"
            class="btn-primary px-4 py-2"
          >
            {{ t("provider.saveConfig") }}
          </button>

          <p v-if="testResult" class="min-w-0 flex-1 basis-full sm:basis-auto" :class="testResult.success ? 'text-sm text-emerald-700' : 'text-sm text-red-600'">
            <span class="inline-flex items-center gap-1">
              <svg v-if="testResult.success" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span class="min-w-0 break-words">{{ testResult.message }}</span>
            </span>
          </p>
        </div>

        <!-- 当前配置摘要 -->
        <dl
          v-if="apiKey || customUrl"
          class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 p-4 text-sm"
        >
          <dt class="text-slate-500">{{ t("provider.provider") }}</dt>
          <dd class="font-medium text-slate-800">{{ currentProviderConfig?.name }}</dd>
          <template v-if="currentProviderConfig?.isCustom">
            <dt class="text-slate-500">{{ t("provider.url") }}</dt>
            <dd class="break-all font-medium text-slate-800">{{ customUrl || t("provider.notSet") }}</dd>
          </template>
          <dt class="text-slate-500">{{ t("provider.model") }}</dt>
          <dd class="font-medium text-slate-800">{{ getFinalModelName() || t("provider.notSet") }}</dd>
          <dt class="text-slate-500">{{ t("provider.apiKey") }}</dt>
          <dd class="font-medium text-slate-800">
            {{ apiKey ? t("provider.apiKeySet") + " (" + apiKey.slice(0, 8) + "...)" : t("provider.notSet") }}
          </dd>
        </dl>
      </div>
    </section>

    <!-- 设置指南 -->
    <section
      v-if="selectedProvider && currentProviderConfig"
      class="rounded-xl border border-primary-100 bg-primary-50/50 p-5"
    >
      <h2 class="section-title text-primary-900">{{ t("provider.setupGuide") }}</h2>
      <ol class="mt-3 list-inside list-decimal space-y-1.5 text-sm text-primary-800">
        <li v-for="(step, index) in getSetupGuideSteps(selectedProvider)" :key="index">
          {{ step }}
        </li>
      </ol>
    </section>

    <!-- 成功提示 -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg"
        role="status"
      >
        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ t("translate.saveSuccess") }}
      </div>
    </transition>
  </div>
</template>

<script>
import {
  getRecommendedProviders,
  getAllProviders,
  getProviderConfig,
  createApiConfig,
} from "../config/providers.js";
import { testProviderConnection } from "../services/translator.js";
import {
  loadApiConfigs,
  saveApiConfigs,
  migrateSecretsFromSync,
} from "../utils/secureStorage.js";
import { originPatternFromUrl, isKnownProviderUrl } from "../utils/providerOrigins.js";
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
    // 已保存过配置的提供商集合（用于卡片“已配置”标记）
    configuredProviderIds() {
      return new Set((this.savedApis || []).map((api) => api.provider));
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
    // 加载已保存的配置（密钥来自 local）
    async loadSavedApis() {
      try {
        await migrateSecretsFromSync();
        const { savedApis, selectedApiId } = await loadApiConfigs();
        this.savedApis = savedApis || [];
        this.selectedApiId = selectedApiId || null;
      } catch (error) {
        console.error("加载已保存配置失败:", error);
      }
    },

    // 选择已保存的配置
    async selectSavedApi(apiConfig) {
      const { savedApis } = await loadApiConfigs();
      await saveApiConfigs(savedApis, {
        selectedApiId: apiConfig.id,
        selectedProvider: apiConfig.provider,
      });

      await this.loadCurrentConfig();
    },

    // 删除已保存的配置
    async deleteApiConfig(apiId) {
      if (!confirm("确定要删除这个配置吗？")) return;

      try {
        const { savedApis, selectedApiId } = await loadApiConfigs();
        const filteredApis = (savedApis || []).filter((api) => api.id !== apiId);

        if (selectedApiId === apiId) {
          await saveApiConfigs(filteredApis, {
            selectedApiId: null,
            selectedProvider: null,
          });
        } else {
          await saveApiConfigs(filteredApis, {
            selectedApiId,
          });
        }

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
        youdao: chrome.runtime.getURL("icons/youdao.png"),
        microsoft: chrome.runtime.getURL("icons/microsoft.png"),
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
        await migrateSecretsFromSync();
        const { savedApis, selectedApiId, selectedProvider } =
          await loadApiConfigs();

        this.savedApis = savedApis || [];
        this.selectedApiId = selectedApiId || null;

        if (selectedProvider) {
          this.selectedProvider = selectedProvider;
        }

        if (savedApis && selectedApiId) {
          const currentApi = savedApis.find((api) => api.id === selectedApiId);
          if (currentApi) {
            this.selectedProvider = currentApi.provider;
            this.apiKey = currentApi.apiKey || "";

            if (currentApi.provider === "custom") {
              this.customUrl = currentApi.url;
              this.customModel = currentApi.model;
            } else {
              const providerConfig = getProviderConfig(currentApi.provider);
              if (providerConfig) {
                const isPresetModel = providerConfig.models.some(
                  (model) => model.id === currentApi.model
                );
                if (isPresetModel) {
                  this.selectedModel = currentApi.model;
                } else {
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

    /** Request optional host permission for custom API URLs (options page). */
    async ensureCustomHostPermission(url) {
      if (!url || isKnownProviderUrl(url)) return true;
      const pattern = originPatternFromUrl(url);
      if (!pattern || !chrome.permissions?.request) return true;
      try {
        const already = await chrome.permissions.contains({
          origins: [pattern],
        });
        if (already) return true;
        return await chrome.permissions.request({ origins: [pattern] });
      } catch (e) {
        console.warn("permission request failed:", e);
        return false;
      }
    },

    async testConnection() {
      this.testing = true;
      this.testResult = null;

      try {
        // Memory-only test — never overwrites savedApis
        if (this.selectedProvider === "youdao" || this.selectedProvider === "microsoft") {
          this.testResult = await testProviderConnection({
            provider: this.selectedProvider,
          });
          return;
        }

        if (!this.apiKey || !this.selectedProvider) {
          this.testResult = {
            success: false,
            message: "请填写 API Key",
          };
          return;
        }

        let url;
        let model;

        if (this.currentProviderConfig?.isCustom) {
          if (!this.customUrl || !this.customModel) {
            this.testResult = {
              success: false,
              message: "请填写完整的自定义API配置",
            };
            return;
          }
          url = this.customUrl;
          model = this.customModel;
          const granted = await this.ensureCustomHostPermission(url);
          if (!granted) {
            this.testResult = {
              success: false,
              message: "未授予自定义 API 域名访问权限",
            };
            return;
          }
        } else {
          if (this.selectedModel === "custom" && !this.customModelName) {
            this.testResult = {
              success: false,
              message: "请输入自定义模型名称",
            };
            return;
          }
          model = this.getFinalModelName();
          url = this.currentProviderConfig?.url;
        }

        this.testResult = await testProviderConnection({
          provider: this.selectedProvider,
          apiKey: this.apiKey,
          model,
          url,
        });
      } catch (error) {
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
      if (!this.selectedProvider) return;

      if (this.currentProviderConfig?.noApiKeyRequired) {
        const { savedApis } = await loadApiConfigs();
        await saveApiConfigs(savedApis || [], {
          selectedProvider: this.selectedProvider,
          selectedApiId: null,
        });
        this.showSuccess = true;
        setTimeout(() => {
          this.showSuccess = false;
        }, 3000);
        return;
      }

      if (!this.apiKey) return;

      try {
        let config;

        if (this.currentProviderConfig?.isCustom) {
          if (!this.customUrl || !this.customModel) {
            alert("请填写完整的自定义API配置");
            return;
          }
          const granted = await this.ensureCustomHostPermission(this.customUrl);
          if (!granted) {
            alert("未授予自定义 API 域名访问权限，无法保存");
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

        const { savedApis } = await loadApiConfigs();
        const list = savedApis || [];
        const existingIndex = list.findIndex(
          (api) => api.provider === this.selectedProvider
        );
        if (existingIndex !== -1) {
          // preserve id so secrets key stays stable when possible
          config.id = list[existingIndex].id || config.id;
          list[existingIndex] = config;
        } else {
          list.push(config);
        }

        await saveApiConfigs(list, {
          selectedProvider: this.selectedProvider,
          selectedApiId: config.id,
        });

        await this.loadCurrentConfig();

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
        volcengine: "doubao-seed-1-6-flash-250615, doubao-1-5-pro-32k-250115",
        siliconflow: "Qwen/Qwen3-8B, deepseek-ai/DeepSeek-V3",
        hunyuan: "hunyuan-lite, hunyuan-turbos-latest",
        tongyi: "qwen-mt-flash, qwen-plus-latest, qwen3-max",
        deepseek: "deepseek-chat, deepseek-reasoner",
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
        const { savedApis } = await loadApiConfigs();
        if (savedApis) {
          const providerApi = savedApis.find(
            (api) => api.provider === providerId
          );
          if (providerApi) {
            this.apiKey = providerApi.apiKey || "";

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

    // 模型选项显示名：优先 i18n 键（存在才用），否则回退 providers.js 的名称/描述。
    // t() 缺键时返回键名本身，因此必须比较后才能决定是否回退。
    modelLabel(model) {
      const nameKey = `provider.model.${model.id}`;
      const descKey = `${nameKey}.desc`;
      const name = t(nameKey);
      const desc = t(descKey);
      const resolvedName = name !== nameKey ? name : model.name;
      const resolvedDesc = desc !== descKey ? desc : model.description;
      return `${resolvedName} - ${resolvedDesc}`;
    },

    // 获取本地化的模型名称
    getLocalizedModelName(modelId) {
      if (!modelId) return "";
      const modelKey = `provider.model.${modelId}`;
      const translated = this.t(modelKey);
      return translated === modelKey ? modelId : translated;
    },
  },
};
</script>
