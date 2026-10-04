import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  ArrowLeft,
  Bookmark,
  Copy,
  Check,
  Volume2,
  Share2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Sliders,
  SlidersHorizontal
} from 'lucide-react';
import { ALL_SURAHS, PRELOADED_SURAHS } from '../data/surahs';
import { fetchSurahAyahs } from '../services/apiService';
import { getCachedSurahNumbers, getSurahFromIndexedDB } from '../services/quranDb';
import { safeStorage } from '../services/storageHelper';
import { Surah, Ayah, LastRead } from '../types';

interface QuranTabProps {
  initialSurahNumber?: number;
  initialAyahNumber?: number;
  onToggleBookmark: (item: { type: 'ayah' | 'dua' | 'zikr'; refId: string; title: string; subtitle: string; arabicText?: string }) => void;
  isBookmarked: (type: 'ayah' | 'dua' | 'zikr', refId: string) => boolean;
  globalFontSize: 'small' | 'medium' | 'large' | 'xlarge';
}

// Helper for Azerbaijani case-insensitive search (handles İ/i, I/ı, Ə/ə, Ö/ö, Ü/ü, Ş/ş, Ç/ç, Ğ/ğ)
function toAzLower(str: string): string {
  try {
    return str.toLocaleLowerCase('az').normalize('NFC');
  } catch (_e) {
    return str.toLowerCase();
  }
}

export const QuranTab: React.FC<QuranTabProps> = ({
  initialSurahNumber,
  initialAyahNumber,
  onToggleBookmark,
  isBookmarked,
  globalFontSize,
}) => {
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ayahSearchQuery, setAyahSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'Məkkə' | 'Mədinə'>('all');

  // Reader customization state
  const [readerFontSize, setReaderFontSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>(
    globalFontSize || 'medium'
  );
  const [lineHeight, setLineHeight] = useState<'comfortable' | 'normal' | 'compact'>('comfortable');
  const [autoNextAyah, setAutoNextAyah] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] = useState<boolean>(false);

  // Last read persistence
  const [lastRead, setLastRead] = useState<LastRead | null>(() =>
    safeStorage.getItem<LastRead | null>('nur_last_read_quran', null)
  );

  const [copiedAyahNumber, setCopiedAyahNumber] = useState<number | null>(null);
  const [sharedAyahNumber, setSharedAyahNumber] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSurahPlaying, setIsSurahPlaying] = useState<boolean>(false);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [audioQueueIndex, setAudioQueueIndex] = useState<number | null>(null);
  const [audioErrorMsg, setAudioErrorMsg] = useState<string | null>(null);
  const [cachedSurahs, setCachedSurahs] = useState<Set<number>>(
    () => new Set(Object.keys(PRELOADED_SURAHS).map(Number))
  );
  const [cachedAyahsMap, setCachedAyahsMap] = useState<Record<number, Ayah[]>>(
    () => ({ ...PRELOADED_SURAHS })
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedUrlRef = useRef<string>('');
  const playbackSessionRef = useRef<number>(0);
  const playbackSpeedRef = useRef<number>(1.0);
  const autoNextAyahRef = useRef<boolean>(true);
  const forceSurahContinuousRef = useRef<boolean>(true);
  const consecutiveAudioErrorsRef = useRef<number>(0);
  const errorToastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    autoNextAyahRef.current = autoNextAyah;
  }, [autoNextAyah]);

  // Sync cached surah numbers and ayahs from IndexedDB for offline indicator & global search
  useEffect(() => {
    getCachedSurahNumbers()
      .then(async (nums) => {
        setCachedSurahs((prev) => {
          const next = new Set(prev);
          nums.forEach((n) => next.add(n));
          return next;
        });
        const entries: Record<number, Ayah[]> = {};
        for (const num of nums) {
          const stored = await getSurahFromIndexedDB(num);
          if (stored && stored.length > 0) {
            entries[num] = stored;
          }
        }
        if (Object.keys(entries).length > 0) {
          setCachedAyahsMap((prev) => ({ ...prev, ...entries }));
        }
      })
      .catch(() => {});
  }, []);

  // Initial navigation
  useEffect(() => {
    if (initialSurahNumber) {
      const found = ALL_SURAHS.find((s) => s.number === initialSurahNumber);
      if (found) {
        handleSelectSurah(found, initialAyahNumber);
      }
    }
  }, [initialSurahNumber, initialAyahNumber]);

  const showAudioError = (msg: string) => {
    setAudioErrorMsg(msg);
    if (errorToastTimeoutRef.current) {
      window.clearTimeout(errorToastTimeoutRef.current);
    }
    errorToastTimeoutRef.current = window.setTimeout(() => {
      setAudioErrorMsg(null);
    }, 3500);
  };

  const cleanupAudio = () => {
    playbackSessionRef.current += 1;
    consecutiveAudioErrorsRef.current = 0;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
      try {
        audioRef.current.load();
      } catch (_e) {}
    }
    if (preloadAudioRef.current) {
      preloadAudioRef.current.onended = null;
      preloadAudioRef.current.onerror = null;
      preloadAudioRef.current.removeAttribute('src');
      try {
        preloadAudioRef.current.load();
      } catch (_e) {}
    }
    preloadedUrlRef.current = '';
  };

  const handleStopSurahAudio = () => {
    cleanupAudio();
    setIsPlaying(false);
    setIsPaused(false);
    setIsSurahPlaying(false);
    setPlayingAyah(null);
    setCurrentAudioUrl('');
    setAudioQueueIndex(null);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (errorToastTimeoutRef.current) {
        window.clearTimeout(errorToastTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectSurah = async (surah: Surah, startAyah?: number) => {
    handleStopSurahAudio();
    setSelectedSurah(surah);
    setLoadingAyahs(true);
    setLoadError(null);
    setAudioErrorMsg(null);
    setAyahSearchQuery('');

    try {
      const data = await fetchSurahAyahs(surah.number);
      setAyahs(data);
      setCachedSurahs((prev) => {
        const next = new Set(prev);
        next.add(surah.number);
        return next;
      });
      setCachedAyahsMap((prev) => ({ ...prev, [surah.number]: data }));

      // Save as last read
      const newLastRead: LastRead = {
        surahNumber: surah.number,
        surahName: surah.transliteration,
        ayahNumber: startAyah || 1,
        timestamp: new Date().toISOString(),
      };
      setLastRead(newLastRead);
      safeStorage.setItem('nur_last_read_quran', newLastRead);

      // Scroll to startAyah if specified
      if (startAyah) {
        setTimeout(() => {
          const el = document.getElementById(`ayah-${startAyah}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2500);
          }
        }, 350);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error('Error loading surah:', e);
      setLoadError('Bu surə hələ offline yadda saxlanılmayıb. İnternetə qoşulduqda surəni bir dəfə açın.');
    } finally {
      setLoadingAyahs(false);
    }
  };

  const handleBackToList = () => {
    handleStopSurahAudio();
    setSelectedSurah(null);
    setAyahs([]);
    setLoadError(null);
    setAudioErrorMsg(null);
    setAyahSearchQuery('');
  };

  const handleNextSurah = () => {
    if (!selectedSurah || selectedSurah.number >= 114) return;
    const next = ALL_SURAHS.find((s) => s.number === selectedSurah.number + 1);
    if (next) handleSelectSurah(next);
  };

  const handlePrevSurah = () => {
    if (!selectedSurah || selectedSurah.number <= 1) return;
    const prev = ALL_SURAHS.find((s) => s.number === selectedSurah.number - 1);
    if (prev) handleSelectSurah(prev);
  };

  const handleCopyAyah = (ayah: Ayah) => {
    if (!selectedSurah) return;
    const text = `"${ayah.translation}"\n(${selectedSurah.transliteration} surəsi, ${ayah.numberInSurah}-ci ayə)\n\n${ayah.arabic}`;
    navigator.clipboard.writeText(text);
    setCopiedAyahNumber(ayah.numberInSurah);
    setTimeout(() => setCopiedAyahNumber(null), 2000);
  };

  const handleShareAyah = async (ayah: Ayah) => {
    if (!selectedSurah) return;
    const title = `${selectedSurah.transliteration} surəsi, ${ayah.numberInSurah}-ci ayə`;
    const text = `"${ayah.translation}"\n\n${ayah.arabic}\n\n— Qurani-Kərim (${title})`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: window.location.href });
        setSharedAyahNumber(ayah.numberInSurah);
        setTimeout(() => setSharedAyahNumber(null), 2000);
        return;
      } catch (_e) {}
    }
    handleCopyAyah(ayah);
  };

  const getAyahAudioUrl = (surahNumber: number, ayahNumber: number): string => {
    const sPad = surahNumber.toString().padStart(3, '0');
    const aPad = ayahNumber.toString().padStart(3, '0');
    return `https://everyayah.com/data/Alafasy_128kbps/${sPad}${aPad}.mp3`;
  };

  const preloadNextAyahAudio = (surahNumber: number, nextAyahNumber: number, totalAyahs: number) => {
    if (nextAyahNumber > totalAyahs) {
      preloadedUrlRef.current = '';
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const nextUrl = getAyahAudioUrl(surahNumber, nextAyahNumber);
      if (!preloadAudioRef.current) {
        preloadAudioRef.current = new Audio();
        preloadAudioRef.current.preload = 'auto';
      }
      if (preloadedUrlRef.current !== nextUrl) {
        preloadAudioRef.current.src = nextUrl;
        preloadAudioRef.current.load();
        preloadedUrlRef.current = nextUrl;
      }
    } catch (_e) {}
  };

  // Core Surah & Ayah sequential audio queue using preloaded audio promotion and session token guard
  const startAyahPlayback = (surah: Surah, ayahNumber: number, forceContinuous: boolean) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleStopSurahAudio();
      showAudioError('Bu ayənin səsi yüklənmədi. İnternet bağlantınızı yoxlayın.');
      return;
    }

    playbackSessionRef.current += 1;
    const sessionId = playbackSessionRef.current;
    forceSurahContinuousRef.current = forceContinuous;

    const url = getAyahAudioUrl(surah.number, ayahNumber);

    setPlayingAyah(ayahNumber);
    setAudioQueueIndex(ayahNumber - 1);
    setCurrentAudioUrl(url);
    setIsPlaying(true);
    setIsPaused(false);
    setIsSurahPlaying(true);

    // Update last read position
    const updatedLastRead: LastRead = {
      surahNumber: surah.number,
      surahName: surah.transliteration,
      ayahNumber,
      timestamp: new Date().toISOString(),
    };
    setLastRead(updatedLastRead);
    safeStorage.setItem('nur_last_read_quran', updatedLastRead);

    // Scroll active ayah into view smoothly
    const el = document.getElementById(`ayah-${ayahNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    try {
      let audio: HTMLAudioElement;

      // If this exact ayah URL was already preloaded in preloadAudioRef, promote it directly without re-downloading!
      if (preloadAudioRef.current && preloadedUrlRef.current === url) {
        if (audioRef.current && audioRef.current !== preloadAudioRef.current) {
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
        }
        audio = preloadAudioRef.current;
        audioRef.current = audio;
        preloadAudioRef.current = null;
        preloadedUrlRef.current = '';
      } else {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audio = audioRef.current;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = url;
      }

      audio.playbackRate = playbackSpeedRef.current;

      // Immediately preload the next ayah in the background
      preloadNextAyahAudio(surah.number, ayahNumber + 1, surah.totalAyahs);

      const handleAyahFailure = () => {
        if (playbackSessionRef.current !== sessionId) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          handleStopSurahAudio();
          showAudioError('Bu ayənin səsi yüklənmədi. İnternet bağlantınızı yoxlayın.');
          return;
        }
        consecutiveAudioErrorsRef.current += 1;
        showAudioError('Bu ayənin səsi yüklənmədi. İnternet bağlantınızı yoxlayın.');

        const shouldContinue = forceSurahContinuousRef.current || autoNextAyahRef.current;
        if (shouldContinue && ayahNumber < surah.totalAyahs && consecutiveAudioErrorsRef.current < 3) {
          startAyahPlayback(surah, ayahNumber + 1, forceSurahContinuousRef.current);
        } else {
          handleStopSurahAudio();
        }
      };

      audio.onerror = handleAyahFailure;

      audio.onended = () => {
        if (playbackSessionRef.current !== sessionId) return;
        consecutiveAudioErrorsRef.current = 0;

        const shouldContinue = forceSurahContinuousRef.current || autoNextAyahRef.current;
        if (shouldContinue && ayahNumber < surah.totalAyahs) {
          startAyahPlayback(surah, ayahNumber + 1, forceSurahContinuousRef.current);
        } else {
          // End of surah reached: stop cleanly without looping back to ayah 1
          setIsPlaying(false);
          setIsPaused(false);
          setIsSurahPlaying(false);
          setPlayingAyah(null);
          setAudioQueueIndex(null);
        }
      };

      audio.play().catch((err) => {
        if (playbackSessionRef.current !== sessionId) return;
        console.warn('Audio play error:', err);
        handleAyahFailure();
      });
    } catch (_err) {
      handleStopSurahAudio();
    }
  };

  // Master Surah Play / Pause / Resume handler
  const handleToggleSurahPlay = () => {
    if (!selectedSurah) return;

    // 1. Currently playing -> Pause without losing queue or currentTime
    if (isSurahPlaying && playingAyah !== null && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
      setIsSurahPlaying(false);
      return;
    }

    // 2. Currently paused on an ayah -> Resume from exact currentTime
    if (!isSurahPlaying && isPaused && playingAyah !== null && audioRef.current && audioRef.current.src) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showAudioError('Bu ayənin səsi yüklənmədi. İnternet bağlantınızı yoxlayın.');
        return;
      }
      forceSurahContinuousRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      setIsSurahPlaying(true);
      audioRef.current.playbackRate = playbackSpeedRef.current;
      audioRef.current.play().catch(() => {
        startAyahPlayback(selectedSurah, playingAyah, true);
      });
      return;
    }

    // 3. Stopped -> Start full surah from Ayah 1 through totalAyahs
    consecutiveAudioErrorsRef.current = 0;
    startAyahPlayback(selectedSurah, 1, true);
  };

  // Individual Ayah Play / Pause button handler (always continues to the end of the surah by default)
  const handlePlayAyahAudio = (_surahNumber: number, ayahNumber: number) => {
    if (!selectedSurah) return;

    if (playingAyah === ayahNumber && audioRef.current) {
      if (isSurahPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPaused(true);
        setIsSurahPlaying(false);
        return;
      } else if (isPaused && audioRef.current.src) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          showAudioError('Bu ayənin səsi yüklənmədi. İnternet bağlantınızı yoxlayın.');
          return;
        }
        setIsPlaying(true);
        setIsPaused(false);
        setIsSurahPlaying(true);
        audioRef.current.playbackRate = playbackSpeedRef.current;
        audioRef.current.play().catch(() => {
          startAyahPlayback(selectedSurah, ayahNumber, true);
        });
        return;
      }
    }

    consecutiveAudioErrorsRef.current = 0;
    startAyahPlayback(selectedSurah, ayahNumber, true);
  };

  const handlePrevAyahAudio = () => {
    if (!selectedSurah || playingAyah === null || playingAyah <= 1) return;
    consecutiveAudioErrorsRef.current = 0;
    startAyahPlayback(selectedSurah, playingAyah - 1, true);
  };

  const handleNextAyahAudio = () => {
    if (!selectedSurah || playingAyah === null || playingAyah >= selectedSurah.totalAyahs) return;
    consecutiveAudioErrorsRef.current = 0;
    startAyahPlayback(selectedSurah, playingAyah + 1, true);
  };

  const handleCycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const next = speeds[nextIdx];
    setPlaybackSpeed(next);
    playbackSpeedRef.current = next;
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  // Filtering surahs in list view (Azerbaijani locale-aware)
  const filteredSurahs = ALL_SURAHS.filter((surah) => {
    const q = toAzLower(searchQuery.trim());
    const matchesSearch =
      !q ||
      toAzLower(surah.transliteration).includes(q) ||
      toAzLower(surah.translation).includes(q) ||
      surah.name.includes(searchQuery.trim()) ||
      surah.number.toString() === searchQuery.trim();

    const matchesFilter = filterType === 'all' || surah.revelationType === filterType;
    return matchesSearch && matchesFilter;
  });

  // Cross-surah ayah text search across preloaded + IndexedDB cached surahs
  const matchedAyahsAcrossSurahs = React.useMemo(() => {
    const q = toAzLower(searchQuery.trim());
    if (q.length < 2) return [];
    const results: Array<{ surah: Surah; ayah: Ayah }> = [];
    for (const surah of ALL_SURAHS) {
      const surahAyahs = cachedAyahsMap[surah.number];
      if (!surahAyahs) continue;
      for (const ayah of surahAyahs) {
        if (
          toAzLower(ayah.translation).includes(q) ||
          ayah.arabic.includes(searchQuery.trim())
        ) {
          results.push({ surah, ayah });
          if (results.length >= 12) return results;
        }
      }
    }
    return results;
  }, [searchQuery, cachedAyahsMap]);

  // Filtering ayahs inside open surah (Azerbaijani locale-aware)
  const filteredAyahs = ayahs.filter((ayah) => {
    if (!ayahSearchQuery) return true;
    const q = toAzLower(ayahSearchQuery.trim());
    return (
      toAzLower(ayah.translation).includes(q) ||
      ayah.arabic.includes(ayahSearchQuery.trim()) ||
      ayah.numberInSurah.toString() === q
    );
  });

  // Arabic font size classes
  const getArabicSizeClass = () => {
    switch (readerFontSize) {
      case 'small':
        return 'text-xl sm:text-2xl';
      case 'large':
        return 'text-3xl sm:text-4xl';
      case 'xlarge':
        return 'text-4xl sm:text-5xl';
      case 'medium':
      default:
        return 'text-2xl sm:text-3xl';
    }
  };

  // Translation font size classes
  const getTranslationSizeClass = () => {
    switch (readerFontSize) {
      case 'small':
        return 'text-xs sm:text-sm';
      case 'large':
        return 'text-base sm:text-lg';
      case 'xlarge':
        return 'text-lg sm:text-xl';
      case 'medium':
      default:
        return 'text-sm sm:text-base';
    }
  };

  const getLineHeightClass = () => {
    switch (lineHeight) {
      case 'compact':
        return 'leading-normal';
      case 'normal':
        return 'leading-relaxed';
      case 'comfortable':
      default:
        return 'leading-loose';
    }
  };

  return (
    <div className="space-y-4 pb-14 animate-in fade-in duration-200">
      {/* View 1: Surah Detail Reader */}
      {selectedSurah ? (
        <div id="quran-reader-view" className="space-y-4">
          {/* Reader Top Navigation Bar */}
          <div className="sticky top-0 z-30 bg-[#fcfbf7]/95 dark:bg-[#09130e]/95 backdrop-blur-md py-2.5 px-1 border-b border-stone-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-2 shadow-xs">
            <button
              id="quran-back-btn"
              onClick={handleBackToList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs font-semibold text-emerald-900 dark:text-emerald-300 hover:bg-stone-50 dark:hover:bg-emerald-900/40 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Surələr</span>
            </button>

            <div className="text-center min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center justify-center gap-1.5 truncate">
                <span>{selectedSurah.number}. {selectedSurah.transliteration}</span>
                <span className="font-arabic text-amber-500 font-bold hidden xs:inline">({selectedSurah.name})</span>
              </h3>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">
                {selectedSurah.totalAyahs} ayə • {selectedSurah.revelationType}
              </div>
            </div>

            {/* Controls: Reader Settings Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsReaderSettingsOpen(!isReaderSettingsOpen)}
                className={`p-2 rounded-xl border text-xs font-semibold transition ${
                  isReaderSettingsOpen
                    ? 'bg-[#064e3b] text-amber-300 border-[#064e3b]'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
                }`}
                title="Şrift və qiraət tənzimləmələri"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reader Customization Panel (Accordion) */}
          {isReaderSettingsOpen && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-sm space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-emerald-900/30">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>Qiraət və Şrift Tənzimləmələri</span>
                </span>
                <button
                  onClick={() => setIsReaderSettingsOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  Bağla
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Font Size */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                    Şrift Ölçüsü:
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setReaderFontSize(size)}
                        className={`py-1 text-[11px] font-bold rounded-lg border transition ${
                          readerFontSize === size
                            ? 'bg-[#064e3b] text-amber-300 border-[#064e3b]'
                            : 'bg-stone-50 dark:bg-emerald-950/40 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-emerald-800/40'
                        }`}
                      >
                        {size === 'small' ? 'A-' : size === 'medium' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Spacing */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                    Sətir Aralığı:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['compact', 'normal', 'comfortable'] as const).map((lh) => (
                      <button
                        key={lh}
                        onClick={() => setLineHeight(lh)}
                        className={`py-1 text-[10px] font-semibold rounded-lg border transition ${
                          lineHeight === lh
                            ? 'bg-[#064e3b] text-amber-300 border-[#064e3b]'
                            : 'bg-stone-50 dark:bg-emerald-950/40 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-emerald-800/40'
                        }`}
                      >
                        {lh === 'compact' ? 'Kompakt' : lh === 'normal' ? 'Normal' : 'Rahat'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Auto-next & Speed */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                    Audio Seçimləri:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAutoNextAyah(!autoNextAyah)}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition ${
                        autoNextAyah
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-amber-300 dark:border-emerald-700'
                          : 'bg-stone-50 dark:bg-emerald-950/40 text-stone-500 border-stone-200 dark:border-emerald-800/40'
                      }`}
                    >
                      {autoNextAyah ? 'Ayələri ardıcıl oxu: Açıq' : 'Ayələri ardıcıl oxu: Qapalı'}
                    </button>

                    <button
                      onClick={handleCycleSpeed}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-stone-100 dark:bg-emerald-950/50 text-stone-800 dark:text-amber-400 border border-stone-200 dark:border-emerald-800/40"
                      title="Qiraət sürəti"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Surah Banner Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#043327] p-5 sm:p-6 text-white text-center shadow-md relative overflow-hidden border border-amber-400/25">
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
              <div className="mt-4 pt-4 border-t border-emerald-600/40">
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

            {/* Full Surah Audio Player Bar */}
            <div className="mt-4 pt-4 border-t border-emerald-600/40 flex flex-col items-center gap-2.5">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  id="surah-play-btn"
                  onClick={handleToggleSurahPlay}
                  disabled={loadingAyahs || !!loadError}
                  aria-label={
                    isSurahPlaying
                      ? 'Quranı dayandır'
                      : playingAyah !== null
                      ? 'Davam et'
                      : 'Surəni dinlə'
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSurahPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Dayandır</span>
                    </>
                  ) : playingAyah !== null ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Davam et</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Surəni dinlə</span>
                    </>
                  )}
                </button>

                {playingAyah !== null && (
                  <>
                    <button
                      id="surah-prev-ayah-btn"
                      onClick={handlePrevAyahAudio}
                      disabled={playingAyah <= 1}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-900/70 hover:bg-emerald-900 text-amber-200 border border-amber-400/30 text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                      title="Əvvəlki ayə"
                      aria-label="Əvvəlki ayə"
                    >
                      <SkipBack className="w-4 h-4" />
                      <span className="hidden sm:inline">Əvvəlki ayə</span>
                    </button>

                    <button
                      id="surah-next-ayah-btn"
                      onClick={handleNextAyahAudio}
                      disabled={playingAyah >= selectedSurah.totalAyahs}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-900/70 hover:bg-emerald-900 text-amber-200 border border-amber-400/30 text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                      title="Növbəti ayə"
                      aria-label="Növbəti ayə"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span className="hidden sm:inline">Növbəti ayə</span>
                    </button>

                    <button
                      id="surah-stop-btn"
                      onClick={handleStopSurahAudio}
                      aria-label="Tam dayandır"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-950 text-amber-200 border border-amber-400/30 text-xs font-semibold transition cursor-pointer"
                      title="Qiraəti tam dayandır"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Tam dayandır</span>
                    </button>
                  </>
                )}

                <button
                  onClick={handleCycleSpeed}
                  aria-label="Qiraət sürəti"
                  className="px-2.5 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-amber-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                  title="Qiraət sürəti (0.75x, 1x, 1.25x, 1.5x, 2x)"
                >
                  {playbackSpeed}x
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-emerald-100/90">
                <span>Qari: Mishary Rashid Alafasy</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-amber-200 text-[10px]">
                  Onlayn qiraət
                </span>
              </div>

              {playingAyah !== null && (
                <div
                  id="surah-audio-progress"
                  data-audio-url={currentAudioUrl}
                  data-is-playing={isPlaying}
                  className="w-full max-w-md bg-emerald-950/50 border border-amber-400/30 rounded-xl px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2"
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <Volume2 className={`w-4 h-4 text-amber-400 ${isSurahPlaying ? 'animate-pulse' : ''}`} />
                    <span>
                      {isSurahPlaying
                        ? `${selectedSurah.transliteration} • Ayə ${playingAyah} oxunur`
                        : `${selectedSurah.transliteration} • Ayə ${playingAyah} (fasilə)`}
                    </span>
                  </span>
                  <span className="font-mono font-bold text-amber-300" data-queue-index={audioQueueIndex ?? 0}>
                    {playingAyah} / {selectedSurah.totalAyahs}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* In-surah Ayah Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ayahSearchQuery}
              onChange={(e) => setAyahSearchQuery(e.target.value)}
              placeholder="Bu surə daxilində ayə və ya kəlmə axtarın..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] dark:focus:ring-amber-400 shadow-xs"
            />
            {ayahSearchQuery && (
              <button
                onClick={() => setAyahSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
              >
                Təmizlə
              </button>
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
              {filteredAyahs.map((ayah) => {
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
                        : 'bg-white dark:bg-[#0c1e15] border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600/40'
                    }`}
                  >
                    {/* Ayah Header Bar: Number Badge, Actions (Audio, Copy, Bookmark, Share) */}
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
                          title={
                            isPlaying && isSurahPlaying
                              ? 'Qiraəti fasiləyə qoy'
                              : isPlaying && !isSurahPlaying
                              ? 'Qiraətə davam et'
                              : 'Ayəni dinlə'
                          }
                          aria-label="Ayəni dinlə"
                        >
                          {isPlaying && isSurahPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
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

                        {/* Share Button */}
                        <button
                          onClick={() => handleShareAyah(ayah)}
                          className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
                          title="Ayəni paylaş"
                          aria-label="Ayəni paylaş"
                        >
                          {sharedAyahNumber === ayah.numberInSurah ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Share2 className="w-4 h-4" />
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
                          title={isSaved ? 'Yaddaşdan çıxar' : 'Yadda saxla'}
                          aria-label="Ayəni yadda saxla"
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Arabic Verse (RTL) */}
                    <div
                      dir="rtl"
                      className={`font-arabic font-bold text-right text-emerald-950 dark:text-emerald-50 mt-4 tracking-wide ${getArabicSizeClass()} ${getLineHeightClass()}`}
                    >
                      {ayah.arabic}
                      <span className="inline-flex items-center justify-center mx-2 text-xs sm:text-sm text-amber-500 font-bold border border-amber-400/40 rounded-full w-6 h-6 leading-none">
                        {ayah.numberInSurah}
                      </span>
                    </div>

                    {/* Azerbaijani Translation */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-emerald-900/20">
                      <div className="text-[10px] font-semibold text-emerald-800 dark:text-amber-400 uppercase tracking-wider mb-1">
                        Tərcümə (Əlixan Musayev / Məmmədəliyev & Bünyadov)
                      </div>
                      <p className={`text-stone-800 dark:text-stone-200 font-normal leading-relaxed ${getTranslationSizeClass()}`}>
                        {ayah.translation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredAyahs.length === 0 && !loadingAyahs && (
            <div className="py-12 text-center text-stone-500">
              Axtarışa uyğun ayə tapılmadı.
            </div>
          )}

          {/* Bottom Previous & Next Surah Navigation Buttons */}
          <div className="mt-6 pt-4 border-t border-stone-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-2">
            <button
              onClick={handlePrevSurah}
              disabled={selectedSurah.number <= 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs font-semibold text-stone-700 dark:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Əvvəlki Surə</span>
            </button>

            <button
              onClick={handleNextSurah}
              disabled={selectedSurah.number >= 114}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs font-semibold text-stone-700 dark:text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition"
            >
              <span>Növbəti Surə</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
                114 Surə • 30 Cüz • Offline hazır: {cachedSurahs.size} / 114
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 text-amber-300 flex items-center justify-center font-bold shrink-0 shadow-xs">
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
                placeholder="Surə adını, nömrəsini və ya ayə mətnini axtarın (məs. Fatihə, Yasin, 36, mərhəmət)..."
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

          {/* Cross-surah Matched Ayahs Section (when searching by ayah text) */}
          {matchedAyahsAcrossSurahs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-emerald-900 dark:text-amber-400">
                Ayə mətni üzrə uyğun nəticələr ({matchedAyahsAcrossSurahs.length}):
              </div>
              <div className="space-y-2">
                {matchedAyahsAcrossSurahs.map(({ surah, ayah }) => (
                  <button
                    key={`${surah.number}-${ayah.numberInSurah}`}
                    onClick={() => handleSelectSurah(surah, ayah.numberInSurah)}
                    className="w-full text-left p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-emerald-600/30 dark:border-amber-400/30 hover:border-emerald-600 dark:hover:border-amber-400 shadow-xs transition space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#064e3b] dark:text-amber-400">
                      <span>
                        {surah.number}. {surah.transliteration} surəsi • {ayah.numberInSurah}-ci ayə
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-200 line-clamp-2">
                      {ayah.translation}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 114 Surahs Grid List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredSurahs.map((surah) => {
              return (
                <button
                  key={surah.number}
                  id={`surah-card-${surah.number}`}
                  onClick={() => handleSelectSurah(surah)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 dark:hover:border-amber-400/60 hover:shadow-md transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    {/* Number Badge */}
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-600/30 flex items-center justify-center font-bold text-xs text-[#064e3b] dark:text-amber-400 group-hover:scale-105 transition shrink-0 shadow-xs">
                      {surah.number}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#064e3b] dark:group-hover:text-amber-400 transition">
                        {surah.transliteration}
                      </h3>
                      <div className="text-[11px] text-stone-600 dark:text-stone-300">
                        {surah.translation}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                        <span>{surah.totalAyahs} ayə</span>
                        <span>•</span>
                        <span>{surah.revelationType}</span>
                        {cachedSurahs.has(surah.number) && (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-amber-300 font-semibold">
                            Offline
                          </span>
                        )}
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
              );
            })}
          </div>

          {filteredSurahs.length === 0 && matchedAyahsAcrossSurahs.length === 0 && (
            <div className="py-12 text-center text-stone-500">
              Axtarışa uyğun surə və ya ayə tapılmadı.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
