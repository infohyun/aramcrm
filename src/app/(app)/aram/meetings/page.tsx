"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Loader2, FileAudio, UserRound, ListChecks, MessageSquare, FolderKanban, Globe, Clock, ChevronLeft, ChevronRight, Lock, Users, Building2 } from "lucide-react";
import AramNav from "../_components/AramNav";
import { useDebounce } from "@/hooks/useDebounce";
import { languageName } from "@/lib/aram/languages";
import { api, card, btnPrimary, btnGhost, input, fmtDate, fmtDuration, STATUS_LABEL, SENTIMENT_LABEL, MEETING_TYPES } from "../_components/utils";

interface MeetingRow {
  id: string; title: string; oneLiner: string | null; status: string; source: string; meetingType: string; visibility: string;
  startedAt: string; durationSec: number; sentiment: string | null; topics: string | null; detectedLanguages: string | null; language: string | null;
  owner: { id: string; name: string };
  project: { id: string; name: string } | null;
  contacts: { id: string; name: string; company: string | null }[];
  _count: { actionItems: number; segments: number; comments: number };
}

interface ListResponse {
  data: MeetingRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const SCOPES = [
  { value: "", label: "전체" },
  { value: "mine", label: "내 미팅" },
  { value: "shared", label: "공유받은" },
];

const VIS_ICON: Record<string, React.ElementType> = { private: Lock, team: Users, company: Building2 };

function groupLabel(d: string): string {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86400000;
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return "이번 주";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
}

export default function MeetingsPage() {
  const [q, setQ] = useState("");
  const debounced = useDebounce(q, 350);
  const [scope, setScope] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<ListResponse | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");

  // 검색어·범위가 바뀌면 1페이지로
  const [filterKey, setFilterKey] = useState("");
  const currentFilter = `${debounced}|${scope}`;
  if (filterKey !== currentFilter) {
    setFilterKey(currentFilter);
    setPage(1);
  }

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debounced.trim()) params.set("q", debounced.trim());
  if (scope) params.set("scope", scope);
  const queryKey = params.toString();
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    let cancelled = false;
    api<ListResponse>(`/api/aram/meetings?${queryKey}`)
      .then((r) => { if (!cancelled) { setRes(r); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "불러오기 실패"); })
      .finally(() => { if (!cancelled) setLoadedKey(queryKey); });
    return () => { cancelled = true; };
  }, [queryKey]);

  const groups = useMemo(() => {
    const map = new Map<string, MeetingRow[]>();
    for (const m of res?.data ?? []) {
      const key = groupLabel(m.startedAt);
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [res]);

  return (
    <div className="max-w-6xl mx-auto">
      <AramNav
        title="미팅 노트"
        subtitle="모든 대화의 전사·요약·결정·할 일이 여기에 쌓입니다"
        actions={<Link href="/aram/record" className={btnPrimary}><Plus className="w-4 h-4" />새 미팅</Link>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목, 요약, 전사문, 참석자, 회사로 검색" className={`${input} pl-9`} />
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {SCOPES.map((s) => (
            <button key={s.value} onClick={() => setScope(s.value)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${scope === s.value ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !res ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : error ? (
        <div className={`${card} p-6 text-sm text-rose-600`}>{error}</div>
      ) : !res || res.data.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">{debounced ? "검색 결과가 없습니다." : "아직 미팅 기록이 없습니다."}</p>
          {!debounced && <Link href="/aram/record" className={btnPrimary}><Plus className="w-4 h-4" />첫 미팅 기록하기</Link>}
        </div>
      ) : (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          <p className="text-xs text-gray-500">총 {res.pagination.total.toLocaleString()}건</p>
          {groups.map(([label, items]) => (
            <section key={label}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">{label}</h2>
              <div className="space-y-2">
                {items.map((m) => <MeetingCard key={m.id} m={m} />)}
              </div>
            </section>
          ))}

          {res.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" />이전</button>
              <span className="text-sm text-gray-600">{page} / {res.pagination.totalPages}</span>
              <button className={btnGhost} disabled={page >= res.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>다음<ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingCard({ m }: { m: MeetingRow }) {
  const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.draft;
  const se = m.sentiment ? SENTIMENT_LABEL[m.sentiment] : null;
  const VisIcon = VIS_ICON[m.visibility] ?? Users;
  const type = MEETING_TYPES.find((t) => t.value === m.meetingType)?.label;
  const langs = (m.detectedLanguages || "").split(",").filter(Boolean);
  const topics = (m.topics || "").split(",").filter(Boolean).slice(0, 4);

  return (
    <Link href={`/aram/meetings/${m.id}`} className={`${card} block p-4 hover:border-indigo-300 hover:shadow-sm transition`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white break-words">{m.title}</p>
          {m.oneLiner && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">{m.oneLiner}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          {se && <span className={`text-[11px] px-2 py-0.5 rounded-full ${se.cls}`}>{se.label}</span>}
        </div>
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {topics.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">#{t.trim()}</span>)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-500">
        <span>{fmtDate(m.startedAt, true)}</span>
        {m.durationSec > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(m.durationSec)}</span>}
        {type && <span>{type}</span>}
        <span className="flex items-center gap-1"><VisIcon className="w-3 h-3" />{m.owner.name}</span>
        {m.contacts.length > 0 && (
          <span className="flex items-center gap-1 break-words"><UserRound className="w-3 h-3" />{m.contacts.slice(0, 3).map((c) => c.name + (c.company ? `(${c.company})` : "")).join(", ")}{m.contacts.length > 3 && ` 외 ${m.contacts.length - 3}명`}</span>
        )}
        {m.project && <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" />{m.project.name}</span>}
        {langs.length > 0 && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{langs.map((l) => languageName(l)).join(", ")}</span>}
        {m._count.actionItems > 0 && <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" />{m._count.actionItems}</span>}
        {m._count.comments > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{m._count.comments}</span>}
      </div>
    </Link>
  );
}
