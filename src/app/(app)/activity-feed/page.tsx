"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Users, ShoppingBag, Wrench, Headphones, Megaphone,
  CheckCircle, Shield, Loader2, RefreshCw,
} from "lucide-react";

interface FeedItem {
  type: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  color: string;
  href?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  users: Users,
  "shopping-bag": ShoppingBag,
  wrench: Wrench,
  headphones: Headphones,
  megaphone: Megaphone,
  "check-circle": CheckCircle,
  shield: Shield,
};

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-purple-100 text-purple-600",
  indigo: "bg-indigo-100 text-indigo-600",
  red: "bg-red-100 text-red-600",
  gray: "bg-gray-100 text-gray-600",
};

export default function ActivityFeedPage() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity-feed?limit=100");
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeed(); }, []);

  const formatTime = (t: string) => {
    const diff = (Date.now() - new Date(t).getTime()) / 1000;
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return new Date(t).toLocaleDateString("ko-KR");
  };

  // Group by date
  const grouped: Record<string, FeedItem[]> = {};
  for (const item of feed) {
    const date = new Date(item.time).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg"><Activity className="w-6 h-6 text-cyan-600" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">팀 활동 피드</h1>
                <p className="text-sm text-gray-500 mt-0.5">최근 7일간 전사 활동 내역</p>
              </div>
            </div>
            <button onClick={fetchFeed} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" />새로고침</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : feed.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border"><Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">최근 활동이 없습니다</p></div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-gray-50 py-1">{date}</h3>
                <div className="space-y-1">
                  {items.map((item, i) => {
                    const Icon = ICON_MAP[item.icon] || Activity;
                    const colorClass = COLOR_MAP[item.color] || COLOR_MAP.gray;
                    return (
                      <div
                        key={i}
                        onClick={() => item.href && router.push(item.href)}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 transition-all ${item.href ? "hover:shadow-sm cursor-pointer hover:border-gray-200" : ""}`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{item.title}</p>
                          {item.subtitle && <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatTime(item.time)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
