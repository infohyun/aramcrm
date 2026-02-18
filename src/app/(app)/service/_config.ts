export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
}

export interface ServiceTicket {
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

export interface ServiceStats {
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

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  repair: { label: "수리", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "wrench" },
  exchange: { label: "교환", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "exchange" },
  refund: { label: "환불", color: "bg-red-100 text-red-700 border-red-200", icon: "refund" },
  inspection: { label: "점검", color: "bg-teal-100 text-teal-700 border-teal-200", icon: "inspection" },
  other: { label: "기타", color: "bg-gray-100 text-gray-700 border-gray-200", icon: "other" },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  urgent: { label: "긴급", color: "bg-red-50 text-red-700 border-red-200", dotColor: "bg-red-500" },
  high: { label: "높음", color: "bg-orange-50 text-orange-700 border-orange-200", dotColor: "bg-orange-500" },
  medium: { label: "보통", color: "bg-yellow-50 text-yellow-700 border-yellow-200", dotColor: "bg-yellow-500" },
  low: { label: "낮음", color: "bg-green-50 text-green-700 border-green-200", dotColor: "bg-green-500" },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  received: { label: "접수", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300" },
  inspecting: { label: "검수 중", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-300" },
  in_repair: { label: "수리 중", color: "text-orange-700", bgColor: "bg-orange-100", borderColor: "border-orange-300" },
  waiting_parts: { label: "부품 대기", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-300" },
  completed: { label: "완료", color: "text-emerald-700", bgColor: "bg-emerald-100", borderColor: "border-emerald-300" },
  returned: { label: "반송", color: "text-indigo-700", bgColor: "bg-indigo-100", borderColor: "border-indigo-300" },
  closed: { label: "종료", color: "text-gray-500", bgColor: "bg-gray-100", borderColor: "border-gray-200" },
};

export const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
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

export const KANBAN_COLUMNS = [
  { key: "received", label: "접수", headerColor: "bg-slate-500" },
  { key: "inspecting", label: "검수 중", headerColor: "bg-blue-500" },
  { key: "in_repair", label: "수리 중", headerColor: "bg-orange-500" },
  { key: "waiting_parts", label: "부품 대기", headerColor: "bg-amber-500" },
  { key: "completed", label: "완료", headerColor: "bg-emerald-500" },
  { key: "returned", label: "반송 완료", headerColor: "bg-indigo-500" },
];

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

export const getDaysAgo = (dateStr: string) => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
};

export const getElapsedDays = (dateStr: string) =>
  Math.ceil((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
