"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MonthlySale {
  month: string;
  revenue: number;
  orders: number;
}

interface Comparison {
  thisMonth: number;
  lastMonth: number;
  revenueChange: number;
  thisMonthOrders: number;
  lastMonthOrders: number;
}

const formatKRW = (v: number) => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000)}만`;
  return v.toLocaleString();
};

export default function SalesChartWidget({
  monthlySales,
  comparison,
}: {
  monthlySales: MonthlySale[];
  comparison: Comparison;
}) {
  const isUp = comparison.revenueChange >= 0;

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">매출 추이</h3>
          <p className="text-xs text-gray-500 mt-0.5">최근 6개월</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {isUp ? (
            <TrendingUp size={14} className="text-green-500" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={isUp ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            전월 대비 {isUp ? "+" : ""}{comparison.revenueChange}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[11px] text-gray-500">이번 달 매출</p>
          <p className="text-lg font-bold text-gray-900">{formatKRW(comparison.thisMonth)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[11px] text-gray-500">이번 달 주문</p>
          <p className="text-lg font-bold text-gray-900">{comparison.thisMonthOrders}건</p>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlySales} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={formatKRW} />
            <Tooltip
              formatter={(value) => [`${formatKRW(value as number)}원`, "매출"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
            />
            <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
