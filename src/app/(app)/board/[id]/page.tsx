"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Eye,
  Calendar,
  User,
  MessageSquare,
  Send,
  Loader2,
  Pin,
  Megaphone,
  Building2,
  PartyPopper,
  Trash2,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Author {
  id: string;
  name: string;
  department: string | null;
  avatar: string | null;
  position?: string | null;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: Author;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

// ─── Config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  notice: {
    label: "공지",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <Megaphone className="w-3.5 h-3.5" />,
  },
  general: {
    label: "일반",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  department: {
    label: "부서별",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Building2 className="w-3.5 h-3.5" />,
  },
  event: {
    label: "이벤트",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <PartyPopper className="w-3.5 h-3.5" />,
  },
};

const formatDateFull = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (dateStr: string) => {
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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Page Component ───────────────────────────────────────────────────

export default function BoardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Post ─────────────────────────────────────────────────

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/board/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      } else {
        router.push("/board");
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId, fetchPost]);

  // ─── Submit Comment ──────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/board/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setPost((prev) =>
          prev
            ? { ...prev, comments: [...prev.comments, newComment] }
            : prev
        );
        setCommentText("");
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // ─── Delete Post ────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/board/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/board");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">게시글을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const catInfo = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG.general;

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/board")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              목록으로
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Post Content ────────────────────────────────────────── */}
        <article className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
          {/* Post Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${catInfo.color}`}
              >
                {catInfo.icon}
                {catInfo.label}
              </span>
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                  <Pin className="w-3 h-3" />
                  고정
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {post.author.name}
                    </span>
                    {post.author.position && (
                      <span className="text-xs text-gray-400">
                        {post.author.position}
                      </span>
                    )}
                  </div>
                  {post.author.department && (
                    <span className="text-xs text-gray-400">
                      {post.author.department}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateFull(post.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {post.viewCount}
                </span>
              </div>
            </div>
          </div>

          {/* Post Body */}
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>
        </article>

        {/* ─── Comments Section ────────────────────────────────────── */}
        <div className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            {/* Comments Header */}
            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/60 border-b border-gray-200">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">
                댓글
              </h2>
              <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                {post.comments.length}
              </span>
            </div>

            {/* Comments List */}
            <div className="divide-y divide-gray-100">
              {post.comments.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
                  </p>
                </div>
              ) : (
                post.comments.map((comment) => (
                  <div key={comment.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {comment.author.name}
                          </span>
                          {comment.author.department && (
                            <span className="text-xs text-gray-400">
                              {comment.author.department}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDateShort(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSubmitComment();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">
                      Ctrl + Enter로 등록
                    </span>
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || submittingComment}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      댓글 등록
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
