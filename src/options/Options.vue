<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-3xl mx-auto px-4 py-4">
        <h1 class="text-xl font-semibold text-gray-900">GLM Translator 设置</h1>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-6">
      <div class="bg-white rounded-lg shadow">
        <!-- API服务商选择 -->
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px" aria-label="Tabs">
            <button
              v-for="provider in providers"
              :key="provider.id"
              @click="selectedProvider = provider.id"
              :class="[
                selectedProvider === provider.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm',
              ]"
            >
              <img
                :src="provider.icon"
                :alt="provider.name"
                class="w-5 h-5 mx-auto mb-1"
              />
              {{ provider.name }}
            </button>
          </nav>
        </div>

        <!-- 配置表单 -->
        <div class="p-6 space-y-6">
          <!-- 通用设置 -->
          <div class="bg-white rounded-lg shadow mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">通用设置</h2>
            </div>

            <div class="p-6 space-y-6">
              <!-- 语言设置 -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-gray-900">默认语言</h3>

                <!-- 源语言 -->
                <div class="form-group">
                  <label class="form-label">源语言</label>
                  <select
                    v-model="configs.general.sourceLang"
                    class="form-select"
                  >
                    <option value="auto">自动检测</option>
                    <optgroup
                      v-for="(langs, letter) in groupedLanguages"
                      :key="letter"
                      :label="letter"
                    >
                      <option
                        v-for="(name, code) in filteredSourceLanguages(langs)"
                        :key="code"
                        :value="code"
                      >
                        {{ name }}
                      </option>
                    </optgroup>
                  </select>
                </div>

                <!-- 目标语言 -->
                <div class="form-group">
                  <label class="form-label">目标语言</label>
                  <select
                    v-model="configs.general.targetLang"
                    class="form-select"
                  >
                    <optgroup
                      v-for="(langs, letter) in targetLanguageGroups"
                      :key="letter"
                      :label="letter"
                    >
                      <option
                        v-for="(name, code) in langs"
                        :key="code"
                        :value="code"
                      >
                        {{ name }}
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- 划词翻译设置 -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-gray-900">划词翻译</h3>

                <!-- 启用划词翻译 -->
                <div class="flex items-center justify-between">
                  <div>
                    <label class="text-sm font-medium text-gray-700"
                      >启用划词翻译</label
                    >
                    <p class="text-sm text-gray-500">
                      选中文本后自动显示翻译结果
                    </p>
                  </div>
                  <button
                    @click="toggleSelection"
                    :class="[
                      configs.general.enableSelection
                        ? 'bg-blue-600'
                        : 'bg-gray-200',
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    ]"
                  >
                    <span
                      :class="[
                        configs.general.enableSelection
                          ? 'translate-x-5'
                          : 'translate-x-0',
                        'pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      ]"
                    />
                  </button>
                </div>

                <!-- 触发方式 -->
                <div v-if="configs.general.enableSelection" class="space-y-2">
                  <label class="text-sm font-medium text-gray-700"
                    >触发方式</label
                  >
                  <div class="space-y-2">
                    <label class="inline-flex items-center">
                      <input
                        type="radio"
                        v-model="configs.general.selectionTrigger"
                        value="instant"
                        class="form-radio"
                      />
                      <span class="ml-2 text-sm text-gray-700"
                        >选中后立即显示</span
                      >
                    </label>
                    <label class="inline-flex items-center">
                      <input
                        type="radio"
                        v-model="configs.general.selectionTrigger"
                        value="icon"
                        class="form-radio"
                      />
                      <span class="ml-2 text-sm text-gray-700"
                        >显示翻译图标，点击后翻译</span
                      >
                    </label>
                  </div>
                </div>

                <!-- 快捷键设置 -->
                <div class="form-group">
                  <label class="form-label">快捷键</label>
                  <div class="flex items-center space-x-2">
                    <input
                      type="text"
                      v-model="configs.general.shortcut"
                      class="form-input"
                      placeholder="例如：Alt+T"
                      @keydown="handleShortcutInput"
                      readonly
                    />
                    <button
                      @click="clearShortcut"
                      class="text-sm text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- GLM 设置 -->
          <div v-if="selectedProvider === 'glm'" class="space-y-6">
            <div class="form-group">
              <label class="form-label">API Key</label>
              <div class="relative">
                <input
                  v-model="configs.glm.apiKey"
                  type="password"
                  class="form-input"
                  placeholder="输入您的 GLM API Key"
                />
                <div class="form-hint">
                  <a
                    href="https://open.bigmodel.cn/usercenter/apikeys"
                    target="_blank"
                    class="hint-link"
                  >
                    在智谱 AI 开放平台获取 API Key
                    <svg
                      class="inline-block w-4 h-4 ml-1"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                      />
                      <path
                        d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">模型选择</label>
              <select v-model="configs.glm.model" class="form-select">
                <option value="glm-4">GLM-4（功能最强）</option>
                <option value="glm-3-turbo">GLM-3-Turbo（响应更快）</option>
              </select>
            </div>
          </div>

          <!-- 自定义 API -->
          <div v-if="selectedProvider === 'custom'" class="space-y-6">
            <div class="form-group">
              <label class="form-label">API 地址</label>
              <input
                v-model="configs.custom.url"
                type="text"
                class="form-input"
                placeholder="https://api.example.com/v1/chat/completions"
              />
            </div>

            <div class="form-group">
              <label class="form-label">API Key</label>
              <input
                v-model="configs.custom.apiKey"
                type="password"
                class="form-input"
                placeholder="输入您的 API Key"
              />
            </div>

            <div class="form-group">
              <label class="form-label">模型名称</label>
              <input
                v-model="configs.custom.model"
                type="text"
                class="form-input"
                placeholder="例如：gpt-3.5-turbo"
              />
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="mt-8">
            <button
              @click="saveSettings"
              class="save-button"
              :disabled="isSaving"
            >
              <svg
                v-if="isSaving"
                class="animate-spin -ml-1 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ isSaving ? "保存中..." : "保存设置" }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from "vue";
import { allLanguages } from "../common/languages";

export default {
  name: "Options",
  setup() {
    // 只保留 GLM 和自定义 API
    const providers = [
      { id: "glm", name: "智谱 GLM", icon: "/icons/glm.png" },
      { id: "custom", name: "自定义 API", icon: "/icons/custom.png" },
    ];

    const selectedProvider = ref("glm");
    const isSaving = ref(false);

    const configs = reactive({
      glm: {
        apiKey: "",
        model: "glm-4",
        targetLang: "zh",
        sourceLang: "auto",
      },
      custom: {
        url: "",
        apiKey: "",
        model: "",
        targetLang: "zh",
        sourceLang: "auto",
      },
      general: {
        sourceLang: "auto",
        targetLang: "zh",
        enableSelection: true,
        selectionTrigger: "icon",
        shortcut: "Alt+T",
      },
    });

    // 按字母分组语言
    const groupedLanguages = computed(() => {
      const groups = {};
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      letters.forEach((letter) => (groups[letter] = {}));

      // 添加自动检测到A组
      groups["A"]["auto"] = "自动检测";

      // 使用 common/languages.js 中的拼音映射
      const pinyinMap = {
        阿: "A",
        艾: "A",
        巴: "B",
        比: "B",
        波: "B",
        布: "B",
        保: "B",
        查: "C",
        楚: "C",
        契: "Q",
        聪: "C",
        达: "D",
        丹: "D",
        德: "D",
        鞑: "D",
        俄: "E",
        法: "F",
        菲: "F",
        斐: "F",
        芬: "F",
        富: "F",
        格: "G",
        刚: "G",
        干: "G",
        古: "G",
        高: "G",
        海: "H",
        荷: "H",
        韩: "H",
        豪: "H",
        希: "X",
        匈: "X",
        伊: "Y",
        意: "Y",
        印: "Y",
        因: "Y",
        约: "Y",
        越: "Y",
        英: "Y",
        亚: "Y",
        加: "J",
        捷: "J",
        基: "J",
        克: "K",
        卡: "K",
        库: "K",
        宽: "K",
        科: "K",
        拉: "L",
        立: "L",
        卢: "L",
        林: "L",
        罗: "L",
        马: "M",
        蒙: "M",
        孟: "M",
        姆: "M",
        南: "N",
        尼: "N",
        挪: "N",
        那: "N",
        葡: "P",
        旁: "P",
        奇: "Q",
        齐: "Q",
        日: "R",
        瑞: "R",
        塞: "S",
        萨: "S",
        斯: "S",
        索: "S",
        史: "S",
        世: "S",
        泰: "T",
        土: "T",
        塔: "T",
        提: "T",
        汤: "T",
        乌: "W",
        威: "W",
        沃: "W",
        西: "X",
        扎: "Z",
        祖: "Z",
        札: "Z",
        中: "Z",
      };

      Object.entries(allLanguages).forEach(([code, name]) => {
        if (code === "detect") return;

        const firstChar = name.charAt(0);
        const letter = pinyinMap[firstChar] || firstChar.toUpperCase();

        if (!groups[letter]) {
          groups[letter] = {};
        }
        groups[letter][code] = name;
      });

      // 对每个组内的语言进行排序
      const sortedGroups = {};
      letters.forEach((letter) => {
        if (Object.keys(groups[letter]).length > 0) {
          const entries = Object.entries(groups[letter]);
          entries.sort((a, b) => a[1].localeCompare(b[1], "zh-CN"));

          sortedGroups[letter] = {};
          entries.forEach(([code, name]) => {
            sortedGroups[letter][code] = name;
          });
        }
      });

      return sortedGroups;
    });

    // 目标语言组（排除自动检测）
    const targetLanguageGroups = computed(() => {
      const groups = { ...groupedLanguages.value };
      if (groups["A"] && groups["A"]["auto"]) {
        delete groups["A"]["auto"];
      }
      return groups;
    });

    // 过滤源语言选项
    const filteredSourceLanguages = (langs) => {
      return langs;
    };

    // 保存设置
    const saveSettings = async () => {
      isSaving.value = true;
      try {
        const config = {
          selectedProvider: selectedProvider.value,
          general: {
            ...configs.general,
            sourceLang: configs.general.sourceLang,
            targetLang: configs.general.targetLang,
            enableSelection: configs.general.enableSelection,
            selectionTrigger: configs.general.selectionTrigger,
          },
        };

        // 保存服务商特定配置
        switch (selectedProvider.value) {
          case "glm":
            if (!configs.glm.apiKey) {
              throw new Error("请输入智谱 GLM API Key");
            }
            config.glmConfig = configs.glm;
            break;
          case "custom":
            if (!configs.custom.url) {
              throw new Error("请输入自定义 API 地址");
            }
            config.customConfig = configs.custom;
            break;
        }

        await chrome.storage.sync.set(config);
        console.log("保存的配置:", config);
        alert("设置已保存");
      } catch (err) {
        alert(err.message || "保存设置失败");
      } finally {
        isSaving.value = false;
      }
    };

    // 加载设置
    const loadSettings = async () => {
      const settings = await chrome.storage.sync.get([
        "selectedProvider",
        "glmConfig",
        "customConfig",
        "general",
      ]);

      if (settings.selectedProvider) {
        selectedProvider.value = settings.selectedProvider;
      }
      if (settings.glmConfig) {
        Object.assign(configs.glm, settings.glmConfig);
      }
      if (settings.customConfig) {
        Object.assign(configs.custom, settings.customConfig);
      }
      if (settings.general) {
        Object.assign(configs.general, settings.general);
      }
    };

    // 切换划词翻译
    const toggleSelection = () => {
      configs.general.enableSelection = !configs.general.enableSelection;
    };

    // 处理快捷键输入
    const handleShortcutInput = (e) => {
      e.preventDefault();
      const keys = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.key && !["Control", "Alt", "Shift"].includes(e.key)) {
        keys.push(e.key.toUpperCase());
      }
      if (keys.length > 0) {
        configs.general.shortcut = keys.join("+");
      }
    };

    // 清除快捷键
    const clearShortcut = () => {
      configs.general.shortcut = "";
    };

    onMounted(() => {
      loadSettings();
    });

    return {
      providers,
      selectedProvider,
      configs,
      isSaving,
      saveSettings,
      toggleSelection,
      handleShortcutInput,
      clearShortcut,
      groupedLanguages,
      targetLanguageGroups,
      filteredSourceLanguages,
    };
  },
};
</script>

<style scoped>
.options-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.header h1 {
  max-width: 800px;
  margin: 0 auto;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.main-content {
  padding: 0 16px 32px;
}

.form-group {
  @apply space-y-2;
}

.form-label {
  @apply block text-sm font-medium text-gray-700;
}

.form-input {
  @apply block w-full px-4 py-3 rounded-lg border border-gray-200 
         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         bg-white shadow-sm transition duration-150 ease-in-out
         text-gray-900 placeholder-gray-400;
}

.form-select {
  @apply block w-full px-4 py-3 rounded-lg border border-gray-200 
         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         bg-white shadow-sm transition duration-150 ease-in-out
         text-gray-900;
}

.form-hint {
  @apply mt-2 text-sm text-gray-500;
}

.hint-link {
  @apply text-blue-600 hover:text-blue-700 transition duration-150 ease-in-out 
         inline-flex items-center;
}

.save-button {
  @apply w-full flex items-center justify-center px-6 py-3 
         border border-transparent text-base font-medium rounded-lg
         text-white bg-blue-600 hover:bg-blue-700 
         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
         disabled:opacity-50 disabled:cursor-not-allowed
         transition duration-150 ease-in-out shadow-sm;
}

.form-input:focus,
.form-select:focus {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.form-input:hover,
.form-select:hover {
  @apply border-gray-300;
}

.form-radio {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300;
}
</style>
