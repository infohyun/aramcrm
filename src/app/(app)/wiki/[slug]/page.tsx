"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Loader2,
  User,
  Calendar,
  Clock,
  Tag,
  History,
  Trash2,
  ChevronDown,
} from "lucide-react";
import WikiSidebar from "../_components/WikiSidebar";
import MarkdownRenderer from "../_components/MarkdownRenderer";

interface WikiVersion {
  id: string;
  version: number;
  content: string;
  changelog: string | null;
  createdAt: string;
}

interface WikiPageDetail {
  id: string;
  slug: string;
  title: string;
  content: string;
  parentId: string | null;
  tags: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  versions: WikiVersion[];
}

interface WikiPageListItem {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
}

export default function WikiPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [allPages, setAllPages] = useState<WikiPageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WikiVersion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPage = useCallback(async () => {
    try {
      const res = await fetch(`/api/wiki/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPage(data);
      }
    } catch (error) {
      console.error("Failed to fetch wiki page:", error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchAllPages = useCallback(async () => {
    try {
      const res = await fetch("/api/wiki?limit=100");
      if (res.ok) {
        const data = await res.json();
        setAllPages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setSelectedVersion(null);
    fetchPage();
    fetchAllPages();
  }, [fetchPage, fetchAllPages]);

  const handleDelete = async () => {
    if (!confirm("정말 이 페이지를 삭제하시겠습니까?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/wiki/${slug}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/wiki");
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">페이지를 찾을 수 없습니다</p>
          <button
            onClick={() => router.push("/wiki")}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
          >
            위키 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const displayContent = selectedVersion ? selectedVersion.content : page.content;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/wiki")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{page.title}</h1>
                  <p className="text-[11px] text-gray-400">/wiki/{page.slug}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                삭제
              </button>
              <button
                onClick={() => router.push(`/wiki/new?edit=${slug}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
              >
                <Edit3 className="w-4 h-4" />
                수정
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex gap-5">
          {/* 좌측 사이드바 */}
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-24">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                페이지 목록
              </h3>
              <WikiSidebar pages={allPages} activeSlug={slug} />
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 페이지 메타 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    {page.author.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  작성: {formatDate(page.createdAt)}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  수정: {formatDate(page.updatedAt)}
                </div>

                {/* 버전 히스토리 드롭다운 */}
                {page.versions.length > 0 && (
                  <div className="relative ml-auto">
                    <button
                      onClick={() => setShowVersions(!showVersions)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      버전 {page.versions.length}
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showVersions && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedVersion(null);
                            setShowVersions(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors border-b border-gray-50 ${
                            !selectedVersion ? "bg-indigo-50 font-semibold" : ""
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="text-gray-900">현재 버전</span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(page.updatedAt)}
                            </span>
                          </div>
                        </button>
                        {page.versions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSelectedVersion(v);
                              setShowVersions(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors border-b border-gray-50 ${
                              selectedVersion?.id === v.id
                                ? "bg-indigo-50 font-semibold"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between">
                              <span className="text-gray-900">v{v.version}</span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(v.createdAt)}
                              </span>
                            </div>
                            {v.changelog && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {v.changelog}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 태그 */}
              {page.tags && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  {page.tags.split(",").map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
                    >
                      <Tag className="w-3 h-3" />
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* 이전 버전 보기 알림 */}
              {selectedVersion && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-amber-700">
                    v{selectedVersion.version} 버전을 보고 있습니다
                    {selectedVersion.changelog && ` - ${selectedVersion.changelog}`}
                  </span>
                  <button
                    onClick={() => setSelectedVersion(null)}
                    className="text-xs text-amber-600 hover:text-amber-800 underline"
                  >
                    현재 버전으로 돌아가기
                  </button>
                </div>
              )}
            </div>

            {/* 콘텐츠 */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <MarkdownRenderer content={displayContent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
