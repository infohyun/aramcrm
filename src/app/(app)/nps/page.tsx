"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ThumbsUp,
  Plus,
  Loader2,
  Trash2,
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company: string | null;
}

interface NpsRecord {
  id: string;
  customerId: string | null;
  customer: Customer | null;
  score: number;
  comment: string | null;
  source: string;
  createdAt: string;
}

interface MonthlyTrend {
  month: string;
  nps: number;
  total: number;
}

interface NpsData {
  npsScore: number;
  counts: {
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
  };
  monthlyTrend: MonthlyTrend[];
  recentScores: NpsRecord[];
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

const SOURCE_LABELS: Record<string, string> = {
  survey: "설문",
  email: "이메일",
  manual: "직접입력",
};

export default function NpsPage() {
  const [data, setData] = useState<NpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formScore, setFormScore] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [formSource, setFormSource] = useState("manual");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const fetchNps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nps");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch NPS:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNps();
  }, [fetchNps]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 1) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`
        );
        if (res.ok) {
          const json = await res.json();
          setCustomerResults(json.data || []);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleCreate = async () => {
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formCustomerId || null,
          score: formScore,
          comment: formComment || null,
          source: formSource,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchNps();
      }
    } catch (e) {
      console.error("Failed to create NPS:", e);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 NPS 점수를 삭제하시겠습니까?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/nps/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchNps();
      }
    } catch (e) {
      console.error("Failed to delete NPS:", e);
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setFormScore(5);
    setFormComment("");
    setFormSource("manual");
    setFormCustomerId("");
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return { text: "추천", color: "bg-green-100 text-green-700" };
    if (score >= 7) return { text: "중립", color: "bg-amber-100 text-amber-700" };
    return { text: "비추천", color: "bg-red-100 text-red-700" };
  };

  const getNpsColor = (nps: number) => {
    if (nps > 0) return "text-green-600";
    if (nps < 0) return "text-red-600";
    return "text-gray-500";
  };

  const getNpsIcon = (nps: number) => {
    if (nps > 0) return TrendingUp;
    if (nps < 0) return TrendingDown;
    return Minus;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const counts = data?.counts || { promoters: 0, passives: 0, detractors: 0, total: 0 };
  const npsScore = data?.npsScore || 0;
  const NpsIcon = getNpsIcon(npsScore);

  const pieData = [
    { name: "추천자", value: counts.promoters },
    { name: "중립", value: counts.passives },
    { name: "비추천자", value: counts.detractors },
  ];

  const hasPieData = counts.total > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ThumbsUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  NPS 대시보드
                </h1>
                <p className="text-sm text-gray-500">
                  고객 충성도 및 추천 지수 관리
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              NPS 기록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Big NPS Score + Metric Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Big NPS Score */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-500 mb-2">NPS 점수</p>
                <div className="flex items-center gap-2">
                  <NpsIcon className={`w-8 h-8 ${getNpsColor(npsScore)}`} />
                  <span
                    className={`text-5xl font-bold ${getNpsColor(npsScore)}`}
                  >
                    {npsScore > 0 ? `+${npsScore}` : npsScore}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  범위: -100 ~ +100
                </p>
              </div>

              {/* Promoters */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">추천자 (9-10)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {counts.promoters}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${
                        counts.total > 0
                          ? Math.round((counts.promoters / counts.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {counts.total > 0
                    ? Math.round((counts.promoters / counts.total) * 100)
                    : 0}
                  %
                </p>
              </div>

              {/* Passives */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Minus className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">중립 (7-8)</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {counts.passives}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{
                      width: `${
                        counts.total > 0
                          ? Math.round((counts.passives / counts.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {counts.total > 0
                    ? Math.round((counts.passives / counts.total) * 100)
                    : 0}
                  %
                </p>
              </div>

              {/* Detractors */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">비추천자 (0-6)</p>
                    <p className="text-2xl font-bold text-red-600">
                      {counts.detractors}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{
                      width: `${
                        counts.total > 0
                          ? Math.round(
                              (counts.detractors / counts.total) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {counts.total > 0
                    ? Math.round((counts.detractors / counts.total) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  응답 분포
                </h2>
                {hasPieData ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown) => [
                            `${value as number}명`,
                            "응답 수",
                          ]}
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                    데이터가 없습니다
                  </div>
                )}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-600">추천자</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-600">중립</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-600">비추천자</span>
                  </div>
                </div>
              </div>

              {/* Line Chart - Monthly Trend */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  월별 NPS 추이 (최근 6개월)
                </h2>
                {data?.monthlyTrend && data.monthlyTrend.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.monthlyTrend}
                        margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f0f0f0"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "#999" }}
                        />
                        <YAxis
                          domain={[-100, 100]}
                          tick={{ fontSize: 11, fill: "#999" }}
                        />
                        <Tooltip
                          formatter={(value: unknown) => [
                            `${value as number}`,
                            "NPS",
                          ]}
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="nps"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#10b981" }}
                          activeDot={{ r: 6, fill: "#10b981" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                    데이터가 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* Recent Scores Table */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  최근 NPS 점수
                </h2>
              </div>
              {data?.recentScores && data.recentScores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          고객
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          점수
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          코멘트
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          출처
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          날짜
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.recentScores.map((record) => {
                        const label = getScoreLabel(record.score);
                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                {record.customer?.name || "-"}
                              </span>
                              {record.customer?.company && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({record.customer.company})
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${label.color}`}
                              >
                                {record.score}점 · {label.text}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600 line-clamp-1 max-w-[200px] block">
                                {record.comment || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {SOURCE_LABELS[record.source] || record.source}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {formatDate(record.createdAt)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleDelete(record.id)}
                                disabled={deleting === record.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deleting === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <ThumbsUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    NPS 점수가 없습니다.
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    첫 NPS 기록하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  NPS 점수 기록
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Customer search (optional) */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  고객 <span className="text-xs text-gray-400">(선택)</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <span className="font-medium text-gray-900">
                        {selectedCustomer.name}
                      </span>
                      {selectedCustomer.company && (
                        <span className="text-sm text-gray-500 ml-2">
                          {selectedCustomer.company}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setFormCustomerId("");
                        setCustomerSearch("");
                      }}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="고객명으로 검색..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setFormCustomerId(customer.id);
                              setShowCustomerDropdown(false);
                              setCustomerSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-gray-900 text-sm">
                              {customer.name}
                            </span>
                            {customer.company && (
                              <span className="text-xs text-gray-500 ml-2">
                                {customer.company}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Score Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  점수 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">0 (매우 불만)</span>
                    <span
                      className={`text-3xl font-bold ${
                        getScoreLabel(formScore).color
                          .replace("bg-", "text-")
                          .split(" ")[0]
                          .replace("text-green-100", "text-green-600")
                          .replace("text-amber-100", "text-amber-600")
                          .replace("text-red-100", "text-red-600")
                      }`}
                      style={{
                        color:
                          formScore >= 9
                            ? "#16a34a"
                            : formScore >= 7
                            ? "#d97706"
                            : "#dc2626",
                      }}
                    >
                      {formScore}
                    </span>
                    <span className="text-xs text-gray-400">
                      10 (강력 추천)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formScore}
                    onChange={(e) => setFormScore(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-300 px-0.5">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                  <div className="text-center">
                    <span
                      className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${
                        getScoreLabel(formScore).color
                      }`}
                    >
                      {getScoreLabel(formScore).text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  코멘트
                </label>
                <textarea
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="고객의 피드백을 입력하세요..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  출처 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "survey", label: "설문" },
                      { key: "email", label: "이메일" },
                      { key: "manual", label: "직접입력" },
                    ] as const
                  ).map((src) => (
                    <button
                      key={src.key}
                      onClick={() => setFormSource(src.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formSource === src.key
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={formSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                기록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
