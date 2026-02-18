'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, ArrowRight, Pin, Eye } from 'lucide-react';

interface PostItem {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  viewCount: number;
  author: { name: string };
  createdAt: string;
}

export default function NoticesWidget() {
  const [posts, setPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/board?limit=5&category=notice');
        if (res.ok) {
          const data = await res.json();
          setPosts((data.data || data).slice(0, 5));
        }
      } catch {}
    };
    fetch_();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">공지사항</h3>
        <Link href="/board" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          전체 보기 <ArrowRight size={12} />
        </Link>
      </div>
      {posts.length === 0 ? (
        <div className="text-center py-4">
          <Megaphone size={24} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">공지사항이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1">
          {posts.map((post) => (
            <Link key={post.id} href={`/board/${post.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              {post.isPinned && <Pin size={12} className="text-red-400 shrink-0" />}
              <p className="text-sm text-gray-700 truncate flex-1">{post.title}</p>
              <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                <Eye size={10} />{post.viewCount}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
