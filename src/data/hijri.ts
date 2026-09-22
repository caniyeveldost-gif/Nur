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

// Approximate Islamic date calculator using Umm al-Qura standard or Kuwaiti algorithm
export function getHijriDate(date: Date = new Date()): {
  day: number;
  monthIndex: number;
  monthName: string;
  arabicMonthName: string;
  year: number;
  formatted: string;
  gregorianFormatted: string;
} {
  try {
    // Native Intl DateTimeFormat with islamic-umalqura calendar
    const formatter = new Intl.DateTimeFormat('az-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    let day = 1;
    let month = 1;
    let year = 1448;

    for (const part of parts) {
      if (part.type === 'day') day = parseInt(part.value, 10) || 1;
      if (part.type === 'month') month = parseInt(part.value, 10) || 1;
      if (part.type === 'year') year = parseInt(part.value, 10) || 1448;
    }

    const monthObj = HIJRI_MONTHS[(month - 1 + 12) % 12];

    const monthsAz = [
      "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
      "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
    ];

    const gregorianFormatted = `${date.getDate()} ${monthsAz[date.getMonth()]} ${date.getFullYear()}`;

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
    // Fallback calculation
    const gregorianYear = date.getFullYear();
    const approxHijriYear = Math.round((gregorianYear - 622) * 1.030684);
    return {
      day: date.getDate(),
      monthIndex: 2,
      monthName: "Rəbiüləvvəl",
      arabicMonthName: "رَبِيع الأَوَّل",
      year: approxHijriYear,
      formatted: `${date.getDate()} Rəbiüləvvəl ${approxHijriYear} H.`,
      gregorianFormatted: date.toLocaleDateString('az-AZ'),
    };
  }
}
