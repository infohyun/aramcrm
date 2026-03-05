"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Factory, Plus, Search, ChevronLeft, ChevronRight, X,
  CheckCircle2, Circle, Clock, AlertTriangle, Play, Pause
} from "lucide-react";

interface Brand { id: string; code: string; name: string; }

interface ProductionStage {
  id: string; name: string; status: string; sortOrder: number;
  startedAt: string | null; completedAt: string | null; notes: string | null;
}

interface ProductionOrder {
  id: string; brandId: string; orderNumber: string; quantity: number;
  completedQty: number; defectQty: number; status: string; priority: string;
  startDate: string | null; expectedEndDate: string | null; actualEndDate: string | null;
  batchNumber: string | null; memo: string | null;
  brand: { id: string; name: string; code: string };
  product: { id: string; name: string; sku: string; imageUrl: string | null };
  stages: ProductionStage[];
}

const statusLabels: Record<string, string> = {
  planned: "계획", material_ready: "자재 준비", in_production: "생산중",
  quality_check: "품질 검사", completed: "완료", cancelled: "취소",
};
const statusColors: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700", material_ready: "bg-orange-100 text-orange-700",
  in_production: "bg-blue-100 text-blue-700", quality_check: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};
const priorityLabels: Record<string, string> = { low: "낮음", medium: "보통", high: "높음", urgent: "긴급" };
const stageStatusIcons: Record<string, React.ReactNode> = {
  pending: <Circle size={16} className="text-gray-300" />,
  in_progress: <Play size={16} className="text-blue-500" />,
  completed: <CheckCircle2 size={16} className="text-green-500" />,
  failed: <AlertTriangle size={16} className="text-red-500" />,
};

export default function ProductionPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok ? r.json() : []).then(setBrands).catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (selectedBrand) params.set("brandId", selectedBrand);
      if (selectedStatus) params.set("status", selectedStatus);
      const res = await fetch(`/api/production?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotal(data.total);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, selectedBrand, selectedStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStage = async (orderId: string, stageId: string, newStatus: string) => {
    try {
      await fetch(`/api/production/${orderId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, status: newStatus }),
      });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        const res = await fetch(`/api/production?page=1&limit=1`);
        // Refresh selected order
      }
    } catch { /* ignore */ }
  };

  const getProgress = (order: ProductionOrder) => {
    const completed = order.stages.filter(s => s.status === "completed").length;
    return order.stages.length > 0 ? Math.round((completed / order.stages.length) * 100) : 0;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">생산 공정 관리</h1>
          <p className="text-sm text-gray-500 mt-1">제품 생산 진행 현황 및 품질 관리</p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = orders.filter(o => o.status === status).length;
          return (
            <button key={status}
              onClick={() => { setSelectedStatus(selectedStatus === status ? "" : status); setPage(1); }}
              className={`bg-white rounded-2xl border p-4 text-center transition-all ${
                selectedStatus === status ? "ring-2 ring-[#111]" : "hover:shadow-sm"
              }`}>
              <p className="text-2xl font-bold">{count}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[status]}`}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm">
          <option value="">전체 브랜드</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Production Orders */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">생산 주문이 없습니다</div>
        ) : orders.map((order) => {
          const progress = getProgress(order);
          return (
            <div key={order.id} className="bg-white rounded-2xl border p-6 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    order.brand.code === "aramhuvis" ? "bg-gray-100 text-gray-700" : "bg-purple-100 text-purple-700"
                  }`}>{order.brand.code === "aramhuvis" ? "AH" : "LI"}</span>
                  <div>
                    <h3 className="font-semibold text-[#111]">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-500">{order.product.name} ({order.product.sku})</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {priorityLabels[order.priority]} | 수량: {order.quantity}개
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">진행률</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Stages */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {order.stages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const nextStatus = stage.status === "pending" ? "in_progress" : stage.status === "in_progress" ? "completed" : stage.status;
                        if (nextStatus !== stage.status) updateStage(order.id, stage.id, nextStatus);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        stage.status === "completed" ? "bg-green-50 border-green-200" :
                        stage.status === "in_progress" ? "bg-blue-50 border-blue-200" :
                        "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {stageStatusIcons[stage.status]}
                      <span className="whitespace-nowrap">{stage.name}</span>
                    </button>
                    {i < order.stages.length - 1 && <div className="w-4 h-px bg-gray-300" />}
                  </div>
                ))}
              </div>

              {/* Qty info */}
              <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
                <span>완료: {order.completedQty}개</span>
                <span>불량: {order.defectQty}개</span>
                {order.batchNumber && <span>배치: {order.batchNumber}</span>}
                {order.expectedEndDate && (
                  <span>예상 완료: {new Date(order.expectedEndDate).toLocaleDateString("ko")}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span className="px-4 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
