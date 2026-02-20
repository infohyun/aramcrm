// ─── 한국, 미국, 프랑스 공휴일 데이터 ────────────────────────────────
// 음력 기반 휴일은 연도별로 하드코딩 (2024~2030)
// 부활절 기반 휴일은 computus 알고리즘으로 계산

export interface Holiday {
  date: string; // YYYY-MM-DD
  title: string;
  country: "KR" | "US" | "FR";
  countryLabel: string;
}

const COUNTRY_LABEL: Record<string, string> = {
  KR: "🇰🇷",
  US: "🇺🇸",
  FR: "🇫🇷",
};

// ─── 부활절 계산 (Anonymous Gregorian algorithm) ─────────────────────
function computeEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// ─── N번째 요일 계산 (예: 1월 3번째 월요일) ─────────────────────────
function nthWeekday(
  year: number,
  month: number, // 1-indexed
  weekday: number, // 0=Sun, 1=Mon, ...
  n: number
): string {
  const first = new Date(year, month - 1, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  const day = 1 + diff + (n - 1) * 7;
  return fmt(year, month, day);
}

// ─── 마지막 N요일 계산 ──────────────────────────────────────────────
function lastWeekday(
  year: number,
  month: number,
  weekday: number
): string {
  const last = new Date(year, month, 0); // last day of month
  const diff = (last.getDay() - weekday + 7) % 7;
  const day = last.getDate() - diff;
  return fmt(year, month, day);
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── 한국 음력 공휴일 (연도별 양력 변환) ────────────────────────────
// 설날(음력 1/1), 석가탄신일(음력 4/8), 추석(음력 8/15)
// 설날: 전날, 당일, 다음날 / 추석: 전날, 당일, 다음날
const KOREAN_LUNAR_HOLIDAYS: Record<number, { seollal: string; buddha: string; chuseok: string }> = {
  2024: { seollal: "2024-02-10", buddha: "2024-05-15", chuseok: "2024-09-17" },
  2025: { seollal: "2025-01-29", buddha: "2025-05-05", chuseok: "2025-10-06" },
  2026: { seollal: "2026-02-17", buddha: "2026-05-24", chuseok: "2026-09-25" },
  2027: { seollal: "2027-02-07", buddha: "2027-05-13", chuseok: "2027-09-15" },
  2028: { seollal: "2028-01-27", buddha: "2028-05-02", chuseok: "2028-10-03" },
  2029: { seollal: "2029-02-13", buddha: "2029-05-20", chuseok: "2029-09-22" },
  2030: { seollal: "2030-02-03", buddha: "2030-05-09", chuseok: "2030-09-12" },
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// ─── 연도별 공휴일 생성 ─────────────────────────────────────────────

function getKoreanHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  const c = "KR" as const;
  const cl = COUNTRY_LABEL.KR;

  // 고정 공휴일
  holidays.push({ date: fmt(year, 1, 1), title: `${cl} 신정`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 3, 1), title: `${cl} 삼일절`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 5, 5), title: `${cl} 어린이날`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 6, 6), title: `${cl} 현충일`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 8, 15), title: `${cl} 광복절`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 10, 3), title: `${cl} 개천절`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 10, 9), title: `${cl} 한글날`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 12, 25), title: `${cl} 크리스마스`, country: c, countryLabel: cl });

  // 음력 기반 공휴일
  const lunar = KOREAN_LUNAR_HOLIDAYS[year];
  if (lunar) {
    // 설날 연휴 (전날, 당일, 다음날)
    holidays.push({ date: addDays(lunar.seollal, -1), title: `${cl} 설날 연휴`, country: c, countryLabel: cl });
    holidays.push({ date: lunar.seollal, title: `${cl} 설날`, country: c, countryLabel: cl });
    holidays.push({ date: addDays(lunar.seollal, 1), title: `${cl} 설날 연휴`, country: c, countryLabel: cl });

    // 석가탄신일
    holidays.push({ date: lunar.buddha, title: `${cl} 부처님오신날`, country: c, countryLabel: cl });

    // 추석 연휴 (전날, 당일, 다음날)
    holidays.push({ date: addDays(lunar.chuseok, -1), title: `${cl} 추석 연휴`, country: c, countryLabel: cl });
    holidays.push({ date: lunar.chuseok, title: `${cl} 추석`, country: c, countryLabel: cl });
    holidays.push({ date: addDays(lunar.chuseok, 1), title: `${cl} 추석 연휴`, country: c, countryLabel: cl });
  }

  return holidays;
}

function getUSHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  const c = "US" as const;
  const cl = COUNTRY_LABEL.US;

  // New Year's Day
  holidays.push({ date: fmt(year, 1, 1), title: `${cl} New Year's Day`, country: c, countryLabel: cl });
  // MLK Day (3rd Monday of January)
  holidays.push({ date: nthWeekday(year, 1, 1, 3), title: `${cl} Martin Luther King Jr. Day`, country: c, countryLabel: cl });
  // Presidents' Day (3rd Monday of February)
  holidays.push({ date: nthWeekday(year, 2, 1, 3), title: `${cl} Presidents' Day`, country: c, countryLabel: cl });
  // Memorial Day (last Monday of May)
  holidays.push({ date: lastWeekday(year, 5, 1), title: `${cl} Memorial Day`, country: c, countryLabel: cl });
  // Juneteenth
  holidays.push({ date: fmt(year, 6, 19), title: `${cl} Juneteenth`, country: c, countryLabel: cl });
  // Independence Day
  holidays.push({ date: fmt(year, 7, 4), title: `${cl} Independence Day`, country: c, countryLabel: cl });
  // Labor Day (1st Monday of September)
  holidays.push({ date: nthWeekday(year, 9, 1, 1), title: `${cl} Labor Day`, country: c, countryLabel: cl });
  // Columbus Day (2nd Monday of October)
  holidays.push({ date: nthWeekday(year, 10, 1, 2), title: `${cl} Columbus Day`, country: c, countryLabel: cl });
  // Veterans Day
  holidays.push({ date: fmt(year, 11, 11), title: `${cl} Veterans Day`, country: c, countryLabel: cl });
  // Thanksgiving (4th Thursday of November)
  holidays.push({ date: nthWeekday(year, 11, 4, 4), title: `${cl} Thanksgiving`, country: c, countryLabel: cl });
  // Christmas
  holidays.push({ date: fmt(year, 12, 25), title: `${cl} Christmas Day`, country: c, countryLabel: cl });

  return holidays;
}

function getFrenchHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  const c = "FR" as const;
  const cl = COUNTRY_LABEL.FR;

  // 고정 공휴일
  holidays.push({ date: fmt(year, 1, 1), title: `${cl} Jour de l'An`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 5, 1), title: `${cl} Fête du Travail`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 5, 8), title: `${cl} Victoire 1945`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 7, 14), title: `${cl} Fête Nationale`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 8, 15), title: `${cl} Assomption`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 11, 1), title: `${cl} Toussaint`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 11, 11), title: `${cl} Armistice 1918`, country: c, countryLabel: cl });
  holidays.push({ date: fmt(year, 12, 25), title: `${cl} Noël`, country: c, countryLabel: cl });

  // 부활절 기반 공휴일
  const easter = computeEaster(year);
  const easterStr = fmt(year, easter.month, easter.day);

  // Lundi de Pâques (Easter Monday = Easter + 1)
  holidays.push({ date: addDays(easterStr, 1), title: `${cl} Lundi de Pâques`, country: c, countryLabel: cl });
  // Ascension (Easter + 39)
  holidays.push({ date: addDays(easterStr, 39), title: `${cl} Ascension`, country: c, countryLabel: cl });
  // Lundi de Pentecôte (Whit Monday = Easter + 50)
  holidays.push({ date: addDays(easterStr, 50), title: `${cl} Lundi de Pentecôte`, country: c, countryLabel: cl });

  return holidays;
}

// ─── Public API ─────────────────────────────────────────────────────

export function getHolidaysForYear(year: number): Holiday[] {
  return [
    ...getKoreanHolidays(year),
    ...getUSHolidays(year),
    ...getFrenchHolidays(year),
  ];
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  // month: 0-indexed (0=January)
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return getHolidaysForYear(year).filter((h) => h.date.startsWith(prefix));
}

/**
 * 특정 기간의 공휴일을 CalendarEvent 형태로 반환
 * 캘린더 컴포넌트에서 바로 사용 가능
 */
export function getHolidayEvents(year: number, month: number) {
  // 이전달, 현재달, 다음달 커버
  const holidays = [
    ...getHolidaysForMonth(year, month - 1 < 0 ? 11 : month - 1),
    ...getHolidaysForMonth(year, month),
    ...getHolidaysForMonth(year, month + 1 > 11 ? 0 : month + 1),
  ];

  // 연도 경계 처리
  if (month === 0) {
    holidays.push(...getHolidaysForMonth(year - 1, 11));
  }
  if (month === 11) {
    holidays.push(...getHolidaysForMonth(year + 1, 0));
  }

  return holidays.map((h, i) => ({
    id: `holiday-${h.country}-${h.date}-${i}`,
    title: h.title,
    description: null,
    type: "holiday" as const,
    startDate: h.date + "T00:00:00",
    endDate: h.date + "T23:59:59",
    allDay: true,
    location: null,
    color: null,
    isHoliday: true,
    country: h.country,
    creator: { id: "system", name: "시스템", department: null },
    attendees: [],
  }));
}
