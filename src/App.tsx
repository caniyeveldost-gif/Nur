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
import { fetchPrayerTimes, calculateLocalPrayerTimes } from './services/apiService';
import { BookmarkItem, CityPrayerData, UserSettings } from './types';

export default function App() {
  // 1. User Settings State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('nur_user_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_e) {}
    }
    return {
      userName: '',
      theme: 'light',
      fontSize: 'medium',
      city: 'Baki',
      vibrationEnabled: true,
      soundEnabled: true,
    };
  });

  // 2. Active Tab State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [quranSurahParam, setQuranSurahParam] = useState<number | undefined>(undefined);
  const [duaParam, setDuaParam] = useState<string | undefined>(undefined);
  const [zikrParam, setZikrParam] = useState<string | undefined>(undefined);

  // 3. Modals State
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // 4. Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    const saved = localStorage.getItem('nur_user_bookmarks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_e) {}
    }
    return [];
  });

  // 5. Prayer Data State
  const [prayerData, setPrayerData] = useState<CityPrayerData>(() =>
    calculateLocalPrayerTimes(settings.city)
  );

  // Sync settings to localStorage and document classes
  useEffect(() => {
    localStorage.setItem('nur_user_settings', JSON.stringify(settings));

    // Theme class on document element
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('nur_user_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Load prayer times when city changes
  useEffect(() => {
    let isMounted = true;
    fetchPrayerTimes(settings.city).then((data) => {
      if (isMounted) {
        setPrayerData(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [settings.city]);

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
  const handleNavigateTab = (tabId: string, subParam?: any) => {
    if (tabId === 'quran' && subParam?.surahNumber) {
      setQuranSurahParam(subParam.surahNumber);
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
