"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, User, Sparkles, Download, Copy, Trash2, X, Search, Plus, MapPin, Check, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { ARAM_TEMPLATES } from "@/lib/aram/templates";
import { OUTPUT_LANGUAGES, languageName } from "@/lib/aram/languages";
import {
  api, card, btnGhost, btnPrimary, input, fmtDate, fmtDuration, STATUS_LABEL, SENTIMENT_LABEL, VISIBILITY, MEETING_TYPES,
} from "../../../_components/utils";
import type { Meeting, ProjectLite } from "./types";

interface Props {
  meeting: Meeting;
  projects: ProjectLite[];
  isOwner: boolean;
  onChange: () => void;
  patch: (data: Record<string, unknown>) => Promise<void>;
}

export default function MeetingHeader({ meeting, projects, isOwner, onChange, patch }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(meeting.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showReanalyze, setShowReanalyze] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const editable = meeting.canEdit;
  const status = STATUS_LABEL[meeting.status] ?? STATUS_LABEL.draft;
  const sentiment = meeting.sentiment ? SENTIMENT_LABEL[meeting.sentiment] : null;
  const processing = meeting.status === "transcribing" || meeting.status === "analyzing";

  useEffect(() => setTitle(meeting.title), [meeting.title]);

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title.trim() && title !== meeting.title) await patch({ title: title.trim() });
  };

  const copySummary = async () => {
    const text = [`# ${meeting.title}`, meeting.oneLiner ? `> ${meeting.oneLiner}` : "", meeting.summary ?? ""].join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const remove = async () => {
    if (!confirm("이 미팅과 녹음, 전사문, 할 일을 모두 삭제할까요? 되돌릴 수 없습니다.")) return;
    await api(`/api/aram/meetings/${meeting.id}`, { method: "DELETE" });
    router.push("/aram/meetings");
  };

  const retry = async () => {
    setBusy(true);
    try {
      await api(`/api/aram/meetings/${meeting.id}/analyze`, { method: "POST", json: {} });
    } catch (e) {
      alert(e instanceof Error ? e.message : "재분석 실패");
    } finally {
      setBusy(false);
      onChange();
    }
  };

  const removeContact = (id: string) => patch({ contactIds: meeting.contacts.filter((c) => c.id !== id).map((c) => c.id) });

  return (
    <div className={`${card} p-5 mb-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className={`${input} text-lg font-bold`}
            />
          ) : (
            <h1
              onClick={() => editable && setEditingTitle(true)}
              className={`text-xl font-bold text-gray-900 dark:text-white break-words ${editable ? "cursor-text hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg -mx-1 px-1" : ""}`}
              title={editable ? "클릭해서 제목 수정" : undefined}
            >
              {meeting.title}
            </h1>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(meeting.startedAt, true)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtDuration(meeting.durationSec)}</span>
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{meeting.owner.name}</span>
            {meeting.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{meeting.location}</span>}
            {meeting.detectedLanguages && (
              <span>언어: {meeting.detectedLanguages.split(",").map((l) => languageName(l)).join(", ")}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
            {sentiment && <span className={`px-2 py-0.5 rounded-full ${sentiment.cls}`}>{sentiment.label}</span>}
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {MEETING_TYPES.find((t) => t.value === meeting.meetingType)?.label ?? meeting.meetingType}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <button onClick={() => setShowReanalyze(true)} disabled={processing} className={btnPrimary}>
              <Sparkles className="w-4 h-4" /> AI 재분석
            </button>
          )}
          <a href={`/api/aram/meetings/${meeting.id}/export?format=md`} className={btnGhost} title="마크다운 내보내기">
            <Download className="w-4 h-4" /> MD
          </a>
          <a href={`/api/aram/meetings/${meeting.id}/export?format=txt`} className={btnGhost} title="텍스트 내보내기">
            <Download className="w-4 h-4" /> TXT
          </a>
          <button onClick={copySummary} className={btnGhost} disabled={!meeting.summary}>
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} 복사
          </button>
          {isOwner && (
            <button onClick={remove} className={`${btnGhost} text-rose-600`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {processing && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 p-3 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {meeting.status === "transcribing" ? "녹음을 전사하고 화자를 분리하고 있습니다…" : "AI가 요약·할 일·사업 전망을 정리하고 있습니다…"}
          <span className="text-xs opacity-70">(자동 새로고침)</span>
        </div>
      )}
      {meeting.status === "failed" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1 break-words">{meeting.errorMessage || "처리 중 문제가 발생했습니다."}</span>
          {editable && (
            <button onClick={retry} disabled={busy} className={btnGhost}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 다시 분석
            </button>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">공개 범위</label>
          <select
            value={meeting.visibility}
            disabled={!isOwner}
            onChange={(e) => patch({ visibility: e.target.value })}
            className={input}
          >
            {VISIBILITY.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">프로젝트</label>
          <select
            value={meeting.projectId ?? ""}
            disabled={!editable}
            onChange={(e) => patch({ projectId: e.target.value || null })}
            className={input}
          >
            <option value="">연결 안 함</option>
            {meeting.project && !projects.some((p) => p.id === meeting.project!.id) && (
              <option value={meeting.project.id}>{meeting.project.name}</option>
            )}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">참석자 (명함)</label>
          <div className="flex flex-wrap items-center gap-1 min-h-[38px]">
            {meeting.contacts.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs">
                <Link href={`/aram/contacts/${c.id}`} className="hover:underline">
                  {c.name}{c.company ? ` · ${c.company}` : ""}
                </Link>
                {editable && <button onClick={() => removeContact(c.id)}><X className="w-3 h-3" /></button>}
              </span>
            ))}
            {editable && (
              <div className="relative">
                <button onClick={() => setShowContactPicker((v) => !v)} className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-500">
                  <Plus className="w-3 h-3" /> 추가
                </button>
                {showContactPicker && (
                  <ContactPicker
                    onPick={(id) => {
                      setShowContactPicker(false);
                      if (!meeting.contacts.some((c) => c.id === id)) patch({ contactIds: [...meeting.contacts.map((c) => c.id), id] });
                    }}
                    onClose={() => setShowContactPicker(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReanalyze && (
        <ReanalyzeModal
          meeting={meeting}
          onClose={() => setShowReanalyze(false)}
          onDone={() => {
            setShowReanalyze(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

export function ContactPicker({ onPick, onClose }: { onPick: (id: string, name: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; company: string | null }[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ data: { id: string; name: string; company: string | null }[] }>(`/api/aram/contacts?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => setResults(r.data))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="absolute z-20 mt-1 w-64 right-0 md:left-0 md:right-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-2">
      <div className="relative mb-1">
        <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="명함 검색" className={`${input} pl-8 py-1.5`} />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {results.map((r) => (
          <button key={r.id} onClick={() => onPick(r.id, r.name)} className="block w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            {r.name} <span className="text-xs text-gray-400">{r.company}</span>
          </button>
        ))}
        {results.length === 0 && <p className="text-xs text-gray-400 p-2">검색 결과가 없습니다</p>}
      </div>
      <button onClick={onClose} className="w-full text-xs text-gray-400 mt-1">닫기</button>
    </div>
  );
}

function ReanalyzeModal({ meeting, onClose, onDone }: { meeting: Meeting; onClose: () => void; onDone: () => void }) {
  const [template, setTemplate] = useState(meeting.template);
  const [summaryLanguage, setSummaryLanguage] = useState(meeting.summaryLanguage);
  const [customPrompt, setCustomPrompt] = useState(meeting.customPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/aram/meetings/${meeting.id}/analyze`, { method: "POST", json: { template, summaryLanguage, customPrompt } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "재분석 실패");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${card} p-5 w-full max-w-md space-y-3`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-500" /> AI 재분석</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">요약 템플릿</label>
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className={input}>
            {ARAM_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">요약 언어</label>
          <select value={summaryLanguage} onChange={(e) => setSummaryLanguage(e.target.value)} className={input}>
            {OUTPUT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">추가 지시 (선택)</label>
          <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={3} className={input} placeholder="예: 가격·납기 조건 중심으로, 경쟁사 언급 정리" />
        </div>
        <p className="text-xs text-gray-500">AI가 만든 미완료 할 일은 새로 생성되고, 직접 추가한 할 일과 완료된 항목은 유지됩니다.</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={run} disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "분석 중… (최대 몇 분)" : "재분석 시작"}
        </button>
      </div>
    </div>
  );
}
