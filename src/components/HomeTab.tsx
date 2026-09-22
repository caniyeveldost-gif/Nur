import React, { useState, useEffect } from 'react';
import {
  Clock,
  BookOpen,
  HeartHandshake,
  Hash,
  Compass,
  Bot,
  Calendar,
  Bookmark,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  SunMedium,
  Sunset,
  Moon,
  Volume2
} from 'lucide-react';
import { DAILY_AYAHS } from '../data/surahs';
import { DAILY_DUA } from '../data/duas';
import { DAILY_ZIKR } from '../data/zikrs';
import { CityPrayerData } from '../types';

interface HomeTabProps {
  prayerData: CityPrayerData;
  onNavigateTab: (tabId: string, subParam?: any) => void;
  onToggleBookmark: (item: { type: 'ayah' | 'dua' | 'zikr'; refId: string; title: string; subtitle: string; arabicText?: string }) => void;
  isBookmarked: (type: 'ayah' | 'dua' | 'zikr', refId: string) => boolean;
  onOpenPrayerModal: () => void;
  onOpenCalendarModal: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  prayerData,
  onNavigateTab,
  onToggleBookmark,
  isBookmarked,
  onOpenPrayerModal,
  onOpenCalendarModal,
}) => {
  // Rotate daily ayah by day of year
  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const dailyAyah = DAILY_AYAHS[dayOfYear % DAILY_AYAHS.length];
  const dailyDua = DAILY_DUA;
  const dailyZikr = DAILY_ZIKR;

  // Local quick count for daily zikr
  const [quickZikrCount, setQuickZikrCount] = useState<number>(() => {
    const saved = localStorage.getItem(`nur_quick_zikr_${dailyZikr.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Next prayer calculation & countdown
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{
    nameAz: string;
    arabicName: string;
    timeStr: string;
    remainingStr: string;
    progressPercent: number;
  }>({
    nameAz: 'Sübh',
    arabicName: 'الفجر',
    timeStr: '05:30',
    remainingStr: '--:--',
    progressPercent: 0,
  });

  useEffect(() => {
    const calculateNextPrayer = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

      const prayerSchedule = [
        { key: 'fajr', nameAz: 'Sübh', arabicName: 'الفجر', timeStr: prayerData.timings.fajr },
        { key: 'sunrise', nameAz: 'Gün çıxır', arabicName: 'الشروق', timeStr: prayerData.timings.sunrise },
        { key: 'dhuhr', nameAz: 'Günorta (Zöhr)', arabicName: 'الظهر', timeStr: prayerData.timings.dhuhr },
        { key: 'asr', nameAz: 'İkindi (Əsr)', arabicName: 'العصر', timeStr: prayerData.timings.asr },
        { key: 'maghrib', nameAz: 'Axşam (Məğrib)', arabicName: 'المغرب', timeStr: prayerData.timings.maghrib },
        { key: 'isha', nameAz: 'Yatsı (İşa)', arabicName: 'العشاء', timeStr: prayerData.timings.isha },
      ];

      const parsedTimes = prayerSchedule.map((p) => {
        const [h, m] = p.timeStr.split(':').map(Number);
        return { ...p, totalMinutes: h * 60 + m };
      });

      // Find next prayer
      let next = parsedTimes.find((p) => p.totalMinutes > currentMinutes);
      let diffMinutes = 0;

      if (next) {
        diffMinutes = next.totalMinutes - currentMinutes;
      } else {
        // Next is tomorrow's Fajr
        next = parsedTimes[0];
        diffMinutes = (1440 - currentMinutes) + next.totalMinutes;
      }

      const hours = Math.floor(diffMinutes / 60);
      const mins = Math.floor(diffMinutes % 60);
      const secs = Math.floor((diffMinutes * 60) % 60);

      const remainingStr = `${hours.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      // Progress bar within prayer block (estimate)
      const progress = Math.max(5, Math.min(95, 100 - (diffMinutes / 240) * 100));

      setNextPrayerInfo({
        nameAz: next.nameAz,
        arabicName: next.arabicName,
        timeStr: next.timeStr,
        remainingStr,
        progressPercent: progress,
      });
    };

    calculateNextPrayer();
    const interval = setInterval(calculateNextPrayer, 1000);
    return () => clearInterval(interval);
  }, [prayerData]);

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleQuickZikrIncrement = () => {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
    const nextCount = quickZikrCount + 1;
    setQuickZikrCount(nextCount);
    localStorage.setItem(`nur_quick_zikr_${dailyZikr.id}`, nextCount.toString());
  };

  const isAyahSaved = isBookmarked('ayah', `${dailyAyah.surahNumber}:${dailyAyah.ayahNumber}`);
  const isDuaSaved = isBookmarked('dua', dailyDua.id);

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Next Prayer Countdown Hero Card */}
      <section
        id="home-next-prayer-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#053e2f] to-[#022c22] p-5 text-white shadow-lg border border-amber-400/25"
      >
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Növbəti namaz ({prayerData.cityName})</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {nextPrayerInfo.nameAz}
              </h3>
              <span className="font-arabic text-amber-200/90 text-lg">
                {nextPrayerInfo.arabicName}
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Vaxt: <span className="font-bold text-white text-sm">{nextPrayerInfo.timeStr}</span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-medium text-emerald-200/80">Qalan vaxt</div>
            <div className="text-2xl font-mono font-bold text-amber-300 tracking-wider">
              {nextPrayerInfo.remainingStr}
            </div>
          </div>
        </div>

        {/* Horizontal Mini Timeline for Today's Prayers */}
        <div className="mt-4 pt-3.5 border-t border-emerald-700/40 grid grid-cols-5 gap-1.5 text-center">
          <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/30">
            <div className="text-[10px] text-emerald-200">Sübh</div>
            <div className="text-xs font-bold text-white mt-0.5">{prayerData.timings.fajr}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/30">
            <div className="text-[10px] text-emerald-200">Günorta</div>
            <div className="text-xs font-bold text-white mt-0.5">{prayerData.timings.dhuhr}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/30">
            <div className="text-[10px] text-emerald-200">İkindi</div>
            <div className="text-xs font-bold text-white mt-0.5">{prayerData.timings.asr}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/30">
            <div className="text-[10px] text-emerald-200">Axşam</div>
            <div className="text-xs font-bold text-white mt-0.5">{prayerData.timings.maghrib}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/30">
            <div className="text-[10px] text-emerald-200">Yatsı</div>
            <div className="text-xs font-bold text-white mt-0.5">{prayerData.timings.isha}</div>
          </div>
        </div>

        {/* View all prayer times link */}
        <button
          id="home-open-prayer-modal-btn"
          onClick={onOpenPrayerModal}
          className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-xs font-semibold text-amber-200 transition"
        >
          <span>Bütün namaz vaxtları və bildirişlər</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* 2. Quick Access Action Grid (Sürətli Giriş) */}
      <section id="home-quick-actions" aria-label="Sürətli Giriş">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Sürətli Giriş</span>
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <button
            id="quick-action-quran"
            onClick={() => onNavigateTab('quran')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 transition group text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-[#064e3b] dark:text-amber-400 group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold mt-2 text-stone-800 dark:text-stone-100 leading-tight">
              Quran
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-300">114 Surə</span>
          </button>

          <button
            id="quick-action-duas"
            onClick={() => onNavigateTab('duas')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 transition group text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold mt-2 text-stone-800 dark:text-stone-100 leading-tight">
              Dualar
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-300">Hisnul Muslim</span>
          </button>

          <button
            id="quick-action-zikr"
            onClick={() => onNavigateTab('zikr')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 transition group text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-[#064e3b] dark:text-amber-400 group-hover:scale-105 transition">
              <Hash className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold mt-2 text-stone-800 dark:text-stone-100 leading-tight">
              Təsbeh
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-300">Zikr sayğacı</span>
          </button>

          <button
            id="quick-action-qibla"
            onClick={() => onNavigateTab('qibla')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 transition group text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold mt-2 text-stone-800 dark:text-stone-100 leading-tight">
              Qiblə
            </span>
            <span className="text-[10px] text-stone-600 dark:text-stone-300">Dəqiq kompas</span>
          </button>
        </div>

        {/* Secondary quick bar: Nur AI and Hijri Calendar */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
          <button
            id="quick-action-nur-ai"
            onClick={() => onNavigateTab('ai')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-900/10 to-amber-500/10 dark:from-emerald-900/40 dark:to-amber-950/30 border border-emerald-600/20 dark:border-amber-400/30 hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 flex items-center justify-center text-amber-300 shadow-sm shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                <span>Nur AI Dini Köməkçi</span>
              </div>
              <p className="text-[10px] text-stone-600 dark:text-stone-300">
                Sual verin, mənbələrlə öyrənin
              </p>
            </div>
          </button>

          <button
            id="quick-action-calendar"
            onClick={onOpenCalendarModal}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Hicri Təqvim
              </div>
              <p className="text-[10px] text-stone-600 dark:text-stone-300">
                Mübarək günlər və aylar
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Günün Ayəsi (Daily Ayah Card) */}
      <section
        id="home-daily-ayah-card"
        className="rounded-2xl bg-white dark:bg-[#0c1e15] p-5 shadow-xs border border-emerald-900/10 dark:border-emerald-800/40 transition"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Günün Ayəsi
            </h3>
            <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">
              ({dailyAyah.surahName}, {dailyAyah.surahNumber}:{dailyAyah.ayahNumber})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                handleCopyText(
                  `"${dailyAyah.translation}"\n(${dailyAyah.surahName} surəsi, ${dailyAyah.ayahNumber}-ci ayə)\n\nƏrəbcə: ${dailyAyah.arabic}`,
                  'ayah'
                )
              }
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
              title="Kopyala"
              aria-label="Ayəni kopyala"
            >
              {copiedType === 'ayah' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={() =>
                onToggleBookmark({
                  type: 'ayah',
                  refId: `${dailyAyah.surahNumber}:${dailyAyah.ayahNumber}`,
                  title: `${dailyAyah.surahName}, ${dailyAyah.surahNumber}:${dailyAyah.ayahNumber}`,
                  subtitle: dailyAyah.translation,
                  arabicText: dailyAyah.arabic,
                })
              }
              className={`p-1.5 rounded-lg transition ${
                isAyahSaved
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-stone-600 dark:text-stone-300 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-emerald-900/40'
              }`}
              title={isAyahSaved ? "Yaddaşdan çıxar" : "Yadda saxla"}
              aria-label="Ayəni yadda saxla"
            >
              <Bookmark className={`w-4 h-4 ${isAyahSaved ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Arabic Text (RTL) */}
        <div
          dir="rtl"
          className="font-arabic font-bold text-xl sm:text-2xl text-right text-emerald-950 dark:text-emerald-50 mt-4 leading-loose tracking-wide"
        >
          {dailyAyah.arabic}
        </div>

        {/* Azerbaijani Translation */}
        <p className="mt-3 text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
          “{dailyAyah.translation}”
        </p>

        {/* Context / Reflection */}
        {dailyAyah.context && (
          <div className="mt-3 p-3 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200/60 dark:border-emerald-900/40 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            {dailyAyah.context}
          </div>
        )}

        <div className="mt-4 pt-3 flex justify-end">
          <button
            onClick={() => onNavigateTab('quran', { surahNumber: dailyAyah.surahNumber })}
            className="flex items-center gap-1 text-xs font-semibold text-[#064e3b] dark:text-amber-400 hover:underline"
          >
            <span>Surəni bütöv oxu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 4. Günün Duası (Daily Dua Card) */}
      <section
        id="home-daily-dua-card"
        className="rounded-2xl bg-white dark:bg-[#0c1e15] p-5 shadow-xs border border-emerald-900/10 dark:border-emerald-800/40 transition"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Günün Duası
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                handleCopyText(
                  `${dailyDua.title}\n\nƏrəbcə: ${dailyDua.arabic}\n\nOxunuşu: ${dailyDua.transliteration}\n\nMənası: ${dailyDua.translation}\n\nMənbə: ${dailyDua.source}`,
                  'dua'
                )
              }
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
              title="Kopyala"
              aria-label="Duanı kopyala"
            >
              {copiedType === 'dua' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={() =>
                onToggleBookmark({
                  type: 'dua',
                  refId: dailyDua.id,
                  title: dailyDua.title,
                  subtitle: dailyDua.translation,
                  arabicText: dailyDua.arabic,
                })
              }
              className={`p-1.5 rounded-lg transition ${
                isDuaSaved
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-stone-600 dark:text-stone-300 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-emerald-900/40'
              }`}
              title={isDuaSaved ? "Yaddaşdan çıxar" : "Yadda saxla"}
              aria-label="Duanı yadda saxla"
            >
              <Bookmark className={`w-4 h-4 ${isDuaSaved ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        <h4 className="mt-3 text-sm font-bold text-stone-900 dark:text-stone-100">
          {dailyDua.title}
        </h4>

        {/* Arabic text */}
        <div
          dir="rtl"
          className="font-arabic text-lg sm:text-xl text-right text-emerald-950 dark:text-emerald-50 mt-2.5 leading-relaxed"
        >
          {dailyDua.arabic}
        </div>

        {/* Transliteration */}
        <div className="mt-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium italic">
          Oxunuşu: {dailyDua.transliteration}
        </div>

        {/* Translation */}
        <p className="mt-2 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          Tərcüməsi: {dailyDua.translation}
        </p>

        {/* Source */}
        <div className="mt-3 pt-2 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-300">
          <span>Mənbə: {dailyDua.source}</span>
          <button
            onClick={() => onNavigateTab('duas')}
            className="font-semibold text-emerald-800 dark:text-amber-400 hover:underline"
          >
            Bütün dualar
          </button>
        </div>
      </section>

      {/* 5. Günün Zikri (Daily Dhikr Quick Card) */}
      <section
        id="home-daily-zikr-card"
        className="rounded-2xl bg-white dark:bg-[#0c1e15] p-5 shadow-xs border border-emerald-900/10 dark:border-emerald-800/40 transition"
      >
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Günün Zikri
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('zikr')}
            className="text-xs font-semibold text-emerald-800 dark:text-amber-400 hover:underline"
          >
            Təsbehə keç
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-3">
          <div className="flex-1 text-center sm:text-left">
            <div className="font-arabic text-2xl text-emerald-900 dark:text-emerald-100 font-bold">
              {dailyZikr.arabic}
            </div>
            <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-1">
              {dailyZikr.transliteration}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              {dailyZikr.translation}
            </p>
          </div>

          {/* Big Tap Button for Quick Zikr */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-[#064e3b] dark:text-amber-400">
                {quickZikrCount}
              </div>
              <div className="text-[10px] text-stone-600 dark:text-stone-300">Hədəf: {dailyZikr.defaultTarget}</div>
            </div>

            <button
              id="home-quick-zikr-btn"
              onClick={handleQuickZikrIncrement}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 active:scale-95 text-amber-300 shadow-md flex items-center justify-center font-bold text-2xl hover:brightness-110 transition select-none"
              aria-label="Zikr sayğacını artır"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {/* 6. Motivasiya Bölməsi (Requested in prompt: “Allahı xatırlamaq qəlblərə rahatlıq verir”) */}
      <section
        id="home-spiritual-motivation"
        className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-900/10 to-emerald-950/20 dark:from-emerald-950/60 dark:to-[#04241b] p-5 border border-amber-500/30 relative overflow-hidden"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950 dark:text-amber-300">
              “Allahı xatırlamaq qəlblərə rahatlıq verir”
            </h4>
            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed mt-1.5">
              Həyatın qayğıları, qorxuları və yorğunluğu içində insan ruhunun yeganə sığınacağı
              Allaha yönəlməkdir. Gündə bir neçə dəqiqə zikr etmək, səmimi dua qılmaq və Quran ayələrini
              təfəkkür etmək qəlbi kədərdən təmizləyər və mənəvi dincik gətirər.
            </p>
            <div className="mt-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
              — ər-Rəd surəsi, 28-ci ayə
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
