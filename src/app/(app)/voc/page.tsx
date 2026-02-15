"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareWarning,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BarChart3,
  Filter,
  Tag,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface VOCRecord {
  id: string;
  customerId: string;
  customer: Customer;
  user: { id: string; name: string };
  category: string;
  priority: string;
  title: string;
  content: string;
  status: string;
  resolution: string | null;
  productTags: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface VOCStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  complaint: { label: "불만", color: "bg-red-100 text-red-700", icon: MessageSquareWarning },
  suggestion: { label: "제안", color: "bg-blue-100 text-blue-700", icon: Lightbulb },
  inquiry: { label: "문의", color: "bg-yellow-100 text-yellow-700", icon: HelpCircle },
  praise: { label: "칭찬", color: "bg-green-100 text-green-700", icon: ThumbsUp },
  other: { label: "기타", color: "bg-gray-100 text-gray-700", icon: HelpCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: "높음", color: "bg-red-100 text-red-700" },
  medium: { label: "보통", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "낮음", color: "bg-green-100 text-green-700" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: "미처리", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  in_progress: { label: "처리 중", color: "bg-blue-100 text-blue-700", icon: Clock },
  resolved: { label: "해결 완료", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  closed: { label: "종료", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  open: [{ label: "처리 시작", next: "in_progress" }],
  in_progress: [
    { label: "해결 완료", next: "resolved" },
    { label: "미처리로 변경", next: "open" },
  ],
  resolved: [
    { label: "종료", next: "closed" },
    { label: "재처리", next: "in_progress" },
  ],
  closed: [{ label: "재오픈", next: "open" }],
};

export default function VOCPage() {
  const [vocRecords, setVocRecords] = useState<VOCRecord[]>([]);
  const [stats, setStats] = useState<VOCStats>({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail / expand
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [formCategory, setFormCategory] = useState("complaint");
  const [formPriority, setFormPriority] = useState("medium");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formProductTags, setFormProductTags] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const fetchVOC = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (filterCategory) params.set("category", filterCategory);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterStatus) params.set("status", filterStatus);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/voc?${params}`);
      const data = await res.json();

      if (res.ok) {
        setVocRecords(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch VOC:", error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterPriority, filterStatus, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchVOC();
  }, [fetchVOC]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 1) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data.data || []);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleStatusChange = async (vocId: string, newStatus: string) => {
    setUpdatingId(vocId);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === "resolved" && resolutionText) {
        body.resolution = resolutionText;
      }

      const res = await fetch(`/api/voc/${vocId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setResolutionText("");
        fetchVOC();
      }
    } catch (error) {
      console.error("Failed to update VOC:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveResolution = async (vocId: string) => {
    setUpdatingId(vocId);
    try {
      const res = await fetch(`/api/voc/${vocId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: resolutionText }),
      });
      if (res.ok) {
        fetchVOC();
      }
    } catch (error) {
      console.error("Failed to save resolution:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreate = async () => {
    if (!formCustomerId || !formTitle || !formContent) return;

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/voc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formCustomerId,
          userId: "system",
          category: formCategory,
          priority: formPriority,
          title: formTitle,
          content: formContent,
          productTags: formProductTags
            ? formProductTags.split(",").map((t) => t.trim())
            : [],
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchVOC();
      }
    } catch (error) {
      console.error("Failed to create VOC:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCategory("complaint");
    setFormPriority("medium");
    setFormTitle("");
    setFormContent("");
    setFormProductTags("");
    setFormCustomerId("");
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MessageSquareWarning className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">고객의 소리 (VOC)</h1>
                <p className="text-sm text-gray-500">고객 피드백 및 불만 관리</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              VOC 등록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 VOC</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">처리 중</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">미처리</p>
                <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">해결 완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            필터
          </div>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">카테고리 전체</option>
            <option value="complaint">불만</option>
            <option value="suggestion">제안</option>
            <option value="inquiry">문의</option>
            <option value="praise">칭찬</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">우선순위 전체</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">상태 전체</option>
            <option value="open">미처리</option>
            <option value="in_progress">처리 중</option>
            <option value="resolved">해결 완료</option>
            <option value="closed">종료</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 내용, 고객명 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* VOC List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : vocRecords.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            <MessageSquareWarning className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">VOC 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vocRecords.map((voc) => {
              const catInfo = CATEGORY_CONFIG[voc.category] || CATEGORY_CONFIG.other;
              const prioInfo = PRIORITY_CONFIG[voc.priority] || PRIORITY_CONFIG.medium;
              const statusInfo = STATUS_CONFIG[voc.status] || STATUS_CONFIG.open;
              const StatusIcon = statusInfo.icon;
              const CatIcon = catInfo.icon;
              const isExpanded = expandedId === voc.id;
              const transitions = STATUS_TRANSITIONS[voc.status] || [];
              const parsedTags: string[] = voc.productTags
                ? (() => { try { return JSON.parse(voc.productTags); } catch { return []; } })()
                : [];

              return (
                <div
                  key={voc.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Main row */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : voc.id);
                      setResolutionText(voc.resolution || "");
                    }}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
                        <CatIcon className="w-5 h-5 text-indigo-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioInfo.color}`}>
                            {prioInfo.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {voc.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {voc.customer.name}
                            {voc.customer.company ? ` (${voc.customer.company})` : ""}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(voc.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {/* Content */}
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-500 mb-1">내용</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200">
                          {voc.content}
                        </p>
                      </div>

                      {/* Product tags */}
                      {parsedTags.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-gray-500 mb-1">관련 제품</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {parsedTags.map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resolution */}
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-500 mb-1">처리 내용</h4>
                        <textarea
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          placeholder="처리 내용을 입력하세요..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        {resolutionText !== (voc.resolution || "") && (
                          <button
                            onClick={() => handleSaveResolution(voc.id)}
                            disabled={updatingId === voc.id}
                            className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                            {updatingId === voc.id ? "저장 중..." : "처리 내용 저장"}
                          </button>
                        )}
                      </div>

                      {/* Status transitions */}
                      {transitions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">상태 변경:</span>
                          {transitions.map((t) => (
                            <button
                              key={t.next}
                              onClick={() => handleStatusChange(voc.id, t.next)}
                              disabled={updatingId === voc.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors disabled:opacity-50"
                            >
                              <ArrowRight className="w-3 h-3" />
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] px-4 py-3">
            <p className="text-sm text-gray-500">
              총 {pagination.total}건 중{" "}
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}건
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create VOC Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">VOC 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Customer search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  고객 <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div>
                      <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
                      {selectedCustomer.company && (
                        <span className="text-sm text-gray-500 ml-2">{selectedCustomer.company}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setFormCustomerId("");
                        setCustomerSearch("");
                      }}
                      className="p-1 hover:bg-indigo-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="고객명으로 검색..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setFormCustomerId(customer.id);
                              setShowCustomerDropdown(false);
                              setCustomerSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-gray-900 text-sm">{customer.name}</span>
                            {customer.company && (
                              <span className="text-xs text-gray-500 ml-2">{customer.company}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }][])
                    .filter(([key]) => key !== "other")
                    .map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setFormCategory(key)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            formCategory === key
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  우선순위
                </label>
                <div className="flex gap-2">
                  {(Object.entries(PRIORITY_CONFIG) as [string, { label: string; color: string }][]).map(
                    ([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setFormPriority(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          formPriority === key
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="VOC 제목을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="상세 내용을 입력하세요..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Product tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  관련 제품 태그
                </label>
                <input
                  type="text"
                  value={formProductTags}
                  onChange={(e) => setFormProductTags(e.target.value)}
                  placeholder="쉼표로 구분 (예: 스킨케어, 세럼, 크림)"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">쉼표(,)로 구분하여 여러 태그를 입력할 수 있습니다.</p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!formCustomerId || !formTitle || !formContent || formSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
