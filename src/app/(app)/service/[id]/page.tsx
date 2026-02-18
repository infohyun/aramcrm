"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Wrench,
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Tag,
  DollarSign,
  Calendar,
  Clock,
  Truck,
  FileText,
  User,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  X,
  Zap,
  ClipboardCheck,
  RefreshCw,
  ArrowLeftRight,
  Edit3,
  ChevronRight,
  Hash,
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
  repairCost: number | null;
  partsCost: number | null;
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
  updatedAt: string;
}

// ─── Config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  repair: { label: "수리", color: "bg-blue-100 text-blue-700 border-blue-200" },
  exchange: { label: "교환", color: "bg-purple-100 text-purple-700 border-purple-200" },
  refund: { label: "환불", color: "bg-red-100 text-red-700 border-red-200" },
  inspection: { label: "점검", color: "bg-teal-100 text-teal-700 border-teal-200" },
  other: { label: "기타", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string }> = {
  urgent: { label: "긴급", dotColor: "bg-red-500", bgColor: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "높음", dotColor: "bg-orange-500", bgColor: "bg-orange-50 text-orange-700 border-orange-200" },
  medium: { label: "보통", dotColor: "bg-yellow-500", bgColor: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  low: { label: "낮음", dotColor: "bg-green-500", bgColor: "bg-green-50 text-green-700 border-green-200" },
};

const STATUS_FLOW = [
  { key: "received", label: "접수", color: "bg-slate-500", lightColor: "bg-slate-100 text-slate-700" },
  { key: "inspecting", label: "검수", color: "bg-blue-500", lightColor: "bg-blue-100 text-blue-700" },
  { key: "in_repair", label: "수리 중", color: "bg-orange-500", lightColor: "bg-orange-100 text-orange-700" },
  { key: "waiting_parts", label: "부품 대기", color: "bg-amber-500", lightColor: "bg-amber-100 text-amber-700" },
  { key: "completed", label: "완료", color: "bg-emerald-500", lightColor: "bg-emerald-100 text-emerald-700" },
  { key: "returned", label: "반송", color: "bg-indigo-500", lightColor: "bg-indigo-100 text-indigo-700" },
  { key: "closed", label: "종료", color: "bg-gray-400", lightColor: "bg-gray-100 text-gray-500" },
];

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
  returned: [{ label: "종료 처리", next: "closed", color: "bg-gray-600 hover:bg-gray-700 text-white" }],
};

const COURIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배", "경동택배"];

// ─── Helpers ────────────────────────────────────────────────────────

const formatDateFull = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
};

const getElapsedDays = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── Component ──────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 편집 상태
  const [editRepairCost, setEditRepairCost] = useState("");
  const [editPartsCost, setEditPartsCost] = useState("");
  const [editSerialOutgoing, setEditSerialOutgoing] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editReturnCourier, setEditReturnCourier] = useState("");
  const [editReturnTrackingNo, setEditReturnTrackingNo] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // 부품 관리
  const [parts, setParts] = useState<string[]>([]);
  const [newPart, setNewPart] = useState("");

  // ─── Fetch Ticket ──────────────────────────────────────────────

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/service/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
        // 편집 필드 초기화
        setEditRepairCost(String(data.repairCost || 0));
        setEditPartsCost(String(data.partsCost || 0));
        setEditSerialOutgoing(data.serialOutgoing || "");
        setEditMemo(data.memo || "");
        setEditReturnCourier(data.returnCourier || "");
        setEditReturnTrackingNo(data.returnTrackingNo || "");
        setEditDescription(data.description || "");
        // 부품 파싱
        try {
          setParts(data.partsUsed ? JSON.parse(data.partsUsed) : []);
        } catch {
          setParts([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // ─── Save Changes ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/service/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairCost: parseFloat(editRepairCost) || 0,
          partsCost: parseFloat(editPartsCost) || 0,
          serialOutgoing: editSerialOutgoing || null,
          memo: editMemo || null,
          returnCourier: editReturnCourier || null,
          returnTrackingNo: editReturnTrackingNo || null,
          description: editDescription || null,
          partsUsed: parts,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        fetchTicket();
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  // ─── Status Change ────────────────────────────────────────────

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/service/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTicket();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  // ─── Part Management ──────────────────────────────────────────

  const addPart = () => {
    if (newPart.trim()) {
      setParts([...parts, newPart.trim()]);
      setNewPart("");
    }
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  // ─── Loading State ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">AS 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">AS 접수건을 찾을 수 없습니다</p>
        <button
          onClick={() => router.push("/service")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
      </div>
    );
  }

  const catInfo = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.other;
  const prioInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const transitions = STATUS_TRANSITIONS[ticket.status] || [];
  const elapsed = getElapsedDays(ticket.receivedAt || ticket.createdAt);
  const isOverdue = ticket.estimatedDays && elapsed > ticket.estimatedDays;
  const isUrgent = ticket.priority === "urgent";
  const totalCost = (parseFloat(editRepairCost) || 0) + (parseFloat(editPartsCost) || 0);

  // 현재 상태의 인덱스 (진행 바용)
  const currentStatusIndex = STATUS_FLOW.findIndex((s) => s.key === ticket.status);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── 상단 바 ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/service")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                목록
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <span className="text-sm font-mono text-gray-500">{ticket.ticketNumber}</span>
              {isUrgent && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                  <Zap className="w-3 h-3" />
                  긴급
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  저장 완료
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 shadow-md shadow-indigo-200"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── 제목 + 메타 정보 ──────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${catInfo.color}`}>
              {ticket.category === "repair" && <Wrench className="w-3 h-3 inline mr-1" />}
              {ticket.category === "exchange" && <ArrowLeftRight className="w-3 h-3 inline mr-1" />}
              {ticket.category === "refund" && <RefreshCw className="w-3 h-3 inline mr-1" />}
              {ticket.category === "inspection" && <ClipboardCheck className="w-3 h-3 inline mr-1" />}
              {catInfo.label}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${prioInfo.bgColor}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${prioInfo.dotColor} mr-1`} />
              {prioInfo.label}
            </span>
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                기한 초과 ({elapsed - (ticket.estimatedDays || 0)}일)
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">{ticket.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>접수: {formatDateFull(ticket.receivedAt || ticket.createdAt)}</span>
            <span>·</span>
            <span className={isOverdue ? "text-amber-600 font-semibold" : ""}>
              경과 {elapsed}일
              {ticket.estimatedDays && <span> / 예상 {ticket.estimatedDays}일</span>}
            </span>
            {ticket.assignedTo && (
              <>
                <span>·</span>
                <span>담당: {ticket.assignedTo.name}</span>
              </>
            )}
          </div>
        </div>

        {/* ─── 상태 진행 바 ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">진행 상태</h3>

          {/* 프로그레스 스텝 */}
          <div className="flex items-center mb-5">
            {STATUS_FLOW.map((step, i) => {
              const isPast = i < currentStatusIndex;
              const isCurrent = i === currentStatusIndex;
              const isFuture = i > currentStatusIndex;
              // waiting_parts는 특수 상태 - 메인 플로우에서는 건너뛸 수 있음
              if (step.key === "waiting_parts" && ticket.status !== "waiting_parts") return null;

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPast
                          ? `${step.color} text-white`
                          : isCurrent
                          ? `${step.color} text-white ring-4 ring-offset-2 ring-${step.color.replace("bg-", "")}/30 shadow-lg`
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                        isCurrent ? "text-gray-900 font-bold" : isPast ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className={`text-[9px] mt-0.5 font-medium ${step.lightColor} px-1.5 py-0.5 rounded-full`}>
                        현재
                      </span>
                    )}
                  </div>
                  {i < STATUS_FLOW.length - 1 && step.key !== "waiting_parts" && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${
                      isPast ? step.color : "bg-gray-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 상태 전환 버튼 */}
          {transitions.length > 0 && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">다음 단계:</span>
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={() => handleStatusChange(t.next)}
                  disabled={statusUpdating}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 ${t.color}`}
                >
                  {statusUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ─── 왼쪽: 수리 작업 영역 ───────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* 증상/설명 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">증상 / 설명</h3>
              </div>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="고객 증상, 수리 내용 등을 기록하세요..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-colors"
              />
            </div>

            {/* 제품 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">제품 정보</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">제품명</label>
                  <p className="text-sm font-medium text-gray-900 mt-1 bg-gray-50 px-3 py-2 rounded-lg">
                    {ticket.productName || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">입고 S/N</label>
                  <p className="text-sm font-mono text-gray-900 mt-1 bg-gray-50 px-3 py-2 rounded-lg">
                    {ticket.serialIncoming || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">출고 S/N</label>
                  <input
                    type="text"
                    value={editSerialOutgoing}
                    onChange={(e) => setEditSerialOutgoing(e.target.value)}
                    placeholder="출고 시리얼번호 입력"
                    className="w-full text-sm font-mono mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 비용 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">비용 정보</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">수리비</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={editRepairCost}
                      onChange={(e) => setEditRepairCost(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full text-sm font-medium px-3 py-2.5 pr-8 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">부품비</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={editPartsCost}
                      onChange={(e) => setEditPartsCost(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full text-sm font-medium px-3 py-2.5 pr-8 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">합계</label>
                  <div className="mt-1 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="text-sm font-bold text-indigo-700">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용 부품 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">사용 부품</h3>
                <span className="text-xs text-gray-400 ml-auto">{parts.length}개</span>
              </div>

              {/* 부품 목록 */}
              {parts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {parts.map((part, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 group"
                    >
                      <Tag className="w-3 h-3" />
                      {part}
                      <button
                        onClick={() => removePart(i)}
                        className="ml-1 p-0.5 rounded-full hover:bg-indigo-200 transition-colors opacity-50 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 부품 추가 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPart}
                  onChange={(e) => setNewPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addPart(); }
                  }}
                  placeholder="부품명을 입력하고 Enter"
                  className="flex-1 text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button
                  onClick={addPart}
                  disabled={!newPart.trim()}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  추가
                </button>
              </div>
            </div>

            {/* 반송 물류 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">반송 물류</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">택배사</label>
                  <select
                    value={editReturnCourier}
                    onChange={(e) => setEditReturnCourier(e.target.value)}
                    className="w-full text-sm mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">택배사 선택</option>
                    {COURIERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">운송장 번호</label>
                  <input
                    type="text"
                    value={editReturnTrackingNo}
                    onChange={(e) => setEditReturnTrackingNo(e.target.value)}
                    placeholder="운송장 번호 입력"
                    className="w-full text-sm font-mono mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 메모 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Edit3 className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">작업 메모</h3>
              </div>
              <textarea
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="수리 과정, 특이사항, 내부 참고 메모를 기록하세요..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-colors"
              />
            </div>
          </div>

          {/* ─── 오른쪽: 정보 사이드바 ──────────────────────────── */}
          <div className="space-y-5">
            {/* 고객 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">고객 정보</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{ticket.customer.name}</p>
                    {ticket.customer.company && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {ticket.customer.company}
                      </p>
                    )}
                  </div>
                </div>
                {ticket.customer.phone && (
                  <a
                    href={`tel:${ticket.customer.phone}`}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium group-hover:underline">
                      {ticket.customer.phone}
                    </span>
                  </a>
                )}
                {ticket.customer.mobile && ticket.customer.mobile !== ticket.customer.phone && (
                  <a
                    href={`tel:${ticket.customer.mobile}`}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium group-hover:underline">
                      {ticket.customer.mobile}
                    </span>
                  </a>
                )}
                {ticket.customer.email && (
                  <a
                    href={`mailto:${ticket.customer.email}`}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 group-hover:underline truncate">
                      {ticket.customer.email}
                    </span>
                  </a>
                )}
              </div>
            </div>

            {/* 처리 타임라인 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">처리 이력</h3>
              </div>
              <div className="space-y-0">
                {[
                  { label: "접수", date: ticket.receivedAt || ticket.createdAt, always: true },
                  { label: "검수", date: ticket.inspectedAt, always: false },
                  { label: "수리 완료", date: ticket.repairedAt, always: false },
                  { label: "반송", date: ticket.returnedAt, always: false },
                ].map((item, i, arr) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                          item.date
                            ? "bg-indigo-600 border-indigo-600"
                            : "bg-white border-gray-300"
                        }`}
                      />
                      {i < arr.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[24px] ${item.date ? "bg-indigo-200" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={`text-xs font-semibold ${item.date ? "text-gray-900" : "text-gray-400"}`}>
                        {item.label}
                      </p>
                      {item.date && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{formatDateTime(item.date)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 소요일 요약 */}
              <div className="mt-2 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-400 font-medium">경과일</p>
                    <p className={`text-lg font-bold ${isOverdue ? "text-amber-600" : "text-gray-900"}`}>
                      {elapsed}일
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-400 font-medium">예상일</p>
                    <p className="text-lg font-bold text-gray-900">
                      {ticket.estimatedDays ? `${ticket.estimatedDays}일` : "-"}
                    </p>
                  </div>
                </div>
                {ticket.actualDays && (
                  <div className="text-center p-2 bg-emerald-50 rounded-lg mt-2">
                    <p className="text-[10px] text-emerald-600 font-medium">실제 소요</p>
                    <p className="text-lg font-bold text-emerald-700">{ticket.actualDays}일</p>
                  </div>
                )}
              </div>
            </div>

            {/* 빠른 저장 (모바일용) */}
            <div className="lg:hidden">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                모든 변경사항 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
