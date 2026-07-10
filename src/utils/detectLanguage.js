/**
 * Shared language detection (pure, no Chrome APIs).
 * Good-enough heuristic ID for extension UX — not NLP-grade.
 */

const HIRAGANA = /[\u3040-\u309F]/;
const KATAKANA = /[\u30A0-\u30FF\u31F0-\u31FF\uFF66-\uFF9F]/;
const HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF]/;
const CYRILLIC = /[\u0400-\u04FF]/;
const ARABIC = /[\u0600-\u06FF]/;
const THAI = /[\u0E00-\u0E7F]/;
const HEBREW = /[\u0590-\u05FF]/;
const DEVANAGARI = /[\u0900-\u097F]/;
const CJK_HAN = /[\u4E00-\u9FFF]/;
const LATIN = /[A-Za-z\u00C0-\u024F]/;

// Common traditional-only or traditional-heavy characters
const TRADITIONAL_MARKERS =
  /[繁體臺灣國語學習個們來時會過這還對開門關書長東見現點發說問題]/;

// Common simplified-only markers
const SIMPLIFIED_MARKERS =
  /[简体国语学习个们来时会过这还对开关书长东见现点发说问题]/;

/**
 * Count matches of a regex over text (global-safe).
 * @param {string} text
 * @param {RegExp} re
 */
function countMatches(text, re) {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const g = new RegExp(re.source, flags);
  let n = 0;
  // eslint-disable-next-line no-unused-vars
  while (g.exec(text) !== null) n++;
  return n;
}

/**
 * Detect language code from text.
 * @param {string} text
 * @returns {{ code: string, confidence: number }}
 */
export function detectLanguage(text) {
  if (!text || !String(text).trim()) {
    return { code: "unknown", confidence: 0 };
  }

  const sample = String(text).slice(0, 4000);
  const total = sample.length || 1;

  const hira = countMatches(sample, HIRAGANA);
  const kata = countMatches(sample, KATAKANA);
  const hangul = countMatches(sample, HANGUL);
  const cyr = countMatches(sample, CYRILLIC);
  const arab = countMatches(sample, ARABIC);
  const thai = countMatches(sample, THAI);
  const heb = countMatches(sample, HEBREW);
  const deva = countMatches(sample, DEVANAGARI);
  const han = countMatches(sample, CJK_HAN);
  const latin = countMatches(sample, LATIN);
  const jpKana = hira + kata;

  // Script-strong languages first
  if (hangul / total > 0.08 || hangul >= 3) {
    return { code: "ko", confidence: Math.min(0.98, 0.55 + hangul / total) };
  }
  if (jpKana / total > 0.02 || jpKana >= 2) {
    // Kana strongly indicates Japanese even with Han
    return { code: "ja", confidence: Math.min(0.97, 0.6 + jpKana / total) };
  }
  if (cyr / total > 0.08 || cyr >= 4) {
    return { code: "ru", confidence: Math.min(0.95, 0.55 + cyr / total) };
  }
  if (arab / total > 0.08 || arab >= 4) {
    return { code: "ar", confidence: Math.min(0.95, 0.55 + arab / total) };
  }
  if (thai / total > 0.08 || thai >= 4) {
    return { code: "th", confidence: Math.min(0.95, 0.55 + thai / total) };
  }
  if (heb / total > 0.08 || heb >= 4) {
    return { code: "he", confidence: Math.min(0.95, 0.55 + heb / total) };
  }
  if (deva / total > 0.08 || deva >= 4) {
    return { code: "hi", confidence: Math.min(0.93, 0.55 + deva / total) };
  }

  // CJK without kana → Chinese (prefer simplified/traditional heuristic)
  if (han / total > 0.05 || han >= 2) {
    const trad = countMatches(sample, TRADITIONAL_MARKERS);
    const simp = countMatches(sample, SIMPLIFIED_MARKERS);
    if (trad > simp + 1) {
      return { code: "zh-TW", confidence: Math.min(0.92, 0.5 + han / total) };
    }
    return { code: "zh", confidence: Math.min(0.94, 0.5 + han / total) };
  }

  // Latin-script: default English with light keyword hints for major languages
  if (latin / total > 0.2 || latin >= 8) {
    const lower = sample.toLowerCase();
    const scores = {
      en: 0,
      fr: 0,
      de: 0,
      es: 0,
      pt: 0,
      it: 0,
      nl: 0,
      vi: 0,
    };
    const hints = {
      en: [" the ", " and ", " of ", " to ", " is ", " in ", " that ", " for "],
      fr: [" le ", " la ", " les ", " des ", " une ", " et ", " est ", " dans "],
      de: [" der ", " die ", " und ", " das ", " ist ", " nicht ", " ein "],
      es: [" el ", " la ", " los ", " las ", " que ", " de ", " una ", " por "],
      pt: [" os ", " as ", " que ", " não ", " uma ", " para ", " com "],
      it: [" il ", " lo ", " la ", " che ", " non ", " una ", " per ", " con "],
      nl: [" de ", " het ", " een ", " van ", " en ", " niet ", " voor "],
      vi: [" và ", " của ", " là ", " không ", " những ", " được ", " trong "],
    };
    const padded = ` ${lower.replace(/\s+/g, " ")} `;
    for (const [lang, words] of Object.entries(hints)) {
      for (const w of words) {
        if (padded.includes(w)) scores[lang] += 1;
      }
    }
    let best = "en";
    let bestScore = scores.en;
    for (const [lang, sc] of Object.entries(scores)) {
      if (sc > bestScore) {
        best = lang;
        bestScore = sc;
      }
    }
    const conf =
      bestScore >= 2 ? Math.min(0.9, 0.45 + bestScore * 0.08) : 0.45;
    return { code: best, confidence: conf };
  }

  return { code: "en", confidence: 0.25 };
}

/**
 * Resolve effective source language when user selects "auto".
 * @param {string} text
 * @param {string} sourceLang
 * @returns {{ sourceLang: string, detected: string|null, confidence: number }}
 */
export function resolveSourceLanguage(text, sourceLang = "auto") {
  if (sourceLang && sourceLang !== "auto") {
    return {
      sourceLang,
      detected: null,
      confidence: 1,
    };
  }
  const { code, confidence } = detectLanguage(text);
  const resolved = code === "unknown" ? "en" : code;
  return {
    sourceLang: resolved,
    detected: resolved,
    confidence,
  };
}

/**
 * Map language code to BCP-47 for speechSynthesis.
 * @param {string} code
 * @returns {string}
 */
export function toSpeechLang(code) {
  if (!code || code === "auto") return "en-US";
  const map = {
    zh: "zh-CN",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    ru: "ru-RU",
    ar: "ar-SA",
    pt: "pt-PT",
    it: "it-IT",
    th: "th-TH",
    vi: "vi-VN",
    nl: "nl-NL",
    pl: "pl-PL",
    tr: "tr-TR",
    sv: "sv-SE",
    da: "da-DK",
    fi: "fi-FI",
    cs: "cs-CZ",
    hu: "hu-HU",
    he: "he-IL",
    hi: "hi-IN",
  };
  return map[code] || code;
}
