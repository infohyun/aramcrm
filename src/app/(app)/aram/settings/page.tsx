"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, AudioLines, Mail, BellRing, BookA, ShieldCheck, Globe, Smartphone, Loader2, Plus, X, CheckCircle2, AlertCircle, Lock, Users, Building2 } from "lucide-react";
import AramNav from "../_components/AramNav";
import { ARAM_LANGUAGES } from "@/lib/aram/languages";
import { api, card, btnPrimary, input } from "../_components/utils";

interface Config { ai: boolean; model: string; stt: "deepgram" | "openai" | "browser"; diarization: string; smtp: boolean; cron: boolean }
interface Term { id: string; term: string; note: string | null }

const STT_INFO: Record<Config["stt"], { name: string; desc: string }> = {
  deepgram: { name: "Deepgram Nova (서버 전사)", desc: "음성 기반 화자 분리 + 다국어 자동 감지·코드 스위칭. 가장 정확한 화자 구분을 제공합니다." },
  openai: { name: "OpenAI Whisper (서버 전사)", desc: "99개 언어 고정밀 전사. 화자 분리는 AI가 문맥으로 추정합니다." },
  browser: { name: "브라우저 실시간 전사", desc: "Chrome/Edge 음성 인식으로 전사합니다. 별도 비용이 없지만 정확도와 화자 분리(문맥 추정)에 한계가 있습니다." },
};

export default function AramSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [newTerms, setNewTerms] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTerms = useCallback(() => {
    api<{ data: Term[] }>("/api/aram/glossary").then((r) => setTerms(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api<Config>("/api/aram/config").then(setConfig).catch(() => {});
    loadTerms();
  }, [loadTerms]);

  const addTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerms.trim()) return;
    setSaving(true);
    try {
      await api("/api/aram/glossary", { method: "POST", json: { term: newTerms } });
      setNewTerms("");
      loadTerms();
    } catch (err) {
      alert(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setSaving(false);
    }
  };

  const removeTerm = async (id: string) => {
    setTerms((t) => t.filter((x) => x.id !== id));
    await api(`/api/aram/glossary?id=${id}`, { method: "DELETE" }).catch(loadTerms);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain";

  return (
    <div className="max-w-5xl mx-auto">
      <AramNav title="아람 설정" subtitle="엔진 상태, 전사 정확도, 공유·개인정보 정책" />

      {/* 엔진 상태 */}
      <section className="grid md:grid-cols-2 gap-4 mb-6">
        {!config ? (
          <div className={`${card} p-6 md:col-span-2 flex justify-center`}><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <>
            <StatusCard icon={Brain} title="AI 분석 엔진" ok={config.ai} status={config.ai ? `Claude · ${config.model}` : "비활성화"}
              desc="요약, 화자 추정, 액션 아이템, 사업 전망, 번역, 이메일 작성, Ask 아람에 사용됩니다."
              env={config.ai ? undefined : ["ANTHROPIC_API_KEY=...", "ARAM_AI_MODEL=claude-opus-5-5 (선택)"]} />
            <StatusCard icon={AudioLines} title="음성 전사 엔진" ok={config.stt !== "browser"} status={STT_INFO[config.stt].name}
              desc={`${STT_INFO[config.stt].desc} 화자 분리: ${config.diarization === "server" ? "음성 기반" : "AI 문맥 추정"}`}
              env={config.stt === "browser" ? ["DEEPGRAM_API_KEY=... (권장 · 화자 분리)", "또는 OPENAI_API_KEY=..."] : config.stt === "openai" ? ["DEEPGRAM_API_KEY=... (화자 분리 향상)"] : undefined} />
            <StatusCard icon={Mail} title="이메일 발송 (SMTP)" ok={config.smtp} status={config.smtp ? "설정됨" : "미설정"}
              desc="미팅 후속 메일·답장을 아람에서 바로 보냅니다. 답장은 작성자 메일 주소로 돌아옵니다."
              env={config.smtp ? undefined : ["SMTP_HOST=smtp.gmail.com", "SMTP_USER=...", "SMTP_PASS=...", "SMTP_FROM=..."]} />
            <StatusCard icon={BellRing} title="리마인더 자동 실행" ok={config.cron} status={config.cron ? "크론 사용 가능" : "접속 시에만 점검"}
              desc="마감 임박·지연된 할 일, 팔로업 시점이 된 명함을 알림·이메일로 알려줍니다. 크론 미설정 시 아람 홈 접속 때마다 본인 리마인더를 점검합니다."
              env={config.cron ? undefined : ["CRON_SECRET=임의의-긴-문자열"]}
              extra={<pre className="mt-2 text-[11px] bg-gray-900 text-gray-100 rounded-lg p-2 overflow-x-auto">{`# 매 시간 실행 예시\ncurl -H "Authorization: Bearer $CRON_SECRET" \\\n  ${origin}/api/aram/cron/reminders`}</pre>} />
          </>
        )}
      </section>

      {/* 용어집 */}
      <section className={`${card} p-5 mb-6`}>
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><BookA className="w-4 h-4 text-indigo-600" />용어집</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">제품명·회사명·전문 용어를 등록하면 서버 전사 시 인식 정확도가 올라갑니다. (쉼표 또는 줄바꿈으로 여러 개 추가)</p>
        <form onSubmit={addTerms} className="flex flex-col sm:flex-row gap-2 mb-4">
          <textarea className={`${input} min-h-[42px]`} rows={1} value={newTerms} onChange={(e) => setNewTerms(e.target.value)} placeholder="예: 아람휴비스, LILAI, 두피진단기, 마크뷰" />
          <button type="submit" className={`${btnPrimary} shrink-0`} disabled={saving || !newTerms.trim()}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}추가</button>
        </form>
        {terms.length === 0 ? <p className="text-sm text-gray-400">등록된 용어가 없습니다.</p> : (
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-sm text-indigo-700 dark:text-indigo-300">
                {t.term}
                <button onClick={() => removeTerm(t.id)} className="p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20" aria-label={`${t.term} 삭제`}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 개인정보 */}
      <section className={`${card} p-5 mb-6`}>
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />개인정보 · 녹음 안내</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>녹음 전에 상대방에게 녹음 사실과 목적(회의록 작성)을 알리고 동의를 받는 것을 권장합니다. 해외 일부 국가는 모든 참여자의 동의가 법적으로 필요합니다.</li>
          <li>녹음 파일과 명함 이미지는 공개 웹 폴더가 아닌 비공개 저장소에 보관되며, 로그인한 권한 있는 사용자만 열람할 수 있습니다.</li>
          <li>미팅을 삭제하면 녹음 파일, 전사문, 연결된 캘린더 일정이 함께 삭제됩니다.</li>
        </ul>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {[
            { icon: Lock, t: "나만 보기", d: "작성자(와 관리자)만 열람" },
            { icon: Users, t: "우리 팀", d: "같은 부서 구성원이 열람·정리 참여" },
            { icon: Building2, t: "전사 공유", d: "모든 임직원이 검색·열람 — 회사 지식 자산" },
          ].map((v) => (
            <div key={v.t} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5"><v.icon className="w-4 h-4 text-indigo-600" />{v.t}</p>
              <p className="text-xs text-gray-500 mt-1">{v.d}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">할 일 담당자나 화자로 연결된 직원은 공개 범위와 관계없이 해당 미팅을 볼 수 있습니다.</p>
      </section>

      {/* 모바일 */}
      <section className={`${card} p-5 mb-6`}>
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Smartphone className="w-4 h-4 text-indigo-600" />휴대폰에서 바로 녹음하기</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">휴대폰 브라우저에서 아람을 연 뒤 <b>공유 → 홈 화면에 추가</b>(iPhone Safari) 또는 <b>메뉴 → 앱 설치</b>(Android Chrome)를 선택하면 앱처럼 실행해 미팅 현장에서 바로 녹음할 수 있습니다. 녹음 중에는 화면을 켜 두세요.</p>
      </section>

      {/* 언어 */}
      <section className={`${card} p-5`}>
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-600" />지원 언어 ({ARAM_LANGUAGES.length}개 실시간 · 서버 전사 시 100여 개 자동 감지)</h2>
        <p className="text-sm text-gray-500 mt-1 mb-3">요약·번역·이메일은 아래 모든 언어로 생성할 수 있습니다.</p>
        <div className="flex flex-wrap gap-1.5">
          {ARAM_LANGUAGES.map((l) => (
            <span key={l.code} className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{l.name} <span className="text-gray-400">{l.native}</span></span>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusCard({ icon: Icon, title, ok, status, desc, env, extra }: {
  icon: React.ElementType; title: string; ok: boolean; status: string; desc: string; env?: string[]; extra?: React.ReactNode;
}) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Icon className="w-4 h-4 text-indigo-600" />{title}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{ok ? "정상" : "설정 필요"}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2 break-words">{status}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
      {env && (
        <div className="mt-2">
          <p className="text-[11px] text-gray-500 mb-1">서버 환경 변수 (.env)</p>
          <pre className="text-[11px] bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg p-2 overflow-x-auto">{env.join("\n")}</pre>
        </div>
      )}
      {extra}
    </div>
  );
}
