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
  Layers,
  Factory,
  Gift,
  Send,
  ShoppingCart,
  Building2,
  Briefcase,
  FlaskConical,
  Sparkles,
} from "lucide-react";

// ─── 타입 정의 ─────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavSubGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface NavTeam {
  id: string;
  label: string;
  icon: React.ElementType;
  highlight?: boolean;
  highlightColor?: string;
  highlightBg?: string;
  highlightBorder?: string;
  badge?: string;
  subGroups: NavSubGroup[];
}

// ─── 항상 표시되는 메뉴 ─────────────────────────────────────

export const ALWAYS_VISIBLE_MENUS = [
  "/dashboard", "/settings", "/brand-dashboard", "/brand-products",
  "/brand-orders", "/promotions", "/production", "/messaging-hub", "/manual",
  "/automation", "/workflow-builder",
  "/service", "/ai-cs", "/sla", "/voc", "/faq", "/surveys",
];

export const DEFAULT_AS_MENUS = ["/service", "/ai-cs", "/sla", "/faq"];

// ─── 팀별 네비게이션 구조 ────────────────────────────────────

export const navTeams: NavTeam[] = [
  {
    id: "crm-automation",
    label: "CRM 자동화",
    icon: Zap,
    highlight: true,
    highlightColor: "text-amber-400",
    highlightBg: "bg-amber-500/10",
    highlightBorder: "border-amber-500/20",
    badge: "AI",
    subGroups: [
      {
        label: "자동화",
        icon: Zap,
        items: [
          { label: "자동화 규칙", icon: Zap, href: "/automation" },
          { label: "워크플로우 빌더", icon: GitBranch, href: "/workflow-builder" },
        ],
      },
    ],
  },
  {
    id: "after-service",
    label: "After Service팀",
    icon: HeadphonesIcon,
    highlight: true,
    highlightColor: "text-rose-400",
    highlightBg: "bg-rose-500/10",
    highlightBorder: "border-rose-500/20",
    badge: "AS",
    subGroups: [
      {
        label: "AS 처리",
        icon: Wrench,
        items: [
          { label: "AS 관리", icon: Wrench, href: "/service" },
          { label: "AI 고객지원", icon: Bot, href: "/ai-cs" },
          { label: "SLA 관리", icon: ShieldCheck, href: "/sla" },
        ],
      },
      {
        label: "고객 피드백",
        icon: MessageSquare,
        items: [
          { label: "고객의 소리 (VOC)", icon: HeadphonesIcon, href: "/voc" },
          { label: "FAQ 관리", icon: HelpCircle, href: "/faq" },
          { label: "설문조사", icon: ClipboardList, href: "/surveys" },
        ],
      },
    ],
  },
  {
    id: "management",
    label: "경영관리팀",
    icon: Building2,
    subGroups: [
      {
        label: "현황/대시보드",
        icon: BarChart3,
        items: [
          { label: "대시보드", icon: LayoutDashboard, href: "/dashboard" },
          { label: "브랜드 대시보드", icon: Layers, href: "/brand-dashboard" },
          { label: "KPI 관리", icon: Target, href: "/kpi" },
          { label: "OKR", icon: Crosshair, href: "/okr" },
        ],
      },
      {
        label: "업무 관리",
        icon: FolderKanban,
        items: [
          { label: "프로젝트", icon: FolderKanban, href: "/projects" },
          { label: "결재", icon: ClipboardCheck, href: "/approvals" },
          { label: "캘린더", icon: Calendar, href: "/calendar" },
          { label: "스케줄러", icon: CalendarClock, href: "/scheduler" },
          { label: "경비 관리", icon: Receipt, href: "/expenses" },
        ],
      },
      {
        label: "사내 소통",
        icon: MessagesSquare,
        items: [
          { label: "공지사항", icon: Megaphone, href: "/board" },
          { label: "메시지", icon: MessagesSquare, href: "/chat" },
          { label: "회의", icon: Video, href: "/meetings" },
        ],
      },
      {
        label: "자료/문서",
        icon: FileText,
        items: [
          { label: "문서함", icon: FileText, href: "/documents" },
          { label: "위키", icon: BookOpen, href: "/wiki" },
          { label: "리포트", icon: BarChart3, href: "/reports" },
          { label: "커스텀 리포트", icon: PieChart, href: "/report-builder" },
          { label: "활동 피드", icon: Activity, href: "/activity-feed" },
          { label: "타임 트래킹", icon: Timer, href: "/time-tracking" },
          { label: "리포트 스케줄", icon: CalendarClock, href: "/report-schedules" },
        ],
      },
      {
        label: "시스템 관리",
        icon: Settings,
        items: [
          { label: "데이터 관리", icon: FileSpreadsheet, href: "/import-export" },
          { label: "외부 연동", icon: Link2, href: "/integrations" },
          { label: "감사 로그", icon: Shield, href: "/audit-logs" },
          { label: "직원 디렉토리", icon: UsersRound, href: "/directory" },
          { label: "설정", icon: Settings, href: "/settings" },
          { label: "사용 매뉴얼", icon: BookOpen, href: "/manual" },
        ],
      },
    ],
  },
  {
    id: "sales",
    label: "Sales팀",
    icon: Briefcase,
    subGroups: [
      {
        label: "고객",
        icon: Users,
        items: [
          { label: "고객 관리", icon: Users, href: "/customers" },
          { label: "커뮤니케이션", icon: MessageSquare, href: "/communications" },
          { label: "건강 점수", icon: HeartPulse, href: "/customer-health" },
          { label: "고객 여정", icon: Route, href: "/customer-journey" },
          { label: "NPS", icon: ThumbsUp, href: "/nps" },
          { label: "고객 포탈", icon: Globe, href: "/portal" },
        ],
      },
      {
        label: "영업",
        icon: TrendingUp,
        items: [
          { label: "영업 파이프라인", icon: TrendingUp, href: "/sales" },
          { label: "계약 관리", icon: FileSignature, href: "/contracts" },
          { label: "견적서", icon: FileText, href: "/quotes" },
          { label: "팔로업", icon: Bell, href: "/follow-ups" },
          { label: "영업 지역", icon: MapPin, href: "/territories" },
          { label: "경쟁사 추적", icon: Swords, href: "/competitors" },
        ],
      },
      {
        label: "제품/주문",
        icon: ShoppingCart,
        items: [
          { label: "브랜드 제품", icon: ShoppingBag, href: "/brand-products" },
          { label: "통합 주문", icon: ShoppingCart, href: "/brand-orders" },
          { label: "제품 카탈로그", icon: ShoppingBag, href: "/products" },
          { label: "배송 관리", icon: Truck, href: "/shipments" },
          { label: "재고/물류", icon: Package, href: "/inventory" },
          { label: "재고 알림", icon: AlertCircle, href: "/inventory-alerts" },
        ],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing팀",
    icon: Megaphone,
    subGroups: [
      {
        label: "프로모션",
        icon: Gift,
        items: [
          { label: "프로모션 관리", icon: Gift, href: "/promotions" },
        ],
      },
      {
        label: "대외 소통",
        icon: Send,
        items: [
          { label: "메시징 허브", icon: Send, href: "/messaging-hub" },
          { label: "이메일 캠페인", icon: Mail, href: "/campaigns" },
        ],
      },
    ],
  },
  {
    id: "research",
    label: "연구소",
    icon: FlaskConical,
    subGroups: [
      {
        label: "생산/품질",
        icon: Factory,
        items: [
          { label: "생산 관리", icon: Factory, href: "/production" },
        ],
      },
    ],
  },
];

// ─── navGroups 호환 (설정 페이지 등에서 사용) ─────────────────

export interface NavGroup {
  label: string;
  items: { label: string; icon: React.ElementType; href: string }[];
}

export const navGroups: NavGroup[] = navTeams.flatMap((team) =>
  team.subGroups.map((sub) => ({
    label: `${team.label} > ${sub.label}`,
    items: sub.items,
  }))
);

// ─── Sidebar Component ──────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({
    "crm-automation": true,
    "after-service": true,
  });
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [enabledMenus, setEnabledMenus] = useState<string[] | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const user = session?.user;
  const userName = user?.name || "사용자";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0);
  const userDept = (user as Record<string, unknown>)?.departmentName as string || (user as Record<string, unknown>)?.department as string || "";

  // 현재 pathname에 해당하는 팀/서브그룹을 자동으로 열기
  useEffect(() => {
    for (const team of navTeams) {
      for (const sub of team.subGroups) {
        for (const item of sub.items) {
          if (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))) {
            setExpandedTeams((prev) => ({ ...prev, [team.id]: true }));
            setExpandedSubs((prev) => ({ ...prev, [`${team.id}-${sub.label}`]: true }));
            return;
          }
        }
      }
    }
  }, [pathname]);

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

  const isMenuVisible = (href: string): boolean => {
    if (ALWAYS_VISIBLE_MENUS.includes(href)) return true;
    if (enabledMenus === null) return DEFAULT_AS_MENUS.includes(href);
    return enabledMenus.includes(href);
  };

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSub = (key: string) => {
    setExpandedSubs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 필터링: 보이는 메뉴만
  const filteredTeams = prefsLoaded
    ? navTeams
        .map((team) => ({
          ...team,
          subGroups: team.subGroups
            .map((sub) => ({
              ...sub,
              items: sub.items.filter((item) => isMenuVisible(item.href)),
            }))
            .filter((sub) => sub.items.length > 0),
        }))
        .filter((team) => team.subGroups.length > 0)
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
          collapsed ? "w-20" : "w-80"
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
        <nav className="flex-1 overflow-y-auto px-3 py-3 overflow-x-hidden">
          {filteredTeams.map((team) => {
            const isTeamOpen = expandedTeams[team.id];
            const isHighlight = team.highlight;
            const TeamIcon = team.icon;

            return (
              <div key={team.id} className="mb-1">
                {/* 팀 헤더 (큰 카테고리) */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
                      isHighlight
                        ? `${team.highlightBg} border ${team.highlightBorder} hover:brightness-110`
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <TeamIcon
                      size={15}
                      className={isHighlight ? team.highlightColor : "text-white/30"}
                      strokeWidth={isHighlight ? 2.2 : 1.8}
                    />
                    <span
                      className={`flex-1 text-left text-[12px] font-bold ${
                        isHighlight ? team.highlightColor : "text-white/35"
                      }`}
                    >
                      {team.label}
                    </span>
                    {team.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          team.id === "crm-automation"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {team.badge}
                      </span>
                    )}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${
                        isHighlight ? team.highlightColor! : "text-white/20"
                      } ${isTeamOpen ? "" : "-rotate-90"}`}
                    />
                  </button>
                ) : (
                  <div className="my-2 mx-3 h-px bg-white/[0.06]" />
                )}

                {/* 서브그룹 + 아이템 */}
                {(collapsed || isTeamOpen) && (
                  <div className={collapsed ? "" : "mt-0.5"}>
                    {team.subGroups.map((sub) => {
                      const subKey = `${team.id}-${sub.label}`;
                      const isSubOpen = expandedSubs[subKey];
                      const SubIcon = sub.icon;

                      // collapsed 모드: 아이템만 아이콘으로 표시
                      if (collapsed) {
                        return (
                          <div key={subKey}>
                            {sub.items.map((item) => {
                              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className={`flex items-center justify-center rounded-lg px-3 py-2 transition-all duration-200 ${
                                    isActive
                                      ? "bg-white/[0.08] text-white"
                                      : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                                  }`}
                                  title={item.label}
                                >
                                  <Icon size={18} strokeWidth={1.8} />
                                </Link>
                              );
                            })}
                          </div>
                        );
                      }

                      // 서브그룹이 1개이고 아이템도 적으면 바로 표시
                      if (team.subGroups.length === 1 && sub.items.length <= 3) {
                        return (
                          <div key={subKey} className="ml-1">
                            {sub.items.map((item) => {
                              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                                    isActive
                                      ? isHighlight
                                        ? `${team.highlightBg} ${team.highlightColor}`
                                        : "bg-white/[0.08] text-white"
                                      : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                                  }`}
                                >
                                  <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                                  <span>{item.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        );
                      }

                      // 서브그룹 헤더 (작은 카테고리)
                      return (
                        <div key={subKey} className="ml-1">
                          <button
                            onClick={() => toggleSub(subKey)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-white/25 hover:text-white/50 transition-colors"
                          >
                            <SubIcon size={12} className="shrink-0" />
                            <span className="flex-1 text-left text-[11px] font-semibold">
                              {sub.label}
                            </span>
                            <ChevronDown
                              size={10}
                              className={`transition-transform ${isSubOpen ? "" : "-rotate-90"}`}
                            />
                          </button>

                          {/* 세부 메뉴 아이템 */}
                          {isSubOpen && (
                            <ul className="ml-1 border-l border-white/[0.06] space-y-0.5">
                              {sub.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                                const Icon = item.icon;

                                return (
                                  <li key={item.href}>
                                    <Link
                                      href={item.href}
                                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                                        isActive
                                          ? isHighlight
                                            ? `${team.highlightBg} ${team.highlightColor}`
                                            : "bg-white/[0.08] text-white"
                                          : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                                      }`}
                                    >
                                      <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                                      <span>{item.label}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-white/[0.06] p-4">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
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
