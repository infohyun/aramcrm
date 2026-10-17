// 명함 필드 정규화 + 리멤버/CSV/vCard 가져오기 매핑 (서버·클라이언트 공용)

export const CONTACT_FIELDS = [
  'name', 'nameEn', 'company', 'department', 'position', 'email', 'email2', 'phone', 'mobile', 'fax',
  'address', 'website', 'country', 'language', 'tags', 'memo',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactInput = Partial<Record<ContactField, string | null>>;

export const CONTACT_FIELD_LABELS: Record<ContactField, string> = {
  name: '이름', nameEn: '영문 이름', company: '회사', department: '부서', position: '직책', email: '이메일',
  email2: '이메일2', phone: '회사 전화', mobile: '휴대폰', fax: '팩스', address: '주소', website: '홈페이지',
  country: '국가', language: '언어', tags: '태그', memo: '메모',
};

// 리멤버 엑셀 내보내기 / 구글·아웃룩 CSV / 일반 엑셀 헤더 별칭
const HEADER_ALIASES: Record<ContactField, string[]> = {
  name: ['이름', '성명', 'name', 'full name', 'fullname', '고객명', '담당자'],
  nameEn: ['영문이름', '영문 이름', '영문명', 'english name', 'name (english)'],
  company: ['회사', '회사명', '소속', 'company', 'organization', 'organisation', 'organization 1 - name', '기업명'],
  department: ['부서', '부서명', 'department', 'organization 1 - department', 'dept'],
  position: ['직책', '직급', '직위', 'title', 'job title', 'position', 'organization 1 - title'],
  email: ['이메일', '이메일 주소', '이메일1', 'email', 'e-mail', 'email address', 'e-mail 1 - value', 'e-mail address'],
  email2: ['이메일2', '이메일 2', 'e-mail 2 - value', 'email 2'],
  phone: ['전화', '전화번호', '회사전화', '회사 전화', '유선전화', 'phone', 'work phone', 'business phone', 'phone 1 - value', 'tel'],
  mobile: ['휴대폰', '휴대전화', '핸드폰', '모바일', '휴대폰번호', 'mobile', 'mobile phone', 'cell', 'phone 2 - value'],
  fax: ['팩스', 'fax', 'business fax'],
  address: ['주소', '회사주소', '회사 주소', 'address', 'business address', 'address 1 - formatted'],
  website: ['홈페이지', '웹사이트', 'website', 'web page', 'url', 'website 1 - value'],
  country: ['국가', 'country', 'nation'],
  language: ['언어', 'language'],
  tags: ['태그', '그룹', '분류', 'tags', 'group membership', 'labels', 'category'],
  memo: ['메모', '비고', '노트', 'memo', 'notes', 'note'],
};

const normHeader = (h: string) => h.replace(/[\s_\-()]/g, '').toLowerCase();

export function mapHeaders(headers: string[]): Partial<Record<string, ContactField>> {
  const map: Partial<Record<string, ContactField>> = {};
  const used = new Set<ContactField>();
  for (const h of headers) {
    const n = normHeader(h);
    for (const field of CONTACT_FIELDS) {
      if (used.has(field)) continue;
      if (HEADER_ALIASES[field].some((a) => normHeader(a) === n)) {
        map[h] = field;
        used.add(field);
        break;
      }
    }
  }
  return map;
}

export function rowsToContacts(rows: Record<string, unknown>[], mapping: Partial<Record<string, ContactField>>): ContactInput[] {
  return rows
    .map((row) => {
      const c: ContactInput = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (!field) continue;
        const v = row[header];
        if (v === undefined || v === null || String(v).trim() === '') continue;
        c[field] = c[field] ? `${c[field]}, ${String(v).trim()}` : String(v).trim();
      }
      return c;
    })
    .filter((c) => c.name || c.email || c.mobile);
}

// vCard(.vcf) 파싱 - 아이폰/구글 연락처 내보내기
export function parseVCards(text: string): ContactInput[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  return cards
    .map((card) => {
      const c: ContactInput = {};
      for (const raw of card.split(/\r?\n/)) {
        const idx = raw.indexOf(':');
        if (idx < 0) continue;
        const key = raw.slice(0, idx).toUpperCase();
        const value = raw.slice(idx + 1).replace(/\\,/g, ',').replace(/\\n/gi, ' ').trim();
        if (!value) continue;
        const base = key.split(';')[0].replace(/^ITEM\d+\./, '');
        if (base === 'FN') c.name = value;
        else if (base === 'N' && !c.name) c.name = value.split(';').filter(Boolean).reverse().join(' ');
        else if (base === 'ORG') {
          const [company, dept] = value.split(';');
          c.company = company;
          if (dept) c.department = dept;
        } else if (base === 'TITLE') c.position = value;
        else if (base === 'EMAIL') {
          if (!c.email) c.email = value;
          else if (!c.email2) c.email2 = value;
        } else if (base === 'TEL') {
          if (/CELL|MOBILE|IPHONE/.test(key) && !c.mobile) c.mobile = value;
          else if (/FAX/.test(key)) c.fax = value;
          else if (!c.phone) c.phone = value;
          else if (!c.mobile) c.mobile = value;
        } else if (base === 'ADR') c.address = value.split(';').filter(Boolean).join(' ');
        else if (base === 'URL') c.website = value;
        else if (base === 'NOTE') c.memo = value;
      }
      return c;
    })
    .filter((c) => c.name || c.email);
}

export function cleanContact(input: Record<string, unknown>): ContactInput {
  const out: ContactInput = {};
  for (const f of CONTACT_FIELDS) {
    if (!(f in input)) continue;
    const v = input[f];
    out[f] = v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim().slice(0, 2000);
  }
  if (out.email) out.email = out.email.toLowerCase();
  return out;
}

export const digitsOnly = (s?: string | null) => (s ? s.replace(/\D/g, '') : '');
