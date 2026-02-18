"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Loader2,
  User,
  Calendar,
  ListChecks,
  PlayCircle,
} from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface UserOption {
  id: string;
  name: string;
}

interface ActionItemsProps {
  meetingId: string;
  actionItems: ActionItem[];
  users: UserOption[];
  onAdd: (title: string, assigneeId: string, dueDate: string | null) => Promise<void>;
  onToggleStatus: (actionItemId: string, newStatus: string) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "대기",
    color: "text-gray-500",
    icon: <Circle className="w-4 h-4" />,
  },
  in_progress: {
    label: "진행중",
    color: "text-blue-600",
    icon: <PlayCircle className="w-4 h-4" />,
  },
  done: {
    label: "완료",
    color: "text-green-600",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export default function ActionItems({
  meetingId,
  actionItems,
  users,
  onAdd,
  onToggleStatus,
}: ActionItemsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newAssigneeId) return;

    setAdding(true);
    try {
      await onAdd(newTitle.trim(), newAssigneeId, newDueDate || null);
      setNewTitle("");
      setNewAssigneeId("");
      setNewDueDate("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add action item:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: ActionItem) => {
    const nextStatusMap: Record<string, string> = {
      pending: "in_progress",
      in_progress: "done",
      done: "pending",
    };
    const nextStatus = nextStatusMap[item.status] || "pending";

    setTogglingId(item.id);
    try {
      await onToggleStatus(item.id, nextStatus);
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900">
            액션 아이템
            <span className="ml-1 text-xs text-gray-400 font-normal">
              ({actionItems.length})
            </span>
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          추가
        </button>
      </div>

      <div className="p-4 space-y-2">
        {/* 추가 폼 */}
        {showAddForm && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3 mb-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="할 일 입력..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">담당자 선택</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewAssigneeId("");
                  setNewDueDate("");
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || !newAssigneeId || adding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                추가
              </button>
            </div>
          </div>
        )}

        {/* 아이템 목록 */}
        {actionItems.length === 0 && !showAddForm ? (
          <div className="text-center py-8">
            <ListChecks className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">아직 액션 아이템이 없습니다</p>
          </div>
        ) : (
          actionItems.map((item) => {
            const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const overdue =
              item.status !== "done" && isOverdue(item.dueDate);

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  item.status === "done"
                    ? "bg-gray-50 border-gray-100"
                    : overdue
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200 hover:shadow-sm"
                }`}
              >
                <button
                  onClick={() => handleToggle(item)}
                  disabled={togglingId === item.id}
                  className={`shrink-0 transition-colors ${statusInfo.color} hover:opacity-70`}
                  title={`상태: ${statusInfo.label}`}
                >
                  {togglingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    statusInfo.icon
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      item.status === "done"
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {item.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <User className="w-3 h-3" />
                      {item.assignee.name}
                    </span>
                    {item.dueDate && (
                      <span
                        className={`flex items-center gap-1 text-[11px] ${
                          overdue ? "text-red-500 font-medium" : "text-gray-400"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.dueDate)}
                        {overdue && " (기한 초과)"}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status === "done"
                      ? "bg-green-100 text-green-700"
                      : item.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {statusInfo.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
