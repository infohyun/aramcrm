import { NextResponse } from 'next/server';
import { getAramUser, unauthorized } from '@/lib/aram/access';
import { availableSttProvider } from '@/lib/aram/stt';
import { isAramAIEnabled, ARAM_MODEL } from '@/lib/aram/ai';

// GET /api/aram/config - 클라이언트가 사용할 기능 가용성
export async function GET() {
  if (!(await getAramUser())) return unauthorized();
  return NextResponse.json({
    ai: isAramAIEnabled(),
    model: ARAM_MODEL,
    stt: availableSttProvider(), // deepgram | openai | browser
    diarization: availableSttProvider() === 'deepgram' ? 'server' : 'ai',
    smtp: !!process.env.SMTP_USER,
    cron: !!process.env.CRON_SECRET,
  });
}
