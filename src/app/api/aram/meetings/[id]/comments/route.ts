import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleMeeting, isAdmin, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';
import { broadcastNotification } from '@/lib/notification-dispatcher';

type Params = { params: Promise<{ id: string }> };

// POST /api/aram/meetings/[id]/comments - 팀원 댓글 (@이름 멘션 시 알림)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    const { content, segmentId } = await request.json();
    if (!content?.trim()) return badRequest('내용을 입력하세요.');

    const comment = await prisma.aramComment.create({
      data: { meetingId: id, userId: user.id, content: content.trim(), segmentId: segmentId || null },
      include: { user: { select: { id: true, name: true } } },
    });

    const mentioned = [...content.matchAll(/@([\p{L}\p{N}_]+)/gu)].map((m) => m[1]);
    const recipients = new Set<string>();
    if (meeting.ownerId !== user.id) recipients.add(meeting.ownerId);
    if (mentioned.length) {
      const users = await prisma.user.findMany({ where: { name: { in: mentioned } }, select: { id: true } });
      users.forEach((u) => u.id !== user.id && recipients.add(u.id));
    }
    if (recipients.size) {
      await broadcastNotification(
        [...recipients],
        'mention',
        `아람: ${user.name}님의 댓글`,
        `${meeting.title} — ${content.slice(0, 80)}`,
        `/aram/meetings/${id}`
      );
    }
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return serverError(error, '댓글을 등록하지 못했습니다.');
  }
}

// DELETE /api/aram/meetings/[id]/comments?commentId=
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const commentId = request.nextUrl.searchParams.get('commentId');
    const comment = await prisma.aramComment.findFirst({ where: { id: commentId ?? '', meetingId: id } });
    if (!comment) return notFound('댓글');
    if (comment.userId !== user.id && !isAdmin(user)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    await prisma.aramComment.delete({ where: { id: comment.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '댓글을 삭제하지 못했습니다.');
  }
}
