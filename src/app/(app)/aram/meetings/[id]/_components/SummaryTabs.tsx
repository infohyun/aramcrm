"use client";

import { useState } from "react";
import { Pencil, Check, X, Lightbulb, CheckCircle2, HelpCircle, AlertTriangle, Sparkles, TrendingUp, ListOrdered } from "lucide-react";
import AramMarkdown from "../../../_components/AramMarkdown";
import { btnGhost, btnPrimary, input, parseList } from "../../../_components/utils";
import type { Meeting } from "./types";

type Patch = (data: Record<string, unknown>) => Promise<void>;

function EditableMarkdown({
  value, field, editable, patch, empty,
}: {
  value: string | null;
  field: string;
  editable: boolean;
  patch: Patch;
  empty: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <div>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} className={`${input} font-mono text-[13px]`} />
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              setSaving(true);
              await patch({ [field]: draft });
              setSaving(false);
              setEditing(false);
            }}
            disabled={saving}
            className={btnPrimary}
          >
            <Check className="w-4 h-4" /> 저장
          </button>
          <button onClick={() => setEditing(false)} className={btnGhost}><X className="w-4 h-4" /> 취소</button>
        </div>
      </div>
    );
  }
  return (
    <div className="relative group">
      {editable && (
        <button
          onClick={() => {
            setDraft(value ?? "");
            setEditing(true);
          }}
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1"
        >
          <Pencil className="w-3.5 h-3.5" /> 편집
        </button>
      )}
      {value ? <AramMarkdown content={value} /> : <p className="text-sm text-gray-400">{empty}</p>}
    </div>
  );
}

function ListBlock({ title, icon: Icon, items, cls }: { title: string; icon: React.ElementType; items: string[]; cls: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className={`flex items-center gap-1.5 text-sm font-semibold mb-2 ${cls}`}>
        <Icon className="w-4 h-4" /> {title} <span className="text-gray-400 font-normal">{items.length}</span>
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SummaryTab({ meeting, patch }: { meeting: Meeting; patch: Patch }) {
  const topics = meeting.topics?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  if (!meeting.summary && !meeting.oneLiner) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        아직 AI 요약이 없습니다. 전사가 끝나면 자동으로 생성되며, 상단의 &quot;AI 재분석&quot;으로 다시 만들 수 있습니다.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {meeting.oneLiner && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 p-4 text-sm font-medium text-indigo-900 dark:text-indigo-200 break-words">
          {meeting.oneLiner}
        </div>
      )}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topics.map((t) => <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">#{t}</span>)}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ListBlock title="핵심 포인트" icon={Lightbulb} items={parseList(meeting.keyPoints)} cls="text-indigo-700 dark:text-indigo-300" />
        <ListBlock title="결정 사항" icon={CheckCircle2} items={parseList(meeting.decisions)} cls="text-emerald-700 dark:text-emerald-300" />
        <ListBlock title="미해결 질문" icon={HelpCircle} items={parseList(meeting.openQuestions)} cls="text-amber-700 dark:text-amber-300" />
        <ListBlock title="리스크" icon={AlertTriangle} items={parseList(meeting.risks)} cls="text-rose-700 dark:text-rose-300" />
      </div>
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <EditableMarkdown value={meeting.summary} field="summary" editable={meeting.canEdit} patch={patch} empty="요약 없음" />
      </div>
    </div>
  );
}

export function OutlookTab({ meeting, patch }: { meeting: Meeting; patch: Patch }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white mb-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> 사업 전개 전망 · 액션 플랜
        </h3>
        <p className="text-xs text-gray-500 mb-3">같은 상대·프로젝트의 이전 미팅 흐름까지 반영해 앞으로의 전개를 예측합니다.</p>
        <EditableMarkdown value={meeting.businessOutlook} field="businessOutlook" editable={meeting.canEdit} patch={patch} empty="아직 분석된 전망이 없습니다." />
      </div>
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white mb-2">
          <ListOrdered className="w-4 h-4 text-indigo-500" /> 다음 미팅 안건
        </h3>
        <EditableMarkdown value={meeting.nextMeetingAgenda} field="nextMeetingAgenda" editable={meeting.canEdit} patch={patch} empty="다음 안건이 없습니다." />
      </div>
    </div>
  );
}
