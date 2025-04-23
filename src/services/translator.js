/**
 * 翻译服务封装
 * 支持自定义翻译API配置
 */
import { getStorage, setStorage } from "../utils/storage";

// 默认API配置模板
const DEFAULT_API_TEMPLATES = {
  // 示例配置，用户可以替换成自己的API
  customApi: {
    name: "自定义API",
    url: "",
    method: "POST",
    headers: {},
    bodyFormat: '{"text": "{text}", "from": "{from}", "to": "{to}"}',
    responseHandler: "response.data.translated",
  },
};

// 获取当前使用的API配置
export async function getCurrentApiConfig() {
  const { currentApi, apiTemplates } = await getStorage(
    ["currentApi", "apiTemplates"],
    {
      currentApi: "customApi",
      apiTemplates: DEFAULT_API_TEMPLATES,
    }
  );

  return apiTemplates[currentApi];
}

// 保存API配置
export async function saveApiConfig(apiName, config) {
  const { apiTemplates } = await getStorage("apiTemplates", {
    apiTemplates: DEFAULT_API_TEMPLATES,
  });
  apiTemplates[apiName] = config;

  await setStorage({ apiTemplates });
  return apiTemplates;
}

// 设置当前使用的API
export async function setCurrentApi(apiName) {
  await setStorage({ currentApi: apiName });
  return apiName;
}

// 获取当前API配置
async function getApiConfig() {
  const { selectedProvider, glmConfig, customConfig } =
    await chrome.storage.sync.get([
      "selectedProvider",
      "glmConfig",
      "customConfig",
    ]);

  return {
    provider: selectedProvider || "google",
    config: selectedProvider === "glm" ? glmConfig : customConfig,
  };
}

// 执行翻译请求
export async function translateText(text, from = "auto", to = "zh") {
  const { provider, config } = await getApiConfig();

  try {
    switch (provider) {
      case "google":
        return await googleTranslate(text, from, to);
      case "microsoft":
        return await microsoftTranslate(text, from, to);
      case "glm":
        return await glmTranslate(text, from, to, config);
      case "custom":
        return await customTranslate(text, from, to, config);
      default:
        throw new Error("未知的翻译服务商");
    }
  } catch (error) {
    console.error("翻译出错:", error);
    throw error;
  }
}

// 谷歌翻译
async function googleTranslate(text, from, to) {
  // 使用谷歌翻译 API
  // 这里需要实现谷歌翻译的具体逻辑
}

// 微软翻译
async function microsoftTranslate(text, from, to) {
  // 使用微软翻译 API
  // 这里需要实现微软翻译的具体逻辑
}

// GLM 翻译
async function glmTranslate(text, from, to, config) {
  if (!config?.apiKey) {
    throw new Error("请先配置 GLM API Key");
  }

  const response = await fetch(
    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "glm-4",
        messages: [
          {
            role: "system",
            content: `你是一个翻译助手。请将以下文本从${
              from === "auto" ? "自动检测的语言" : from
            }翻译成${to}。只需要返回翻译结果，不要解释或添加其他内容。`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "翻译请求失败");
  }

  return {
    originalText: text,
    translatedText: data.choices[0].message.content.trim(),
    from,
    to,
  };
}

// 自定义 API 翻译
async function customTranslate(text, from, to, config) {
  if (!config?.url || !config?.apiKey) {
    throw new Error("请先完成自定义 API 配置");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: `你是一个翻译助手。请将以下文本从${
            from === "auto" ? "自动检测的语言" : from
          }翻译成${to}。只需要返回翻译结果，不要解释或添加其他内容。`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "翻译请求失败");
  }

  return {
    originalText: text,
    translatedText: data.choices[0].message.content.trim(),
    from,
    to,
  };
}

// 获取所有可用的API模板
export async function getApiTemplates() {
  const { apiTemplates } = await getStorage("apiTemplates", {
    apiTemplates: DEFAULT_API_TEMPLATES,
  });
  return apiTemplates;
}

// 添加翻译历史记录
export async function addTranslationHistory(item) {
  const { translationHistory = [] } = await getStorage("translationHistory", {
    translationHistory: [],
  });

  // 添加时间戳
  const historyItem = {
    ...item,
    timestamp: Date.now(),
  };

  // 去重处理：如果已存在相同原文的记录，则更新
  const existingIndex = translationHistory.findIndex(
    (record) => record.originalText === item.originalText
  );

  if (existingIndex !== -1) {
    translationHistory.splice(existingIndex, 1);
  }

  // 添加到历史记录首位
  translationHistory.unshift(historyItem);

  // 限制历史记录数量
  const MAX_HISTORY = 100;
  const newHistory = translationHistory.slice(0, MAX_HISTORY);

  await setStorage({ translationHistory: newHistory });
  return newHistory;
}
