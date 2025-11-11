/**
 * 预设翻译服务商配置
 * 包含主流AI翻译服务的完整配置信息
 */

export const PROVIDER_PRESETS = {
  glm: {
    id: 'glm',
    name: '智谱 GLM',
    description: 'AI驱动的智能翻译服务，支持多种模型',
    icon: '🤖',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: [
      { id: 'glm-4.5-flash', name: 'GLM-4.5-Flash (推荐)', description: '4.5版本快速模型' },
      { id: 'glm-4.5-air', name: 'GLM-4.5-Air', description: '4.5版本轻量模型' },
      { id: 'glm-4.5', name: 'GLM-4.5', description: '4.5版本标准模型' },
      { id: 'glm-4.6', name: 'GLM-4.6', description: '最新版本模型' }
    ],
    defaultModel: 'glm-4.5-flash',
    apiKeyUrl: 'https://open.bigmodel.cn/',
    apiKeyHelp: '访问智谱AI开放平台获取API Key',
    pricing: '免费额度 + 按量计费',
    features: ['高质量翻译', '多语言支持', '快速响应'],
    setupGuide: [
      '访问 https://open.bigmodel.cn/',
      '注册并登录账号',
      '在控制台创建API Key',
      '复制API Key到配置中'
    ]
  },

  volcengine: {
    id: 'volcengine',
    name: '火山引擎',
    description: '字节跳动旗下的AI翻译服务',
    icon: '🌋',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    models: [
      { id: 'doubao-1-5-pro-32k-250115', name: '豆包-1.5-Pro-32K (推荐)', description: '2025年最新32K模型' },
      { id: 'doubao-1-5-pro-256k-250115', name: '豆包-1.5-Pro-256K', description: '2025年最新256K长文本' }
    ],
    defaultModel: 'doubao-1-5-pro-32k-250115',
    apiKeyUrl: 'https://console.volcengine.com/ark',
    apiKeyHelp: '访问火山引擎控制台创建推理接入点',
    pricing: '按量计费',
    features: ['豆包模型', '长文本支持', '高并发'],
    setupGuide: [
      '访问 https://console.volcengine.com/ark',
      '创建推理接入点',
      '获取接入点URL和API Key',
      '配置到插件中'
    ]
  },

  siliconflow: {
    id: 'siliconflow',
    name: '硅基流动',
    description: '提供开源模型的AI翻译服务',
    icon: '💎',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    models: [
      { id: 'Qwen/Qwen3-8B', name: 'Qwen3-8B (推荐)', description: '通义千问最新模型' },
      { id: 'THUDM/GLM-Z1-9B-0414', name: 'GLM-Z1-9B-0414', description: '智谱最新9B参数模型' },
      { id: 'tencent/Hunyuan-MT-7B', name: 'Hunyuan-MT-7B', description: '腾讯混元翻译模型' },
      { id: 'internlm/internlm2_5-7b-chat', name: 'internlm2_5-7B-Chat', description: '上海AI实验室模型' }
    ],
    defaultModel: 'Qwen/Qwen3-8B',
    apiKeyUrl: 'https://siliconflow.cn/',
    apiKeyHelp: '访问硅基流动平台获取API Key',
    pricing: '免费额度 + 优惠价格',
    features: ['开源模型', '价格优惠', '多模型选择'],
    setupGuide: [
      '访问 https://siliconflow.cn/',
      '注册并登录账号',
      '在API管理中创建密钥',
      '复制API Key到配置中'
    ]
  },

  hunyuan: {
    id: 'hunyuan',
    name: '腾讯混元',
    description: '腾讯云的AI翻译服务',
    icon: '🐧',
    url: 'https://hunyuan.tencentcloudapi.com/v1/chat/completions',
    models: [
      { id: 'Hunyuan-MT-7B', name: 'Hunyuan-MT-7B (推荐)', description: '2025年最新翻译模型' },
      { id: 'Hunyuan-MT-Chimera-7B', name: 'Hunyuan-MT-Chimera-7B', description: '2025年最新混血版' }
    ],
    defaultModel: 'Hunyuan-MT-7B',
    apiKeyUrl: 'https://console.cloud.tencent.com/hunyuan',
    apiKeyHelp: '访问腾讯云控制台获取API Key',
    pricing: 'Lite版本免费',
    features: ['免费额度', '腾讯云服务', '稳定可靠'],
    setupGuide: [
      '访问 https://console.cloud.tencent.com/hunyuan',
      '开通混元服务',
      '创建API密钥',
      '配置到插件中'
    ]
  },

  tongyi: {
    id: 'tongyi',
    name: '阿里通义',
    description: '阿里云的通义千问翻译服务',
    icon: '☁️',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: [
      { id: 'qwen-mt-flash', name: 'Qwen-MT-Flash (推荐)', description: '2025年翻译快速模型' },
      { id: 'qwen-mt-turbo', name: 'Qwen-MT-Turbo', description: '2025年翻译高速模型' },
      { id: 'qwen-mt-plus', name: 'Qwen-MT-Plus', description: '2025年翻译高质量模型' },
      { id: 'qwen3-max', name: 'Qwen3-Max', description: 'Qwen3最高质量' },
      { id: 'qwen-plus-latest', name: 'Qwen-Plus-Latest', description: 'Qwen最新Plus版本' },
      { id: 'qwen-flash', name: 'Qwen-Flash', description: 'Qwen快速模型' }
    ],
    defaultModel: 'qwen-mt-flash',
    apiKeyUrl: 'https://bailian.console.aliyun.com/',
    apiKeyHelp: '访问阿里云百炼平台获取API Key',
    pricing: '按量计费',
    features: ['通义千问', '阿里云服务', '多模型支持'],
    setupGuide: [
      '访问 https://bailian.console.aliyun.com/',
      '开通通义千问服务',
      '创建API Key',
      '配置到插件中'
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek的AI翻译服务',
    icon: '🔍',
    url: 'https://api.deepseek.com/v1/chat/completions',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-Chat (推荐)', description: '对话模型' },
      { id: 'deepseek-coder', name: 'DeepSeek-Coder', description: '代码专用' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-Reasoner', description: '推理增强模型' }
    ],
    defaultModel: 'deepseek-reasoner',
    apiKeyUrl: 'https://platform.deepseek.com/',
    apiKeyHelp: '访问DeepSeek平台获取API Key',
    pricing: '优惠价格',
    features: ['高性价比', '专业模型', '快速响应'],
    setupGuide: [
      '访问 https://platform.deepseek.com/',
      '注册并登录账号',
      '在API Keys中创建密钥',
      '复制API Key到配置中'
    ]
  },

  custom: {
    id: 'custom',
    name: '自定义API',
    description: '配置兼容OpenAI格式的自定义翻译API',
    icon: '⚙️',
    url: '',
    models: [
      { id: 'custom-model', name: '自定义模型', description: '请在下方输入模型名称' }
    ],
    defaultModel: 'custom-model',
    apiKeyUrl: '',
    apiKeyHelp: '请输入您的自定义API地址和密钥',
    pricing: '根据服务商而定',
    features: ['自定义配置', '灵活接入', '兼容OpenAI格式'],
    setupGuide: [
      '准备兼容OpenAI格式的API服务',
      '获取API地址和密钥',
      '在下方配置API URL和模型名称',
      '测试连接确保配置正确'
    ],
    isCustom: true
  }
};

// 获取提供商配置
export function getProviderConfig(providerId) {
  return PROVIDER_PRESETS[providerId] || null;
}

// 获取所有提供商列表
export function getAllProviders() {
  return Object.values(PROVIDER_PRESETS);
}

// 获取推荐提供商（中国大陆用户友好）
export function getRecommendedProviders() {
  return [
    PROVIDER_PRESETS.glm,
    PROVIDER_PRESETS.volcengine,
    PROVIDER_PRESETS.siliconflow,
    PROVIDER_PRESETS.hunyuan,
    PROVIDER_PRESETS.tongyi,
    PROVIDER_PRESETS.deepseek
  ];
}

// 创建API配置模板
export function createApiConfig(providerId, apiKey, model = null) {
  const provider = getProviderConfig(providerId);
  if (!provider) {
    throw new Error(`未知的提供商: ${providerId}`);
  }

  return {
    id: `${providerId}_${Date.now()}`,
    name: provider.name,
    provider: providerId,
    url: provider.url,
    apiKey: apiKey,
    model: model || provider.defaultModel,
    headers: {},
    createdAt: Date.now(),
    lastUsed: null
  };
}