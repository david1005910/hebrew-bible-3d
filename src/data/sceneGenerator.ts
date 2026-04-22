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
  let numScenes = numVerseScenes + 2; // +prologue +epilogue
  let sceneDuration = maxTotalSeconds / numScenes;

  while (sceneDuration < MIN_SCENE_SECONDS && versesPerScene < 15) {
    versesPerScene++;
    numVerseScenes = Math.ceil(rawVerses.length / versesPerScene);
    numScenes = numVerseScenes + 2;
    sceneDuration = maxTotalSeconds / numScenes;
  }

  sceneDuration = Math.min(sceneDuration, 72);

  const scenes: Scene[] = [];

  // 1. Prologue (rendered as DayScene — not the hardcoded PrologueScene)
  const firstVerse = rawVerses[0];
  const firstWords = firstVerse.hebrew.split(/\s+/).slice(0, 3).join(' ');
  scenes.push({
    id: 'dynamic-prologue',
    title: firstWords,
    titleKr: bookName,
    subtitle: rangeLabel,
    chapter: '序 · Prologue',
    dayLabel: null,
    accent: ACCENT_COLORS[0],
    verses: [{
      hebrew: firstVerse.hebrew,
      translit: transliterate(firstVerse.hebrew),
      korean: firstVerse.korean,
    }],
    verseScene: true,
  });

  // 2. Verse scenes (grouped)
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
        highlightMean: highlight ? transliterateKorean(highlight) : undefined,
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

  // 3. Epilogue (rendered as DayScene — not the hardcoded ClosingScene)
  const lastVerse = rawVerses[rawVerses.length - 1];
  const lastHighlight = detectHighlightWord(lastVerse.hebrew);
  scenes.push({
    id: 'dynamic-epilogue',
    title: lastVerse.hebrew.split(/\s+/).slice(0, 3).join(' '),
    titleKr: '마침',
    subtitle: `${bookName} — 마침`,
    chapter: `${bookName} · 맺음`,
    dayLabel: null,
    accent: ACCENT_COLORS[7 % ACCENT_COLORS.length],
    verses: [{
      ref: `${lastVerse.chapter}:${lastVerse.verse}`,
      hebrew: lastVerse.hebrew,
      translit: transliterate(lastVerse.hebrew),
      korean: lastVerse.korean,
      highlight: lastHighlight,
      highlightMean: lastHighlight ? transliterate(lastHighlight) : undefined,
    }],
    verseScene: true,
  });

  return {
    scenes,
    sceneDurationSeconds: sceneDuration,
    totalDurationSeconds: sceneDuration * scenes.length,
    versesPerScene,
    totalVerses: rawVerses.length,
  };
}
