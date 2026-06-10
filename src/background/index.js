/**
 * 背景脚本，处理API请求和右键菜单
 */
import {
  translateTextChunked,
  addTranslationHistory,
} from "../services/translator.js";

// 初始化扩展
function init() {
  setupContextMenu();
  setupMessageListeners();
  setupCommandListeners();
}

// 设置右键菜单
function setupContextMenu() {
  try {
    // 确保仅创建一次菜单
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "translate-selection",
        title: "翻译选中的文本",
        contexts: ["selection"],
      });
    });

    // 处理右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "translate-selection" && tab && tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "contextMenuTranslate",
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("发送消息失败:", chrome.runtime.lastError);
            }
          }
        );
      }
    });
  } catch (error) {
    console.error("创建右键菜单出错:", error);
  }
}

// 设置命令监听
function setupCommandListeners() {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "translate-selection" && tab && tab.id) {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "contextMenuTranslate",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("发送命令消息失败:", chrome.runtime.lastError);
          }
        }
      );
    }
  });
}

// 设置消息监听
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translate") {
      handleTranslateRequest(request, sender, sendResponse);
      return true; // 表示异步返回结果
    }
  });
}

// 处理翻译请求（分块版）
async function handleTranslateRequest(request, sender, sendResponse) {
  const tabId = sender?.tab?.id;
  const onProgress = (current, total) => {
    if (tabId == null) return;
    try {
      chrome.tabs.sendMessage(tabId, {
        action: "translateProgress",
        current,
        total,
      });
    } catch (e) {
      // popup 已关闭，忽略
    }
  };

  try {
    const result = await translateTextChunked(
      request.text,
      request.sourceLang || "auto",
      request.targetLang,
      onProgress
    );

    // 兼容旧契约：既支持返回字符串，也支持 { translatedText, ... }
    const payload =
      typeof result === "string"
        ? { translatedText: result, originalText: request.text }
        : result;

    // 保存到历史记录
    try {
      await addTranslationHistory(payload);
    } catch (e) {
      console.warn("保存历史记录失败:", e);
    }

    // 返回结果
    sendResponse(payload);
  } catch (error) {
    console.error("翻译出错:", error);
    sendResponse({ error: error.message || "翻译请求失败" });
  }
}

// 初始化
init();