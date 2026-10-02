import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  Sparkles,
  CheckCircle2,
  RotateCw,
  Locate,
  HelpCircle,
  Smartphone,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { CityPrayerData } from '../types';
import { calculateQiblaAngle, calculateDistanceToKaaba, AZERBAIJAN_CITIES } from '../services/apiService';

interface QiblaViewProps {
  prayerData: CityPrayerData;
  onSelectCity: (cityKey: string) => void;
  onClose?: () => void;
}

export const QiblaView: React.FC<QiblaViewProps> = ({
  prayerData,
  onSelectCity,
  onClose,
}) => {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [sensorPermission, setSensorPermission] = useState<boolean | null>(null);
  const [manualCompassDegree, setManualCompassDegree] = useState<number>(0);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [customGpsLocation, setCustomGpsLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const lastVibrateRef = useRef<number>(0);

  // Determine active coordinates
  const activeLat = customGpsLocation ? customGpsLocation.lat : prayerData.lat;
  const activeLng = customGpsLocation ? customGpsLocation.lng : prayerData.lng;
  const activeLocationName = customGpsLocation ? customGpsLocation.name : prayerData.cityName;

  const targetQiblaAngle = calculateQiblaAngle(activeLat, activeLng);
  const distanceKm = calculateDistanceToKaaba(activeLat, activeLng);

  // Setup device orientation if available on mobile
  useEffect(() => {
    let hasSensor = false;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // iOS webkitCompassHeading or Android alpha/absolute
      let heading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (heading === undefined || heading === null) {
        if (e.alpha !== null && !isNaN(e.alpha)) {
          heading = 360 - e.alpha;
        }
      }
      if (typeof heading === 'number' && !isNaN(heading)) {
        hasSensor = true;
        setDeviceHeading(Math.round(heading));
        setSensorPermission(true);
      }
    };

    const hasAbsoluteEvent = typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window;
    const eventType = hasAbsoluteEvent ? 'deviceorientationabsolute' : 'deviceorientation';

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener(eventType, handleOrientation as EventListener, true);
      // Fallback listen on standard event as well
      if (hasAbsoluteEvent) {
        window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
      }
    }

    // If after 1.5 seconds no heading received, default manualMode suggestion
    const timeout = setTimeout(() => {
      if (!hasSensor && deviceHeading === null) {
        setManualMode(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timeout);
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener(eventType, handleOrientation as EventListener, true);
        if (hasAbsoluteEvent) {
          window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
        }
      }
    };
  }, []);

  const requestOrientationPermission = async () => {
    const DeviceOrientationAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientationAny?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationAny.requestPermission();
        if (response === 'granted') {
          setSensorPermission(true);
          setManualMode(false);
        } else {
          setSensorPermission(false);
          setManualMode(true);
        }
      } catch (err) {
        console.warn('Orientation permission error:', err);
        setManualMode(true);
      }
    }
  };

  // GPS Current Location Request
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Cihazınızda GPS xidməti dəstəklənmir.');
      return;
    }
    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setCustomGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'Cari GPS Məkanınız',
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setGpsError('GPS koordinatları əldə edilmədi. Şəhər siyahısından istifadə edin.');
        setTimeout(() => setGpsError(null), 4000);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Current effective heading
  const currentHeading = !manualMode && deviceHeading !== null ? deviceHeading : manualCompassDegree;

  // Needle angle relative to current phone orientation
  const relativeQiblaAngle = (targetQiblaAngle - currentHeading + 360) % 360;

  // Is aligned with Kaaba (within 4 degrees)?
  const isAligned = Math.abs(relativeQiblaAngle) <= 4 || Math.abs(relativeQiblaAngle - 360) <= 4;

  // Haptic feedback when aligned
  useEffect(() => {
    if (isAligned && typeof navigator !== 'undefined' && navigator.vibrate) {
      const now = Date.now();
      if (now - lastVibrateRef.current > 1200) {
        navigator.vibrate(60);
        lastVibrateRef.current = now;
      }
    }
  }, [isAligned]);

  return (
    <div id="qibla-view-container" className="space-y-4 pb-14 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-amber-500" />
            <span>Qiblə Kompası</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Kəbəyi-Müşərrəfə istiqaməti ({activeLocationName})
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUseGps}
            disabled={isLocating}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-amber-400 border border-emerald-900/10 dark:border-emerald-800/40 hover:bg-emerald-100 transition"
            title="Dəqiq GPS məkanından istifadə et"
          >
            <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{isLocating ? 'Tapılır...' : 'GPS'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-900/40 text-stone-700 dark:text-stone-300"
            >
              Geri
            </button>
          )}
        </div>
      </div>

      {/* GPS Error alert */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Target Angle & Distance Card */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-center shadow-xs">
          <div className="text-[11px] text-stone-600 dark:text-stone-300">Qiblə Dərəcəsi</div>
          <div className="text-xl font-bold font-mono text-[#064e3b] dark:text-amber-400 mt-0.5">
            {targetQiblaAngle}°
          </div>
          <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
            Cənub-Cənub-Qərb (SSW)
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-center shadow-xs">
          <div className="text-[11px] text-stone-600 dark:text-stone-300">Kəbəyə Məsafə</div>
          <div className="text-xl font-bold font-mono text-[#064e3b] dark:text-amber-400 mt-0.5">
            {distanceKm.toLocaleString('az-AZ')} km
          </div>
          <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
            Məkkəyi-Mükərrəmə
          </div>
        </div>
      </div>

      {/* Alignment Status Banner */}
      {isAligned ? (
        <div className="p-3.5 rounded-2xl bg-emerald-700 text-white font-bold text-center text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-amber-300" />
          <span>Əlhəmdulilləh! Düzgün Qiblə istiqamətindəsiniz ({targetQiblaAngle}°)!</span>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-stone-100 dark:bg-emerald-950/40 text-stone-700 dark:text-stone-300 font-medium text-center text-xs flex items-center justify-center gap-1.5">
          <Compass className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Telefonu çevirərək qızılı Kəbə oxunu yuxarı istiqamətə uyğunlaşdırın.</span>
        </div>
      )}

      {/* Interactive Compass Dial */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <div className="relative w-72 h-72 rounded-full bg-gradient-to-br from-[#043327] via-[#064e3b] to-[#01221a] p-4 shadow-[0_12px_40px_rgba(4,51,39,0.35)] border-4 border-amber-400/40 flex items-center justify-center">
          {/* Compass Rose Ring */}
          <div
            className="w-full h-full rounded-full border-2 border-emerald-500/30 flex items-center justify-center relative transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${-currentHeading}deg)` }}
          >
            {/* Cardinal Direction Marks */}
            <span className="absolute top-2 font-bold text-amber-400 text-sm">Ş</span>
            <span className="absolute right-3 font-bold text-emerald-200 text-sm">Şq</span>
            <span className="absolute bottom-2 font-bold text-emerald-200 text-sm">C</span>
            <span className="absolute left-3 font-bold text-emerald-200 text-sm">Q</span>

            {/* Dial Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <div
                key={deg}
                className="absolute w-0.5 h-2.5 bg-emerald-400/40"
                style={{
                  top: '6px',
                  transformOrigin: '50% 126px',
                  transform: `rotate(${deg}deg)`,
                }}
              />
            ))}

            {/* Kaaba Marker on the outer ring at exact target bearing */}
            <div
              className="absolute w-8 h-8 -top-3 flex flex-col items-center justify-center"
              style={{
                transformOrigin: '50% 140px',
                transform: `rotate(${targetQiblaAngle}deg)`,
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white animate-bounce" style={{ animationDuration: '2.5s' }}>
                🕋
              </div>
            </div>
          </div>

          {/* Central Qibla Pointer Needle */}
          <div
            className="absolute w-6 h-44 flex flex-col items-center justify-between transition-transform duration-200 ease-out pointer-events-none"
            style={{ transform: `rotate(${relativeQiblaAngle}deg)` }}
          >
            {/* Top North/Qibla Pointer Needle */}
            <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-b-[68px] border-b-amber-400 filter drop-shadow-[0_4px_8px_rgba(251,191,36,0.6)]" />
            {/* Center Pivot Point */}
            <div className="w-5 h-5 rounded-full bg-white border-2 border-[#064e3b] shadow-md z-10" />
            {/* Bottom Counter-weight Needle */}
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[54px] border-t-emerald-800 opacity-80" />
          </div>

          {/* Center Degree Display */}
          <div className="absolute w-20 h-20 rounded-full bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center text-white pointer-events-none border border-emerald-700/50 shadow-inner">
            <span className="text-[10px] text-amber-300 font-semibold uppercase">Qiblə</span>
            <span className="text-base font-bold font-mono">{targetQiblaAngle}°</span>
          </div>
        </div>

        {/* Current Heading & Mode Status Pill */}
        <div className="mt-4 flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 shadow-xs">
            <Navigation className="w-3.5 h-3.5 text-amber-500" />
            <span>Cari oriyentasiya: {currentHeading}°</span>
          </div>

          <button
            onClick={() => setManualMode(!manualMode)}
            className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-emerald-950/60 hover:bg-stone-200 text-stone-600 dark:text-stone-300 text-[11px] font-medium border border-stone-200 dark:border-emerald-900/40 transition flex items-center gap-1"
          >
            <Sliders className="w-3 h-3 text-emerald-600 dark:text-amber-400" />
            <span>{manualMode ? 'Sensor rejimi' : 'Əl ilə rejim'}</span>
          </button>
        </div>

        {/* Manual Slider if in manual mode or device has no sensor */}
        {manualMode && (
          <div className="w-full max-w-xs mt-3 p-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 space-y-2 text-center shadow-xs">
            <div className="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300">
              <span className="font-semibold">Telefon oriyentasiyası:</span>
              <span className="font-mono font-bold text-emerald-800 dark:text-amber-400">
                {manualCompassDegree}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={manualCompassDegree}
              onChange={(e) => setManualCompassDegree(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-stone-500">
              Cihazınızda kompas sensoru olmadıqda və ya kompas dəqiq göstərmədikdə şkaladan istifadə edin.
            </div>
          </div>
        )}

        {/* iOS Sensor Permission Request Button */}
        {typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => void })?.requestPermission === 'function' &&
          sensorPermission !== true && (
            <button
              onClick={requestOrientationPermission}
              className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-700 hover:from-emerald-800 hover:to-emerald-600 text-amber-300 text-xs font-bold shadow-md transition"
            >
              iPhone Kompas Sensorunu Aktivləşdir
            </button>
          )}

        {/* Calibration Help Toggle */}
        <button
          onClick={() => setIsCalibrating(!isCalibrating)}
          className="mt-3 text-xs font-semibold text-emerald-800 dark:text-amber-400 hover:underline flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Kompası necə kalibrləməli?</span>
        </button>
      </div>

      {/* Calibration Visualizer Modal / Card */}
      {isCalibrating && (
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-emerald-950/40 border border-amber-300/60 dark:border-amber-500/30 text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Kompas Sensoru Kalibrasiyası</span>
            </span>
            <button
              onClick={() => setIsCalibrating(false)}
              className="text-stone-500 hover:text-stone-800 text-xs font-bold"
            >
              Bağla
            </button>
          </div>
          <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
            Telefonunuzun daxili maqnitometr sensorunun dəqiq işləməsi üçün telefonu havada <strong>"8" rəqəmi</strong> (sonsuzluq işarəsi ∞) formasında 2-3 dəfə yavaşca hərəkət etdirin.
          </p>
          <div className="text-[11px] text-stone-600 dark:text-stone-400">
            • Qalın metal örtüklər və maqnitli telefon qabları kompasın dəqiqliyinə təsir göstərə bilər.
          </div>
        </div>
      )}

      {/* Helpful Instructions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs text-stone-700 dark:text-stone-300 space-y-2">
        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Dəqiq nəticə üçün tövsiyələr:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600 dark:text-stone-400">
          <li>Cihazınızı düz (horizontal) səthdə saxlayın.</li>
          <li>Böyük metal əşyalar və ya güclü maqnit sahələrindən (kompüter, mikrodalğalı soba) uzaq durun.</li>
          <li>Qiblə istiqaməti Kəbə koordinatları (21.4225° Ş, 39.8262° Şq) əsasında riyazi sferik trigonometriya ilə hesablanır.</li>
        </ul>
      </div>
    </div>
  );
};
