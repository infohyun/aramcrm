"use client";

import { useEffect, useState } from "react";
import { Building2, FolderKanban, Loader2, Copy, Check, Sparkles, LineChart, ClipboardList, Search } from "lucide-react";
import AramNav from "../_components/AramNav";
import AramMarkdown from "../_components/AramMarkdown";
import { api, card, btnGhost, btnPrimary, input } from "../_components/utils";

interface Targets {
  companies: { company: string; contacts: number }[];
  projects: { id: string; name: string; status: string; _count: { aramMeetings: number } }[];
}
interface Insight { label: string; content: string; meetingCount: number }
type Target = { type: "company" | "project"; key: string; label: string };

const MODES = [
  { v: "brief", l: "관계·사업 브리핑", icon: LineChart, desc: "지금까지의 흐름, 향후 시나리오, 액션 플랜" },
  { v: "prep", l: "미팅 준비", icon: ClipboardList, desc: "다음 미팅 목표, 꼭 물어볼 질문, 주의점" },
] as const;

export default function InsightsPage() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [mode, setMode] = useState<"brief" | "prep">("brief");
  const [selected, setSelected] = useState<Target | null>(null);
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<Insight | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Targets>("/api/aram/insights")
      .then(setTargets)
      .catch(() => setTargets({ companies: [], projects: [] }))
      .finally(() => setLoadingTargets(false));
  }, []);

  const run = async (t: Target, m = mode) => {
    setSelected(t);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api<Insight>("/api/aram/insights", { method: "POST", json: { type: t.type, key: t.key, mode: m } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <AramNav title="사업 인사이트" subtitle="회사·프로젝트별로 쌓인 미팅과 이메일을 엮어, 사업이 어디로 가고 있는지 보여줍니다" />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <div className={`${card} p-4`}>
            <p className="text-xs font-semibold text-gray-500 mb-2">분석 유형</p>
            <div className="space-y-2">
              {MODES.map((m) => (
                <button
                  key={m.v}
                  onClick={() => { setMode(m.v); if (selected && !busy) run(selected, m.v); }}
                  className={`w-full text-left p-3 rounded-xl border transition ${mode === m.v ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5"><m.icon className="w-4 h-4 text-indigo-600" />{m.l}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className={`${card} p-4`}>
            <p className="text-xs font-semibold text-gray-500 mb-2">회사 직접 입력</p>
            <form
              onSubmit={(e) => { e.preventDefault(); if (company.trim()) run({ type: "company", key: company.trim(), label: company.trim() }); }}
              className="flex gap-2"
            >
              <input className={input} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사명" />
              <button type="submit" className={btnGhost} disabled={busy || !company.trim()} aria-label="분석"><Search className="w-4 h-4" /></button>
            </form>
          </div>

          <div className={`${card} p-4`}>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />미팅이 있는 회사</p>
            {loadingTargets ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : targets?.companies.length ? (
              <ul className="space-y-0.5 max-h-72 overflow-y-auto">
                {targets.companies.map((c) => (
                  <li key={c.company}>
                    <button disabled={busy} onClick={() => run({ type: "company", key: c.company, label: c.company })} className={`w-full flex justify-between gap-2 text-left text-sm px-2 py-1.5 rounded-lg ${selected?.key === c.company ? "bg-indigo-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                      <span className="break-words min-w-0">{c.company}</span><span className="text-xs opacity-70 shrink-0">{c.contacts}명</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-gray-400">명함과 연결된 미팅이 쌓이면 표시됩니다.</p>}
          </div>

          <div className={`${card} p-4`}>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5" />미팅이 연결된 프로젝트</p>
            {loadingTargets ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : targets?.projects.length ? (
              <ul className="space-y-0.5 max-h-72 overflow-y-auto">
                {targets.projects.map((p) => (
                  <li key={p.id}>
                    <button disabled={busy} onClick={() => run({ type: "project", key: p.id, label: p.name })} className={`w-full flex justify-between gap-2 text-left text-sm px-2 py-1.5 rounded-lg ${selected?.key === p.id ? "bg-indigo-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                      <span className="break-words min-w-0">{p.name}</span><span className="text-xs opacity-70 shrink-0">{p._count.aramMeetings}건</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-gray-400">미팅 상세에서 프로젝트를 연결하면 표시됩니다.</p>}
          </div>
        </aside>

        <section className={`${card} p-6 min-h-[60vh]`}>
          {busy ? (
            <div className="flex flex-col items-center justify-center text-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p className="font-medium text-gray-900 dark:text-white">{selected?.label} — 분석 중</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">모든 미팅·이메일·할 일을 시간순으로 읽고 흐름과 전망을 정리하고 있습니다. 기록이 많으면 최대 1분 정도 걸릴 수 있어요.</p>
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : result ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white break-words">{result.label}</h2>
                  <p className="text-xs text-gray-500">{MODES.find((m) => m.v === mode)?.l} · 근거 미팅 {result.meetingCount}건</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={copy} className={btnGhost}>{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}{copied ? "복사됨" : "복사"}</button>
                  {selected && <button onClick={() => run(selected)} className={btnPrimary}><Sparkles className="w-4 h-4" />다시 생성</button>}
                </div>
              </div>
              <AramMarkdown content={result.content} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-24">
              <LineChart className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900 dark:text-white">회사나 프로젝트를 선택하세요</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">아람이 지금까지의 관계 흐름과 앞으로의 전개 시나리오, 그리고 담당·기한이 담긴 액션 플랜을 제시합니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
