"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Swords, Plus, Search, Trash2, Loader2,
  ExternalLink, Trophy, XCircle, Clock,
  ChevronDown, ChevronUp, TrendingUp,
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  website: string;
  description: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  wonCount: number;
  lostCount: number;
  pendingCount: number;
}

interface CompetitorDeal {
  id: string;
  dealName: string;
  customerId: string;
  customerName?: string;
  result: string;
  value: number;
  notes: string;
  createdAt: string;
}

interface CompetitorDetail extends Competitor {
  deals: CompetitorDeal[];
}

const RESULT_STYLES: Record<string, { label: string; color: string }> = {
  won: { label: "승리", color: "bg-green-100 text-green-700" },
  lost: { label: "패배", color: "bg-red-100 text-red-700" },
  pending: { label: "진행중", color: "bg-gray-100 text-gray-600" },
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<CompetitorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    strengths: "",
    weaknesses: "",
    notes: "",
  });

  // Deal form
  const [dealForm, setDealForm] = useState({
    dealName: "",
    result: "pending",
    value: "",
    notes: "",
  });

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/competitors?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ name: "", website: "", description: "", strengths: "", weaknesses: "", notes: "" });
        fetchCompetitors();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 경쟁사를 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      if (expandedId === id) {
        setExpandedId(null);
        setDetailData(null);
      }
      fetchCompetitors();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/competitors/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddDeal = async () => {
    if (!expandedId || !dealForm.dealName) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/competitors/${expandedId}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dealForm,
          value: dealForm.value ? Number(dealForm.value) : 0,
        }),
      });
      if (res.ok) {
        setShowAddDeal(false);
        setDealForm({ dealName: "", result: "pending", value: "", notes: "" });
        // Refresh detail
        const detailRes = await fetch(`/api/competitors/${expandedId}`);
        if (detailRes.ok) setDetailData(await detailRes.json());
        fetchCompetitors();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const getWinRate = (c: Competitor) => {
    const total = c.wonCount + c.lostCount;
    if (total === 0) return 0;
    return Math.round((c.wonCount / total) * 100);
  };

  const formatKRW = (n: number) => n.toLocaleString("ko-KR");
  const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Swords className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">경쟁사 추적</h1>
                <p className="text-sm text-gray-500 mt-0.5">경쟁사 분석 및 딜 승패 추적</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              경쟁사 등록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="경쟁사 이름 검색..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white"
          />
        </div>

        {/* Competitors List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Swords className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">등록된 경쟁사가 없습니다</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm"
            >
              첫 경쟁사 등록하기
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {competitors.map((c) => {
              const winRate = getWinRate(c);
              const isExpanded = expandedId === c.id;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  {/* Card Header */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => handleExpand(c.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-semibold text-gray-900">{c.name}</h3>
                          {c.website && (
                            <a
                              href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                            >
                              <ExternalLink className="w-3 h-3" />
                              웹사이트
                            </a>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-sm text-gray-500 mb-2">{c.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-green-600">
                            <Trophy className="w-3.5 h-3.5" />
                            승리 {c.wonCount}건
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="w-3.5 h-3.5" />
                            패배 {c.lostCount}건
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            진행중 {c.pendingCount}건
                          </span>
                          <span className="flex items-center gap-1 text-gray-700 font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            승률 {winRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Win rate bar */}
                    {(c.wonCount + c.lostCount) > 0 && (
                      <div className="mt-3">
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                      {detailLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : detailData ? (
                        <div className="space-y-5">
                          {/* Strengths & Weaknesses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {detailData.strengths && (
                              <div className="bg-white rounded-lg border p-4">
                                <h4 className="text-sm font-semibold text-green-700 mb-2">강점</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{detailData.strengths}</p>
                              </div>
                            )}
                            {detailData.weaknesses && (
                              <div className="bg-white rounded-lg border p-4">
                                <h4 className="text-sm font-semibold text-red-700 mb-2">약점</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{detailData.weaknesses}</p>
                              </div>
                            )}
                          </div>

                          {/* Deals Table */}
                          <div className="bg-white rounded-lg border">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                              <h4 className="text-sm font-semibold text-gray-900">경쟁 딜 목록</h4>
                              <button
                                onClick={() => setShowAddDeal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                딜 추가
                              </button>
                            </div>
                            {detailData.deals && detailData.deals.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                                      <th className="text-left px-4 py-2.5 font-medium">딜 이름</th>
                                      <th className="text-left px-4 py-2.5 font-medium">고객</th>
                                      <th className="text-left px-4 py-2.5 font-medium">결과</th>
                                      <th className="text-right px-4 py-2.5 font-medium">금액 (KRW)</th>
                                      <th className="text-left px-4 py-2.5 font-medium">비고</th>
                                      <th className="text-left px-4 py-2.5 font-medium">일자</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailData.deals.map((deal) => {
                                      const rs = RESULT_STYLES[deal.result] || RESULT_STYLES.pending;
                                      return (
                                        <tr key={deal.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                          <td className="px-4 py-2.5 font-medium text-gray-900">{deal.dealName}</td>
                                          <td className="px-4 py-2.5 text-gray-500">{deal.customerName || "-"}</td>
                                          <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rs.color}`}>
                                              {rs.label}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-gray-700">
                                            {deal.value > 0 ? `${formatKRW(deal.value)}` : "-"}
                                          </td>
                                          <td className="px-4 py-2.5 text-gray-500">{deal.notes || "-"}</td>
                                          <td className="px-4 py-2.5 text-gray-400">{formatDate(deal.createdAt)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-400">등록된 딜이 없습니다</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Competitor Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">경쟁사 등록</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경쟁사 이름 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="예: ABC Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">웹사이트</label>
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="경쟁사에 대한 간략한 설명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">강점</label>
                <textarea
                  value={form.strengths}
                  onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="경쟁사의 강점을 기술하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">약점</label>
                <textarea
                  value={form.weaknesses}
                  onChange={(e) => setForm({ ...form, weaknesses: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="경쟁사의 약점을 기술하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="추가 메모"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddDeal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">딜 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">딜 이름 *</label>
                <input
                  value={dealForm.dealName}
                  onChange={(e) => setDealForm({ ...dealForm, dealName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="딜 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">결과</label>
                <select
                  value={dealForm.result}
                  onChange={(e) => setDealForm({ ...dealForm, result: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="pending">진행중</option>
                  <option value="won">승리</option>
                  <option value="lost">패배</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">금액 (KRW)</label>
                <input
                  type="number"
                  value={dealForm.value}
                  onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea
                  value={dealForm.notes}
                  onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="추가 메모"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddDeal(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddDeal}
                disabled={saving || !dealForm.dealName}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
