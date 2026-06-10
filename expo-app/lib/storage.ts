/**
 * Storage abstraction using @react-native-async-storage/async-storage.
 * Exposes a getMany/setMany API rather than the legacy multiGet/multiSet.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Single-item ops ───────────────────────────────────────────────────────────────────────────────

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ── Multi-item ops (getMany / setMany — v3-style API) ───────────────────────────────────────────

/**
 * Read multiple keys in parallel. Returns a Record of key → parsed value | null.
 */
export async function getMany<T = unknown>(
  keys: string[]
): Promise<Record<string, T | null>> {
  const results = await Promise.all(keys.map((k) => getItem<T>(k)));
  return Object.fromEntries(keys.map((k, i) => [k, results[i] ?? null]));
}

/**
 * Write multiple key/value pairs in parallel.
 */
export async function setMany<T = unknown>(
  entries: Record<string, T>
): Promise<void> {
  await Promise.all(
    Object.entries(entries).map(([k, v]) => setItem(k, v))
  );
}

/**
 * Remove multiple keys in parallel.
 */
export async function removeMany(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => removeItem(k)));
}

// ── Typed settings helpers ───────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SETTINGS: 'overlay_lang:settings',
  HISTORY: 'overlay_lang:history',
  HISTORY_CURSOR: 'overlay_lang:history_cursor',
} as const;
