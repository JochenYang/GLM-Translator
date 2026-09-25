/**
 * Secure storage helpers: API keys / secrets live in chrome.storage.local only.
 * Non-secret prefs may stay in sync.
 */

const SECRETS_KEY = "apiSecrets"; // { [apiId]: { apiKey, headers? } }
const SAVED_APIS_META = "savedApis"; // non-secret metadata in sync
const SELECTED_API_ID = "selectedApiId";
const SELECTED_PROVIDER = "selectedProvider";
const MIGRATION_FLAG = "secretsMigratedV1";

const LEGACY_SYNC_KEYS = ["glmConfig", "customConfig", "volcengineConfig"];

/**
 * Strip secret fields from an API config for sync-safe storage.
 * @param {object} api
 * @returns {{ meta: object, secret: object }}
 */
export function splitApiSecrets(api) {
  if (!api || typeof api !== "object") {
    return { meta: api, secret: {} };
  }
  const { apiKey, key, appSecret, secret: legacySecret, headers, ...rest } = api;
  const secret = {};
  if (apiKey != null && apiKey !== "") secret.apiKey = apiKey;
  if (key != null && key !== "" && secret.apiKey == null) secret.apiKey = key;
  if (appSecret != null && appSecret !== "") secret.appSecret = appSecret;
  if (legacySecret != null && legacySecret !== "" && secret.appSecret == null) {
    secret.appSecret = legacySecret;
  }
  // Custom headers may contain Authorization — keep in local only
  if (headers && typeof headers === "object" && Object.keys(headers).length) {
    secret.headers = headers;
  }
  return {
    meta: { ...rest, hasApiKey: !!(secret.apiKey) },
    secret,
  };
}

/**
 * Merge meta + secret for runtime use.
 * @param {object} meta
 * @param {object} secret
 */
export function mergeApiSecrets(meta, secret = {}) {
  if (!meta) return meta;
  return {
    ...meta,
    apiKey: secret.apiKey || "",
    appSecret: secret.appSecret || "",
    headers: secret.headers || meta.headers || {},
  };
}

function hasSecretFields(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (obj.apiKey || obj.key) return true;
  if (obj.headers && typeof obj.headers === "object" && Object.keys(obj.headers).length) {
    return true;
  }
  return false;
}

/**
 * Pure migration transform (unit-testable, no Chrome APIs).
 * Moves secrets out of savedApis + legacy configs into a secrets map;
 * returns cleaned sync payloads without raw keys.
 *
 * @param {{ savedApis?: object[], legacyConfigs?: Record<string, object>, existingSecrets?: object }} input
 * @returns {{
 *   secrets: object,
 *   savedApis: object[],
 *   legacyConfigs: Record<string, object|null>,
 *   legacyKeysToRemove: string[],
 *   didMigrateSecrets: boolean
 * }}
 */
export function planSecretsMigration(input = {}) {
  const existingSecrets = { ...(input.existingSecrets || {}) };
  const secrets = { ...existingSecrets };
  let didMigrateSecrets = false;
  let idCounter = 0;

  const ensureId = (api) => {
    if (api.id) return api.id;
    idCounter += 1;
    const provider = api.provider || "migrated";
    return `${provider}_migrated_${idCounter}_${Date.now()}`;
  };

  const cleanedApis = (input.savedApis || []).map((api) => {
    if (!api || typeof api !== "object") return api;
    if (!hasSecretFields(api)) {
      // Still ensure id for mergeability
      if (!api.id) {
        return { ...api, id: ensureId(api) };
      }
      return api;
    }
    const id = ensureId(api);
    const withId = { ...api, id };
    const { meta, secret } = splitApiSecrets(withId);
    if (secret.apiKey || secret.headers) {
      secrets[id] = { ...(secrets[id] || {}), ...secret };
      didMigrateSecrets = true;
    }
    return { ...meta, id };
  });

  // Legacy single-provider configs (glmConfig / customConfig / volcengineConfig)
  const legacyConfigs = {};
  const legacyKeysToRemove = [];
  const legacyMap = input.legacyConfigs || {};

  for (const k of LEGACY_SYNC_KEYS) {
    const cfg = legacyMap[k];
    if (!cfg || typeof cfg !== "object") {
      legacyConfigs[k] = cfg ?? null;
      continue;
    }
    if (!hasSecretFields(cfg)) {
      legacyConfigs[k] = cfg;
      continue;
    }

    const providerGuess =
      k === "glmConfig"
        ? "glm"
        : k === "volcengineConfig"
          ? "volcengine"
          : "custom";
    const id = cfg.id || `legacy_${providerGuess}`;
    const withId = {
      ...cfg,
      id,
      provider: cfg.provider || providerGuess,
      name: cfg.name || providerGuess,
    };
    const { meta, secret } = splitApiSecrets(withId);
    if (secret.apiKey || secret.headers) {
      secrets[id] = { ...(secrets[id] || {}), ...secret };
      didMigrateSecrets = true;
    }

    // Promote into savedApis if not already present
    const already = cleanedApis.some(
      (a) => a && (a.id === id || a.provider === (meta.provider || providerGuess))
    );
    if (!already) {
      cleanedApis.push({ ...meta, id });
    }

    // Strip secrets from legacy sync entry (or null to remove)
    legacyConfigs[k] = Object.keys(meta).length ? meta : null;
    legacyKeysToRemove.push(k);
  }

  return {
    secrets,
    savedApis: cleanedApis,
    legacyConfigs,
    legacyKeysToRemove,
    didMigrateSecrets,
  };
}

/**
 * One-time migration: move apiKey out of sync into local secrets.
 * Idempotent via MIGRATION_FLAG, but re-runs strip if flag set yet secrets still in sync
 * is not required — flag means "migration pass completed".
 */
export async function migrateSecretsFromSync() {
  if (typeof chrome === "undefined" || !chrome.storage) return;

  const local = await chrome.storage.local.get([MIGRATION_FLAG, SECRETS_KEY]);
  if (local[MIGRATION_FLAG]) {
    // Still scrub if flag was set by older buggy migration that left keys behind
    await scrubRemainingSyncSecrets(local[SECRETS_KEY] || {});
    return;
  }

  const sync = await chrome.storage.sync.get([
    SAVED_APIS_META,
    ...LEGACY_SYNC_KEYS,
  ]);

  const legacyConfigs = {};
  for (const k of LEGACY_SYNC_KEYS) {
    legacyConfigs[k] = sync[k];
  }

  const plan = planSecretsMigration({
    savedApis: sync.savedApis || [],
    legacyConfigs,
    existingSecrets: local[SECRETS_KEY] || {},
  });

  await chrome.storage.local.set({
    [SECRETS_KEY]: plan.secrets,
    [MIGRATION_FLAG]: true,
  });

  const syncSet = { savedApis: plan.savedApis };
  for (const k of LEGACY_SYNC_KEYS) {
    if (plan.legacyConfigs[k] != null) {
      syncSet[k] = plan.legacyConfigs[k];
    }
  }
  await chrome.storage.sync.set(syncSet);

  // Remove legacy keys that we fully absorbed (optional: keep stripped meta)
  // Ensure no raw apiKey remains on any written object
  await scrubRemainingSyncSecrets(plan.secrets);
}

/**
 * Defensive scrub: any remaining apiKey/key on sync savedApis or legacy configs
 * is moved to local and stripped from sync.
 */
async function scrubRemainingSyncSecrets(existingSecrets) {
  if (typeof chrome === "undefined" || !chrome.storage) return;

  const sync = await chrome.storage.sync.get([
    SAVED_APIS_META,
    ...LEGACY_SYNC_KEYS,
  ]);
  const needs =
    (sync.savedApis || []).some((a) => hasSecretFields(a)) ||
    LEGACY_SYNC_KEYS.some((k) => hasSecretFields(sync[k]));

  if (!needs) return;

  const legacyConfigs = {};
  for (const k of LEGACY_SYNC_KEYS) {
    legacyConfigs[k] = sync[k];
  }

  const plan = planSecretsMigration({
    savedApis: sync.savedApis || [],
    legacyConfigs,
    existingSecrets: existingSecrets || {},
  });

  await chrome.storage.local.set({
    [SECRETS_KEY]: plan.secrets,
    [MIGRATION_FLAG]: true,
  });

  const syncSet = { savedApis: plan.savedApis };
  for (const k of LEGACY_SYNC_KEYS) {
    if (plan.legacyConfigs[k] != null) {
      syncSet[k] = plan.legacyConfigs[k];
    } else if (sync[k] !== undefined) {
      // clear stripped-empty legacy blob keys that held secrets
      await chrome.storage.sync.remove(k);
    }
  }
  await chrome.storage.sync.set(syncSet);
}

/**
 * Load full API configs (meta from sync + secrets from local).
 * @returns {Promise<{ savedApis: object[], selectedApiId: string|null, selectedProvider: string|null }>}
 */
export async function loadApiConfigs() {
  await migrateSecretsFromSync();
  const sync = await chrome.storage.sync.get([
    SAVED_APIS_META,
    SELECTED_API_ID,
    SELECTED_PROVIDER,
  ]);
  const local = await chrome.storage.local.get([SECRETS_KEY]);
  const secrets = local[SECRETS_KEY] || {};
  const savedApis = (sync.savedApis || []).map((meta) =>
    mergeApiSecrets(meta, secrets[meta.id] || {})
  );
  return {
    savedApis,
    selectedApiId: sync.selectedApiId || null,
    selectedProvider: sync.selectedProvider || null,
  };
}

/**
 * Persist API list: secrets → local, meta → sync.
 * @param {object[]} fullApis - configs including apiKey
 * @param {{ selectedApiId?: string|null, selectedProvider?: string|null }} selection
 */
export async function saveApiConfigs(fullApis, selection = {}) {
  const secrets = {};
  const metas = (fullApis || []).map((api) => {
    const id =
      api.id ||
      `${api.provider || "api"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const withId = { ...api, id };
    const { meta, secret } = splitApiSecrets(withId);
    secrets[id] = secret;
    return { ...meta, id };
  });

  const local = await chrome.storage.local.get([SECRETS_KEY]);
  const prev = local[SECRETS_KEY] || {};
  const nextSecrets = {};
  for (const id of Object.keys(secrets)) {
    nextSecrets[id] = { ...prev[id], ...secrets[id] };
  }

  await chrome.storage.local.set({
    [SECRETS_KEY]: nextSecrets,
    [MIGRATION_FLAG]: true,
  });

  const syncPayload = { savedApis: metas };
  if ("selectedApiId" in selection) {
    syncPayload.selectedApiId = selection.selectedApiId;
  }
  if ("selectedProvider" in selection) {
    syncPayload.selectedProvider = selection.selectedProvider;
  }
  await chrome.storage.sync.set(syncPayload);
}

/**
 * Get currently selected full API config or null.
 */
export async function getSelectedApiConfig() {
  const { savedApis, selectedApiId, selectedProvider } = await loadApiConfigs();
  if (selectedApiId) {
    const found = savedApis.find((a) => a.id === selectedApiId);
    if (found) return { provider: found.provider || "custom", config: found };
  }
  // 免 Key 提供商无需任何配置即可使用
  if (selectedProvider === "youdao" || selectedProvider === "microsoft") {
    return { provider: selectedProvider, config: { provider: selectedProvider } };
  }
  if (selectedProvider && savedApis.length) {
    const byProvider = savedApis.find((a) => a.provider === selectedProvider);
    if (byProvider) return { provider: byProvider.provider, config: byProvider };
  }
  if (savedApis[0]) {
    return { provider: savedApis[0].provider || "custom", config: savedApis[0] };
  }
  return {
    provider: selectedProvider || "youdao",
    config: null,
  };
}

/**
 * Resolve URL that may need optional host permission for the active config.
 * @param {{ provider: string, config: object|null }} api
 * @returns {string|null}
 */
export function resolveConfigUrl(api) {
  if (!api) return null;
  if (api.provider === "youdao" || api.provider === "microsoft") return null;
  const cfg = api.config;
  if (!cfg) return null;
  return cfg.url || cfg.apiUrl || null;
}

export { SECRETS_KEY, MIGRATION_FLAG, LEGACY_SYNC_KEYS };
