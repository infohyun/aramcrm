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
  await prisma.communication.deleteMany();
  await prisma.vOC.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.order.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing user/customer data.');

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

  console.log(`Created ${3} users.`);

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
