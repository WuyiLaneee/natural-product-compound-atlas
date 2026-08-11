export interface BrowserCacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserCacheEnvelope<T> {
  schemaVersion: string;
  savedAt: number;
  expiresAt: number;
  payload: T;
}

const memoryRecords = new Map<string, string>();

export const memoryBrowserCacheStorage: BrowserCacheStorage = {
  getItem(key) {
    return memoryRecords.get(key) ?? null;
  },
  setItem(key, value) {
    memoryRecords.set(key, value);
  },
  removeItem(key) {
    memoryRecords.delete(key);
  },
};

/**
 * Returns localStorage when it is readable, otherwise the module-level memory
 * cache. Access is guarded because privacy settings and sandboxed frames can
 * expose localStorage while throwing on every operation.
 */
export function resolveBrowserCacheStorage(
  requested?: BrowserCacheStorage,
): BrowserCacheStorage {
  if (requested) return requested;

  try {
    const storage = globalThis.localStorage as BrowserCacheStorage | undefined;
    if (storage && typeof storage.getItem === "function") return storage;
  } catch {
    // Fall through to the in-memory cache.
  }

  return memoryBrowserCacheStorage;
}

function removeSafely(storage: BrowserCacheStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    memoryBrowserCacheStorage.removeItem(key);
  }
}

export function readBrowserCache<T>(options: {
  key: string;
  schemaVersion: string;
  storage?: BrowserCacheStorage;
  validatePayload: (payload: unknown) => payload is T;
}): BrowserCacheEnvelope<T> | null {
  const storage = resolveBrowserCacheStorage(options.storage);
  let raw: string | null = null;

  try {
    raw = storage.getItem(options.key);
  } catch {
    raw = memoryBrowserCacheStorage.getItem(options.key);
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<BrowserCacheEnvelope<unknown>>;
    const valid =
      parsed.schemaVersion === options.schemaVersion &&
      Number.isFinite(parsed.savedAt) &&
      Number.isFinite(parsed.expiresAt) &&
      typeof parsed.payload === "object" &&
      parsed.payload !== null &&
      options.validatePayload(parsed.payload);
    if (!valid) {
      removeSafely(storage, options.key);
      return null;
    }
    return parsed as BrowserCacheEnvelope<T>;
  } catch {
    removeSafely(storage, options.key);
    return null;
  }
}

export function writeBrowserCache<T>(options: {
  key: string;
  schemaVersion: string;
  payload: T;
  ttlMs: number;
  now?: number;
  storage?: BrowserCacheStorage;
}): BrowserCacheEnvelope<T> {
  const savedAt = options.now ?? Date.now();
  const envelope: BrowserCacheEnvelope<T> = {
    schemaVersion: options.schemaVersion,
    savedAt,
    expiresAt: savedAt + Math.max(0, options.ttlMs),
    payload: options.payload,
  };
  const serialized = JSON.stringify(envelope);
  const storage = resolveBrowserCacheStorage(options.storage);

  try {
    storage.setItem(options.key, serialized);
  } catch {
    memoryBrowserCacheStorage.setItem(options.key, serialized);
  }
  return envelope;
}

export function removeBrowserCache(
  key: string,
  storage?: BrowserCacheStorage,
): void {
  const resolved = resolveBrowserCacheStorage(storage);
  removeSafely(resolved, key);
  if (resolved !== memoryBrowserCacheStorage) {
    memoryBrowserCacheStorage.removeItem(key);
  }
}
