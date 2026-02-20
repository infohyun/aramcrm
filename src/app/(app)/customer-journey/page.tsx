"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Route,
  Loader2,
  ChevronRight,
  ArrowRightLeft,
  X,
  Search,
  Clock,
  User,
  StickyNote,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface StageData {
  stage: string;
  count: number;
}

interface ConversionData {
  from: string;
  to: string;
  rate: number;
}

interface RecentChange {
  id: string;
  customerName: string;
  fromStage: string;
  toStage: string;
  date: string;
  notes: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  company: string | null;
}

// ─── Stage Config ──────────────────────────────────────────

const STAGES = [
  { key: "lead", label: "리드", color: "#3b82f6", bg: "bg-blue-500", bgLight: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { key: "consultation", label: "상담", color: "#06b6d4", bg: "bg-cyan-500", bgLight: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700" },
  { key: "proposal", label: "제안", color: "#6366f1", bg: "bg-indigo-500", bgLight: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  { key: "negotiation", label: "협상", color: "#f59e0b", bg: "bg-amber-500", bgLight: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  { key: "contract", label: "계약", color: "#22c55e", bg: "bg-green-500", bgLight: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  { key: "retention", label: "유지", color: "#10b981", bg: "bg-emerald-500", bgLight: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { key: "churn_risk", label: "이탈위험", color: "#ef4444", bg: "bg-red-500", bgLight: "bg-red-50", border: "border-red-200", text: "text-red-700" },
] as const;

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

function getStageLabelAndColor(key: string) {
  return STAGE_MAP[key] || { key, label: key, color: "#9ca3af", bg: "bg-gray-500", bgLight: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────────

export default function CustomerJourneyPage() {
  const [stages, setStages] = useState<StageData[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [targetStage, setTargetStage] = useState("");
  const [moveNotes, setMoveNotes] = useState("");
  const [moving, setMoving] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // ─── Fetch journey data ──────────────────────────────────
  const fetchJourney = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-journey");
      if (res.ok) {
        const data = await res.json();
        setStages(data.stages || []);
        setConversions(data.conversions || []);
        setRecentChanges(data.recentChanges || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  // ─── Load customers for modal ────────────────────────────
  const loadCustomers = async (search?: string) => {
    setLoadingCustomers(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "?limit=100";
      const res = await fetch(`/api/customers${q}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleOpenMoveModal = () => {
    setShowMoveModal(true);
    setSelectedCustomerId("");
    setTargetStage("");
    setMoveNotes("");
    setCustomerSearch("");
    loadCustomers();
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    loadCustomers(value);
  };

  // ─── Move customer ──────────────────────────────────────
  const handleMoveCustomer = async () => {
    if (!selectedCustomerId || !targetStage) return;
    setMoving(true);
    try {
      const res = await fetch("/api/customer-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          stage: targetStage,
          notes: moveNotes || null,
        }),
      });
      if (res.ok) {
        setShowMoveModal(false);
        fetchJourney();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMoving(false);
    }
  };

  // ─── Build chart data ────────────────────────────────────
  const chartData = STAGES.map((s) => {
    const found = stages.find((st) => st.stage === s.key);
    return {
      name: s.label,
      count: found?.count || 0,
      color: s.color,
    };
  });

  // ─── Max count for funnel width ──────────────────────────
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  // ─── Conversion lookup ──────────────────────────────────
  function getConversionRate(from: string, to: string): number | null {
    const c = conversions.find((cv) => cv.from === from && cv.to === to);
    return c ? c.rate : null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-fuchsia-100 rounded-lg">
                <Route className="w-6 h-6 text-fuchsia-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  고객 여정 맵
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  고객의 단계별 이동 현황 및 전환율 분석
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenMoveModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-700 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              고객 이동
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* ─── Funnel Visualization ───────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">
                퍼널 파이프라인
              </h2>
              <div className="flex items-center justify-center gap-0 overflow-x-auto pb-2">
                {STAGES.map((stage, idx) => {
                  const found = stages.find((s) => s.stage === stage.key);
                  const count = found?.count || 0;
                  // Calculate width proportional to count, min 80px
                  const widthPercent = maxCount > 0 ? Math.max(0.35, count / maxCount) : 0.35;
                  const nextStage = STAGES[idx + 1];
                  const convRate = nextStage
                    ? getConversionRate(stage.key, nextStage.key)
                    : null;

                  return (
                    <div key={stage.key} className="flex items-center flex-shrink-0">
                      {/* Stage Box */}
                      <div
                        className="relative flex flex-col items-center justify-center rounded-xl border-2 transition-all"
                        style={{
                          minWidth: "90px",
                          width: `${Math.round(widthPercent * 140)}px`,
                          height: `${Math.round(widthPercent * 90 + 30)}px`,
                          backgroundColor: `${stage.color}10`,
                          borderColor: `${stage.color}40`,
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-xl opacity-10"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span
                          className="relative text-xs font-bold uppercase tracking-wide"
                          style={{ color: stage.color }}
                        >
                          {stage.label}
                        </span>
                        <span
                          className="relative text-2xl font-extrabold mt-0.5"
                          style={{ color: stage.color }}
                        >
                          {count}
                        </span>
                        <span className="relative text-[10px] text-gray-400">명</span>
                      </div>

                      {/* Arrow + Conversion Rate */}
                      {idx < STAGES.length - 1 && (
                        <div className="flex flex-col items-center mx-1 flex-shrink-0">
                          <ChevronRight
                            className="w-5 h-5 text-gray-300"
                          />
                          {convRate !== null && (
                            <span className="text-[10px] font-semibold text-gray-500 mt-0.5 whitespace-nowrap">
                              {convRate}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Conversion Rates Grid ─────────────────── */}
            {conversions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  단계별 전환율
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {conversions.map((c) => {
                    const fromStage = getStageLabelAndColor(c.from);
                    const toStage = getStageLabelAndColor(c.to);
                    return (
                      <div
                        key={`${c.from}-${c.to}`}
                        className="bg-gray-50 rounded-lg p-3 text-center"
                      >
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${fromStage.color}20`,
                              color: fromStage.color,
                            }}
                          >
                            {fromStage.label}
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${toStage.color}20`,
                              color: toStage.color,
                            }}
                          >
                            {toStage.label}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-gray-800">
                          {c.rate}
                          <span className="text-sm font-normal text-gray-400">
                            %
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Bar Chart ─────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                단계별 고객 수
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value) => [value as number, "고객 수"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── Recent Stage Changes ──────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                최근 단계 변경 이력
              </h2>
              {recentChanges.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    아직 단계 변경 이력이 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentChanges.map((change) => {
                    const fromCfg = getStageLabelAndColor(change.fromStage);
                    const toCfg = getStageLabelAndColor(change.toStage);
                    return (
                      <div
                        key={change.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        {/* Customer */}
                        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                          <div className="w-8 h-8 bg-fuchsia-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-fuchsia-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {change.customerName}
                          </span>
                        </div>

                        {/* Stage Change */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-xs font-medium px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: `${fromCfg.color}15`,
                              color: fromCfg.color,
                            }}
                          >
                            {fromCfg.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <span
                            className="text-xs font-medium px-2 py-1 rounded-md"
                            style={{
                              backgroundColor: `${toCfg.color}15`,
                              color: toCfg.color,
                            }}
                          >
                            {toCfg.label}
                          </span>
                        </div>

                        {/* Date */}
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                          {formatDate(change.date)}
                        </span>

                        {/* Notes */}
                        {change.notes && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 max-w-[200px] truncate">
                            <StickyNote className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{change.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Move Customer Modal ─────────────────────────── */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMoveModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-fuchsia-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    고객 이동
                  </h2>
                </div>
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Customer Search & Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    고객 선택
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                      placeholder="고객 이름으로 검색..."
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {loadingCustomers ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    ) : customers.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">
                        고객을 찾을 수 없습니다
                      </p>
                    ) : (
                      customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCustomerId(c.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-fuchsia-50 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between ${
                            selectedCustomerId === c.id
                              ? "bg-fuchsia-50 text-fuchsia-700"
                              : "text-gray-700"
                          }`}
                        >
                          <div>
                            <span className="font-medium">{c.name}</span>
                            {c.company && (
                              <span className="text-xs text-gray-400 ml-2">
                                {c.company}
                              </span>
                            )}
                          </div>
                          {selectedCustomerId === c.id && (
                            <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Target Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이동할 단계
                  </label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 bg-white"
                  >
                    <option value="">단계 선택...</option>
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모
                  </label>
                  <textarea
                    value={moveNotes}
                    onChange={(e) => setMoveNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 resize-none"
                    placeholder="이동 사유나 메모를 입력하세요..."
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleMoveCustomer}
                  disabled={moving || !selectedCustomerId || !targetStage}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50 transition-colors"
                >
                  {moving && <Loader2 className="w-4 h-4 animate-spin" />}
                  이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
