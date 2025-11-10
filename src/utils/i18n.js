// 国际化支持 - 完整的多语言系统
// 支持中英文切换，包含115个翻译键

// 翻译资源
const translations = {
  zh: {
    // 通用翻译
    'common.ok': '确定',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.close': '关闭',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.warning': '警告',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.reset': '重置',
    'common.test': '测试',
    'common.select': '选择',
    'common.name': '名称',
    'common.description': '描述',

    // 设置页面
    'settings.title': 'GLM Translator 设置',
    'settings.version': '版本',
    'settings.providerConfig': '翻译服务配置',
    'settings.generalSettings': '通用设置',
    'settings.about': '关于',

    // 语言设置
    'settings.language.title': '语言设置',
    'settings.language.defaultSource': '默认源语言',
    'settings.language.defaultTarget': '默认目标语言',
    'settings.language.autoDetection': '智能语言检测',
    'settings.language.confidenceThreshold': '置信度阈值',
    'settings.language.languagePairMapping': '语言对映射',
    'settings.language.smartTargetSelection': '智能目标语言选择',
    'settings.language.languageCode': '语言代码',
    'settings.language.targetLanguage': '目标语言',
    'settings.language.addMapping': '添加映射',
    'settings.language.removeMapping': '删除映射',

    // 划词翻译设置
    'settings.selection.title': '划词翻译设置',
    'settings.selection.enable': '启用划词翻译',
    'settings.selection.triggerMethod': '触发方式',
    'settings.selection.showIcon': '显示翻译图标',
    'settings.selection.instantTranslate': '立即翻译',

    // 翻译相关
    'translate.selectProvider': '选择翻译服务商',
    'translate.selectProviderDesc': '选择您要使用的AI翻译服务提供商',
    'translate.apiConfig': 'API配置',
    'translate.apiConfigDesc': '配置所选服务商的API密钥和模型',
    'translate.apiKey': 'API Key',
    'translate.apiKeyRequired': '必填',
    'translate.apiKeyHelp': '获取API Key',
    'translate.apiUrl': 'API地址',
    'translate.modelSelection': '模型选择',
    'translate.availableModels': '可用模型',
    'translate.customModel': '使用自定义模型...',
    'translate.testing': '测试中...',
    'translate.testConnection': '测试连接',
    'translate.saveConfig': '保存配置',
    'translate.configStatus': '当前配置状态',
    'translate.provider': '服务商',
    'translate.url': 'API地址',
    'translate.model': '模型',
    'translate.apiKeySet': '已设置',
    'translate.notSet': '未设置',
    'translate.setupGuide': '设置指南',
    'translate.saveSuccess': '配置保存成功！',
    'translate.connectionSuccess': '连接成功！翻译测试通过',
    'translate.connectionFailed': '连接失败',
    'translate.exampleModel': '例如',

    // 语言选项
    'lang.auto': '自动检测',
    'lang.chinese': '中文',
    'lang.english': 'English',

    // 扩展信息
    'about.title': 'GLM Translator',
    'about.subtitle': '简洁高效的AI翻译扩展',
    'about.aiServices': '多种AI翻译服务支持',
    'about.sensitiveHandling': '智能敏感内容处理',
    'about.shortcuts': '快捷键和划词翻译',
    'about.interface': '简洁现代的界面设计',
    'about.copyright': '© 2025 GLM Translator. 让翻译更简单，让阅读无国界。',

    // 提供商相关
    'provider.showAll': '显示所有服务商',
    'provider.showRecommended': '显示推荐服务商',
    'provider.customApi': '自定义API',
    'provider.customApiDesc': '配置兼容OpenAI格式的自定义翻译API',
    'provider.config': '配置',
    'provider.selected': '已选择',
    'provider.notConfigured': '未配置',
    'provider.configured': '已配置',
    'provider.apiUrlDesc': '请输入兼容OpenAI格式的API地址',
    'provider.modelPlaceholder': '请输入模型名称，如：gpt-3.5-turbo',
    'provider.modelDesc': '请输入您要使用的模型名称',
    'provider.customModelNamePlaceholder': '请输入自定义模型名称',
    'provider.currentModel': '当前模型：{model}',
    'provider.testing': '测试中...',
    'provider.testBtn': '测试连接',
    'provider.saveConfig': '保存配置',
    'provider.configStatus': '当前配置状态',
    'provider.provider': '服务商',
    'provider.url': 'API地址',
    'provider.model': '模型',
    'provider.apiKey': 'API Key',
    'provider.apiKeySet': '已设置',
    'provider.notSet': '未设置',
    'provider.setupGuide': '设置指南',
    'provider.setupGuide.glm.step1': '访问 https://open.bigmodel.cn/',
    'provider.setupGuide.glm.step2': '注册并登录账号',
    'provider.setupGuide.glm.step3': '在控制台创建API Key',
    'provider.setupGuide.glm.step4': '复制API Key到配置中',
    'provider.setupGuide.volcengine.step1': '访问 https://console.volcengine.com/ark',
    'provider.setupGuide.volcengine.step2': '创建推理接入点',
    'provider.setupGuide.volcengine.step3': '获取接入点URL和API Key',
    'provider.setupGuide.volcengine.step4': '配置到插件中',
    'provider.setupGuide.siliconflow.step1': '访问 https://siliconflow.cn/',
    'provider.setupGuide.siliconflow.step2': '注册并登录账号',
    'provider.setupGuide.siliconflow.step3': '在API管理中创建密钥',
    'provider.setupGuide.siliconflow.step4': '复制API Key到配置中',
    'provider.setupGuide.hunyuan.step1': '访问 https://console.cloud.tencent.com/hunyuan',
    'provider.setupGuide.hunyuan.step2': '开通混元服务',
    'provider.setupGuide.hunyuan.step3': '创建API密钥',
    'provider.setupGuide.hunyuan.step4': '配置到插件中',
    'provider.setupGuide.tongyi.step1': '访问 https://bailian.console.aliyun.com/',
    'provider.setupGuide.tongyi.step2': '开通通义千问服务',
    'provider.setupGuide.tongyi.step3': '创建API Key',
    'provider.setupGuide.tongyi.step4': '配置到插件中',
    'provider.setupGuide.deepseek.step1': '访问 https://platform.deepseek.com/',
    'provider.setupGuide.deepseek.step2': '注册并登录账号',
    'provider.setupGuide.deepseek.step3': '在API Keys中创建密钥',
    'provider.setupGuide.deepseek.step4': '复制API Key到配置中',
    'provider.setupGuide.custom.step1': '准备兼容OpenAI格式的API服务',
    'provider.setupGuide.custom.step2': '获取API地址和密钥',
    'provider.setupGuide.custom.step3': '在下方配置API URL和模型名称',
    'provider.setupGuide.custom.step4': '测试连接确保配置正确',
    'provider.saveSuccess': '配置保存成功！',
    'provider.enterApiKey': '请填写完整的API Key',
    'provider.enterCustomConfig': '请填写完整的自定义API配置',
    'provider.enterCustomModel': '请输入自定义模型名称',
    'provider.connectionSuccess': '连接成功！翻译测试通过',
    'provider.connectionFailed': '连接失败: {error}',
    'provider.exampleModel': '例如：{examples}',
    'provider.modelExample': '请输入完整的模型名称',
    'provider.name.glm': '智谱 GLM',
    'provider.name.volcengine': '火山引擎',
    'provider.name.siliconflow': '硅基流动',
    'provider.name.hunyuan': '腾讯混元',
    'provider.name.tongyi': '阿里通义',
    'provider.name.deepseek': 'DeepSeek',
    'provider.name.custom': '自定义API',
    'provider.desc.glm': 'AI驱动的智能翻译服务，支持多种模型',
    'provider.desc.volcengine': '字节跳动旗下的AI翻译服务',
    'provider.desc.siliconflow': '提供开源模型的AI翻译服务',
    'provider.desc.hunyuan': '腾讯云的AI翻译服务',
    'provider.desc.tongyi': '阿里云的通义千问翻译服务',
    'provider.desc.deepseek': 'DeepSeek的AI翻译服务',
    'provider.desc.custom': '配置兼容OpenAI格式的自定义翻译API',
    'provider.pricing.free': '免费额度 + 按量计费',
    'provider.pricing.volume': '按量计费',
    'provider.pricing.freeVolume': '免费额度 + 优惠价格',
    'provider.pricing.freeLite': 'Lite版本免费',
    'provider.pricing.discount': '优惠价格',
    'provider.pricing.custom': '根据服务商而定',
    'provider.feature.highQuality': '高质量翻译',
    'provider.feature.multiLang': '多语言支持',
    'provider.feature.fastResponse': '快速响应',
    'provider.feature.doubao': '豆包模型',
    'provider.feature.longText': '长文本支持',
    'provider.feature.highConcurrency': '高并发',
    'provider.feature.openSource': '开源模型',
    'provider.feature.priceAdvantage': '价格优惠',
    'provider.feature.modelChoice': '多模型选择',
    'provider.feature.freeQuota': '免费额度',
    'provider.feature.tencentCloud': '腾讯云服务',
    'provider.feature.reliable': '稳定可靠',
    'provider.feature.qwen': '通义千问',
    'provider.feature.aliyun': '阿里云服务',
    'provider.feature.multiModel': '多模型支持',
    'provider.feature.costEffective': '高性价比',
    'provider.feature.professional': '专业模型',
    'provider.feature.safe': '安全可靠',
    'provider.feature.customConfig': '自定义配置',
    'provider.feature.flexible': '灵活接入',
    'provider.feature.openaiCompatible': '兼容OpenAI格式',

    // Popup相关
    'popup.switchLanguages': '切换语言',
    'popup.settings': '设置',
    'popup.inputPlaceholder': '请输入要翻译的文本...',
    'popup.emptyResult': '译文将显示在这里',
    'popup.copyTranslation': '复制译文',
    'popup.translating': '翻译中...',
    'popup.copySuccess': '复制成功！',
    'popup.translationFailed': '翻译失败',
    'popup.translationFailedUnknown': '翻译失败：未知错误',
    'popup.contentError': '翻译服务遇到了问题，请尝试修改文本内容后重新翻译。',
    'popup.unknownError': '未知错误',
  },

  en: {
    // Common translations
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.reset': 'Reset',
    'common.test': 'Test',
    'common.select': 'Select',
    'common.name': 'Name',
    'common.description': 'Description',

    // Settings page
    'settings.title': 'GLM Translator Settings',
    'settings.version': 'Version',
    'settings.providerConfig': 'Translation Service Configuration',
    'settings.generalSettings': 'General Settings',
    'settings.about': 'About',

    // Language settings
    'settings.language.title': 'Language Settings',
    'settings.language.defaultSource': 'Default Source Language',
    'settings.language.defaultTarget': 'Default Target Language',
    'settings.language.autoDetection': 'Smart Language Detection',
    'settings.language.confidenceThreshold': 'Confidence Threshold',
    'settings.language.languagePairMapping': 'Language Pair Mapping',
    'settings.language.smartTargetSelection': 'Smart Target Language Selection',
    'settings.language.languageCode': 'Language Code',
    'settings.language.targetLanguage': 'Target Language',
    'settings.language.addMapping': 'Add Mapping',
    'settings.language.removeMapping': 'Remove Mapping',

    // Selection translation settings
    'settings.selection.title': 'Selection Translation Settings',
    'settings.selection.enable': 'Enable Selection Translation',
    'settings.selection.triggerMethod': 'Trigger Method',
    'settings.selection.showIcon': 'Show Translation Icon',
    'settings.selection.instantTranslate': 'Instant Translate',

    // Translation related
    'translate.selectProvider': 'Select Translation Service Provider',
    'translate.selectProviderDesc': 'Select the AI translation service provider you want to use',
    'translate.apiConfig': 'API Configuration',
    'translate.apiConfigDesc': 'Configure API key and model for the selected provider',
    'translate.apiKey': 'API Key',
    'translate.apiKeyRequired': 'Required',
    'translate.apiKeyHelp': 'Get API Key',
    'translate.apiUrl': 'API URL',
    'translate.modelSelection': 'Model Selection',
    'translate.availableModels': 'Available Models',
    'translate.customModel': 'Use Custom Model...',
    'translate.testing': 'Testing...',
    'translate.testConnection': 'Test Connection',
    'translate.saveConfig': 'Save Configuration',
    'translate.configStatus': 'Current Configuration',
    'translate.provider': 'Provider',
    'translate.url': 'API URL',
    'translate.model': 'Model',
    'translate.apiKeySet': 'Set',
    'translate.notSet': 'Not Set',
    'translate.setupGuide': 'Setup Guide',
    'translate.saveSuccess': 'Configuration saved successfully!',
    'translate.connectionSuccess': 'Connection successful! Translation test passed',
    'translate.connectionFailed': 'Connection failed',
    'translate.exampleModel': 'For example',

    // Language options
    'lang.auto': 'Auto Detect',
    'lang.chinese': '中文',
    'lang.english': 'English',

    // Extension info
    'about.title': 'GLM Translator',
    'about.subtitle': 'Simple and Efficient AI Translation Extension',
    'about.aiServices': 'Multiple AI Translation Services',
    'about.sensitiveHandling': 'Smart Sensitive Content Handling',
    'about.shortcuts': 'Hotkeys and Selection Translation',
    'about.interface': 'Simple and Modern Interface Design',
    'about.copyright': '© 2025 GLM Translator. Making translation simpler, making reading borderless.',

    // Provider related
    'provider.showAll': 'Show All Providers',
    'provider.showRecommended': 'Show Recommended Providers',
    'provider.customApi': 'Custom API',
    'provider.customApiDesc': 'Configure custom translation API compatible with OpenAI format',
    'provider.config': 'Config',
    'provider.selected': 'Selected',
    'provider.notConfigured': 'Not Configured',
    'provider.configured': 'Configured',
    'provider.apiUrlDesc': 'Enter OpenAI-compatible API URL',
    'provider.modelPlaceholder': 'Enter model name, e.g.: gpt-3.5-turbo',
    'provider.modelDesc': 'Enter the model name you want to use',
    'provider.customModelNamePlaceholder': 'Enter custom model name',
    'provider.currentModel': 'Current model: {model}',
    'provider.testing': 'Testing...',
    'provider.testBtn': 'Test Connection',
    'provider.saveConfig': 'Save Configuration',
    'provider.configStatus': 'Current Configuration',
    'provider.provider': 'Provider:',
    'provider.url': 'API URL:',
    'provider.model': 'Model:',
    'provider.apiKey': 'API Key:',
    'provider.apiKeySet': 'Set',
    'provider.notSet': 'Not Set',
    'provider.setupGuide': 'Setup Guide',
    'provider.setupGuide.glm.step1': 'Visit https://open.bigmodel.cn/',
    'provider.setupGuide.glm.step2': 'Register and login to your account',
    'provider.setupGuide.glm.step3': 'Create an API Key in the console',
    'provider.setupGuide.glm.step4': 'Copy API Key to configuration',
    'provider.setupGuide.volcengine.step1': 'Visit https://console.volcengine.com/ark',
    'provider.setupGuide.volcengine.step2': 'Create an inference endpoint',
    'provider.setupGuide.volcengine.step3': 'Get endpoint URL and API Key',
    'provider.setupGuide.volcengine.step4': 'Configure in the extension',
    'provider.setupGuide.siliconflow.step1': 'Visit https://siliconflow.cn/',
    'provider.setupGuide.siliconflow.step2': 'Register and login to your account',
    'provider.setupGuide.siliconflow.step3': 'Create a key in API management',
    'provider.setupGuide.siliconflow.step4': 'Copy API Key to configuration',
    'provider.setupGuide.hunyuan.step1': 'Visit https://console.cloud.tencent.com/hunyuan',
    'provider.setupGuide.hunyuan.step2': 'Enable Hunyuan service',
    'provider.setupGuide.hunyuan.step3': 'Create API credentials',
    'provider.setupGuide.hunyuan.step4': 'Configure in the extension',
    'provider.setupGuide.tongyi.step1': 'Visit https://bailian.console.aliyun.com/',
    'provider.setupGuide.tongyi.step2': 'Enable Qwen service',
    'provider.setupGuide.tongyi.step3': 'Create an API Key',
    'provider.setupGuide.tongyi.step4': 'Configure in the extension',
    'provider.setupGuide.deepseek.step1': 'Visit https://platform.deepseek.com/',
    'provider.setupGuide.deepseek.step2': 'Register and login to your account',
    'provider.setupGuide.deepseek.step3': 'Create a key in API Keys',
    'provider.setupGuide.deepseek.step4': 'Copy API Key to configuration',
    'provider.setupGuide.custom.step1': 'Prepare OpenAI-compatible API service',
    'provider.setupGuide.custom.step2': 'Get API URL and credentials',
    'provider.setupGuide.custom.step3': 'Configure API URL and model name below',
    'provider.setupGuide.custom.step4': 'Test connection to ensure correct configuration',
    'provider.saveSuccess': 'Configuration saved successfully!',
    'provider.enterApiKey': 'Please enter complete API Key',
    'provider.enterCustomConfig': 'Please complete custom API configuration',
    'provider.enterCustomModel': 'Please enter custom model name',
    'provider.connectionSuccess': 'Connection successful! Translation test passed',
    'provider.connectionFailed': 'Connection failed: {error}',
    'provider.exampleModel': 'Example: {examples}',
    'provider.modelExample': 'Please enter complete model name',
    'provider.name.glm': 'Zhipu GLM',
    'provider.name.volcengine': 'Volcengine',
    'provider.name.siliconflow': 'SiliconFlow',
    'provider.name.hunyuan': 'Tencent Hunyuan',
    'provider.name.tongyi': 'Alibaba Tongyi',
    'provider.name.deepseek': 'DeepSeek',
    'provider.name.custom': 'Custom API',
    'provider.desc.glm': 'AI-powered intelligent translation service supporting multiple models',
    'provider.desc.volcengine': 'ByteDance\'s AI translation service',
    'provider.desc.siliconflow': 'Open-source model-based AI translation service',
    'provider.desc.hunyuan': 'Tencent Cloud\'s AI translation service',
    'provider.desc.tongyi': 'Alibaba Cloud\'s Qwen translation service',
    'provider.desc.deepseek': 'DeepSeek\'s AI translation service',
    'provider.desc.custom': 'Configure custom translation API compatible with OpenAI format',
    'provider.pricing.free': 'Free quota + Pay-per-use',
    'provider.pricing.volume': 'Pay-per-use',
    'provider.pricing.freeVolume': 'Free quota + discounted pricing',
    'provider.pricing.freeLite': 'Free Lite version',
    'provider.pricing.discount': 'Discounted pricing',
    'provider.pricing.custom': 'Varies by provider',
    'provider.feature.highQuality': 'High quality translation',
    'provider.feature.multiLang': 'Multi-language support',
    'provider.feature.fastResponse': 'Fast response',
    'provider.feature.doubao': 'Doubao models',
    'provider.feature.longText': 'Long text support',
    'provider.feature.highConcurrency': 'High concurrency',
    'provider.feature.openSource': 'Open source models',
    'provider.feature.priceAdvantage': 'Competitive pricing',
    'provider.feature.modelChoice': 'Multiple model choices',
    'provider.feature.freeQuota': 'Free quota',
    'provider.feature.tencentCloud': 'Tencent Cloud service',
    'provider.feature.reliable': 'Reliable and stable',
    'provider.feature.qwen': 'Qwen models',
    'provider.feature.aliyun': 'Alibaba Cloud service',
    'provider.feature.multiModel': 'Multi-model support',
    'provider.feature.costEffective': 'Cost-effective',
    'provider.feature.professional': 'Professional models',
    'provider.feature.safe': 'Safe and reliable',
    'provider.feature.customConfig': 'Custom configuration',
    'provider.feature.flexible': 'Flexible integration',
    'provider.feature.openaiCompatible': 'OpenAI-compatible format',

    // Popup related
    'popup.switchLanguages': 'Switch Languages',
    'popup.settings': 'Settings',
    'popup.inputPlaceholder': 'Enter text to translate...',
    'popup.emptyResult': 'Translation will appear here',
    'popup.copyTranslation': 'Copy Translation',
    'popup.translating': 'Translating...',
    'popup.copySuccess': 'Copied!',
    'popup.translationFailed': 'Translation Failed',
    'popup.translationFailedUnknown': 'Translation failed: Unknown error',
    'popup.contentError': 'Translation service encountered an issue. Please try modifying the text content and translate again.',
    'popup.unknownError': 'Unknown error',
  }
};

// 当前语言
let currentLanguage = 'zh';

// 初始化语言设置
export const initLanguage = async () => {
  try {
    const result = await chrome.storage.sync.get(['interfaceLanguage']);
    if (result.interfaceLanguage) {
      currentLanguage = result.interfaceLanguage;
    } else {
      // 默认使用中文
      currentLanguage = 'zh';
      await chrome.storage.sync.set({ interfaceLanguage: 'zh' });
    }
  } catch (error) {
    console.error('Failed to initialize language:', error);
    currentLanguage = 'zh';
  }
};

// 获取当前语言
export const getCurrentLanguage = async () => {
  try {
    const result = await chrome.storage.sync.get(['interfaceLanguage']);
    return result.interfaceLanguage || 'zh';
  } catch (error) {
    console.error('Failed to get current language:', error);
    return 'zh';
  }
};

// 设置语言
export const setLanguage = async (lang) => {
  try {
    currentLanguage = lang;
    await chrome.storage.sync.set({ interfaceLanguage: lang });
    console.log('Language set to:', lang);
  } catch (error) {
    console.error('Failed to set language:', error);
  }
};

// 翻译函数
export const t = (key, params = {}) => {
  const lang = currentLanguage;
  const translation = translations[lang] || translations.zh;
  let text = translation[key] || translations.zh[key] || key;

  // 参数替换
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`{${param}}`, 'g'), value);
  }

  return text;
};

// 获取语言显示名称
export const getLanguageDisplayName = (code) => {
  const displayNames = {
    'zh': '中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
    'fr': 'Français',
    'de': 'Deutsch',
    'es': 'Español',
    'ru': 'Русский',
    'ar': 'العربية',
    'th': 'ไทย',
    'auto': '自动检测',
  };

  return displayNames[code] || code;
};

// 监听语言变化
export const setupLanguageListener = (callback) => {
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.interfaceLanguage) {
        const newLang = changes.interfaceLanguage.newValue;
        currentLanguage = newLang;
        console.log('Language changed to:', newLang);
        if (callback && typeof callback === 'function') {
          callback(newLang);
        }
      }
    });
  }
};

// 默认导出所有函数
export default {
  initLanguage,
  getCurrentLanguage,
  setLanguage,
  t,
  getLanguageDisplayName,
  setupLanguageListener,
  translations,
};
