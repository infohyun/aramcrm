"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Globe,
  Search,
  Loader2,
  Link2,
  Copy,
  Check,
  Eye,
  X,
  User,
  ShoppingCart,
  FileSignature,
  Wrench,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface PortalLink {
  token: string;
  portalUrl: string;
  expiresAt: string;
  customer: { id: string; name: string; company: string | null };
}

interface PortalOrder {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  status: string;
  orderDate: string;
}

interface PortalContract {
  id: string;
  contractNumber: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  value: number;
}

interface PortalTicket {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  receivedAt: string;
  estimatedDays: number | null;
  createdAt: string;
}

interface PortalQuote {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  totalAmount: number;
  validUntil: string | null;
  createdAt: string;
  items?: { id: string; description: string; quantity: number; unitPrice: number; amount: number }[];
}

interface PortalData {
  customer: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  };
  recentOrders: PortalOrder[];
  activeContracts: PortalContract[];
  openTickets: PortalTicket[];
  pendingQuotes: PortalQuote[];
}

// ─── Status Labels & Styles ───────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "확인", color: "bg-blue-100 text-blue-700" },
  processing: { label: "처리중", color: "bg-indigo-100 text-indigo-700" },
  shipped: { label: "배송중", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "배송완료", color: "bg-green-100 text-green-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

const CONTRACT_TYPE: Record<string, string> = {
  subscription: "구독",
  service: "서비스",
  maintenance: "유지보수",
  license: "라이선스",
};

const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  received: { label: "접수", color: "bg-slate-100 text-slate-700" },
  inspecting: { label: "검수 중", color: "bg-blue-100 text-blue-700" },
  in_repair: { label: "수리 중", color: "bg-orange-100 text-orange-700" },
  waiting_parts: { label: "부품 대기", color: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", color: "bg-emerald-100 text-emerald-700" },
  returned: { label: "반송", color: "bg-indigo-100 text-indigo-700" },
  closed: { label: "종료", color: "bg-gray-100 text-gray-500" },
};

const TICKET_PRIORITY: Record<string, { label: string; color: string }> = {
  urgent: { label: "긴급", color: "bg-red-100 text-red-700" },
  high: { label: "높음", color: "bg-orange-100 text-orange-700" },
  medium: { label: "보통", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "낮음", color: "bg-green-100 text-green-700" },
};

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "초안", color: "bg-gray-100 text-gray-700" },
  sent: { label: "발송됨", color: "bg-blue-100 text-blue-700" },
  approved: { label: "승인", color: "bg-green-100 text-green-700" },
  rejected: { label: "거절", color: "bg-red-100 text-red-700" },
  expired: { label: "만료", color: "bg-gray-100 text-gray-500" },
};

// ─── Format Helpers ───────────────────────────────────────────────────

const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR");
const formatDateTime = (d: string) =>
  new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const formatKRW = (n: number) => n.toLocaleString("ko-KR") + "원";

// ─── Page Component ───────────────────────────────────────────────────

export default function PortalPage() {
  // Customer search & selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Portal links
  const [portalLinks, setPortalLinks] = useState<PortalLink[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Preview
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PortalData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ─── Fetch Customers ──────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers?limit=200");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error("Failed to fetch customers:", e);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ─── Filtered Customers ───────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [customers, customerSearch]);

  // ─── Generate Portal Link ─────────────────────────────────────────

  const handleGenerateLink = async () => {
    if (!selectedCustomer) return;
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/portal?customerId=${selectedCustomer.id}`);
      if (res.ok) {
        const data: PortalLink = await res.json();
        // Add to links list if not already there
        setPortalLinks((prev) => {
          const exists = prev.find((l) => l.token === data.token);
          if (exists) return prev;
          return [data, ...prev];
        });
      }
    } catch (e) {
      console.error("Failed to generate portal link:", e);
    } finally {
      setGeneratingLink(false);
    }
  };

  // ─── Copy Portal URL ──────────────────────────────────────────────

  const handleCopyUrl = async (token: string, portalUrl: string) => {
    const fullUrl = `${window.location.origin}${portalUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = fullUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  // ─── Preview Portal Data ──────────────────────────────────────────

  const handlePreview = async (token: string) => {
    if (previewToken === token) {
      setPreviewToken(null);
      setPreviewData(null);
      return;
    }
    setPreviewToken(token);
    setLoadingPreview(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/portal/${token}`);
      if (res.ok) {
        const data: PortalData = await res.json();
        setPreviewData(data);
      } else {
        const err = await res.json();
        setPreviewError(err.error || "데이터를 불러올 수 없습니다");
      }
    } catch {
      setPreviewError("서버 연결에 실패했습니다");
    } finally {
      setLoadingPreview(false);
    }
  };

  // ─── Check Link Status ────────────────────────────────────────────

  const getLinkStatus = (expiresAt: string) => {
    const now = new Date();
    const exp = new Date(expiresAt);
    if (exp <= now) return { label: "만료", color: "bg-red-100 text-red-700" };
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    if (daysLeft <= 1) return { label: "곧 만료", color: "bg-amber-100 text-amber-700" };
    return { label: "활성", color: "bg-green-100 text-green-700" };
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Globe className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">고객 포탈</h1>
              <p className="text-sm text-gray-500 mt-0.5">고객별 포탈 액세스 링크 생성 및 관리</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── Customer Search & Select ──────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-600" />
            고객 선택
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="고객명, 회사명, 이메일, 전화번호로 검색..."
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateLink}
              disabled={!selectedCustomer || generatingLink}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {generatingLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              포탈 링크 생성
            </button>
          </div>

          {/* Selected customer indicator */}
          {selectedCustomer && (
            <div className="mt-3 flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-cyan-200 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-cyan-700" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</span>
                {selectedCustomer.company && (
                  <span className="text-xs text-gray-500 ml-2">{selectedCustomer.company}</span>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 hover:bg-cyan-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* Customer list */}
          {!selectedCustomer && (
            <div className="mt-3 border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  {customerSearch ? "검색 결과가 없습니다" : "등록된 고객이 없습니다"}
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch("");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        {c.company && (
                          <span className="text-xs text-gray-400">{c.company}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ─── Generated Portal Links ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-600" />
            생성된 포탈 링크
            {portalLinks.length > 0 && (
              <span className="text-xs font-normal text-gray-400 ml-1">({portalLinks.length}건)</span>
            )}
          </h2>

          {portalLinks.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">생성된 포탈 링크가 없습니다</p>
              <p className="text-xs text-gray-300 mt-1">고객을 선택하고 링크를 생성해 보세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {portalLinks.map((link) => {
                const status = getLinkStatus(link.expiresAt);
                const isPreviewOpen = previewToken === link.token;
                return (
                  <div key={link.token} className="border border-gray-100 rounded-xl overflow-hidden">
                    {/* Link row */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Customer info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{link.customer.name}</span>
                            {link.customer.company && (
                              <span className="text-xs text-gray-400">{link.customer.company}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>만료: {formatDateTime(link.expiresAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Portal URL */}
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 min-w-0">
                        <code className="text-xs text-gray-600 truncate max-w-[260px]">
                          /portal/view/{link.token.slice(0, 8)}...
                        </code>
                        <button
                          onClick={() => handleCopyUrl(link.token, link.portalUrl)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
                          title="URL 복사"
                        >
                          {copiedToken === link.token ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          )}
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handlePreview(link.token)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                            isPreviewOpen
                              ? "bg-cyan-100 text-cyan-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          미리보기
                          <ChevronDown className={`w-3 h-3 transition-transform ${isPreviewOpen ? "rotate-180" : ""}`} />
                        </button>
                        <a
                          href={link.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          title="새 탭에서 열기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Preview panel */}
                    {isPreviewOpen && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                        {loadingPreview ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                            <span className="ml-2 text-sm text-gray-500">포탈 데이터 로딩 중...</span>
                          </div>
                        ) : previewError ? (
                          <div className="flex items-center justify-center py-12 text-sm text-red-500">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {previewError}
                          </div>
                        ) : previewData ? (
                          <PortalPreview data={previewData} />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Portal Preview Component ─────────────────────────────────────────

function PortalPreview({ data }: { data: PortalData }) {
  return (
    <div className="space-y-5">
      {/* Preview header */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Eye className="w-3.5 h-3.5" />
        고객이 보게 될 포탈 화면 미리보기
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-600" />
          고객 정보
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-gray-400">이름</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{data.customer.name}</p>
          </div>
          {data.customer.company && (
            <div>
              <span className="text-xs text-gray-400">회사</span>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{data.customer.company}</p>
            </div>
          )}
          {data.customer.email && (
            <div>
              <span className="text-xs text-gray-400">이메일</span>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{data.customer.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-600" />
          최근 주문
          <span className="text-xs font-normal text-gray-400">({data.recentOrders.length})</span>
        </h3>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">주문 내역이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">주문번호</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">제품명</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">금액</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">상태</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">날짜</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => {
                  const st = ORDER_STATUS[order.status] || { label: order.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 px-2 font-mono text-xs text-gray-600">{order.orderNumber}</td>
                      <td className="py-2.5 px-2 text-gray-900">{order.productName}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-gray-700">{formatKRW(order.totalPrice)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-gray-500">{formatDate(order.orderDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Contracts */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-violet-600" />
          활성 계약
          <span className="text-xs font-normal text-gray-400">({data.activeContracts.length})</span>
        </h3>
        {data.activeContracts.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">활성 계약이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {data.activeContracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{contract.title}</span>
                    <span className="text-xs text-gray-400">{contract.contractNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{CONTRACT_TYPE[contract.type] || contract.type}</span>
                    <span>{formatDate(contract.startDate)} ~ {formatDate(contract.endDate)}</span>
                  </div>
                </div>
                {contract.value > 0 && (
                  <span className="text-sm font-semibold text-gray-700">{formatKRW(contract.value)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Service Tickets */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-600" />
          진행 중 서비스 티켓
          <span className="text-xs font-normal text-gray-400">({data.openTickets.length})</span>
        </h3>
        {data.openTickets.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">진행 중인 서비스 티켓이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {data.openTickets.map((ticket) => {
              const st = TICKET_STATUS[ticket.status] || { label: ticket.status, color: "bg-gray-100 text-gray-700" };
              const pr = TICKET_PRIORITY[ticket.priority] || { label: ticket.priority, color: "bg-gray-100 text-gray-700" };
              return (
                <div key={ticket.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{ticket.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.color}`}>{pr.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="font-mono">{ticket.ticketNumber}</span>
                      <span>접수: {formatDate(ticket.receivedAt || ticket.createdAt)}</span>
                      {ticket.estimatedDays && <span>예상 {ticket.estimatedDays}일</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Quotes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          대기 중 견적
          <span className="text-xs font-normal text-gray-400">({data.pendingQuotes.length})</span>
        </h3>
        {data.pendingQuotes.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">대기 중인 견적이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {data.pendingQuotes.map((quote) => {
              const st = QUOTE_STATUS[quote.status] || { label: quote.status, color: "bg-gray-100 text-gray-700" };
              return (
                <div key={quote.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{quote.title}</span>
                      <span className="text-xs text-gray-400">{quote.quoteNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>생성: {formatDate(quote.createdAt)}</span>
                      {quote.validUntil && <span>유효기한: {formatDate(quote.validUntil)}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">{formatKRW(quote.totalAmount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
