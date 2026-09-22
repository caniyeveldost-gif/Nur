import { Dua, DuaCategory } from '../types';

export const DUA_CATEGORIES: DuaCategory[] = [
  { id: 'seher', name: 'Səhər duaları', iconName: 'SunMedium', description: 'Günün bərəkət və xeyir ilə başlaması üçün' },
  { id: 'axsam', name: 'Axşam duaları', iconName: 'Sunset', description: 'Gecənin şərlərindən Allaha sığınmaq üçün' },
  { id: 'yatmazdan', name: 'Yatmazdan əvvəl', iconName: 'Moon', description: 'Rahat yuxu və ilahi mühafizə üçün' },
  { id: 'yeməkdən_əvvəl', name: 'Yeməkdən əvvəl', iconName: 'Utensils', description: 'Nemətlərin bərəkəti üçün' },
  { id: 'yeməkdən_sonra', name: 'Yeməkdən sonra', iconName: 'HeartHandshake', description: 'Ruziyə görə Allaha şükür' },
  { id: 'sefer', name: 'Səfər duası', iconName: 'Navigation', description: 'Yolçuluq zamanı salamatlıq diləyi' },
  { id: 'valideyn', name: 'Valideynlər üçün', iconName: 'Users', description: 'Ata və ana üçün məğfirət və rəhmət' },
  { id: 'cetinlik', name: 'Çətinlik zamanı', iconName: 'ShieldAlert', description: 'Sıxıntı, kədər və qayğılardan qurtuluş' },
  { id: 'sukur', name: 'Şükür', iconName: 'Sparkles', description: 'Verilən saysız nemətlərə təşəkkür' },
  { id: 'bagislanma', name: 'Bağışlanma (İstiğfar)', iconName: 'RotateCcw', description: 'Günahların əfvi və tövbə' },
  { id: 'diger', name: 'Digər dualar', iconName: 'BookmarkCheck', description: 'Evə girərkən, məscidə daxil olarkən və s.' },
];

export const ALL_DUAS: Dua[] = [
  // Səhər duaları
  {
    id: 'dua-seher-1',
    categoryId: 'seher',
    title: 'Səhərə çıxarkən oxunan dua (Seyyidül-İstiğfar)',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: 'Allahummə Əntə Rabbiy, lə iləhə illə Ənt, xələqtəni va ənə abduk, va ənə alə ahdikə va va\'dikə məstətə\'tu, ə\'uzu bikə min şərri mə sanə\'tu, əbu\'u ləkə bini\'mətikə aleyyə, va əbu\'u bizənbiy, fəğfir li fəinnəhu lə yəğfiruz-zunubə illə Ənt.',
    translation: 'Allahım! Sən mənim Rəbbimsən, Səndən başqa məbud yoxdur. Məni Sən yaratdın və mən Sənin qulunam. Gücüm çatdığı qədər Sənə verdiyim əhdə və vədə sadiqəm. Etdiyim əməllərin şərindən Sənə sığınıram. Mənə bəxş etdiyin nemətləri etiraf edir və günahımı boynuma alıram. Məni bağışla, çünki günahları yalnız Sən bağışlayarsan!',
    source: 'Səhih əl-Buxari, 6306',
    repeatCount: 1
  },
  {
    id: 'dua-seher-2',
    categoryId: 'seher',
    title: 'Günün bərəkəti və şərlərdən qorunma',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'Əsbahnə va əsbəhəl-mulku lilləh, vəl-həmdu lilləh, lə iləhə illəllahu vahdəhu lə şərikə ləh, ləhul-mulku va ləhul-həmdu va Huvə alə kulli şəy\'in qadir.',
    translation: 'Biz də, mülk də Allahın olaraq səhərə çıxdıq. Həmd Allaha məxsusdur! Allahdan başqa heç bir ilah yoxdur, O təkdir, şəriki yoxdur. Mülk Onundur, həmd Ona məxsusdur və O, hər şeyə Qadirdir!',
    source: 'Səhih Müslim, 2723',
    repeatCount: 1
  },
  {
    id: 'dua-seher-3',
    categoryId: 'seher',
    title: 'Hər cür bəla və zərərdən qoruyan dua',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Bismilləhilləzi lə yadurru mə\'asmihi şəy\'un fil-ərdi va lə fis-səmə\'i va Huvəs-Səmi\'ul-Alim.',
    translation: 'Adı ilə nə yerdə, nə də göydə heç bir şeyin zərər verə bilməyəcəyi Allahın adı ilə! O, hər şeyi Eşidəndir, Biləndir!',
    source: 'Əbu Davud, 5088; ət-Tirmizi, 3388 (Səhih)',
    repeatCount: 3
  },

  // Axşam duaları
  {
    id: 'dua-axsam-1',
    categoryId: 'axsam',
    title: 'Axşama çıxarkən oxunan dua',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'Əmseynə va əmsəl-mulku lilləh, vəl-həmdu lilləh, lə iləhə illəllahu vahdəhu lə şərikə ləh, ləhul-mulku va ləhul-həmdu va Huvə alə kulli şəy\'in qadir.',
    translation: 'Biz də, mülk də Allahın olaraq axşama çıxdıq. Həmd Allaha məxsusdur! Allahdan başqa heç bir ilah yoxdur, O təkdir, şəriki yoxdur.',
    source: 'Səhih Müslim, 2723',
    repeatCount: 1
  },
  {
    id: 'dua-axsam-2',
    categoryId: 'axsam',
    title: 'Gecənin şərindən sığınma',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'Ə\'uzu bikəlimətilləhit-təmməti min şərri mə xələq.',
    translation: 'Yaratdıqlarının şərindən Allahın kamil kəlmələrinə sığınıram!',
    source: 'Səhih Müslim, 2709',
    repeatCount: 3
  },

  // Yatmazdan əvvəl
  {
    id: 'dua-yatmazdan-1',
    categoryId: 'yatmazdan',
    title: 'Yatağa girərkən oxunan dua',
    arabic: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
    transliteration: 'Bismikə Rabbi vadə\'tu cənbiy va bikə ərfə\'uhu, fəin əmsəktə nəfsiy fərhəmha, va in ərsəltəha fəhfəzha bimə təhfəzu bihi ibadəkəs-salihin.',
    translation: 'Ey Rəbbim! Sənin adınla böyrümü yerə qoydum və Sənin adınla da qalxaram. Əgər ruhumu alsan, ona rəhm et! Əgər onu geri qaytarsan, əməlisaleh bəndələrini qoruduğun kimi onu da qoru!',
    source: 'Səhih əl-Buxari, 6320; Səhih Müslim, 2714',
    repeatCount: 1
  },
  {
    id: 'dua-yatmazdan-2',
    categoryId: 'yatmazdan',
    title: 'Ayətəl-Kürsi (əl-Bəqərə, 255)',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    transliteration: 'Allahu lə iləhə illə Huvəl-Həyyul-Qayyum, lə tə\'xuzuhu sinətun va lə nəvm, ləhu mə fis-səməvati va mə fil-ərd...',
    translation: 'Allah! Ondan başqa ibadətə layiq olan məbud yoxdur. Əbədi Yaşayandır, bütün xəlq olunmuşların Qəyyumudur (hər şeyi idarə edəndir). Onu nə mürgü, nə də yuxu tutar...',
    source: 'əl-Bəqərə surəsi, 255-ci ayə; Səhih əl-Buxari, 2311',
    repeatCount: 1
  },

  // Yeməkdən əvvəl
  {
    id: 'dua-yemek-evvel-1',
    categoryId: 'yeməkdən_əvvəl',
    title: 'Yeməyə başlayarkən',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismilləh.',
    translation: 'Allahın adı ilə!',
    source: 'Səhih əl-Buxari, 5376; Səhih Müslim, 2022',
    repeatCount: 1
  },
  {
    id: 'dua-yemek-evvel-2',
    categoryId: 'yeməkdən_əvvəl',
    title: 'Əvvəlində Bismillah deməyi unudanda',
    arabic: 'بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ',
    transliteration: 'Bismilləhi fi əvvəlihi va əxirihi.',
    translation: 'Əvvəlində də, axırında da Allahın adı ilə!',
    source: 'Əbu Davud, 3767; ət-Tirmizi, 1858 (Səhih)',
    repeatCount: 1
  },

  // Yeməkdən sonra
  {
    id: 'dua-yemek-sonra-1',
    categoryId: 'yeməkdən_sonra',
    title: 'Yeməkdən sonra şükür duası',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration: 'Əlhəmdu lilləhilləzi ət\'aməni hazə va razaqanihi min ğayri havlin minni va lə quvvəh.',
    translation: 'Məndən heç bir qüvvət və güc olmadan məni bu təamla yedizdirən və onu mənə ruzi verən Allaha həmd olsun!',
    source: 'ət-Tirmizi, 3458; İbn Macə, 3285 (Həsən)',
    repeatCount: 1
  },

  // Səfər duası
  {
    id: 'dua-sefer-1',
    categoryId: 'sefer',
    title: 'Nəqliyyat vasitəsinə minərkən və səfərə çıxarkən',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ',
    transliteration: 'Subhənəlləzi səxxara lənə hazə va mə kunnə ləhu muqrinin, va innə ilə Rabbinə ləmunqalibun.',
    translation: 'Bunu bizə ram edən Allah pak və müqəddəsdir! Yoxsa bizim buna gücümüz çatmazdı. Şübhəsiz ki, biz Rəbbimizə qayıdacağıq!',
    source: 'əz-Zuxruf surəsi, 13-14; Səhih Müslim, 1342',
    repeatCount: 1
  },

  // Valideynlər üçün
  {
    id: 'dua-valideyn-1',
    categoryId: 'valideyn',
    title: 'Ata və ana üçün mərhəmət diləyi',
    arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbirhəmhuma kəmə rabbəyani sağira.',
    translation: 'Ey Rəbbim! Onlar məni körpəliyimdən tərbiyə edib böyütdükləri kimi, Sən də onlara rəhm et!',
    source: 'əl-İsra surəsi, 24-cü ayə',
    repeatCount: 1
  },
  {
    id: 'dua-valideyn-2',
    categoryId: 'valideyn',
    title: 'Özün və valideynlərin üçün bağışlanma duası',
    arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
    transliteration: 'Rabbənəğfir li va livəlidəyyə va lil-mumininə yəvmə yəqumul-hisəb.',
    translation: 'Ey Rəbbimiz! Haqq-hesab qurulacağı gün məni, valideynlərimi və bütün möminləri bağışla!',
    source: 'İbrahim surəsi, 41-ci ayə',
    repeatCount: 1
  },

  // Çətinlik zamanı
  {
    id: 'dua-cetinlik-1',
    categoryId: 'cetinlik',
    title: 'Yunus Peyğəmbərin dardan qurtuluş duası',
    arabic: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    transliteration: 'Lə iləhə illə Əntə subhənəkə inni kuntu minəz-zalimin.',
    translation: 'Səndən başqa heç bir ilah yoxdur! Sən pak və ucasan! Həqiqətən, mən haqsızlıq edənlərdən olmuşam!',
    source: 'əl-Ənbiya surəsi, 87-ci ayə; ət-Tirmizi, 3505',
    repeatCount: 1
  },
  {
    id: 'dua-cetinlik-2',
    categoryId: 'cetinlik',
    title: 'Kədər və sıxıntı anında dua',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
    transliteration: 'Allahummə inni ə\'uzu bikə minəl-həmmi vəl-həzən, vəl-aczi vəl-kəsəl, vəl-buxli vəl-cubn, va dalə\'id-dəyni va ğələbətir-rical.',
    translation: 'Allahım! Qəm-qüssədən, kədərdən, acizlikdən, tənbəllikdən, simiclikdən, qorxaqlıqdan, borc altında əzilməkdən və insanların zülmündən Sənə sığınıram!',
    source: 'Səhih əl-Buxari, 2893',
    repeatCount: 1
  },

  // Şükür
  {
    id: 'dua-sukur-1',
    categoryId: 'sukur',
    title: 'Nemətlərə layiqincə şükür etmək üçün dua',
    arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ',
    transliteration: 'Rabbi əvzi\'ni ən əşkurə ni\'mətəkəlləti ən\'amtə aleyyə va alə vəlidəyyə va ən ə\'mələ salihən tərdahu.',
    translation: 'Ey Rəbbim! Mənə və valideynlərimə bəxş etdiyin nemətlərə şükür etmək və Sənin razı qalacağın yaxşı əməllər görmək üçün mənə ilham ver!',
    source: 'ən-Nəml surəsi, 19-cu ayə',
    repeatCount: 1
  },

  // Bağışlanma
  {
    id: 'dua-bagislanma-1',
    categoryId: 'bagislanma',
    title: 'Adəm və Həvvanın tövbə duası',
    arabic: 'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
    transliteration: 'Rabbənə zaləmnə ənfusənə va il-ləm təğfir lənə va tərhəmnə lənəkunənnə minəl-xasirin.',
    translation: 'Ey Rəbbimiz! Biz özümüzə zülm etdik. Əgər bizi bağışlamasan və bizə rəhm etməsən, şübhəsiz ki, ziyana uğrayanlardan olarıq!',
    source: 'əl-Əraf surəsi, 23-cü ayə',
    repeatCount: 1
  },

  // Digər dualar
  {
    id: 'dua-diger-1',
    categoryId: 'diger',
    title: 'Elm və anlayışın artması üçün dua',
    arabic: 'رَّبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni \'ilma.',
    translation: 'Ey Rəbbim! Mənim elmimi artır!',
    source: 'Taha surəsi, 114-cü ayə',
    repeatCount: 1
  },
  {
    id: 'dua-diger-2',
    categoryId: 'diger',
    title: 'Evdən çıxarkən oxunan dua',
    arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'Bismilləhi təvəkkəltu alallahi, va lə havlə va lə quvvətə illə billəh.',
    translation: 'Allahın adı ilə! Allaha təvəkkül etdim. Qüdrət və güc yalnız Allaha məxsusdur!',
    source: 'Əbu Davud, 5095; ət-Tirmizi, 3426 (Səhih)',
    repeatCount: 1
  }
];

export const DAILY_DUA = ALL_DUAS[0];
