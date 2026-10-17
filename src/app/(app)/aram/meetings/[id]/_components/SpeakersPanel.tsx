"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Check, X, Link2, GitMerge, Contact } from "lucide-react";
import { api, input, fmtDuration } from "../../../_components/utils";
import type { Meeting, Speaker, UserLite } from "./types";
import { speakerDisplay } from "./types";
import { ContactPicker } from "./MeetingHeader";

export default function SpeakersPanel({ meeting, onChange }: { meeting: Meeting; onChange: () => void }) {
  const [users, setUsers] = useState<UserLite[]>([]);
  const totalTalk = meeting.speakers.reduce((sum, s) => sum + s.talkTimeSec, 0);
  const counts = new Map<string, number>();
  meeting.segments.forEach((s) => s.speakerId && counts.set(s.speakerId, (counts.get(s.speakerId) ?? 0) + 1));

  useEffect(() => {
    api<UserLite[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="mb-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 space-y-3">
      <p className="text-[11px] text-gray-500">
        화자 이름을 지정하거나 명함·직원과 연결하면 요약과 할 일 담당자가 더 정확해집니다. 이후 &quot;AI 재분석&quot;을 실행하세요.
      </p>
      {meeting.speakers.map((s) => (
        <SpeakerRow
          key={s.id}
          meeting={meeting}
          speaker={s}
          users={users}
          share={totalTalk ? s.talkTimeSec / totalTalk : (counts.get(s.id) ?? 0) / Math.max(1, meeting.segments.length)}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function SpeakerRow({
  meeting, speaker, users, share, onChange,
}: {
  meeting: Meeting;
  speaker: Speaker;
  users: UserLite[];
  share: number;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(speaker.name ?? "");
  const [role, setRole] = useState(speaker.role ?? "");
  const [picking, setPicking] = useState(false);
  const [merging, setMerging] = useState(false);
  const editable = meeting.canEdit;

  const patch = async (data: Record<string, unknown>) => {
    try {
      await api(`/api/aram/meetings/${meeting.id}/speakers`, { method: "PATCH", json: { speakerId: speaker.id, ...data } });
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "수정 실패");
    }
  };

  const merge = async (intoId: string) => {
    if (!confirm(`"${speakerDisplay(speaker)}"의 발언을 선택한 화자로 합칠까요?`)) return;
    try {
      await api(`/api/aram/meetings/${meeting.id}/speakers`, { method: "POST", json: { fromId: speaker.id, intoId } });
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "병합 실패");
    }
  };

  const contact = meeting.contacts.find((c) => c.id === speaker.contactId);
  const user = users.find((u) => u.id === speaker.userId);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: speaker.color ?? "#9ca3af" }} />
        {editing ? (
          <div className="flex-1 grid grid-cols-2 gap-1">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className={`${input} py-1`} autoFocus />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="소속·역할" className={`${input} py-1`} />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{speakerDisplay(speaker)}</span>
            {speaker.name && speaker.name !== speaker.label && <span className="text-[11px] text-gray-400 ml-1">({speaker.label})</span>}
            {speaker.role && <span className="text-xs text-gray-500 ml-1 break-words">{speaker.role}</span>}
          </div>
        )}
        <span className="text-[11px] text-gray-400 shrink-0">{Math.round(share * 100)}%{speaker.talkTimeSec ? ` · ${fmtDuration(speaker.talkTimeSec)}` : ""}</span>
        {editable &&
          (editing ? (
            <>
              <button onClick={() => { setEditing(false); patch({ name, role }); }} className="p-1 rounded bg-indigo-600 text-white"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="p-1 rounded bg-gray-100"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1" title="이름 수정"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
          ))}
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, share * 100)}%`, backgroundColor: speaker.color ?? "#9ca3af" }} />
      </div>
      {speaker.summary && <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 break-words">{speaker.summary}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
        {contact && (
          <Link href={`/aram/contacts/${contact.id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
            <Contact className="w-3.5 h-3.5" /> {contact.name}
          </Link>
        )}
        {user && <span className="text-emerald-700">사내: {user.name}</span>}
        {editable && (
          <>
            <div className="relative">
              <button onClick={() => setPicking((v) => !v)} className="inline-flex items-center gap-1 text-gray-500 hover:text-indigo-600">
                <Link2 className="w-3.5 h-3.5" /> 명함 연결
              </button>
              {picking && (
                <ContactPicker
                  onPick={(id) => {
                    setPicking(false);
                    patch({ contactId: id, userId: null });
                  }}
                  onClose={() => setPicking(false)}
                />
              )}
            </div>
            <select
              value={speaker.userId ?? ""}
              onChange={(e) => patch({ userId: e.target.value || null, ...(e.target.value ? { contactId: null } : {}) })}
              className="text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-0.5"
            >
              <option value="">직원 연결</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.position ? ` ${u.position}` : ""}</option>)}
            </select>
            {meeting.speakers.length > 1 &&
              (merging ? (
                <select
                  autoFocus
                  defaultValue=""
                  onChange={(e) => { setMerging(false); if (e.target.value) merge(e.target.value); }}
                  onBlur={() => setMerging(false)}
                  className="text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-0.5"
                >
                  <option value="">합칠 화자 선택</option>
                  {meeting.speakers.filter((x) => x.id !== speaker.id).map((x) => <option key={x.id} value={x.id}>{speakerDisplay(x)}</option>)}
                </select>
              ) : (
                <button onClick={() => setMerging(true)} className="inline-flex items-center gap-1 text-gray-500 hover:text-indigo-600">
                  <GitMerge className="w-3.5 h-3.5" /> 병합
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
