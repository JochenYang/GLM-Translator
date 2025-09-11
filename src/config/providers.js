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
      { id: 'glm-4-flash', name: 'GLM-4-Flash (推荐)', description: '速度快，成本低' },
      { id: 'glm-4-air', name: 'GLM-4-Air', description: '轻量级模型' },
      { id: 'glm-4-airx', name: 'GLM-4-AirX', description: '增强版轻量模型' },
      { id: 'glm-4', name: 'GLM-4', description: '平衡性能' },
      { id: 'glm-4-plus', name: 'GLM-4-Plus', description: '高质量模型' },
      { id: 'glm-4-long', name: 'GLM-4-Long', description: '长文本支持' },
      { id: 'glm-4v', name: 'GLM-4V', description: '多模态模型' },
      { id: 'glm-4.5-flash', name: 'GLM-4.5-Flash', description: '4.5版本快速模型' },
      { id: 'glm-4.5-air', name: 'GLM-4.5-Air', description: '4.5版本轻量模型' },
      { id: 'glm-4.5', name: 'GLM-4.5', description: '4.5版本标准模型' },
      { id: 'glm-4.5-plus', name: 'GLM-4.5-Plus', description: '4.5版本最高质量' }
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
      { id: 'doubao-lite-4k', name: '豆包-Lite-4K (推荐)', description: '轻量级模型' },
      { id: 'doubao-lite-32k', name: '豆包-Lite-32K', description: '长文本轻量版' },
      { id: 'doubao-pro-4k', name: '豆包-Pro-4K', description: '专业级模型' },
      { id: 'doubao-pro-32k', name: '豆包-Pro-32K', description: '长文本支持' },
      { id: 'doubao-pro-128k', name: '豆包-Pro-128K', description: '超长文本' },
      { id: 'doubao-pro-256k', name: '豆包-Pro-256K', description: '最长文本支持' }
    ],
    defaultModel: 'doubao-lite-4k',
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
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B (推荐)', description: '阿里通义千问模型' },
      { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen2.5-14B', description: '更强性能版本' },
      { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5-32B', description: '大参数版本' },
      { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama-3.1-8B', description: 'Meta开源模型' },
      { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama-3.1-70B', description: 'Meta大模型' },
      { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek-V2.5', description: 'DeepSeek最新模型' }
    ],
    defaultModel: 'Qwen/Qwen2.5-14B-Instruct',
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
      { id: 'hunyuan-lite', name: '混元-Lite (推荐)', description: '免费模型' },
      { id: 'hunyuan-standard', name: '混元-Standard', description: '标准模型' },
      { id: 'hunyuan-pro', name: '混元-Pro', description: '专业模型' },
      { id: 'hunyuan-turbo', name: '混元-Turbo', description: '高速模型' },
      { id: 'hunyuan-functioncall', name: '混元-FunctionCall', description: '函数调用专用' }
    ],
    defaultModel: 'hunyuan-lite',
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
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    models: [
      { id: 'qwen-turbo', name: 'Qwen-Turbo (推荐)', description: '快速响应' },
      { id: 'qwen-plus', name: 'Qwen-Plus', description: '平衡性能' },
      { id: 'qwen-max', name: 'Qwen-Max', description: '最高质量' },
      { id: 'qwen2.5-72b-instruct', name: 'Qwen2.5-72B-Instruct', description: '开源版本' },
      { id: 'qwen2.5-32b-instruct', name: 'Qwen2.5-32B-Instruct', description: '中等参数版本' },
      { id: 'qwen-long', name: 'Qwen-Long', description: '长文本模型' }
    ],
    defaultModel: 'qwen-turbo',
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
    defaultModel: 'deepseek-chat',
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

  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI的GPT翻译服务',
    icon: '🤖',
    url: 'https://api.openai.com/v1/chat/completions',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o-mini (推荐)', description: '高性价比最新模型' },
      { id: 'gpt-4o', name: 'GPT-4o', description: '最新旗舰模型' },
      { id: 'gpt-4-turbo', name: 'GPT-4-Turbo', description: '快速GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5-Turbo', description: '经典模型' }
    ],
    defaultModel: 'gpt-4o-mini',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyHelp: '访问OpenAI平台获取API Key',
    pricing: '按量计费',
    features: ['GPT模型', '高质量翻译', '全球服务'],
    setupGuide: [
      '访问 https://platform.openai.com/api-keys',
      '创建API Key',
      '复制API Key到配置中',
      '注意：需要海外网络环境'
    ]
  },

  claude: {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic的Claude翻译服务',
    icon: '🎭',
    url: 'https://api.anthropic.com/v1/messages',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude-4-Sonnet (推荐)', description: '最新一代平衡模型' },
      { id: 'claude-opus-4-20250514', name: 'Claude-4-Opus', description: '最新一代最高质量' },
      { id: 'claude-opus-4-1-20250805', name: 'Claude-4.1-Opus', description: '最强性能模型' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude-3.7-Sonnet', description: '3.x系列最新版' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude-3.5-Haiku', description: '快速响应模型' },
      { id: 'claude-3-haiku-20240307', name: 'Claude-3-Haiku', description: '经典快速模型' }
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    apiKeyUrl: 'https://console.anthropic.com/',
    apiKeyHelp: '访问Anthropic控制台获取API Key',
    pricing: '按量计费',
    features: ['Claude模型', '安全可靠', '长文本支持'],
    setupGuide: [
      '访问 https://console.anthropic.com/',
      '创建API Key',
      '复制API Key到配置中',
      '注意：需要海外网络环境'
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