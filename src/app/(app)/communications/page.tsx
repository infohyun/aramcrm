"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  MessageSquare,
  Phone,
  Users,
  Send,
  X,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface Communication {
  id: string;
  customerId: string;
  customer: Customer;
  user: { id: string; name: string };
  type: string;
  direction: string;
  subject: string | null;
  content: string;
  status: string;
  sentAt: string | null;
  trackingId: string | null;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_TABS = [
  { key: "all", label: "전체", icon: Users },
  { key: "email", label: "이메일", icon: Mail },
  { key: "sms", label: "문자", icon: MessageSquare },
  { key: "kakao", label: "카카오톡", icon: MessageCircle },
  { key: "phone", label: "전화", icon: Phone },
  { key: "meeting", label: "미팅", icon: Video },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "임시저장", color: "bg-gray-100 text-gray-700", icon: FileText },
  sent: { label: "발송", color: "bg-blue-100 text-blue-700", icon: Send },
  delivered: { label: "전달됨", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  read: { label: "읽음", color: "bg-emerald-100 text-emerald-700", icon: Eye },
  failed: { label: "실패", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const TYPE_LABELS: Record<string, string> = {
  email: "이메일",
  sms: "문자",
  kakao: "카카오톡",
  phone: "전화",
  meeting: "미팅",
  other: "기타",
};

function getTypeIcon(type: string) {
  switch (type) {
    case "email":
      return Mail;
    case "sms":
      return MessageSquare;
    case "kakao":
      return MessageCircle;
    case "phone":
      return Phone;
    case "meeting":
      return Video;
    default:
      return FileText;
  }
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  // Compose form state
  const [composeType, setComposeType] = useState("email");
  const [composeCustomerId, setComposeCustomerId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeContent, setComposeContent] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  // Customer search for compose
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Email templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const fetchCommunications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (activeTab !== "all") params.set("type", activeTab);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/communications?${params}`);
      const data = await res.json();

      if (res.ok) {
        setCommunications(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch communications:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  // Search customers for compose modal
  useEffect(() => {
    if (customerSearch.length < 1) {
      setCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data.data || []);
        }
      } catch {
        // Ignore search errors
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Fetch email templates
  useEffect(() => {
    if (composeType === "email") {
      fetch("/api/email-templates")
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((data) => setTemplates(data.data || []))
        .catch(() => setTemplates([]));
    }
  }, [composeType]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setComposeSubject(template.subject);
      setComposeContent(template.content);
    }
  };

  const handleSend = async () => {
    if (!composeCustomerId || !composeContent) return;

    setComposeSending(true);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: composeCustomerId,
          userId: "system", // In real app, get from session
          type: composeType,
          direction: "outbound",
          subject: composeSubject || null,
          content: composeContent,
        }),
      });

      if (res.ok) {
        setShowCompose(false);
        resetComposeForm();
        fetchCommunications();
      }
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setComposeSending(false);
    }
  };

  const resetComposeForm = () => {
    setComposeType("email");
    setComposeCustomerId("");
    setComposeSubject("");
    setComposeContent("");
    setSelectedCustomer(null);
    setCustomerSearch("");
    setSelectedTemplate("");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">커뮤니케이션</h1>
                <p className="text-sm text-gray-500">고객과의 모든 소통 내역</p>
              </div>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              새 메시지
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab filters */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-2xl p-1 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-gray-100 overflow-x-auto">
          {TYPE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="고객명, 제목, 내용으로 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Communication list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">커뮤니케이션 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {communications.map((comm) => {
              const TypeIcon = getTypeIcon(comm.type);
              const statusInfo = STATUS_CONFIG[comm.status] || STATUS_CONFIG.sent;
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={comm.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
                      <TypeIcon className="w-5 h-5 text-indigo-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {comm.customer.name}
                        </span>
                        {comm.customer.company && (
                          <span className="text-xs text-gray-400">
                            {comm.customer.company}
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {TYPE_LABELS[comm.type] || comm.type}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>

                      {comm.subject && (
                        <p className="text-sm font-medium text-gray-800 mb-1 truncate">
                          {comm.subject}
                        </p>
                      )}

                      <p className="text-sm text-gray-500 line-clamp-2">
                        {comm.content}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(comm.createdAt)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {comm.direction === "inbound" ? "수신" : "발신"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] px-4 py-3">
            <p className="text-sm text-gray-500">
              총 {pagination.total}건 중 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}건
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Send className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">새 메시지</h2>
              </div>
              <button
                onClick={() => {
                  setShowCompose(false);
                  resetComposeForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Type select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  유형
                </label>
                <div className="flex gap-2">
                  {[
                    { key: "email", label: "이메일", icon: Mail },
                    { key: "sms", label: "문자", icon: MessageSquare },
                    { key: "kakao", label: "카카오톡", icon: MessageCircle },
                    { key: "phone", label: "전화", icon: Phone },
                    { key: "meeting", label: "미팅", icon: Video },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setComposeType(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          composeType === t.key
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  고객 <span className="text-red-500">*</span>
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div>
                      <span className="font-medium text-gray-900">
                        {selectedCustomer.name}
                      </span>
                      {selectedCustomer.company && (
                        <span className="text-sm text-gray-500 ml-2">
                          {selectedCustomer.company}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setComposeCustomerId("");
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
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setComposeCustomerId(customer.id);
                              setShowCustomerDropdown(false);
                              setCustomerSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-gray-900 text-sm">
                              {customer.name}
                            </span>
                            {customer.company && (
                              <span className="text-xs text-gray-500 ml-2">
                                {customer.company}
                              </span>
                            )}
                            {customer.email && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {customer.email}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Email template dropdown */}
              {composeType === "email" && templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    이메일 템플릿
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">템플릿 선택 (선택사항)</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.category ? ` [${t.category}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              {(composeType === "email" || composeType === "kakao") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    제목
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="메시지 제목을 입력하세요"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  placeholder="메시지 내용을 입력하세요..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCompose(false);
                  resetComposeForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={!composeCustomerId || !composeContent || composeSending}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {composeSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
