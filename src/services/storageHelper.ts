// Safe localStorage helper for "Nur" Web Application
// Prevents app crashes from invalid JSON, quotas, or corrupted storage.

export const safeStorage = {
  getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`[safeStorage] Failed to read key "${key}":`, e);
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[safeStorage] Failed to save key "${key}":`, e);
      return false;
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeStorage] Failed to remove key "${key}":`, e);
    }
  },

  exportAllUserData(): string {
    if (typeof window === 'undefined') return '{}';
    const keys = [
      'nur_user_settings',
      'nur_user_bookmarks',
      'nur_last_read_quran',
      'nur_tasbeeh_history',
      'nur_custom_zikrs',
      'nur_prayer_notification_settings',
      'nur_onboarding_completed'
    ];
    const dump: Record<string, unknown> = {};
    for (const k of keys) {
      try {
        const val = window.localStorage.getItem(k);
        if (val) dump[k] = JSON.parse(val);
      } catch (_e) {}
    }
    return JSON.stringify(dump, null, 2);
  },

  importUserData(jsonString: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const data = JSON.parse(jsonString);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;

      const ALLOWED_KEYS = new Set([
        'nur_user_settings',
        'nur_user_bookmarks',
        'nur_last_read_quran',
        'nur_tasbeeh_history',
        'nur_custom_zikrs',
        'nur_prayer_notification_settings',
        'nur_onboarding_completed'
      ]);

      // Validate each key and shape
      for (const [k, v] of Object.entries(data)) {
        if (!ALLOWED_KEYS.has(k)) continue;

        // Basic schema checks
        if (k === 'nur_user_bookmarks' && !Array.isArray(v)) continue;
        if (k === 'nur_custom_zikrs' && !Array.isArray(v)) continue;
        if (k === 'nur_tasbeeh_history' && !Array.isArray(v)) continue;
        if (k === 'nur_user_settings' && (typeof v !== 'object' || v === null)) continue;
        if (k === 'nur_prayer_notification_settings' && (typeof v !== 'object' || v === null)) continue;

        window.localStorage.setItem(k, JSON.stringify(v));
      }
      return true;
    } catch (e) {
      console.warn('[safeStorage] Failed to import data:', e);
      return false;
    }
  },

  clearAllUserData(): void {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('nur_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
};
