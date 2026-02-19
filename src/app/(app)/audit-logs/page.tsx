"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  entityName: string | null;
  changes: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "생성", color: "bg-green-100 text-green-700" },
  update: { label: "수정", color: "bg-blue-100 text-blue-700" },
  delete: { label: "삭제", color: "bg-red-100 text-red-700" },
  bulk_update: { label: "일괄수정", color: "bg-amber-100 text-amber-700" },
  bulk_delete: { label: "일괄삭제", color: "bg-red-100 text-red-700" },
  login: { label: "로그인", color: "bg-gray-100 text-gray-700" },
  export: { label: "내보내기", color: "bg-purple-100 text-purple-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  customer: "고객",
  order: "주문",
  service: "AS",
  project: "프로젝트",
  inventory: "재고",
  approval: "결재",
  post: "게시글",
  document: "문서",
  wiki: "위키",
  campaign: "캠페인",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "30");
      if (search) params.set("search", search);
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, entityFilter, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const renderChanges = (changes: string | null) => {
    if (!changes) return null;
    try {
      const parsed = JSON.parse(changes);
      return (
        <div className="mt-1 text-[11px] text-gray-400">
          {Object.entries(parsed).map(([key, val]) => {
            const v = val as { old: unknown; new: unknown };
            return (
              <span key={key} className="mr-3">
                {key}: <span className="line-through text-red-400">{String(v.old)}</span> → <span className="text-green-600">{String(v.new)}</span>
              </span>
            );
          })}
        </div>
      );
    } catch { return null; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Shield className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">감사 로그</h1>
                <p className="text-sm text-gray-500 mt-0.5">총 {total}건의 활동 기록</p>
              </div>
            </div>
            <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="사용자, 대상 검색..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="">전체 대상</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="">전체 작업</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>기록된 활동이 없습니다</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">시간</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">사용자</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">작업</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">대상</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => {
                      const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-600" };
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{log.userName || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {ENTITY_LABELS[log.entity] || log.entity}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-700">{log.entityName || log.entityId || "-"}</div>
                            {renderChanges(log.changes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">총 {total}건</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border hover:bg-white disabled:opacity-50">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm text-gray-700">{page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border hover:bg-white disabled:opacity-50">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
