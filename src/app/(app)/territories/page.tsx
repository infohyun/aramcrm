"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Plus,
  Loader2,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface Territory {
  id: string;
  name: string;
  region: string;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  color: string;
  customerCount: number;
  customers?: Customer[];
}

interface User {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const REGIONS = [
  "서울",
  "경기",
  "인천",
  "강원",
  "충청",
  "전라",
  "경상",
  "제주",
];

const COLORS = [
  { name: "빨강", value: "red", bg: "bg-red-500" },
  { name: "파랑", value: "blue", bg: "bg-blue-500" },
  { name: "초록", value: "green", bg: "bg-green-500" },
  { name: "보라", value: "purple", bg: "bg-purple-500" },
  { name: "주황", value: "orange", bg: "bg-orange-500" },
  { name: "청록", value: "cyan", bg: "bg-cyan-500" },
  { name: "분홍", value: "pink", bg: "bg-pink-500" },
  { name: "노랑", value: "yellow", bg: "bg-yellow-500" },
];

const COLOR_DOT_MAP: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  cyan: "bg-cyan-500",
  pink: "bg-pink-500",
  yellow: "bg-yellow-500",
};

const COLOR_BADGE_MAP: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  cyan: "bg-cyan-100 text-cyan-700",
  pink: "bg-pink-100 text-pink-700",
  yellow: "bg-yellow-100 text-yellow-700",
};

// ─── Page Component ───────────────────────────────────────────────────

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formColor, setFormColor] = useState("blue");
  const [creating, setCreating] = useState(false);

  // Assign customers modal state
  const [showAssign, setShowAssign] = useState(false);
  const [assignTerritoryId, setAssignTerritoryId] = useState<string | null>(null);
  const [unassignedCustomers, setUnassignedCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Users for manager select
  const [users, setUsers] = useState<User[]>([]);

  // ─── Fetch Territories ──────────────────────────────────────────

  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/territories");
      if (res.ok) {
        const data = await res.json();
        setTerritories(data.territories || []);
        setUnassignedCount(data.unassignedCount || 0);
      }
    } catch (e) {
      console.error("Failed to fetch territories:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  // ─── Fetch Users ────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  };

  // ─── Create Territory ───────────────────────────────────────────

  const handleCreate = async () => {
    if (!formName || !formRegion) return;
    setCreating(true);
    try {
      const res = await fetch("/api/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          region: formRegion,
          description: formDescription || null,
          managerId: formManagerId || null,
          color: formColor,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchTerritories();
      }
    } catch (e) {
      console.error("Failed to create territory:", e);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormRegion("");
    setFormDescription("");
    setFormManagerId("");
    setFormColor("blue");
  };

  // ─── Delete Territory ───────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("이 영업 지역을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/territories/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedId === id) setExpandedId(null);
        fetchTerritories();
      }
    } catch (e) {
      console.error("Failed to delete territory:", e);
    }
  };

  // ─── Toggle Expand ──────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Open Assign Modal ──────────────────────────────────────────

  const openAssignModal = async (territoryId: string) => {
    setAssignTerritoryId(territoryId);
    setSelectedCustomerIds([]);
    setShowAssign(true);

    try {
      const res = await fetch("/api/territories");
      if (res.ok) {
        const data = await res.json();
        // Find unassigned customers from territories data
        // We'll fetch all customers and filter out assigned ones
        const allTerritoryCustIds = new Set<string>();
        (data.territories || []).forEach((t: Territory) => {
          (t.customers || []).forEach((c: Customer) => allTerritoryCustIds.add(c.id));
        });

        const custRes = await fetch("/api/customers?limit=500");
        if (custRes.ok) {
          const custData = await custRes.json();
          const allCustomers: Customer[] = custData.customers || [];
          const unassigned = allCustomers.filter((c) => !allTerritoryCustIds.has(c.id));
          setUnassignedCustomers(unassigned);
        }
      }
    } catch (e) {
      console.error("Failed to load unassigned customers:", e);
    }
  };

  // ─── Assign Customers ──────────────────────────────────────────

  const handleAssignCustomers = async () => {
    if (!assignTerritoryId || selectedCustomerIds.length === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/territories/${assignTerritoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_customers",
          customerIds: selectedCustomerIds,
        }),
      });

      if (res.ok) {
        setShowAssign(false);
        setAssignTerritoryId(null);
        setSelectedCustomerIds([]);
        fetchTerritories();
      }
    } catch (e) {
      console.error("Failed to assign customers:", e);
    } finally {
      setAssigning(false);
    }
  };

  // ─── Toggle Customer Selection ──────────────────────────────────

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lime-100 rounded-lg">
                <MapPin className="w-6 h-6 text-lime-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  영업 지역 관리
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {territories.length}개 지역 · 미배정 고객 {unassignedCount}명
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreate(true);
                fetchUsers();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-lime-600 text-white rounded-xl hover:bg-lime-700 font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              지역 추가
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-lime-600 animate-spin" />
              <p className="text-sm text-gray-400">지역 정보를 불러오는 중...</p>
            </div>
          </div>
        ) : territories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">아직 등록된 영업 지역이 없습니다</p>
            <button
              onClick={() => {
                setShowCreate(true);
                fetchUsers();
              }}
              className="mt-4 px-4 py-2 bg-lime-600 text-white rounded-lg text-sm hover:bg-lime-700 transition-colors"
            >
              첫 영업 지역 추가하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {territories.map((territory) => {
              const isExpanded = expandedId === territory.id;
              const dotColor = COLOR_DOT_MAP[territory.color] || "bg-gray-500";
              const badgeColor =
                COLOR_BADGE_MAP[territory.color] || "bg-gray-100 text-gray-700";

              return (
                <div
                  key={territory.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  {/* Card Header (clickable) */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => toggleExpand(territory.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${dotColor} flex-shrink-0`}
                        />
                        <h3 className="text-base font-semibold text-gray-900">
                          {territory.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}
                        >
                          {territory.region}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {territory.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {territory.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>
                          {territory.managerName || (
                            <span className="text-gray-400">미배정</span>
                          )}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        고객 {territory.customerCount}명
                      </span>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          배정된 고객
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(territory.id);
                            }}
                            className="flex items-center gap-1 text-xs text-lime-700 bg-lime-50 hover:bg-lime-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            고객 배정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(territory.id);
                            }}
                            className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제
                          </button>
                        </div>
                      </div>

                      {territory.customers && territory.customers.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {territory.customers.map((customer) => (
                            <div
                              key={customer.id}
                              className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-sm border border-gray-100"
                            >
                              <span className="font-medium text-gray-800">
                                {customer.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {customer.email || customer.phone || ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">
                          배정된 고객이 없습니다
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Create Modal ───────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  새 영업 지역 추가
                </h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    지역명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    placeholder="예: 서울 강남 지역"
                  />
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    지역 구분 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 bg-white"
                  >
                    <option value="">선택하세요</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    placeholder="지역에 대한 설명을 입력하세요"
                  />
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    담당자
                  </label>
                  <select
                    value={formManagerId}
                    onChange={(e) => setFormManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 bg-white"
                  >
                    <option value="">미배정</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    색상
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setFormColor(c.value)}
                        className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                          formColor === c.value
                            ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                            : "hover:scale-105"
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !formName || !formRegion}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Customers Modal ─────────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowAssign(false);
              setAssignTerritoryId(null);
              setSelectedCustomerIds([]);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  고객 배정
                </h2>
                <button
                  onClick={() => {
                    setShowAssign(false);
                    setAssignTerritoryId(null);
                    setSelectedCustomerIds([]);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                미배정 고객을 이 지역에 배정합니다. ({selectedCustomerIds.length}명
                선택)
              </p>

              <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                {unassignedCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      미배정 고객이 없습니다
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Select All */}
                    <button
                      onClick={() =>
                        setSelectedCustomerIds(
                          selectedCustomerIds.length ===
                            unassignedCustomers.length
                            ? []
                            : unassignedCustomers.map((c) => c.id)
                        )
                      }
                      className="w-full text-left px-4 py-2 text-xs text-lime-700 hover:bg-lime-50 font-medium transition-colors"
                    >
                      {selectedCustomerIds.length ===
                      unassignedCustomers.length
                        ? "전체 해제"
                        : "전체 선택"}
                    </button>

                    {unassignedCustomers.map((customer) => (
                      <label
                        key={customer.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.includes(customer.id)}
                          onChange={() => toggleCustomerSelection(customer.id)}
                          className="rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {customer.name}
                          </p>
                          {(customer.email || customer.phone) && (
                            <p className="text-xs text-gray-400 truncate">
                              {customer.email || customer.phone}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowAssign(false);
                    setAssignTerritoryId(null);
                    setSelectedCustomerIds([]);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAssignCustomers}
                  disabled={assigning || selectedCustomerIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigning && <Loader2 className="w-4 h-4 animate-spin" />}
                  배정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
