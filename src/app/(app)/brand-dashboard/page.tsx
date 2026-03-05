"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, ShoppingCart, Megaphone, Factory, MessageSquare,
  TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Filter
} from "lucide-react";

interface BrandInfo {
  id: string;
  code: string;
  name: string;
  type: string;
  _count: { products: number; orders: number; promotions: number; productions: number };
}

interface DashboardData {
  stats: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    activePromotions: number;
    productionInProgress: number;
    totalMessages: number;
  };
  brands: BrandInfo[];
  dailySales: { date: string; revenue: number; orders: number }[];
  ordersBySource: { source: string; _count: number; _sum: { totalAmount: number } }[];
  ordersByStatus: { status: string; _count: number }[];
  lowStockProducts: { id: string; name: string; sku: string; currentStock: number; safetyStock: number; brand: { name: string; code: string } }[];
  recentOrders: { id: string; orderNumber: string; customerName: string; totalAmount: number; status: string; orderedAt: string; brand: { name: string; code: string } }[];
  productionStats: { status: string; _count: number }[];
  messagingStats: { channel: string; _count: number }[];
}

const statusLabels: Record<string, string> = {
  pending: "대기", confirmed: "확인", processing: "처리중", shipped: "배송중",
  delivered: "배송완료", cancelled: "취소", refunded: "환불", returned: "반품",
  planned: "계획", material_ready: "자재준비", in_production: "생산중",
  quality_check: "품질검사", completed: "완료",
};

const sourceLabels: Record<string, string> = {
  direct: "직접 주문", cafe24: "카페24", website: "홈페이지", phone: "전화 주문", wholesale: "도매",
};

const channelLabels: Record<string, string> = {
  kakao: "카카오톡", sms: "SMS", email: "이메일", messenger: "메신저", slack: "슬랙", push: "푸시",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700", shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
  planned: "bg-gray-100 text-gray-700", material_ready: "bg-orange-100 text-orange-700",
  in_production: "bg-blue-100 text-blue-700", quality_check: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

export default function BrandDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedBrand ? `?brandId=${selectedBrand}` : "";
      const res = await fetch(`/api/brands/dashboard${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [selectedBrand]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalRevenue = data.dailySales.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrderCount = data.dailySales.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">브랜드 통합 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">아람휴비스 & LILAI.AI 통합 현황</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-sm bg-transparent border-none outline-none"
            >
              <option value="">전체 브랜드</option>
              {data.brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchData} className="p-2 bg-white rounded-xl border hover:bg-gray-50">
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Brand Cards */}
      {!selectedBrand && data.brands.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id)}
              className="bg-white rounded-2xl border p-6 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                  brand.code === "aramhuvis" ? "bg-[#111]" : "bg-gradient-to-br from-purple-500 to-pink-500"
                }`}>
                  {brand.code === "aramhuvis" ? "AH" : "LI"}
                </div>
                <div>
                  <h3 className="font-semibold text-[#111]">{brand.name}</h3>
                  <p className="text-xs text-gray-400">{brand.type === "b2b" ? "B2B" : "B2C"}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-400">제품</p>
                  <p className="text-lg font-bold">{brand._count.products}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">주문</p>
                  <p className="text-lg font-bold">{brand._count.orders}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">프로모션</p>
                  <p className="text-lg font-bold">{brand._count.promotions}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">생산</p>
                  <p className="text-lg font-bold">{brand._count.productions}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: "제품", value: data.stats.totalProducts, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "활성 제품", value: data.stats.activeProducts, icon: Package, color: "text-green-600", bg: "bg-green-50" },
          { label: "총 주문", value: data.stats.totalOrders, icon: ShoppingCart, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "대기 주문", value: data.stats.pendingOrders, icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "진행 프로모션", value: data.stats.activePromotions, icon: Megaphone, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "생산 진행", value: data.stats.productionInProgress, icon: Factory, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "메시지 발송", value: data.stats.totalMessages, icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-[#111]">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 30일 매출 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111]">최근 30일 매출 추이</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp size={14} className="text-green-500" />
                <span className="text-gray-600">매출: {(totalRevenue / 10000).toFixed(0)}만원</span>
              </div>
              <span className="text-gray-400">주문: {totalOrderCount}건</span>
            </div>
          </div>
          {data.dailySales.length > 0 ? (
            <div className="h-48 flex items-end gap-1">
              {data.dailySales.map((d, i) => {
                const maxRev = Math.max(...data.dailySales.map((s) => s.revenue), 1);
                const height = Math.max((d.revenue / maxRev) * 100, 4);
                return (
                  <div key={i} className="flex-1 group relative">
                    <div
                      className="bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                      {d.date.slice(5)}: {(d.revenue / 10000).toFixed(0)}만원 ({d.orders}건)
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              매출 데이터가 없습니다
            </div>
          )}
        </div>

        {/* 주문 소스별 */}
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold text-[#111] mb-4">주문 채널별 현황</h3>
          <div className="space-y-3">
            {data.ordersBySource.length > 0 ? data.ordersBySource.map((s) => {
              const total = data.ordersBySource.reduce((sum, x) => sum + x._count, 0);
              const pct = total > 0 ? (s._count / total) * 100 : 0;
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{sourceLabels[s.source] || s.source}</span>
                    <span className="font-medium">{s._count}건</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-400 text-sm">데이터 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 최근 주문 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-6">
          <h3 className="font-semibold text-[#111] mb-4">최근 주문</h3>
          <div className="space-y-2">
            {data.recentOrders.length > 0 ? data.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    order.brand.code === "aramhuvis" ? "bg-gray-100 text-gray-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {order.brand.code === "aramhuvis" ? "AH" : "LI"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400">{order.customerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{order.totalAmount.toLocaleString()}원</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-sm text-center py-4">주문 데이터가 없습니다</p>
            )}
          </div>
        </div>

        {/* 재고 부족 & 생산/메시징 */}
        <div className="space-y-4">
          {/* 재고 부족 알림 */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-[#111] mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              재고 부족 제품
            </h3>
            <div className="space-y-2">
              {data.lowStockProducts.length > 0 ? data.lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>
                  <span className={`text-xs font-medium ${p.currentStock === 0 ? "text-red-600" : "text-orange-600"}`}>
                    {p.currentStock}개
                  </span>
                </div>
              )) : (
                <p className="text-gray-400 text-sm">재고 부족 제품 없음</p>
              )}
            </div>
          </div>

          {/* 생산 현황 */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-[#111] mb-3 flex items-center gap-2">
              <Factory size={16} className="text-teal-500" />
              생산 현황
            </h3>
            <div className="space-y-2">
              {data.productionStats.length > 0 ? data.productionStats.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[s.status] || "bg-gray-100 text-gray-700"}`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                  <span className="font-medium">{s._count}건</span>
                </div>
              )) : (
                <p className="text-gray-400 text-sm">생산 데이터 없음</p>
              )}
            </div>
          </div>

          {/* 메시징 통계 */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-[#111] mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-pink-500" />
              메시징 채널
            </h3>
            <div className="space-y-2">
              {data.messagingStats.length > 0 ? data.messagingStats.map((s) => (
                <div key={s.channel} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{channelLabels[s.channel] || s.channel}</span>
                  <span className="font-medium">{s._count}건</span>
                </div>
              )) : (
                <p className="text-gray-400 text-sm">발송 데이터 없음</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
