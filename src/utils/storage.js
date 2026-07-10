/**
 * Browser storage utilities
 */

// 获取存储数据 (sync)
export function getStorage(keys, defaultValues = {}) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error("读取存储出错:", chrome.runtime.lastError);
      }

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

// 设置存储数据 (sync — non-secrets only)
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

// History lives in local storage (may contain private text)
export async function getTranslationHistory(limit = 50) {
  const { translationHistory = [] } = await chrome.storage.local.get(
    "translationHistory"
  );
  return translationHistory.slice(0, limit);
}

export async function addTranslationHistory(item) {
  const { translationHistory = [] } = await chrome.storage.local.get(
    "translationHistory"
  );

  const historyItem = {
    ...item,
    timestamp: Date.now(),
  };

  const existingIndex = translationHistory.findIndex(
    (record) => record.originalText === item.originalText
  );

  if (existingIndex !== -1) {
    translationHistory.splice(existingIndex, 1);
  }

  translationHistory.unshift(historyItem);

  const MAX_HISTORY = 100;
  const newHistory = translationHistory.slice(0, MAX_HISTORY);

  await chrome.storage.local.set({ translationHistory: newHistory });
  return newHistory;
}

export async function clearTranslationHistory() {
  await chrome.storage.local.set({ translationHistory: [] });
  return [];
}
