import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Bell,
  Sun,
  Moon,
  Type,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  Compass
} from 'lucide-react';
import { UserSettings } from '../types';
import { AZERBAIJAN_CITIES } from '../services/apiService';
import { requestNotificationPermission } from '../services/notificationService';

interface OnboardingModalProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onComplete: () => void;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  settings,
  onUpdateSettings,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedCity, setSelectedCity] = useState<string>(settings.city || 'Baki');
  const [themeChoice, setThemeChoice] = useState<'light' | 'dark'>(settings.theme || 'light');
  const [fontChoice, setFontChoice] = useState<'small' | 'medium' | 'large'>(
    settings.fontSize === 'small' ? 'small' : settings.fontSize === 'large' ? 'large' : 'medium'
  );
  const [notifGranted, setNotifGranted] = useState<boolean>(false);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Save all and complete
      onUpdateSettings({
        city: selectedCity,
        theme: themeChoice,
        fontSize: fontChoice,
        onboardingCompleted: true,
      });
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRequestNotif = async () => {
    const ok = await requestNotificationPermission();
    setNotifGranted(ok);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1e15] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
          aria-label="Keç"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s
                  ? 'w-8 bg-amber-500'
                  : step > s
                  ? 'w-4 bg-emerald-700'
                  : 'w-3 bg-stone-200 dark:bg-emerald-950'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-4 text-center py-2 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 text-amber-300 flex items-center justify-center mx-auto shadow-lg border border-amber-400/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              “Nur” Tətbiqinə Xoş Gəlmisiniz!
            </h3>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed px-2">
              Azərbaycan dilində ən müasir və zəngin İslam bələdçisi: Astronomik hesablanmış namaz vaxtları, Qurani-Kərim oxucusu və qiraəti, Hisnul-Muslim duaları, elektron təsbeh, qiblə kompas və Nur AI köməkçi.
            </p>

            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-900/10 dark:border-emerald-800/30 text-xs text-emerald-900 dark:text-amber-300 font-medium">
              Tətbiqi sizin üçün uyğunlaşdırmaq üçün qısa addımları tamamlayın.
            </div>
          </div>
        )}

        {/* Step 2: City Selection */}
        {step === 2 && (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Şəhərinizi Seçin
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Namaz vaxtları və Qiblə istiqaməti koordinatlara əsasən hesablanır.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {Object.entries(AZERBAIJAN_CITIES).map(([key, item]) => {
                const isSelected = selectedCity === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCity(key)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-[#064e3b] text-white border-amber-400 shadow-xs'
                        : 'bg-stone-50 dark:bg-emerald-950/30 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-emerald-900/40 hover:bg-stone-100'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Notification Permission */}
        {step === 3 && (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Namaz Bildirişləri
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Sübh və Məğrib (və digər) vaxtlarda vaxtında xəbərdarlıq alın.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-emerald-950/40 border border-stone-200 dark:border-emerald-900/40 space-y-3">
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Tətbiq brauzerinizin standart Notification API və Service Worker sistemi vasitəsilə cihazdaxili namaz xatırlatmaları göndərir.
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Bildirişlərin işləməsi brauzer və cihazın fon fəaliyyəti məhdudiyyətlərindən asılı ola bilər.
              </p>

              <button
                type="button"
                onClick={handleRequestNotif}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${
                  notifGranted
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#064e3b] hover:bg-emerald-700 text-amber-300'
                }`}
              >
                {notifGranted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span>İcazə Verildi ✓</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Bildirişlərə İcazə Ver</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Appearance & Font Size */}
        {step === 4 && (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Type className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Görünüş və Şrift
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Gözləriniz üçün ən rahat oxu parametrlərini seçin.
                </p>
              </div>
            </div>

            {/* Theme choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Mövzu:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setThemeChoice('light')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    themeChoice === 'light'
                      ? 'bg-white text-emerald-950 border-[#064e3b] shadow-sm ring-2 ring-[#064e3b]/30'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>İşıqlı Rejim</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeChoice('dark')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    themeChoice === 'dark'
                      ? 'bg-[#0c1e15] text-amber-300 border-amber-400 shadow-sm ring-2 ring-amber-400/30'
                      : 'bg-stone-50 dark:bg-emerald-950/40 text-stone-400 border-stone-200 dark:border-emerald-900/40'
                  }`}
                >
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span>Qaranlıq Rejim</span>
                </button>
              </div>
            </div>

            {/* Font size choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Şrift Ölçüsü:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((fs) => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => setFontChoice(fs)}
                    className={`py-2 rounded-xl border text-xs font-bold transition ${
                      fontChoice === fs
                        ? 'bg-[#064e3b] text-amber-300 border-[#064e3b] shadow-xs'
                        : 'bg-stone-50 dark:bg-emerald-950/40 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-emerald-900/40'
                    }`}
                  >
                    {fs === 'small' ? 'Kompakt' : fs === 'medium' ? 'Standart' : 'Böyük'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-emerald-900/30 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-emerald-800 text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1 hover:bg-stone-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Geri</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-emerald-700 text-amber-300 font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <span>{step === 4 ? 'Başla' : 'Növbəti'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
