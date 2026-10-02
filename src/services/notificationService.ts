import { CityPrayerData } from '../types';
import { getBakuDateString } from './apiService';

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

// Register Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
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
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Request permission
export async function requestNotificationPermission(): Promise<boolean> {
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

// Dispatch a notification using Service Worker if available, or Notification API
export async function dispatchNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
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
    { key: 'fajr', name: 'Sübh (Fəcr)', time: prayerData.timings.fajr, enabled: settings.fajr },
    { key: 'dhuhr', name: 'Günorta (Zöhr)', time: prayerData.timings.dhuhr, enabled: settings.allPrayers },
    { key: 'asr', name: 'İkindi (Əsr)', time: prayerData.timings.asr, enabled: settings.allPrayers },
    { key: 'maghrib', name: 'Axşam (Məğrib / İftar)', time: prayerData.timings.maghrib, enabled: settings.maghrib },
    { key: 'isha', name: 'Yatsı (İşa)', time: prayerData.timings.isha, enabled: settings.allPrayers },
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
}

// Master scheduling function for daily notifications
export function scheduleDailyPrayerNotifications(prayerData: CityPrayerData): void {
  if (typeof window === 'undefined') return;

  // Clear existing timers and interval
  cancelDailyPrayerNotifications();

  const settings = getPrayerNotificationSettings();
  if (!settings.enabled || Notification.permission !== 'granted') {
    return;
  }

  // Ensure ServiceWorker is ready
  registerServiceWorker();

  const cityName = prayerData.cityName;

  // Notification dispatch helper with idempotency check per day
  const triggerPrayerNotification = (prayerKey: 'fajr' | 'maghrib' | 'dhuhr' | 'asr' | 'isha', prayerTime: string) => {
    const todayStr = getBakuDateString(new Date());
    const sentKey = `nur_sent_prayer_${prayerKey}_${todayStr}`;

    if (localStorage.getItem(sentKey)) {
      return; // Already sent today
    }

    let title = '';
    let body = '';

    if (prayerKey === 'fajr') {
      title = '🌅 Sübh (Fəcr) Namazı Vaxtıdır';
      body = `${cityName} üçün Sübh namazının vaxtı daxil oldu (${prayerTime}). Namaz qılmaq yuxudan xeyirlidir!`;
    } else if (prayerKey === 'maghrib') {
      title = '🌇 Axşam (Məğrib / İftar) Vaxtıdır';
      body = `${cityName} üçün Məğrib namazı və iftar vaxtı (${prayerTime}) daxil oldu. Allah ibadət və dualarınızı qəbul etsin!`;
    } else if (prayerKey === 'dhuhr') {
      title = '☀️ Zöhr (Günorta) Namazı Vaxtıdır';
      body = `${cityName} üçün Zöhr namazının vaxtı (${prayerTime}) daxil oldu.`;
    } else if (prayerKey === 'asr') {
      title = '🌤️ Əsr (İkindi) Namazı Vaxtıdır';
      body = `${cityName} üçün Əsr namazının vaxtı (${prayerTime}) daxil oldu.`;
    } else if (prayerKey === 'isha') {
      title = '🌙 İşa (Yatsı) Namazı Vaxtıdır';
      body = `${cityName} üçün İşa namazının vaxtı (${prayerTime}) daxil oldu.`;
    }

    const tag = `prayer-${prayerKey}-${todayStr}`;
    dispatchNotification(title, body, tag);
    try {
      localStorage.setItem(sentKey, Date.now().toString());
    } catch (_e) {}
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

  for (const item of prayersToSchedule) {
    if (!item.enabled) continue;

    const targetDate = getPrayerTargetTime(item.time, settings.offsetMinutes, false);
    const delay = targetDate.getTime() - now.getTime();

    // If within today and delay is under max 32-bit int (~24.8 days)
    if (delay > 0 && delay < 86400000) {
      const timeoutId = window.setTimeout(() => {
        triggerPrayerNotification(item.key, item.time);
      }, delay);
      activeTimeouts.push(timeoutId);
    }
  }

  // Also set up an active background check interval (every 30 seconds)
  // This guards against device sleep, tab suspend, and clock adjustments
  activeCheckInterval = window.setInterval(() => {
    const current = new Date();
    const currentHour = current.getHours();
    const currentMinute = current.getMinutes();

    for (const item of prayersToSchedule) {
      if (!item.enabled) continue;

      const [pHour, pMin] = item.time.split(':').map(Number);
      const targetMin = (pHour * 60 + pMin - settings.offsetMinutes + 1440) % 1440;
      const currentTotalMin = currentHour * 60 + currentMinute;

      if (currentTotalMin === targetMin) {
        triggerPrayerNotification(item.key, item.time);
      }
    }
  }, 30000);
}
