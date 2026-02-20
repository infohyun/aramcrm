"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarClock, Plus, Trash2, Loader2, Mail, X } from "lucide-react";

interface ReportSchedule {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  recipients: string;
  config: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const REPORT_TYPES: Record<string, { label: string; color: string }> = {
  sales: { label: "매출", color: "bg-emerald-50 text-emerald-700" },
  customer: { label: "고객", color: "bg-indigo-50 text-indigo-700" },
  service: { label: "AS", color: "bg-orange-50 text-orange-700" },
  inventory: { label: "재고", color: "bg-violet-50 text-violet-700" },
  custom: { label: "커스텀", color: "bg-gray-100 text-gray-700" },
};

const FREQUENCIES: Record<string, { label: string; color: string }> = {
  daily: { label: "매일", color: "bg-red-50 text-red-700" },
  weekly: { label: "매주", color: "bg-amber-50 text-amber-700" },
  monthly: { label: "매월", color: "bg-blue-50 text-blue-700" },
};

export default function ReportSchedulesPage() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formReportType, setFormReportType] = useState("sales");
  const [formFrequency, setFormFrequency] = useState("daily");
  const [formRecipients, setFormRecipients] = useState<string[]>([]);
  const [formEmailInput, setFormEmailInput] = useState("");
  const [formConfig, setFormConfig] = useState("");

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report-schedules");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async () => {
    if (!formName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/report-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          reportType: formReportType,
          frequency: formFrequency,
          recipients: formRecipients,
          config: { description: formConfig },
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchSchedules();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormReportType("sales");
    setFormFrequency("daily");
    setFormRecipients([]);
    setFormEmailInput("");
    setFormConfig("");
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch("/api/report-schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 스케줄을 삭제하시겠습니까?")) return;
    await fetch(`/api/report-schedules?id=${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  const addRecipient = () => {
    const email = formEmailInput.trim();
    if (email && !formRecipients.includes(email)) {
      setFormRecipients([...formRecipients, email]);
      setFormEmailInput("");
    }
  };

  const removeRecipient = (email: string) => {
    setFormRecipients(formRecipients.filter((r) => r !== email));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarClock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">리포트 스케줄링</h1>
                <p className="text-sm text-gray-500 mt-0.5">정기 리포트 자동 발송 관리</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              스케줄 추가
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">등록된 스케줄이 없습니다</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              첫 스케줄 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => {
              let recipients: string[] = [];
              try {
                recipients = JSON.parse(schedule.recipients);
              } catch {
                if (schedule.recipients) recipients = [schedule.recipients];
              }

              const reportType = REPORT_TYPES[schedule.reportType] || { label: schedule.reportType, color: "bg-gray-100 text-gray-700" };
              const frequency = FREQUENCIES[schedule.frequency] || { label: schedule.frequency, color: "bg-gray-100 text-gray-700" };

              return (
                <div
                  key={schedule.id}
                  className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow ${
                    schedule.isActive ? "border-blue-200" : "border-gray-100 opacity-60"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 truncate">{schedule.name}</h3>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${reportType.color}`}>
                      {reportType.label}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${frequency.color}`}>
                      {frequency.label}
                    </span>
                  </div>

                  {/* Recipients */}
                  {recipients.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">수신자</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {recipients.map((email, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full truncate max-w-[180px]"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span>다음 실행</span>
                      <span className="text-gray-700">{formatDate(schedule.nextRunAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>마지막 실행</span>
                      <span className="text-gray-700">{formatDate(schedule.lastRunAt)}</span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {schedule.isActive ? "활성" : "비활성"}
                    </span>
                    <button
                      onClick={() => handleToggle(schedule.id, schedule.isActive)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        schedule.isActive ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          schedule.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">스케줄 추가</h2>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">스케줄 이름</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 주간 매출 리포트"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">리포트 유형</label>
                <select
                  value={formReportType}
                  onChange={(e) => setFormReportType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(REPORT_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">발송 주기</label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(FREQUENCIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">수신자</label>
                <div className="flex gap-2">
                  <input
                    value={formEmailInput}
                    onChange={(e) => setFormEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이메일 주소 입력"
                  />
                  <button
                    onClick={addRecipient}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    추가
                  </button>
                </div>
                {formRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formRecipients.map((email, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="text-blue-400 hover:text-blue-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Config / Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명 / 메모</label>
                <textarea
                  value={formConfig}
                  onChange={(e) => setFormConfig(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="리포트에 대한 설명이나 메모를 입력하세요"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formName}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
