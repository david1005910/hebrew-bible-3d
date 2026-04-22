export interface Verse {
  ref?: string;
  hebrew: string;
  translit: string;
  korean: string;
  note?: string;
  highlight?: string;
  highlightMean?: string;
}

export interface Scene {
  id: string;
  title: string;
  titleKr: string;
  subtitle: string;
  chapter: string;
  dayLabel: string | null;
  accent: string;
  verses: Verse[];
  narration?: string;
  structure?: boolean;
  closing?: boolean;
  verseScene?: boolean;
}

export const SCENES: Scene[] = [
  // 0. 서론 (Prologue)
  {
    id: 'prologue',
    title: 'בְּרֵאשִׁית',
    titleKr: '베레쉬트',
    subtitle: '창세기 1:1 – 2:3',
    chapter: '序 · Prologue',
    dayLabel: null,
    accent: 'oklch(55% 0.08 60)',
    verses: [
      {
        hebrew: 'בְּרֵאשִׁית',
        translit: 'bereshit',
        korean: '태초에',
        note: '히브리어 성경의 첫 단어',
      },
    ],
    narration:
      '태초에, 하나님이 하늘과 땅을 창조하시니라.\n창세기의 첫 문장은 모든 것의 시작을 선언합니다.',
  },

  // 1. 첫째 날 - 빛
  {
    id: 'day1',
    title: 'יוֹם אֶחָד',
    titleKr: '욤 에하드',
    subtitle: '첫째 날 · Day One',
    chapter: '창세기 1:1–5',
    dayLabel: '1',
    accent: 'oklch(70% 0.13 80)',
    verses: [
      {
        ref: '1:1',
        hebrew: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
        translit: 'bereshit bara Elohim et ha-shamayim ve-et ha-aretz',
        korean: '태초에 하나님이 하늘들과 땅을 창조하셨다',
        highlight: 'בָּרָא',
        highlightMean: '바라 · 창조하다',
      },
      {
        ref: '1:2',
        hebrew: 'וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ וְחֹשֶׁךְ עַל־פְּנֵי תְהוֹם',
        translit:
          've-ha-aretz hayta tohu va-vohu ve-choshek al-pnei tehom',
        korean: '땅은 혼돈(토후)과 공허(보후)였고, 어둠이 깊음의 표면 위에 있었다',
        highlight: 'תֹהוּ וָבֹהוּ',
        highlightMean: '토후 바보후 · 혼돈과 공허',
      },
      {
        ref: '1:3',
        hebrew: 'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַיְהִי־אוֹר',
        translit: 'vayomer Elohim yehi or vayhi or',
        korean: '하나님이 말씀하시되 "빛이 있으라" 하시니 빛이 있었다',
        highlight: 'יְהִי אוֹר',
        highlightMean: '예히 오르 · 빛이 있으라',
      },
    ],
  },

  // 2. 둘째 날 - 궁창
  {
    id: 'day2',
    title: 'יוֹם שֵׁנִי',
    titleKr: '욤 셰니',
    subtitle: '둘째 날 · Day Two',
    chapter: '창세기 1:6–8',
    dayLabel: '2',
    accent: 'oklch(65% 0.11 230)',
    verses: [
      {
        ref: '1:6',
        hebrew: 'וַיֹּאמֶר אֱלֹהִים יְהִי רָקִיעַ בְּתוֹךְ הַמָּיִם',
        translit: "vayomer Elohim yehi rakia b'tokh ha-mayim",
        korean: '하나님이 말씀하시되 "물들 가운데 궁창이 있으라"',
        highlight: 'רָקִיעַ',
        highlightMean: '라키아 · 궁창/펼쳐진 공간',
      },
      {
        ref: '1:7',
        hebrew:
          'וַיַּבְדֵּל בֵּין הַמַּיִם אֲשֶׁר מִתַּחַת לָרָקִיעַ וּבֵין הַמַּיִם אֲשֶׁר מֵעַל לָרָקִיעַ',
        translit:
          "vayavdel bein ha-mayim asher mitachat la-rakia u'vein ha-mayim asher me'al la-rakia",
        korean: '궁창 아래의 물과 궁창 위의 물을 나누셨다',
        highlight: 'וַיַּבְדֵּל',
        highlightMean: '바야브델 · 그리고 나누셨다',
      },
      {
        ref: '1:8',
        hebrew: 'וַיִּקְרָא אֱלֹהִים לָרָקִיעַ שָׁמָיִם',
        translit: 'vayikra Elohim la-rakia shamayim',
        korean: '하나님이 궁창을 "하늘(샤마임)"이라 부르셨다',
        highlight: 'שָׁמָיִם',
        highlightMean: '샤마임 · 하늘들',
      },
    ],
  },

  // 3. 셋째 날 - 땅과 식물
  {
    id: 'day3',
    title: 'יוֹם שְׁלִישִׁי',
    titleKr: '욤 쉘리쉬',
    subtitle: '셋째 날 · Day Three',
    chapter: '창세기 1:9–13',
    dayLabel: '3',
    accent: 'oklch(60% 0.13 145)',
    verses: [
      {
        ref: '1:9',
        hebrew:
          'יִקָּווּ הַמַּיִם מִתַּחַת הַשָּׁמַיִם אֶל־מָקוֹם אֶחָד וְתֵרָאֶה הַיַּבָּשָׁה',
        translit:
          "yikavu ha-mayim mitachat ha-shamayim el-makom echad ve-tera'eh ha-yabasha",
        korean: '하늘 아래의 물들은 한 곳으로 모이고 마른 땅이 드러나라',
        highlight: 'הַיַּבָּשָׁה',
        highlightMean: '하야바샤 · 마른 땅',
      },
      {
        ref: '1:11',
        hebrew: 'תַּדְשֵׁא הָאָרֶץ דֶּשֶׁא עֵשֶׂב מַזְרִיעַ זֶרַע עֵץ פְּרִי',
        translit: 'tadshe ha-aretz deshe esev mazria zera etz pri',
        korean: '땅은 풀과, 씨 맺는 채소와, 열매 맺는 나무를 내라',
        highlight: 'דֶּשֶׁא',
        highlightMean: '데셰 · 푸른 싹',
      },
      {
        ref: '1:12',
        hebrew: 'וַתּוֹצֵא הָאָרֶץ דֶּשֶׁא ... וַיַּרְא אֱלֹהִים כִּי־טוֹב',
        translit: 'vatotse ha-aretz deshe ... vayar Elohim ki-tov',
        korean: '땅이 풀을 내었고… 하나님이 보시기에 좋았다',
        highlight: 'כִּי־טוֹב',
        highlightMean: '키 토브 · 좋았다',
      },
    ],
  },

  // 4. 넷째 날 - 해와 달과 별
  {
    id: 'day4',
    title: 'יוֹם רְבִיעִי',
    titleKr: '욤 레비이',
    subtitle: '넷째 날 · Day Four',
    chapter: '창세기 1:14–19',
    dayLabel: '4',
    accent: 'oklch(65% 0.12 290)',
    verses: [
      {
        ref: '1:14',
        hebrew:
          'יְהִי מְאֹרֹת בִּרְקִיעַ הַשָּׁמַיִם לְהַבְדִּיל בֵּין הַיּוֹם וּבֵין הַלָּיְלָה',
        translit:
          "yehi me'orot birkia ha-shamayim l'havdil bein ha-yom u'vein ha-layla",
        korean: '하늘의 궁창에 빛들이 있어 낮과 밤을 나누게 하라',
        highlight: 'מְאֹרֹת',
        highlightMean: '메오로트 · 빛들(광명체)',
      },
      {
        ref: '1:16',
        hebrew: 'וַיַּעַשׂ אֱלֹהִים אֶת־שְׁנֵי הַמְּאֹרֹת הַגְּדֹלִים',
        translit: "vaya'as Elohim et-shnei ha-me'orot ha-gdolim",
        korean: '하나님이 두 큰 빛을 만드셨다 — 해와 달',
        highlight: 'הַגְּדֹלִים',
        highlightMean: '하그돌림 · 큰 것들',
      },
      {
        ref: '1:16b',
        hebrew: 'וְאֵת הַכּוֹכָבִים',
        translit: 've-et ha-kokhavim',
        korean: '그리고 별들도 (만드셨다)',
        highlight: 'הַכּוֹכָבִים',
        highlightMean: '하코카빔 · 별들',
      },
    ],
  },

  // 5. 다섯째 날 - 물고기와 새
  {
    id: 'day5',
    title: 'יוֹם חֲמִישִׁי',
    titleKr: '욤 하미쉬',
    subtitle: '다섯째 날 · Day Five',
    chapter: '창세기 1:20–23',
    dayLabel: '5',
    accent: 'oklch(68% 0.11 200)',
    verses: [
      {
        ref: '1:20',
        hebrew: 'יִשְׁרְצוּ הַמַּיִם שֶׁרֶץ נֶפֶשׁ חַיָּה וְעוֹף יְעוֹפֵף',
        translit:
          "yishretsu ha-mayim sherets nefesh chaya ve-of ye'ofef",
        korean: '물들은 생명있는 것을 번성하게 하고, 새는 땅 위를 날아라',
        highlight: 'נֶפֶשׁ חַיָּה',
        highlightMean: '네페쉬 하야 · 살아있는 혼',
      },
      {
        ref: '1:21',
        hebrew: 'וַיִּבְרָא אֱלֹהִים אֶת־הַתַּנִּינִם הַגְּדֹלִים',
        translit: 'vayivra Elohim et-ha-taninim ha-gdolim',
        korean: '하나님이 큰 바다 짐승들을 창조하셨다',
        highlight: 'הַתַּנִּינִם',
        highlightMean: '하타니님 · 큰 바다생물',
      },
      {
        ref: '1:22',
        hebrew: 'וַיְבָרֶךְ אֹתָם אֱלֹהִים לֵאמֹר פְּרוּ וּרְבוּ',
        translit: 'vayvarekh otam Elohim lemor peru urvu',
        korean: '하나님이 그들에게 복을 주시며 "생육하고 번성하라" 하셨다',
        highlight: 'פְּרוּ וּרְבוּ',
        highlightMean: '프루 우르부 · 생육하고 번성하라',
      },
    ],
  },

  // 6. 여섯째 날 - 짐승과 사람
  {
    id: 'day6',
    title: 'יוֹם הַשִּׁשִּׁי',
    titleKr: '욤 하쉬쉬',
    subtitle: '여섯째 날 · Day Six',
    chapter: '창세기 1:24–31',
    dayLabel: '6',
    accent: 'oklch(58% 0.13 30)',
    verses: [
      {
        ref: '1:24',
        hebrew: 'תּוֹצֵא הָאָרֶץ נֶפֶשׁ חַיָּה לְמִינָהּ',
        translit: "totse ha-aretz nefesh chaya l'minah",
        korean: '땅은 생물을 그 종류대로 내라 — 가축과 기는 것과 땅의 짐승',
        highlight: 'לְמִינָהּ',
        highlightMean: '레미나 · 그 종류대로',
      },
      {
        ref: '1:26',
        hebrew: 'נַעֲשֶׂה אָדָם בְּצַלְמֵנוּ כִּדְמוּתֵנוּ',
        translit: "na'aseh adam b'tsalmenu kidmutenu",
        korean: '우리의 형상을 따라 우리의 모양대로 사람(아담)을 만들자',
        highlight: 'בְּצַלְמֵנוּ',
        highlightMean: '베찰메누 · 우리의 형상으로',
      },
      {
        ref: '1:27',
        hebrew:
          "וַיִּבְרָא אֱלֹהִים אֶת־הָאָדָם בְּצַלְמוֹ ... זָכָר וּנְקֵבָה",
        translit:
          "vayivra Elohim et-ha-adam b'tsalmo ... zakhar u'nekeva",
        korean: '하나님이 사람을 자기 형상대로 창조하시되, 남자와 여자를 창조하셨다',
        highlight: 'זָכָר וּנְקֵבָה',
        highlightMean: '자카르 우네케바 · 남자와 여자',
      },
    ],
  },

  // 7. 일곱째 날 - 안식
  {
    id: 'day7',
    title: 'יוֹם הַשְּׁבִיעִי',
    titleKr: '욤 하쉐비이',
    subtitle: '일곱째 날 · Day Seven',
    chapter: '창세기 2:1–3',
    dayLabel: '7',
    accent: 'oklch(60% 0.09 50)',
    verses: [
      {
        ref: '2:1',
        hebrew: 'וַיְכֻלּוּ הַשָּׁמַיִם וְהָאָרֶץ וְכָל־צְבָאָם',
        translit: "vaykhulu ha-shamayim ve-ha-aretz v'khol-tsva'am",
        korean: '하늘과 땅과 그 모든 군상이 완성되었다',
        highlight: 'וַיְכֻלּוּ',
        highlightMean: '바예쿨루 · 완성되었다',
      },
      {
        ref: '2:2',
        hebrew: 'וַיִּשְׁבֹּת בַּיּוֹם הַשְּׁבִיעִי מִכָּל־מְלַאכְתּוֹ',
        translit: "vayishbot bayom ha-shvi'i mikol-mlakhto",
        korean: '일곱째 날에 그의 모든 일에서 그치셨다(안식하셨다)',
        highlight: 'וַיִּשְׁבֹּת',
        highlightMean: '바이쉬보트 · 안식하셨다 (샤바트의 어근)',
      },
      {
        ref: '2:3',
        hebrew: 'וַיְבָרֶךְ אֱלֹהִים אֶת־יוֹם הַשְּׁבִיעִי וַיְקַדֵּשׁ אֹתוֹ',
        translit:
          "vayvarekh Elohim et-yom ha-shvi'i vaykadesh oto",
        korean: '하나님이 일곱째 날에 복을 주시고 그 날을 거룩하게 하셨다',
        highlight: 'וַיְקַדֵּשׁ',
        highlightMean: '바예카데쉬 · 거룩하게 하셨다',
      },
    ],
  },

  // 8. 결론 I - 핵심 구조
  {
    id: 'structure',
    title: 'הַמִּבְנֶה',
    titleKr: '하미브네',
    subtitle: '창조의 구조 · The Structure',
    chapter: '종합 · Synthesis',
    dayLabel: null,
    accent: 'oklch(55% 0.08 60)',
    structure: true,
    verses: [
      {
        korean: '첫 3일은 공간을 형성하고, 다음 3일은 그 공간을 채운다',
        hebrew: 'תֹהוּ  ←→  מָלֵא',
        translit: 'tohu (형성) ←→ male (채움)',
      },
    ],
  },

  // 9. 결론 II - 반복되는 구절들
  {
    id: 'epilogue',
    title: 'טוֹב מְאֹד',
    titleKr: '토브 메오드',
    subtitle: '매우 좋았다 · Very Good',
    chapter: '창세기 1:31 · 맺음',
    dayLabel: null,
    accent: 'oklch(60% 0.10 50)',
    verses: [
      {
        ref: '1:31',
        hebrew:
          'וַיַּרְא אֱלֹהִים אֶת־כָּל־אֲשֶׁר עָשָׂה וְהִנֵּה־טוֹב מְאֹד',
        translit: "vayar Elohim et-kol-asher asa ve-hineh tov me'od",
        korean: '하나님이 지으신 그 모든 것을 보시니 보시기에 심히 좋았다',
        highlight: 'טוֹב מְאֹד',
        highlightMean: '토브 메오드 · 매우 좋았다',
      },
    ],
    closing: true,
  },
];

// 히브리어 서수 (각 날의 마침 구절에서 사용)
export const HEBREW_ORDINALS = [
  'רִאשׁוֹן',
  'שֵׁנִי',
  'שְׁלִישִׁי',
  'רְבִיעִי',
  'חֲמִישִׁי',
  'שִׁשִּׁי',
  'שְׁבִיעִי',
];

export const KOREAN_ORDINALS = [
  '첫째',
  '둘째',
  '셋째',
  '넷째',
  '다섯째',
  '여섯째',
  '일곱째',
];
