/**
 * 后台 Service Worker：统一处理翻译请求、右键菜单与 TTS 音频代理。
 */
import {
  translateTextChunked,
  addTranslationHistory,
  cancelActiveTranslation,
} from "../services/translator.js";
import {
  migrateSecretsFromSync,
  getSelectedApiConfig,
  resolveConfigUrl,
} from "../utils/secureStorage.js";
import { originPatternFromUrl, isKnownProviderUrl } from "../utils/providerOrigins.js";
import { PROVIDER_PRESETS } from "../config/providers.js";

// Initialize
function init() {
  setupContextMenu();
  setupMessageListeners();
  setupCommandListeners();
  // Migrate secrets off sync on install/startup
  migrateSecretsFromSync().catch((e) =>
    console.warn("secrets migration:", e)
  );
}

function setupContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "translate-selection",
        title: "翻译选中的文本",
        contexts: ["selection"],
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "translate-selection" && tab && tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "contextMenuTranslate" },
          () => {
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

function setupCommandListeners() {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "translate-selection" && tab && tab.id) {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "contextMenuTranslate" },
        () => {
          if (chrome.runtime.lastError) {
            console.error("发送命令消息失败:", chrome.runtime.lastError);
          }
        }
      );
    }
  });
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translate") {
      handleTranslateRequest(request, sender, sendResponse);
      return true;
    }
    if (request.action === "cancelTranslate") {
      cancelActiveTranslation();
      sendResponse({ ok: true });
      return false;
    }
    if (request.action === "ensureHostPermission") {
      ensureHostPermission(request.url)
        .then((granted) => sendResponse({ granted }))
        .catch((e) => sendResponse({ granted: false, error: e.message }));
      return true;
    }
    // 在线 TTS 音频代理（避免页面 CSP/CORS 拦截）
    if (request.action === "fetchTtsAudio" && request.url) {
      fetchTtsAudioDataUrl(request.url)
        .then((dataUrl) => sendResponse({ dataUrl }))
        .catch((e) => sendResponse({ error: e.message || String(e) }));
      return true;
    }
    return false;
  });
}

/**
 * 拉取短文本 TTS 音频，转为 data URL 供内容脚本播放。
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchTtsAudioDataUrl(url) {
  // 仅允许已知免费 TTS 域名
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("无效的 TTS URL");
  }
  const host = parsed.hostname;
  const allowed =
    host === "translate.google.com" ||
    host.endsWith(".google.com") ||
    host === "translate.googleapis.com";
  if (!allowed || parsed.protocol !== "https:") {
    throw new Error("TTS 域名未授权");
  }

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  });
  if (!res.ok) {
    throw new Error(`TTS HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  if (!buf || buf.byteLength < 32) {
    throw new Error("TTS 音频为空");
  }
  // 转 base64 data URL
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  const ctype = res.headers.get("content-type") || "audio/mpeg";
  return `data:${ctype};base64,${b64}`;
}

async function ensureHostPermission(url) {
  if (!url || isKnownProviderUrl(url)) return true;
  const pattern = originPatternFromUrl(url);
  if (!pattern) return false;
  if (!chrome.permissions?.request) {
    // Fallback: assume build includes optional_host_permissions request from options page
    return true;
  }
  const already = await chrome.permissions.contains({ origins: [pattern] });
  if (already) return true;
  return chrome.permissions.request({ origins: [pattern] });
}

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
    } catch (_) {
      /* popup closed */
    }
    // Also broadcast for extension pages (popup has no tab)
    try {
      chrome.runtime.sendMessage({
        action: "translateProgress",
        current,
        total,
      }).catch(() => {});
    } catch (_) {
      /* ignore */
    }
  };

  try {
    // 仅自定义 / 非预置域名才申请 optional 权限（有道等预置域已在 manifest）
    try {
      let urlToEnsure = request.customUrl || null;
      if (!urlToEnsure) {
        const selected = await getSelectedApiConfig();
        if (
          selected?.provider &&
          selected.provider !== "custom" &&
          selected.provider !== "youdao"
        ) {
          // 预置 AI 厂商域名已声明，无需再 request
        } else if (selected?.provider === "custom") {
          urlToEnsure =
            resolveConfigUrl(selected) ||
            selected?.config?.url ||
            null;
        }
      }
      if (urlToEnsure) {
        await ensureHostPermission(urlToEnsure);
      }
    } catch (e) {
      console.warn("ensure host permission:", e);
    }

    const result = await translateTextChunked(
      request.text,
      request.sourceLang || "auto",
      request.targetLang,
      onProgress
    );

    const payload =
      typeof result === "string"
        ? { translatedText: result, originalText: request.text }
        : result;

    try {
      await addTranslationHistory({
        originalText: payload.originalText || request.text,
        translatedText: payload.translatedText,
        from: payload.from || request.sourceLang,
        to: payload.to || request.targetLang,
        detectedLanguage: payload.detectedLanguage,
      });
    } catch (e) {
      console.warn("保存历史记录失败:", e);
    }

    sendResponse(payload);
  } catch (error) {
    console.error("翻译出错:", error);
    sendResponse({ error: error.message || "翻译请求失败" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  migrateSecretsFromSync().catch(() => {});
  setupContextMenu();
});

init();
