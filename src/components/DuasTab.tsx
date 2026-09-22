import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Search,
  Bookmark,
  Copy,
  Check,
  Sparkles,
  Share2,
  ChevronDown
} from 'lucide-react';
import { DUA_CATEGORIES, ALL_DUAS } from '../data/duas';
import { Dua } from '../types';

interface DuasTabProps {
  initialDuaId?: string;
  onToggleBookmark: (item: { type: 'ayah' | 'dua' | 'zikr'; refId: string; title: string; subtitle: string; arabicText?: string }) => void;
  isBookmarked: (type: 'ayah' | 'dua' | 'zikr', refId: string) => boolean;
}

export const DuasTab: React.FC<DuasTabProps> = ({ initialDuaId, onToggleBookmark, isBookmarked }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <div id="duas-view" className="space-y-4 pb-12">
      {/* Title & Description */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
          <HeartHandshake className="w-5 h-5 text-amber-500" />
          <span>Dualar (Hisnul-Muslim)</span>
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-300">
          Quran və Səhih Sünnədən gündəlik həyat, səhər-axşam və sıxıntı duaları
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

          return (
            <div
              key={dua.id}
              id={`dua-card-${dua.id}`}
              className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600/40 transition"
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

              {/* Source / Citation */}
              <div className="mt-3 pt-2 border-t border-stone-100 dark:border-emerald-900/30 text-[11px] text-stone-600 dark:text-stone-300 flex items-center justify-between">
                <span>Mənbə: {dua.source}</span>
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
    </div>
  );
};
