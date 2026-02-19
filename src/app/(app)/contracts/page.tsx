"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSignature, Plus, Search, AlertTriangle, Calendar, Trash2, Loader2 } from "lucide-react";

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  value: number;
  renewalType: string;
  description: string | null;
  customer: { id: string; name: string; company: string | null };
}

const TYPE_LABELS: Record<string, string> = { subscription: "구독", service: "서비스", maintenance: "유지보수", license: "라이선스" };
const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  draft: { label: "초안", color: "bg-gray-100 text-gray-700" },
  active: { label: "활성", color: "bg-green-100 text-green-700" },
  expiring: { label: "만료임박", color: "bg-amber-100 text-amber-700" },
  expired: { label: "만료", color: "bg-red-100 text-red-700" },
  cancelled: { label: "취소", color: "bg-gray-100 text-gray-500" },
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [expired, setExpired] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ customerId: "", title: "", type: "service", startDate: "", endDate: "", value: "", description: "" });

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/contracts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts);
        setExpiringSoon(data.expiringSoon);
        setExpired(data.expired);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const loadCustomers = async () => {
    const res = await fetch("/api/customers?limit=200");
    if (res.ok) { const d = await res.json(); setCustomers(d.customers); }
  };

  const handleCreate = async () => {
    if (!form.customerId || !form.title || !form.startDate || !form.endDate) return;
    await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ customerId: "", title: "", type: "service", startDate: "", endDate: "", value: "", description: "" });
    fetchContracts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 계약을 삭제하시겠습니까?")) return;
    await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    fetchContracts();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR");
  const formatKRW = (n: number) => n.toLocaleString("ko-KR");
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg"><FileSignature className="w-6 h-6 text-violet-600" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">계약 관리</h1>
                <p className="text-sm text-gray-500 mt-0.5">계약 등록 및 만료 추적</p>
              </div>
            </div>
            <button onClick={() => { setShowCreate(true); loadCustomers(); }} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-medium">
              <Plus className="w-4 h-4" />계약 등록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Alert Cards */}
        {(expiringSoon > 0 || expired > 0) && (
          <div className="flex gap-4">
            {expiringSoon > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">30일 내 만료 예정: {expiringSoon}건</span>
              </div>
            )}
            {expired > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800 font-medium">만료된 계약: {expired}건</span>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="계약명, 계약번호, 고객명 검색..." className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <FileSignature className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">등록된 계약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => {
              const days = daysUntil(c.endDate);
              const isExpiring = days > 0 && days <= 30;
              const isExpired = days <= 0;
              const effectiveStatus = isExpired && c.status === "active" ? "expired" : isExpiring && c.status === "active" ? "expiring" : c.status;
              const st = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.active;
              return (
                <div key={c.id} className={`bg-white rounded-xl border p-5 ${isExpired ? "border-red-200" : isExpiring ? "border-amber-200" : "border-gray-100"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        <span className="text-xs text-gray-400">{c.contractNumber}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{c.customer.name}{c.customer.company ? ` · ${c.customer.company}` : ""}</span>
                        <span>{TYPE_LABELS[c.type] || c.type}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(c.startDate)} ~ {formatDate(c.endDate)}</span>
                        {c.value > 0 && <span className="font-medium text-gray-700">{formatKRW(c.value)}원</span>}
                        {isExpiring && <span className="text-amber-600 font-medium">{days}일 남음</span>}
                        {isExpired && <span className="text-red-600 font-medium">만료됨</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">계약 등록</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">고객</label>
                <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">선택...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">계약명</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">금액</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="원" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg">취소</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
