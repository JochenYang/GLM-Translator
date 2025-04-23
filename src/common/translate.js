export async function callCustomTranslate(
  text,
  sourceLang,
  targetLang,
  config
) {
  // 标准化语言代码
  const normalizedSourceLang = sourceLang.toLowerCase().split("-")[0];
  const normalizedTargetLang = targetLang.toLowerCase().split("-")[0];

  console.log("Translation request:", {
    text,
    sourceLang: normalizedSourceLang,
    targetLang: normalizedTargetLang,
    config,
  });

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        text,
        source_lang: normalizedSourceLang,
        target_lang: normalizedTargetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Translation response:", data);

    return data.translation || data.translated_text || data.result;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error(`翻译请求失败: ${error.message}`);
  }
}

export async function callGlmTranslate(text, sourceLang, targetLang, config) {
  const sourceLanguage = getLanguageName(sourceLang);
  const targetLanguage = getLanguageName(targetLang);

  const prompt = `请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n${text}`;

  try {
    // ... existing code ...
  } catch (error) {
    console.error("GLM translation error:", error);
    throw new Error(`GLM翻译请求失败: ${error.message}`);
  }
}
