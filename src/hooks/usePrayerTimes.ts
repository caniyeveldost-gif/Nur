import { useState, useEffect, useRef } from 'react';
import { CityPrayerData, UserSettings } from '../types';
import { fetchPrayerTimes, calculateLocalPrayerTimes, getBakuDateString } from '../services/apiService';

export interface NextPrayerStatus {
  nameAz: string;
  arabicName: string;
  key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  timeStr: string;
  remainingStr: string;
  hours: number;
  minutes: number;
  seconds: number;
  progressPercent: number;
}

export function usePrayerTimes(settings: UserSettings) {
  const [prayerData, setPrayerData] = useState<CityPrayerData>(() =>
    calculateLocalPrayerTimes(
      settings.city || 'Baki',
      new Date(),
      settings.prayerCalcMethod || 'MuslimWorldLeague',
      settings.prayerMadhab || 'shafi',
      settings.prayerAdjustments || {}
    )
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<NextPrayerStatus | null>(null);
  const lastCheckedDateRef = useRef<string>(getBakuDateString(new Date()));

  // Load and sync prayer times whenever city or calculation parameters change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchPrayerTimes(
      settings.city || 'Baki',
      new Date(),
      settings.prayerCalcMethod || 'MuslimWorldLeague',
      settings.prayerMadhab || 'shafi',
      settings.prayerAdjustments || {}
    )
      .then((data) => {
        if (isMounted) {
          setPrayerData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Prayer fetch error, falling back locally:', err);
          setPrayerData(
            calculateLocalPrayerTimes(
              settings.city || 'Baki',
              new Date(),
              settings.prayerCalcMethod || 'MuslimWorldLeague',
              settings.prayerMadhab || 'shafi',
              settings.prayerAdjustments || {}
            )
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    settings.city,
    settings.prayerCalcMethod,
    settings.prayerMadhab,
    JSON.stringify(settings.prayerAdjustments || {})
  ]);

  // Real-time second-by-second countdown to the next prayer
  useEffect(() => {
    if (!prayerData || !prayerData.timings) return;

    const updateCountdown = () => {
      const now = new Date();
      const currentBakuDate = getBakuDateString(now);

      // Check if midnight date rollover has occurred
      if (prayerData && prayerData.date && prayerData.date !== currentBakuDate) {
        if (lastCheckedDateRef.current !== currentBakuDate) {
          lastCheckedDateRef.current = currentBakuDate;
          // Automatically refresh prayer times for the new day
          fetchPrayerTimes(
            settings.city || 'Baki',
            now,
            settings.prayerCalcMethod || 'MuslimWorldLeague',
            settings.prayerMadhab || 'shafi',
            settings.prayerAdjustments || {}
          )
            .then((fresh) => setPrayerData(fresh))
            .catch(() => {
              setPrayerData(
                calculateLocalPrayerTimes(
                  settings.city || 'Baki',
                  now,
                  settings.prayerCalcMethod || 'MuslimWorldLeague',
                  settings.prayerMadhab || 'shafi',
                  settings.prayerAdjustments || {}
                )
              );
            });
        }
      }

      // Get current hours and minutes in Baku time
      const bakuTimeStr = now.toLocaleTimeString('az-AZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Baku',
        hour12: false,
      });

      const [curH, curM, curS] = bakuTimeStr.split(':').map(Number);
      const currentSeconds = curH * 3600 + curM * 60 + curS;

      const prayerSchedule: {
        key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
        nameAz: string;
        arabicName: string;
        timeStr: string;
        seconds: number;
      }[] = [
        { key: 'fajr', nameAz: 'Sübh', arabicName: 'الفجر', timeStr: prayerData.timings.fajr, seconds: 0 },
        { key: 'sunrise', nameAz: 'Gün çıxır', arabicName: 'الشروق', timeStr: prayerData.timings.sunrise, seconds: 0 },
        { key: 'dhuhr', nameAz: 'Zöhr', arabicName: 'الظهر', timeStr: prayerData.timings.dhuhr, seconds: 0 },
        { key: 'asr', nameAz: 'Əsr', arabicName: 'العصر', timeStr: prayerData.timings.asr, seconds: 0 },
        { key: 'maghrib', nameAz: 'Məğrib (İftar)', arabicName: 'المغرب', timeStr: prayerData.timings.maghrib, seconds: 0 },
        { key: 'isha', nameAz: 'İşa', arabicName: 'العشاء', timeStr: prayerData.timings.isha, seconds: 0 },
      ];

      prayerSchedule.forEach((item) => {
        const [h, m] = item.timeStr.split(':').map(Number);
        item.seconds = h * 3600 + m * 60;
      });

      // Find the next upcoming prayer today
      let next = prayerSchedule.find((item) => item.seconds > currentSeconds);
      let diffSeconds = 0;
      let prevSeconds = 0;

      if (next) {
        diffSeconds = next.seconds - currentSeconds;
        const prevIdx = prayerSchedule.indexOf(next) - 1;
        prevSeconds = prevIdx >= 0 ? prayerSchedule[prevIdx].seconds : 0;
      } else {
        // After Isha: next is tomorrow's Fajr
        next = prayerSchedule[0];
        diffSeconds = (86400 - currentSeconds) + next.seconds;
        prevSeconds = prayerSchedule[prayerSchedule.length - 1].seconds;
      }

      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;

      const remainingStr = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Calculate progress between previous and next prayer
      const spanSeconds = (next.seconds > prevSeconds) ? (next.seconds - prevSeconds) : (86400 - prevSeconds + next.seconds);
      const elapsed = Math.max(0, spanSeconds - diffSeconds);
      const progressPercent = Math.min(100, Math.max(5, (elapsed / spanSeconds) * 100));

      setNextPrayerInfo({
        nameAz: next.nameAz,
        arabicName: next.arabicName,
        key: next.key,
        timeStr: next.timeStr,
        remainingStr,
        hours,
        minutes,
        seconds,
        progressPercent,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [prayerData]);

  return {
    prayerData,
    isLoading,
    error,
    nextPrayerInfo,
    refreshPrayerTimes: () => {
      setIsLoading(true);
      fetchPrayerTimes(
        settings.city || 'Baki',
        new Date(),
        settings.prayerCalcMethod || 'MuslimWorldLeague',
        settings.prayerMadhab || 'shafi',
        settings.prayerAdjustments || {}
      ).then((data) => {
        setPrayerData(data);
        setIsLoading(false);
      });
    },
  };
}
