"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Loader2,
  BookOpen,
  Eye,
  Edit3,
  Tag,
} from "lucide-react";
import MarkdownRenderer from "../_components/MarkdownRenderer";

interface WikiPageOption {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
}

export default function NewWikiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editSlug = searchParams.get("edit");
  const isEdit = !!editSlug;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [parentId, setParentId] = useState("");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pages, setPages] = useState<WikiPageOption[]>([]);
  const [loadingPage, setLoadingPage] = useState(false);

  // 기존 페이지 목록 (부모 선택용)
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch("/api/wiki?limit=100");
        if (res.ok) {
          const data = await res.json();
          setPages(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch pages:", error);
      }
    };
    fetchPages();
  }, []);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!editSlug) return;

    setLoadingPage(true);
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/wiki/${editSlug}`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title);
          setSlug(data.slug);
          setContent(data.content);
          setParentId(data.parentId || "");
          setTags(data.tags || "");
        }
      } catch (error) {
        console.error("Failed to fetch page:", error);
      } finally {
        setLoadingPage(false);
      }
    };
    fetchPage();
  }, [editSlug]);

  // 제목에서 slug 자동 생성 (새로 만들 때만)
  useEffect(() => {
    if (isEdit) return;
    const generated = title
      .toLowerCase()
      .replace(/[^\w\s가-힣-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);
    setSlug(generated || "");
  }, [title, isEdit]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/wiki/${editSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            parentId: parentId || null,
            tags: tags || null,
          }),
        });

        if (res.ok) {
          router.push(`/wiki/${editSlug}`);
        }
      } else {
        const res = await fetch("/api/wiki", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            parentId: parentId || null,
            tags: tags || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          router.push(`/wiki/${data.slug}`);
        }
      }
    } catch (error) {
      console.error("Failed to save wiki page:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {isEdit ? "페이지 수정" : "새 페이지"}
                  </h1>
                  <p className="text-[11px] text-gray-400">
                    마크다운으로 작성합니다
                  </p>
                </div>
              </div>
            </div>

            {/* 미리보기 토글 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setPreview(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  !preview
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                편집
              </button>
              <button
                onClick={() => setPreview(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  preview
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                미리보기
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 space-y-5">
            {/* 제목 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="페이지 제목을 입력하세요"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Slug (읽기 전용 표시) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Slug (URL)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">/wiki/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={isEdit}
                  placeholder="auto-generated"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* 상위 페이지 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                상위 페이지
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">없음 (최상위)</option>
                {pages
                  .filter((p) => p.slug !== editSlug)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* 내용 편집 / 미리보기 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                내용 <span className="text-red-500">*</span>
              </label>

              {preview ? (
                <div className="border border-gray-200 rounded-xl p-6 min-h-[400px] bg-white">
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-gray-400 text-sm">내용을 입력하면 미리보기가 표시됩니다.</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"# 제목\n\n본문 내용을 마크다운으로 작성하세요.\n\n## 소제목\n\n- 목록 항목 1\n- 목록 항목 2\n\n**굵은 글씨**, *기울임꼴*\n\n```\n코드 블록\n```"}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              )}
            </div>

            {/* 태그 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Tag className="w-3.5 h-3.5" />
                태그
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="쉼표로 구분 (예: 가이드, 온보딩, 프로세스)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isEdit ? "수정 저장" : "페이지 생성"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
