"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Timer,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  Clock,
  Briefcase,
  Users,
  Settings,
  Plane,
  Calendar,
  BarChart3,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  hours: number;
  description: string;
  category: string;
  projectId: string | null;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface TimeStats {
  totalHours: number;
  byCategory: {
    work: number;
    meeting: number;
    admin: number;
    travel: number;
  };
}

interface Project {
  id: string;
  name: string;
}

// ─── Config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Briefcase }
> = {
  work: {
    label: "업무",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: Briefcase,
  },
  meeting: {
    label: "회의",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: Users,
  },
  admin: {
    label: "관리",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: Settings,
  },
  travel: {
    label: "출장",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: Plane,
  },
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getWeekStart = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
};

const getMonthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
};

// ─── Page Component ───────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeStats>({
    totalHours: 0,
    byCategory: { work: 0, meeting: 0, admin: 0, travel: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [formDate, setFormDate] = useState(getToday());
  const [formHours, setFormHours] = useState("1");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("work");
  const [formProjectId, setFormProjectId] = useState("");
  const [creating, setCreating] = useState(false);

  // Projects for select
  const [projects, setProjects] = useState<Project[]>([]);

  // ─── Computed Summary ───────────────────────────────────────────

  const todayHours = entries
    .filter((e) => e.date.slice(0, 10) === getToday())
    .reduce((sum, e) => sum + e.hours, 0);

  const weekStart = getWeekStart();
  const weekHours = entries
    .filter((e) => e.date.slice(0, 10) >= weekStart)
    .reduce((sum, e) => sum + e.hours, 0);

  const monthStart = getMonthStart();
  const monthHours = entries
    .filter((e) => e.date.slice(0, 10) >= monthStart)
    .reduce((sum, e) => sum + e.hours, 0);

  // ─── Fetch Entries ──────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("mine", "true");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/time-entries?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ─── Create Entry ───────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formDescription.trim() || !formHours) return;
    setCreating(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          hours: parseFloat(formHours),
          description: formDescription,
          category: formCategory,
          projectId: formProjectId || null,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to create time entry:", error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormDate(getToday());
    setFormHours("1");
    setFormDescription("");
    setFormCategory("work");
    setFormProjectId("");
  };

  // ─── Delete Entry ───────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("이 시간 기록을 삭제하시겠습니까?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error("Failed to delete time entry:", error);
    } finally {
      setDeleting(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-xl shadow-sm">
                <Timer className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  타임 트래킹
                </h1>
                <p className="text-[11px] text-gray-400">
                  업무 시간 기록 및 관리
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-sm font-semibold rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-md shadow-sky-200"
            >
              <Plus className="w-4 h-4" />
              시간 기록
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* ─── Summary Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-sky-50 rounded-lg">
                <Clock className="w-4 h-4 text-sky-500" />
              </div>
              <span className="text-xs font-medium text-gray-500">오늘</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {todayHours.toFixed(1)}
              <span className="text-sm font-normal text-gray-400 ml-1">
                시간
              </span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-xs font-medium text-gray-500">이번 주</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {weekHours.toFixed(1)}
              <span className="text-sm font-normal text-gray-400 ml-1">
                시간
              </span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-gray-500">이번 달</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {monthHours.toFixed(1)}
              <span className="text-sm font-normal text-gray-400 ml-1">
                시간
              </span>
            </p>
          </div>
        </div>

        {/* ─── Category Breakdown ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            카테고리별 시간
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const hours =
                stats.byCategory[key as keyof typeof stats.byCategory] || 0;
              const Icon = config.icon;
              const percentage =
                stats.totalHours > 0
                  ? Math.round((hours / stats.totalHours) * 100)
                  : 0;

              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">{config.label}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {hours.toFixed(1)}
                      <span className="text-[10px] font-normal text-gray-400 ml-1">
                        시간 ({percentage}%)
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Date Filter ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2">
            <Calendar className="w-4 h-4 text-gray-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm text-gray-700 border-none focus:outline-none bg-transparent"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm text-gray-700 border-none focus:outline-none bg-transparent"
            />
          </div>

          <button
            onClick={fetchEntries}
            className="p-2 rounded-xl hover:bg-white border border-gray-200 bg-white transition-colors"
            title="새로고침"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`}
            />
          </button>

          <div className="flex-1" />

          <span className="text-xs text-gray-400">
            총 {stats.totalHours.toFixed(1)}시간 / {entries.length}건
          </span>
        </div>

        {/* ─── Time Entry List ────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-sm text-gray-400">
                시간 기록을 불러오는 중...
              </p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Timer className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">
              시간 기록이 없습니다
            </p>
            <p className="text-gray-400 text-xs">
              새로운 시간 기록을 추가해 보세요
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {entries.map((entry) => {
                const catConfig =
                  CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.work;
                const CatIcon = catConfig.icon;

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Date */}
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(entry.date)}
                      </p>
                    </div>

                    {/* Hours */}
                    <div className="w-20 shrink-0 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-sm font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {entry.hours}h
                      </span>
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {entry.description}
                      </p>
                      {entry.project && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {entry.project.name}
                        </p>
                      )}
                    </div>

                    {/* Category Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${catConfig.bgColor} ${catConfig.color}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      {catConfig.label}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="삭제"
                    >
                      {deleting === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Create Modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                시간 기록 추가
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {/* Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시간
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="예: 2.5"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                  placeholder="수행한 업무를 간단히 설명해 주세요"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트{" "}
                  <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">프로젝트 없음</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !formDescription.trim() || !formHours}
                className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-200"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "추가"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
