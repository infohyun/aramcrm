"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Loader2,
  DollarSign,
  ShoppingCart,
  Target,
  BarChart3,
} from "lucide-react";
import PipelineBoard from "./_components/PipelineBoard";

// ─── Types ──────────────────────────────────────────────────

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

interface PipelineStage {
  key: string;
  label: string;
  color: string;
  count: number;
  totalValue: number;
  orders: Deal[];
}

interface PipelineSummary {
  totalOrders: number;
  totalRevenue: number;
  activeRevenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

function formatCompactCurrency(value: number): string {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(1) + "억원";
  }
  if (value >= 10000) {
    return Math.round(value / 10000).toLocaleString() + "만원";
  }
  return formatCurrency(value);
}

// ─── Component ──────────────────────────────────────────────

export default function SalesPipelinePage() {
  const router = useRouter();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [summary, setSummary] = useState<PipelineSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    activeRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  // ─── Fetch pipeline ──────────────────────────────────────
  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/pipeline");
      if (res.ok) {
        const data = await res.json();
        setStages(data.pipeline || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // ─── Handle deal click ──────────────────────────────────────
  const handleDealClick = (deal: Deal) => {
    if (deal.customer?.id) {
      router.push(`/customers/${deal.customer.id}`);
    }
  };

  // ─── Active deals (excluding cancelled and delivered) ──────
  const activeDeals = stages
    .filter((s) => !["cancelled", "delivered"].includes(s.key))
    .reduce((sum, s) => sum + s.count, 0);

  const avgDealSize =
    summary.totalOrders > 0
      ? Math.round(summary.totalRevenue / summary.totalOrders)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  영업 파이프라인
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">전체 주문</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary.totalOrders}
                  <span className="text-sm font-normal text-gray-400 ml-0.5">건</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">총 매출</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCompactCurrency(summary.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 rounded-xl">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">진행 중 금액</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCompactCurrency(summary.activeRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">평균 거래액</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCompactCurrency(avgDealSize)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Summary Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">파이프라인 요약</h3>
            <span className="text-xs text-gray-400">
              진행 중: {activeDeals}건
            </span>
          </div>
          <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
            {stages.map((stage) => {
              const width =
                summary.totalOrders > 0
                  ? (stage.count / summary.totalOrders) * 100
                  : 0;
              if (width === 0) return null;
              return (
                <div
                  key={stage.key}
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(width, 2)}%`,
                    backgroundColor: stage.color,
                  }}
                  title={`${stage.label}: ${stage.count}건`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {stages.map((stage) => (
              <div key={stage.key} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-xs text-gray-600">
                  {stage.label}{" "}
                  <span className="font-bold text-gray-800">{stage.count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Board */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              파이프라인 데이터가 없습니다.
            </p>
            <p className="text-gray-400 text-xs mt-1">
              주문을 등록하면 파이프라인에 표시됩니다.
            </p>
          </div>
        ) : (
          <PipelineBoard stages={stages} onDealClick={handleDealClick} />
        )}
      </div>
    </div>
  );
}
