'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UsersRound,
  Search,
  Mail,
  Phone,
  Building2,
  GitBranchPlus,
  LayoutGrid,
} from 'lucide-react';

interface DirectoryDepartment {
  id: string;
  name: string;
  code: string;
}

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  avatar: string | null;
  bio: string | null;
  department: string | null;
  departmentId: string | null;
  departmentRef: DirectoryDepartment | null;
}

interface DepartmentFilter {
  id: string;
  name: string;
  code: string;
  userCount: number;
}

// 부서별 아바타 색상
const DEPT_COLORS: Record<string, string> = {
  DEV: 'bg-blue-100 text-blue-700',
  SALES: 'bg-emerald-100 text-emerald-700',
  HR: 'bg-pink-100 text-pink-700',
  MKT: 'bg-amber-100 text-amber-700',
  FIN: 'bg-violet-100 text-violet-700',
  CS: 'bg-teal-100 text-teal-700',
  MGMT: 'bg-rose-100 text-rose-700',
  OPS: 'bg-cyan-100 text-cyan-700',
};

const DEFAULT_AVATAR_COLOR = 'bg-indigo-100 text-indigo-700';

function getAvatarColor(deptCode: string | null | undefined): string {
  if (!deptCode) return DEFAULT_AVATAR_COLOR;
  return DEPT_COLORS[deptCode] || DEFAULT_AVATAR_COLOR;
}

// 역할 배지 스타일
const ROLE_BADGE_STYLES: Record<string, string> = {
  staff: 'bg-gray-100 text-gray-600',
  team_lead: 'bg-blue-100 text-blue-700',
  dept_head: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-amber-100 text-amber-700',
};

const ROLE_LABELS: Record<string, string> = {
  staff: '직원',
  team_lead: '팀장',
  dept_head: '부서장',
  admin: '관리자',
  manager: '매니저',
};

export default function DirectoryPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'org'>('grid');
  const [totalCount, setTotalCount] = useState(0);

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedDeptId) params.set('departmentId', selectedDeptId);

      const res = await fetch(`/api/directory?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch directory');

      const data = await res.json();
      setUsers(data.users);
      setDepartments(data.departments);
      setTotalCount(data.total);
    } catch (error) {
      console.error('직원 디렉토리 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedDeptId]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // 전체 직원 수 (모든 부서 합산)
  const allUsersCount = departments.reduce((sum, d) => sum + d.userCount, 0);

  // 부서별 그룹핑 (조직도 뷰용)
  const groupedByDept = users.reduce<Record<string, DirectoryUser[]>>((acc, user) => {
    const deptName = user.departmentRef?.name || '미배정';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(user);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UsersRound className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">직원 디렉토리</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  총 {totalCount}명의 직원
                </p>
              </div>
            </div>
            {/* 뷰 토글 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                카드
              </button>
              <button
                onClick={() => setViewMode('org')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'org'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <GitBranchPlus className="w-4 h-4" />
                조직도
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* 좌측 사이드바: 부서 필터 */}
          <div className="w-60 flex-shrink-0 hidden md:block">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-3 sticky top-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                부서 필터
              </h3>
              <div className="space-y-0.5">
                {/* 전체 버튼 */}
                <button
                  onClick={() => setSelectedDeptId('')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    selectedDeptId === ''
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>전체</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedDeptId === ''
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {allUsersCount}
                  </span>
                </button>

                {/* 부서별 버튼 */}
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      selectedDeptId === dept.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{dept.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        selectedDeptId === dept.id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {dept.userCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 메인 컨텐츠 영역 */}
          <div className="flex-1 min-w-0">
            {/* 검색바 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름, 이메일, 부서로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow"
                />
              </div>
              {/* 모바일 부서 필터 */}
              <div className="flex flex-wrap gap-2 mt-3 md:hidden">
                <button
                  onClick={() => setSelectedDeptId('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedDeptId === ''
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  전체 ({allUsersCount})
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedDeptId === dept.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {dept.name} ({dept.userCount})
                  </button>
                ))}
              </div>
            </div>

            {/* 로딩 상태 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">로딩 중...</p>
                </div>
              </div>
            ) : users.length === 0 ? (
              /* 빈 상태 */
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <UsersRound className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  직원을 찾을 수 없습니다
                </h3>
                <p className="text-sm text-gray-500">
                  {search || selectedDeptId
                    ? '검색 조건에 맞는 직원이 없습니다. 필터를 변경해 보세요.'
                    : '등록된 직원이 없습니다.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* 카드 그리드 뷰 */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <EmployeeCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              /* 조직도 뷰 */
              <div className="space-y-6">
                {Object.entries(groupedByDept).map(([deptName, deptUsers]) => (
                  <div key={deptName}>
                    {/* 부서 헤더 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-900">{deptName}</span>
                        <span className="text-xs text-gray-400 ml-1">{deptUsers.length}명</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    {/* 부서 직원 카드 (들여쓰기) */}
                    <div className="ml-6 border-l-2 border-indigo-100 pl-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deptUsers.map((user) => (
                          <EmployeeCard key={user.id} user={user} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 직원 카드 컴포넌트
function EmployeeCard({ user }: { user: DirectoryUser }) {
  const avatarColor = getAvatarColor(user.departmentRef?.code);
  const roleBadgeStyle = ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_STYLES.staff;
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5 hover:shadow-md hover:border-gray-200 transition-all">
      <div className="flex items-start gap-4">
        {/* 아바타 */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0 ${avatarColor}`}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            user.name.charAt(0)
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold text-gray-900 truncate">{user.name}</h3>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${roleBadgeStyle}`}
            >
              {roleLabel}
            </span>
          </div>
          {user.position && (
            <p className="text-sm text-gray-500 mb-2">{user.position}</p>
          )}
          {user.departmentRef && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium mb-3">
              <Building2 className="w-3 h-3" />
              {user.departmentRef.name}
            </span>
          )}
        </div>
      </div>

      {/* 연락처 */}
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
        {user.email && (
          <a
            href={`mailto:${user.email}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors group"
          >
            <Mail className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </a>
        )}
        {user.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{user.phone}</span>
          </div>
        )}
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="mt-3 text-xs text-gray-400 line-clamp-2 leading-relaxed">
          {user.bio}
        </p>
      )}
    </div>
  );
}
