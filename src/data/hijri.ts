export interface HijriMonth {
  number: number;
  arabicName: string;
  nameAz: string;
  significance: string;
  isSacred: boolean; // Haram aylar (Zilqədə, Zilhiccə, Məhərrəm, Rəcəb)
}

export const HIJRI_MONTHS: HijriMonth[] = [
  {
    number: 1,
    arabicName: "مُحَرَّم",
    nameAz: "Məhərrəm",
    significance: "Hicri ilin ilk ayı və 4 haram (müqəddəs) aydan biridir. Aşura günü (10-cu gün) bu ayda qeyd olunur.",
    isSacred: true,
  },
  {
    number: 2,
    arabicName: "صَفَر",
    nameAz: "Səfər",
    significance: "Hicri təqvimin ikinci ayı.",
    isSacred: false,
  },
  {
    number: 3,
    arabicName: "رَبِيع الأَوَّل",
    nameAz: "Rəbiüləvvəl",
    significance: "Peyğəmbərimiz Həzrət Məhəmmədin (s.ə.s) dünyaya təşrif buyurduğu (Mövlud) bərəkətli ay.",
    isSacred: false,
  },
  {
    number: 4,
    arabicName: "رَبِيع الآخِر",
    nameAz: "Rəbiülaxir",
    significance: "Hicri ilin dördüncü ayı.",
    isSacred: false,
  },
  {
    number: 5,
    arabicName: "جُمَادَى الأُولَى",
    nameAz: "Cəmadiyələvvəl",
    significance: "Hicri ilin beşinci ayı.",
    isSacred: false,
  },
  {
    number: 6,
    arabicName: "جُمَادَى الآخِرَة",
    nameAz: "Cəmadiyəlaxir",
    significance: "Hicri ilin altıncı ayı.",
    isSacred: false,
  },
  {
    number: 7,
    arabicName: "رَجَب",
    nameAz: "Rəcəb",
    significance: "Üç mübarək ayların ilki və haram aylardan biridir. Rəqaib və Merac gecələri bu aydadır.",
    isSacred: true,
  },
  {
    number: 8,
    arabicName: "شَعْبَان",
    nameAz: "Şaban",
    significance: "Ramazanın müjdəçisi olan ay. Bəraət gecəsi bu ayın 15-ci gecəsinə təsadüf edir.",
    isSacred: false,
  },
  {
    number: 9,
    arabicName: "رَمَضَان",
    nameAz: "Ramazan",
    significance: "On bir ayın sultanı, Quranın nazil olduğu, oruc ibadətinin fərz qılındığı və içində min aydan xeyirli Qədr gecəsi olan ən mübarək ay.",
    isSacred: false,
  },
  {
    number: 10,
    arabicName: "شَوَّال",
    nameAz: "Şəvval",
    significance: "Ramazan bayramının qeyd olunduğu ay. Bu ayda 6 gün oruc tutmaq böyük fəzilət sayılır.",
    isSacred: false,
  },
  {
    number: 11,
    arabicName: "ذُو القَعْدَة",
    nameAz: "Zilqədə",
    significance: "Dörd haram aydan biridir, Həcc mövsümünə hazırlıq mərhələsidir.",
    isSacred: true,
  },
  {
    number: 12,
    arabicName: "ذُو الحِجَّة",
    nameAz: "Zilhiccə",
    significance: "Həcc ibadətinin yerinə yetirildiyi və Qurban bayramının qeyd olunduğu ən fəzilətli günləri olan haram ay.",
    isSacred: true,
  },
];

// Astronomical Gregorian-to-Hijri calculation algorithm (Kuwaiti algorithm)
export function calculateAstronomicalHijri(date: Date): { day: number; month: number; year: number } {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();

  const a = Math.floor((14 - m) / 12);
  const y_adj = y + 4800 - a;
  const m_adj = m + 12 * a - 3;
  const jd =
    day +
    Math.floor((153 * m_adj + 2) / 5) +
    365 * y_adj +
    Math.floor(y_adj / 4) -
    Math.floor(y_adj / 100) +
    Math.floor(y_adj / 400) -
    32045;

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  const month = Math.max(1, Math.min(12, Math.floor((24 * l) / 709)));
  const hDay = Math.max(1, Math.min(30, l - Math.floor((709 * month) / 24)));
  const year = 30 * n + j - 30;

  return { day: hDay, month, year };
}

// Islamic date calculator using Intl islamic-umalqura standard with verified astronomical fallback
export function getHijriDate(date: Date = new Date()): {
  day: number;
  monthIndex: number;
  monthName: string;
  arabicMonthName: string;
  year: number;
  formatted: string;
  gregorianFormatted: string;
} {
  const monthsAz = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
    "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
  ];
  const gregorianFormatted = `${date.getDate()} ${monthsAz[date.getMonth()]} ${date.getFullYear()}`;

  try {
    // Primary System: Native Intl DateTimeFormat with islamic-umalqura calendar & Latin numerals
    const formatter = new Intl.DateTimeFormat('az-u-ca-islamic-umalqura-nu-latn', {
      timeZone: 'Asia/Baku',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    let day = NaN;
    let month = NaN;
    let year = NaN;

    for (const part of parts) {
      if (part.type === 'day') day = parseInt(part.value, 10);
      if (part.type === 'month') month = parseInt(part.value, 10);
      if (part.type === 'year') year = parseInt(part.value, 10);
    }

    if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1300) {
      throw new Error('Intl Hijri parsing produced invalid numbers');
    }

    const monthObj = HIJRI_MONTHS[(month - 1 + 12) % 12];

    return {
      day,
      monthIndex: month - 1,
      monthName: monthObj.nameAz,
      arabicMonthName: monthObj.arabicName,
      year,
      formatted: `${day} ${monthObj.nameAz} ${year} H.`,
      gregorianFormatted,
    };
  } catch (_e) {
    // Verified astronomical fallback algorithm (used strictly when Intl islamic-umalqura is unavailable)
    const { day, month, year } = calculateAstronomicalHijri(date);
    const monthObj = HIJRI_MONTHS[(month - 1 + 12) % 12];

    return {
      day,
      monthIndex: month - 1,
      monthName: monthObj.nameAz,
      arabicMonthName: monthObj.arabicName,
      year,
      formatted: `${day} ${monthObj.nameAz} ${year} H.`,
      gregorianFormatted,
    };
  }
}
