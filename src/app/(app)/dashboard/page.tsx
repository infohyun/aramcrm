"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
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

  const userName = session?.user?.name || "사용자";

  useEffect(() => {
    async function fetchStats() {
      try {
        const [customersRes, vocRes, serviceRes, inventoryRes] = await Promise.allSettled([
          fetch("/api/customers?limit=1"),
          fetch("/api/voc?limit=1"),
          fetch("/api/service?limit=1"),
          fetch("/api/inventory?limit=1"),
        ]);

        let totalCustomers = 0;
        let openVoc = 0;
        let activeServiceTickets = 0;
        let lowStockItems = 0;

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

        setStats({
          totalCustomers,
          openVoc,
          activeServiceTickets,
          lowStockItems,
          activeProjects: 0,
          pendingApprovals: 0,
        });
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

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
      <div>
        <h2 className="text-[22px] font-semibold text-[#111111] tracking-tight">
          안녕하세요, {userName}님
        </h2>
        <p className="mt-1 text-[14px] text-[#888888]">
          오늘의 업무 현황을 확인하세요.
        </p>
      </div>

      {/* Stats */}
      <StatsWidget stats={stats} />

      {/* Quick Actions */}
      <QuickActionsWidget />

      {/* Main widgets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TasksWidget />
        <ApprovalsWidget />
        <CalendarWidget />
        <NoticesWidget />
      </div>

      {/* Recent Activity */}
      <RecentActivityWidget />
    </div>
  );
}
