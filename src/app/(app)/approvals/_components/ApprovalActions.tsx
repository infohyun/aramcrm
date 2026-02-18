"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, MessageSquare } from "lucide-react";

interface ApprovalActionsProps {
  approvalId: string;
  onDecided: () => void;
}

export default function ApprovalActions({
  approvalId,
  onDecided,
}: ApprovalActionsProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<"approved" | "rejected" | null>(null);

  const handleDecide = async (decideAction: "approved" | "rejected") => {
    setAction(decideAction);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/approvals/${approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decideAction,
          comment: comment.trim() || null,
        }),
      });

      if (res.ok) {
        onDecided();
      } else {
        const data = await res.json();
        alert(data.error || "결재 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to decide:", error);
      alert("결재 처리에 실패했습니다.");
    } finally {
      setSubmitting(false);
      setAction(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3">
        <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          결재 의견 작성
        </h3>
      </div>

      <div className="p-5">
        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="결재 의견을 입력하세요 (선택사항)..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-colors mb-4"
        />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDecide("approved")}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-md shadow-emerald-200"
          >
            {submitting && action === "approved" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            승인
          </button>
          <button
            onClick={() => handleDecide("rejected")}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-xl hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 shadow-md shadow-red-200"
          >
            {submitting && action === "rejected" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            반려
          </button>
        </div>
      </div>
    </div>
  );
}
