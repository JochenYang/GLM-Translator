<template>
  <div class="settings-panel">
    <h2 class="section-title">翻译API设置</h2>

    <div class="api-selector">
      <label for="current-api">使用的API:</label>
      <select id="current-api" v-model="currentApi" @change="updateCurrentApi">
        <option
          v-for="(api, apiKey) in apiTemplates"
          :key="apiKey"
          :value="apiKey"
        >
          {{ api.name }}
        </option>
      </select>
    </div>

    <div class="api-config-form">
      <h3>{{ selectedApiConfig.name || "自定义API" }} 配置</h3>

      <div class="form-group">
        <label for="api-name">API名称:</label>
        <input
          type="text"
          id="api-name"
          v-model="selectedApiConfig.name"
          placeholder="自定义API名称"
        />
      </div>

      <div class="form-group">
        <label for="api-url">API地址:</label>
        <input
          type="text"
          id="api-url"
          v-model="selectedApiConfig.url"
          placeholder="https://api.example.com/translate"
        />
      </div>

      <div class="form-group">
        <label for="api-method">请求方法:</label>
        <select id="api-method" v-model="selectedApiConfig.method">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </div>

      <div class="form-group">
        <label for="api-body-format">请求体格式:</label>
        <textarea
          id="api-body-format"
          v-model="selectedApiConfig.bodyFormat"
          placeholder='{"text":"{text}", "from":"{from}", "to":"{to}"}'
          rows="4"
        ></textarea>
        <p class="helper-text">
          使用 {text} 表示要翻译的文本, {from} 表示源语言, {to} 表示目标语言
        </p>
      </div>

      <div class="form-group">
        <label for="api-headers">请求头:</label>
        <textarea
          id="api-headers"
          v-model="headersText"
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_API_KEY"}'
          rows="4"
          @input="updateHeaders"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="api-response-handler">响应处理器:</label>
        <input
          type="text"
          id="api-response-handler"
          v-model="selectedApiConfig.responseHandler"
          placeholder="response.data.translated"
        />
        <p class="helper-text">使用点符号指定翻译结果在响应中的路径</p>
      </div>

      <div class="form-actions">
        <button class="save-button" @click="saveApiConfig">保存API配置</button>
        <button class="test-button" @click="testApi">测试API</button>
      </div>
    </div>

    <div class="test-result" v-if="testResult">
      <h4>测试结果</h4>
      <pre>{{ testResult }}</pre>
    </div>

    <hr />

    <h2 class="section-title">扩展设置</h2>

    <div class="settings-form">
      <div class="form-group checkbox-group">
        <input type="checkbox" id="auto-translate" v-model="autoTranslate" />
        <label for="auto-translate">选中文本后自动翻译</label>
      </div>

      <div class="form-group">
        <label for="default-target">默认目标语言:</label>
        <select id="default-target" v-model="targetLanguage">
          <option value="zh-CN">中文</option>
          <option value="en">英语</option>
          <option value="ja">日语</option>
          <option value="ko">韩语</option>
          <option value="fr">法语</option>
          <option value="de">德语</option>
          <option value="es">西班牙语</option>
          <option value="ru">俄语</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from "vue";
import {
  getApiTemplates,
  saveApiConfig,
  setCurrentApi,
  translateText,
} from "../services/translator";

export default {
  name: "SettingsPanel",
  setup() {
    const currentApi = ref("customApi");
    const apiTemplates = ref({});
    const selectedApiConfig = reactive({
      name: "",
      url: "",
      method: "POST",
      bodyFormat: "",
      headers: {},
      responseHandler: "",
    });
    const headersText = ref("");
    const testResult = ref("");
    const autoTranslate = ref(false);
    const targetLanguage = ref("zh-CN");

    // 加载API配置
    const loadApiConfig = async () => {
      apiTemplates.value = await getApiTemplates();
      const config = apiTemplates.value[currentApi.value];
      if (config) {
        Object.assign(selectedApiConfig, config);
        headersText.value = JSON.stringify(config.headers || {}, null, 2);
      }
    };

    // 更新当前API
    const updateCurrentApi = async () => {
      await setCurrentApi(currentApi.value);
      await loadApiConfig();
    };

    // 更新请求头
    const updateHeaders = () => {
      try {
        selectedApiConfig.headers = JSON.parse(headersText.value);
      } catch (error) {
        // 解析失败时不更新headers
      }
    };

    // 保存API配置
    const saveApiConfig = async () => {
      try {
        updateHeaders();
        await saveApiConfig(currentApi.value, selectedApiConfig);
        alert("保存成功");
      } catch (error) {
        alert("保存失败: " + error.message);
      }
    };

    // 测试API
    const testApi = async () => {
      testResult.value = "测试中...";
      try {
        updateHeaders();
        const result = await translateText("Hello, world!", "en", "zh-CN");
        testResult.value = JSON.stringify(result, null, 2);
      } catch (error) {
        testResult.value = "测试失败: " + error.message;
      }
    };

    // 加载设置
    const loadSettings = () => {
      chrome.storage.sync.get(["autoTranslate", "targetLanguage"], (result) => {
        autoTranslate.value = result.autoTranslate || false;
        targetLanguage.value = result.targetLanguage || "zh-CN";
      });
    };

    // 保存设置
    const saveSettings = () => {
      chrome.storage.sync.set({
        autoTranslate: autoTranslate.value,
        targetLanguage: targetLanguage.value,
      });
    };

    // 监听设置变化
    watch([autoTranslate, targetLanguage], () => {
      saveSettings();
    });

    onMounted(() => {
      loadApiConfig();
      loadSettings();
    });

    return {
      currentApi,
      apiTemplates,
      selectedApiConfig,
      headersText,
      testResult,
      autoTranslate,
      targetLanguage,
      updateCurrentApi,
      updateHeaders,
      saveApiConfig,
      testApi,
    };
  },
};
</script>

<style scoped>
.settings-panel {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.api-selector {
  margin-bottom: 24px;
}

.api-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.api-selector select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.api-config-form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.api-config-form h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.helper-text {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.save-button,
.test-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.save-button {
  background: #4285f4;
  color: white;
}

.save-button:hover {
  background: #3367d6;
}

.test-button {
  background: #f1f1f1;
  color: #333;
}

.test-button:hover {
  background: #e5e5e5;
}

.test-result {
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.test-result h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.test-result pre {
  margin: 0;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 13px;
  overflow-x: auto;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

hr {
  margin: 24px 0;
  border: none;
  border-top: 1px solid #eee;
}

.settings-form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}
</style>
