"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ear, Mic, ListChecks, Contact, MessageCircleQuestion, LineChart, Settings2, FileAudio } from "lucide-react";

export const ARAM_NAV = [
  { href: "/aram", label: "홈", icon: Ear, exact: true },
  { href: "/aram/record", label: "새 미팅", icon: Mic },
  { href: "/aram/meetings", label: "미팅 노트", icon: FileAudio },
  { href: "/aram/actions", label: "할 일", icon: ListChecks },
  { href: "/aram/contacts", label: "명함첩", icon: Contact },
  { href: "/aram/ask", label: "Ask 아람", icon: MessageCircleQuestion },
  { href: "/aram/insights", label: "사업 인사이트", icon: LineChart },
  { href: "/aram/settings", label: "설정", icon: Settings2 },
];

// 아람 모듈 공통 헤더 + 탭 네비게이션
export default function AramNav({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Ear className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white break-words">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {ARAM_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
