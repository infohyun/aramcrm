"use client";

import {
  TrendingUp,
  Wrench,
  Users,
  Package,
  FolderKanban,
} from "lucide-react";

interface ReportFilterProps {
  activeType: string;
  activePeriod: string;
  onTypeChange: (type: string) => void;
  onPeriodChange: (period: string) => void;
}

const REPORT_TYPES = [
  { key: "sales", label: "영업", icon: TrendingUp },
  { key: "service", label: "AS", icon: Wrench },
  { key: "customer", label: "고객", icon: Users },
  { key: "inventory", label: "재고", icon: Package },
  { key: "project", label: "프로젝트", icon: FolderKanban },
];

const PERIOD_OPTIONS = [
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
  { key: "quarter", label: "분기" },
  { key: "year", label: "연간" },
];

export default function ReportFilter({
  activeType,
  activePeriod,
  onTypeChange,
  onPeriodChange,
}: ReportFilterProps) {
  return (
    <div className="space-y-4">
      {/* 리포트 유형 탭 */}
      <div className="flex items-center gap-2 flex-wrap">
        {REPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = activeType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => onTypeChange(type.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* 기간 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 mr-1">기간:</span>
        {PERIOD_OPTIONS.map((period) => {
          const isActive = activePeriod === period.key;
          return (
            <button
              key={period.key}
              onClick={() => onPeriodChange(period.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {period.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
