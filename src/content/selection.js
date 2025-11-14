import { getLanguageName } from "../common/languages.js";

export class SelectionTranslator {
  constructor(config) {
    this.config = config;
    this.translationIcon = null;
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

    if (this.config.general.selectionTrigger === "instant") {
      this.translate(text);
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

      // 显示翻译结果
      this.showTranslationResult(result);
    } catch (error) {
      console.error("翻译失败:", error);
      // 显示错误提示
      this.showError(error.message);
    }
  }

  // 添加翻译结果显示方法
  showTranslationResult(result) {
    // 创建或获取翻译结果容器
    let container = document.getElementById("glm-translation-result");
    if (!container) {
      container = document.createElement("div");
      container.id = "glm-translation-result";
      document.body.appendChild(container);
    }

    // 设置翻译结果内容和样式
    container.innerHTML = `
      <div class="glm-translation-content">
        <div class="glm-translation-text">${result}</div>
        <div class="glm-translation-close">×</div>
      </div>
    `;

    // 定位翻译结果框
    const selection = window.getSelection();
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    container.style.position = "absolute";
    container.style.top = `${window.scrollY + rect.bottom + 10}px`;
    container.style.left = `${window.scrollX + rect.left}px`;
    container.style.display = "block";

    // 添加关闭按钮事件
    const closeBtn = container.querySelector(".glm-translation-close");
    closeBtn.onclick = () => {
      container.style.display = "none";
    };
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
