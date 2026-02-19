"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Trash2,
  X,
  Eye,
  Calendar,
  Package,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  productId?: string | null;
}

interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customer: { id: string; name: string; company: string | null };
  title: string;
  status: string;
  validUntil: string | null;
  subtotal: number;
  discountRate: number;
  taxRate: number;
  totalAmount: number;
  notes: string | null;
  items: QuoteItem[];
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

// ─── Constants ──────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  sent: "발송",
  approved: "승인",
  rejected: "거절",
  converted: "전환",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  converted: "bg-purple-100 text-purple-700",
};

const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "draft", label: "초안" },
  { key: "sent", label: "발송" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "거절" },
];

// ─── Helpers ──────────────────────────────────────────────────

function formatKRW(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("ko-KR");
}

// ─── Main Component ──────────────────────────────────────────

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // ─── Fetch quotes ────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/quotes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes || data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // ─── Load customers & products for create modal ─────────
  const loadResources = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers?limit=200"),
        fetch("/api/products"),
      ]);
      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.customers || d.data || []);
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || d.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Fetch quote detail ─────────────────────────────────
  const handleViewQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedQuote(data.quote || data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Delete quote ───────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("이 견적서를 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      fetchQuotes();
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Create quote ──────────────────────────────────────
  const handleCreate = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowCreate(false);
        fetchQuotes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = quotes.length;
    const draft = quotes.filter((q) => q.status === "draft").length;
    const sent = quotes.filter((q) => q.status === "sent").length;
    const approved = quotes.filter((q) => q.status === "approved").length;
    return { total, draft, sent, approved };
  }, [quotes]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <FileText className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  견적서 관리
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  견적서 작성 및 관리
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreate(true);
                loadResources();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              견적서 작성
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "전체",
              value: stats.total,
              icon: FileText,
              color: "bg-gray-50 text-gray-600",
            },
            {
              label: "초안",
              value: stats.draft,
              icon: FileText,
              color: "bg-gray-50 text-gray-600",
            },
            {
              label: "발송",
              value: stats.sent,
              icon: FileText,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "승인",
              value: stats.approved,
              icon: FileText,
              color: "bg-green-50 text-green-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color}`}
                >
                  <s.icon size={14} />
                </div>
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === tab.key
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="견적번호, 제목, 고객명 검색..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        {/* Quotes List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">등록된 견적서가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => {
              const st = STATUS_STYLES[q.status] || STATUS_STYLES.draft;
              const isExpired =
                q.validUntil && new Date(q.validUntil) < new Date();
              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow cursor-pointer ${
                    isExpired && q.status === "sent"
                      ? "border-amber-200"
                      : "border-gray-100"
                  }`}
                  onClick={() => handleViewQuote(q.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {q.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st}`}
                        >
                          {STATUS_LABELS[q.status] || q.status}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {q.quoteNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span>
                          {q.customer?.name}
                          {q.customer?.company
                            ? ` · ${q.customer.company}`
                            : ""}
                        </span>
                        <span className="font-medium text-gray-700">
                          {formatKRW(q.totalAmount)}
                        </span>
                        {q.validUntil && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(q.validUntil)}까지
                            {isExpired && (
                              <span className="text-amber-600 font-medium">
                                (만료)
                              </span>
                            )}
                          </span>
                        )}
                        {q.items && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {q.items.length}개 항목
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewQuote(q.id);
                        }}
                        className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateQuoteModal
          customers={customers}
          products={products}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Detail Modal */}
      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onDelete={(id) => {
            handleDelete(id);
            setSelectedQuote(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────────

function CreateQuoteModal({
  customers,
  products,
  onClose,
  onCreate,
}: {
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [discountRate, setDiscountRate] = useState(0);
  const [taxRate, setTaxRate] = useState(10);
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  const updateItem = (
    index: number,
    field: keyof QuoteItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "description") {
        item.description = value as string;
      } else if (field === "quantity") {
        item.quantity = Number(value) || 0;
      } else if (field === "unitPrice") {
        item.unitPrice = Number(value) || 0;
      } else if (field === "productId") {
        item.productId = value as string;
        const product = products.find((p) => p.id === value);
        if (product) {
          item.description = product.name;
          item.unitPrice = product.price;
        }
      }

      item.amount = item.quantity * item.unitPrice;
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, amount: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * (discountRate / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const totalAmount = afterDiscount + taxAmount;

  const handleSubmit = () => {
    if (!customerId || !title || items.some((i) => !i.description)) return;
    onCreate({
      customerId,
      title,
      validUntil: validUntil || null,
      notes: notes || null,
      discountRate,
      taxRate,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
        productId: i.productId || null,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              견적서 작성
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer & Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                고객 <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">선택...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` (${c.company})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="견적서 제목"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                견적 항목
              </label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
                항목 추가
              </button>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {products.length > 0 && (
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-36">
                        제품
                      </th>
                    )}
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      설명
                    </th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 w-20">
                      수량
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 w-32">
                      단가
                    </th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 w-32">
                      금액
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      {products.length > 0 && (
                        <td className="px-3 py-2">
                          <select
                            value={item.productId || ""}
                            onChange={(e) =>
                              updateItem(idx, "productId", e.target.value)
                            }
                            className="w-full px-2 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="">직접 입력</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(idx, "description", e.target.value)
                          }
                          placeholder="항목 설명"
                          className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, "quantity", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border rounded text-sm text-center outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, "unitPrice", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border rounded text-sm text-right outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                        {formatKRW(item.amount)}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    할인율 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountRate}
                    onChange={(e) => setDiscountRate(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    세율 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  유효기간
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비고
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="추가 메모 또는 조건 사항"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">소계</span>
                <span className="font-medium text-gray-900">
                  {formatKRW(subtotal)}
                </span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    할인 ({discountRate}%)
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatKRW(discountAmount)}
                  </span>
                </div>
              )}
              {discountRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">할인 후 금액</span>
                  <span className="font-medium text-gray-900">
                    {formatKRW(afterDiscount)}
                  </span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">세금 ({taxRate}%)</span>
                  <span className="font-medium text-gray-700">
                    +{formatKRW(taxAmount)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  총 금액
                </span>
                <span className="text-lg font-bold text-teal-600">
                  {formatKRW(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            견적서 저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────

function QuoteDetailModal({
  quote,
  onClose,
  onDelete,
}: {
  quote: Quote;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const st = STATUS_STYLES[quote.status] || STATUS_STYLES.draft;
  const subtotal = quote.subtotal || quote.items?.reduce((s, i) => s + i.amount, 0) || 0;
  const discountAmount = subtotal * ((quote.discountRate || 0) / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * ((quote.taxRate || 0) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {quote.title}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st}`}
              >
                {STATUS_LABELS[quote.status] || quote.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Quote Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">견적번호</span>
                <span className="font-mono font-medium text-gray-900">
                  {quote.quoteNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">고객</span>
                <span className="font-medium text-gray-900">
                  {quote.customer?.name}
                  {quote.customer?.company
                    ? ` (${quote.customer.company})`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">작성일</span>
                <span className="text-gray-700">
                  {formatDate(quote.createdAt)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {quote.validUntil && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">유효기간</span>
                  <span className="text-gray-700">
                    {formatDate(quote.validUntil)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">항목 수</span>
                <span className="text-gray-700">
                  {quote.items?.length || 0}개
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {quote.items && quote.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                견적 항목
              </h3>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                        #
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                        설명
                      </th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">
                        수량
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">
                        단가
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">
                        금액
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quote.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {formatKRW(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatKRW(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">소계</span>
              <span className="font-medium text-gray-900">
                {formatKRW(subtotal)}
              </span>
            </div>
            {(quote.discountRate || 0) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    할인 ({quote.discountRate}%)
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatKRW(discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">할인 후 금액</span>
                  <span className="font-medium text-gray-900">
                    {formatKRW(afterDiscount)}
                  </span>
                </div>
              </>
            )}
            {(quote.taxRate || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  세금 ({quote.taxRate}%)
                </span>
                <span className="font-medium text-gray-700">
                  +{formatKRW(taxAmount)}
                </span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">
                총 금액
              </span>
              <span className="text-lg font-bold text-teal-600">
                {formatKRW(quote.totalAmount)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                비고
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {quote.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-2xl flex justify-between">
          <button
            onClick={() => onDelete(quote.id)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
