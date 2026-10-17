"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Star, Pencil, Check, X, Languages, Users } from "lucide-react";
import { languageName } from "@/lib/aram/languages";
import { api, card, input, fmtClock } from "../../../_components/utils";
import type { Meeting, Segment, Speaker } from "./types";
import { parseJson, speakerDisplay } from "./types";
import SpeakersPanel from "./SpeakersPanel";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

interface Group {
  speaker: Speaker | undefined;
  segments: Segment[];
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/40 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {highlight(text.slice(idx + q.length), q)}
    </>
  );
}

export default function TranscriptPanel({ meeting, onChange }: { meeting: Meeting; onChange: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [currentMs, setCurrentMs] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [q, setQ] = useState("");
  const [onlyHighlights, setOnlyHighlights] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [segments, setSegments] = useState(meeting.segments);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [follow, setFollow] = useState(true);
  const editable = meeting.canEdit;

  // 서버 데이터가 갱신되면 로컬 편집 상태를 동기화
  const [sourceSegments, setSourceSegments] = useState(meeting.segments);
  if (sourceSegments !== meeting.segments) {
    setSourceSegments(meeting.segments);
    setSegments(meeting.segments);
  }

  const translationLangs = useMemo(() => {
    const set = new Set<string>();
    segments.forEach((s) => Object.keys(parseJson<Record<string, string>>(s.translation, {})).forEach((k) => set.add(k)));
    return [...set];
  }, [segments]);
  const [showLang, setShowLang] = useState<string>("");

  const speakerMap = useMemo(() => new Map(meeting.speakers.map((s) => [s.id, s])), [meeting.speakers]);

  const filtered = useMemo(
    () =>
      segments.filter(
        (s) =>
          (!onlyHighlights || s.isHighlight) &&
          (!q ||
            s.text.toLowerCase().includes(q.toLowerCase()) ||
            speakerDisplay(speakerMap.get(s.speakerId ?? "")).toLowerCase().includes(q.toLowerCase()))
      ),
    [segments, q, onlyHighlights, speakerMap]
  );

  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const s of filtered) {
      const last = out[out.length - 1];
      if (last && last.speaker?.id === (s.speakerId ?? undefined) && !q && !onlyHighlights) last.segments.push(s);
      else out.push({ speaker: speakerMap.get(s.speakerId ?? ""), segments: [s] });
    }
    return out;
  }, [filtered, speakerMap, q, onlyHighlights]);

  const activeId = useMemo(() => {
    if (currentMs < 0) return null;
    let active: Segment | null = null;
    for (const s of segments) {
      if (s.startMs <= currentMs) active = s;
      else break;
    }
    return active?.id ?? null;
  }, [currentMs, segments]);

  useEffect(() => {
    if (!follow || !activeId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-seg="${activeId}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeId, follow]);

  const seek = (ms: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = ms / 1000;
    a.play().catch(() => {});
  };

  const patchSegment = async (id: string, data: Record<string, unknown>) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    try {
      await api(`/api/aram/meetings/${meeting.id}/transcript`, { method: "PATCH", json: { segmentId: id, ...data } });
    } catch (e) {
      alert(e instanceof Error ? e.message : "수정 실패");
      onChange();
    }
  };

  const saveEdit = async () => {
    if (editingId && draft.trim()) await patchSegment(editingId, { text: draft.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-4 lg:sticky lg:top-0">
      {meeting.audioUrl && (
        <div className={`${card} p-3`}>
          <audio
            ref={audioRef}
            src={`/api/aram/meetings/${meeting.id}/audio`}
            controls
            preload="metadata"
            className="w-full"
            onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-gray-500 mr-1">속도</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSpeed(s);
                  if (audioRef.current) audioRef.current.playbackRate = s;
                }}
                className={`px-2 py-0.5 rounded-md ${speed === s ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
              >
                {s}x
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1 text-gray-500">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> 자동 스크롤
            </label>
          </div>
        </div>
      )}

      <div className={`${card} p-4`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mr-auto">전사문 <span className="text-gray-400 font-normal">{segments.length}</span></h2>
          <button
            onClick={() => setShowSpeakers((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${showSpeakers ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
          >
            <Users className="w-3.5 h-3.5" /> 화자 {meeting.speakers.length}
          </button>
          <button
            onClick={() => setOnlyHighlights((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${onlyHighlights ? "bg-amber-100 text-amber-700" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
          >
            <Star className="w-3.5 h-3.5" /> 중요
          </button>
          {translationLangs.length > 0 && (
            <select value={showLang} onChange={(e) => setShowLang(e.target.value)} className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1">
              <option value="">원문만</option>
              {translationLangs.map((l) => <option key={l} value={l}>+ {languageName(l)} 번역</option>)}
            </select>
          )}
        </div>

        {showSpeakers && <SpeakersPanel meeting={meeting} onChange={onChange} />}

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="전사문 검색" className={`${input} pl-9`} />
        </div>

        <div ref={listRef} className="max-h-[65vh] overflow-y-auto space-y-4 pr-1">
          {segments.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">전사문이 없습니다.</p>}
          {segments.length > 0 && filtered.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">검색 결과가 없습니다.</p>}
          {groups.map((g, gi) => (
            <div key={`${g.segments[0].id}-${gi}`} className="flex gap-3">
              <div
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: g.speaker?.color ?? "#9ca3af" }}
                title={speakerDisplay(g.speaker)}
              >
                {speakerDisplay(g.speaker).slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{speakerDisplay(g.speaker)}</span>
                  {g.speaker?.role && <span className="text-[11px] text-gray-400 break-words">{g.speaker.role}</span>}
                </div>
                {g.segments.map((s) => {
                  const tr = showLang ? parseJson<Record<string, string>>(s.translation, {})[showLang] : null;
                  const active = s.id === activeId;
                  return (
                    <div
                      key={s.id}
                      data-seg={s.id}
                      className={`group relative rounded-lg px-2 py-1 -mx-2 text-sm ${active ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"} ${s.isHighlight ? "border-l-2 border-amber-400" : ""}`}
                    >
                      <button onClick={() => seek(s.startMs)} className="text-[11px] font-mono text-indigo-500 hover:underline mr-2" disabled={!meeting.audioUrl}>
                        {fmtClock(s.startMs)}
                      </button>
                      {editingId === s.id ? (
                        <div className="mt-1">
                          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className={input} autoFocus />
                          <div className="flex gap-1 mt-1">
                            <button onClick={saveEdit} className="p-1 rounded bg-indigo-600 text-white"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded bg-gray-100"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200 break-words">{highlight(s.text, q)}</span>
                      )}
                      {tr && (
                        <p className="text-gray-500 dark:text-gray-400 text-[13px] mt-0.5 flex gap-1 break-words">
                          <Languages className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {tr}
                        </p>
                      )}
                      {editable && editingId !== s.id && (
                        <span className="absolute right-1 top-1 hidden group-hover:flex gap-0.5 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                          <button onClick={() => patchSegment(s.id, { isHighlight: !s.isHighlight })} className="p-1" title="중요 표시">
                            <Star className={`w-3.5 h-3.5 ${s.isHighlight ? "fill-amber-400 text-amber-400" : "text-gray-400"}`} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(s.id);
                              setDraft(s.text);
                            }}
                            className="p-1"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </span>
                      )}
                      {!editable && s.isHighlight && <Star className="inline w-3 h-3 ml-1 fill-amber-400 text-amber-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
