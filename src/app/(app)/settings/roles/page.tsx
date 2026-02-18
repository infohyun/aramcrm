'use client';

import { useState, useEffect } from 'react';
import { Shield, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  level: number;
  isSystem: boolean;
  _count: { users: number };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const res = await fetch('/api/roles');
      if (res.ok) setRoles(await res.json());
      setLoading(false);
    };
    fetchRoles();
  }, []);

  const levelColors: Record<number, 'danger' | 'warning' | 'info' | 'default'> = {
    100: 'danger',
    80: 'warning',
    60: 'info',
    20: 'default',
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">역할/권한 관리</h2>
        <p className="text-sm text-gray-500 mt-1">시스템 역할과 권한을 관리합니다</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Shield size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-400">{role.code}</p>
                </div>
              </div>
              <Badge variant={levelColors[role.level] || 'default'}>Lv.{role.level}</Badge>
            </div>
            {role.description && <p className="text-sm text-gray-500 mb-3">{role.description}</p>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users size={14} />
                <span>{role._count.users}명 사용</span>
              </div>
              {role.isSystem && (
                <Badge variant="outline" size="sm">시스템 역할</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
