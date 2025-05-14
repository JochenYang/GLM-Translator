// 基本变量
let translationIcon = null;
let popupElement = null;
let lastSelectedText = "";

// 初始化
function init() {
  try {
    // 添加样式，必须在最前面
    addStyles();

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
            const range =
              selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            if (!range) {
              sendResponse({ success: false, error: "未获取到选区" });
              return true;
            }
            const rect = range.getBoundingClientRect();
            // 统一定位逻辑
            const popupX = Math.max(
              20,
              Math.min(rect.left, window.innerWidth - 300)
            );
            const popupY = Math.max(
              20,
              Math.min(rect.bottom + 8, window.innerHeight - 150)
            );

            showPopup(popupX, popupY);

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
    const result = await chrome.storage.sync.get("general");
    const settings = result.general || {};

    if (settings.enableSelection === false) return;

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) return;

    const rect = range.getBoundingClientRect();

    // fixed 定位，直接用 rect.left/top
    const popupX = Math.max(20, Math.min(rect.left, window.innerWidth - 300));
    const popupY = Math.max(
      20,
      Math.min(rect.bottom + 8, window.innerHeight - 150)
    );

    if (settings.selectionTrigger === "instant") {
      showPopup(popupX, popupY);
      translateText(text);
    } else {
      showIcon(popupX, popupY);
    }
  } catch (error) {
    console.error("处理选中文本错误:", error);
  }
}

// 显示翻译图标
function showIcon(x, y) {
  if (!translationIcon) return;
  translationIcon.style.position = "fixed";
  translationIcon.style.left = `${x}px`;
  translationIcon.style.top = `${y}px`;
  translationIcon.style.display = "flex";
}

// 隐藏翻译图标
function hideIcon() {
  if (translationIcon) translationIcon.style.display = "none";
}

// 显示翻译弹窗（精准定位，防止 null 报错）
function showPopup(x, y) {
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
    minWidth: "250px",
    maxWidth: "800px",
    border: "none",
    overflow: "hidden",
    padding: "0",
    margin: "0",
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
            word-break: break-word;
          }
          .divider {
            height: 1px;
            background: #eee;
            margin: 8px 0;
          }
          .result {
            color: #333;
            word-break: break-word;
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

    // 添加ResizeObserver实时监听内容变化
    try {
      if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(() => {
          adjustIframeHeight(iframe);
          // 确保弹窗在视图内
          keepPopupInView(container);
        });

        resizeObserver.observe(doc.body);
      }
    } catch (error) {
      console.error("初始化ResizeObserver失败:", error);
    }
  };

  // 确保弹窗在视口内
  setTimeout(() => {
    keepPopupInView(container);
  }, 100);

  popupElement = container;
  return container;
}

// 调整 iframe 高度以适应内容
function adjustIframeHeight(iframe) {
  try {
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const body = doc.body;

    // 计算内容高度
    const height = body.scrollHeight;

    // 设置最大高度限制，与Popup.vue保持一致
    const maxHeight = 500;

    if (height > maxHeight) {
      // 如果内容超过最大高度，启用滚动
      iframe.style.height = maxHeight + "px";
      body.style.overflow = "auto";
      body.style.maxHeight = maxHeight + "px";
    } else {
      // 否则自适应内容高度
      iframe.style.height = height + "px";
      body.style.overflow = "hidden";
    }
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
  const popup = document.querySelector("#glm-translator-container");
  if (popup) popup.remove();
  popupElement = null;
}

// 处理图标点击
function handleIconClick() {
  // 1. 立即隐藏图标
  hideIcon();

  // 2. 获取当前选区的 rect
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // 3. 计算弹窗位置（和"选中后立即显示"一致）
  let popupX = Math.max(20, Math.min(rect.left, window.innerWidth - 300));
  let popupY = rect.bottom + 8;
  // 如果底部空间不足，显示在上方
  const popupHeight = 200; // 增加默认高度估计，从120px增加到200px
  if (popupY + popupHeight > window.innerHeight - 20) {
    popupY = rect.top - popupHeight - 8;
    if (popupY < 20) popupY = 20;
  }

  // 4. 显示弹窗并翻译
  showPopup(popupX, popupY);
  translateText(lastSelectedText);
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

    // 获取 iframe 文档对象
    const doc = iframe.contentDocument || iframe.contentWindow.document;

    // 先添加样式到iframe
    doc.head.innerHTML = `
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 15px;
          background-color: white;
          color: #333;
          font-size: 14px;
          line-height: 1.5;
        }
        .original {
          color: #666;
          margin-bottom: 10px;
          word-break: break-word;
          white-space: pre-wrap;
        }
        .divider {
          height: 1px;
          background: #eee;
          margin: 10px 0;
        }
        .result {
          color: #1a202c;
          word-break: break-word;
          white-space: pre-wrap;
        }
        .error {
          color: #e53e3e;
          padding: 10px;
          border-radius: 4px;
          background-color: #fff5f5;
          border: 1px solid #fed7d7;
          margin: 10px 0;
          font-size: 14px;
          text-align: center;
        }
        .message {
          padding: 10px;
          border-radius: 4px;
          background-color: #f0f9ff;
          border: 1px solid #bee3f8;
          margin: 10px 0;
          font-size: 14px;
          text-align: center;
          color: #2c5282;
        }
      </style>
    `;

    // 显示加载状态
    doc.body.innerHTML = `
      <div class="message">翻译中...</div>
    `;

    // 调整iframe高度以适应加载消息
    adjustIframeHeight(iframe);

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
    if (response && response.translatedText) {
      doc.body.innerHTML = `
        <div class="original">${text}</div>
        <div class="divider"></div>
        <div class="result">${response.translatedText}</div>
      `;
    } else if (response && response.error) {
      // 处理特定类型的错误信息，提供更友好的反馈
      let errorMessage = response.error;
      // 检查是否包含敏感内容相关的错误信息
      if (
        response.error.includes("无法完成翻译") ||
        response.error.includes("不适当") ||
        response.error.includes("色情") ||
        response.error.includes("违反公序良俗")
      ) {
        errorMessage = "翻译服务遇到了问题，请尝试修改文本内容后重新翻译。";
      }

      doc.body.innerHTML = `
        <div class="error">${errorMessage}</div>
      `;
    } else {
      doc.body.innerHTML = `
        <div class="error">翻译失败: 未知错误</div>
      `;
    }

    // 调整 iframe 高度
    adjustIframeHeight(iframe);

    // 确保弹窗在视图内
    keepPopupInView(container);
  } catch (error) {
    console.error("翻译请求错误:", error);

    // 尝试更新错误信息，提供更友好的反馈
    try {
      const container = document.querySelector("#glm-translator-container");
      if (container) {
        const iframe = container.querySelector("#glm-translator-iframe");
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow.document;

          // 检查是否包含敏感内容相关的错误信息
          let errorMessage = error.message || "未知错误";
          if (
            errorMessage.includes("无法完成翻译") ||
            errorMessage.includes("不适当") ||
            errorMessage.includes("色情") ||
            errorMessage.includes("违反公序良俗")
          ) {
            errorMessage = "翻译服务遇到了问题，请尝试修改文本内容后重新翻译。";
          }

          doc.body.innerHTML = `
            <div class="error">${errorMessage}</div>
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
