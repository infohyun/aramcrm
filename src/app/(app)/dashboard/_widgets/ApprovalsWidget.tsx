'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ApprovalItem {
  id: string;
  title: string;
  type: string;
  status: string;
  requester: { name: string };
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  leave: '휴가', purchase: '구매', travel: '출장', expense: '경비', general: '일반',
};

export default function ApprovalsWidget() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/approvals?role=approver&status=pending&limit=5');
        if (res.ok) {
          const data = await res.json();
          setApprovals((data.data || data).slice(0, 5));
        }
      } catch {}
    };
    fetch_();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">결재 대기</h3>
        <Link href="/approvals" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          전체 보기 <ArrowRight size={12} />
        </Link>
      </div>
      {approvals.length === 0 ? (
        <div className="text-center py-4">
          <ClipboardCheck size={24} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">대기 중인 결재가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {approvals.map((item) => (
            <Link key={item.id} href={`/approvals/${item.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Badge variant="primary" size="sm">{typeLabels[item.type] || item.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{item.title}</p>
                <p className="text-xs text-gray-400">{item.requester?.name}</p>
              </div>
              <Clock size={12} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
