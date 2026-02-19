"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Settings2 } from "lucide-react";
import StatsWidget from "./_widgets/StatsWidget";
import QuickActionsWidget from "./_widgets/QuickActionsWidget";
import TasksWidget from "./_widgets/TasksWidget";
import ApprovalsWidget from "./_widgets/ApprovalsWidget";
import CalendarWidget from "./_widgets/CalendarWidget";
import NoticesWidget from "./_widgets/NoticesWidget";
import RecentActivityWidget from "./_widgets/RecentActivityWidget";
import SalesChartWidget from "./_widgets/SalesChartWidget";
import PieChartWidget from "./_widgets/PieChartWidget";
import ProjectProgressWidget from "./_widgets/ProjectProgressWidget";

interface DashboardStats {
  totalCustomers: number;
  openVoc: number;
  activeServiceTickets: number;
  lowStockItems: number;
  activeProjects: number;
  pendingApprovals: number;
}

interface ChartStats {
  monthlySales: { month: string; revenue: number; orders: number }[];
  customerGrades: { grade: string; count: number }[];
  serviceStatus: { status: string; count: number }[];
  inventoryStatus: { status: string; count: number }[];
  projects: { name: string; progress: number; status: string }[];
  comparison: {
    thisMonth: number;
    lastMonth: number;
    revenueChange: number;
    thisMonthOrders: number;
    lastMonthOrders: number;
  };
}

const gradeColors: Record<string, string> = {
  vip: "#f59e0b",
  gold: "#6366f1",
  normal: "#10b981",
  new: "#06b6d4",
};
const gradeLabels: Record<string, string> = {
  vip: "VIP",
  gold: "Gold",
  normal: "일반",
  new: "신규",
};
const serviceLabels: Record<string, string> = {
  received: "접수",
  in_progress: "진행",
  inspecting: "검사",
  repairing: "수리",
  completed: "완료",
  returned: "반환",
};
const serviceColors: Record<string, string> = {
  received: "#6366f1",
  in_progress: "#f59e0b",
  inspecting: "#f59e0b",
  repairing: "#f97316",
  completed: "#10b981",
  returned: "#06b6d4",
};
const inventoryLabels: Record<string, string> = {
  in_stock: "정상",
  low_stock: "부족",
  out_of_stock: "품절",
};
const inventoryColors: Record<string, string> = {
  in_stock: "#10b981",
  low_stock: "#f59e0b",
  out_of_stock: "#ef4444",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0, openVoc: 0, activeServiceTickets: 0,
    lowStockItems: 0, activeProjects: 0, pendingApprovals: 0,
  });
  const [chartStats, setChartStats] = useState<ChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);

  const userName = session?.user?.name || "사용자";

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch("/api/settings/preferences");
        if (res.ok) {
          const data = await res.json();
          if (data.hiddenWidgets) {
            try { setHiddenWidgets(JSON.parse(data.hiddenWidgets)); } catch {}
          }
        }
      } catch {}
    }
    loadPreferences();
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [statsResults, chartRes] = await Promise.all([
          Promise.allSettled([
            fetch("/api/customers?limit=1"),
            fetch("/api/voc?limit=1"),
            fetch("/api/service?limit=1"),
            fetch("/api/inventory?limit=1"),
            fetch("/api/projects?limit=1"),
            fetch("/api/approvals?status=pending&limit=1"),
          ]),
          fetch("/api/dashboard/stats"),
        ]);

        let totalCustomers = 0, openVoc = 0, activeServiceTickets = 0;
        let lowStockItems = 0, activeProjects = 0, pendingApprovals = 0;

        const [customersRes, vocRes, serviceRes, inventoryRes, projectsRes, approvalsRes] = statsResults;

        if (customersRes.status === "fulfilled" && customersRes.value.ok) {
          totalCustomers = (await customersRes.value.json()).total || 0;
        }
        if (vocRes.status === "fulfilled" && vocRes.value.ok) {
          const d = await vocRes.value.json();
          openVoc = (d.stats?.open || 0) + (d.stats?.inProgress || 0);
        }
        if (serviceRes.status === "fulfilled" && serviceRes.value.ok) {
          const d = await serviceRes.value.json();
          activeServiceTickets = (d.stats?.received || 0) + (d.stats?.inProgress || 0);
        }
        if (inventoryRes.status === "fulfilled" && inventoryRes.value.ok) {
          const d = await inventoryRes.value.json();
          lowStockItems = (d.stats?.lowStock || 0) + (d.stats?.outOfStock || 0);
        }
        if (projectsRes.status === "fulfilled" && projectsRes.value.ok) {
          const d = await projectsRes.value.json();
          activeProjects = d.stats?.active || d.total || 0;
        }
        if (approvalsRes.status === "fulfilled" && approvalsRes.value.ok) {
          const d = await approvalsRes.value.json();
          pendingApprovals = d.total || d.pagination?.total || 0;
        }

        setStats({ totalCustomers, openVoc, activeServiceTickets, lowStockItems, activeProjects, pendingApprovals });

        if (chartRes.ok) {
          setChartStats(await chartRes.json());
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const isVisible = (key: string) => !hiddenWidgets.includes(key);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-[#111111] dark:text-gray-100 tracking-tight">
            안녕하세요, {userName}님
          </h2>
          <p className="mt-1 text-[14px] text-[#888888] dark:text-gray-400">
            오늘의 업무 현황을 확인하세요.
          </p>
        </div>
        <a
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-all no-print"
        >
          <Settings2 className="w-3.5 h-3.5" />
          대시보드 설정
        </a>
      </div>

      {/* Stats */}
      {isVisible("stats") && <StatsWidget stats={stats} />}

      {/* Charts Row */}
      {chartStats && isVisible("charts") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChartWidget
            monthlySales={chartStats.monthlySales}
            comparison={chartStats.comparison}
          />
          <PieChartWidget
            title="고객 등급 분포"
            subtitle="전체 고객 등급별 현황"
            data={chartStats.customerGrades.map((g) => ({
              name: gradeLabels[g.grade] || g.grade,
              value: g.count,
              color: gradeColors[g.grade] || "#999",
            }))}
          />
        </div>
      )}

      {chartStats && isVisible("charts") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PieChartWidget
            title="AS 현황"
            subtitle="서비스 티켓 상태"
            data={chartStats.serviceStatus.map((s) => ({
              name: serviceLabels[s.status] || s.status,
              value: s.count,
              color: serviceColors[s.status] || "#999",
            }))}
          />
          <PieChartWidget
            title="재고 현황"
            subtitle="재고 상태 분포"
            data={chartStats.inventoryStatus.map((s) => ({
              name: inventoryLabels[s.status] || s.status,
              value: s.count,
              color: inventoryColors[s.status] || "#999",
            }))}
          />
          <ProjectProgressWidget projects={chartStats.projects} />
        </div>
      )}

      {/* Quick Actions */}
      {isVisible("quickActions") && <QuickActionsWidget />}

      {/* Main widgets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isVisible("tasks") && <TasksWidget />}
        {isVisible("approvals") && <ApprovalsWidget />}
        {isVisible("calendar") && <CalendarWidget />}
        {isVisible("notices") && <NoticesWidget />}
      </div>

      {/* Recent Activity */}
      {isVisible("recentActivity") && <RecentActivityWidget />}
    </div>
  );
}
