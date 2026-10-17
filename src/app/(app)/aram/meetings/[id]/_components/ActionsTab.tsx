"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, CalendarCheck, FolderKanban, Loader2, Sparkles, User } from "lucide-react";
import { api, btnPrimary, input, isOverdue, relDay, PRIORITY_LABEL } from "../../../_components/utils";
import type { ActionItem, Meeting, ProjectLite, UserLite } from "./types";

export default function ActionsTab({
  meeting, users, projects, onChange,
}: {
  meeting: Meeting;
  users: UserLite[];
  projects: ProjectLite[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [adding, setAdding] = useState(false);
  const editable = meeting.canEdit;

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await api("/api/aram/actions", {
        method: "POST",
        json: { title, meetingId: meeting.id, assigneeId: assigneeId || null, dueDate: dueDate || null, priority },
      });
      setTitle("");
      setDueDate("");
      setAssigneeId("");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setAdding(false);
    }
  };

  const open = meeting.actionItems.filter((a) => a.status !== "done" && a.status !== "cancelled");
  const done = meeting.actionItems.filter((a) => a.status === "done" || a.status === "cancelled");

  return (
    <div className="space-y-4">
      {editable && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="할 일 추가 (예: 견적서 송부하기)"
            className={input}
          />
          <div className="flex flex-wrap gap-2">
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={`${input} w-auto flex-1 min-w-[120px]`}>
              <option value="">담당자 (나)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${input} w-auto`} />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${input} w-auto`}>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={add} disabled={adding || !title.trim()} className={btnPrimary}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 추가
            </button>
          </div>
          <p className="text-[11px] text-gray-400">기한이 있는 할 일은 담당자의 캘린더에 자동 등록되고, 마감 전날·지연 시 알림이 갑니다.</p>
        </div>
      )}

      {meeting.actionItems.length === 0 && <p className="text-sm text-gray-400 text-center py-8">할 일이 없습니다.</p>}

      <div className="space-y-2">
        {open.map((a) => (
          <ActionRow key={a.id} item={a} users={users} projects={projects} meeting={meeting} onChange={onChange} />
        ))}
      </div>
      {done.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer">완료된 할 일 {done.length}</summary>
          <div className="space-y-2 mt-2">
            {done.map((a) => (
              <ActionRow key={a.id} item={a} users={users} projects={projects} meeting={meeting} onChange={onChange} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ActionRow({
  item, users, projects, meeting, onChange,
}: {
  item: ActionItem;
  users: UserLite[];
  projects: ProjectLite[];
  meeting: Meeting;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pickProject, setPickProject] = useState(false);
  const done = item.status === "done";
  const overdue = isOverdue(item.dueDate, item.status);
  const pr = PRIORITY_LABEL[item.priority] ?? PRIORITY_LABEL.medium;

  const patch = async (data: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api(`/api/aram/actions/${item.id}`, { method: "PATCH", json: data });
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    await api(`/api/aram/actions/${item.id}`, { method: "DELETE" }).catch(() => {});
    onChange();
  };

  const toTask = async (projectId?: string) => {
    if (!projectId && !meeting.projectId) {
      setPickProject(true);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/aram/actions/${item.id}/to-task`, { method: "POST", json: { projectId: projectId || meeting.projectId } });
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setBusy(false);
      setPickProject(false);
    }
  };

  return (
    <div className={`rounded-xl border p-3 ${overdue ? "border-rose-200 bg-rose-50/40 dark:bg-rose-500/5" : "border-gray-200 dark:border-gray-700"}`}>
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={done}
          disabled={busy}
          onChange={() => patch({ status: done ? "open" : "done" })}
          className="mt-1 w-4 h-4 accent-indigo-600"
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm break-words ${done ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>{item.title}</p>
          {item.description && <p className="text-xs text-gray-500 mt-0.5 break-words">{item.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded ${pr.cls}`}>{pr.label}</span>
            {item.source === "ai" && <span className="inline-flex items-center gap-0.5 text-violet-600"><Sparkles className="w-3 h-3" />AI</span>}
            <span className="inline-flex items-center gap-1 text-gray-500">
              <User className="w-3 h-3" />
              <select
                value={item.assigneeId ?? ""}
                disabled={busy}
                onChange={(e) => patch({ assigneeId: e.target.value || null })}
                className="bg-transparent text-xs border-0 p-0 focus:ring-0"
              >
                <option value="">{item.assigneeName ? `${item.assigneeName} (외부/미지정)` : "미지정"}</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </span>
            <span className={`inline-flex items-center gap-1 ${overdue ? "text-rose-600 font-medium" : "text-gray-500"}`}>
              <input
                type="date"
                value={item.dueDate ? item.dueDate.slice(0, 10) : ""}
                disabled={busy}
                onChange={(e) => patch({ dueDate: e.target.value || null })}
                className="bg-transparent text-xs border-0 p-0 focus:ring-0"
              />
              {item.dueDate && <span>({relDay(item.dueDate)})</span>}
            </span>
            {item.calendarEventId && (
              <Link href="/calendar" className="inline-flex items-center gap-0.5 text-emerald-600" title="캘린더에 등록됨">
                <CalendarCheck className="w-3.5 h-3.5" /> 캘린더
              </Link>
            )}
            {item.contact && <Link href={`/aram/contacts/${item.contact.id}`} className="text-indigo-600 hover:underline">{item.contact.name}</Link>}
            {item.taskId ? (
              <span className="inline-flex items-center gap-0.5 text-blue-600"><FolderKanban className="w-3.5 h-3.5" /> 태스크 등록됨</span>
            ) : pickProject ? (
              <select
                autoFocus
                defaultValue=""
                onChange={(e) => e.target.value && toTask(e.target.value)}
                onBlur={() => setPickProject(false)}
                className="text-xs rounded border border-gray-200 bg-white dark:bg-gray-800 px-1"
              >
                <option value="">프로젝트 선택</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <button onClick={() => toTask()} disabled={busy} className="inline-flex items-center gap-0.5 text-gray-500 hover:text-blue-600">
                <FolderKanban className="w-3.5 h-3.5" /> 프로젝트 태스크로
              </button>
            )}
          </div>
        </div>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <button onClick={remove} className="p-1 text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  );
}
