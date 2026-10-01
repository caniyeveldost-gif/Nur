import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Search,
  Bookmark,
  Copy,
  Check,
  Sparkles,
  Share2,
  ChevronDown,
  Volume2,
  VolumeX,
  Headphones,
  Pause,
  Play
} from 'lucide-react';
import { DUA_CATEGORIES, ALL_DUAS } from '../data/duas';
import { Dua } from '../types';
import { DuaAudioPlayer } from './DuaAudioPlayer';

interface DuasTabProps {
  initialDuaId?: string;
  onToggleBookmark: (item: { type: 'ayah' | 'dua' | 'zikr'; refId: string; title: string; subtitle: string; arabicText?: string }) => void;
  isBookmarked: (type: 'ayah' | 'dua' | 'zikr', refId: string) => boolean;
}

export const DuasTab: React.FC<DuasTabProps> = ({ initialDuaId, onToggleBookmark, isBookmarked }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio player state
  const [activeAudioDua, setActiveAudioDua] = useState<Dua | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  useEffect(() => {
    if (initialDuaId) {
      const match = ALL_DUAS.find((d) => d.id === initialDuaId);
      if (match) {
        setSelectedCategory(match.categoryId);
        setTimeout(() => {
          const el = document.getElementById(`dua-card-${match.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2500);
          }
        }, 300);
      }
    }
  }, [initialDuaId]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      setIsPlayingAudio(false);
      setActiveAudioDua(null);
    };
  }, []);

  const handleCopyDua = (dua: Dua) => {
    const text = `${dua.title}\n\nƏrəbcə:\n${dua.arabic}\n\nOxunuşu:\n${dua.transliteration}\n\nMənası:\n${dua.translation}\n\nMənbə: ${dua.source}`;
    navigator.clipboard.writeText(text);
    setCopiedId(dua.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDuas = ALL_DUAS.filter((dua) => {
    const matchesCategory = selectedCategory === 'all' || dua.categoryId === selectedCategory;
    const matchesSearch =
      dua.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dua.transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dua.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dua.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Audio handler per card
  const handleToggleDuaAudio = (dua: Dua) => {
    if (activeAudioDua?.id === dua.id) {
      setIsPlayingAudio(!isPlayingAudio);
    } else {
      setActiveAudioDua(dua);
      setIsPlayingAudio(true);
    }
  };

  // Next / Prev Dua navigation in the audio player
  const currentIndex = activeAudioDua ? filteredDuas.findIndex((d) => d.id === activeAudioDua.id) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < filteredDuas.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNextDua = () => {
    if (hasNext) {
      const next = filteredDuas[currentIndex + 1];
      setActiveAudioDua(next);
      setIsPlayingAudio(true);
      // smoothly scroll into view
      const el = document.getElementById(`dua-card-${next.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handlePrevDua = () => {
    if (hasPrev) {
      const prev = filteredDuas[currentIndex - 1];
      setActiveAudioDua(prev);
      setIsPlayingAudio(true);
      const el = document.getElementById(`dua-card-${prev.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handleCloseAudio = () => {
    setIsPlayingAudio(false);
    setActiveAudioDua(null);
  };

  return (
    <div id="duas-view" className={`space-y-4 ${activeAudioDua ? 'pb-36 sm:pb-32' : 'pb-16'}`}>
      {/* Title & Description */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
          <HeartHandshake className="w-5 h-5 text-amber-500" />
          <span>Dualar (Hisnul-Muslim)</span>
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-300">
          Quran və Səhih Sünnədən gündəlik həyat, səhər-axşam və sıxıntı duaları — səsli qiraət ilə
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Duanın adı və ya mənası üzrə axtarın..."
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

      {/* Categories Horizontal Scroll / Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[#064e3b] text-amber-300 font-semibold shadow-xs'
              : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
          }`}
        >
          Bütün dualar ({ALL_DUAS.length})
        </button>

        {DUA_CATEGORIES.map((cat) => {
          const count = ALL_DUAS.filter((d) => d.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#064e3b] text-amber-300 font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Duas Card List */}
      <div className="space-y-3.5">
        {filteredDuas.map((dua) => {
          const isSaved = isBookmarked('dua', dua.id);
          const isCardActive = activeAudioDua?.id === dua.id;
          const isCardPlaying = isCardActive && isPlayingAudio;

          return (
            <div
              key={dua.id}
              id={`dua-card-${dua.id}`}
              className={`rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0c1e15] border shadow-xs transition duration-200 ${
                isCardPlaying
                  ? 'border-amber-400/80 dark:border-amber-400/60 ring-2 ring-amber-400/20 shadow-md'
                  : isCardActive
                  ? 'border-emerald-600/60 dark:border-emerald-500/50'
                  : 'border-stone-200/80 dark:border-emerald-800/40 hover:border-emerald-600/40'
              }`}
            >
              {/* Header: Title and Actions */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100 dark:border-emerald-900/30">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {dua.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-medium text-emerald-800 dark:text-amber-400">
                      {DUA_CATEGORIES.find((c) => c.id === dua.categoryId)?.name}
                    </span>
                    {dua.repeatCount && dua.repeatCount > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold">
                        {dua.repeatCount} dəfə
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Listen / Audio Recitation Button */}
                  <button
                    onClick={() => handleToggleDuaAudio(dua)}
                    className={`px-2 py-1.5 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold ${
                      isCardPlaying
                        ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 ring-1 ring-amber-400/50'
                        : isCardActive
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'text-emerald-800 dark:text-amber-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 bg-stone-50 dark:bg-emerald-950/30 border border-stone-200/60 dark:border-emerald-800/30'
                    }`}
                    title={isCardPlaying ? "Qiraəti dayandır" : "Qiraəti dinlə"}
                    aria-label={isCardPlaying ? "Qiraəti dayandır" : "Qiraəti dinlə"}
                  >
                    {isCardPlaying ? (
                      <>
                        <span className="flex items-end gap-0.5 h-3.5 w-3 justify-center">
                          <span className="w-0.5 bg-amber-500 rounded-full animate-pulse h-2" />
                          <span className="w-0.5 bg-amber-500 rounded-full animate-pulse h-3.5 delay-75" />
                          <span className="w-0.5 bg-amber-500 rounded-full animate-pulse h-2 delay-150" />
                        </span>
                        <span className="text-[11px]">Pauza</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-400" />
                        <span className="text-[11px]">Dinlə</span>
                      </>
                    )}
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyDua(dua)}
                    className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
                    title="Duanı kopyala"
                    aria-label="Duanı kopyala"
                  >
                    {copiedId === dua.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* Bookmark Button */}
                  <button
                    onClick={() =>
                      onToggleBookmark({
                        type: 'dua',
                        refId: dua.id,
                        title: dua.title,
                        subtitle: dua.translation,
                        arabicText: dua.arabic,
                      })
                    }
                    className={`p-1.5 rounded-lg transition ${
                      isSaved
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-stone-600 dark:text-stone-300 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-emerald-900/40'
                    }`}
                    title={isSaved ? "Yaddaşdan çıxar" : "Yadda saxla"}
                    aria-label="Duanı yadda saxla"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Arabic Text (RTL) */}
              <div
                dir="rtl"
                className="font-arabic font-bold text-xl sm:text-2xl text-right text-emerald-950 dark:text-emerald-50 mt-4 leading-loose tracking-wide"
              >
                {dua.arabic}
              </div>

              {/* Azerbaijani Transliteration */}
              <div className="mt-3 text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 font-medium italic bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-900/10">
                <span className="font-bold not-italic mr-1">Oxunuşu:</span>
                {dua.transliteration}
              </div>

              {/* Azerbaijani Meaning */}
              <div className="mt-2.5 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-normal">
                <span className="font-semibold text-stone-900 dark:text-stone-100 mr-1">Tərcüməsi:</span>
                “{dua.translation}”
              </div>

              {/* Source / Citation & Reciter info */}
              <div className="mt-3 pt-2 border-t border-stone-100 dark:border-emerald-900/30 text-[11px] text-stone-600 dark:text-stone-300 flex items-center justify-between">
                <span>Mənbə: {dua.source}</span>
                {isCardActive && (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-amber-400 font-medium">
                    <Headphones className="w-3 h-3" />
                    <span>{isCardPlaying ? 'Qiraət oxunur' : 'Dayandırılıb'}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDuas.length === 0 && (
        <div className="py-12 text-center text-stone-500">
          Bu axtarışa uyğun dua tapılmadı.
        </div>
      )}

      {/* Floating Dua Audio Player Bar */}
      {activeAudioDua && (
        <DuaAudioPlayer
          currentDua={activeAudioDua}
          isPlaying={isPlayingAudio}
          onTogglePlay={() => setIsPlayingAudio(!isPlayingAudio)}
          onNextDua={handleNextDua}
          onPrevDua={handlePrevDua}
          onClose={handleCloseAudio}
          hasNext={hasNext}
          hasPrev={hasPrev}
        />
      )}
    </div>
  );
};
