// 지원 언어 목록 - 브라우저 실시간 인식(BCP-47) + 서버 전사 + 요약/번역 대상
export interface AramLanguage {
  code: string;   // BCP-47 (Web Speech API)
  short: string;  // ISO 639-1 (STT 서버/요약 언어)
  name: string;   // 한국어 표기
  native: string; // 현지어 표기
}

export const ARAM_LANGUAGES: AramLanguage[] = [
  { code: 'ko-KR', short: 'ko', name: '한국어', native: '한국어' },
  { code: 'en-US', short: 'en', name: '영어(미국)', native: 'English (US)' },
  { code: 'en-GB', short: 'en', name: '영어(영국)', native: 'English (UK)' },
  { code: 'ja-JP', short: 'ja', name: '일본어', native: '日本語' },
  { code: 'zh-CN', short: 'zh', name: '중국어(간체)', native: '中文(简体)' },
  { code: 'zh-TW', short: 'zh', name: '중국어(번체)', native: '中文(繁體)' },
  { code: 'zh-HK', short: 'zh', name: '광둥어', native: '粵語' },
  { code: 'vi-VN', short: 'vi', name: '베트남어', native: 'Tiếng Việt' },
  { code: 'th-TH', short: 'th', name: '태국어', native: 'ไทย' },
  { code: 'id-ID', short: 'id', name: '인도네시아어', native: 'Bahasa Indonesia' },
  { code: 'ms-MY', short: 'ms', name: '말레이어', native: 'Bahasa Melayu' },
  { code: 'fil-PH', short: 'tl', name: '필리핀어', native: 'Filipino' },
  { code: 'hi-IN', short: 'hi', name: '힌디어', native: 'हिन्दी' },
  { code: 'bn-BD', short: 'bn', name: '벵골어', native: 'বাংলা' },
  { code: 'ur-PK', short: 'ur', name: '우르두어', native: 'اردو' },
  { code: 'ta-IN', short: 'ta', name: '타밀어', native: 'தமிழ்' },
  { code: 'mn-MN', short: 'mn', name: '몽골어', native: 'Монгол' },
  { code: 'kk-KZ', short: 'kk', name: '카자흐어', native: 'Қазақ' },
  { code: 'uz-UZ', short: 'uz', name: '우즈베크어', native: 'Oʻzbek' },
  { code: 'ru-RU', short: 'ru', name: '러시아어', native: 'Русский' },
  { code: 'uk-UA', short: 'uk', name: '우크라이나어', native: 'Українська' },
  { code: 'de-DE', short: 'de', name: '독일어', native: 'Deutsch' },
  { code: 'fr-FR', short: 'fr', name: '프랑스어', native: 'Français' },
  { code: 'es-ES', short: 'es', name: '스페인어', native: 'Español' },
  { code: 'es-MX', short: 'es', name: '스페인어(멕시코)', native: 'Español (MX)' },
  { code: 'pt-BR', short: 'pt', name: '포르투갈어(브라질)', native: 'Português (BR)' },
  { code: 'pt-PT', short: 'pt', name: '포르투갈어', native: 'Português' },
  { code: 'it-IT', short: 'it', name: '이탈리아어', native: 'Italiano' },
  { code: 'nl-NL', short: 'nl', name: '네덜란드어', native: 'Nederlands' },
  { code: 'pl-PL', short: 'pl', name: '폴란드어', native: 'Polski' },
  { code: 'cs-CZ', short: 'cs', name: '체코어', native: 'Čeština' },
  { code: 'sk-SK', short: 'sk', name: '슬로바키아어', native: 'Slovenčina' },
  { code: 'hu-HU', short: 'hu', name: '헝가리어', native: 'Magyar' },
  { code: 'ro-RO', short: 'ro', name: '루마니아어', native: 'Română' },
  { code: 'bg-BG', short: 'bg', name: '불가리아어', native: 'Български' },
  { code: 'el-GR', short: 'el', name: '그리스어', native: 'Ελληνικά' },
  { code: 'sv-SE', short: 'sv', name: '스웨덴어', native: 'Svenska' },
  { code: 'no-NO', short: 'no', name: '노르웨이어', native: 'Norsk' },
  { code: 'da-DK', short: 'da', name: '덴마크어', native: 'Dansk' },
  { code: 'fi-FI', short: 'fi', name: '핀란드어', native: 'Suomi' },
  { code: 'tr-TR', short: 'tr', name: '터키어', native: 'Türkçe' },
  { code: 'ar-SA', short: 'ar', name: '아랍어', native: 'العربية' },
  { code: 'ar-AE', short: 'ar', name: '아랍어(UAE)', native: 'العربية (الإمارات)' },
  { code: 'he-IL', short: 'he', name: '히브리어', native: 'עברית' },
  { code: 'fa-IR', short: 'fa', name: '페르시아어', native: 'فارسی' },
  { code: 'sw-KE', short: 'sw', name: '스와힐리어', native: 'Kiswahili' },
  { code: 'af-ZA', short: 'af', name: '아프리칸스어', native: 'Afrikaans' },
  { code: 'hr-HR', short: 'hr', name: '크로아티아어', native: 'Hrvatski' },
  { code: 'sr-RS', short: 'sr', name: '세르비아어', native: 'Српски' },
  { code: 'sl-SI', short: 'sl', name: '슬로베니아어', native: 'Slovenščina' },
  { code: 'lt-LT', short: 'lt', name: '리투아니아어', native: 'Lietuvių' },
  { code: 'lv-LV', short: 'lv', name: '라트비아어', native: 'Latviešu' },
  { code: 'et-EE', short: 'et', name: '에스토니아어', native: 'Eesti' },
  { code: 'ca-ES', short: 'ca', name: '카탈루냐어', native: 'Català' },
];

// 서버 전사에서 언어 자동 감지
export const AUTO_LANGUAGE = 'auto';

export function languageName(code?: string | null): string {
  if (!code || code === AUTO_LANGUAGE) return '자동 감지';
  const found = ARAM_LANGUAGES.find((l) => l.code === code || l.short === code);
  return found ? found.name : code;
}

export function toShortCode(code?: string | null): string | null {
  if (!code || code === AUTO_LANGUAGE) return null;
  return code.split('-')[0].toLowerCase();
}

// 요약·번역 출력 언어 (고유 ISO 코드)
export const OUTPUT_LANGUAGES = ARAM_LANGUAGES.filter(
  (l, i, arr) => arr.findIndex((x) => x.short === l.short) === i
).map((l) => ({ code: l.short, name: l.name.replace(/\(.*\)/, ''), native: l.native.replace(/\s*\(.*\)/, '') }));
