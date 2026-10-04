import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  HighLatitudeRule,
  SunnahTimes,
  Qibla,
} from "adhan";

dotenv.config();

const app = express();

function resolveServerPort(): number {
  const args = process.argv.slice(2);
  const portArgIdx = args.findIndex((a) => a === "--port" || a === "-p");
  if (portArgIdx !== -1 && args[portArgIdx + 1]) {
    const parsed = Number(args[portArgIdx + 1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  const npmConfigPort = Number(process.env.npm_config_port);
  if (!Number.isNaN(npmConfigPort) && npmConfigPort > 0) {
    return npmConfigPort;
  }

  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const defaultAppPort = Number(process.env.DEFAULT_APP_PORT);

  // In AI Studio preview container, Nginx listens on NGINX_PORT (8080) and proxies to DEFAULT_APP_PORT (3000).
  // Avoid colliding with Nginx on 8080 if PORT=8080 was inherited from the container environment in dev mode.
  if (
    process.env.NODE_ENV !== "production" &&
    !Number.isNaN(envPort) &&
    !Number.isNaN(nginxPort) &&
    envPort === nginxPort &&
    !Number.isNaN(defaultAppPort) &&
    defaultAppPort > 0
  ) {
    return defaultAppPort;
  }

  if (!Number.isNaN(envPort) && envPort > 0) {
    return envPort;
  }

  if (!Number.isNaN(defaultAppPort) && defaultAppPort > 0) {
    return defaultAppPort;
  }

  return 3000;
}

const PORT = resolveServerPort();
const HOST = "0.0.0.0";

app.use(express.json({ limit: "32kb" }));

// Allow cross-origin requests on /api/* so the Capacitor Android WebView (https://localhost) can call the production HTTPS backend
app.use("/api", (req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// In-memory sliding window rate limiter for AI chat (max 25 requests per minute per IP)
const ipRateLimits = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitData = ipRateLimits.get(ip);
  if (!limitData || now > limitData.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limitData.count >= 25) {
    return false;
  }
  limitData.count += 1;
  return true;
}

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRateLimits.entries()) {
    if (now > data.resetTime) {
      ipRateLimits.delete(ip);
    }
  }
}, 300000);

// Helper to get Baku date string (YYYY-MM-DD)
function getBakuDateStr(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Baku",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch (_e) {}
  // UTC+4 fallback calculation
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const bakuDate = new Date(utcTime + 4 * 3600000);
  return bakuDate.toISOString().split("T")[0];
}

// Helper to format Date to HH:mm in Asia/Baku timezone with robust UTC+4 fallback
function formatTimeToBaku(date: Date, minuteAdjustment: number = 0): string {
  if (!date || isNaN(date.getTime())) return "--:--";
  const adjusted = new Date(date.getTime() + minuteAdjustment * 60000);
  try {
    const parts = new Intl.DateTimeFormat("az-AZ", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baku",
      hour12: false,
    }).formatToParts(adjusted);
    const h = parts.find((p) => p.type === "hour")?.value || "00";
    const m = parts.find((p) => p.type === "minute")?.value || "00";
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  } catch (_e) {
    const utcTime = adjusted.getTime() + adjusted.getTimezoneOffset() * 60000;
    const bakuDate = new Date(utcTime + 4 * 3600000);
    const h = String(bakuDate.getHours()).padStart(2, "0");
    const m = String(bakuDate.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

// Lazy-initialized Gemini client (returns null gracefully if GEMINI_API_KEY is not set)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Comprehensive local Islamic knowledge base fallback when AI service is unavailable
function getLocalIslamicFallbackResponse(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("dəstəmaz") || lower.includes("destemaz")) {
    return `Dəstəmazın İslamda fərz olan 4 əsas şərti (əl-Maidə surəsi, 5:6):
1. Üzü bir dəfə tam yumaq (alın saçının bitdiyi yerdən çənənin altına, iki qulaq məməsinə qədər).
2. Qolları dirsəklərlə birlikdə yumaq.
3. Başın ən azı dörddə bir hissəsinə məsh çəkmək.
4. Ayaqları topuqlarla birlikdə yumaq.

Məzhəb fərqlilikləri:
- Şafi və Cəfəri məzhəblərində dəstəmaza başlayarkən niyyət etmək və əzaların sırasına (tərtibə) riayət etmək də fərz sayılır.
- Hənəfi məzhəbində isə niyyət və tərtib sünnətdir.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: əl-Maidə surəsi, 6-cı ayə.
- Səhih əl-Buxari: "Dəstəmaz kitabı", Hədis № 135.
- Səhih Müslim: Hədis № 226.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
  }

  if (lower.includes("qədr") || lower.includes("qedr")) {
    return `Qədr gecəsi (Leylətül-Qədr) Ramazan ayının son on gününün tək gecələrində (xüsusilə 27-ci gecəsində) axtarılır.

Əsas fəzilətləri:
1. Min aydan (təxminən 83 il 4 aylıq daimi ibadətdən) daha xeyirlidir.
2. Quran-i Kərim ilk dəfə bu mübarək gecədə Lövhi-Məhfuzdan dünya səmasına nazil olmuşdur.
3. Mələklər və Cəbrail (ə) yer üzünə enərək səhər şəfəqinə qədər bəndələrə salam və salamatlıq bəxş edərlər.

Peyğəmbərimizin (s.ə.s) tövsiyə etdiyi xüsusi dua:
"Allahummə innəkə Afuvvun, tuhibbul-afvə fə'fu anni" (Allahım! Şübhəsiz ki, Sən Bağışlayansan, bağışlamağı sevirsən, məni də bağışla!).

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: əl-Qədr surəsi, 1-5-ci ayələr.
- ət-Tirmizi: Hədis № 3513 (Səhih).
- Səhih əl-Buxari: Hədis № 2014.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
  }

  if (lower.includes("tövbə") || lower.includes("tovbe") || lower.includes("bağışlan")) {
    return `İslamda tövbənin qəbul olunması üçün 4 əsas şərt vardır:
1. Günahı dərhal tərk etmək.
2. Etdiyi günaha görə səmimi qəlbdən peşman olmaq.
3. Həmin günaha bir daha qayıtmamağa qətiyyətlə əhd etmək.
4. Əgər qul haqqı (insan haqqı) tapdanıbsa, mütləq həmin şəxsin haqqını qaytarmaq və ondan halallıq almaq.

Uca Allah buyurur: "Ey iman gətirənlər! Allaha səmimi-qəlbdən tövbə edin!" (ət-Təhrim, 66:8).

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: ət-Təhrim surəsi, 8-ci ayə; əz-Zümər surəsi, 53-cü ayə.
- Səhih Müslim: Hədis № 2758.
- İmam Nəvəvi: "Riyazus-Salihin", Tövbə fəsli.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
  }

  if (lower.includes("namaz") || lower.includes("vaxt") || lower.includes("səfər")) {
    return `Namaz İslamın 5 əsas sütunundan biridir və həddi-büluğa çatmış hər bir müsəlmana gündə 5 vaxt fərzdir:
1. Sübh – 2 rükət fərz.
2. Zöhr – 4 rükət fərz.
3. Əsr – 4 rükət fərz.
4. Məğrib (Şam) – 3 rükət fərz.
5. İşa (Xuftən) – 4 rükət fərz.

Səfər namazı (Qəsr):
- Şəriətə görə səfərə çıxan şəxs (təxminən 80-90 km və daha artıq məsafə) 4 rükətli fərz namazlarını (Zöhr, Əsr, İşa) 2 rükət olaraq qısaldaraq qılır. Sübh və Məğrib namazları qısaldılmaz.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: ən-Nisa surəsi, 101 və 103-cü ayələr.
- Səhih əl-Buxari: "Namazın qısaldılması kitabı", Hədis № 1082.
- Səhih Müslim: Hədis № 685.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
  }

  if (lower.includes("oruc") || lower.includes("ramazan") || lower.includes("iftar") || lower.includes("sahur")) {
    return `Ramazan ayı orucu İslamın beş şərtindən biridir (əl-Bəqərə, 2:183).

Orucun əsas qaydaları:
- Niyyət: İmsak vaxtından əvvəl oruca səmimi niyyət etmək fərzdir.
- İmsak və İftar: Sübh azanından (dan yerinin ağarmasından) günəşin tam qürub etdiyi ana (Məğrib azanına) qədər yemək, içmək və nəfsi istəklərdən uzaq durmaq.
- Orucu pozan hallar: Qəsdən yemək, içmək, bədənə qida xarakterli maddələr daxil etmək. Unudaraq yeyib-içmək isə orucu pozmaz; xatırlayan kimi dərhal ağzı yaxalamaq kifayətdir.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: əl-Bəqərə surəsi, 183-187-ci ayələr.
- Səhih əl-Buxari: Hədis № 1899.
- Səhih Müslim: Hədis № 1151.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
  }

  if (lower.includes("zikr") || lower.includes("təsbeh") || lower.includes("salavat")) {
    return `Zikr qəlbi nurlandıran və Allaha yaxınlaşdıran ən fəzilətli ibadətlərdəndir:
- "Sübhanallah" (33 dəfə)
- "Əlhəmdulilləh" (33 dəfə)
- "Allahu Əkbər" (33 dəfə)
- "Lə iləhə illəllah" (100 dəfə) – İmanın ən uca kəlməsi.
- Salavat: "Allahummə salli alə Muhəmmədin va alə əli Muhəmməd" – Kim Peyğəmbərə bir salavat göndərərsə, Allah ona on rəhmət göndərər.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: əl-Əhzab surəsi, 41-ci ayə: "Ey iman gətirənlər! Allahı çox zikr edin!"
- Səhih Müslim: Hədis № 597.
- Səhih əl-Buxari: Hədis № 6405.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
  }

  return `Əs-Səlamu aleykum və rəhmətullahi və bərəkətuh. Sualınız üçün təşəkkür edirik.

İslam prinsiplərinə görə hər bir dini məsələ Quran-i Kərim ayələri və Peyğəmbərimizin (s.ə.s) səhih sünnəsinə əsaslanmalıdır.

Məsləhətlər:
- Gündəlik namaz, oruc, zikr və dualar barədə tətbiqimizin "Namaz Vaxtları", "Quran", "Dualar" və "Təsbeh" bölmələrindən ətraflı istifadə edə bilərsiniz.
- Fərdi hüquqi məsələlər, miras, ailə və rəsmi fətvalar üçün yerli səlahiyyətli dini quruma (məsələn, Qafqaz Müsəlmanları İdarəsi) və ya mötəbər İslam alimlərinə müraciət etməyiniz tövsiyə olunur.

📌 Mənbələr və İstinadlar:
- Quran-i Kərim: ən-Nəhl surəsi, 43-cü ayə: "Əgər bilmirsinizsə, elm əhlindən soruşun!"
- Səhih əl-Buxari və Səhih Müslim.

⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur.`;
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Azerbaijani city coordinates for astronomical calculations
interface CityInfo {
  name: string;
  lat: number;
  lng: number;
}

const AZ_CITIES: Record<string, CityInfo> = {
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

// Prayer times endpoint using adhan astronomical library
app.get("/api/prayer-times", async (req: Request, res: Response) => {
  try {
    const cityKey = (req.query.city as string) || "Baki";
    const city = AZ_CITIES[cityKey] || AZ_CITIES.Baki;
    const requestedDateStr = req.query.date as string;
    const targetDate = requestedDateStr ? new Date(requestedDateStr) : new Date();

    const methodName = (req.query.method as string) || "MuslimWorldLeague";
    const madhabName = (req.query.madhab as string) || "shafi";

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
    const sunnahTimes = new SunnahTimes(prayerTimes);
    const qiblaAngle = Math.round(Qibla(coordinates) * 10) / 10;

    const timings = {
      fajr: formatTimeToBaku(prayerTimes.fajr),
      sunrise: formatTimeToBaku(prayerTimes.sunrise),
      dhuhr: formatTimeToBaku(prayerTimes.dhuhr),
      asr: formatTimeToBaku(prayerTimes.asr),
      maghrib: formatTimeToBaku(prayerTimes.maghrib),
      isha: formatTimeToBaku(prayerTimes.isha),
      midnight: formatTimeToBaku(sunnahTimes.middleOfTheNight),
      tahajjud: formatTimeToBaku(sunnahTimes.lastThirdOfTheNight),
    };

    res.json({
      city: city.name,
      cityKey,
      coordinates: { lat: city.lat, lng: city.lng },
      date: getBakuDateStr(targetDate),
      timings,
      qiblaAngle,
      calculationMethod: methodName,
      madhab: madhabName,
      source: "Astronomik hesablama · Adhan",
    });
  } catch (error) {
    console.error("Prayer times error:", error);
    res.status(500).json({ error: "Namaz vaxtlarını əldə etmək mümkün olmadı." });
  }
});

// Nur AI religious chat assistant endpoint
app.post("/api/gemini/religious-chat", async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: "Həddindən artıq sorğu göndərildi. Zəhmət olmasa bir dəqiqə gözləyin." });
      return;
    }

    const { question, history } = req.body;

    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "Sual mətni tələb olunur." });
      return;
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0 || trimmedQuestion.length > 1000) {
      res.status(400).json({ error: "Sual mətni 1 ilə 1000 simvol arasında olmalıdır." });
      return;
    }

    const ai = getGeminiClient();

    // If Gemini client cannot be initialized (e.g. no GEMINI_API_KEY), gracefully return local fallback
    if (!ai) {
      const fallbackReply = getLocalIslamicFallbackResponse(trimmedQuestion);
      res.json({ reply: fallbackReply });
      return;
    }

    const systemInstruction = `Sən “Nur” adlı müasir İslam bələdçisi tətbiqinin etibarlı dini köməkçisisən (Nur AI).
Sənin əsas məqsədin istifadəçilərə İslam dini, Quran ayələri, hədislər, ibadətlər (namaz, oruc, zəkat, həcc, zikr, dua) və əxlaq haqqında dəqiq, mötəbər və maarifləndirici məlumat verməkdir.

AŞAĞIDAKİ QAYDALARA QƏTİYYƏTLƏ ƏMƏL ET:
1. Dini hökmü və ya fətvanı heç vaxt özündən uydurma.
2. Heç vaxt mövcud olmayan surə, ayə və ya uydurma hədis nömrəsi yaratma. Əgər konkret nömrədən əmin deyilsənsə, bunu açıq qeyd et və ya yalnız mənasını bildir.
3. Cavabların Quran-i Kərim ayələrinə və səhih hədislərə (Buxari, Müslim, Tirmizi, Əbu Davud, Nəsai, İbn Macə və s.) əsaslansın.
4. Fiqhi ixtilaflı məsələlərdə (məzhəb fərqlilikləri) heç bir məzhəbi tənqid etmədən Hənəfi, Şafii, Cəfəri, Maliki kimi mötəbər İslam məzhəblərinin mövqelərini obyektiv və ehtiramla qeyd et.
5. Özünü alim, müctəhid və ya müfti kimi təqdim etmə. Sən sadəcə etibarlı mənbələrə istinad edən dini bələdçisən.
6. Tibbi, cərrahi, hüquqi, məhkəmə və ya yüksək riskli şəxsi məsələlərdə istifadəçiyə mütləq ixtisaslı mütəxəssisə (həkim, hüquqşünas) və ya yerli rəsmi dini quruma (məsələn, Qafqaz Müsəlmanları İdarəsi) müraciət etməyi tövsiyə et.
7. Əmin olmadığın və ya İslamda dəqiq cavabı olmayan məsələlərdə bunu açıq şəkildə bildir ("Bu məsələdə dəqiq səhih mətn qeyd olunmayıb və ya alimlər arasında fərqli rəylər var").
8. Bütün cavabları təmiz, səlis və nəzakətli Azərbaycan dilində yaz.
9. Hər cavabın sonunda mütləq "📌 Mənbələr və İstinadlar:" başlığı altında istifadə etdiyin surə, ayə və hədis mənbələrini qeyd et.
10. Cavabın ən sonunda bu xəbərdarlıq qeydini əlavə et:
"⚠️ Qeyd: Cavabda qeyd olunan istinadların (ayə və hədis nömrələrinin) dəqiqliyini mötəbər dini kitablardan və ya rəsmi mənbələrdən ayrıca yoxlamaq tövsiyə olunur."`;

    // Limit conversation history to latest 6 messages (max 1000 chars each) to prevent payload flooding
    const safeHistory = Array.isArray(history)
      ? history
          .filter((m) => m && typeof m === "object")
          .slice(-6)
      : [];

    const contents = safeHistory.length > 0
      ? [
          ...safeHistory.map((m: { role?: string; text?: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: String(m.text || "").slice(0, 1000) }],
          })),
          {
            role: "user",
            parts: [{ text: trimmedQuestion }],
          },
        ]
      : trimmedQuestion;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.25, // Lower temperature for high factual accuracy in religious answers
        },
      });

      const reply = response.text || getLocalIslamicFallbackResponse(trimmedQuestion);
      res.json({ reply });
    } catch (_genError) {
      console.warn("[Nur AI] Gemini generation unavailable, using local fallback.");
      const fallbackReply = getLocalIslamicFallbackResponse(trimmedQuestion);
      res.json({ reply: fallbackReply });
    }
  } catch (_error: unknown) {
    console.error("[Nur AI] Request processing error, using local fallback.");
    // Never crash or expose internal error details/secrets to client
    const questionText = typeof req.body?.question === "string" ? req.body.question.slice(0, 1000) : "";
    res.json({ reply: getLocalIslamicFallbackResponse(questionText) });
  }
});

async function startServer() {
  const server = http.createServer(app);
  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");
  const staticDistMiddleware = express.static(distPath, { maxAge: "1d", index: false });

  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: false,
          watch: {
            ignored: ["**/android/**", "**/dist/**"],
          },
        },
        optimizeDeps: {
          entries: ["index.html"],
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("[Nur Server] Vite initialization error:", err);
      app.use(staticDistMiddleware);
      app.get("*", (_req: Request, res: Response) => {
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).send("Vite initialization failed and dist/index.html was not found.");
        }
      });
    }
  } else {
    app.use(staticDistMiddleware);
    app.get("*", (_req: Request, res: Response) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Nur web tətbiqi dist/index.html faylı tapılmadı.");
      }
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`Nur app server running on http://${HOST}:${PORT}`);
  });
}

startServer();
