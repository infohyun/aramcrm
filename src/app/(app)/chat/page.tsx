"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Plus,
  X,
  Loader2,
  Users,
  Settings,
  Hash,
} from "lucide-react";
import ChannelList from "./_components/ChannelList";
import MessageList from "./_components/MessageList";
import MessageInput from "./_components/MessageInput";

// ─── Types ──────────────────────────────────────────────────

interface ChannelMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface LastMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  members: ChannelMember[];
  lastMessage: LastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

interface Sender {
  id: string;
  name: string;
  avatar: string | null;
  department: string | null;
  position: string | null;
}

interface Message {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  senderId: string;
  sender: Sender;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

// ─── Component ──────────────────────────────────────────────

export default function ChatPage() {
  // State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channelLoading, setChannelLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // Create channel modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState("group");
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeChannelIdRef = useRef<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  // ─── Fetch current user ──────────────────────────────────
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.id) {
            setCurrentUserId(data.user.id);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchSession();
  }, []);

  // ─── Fetch channels ──────────────────────────────────────
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setChannelLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // ─── Fetch messages ──────────────────────────────────────
  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // ─── Select channel ──────────────────────────────────────
  const handleSelectChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId);
      setMessagesLoading(true);
      setMessages([]);
      await fetchMessages(channelId);
      setMessagesLoading(false);
    },
    [fetchMessages]
  );

  // ─── Auto-refresh: polling every 3 seconds ──────────────
  useEffect(() => {
    // 이전 polling 정리
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      // 채널 목록 갱신
      fetchChannels();
      // 활성 채널 메시지 갱신
      if (activeChannelIdRef.current) {
        fetchMessages(activeChannelIdRef.current);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchChannels, fetchMessages]);

  // ─── Send message ──────────────────────────────────────
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeChannelId) return;

      const res = await fetch(`/api/channels/${activeChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        await fetchMessages(activeChannelId);
        fetchChannels(); // 채널 목록도 갱신 (마지막 메시지 업데이트)
      }
    },
    [activeChannelId, fetchMessages, fetchChannels]
  );

  // ─── Create channel ──────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      if (res.ok) {
        const data = await res.json();
        const users = data.data || data.users || [];
        setAvailableUsers(
          users.map((u: { id: string; name: string; email: string; department?: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            department: u.department || null,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const openCreateModal = () => {
    setShowCreateModal(true);
    setNewChannelName("");
    setNewChannelDesc("");
    setNewChannelType("group");
    setSelectedUserIds([]);
    setUserSearchQuery("");
    fetchUsers();
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDesc.trim() || undefined,
          type: newChannelType,
          memberIds: selectedUserIds,
        }),
      });

      if (res.ok) {
        const channel = await res.json();
        setShowCreateModal(false);
        await fetchChannels();
        handleSelectChannel(channel.id);
      }
    } catch {
      // ignore
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 현재 활성 채널 정보
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // 사용자 검색 필터
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.id !== currentUserId &&
      (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.department || "").toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">팀 메시지</h1>
            <p className="text-xs text-gray-500">
              실시간 팀 커뮤니케이션
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          채널 만들기
        </button>
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex-1 flex overflow-hidden bg-gray-50">
        {/* Left Panel: Channel List */}
        <div className="w-[300px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">채널 목록</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {channelLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <ChannelList
                channels={channels}
                activeChannelId={activeChannelId}
                onSelectChannel={handleSelectChannel}
              />
            )}
          </div>
        </div>

        {/* Right Panel: Messages */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {activeChannelId && activeChannel ? (
            <>
              {/* Channel Header */}
              <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    <Hash className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {activeChannel.name}
                    </h3>
                    {activeChannel.description && (
                      <p className="text-xs text-gray-500">
                        {activeChannel.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{activeChannel.members.length}</span>
                  </div>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              {messagesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                />
              )}

              {/* Input */}
              <MessageInput
                channelId={activeChannelId}
                onSend={handleSendMessage}
              />
            </>
          ) : (
            /* No channel selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-500 mb-1">
                  채널을 선택해주세요
                </h3>
                <p className="text-sm text-gray-400">
                  왼쪽 목록에서 채널을 선택하거나 새 채널을 만들어 대화를 시작하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: 채널 만들기
         ═══════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">채널 만들기</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  채널 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="예: 마케팅팀, 프로젝트A"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  설명
                </label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="채널에 대한 간단한 설명"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  채널 유형
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "group", label: "그룹" },
                    { value: "department", label: "부서" },
                    { value: "direct", label: "1:1" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setNewChannelType(opt.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        newChannelType === opt.value
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  멤버 추가
                </label>
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="이름, 이메일, 부서로 검색..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedUserIds.map((uid) => {
                      const user = availableUsers.find((u) => u.id === uid);
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full"
                        >
                          {user?.name || uid}
                          <button
                            onClick={() => toggleUserSelection(uid)}
                            className="hover:text-indigo-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-400">
                      사용자를 찾을 수 없습니다.
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 last:border-0 transition-colors ${
                          selectedUserIds.includes(user.id)
                            ? "bg-indigo-50 text-indigo-700"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{user.name}</span>
                            <span className="text-gray-400 text-xs ml-2">
                              {user.email}
                            </span>
                          </div>
                          {user.department && (
                            <span className="text-xs text-gray-400">
                              {user.department}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || createLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
