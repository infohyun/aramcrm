"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  AlertCircle,
  Wrench,
  Package,
  Plus,
  Send,
  ClipboardList,
  Clock,
  CheckCircle2,
  PhoneCall,
  Mail,
  Loader2,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  totalCustomers: number;
  newCustomers: number;
  totalCommunications: number;
  openVoc: number;
  activeServiceTickets: number;
  lowStockItems: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
        let totalCommunications = 0;
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
          newCustomers: 0,
          totalCommunications,
          openVoc,
          activeServiceTickets,
          lowStockItems,
        });
      } catch (error) {
        console.error("Dashboard stats error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "전체 고객",
      value: stats?.totalCustomers ?? "-",
      icon: Users,
      change: "+12.5%",
      trend: "up" as const,
    },
    {
      label: "미처리 VOC",
      value: stats?.openVoc ?? "-",
      icon: AlertCircle,
      change: "",
      trend: "down" as const,
    },
    {
      label: "진행 중 AS",
      value: stats?.activeServiceTickets ?? "-",
      icon: Wrench,
      change: "",
      trend: "up" as const,
    },
    {
      label: "재고 부족",
      value: stats?.lowStockItems ?? "-",
      icon: Package,
      change: "",
      trend: "down" as const,
    },
  ];

  const quickActions = [
    {
      label: "고객 등록",
      icon: Plus,
      href: "/customers/new",
    },
    {
      label: "메시지 발송",
      icon: Send,
      href: "/communications",
    },
    {
      label: "VOC 등록",
      icon: ClipboardList,
      href: "/voc",
    },
    {
      label: "AS 접수",
      icon: Wrench,
      href: "/service",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      icon: UserPlus,
      title: "신규 고객 등록",
      description: "김서연 고객이 등록되었습니다.",
      time: "10분 전",
    },
    {
      id: 2,
      icon: Send,
      title: "카카오톡 메시지 발송",
      description: "2월 프로모션 안내 메시지 발송 완료 (328명)",
      time: "1시간 전",
    },
    {
      id: 3,
      icon: PhoneCall,
      title: "VOC 접수",
      description: "배송 지연 관련 문의가 접수되었습니다. (이지은 고객)",
      time: "2시간 전",
    },
    {
      id: 4,
      icon: CheckCircle2,
      title: "AS 수리 완료",
      description: "제품 수리건이 처리 완료되었습니다.",
      time: "3시간 전",
    },
    {
      id: 5,
      icon: Mail,
      title: "이메일 캠페인 발송",
      description: "신제품 출시 안내 이메일 발송 완료 (1,204명)",
      time: "5시간 전",
    },
    {
      id: 6,
      icon: UserPlus,
      title: "고객 데이터 일괄 등록",
      description: "엑셀 파일을 통해 52명의 고객이 등록되었습니다.",
      time: "어제",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome section */}
      <div>
        <h2 className="text-[22px] font-semibold text-[#111111] tracking-tight">
          안녕하세요, 관리자님
        </h2>
        <p className="mt-1.5 text-[14px] text-[#888888]">
          오늘의 아람휴비스 CRM 현황을 확인하세요.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl bg-white p-6 border border-[#ebebeb] transition-all duration-300 hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.05)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f5]">
                  <Icon size={18} className="text-[#555555]" strokeWidth={1.8} />
                </div>
                {stat.change && (
                  <div className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                    <ArrowUpRight size={12} />
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="mt-5">
                <p className="text-[28px] font-semibold text-[#111111] tracking-tight">{stat.value}</p>
                <p className="mt-1 text-[13px] text-[#999999]">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions + Recent activities */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-2xl bg-white p-6 border border-[#ebebeb] xl:col-span-1">
          <h3 className="text-[15px] font-semibold text-[#111111]">
            빠른 실행
          </h3>
          <p className="mt-1 text-[13px] text-[#999999]">
            자주 사용하는 기능을 빠르게 실행하세요.
          </p>
          <div className="mt-6 space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex w-full items-center justify-between rounded-xl border border-[#e5e5e5] px-4 py-3 text-[13px] font-medium text-[#333333] transition-all duration-200 hover:border-[#111111] hover:bg-[#fafafa]"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} className="text-[#888888]" strokeWidth={1.8} />
                    {action.label}
                  </span>
                  <ArrowRight size={14} className="text-[#cccccc]" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="rounded-2xl bg-white p-6 border border-[#ebebeb] xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#111111]">
              최근 활동
            </h3>
            <button className="text-[12px] font-medium text-[#999999] hover:text-[#555555] transition-colors">
              전체 보기
            </button>
          </div>
          <div className="mt-5 space-y-0.5">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-[#fafafa]"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5]">
                    <Icon size={14} className="text-[#888888]" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#111111]">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-[#999999]">
                      {activity.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#cccccc]">
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
