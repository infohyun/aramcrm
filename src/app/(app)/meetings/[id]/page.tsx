"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  Video,
  User,
  CheckCircle2,
  XCircle,
  Clock3,
  Edit3,
  Save,
  X,
} from "lucide-react";
import MinutesEditor from "../_components/MinutesEditor";
import ActionItems from "../_components/ActionItems";

interface Attendee {
  id: string;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface MinuteItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

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

interface MeetingDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  location: string | null;
  startTime: string;
  endTime: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  attendees: Attendee[];
  minutes: MinuteItem[];
  actionItems: ActionItem[];
}

interface UserOption {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: "예정", color: "text-blue-700", bgColor: "bg-blue-100" },
  in_progress: { label: "진행중", color: "text-green-700", bgColor: "bg-green-100" },
  completed: { label: "완료", color: "text-gray-600", bgColor: "bg-gray-100" },
  cancelled: { label: "취소", color: "text-red-700", bgColor: "bg-red-100" },
};

const TYPE_CONFIG: Record<string, string> = {
  general: "일반 회의",
  standup: "스탠드업",
  review: "리뷰",
  planning: "기획 회의",
  retrospective: "회고",
};

const ATTENDEE_STATUS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "대기", icon: <Clock3 className="w-3.5 h-3.5" />, color: "text-gray-500" },
  accepted: { label: "수락", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-600" },
  declined: { label: "거절", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-500" },
};

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchMeeting = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMeeting(data);
        setNewStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch meeting:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      if (res.ok) {
        const data = await res.json();
        setUsers(
          (data.data || data.users || []).map((u: { id: string; name: string }) => ({
            id: u.id,
            name: u.name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);

  useEffect(() => {
    fetchMeeting();
    fetchUsers();
  }, [fetchMeeting, fetchUsers]);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === meeting?.status) {
      setEditingStatus(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchMeeting();
        setEditingStatus(false);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveMinutes = async (content: string) => {
    const res = await fetch(`/api/meetings/${id}/minutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      fetchMeeting();
    }
  };

  const handleAddAction = async (
    title: string,
    assigneeId: string,
    dueDate: string | null
  ) => {
    const res = await fetch(`/api/meetings/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assigneeId, dueDate }),
    });

    if (res.ok) {
      fetchMeeting();
    }
  };

  const handleToggleAction = async (actionItemId: string, status: string) => {
    const res = await fetch(`/api/meetings/${id}/actions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionItemId, status }),
    });

    if (res.ok) {
      fetchMeeting();
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 60) return `${mins}분`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}시간 ${remaining}분` : `${hours}시간`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">회의 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Video className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">회의를 찾을 수 없습니다</p>
          <button
            onClick={() => router.push("/meetings")}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/meetings")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{meeting.title}</h1>
                  <p className="text-[11px] text-gray-400">
                    {TYPE_CONFIG[meeting.type] || "일반 회의"}
                  </p>
                </div>
              </div>
            </div>

            {/* 상태 변경 */}
            <div className="flex items-center gap-2">
              {editingStatus ? (
                <div className="flex items-center gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="scheduled">예정</option>
                    <option value="in_progress">진행중</option>
                    <option value="completed">완료</option>
                    <option value="cancelled">취소</option>
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={updatingStatus}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    {updatingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingStatus(false);
                      setNewStatus(meeting.status);
                    }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingStatus(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}
                >
                  {statusInfo.label}
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 회의 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">날짜</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDateTime(meeting.startTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">시간</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                  <span className="text-xs text-gray-400 ml-1">
                    ({getDuration(meeting.startTime, meeting.endTime)})
                  </span>
                </p>
              </div>
            </div>

            {meeting.location && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">장소</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {meeting.location}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <User className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">주최자</p>
                <p className="text-sm font-semibold text-gray-900">
                  {meeting.organizer.name}
                </p>
              </div>
            </div>
          </div>

          {meeting.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {meeting.description}
              </p>
            </div>
          )}
        </div>

        {/* 참석자 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900">
              참석자
              <span className="ml-1 text-xs text-gray-400 font-normal">
                ({meeting.attendees.length})
              </span>
            </h3>
          </div>
          <div className="p-4">
            {meeting.attendees.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                참석자가 없습니다
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {meeting.attendees.map((attendee) => {
                  const aStatus =
                    ATTENDEE_STATUS[attendee.status] || ATTENDEE_STATUS.pending;
                  return (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attendee.user.name}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {attendee.user.email}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${aStatus.color}`}>
                        {aStatus.icon}
                        {aStatus.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 회의록 + 액션 아이템 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MinutesEditor
            meetingId={meeting.id}
            minutes={meeting.minutes}
            onSave={handleSaveMinutes}
          />

          <ActionItems
            meetingId={meeting.id}
            actionItems={meeting.actionItems}
            users={users}
            onAdd={handleAddAction}
            onToggleStatus={handleToggleAction}
          />
        </div>
      </div>
    </div>
  );
}
