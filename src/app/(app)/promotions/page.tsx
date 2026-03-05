"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Gift, Plus, Search, ChevronLeft, ChevronRight, X,
  Calendar, Percent, Tag, Users
} from "lucide-react";

interface Brand { id: string; code: string; name: string; }

interface Promotion {
  id: string; brandId: string; name: string; code: string | null;
  type: string; discountType: string; discountValue: number;
  minOrderAmount: number | null; maxDiscountAmount: number | null;
  targetCustomerGrade: string | null; description: string | null;
  startDate: string; endDate: string; usageLimit: number | null;
  usedCount: number; isActive: boolean; channels: string | null;
  brand: { id: string; name: string; code: string };
  products: { product: { id: string; name: string; sku: string } }[];
}

const typeLabels: Record<string, string> = {
  discount: "할인", coupon: "쿠폰", bundle: "번들", loyalty: "로열티", seasonal: "시즌",
};
const discountTypeLabels: Record<string, string> = {
  percentage: "비율 할인", fixed_amount: "금액 할인", buy_x_get_y: "N+1",
};
const gradeLabels: Record<string, string> = {
  all: "전체", vip: "VIP", gold: "Gold", normal: "일반", new: "신규",
};

export default function PromotionsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    brandId: "", name: "", code: "", type: "discount", discountType: "percentage",
    discountValue: 10, minOrderAmount: 0, maxDiscountAmount: 0,
    targetCustomerGrade: "all", description: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    usageLimit: 0, isActive: true, channels: "[]",
    messageTemplate: "", createdById: "",
  });

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok ? r.json() : []).then(setBrands).catch(() => {});
  }, []);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (selectedBrand) params.set("brandId", selectedBrand);
      if (selectedStatus) params.set("status", selectedStatus);
      const res = await fetch(`/api/promotions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions);
        setTotal(data.total);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, selectedBrand, selectedStatus]);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          usageLimit: form.usageLimit || null,
          minOrderAmount: form.minOrderAmount || null,
          maxDiscountAmount: form.maxDiscountAmount || null,
          createdById: "system",
        }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchPromotions();
      }
    } catch { /* ignore */ }
  };

  const getStatus = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);
    if (!promo.isActive) return { label: "비활성", color: "bg-gray-100 text-gray-500" };
    if (now < start) return { label: "예정", color: "bg-blue-100 text-blue-700" };
    if (now > end) return { label: "만료", color: "bg-red-100 text-red-700" };
    return { label: "진행중", color: "bg-green-100 text-green-700" };
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">프로모션/할인 관리</h1>
          <p className="text-sm text-gray-500 mt-1">고객 등급별 맞춤 프로모션 및 할인 혜택 관리</p>
        </div>
        <button onClick={() => { setForm(f => ({ ...f, brandId: brands[0]?.id || "" })); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#333]">
          <Plus size={16} /> 프로모션 생성
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2">
        {[
          { value: "", label: "전체" },
          { value: "active", label: "진행중" },
          { value: "scheduled", label: "예정" },
          { value: "expired", label: "만료" },
        ].map(tab => (
          <button key={tab.value} onClick={() => { setSelectedStatus(tab.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedStatus === tab.value ? "bg-[#111] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}>{tab.label}</button>
        ))}
        <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
          className="ml-auto bg-white rounded-xl border px-3 py-2 text-sm">
          <option value="">전체 브랜드</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">로딩 중...</div>
        ) : promotions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">프로모션이 없습니다</div>
        ) : promotions.map((promo) => {
          const status = getStatus(promo);
          return (
            <div key={promo.id} className="bg-white rounded-2xl border p-6 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  promo.brand.code === "aramhuvis" ? "bg-gray-100 text-gray-700" : "bg-purple-100 text-purple-700"
                }`}>{promo.brand.code === "aramhuvis" ? "AH" : "LI"}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
              <h3 className="font-semibold text-[#111] mb-1">{promo.name}</h3>
              {promo.code && (
                <div className="flex items-center gap-1 mb-2">
                  <Tag size={12} className="text-gray-400" />
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{promo.code}</code>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Percent size={14} className="text-indigo-500" />
                <span className="text-sm font-medium text-indigo-600">
                  {promo.discountType === "percentage" ? `${promo.discountValue}% 할인` :
                   promo.discountType === "fixed_amount" ? `${promo.discountValue.toLocaleString()}원 할인` :
                   `${promo.discountValue}+1 증정`}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>{new Date(promo.startDate).toLocaleDateString("ko")} ~ {new Date(promo.endDate).toLocaleDateString("ko")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={12} />
                  <span>대상: {gradeLabels[promo.targetCustomerGrade || "all"] || "전체"}</span>
                </div>
                {promo.usageLimit && (
                  <div className="flex items-center gap-1.5">
                    <Gift size={12} />
                    <span>사용: {promo.usedCount} / {promo.usageLimit}</span>
                  </div>
                )}
              </div>
              {promo.products.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400 mb-1">적용 상품</p>
                  <div className="flex flex-wrap gap-1">
                    {promo.products.slice(0, 3).map(p => (
                      <span key={p.product.id} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.product.name}
                      </span>
                    ))}
                    {promo.products.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{promo.products.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="px-4 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">프로모션 생성</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">브랜드 *</label>
                  <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))} required className="w-full border rounded-xl px-3 py-2 text-sm">
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">프로모션명 *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">프로모션 코드</label>
                  <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SUMMER2026" className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">유형</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm">
                    {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">할인 방식</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm">
                    {Object.entries(discountTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">할인 값 *</label>
                  <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">시작일 *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">종료일 *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">대상 고객 등급</label>
                  <select value={form.targetCustomerGrade} onChange={e => setForm(f => ({ ...f, targetCustomerGrade: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm">
                    {Object.entries(gradeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">사용 한도 (0=무제한)</label>
                  <input type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">취소</button>
                <button type="submit" className="px-4 py-2 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#333]">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
