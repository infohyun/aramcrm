"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  ArrowLeft,
  Plus,
  X,
  Search,
  Loader2,
  User,
  GripVertical,
  Palmtree,
  DollarSign,
  Plane,
  Briefcase,
  FileText,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface UserOption {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
}

// ─── Config ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  {
    key: "leave",
    label: "휴가",
    icon: <Palmtree className="w-4 h-4" />,
    color: "bg-green-50 border-green-200 text-green-700",
    activeColor: "bg-green-100 border-green-400 text-green-800 shadow-sm",
  },
  {
    key: "purchase",
    label: "구매",
    icon: <DollarSign className="w-4 h-4" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    activeColor: "bg-blue-100 border-blue-400 text-blue-800 shadow-sm",
  },
  {
    key: "travel",
    label: "출장",
    icon: <Plane className="w-4 h-4" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    activeColor: "bg-purple-100 border-purple-400 text-purple-800 shadow-sm",
  },
  {
    key: "expense",
    label: "경비",
    icon: <Briefcase className="w-4 h-4" />,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    activeColor: "bg-orange-100 border-orange-400 text-orange-800 shadow-sm",
  },
  {
    key: "general",
    label: "일반",
    icon: <FileText className="w-4 h-4" />,
    color: "bg-gray-50 border-gray-200 text-gray-700",
    activeColor: "bg-gray-100 border-gray-400 text-gray-800 shadow-sm",
  },
];

// ─── Page Component ─────────────────────────────────────────────────

export default function NewApprovalPage() {
  const router = useRouter();

  // Form state
  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Approver selection
  const [approvers, setApprovers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ─── User Search ────────────────────────────────────────────────

  useEffect(() => {
    if (userSearch.length < 1) {
      setUserResults([]);
      return;
    }
    setLoadingUsers(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users?search=${encodeURIComponent(userSearch)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          const users = (data.data || data || []).filter(
            (u: UserOption) => !approvers.some((a) => a.id === u.id)
          );
          setUserResults(users);
        }
      } catch {
        // ignore
      } finally {
        setLoadingUsers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, approvers]);

  // ─── Add/Remove Approver ───────────────────────────────────────

  const addApprover = (user: UserOption) => {
    if (!approvers.some((a) => a.id === user.id)) {
      setApprovers([...approvers, user]);
    }
    setUserSearch("");
    setUserResults([]);
    setShowUserDropdown(false);
  };

  const removeApprover = (userId: string) => {
    setApprovers(approvers.filter((a) => a.id !== userId));
  };

  const moveApprover = (index: number, direction: "up" | "down") => {
    const newApprovers = [...approvers];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newApprovers.length) return;
    [newApprovers[index], newApprovers[targetIndex]] = [
      newApprovers[targetIndex],
      newApprovers[index],
    ];
    setApprovers(newApprovers);
  };

  // ─── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || approvers.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          content: content.trim(),
          steps: approvers.map((a) => ({ approverId: a.id })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/approvals/${data.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "결재 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to create approval:", error);
      alert("결재 요청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/approvals")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                목록
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
                  <FileCheck className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-base font-bold text-gray-900">
                  결재 요청
                </h1>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={
                !title.trim() ||
                !content.trim() ||
                approvers.length === 0 ||
                submitting
              }
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              제출하기
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ─── 결재 유형 ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            결재 유형
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setType(opt.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  type === opt.key ? opt.activeColor : opt.color
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── 제목 ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="결재 제목을 입력하세요"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* ─── 내용 ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="결재 내용을 상세히 작성하세요..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
          />
        </div>

        {/* ─── 결재자 지정 ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            결재선 <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-4">
            결재자를 순서대로 추가하세요. 위에서 아래로 순서대로 결재가
            진행됩니다.
          </p>

          {/* Added approvers */}
          {approvers.length > 0 && (
            <div className="space-y-2 mb-4">
              {approvers.map((approver, index) => (
                <div
                  key={approver.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 group"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveApprover(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <GripVertical className="w-3 h-3 text-gray-400 rotate-180" />
                    </button>
                    <button
                      onClick={() => moveApprover(index, "down")}
                      disabled={index === approvers.length - 1}
                      className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {approver.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {approver.position && `${approver.position} `}
                      {approver.department && `/ ${approver.department}`}
                      {!approver.position &&
                        !approver.department &&
                        approver.email}
                    </p>
                  </div>

                  <span className="text-[10px] font-medium text-gray-400">
                    {index + 1}단계
                  </span>

                  <button
                    onClick={() => removeApprover(approver.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* User search */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="결재자 이름으로 검색..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {loadingUsers && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {showUserDropdown && userResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {userResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addApprover(user)}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">
                          {user.name}
                        </span>
                        {user.position && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            {user.position}
                          </span>
                        )}
                        {user.department && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            / {user.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Submit button (mobile) ─────────────────────────────── */}
        <div className="sm:hidden">
          <button
            onClick={handleSubmit}
            disabled={
              !title.trim() ||
              !content.trim() ||
              approvers.length === 0 ||
              submitting
            }
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            결재 요청하기
          </button>
        </div>
      </div>
    </div>
  );
}
