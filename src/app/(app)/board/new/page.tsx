"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Save,
  Loader2,
  Megaphone,
  Building2,
  PartyPopper,
  Pin,
} from "lucide-react";
import MarkdownToolbar from "@/components/MarkdownToolbar";

// ─── Config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "notice", label: "공지", icon: <Megaphone className="w-4 h-4" />, color: "border-red-300 text-red-700 bg-red-50" },
  { key: "general", label: "일반", icon: <FileText className="w-4 h-4" />, color: "border-blue-300 text-blue-700 bg-blue-50" },
  { key: "department", label: "부서별", icon: <Building2 className="w-4 h-4" />, color: "border-purple-300 text-purple-700 bg-purple-50" },
  { key: "event", label: "이벤트", icon: <PartyPopper className="w-4 h-4" />, color: "border-amber-300 text-amber-700 bg-amber-50" },
];

// ─── Page Component ───────────────────────────────────────────────────

export default function NewPostPage() {
  const router = useRouter();

  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
          isPinned,
          priority,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "게시글 작성에 실패했습니다.");
      }

      router.push("/board");
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/board")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">글쓰기</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                새 게시글을 작성합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Category Selection */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/60 border-b border-gray-200">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">카테고리</h2>
            </div>
            <div className="p-6">
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      category === cat.key
                        ? `${cat.color} shadow-sm ring-1 ring-current/20`
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Priority */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">우선순위</label>
                <div className="flex gap-2">
                  {[
                    { key: "normal", label: "일반", color: "border-gray-300 text-gray-600 bg-gray-50" },
                    { key: "important", label: "중요", color: "border-orange-300 text-orange-700 bg-orange-50" },
                    { key: "urgent", label: "긴급", color: "border-red-300 text-red-700 bg-red-50" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPriority(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        priority === p.key
                          ? `${p.color} ring-1 ring-current/20 shadow-sm`
                          : "border-gray-200 text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pin option */}
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <Pin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    상단 고정
                  </span>
                </label>
                <span className="text-xs text-gray-400">
                  게시글을 목록 상단에 고정합니다
                </span>
              </div>
            </div>
          </section>

          {/* Title */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="게시글 제목을 입력하세요"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </section>

          {/* Content */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 <span className="text-red-500">*</span>
              </label>
              <MarkdownToolbar textareaRef={contentRef} value={content} onChange={setContent} />
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="게시글 내용을 입력하세요... (마크다운 지원)"
                rows={16}
                className="w-full px-4 py-3 border border-gray-200 rounded-b-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>
          </section>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.push("/board")}
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {submitting ? "등록 중..." : "게시글 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
