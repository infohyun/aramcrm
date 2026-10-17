import { NextRequest, NextResponse } from 'next/server';
import { getAramUser, findAccessibleMeeting, canEditMeeting, unauthorized, notFound, serverError } from '@/lib/aram/access';
import { analyzeMeeting } from '@/lib/aram/analyze';
import prisma from '@/lib/prisma';

export const maxDuration = 300;

// POST /api/aram/meetings/[id]/analyze - AI 요약·액션·사업 전망 (재)생성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    if (!canEditMeeting(user, meeting)) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    if (body.template || body.summaryLanguage || 'customPrompt' in body) {
      await prisma.aramMeeting.update({
        where: { id },
        data: {
          ...(body.template ? { template: body.template } : {}),
          ...(body.summaryLanguage ? { summaryLanguage: body.summaryLanguage } : {}),
          ...('customPrompt' in body ? { customPrompt: body.customPrompt || null } : {}),
        },
      });
    }
    await analyzeMeeting(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, 'AI 분석에 실패했습니다.');
  }
}
