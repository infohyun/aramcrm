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

interface DashboardStats {
  totalCustomers: number;
  openVoc: number;
  activeServiceTickets: number;
  lowStockItems: number;
  activeProjects: number;
  pendingApprovals: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0, openVoc: 0, activeServiceTickets: 0,
    lowStockItems: 0, activeProjects: 0, pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);

  const userName = session?.user?.name || "사용자";

  // Load hidden widgets preference
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch("/api/settings/preferences");
        if (res.ok) {
          const data = await res.json();
          if (data.hiddenWidgets) {
            try {
              setHiddenWidgets(JSON.parse(data.hiddenWidgets));
            } catch {
              // ignore parse error
            }
          }
        }
      } catch {
        // ignore
      }
    }
    loadPreferences();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [customersRes, vocRes, serviceRes, inventoryRes, projectsRes, approvalsRes] = await Promise.allSettled([
          fetch("/api/customers?limit=1"),
          fetch("/api/voc?limit=1"),
          fetch("/api/service?limit=1"),
          fetch("/api/inventory?limit=1"),
          fetch("/api/projects?limit=1"),
          fetch("/api/approvals?status=pending&limit=1"),
        ]);

        let totalCustomers = 0;
        let openVoc = 0;
        let activeServiceTickets = 0;
        let lowStockItems = 0;
        let activeProjects = 0;
        let pendingApprovals = 0;

        if (customersRes.status === "fulfilled" && customersRes.value.ok) {
          const data = await customersRes.value.json();
          totalCustomers = data.total || 0;
        }
        if (vocRes.status === "fulfilled" && vocRes.value.ok) {
          const data = await vocRes.value.json();
          openVoc = (data.stats?.open || 0) + (data.stats?.inProgress || 0);
        }
        if (serviceRes.status === "fulfilled" && serviceRes.value.ok) {
          const data = await serviceRes.value.json();
          activeServiceTickets = (data.stats?.received || 0) + (data.stats?.inProgress || 0);
        }
        if (inventoryRes.status === "fulfilled" && inventoryRes.value.ok) {
          const data = await inventoryRes.value.json();
          lowStockItems = (data.stats?.lowStock || 0) + (data.stats?.outOfStock || 0);
        }
        if (projectsRes.status === "fulfilled" && projectsRes.value.ok) {
          const data = await projectsRes.value.json();
          activeProjects = data.stats?.active || data.total || 0;
        }
        if (approvalsRes.status === "fulfilled" && approvalsRes.value.ok) {
          const data = await approvalsRes.value.json();
          pendingApprovals = data.total || data.pagination?.total || 0;
        }

        setStats({
          totalCustomers,
          openVoc,
          activeServiceTickets,
          lowStockItems,
          activeProjects,
          pendingApprovals,
        });
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
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
