"use client";

import { Users, User, Hash } from "lucide-react";

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

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 0 ? "방금" : `${mins}분 전`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}시간 전`;
  }
  if (diffHours < 24 * 7) {
    return `${Math.floor(diffHours / 24)}일 전`;
  }
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function getChannelIcon(type: string) {
  switch (type) {
    case "direct":
      return <User className="w-4 h-4" />;
    case "group":
      return <Users className="w-4 h-4" />;
    default:
      return <Hash className="w-4 h-4" />;
  }
}

export default function ChannelList({
  channels,
  activeChannelId,
  onSelectChannel,
}: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4">
        <Users className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-400 text-center">
          참여 중인 채널이 없습니다.
        </p>
        <p className="text-xs text-gray-300 text-center mt-1">
          새 채널을 만들어 대화를 시작하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {channels.map((channel) => {
        const isActive = channel.id === activeChannelId;
        const preview = channel.lastMessage
          ? channel.lastMessage.type === "system"
            ? channel.lastMessage.content
            : `${channel.lastMessage.sender.name}: ${channel.lastMessage.content}`
          : "메시지가 없습니다";

        return (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel.id)}
            className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${
              isActive
                ? "bg-indigo-50 border border-indigo-200"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Channel Icon */}
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  isActive
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {getChannelIcon(channel.type)}
              </div>

              {/* Channel Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-sm font-medium truncate ${
                      isActive ? "text-indigo-900" : "text-gray-900"
                    }`}
                  >
                    {channel.name}
                  </h4>
                  {channel.lastMessage && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatTime(channel.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-gray-500 truncate">{preview}</p>
                  {channel.unreadCount > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-indigo-500 rounded-full">
                      {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
