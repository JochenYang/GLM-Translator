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

    // 点击其他区域关闭图标（但不影响图标本身）
    document.addEventListener("mousedown", function (event) {
      // 只有当点击的不是图标或其子元素时才隐藏图标
      if (translationIcon && !translationIcon.contains(event.target)) {
        hideIcon();
      }
    });

    // 监听右键菜单翻译请求
    chrome.runtime.onMessage.addListener(function (
      request,
      _sender,
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
    // 检查Chrome storage是否可用
    if (!chrome?.storage?.sync) {
      console.warn("Chrome storage not available");
      return;
    }
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

  // 添加按下事件（立即销毁图标）
  translationIcon.addEventListener("mousedown", function (event) {
    event.preventDefault();
    event.stopPropagation();
    handleIconClick();
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
  if (!translationIcon) {
    return;
  }

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
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)",
    minWidth: "520px",
    maxWidth: "700px",
    width: "fit-content",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    padding: "0",
    margin: "0",
    transform: "scale(0.95)",
    cursor: "move",
  });
  document.body.appendChild(container);

  // 创建顶部工具栏
  const toolbar = document.createElement("div");
  toolbar.setAttribute("data-component", "toolbar");
  toolbar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    height: 48px;
    box-sizing: border-box;
  `;

  // 左侧Logo和标题
  const leftSection = document.createElement("div");
  leftSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const logo = document.createElement("div");
  logo.style.cssText = `
    width: 24px;
    height: 24px;
    background-color: #3b82f6;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: bold;
  `;
  logo.textContent = "T";

  const title = document.createElement("span");
  title.style.cssText = `
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
  `;
  title.textContent = "翻译结果";

  leftSection.appendChild(logo);
  leftSection.appendChild(title);

  // 右侧关闭按钮
  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;
  Object.assign(closeBtn.style, {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#6b7280",
    transition: "all 0.15s ease",
  });

  toolbar.appendChild(leftSection);
  toolbar.appendChild(closeBtn);
  container.appendChild(toolbar);

  // 创建 iframe (完全隔离的环境)
  const iframe = document.createElement("iframe");
  iframe.id = "glm-translator-iframe";
  Object.assign(iframe.style, {
    border: "none",
    width: "100%",
    height: "auto",
    minHeight: "80px",
    backgroundColor: "transparent",
    padding: "0",
    margin: "0",
    overflow: "hidden",
    resize: "none",
    boxSizing: "border-box",
  });
  container.appendChild(iframe);

  // 创建底部操作按钮栏
  const actionBar = document.createElement("div");
  actionBar.setAttribute("data-component", "actionbar");
  actionBar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
    height: 48px;
    box-sizing: border-box;
  `;

  // 朗读按钮 - 简洁按钮设计
  const speakBtn = document.createElement("button");
  speakBtn.type = "button";
  speakBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block;">
      <path d="M11.8174 5.04276C11.6636 4.97202 11.4805 4.99008 11.3456 5.08929L7.43211 7.96144H4.89655C4.40138 7.96141 4 8.34026 4 8.80758V12.1922C4 12.6595 4.40138 13.0383 4.89655 13.0383H7.43211L11.3456 15.9105C11.618 16.1104 12.0176 15.9569 12.0648 15.6343C12.0675 15.6153 12.0689 15.596 12.069 15.5768V5.42299C12.069 5.26128 11.9713 5.11371 11.8174 5.04276ZM4.89655 8.80758H7.13793V12.1922H4.89655V8.80758ZM11.1724 14.7116L8.03448 12.4085V8.59129L11.1724 6.28818V14.7116ZM14.1983 9.10162C14.9442 9.90086 14.9442 11.0989 14.1983 11.8981C13.966 12.139 13.5446 12.0523 13.4397 11.742C13.3925 11.6025 13.4251 11.4499 13.5259 11.3386C13.9732 10.8591 13.9732 10.1406 13.5259 9.66114C13.3018 9.41348 13.4457 9.02973 13.785 8.97039C13.9376 8.9437 14.0939 8.99335 14.1983 9.10162ZM17 10.4999C17.0006 11.5408 16.5942 12.5452 15.8586 13.3207C15.6244 13.5599 15.2036 13.4701 15.1013 13.1591C15.0552 13.0193 15.0891 12.867 15.1906 12.7565C16.4081 11.4717 16.4081 9.52861 15.1906 8.24384C14.9564 8.00465 15.0844 7.61587 15.421 7.54404C15.5822 7.50965 15.7503 7.56173 15.8586 7.67956C16.5944 8.45475 17.0009 9.45913 17 10.4999Z" fill="currentColor"></path>
    </svg>
  `;
  Object.assign(speakBtn.style, {
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    width: "36px",
    height: "36px",
    padding: "0",
    boxSizing: "border-box",
  });

  // 复制按钮 - 简洁按钮设计
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block;">
      <path d="M14.5833 5.5H7.91667C7.68655 5.5 7.5 5.68655 7.5 5.91667V8H5.41667C5.18654 7.99999 5 8.18654 5 8.41667V15.0833C5 15.3135 5.18654 15.5 5.41667 15.5H12.0833C12.3134 15.5 12.5 15.3134 12.5 15.0833V13H14.5833C14.8134 13 15 12.8134 15 12.5833V5.91667C15 5.68656 14.8134 5.50001 14.5833 5.5ZM11.6667 14.6667H5.83333V8.83333H11.6667V14.6667ZM14.1667 12.1667H12.5V8.41667C12.5 8.18656 12.3134 8.00001 12.0833 8H8.33333V6.33333H14.1667V12.1667Z" fill="currentColor"></path>
    </svg>
  `;
  Object.assign(copyBtn.style, {
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    width: "36px",
    height: "36px",
    padding: "0",
    boxSizing: "border-box",
  });

  actionBar.appendChild(speakBtn);
  actionBar.appendChild(copyBtn);
  container.appendChild(actionBar);

  // 添加按钮悬停效果
  closeBtn.addEventListener("mouseenter", function() {
    this.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
    this.style.color = "#3b82f6";
    this.style.transform = "scale(1.05)";
  });
  closeBtn.addEventListener("mouseleave", function() {
    this.style.backgroundColor = "rgba(59, 130, 246, 0.08)";
    this.style.color = "#6b7280";
    this.style.transform = "scale(1)";
  });

  // 添加关闭按钮点击事件
  closeBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    hidePopup();
  });

  copyBtn.addEventListener("mouseenter", function() {
    this.style.backgroundColor = "#f3f4f6";
    this.style.color = "#3b82f6";
    this.style.transform = "scale(1.05)";
  });
  copyBtn.addEventListener("mouseleave", function() {
    this.style.backgroundColor = "transparent";
    this.style.color = "#6b7280";
    this.style.transform = "scale(1)";
  });

  speakBtn.addEventListener("mouseenter", function() {
    this.style.backgroundColor = "#f3f4f6";
    this.style.color = "#3b82f6";
    this.style.transform = "scale(1.05)";
  });
  speakBtn.addEventListener("mouseleave", function() {
    this.style.backgroundColor = "transparent";
    this.style.color = "#6b7280";
    this.style.transform = "scale(1)";
  });

  // 复制按钮功能
  copyBtn.addEventListener("click", async function() {
    try {
      const iframe = container.querySelector("#glm-translator-iframe");
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const resultText = doc.querySelector(".result");

      if (resultText) {
        await navigator.clipboard.writeText(resultText.textContent);

        // 临时改变按钮样式表示复制成功
        const originalBg = copyBtn.style.backgroundColor;
        const originalColor = copyBtn.style.color;
        copyBtn.style.backgroundColor = "#10b981";
        copyBtn.style.color = "white";
        copyBtn.style.transform = "scale(1.1)";

        setTimeout(() => {
          copyBtn.style.backgroundColor = originalBg;
          copyBtn.style.color = originalColor;
          copyBtn.style.transform = "scale(1)";
        }, 800);
      }
    } catch (error) {
      console.error("复制失败:", error);
    }
  });

  // 朗读按钮功能
  speakBtn.addEventListener("click", function() {
    try {
      const iframe = container.querySelector("#glm-translator-iframe");
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const resultText = doc.querySelector(".result");

      if (resultText && resultText.textContent) {
        const utterance = new SpeechSynthesisUtterance(resultText.textContent);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        speechSynthesis.speak(utterance);

        // 临时高亮按钮
        const originalBg = speakBtn.style.backgroundColor;
        const originalColor = speakBtn.style.color;
        speakBtn.style.backgroundColor = "#3b82f6";
        speakBtn.style.color = "white";
        speakBtn.style.transform = "scale(1.1)";

        setTimeout(() => {
          speakBtn.style.backgroundColor = originalBg;
          speakBtn.style.color = originalColor;
          speakBtn.style.transform = "scale(1)";
        }, 1000);
      }
    } catch (error) {
      console.error("朗读失败:", error);
    }
  });

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
  });

  // 添加动画效果
  requestAnimationFrame(() => {
    container.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    container.style.transform = "scale(1)";
    container.style.opacity = "1";
  });

  // 添加拖拽功能 - 优化版本
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  // 拖拽事件处理
  const handlePointerDown = function (e) {
    // 检查是否点击在工具栏（标题栏）区域
    const isOnToolbar = e.target.closest('[data-component="toolbar"]');

    // 只有点击在工具栏（标题栏）才能启动拖拽
    if (!isOnToolbar) {
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(container.style.left) || container.offsetLeft;
    startTop = parseInt(container.style.top) || container.offsetTop;

    // 拖拽时禁用transition以避免延迟
    const originalTransition = container.style.transition;
    container.style.transition = "none";
    container.style.cursor = "grabbing";

    // 存储原始transition以便恢复
    container._originalTransition = originalTransition;

    // 防止选中文本和默认行为
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePointerMove = function (e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const newLeft = startLeft + deltaX;
    const newTop = startTop + deltaY;

    // 限制在视口内
    const maxX = window.innerWidth - container.offsetWidth - 10;
    const maxY = window.innerHeight - container.offsetHeight - 10;

    const constrainedX = Math.max(10, Math.min(newLeft, maxX));
    const constrainedY = Math.max(10, Math.min(newTop, maxY));

    container.style.left = constrainedX + "px";
    container.style.top = constrainedY + "px";
  };

  const handlePointerUp = function () {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = "move";

      // 拖拽结束后恢复原始transition
      if (container._originalTransition) {
        container.style.transition = container._originalTransition;
      }
    }
  };

  // 使用pointer事件
  container.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);

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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          color: #374151;
          font-size: 14px;
          line-height: 1.6;
          width: auto;
          min-width: 260px;
          max-width: 580px;
        }
        .result {
          padding: 16px;
          background-color: #ffffff;
          color: #1e293b;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.6;
          border-radius: 8px;
          margin: 0;
        }
        .error {
          color: #dc2626;
          padding: 14px;
          border-radius: 8px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          margin: 0;
          font-size: 13px;
          text-align: center;
          font-weight: 500;
        }
        .loading-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 65px 20px 35px 20px;
          min-height: 80px;
          width: 100%;
          box-sizing: border-box;
        }
        .loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #3b82f6;
          animation: bounce 1.4s ease-in-out infinite;
        }
        .loading-dot:nth-child(1) {
          animation-delay: 0s;
        }
        .loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      </style>
    `;

    // 显示加载状态
    doc.body.innerHTML = `
      <div class="loading-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
    `;

    // 调整iframe高度以适应加载消息
    adjustIframeHeight(iframe);

    // 获取设置中的语言
    if (!chrome?.storage?.sync) {
      console.warn("Chrome storage not available");
      return;
    }
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

    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: scale(0.95);
      }
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
