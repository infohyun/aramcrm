"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic, Upload, FileText, Square, Pause, Play, Clock, Star, Loader2, AlertTriangle, X, Search, ShieldCheck, CheckCircle2,
} from "lucide-react";
import AramNav from "../_components/AramNav";
import { ARAM_TEMPLATES } from "@/lib/aram/templates";
import { ARAM_LANGUAGES, OUTPUT_LANGUAGES } from "@/lib/aram/languages";
import { api, card, btnPrimary, btnGhost, input, fmtClock, MEETING_TYPES, VISIBILITY } from "../_components/utils";

// ─── Web Speech API 최소 타입 ─────────────────────────────
interface SpeechAlt { transcript: string }
interface SpeechResult { isFinal: boolean; 0: SpeechAlt; length: number }
interface SpeechResultList { length: number; [index: number]: SpeechResult }
interface SpeechEvent { resultIndex: number; results: SpeechResultList }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface WakeLockLike { release: () => Promise<void> }

interface Segment { text: string; startMs: number; endMs: number; language: string | null }
interface ContactLite { id: string; name: string; company: string | null }
interface ProjectLite { id: string; name: string }
interface AramConfig { ai: boolean; stt: "deepgram" | "openai" | "browser"; smtp: boolean }

type Mode = "live" | "upload" | "text";
type Phase = "setup" | "recording" | "processing";

interface Settings {
  title: string;
  meetingType: string;
  template: string;
  language: string;
  summaryLanguage: string;
  visibility: string;
  location: string;
  projectId: string;
  customPrompt: string;
}

const DEFAULT_SETTINGS: Settings = {
  title: "",
  meetingType: "in_person",
  template: "general",
  language: "auto",
  summaryLanguage: "ko",
  visibility: "team",
  location: "",
  projectId: "",
  customPrompt: "",
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <RecordInner />
    </Suspense>
  );
}

function RecordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(initialMode === "upload" || initialMode === "text" ? initialMode : "live");
  const [phase, setPhase] = useState<Phase>("setup");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [config, setConfig] = useState<AramConfig | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ step: number; label: string; pct?: number }>({ step: 0, label: "" });

  // 녹음 상태
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [notes, setNotes] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  // 업로드/텍스트
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [text, setText] = useState("");

  const meetingIdRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const pausedRef = useRef(false);
  const startRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const segStartRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockLike | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api<AramConfig>("/api/aram/config")
      .then((c) => {
        setConfig(c);
        setSpeechSupported(!!getSpeechCtor());
      })
      .catch(() => setSpeechSupported(!!getSpeechCtor()));
    api<{ data: ProjectLite[] }>("/api/projects?limit=100")
      .then((r) => setProjects(r.data ?? []))
      .catch(() => {});
    const cid = searchParams.get("contactId");
    if (cid) {
      api<{ id: string; name: string; company: string | null }>(`/api/aram/contacts/${cid}`)
        .then((c) => setContacts([{ id: c.id, name: c.name, company: c.company }]))
        .catch(() => {});
    }
  }, [searchParams]);

  const now = useCallback(() => {
    if (!startRef.current) return 0;
    const pausedNow = pausedRef.current ? Date.now() - pauseStartRef.current : 0;
    return Date.now() - startRef.current - pausedTotalRef.current - pausedNow;
  }, []);

  // 타이머
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setElapsedMs(now()), 500);
    return () => clearInterval(t);
  }, [phase, now]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [segments, interim]);

  // 녹음 중 이탈 경고
  useEffect(() => {
    if (phase !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // 언마운트 정리
  useEffect(() => {
    return () => {
      activeRef.current = false;
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  const speechLang = settings.language === "auto" ? "ko-KR" : settings.language;

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = speechLang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim();
        if (!t) continue;
        if (r.isFinal) {
          const end = now();
          const start = segStartRef.current ?? Math.max(0, end - t.length * 150);
          segStartRef.current = null;
          setSegments((prev) => [...prev, { text: t, startMs: start, endMs: end, language: speechLang.split("-")[0] }]);
        } else {
          if (segStartRef.current === null) segStartRef.current = now();
          interimText += `${t} `;
        }
      }
      setInterim(interimText.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setSpeechSupported(false);
    };
    rec.onend = () => {
      // 브라우저가 자동 종료해도 녹음 중이면 재시작
      if (activeRef.current && !pausedRef.current) {
        try {
          rec.start();
        } catch {
          /* 이미 시작됨 */
        }
      }
    };
    try {
      rec.start();
    } catch {
      /* noop */
    }
    recognitionRef.current = rec;
  }, [speechLang, now]);

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      audioCtxRef.current = ctx;
    } catch {
      /* 미지원 */
    }
  };

  const createMeeting = async (source: Mode) => {
    const body = {
      ...settings,
      source,
      projectId: settings.projectId || null,
      customPrompt: settings.customPrompt || null,
      contactIds: contacts.map((c) => c.id),
    };
    const m = await api<{ id: string }>("/api/aram/meetings", { method: "POST", json: body });
    meetingIdRef.current = m.id;
    return m.id;
  };

  // ─── 실시간 녹음 ─────────────────────────────
  const handleStart = async () => {
    setError(null);
    if (!consent) {
      setError("녹음 전 상대방에게 녹음 사실을 알리고 동의 체크를 해주세요.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.");
      return;
    }
    try {
      await createMeeting("live");
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : "미팅을 만들지 못했습니다.");
      return;
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;

    startRef.current = Date.now();
    pausedTotalRef.current = 0;
    activeRef.current = true;
    pausedRef.current = false;
    setSegments([]);
    setInterim("");
    setElapsedMs(0);
    setPhase("recording");
    startLevelMeter(stream);
    startRecognition();
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockLike> } };
      if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch {
      /* 화면 유지 미지원 */
    }
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (!pausedRef.current) {
      pausedRef.current = true;
      pauseStartRef.current = Date.now();
      rec.pause();
      recognitionRef.current?.stop();
      setPaused(true);
    } else {
      pausedTotalRef.current += Date.now() - pauseStartRef.current;
      pausedRef.current = false;
      rec.resume();
      startRecognition();
      setPaused(false);
    }
  };

  const insertIntoNotes = (snippet: string) => {
    const el = notesRef.current;
    if (!el) {
      setNotes((n) => `${n}${n && !n.endsWith("\n") ? "\n" : ""}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? notes.length;
    const end = el.selectionEnd ?? notes.length;
    const next = notes.slice(0, start) + snippet + notes.slice(end);
    setNotes(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  };

  const stopAll = async (): Promise<Blob | null> => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    wakeLockRef.current?.release().catch(() => {});
    const rec = recorderRef.current;
    const blob = await new Promise<Blob | null>((resolve) => {
      if (!rec || rec.state === "inactive") return resolve(null);
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    return blob;
  };

  const uploadWithProgress = (id: string, form: FormData, onUpload: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/aram/meetings/${id}/audio`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onUpload(Math.round((e.loaded / e.total) * 100));
      };
      xhr.upload.onload = () => onUpload(100);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          let msg = `처리 실패 (${xhr.status})`;
          try {
            msg = JSON.parse(xhr.responseText).error || msg;
          } catch {
            /* noop */
          }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("네트워크 오류"));
      xhr.send(form);
    });

  const handleStop = async () => {
    const id = meetingIdRef.current;
    if (!id) return;
    const durationSec = Math.round(now() / 1000);
    const pendingInterim = interim.trim();
    const finalSegments = pendingInterim
      ? [...segments, { text: pendingInterim, startMs: segStartRef.current ?? now(), endMs: now(), language: speechLang.split("-")[0] }]
      : segments;
    setPhase("processing");
    setProgress({ step: 1, label: "녹음 파일 업로드 중", pct: 0 });
    const blob = await stopAll();

    try {
      if (notes.trim()) await api(`/api/aram/meetings/${id}`, { method: "PATCH", json: { userNotes: notes } });
      const form = new FormData();
      if (blob && blob.size > 0) {
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        form.append("file", new File([blob], `recording.${ext}`, { type: blob.type }));
      }
      form.append("durationSec", String(durationSec));
      form.append("liveTranscript", JSON.stringify(finalSegments));
      form.append("analyze", "true");
      await uploadWithProgress(id, form, (pct) => {
        if (pct >= 100) setProgress({ step: 2, label: config?.stt !== "browser" ? "화자 분리 · 전사 중" : "전사 정리 중" });
        else setProgress({ step: 1, label: "녹음 파일 업로드 중", pct });
      });
    } catch (e) {
      console.error(e);
    }
    setProgress({ step: 4, label: "완료! 미팅 노트로 이동합니다" });
    router.push(`/aram/meetings/${id}`);
  };

  // 업로드 중 단계 표시용 (서버 응답 대기 중 전사→분석으로 진행)
  useEffect(() => {
    if (phase !== "processing" || progress.step !== 2) return;
    const t = setTimeout(() => setProgress({ step: 3, label: "AI가 요약 · 할 일 · 사업 전망 정리 중" }), 15000);
    return () => clearTimeout(t);
  }, [phase, progress.step]);

  // ─── 파일 업로드 ─────────────────────────────
  const handleUpload = async () => {
    setError(null);
    if (!file) return setError("업로드할 파일을 선택하세요.");
    if (!consent) return setError("녹음 사실 고지 여부를 확인해주세요.");
    setPhase("processing");
    setProgress({ step: 1, label: "업로드 중", pct: 0 });
    let id: string;
    try {
      id = await createMeeting("upload");
    } catch (e) {
      setPhase("setup");
      return setError(e instanceof Error ? e.message : "미팅을 만들지 못했습니다.");
    }
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("analyze", "true");
      await uploadWithProgress(id, form, (pct) => {
        if (pct >= 100) setProgress({ step: 2, label: "화자 분리 · 전사 중" });
        else setProgress({ step: 1, label: "업로드 중", pct });
      });
    } catch (e) {
      console.error(e);
    }
    router.push(`/aram/meetings/${id}`);
  };

  // ─── 텍스트 ─────────────────────────────
  const handleText = async () => {
    setError(null);
    if (!text.trim()) return setError("대화 내용이나 메모를 입력하세요.");
    setPhase("processing");
    setProgress({ step: 3, label: "AI가 요약 · 할 일 · 사업 전망 정리 중" });
    let id: string;
    try {
      id = await createMeeting("text");
    } catch (e) {
      setPhase("setup");
      return setError(e instanceof Error ? e.message : "미팅을 만들지 못했습니다.");
    }
    try {
      await api(`/api/aram/meetings/${id}/transcript`, { method: "PUT", json: { text, analyze: true } });
    } catch (e) {
      console.error(e);
    }
    router.push(`/aram/meetings/${id}`);
  };

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }));

  // ─── 렌더 ─────────────────────────────
  if (phase === "processing") {
    return (
      <div className="max-w-3xl mx-auto">
        <AramNav title="새 미팅" subtitle="녹음을 미팅 노트로 정리하고 있습니다" />
        <ProcessingView step={progress.step} label={progress.label} pct={progress.pct} />
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="max-w-6xl mx-auto">
        <AramNav title={settings.title || "녹음 중"} subtitle="아람이 듣고 있습니다 · 화면을 닫지 마세요" />
        <div className={`${card} p-5 mb-4`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={`relative flex h-4 w-4 ${paused ? "" : ""}`}>
                {!paused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-4 w-4 ${paused ? "bg-gray-400" : "bg-red-500"}`} />
              </span>
              <span className="text-3xl font-mono font-semibold text-gray-900 dark:text-white tabular-nums">{fmtClock(elapsedMs)}</span>
              {paused && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">일시정지</span>}
            </div>
            <div className="flex-1 min-w-[120px] flex items-end gap-0.5 h-8">
              {Array.from({ length: 24 }).map((_, i) => {
                const h = Math.max(0.08, Math.min(1, level * (0.6 + 0.4 * Math.sin((i + elapsedMs / 200) * 0.9))));
                return <div key={i} className="flex-1 rounded-sm bg-indigo-400/80" style={{ height: `${paused ? 8 : h * 100}%` }} />;
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={togglePause} className={btnGhost}>
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {paused ? "계속" : "일시정지"}
              </button>
              <button onClick={handleStop} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                <Square className="w-4 h-4" /> 종료 및 정리
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className={`${card} p-5 lg:col-span-3`}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">실시간 전사</h2>
            {!speechSupported && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                이 브라우저는 실시간 전사를 지원하지 않습니다.{" "}
                {config?.stt !== "browser" ? "녹음 종료 후 서버에서 전사합니다." : "Chrome/Edge 사용을 권장합니다."}
              </p>
            )}
            <div className="h-[50vh] overflow-y-auto space-y-2 pr-1">
              {segments.length === 0 && !interim && (
                <p className="text-sm text-gray-400">말씀을 시작하면 이곳에 실시간으로 표시됩니다…</p>
              )}
              {segments.map((s, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-xs text-gray-400 font-mono pt-0.5 shrink-0">{fmtClock(s.startMs)}</span>
                  <p className="text-gray-800 dark:text-gray-200 break-words">{s.text}</p>
                </div>
              ))}
              {interim && (
                <div className="flex gap-3 text-sm">
                  <span className="text-xs text-gray-300 font-mono pt-0.5 shrink-0">{fmtClock(elapsedMs)}</span>
                  <p className="text-gray-400 italic break-words">{interim}</p>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
            {config?.stt !== "browser" && (
              <p className="mt-3 text-xs text-gray-400">녹음 종료 후 서버 전사로 화자 분리 · 정확도를 보정합니다.</p>
            )}
          </div>
          <div className={`${card} p-5 lg:col-span-2 flex flex-col`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">메모</h2>
              <div className="flex gap-1">
                <button onClick={() => insertIntoNotes(`[${fmtClock(now())}] `)} className={btnGhost} title="타임스탬프 삽입">
                  <Clock className="w-4 h-4" />
                </button>
                <button onClick={() => insertIntoNotes(`⭐ [${fmtClock(now())}] `)} className={btnGhost} title="중요 표시">
                  <Star className="w-4 h-4 text-amber-500" />
                </button>
              </div>
            </div>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="중요한 포인트, 숫자, 떠오르는 생각을 메모하세요. AI 요약에 반영됩니다."
              className={`${input} flex-1 min-h-[40vh] resize-none`}
            />
          </div>
        </div>
      </div>
    );
  }

  const noTranscription = config?.stt === "browser" && !speechSupported;

  return (
    <div className="max-w-5xl mx-auto">
      <AramNav title="새 미팅" subtitle="모든 대화를 미팅으로 — 녹음, 파일, 텍스트 무엇이든 정리합니다" />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {([
          { v: "live", l: "실시간 녹음", i: Mic },
          { v: "upload", l: "파일 업로드", i: Upload },
          { v: "text", l: "텍스트 붙여넣기", i: FileText },
        ] as const).map((t) => (
          <button
            key={t.v}
            onClick={() => { setMode(t.v); setError(null); }}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-sm font-medium border ${
              mode === t.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
            }`}
          >
            <t.i className="w-4 h-4" />
            {t.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-5 lg:col-span-2 space-y-4`}>
          {mode === "live" && (
            <div className="text-center py-6">
              <button
                onClick={handleStart}
                aria-label="녹음 시작"
                className="w-28 h-28 rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center mx-auto"
              >
                <Mic className="w-12 h-12" />
              </button>
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">눌러서 녹음 시작</p>
              <p className="mt-1 text-xs text-gray-500">대면 미팅·전화(스피커)·화상회의 모두 기록할 수 있습니다</p>
              {!speechSupported && config?.stt !== "browser" && (
                <p className="mt-3 text-xs text-blue-700 bg-blue-50 rounded-lg p-2 inline-block">
                  이 브라우저는 실시간 전사를 지원하지 않아 녹음 종료 후 서버에서 전사합니다.
                </p>
              )}
              {noTranscription && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-2 inline-flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> 전사 불가: Chrome/Edge를 사용하거나 관리자에게 서버 전사 키 설정을 요청하세요.
                </p>
              )}
            </div>
          )}

          {mode === "upload" && (
            <div>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFile(f);
                }}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-colors ${
                  dragOver ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200 dark:border-gray-600"
                }`}
              >
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">녹음·영상 파일을 끌어다 놓거나 클릭해서 선택</p>
                <p className="text-xs text-gray-500 mt-1">mp3, m4a, wav, webm, mp4 등 · 최대 500MB</p>
                <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {file && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm">
                  <span className="break-all">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</span>
                  <button onClick={() => setFile(null)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
              )}
              {config?.stt === "browser" && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  파일 전사에는 서버 전사 키(DEEPGRAM_API_KEY 또는 OPENAI_API_KEY)가 필요합니다. 관리자에게 설정을 요청하세요.
                </p>
              )}
              <button onClick={handleUpload} disabled={!file} className={`${btnPrimary} mt-4 w-full`}>
                <Upload className="w-4 h-4" /> 업로드하고 정리하기
              </button>
            </div>
          )}

          {mode === "text" && (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={16}
                placeholder={"대화록, 회의 메모, 메신저 대화를 붙여넣으세요.\n\n예)\n김대표: 다음 달까지 샘플 200개 가능할까요?\n박팀장: 네, 15일까지 발송하겠습니다."}
                className={`${input} font-mono`}
              />
              <p className="text-xs text-gray-500 mt-2">&quot;이름: 발언&quot; 형식이면 화자를 자동으로 인식합니다.</p>
              <button onClick={handleText} className={`${btnPrimary} mt-4 w-full`}>
                <FileText className="w-4 h-4" /> AI로 정리하기
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}

          {mode !== "text" && (
            <label className="flex items-start gap-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/10 p-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>
                <ShieldCheck className="w-4 h-4 inline text-emerald-600 mr-1" />
                상대방에게 녹음 사실을 알렸습니다. <span className="text-xs text-gray-500">(신뢰와 개인정보 보호를 위해 녹음 전 고지를 권장합니다)</span>
              </span>
            </label>
          )}
        </div>

        <SettingsPanel
          settings={settings}
          set={set}
          contacts={contacts}
          setContacts={setContacts}
          projects={projects}
        />
      </div>
    </div>
  );
}

function ProcessingView({ step, label, pct }: { step: number; label: string; pct?: number }) {
  const steps = ["업로드", "전사 · 화자 분리", "AI 분석"];
  return (
    <div className={`${card} p-8 text-center`}>
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
      <p className="text-base font-medium text-gray-900 dark:text-white">{label}</p>
      {pct !== undefined && step === 1 && (
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden max-w-sm mx-auto">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="mt-6 flex justify-center gap-2 flex-wrap">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <span
              key={s}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                done ? "bg-emerald-100 text-emerald-700" : active ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {s}
            </span>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-gray-500">긴 미팅은 수 분이 걸릴 수 있습니다. 창을 닫아도 서버에서 계속 처리됩니다.</p>
    </div>
  );
}

function SettingsPanel({
  settings, set, contacts, setContacts, projects,
}: {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  contacts: ContactLite[];
  setContacts: (c: ContactLite[]) => void;
  projects: ProjectLite[];
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ContactLite[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) return setResults([]);
      api<{ data: ContactLite[] }>(`/api/aram/contacts?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => setResults(r.data))
        .catch(() => setResults([]));
    }, q.trim() ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  const label = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";
  return (
    <div className={`${card} p-5 space-y-3`}>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">미팅 설정</h2>
      <div>
        <label className={label}>제목 (비우면 AI가 지어줍니다)</label>
        <input value={settings.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="예: OO사 수출 협의" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>미팅 유형</label>
          <select value={settings.meetingType} onChange={(e) => set("meetingType", e.target.value)} className={input}>
            {MEETING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>공개 범위</label>
          <select value={settings.visibility} onChange={(e) => set("visibility", e.target.value)} className={input}>
            {VISIBILITY.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={label}>요약 템플릿</label>
        <select value={settings.template} onChange={(e) => set("template", e.target.value)} className={input}>
          {ARAM_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>대화 언어</label>
          <select value={settings.language} onChange={(e) => set("language", e.target.value)} className={input}>
            <option value="auto">자동 감지 (다국어)</option>
            {ARAM_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>요약 언어</label>
          <select value={settings.summaryLanguage} onChange={(e) => set("summaryLanguage", e.target.value)} className={input}>
            {OUTPUT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
      </div>
      {settings.language === "auto" && (
        <p className="text-[11px] text-gray-400 -mt-1">실시간 화면 전사는 한국어 기준으로 표시되며, 서버 전사 시 언어를 자동 감지합니다.</p>
      )}
      <div>
        <label className={label}>참석자 (명함)</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {contacts.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs">
              {c.name}{c.company ? ` · ${c.company}` : ""}
              <button onClick={() => setContacts(contacts.filter((x) => x.id !== c.id))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className={`${input} pl-9`} placeholder="이름·회사로 검색" />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white dark:bg-gray-800 shadow-lg max-h-56 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    if (!contacts.some((c) => c.id === r.id)) setContacts([...contacts, r]);
                    setQ("");
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {r.name} <span className="text-gray-400 text-xs">{r.company}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">대화에서 언급된 외부인은 AI가 명함첩에 자동 연결합니다.</p>
      </div>
      <div>
        <label className={label}>프로젝트</label>
        <select value={settings.projectId} onChange={(e) => set("projectId", e.target.value)} className={input}>
          <option value="">연결 안 함</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className={label}>장소</label>
        <input value={settings.location} onChange={(e) => set("location", e.target.value)} className={input} placeholder="예: 본사 회의실, 코엑스 부스" />
      </div>
      <div>
        <label className={label}>AI 추가 지시 (선택)</label>
        <textarea value={settings.customPrompt} onChange={(e) => set("customPrompt", e.target.value)} rows={2} className={input} placeholder="예: 가격 조건과 MOQ를 특히 자세히" />
      </div>
    </div>
  );
}
