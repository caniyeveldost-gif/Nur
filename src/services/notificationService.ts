import { LocalNotifications } from '@capacitor/local-notifications';
import { CityPrayerData } from '../types';
import { getBakuDateString, calculateLocalPrayerTimes } from './apiService';
import { isNativePlatform } from './capacitorBridge';

export interface PrayerNotificationSettings {
  enabled: boolean;
  fajr: boolean;
  maghrib: boolean;
  allPrayers: boolean;
  offsetMinutes: number; // 0 = exact time, 5 = 5 min before, 10 = 10 min before, 15 = 15 min before
  sound: boolean;
}

const STORAGE_KEY = 'nur_prayer_notification_settings';
const DEFAULT_SETTINGS: PrayerNotificationSettings = {
  enabled: true,
  fajr: true,
  maghrib: true,
  allPrayers: false,
  offsetMinutes: 0,
  sound: true,
};

let activeCheckInterval: number | null = null;
let activeTimeouts: number[] = [];
let nativePermissionState: 'granted' | 'denied' | 'default' = 'default';
const inFlightNotificationKeys = new Set<string>();
const SLEEP_TOLERANCE_MS = 15 * 60 * 1000; // 15 minutes tolerance after device sleep/tab suspend

if (typeof window !== 'undefined' && isNativePlatform()) {
  LocalNotifications.checkPermissions()
    .then((res) => {
      if (res.display === 'granted') nativePermissionState = 'granted';
      else if (res.display === 'denied') nativePermissionState = 'denied';
      else nativePermissionState = 'default';
    })
    .catch(() => {});
}

// Get saved notification settings
export function getPrayerNotificationSettings(): PrayerNotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    // Backward compatibility for old single boolean key
    const legacy = localStorage.getItem('nur_prayer_notifications');
    if (legacy !== null) {
      return { ...DEFAULT_SETTINGS, enabled: legacy === 'true' };
    }
  } catch (e) {
    console.warn('Failed to parse notification settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save notification settings
export function savePrayerNotificationSettings(settings: PrayerNotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem('nur_prayer_notifications', settings.enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save notification settings:', e);
  }
}

// Register Service Worker (Active in web production; skipped on native Android APK and in development)
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || isNativePlatform() || !('serviceWorker' in navigator)) {
    return null;
  }
  if (import.meta.env.DEV) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    } catch (_e) {}
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('ServiceWorker registration error:', err);
    return null;
  }
}

// Get notification permission status
export function getNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (isNativePlatform()) {
    return nativePermissionState;
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Request permission (supports Android 13+ POST_NOTIFICATIONS via Capacitor LocalNotifications and Web Notification API)
export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') {
        nativePermissionState = 'granted';
        return true;
      }
      const req = await LocalNotifications.requestPermissions();
      if (req.display === 'granted') {
        nativePermissionState = 'granted';
        return true;
      }
      nativePermissionState = req.display === 'denied' ? 'denied' : 'default';
      return false;
    } catch (err) {
      console.warn('Capacitor LocalNotifications permission error:', err);
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

// Play notification sound using Web Audio API
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn('Web Audio chime failed:', e);
  }
}

// Dispatch a notification using Capacitor LocalNotifications on Android, Service Worker on PWA, or Notification API
export async function dispatchNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        return false;
      }
      nativePermissionState = 'granted';
      const settings = getPrayerNotificationSettings();
      if (settings.sound) {
        playNotificationChime();
      }
      const numericId = Math.abs(
        tag.split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0)
      ) || Math.floor(Math.random() * 100000) + 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 200) },
          },
        ],
      });
      return true;
    } catch (nativeErr) {
      console.warn('Native LocalNotifications dispatch failed:', nativeErr);
      return false;
    }
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const settings = getPrayerNotificationSettings();
  if (settings.sound) {
    playNotificationChime();
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (_vErr) {}
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
  };

  // Try ServiceWorkerRegistration first (standard for PWA / mobile push)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch (swErr) {
    console.warn('ServiceWorker showNotification failed, trying standard Notification:', swErr);
  }

  // Fallback to standard Notification API
  try {
    new Notification(title, options);
    return true;
  } catch (notifErr) {
    console.warn('Standard Notification constructor failed:', notifErr);
    return false;
  }
}

// Send immediate test notification
export async function sendTestNotification(): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (!perm) return false;

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return await dispatchNotification(
    'Nur - Sınaq Bildirişi ✓',
    `Namaz vaxtı bildirişləri aktivdir (${timeStr}). Sübh və Məğrib vaxtlarında avtomatik xəbərdarlıq alacaqsınız.`,
    'test-notification-' + Date.now()
  );
}

// Convert "HH:mm" string to today's Date object
export function getPrayerTargetTime(timeStr: string, offsetMinutes: number = 0, isTomorrow: boolean = false): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  if (isTomorrow) {
    date.setDate(date.getDate() + 1);
  }
  date.setHours(hours, minutes, 0, 0);
  if (offsetMinutes > 0) {
    date.setMinutes(date.getMinutes() - offsetMinutes);
  }
  return date;
}

// Information for UI regarding next scheduled notification
export interface NextScheduledPrayerNotification {
  prayerKey: 'fajr' | 'maghrib' | 'dhuhr' | 'asr' | 'isha';
  prayerName: string;
  targetTimeStr: string;
  isTomorrow: boolean;
  remainingText: string;
  dateLabel: string;
}

export function getNextPrayerNotificationInfo(prayerData: CityPrayerData): NextScheduledPrayerNotification | null {
  const settings = getPrayerNotificationSettings();
  if (!settings.enabled) return null;

  const now = new Date();
  const candidates: {
    prayerKey: 'fajr' | 'maghrib' | 'dhuhr' | 'asr' | 'isha';
    prayerName: string;
    targetDate: Date;
    timeStr: string;
    isTomorrow: boolean;
  }[] = [];

  const prayersToCheck: { key: 'fajr' | 'maghrib' | 'dhuhr' | 'asr' | 'isha'; name: string; time: string; enabled: boolean }[] = [
    { key: 'fajr', name: 'Sübh', time: prayerData.timings.fajr, enabled: settings.fajr },
    { key: 'dhuhr', name: 'Zöhr', time: prayerData.timings.dhuhr, enabled: settings.allPrayers },
    { key: 'asr', name: 'Əsr', time: prayerData.timings.asr, enabled: settings.allPrayers },
    { key: 'maghrib', name: 'Məğrib (Şam / İftar)', time: prayerData.timings.maghrib, enabled: settings.maghrib },
    { key: 'isha', name: 'İşa (Xuftən)', time: prayerData.timings.isha, enabled: settings.allPrayers },
  ];

  for (const p of prayersToCheck) {
    if (!p.enabled) continue;

    const todayDate = getPrayerTargetTime(p.time, settings.offsetMinutes, false);
    if (todayDate.getTime() > now.getTime()) {
      candidates.push({
        prayerKey: p.key,
        prayerName: p.name,
        targetDate: todayDate,
        timeStr: p.time,
        isTomorrow: false,
      });
    } else {
      // Tomorrow's occurrence
      const tomorrowDate = getPrayerTargetTime(p.time, settings.offsetMinutes, true);
      candidates.push({
        prayerKey: p.key,
        prayerName: p.name,
        targetDate: tomorrowDate,
        timeStr: p.time,
        isTomorrow: true,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by earliest targetDate
  candidates.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  const next = candidates[0];

  const diffMs = next.targetDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  let remainingText = '';
  if (hours > 0) {
    remainingText = `${hours} saat ${mins > 0 ? `${mins} dəq` : ''} sonra`;
  } else {
    remainingText = `${Math.max(1, mins)} dəqiqə sonra`;
  }

  return {
    prayerKey: next.prayerKey,
    prayerName: next.prayerName,
    targetTimeStr: next.timeStr,
    isTomorrow: next.isTomorrow,
    remainingText,
    dateLabel: next.isTomorrow ? 'Sabah' : 'Bu gün',
  };
}

// Clear and cancel all scheduled prayer notifications
export function cancelDailyPrayerNotifications(): void {
  activeTimeouts.forEach((t) => clearTimeout(t));
  activeTimeouts = [];

  if (activeCheckInterval) {
    clearInterval(activeCheckInterval);
    activeCheckInterval = null;
  }

  if (isNativePlatform()) {
    LocalNotifications.getPending()
      .then((pending) => {
        const prayerIds = pending.notifications
          .filter((n) => n.id >= 7001 && n.id <= 7010)
          .map((n) => ({ id: n.id }));
        if (prayerIds.length > 0) {
          return LocalNotifications.cancel({ notifications: prayerIds });
        }
      })
      .catch(() => {});
  }
}

// Clean up notification idempotency records older than 7 days to prevent localStorage bloat
export function cleanOldNotificationHistory(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const now = Date.now();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nur_sent_prayer_')) {
        const val = localStorage.getItem(key);
        const timestamp = val ? parseInt(val, 10) : 0;
        if (!timestamp || isNaN(timestamp) || now - timestamp > maxAgeMs) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_e) {}
}

// Master scheduling function for daily notifications
export function scheduleDailyPrayerNotifications(prayerData: CityPrayerData): void {
  if (typeof window === 'undefined') return;

  // Clear existing timers and interval
  cancelDailyPrayerNotifications();

  // Prune expired idempotency history (older than 7 days)
  cleanOldNotificationHistory();

  const settings = getPrayerNotificationSettings();
  const hasPermission = isNativePlatform()
    ? nativePermissionState === 'granted'
    : typeof Notification !== 'undefined' && Notification.permission === 'granted';
  if (!settings.enabled || !hasPermission) {
    return;
  }

  // Ensure ServiceWorker is ready
  registerServiceWorker();

  const cityName = prayerData.cityName;
  const scheduledDateStr = prayerData.date || getBakuDateString(new Date());

  // Notification dispatch helper with rich idempotency check (city, date, prayer, time, method, madhab, offset)
  const triggerPrayerNotification = async (
    prayerKey: 'fajr' | 'maghrib' | 'dhuhr' | 'asr' | 'isha',
    prayerTime: string
  ): Promise<void> => {
    const todayStr = getBakuDateString(new Date());

    // Guard against date rollover: ensure prayerData belongs to today
    if (prayerData.date && prayerData.date !== todayStr) {
      return;
    }

    const cityKey = prayerData.cityKey || 'Baki';
    const method = prayerData.calculationMethod || 'MWL';
    const madhab = prayerData.madhab || 'shafi';
    const offset = settings.offsetMinutes || 0;
    const timeClean = prayerTime.replace(':', '');

    const sentKey = `nur_sent_prayer_${cityKey}_${todayStr}_${prayerKey}_${timeClean}_${method}_${madhab}_off${offset}`;

    if (inFlightNotificationKeys.has(sentKey)) {
      return;
    }

    try {
      if (localStorage.getItem(sentKey)) {
        return; // Already dispatched for this exact schedule
      }
    } catch (_e) {}

    let title = '';
    let body = '';

    if (prayerKey === 'fajr') {
      title = '🌅 Sübh Namazı Vaxtıdır';
      body = `${cityName} üçün Sübh namazının vaxtı daxil oldu (${prayerTime}). Namaz qılmaq yuxudan xeyirlidir!`;
    } else if (prayerKey === 'maghrib') {
      title = '🌇 Məğrib (Şam / İftar) Vaxtıdır';
      body = `${cityName} üçün Məğrib namazı və iftar vaxtı (${prayerTime}) daxil oldu. Allah ibadət və dualarınızı qəbul etsin!`;
    } else if (prayerKey === 'dhuhr') {
      title = '☀️ Zöhr Namazı Vaxtıdır';
      body = `${cityName} üçün Zöhr namazının vaxtı (${prayerTime}) daxil oldu.`;
    } else if (prayerKey === 'asr') {
      title = '🌤️ Əsr Namazı Vaxtıdır';
      body = `${cityName} üçün Əsr namazının vaxtı (${prayerTime}) daxil oldu.`;
    } else if (prayerKey === 'isha') {
      title = '🌙 İşa (Xuftən) Namazı Vaxtıdır';
      body = `${cityName} üçün İşa namazının vaxtı (${prayerTime}) daxil oldu.`;
    }

    const tag = `prayer-${cityKey}-${todayStr}-${prayerKey}-${timeClean}`;
    inFlightNotificationKeys.add(sentKey);
    try {
      const success = await dispatchNotification(title, body, tag);
      if (success) {
        try {
          localStorage.setItem(sentKey, Date.now().toString());
        } catch (_e) {}
      }
    } finally {
      inFlightNotificationKeys.delete(sentKey);
    }
  };

  // Schedule timeouts for upcoming prayers
  const prayersToSchedule = [
    { key: 'fajr' as const, time: prayerData.timings.fajr, enabled: settings.fajr },
    { key: 'maghrib' as const, time: prayerData.timings.maghrib, enabled: settings.maghrib },
    { key: 'dhuhr' as const, time: prayerData.timings.dhuhr, enabled: settings.allPrayers },
    { key: 'asr' as const, time: prayerData.timings.asr, enabled: settings.allPrayers },
    { key: 'isha' as const, time: prayerData.timings.isha, enabled: settings.allPrayers },
  ];

  const now = new Date();
  const nativeScheduleItems: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: boolean };
  }> = [];

  prayersToSchedule.forEach((item, idx) => {
    if (!item.enabled) return;

    const targetDate = getPrayerTargetTime(item.time, settings.offsetMinutes, false);
    const delay = targetDate.getTime() - now.getTime();

    if (isNativePlatform() && delay > 1000 && delay < 86400000) {
      let nTitle = '';
      let nBody = '';
      if (item.key === 'fajr') {
        nTitle = '🌅 Sübh Namazı Vaxtıdır';
        nBody = `${cityName} üçün Sübh namazının vaxtı daxil oldu (${item.time}). Namaz qılmaq yuxudan xeyirlidir!`;
      } else if (item.key === 'maghrib') {
        nTitle = '🌇 Məğrib (Şam / İftar) Vaxtıdır';
        nBody = `${cityName} üçün Məğrib namazı və iftar vaxtı (${item.time}) daxil oldu. Allah ibadət və dualarınızı qəbul etsin!`;
      } else if (item.key === 'dhuhr') {
        nTitle = '☀️ Zöhr Namazı Vaxtıdır';
        nBody = `${cityName} üçün Zöhr namazının vaxtı (${item.time}) daxil oldu.`;
      } else if (item.key === 'asr') {
        nTitle = '🌤️ Əsr Namazı Vaxtıdır';
        nBody = `${cityName} üçün Əsr namazının vaxtı (${item.time}) daxil oldu.`;
      } else if (item.key === 'isha') {
        nTitle = '🌙 İşa (Xuftən) Namazı Vaxtıdır';
        nBody = `${cityName} üçün İşa namazının vaxtı (${item.time}) daxil oldu.`;
      }
      nativeScheduleItems.push({
        id: 7001 + idx,
        title: nTitle,
        body: nBody,
        schedule: { at: targetDate, allowWhileIdle: true },
      });
    } else if (delay > 0 && delay < 86400000) {
      // Web / PWA timer schedule
      const timeoutId = window.setTimeout(() => {
        void triggerPrayerNotification(item.key, item.time);
      }, delay);
      activeTimeouts.push(timeoutId);
    }
  });

  if (isNativePlatform() && nativeScheduleItems.length > 0) {
    LocalNotifications.schedule({ notifications: nativeScheduleItems }).catch(() => {});
  }

  let lastCheckTime = Date.now();

  // Active background check interval (every 30 seconds)
  // Guards against device sleep, tab suspend, clock drift, and midnight date rollover
  activeCheckInterval = window.setInterval(() => {
    const current = new Date();
    const currentMs = current.getTime();
    const currentDateStr = getBakuDateString(current);

    // Date rollover check: if the day has changed, rebuild schedule for the new day
    if (currentDateStr !== scheduledDateStr) {
      const freshPrayerData = calculateLocalPrayerTimes(
        prayerData.cityKey || 'Baki',
        current,
        prayerData.calculationMethod || 'MuslimWorldLeague',
        prayerData.madhab === 'hanafi' ? 'hanafi' : 'shafi'
      );
      scheduleDailyPrayerNotifications(freshPrayerData);
      return;
    }

    for (const item of prayersToSchedule) {
      if (!item.enabled) continue;

      const targetDate = getPrayerTargetTime(item.time, settings.offsetMinutes, false);
      const targetMs = targetDate.getTime();
      const elapsedSinceTarget = currentMs - targetMs;

      // Trigger if target time has arrived within SLEEP_TOLERANCE_MS (15 min)
      // or crossed between lastCheckTime and currentMs (within tolerance)
      if (
        elapsedSinceTarget >= 0 &&
        elapsedSinceTarget <= SLEEP_TOLERANCE_MS &&
        (lastCheckTime <= targetMs || elapsedSinceTarget <= SLEEP_TOLERANCE_MS)
      ) {
        void triggerPrayerNotification(item.key, item.time);
      }
    }

    lastCheckTime = currentMs;
  }, 30000);
}
