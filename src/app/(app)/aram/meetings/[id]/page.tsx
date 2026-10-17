"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Loader2, FileText, ListChecks, TrendingUp, Languages, Mail, MessageCircleQuestion, MessageSquare,
} from "lucide-react";
import AramNav from "../../_components/AramNav";
import { api, card } from "../../_components/utils";
import type { Meeting, ProjectLite, UserLite } from "./_components/types";
import MeetingHeader from "./_components/MeetingHeader";
import TranscriptPanel from "./_components/TranscriptPanel";
import { SummaryTab, OutlookTab } from "./_components/SummaryTabs";
import ActionsTab from "./_components/ActionsTab";
import { TranslateTab, EmailTab, AskTab, NotesTab } from "./_components/MoreTabs";

type TabId = "summary" | "actions" | "outlook" | "translate" | "email" | "ask" | "notes";

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("summary");
  const [users, setUsers] = useState<UserLite[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);

  const load = useCallback(async () => {
    try {
      setMeeting(await api<Meeting>(`/api/aram/meetings/${id}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "미팅을 불러오지 못했습니다.");
    }
  }, [id]);

  useEffect(() => {
    api<Meeting>(`/api/aram/meetings/${id}`)
      .then(setMeeting)
      .catch((e) => setError(e instanceof Error ? e.message : "미팅을 불러오지 못했습니다."));
    api<UserLite[]>("/api/users").then(setUsers).catch(() => {});
    api<{ data: ProjectLite[] }>("/api/projects?limit=100").then((r) => setProjects(r.data ?? [])).catch(() => {});
  }, [id]);

  // 전사·분석 진행 중이면 폴링
  const processing = meeting?.status === "transcribing" || meeting?.status === "analyzing" || meeting?.status === "recording";
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [processing, load]);

  const patch = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await api(`/api/aram/meetings/${id}`, { method: "PATCH", json: data });
        await load();
      } catch (e) {
        alert(e instanceof Error ? e.message : "저장 실패");
      }
    },
    [id, load]
  );

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <AramNav title="미팅 노트" />
        <div className={`${card} p-10 text-center`}>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link href="/aram/meetings" className="text-indigo-600 text-sm">← 미팅 목록으로</Link>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const isOwner = meeting.ownerId === session?.user?.id || (session?.user as { role?: string } | undefined)?.role === "admin";
  const openActions = meeting.actionItems.filter((a) => a.status !== "done" && a.status !== "cancelled").length;

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "summary", label: "요약", icon: FileText },
    { id: "actions", label: "할 일", icon: ListChecks, badge: openActions },
    { id: "outlook", label: "사업 전망", icon: TrendingUp },
    { id: "translate", label: "번역", icon: Languages },
    { id: "email", label: "후속 이메일", icon: Mail },
    { id: "ask", label: "Ask", icon: MessageCircleQuestion },
    { id: "notes", label: "메모·댓글", icon: MessageSquare, badge: meeting.comments.length },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      <AramNav title="미팅 노트" subtitle="전사 · 요약 · 할 일 · 사업 전망" />
      <Link href="/aram/meetings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft className="w-4 h-4" /> 목록
      </Link>

      <MeetingHeader meeting={meeting} projects={projects} isOwner={isOwner} onChange={load} patch={patch} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <TranscriptPanel meeting={meeting} onChange={load} />
        </div>
        <div className={`${card} lg:col-span-3 order-1 lg:order-2 min-w-0`}>
          <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700 px-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap border-b-2 -mb-px ${
                  tab === t.id
                    ? "border-indigo-600 text-indigo-700 dark:text-indigo-300 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {!!t.badge && <span className="ml-0.5 px-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px]">{t.badge}</span>}
              </button>
            ))}
          </div>
          <div className="p-5">
            {tab === "summary" && <SummaryTab meeting={meeting} patch={patch} />}
            {tab === "actions" && <ActionsTab meeting={meeting} users={users} projects={projects} onChange={load} />}
            {tab === "outlook" && <OutlookTab meeting={meeting} patch={patch} />}
            {tab === "translate" && <TranslateTab meeting={meeting} onChange={load} />}
            {tab === "email" && <EmailTab meeting={meeting} onChange={load} />}
            {tab === "ask" && <AskTab meeting={meeting} />}
            {tab === "notes" && <NotesTab meeting={meeting} onChange={load} />}
          </div>
        </div>
      </div>
    </div>
  );
}
