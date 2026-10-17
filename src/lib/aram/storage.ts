// 녹음 파일 저장소 - public 폴더가 아닌 비공개 경로에 저장하고 인증된 API로만 제공
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const ROOT = process.env.ARAM_STORAGE_DIR || path.join(process.cwd(), 'storage', 'aram');

export async function saveAudio(meetingId: string, buffer: Buffer, ext: string): Promise<string> {
  await mkdir(ROOT, { recursive: true });
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'webm';
  const name = `${meetingId}_${Date.now()}.${safeExt}`;
  await writeFile(path.join(ROOT, name), buffer);
  return name;
}

export function audioPath(name: string): string {
  return path.join(ROOT, path.basename(name));
}

export function extFromMime(mime: string, fileName?: string): string {
  const fromName = fileName?.split('.').pop();
  if (fromName && fromName.length <= 5 && fromName !== fileName) return fromName.toLowerCase();
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

const CARD_ROOT = path.join(ROOT, 'cards');

export async function saveCardImage(buffer: Buffer, ext: string): Promise<string> {
  await mkdir(CARD_ROOT, { recursive: true });
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext.replace(/[^a-z0-9]/gi, '')}`;
  await writeFile(path.join(CARD_ROOT, name), buffer);
  return `/api/aram/cards/${name}`;
}

export function cardPath(name: string): string {
  return path.join(CARD_ROOT, path.basename(name));
}
