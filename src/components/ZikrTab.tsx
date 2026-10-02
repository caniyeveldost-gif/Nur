import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  ChevronDown,
  Check,
  X,
  Plus,
  Target,
  PlusCircle,
  Calendar,
  History,
  Trash2
} from 'lucide-react';
import { POPULAR_ZIKRS } from '../data/zikrs';
import { ZikrItem, CustomZikrItem } from '../types';
import { safeStorage } from '../services/storageHelper';

interface ZikrTabProps {
  initialZikrId?: string;
  vibrationDefault: boolean;
  soundDefault: boolean;
}

export const ZikrTab: React.FC<ZikrTabProps> = ({
  initialZikrId,
  vibrationDefault,
  soundDefault,
}) => {
  // Custom zikrs list from storage
  const [customZikrs, setCustomZikrs] = useState<CustomZikrItem[]>(() =>
    safeStorage.getItem<CustomZikrItem[]>('nur_custom_zikrs', [])
  );

  const [selectedZikr, setSelectedZikr] = useState<ZikrItem | CustomZikrItem>(() => {
    if (initialZikrId) {
      const all = [...POPULAR_ZIKRS, ...safeStorage.getItem<CustomZikrItem[]>('nur_custom_zikrs', [])];
      const match = all.find((z) => z.id === initialZikrId);
      if (match) return match;
    }
    return POPULAR_ZIKRS[0];
  });

  // Target options: 33, 99, 100, 1000, custom
  const [target, setTarget] = useState<number>(33);
  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(false);
  const [customTargetInput, setCustomTargetInput] = useState<string>('50');
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form for custom zikr
  const [newTitle, setNewTitle] = useState<string>('');
  const [newArabic, setNewArabic] = useState<string>('');
  const [newTransliteration, setNewTransliteration] = useState<string>('');
  const [newTranslation, setNewTranslation] = useState<string>('');
  const [newTarget, setNewTarget] = useState<number>(100);

  // Persistence of current count
  const [count, setCount] = useState<number>(() => {
    const saved = safeStorage.getItem<number>(`nur_tasbih_count_${selectedZikr.id}`, 0);
    return saved;
  });

  // Total overall count across all sessions
  const [totalCount, setTotalCount] = useState<number>(() => {
    return safeStorage.getItem<number>('nur_tasbih_total_count', 0);
  });

  // Today's count
  const todayKey = `nur_tasbih_daily_${new Date().toISOString().slice(0, 10)}`;
  const [todayCount, setTodayCount] = useState<number>(() => {
    return safeStorage.getItem<number>(todayKey, 0);
  });

  // Sound and Vibration toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundDefault);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(vibrationDefault);
  const [targetReachedNotification, setTargetReachedNotification] = useState<boolean>(false);

  const longPressTimerRef = useRef<number | null>(null);

  // Watch initialZikrId if navigated externally
  useEffect(() => {
    if (initialZikrId) {
      const all = [...POPULAR_ZIKRS, ...customZikrs];
      const match = all.find((z) => z.id === initialZikrId);
      if (match) {
        setSelectedZikr(match);
      }
    }
  }, [initialZikrId, customZikrs]);

  // Audio click synthesizer using Web Audio API
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (_e) {}
  };

  const playTargetCelebrationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.2);
      });
    } catch (_e) {}
  };

  // Sync count on zikr selection change
  useEffect(() => {
    const saved = safeStorage.getItem<number>(`nur_tasbih_count_${selectedZikr.id}`, 0);
    setCount(saved);
    setTarget(selectedZikr.defaultTarget || 33);
    setIsCustomTarget(false);
    setShowConfirmReset(false);
  }, [selectedZikr.id]);

  const handleIncrement = () => {
    const nextCount = count + 1;
    const nextTotal = totalCount + 1;
    const nextDaily = todayCount + 1;

    setCount(nextCount);
    setTotalCount(nextTotal);
    setTodayCount(nextDaily);

    safeStorage.setItem(`nur_tasbih_count_${selectedZikr.id}`, nextCount);
    safeStorage.setItem('nur_tasbih_total_count', nextTotal);
    safeStorage.setItem(todayKey, nextDaily);

    // Sound feedback
    playClickSound();

    // Vibration feedback
    if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (target > 0 && nextCount % target === 0) {
          navigator.vibrate([100, 50, 100]);
          playTargetCelebrationSound();
          setTargetReachedNotification(true);
          setTimeout(() => setTargetReachedNotification(false), 2500);
        } else {
          navigator.vibrate(28);
        }
      } catch (_e) {}
    } else if (target > 0 && nextCount % target === 0) {
      playTargetCelebrationSound();
      setTargetReachedNotification(true);
      setTimeout(() => setTargetReachedNotification(false), 2500);
    }
  };

  const handleResetConfirm = () => {
    setCount(0);
    safeStorage.setItem(`nur_tasbih_count_${selectedZikr.id}`, 0);
    setShowConfirmReset(false);
  };

  const handleTargetChange = (val: number) => {
    setTarget(val);
    setIsCustomTarget(false);
  };

  const handleCustomTargetApply = () => {
    const parsed = parseInt(customTargetInput, 10);
    if (parsed > 0) {
      setTarget(parsed);
      setIsCustomTarget(false);
    }
  };

  // Add custom zikr
  const handleAddCustomZikr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: CustomZikrItem = {
      id: `custom-zikr-${Date.now()}`,
      title: newTitle.trim(),
      arabic: newArabic.trim() || 'ذِكْر',
      transliteration: newTransliteration.trim() || newTitle.trim(),
      translation: newTranslation.trim() || newTitle.trim(),
      defaultTarget: newTarget > 0 ? newTarget : 100,
      count: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...customZikrs, newItem];
    setCustomZikrs(updated);
    safeStorage.setItem('nur_custom_zikrs', updated);

    // Reset form
    setNewTitle('');
    setNewArabic('');
    setNewTransliteration('');
    setNewTranslation('');
    setNewTarget(100);
    setIsAddModalOpen(false);

    // Select the new item
    setSelectedZikr(newItem);
  };

  const handleDeleteCustomZikr = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customZikrs.filter((z) => z.id !== id);
    setCustomZikrs(updated);
    safeStorage.setItem('nur_custom_zikrs', updated);
    if (selectedZikr.id === id) {
      setSelectedZikr(POPULAR_ZIKRS[0]);
    }
  };

  // Circular progress percentage
  const currentLapCount = target > 0 ? count % target : count;
  const progressPercent = target > 0 ? (currentLapCount / target) * 100 : 0;
  const completedLaps = target > 0 ? Math.floor(count / target) : 0;

  // SVG circle calculation
  const circleRadius = 110;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const allZikrs = [...POPULAR_ZIKRS, ...customZikrs];

  return (
    <div id="zikr-view" className="space-y-4 pb-14 animate-in fade-in duration-200">
      {/* Title & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Elektron Zikr Təsbehi</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Hədəf seçimi, toxunma rəyi, fərdi zikrlər və statistika
          </p>
        </div>

        {/* Vibration and Sound toggles */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#0c1e15] p-1 rounded-xl border border-stone-200/80 dark:border-emerald-800/40 shadow-xs">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition ${
              soundEnabled
                ? 'bg-[#064e3b] text-amber-300'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-700'
            }`}
            title={soundEnabled ? 'Səsi bağla' : 'Səsi aç'}
            aria-label="Səs rejimi"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setVibrationEnabled(!vibrationEnabled)}
            className={`p-1.5 rounded-lg transition ${
              vibrationEnabled
                ? 'bg-[#064e3b] text-amber-300'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-700'
            }`}
            title={vibrationEnabled ? 'Vibrasiyanı bağla' : 'Vibrasiyanı aç'}
            aria-label="Vibrasiya rejimi"
          >
            <Vibrate className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Reached Banner */}
      {targetReachedNotification && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center font-bold text-xs sm:text-sm shadow-md animate-bounce">
          🎉 Təbrik edirik! {target} zikr hədəfinə çatdınız! Allah qəbul etsin.
        </div>
      )}

      {/* Zikr Preset Selector Carousel + Add Custom Button */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Zikr seçimi:
          </label>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-amber-400 hover:underline"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Fərdi zikr əlavə et</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {allZikrs.map((z) => {
            const isSelected = selectedZikr.id === z.id;
            const isCustom = z.id.startsWith('custom-');

            return (
              <div
                key={z.id}
                onClick={() => setSelectedZikr(z)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition shrink-0 text-left border cursor-pointer relative group ${
                  isSelected
                    ? 'bg-[#064e3b] text-white border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span>{z.transliteration}</span>
                  {isCustom && (
                    <span className="text-[9px] px-1 py-0.2 bg-amber-400/20 text-amber-300 rounded">
                      Fərdi
                    </span>
                  )}
                </div>
                <div className="font-arabic text-amber-300 text-sm mt-0.5">{z.arabic}</div>

                {isCustom && (
                  <button
                    onClick={(e) => handleDeleteCustomZikr(z.id, e)}
                    className="absolute top-1.5 right-1.5 text-stone-400 hover:text-rose-400 p-0.5 rounded transition"
                    title="Bu zikri sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Selected Zikr Info Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-center shadow-xs">
        <div
          dir="rtl"
          className="font-arabic font-bold text-3xl sm:text-4xl text-[#064e3b] dark:text-amber-300"
        >
          {selectedZikr.arabic}
        </div>
        <div className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
          {selectedZikr.transliteration}
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
          {selectedZikr.translation}
        </p>
      </div>

      {/* Target Selector Tabs: 33 / 99 / 100 / 1000 / Fərdi */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 mr-1">
          Hədəf:
        </span>
        {[33, 99, 100, 1000].map((t) => (
          <button
            key={t}
            onClick={() => handleTargetChange(t)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              target === t && !isCustomTarget
                ? 'bg-[#064e3b] text-amber-300 shadow-xs'
                : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
            }`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => setIsCustomTarget(!isCustomTarget)}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
            isCustomTarget
              ? 'bg-[#064e3b] text-amber-300 shadow-xs'
              : 'bg-white dark:bg-[#0c1e15] text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
          }`}
        >
          Fərdi
        </button>
      </div>

      {/* Custom target input drawer */}
      {isCustomTarget && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200/80 dark:border-emerald-900/40 max-w-xs mx-auto animate-in fade-in">
          <input
            type="number"
            min="1"
            max="99999"
            value={customTargetInput}
            onChange={(e) => setCustomTargetInput(e.target.value)}
            className="w-24 px-2 py-1 text-center font-bold text-sm rounded-lg bg-white dark:bg-[#0c1e15] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white"
          />
          <button
            onClick={handleCustomTargetApply}
            className="px-3 py-1 text-xs font-bold rounded-lg bg-[#064e3b] text-amber-300"
          >
            Təsdiq et
          </button>
        </div>
      )}

      {/* Large Tactile Circular Counter & Big Tap Button */}
      <div className="flex flex-col items-center justify-center py-3">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Circular SVG Progress Ring */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
            {/* Background track circle */}
            <circle
              cx="130"
              cy="130"
              r={circleRadius}
              className="text-stone-200 dark:text-emerald-950 stroke-current"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Animated Progress circle */}
            <circle
              cx="130"
              cy="130"
              r={circleRadius}
              className="text-amber-500 stroke-current transition-all duration-200 ease-out"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Central Giant Tap Button */}
          <button
            id="tasbih-tap-button"
            onClick={handleIncrement}
            className="absolute inset-4 rounded-full bg-gradient-to-br from-[#064e3b] via-[#053e2f] to-[#022c22] active:scale-95 text-white shadow-2xl flex flex-col items-center justify-center p-4 transition-transform select-none border-4 border-amber-400/40 group hover:border-amber-400 cursor-pointer"
            aria-label="Təsbehi artır"
          >
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-widest">
              Dövrə: {completedLaps + 1}
            </span>
            <span className="text-5xl sm:text-6xl font-mono font-extrabold text-amber-300 my-1 group-active:scale-105 transition">
              {count}
            </span>
            <span className="text-xs font-medium text-emerald-200/80">
              Hədəf: {target}
            </span>
            <div className="mt-2 text-[10px] text-amber-400 font-bold bg-emerald-900/60 px-3 py-0.5 rounded-full border border-amber-400/20">
              Toxun (+)
            </div>
          </button>
        </div>

        {/* Action Controls: Reset & Stats */}
        <div className="flex items-center justify-between w-full max-w-xs mt-6 px-4">
          {showConfirmReset ? (
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 p-1 rounded-xl border border-amber-400/30 animate-in fade-in">
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold px-1">Sıfırlansın?</span>
              <button
                onClick={handleResetConfirm}
                className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                title="Bəli, sıfırla"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="p-1 rounded-lg bg-stone-200 dark:bg-emerald-900 text-stone-700 dark:text-stone-300 hover:bg-stone-300 transition"
                title="İmtina et"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="tasbih-reset-btn"
              onClick={() => {
                if (count > 0) setShowConfirmReset(true);
              }}
              disabled={count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-red-500 dark:hover:text-red-400 transition shadow-xs disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
          )}

          {/* Daily & Total Statistics Widget */}
          <div className="text-right space-y-0.5">
            <div className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-end gap-1">
              <Calendar className="w-3 h-3 text-amber-500" />
              <span>Bu gün: <strong>{todayCount}</strong></span>
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center justify-end gap-1">
              <History className="w-3 h-3 text-emerald-600" />
              <span>Cəmi: <strong>{totalCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Virtue Card */}
      {('virtue' in selectedZikr) && selectedZikr.virtue && (
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-500/20 text-xs text-stone-700 dark:text-stone-300 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900 dark:text-amber-300 mr-1">Fəziləti:</span>
            {selectedZikr.virtue}
          </div>
        </div>
      )}

      {/* Modal: Add Custom Zikr */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c1e15] w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-emerald-900/30">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <span>Fərdi Zikr Əlavə Et</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomZikr} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Zikrin Adı / Oxunuşu *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Məs. Salavat-i Şərifə, Həsbunallah..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Ərəbcə Mətni (İstəyə görə)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={newArabic}
                  onChange={(e) => setNewArabic(e.target.value)}
                  placeholder="اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white font-arabic text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Mənası (İstəyə görə)
                </label>
                <input
                  type="text"
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  placeholder="Mənası və ya qeyd..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Standart Hədəf Sayı
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={newTarget}
                  onChange={(e) => setNewTarget(parseInt(e.target.value, 10) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-emerald-800 text-stone-700 dark:text-stone-300 font-semibold"
                >
                  İmtina
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#064e3b] text-amber-300 font-bold shadow-xs hover:brightness-110 transition"
                >
                  Əlavə et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
