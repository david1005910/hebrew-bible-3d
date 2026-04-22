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

// 접두사 제거 후 후보 목록 반환 (ו ה ב ל מ כ ש 등)
function rootCandidates(word: string): string[] {
  const results = [word];
  const prefixes = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש'];
  let cur = word;
  for (let j = 0; j < 3 && cur.length > 2; j++) {
    if (prefixes.includes(cur[0])) {
      cur = cur.substring(1);
      results.push(cur);
    } else break;
  }
  return results;
}

const HEB_KR: Record<string, string> = {
  // 동사
  'ברא': '창조하다', 'עשה': '만들다', 'אמר': '말씀하다', 'ראה': '보다',
  'קרא': '부르다', 'ברך': '축복하다', 'שבת': '안식하다', 'קדש': '거룩하게 하다',
  'בדל': '나누다', 'יצר': '빚다/짓다', 'נפח': '불어넣다', 'שים': '두다',
  'צוה': '명하다', 'אכל': '먹다', 'מות': '죽다', 'ידע': '알다',
  'שמר': '지키다', 'עבד': '경작하다', 'הלך': '가다', 'שמע': '듣다',
  'נתן': '주다', 'לקח': '취하다', 'בנה': '짓다', 'נפל': '떨어지다',
  'ישן': '자다', 'סגר': '닫다', 'עזב': '떠나다', 'דבק': '합하다',
  'ארר': '저주하다', 'שלח': '보내다', 'גרש': '쫓아내다', 'שכן': '거하다',
  'חטא': '범하다', 'רבה': '번성하다', 'מלא': '채우다', 'רדה': '다스리다',
  'כבש': '정복하다', 'רמש': '기다', 'שרץ': '번성하다',
  'יצו': '명하셨다', 'תאכל': '먹어라',
  // 명사
  'אלהים': '하나님', 'יהוה': '여호와', 'אדם': '사람/아담',
  'אדמה': '땅/흙', 'שמים': '하늘', 'ארץ': '땅', 'מים': '물',
  'אור': '빛', 'חשך': '어둠', 'יום': '날/낮', 'לילה': '밤',
  'רוח': '영/바람', 'נפש': '생명/혼', 'חיה': '생물', 'בהמה': '가축',
  'עץ': '나무', 'פרי': '열매', 'זרע': '씨', 'דשא': '풀/싹나다',
  'עשב': '채소', 'גן': '동산', 'עדן': '에덴', 'נהר': '강',
  'רקיע': '궁창', 'מאור': '빛/광명체', 'כוכב': '별', 'תנין': '바다생물',
  'עוף': '새', 'דג': '물고기', 'נחש': '뱀', 'כרוב': '그룹',
  'צלם': '형상', 'דמות': '모양', 'צלע': '갈빗대', 'בשר': '살/육체',
  'עצם': '뼈', 'דם': '피', 'לב': '마음', 'עין': '눈',
  'איש': '남자', 'אשה': '여자', 'זכר': '남성', 'נקבה': '여성',
  'אב': '아버지', 'אם': '어머니', 'בן': '아들', 'בת': '딸',
  'תולדות': '세대/족보', 'ברית': '언약', 'חסד': '인자/은혜',
  'מלאכה': '일/작업', 'מנוחה': '안식/쉼',
  'ערב': '저녁', 'בקר': '아침', 'שמש': '해', 'ירח': '달',
  'טוב': '좋다', 'רע': '악/나쁜', 'חי': '살아있는', 'גדול': '큰',
  'קטן': '작은', 'מאד': '매우', 'אחד': '하나', 'שני': '둘째',
  'תהו': '혼돈', 'בהו': '공허', 'תהום': '깊음',
  'יבשה': '마른 땅', 'כנף': '날개',
  // 자주 등장하는 조합형
  'האדמה': '그 땅', 'השמים': '그 하늘', 'הארץ': '그 땅',
  'המים': '그 물', 'היבשה': '마른 땅', 'הגדלים': '큰 것들',
  'הכוכבים': '별들', 'התנינם': '바다생물들',
  'בצלמנו': '우리 형상으로', 'למינה': '그 종류대로',
  'מהאדמה': '땅으로부터', 'האדם': '그 사람',
};

function lookupKorean(highlight: string): string | undefined {
  const bare = stripNikkud(highlight);
  for (const candidate of rootCandidates(bare)) {
    if (HEB_KR[candidate]) return HEB_KR[candidate];
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
              return mean ? `${kr} · ${mean}` : kr;
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
