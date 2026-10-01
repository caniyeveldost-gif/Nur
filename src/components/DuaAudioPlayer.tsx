import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  X,
  ChevronUp,
  ChevronDown,
  Headphones,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Dua } from '../types';

interface DuaAudioPlayerProps {
  currentDua: Dua | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextDua?: () => void;
  onPrevDua?: () => void;
  onClose: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const DuaAudioPlayer: React.FC<DuaAudioPlayerProps> = ({
  currentDua,
  isPlaying,
  onTogglePlay,
  onNextDua,
  onPrevDua,
  onClose,
  hasNext = false,
  hasPrev = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'once' | 'dua_count' | 'infinite'>('dua_count');
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [isSpeechMode, setIsSpeechMode] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimerRef = useRef<number | null>(null);

  const targetRepeats = currentDua?.repeatCount && currentDua.repeatCount > 1 ? currentDua.repeatCount : 1;

  // Format time in mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper to stop all speech synthesis
  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  };

  // Reset states when currentDua changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setCurrentCycle(1);
    setAudioError(null);

    // Stop existing audio / speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    stopSpeech();

    if (!currentDua) return;

    if (currentDua.audioUrl) {
      setIsSpeechMode(false);
      const audio = new Audio(currentDua.audioUrl);
      audio.preload = 'metadata';
      audio.playbackRate = playbackRate;
      audio.muted = isMuted;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        handleAudioEnded();
      };

      audio.onerror = () => {
        console.warn('Audio URL failed to load, falling back to speech synthesis:', currentDua.audioUrl);
        setAudioError('Şəbəkə audio faylı yüklənmədi, səsli qiraətə keçirilir.');
        setIsSpeechMode(true);
        if (isPlaying) {
          playSpeech();
        }
      };

      audioRef.current = audio;

      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Autoplay failed or interrupted:', err);
          setIsSpeechMode(true);
          playSpeech();
        });
      }
    } else {
      // No MP3 URL, use Arabic Speech Synthesis
      setIsSpeechMode(true);
      if (isPlaying) {
        playSpeech();
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSpeech();
    };
  }, [currentDua?.id]);

  // Handle play / pause state changes
  useEffect(() => {
    if (!currentDua) return;

    if (isPlaying) {
      if (!isSpeechMode && audioRef.current && currentDua.audioUrl) {
        audioRef.current.play().catch(() => {
          setIsSpeechMode(true);
          playSpeech();
        });
      } else {
        playSpeech();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSpeech();
    }
  }, [isPlaying, isSpeechMode]);

  // Handle playback rate change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
    // If speech is playing, restart speech with new rate
    if (isPlaying && isSpeechMode) {
      playSpeech();
    }
  }, [playbackRate]);

  // Handle mute change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Function to handle completion of one playback cycle
  const handleAudioEnded = () => {
    if (!currentDua) return;

    const maxCycles = repeatMode === 'infinite' ? Infinity : repeatMode === 'dua_count' ? targetRepeats : 1;

    if (currentCycle < maxCycles) {
      setCurrentCycle((prev) => prev + 1);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.warn);
      } else if (isSpeechMode) {
        playSpeech();
      }
    } else {
      // Completed all repetitions
      setCurrentCycle(1);
      if (onTogglePlay) {
        onTogglePlay(); // stop
      }
      // If there is next dua and user wants autoplay or just finish
      if (repeatMode === 'once' && hasNext && onNextDua) {
        // optionally keep stopped or play next
      }
    }
  };

  // Speech synthesis playback for Arabic Dua text
  const playSpeech = () => {
    if (!currentDua || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    stopSpeech();

    // Estimate duration based on text length: ~10 characters per second at 1.0 rate
    const estimatedSecs = Math.max(4, Math.round((currentDua.arabic.length / 8) / playbackRate));
    setDuration(estimatedSecs);
    setCurrentTime(0);

    const utterance = new SpeechSynthesisUtterance(currentDua.arabic);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.85 * playbackRate; // gentle, measured recitation pace
    utterance.pitch = 1.0;

    // Pick best Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((v) => v.lang.startsWith('ar') || v.lang === 'ar-SA' || v.lang === 'ar-AE');
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    const startTime = Date.now();
    speechTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed <= estimatedSecs) {
        setCurrentTime(elapsed);
      }
    }, 250);

    utterance.onend = () => {
      if (speechTimerRef.current) {
        clearInterval(speechTimerRef.current);
        speechTimerRef.current = null;
      }
      handleAudioEnded();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (speechTimerRef.current) {
        clearInterval(speechTimerRef.current);
        speechTimerRef.current = null;
      }
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (!isSpeechMode && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Handle Replay current dua
  const handleReplay = () => {
    setCurrentTime(0);
    setCurrentCycle(1);
    if (!isSpeechMode && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.warn);
    } else {
      playSpeech();
    }
  };

  // Toggle speed between 0.75x, 1x, 1.25x, 1.5x
  const handleCycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackRate(speeds[nextIndex]);
  };

  // Toggle repeat mode
  const handleToggleRepeat = () => {
    if (repeatMode === 'dua_count') {
      setRepeatMode('infinite');
    } else if (repeatMode === 'infinite') {
      setRepeatMode('once');
    } else {
      setRepeatMode('dua_count');
    }
  };

  if (!currentDua) return null;

  const reciterName = currentDua.reciter || (isSpeechMode ? 'Səsli Ərəbcə Qiraət' : 'Mişari Rəşid əl-Əfasi');
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      id="dua-audio-player-container"
      className="fixed bottom-16 sm:bottom-16 left-3 right-3 sm:left-auto sm:right-6 sm:w-[410px] z-30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="bg-white/95 dark:bg-[#071a11]/95 backdrop-blur-md rounded-2xl border border-emerald-900/15 dark:border-emerald-700/40 shadow-[0_12px_36px_rgba(6,78,59,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Top Progress bar indicator */}
        <div className="w-full bg-stone-200/60 dark:bg-emerald-950/60 h-1 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Content Bar */}
        <div className="p-3 sm:p-3.5">
          {/* Header Row: Dua Title, Reciter badge, Collapse & Close buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Playing Icon / Wave visualizer */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-700 text-amber-300 flex items-center justify-center shrink-0 shadow-xs relative">
                {isPlaying ? (
                  <div className="flex items-end gap-0.5 h-4 w-4 justify-center">
                    <span className="w-0.5 bg-amber-300 rounded-full animate-pulse h-2.5" />
                    <span className="w-0.5 bg-amber-300 rounded-full animate-pulse h-4 delay-75" />
                    <span className="w-0.5 bg-amber-300 rounded-full animate-pulse h-3 delay-150" />
                    <span className="w-0.5 bg-amber-300 rounded-full animate-pulse h-1.5" />
                  </div>
                ) : (
                  <Headphones className="w-4 h-4 text-amber-300" />
                )}
              </div>

              {/* Title & reciter name */}
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate leading-snug">
                  {currentDua.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-amber-400 font-medium">
                  <span className="truncate">{reciterName}</span>
                  {(repeatMode === 'dua_count' && targetRepeats > 1) && (
                    <span className="shrink-0 px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      {currentCycle}/{targetRepeats}
                    </span>
                  )}
                  {repeatMode === 'infinite' && (
                    <span className="shrink-0 text-[10px] text-amber-500 font-bold">
                      ∞ Dövr
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-900/30 transition"
                title={isExpanded ? 'Yığcam rejim' : 'Genişləndir'}
                aria-label={isExpanded ? 'Pleyeri yığ' : 'Pleyeri aç'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-emerald-900/30 transition"
                title="Pleyeri bağla"
                aria-label="Pleyeri bağla"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Notice if any */}
          {audioError && (
            <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg">
              {audioError}
            </div>
          )}

          {/* Expanded Player Details: Arabic snippet, Seek slider, and Rich Controls */}
          {isExpanded && (
            <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-emerald-900/30 space-y-2.5">
              {/* Arabic snippet preview */}
              <div
                dir="rtl"
                className="font-arabic font-medium text-sm text-right text-emerald-950 dark:text-emerald-100 line-clamp-1 opacity-90 px-1"
              >
                {currentDua.arabic}
              </div>

              {/* Seek Bar & Times */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Qiraət vaxt şkalası"
                  className="w-full h-1.5 bg-stone-200 dark:bg-emerald-900/60 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                />
                <div className="flex justify-between items-center text-[10px] text-stone-500 dark:text-stone-400 px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons Grid */}
              <div className="flex items-center justify-between gap-1 pt-1">
                {/* Left: Speed selector */}
                <button
                  onClick={handleCycleSpeed}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-emerald-950/50 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-stone-200/80 dark:border-emerald-800/40 transition shrink-0"
                  title="Sürəti dəyiş"
                  aria-label={`Sürət: ${playbackRate}x`}
                >
                  {playbackRate}x
                </button>

                {/* Center: Playback Controls (Prev, Replay, Play/Pause, Next) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {hasPrev && (
                    <button
                      onClick={onPrevDua}
                      className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-emerald-900/30 transition"
                      title="Əvvəlki dua"
                      aria-label="Əvvəlki dua"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={handleReplay}
                    className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-emerald-900/30 transition"
                    title="Yenidən oxu"
                    aria-label="Yenidən oxu"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Big Play / Pause Button */}
                  <button
                    onClick={onTogglePlay}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#064e3b] to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-amber-300 flex items-center justify-center shadow-md active:scale-95 transition"
                    title={isPlaying ? 'Pauza' : 'Davam et'}
                    aria-label={isPlaying ? 'Qiraəti saxla' : 'Qiraəti başlat'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-amber-300" /> : <Play className="w-5 h-5 fill-amber-300 ml-0.5" />}
                  </button>

                  {hasNext && (
                    <button
                      onClick={onNextDua}
                      className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-emerald-900/30 transition"
                      title="Növbəti dua"
                      aria-label="Növbəti dua"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Right: Repeat mode toggle & Mute */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleToggleRepeat}
                    className={`p-1.5 rounded-lg transition relative ${
                      repeatMode !== 'once'
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 font-bold'
                        : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-emerald-900/30'
                    }`}
                    title={
                      repeatMode === 'dua_count'
                        ? `Dua sayına görə təkrar (${targetRepeats} dəfə)`
                        : repeatMode === 'infinite'
                        ? 'Sonsuz dövr'
                        : 'Təkrar yoxdur'
                    }
                    aria-label="Təkrar rejimi"
                  >
                    <Repeat className="w-4 h-4" />
                    {repeatMode === 'dua_count' && targetRepeats > 1 && (
                      <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        {targetRepeats}
                      </span>
                    )}
                    {repeatMode === 'infinite' && (
                      <span className="absolute -top-1 -right-1 text-[9px] text-amber-500 font-bold">
                        ∞
                      </span>
                    )}
                  </button>

                  {!isSpeechMode && (
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-emerald-900/30 transition"
                      title={isMuted ? 'Səsi aç' : 'Səsi bağla'}
                      aria-label={isMuted ? 'Səsi aç' : 'Səsi bağla'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
