import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
const { hashSync } = bcryptjs;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================
  // Phase 1-B: 부서, 역할, 권한 시드
  // ============================================

  // 1. 부서 생성 (11개)
  const departments = [
    { code: 'sales', name: '세일즈', sortOrder: 1 },
    { code: 'research', name: '연구', sortOrder: 2 },
    { code: 'domestic', name: '국내사업', sortOrder: 3 },
    { code: 'overseas', name: '해외사업', sortOrder: 4 },
    { code: 'management', name: '경영관리', sortOrder: 5 },
    { code: 'marketing', name: '마케팅', sortOrder: 6 },
    { code: 'design', name: '디자인', sortOrder: 7 },
    { code: 'production', name: '생산', sortOrder: 8 },
    { code: 'as', name: 'AS', sortOrder: 9 },
    { code: 'quality', name: '품질', sortOrder: 10 },
    { code: 'qa', name: 'QA', sortOrder: 11 },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, sortOrder: dept.sortOrder },
      create: dept,
    });
  }
  console.log('  - 11개 부서 생성 완료');

  // 2. 역할 생성 (4개)
  const roles = [
    { code: 'system_admin', name: '시스템관리자', level: 100, isSystem: true, description: '전체 시스템 관리 권한' },
    { code: 'dept_head', name: '부서장', level: 80, isSystem: true, description: '부서 관리 권한' },
    { code: 'team_lead', name: '팀장', level: 60, isSystem: true, description: '팀 관리 권한' },
    { code: 'staff', name: '직원', level: 20, isSystem: true, description: '기본 사용 권한' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, level: role.level, description: role.description },
      create: role,
    });
  }
  console.log('  - 4개 역할 생성 완료');

  // 3. 권한 생성
  const modules = [
    'dashboard', 'board', 'projects', 'approvals', 'calendar',
    'customers', 'communications', 'voc',
    'service', 'inventory', 'faq',
    'documents', 'meetings', 'wiki', 'chat', 'reports', 'sales',
    'settings', 'import-export', 'integrations',
  ];
  const actions = ['read', 'create', 'update', 'delete', 'manage'];

  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action, description: `${module} ${action}` },
      });
    }
  }
  console.log('  - 권한 생성 완료');

  // 4. 역할별 권한 매핑
  const adminRole = await prisma.role.findUnique({ where: { code: 'system_admin' } });
  const deptHeadRole = await prisma.role.findUnique({ where: { code: 'dept_head' } });
  const teamLeadRole = await prisma.role.findUnique({ where: { code: 'team_lead' } });
  const staffRole = await prisma.role.findUnique({ where: { code: 'staff' } });

  // 시스템관리자: manage 전체
  if (adminRole) {
    const managePerms = await prisma.permission.findMany({ where: { action: 'manage' } });
    for (const perm of managePerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  // 부서장: 전체 CRUD
  if (deptHeadRole) {
    const allPerms = await prisma.permission.findMany({ where: { action: { in: ['read', 'create', 'update', 'delete'] } } });
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: deptHeadRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: deptHeadRole.id, permissionId: perm.id },
      });
    }
  }

  // 팀장: 읽기 + 생성 + 수정
  if (teamLeadRole) {
    const perms = await prisma.permission.findMany({ where: { action: { in: ['read', 'create', 'update'] } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: teamLeadRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: teamLeadRole.id, permissionId: perm.id },
      });
    }
  }

  // 직원: 읽기 + 생성
  if (staffRole) {
    const perms = await prisma.permission.findMany({ where: { action: { in: ['read', 'create'] } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: staffRole.id, permissionId: perm.id },
      });
    }
  }
  console.log('  - 역할별 권한 매핑 완료');

  // ============================================
  // 기존 데이터 삭제 (순서 중요: 외래키 참조 순서)
  // ============================================

  // AI 관련
  await prisma.aIFeedback.deleteMany();
  await prisma.aIAgentLog.deleteMany();
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.aIAgentConfig.deleteMany();
  await prisma.aIUsageDaily.deleteMany();

  // 프로젝트 관련
  await prisma.taskActivity.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  // 게시판
  await prisma.postComment.deleteMany();
  await prisma.post.deleteMany();

  // 결재
  await prisma.approvalStep.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.approvalTemplate.deleteMany();

  // 캘린더
  await prisma.eventAttendee.deleteMany();
  await prisma.calendarEvent.deleteMany();

  // 문서
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentFolder.deleteMany();

  // 회의
  await prisma.meetingActionItem.deleteMany();
  await prisma.meetingMinute.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.meeting.deleteMany();

  // 위키
  await prisma.wikiVersion.deleteMany();
  await prisma.wikiPage.deleteMany();

  // 채널/메시지
  await prisma.message.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.channel.deleteMany();

  // 재고
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventory.deleteMany();

  // AS, FAQ, 배송
  await prisma.serviceTicket.deleteMany();
  await prisma.fAQ.deleteMany();
  await prisma.shipment.deleteMany();

  // 알림, 리포트
  await prisma.notification.deleteMany();
  await prisma.reportTemplate.deleteMany();

  // 기존
  await prisma.communication.deleteMany();
  await prisma.vOC.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.order.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared all existing data.');

  // ============================================
  // 사용자 생성
  // ============================================
  const managementDept = await prisma.department.findUnique({ where: { code: 'management' } });
  const salesDept = await prisma.department.findUnique({ where: { code: 'sales' } });
  const marketingDept = await prisma.department.findUnique({ where: { code: 'marketing' } });

  const adminUser = await prisma.user.create({
    data: {
      name: '박상현',
      email: 'admin@aramhuvis.com',
      password: hashSync('admin123', 10),
      role: 'admin',
      department: '경영관리',
      phone: '010-1234-5678',
      isActive: true,
      roleId: adminRole?.id,
      departmentId: managementDept?.id,
      position: '대표',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: '김영희',
      email: 'kim@aramhuvis.com',
      password: hashSync('staff123', 10),
      role: 'manager',
      department: '세일즈',
      phone: '010-2345-6789',
      isActive: true,
      roleId: teamLeadRole?.id,
      departmentId: salesDept?.id,
      position: '팀장',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: '이철수',
      email: 'lee@aramhuvis.com',
      password: hashSync('staff123', 10),
      role: 'staff',
      department: '마케팅',
      phone: '010-3456-7890',
      isActive: true,
      roleId: staffRole?.id,
      departmentId: marketingDept?.id,
      position: '대리',
    },
  });

  console.log('Created 3 users.');

  // ============================================
  // 고객 생성 (한국 뷰티 업계 10명)
  // ============================================
  const customersData = [
    { name: '정미영', email: 'jung@amorepacific.com', phone: '02-6040-5000', mobile: '010-4567-1234', company: '아모레퍼시픽', position: '부장', department: '구매팀', address: '서울시 용산구 한강대로 100', grade: 'vip', status: 'active', source: '전시회', tags: '스킨케어,메이크업', memo: '주요 거래처. 분기별 미팅 필수.', assignedToId: managerUser.id },
    { name: '최진호', email: 'choi@lgcare.com', phone: '02-6924-3114', mobile: '010-5678-2345', company: 'LG생활건강', position: '차장', department: '상품기획팀', address: '서울시 종로구 새문안로 82', grade: 'vip', status: 'active', source: '소개', tags: '스킨케어,헤어케어', memo: '신제품 런칭 시 우선 연락.', assignedToId: managerUser.id },
    { name: '한소희', email: 'han@oliveyoung.co.kr', phone: '02-6255-3000', mobile: '010-6789-3456', company: '올리브영', position: '매니저', department: 'MD팀', address: '서울시 강남구 테헤란로 33길 15', grade: 'gold', status: 'active', source: '웹사이트', tags: '스킨케어,메이크업', memo: '온라인 채널 입점 논의 중.', assignedToId: managerUser.id },
    { name: '박지훈', email: 'park@sikor.com', phone: '02-3456-7890', mobile: '010-7890-4567', company: '시코르', position: '팀장', department: '바잉팀', address: '서울시 중구 소공로 63', grade: 'gold', status: 'active', source: '전시회', tags: '메이크업', memo: '프리미엄 라인 관심.', assignedToId: staffUser.id },
    { name: '김나연', email: 'kimny@lotteshopping.com', phone: '02-771-2500', mobile: '010-8901-5678', company: '롯데백화점', position: '과장', department: '화장품 바이어', address: '서울시 중구 남대문로 81', grade: 'gold', status: 'active', source: '영업', tags: '스킨케어,메이크업', memo: '본점 1층 입점 협의.', assignedToId: managerUser.id },
    { name: '이수정', email: 'lee.sj@shinsegae.com', phone: '02-1588-1234', mobile: '010-9012-6789', company: '신세계백화점', position: '대리', department: 'MD팀', address: '서울시 중구 소공로 63', grade: 'normal', status: 'active', source: '소개', tags: '스킨케어', memo: '강남점 팝업 매장 논의.', assignedToId: staffUser.id },
    { name: '오현우', email: 'oh@cosmax.com', phone: '031-789-1234', mobile: '010-1234-7890', company: '코스맥스', position: '실장', department: '영업팀', address: '경기도 성남시 분당구 판교로 228번길 15', grade: 'normal', status: 'active', source: '전시회', tags: '스킨케어,헤어케어', memo: 'OEM/ODM 파트너.', assignedToId: managerUser.id },
    { name: '송민지', email: 'song@beautynet.co.kr', phone: '02-555-0102', mobile: '010-2345-8901', company: '뷰티넷', position: '사원', department: '온라인사업부', address: '서울시 강남구 역삼로 134', grade: 'new', status: 'active', source: '웹사이트', tags: '메이크업', memo: '온라인 유통 채널 신규.', assignedToId: staffUser.id },
    { name: '윤태민', email: 'yoon@hwahae.com', phone: '02-6080-3000', mobile: '010-3456-9012', company: '화해', position: '매니저', department: '제휴팀', address: '서울시 강남구 테헤란로 521', grade: 'new', status: 'active', source: '웹사이트', tags: '스킨케어,메이크업,헤어케어', memo: '앱 내 광고/제휴 논의.', assignedToId: staffUser.id },
    { name: '장서윤', email: 'jang@cj.net', phone: '02-726-8114', mobile: '010-4567-0123', company: 'CJ올리브네트웍스', position: '과장', department: '뷰티사업팀', address: '서울시 중구 동호로 330', grade: 'normal', status: 'inactive', source: '영업', tags: '헤어케어', memo: '현재 거래 중단. 재개 가능성 있음.', assignedToId: managerUser.id },
  ];

  const customers = [];
  for (const data of customersData) {
    const customer = await prisma.customer.create({ data });
    customers.push(customer);
  }
  console.log(`Created ${customers.length} customers.`);

  // ============================================
  // 커뮤니케이션 생성
  // ============================================
  const communicationsData = [
    { customerId: customers[0].id, userId: managerUser.id, type: 'email', direction: 'outbound', subject: '2026년 상반기 신제품 카탈로그 안내', content: '안녕하세요 정미영 부장님, 2026년 상반기 신제품 카탈로그를 첨부드립니다.', status: 'read', sentAt: new Date('2026-01-15T09:30:00'), deliveredAt: new Date('2026-01-15T09:31:00'), readAt: new Date('2026-01-15T14:20:00') },
    { customerId: customers[1].id, userId: managerUser.id, type: 'phone', direction: 'inbound', subject: '신제품 샘플 요청 통화', content: 'LG생활건강 최진호 차장님으로부터 전화. 신규 헤어케어 라인 샘플 3종 요청.', status: 'sent', sentAt: new Date('2026-01-20T11:00:00') },
    { customerId: customers[2].id, userId: staffUser.id, type: 'email', direction: 'outbound', subject: '올리브영 온라인 입점 제안서', content: '한소희 매니저님께, 올리브영 온라인몰 입점을 위한 제안서를 보내드립니다.', status: 'delivered', sentAt: new Date('2026-01-25T10:00:00'), deliveredAt: new Date('2026-01-25T10:02:00') },
  ];

  for (const data of communicationsData) {
    await prisma.communication.create({ data });
  }
  console.log(`Created ${communicationsData.length} communications.`);

  // ============================================
  // VOC 생성
  // ============================================
  const vocData = [
    { customerId: customers[0].id, userId: managerUser.id, category: 'inquiry', priority: 'high', title: '신규 스킨케어 라인 성분 문의', content: '아모레퍼시픽 정미영 부장님이 신규 스킨케어 라인의 전성분표를 요청하셨습니다.', status: 'in_progress', productTags: '스킨케어' },
    { customerId: customers[1].id, userId: managerUser.id, category: 'complaint', priority: 'high', title: '배송 지연 불만', content: 'LG생활건강 최진호 차장님이 배송 지연 불만을 제기하셨습니다.', status: 'open', productTags: '헤어케어' },
  ];

  for (const data of vocData) {
    await prisma.vOC.create({ data });
  }
  console.log(`Created ${vocData.length} VOC records.`);

  // ============================================
  // 활동 생성
  // ============================================
  const activitiesData = [
    { customerId: customers[0].id, userId: managerUser.id, type: 'meeting', title: '아모레퍼시픽 분기 미팅', description: '2026년 1분기 실적 리뷰', dueDate: new Date('2026-02-18T14:00:00'), isCompleted: false },
    { customerId: customers[1].id, userId: managerUser.id, type: 'task', title: 'LG생활건강 샘플 발송', description: '헤어케어 신제품 샘플 3종 발송', dueDate: new Date('2026-02-07T18:00:00'), isCompleted: true },
  ];

  for (const data of activitiesData) {
    await prisma.activity.create({ data });
  }
  console.log(`Created ${activitiesData.length} activities.`);

  // ============================================
  // 이메일 템플릿 생성
  // ============================================
  await prisma.emailTemplate.create({
    data: {
      userId: adminUser.id,
      name: '신규 고객 환영',
      subject: '아람휴비스에 오신 것을 환영합니다',
      content: '안녕하세요 {{고객명}}님, 아람휴비스에 관심을 가져주셔서 감사합니다.',
      category: '환영',
      isActive: true,
    },
  });
  console.log('Created email templates.');

  // ============================================
  // 주문/영업파이프라인 (Orders)
  // ============================================
  const ordersData = [
    { customerId: customers[0].id, orderNumber: 'ORD-2026-001', productName: '아쿠아 모이스처 세럼 50ml', quantity: 500, unitPrice: 35000, totalPrice: 17500000, status: 'confirmed', orderDate: new Date('2026-01-10'), memo: '1분기 정기 발주' },
    { customerId: customers[0].id, orderNumber: 'ORD-2026-002', productName: '로즈 골드 파운데이션 30ml', quantity: 300, unitPrice: 42000, totalPrice: 12600000, status: 'shipped', orderDate: new Date('2026-01-15'), memo: '신제품 초도물량' },
    { customerId: customers[1].id, orderNumber: 'ORD-2026-003', productName: '실크 프로틴 샴푸 500ml', quantity: 1000, unitPrice: 18000, totalPrice: 18000000, status: 'delivered', orderDate: new Date('2026-01-08'), memo: '대량 주문 할인 5% 적용' },
    { customerId: customers[2].id, orderNumber: 'ORD-2026-004', productName: '비타민C 브라이트닝 크림 50ml', quantity: 200, unitPrice: 28000, totalPrice: 5600000, status: 'pending', orderDate: new Date('2026-02-01'), memo: '올리브영 온라인 전용' },
    { customerId: customers[3].id, orderNumber: 'ORD-2026-005', productName: '프리미엄 립스틱 세트 (6색)', quantity: 150, unitPrice: 55000, totalPrice: 8250000, status: 'confirmed', orderDate: new Date('2026-02-05'), memo: '시코르 오프라인 매장 전용' },
    { customerId: customers[4].id, orderNumber: 'ORD-2026-006', productName: '콜라겐 부스터 앰플 30ml', quantity: 400, unitPrice: 45000, totalPrice: 18000000, status: 'pending', orderDate: new Date('2026-02-10'), memo: '롯데백화점 본점 1층' },
    { customerId: customers[1].id, orderNumber: 'ORD-2026-007', productName: '딥 리페어 헤어마스크 200ml', quantity: 800, unitPrice: 22000, totalPrice: 17600000, status: 'confirmed', orderDate: new Date('2026-02-12'), memo: '2월 프로모션 물량' },
    { customerId: customers[6].id, orderNumber: 'ORD-2026-008', productName: 'OEM 기초화장품 세트', quantity: 5000, unitPrice: 12000, totalPrice: 60000000, status: 'pending', orderDate: new Date('2026-02-15'), memo: '코스맥스 OEM 3차 발주' },
  ];

  for (const data of ordersData) {
    await prisma.order.create({ data });
  }
  console.log(`Created ${ordersData.length} orders.`);

  // ============================================
  // AS 서비스 티켓 (ServiceTicket)
  // ============================================
  const serviceTicketsData = [
    { ticketNumber: 'AS-2026-001', customerId: customers[0].id, assignedToId: staffUser.id, category: 'product_defect', priority: 'high', title: '아쿠아 세럼 변색 불량', description: '아모레퍼시픽 납품분 중 일부 세럼 변색 발견. LOT번호 AQ-2601-003. 20개 반품 요청.', status: 'in_progress', productName: '아쿠아 모이스처 세럼 50ml', receivedAt: new Date('2026-02-01'), inspectedAt: new Date('2026-02-02'), estimatedDays: 5, memo: '품질팀 검사 의뢰 완료' },
    { ticketNumber: 'AS-2026-002', customerId: customers[1].id, assignedToId: managerUser.id, category: 'packaging', priority: 'medium', title: '샴푸 펌프 불량', description: 'LG생활건강 납품 샴푸 펌프 작동 불량 50건. 교체 펌프 긴급 발송 필요.', status: 'received', productName: '실크 프로틴 샴푸 500ml', receivedAt: new Date('2026-02-10'), estimatedDays: 3, memo: '부품 재고 확인 중' },
    { ticketNumber: 'AS-2026-003', customerId: customers[3].id, assignedToId: staffUser.id, category: 'exchange', priority: 'low', title: '립스틱 색상 교환', description: '시코르 매장에서 고객 색상 교환 요청 5건. 102호 → 105호 교환.', status: 'completed', productName: '프리미엄 립스틱', receivedAt: new Date('2026-01-20'), inspectedAt: new Date('2026-01-20'), repairedAt: new Date('2026-01-21'), returnedAt: new Date('2026-01-23'), estimatedDays: 3, actualDays: 3, returnTrackingNo: 'CJ1234567890', returnCourier: 'CJ대한통운', memo: '교환 완료' },
    { ticketNumber: 'AS-2026-004', customerId: customers[4].id, assignedToId: managerUser.id, category: 'refund', priority: 'high', title: '콜라겐 앰플 유통기한 임박', description: '롯데백화점 입고분 중 유통기한 3개월 미만 제품 100개 반품 요청.', status: 'received', productName: '콜라겐 부스터 앰플 30ml', receivedAt: new Date('2026-02-15'), estimatedDays: 7, memo: '반품 승인 대기 중' },
    { ticketNumber: 'AS-2026-005', customerId: customers[2].id, assignedToId: staffUser.id, category: 'inquiry', priority: 'low', title: '브라이트닝 크림 성분 문의', description: '올리브영에서 고객 알레르기 관련 성분 문의. 전성분표 및 알레르기 테스트 결과 요청.', status: 'completed', productName: '비타민C 브라이트닝 크림 50ml', receivedAt: new Date('2026-01-28'), inspectedAt: new Date('2026-01-28'), repairedAt: new Date('2026-01-29'), returnedAt: new Date('2026-01-29'), estimatedDays: 2, actualDays: 1, memo: '성분표 및 테스트 결과 이메일 발송 완료' },
  ];

  for (const data of serviceTicketsData) {
    await prisma.serviceTicket.create({ data });
  }
  console.log(`Created ${serviceTicketsData.length} service tickets.`);

  // ============================================
  // FAQ
  // ============================================
  const faqData = [
    { category: '제품', question: '제품의 유통기한은 어떻게 되나요?', answer: '일반적으로 미개봉 기준 제조일로부터 30개월입니다. 개봉 후에는 12개월 이내 사용을 권장합니다. 제품 하단 또는 후면에 제조일자와 사용기한이 표기되어 있습니다.', sortOrder: 1, viewCount: 152 },
    { category: '제품', question: '알레르기 테스트를 진행하나요?', answer: '네, 모든 제품은 피부과 전문의 입회 하에 알레르기 패치 테스트를 진행합니다. 테스트 결과는 제품별로 요청 시 제공 가능합니다. 특정 성분에 알레르기가 있으신 경우 고객센터로 문의해주세요.', sortOrder: 2, viewCount: 98 },
    { category: '제품', question: '동물 실험을 하나요?', answer: '아람휴비스는 동물 실험을 일체 하지 않습니다. 모든 제품은 in-vitro(시험관 내) 테스트와 인체적용시험으로 안전성을 확인합니다.', sortOrder: 3, viewCount: 76 },
    { category: '주문/배송', question: '주문 후 배송까지 얼마나 걸리나요?', answer: 'B2B 주문의 경우, 주문 확인 후 영업일 기준 3~5일 내 출고됩니다. 대량 주문(1,000개 이상)의 경우 별도 협의가 필요하며, 영업 담당자에게 문의해주세요.', sortOrder: 4, viewCount: 234 },
    { category: '주문/배송', question: '최소 주문 수량이 있나요?', answer: '일반 거래처 기준 최소 주문 수량은 제품당 50개입니다. VIP 거래처의 경우 최소 수량 제한이 없습니다. 첫 거래 시 샘플 주문도 가능합니다.', sortOrder: 5, viewCount: 187 },
    { category: '주문/배송', question: '해외 배송이 가능한가요?', answer: '네, 해외 배송이 가능합니다. 해외사업부를 통해 수출 절차를 진행하며, 국가별 인증(FDA, CE 등)이 필요한 경우 별도 안내드립니다.', sortOrder: 6, viewCount: 45 },
    { category: '반품/교환', question: '반품/교환 절차는 어떻게 되나요?', answer: '1) AS 접수: 고객센터 또는 담당 영업사원에게 접수\n2) 반품 승인: 영업일 기준 1~2일 내 승인 여부 안내\n3) 반품 수거: 승인 후 CJ대한통운으로 수거 예약\n4) 검수 후 교환/환불: 검수 완료 후 3일 이내 처리', sortOrder: 7, viewCount: 156 },
    { category: '반품/교환', question: '불량 제품의 환불 기준은 무엇인가요?', answer: '제품 불량 시 100% 환불 또는 동일 제품 교환이 가능합니다. 단순 변심에 의한 반품은 수령일로부터 7일 이내, 미개봉 상태에서만 가능하며 반품 배송비는 거래처 부담입니다.', sortOrder: 8, viewCount: 112 },
    { category: 'OEM/ODM', question: 'OEM/ODM 최소 생산량은?', answer: 'OEM 최소 생산량은 제품 유형에 따라 다릅니다.\n- 스킨케어(토너, 세럼 등): 3,000개\n- 메이크업(립스틱, 파운데이션): 5,000개\n- 헤어케어(샴푸, 트리트먼트): 2,000개\n자세한 사항은 생산팀에 문의해주세요.', sortOrder: 9, viewCount: 89 },
    { category: 'OEM/ODM', question: 'OEM 제작 기간은 얼마나 걸리나요?', answer: '배합 개발부터 양산까지 평균 8~12주 소요됩니다.\n- 배합 개발: 3~4주\n- 안정성 테스트: 2~3주\n- 포장 디자인: 2주\n- 양산: 1~3주\n긴급 건의 경우 별도 협의 가능합니다.', sortOrder: 10, viewCount: 67 },
    { category: '계정/시스템', question: 'CRM 로그인이 안 됩니다.', answer: '1) 이메일 주소와 비밀번호를 확인해주세요.\n2) Caps Lock이 켜져 있지 않은지 확인해주세요.\n3) 비밀번호를 잊으셨다면 관리자(admin@aramhuvis.com)에게 초기화를 요청해주세요.\n4) 그래도 안 되면 IT팀에 문의해주세요.', sortOrder: 11, viewCount: 34 },
    { category: '계정/시스템', question: '권한이 없다고 나옵니다.', answer: '각 메뉴의 접근 권한은 역할(시스템관리자/부서장/팀장/직원)에 따라 설정됩니다. 추가 권한이 필요하시면 부서장 또는 시스템 관리자에게 권한 변경을 요청해주세요.', sortOrder: 12, viewCount: 28 },
  ];

  for (const data of faqData) {
    await prisma.fAQ.create({ data });
  }
  console.log(`Created ${faqData.length} FAQs.`);

  // ============================================
  // 재고 관리 (Inventory)
  // ============================================
  const inventoryData = [
    { sku: 'SK-AQ-001', productName: '아쿠아 모이스처 세럼 50ml', category: '스킨케어', currentStock: 2500, minStock: 500, maxStock: 5000, warehouse: '본사 1창고', unit: 'EA', unitPrice: 35000, status: 'in_stock', lastRestocked: new Date('2026-01-20') },
    { sku: 'SK-VC-001', productName: '비타민C 브라이트닝 크림 50ml', category: '스킨케어', currentStock: 1800, minStock: 300, maxStock: 3000, warehouse: '본사 1창고', unit: 'EA', unitPrice: 28000, status: 'in_stock', lastRestocked: new Date('2026-01-25') },
    { sku: 'SK-CL-001', productName: '콜라겐 부스터 앰플 30ml', category: '스킨케어', currentStock: 350, minStock: 500, maxStock: 3000, warehouse: '본사 1창고', unit: 'EA', unitPrice: 45000, status: 'low_stock', lastRestocked: new Date('2026-01-10') },
    { sku: 'MK-LP-001', productName: '프리미엄 립스틱 (102호 로즈)', category: '메이크업', currentStock: 800, minStock: 200, maxStock: 2000, warehouse: '본사 2창고', unit: 'EA', unitPrice: 32000, status: 'in_stock', lastRestocked: new Date('2026-02-01') },
    { sku: 'MK-LP-002', productName: '프리미엄 립스틱 (105호 코랄)', category: '메이크업', currentStock: 150, minStock: 200, maxStock: 2000, warehouse: '본사 2창고', unit: 'EA', unitPrice: 32000, status: 'low_stock', lastRestocked: new Date('2026-01-15') },
    { sku: 'MK-FD-001', productName: '로즈 골드 파운데이션 30ml', category: '메이크업', currentStock: 1200, minStock: 300, maxStock: 3000, warehouse: '본사 2창고', unit: 'EA', unitPrice: 42000, status: 'in_stock', lastRestocked: new Date('2026-02-05') },
    { sku: 'HC-SH-001', productName: '실크 프로틴 샴푸 500ml', category: '헤어케어', currentStock: 3200, minStock: 500, maxStock: 5000, warehouse: '본사 3창고', unit: 'EA', unitPrice: 18000, status: 'in_stock', lastRestocked: new Date('2026-02-08') },
    { sku: 'HC-HM-001', productName: '딥 리페어 헤어마스크 200ml', category: '헤어케어', currentStock: 2100, minStock: 400, maxStock: 4000, warehouse: '본사 3창고', unit: 'EA', unitPrice: 22000, status: 'in_stock', lastRestocked: new Date('2026-02-10') },
    { sku: 'PK-BX-001', productName: '선물 세트 박스 (대)', category: '포장재', currentStock: 50, minStock: 100, maxStock: 1000, warehouse: '본사 1창고', unit: 'EA', unitPrice: 3500, status: 'low_stock', lastRestocked: new Date('2025-12-20') },
    { sku: 'PK-BG-001', productName: '쇼핑백 (중)', category: '포장재', currentStock: 0, minStock: 200, maxStock: 2000, warehouse: '본사 1창고', unit: 'EA', unitPrice: 1500, status: 'out_of_stock', lastRestocked: new Date('2025-12-15'), memo: '발주 완료, 2월 말 입고 예정' },
  ];

  const inventories = [];
  for (const data of inventoryData) {
    const inv = await prisma.inventory.create({ data });
    inventories.push(inv);
  }
  console.log(`Created ${inventories.length} inventory items.`);

  // 재고 이동 이력
  const movementsData = [
    { inventoryId: inventories[0].id, type: 'inbound', quantity: 1000, reason: '생산 입고', reference: 'PO-2026-001', teamDivision: '생산' },
    { inventoryId: inventories[0].id, type: 'outbound', quantity: -500, reason: '아모레퍼시픽 출고', reference: 'ORD-2026-001', teamDivision: '세일즈' },
    { inventoryId: inventories[2].id, type: 'outbound', quantity: -100, reason: '롯데백화점 반품', reference: 'AS-2026-004', teamDivision: 'AS' },
    { inventoryId: inventories[6].id, type: 'inbound', quantity: 2000, reason: '생산 입고', reference: 'PO-2026-005', teamDivision: '생산' },
    { inventoryId: inventories[6].id, type: 'outbound', quantity: -1000, reason: 'LG생활건강 출고', reference: 'ORD-2026-003', teamDivision: '세일즈' },
    { inventoryId: inventories[3].id, type: 'outbound', quantity: -150, reason: '시코르 출고', reference: 'ORD-2026-005', teamDivision: '세일즈' },
    { inventoryId: inventories[5].id, type: 'outbound', quantity: -300, reason: '아모레퍼시픽 출고', reference: 'ORD-2026-002', teamDivision: '세일즈' },
  ];

  for (const data of movementsData) {
    await prisma.inventoryMovement.create({ data });
  }
  console.log(`Created ${movementsData.length} inventory movements.`);

  // ============================================
  // 게시판 (Posts)
  // ============================================
  const postsData = [
    { authorId: adminUser.id, category: 'notice', title: '[필독] 2026년 상반기 경영계획 안내', content: '안녕하세요, 박상현 대표입니다.\n\n2026년 상반기 주요 경영계획을 안내드립니다.\n\n1. 신제품 라인업 확대: 스킨케어 3종, 메이크업 2종 신규 런칭\n2. 해외 시장 진출: 일본, 동남아 시장 공략\n3. OEM/ODM 사업 강화: 코스맥스 등 파트너십 확대\n4. 디지털 전환: AI CS 시스템 도입, CRM 고도화\n\n전사적 협력 부탁드립니다.', isPinned: true, isPublished: true, viewCount: 89, priority: 'urgent' },
    { authorId: adminUser.id, category: 'notice', title: '[공지] 설 연휴 휴무 안내 (1/27~1/30)', content: '설 연휴 기간 동안 회사 휴무입니다.\n\n- 휴무 기간: 1/27(월) ~ 1/30(목)\n- 복귀일: 1/31(금)\n\n긴급 사안은 각 부서장에게 연락 바랍니다.\n즐거운 명절 보내세요!', isPinned: true, isPublished: true, viewCount: 156, priority: 'important' },
    { authorId: managerUser.id, category: 'general', title: '올리브영 입점 미팅 후기 공유', content: '지난 금요일 올리브영 본사 미팅 다녀왔습니다.\n\n주요 내용:\n- 온라인몰 입점 긍정적 검토 중\n- 비타민C 크림, 아쿠아 세럼 2종 먼저 입점 제안 받음\n- 3월 중 최종 결정 예정\n\n세일즈팀 의견 부탁드립니다.', isPinned: false, isPublished: true, viewCount: 34, priority: 'normal' },
    { authorId: staffUser.id, category: 'general', title: '2월 마케팅 캠페인 소재 공유', content: '2월 발렌타인데이 프로모션 마케팅 소재를 공유합니다.\n\n- 인스타그램 릴스 3개\n- 네이버 블로그 포스트 2개\n- 카카오톡 플러스친구 메시지 1건\n\n피드백 부탁드립니다.', isPinned: false, isPublished: true, viewCount: 22, priority: 'normal' },
    { authorId: managerUser.id, category: 'department', title: '[세일즈] 2월 목표 매출 달성 현황', content: '2월 목표 매출: 1억 5천만원\n현재 달성: 8,700만원 (58%)\n\n주요 건:\n- 아모레퍼시픽: 3,010만원 (확정)\n- LG생활건강: 3,560만원 (확정)\n- 코스맥스 OEM: 6,000만원 (협의 중)\n\n남은 기간 분발합시다!', isPinned: false, isPublished: true, viewCount: 15, priority: 'normal', departmentScope: 'sales' },
    { authorId: adminUser.id, category: 'event', title: '[이벤트] 창립 5주년 기념행사 안내', content: '아람휴비스 창립 5주년을 맞아 기념행사를 개최합니다.\n\n- 일시: 2026년 3월 15일(토) 18:00\n- 장소: 강남 그랜드볼룸\n- 내용: 만찬, 시상식, 공연\n\n가족 동반 가능합니다. 참석 여부를 2월 말까지 알려주세요.', isPinned: false, isPublished: true, viewCount: 67, priority: 'important' },
  ];

  const posts = [];
  for (const data of postsData) {
    const post = await prisma.post.create({ data });
    posts.push(post);
  }
  console.log(`Created ${posts.length} posts.`);

  // 게시글 댓글
  const postCommentsData = [
    { postId: posts[0].id, authorId: managerUser.id, content: '신제품 라인업 기대됩니다! 세일즈팀에서 적극 지원하겠습니다.' },
    { postId: posts[0].id, authorId: staffUser.id, content: '마케팅 전략도 함께 준비하고 있습니다. 일정 맞춰서 진행하겠습니다.' },
    { postId: posts[2].id, authorId: adminUser.id, content: '좋은 소식이네요! 올리브영 입점이 성사되면 큰 성장 기회가 될 것 같습니다.' },
    { postId: posts[2].id, authorId: staffUser.id, content: '입점 확정되면 마케팅 소재 바로 준비하겠습니다.' },
    { postId: posts[5].id, authorId: managerUser.id, content: '5주년 축하합니다! 가족과 함께 참석하겠습니다.' },
    { postId: posts[5].id, authorId: staffUser.id, content: '저도 참석합니다! 기대되네요 😊' },
  ];

  for (const data of postCommentsData) {
    await prisma.postComment.create({ data });
  }
  console.log(`Created ${postCommentsData.length} post comments.`);

  // ============================================
  // 프로젝트 관리 (Projects)
  // ============================================
  const project1 = await prisma.project.create({
    data: {
      name: '2026 상반기 신제품 런칭',
      description: '스킨케어 3종, 메이크업 2종 신규 제품 기획부터 런칭까지의 프로젝트',
      status: 'active',
      priority: 'high',
      ownerId: adminUser.id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-06-30'),
      progress: 35,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: '올리브영 온라인 입점',
      description: '올리브영 온라인몰 입점을 위한 전사 프로젝트. 제품 선정, 가격 협상, 마케팅 준비 포함.',
      status: 'active',
      priority: 'high',
      ownerId: managerUser.id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-04-30'),
      progress: 20,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'CRM 시스템 고도화',
      description: 'AI CS 모듈 도입, 리포트 자동화, 외부 시스템 연동 등 CRM 시스템 개선 프로젝트',
      status: 'active',
      priority: 'medium',
      ownerId: adminUser.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      progress: 60,
    },
  });

  const project4 = await prisma.project.create({
    data: {
      name: '일본 시장 진출 준비',
      description: '일본 시장 조사, 규제 확인, 현지 파트너 선정, 제품 현지화 등',
      status: 'planning',
      priority: 'medium',
      ownerId: managerUser.id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-30'),
      progress: 5,
    },
  });

  // 프로젝트 멤버
  const projectMembersData = [
    { projectId: project1.id, userId: adminUser.id, role: 'owner' },
    { projectId: project1.id, userId: managerUser.id, role: 'admin' },
    { projectId: project1.id, userId: staffUser.id, role: 'member' },
    { projectId: project2.id, userId: managerUser.id, role: 'owner' },
    { projectId: project2.id, userId: staffUser.id, role: 'member' },
    { projectId: project2.id, userId: adminUser.id, role: 'viewer' },
    { projectId: project3.id, userId: adminUser.id, role: 'owner' },
    { projectId: project3.id, userId: staffUser.id, role: 'admin' },
    { projectId: project4.id, userId: managerUser.id, role: 'owner' },
    { projectId: project4.id, userId: adminUser.id, role: 'admin' },
  ];

  for (const data of projectMembersData) {
    await prisma.projectMember.create({ data });
  }
  console.log(`Created 4 projects with ${projectMembersData.length} members.`);

  // 프로젝트 태스크
  const tasksData = [
    // 신제품 런칭 프로젝트
    { projectId: project1.id, title: '시장 조사 리포트 작성', description: '2026 뷰티 트렌드 분석 및 경쟁사 신제품 조사', status: 'done', priority: 'high', assigneeId: staffUser.id, creatorId: adminUser.id, dueDate: new Date('2026-01-31'), startDate: new Date('2026-01-15'), estimatedHours: 40, actualHours: 35, completedAt: new Date('2026-01-28'), sortOrder: 1 },
    { projectId: project1.id, title: '신제품 컨셉 기획서', description: '스킨케어 3종 컨셉 및 타겟 고객 정의', status: 'done', priority: 'high', assigneeId: managerUser.id, creatorId: adminUser.id, dueDate: new Date('2026-02-07'), startDate: new Date('2026-01-20'), estimatedHours: 24, actualHours: 20, completedAt: new Date('2026-02-05'), sortOrder: 2 },
    { projectId: project1.id, title: '배합 개발 착수', description: '연구팀과 협업하여 3종 배합 개발 시작', status: 'in_progress', priority: 'high', assigneeId: adminUser.id, creatorId: adminUser.id, dueDate: new Date('2026-03-15'), startDate: new Date('2026-02-10'), estimatedHours: 80, sortOrder: 3 },
    { projectId: project1.id, title: '패키지 디자인', description: '디자인팀에 패키지 디자인 의뢰', status: 'todo', priority: 'medium', assigneeId: staffUser.id, creatorId: adminUser.id, dueDate: new Date('2026-04-15'), estimatedHours: 60, sortOrder: 4 },
    { projectId: project1.id, title: '마케팅 런칭 플랜 수립', description: '온/오프라인 마케팅 전략 수립', status: 'todo', priority: 'medium', assigneeId: staffUser.id, creatorId: managerUser.id, dueDate: new Date('2026-05-15'), estimatedHours: 40, sortOrder: 5 },
    // 올리브영 입점 프로젝트
    { projectId: project2.id, title: '입점 제안서 작성', description: '올리브영 MD팀에 제출할 입점 제안서 작성', status: 'done', priority: 'high', assigneeId: managerUser.id, creatorId: managerUser.id, dueDate: new Date('2026-02-07'), startDate: new Date('2026-02-01'), estimatedHours: 16, actualHours: 12, completedAt: new Date('2026-02-06'), sortOrder: 1 },
    { projectId: project2.id, title: '가격 정책 협의', description: '올리브영 온라인 판매가 및 마진율 협의', status: 'in_progress', priority: 'high', assigneeId: managerUser.id, creatorId: managerUser.id, dueDate: new Date('2026-02-28'), startDate: new Date('2026-02-10'), estimatedHours: 8, sortOrder: 2 },
    { projectId: project2.id, title: '제품 상세페이지 제작', description: '올리브영 온라인몰용 제품 상세페이지 이미지/텍스트 제작', status: 'todo', priority: 'medium', assigneeId: staffUser.id, creatorId: managerUser.id, dueDate: new Date('2026-03-15'), estimatedHours: 32, sortOrder: 3 },
    // CRM 고도화 프로젝트
    { projectId: project3.id, title: 'AI CS 모듈 개발', description: '멀티 에이전트 AI 고객지원 시스템 구축', status: 'done', priority: 'high', assigneeId: adminUser.id, creatorId: adminUser.id, dueDate: new Date('2026-02-15'), startDate: new Date('2026-01-15'), estimatedHours: 120, actualHours: 100, completedAt: new Date('2026-02-18'), sortOrder: 1 },
    { projectId: project3.id, title: '리포트 자동화', description: '매출, 재고, AS 현황 리포트 자동 생성 기능', status: 'in_progress', priority: 'medium', assigneeId: staffUser.id, creatorId: adminUser.id, dueDate: new Date('2026-03-31'), startDate: new Date('2026-02-15'), estimatedHours: 60, sortOrder: 2 },
    { projectId: project3.id, title: 'Google Calendar 연동', description: '캘린더 모듈과 Google Calendar 양방향 동기화', status: 'todo', priority: 'low', assigneeId: staffUser.id, creatorId: adminUser.id, dueDate: new Date('2026-06-30'), estimatedHours: 40, sortOrder: 3 },
  ];

  for (const data of tasksData) {
    await prisma.task.create({ data });
  }
  console.log(`Created ${tasksData.length} tasks.`);

  // ============================================
  // 캘린더 이벤트 (CalendarEvent)
  // ============================================
  const calendarEventsData = [
    { title: '아모레퍼시픽 분기 미팅', description: '2026년 1분기 실적 리뷰 및 상반기 발주 계획 논의', type: 'meeting', startDate: new Date('2026-02-20T14:00:00'), endDate: new Date('2026-02-20T16:00:00'), location: '아모레퍼시픽 본사 3층 회의실', color: '#4285F4', creatorId: managerUser.id },
    { title: '올리브영 입점 미팅', description: '온라인몰 입점 최종 조건 협의', type: 'meeting', startDate: new Date('2026-02-25T10:00:00'), endDate: new Date('2026-02-25T12:00:00'), location: '올리브영 본사', color: '#34A853', creatorId: managerUser.id },
    { title: '신제품 배합 회의', description: '스킨케어 신제품 3종 배합 진행상황 점검', type: 'meeting', startDate: new Date('2026-02-21T09:00:00'), endDate: new Date('2026-02-21T10:30:00'), location: '본사 연구실', color: '#FBBC05', creatorId: adminUser.id },
    { title: '2월 마케팅 캠페인 마감', description: '발렌타인데이 프로모션 콘텐츠 최종 제출', type: 'deadline', startDate: new Date('2026-02-12T18:00:00'), endDate: new Date('2026-02-12T18:00:00'), color: '#EA4335', creatorId: staffUser.id },
    { title: '전사 월간 회의', description: '2월 실적 발표 및 3월 계획 논의', type: 'meeting', startDate: new Date('2026-02-28T09:00:00'), endDate: new Date('2026-02-28T11:00:00'), location: '본사 대회의실', color: '#4285F4', creatorId: adminUser.id },
    { title: '코스맥스 OEM 공장 방문', description: 'OEM 3차 발주 관련 생산 라인 점검', type: 'schedule', startDate: new Date('2026-02-26T10:00:00'), endDate: new Date('2026-02-26T17:00:00'), location: '경기도 판교 코스맥스 공장', color: '#9C27B0', creatorId: managerUser.id },
    { title: '삼일절', description: '국가 공휴일', type: 'holiday', startDate: new Date('2026-03-01T00:00:00'), endDate: new Date('2026-03-01T23:59:59'), allDay: true, color: '#EA4335', creatorId: adminUser.id },
    { title: '창립 5주년 기념행사', description: '아람휴비스 창립 5주년 기념 만찬', type: 'schedule', startDate: new Date('2026-03-15T18:00:00'), endDate: new Date('2026-03-15T22:00:00'), location: '강남 그랜드볼룸', color: '#FF6D00', creatorId: adminUser.id },
    { title: '일본 시장 조사 출장', description: '도쿄 코스메 엑스포 참관 및 현지 유통 파트너 미팅', type: 'schedule', startDate: new Date('2026-03-10T09:00:00'), endDate: new Date('2026-03-12T18:00:00'), location: '일본 도쿄', color: '#00BCD4', creatorId: managerUser.id },
    { title: '상반기 신제품 런칭 목표일', description: '스킨케어 3종 출시', type: 'deadline', startDate: new Date('2026-06-30T18:00:00'), endDate: new Date('2026-06-30T18:00:00'), color: '#EA4335', creatorId: adminUser.id },
  ];

  const calendarEvents = [];
  for (const data of calendarEventsData) {
    const event = await prisma.calendarEvent.create({ data });
    calendarEvents.push(event);
  }
  console.log(`Created ${calendarEvents.length} calendar events.`);

  // 이벤트 참석자
  const attendeesData = [
    { eventId: calendarEvents[0].id, userId: managerUser.id, status: 'accepted' },
    { eventId: calendarEvents[0].id, userId: adminUser.id, status: 'accepted' },
    { eventId: calendarEvents[1].id, userId: managerUser.id, status: 'accepted' },
    { eventId: calendarEvents[1].id, userId: staffUser.id, status: 'pending' },
    { eventId: calendarEvents[2].id, userId: adminUser.id, status: 'accepted' },
    { eventId: calendarEvents[2].id, userId: managerUser.id, status: 'accepted' },
    { eventId: calendarEvents[2].id, userId: staffUser.id, status: 'accepted' },
    { eventId: calendarEvents[4].id, userId: adminUser.id, status: 'accepted' },
    { eventId: calendarEvents[4].id, userId: managerUser.id, status: 'accepted' },
    { eventId: calendarEvents[4].id, userId: staffUser.id, status: 'accepted' },
    { eventId: calendarEvents[5].id, userId: managerUser.id, status: 'accepted' },
    { eventId: calendarEvents[5].id, userId: adminUser.id, status: 'pending' },
    { eventId: calendarEvents[8].id, userId: managerUser.id, status: 'accepted' },
    { eventId: calendarEvents[8].id, userId: adminUser.id, status: 'declined' },
  ];

  for (const data of attendeesData) {
    await prisma.eventAttendee.create({ data });
  }
  console.log(`Created ${attendeesData.length} event attendees.`);

  // ============================================
  // 채널/메시지 (Channels)
  // ============================================
  const channel1 = await prisma.channel.create({
    data: { name: '전체 공지', description: '전사 공지 채널', type: 'group' },
  });
  const channel2 = await prisma.channel.create({
    data: { name: '세일즈팀', description: '세일즈팀 소통 채널', type: 'department', departmentScope: 'sales' },
  });
  const channel3 = await prisma.channel.create({
    data: { name: '프로젝트-신제품런칭', description: '2026 상반기 신제품 런칭 프로젝트 채널', type: 'group' },
  });
  const channel4 = await prisma.channel.create({
    data: { name: '자유게시판', description: '자유롭게 소통하는 채널', type: 'group' },
  });

  // 채널 멤버
  const channelMembersData = [
    { channelId: channel1.id, userId: adminUser.id, role: 'admin' },
    { channelId: channel1.id, userId: managerUser.id, role: 'member' },
    { channelId: channel1.id, userId: staffUser.id, role: 'member' },
    { channelId: channel2.id, userId: managerUser.id, role: 'admin' },
    { channelId: channel2.id, userId: adminUser.id, role: 'member' },
    { channelId: channel3.id, userId: adminUser.id, role: 'admin' },
    { channelId: channel3.id, userId: managerUser.id, role: 'member' },
    { channelId: channel3.id, userId: staffUser.id, role: 'member' },
    { channelId: channel4.id, userId: adminUser.id, role: 'member' },
    { channelId: channel4.id, userId: managerUser.id, role: 'member' },
    { channelId: channel4.id, userId: staffUser.id, role: 'member' },
  ];

  for (const data of channelMembersData) {
    await prisma.channelMember.create({ data });
  }
  console.log(`Created 4 channels with ${channelMembersData.length} members.`);

  // 메시지
  const messagesData = [
    { channelId: channel1.id, senderId: adminUser.id, content: '안녕하세요, 2026년 새해 첫 공지입니다. 올해도 화이팅합시다! 💪', type: 'text', createdAt: new Date('2026-01-02T09:00:00') },
    { channelId: channel1.id, senderId: adminUser.id, content: 'AI 고객지원 시스템이 오픈되었습니다. AI 고객지원 메뉴에서 확인해보세요.', type: 'text', createdAt: new Date('2026-02-19T10:00:00') },
    { channelId: channel2.id, senderId: managerUser.id, content: '이번 주 아모레퍼시픽 미팅 준비물 공유합니다. 신제품 카탈로그와 가격표 최신 버전으로 준비해주세요.', type: 'text', createdAt: new Date('2026-02-17T14:30:00') },
    { channelId: channel2.id, senderId: adminUser.id, content: '네, 알겠습니다. 가격표는 오늘 중으로 업데이트해서 공유하겠습니다.', type: 'text', createdAt: new Date('2026-02-17T14:45:00') },
    { channelId: channel2.id, senderId: managerUser.id, content: 'LG생활건강에서 헤어마스크 추가 발주 문의가 왔습니다. 800개 추가 가능한지 확인 부탁드립니다.', type: 'text', createdAt: new Date('2026-02-18T11:00:00') },
    { channelId: channel3.id, senderId: adminUser.id, content: '신제품 런칭 프로젝트 킥오프! 각 담당자별 일정 확인 부탁드립니다.', type: 'text', createdAt: new Date('2026-01-15T10:00:00') },
    { channelId: channel3.id, senderId: staffUser.id, content: '시장 조사 리포트 1차 초안 완성했습니다. 검토 부탁드립니다.', type: 'text', createdAt: new Date('2026-01-25T16:00:00') },
    { channelId: channel3.id, senderId: managerUser.id, content: '리포트 잘 봤습니다. 경쟁사 가격대 분석 부분이 특히 좋네요. 몇 가지 수정사항 코멘트 남겼습니다.', type: 'text', createdAt: new Date('2026-01-26T09:30:00') },
    { channelId: channel4.id, senderId: staffUser.id, content: '오늘 점심 뭐 먹을까요? 😋', type: 'text', createdAt: new Date('2026-02-19T11:30:00') },
    { channelId: channel4.id, senderId: managerUser.id, content: '곱창 어때요? 회사 앞에 새로 생긴 데가 맛있다던데', type: 'text', createdAt: new Date('2026-02-19T11:32:00') },
    { channelId: channel4.id, senderId: adminUser.id, content: '좋습니다! 12시에 로비에서 만나요', type: 'text', createdAt: new Date('2026-02-19T11:35:00') },
  ];

  for (const data of messagesData) {
    await prisma.message.create({ data });
  }
  console.log(`Created ${messagesData.length} messages.`);

  // ============================================
  // 회의 관리 (Meetings)
  // ============================================
  const meeting1 = await prisma.meeting.create({
    data: {
      title: '주간 세일즈 스탠드업',
      description: '세일즈팀 주간 현황 공유 미팅',
      organizerId: managerUser.id,
      location: '본사 소회의실 A',
      startTime: new Date('2026-02-17T09:00:00'),
      endTime: new Date('2026-02-17T09:30:00'),
      status: 'completed',
      type: 'standup',
    },
  });

  const meeting2 = await prisma.meeting.create({
    data: {
      title: '신제품 컨셉 리뷰',
      description: '2026 상반기 신제품 5종 컨셉 최종 리뷰',
      organizerId: adminUser.id,
      location: '본사 대회의실',
      startTime: new Date('2026-02-19T14:00:00'),
      endTime: new Date('2026-02-19T16:00:00'),
      status: 'scheduled',
      type: 'review',
    },
  });

  const meeting3 = await prisma.meeting.create({
    data: {
      title: '1분기 사업계획 검토',
      description: '1분기 실적 중간 검토 및 수정 계획 논의',
      organizerId: adminUser.id,
      location: '본사 대회의실',
      startTime: new Date('2026-02-28T09:00:00'),
      endTime: new Date('2026-02-28T11:00:00'),
      status: 'scheduled',
      type: 'planning',
    },
  });

  const meeting4 = await prisma.meeting.create({
    data: {
      title: 'CRM 시스템 회고',
      description: 'AI CS 모듈 도입 후 회고 및 개선사항 논의',
      organizerId: adminUser.id,
      location: '온라인 (Zoom)',
      startTime: new Date('2026-02-14T15:00:00'),
      endTime: new Date('2026-02-14T16:30:00'),
      status: 'completed',
      type: 'retrospective',
    },
  });

  // 회의 참석자
  const meetingAttendeesData = [
    { meetingId: meeting1.id, userId: managerUser.id, status: 'accepted' },
    { meetingId: meeting1.id, userId: adminUser.id, status: 'accepted' },
    { meetingId: meeting2.id, userId: adminUser.id, status: 'accepted' },
    { meetingId: meeting2.id, userId: managerUser.id, status: 'accepted' },
    { meetingId: meeting2.id, userId: staffUser.id, status: 'accepted' },
    { meetingId: meeting3.id, userId: adminUser.id, status: 'accepted' },
    { meetingId: meeting3.id, userId: managerUser.id, status: 'accepted' },
    { meetingId: meeting3.id, userId: staffUser.id, status: 'pending' },
    { meetingId: meeting4.id, userId: adminUser.id, status: 'accepted' },
    { meetingId: meeting4.id, userId: staffUser.id, status: 'accepted' },
  ];

  for (const data of meetingAttendeesData) {
    await prisma.meetingAttendee.create({ data });
  }
  console.log(`Created 4 meetings with ${meetingAttendeesData.length} attendees.`);

  // 회의록
  await prisma.meetingMinute.create({
    data: {
      meetingId: meeting1.id,
      authorId: managerUser.id,
      content: '## 주간 세일즈 스탠드업 회의록\n\n### 참석자\n- 김영희 팀장, 박상현 대표\n\n### 주요 논의사항\n1. 아모레퍼시픽 1분기 발주 확정 (1,750만원)\n2. LG생활건강 헤어마스크 추가 발주 협의 진행 중\n3. 올리브영 입점 미팅 2/25 확정\n4. 코스맥스 OEM 3차 발주 견적서 검토 중\n\n### 이번 주 목표\n- 코스맥스 견적서 최종 확정\n- 올리브영 미팅 자료 준비\n- 롯데백화점 입점 제안서 발송',
    },
  });

  await prisma.meetingMinute.create({
    data: {
      meetingId: meeting4.id,
      authorId: adminUser.id,
      content: '## CRM 시스템 회고 회의록\n\n### 참석자\n- 박상현 대표, 이철수 대리\n\n### 잘된 점 (Keep)\n- AI CS 모듈 성공적 도입\n- 고객 응대 시간 30% 단축\n- 자동 티켓 생성 기능 호평\n\n### 개선할 점 (Problem)\n- 일부 복잡한 문의에 대한 AI 정확도 개선 필요\n- 리포트 자동화 아직 미완성\n- 모바일 환경 최적화 필요\n\n### 시도할 것 (Try)\n- AI 프롬프트 튜닝\n- 3월 내 리포트 자동화 완료\n- 반응형 UI 개선',
    },
  });
  console.log('Created meeting minutes.');

  // 회의 액션 아이템
  const actionItemsData = [
    { meetingId: meeting1.id, assigneeId: managerUser.id, title: '코스맥스 OEM 견적서 최종 확정', status: 'in_progress', dueDate: new Date('2026-02-21') },
    { meetingId: meeting1.id, assigneeId: managerUser.id, title: '올리브영 미팅 자료 준비', status: 'pending', dueDate: new Date('2026-02-24') },
    { meetingId: meeting4.id, assigneeId: adminUser.id, title: 'AI 프롬프트 튜닝 작업', status: 'in_progress', dueDate: new Date('2026-03-07') },
    { meetingId: meeting4.id, assigneeId: staffUser.id, title: '리포트 자동화 개발 완료', status: 'pending', dueDate: new Date('2026-03-31') },
    { meetingId: meeting4.id, assigneeId: staffUser.id, title: '모바일 반응형 UI 개선', status: 'pending', dueDate: new Date('2026-04-15') },
  ];

  for (const data of actionItemsData) {
    await prisma.meetingActionItem.create({ data });
  }
  console.log(`Created ${actionItemsData.length} meeting action items.`);

  // ============================================
  // 문서 관리 (Documents)
  // ============================================
  const folder1 = await prisma.documentFolder.create({
    data: { name: '영업 자료', sortOrder: 1 },
  });
  const folder2 = await prisma.documentFolder.create({
    data: { name: '제품 카탈로그', sortOrder: 2 },
  });
  const folder3 = await prisma.documentFolder.create({
    data: { name: '내부 규정', departmentScope: 'management', sortOrder: 3 },
  });
  const folder4 = await prisma.documentFolder.create({
    data: { name: '마케팅 소재', departmentScope: 'marketing', sortOrder: 4 },
  });

  const documentsData = [
    { folderId: folder1.id, uploaderId: managerUser.id, name: '2026 상반기 가격표.xlsx', fileUrl: '/documents/price-list-2026h1.xlsx', fileSize: 245000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: '2026년 상반기 전 제품 가격표', tags: '가격표,2026,상반기', downloadCount: 15 },
    { folderId: folder1.id, uploaderId: managerUser.id, name: '올리브영 입점 제안서.pdf', fileUrl: '/documents/oliveyoung-proposal.pdf', fileSize: 3200000, mimeType: 'application/pdf', description: '올리브영 온라인몰 입점 제안서', tags: '올리브영,입점,제안서', downloadCount: 8 },
    { folderId: folder1.id, uploaderId: managerUser.id, name: '거래처별 할인율표.xlsx', fileUrl: '/documents/discount-rates.xlsx', fileSize: 128000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: '거래처 등급별 할인율 정리', tags: '할인,거래처', downloadCount: 22 },
    { folderId: folder2.id, uploaderId: staffUser.id, name: '2026 스킨케어 카탈로그.pdf', fileUrl: '/documents/skincare-catalog-2026.pdf', fileSize: 8500000, mimeType: 'application/pdf', description: '스킨케어 전 제품 카탈로그 (한글)', tags: '카탈로그,스킨케어', downloadCount: 45 },
    { folderId: folder2.id, uploaderId: staffUser.id, name: '2026 메이크업 카탈로그.pdf', fileUrl: '/documents/makeup-catalog-2026.pdf', fileSize: 7200000, mimeType: 'application/pdf', description: '메이크업 전 제품 카탈로그 (한글)', tags: '카탈로그,메이크업', downloadCount: 38 },
    { folderId: folder2.id, uploaderId: staffUser.id, name: '제품 전성분표.pdf', fileUrl: '/documents/ingredients-list.pdf', fileSize: 1500000, mimeType: 'application/pdf', description: '전 제품 전성분 리스트', tags: '성분,전성분표', downloadCount: 12 },
    { folderId: folder3.id, uploaderId: adminUser.id, name: '취업규칙.pdf', fileUrl: '/documents/employment-rules.pdf', fileSize: 520000, mimeType: 'application/pdf', description: '아람휴비스 취업규칙 (2026년 개정)', tags: '규정,취업규칙', downloadCount: 5 },
    { folderId: folder3.id, uploaderId: adminUser.id, name: '반품/교환 정책 가이드.pdf', fileUrl: '/documents/return-policy-guide.pdf', fileSize: 380000, mimeType: 'application/pdf', description: '반품/교환/환불 처리 정책 가이드라인', tags: '정책,반품,교환', downloadCount: 18 },
    { folderId: folder4.id, uploaderId: staffUser.id, name: '2월 SNS 캠페인 소재.zip', fileUrl: '/documents/feb-sns-campaign.zip', fileSize: 25000000, mimeType: 'application/zip', description: '2월 발렌타인데이 SNS 마케팅 소재 모음', tags: '마케팅,SNS,발렌타인', downloadCount: 3 },
    { folderId: folder4.id, uploaderId: staffUser.id, name: '브랜드 가이드라인 v2.pdf', fileUrl: '/documents/brand-guideline-v2.pdf', fileSize: 4800000, mimeType: 'application/pdf', description: '아람휴비스 브랜드 가이드라인 v2.0', tags: '브랜드,가이드라인', downloadCount: 27 },
  ];

  for (const data of documentsData) {
    await prisma.document.create({ data });
  }
  console.log(`Created 4 folders and ${documentsData.length} documents.`);

  // ============================================
  // 위키 (WikiPages)
  // ============================================
  const wikiPagesData = [
    { slug: 'home', title: '위키 홈', content: '# 아람휴비스 사내 위키\n\n이 위키는 아람휴비스의 업무 지식과 프로세스를 정리하는 공간입니다.\n\n## 주요 카테고리\n\n- [제품 정보](/wiki/products)\n- [영업 프로세스](/wiki/sales-process)\n- [AS 가이드](/wiki/as-guide)\n- [회사 규정](/wiki/company-rules)\n- [시스템 사용법](/wiki/system-guide)', authorId: adminUser.id, sortOrder: 1, tags: '["홈","메인"]' },
    { slug: 'products', title: '제품 정보', content: '# 제품 정보\n\n## 스킨케어 라인\n\n### 아쿠아 모이스처 세럼 50ml\n- SKU: SK-AQ-001\n- 주요 성분: 히알루론산, 세라마이드, 판테놀\n- 유통기한: 제조일로부터 30개월\n- 소비자가: 45,000원\n- B2B가: 35,000원\n\n### 비타민C 브라이트닝 크림 50ml\n- SKU: SK-VC-001\n- 주요 성분: 비타민C 유도체, 나이아신아마이드, 알부틴\n- 유통기한: 제조일로부터 24개월\n- 소비자가: 38,000원\n- B2B가: 28,000원\n\n### 콜라겐 부스터 앰플 30ml\n- SKU: SK-CL-001\n- 주요 성분: 해양 콜라겐, 펩타이드, EGF\n- 유통기한: 제조일로부터 24개월\n- 소비자가: 58,000원\n- B2B가: 45,000원\n\n## 메이크업 라인\n\n### 프리미엄 립스틱 시리즈\n- SKU: MK-LP-001 ~ 006\n- 6가지 색상: 101 레드, 102 로즈, 103 피치, 104 누드, 105 코랄, 106 플럼\n- 소비자가: 42,000원\n- B2B가: 32,000원\n\n### 로즈 골드 파운데이션 30ml\n- SKU: MK-FD-001\n- 5가지 호수: 13호, 21호, 23호, 25호, 27호\n- 소비자가: 55,000원\n- B2B가: 42,000원', authorId: staffUser.id, parentId: null, sortOrder: 2, tags: '["제품","스킨케어","메이크업"]' },
    { slug: 'sales-process', title: '영업 프로세스', content: '# 영업 프로세스 가이드\n\n## 1. 신규 거래처 발굴\n1. 잠재 고객 리스트 작성 (CRM 등록)\n2. 초기 컨택 (이메일/전화)\n3. 제품 소개 미팅 진행\n4. 샘플 제공\n\n## 2. 견적/계약\n1. 견적서 발행 (CRM에서 주문 생성)\n2. 거래 조건 협의 (결제 조건, 배송 조건)\n3. 계약서 체결\n4. 첫 주문 접수\n\n## 3. 주문 관리\n1. 주문 접수 → CRM 주문 등록\n2. 재고 확인 → 출고 지시\n3. 배송 → 배송 추적 등록\n4. 납품 확인 → 세금계산서 발행\n\n## 4. 사후 관리\n1. 정기 미팅 (VIP: 월 1회, Gold: 분기 1회)\n2. 불만 처리 (VOC 즉시 등록)\n3. 재주문 유도\n4. 크로스셀링/업셀링', authorId: managerUser.id, sortOrder: 3, tags: '["영업","프로세스","가이드"]' },
    { slug: 'as-guide', title: 'AS 가이드', content: '# AS(After Service) 처리 가이드\n\n## AS 접수 경로\n- 전화: 02-1234-5678\n- 이메일: as@aramhuvis.com\n- CRM: AI 고객지원 또는 AS 메뉴\n\n## 처리 절차\n\n### 1단계: 접수\n- CRM에 서비스 티켓 생성\n- 티켓 번호 부여 (AS-YYYY-NNN)\n- 우선순위 설정 (긴급/높음/보통/낮음)\n\n### 2단계: 검수\n- 불량 원인 분석\n- 사진 촬영 및 기록\n- LOT 번호 확인\n\n### 3단계: 처리\n- 교환: 동일 제품 발송\n- 환불: 반품 확인 후 환불 처리\n- 수리: 해당 시 부품 교체\n\n### 4단계: 완료\n- 처리 결과 고객 안내\n- CRM 티켓 상태 업데이트\n- 반품 택배 추적번호 등록\n\n## 환불 기준\n- 제품 불량: 100% 환불\n- 단순 변심: 7일 이내, 미개봉, 반품비 거래처 부담\n- 유통기한 임박: 협의 후 결정', authorId: managerUser.id, sortOrder: 4, tags: '["AS","가이드","반품","교환"]' },
    { slug: 'company-rules', title: '회사 규정', content: '# 회사 규정 안내\n\n## 근무 시간\n- 정규 근무: 09:00 ~ 18:00 (점심 12:00~13:00)\n- 유연 근무: 08:00~10:00 출근, 17:00~19:00 퇴근\n- 재택 근무: 주 1회 가능 (부서장 승인 필요)\n\n## 휴가\n- 연차: 근속 1년 미만 11일, 1년 이상 15일, 3년 이상 17일\n- 병가: 연 3일 (진단서 필요)\n- 경조사: 본인 결혼 5일, 직계존비속 3일\n\n## 결재 규정\n- 10만원 이하: 팀장 결재\n- 100만원 이하: 부서장 결재\n- 100만원 초과: 대표 결재\n- 출장: 부서장 결재 (해외 출장: 대표 결재)\n\n## 보안 규정\n- 사내 문서 외부 반출 금지\n- USB 사용 시 보안팀 승인 필요\n- 개인정보 처리 시 개인정보보호법 준수', authorId: adminUser.id, sortOrder: 5, tags: '["규정","근무","휴가","결재"]' },
    { slug: 'system-guide', title: 'CRM 시스템 사용법', content: '# CRM 시스템 사용법\n\n## 로그인\n1. https://aramcrm.vercel.app 접속\n2. 이메일/비밀번호 입력\n3. 초기 비밀번호: 관리자에게 문의\n\n## 주요 메뉴\n\n### 고객 관리\n- 고객 등록/수정/삭제\n- 고객 등급 관리 (VIP/Gold/Normal/New)\n- 담당자 배정\n\n### AI 고객지원\n- 자연어로 고객 문의 응답\n- 자동 티켓 생성\n- 감정 분석\n\n### 영업 파이프라인\n- 주문 생성/관리\n- 매출 현황 확인\n\n### 프로젝트\n- 프로젝트 생성 및 멤버 관리\n- 태스크 칸반 보드\n- 진행률 관리\n\n## 문의\n- IT 지원: admin@aramhuvis.com\n- 시스템 관련: 박상현 대표', authorId: adminUser.id, sortOrder: 6, tags: '["시스템","CRM","사용법","가이드"]' },
  ];

  for (const data of wikiPagesData) {
    await prisma.wikiPage.create({ data });
  }
  console.log(`Created ${wikiPagesData.length} wiki pages.`);

  // ============================================
  // 결재 (Approvals)
  // ============================================

  // 결재 템플릿
  const template1 = await prisma.approvalTemplate.create({
    data: {
      name: '휴가 신청',
      type: 'leave',
      description: '연차/병가/경조사 등 휴가 신청 결재',
      steps: JSON.stringify([
        { order: 1, roleCode: 'team_lead', departmentCode: null },
        { order: 2, roleCode: 'dept_head', departmentCode: null },
      ]),
      isActive: true,
    },
  });

  const template2 = await prisma.approvalTemplate.create({
    data: {
      name: '구매 요청',
      type: 'purchase',
      description: '비품/원자재 등 구매 요청 결재',
      steps: JSON.stringify([
        { order: 1, roleCode: 'team_lead', departmentCode: null },
        { order: 2, roleCode: 'dept_head', departmentCode: null },
        { order: 3, roleCode: 'system_admin', departmentCode: 'management' },
      ]),
      isActive: true,
    },
  });

  const template3 = await prisma.approvalTemplate.create({
    data: {
      name: '출장 신청',
      type: 'travel',
      description: '국내/해외 출장 신청 결재',
      steps: JSON.stringify([
        { order: 1, roleCode: 'team_lead', departmentCode: null },
        { order: 2, roleCode: 'system_admin', departmentCode: 'management' },
      ]),
      isActive: true,
    },
  });

  const template4 = await prisma.approvalTemplate.create({
    data: {
      name: '경비 청구',
      type: 'expense',
      description: '업무 관련 경비 청구 결재',
      steps: JSON.stringify([
        { order: 1, roleCode: 'team_lead', departmentCode: null },
        { order: 2, roleCode: 'dept_head', departmentCode: null },
      ]),
      isActive: true,
    },
  });

  // 결재 건
  const approval1 = await prisma.approval.create({
    data: {
      templateId: template1.id,
      requesterId: staffUser.id,
      type: 'leave',
      title: '연차 휴가 신청 (3/3~3/4)',
      content: '개인 사유로 3월 3일(화)~3월 4일(수) 2일간 연차 휴가를 신청합니다.',
      status: 'approved',
    },
  });

  const approval2 = await prisma.approval.create({
    data: {
      templateId: template2.id,
      requesterId: staffUser.id,
      type: 'purchase',
      title: '마케팅팀 노트북 구매 요청',
      content: '마케팅 영상 편집용 노트북 1대 구매를 요청합니다.\n\n- 모델: MacBook Pro 16인치 M4 Pro\n- 예상 가격: 3,499,000원\n- 사유: 현재 사용 중인 장비가 4K 영상 편집 시 성능 부족',
      status: 'pending',
    },
  });

  const approval3 = await prisma.approval.create({
    data: {
      templateId: template3.id,
      requesterId: managerUser.id,
      type: 'travel',
      title: '일본 도쿄 출장 신청 (3/10~3/12)',
      content: '일본 코스메 엑스포 참관 및 현지 유통 파트너 미팅을 위해 출장을 신청합니다.\n\n- 기간: 3/10(화)~3/12(목) 2박 3일\n- 장소: 일본 도쿄\n- 예상 비용: 약 250만원 (항공+숙박+교통+식비)\n- 동행: 박상현 대표 (별도 신청)',
      status: 'approved',
    },
  });

  const approval4 = await prisma.approval.create({
    data: {
      templateId: template4.id,
      requesterId: managerUser.id,
      type: 'expense',
      title: '올리브영 미팅 접대비 청구',
      content: '올리브영 MD팀 미팅 후 식사 접대비를 청구합니다.\n\n- 일시: 2026/2/7\n- 장소: 강남 한정식 도담\n- 금액: 185,000원\n- 인원: 4명 (당사 2명 + 올리브영 2명)\n- 목적: 입점 조건 협의',
      status: 'approved',
    },
  });

  const approval5 = await prisma.approval.create({
    data: {
      templateId: template1.id,
      requesterId: managerUser.id,
      type: 'leave',
      title: '반차 신청 (2/21 오후)',
      content: '개인 병원 방문으로 2월 21일(금) 오후 반차를 신청합니다.',
      status: 'pending',
    },
  });

  // 결재 단계
  const approvalStepsData = [
    // approval1: 연차 - 승인 완료
    { approvalId: approval1.id, approverId: managerUser.id, stepOrder: 1, status: 'approved', comment: '승인합니다. 즐거운 휴가 보내세요.', decidedAt: new Date('2026-02-15T10:00:00') },
    { approvalId: approval1.id, approverId: adminUser.id, stepOrder: 2, status: 'approved', comment: '승인', decidedAt: new Date('2026-02-15T14:00:00') },
    // approval2: 구매 요청 - 1단계 진행 중
    { approvalId: approval2.id, approverId: managerUser.id, stepOrder: 1, status: 'pending' },
    { approvalId: approval2.id, approverId: adminUser.id, stepOrder: 2, status: 'pending' },
    { approvalId: approval2.id, approverId: adminUser.id, stepOrder: 3, status: 'pending' },
    // approval3: 출장 - 승인 완료
    { approvalId: approval3.id, approverId: adminUser.id, stepOrder: 1, status: 'approved', comment: '출장 승인합니다. 좋은 성과 기대합니다.', decidedAt: new Date('2026-02-18T09:00:00') },
    { approvalId: approval3.id, approverId: adminUser.id, stepOrder: 2, status: 'approved', comment: '승인', decidedAt: new Date('2026-02-18T09:05:00') },
    // approval4: 경비 - 승인 완료
    { approvalId: approval4.id, approverId: adminUser.id, stepOrder: 1, status: 'approved', comment: '확인했습니다. 영수증 제출 부탁드립니다.', decidedAt: new Date('2026-02-10T11:00:00') },
    { approvalId: approval4.id, approverId: adminUser.id, stepOrder: 2, status: 'approved', decidedAt: new Date('2026-02-10T15:00:00') },
    // approval5: 반차 - 1단계 진행 중
    { approvalId: approval5.id, approverId: adminUser.id, stepOrder: 1, status: 'pending' },
    { approvalId: approval5.id, approverId: adminUser.id, stepOrder: 2, status: 'pending' },
  ];

  for (const data of approvalStepsData) {
    await prisma.approvalStep.create({ data });
  }
  console.log(`Created 4 approval templates, 5 approvals with ${approvalStepsData.length} steps.`);

  // ============================================
  // 알림 (Notifications)
  // ============================================
  const notificationsData = [
    { userId: adminUser.id, type: 'approval', title: '결재 요청', message: '이철수님이 마케팅팀 노트북 구매 요청 결재를 요청했습니다.', link: '/approvals', isRead: false },
    { userId: adminUser.id, type: 'approval', title: '결재 요청', message: '김영희님이 반차 신청 결재를 요청했습니다.', link: '/approvals', isRead: false },
    { userId: managerUser.id, type: 'task', title: '태스크 마감 임박', message: '가격 정책 협의 태스크가 2/28에 마감됩니다.', link: '/projects', isRead: false },
    { userId: staffUser.id, type: 'meeting', title: '회의 초대', message: '신제품 컨셉 리뷰 회의에 초대되었습니다. (2/19 14:00)', link: '/meetings', isRead: true },
    { userId: managerUser.id, type: 'system', title: '재고 부족 알림', message: '콜라겐 부스터 앰플(SK-CL-001) 재고가 최소 수량 이하입니다. 현재: 350개 / 최소: 500개', link: '/inventory', isRead: false },
    { userId: adminUser.id, type: 'system', title: '재고 소진 알림', message: '쇼핑백 (중)(PK-BG-001) 재고가 소진되었습니다.', link: '/inventory', isRead: true },
  ];

  for (const data of notificationsData) {
    await prisma.notification.create({ data });
  }
  console.log(`Created ${notificationsData.length} notifications.`);

  // ============================================
  // 리포트 템플릿
  // ============================================
  const reportTemplatesData = [
    { name: '월간 매출 리포트', description: '월별 매출 현황 및 거래처별 매출 분석', type: 'sales', config: JSON.stringify({ charts: ['bar', 'pie'], filters: ['dateRange', 'customer'], groupBy: 'customer' }), isActive: true },
    { name: '재고 현황 리포트', description: '전 제품 재고 현황 및 부족/과잉 재고 알림', type: 'inventory', config: JSON.stringify({ charts: ['bar', 'table'], filters: ['category', 'status'], groupBy: 'category' }), isActive: true },
    { name: 'AS 처리 현황', description: '서비스 티켓 처리 현황 및 평균 처리 시간 분석', type: 'service', config: JSON.stringify({ charts: ['line', 'bar'], filters: ['dateRange', 'status', 'category'], groupBy: 'status' }), isActive: true },
    { name: '고객 분석 리포트', description: '고객 등급별 분포, 신규/이탈 현황 분석', type: 'customer', config: JSON.stringify({ charts: ['pie', 'line'], filters: ['grade', 'status', 'dateRange'], groupBy: 'grade' }), isActive: true },
    { name: '프로젝트 진행 현황', description: '전체 프로젝트 진행률 및 태스크 완료율 분석', type: 'project', config: JSON.stringify({ charts: ['bar', 'table'], filters: ['status', 'priority'], groupBy: 'project' }), isActive: true },
  ];

  for (const data of reportTemplatesData) {
    await prisma.reportTemplate.create({ data });
  }
  console.log(`Created ${reportTemplatesData.length} report templates.`);

  console.log('\n✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
