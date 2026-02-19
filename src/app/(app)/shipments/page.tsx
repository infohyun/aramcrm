"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck, Plus, Search, Loader2, Package, ArrowUpRight,
  ArrowDownLeft, Eye, Edit3, X, Save, RefreshCcw,
} from "lucide-react";

interface Shipment {
  id: string;
  shipmentNumber: string;
  type: string;
  courier: string | null;
  trackingNumber: string | null;
  teamDivision: string | null;
  status: string;
  origin: string | null;
  destination: string | null;
  items: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  memo: string | null;
  createdAt: string;
  customer?: { id: string; name: string; company: string | null } | null;
  user?: { id: string; name: string } | null;
}

const statusLabels: Record<string, string> = {
  preparing: "준비중",
  shipped: "발송됨",
  in_transit: "배송중",
  delivered: "배송완료",
  returned: "반송",
  cancelled: "취소",
};

const statusColors: Record<string, string> = {
  preparing: "bg-gray-100 text-gray-700",
  shipped: "bg-blue-100 text-blue-700",
  in_transit: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/shipments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [searchQuery, filterType, filterStatus]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const handleCreate = async (formData: Record<string, string>) => {
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchShipments();
      }
    } catch {}
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchShipments();
      setSelectedShipment(null);
    } catch {}
  };

  const stats = {
    total: shipments.length,
    preparing: shipments.filter((s) => s.status === "preparing").length,
    inTransit: shipments.filter((s) => ["shipped", "in_transit"].includes(s.status)).length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Truck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">배송/물류 관리</h1>
            <p className="text-xs text-gray-500">출고, 입고, 반품 배송을 관리합니다</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> 배송 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "전체", value: stats.total, icon: Package, color: "bg-gray-50 text-gray-600" },
          { label: "준비중", value: stats.preparing, icon: RefreshCcw, color: "bg-amber-50 text-amber-600" },
          { label: "배송중", value: stats.inTransit, icon: Truck, color: "bg-blue-50 text-blue-600" },
          { label: "완료", value: stats.delivered, icon: Package, color: "bg-green-50 text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={14} />
              </div>
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="배송번호, 택배사 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none"
        >
          <option value="all">전체 유형</option>
          <option value="outbound">출고</option>
          <option value="inbound">입고</option>
          <option value="return">반품</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none"
        >
          <option value="all">전체 상태</option>
          <option value="preparing">준비중</option>
          <option value="shipped">발송됨</option>
          <option value="in_transit">배송중</option>
          <option value="delivered">배송완료</option>
          <option value="returned">반송</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">배송번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">유형</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">고객</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">택배사 / 추적번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">담당</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">등록일</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                      <Truck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      배송 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.shipmentNumber}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs">
                          {s.type === "outbound" ? (
                            <><ArrowUpRight size={12} className="text-blue-500" /> 출고</>
                          ) : s.type === "inbound" ? (
                            <><ArrowDownLeft size={12} className="text-green-500" /> 입고</>
                          ) : (
                            <><ArrowDownLeft size={12} className="text-red-500" /> 반품</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {s.customer ? `${s.customer.name}${s.customer.company ? ` (${s.customer.company})` : ""}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {s.courier || "-"} {s.trackingNumber && <span className="text-xs text-gray-400">/ {s.trackingNumber}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[s.status] || "bg-gray-100"}`}>
                          {statusLabels[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.teamDivision || s.user?.name || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedShipment(s)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateShipmentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Detail Modal */}
      {selectedShipment && (
        <ShipmentDetailModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

function CreateShipmentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Record<string, string>) => void;
}) {
  const [form, setForm] = useState({
    type: "outbound",
    courier: "",
    trackingNumber: "",
    teamDivision: "",
    destination: "",
    items: "",
    memo: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">배송 등록</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">유형</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full mt-1 h-9 px-3 text-sm border border-gray-200 rounded-lg">
              <option value="outbound">출고</option>
              <option value="inbound">입고</option>
              <option value="return">반품</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">택배사</label>
            <input value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })}
              className="w-full mt-1 h-9 px-3 text-sm border border-gray-200 rounded-lg" placeholder="CJ대한통운, 한진택배..." />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">송장번호</label>
            <input value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
              className="w-full mt-1 h-9 px-3 text-sm border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">배송지</label>
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="w-full mt-1 h-9 px-3 text-sm border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">품목</label>
            <input value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })}
              className="w-full mt-1 h-9 px-3 text-sm border border-gray-200 rounded-lg" placeholder="아쿠아 세럼 50개, 립스틱 30개..." />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">메모</label>
            <textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="w-full mt-1 h-20 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-9 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={() => onCreate(form)} className="flex-1 h-9 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1.5">
            <Save size={14} /> 등록
          </button>
        </div>
      </div>
    </div>
  );
}

function ShipmentDetailModal({
  shipment,
  onClose,
  onStatusUpdate,
}: {
  shipment: Shipment;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}) {
  const nextStatus: Record<string, string> = {
    preparing: "shipped",
    shipped: "in_transit",
    in_transit: "delivered",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{shipment.shipmentNumber}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">상태</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[shipment.status]}`}>
              {statusLabels[shipment.status]}
            </span>
          </div>
          <div className="flex justify-between"><span className="text-gray-500">유형</span><span>{shipment.type === "outbound" ? "출고" : shipment.type === "inbound" ? "입고" : "반품"}</span></div>
          {shipment.customer && <div className="flex justify-between"><span className="text-gray-500">고객</span><span>{shipment.customer.name}</span></div>}
          {shipment.courier && <div className="flex justify-between"><span className="text-gray-500">택배사</span><span>{shipment.courier}</span></div>}
          {shipment.trackingNumber && <div className="flex justify-between"><span className="text-gray-500">송장번호</span><span className="font-mono">{shipment.trackingNumber}</span></div>}
          {shipment.destination && <div className="flex justify-between"><span className="text-gray-500">배송지</span><span>{shipment.destination}</span></div>}
          {shipment.items && <div className="flex justify-between"><span className="text-gray-500">품목</span><span className="text-right max-w-[60%]">{shipment.items}</span></div>}
          {shipment.memo && <div><span className="text-gray-500">메모</span><p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">{shipment.memo}</p></div>}
        </div>
        {nextStatus[shipment.status] && (
          <button
            onClick={() => onStatusUpdate(shipment.id, nextStatus[shipment.status])}
            className="w-full mt-5 h-9 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {statusLabels[nextStatus[shipment.status]]}(으)로 상태 변경
          </button>
        )}
      </div>
    </div>
  );
}
