import React from 'react';
import { Home, BookOpen, HeartHandshake, Hash, User, Bot } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const navItems = [
    { id: 'home', label: 'Ana səhifə', icon: Home },
    { id: 'quran', label: 'Quran', icon: BookOpen },
    { id: 'duas', label: 'Dualar', icon: HeartHandshake },
    { id: 'zikr', label: 'Zikr', icon: Hash },
    { id: 'ai', label: 'Nur AI', icon: Bot, isSpecial: true },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Əsas naviqasiya"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#06150e]/95 backdrop-blur-md border-t border-emerald-950/10 dark:border-emerald-800/25 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onChangeTab(item.id)}
                className={`relative flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-200 group ${
                  isActive ? 'scale-105' : 'hover:scale-105'
                }`}
                aria-label={item.label}
              >
                <div
                  className={`w-10 h-10 -mt-4 rounded-full flex items-center justify-center shadow-md transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-amber-600 to-amber-400 text-white ring-2 ring-amber-300 shadow-amber-500/30'
                      : 'bg-gradient-to-tr from-[#064e3b] to-emerald-600 text-amber-300 hover:text-white border border-amber-400/40'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-0.5 tracking-tight ${
                    isActive
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] ${
                isActive
                  ? 'text-[#064e3b] dark:text-amber-400 font-semibold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-emerald-800 dark:hover:text-emerald-200'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#064e3b] dark:bg-amber-400" />
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
