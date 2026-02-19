"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  CheckSquare,
  Trash2,
  Tag,
  UserPlus,
  Loader2,
  Layers,
  Save,
  X,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
  position: string | null;
  grade: string;
  status: string;
  createdAt: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count: {
    communications: number;
  };
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

const GRADE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "vip", label: "VIP" },
  { value: "gold", label: "Gold" },
  { value: "normal", label: "일반" },
  { value: "new", label: "신규" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
  { value: "dormant", label: "휴면" },
];

const GRADE_BADGE_STYLES: Record<string, string> = {
  vip: "bg-red-100 text-red-700 border-red-200",
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  normal: "bg-blue-100 text-blue-700 border-blue-200",
  new: "bg-green-100 text-green-700 border-green-200",
};

const GRADE_LABELS: Record<string, string> = {
  vip: "VIP",
  gold: "Gold",
  normal: "일반",
  new: "신규",
};

const STATUS_LABELS: Record<string, string> = {
  active: "활성",
  inactive: "비활성",
  dormant: "휴면",
};

interface Segment {
  id: string;
  name: string;
  description: string | null;
  conditions: string;
  customerCount: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Segmentation
  const [showSegments, setShowSegments] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segName, setSegName] = useState("");
  const [segConditions, setSegConditions] = useState<{ field: string; operator: string; value: string }[]>([
    { field: "grade", operator: "equals", value: "vip" },
  ]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (gradeFilter) params.set("grade", gradeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch customers");

      const data: CustomersResponse = await res.json();
      setCustomers(data.customers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("고객 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, gradeFilter, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // 검색 디바운스
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleGradeFilter = (grade: string) => {
    setGradeFilter(grade);
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) setSelectedIds([]);
    else setSelectedIds(customers.map((c) => c.id));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      let actionData: { action: string; ids: string[]; data: Record<string, string> } | null = null;

      if (bulkAction === "delete") {
        if (!confirm(`${selectedIds.length}명의 고객을 삭제하시겠습니까?`)) { setBulkLoading(false); return; }
        actionData = { action: "delete", ids: selectedIds, data: {} };
      } else if (bulkAction.startsWith("grade_")) {
        actionData = { action: "update_grade", ids: selectedIds, data: { grade: bulkAction.replace("grade_", "") } };
      } else if (bulkAction.startsWith("status_")) {
        actionData = { action: "update_status", ids: selectedIds, data: { status: bulkAction.replace("status_", "") } };
      }

      if (actionData) {
        const res = await fetch("/api/customers/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actionData),
        });
        if (res.ok) {
          const result = await res.json();
          alert(`${result.affected}건이 처리되었습니다.`);
          setSelectedIds([]);
          setBulkAction("");
          fetchCustomers();
        }
      }
    } catch (e) { console.error(e); }
    finally { setBulkLoading(false); }
  };

  // Segmentation
  const loadSegments = async () => {
    const res = await fetch("/api/customers/segments");
    if (res.ok) {
      const data = await res.json();
      setSegments(data.segments);
    }
  };

  const handleCreateSegment = async () => {
    if (!segName) return;
    const res = await fetch("/api/customers/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: segName, conditions: segConditions }),
    });
    if (res.ok) {
      setSegName("");
      setSegConditions([{ field: "grade", operator: "equals", value: "vip" }]);
      loadSegments();
    }
  };

  const handleDeleteSegment = async (id: string) => {
    await fetch(`/api/customers/segments/${id}`, { method: "DELETE" });
    loadSegments();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">고객 관리</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  총 {total}명의 고객
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowSegments(!showSegments); if (!showSegments) loadSegments(); }}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-sm"
              >
                <Layers className="w-4 h-4" />
                세분화
              </button>
              <button
                onClick={() => router.push("/customers/new")}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                고객 등록
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 검색 및 필터 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
          {/* 검색바 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="이름, 이메일, 전화번호, 회사명으로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow"
            />
          </div>

          {/* 등급 필터 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mr-1">
              <Filter className="w-4 h-4" />
              등급
            </div>
            {GRADE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleGradeFilter(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  gradeFilter === option.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 상태 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mr-1">
              <Filter className="w-4 h-4" />
              상태
            </div>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === option.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Segmentation Panel */}
        {showSegments && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                고객 세분화
              </h3>
              <button onClick={() => setShowSegments(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {/* Existing segments */}
            {segments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {segments.map((seg) => (
                  <div key={seg.id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                    <span className="text-sm text-indigo-700 font-medium">{seg.name}</span>
                    <span className="text-xs text-indigo-400">{seg.customerCount}명</span>
                    <button onClick={() => handleDeleteSegment(seg.id)} className="text-indigo-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {/* Create segment */}
            <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-gray-500 mb-1">세그먼트 이름</label>
                <input value={segName} onChange={(e) => setSegName(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm outline-none" placeholder="예: VIP 고객" />
              </div>
              {segConditions.map((c, i) => (
                <div key={i} className="flex gap-1 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">필드</label>
                    <select value={c.field} onChange={(e) => { const nc = [...segConditions]; nc[i].field = e.target.value; setSegConditions(nc); }} className="px-2 py-1.5 border rounded text-sm">
                      <option value="grade">등급</option>
                      <option value="status">상태</option>
                      <option value="company">회사</option>
                      <option value="source">유입경로</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">조건</label>
                    <select value={c.operator} onChange={(e) => { const nc = [...segConditions]; nc[i].operator = e.target.value; setSegConditions(nc); }} className="px-2 py-1.5 border rounded text-sm">
                      <option value="equals">같음</option>
                      <option value="not_equals">같지 않음</option>
                      <option value="contains">포함</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">값</label>
                    <input value={c.value} onChange={(e) => { const nc = [...segConditions]; nc[i].value = e.target.value; setSegConditions(nc); }} className="px-2 py-1.5 border rounded text-sm w-24" />
                  </div>
                </div>
              ))}
              <button onClick={handleCreateSegment} disabled={!segName} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50">
                <Save className="w-3.5 h-3.5" />저장
              </button>
            </div>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-700">
              <CheckSquare className="w-4 h-4 inline mr-1" />
              {selectedIds.length}명 선택됨
            </span>
            <div className="flex items-center gap-2">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white outline-none">
                <option value="">작업 선택...</option>
                <optgroup label="등급 변경">
                  <option value="grade_vip">VIP로 변경</option>
                  <option value="grade_gold">Gold로 변경</option>
                  <option value="grade_normal">일반으로 변경</option>
                </optgroup>
                <optgroup label="상태 변경">
                  <option value="status_active">활성으로 변경</option>
                  <option value="status_inactive">비활성으로 변경</option>
                  <option value="status_dormant">휴면으로 변경</option>
                </optgroup>
                <option value="delete">삭제</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || bulkLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                실행
              </button>
              <button onClick={() => { setSelectedIds([]); setBulkAction(""); }} className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-white">
                취소
              </button>
            </div>
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">로딩 중...</p>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                고객이 없습니다
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {search || gradeFilter || statusFilter
                  ? "검색 조건에 맞는 고객이 없습니다. 필터를 변경해 보세요."
                  : "첫 번째 고객을 등록해 보세요."}
              </p>
              {!search && !gradeFilter && !statusFilter && (
                <button
                  onClick={() => router.push("/customers/new")}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  고객 등록하기
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-gray-200">
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === customers.length && customers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        회사
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        직책
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        전화번호
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        이메일
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        등급
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        담당자
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        등록일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(customer.id)}
                            onChange={() => toggleSelect(customer.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3.5" onClick={() => router.push(`/customers/${customer.id}`)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                              {customer.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 text-sm">
                                {customer.name}
                              </span>
                              <div className="text-xs text-gray-400">
                                {STATUS_LABELS[customer.status] || customer.status}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {customer.company || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {customer.position || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {customer.phone || customer.mobile || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {customer.email || "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              GRADE_BADGE_STYLES[customer.grade] ||
                              GRADE_BADGE_STYLES.normal
                            }`}
                          >
                            {GRADE_LABELS[customer.grade] || customer.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {customer.assignedTo?.name || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {formatDate(customer.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/60">
                  <p className="text-sm text-gray-500">
                    전체 {total}건 중 {(page - 1) * 20 + 1}-
                    {Math.min(page * 20, total)}건
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 2 && p <= page + 2)
                      )
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        typeof item === "string" ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-gray-400"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPage(item)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                              page === item
                                ? "bg-indigo-600 text-white"
                                : "border border-gray-300 hover:bg-white text-gray-700"
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
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
