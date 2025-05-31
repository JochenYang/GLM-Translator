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
      // 检查 translationIcon 是否存在且事件目标不在图标内
      if (translationIcon && !translationIcon.contains(event.target)) {
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

            // 使用改进的定位逻辑
            let iconX, iconY;

            // 检查选区尺寸是否合理
            if (rect.width < 5 || rect.height < 5) {
              // 使用更可靠的计算方法
              iconX = rect.left + rect.width / 2;
              iconY = rect.bottom + 8;
            } else {
              // 正常情况下使用选区中间位置
              iconX = rect.left + rect.width / 2;
              iconY = rect.bottom + 8;
            }

            // 确保在可视范围内
            const popupX = Math.max(
              20,
              Math.min(iconX, window.innerWidth - 300)
            );
            const popupY = Math.max(
              20,
              Math.min(iconY, window.innerHeight - 150)
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
  // 避免处理从翻译窗口内部发生的选择
  if (event && event.target) {
    const container = document.querySelector("#glm-translator-container");
    if (container && container.contains(event.target)) {
      return;
    }
  }

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

    // 计算图标位置
    let iconX, iconY;

    if (event && event.clientX && event.clientY) {
      // 优先使用鼠标位置
      iconX = event.clientX;
      iconY = event.clientY;
    } else {
      // 如果没有鼠标事件，使用选区位置
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (!range) return;

      const rect = range.getBoundingClientRect();
      iconX = rect.left + rect.width / 2;
      iconY = rect.top + rect.height / 2;
    }

    // 调整图标位置，确保在视口内并且位于鼠标右侧
    const iconSize = 32;
    const margin = 10;
    const offset = 15; // 与鼠标的水平偏移距离

    // 水平位置调整
    iconX = iconX + offset; // 默认在鼠标右侧
    if (iconX + iconSize > window.innerWidth - margin) {
      // 如果右侧空间不足，放在鼠标左侧
      iconX = iconX - offset - iconSize - offset;
    }

    // 垂直位置调整（保持在鼠标水平线上）
    iconY = Math.max(
      margin,
      Math.min(iconY - iconSize / 2, window.innerHeight - iconSize - margin)
    );

    if (settings.selectionTrigger === "instant") {
      showPopup(iconX, iconY);
      translateText(text);
    } else {
      // 重新创建图标（如果不存在）
      if (!translationIcon || !document.body.contains(translationIcon)) {
        createTranslationIcon();
      }
      showIcon(iconX, iconY);
    }
  } catch (error) {
    console.error("处理选中文本错误:", error);
  }
}

// 创建翻译图标
function createTranslationIcon() {
  // 如果已存在，先移除
  if (translationIcon) {
    translationIcon.remove();
  }

  // 创建新图标
  translationIcon = document.createElement("div");
  translationIcon.className = "glm-translator-icon";
  translationIcon.innerHTML = `
    <img src="${chrome.runtime.getURL("icons/icon48.png")}" alt="翻译" />
  `;

  // 设置图标样式
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
    willChange: "transform, opacity", // 优化动画性能
  });

  // 添加点击事件
  translationIcon.addEventListener("click", function (event) {
    handleIconClick();
    event.stopPropagation();
  });

  // 添加到页面
  document.body.appendChild(translationIcon);

  return translationIcon;
}

// 显示翻译图标
function showIcon(x, y) {
  // 如果图标不存在或不在DOM中，重新创建
  if (!translationIcon || !document.body.contains(translationIcon)) {
    createTranslationIcon();
  }

  // 应用位置
  translationIcon.style.position = "fixed";
  translationIcon.style.left = `${x}px`;
  translationIcon.style.top = `${y}px`;
  translationIcon.style.display = "flex";
  translationIcon.style.opacity = "0";
  translationIcon.style.transform = "scale(0.8)";

  // 添加平滑显示效果
  requestAnimationFrame(() => {
    translationIcon.style.transition = "all 0.2s ease-out";
    translationIcon.style.opacity = "1";
    translationIcon.style.transform = "scale(1)";
  });
}

// 隐藏翻译图标
function hideIcon() {
  if (translationIcon) {
    translationIcon.style.display = "none";
    // 确保从DOM中完全移除
    if (translationIcon.parentNode) {
      translationIcon.parentNode.removeChild(translationIcon);
    }
    translationIcon = null;
  }
}

// 处理图标点击
function handleIconClick() {
  // 保存当前选中的文本和图标位置
  const currentText = lastSelectedText;

  // 获取图标的当前位置（在移除图标之前）
  const iconRect = translationIcon.getBoundingClientRect();
  const iconX = iconRect.left;
  const iconY = iconRect.top;

  // 确保完全移除图标
  if (translationIcon) {
    translationIcon.style.display = "none";
    if (translationIcon.parentNode) {
      translationIcon.parentNode.removeChild(translationIcon);
    }
    translationIcon = null;
  }

  // 显示弹窗并翻译（使用之前保存的图标位置）
  requestAnimationFrame(() => {
    showPopup(iconX, iconY);
    translateText(currentText);
  });
}

// 显示翻译弹窗（精准定位，防止 null 报错）
function showPopup(x, y) {
  // 移除旧弹窗
  const oldPopup = document.querySelector("#glm-translator-container");
  if (oldPopup) oldPopup.remove();

  // 创建容器
  const container = document.createElement("div");
  container.id = "glm-translator-container";

  // 先将容器添加到DOM但设为不可见，以便获取实际尺寸
  Object.assign(container.style, {
    position: "fixed",
    visibility: "hidden",
    left: "0",
    top: "0",
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

  // 创建关闭按钮
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

  // 获取容器实际尺寸
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;

  // 计算最佳位置（优先显示在图标右侧）
  let finalX = x + 40; // 图标右侧，留出一定间距
  let finalY = y;

  // 检查右侧空间是否足够
  if (finalX + containerWidth > window.innerWidth - 20) {
    // 如果右侧空间不足，尝试显示在左侧
    finalX = Math.max(20, x - containerWidth - 40);
  }

  // 确保垂直方向适中且不超出视口
  if (finalY + containerHeight > window.innerHeight - 20) {
    // 如果底部空间不足，向上对齐
    finalY = Math.max(20, window.innerHeight - containerHeight - 20);
  }
  if (finalY < 20) {
    finalY = 20;
  }

  // 应用最终位置并显示
  Object.assign(container.style, {
    visibility: "visible",
    left: `${finalX}px`,
    top: `${finalY}px`,
    transition: "opacity 0.2s ease-out", // 添加平滑显示效果
    opacity: "0",
  });

  // 使用 requestAnimationFrame 确保过渡效果生效
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.style.opacity = "1";
    });
  });

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
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        action: "translate",
        text: text,
        sourceLang: sourceLang,
        targetLang: targetLang,
        provider: provider,
      });
    } catch (error) {
      if (
        error.message &&
        error.message.includes("Extension context invalidated")
      ) {
        // 扩展上下文失效，通常是因为扩展被重新加载
        doc.body.innerHTML = `
          <div class="error">扩展已更新，请刷新页面后重试</div>
        `;
        adjustIframeHeight(iframe);
        return;
      }
      throw error;
    }

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

// 添加快捷键监听
function addKeyboardShortcutListener() {
  document.addEventListener("keydown", async (event) => {
    try {
      // 构建当前按下的快捷键组合
      const keys = [];
      if (event.ctrlKey) keys.push("Ctrl");
      if (event.altKey) keys.push("Alt");
      if (event.shiftKey) keys.push("Shift");
      if (event.key && !["Control", "Alt", "Shift"].includes(event.key)) {
        keys.push(event.key.toUpperCase());
      }

      const pressedShortcut = keys.join("+");

      // 如果匹配到固定的Alt+T快捷键
      if (pressedShortcut === "Alt+T") {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text) {
          // 获取选区位置
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // 使用鼠标位置来定位弹窗
          const mouseX = rect.left + rect.width / 2;
          const mouseY = rect.bottom + 8;

          // 确保在可视范围内 - 尽量靠近选择的文本
          const viewportX = Math.min(mouseX, window.innerWidth - 320);
          const viewportY = Math.min(mouseY, window.innerHeight - 200);

          const popupX = Math.max(20, viewportX);
          const popupY = Math.max(20, viewportY);

          showPopup(popupX, popupY);
          translateText(text);

          // 阻止默认行为和事件传播
          event.preventDefault();
          event.stopPropagation();
        }
      }
    } catch (error) {
      console.error("处理快捷键错误:", error);
    }
  });
}

// 确保在页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// 添加快捷键监听
addKeyboardShortcutListener();
