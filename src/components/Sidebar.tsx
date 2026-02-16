"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  HeadphonesIcon,
  FileSpreadsheet,
  Link2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Package,
  HelpCircle,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: { label: string; icon: React.ElementType; href: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: "고객",
    items: [
      { label: "대시보드", icon: LayoutDashboard, href: "/dashboard" },
      { label: "고객 관리", icon: Users, href: "/customers" },
      { label: "커뮤니케이션", icon: MessageSquare, href: "/communications" },
      { label: "고객의 소리", icon: HeadphonesIcon, href: "/voc" },
    ],
  },
  {
    label: "운영",
    items: [
      { label: "AS 관리", icon: Wrench, href: "/service" },
      { label: "재고/물류", icon: Package, href: "/inventory" },
      { label: "FAQ 관리", icon: HelpCircle, href: "/faq" },
    ],
  },
  {
    label: "시스템",
    items: [
      { label: "데이터 관리", icon: FileSpreadsheet, href: "/import-export" },
      { label: "외부 연동", icon: Link2, href: "/integrations" },
      { label: "설정", icon: Settings, href: "/settings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#0a0a0a] text-white transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-[#0a0a0a]">
                AH
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-white/90">
                아람휴비스
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-[#0a0a0a]">
              AH
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-md p-1 text-white/30 hover:text-white/60 lg:block"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {!collapsed && (
                <p className="mb-2.5 px-3 text-[10px] font-medium uppercase tracking-[0.1em] text-white/25">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-white/[0.08] text-white"
                            : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                        } ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={18} className="shrink-0" strokeWidth={1.8} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t border-white/[0.06] p-4">
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-medium text-white/70">
              관
            </div>
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white/80">
                    관리자
                  </p>
                  <p className="truncate text-[11px] text-white/30">
                    admin@aramhuvis.com
                  </p>
                </div>
                <button
                  className="rounded-md p-1.5 text-white/25 hover:text-white/50"
                  title="로그아웃"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
