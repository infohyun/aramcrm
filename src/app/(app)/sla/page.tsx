"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, Plus, Loader2 } from "lucide-react";

interface SlaPolicy { id: string; name: string; priority: string; responseMinutes: number; resolutionMinutes: number; isActive: boolean }
interface Violation { ticketId: string; priority: string; type: string; elapsed: number; limit: number }
interface Stats { total: number; compliant: number; complianceRate: number }

const PRIORITY_LABELS: Record<string, string> = { low: "낮음", medium: "보통", high: "높음", urgent: "긴급" };
const PRIORITY_COLORS: Record<string, string> = { low: "text-gray-600", medium: "text-blue-600", high: "text-amber-600", urgent: "text-red-600" };

export default function SlaPage() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, compliant: 0, complianceRate: 100 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", priority: "medium", responseMinutes: "60", resolutionMinutes: "480" });

  const fetchSla = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sla");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
        setViolations(data.violations);
        setStats(data.stats);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSla(); }, []);

  const handleAdd = async () => {
    await fetch("/api/sla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowAdd(false);
    fetchSla();
  };

  const formatTime = (min: number) => min >= 1440 ? `${Math.round(min / 1440)}일` : min >= 60 ? `${Math.round(min / 60)}시간` : `${min}분`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Shield className="w-6 h-6 text-blue-600" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">SLA 관리</h1>
                <p className="text-sm text-gray-500 mt-0.5">서비스 수준 협약 모니터링</p>
              </div>
            </div>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" />정책 추가</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-5 text-center">
                <div className={`text-4xl font-bold ${stats.complianceRate >= 90 ? "text-green-600" : stats.complianceRate >= 70 ? "text-amber-600" : "text-red-600"}`}>{stats.complianceRate}%</div>
                <p className="text-sm text-gray-500 mt-1">SLA 준수율</p>
              </div>
              <div className="bg-white rounded-xl border p-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-3xl font-bold text-green-600">{stats.compliant}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">준수 티켓</p>
              </div>
              <div className="bg-white rounded-xl border p-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <span className="text-3xl font-bold text-red-600">{violations.length}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">SLA 위반</p>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">SLA 정책</h2>
              {policies.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">SLA 정책을 추가하세요</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {policies.map((p) => (
                    <div key={p.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold text-sm ${PRIORITY_COLORS[p.priority]}`}>{PRIORITY_LABELS[p.priority] || p.priority}</span>
                        <span className={`w-2 h-2 rounded-full ${p.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                      </div>
                      <p className="text-xs text-gray-500">{p.name}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-400">응답 시간</span><span className="font-medium text-gray-700">{formatTime(p.responseMinutes)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">해결 시간</span><span className="font-medium text-gray-700">{formatTime(p.resolutionMinutes)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Violations */}
            {violations.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-base font-semibold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />SLA 위반 목록</h2>
                <div className="space-y-2">
                  {violations.slice(0, 20).map((v, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[v.priority]}`}>{PRIORITY_LABELS[v.priority]}</span>
                        <span className="text-sm text-gray-700">{v.type === "response" ? "응답 시간 초과" : "해결 시간 초과"}</span>
                      </div>
                      <div className="text-xs text-red-600 font-medium">
                        {formatTime(v.elapsed)} / {formatTime(v.limit)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">SLA 정책 추가</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">정책명</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="예: 긴급 우선순위 SLA" /></div>
              <div><label className="block text-sm font-medium mb-1">우선순위</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">응답 시간 (분)</label><input type="number" value={form.responseMinutes} onChange={(e) => setForm({ ...form, responseMinutes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">해결 시간 (분)</label><input type="number" value={form.resolutionMinutes} onChange={(e) => setForm({ ...form, resolutionMinutes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg">취소</button>
              <button onClick={handleAdd} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
