// 아람 접근 제어 - 미팅 공개 범위 (개인 / 팀 / 전사)
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export interface AramUser {
  id: string;
  name: string;
  role: string;
  departmentId: string | null;
}

export async function getAramUser(): Promise<AramUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = session.user as unknown as Record<string, unknown>;
  return {
    id: session.user.id,
    name: (session.user.name as string) || '',
    role: (u.role as string) || 'staff',
    departmentId: (u.departmentId as string) || null,
  };
}

export function isAdmin(user: AramUser): boolean {
  return user.role === 'admin';
}

// 사용자가 볼 수 있는 미팅 조건
export function meetingAccessWhere(user: AramUser): Prisma.AramMeetingWhereInput {
  if (isAdmin(user)) return {};
  const or: Prisma.AramMeetingWhereInput[] = [
    { ownerId: user.id },
    { visibility: 'company' },
    { speakers: { some: { userId: user.id } } },
    { actionItems: { some: { assigneeId: user.id } } },
  ];
  if (user.departmentId) {
    or.push({ visibility: 'team', departmentId: user.departmentId });
  }
  return { OR: or };
}

export function contactAccessWhere(user: AramUser): Prisma.ContactWhereInput {
  if (isAdmin(user)) return {};
  return { OR: [{ ownerId: user.id }, { visibility: 'company' }] };
}

export async function findAccessibleMeeting(user: AramUser, id: string) {
  return prisma.aramMeeting.findFirst({ where: { AND: [{ id }, meetingAccessWhere(user)] } });
}

export function canEditMeeting(user: AramUser, meeting: { ownerId: string; visibility: string }): boolean {
  // 소유자·관리자는 항상, 공유 미팅은 열람 가능한 동료도 정리·편집에 참여 가능
  return isAdmin(user) || meeting.ownerId === user.id || meeting.visibility !== 'private';
}

export async function findAccessibleContact(user: AramUser, id: string) {
  return prisma.contact.findFirst({ where: { AND: [{ id }, contactAccessWhere(user)] } });
}

export const unauthorized = () =>
  Response.json({ error: '인증이 필요합니다.' }, { status: 401 });
export const notFound = (what = '항목') =>
  Response.json({ error: `${what}을(를) 찾을 수 없습니다.` }, { status: 404 });
export const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });

export function serverError(error: unknown, fallback: string) {
  console.error(fallback, error);
  const message = error instanceof Error && error.name === 'AramAIError' ? error.message : fallback;
  return Response.json({ error: message }, { status: 500 });
}
