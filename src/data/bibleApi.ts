export interface VerseRange {
  book: number;
  bookName: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export interface RawVerse {
  chapter: number;
  verse: number;
  hebrew: string;
  korean: string;
}

interface BollsVerse {
  pk: number;
  verse: number;
  text: string;
}

const BOOK_MAP: Record<string, { num: number; kr: string }> = {
  genesis: { num: 1, kr: '창세기' },
  gen: { num: 1, kr: '창세기' },
  '창세기': { num: 1, kr: '창세기' },
  '창': { num: 1, kr: '창세기' },
  exodus: { num: 2, kr: '출애굽기' },
  exo: { num: 2, kr: '출애굽기' },
  '출애굽기': { num: 2, kr: '출애굽기' },
  '출': { num: 2, kr: '출애굽기' },
  leviticus: { num: 3, kr: '레위기' },
  lev: { num: 3, kr: '레위기' },
  '레위기': { num: 3, kr: '레위기' },
  numbers: { num: 4, kr: '민수기' },
  num: { num: 4, kr: '민수기' },
  '민수기': { num: 4, kr: '민수기' },
  deuteronomy: { num: 5, kr: '신명기' },
  deut: { num: 5, kr: '신명기' },
  deu: { num: 5, kr: '신명기' },
  '신명기': { num: 5, kr: '신명기' },
  joshua: { num: 6, kr: '여호수아' },
  josh: { num: 6, kr: '여호수아' },
  '여호수아': { num: 6, kr: '여호수아' },
  judges: { num: 7, kr: '사사기' },
  judg: { num: 7, kr: '사사기' },
  '사사기': { num: 7, kr: '사사기' },
  ruth: { num: 8, kr: '룻기' },
  '룻기': { num: 8, kr: '룻기' },
  '1samuel': { num: 9, kr: '사무엘상' },
  '1sam': { num: 9, kr: '사무엘상' },
  '2samuel': { num: 10, kr: '사무엘하' },
  '2sam': { num: 10, kr: '사무엘하' },
  '1kings': { num: 11, kr: '열왕기상' },
  '1kgs': { num: 11, kr: '열왕기상' },
  '2kings': { num: 12, kr: '열왕기하' },
  '2kgs': { num: 12, kr: '열왕기하' },
  isaiah: { num: 23, kr: '이사야' },
  isa: { num: 23, kr: '이사야' },
  '이사야': { num: 23, kr: '이사야' },
  psalms: { num: 27, kr: '시편' },
  psalm: { num: 27, kr: '시편' },
  ps: { num: 27, kr: '시편' },
  '시편': { num: 27, kr: '시편' },
  proverbs: { num: 28, kr: '잠언' },
  prov: { num: 28, kr: '잠언' },
  '잠언': { num: 28, kr: '잠언' },
};

export function parseVerseRange(input: string): VerseRange {
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(
    /^(\S+)\s+(\d+):(\d+)\s*[-\u2013\u2014]\s*(\d+):(\d+)$/
  );
  if (!match)
    throw new Error(
      `잘못된 구절 형식: "${input}"\n예: "Genesis 2:4 - 9:11" 또는 "창세기 2:4 - 9:11"`
    );

  const [, bookStr, startCh, startV, endCh, endV] = match;
  const bookInfo = BOOK_MAP[bookStr];
  if (!bookInfo) throw new Error(`알 수 없는 책 이름: "${bookStr}"`);

  return {
    book: bookInfo.num,
    bookName: bookInfo.kr,
    startChapter: parseInt(startCh),
    startVerse: parseInt(startV),
    endChapter: parseInt(endCh),
    endVerse: parseInt(endV),
  };
}

/** Strip cantillation marks (U+0591-U+05AF) but preserve nikud vowels */
export function stripCantillation(text: string): string {
  return text.replace(/[\u0591-\u05AF]/g, '');
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

export async function fetchBibleVerses(range: VerseRange): Promise<RawVerse[]> {
  const results: RawVerse[] = [];

  for (let ch = range.startChapter; ch <= range.endChapter; ch++) {
    const [hebrewRes, koreanRes] = await Promise.all([
      fetch(`https://bolls.life/get-text/WLC/${range.book}/${ch}/`).then(
        (r) => {
          if (!r.ok) throw new Error(`WLC API 오류: ${r.status} (${ch}장)`);
          return r.json() as Promise<BollsVerse[]>;
        }
      ),
      fetch(`https://bolls.life/get-text/KRV/${range.book}/${ch}/`).then(
        (r) => {
          if (!r.ok) throw new Error(`KRV API 오류: ${r.status} (${ch}장)`);
          return r.json() as Promise<BollsVerse[]>;
        }
      ),
    ]);

    const koreanMap = new Map<number, string>();
    for (const v of koreanRes) {
      koreanMap.set(v.verse, stripHtml(v.text));
    }

    for (const v of hebrewRes) {
      const verseNum = v.verse;
      if (ch === range.startChapter && verseNum < range.startVerse) continue;
      if (ch === range.endChapter && verseNum > range.endVerse) continue;

      results.push({
        chapter: ch,
        verse: verseNum,
        hebrew: stripCantillation(stripHtml(v.text)),
        korean: koreanMap.get(verseNum) || '',
      });
    }
  }

  return results;
}
