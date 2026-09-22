import React, { useState } from 'react';
import {
  User,
  Settings,
  Bookmark,
  Moon,
  Sun,
  MapPin,
  Volume2,
  Vibrate,
  Type,
  Trash2,
  Share2,
  ShieldCheck,
  Info,
  Check,
  ArrowRight,
  Sparkles,
  Download
} from 'lucide-react';
import { AZERBAIJAN_CITIES } from '../services/apiService';
import { BookmarkItem, UserSettings } from '../types';

interface ProfileTabProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  bookmarks: BookmarkItem[];
  onRemoveBookmark: (type: 'ayah' | 'dua' | 'zikr', refId: string) => void;
  onNavigateTab: (tabId: string, subParam?: any) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  settings,
  onUpdateSettings,
  bookmarks,
  onRemoveBookmark,
  onNavigateTab,
}) => {
  const [nameInput, setNameInput] = useState<string>(settings.userName);
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [activeBookmarkFilter, setActiveBookmarkFilter] = useState<'all' | 'ayah' | 'dua' | 'zikr'>('all');

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ userName: nameInput.trim() });
    setNameSavedSuccess(true);
    setTimeout(() => setNameSavedSuccess(false), 2000);
  };

  const filteredBookmarks = bookmarks.filter((b) => {
    if (activeBookmarkFilter === 'all') return true;
    return b.type === activeBookmarkFilter;
  });

  return (
    <div id="profile-view" className="space-y-5 pb-16">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
          <User className="w-5 h-5 text-amber-500" />
          <span>Profil və Tənzimləmələr</span>
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-300">
          Şəxsi parametrlər, yadda saxlanılanlar və tətbiq haqqında
        </p>
      </div>

      {/* 1. User Identity Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 mb-3 flex items-center gap-1.5">
          <User className="w-4 h-4" />
          <span>Şəxsi Məlumat</span>
        </h3>

        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Adınız (Salamlama üçün):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Adınızı daxil edin..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#064e3b] dark:focus:ring-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#064e3b] text-amber-300 text-xs font-bold hover:brightness-110 transition shadow-xs"
              >
                {nameSavedSuccess ? "Saxlanıldı ✓" : "Yadda saxla"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Preferences (Theme, City, Font size, Sound, Vibration) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
          <Settings className="w-4 h-4" />
          <span>Tətbiq Parametrləri</span>
        </h3>

        {/* City selection */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>Namaz və Qiblə Şəhəri:</span>
          </div>

          <select
            value={settings.city}
            onChange={(e) => onUpdateSettings({ city: e.target.value })}
            className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-amber-300 focus:outline-none cursor-pointer"
          >
            {Object.entries(AZERBAIJAN_CITIES).map(([key, item]) => (
              <option key={key} value={key} className="bg-white dark:bg-[#0c1e15] text-stone-900 dark:text-white">
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Theme mode toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            {settings.theme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>Görünüş Rejimi:</span>
          </div>

          <button
            onClick={() => onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            className="px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950/60 text-xs font-bold text-stone-800 dark:text-amber-300 border border-stone-200 dark:border-emerald-800/40 transition"
          >
            {settings.theme === 'dark' ? "Qaranlıq rejim" : "İşıqlı rejim"}
          </button>
        </div>

        {/* Font size selection */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <Type className="w-4 h-4 text-emerald-600" />
            <span>Şrift Ölçüsü:</span>
          </div>

          <div className="flex items-center gap-1">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => onUpdateSettings({ fontSize: size })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  settings.fontSize === size
                    ? 'bg-[#064e3b] text-amber-300 shadow-xs'
                    : 'bg-stone-100 dark:bg-emerald-950/40 text-stone-600 dark:text-stone-400'
                }`}
              >
                {size === 'small' ? 'Kiçik' : size === 'medium' ? 'Orta' : 'Böyük'}
              </button>
            ))}
          </div>
        </div>

        {/* Vibration feedback toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <Vibrate className="w-4 h-4 text-amber-500" />
            <span>Təsbeh Vibrasiyası:</span>
          </div>

          <button
            onClick={() => onUpdateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              settings.vibrationEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 dark:bg-emerald-950 text-stone-600 dark:text-stone-400'
            }`}
          >
            {settings.vibrationEnabled ? 'Aktiv' : 'Qapalı'}
          </button>
        </div>

        {/* Sound click feedback toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <Volume2 className="w-4 h-4 text-emerald-600" />
            <span>Klik Səsləri:</span>
          </div>

          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              settings.soundEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 dark:bg-emerald-950 text-stone-600 dark:text-stone-400'
            }`}
          >
            {settings.soundEnabled ? 'Aktiv' : 'Qapalı'}
          </button>
        </div>
      </div>

      {/* 3. Bookmarks / Yadda saxlanılanlar Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Yadda Saxlanılanlar ({bookmarks.length})</span>
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {(['all', 'ayah', 'dua'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveBookmarkFilter(f)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                  activeBookmarkFilter === f
                    ? 'bg-[#064e3b] text-amber-300'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {f === 'all' ? 'Hamısı' : f === 'ayah' ? 'Ayələr' : 'Dualar'}
              </button>
            ))}
          </div>
        </div>

        {filteredBookmarks.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            Hələ heç bir ayə və ya dua yadda saxlanılmayıb. İstədiyiniz məzmundakı əlfəcin (bookmark) nişanına toxunaraq buraya əlavə edə bilərsiniz.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {filteredBookmarks.map((b) => (
              <div
                key={`${b.type}-${b.refId}`}
                className="p-3 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200/60 dark:border-emerald-900/30 flex items-start justify-between gap-2"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    if (b.type === 'ayah') {
                      const [sNum] = b.refId.split(':');
                      onNavigateTab('quran', { surahNumber: parseInt(sNum, 10) });
                    } else if (b.type === 'dua') {
                      onNavigateTab('duas');
                    } else {
                      onNavigateTab('zikr');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300">
                      {b.type === 'ayah' ? 'Ayə' : b.type === 'dua' ? 'Dua' : 'Zikr'}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 hover:text-emerald-700">
                      {b.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 line-clamp-2">
                    {b.subtitle}
                  </p>
                </div>

                <button
                  onClick={() => onRemoveBookmark(b.type, b.refId)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 transition"
                  title="Yaddaşdan sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. About Nur App (Haqqında & Mənbələr) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>“Nur” Tətbiqi Haqqında</span>
        </h3>

        <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
          <strong>“Nur”</strong> – Azərbaycan dilli müsəlmanlar üçün Quran oxumağı, gündəlik duaları,
          zikrləri və namaz vaxtlarını bir araya gətirən müasir, təmiz və güvənli dini köməkçidir.
        </p>

        <div className="p-3 rounded-xl bg-stone-50 dark:bg-emerald-950/30 border border-stone-200/60 dark:border-emerald-900/30 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
          <div className="font-semibold text-stone-800 dark:text-stone-200">İstifadə Olunan Etibarlı Mənbələr:</div>
          <div>• <strong>Qurani-Kərim Tərcüməsi:</strong> Akademik Vasim Məmmədəliyev və Akademik Ziya Bünyadov</div>
          <div>• <strong>Dualar və Zikrlər:</strong> Şeyx Səid əl-Qəhtaninin “Hisnul-Muslim” (Müsəlmanın Qalası) kitabı</div>
          <div>• <strong>Namaz Vaxtları:</strong> Qafqaz Müsəlmanları İdarəsi və AR Dini Qurumlarla İş üzrə Dövlət Komitəsinin astronomik cədvəli</div>
          <div>• <strong>Süni İntellekt:</strong> Google DeepMind Gemini texnologiyası</div>
        </div>

        <div className="pt-2 text-[10px] text-stone-500 text-center">
          Versiya: 1.0.0 • Bütün hüquqlar qorunur © {new Date().getFullYear()} Nur Web App
        </div>
      </div>
    </div>
  );
};
