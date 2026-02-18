"use client";

import { useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useNotificationStore } from "@/stores/notificationStore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isOpen,
    toggle,
    setOpen,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // 알림 데이터 로드
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?limit=20");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {
        // 실패해도 무시
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [setNotifications]);

  // 외부 클릭 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setOpen]);

  const handleMarkAsRead = async (id: string) => {
    markAsRead(id);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    markAllAsRead();
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {}
  };

  const typeColors: Record<string, string> = {
    approval: "bg-indigo-500",
    task: "bg-blue-500",
    mention: "bg-amber-500",
    system: "bg-gray-500",
    board: "bg-emerald-500",
    meeting: "bg-purple-500",
    calendar: "bg-pink-500",
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-[#999999] transition-colors hover:text-[#555555]"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[#ebebeb] bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">알림</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <CheckCheck size={14} className="inline mr-1" />
                  모두 읽음
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                알림이 없습니다
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !n.isRead ? "bg-blue-50/30" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) handleMarkAsRead(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      typeColors[n.type] || "bg-gray-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      className="p-1 text-gray-300 hover:text-gray-500"
                      title="읽음 처리"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
