var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_adhan = require("adhan");
import_dotenv.default.config();
var app = (0, import_express.default)();
function resolveServerPort() {
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
  if (process.env.NODE_ENV !== "production" && !Number.isNaN(envPort) && !Number.isNaN(nginxPort) && envPort === nginxPort && !Number.isNaN(defaultAppPort) && defaultAppPort > 0) {
    return defaultAppPort;
  }
  if (!Number.isNaN(envPort) && envPort > 0) {
    return envPort;
  }
  if (!Number.isNaN(defaultAppPort) && defaultAppPort > 0) {
    return defaultAppPort;
  }
  return 3e3;
}
var PORT = resolveServerPort();
var HOST = "0.0.0.0";
app.use(import_express.default.json({ limit: "32kb" }));
app.use("/api", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
var ipRateLimits = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const limitData = ipRateLimits.get(ip);
  if (!limitData || now > limitData.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + 6e4 });
    return true;
  }
  if (limitData.count >= 25) {
    return false;
  }
  limitData.count += 1;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRateLimits.entries()) {
    if (now > data.resetTime) {
      ipRateLimits.delete(ip);
    }
  }
}, 3e5);
function getBakuDateStr(date = /* @__PURE__ */ new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Baku",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch (_e) {
  }
  const utcTime = date.getTime() + date.getTimezoneOffset() * 6e4;
  const bakuDate = new Date(utcTime + 4 * 36e5);
  return bakuDate.toISOString().split("T")[0];
}
function formatTimeToBaku(date, minuteAdjustment = 0) {
  if (!date || isNaN(date.getTime())) return "--:--";
  const adjusted = new Date(date.getTime() + minuteAdjustment * 6e4);
  try {
    const parts = new Intl.DateTimeFormat("az-AZ", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baku",
      hour12: false
    }).formatToParts(adjusted);
    const h = parts.find((p) => p.type === "hour")?.value || "00";
    const m = parts.find((p) => p.type === "minute")?.value || "00";
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  } catch (_e) {
    const utcTime = adjusted.getTime() + adjusted.getTimezoneOffset() * 6e4;
    const bakuDate = new Date(utcTime + 4 * 36e5);
    const h = String(bakuDate.getHours()).padStart(2, "0");
    const m = String(bakuDate.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function getLocalIslamicFallbackResponse(question) {
  const lower = question.toLowerCase();
  if (lower.includes("d\u0259st\u0259maz") || lower.includes("destemaz")) {
    return `D\u0259st\u0259maz\u0131n \u0130slamda f\u0259rz olan 4 \u0259sas \u015F\u0259rti (\u0259l-Maid\u0259 sur\u0259si, 5:6):
1. \xDCz\xFC bir d\u0259f\u0259 tam yumaq (al\u0131n sa\xE7\u0131n\u0131n bitdiyi yerd\u0259n \xE7\u0259n\u0259nin alt\u0131na, iki qulaq m\u0259m\u0259sin\u0259 q\u0259d\u0259r).
2. Qollar\u0131 dirs\u0259kl\u0259rl\u0259 birlikd\u0259 yumaq.
3. Ba\u015F\u0131n \u0259n az\u0131 d\xF6rdd\u0259 bir hiss\u0259sin\u0259 m\u0259sh \xE7\u0259km\u0259k.
4. Ayaqlar\u0131 topuqlarla birlikd\u0259 yumaq.

M\u0259zh\u0259b f\u0259rqlilikl\u0259ri:
- \u015Eafi v\u0259 C\u0259f\u0259ri m\u0259zh\u0259bl\u0259rind\u0259 d\u0259st\u0259maza ba\u015Flayark\u0259n niyy\u0259t etm\u0259k v\u0259 \u0259zalar\u0131n s\u0131ras\u0131na (t\u0259rtib\u0259) riay\u0259t etm\u0259k d\u0259 f\u0259rz say\u0131l\u0131r.
- H\u0259n\u0259fi m\u0259zh\u0259bind\u0259 is\u0259 niyy\u0259t v\u0259 t\u0259rtib s\xFCnn\u0259tdir.

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259l-Maid\u0259 sur\u0259si, 6-c\u0131 ay\u0259.
- S\u0259hih \u0259l-Buxari: "D\u0259st\u0259maz kitab\u0131", H\u0259dis \u2116 135.
- S\u0259hih M\xFCslim: H\u0259dis \u2116 226.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
  }
  if (lower.includes("q\u0259dr") || lower.includes("qedr")) {
    return `Q\u0259dr gec\u0259si (Leyl\u0259t\xFCl-Q\u0259dr) Ramazan ay\u0131n\u0131n son on g\xFCn\xFCn\xFCn t\u0259k gec\u0259l\u0259rind\u0259 (x\xFCsusil\u0259 27-ci gec\u0259sind\u0259) axtar\u0131l\u0131r.

\u018Fsas f\u0259zil\u0259tl\u0259ri:
1. Min aydan (t\u0259xmin\u0259n 83 il 4 ayl\u0131q daimi ibad\u0259td\u0259n) daha xeyirlidir.
2. Quran-i K\u0259rim ilk d\u0259f\u0259 bu m\xFCbar\u0259k gec\u0259d\u0259 L\xF6vhi-M\u0259hfuzdan d\xFCnya s\u0259mas\u0131na nazil olmu\u015Fdur.
3. M\u0259l\u0259kl\u0259r v\u0259 C\u0259brail (\u0259) yer \xFCz\xFCn\u0259 en\u0259r\u0259k s\u0259h\u0259r \u015F\u0259f\u0259qin\u0259 q\u0259d\u0259r b\u0259nd\u0259l\u0259r\u0259 salam v\u0259 salamatl\u0131q b\u0259x\u015F ed\u0259rl\u0259r.

Pey\u011F\u0259mb\u0259rimizin (s.\u0259.s) t\xF6vsiy\u0259 etdiyi x\xFCsusi dua:
"Allahumm\u0259 inn\u0259k\u0259 Afuvvun, tuhibbul-afv\u0259 f\u0259'fu anni" (Allah\u0131m! \u015E\xFCbh\u0259siz ki, S\u0259n Ba\u011F\u0131\u015Flayansan, ba\u011F\u0131\u015Flama\u011F\u0131 sevirs\u0259n, m\u0259ni d\u0259 ba\u011F\u0131\u015Fla!).

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259l-Q\u0259dr sur\u0259si, 1-5-ci ay\u0259l\u0259r.
- \u0259t-Tirmizi: H\u0259dis \u2116 3513 (S\u0259hih).
- S\u0259hih \u0259l-Buxari: H\u0259dis \u2116 2014.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
  }
  if (lower.includes("t\xF6vb\u0259") || lower.includes("tovbe") || lower.includes("ba\u011F\u0131\u015Flan")) {
    return `\u0130slamda t\xF6vb\u0259nin q\u0259bul olunmas\u0131 \xFC\xE7\xFCn 4 \u0259sas \u015F\u0259rt vard\u0131r:
1. G\xFCnah\u0131 d\u0259rhal t\u0259rk etm\u0259k.
2. Etdiyi g\xFCnaha g\xF6r\u0259 s\u0259mimi q\u0259lbd\u0259n pe\u015Fman olmaq.
3. H\u0259min g\xFCnaha bir daha qay\u0131tmama\u011Fa q\u0259tiyy\u0259tl\u0259 \u0259hd etm\u0259k.
4. \u018Fg\u0259r qul haqq\u0131 (insan haqq\u0131) tapdan\u0131bsa, m\xFCtl\u0259q h\u0259min \u015F\u0259xsin haqq\u0131n\u0131 qaytarmaq v\u0259 ondan halall\u0131q almaq.

Uca Allah buyurur: "Ey iman g\u0259tir\u0259nl\u0259r! Allaha s\u0259mimi-q\u0259lbd\u0259n t\xF6vb\u0259 edin!" (\u0259t-T\u0259hrim, 66:8).

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259t-T\u0259hrim sur\u0259si, 8-ci ay\u0259; \u0259z-Z\xFCm\u0259r sur\u0259si, 53-c\xFC ay\u0259.
- S\u0259hih M\xFCslim: H\u0259dis \u2116 2758.
- \u0130mam N\u0259v\u0259vi: "Riyazus-Salihin", T\xF6vb\u0259 f\u0259sli.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
  }
  if (lower.includes("namaz") || lower.includes("vaxt") || lower.includes("s\u0259f\u0259r")) {
    return `Namaz \u0130slam\u0131n 5 \u0259sas s\xFCtunundan biridir v\u0259 h\u0259ddi-b\xFClu\u011Fa \xE7atm\u0131\u015F h\u0259r bir m\xFCs\u0259lmana g\xFCnd\u0259 5 vaxt f\u0259rzdir:
1. S\xFCbh \u2013 2 r\xFCk\u0259t f\u0259rz.
2. Z\xF6hr \u2013 4 r\xFCk\u0259t f\u0259rz.
3. \u018Fsr \u2013 4 r\xFCk\u0259t f\u0259rz.
4. M\u0259\u011Frib (\u015Eam) \u2013 3 r\xFCk\u0259t f\u0259rz.
5. \u0130\u015Fa (Xuft\u0259n) \u2013 4 r\xFCk\u0259t f\u0259rz.

S\u0259f\u0259r namaz\u0131 (Q\u0259sr):
- \u015E\u0259ri\u0259t\u0259 g\xF6r\u0259 s\u0259f\u0259r\u0259 \xE7\u0131xan \u015F\u0259xs (t\u0259xmin\u0259n 80-90 km v\u0259 daha art\u0131q m\u0259saf\u0259) 4 r\xFCk\u0259tli f\u0259rz namazlar\u0131n\u0131 (Z\xF6hr, \u018Fsr, \u0130\u015Fa) 2 r\xFCk\u0259t olaraq q\u0131saldaraq q\u0131l\u0131r. S\xFCbh v\u0259 M\u0259\u011Frib namazlar\u0131 q\u0131sald\u0131lmaz.

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259n-Nisa sur\u0259si, 101 v\u0259 103-c\xFC ay\u0259l\u0259r.
- S\u0259hih \u0259l-Buxari: "Namaz\u0131n q\u0131sald\u0131lmas\u0131 kitab\u0131", H\u0259dis \u2116 1082.
- S\u0259hih M\xFCslim: H\u0259dis \u2116 685.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
  }
  if (lower.includes("oruc") || lower.includes("ramazan") || lower.includes("iftar") || lower.includes("sahur")) {
    return `Ramazan ay\u0131 orucu \u0130slam\u0131n be\u015F \u015F\u0259rtind\u0259n biridir (\u0259l-B\u0259q\u0259r\u0259, 2:183).

Orucun \u0259sas qaydalar\u0131:
- Niyy\u0259t: \u0130msak vaxt\u0131ndan \u0259vv\u0259l oruca s\u0259mimi niyy\u0259t etm\u0259k f\u0259rzdir.
- \u0130msak v\u0259 \u0130ftar: S\xFCbh azan\u0131ndan (dan yerinin a\u011Farmas\u0131ndan) g\xFCn\u0259\u015Fin tam q\xFCrub etdiyi ana (M\u0259\u011Frib azan\u0131na) q\u0259d\u0259r yem\u0259k, i\xE7m\u0259k v\u0259 n\u0259fsi ist\u0259kl\u0259rd\u0259n uzaq durmaq.
- Orucu pozan hallar: Q\u0259sd\u0259n yem\u0259k, i\xE7m\u0259k, b\u0259d\u0259n\u0259 qida xarakterli madd\u0259l\u0259r daxil etm\u0259k. Unudaraq yeyib-i\xE7m\u0259k is\u0259 orucu pozmaz; xat\u0131rlayan kimi d\u0259rhal a\u011Fz\u0131 yaxalamaq kifay\u0259tdir.

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259l-B\u0259q\u0259r\u0259 sur\u0259si, 183-187-ci ay\u0259l\u0259r.
- S\u0259hih \u0259l-Buxari: H\u0259dis \u2116 1899.
- S\u0259hih M\xFCslim: H\u0259dis \u2116 1151.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
  }
  if (lower.includes("zikr") || lower.includes("t\u0259sbeh") || lower.includes("salavat")) {
    return `Zikr q\u0259lbi nurland\u0131ran v\u0259 Allaha yax\u0131nla\u015Fd\u0131ran \u0259n f\u0259zil\u0259tli ibad\u0259tl\u0259rd\u0259ndir:
- "S\xFCbhanallah" (33 d\u0259f\u0259)
- "\u018Flh\u0259mdulill\u0259h" (33 d\u0259f\u0259)
- "Allahu \u018Fkb\u0259r" (33 d\u0259f\u0259)
- "L\u0259 il\u0259h\u0259 ill\u0259llah" (100 d\u0259f\u0259) \u2013 \u0130man\u0131n \u0259n uca k\u0259lm\u0259si.
- Salavat: "Allahumm\u0259 salli al\u0259 Muh\u0259mm\u0259din va al\u0259 \u0259li Muh\u0259mm\u0259d" \u2013 Kim Pey\u011F\u0259mb\u0259r\u0259 bir salavat g\xF6nd\u0259r\u0259rs\u0259, Allah ona on r\u0259hm\u0259t g\xF6nd\u0259r\u0259r.

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259l-\u018Fhzab sur\u0259si, 41-ci ay\u0259: "Ey iman g\u0259tir\u0259nl\u0259r! Allah\u0131 \xE7ox zikr edin!"
- S\u0259hih M\xFCslim: H\u0259dis \u2116 597.
- S\u0259hih \u0259l-Buxari: H\u0259dis \u2116 6405.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
  }
  return `\u018Fs-S\u0259lamu aleykum v\u0259 r\u0259hm\u0259tullahi v\u0259 b\u0259r\u0259k\u0259tuh. Sual\u0131n\u0131z \xFC\xE7\xFCn t\u0259\u015F\u0259kk\xFCr edirik.

\u0130slam prinsipl\u0259rin\u0259 g\xF6r\u0259 h\u0259r bir dini m\u0259s\u0259l\u0259 Quran-i K\u0259rim ay\u0259l\u0259ri v\u0259 Pey\u011F\u0259mb\u0259rimizin (s.\u0259.s) s\u0259hih s\xFCnn\u0259sin\u0259 \u0259saslanmal\u0131d\u0131r.

M\u0259sl\u0259h\u0259tl\u0259r:
- G\xFCnd\u0259lik namaz, oruc, zikr v\u0259 dualar bar\u0259d\u0259 t\u0259tbiqimizin "Namaz Vaxtlar\u0131", "Quran", "Dualar" v\u0259 "T\u0259sbeh" b\xF6lm\u0259l\u0259rind\u0259n \u0259trafl\u0131 istifad\u0259 ed\u0259 bil\u0259rsiniz.
- F\u0259rdi h\xFCquqi m\u0259s\u0259l\u0259l\u0259r, miras, ail\u0259 v\u0259 r\u0259smi f\u0259tvalar \xFC\xE7\xFCn yerli s\u0259lahiyy\u0259tli dini quruma (m\u0259s\u0259l\u0259n, Qafqaz M\xFCs\u0259lmanlar\u0131 \u0130dar\u0259si) v\u0259 ya m\xF6t\u0259b\u0259r \u0130slam aliml\u0259rin\u0259 m\xFCraci\u0259t etm\u0259yiniz t\xF6vsiy\u0259 olunur.

\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:
- Quran-i K\u0259rim: \u0259n-N\u0259hl sur\u0259si, 43-c\xFC ay\u0259: "\u018Fg\u0259r bilmirsinizs\u0259, elm \u0259hlind\u0259n soru\u015Fun!"
- S\u0259hih \u0259l-Buxari v\u0259 S\u0259hih M\xFCslim.

\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur.`;
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
var AZ_CITIES = {
  Baki: { name: "Bak\u0131", lat: 40.4093, lng: 49.8671 },
  Sumqayit: { name: "Sumqay\u0131t", lat: 40.5897, lng: 49.6686 },
  Gence: { name: "G\u0259nc\u0259", lat: 40.6828, lng: 46.3606 },
  Lenkeran: { name: "L\u0259nk\u0259ran", lat: 38.7529, lng: 48.8475 },
  Masalli: { name: "Masall\u0131", lat: 39.0341, lng: 48.6654 },
  Astara: { name: "Astara", lat: 38.4559, lng: 48.8744 },
  Seki: { name: "\u015E\u0259ki", lat: 41.1919, lng: 47.1706 },
  Mingecevir: { name: "Ming\u0259\xE7evir", lat: 40.7703, lng: 47.0496 },
  Naxcivan: { name: "Nax\xE7\u0131van", lat: 39.2089, lng: 45.4122 },
  Quba: { name: "Quba", lat: 41.3643, lng: 48.5134 },
  Samaxi: { name: "\u015Eamax\u0131", lat: 40.6319, lng: 48.6414 },
  Susa: { name: "\u015Eu\u015Fa", lat: 39.7588, lng: 46.7497 },
  Xankendi: { name: "Xank\u0259ndi", lat: 39.8265, lng: 46.7656 },
  Zaqatala: { name: "Zaqatala", lat: 41.6336, lng: 46.6433 }
};
app.get("/api/prayer-times", async (req, res) => {
  try {
    const cityKey = req.query.city || "Baki";
    const city = AZ_CITIES[cityKey] || AZ_CITIES.Baki;
    const requestedDateStr = req.query.date;
    const targetDate = requestedDateStr ? new Date(requestedDateStr) : /* @__PURE__ */ new Date();
    const methodName = req.query.method || "MuslimWorldLeague";
    const madhabName = req.query.madhab || "shafi";
    let params = import_adhan.CalculationMethod.MuslimWorldLeague();
    if (methodName === "Turkey") {
      params = import_adhan.CalculationMethod.Turkey();
    } else if (methodName === "Tehran") {
      params = import_adhan.CalculationMethod.Tehran();
    } else if (methodName === "Karachi") {
      params = import_adhan.CalculationMethod.Karachi();
    } else if (methodName === "NorthAmerica") {
      params = import_adhan.CalculationMethod.NorthAmerica();
    } else if (methodName === "Egyptian") {
      params = import_adhan.CalculationMethod.Egyptian();
    } else if (methodName === "UmmAlQura") {
      params = import_adhan.CalculationMethod.UmmAlQura();
    }
    params.madhab = madhabName === "hanafi" ? import_adhan.Madhab.Hanafi : import_adhan.Madhab.Shafi;
    params.highLatitudeRule = import_adhan.HighLatitudeRule.SeventhOfTheNight;
    const coordinates = new import_adhan.Coordinates(city.lat, city.lng);
    const prayerTimes = new import_adhan.PrayerTimes(coordinates, targetDate, params);
    const sunnahTimes = new import_adhan.SunnahTimes(prayerTimes);
    const qiblaAngle = Math.round((0, import_adhan.Qibla)(coordinates) * 10) / 10;
    const timings = {
      fajr: formatTimeToBaku(prayerTimes.fajr),
      sunrise: formatTimeToBaku(prayerTimes.sunrise),
      dhuhr: formatTimeToBaku(prayerTimes.dhuhr),
      asr: formatTimeToBaku(prayerTimes.asr),
      maghrib: formatTimeToBaku(prayerTimes.maghrib),
      isha: formatTimeToBaku(prayerTimes.isha),
      midnight: formatTimeToBaku(sunnahTimes.middleOfTheNight),
      tahajjud: formatTimeToBaku(sunnahTimes.lastThirdOfTheNight)
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
      source: "Astronomik hesablama \xB7 Adhan"
    });
  } catch (error) {
    console.error("Prayer times error:", error);
    res.status(500).json({ error: "Namaz vaxtlar\u0131n\u0131 \u0259ld\u0259 etm\u0259k m\xFCmk\xFCn olmad\u0131." });
  }
});
app.post("/api/gemini/religious-chat", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: "H\u0259ddind\u0259n art\u0131q sor\u011Fu g\xF6nd\u0259rildi. Z\u0259hm\u0259t olmasa bir d\u0259qiq\u0259 g\xF6zl\u0259yin." });
      return;
    }
    const { question, history } = req.body;
    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "Sual m\u0259tni t\u0259l\u0259b olunur." });
      return;
    }
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0 || trimmedQuestion.length > 1e3) {
      res.status(400).json({ error: "Sual m\u0259tni 1 il\u0259 1000 simvol aras\u0131nda olmal\u0131d\u0131r." });
      return;
    }
    const ai = getGeminiClient();
    if (!ai) {
      const fallbackReply = getLocalIslamicFallbackResponse(trimmedQuestion);
      res.json({ reply: fallbackReply });
      return;
    }
    const systemInstruction = `S\u0259n \u201CNur\u201D adl\u0131 m\xFCasir \u0130slam b\u0259l\u0259d\xE7isi t\u0259tbiqinin etibarl\u0131 dini k\xF6m\u0259k\xE7isis\u0259n (Nur AI).
S\u0259nin \u0259sas m\u0259qs\u0259din istifad\u0259\xE7il\u0259r\u0259 \u0130slam dini, Quran ay\u0259l\u0259ri, h\u0259disl\u0259r, ibad\u0259tl\u0259r (namaz, oruc, z\u0259kat, h\u0259cc, zikr, dua) v\u0259 \u0259xlaq haqq\u0131nda d\u0259qiq, m\xF6t\u0259b\u0259r v\u0259 maarifl\u0259ndirici m\u0259lumat verm\u0259kdir.

A\u015EA\u011EIDAK\u0130 QAYDALARA Q\u018FT\u0130YY\u018FTL\u018F \u018FM\u018FL ET:
1. Dini h\xF6km\xFC v\u0259 ya f\u0259tvan\u0131 he\xE7 vaxt \xF6z\xFCnd\u0259n uydurma.
2. He\xE7 vaxt m\xF6vcud olmayan sur\u0259, ay\u0259 v\u0259 ya uydurma h\u0259dis n\xF6mr\u0259si yaratma. \u018Fg\u0259r konkret n\xF6mr\u0259d\u0259n \u0259min deyils\u0259ns\u0259, bunu a\xE7\u0131q qeyd et v\u0259 ya yaln\u0131z m\u0259nas\u0131n\u0131 bildir.
3. Cavablar\u0131n Quran-i K\u0259rim ay\u0259l\u0259rin\u0259 v\u0259 s\u0259hih h\u0259disl\u0259r\u0259 (Buxari, M\xFCslim, Tirmizi, \u018Fbu Davud, N\u0259sai, \u0130bn Mac\u0259 v\u0259 s.) \u0259saslans\u0131n.
4. Fiqhi ixtilafl\u0131 m\u0259s\u0259l\u0259l\u0259rd\u0259 (m\u0259zh\u0259b f\u0259rqlilikl\u0259ri) he\xE7 bir m\u0259zh\u0259bi t\u0259nqid etm\u0259d\u0259n H\u0259n\u0259fi, \u015Eafii, C\u0259f\u0259ri, Maliki kimi m\xF6t\u0259b\u0259r \u0130slam m\u0259zh\u0259bl\u0259rinin m\xF6vqel\u0259rini obyektiv v\u0259 ehtiramla qeyd et.
5. \xD6z\xFCn\xFC alim, m\xFCct\u0259hid v\u0259 ya m\xFCfti kimi t\u0259qdim etm\u0259. S\u0259n sad\u0259c\u0259 etibarl\u0131 m\u0259nb\u0259l\u0259r\u0259 istinad ed\u0259n dini b\u0259l\u0259d\xE7is\u0259n.
6. Tibbi, c\u0259rrahi, h\xFCquqi, m\u0259hk\u0259m\u0259 v\u0259 ya y\xFCks\u0259k riskli \u015F\u0259xsi m\u0259s\u0259l\u0259l\u0259rd\u0259 istifad\u0259\xE7iy\u0259 m\xFCtl\u0259q ixtisasl\u0131 m\xFCt\u0259x\u0259ssis\u0259 (h\u0259kim, h\xFCquq\u015F\xFCnas) v\u0259 ya yerli r\u0259smi dini quruma (m\u0259s\u0259l\u0259n, Qafqaz M\xFCs\u0259lmanlar\u0131 \u0130dar\u0259si) m\xFCraci\u0259t etm\u0259yi t\xF6vsiy\u0259 et.
7. \u018Fmin olmad\u0131\u011F\u0131n v\u0259 ya \u0130slamda d\u0259qiq cavab\u0131 olmayan m\u0259s\u0259l\u0259l\u0259rd\u0259 bunu a\xE7\u0131q \u015F\u0259kild\u0259 bildir ("Bu m\u0259s\u0259l\u0259d\u0259 d\u0259qiq s\u0259hih m\u0259tn qeyd olunmay\u0131b v\u0259 ya aliml\u0259r aras\u0131nda f\u0259rqli r\u0259yl\u0259r var").
8. B\xFCt\xFCn cavablar\u0131 t\u0259miz, s\u0259lis v\u0259 n\u0259zak\u0259tli Az\u0259rbaycan dilind\u0259 yaz.
9. H\u0259r cavab\u0131n sonunda m\xFCtl\u0259q "\u{1F4CC} M\u0259nb\u0259l\u0259r v\u0259 \u0130stinadlar:" ba\u015Fl\u0131\u011F\u0131 alt\u0131nda istifad\u0259 etdiyin sur\u0259, ay\u0259 v\u0259 h\u0259dis m\u0259nb\u0259l\u0259rini qeyd et.
10. Cavab\u0131n \u0259n sonunda bu x\u0259b\u0259rdarl\u0131q qeydini \u0259lav\u0259 et:
"\u26A0\uFE0F Qeyd: Cavabda qeyd olunan istinadlar\u0131n (ay\u0259 v\u0259 h\u0259dis n\xF6mr\u0259l\u0259rinin) d\u0259qiqliyini m\xF6t\u0259b\u0259r dini kitablardan v\u0259 ya r\u0259smi m\u0259nb\u0259l\u0259rd\u0259n ayr\u0131ca yoxlamaq t\xF6vsiy\u0259 olunur."`;
    const safeHistory = Array.isArray(history) ? history.filter((m) => m && typeof m === "object").slice(-6) : [];
    const contents = safeHistory.length > 0 ? [
      ...safeHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.text || "").slice(0, 1e3) }]
      })),
      {
        role: "user",
        parts: [{ text: trimmedQuestion }]
      }
    ] : trimmedQuestion;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.25
          // Lower temperature for high factual accuracy in religious answers
        }
      });
      const reply = response.text || getLocalIslamicFallbackResponse(trimmedQuestion);
      res.json({ reply });
    } catch (_genError) {
      console.warn("[Nur AI] Gemini generation unavailable, using local fallback.");
      const fallbackReply = getLocalIslamicFallbackResponse(trimmedQuestion);
      res.json({ reply: fallbackReply });
    }
  } catch (_error) {
    console.error("[Nur AI] Request processing error, using local fallback.");
    const questionText = typeof req.body?.question === "string" ? req.body.question.slice(0, 1e3) : "";
    res.json({ reply: getLocalIslamicFallbackResponse(questionText) });
  }
});
async function startServer() {
  const server = import_http.default.createServer(app);
  const distPath = import_path.default.join(process.cwd(), "dist");
  const indexPath = import_path.default.join(distPath, "index.html");
  const staticDistMiddleware = import_express.default.static(distPath, { maxAge: "1d", index: false });
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await (0, import_vite.createServer)({
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: false,
          watch: {
            ignored: ["**/android/**", "**/dist/**"]
          }
        },
        optimizeDeps: {
          entries: ["index.html"]
        },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("[Nur Server] Vite initialization error:", err);
      app.use(staticDistMiddleware);
      app.get("*", (_req, res) => {
        if (import_fs.default.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).send("Vite initialization failed and dist/index.html was not found.");
        }
      });
    }
  } else {
    app.use(staticDistMiddleware);
    app.get("*", (_req, res) => {
      if (import_fs.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Nur web t\u0259tbiqi dist/index.html fayl\u0131 tap\u0131lmad\u0131.");
      }
    });
  }
  server.listen(PORT, HOST, () => {
    console.log(`Nur app server running on http://${HOST}:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
