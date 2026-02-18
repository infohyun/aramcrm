'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight, MapPin, Clock } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  location: string | null;
  allDay: boolean;
}

const typeColors: Record<string, string> = {
  schedule: 'bg-blue-500',
  meeting: 'bg-purple-500',
  deadline: 'bg-red-500',
  holiday: 'bg-green-500',
  personal: 'bg-gray-500',
};

export default function CalendarWidget() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);
        const res = await fetch(
          `/api/calendar?startDate=${today.toISOString()}&endDate=${endDate.toISOString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvents((data.data || data).slice(0, 5));
        }
      } catch {}
    };
    fetch_();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">이번 주 일정</h3>
        <Link href="/calendar" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          전체 보기 <ArrowRight size={12} />
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="text-center py-4">
          <Calendar size={24} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">이번 주 일정이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColors[event.type] || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{event.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(event.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    {!event.allDay && ` ${new Date(event.startDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                  {event.location && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
