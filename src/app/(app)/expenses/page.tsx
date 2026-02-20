"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Receipt,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Plane,
  UtensilsCrossed,
  Package,
  Car,
  MoreHorizontal,
  X,
  Trash2,
  User,
  Calendar,
  RefreshCw,
  DollarSign,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Expense {
  id: string;
  userId: string;
  userName: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  status: string;
  receiptUrl: string | null;
  createdAt: string;
}

interface ExpenseStats {
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  byCategory: Record<string, { count: number; amount: number }>;
}

// ─── Config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  travel: {
    label: "출장",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: <Plane className="w-3.5 h-3.5" />,
  },
  meal: {
    label: "식비",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: <UtensilsCrossed className="w-3.5 h-3.5" />,
  },
  supplies: {
    label: "소모품",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Package className="w-3.5 h-3.5" />,
  },
  transport: {
    label: "교통비",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
    icon: <Car className="w-3.5 h-3.5" />,
  },
  other: {
    label: "기타",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: <MoreHorizontal className="w-3.5 h-3.5" />,
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "대기중",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "승인",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "반려",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  reimbursed: {
    label: "정산완료",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Banknote className="w-3.5 h-3.5" />,
  },
};

const STATUS_TABS = [
  { key: "", label: "전체" },
  { key: "pending", label: "대기중" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "반려" },
  { key: "reimbursed", label: "정산완료" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("ko-KR").format(v) + "원";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// ─── Page Component ─────────────────────────────────────────────────

export default function ExpensesPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id || "";
  const currentUserRole =
    (session?.user as { role?: string })?.role || "staff";
  const isManager =
    currentUserRole === "admin" || currentUserRole === "manager";

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    byCategory: {},
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ─── Fetch Expenses ────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!isManager) {
        params.set("mine", "true");
      }
      if (filterStatus) {
        params.set("status", filterStatus);
      }

      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, isManager]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ─── Actions ───────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to approve expense:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to reject expense:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleCreate = async (formData: {
    title: string;
    amount: string;
    category: string;
    date: string;
    description: string;
    receiptUrl: string;
  }) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category,
          date: formData.date,
          description: formData.description || undefined,
          receiptUrl: formData.receiptUrl || undefined,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to create expense:", error);
    }
  };

  // ─── Computed ──────────────────────────────────────────────────

  const categorySummary = Object.entries(stats.byCategory).map(
    ([key, val]) => ({
      key,
      label: CATEGORY_CONFIG[key]?.label || key,
      ...val,
    })
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl shadow-sm">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">경비 관리</h1>
                <p className="text-[11px] text-gray-400">
                  출장 · 식비 · 소모품 · 교통비 · 기타
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md shadow-green-200"
            >
              <Plus className="w-4 h-4" />
              경비 신청
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {/* ─── Summary Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                총 신청액
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(stats.totalAmount)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                승인 대기
              </span>
            </div>
            <p className="text-lg font-bold text-amber-600">
              {formatCurrency(stats.pendingAmount)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                승인 완료
              </span>
            </div>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(stats.approvedAmount)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Receipt className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                카테고리별
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {categorySummary.length > 0 ? (
                categorySummary.map((cat) => (
                  <span
                    key={cat.key}
                    className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                  >
                    {cat.label} {cat.count}건
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-gray-400">없음</span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Status Filter Tabs ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterStatus === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => fetchExpenses()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="새로고침"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-gray-400 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {/* ─── Content ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <p className="text-sm text-gray-400">
                경비 목록을 불러오는 중...
              </p>
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">경비 내역이 없습니다</p>
            <p className="text-gray-400 text-xs">
              새로운 경비를 신청해 보세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => {
              const catConfig =
                CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
              const statusConfig =
                STATUS_CONFIG[expense.status] || STATUS_CONFIG.pending;
              const isOwnExpense = expense.userId === currentUserId;

              return (
                <div
                  key={expense.id}
                  className="bg-white rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-green-200 group"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Category badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${catConfig.bgColor} ${catConfig.color}`}
                    >
                      {catConfig.icon}
                      {catConfig.label}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-green-700 transition-colors">
                        {expense.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {expense.userName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(expense.date)}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Approve/Reject for managers on pending items */}
                      {isManager && expense.status === "pending" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(expense.id);
                            }}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title="승인"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(expense.id);
                            }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="반려"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Delete button for own expenses */}
                      {isOwnExpense && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(expense.id);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description (if exists) */}
                  {expense.description && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-gray-400 truncate">
                        {expense.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Create Modal ──────────────────────────────────────── */}
      {showCreateModal && (
        <CreateExpenseModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ─── Create Expense Modal ───────────────────────────────────────────

function CreateExpenseModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    amount: string;
    category: string;
    date: string;
    description: string;
    receiptUrl: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "travel",
    date: new Date().toISOString().split("T")[0],
    description: "",
    receiptUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.amount || !form.category || !form.date) return;
    setSubmitting(true);
    await onCreate(form);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Receipt className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">경비 신청</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="경비 제목을 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                금액 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="travel">출장</option>
                <option value="meal">식비</option>
                <option value="supplies">소모품</option>
                <option value="transport">교통비</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              설명
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="경비 내역에 대한 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              영수증 URL
            </label>
            <input
              type="text"
              value={form.receiptUrl}
              onChange={(e) =>
                setForm({ ...form, receiptUrl: e.target.value })
              }
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !form.title || !form.amount || !form.date || submitting
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            신청
          </button>
        </div>
      </div>
    </div>
  );
}
