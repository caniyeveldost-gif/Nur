import React from 'react';
import { X, Calendar as CalendarIcon, Sparkles, Moon, Star } from 'lucide-react';
import { HIJRI_MONTHS, getHijriDate } from '../data/hijri';

interface CalendarModalProps {
  onClose: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ onClose }) => {
  const currentHijri = getHijriDate();

  const holyDays = [
    { name: 'Mövlud Qəndili', hijri: '12 Rəbiüləvvəl', desc: 'Peyğəmbərimiz Həzrət Məhəmmədin (s.ə.s) mübarək mövludu' },
    { name: 'Rəqaib Qəndili', hijri: 'Rəcəb ayının ilk Cümə gecəsi', desc: 'Mübarək Üç Ayların başlanğıcı' },
    { name: 'Merac Gecəsi', hijri: '27 Rəcəb', desc: 'Peyğəmbərimizin göyə ucaldığı və 5 vaxt namazın fərz qılındığı gecə' },
    { name: 'Bəraət Gecəsi', hijri: '15 Şaban', desc: 'Günahların bağışlandığı və qədər qeydlərinin təqdim olunduğu gecə' },
    { name: 'Ramazan Ayının Başlanğıcı', hijri: '1 Ramazan', desc: 'Oruc ibadəti və Quranın nazil olduğu mübarək ay' },
    { name: 'Qədr Gecəsi (Leylətül-Qədr)', hijri: 'Ramazanın 27-ci gecəsi', desc: 'Min aydan daha xeyirli olan ən mübarək gecə' },
    { name: 'Ramazan (Fitr) Bayramı', hijri: '1-3 Şəvval', desc: 'Bir aylıq orucun bayram sevinci və fitrə zəkatı' },
    { name: 'Arafat Günü', hijri: '9 Zilhiccə', desc: 'Həcc ziyarətinin ən mühüm günü və tövbə vaxtı' },
    { name: 'Qurban Bayramı (İyd əl-Ədha)', hijri: '10-13 Zilhiccə', desc: 'Təqva və fədakarlıq rəmzi olan müqəddəs bayram' },
    { name: 'Aşura Günü', hijri: '10 Məhərrəm', desc: 'Həzrət Hüseynin (ə) şəhadəti və tarixi hadisələrin anımı' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1e15] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200/80 dark:border-emerald-800/40 max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Hicri Qəməri Təqvim
              </h2>
              <div className="text-xs text-stone-600 dark:text-stone-300">
                Mübarək aylar və İslami əlamətdar günlər
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

        {/* Current Date Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#064e3b] to-emerald-800 text-white text-center shadow-md">
          <div className="text-xs font-semibold text-emerald-200 uppercase tracking-widest">
            Bugünkü Hicri Tarix
          </div>
          <div className="text-2xl font-bold font-serif text-amber-300 mt-1">
            {currentHijri.formatted}
          </div>
          <div className="text-xs text-emerald-100 mt-0.5">
            Miladi: {currentHijri.gregorianFormatted}
          </div>
        </div>

        {/* Holy Days & Nights Section */}
        <div className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 mb-2.5 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Mübarək Günlər və Gecələr</span>
          </h3>

          <div className="space-y-2">
            {holyDays.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-white dark:bg-[#09150e] border border-stone-200/80 dark:border-emerald-800/40 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {h.name}
                  </h4>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-400/30">
                    {h.hijri}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {h.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Hijri 12 Months Section */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 mb-2.5 flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Hicri İlin 12 Ayı</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {HIJRI_MONTHS.map((m) => (
              <div
                key={m.number}
                className={`p-2.5 rounded-xl border text-left transition ${
                  m.number === currentHijri.monthIndex + 1
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold'
                    : 'bg-white dark:bg-[#09150e] border-stone-200/80 dark:border-emerald-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {m.number}. {m.nameAz}
                  </span>
                  <span className="font-arabic text-amber-500 text-xs">
                    {m.arabicName}
                  </span>
                </div>
                {m.isSacred && (
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-400/20 text-amber-700 dark:text-amber-300 font-semibold">
                    Haram ay
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-stone-100 dark:bg-emerald-950/30 text-[10px] text-stone-600 dark:text-stone-300 text-center leading-relaxed">
            📌 Qeyd: Hicri təqvim ayı qəməri (yeni ayparanın görünməsi) müşahidəsinə əsaslanır. Yerli rəsmi tarixlər Qafqaz Müsəlmanları İdarəsinin (QMİ) fətva və elanları ilə tənzimlənir.
          </div>
        </div>
      </div>
    </div>
  );
};
