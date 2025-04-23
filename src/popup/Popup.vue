<template>
  <div class="popup-container p-4">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between mb-4">
      <!-- 语言选择区域 -->
      <div class="flex items-center flex-1">
        <!-- 源语言选择 -->
        <select v-model="sourceLang" class="language-select">
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

        <!-- 切换按钮 -->
        <button
          class="language-switch"
          @click="switchLanguages"
          title="切换语言"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M8 3L4 7L8 11"></path>
            <path d="M4 7H20"></path>
            <path d="M16 21L20 17L16 13"></path>
            <path d="M20 17H4"></path>
          </svg>
        </button>

        <!-- 目标语言选择 -->
        <select v-model="targetLang" class="language-select">
          <optgroup
            v-for="(langs, letter) in targetLanguageGroups"
            :key="letter"
            :label="letter"
          >
            <option v-for="(name, code) in langs" :key="code" :value="code">
              {{ name }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- 设置按钮 -->
      <button class="settings-btn" @click="openSettings" aria-label="设置">
        <svg viewBox="0 0 24 24" class="settings-icon">
          <path
            fill="currentColor"
            d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"
          />
        </svg>
      </button>
    </div>

    <!-- 翻译区域 -->
    <div class="translation-content">
      <!-- 输入区域 -->
      <div class="translation-area">
        <textarea
          v-model="inputText"
          class="input-area"
          :placeholder="'请输入要翻译的文本...'"
          maxlength="500"
          @input="handleInput"
        ></textarea>
        <div class="char-count">{{ inputText.length }}/500</div>
      </div>

      <!-- 翻译结果区域 - 默认显示 -->
      <div class="translation-area">
        <div class="result-area" :class="{ empty: !translatedText }">
          <div v-if="translatedText" class="result-text">
            {{ translatedText }}
          </div>
          <div v-else class="empty-result">译文将显示在这里</div>
          <div v-if="translatedText" class="result-actions">
            <button class="action-btn" @click="copyText" title="复制译文">
              <svg viewBox="0 0 24 24" class="action-icon">
                <path
                  fill="currentColor"
                  d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { allLanguages } from "../common/languages";

export default {
  name: "Popup",
  setup() {
    const sourceLang = ref("auto");
    const targetLang = ref("zh");
    const inputText = ref("");
    const translatedText = ref("");
    const languages = ref(allLanguages);

    // 拼音首字母映射
    const pinyinMap = {
      阿: "A",
      艾: "A",
      安: "A",
      巴: "B",
      白: "B",
      保: "B",
      布: "B",
      比: "B",
      波: "B",
      朝: "C",
      楚: "C",
      捷: "C",
      查: "C",
      丹: "D",
      德: "D",
      达: "D",
      大: "D",
      俄: "E",
      法: "F",
      芬: "F",
      菲: "F",
      傅: "F",
      格: "G",
      古: "G",
      高: "G",
      刚: "G",
      荷: "H",
      韩: "H",
      哈: "H",
      海: "H",
      意: "Y",
      印: "Y",
      英: "Y",
      伊: "Y",
      日: "R",
      加: "J",
      吉: "J",
      捷: "J",
      卡: "K",
      科: "K",
      克: "K",
      拉: "L",
      罗: "L",
      立: "L",
      马: "M",
      蒙: "M",
      美: "M",
      南: "N",
      挪: "N",
      尼: "N",
      葡: "P",
      帕: "P",
      奇: "Q",
      契: "Q",
      日: "R",
      瑞: "R",
      斯: "S",
      塞: "S",
      苏: "S",
      萨: "S",
      泰: "T",
      土: "T",
      突: "T",
      乌: "W",
      威: "W",
      维: "W",
      西: "X",
      希: "X",
      匈: "X",
      亚: "Y",
      越: "Y",
      印: "Y",
      英: "Y",
      中: "Z",
      祖: "Z",
      扎: "Z",
    };

    // 获取语言拼音首字母
    const getPinyinLetter = (name) => {
      const firstChar = name.charAt(0);
      return pinyinMap[firstChar] || firstChar.toUpperCase();
    };

    // 按拼音首字母分组语言
    const groupedLanguages = computed(() => {
      const groups = {};
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

      // 初始化所有字母组
      letters.forEach((letter) => {
        groups[letter] = {};
      });

      // 特殊处理：将'auto'放在'A'组的最前面
      groups["A"]["auto"] = "自动检测";

      // 按照拼音首字母分组
      Object.entries(allLanguages).forEach(([code, name]) => {
        if (code === "auto") return; // 跳过'auto'，因为我们已经单独处理了

        const letter = getPinyinLetter(name);
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

    // 源语言过滤函数，保持所有语言不变
    const filteredSourceLanguages = (langs) => {
      return langs;
    };

    // 目标语言组（排除自动检测）
    const targetLanguageGroups = computed(() => {
      const groups = { ...groupedLanguages.value };
      if (groups["A"] && groups["A"]["auto"]) {
        delete groups["A"]["auto"];
      }
      return groups;
    });

    // 切换源语言和目标语言
    const switchLanguages = () => {
      if (sourceLang.value !== "auto") {
        const temp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = temp;

        // 交换后自动翻译
        if (inputText.value) {
          handleInput();
        }
      }
    };

    // 监听语言变化
    watch([sourceLang, targetLang], async ([newSourceLang, newTargetLang]) => {
      try {
        console.log(
          `语言更改: 源语言=${newSourceLang}, 目标语言=${newTargetLang}`
        );

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
        if (inputText.value.trim()) {
          await handleTranslate();
        }
      } catch (error) {
        console.error("保存语言设置失败:", error);
      }
    });

    // 翻译处理函数
    async function handleTranslate() {
      try {
        const settings = await chrome.storage.sync.get([
          "selectedProvider",
          "general",
        ]);

        const response = await chrome.runtime.sendMessage({
          action: "translate",
          text: inputText.value,
          sourceLang: sourceLang.value,
          targetLang: targetLang.value,
          provider: settings.selectedProvider || "glm",
        });

        if (response && response.translatedText) {
          translatedText.value = response.translatedText;
        } else {
          throw new Error(response.error || "翻译失败");
        }
      } catch (error) {
        console.error("翻译错误:", error);
        translatedText.value = `翻译失败: ${error.message}`;
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

    // 修改翻译处理函数
    const handleInput = createDebounce(async () => {
      if (!inputText.value.trim()) {
        translatedText.value = "";
        return;
      }

      try {
        // 显示加载状态
        translatedText.value = "翻译中...";

        console.log(
          `请求翻译: 文本="${inputText.value}", 源语言=${sourceLang.value}, 目标语言=${targetLang.value}`
        );

        // 从存储中获取当前选择的翻译服务
        const settings = await chrome.storage.sync.get(["selectedProvider"]);
        const provider = settings.selectedProvider || "google";

        console.log(`使用翻译服务: ${provider}`);

        // 发送翻译请求，确保使用用户选择的目标语言
        const response = await chrome.runtime.sendMessage({
          action: "translate",
          text: inputText.value,
          sourceLang: sourceLang.value,
          targetLang: targetLang.value,
          provider: provider,
        });

        console.log("翻译响应:", response);

        if (response && response.translatedText) {
          translatedText.value = response.translatedText;
        } else if (response && response.error) {
          translatedText.value = `翻译失败: ${response.error}`;
        } else {
          translatedText.value = "翻译失败: 未知错误";
        }
      } catch (err) {
        console.error("翻译错误:", err);
        translatedText.value = "翻译失败: " + (err.message || "未知错误");
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

    // 组件挂载时加载设置
    onMounted(async () => {
      try {
        const settings = await chrome.storage.sync.get(["general"]);

        // 加载保存的语言设置
        if (settings.general) {
          sourceLang.value = settings.general.sourceLang || "auto";
          targetLang.value = settings.general.targetLang || "zh";
        }
      } catch (error) {
        console.error("加载设置失败:", error);
      }
    });

    return {
      sourceLang,
      targetLang,
      inputText,
      translatedText,
      groupedLanguages,
      targetLanguageGroups,
      filteredSourceLanguages,
      switchLanguages,
      handleInput,
      copyText,
      openSettings,
    };
  },
};
</script>

<style scoped>
.popup-container {
  min-width: 380px; /* 恢复原来的宽度 */
}

.language-select {
  @apply block text-sm border border-gray-200 rounded-md 
         focus:ring-1 focus:ring-blue-500 focus:border-blue-500
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
  color: #4a5568;
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
  height: 120px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: #1a202c;
  resize: none;
  outline: none;
  transition: all 0.2s;
}

.input-area:focus {
  border-color: #4299e1;
  box-shadow: 0 0 0 1px rgba(66, 153, 225, 0.5);
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: #a0aec0;
}

.result-area {
  width: 100%;
  min-height: 120px;
  max-height: 240px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  background: #f8fafc;
  position: relative;
}

.result-area.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
}

.result-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #2d3748;
  margin-bottom: 30px; /* 为底部操作按钮留出空间 */
}

.empty-result {
  color: #a0aec0;
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
  color: #4a5568;
}

/* 滚动条样式 */
.result-area::-webkit-scrollbar {
  width: 6px;
}

.result-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.result-area::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.result-area::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
