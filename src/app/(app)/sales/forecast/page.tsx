"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ForecastData {
  month: string;
  revenue: number;
  type: string;
}

interface Summary {
  totalRevenue: number;
  avgMonthlyRevenue: number;
  recentTrend: number;
  nextQuarterForecast: number;
  slope: number;
}

interface PipelineItem {
  status: string;
  count: number;
  revenue: number;
}

const formatKRW = (v: number) => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000)}만`;
  return v.toLocaleString();
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  confirmed: "확인",
  processing: "처리중",
  shipped: "배송",
  delivered: "배달완료",
  cancelled: "취소",
  completed: "완료",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#6366f1",
  confirmed: "#3b82f6",
  processing: "#f59e0b",
  shipped: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#ef4444",
  completed: "#10b981",
};

export default function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sales/forecast");
        if (res.ok) {
          const data = await res.json();
          setForecast(data.forecast);
          setSummary(data.summary);
          setPipeline(data.pipeline);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const lastActualIndex = forecast.findIndex((f) => f.type === "forecast") - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Link href="/sales" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">매출 예측</h1>
              <p className="text-sm text-gray-500 mt-0.5">과거 데이터 기반 3개월 예측</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <DollarSign className="w-4 h-4" />연간 누적 매출
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatKRW(summary.totalRevenue)}원</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <BarChart3 className="w-4 h-4" />월 평균 매출
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatKRW(summary.avgMonthlyRevenue)}원</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                {summary.recentTrend >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                최근 추세
              </div>
              <p className={`text-2xl font-bold ${summary.recentTrend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {summary.recentTrend >= 0 ? "+" : ""}{summary.recentTrend}%
              </p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4 text-indigo-500" />다음 분기 예측
              </div>
              <p className="text-2xl font-bold text-indigo-600">{formatKRW(summary.nextQuarterForecast)}원</p>
            </div>
          </div>
        )}

        {/* Forecast Chart */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">매출 추이 및 예측</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#999" }} />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} tickFormatter={formatKRW} />
                <Tooltip formatter={(value) => [`${formatKRW(value as number)}원`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend />
                {lastActualIndex >= 0 && (
                  <ReferenceLine x={forecast[lastActualIndex]?.month} stroke="#999" strokeDasharray="5 5" label={{ value: "예측 시작", position: "top", fontSize: 11, fill: "#999" }} />
                )}
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, index } = props as { cx?: number; cy?: number; index?: number };
                    if (cx == null || cy == null || index == null) return <circle />;
                    const isForecast = forecast[index]?.type === "forecast";
                    return (
                      <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isForecast ? "#f59e0b" : "#6366f1"}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="매출"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500" />실적</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" />예측</span>
          </div>
        </div>

        {/* Pipeline */}
        {pipeline.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">주문 상태별 파이프라인</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline.map((p) => ({ name: STATUS_LABELS[p.status] || p.status, revenue: p.revenue, count: p.count, status: p.status }))} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#999" }} tickFormatter={formatKRW} />
                  <Tooltip formatter={(value) => [`${formatKRW(value as number)}원`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {pipeline.map((p, i) => (
                      <Cell key={i} fill={STATUS_COLORS[p.status] || "#999"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
