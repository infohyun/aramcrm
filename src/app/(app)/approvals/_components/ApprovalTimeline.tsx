"use client";

import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";

interface ApprovalStep {
  id: string;
  stepOrder: number;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  approver: {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
  };
}

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    dotColor: string;
    lineColor: string;
    textColor: string;
    bgColor: string;
  }
> = {
  approved: {
    label: "승인",
    icon: <CheckCircle2 className="w-5 h-5 text-white" />,
    dotColor: "bg-emerald-500",
    lineColor: "bg-emerald-200",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  rejected: {
    label: "반려",
    icon: <XCircle className="w-5 h-5 text-white" />,
    dotColor: "bg-red-500",
    lineColor: "bg-red-200",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
  },
  pending: {
    label: "대기",
    icon: <Clock className="w-5 h-5 text-gray-400" />,
    dotColor: "bg-gray-200 border-2 border-gray-300",
    lineColor: "bg-gray-200",
    textColor: "text-gray-500",
    bgColor: "bg-gray-50",
  },
};

export default function ApprovalTimeline({ steps }: ApprovalTimelineProps) {
  return (
    <div className="relative">
      {steps.map((step, index) => {
        const config = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
        const isLast = index === steps.length - 1;
        // Determine if this is the current step (first pending step)
        const isCurrentStep =
          step.status === "pending" &&
          steps.findIndex((s) => s.status === "pending") === index;

        return (
          <div key={step.id} className="flex gap-4 relative">
            {/* Timeline line and dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  step.status === "pending"
                    ? isCurrentStep
                      ? "bg-indigo-100 border-2 border-indigo-400 ring-4 ring-indigo-100"
                      : "bg-gray-100 border-2 border-gray-300"
                    : config.dotColor
                } transition-all`}
              >
                {step.status === "pending" ? (
                  isCurrentStep ? (
                    <Clock className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">
                      {step.stepOrder}
                    </span>
                  )
                ) : (
                  config.icon
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[40px] ${
                    step.status !== "pending" ? config.lineColor : "bg-gray-200"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 flex-1 ${isLast ? "pb-0" : ""}`}>
              <div
                className={`rounded-xl border p-4 ${
                  isCurrentStep
                    ? "border-indigo-200 bg-indigo-50/50"
                    : step.status !== "pending"
                    ? `border-gray-200 ${config.bgColor}`
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">
                      {step.stepOrder}단계
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        step.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : step.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : isCurrentStep
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {step.status === "approved"
                        ? "승인"
                        : step.status === "rejected"
                        ? "반려"
                        : isCurrentStep
                        ? "결재 대기"
                        : "대기"}
                    </span>
                  </div>
                  {step.decidedAt && (
                    <span className="text-[11px] text-gray-400">
                      {formatDateTime(step.decidedAt)}
                    </span>
                  )}
                </div>

                {/* Approver info */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      {step.approver.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {step.approver.name}
                    </span>
                    {(step.approver.position || step.approver.department) && (
                      <span className="text-xs text-gray-400 ml-1.5">
                        {step.approver.position && step.approver.position}
                        {step.approver.position &&
                          step.approver.department &&
                          " / "}
                        {step.approver.department && step.approver.department}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment */}
                {step.comment && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-white/70 rounded-lg border border-gray-100">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {step.comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
