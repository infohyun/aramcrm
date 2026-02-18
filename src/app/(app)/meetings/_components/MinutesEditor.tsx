"use client";

import { useState, useRef } from "react";
import { Save, FileText, Loader2, Clock, User } from "lucide-react";
import MarkdownToolbar from "@/components/MarkdownToolbar";

interface MinuteItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface MinutesEditorProps {
  meetingId: string;
  minutes: MinuteItem[];
  onSave: (content: string) => Promise<void>;
}

export default function MinutesEditor({ minutes, onSave }: MinutesEditorProps) {
  const [content, setContent] = useState(minutes.length > 0 ? minutes[0].content : "");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      await onSave(content);
    } catch (error) {
      console.error("Failed to save minutes:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900">회의록</h3>
        </div>
        <div className="flex items-center gap-2">
          {minutes.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              {showHistory ? "편집기 보기" : `이전 기록 (${minutes.length})`}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            저장
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
          {minutes.map((minute) => (
            <div
              key={minute.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  {minute.author.name}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(minute.createdAt)}
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {minute.content}
              </p>
              <button
                onClick={() => {
                  setContent(minute.content);
                  setShowHistory(false);
                }}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline"
              >
                이 버전으로 복원
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <MarkdownToolbar textareaRef={contentRef} value={content} onChange={setContent} />
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="회의 내용을 기록하세요...&#10;&#10;- 논의 안건&#10;- 결정 사항&#10;- 후속 조치"
            rows={10}
            className="w-full px-4 py-3 border border-gray-200 rounded-b-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
