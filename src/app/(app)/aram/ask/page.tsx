"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, Sparkles, FileAudio, History, Plus, UserRound } from "lucide-react";
import AramNav from "../_components/AramNav";
import AramMarkdown from "../_components/AramMarkdown";
import { api, card, btnGhost, fmtDate } from "../_components/utils";

interface Source { id: string; title: string; startedAt: string }
interface AskResult { answer: string; sources: Source[]; suggestedQuestions: string[] }
interface Turn { question: string; answer?: string; sources?: Source[]; suggestions?: string[]; error?: string }
interface HistoryRow { id: string; question: string; answer: string; sources: string | null; createdAt: string }

const EXAMPLES = [
  "지난달 해외 바이어 미팅에서 약속한 것들 정리해줘",
  "OO사와의 거래는 지금 어디까지 진행됐어?",
  "이번 주 내가 해야 할 일은?",
  "최근 고객들이 가장 많이 말한 불만이나 요청은?",
  "가격 협상이 진행 중인 건들을 리스크와 함께 알려줘",
];

export default function AskPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <AskInner />
    </Suspense>
  );
}

function AskInner() {
  const searchParams = useSearchParams();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  const loadHistory = useCallback(() => {
    api<{ data: HistoryRow[] }>("/api/aram/ask").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  const send = useCallback(async (q: string, prior: Turn[]) => {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    setQuestion("");
    setTurns([...prior, { question: text }]);
    const historyMsgs = prior
      .filter((t) => t.answer)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer! },
      ]);
    try {
      const r = await api<AskResult>("/api/aram/ask", { method: "POST", json: { question: text, history: historyMsgs } });
      setTurns([...prior, { question: text, answer: r.answer, sources: r.sources, suggestions: r.suggestedQuestions }]);
      loadHistory();
    } catch (e) {
      setTurns([...prior, { question: text, error: e instanceof Error ? e.message : "답변 실패" }]);
    } finally {
      setBusy(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialSent.current) {
      initialSent.current = true;
      send(q, []);
    }
  }, [searchParams, send]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busy) send(question, turns);
  };

  const viewHistory = (h: HistoryRow) => {
    let sources: Source[] = [];
    try { sources = h.sources ? JSON.parse(h.sources) : []; } catch { /* ignore */ }
    setTurns([{ question: h.question, answer: h.answer, sources }]);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <AramNav title="Ask 아람" subtitle="팀이 기록한 모든 미팅을 근거로 답합니다 — 근거 미팅 링크가 함께 표시됩니다" />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className={`${card} flex flex-col min-h-[65vh]`}>
          <div className="flex-1 p-5 space-y-6 overflow-y-auto">
            {turns.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">무엇이든 물어보세요</p>
                <p className="text-sm text-gray-500 mt-1 mb-6">사람, 회사, 프로젝트, 약속, 결정 — 아람이 기억합니다.</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => send(ex, [])} className="text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-left">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((t, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-indigo-600 text-white text-sm break-words">{t.question}</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
                    <div className="min-w-0 flex-1">
                      {t.error ? (
                        <p className="text-sm text-rose-600">{t.error}</p>
                      ) : !t.answer ? (
                        <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />미팅 기록을 찾아 읽는 중…</p>
                      ) : (
                        <>
                          <AramMarkdown content={t.answer} />
                          {t.sources && t.sources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {t.sources.map((s) => (
                                <Link key={s.id} href={`/aram/meetings/${s.id}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 hover:text-indigo-700">
                                  <FileAudio className="w-3 h-3" />{s.title}<span className="text-gray-400">· {fmtDate(s.startedAt)}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                          {i === turns.length - 1 && t.suggestions && t.suggestions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {t.suggestions.map((s) => (
                                <button key={s} disabled={busy} onClick={() => send(s, turns)} className="text-xs px-2.5 py-1.5 rounded-full border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={submit} className="border-t border-gray-100 dark:border-gray-700 p-3 flex gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!busy) send(question, turns);
                }
              }}
              rows={1}
              placeholder="질문을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
              className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button type="submit" disabled={busy || !question.trim()} className="px-4 rounded-xl bg-indigo-600 text-white disabled:opacity-50" aria-label="전송">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <aside className={`${card} p-4 h-fit`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5"><History className="w-4 h-4" />질문 기록</h3>
            <button onClick={() => setTurns([])} className={`${btnGhost} !px-2 !py-1 text-xs`}><Plus className="w-3 h-3" />새 대화</button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">아직 질문 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
              {history.map((h) => (
                <li key={h.id}>
                  <button onClick={() => viewHistory(h)} className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <p className="text-sm text-gray-800 dark:text-gray-200 break-words line-clamp-2">{h.question}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(h.createdAt, true)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-500 flex gap-2">
            <UserRound className="w-4 h-4 shrink-0" />
            <span>특정 인물·회사 기준 질문은 명함 상세의 “관계 브리핑”이나 사업 인사이트에서도 할 수 있습니다.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
