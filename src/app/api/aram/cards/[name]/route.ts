import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { getAramUser, unauthorized, notFound } from '@/lib/aram/access';
import { cardPath } from '@/lib/aram/storage';

const TYPES: Record<string, string> = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

// GET /api/aram/cards/[name] - 명함 원본 이미지 (로그인 사용자만)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getAramUser())) return unauthorized();
  const { name } = await params;
  try {
    const data = await readFile(cardPath(name));
    const ext = name.split('.').pop()?.toLowerCase() ?? 'jpeg';
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' },
    });
  } catch {
    return notFound('이미지');
  }
}
