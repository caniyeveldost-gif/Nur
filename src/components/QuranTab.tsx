import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ArrowLeft,
  Bookmark,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Type,
  Share2,
  ChevronRight,
  Sparkles,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { ALL_SURAHS } from '../data/surahs';
import { fetchSurahAyahs } from '../services/apiService';
import { Surah, Ayah, LastRead } from '../types';

interface QuranTabProps {
  initialSurahNumber?: number;
  onToggleBookmark: (item: { type: 'ayah' | 'dua' | 'zikr'; refId: string; title: string; subtitle: string; arabicText?: string }) => void;
  isBookmarked: (type: 'ayah' | 'dua' | 'zikr', refId: string) => boolean;
  globalFontSize: 'small' | 'medium' | 'large' | 'xlarge';
}

export const QuranTab: React.FC<QuranTabProps> = ({
  initialSurahNumber,
  onToggleBookmark,
  isBookmarked,
  globalFontSize,
}) => {
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'Məkkə' | 'Mədinə'>('all');

  // Font size local override option for reader: 'small' | 'medium' | 'large'
  const [readerFontSize, setReaderFontSize] = useState<'small' | 'medium' | 'large'>(
    globalFontSize === 'large' || globalFontSize === 'xlarge' ? 'large' : 'medium'
  );

  // Last read persistence
  const [lastRead, setLastRead] = useState<LastRead | null>(() => {
    const saved = localStorage.getItem('nur_last_read_quran');
    return saved ? JSON.parse(saved) : null;
  });

  const [copiedAyahNumber, setCopiedAyahNumber] = useState<number | null>(null);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioErrorMsg, setAudioErrorMsg] = useState<string | null>(null);

  // Initial surah if navigated from elsewhere
  useEffect(() => {
    if (initialSurahNumber) {
      const found = ALL_SURAHS.find((s) => s.number === initialSurahNumber);
      if (found) {
        handleSelectSurah(found);
      }
    }
  }, [initialSurahNumber]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handleSelectSurah = async (surah: Surah, startAyah?: number) => {
    setSelectedSurah(surah);
    setLoadingAyahs(true);
    setLoadError(null);
    setAudioErrorMsg(null);

    try {
      const data = await fetchSurahAyahs(surah.number);
      setAyahs(data);

      // Save as last read
      const newLastRead: LastRead = {
        surahNumber: surah.number,
        surahName: surah.transliteration,
        ayahNumber: startAyah || 1,
        timestamp: new Date().toISOString(),
      };
      setLastRead(newLastRead);
      localStorage.setItem('nur_last_read_quran', JSON.stringify(newLastRead));

      // Scroll to startAyah if specified
      if (startAyah) {
        setTimeout(() => {
          const el = document.getElementById(`ayah-${startAyah}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error("Error loading surah:", e);
      setLoadError("Ayələri yükləmək mümkün olmadı. Zəhmət olmasa internet bağlantınızı yoxlayıb yenidən cəhd edin.");
    } finally {
      setLoadingAyahs(false);
    }
  };

  const handleBackToList = () => {
    if (audioElement) {
      audioElement.pause();
      setPlayingAyah(null);
    }
    setSelectedSurah(null);
    setAyahs([]);
    setLoadError(null);
    setAudioErrorMsg(null);
  };

  const handleCopyAyah = (ayah: Ayah) => {
    if (!selectedSurah) return;
    const text = `"${ayah.translation}"\n(${selectedSurah.transliteration} surəsi, ${ayah.numberInSurah}-ci ayə)\n\n${ayah.arabic}`;
    navigator.clipboard.writeText(text);
    setCopiedAyahNumber(ayah.numberInSurah);
    setTimeout(() => setCopiedAyahNumber(null), 2000);
  };

  // Play audio recitation using Mishary Rashid Alafasy from EveryAyah public reliable CDN
  const handlePlayAyahAudio = (surahNumber: number, ayahNumber: number) => {
    if (playingAyah === ayahNumber && audioElement) {
      audioElement.pause();
      setPlayingAyah(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const sPad = surahNumber.toString().padStart(3, '0');
    const aPad = ayahNumber.toString().padStart(3, '0');
    const url = `https://everyayah.com/data/Alafasy_128kbps/${sPad}${aPad}.mp3`;

    try {
      const audio = new Audio(url);
      audio.play().catch((err) => {
        console.warn("Audio play error:", err);
        setPlayingAyah(null);
        setAudioErrorMsg("Qiraət bağlantısı əlçatmazdır.");
        setTimeout(() => setAudioErrorMsg(null), 3000);
      });

      audio.onended = () => {
        setPlayingAyah(null);
      };

      setAudioElement(audio);
      setPlayingAyah(ayahNumber);
    } catch (_err) {
      setPlayingAyah(null);
    }
  };

  const filteredSurahs = ALL_SURAHS.filter((surah) => {
    const matchesSearch =
      surah.transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.number.toString() === searchQuery.trim();

    const matchesFilter = filterType === 'all' || surah.revelationType === filterType;
    return matchesSearch && matchesFilter;
  });

  // Arabic font size classes based on readerFontSize
  const getArabicSizeClass = () => {
    switch (readerFontSize) {
      case 'small':
        return 'text-xl leading-loose';
      case 'large':
        return 'text-3xl leading-[2.6]';
      case 'medium':
      default:
        return 'text-2xl leading-[2.3]';
    }
  };

  // Translation font size classes based on readerFontSize
  const getTranslationSizeClass = () => {
    switch (readerFontSize) {
      case 'small':
        return 'text-xs sm:text-sm leading-relaxed';
      case 'large':
        return 'text-base sm:text-lg leading-relaxed';
      case 'medium':
      default:
        return 'text-sm sm:text-base leading-relaxed';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* View 1: Surah Detail Reader */}
      {selectedSurah ? (
        <div id="quran-reader-view" className="space-y-4">
          {/* Reader Top Navigation Bar */}
          <div className="sticky top-0 z-30 bg-[#fcfbf7]/95 dark:bg-[#09130e]/95 backdrop-blur-md py-3 px-1 border-b border-stone-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-2">
            <button
              id="quran-back-btn"
              onClick={handleBackToList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs font-semibold text-emerald-900 dark:text-emerald-300 hover:bg-stone-50 dark:hover:bg-emerald-900/40 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Surələr</span>
            </button>

            <div className="text-center">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center justify-center gap-1.5">
                <span>{selectedSurah.number}. {selectedSurah.transliteration}</span>
                <span className="font-arabic text-amber-500 font-bold">({selectedSurah.name})</span>
              </h3>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                {selectedSurah.totalAyahs} ayə • {selectedSurah.revelationType}
              </div>
            </div>

            {/* Font Size Adjuster Pill */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#0c1e15] p-1 rounded-xl border border-stone-200/80 dark:border-emerald-800/40 shadow-xs">
              <button
                onClick={() => setReaderFontSize('small')}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition ${
                  readerFontSize === 'small'
                    ? 'bg-[#064e3b] text-amber-300'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                A-
              </button>
              <button
                onClick={() => setReaderFontSize('medium')}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition ${
                  readerFontSize === 'medium'
                    ? 'bg-[#064e3b] text-amber-300'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                A
              </button>
              <button
                onClick={() => setReaderFontSize('large')}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition ${
                  readerFontSize === 'large'
                    ? 'bg-[#064e3b] text-amber-300'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                A+
              </button>
            </div>
          </div>

          {/* Surah Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#043327] p-6 text-white text-center shadow-md relative overflow-hidden border border-amber-400/25">
            <div className="absolute inset-0 opacity-10 bg-islamic-pattern pointer-events-none" />
            <h2 className="font-arabic font-bold text-3xl sm:text-4xl text-amber-300 tracking-wide">
              {selectedSurah.name}
            </h2>
            <div className="text-xl font-bold mt-1 text-white tracking-tight">
              {selectedSurah.transliteration}
            </div>
            <div className="text-xs text-emerald-200/90 mt-0.5 font-medium">
              Mənası: “{selectedSurah.translation}”
            </div>

            {/* Bismillah Header (Except Surah At-Tawbah #9) */}
            {selectedSurah.number !== 9 && (
              <div className="mt-5 pt-4 border-t border-emerald-600/40">
                <div
                  dir="rtl"
                  className="font-arabic font-bold text-2xl text-amber-200 text-center tracking-wider"
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
                <div className="text-[11px] text-emerald-200/80 mt-1">
                  Mərhəmətli və Rəhmli Allahın adı ilə!
                </div>
              </div>
            )}
          </div>

          {/* Audio Error Toast */}
          {audioErrorMsg && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold text-center animate-in fade-in">
              {audioErrorMsg}
            </div>
          )}

          {/* Loading State */}
          {loadingAyahs && (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-3 border-[#064e3b] border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                Ayələr yüklənir...
              </p>
            </div>
          )}

          {/* Load Error State */}
          {loadError && !loadingAyahs && (
            <div className="py-10 px-4 text-center space-y-3 bg-white dark:bg-[#0c1e15] rounded-2xl border border-stone-200/80 dark:border-emerald-800/40">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                {loadError}
              </p>
              <button
                onClick={() => handleSelectSurah(selectedSurah)}
                className="px-4 py-2 rounded-xl bg-[#064e3b] text-amber-300 text-xs font-bold shadow-xs hover:brightness-110 transition"
              >
                Yenidən yoxla
              </button>
            </div>
          )}

          {/* Ayah List */}
          {!loadingAyahs && !loadError && (
            <div className="space-y-3">
              {ayahs.map((ayah) => {
                const ayahKey = `${selectedSurah.number}:${ayah.numberInSurah}`;
                const isSaved = isBookmarked('ayah', ayahKey);
                const isPlaying = playingAyah === ayah.numberInSurah;

                return (
                  <div
                    key={ayah.numberInSurah}
                    id={`ayah-${ayah.numberInSurah}`}
                    className={`rounded-2xl p-4 sm:p-5 transition-all border ${
                      isPlaying
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                        : 'bg-white dark:bg-[#0c1e15] border-stone-200/80 dark:border-emerald-800/40 shadow-xs'
                    }`}
                  >
                    {/* Ayah Header Bar: Number Badge, Actions (Audio, Copy, Bookmark) */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-600/30 flex items-center justify-center font-bold text-xs text-[#064e3b] dark:text-amber-400">
                          {ayah.numberInSurah}
                        </div>
                        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                          Ayə {ayah.numberInSurah}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Audio Recitation Button */}
                        <button
                          onClick={() => handlePlayAyahAudio(selectedSurah.number, ayah.numberInSurah)}
                          className={`p-1.5 rounded-lg transition ${
                            isPlaying
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-stone-100 dark:hover:bg-emerald-900/40'
                          }`}
                          title={isPlaying ? "Səsi dayandır" : "Ayənin qiraətini dinlə"}
                          aria-label="Ayə qiraəti"
                        >
                          {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyAyah(ayah)}
                          className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
                          title="Ayəni kopyala"
                          aria-label="Ayəni kopyala"
                        >
                          {copiedAyahNumber === ayah.numberInSurah ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Bookmark Button */}
                        <button
                          onClick={() =>
                            onToggleBookmark({
                              type: 'ayah',
                              refId: ayahKey,
                              title: `${selectedSurah.transliteration} surəsi, ${ayah.numberInSurah}-ci ayə`,
                              subtitle: ayah.translation,
                              arabicText: ayah.arabic,
                            })
                          }
                          className={`p-1.5 rounded-lg transition ${
                            isSaved
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-stone-600 dark:text-stone-300 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-emerald-900/40'
                          }`}
                          title={isSaved ? "Yaddaşdan çıxar" : "Yadda saxla"}
                          aria-label="Ayəni yadda saxla"
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Arabic Verse (RTL) */}
                    <div
                      dir="rtl"
                      className={`font-arabic font-bold text-right text-emerald-950 dark:text-emerald-50 mt-4 tracking-wide ${getArabicSizeClass()}`}
                    >
                      {ayah.arabic}
                      <span className="inline-flex items-center justify-center mx-2 text-sm text-amber-500 font-bold border border-amber-400/40 rounded-full w-6 h-6 leading-none">
                        {ayah.numberInSurah}
                      </span>
                    </div>

                    {/* Azerbaijani Translation */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-emerald-900/20">
                      <div className="text-[11px] font-semibold text-emerald-800 dark:text-amber-400 uppercase tracking-wider mb-1">
                        Tərcümə (Məmmədəliyev & Bünyadov)
                      </div>
                      <p className={`text-stone-800 dark:text-stone-200 font-normal ${getTranslationSizeClass()}`}>
                        {ayah.translation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* View 2: Surah 114 Index List */
        <div id="quran-index-view" className="space-y-4">
          {/* Header Title & Description */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>Qurani-Kərim</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                114 Surə • Ərəbcə Uthmani mətni və Azərbaycan dilində tərcüməsi
              </p>
            </div>
          </div>

          {/* Last Read Resume Banner (if available) */}
          {lastRead && (
            <div
              id="quran-last-read-banner"
              onClick={() => {
                const surah = ALL_SURAHS.find((s) => s.number === lastRead.surahNumber);
                if (surah) handleSelectSurah(surah, lastRead.ayahNumber);
              }}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900/15 via-[#064e3b]/10 to-amber-500/10 dark:from-emerald-950/50 dark:to-[#04241b] border border-emerald-600/30 dark:border-amber-400/30 flex items-center justify-between cursor-pointer hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 text-amber-300 flex items-center justify-center font-bold shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-emerald-800 dark:text-amber-400 uppercase tracking-wider">
                    Son Oxunan Ayə
                  </div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {lastRead.surahName} surəsi, {lastRead.ayahNumber}-ci ayə
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-amber-400">
                <span>Davam et</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Search Bar & Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Surənin adını və ya nömrəsini axtarın (məs. Fatihə, Yasin, 36)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] dark:focus:ring-amber-400 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                >
                  Təmizlə
                </button>
              )}
            </div>

            {/* Filter Pills: Bütün, Məkkə, Mədinə */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition shrink-0 ${
                  filterType === 'all'
                    ? 'bg-[#064e3b] text-amber-300 font-semibold'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-emerald-800/40 hover:bg-stone-50'
                }`}
              >
                Bütün ({ALL_SURAHS.length})
              </button>
              <button
                onClick={() => setFilterType('Məkkə')}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition shrink-0 ${
                  filterType === 'Məkkə'
                    ? 'bg-[#064e3b] text-amber-300 font-semibold'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-emerald-800/40 hover:bg-stone-50'
                }`}
              >
                Məkkə ({ALL_SURAHS.filter((s) => s.revelationType === 'Məkkə').length})
              </button>
              <button
                onClick={() => setFilterType('Mədinə')}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition shrink-0 ${
                  filterType === 'Mədinə'
                    ? 'bg-[#064e3b] text-amber-300 font-semibold'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-emerald-800/40 hover:bg-stone-50'
                }`}
              >
                Mədinə ({ALL_SURAHS.filter((s) => s.revelationType === 'Mədinə').length})
              </button>
            </div>
          </div>

          {/* 114 Surahs Grid List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredSurahs.map((surah) => (
              <button
                key={surah.number}
                id={`surah-card-${surah.number}`}
                onClick={() => handleSelectSurah(surah)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 hover:shadow-md transition text-left group"
              >
                <div className="flex items-center gap-3">
                  {/* Number Badge */}
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-600/30 flex items-center justify-center font-bold text-xs text-[#064e3b] dark:text-amber-400 group-hover:scale-105 transition shrink-0">
                    {surah.number}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#064e3b] dark:group-hover:text-amber-400 transition">
                      {surah.transliteration}
                    </h3>
                    <div className="text-[11px] text-stone-600 dark:text-stone-300">
                      {surah.translation}
                    </div>
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                      {surah.totalAyahs} ayə • {surah.revelationType}
                    </div>
                  </div>
                </div>

                {/* Arabic Name (RTL) */}
                <div
                  dir="rtl"
                  className="font-arabic font-bold text-lg text-emerald-900 dark:text-amber-300"
                >
                  {surah.name}
                </div>
              </button>
            ))}
          </div>

          {filteredSurahs.length === 0 && (
            <div className="py-12 text-center text-stone-500">
              Axtarışa uyğun surə tapılmadı.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
