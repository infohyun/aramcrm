import { NextRequest, NextResponse } from 'next/server';
import { getAramUser, unauthorized, badRequest, serverError } from '@/lib/aram/access';
import { aramJSON, S } from '@/lib/aram/ai';
import type { ContactInput } from '@/lib/aram/contacts';
import { saveCardImage } from '@/lib/aram/storage';

export const maxDuration = 120;

const MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

// POST /api/aram/contacts/ocr (form: file) - 명함 사진 → 연락처 필드 (모든 언어)
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return badRequest('명함 이미지를 첨부하세요.');
    const mediaType = MEDIA.find((m) => m === file.type);
    if (!mediaType) return badRequest('JPG, PNG, WEBP 이미지만 지원합니다.');
    if (file.size > 10 * 1024 * 1024) return badRequest('이미지는 10MB 이하여야 합니다.');

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await aramJSON<{ contacts: (ContactInput & { confidence: string })[] }>({
      system: `명함 인식 전문가입니다. 이미지의 명함(여러 장 또는 앞뒤면 가능)에서 정보를 정확히 추출합니다.
모든 언어를 지원합니다. 원문 표기를 유지하고, 다른 언어 표기가 함께 있으면 nameEn 에 로마자 이름을 넣으세요.
country 는 주소/전화 국가번호로 추정한 국가명(한국어), language 는 명함 주 언어 ISO 코드. 없는 값은 null.`,
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } },
        { type: 'text', text: '이 명함의 연락처 정보를 추출하세요.' },
      ],
      schema: S.obj({
        contacts: S.arr(
          S.obj({
            name: S.nullableStr(), nameEn: S.nullableStr(), company: S.nullableStr(), department: S.nullableStr(),
            position: S.nullableStr(), email: S.nullableStr(), email2: S.nullableStr(), phone: S.nullableStr(),
            mobile: S.nullableStr(), fax: S.nullableStr(), address: S.nullableStr(), website: S.nullableStr(),
            country: S.nullableStr(), language: S.nullableStr(), tags: S.nullableStr(), memo: S.nullableStr(),
            confidence: S.enumOf(['high', 'medium', 'low']),
          })
        ),
      }),
      effort: 'low',
    });

    // 명함 원본 이미지 보관 (비공개 저장소, 인증 후 열람)
    const cardImageUrl = await saveCardImage(buffer, mediaType.split('/')[1]);
    return NextResponse.json({ contacts: result.contacts, cardImageUrl });
  } catch (error) {
    return serverError(error, '명함 인식에 실패했습니다.');
  }
}
