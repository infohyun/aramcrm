"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FileCheck,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  User,
  Calendar,
  Palmtree,
  DollarSign,
  Plane,
  Briefcase,
  FileText,
  AlertTriangle,
} from "lucide-react";
import ApprovalTimeline from "../_components/ApprovalTimeline";
import ApprovalActions from "../_components/ApprovalActions";

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
    email?: string;
    department: string | null;
    position: string | null;
    avatar?: string | null;
  };
}

interface Approval {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  attachments: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string;
    email?: string;
    department: string | null;
    position: string | null;
    avatar?: string | null;
  };
  steps: ApprovalStep[];
  template: { id: string; name: string; type: string } | null;
}

// ─── Config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  leave: {
    label: "휴가",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <Palmtree className="w-4 h-4" />,
  },
  purchase: {
    label: "구매",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <DollarSign className="w-4 h-4" />,
  },
  travel: {
    label: "출장",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Plane className="w-4 h-4" />,
  },
  expense: {
    label: "경비",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Briefcase className="w-4 h-4" />,
  },
  general: {
    label: "일반",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <FileText className="w-4 h-4" />,
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "결재 대기",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    label: "승인 완료",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  rejected: {
    label: "반려",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-4 h-4" />,
  },
  cancelled: {
    label: "취소",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: <Ban className="w-4 h-4" />,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateFull = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ─── Page Component ─────────────────────────────────────────────────

export default function ApprovalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const approvalId = params.id as string;

  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // ─── Fetch current user session ─────────────────────────────────
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          setCurrentUserId(data?.user?.id || null);
        }
      } catch {
        // ignore
      }
    };
    fetchSession();
  }, []);

  // ─── Fetch Approval ─────────────────────────────────────────────

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}`);
      if (res.ok) {
        const data = await res.json();
        setApproval(data);
      }
    } catch (error) {
      console.error("Failed to fetch approval:", error);
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  useEffect(() => {
    fetchApproval();
  }, [fetchApproval]);

  // ─── Cancel Approval ────────────────────────────────────────────

  const handleCancel = async () => {
    if (!approval) return;
    if (!confirm("이 결재를 취소하시겠습니까?")) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        fetchApproval();
      } else {
        const data = await res.json();
        alert(data.error || "결재 취소에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to cancel:", error);
    } finally {
      setCancelling(false);
    }
  };

  // ─── Determine if current user can act ───────────────────────────

  const canAct = (() => {
    if (!approval || !currentUserId) return false;
    if (approval.status !== "pending") return false;
    const currentStep = approval.steps.find((s) => s.status === "pending");
    if (!currentStep) return false;
    return currentStep.approverId === currentUserId;
  })();

  const isRequester = approval?.requester.id === currentUserId;
  const canCancel = isRequester && approval?.status === "pending";

  // ─── Loading State ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">결재 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">결재 문서를 찾을 수 없습니다</p>
        <button
          onClick={() => router.push("/approvals")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[approval.type] || TYPE_CONFIG.general;
  const statusConfig = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/approvals")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                목록
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
              </div>
            </div>

            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                결재 취소
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ─── 왼쪽: 결재 내용 ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title & Meta */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${typeConfig.color}`}
                >
                  {typeConfig.icon}
                  {typeConfig.label}
                </span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-3">
                {approval.title}
              </h1>

              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {approval.requester.name}
                  {approval.requester.position &&
                    ` (${approval.requester.position})`}
                </span>
                {approval.requester.department && (
                  <span>{approval.requester.department}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateFull(approval.createdAt)}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                결재 내용
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {approval.content}
              </div>
            </div>

            {/* Approval Actions (if user can act) */}
            {canAct && (
              <ApprovalActions
                approvalId={approval.id}
                onDecided={() => fetchApproval()}
              />
            )}
          </div>

          {/* ─── 오른쪽: 결재선 + 정보 ────────────────────────── */}
          <div className="space-y-5">
            {/* Requester info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                요청자 정보
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {approval.requester.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {approval.requester.position &&
                      `${approval.requester.position} `}
                    {approval.requester.department &&
                      `/ ${approval.requester.department}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Approval timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                결재선
              </h3>
              <ApprovalTimeline steps={approval.steps} />
            </div>

            {/* Additional info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                상세 정보
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">문서 번호</span>
                  <span className="text-xs font-mono text-gray-600">
                    {approval.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">결재 유형</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeConfig.color}`}
                  >
                    {typeConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">요청일</span>
                  <span className="text-xs text-gray-600">
                    {formatDateTime(approval.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">최종 수정</span>
                  <span className="text-xs text-gray-600">
                    {formatDateTime(approval.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">결재 단계</span>
                  <span className="text-xs text-gray-600">
                    {approval.steps.filter((s) => s.status !== "pending").length}
                    /{approval.steps.length} 완료
                  </span>
                </div>
                {approval.template && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">사용 템플릿</span>
                    <span className="text-xs text-gray-600">
                      {approval.template.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
