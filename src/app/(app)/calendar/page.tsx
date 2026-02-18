"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  X,
  Clock,
  MapPin,
  User,
  RefreshCw,
  Trash2,
} from "lucide-react";
import CalendarGrid from "./_components/CalendarGrid";
import EventCard from "./_components/EventCard";
import CreateEventModal from "./_components/CreateEventModal";
import { getHolidayEvents } from "@/lib/holidays";

// ─── Interfaces ───────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  color: string | null;
  creator: {
    id: string;
    name: string;
    department: string | null;
  };
  attendees: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      department: string | null;
    };
    status: string;
  }>;
}

// ─── Config ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const TYPE_CONFIG: Record<string, { label: string; dotColor: string }> = {
  schedule: { label: "일정", dotColor: "bg-blue-400" },
  meeting: { label: "회의", dotColor: "bg-purple-400" },
  deadline: { label: "마감", dotColor: "bg-red-400" },
  holiday: { label: "휴일", dotColor: "bg-green-400" },
  personal: { label: "개인", dotColor: "bg-gray-400" },
};

// ─── Helpers ─────────────────────────────────────────────────────────

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDateKr = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Page Component ─────────────────────────────────────────────────

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateStr(now)
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch Events ────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Get range: from first visible day to last visible day
      const firstDay = new Date(year, month, 1);
      const startOffset = firstDay.getDay();
      const rangeStart = new Date(year, month, 1 - startOffset);
      const rangeEnd = new Date(year, month + 1, 0);
      rangeEnd.setDate(rangeEnd.getDate() + (42 - rangeEnd.getDate() - startOffset));

      const params = new URLSearchParams({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });

      const res = await fetch(`/api/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        const apiEvents = data.data || [];
        // 공휴일 이벤트 병합 (한국, 미국, 프랑스)
        const holidayEvents = getHolidayEvents(year, month);
        setEvents([...holidayEvents, ...apiEvents]);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ─── Navigation ─────────────────────────────────────────────────

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(toDateStr(today));
  };

  // ─── Selected date events ──────────────────────────────────────

  const selectedDateEvents = selectedDate
    ? events.filter((event) => {
        const start = new Date(event.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(event.endDate);
        end.setHours(23, 59, 59, 999);
        const sel = new Date(selectedDate);
        return sel >= start && sel <= end;
      })
    : [];

  // ─── Delete Event ──────────────────────────────────────────────

  const handleDelete = async (eventId: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/calendar/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    } finally {
      setDeletingId(null);
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
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  공유 캘린더
                </h1>
                <p className="text-[11px] text-gray-400">
                  일정 · 회의 · 마감 · 휴일
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              일정 추가
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* ─── 캘린더 영역 ─────────────────────────────────────── */}
          <div className="flex-1">
            {/* Month navigation */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={goToPrevMonth}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 min-w-[140px] text-center">
                    {year}년 {MONTH_NAMES[month]}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    오늘
                  </button>
                  <button
                    onClick={() => fetchEvents()}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="새로고침"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-gray-400 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 px-5 py-2 border-b border-gray-100 bg-gray-50/50">
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${config.dotColor}`}
                    />
                    <span className="text-[10px] text-gray-500 font-medium">
                      {config.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="p-2">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <p className="text-sm text-gray-400">
                        일정을 불러오는 중...
                      </p>
                    </div>
                  </div>
                ) : (
                  <CalendarGrid
                    year={year}
                    month={month}
                    events={events}
                    selectedDate={selectedDate}
                    onDateClick={(dateStr) => setSelectedDate(dateStr)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ─── 사이드 패널: 선택한 날짜의 일정 ───────────────── */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 sticky top-[80px]">
              {/* Date header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {selectedDate
                      ? formatDateKr(selectedDate)
                      : "날짜를 선택하세요"}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {selectedDateEvents.length > 0
                      ? `${selectedDateEvents.length}개의 일정`
                      : "일정 없음"}
                  </p>
                </div>
                {selectedDate && (
                  <button
                    onClick={() => {
                      setShowCreateModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    title="이 날짜에 일정 추가"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" />
                  </button>
                )}
              </div>

              {/* Events list */}
              <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-10">
                    <CalendarIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      이 날짜에 일정이 없습니다
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      일정 추가
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateEvents.map((event) => {
                      const isHoliday = event.id.startsWith("holiday-");
                      return (
                        <div key={event.id} className="relative group">
                          <EventCard event={event} />
                          {!isHoliday && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(event.id);
                              }}
                              disabled={deletingId === event.id}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                              title="삭제"
                            >
                              {deletingId === event.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                              ) : (
                                <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Create Event Modal ──────────────────────────────────── */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchEvents()}
        initialDate={selectedDate}
      />
    </div>
  );
}
