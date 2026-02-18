"use client";

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
}: PipelineBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {stages.map((stage) => (
        <div
          key={stage.key}
          className="flex-shrink-0 w-[280px] flex flex-col"
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
          <div className="flex-1 bg-gray-50/70 rounded-b-xl border border-gray-100 border-t-0 p-2 space-y-2 overflow-y-auto max-h-[600px]">
            {stage.orders.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-gray-300">건이 없습니다</p>
              </div>
            ) : (
              stage.orders.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onDealClick(deal)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
