"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart, Plus, Search, Filter, Eye,
  ChevronLeft, ChevronRight, X, Download, Truck
} from "lucide-react";

interface Brand { id: string; code: string; name: string; }
interface OrderItem {
  id: string; productName: string; sku: string | null; quantity: number;
  unitPrice: number; discount: number; totalPrice: number;
}
interface BrandOrder {
  id: string; brandId: string; orderNumber: string; externalOrderId: string | null;
  source: string; customerName: string; customerEmail: string | null;
  customerPhone: string | null; totalAmount: number; status: string;
  paymentStatus: string; paymentMethod: string | null; orderedAt: string;
  shippedAt: string | null; deliveredAt: string | null; trackingNumber: string | null;
  courier: string | null; memo: string | null;
  brand: { id: string; name: string; code: string };
  items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pending: "주문접수", confirmed: "주문확인", processing: "처리중", shipped: "배송중",
  delivered: "배송완료", cancelled: "주문취소", refunded: "환불완료", returned: "반품",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700", shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
  refunded: "bg-orange-100 text-orange-700", returned: "bg-gray-100 text-gray-700",
};
const paymentLabels: Record<string, string> = {
  unpaid: "미결제", paid: "결제완료", partial: "부분결제", refunded: "환불",
};
const sourceLabels: Record<string, string> = {
  direct: "직접주문", cafe24: "카페24", website: "홈페이지", phone: "전화주문", wholesale: "도매",
};

export default function BrandOrdersPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [orders, setOrders] = useState<BrandOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [search, setSearch] = useState("");
  const [detailOrder, setDetailOrder] = useState<BrandOrder | null>(null);

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok ? r.json() : []).then(setBrands).catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (selectedBrand) params.set("brandId", selectedBrand);
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedSource) params.set("source", selectedSource);
      if (search) params.set("search", search);
      const res = await fetch(`/api/brands/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotal(data.total);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, selectedBrand, selectedStatus, selectedSource, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">통합 주문 관리</h1>
          <p className="text-sm text-gray-500 mt-1">카페24, 홈페이지, 직접 주문 통합</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="주문번호, 고객명, 연락처 검색..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm outline-none w-full" />
        </div>
        <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm">
          <option value="">전체 브랜드</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={selectedSource} onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm">
          <option value="">전체 채널</option>
          {Object.entries(sourceLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">브랜드</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">주문번호</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">고객</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">채널</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">금액</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">결제</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">상태</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">주문일</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">로딩 중...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">주문이 없습니다</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    o.brand.code === "aramhuvis" ? "bg-gray-100 text-gray-700" : "bg-purple-100 text-purple-700"
                  }`}>{o.brand.code === "aramhuvis" ? "AH" : "LI"}</span>
                </td>
                <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-xs text-gray-400">{o.customerPhone || o.customerEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{sourceLabels[o.source] || o.source}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{o.totalAmount.toLocaleString()}원</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    o.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{paymentLabels[o.paymentStatus] || o.paymentStatus}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[o.status] || "bg-gray-100"}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs">
                  {new Date(o.orderedAt).toLocaleDateString("ko")}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setDetailOrder(o)} className="p-1 hover:bg-gray-100 rounded">
                    <Eye size={16} className="text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">총 {total}건</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">주문 상세 - {detailOrder.orderNumber}</h2>
              <button onClick={() => setDetailOrder(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">고객</p>
                <p className="font-medium">{detailOrder.customerName}</p>
                <p className="text-sm text-gray-500">{detailOrder.customerPhone}</p>
                <p className="text-sm text-gray-500">{detailOrder.customerEmail}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">배송 정보</p>
                {detailOrder.trackingNumber ? (
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-gray-400" />
                    <span className="text-sm">{detailOrder.courier} {detailOrder.trackingNumber}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">배송 정보 없음</p>
                )}
              </div>
            </div>
            <h3 className="font-semibold mb-3">주문 상품</h3>
            <table className="w-full text-sm mb-6">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">상품</th>
                  <th className="text-right px-3 py-2">단가</th>
                  <th className="text-right px-3 py-2">수량</th>
                  <th className="text-right px-3 py-2">할인</th>
                  <th className="text-right px-3 py-2">합계</th>
                </tr>
              </thead>
              <tbody>
                {detailOrder.items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-right">{item.unitPrice.toLocaleString()}원</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-red-500">{item.discount > 0 ? `-${item.discount.toLocaleString()}원` : "-"}</td>
                    <td className="px-3 py-2 text-right font-medium">{item.totalPrice.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#111]">{detailOrder.totalAmount.toLocaleString()}원</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
