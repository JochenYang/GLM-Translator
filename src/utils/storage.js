/**
 * 浏览器存储工具类
 */

// 获取存储数据
export function getStorage(keys, defaultValues = {}) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error("读取存储出错:", chrome.runtime.lastError);
      }

      // 处理默认值
      if (Array.isArray(keys)) {
        const values = {};
        keys.forEach((key) => {
          values[key] =
            result[key] !== undefined ? result[key] : defaultValues[key];
        });
        resolve(values);
      } else if (typeof keys === "string") {
        resolve(result[keys] !== undefined ? result[keys] : defaultValues);
      } else {
        resolve({ ...defaultValues, ...result });
      }
    });
  });
}

// 设置存储数据
export function setStorage(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 移除存储数据
export function removeStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 获取翻译历史记录
export async function getTranslationHistory(limit = 50) {
  const { translationHistory = [] } = await getStorage("translationHistory", {
    translationHistory: [],
  });
  return translationHistory.slice(0, limit);
}

// 添加翻译历史记录
export async function addTranslationHistory(item) {
  const { translationHistory = [] } = await getStorage("translationHistory", {
    translationHistory: [],
  });

  // 添加时间戳
  const historyItem = {
    ...item,
    timestamp: Date.now(),
  };

  // 去重处理：如果已存在相同原文的记录，则更新
  const existingIndex = translationHistory.findIndex(
    (record) => record.originalText === item.originalText
  );

  if (existingIndex !== -1) {
    translationHistory.splice(existingIndex, 1);
  }

  // 添加到历史记录首位
  translationHistory.unshift(historyItem);

  // 限制历史记录数量
  const MAX_HISTORY = 100;
  const newHistory = translationHistory.slice(0, MAX_HISTORY);

  await setStorage({ translationHistory: newHistory });
  return newHistory;
}

// 清空翻译历史记录
export async function clearTranslationHistory() {
  await setStorage({ translationHistory: [] });
  return [];
}
