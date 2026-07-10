/**
 * General / selection preferences helpers (pure where possible).
 */

export const DEFAULT_GENERAL = {
  sourceLang: "auto",
  targetLang: "zh",
  enableSelection: true,
  selectionTrigger: "icon",
  minSelectionLength: 1,
  domainBlacklist: [],
};

/**
 * Merge stored general settings with defaults.
 * @param {object} stored
 */
export function normalizeGeneralSettings(stored = {}) {
  const domainBlacklist = Array.isArray(stored.domainBlacklist)
    ? stored.domainBlacklist
    : typeof stored.domainBlacklist === "string"
      ? stored.domainBlacklist
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  let minSelectionLength = Number(stored.minSelectionLength);
  if (!Number.isFinite(minSelectionLength) || minSelectionLength < 1) {
    minSelectionLength = 1;
  }
  if (minSelectionLength > 500) minSelectionLength = 500;

  return {
    ...DEFAULT_GENERAL,
    ...stored,
    domainBlacklist,
    minSelectionLength,
    enableSelection: stored.enableSelection !== false,
    selectionTrigger:
      stored.selectionTrigger === "instant" ? "instant" : "icon",
    sourceLang: stored.sourceLang || "auto",
    targetLang: stored.targetLang || "zh",
  };
}
