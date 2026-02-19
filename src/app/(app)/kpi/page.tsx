"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Target, Plus, RefreshCw, Loader2, Trophy, TrendingUp } from "lucide-react";

interface KpiTarget {
  id: string;
  userId: string | null;
  userName: string | null;
  department: string | null;
  period: string;
  metric: string;
  targetValue: number;
  actualValue: number;
  unit: string;
}

const METRICS: Record<string, { label: string; color: string }> = {
  revenue: { label: "매출", color: "#6366f1" },
  new_customers: { label: "신규 고객", color: "#10b981" },
  orders: { label: "주문", color: "#f59e0b" },
  tickets_resolved: { label: "AS 해결", color: "#06b6d4" },
  voc_resolved: { label: "VOC 해결", color: "#8b5cf6" },
};

const formatKRW = (v: number) => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000)}만`;
  return v.toLocaleString();
};

export default function KpiPage() {
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [teamTotals, setTeamTotals] = useState<Record<string, { target: number; actual: number }>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [showCreate, setShowCreate] = useState(false);
  const [formMetric, setFormMetric] = useState("revenue");
  const [formTarget, setFormTarget] = useState("");
  const [formUnit, setFormUnit] = useState("원");

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kpi?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets);
        setTeamTotals(data.teamTotals);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchKpi(); }, [fetchKpi]);

  const handleRefresh = async () => {
    await fetch("/api/kpi", { method: "PUT" });
    fetchKpi();
  };

  const handleCreate = async () => {
    if (!formTarget) return;
    await fetch("/api/kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, metric: formMetric, targetValue: formTarget, unit: formUnit }),
    });
    setShowCreate(false);
    setFormTarget("");
    fetchKpi();
  };

  const getRate = (actual: number, target: number) => target > 0 ? Math.round((actual / target) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><Target className="w-6 h-6 text-emerald-600" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">KPI 성과 대시보드</h1>
                <p className="text-sm text-gray-500 mt-0.5">목표 설정 및 달성률 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              <button onClick={handleRefresh} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" />실적 갱신</button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"><Plus className="w-4 h-4" />목표 추가</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Team Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(METRICS).map(([key, info]) => {
                const total = teamTotals[key];
                if (!total) return null;
                const rate = getRate(total.actual, total.target);
                return (
                  <div key={key} className="bg-white rounded-xl border p-5">
                    <p className="text-xs text-gray-500 mb-1">{info.label}</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-bold" style={{ color: info.color }}>{key === "revenue" ? formatKRW(total.actual) : total.actual}</p>
                      <p className="text-sm text-gray-400 mb-0.5">/ {key === "revenue" ? formatKRW(total.target) : total.target}</p>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, rate)}%`, backgroundColor: info.color }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: rate >= 100 ? "#10b981" : rate >= 70 ? "#f59e0b" : "#ef4444" }}>{rate}% 달성</p>
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            {targets.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">달성률 현황</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={targets.map((t) => ({
                      name: `${t.userName || "전체"} (${METRICS[t.metric]?.label || t.metric})`,
                      달성률: getRate(t.actualValue, t.targetValue),
                      metric: t.metric,
                    }))} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#999" }} domain={[0, 120]} />
                      <Tooltip formatter={(value) => [`${value}%`, "달성률"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="달성률" radius={[4, 4, 0, 0]}>
                        {targets.map((t, i) => (
                          <Cell key={i} fill={METRICS[t.metric]?.color || "#999"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Rankings */}
            {targets.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />개인 순위</h2>
                <div className="space-y-2">
                  {targets
                    .sort((a, b) => getRate(b.actualValue, b.targetValue) - getRate(a.actualValue, a.targetValue))
                    .map((t, i) => {
                      const rate = getRate(t.actualValue, t.targetValue);
                      return (
                        <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"}`}>{i + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{t.userName || "전체"}</p>
                            <p className="text-xs text-gray-500">{METRICS[t.metric]?.label} · {t.department || ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: rate >= 100 ? "#10b981" : rate >= 70 ? "#f59e0b" : "#ef4444" }}>{rate}%</p>
                            <p className="text-xs text-gray-400">{t.metric === "revenue" ? formatKRW(t.actualValue) : t.actualValue} / {t.metric === "revenue" ? formatKRW(t.targetValue) : t.targetValue}{t.unit}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {targets.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border">
                <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">설정된 KPI 목표가 없습니다</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">목표 추가하기</button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">KPI 목표 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지표</label>
                <select value={formMetric} onChange={(e) => { setFormMetric(e.target.value); setFormUnit(e.target.value === "revenue" ? "원" : "건"); }} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">목표 ({period})</label>
                <input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="목표값" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg">취소</button>
              <button onClick={handleCreate} disabled={!formTarget} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg disabled:opacity-50">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
