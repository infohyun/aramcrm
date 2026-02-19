"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Check, Clock, AlertTriangle, Phone, Mail, Video, MapPin, Loader2, Trash2 } from "lucide-react";

interface FollowUp {
  id: string;
  type: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  customer: { id: string; name: string; company: string | null; grade: string };
}

const TYPE_ICONS: Record<string, React.ElementType> = { call: Phone, email: Mail, meeting: Video, visit: MapPin };
const TYPE_LABELS: Record<string, string> = { call: "전화", email: "이메일", meeting: "미팅", visit: "방문" };

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState({ overdue: 0, today: 0, upcoming: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ customerId: "", type: "call", title: "", description: "", dueDate: "" });

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mine: "true" });
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/follow-ups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps);
        setStats(data.stats);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const loadCustomers = async () => {
    const res = await fetch("/api/customers?limit=200");
    if (res.ok) { const d = await res.json(); setCustomers(d.customers); }
  };

  const handleCreate = async () => {
    if (!form.customerId || !form.title || !form.dueDate) return;
    await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ customerId: "", type: "call", title: "", description: "", dueDate: "" });
    fetchFollowUps();
  };

  const handleComplete = async (id: string) => {
    await fetch(`/api/follow-ups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    fetchFollowUps();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/follow-ups/${id}`, { method: "DELETE" });
    fetchFollowUps();
  };

  const isOverdue = (d: string) => new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString();
  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
  const formatDate = (d: string) => {
    const date = new Date(d);
    const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (diff === 0) return "오늘";
    if (diff === 1) return "내일";
    if (diff === -1) return "어제";
    if (diff < -1) return `${Math.abs(diff)}일 전`;
    return `${diff}일 후`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Bell className="w-6 h-6 text-orange-600" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">팔로업 리마인더</h1>
                <p className="text-sm text-gray-500 mt-0.5">고객 연락 예정 관리</p>
              </div>
            </div>
            <button onClick={() => { setShowCreate(true); loadCustomers(); }} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" />리마인더 추가</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center cursor-pointer" onClick={() => setFilter("pending")}>
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-red-500">지연됨</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center cursor-pointer" onClick={() => setFilter("pending")}>
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{stats.today}</p>
            <p className="text-xs text-amber-500">오늘</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center cursor-pointer" onClick={() => setFilter("pending")}>
            <Bell className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            <p className="text-xs text-blue-500">7일 내</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {[{ v: "pending", l: "대기중" }, { v: "completed", l: "완료" }, { v: "", l: "전체" }].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter === f.v ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-600 border-gray-200"}`}>{f.l}</button>
          ))}
        </div>

        {/* List */}
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : followUps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border"><Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">팔로업 일정이 없습니다</p></div>
        ) : (
          <div className="space-y-2">
            {followUps.map((f) => {
              const Icon = TYPE_ICONS[f.type] || Phone;
              const overdue = f.status === "pending" && isOverdue(f.dueDate);
              const today = f.status === "pending" && isToday(f.dueDate);
              return (
                <div key={f.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${overdue ? "border-red-200 bg-red-50/30" : today ? "border-amber-200" : "border-gray-100"}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overdue ? "bg-red-100" : today ? "bg-amber-100" : "bg-gray-100"}`}>
                    <Icon className={`w-5 h-5 ${overdue ? "text-red-600" : today ? "text-amber-600" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{f.title}</span>
                      <span className="text-xs text-gray-400">{TYPE_LABELS[f.type]}</span>
                      {f.status === "completed" && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">완료</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{f.customer.name}</span>
                      {f.customer.company && <span>{f.customer.company}</span>}
                      <span className={overdue ? "text-red-600 font-medium" : today ? "text-amber-600 font-medium" : ""}>{formatDate(f.dueDate)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {f.status === "pending" && (
                      <button onClick={() => handleComplete(f.id)} className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-50" title="완료"><Check className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleDelete(f.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">팔로업 추가</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">고객</label>
                <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">선택...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">유형</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">예정일</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">제목</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="예: 재계약 논의 전화" />
              </div>
              <div><label className="block text-sm font-medium mb-1">메모</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg">취소</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
