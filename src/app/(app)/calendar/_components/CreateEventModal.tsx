"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Search,
  User,
  Palette,
} from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────

interface UserOption {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string | null;
}

// ─── Config ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { key: "schedule", label: "일정", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "meeting", label: "회의", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { key: "deadline", label: "마감", color: "bg-red-50 border-red-200 text-red-700" },
  { key: "holiday", label: "휴일", color: "bg-green-50 border-green-200 text-green-700" },
  { key: "personal", label: "개인", color: "bg-gray-50 border-gray-200 text-gray-700" },
];

const COLOR_OPTIONS = [
  { key: "bg-blue-400", label: "파랑" },
  { key: "bg-purple-400", label: "보라" },
  { key: "bg-red-400", label: "빨강" },
  { key: "bg-green-400", label: "초록" },
  { key: "bg-gray-400", label: "회색" },
  { key: "bg-orange-400", label: "주황" },
  { key: "bg-pink-400", label: "분홍" },
  { key: "bg-teal-400", label: "청록" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const nowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const endTimeStr = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ─── Component ──────────────────────────────────────────────────────

export default function CreateEventModal({
  isOpen,
  onClose,
  onCreated,
  initialDate,
}: CreateEventModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("schedule");
  const [startDate, setStartDate] = useState(initialDate || todayStr());
  const [startTime, setStartTime] = useState(nowTimeStr());
  const [endDate, setEndDate] = useState(initialDate || todayStr());
  const [endTime, setEndTime] = useState(endTimeStr());
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Attendee selection
  const [attendees, setAttendees] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Reset form when opened with new date
  useEffect(() => {
    if (isOpen) {
      setStartDate(initialDate || todayStr());
      setEndDate(initialDate || todayStr());
    }
  }, [isOpen, initialDate]);

  // ─── User Search ────────────────────────────────────────────────

  useEffect(() => {
    if (userSearch.length < 1) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users?search=${encodeURIComponent(userSearch)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          const users = (data.data || data || []).filter(
            (u: UserOption) => !attendees.some((a) => a.id === u.id)
          );
          setUserResults(users);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, attendees]);

  // ─── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const startDateTime = allDay
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime}:00`;
      const endDateTime = allDay
        ? `${endDate}T23:59:59`
        : `${endDate}T${endTime}:00`;

      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay,
          location: location.trim() || null,
          color: color || null,
          attendeeIds: attendees.map((a) => a.id),
        }),
      });

      if (res.ok) {
        resetForm();
        onCreated();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "일정 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to create event:", error);
      alert("일정 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setType("schedule");
    setStartDate(todayStr());
    setStartTime(nowTimeStr());
    setEndDate(todayStr());
    setEndTime(endTimeStr());
    setAllDay(false);
    setLocation("");
    setDescription("");
    setColor("");
    setAttendees([]);
    setUserSearch("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">일정 추가</h2>
              <p className="text-[11px] text-gray-400">
                새로운 일정을 등록합니다
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              유형
            </label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setType(opt.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    type === opt.key
                      ? `${opt.color} shadow-sm ring-1 ring-offset-1 ring-gray-300`
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="allDay" className="text-xs font-medium text-gray-700">
              종일 일정
            </label>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  시작 시간
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  종료 시간
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              장소
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="장소를 입력하세요 (선택)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <FileText className="w-3 h-3 inline mr-1" />
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정에 대한 설명 (선택)"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <Palette className="w-3 h-3 inline mr-1" />
              색상
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setColor(color === opt.key ? "" : opt.key)}
                  className={`w-7 h-7 rounded-full ${opt.key} transition-all ${
                    color === opt.key
                      ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                      : "hover:scale-105"
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <User className="w-3 h-3 inline mr-1" />
              참석자
            </label>

            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attendees.map((user) => (
                  <span
                    key={user.id}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200"
                  >
                    {user.name}
                    <button
                      onClick={() =>
                        setAttendees(attendees.filter((a) => a.id !== user.id))
                      }
                      className="p-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="참석자 이름 검색..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {showUserDropdown && userResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {userResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setAttendees([...attendees, user]);
                        setUserSearch("");
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors text-sm border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-900">
                        {user.name}
                      </span>
                      {user.department && (
                        <span className="text-xs text-gray-400 ml-1.5">
                          {user.department}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            일정 추가
          </button>
        </div>
      </div>
    </div>
  );
}
