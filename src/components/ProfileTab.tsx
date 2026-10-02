import React, { useState, useRef } from 'react';
import {
  User,
  Settings,
  Bookmark,
  Info,
  Moon,
  Sun,
  MapPin,
  Volume2,
  Vibrate,
  Type,
  Trash2,
  Compass,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Bell
} from 'lucide-react';
import { UserSettings, BookmarkItem, PrayerCalculationMethod, NavigateTabFn } from '../types';
import { AZERBAIJAN_CITIES } from '../services/apiService';
import { safeStorage } from '../services/storageHelper';
import { getPrayerNotificationSettings } from '../services/notificationService';

interface ProfileTabProps {
  settings: UserSettings;
  onUpdateSettings: (newPartial: Partial<UserSettings>) => void;
  bookmarks: BookmarkItem[];
  onRemoveBookmark: (type: 'ayah' | 'dua' | 'zikr', refId: string) => void;
  onNavigateTab: NavigateTabFn;
  onOpenOnboarding?: () => void;
  onOpenPrayerModal?: () => void;
}

const CALC_METHODS_INFO: Record<string, { label: string; desc: string }> = {
  MuslimWorldLeague: {
    label: 'Dünya Müsəlman Liqası (MWL)',
    desc: 'Fəcr 18°, İşa 17°. Avropa və Qafqazda geniş istifadə olunan beynəlxalq standart.',
  },
  Turkey: {
    label: 'Diyanət İşləri Başqanlığı (Türkiyə / Qafqaz)',
    desc: 'Fəcr 18°, İşa 17°. Qafqaz və Türkiyə regionu üçün tənzimlənmiş dərəcələr.',
  },
  Tehran: {
    label: 'Tehran Universiteti (Geofizika)',
    desc: 'Fəcr 17.7°, Məğrib 4.5°, İşa 14°. Cəfəri fiqhinə əsaslanan elmi hesablama.',
  },
  Karachi: {
    label: 'İslam Elmləri Universiteti (Kəraçi)',
    desc: 'Fəcr 18°, İşa 18°. Cənubi Asiya və qonşu Hənəfi regionları üçün.',
  },
  NorthAmerica: {
    label: 'İSNA (Şimali Amerika)',
    desc: 'Fəcr 15°, İşa 15°. Şimali Amerika standartı.',
  },
  Egyptian: {
    label: 'Misir Baş Tədqiqat İdarəsi',
    desc: 'Fəcr 19.5°, İşa 17.5°. Şimali Afrika və Yaxın Şərq üçün.',
  },
  UmmAlQura: {
    label: 'Ümmül-Qura (Məkkə)',
    desc: 'Fəcr 18.5°, İşa: Məğribdən 90 dəqiqə sonra. Səudiyyə Ərəbistanı rəsmi standartı.',
  },
};

export const ProfileTab: React.FC<ProfileTabProps> = ({
  settings,
  onUpdateSettings,
  bookmarks,
  onRemoveBookmark,
  onNavigateTab,
  onOpenOnboarding,
  onOpenPrayerModal,
}) => {
  const [userNameInput, setUserNameInput] = useState<string>(settings.userName || '');
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [activeBookmarkFilter, setActiveBookmarkFilter] = useState<'all' | 'ayah' | 'dua' | 'zikr'>('all');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);
  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ userName: userNameInput.trim() });
    setNameSavedSuccess(true);
    setTimeout(() => setNameSavedSuccess(false), 2000);
  };

  const filteredBookmarks = bookmarks.filter((b) => {
    if (activeBookmarkFilter === 'all') return true;
    return b.type === activeBookmarkFilter;
  });

  // Export JSON backup
  const handleExportData = () => {
    const jsonStr = safeStorage.exportAllUserData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nur_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = safeStorage.importUserData(content);
        if (ok) {
          setImportStatusMsg('Məlumatlar uğurla bərpa olundu! Səhifə yenilənir...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatusMsg('Yedək faylı oxunmadı və ya format səhvdir.');
          setTimeout(() => setImportStatusMsg(null), 3000);
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset all application data
  const handleResetAllData = () => {
    safeStorage.clearAllUserData();
    window.location.reload();
  };

  const currentAdjustments = settings.prayerAdjustments || {};

  const handleAdjustmentChange = (prayerKey: string, delta: number) => {
    const current = currentAdjustments[prayerKey as keyof typeof currentAdjustments] || 0;
    const newVal = Math.max(-30, Math.min(30, current + delta));
    onUpdateSettings({
      prayerAdjustments: {
        ...currentAdjustments,
        [prayerKey]: newVal,
      },
    });
  };

  return (
    <div id="profile-view" className="space-y-4 pb-14 animate-in fade-in duration-200">
      {/* 1. Profile Header & User Name Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#053e2f] to-[#022c22] text-white shadow-md border border-amber-400/25">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-emerald-950 flex items-center justify-center font-bold text-xl shadow-md border-2 border-white/20">
            {settings.userName ? settings.userName.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold">
              {settings.userName ? `Hörmətli ${settings.userName}` : 'Xoş Gəlmisiniz!'}
            </h2>
            <p className="text-xs text-emerald-200/80">
              “Nur” şəxsi dini tənzimləmələriniz və yadda saxlanılanlar
            </p>
          </div>
        </div>

        {/* Change / Set Name Form */}
        <form onSubmit={handleSaveName} className="mt-4 pt-3 border-t border-emerald-600/30 flex items-center gap-2">
          <input
            type="text"
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            placeholder="Adınızı daxil edin..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-xs text-white placeholder:text-emerald-300/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-emerald-950 text-xs font-bold hover:brightness-110 transition shadow-xs"
          >
            {nameSavedSuccess ? 'Saxlanıldı ✓' : 'Yadda saxla'}
          </button>
        </form>
      </div>

      {/* 2. Preferences (Theme, City, Font size, Sound, Vibration) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs space-y-3.5">
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

        {/* Prayer Calculation Method */}
        <div className="pb-3 border-b border-stone-100 dark:border-emerald-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Hesablama Metodu:</span>
            </div>

            <select
              value={settings.prayerCalcMethod || 'MuslimWorldLeague'}
              onChange={(e) => onUpdateSettings({ prayerCalcMethod: e.target.value as PrayerCalculationMethod })}
              className="px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-amber-300 focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="MuslimWorldLeague">Dünya Müsəlman Liqası (Tövsiyə)</option>
              <option value="Turkey">Diyanət / Qafqaz Regionu</option>
              <option value="Tehran">Tehran Universiteti (Geofizika)</option>
              <option value="Karachi">İslam Elmləri Universiteti (Kəraçi)</option>
              <option value="NorthAmerica">İSNA (Şimali Amerika)</option>
              <option value="Egyptian">Misir Baş Tədqiqat İdarəsi</option>
              <option value="UmmAlQura">Ümmül-Qura (Məkkə)</option>
            </select>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-emerald-950/20 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-emerald-900/30">
            <div className="font-semibold text-emerald-800 dark:text-amber-300 mb-0.5">
              {CALC_METHODS_INFO[settings.prayerCalcMethod || 'MuslimWorldLeague']?.label}
            </div>
            <div>{CALC_METHODS_INFO[settings.prayerCalcMethod || 'MuslimWorldLeague']?.desc}</div>
            <div className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
              Məscidlər və fərdi təqvimlər arasındakı dəqiqə fərqlərini aşağıdakı tənzimləmələrlə (+/-) asanlıqla uyğunlaşdıra bilərsiniz.
            </div>
          </div>
        </div>

        {/* Asr Madhab Method */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Əsr Namazı Məzhəbi:</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateSettings({ prayerMadhab: 'shafi' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                (settings.prayerMadhab || 'shafi') === 'shafi'
                  ? 'bg-[#064e3b] text-amber-300 shadow-xs'
                  : 'bg-stone-100 dark:bg-emerald-950/40 text-stone-600 dark:text-stone-400'
              }`}
            >
              Şafii (1x kölgə)
            </button>
            <button
              onClick={() => onUpdateSettings({ prayerMadhab: 'hanafi' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                settings.prayerMadhab === 'hanafi'
                  ? 'bg-[#064e3b] text-amber-300 shadow-xs'
                  : 'bg-stone-100 dark:bg-emerald-950/40 text-stone-600 dark:text-stone-400'
              }`}
            >
              Hənəfi (2x kölgə)
            </button>
          </div>
        </div>

        {/* Manual Minute Adjustments Drawer */}
        <div className="pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <button
            onClick={() => setIsAdjustmentsOpen(!isAdjustmentsOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-emerald-800"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Namaz Vaxtlarının Dəqiqə Tənzimləmələri (+/-):</span>
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              {isAdjustmentsOpen ? 'Gizlət' : 'Tənzimlə'}
            </span>
          </button>

          {isAdjustmentsOpen && (
            <div className="mt-2.5 p-3 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200 dark:border-emerald-900/40 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { key: 'fajr', label: 'Sübh' },
                { key: 'sunrise', label: 'Gün çıxır' },
                { key: 'dhuhr', label: 'Zöhr' },
                { key: 'asr', label: 'Əsr' },
                { key: 'maghrib', label: 'Məğrib' },
                { key: 'isha', label: 'İşa' },
              ].map((p) => {
                const adj = currentAdjustments[p.key as keyof typeof currentAdjustments] || 0;
                return (
                  <div key={p.key} className="flex items-center justify-between p-1.5 bg-white dark:bg-[#0c1e15] rounded-lg border border-stone-200 dark:border-emerald-900/30">
                    <span className="text-[11px] font-medium">{p.label}:</span>
                    <div className="flex items-center gap-1 font-mono font-bold">
                      <button
                        onClick={() => handleAdjustmentChange(p.key, -1)}
                        className="w-5 h-5 rounded bg-stone-100 dark:bg-emerald-900 flex items-center justify-center text-stone-700 dark:text-stone-200"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-[11px]">{adj > 0 ? `+${adj}` : adj}</span>
                      <button
                        onClick={() => handleAdjustmentChange(p.key, 1)}
                        className="w-5 h-5 rounded bg-stone-100 dark:bg-emerald-900 flex items-center justify-center text-stone-700 dark:text-stone-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
            {settings.theme === 'dark' ? 'Qaranlıq rejim' : 'İşıqlı rejim'}
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
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
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

        {/* Daily Push Notifications for Fajr and Maghrib */}
        {onOpenPrayerModal && (
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <Bell className="w-4 h-4 text-amber-500" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span>Namaz Bildirişləri (Cihazdaxili):</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    getPrayerNotificationSettings().enabled
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-amber-300'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}>
                    {getPrayerNotificationSettings().enabled ? 'Aktiv' : 'Qapalı'}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 font-normal">
                  Sübh və Məğrib üçün lokal brauzer və PWA xatırlatmaları
                </div>
              </div>
            </div>

            <button
              onClick={onOpenPrayerModal}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 transition shrink-0"
            >
              Tənzimlə
            </button>
          </div>
        )}

        {/* Restart Onboarding Guide */}
        {onOpenOnboarding && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>Tətbiq Bələdçisi:</span>
            </div>
            <button
              onClick={onOpenOnboarding}
              className="px-3 py-1 rounded-xl bg-stone-100 dark:bg-emerald-950/60 hover:bg-amber-100 text-xs font-semibold text-stone-700 dark:text-amber-300 border border-stone-200 dark:border-emerald-800/40 transition"
            >
              Yenidən Başlat
            </button>
          </div>
        )}
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
            {(['all', 'ayah', 'dua', 'zikr'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveBookmarkFilter(f)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                  activeBookmarkFilter === f
                    ? 'bg-[#064e3b] text-amber-300'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {f === 'all' ? 'Hamısı' : f === 'ayah' ? 'Ayələr' : f === 'dua' ? 'Dualar' : 'Zikrlər'}
              </button>
            ))}
          </div>
        </div>

        {filteredBookmarks.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            Hələ heç bir ayə, dua və ya zikr yadda saxlanılmayıb. İstədiyiniz məzmundakı əlfəcin (bookmark) nişanına toxunaraq buraya əlavə edə bilərsiniz.
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
                      const [sNum, aNum] = b.refId.split(':');
                      onNavigateTab('quran', {
                        surahNumber: parseInt(sNum, 10),
                        ayahNumber: aNum ? parseInt(aNum, 10) : 1,
                      });
                    } else if (b.type === 'dua') {
                      onNavigateTab('duas', { duaId: b.refId });
                    } else {
                      onNavigateTab('zikr', { zikrId: b.refId });
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

      {/* 4. Data Safety: Backup Export / Import & Reset Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Məlumatların Qorunması və Ehtiyat Nüsxəsi</span>
        </h3>

        {importStatusMsg && (
          <div className="p-2 text-xs rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold text-center">
            {importStatusMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Export */}
          <button
            onClick={handleExportData}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-emerald-800/40 hover:bg-stone-50 dark:hover:bg-emerald-950/40 font-semibold flex items-center justify-center gap-1.5 transition text-stone-700 dark:text-stone-300"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>Yedəyi Yüklə (JSON)</span>
          </button>

          {/* Import */}
          <label className="p-2.5 rounded-xl border border-stone-200 dark:border-emerald-800/40 hover:bg-stone-50 dark:hover:bg-emerald-950/40 font-semibold flex items-center justify-center gap-1.5 transition text-stone-700 dark:text-stone-300 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Yedəyi Bərpa Et</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Clear Data Button */}
        <div className="pt-2 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">Bütün tənzimləmələri və yaddaşı sıfırla:</span>
          {showResetConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-rose-500 font-bold">Əminsiniz?</span>
              <button
                onClick={handleResetAllData}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white"
              >
                Sıfırla
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 text-[11px] rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                İmtina
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] font-semibold text-rose-500 hover:underline"
            >
              Məlumatları Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* 5. About Nur App (Haqqında & Mənbələr) */}
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
          <div>• <strong>Namaz Vaxtları və Qiblə:</strong> Astronomik hesablama · Adhan Engine & Şəhər GPS Koordinatları</div>
          <div>• <strong>Qurani-Kərim Tərcüməsi:</strong> Akademik Vasim Məmmədəliyev və Akademik Ziya Bünyadov / Əlixan Musayev</div>
          <div>• <strong>Dualar və Zikrlər:</strong> Şeyx Səid əl-Qəhtaninin “Hisnul-Muslim” (Müsəlmanın Qalası) kitabı</div>
          <div>• <strong>Süni İntellekt:</strong> Google DeepMind Gemini texnologiyası</div>
        </div>

        <div className="pt-2 text-[10px] text-stone-500 text-center">
          Versiya: 2.0.0 (Production-Ready) • Bütün hüquqlar qorunur © {new Date().getFullYear()} Nur Web App
        </div>
      </div>
    </div>
  );
};
