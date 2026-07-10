/**
 * Content script — selection icon + translation result window.
 * Untrusted translation/error text is applied via textContent only (no XSS).
 */
import { escapeHtml } from "../utils/escapeHtml.js";
import { resolveSourceLanguage } from "../utils/detectLanguage.js";
import { isDomainBlacklisted } from "../utils/domainBlacklist.js";
import { normalizeGeneralSettings } from "../utils/generalSettings.js";
import { allLanguages } from "../common/languages.js";
import { speakText } from "../utils/speak.js";

let translationIcon = null;
let lastSelectedText = "";
let currentSourceLang = "auto";
let currentTargetLang = "zh";
let currentOriginalText = "";
let activeTranslateToken = 0;
let popupCleanupFns = [];

async function sendMessageWithRetry(message, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      lastError = error;
      const msg = error.message || "";
      if (
        msg.includes("Could not establish connection") ||
        msg.includes("Receiving end does not exist") ||
        msg.includes("Extension context invalidated") ||
        msg.includes("Failed to load the script")
      ) {
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
      } else {
        throw error;
      }
    }
  }
  throw new Error("翻译服务暂未就绪，请稍后重试或刷新页面");
}

async function loadGeneral() {
  try {
    if (!chrome?.storage?.sync) return normalizeGeneralSettings();
    const result = await chrome.storage.sync.get("general");
    return normalizeGeneralSettings(result.general || {});
  } catch {
    return normalizeGeneralSettings();
  }
}

function init() {
  try {
    addStyles();
    document.querySelector(".glm-translator-icon")?.remove();
    document.querySelector("#glm-translator-container")?.remove();

    createTranslationIcon();
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("mousedown", (event) => {
      if (translationIcon && !translationIcon.contains(event.target)) {
        hideIcon();
      }
    });

    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === "contextMenuTranslate") {
        try {
          const selection = window.getSelection();
          const text = selection.toString().trim();
          if (!text) {
            sendResponse({ success: false, error: "没有选中文本" });
            return true;
          }
          const range =
            selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          if (!range) {
            sendResponse({ success: false, error: "未获取到选区" });
            return true;
          }
          const rect = range.getBoundingClientRect();
          const iconX = rect.left + rect.width / 2;
          const iconY = rect.bottom + 8;
          const popupX = Math.max(20, Math.min(iconX, window.innerWidth - 300));
          const popupY = Math.max(20, Math.min(iconY, window.innerHeight - 150));
          showPopup(popupX, popupY, text);
          setTimeout(() => translateText(text), 50);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
      if (request.action === "translateProgress") {
        updateProgress(request.current, request.total);
      }
    });
  } catch (error) {
    console.error("初始化划词翻译失败:", error);
  }
}

async function handleSelection(event) {
  if (event?.target) {
    const container = document.querySelector("#glm-translator-container");
    if (container && container.contains(event.target)) return;
  }

  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (!text) {
    hideIcon();
    return;
  }

  lastSelectedText = text;

  try {
    const settings = await loadGeneral();
    if (settings.enableSelection === false) return;

    if (isDomainBlacklisted(location.hostname, settings.domainBlacklist)) {
      return;
    }

    if (text.length < (settings.minSelectionLength || 1)) {
      return;
    }

    let iconX, iconY;
    if (event && event.clientX && event.clientY) {
      iconX = event.clientX;
      iconY = event.clientY;
    } else {
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (!range) return;
      const rect = range.getBoundingClientRect();
      iconX = rect.left + rect.width / 2;
      iconY = rect.top + rect.height / 2;
    }

    const iconSize = 32;
    const margin = 10;
    const offset = 15;
    iconX = iconX + offset;
    if (iconX + iconSize > window.innerWidth - margin) {
      iconX = iconX - offset - iconSize - offset;
    }
    iconY = Math.max(
      margin,
      Math.min(iconY - iconSize / 2, window.innerHeight - iconSize - margin)
    );

    if (settings.selectionTrigger === "instant") {
      showPopup(iconX, iconY, text);
      translateText(text);
    } else {
      if (!translationIcon || !document.body.contains(translationIcon)) {
        createTranslationIcon();
      }
      showIcon(iconX, iconY);
    }
  } catch (error) {
    console.error("处理选中文本错误:", error);
  }
}

function createTranslationIcon() {
  if (translationIcon) translationIcon.remove();

  translationIcon = document.createElement("div");
  translationIcon.className = "glm-translator-icon";
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("icons/icon48.png");
  img.alt = "翻译";
  translationIcon.appendChild(img);

  Object.assign(translationIcon.style, {
    position: "fixed",
    zIndex: "2147483646",
    width: "32px",
    height: "32px",
    backgroundColor: "white",
    borderRadius: "50%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    cursor: "pointer",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease-out",
  });

  translationIcon.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleIconClick();
  });

  document.body.appendChild(translationIcon);
  return translationIcon;
}

function showIcon(x, y) {
  if (!translationIcon || !document.body.contains(translationIcon)) {
    createTranslationIcon();
  }
  translationIcon.style.position = "fixed";
  translationIcon.style.left = `${x}px`;
  translationIcon.style.top = `${y}px`;
  translationIcon.style.display = "flex";
  translationIcon.style.opacity = "0";
  translationIcon.style.transform = "scale(0.8)";
  requestAnimationFrame(() => {
    translationIcon.style.transition = "all 0.2s ease-out";
    translationIcon.style.opacity = "1";
    translationIcon.style.transform = "scale(1)";
  });
}

function hideIcon() {
  if (translationIcon) {
    translationIcon.style.display = "none";
    translationIcon.parentNode?.removeChild(translationIcon);
    translationIcon = null;
  }
}

function handleIconClick() {
  const currentText = lastSelectedText;
  if (!translationIcon) return;
  const iconRect = translationIcon.getBoundingClientRect();
  const iconX = iconRect.left;
  const iconY = iconRect.top;
  hideIcon();
  requestAnimationFrame(() => {
    showPopup(iconX, iconY, currentText);
    translateText(currentText);
  });
}

function languageLabel(code) {
  if (!code || code === "auto") return "自动检测";
  return allLanguages[code] || code;
}

function buildLangSelect(value, includeAuto) {
  const select = document.createElement("select");
  select.className = "glm-lang-select";
  Object.assign(select.style, {
    fontSize: "12px",
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    padding: "2px 6px",
    background: "#fff",
    color: "#1e293b",
    maxWidth: "120px",
  });
  if (includeAuto) {
    const opt = document.createElement("option");
    opt.value = "auto";
    opt.textContent = "自动检测";
    select.appendChild(opt);
  }
  for (const [code, name] of Object.entries(allLanguages)) {
    if (code === "detect") continue;
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.value = value;
  return select;
}

function runPopupCleanup() {
  while (popupCleanupFns.length) {
    try {
      popupCleanupFns.pop()();
    } catch (_) {
      /* ignore */
    }
  }
}

function hidePopup() {
  runPopupCleanup();
  document.querySelector("#glm-translator-container")?.remove();
  try {
    chrome.runtime.sendMessage({ action: "cancelTranslate" }).catch(() => {});
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} [originalHint]
 */
function showPopup(x, y, originalHint = "") {
  hidePopup();

  const container = document.createElement("div");
  container.id = "glm-translator-container";
  Object.assign(container.style, {
    position: "fixed",
    visibility: "hidden",
    left: "0",
    top: "0",
    zIndex: "2147483647",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
    minWidth: "360px",
    maxWidth: "640px",
    width: "fit-content",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    transform: "scale(0.95)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  });
  document.body.appendChild(container);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.setAttribute("data-component", "toolbar");
  toolbar.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;gap:8px;cursor:move;user-select:none;";

  const left = document.createElement("div");
  left.style.cssText = "display:flex;align-items:center;gap:6px;flex:1;flex-wrap:wrap;";

  const logo = document.createElement("div");
  logo.style.cssText =
    "width:22px;height:22px;background:#3b82f6;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0;";
  logo.textContent = "T";

  const sourceSelect = buildLangSelect(currentSourceLang, true);
  sourceSelect.dataset.role = "source-lang";
  const swapBtn = document.createElement("button");
  swapBtn.type = "button";
  swapBtn.textContent = "⇄";
  swapBtn.title = "交换语言";
  Object.assign(swapBtn.style, {
    border: "none",
    background: "#e2e8f0",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "12px",
  });
  const targetSelect = buildLangSelect(currentTargetLang, false);
  targetSelect.dataset.role = "target-lang";

  const detectedBadge = document.createElement("span");
  detectedBadge.dataset.role = "detected";
  detectedBadge.style.cssText =
    "font-size:11px;color:#64748b;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

  left.appendChild(logo);
  left.appendChild(sourceSelect);
  left.appendChild(swapBtn);
  left.appendChild(targetSelect);
  left.appendChild(detectedBadge);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "关闭");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    width: "28px",
    height: "28px",
    border: "none",
    borderRadius: "6px",
    background: "rgba(59,130,246,0.08)",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: "1",
    color: "#6b7280",
  });

  toolbar.appendChild(left);
  toolbar.appendChild(closeBtn);
  container.appendChild(toolbar);

  // Body sections
  const body = document.createElement("div");
  body.dataset.role = "body";
  body.style.cssText = "padding:0;max-height:420px;overflow:auto;";

  const progressEl = document.createElement("div");
  progressEl.dataset.role = "progress";
  progressEl.style.cssText =
    "display:none;padding:8px 14px;font-size:12px;color:#64748b;background:#f1f5f9;";

  const originalSection = document.createElement("div");
  originalSection.style.cssText = "padding:10px 14px;border-bottom:1px solid #f1f5f9;";
  const originalLabel = document.createElement("div");
  originalLabel.style.cssText =
    "font-size:11px;color:#94a3b8;margin-bottom:4px;font-weight:600;";
  originalLabel.textContent = "原文";
  const originalTextEl = document.createElement("div");
  originalTextEl.dataset.role = "original";
  originalTextEl.style.cssText =
    "font-size:13px;color:#64748b;white-space:pre-wrap;word-break:break-word;max-height:100px;overflow:auto;";
  originalTextEl.textContent = originalHint || "";
  originalSection.appendChild(originalLabel);
  originalSection.appendChild(originalTextEl);

  const resultSection = document.createElement("div");
  resultSection.style.cssText = "padding:12px 14px;min-height:64px;";
  const resultLabel = document.createElement("div");
  resultLabel.style.cssText =
    "font-size:11px;color:#94a3b8;margin-bottom:4px;font-weight:600;";
  resultLabel.textContent = "译文";
  const resultEl = document.createElement("div");
  resultEl.dataset.role = "result";
  resultEl.className = "result";
  resultEl.style.cssText =
    "font-size:14px;color:#1e293b;white-space:pre-wrap;word-break:break-word;line-height:1.6;";
  resultEl.textContent = "";
  const loadingEl = document.createElement("div");
  loadingEl.dataset.role = "loading";
  loadingEl.style.cssText =
    "display:flex;align-items:center;justify-content:center;gap:6px;padding:24px;color:#64748b;font-size:13px;";
  loadingEl.textContent = "翻译中…";
  resultSection.appendChild(resultLabel);
  resultSection.appendChild(loadingEl);
  resultSection.appendChild(resultEl);

  body.appendChild(progressEl);
  body.appendChild(originalSection);
  body.appendChild(resultSection);
  container.appendChild(body);

  // Action bar
  const actionBar = document.createElement("div");
  actionBar.setAttribute("data-component", "actionbar");
  actionBar.style.cssText =
    "display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 12px;background:#f8fafc;border-top:1px solid #e2e8f0;";

  const speakBtn = document.createElement("button");
  speakBtn.type = "button";
  speakBtn.title = "朗读译文";
  speakBtn.textContent = "朗读";
  styleActionBtn(speakBtn);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "复制译文";
  copyBtn.textContent = "复制";
  styleActionBtn(copyBtn);

  actionBar.appendChild(speakBtn);
  actionBar.appendChild(copyBtn);
  container.appendChild(actionBar);

  // Events
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    hidePopup();
  });

  copyBtn.addEventListener("click", async () => {
    const text = resultEl.textContent || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "已复制";
      setTimeout(() => {
        copyBtn.textContent = "复制";
      }, 800);
    } catch (err) {
      console.error("复制失败:", err);
    }
  });

  speakBtn.addEventListener("click", () => {
    // 浏览器内置 Web Speech API（零成本、无外网 TTS）
    // window.speechSynthesis + SpeechSynthesisUtterance
    const text = resultEl.textContent || "";
    if (!text) return;
    speakText(text, {
      lang: currentTargetLang || "en",
      rate: 0.85,
    });
  });

  const retranslate = () => {
    const text = currentOriginalText || originalTextEl.textContent;
    if (text) translateText(text, true);
  };

  sourceSelect.addEventListener("change", () => {
    currentSourceLang = sourceSelect.value;
    retranslate();
  });
  targetSelect.addEventListener("change", () => {
    currentTargetLang = targetSelect.value;
    retranslate();
  });
  swapBtn.addEventListener("click", () => {
    if (currentSourceLang === "auto") return;
    const t = currentSourceLang;
    currentSourceLang = currentTargetLang;
    currentTargetLang = t;
    sourceSelect.value = currentSourceLang;
    targetSelect.value = currentTargetLang;
    retranslate();
  });

  // Drag (toolbar only) — cleaned up on close
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerDown = (e) => {
    if (!e.target.closest('[data-component="toolbar"]')) return;
    if (e.target.closest("select,button")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(container.style.left, 10) || container.offsetLeft;
    startTop = parseInt(container.style.top, 10) || container.offsetTop;
    container.style.transition = "none";
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    if (!isDragging) return;
    const maxX = window.innerWidth - container.offsetWidth - 10;
    const maxY = window.innerHeight - container.offsetHeight - 10;
    const nx = Math.max(10, Math.min(startLeft + e.clientX - startX, maxX));
    const ny = Math.max(10, Math.min(startTop + e.clientY - startY, maxY));
    container.style.left = nx + "px";
    container.style.top = ny + "px";
  };
  const onPointerUp = () => {
    isDragging = false;
  };

  container.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  popupCleanupFns.push(() => {
    container.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  });

  // Esc + outside click
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      hidePopup();
    }
  };
  const onDocMouseDown = (e) => {
    if (!container.contains(e.target)) {
      hidePopup();
    }
  };
  // Delay outside-click so the opening click doesn't immediately close
  const outsideTimer = setTimeout(() => {
    document.addEventListener("mousedown", onDocMouseDown, true);
  }, 200);
  document.addEventListener("keydown", onKeyDown, true);
  popupCleanupFns.push(() => {
    clearTimeout(outsideTimer);
    document.removeEventListener("mousedown", onDocMouseDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
  });

  // Position
  container.style.visibility = "visible";
  const rect = container.getBoundingClientRect();
  let finalX = x + 40;
  let finalY = y;
  if (finalX + rect.width > window.innerWidth - 20) {
    finalX = Math.max(20, x - rect.width - 20);
  }
  if (finalY + rect.height > window.innerHeight - 20) {
    finalY = Math.max(20, window.innerHeight - rect.height - 20);
  }
  if (finalY < 20) finalY = 20;
  container.style.left = `${finalX}px`;
  container.style.top = `${finalY}px`;
  requestAnimationFrame(() => {
    container.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    container.style.transform = "scale(1)";
    container.style.opacity = "1";
  });

  return container;
}

function styleActionBtn(btn) {
  Object.assign(btn.style, {
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#475569",
    fontSize: "12px",
    padding: "4px 10px",
  });
}

function updateProgress(current, total) {
  const container = document.querySelector("#glm-translator-container");
  if (!container) return;
  const progressEl = container.querySelector('[data-role="progress"]');
  if (!progressEl) return;
  if (total > 1) {
    progressEl.style.display = "block";
    progressEl.textContent = `正在翻译 ${current}/${total} 段…`;
  } else {
    progressEl.style.display = "none";
  }
}

function setLoading(container, loading) {
  const loadingEl = container.querySelector('[data-role="loading"]');
  const resultEl = container.querySelector('[data-role="result"]');
  if (loadingEl) loadingEl.style.display = loading ? "flex" : "none";
  if (resultEl && loading) resultEl.textContent = "";
}

/**
 * Safe: only textContent for untrusted strings.
 * @param {string} text
 * @param {boolean} [keepLangs]
 */
async function translateText(text, keepLangs = false) {
  if (!text || !text.trim()) return;

  currentOriginalText = text;
  const token = ++activeTranslateToken;

  let container = document.querySelector("#glm-translator-container");
  if (!container) {
    container = showPopup(
      window.innerWidth / 2 - 180,
      window.innerHeight / 2 - 100,
      text
    );
  }

  const originalEl = container.querySelector('[data-role="original"]');
  const resultEl = container.querySelector('[data-role="result"]');
  const detectedEl = container.querySelector('[data-role="detected"]');
  const sourceSelect = container.querySelector('[data-role="source-lang"]');
  const targetSelect = container.querySelector('[data-role="target-lang"]');

  if (originalEl) originalEl.textContent = text;

  if (!keepLangs) {
    const settings = await loadGeneral();
    currentSourceLang = settings.sourceLang || "auto";
    currentTargetLang = settings.targetLang || "zh";
    if (sourceSelect) sourceSelect.value = currentSourceLang;
    if (targetSelect) targetSelect.value = currentTargetLang;
  } else {
    if (sourceSelect) currentSourceLang = sourceSelect.value;
    if (targetSelect) currentTargetLang = targetSelect.value;
  }

  // Local detection for UI
  const resolved = resolveSourceLanguage(text, currentSourceLang);
  if (detectedEl) {
    if (currentSourceLang === "auto" && resolved.detected) {
      detectedEl.textContent = `检测: ${languageLabel(resolved.detected)}`;
    } else {
      detectedEl.textContent = "";
    }
  }

  setLoading(container, true);
  updateProgress(0, 0);

  try {
    const response = await sendMessageWithRetry({
      action: "translate",
      text,
      sourceLang: currentSourceLang,
      targetLang: currentTargetLang,
    });

    if (token !== activeTranslateToken) return;

    setLoading(container, false);
    const progressEl = container.querySelector('[data-role="progress"]');
    if (progressEl) progressEl.style.display = "none";

    if (response?.translatedText) {
      // CRITICAL: textContent only — never innerHTML with API text
      resultEl.textContent = response.translatedText;
      resultEl.style.color = "#1e293b";

      const detected =
        response.detectedLanguage ||
        (currentSourceLang === "auto" ? resolved.detected : null);
      if (detectedEl && detected) {
        detectedEl.textContent = `检测: ${languageLabel(detected)}`;
      }
    } else if (response?.error) {
      resultEl.textContent = response.error;
      resultEl.style.color = "#dc2626";
    } else {
      resultEl.textContent = "翻译失败: 未知错误";
      resultEl.style.color = "#dc2626";
    }
  } catch (error) {
    if (token !== activeTranslateToken) return;
    setLoading(container, false);
    if (resultEl) {
      resultEl.textContent = error.message || "未知错误";
      resultEl.style.color = "#dc2626";
    }
  }
}

function addStyles() {
  const styleId = "glm-translator-styles";
  document.getElementById(styleId)?.remove();
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .glm-translator-icon {
      position: fixed;
      z-index: 2147483646;
      width: 32px;
      height: 32px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .glm-translator-icon img {
      width: 20px;
      height: 20px;
    }
  `;
  document.head.appendChild(style);
}

// Shortcut: only Alt+G style is handled by extension commands;
// keep Alt+G local fallback when content is focused
function addKeyboardShortcutListener() {
  document.addEventListener("keydown", async (event) => {
    try {
      if (!(event.altKey && !event.ctrlKey && !event.shiftKey)) return;
      if (event.key?.toUpperCase() !== "G") return;
      const selection = window.getSelection();
      const text = selection.toString().trim();
      if (!text) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const popupX = Math.max(
        20,
        Math.min(rect.left + rect.width / 2, window.innerWidth - 320)
      );
      const popupY = Math.max(
        20,
        Math.min(rect.bottom + 8, window.innerHeight - 200)
      );
      showPopup(popupX, popupY, text);
      translateText(text);
      event.preventDefault();
      event.stopPropagation();
    } catch (error) {
      console.error("处理快捷键错误:", error);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
addKeyboardShortcutListener();

// Export for unit-test style static audit of escape usage
export { escapeHtml, translateText as contentTranslateText, hidePopup };
