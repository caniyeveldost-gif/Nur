import React from 'react';
import { Moon, Sun, Search, MapPin, Sparkles, Compass } from 'lucide-react';
import { AZERBAIJAN_CITIES } from '../services/apiService';
import { getHijriDate } from '../data/hijri';

interface HeaderProps {
  userName: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  selectedCity: string;
  onSelectCity: (cityKey: string) => void;
  onOpenSearch: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  theme,
  onToggleTheme,
  selectedCity,
  onSelectCity,
  onOpenSearch,
  onNavigateTab,
}) => {
  const hijriInfo = getHijriDate();
  const currentCityName = AZERBAIJAN_CITIES[selectedCity]?.name || 'Bakı';

  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-[#043327] via-[#064e3b] to-[#065f46] text-white pt-4 pb-6 px-4 sm:px-6 shadow-md border-b border-[#f59e0b]/20">
      {/* Subtle Islamic geometric pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-islamic-pattern pointer-events-none" />

      {/* Decorative Gold Crescent Accent */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-[#f59e0b]/20 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Top Control Bar: App Logo, City Selector, Search, Theme */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#b45309] p-0.5 shadow-lg shadow-[#043327]/40 flex items-center justify-center">
              <div className="w-full h-full bg-[#064e3b] rounded-[10px] flex items-center justify-center">
                <span className="font-serif font-bold text-lg text-amber-300">ن</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
                  Nur
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  İslam Bələdçisi
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium hidden sm:block">
                Mənəviyyat, Quran və Zikr
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* City Selector */}
            <div className="relative">
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-xs text-emerald-100 hover:bg-emerald-800/60 transition shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => onSelectCity(e.target.value)}
                  className="bg-transparent text-emerald-100 font-medium text-xs focus:outline-none cursor-pointer pr-1"
                  aria-label="Şəhər seçin"
                >
                  {Object.entries(AZERBAIJAN_CITIES).map(([key, item]) => (
                    <option key={key} value={key} className="bg-[#064e3b] text-white">
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qibla quick button */}
            <button
              id="header-qibla-btn"
              onClick={() => onNavigateTab('qibla')}
              className="p-2 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 hover:text-amber-300 hover:bg-emerald-800/70 transition shadow-sm"
              title="Qiblə Kompası"
              aria-label="Qiblə Kompası"
            >
              <Compass className="w-4 h-4 text-amber-400" />
            </button>

            {/* Global Search Button */}
            <button
              id="header-search-btn"
              onClick={onOpenSearch}
              className="p-2 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 hover:text-white hover:bg-emerald-800/70 transition shadow-sm"
              title="Axtarış"
              aria-label="Axtarış"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              id="header-theme-toggle"
              onClick={onToggleTheme}
              className="p-2 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 hover:text-amber-300 hover:bg-emerald-800/70 transition shadow-sm"
              title={theme === 'dark' ? "İşıqlı rejimə keç" : "Qaranlıq rejimə keç"}
              aria-label="Rejimi dəyiş"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-200" />
              )}
            </button>
          </div>
        </div>

        {/* Salam & Date Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-600/30">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Əs-Səlamu aleykum</span>
              {userName && (
                <span className="text-amber-300 font-semibold">, {userName}</span>
              )}
            </h2>
            <p className="text-xs text-emerald-200/90 flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gününüz bərəkətli və xeyirli olsun</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-right self-start sm:self-auto">
            <div className="bg-emerald-900/50 border border-emerald-700/40 rounded-xl px-3 py-1.5 backdrop-blur-xs">
              <div className="text-xs font-semibold text-amber-300 tracking-wide">
                {hijriInfo.formatted}
              </div>
              <div className="text-[11px] text-emerald-200/70">
                {hijriInfo.gregorianFormatted}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
