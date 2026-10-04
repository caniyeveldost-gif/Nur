import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch (_e) {
    return false;
  }
}

export function getConfiguredBackendBaseUrl(): string | null {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    // Security: strictly accept only HTTPS backend URLs
    if (parsed.protocol !== 'https:') {
      return null;
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch (_e) {
    return null;
  }
}

export function resolveApiEndpoint(path: string): string | null {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredBase = getConfiguredBackendBaseUrl();

  if (isNativePlatform()) {
    // Native Android APK must use an explicit HTTPS backend URL (never relative '/api/...')
    return configuredBase ? `${configuredBase}${normalizedPath}` : null;
  }

  // Web environment uses configured HTTPS base URL if provided, otherwise relative '/api/...'
  return configuredBase ? `${configuredBase}${normalizedPath}` : normalizedPath;
}

export async function initNativePlatformUI(darkMode: boolean): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({
      color: darkMode ? '#09130e' : '#064e3b',
    });
  } catch (_e) {}

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch (_e) {}

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch (_e) {}
}

export async function syncNativeStatusBarTheme(darkMode: boolean): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({
      color: darkMode ? '#09130e' : '#064e3b',
    });
  } catch (_e) {}
}

export function registerNativeBackButton(onBackIntercept: () => boolean): () => void {
  if (!isNativePlatform()) {
    return () => {};
  }

  let listenerHandle: { remove: () => Promise<void> } | null = null;
  let unmounted = false;

  CapApp.addListener('backButton', () => {
    const handled = onBackIntercept();
    if (!handled) {
      CapApp.exitApp().catch(() => {});
    }
  })
    .then((handle) => {
      if (unmounted) {
        handle.remove().catch(() => {});
      } else {
        listenerHandle = handle;
      }
    })
    .catch(() => {});

  return () => {
    unmounted = true;
    if (listenerHandle) {
      listenerHandle.remove().catch(() => {});
    }
  };
}
