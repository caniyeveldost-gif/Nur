import express, { Request, Response } from "express";
import path from "path";
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
const PORT = 3000;

app.use(express.json({ limit: "100kb" }));

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

// Helper to get Baku date string
function getBakuDateStr(date: Date = new Date()): string {
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

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY mühit dəyişəni təyin olunmayıb.");
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

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", app: "Nur", time: new Date().toISOString() });
});

// Azerbaijani city coordinates for astronomical calculations
// AUDIT NOTE: Manual city 'offsetMinutes' have been completely removed.
// Adhan calculates precise astronomical solar prayer times directly from each city's exact
// geographical latitude and longitude (e.g. Gəncə 46.36°E vs Bakı 49.87°E). Adding manual offsets
// on top of astronomical coordinates would produce double-offset errors.
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

// Helper to format Date to HH:mm in Asia/Baku timezone
function formatTimeToBaku(date: Date, minuteAdjustment: number = 0): string {
  const adjusted = new Date(date.getTime() + minuteAdjustment * 60000);
  return adjusted.toLocaleTimeString("az-AZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Baku",
    hour12: false,
  });
}

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

    // Limit conversation history to latest 10 messages to prevent payload flooding
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

    const contents = safeHistory.length > 0
      ? [
          ...safeHistory.map((m: { role: string; text: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: String(m.text || "").slice(0, 1500) }],
          })),
          {
            role: "user",
            parts: [{ text: trimmedQuestion }],
          },
        ]
      : trimmedQuestion;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.25, // Lower temperature for high factual accuracy in religious answers
      },
    });

    const reply = response.text || "Bağışlayın, cavab hazırlana bilmədi. Zəhmət olmasa sualınızı bir qədər fərqli formada yenidən verin.";

    res.json({ reply });
  } catch (error: unknown) {
    console.error("Gemini religious-chat error:", error);
    res.status(500).json({
      error: "Dini köməkçi ilə əlaqə qurarkən xəta baş verdi. Zəhmət olmasa bir qədər sonra yenidən cəhd edin.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nur app server running on http://localhost:${PORT}`);
  });
}

startServer();
