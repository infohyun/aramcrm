'use client';

import Link from 'next/link';
import {
  Plus, Send, ClipboardList, Wrench, FolderKanban,
  ClipboardCheck, Calendar, FileText, ArrowRight,
} from 'lucide-react';

const actions = [
  { label: '고객 등록', icon: Plus, href: '/customers/new', color: 'bg-blue-50 text-blue-600' },
  { label: '메시지 발송', icon: Send, href: '/communications', color: 'bg-green-50 text-green-600' },
  { label: 'VOC 등록', icon: ClipboardList, href: '/voc', color: 'bg-amber-50 text-amber-600' },
  { label: 'AS 접수', icon: Wrench, href: '/service', color: 'bg-orange-50 text-orange-600' },
  { label: '프로젝트', icon: FolderKanban, href: '/projects/new', color: 'bg-indigo-50 text-indigo-600' },
  { label: '결재 요청', icon: ClipboardCheck, href: '/approvals/new', color: 'bg-purple-50 text-purple-600' },
  { label: '일정 등록', icon: Calendar, href: '/calendar', color: 'bg-pink-50 text-pink-600' },
  { label: '글 작성', icon: FileText, href: '/board/new', color: 'bg-emerald-50 text-emerald-600' },
];

export default function QuickActionsWidget() {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">빠른 실행</h3>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-105 transition-transform`}>
                <Icon size={18} />
              </div>
              <span className="text-xs text-gray-600 font-medium">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
