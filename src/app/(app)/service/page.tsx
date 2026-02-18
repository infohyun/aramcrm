"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  LayoutGrid,
  List,
  Zap,
  Phone,
  User,
  Eye,
  Edit3,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
}

interface ServiceTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customer: Customer;
  assignedTo: { id: string; name: string } | null;
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
  actualDays: number | null;
  memo: string | null;
  returnCourier: string | null;
  returnTrackingNo: string | null;
  receivedAt: string;
  inspectedAt: string | null;
  repairedAt: string | null;
  returnedAt: string | null;
  createdAt: string;
}

interface ServiceStats {
  total: number;
  received: number;
  inspecting: number;
  inRepair: number;
  waitingParts: number;
  inProgress: number;
  completed: number;
  returned: number;
  closed: number;
  urgent: number;
  todayReceived: number;
  todayCompleted: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Config Objects ───────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  repair: { label: "수리", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "wrench" },
  exchange: { label: "교환", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "exchange" },
  refund: { label: "환불", color: "bg-red-100 text-red-700 border-red-200", icon: "refund" },
  inspection: { label: "점검", color: "bg-teal-100 text-teal-700 border-teal-200", icon: "inspection" },
  other: { label: "기타", color: "bg-gray-100 text-gray-700 border-gray-200", icon: "other" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  urgent: { label: "긴급", color: "bg-red-50 text-red-700 border-red-200", dotColor: "bg-red-500" },
  high: { label: "높음", color: "bg-orange-50 text-orange-700 border-orange-200", dotColor: "bg-orange-500" },
  medium: { label: "보통", color: "bg-yellow-50 text-yellow-700 border-yellow-200", dotColor: "bg-yellow-500" },
  low: { label: "낮음", color: "bg-green-50 text-green-700 border-green-200", dotColor: "bg-green-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  received: { label: "접수", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300" },
  inspecting: { label: "검수 중", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-300" },
  in_repair: { label: "수리 중", color: "text-orange-700", bgColor: "bg-orange-100", borderColor: "border-orange-300" },
  waiting_parts: { label: "부품 대기", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-300" },
  completed: { label: "완료", color: "text-emerald-700", bgColor: "bg-emerald-100", borderColor: "border-emerald-300" },
  returned: { label: "반송", color: "text-indigo-700", bgColor: "bg-indigo-100", borderColor: "border-indigo-300" },
  closed: { label: "종료", color: "text-gray-500", bgColor: "bg-gray-100", borderColor: "border-gray-200" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  received: [{ label: "검수 시작", next: "inspecting", color: "bg-blue-600 hover:bg-blue-700 text-white" }],
  inspecting: [
    { label: "수리 시작", next: "in_repair", color: "bg-orange-600 hover:bg-orange-700 text-white" },
    { label: "부품 대기", next: "waiting_parts", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  ],
  in_repair: [
    { label: "부품 대기", next: "waiting_parts", color: "bg-amber-600 hover:bg-amber-700 text-white" },
    { label: "수리 완료", next: "completed", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  ],
  waiting_parts: [{ label: "수리 재개", next: "in_repair", color: "bg-orange-600 hover:bg-orange-700 text-white" }],
  completed: [{ label: "반송 처리", next: "returned", color: "bg-indigo-600 hover:bg-indigo-700 text-white" }],
  returned: [{ label: "종료", next: "closed", color: "bg-gray-600 hover:bg-gray-700 text-white" }],
};

const KANBAN_COLUMNS = [
  { key: "received", label: "접수", headerColor: "bg-slate-500" },
  { key: "inspecting", label: "검수 중", headerColor: "bg-blue-500" },
  { key: "in_repair", label: "수리 중", headerColor: "bg-orange-500" },
  { key: "waiting_parts", label: "부품 대기", headerColor: "bg-amber-500" },
  { key: "completed", label: "완료", headerColor: "bg-emerald-500" },
  { key: "returned", label: "반송 완료", headerColor: "bg-indigo-500" },
];

// ─── Format Helpers ───────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

const formatDateFull = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
};

const getDaysAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
};

const getElapsedDays = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── Page Component ───────────────────────────────────────────────────

export default function ServicePage() {
  const router = useRouter();

  // Data state
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [stats, setStats] = useState<ServiceStats>({
    total: 0, received: 0, inspecting: 0, inRepair: 0, waitingParts: 0,
    inProgress: 0, completed: 0, returned: 0, closed: 0, urgent: 0,
    todayReceived: 0, todayCompleted: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 100, total: 0, totalPages: 0,
  });

  // View mode
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
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
  const [formMemo, setFormMemo] = useState("");
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

  const handleStatusChange = async (e: React.MouseEvent, ticketId: string, newStatus: string) => {
    e.stopPropagation();
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
          memo: formMemo || null,
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
    setFormMemo("");
    setFormCustomerId("");
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  // ─── Navigate to detail ─────────────────────────────────────────

  const openTicketDetail = (ticketId: string) => {
    router.push(`/service/${ticketId}`);
  };

  // ─── Kanban Card Component ──────────────────────────────────────

  const KanbanCard = ({ ticket }: { ticket: ServiceTicket }) => {
    const catInfo = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.other;
    const prioInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
    const transitions = STATUS_TRANSITIONS[ticket.status] || [];
    const elapsed = getElapsedDays(ticket.receivedAt || ticket.createdAt);
    const isOverdue = ticket.estimatedDays && elapsed > ticket.estimatedDays;
    const isUrgent = ticket.priority === "urgent";

    return (
      <div
        onClick={() => openTicketDetail(ticket.id)}
        className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group ${
          isUrgent
            ? "border-red-300 shadow-red-100 shadow-md ring-1 ring-red-200"
            : isOverdue
            ? "border-amber-300 shadow-amber-50"
            : "border-gray-200 shadow-sm"
        }`}
      >
        {/* 긴급 표시 바 */}
        {isUrgent && (
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl" />
        )}

        <div className="p-3.5">
          {/* 상단: 카테고리 + 우선순위 */}
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catInfo.color}`}>
              {catInfo.label}
            </span>
            <div className="flex items-center gap-1.5">
              {isOverdue && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  초과
                </span>
              )}
              <span className={`w-2 h-2 rounded-full ${prioInfo.dotColor}`} title={prioInfo.label} />
            </div>
          </div>

          {/* 제목 */}
          <h4 className="text-[13px] font-semibold text-gray-900 mb-1.5 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors">
            {ticket.title}
          </h4>

          {/* 제품명 */}
          {ticket.productName && (
            <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
              <Package className="w-3 h-3 shrink-0" />
              <span className="truncate">{ticket.productName}</span>
            </p>
          )}

          {/* 고객 정보 */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-gray-500" />
            </div>
            <span className="text-[11px] text-gray-600 truncate font-medium">
              {ticket.customer.name}
              {ticket.customer.company && (
                <span className="text-gray-400 font-normal"> · {ticket.customer.company}</span>
              )}
            </span>
          </div>

          {/* 하단: 날짜 + 소요일 */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">
              {getDaysAgo(ticket.receivedAt || ticket.createdAt)}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className={`text-[10px] font-medium ${
                isOverdue ? "text-amber-600" : "text-gray-500"
              }`}>
                {elapsed}일
                {ticket.estimatedDays && (
                  <span className="text-gray-400">/{ticket.estimatedDays}일</span>
                )}
              </span>
            </div>
          </div>

          {/* 빠른 상태 전환 버튼 */}
          {transitions.length > 0 && (
            <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={(e) => handleStatusChange(e, ticket.id, t.next)}
                  disabled={updatingId === ticket.id}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 ${t.color}`}
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
      </div>
    );
  };

  // ─── List Row Component ─────────────────────────────────────────

  const ListRow = ({ ticket }: { ticket: ServiceTicket }) => {
    const catInfo = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.other;
    const prioInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
    const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.received;
    const transitions = STATUS_TRANSITIONS[ticket.status] || [];
    const elapsed = getElapsedDays(ticket.receivedAt || ticket.createdAt);
    const isOverdue = ticket.estimatedDays && elapsed > ticket.estimatedDays;
    const isUrgent = ticket.priority === "urgent";

    return (
      <div
        onClick={() => openTicketDetail(ticket.id)}
        className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md group ${
          isUrgent ? "border-red-200 bg-red-50/30" : "border-gray-200"
        }`}
      >
        <div className="flex items-center gap-4 p-4">
          {/* 우선순위 인디케이터 */}
          <div className={`w-1 self-stretch rounded-full shrink-0 ${prioInfo.dotColor}`} />

          {/* 메인 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catInfo.color}`}>
                {catInfo.label}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {isUrgent && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold animate-pulse">
                  <Zap className="w-3 h-3" />
                  긴급
                </span>
              )}
              {isOverdue && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  기한 초과
                </span>
              )}
            </div>

            <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
              {ticket.title}
            </h4>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 font-mono">{ticket.ticketNumber}</span>
              <span className="text-xs text-gray-500">{ticket.customer.name}</span>
              {ticket.productName && (
                <span className="text-xs text-gray-400">{ticket.productName}</span>
              )}
            </div>
          </div>

          {/* 소요일 */}
          <div className="text-right shrink-0">
            <div className={`text-sm font-bold ${isOverdue ? "text-amber-600" : "text-gray-700"}`}>
              {elapsed}일
            </div>
            {ticket.estimatedDays && (
              <div className="text-[10px] text-gray-400">예상 {ticket.estimatedDays}일</div>
            )}
            <div className="text-[10px] text-gray-400 mt-0.5">
              {formatDate(ticket.receivedAt || ticket.createdAt)}
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {transitions.slice(0, 1).map((t) => (
              <button
                key={t.next}
                onClick={(e) => handleStatusChange(e, ticket.id, t.next)}
                disabled={updatingId === ticket.id}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 ${t.color}`}
              >
                {updatingId === ticket.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ArrowRight className="w-3 h-3" />
                )}
                {t.label}
              </button>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); openTicketDetail(ticket.id); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="상세 보기"
            >
              <Eye className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AS 워크센터</h1>
                <p className="text-[11px] text-gray-400">수리 · 교환 · 점검 · 환불</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 뷰 모드 토글 */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "kanban"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  칸반
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "list"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  리스트
                </button>
              </div>

              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
              >
                <Plus className="w-4 h-4" />
                AS 접수
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        {/* ─── 실시간 현황 카드 ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {/* 오늘 접수 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">오늘 접수</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayReceived}</p>
          </div>

          {/* 긴급 */}
          <div className={`rounded-xl border p-4 hover:shadow-md transition-shadow ${
            stats.urgent > 0
              ? "bg-red-50 border-red-200"
              : "bg-white border-gray-200"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${stats.urgent > 0 ? "bg-red-100" : "bg-gray-100"}`}>
                <Zap className={`w-3.5 h-3.5 ${stats.urgent > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
              <span className={`text-[11px] font-medium ${stats.urgent > 0 ? "text-red-600" : "text-gray-500"}`}>
                긴급 대기
              </span>
            </div>
            <p className={`text-2xl font-bold ${stats.urgent > 0 ? "text-red-600" : "text-gray-900"}`}>
              {stats.urgent}
            </p>
          </div>

          {/* 접수/검수 */}
          <button
            onClick={() => { setFilterStatus("received,inspecting"); setPagination(p => ({...p, page: 1})); }}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <ClipboardCheck className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">접수/검수</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.received + stats.inspecting}
            </p>
          </button>

          {/* 수리 중 */}
          <button
            onClick={() => { setFilterStatus("in_repair,waiting_parts"); setPagination(p => ({...p, page: 1})); }}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-orange-300 transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-lg">
                <Wrench className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">수리 진행</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
          </button>

          {/* 완료 */}
          <button
            onClick={() => { setFilterStatus("completed"); setPagination(p => ({...p, page: 1})); }}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-300 transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">완료</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          </button>

          {/* 오늘 완료 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">오늘 완료</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayCompleted}</p>
          </div>
        </div>

        {/* ─── 필터 바 ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 유형</option>
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
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 상태</option>
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
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 우선순위</option>
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="티켓번호, 제품명, 고객명, 시리얼번호 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {(filterCategory || filterStatus || filterPriority || searchQuery) && (
            <button
              onClick={() => {
                setFilterCategory("");
                setFilterStatus("");
                setFilterPriority("");
                setSearchQuery("");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              초기화
            </button>
          )}

          <button
            onClick={() => fetchTickets()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ─── Content ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-400">AS 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">AS 내역이 없습니다</p>
            <p className="text-gray-400 text-xs">새로운 AS를 접수해 보세요</p>
          </div>
        ) : viewMode === "kanban" ? (
          /* ─── 칸반 보드 뷰 ──────────────────────────────── */
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {KANBAN_COLUMNS.map((col) => {
              const columnTickets = tickets.filter((t) => t.status === col.key);
              const statusInfo = STATUS_CONFIG[col.key];
              return (
                <div
                  key={col.key}
                  className="flex-shrink-0 w-[280px] flex flex-col"
                >
                  {/* 칼럼 헤더 */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.headerColor}`}>
                    <span className="text-xs font-bold text-white">{col.label}</span>
                    <span className="text-xs font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                      {columnTickets.length}
                    </span>
                  </div>

                  {/* 칼럼 바디 */}
                  <div className="flex-1 bg-gray-100/70 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                    {columnTickets.length === 0 ? (
                      <div className="flex items-center justify-center h-[120px] text-xs text-gray-400">
                        비어있음
                      </div>
                    ) : (
                      columnTickets.map((ticket) => (
                        <KanbanCard key={ticket.id} ticket={ticket} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── 리스트 뷰 ───────────────────────────────── */
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <ListRow key={ticket.id} ticket={ticket} />
            ))}

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">
                  총 {pagination.total}건 중{" "}
                  {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}건
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 px-2">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── AS 접수 모달 ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AS 접수</h2>
                  <p className="text-[11px] text-gray-400">새로운 서비스 요청을 등록합니다</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="p-5 space-y-4">
              {/* 고객 검색 */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  고객 <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-700" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-gray-900">{selectedCustomer.name}</span>
                        {selectedCustomer.company && (
                          <span className="text-xs text-gray-500 ml-2">{selectedCustomer.company}</span>
                        )}
                        {selectedCustomer.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {selectedCustomer.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedCustomer(null); setFormCustomerId(""); setCustomerSearch(""); }}
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
                        placeholder="고객명, 전화번호, 회사명으로 검색..."
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setFormCustomerId(customer.id);
                              setShowCustomerDropdown(false);
                              setCustomerSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-gray-500" />
                              </div>
                              <div>
                                <span className="font-medium text-gray-900 text-sm">{customer.name}</span>
                                {customer.company && (
                                  <span className="text-xs text-gray-400 ml-2">{customer.company}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 카테고리 + 우선순위 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">유형 <span className="text-red-500">*</span></label>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(CATEGORY_CONFIG)
                      .filter(([key]) => key !== "other")
                      .map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setFormCategory(key)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                            formCategory === key
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                              : "border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {key === "repair" && <Wrench className="w-3.5 h-3.5" />}
                          {key === "exchange" && <ArrowLeftRight className="w-3.5 h-3.5" />}
                          {key === "refund" && <RefreshCw className="w-3.5 h-3.5" />}
                          {key === "inspection" && <ClipboardCheck className="w-3.5 h-3.5" />}
                          {cfg.label}
                        </button>
                      ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">우선순위</label>
                  <div className="flex gap-1.5">
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setFormPriority(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          formPriority === key
                            ? `${cfg.color} shadow-sm`
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 헤어 드라이기 온도 조절 불량"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 증상 설명 */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">증상 / 설명</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="고객이 보고한 증상이나 문제를 상세히 기록하세요..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* 제품 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">제품명</label>
                  <input
                    type="text"
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    placeholder="제품명"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">입고 시리얼번호</label>
                  <input
                    type="text"
                    value={formSerialIncoming}
                    onChange={(e) => setFormSerialIncoming(e.target.value)}
                    placeholder="S/N"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 예상 소요일 + 메모 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">예상 소요일</label>
                  <input
                    type="number"
                    value={formEstimatedDays}
                    onChange={(e) => setFormEstimatedDays(e.target.value)}
                    placeholder="일 수"
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">메모</label>
                  <input
                    type="text"
                    value={formMemo}
                    onChange={(e) => setFormMemo(e.target.value)}
                    placeholder="내부 참고 사항"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!formCustomerId || !formTitle || formSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                접수하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
