"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, FileText, BookOpen } from "lucide-react";

interface WikiPageItem {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
}

interface WikiSidebarProps {
  pages: WikiPageItem[];
  activeSlug?: string;
}

export default function WikiSidebar({ pages, activeSlug }: WikiSidebarProps) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const rootPages = pages.filter((p) => !p.parentId);

  const getChildren = (parentId: string) => {
    return pages.filter((p) => p.parentId === parentId);
  };

  const renderPage = (page: WikiPageItem, depth: number = 0) => {
    const children = getChildren(page.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(page.id);
    const isActive = page.slug === activeSlug;

    return (
      <div key={page.id}>
        <button
          onClick={() => {
            router.push(`/wiki/${page.slug}`);
            if (hasChildren) toggleExpand(page.id);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            isActive
              ? "bg-indigo-50 text-indigo-700 font-semibold"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(page.id);
              }}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <FileText className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-500" : "text-gray-400"}`} />
          <span className="truncate flex-1 text-left">{page.title}</span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderPage(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {/* 위키 홈 */}
      <button
        onClick={() => router.push("/wiki")}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          !activeSlug
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <span className="w-3.5 shrink-0" />
        <BookOpen className={`w-4 h-4 shrink-0 ${!activeSlug ? "text-indigo-500" : "text-gray-400"}`} />
        <span className="flex-1 text-left">위키 홈</span>
      </button>

      {rootPages.map((page) => renderPage(page))}

      {pages.length === 0 && (
        <div className="text-center py-6">
          <BookOpen className="w-6 h-6 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">아직 페이지가 없습니다</p>
        </div>
      )}
    </div>
  );
}
