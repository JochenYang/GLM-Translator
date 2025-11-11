# GLM Translator 划词翻译扩展

<div align="center">

![GLM Translator Logo](public/icons/icon128.png)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.1-brightgreen.svg)]()
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
- **快捷键支持** - 内置Alt+T和Alt+G快捷键，便捷操作翻译功能
- **🎯 智能敏感内容处理** - 多策略自动重试系统，智能绕过内容限制
- **多语言支持** - 支持 20+种语言互译，包括中文、英语、日语、韩语等
- **🎨 商业级界面设计** - 简洁现代的UI，2x2网格功能展示
- **高度可配置** - 支持自定义模型配置，实时API连接测试
- **智能配置** - 预设6家主流 AI 服务商配置，一键切换翻译服务
- **配置持久化** - 完善的配置保存机制，自定义模型刷新不丢失
- **📋 多配置管理** - 支持同时保存多个AI服务商配置，可随时切换，配置永久保存不丢失
- **🔧 配置测试** - 支持API连接测试，测试过程不影响已保存的配置
- **🗑️ 配置操作** - 可查看、选择、删除已保存的配置，支持配置去重
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

## 📊 更新日志 & 未来计划

### v1.2.2 (Latest) ✨
- [x] 升级至商业级AI翻译扩展
- [x] 新增8个主流AI翻译服务商支持
- [x] 更新所有模型至2025年最新版本
- [x] 实现多策略智能敏感内容处理系统
- [x] 新增ProviderSetup组件，支持自定义模型配置
- [x] 优化设置界面UI，2x2网格布局
- [x] 完善配置持久化机制
- [x] **修复多配置管理Bug** - 用户可保存无限数量的服务商配置，测试连接时不再丢失已保存配置
- [x] 优化配置管理逻辑 - 支持已保存配置列表显示、选择和删除功能
- [x] 改进测试连接功能 - 使用临时配置测试，不影响用户已保存的配置数据

### 未来计划
- [ ] 添加翻译历史记录功能
- [ ] 支持文本朗读（TTS）
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
