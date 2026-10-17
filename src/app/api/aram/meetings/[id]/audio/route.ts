import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleMeeting, canEditMeeting, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';
import { saveAudio, audioPath, extFromMime } from '@/lib/aram/storage';
import { transcribeAudio, availableSttProvider } from '@/lib/aram/stt';
import { saveTranscript, analyzeMeeting } from '@/lib/aram/analyze';
import { toShortCode } from '@/lib/aram/languages';

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 500 * 1024 * 1024;

// POST /api/aram/meetings/[id]/audio - 녹음 업로드 → 서버 전사(화자분리) → AI 분석
// form fields: file, durationSec?, liveTranscript?(JSON, 서버 전사 불가 시 사용), analyze?("true")
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    if (!canEditMeeting(user, meeting)) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const form = await request.formData();
    const file = form.get('file') as File | null;
    const live = form.get('liveTranscript') as string | null;
    const durationSec = parseInt((form.get('durationSec') as string) || '0') || 0;
    const shouldAnalyze = form.get('analyze') !== 'false';

    if (!file && !live) return badRequest('녹음 파일 또는 전사 내용이 필요합니다.');
    if (file && file.size > MAX_BYTES) return badRequest('파일 크기는 500MB 이하여야 합니다.');

    let audioName: string | null = meeting.audioUrl;
    let buffer: Buffer | null = null;
    if (file && file.size > 0) {
      buffer = Buffer.from(await file.arrayBuffer());
      audioName = await saveAudio(id, buffer, extFromMime(file.type, file.name));
    }

    await prisma.aramMeeting.update({
      where: { id },
      data: {
        audioUrl: audioName,
        audioMimeType: file?.type || meeting.audioMimeType,
        status: 'transcribing',
        endedAt: meeting.endedAt ?? new Date(),
        durationSec: durationSec || meeting.durationSec,
      },
    });

    // 1) 서버 전사 (Deepgram/Whisper) - 화자 분리 + 다국어 자동 감지
    let usedServer = false;
    if (buffer && availableSttProvider() !== 'browser') {
      try {
        const glossary = (await prisma.aramGlossary.findMany({ select: { term: true } })).map((g) => g.term);
        const result = await transcribeAudio({
          audio: buffer,
          mimeType: file!.type,
          fileName: file!.name || 'audio.webm',
          language: toShortCode(meeting.language),
          glossary: ['아람휴비스', 'ARAM HUVIS', ...glossary],
        });
        if (result && result.segments.length) {
          await saveTranscript(id, result.segments);
          await prisma.aramMeeting.update({
            where: { id },
            data: {
              detectedLanguages: result.languages.join(','),
              durationSec: result.durationSec || durationSec || meeting.durationSec,
            },
          });
          usedServer = true;
        }
      } catch (e) {
        console.error('server STT failed, falling back to live transcript', e);
      }
    }

    // 2) 서버 전사 불가 시 브라우저 실시간 전사 사용
    if (!usedServer && live) {
      const segments = JSON.parse(live);
      if (Array.isArray(segments) && segments.length) await saveTranscript(id, segments);
    }

    const segmentCount = await prisma.aramSegment.count({ where: { meetingId: id } });
    if (segmentCount === 0) {
      await prisma.aramMeeting.update({
        where: { id },
        data: {
          status: 'failed',
          errorMessage:
            availableSttProvider() === 'browser'
              ? '전사된 내용이 없습니다. 서버 전사(DEEPGRAM_API_KEY 또는 OPENAI_API_KEY)를 설정하거나 Chrome 실시간 전사를 사용하세요.'
              : '음성에서 인식된 내용이 없습니다.',
        },
      });
      return NextResponse.json({ status: 'failed', usedServer });
    }

    if (shouldAnalyze) {
      await analyzeMeeting(id, user.id);
    } else {
      await prisma.aramMeeting.update({ where: { id }, data: { status: 'draft' } });
    }
    return NextResponse.json({ status: shouldAnalyze ? 'ready' : 'draft', usedServer, segmentCount });
  } catch (error) {
    return serverError(error, '녹음을 처리하지 못했습니다.');
  }
}

// GET /api/aram/meetings/[id]/audio - 녹음 재생 (Range 지원)
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAramUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const meeting = await findAccessibleMeeting(user, id);
  if (!meeting?.audioUrl) return notFound('녹음');

  try {
    const file = audioPath(meeting.audioUrl);
    const { size } = await stat(file);
    const type = meeting.audioMimeType || 'audio/webm';
    const range = request.headers.get('range');
    const data = await readFile(file);

    if (range) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = parseInt(s, 10) || 0;
      const end = e ? Math.min(parseInt(e, 10), size - 1) : size - 1;
      return new Response(new Uint8Array(data.subarray(start, end + 1)), {
        status: 206,
        headers: {
          'Content-Type': type,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return notFound('녹음 파일');
  }
}
