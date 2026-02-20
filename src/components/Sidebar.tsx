"use client";

import { useState, useEffect } from "react";
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
  Truck,
  Mail,
  Zap,
  Shield,
  Target,
  FileSignature,
  ShieldCheck,
  Bell,
  Activity,
  PieChart,
  HeartPulse,
  ShoppingBag,
  ClipboardList,
  Timer,
  MapPin,
  Swords,
  UsersRound,
  Globe,
  Crosshair,
  Receipt,
  Route,
  AlertCircle,
  CalendarClock,
  ThumbsUp,
  GitBranch,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: { label: string; icon: React.ElementType; href: string }[];
}

// 항상 표시되는 메뉴 (토글 불가)
export const ALWAYS_VISIBLE_MENUS = ["/dashboard", "/settings"];

// 기본 AS 메뉴 (enabledMenus가 null일 때 기본으로 표시)
export const DEFAULT_AS_MENUS = ["/service", "/ai-cs", "/sla", "/faq"];

export const navGroups: NavGroup[] = [
  {
    label: "업무",
    items: [
      { label: "대시보드", icon: LayoutDashboard, href: "/dashboard" },
      { label: "프로젝트", icon: FolderKanban, href: "/projects" },
      { label: "결재", icon: ClipboardCheck, href: "/approvals" },
      { label: "캘린더", icon: Calendar, href: "/calendar" },
      { label: "경비 관리", icon: Receipt, href: "/expenses" },
      { label: "스케줄러", icon: CalendarClock, href: "/scheduler" },
      { label: "OKR", icon: Crosshair, href: "/okr" },
    ],
  },
  {
    label: "소통",
    items: [
      { label: "공지사항", icon: Megaphone, href: "/board" },
      { label: "메시지", icon: MessagesSquare, href: "/chat" },
      { label: "회의", icon: Video, href: "/meetings" },
      { label: "이메일 캠페인", icon: Mail, href: "/campaigns" },
    ],
  },
  {
    label: "고객",
    items: [
      { label: "고객 관리", icon: Users, href: "/customers" },
      { label: "커뮤니케이션", icon: MessageSquare, href: "/communications" },
      { label: "고객의 소리", icon: HeadphonesIcon, href: "/voc" },
      { label: "계약 관리", icon: FileSignature, href: "/contracts" },
      { label: "팔로업", icon: Bell, href: "/follow-ups" },
      { label: "건강 점수", icon: HeartPulse, href: "/customer-health" },
      { label: "견적서", icon: FileText, href: "/quotes" },
      { label: "설문조사", icon: ClipboardList, href: "/surveys" },
      { label: "고객 포탈", icon: Globe, href: "/portal" },
      { label: "고객 여정", icon: Route, href: "/customer-journey" },
      { label: "NPS", icon: ThumbsUp, href: "/nps" },
    ],
  },
  {
    label: "운영",
    items: [
      { label: "AS 관리", icon: Wrench, href: "/service" },
      { label: "재고/물류", icon: Package, href: "/inventory" },
      { label: "배송 관리", icon: Truck, href: "/shipments" },
      { label: "FAQ 관리", icon: HelpCircle, href: "/faq" },
      { label: "AI 고객지원", icon: Bot, href: "/ai-cs" },
      { label: "SLA 관리", icon: ShieldCheck, href: "/sla" },
      { label: "제품 카탈로그", icon: ShoppingBag, href: "/products" },
      { label: "재고 알림", icon: AlertCircle, href: "/inventory-alerts" },
    ],
  },
  {
    label: "자료",
    items: [
      { label: "문서함", icon: FileText, href: "/documents" },
      { label: "위키", icon: BookOpen, href: "/wiki" },
      { label: "리포트", icon: BarChart3, href: "/reports" },
      { label: "영업 파이프라인", icon: TrendingUp, href: "/sales" },
      { label: "KPI 관리", icon: Target, href: "/kpi" },
      { label: "커스텀 리포트", icon: PieChart, href: "/report-builder" },
      { label: "활동 피드", icon: Activity, href: "/activity-feed" },
      { label: "타임 트래킹", icon: Timer, href: "/time-tracking" },
      { label: "영업 지역", icon: MapPin, href: "/territories" },
      { label: "경쟁사 추적", icon: Swords, href: "/competitors" },
      { label: "리포트 스케줄", icon: CalendarClock, href: "/report-schedules" },
    ],
  },
  {
    label: "시스템",
    items: [
      { label: "데이터 관리", icon: FileSpreadsheet, href: "/import-export" },
      { label: "외부 연동", icon: Link2, href: "/integrations" },
      { label: "자동화", icon: Zap, href: "/automation" },
      { label: "감사 로그", icon: Shield, href: "/audit-logs" },
      { label: "직원 디렉토리", icon: UsersRound, href: "/directory" },
      { label: "설정", icon: Settings, href: "/settings" },
      { label: "워크플로우", icon: GitBranch, href: "/workflow-builder" },
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
  const [enabledMenus, setEnabledMenus] = useState<string[] | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const user = session?.user;
  const userName = user?.name || "사용자";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0);
  const userDept = (user as Record<string, unknown>)?.departmentName as string || (user as Record<string, unknown>)?.department as string || "";

  // 사용자 설정 로드
  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await fetch("/api/settings/preferences");
        if (res.ok) {
          const data = await res.json();
          if (data.enabledMenus) {
            try {
              const parsed = JSON.parse(data.enabledMenus);
              setEnabledMenus(parsed);
            } catch {
              setEnabledMenus(null);
            }
          } else {
            setEnabledMenus(null);
          }
        }
      } catch {
        // ignore
      } finally {
        setPrefsLoaded(true);
      }
    }
    if (session?.user) {
      loadPrefs();
    } else {
      setPrefsLoaded(true);
    }
  }, [session?.user]);

  // 메뉴 항목이 표시되어야 하는지 판단
  const isMenuVisible = (href: string): boolean => {
    // 항상 표시되는 메뉴
    if (ALWAYS_VISIBLE_MENUS.includes(href)) return true;
    // enabledMenus가 null이면 AS 기본 메뉴만 표시
    if (enabledMenus === null) return DEFAULT_AS_MENUS.includes(href);
    // enabledMenus에 포함된 메뉴만 표시
    return enabledMenus.includes(href);
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  // 필터링된 navGroups (표시할 항목이 있는 그룹만)
  const filteredGroups = prefsLoaded
    ? navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => isMenuVisible(item.href)),
        }))
        .filter((group) => group.items.length > 0)
    : [];

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
          {filteredGroups.map((group) => {
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
