import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
const { hashSync } = bcryptjs;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================
  // 기존 데이터 삭제 (순서 중요: 외래키 참조 순서)
  // ============================================
  await prisma.communication.deleteMany();
  await prisma.vOC.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.order.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data.');

  // ============================================
  // 사용자 생성
  // ============================================
  const adminUser = await prisma.user.create({
    data: {
      name: '박상현',
      email: 'admin@aramhuvis.com',
      password: hashSync('admin123', 10),
      role: 'admin',
      department: '경영진',
      phone: '010-1234-5678',
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: '김영희',
      email: 'kim@aramhuvis.com',
      password: hashSync('staff123', 10),
      role: 'manager',
      department: '영업팀',
      phone: '010-2345-6789',
      isActive: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: '이철수',
      email: 'lee@aramhuvis.com',
      password: hashSync('staff123', 10),
      role: 'staff',
      department: '마케팅팀',
      phone: '010-3456-7890',
      isActive: true,
    },
  });

  console.log(`Created ${3} users.`);

  // ============================================
  // 고객 생성 (한국 뷰티 업계 10명)
  // ============================================
  const customersData = [
    {
      name: '정미영',
      email: 'jung@amorepacific.com',
      phone: '02-6040-5000',
      mobile: '010-4567-1234',
      company: '아모레퍼시픽',
      position: '부장',
      department: '구매팀',
      address: '서울시 용산구 한강대로 100',
      grade: 'vip',
      status: 'active',
      source: '전시회',
      tags: '스킨케어,메이크업',
      memo: '주요 거래처. 분기별 미팅 필수.',
      assignedToId: managerUser.id,
    },
    {
      name: '최진호',
      email: 'choi@lgcare.com',
      phone: '02-6924-3114',
      mobile: '010-5678-2345',
      company: 'LG생활건강',
      position: '차장',
      department: '상품기획팀',
      address: '서울시 종로구 새문안로 82',
      grade: 'vip',
      status: 'active',
      source: '소개',
      tags: '스킨케어,헤어케어',
      memo: '신제품 런칭 시 우선 연락.',
      assignedToId: managerUser.id,
    },
    {
      name: '한소희',
      email: 'han@oliveyoung.co.kr',
      phone: '02-6255-3000',
      mobile: '010-6789-3456',
      company: '올리브영',
      position: '매니저',
      department: 'MD팀',
      address: '서울시 강남구 테헤란로 33길 15',
      grade: 'gold',
      status: 'active',
      source: '웹사이트',
      tags: '스킨케어,메이크업',
      memo: '온라인 채널 입점 논의 중.',
      assignedToId: managerUser.id,
    },
    {
      name: '박지훈',
      email: 'park@sikor.com',
      phone: '02-3456-7890',
      mobile: '010-7890-4567',
      company: '시코르',
      position: '팀장',
      department: '바잉팀',
      address: '서울시 중구 소공로 63',
      grade: 'gold',
      status: 'active',
      source: '전시회',
      tags: '메이크업',
      memo: '프리미엄 라인 관심.',
      assignedToId: staffUser.id,
    },
    {
      name: '김나연',
      email: 'kimny@lotteshopping.com',
      phone: '02-771-2500',
      mobile: '010-8901-5678',
      company: '롯데백화점',
      position: '과장',
      department: '화장품 바이어',
      address: '서울시 중구 남대문로 81',
      grade: 'gold',
      status: 'active',
      source: '영업',
      tags: '스킨케어,메이크업',
      memo: '본점 1층 입점 협의.',
      assignedToId: managerUser.id,
    },
    {
      name: '이수정',
      email: 'lee.sj@shinsegae.com',
      phone: '02-1588-1234',
      mobile: '010-9012-6789',
      company: '신세계백화점',
      position: '대리',
      department: 'MD팀',
      address: '서울시 중구 소공로 63',
      grade: 'normal',
      status: 'active',
      source: '소개',
      tags: '스킨케어',
      memo: '강남점 팝업 매장 논의.',
      assignedToId: staffUser.id,
    },
    {
      name: '오현우',
      email: 'oh@cosmax.com',
      phone: '031-789-1234',
      mobile: '010-1234-7890',
      company: '코스맥스',
      position: '실장',
      department: '영업팀',
      address: '경기도 성남시 분당구 판교로 228번길 15',
      grade: 'normal',
      status: 'active',
      source: '전시회',
      tags: '스킨케어,헤어케어',
      memo: 'OEM/ODM 파트너.',
      assignedToId: managerUser.id,
    },
    {
      name: '송민지',
      email: 'song@beautynet.co.kr',
      phone: '02-555-0102',
      mobile: '010-2345-8901',
      company: '뷰티넷',
      position: '사원',
      department: '온라인사업부',
      address: '서울시 강남구 역삼로 134',
      grade: 'new',
      status: 'active',
      source: '웹사이트',
      tags: '메이크업',
      memo: '온라인 유통 채널 신규.',
      assignedToId: staffUser.id,
    },
    {
      name: '윤태민',
      email: 'yoon@hwahae.com',
      phone: '02-6080-3000',
      mobile: '010-3456-9012',
      company: '화해',
      position: '매니저',
      department: '제휴팀',
      address: '서울시 강남구 테헤란로 521',
      grade: 'new',
      status: 'active',
      source: '웹사이트',
      tags: '스킨케어,메이크업,헤어케어',
      memo: '앱 내 광고/제휴 논의.',
      assignedToId: staffUser.id,
    },
    {
      name: '장서윤',
      email: 'jang@cj.net',
      phone: '02-726-8114',
      mobile: '010-4567-0123',
      company: 'CJ올리브네트웍스',
      position: '과장',
      department: '뷰티사업팀',
      address: '서울시 중구 동호로 330',
      grade: 'normal',
      status: 'inactive',
      source: '영업',
      tags: '헤어케어',
      memo: '현재 거래 중단. 재개 가능성 있음.',
      assignedToId: managerUser.id,
    },
  ];

  const customers = [];
  for (const data of customersData) {
    const customer = await prisma.customer.create({ data });
    customers.push(customer);
  }

  console.log(`Created ${customers.length} customers.`);

  // ============================================
  // 커뮤니케이션 생성 (7건)
  // ============================================
  const communicationsData = [
    {
      customerId: customers[0].id,
      userId: managerUser.id,
      type: 'email',
      direction: 'outbound',
      subject: '2026년 상반기 신제품 카탈로그 안내',
      content: '안녕하세요 정미영 부장님,\n\n2026년 상반기 신제품 카탈로그를 첨부드립니다.\n새로운 스킨케어 라인업에 대해 미팅을 요청드립니다.\n\n감사합니다.',
      status: 'read',
      sentAt: new Date('2026-01-15T09:30:00'),
      deliveredAt: new Date('2026-01-15T09:31:00'),
      readAt: new Date('2026-01-15T14:20:00'),
    },
    {
      customerId: customers[1].id,
      userId: managerUser.id,
      type: 'phone',
      direction: 'inbound',
      subject: '신제품 샘플 요청 통화',
      content: 'LG생활건강 최진호 차장님으로부터 전화. 신규 헤어케어 라인 샘플 3종 요청. 다음 주까지 발송 예정.',
      status: 'sent',
      sentAt: new Date('2026-01-20T11:00:00'),
    },
    {
      customerId: customers[2].id,
      userId: staffUser.id,
      type: 'email',
      direction: 'outbound',
      subject: '올리브영 온라인 입점 제안서',
      content: '한소희 매니저님께,\n\n올리브영 온라인몰 입점을 위한 제안서를 보내드립니다.\n검토 후 회신 부탁드립니다.\n\n감사합니다.',
      status: 'delivered',
      sentAt: new Date('2026-01-25T10:00:00'),
      deliveredAt: new Date('2026-01-25T10:02:00'),
    },
    {
      customerId: customers[3].id,
      userId: staffUser.id,
      type: 'sms',
      direction: 'outbound',
      subject: null,
      content: '박지훈 팀장님, 지난번 요청하신 프리미엄 라인 견적서 메일로 보내드렸습니다. 확인 부탁드립니다.',
      status: 'delivered',
      sentAt: new Date('2026-02-01T14:30:00'),
      deliveredAt: new Date('2026-02-01T14:30:00'),
    },
    {
      customerId: customers[4].id,
      userId: managerUser.id,
      type: 'email',
      direction: 'inbound',
      subject: 'RE: 롯데백화점 본점 입점 관련',
      content: '김영희 매니저님,\n\n보내주신 브랜드 소개서 잘 받았습니다.\n내부 검토 후 2월 중 미팅 일정 조율하겠습니다.\n\n김나연 드림',
      status: 'read',
      sentAt: new Date('2026-02-03T09:15:00'),
      readAt: new Date('2026-02-03T09:45:00'),
    },
    {
      customerId: customers[5].id,
      userId: staffUser.id,
      type: 'phone',
      direction: 'outbound',
      subject: '신세계 팝업 매장 일정 조율',
      content: '이수정 대리님과 통화. 강남점 팝업 매장 3월 중순 오픈 가능 여부 확인. 장소 및 면적 협의 필요.',
      status: 'sent',
      sentAt: new Date('2026-02-05T16:00:00'),
    },
    {
      customerId: customers[0].id,
      userId: managerUser.id,
      type: 'email',
      direction: 'outbound',
      subject: '미팅 일정 확인 요청',
      content: '정미영 부장님,\n\n2월 18일(수) 오후 2시 아모레퍼시픽 본사 미팅 일정을 확인해 주시기 바랍니다.\n준비 자료는 별도 메일로 보내드리겠습니다.\n\n감사합니다.',
      status: 'draft',
    },
  ];

  for (const data of communicationsData) {
    await prisma.communication.create({ data });
  }

  console.log(`Created ${communicationsData.length} communications.`);

  // ============================================
  // VOC 생성 (5건)
  // ============================================
  const vocData = [
    {
      customerId: customers[0].id,
      userId: managerUser.id,
      category: 'inquiry',
      priority: 'high',
      title: '신규 스킨케어 라인 성분 문의',
      content: '아모레퍼시픽 정미영 부장님이 신규 스킨케어 라인의 전성분표 및 안전성 테스트 결과를 요청하셨습니다. 빠른 회신이 필요합니다.',
      status: 'in_progress',
      productTags: '스킨케어',
    },
    {
      customerId: customers[1].id,
      userId: managerUser.id,
      category: 'complaint',
      priority: 'high',
      title: '배송 지연 불만',
      content: 'LG생활건강 최진호 차장님이 지난 주 주문한 샘플 배송이 3일 지연되어 불만을 제기하셨습니다. 물류팀 확인 필요.',
      status: 'open',
      productTags: '헤어케어',
    },
    {
      customerId: customers[2].id,
      userId: staffUser.id,
      category: 'suggestion',
      priority: 'medium',
      title: '패키지 디자인 개선 제안',
      content: '올리브영 한소희 매니저님이 온라인 판매용 패키지의 크기를 줄여달라고 제안하셨습니다. 택배 파손 방지를 위한 완충재 추가도 요청.',
      status: 'resolved',
      resolution: '패키지 디자인팀에 전달 완료. 3월 출하분부터 개선된 패키지 적용 예정.',
      productTags: '스킨케어,메이크업',
      resolvedAt: new Date('2026-02-10T11:00:00'),
    },
    {
      customerId: customers[4].id,
      userId: managerUser.id,
      category: 'praise',
      priority: 'low',
      title: '제품 품질 칭찬',
      content: '롯데백화점 김나연 과장님이 최근 납품한 제품의 품질이 매우 우수하다고 칭찬해 주셨습니다. 향후 추가 입점 논의를 원하심.',
      status: 'closed',
      productTags: '스킨케어',
    },
    {
      customerId: customers[6].id,
      userId: managerUser.id,
      category: 'inquiry',
      priority: 'medium',
      title: 'OEM 최소 주문 수량 문의',
      content: '코스맥스 오현우 실장님이 OEM 생산 최소 주문 수량(MOQ)과 리드타임에 대해 문의하셨습니다.',
      status: 'open',
      productTags: '스킨케어,헤어케어',
    },
  ];

  for (const data of vocData) {
    await prisma.vOC.create({ data });
  }

  console.log(`Created ${vocData.length} VOC records.`);

  // ============================================
  // 활동 생성 (5건)
  // ============================================
  const activitiesData = [
    {
      customerId: customers[0].id,
      userId: managerUser.id,
      type: 'meeting',
      title: '아모레퍼시픽 분기 미팅',
      description: '2026년 1분기 실적 리뷰 및 2분기 신제품 소개. 참석자: 정미영 부장, 김영희 매니저.',
      dueDate: new Date('2026-02-18T14:00:00'),
      isCompleted: false,
    },
    {
      customerId: customers[1].id,
      userId: managerUser.id,
      type: 'task',
      title: 'LG생활건강 샘플 발송',
      description: '헤어케어 신제품 샘플 3종 발송. 택배 송장번호 공유 필요.',
      dueDate: new Date('2026-02-07T18:00:00'),
      isCompleted: true,
    },
    {
      customerId: customers[2].id,
      userId: staffUser.id,
      type: 'email',
      title: '올리브영 입점 제안서 후속 확인',
      description: '입점 제안서 발송 후 1주일 경과. 한소희 매니저님에게 검토 여부 확인 메일 발송.',
      dueDate: new Date('2026-02-12T10:00:00'),
      isCompleted: false,
    },
    {
      customerId: customers[4].id,
      userId: managerUser.id,
      type: 'call',
      title: '롯데백화점 미팅 일정 조율',
      description: '김나연 과장님과 2월 중 미팅 일정 조율 통화. 본점 방문 일정 확정 필요.',
      dueDate: new Date('2026-02-10T09:00:00'),
      isCompleted: true,
    },
    {
      customerId: customers[8].id,
      userId: staffUser.id,
      type: 'note',
      title: '화해 앱 제휴 아이디어 정리',
      description: '화해 앱 내 브랜드 페이지 개설 및 리뷰 이벤트 기획안 초안 작성.',
      dueDate: new Date('2026-02-20T17:00:00'),
      isCompleted: false,
    },
  ];

  for (const data of activitiesData) {
    await prisma.activity.create({ data });
  }

  console.log(`Created ${activitiesData.length} activities.`);

  // ============================================
  // 이메일 템플릿 생성 (3건)
  // ============================================
  const emailTemplatesData = [
    {
      userId: adminUser.id,
      name: '신규 고객 환영',
      subject: '아람휴비스에 오신 것을 환영합니다',
      content: `안녕하세요 {{고객명}}님,

아람휴비스에 관심을 가져주셔서 감사합니다.

저희 아람휴비스는 고품질 뷰티 제품을 제공하는 전문 기업으로,
고객님의 비즈니스 성장을 함께 도모하고자 합니다.

궁금하신 사항이 있으시면 언제든지 연락해 주세요.

감사합니다.
아람휴비스 드림`,
      category: '환영',
      isActive: true,
    },
    {
      userId: adminUser.id,
      name: '제품 안내',
      subject: '{{제품명}} 제품 안내드립니다',
      content: `안녕하세요 {{고객명}}님,

요청하신 {{제품명}}에 대한 상세 정보를 안내드립니다.

[제품 특징]
- {{특징1}}
- {{특징2}}
- {{특징3}}

[가격 및 조건]
- 단가: {{단가}}
- 최소 주문 수량: {{MOQ}}
- 리드타임: {{리드타임}}

추가 문의사항이 있으시면 언제든 연락 주시기 바랍니다.

감사합니다.
{{담당자명}} 드림`,
      category: '제품',
      isActive: true,
    },
    {
      userId: managerUser.id,
      name: '프로모션 안내',
      subject: '{{프로모션명}} 특별 프로모션 안내',
      content: `안녕하세요 {{고객명}}님,

{{고객사명}} 고객사를 위한 특별 프로모션을 안내드립니다.

[프로모션 내용]
- 기간: {{시작일}} ~ {{종료일}}
- 혜택: {{혜택내용}}
- 적용 제품: {{적용제품}}

이번 프로모션은 한정 수량으로 진행되오니,
관심 있으시면 빠른 회신 부탁드립니다.

감사합니다.
아람휴비스 영업팀 드림`,
      category: '프로모션',
      isActive: true,
    },
  ];

  for (const data of emailTemplatesData) {
    await prisma.emailTemplate.create({ data });
  }

  console.log(`Created ${emailTemplatesData.length} email templates.`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
