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
  // 高质量信号
  if (
    /natural|neural|online|wavenet|journey|premium|enhanced|studio|multilingual/.test(
      name
    )
  ) {
    return true;
  }
  // Google 系统音一般比 MS Desktop 中文好一些
  if (/google/.test(name) && !/desktop/.test(name)) return true;
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
 * 本地音色是否过差，需要走在线 TTS。
 * 中文在 Chrome/Windows 上几乎总是只有慧慧 Desktop → 走在线。
 * @param {SpeechSynthesisVoice|null} voice
 * @param {number} score
 * @param {string} bcp47
 */
export function shouldUseOnlineTts(voice, score, bcp47) {
  const base = (bcp47 || "").toLowerCase().split("-")[0];
  if (base === "zh" || base === "cmn") {
    // 只有明确的高质量中文音才用本地
    return !isHighQualityVoice(voice);
  }
  // 其它语言：完全没有匹配音，或分数极低
  if (!voice || score < 50) return true;
  return false;
}

/**
 * 构造 Google 免费朗读地址（短文本）。
 * @param {string} text
 * @param {string} bcp47
 */
export function buildGoogleTtsUrl(text, bcp47) {
  const tl = (bcp47 || "zh-CN").replace("_", "-");
  // client=tw-ob 为常用免费端点
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
export function describeSpeakEngine(langCode = "zh") {
  const bcp47 = toSpeechLang(langCode) || "zh-CN";
  const synth =
    typeof window !== "undefined" && window.speechSynthesis
      ? window.speechSynthesis
      : null;
  const voices = synth ? loadVoices(synth) : [];
  const { voice, score } = pickBestVoiceDetailed(voices, bcp47);
  if (shouldUseOnlineTts(voice, score, bcp47)) {
    return {
      mode: "online",
      voiceName: "在线自然音（Google TTS 兜底）",
      detail:
        "系统未检测到高质量中文 Natural 音，将使用在线朗读，听感更自然。",
    };
  }
  return {
    mode: "local",
    voiceName: voice?.name || "系统默认",
    detail: `使用本机 Web Speech 音色（${voice?.lang || bcp47}）。`,
  };
}

/** 停止本地与在线朗读 */
function stopAll(synth) {
  try {
    if (synth) synth.cancel();
  } catch (_) {
    /* ignore */
  }
  if (onlineAbort) {
    try {
      onlineAbort.abort();
    } catch (_) {
      /* ignore */
    }
    onlineAbort = null;
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = "";
    } catch (_) {
      /* ignore */
    }
    activeAudio = null;
  }
}

/**
 * 在线朗读：经 background 拉取音频（绕过页面 CSP/CORS），再本地播放。
 * @param {string} text
 * @param {string} bcp47
 */
async function speakOnline(text, bcp47) {
  const chunks = splitTtsChunks(text, 160);
  if (!chunks.length) return false;

  onlineAbort = new AbortController();
  const { signal } = onlineAbort;

  for (const chunk of chunks) {
    if (signal.aborted) return false;
    const url = buildGoogleTtsUrl(chunk, bcp47);
    let playUrl = url;

    // 优先走扩展后台请求，避免网页 CSP 拦截
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        const resp = await chrome.runtime.sendMessage({
          action: "fetchTtsAudio",
          url,
        });
        if (resp?.dataUrl) {
          playUrl = resp.dataUrl;
        } else if (resp?.error) {
          console.warn("后台拉取 TTS 失败:", resp.error);
        }
      }
    } catch (e) {
      console.warn("TTS 消息失败，尝试直接播放:", e);
    }

    await new Promise((resolve, reject) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const audio = new Audio(playUrl);
      activeAudio = audio;
      audio.onended = () => resolve();
      audio.onerror = () => {
        // 再试一次直连
        if (playUrl !== url) {
          const a2 = new Audio(url);
          activeAudio = a2;
          a2.onended = () => resolve();
          a2.onerror = () => reject(new Error("在线朗读失败"));
          a2.play().catch(reject);
        } else {
          reject(new Error("在线朗读失败"));
        }
      };
      audio.play().catch(reject);
    });
  }
  return true;
}

/** 本机 speechSynthesis 朗读 */
function speakLocal(synth, content, bcp47, voice, rate, pitch, repeat) {
  let i = 0;
  const play = () => {
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
      i += 1;
      if (i < repeat) setTimeout(play, 450);
    };
    try {
      synth.speak(u);
    } catch (err) {
      console.error("朗读失败:", err);
    }
  };
  setTimeout(play, 0);
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
 *   forceOnline?: boolean,
 *   forceLocal?: boolean,
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

  stopAll(synth);

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

  const useOnline =
    options.forceOnline === true ||
    (options.forceLocal !== true &&
      shouldUseOnlineTts(voice, score, bcp47));

  if (useOnline) {
    // 在线中文 TTS：明显比慧慧 Desktop 自然
    speakOnline(content, bcp47).catch((err) => {
      console.warn("在线朗读失败，回退本地音:", err);
      if (synth && typeof SpeechSynthesisUtterance !== "undefined") {
        speakLocal(synth, content, bcp47, voice, rate, pitch, repeat);
      } else if (typeof options.onUnsupported === "function") {
        options.onUnsupported("朗读失败，请稍后重试");
      }
    });
    return true;
  }

  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
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
    setTimeout(() => {
      loadVoices(synth);
      const again = pickBestVoiceDetailed(
        loadVoices(synth),
        bcp47,
        options.voiceURI || ""
      );
      if (shouldUseOnlineTts(again.voice, again.score, bcp47)) {
        speakOnline(content, bcp47).catch(() =>
          speakLocal(synth, content, bcp47, again.voice, rate, pitch, repeat)
        );
      } else {
        speakLocal(synth, content, bcp47, again.voice, rate, pitch, repeat);
      }
    }, 150);
    return true;
  }

  return speakLocal(synth, content, bcp47, voice, rate, pitch, repeat);
}
