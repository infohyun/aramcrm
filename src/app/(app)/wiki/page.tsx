"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  X,
  RefreshCw,
  FileText,
  User,
  Calendar,
  Clock,
  Tag,
} from "lucide-react";
import WikiSidebar from "./_components/WikiSidebar";

interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  parentId: string | null;
  tags: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    versions: number;
  };
}

export default function WikiHomePage() {
  const router = useRouter();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "100");

      const res = await fetch(`/api/wiki?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch wiki pages:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return `${Math.floor(days / 30)}개월 전`;
  };

  const getExcerpt = (content: string, maxLen: number = 120) => {
    const plainText = content
      .replace(/#{1,3}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[-*]\s/gm, "")
      .replace(/^\d+\.\s/gm, "")
      .replace(/^>\s/gm, "")
      .replace(/\n/g, " ")
      .trim();

    return plainText.length > maxLen
      ? plainText.substring(0, maxLen) + "..."
      : plainText;
  };

  // 최근 수정된 페이지 (updatedAt 기준 정렬)
  const recentPages = [...pages].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">위키</h1>
                <p className="text-[11px] text-gray-400">지식 베이스 및 문서 허브</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/wiki/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              새 페이지
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex gap-5">
          {/* 좌측 사이드바: 페이지 트리 */}
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-24">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                페이지 목록
              </h3>
              <WikiSidebar pages={pages} />
            </div>
          </div>

          {/* 우측 메인 */}
          <div className="flex-1 min-w-0">
            {/* 검색 */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="위키 페이지 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button
                onClick={fetchPages}
                className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* 최근 수정 페이지 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-sm text-gray-400">페이지를 불러오는 중...</p>
                </div>
              </div>
            ) : pages.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-1">
                  {searchQuery ? "검색 결과가 없습니다" : "아직 위키 페이지가 없습니다"}
                </p>
                <p className="text-gray-400 text-xs">
                  {searchQuery
                    ? "다른 키워드로 검색해 보세요"
                    : "첫 번째 위키 페이지를 작성해 보세요"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push("/wiki/new")}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    새 페이지 만들기
                  </button>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  최근 수정된 페이지
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentPages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => router.push(`/wiki/${page.slug}`)}
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                    >
                      <div className="p-4">
                        {/* 아이콘 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                            <FileText className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {getTimeAgo(page.updatedAt)}
                          </span>
                        </div>

                        {/* 제목 */}
                        <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors line-clamp-1">
                          {page.title}
                        </h3>

                        {/* 미리보기 */}
                        <p className="text-xs text-gray-400 line-clamp-3 mb-3 leading-relaxed">
                          {getExcerpt(page.content)}
                        </p>

                        {/* 태그 */}
                        {page.tags && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {page.tags.split(",").slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 하단 */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-[11px] text-gray-500">
                              {page.author.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            v{page._count.versions}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
