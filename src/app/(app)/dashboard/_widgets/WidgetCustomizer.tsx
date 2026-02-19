"use client";

import { useState } from "react";
import { Settings2, X, GripVertical, Eye, EyeOff } from "lucide-react";

interface Widget {
  key: string;
  label: string;
}

const ALL_WIDGETS: Widget[] = [
  { key: "stats", label: "통계 카드" },
  { key: "charts", label: "차트 (매출/고객/AS/재고)" },
  { key: "quickActions", label: "빠른 작업" },
  { key: "tasks", label: "내 할일" },
  { key: "approvals", label: "결재 대기" },
  { key: "calendar", label: "캘린더" },
  { key: "notices", label: "공지사항" },
  { key: "recentActivity", label: "최근 활동" },
];

interface WidgetCustomizerProps {
  hiddenWidgets: string[];
  widgetOrder: string[];
  onSave: (hidden: string[], order: string[]) => void;
}

export default function WidgetCustomizer({ hiddenWidgets, widgetOrder, onSave }: WidgetCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState<string[]>(hiddenWidgets);
  const [order, setOrder] = useState<string[]>(
    widgetOrder.length > 0 ? widgetOrder : ALL_WIDGETS.map((w) => w.key)
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleToggle = (key: string) => {
    setHidden((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, removed);
    setOrder(newOrder);
    setDragIdx(idx);
  };

  const handleSave = () => {
    onSave(hidden, order);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all no-print"
      >
        <Settings2 className="w-3.5 h-3.5" />
        대시보드 설정
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">대시보드 위젯 설정</h2>
            <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">드래그하여 순서를 변경하고, 눈 아이콘으로 표시/숨김을 전환하세요.</p>
          <div className="space-y-1">
            {order.map((key, idx) => {
              const widget = ALL_WIDGETS.find((w) => w.key === key);
              if (!widget) return null;
              const isHidden = hidden.includes(key);
              return (
                <div
                  key={key}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={() => setDragIdx(null)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-grab active:cursor-grabbing ${
                    isHidden ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"
                  } ${dragIdx === idx ? "ring-2 ring-indigo-400" : ""}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className={`flex-1 text-sm ${isHidden ? "text-gray-400 line-through" : "text-gray-700"}`}>
                    {widget.label}
                  </span>
                  <button
                    onClick={() => handleToggle(key)}
                    className={`p-1 rounded ${isHidden ? "text-gray-300 hover:text-gray-500" : "text-indigo-500 hover:text-indigo-700"}`}
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">저장</button>
          </div>
        </div>
      </div>
    </>
  );
}
