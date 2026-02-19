"use client";

interface ProjectData {
  name: string;
  progress: number;
  status: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  planning: "bg-blue-500",
  on_hold: "bg-amber-500",
  completed: "bg-gray-400",
};

const statusLabels: Record<string, string> = {
  active: "진행",
  planning: "기획",
  on_hold: "보류",
  completed: "완료",
};

export default function ProjectProgressWidget({ projects }: { projects: ProjectData[] }) {
  if (projects.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">프로젝트 진행률</h3>
        <p className="text-xs text-gray-500 mt-0.5">활성 프로젝트 현황</p>
      </div>
      <div className="space-y-3">
        {projects.map((p) => (
          <div key={p.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{p.name}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${statusColors[p.status] || "bg-gray-400"}`}>
                  {statusLabels[p.status] || p.status}
                </span>
                <span className="text-xs font-bold text-gray-900">{p.progress}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-700 bg-indigo-500"
                style={{ width: `${p.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
