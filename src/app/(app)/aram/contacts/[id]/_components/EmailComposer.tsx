"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Send, Sparkles } from "lucide-react";
import { OUTPUT_LANGUAGES } from "@/lib/aram/languages";
import { api, btnGhost, btnPrimary, card, fmtDate, input } from "../../../_components/utils";
import type { ContactDetail, ContactEmail } from "./types";

const TONES = ["정중하고 간결한 비즈니스 톤", "친근하고 따뜻한 톤", "격식 있는 공식 문서 톤", "짧고 핵심만"];

export default function EmailComposer({
  contact,
  replyTo,
  onReplyToChange,
  onSent,
}: {
  contact: ContactDetail;
  replyTo: string | null;
  onReplyToChange: (id: string | null) => void;
  onSent: () => void;
}) {
  const inbound = contact.emails.filter((e) => e.direction === "inbound");
  const [purpose, setPurpose] = useState("");
  const [language, setLanguage] = useState(contact.language ?? "");
  const [meetingId, setMeetingId] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [draft, setDraft] = useState({ toAddr: contact.email ?? "", cc: "", subject: "", body: "" });
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const replyEmail: ContactEmail | undefined = inbound.find((e) => e.id === replyTo);

  useEffect(() => {
    if (replyEmail) setDraft((d) => ({ ...d, subject: d.subject || `Re: ${replyEmail.subject}`, toAddr: replyEmail.fromAddr || d.toAddr }));
  }, [replyEmail]);

  const aiDraft = async () => {
    setDrafting(true);
    setMsg(null);
    try {
      const r = await api<{ subject: string; body: string }>("/api/aram/emails/draft", {
        method: "POST",
        json: { contactId: contact.id, meetingId: meetingId || null, replyToId: replyTo, purpose, language: language || null, tone },
      });
      setDraft((d) => ({ ...d, subject: r.subject, body: r.body }));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "초안 작성 실패" });
    } finally {
      setDrafting(false);
    }
  };

  const submit = async (send: boolean) => {
    if (!draft.subject.trim() || !draft.body.trim()) return setMsg({ ok: false, text: "제목과 본문을 입력하세요." });
    if (send) {
      if (!draft.toAddr.trim()) return setMsg({ ok: false, text: "받는 사람 이메일을 입력하세요." });
      if (!confirm(`${draft.toAddr} 에게 메일을 보낼까요?`)) return;
    }
    setBusy(send ? "send" : "save");
    setMsg(null);
    try {
      await api("/api/aram/emails", {
        method: "POST",
        json: { contactId: contact.id, meetingId: meetingId || null, replyToId: replyTo, ...draft, language: language || null, send },
      });
      setMsg({ ok: true, text: send ? "메일을 보냈습니다." : "초안을 저장했습니다." });
      setDraft({ toAddr: contact.email ?? "", cc: "", subject: "", body: "" });
      setPurpose("");
      onReplyToChange(null);
      onSent();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "처리 실패" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`${card} p-5 space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">이메일 작성</h3>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs">
          <button className={`px-2.5 py-1 rounded-md ${!replyTo ? "bg-white dark:bg-gray-700 shadow-sm font-medium" : "text-gray-500"}`} onClick={() => onReplyToChange(null)}>새 메일</button>
          <button
            className={`px-2.5 py-1 rounded-md ${replyTo ? "bg-white dark:bg-gray-700 shadow-sm font-medium" : "text-gray-500"} disabled:opacity-40`}
            disabled={!inbound.length}
            onClick={() => onReplyToChange(inbound[0]?.id ?? null)}
          >
            답장
          </button>
        </div>
      </div>

      {replyTo && (
        <select className={input} value={replyTo} onChange={(e) => onReplyToChange(e.target.value)}>
          {inbound.map((e) => (
            <option key={e.id} value={e.id}>{fmtDate(e.sentAt ?? e.createdAt)} · {e.subject}</option>
          ))}
        </select>
      )}
      {replyEmail && (
        <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">{replyEmail.body}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-2">
        <input className={`${input} sm:col-span-2`} placeholder="목적/지시 (예: 견적서 송부 일정 안내, 샘플 발송 후속 확인)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        <select className={input} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">언어 자동 (상대방 언어)</option>
          {OUTPUT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
        </select>
        <select className={input} value={tone} onChange={(e) => setTone(e.target.value)}>
          {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={`${input} sm:col-span-2`} value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
          <option value="">관련 미팅 없음</option>
          {contact.meetings.map((m) => <option key={m.id} value={m.id}>{fmtDate(m.startedAt)} · {m.title}</option>)}
        </select>
      </div>
      <button className={`${btnGhost} w-full border-indigo-200 text-indigo-700`} onClick={aiDraft} disabled={drafting}>
        {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {drafting ? "아람이 작성 중..." : "AI 초안 작성"}
      </button>

      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <input className={input} placeholder="받는 사람" value={draft.toAddr} onChange={(e) => setDraft({ ...draft, toAddr: e.target.value })} />
        <input className={input} placeholder="참조 (CC)" value={draft.cc} onChange={(e) => setDraft({ ...draft, cc: e.target.value })} />
        <input className={input} placeholder="제목" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
        <textarea rows={12} className={input} placeholder="본문" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
      <div className="flex justify-end gap-2">
        <button className={btnGhost} onClick={() => submit(false)} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}초안 저장
        </button>
        <button className={btnPrimary} onClick={() => submit(true)} disabled={!!busy}>
          {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}보내기
        </button>
      </div>
    </div>
  );
}
