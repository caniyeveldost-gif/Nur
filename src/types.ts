export interface Surah {
  number: number;
  name: string; // Arabic name, e.g. الفاتحة
  transliteration: string; // Azerbaijani name, e.g. Əl-Fatihə
  translation: string; // Meaning in Azerbaijani, e.g. Kitabı Açan
  totalAyahs: number;
  revelationType: 'Məkkə' | 'Mədinə';
}

export interface Ayah {
  numberInSurah: number;
  surahNumber: number;
  arabic: string;
  translation: string; // Azerbaijani translation
  transliteration?: string;
  audio?: string;
}

export interface DuaCategory {
  id: string;
  name: string;
  iconName: string;
  description?: string;
}

export interface Dua {
  id: string;
  categoryId: string;
  title: string;
  arabic: string;
  transliteration: string; // Azərbaycan dilində oxunuş
  translation: string; // Azərbaycan dilində məna
  source: string; // Mənbə (məs. Səhih Buxari, Müslim, Tirmizi və s.)
  repeatCount?: number;
}

export interface ZikrItem {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  defaultTarget: number;
  virtue?: string;
}

export interface CityPrayerData {
  cityKey: string;
  cityName: string;
  lat: number;
  lng: number;
  qiblaAngle: number; // Degrees clockwise from North
  distanceToKaabaKm: number;
  timings: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
}

export interface Bookmark {
  id: string;
  type: 'ayah' | 'dua' | 'zikr';
  title: string;
  subtitle: string;
  arabicText?: string;
  refId: string;
  dateAdded: string;
}

export type BookmarkItem = Bookmark;

export interface LastRead {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  timestamp: string;
}

export interface UserSettings {
  userName: string;
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  city: string;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

export interface UserProfile {
  name: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  selectedCity: string;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  notifications: {
    prayerTimes: boolean;
    morningZikr: boolean;
    eveningZikr: boolean;
    dailyAyah: boolean;
  };
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

export type ChatMessage = AiChatMessage;
