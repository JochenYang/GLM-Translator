/**
 * Domain blacklist matching for selection translate (pure).
 */

/**
 * Normalize a hostname (strip trailing dots, lower-case).
 * @param {string} host
 * @returns {string}
 */
export function normalizeHost(host) {
  if (!host) return "";
  return String(host).trim().toLowerCase().replace(/\.+$/, "");
}

/**
 * Check whether hostname matches a blacklist entry.
 * Entry may be exact host or leading-dot / bare domain for subdomain match.
 * Examples: "github.com", ".github.com", "www.github.com"
 *
 * @param {string} hostname - e.g. location.hostname
 * @param {string[]|string} blacklist
 * @returns {boolean}
 */
export function isDomainBlacklisted(hostname, blacklist) {
  const host = normalizeHost(hostname);
  if (!host) return false;

  let list = blacklist;
  if (typeof list === "string") {
    list = list
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(list) || list.length === 0) return false;

  for (const raw of list) {
    const entry = normalizeHost(raw);
    if (!entry) continue;

    // Leading dot: match domain and all subdomains
    if (entry.startsWith(".")) {
      const base = entry.slice(1);
      if (host === base || host.endsWith("." + base)) return true;
      continue;
    }

    if (host === entry) return true;
    // bare domain also matches subdomains (github.com → www.github.com)
    if (host.endsWith("." + entry)) return true;
  }

  return false;
}

/**
 * Parse user textarea input into a clean blacklist array.
 * @param {string} text
 * @returns {string[]}
 */
export function parseBlacklistInput(text) {
  if (!text) return [];
  return String(text)
    .split(/[\n,]/)
    .map((s) => normalizeHost(s))
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}
