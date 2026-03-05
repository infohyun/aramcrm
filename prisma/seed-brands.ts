import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("브랜드 시드 데이터 생성 시작...");

  // 1. 브랜드 생성
  const aramhuvis = await prisma.brand.upsert({
    where: { code: "aramhuvis" },
    update: {},
    create: {
      code: "aramhuvis",
      name: "아람휴비스",
      nameEn: "Aram Huvis",
      description: "두피, 모발, 피부 진단기 B2B 판매",
      website: "https://aramhubis.com",
      type: "b2b",
    },
  });

  const lilai = await prisma.brand.upsert({
    where: { code: "lilai" },
    update: {},
    create: {
      code: "lilai",
      name: "LILAI.AI",
      nameEn: "LILAI.AI",
      description: "맞춤형 화장품 및 전체 뷰티 제품군",
      website: "https://lilai.ai",
      type: "b2c",
    },
  });

  console.log(`브랜드 생성: ${aramhuvis.name}, ${lilai.name}`);

  // 2. 아람휴비스 제품 (B2B 진단기기)
  const ahProducts = [
    { name: "두피 진단기 AH-S100", nameEn: "Scalp Analyzer AH-S100", sku: "AH-S100", category: "scalp_analyzer", price: 3500000, cost: 1800000, wholesalePrice: 2800000, currentStock: 25, safetyStock: 5, description: "AI 기반 두피 상태 분석 진단기, 200배 확대" },
    { name: "두피 진단기 AH-S200 Pro", nameEn: "Scalp Analyzer AH-S200 Pro", sku: "AH-S200P", category: "scalp_analyzer", price: 5500000, cost: 2800000, wholesalePrice: 4400000, currentStock: 15, safetyStock: 3, description: "프리미엄 두피 진단기, 500배 확대, AI 보고서" },
    { name: "모발 진단기 AH-H100", nameEn: "Hair Analyzer AH-H100", sku: "AH-H100", category: "hair_analyzer", price: 2800000, cost: 1400000, wholesalePrice: 2200000, currentStock: 30, safetyStock: 5, description: "모발 두께, 밀도, 손상도 분석" },
    { name: "피부 진단기 AH-D100", nameEn: "Skin Analyzer AH-D100", sku: "AH-D100", category: "skin_analyzer", price: 4200000, cost: 2100000, wholesalePrice: 3400000, currentStock: 20, safetyStock: 5, description: "피부 수분, 유분, 탄력, 모공 분석" },
    { name: "피부 진단기 AH-D300 Premium", nameEn: "Skin Analyzer AH-D300 Premium", sku: "AH-D300P", category: "skin_analyzer", price: 7800000, cost: 3900000, wholesalePrice: 6200000, currentStock: 10, safetyStock: 3, description: "올인원 피부 분석 시스템, UV/색소/주름 분석" },
    { name: "통합 진단 패키지 AH-COMBO", nameEn: "All-in-One Package AH-COMBO", sku: "AH-COMBO", category: "diagnostic_device", price: 12000000, cost: 6000000, wholesalePrice: 9600000, currentStock: 5, safetyStock: 2, description: "두피+모발+피부 통합 진단 패키지" },
  ];

  // 3. LILAI.AI 제품 (화장품)
  const lilaiProducts = [
    { name: "릴라이 두피 클렌징 샴푸", nameEn: "LILAI Scalp Cleansing Shampoo", sku: "LI-SH001", category: "shampoo", price: 32000, cost: 8000, retailPrice: 38000, volume: "300ml", currentStock: 500, safetyStock: 100 },
    { name: "릴라이 손상모발 케어 샴푸", nameEn: "LILAI Damage Care Shampoo", sku: "LI-SH002", category: "shampoo", price: 35000, cost: 9000, retailPrice: 42000, volume: "300ml", currentStock: 450, safetyStock: 100 },
    { name: "릴라이 헤어 그로스 세럼", nameEn: "LILAI Hair Growth Serum", sku: "LI-SR001", category: "serum", price: 48000, cost: 12000, retailPrice: 55000, volume: "50ml", currentStock: 300, safetyStock: 50 },
    { name: "릴라이 하이드레이팅 세럼", nameEn: "LILAI Hydrating Serum", sku: "LI-SR002", category: "serum", price: 52000, cost: 13000, retailPrice: 62000, volume: "30ml", currentStock: 280, safetyStock: 50 },
    { name: "릴라이 수분 보습 로션", nameEn: "LILAI Moisturizing Lotion", sku: "LI-LO001", category: "lotion", price: 38000, cost: 9500, retailPrice: 45000, volume: "200ml", currentStock: 400, safetyStock: 80 },
    { name: "릴라이 진정 로션", nameEn: "LILAI Calming Lotion", sku: "LI-LO002", category: "lotion", price: 42000, cost: 10500, retailPrice: 50000, volume: "150ml", currentStock: 350, safetyStock: 70 },
    { name: "릴라이 UV 프로텍트 선크림 SPF50+", nameEn: "LILAI UV Protect Sunscreen SPF50+", sku: "LI-SC001", category: "sunscreen", price: 28000, cost: 7000, retailPrice: 35000, volume: "50ml", currentStock: 600, safetyStock: 120 },
    { name: "릴라이 톤업 선크림 SPF50+", nameEn: "LILAI Tone Up Sunscreen SPF50+", sku: "LI-SC002", category: "sunscreen", price: 32000, cost: 8000, retailPrice: 39000, volume: "50ml", currentStock: 550, safetyStock: 100 },
    { name: "릴라이 맞춤형 에센스", nameEn: "LILAI Custom Essence", sku: "LI-CE001", category: "custom_cosmetic", price: 68000, cost: 17000, retailPrice: 78000, volume: "30ml", currentStock: 200, safetyStock: 30, description: "개인 피부 진단 기반 맞춤 에센스" },
    { name: "릴라이 맞춤형 크림", nameEn: "LILAI Custom Cream", sku: "LI-CE002", category: "custom_cosmetic", price: 72000, cost: 18000, retailPrice: 85000, volume: "50ml", currentStock: 180, safetyStock: 30, description: "개인 피부 진단 기반 맞춤 크림" },
  ];

  for (const p of ahProducts) {
    await prisma.brandProduct.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, brandId: aramhuvis.id },
    });
  }

  for (const p of lilaiProducts) {
    await prisma.brandProduct.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, brandId: lilai.id },
    });
  }

  console.log(`제품 생성: 아람휴비스 ${ahProducts.length}개, LILAI.AI ${lilaiProducts.length}개`);

  // 4. 샘플 주문 데이터
  const ahProduct1 = await prisma.brandProduct.findUnique({ where: { sku: "AH-S100" } });
  const liProduct1 = await prisma.brandProduct.findUnique({ where: { sku: "LI-SH001" } });

  if (ahProduct1) {
    await prisma.brandOrder.create({
      data: {
        brandId: aramhuvis.id,
        orderNumber: "BO-20260301-00001",
        source: "direct",
        customerName: "서울피부과",
        customerEmail: "info@seoulderma.com",
        customerPhone: "02-1234-5678",
        customerAddress: "서울시 강남구 역삼동 123",
        subtotal: 3500000,
        totalAmount: 3500000,
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: "bank_transfer",
        items: {
          create: [
            { productId: ahProduct1.id, productName: ahProduct1.name, sku: ahProduct1.sku, quantity: 1, unitPrice: 3500000, totalPrice: 3500000 },
          ],
        },
      },
    });

    await prisma.brandOrder.create({
      data: {
        brandId: aramhuvis.id,
        orderNumber: "BO-20260302-00002",
        source: "wholesale",
        customerName: "뷰티 메디컬 센터",
        customerEmail: "purchase@beautymed.kr",
        customerPhone: "031-987-6543",
        subtotal: 16300000,
        totalAmount: 16300000,
        status: "processing",
        paymentStatus: "paid",
        paymentMethod: "bank_transfer",
        items: {
          create: [
            { productId: ahProduct1.id, productName: "두피 진단기 AH-S100", sku: "AH-S100", quantity: 2, unitPrice: 2800000, totalPrice: 5600000 },
            { productName: "피부 진단기 AH-D300 Premium", sku: "AH-D300P", quantity: 1, unitPrice: 6200000, totalPrice: 6200000 },
            { productName: "모발 진단기 AH-H100", sku: "AH-H100", quantity: 2, unitPrice: 2200000, totalPrice: 4400000 },
          ],
        },
      },
    });
  }

  if (liProduct1) {
    await prisma.brandOrder.create({
      data: {
        brandId: lilai.id,
        orderNumber: "C24-20260301-00001",
        externalOrderId: "20260301-0001234",
        source: "cafe24",
        customerName: "김지연",
        customerEmail: "jiyeon@email.com",
        customerPhone: "010-1234-5678",
        shippingAddress: "서울시 마포구 연남동 456",
        subtotal: 132000,
        shippingCost: 3000,
        totalAmount: 135000,
        status: "shipped",
        paymentStatus: "paid",
        paymentMethod: "card",
        trackingNumber: "1234567890123",
        courier: "CJ대한통운",
        items: {
          create: [
            { productId: liProduct1.id, productName: liProduct1.name, sku: liProduct1.sku, quantity: 2, unitPrice: 32000, totalPrice: 64000 },
            { productName: "릴라이 헤어 그로스 세럼", sku: "LI-SR001", quantity: 1, unitPrice: 48000, totalPrice: 48000 },
            { productName: "릴라이 UV 프로텍트 선크림 SPF50+", sku: "LI-SC001", quantity: 1, unitPrice: 28000, totalPrice: 28000 },
          ],
        },
      },
    });

    await prisma.brandOrder.create({
      data: {
        brandId: lilai.id,
        orderNumber: "C24-20260302-00002",
        externalOrderId: "20260302-0001567",
        source: "cafe24",
        customerName: "박서현",
        customerEmail: "seohyun@email.com",
        customerPhone: "010-9876-5432",
        subtotal: 188000,
        shippingCost: 0,
        totalAmount: 188000,
        status: "delivered",
        paymentStatus: "paid",
        paymentMethod: "card",
        items: {
          create: [
            { productName: "릴라이 맞춤형 에센스", sku: "LI-CE001", quantity: 1, unitPrice: 68000, totalPrice: 68000 },
            { productName: "릴라이 맞춤형 크림", sku: "LI-CE002", quantity: 1, unitPrice: 72000, totalPrice: 72000 },
            { productName: "릴라이 하이드레이팅 세럼", sku: "LI-SR002", quantity: 1, unitPrice: 52000, totalPrice: 48000, discount: 4000 },
          ],
        },
      },
    });

    await prisma.brandOrder.create({
      data: {
        brandId: lilai.id,
        orderNumber: "BO-20260303-00003",
        source: "website",
        customerName: "이현수",
        customerEmail: "hyunsoo@email.com",
        customerPhone: "010-5555-7777",
        subtotal: 70000,
        totalAmount: 70000,
        status: "pending",
        paymentStatus: "unpaid",
        items: {
          create: [
            { productName: "릴라이 두피 클렌징 샴푸", sku: "LI-SH001", quantity: 1, unitPrice: 32000, totalPrice: 32000 },
            { productName: "릴라이 수분 보습 로션", sku: "LI-LO001", quantity: 1, unitPrice: 38000, totalPrice: 38000 },
          ],
        },
      },
    });
  }

  console.log("샘플 주문 생성 완료");

  // 5. 프로모션 데이터
  await prisma.promotion.create({
    data: {
      brandId: lilai.id,
      name: "봄 맞이 LILAI 전품목 20% 할인",
      code: "SPRING2026",
      type: "seasonal",
      discountType: "percentage",
      discountValue: 20,
      targetCustomerGrade: "all",
      description: "2026년 봄 시즌 전 품목 특별 할인",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-31"),
      usageLimit: 500,
      isActive: true,
      channels: '["kakao","sms","email"]',
      messageTemplate: "안녕하세요 {{customerName}}님! LILAI 봄맞이 전품목 20% 할인 이벤트! 코드: SPRING2026",
      createdById: "system",
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: lilai.id,
      name: "VIP 고객 전용 30% 할인",
      code: "VIP30",
      type: "loyalty",
      discountType: "percentage",
      discountValue: 30,
      targetCustomerGrade: "vip",
      minOrderAmount: 100000,
      maxDiscountAmount: 50000,
      description: "VIP 등급 고객 전용 특별 할인",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
      channels: '["kakao","email"]',
      createdById: "system",
    },
  });

  await prisma.promotion.create({
    data: {
      brandId: aramhuvis.id,
      name: "진단기 패키지 구매 시 10% 추가 할인",
      code: "AHBUNDLE10",
      type: "bundle",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 5000000,
      description: "2대 이상 구매 시 추가 10% 할인 (B2B)",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
      channels: '["email","slack"]',
      createdById: "system",
    },
  });

  console.log("프로모션 생성 완료");

  // 6. 생산 주문
  const lilaiShampoo = await prisma.brandProduct.findUnique({ where: { sku: "LI-SH001" } });
  const lilaiSerum = await prisma.brandProduct.findUnique({ where: { sku: "LI-SR001" } });

  if (lilaiShampoo) {
    await prisma.productionOrder.create({
      data: {
        brandId: lilai.id,
        productId: lilaiShampoo.id,
        orderNumber: "PO-20260301-0001",
        quantity: 1000,
        completedQty: 650,
        status: "in_production",
        priority: "high",
        startDate: new Date("2026-02-25"),
        expectedEndDate: new Date("2026-03-10"),
        batchNumber: "BATCH-SH001-2603",
        stages: {
          create: [
            { name: "원료 준비", sortOrder: 1, status: "completed", startedAt: new Date("2026-02-25"), completedAt: new Date("2026-02-26") },
            { name: "혼합/배합", sortOrder: 2, status: "completed", startedAt: new Date("2026-02-26"), completedAt: new Date("2026-02-28") },
            { name: "충전/조립", sortOrder: 3, status: "in_progress", startedAt: new Date("2026-03-01") },
            { name: "포장", sortOrder: 4, status: "pending" },
            { name: "품질 검사", sortOrder: 5, status: "pending" },
            { name: "출고 대기", sortOrder: 6, status: "pending" },
          ],
        },
      },
    });
  }

  if (lilaiSerum) {
    await prisma.productionOrder.create({
      data: {
        brandId: lilai.id,
        productId: lilaiSerum.id,
        orderNumber: "PO-20260305-0002",
        quantity: 500,
        status: "planned",
        priority: "medium",
        expectedEndDate: new Date("2026-03-20"),
        batchNumber: "BATCH-SR001-2603",
        stages: {
          create: [
            { name: "원료 준비", sortOrder: 1, status: "pending" },
            { name: "혼합/배합", sortOrder: 2, status: "pending" },
            { name: "충전/조립", sortOrder: 3, status: "pending" },
            { name: "포장", sortOrder: 4, status: "pending" },
            { name: "품질 검사", sortOrder: 5, status: "pending" },
            { name: "출고 대기", sortOrder: 6, status: "pending" },
          ],
        },
      },
    });
  }

  console.log("생산 주문 생성 완료");

  // 7. 메시지 로그 샘플
  const messagesamples = [
    { channel: "kakao", customerName: "김지연", customerPhone: "010-1234-5678", content: "[LILAI] 주문하신 상품이 발송되었습니다. 운송장번호: 1234567890123", status: "delivered", brandId: lilai.id },
    { channel: "sms", customerName: "박서현", customerPhone: "010-9876-5432", content: "[LILAI] 봄맞이 전품목 20% 할인! 코드: SPRING2026. 기간: 3/1~3/31", status: "sent", brandId: lilai.id },
    { channel: "email", customerName: "서울피부과", customerEmail: "info@seoulderma.com", subject: "아람휴비스 진단기 주문 확인", content: "주문하신 두피 진단기 AH-S100의 주문이 확인되었습니다. 배송 예정일: 2026-03-10", status: "delivered", brandId: aramhuvis.id },
    { channel: "slack", customerName: "뷰티 메디컬 센터", customerEmail: "purchase@beautymed.kr", subject: "대량 주문 견적서 발송", content: "요청하신 진단기 패키지 견적서를 발송합니다. 총 16,300,000원 (도매가 적용)", status: "sent", brandId: aramhuvis.id },
    { channel: "kakao", customerName: "이현수", customerPhone: "010-5555-7777", content: "[LILAI] VIP 등급 달성을 축하합니다! 전용 30% 할인 코드: VIP30", status: "sent", brandId: lilai.id },
    { channel: "messenger", customerName: "최민지", customerPhone: "010-3333-4444", content: "[LILAI] 맞춤형 화장품 피부 진단 결과가 준비되었습니다. 앱에서 확인해 주세요.", status: "delivered", brandId: lilai.id },
  ];

  for (const msg of messagesamples) {
    await prisma.messageLog.create({
      data: { ...msg, sentAt: new Date(), direction: "outbound" },
    });
  }

  console.log("메시지 로그 생성 완료");

  // 8. 메시지 템플릿
  const templates = [
    { name: "주문 확인 (카카오)", channel: "kakao", category: "order_confirm", content: "[{{brandName}}] {{customerName}}님, 주문이 확인되었습니다.\n주문번호: {{orderNumber}}\n금액: {{totalAmount}}원", variables: '["brandName","customerName","orderNumber","totalAmount"]', createdById: "system" },
    { name: "배송 알림 (SMS)", channel: "sms", category: "shipping", content: "[{{brandName}}] {{customerName}}님 주문 상품이 발송되었습니다. 운송장: {{trackingNumber}} ({{courier}})", variables: '["brandName","customerName","trackingNumber","courier"]', createdById: "system" },
    { name: "프로모션 안내 (카카오)", channel: "kakao", category: "promotion", content: "{{customerName}}님 안녕하세요!\n{{promotionName}} 이벤트를 안내드립니다.\n할인코드: {{promoCode}}\n기간: {{startDate}} ~ {{endDate}}", variables: '["customerName","promotionName","promoCode","startDate","endDate"]', createdById: "system" },
    { name: "견적서 발송 (이메일)", channel: "email", category: "general", subject: "[아람휴비스] {{customerName}} 견적서", content: "안녕하세요, {{customerName}} 담당자님.\n\n요청하신 견적서를 첨부합니다.\n\n총 금액: {{totalAmount}}원\n유효기간: {{validUntil}}\n\n감사합니다.\n아람휴비스", variables: '["customerName","totalAmount","validUntil"]', createdById: "system" },
    { name: "VIP 혜택 안내 (메신저)", channel: "messenger", category: "promotion", content: "{{customerName}}님, VIP 등급 전용 혜택을 안내드립니다! 이번 달 {{discountValue}}% 추가 할인을 즐겨보세요.", variables: '["customerName","discountValue"]', createdById: "system" },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.create({ data: t });
  }

  console.log("메시지 템플릿 생성 완료");
  console.log("시드 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
