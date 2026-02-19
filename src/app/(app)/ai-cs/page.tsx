"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bot,
  Send,
  Plus,
  Loader2,
  MessageCircle,
  Clock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpCircle,
  X,
  ChevronRight,
  Search,
  Smile,
  Meh,
  Frown,
  Angry,
  Zap,
  Activity,
  Star,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface ConversationItem {
  id: string;
  status: string;
  language: string;
  sentiment: string | null;
  priority: string;
  category: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: { content: string; role: string; createdAt: string } | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  agentId: string | null;
  agentName: string | null;
  createdAt: string;
  metadata: string | null;
}

interface SentimentResult {
  sentiment: string;
  urgency: string;
  priority: string;
  confidence: number;
  keywords: string[];
}

// ─── Config ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "진행 중", color: "bg-emerald-100 text-emerald-700", icon: Activity },
  resolved: { label: "해결됨", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  escalated: { label: "에스컬레이션", color: "bg-red-100 text-red-700", icon: ArrowUpCircle },
  closed: { label: "종료", color: "bg-gray-100 text-gray-500", icon: X },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  positive: { label: "긍정", color: "text-emerald-600", icon: Smile },
  neutral: { label: "보통", color: "text-gray-500", icon: Meh },
  negative: { label: "부정", color: "text-amber-600", icon: Frown },
  angry: { label: "분노", color: "text-red-600", icon: Angry },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string }> = {
  low: { label: "낮음", dotColor: "bg-green-400" },
  medium: { label: "보통", dotColor: "bg-yellow-400" },
  high: { label: "높음", dotColor: "bg-orange-500" },
  urgent: { label: "긴급", dotColor: "bg-red-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  faq: "FAQ",
  error: "에러",
  hardware: "하드웨어",
  policy: "정책/보상",
  ticket: "서비스요청",
  general: "일반",
};

const AGENT_COLORS: Record<string, string> = {
  "team-1": "bg-violet-100 text-violet-700",
  "team-2": "bg-pink-100 text-pink-700",
  "team-3": "bg-sky-100 text-sky-700",
  "team-4": "bg-orange-100 text-orange-700",
  "team-5": "bg-teal-100 text-teal-700",
  "team-6": "bg-indigo-100 text-indigo-700",
  "team-7": "bg-amber-100 text-amber-700",
  "team-8": "bg-emerald-100 text-emerald-700",
  "team-9": "bg-cyan-100 text-cyan-700",
  "team-10": "bg-rose-100 text-rose-700",
};

// ─── Helper ─────────────────────────────────────────────────

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
};

// ─── Component ──────────────────────────────────────────────

export default function AICSPage() {
  // State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentSentiment, setCurrentSentiment] = useState<SentimentResult | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Fetch conversations ────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus) params.set("status", filterStatus);
      params.set("limit", "50");

      const res = await fetch(`/api/ai/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setListLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Fetch messages ─────────────────────────────────────
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}`);
      if (res.ok) {
        const json = await res.json();
        const conv = json.data || json;
        setMessages(conv.messages || []);
        if (conv.sentiment) {
          setCurrentSentiment({ sentiment: conv.sentiment, urgency: 'medium', priority: conv.priority || 'medium', confidence: 0.8, keywords: [] });
        }
        setCurrentCategory(conv.category || null);
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Select conversation ────────────────────────────────
  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setChatLoading(true);
      setMessages([]);
      setCurrentSentiment(null);
      await fetchMessages(id);
      setChatLoading(false);
    },
    [fetchMessages]
  );

  // ─── New conversation ──────────────────────────────────
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentSentiment(null);
    setCurrentCategory(null);
    inputRef.current?.focus();
  };

  // ─── Send message ──────────────────────────────────────
  const handleSend = async () => {
    const content = inputMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setInputMessage("");

    // 낙관적 UI 업데이트
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      agentId: null,
      agentName: null,
      createdAt: new Date().toISOString(),
      metadata: null,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId: activeConversationId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // 새 대화인 경우 대화 ID 설정
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }

        // AI 응답 추가
        const aiMsg: ChatMessage = {
          id: data.message.id,
          role: "assistant",
          content: data.message.content,
          agentId: data.message.agentId || null,
          agentName: data.message.agentName || null,
          createdAt: data.message.createdAt,
          metadata: data.message.metadata ? JSON.stringify(data.message.metadata) : null,
        };

        setMessages((prev) => {
          // temp 메시지를 실제 메시지로 교체하고 AI 응답 추가
          const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
          // 실제 유저 메시지가 서버에서 오지 않으므로 temp를 유지하되 id를 교체
          const userMsg = prev.find((m) => m.id.startsWith("temp-"));
          return [...withoutTemp, ...(userMsg ? [{ ...userMsg, id: `sent-${Date.now()}` }] : []), aiMsg];
        });

        // 감정/카테고리 업데이트
        if (data.sentiment) setCurrentSentiment(data.sentiment);
        if (data.category) setCurrentCategory(data.category);

        fetchConversations();
      } else {
        // 에러 시 temp 메시지 제거
        setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    } finally {
      setSending(false);
    }
  };

  // ─── Delete conversation ────────────────────────────────
  const handleDeleteConversation = async (id: string) => {
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        fetchConversations();
      }
    } catch {
      // ignore
    }
  };

  // ─── Submit feedback ────────────────────────────────────
  const handleSubmitFeedback = async () => {
    if (!activeConversationId || feedbackRating === 0) return;
    try {
      await fetch(`/api/ai/conversations/${activeConversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: { rating: feedbackRating, comment: feedbackComment },
        }),
      });
      setShowFeedback(false);
      setFeedbackRating(0);
      setFeedbackComment("");
    } catch {
      // ignore
    }
  };

  // ─── Scroll to bottom ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Keyboard handler ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Active conversation info ──────────────────────────
  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI 고객지원</h1>
            <p className="text-xs text-gray-500">
              멀티 에이전트 AI CS 시스템
            </p>
          </div>
        </div>
        <button
          onClick={handleNewConversation}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-md shadow-violet-200"
        >
          <Plus className="w-4 h-4" />
          새 대화
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden bg-gray-50">
        {/* Left Panel: Conversation List */}
        <div className="w-[320px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Search & Filter */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="대화 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex gap-1">
              {[
                { value: "", label: "전체" },
                { value: "active", label: "진행중" },
                { value: "escalated", label: "에스컬" },
                { value: "resolved", label: "해결" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                    filterStatus === opt.value
                      ? "bg-violet-100 text-violet-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">대화가 없습니다</p>
                <p className="text-xs text-gray-400 mt-1">새 대화를 시작해보세요</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const statusInfo = STATUS_CONFIG[conv.status] || STATUS_CONFIG.active;
                const sentimentInfo = conv.sentiment ? SENTIMENT_CONFIG[conv.sentiment] : null;
                const priorityInfo = PRIORITY_CONFIG[conv.priority] || PRIORITY_CONFIG.medium;
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`px-3 py-3 border-b border-gray-50 cursor-pointer transition-colors group ${
                      isActive
                        ? "bg-violet-50 border-l-2 border-l-violet-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${priorityInfo.dotColor}`} />
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {conv.category && (
                            <span className="text-[10px] text-gray-400">
                              {CATEGORY_LABELS[conv.category] || conv.category}
                            </span>
                          )}
                          {sentimentInfo && (
                            <sentimentInfo.icon className={`w-3 h-3 ${sentimentInfo.color}`} />
                          )}
                        </div>
                        <p className="text-xs text-gray-800 font-medium truncate">
                          {conv.lastMessage?.content || conv.summary || "새 대화"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(conv.updatedAt)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {conv.messageCount}건
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversationId || messages.length > 0 ? (
            <>
              {/* Chat Header */}
              {activeConv && (
                <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-violet-100 rounded-lg">
                      <Bot className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          AI 상담
                        </h3>
                        {currentCategory && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                            {CATEGORY_LABELS[currentCategory] || currentCategory}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {currentSentiment && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${
                            SENTIMENT_CONFIG[currentSentiment.sentiment]?.color || "text-gray-500"
                          }`}>
                            {(() => {
                              const SI = SENTIMENT_CONFIG[currentSentiment.sentiment];
                              return SI ? <SI.icon className="w-3 h-3" /> : null;
                            })()}
                            {SENTIMENT_CONFIG[currentSentiment.sentiment]?.label || currentSentiment.sentiment}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          STATUS_CONFIG[activeConv.status]?.color || "bg-gray-100 text-gray-500"
                        }`}>
                          {STATUS_CONFIG[activeConv.status]?.label || activeConv.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFeedback(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" />
                      피드백
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {chatLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                      <span className="text-xs text-gray-400">대화를 불러오는 중...</span>
                    </div>
                  </div>
                ) : messages.length === 0 && !activeConversationId ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Bot className="w-8 h-8 text-violet-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        AI 고객지원에 오신 것을 환영합니다
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        10개의 전문 AI 에이전트가 고객 문의를 분석하고 최적의 답변을 제공합니다.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-left">
                        {[
                          { icon: "🌐", label: "다국어 지원", desc: "자동 언어 감지 및 번역" },
                          { icon: "🔍", label: "FAQ 자동 검색", desc: "관련 FAQ 기반 답변" },
                          { icon: "🔧", label: "기술 진단", desc: "에러 분석 및 제품 진단" },
                          { icon: "📋", label: "자동 티켓 생성", desc: "필요 시 서비스 티켓 자동 생성" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-gray-100">
                            <span className="text-lg">{item.icon}</span>
                            <div>
                              <p className="text-xs font-medium text-gray-700">{item.label}</p>
                              <p className="text-[10px] text-gray-400">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            msg.role === "user"
                              ? "bg-violet-600 text-white rounded-2xl rounded-br-md"
                              : "bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm"
                          }`}
                        >
                          {/* Agent badge */}
                          {msg.role === "assistant" && msg.agentName && (
                            <div className="px-4 pt-3 pb-0">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                AGENT_COLORS[msg.agentId || ""] || "bg-gray-100 text-gray-600"
                              }`}>
                                <Bot className="w-3 h-3" />
                                {msg.agentName}
                              </span>
                            </div>
                          )}

                          {/* Content */}
                          <div className={`px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                            msg.role === "user" ? "text-white" : "text-gray-800"
                          }`}>
                            {msg.content}
                          </div>

                          {/* Timestamp */}
                          <div className={`px-4 pb-2 text-[10px] ${
                            msg.role === "user" ? "text-white/60" : "text-gray-400"
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {sending && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-xs text-gray-400">AI가 분석 중...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 px-5 py-3 flex-shrink-0">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="고객 문의를 입력하세요... (Shift+Enter: 줄바꿈)"
                      rows={1}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white resize-none max-h-32"
                      style={{ minHeight: "44px" }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || sending}
                    className="p-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-200"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* No conversation selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  AI 고객지원에 오신 것을 환영합니다
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  왼쪽에서 대화를 선택하거나 새 대화를 시작하세요.
                </p>
                <button
                  onClick={handleNewConversation}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-md shadow-violet-200"
                >
                  <Plus className="w-4 h-4" />
                  새 대화 시작
                </button>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-2 gap-2 text-left">
                  {[
                    { icon: "🌐", label: "다국어 지원", desc: "자동 언어 감지 및 번역" },
                    { icon: "🔍", label: "FAQ 자동 검색", desc: "관련 FAQ 기반 답변" },
                    { icon: "🔧", label: "기술 진단", desc: "에러 분석 및 제품 진단" },
                    { icon: "📋", label: "자동 티켓 생성", desc: "필요 시 서비스 티켓 자동 생성" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2 p-3 bg-white rounded-xl border border-gray-100">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-700">{item.label}</p>
                        <p className="text-[10px] text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <Star className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">대화 평가</h2>
              </div>
              <button
                onClick={() => setShowFeedback(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  만족도
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFeedbackRating(n)}
                      className={`p-2 rounded-xl transition-all ${
                        feedbackRating >= n
                          ? "text-yellow-500 scale-110"
                          : "text-gray-300 hover:text-yellow-300"
                      }`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  의견 (선택)
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="개선 의견을 남겨주세요..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowFeedback(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={feedbackRating === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
