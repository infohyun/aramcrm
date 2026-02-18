"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  FolderKanban,
  Users,
  ListTodo,
  Calendar,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  Plus,
  User,
  UserPlus,
  X,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    department: string | null;
    position: string | null;
  };
}

interface TaskStats {
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  total: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
    department: string | null;
    position: string | null;
  };
  startDate: string | null;
  endDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  _count: {
    tasks: number;
    members: number;
  };
  taskStats: TaskStats;
  calculatedProgress: number;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  planning: { label: "기획중", color: "text-blue-700", bgColor: "bg-blue-100" },
  active: { label: "진행중", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  on_hold: { label: "보류", color: "text-amber-700", bgColor: "bg-amber-100" },
  completed: { label: "완료", color: "text-gray-700", bgColor: "bg-gray-100" },
  cancelled: { label: "취소", color: "text-red-700", bgColor: "bg-red-100" },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string }> = {
  urgent: { label: "긴급", dotColor: "bg-red-500" },
  high: { label: "높음", dotColor: "bg-orange-500" },
  medium: { label: "보통", dotColor: "bg-yellow-500" },
  low: { label: "낮음", dotColor: "bg-green-500" },
};

const TASK_STATUS_CONFIG = [
  { key: "todo", label: "할일", color: "bg-slate-500", textColor: "text-slate-700" },
  { key: "in_progress", label: "진행중", color: "bg-blue-500", textColor: "text-blue-700" },
  { key: "review", label: "검토", color: "bg-amber-500", textColor: "text-amber-700" },
  { key: "done", label: "완료", color: "bg-emerald-500", textColor: "text-emerald-700" },
];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const MEMBER_ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  owner: { label: "소유자", color: "bg-indigo-100 text-indigo-700" },
  admin: { label: "관리자", color: "bg-purple-100 text-purple-700" },
  member: { label: "멤버", color: "bg-gray-100 text-gray-700" },
  viewer: { label: "뷰어", color: "bg-gray-100 text-gray-500" },
};

// ─── Page Component ───────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserItem[]>([]);
  const [addingMember, setAddingMember] = useState(false);

  // ─── Fetch Project ──────────────────────────────────────────────

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        router.push("/projects");
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId, fetchProject]);

  // ─── User Search for adding member ──────────────────────────────

  useEffect(() => {
    if (userSearch.length < 1) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(userSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setUserResults(data.data || []);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // ─── Add Member ──────────────────────────────────────────────────

  const handleAddMember = async (userId: string) => {
    setAddingMember(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "member" }),
      });

      if (res.ok) {
        setShowAddMember(false);
        setUserSearch("");
        fetchProject();
      } else {
        const data = await res.json();
        alert(data.error || "멤버 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
    } finally {
      setAddingMember(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FolderKanban className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const prioInfo = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.medium;
  const progress = project.calculatedProgress;

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => router.push("/projects")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            프로젝트 목록
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${prioInfo.dotColor}`} />
                  {prioInfo.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                {(project.startDate || project.endDate) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {project.startDate && formatDate(project.startDate)}
                    {project.startDate && project.endDate && " ~ "}
                    {project.endDate && formatDate(project.endDate)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {project.owner.name}
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push(`/projects/${projectId}/tasks`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <ListTodo className="w-4 h-4" />
              태스크 보기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ─── Progress Bar ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">전체 진행률</h3>
            <span className="text-lg font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progress >= 100
                  ? "bg-emerald-500"
                  : progress >= 60
                  ? "bg-indigo-500"
                  : progress >= 30
                  ? "bg-blue-500"
                  : "bg-gray-400"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* ─── Task Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {TASK_STATUS_CONFIG.map((cfg) => {
            const count = project.taskStats[cfg.key as keyof TaskStats] || 0;
            return (
              <div
                key={cfg.key}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                  <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
                </div>
                <p className={`text-2xl font-bold ${cfg.textColor}`}>{count}</p>
                {project.taskStats.total > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {Math.round((count / project.taskStats.total) * 100)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Members Section ────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50/60 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-semibold text-gray-900">
                    멤버
                  </h2>
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                    {project.members.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  멤버 추가
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {project.members.map((member) => {
                  const roleInfo = MEMBER_ROLE_CONFIG[member.role] || MEMBER_ROLE_CONFIG.member;
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-700">
                          {member.user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {member.user.name}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.user.department && (
                            <span className="text-xs text-gray-400">{member.user.department}</span>
                          )}
                          {member.user.position && (
                            <span className="text-xs text-gray-400">{member.user.position}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Quick Info ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">프로젝트 정보</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">상태</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">우선순위</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                    <span className={`w-2 h-2 rounded-full ${prioInfo.dotColor}`} />
                    {prioInfo.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">전체 태스크</span>
                  <span className="text-xs font-semibold text-gray-700">{project.taskStats.total}개</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">멤버 수</span>
                  <span className="text-xs font-semibold text-gray-700">{project._count.members}명</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">생성일</span>
                  <span className="text-xs text-gray-700">{formatDate(project.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Quick link to tasks */}
            <button
              onClick={() => router.push(`/projects/${projectId}/tasks`)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5 hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <ListTodo className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                      태스크 칸반보드
                    </h3>
                    <p className="text-xs text-gray-400">
                      태스크를 관리하세요
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Add Member Modal ─────────────────────────────────────── */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">멤버 추가</h2>
              </div>
              <button
                onClick={() => { setShowAddMember(false); setUserSearch(""); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <input
                type="text"
                placeholder="이름 또는 이메일로 검색..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="mt-3 max-h-[300px] overflow-y-auto space-y-1">
                {userResults.length === 0 && userSearch.length > 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">
                    검색 결과가 없습니다.
                  </p>
                )}
                {userResults.map((user) => {
                  const isAlreadyMember = project.members.some(
                    (m) => m.userId === user.id
                  );
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isAlreadyMember
                          ? "bg-gray-50 opacity-50"
                          : "hover:bg-indigo-50 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!isAlreadyMember) {
                          handleAddMember(user.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      {isAlreadyMember ? (
                        <span className="text-xs text-gray-400">이미 멤버</span>
                      ) : (
                        <Plus className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
