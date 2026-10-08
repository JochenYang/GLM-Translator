/**
 * 朗读工具（Web Speech API + 中文在线兜底）
 *
 * 策略：
 * 1. 优先使用系统高质量音色（Natural / Online / Neural），英文与 english_reboot 站点类似
 * 2. 中文若只有 Windows「慧慧 Desktop」等机械音，则自动走 Google 免费 TTS（更自然、免 Key）
 */

import { toSpeechLang, detectLanguage } from "./detectLanguage.js";

/** @type {SpeechSynthesisVoice[]|null} */
let cachedVoices = null;
let voicesHooked = false;

/** @type {HTMLAudioElement|null} */
let activeAudio = null;
/** @type {AbortController|null} */
let onlineAbort = null;

/**
 * 加载并缓存系统可用音色（Chrome 首次 getVoices 常为空，需监听 voiceschanged）
 * @param {SpeechSynthesis} synth
 * @returns {SpeechSynthesisVoice[]}
 */
export function loadVoices(synth) {
  if (!synth) return [];
  const list = synth.getVoices() || [];
  if (list.length) cachedVoices = list;

  if (!voicesHooked && typeof synth.addEventListener === "function") {
    voicesHooked = true;
    synth.addEventListener("voiceschanged", () => {
      cachedVoices = synth.getVoices() || [];
    });
  }
  if (typeof synth.onvoiceschanged !== "undefined" && !synth._glmVoiceHook) {
    synth._glmVoiceHook = true;
    const prev = synth.onvoiceschanged;
    synth.onvoiceschanged = function (...args) {
      cachedVoices = synth.getVoices() || [];
      if (typeof prev === "function") prev.apply(this, args);
    };
  }

  return cachedVoices || list || [];
}

/**
 * 判断是否为「听感较好」的系统音。
 * Windows 自带中文 Desktop（慧慧等）非常机械；Natural/Online 才接近自然。
 * @param {SpeechSynthesisVoice|null|undefined} voice
 */
export function isHighQualityVoice(voice) {
  if (!voice) return false;
  const name = (voice.name || "").toLowerCase();
  // 明确的机械本地音
  if (
    /desktop|huihui|hanhan|kangkang|yaoyao|heping|lili|nanshan|zhirui/.test(
      name
    )
  ) {
    return false;
  }
  // 高质量信号（现代神经网络或云端音色）
  if (
    /natural|neural|online|wavenet|journey|premium|enhanced|studio|multilingual/.test(
      name
    )
  ) {
    return true;
  }
  return false;
}

/**
 * 按目标语种给音色打分，分越高越好。
 * @param {SpeechSynthesisVoice} voice
 * @param {string} bcp47
 */
export function scoreVoice(voice, bcp47) {
  if (!voice) return -1;
  const want = (bcp47 || "en-US").toLowerCase().replace(/_/g, "-");
  const wantBase = want.split("-")[0];
  const vLang = (voice.lang || "").toLowerCase().replace(/_/g, "-");
  const vBase = vLang.split("-")[0];
  const name = (voice.name || "").toLowerCase();

  let score = 0;

  // 中文语族：zh / zh-CN / zh-TW / cmn
  const wantZh = wantBase === "zh" || wantBase === "cmn";
  const voiceZh = vBase === "zh" || vBase === "cmn";

  if (wantZh) {
    if (!voiceZh && !/chinese|中文|普通话|國語|国语|粤|粤语|cantonese/.test(name)) {
      return -1;
    }
    if (vLang === "zh-cn" || vLang === "zh" || vLang === "cmn-hans-cn") score += 100;
    else if (vLang === want) score += 100;
    else if (voiceZh) score += 80;
    else score += 60;
  } else {
    if (vLang === want) score += 100;
    else if (vLang.startsWith(wantBase + "-") || vBase === wantBase) score += 70;
    else return -1;
  }

  // 机械 Desktop 重罚（中文慧慧等）
  if (/desktop|huihui|hanhan|kangkang|yaoyao|heping/.test(name)) {
    score -= 90;
  }
  if (voice.localService && wantZh && !/natural|neural|online/.test(name)) {
    score -= 40;
  }

  if (/natural|neural|online \(natural\)|premium|enhanced|wavenet|journey|studio/.test(name)) {
    score += 50;
  }
  if (/online/.test(name)) score += 20;
  if (/microsoft/.test(name)) score += 15;
  if (/google/.test(name)) score += 22;

  if (/xiaoxiao|xiaoyi|yunxi|yunyang|yunjian|xiaohan|xiaomeng|晓晓|晓伊|云希|云扬|云健/.test(name)) {
    score += 30;
  }
  if (/aria|guy|jenny|ryan|sonia|natasha|davis|amber|samantha/.test(name) && wantBase === "en") {
    score += 12;
  }

  if (voice.default) score += 2;
  return score;
}

/**
 * 选出最匹配的系统音色及得分。
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} langCode
 * @param {string} [voiceURI]
 * @returns {{ voice: SpeechSynthesisVoice|null, score: number }}
 */
export function pickBestVoiceDetailed(voices, langCode, voiceURI = "") {
  const list = voices || [];
  if (!list.length) return { voice: null, score: -1 };

  if (voiceURI) {
    const preferred = list.find((v) => v.voiceURI === voiceURI);
    if (preferred) return { voice: preferred, score: 999 };
  }

  const bcp47 = toSpeechLang(langCode || "en") || "en-US";
  let best = null;
  let bestScore = -1;
  for (const v of list) {
    const s = scoreVoice(v, bcp47);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return { voice: best, score: bestScore };
}

export function pickBestVoice(voices, langCode, voiceURI = "") {
  return pickBestVoiceDetailed(voices, langCode, voiceURI).voice;
}

/**
 * 解析实际朗读语种：结合用户指定 + 正文检测。
 * 译文若是中文，即使用户目标语设错，也按中文选音。
 * @param {string} text
 * @param {string} [langOpt]
 */
export function resolveSpeakLang(text, langOpt) {
  if (langOpt && langOpt !== "auto") {
    const base = String(langOpt).toLowerCase().split("-")[0];
    // 若声明中文，直接用
    if (base === "zh") return toSpeechLang(langOpt);
  }
  // 根据正文检测（中文译文很常见）
  try {
    const { code } = detectLanguage(text);
    if (code && code !== "unknown") return toSpeechLang(code);
  } catch (_) {
    /* ignore */
  }
  return langOpt ? toSpeechLang(langOpt) : "zh-CN";
}

/**
 * 将长文本按标点拆成短句，适配在线 TTS 单次长度限制。
 * @param {string} text
 * @param {number} [maxLen=160]
 * @returns {string[]}
 */
export function splitTtsChunks(text, maxLen = 160) {
  const s = String(text || "").trim();
  if (!s) return [];
  if (s.length <= maxLen) return [s];

  const parts = [];
  let buf = "";
  const push = () => {
    const t = buf.trim();
    if (t) parts.push(t);
    buf = "";
  };

  for (const ch of s) {
    buf += ch;
    const atBreak = /[。！？.!?\n；;]/.test(ch);
    if (buf.length >= maxLen || (atBreak && buf.length >= Math.floor(maxLen * 0.4))) {
      push();
    }
  }
  push();

  // 兜底硬切
  const out = [];
  for (const p of parts) {
    if (p.length <= maxLen) out.push(p);
    else {
      for (let i = 0; i < p.length; i += maxLen) out.push(p.slice(i, i + maxLen));
    }
  }
  return out;
}

/**
 * 判断是否属于短词/短语（适合有道真人词典发音）：
 * - 单个英文单词或短语（1~4 个词），无句末终止标点，长度 <= 40
 * - 中文词汇（1~6 字），无空白符
 */
export function isShortWordOrPhrase(text, bcp47 = "en") {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return false;
  if (/[.!?…？。！\n;；:：]/.test(t)) return false;
  const langBase = (bcp47 || "").toLowerCase().split("-")[0];
  if (langBase === "en") {
    const words = t.replace(/[“”‘’"']/g, " ").split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 4;
  }
  if (langBase === "zh" || langBase === "cmn") {
    return t.length >= 1 && t.length <= 6 && !/\s/.test(t);
  }
  if (langBase === "ja" || langBase === "ko") {
    return t.length >= 1 && t.length <= 10 && !/\s/.test(t);
  }
  return false;
}

/**
 * 构造有道真人发音地址（短词/短语真人原声，支持英音/美音）
 * @param {string} text
 * @param {string} bcp47
 * @param {'us'|'uk'} [accent='us']
 */
export function buildYoudaoVoiceUrl(text, bcp47 = "en", accent = "us") {
  const cleaned = String(text || "").trim().replace(/[.!?…,;:]+$/g, "");
  const audio = encodeURIComponent(cleaned);
  const langBase = (bcp47 || "").toLowerCase().split("-")[0];
  if (langBase === "en") {
    const type = accent === "uk" ? 1 : 2;
    return `https://dict.youdao.com/dictvoice?audio=${audio}&type=${type}`;
  }
  const leMap = {
    zh: "zh",
    cmn: "zh",
    ja: "jap",
    ko: "ko",
    fr: "fr",
    de: "de",
    es: "es",
    ru: "ru",
  };
  const le = leMap[langBase] || langBase;
  return `https://dict.youdao.com/dictvoice?audio=${audio}&le=${encodeURIComponent(le)}`;
}

/**
 * 本地音色是否过差（如系统仅有机械音 Desktop），需要走在线 TTS。
 * @param {SpeechSynthesisVoice|null} voice
 * @param {number} score
 * @param {string} bcp47
 */
export function shouldUseOnlineTts(voice, score, bcp47) {
  if (!voice) return true;
  // 本地明确为 Desktop 机械音（慧慧、David、Zira 等），优先走在线自然发音
  if (!isHighQualityVoice(voice)) return true;
  if (score < 50) return true;
  return false;
}

/**
 * 构造 Google 免费朗读地址（短文本）。
 * @param {string} text
 * @param {string} bcp47
 */
export function buildGoogleTtsUrl(text, bcp47) {
  const tl = (bcp47 || "zh-CN").replace("_", "-");
  return (
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=" +
    encodeURIComponent(text) +
    "&tl=" +
    encodeURIComponent(tl)
  );
}

/**
 * 供设置页展示：当前语种将使用哪种朗读引擎。
 * @param {string} langCode - 如 zh / en
 * @returns {{ mode: 'local'|'online', voiceName: string, detail: string }}
 */
export function describeSpeakEngine(langCode = "zh", voiceMode = "online") {
  const bcp47 = toSpeechLang(langCode) || "zh-CN";
  if (voiceMode === "online") {
    return {
      mode: "online",
      voiceName: "高质自然音（短词真人原声 / 在线高质发音）",
      detail: "优先使用母语播音员真人原声与在线高质发音，彻底告别机械合成音。",
    };
  }
  const synth =
    typeof window !== "undefined" && window.speechSynthesis
      ? window.speechSynthesis
      : null;
  const voices = synth ? loadVoices(synth) : [];
  const { voice, score } = pickBestVoiceDetailed(voices, bcp47);
  if (voiceMode === "local") {
    return {
      mode: "local",
      voiceName: voice?.name || "系统默认",
      detail: `强制使用本机 Web Speech 离线音色（${voice?.lang || bcp47}）。`,
    };
  }
  // auto 模式
  if (shouldUseOnlineTts(voice, score, bcp47)) {
    return {
      mode: "online",
      voiceName: "高质自然音（智能优选·在线自然发音）",
      detail:
        "本机未安装 Edge 专属 Neural 神经音，智能优选已自动切换为高质真人原声与在线音（与推荐模式发音一致）。",
    };
  }
  return {
    mode: "local",
    voiceName: voice?.name || "系统默认",
    detail: `使用本机高质量自然音色（${voice?.lang || bcp47}）。`,
  };
}

let currentSessionId = 0;
let localPlayTimer = null;
let currentEndCallback = null;

/** 停止本地与在线朗读 */
function stopAll(synth) {
  // 1. 会话自增，废黜所有之前异步任务的回调与重试
  currentSessionId += 1;

  // 2. 清除本地播放挂起的定时器
  if (localPlayTimer) {
    clearTimeout(localPlayTimer);
    localPlayTimer = null;
  }

  // 3. 触发结束回调并清理
  if (currentEndCallback) {
    const cb = currentEndCallback;
    currentEndCallback = null;
    try {
      cb();
    } catch (_) {
      /* ignore */
    }
  }

  // 4. 取消本地合成器并清空队列
  try {
    if (synth) {
      synth.cancel();
    }
  } catch (_) {
    /* ignore */
  }

  // 5. 中止网络请求
  if (onlineAbort) {
    try {
      onlineAbort.abort();
    } catch (_) {
      /* ignore */
    }
    onlineAbort = null;
  }

  // 6. 销毁当前 HTML5 Audio 实例，移除监听器以防止触发 onerror 二次播放
  if (activeAudio) {
    try {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.src = "";
    } catch (_) {
      /* ignore */
    }
    activeAudio = null;
  }
}

/** 外部显式停止朗读 */
export function stopSpeaking() {
  const synth =
    typeof window !== "undefined"
      ? window.speechSynthesis
      : typeof speechSynthesis !== "undefined"
        ? speechSynthesis
        : null;
  stopAll(synth);
}

/**
 * 在线朗读：优先短词真人原声，长句走高质自然音，经 background 代理避免 CSP 拦截。
 * @param {string} text
 * @param {string} bcp47
 * @param {object} [options]
 * @param {number} sessionId
 */
async function speakOnline(text, bcp47, options = {}, sessionId) {
  const chunks = splitTtsChunks(text, 160);
  if (!chunks.length) {
    if (sessionId === currentSessionId && typeof options.onEnd === "function") {
      options.onEnd();
    }
    return false;
  }

  onlineAbort = new AbortController();
  const { signal } = onlineAbort;

  for (const chunk of chunks) {
    if (signal.aborted || sessionId !== currentSessionId) {
      return false;
    }
    // 短词/词组优先有道真人原声；长句走 Google/在线自然音
    const isShort = isShortWordOrPhrase(chunk, bcp47);
    const primaryUrl = isShort
      ? buildYoudaoVoiceUrl(chunk, bcp47)
      : buildGoogleTtsUrl(chunk, bcp47);
    const fallbackUrl = isShort
      ? buildGoogleTtsUrl(chunk, bcp47)
      : buildYoudaoVoiceUrl(chunk, bcp47);

    let playUrl = primaryUrl;

    // 优先走扩展后台请求拉取为 dataUrl，彻底绕过页面 CSP/CORS 拦截
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        let resp = await chrome.runtime.sendMessage({
          action: "fetchTtsAudio",
          url: primaryUrl,
        });
        if (resp?.dataUrl) {
          playUrl = resp.dataUrl;
        } else if (fallbackUrl) {
          resp = await chrome.runtime.sendMessage({
            action: "fetchTtsAudio",
            url: fallbackUrl,
          });
          if (resp?.dataUrl) {
            playUrl = resp.dataUrl;
          }
        }
      }
    } catch (e) {
      console.warn("TTS 消息失败，尝试直接播放:", e);
    }

    if (signal.aborted || sessionId !== currentSessionId) {
      return false;
    }

    await new Promise((resolve, reject) => {
      const audio = new Audio(playUrl);
      activeAudio = audio;

      audio.onended = () => {
        audio.onended = null;
        audio.onerror = null;
        if (activeAudio === audio) activeAudio = null;
        resolve();
      };

      audio.onerror = () => {
        audio.onended = null;
        audio.onerror = null;
        if (activeAudio === audio) activeAudio = null;

        // 如果已被打断或会话已改变，直接静默退出，绝不重试与回退！
        if (signal.aborted || sessionId !== currentSessionId) {
          resolve();
          return;
        }

        if (playUrl !== primaryUrl && primaryUrl) {
          const a2 = new Audio(primaryUrl);
          activeAudio = a2;
          a2.onended = () => {
            a2.onended = null;
            a2.onerror = null;
            if (activeAudio === a2) activeAudio = null;
            resolve();
          };
          a2.onerror = () => {
            a2.onended = null;
            a2.onerror = null;
            if (activeAudio === a2) activeAudio = null;
            if (signal.aborted || sessionId !== currentSessionId) resolve();
            else reject(new Error("在线朗读失败"));
          };
          a2.play().catch((err) => {
            if (signal.aborted || sessionId !== currentSessionId) resolve();
            else reject(err);
          });
        } else {
          reject(new Error("在线朗读失败"));
        }
      };

      audio.play().catch((err) => {
        if (signal.aborted || sessionId !== currentSessionId) {
          resolve();
        } else {
          reject(err);
        }
      });
    });
  }

  if (sessionId === currentSessionId) {
    currentEndCallback = null;
    if (typeof options.onEnd === "function") {
      options.onEnd();
    }
  }
  return true;
}

/** 本机 speechSynthesis 朗读 */
function speakLocal(synth, content, bcp47, voice, rate, pitch, repeat, options = {}, sessionId) {
  let i = 0;
  const play = () => {
    if (sessionId !== currentSessionId) {
      return;
    }
    const u = new SpeechSynthesisUtterance(content);
    u.lang = bcp47;
    u.rate = rate;
    u.pitch = pitch;
    // 关键：显式绑定优质 voice（与 english_reboot 一致）
    if (voice) {
      u.voice = voice;
      if (voice.lang) u.lang = voice.lang;
    }
    u.onend = () => {
      if (sessionId !== currentSessionId) return;
      i += 1;
      if (i < repeat) {
        localPlayTimer = setTimeout(play, 450);
      } else {
        currentEndCallback = null;
        if (typeof options.onEnd === "function") options.onEnd();
      }
    };
    u.onerror = (err) => {
      if (sessionId !== currentSessionId) return;
      console.error("朗读失败:", err);
      currentEndCallback = null;
      if (typeof options.onError === "function") options.onError(err);
    };
    try {
      synth.speak(u);
    } catch (err) {
      if (sessionId !== currentSessionId) return;
      console.error("朗读失败:", err);
      currentEndCallback = null;
      if (typeof options.onError === "function") options.onError(err);
    }
  };
  localPlayTimer = setTimeout(play, 0);
  return true;
}

/**
 * 朗读文本（设置页预览 / 划词结果窗共用）。
 * @param {string} text
 * @param {{
 *   lang?: string,
 *   rate?: number,
 *   pitch?: number,
 *   voiceURI?: string,
 *   repeat?: number,
 *   voiceMode?: 'online'|'auto'|'local',
 *   forceOnline?: boolean,
 *   forceLocal?: boolean,
 *   onEnd?: () => void,
 *   onError?: (err: any) => void,
 *   onUnsupported?: (msg: string) => void
 * }} [options]
 * @returns {boolean}
 */
export function speakText(text, options = {}) {
  const content = text == null ? "" : String(text).trim();
  if (!content) return false;

  const synth =
    typeof window !== "undefined"
      ? window.speechSynthesis
      : typeof speechSynthesis !== "undefined"
        ? speechSynthesis
        : null;

  // 1. 彻底停止先前的朗读并分配全新的会话 ID
  stopAll(synth);
  const sessionId = currentSessionId;
  currentEndCallback = typeof options.onEnd === "function" ? options.onEnd : null;

  const bcp47 = resolveSpeakLang(content, options.lang);
  const rate =
    typeof options.rate === "number" && options.rate > 0
      ? options.rate
      : 0.85;
  const pitch =
    typeof options.pitch === "number" && options.pitch > 0
      ? options.pitch
      : 1;
  const repeat = Math.max(1, Math.min(5, Number(options.repeat) || 1));

  const voices = synth ? loadVoices(synth) : [];
  const { voice, score } = pickBestVoiceDetailed(
    voices,
    bcp47,
    options.voiceURI || ""
  );

  const mode = options.voiceMode || "online";
  const useOnline =
    options.forceOnline === true ||
    (options.forceLocal !== true &&
      mode !== "local" &&
      (mode === "online" || shouldUseOnlineTts(voice, score, bcp47)));

  if (useOnline) {
    // 优先真人词典原声与在线高质自然发音，听感地道丝滑
    speakOnline(content, bcp47, options, sessionId).catch((err) => {
      // 关键防呆：若会话已被更新或打断，绝不回退本地音，直接静默退出！
      if (sessionId !== currentSessionId) {
        return;
      }
      console.warn("在线朗读失败，回退本地音:", err);
      if (synth && typeof SpeechSynthesisUtterance !== "undefined") {
        speakLocal(synth, content, bcp47, voice, rate, pitch, repeat, options, sessionId);
      } else {
        currentEndCallback = null;
        if (typeof options.onError === "function") options.onError(err);
        if (typeof options.onUnsupported === "function") {
          options.onUnsupported("朗读失败，请稍后重试");
        }
      }
    });
    return true;
  }

  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    currentEndCallback = null;
    const msg =
      "你的浏览器不支持朗读功能。可以换 Chrome 或 Edge 试试。";
    if (typeof options.onUnsupported === "function") {
      options.onUnsupported(msg);
    } else if (typeof alert === "function") {
      alert(msg);
    }
    return false;
  }

  if (voices.length === 0) {
    localPlayTimer = setTimeout(() => {
      if (sessionId !== currentSessionId) return;
      loadVoices(synth);
      const again = pickBestVoiceDetailed(
        loadVoices(synth),
        bcp47,
        options.voiceURI || ""
      );
      if (shouldUseOnlineTts(again.voice, again.score, bcp47)) {
        speakOnline(content, bcp47, options, sessionId).catch(() => {
          if (sessionId !== currentSessionId) return;
          speakLocal(synth, content, bcp47, again.voice, rate, pitch, repeat, options, sessionId);
        });
      } else {
        speakLocal(synth, content, bcp47, again.voice, rate, pitch, repeat, options, sessionId);
      }
    }, 150);
    return true;
  }

  return speakLocal(synth, content, bcp47, voice, rate, pitch, repeat, options, sessionId);
}
