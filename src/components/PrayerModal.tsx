import React, { useState } from 'react';
import { X, Clock, Bell, BellOff, MapPin, Volume2, Sparkles, Check } from 'lucide-react';
import { CityPrayerData } from '../types';
import { AZERBAIJAN_CITIES } from '../services/apiService';

interface PrayerModalProps {
  prayerData: CityPrayerData;
  selectedCity: string;
  onSelectCity: (cityKey: string) => void;
  onClose: () => void;
}

export const PrayerModal: React.FC<PrayerModalProps> = ({
  prayerData,
  selectedCity,
  onSelectCity,
  onClose,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('nur_prayer_notifications') === 'true';
  });
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const prayerList = [
    { key: 'fajr', nameAz: 'Sübh (Fəcr)', arabic: 'الفجر', time: prayerData.timings.fajr, desc: 'Sübh şəfəqinin sökülməsindən gün çıxana qədər' },
    { key: 'sunrise', nameAz: 'Gün çıxır (Şuruq)', arabic: 'الشروق', time: prayerData.timings.sunrise, desc: 'Günəşin üfüqdə doğuş vaxtı (kərahət vaxtı)' },
    { key: 'dhuhr', nameAz: 'Günorta (Zöhr)', arabic: 'الظهر', time: prayerData.timings.dhuhr, desc: 'Günəşin zenitdən qərbə meyl etdiyi andan' },
    { key: 'asr', nameAz: 'İkindi (Əsr)', arabic: 'العصر', time: prayerData.timings.asr, desc: 'Əşyaların kölgəsi öz boyu qədər uzandıqda' },
    { key: 'maghrib', nameAz: 'Axşam (Məğrib)', arabic: 'المغرب', time: prayerData.timings.maghrib, desc: 'Günəşin tam qürub etdiyi an (iftar vaxtı)' },
    { key: 'isha', nameAz: 'Yatsı (İşa)', arabic: 'العشاء', time: prayerData.timings.isha, desc: 'Qürub qırmızılığının tam itməsindən sübhə qədər' },
  ];

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            try {
              localStorage.setItem('nur_prayer_notifications', 'true');
              new Notification("Nur - Namaz Vaxtları", {
                body: "Namaz vaxtı bildirişləri uğurla aktivləşdirildi.",
              });
            } catch (_notifErr) {}
            setNotificationMsg("Bildirişlər aktivləşdirildi!");
          } else {
            setNotificationMsg("Brauzerdə bildiriş icazəsi verilmədi.");
          }
        } else {
          setNotificationsEnabled(true);
          localStorage.setItem('nur_prayer_notifications', 'true');
          setNotificationMsg("Bildiriş rejimi yadda saxlanıldı.");
        }
      } catch (err) {
        console.warn("Notification error:", err);
        setNotificationsEnabled(true);
        setNotificationMsg("Bildiriş rejimi aktivləşdirildi.");
      }
    } else {
      setNotificationsEnabled(false);
      try {
        localStorage.setItem('nur_prayer_notifications', 'false');
      } catch (_e) {}
      setNotificationMsg("Bildirişlər söndürüldü.");
    }

    setTimeout(() => setNotificationMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1e15] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-[#064e3b] dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Namaz Vaxtları
              </h2>
              <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-300">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>{prayerData.cityName} və ətraf ərazilər</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
            aria-label="Bağla"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* City Select Bar */}
        <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200/80 dark:border-emerald-900/40">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Şəhəri dəyişin:
          </span>
          <select
            value={selectedCity}
            onChange={(e) => onSelectCity(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1e15] border border-stone-300 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-amber-300 focus:outline-none cursor-pointer"
          >
            {Object.entries(AZERBAIJAN_CITIES).map(([key, item]) => (
              <option key={key} value={key} className="bg-white dark:bg-[#0c1e15] text-stone-900 dark:text-white">
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Status Alert */}
        {notificationMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600 dark:text-amber-300" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Prayer Times Table */}
        <div className="mt-4 space-y-2">
          {prayerList.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#09150e] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs hover:border-emerald-600 transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {item.nameAz}
                  </h3>
                  <span className="font-arabic text-amber-500 font-bold text-sm">
                    {item.arabic}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                  {item.desc}
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-mono font-bold text-[#064e3b] dark:text-amber-400">
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Notification Toggle Button */}
        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between">
          <div className="text-xs text-stone-700 dark:text-stone-300">
            <div className="font-bold">Azan / Vaxt Bildirişləri</div>
            <div className="text-[11px] text-stone-600 dark:text-stone-300">
              Hər namaz vaxtında xəbərdarlıq alın
            </div>
          </div>

          <button
            onClick={handleToggleNotifications}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              notificationsEnabled
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-200 dark:bg-emerald-900/50 text-stone-700 dark:text-stone-300'
            }`}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>Aktivdir</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5" />
                <span>Qoşulmayıb</span>
              </>
            )}
          </button>
        </div>

        {/* Informational Footer Note */}
        <div className="mt-4 p-3 rounded-xl bg-stone-50 dark:bg-emerald-950/30 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
          Namaz vaxtları Azərbaycan Respublikası Dini Qurumlarla İş üzrə Dövlət Komitəsi və Qafqaz Müsəlmanları İdarəsinin astronomik təqviminə uyğun hesablanır.
        </div>
      </div>
    </div>
  );
};
