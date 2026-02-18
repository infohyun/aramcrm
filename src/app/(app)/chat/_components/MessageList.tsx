"use client";

import { useEffect, useRef } from "react";

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

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function isSameDay(d1: string, d2: string): boolean {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function MessageList({
  messages,
  currentUserId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 오면 스크롤을 아래로
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-400">아직 메시지가 없습니다.</p>
          <p className="text-xs text-gray-300 mt-1">
            첫 번째 메시지를 보내보세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
    >
      {messages.map((message, index) => {
        const isOwn = message.senderId === currentUserId;
        const isSystem = message.type === "system";
        const showDateDivider =
          index === 0 ||
          !isSameDay(messages[index - 1].createdAt, message.createdAt);

        // 연속 메시지인지 확인 (같은 발신자, 5분 이내)
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive =
          prevMessage &&
          prevMessage.senderId === message.senderId &&
          prevMessage.type !== "system" &&
          !isSystem &&
          new Date(message.createdAt).getTime() -
            new Date(prevMessage.createdAt).getTime() <
            5 * 60 * 1000 &&
          !showDateDivider;

        return (
          <div key={message.id}>
            {/* 날짜 구분선 */}
            {showDateDivider && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 px-2">
                  {formatDateDivider(message.createdAt)}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {/* 시스템 메시지 */}
            {isSystem ? (
              <div className="flex justify-center my-3">
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                  {message.content}
                </span>
              </div>
            ) : isOwn ? (
              /* 자신의 메시지 (오른쪽) */
              <div className={`flex justify-end ${isConsecutive ? "mt-0.5" : "mt-3"}`}>
                <div className="flex items-end gap-1.5 max-w-[70%]">
                  <span className="text-[10px] text-gray-300 flex-shrink-0 mb-1">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  <div className="bg-indigo-500 text-white rounded-2xl rounded-br-md px-3.5 py-2">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* 다른 사람의 메시지 (왼쪽) */
              <div className={`flex justify-start ${isConsecutive ? "mt-0.5" : "mt-3"}`}>
                <div className="flex items-start gap-2 max-w-[70%]">
                  {/* 아바타 */}
                  {!isConsecutive ? (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {getInitial(message.sender.name)}
                    </div>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}
                  <div>
                    {/* 이름 */}
                    {!isConsecutive && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {message.sender.name}
                        </span>
                        {message.sender.position && (
                          <span className="text-[10px] text-gray-400">
                            {message.sender.position}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-end gap-1.5">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-3.5 py-2">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-300 flex-shrink-0 mb-1">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
