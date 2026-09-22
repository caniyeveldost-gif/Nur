import React, { useState, useEffect } from 'react';
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
  Target
} from 'lucide-react';
import { POPULAR_ZIKRS } from '../data/zikrs';
import { ZikrItem } from '../types';

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
  const [selectedZikr, setSelectedZikr] = useState<ZikrItem>(() => {
    if (initialZikrId) {
      const match = POPULAR_ZIKRS.find((z) => z.id === initialZikrId);
      if (match) return match;
    }
    return POPULAR_ZIKRS[0];
  });

  // Target options: 33, 99, 100, custom
  const [target, setTarget] = useState<number>(33);
  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(false);
  const [customTargetInput, setCustomTargetInput] = useState<string>('50');
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  // Persistence of current count
  const [count, setCount] = useState<number>(() => {
    const saved = localStorage.getItem(`nur_tasbih_count_${selectedZikr.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Total overall count across all sessions
  const [totalCount, setTotalCount] = useState<number>(() => {
    const saved = localStorage.getItem('nur_tasbih_total_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Sound and Vibration toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundDefault);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(vibrationDefault);
  const [targetReachedNotification, setTargetReachedNotification] = useState<boolean>(false);

  // Watch initialZikrId if navigated externally
  useEffect(() => {
    if (initialZikrId) {
      const match = POPULAR_ZIKRS.find((z) => z.id === initialZikrId);
      if (match) {
        setSelectedZikr(match);
      }
    }
  }, [initialZikrId]);

  // Audio click synthesizer using Web Audio API (zero external asset dependency!)
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (_e) {
      // Audio not permitted or supported
    }
  };

  const playTargetCelebrationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.08);
        osc.stop(audioCtx.currentTime + i * 0.08 + 0.2);
      });
    } catch (_e) {}
  };

  // Sync count on zikr selection change
  useEffect(() => {
    const saved = localStorage.getItem(`nur_tasbih_count_${selectedZikr.id}`);
    setCount(saved ? parseInt(saved, 10) : 0);
    setTarget(selectedZikr.defaultTarget);
    setIsCustomTarget(false);
    setShowConfirmReset(false);
  }, [selectedZikr]);

  const handleIncrement = () => {
    const nextCount = count + 1;
    const nextTotal = totalCount + 1;

    setCount(nextCount);
    setTotalCount(nextTotal);

    try {
      localStorage.setItem(`nur_tasbih_count_${selectedZikr.id}`, nextCount.toString());
      localStorage.setItem('nur_tasbih_total_count', nextTotal.toString());
    } catch (_e) {}

    // Sound feedback
    playClickSound();

    // Vibration feedback
    if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (nextCount % target === 0) {
          // Extended celebratory vibration pattern on reaching target
          navigator.vibrate([100, 50, 100]);
          playTargetCelebrationSound();
          setTargetReachedNotification(true);
          setTimeout(() => setTargetReachedNotification(false), 2500);
        } else {
          navigator.vibrate(30);
        }
      } catch (_e) {}
    } else if (nextCount % target === 0) {
      playTargetCelebrationSound();
      setTargetReachedNotification(true);
      setTimeout(() => setTargetReachedNotification(false), 2500);
    }
  };

  const handleResetConfirm = () => {
    setCount(0);
    try {
      localStorage.setItem(`nur_tasbih_count_${selectedZikr.id}`, '0');
    } catch (_e) {}
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

  // Calculate circular progress percentage
  const currentLapCount = target > 0 ? count % target : count;
  const progressPercent = target > 0 ? (currentLapCount / target) * 100 : 0;
  const completedLaps = target > 0 ? Math.floor(count / target) : 0;

  // SVG circle calculation
  const circleRadius = 110;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div id="zikr-view" className="space-y-4 pb-14">
      {/* Title & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Elektron Zikr Təsbehi</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Hədəf seçimi, toxunma rəyi və avtomatik yaddaş
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
            title={soundEnabled ? "Səsi bağla" : "Səsi aç"}
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
            title={vibrationEnabled ? "Vibrasiyanı bağla" : "Vibrasiyanı aç"}
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

      {/* Zikr Preset Selector Carousel */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
          Zikr seçimi:
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {POPULAR_ZIKRS.map((z) => {
            const isSelected = selectedZikr.id === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setSelectedZikr(z)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition shrink-0 text-left border ${
                  isSelected
                    ? 'bg-[#064e3b] text-white border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-emerald-800/40 hover:bg-stone-50'
                }`}
              >
                <div className="font-bold">{z.transliteration}</div>
                <div className="font-arabic text-amber-300 text-sm mt-0.5">{z.arabic}</div>
              </button>
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

      {/* Target Selector Tabs: 33 / 99 / 100 / Fərdi */}
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 mr-1">
          Hədəf:
        </span>
        {[33, 99, 100].map((t) => (
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
        <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200/80 dark:border-emerald-900/40 max-w-xs mx-auto">
          <input
            type="number"
            min="1"
            max="99999"
            value={customTargetInput}
            onChange={(e) => setCustomTargetInput(e.target.value)}
            className="w-20 px-2 py-1 text-center font-bold text-sm rounded-lg bg-white dark:bg-[#0c1e15] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white"
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
      <div className="flex flex-col items-center justify-center py-4">
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
            className="absolute inset-4 rounded-full bg-gradient-to-br from-[#064e3b] via-[#053e2f] to-[#022c22] active:scale-95 text-white shadow-2xl flex flex-col items-center justify-center p-4 transition-transform select-none border-4 border-amber-400/40 group hover:border-amber-400"
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
            <div className="mt-2 text-[10px] text-amber-400/80 font-bold bg-emerald-900/60 px-3 py-0.5 rounded-full border border-amber-400/20">
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

          <div className="text-right">
            <div className="text-[10px] text-stone-600 dark:text-stone-300">Ümumi zikrlər:</div>
            <div className="text-xs font-bold font-mono text-[#064e3b] dark:text-amber-400">
              {totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* Virtue Card */}
      {selectedZikr.virtue && (
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-500/20 text-xs text-stone-700 dark:text-stone-300 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900 dark:text-amber-300 mr-1">Fəziləti:</span>
            {selectedZikr.virtue}
          </div>
        </div>
      )}
    </div>
  );
};
