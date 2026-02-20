"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crosshair,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Target,
  X,
  Check,
  Pencil,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
}

interface Objective {
  id: string;
  title: string;
  description: string | null;
  type: string;
  ownerId: string;
  ownerName: string;
  period: string;
  status: string;
  progress: number;
  calculatedProgress: number;
  keyResults: KeyResult[];
}

interface KrFormRow {
  title: string;
  targetValue: string;
  unit: string;
}

// ─── Config ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  company: { label: "전사", color: "text-blue-700", bgColor: "bg-blue-100" },
  team: { label: "팀", color: "text-green-700", bgColor: "bg-green-100" },
  personal: { label: "개인", color: "text-gray-700", bgColor: "bg-gray-100" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  on_track: { label: "순조로움", color: "text-green-700", bgColor: "bg-green-100", dotColor: "bg-green-500" },
  at_risk: { label: "주의", color: "text-amber-700", bgColor: "bg-amber-100", dotColor: "bg-amber-500" },
  behind: { label: "지연", color: "text-red-700", bgColor: "bg-red-100", dotColor: "bg-red-500" },
  completed: { label: "완료", color: "text-blue-700", bgColor: "bg-blue-100", dotColor: "bg-blue-500" },
};

const TYPE_TABS = [
  { key: "", label: "전체" },
  { key: "company", label: "전사" },
  { key: "team", label: "팀" },
  { key: "personal", label: "개인" },
];

const QUARTERS = [
  "2026-Q1",
  "2026-Q2",
  "2026-Q3",
  "2026-Q4",
  "2025-Q4",
  "2025-Q3",
];

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

// ─── Page Component ───────────────────────────────────────────────────

export default function OkrPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(getCurrentQuarter());
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("company");
  const [formPeriod, setFormPeriod] = useState(getCurrentQuarter());
  const [formKrs, setFormKrs] = useState<KrFormRow[]>([
    { title: "", targetValue: "", unit: "건" },
  ]);
  const [creating, setCreating] = useState(false);

  // Inline KR edit state
  const [editingKr, setEditingKr] = useState<{ objectiveId: string; krId: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // ─── Fetch Objectives ─────────────────────────────────────────

  const fetchObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/okr?${params}`);
      if (res.ok) {
        const data = await res.json();
        setObjectives(data.objectives || []);
      }
    } catch (e) {
      console.error("OKR fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [period, typeFilter]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  // ─── Summary Calculations ─────────────────────────────────────

  const totalObjectives = objectives.length;
  const avgProgress =
    totalObjectives > 0
      ? Math.round(
          objectives.reduce((s, o) => s + (o.calculatedProgress ?? o.progress), 0) /
            totalObjectives
        )
      : 0;
  const onTrackCount = objectives.filter((o) => o.status === "on_track").length;
  const atRiskCount = objectives.filter((o) => o.status === "at_risk").length;
  const behindCount = objectives.filter((o) => o.status === "behind").length;

  // ─── Toggle expand ────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Create Objective ─────────────────────────────────────────

  const handleCreate = async () => {
    if (!formTitle.trim() || !formPeriod) return;
    setCreating(true);
    try {
      const keyResults = formKrs
        .filter((kr) => kr.title.trim() && kr.targetValue)
        .map((kr) => ({
          title: kr.title.trim(),
          targetValue: kr.targetValue,
          currentValue: 0,
          unit: kr.unit || "건",
        }));

      const res = await fetch("/api/okr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          type: formType,
          period: formPeriod,
          keyResults,
        }),
      });

      if (res.ok) {
        resetCreateForm();
        setShowCreate(false);
        fetchObjectives();
      }
    } catch (e) {
      console.error("OKR create error:", e);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormType("company");
    setFormPeriod(getCurrentQuarter());
    setFormKrs([{ title: "", targetValue: "", unit: "건" }]);
  };

  // ─── KR Form Row Management ───────────────────────────────────

  const addKrRow = () => {
    setFormKrs((prev) => [...prev, { title: "", targetValue: "", unit: "건" }]);
  };

  const removeKrRow = (index: number) => {
    setFormKrs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateKrRow = (index: number, field: keyof KrFormRow, value: string) => {
    setFormKrs((prev) =>
      prev.map((kr, i) => (i === index ? { ...kr, [field]: value } : kr))
    );
  };

  // ─── Update KR Current Value ──────────────────────────────────

  const handleKrUpdate = async (objectiveId: string, kr: KeyResult) => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue === kr.currentValue) {
      setEditingKr(null);
      return;
    }

    try {
      const res = await fetch(`/api/okr/${objectiveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyResults: [
            {
              id: kr.id,
              currentValue: newValue,
            },
          ],
        }),
      });

      if (res.ok) {
        setEditingKr(null);
        fetchObjectives();
      }
    } catch (e) {
      console.error("KR update error:", e);
    }
  };

  // ─── Delete Objective ─────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("이 OKR 목표를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/okr/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchObjectives();
      }
    } catch (e) {
      console.error("OKR delete error:", e);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Crosshair className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">OKR 목표 관리</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  목표(Objective)와 핵심 결과(Key Result) 관리
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  resetCreateForm();
                  setShowCreate(true);
                }}
                className="flex items-center gap-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700"
              >
                <Plus className="w-4 h-4" />
                목표 추가
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── Type Filter Tabs ──────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === tab.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* ─── Summary Cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border p-5">
                <p className="text-xs text-gray-500 mb-1">전체 목표</p>
                <p className="text-2xl font-bold text-gray-900">{totalObjectives}</p>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <p className="text-xs text-gray-500 mb-1">평균 달성률</p>
                <p className="text-2xl font-bold text-violet-600">{avgProgress}%</p>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <p className="text-xs text-gray-500 mb-1">순조로움</p>
                <p className="text-2xl font-bold text-green-600">{onTrackCount}</p>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <p className="text-xs text-gray-500 mb-1">주의</p>
                <p className="text-2xl font-bold text-amber-600">{atRiskCount}</p>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <p className="text-xs text-gray-500 mb-1">지연</p>
                <p className="text-2xl font-bold text-red-600">{behindCount}</p>
              </div>
            </div>

            {/* ─── Objective Cards ─────────────────────────────────── */}
            {objectives.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border">
                <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">
                  {period} 기간에 설정된 OKR 목표가 없습니다
                </p>
                <button
                  onClick={() => {
                    resetCreateForm();
                    setShowCreate(true);
                  }}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm"
                >
                  목표 추가하기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {objectives.map((obj) => {
                  const typeInfo = TYPE_CONFIG[obj.type] || TYPE_CONFIG.company;
                  const statusInfo = STATUS_CONFIG[obj.status] || STATUS_CONFIG.on_track;
                  const progress = obj.calculatedProgress ?? obj.progress;
                  const isExpanded = expandedIds.has(obj.id);

                  return (
                    <div
                      key={obj.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                      {/* Objective Header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}
                              >
                                {typeInfo.label}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">
                              {obj.title}
                            </h3>
                            {obj.description && (
                              <p className="text-sm text-gray-500 line-clamp-2">
                                {obj.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              담당자: {obj.ownerName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleDelete(obj.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Overall Progress */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-500">
                              전체 달성률
                            </span>
                            <span className="text-xs font-bold text-gray-700">
                              {progress}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress >= 100
                                  ? "bg-blue-500"
                                  : progress >= 70
                                  ? "bg-green-500"
                                  : progress >= 40
                                  ? "bg-amber-500"
                                  : "bg-red-400"
                              }`}
                              style={{
                                width: `${Math.min(100, progress)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Toggle Key Results */}
                        {obj.keyResults.length > 0 && (
                          <button
                            onClick={() => toggleExpand(obj.id)}
                            className="flex items-center gap-1 mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            Key Results ({obj.keyResults.length})
                          </button>
                        )}
                      </div>

                      {/* Key Results List */}
                      {isExpanded && obj.keyResults.length > 0 && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 space-y-3">
                          {obj.keyResults.map((kr) => {
                            const isEditing =
                              editingKr?.objectiveId === obj.id &&
                              editingKr?.krId === kr.id;

                            return (
                              <div
                                key={kr.id}
                                className="bg-white rounded-lg border border-gray-100 p-3"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-gray-800">
                                    {kr.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={editValue}
                                          onChange={(e) =>
                                            setEditValue(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                              handleKrUpdate(obj.id, kr);
                                            if (e.key === "Escape")
                                              setEditingKr(null);
                                          }}
                                          className="w-20 px-2 py-1 border rounded text-sm text-right"
                                          autoFocus
                                        />
                                        <span className="text-gray-400">
                                          / {kr.targetValue} {kr.unit}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleKrUpdate(obj.id, kr)
                                          }
                                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingKr(null)}
                                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingKr({
                                            objectiveId: obj.id,
                                            krId: kr.id,
                                          });
                                          setEditValue(
                                            String(kr.currentValue)
                                          );
                                        }}
                                        className="flex items-center gap-1 hover:text-violet-600 transition-colors"
                                      >
                                        <span className="font-semibold text-gray-700">
                                          {kr.currentValue}
                                        </span>
                                        <span>
                                          / {kr.targetValue} {kr.unit}
                                        </span>
                                        <Pencil className="w-3 h-3 ml-0.5 opacity-50" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        kr.progress >= 100
                                          ? "bg-blue-500"
                                          : kr.progress >= 70
                                          ? "bg-green-500"
                                          : kr.progress >= 40
                                          ? "bg-amber-500"
                                          : "bg-red-400"
                                      }`}
                                      style={{
                                        width: `${Math.min(100, kr.progress)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-500 w-10 text-right">
                                    {kr.progress}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Create Modal ────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                OKR 목표 추가
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  목표 제목 *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="예: 매출 30% 성장 달성"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  rows={2}
                  placeholder="목표에 대한 상세 설명"
                />
              </div>

              {/* Type & Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    유형
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="company">전사</option>
                    <option value="team">팀</option>
                    <option value="personal">개인</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기간
                  </label>
                  <select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {QUARTERS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Key Results */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    핵심 결과 (Key Results)
                  </label>
                  <button
                    onClick={addKrRow}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    추가
                  </button>
                </div>
                <div className="space-y-2">
                  {formKrs.map((kr, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={kr.title}
                          onChange={(e) =>
                            updateKrRow(i, "title", e.target.value)
                          }
                          className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="핵심 결과 제목"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={kr.targetValue}
                            onChange={(e) =>
                              updateKrRow(i, "targetValue", e.target.value)
                            }
                            className="w-24 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="목표값"
                          />
                          <input
                            type="text"
                            value={kr.unit}
                            onChange={(e) =>
                              updateKrRow(i, "unit", e.target.value)
                            }
                            className="w-20 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="단위"
                          />
                        </div>
                      </div>
                      {formKrs.length > 1 && (
                        <button
                          onClick={() => removeKrRow(i)}
                          className="p-1 mt-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!formTitle.trim() || creating}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
