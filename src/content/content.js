// 基本变量
let translationIcon = null;
let popupElement = null;
let lastSelectedText = "";

// 初始化
function init() {
  try {
    // 移除可能存在的旧元素
    const oldIcon = document.querySelector(".glm-translator-icon");
    const oldPopup = document.querySelector("#glm-translator-container");

    if (oldIcon) oldIcon.remove();
    if (oldPopup) oldPopup.remove();

    // 创建翻译图标
    translationIcon = document.createElement("div");
    translationIcon.className = "glm-translator-icon";
    translationIcon.innerHTML = `
      <img src="${chrome.runtime.getURL("icons/icon48.png")}" alt="翻译" />
    `;
    translationIcon.style.display = "none";

    // 设置图标样式
    Object.assign(translationIcon.style, {
      position: "absolute",
      zIndex: "2147483646",
      width: "30px",
      height: "30px",
      backgroundColor: "white",
      borderRadius: "50%",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      cursor: "pointer",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
    });

    document.body.appendChild(translationIcon);

    // 添加事件监听
    document.addEventListener("mouseup", handleSelection);

    // 确保图标点击事件绑定
    translationIcon.addEventListener("click", function (event) {
      handleIconClick();
      event.stopPropagation(); // 阻止事件冒泡
    });

    // 点击其他区域关闭图标
    document.addEventListener("mousedown", function (event) {
      // 不要关闭弹窗，我们有专门的关闭按钮
      if (!translationIcon.contains(event.target)) {
        hideIcon();
      }
    });

    // 监听右键菜单翻译请求
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.action === "contextMenuTranslate") {
        try {
          const selection = window.getSelection();
          const text = selection.toString().trim();

          if (text) {
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            showPopup(
              rect.left + window.scrollX,
              rect.bottom + window.scrollY + 10
            );

            // 延迟一点执行翻译，确保弹窗已创建
            setTimeout(() => {
              translateText(text);
            }, 100);

            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "没有选中文本" });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    });
  } catch (error) {
    console.error("初始化划词翻译失败:", error);
  }
}

// 处理选中文本
async function handleSelection(event) {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (!text) {
    hideIcon();
    hidePopup();
    return;
  }

  lastSelectedText = text;

  try {
    // 获取设置
    const result = await chrome.storage.sync.get("general");
    const settings = result.general || {};

    // 检查是否启用划词翻译
    if (settings.enableSelection === false) {
      return;
    }

    // 根据触发方式显示
    if (settings.selectionTrigger === "instant") {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      showPopup(rect.left + window.scrollX, rect.bottom + window.scrollY + 10);
      translateText(text);
    } else {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      showIcon(rect.left + window.scrollX, rect.bottom + window.scrollY + 10);
    }
  } catch (error) {
    console.error("处理选中文本错误:", error);
  }
}

// 显示翻译图标
function showIcon(x, y) {
  translationIcon.style.left = `${x}px`;
  translationIcon.style.top = `${y}px`;
  translationIcon.style.display = "flex";
}

// 隐藏翻译图标
function hideIcon() {
  translationIcon.style.display = "none";
}

// 显示翻译弹窗
function showPopup(x, y) {
  try {
    // 移除旧弹窗
    const oldPopup = document.querySelector("#glm-translator-container");
    if (oldPopup) oldPopup.remove();

    // 创建容器
    const container = document.createElement("div");
    container.id = "glm-translator-container";
    Object.assign(container.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      zIndex: "2147483647",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      padding: "0",
      margin: "0",
      minWidth: "250px",
      maxWidth: "400px",
      border: "none",
      overflow: "hidden",
    });
    document.body.appendChild(container);

    // 创建 iframe (完全隔离的环境)
    const iframe = document.createElement("iframe");
    iframe.id = "glm-translator-iframe";
    Object.assign(iframe.style, {
      border: "none",
      width: "100%",
      height: "auto",
      minHeight: "100px",
      backgroundColor: "transparent",
      padding: "0",
      margin: "0",
      overflow: "hidden",
    });
    container.appendChild(iframe);

    // 创建关闭按钮 (在 iframe 外部，确保始终可点击)
    const closeBtn = document.createElement("div");
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "5px",
      right: "5px",
      width: "20px",
      height: "20px",
      lineHeight: "18px",
      textAlign: "center",
      backgroundColor: "#f0f0f0",
      borderRadius: "50%",
      cursor: "pointer",
      color: "#666",
      fontSize: "14px",
      fontWeight: "bold",
      zIndex: "2147483647",
    });
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", function () {
      container.remove();
    });
    container.appendChild(closeBtn);

    // 等待 iframe 加载完成
    iframe.onload = function () {
      // 向 iframe 中写入内容
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 15px;
              background-color: white;
              color: #333;
              font-size: 14px;
              line-height: 1.5;
              overflow: hidden;
            }
            .loading {
              color: #666;
              text-align: center;
              padding: 10px;
            }
            .error {
              color: #e53e3e;
              padding: 10px;
            }
            .original {
              color: #666;
              margin-bottom: 8px;
            }
            .divider {
              height: 1px;
              background: #eee;
              margin: 8px 0;
            }
            .result {
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="loading">翻译中...</div>
        </body>
        </html>
      `);
      doc.close();

      // 调整 iframe 高度
      adjustIframeHeight(iframe);
    };

    // 确保弹窗在视口内
    setTimeout(() => {
      keepPopupInView(container);
    }, 100);

    popupElement = container;
    return container;
  } catch (error) {
    console.error("显示弹窗错误:", error);
  }
}

// 调整 iframe 高度以适应内容
function adjustIframeHeight(iframe) {
  try {
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const body = doc.body;

    const height = body.scrollHeight;
    iframe.style.height = height + "px";
  } catch (error) {
    console.error("调整 iframe 高度错误:", error);
  }
}

// 确保弹窗在视图内
function keepPopupInView(popup) {
  if (!popup) return;

  const rect = popup.getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  if (rect.right > winWidth) {
    popup.style.left = `${winWidth - rect.width - 20}px`;
  }

  if (rect.bottom > winHeight) {
    popup.style.top = `${winHeight - rect.height - 20}px`;
  }

  if (rect.left < 0) {
    popup.style.left = "20px";
  }

  if (rect.top < 0) {
    popup.style.top = "20px";
  }
}

// 隐藏翻译弹窗
function hidePopup() {
  popupElement.style.display = "none";
}

// 处理图标点击
function handleIconClick() {
  try {
    // 获取图标位置
    const rect = translationIcon.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.bottom + window.scrollY + 5;

    // 显示弹窗
    showPopup(x, y);

    // 执行翻译
    setTimeout(() => {
      translateText(lastSelectedText);
    }, 100);

    // 隐藏图标
    hideIcon();
  } catch (error) {
    console.error("处理图标点击错误:", error);
  }
}

// 翻译文本
async function translateText(text) {
  if (!text || text.trim() === "") {
    return;
  }

  try {
    // 确保弹窗存在
    let container = document.querySelector("#glm-translator-container");
    if (!container) {
      container = showPopup(
        window.innerWidth / 2 - 150,
        window.innerHeight / 2 - 100
      );
    }

    // 获取 iframe
    const iframe = container.querySelector("#glm-translator-iframe");
    if (!iframe) {
      return;
    }

    // 获取设置中的语言
    const result = await chrome.storage.sync.get([
      "general",
      "selectedProvider",
    ]);
    const settings = result.general || {};
    const provider = result.selectedProvider || "glm";
    const sourceLang = settings.sourceLang || "auto";
    const targetLang = settings.targetLang || "zh";

    // 发送翻译请求
    const response = await chrome.runtime.sendMessage({
      action: "translate",
      text: text,
      sourceLang: sourceLang,
      targetLang: targetLang,
      provider: provider,
    });

    // 更新 iframe 内容
    const doc = iframe.contentDocument || iframe.contentWindow.document;

    if (response && response.translatedText) {
      doc.body.innerHTML = `
        <div class="original">${text}</div>
        <div class="divider"></div>
        <div class="result">${response.translatedText}</div>
      `;
    } else {
      doc.body.innerHTML = `
        <div class="error">翻译失败: ${response?.error || "未知错误"}</div>
      `;
    }

    // 调整 iframe 高度
    adjustIframeHeight(iframe);

    // 确保弹窗在视图内
    keepPopupInView(container);
  } catch (error) {
    console.error("翻译请求错误:", error);

    // 尝试更新错误信息
    try {
      const container = document.querySelector("#glm-translator-container");
      if (container) {
        const iframe = container.querySelector("#glm-translator-iframe");
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.body.innerHTML = `
            <div class="error">翻译失败: ${error.message || "未知错误"}</div>
          `;
          adjustIframeHeight(iframe);
        }
      }
    } catch (e) {
      console.error("更新错误信息失败:", e);
    }
  }
}

// 添加样式函数
function addStyles() {
  const styleId = "glm-translator-styles";
  if (document.getElementById(styleId)) {
    document.getElementById(styleId).remove();
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .glm-translator-icon {
      position: absolute;
      z-index: 999999;
      width: 30px;
      height: 30px;
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
    
    .glm-translator-popup {
      position: absolute;
      z-index: 999999;
      min-width: 200px;
      max-width: 400px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 10px;
    }
    
    .glm-translator-original {
      color: #666;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .glm-translator-divider {
      height: 1px;
      background: #eee;
      margin: 8px 0;
    }
    
    .glm-translator-result {
      color: #333;
      font-size: 14px;
    }
    
    .glm-translator-loading {
      color: #666;
      font-size: 14px;
      text-align: center;
      padding: 10px;
    }
    
    .glm-translator-close {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 16px;
      height: 16px;
      line-height: 16px;
      text-align: center;
      cursor: pointer;
      color: #999;
      font-size: 14px;
      font-weight: bold;
    }
    
    .glm-translator-close:hover {
      color: #666;
    }
  `;
  document.head.appendChild(style);
}

// 确保在页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
