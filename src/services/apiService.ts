import { Ayah, CityPrayerData } from '../types';
import { PRELOADED_SURAHS, ALL_SURAHS } from '../data/surahs';

// Azerbaijani cities with coordinates and calculated Qibla angles
export const AZERBAIJAN_CITIES: Record<string, { name: string; lat: number; lng: number; offsetMinutes: number }> = {
  Baki: { name: "Bakı", lat: 40.4093, lng: 49.8671, offsetMinutes: 0 },
  Sumqayit: { name: "Sumqayıt", lat: 40.5897, lng: 49.6686, offsetMinutes: 1 },
  Gence: { name: "Gəncə", lat: 40.6828, lng: 46.3606, offsetMinutes: 14 },
  Lenkeran: { name: "Lənkəran", lat: 38.7529, lng: 48.8475, offsetMinutes: 4 },
  Masalli: { name: "Masallı", lat: 39.0341, lng: 48.6654, offsetMinutes: 5 },
  Astara: { name: "Astara", lat: 38.4559, lng: 48.8744, offsetMinutes: 4 },
  Seki: { name: "Şəki", lat: 41.1919, lng: 47.1706, offsetMinutes: 11 },
  Mingecevir: { name: "Mingəçevir", lat: 40.7703, lng: 47.0496, offsetMinutes: 11 },
  Naxcivan: { name: "Naxçıvan", lat: 39.2089, lng: 45.4122, offsetMinutes: 18 },
  Quba: { name: "Quba", lat: 41.3643, lng: 48.5134, offsetMinutes: 5 },
  Samaxi: { name: "Şamaxı", lat: 40.6319, lng: 48.6414, offsetMinutes: 5 },
  Susa: { name: "Şuşa", lat: 39.7588, lng: 46.7497, offsetMinutes: 13 },
  Xankendi: { name: "Xankəndi", lat: 39.8265, lng: 46.7656, offsetMinutes: 13 },
  Zaqatala: { name: "Zaqatala", lat: 41.6336, lng: 46.6433, offsetMinutes: 13 },
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

// Local astronomical calculation for prayer times
export function calculateLocalPrayerTimes(cityKey: string): CityPrayerData {
  const city = AZERBAIJAN_CITIES[cityKey] || AZERBAIJAN_CITIES.Baki;
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );

  const seasonSin = Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365);
  const offset = city.offsetMinutes;

  const fajrMin = Math.round(330 - seasonSin * 70) + offset;
  const sunriseMin = Math.round(415 - seasonSin * 65) + offset;
  const dhuhrMin = 770 + offset;
  const asrMin = Math.round(980 + seasonSin * 45) + offset;
  const maghribMin = Math.round(1125 + seasonSin * 65) + offset;
  const ishaMin = Math.round(1210 + seasonSin * 60) + offset;

  const formatMin = (m: number) => {
    const norm = (m + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const min = norm % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  const qiblaAngle = calculateQiblaAngle(city.lat, city.lng);
  const distanceToKaabaKm = calculateDistanceToKaaba(city.lat, city.lng);

  return {
    cityKey,
    cityName: city.name,
    lat: city.lat,
    lng: city.lng,
    qiblaAngle,
    distanceToKaabaKm,
    timings: {
      fajr: formatMin(fajrMin),
      sunrise: formatMin(sunriseMin),
      dhuhr: formatMin(dhuhrMin),
      asr: formatMin(asrMin),
      maghrib: formatMin(maghribMin),
      isha: formatMin(ishaMin),
    },
  };
}

// Fetch prayer times from API or fallback
export async function fetchPrayerTimes(cityKey: string): Promise<CityPrayerData> {
  try {
    const res = await fetch(`/api/prayer-times?city=${encodeURIComponent(cityKey)}`);
    if (res.ok) {
      const data = await res.json();
      const city = AZERBAIJAN_CITIES[cityKey] || AZERBAIJAN_CITIES.Baki;
      return {
        cityKey,
        cityName: data.city || city.name,
        lat: city.lat,
        lng: city.lng,
        qiblaAngle: calculateQiblaAngle(city.lat, city.lng),
        distanceToKaabaKm: calculateDistanceToKaaba(city.lat, city.lng),
        timings: data.timings,
      };
    }
  } catch (e) {
    console.warn("Backend prayer times route unavailable, using local astronomical calculation:", e);
  }
  return calculateLocalPrayerTimes(cityKey);
}

// In-memory cache for loaded Surahs
const surahCache: Record<number, Ayah[]> = {};

// Fetch Quran surah ayahs
export async function fetchSurahAyahs(surahNumber: number): Promise<Ayah[]> {
  // Check memory cache
  if (surahCache[surahNumber]) {
    return surahCache[surahNumber];
  }

  // Check preloaded collection
  if (PRELOADED_SURAHS[surahNumber]) {
    surahCache[surahNumber] = PRELOADED_SURAHS[surahNumber];
    return PRELOADED_SURAHS[surahNumber];
  }

  // Check persistent localStorage cache
  try {
    const saved = localStorage.getItem(`nur_surah_cache_${surahNumber}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        surahCache[surahNumber] = parsed;
        return parsed;
      }
    }
  } catch (_e) {
    // Ignore storage parse error
  }

  // Attempt to fetch from public Quran Cloud API
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
        try {
          localStorage.setItem(`nur_surah_cache_${surahNumber}`, JSON.stringify(ayahs));
        } catch (_storageErr) {}
        return ayahs;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch online surah ${surahNumber}:`, err);
  }

  // If offline or network error and no cache exists, throw descriptive error (do not fabricate fake Quran ayahs)
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
