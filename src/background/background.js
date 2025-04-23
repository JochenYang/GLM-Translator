// 处理上下文菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-selection") {
    // 向内容脚本发送消息
    chrome.tabs.sendMessage(tab.id, {
      action: "contextMenuTranslate",
      selectionText: info.selectionText,
    });
  }
});

// 初始化上下文菜单
chrome.runtime.onInstalled.addListener(() => {
  // 移除已有的菜单项（如果存在）
  chrome.contextMenus.removeAll(() => {
    // 创建新的菜单项
    chrome.contextMenus.create({
      id: "translate-selection",
      title: "翻译选中文本",
      contexts: ["selection"],
    });
  });
});

// 处理翻译请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    translateText(
      request.text,
      request.sourceLang,
      request.targetLang,
      request.provider
    )
      .then((result) => {
        sendResponse({ translatedText: result });
      })
      .catch((error) => {
        console.error("翻译错误:", error);
        sendResponse({ error: error.message || "翻译失败" });
      });
    return true; // 返回 true 表示会异步发送响应
  }
});

// 翻译函数
async function translateText(text, sourceLang, targetLang, provider) {
  // 获取配置
  const settings = await chrome.storage.sync.get([
    "selectedProvider",
    "glmConfig",
    "customConfig",
  ]);

  // 确定使用哪个翻译服务提供商
  provider = provider || settings.selectedProvider || "custom";
  console.log(`使用翻译服务: ${provider}`);
  console.log(`源语言: ${sourceLang}, 目标语言: ${targetLang}`);

  try {
    let result = "";

    // 根据不同服务提供商调用不同的翻译 API
    switch (provider) {
      case "glm":
        const glmConfig = settings.glmConfig || {};
        result = await callGlmTranslate(
          text,
          sourceLang,
          targetLang,
          glmConfig.apiKey,
          glmConfig.model
        );
        break;
      case "custom":
      default:
        const customConfig = settings.customConfig || {};
        result = await callCustomTranslate(
          text,
          sourceLang,
          targetLang,
          customConfig
        );
        break;
    }

    if (!result) {
      throw new Error("翻译结果为空");
    }

    return result;
  } catch (error) {
    console.error("翻译错误:", error);
    return "翻译失败: " + (error.message || "未知错误");
  }
}

// GLM 翻译 API
async function callGlmTranslate(text, sourceLang, targetLang, apiKey, model) {
  if (!apiKey) {
    return "请在设置中配置智谱 GLM API Key";
  }

  try {
    // 获取正确的语言名称
    const sourceLangName = getLanguageName(sourceLang);
    const targetLangName = getLanguageName(targetLang);

    // 修改提示语，使其更明确
    const prompt = `请将以下${sourceLangName}文本翻译成${targetLangName}。请只返回翻译结果，不要添加任何解释：\n\n${text}`;

    const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "glm-4",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("GLM API 响应:", data);

    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error("GLM API 返回格式错误");
    }
  } catch (error) {
    console.error("GLM 翻译错误:", error);
    return "翻译失败: " + (error.message || "未知错误");
  }
}

// 自定义 API
async function callCustomTranslate(text, sourceLang, targetLang, config) {
  if (!config.url) {
    return "请在设置中配置自定义 API 地址";
  }

  try {
    // 不要规范化语言代码，保持原始代码
    const requestBody = config.model
      ? {
          // OpenAI 格式
          model: config.model,
          messages: [
            {
              role: "user",
              content: `请将以下文本翻译成${getLanguageName(
                targetLang
              )}。只返回翻译结果：\n\n${text}`,
            },
          ],
          temperature: 0.2,
        }
      : {
          // 标准翻译API格式
          text: text,
          source_language: sourceLang,
          target_language: targetLang,
        };

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("自定义 API 响应:", data);

    // 解析响应
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // OpenAI 格式
      return data.choices[0].message.content;
    } else if (data.translation) {
      // 通用翻译API格式 1
      return data.translation;
    } else if (data.translated_text || data.translatedText) {
      // 通用翻译API格式 2
      return data.translated_text || data.translatedText;
    } else if (data.result) {
      // 某些API使用 result 字段
      return data.result;
    } else if (typeof data === "string") {
      // 直接返回字符串
      return data;
    } else {
      console.error("无法解析的响应格式:", data);
      throw new Error("无法解析自定义 API 的响应");
    }
  } catch (error) {
    console.error("自定义 API 翻译错误:", error);
    return "翻译失败: " + (error.message || "未知错误");
  }
}

// 获取语言名称的辅助函数 - 扩展支持的语言列表
function getLanguageName(langCode) {
  if (!langCode) return "未知语言";

  // 规范化语言代码
  const normalizedCode = langCode.toLowerCase();

  // 处理自动检测
  if (normalizedCode === "auto") return "自动检测";

  // 语言映射表
  const languageNames = {
    ar: "阿拉伯语",
    pl: "波兰语",
    da: "丹麦语",
    de: "德语",
    ru: "俄语",
    fr: "法语",
    fi: "芬兰语",
    ko: "韩语",
    nl: "荷兰语",
    cs: "捷克语",
    pt: "葡萄牙语",
    ja: "日语",
    sv: "瑞典语",
    th: "泰语",
    tr: "土耳其语",
    es: "西班牙语",
    hu: "匈牙利语",
    en: "英语",
    it: "意大利语",
    vi: "越南语",
    zh: "中文",
    // 添加更多语言...
  };

  // 尝试获取语言名称
  return languageNames[normalizedCode] || `${langCode}`;
}

// 添加右键菜单
try {
  chrome.contextMenus.create({
    id: "translate-selection",
    title: "翻译选中文本",
    contexts: ["selection"],
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "translate-selection") {
      chrome.tabs.sendMessage(tab.id, {
        action: "contextMenuTranslate",
      });
    }
  });
} catch (error) {
  console.error("创建右键菜单失败:", error);
}
