"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronRight,
  Filter,
  RefreshCw,
  User,
  Briefcase,
  Plane,
  DollarSign,
  FileText,
  Calendar,
  Palmtree,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface ApprovalStep {
  id: string;
  stepOrder: number;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  approver: {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
  };
}

interface Approval {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
  };
  steps: ApprovalStep[];
  template: { id: string; name: string } | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

// ─── Config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  leave: {
    label: "휴가",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <Palmtree className="w-3.5 h-3.5" />,
  },
  purchase: {
    label: "구매",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <DollarSign className="w-3.5 h-3.5" />,
  },
  travel: {
    label: "출장",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Plane className="w-3.5 h-3.5" />,
  },
  expense: {
    label: "경비",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Briefcase className="w-3.5 h-3.5" />,
  },
  general: {
    label: "일반",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: {
    label: "대기",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "승인",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "반려",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "취소",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: <Ban className="w-3.5 h-3.5" />,
  },
};

const TABS = [
  { key: "requester", label: "내 요청" },
  { key: "approver", label: "결재 대기" },
  { key: "all", label: "전체" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

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

const getDaysAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
};

// ─── Page Component ─────────────────────────────────────────────────

export default function ApprovalsPage() {
  const router = useRouter();

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState("requester");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Fetch Approvals ────────────────────────────────────────────

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("role", activeTab);
      }
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/approvals?${params}`);
      const data = await res.json();

      if (res.ok) {
        let filtered = data.data || [];
        // Client-side search filtering
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (a: Approval) =>
              a.title.toLowerCase().includes(q) ||
              a.requester.name.toLowerCase().includes(q)
          );
        }
        setApprovals(filtered);
        setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterType, filterStatus, searchQuery]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // ─── Get current step info ────────────────────────────────────

  const getCurrentStepInfo = (approval: Approval) => {
    if (approval.status !== "pending") return null;
    const currentStep = approval.steps.find((s) => s.status === "pending");
    if (!currentStep) return null;
    return currentStep;
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">결재 관리</h1>
                <p className="text-[11px] text-gray-400">
                  휴가 · 구매 · 출장 · 경비 · 일반
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/approvals/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              결재 요청
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {/* ─── 통계 카드 ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                대기 중
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {stats.pending}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                승인
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.approved}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                반려
              </span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {stats.rejected}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <FileCheck className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                전체
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        {/* ─── 탭 + 필터 ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 유형</option>
            <option value="leave">휴가</option>
            <option value="purchase">구매</option>
            <option value="travel">출장</option>
            <option value="expense">경비</option>
            <option value="general">일반</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 상태</option>
            <option value="pending">대기</option>
            <option value="approved">승인</option>
            <option value="rejected">반려</option>
            <option value="cancelled">취소</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 요청자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={() => fetchApprovals()}
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
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-400">
                결재 목록을 불러오는 중...
              </p>
            </div>
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <FileCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">결재 내역이 없습니다</p>
            <p className="text-gray-400 text-xs">새로운 결재를 요청해 보세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((approval) => {
              const typeConfig =
                TYPE_CONFIG[approval.type] || TYPE_CONFIG.general;
              const statusConfig =
                STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
              const currentStep = getCurrentStepInfo(approval);

              return (
                <div
                  key={approval.id}
                  onClick={() => router.push(`/approvals/${approval.id}`)}
                  className="bg-white rounded-xl border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-200 group"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Type badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 ${typeConfig.color}`}
                    >
                      {typeConfig.icon}
                      {typeConfig.label}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                        {approval.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {approval.requester.name}
                        </span>
                        {approval.requester.department && (
                          <span className="text-xs text-gray-400">
                            {approval.requester.department}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {getDaysAgo(approval.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Current step info */}
                    {currentStep && (
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-[10px] text-gray-400 font-medium">
                          현재 결재자
                        </p>
                        <p className="text-xs font-semibold text-indigo-600">
                          {currentStep.approver.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {currentStep.stepOrder}/{approval.steps.length}단계
                        </p>
                      </div>
                    )}

                    {/* Status badge */}
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </div>

                    {/* Date */}
                    <div className="text-right shrink-0 hidden md:block">
                      <p className="text-xs text-gray-500">
                        {formatDate(approval.createdAt)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </div>

                  {/* Steps progress bar */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-1">
                      {approval.steps.map((step) => (
                        <div
                          key={step.id}
                          className={`flex-1 h-1.5 rounded-full ${
                            step.status === "approved"
                              ? "bg-emerald-400"
                              : step.status === "rejected"
                              ? "bg-red-400"
                              : "bg-gray-200"
                          }`}
                          title={`${step.stepOrder}단계: ${step.approver.name} - ${
                            step.status === "approved"
                              ? "승인"
                              : step.status === "rejected"
                              ? "반려"
                              : "대기"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
