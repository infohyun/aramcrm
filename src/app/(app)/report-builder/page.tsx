"use client";

import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3, Plus, Trash2, Loader2, Eye } from "lucide-react";

interface CustomReport { id: string; name: string; description: string | null; config: string; isPublic: boolean; createdAt: string }

const DATA_SOURCES: Record<string, string> = {
  customers_by_grade: "고객 등급별 분포",
  customers_by_status: "고객 상태별 분포",
  orders_by_status: "주문 상태별 분포",
  orders_by_month: "월별 매출",
  tickets_by_status: "AS 상태별 분포",
  tickets_by_priority: "AS 우선순위별 분포",
  inventory_by_status: "재고 상태별 분포",
  voc_by_category: "VOC 카테고리별 분포",
};

const CHART_TYPES = [
  { value: "bar", label: "막대 차트" },
  { value: "pie", label: "파이 차트" },
];

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function ReportBuilderPage() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewReport, setViewReport] = useState<string | null>(null);
  const [viewData, setViewData] = useState<{ label: string; value: number }[]>([]);
  const [viewConfig, setViewConfig] = useState<{ chartType: string; dataSource: string } | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSource, setFormSource] = useState("customers_by_grade");
  const [formChart, setFormChart] = useState("bar");
  const [formPublic, setFormPublic] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/custom-reports");
      if (res.ok) { const data = await res.json(); setReports(data.reports); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleCreate = async () => {
    if (!formName) return;
    await fetch("/api/custom-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, description: formDesc, config: { dataSource: formSource, chartType: formChart }, isPublic: formPublic }),
    });
    setShowCreate(false);
    setFormName(""); setFormDesc("");
    fetchReports();
  };

  const handleView = async (id: string) => {
    setViewReport(id);
    const res = await fetch(`/api/custom-reports/${id}/data`);
    if (res.ok) {
      const d = await res.json();
      setViewData(d.data);
      setViewConfig(d.config);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 리포트를 삭제하시겠습니까?")) return;
    await fetch(`/api/custom-reports/${id}`, { method: "DELETE" });
    fetchReports();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg"><BarChart3 className="w-6 h-6 text-pink-600" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">커스텀 리포트 빌더</h1>
                <p className="text-sm text-gray-500 mt-0.5">나만의 데이터 분석 리포트 생성</p>
              </div>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" />리포트 생성</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
          <>
            {reports.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border"><BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">커스텀 리포트가 없습니다</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((r) => {
                  let config: { dataSource?: string; chartType?: string } = {};
                  try { config = JSON.parse(r.config); } catch {}
                  return (
                    <div key={r.id} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{r.name}</h3>
                        <div className="flex gap-1">
                          <button onClick={() => handleView(r.id)} className="p-1.5 text-gray-400 hover:text-pink-600 rounded"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {r.description && <p className="text-xs text-gray-500 mb-2">{r.description}</p>}
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded">{DATA_SOURCES[config.dataSource || ""] || config.dataSource}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{config.chartType === "pie" ? "파이" : "막대"}</span>
                        {r.isPublic && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">공개</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* View Modal */}
      {viewReport && viewConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setViewReport(null); setViewData([]); setViewConfig(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">{DATA_SOURCES[viewConfig.dataSource] || "리포트"}</h2>
            <div className="h-72">
              {viewData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">데이터 없음</div>
              ) : viewConfig.chartType === "pie" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={viewData.map((d) => ({ name: d.label, value: d.value }))} cx="50%" cy="50%" innerRadius={40} outerRadius={100} paddingAngle={3} dataKey="value">
                      {viewData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewData.map((d) => ({ name: d.label, value: d.value }))} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {viewData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 space-y-1">
              {viewData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-gray-600">{d.label}</span></div>
                  <span className="font-medium text-gray-900">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setViewReport(null); setViewData([]); setViewConfig(null); }} className="mt-4 w-full py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">닫기</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">리포트 생성</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">리포트 이름</label><input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">설명</label><input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">데이터 소스</label>
                <select value={formSource} onChange={(e) => setFormSource(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {Object.entries(DATA_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">차트 유형</label>
                <select value={formChart} onChange={(e) => setFormChart(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {CHART_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formPublic} onChange={(e) => setFormPublic(e.target.checked)} className="rounded" />전체 공개</label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg">취소</button>
              <button onClick={handleCreate} disabled={!formName} className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg disabled:opacity-50">생성</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
