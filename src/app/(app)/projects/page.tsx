"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Search,
  Loader2,
  Users,
  ListTodo,
  Calendar,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
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
  };
  startDate: string | null;
  endDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    tasks: number;
  };
  members: ProjectMember[];
}

interface Stats {
  total: number;
  planning: number;
  active: number;
  onHold: number;
  completed: number;
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

const TABS = [
  { key: "", label: "전체" },
  { key: "planning", label: "기획중" },
  { key: "active", label: "진행중" },
  { key: "on_hold", label: "보류" },
  { key: "completed", label: "완료" },
];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

// ─── Page Component ───────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    planning: 0,
    active: 0,
    onHold: 0,
    completed: 0,
  });
  const [activeTab, setActiveTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // ─── Fetch Projects ────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set("status", activeTab);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();

      if (res.ok) {
        setProjects(data.data);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ─── Tab Count ──────────────────────────────────────────────────

  const getTabCount = (key: string): number => {
    if (key === "") return stats.total;
    if (key === "on_hold") return stats.onHold;
    return stats[key as keyof Stats] || 0;
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">프로젝트</h1>
                <p className="text-[11px] text-gray-400">프로젝트 관리 및 협업</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/projects/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              새 프로젝트
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {/* ─── Filters ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
          </div>

          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={() => fetchProjects()}
            className="p-2 rounded-lg hover:bg-white border border-gray-200 transition-colors"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ─── Projects Grid ──────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-400">프로젝트를 불러오는 중...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <FolderKanban className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">프로젝트가 없습니다</p>
            <p className="text-gray-400 text-xs">새로운 프로젝트를 생성해 보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const statusInfo = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
              const prioInfo = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.medium;

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="bg-white rounded-xl border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group overflow-hidden"
                >
                  {/* Status bar at top */}
                  <div
                    className={`h-1 ${
                      project.status === "active"
                        ? "bg-emerald-500"
                        : project.status === "planning"
                        ? "bg-blue-500"
                        : project.status === "on_hold"
                        ? "bg-amber-500"
                        : project.status === "completed"
                        ? "bg-gray-400"
                        : "bg-red-500"
                    }`}
                  />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${prioInfo.dotColor}`} />
                          {prioInfo.label}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-gray-500">진행률</span>
                        <span className="text-[10px] font-bold text-gray-700">{project.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            project.progress >= 100
                              ? "bg-emerald-500"
                              : project.progress >= 60
                              ? "bg-indigo-500"
                              : project.progress >= 30
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }`}
                          style={{ width: `${Math.min(project.progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                        <Calendar className="w-3 h-3" />
                        {project.startDate && formatDate(project.startDate)}
                        {project.startDate && project.endDate && " ~ "}
                        {project.endDate && formatDate(project.endDate)}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {/* Member avatars */}
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-1.5">
                          {project.members.slice(0, 4).map((member) => (
                            <div
                              key={member.id}
                              className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center"
                              title={member.user.name}
                            >
                              <span className="text-[8px] font-bold text-indigo-700">
                                {member.user.name.charAt(0)}
                              </span>
                            </div>
                          ))}
                          {project._count.members > 4 && (
                            <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                              <span className="text-[8px] font-bold text-gray-500">
                                +{project._count.members - 4}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 ml-1">
                          <Users className="w-3 h-3 inline" /> {project._count.members}
                        </span>
                      </div>

                      {/* Task count */}
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <ListTodo className="w-3 h-3" />
                        {project._count.tasks} 태스크
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
