"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic, Upload, FileText, Search, Sparkles, CalendarDays, Clock, Users, ListChecks, AlertTriangle,
  Loader2, ChevronRight, Contact, Share2, UserRound, CalendarClock,
} from "lucide-react";
import AramNav from "./_components/AramNav";
import {
  api, card, btnGhost, fmtDate, fmtDuration, relDay, isOverdue, STATUS_LABEL, SENTIMENT_LABEL, PRIORITY_LABEL,
} from "./_components/utils";

interface HomeData {
  recentMeetings: {
    id: string; title: string; oneLiner: string | null; status: string; startedAt: string; durationSec: number;
    sentiment: string | null; owner: { name: string };
    contacts: { id: string; name: string; company: string | null }[];
    _count: { actionItems: number };
  }[];
  myActions: {
    id: string; title: string; dueDate: string | null; status: string; priority: string;
    meeting: { id: string; title: string } | null; contact: { id: string; name: string } | null;
  }[];
  followUps: {
    id: string; name: string; company: string | null; position: string | null;
    lastContactAt: string | null; nextFollowUpAt: string | null; importance: string;
  }[];
  upcomingEvents: { id: string; title: string; startDate: string; type: string; allDay: boolean }[];
  stats: { meetings: number; thisWeek: number; contacts: number; hours: number; overdue: number };
}

export default function AramHomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<HomeData>("/api/aram/home"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completeAction = async (id: string) => {
    setData((d) => (d ? { ...d, myActions: d.myActions.filter((a) => a.id !== id) } : d));
    try {
      await api(`/api/aram/actions/${id}`, { method: "PATCH", json: { status: "done" } });
    } catch {
      load();
    }
  };

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) router.push(`/aram/ask?q=${encodeURIComponent(question.trim())}`);
  };

  const isEmpty = data && data.stats.meetings === 0 && data.stats.contacts === 0;

  return (
    <div className="max-w-7xl mx-auto">
      <AramNav title="아람" subtitle="모든 대화를 기억하고, 정리하고, 다음 행동으로 잇습니다" />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 sm:p-8 text-white mb-6 shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid lg:grid-cols-[1fr_minmax(0,420px)] gap-6 items-center">
          <div>
            <p className="text-sm font-medium text-white/80 mb-1">아람 — 아람휴비스의 귀</p>
            <h2 className="text-2xl sm:text-3xl font-bold leading-snug break-words">
              만나는 모든 사람과의 대화를<br className="hidden sm:block" /> 회사의 자산으로 쌓으세요
            </h2>
            <p className="text-sm text-white/80 mt-2">녹음 → 화자 구분 전사 → AI 요약·액션·사업 전망 → 캘린더·알림까지 자동으로.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Link href="/aram/record" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-700 font-semibold shadow hover:bg-indigo-50">
                <span className="relative flex w-2.5 h-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-500" />
                </span>
                <Mic className="w-5 h-5" /> 지금 녹음 시작
              </Link>
              <Link href="/aram/record?mode=upload" className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-sm font-medium">
                <Upload className="w-4 h-4" /> 파일 업로드
              </Link>
              <Link href="/aram/record?mode=text" className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-sm font-medium">
                <FileText className="w-4 h-4" /> 텍스트로 기록
              </Link>
            </div>
          </div>
          <form onSubmit={ask} className="bg-white/15 backdrop-blur rounded-2xl p-4">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2"><Sparkles className="w-4 h-4" /> Ask 아람</label>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="예: OO사와의 거래는 어디까지 진행됐어?"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none"
              />
              <button type="submit" className="px-3 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/60" aria-label="질문하기">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/70 mt-2">팀이 쌓은 모든 미팅 기록에서 답을 찾아드립니다.</p>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : error ? (
        <div className={`${card} p-6 text-sm text-rose-600`}>{error}</div>
      ) : data ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <Stat icon={Mic} label="누적 미팅" value={data.stats.meetings.toLocaleString()} />
            <Stat icon={CalendarDays} label="이번 주 미팅" value={data.stats.thisWeek.toLocaleString()} />
            <Stat icon={Clock} label="누적 기록 시간" value={`${data.stats.hours}시간`} />
            <Stat icon={Users} label="명함" value={data.stats.contacts.toLocaleString()} href="/aram/contacts" />
            <Stat icon={AlertTriangle} label="지연된 할 일" value={String(data.stats.overdue)} danger={data.stats.overdue > 0} href="/aram/actions" />
          </div>

          {isEmpty && <Onboarding />}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* 최근 미팅 */}
            <section className={`${card} p-5 lg:col-span-2`}>
              <SectionHeader title="최근 미팅" href="/aram/meetings" />
              {data.recentMeetings.length === 0 ? (
                <Empty text="아직 기록된 미팅이 없습니다. 첫 대화를 녹음해 보세요." />
              ) : (
                <div className="space-y-2">
                  {data.recentMeetings.map((m) => {
                    const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.draft;
                    const se = m.sentiment ? SENTIMENT_LABEL[m.sentiment] : null;
                    return (
                      <Link key={m.id} href={`/aram/meetings/${m.id}`} className="block p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white break-words flex-1 min-w-0">{m.title}</p>
                          {m.status !== "ready" && <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>}
                          {se && <span className={`text-[11px] px-2 py-0.5 rounded-full ${se.cls}`}>{se.label}</span>}
                        </div>
                        {m.oneLiner && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">{m.oneLiner}</p>}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                          <span>{fmtDate(m.startedAt, true)}</span>
                          {m.durationSec > 0 && <span>{fmtDuration(m.durationSec)}</span>}
                          <span>기록 {m.owner.name}</span>
                          {m.contacts.length > 0 && (
                            <span className="flex items-center gap-1"><UserRound className="w-3 h-3" />{m.contacts.map((c) => c.name + (c.company ? `(${c.company})` : "")).join(", ")}</span>
                          )}
                          {m._count.actionItems > 0 && <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" />할 일 {m._count.actionItems}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 내 할 일 */}
            <section className={`${card} p-5`}>
              <SectionHeader title="내 할 일" href="/aram/actions" />
              {data.myActions.length === 0 ? (
                <Empty text="배정된 할 일이 없습니다." />
              ) : (
                <ul className="space-y-1.5">
                  {data.myActions.map((a) => {
                    const overdue = isOverdue(a.dueDate, a.status);
                    const pr = PRIORITY_LABEL[a.priority];
                    return (
                      <li key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <input type="checkbox" onChange={() => completeAction(a.id)} className="mt-1 w-4 h-4 accent-indigo-600" aria-label="완료" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 dark:text-white break-words">{a.title}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5">
                            <span className={overdue ? "text-rose-600 font-medium" : "text-gray-500"}>{relDay(a.dueDate)}</span>
                            {pr && a.priority !== "medium" && <span className={`px-1.5 rounded ${pr.cls}`}>{pr.label}</span>}
                            {a.meeting && <Link href={`/aram/meetings/${a.meeting.id}`} className="text-indigo-600 hover:underline break-words">{a.meeting.title}</Link>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 연락할 사람 */}
            <section className={`${card} p-5`}>
              <SectionHeader title="연락할 사람" href="/aram/contacts" />
              {data.followUps.length === 0 ? (
                <Empty text="팔로업 예정인 사람이 없습니다." />
              ) : (
                <ul className="space-y-1.5">
                  {data.followUps.map((c) => (
                    <li key={c.id}>
                      <Link href={`/aram/contacts/${c.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">{c.name.slice(0, 1)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                            {c.name}
                            {c.importance === "vip" && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">VIP</span>}
                          </p>
                          <p className="text-xs text-gray-500 break-words">{[c.company, c.position].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className="text-xs text-right text-gray-500 shrink-0">
                          {c.nextFollowUpAt ? <span className={isOverdue(c.nextFollowUpAt) ? "text-rose-600" : "text-indigo-600"}>{relDay(c.nextFollowUpAt)}</span> : <>마지막 연락<br />{fmtDate(c.lastContactAt)}</>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 다가오는 일정 */}
            <section className={`${card} p-5 lg:col-span-2`}>
              <SectionHeader title="다가오는 일정 (7일)" href="/calendar" />
              {data.upcomingEvents.length === 0 ? (
                <Empty text="예정된 일정이 없습니다. 마감일이 있는 할 일은 캘린더에 자동 등록됩니다." />
              ) : (
                <ul className="grid sm:grid-cols-2 gap-2">
                  {data.upcomingEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <CalendarClock className={`w-5 h-5 shrink-0 ${e.type === "deadline" ? "text-amber-500" : "text-indigo-500"}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white break-words">{e.title}</p>
                        <p className="text-xs text-gray-500">{relDay(e.startDate)}{!e.allDay && ` · ${new Date(e.startDate).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ icon: Icon, label, value, danger, href }: { icon: React.ElementType; label: string; value: string; danger?: boolean; href?: string }) {
  const body = (
    <div className={`${card} p-4 h-full ${href ? "hover:border-indigo-200" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Icon className={`w-4 h-4 ${danger ? "text-rose-500" : "text-indigo-500"}`} />{label}</div>
      <p className={`text-2xl font-bold ${danger ? "text-rose-600" : "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      <Link href={href} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center">전체 보기<ChevronRight className="w-3.5 h-3.5" /></Link>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{text}</p>;
}

function Onboarding() {
  const steps = [
    { icon: Contact, title: "명함 가져오기", desc: "리멤버 엑셀, vCard, 명함 사진으로 내 인맥을 한 번에 불러오세요.", href: "/aram/contacts?import=1", cta: "명함 가져오기" },
    { icon: Mic, title: "첫 미팅 녹음", desc: "대화를 녹음하면 화자별 전사, 요약, 할 일, 사업 전망이 자동 생성됩니다.", href: "/aram/record", cta: "녹음 시작" },
    { icon: Share2, title: "팀과 공유", desc: "공개 범위를 '우리 팀'·'전사'로 두면 동료와 함께 기록이 자산이 됩니다.", href: "/aram/settings", cta: "공유 방식 보기" },
  ];
  return (
    <div className={`${card} p-5 mb-6`}>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">아람 시작하기</h3>
      <p className="text-sm text-gray-500 mb-4">세 단계만 거치면 아람이 회사의 귀가 됩니다.</p>
      <div className="grid md:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <div key={s.title} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
              <s.icon className="w-4 h-4 text-indigo-600" />
              <p className="font-medium text-gray-900 dark:text-white">{s.title}</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{s.desc}</p>
            <Link href={s.href} className={btnGhost}>{s.cta}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
