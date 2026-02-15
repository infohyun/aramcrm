"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Truck,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Copy,
  BoxIcon,
  MapPin,
  Calendar,
  Hash,
  TrendingDown,
  DollarSign,
  ClipboardList,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  unit: string;
  warehouse: string;
  status: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InventoryStats {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  reference: string | null;
  teamDivision: string | null;
  createdAt: string;
  user?: { id: string; name: string };
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  type: string;
  status: string;
  customerId: string | null;
  customer: { id: string; name: string; company: string | null } | null;
  courier: string | null;
  trackingNumber: string | null;
  teamDivision: string | null;
  origin: string | null;
  destination: string | null;
  items: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ShipmentStats {
  total: number;
  preparing: number;
  shipped: number;
  inTransit: number;
  delivered: number;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Configs ────────────────────────────────────────────────

const INVENTORY_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_stock: { label: "정상", color: "bg-green-100 text-green-700" },
  low_stock: { label: "부족", color: "bg-orange-100 text-orange-700" },
  out_of_stock: { label: "품절", color: "bg-red-100 text-red-700" },
};

const CATEGORY_OPTIONS = [
  { value: "", label: "전체" },
  { value: "skincare", label: "스킨케어" },
  { value: "makeup", label: "메이크업" },
  { value: "haircare", label: "헤어케어" },
  { value: "bodycare", label: "바디케어" },
];

const CATEGORY_LABELS: Record<string, string> = {
  skincare: "스킨케어",
  makeup: "메이크업",
  haircare: "헤어케어",
  bodycare: "바디케어",
};

const SHIPMENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  outbound: { label: "출고", color: "bg-blue-100 text-blue-700" },
  inbound: { label: "입고", color: "bg-green-100 text-green-700" },
  internal: { label: "내부이동", color: "bg-purple-100 text-purple-700" },
  as_return: { label: "AS반품", color: "bg-orange-100 text-orange-700" },
};

const SHIPMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  preparing: { label: "준비 중", color: "bg-gray-100 text-gray-700" },
  shipped: { label: "발송", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "배송 중", color: "bg-orange-100 text-orange-700" },
  delivered: { label: "배송 완료", color: "bg-green-100 text-green-700" },
  returned: { label: "반송", color: "bg-red-100 text-red-700" },
};

const COURIER_OPTIONS = [
  "CJ대한통운",
  "한진",
  "롯데",
  "우체국",
  "FedEx",
  "DHL",
  "EMS",
];

// ─── Helpers ────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("ko-KR").format(v) + "원";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// ─── Component ──────────────────────────────────────────────

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "shipments">("inventory");

  // ────────────────── Inventory State ──────────────────
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });
  const [invPagination, setInvPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [invCategory, setInvCategory] = useState("");
  const [invStatus, setInvStatus] = useState("");
  const [invWarehouse, setInvWarehouse] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [invLoading, setInvLoading] = useState(true);

  // Detail modal
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsPagination, setMovementsPagination] = useState<Pagination>({
    page: 1, limit: 10, total: 0, totalPages: 0,
  });

  // Movement action form
  const [movementAction, setMovementAction] = useState<"inbound" | "outbound" | "adjustment" | null>(null);
  const [movementQty, setMovementQty] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementRef, setMovementRef] = useState("");
  const [movementTeam, setMovementTeam] = useState("");
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  // Create inventory modal
  const [showInvCreate, setShowInvCreate] = useState(false);
  const [invFormSku, setInvFormSku] = useState("");
  const [invFormName, setInvFormName] = useState("");
  const [invFormCategory, setInvFormCategory] = useState("skincare");
  const [invFormStock, setInvFormStock] = useState("");
  const [invFormMinStock, setInvFormMinStock] = useState("");
  const [invFormMaxStock, setInvFormMaxStock] = useState("");
  const [invFormPrice, setInvFormPrice] = useState("");
  const [invFormUnit, setInvFormUnit] = useState("EA");
  const [invFormWarehouse, setInvFormWarehouse] = useState("");
  const [invFormMemo, setInvFormMemo] = useState("");
  const [invFormSubmitting, setInvFormSubmitting] = useState(false);

  // ────────────────── Shipment State ──────────────────
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentStats, setShipmentStats] = useState<ShipmentStats>({
    total: 0, preparing: 0, shipped: 0, inTransit: 0, delivered: 0,
  });
  const [shipPagination, setShipPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [shipType, setShipType] = useState("");
  const [shipStatus, setShipStatus] = useState("");
  const [shipTeam, setShipTeam] = useState("");
  const [shipSearch, setShipSearch] = useState("");
  const [shipLoading, setShipLoading] = useState(true);

  // Create shipment modal
  const [showShipCreate, setShowShipCreate] = useState(false);
  const [shipFormType, setShipFormType] = useState("outbound");
  const [shipFormCustomerId, setShipFormCustomerId] = useState("");
  const [shipFormCourier, setShipFormCourier] = useState("");
  const [shipFormTracking, setShipFormTracking] = useState("");
  const [shipFormTeam, setShipFormTeam] = useState("");
  const [shipFormOrigin, setShipFormOrigin] = useState("");
  const [shipFormDest, setShipFormDest] = useState("");
  const [shipFormItems, setShipFormItems] = useState("");
  const [shipFormMemo, setShipFormMemo] = useState("");
  const [shipFormSubmitting, setShipFormSubmitting] = useState(false);

  // Customer search (for shipment create)
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ────────────────── Fetch Inventory ──────────────────

  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(invPagination.page),
        limit: String(invPagination.limit),
      });
      if (invCategory) params.set("category", invCategory);
      if (invStatus) params.set("status", invStatus);
      if (invWarehouse) params.set("warehouse", invWarehouse);
      if (invSearch) params.set("search", invSearch);

      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();

      if (res.ok) {
        setInventoryItems(data.data || []);
        if (data.stats) setInventoryStats(data.stats);
        if (data.pagination) setInvPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setInvLoading(false);
    }
  }, [invPagination.page, invPagination.limit, invCategory, invStatus, invWarehouse, invSearch]);

  // ────────────────── Fetch Shipments ──────────────────

  const fetchShipments = useCallback(async () => {
    setShipLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(shipPagination.page),
        limit: String(shipPagination.limit),
      });
      if (shipType) params.set("type", shipType);
      if (shipStatus) params.set("status", shipStatus);
      if (shipTeam) params.set("teamDivision", shipTeam);
      if (shipSearch) params.set("search", shipSearch);

      const res = await fetch(`/api/shipments?${params}`);
      const data = await res.json();

      if (res.ok) {
        setShipments(data.data || []);
        if (data.stats) setShipmentStats(data.stats);
        if (data.pagination) setShipPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch shipments:", error);
    } finally {
      setShipLoading(false);
    }
  }, [shipPagination.page, shipPagination.limit, shipType, shipStatus, shipTeam, shipSearch]);

  // ────────────────── Effects ──────────────────

  useEffect(() => {
    if (activeTab === "inventory") {
      fetchInventory();
    }
  }, [activeTab, fetchInventory]);

  useEffect(() => {
    if (activeTab === "shipments") {
      fetchShipments();
    }
  }, [activeTab, fetchShipments]);

  // Customer search for shipment create
  useEffect(() => {
    if (customerSearch.length < 1) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data.data || data.customers || []);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ────────────────── Fetch Movements (Detail Modal) ──────────────────

  const fetchMovements = useCallback(async (itemId: string, page = 1) => {
    setMovementsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      const res = await fetch(`/api/inventory/${itemId}/movements?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMovements(data.data || []);
        if (data.pagination) setMovementsPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch movements:", error);
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  const openDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setMovementAction(null);
    resetMovementForm();
    fetchMovements(item.id);
  };

  // ────────────────── Movement Actions ──────────────────

  const resetMovementForm = () => {
    setMovementQty("");
    setMovementReason("");
    setMovementRef("");
    setMovementTeam("");
  };

  const handleMovementSubmit = async () => {
    if (!selectedItem || !movementAction || !movementQty) return;

    setMovementSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementAction,
          quantity: Number(movementQty),
          reason: movementReason || undefined,
          reference: movementRef || undefined,
          teamDivision: movementTeam || undefined,
        }),
      });

      if (res.ok) {
        setMovementAction(null);
        resetMovementForm();
        fetchMovements(selectedItem.id);
        fetchInventory();
        // Refresh selected item
        const itemRes = await fetch(`/api/inventory/${selectedItem.id}`);
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          setSelectedItem(itemData.data || itemData);
        }
      }
    } catch (error) {
      console.error("Failed to submit movement:", error);
    } finally {
      setMovementSubmitting(false);
    }
  };

  // ────────────────── Create Inventory ──────────────────

  const resetInvForm = () => {
    setInvFormSku("");
    setInvFormName("");
    setInvFormCategory("skincare");
    setInvFormStock("");
    setInvFormMinStock("");
    setInvFormMaxStock("");
    setInvFormPrice("");
    setInvFormUnit("EA");
    setInvFormWarehouse("");
    setInvFormMemo("");
  };

  const handleInvCreate = async () => {
    if (!invFormSku || !invFormName) return;

    setInvFormSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: invFormSku,
          productName: invFormName,
          category: invFormCategory,
          currentStock: Number(invFormStock) || 0,
          minStock: Number(invFormMinStock) || 0,
          maxStock: Number(invFormMaxStock) || 0,
          unitPrice: Number(invFormPrice) || 0,
          unit: invFormUnit,
          warehouse: invFormWarehouse,
          memo: invFormMemo || undefined,
        }),
      });

      if (res.ok) {
        setShowInvCreate(false);
        resetInvForm();
        fetchInventory();
      }
    } catch (error) {
      console.error("Failed to create inventory:", error);
    } finally {
      setInvFormSubmitting(false);
    }
  };

  // ────────────────── Create Shipment ──────────────────

  const resetShipForm = () => {
    setShipFormType("outbound");
    setShipFormCustomerId("");
    setShipFormCourier("");
    setShipFormTracking("");
    setShipFormTeam("");
    setShipFormOrigin("");
    setShipFormDest("");
    setShipFormItems("");
    setShipFormMemo("");
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  const handleShipCreate = async () => {
    setShipFormSubmitting(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: shipFormType,
          customerId: shipFormCustomerId || undefined,
          courier: shipFormCourier || undefined,
          trackingNumber: shipFormTracking || undefined,
          teamDivision: shipFormTeam || undefined,
          origin: shipFormOrigin || undefined,
          destination: shipFormDest || undefined,
          items: shipFormItems || undefined,
          memo: shipFormMemo || undefined,
        }),
      });

      if (res.ok) {
        setShowShipCreate(false);
        resetShipForm();
        fetchShipments();
      }
    } catch (error) {
      console.error("Failed to create shipment:", error);
    } finally {
      setShipFormSubmitting(false);
    }
  };

  // ────────────────── Copy Handler ──────────────────

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ────────────────── Render ──────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">재고/물류 관리</h1>
              </div>
            </div>
            <button
              onClick={() =>
                activeTab === "inventory"
                  ? setShowInvCreate(true)
                  : setShowShipCreate(true)
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {activeTab === "inventory" ? "재고 등록" : "배송 등록"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "inventory"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Package className="w-4 h-4" />
            재고 관리
          </button>
          <button
            onClick={() => setActiveTab("shipments")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "shipments"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            배송/물류
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: 재고 관리
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === "inventory" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 rounded-xl">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">전체 품목</p>
                    <p className="text-2xl font-bold text-gray-900">{inventoryStats.totalItems}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-100 rounded-xl">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">재고 부족</p>
                    <p className="text-2xl font-bold text-orange-600">{inventoryStats.lowStock}</p>
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
                    <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStock}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 rounded-xl">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">총 재고 가치</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(inventoryStats.totalValue)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select
                value={invCategory}
                onChange={(e) => {
                  setInvCategory(e.target.value);
                  setInvPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={invStatus}
                onChange={(e) => {
                  setInvStatus(e.target.value);
                  setInvPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">상태 전체</option>
                <option value="in_stock">정상</option>
                <option value="low_stock">부족</option>
                <option value="out_of_stock">품절</option>
              </select>

              <input
                type="text"
                placeholder="창고"
                value={invWarehouse}
                onChange={(e) => {
                  setInvWarehouse(e.target.value);
                  setInvPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
              />

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="SKU, 제품명 검색..."
                    value={invSearch}
                    onChange={(e) => {
                      setInvSearch(e.target.value);
                      setInvPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {invLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">재고 항목이 없습니다.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">제품명</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">카테고리</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">현재재고</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">최소재고</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">단가</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">창고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inventoryItems.map((item) => {
                        const statusCfg = INVENTORY_STATUS_CONFIG[item.status] || INVENTORY_STATUS_CONFIG.in_stock;
                        const stockPercent = item.maxStock > 0
                          ? Math.min(100, Math.round((item.currentStock / item.maxStock) * 100))
                          : 0;
                        const barColor =
                          item.status === "out_of_stock"
                            ? "bg-red-500"
                            : item.status === "low_stock"
                            ? "bg-orange-500"
                            : "bg-green-500";

                        return (
                          <tr
                            key={item.id}
                            onClick={() => openDetail(item)}
                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3.5 text-sm font-mono text-gray-600">{item.sku}</td>
                            <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{item.productName}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-600">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 w-12">
                                  {item.currentStock}
                                </span>
                                <div className="flex-1 min-w-[60px] max-w-[100px]">
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full ${barColor} transition-all`}
                                      style={{ width: `${stockPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-gray-500">{item.minStock}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-gray-600">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-500">{item.warehouse || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {invPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-500">
                  총 {invPagination.total}건 중{" "}
                  {(invPagination.page - 1) * invPagination.limit + 1}-
                  {Math.min(invPagination.page * invPagination.limit, invPagination.total)}건
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={invPagination.page === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    {invPagination.page} / {invPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setInvPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={invPagination.page === invPagination.totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: 배송/물류
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === "shipments" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 rounded-xl">
                    <Truck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">전체 배송</p>
                    <p className="text-2xl font-bold text-gray-900">{shipmentStats.total}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">준비 중</p>
                    <p className="text-2xl font-bold text-blue-600">{shipmentStats.preparing}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-100 rounded-xl">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">배송 중</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {shipmentStats.shipped + shipmentStats.inTransit}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">배송 완료</p>
                    <p className="text-2xl font-bold text-green-600">{shipmentStats.delivered}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select
                value={shipType}
                onChange={(e) => {
                  setShipType(e.target.value);
                  setShipPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">유형 전체</option>
                <option value="outbound">출고</option>
                <option value="inbound">입고</option>
                <option value="internal">내부이동</option>
                <option value="as_return">AS반품</option>
              </select>

              <select
                value={shipStatus}
                onChange={(e) => {
                  setShipStatus(e.target.value);
                  setShipPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">상태 전체</option>
                <option value="preparing">준비 중</option>
                <option value="shipped">발송</option>
                <option value="in_transit">배송 중</option>
                <option value="delivered">배송 완료</option>
                <option value="returned">반송</option>
              </select>

              <input
                type="text"
                placeholder="팀/부서"
                value={shipTeam}
                onChange={(e) => {
                  setShipTeam(e.target.value);
                  setShipPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
              />

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="배송번호, 운송장, 고객명 검색..."
                    value={shipSearch}
                    onChange={(e) => {
                      setShipSearch(e.target.value);
                      setShipPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Shipment Cards */}
            {shipLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">배송 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shipments.map((ship) => {
                  const typeCfg = SHIPMENT_TYPE_CONFIG[ship.type] || SHIPMENT_TYPE_CONFIG.outbound;
                  const statusCfg = SHIPMENT_STATUS_CONFIG[ship.status] || SHIPMENT_STATUS_CONFIG.preparing;

                  return (
                    <div
                      key={ship.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5 hover:shadow-md transition-shadow"
                    >
                      {/* Top: Badges + shipment number */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDate(ship.createdAt)}
                        </span>
                      </div>

                      {/* Shipment number */}
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900 text-sm">{ship.shipmentNumber}</span>
                      </div>

                      {/* Customer */}
                      {ship.customer && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium flex-shrink-0">
                            {ship.customer.name.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700">
                            {ship.customer.name}
                            {ship.customer.company && (
                              <span className="text-gray-400 ml-1">({ship.customer.company})</span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Courier + tracking */}
                      {(ship.courier || ship.trackingNumber) && (
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">
                            {ship.courier && <span className="font-medium">{ship.courier}</span>}
                            {ship.trackingNumber && (
                              <>
                                {ship.courier && <span className="mx-1">-</span>}
                                <span className="font-mono text-xs">{ship.trackingNumber}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(ship.trackingNumber!, ship.id);
                                  }}
                                  className="ml-1 p-0.5 hover:bg-gray-100 rounded inline-flex items-center"
                                  title="복사"
                                >
                                  {copiedId === ship.id ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </button>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Team */}
                      {ship.teamDivision && (
                        <div className="flex items-center gap-2 mb-2">
                          <BoxIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-500">{ship.teamDivision}</span>
                        </div>
                      )}

                      {/* Origin -> Destination */}
                      {(ship.origin || ship.destination) && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">
                            {ship.origin || "—"}
                          </span>
                          <span className="text-gray-300 mx-1">&rarr;</span>
                          <span className="text-sm text-gray-600">
                            {ship.destination || "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {shipPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-500">
                  총 {shipPagination.total}건 중{" "}
                  {(shipPagination.page - 1) * shipPagination.limit + 1}-
                  {Math.min(shipPagination.page * shipPagination.limit, shipPagination.total)}건
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShipPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={shipPagination.page === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    {shipPagination.page} / {shipPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setShipPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={shipPagination.page === shipPagination.totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: Inventory Detail
         ═══════════════════════════════════════════════════════════ */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedItem.productName}</h2>
                  <p className="text-sm text-gray-500 font-mono">{selectedItem.sku}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setMovementAction(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">카테고리</p>
                  <p className="text-sm font-medium text-gray-900">{CATEGORY_LABELS[selectedItem.category] || selectedItem.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">단위</p>
                  <p className="text-sm font-medium text-gray-900">{selectedItem.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">단가</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedItem.unitPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">창고</p>
                  <p className="text-sm font-medium text-gray-900">{selectedItem.warehouse || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">상태</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(INVENTORY_STATUS_CONFIG[selectedItem.status] || INVENTORY_STATUS_CONFIG.in_stock).color}`}>
                    {(INVENTORY_STATUS_CONFIG[selectedItem.status] || INVENTORY_STATUS_CONFIG.in_stock).label}
                  </span>
                </div>
              </div>

              {/* Stock Visual */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">재고 현황</h3>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>0</span>
                  <span>최소: {selectedItem.minStock}</span>
                  <span>최대: {selectedItem.maxStock}</span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-4">
                  {/* Min stock marker */}
                  {selectedItem.maxStock > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-orange-400 z-10"
                      style={{ left: `${Math.min(100, (selectedItem.minStock / selectedItem.maxStock) * 100)}%` }}
                    />
                  )}
                  <div
                    className={`h-4 rounded-full transition-all ${
                      selectedItem.status === "out_of_stock"
                        ? "bg-red-500"
                        : selectedItem.status === "low_stock"
                        ? "bg-orange-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${selectedItem.maxStock > 0 ? Math.min(100, (selectedItem.currentStock / selectedItem.maxStock) * 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-gray-900">{selectedItem.currentStock}</span>
                  <span className="text-sm text-gray-500 ml-1">{selectedItem.unit}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMovementAction(movementAction === "inbound" ? null : "inbound");
                    resetMovementForm();
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    movementAction === "inbound"
                      ? "bg-green-600 text-white"
                      : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                  }`}
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  입고
                </button>
                <button
                  onClick={() => {
                    setMovementAction(movementAction === "outbound" ? null : "outbound");
                    resetMovementForm();
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    movementAction === "outbound"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  }`}
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  출고
                </button>
                <button
                  onClick={() => {
                    setMovementAction(movementAction === "adjustment" ? null : "adjustment");
                    resetMovementForm();
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    movementAction === "adjustment"
                      ? "bg-purple-600 text-white"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  조정
                </button>
              </div>

              {/* Movement Form */}
              {movementAction && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700">
                    {movementAction === "inbound" ? "입고" : movementAction === "outbound" ? "출고" : "재고 조정"} 등록
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">수량 <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={movementQty}
                        onChange={(e) => setMovementQty(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">팀/부서</label>
                      <input
                        type="text"
                        value={movementTeam}
                        onChange={(e) => setMovementTeam(e.target.value)}
                        placeholder="예: 물류팀"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">사유</label>
                    <input
                      type="text"
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                      placeholder="사유 입력"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">참조</label>
                    <input
                      type="text"
                      value={movementRef}
                      onChange={(e) => setMovementRef(e.target.value)}
                      placeholder="참조 번호"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setMovementAction(null);
                        resetMovementForm();
                      }}
                      className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleMovementSubmit}
                      disabled={!movementQty || movementSubmitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {movementSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      등록
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Movements */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">최근 입출고 내역</h3>
                {movementsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                ) : movements.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">
                    입출고 내역이 없습니다.
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">유형</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">수량</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">사유</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">참조</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">일시</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {movements.map((mv) => (
                          <tr key={mv.id} className="text-sm">
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  mv.type === "inbound"
                                    ? "bg-green-100 text-green-700"
                                    : mv.type === "outbound"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {mv.type === "inbound" ? "입고" : mv.type === "outbound" ? "출고" : "조정"}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {mv.type === "inbound" ? "+" : mv.type === "outbound" ? "-" : ""}
                              {mv.quantity}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{mv.reason || "-"}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono text-xs">{mv.reference || "-"}</td>
                            <td className="px-3 py-2 text-gray-400 text-xs">{formatDate(mv.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Movements pagination */}
                {movementsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        const newPage = movementsPagination.page - 1;
                        setMovementsPagination((prev) => ({ ...prev, page: newPage }));
                        if (selectedItem) fetchMovements(selectedItem.id, newPage);
                      }}
                      disabled={movementsPagination.page === 1}
                      className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-500">
                      {movementsPagination.page} / {movementsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => {
                        const newPage = movementsPagination.page + 1;
                        setMovementsPagination((prev) => ({ ...prev, page: newPage }));
                        if (selectedItem) fetchMovements(selectedItem.id, newPage);
                      }}
                      disabled={movementsPagination.page === movementsPagination.totalPages}
                      className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: Create Inventory
         ═══════════════════════════════════════════════════════════ */}
      {showInvCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">재고 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowInvCreate(false);
                  resetInvForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invFormSku}
                    onChange={(e) => setInvFormSku(e.target.value)}
                    placeholder="SKU-001"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    카테고리
                  </label>
                  <select
                    value={invFormCategory}
                    onChange={(e) => setInvFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="skincare">스킨케어</option>
                    <option value="makeup">메이크업</option>
                    <option value="haircare">헤어케어</option>
                    <option value="bodycare">바디케어</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  제품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invFormName}
                  onChange={(e) => setInvFormName(e.target.value)}
                  placeholder="제품명을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">초기재고</label>
                  <input
                    type="number"
                    value={invFormStock}
                    onChange={(e) => setInvFormStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">최소재고</label>
                  <input
                    type="number"
                    value={invFormMinStock}
                    onChange={(e) => setInvFormMinStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">최대재고</label>
                  <input
                    type="number"
                    value={invFormMaxStock}
                    onChange={(e) => setInvFormMaxStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">단가</label>
                  <input
                    type="number"
                    value={invFormPrice}
                    onChange={(e) => setInvFormPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">단위</label>
                  <select
                    value={invFormUnit}
                    onChange={(e) => setInvFormUnit(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EA">EA</option>
                    <option value="BOX">BOX</option>
                    <option value="SET">SET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">창고</label>
                  <input
                    type="text"
                    value={invFormWarehouse}
                    onChange={(e) => setInvFormWarehouse(e.target.value)}
                    placeholder="창고명"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
                <textarea
                  value={invFormMemo}
                  onChange={(e) => setInvFormMemo(e.target.value)}
                  placeholder="메모 입력 (선택사항)"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowInvCreate(false);
                  resetInvForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleInvCreate}
                disabled={!invFormSku || !invFormName || invFormSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {invFormSubmitting ? (
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

      {/* ═══════════════════════════════════════════════════════════
          MODAL: Create Shipment
         ═══════════════════════════════════════════════════════════ */}
      {showShipCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Truck className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">배송 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowShipCreate(false);
                  resetShipForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  유형 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(SHIPMENT_TYPE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setShipFormType(key)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        shipFormType === key
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">고객</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <div>
                      <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
                      {selectedCustomer.company && (
                        <span className="text-sm text-gray-500 ml-2">{selectedCustomer.company}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setShipFormCustomerId("");
                        setCustomerSearch("");
                      }}
                      className="p-1 hover:bg-indigo-100 rounded"
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
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShipFormCustomerId(customer.id);
                              setShowCustomerDropdown(false);
                              setCustomerSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-gray-900 text-sm">{customer.name}</span>
                            {customer.company && (
                              <span className="text-xs text-gray-500 ml-2">{customer.company}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Courier + Tracking */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">택배사</label>
                  <select
                    value={shipFormCourier}
                    onChange={(e) => setShipFormCourier(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">선택</option>
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">운송장 번호</label>
                  <input
                    type="text"
                    value={shipFormTracking}
                    onChange={(e) => setShipFormTracking(e.target.value)}
                    placeholder="운송장 번호"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Team division */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">팀/부서</label>
                <input
                  type="text"
                  value={shipFormTeam}
                  onChange={(e) => setShipFormTeam(e.target.value)}
                  placeholder="예: 물류팀"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Origin + Destination */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">출발지</label>
                  <input
                    type="text"
                    value={shipFormOrigin}
                    onChange={(e) => setShipFormOrigin(e.target.value)}
                    placeholder="출발지 주소"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">도착지</label>
                  <input
                    type="text"
                    value={shipFormDest}
                    onChange={(e) => setShipFormDest(e.target.value)}
                    placeholder="도착지 주소"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">품목</label>
                <textarea
                  value={shipFormItems}
                  onChange={(e) => setShipFormItems(e.target.value)}
                  placeholder="배송 품목을 입력하세요"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
                <textarea
                  value={shipFormMemo}
                  onChange={(e) => setShipFormMemo(e.target.value)}
                  placeholder="메모 입력 (선택사항)"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowShipCreate(false);
                  resetShipForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleShipCreate}
                disabled={shipFormSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {shipFormSubmitting ? (
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
