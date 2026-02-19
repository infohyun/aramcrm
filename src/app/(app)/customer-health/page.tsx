"use client";

import { useState, useEffect, useCallback } from "react";
import { HeartPulse, RefreshCw, Loader2, CheckCircle, AlertTriangle, XCircle, Building2, User } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  grade: string;
  healthScore: number;
  status: "healthy" | "warning" | "critical";
}

interface Stats {
  healthy: number;
  warning: number;
  critical: number;
}

const GRADE_COLORS: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700",
  GOLD: "bg-amber-100 text-amber-700",
  SILVER: "bg-gray-100 text-gray-600",
  BRONZE: "bg-orange-100 text-orange-700",
  NORMAL: "bg-blue-50 text-blue-600",
};

const STATUS_CONFIG = {
  critical: {
    label: "위험",
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
  },
  warning: {
    label: "주의",
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  healthy: {
    label: "건강",
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-600",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
  },
};

const getScoreColor = (score: number) => {
  if (score >= 70) return { bar: "bg-green-500", text: "text-green-600" };
  if (score >= 40) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-red-500", text: "text-red-600" };
};

export default function CustomerHealthPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({ healthy: 0, warning: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers/health");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/customers/health", { method: "POST" });
      if (res.ok) {
        await fetchHealth();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  const groupedCustomers = {
    critical: customers.filter((c) => c.status === "critical"),
    warning: customers.filter((c) => c.status === "warning"),
    healthy: customers.filter((c) => c.status === "healthy"),
  };

  const total = stats.healthy + stats.warning + stats.critical;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <HeartPulse className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">고객 건강 점수</h1>
                <p className="text-sm text-gray-500 mt-0.5">고객 이탈 위험도 및 건강 상태 모니터링</p>
              </div>
            </div>
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {recalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              점수 재계산
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-green-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">건강 (70점 이상)</p>
                    <p className="text-3xl font-bold text-green-600">{stats.healthy}</p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.round((stats.healthy / total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{Math.round((stats.healthy / total) * 100)}%</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-amber-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">주의 (40~69점)</p>
                    <p className="text-3xl font-bold text-amber-600">{stats.warning}</p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.round((stats.warning / total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{Math.round((stats.warning / total) * 100)}%</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-red-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">위험 (40점 미만)</p>
                    <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${Math.round((stats.critical / total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{Math.round((stats.critical / total) * 100)}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer List by Status Groups */}
            {customers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border">
                <HeartPulse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">고객 건강 점수 데이터가 없습니다</p>
                <p className="text-sm text-gray-400">점수 재계산 버튼을 눌러 건강 점수를 생성하세요</p>
              </div>
            ) : (
              <>
                {(["critical", "warning", "healthy"] as const).map((status) => {
                  const group = groupedCustomers[status];
                  const config = STATUS_CONFIG[status];
                  const StatusIcon = config.icon;

                  if (group.length === 0) return null;

                  return (
                    <div key={status} className="bg-white rounded-xl border p-6">
                      <h2 className={`text-base font-semibold mb-4 flex items-center gap-2 ${config.text}`}>
                        <StatusIcon className="w-5 h-5" />
                        {config.label} 고객
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}>
                          {group.length}명
                        </span>
                      </h2>
                      <div className="space-y-3">
                        {group
                          .sort((a, b) => a.healthScore - b.healthScore)
                          .map((customer) => {
                            const scoreColor = getScoreColor(customer.healthScore);
                            return (
                              <div
                                key={customer.id}
                                className={`flex items-center gap-4 p-4 rounded-lg border ${config.bg} ${config.border}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                      {customer.name}
                                    </span>
                                    <span
                                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                        GRADE_COLORS[customer.grade] || "bg-gray-100 text-gray-600"
                                      }`}
                                    >
                                      {customer.grade}
                                    </span>
                                  </div>
                                  {customer.company && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                      <Building2 className="w-3.5 h-3.5" />
                                      <span>{customer.company}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Health Score Bar */}
                                <div className="w-48 flex-shrink-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">건강 점수</span>
                                    <span className={`text-sm font-bold ${scoreColor.text}`}>
                                      {customer.healthScore}점
                                    </span>
                                  </div>
                                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${scoreColor.bar}`}
                                      style={{ width: `${Math.min(100, Math.max(0, customer.healthScore))}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
