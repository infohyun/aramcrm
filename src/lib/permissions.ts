// 권한 체크 유틸리티
export const MODULES = [
  'dashboard', 'board', 'projects', 'approvals', 'calendar',
  'customers', 'communications', 'voc',
  'service', 'inventory', 'shipments', 'faq',
  'documents', 'meetings', 'wiki', 'chat', 'reports', 'sales',
  'settings', 'import-export', 'integrations',
  'ai-cs',
] as const;

export type Module = (typeof MODULES)[number];
export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage';

export interface UserPermission {
  module: string;
  action: string;
}

export function hasPermission(
  permissions: UserPermission[],
  module: string,
  action: Action
): boolean {
  return permissions.some(
    (p) =>
      (p.module === module && (p.action === action || p.action === 'manage')) ||
      (p.module === '*' && p.action === 'manage')
  );
}

export function hasModuleAccess(permissions: UserPermission[], module: string): boolean {
  return permissions.some(
    (p) => p.module === module || p.module === '*'
  );
}

// 역할 레벨 기반 빠른 체크
export function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'system_admin';
}

export function isManager(role: string): boolean {
  return role === 'admin' || role === 'system_admin' || role === 'manager' || role === 'dept_head' || role === 'team_lead';
}

// 부서 코드 목록
export const DEPARTMENTS = [
  { code: 'sales', name: '세일즈' },
  { code: 'research', name: '연구' },
  { code: 'domestic', name: '국내사업' },
  { code: 'overseas', name: '해외사업' },
  { code: 'management', name: '경영관리' },
  { code: 'marketing', name: '마케팅' },
  { code: 'design', name: '디자인' },
  { code: 'production', name: '생산' },
  { code: 'as', name: 'AS' },
  { code: 'quality', name: '품질' },
  { code: 'qa', name: 'QA' },
] as const;

export const ROLES = [
  { code: 'system_admin', name: '시스템관리자', level: 100 },
  { code: 'dept_head', name: '부서장', level: 80 },
  { code: 'team_lead', name: '팀장', level: 60 },
  { code: 'staff', name: '직원', level: 20 },
] as const;
