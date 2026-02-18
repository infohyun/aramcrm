"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ListTodo,
  Plus,
  X,
  Loader2,
  User,
  Calendar,
  Flag,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  Eye,
  AlertCircle,
  Save,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface TaskAssignee {
  id: string;
  name: string;
  avatar: string | null;
}

interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  content: string;
  createdAt: string;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: TaskAssignee | null;
  assigneeId: string | null;
  creator: {
    id: string;
    name: string;
  };
  dueDate: string | null;
  labels: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    comments: number;
  };
  comments?: TaskComment[];
  project?: {
    id: string;
    name: string;
  };
}

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

// ─── Config ───────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: "todo", label: "할일", headerColor: "bg-slate-500", bgColor: "bg-slate-50" },
  { key: "in_progress", label: "진행중", headerColor: "bg-blue-500", bgColor: "bg-blue-50" },
  { key: "review", label: "검토", headerColor: "bg-amber-500", bgColor: "bg-amber-50" },
  { key: "done", label: "완료", headerColor: "bg-emerald-500", bgColor: "bg-emerald-50" },
];

const PRIORITY_CONFIG: Record<string, { label: string; dotColor: string; color: string }> = {
  urgent: { label: "긴급", dotColor: "bg-red-500", color: "text-red-700 bg-red-50 border-red-200" },
  high: { label: "높음", dotColor: "bg-orange-500", color: "text-orange-700 bg-orange-50 border-orange-200" },
  medium: { label: "보통", dotColor: "bg-yellow-500", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  low: { label: "낮음", dotColor: "bg-green-500", color: "text-green-700 bg-green-50 border-green-200" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  todo: [
    { label: "시작", next: "in_progress", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  ],
  in_progress: [
    { label: "검토 요청", next: "review", color: "bg-amber-600 hover:bg-amber-700 text-white" },
    { label: "완료", next: "done", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  ],
  review: [
    { label: "수정 필요", next: "in_progress", color: "bg-blue-600 hover:bg-blue-700 text-white" },
    { label: "승인", next: "done", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  ],
  done: [],
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

const formatDueDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: `${Math.abs(days)}일 초과`, isOverdue: true };
  if (days === 0) return { text: "오늘", isOverdue: false };
  if (days === 1) return { text: "내일", isOverdue: false };
  return { text: `${days}일 남음`, isOverdue: false };
};

// ─── Page Component ───────────────────────────────────────────────────

export default function TasksKanbanPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);

  // Create task form
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("todo");
  const [formPriority, setFormPriority] = useState("medium");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Fetch Tasks ────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();

      if (res.ok) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const [projRes, membersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/members`),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjectName(projData.name);
      }
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.data);
      }
    } catch (error) {
      console.error("Failed to fetch project info:", error);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchProjectInfo();
    }
  }, [projectId, fetchTasks, fetchProjectInfo]);

  // ─── Status Change ──────────────────────────────────────────────

  const handleStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: string) => {
    e.stopPropagation();
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Create Task ────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formTitle.trim()) return;

    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus,
          priority: formPriority,
          assigneeId: formAssigneeId || null,
          dueDate: formDueDate || null,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormStatus("todo");
    setFormPriority("medium");
    setFormAssigneeId("");
    setFormDueDate("");
  };

  // ─── Task Templates ──────────────────────────────────────────────
  const TASK_TEMPLATES = [
    { title: "기획 검토", description: "프로젝트 기획안 검토 및 피드백", priority: "high" },
    { title: "주간 보고", description: "이번 주 진행 상황 및 다음 주 계획 정리", priority: "medium" },
    { title: "고객 미팅 준비", description: "미팅 자료 준비, 아젠다 작성, 참석자 확인", priority: "high" },
    { title: "코드 리뷰", description: "개발 코드 품질 검토 및 개선 사항 제안", priority: "medium" },
    { title: "테스트 수행", description: "QA 테스트 케이스 실행 및 결과 보고", priority: "high" },
    { title: "문서 작성", description: "프로젝트 관련 문서 작성 및 업데이트", priority: "low" },
  ];

  const applyTemplate = (template: { title: string; description: string; priority: string }) => {
    setFormTitle(template.title);
    setFormDescription(template.description);
    setFormPriority(template.priority);
    setShowCreate(true);
  };

  // ─── Task Detail ────────────────────────────────────────────────

  const openTaskDetail = async (taskId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data);
      }
    } catch (error) {
      console.error("Failed to fetch task detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Kanban Card ────────────────────────────────────────────────

  const TaskCard = ({ task }: { task: Task }) => {
    const prioInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const transitions = STATUS_TRANSITIONS[task.status] || [];
    const isUrgent = task.priority === "urgent";

    let dueDateInfo = null;
    if (task.dueDate) {
      dueDateInfo = formatDueDate(task.dueDate);
    }

    return (
      <div
        onClick={() => openTaskDetail(task.id)}
        className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group ${
          isUrgent
            ? "border-red-300 shadow-red-100 shadow-md"
            : "border-gray-200 shadow-sm"
        }`}
      >
        {isUrgent && (
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl" />
        )}

        <div className="p-3.5">
          {/* Priority + Due date */}
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${prioInfo.color}`}>
              {prioInfo.label}
            </span>
            {dueDateInfo && (
              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                dueDateInfo.isOverdue ? "text-red-600" : "text-gray-500"
              }`}>
                <Clock className="w-3 h-3" />
                {dueDateInfo.text}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-[13px] font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors">
            {task.title}
          </h4>

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-indigo-700">
                  {task.assignee.name.charAt(0)}
                </span>
              </div>
              <span className="text-[11px] text-gray-600 font-medium">
                {task.assignee.name}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">
              {formatDate(task.createdAt)}
            </span>
            {task._count.comments > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <MessageSquare className="w-3 h-3" />
                {task._count.comments}
              </span>
            )}
          </div>

          {/* Quick status transition buttons */}
          {transitions.length > 0 && (
            <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={(e) => handleStatusChange(e, task.id, t.next)}
                  disabled={updatingId === task.id}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 ${t.color}`}
                >
                  {updatingId === task.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3 h-3" />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <ListTodo className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">태스크 보드</h1>
                <p className="text-[11px] text-gray-400">{projectName}</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              태스크 추가
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        {/* ─── Task Templates ────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500">빠른 추가:</span>
            {TASK_TEMPLATES.map((tmpl, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(tmpl)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
              >
                {tmpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Kanban Board ────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-400">태스크를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {KANBAN_COLUMNS.map((col) => {
              const columnTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="flex-shrink-0 w-[300px] flex flex-col">
                  {/* Column Header */}
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${col.headerColor}`}>
                    <span className="text-xs font-bold text-white">{col.label}</span>
                    <span className="text-xs font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div className={`flex-1 ${col.bgColor} rounded-b-xl p-2 space-y-2 min-h-[300px]`}>
                    {columnTasks.length === 0 ? (
                      <div className="flex items-center justify-center h-[150px] text-xs text-gray-400">
                        비어있음
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Create Task Modal ──────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">태스크 추가</h2>
                  <p className="text-[11px] text-gray-400">새로운 태스크를 생성합니다</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="태스크 제목을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  설명
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="상세 설명을 입력하세요..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    상태
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {KANBAN_COLUMNS.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    우선순위
                  </label>
                  <div className="flex gap-1.5">
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormPriority(key)}
                        className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          formPriority === key
                            ? `${cfg.color} shadow-sm`
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assignee + Due date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    담당자
                  </label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">미배정</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!formTitle.trim() || formSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                태스크 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Task Detail Modal ──────────────────────────────────────── */}
      {(selectedTask || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : selectedTask ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const prioInfo = PRIORITY_CONFIG[selectedTask.priority] || PRIORITY_CONFIG.medium;
                      return (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${prioInfo.color}`}>
                          {prioInfo.label}
                        </span>
                      );
                    })()}
                    {(() => {
                      const col = KANBAN_COLUMNS.find((c) => c.key === selectedTask.status);
                      return col ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${col.headerColor}`}>
                          {col.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {selectedTask.title}
                  </h2>

                  {selectedTask.description && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description}
                      </p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] text-gray-400 block mb-1">담당자</span>
                      {selectedTask.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-indigo-700">
                              {selectedTask.assignee.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedTask.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">미배정</span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] text-gray-400 block mb-1">마감일</span>
                      {selectedTask.dueDate ? (
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedTask.dueDate).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">미설정</span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] text-gray-400 block mb-1">생성자</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedTask.creator.name}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] text-gray-400 block mb-1">생성일</span>
                      <span className="text-sm text-gray-700">
                        {new Date(selectedTask.createdAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status transition */}
                  {(STATUS_TRANSITIONS[selectedTask.status] || []).length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {(STATUS_TRANSITIONS[selectedTask.status] || []).map((t) => (
                        <button
                          key={t.next}
                          onClick={(e) => {
                            handleStatusChange(e, selectedTask.id, t.next);
                            setSelectedTask(null);
                          }}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm ${t.color}`}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Comments */}
                  {selectedTask.comments && selectedTask.comments.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        댓글 ({selectedTask.comments.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedTask.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-900">
                                  {comment.author.name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatDate(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
