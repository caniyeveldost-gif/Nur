import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { QuranTab } from './components/QuranTab';
import { DuasTab } from './components/DuasTab';
import { ZikrTab } from './components/ZikrTab';
import { NurAiTab } from './components/NurAiTab';
import { ProfileTab } from './components/ProfileTab';
import { QiblaView } from './components/QiblaView';
import { PrayerModal } from './components/PrayerModal';
import { CalendarModal } from './components/CalendarModal';
import { SearchModal } from './components/SearchModal';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import {
  scheduleDailyPrayerNotifications,
  cancelDailyPrayerNotifications,
  registerServiceWorker,
} from './services/notificationService';
import { safeStorage } from './services/storageHelper';
import { BookmarkItem, UserSettings, TabNavigationParams, NavigateTabFn } from './types';

export default function App() {
  // 1. User Settings State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = safeStorage.getItem<UserSettings>('nur_user_settings', {
      userName: '',
      theme: 'light',
      fontSize: 'medium',
      city: 'Baki',
      vibrationEnabled: true,
      soundEnabled: true,
      prayerCalcMethod: 'MuslimWorldLeague',
      prayerMadhab: 'shafi',
      prayerAdjustments: {},
    });
    if (typeof document !== 'undefined') {
      if (saved.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return saved;
  });

  // 2. Active Tab State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [quranSurahParam, setQuranSurahParam] = useState<number | undefined>(undefined);
  const [quranAyahParam, setQuranAyahParam] = useState<number | undefined>(undefined);
  const [duaParam, setDuaParam] = useState<string | undefined>(undefined);
  const [zikrParam, setZikrParam] = useState<string | undefined>(undefined);

  // 3. Modals State
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // 4. Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    return safeStorage.getItem<BookmarkItem[]>('nur_user_bookmarks', []);
  });

  // 5. Centralized Prayer Times Hook (syncs with city, calcMethod, madhab, adjustments)
  const { prayerData } = usePrayerTimes(settings);

  // Sync settings to localStorage and document classes
  useEffect(() => {
    safeStorage.setItem('nur_user_settings', settings);

    // Theme class on document element & meta theme-color sync
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#07130d');
    } else {
      document.documentElement.classList.remove('dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#064e3b');
    }
  }, [settings]);

  // Sync bookmarks to localStorage
  useEffect(() => {
    safeStorage.setItem('nur_user_bookmarks', bookmarks);
  }, [bookmarks]);

  // Register service worker and schedule daily prayer notifications whenever prayerData updates
  useEffect(() => {
    registerServiceWorker();
    scheduleDailyPrayerNotifications(prayerData);

    return () => {
      // Clear on cleanup/unmount
      cancelDailyPrayerNotifications();
    };
  }, [prayerData]);

  // Update specific settings
  const handleUpdateSettings = (newPartial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  // Toggle theme shortcut
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    handleUpdateSettings({ theme: nextTheme });
  };

  // Select City shortcut
  const handleSelectCity = (cityKey: string) => {
    handleUpdateSettings({ city: cityKey });
  };

  // Navigation handler
  const handleNavigateTab: NavigateTabFn = (tabId: string, subParam?: TabNavigationParams) => {
    if (tabId === 'quran') {
      if (subParam?.surahNumber) {
        setQuranSurahParam(subParam.surahNumber);
      }
      if (subParam?.ayahNumber) {
        setQuranAyahParam(subParam.ayahNumber);
      }
    }
    if (tabId === 'duas' && subParam?.duaId) {
      setDuaParam(subParam.duaId);
    }
    if (tabId === 'zikr' && subParam?.zikrId) {
      setZikrParam(subParam.zikrId);
    }
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bookmark toggler
  const handleToggleBookmark = (item: {
    type: 'ayah' | 'dua' | 'zikr';
    refId: string;
    title: string;
    subtitle: string;
    arabicText?: string;
  }) => {
    setBookmarks((prev) => {
      const existsIndex = prev.findIndex(
        (b) => b.type === item.type && b.refId === item.refId
      );
      if (existsIndex >= 0) {
        return prev.filter((_, idx) => idx !== existsIndex);
      } else {
        const newBookmark: BookmarkItem = {
          id: `${item.type}-${item.refId}-${Date.now()}`,
          type: item.type,
          refId: item.refId,
          title: item.title,
          subtitle: item.subtitle,
          arabicText: item.arabicText,
          dateAdded: new Date().toISOString(),
        };
        return [newBookmark, ...prev];
      }
    });
  };

  const isBookmarked = (type: 'ayah' | 'dua' | 'zikr', refId: string) => {
    return bookmarks.some((b) => b.type === type && b.refId === refId);
  };

  const handleRemoveBookmark = (type: 'ayah' | 'dua' | 'zikr', refId: string) => {
    setBookmarks((prev) => prev.filter((b) => !(b.type === type && b.refId === refId)));
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] dark:bg-[#07130d] text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        userName={settings.userName}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        selectedCity={settings.city}
        onSelectCity={handleSelectCity}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onNavigateTab={handleNavigateTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 sm:px-6 pt-5 pb-24">
        {activeTab === 'home' && (
          <HomeTab
            prayerData={prayerData}
            onNavigateTab={handleNavigateTab}
            onToggleBookmark={handleToggleBookmark}
            isBookmarked={isBookmarked}
            onOpenPrayerModal={() => setIsPrayerModalOpen(true)}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
          />
        )}

        {activeTab === 'quran' && (
          <QuranTab
            initialSurahNumber={quranSurahParam}
            initialAyahNumber={quranAyahParam}
            onToggleBookmark={handleToggleBookmark}
            isBookmarked={isBookmarked}
            globalFontSize={settings.fontSize}
          />
        )}

        {activeTab === 'duas' && (
          <DuasTab
            initialDuaId={duaParam}
            onToggleBookmark={handleToggleBookmark}
            isBookmarked={isBookmarked}
          />
        )}

        {activeTab === 'zikr' && (
          <ZikrTab
            initialZikrId={zikrParam}
            vibrationDefault={settings.vibrationEnabled}
            soundDefault={settings.soundEnabled}
          />
        )}

        {activeTab === 'ai' && (
          <NurAiTab userName={settings.userName} />
        )}

        {activeTab === 'qibla' && (
          <QiblaView
            prayerData={prayerData}
            onSelectCity={handleSelectCity}
            onClose={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            bookmarks={bookmarks}
            onRemoveBookmark={handleRemoveBookmark}
            onNavigateTab={handleNavigateTab}
            onOpenPrayerModal={() => setIsPrayerModalOpen(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={handleNavigateTab} />

      {/* Modals */}
      {isPrayerModalOpen && (
        <PrayerModal
          prayerData={prayerData}
          selectedCity={settings.city}
          onSelectCity={handleSelectCity}
          onClose={() => setIsPrayerModalOpen(false)}
        />
      )}

      {isCalendarModalOpen && (
        <CalendarModal onClose={() => setIsCalendarModalOpen(false)} />
      )}

      {isSearchModalOpen && (
        <SearchModal
          onClose={() => setIsSearchModalOpen(false)}
          onNavigateTab={handleNavigateTab}
        />
      )}
    </div>
  );
}
