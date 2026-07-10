/**
 * HTML escaping and safe DOM render helpers (pure, no Chrome APIs).
 */

/**
 * Escape a string for safe insertion into HTML context.
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Apply text into an element using textContent only (never HTML).
 * @param {Element} el
 * @param {unknown} text
 */
export function setTextContentSafe(el, text) {
  if (!el) return;
  el.textContent = text == null ? "" : String(text);
}

/**
 * Create a div with className and text content (safe).
 * @param {string} className
 * @param {unknown} text
 * @param {Document} [doc=document]
 * @returns {HTMLDivElement}
 */
export function createTextDiv(className, text, doc = document) {
  const el = doc.createElement("div");
  if (className) el.className = className;
  setTextContentSafe(el, text);
  return el;
}
