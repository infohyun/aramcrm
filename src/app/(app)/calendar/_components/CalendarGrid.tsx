"use client";

import { useMemo } from "react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color: string | null;
}

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  selectedDate: string | null;
  onDateClick: (dateStr: string) => void;
}

// ─── Config ─────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  schedule: "bg-blue-400",
  meeting: "bg-purple-400",
  deadline: "bg-red-400",
  holiday: "bg-green-400",
  personal: "bg-gray-400",
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// ─── Helpers ─────────────────────────────────────────────────────────

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const isToday = (date: Date) => isSameDay(date, new Date());

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ─── Component ──────────────────────────────────────────────────────

export default function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onDateClick,
}: CalendarGridProps) {
  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding (fill to 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Map events to dates
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      const endNorm = new Date(end);
      endNorm.setHours(23, 59, 59, 999);

      while (current <= endNorm) {
        const key = toDateStr(current);
        if (!map[key]) map[key] = [];
        map[key].push(event);
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((day, i) => (
          <div
            key={day}
            className={`text-center text-[11px] font-semibold py-2 ${
              i === 0
                ? "text-red-400"
                : i === 6
                ? "text-blue-400"
                : "text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t border-l border-gray-200">
        {calendarDays.map((day, index) => {
          const dateStr = toDateStr(day.date);
          const dayEvents = eventsByDate[dateStr] || [];
          const isSelected = selectedDate === dateStr;
          const isTodayDate = isToday(day.date);
          const dayOfWeek = day.date.getDay();
          const hasHoliday = dayEvents.some((e) => e.type === "holiday");

          return (
            <div
              key={index}
              onClick={() => onDateClick(dateStr)}
              className={`min-h-[90px] sm:min-h-[110px] border-r border-b border-gray-200 p-1.5 cursor-pointer transition-colors ${
                day.isCurrentMonth
                  ? isSelected
                    ? "bg-indigo-50"
                    : "bg-white hover:bg-gray-50"
                  : "bg-gray-50/50"
              }`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium leading-none ${
                    !day.isCurrentMonth
                      ? "text-gray-300"
                      : isTodayDate
                      ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      : hasHoliday || dayOfWeek === 0
                      ? "text-red-500 font-bold"
                      : dayOfWeek === 6
                      ? "text-blue-500"
                      : "text-gray-700"
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {dayEvents.length > 3 && day.isCurrentMonth && (
                  <span className="text-[9px] text-gray-400 font-medium">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* Event indicators */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const eventColor =
                    event.color || EVENT_COLORS[event.type] || "bg-blue-400";
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate ${
                        day.isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-400"
                      }`}
                      title={event.title}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${eventColor}`}
                      />
                      <span className="truncate">{event.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
