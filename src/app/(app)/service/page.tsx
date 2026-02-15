"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BarChart3,
  Filter,
  Tag,
  Package,
  Truck,
  Calendar,
  DollarSign,
  FileText,
  RefreshCw,
  ArrowLeftRight,
  ClipboardCheck,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface ServiceTicket {
  id: string;
  ticketNo: string;
  customerId: string;
  customer: Customer;
  user: { id: string; name: string };
  category: string;
  priority: string;
  status: string;
  title: string;
  description: string | null;
  productName: string | null;
  serialIncoming: string | null;
  serialOutgoing: string | null;
  repairCost: number;
  partsCost: number;
  partsUsed: string | null;
  estimatedDays: number | null;
  memo: string | null;
  returnCourier: string | null;
  returnTrackingNo: string | null;
  receivedAt: string;
  inspectedAt: string | null;
  repairedAt: string | null;
  returnedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface ServiceStats {
  total: number;
  received: number;
  inProgress: number;
  completed: number;
  returned: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Config Objects ───────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  repair: { label: "수리", color: "bg-blue-100 text-blue-700" },
  exchange: { label: "교환", color: "bg-purple-100 text-purple-700" },
  refund: { label: "환불", color: "bg-red-100 text-red-700" },
  inspection: { label: "점검", color: "bg-green-100 text-green-700" },
  other: { label: "기타", color: "bg-gray-100 text-gray-700" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: "긴급", color: "bg-red-100 text-red-700" },
  high: { label: "높음", color: "bg-orange-100 text-orange-700" },
  medium: { label: "보통", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "낮음", color: "bg-green-100 text-green-700" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received: { label: "접수", color: "bg-gray-100 text-gray-700" },
  inspecting: { label: "검수 중", color: "bg-blue-100 text-blue-700" },
  in_repair: { label: "수리 중", color: "bg-orange-100 text-orange-700" },
  waiting_parts: { label: "부품 대기", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "완료", color: "bg-green-100 text-green-700" },
  returned: { label: "반송", color: "bg-indigo-100 text-indigo-700" },
  closed: { label: "종료", color: "bg-gray-100 text-gray-600" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  received: [{ label: "검수 시작", next: "inspecting" }],
  inspecting: [
    { label: "수리 시작", next: "in_repair" },
    { label: "부품 대기", next: "waiting_parts" },
  ],
  in_repair: [
    { label: "부품 대기", next: "waiting_parts" },
    { label: "수리 완료", next: "completed" },
  ],
  waiting_parts: [{ label: "수리 재개", next: "in_repair" }],
  completed: [{ label: "반송 처리", next: "returned" }],
  returned: [{ label: "종료", next: "closed" }],
};

// ─── Format Helpers ───────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
};

// ─── Page Component ───────────────────────────────────────────────────

export default function ServicePage() {
  // Data state
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    received: 0,
    inProgress: 0,
    completed: 0,
    returned: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Expand / detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [formCategory, setFormCategory] = useState("repair");
  const [formPriority, setFormPriority] = useState("medium");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formSerialIncoming, setFormSerialIncoming] = useState("");
  const [formEstimatedDays, setFormEstimatedDays] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // ─── Fetch Tickets ────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/service?${params}`);
      const data = await res.json();

      if (res.ok) {
        setTickets(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch service tickets:", error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, filterPriority, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ─── Customer Search ──────────────────────────────────────────────

  useEffect(() => {
    if (customerSearch.length < 1) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`
        );
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

  // ─── Status Change ────────────────────────────────────────────────

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/service/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchTickets();
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Create Ticket ────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formCustomerId || !formTitle) return;

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formCustomerId,
          category: formCategory,
          priority: formPriority,
          title: formTitle,
          description: formDescription || null,
          productName: formProductName || null,
          serialIncoming: formSerialIncoming || null,
          estimatedDays: formEstimatedDays ? Number(formEstimatedDays) : null,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchTickets();
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCategory("repair");
    setFormPriority("medium");
    setFormTitle("");
    setFormDescription("");
    setFormProductName("");
    setFormSerialIncoming("");
    setFormEstimatedDays("");
    setFormCustomerId("");
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  // ─── Helper: parse parts used ─────────────────────────────────────

  const parseParts = (partsJson: string | null): string[] => {
    if (!partsJson) return [];
    try {
      return JSON.parse(partsJson);
    } catch {
      return [];
    }
  };

  // ─── Timeline step component ──────────────────────────────────────

  const TimelineStep = ({
    label,
    date,
    isActive,
    isLast,
  }: {
    label: string;
    date: string | null;
    isActive: boolean;
    isLast?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full border-2 ${
            date
              ? "bg-indigo-600 border-indigo-600"
              : isActive
              ? "bg-white border-indigo-400 ring-2 ring-indigo-100"
              : "bg-white border-gray-300"
          }`}
        />
        {!isLast && (
          <div
            className={`w-0.5 h-6 ${date ? "bg-indigo-300" : "bg-gray-200"}`}
          />
        )}
      </div>
      <div className={isLast ? "" : "pb-6"}>
        <p
          className={`text-xs font-medium ${
            date ? "text-gray-900" : "text-gray-400"
          }`}
        >
          {label}
        </p>
        {date && (
          <p className="text-xs text-gray-500">{formatDate(date)}</p>
        )}
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Wrench className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  AS 관리 (After Service)
                </h1>
                <p className="text-sm text-gray-500">
                  수리/교환/환불/점검 서비스 관리
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              AS 접수
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">전체 AS</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          {/* Received / Inspecting */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">접수/검수 중</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {stats.received}
                </p>
              </div>
            </div>
          </div>

          {/* In Repair / Waiting Parts */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">수리 진행</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {stats.inProgress}
                </p>
              </div>
            </div>
          </div>

          {/* Completed / Returned */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">완료/반송</p>
                <p className="text-2xl font-semibold text-green-600">
                  {(stats.completed || 0) + (stats.returned || 0)}
                </p>
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
            <option value="repair">수리</option>
            <option value="exchange">교환</option>
            <option value="refund">환불</option>
            <option value="inspection">점검</option>
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
            <option value="received">접수</option>
            <option value="inspecting">검수 중</option>
            <option value="in_repair">수리 중</option>
            <option value="waiting_parts">부품 대기</option>
            <option value="completed">완료</option>
            <option value="returned">반송</option>
            <option value="closed">종료</option>
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
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 제품명, 고객명, 티켓번호 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">AS 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const catInfo =
                CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.other;
              const prioInfo =
                PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
              const statusInfo =
                STATUS_CONFIG[ticket.status] || STATUS_CONFIG.received;
              const isExpanded = expandedId === ticket.id;
              const transitions = STATUS_TRANSITIONS[ticket.status] || [];
              const parts = parseParts(ticket.partsUsed);
              const totalCost = (ticket.repairCost || 0) + (ticket.partsCost || 0);

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Collapsed Row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : ticket.id)
                    }
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
                        <Wrench className="w-5 h-5 text-indigo-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${catInfo.color}`}
                          >
                            {catInfo.label}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioInfo.color}`}
                          >
                            {prioInfo.label}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {ticket.title}
                        </h3>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {ticket.customer.name}
                            {ticket.customer.company
                              ? ` (${ticket.customer.company})`
                              : ""}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {ticket.ticketNo}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(ticket.receivedAt || ticket.createdAt)}
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

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-5">
                      {/* Description */}
                      {ticket.description && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            설명
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-gray-200">
                            {ticket.description}
                          </p>
                        </div>
                      )}

                      {/* Product Info */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          제품 정보
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 mb-0.5">
                              제품명
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {ticket.productName || "-"}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 mb-0.5">
                              입고 시리얼
                            </p>
                            <p className="text-sm font-mono text-gray-900">
                              {ticket.serialIncoming || "-"}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 mb-0.5">
                              출고 시리얼
                            </p>
                            <p className="text-sm font-mono text-gray-900">
                              {ticket.serialOutgoing || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cost Info */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          비용 정보
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 mb-0.5">
                              수리비
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(ticket.repairCost || 0)}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 mb-0.5">
                              부품비
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(ticket.partsCost || 0)}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200">
                            <p className="text-xs text-gray-400 mb-0.5">
                              합계
                            </p>
                            <p className="text-sm font-bold text-indigo-600">
                              {formatCurrency(totalCost)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Parts Used */}
                      {parts.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            사용 부품
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {parts.map((part: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium"
                              >
                                <Tag className="w-3 h-3" />
                                {part}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          처리 타임라인
                        </h4>
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                          <TimelineStep
                            label="접수"
                            date={ticket.receivedAt || ticket.createdAt}
                            isActive={ticket.status === "received"}
                          />
                          <TimelineStep
                            label="검수"
                            date={ticket.inspectedAt}
                            isActive={ticket.status === "inspecting"}
                          />
                          <TimelineStep
                            label="수리 완료"
                            date={ticket.repairedAt}
                            isActive={
                              ticket.status === "in_repair" ||
                              ticket.status === "waiting_parts"
                            }
                          />
                          <TimelineStep
                            label="반송"
                            date={ticket.returnedAt}
                            isActive={ticket.status === "completed"}
                            isLast
                          />
                        </div>
                      </div>

                      {/* Logistics */}
                      {(ticket.returnCourier || ticket.returnTrackingNo) && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" />
                            반송 물류
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-gray-200">
                              <p className="text-xs text-gray-400 mb-0.5">
                                택배사
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {ticket.returnCourier || "-"}
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200">
                              <p className="text-xs text-gray-400 mb-0.5">
                                운송장 번호
                              </p>
                              <p className="text-sm font-mono text-gray-900">
                                {ticket.returnTrackingNo || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Memo */}
                      {ticket.memo && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-1.5">
                            메모
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-gray-200">
                            {ticket.memo}
                          </p>
                        </div>
                      )}

                      {/* Status Transitions */}
                      {transitions.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-500">
                            상태 변경:
                          </span>
                          {transitions.map((t) => (
                            <button
                              key={t.next}
                              onClick={() =>
                                handleStatusChange(ticket.id, t.next)
                              }
                              disabled={updatingId === ticket.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              {updatingId === ticket.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3 h-3" />
                              )}
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
          <div className="flex items-center justify-between mt-6 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] px-4 py-3">
            <p className="text-sm text-gray-500">
              총 {pagination.total}건 중{" "}
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}건
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create AS Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">AS 접수</h2>
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

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Customer Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  고객 <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <div>
                      <span className="font-medium text-gray-900">
                        {selectedCustomer.name}
                      </span>
                      {selectedCustomer.company && (
                        <span className="text-sm text-gray-500 ml-2">
                          {selectedCustomer.company}
                        </span>
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
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
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
                            <span className="font-medium text-gray-900 text-sm">
                              {customer.name}
                            </span>
                            {customer.company && (
                              <span className="text-xs text-gray-500 ml-2">
                                {customer.company}
                              </span>
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
                  {(
                    Object.entries(CATEGORY_CONFIG) as [
                      string,
                      { label: string; color: string }
                    ][]
                  )
                    .filter(([key]) => key !== "other")
                    .map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setFormCategory(key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors shadow-sm ${
                          formCategory === key
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {key === "repair" && (
                          <Wrench className="w-4 h-4" />
                        )}
                        {key === "exchange" && (
                          <ArrowLeftRight className="w-4 h-4" />
                        )}
                        {key === "refund" && (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {key === "inspection" && (
                          <ClipboardCheck className="w-4 h-4" />
                        )}
                        {cfg.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  우선순위
                </label>
                <div className="flex gap-2">
                  {(
                    Object.entries(PRIORITY_CONFIG) as [
                      string,
                      { label: string; color: string }
                    ][]
                  ).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setFormPriority(key)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors shadow-sm ${
                        formPriority === key
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
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
                  placeholder="AS 제목을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  설명
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="증상 및 상세 내용을 입력하세요..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  제품명
                </label>
                <input
                  type="text"
                  value={formProductName}
                  onChange={(e) => setFormProductName(e.target.value)}
                  placeholder="제품명을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Serial Incoming */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  입고 시리얼번호
                </label>
                <input
                  type="text"
                  value={formSerialIncoming}
                  onChange={(e) => setFormSerialIncoming(e.target.value)}
                  placeholder="시리얼번호를 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Estimated Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  예상 소요일
                </label>
                <input
                  type="number"
                  value={formEstimatedDays}
                  onChange={(e) => setFormEstimatedDays(e.target.value)}
                  placeholder="예상 소요일 (일)"
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !formCustomerId || !formTitle || formSubmitting
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                접수
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
