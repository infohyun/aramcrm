'use client';

import { useState, useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Bell, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNotificationStore as useNS } from '@/stores/notificationStore';

const typeColors: Record<string, string> = {
  approval: 'bg-indigo-500',
  task: 'bg-blue-500',
  mention: 'bg-amber-500',
  system: 'bg-gray-500',
  board: 'bg-emerald-500',
  meeting: 'bg-purple-500',
  calendar: 'bg-pink-500',
};

export default function RecentActivityWidget() {
  const { notifications } = useNS();
  const [activities, setActivities] = useState(notifications.slice(0, 8));

  useEffect(() => {
    setActivities(notifications.slice(0, 8));
  }, [notifications]);

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">최근 활동</h3>
        <a href="/board" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          전체 보기 <ArrowRight size={12} />
        </a>
      </div>
      {activities.length === 0 ? (
        <div className="text-center py-6">
          <Bell size={24} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">최근 활동이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColors[n.type] || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{n.title}</p>
                <p className="text-xs text-gray-400 truncate">{n.message}</p>
              </div>
              <span className="text-[10px] text-gray-300 shrink-0">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ko })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
