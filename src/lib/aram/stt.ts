// 음성 → 텍스트 (서버 전사) - 화자 분리 + 다국어 자동 감지
// 우선순위: Deepgram(화자 분리 지원) → OpenAI Whisper → (없으면 브라우저 실시간 전사 결과 사용)

export interface SttSegment {
  speaker: string; // 원본 화자 라벨
  startMs: number;
  endMs: number;
  text: string;
  language?: string | null;
}

export interface SttResult {
  provider: 'deepgram' | 'openai';
  segments: SttSegment[];
  languages: string[];
  durationSec: number;
  diarized: boolean;
}

export type SttProvider = 'deepgram' | 'openai' | 'browser';

export function availableSttProvider(): SttProvider {
  if (process.env.DEEPGRAM_API_KEY) return 'deepgram';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'browser';
}

interface DeepgramUtterance {
  start: number;
  end: number;
  transcript: string;
  speaker?: number;
  languages?: string[];
}

async function transcribeDeepgram(audio: Buffer, mimeType: string, language: string | null, glossary: string[]): Promise<SttResult> {
  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL || 'nova-3',
    diarize: 'true',
    utterances: 'true',
    smart_format: 'true',
    punctuate: 'true',
  });
  // 언어 미지정 시 다국어(코드 스위칭) 모드
  params.set('language', language || 'multi');
  for (const term of glossary.slice(0, 100)) params.append('keyterm', term);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      'Content-Type': mimeType || 'audio/webm',
    },
    body: new Uint8Array(audio),
  });
  if (!res.ok) {
    throw new Error(`Deepgram 전사 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const utterances: DeepgramUtterance[] = data?.results?.utterances ?? [];
  const languages = new Set<string>();
  const detected = data?.results?.channels?.[0]?.detected_language;
  if (detected) languages.add(detected);

  const segments: SttSegment[] = utterances
    .filter((u) => u.transcript?.trim())
    .map((u) => {
      const lang = u.languages?.[0] ?? detected ?? language ?? null;
      if (lang) languages.add(lang);
      return {
        speaker: `화자 ${(u.speaker ?? 0) + 1}`,
        startMs: Math.round(u.start * 1000),
        endMs: Math.round(u.end * 1000),
        text: u.transcript.trim(),
        language: lang,
      };
    });

  return {
    provider: 'deepgram',
    segments,
    languages: [...languages],
    durationSec: Math.round(data?.metadata?.duration ?? 0),
    diarized: true,
  };
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

async function transcribeOpenAI(audio: Buffer, mimeType: string, fileName: string, language: string | null, glossary: string[]): Promise<SttResult> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType || 'audio/webm' }), fileName);
  form.append('model', process.env.OPENAI_STT_MODEL || 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  if (language) form.append('language', language);
  if (glossary.length) form.append('prompt', `용어: ${glossary.slice(0, 60).join(', ')}`);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Whisper 전사 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const segs: WhisperSegment[] = data.segments ?? [];
  const lang = data.language ?? language ?? null;
  return {
    provider: 'openai',
    segments: (segs.length ? segs : [{ start: 0, end: data.duration ?? 0, text: data.text ?? '' }])
      .filter((s) => s.text?.trim())
      .map((s) => ({
        speaker: '화자 1',
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text.trim(),
        language: lang,
      })),
    languages: lang ? [lang] : [],
    durationSec: Math.round(data.duration ?? 0),
    diarized: false,
  };
}

export async function transcribeAudio(params: {
  audio: Buffer;
  mimeType: string;
  fileName: string;
  language: string | null; // ISO 639-1 또는 null(자동)
  glossary: string[];
}): Promise<SttResult | null> {
  const provider = availableSttProvider();
  if (provider === 'deepgram') {
    return transcribeDeepgram(params.audio, params.mimeType, params.language, params.glossary);
  }
  if (provider === 'openai') {
    return transcribeOpenAI(params.audio, params.mimeType, params.fileName, params.language, params.glossary);
  }
  return null;
}
