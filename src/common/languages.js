// 简化语言列表
export const allLanguages = {
  detect: "自动检测",
  ar: "阿拉伯语",
  pl: "波兰语",
  da: "丹麦语",
  de: "德语",
  ru: "俄语",
  fr: "法语",
  fi: "芬兰语",
  ko: "韩语",
  nl: "荷兰语",
  cs: "捷克语",
  pt: "葡萄牙语",
  ja: "日语",
  sv: "瑞典语",
  th: "泰语",
  tr: "土耳其语",
  es: "西班牙语",
  hu: "匈牙利语",
  en: "英语",
  it: "意大利语",
  vi: "越南语",
  zh: "中文（简体）",
  "zh-TW": "中文（繁体）",
};

// 获取特定服务商的语言列表 - 不再过滤语言
export const getLanguages = () => {
  return allLanguages;
};

/**
 * 获取语言名称
 * @param {string} code 语言代码
 * @param {string} provider 服务提供商
 * @returns {string} 语言名称
 */
export function getLanguageName(code, provider = "general") {
  if (!code) return "未知语言";

  // 处理自动检测
  if (code === "auto") return "自动检测";

  // 标准化语言代码
  const normalizedCode = code.toLowerCase().split("-")[0];

  // 根据提供商获取语言映射
  const languageMap =
    provider === "microsoft" ? microsoftLanguages : allLanguages;

  // 尝试获取完整语言代码的名称
  if (languageMap[code]) {
    return languageMap[code];
  }

  // 尝试获取标准化后的语言代码名称
  if (languageMap[normalizedCode]) {
    return languageMap[normalizedCode];
  }

  // 如果都找不到，返回原始代码
  return code;
}

/**
 * 检查语言代码是否有效
 * @param {string} code 语言代码
 * @param {string} provider 服务提供商
 * @returns {boolean} 是否有效
 */
export function isValidLanguage(code, provider = "general") {
  if (!code) return false;
  if (code === "auto") return true;

  const normalizedCode = code.toLowerCase().split("-")[0];
  const languageMap =
    provider === "microsoft" ? microsoftLanguages : allLanguages;

  return !!languageMap[code] || !!languageMap[normalizedCode];
}
