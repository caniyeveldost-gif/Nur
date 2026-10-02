import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Bell,
  BellOff,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  SunMedium,
  Sunset,
  CalendarClock,
  AlertCircle,
  Send,
  Settings2
} from 'lucide-react';
import { CityPrayerData } from '../types';
import { AZERBAIJAN_CITIES } from '../services/apiService';
import {
  PrayerNotificationSettings,
  getPrayerNotificationSettings,
  savePrayerNotificationSettings,
  requestNotificationPermission,
  getNotificationPermission,
  sendTestNotification,
  scheduleDailyPrayerNotifications,
  getNextPrayerNotificationInfo,
} from '../services/notificationService';

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
  const [settings, setSettings] = useState<PrayerNotificationSettings>(() =>
    getPrayerNotificationSettings()
  );
  const [permissionStatus, setPermissionStatus] = useState<string>(() =>
    getNotificationPermission()
  );
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [testingNotification, setTestingNotification] = useState<boolean>(false);

  // Update permission status on mount
  useEffect(() => {
    setPermissionStatus(getNotificationPermission());
  }, []);

  // Save settings and reschedule whenever settings change
  const updateSettings = (partial: Partial<PrayerNotificationSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    savePrayerNotificationSettings(updated);
    scheduleDailyPrayerNotifications(prayerData);
  };

  const handleToggleMainNotification = async () => {
    if (!settings.enabled) {
      if (permissionStatus === 'granted') {
        updateSettings({ enabled: true });
        setNotificationMsg({ text: 'Gündəlik namaz bildirişləri aktivləşdirildi!', type: 'success' });
      } else {
        const granted = await requestNotificationPermission();
        setPermissionStatus(getNotificationPermission());
        if (granted) {
          updateSettings({ enabled: true });
          setNotificationMsg({ text: 'Bildiriş icazəsi verildi və vaxtlar planlaşdırıldı!', type: 'success' });
        } else {
          setNotificationMsg({
            text: 'Brauzerdə bildiriş icazəsi verilmədi. Brauzer ayarlarından bildirişlərə icazə verin.',
            type: 'error',
          });
        }
      }
    } else {
      updateSettings({ enabled: false });
      setNotificationMsg({ text: 'Bütün bildirişlər söndürüldü.', type: 'info' });
    }

    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleSendTest = async () => {
    setTestingNotification(true);
    try {
      const ok = await sendTestNotification();
      setPermissionStatus(getNotificationPermission());
      if (ok) {
        setNotificationMsg({ text: 'Sınaq bildirişi göndərildi! Cihazınızı yoxlayın.', type: 'success' });
      } else {
        setNotificationMsg({
          text: 'Bildiriş göndərilə bilmədi. Zəhmət olmasa bildiriş icazələrini yoxlayın.',
          type: 'error',
        });
      }
    } catch (_err) {
      setNotificationMsg({ text: 'Xəta baş verdi.', type: 'error' });
    } finally {
      setTestingNotification(false);
      setTimeout(() => setNotificationMsg(null), 3500);
    }
  };

  const nextInfo = getNextPrayerNotificationInfo(prayerData);

  const prayerList = [
    { key: 'fajr', nameAz: 'Sübh (Fəcr)', arabic: 'الفجر', time: prayerData.timings.fajr, desc: 'Sübh şəfəqinin sökülməsindən gün çıxana qədər' },
    { key: 'sunrise', nameAz: 'Gün çıxır (Şuruq)', arabic: 'الشروق', time: prayerData.timings.sunrise, desc: 'Günəşin üfüqdə doğuş vaxtı (kərahət vaxtı)' },
    { key: 'dhuhr', nameAz: 'Günorta (Zöhr)', arabic: 'الظهر', time: prayerData.timings.dhuhr, desc: 'Günəşin zenitdən qərbə meyl etdiyi andan' },
    { key: 'asr', nameAz: 'İkindi (Əsr)', arabic: 'العصر', time: prayerData.timings.asr, desc: 'Əşyaların kölgəsi öz boyu qədər uzandıqda' },
    { key: 'maghrib', nameAz: 'Axşam (Məğrib)', arabic: 'المغرب', time: prayerData.timings.maghrib, desc: 'Günəşin tam qürub etdiyi an (iftar vaxtı)' },
    { key: 'isha', nameAz: 'Yatsı (İşa)', arabic: 'العشاء', time: prayerData.timings.isha, desc: 'Qürub qırmızılığının tam itməsindən sübhə qədər' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1e15] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 max-h-[92vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-700 text-amber-300 flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Namaz Vaxtları və Bildirişlər
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

        {/* Status Message Alert */}
        {notificationMsg && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-in fade-in duration-150 ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : notificationMsg.type === 'error'
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
            }`}
          >
            {notificationMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
        )}

        {/* Section: Daily Push Notifications for Fajr and Maghrib */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/40 dark:from-[#091f15] dark:via-[#0c1e15] dark:to-[#12241b] border border-emerald-900/15 dark:border-emerald-700/40 shadow-xs space-y-3.5">
          {/* Main Toggle Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <span>Gündəlik Namaz Bildirişləri</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-amber-300 font-semibold">
                    Cihazdaxili Xatırlatma
                  </span>
                </h3>
                <p className="text-[11px] text-stone-600 dark:text-stone-300">
                  Sübh (Fəcr) və Axşam (Məğrib) namaz vaxtlarında avtomatik xatırlatma
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleMainNotification}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-xs ${
                settings.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-stone-200 dark:bg-emerald-900/40 text-stone-700 dark:text-stone-300 hover:bg-stone-300'
              }`}
            >
              {settings.enabled ? (
                <>
                  <Bell className="w-3.5 h-3.5 fill-white" />
                  <span>Aktivdir</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Qapalı</span>
                </>
              )}
            </button>
          </div>

          {/* Sub-toggles if notifications are enabled */}
          {settings.enabled && (
            <div className="pt-2 border-t border-emerald-900/10 dark:border-emerald-800/30 space-y-2.5">
              {/* Fajr & Maghrib Specific Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Fajr Toggle */}
                <button
                  type="button"
                  onClick={() => updateSettings({ fajr: !settings.fajr })}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition ${
                    settings.fajr
                      ? 'bg-white dark:bg-[#07170f] border-amber-400 dark:border-amber-500/60 shadow-xs'
                      : 'bg-stone-50 dark:bg-emerald-950/20 border-stone-200 dark:border-emerald-900/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SunMedium className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Sübh (Fəcr)
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        Vaxt: {prayerData.timings.fajr}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      settings.fajr
                        ? 'bg-amber-500 border-amber-500 text-white font-bold'
                        : 'border-stone-300 dark:border-emerald-800'
                    }`}
                  >
                    {settings.fajr ? '✓' : ''}
                  </span>
                </button>

                {/* Maghrib Toggle */}
                <button
                  type="button"
                  onClick={() => updateSettings({ maghrib: !settings.maghrib })}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition ${
                    settings.maghrib
                      ? 'bg-white dark:bg-[#07170f] border-amber-400 dark:border-amber-500/60 shadow-xs'
                      : 'bg-stone-50 dark:bg-emerald-950/20 border-stone-200 dark:border-emerald-900/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Axşam (Məğrib)
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        Vaxt: {prayerData.timings.maghrib} (İftar)
                      </div>
                    </div>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      settings.maghrib
                        ? 'bg-amber-500 border-amber-500 text-white font-bold'
                        : 'border-stone-300 dark:border-emerald-800'
                    }`}
                  >
                    {settings.maghrib ? '✓' : ''}
                  </span>
                </button>
              </div>

              {/* All Prayers Toggle */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <span className="text-stone-600 dark:text-stone-300 text-[11px]">
                  Bütün namazlar üçün bildiriş (Zöhr, Əsr, İşa):
                </span>
                <button
                  type="button"
                  onClick={() => updateSettings({ allPrayers: !settings.allPrayers })}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition ${
                    settings.allPrayers
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {settings.allPrayers ? 'Aktivdir' : 'Söndürülüb'}
                </button>
              </div>

              {/* Reminder Offset Selection */}
              <div className="space-y-1.5 pt-1 px-1">
                <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>Xatırlatma vaxtı:</span>
                  <span className="font-bold text-emerald-800 dark:text-amber-400">
                    {settings.offsetMinutes === 0
                      ? 'Dəqiq vaxtında'
                      : `${settings.offsetMinutes} dəqiqə əvvəl`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => updateSettings({ offsetMinutes: mins })}
                      className={`py-1 text-[11px] font-semibold rounded-lg border transition ${
                        settings.offsetMinutes === mins
                          ? 'bg-[#064e3b] text-amber-300 border-[#064e3b]'
                          : 'bg-white dark:bg-emerald-950/40 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-emerald-800/40 hover:bg-stone-50'
                      }`}
                    >
                      {mins === 0 ? 'Dəqiq' : `${mins} dəq`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Scheduled Prayer Banner */}
              {nextInfo ? (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        Növbəti: {nextInfo.prayerName}
                      </span>
                      <span className="text-stone-500 dark:text-stone-400 text-[11px] ml-1.5">
                        ({nextInfo.dateLabel} {nextInfo.targetTimeStr})
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                    {nextInfo.remainingText}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-stone-500 p-2 text-center">
                  Xatırlatma üçün ən azı bir namaz vaxtı seçin.
                </div>
              )}

              {/* Sound & Test Notification Controls */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings({ sound: !settings.sound })}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900"
                >
                  {settings.sound ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                      <span>Səsli zəng aktiv</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                      <span>Səssiz bildiriş</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testingNotification}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-emerald-950/60 hover:bg-amber-500/10 hover:text-amber-600 text-[11px] font-bold text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-emerald-800/40 transition flex items-center gap-1"
                >
                  <Send className="w-3 h-3 text-amber-500" />
                  <span>{testingNotification ? 'Göndərilir...' : 'Sınaq bildirişi'}</span>
                </button>
              </div>

              {/* Permission Warning Notice if Denied */}
              {permissionStatus === 'denied' && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[11px] flex items-start gap-1.5 border border-rose-200 dark:border-rose-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>
                    Brauzerdə bildiriş icazəsi bloklanıb. Vaxt bildirişlərini almaq üçün brauzerin ünvan zolağındakı tənzimləmələrdən bu sayt üçün bildirişlərə icazə verin.
                  </span>
                </div>
              )}

              {/* Informative transparency notice on local device notification behavior */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed border border-emerald-500/20">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">ℹ️ Cihazdaxili xatırlatma: </span>
                Tətbiq və ya brauzer açıq olduqda təyin olunmuş dəqiqədə xəbərdarlıq edir. Şəxsi məlumatlarınız heç bir kənar serverə ötürülmür.
              </div>
            </div>
          )}
        </div>

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

        {/* Calculation Specs & Transparency Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-emerald-950/30 text-xs text-stone-600 dark:text-stone-300 space-y-2 border border-stone-200/80 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-stone-200/60 dark:border-emerald-900/30">
            <span className="font-semibold text-stone-500 dark:text-stone-400">Mənbə:</span>
            <span className="font-bold text-emerald-800 dark:text-amber-300">Astronomik hesablama · Adhan</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-stone-200/60 dark:border-emerald-900/30">
            <span className="font-semibold text-stone-500 dark:text-stone-400">Hesablama Metodu:</span>
            <span className="font-medium text-stone-800 dark:text-stone-200">{prayerData.calculationMethod || 'MuslimWorldLeague'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-stone-200/60 dark:border-emerald-900/30">
            <span className="font-semibold text-stone-500 dark:text-stone-400">Əsr Məzhəbi:</span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {prayerData.madhab === 'hanafi' ? 'Hənəfi (2x kölgə)' : 'Şafii / Cümhur (1x kölgə)'}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed pt-1">
            Vaxtlar seçilmiş şəhərin coğrafi GPS koordinatları və seçilmiş astronomik hesablama metodu əsasında təyin olunur. Məscidlər arasındakı fərdi fərqlər üçün Profil bölməsindən dəqiqə tənzimləmələri (+/-) edə bilərsiniz.
          </p>
        </div>
      </div>
    </div>
  );
};
