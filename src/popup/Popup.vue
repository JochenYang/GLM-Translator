<template>
  <div
    class="shell"
    @paste="onPaste"
    @dragover.prevent="dragOver = true"
    @dragleave.prevent="dragOver = false"
    @drop.prevent="onDrop"
  >
    <header class="topbar">
      <div class="brand">
        <img class="brand-logo" :src="logoUrl" alt="GLM Translator" />
        <span class="brand-name">GLM</span>
      </div>
      <label class="sr-only" for="engine-select">{{ translate("popup.engineLabel") }}</label>
      <img
        v-if="currentProvider === 'bilibili'"
        class="engine-logo"
        :src="bilibiliLogo"
        alt=""
      />
      <select
        id="engine-select"
        v-model="currentProvider"
        class="engine-select"
        @change="onEngineChange"
      >
        <option v-for="engine in engineOptions" :key="engine.id" :value="engine.id">
          {{ engine.name }}
        </option>
      </select>
      <button type="button" class="icon-btn" @click="openSettings" :title="translate('popup.settings')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </header>

    <div class="langbar">
      <select v-model="sourceLang" class="lang" @change="onSourceLangChange">
        <option value="auto">{{ translate("lang.auto") }}</option>
        <optgroup :label="translate('lang.common')">
          <option v-for="code in commonLanguages" :key="'s'+code" :value="code">{{ languages[code] || code }}</option>
        </optgroup>
        <optgroup :label="translate('lang.all')">
          <option v-for="code in otherLanguages" :key="'sa'+code" :value="code">{{ languages[code] || code }}</option>
        </optgroup>
      </select>
      <button type="button" class="swap" @click="switchLanguages" :title="translate('popup.switchLanguages')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M8 3L4 7L8 11"></path>
          <path d="M4 7H20"></path>
          <path d="M16 21L20 17L16 13"></path>
          <path d="M20 17H4"></path>
        </svg>
      </button>
      <select v-model="targetLang" class="lang" @change="onTargetLangChange">
        <optgroup :label="translate('lang.common')">
          <option v-for="code in commonLanguages" :key="'t'+code" :value="code">{{ languages[code] || code }}</option>
        </optgroup>
        <optgroup :label="translate('lang.all')">
          <option v-for="code in otherLanguages" :key="'ta'+code" :value="code">{{ languages[code] || code }}</option>
        </optgroup>
      </select>
      <span v-if="detectedLabel" class="detected">{{ detectedLabel }}</span>
    </div>
    <p v-if="engineHint" class="hint warn">{{ engineHint }}</p>

    <section class="panel" :class="{ over: dragOver }">
      <div class="panel-label">
        <span>{{ translate("popup.sourceLabel") }}</span>
        <button type="button" class="text-btn" @click="fileInput?.click()">{{ translate("popup.pickImage") }}</button>
        <input ref="fileInput" class="file" type="file" accept="image/*" @change="onFile" />
      </div>
      <div v-if="pastedImage" class="shot">
        <img :src="pastedImage" alt="" />
        <button type="button" class="text-btn" @click="clearImage">{{ translate("popup.clearImage") }}</button>
      </div>
      <textarea
        v-else
        v-model="inputText"
        class="source"
        :placeholder="translate('popup.inputPlaceholder')"
        @input="handleInput"
        ref="inputTextarea"
      ></textarea>
      <div class="panel-foot">
        <span>{{ pastedImage ? translate("popup.imageNote") : translate("popup.pasteHint") }}</span>
        <span v-if="!pastedImage">{{ inputText.length }}</span>
      </div>
    </section>

    <section class="panel result">
      <div class="panel-label">
        <span>{{ translate("popup.resultLabel") }}</span>
        <span v-if="isTranslating" class="hint">{{ progressText }}</span>
      </div>
      <div class="result-body" ref="resultArea">
        <div v-if="isTranslating && !translatedText" class="loading-state">
          <div class="loading-spinner"></div>
          <span>{{ progressText }}</span>
        </div>
        <div v-else-if="translatedText" class="result-text">{{ translatedText }}</div>
        <div v-else class="empty-result">{{ translate("popup.emptyResult") }}</div>
      </div>
      <div v-if="translatedText && !isTranslating" class="panel-foot">
        <span></span>
        <button type="button" class="icon-btn" @click="copyText" :title="translate('popup.copyTranslation')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </section>
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { allLanguages, COMMON_LANGUAGE_CODES } from "../common/languages";
import {
  initLanguage,
  getCurrentLanguage,
  t,
  getLanguageDisplayName,
  setupLanguageListener,
} from "../utils/i18n.js";
import { resolveSourceLanguage } from "../utils/detectLanguage.js";
import {
  getSelectedApiConfig,
  loadApiConfigs,
  saveApiConfigs,
} from "../utils/secureStorage.js";
import { getProviderConfig } from "../config/providers.js";
import {
  classifyMessagingError,
  MESSAGING_ERROR_KIND,
} from "../utils/messagingErrors.js";

export default {
  name: "Popup",
  setup() {
    const sourceLang = ref("auto");
    const targetLang = ref("zh");
    const inputText = ref("");
    const translatedText = ref("");
    const isTranslating = ref(false);
    const progressCurrent = ref(0);
    const progressTotal = ref(0);
    const languages = ref(allLanguages);
    const inputTextarea = ref(null);
    const resultArea = ref(null);
    const fileInput = ref(null);
    const pastedImage = ref("");
    const dragOver = ref(false);
    const currentLanguage = ref("zh");
    const forceUpdateKey = ref(0); // 用于强制更新的键
    const detectedCode = ref(null);
    const currentProvider = ref("microsoft");
    const engineHint = ref("");
    let previousProvider = "microsoft"; // 切换失败时回退
    let resizeObserverRef = null; // ResizeObserver 引用，用于 onUnmounted 断开

    const logoUrl = chrome.runtime.getURL("icons/icon48.png");
    const bilibiliLogo = chrome.runtime.getURL("icons/bilibili.svg");

    // ─── 引擎切换 ────────────────────────────────────────────
    // 免 Key 引擎始终可选；AI 引擎仅在设置页保存过配置后出现
    const engineOptions = computed(() => {
      forceUpdateKey.value;
      const options = [];
      const seen = new Set();
      for (const id of ["bilibili", "microsoft", "google", "transmart", "youdao"]) {
        options.push({
          id,
          name: engineDisplayName(id),
        });
        seen.add(id);
      }
      for (const api of savedApisForEngines.value) {
        if (seen.has(api.provider)) continue;
        seen.add(api.provider);
        options.push({
          id: api.provider,
          name: engineDisplayName(api.provider),
        });
      }
      return options;
    });

    const savedApisForEngines = ref([]);

    function engineDisplayName(providerId) {
      const key = `provider.name.${providerId}`;
      const localized = t(key);
      if (localized && localized !== key) return localized;
      return getProviderConfig(providerId)?.name || providerId;
    }

    async function loadCurrentEngine() {
      try {
        const { savedApis } = await loadApiConfigs();
        savedApisForEngines.value = savedApis || [];
        const { provider } = await getSelectedApiConfig();
        if (provider && engineOptions.value.some((e) => e.id === provider)) {
          currentProvider.value = provider;
        }
      } catch (error) {
        console.error("加载翻译引擎失败:", error);
      }
    }

    async function onEngineChange() {
      const target = currentProvider.value;
      const prev = engineOptions.value.some((e) => e.id === previousProvider)
        ? previousProvider
        : "microsoft";
      try {
        const { savedApis } = await loadApiConfigs();
        const preset = getProviderConfig(target);
        if (preset?.noApiKeyRequired) {
          await saveApiConfigs(savedApis || [], {
            selectedProvider: target,
            selectedApiId: null,
          });
        } else {
          const candidates = (savedApis || []).filter(
            (a) => a.provider === target
          );
          if (!candidates.length) {
            engineHint.value = translate("popup.engineNeedsConfig");
            currentProvider.value = prev;
            return;
          }
          const { selectedApiId } = await loadApiConfigs();
          const api =
            candidates.find((a) => a.id === selectedApiId) || candidates[0];
          await saveApiConfigs(savedApis || [], {
            selectedProvider: target,
            selectedApiId: api.id,
          });
        }
        previousProvider = target;
        engineHint.value = "";
        if (pastedImage.value) {
          await handleImageTranslate();
        } else if (inputText.value.trim()) {
          await handleTranslate();
        }
      } catch (error) {
        console.error("切换翻译引擎失败:", error);
        engineHint.value = translate("popup.engineSwitchFailed");
        currentProvider.value = prev;
      }
    }

    const progressText = computed(() => {
      if (!isTranslating.value) return translate("popup.translating");
      if (progressTotal.value > 1) {
        return `正在翻译 ${progressCurrent.value}/${progressTotal.value} 段…`;
      }
      return translate("popup.translating");
    });

    const detectedLabel = computed(() => {
      forceUpdateKey.value;
      if (!detectedCode.value) return "";
      const name =
        allLanguages[detectedCode.value] ||
        getLanguageDisplayName(detectedCode.value) ||
        detectedCode.value;
      return `检测: ${name}`;
    });

    // 创建响应式的翻译函数
    const translate = (key, params = {}) => {
      // 触发 forceUpdateKey 的读取，建立依赖关系
      forceUpdateKey.value;
      const result = t(key, params);
      return result;
    };

    // 常用语言列表（置顶）
    const commonLanguages = computed(() => {
      forceUpdateKey.value;
      return COMMON_LANGUAGE_CODES.filter((code) => allLanguages[code]);
    });

    // 其余所有语言列表（拼音/字母排序）
    const otherLanguages = computed(() => {
      forceUpdateKey.value;
      const commonSet = new Set(COMMON_LANGUAGE_CODES);
      return Object.keys(allLanguages)
        .filter(
          (code) =>
            code !== "detect" && code !== "auto" && !commonSet.has(code)
        )
        .sort((a, b) => {
          const nameA = allLanguages[a] || a;
          const nameB = allLanguages[b] || b;
          return nameA.localeCompare(nameB, "zh-CN");
        });
    });

    // 智能切换源语言和目标语言
    const switchLanguages = async () => {
      const oldSource = sourceLang.value;
      const oldTarget = targetLang.value;
      let newSource = oldTarget;
      let newTarget = oldSource;

      // 如果源语言是“自动检测”
      if (oldSource === "auto") {
        if (detectedCode.value && detectedCode.value !== oldTarget) {
          newTarget = detectedCode.value;
        } else {
          newTarget = oldTarget === "zh" ? "en" : "zh";
        }
      }

      // 如果互换后源与目标相同，智能调整目标语言
      if (newSource === newTarget) {
        newTarget = newSource === "zh" ? "en" : "zh";
      }

      sourceLang.value = newSource;
      targetLang.value = newTarget;

      // 如果已有有效译文，将译文填入输入框，实现真正的双向对调翻译
      if (
        translatedText.value &&
        translatedText.value !== "翻译中..." &&
        !translatedText.value.startsWith("翻译失败")
      ) {
        const prevResult = translatedText.value;
        inputText.value = prevResult;
        translatedText.value = "";
        detectedCode.value = null;
        await handleInput();
      } else if (inputText.value.trim()) {
        await handleInput();
      }
    };

    // 语言冲突防呆：防止源与目标选成同一种语言
    const onSourceLangChange = () => {
      if (
        sourceLang.value !== "auto" &&
        sourceLang.value === targetLang.value
      ) {
        targetLang.value = sourceLang.value === "zh" ? "en" : "zh";
      }
    };

    const onTargetLangChange = () => {
      if (
        sourceLang.value !== "auto" &&
        sourceLang.value === targetLang.value
      ) {
        sourceLang.value = targetLang.value === "zh" ? "en" : "zh";
      }
    };

    // 监听语言变化
    watch([sourceLang, targetLang], async ([newSourceLang, newTargetLang]) => {
      try {

        // 获取当前设置
        const settings = await chrome.storage.sync.get("general");
        const generalSettings = settings.general || {};

        // 更新存储
        await chrome.storage.sync.set({
          general: {
            ...generalSettings, // 保留其他设置
            sourceLang: newSourceLang,
            targetLang: newTargetLang,
          },
        });

        // 如果有输入文本，重新翻译
        if (pastedImage.value) {
          await handleImageTranslate();
        } else if (inputText.value.trim()) {
          await handleTranslate();
        }
      } catch (error) {
        console.error("保存语言设置失败:", error);
      }
    });

    // 监听输入文本变化，自动调整高度
    watch(inputText, () => {
      // 使用nextTick确保DOM已更新后再调整高度
      nextTick(() => {
        // 使用防抖处理以降低频繁调整的性能消耗
        if (!debounceResize) {
          debounceResize = createDebounce(autoResize, 50);
        }
        debounceResize();
      });
    });

    // 监听翻译结果变化，自动调整结果区域高度
    watch(translatedText, () => {
      nextTick(() => {
        adjustResultHeight();
      });
    });

    // 创建防抖变量
    let debounceResize = null;

    // 带自动重试的消息发送 - 应对 MV3 Service Worker 休眠唤醒竞态
    async function sendMessageWithRetry(message, maxRetries = 3) {
      let lastError;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await chrome.runtime.sendMessage(message);
        } catch (error) {
          lastError = error;
          const kind = classifyMessagingError(error);
          // 上下文失效、后台脚本加载失败：重试永远不会成功，直接给恢复动作
          if (kind === MESSAGING_ERROR_KIND.CONTEXT_INVALIDATED) {
            throw new Error("扩展上下文已失效，请刷新页面后重试");
          }
          if (kind === MESSAGING_ERROR_KIND.SCRIPT_LOAD_FAILED) {
            throw new Error(
              "扩展后台脚本加载失败，请在 chrome://extensions 重新加载扩展后重试"
            );
          }
          if (kind === MESSAGING_ERROR_KIND.WORKER_UNAVAILABLE) {
            throw new Error(
              "扩展后台服务未启动，请在 chrome://extensions 重新加载扩展后重试"
            );
          }
          if (kind !== MESSAGING_ERROR_KIND.RETRYABLE) throw error;
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
        }
      }
      // 重试耗尽时保留原始错误，否则只剩一句看不出原因的笼统文案
      throw new Error(
        `翻译服务暂未就绪（${lastError?.message || "未知错误"}），请稍后重试或刷新页面`
      );
    }

    // 公共翻译核心逻辑
    async function executeTranslation(text, srcLang, tgtLang) {
      // Local detect for UI when source is auto
      const resolved = resolveSourceLanguage(text, srcLang);
      if (srcLang === "auto" && resolved.detected) {
        detectedCode.value = resolved.detected;
      } else {
        detectedCode.value = null;
      }

      const response = await sendMessageWithRetry({
        action: "translate",
        text,
        sourceLang: srcLang,
        targetLang: tgtLang,
      });
      if (response && response.translatedText) {
        if (response.detectedLanguage) {
          detectedCode.value = response.detectedLanguage;
        }
        return response.translatedText;
      } else if (response && response.error) {
        if (
          response.error.includes("无法完成翻译") ||
          response.error.includes("无法翻译")
        ) {
          throw new Error(
            "翻译服务遇到了问题，请尝试修改文本内容后重新翻译。"
          );
        }
        throw new Error(response.error);
      }
      throw new Error("翻译失败: 未知错误");
    }

    // 翻译处理函数
    function readImageFile(file) {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        downscaleImage(String(reader.result))
          .then((url) => {
            pastedImage.value = url;
            inputText.value = "";
            dragOver.value = false;
            handleImageTranslate();
          })
          .catch((err) => {
            translatedText.value = `翻译失败: ${err.message || "无法读取图片"}`;
          });
      };
      reader.readAsDataURL(file);
    }

    function downscaleImage(dataUrl, maxEdge = 1600) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("无法读取图片"));
        img.src = dataUrl;
      });
    }

    function onPaste(event) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          event.preventDefault();
          readImageFile(item.getAsFile());
          return;
        }
      }
    }

    function onDrop(event) {
      dragOver.value = false;
      const file = event.dataTransfer?.files?.[0];
      if (file) readImageFile(file);
    }

    function onFile(event) {
      const file = event.target.files?.[0];
      if (file) readImageFile(file);
      event.target.value = "";
    }

    function clearImage() {
      pastedImage.value = "";
      translatedText.value = "";
    }

    async function handleImageTranslate() {
      if (!pastedImage.value) return;
      try {
        isTranslating.value = true;
        progressCurrent.value = 0;
        progressTotal.value = 0;
        translatedText.value = "";
        const response = await sendMessageWithRetry({
          action: "translateImage",
          image: pastedImage.value,
          sourceLang: sourceLang.value,
          targetLang: targetLang.value,
        });
        if (response?.translatedText) {
          translatedText.value = response.translatedText;
        } else {
          throw new Error(response?.error || "图片翻译失败");
        }
      } catch (err) {
        console.error("图片翻译错误:", err);
        translatedText.value = `翻译失败: ${err.message}`;
      } finally {
        isTranslating.value = false;
      }
    }

    async function handleTranslate() {
      try {
        isTranslating.value = true;
        progressCurrent.value = 0;
        progressTotal.value = 0;
        translatedText.value = "翻译中...";
        const result = await executeTranslation(inputText.value, sourceLang.value, targetLang.value);
        translatedText.value = result;
      } catch (err) {
        console.error("翻译错误:", err);
        translatedText.value = `翻译失败: ${err.message}`;
      } finally {
        isTranslating.value = false;
        progressCurrent.value = 0;
        progressTotal.value = 0;
      }
    }

    // 自定义防抖函数 (替代 lodash/debounce)
    function createDebounce(func, wait) {
      let timeout;
      return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    }

    // 自动调整输入框高度
    const autoResize = () => {
      if (!inputTextarea.value) return;

      // 使用requestAnimationFrame确保视觉更新流畅
      requestAnimationFrame(() => {
        // 重置高度以便正确计算
        inputTextarea.value.style.height = "auto";

        // 获取内容高度
        const scrollHeight = inputTextarea.value.scrollHeight;

        // 根据内容设置高度，确保不超过最大高度
        const newHeight = Math.min(scrollHeight + 5, 500);
        inputTextarea.value.style.height = `${newHeight}px`;

        // 如果输入区域调整了高度，同时更新结果区域高度
        if (resultArea.value && newHeight >= 120) {
          resultArea.value.style.minHeight = `${newHeight}px`;
        }
      });
    };

    // 自动调整结果区域高度
    const adjustResultHeight = () => {
      if (!resultArea.value) return;

      // 使用requestAnimationFrame确保视觉更新流畅
      requestAnimationFrame(() => {
        // 重置可能的内联高度样式
        resultArea.value.style.height = "";

        // 获取实际内容高度
        const contentHeight = resultArea.value.scrollHeight;

        // 如果内容高度大于最小高度，设置实际高度
        if (contentHeight > 120) {
          // 设置动画目标高度（最大不超过max-height）
          const targetHeight = Math.min(contentHeight, 500);
          resultArea.value.style.height = `${targetHeight}px`;
        }
      });
    };

    // 修改翻译处理函数
    const handleInput = createDebounce(async () => {
      // 确保输入区域高度自适应
      if (debounceResize) {
        debounceResize();
      } else {
        autoResize();
      }

      if (!inputText.value.trim()) {
        translatedText.value = "";
        detectedCode.value = null;
        return;
      }

      try {
        isTranslating.value = true;
        progressCurrent.value = 0;
        progressTotal.value = 0;
        translatedText.value = "翻译中...";
        const result = await executeTranslation(inputText.value, sourceLang.value, targetLang.value);
        translatedText.value = result;
      } catch (err) {
        console.error("翻译错误:", err);
        translatedText.value = `翻译失败: ${err.message}`;
      } finally {
        isTranslating.value = false;
        progressCurrent.value = 0;
        progressTotal.value = 0;
      }
    }, 500);

    // 复制翻译结果
    const copyText = () => {
      if (translatedText.value) {
        navigator.clipboard
          .writeText(translatedText.value)
          .then(() => {
            // 复制成功提示
            const originalText = translatedText.value;
            translatedText.value = "复制成功！";
            setTimeout(() => {
              translatedText.value = originalText;
            }, 1000);
          })
          .catch((err) => {
            console.error("复制失败:", err);
          });
      }
    };

    // 打开设置页面
    const openSettings = () => {
      chrome.runtime.openOptionsPage();
    };

    // 初始化语言设置
    const initI18nLanguage = async () => {
      try {
        await initLanguage();
        currentLanguage.value = await getCurrentLanguage();
        // 使用 nextTick 确保在 DOM 更新后触发
        await nextTick();
        forceUpdateKey.value++; // 初始化后触发一次更新，确保使用正确的语言
      } catch (error) {
        console.error("Failed to initialize language:", error);
      }
    };

    // 设置语言监听器
    const setupI18nLanguageListener = () => {
      setupLanguageListener((newLanguage) => {
        currentLanguage.value = newLanguage;
        forceUpdateKey.value++; // 增加键值，触发所有使用 translate 的地方重新计算
      });
    };

    // 组件挂载时加载设置
    onMounted(async () => {
      try {
        // 初始化语言与通用配置
        await initI18nLanguage();
        setupI18nLanguageListener();

        const settings = await chrome.storage.sync.get(["general"]);

        // 加载保存的语言设置
        if (settings.general) {
          sourceLang.value = settings.general.sourceLang || "auto";
          targetLang.value = settings.general.targetLang || "zh";
        }

        // 加载当前翻译引擎
        await loadCurrentEngine();

        // 确保输入框和结果区域高度自适应初始内容
        nextTick(() => {
          // 延迟一点点时间确保DOM完全就绪
          setTimeout(() => {
            if (inputText.value) {
              autoResize();
            }
            if (translatedText.value) {
              adjustResultHeight();
            }

            // 给输入框添加事件监听，优化交互体验
            if (inputTextarea.value) {
              // 监听resize事件，确保拖动调整大小时实时响应
              resizeObserverRef = new ResizeObserver(() => {
                // 这里不使用防抖，确保实时响应
                if (resultArea.value) {
                  // 保持结果区域与输入区域高度一致
                  const height = inputTextarea.value.offsetHeight;
                  if (height >= 120 && height <= 500) {
                    resultArea.value.style.minHeight = `${height}px`;
                  }
                }
              });

              resizeObserverRef.observe(inputTextarea.value);

              // 其他事件
              inputTextarea.value.addEventListener("focus", autoResize);
              inputTextarea.value.addEventListener("blur", autoResize);
            }
          }, 50);
        });
      } catch (error) {
        console.error("加载设置失败:", error);
      }
    });

    // 组件卸载时清理 ResizeObserver 与停止朗读
    onUnmounted(() => {
      if (resizeObserverRef) {
        resizeObserverRef.disconnect();
        resizeObserverRef = null;
      }
      if (progressListener) {
        chrome.runtime.onMessage.removeListener(progressListener);
        progressListener = null;
      }
    });

    // 监听 background 推送的翻译进度
    let progressListener = null;
    const onProgressMessage = (request) => {
      if (request?.action === "translateProgress") {
        progressCurrent.value = request.current || 0;
        progressTotal.value = request.total || 0;
      }
      if (request?.action === "translateImageChunk" && request.text) {
        translatedText.value = request.text;
      }
    };
    progressListener = onProgressMessage;
    chrome.runtime.onMessage.addListener(progressListener);

    return {
      sourceLang,
      targetLang,
      inputText,
      translatedText,
      isTranslating,
      progressText,
      detectedLabel,
      languages,
      commonLanguages,
      otherLanguages,
      onSourceLangChange,
      onTargetLangChange,
      switchLanguages,
      handleInput,
      copyText,
      openSettings,
      inputTextarea,
      resultArea,
      fileInput,
      pastedImage,
      dragOver,
      onPaste,
      onDrop,
      onFile,
      clearImage,
      currentLanguage,
      translate,
      getLanguageDisplayName,
      currentProvider,
      engineOptions,
      engineHint,
      onEngineChange,
      logoUrl,
      bilibiliLogo,
    };
  },
};
</script>

<style scoped>
.popup-container {
  min-width: 500px; /* 增加最小宽度 */
  max-width: 800px; /* 增加最大宽度 */
  width: auto; /* 允许宽度自适应 */
}

.language-select {
  @apply block text-sm border border-gray-200 rounded-md
         focus:ring-1 focus:ring-primary-500 focus:border-primary-500
         bg-white shadow-sm;
  height: 32px;
  padding: 0 8px;
  width: 120px; /* 固定宽度 */
}

.language-switch {
  @apply flex items-center justify-center rounded-md 
         bg-gray-50 hover:bg-gray-100 transition-colors duration-200;
  width: 32px;
  height: 32px;
  padding: 6px;
  margin: 0 8px; /* 添加左右间距 */
}

.detected-badge {
  font-size: 11px;
  color: var(--gt-text-secondary);
  margin-left: 6px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engine-row {
  display: flex;
  align-items: center;
  margin: -8px 0 12px;
}

.engine-label {
  font-size: 12px;
  color: var(--gt-text-secondary);
  margin-right: 6px;
}

.engine-select {
  @apply block text-sm border rounded-md
         focus:ring-1 focus:ring-primary-500 focus:border-primary-500
         bg-white shadow-sm;
  border-color: var(--gt-border);
  height: 28px;
  padding: 0 8px;
  width: 180px;
}

.engine-hint {
  font-size: 11px;
  color: var(--gt-warning);
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-btn {
  @apply flex items-center justify-center rounded-md
         bg-gray-50 hover:bg-gray-100 transition-colors duration-200;
  width: 32px;
  height: 32px;
  margin-left: 8px;
  padding: 6px;
}

.settings-icon {
  width: 20px;
  height: 20px;
  color: var(--gt-text);
}

.translation-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.translation-area {
  position: relative;
  width: 100%;
}

.input-area {
  width: 100%;
  min-height: 120px;
  max-height: 500px; /* 增加最大高度，可容纳更多文本 */
  padding: 12px 12px 30px 12px;
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius-sm);
  font-size: 14px;
  line-height: 1.5;
  color: var(--gt-text);
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  overflow-y: auto;
}

.input-area:focus {
  border-color: var(--gt-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gt-primary) 50%, transparent);
}

.input-actions {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 8px;
  z-index: 2;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: var(--gt-text-muted);
}

.result-area {
  width: 100%;
  min-height: 120px;
  max-height: 500px; /* 增加最大高度，与输入区域一致 */
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius-sm);
  font-size: 14px;
  line-height: 1.5;
  background: var(--gt-surface-muted);
  position: relative;
}

.result-area.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gt-text-muted);
}

.result-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--gt-text);
  margin-bottom: 30px; /* 为底部操作按钮留出空间 */
}

.empty-result {
  color: var(--gt-text-muted);
  font-style: italic;
  text-align: center;
}

.result-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(237, 242, 247, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(203, 213, 224, 0.8);
}

.action-icon {
  width: 16px;
  height: 16px;
  color: var(--gt-text);
}

/* 滚动条样式 */
.result-area::-webkit-scrollbar {
  width: 6px;
}

.result-area::-webkit-scrollbar-track {
  background: var(--gt-surface-muted);
  border-radius: 3px;
}

.result-area::-webkit-scrollbar-thumb {
  background: var(--gt-text-muted);
  border-radius: 3px;
}

.result-area::-webkit-scrollbar-thumb:hover {
  background: var(--gt-text-secondary);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gt-text-muted);
  justify-content: center;
  padding: 20px 0;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--gt-border);
  border-top: 2px solid var(--gt-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

:global(html),
:global(body) {
  margin: 0;
  background: var(--gt-surface-muted);
}

.shell {
  width: 400px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--gt-text);
}

.topbar,
.langbar,
.panel-label,
.panel-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
}

.brand-logo,
.engine-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.engine-logo {
  width: 16px;
  height: 16px;
}

.brand-name {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.shell .engine-select,
.lang {
  height: 30px;
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius-sm);
  background: var(--gt-surface);
  color: var(--gt-text);
  font-size: 12px;
  padding: 0 8px;
}

.shell .engine-select {
  width: 148px;
  margin: 0;
}

.lang { flex: 1; min-width: 0; }

.icon-btn,
.swap {
  width: 30px;
  height: 30px;
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius-sm);
  background: var(--gt-surface);
  color: var(--gt-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.icon-btn svg,
.swap svg { width: 16px; height: 16px; }

.icon-btn:hover,
.swap:hover { color: var(--gt-text); background: var(--gt-surface-muted); }

.detected,
.hint {
  font-size: 11px;
  color: var(--gt-text-secondary);
  white-space: nowrap;
}

.hint.warn { color: var(--gt-warning); margin: 0; }

.panel {
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius);
  background: var(--gt-surface);
  padding: 8px 10px 6px;
}

.panel.over { border-color: var(--gt-primary); }

.panel-label,
.panel-foot {
  justify-content: space-between;
  font-size: 11px;
  color: var(--gt-text-muted);
}

.text-btn {
  border: 0;
  background: transparent;
  color: var(--gt-primary);
  font-size: 12px;
  padding: 0;
  cursor: pointer;
}

.file { display: none; }

.source {
  width: 100%;
  min-height: 96px;
  max-height: 180px;
  border: 0;
  resize: none;
  outline: none;
  background: transparent;
  color: var(--gt-text);
  font-size: 14px;
  line-height: 1.5;
  padding: 4px 0;
}

.shot img {
  display: block;
  width: 100%;
  max-height: 160px;
  object-fit: contain;
  border-radius: var(--gt-radius-sm);
  background: var(--gt-surface-muted);
}

.result-body {
  min-height: 88px;
  max-height: 200px;
  overflow: auto;
}

.shell .result-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.55;
  color: var(--gt-text);
}

.shell .empty-result {
  color: var(--gt-text-muted);
  font-size: 13px;
  padding: 18px 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
