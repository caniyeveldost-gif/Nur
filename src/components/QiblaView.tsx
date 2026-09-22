import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Navigation, Sparkles, CheckCircle2, RotateCw } from 'lucide-react';
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

  const targetQiblaAngle = prayerData.qiblaAngle;
  const distanceKm = prayerData.distanceToKaabaKm;

  // Setup device orientation if available on mobile
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // iOS webkitCompassHeading or Android alpha
      let heading = (e as any).webkitCompassHeading;
      if (heading === undefined || heading === null) {
        if (e.alpha !== null) {
          heading = 360 - e.alpha;
        }
      }
      if (typeof heading === 'number') {
        setDeviceHeading(Math.round(heading));
        setSensorPermission(true);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setSensorPermission(true);
        } else {
          setSensorPermission(false);
        }
      } catch (err) {
        console.warn("Orientation permission error:", err);
      }
    }
  };

  // Current effective heading
  const currentHeading = deviceHeading !== null ? deviceHeading : manualCompassDegree;

  // Needle angle relative to current phone orientation
  const relativeQiblaAngle = (targetQiblaAngle - currentHeading + 360) % 360;

  // Is aligned with Kaaba (within 4 degrees)?
  const isAligned = Math.abs(relativeQiblaAngle) <= 4 || Math.abs(relativeQiblaAngle - 360) <= 4;

  return (
    <div id="qibla-view-container" className="space-y-4 pb-12">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-amber-500" />
            <span>Qiblə Kompası</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Kəbə istiqaməti ({prayerData.cityName})
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-900/40 text-stone-700 dark:text-stone-300"
          >
            Geri
          </button>
        )}
      </div>

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

      {/* Alignment Banner */}
      {isAligned ? (
        <div className="p-3 rounded-2xl bg-emerald-700 text-white font-bold text-center text-xs flex items-center justify-center gap-2 shadow-md animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-amber-300" />
          <span>Əlhəmdulilləh! Düzgün Qiblə istiqamətindəsiniz!</span>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-stone-100 dark:bg-emerald-950/40 text-stone-700 dark:text-stone-300 font-medium text-center text-xs">
          Qiblə oxunu yaşıl Kəbə nişanına uyğunlaşdırın.
        </div>
      )}

      {/* Interactive Compass Dial */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-72 h-72 rounded-full bg-gradient-to-br from-[#043327] via-[#064e3b] to-[#01221a] p-4 shadow-2xl border-4 border-amber-400/40 flex items-center justify-center">
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
                className="absolute w-0.5 h-2 bg-emerald-400/40"
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
              <div className="w-6 h-6 rounded-lg bg-amber-400 text-emerald-950 flex items-center justify-center font-bold text-[10px] shadow-lg border border-white">
                🕋
              </div>
            </div>
          </div>

          {/* Central Qibla Pointer Needle */}
          <div
            className="absolute w-6 h-40 flex flex-col items-center justify-between transition-transform duration-200 ease-out pointer-events-none"
            style={{ transform: `rotate(${relativeQiblaAngle}deg)` }}
          >
            {/* Top North/Qibla Pointer Needle */}
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[60px] border-b-amber-400 filter drop-shadow-md" />
            {/* Center Pivot Point */}
            <div className="w-5 h-5 rounded-full bg-white border-2 border-[#064e3b] shadow-md z-10" />
            {/* Bottom Counter-weight Needle */}
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[50px] border-t-emerald-800" />
          </div>

          {/* Center Degree Display */}
          <div className="absolute w-20 h-20 rounded-full bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center text-white pointer-events-none">
            <span className="text-[10px] text-amber-300 font-semibold uppercase">Qiblə</span>
            <span className="text-base font-bold font-mono">{targetQiblaAngle}°</span>
          </div>
        </div>

        {/* Manual Dial for Desktop / Devices without compass sensor */}
        {deviceHeading === null && (
          <div className="w-full max-w-xs mt-6 space-y-2 text-center">
            <label className="text-xs text-stone-600 dark:text-stone-300">
              Telefon/Kompas oriyentasiyasını tənzimləyin:
            </label>
            <input
              type="range"
              min="0"
              max="359"
              value={manualCompassDegree}
              onChange={(e) => setManualCompassDegree(parseInt(e.target.value, 10))}
              className="w-full accent-[#064e3b] dark:accent-amber-400"
            />
            <div className="text-[11px] font-mono text-stone-600 dark:text-stone-300">
              Cari bucaq: {manualCompassDegree}°
            </div>
          </div>
        )}

        {/* Request iOS Sensor Permission Button */}
        {typeof (DeviceOrientationEvent as any)?.requestPermission === 'function' &&
          sensorPermission === null && (
            <button
              onClick={requestOrientationPermission}
              className="mt-4 px-4 py-2 rounded-xl bg-[#064e3b] text-amber-300 text-xs font-semibold shadow-md"
            >
              Kompas sensorunu aktivləşdir
            </button>
          )}
      </div>

      {/* Helpful Instructions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs text-stone-700 dark:text-stone-300 space-y-2">
        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Dəqiq nəticə üçün tövsiyələr:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600 dark:text-stone-400">
          <li>Cihazınızı düz (horizontal) səthdə saxlayın.</li>
          <li>Böyük metal əşyalar və ya güclü maqnit sahələrindən uzaq durun.</li>
          <li>Cihazı "8" rəqəmi şəklində hərəkət etdirərək kompas sensorunu kalibrləyə bilərsiniz.</li>
        </ul>
      </div>
    </div>
  );
};
