import React, { useState } from 'react';
import { X, Search, BookOpen, HeartHandshake, Hash, ArrowRight } from 'lucide-react';
import { ALL_SURAHS } from '../data/surahs';
import { ALL_DUAS } from '../data/duas';
import { POPULAR_ZIKRS } from '../data/zikrs';

interface SearchModalProps {
  onClose: () => void;
  onNavigateTab: (tabId: string, subParam?: any) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose, onNavigateTab }) => {
  const [query, setQuery] = useState<string>('');

  const trimmed = query.trim().toLowerCase();

  const matchingSurahs = trimmed
    ? ALL_SURAHS.filter(
        (s) =>
          s.transliteration.toLowerCase().includes(trimmed) ||
          s.translation.toLowerCase().includes(trimmed) ||
          s.number.toString() === trimmed
      ).slice(0, 5)
    : [];

  const matchingDuas = trimmed
    ? ALL_DUAS.filter(
        (d) =>
          d.title.toLowerCase().includes(trimmed) ||
          d.translation.toLowerCase().includes(trimmed) ||
          d.transliteration.toLowerCase().includes(trimmed)
      ).slice(0, 5)
    : [];

  const matchingZikrs = trimmed
    ? POPULAR_ZIKRS.filter(
        (z) =>
          z.title.toLowerCase().includes(trimmed) ||
          z.transliteration.toLowerCase().includes(trimmed) ||
          z.translation.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const totalResults = matchingSurahs.length + matchingDuas.length + matchingZikrs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1e15] w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 max-h-[80vh] flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-emerald-900/30">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quran surələri, dualar və ya zikrləri axtarın..."
            className="flex-1 text-sm bg-transparent text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin">
          {!trimmed && (
            <div className="py-8 text-center text-xs text-stone-400">
              Axtarış üçün açar söz daxil edin (məs. <span className="text-[#064e3b] dark:text-amber-400 font-semibold cursor-pointer" onClick={() => setQuery('Yasin')}>Yasin</span>, <span className="text-[#064e3b] dark:text-amber-400 font-semibold cursor-pointer" onClick={() => setQuery('bağışlanma')}>bağışlanma</span>, <span className="text-[#064e3b] dark:text-amber-400 font-semibold cursor-pointer" onClick={() => setQuery('təsbeh')}>təsbeh</span>)
            </div>
          )}

          {trimmed && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-stone-500">
              "{query}" üzrə heç bir nəticə tapılmadı.
            </div>
          )}

          {/* Surahs Section */}
          {matchingSurahs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Qurani-Kərim Surələri</span>
              </div>
              <div className="space-y-1.5">
                {matchingSurahs.map((surah) => (
                  <div
                    key={surah.number}
                    onClick={() => {
                      onClose();
                      onNavigateTab('quran', { surahNumber: surah.number });
                    }}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border border-stone-200/60 dark:border-emerald-800/30 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {surah.number}. {surah.transliteration} ({surah.name})
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {surah.translation} • {surah.totalAyahs} ayə
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duas Section */}
          {matchingDuas.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Dualar</span>
              </div>
              <div className="space-y-1.5">
                {matchingDuas.map((dua) => (
                  <div
                    key={dua.id}
                    onClick={() => {
                      onClose();
                      onNavigateTab('duas', { duaId: dua.id });
                    }}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-emerald-950/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-stone-200/60 dark:border-emerald-800/30 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {dua.title}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                        {dua.translation}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zikrs Section */}
          {matchingZikrs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                <span>Zikrlər</span>
              </div>
              <div className="space-y-1.5">
                {matchingZikrs.map((zikr) => (
                  <div
                    key={zikr.id}
                    onClick={() => {
                      onClose();
                      onNavigateTab('zikr', { zikrId: zikr.id });
                    }}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border border-stone-200/60 dark:border-emerald-800/30 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {zikr.transliteration}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {zikr.translation}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
