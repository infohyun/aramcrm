"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Menu,
  LogOut,
  User,
  Settings,
  Command,
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import GlobalSearch from "./GlobalSearch";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/customers": "고객 관리",
  "/communications": "커뮤니케이션",
  "/voc": "고객의 소리",
  "/service": "AS 관리",
  "/inventory": "재고/물류 관리",
  "/shipments": "배송 관리",
  "/faq": "FAQ 관리",
  "/import-export": "데이터 관리",
  "/integrations": "외부 연동",
  "/settings": "설정",
  "/board": "공지사항",
  "/projects": "프로젝트",
  "/approvals": "결재",
  "/calendar": "캘린더",
  "/documents": "문서함",
  "/meetings": "회의",
  "/wiki": "위키",
  "/chat": "메시지",
  "/reports": "리포트",
  "/sales": "영업 파이프라인",
  "/ai-cs": "AI 고객지원",
  "/campaigns": "이메일 캠페인",
  "/automation": "업무 자동화",
  "/audit-logs": "감사 로그",
  "/orders": "주문 관리",
  "/kpi": "KPI 관리",
  "/contracts": "계약 관리",
  "/sla": "SLA 관리",
  "/report-builder": "커스텀 리포트",
  "/follow-ups": "팔로업 리마인더",
  "/activity-feed": "팀 활동 피드",
  "/customer-health": "고객 건강 점수",
  "/products": "제품 카탈로그",
  "/quotes": "견적서 관리",
  "/surveys": "설문조사",
  "/time-tracking": "타임 트래킹",
  "/territories": "영업 지역 관리",
  "/competitors": "경쟁사 추적",
  "/directory": "직원 디렉토리",
  "/portal": "고객 포탈",
  "/okr": "OKR 목표 관리",
  "/expenses": "경비 관리",
  "/customer-journey": "고객 여정 맵",
  "/inventory-alerts": "재고 알림",
  "/report-schedules": "리포트 스케줄",
  "/nps": "NPS 대시보드",
  "/workflow-builder": "워크플로우 빌더",
  "/scheduler": "미팅 스케줄러",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }
  return "대시보드";
}

export default function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  const user = session?.user;
  const userName = user?.name || "사용자";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0);
  const userDept = (user as Record<string, unknown>)?.departmentName as string || (user as Record<string, unknown>)?.department as string || "";

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#ebebeb] bg-white px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button className="rounded-md p-1.5 text-[#999999] hover:text-[#555555] lg:hidden">
            <Menu size={18} />
          </button>
          <h1 className="text-[15px] font-semibold text-[#111111]">{pageTitle}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Global Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="relative hidden md:flex items-center gap-2 h-8 w-56 rounded-lg border border-[#e5e5e5] bg-[#f7f7f8] px-3 text-[13px] text-[#bbbbbb] hover:border-[#ccc] transition-all"
          >
            <Search size={15} />
            <span>검색...</span>
            <kbd className="ml-auto flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">
              <Command size={10} />K
            </kbd>
          </button>

          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden rounded-lg p-2 text-[#999999] hover:text-[#555555]"
          >
            <Search size={18} />
          </button>

          {/* Notification center */}
          <NotificationCenter />

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f7f7f8]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111111] text-[11px] font-medium text-white">
                {userInitial}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-[13px] font-medium text-[#333333]">{userName}</p>
                {userDept && (
                  <p className="text-[10px] text-[#999999]">{userDept}</p>
                )}
              </div>
              <ChevronDown size={13} className="text-[#bbbbbb]" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-1.5 w-48 overflow-hidden rounded-xl border border-[#ebebeb] bg-white py-1 shadow-[0_8px_24px_0_rgb(0_0_0/0.06)]">
                  <div className="border-b border-[#f0f0f0] px-4 py-2.5">
                    <p className="text-[13px] font-medium text-[#111111]">{userName}</p>
                    <p className="text-[11px] text-[#999999]">{userEmail}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#555555] hover:bg-[#f7f7f8]"
                  >
                    <User size={15} />
                    <span>내 프로필</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#555555] hover:bg-[#f7f7f8]"
                  >
                    <Settings size={15} />
                    <span>설정</span>
                  </Link>
                  <div className="border-t border-[#f0f0f0]">
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#ef4444] hover:bg-red-50/50"
                    >
                      <LogOut size={15} />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
