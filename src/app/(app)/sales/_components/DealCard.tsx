"use client";

import { Calendar, Building2, User } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  grade: string;
  phone: string | null;
  email: string | null;
}

interface Deal {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  orderDate: string;
  memo: string | null;
  customer: Customer | null;
}

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

const GRADE_CONFIG: Record<string, { label: string; color: string }> = {
  vip: { label: "VIP", color: "bg-amber-100 text-amber-700" },
  gold: { label: "Gold", color: "bg-indigo-100 text-indigo-700" },
  normal: { label: "일반", color: "bg-gray-100 text-gray-600" },
  new: { label: "신규", color: "bg-green-100 text-green-700" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const grade = deal.customer?.grade || "normal";
  const gradeConfig = GRADE_CONFIG[grade] || GRADE_CONFIG.normal;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] p-3.5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
    >
      {/* Top: Product name + grade */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {deal.productName}
        </h4>
        <span
          className={`flex-shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${gradeConfig.color}`}
        >
          {gradeConfig.label}
        </span>
      </div>

      {/* Customer */}
      {deal.customer && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-700 truncate">
            {deal.customer.name}
          </span>
        </div>
      )}

      {deal.customer?.company && (
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">
            {deal.customer.company}
          </span>
        </div>
      )}

      {/* Amount */}
      <div className="mb-2">
        <span className="text-sm font-bold text-gray-900">
          {formatCurrency(deal.totalPrice)}
        </span>
        {deal.quantity > 1 && (
          <span className="text-[10px] text-gray-400 ml-1">
            ({deal.quantity}개)
          </span>
        )}
      </div>

      {/* Bottom: date + order number */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-300" />
          <span className="text-[10px] text-gray-400">
            {formatDate(deal.orderDate)}
          </span>
        </div>
        <span className="text-[10px] text-gray-300 font-mono">
          {deal.orderNumber}
        </span>
      </div>
    </div>
  );
}
