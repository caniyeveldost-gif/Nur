# Nur — İslam Bələdçisi (Web PWA & Android APK)

**Nur** — Azərbaycan dilində hazırlanmış müasir İslam bələdçisi tətbiqidir: dəqiq namaz vaxtları (`adhan`), Qiblə kompası, Qurani-Kərim (114 surə, Azərbaycan dilində tərcümə, fasiləsiz surə qiraəti və `IndexedDB` offline keş), gündəlik dualar, rəqəmsal təsbeh və Nur AI dini köməkçisi.

---

## 1. Web / Server İşə Salma

```bash
npm install
npm run dev      # Development server (http://localhost:3000)
npm run lint     # TypeScript yoxlaması (tsc --noEmit)
npm run build    # Production frontend (dist/) və server (dist/server.cjs) build
npm run start    # Production server işə salma
```

---

## 2. Android APK Layihəsi (Capacitor)

* **App Name:** `Nur`
* **Package ID (Application ID):** `az.nur.app`
* **Version:** `1.0.0` (`versionCode: 1`)
* **Web Directory:** `dist`

### Frontend dəyişikliklərini Android layihəsinə sinxronlaşdırmaq

```bash
npm run build
npx cap sync android
```
(və ya qısa komanda: `npm run cap:sync`)

### Android Studio-da açmaq

```bash
npx cap open android
```

---

## 3. Terminaldan APK Çıxarmaq (Debug & Release)

### Debug APK (Test üçün birbaşa telefona quraşdırıla bilən APK)

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Hazır Debug APK faylının yeri:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (İmzalanmış Production APK)

1. Keystore yaratmaq (yalnız ilk dəfə, layihə qovluğundan kənarda saxlayın):
```bash
keytool -genkey -v -keystore ~/nur-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias nur-key
```

2. Environment dəyişənləri ilə Release APK çıxarmaq (heç bir parol kod daxilində saxlanılmır):
```bash
npm run build
npx cap sync android
cd android
NUR_KEYSTORE_PATH="$HOME/nur-release-key.jks" \
NUR_KEYSTORE_PASSWORD="your_keystore_password" \
NUR_KEY_ALIAS="nur-key" \
NUR_KEY_PASSWORD="your_key_password" \
./gradlew assembleRelease
```

Hazır Release APK faylının yeri:
```text
android/app/build/outputs/apk/release/app-release.apk
```

*(Alternativ olaraq Android Studio daxilində **Build → Generate Signed Bundle / APK...** menyusundan da imzalaya bilərsiniz.)*

---

## 4. Android APK üçün Nur AI Backend URL Quraşdırılması (`VITE_API_BASE_URL`)

**Çox Vacib Təhlükəsizlik Qaydası:**
`GEMINI_API_KEY` yalnız server mühitində (`server.ts`) saxlanılır və **heç vaxt** frontend koduna, `VITE_` dəyişəninə və ya APK daxilinə yazılmamalıdır.

Android APK daxilində **Nur AI**-ın real Gemini backend-inə (`POST /api/gemini/religious-chat`) qoşulması üçün APK build edilməzdən əvvəl backend serverinizin **public HTTPS ünvanını** `VITE_API_BASE_URL` dəyişəninə verin (bu dəyişəndə yalnız domen ünvanı olur, API açarı olmur):

```bash
VITE_API_BASE_URL="https://YOUR-BACKEND-DOMAIN" npm run build
npx cap sync android
```

* **Necə işləyir:**
  1. **Web mühitində:** `/api/gemini/religious-chat` (və ya `VITE_API_BASE_URL` təyin edilibsə həmin HTTPS ünvan) çağırılır.
  2. **Android APK mühitində (İnternet var + HTTPS Backend aktivdir):** `https://YOUR-BACKEND-DOMAIN/api/gemini/religious-chat` üzərindən real Gemini cavabı alınır.
  3. **İnternet yoxdursa və ya Backend əlçatmazdırsa:** Tətbiq çökmür, avtomatik olaraq daxili `FALLBACK_AI_KNOWLEDGE` (lokal İslami bilik bazası) cavabını qaytarır.
  4. Təhlükəsizlik üçün `http://` (HTTPS olmayan) backend ünvanları qəbul edilmir.


