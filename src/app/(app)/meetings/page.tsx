"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Loader2,
  Search,
  RefreshCw,
  X,
  Video,
  User,
  ListChecks,
} from "lucide-react";

interface Meeting {
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
  _count: {
    attendees: number;
    actionItems: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: "예정", color: "text-blue-700", bgColor: "bg-blue-100" },
  in_progress: { label: "진행중", color: "text-green-700", bgColor: "bg-green-100" },
  completed: { label: "완료", color: "text-gray-600", bgColor: "bg-gray-100" },
  cancelled: { label: "취소", color: "text-red-700", bgColor: "bg-red-100" },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: "일반", color: "bg-gray-100 text-gray-700" },
  standup: { label: "스탠드업", color: "bg-blue-100 text-blue-700" },
  review: { label: "리뷰", color: "bg-purple-100 text-purple-700" },
  planning: { label: "기획", color: "bg-green-100 text-green-700" },
  retrospective: { label: "회고", color: "bg-amber-100 text-amber-700" },
};

const TABS = [
  { key: "", label: "전체" },
  { key: "scheduled", label: "예정" },
  { key: "in_progress", label: "진행중" },
  { key: "completed", label: "완료" },
];

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set("status", activeTab);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "50");

      const res = await fetch(`/api/meetings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
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

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">회의 관리</h1>
                <p className="text-[11px] text-gray-400">회의 예약 및 관리</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/meetings/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              회의 예약
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        {/* 탭 필터 */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="회의 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <button
            onClick={fetchMeetings}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 회의 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-400">회의 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Video className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">회의가 없습니다</p>
            <p className="text-gray-400 text-xs">새로운 회의를 예약해 보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((meeting) => {
              const statusInfo = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;
              const typeInfo = TYPE_CONFIG[meeting.type] || TYPE_CONFIG.general;
              const today = isToday(meeting.startTime);

              return (
                <div
                  key={meeting.id}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group ${
                    today
                      ? "border-indigo-200 ring-1 ring-indigo-100"
                      : "border-gray-200"
                  }`}
                >
                  {today && (
                    <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-xl" />
                  )}

                  <div className="p-4">
                    {/* 상단: 타입 + 상태 */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-sm font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-2">
                      {meeting.title}
                    </h3>

                    {/* 날짜/시간 */}
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600">
                        {formatDate(meeting.startTime)}
                      </span>
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600">
                        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                      </span>
                    </div>

                    {/* 장소 */}
                    {meeting.location && (
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 truncate">
                          {meeting.location}
                        </span>
                      </div>
                    )}

                    {/* 설명 */}
                    {meeting.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                        {meeting.description}
                      </p>
                    )}

                    {/* 하단 정보 */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-[11px] text-gray-500">
                          {meeting.organizer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Users className="w-3 h-3" />
                          {meeting._count.attendees}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <ListChecks className="w-3 h-3" />
                          {meeting._count.actionItems}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {getDuration(meeting.startTime, meeting.endTime)}
                        </span>
                      </div>
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
