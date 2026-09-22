import { ZikrItem } from '../types';

export const POPULAR_ZIKRS: ZikrItem[] = [
  {
    id: 'zikr-subhanallah',
    title: 'Sübhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'Subhənallah',
    translation: 'Allah hər cür nöqsandan pak və münəzzəhdir.',
    defaultTarget: 33,
    virtue: 'Namazdan sonra 33 dəfə deyilməsi böyük savabdır və günahların bağışlanmasına vəsilə olar.'
  },
  {
    id: 'zikr-alhamdulillah',
    title: 'Əlhəmdulilləh',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Əlhəmdulilləh',
    translation: 'Həmd və təriflər yalnız Allaha məxsusdur.',
    defaultTarget: 33,
    virtue: 'Tərəzini dolduran ən fəzilətli şükür zikridir.'
  },
  {
    id: 'zikr-allahuakbar',
    title: 'Allahu Əkbər',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Əkbər',
    translation: 'Allah hər şeydən uca və böyükdür.',
    defaultTarget: 33,
    virtue: 'Allahın əzəmətini təsdiq edən uca zikr.'
  },
  {
    id: 'zikr-tehlil',
    title: 'Lə iləhə illəllah',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    transliteration: 'Lə iləhə illəllah',
    translation: 'Allahdan başqa ibadətə layiq haqq məbud yoxdur.',
    defaultTarget: 100,
    virtue: 'İmanın ən fəzilətli kəlməsi və cənnətin açarıdır.'
  },
  {
    id: 'zikr-istigfar',
    title: 'Əstəğfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Əstəğfirullahə va ətubu ileyh',
    translation: 'Allahdan bağışlanma diləyirəm və Ona tövbə edirəm.',
    defaultTarget: 100,
    virtue: 'Peyğəmbərimiz (s.ə.s) gündə 70-dən və ya 100-dən çox istiğfar edərdi; ruzini artırar və qəlbə dinclik gətirər.'
  },
  {
    id: 'zikr-salavat',
    title: 'Salavat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ',
    transliteration: 'Allahummə salli alə Muhəmmədin va alə əli Muhəmməd',
    translation: 'Allahım! Məhəmmədə və onun ailəsinə xeyir-dua və rəhmət bəxş et.',
    defaultTarget: 100,
    virtue: 'Kim Peyğəmbərə bir salavat göndərərsə, Allah ona on rəhmət göndərər.'
  },
  {
    id: 'zikr-havqala',
    title: 'Lə havlə və lə quvvətə...',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'Lə havlə va lə quvvətə illə billəh',
    translation: 'Güc və qüvvət yalnız Uca və Böyük olan Allaha məxsusdur.',
    defaultTarget: 33,
    virtue: 'Cənnət xəzinələrindən bir xəzinədir.'
  },
  {
    id: 'zikr-subhanallahi-ve-bihamdihi',
    title: 'Sübhanallahi və bihəmdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    transliteration: 'Subhənallahi va bihəmdihi, Subhənallahil-Azim',
    translation: 'Allaha həmd edərək Onu pak bilirik, Uca Allah bütün nöqsanlardan münəzzəhdir.',
    defaultTarget: 100,
    virtue: 'Dildə çox yüngül, tərəzidə çox ağır və Rəhmana çox sevimli olan iki kəlmədir.'
  }
];

export const DAILY_ZIKR = POPULAR_ZIKRS[3]; // Lə iləhə illəllah
