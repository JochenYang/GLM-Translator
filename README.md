# GLM Translator 划词翻译扩展

<div align="center">

![GLM Translator Logo](public/icons/icon128.png)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen.svg)]()
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg?logo=google-chrome)]()
[![AI Powered](https://img.shields.io/badge/AI-Powered-orange.svg)]()
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D.svg?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.x-646CFF.svg?logo=vite)](https://vitejs.dev/)

</div>

## 📝 项目介绍

GLM Translator 是一款简洁高效的浏览器划词翻译扩展，支持多种语言互译，集成了多家主流 AI 翻译服务，包括智谱 GLM、火山引擎、硅基流动、腾讯混元、阿里通义、DeepSeek 等，让您在浏览网页时获得无缝的翻译体验。

## ✨ 功能特点

### 翻译服务

- **智谱 GLM** - AI 驱动的智能翻译服务，支持 glm-4-flash 等模型
- **火山引擎** - 字节跳动旗下的 AI 翻译服务，支持豆包等模型
- **硅基流动** - 提供 Qwen2.5 等开源模型的翻译服务
- **腾讯混元** - 腾讯云的 AI 翻译服务，支持混元模型
- **阿里通义** - 阿里云的通义千问翻译服务
- **DeepSeek** - DeepSeek 的 AI 翻译服务
- **自定义 API** - 支持配置其他兼容 OpenAI 格式的翻译服务

### 核心功能

- **划词翻译** - 支持选中文本后立即翻译或显示图标
- **右键菜单** - 通过右键菜单快捷翻译选中文本
- **快捷键支持** - 内置Alt+T和Alt+G快捷键，便捷操作翻译功能
- **多语言支持** - 支持 20+种语言互译，包括中文、英语、日语、韩语等
- **简洁界面** - 无干扰的翻译体验，现代化 UI 设计
- **高度可配置** - 可自定义翻译服务、触发方式、默认语言和 API 配置
- **智能配置** - 预设多家主流 AI 服务商配置，一键切换翻译服务
- **错误处理** - 完善的错误提示和配置验证机制

## 🔧 安装方法

### 从源码构建

1. 克隆仓库

```bash
git clone https://github.com/JochenYang/GLM-Translator.git
cd GLM-Translator
```

2. 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

3. 构建扩展

```bash
npm run build
```

4. 在浏览器中加载扩展
   - 打开浏览器的扩展管理页面
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

### 从商店安装

- Chrome Web Store：即将上线，敬请期待...
- Edge Add-ons：即将上线，敬请期待...

## 🚀 使用说明

### 基本使用

1. **划词翻译**：选中网页上的文本，根据设置会自动翻译或显示翻译图标
2. **右键菜单**：选中文本后，右键点击并选择"使用 GLM Translator 翻译"
3. **弹出窗口**：点击浏览器工具栏中的扩展图标，打开翻译弹窗
4. **快捷键使用**：
   - **Alt+T** - 打开翻译工具
   - **Alt+G** - 翻译选中的文本

### 设置选项

1. 点击扩展弹窗右上角的设置图标或右键点击扩展图标选择"选项"
2. 在设置页面中可以配置：
   - 默认源语言和目标语言
   - 划词翻译的触发方式
   - 翻译服务提供商（智谱GLM、火山引擎、硅基流动等）
   - API 密钥和模型配置
   - 界面显示选项和个性化设置
3. 快捷键可在浏览器的扩展管理页面(chrome://extensions/shortcuts或edge中相应页面)中查看或修改

### 翻译服务配置

#### 智谱 GLM
- 访问 [智谱AI开放平台](https://open.bigmodel.cn/) 获取 API Key
- 推荐模型：`glm-4-flash`（速度快）、`glm-4`（质量高）

#### 火山引擎
- 访问 [火山引擎控制台](https://console.volcengine.com/ark) 创建推理接入点
- 需要填入推理接入点 URL 和对应的模型名称（需注意模型名称后面可能带有日期）
- 支持豆包等模型

#### 硅基流动
- 访问 [硅基流动平台](https://siliconflow.cn/) 获取 API Key
- 推荐模型：`Qwen/Qwen2.5-7B-Instruct`、`meta-llama/Llama-3.1-8B-Instruct`

#### 腾讯混元
- 访问 [腾讯云控制台](https://console.cloud.tencent.com/hunyuan) 获取 API Key
- 推荐模型：`hunyuan-lite`（免费）、`hunyuan-standard`

#### 阿里通义
- 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/) 获取 API Key
- 推荐模型：`qwen-turbo`、`qwen-plus`

#### DeepSeek
- 访问 [DeepSeek 平台](https://platform.deepseek.com/) 获取 API Key
- 推荐模型：`deepseek-chat`

## 🔨 技术架构

- **前端框架**：Vue.js 3.5.13
- **构建工具**：Vite 4.5.13
- **UI 框架**：Tailwind CSS 3.4.17
- **浏览器扩展**：Chrome Extension Manifest V3
- **打包插件**：@crxjs/vite-plugin 2.0.0-beta.32
- **动画库**：Three.js 0.158.0、Tween.js 21.0.0
- **粒子效果**：Particles.js 2.0.0
- **工具库**：Lodash-es 4.17.21

## 👥 贡献指南

欢迎贡献代码、报告问题或提出新功能建议！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📊 未来计划

- [x] 支持多家主流 AI 翻译服务
- [x] 添加快捷键支持
- [x] 完善配置验证和错误处理
- [ ] 添加历史记录功能
- [ ] 支持文本朗读
- [ ] 优化翻译结果展示
- [ ] 支持更多语言模型
- [ ] 添加翻译质量评估

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

- JochenYang - [GitHub](https://github.com/JochenYang)

## 🙏 致谢

感谢以下 AI 服务提供商的支持：
- 智谱AI（GLM）
- 字节跳动（火山引擎）
- 硅基流动
- 腾讯云（混元）
- 阿里云（通义千问）
- DeepSeek

---

<div align="center">

**GLM Translator** - 让翻译更简单，让阅读无国界

</div>
