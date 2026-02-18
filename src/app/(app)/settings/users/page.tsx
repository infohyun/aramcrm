'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  departmentRef: { name: string; code: string } | null;
  roleRef: { name: string; code: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/users${params}`);
      if (res.ok) setUsers(await res.json());
      setLoading(false);
    };
    fetchUsers();
  }, [search]);

  const roleColors: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    admin: 'danger',
    manager: 'warning',
    staff: 'info',
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">사용자 관리</h2>
          <p className="text-sm text-gray-500 mt-1">전체 {users.length}명의 사용자</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 이메일 검색..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-[var(--card-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">사용자</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">부서</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">직급</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">역할</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.departmentRef?.name || user.department || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.position || '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={roleColors[user.role] || 'default'}>
                    <Shield size={12} className="mr-0.5" />
                    {user.roleRef?.name || user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? 'success' : 'default'} dot>
                    {user.isActive ? '활성' : '비활성'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
