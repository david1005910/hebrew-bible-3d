import type { Scene, Verse } from './scenes';
import type { RawVerse } from './bibleApi';

const ACCENT_COLORS = [
  'oklch(70% 0.13 80)',
  'oklch(65% 0.11 230)',
  'oklch(60% 0.13 145)',
  'oklch(65% 0.12 290)',
  'oklch(68% 0.11 200)',
  'oklch(58% 0.13 30)',
  'oklch(60% 0.09 50)',
  'oklch(55% 0.08 60)',
];

// Common Hebrew function words to skip for highlight detection
const SKIP_WORDS = new Set([
  'אֶת', 'וְ', 'עַל', 'אֶל', 'מִן', 'כִּי', 'אֲשֶׁר',
  'הוּא', 'הִיא', 'הֵם', 'הֵן', 'לֹא', 'גַּם', 'כָּל',
  'בְּ', 'לְ', 'מִ', 'כְּ', 'וַ', 'שֶׁ', 'אֶת־', 'וְאֶת',
]);

export function detectHighlightWord(hebrewText: string): string | undefined {
  const words = hebrewText
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/\u05BE/g, '')); // remove maqaf

  const candidates = words.filter((w) => {
    const base = w.replace(/[\u0591-\u05C7]/g, '');
    return base.length >= 2 && !SKIP_WORDS.has(w);
  });

  if (candidates.length === 0) return undefined;
  return candidates.reduce((a, b) => {
    const aLen = a.replace(/[\u0591-\u05C7]/g, '').length;
    const bLen = b.replace(/[\u0591-\u05C7]/g, '').length;
    return aLen >= bLen ? a : b;
  });
}

// Simple Hebrew → Latin transliteration
const CONSONANT_MAP: Record<string, string> = {
  'א': "'", 'בּ': 'b', 'ב': 'v', 'גּ': 'g', 'ג': 'g',
  'דּ': 'd', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
  'ח': 'ch', 'ט': 't', 'י': 'y', 'כּ': 'k', 'כ': 'kh', 'ך': 'kh',
  'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n',
  'ס': 's', 'ע': "'", 'פּ': 'p', 'פ': 'f', 'ף': 'f',
  'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r',
  'שׁ': 'sh', 'שׂ': 's', 'ש': 'sh', 'תּ': 't', 'ת': 't',
};

const VOWEL_MAP: Record<string, string> = {
  '\u05B0': 'e', '\u05B1': 'e', '\u05B2': 'a', '\u05B3': 'o',
  '\u05B4': 'i', '\u05B5': 'e', '\u05B6': 'e', '\u05B7': 'a',
  '\u05B8': 'a', '\u05B9': 'o', '\u05BA': 'o', '\u05BB': 'u',
  '\u05BC': '',
};

export function transliterate(hebrew: string): string {
  let result = '';
  const chars = [...hebrew];
  for (const ch of chars) {
    if (ch === ' ' || ch === '\u05BE') { result += ' '; continue; }
    if (CONSONANT_MAP[ch]) { result += CONSONANT_MAP[ch]; continue; }
    if (VOWEL_MAP[ch]) { result += VOWEL_MAP[ch]; continue; }
    const code = ch.codePointAt(0) || 0;
    if (code >= 0x0591 && code <= 0x05C7) continue;
    if (code >= 0x05D0 && code <= 0x05EA) {
      result += CONSONANT_MAP[ch] || ch;
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

// Latin transliteration → Korean phonetic approximation
const KR_CV: Record<string, string> = {
  sha: '샤', she: '셰', shi: '시', sho: '쇼', shu: '슈',
  cha: '하', che: '헤', chi: '히', cho: '호', chu: '후',
  tsa: '차', tse: '체', tsi: '치', tso: '초', tsu: '추',
  kha: '하', khe: '헤', khi: '히', kho: '호', khu: '후',
  ba: '바', be: '베', bi: '비', bo: '보', bu: '부',
  ga: '가', ge: '게', gi: '기', go: '고', gu: '구',
  da: '다', de: '데', di: '디', do: '도', du: '두',
  ha: '하', he: '헤', hi: '히', ho: '호', hu: '후',
  va: '바', ve: '베', vi: '비', vo: '보', vu: '부',
  za: '자', ze: '제', zi: '지', zo: '조', zu: '주',
  ta: '타', te: '테', ti: '티', to: '토', tu: '투',
  ya: '야', ye: '예', yi: '이', yo: '요', yu: '유',
  ka: '카', ke: '케', ki: '키', ko: '코', ku: '쿠',
  la: '라', le: '레', li: '리', lo: '로', lu: '루',
  ma: '마', me: '메', mi: '미', mo: '모', mu: '무',
  na: '나', ne: '네', ni: '니', no: '노', nu: '누',
  sa: '사', se: '세', si: '시', so: '소', su: '수',
  ra: '라', re: '레', ri: '리', ro: '로', ru: '루',
  fa: '파', fe: '페', fi: '피', fo: '포', fu: '푸',
  pa: '파', pe: '페', pi: '피', po: '포', pu: '푸',
  a: '아', e: '에', i: '이', o: '오', u: '우',
};
const KR_C: Record<string, string> = {
  b: '브', g: '그', d: '드', h: '흐', v: '브', z: '즈',
  t: '트', k: '크', l: '르', m: '므', n: '느', s: '스',
  r: '르', f: '프', p: '프', y: '이',
};
const MULTI_CONSONANTS = ['sh', 'ch', 'ts', 'kh'];

export function transliterateKorean(hebrew: string): string {
  const latin = transliterate(hebrew).toLowerCase();
  let result = '';
  let i = 0;
  while (i < latin.length) {
    if (latin[i] === ' ') { result += ' '; i++; continue; }
    if (latin[i] === "'") { i++; continue; }

    // detect consonant (try multi-char first)
    let cons = '';
    if (i + 1 < latin.length) {
      const two = latin.substring(i, i + 2);
      if (MULTI_CONSONANTS.includes(two)) { cons = two; i += 2; }
    }
    if (!cons && 'bgdhvztyklmnsrfp'.includes(latin[i])) {
      cons = latin[i]; i++;
    }

    // detect vowel
    if (i < latin.length && 'aeiou'.includes(latin[i])) {
      const key = cons + latin[i];
      result += KR_CV[key] || key;
      i++;
    } else if (cons) {
      result += KR_C[cons] || cons;
    } else if ('aeiou'.includes(latin[i])) {
      result += KR_CV[latin[i]] || latin[i];
      i++;
    } else {
      i++;
    }
  }
  return result;
}

// ── 히브리어-한국어 사전 (니쿠드 제거 후 매칭) ──────────────
function stripNikkud(text: string): string {
  return text.replace(/[\u0591-\u05C7]/g, '').replace(/\u05BE/g, '');
}

// 접두사 + 접미사 제거 후 후보 목록 반환
function rootCandidates(word: string): string[] {
  const results = new Set<string>();
  results.add(word);

  const prefixes = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'א', 'נ', 'י', 'ת'];
  const suffixes = ['ו', 'ה', 'ם', 'ן', 'י', 'ך', 'כם', 'כן', 'הם', 'הן', 'ות', 'ים', 'ית', 'ני', 'נו', 'הו'];

  // 접미사 제거 후보
  const baseWords = [word];
  for (const suf of suffixes) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) {
      baseWords.push(word.slice(0, -suf.length));
    }
  }

  // 각 base에서 접두사 제거
  for (const base of baseWords) {
    results.add(base);
    let cur = base;
    for (let j = 0; j < 3 && cur.length > 2; j++) {
      if (prefixes.includes(cur[0])) {
        cur = cur.substring(1);
        results.add(cur);
      } else break;
    }
  }

  return [...results];
}

const HEB_KR: Record<string, string> = {
  // ── 동사 ──
  'ברא': '창조하다', 'עשה': '만들다', 'אמר': '말씀하다', 'ראה': '보다',
  'קרא': '부르다', 'ברך': '축복하다', 'שבת': '안식하다', 'קדש': '거룩하게 하다',
  'בדל': '나누다', 'יצר': '빚다/짓다', 'נפח': '불어넣다', 'שים': '두다',
  'צוה': '명하다', 'אכל': '먹다', 'מות': '죽다', 'ידע': '알다',
  'שמר': '지키다', 'הלך': '가다', 'שמע': '듣다',
  'נתן': '주다', 'לקח': '취하다', 'בנה': '짓다', 'נפל': '떨어지다',
  'סגר': '닫다', 'עזב': '떠나다', 'דבק': '합하다',
  'ארר': '저주하다', 'שלח': '보내다', 'גרש': '쫓아내다', 'שכן': '거하다',
  'חטא': '범하다', 'רבה': '번성하다', 'מלא': '채우다', 'רדה': '다스리다',
  'כבש': '정복하다', 'שרץ': '번성하다',
  'יצו': '명하셨다', 'תאכל': '먹어라',
  'היה': '있다/되다', 'בוא': '오다', 'יצא': '나가다',
  'עלה': '올라가다', 'ירד': '내려가다', 'שוב': '돌아오다', 'עמד': '서다',
  'ישב': '앉다/거하다', 'שכב': '눕다', 'קום': '일어나다', 'נשא': '들다',
  'שאל': '묻다', 'ענה': '대답하다', 'כתב': '쓰다', 'ספר': '세다/말하다',
  'שכח': '잊다', 'בקש': '찾다', 'מצא': '찾다/발견하다',
  'פתח': '열다', 'חפר': '파다', 'נטע': '심다', 'קצר': '거두다',
  'גדל': '자라다/크다', 'צמח': '싹나다',
  'כסה': '덮다', 'רחף': '감싸다/떠돌다', 'מטר': '비를 내리다',
  'שקה': '물을 대다', 'נבט': '바라보다', 'פנה': '돌아보다',
  'יסף': '더하다', 'חדל': '그치다', 'כלה': '마치다', 'תמם': '완전하다',
  'חשב': '생각하다', 'דמה': '비유하다', 'ירא': '두려워하다',
  'אהב': '사랑하다', 'שנא': '미워하다', 'רצה': '기뻐하다',
  'חנן': '은혜베풀다', 'רחם': '긍휼히여기다', 'סלח': '용서하다',
  'שפט': '심판하다', 'דין': '재판하다', 'נקם': '복수하다',
  'משל': '통치하다', 'עזר': '돕다',
  'נצל': '구하다', 'פדה': '속량하다', 'גאל': '구속하다',
  'קרב': '가까이오다', 'רחק': '멀리하다', 'אסף': '모으다', 'פזר': '흩다',
  'חלק': '나누다', 'בחר': '선택하다', 'מאס': '거부하다',
  'טהר': '정결하다', 'כפר': '속죄하다',
  'שיר': '노래하다', 'הלל': '찬양하다', 'ידה': '감사하다',
  'צעק': '외치다', 'זעק': '부르짖다', 'בכה': '울다', 'שמח': '기뻐하다',
  'נוח': '쉬다', 'רגע': '쉬다/안정하다',
  // 동사 활용형 (자주 등장)
  'ויאמר': '말씀하시다', 'ויעש': '만들다', 'ויברא': '창조하시다',
  'ויקרא': '부르시다', 'ויבדל': '나누시다', 'וירא': '보시다',
  'ויהי': '되다/있다', 'ויתן': '주시다', 'ויברך': '축복하시다',
  'ויכל': '마치시다', 'וישבת': '안식하시다', 'ויקדש': '거룩히하시다',
  'תוצא': '내다', 'יקוו': '모이다', 'תדשא': '풀이나다',
  'ירבו': '번성하라', 'ימלאו': '채우라',
  'נעשה': '만들자', 'ירדו': '다스리게하라',
  // ── 명사 ──
  'אלהים': '하나님', 'יהוה': '여호와', 'אדני': '주님',
  'אדם': '사람/아담', 'אדמה': '땅/흙', 'שמים': '하늘', 'ארץ': '땅',
  'מים': '물', 'אור': '빛', 'חשך': '어둠', 'יום': '날/낮', 'לילה': '밤',
  'רוח': '영/바람', 'נפש': '생명/혼', 'נשמה': '숨/영혼',
  'חיה': '생물/살다', 'בהמה': '가축', 'רמש': '기는것/기다',
  'עץ': '나무', 'פרי': '열매', 'זרע': '씨/뿌리다', 'דשא': '풀',
  'עשב': '채소', 'גן': '동산', 'עדן': '에덴', 'נהר': '강',
  'רקיע': '궁창', 'מאור': '빛/광명체', 'כוכב': '별', 'תנין': '큰바다생물',
  'עוף': '새', 'דג': '물고기', 'דגה': '물고기', 'נחש': '뱀', 'כרוב': '그룹',
  'צלם': '형상', 'דמות': '모양', 'צלע': '갈빗대', 'בשר': '살/육체',
  'עצם': '뼈', 'דם': '피', 'לב': '마음', 'עין': '눈',
  'איש': '남자', 'אשה': '여자', 'זכר': '남성/기억하다', 'נקבה': '여성',
  'אב': '아버지', 'אם': '어머니', 'בן': '아들', 'בת': '딸',
  'אח': '형제', 'אחות': '자매', 'משפחה': '가족',
  'תולדות': '세대/족보', 'ברית': '언약', 'חסד': '인자/은혜',
  'מלאכה': '일/작업', 'מנוחה': '안식/쉼',
  'ערב': '저녁', 'בקר': '아침', 'שמש': '해', 'ירח': '달',
  'תהו': '혼돈', 'בהו': '공허', 'תהום': '깊음',
  'יבשה': '마른 땅', 'כנף': '날개', 'ים': '바다',
  'שדה': '들', 'הר': '산', 'גבעה': '언덕', 'עמק': '골짜기',
  'מדבר': '광야', 'דרך': '길', 'שער': '문', 'חומה': '성벽',
  'עיר': '성/도시', 'בית': '집', 'אהל': '장막',
  'מזבח': '제단', 'היכל': '성전', 'כהן': '제사장', 'נביא': '선지자',
  'מלך': '왕/다스리다', 'שר': '지도자', 'עם': '백성/함께', 'גוי': '민족',
  'עולם': '영원', 'דור': '세대', 'שנה': '해/년', 'חדש': '달/새로운',
  'שבוע': '주간', 'מועד': '절기', 'חג': '축제',
  'כח': '힘', 'גבורה': '용기/능력', 'עז': '강함',
  'חכמה': '지혜', 'בינה': '분별', 'דעת': '지식', 'תורה': '율법/가르침',
  'מצוה': '계명', 'חק': '법령', 'משפט': '공의/심판',
  'צדק': '의', 'צדקה': '의로움', 'אמת': '진리', 'אמונה': '믿음',
  'שלום': '평화', 'חרב': '칼', 'מלחמה': '전쟁',
  'כבוד': '영광', 'שם': '이름', 'דבר': '말씀', 'קול': '소리',
  'פנים': '얼굴', 'יד': '손', 'רגל': '발', 'ראש': '머리',
  'לשון': '혀/언어', 'פה': '입', 'אזן': '귀', 'אף': '코/분노',
  'כתנת': '옷', 'לבוש': '의복', 'לחם': '빵/싸우다',
  'יין': '포도주', 'שמן': '기름', 'מלח': '소금',
  'אש': '불', 'ענן': '구름', 'גשם': '비', 'שלג': '눈(雪)',
  'אבן': '돌', 'עפר': '먼지/흙',
  'זהב': '금', 'כסף': '은', 'נחשת': '놋',
  'עבד': '종/경작하다', 'שפחה': '여종', 'אמה': '여종',
  'צאן': '양떼', 'חמור': '나귀', 'סוס': '말(馬)',
  'ארי': '사자', 'דב': '곰', 'נשר': '독수리', 'יונה': '비둘기',
  'לויתן': '리워야단',
  'מין': '종류', 'למינו': '그 종류대로', 'למינהו': '그 종류대로',
  'כות': '옷(가죽옷)', 'כתנות': '옷들', 'עור': '가죽/피부',
  // ── 형용사/부사 ──
  'טוב': '좋다', 'רע': '악/나쁜', 'חי': '살아있는', 'גדול': '큰',
  'קטן': '작은', 'מאד': '매우', 'אחד': '하나', 'שני': '둘째',
  'ראשון': '첫째', 'שלישי': '셋째', 'רביעי': '넷째',
  'חמישי': '다섯째', 'ששי': '여섯째', 'שביעי': '일곱째',
  'רב': '많은', 'מעט': '적은', 'כל': '모든', 'עוד': '더/아직',
  'ישן': '자다/오래된', 'ישר': '올바른',
  'קדוש': '거룩한', 'טהור': '깨끗한', 'טמא': '부정한',
  'חזק': '강한', 'חלש': '약한', 'יפה': '아름다운',
  'רחב': '넓은', 'צר': '좁은', 'עמוק': '깊은', 'גבוה': '높은',
  // ── 전치사/기능어 ──
  'את': '~을/~를', 'על': '~위에', 'אל': '~에게', 'מן': '~에서',
  'עד': '~까지', 'בין': '사이', 'תחת': '~아래', 'לפני': '~앞에',
  'אחרי': '~뒤에', 'כמו': '~처럼',
  // ── 조합형 ──
  'האדמה': '그 땅', 'השמים': '그 하늘', 'הארץ': '그 땅',
  'המים': '그 물', 'היבשה': '마른 땅', 'הגדלים': '큰 것들',
  'הכוכבים': '별들', 'התנינם': '바다생물들',
  'בצלמנו': '우리 형상으로', 'למינה': '그 종류대로',
  'מהאדמה': '땅으로부터', 'האדם': '그 사람',
  'בראשית': '태초에', 'פני': '표면/얼굴',
  'הרקיע': '그 궁창', 'המאורת': '광명체들', 'הגדל': '큰 것',
  'הקטן': '작은 것',
  // ── 창세기 고유명사 ──
  'חוילה': '하윌라(땅이름)', 'פישון': '비손(강이름)', 'גיחון': '기혼(강이름)',
  'חדקל': '힛데겔(티그리스강)', 'פרת': '유프라테스(강)',
  'כוש': '구스(땅이름)', 'אשור': '앗수르', 'נד': '놋(땅이름)',
  'קין': '카인', 'הבל': '헤벨(아벨)', 'שת': '셋',
  'חנוך': '에녹', 'עירד': '이랏', 'מחויאל': '므후야엘',
  'מתושאל': '므드사엘', 'למך': '레멕', 'עדה': '아다',
  'צלה': '씰라', 'יבל': '야발', 'יובל': '유발',
  'תובל': '두발', 'נעמה': '나아마',
  'אנוש': '에노스', 'קינן': '게난', 'מהללאל': '마할랄엘',
  'מתושלח': '므두셀라', 'נח': '노아',
  'חם': '함', 'יפת': '야펫',
  'תרח': '데라', 'אברם': '아브람', 'אברהם': '아브라함',
  'שרי': '사래', 'שרה': '사라', 'הגר': '하갈',
  'ישמעאל': '이스마엘', 'יצחק': '이삭',
  'רבקה': '리브가', 'יעקב': '야곱', 'עשו': '에서',
  'יוסף': '요셉', 'יהודה': '유다', 'לוי': '레위',
  'ראובן': '르우벤', 'בנימין': '베냐민',
  'משה': '모세', 'אהרן': '아론', 'דוד': '다윗',
  'שלמה': '솔로몬', 'ציון': '시온', 'ירושלם': '예루살렘',
  'בבל': '바벨', 'מצרים': '이집트', 'כנען': '가나안',
  'סדם': '소돔', 'עמרה': '고모라',
  'שנער': '시날(땅이름)', 'אררט': '아라랏',
  'נפלים': '네필림(거인)', 'גלעד': '길르앗',
  // ── 추가 일반 단어 ──
  'סבב': '둘러싸다', 'נהג': '이끌다', 'ענג': '기쁨',
  'בדלח': '브돌라(보석)', 'שהם': '호마노(보석)',
  'נחמה': '위로', 'עצב': '고통/슬픔', 'יגון': '근심',
  'מבול': '홍수', 'תבה': '방주', 'קשת': '무지개',
  'מגדל': '탑', 'לבנה': '벽돌', 'חמר': '역청',
  'שפה': '언어/입술', 'בלל': '혼잡하다',
  'ברכה': '축복', 'קללה': '저주', 'אות': '표시/징조',
  'קנה': '사다/얻다', 'ילד': '아이/낳다',
  'ערום': '벌거벗은', 'תאוה': '탐욕/욕망',
  'חרש': '장인/조용한', 'נגד': '맞은편',
  'פרד': '나뉘다', 'הפך': '뒤집다',
};

function lookupKorean(highlight: string): string | undefined {
  const bare = stripNikkud(highlight);

  // 1차: 접두사/접미사 제거 후보 매칭
  for (const candidate of rootCandidates(bare)) {
    if (HEB_KR[candidate]) return HEB_KR[candidate];
  }

  // 2차: 3글자 어근 추출 시도 (히브리어 어근은 대부분 3자음)
  const consonantsOnly = bare.replace(/[^\u05D0-\u05EA]/g, '');
  if (consonantsOnly.length >= 3) {
    // 앞에서 3글자, 뒤에서 3글자
    const front3 = consonantsOnly.slice(0, 3);
    const back3 = consonantsOnly.slice(-3);
    if (HEB_KR[front3]) return HEB_KR[front3];
    if (HEB_KR[back3]) return HEB_KR[back3];

    // 중간 3글자 (4글자 이상일 때)
    if (consonantsOnly.length >= 4) {
      const mid3 = consonantsOnly.slice(1, 4);
      if (HEB_KR[mid3]) return HEB_KR[mid3];
    }
  }

  // 3차: 2글자 매칭 (짧은 어근)
  if (consonantsOnly.length >= 2) {
    const last2 = consonantsOnly.slice(-2);
    if (HEB_KR[last2]) return HEB_KR[last2];
  }

  return undefined;
}

export interface GeneratedResult {
  scenes: Scene[];
  sceneDurationSeconds: number;
  totalDurationSeconds: number;
  versesPerScene: number;
  totalVerses: number;
}

/**
 * Generate Scene[] from raw Bible verses.
 * Total duration is capped at maxTotalSeconds (default 600 = 10 minutes).
 */
export function generateScenes(
  rawVerses: RawVerse[],
  bookName: string,
  rangeLabel: string,
  maxTotalSeconds = 600
): GeneratedResult {
  const MIN_SCENE_SECONDS = 10;

  // Determine verses per scene to fit within max total
  let versesPerScene = 3;
  let numVerseScenes = Math.ceil(rawVerses.length / versesPerScene);
  let numScenes = numVerseScenes;
  let sceneDuration = maxTotalSeconds / numScenes;

  while (sceneDuration < MIN_SCENE_SECONDS && versesPerScene < 15) {
    versesPerScene++;
    numVerseScenes = Math.ceil(rawVerses.length / versesPerScene);
    numScenes = numVerseScenes;
    sceneDuration = maxTotalSeconds / numScenes;
  }

  sceneDuration = Math.min(sceneDuration, 72);

  const scenes: Scene[] = [];

  // Verse scenes (grouped)
  for (let i = 0; i < rawVerses.length; i += versesPerScene) {
    const group = rawVerses.slice(i, i + versesPerScene);
    const sceneIndex = Math.floor(i / versesPerScene);
    const firstRef = `${group[0].chapter}:${group[0].verse}`;
    const lastRef = group.length > 1
      ? `${group[group.length - 1].chapter}:${group[group.length - 1].verse}`
      : firstRef;
    const titleWords = group[0].hebrew.split(/\s+/).slice(0, 4).join(' ');

    const verses: Verse[] = group.map((rv) => {
      const highlight = detectHighlightWord(rv.hebrew);
      return {
        ref: `${rv.chapter}:${rv.verse}`,
        hebrew: rv.hebrew,
        translit: transliterate(rv.hebrew),
        korean: rv.korean,
        highlight,
        highlightMean: highlight
          ? (() => {
              const kr = transliterateKorean(highlight);
              const mean = lookupKorean(highlight);
              return mean ? `${kr} · ${mean}` : `${kr} · (고유명사)`;
            })()
          : undefined,
      };
    });

    scenes.push({
      id: `verse-${sceneIndex}`,
      title: titleWords,
      titleKr: `${firstRef} – ${lastRef}`,
      subtitle: `${bookName} ${firstRef}–${lastRef}`,
      chapter: `${bookName} ${firstRef}–${lastRef}`,
      dayLabel: null,
      accent: ACCENT_COLORS[(sceneIndex + 1) % ACCENT_COLORS.length],
      verses,
      verseScene: true,
    });
  }

  return {
    scenes,
    sceneDurationSeconds: sceneDuration,
    totalDurationSeconds: sceneDuration * scenes.length,
    versesPerScene,
    totalVerses: rawVerses.length,
  };
}
