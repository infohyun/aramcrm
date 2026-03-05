"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, Plus, Search, Filter, Edit2, Trash2,
  ChevronLeft, ChevronRight, X
} from "lucide-react";

interface Brand {
  id: string; code: string; name: string;
}

interface BrandProduct {
  id: string;
  brandId: string;
  brand: { id: string; name: string; code: string };
  name: string;
  nameEn: string | null;
  sku: string;
  category: string;
  price: number;
  cost: number;
  wholesalePrice: number | null;
  retailPrice: number | null;
  currentStock: number;
  safetyStock: number;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  volume: string | null;
  description: string | null;
}

const categoryLabels: Record<string, string> = {
  diagnostic_device: "진단기기",
  scalp_analyzer: "두피 진단기",
  hair_analyzer: "모발 진단기",
  skin_analyzer: "피부 진단기",
  shampoo: "샴푸",
  serum: "세럼",
  lotion: "로션",
  sunscreen: "선크림",
  custom_cosmetic: "맞춤형 화장품",
  essence: "에센스",
  cream: "크림",
  cleanser: "클렌저",
  toner: "토너",
  mask: "마스크",
  other: "기타",
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }));

export default function BrandProductsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null);

  const [form, setForm] = useState({
    brandId: "", name: "", nameEn: "", sku: "", category: "other",
    description: "", price: 0, cost: 0, wholesalePrice: 0, retailPrice: 0,
    currentStock: 0, safetyStock: 10, volume: "", isActive: true,
  });

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (res.ok) setBrands(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (selectedBrand) params.set("brandId", selectedBrand);
      if (selectedCategory) params.set("category", selectedCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/brands/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setTotal(data.total);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, selectedBrand, selectedCategory, search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/brands/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        fetchProducts();
        resetForm();
      }
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setForm({
      brandId: brands[0]?.id || "", name: "", nameEn: "", sku: "", category: "other",
      description: "", price: 0, cost: 0, wholesalePrice: 0, retailPrice: 0,
      currentStock: 0, safetyStock: 10, volume: "", isActive: true,
    });
    setEditingProduct(null);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">브랜드 제품 관리</h1>
          <p className="text-sm text-gray-500 mt-1">아람휴비스 진단기기 & LILAI.AI 화장품 통합 관리</p>
        </div>
        <button
          onClick={() => { resetForm(); setForm(f => ({ ...f, brandId: brands[0]?.id || "" })); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#333]"
        >
          <Plus size={16} /> 제품 등록
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="제품명, SKU 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm outline-none w-full"
          />
        </div>
        <select
          value={selectedBrand}
          onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">전체 브랜드</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">브랜드</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">제품명</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">카테고리</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">판매가</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">원가</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">재고</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">로딩 중...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">제품이 없습니다</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.brand.code === "aramhuvis" ? "bg-gray-100 text-gray-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {p.brand.code === "aramhuvis" ? "AH" : "LI"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[#111]">{p.name}</p>
                    {p.volume && <p className="text-xs text-gray-400">{p.volume}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                <td className="px-4 py-3 text-gray-500">{categoryLabels[p.category] || p.category}</td>
                <td className="px-4 py-3 text-right font-medium">{p.price.toLocaleString()}원</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.cost.toLocaleString()}원</td>
                <td className="px-4 py-3 text-right">
                  <span className={p.currentStock <= p.safetyStock ? "text-red-600 font-medium" : ""}>
                    {p.currentStock}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {p.isActive ? "활성" : "비활성"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">총 {total}개 제품</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">제품 등록</h2>
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
                  <label className="block text-sm font-medium text-gray-600 mb-1">카테고리 *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm">
                    {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">제품명 (한글) *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">제품명 (영문)</label>
                  <input type="text" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">SKU *</label>
                  <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">용량</label>
                  <input type="text" value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} placeholder="200ml, 50g" className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">판매가 *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">원가</label>
                  <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">도매가</label>
                  <input type="number" value={form.wholesalePrice} onChange={e => setForm(f => ({ ...f, wholesalePrice: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">소매가</label>
                  <input type="number" value={form.retailPrice} onChange={e => setForm(f => ({ ...f, retailPrice: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">현재 재고</label>
                  <input type="number" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">안전 재고</label>
                  <input type="number" value={form.safetyStock} onChange={e => setForm(f => ({ ...f, safetyStock: Number(e.target.value) }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">설명</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">취소</button>
                <button type="submit" className="px-4 py-2 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#333]">등록</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
