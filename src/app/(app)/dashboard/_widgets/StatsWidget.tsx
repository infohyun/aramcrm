'use client';

import { Users, AlertCircle, Wrench, Package, FolderKanban, ClipboardCheck } from 'lucide-react';

interface StatsData {
  totalCustomers: number;
  openVoc: number;
  activeServiceTickets: number;
  lowStockItems: number;
  activeProjects: number;
  pendingApprovals: number;
}

export default function StatsWidget({ stats }: { stats: StatsData }) {
  const cards = [
    { label: '전체 고객', value: stats.totalCustomers, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: '미처리 VOC', value: stats.openVoc, icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
    { label: '진행 중 AS', value: stats.activeServiceTickets, icon: Wrench, color: 'bg-orange-50 text-orange-600' },
    { label: '재고 부족', value: stats.lowStockItems, icon: Package, color: 'bg-red-50 text-red-600' },
    { label: '진행 프로젝트', value: stats.activeProjects, icon: FolderKanban, color: 'bg-indigo-50 text-indigo-600' },
    { label: '결재 대기', value: stats.pendingApprovals, icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-xl border border-[var(--card-border)] p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon size={16} />
              </div>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
