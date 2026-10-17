"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Languages, Loader2, Sparkles, Save, Send, Mail, MessageCircleQuestion, Trash2, Check, AtSign } from "lucide-react";
import { OUTPUT_LANGUAGES, languageName } from "@/lib/aram/languages";
import AramMarkdown from "../../../_components/AramMarkdown";
import { api, btnGhost, btnPrimary, input, fmtDate } from "../../../_components/utils";
import type { Meeting } from "./types";
import { parseJson } from "./types";

// ─── 번역 ─────────────────────────────
export function TranslateTab({ meeting, onChange }: { meeting: Meeting; onChange: () => void }) {
  const cached = parseJson<Record<string, string>>(meeting.translations, {});
  const [lang, setLang] = useState(Object.keys(cached)[0] ?? (meeting.summaryLanguage === "en" ? "ko" : "en"));
  const [busy, setBusy] = useState<"" | "summary" | "transcript">("");
  const [content, setContent] = useState<Record<string, string>>(cached);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (target: "summary" | "transcript") => {
    setBusy(target);
    setMsg(null);
    try {
      const r = await api<{ lang?: string; content?: string; count?: number }>(`/api/aram/meetings/${meeting.id}/translate`, {
        method: "POST",
        json: { lang, target },
      });
      if (target === "summary" && r.content) setContent((c) => ({ ...c, [lang]: r.content! }));
      if (target === "transcript") {
        setMsg(`전사문 ${r.count ?? 0}개 구간을 ${languageName(lang)}로 번역했습니다. 왼쪽 전사문에서 번역 보기를 선택하세요.`);
        onChange();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "번역 실패");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={`${input} w-auto`}>
          {OUTPUT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
        </select>
        <button onClick={() => run("summary")} disabled={!!busy || !meeting.summary} className={btnPrimary}>
          {busy === "summary" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />} 요약 번역
        </button>
        <button onClick={() => run("transcript")} disabled={!!busy || meeting.segments.length === 0} className={btnGhost}>
          {busy === "transcript" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />} 전사문 번역
        </button>
      </div>
      {msg && <p className="text-sm text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg p-2">{msg}</p>}
      {Object.keys(content).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.keys(content).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`px-2 py-0.5 rounded-full text-xs ${l === lang ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
              {languageName(l)}
            </button>
          ))}
        </div>
      )}
      {content[lang] ? (
        <AramMarkdown content={content[lang]} />
      ) : (
        <p className="text-sm text-gray-400 py-6 text-center">해외 파트너·동료와 공유할 수 있도록 요약을 원하는 언어로 번역하세요.</p>
      )}
    </div>
  );
}

// ─── 후속 이메일 ─────────────────────────────
export function EmailTab({ meeting, onChange }: { meeting: Meeting; onChange: () => void }) {
  const suggested = parseJson<{ subject?: string; body?: string; language?: string }>(meeting.followUpEmail, {});
  const firstWithEmail = meeting.contacts.find((c) => c.email);
  const [contactId, setContactId] = useState(firstWithEmail?.id ?? meeting.contacts[0]?.id ?? "");
  const [to, setTo] = useState(firstWithEmail?.email ?? "");
  const [subject, setSubject] = useState(suggested.subject ?? "");
  const [body, setBody] = useState(suggested.body ?? "");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState<"" | "draft" | "save" | "send">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pickContact = (id: string) => {
    setContactId(id);
    const c = meeting.contacts.find((x) => x.id === id);
    if (c?.email) setTo(c.email);
  };

  const rewrite = async () => {
    setBusy("draft");
    setMsg(null);
    try {
      const r = await api<{ subject: string; body: string }>("/api/aram/emails/draft", {
        method: "POST",
        json: { meetingId: meeting.id, contactId: contactId || null, purpose: purpose || "미팅 감사 인사, 핵심 합의 요약, 다음 단계 안내" },
      });
      setSubject(r.subject);
      setBody(r.body);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "작성 실패" });
    } finally {
      setBusy("");
    }
  };

  const submit = async (send: boolean) => {
    if (send && !to.trim()) return setMsg({ ok: false, text: "받는 사람 이메일을 입력하세요." });
    if (send && !confirm(`${to} 에게 메일을 보낼까요?`)) return;
    setBusy(send ? "send" : "save");
    setMsg(null);
    try {
      await api("/api/aram/emails", {
        method: "POST",
        json: { meetingId: meeting.id, contactId: contactId || null, toAddr: to, subject, body, send },
      });
      setMsg({ ok: true, text: send ? "메일을 보냈습니다." : "초안을 저장했습니다." });
      onChange();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "처리 실패" });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-3">
      {meeting.contacts.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">받는 사람 (명함)</label>
          <select value={contactId} onChange={(e) => pickContact(e.target.value)} className={input}>
            <option value="">선택 안 함</option>
            {meeting.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}{c.email ? ` <${c.email}>` : ""}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">받는 사람 이메일</label>
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com (쉼표로 여러 명)" className={input} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">제목</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">본문 {suggested.language && <span className="text-gray-400">· AI 제안 언어: {languageName(suggested.language)}</span>}</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className={input} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="AI 지시 (예: 영어로, 샘플 일정 강조)" className={`${input} flex-1 min-w-[180px]`} />
        <button onClick={rewrite} disabled={!!busy} className={btnGhost}>
          {busy === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI로 다시 쓰기
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => submit(false)} disabled={!!busy || !subject || !body} className={btnGhost}>
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 초안 저장
        </button>
        <button onClick={() => submit(true)} disabled={!!busy || !subject || !body} className={btnPrimary}>
          {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 보내기
        </button>
      </div>
      {msg && <p className={`text-sm rounded-lg p-2 ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>}

      {meeting.emails.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">이 미팅 관련 이메일</h4>
          <div className="space-y-2">
            {meeting.emails.map((e) => (
              <details key={e.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                <summary className="cursor-pointer text-sm flex flex-wrap items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium break-words">{e.subject}</span>
                  <span className={`text-[11px] px-1.5 rounded ${e.status === "sent" ? "bg-emerald-100 text-emerald-700" : e.status === "failed" ? "bg-rose-100 text-rose-700" : e.status === "received" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {e.status === "sent" ? "발송" : e.status === "failed" ? "실패" : e.status === "received" ? "수신" : "초안"}
                  </span>
                  <span className="text-[11px] text-gray-400">{e.toAddr} · {fmtDate(e.sentAt ?? e.createdAt, true)}</span>
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300 font-sans">{e.body}</pre>
                {e.status === "draft" && (
                  <button
                    onClick={() => { setSubject(e.subject); setBody(e.body); if (e.toAddr) setTo(e.toAddr); }}
                    className="mt-2 text-xs text-indigo-600"
                  >
                    편집기로 불러오기
                  </button>
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ask ─────────────────────────────
interface ChatMsg { role: "user" | "assistant"; content: string; suggestions?: string[] }

export function AskTab({ meeting }: { meeting: Meeting }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [messages, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: question }]);
    setQ("");
    setBusy(true);
    try {
      const r = await api<{ answer: string; suggestedQuestions: string[] }>(`/api/aram/meetings/${meeting.id}/ask`, {
        method: "POST",
        json: { question, history },
      });
      setMessages((m) => [...m, { role: "assistant", content: r.answer, suggestions: r.suggestedQuestions }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "답변 실패"}` }]);
    } finally {
      setBusy(false);
    }
  };

  const starters = ["상대방이 가장 중요하게 생각한 조건은?", "우리가 약속한 것만 정리해줘", "가격·수량 관련 언급을 모두 찾아줘", "다음 미팅 전 준비할 것은?"];

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <MessageCircleQuestion className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">이 미팅에 대해 무엇이든 물어보세요</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {starters.map((s) => (
                <button key={s} onClick={() => ask(s)} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 text-white px-3 py-2 text-sm break-words">{m.content}</div>
            ) : (
              <div className="rounded-2xl rounded-bl-md bg-gray-50 dark:bg-gray-900/60 px-3 py-2">
                <AramMarkdown content={m.content} />
                {m.suggestions && m.suggestions.length > 0 && i === messages.length - 1 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.suggestions.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-white">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> 아람이 기록을 찾아보는 중…</div>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="mt-3 flex gap-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="질문 입력" className={input} />
        <button type="submit" disabled={busy || !q.trim()} className={btnPrimary}><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}

// ─── 메모 & 댓글 ─────────────────────────────
export function NotesTab({ meeting, onChange }: { meeting: Meeting; onChange: () => void }) {
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const [notes, setNotes] = useState(meeting.userNotes ?? "");
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!meeting.canEdit) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await api(`/api/aram/meetings/${meeting.id}`, { method: "PATCH", json: { userNotes: notes } });
        setSaveState("saved");
      } catch {
        setSaveState("");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [notes, meeting.id, meeting.canEdit]);

  const post = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api(`/api/aram/meetings/${meeting.id}/comments`, { method: "POST", json: { content: comment } });
      setComment("");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (commentId: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    await api(`/api/aram/meetings/${meeting.id}/comments?commentId=${commentId}`, { method: "DELETE" }).catch(() => {});
    onChange();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">내 메모</h3>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            {saveState === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> 저장 중</>}
            {saveState === "saved" && <><Check className="w-3 h-3 text-emerald-500" /> 저장됨</>}
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          readOnly={!meeting.canEdit}
          rows={8}
          placeholder="미팅 메모 (자동 저장). 재분석 시 AI가 함께 참고합니다."
          className={input}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">팀 댓글 <span className="text-gray-400 font-normal">{meeting.comments.length}</span></h3>
        <div className="space-y-2 mb-3">
          {meeting.comments.length === 0 && <p className="text-xs text-gray-400">아직 댓글이 없습니다. 동료에게 의견을 남기거나 @이름으로 호출하세요.</p>}
          {meeting.comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                {c.user.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0 rounded-xl bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{c.user.name}</span>
                  <span className="text-[11px] text-gray-400">{fmtDate(c.createdAt, true)}</span>
                  {c.user.id === myId && (
                    <button onClick={() => remove(c.id)} className="ml-auto text-gray-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {c.content.split(/(@[\p{L}\p{N}_]+)/u).map((part, i) =>
                    part.startsWith("@") ? <span key={i} className="text-indigo-600 font-medium">{part}</span> : part
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <AtSign className="w-4 h-4 text-gray-300 absolute left-3 top-3" />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
              }}
              rows={2}
              placeholder="댓글 입력 · @홍길동 으로 동료 호출 (Ctrl+Enter 등록)"
              className={`${input} pl-9`}
            />
          </div>
          <button onClick={post} disabled={posting || !comment.trim()} className={`${btnPrimary} self-end`}>
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
