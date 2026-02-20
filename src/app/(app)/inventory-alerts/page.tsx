"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  XCircle,
  ArrowUp,
  Bell,
  BellOff,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ShoppingCart,
  ClipboardCheck,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface InventoryAlert {
  id: string;
  type: "low_stock" | "out_of_stock" | "overstock";
  message: string;
  isRead: boolean;
  inventoryItemId: string;
  createdAt: string;
  inventoryItem?: {
    id: string;
    productName: string;
    sku: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
  };
}

interface PurchaseRequest {
  id: string;
  inventoryItemId: string;
  productName: string;
  quantity: number;
  reason: string;
  status: "pending" | "approved" | "ordered" | "received";
  createdAt: string;
  updatedAt: string;
  inventoryItem?: {
    id: string;
    productName: string;
    sku: string;
  };
}

interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
}

// ─── Configs ────────────────────────────────────────────────

const ALERT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  low_stock: {
    label: "재고 부족",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  out_of_stock: {
    label: "재고 없음",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
  overstock: {
    label: "과잉 재고",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <ArrowUp className="w-4 h-4 text-blue-600" />,
  },
};

const REQUEST_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "대기",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  approved: {
    label: "승인",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  ordered: {
    label: "발주",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  received: {
    label: "입고",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "approved", label: "승인" },
  { value: "ordered", label: "발주" },
  { value: "received", label: "입고" },
];

// ─── Helpers ────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Component ──────────────────────────────────────────────

export default function InventoryAlertsPage() {
  const [activeTab, setActiveTab] = useState<"alerts" | "requests">("alerts");

  // ────────────────── Alerts State ──────────────────
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // ────────────────── Purchase Requests State ──────────────────
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestStatusFilter, setRequestStatusFilter] = useState("");

  // ────────────────── Create Modal State ──────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [formItemId, setFormItemId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ────────────────── Computed Stats ──────────────────
  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const lowStockCount = alerts.filter((a) => a.type === "low_stock").length;
  const outOfStockCount = alerts.filter((a) => a.type === "out_of_stock").length;

  // ────────────────── Fetch Alerts ──────────────────

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/inventory-alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // ────────────────── Fetch Purchase Requests ──────────────────

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      if (requestStatusFilter) params.set("status", requestStatusFilter);

      const res = await fetch(`/api/purchase-requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch purchase requests:", error);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestStatusFilter]);

  // ────────────────── Fetch Inventory Items (for modal) ──────────────────

  const fetchInventoryItems = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await fetch("/api/inventory?limit=100");
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch inventory items:", error);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  // ────────────────── Effects ──────────────────

  useEffect(() => {
    if (activeTab === "alerts") {
      fetchAlerts();
    }
  }, [activeTab, fetchAlerts]);

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  // ────────────────── Mark All As Read ──────────────────

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/inventory-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // ────────────────── Mark Single Alert As Read ──────────────────

  const handleMarkRead = async (alertId: string) => {
    try {
      const res = await fetch("/api/inventory-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", alertId }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // ────────────────── Create Purchase Request ──────────────────

  const handleCreateRequest = async () => {
    if (!formItemId || !formQuantity) return;

    setFormSubmitting(true);
    try {
      const selectedItem = inventoryItems.find((i) => i.id === formItemId);
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: formItemId,
          productName: selectedItem?.productName || "",
          quantity: Number(formQuantity),
          reason: formReason || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchRequests();
      }
    } catch (error) {
      console.error("Failed to create purchase request:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  // ────────────────── Update Purchase Request Status ──────────────────

  const handleUpdateStatus = async (
    id: string,
    status: string
  ) => {
    try {
      const res = await fetch(`/api/purchase-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // ────────────────── Helpers ──────────────────

  const resetForm = () => {
    setFormItemId("");
    setFormQuantity("");
    setFormReason("");
  };

  const openCreateModal = () => {
    resetForm();
    fetchInventoryItems();
    setShowCreateModal(true);
  };

  // ────────────────── Render ──────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  재고 알림 &amp; 발주
                </h1>
              </div>
            </div>
            {activeTab === "requests" && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                발주 요청
              </button>
            )}
            {activeTab === "alerts" && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <BellOff className="w-4 h-4" />
                전체 읽음
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "alerts"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Bell className="w-4 h-4" />
            재고 알림
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "requests"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            발주 요청
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: 재고 알림
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === "alerts" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 rounded-xl">
                    <Bell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">읽지 않은 알림</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {unreadCount}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">재고 부족</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {lowStockCount}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 rounded-xl">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">재고 없음</p>
                    <p className="text-2xl font-bold text-red-600">
                      {outOfStockCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert List */}
            {alertsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">재고 알림이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const typeConfig =
                    ALERT_TYPE_CONFIG[alert.type] || ALERT_TYPE_CONFIG.low_stock;
                  const borderColor =
                    alert.type === "low_stock"
                      ? "border-l-amber-400"
                      : alert.type === "out_of_stock"
                      ? "border-l-red-400"
                      : "border-l-blue-400";

                  return (
                    <div
                      key={alert.id}
                      onClick={() => {
                        if (!alert.isRead) handleMarkRead(alert.id);
                      }}
                      className={`bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-4 transition-all hover:shadow-md cursor-pointer ${
                        !alert.isRead
                          ? `border-l-4 ${borderColor}`
                          : "border-l-4 border-l-transparent opacity-70"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${typeConfig.bgColor}`}
                        >
                          {typeConfig.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
                            >
                              {typeConfig.label}
                            </span>
                            {!alert.isRead && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p
                            className={`text-sm ${
                              !alert.isRead
                                ? "font-semibold text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {alert.message}
                          </p>
                          {alert.inventoryItem && (
                            <p className="text-xs text-gray-400 mt-1">
                              {alert.inventoryItem.productName} ({alert.inventoryItem.sku}) - 현재 재고: {alert.inventoryItem.currentStock}
                            </p>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {formatDateTime(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: 발주 요청
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === "requests" && (
          <>
            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setRequestStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    requestStatusFilter === filter.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Request List */}
            {requestsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">발주 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const statusConfig =
                    REQUEST_STATUS_CONFIG[req.status] ||
                    REQUEST_STATUS_CONFIG.pending;

                  const statusIcon =
                    req.status === "pending" ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : req.status === "approved" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : req.status === "ordered" ? (
                      <Truck className="w-3.5 h-3.5" />
                    ) : (
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    );

                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Main Info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                            <Package className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {req.productName}
                              </h4>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                              >
                                {statusIcon}
                                {statusConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                              <span>
                                수량:{" "}
                                <span className="font-medium text-gray-700">
                                  {req.quantity}
                                </span>
                              </span>
                              {req.reason && (
                                <span className="text-gray-400">
                                  | {req.reason}
                                </span>
                              )}
                            </div>
                            {req.inventoryItem && (
                              <p className="text-xs text-gray-400 mt-1">
                                SKU: {req.inventoryItem.sku}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(req.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(req.id, "approved")
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                승인
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(req.id, "rejected")
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                반려
                              </button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(req.id, "ordered")
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              발주 처리
                            </button>
                          )}
                          {req.status === "ordered" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(req.id, "received")
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              입고 완료
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: Create Purchase Request
         ═══════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">발주 요청</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Inventory Item Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  재고 품목 <span className="text-red-500">*</span>
                </label>
                {inventoryLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                ) : (
                  <select
                    value={formItemId}
                    onChange={(e) => setFormItemId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">품목을 선택하세요</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.productName} ({item.sku}) - 현재: {item.currentStock}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  수량 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="발주 수량을 입력하세요"
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  사유
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="발주 사유를 입력하세요 (선택사항)"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={!formItemId || !formQuantity || formSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
