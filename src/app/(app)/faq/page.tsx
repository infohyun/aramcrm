"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HelpCircle,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  BarChart3,
  BookOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FAQStats {
  total: number;
  published: number;
  byCategory: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  product: { label: "제품", color: "bg-blue-100 text-blue-700" },
  shipping: { label: "배송", color: "bg-green-100 text-green-700" },
  as: { label: "AS", color: "bg-orange-100 text-orange-700" },
  payment: { label: "결제", color: "bg-purple-100 text-purple-700" },
  general: { label: "일반", color: "bg-gray-100 text-gray-700" },
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  product: "bg-blue-500",
  shipping: "bg-green-500",
  as: "bg-orange-500",
  payment: "bg-purple-500",
  general: "bg-gray-400",
};

const CATEGORIES = ["product", "shipping", "as", "payment", "general"] as const;

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
      checked ? "bg-indigo-600" : "bg-gray-200"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FAQPage() {
  // Data
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<FAQStats>({ total: 0, published: 0, byCategory: {} });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPublished, setFilterPublished] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formCategory, setFormCategory] = useState("product");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formPublished, setFormPublished] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch FAQs
  // -------------------------------------------------------------------------

  const fetchFAQs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (filterCategory) params.set("category", filterCategory);
      if (filterPublished) params.set("isPublished", filterPublished);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/faq?${params}`);
      const data = await res.json();

      if (res.ok) {
        setFaqs(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch FAQ:", error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterPublished, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  // -------------------------------------------------------------------------
  // Modal helpers
  // -------------------------------------------------------------------------

  const openCreateModal = () => {
    setEditingFaq(null);
    setFormCategory("product");
    setFormQuestion("");
    setFormAnswer("");
    setFormSortOrder(0);
    setFormPublished(true);
    setShowModal(true);
  };

  const openEditModal = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormCategory(faq.category);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormSortOrder(faq.sortOrder);
    setFormPublished(faq.isPublished);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFaq(null);
  };

  // -------------------------------------------------------------------------
  // Create / Edit
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) return;

    setFormSubmitting(true);
    try {
      const body = {
        category: formCategory,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        sortOrder: formSortOrder,
        isPublished: formPublished,
      };

      const url = editingFaq ? `/api/faq/${editingFaq.id}` : "/api/faq";
      const method = editingFaq ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        closeModal();
        fetchFAQs();
      }
    } catch (error) {
      console.error("Failed to save FAQ:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 FAQ를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/faq/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedId === id) setExpandedId(null);
        fetchFAQs();
      }
    } catch (error) {
      console.error("Failed to delete FAQ:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const maxByCategory = Math.max(...Object.values(stats.byCategory), 1);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">FAQ 관리</h1>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              FAQ 등록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Stats */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 FAQ</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Published */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">게시 중</p>
                <p className="text-2xl font-semibold text-green-600">{stats.published}</p>
              </div>
            </div>
          </div>

          {/* Category distribution */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <p className="text-sm text-gray-500 mb-3">카테고리별 분포</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const count = stats.byCategory[cat] || 0;
                const pct = maxByCategory > 0 ? (count / maxByCategory) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8 text-right">{CATEGORY_CONFIG[cat].label}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${CATEGORY_BAR_COLORS[cat]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Filters */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-4 space-y-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setFilterCategory("");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                filterCategory === ""
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              전체
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setFilterCategory(cat);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                  filterCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>

          {/* Published filter + search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {[
                { value: "", label: "전체" },
                { value: "true", label: "게시 중" },
                { value: "false", label: "비게시" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilterPublished(opt.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterPublished === opt.value
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="질문, 답변 검색..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* FAQ Accordion List */}
        {/* ----------------------------------------------------------------- */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">FAQ가 없습니다.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              첫 FAQ를 등록하세요
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => {
              const catInfo = CATEGORY_CONFIG[faq.category] || CATEGORY_CONFIG.general;
              const isExpanded = expandedId === faq.id;

              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden"
                >
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="w-full text-left p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Category badge */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${catInfo.color}`}
                      >
                        {catInfo.label}
                      </span>

                      {/* Question */}
                      <span className="flex-1 font-bold text-gray-900 text-sm truncate">
                        {faq.question}
                      </span>

                      {/* View count */}
                      <span className="text-xs text-gray-400 shrink-0 hidden sm:inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        조회 {faq.viewCount}회
                      </span>

                      {/* Published indicator */}
                      <span className="shrink-0">
                        {faq.isPublished ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <Eye className="w-3 h-3" />
                            게시
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                            <EyeOff className="w-3 h-3" />
                            비게시
                          </span>
                        )}
                      </span>

                      {/* Chevron */}
                      <span className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </span>
                    </div>
                  </button>

                  {/* Expanded answer */}
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                        {faq.answer}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          정렬순서: {faq.sortOrder}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(faq);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(faq.id);
                            }}
                            disabled={deletingId === faq.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                          >
                            {deletingId === faq.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Pagination */}
        {/* ----------------------------------------------------------------- */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] px-5 py-3">
            <p className="text-sm text-gray-500">
              총 {pagination.total}건 중{" "}
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}건
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Create / Edit Modal */}
      {/* =================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  {editingFaq ? (
                    <Pencil className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingFaq ? "FAQ 수정" : "FAQ 등록"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        formCategory === cat
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {CATEGORY_CONFIG[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  질문 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="자주 묻는 질문을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  답변 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="답변 내용을 입력하세요..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  정렬 순서
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">낮은 번호가 먼저 표시됩니다.</p>
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">게시 상태</label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formPublished ? "현재 게시 중입니다." : "현재 비게시 상태입니다."}
                  </p>
                </div>
                <ToggleSwitch checked={formPublished} onChange={setFormPublished} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formQuestion.trim() || !formAnswer.trim() || formSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingFaq ? (
                  <Pencil className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingFaq ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
