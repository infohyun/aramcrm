"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface ChartItem {
  label: string;
  value: number;
  color: string;
}

interface ChartCardProps {
  title: string;
  description?: string;
  data: ChartItem[];
  chartType?: "bar" | "pie";
}

export default function ChartCard({
  title,
  description,
  data,
  chartType,
}: ChartCardProps) {
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const type = chartType || (data.length <= 5 ? "pie" : "bar");

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      {data.length === 0 || totalValue === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          데이터가 없습니다.
        </div>
      ) : type === "pie" ? (
        <div className="flex items-center gap-4">
          <div className="w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.map((d) => ({ name: d.label, value: d.value, fill: d.color }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [(value as number).toLocaleString(), name as string]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((item) => {
              const ratio = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{item.value.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-400">({ratio}%)</span>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">합계</span>
              <span className="text-sm font-bold text-gray-900">{totalValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.map((d) => ({ name: d.label, value: d.value, fill: d.color }))} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [(value as number).toLocaleString(), "건수"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
