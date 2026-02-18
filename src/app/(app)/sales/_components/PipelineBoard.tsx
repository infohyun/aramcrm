"use client";

import { useState, useCallback } from "react";
import DealCard from "./DealCard";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  grade: string;
  phone: string | null;
  email: string | null;
}

interface Deal {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  orderDate: string;
  memo: string | null;
  customer: Customer | null;
}

interface PipelineStage {
  key: string;
  label: string;
  color: string;
  count: number;
  totalValue: number;
  orders: Deal[];
}

interface PipelineBoardProps {
  stages: PipelineStage[];
  onDealClick: (deal: Deal) => void;
  onStageChange?: (dealId: string, newStatus: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(1) + "억";
  }
  if (value >= 10000) {
    return (value / 10000).toFixed(0) + "만";
  }
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export default function PipelineBoard({
  stages,
  onDealClick,
  onStageChange,
}: PipelineBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, deal: Deal) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ dealId: deal.id, currentStatus: deal.status }));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);

    try {
      const raw = e.dataTransfer.getData("application/json");
      const { dealId, currentStatus } = JSON.parse(raw);
      if (currentStatus !== targetStageKey && onStageChange) {
        onStageChange(dealId, targetStageKey);
      }
    } catch {
      // ignore
    }
  }, [onStageChange]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {stages.map((stage) => (
        <div
          key={stage.key}
          className="flex-shrink-0 w-[280px] flex flex-col"
          onDragOver={(e) => handleDragOver(e, stage.key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, stage.key)}
        >
          {/* Column Header */}
          <div
            className="rounded-t-xl px-4 py-3 mb-0"
            style={{
              backgroundColor: stage.color + "15",
              borderLeft: `3px solid ${stage.color}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3
                  className="text-sm font-bold"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </h3>
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full text-white"
                  style={{ backgroundColor: stage.color }}
                >
                  {stage.count}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(stage.totalValue)}
            </p>
          </div>

          {/* Cards Container */}
          <div
            className={`flex-1 rounded-b-xl border border-t-0 p-2 space-y-2 overflow-y-auto max-h-[600px] transition-colors ${
              dragOverStage === stage.key
                ? "bg-indigo-50 border-indigo-300"
                : "bg-gray-50/70 border-gray-100"
            }`}
          >
            {stage.orders.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-gray-300">
                  {dragOverStage === stage.key ? "여기에 놓으세요" : "건이 없습니다"}
                </p>
              </div>
            ) : (
              stage.orders.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <DealCard
                    deal={deal}
                    onClick={() => onDealClick(deal)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
