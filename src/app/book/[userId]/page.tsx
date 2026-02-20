"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  Check,
  Loader2,
} from "lucide-react";

interface Slot {
  start: string;
  end: string;
}

interface ConfigInfo {
  duration: number;
  title: string;
  description: string | null;
}

export default function BookingPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [step, setStep] = useState<"date" | "time" | "form" | "done">("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [configInfo, setConfigInfo] = useState<ConfigInfo | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 캘린더 상태
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // 폼 상태
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchSlots = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scheduler/availability/${userId}?date=${date}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "가용 시간을 불러올 수 없습니다.");
        setSlots([]);
      } else {
        setSlots(data.slots || []);
        setConfigInfo(data.config || null);
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !formName || !formEmail) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/scheduler/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          customerName: formName,
          customerEmail: formEmail,
          customerPhone: formPhone || null,
          customerCompany: formCompany || null,
          notes: formNotes || null,
        }),
      });
      if (res.ok) {
        setStep("done");
      } else {
        const data = await res.json();
        alert(data.error || "예약에 실패했습니다.");
      }
    } catch {
      alert("서버 연결에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 캘린더 렌더링 헬퍼
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-black text-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <CalendarClock className="w-6 h-6" />
          <span className="text-lg font-bold">아람휴비스</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 미팅 정보 */}
        {configInfo && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{configInfo.title}</h1>
            {configInfo.description && (
              <p className="text-gray-500 mt-1">{configInfo.description}</p>
            )}
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-4 h-4" /> {configInfo.duration}분
            </p>
          </div>
        )}

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: "date", label: "날짜 선택" },
            { key: "time", label: "시간 선택" },
            { key: "form", label: "정보 입력" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-gray-300" />}
              <div
                className={`flex items-center gap-1.5 text-sm font-medium ${
                  step === s.key ? "text-black" :
                  (s.key === "date" && step !== "date") ||
                  (s.key === "time" && (step === "form" || step === "done"))
                    ? "text-green-600" : "text-gray-400"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === s.key ? "bg-black text-white" :
                  (s.key === "date" && step !== "date") ||
                  (s.key === "time" && (step === "form" || step === "done"))
                    ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"
                }`}>
                  {(s.key === "date" && step !== "date") ||
                   (s.key === "time" && (step === "form" || step === "done"))
                    ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* 완료 화면 */}
        {step === "done" && (
          <div className="bg-white rounded-2xl border p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">예약이 완료되었습니다!</h2>
            <p className="text-gray-500">확인 이메일이 {formEmail}으로 발송됩니다.</p>
            {selectedDate && selectedSlot && (
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1">
                <p className="text-sm"><strong>날짜:</strong> {formatDate(selectedDate)}</p>
                <p className="text-sm"><strong>시간:</strong> {formatTime(selectedSlot.start)} ~ {formatTime(selectedSlot.end)}</p>
                <p className="text-sm"><strong>이름:</strong> {formName}</p>
              </div>
            )}
          </div>
        )}

        {/* 날짜 선택 */}
        {step === "date" && (
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold">
                {viewYear}년 {viewMonth + 1}월
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="py-2 text-gray-500 font-medium">{d}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isPast = dateStr < todayStr;
                const maxDate = new Date(today);
                maxDate.setDate(maxDate.getDate() + 30);
                const maxStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, "0")}-${String(maxDate.getDate()).padStart(2, "0")}`;
                const isTooFar = dateStr > maxStr;
                const isDisabled = isPast || isTooFar;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={day}
                    disabled={isDisabled}
                    onClick={() => handleSelectDate(dateStr)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected ? "bg-black text-white" :
                      isToday ? "bg-blue-50 text-blue-700 hover:bg-blue-100" :
                      isDisabled ? "text-gray-300 cursor-not-allowed" :
                      "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 시간 선택 */}
        {step === "time" && (
          <div className="space-y-4">
            <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4" /> 날짜 다시 선택
            </button>

            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-bold mb-1">{selectedDate && formatDate(selectedDate)}</h2>
              <p className="text-sm text-gray-500 mb-4">가용한 시간을 선택해 주세요</p>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500 text-sm">{error}</div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  이 날짜에는 가용한 시간이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => handleSelectSlot(slot)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        selectedSlot?.start === slot.start
                          ? "bg-black text-white border-black"
                          : "bg-white hover:bg-gray-50 border-gray-200"
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 정보 입력 */}
        {step === "form" && selectedSlot && (
          <div className="space-y-4">
            <button onClick={() => setStep("time")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4" /> 시간 다시 선택
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
              <p className="font-medium text-blue-900">
                {selectedDate && formatDate(selectedDate)} {formatTime(selectedSlot.start)} ~ {formatTime(selectedSlot.end)}
              </p>
              {configInfo && <p className="text-blue-700">{configInfo.duration}분 미팅</p>}
            </div>

            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <h2 className="font-bold">예약 정보 입력</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" /> 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="홍길동"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" /> 이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" /> 전화번호
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="010-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" /> 회사명
                </label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="회사명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" /> 메모
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="미팅에 대해 남기실 메모가 있으면 작성해 주세요."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !formName || !formEmail}
                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 예약 중...</>
                ) : (
                  "예약 확정"
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 풋터 */}
      <footer className="text-center text-xs text-gray-400 py-8">
        &copy; {new Date().getFullYear()} 아람휴비스. All rights reserved.
      </footer>
    </div>
  );
}
