"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Save,
  X,
  MessageSquare,
  AlertCircle,
  StickyNote,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Tag,
  Clock,
  FileText,
  ShoppingBag,
  Activity,
  History,
  Loader2,
  Wrench,
} from "lucide-react";

interface CustomerDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
  position: string | null;
  department: string | null;
  address: string | null;
  addressDetail: string | null;
  zipCode: string | null;
  grade: string;
  status: string;
  source: string | null;
  memo: string | null;
  tags: string | null;
  birthday: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
    department: string | null;
  } | null;
  communications: Communication[];
  vocRecords: VOCRecord[];
  activities: ActivityRecord[];
  orders: OrderRecord[];
}

interface Communication {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  content: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface VOCRecord {
  id: string;
  category: string;
  priority: string;
  title: string;
  content: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

interface ActivityRecord {
  id: string;
  type: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  createdAt: string;
  user: { id: string; name: string };
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  orderDate: string;
  memo: string | null;
}

const TABS = [
  { key: "info", label: "기본 정보", icon: User },
  { key: "timeline", label: "360° 타임라인", icon: History },
  { key: "communications", label: "커뮤니케이션", icon: MessageSquare },
  { key: "voc", label: "VOC", icon: AlertCircle },
  { key: "orders", label: "거래 내역", icon: ShoppingBag },
  { key: "activities", label: "활동 로그", icon: Activity },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const GRADE_BADGE_STYLES: Record<string, string> = {
  vip: "bg-red-100 text-red-700 border-red-200",
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  normal: "bg-blue-100 text-blue-700 border-blue-200",
  new: "bg-green-100 text-green-700 border-green-200",
};

const GRADE_LABELS: Record<string, string> = {
  vip: "VIP",
  gold: "Gold",
  normal: "일반",
  new: "신규",
};

const STATUS_LABELS: Record<string, string> = {
  active: "활성",
  inactive: "비활성",
  dormant: "휴면",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  dormant: "bg-yellow-100 text-yellow-700",
};

const COMM_TYPE_LABELS: Record<string, string> = {
  email: "이메일",
  sms: "문자",
  kakao: "카카오톡",
  phone: "전화",
  meeting: "미팅",
  other: "기타",
};

const COMM_DIRECTION_LABELS: Record<string, string> = {
  inbound: "수신",
  outbound: "발신",
};

const VOC_CATEGORY_LABELS: Record<string, string> = {
  complaint: "불만",
  suggestion: "제안",
  inquiry: "문의",
  praise: "칭찬",
  other: "기타",
};

const VOC_PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const VOC_STATUS_LABELS: Record<string, string> = {
  open: "접수",
  in_progress: "처리중",
  resolved: "해결",
  closed: "종료",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  confirmed: "확인",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "통화",
  email: "이메일",
  meeting: "미팅",
  note: "메모",
  task: "작업",
  status_change: "상태 변경",
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/customers");
          return;
        }
        throw new Error("Failed to fetch customer");
      }
      const data: CustomerDetail = await res.json();
      setCustomer(data);
    } catch (error) {
      console.error("고객 상세 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [customerId, router]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const startEditing = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      mobile: customer.mobile || "",
      company: customer.company || "",
      position: customer.position || "",
      department: customer.department || "",
      address: customer.address || "",
      addressDetail: customer.addressDetail || "",
      zipCode: customer.zipCode || "",
      grade: customer.grade || "normal",
      status: customer.status || "active",
      source: customer.source || "",
      memo: customer.memo || "",
      tags: customer.tags || "",
      birthday: customer.birthday || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveChanges = async () => {
    if (!editForm.name?.trim()) {
      alert("고객 이름은 필수 입력 항목입니다.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      await fetchCustomer();
      setIsEditing(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "수정에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      router.push("/customers");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "삭제에 실패했습니다."
      );
    }
    setShowDeleteConfirm(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${formatDate(dateStr)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">고객 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                고객 삭제
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              <strong>{customer.name}</strong> 고객을 정말 삭제하시겠습니까?
              <br />
              관련된 커뮤니케이션, VOC, 주문 내역이 모두 삭제됩니다.
              <br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/customers")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-500">고객 관리</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl flex-shrink-0">
                {customer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {customer.name}
                  </h1>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      GRADE_BADGE_STYLES[customer.grade] ||
                      GRADE_BADGE_STYLES.normal
                    }`}
                  >
                    {GRADE_LABELS[customer.grade] || customer.grade}
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_BADGE_STYLES[customer.status] ||
                      STATUS_BADGE_STYLES.active
                    }`}
                  >
                    {STATUS_LABELS[customer.status] || customer.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  {customer.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {customer.company}
                      {customer.position && ` / ${customer.position}`}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {customer.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                <MessageSquare className="w-4 h-4" />
                메시지 보내기
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
                <AlertCircle className="w-4 h-4" />
                VOC 등록
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                <StickyNote className="w-4 h-4" />
                메모 추가
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="고객 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-0 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === "communications" &&
                    customer.communications.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {customer.communications.length}
                      </span>
                    )}
                  {tab.key === "voc" && customer.vocRecords.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {customer.vocRecords.length}
                    </span>
                  )}
                  {tab.key === "orders" && customer.orders.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {customer.orders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 기본 정보 탭 */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                기본 정보
              </h2>
              {!isEditing ? (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  수정
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 고객 정보 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/60 border-b border-gray-200">
                  <User className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    고객 정보
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <InfoRow
                    label="이름"
                    value={customer.name}
                    editing={isEditing}
                    editValue={editForm.name}
                    editName="name"
                    onChange={handleEditChange}
                    required
                  />
                  <InfoRow
                    label="등급"
                    editing={isEditing}
                    editValue={editForm.grade}
                    editName="grade"
                    onChange={handleEditChange}
                    type="select"
                    options={[
                      { value: "new", label: "신규" },
                      { value: "normal", label: "일반" },
                      { value: "gold", label: "Gold" },
                      { value: "vip", label: "VIP" },
                    ]}
                    value={GRADE_LABELS[customer.grade] || customer.grade}
                  />
                  <InfoRow
                    label="상태"
                    editing={isEditing}
                    editValue={editForm.status}
                    editName="status"
                    onChange={handleEditChange}
                    type="select"
                    options={[
                      { value: "active", label: "활성" },
                      { value: "inactive", label: "비활성" },
                      { value: "dormant", label: "휴면" },
                    ]}
                    value={STATUS_LABELS[customer.status] || customer.status}
                  />
                  <InfoRow
                    label="유입경로"
                    value={customer.source}
                    editing={isEditing}
                    editValue={editForm.source}
                    editName="source"
                    onChange={handleEditChange}
                  />
                  <InfoRow
                    label="생일"
                    value={customer.birthday}
                    editing={isEditing}
                    editValue={editForm.birthday}
                    editName="birthday"
                    onChange={handleEditChange}
                    icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  />
                  <InfoRow
                    label="태그"
                    value={customer.tags}
                    editing={isEditing}
                    editValue={editForm.tags}
                    editName="tags"
                    onChange={handleEditChange}
                    icon={<Tag className="w-4 h-4 text-gray-400" />}
                  />
                </div>
              </div>

              {/* 연락처 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/60 border-b border-gray-200">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    연락처
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <InfoRow
                    label="이메일"
                    value={customer.email}
                    editing={isEditing}
                    editValue={editForm.email}
                    editName="email"
                    onChange={handleEditChange}
                    icon={<Mail className="w-4 h-4 text-gray-400" />}
                  />
                  <InfoRow
                    label="전화번호"
                    value={customer.phone}
                    editing={isEditing}
                    editValue={editForm.phone}
                    editName="phone"
                    onChange={handleEditChange}
                    icon={<Phone className="w-4 h-4 text-gray-400" />}
                  />
                  <InfoRow
                    label="휴대폰"
                    value={customer.mobile}
                    editing={isEditing}
                    editValue={editForm.mobile}
                    editName="mobile"
                    onChange={handleEditChange}
                    icon={<Phone className="w-4 h-4 text-gray-400" />}
                  />
                </div>
              </div>

              {/* 회사 정보 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/60 border-b border-gray-200">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    회사 정보
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <InfoRow
                    label="회사명"
                    value={customer.company}
                    editing={isEditing}
                    editValue={editForm.company}
                    editName="company"
                    onChange={handleEditChange}
                  />
                  <InfoRow
                    label="직책"
                    value={customer.position}
                    editing={isEditing}
                    editValue={editForm.position}
                    editName="position"
                    onChange={handleEditChange}
                  />
                  <InfoRow
                    label="부서"
                    value={customer.department}
                    editing={isEditing}
                    editValue={editForm.department}
                    editName="department"
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              {/* 주소 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/60 border-b border-gray-200">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-700">주소</h3>
                </div>
                <div className="p-5 space-y-4">
                  <InfoRow
                    label="우편번호"
                    value={customer.zipCode}
                    editing={isEditing}
                    editValue={editForm.zipCode}
                    editName="zipCode"
                    onChange={handleEditChange}
                  />
                  <InfoRow
                    label="주소"
                    value={customer.address}
                    editing={isEditing}
                    editValue={editForm.address}
                    editName="address"
                    onChange={handleEditChange}
                  />
                  <InfoRow
                    label="상세주소"
                    value={customer.addressDetail}
                    editing={isEditing}
                    editValue={editForm.addressDetail}
                    editName="addressDetail"
                    onChange={handleEditChange}
                  />
                </div>
              </div>
            </div>

            {/* 메모 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/60 border-b border-gray-200">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-700">메모</h3>
              </div>
              <div className="p-5">
                {isEditing ? (
                  <textarea
                    name="memo"
                    value={editForm.memo || ""}
                    onChange={handleEditChange}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {customer.memo || "메모가 없습니다."}
                  </p>
                )}
              </div>
            </div>

            {/* 관리 정보 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  등록일: {formatDateTime(customer.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  수정일: {formatDateTime(customer.updatedAt)}
                </span>
                {customer.assignedTo && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    담당자: {customer.assignedTo.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 360° 타임라인 탭 */}
        {activeTab === "timeline" && (
          <CustomerTimeline customerId={customer.id} />
        )}

        {/* 커뮤니케이션 탭 */}
        {activeTab === "communications" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                커뮤니케이션 이력
              </h2>
            </div>
            {customer.communications.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="커뮤니케이션 이력이 없습니다"
                description="이 고객과의 커뮤니케이션 기록이 아직 없습니다."
              />
            ) : (
              <div className="space-y-4">
                {customer.communications.map((comm) => (
                  <div
                    key={comm.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            comm.direction === "inbound"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {COMM_DIRECTION_LABELS[comm.direction] ||
                            comm.direction}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {COMM_TYPE_LABELS[comm.type] || comm.type}
                        </span>
                        {comm.subject && (
                          <span className="font-medium text-sm text-gray-900">
                            {comm.subject}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(comm.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comm.content}
                    </p>
                    <div className="mt-3 text-xs text-gray-400">
                      작성자: {comm.user.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VOC 탭 */}
        {activeTab === "voc" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                VOC (고객의 소리)
              </h2>
            </div>
            {customer.vocRecords.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="VOC 기록이 없습니다"
                description="이 고객의 VOC 기록이 아직 없습니다."
              />
            ) : (
              <div className="space-y-4">
                {customer.vocRecords.map((voc) => (
                  <div
                    key={voc.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            VOC_PRIORITY_STYLES[voc.priority] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {voc.priority === "high"
                            ? "높음"
                            : voc.priority === "medium"
                              ? "보통"
                              : "낮음"}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {VOC_CATEGORY_LABELS[voc.category] || voc.category}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {VOC_STATUS_LABELS[voc.status] || voc.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(voc.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {voc.title}
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {voc.content}
                    </p>
                    {voc.resolution && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs font-medium text-green-700 mb-1">
                          해결 내용
                        </p>
                        <p className="text-sm text-green-800">
                          {voc.resolution}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 text-xs text-gray-400">
                      담당자: {voc.user.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 거래 내역 탭 */}
        {activeTab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                거래 내역
              </h2>
            </div>
            {customer.orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="거래 내역이 없습니다"
                description="이 고객의 거래 내역이 아직 없습니다."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/60 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                          주문번호
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                          상품명
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                          수량
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                          단가
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                          합계
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                          상태
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                          주문일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customer.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {order.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {order.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {formatPrice(order.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatPrice(order.totalPrice)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                ORDER_STATUS_STYLES[order.status] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {ORDER_STATUS_LABELS[order.status] ||
                                order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(order.orderDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 활동 로그 탭 */}
        {activeTab === "activities" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                활동 로그
              </h2>
            </div>
            {customer.activities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="활동 로그가 없습니다"
                description="이 고객 관련 활동 기록이 아직 없습니다."
              />
            ) : (
              <div className="relative">
                {/* 타임라인 라인 */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {customer.activities.map((activity) => (
                    <div key={activity.id} className="relative pl-12">
                      <div className="absolute left-3 top-2 w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-400" />
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {ACTIVITY_TYPE_LABELS[activity.type] ||
                                activity.type}
                            </span>
                            <span className="font-medium text-sm text-gray-900">
                              {activity.title}
                            </span>
                            {activity.isCompleted && (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                완료
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(activity.createdAt)}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          {activity.user.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 정보 행 컴포넌트
function InfoRow({
  label,
  value,
  editing,
  editValue,
  editName,
  onChange,
  icon,
  required,
  type = "text",
  options,
}: {
  label: string;
  value?: string | null;
  editing: boolean;
  editValue?: string;
  editName: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  icon?: React.ReactNode;
  required?: boolean;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-20 flex-shrink-0 pt-1">
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex-1">
        {editing ? (
          type === "select" && options ? (
            <select
              name={editName}
              value={editValue || ""}
              onChange={onChange}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name={editName}
              value={editValue || ""}
              onChange={onChange}
              required={required}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )
        ) : (
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-sm text-gray-900">
              {value || "-"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 360도 타임라인 컴포넌트
interface TimelineEvent {
  type: "order" | "communication" | "voc" | "service" | "activity";
  id: string;
  title: string;
  subtitle: string;
  status: string;
  date: string;
}

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  order: ShoppingBag,
  communication: MessageSquare,
  voc: AlertCircle,
  service: Wrench,
  activity: Activity,
};

const TIMELINE_COLORS: Record<string, string> = {
  order: "bg-green-100 border-green-400 text-green-600",
  communication: "bg-blue-100 border-blue-400 text-blue-600",
  voc: "bg-amber-100 border-amber-400 text-amber-600",
  service: "bg-red-100 border-red-400 text-red-600",
  activity: "bg-indigo-100 border-indigo-400 text-indigo-600",
};

const TIMELINE_LABELS: Record<string, string> = {
  order: "주문",
  communication: "커뮤니케이션",
  voc: "VOC",
  service: "AS",
  activity: "활동",
};

function CustomerTimeline({ customerId }: { customerId: string }) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/${customerId}/timeline`);
        if (res.ok) {
          const data = await res.json();
          setTimeline(data.timeline || []);
          setCounts(data.counts || {});
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [customerId]);

  const filtered = filter === "all" ? timeline : timeline.filter((e) => e.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">360° 고객 타임라인</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { key: "orders", label: "주문", color: "bg-green-50 text-green-700" },
          { key: "communications", label: "소통", color: "bg-blue-50 text-blue-700" },
          { key: "vocs", label: "VOC", color: "bg-amber-50 text-amber-700" },
          { key: "serviceTickets", label: "AS", color: "bg-red-50 text-red-700" },
          { key: "activities", label: "활동", color: "bg-indigo-50 text-indigo-700" },
        ].map((c) => (
          <div key={c.key} className={`rounded-xl p-3 text-center ${c.color}`}>
            <p className="text-xl font-bold">{counts[c.key] || 0}</p>
            <p className="text-[11px] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "all", label: "전체" },
          { key: "order", label: "주문" },
          { key: "communication", label: "소통" },
          { key: "voc", label: "VOC" },
          { key: "service", label: "AS" },
          { key: "activity", label: "활동" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-70">
                {f.key === "order" ? counts.orders || 0 :
                 f.key === "communication" ? counts.communications || 0 :
                 f.key === "voc" ? counts.vocs || 0 :
                 f.key === "service" ? counts.serviceTickets || 0 :
                 counts.activities || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="기록이 없습니다"
          description="이 고객과 관련된 활동 기록이 없습니다."
        />
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {filtered.map((event, idx) => {
              const Icon = TIMELINE_ICONS[event.type] || Activity;
              const colorClass = TIMELINE_COLORS[event.type] || "bg-gray-100 border-gray-400 text-gray-600";

              return (
                <div key={`${event.type}-${event.id}-${idx}`} className="relative pl-12">
                  <div className={`absolute left-3 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                    <Icon size={10} />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                            {TIMELINE_LABELS[event.type] || event.type}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                            {event.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        {event.subtitle && (
                          <p className="text-xs text-gray-500 mt-0.5">{event.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {new Date(event.date).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 빈 상태 컴포넌트
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-12 flex flex-col items-center justify-center">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
