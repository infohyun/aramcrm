"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarClock,
  Settings,
  Link2,
  Copy,
  Check,
  Send,
  Search,
  X,
  ExternalLink,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
} from "lucide-react";

interface SchedulerConfig {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  bufferTime: number;
  workStartHour: number;
  workEndHour: number;
  workDays: string;
  timezone: string;
  isActive: boolean;
}

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerCompany: string | null;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  googleEventId: string | null;
  createdAt: string;
}

interface CustomerResult {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function SchedulerPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"settings" | "bookings">("settings");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // 폼 상태
  const [formTitle, setFormTitle] = useState("미팅 예약");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState(30);
  const [formBuffer, setFormBuffer] = useState(10);
  const [formStartHour, setFormStartHour] = useState(9);
  const [formEndHour, setFormEndHour] = useState(18);
  const [formWorkDays, setFormWorkDays] = useState([1, 2, 3, 4, 5]);
  const [formTimezone, setFormTimezone] = useState("Asia/Seoul");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler/config");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setFormTitle(data.config.title);
        setFormDescription(data.config.description || "");
        setFormDuration(data.config.duration);
        setFormBuffer(data.config.bufferTime);
        setFormStartHour(data.config.workStartHour);
        setFormEndHour(data.config.workEndHour);
        setFormWorkDays(data.config.workDays.split(",").map(Number));
        setFormTimezone(data.config.timezone);
      }
      setGoogleConnected(data.googleConnected);
    } catch (e) {
      console.error("Config fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`/api/scheduler/bookings?status=${statusFilter}`);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) {
      console.error("Bookings fetch error:", e);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) fetchBookings();
  }, [config, statusFilter, fetchBookings]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/scheduler/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription || null,
          duration: formDuration,
          bufferTime: formBuffer,
          workStartHour: formStartHour,
          workEndHour: formEndHour,
          workDays: formWorkDays.sort().join(","),
          timezone: formTimezone,
          isActive: true,
        }),
      });
      const data = await res.json();
      setConfig(data);
      alert("설정이 저장되었습니다.");
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book/${session?.user?.id}`
    : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchCustomers = async (query: string) => {
    setInviteSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSearchResults(data.customers || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setInviteName(customer.name);
    setInviteEmail(customer.email || "");
    setSearchResults([]);
    setInviteSearch("");
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteName) return;
    setSendingInvite(true);
    try {
      const res = await fetch("/api/scheduler/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: inviteEmail,
          customerName: inviteName,
          customerId: selectedCustomer?.id || null,
        }),
      });
      if (res.ok) {
        alert("초대가 발송되었습니다.");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteName("");
        setSelectedCustomer(null);
      } else {
        const data = await res.json();
        alert(data.error || "발송에 실패했습니다.");
      }
    } catch {
      alert("발송에 실패했습니다.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/scheduler/bookings/${id}`, {
        method: status === "cancelled" ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchBookings();
    } catch {
      alert("상태 변경에 실패했습니다.");
    }
  };

  const connectGoogle = () => {
    window.location.href = `/api/integrations/google?userId=${session?.user?.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">미팅 스케줄러</h1>
            <p className="text-sm text-gray-500">Google Calendar 연동 예약 관리</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {googleConnected ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              <Check className="w-4 h-4" /> Google 연결됨
            </span>
          ) : (
            <button
              onClick={connectGoogle}
              className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" /> Google Calendar 연결
            </button>
          )}
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!config}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> 초대 발송
          </button>
        </div>
      </div>

      {/* 예약 링크 */}
      {config && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">내 예약 링크</p>
              <p className="text-sm text-blue-600 font-mono">{bookingUrl}</p>
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-white border border-blue-200 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-50"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "settings" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Settings className="w-4 h-4" /> 설정
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "bookings" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calendar className="w-4 h-4" /> 예약 목록
          {bookings.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {bookings.filter((b) => b.status === "confirmed").length}
            </span>
          )}
        </button>
      </div>

      {/* 설정 탭 */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">미팅 제목</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="미팅 예약"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">타임존</label>
              <select
                value={formTimezone}
                onChange={(e) => setFormTimezone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="미팅에 대한 설명을 입력하세요..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                미팅 시간 (분)
              </label>
              <select
                value={formDuration}
                onChange={(e) => setFormDuration(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value={15}>15분</option>
                <option value={30}>30분</option>
                <option value={45}>45분</option>
                <option value={60}>60분</option>
                <option value={90}>90분</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">미팅 간 여유 시간 (분)</label>
              <select
                value={formBuffer}
                onChange={(e) => setFormBuffer(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>없음</option>
                <option value={5}>5분</option>
                <option value={10}>10분</option>
                <option value={15}>15분</option>
                <option value={30}>30분</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">근무 시작 시간</label>
              <select
                value={formStartHour}
                onChange={(e) => setFormStartHour(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">근무 종료 시간</label>
              <select
                value={formEndHour}
                onChange={(e) => setFormEndHour(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">근무 요일</label>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setFormWorkDays((prev) =>
                      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
                    )
                  }
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    formWorkDays.includes(i)
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      )}

      {/* 예약 목록 탭 */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {["all", "confirmed", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? "전체" : s === "confirmed" ? "확정" : s === "completed" ? "완료" : "취소"}
              </button>
            ))}
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>예약이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{booking.customerName}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            booking.status === "confirmed"
                              ? "bg-blue-100 text-blue-700"
                              : booking.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {booking.status === "confirmed" ? "확정" : booking.status === "completed" ? "완료" : "취소"}
                        </span>
                        {booking.googleEventId && (
                          <span className="text-xs text-green-600 flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" /> Google
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(booking.startTime).toLocaleDateString("ko-KR", {
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(booking.startTime).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" ~ "}
                          {new Date(booking.endTime).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {booking.customerEmail}
                        </span>
                        {booking.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {booking.customerPhone}
                          </span>
                        )}
                        {booking.customerCompany && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> {booking.customerCompany}
                          </span>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="text-sm text-gray-400 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> {booking.notes}
                        </p>
                      )}
                    </div>
                    {booking.status === "confirmed" && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
                          className="text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100"
                        >
                          완료
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                          className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 초대 발송 모달 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Send className="w-5 h-5" /> 미팅 초대 발송
              </h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">고객 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={inviteSearch}
                  onChange={(e) => handleSearchCustomers(e.target.value)}
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                  placeholder="이름 또는 회사명으로 검색..."
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400">{c.company || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedCustomer && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  {selectedCustomer.name} {selectedCustomer.company && `(${selectedCustomer.company})`}
                </span>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setInviteName("");
                    setInviteEmail("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="고객 이름"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="고객 이메일"
              />
            </div>

            <button
              onClick={handleSendInvite}
              disabled={sendingInvite || !inviteEmail || !inviteName}
              className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
            >
              {sendingInvite ? "발송 중..." : "초대 이메일 발송"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
