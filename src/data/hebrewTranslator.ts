/**
 * AI 기반 히브리어 → 한국어 직역 모듈.
 * OpenAI-compatible API를 사용하여 히브리어 성경 텍스트를 직접 한국어로 번역합니다.
 */

export interface TranslationConfig {
  apiKey: string;
  apiUrl: string; // e.g. "https://api.openai.com/v1/chat/completions"
  model: string;  // e.g. "gpt-4o-mini"
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `당신은 히브리어 성경(구약) 전문 번역가입니다.
히브리어 원문을 한국어로 직역해주세요.

규칙:
1. 히브리어 원문의 의미를 최대한 직역하세요.
2. 기존 한국어 성경 번역(개역개정, 새번역 등)을 참고하지 말고, 히브리어 원문에서 직접 번역하세요.
3. 히브리어 문법 구조를 반영하되, 한국어로 자연스럽게 표현하세요.
4. 고유명사는 히브리어 발음에 가깝게 표기하세요.
5. 간결하고 명확하게 번역하세요.
6. 각 구절의 번역만 출력하세요. 설명이나 주석은 붙이지 마세요.`;

const isAnthropicUrl = (url: string) =>
  url.includes('anthropic.com');

async function callChatApi(
  config: TranslationConfig,
  messages: ChatMessage[],
): Promise<string> {
  if (isAnthropicUrl(config.apiUrl)) {
    return callAnthropicApi(config, messages);
  }
  return callOpenAiApi(config, messages);
}

async function callOpenAiApi(
  config: TranslationConfig,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API 오류 (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropicApi(
  config: TranslationConfig,
  messages: ChatMessage[],
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userMsgs = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      system: systemMsg,
      messages: userMsgs,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API 오류 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data.content?.[0];
  return content?.type === 'text' ? content.text.trim() : '';
}

/**
 * 히브리어 구절들을 배치로 AI 번역합니다.
 * @param verses 히브리어 텍스트 배열 (각 요소: "장:절 히브리어텍스트")
 * @param config API 설정
 * @returns 한국어 번역 배열 (입력과 동일한 순서/길이)
 */
export async function translateHebrewBatch(
  verses: { ref: string; hebrew: string }[],
  config: TranslationConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const BATCH_SIZE = 10; // 한 번에 10절씩
  const results: string[] = [];

  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);

    const userContent = batch
      .map((v, idx) => `[${idx + 1}] (${v.ref}) ${v.hebrew}`)
      .join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `다음 히브리어 성경 구절들을 한국어로 직역해주세요. 각 번호에 맞게 번역만 출력하세요:\n\n${userContent}`,
      },
    ];

    const response = await callChatApi(config, messages);

    // 응답 파싱: [1] 번역... [2] 번역... 형태
    const parsed = parseNumberedResponse(response, batch.length);
    results.push(...parsed);

    onProgress?.(Math.min(i + BATCH_SIZE, verses.length), verses.length);
  }

  return results;
}

function parseNumberedResponse(
  response: string,
  expectedCount: number,
): string[] {
  const lines = response.split('\n').filter((l) => l.trim());
  const results: string[] = [];

  // [1] ... 또는 1. ... 또는 1) ... 형태 파싱
  const numbered = new Map<number, string>();
  for (const line of lines) {
    const match = line.match(/^\s*\[?(\d+)\]?[.):\s]\s*(.+)/);
    if (match) {
      const num = parseInt(match[1]);
      numbered.set(num, match[2].trim());
    }
  }

  for (let i = 1; i <= expectedCount; i++) {
    results.push(numbered.get(i) || lines[i - 1]?.replace(/^\s*\[?\d+\]?[.):\s]\s*/, '').trim() || '');
  }

  return results;
}

// 기본 API 프로필
export const API_PRESETS: {
  name: string;
  apiUrl: string;
  model: string;
}[] = [
  {
    name: 'OpenAI GPT-4o mini',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  {
    name: 'OpenAI GPT-4o',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
  },
  {
    name: 'Anthropic Claude',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5-20250929',
  },
];
