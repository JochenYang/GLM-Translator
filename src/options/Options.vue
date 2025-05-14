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
          <nav class="flex -mb-px overflow-x-auto" aria-label="Tabs">
            <button
              v-for="provider in savedApis"
              :key="provider.id"
              @click="selectApiProvider(provider.id)"
              :class="[
                selectedApiId === provider.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-4 text-center border-b-2 font-medium text-sm',
              ]"
            >
              {{ provider.name }}
            </button>
            <button
              @click="showAddApiModal = true"
              class="whitespace-nowrap py-4 px-4 text-center border-b-2 font-medium text-sm text-green-600 border-transparent hover:border-green-300"
            >
              <svg
                class="w-4 h-4 inline-block mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              添加API
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

          <!-- 当前选中API设置 -->
          <div v-if="selectedApiId && currentApiConfig" class="space-y-6">
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-medium text-gray-900">
                {{ currentApiConfig.name }} 设置
              </h2>
              <div class="flex space-x-2">
                <button
                  @click="confirmDeleteApi"
                  class="text-red-600 hover:text-red-800 text-sm"
                  v-if="!isDefaultApi(currentApiConfig.id)"
                >
                  删除
                </button>
                <button
                  @click="duplicateCurrentApi"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  复制
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">API 地址</label>
              <input
                v-model="currentApiConfig.url"
                type="text"
                class="form-input"
                placeholder="API服务地址"
                :readonly="isDefaultApi(currentApiConfig.id)"
              />
            </div>

            <div class="form-group">
              <label class="form-label">API Key</label>
              <input
                v-model="currentApiConfig.apiKey"
                type="password"
                class="form-input"
                placeholder="输入您的 API Key"
              />
            </div>

            <div class="form-group">
              <label class="form-label">模型名称</label>
              <input
                v-model="currentApiConfig.model"
                type="text"
                class="form-input"
                placeholder="例如：glm-4, gpt-3.5-turbo"
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

    <!-- 添加API模态框 -->
    <div
      v-if="showAddApiModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50"
    >
      <div
        class="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
      >
        <h3 class="text-lg font-medium text-gray-900 mb-4">添加新API</h3>
        <div class="space-y-4">
          <!-- API名称 -->
          <div class="form-group">
            <label class="form-label">API名称</label>
            <input
              v-model="newApiConfig.name"
              type="text"
              class="form-input"
              placeholder="为此API配置起个名字"
            />
          </div>

          <!-- 预设服务商选择 -->
          <div class="form-group">
            <label class="form-label">预设服务商</label>
            <select
              v-model="selectedPresetApi"
              class="form-select"
              @change="onPresetApiSelected"
            >
              <option value="">自定义</option>
              <option
                v-for="provider in presetApiProviders"
                :key="provider.id"
                :value="provider.id"
              >
                {{ provider.name }}
              </option>
            </select>
          </div>

          <!-- API地址 -->
          <div class="form-group">
            <label class="form-label">API地址</label>
            <input
              v-model="newApiConfig.url"
              type="text"
              class="form-input"
              placeholder="输入API服务地址"
              :readonly="selectedPresetApi !== ''"
            />
          </div>

          <!-- API Key -->
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input
              v-model="newApiConfig.apiKey"
              type="password"
              class="form-input"
              placeholder="输入API密钥"
            />
          </div>

          <!-- 模型名称 -->
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <input
              v-model="newApiConfig.model"
              type="text"
              class="form-input"
              placeholder="例如：glm-4, gpt-3.5-turbo"
            />
          </div>

          <!-- 按钮组 -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="cancelAddApi"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              取消
            </button>
            <button
              @click="confirmAddApi"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              :disabled="!newApiConfig.name || !newApiConfig.url"
            >
              添加
            </button>
          </div>
        </div>
        <button
          @click="cancelAddApi"
          class="absolute top-3 right-3 text-gray-400 hover:text-gray-500"
        >
          <svg
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div
      v-if="showDeleteConfirmModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50"
    >
      <div
        class="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
      >
        <h3 class="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
        <p class="text-gray-700 mb-6">
          您确定要删除 "{{ currentApiConfig?.name }}" 吗？此操作无法撤销。
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showDeleteConfirmModal = false"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            取消
          </button>
          <button
            @click="deleteCurrentApi"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from "vue";
import { allLanguages } from "../common/languages";

export default {
  name: "Options",
  setup() {
    const isSaving = ref(false);
    const selectedApiId = ref("");
    const savedApis = ref([]);
    const showAddApiModal = ref(false);
    const showDeleteConfirmModal = ref(false);
    const selectedPresetApi = ref("");

    // 预设API服务商
    const presetApiProviders = [
      {
        id: "glm",
        name: "智谱GLM",
        url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        defaultModel: "glm-4",
      },
      {
        id: "volcano",
        name: "火山引擎",
        url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        defaultModel: "chatglm-turbo",
      },
      {
        id: "siliconflow",
        name: "硅基流动",
        url: "https://api.siliconflow.cn/v1/chat/completions",
        defaultModel: "yi-34b-chat",
      },
      {
        id: "tencent",
        name: "腾讯混元",
        url: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
        defaultModel: "hunyuan",
      },
      {
        id: "alibaba",
        name: "阿里通义",
        url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        defaultModel: "qwen-max",
      },
      {
        id: "deepseek",
        name: "DeepSeek",
        url: "https://api.deepseek.com/v1/chat/completions",
        defaultModel: "deepseek-chat",
      },
    ];

    // 新API配置
    const newApiConfig = reactive({
      id: "",
      name: "",
      url: "",
      apiKey: "",
      model: "",
    });

    const configs = reactive({
      general: {
        sourceLang: "auto",
        targetLang: "zh",
        enableSelection: true,
        selectionTrigger: "icon",
        shortcut: "Alt+T",
      },
    });

    // 计算当前选中的API配置
    const currentApiConfig = computed(() => {
      if (!selectedApiId.value) return null;
      return savedApis.value.find((api) => api.id === selectedApiId.value);
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

    // 选择API提供商
    const selectApiProvider = (apiId) => {
      selectedApiId.value = apiId;
    };

    // 复制当前API
    const duplicateCurrentApi = () => {
      if (!currentApiConfig.value) return;

      const duplicatedApi = JSON.parse(JSON.stringify(currentApiConfig.value));
      duplicatedApi.id = generateUniqueId();
      duplicatedApi.name = `${duplicatedApi.name} 副本`;

      savedApis.value.push(duplicatedApi);
      selectedApiId.value = duplicatedApi.id;
    };

    // 确认删除当前API
    const confirmDeleteApi = () => {
      if (!currentApiConfig.value || isDefaultApi(currentApiConfig.value.id))
        return;
      showDeleteConfirmModal.value = true;
    };

    // 删除当前API
    const deleteCurrentApi = () => {
      if (!currentApiConfig.value) return;

      const index = savedApis.value.findIndex(
        (api) => api.id === selectedApiId.value
      );
      if (index !== -1) {
        savedApis.value.splice(index, 1);

        // 如果还有其他API，选择第一个
        if (savedApis.value.length > 0) {
          selectedApiId.value = savedApis.value[0].id;
        } else {
          selectedApiId.value = "";
        }
      }

      showDeleteConfirmModal.value = false;
    };

    // 检查是否为默认API（不可编辑URL）
    const isDefaultApi = (apiId) => {
      return presetApiProviders.some((provider) => provider.id === apiId);
    };

    // 处理预设API选择
    const onPresetApiSelected = () => {
      if (selectedPresetApi.value) {
        const preset = presetApiProviders.find(
          (p) => p.id === selectedPresetApi.value
        );
        if (preset) {
          newApiConfig.url = preset.url;
          newApiConfig.model = preset.defaultModel;
          newApiConfig.name = preset.name;
        }
      } else {
        // 自定义
        newApiConfig.url = "";
        newApiConfig.model = "";
      }
    };

    // 显示添加API模态框
    const showAddApiForm = () => {
      resetNewApiForm();
      showAddApiModal.value = true;
    };

    // 重置新API表单
    const resetNewApiForm = () => {
      newApiConfig.id = "";
      newApiConfig.name = "";
      newApiConfig.url = "";
      newApiConfig.apiKey = "";
      newApiConfig.model = "";
      selectedPresetApi.value = "";
    };

    // 取消添加API
    const cancelAddApi = () => {
      showAddApiModal.value = false;
      resetNewApiForm();
    };

    // 确认添加API
    const confirmAddApi = () => {
      if (!newApiConfig.name || !newApiConfig.url) return;

      const apiId = selectedPresetApi.value || generateUniqueId();
      const newApi = {
        id: apiId,
        name: newApiConfig.name,
        url: newApiConfig.url,
        apiKey: newApiConfig.apiKey,
        model: newApiConfig.model,
      };

      // 检查是否已存在相同ID的API（更新）
      const existingIndex = savedApis.value.findIndex(
        (api) => api.id === apiId
      );
      if (existingIndex !== -1) {
        savedApis.value[existingIndex] = newApi;
      } else {
        savedApis.value.push(newApi);
      }

      selectedApiId.value = apiId;
      showAddApiModal.value = false;
      resetNewApiForm();
    };

    // 生成唯一ID
    const generateUniqueId = () => {
      return "api_" + Date.now() + Math.floor(Math.random() * 1000);
    };

    // 保存设置
    const saveSettings = async () => {
      isSaving.value = true;
      try {
        // 检查是否有选中的API
        if (!selectedApiId.value || !savedApis.value.length) {
          throw new Error("请至少设置一个API并选择");
        }

        // 确保所有API都有必要的配置
        const selectedApi = savedApis.value.find(
          (api) => api.id === selectedApiId.value
        );
        if (!selectedApi) {
          throw new Error("请选择一个有效的API");
        }

        if (!selectedApi.apiKey) {
          throw new Error(`请设置 ${selectedApi.name} 的API Key`);
        }

        if (!selectedApi.model) {
          throw new Error(`请设置 ${selectedApi.name} 的模型名称`);
        }

        // 准备保存的配置
        const configToSave = {
          selectedProvider: "custom", // 统一使用custom
          selectedApiId: selectedApiId.value, // 保存当前选中的API ID
          savedApis: savedApis.value, // 保存所有API配置
          general: configs.general, // 保存通用配置
          customConfig: selectedApi, // 保存当前选中的API作为customConfig，保持兼容性
        };

        await chrome.storage.sync.set(configToSave);
        console.log("保存的配置:", configToSave);
        alert("设置已保存");
      } catch (err) {
        alert(err.message || "保存设置失败");
      } finally {
        isSaving.value = false;
      }
    };

    // 加载设置
    const loadSettings = async () => {
      try {
        const settings = await chrome.storage.sync.get([
          "selectedProvider",
          "selectedApiId",
          "savedApis",
          "glmConfig",
          "customConfig",
          "general",
        ]);

        // 加载通用设置
        if (settings.general) {
          Object.assign(configs.general, settings.general);
        }

        // 迁移旧配置
        if (!settings.savedApis || !settings.savedApis.length) {
          // 创建初始API列表
          const initialApis = [];

          // 迁移GLM配置
          if (settings.glmConfig && settings.glmConfig.apiKey) {
            initialApis.push({
              id: "glm",
              name: "智谱GLM",
              url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
              apiKey: settings.glmConfig.apiKey,
              model: settings.glmConfig.model || "glm-4",
            });
          }

          // 迁移custom配置
          if (
            settings.customConfig &&
            settings.customConfig.url &&
            settings.customConfig.apiKey
          ) {
            const customId = "custom_" + Date.now();
            initialApis.push({
              id: customId,
              name: "自定义API",
              url: settings.customConfig.url,
              apiKey: settings.customConfig.apiKey,
              model: settings.customConfig.model || "",
            });
          }

          // 如果没有任何配置，添加一个空的GLM配置
          if (initialApis.length === 0) {
            initialApis.push({
              id: "glm",
              name: "智谱GLM",
              url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
              apiKey: "",
              model: "glm-4",
            });
          }

          savedApis.value = initialApis;
        } else {
          // 直接使用保存的API列表
          savedApis.value = settings.savedApis;
        }

        // 设置选中的API
        if (
          settings.selectedApiId &&
          savedApis.value.some((api) => api.id === settings.selectedApiId)
        ) {
          selectedApiId.value = settings.selectedApiId;
        } else if (savedApis.value.length > 0) {
          selectedApiId.value = savedApis.value[0].id;
        }
      } catch (error) {
        console.error("加载设置失败:", error);
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
      savedApis,
      selectedApiId,
      currentApiConfig,
      showAddApiModal,
      showDeleteConfirmModal,
      newApiConfig,
      selectedPresetApi,
      presetApiProviders,
      configs,
      isSaving,
      saveSettings,
      toggleSelection,
      handleShortcutInput,
      clearShortcut,
      groupedLanguages,
      targetLanguageGroups,
      filteredSourceLanguages,
      selectApiProvider,
      showAddApiForm,
      cancelAddApi,
      confirmAddApi,
      onPresetApiSelected,
      isDefaultApi,
      duplicateCurrentApi,
      confirmDeleteApi,
      deleteCurrentApi,
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
