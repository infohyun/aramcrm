"use client";

import { Clock, MapPin, User } from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface EventCardProps {
  event: {
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
  };
  onClick?: () => void;
}

// ─── Config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  schedule: { label: "일정", color: "text-blue-700 bg-blue-50 border-blue-200", dotColor: "bg-blue-400" },
  meeting: { label: "회의", color: "text-purple-700 bg-purple-50 border-purple-200", dotColor: "bg-purple-400" },
  deadline: { label: "마감", color: "text-red-700 bg-red-50 border-red-200", dotColor: "bg-red-400" },
  holiday: { label: "휴일", color: "text-green-700 bg-green-50 border-green-200", dotColor: "bg-green-400" },
  personal: { label: "개인", color: "text-gray-700 bg-gray-50 border-gray-200", dotColor: "bg-gray-400" },
};

// ─── Helpers ─────────────────────────────────────────────────────────

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeRange = (start: string, end: string, allDay: boolean) => {
  if (allDay) return "종일";
  return `${formatTime(start)} - ${formatTime(end)}`;
};

// ─── Component ──────────────────────────────────────────────────────

export default function EventCard({ event, onClick }: EventCardProps) {
  const typeConfig = TYPE_CONFIG[event.type] || TYPE_CONFIG.schedule;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-200 group"
    >
      <div className="flex items-start gap-3">
        {/* Color indicator */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            event.color || typeConfig.dotColor
          }`}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeConfig.color}`}
            >
              {typeConfig.label}
            </span>
            {event.allDay && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                종일
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
            {event.title}
          </h4>

          {/* Time */}
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              {formatTimeRange(event.startDate, event.endDate, event.allDay)}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <User className="w-3 h-3 text-gray-400 shrink-0" />
              <div className="flex items-center gap-0.5">
                {event.attendees.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
                    title={a.user.name}
                  >
                    {a.user.name}
                  </span>
                ))}
                {event.attendees.length > 3 && (
                  <span className="text-[10px] text-gray-400">
                    +{event.attendees.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
