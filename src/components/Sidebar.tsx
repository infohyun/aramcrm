"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  ChevronDown,
  Wrench,
  Package,
  HelpCircle,
  Megaphone,
  FolderKanban,
  ClipboardCheck,
  Calendar,
  FileText,
  Video,
  BookOpen,
  MessagesSquare,
  BarChart3,
  TrendingUp,
  Bot,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: { label: string; icon: React.ElementType; href: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: "업무",
    items: [
      { label: "대시보드", icon: LayoutDashboard, href: "/dashboard" },
      { label: "프로젝트", icon: FolderKanban, href: "/projects" },
      { label: "결재", icon: ClipboardCheck, href: "/approvals" },
      { label: "캘린더", icon: Calendar, href: "/calendar" },
    ],
  },
  {
    label: "소통",
    items: [
      { label: "공지사항", icon: Megaphone, href: "/board" },
      { label: "메시지", icon: MessagesSquare, href: "/chat" },
      { label: "회의", icon: Video, href: "/meetings" },
    ],
  },
  {
    label: "고객",
    items: [
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
      { label: "AI 고객지원", icon: Bot, href: "/ai-cs" },
    ],
  },
  {
    label: "자료",
    items: [
      { label: "문서함", icon: FileText, href: "/documents" },
      { label: "위키", icon: BookOpen, href: "/wiki" },
      { label: "리포트", icon: BarChart3, href: "/reports" },
      { label: "영업 파이프라인", icon: TrendingUp, href: "/sales" },
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
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navGroups.map((g) => g.label)
  );

  const user = session?.user;
  const userName = user?.name || "사용자";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0);
  const userDept = (user as Record<string, unknown>)?.departmentName as string || (user as Record<string, unknown>)?.department as string || "";

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

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
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.label);

            return (
              <div key={group.label} className="mb-1">
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-medium uppercase tracking-[0.1em] text-white/25 hover:text-white/40"
                  >
                    {group.label}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                    />
                  </button>
                ) : (
                  <div className="my-2 mx-3 h-px bg-white/[0.06]" />
                )}
                {(collapsed || isExpanded) && (
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                          pathname.startsWith(item.href));
                      const Icon = item.icon;

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-white/[0.08] text-white"
                                : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                            } ${collapsed ? "justify-center" : ""}`}
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon
                              size={18}
                              className="shrink-0"
                              strokeWidth={1.8}
                            />
                            {!collapsed && <span>{item.label}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-white/[0.06] p-4">
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-medium text-white/70">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white/80">
                    {userName}
                  </p>
                  <p className="truncate text-[11px] text-white/30">
                    {userDept || userEmail}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
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
