# GLM Translator 划词翻译扩展

<div align="center">

![GLM Translator Logo](public/icons/icon128.png)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.0-brightgreen.svg)]()
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg?logo=google-chrome)]()
[![AI Powered](https://img.shields.io/badge/AI-Powered-orange.svg)]()
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D.svg?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.x-646CFF.svg?logo=vite)](https://vitejs.dev/)

</div>

## 📝 项目介绍

GLM Translator 是一款**商业级**的浏览器划词翻译扩展，支持多种语言互译，集成了**6家主流 AI 翻译服务**，包括智谱 GLM、火山引擎、硅基流动、腾讯混元、阿里通义、DeepSeek 等，采用**多策略智能敏感内容处理**技术，让您在浏览网页时获得高质量、无障碍的翻译体验。

## ✨ 功能特点

### 翻译服务（2025年最新模型）

- **智谱 GLM** - 支持最新 GLM-4.5/4.6 系列模型（GLM-4.5-Flash、GLM-4.5-Air 等）
- **火山引擎** - 字节跳动豆包模型，2025年最新模型支持
- **硅基流动** - 提供 Qwen3-8B、GLM-Z1-9B 等开源模型
- **腾讯混元** - 支持 Hunyuan-MT-7B 翻译专用模型
- **阿里通义** - 通义千问系列，包括 Qwen-MT 系列翻译模型
- **DeepSeek** - 支持 DeepSeek-Chat、DeepSeek-Reasoner 等模型
- **自定义 API** - 支持配置其他兼容 OpenAI 格式的翻译服务

### 核心功能

- **划词翻译** - 支持选中文本后立即翻译或显示图标
- **右键菜单** - 通过右键菜单快捷翻译选中文本
- **快捷键支持** - 内置 Alt+T / Alt+G，便捷操作翻译功能
- **微软免费翻译** - 基于 Edge 同款接口，无需 API Key（非官方，可能限流）
- **智能语言检测** - 源语言「自动」时本地检测语种，微软返回结果优先展示
- **划词结果窗** - 原文/译文对照、语种切换、进度、Esc 关闭、拖拽
- **语音朗读** - 浏览器 Web Speech + 中文在线自然音兜底；设置页可中英文试听
- **多语言支持** - 支持 20+ 种语言互译
- **高度可配置** - 多服务商、自定义 OpenAI 兼容 API、连接测试
- **📋 多配置管理** - 多套服务商配置切换；API Key 仅存本机 local，不进 sync
- **翻译历史** - 本机保存，可在设置中查看/清空
- **划词黑名单** - 可按域名禁用划词翻译
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
   - 翻译服务提供商（微软免费 / 智谱 GLM / 火山 / 硅基 / 混元 / 通义 / DeepSeek / 自定义）
   - API 密钥和模型配置（Key 仅保存在本机）
   - 默认源语言和目标语言
   - 划词触发方式、最短选中长度、域名黑名单
   - **语音朗读预览**（中英文试听）
   - 翻译历史查看与清空
3. 快捷键可在浏览器的扩展管理页面（`chrome://extensions/shortcuts` 或 Edge 对应页面）中查看或修改

### 翻译服务配置

#### 智谱 GLM
- 访问 [智谱AI开放平台](https://open.bigmodel.cn/) 获取 API Key
- 推荐模型：`glm-4.5-flash`（最新快速）、`glm-4.5-plus`（最高质量）、`glm-4v`（多模态）

#### 火山引擎
- 访问 [火山引擎控制台](https://console.volcengine.com/ark) 创建推理接入点
- 需要填入推理接入点 URL 和对应的模型名称（需注意模型名称后面可能带有日期）
- 支持豆包等模型

#### 硅基流动
- 访问 [硅基流动平台](https://siliconflow.cn/) 获取 API Key
- 推荐模型：`Qwen/Qwen2.5-14B-Instruct`（默认）、`Qwen/Qwen2.5-32B-Instruct`、`meta-llama/Llama-3.1-70B-Instruct`

#### 腾讯混元
- 访问 [腾讯云控制台](https://console.cloud.tencent.com/hunyuan) 获取 API Key
- 推荐模型：`hunyuan-lite`（免费）、`hunyuan-turbo`（高速）、`hunyuan-functioncall`（函数调用）

#### 阿里通义
- 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/) 获取 API Key
- 推荐模型：`qwen-mt-flash`（翻译快速）、`qwen-mt-turbo`（翻译高速）、`qwen-mt-plus`（翻译高质量）

#### DeepSeek
- 访问 [DeepSeek 平台](https://platform.deepseek.com/) 获取 API Key
- 推荐模型：`deepseek-reasoner`（推荐）、`deepseek-chat`（对话）、`deepseek-coder`（代码专用）

## 🔨 技术架构

- **前端框架**：Vue.js 3.x
- **构建工具**：Vite 5.x
- **UI 框架**：Tailwind CSS 3.x
- **浏览器扩展**：Chrome Extension Manifest V3
- **打包插件**：@crxjs/vite-plugin
- **测试**：Node.js 内置 test runner（`pnpm test`）

## 👥 贡献指南

欢迎贡献代码、报告问题或提出新功能建议！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📋 更新日志

完整版本历史请查看 [CHANGELOG.md](CHANGELOG.md)。

## 🗓️ 未来计划
- [x] 翻译历史记录
- [x] 文本朗读（TTS）与设置页预览
- [ ] 朗读音色手动选择 / 语速调节持久化
- [ ] 优化翻译结果展示动画
- [ ] 添加翻译质量评估
- [ ] 支持批量文本翻译
- [ ] 添加用户偏好学习

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

- JochenYang - [GitHub](https://github.com/JochenYang)

## 🙏 致谢

感谢以下 AI 服务提供商的支持：
- 智谱AI（GLM-4.5/4.6系列）
- 字节跳动（火山引擎/豆包）
- 硅基流动（开源模型托管）
- 腾讯云（混元系列）
- 阿里云（通义千问系列）
- DeepSeek（推理增强模型）

---

<div align="center">

**GLM Translator** - 让翻译更简单，让阅读无国界

</div>
