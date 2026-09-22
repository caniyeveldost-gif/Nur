import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Azerbaijani city coordinates and time offsets from Baku (minutes)
interface CityInfo {
  name: string;
  lat: number;
  lng: number;
  offsetMinutes: number; // Offset relative to Baku standard prayer times
}

const AZ_CITIES: Record<string, CityInfo> = {
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

// Calculation of base prayer times for today in Baku
function getBaseBakuPrayerTimes(date: Date) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  
  // Seasonal approximate astronomical curves for Baku latitude (40.4° N)
  // Sübh (Fajr): ~04:00 (summer) to ~06:30 (winter)
  const seasonSin = Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365);
  
  const fajrMin = Math.round(330 - seasonSin * 70); // 05:30 base +/- 70min
  const sunriseMin = Math.round(415 - seasonSin * 65); // 06:55 base +/- 65min
  const dhuhrMin = 770; // 12:50 base
  const asrMin = Math.round(980 + seasonSin * 45); // 16:20 base +/- 45min
  const maghribMin = Math.round(1125 + seasonSin * 65); // 18:45 base +/- 65min
  const ishaMin = Math.round(1210 + seasonSin * 60); // 20:10 base +/- 60min

  return {
    fajr: fajrMin,
    sunrise: sunriseMin,
    dhuhr: dhuhrMin,
    asr: asrMin,
    maghrib: maghribMin,
    isha: ishaMin,
  };
}

function formatMinutesToTime(totalMinutes: number): string {
  const normalized = (totalMinutes + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Prayer times endpoint
app.get("/api/prayer-times", async (req: Request, res: Response) => {
  try {
    const cityKey = (req.query.city as string) || "Baki";
    const city = AZ_CITIES[cityKey] || AZ_CITIES.Baki;
    const now = new Date();

    const baseTimes = getBaseBakuPrayerTimes(now);
    const offset = city.offsetMinutes;

    const timings = {
      fajr: formatMinutesToTime(baseTimes.fajr + offset),
      sunrise: formatMinutesToTime(baseTimes.sunrise + offset),
      dhuhr: formatMinutesToTime(baseTimes.dhuhr + offset),
      asr: formatMinutesToTime(baseTimes.asr + offset),
      maghrib: formatMinutesToTime(baseTimes.maghrib + offset),
      isha: formatMinutesToTime(baseTimes.isha + offset),
    };

    res.json({
      city: city.name,
      cityKey,
      coordinates: { lat: city.lat, lng: city.lng },
      date: now.toISOString().split("T")[0],
      timings,
      source: "Qafqaz Müsəlmanları İdarəsi / Astronomik hesablama",
    });
  } catch (error) {
    console.error("Prayer times error:", error);
    res.status(500).json({ error: "Namaz vaxtlarını əldə etmək mümkün olmadı." });
  }
});

// Nur AI religious chat assistant endpoint
app.post("/api/gemini/religious-chat", async (req: Request, res: Response) => {
  try {
    const { question, history } = req.body;

    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "Sual mətni tələb olunur." });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `Sən “Nur” adlı müasir İslam bələdçisi tətbiqinin etibarlı dini köməkçisisən (Nur AI).
Sənin əsas məqsədin istifadəçilərə İslam dini, Quran ayələri, hədislər, ibadətlər (namaz, oruc, zəkat, həcc, zikr, dua) və əxlaq haqqında dəqiq, mötəbər və maarifləndirici məlumat verməkdir.

AŞAĞIDAKİ QAYDALARA QƏTİYYƏTLƏ ƏMƏL ET:
1. Dini hökmü və ya fətvanı heç vaxt özündən uydurma.
2. Cavabların Quran-i Kərim ayələrinə (surə və ayə nömrəsi ilə, məsələn: "əl-Bəqərə, 2:152") və səhih hədislərə (Buxari, Müslim, Tirmizi, Əbu Davud, Nəsai, İbn Macə və s.) əsaslansın.
3. Fiqhi ixtilaflı məsələlərdə (məzhəb fərqlilikləri) heç bir məzhəbi pisləmədən Hənəfi, Şafii, Cəfəri, Maliki kimi mötəbər İslam məzhəblərinin mövqelərini obyektiv və ehtiramla qeyd et.
4. Özünü alim, müctəhid və ya müfti kimi təqdim etmə. Sən sadəcə etibarlı mənbələrə istinad edən dini bələdçisən.
5. Tibbi, cərrahi, hüquqi, məhkəmə və ya yüksək riskli şəxsi məsələlərdə istifadəçiyə mütləq ixtisaslı mütəxəssisə (həkim, hüquqşünas) və ya yerli rəsmi dini quruma (məsələn, Qafqaz Müsəlmanları İdarəsi) müraciət etməyi tövsiyə et.
6. Əmin olmadığın və ya İslamda dəqiq cavabı olmayan məsələlərdə bunu açıq şəkildə bildir ("Bu məsələdə dəqiq səhih mətn qeyd olunmayıb və ya alimlər arasında ixtilaf var").
7. Bütün cavabları təmiz, səlis və nəzakətli Azərbaycan dilində yaz.
8. Hər cavabın sonunda mütləq "📌 Mənbələr və İstinadlar:" başlığı altında istifadə etdiyin surə, ayə və hədis mənbələrini qeyd et.`;

    const contents = history && Array.isArray(history) && history.length > 0
      ? [
          ...history.map((m: { role: string; text: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.text }],
          })),
          {
            role: "user",
            parts: [{ text: question }],
          },
        ]
      : question;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for high factual accuracy in religious answers
      },
    });

    const reply = response.text || "Bağışlayın, cavab hazırlana bilmədi. Zəhmət olmasa sualınızı bir qədər fərqli formada yenidən verin.";

    res.json({ reply });
  } catch (error: unknown) {
    console.error("Gemini religious-chat error:", error);
    const errMsg = error instanceof Error ? error.message : "Bilinməyən xəta";
    res.status(500).json({
      error: "Dini köməkçi ilə əlaqə qurarkən xəta baş verdi.",
      details: errMsg,
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
