"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Trash2, FolderKanban, AlertTriangle, CalendarDays, CircleDashed, ListChecks, UserRound, FileAudio, X, Check } from "lucide-react";
import AramNav from "../_components/AramNav";
import { api, card, btnPrimary, btnGhost, input, relDay, isOverdue, PRIORITY_LABEL } from "../_components/utils";

interface ActionItem {
  id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null;
  assigneeName: string | null; taskId: string | null; source: string;
  assignee: { id: string; name: string } | null;
  contact: { id: string; name: string; company: string | null } | null;
  meeting: { id: string; title: string; startedAt: string; project?: { id: string; name: string } | null } | null;
}
interface ActionsResponse { data: ActionItem[]; stats: { overdue: number; thisWeek: number; noDue: number; active: number } }
interface UserOpt { id: string; name: string; position: string | null; isActive: boolean }
interface ProjectOpt { id: string; name: string }

const SCOPES = [{ v: "mine", l: "내 할 일" }, { v: "created", l: "내가 만든" }, { v: "team", l: "팀 전체" }];
const STATUSES = [{ v: "active", l: "진행중" }, { v: "done", l: "완료" }, { v: "all", l: "전체" }];
const STATUS_OPTS = [
  { v: "open", l: "할 일" }, { v: "in_progress", l: "진행 중" }, { v: "done", l: "완료" }, { v: "cancelled", l: "취소" },
];

function bucket(a: ActionItem): string {
  if (a.status === "done" || a.status === "cancelled") return "완료·취소";
  if (!a.dueDate) return "기한 없음";
  if (isOverdue(a.dueDate, a.status)) return "지연됨";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(a.dueDate); d.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - today.getTime()) / 86400000;
  if (diff === 0) return "오늘";
  if (diff <= 7) return "이번 주";
  return "이후";
}
const ORDER = ["지연됨", "오늘", "이번 주", "이후", "기한 없음", "완료·취소"];

const toDateInput = (d: string | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "");

export default function ActionsPage() {
  const [scope, setScope] = useState("mine");
  const [status, setStatus] = useState("active");
  const [res, setRes] = useState<ActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", priority: "medium", assigneeId: "" });
  const [saving, setSaving] = useState(false);
  const [taskFor, setTaskFor] = useState<ActionItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRes(await api<ActionsResponse>(`/api/aram/actions?scope=${scope}&status=${status}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [scope, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<UserOpt[]>("/api/users").then((u) => setUsers(u.filter((x) => x.isActive))).catch(() => {});
    api<{ data: ProjectOpt[] }>("/api/projects?limit=100").then((p) => setProjects(p.data)).catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ActionItem[]>();
    for (const a of res?.data ?? []) map.set(bucket(a), [...(map.get(bucket(a)) ?? []), a]);
    return ORDER.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [res]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setRes((r) => r && { ...r, data: r.data.map((a) => (a.id === id ? { ...a, ...body } as ActionItem : a)) });
    try {
      await api(`/api/aram/actions/${id}`, { method: "PATCH", json: body });
    } catch (e) {
      alert(e instanceof Error ? e.message : "수정 실패");
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 할 일을 삭제할까요? 연결된 캘린더 일정도 삭제됩니다.")) return;
    await api(`/api/aram/actions/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api("/api/aram/actions", {
        method: "POST",
        json: { ...form, assigneeId: form.assigneeId || undefined, dueDate: form.dueDate || null },
      });
      setForm({ title: "", description: "", dueDate: "", priority: "medium", assigneeId: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <AramNav
        title="할 일"
        subtitle="미팅에서 나온 모든 약속과 액션 — 마감일이 있으면 캘린더에 자동 등록되고 알림이 갑니다"
        actions={<button onClick={() => setShowAdd((v) => !v)} className={btnPrimary}><Plus className="w-4 h-4" />할 일 추가</button>}
      />

      {showAdd && (
        <form onSubmit={add} className={`${card} p-4 mb-5 grid gap-3 md:grid-cols-6`}>
          <input className={`${input} md:col-span-3`} placeholder="할 일 (예: 견적서 송부하기)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          <input type="date" className={input} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <select className={input} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {Object.entries(PRIORITY_LABEL).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}
          </select>
          <select className={input} value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
            <option value="">담당: 나</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.position ? ` ${u.position}` : ""}</option>)}
          </select>
          <input className={`${input} md:col-span-5`} placeholder="설명 (선택)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className={btnPrimary} disabled={saving || !form.title.trim()}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}추가</button>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <Toggle options={SCOPES} value={scope} onChange={setScope} />
        <Toggle options={STATUSES} value={status} onChange={setStatus} />
      </div>

      {res && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatTile icon={AlertTriangle} label="지연됨" value={res.stats.overdue} tone="rose" />
          <StatTile icon={CalendarDays} label="7일 내 마감" value={res.stats.thisWeek} tone="amber" />
          <StatTile icon={CircleDashed} label="기한 없음" value={res.stats.noDue} tone="gray" />
          <StatTile icon={ListChecks} label="진행 중 전체" value={res.stats.active} tone="indigo" />
        </div>
      )}

      {loading && !res ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : error ? (
        <div className={`${card} p-6 text-sm text-rose-600`}>{error}</div>
      ) : groups.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <ListChecks className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">할 일이 없습니다. 미팅을 기록하면 AI가 할 일을 자동으로 뽑아드립니다.</p>
        </div>
      ) : (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          {groups.map(([label, items]) => (
            <section key={label}>
              <h2 className={`text-sm font-semibold mb-2 ${label === "지연됨" ? "text-rose-600" : "text-gray-500"}`}>{label} <span className="font-normal">({items.length})</span></h2>
              <div className={`${card} divide-y divide-gray-100 dark:divide-gray-700`}>
                {items.map((a) => (
                  <Row key={a.id} a={a} users={users} onPatch={patch} onDelete={remove} onToTask={() => setTaskFor(a)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {taskFor && <ToTaskModal action={taskFor} projects={projects} onClose={() => setTaskFor(null)} onDone={() => { setTaskFor(null); load(); }} />}
    </div>
  );
}

function Row({ a, users, onPatch, onDelete, onToTask }: {
  a: ActionItem; users: UserOpt[];
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onToTask: () => void;
}) {
  const done = a.status === "done";
  const overdue = isOverdue(a.dueDate, a.status);
  const pr = PRIORITY_LABEL[a.priority] ?? PRIORITY_LABEL.medium;
  return (
    <div className="p-4 flex gap-3">
      <input type="checkbox" checked={done} onChange={() => onPatch(a.id, { status: done ? "open" : "done" })} className="mt-1 w-4 h-4 accent-indigo-600 shrink-0" aria-label="완료 표시" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-medium break-words ${done ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>{a.title}</p>
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${pr.cls}`}>{pr.label}</span>
          {a.source === "ai" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">AI</span>}
          {a.taskId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">프로젝트 태스크</span>}
        </div>
        {a.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">{a.description}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
          {a.meeting && <Link href={`/aram/meetings/${a.meeting.id}`} className="flex items-center gap-1 text-indigo-600 hover:underline break-words"><FileAudio className="w-3 h-3" />{a.meeting.title}</Link>}
          {a.contact && <Link href={`/aram/contacts/${a.contact.id}`} className="flex items-center gap-1 hover:text-indigo-600"><UserRound className="w-3 h-3" />{a.contact.name}{a.contact.company && ` (${a.contact.company})`}</Link>}
          {a.meeting?.project && <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" />{a.meeting.project.name}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <select value={a.assignee?.id ?? ""} onChange={(e) => onPatch(a.id, { assigneeId: e.target.value || null })} className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="">{a.assigneeName ? `${a.assigneeName} (외부/미매칭)` : "담당자 없음"}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <label className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "border-gray-200 dark:border-gray-600"}`}>
            <CalendarDays className="w-3 h-3" />
            <span className="whitespace-nowrap">{relDay(a.dueDate)}</span>
            <input type="date" value={toDateInput(a.dueDate)} onChange={(e) => onPatch(a.id, { dueDate: e.target.value || null })} className="bg-transparent w-[110px] text-xs focus:outline-none" />
          </label>
          <select value={a.status} onChange={(e) => onPatch(a.id, { status: e.target.value })} className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900">
            {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          {!a.taskId && <button onClick={onToTask} className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"><FolderKanban className="w-3 h-3" />프로젝트 태스크로</button>}
          <button onClick={() => onDelete(a.id)} className="text-xs px-2 py-1 rounded-lg text-gray-400 hover:text-rose-600" aria-label="삭제"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ToTaskModal({ action, projects, onClose, onDone }: { action: ActionItem; projects: ProjectOpt[]; onClose: () => void; onDone: () => void }) {
  const [projectId, setProjectId] = useState(action.meeting?.project?.id ?? "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api(`/api/aram/actions/${action.id}/to-task`, { method: "POST", json: { projectId: projectId || undefined } });
      onDone();
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-md p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">프로젝트 태스크로 등록</h3>
          <button onClick={onClose} aria-label="닫기"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 break-words">“{action.title}”</p>
        <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">프로젝트 선택</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-2">상태 변경은 아람과 프로젝트 태스크에 함께 반영됩니다.</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className={btnGhost}>취소</button>
          <button onClick={submit} className={btnPrimary} disabled={busy || !projectId}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}등록</button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${value === o.v ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{o.l}</button>
      ))}
    </div>
  );
}

const TONES: Record<string, string> = {
  rose: "text-rose-600 bg-rose-50 dark:bg-rose-500/10",
  amber: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
  gray: "text-gray-600 bg-gray-100 dark:bg-gray-700",
  indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10",
};

function StatTile({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <div className={`${card} p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONES[tone]}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
