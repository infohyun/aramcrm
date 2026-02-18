"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Download,
  Loader2,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Target,
  Wrench,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  UserPlus,
  Star,
  Package,
  TrendingDown,
  XCircle,
  FolderKanban,
  ListTodo,
  Activity,
} from "lucide-react";
import ReportFilter from "./_components/ReportFilter";
import StatsSummary from "./_components/StatsSummary";
import ChartCard from "./_components/ChartCard";

// ─── Types ──────────────────────────────────────────────────

interface ChartItem {
  label: string;
  value: number;
  color: string;
}

interface ReportData {
  type: string;
  period: string;
  summary: Record<string, number>;
  chartData: ChartItem[];
  byStatus?: Record<string, number>;
  byGrade?: Record<string, number>;
  byCategory?: ChartItem[];
  movements?: Record<string, number>;
  taskStatus?: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("ko-KR").format(v) + "원";

// ─── Component ──────────────────────────────────────────────

export default function ReportsPage() {
  const [activeType, setActiveType] = useState("sales");
  const [activePeriod, setActivePeriod] = useState("month");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ─── Fetch report data ──────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?type=${activeType}&period=${activePeriod}`
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeType, activePeriod]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ─── CSV Export ──────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/export?type=${activeType}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeType}_report.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  // ─── Stats cards by type ──────────────────────────────────────
  const getStatsCards = () => {
    if (!reportData?.summary) return [];

    const s = reportData.summary;

    switch (activeType) {
      case "sales":
        return [
          {
            label: "총 매출",
            value: formatCurrency(s.totalRevenue || 0),
            icon: DollarSign,
            color: "bg-green-100",
            textColor: "text-green-600",
          },
          {
            label: "기간 매출",
            value: formatCurrency(s.periodRevenue || 0),
            icon: TrendingUp,
            color: "bg-indigo-100",
            textColor: "text-indigo-600",
          },
          {
            label: "기간 주문수",
            value: s.periodOrders || 0,
            icon: ShoppingCart,
            color: "bg-blue-100",
            textColor: "text-blue-600",
            suffix: "건",
          },
          {
            label: "평균 주문가",
            value: formatCurrency(s.averageOrderValue || 0),
            icon: Target,
            color: "bg-orange-100",
            textColor: "text-orange-600",
          },
        ];
      case "service":
        return [
          {
            label: "전체 AS",
            value: s.total || 0,
            icon: Wrench,
            color: "bg-indigo-100",
            textColor: "text-indigo-600",
            suffix: "건",
          },
          {
            label: "진행 중",
            value: s.active || 0,
            icon: AlertCircle,
            color: "bg-orange-100",
            textColor: "text-orange-600",
            suffix: "건",
          },
          {
            label: "기간 신규",
            value: s.periodNew || 0,
            icon: Clock,
            color: "bg-blue-100",
            textColor: "text-blue-600",
            suffix: "건",
          },
          {
            label: "평균 처리일",
            value: s.avgCompletionDays || 0,
            icon: CheckCircle2,
            color: "bg-green-100",
            textColor: "text-green-600",
            suffix: "일",
          },
        ];
      case "customer":
        return [
          {
            label: "전체 고객",
            value: s.total || 0,
            icon: Users,
            color: "bg-indigo-100",
            textColor: "text-indigo-600",
            suffix: "명",
          },
          {
            label: "활성 고객",
            value: s.active || 0,
            icon: CheckCircle2,
            color: "bg-green-100",
            textColor: "text-green-600",
            suffix: "명",
          },
          {
            label: "기간 신규",
            value: s.periodNew || 0,
            icon: UserPlus,
            color: "bg-blue-100",
            textColor: "text-blue-600",
            suffix: "명",
          },
          {
            label: "VIP 비율",
            value: s.vipRate || 0,
            icon: Star,
            color: "bg-orange-100",
            textColor: "text-orange-600",
            suffix: "%",
          },
        ];
      case "inventory":
        return [
          {
            label: "전체 품목",
            value: s.totalItems || 0,
            icon: Package,
            color: "bg-indigo-100",
            textColor: "text-indigo-600",
          },
          {
            label: "재고 부족",
            value: s.lowStock || 0,
            icon: TrendingDown,
            color: "bg-orange-100",
            textColor: "text-orange-600",
          },
          {
            label: "품절",
            value: s.outOfStock || 0,
            icon: XCircle,
            color: "bg-red-100",
            textColor: "text-red-600",
          },
          {
            label: "총 재고가치",
            value: formatCurrency(s.totalValue || 0),
            icon: DollarSign,
            color: "bg-green-100",
            textColor: "text-green-600",
          },
        ];
      case "project":
        return [
          {
            label: "전체 프로젝트",
            value: s.total || 0,
            icon: FolderKanban,
            color: "bg-indigo-100",
            textColor: "text-indigo-600",
          },
          {
            label: "진행 중",
            value: s.active || 0,
            icon: Activity,
            color: "bg-green-100",
            textColor: "text-green-600",
          },
          {
            label: "태스크 완료율",
            value: s.completionRate || 0,
            icon: CheckCircle2,
            color: "bg-blue-100",
            textColor: "text-blue-600",
            suffix: "%",
          },
          {
            label: "전체 태스크",
            value: s.totalTasks || 0,
            icon: ListTodo,
            color: "bg-orange-100",
            textColor: "text-orange-600",
            suffix: "개",
          },
        ];
      default:
        return [];
    }
  };

  // ─── Chart titles by type ──────────────────────────────────────
  const getChartConfig = () => {
    switch (activeType) {
      case "sales":
        return {
          mainTitle: "주문 상태별 현황",
          mainDesc: "파이프라인 단계별 주문 수",
        };
      case "service":
        return {
          mainTitle: "AS 상태별 현황",
          mainDesc: "처리 단계별 AS 건수",
        };
      case "customer":
        return {
          mainTitle: "고객 등급별 현황",
          mainDesc: "등급별 고객 분포",
        };
      case "inventory":
        return {
          mainTitle: "재고 상태별 현황",
          mainDesc: "재고 상태 분포",
        };
      case "project":
        return {
          mainTitle: "프로젝트 상태별 현황",
          mainDesc: "상태별 프로젝트 수",
        };
      default:
        return { mainTitle: "현황", mainDesc: "" };
    }
  };

  // ─── Additional chart data ──────────────────────────────────
  const getAdditionalCharts = (): {
    title: string;
    description: string;
    data: ChartItem[];
  }[] => {
    if (!reportData) return [];

    switch (activeType) {
      case "service":
        if (reportData.byCategory && reportData.byCategory.length > 0) {
          const colors = ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];
          return [
            {
              title: "카테고리별 AS 현황",
              description: "AS 유형별 건수",
              data: reportData.byCategory.map((c, i) => ({
                ...c,
                color: colors[i % colors.length],
              })),
            },
          ];
        }
        return [];
      case "customer":
        if (reportData.byStatus) {
          return [
            {
              title: "고객 상태별 현황",
              description: "활성/비활성/휴면 고객 분포",
              data: [
                { label: "활성", value: reportData.byStatus.active || 0, color: "#10b981" },
                { label: "비활성", value: reportData.byStatus.inactive || 0, color: "#f59e0b" },
                { label: "휴면", value: reportData.byStatus.dormant || 0, color: "#ef4444" },
              ],
            },
          ];
        }
        return [];
      case "inventory":
        if (reportData.movements) {
          return [
            {
              title: "기간 입출고 현황",
              description: "기간 내 재고 이동 요약",
              data: [
                { label: "입고", value: reportData.movements.inbound || 0, color: "#10b981" },
                { label: "출고", value: reportData.movements.outbound || 0, color: "#6366f1" },
              ],
            },
          ];
        }
        return [];
      case "project":
        if (reportData.taskStatus) {
          return [
            {
              title: "태스크 상태별 현황",
              description: "태스크 진행 단계별 분포",
              data: [
                { label: "할 일", value: reportData.taskStatus.todo || 0, color: "#6366f1" },
                { label: "진행중", value: reportData.taskStatus.in_progress || 0, color: "#f59e0b" },
                { label: "검토", value: reportData.taskStatus.review || 0, color: "#8b5cf6" },
                { label: "완료", value: reportData.taskStatus.done || 0, color: "#10b981" },
              ],
            },
          ];
        }
        return [];
      default:
        return [];
    }
  };

  const chartConfig = getChartConfig();
  const additionalCharts = getAdditionalCharts();

  // ─── Period label ──────────────────────────────────────
  const periodLabels: Record<string, string> = {
    week: "주간",
    month: "월간",
    quarter: "분기",
    year: "연간",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  리포트/분석
                </h1>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              CSV 내보내기
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <ReportFilter
          activeType={activeType}
          activePeriod={activePeriod}
          onTypeChange={setActiveType}
          onPeriodChange={setActivePeriod}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : reportData ? (
          <>
            {/* Period indicator */}
            <div className="text-sm text-gray-500">
              기간: <span className="font-medium text-gray-700">{periodLabels[activePeriod] || activePeriod}</span>
              {reportData.period && (
                <span className="text-gray-400 ml-2">
                  ({new Date(reportData.period).toLocaleDateString("ko-KR")} ~)
                </span>
              )}
            </div>

            {/* Stats Summary */}
            <StatsSummary stats={getStatsCards()} />

            {/* Charts */}
            <div className={`grid gap-6 ${additionalCharts.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
              <ChartCard
                title={chartConfig.mainTitle}
                description={chartConfig.mainDesc}
                data={reportData.chartData || []}
              />
              {additionalCharts.map((chart, i) => (
                <ChartCard
                  key={i}
                  title={chart.title}
                  description={chart.description}
                  data={chart.data}
                />
              ))}
            </div>

            {/* Detailed Status Breakdown Table */}
            {reportData.byStatus && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  상세 현황
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                          상태
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                          건수
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                          비율
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(reportData.byStatus).map(([key, value]) => {
                        const total = Object.values(reportData.byStatus || {}).reduce(
                          (sum, v) => sum + (v as number),
                          0
                        );
                        const ratio = total > 0 ? Math.round(((value as number) / total) * 100) : 0;
                        return (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {getStatusLabel(activeType, key)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                              {(value as number).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                              {ratio}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">데이터를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Label Helper ──────────────────────────────────────

function getStatusLabel(type: string, key: string): string {
  const labels: Record<string, Record<string, string>> = {
    sales: {
      pending: "상담",
      quoted: "제안",
      negotiating: "협상",
      confirmed: "계약",
      delivered: "완료",
      cancelled: "취소",
    },
    service: {
      received: "접수",
      inspecting: "검사",
      repairing: "수리",
      completed: "완료",
      returned: "반환",
    },
    customer: {
      active: "활성",
      inactive: "비활성",
      dormant: "휴면",
      vip: "VIP",
      gold: "Gold",
      normal: "일반",
      new: "신규",
    },
    inventory: {
      in_stock: "정상",
      low_stock: "부족",
      out_of_stock: "품절",
    },
    project: {
      planning: "기획",
      active: "진행",
      on_hold: "보류",
      completed: "완료",
      cancelled: "취소",
    },
  };

  return labels[type]?.[key] || key;
}
