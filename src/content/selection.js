import { getLanguageName } from "../common/languages.js";
import { translateText } from "../services/translator.js";

export class SelectionTranslator {
  constructor(config) {
    this.config = config;
    this.translationIcon = null;
    this.translationCache = new Map();
    this.translateTimeout = null;
    this.init();
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  init() {
    if (this.config.general.enableSelection) {
      document.addEventListener("mouseup", this.handleSelection.bind(this));
      if (this.config.general.shortcut) {
        document.addEventListener("keydown", this.handleShortcut.bind(this));
      }
    }
  }

  handleSelection(event) {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text) {
      this.hideTranslationIcon();
      return;
    }

    // 清理之前的定时器
    if (this.translateTimeout) {
      clearTimeout(this.translateTimeout);
    }

    if (this.config.general.selectionTrigger === "instant") {
      // 添加防抖，防止频繁触发
      this.translateTimeout = setTimeout(() => {
        this.translate(text);
      }, 300);
    } else if (this.config.general.selectionTrigger === "icon") {
      this.showTranslationIcon(event, text);
    }
  }

  showTranslationIcon(event, text) {
    if (!this.translationIcon) {
      this.translationIcon = document.createElement("div");
      this.translationIcon.className = "glm-translator-icon";
      document.body.appendChild(this.translationIcon);
    }

    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    this.translationIcon.style.top = `${window.scrollY + rect.bottom + 10}px`;
    this.translationIcon.style.left = `${window.scrollX + rect.left}px`;
    this.translationIcon.style.display = "block";

    this.translationIcon.onclick = () => {
      this.translate(text);
      this.hideTranslationIcon();
    };
  }

  hideTranslationIcon() {
    if (this.translationIcon) {
      this.translationIcon.style.display = "none";
    }
  }

  handleShortcut(event) {
    const keys = [];
    if (event.ctrlKey) keys.push("Ctrl");
    if (event.altKey) keys.push("Alt");
    if (event.shiftKey) keys.push("Shift");
    if (event.key && !["Control", "Alt", "Shift"].includes(event.key)) {
      keys.push(event.key.toUpperCase());
    }

    const pressedShortcut = keys.join("+");
    if (pressedShortcut === this.config.general.shortcut) {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      if (text) {
        this.translate(text);
      }
    }
  }

  async translate(text) {
    // 检查缓存
    const cacheKey = `${text}-${this.config.selectedProvider}-${this.config.providerConfig?.targetLang || 'zh'}`;
    if (this.translationCache.has(cacheKey)) {
      const cached = this.translationCache.get(cacheKey);
      this.showTranslationResult(text, cached);
      return;
    }

    // 显示加载状态
    this.showLoadingState(text);

    try {
      let result;
      switch (this.config.selectedProvider) {
        case "google":
          result = await this.translateWithGoogle(text);
          break;
        case "microsoft":
          result = await this.translateWithMicrosoft(text);
          break;
        case "glm":
          result = await this.translateWithGLM(text);
          break;
        case "custom":
          result = await this.translateWithCustom(text);
          break;
        default:
          throw new Error("未选择翻译服务");
      }

      // 缓存翻译结果
      this.translationCache.set(cacheKey, result);

      // 显示翻译结果
      this.showTranslationResult(text, result);

      // 清理加载状态
      this.hideLoadingState();
    } catch (error) {
      console.error("翻译失败:", error);
      // 显示错误提示
      this.showError(error.message);
    }
  }

  // 显示加载状态
  showLoadingState(originalText) {
    let container = document.getElementById("glm-translation-result");
    if (!container) {
      container = document.createElement("div");
      container.id = "glm-translation-result";
      document.body.appendChild(container);
    }

    const selection = window.getSelection();
    const rect = selection.getRangeAt(0).getBoundingClientRect();

    // 计算加载状态的位置，与最终结果保持一致
    const viewportWidth = window.innerWidth;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let left = scrollX + rect.left;
    let top = scrollY + rect.bottom + 10;

    if (left + 650 > viewportWidth + scrollX - 20) {
      left = Math.max(scrollX + 20, scrollX + rect.right - 650);
    }
    if (left < scrollX + 20) {
      left = scrollX + (viewportWidth - 650) / 2;
    }

    container.style.cssText = `
      position: absolute;
      top: ${top}px;
      left: ${left}px;
      width: 650px;
      max-width: 700px;
      min-width: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      padding: 0;
      z-index: 999999;
      display: block;
      animation: glm-fade-in 0.2s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    container.innerHTML = `
      <div class="glm-translation-content">
        <div class="glm-translation-header">
          <span class="glm-translation-title">翻译中...</span>
        </div>
        <div class="glm-translation-body">
          <div class="glm-translation-original"><strong>原文:</strong> ${originalText}</div>
          <div class="glm-translation-dividing"></div>
          <div class="glm-translation-columns">
            <div class="glm-translation-column">
              <div class="glm-translation-column-title">原文 (Original)</div>
              <div class="glm-translation-column-content glm-translation-original-text">${originalText}</div>
            </div>
            <div class="glm-translation-column">
              <div class="glm-translation-column-title">译文 (Translation)</div>
              <div class="glm-translation-column-content glm-translation-loading">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div class="glm-loading-spinner"></div>
                  <span>正在翻译，请稍候...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加加载动画样式
    if (!document.getElementById('glm-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'glm-loading-styles';
      style.textContent = `
        .glm-loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #1a73e8;
          border-radius: 50%;
          animation: glm-spin 1s linear infinite;
        }
        @keyframes glm-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // 隐藏加载状态
  hideLoadingState() {
    // 加载状态会在 showTranslationResult 中被覆盖
  }

  // 添加翻译结果显示方法
  showTranslationResult(originalText, translatedText) {
    // 创建或获取翻译结果容器
    let container = document.getElementById("glm-translation-result");
    if (!container) {
      container = document.createElement("div");
      container.id = "glm-translation-result";
      document.body.appendChild(container);
    }

    // 处理长文本
    const maxLength = 800;
    const truncatedOriginal = originalText.length > maxLength
      ? originalText.substring(0, maxLength) + '...'
      : originalText;
    const truncatedTranslated = translatedText.length > maxLength
      ? translatedText.substring(0, maxLength) + '...'
      : translatedText;

    // 设置翻译结果内容和样式 - 使用双栏布局
    container.innerHTML = `
      <div class="glm-translation-content">
        <div class="glm-translation-header">
          <span class="glm-translation-title">翻译结果</span>
          <div class="glm-translation-close">×</div>
        </div>
        <div class="glm-translation-body">
          ${originalText !== truncatedOriginal ? `<div class="glm-translation-original"><strong>原文:</strong> ${truncatedOriginal}</div>` : ''}
          <div class="glm-translation-columns">
            <div class="glm-translation-column">
              <div class="glm-translation-column-title">原文 (Original)</div>
              <div class="glm-translation-column-content glm-translation-original-text">${truncatedOriginal}</div>
            </div>
            <div class="glm-translation-column">
              <div class="glm-translation-column-title">译文 (Translation)</div>
              <div class="glm-translation-column-content glm-translation-result-text">${truncatedTranslated}</div>
            </div>
          </div>
        </div>
        <div class="glm-translation-footer">
          <span class="glm-translation-lang">${this.getCurrentLanguageInfo()}</span>
        </div>
      </div>
    `;

    // 定位翻译结果框
    const selection = window.getSelection();
    const rect = selection.getRangeAt(0).getBoundingClientRect();

    // 计算最佳显示位置，考虑新的宽度(650px)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // 默认位置
    let left = scrollX + rect.left;
    let top = scrollY + rect.bottom + 10;

    // 如果右侧空间不够，调整到左侧
    if (left + 650 > viewportWidth + scrollX - 20) {
      left = Math.max(scrollX + 20, scrollX + rect.right - 650);
    }

    // 如果左侧空间不够且右侧也不够，使用居中显示
    if (left < scrollX + 20) {
      left = scrollX + (viewportWidth - 650) / 2;
    }

    // 如果底部空间不够，调整到上方
    if (top + 300 > viewportHeight + scrollY - 20) {
      top = Math.max(scrollY + 20, scrollY + rect.top - 20);
    }

    container.style.cssText = `
      position: absolute;
      top: ${top}px;
      left: ${left}px;
      width: 650px;
      max-width: 700px;
      min-width: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      padding: 0;
      z-index: 999999;
      display: block;
      animation: glm-fade-in 0.2s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // 添加动画样式
    if (!document.getElementById('glm-translation-styles')) {
      const style = document.createElement('style');
      style.id = 'glm-translation-styles';
      style.textContent = `
        @keyframes glm-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // 添加关闭按钮事件
    const closeBtn = container.querySelector(".glm-translation-close");
    closeBtn.onclick = () => {
      container.style.display = "none";
    };

    // 添加点击外部关闭功能
    const clickOutsideHandler = (e) => {
      if (!container.contains(e.target)) {
        container.style.display = "none";
        document.removeEventListener('click', clickOutsideHandler);
      }
    };
    // 延迟绑定，防止立即触发
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler);
    }, 100);
  }

  // 获取当前语言信息
  getCurrentLanguageInfo() {
    const targetLang = this.config.providerConfig?.targetLang || "zh";
    const sourceLang = this.config.providerConfig?.sourceLang || "auto";
    return `从 ${sourceLang} → ${targetLang}`;
  }

  showError(message) {
    // 显示错误提示
    alert(`翻译失败: ${message}`);
  }

  // 添加具体的翻译方法
  async translateWithGoogle(text) {
    try {
      const response = await fetch(this.config.providerConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.providerConfig.apiKey}`,
        },
        body: JSON.stringify({
          q: text,
          target: this.config.providerConfig.targetLang || "zh-CN",
          source: this.config.providerConfig.sourceLang || "auto",
        }),
      });

      if (!response.ok) {
        throw new Error("翻译请求失败");
      }

      const data = await response.json();
      return data.data?.translations?.[0]?.translatedText || "翻译失败";
    } catch (error) {
      console.error("Google翻译失败:", error);
      throw new Error("Google翻译服务出错");
    }
  }

  async translateWithMicrosoft(text) {
    try {
      const response = await fetch(this.config.providerConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": this.config.providerConfig.apiKey,
          "Ocp-Apim-Subscription-Region": this.config.providerConfig.region,
        },
        body: JSON.stringify([
          {
            text: text,
            targetLanguage: this.config.providerConfig.targetLang || "zh-Hans",
            sourceLanguage: this.config.providerConfig.sourceLang || "auto",
          },
        ]),
      });

      if (!response.ok) {
        throw new Error("翻译请求失败");
      }

      const data = await response.json();
      return data[0]?.translations?.[0]?.text || "翻译失败";
    } catch (error) {
      console.error("Microsoft翻译失败:", error);
      throw new Error("Microsoft翻译服务出错");
    }
  }

  async translateWithGLM(text) {
    try {
      // 获取用户设置的目标语言
      const targetLang = this.config.providerConfig.targetLang || "zh";
      const targetLanguageName = getLanguageName(targetLang);

      const response = await fetch(this.config.providerConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.providerConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.providerConfig.model || "glm-4",
          messages: [
            {
              role: "user",
              content: `请将以下文本翻译成${targetLanguageName}：\n${text}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("翻译请求失败");
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "翻译失败";
    } catch (error) {
      console.error("GLM翻译失败:", error);
      throw new Error("GLM翻译服务出错");
    }
  }

  async translateWithCustom(text) {
    try {
      // 获取用户设置的目标语言
      const targetLang = this.config.providerConfig.targetLang || "zh";
      const targetLanguageName = getLanguageName(targetLang);

      const response = await fetch(this.config.providerConfig.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.providerConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.providerConfig.model,
          messages: [
            {
              role: "user",
              content: `请将以下文本翻译成${targetLanguageName}：\n${text}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("翻译请求失败");
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "翻译失败";
    } catch (error) {
      console.error("自定义翻译失败:", error);
      throw new Error("自定义翻译服务出错");
    }
  }
}
