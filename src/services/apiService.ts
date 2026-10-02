import { Ayah, CityPrayerData } from '../types';
import { PRELOADED_SURAHS, ALL_SURAHS } from '../data/surahs';
import { getSurahFromIndexedDB, saveSurahToIndexedDB } from './quranDb';
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  HighLatitudeRule,
  SunnahTimes,
  Qibla,
} from 'adhan';

// Azerbaijani cities with coordinates and calculated Qibla angles
// AUDIT NOTE: Manual city 'offsetMinutes' have been completely removed.
// Adhan calculates precise solar prayer times directly from exact GPS latitude and longitude
// (e.g. Gəncə 46.36°E vs Bakı 49.87°E). Adding manual offsets on top of astronomical coordinates
// would produce double-offset errors.
export const AZERBAIJAN_CITIES: Record<string, { name: string; lat: number; lng: number }> = {
  Baki: { name: "Bakı", lat: 40.4093, lng: 49.8671 },
  Sumqayit: { name: "Sumqayıt", lat: 40.5897, lng: 49.6686 },
  Gence: { name: "Gəncə", lat: 40.6828, lng: 46.3606 },
  Lenkeran: { name: "Lənkəran", lat: 38.7529, lng: 48.8475 },
  Masalli: { name: "Masallı", lat: 39.0341, lng: 48.6654 },
  Astara: { name: "Astara", lat: 38.4559, lng: 48.8744 },
  Seki: { name: "Şəki", lat: 41.1919, lng: 47.1706 },
  Mingecevir: { name: "Mingəçevir", lat: 40.7703, lng: 47.0496 },
  Naxcivan: { name: "Naxçıvan", lat: 39.2089, lng: 45.4122 },
  Quba: { name: "Quba", lat: 41.3643, lng: 48.5134 },
  Samaxi: { name: "Şamaxı", lat: 40.6319, lng: 48.6414 },
  Susa: { name: "Şuşa", lat: 39.7588, lng: 46.7497 },
  Xankendi: { name: "Xankəndi", lat: 39.8265, lng: 46.7656 },
  Zaqatala: { name: "Zaqatala", lat: 41.6336, lng: 46.6433 },
};

// Kaaba coordinates (Mecca)
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

// Calculate Qibla direction (bearing clockwise from North in degrees)
export function calculateQiblaAngle(lat: number, lng: number): number {
  const phi1 = (lat * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const deltaLambda = ((KAABA_LNG - lng) * Math.PI) / 180;

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
  const qiblaRad = Math.atan2(y, x);
  let qiblaDeg = (qiblaRad * 180) / Math.PI;
  qiblaDeg = (qiblaDeg + 360) % 360;

  return Math.round(qiblaDeg * 10) / 10;
}

// Haversine distance in kilometers to Kaaba
export function calculateDistanceToKaaba(lat: number, lng: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
  const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((KAABA_LAT * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Convert a Date to YYYY-MM-DD specifically in Asia/Baku timezone (prevents UTC date shifts)
export function getBakuDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Baku',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch (_e) {}
  return date.toISOString().split('T')[0];
}

// Helper to format adjustments into deterministic cache key string
export function formatAdjustmentsCacheKey(adjustments: Record<string, number> = {}): string {
  const keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  return keys.map((k) => `${k}${adjustments[k] || 0}`).join('_');
}

// Apply minute adjustment to a "HH:mm" time string
export function applyAdjustmentToTimeString(timeStr: string, adjustmentMinutes: number = 0): string {
  if (!timeStr || adjustmentMinutes === 0) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const total = (h * 60 + m + adjustmentMinutes + 1440) % 1440;
  const newH = Math.floor(total / 60).toString().padStart(2, '0');
  const newM = (total % 60).toString().padStart(2, '0');
  return `${newH}:${newM}`;
}

// Calculate Islamic midnight (Nisf al-Layl) and Tahajjud (Thuluth al-Layl al-Akhir)
// derived directly from active Maghrib (sunset) and Fajr (dawn) times
export function calculateSunnahNightTimes(maghribStr: string, fajrStr: string): { midnight: string; tahajjud: string } {
  const [mH, mM] = (maghribStr || '18:00').split(':').map(Number);
  const [fH, fM] = (fajrStr || '05:00').split(':').map(Number);
  if (isNaN(mH) || isNaN(mM) || isNaN(fH) || isNaN(fM)) {
    return { midnight: '23:45', tahajjud: '01:30' };
  }
  const maghribTotal = mH * 60 + mM;
  const fajrTotal = fH * 60 + fM;
  // Night duration in minutes across midnight
  const nightDuration = (fajrTotal + 1440 - maghribTotal) % 1440;

  // Middle of the night (Islamic midnight - Nisf al-Layl)
  const midnightTotal = (maghribTotal + Math.round(nightDuration / 2)) % 1440;
  const midH = Math.floor(midnightTotal / 60).toString().padStart(2, '0');
  const midM = (midnightTotal % 60).toString().padStart(2, '0');

  // Last third of the night (Tahajjud - Thuluth al-Layl al-Akhir)
  const tahajjudTotal = (maghribTotal + Math.round((nightDuration * 2) / 3)) % 1440;
  const tahH = Math.floor(tahajjudTotal / 60).toString().padStart(2, '0');
  const tahM = (tahajjudTotal % 60).toString().padStart(2, '0');

  return {
    midnight: `${midH}:${midM}`,
    tahajjud: `${tahH}:${tahM}`,
  };
}

// Helper to format Date to HH:mm with optional minute adjustment in Asia/Baku timezone
function formatTimeBaku(date: Date, adjustmentMinutes: number = 0): string {
  const adjusted = new Date(date.getTime() + adjustmentMinutes * 60000);
  try {
    return adjusted.toLocaleTimeString("az-AZ", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baku",
      hour12: false,
    });
  } catch (_e) {
    const h = adjusted.getHours().toString().padStart(2, "0");
    const m = adjusted.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
}

// Local astronomical calculation for prayer times using adhan
export function calculateLocalPrayerTimes(
  cityKey: string,
  targetDate: Date = new Date(),
  methodName: string = "MuslimWorldLeague",
  madhabName: "shafi" | "hanafi" = "shafi",
  adjustments: Record<string, number> = {}
): CityPrayerData {
  const city = AZERBAIJAN_CITIES[cityKey] || AZERBAIJAN_CITIES.Baki;

  let params = CalculationMethod.MuslimWorldLeague();
  if (methodName === "Turkey") {
    params = CalculationMethod.Turkey();
  } else if (methodName === "Tehran") {
    params = CalculationMethod.Tehran();
  } else if (methodName === "Karachi") {
    params = CalculationMethod.Karachi();
  } else if (methodName === "NorthAmerica") {
    params = CalculationMethod.NorthAmerica();
  } else if (methodName === "Egyptian") {
    params = CalculationMethod.Egyptian();
  } else if (methodName === "UmmAlQura") {
    params = CalculationMethod.UmmAlQura();
  }

  params.madhab = madhabName === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;

  const coordinates = new Coordinates(city.lat, city.lng);
  const prayerTimes = new PrayerTimes(coordinates, targetDate, params);
  const qiblaAngle = Math.round(Qibla(coordinates) * 10) / 10;
  const distanceToKaabaKm = calculateDistanceToKaaba(city.lat, city.lng);
  const dateStr = getBakuDateString(targetDate);

  const fajr = formatTimeBaku(prayerTimes.fajr, adjustments.fajr || 0);
  const sunrise = formatTimeBaku(prayerTimes.sunrise, adjustments.sunrise || 0);
  const dhuhr = formatTimeBaku(prayerTimes.dhuhr, adjustments.dhuhr || 0);
  const asr = formatTimeBaku(prayerTimes.asr, adjustments.asr || 0);
  const maghrib = formatTimeBaku(prayerTimes.maghrib, adjustments.maghrib || 0);
  const isha = formatTimeBaku(prayerTimes.isha, adjustments.isha || 0);
  const nightTimes = calculateSunnahNightTimes(maghrib, fajr);

  return {
    cityKey,
    cityName: city.name,
    lat: city.lat,
    lng: city.lng,
    qiblaAngle,
    distanceToKaabaKm,
    date: dateStr,
    calculationMethod: methodName,
    madhab: madhabName,
    source: "Astronomik hesablama · Adhan",
    timings: {
      fajr,
      sunrise,
      dhuhr,
      asr,
      maghrib,
      isha,
      midnight: nightTimes.midnight,
      tahajjud: nightTimes.tahajjud,
    },
  };
}

// Fetch prayer times with full cache key incorporating all parameters, timeout, retry, and local astronomical fallback
export async function fetchPrayerTimes(
  cityKey: string,
  targetDate: Date = new Date(),
  methodName: string = "MuslimWorldLeague",
  madhabName: "shafi" | "hanafi" = "shafi",
  adjustments: Record<string, number> = {}
): Promise<CityPrayerData> {
  const dateStr = getBakuDateString(targetDate);
  const adjKey = formatAdjustmentsCacheKey(adjustments);
  const cacheKey = `nur_prayer_${cityKey}_${dateStr}_${methodName}_${madhabName}_${adjKey}`;

  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timings && parsed.timings.fajr) {
        return parsed;
      }
    }
  } catch (_cacheErr) {}

  // Try API with 3.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `/api/prayer-times?city=${encodeURIComponent(cityKey)}&date=${dateStr}&method=${methodName}&madhab=${madhabName}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const city = AZERBAIJAN_CITIES[cityKey] || AZERBAIJAN_CITIES.Baki;
      const result: CityPrayerData = {
        cityKey,
        cityName: data.city || city.name,
        lat: city.lat,
        lng: city.lng,
        qiblaAngle: data.qiblaAngle ?? calculateQiblaAngle(city.lat, city.lng),
        distanceToKaabaKm: calculateDistanceToKaaba(city.lat, city.lng),
        date: data.date || dateStr,
        calculationMethod: data.calculationMethod || methodName,
        madhab: data.madhab || madhabName,
        source: data.source || "Astronomik hesablama · Adhan",
        timings: (() => {
          const fajr = applyAdjustmentToTimeString(data.timings.fajr, adjustments.fajr || 0);
          const sunrise = applyAdjustmentToTimeString(data.timings.sunrise, adjustments.sunrise || 0);
          const dhuhr = applyAdjustmentToTimeString(data.timings.dhuhr, adjustments.dhuhr || 0);
          const asr = applyAdjustmentToTimeString(data.timings.asr, adjustments.asr || 0);
          const maghrib = applyAdjustmentToTimeString(data.timings.maghrib, adjustments.maghrib || 0);
          const isha = applyAdjustmentToTimeString(data.timings.isha, adjustments.isha || 0);
          const nightTimes = calculateSunnahNightTimes(maghrib, fajr);
          return {
            fajr,
            sunrise,
            dhuhr,
            asr,
            maghrib,
            isha,
            midnight: nightTimes.midnight,
            tahajjud: nightTimes.tahajjud,
          };
        })(),
      };

      // Save to localStorage for offline cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (_e) {}

      return result;
    }
  } catch (_e) {
    // Fall through to local calculation
  }

  // Pure client-side astronomical calculation fallback
  const calculated = calculateLocalPrayerTimes(cityKey, targetDate, methodName, madhabName, adjustments);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(calculated));
  } catch (_e) {}
  return calculated;
}

// In-memory cache for loaded Surahs
const surahCache: Record<number, Ayah[]> = {};

// Fetch Quran surah ayahs with IndexedDB offline support
export async function fetchSurahAyahs(surahNumber: number): Promise<Ayah[]> {
  // 1. Check in-memory cache
  if (surahCache[surahNumber]) {
    return surahCache[surahNumber];
  }

  // 2. Check preloaded collection
  if (PRELOADED_SURAHS[surahNumber]) {
    surahCache[surahNumber] = PRELOADED_SURAHS[surahNumber];
    return PRELOADED_SURAHS[surahNumber];
  }

  // 3. Check persistent IndexedDB cache (no 5MB localStorage limits)
  try {
    const idbData = await getSurahFromIndexedDB(surahNumber);
    if (idbData && idbData.length > 0) {
      surahCache[surahNumber] = idbData;
      return idbData;
    }
  } catch (_idbErr) {}

  // 4. Check legacy localStorage cache
  try {
    const saved = localStorage.getItem(`nur_surah_cache_${surahNumber}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        surahCache[surahNumber] = parsed;
        // Migrate to IndexedDB in background
        saveSurahToIndexedDB(surahNumber, parsed);
        return parsed;
      }
    }
  } catch (_e) {}

  // 5. Attempt to fetch from public Quran Cloud API
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,az.mammadaliyev`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length >= 2) {
        const arabicData = json.data[0].ayahs;
        const azData = json.data[1].ayahs;

        const ayahs: Ayah[] = arabicData.map((item: { numberInSurah: number; text: string }, idx: number) => ({
          numberInSurah: item.numberInSurah,
          surahNumber: surahNumber,
          arabic: item.text,
          translation: azData[idx] ? azData[idx].text : "Tərcümə yüklənir...",
        }));

        surahCache[surahNumber] = ayahs;
        // Save to IndexedDB
        saveSurahToIndexedDB(surahNumber, ayahs);
        return ayahs;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch online surah ${surahNumber}:`, err);
  }

  // If offline or network error, recheck IndexedDB just in case
  const fallbackIdb = await getSurahFromIndexedDB(surahNumber);
  if (fallbackIdb && fallbackIdb.length > 0) {
    surahCache[surahNumber] = fallbackIdb;
    return fallbackIdb;
  }

  // Throw descriptive error if no cache exists (never fabricate fake Quran ayahs)
  throw new Error("Surə ayələrini internetdən yükləmək mümkün olmadı. Zəhmət olmasa internet bağlantınızı yoxlayıb yenidən cəhd edin.");
}

// Fallback intelligent answers for common Islamic questions
const FALLBACK_AI_KNOWLEDGE: Record<string, string> = {
  destemaz: `Dəstəmazın İslamda fərz olan 4 əsas şərti (əl-Maidə, 5:6):
1. Üzü bir dəfə yumaq (alın saçının bitdiyi yerdən çənənin altına, iki qulaq məməsinə qədər).
2. Qolları dirsəklərlə birlikdə yumaq.
3. Başın ən azı dörddə bir hissəsinə məsh çəkmək.
4. Ayaqları topuqlarla birlikdə yumaq.

Məzhəblərə görə:
- Şafi və Cəfəri məzhəbində dəstəmaza başlarkən niyyət etmək və əzaların sırasına (tərtibə) riayət etmək də fərz sayılır. Hənəfi məzhəbində isə niyyət və tərtib sünnətdir.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: əl-Maidə surəsi, 6-cı ayə.
- Səhih əl-Buxari: "Dəstəmaz kitabı", Hədis № 135.
- Səhih Müslim: Hədis № 226.`,

  qədr: `Qədr gecəsi Ramazan ayının son on gününün tək gecələrində (əsasən 21, 23, 25, 27 və ya 29-cu gecələrdə) axtarılır.

Əsas fəzilətləri:
1. Min aydan daha xeyirlidir (təxminən 83 il 4 aylıq ibadətə bərabərdir).
2. Quran-i Kərim ilk dəfə bu mübarək gecədə Lövhi-Məhfuzdan dünya səmasına endirilmişdir.
3. Mələklər və Cəbrail yer üzünə enərək səhərə qədər möminlərə salamatlıq və dua diləyərlər.

Peyğəmbərimizin tövsiyə etdiyi dua:
"Allahummə innəkə Afuvvun, tuhibbul-afvə fə'fu anni" (Allahım! Şübhəsiz ki, Sən Bağışlayansan, bağışlamağı sevirsən, məni də bağışla!).

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: əl-Qədr surəsi, 1-5-ci ayələr.
- ət-Tirmizi: Hədis № 3513 (Həzrət Aişədən rəvayət, Səhih).
- Səhih əl-Buxari: Hədis № 2014.`,

  tovbe: `İslamda tövbənin qəbul olunması üçün 4 əsas şərt vardır:
1. Günahı dərhal tərk etmək.
2. Etdiyi əmələ görə səmimi qəlbdən peşman olmaq.
3. Həmin günaha bir daha qayıtmamağa qətiyyətlə qərar vermək.
4. Əgər qul haqqı (başqasının haqqı) tapdanıbsa, mütləq həmin şəxsin haqqını qaytarmaq və ondan halallıq almaq.

Allah-Təala buyurur: "Ey iman gətirənlər! Allaha səmimi-qəlbdən tövbə edin!" (ət-Təhrim, 66:8).

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: ət-Təhrim surəsi, 8-ci ayə; əz-Zümər surəsi, 53-cü ayə.
- İmam Nəvəvi: "Riyazus-Salihin", Tövbə fəsli.
- Səhih Müslim: Hədis № 2758.`,
};

// Nur AI query service
export async function askNurAi(question: string, history: { role: string; text: string }[] = []): Promise<string> {
  try {
    const res = await fetch('/api/gemini/religious-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        return data.reply;
      }
    }
  } catch (err) {
    console.warn("Nur AI API error, falling back to local religious knowledge base:", err);
  }

  // Keyword-based fallback matching
  const lower = question.toLowerCase();
  if (lower.includes('dəstəmaz') || lower.includes('destemaz')) {
    return FALLBACK_AI_KNOWLEDGE.destemaz;
  }
  if (lower.includes('qədr') || lower.includes('qedr')) {
    return FALLBACK_AI_KNOWLEDGE.qədr;
  }
  if (lower.includes('tövbə') || lower.includes('tovbe') || lower.includes('bağışlan')) {
    return FALLBACK_AI_KNOWLEDGE.tovbe;
  }

  return `Əs-Səlamu aleykum. Sualınız üçün təşəkkür edirik.

İslam prinsiplərinə əsasən dini məsələlərdə etibarlı bilik Quran-i Kərim və Səhih Hədislərə əsaslanmalıdır. Mütəxəssislər tövsiyə edir ki, dəqiq fətvalar və gündəlik əməli məsələlərdə yerli etibarlı dini idarənin (məsələn, Qafqaz Müsəlmanları İdarəsi) müfti və şəriət heyətinə müraciət olunsun.

Xatırladaq ki, Nur AI bələdçi rolunu daşıyır və rəsmi fətva məqamı deyildir. Əgər sualınız namaz, oruc, zəkat və ya gündəlik zikrlərlə bağlıdırsa, tətbiqin müvafiq bölmələrindən ətraflı istifadə edə bilərsiniz.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: ən-Nəhl surəsi, 43-cü ayə: "Əgər bilmirsinizsə, zikr (elm) əhlindən soruşun!"
- Səhih əl-Buxari və Səhih Müslim.`;
}
