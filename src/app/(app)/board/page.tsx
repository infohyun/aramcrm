"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  MessageSquare,
  Pin,
  Calendar,
  User,
  Megaphone,
  Building2,
  PartyPopper,
  RefreshCw,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Author {
  id: string;
  name: string;
  department: string | null;
  avatar: string | null;
}

interface Post {
  id: string;
  authorId: string;
  author: Author;
  category: string;
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  viewCount: number;
  priority: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    comments: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  total: number;
  notice: number;
  general: number;
  department: number;
  event: number;
}

// ─── Config Objects ───────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  notice: {
    label: "공지",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <Megaphone className="w-3 h-3" />,
  },
  general: {
    label: "일반",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <FileText className="w-3 h-3" />,
  },
  department: {
    label: "부서별",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Building2 className="w-3 h-3" />,
  },
  event: {
    label: "이벤트",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <PartyPopper className="w-3 h-3" />,
  },
};

const TABS = [
  { key: "", label: "전체" },
  { key: "notice", label: "공지" },
  { key: "general", label: "일반" },
  { key: "department", label: "부서별" },
  { key: "event", label: "이벤트" },
];

// ─── Format Helpers ───────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 0 ? "방금 전" : `${minutes}분 전`;
    }
    return `${hours}시간 전`;
  }
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ─── Page Component ───────────────────────────────────────────────────

export default function BoardPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    notice: 0,
    general: 0,
    department: 0,
    event: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [activeTab, setActiveTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // ─── Fetch Posts ────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (activeTab) params.set("category", activeTab);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/board?${params}`);
      const data = await res.json();

      if (res.ok) {
        setPosts(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ─── Tab Count ──────────────────────────────────────────────────

  const getTabCount = (key: string): number => {
    if (key === "") return stats.total;
    return stats[key as keyof Stats] || 0;
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">게시판</h1>
                <p className="text-[11px] text-gray-400">공지사항 및 사내 소통</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/board/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              글쓰기
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5">
        {/* ─── Tabs ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-gray-200 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {getTabCount(tab.key)}
              </span>
            </button>
          ))}

          {/* Search */}
          <div className="flex-1 ml-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 내용, 작성자 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            onClick={() => fetchPosts()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ─── Posts List ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-400">게시글을 불러오는 중...</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">게시글이 없습니다</p>
            <p className="text-gray-400 text-xs">첫 번째 게시글을 작성해 보세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => {
              const catInfo = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG.general;

              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/board/${post.id}`)}
                  className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md group ${
                    post.isPinned
                      ? "border-indigo-200 bg-indigo-50/30 shadow-sm"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Pin indicator */}
                    {post.isPinned && (
                      <div className="shrink-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Pin className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                      </div>
                    )}

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catInfo.color}`}
                        >
                          {catInfo.icon}
                          {catInfo.label}
                        </span>
                        {post.isPinned && (
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                            고정
                          </span>
                        )}
                        {post.priority === "urgent" && (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded animate-pulse">
                            긴급
                          </span>
                        )}
                        {post.priority === "important" && (
                          <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                            중요
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                        {post.title}
                      </h3>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {post.author.name}
                        </span>
                        {post.author.department && (
                          <span className="text-xs text-gray-400">
                            {post.author.department}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side info */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Comment count */}
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post._count.comments}</span>
                      </div>

                      {/* View count */}
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{post.viewCount}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-400 min-w-[70px] justify-end">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ─── Pagination ──────────────────────────────────────── */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">
                  총 {pagination.total}건 중{" "}
                  {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}건
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page: pageNum }))
                        }
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          pagination.page === pageNum
                            ? "bg-indigo-600 text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
