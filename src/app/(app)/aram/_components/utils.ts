// 아람 클라이언트 공용 유틸

export function fmtDuration(sec: number): string {
  if (!sec) return "0분";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}시간 ${m}분`;
  if (m) return `${m}분${s && m < 10 ? ` ${s}초` : ""}`;
  return `${s}초`;
}

export function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function fmtDate(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function relDay(d: string | Date | null | undefined): string {
  if (!d) return "기한 없음";
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === -1) return "어제";
  if (diff < 0) return `${-diff}일 지남`;
  if (diff < 7) return `${diff}일 후`;
  return fmtDate(d);
}

export function isOverdue(d: string | Date | null | undefined, status?: string): boolean {
  if (!d || status === "done" || status === "cancelled") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(d) < today;
}

export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "초안", cls: "bg-gray-100 text-gray-600" },
  recording: { label: "녹음 중", cls: "bg-red-100 text-red-600" },
  transcribing: { label: "전사 중", cls: "bg-amber-100 text-amber-700" },
  analyzing: { label: "AI 분석 중", cls: "bg-violet-100 text-violet-700" },
  ready: { label: "완료", cls: "bg-emerald-100 text-emerald-700" },
  failed: { label: "실패", cls: "bg-rose-100 text-rose-700" },
};

export const SENTIMENT_LABEL: Record<string, { label: string; cls: string }> = {
  positive: { label: "긍정적", cls: "bg-emerald-50 text-emerald-700" },
  neutral: { label: "중립", cls: "bg-gray-100 text-gray-600" },
  negative: { label: "부정적", cls: "bg-rose-50 text-rose-700" },
  mixed: { label: "혼재", cls: "bg-amber-50 text-amber-700" },
};

export const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  urgent: { label: "긴급", cls: "bg-rose-100 text-rose-700" },
  high: { label: "높음", cls: "bg-orange-100 text-orange-700" },
  medium: { label: "보통", cls: "bg-blue-50 text-blue-700" },
  low: { label: "낮음", cls: "bg-gray-100 text-gray-600" },
};

export const MEETING_TYPES = [
  { value: "in_person", label: "대면 미팅" },
  { value: "phone", label: "전화 통화" },
  { value: "online", label: "화상 회의" },
  { value: "internal", label: "사내 회의" },
  { value: "interview", label: "인터뷰" },
];

export const VISIBILITY = [
  { value: "private", label: "나만 보기" },
  { value: "team", label: "우리 팀" },
  { value: "company", label: "전사 공유" },
];

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    ...(init?.json !== undefined
      ? { body: JSON.stringify(init.json), headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }
      : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `요청 실패 (${res.status})`);
  return data as T;
}

export const card = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed";
export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50";
export const input =
  "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";
