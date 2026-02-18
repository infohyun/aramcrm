"use client";

interface ChartItem {
  label: string;
  value: number;
  color: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  data: ChartItem[];
  maxValue?: number;
}

export default function ChartCard({
  title,
  description,
  data,
  maxValue,
}: ChartCardProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      {data.length === 0 || totalValue === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          데이터가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = max > 0 ? (item.value / max) * 100 : 0;
            const ratio = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;

            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({ratio}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(percentage, 1)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 합계 */}
      {totalValue > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">합계</span>
            <span className="text-sm font-bold text-gray-900">
              {totalValue.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
