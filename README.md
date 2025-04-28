# GLM Translator 划词翻译扩展

<div align="center">

![GLM Translator Logo](public/icons/icon128.png)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)]()
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D.svg?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.x-646CFF.svg?logo=vite)](https://vitejs.dev/)

</div>

## 📝 项目介绍

GLM Translator 是一款简洁高效的浏览器划词翻译扩展，支持多种语言互译，提供智谱 GLM 智能翻译和自定义 API 服务，让您在浏览网页时获得无缝的翻译体验。

## ✨ 功能特点

### 翻译服务

- **智谱 GLM** - AI 驱动的智能翻译服务
- **自定义 API** - 支持配置其他第三方翻译服务

### 核心功能

- **划词翻译** - 支持选中文本后立即翻译或显示图标
- **右键菜单** - 通过右键菜单快捷翻译选中文本
- **多语言支持** - 支持 20+种语言互译，包括中文、英语、日语、韩语等
- **简洁界面** - 无干扰的翻译体验，现代化 UI 设计
- **高度可配置** - 可自定义翻译服务、触发方式和默认语言

## 🔧 安装方法

### 从源码构建

1. 克隆仓库

```bash
git clone https://github.com/yourusername/GLM-Translator.git
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

- 即将上线，敬请期待...

## 🚀 使用说明

### 基本使用

1. **划词翻译**：选中网页上的文本，根据设置会自动翻译或显示翻译图标
2. **右键菜单**：选中文本后，右键点击并选择"使用 GLM Translator 翻译"
3. **弹出窗口**：点击浏览器工具栏中的扩展图标，打开翻译弹窗

### 设置选项

1. 点击扩展弹窗右上角的设置图标或右键点击扩展图标选择"选项"
2. 在设置页面中可以配置：
   - 默认源语言和目标语言
   - 划词翻译的触发方式
   - 翻译服务提供商及 API 密钥
   - 界面显示选项

## 🔨 技术架构

- **前端框架**：Vue.js 3.x
- **构建工具**：Vite 4.x
- **UI 框架**：Tailwind CSS
- **浏览器扩展**：Chrome Extension Manifest V3
- **打包插件**：@crxjs/vite-plugin

## 👥 贡献指南

欢迎贡献代码、报告问题或提出新功能建议！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📊 未来计划

- [ ] 支持更多翻译服务
- [ ] 添加历史记录功能
- [ ] 支持文本朗读
- [ ] 优化翻译结果展示
- [ ] 添加快捷键支持

## 👨‍💻 作者

- JochenYang - [GitHub](https://github.com/JochenYang)

---

<div align="center">

**GLM Translator** - 让翻译更简单，让阅读无国界

</div>
