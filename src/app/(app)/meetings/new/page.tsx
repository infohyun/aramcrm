"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Video,
  Calendar,
  Clock,
  MapPin,
  Users,
  X,
  Search,
  User,
} from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const MEETING_TYPES = [
  { value: "general", label: "일반 회의" },
  { value: "standup", label: "스탠드업" },
  { value: "review", label: "리뷰" },
  { value: "planning", label: "기획 회의" },
  { value: "retrospective", label: "회고" },
];

export default function NewMeetingPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("general");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 참석자 관리
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // 사용자 목록 조회
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=100");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.data || data.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      !selectedAttendees.find((a) => a.id === u.id) &&
      (u.name.includes(userSearch) || u.email.includes(userSearch))
  );

  const addAttendee = (user: UserOption) => {
    setSelectedAttendees((prev) => [...prev, user]);
    setUserSearch("");
    setShowUserDropdown(false);
  };

  const removeAttendee = (userId: string) => {
    setSelectedAttendees((prev) => prev.filter((a) => a.id !== userId));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date || !startTime || !endTime) return;

    setSubmitting(true);
    try {
      const startDateTime = new Date(`${date}T${startTime}`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}`).toISOString();

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          startTime: startDateTime,
          endTime: endDateTime,
          location: location || null,
          description: description || null,
          attendeeIds: selectedAttendees.map((a) => a.id),
        }),
      });

      if (res.ok) {
        const meeting = await res.json();
        router.push(`/meetings/${meeting.id}`);
      }
    } catch (error) {
      console.error("Failed to create meeting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">회의 예약</h1>
                  <p className="text-[11px] text-gray-400">새로운 회의를 예약합니다</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 space-y-5">
            {/* 제목 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                회의 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 주간 팀 미팅"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 회의 유형 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                회의 유형
              </label>
              <div className="flex gap-2 flex-wrap">
                {MEETING_TYPES.map((mt) => (
                  <button
                    key={mt.value}
                    onClick={() => setType(mt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      type === mt.value
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 날짜 + 시간 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  시작 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  종료 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 장소 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                장소
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 3층 대회의실, Zoom 링크 등"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="회의 안건이나 참고 사항을 입력하세요..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* 참석자 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Users className="w-3.5 h-3.5" />
                참석자
              </label>

              {/* 선택된 참석자 */}
              {selectedAttendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-indigo-700" />
                      </div>
                      <span className="text-xs font-medium text-indigo-700">
                        {attendee.name}
                      </span>
                      <button
                        onClick={() => removeAttendee(attendee.id)}
                        className="text-indigo-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 참석자 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름이나 이메일로 검색..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => addAttendee(user)}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 text-sm">
                              {user.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !date || !startTime || !endTime || submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              회의 예약
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
