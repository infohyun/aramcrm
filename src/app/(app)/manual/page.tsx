"use client";

import { useState } from "react";
import {
  BookOpen, ChevronRight, ChevronDown, Search,
  Layers, ShoppingBag, ShoppingCart, Gift, Factory, Send,
  LayoutDashboard, Users, MessageSquare, Wrench,
  Settings, Monitor, Info, Building2, Megaphone, FlaskConical,
  Headphones, FileText,
  Briefcase, UserCheck, BarChart3, Shield, ClipboardList,
  Mail, Star, Cog, Zap, GitBranch, Bot, ShieldCheck, HelpCircle,
  HeadphonesIcon
} from "lucide-react";

interface ManualStep {
  title: string;
  content: string;
  tips?: string;
}

interface ManualLeaf {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  steps: ManualStep[];
}

interface ManualSubCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  items: ManualLeaf[];
}

interface ManualTeam {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  bgColor: string;
  textColor: string;
  subCategories: ManualSubCategory[];
}

const manualTree: ManualTeam[] = [
  {
    id: "crm-automation",
    icon: Zap,
    title: "CRM 자동화",
    color: "border-amber-400",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    subCategories: [
      {
        id: "auto-rules",
        icon: Zap,
        title: "자동화",
        items: [
          {
            id: "automation-rules",
            icon: Zap,
            title: "자동화 규칙",
            subtitle: "트리거 기반 자동 작업 실행 설정",
            color: "bg-amber-100 text-amber-700",
            steps: [
              {
                title: "자동화 규칙 목록 보기",
                content: `1. 사이드바에서 "CRM 자동화" > "자동화 규칙"을 클릭합니다.
2. 등록된 모든 자동화 규칙이 카드 형태로 표시됩니다.
3. 각 규칙에는 이름, 트리거, 실행 횟수, 활성 상태가 표시됩니다.`,
              },
              {
                title: "새 자동화 규칙 만들기",
                content: `1. 우상단 "규칙 추가" 버튼을 클릭합니다.
2. 아래 정보를 설정합니다:

   [트리거 선택] - 언제 실행할지
   - 새 고객 등록 시
   - 고객 등급 변경 시
   - 새 주문 생성 시
   - AS 티켓 생성 시
   - AS 티켓 상태 변경 시
   - VOC 등록 시
   - 결재 완료 시

   [조건 설정] - 어떤 조건일 때
   - 고객 등급, 주문 금액, 티켓 우선순위 등

   [실행 동작] - 무엇을 할지
   - 알림 발송, 이메일 발송, 담당자 배정, 등급 변경 등

3. "저장" 버튼을 클릭하면 규칙이 등록됩니다.`,
                tips: "활성/비활성 토글로 규칙을 일시 중지할 수 있습니다.",
              },
            ],
          },
          {
            id: "workflow-builder",
            icon: GitBranch,
            title: "워크플로우 빌더",
            subtitle: "시각적 워크플로우 설계 및 자동 실행",
            color: "bg-amber-100 text-amber-700",
            steps: [
              {
                title: "워크플로우 목록 보기",
                content: `1. 사이드바에서 "CRM 자동화" > "워크플로우 빌더"를 클릭합니다.
2. 등록된 워크플로우 목록이 표시됩니다.
3. 각 워크플로우의 이름, 트리거, 노드 수, 실행 횟수, 상태를 확인합니다.`,
              },
              {
                title: "워크플로우 설계하기",
                content: `1. "워크플로우 생성" 버튼을 클릭합니다.
2. 노드를 추가하여 흐름을 설계합니다:

   [노드 유형]
   - 트리거: 워크플로우 시작점
   - 조건: 분기 조건 설정
   - 액션: 실행할 동작
   - 알림: 알림 발송
   - 대기: 일정 시간 대기
   - 승인: 결재 요청

3. 노드 간 연결선을 만들어 흐름을 완성합니다.
4. "저장" 후 "활성화"를 클릭하면 자동 실행됩니다.`,
                tips: "워크플로우를 수동으로 테스트 실행하려면 '실행' 버튼을 클릭하세요.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "after-service",
    icon: HeadphonesIcon,
    title: "After Service팀",
    color: "border-rose-400",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    subCategories: [
      {
        id: "as-processing",
        icon: Wrench,
        title: "AS 처리",
        items: [
          {
            id: "as-management",
            icon: Wrench,
            title: "AS 관리",
            subtitle: "고객 AS 요청 접수, 진행 상태 추적, 완료 처리",
            color: "bg-rose-100 text-rose-700",
            steps: [
              {
                title: "AS 접수하기",
                content: `1. 사이드바에서 "After Service팀" > "AS 처리" > "AS 관리"를 클릭합니다.
2. 우상단 "AS 접수" 버튼을 클릭합니다.
3. 접수 정보를 입력합니다:
   - 고객 선택: 기존 고객 검색 또는 신규 입력
   - 제품 선택: AS 대상 제품
   - 증상 유형: 고장, 파손, 불량, 교환, 반품 등
   - 증상 설명: 상세한 문제 내용
   - 우선순위: 긴급 / 높음 / 보통 / 낮음
4. "접수" 버튼을 클릭하면 AS 번호가 자동 부여됩니다.`,
                tips: "VIP 고객의 AS는 자동으로 '긴급' 우선순위로 설정됩니다.",
              },
              {
                title: "AS 진행 상태 관리",
                content: `AS 처리는 다음 단계로 진행됩니다:

  접수 → 확인 → 수리중 → 검수 → 완료 (또는 반송)

1. AS 목록에서 해당 건을 클릭합니다.
2. 상태 변경 드롭다운에서 다음 단계를 선택합니다.
3. 처리 내용을 메모에 기록합니다.
4. "저장"을 클릭합니다.`,
              },
              {
                title: "AS 이력 조회",
                content: `1. 검색창에 AS 번호, 고객명, 제품명으로 검색합니다.
2. 상태 필터: 접수/진행중/완료/반송 별로 필터링
3. 기간 필터: 특정 기간의 AS 건만 조회
4. 각 AS 건의 전체 처리 이력을 타임라인으로 확인할 수 있습니다.`,
              },
            ],
          },
          {
            id: "ai-cs",
            icon: Bot,
            title: "AI 고객지원",
            subtitle: "AI 기반 자동 고객 응대 및 챗봇 관리",
            color: "bg-rose-100 text-rose-700",
            steps: [
              {
                title: "AI 고객지원 사용하기",
                content: `1. 사이드바에서 "After Service팀" > "AS 처리" > "AI 고객지원"을 클릭합니다.
2. 왼쪽에 대화 목록, 오른쪽에 채팅 창이 표시됩니다.
3. "새 대화" 버튼으로 테스트 대화를 시작할 수 있습니다.
4. AI가 고객 문의에 자동으로 응답합니다.
5. 감정 분석, 카테고리 자동 분류, 우선순위 판단이 자동으로 수행됩니다.`,
                tips: "AI가 처리하기 어려운 문의는 자동으로 담당자에게 에스컬레이션됩니다.",
              },
            ],
          },
          {
            id: "sla",
            icon: ShieldCheck,
            title: "SLA 관리",
            subtitle: "서비스 수준 약정 관리 및 위반 모니터링",
            color: "bg-rose-100 text-rose-700",
            steps: [
              {
                title: "SLA 정책 관리하기",
                content: `1. 사이드바에서 "After Service팀" > "AS 처리" > "SLA 관리"를 클릭합니다.
2. 상단에 SLA 준수율 통계가 표시됩니다.
3. 우선순위별 SLA 정책을 확인합니다:
   - 긴급: 응답 1시간 / 해결 4시간
   - 높음: 응답 2시간 / 해결 8시간
   - 보통: 응답 4시간 / 해결 24시간
   - 낮음: 응답 8시간 / 해결 48시간
4. "정책 추가"로 새 SLA 정책을 등록할 수 있습니다.
5. 위반 건은 빨간색으로 하이라이트됩니다.`,
              },
            ],
          },
        ],
      },
      {
        id: "as-feedback",
        icon: MessageSquare,
        title: "고객 피드백",
        items: [
          {
            id: "voc",
            icon: HeadphonesIcon,
            title: "고객의 소리 (VOC)",
            subtitle: "불만, 제안, 칭찬 등 고객 피드백 수집 및 대응",
            color: "bg-red-100 text-red-700",
            steps: [
              {
                title: "VOC 등록하기",
                content: `1. 사이드바에서 "After Service팀" > "고객 피드백" > "고객의 소리 (VOC)"를 클릭합니다.
2. "VOC 등록" 버튼을 클릭합니다.
3. VOC 정보를 입력합니다:
   - 고객 선택
   - 유형: 불만 / 제안 / 문의 / 칭찬
   - 채널: 전화 / 이메일 / 홈페이지 / SNS / 방문
   - 제목 및 상세 내용
   - 긴급도: 긴급 / 일반
4. "등록"을 클릭합니다.`,
              },
              {
                title: "VOC 대응 및 처리",
                content: `1. VOC 목록에서 미처리 건을 확인합니다.
2. 해당 VOC를 클릭하여 상세 내용을 확인합니다.
3. 담당자를 지정하고 처리 방안을 기록합니다.
4. 고객에게 답변 후 상태를 "처리완료"로 변경합니다.
5. 필요시 관련 부서에 에스컬레이션합니다.`,
                tips: "VOC 처리 시한: 불만은 24시간 내, 문의는 48시간 내 1차 응답을 권장합니다.",
              },
            ],
          },
          {
            id: "faq",
            icon: HelpCircle,
            title: "FAQ 관리",
            subtitle: "자주 묻는 질문 등록 및 관리",
            color: "bg-orange-100 text-orange-700",
            steps: [
              {
                title: "FAQ 관리하기",
                content: `1. 사이드바에서 "After Service팀" > "고객 피드백" > "FAQ 관리"를 클릭합니다.
2. 카테고리별로 FAQ 목록이 표시됩니다.
3. "FAQ 추가" 버튼으로 새 질문/답변을 등록합니다.
4. 질문과 답변을 입력하고 카테고리를 선택합니다.
5. 노출 순서를 드래그로 변경할 수 있습니다.`,
              },
            ],
          },
          {
            id: "surveys",
            icon: ClipboardList,
            title: "설문조사",
            subtitle: "고객 만족도 설문 작성 및 결과 분석",
            color: "bg-orange-100 text-orange-700",
            steps: [
              {
                title: "설문조사 만들기",
                content: `1. 사이드바에서 "After Service팀" > "고객 피드백" > "설문조사"를 클릭합니다.
2. "설문 생성" 버튼을 클릭합니다.
3. 설문 정보를 입력합니다:
   - 제목, 설명
   - 질문 추가 (텍스트, 선택형, 평점 등)
   - 대상 고객 설정
4. "발행"을 클릭하면 설문이 활성화됩니다.
5. 응답 결과는 차트와 통계로 확인할 수 있습니다.`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "management",
    icon: Building2,
    title: "경영관리팀",
    color: "border-slate-400",
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    subCategories: [
      {
        id: "mgmt-system",
        icon: Monitor,
        title: "시스템 접속",
        items: [
          {
            id: "login",
            icon: Monitor,
            title: "시스템 접속 및 로그인",
            subtitle: "CRM 시스템에 접속하고 로그인하는 방법",
            color: "bg-slate-100 text-slate-700",
            steps: [
              {
                title: "웹 브라우저에서 CRM 접속",
                content: `1. 크롬(Chrome), 엣지(Edge) 등 웹 브라우저를 엽니다.
2. 주소창에 https://aramcrm.vercel.app 을 입력하고 Enter를 누릅니다.
3. 로그인 페이지가 나타납니다.`,
                tips: "크롬 브라우저를 권장합니다. 북마크에 추가해 두면 편리합니다.",
              },
              {
                title: "로그인하기",
                content: `1. "이메일" 입력란에 회사 이메일을 입력합니다.
2. "비밀번호" 입력란에 비밀번호를 입력합니다.
3. "로그인" 버튼을 클릭합니다.
4. 로그인에 성공하면 대시보드 화면으로 이동합니다.`,
                tips: "비밀번호를 잊었을 경우 관리자에게 초기화를 요청하세요.",
              },
            ],
          },
          {
            id: "navigation",
            icon: LayoutDashboard,
            title: "화면 구성 및 메뉴 이동",
            subtitle: "사이드바 팀별 트리 구조 이해하기",
            color: "bg-blue-100 text-blue-700",
            steps: [
              {
                title: "화면 구성 이해하기",
                content: `CRM 화면은 크게 3가지 영역으로 구성됩니다:

[왼쪽 사이드바] - 검은색 세로 메뉴 바
  - 팀 단위로 메뉴가 구성되어 있습니다.
  - CRM 자동화, After Service팀, 경영관리팀, Sales팀, Marketing팀, 연구소
  - 각 팀을 클릭하면 하위 카테고리가 펼쳐집니다.
  - 하위 카테고리를 클릭하면 세부 메뉴가 나타납니다.

[상단 바] - 흰색 가로 바
  - 현재 페이지 이름이 표시됩니다.
  - 검색 기능 (Ctrl+K 단축키 가능)
  - 알림 아이콘
  - 사용자 프로필 메뉴

[메인 영역] - 가운데 넓은 영역
  - 선택한 메뉴의 내용이 표시되는 곳입니다.`,
              },
              {
                title: "메뉴 이동하는 법",
                content: `1. 왼쪽 사이드바에서 팀 이름을 클릭하여 펼칩니다.
2. 하위 카테고리를 클릭하여 세부 메뉴를 펼칩니다.
3. 원하는 메뉴를 클릭하면 해당 페이지로 이동합니다.
4. 현재 보고 있는 페이지의 팀/카테고리는 자동으로 열립니다.`,
                tips: "사이드바 상단의 화살표(<) 버튼을 누르면 사이드바를 접어 넓은 화면으로 사용할 수 있습니다.",
              },
            ],
          },
        ],
      },
      {
        id: "mgmt-dashboard",
        icon: BarChart3,
        title: "경영 현황",
        items: [
          {
            id: "brand-dashboard",
            icon: Layers,
            title: "브랜드 통합 대시보드",
            subtitle: "아람휴비스 & LILAI.AI 전체 현황을 한눈에 파악",
            color: "bg-indigo-100 text-indigo-700",
            steps: [
              {
                title: "대시보드 접속하기",
                content: `1. 사이드바에서 "경영관리팀" > "현황/대시보드" > "브랜드 대시보드"를 클릭합니다.
2. 두 브랜드의 통합 현황이 표시됩니다.`,
              },
              {
                title: "브랜드별 필터링",
                content: `1. 페이지 우상단의 "전체 브랜드" 드롭다운을 클릭합니다.
2. "아람휴비스" 또는 "LILAI.AI"를 선택하면 해당 브랜드만의 데이터가 표시됩니다.
3. 다시 "전체 브랜드"를 선택하면 통합 데이터로 돌아갑니다.`,
              },
              {
                title: "대시보드 카드 읽는 법",
                content: `대시보드에는 다음 정보가 카드 형태로 표시됩니다:

[상단 숫자 카드] 7개
  - 제품 수, 활성 제품, 총 주문, 대기 주문
  - 진행 프로모션, 생산 진행, 메시지 발송

[매출 차트] - 최근 30일간 일별 매출 추이
[주문 채널별 현황] - 직접주문, 카페24, 홈페이지, 전화주문, 도매
[최근 주문] - 최근 10건
[재고 부족 제품] - 안전 재고 이하 제품 (빨간 경고)
[생산 현황] - 단계별 건수
[메시징 채널] - 채널별 발송 수`,
                tips: "F5 또는 새로고침 아이콘으로 최신 데이터를 불러올 수 있습니다.",
              },
            ],
          },
        ],
      },
      {
        id: "mgmt-settings",
        icon: Settings,
        title: "시스템 설정",
        items: [
          {
            id: "user-management",
            icon: UserCheck,
            title: "사용자 및 권한 관리",
            subtitle: "직원 계정 생성, 역할 부여, 접근 권한 관리",
            color: "bg-gray-100 text-gray-700",
            steps: [
              {
                title: "사용자 관리",
                content: `1. 사이드바에서 "경영관리팀" > "시스템 관리" > "설정"을 클릭합니다.
2. "메뉴 관리" 탭에서 사이드바에 표시할 메뉴를 선택합니다.
3. 각 직원에게 역할(관리자/부서장/팀장/직원)을 부여할 수 있습니다.
4. 부서를 지정하여 접근 권한을 설정합니다.`,
              },
            ],
          },
          {
            id: "cafe24-integration",
            icon: Cog,
            title: "카페24 연동 설정",
            subtitle: "카페24 쇼핑몰과 주문 데이터 연동",
            color: "bg-gray-100 text-gray-700",
            steps: [
              {
                title: "카페24 API 연동하기",
                content: `1. 사이드바에서 "경영관리팀" > "시스템 관리" > "외부 연동"을 클릭합니다.
2. 카페24 관리자 페이지에서 API 키를 발급받습니다.
   - 카페24 어드민 > 앱스토어 > API 관리
   - Client ID와 Client Secret을 복사합니다.
3. CRM에서 카페24 설정을 입력합니다:
   - Mall ID, Client ID, Client Secret, 동기화 간격
4. "저장" 후 "동기화 테스트"를 실행합니다.
5. 연동 완료 시 카페24 주문이 "통합 주문"에 자동 표시됩니다.`,
                tips: "카페24 API 연동 기술 설정은 관리자에게 문의하세요.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "sales",
    icon: Briefcase,
    title: "Sales팀",
    color: "border-green-400",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    subCategories: [
      {
        id: "sales-customer",
        icon: Users,
        title: "고객",
        items: [
          {
            id: "customer-list",
            icon: Users,
            title: "고객 조회 및 등록",
            subtitle: "고객 정보 등록, 조회, 검색, 필터링",
            color: "bg-cyan-100 text-cyan-700",
            steps: [
              {
                title: "고객 목록 보기",
                content: `1. 사이드바에서 "Sales팀" > "고객" > "고객 관리"를 클릭합니다.
2. 등록된 모든 고객이 표시됩니다.
3. 검색창에서 고객명, 이메일, 전화번호, 회사명으로 검색 가능합니다.
4. 등급(VIP/Gold/일반/신규), 상태(활성/비활성/휴면)로 필터링 가능합니다.`,
              },
              {
                title: "새 고객 등록하기",
                content: `1. "고객 등록" 버튼을 클릭합니다.
2. 고객 정보를 입력합니다:
   - 이름, 이메일, 전화번호, 휴대폰
   - 회사명, 직책, 부서 (B2B 고객의 경우)
   - 주소, 상세주소, 우편번호
   - 고객 등급: VIP / Gold / 일반 / 신규
   - 메모: 참고사항
3. "저장" 버튼을 클릭합니다.`,
              },
            ],
          },
          {
            id: "customer-grade",
            icon: Star,
            title: "고객 등급 관리",
            subtitle: "VIP, Gold, 일반, 신규 등급 분류 및 혜택",
            color: "bg-yellow-100 text-yellow-700",
            steps: [
              {
                title: "고객 등급 체계",
                content: `고객 등급은 4단계로 구분됩니다:

[VIP] - 누적 거래액 1,000만원 이상, 전용 담당자, 우선 AS
[Gold] - 누적 거래액 500만원 이상, 정기 할인, 신제품 우선 안내
[일반] - 기본 거래 고객, 일반 프로모션 적용
[신규] - 최근 가입/첫 거래, 웰컴 혜택 적용 가능`,
              },
            ],
          },
        ],
      },
      {
        id: "sales-product",
        icon: ShoppingBag,
        title: "제품/주문",
        items: [
          {
            id: "brand-products",
            icon: ShoppingBag,
            title: "브랜드 제품 관리",
            subtitle: "진단기기 및 화장품 제품을 등록하고 관리",
            color: "bg-green-100 text-green-700",
            steps: [
              {
                title: "제품 목록 보기",
                content: `1. 사이드바에서 "Sales팀" > "제품/주문" > "브랜드 제품"을 클릭합니다.
2. 등록된 모든 제품이 표 형태로 표시됩니다.
3. 브랜드(AH/LI), 제품명, SKU, 카테고리, 판매가, 원가, 재고, 상태 확인`,
              },
              {
                title: "새 제품 등록하기",
                content: `1. "제품 등록" 버튼을 클릭합니다.
2. 필수 항목: 브랜드, 카테고리, 제품명, SKU, 판매가
3. 선택 항목: 영문명, 용량, 원가, 도매가, 소매가, 재고, 설명
4. "등록" 버튼을 클릭합니다.`,
                tips: "SKU 규칙: 아람휴비스는 AH-, LILAI는 LI-로 시작합니다.",
              },
            ],
          },
          {
            id: "brand-orders",
            icon: ShoppingCart,
            title: "통합 주문 관리",
            subtitle: "카페24, 홈페이지, 직접 주문을 한곳에서 관리",
            color: "bg-orange-100 text-orange-700",
            steps: [
              {
                title: "주문 목록 보기",
                content: `1. 사이드바에서 "Sales팀" > "제품/주문" > "통합 주문"을 클릭합니다.
2. 모든 주문이 최신순으로 표시됩니다.
3. 브랜드, 주문번호, 고객명, 채널, 금액, 결제/주문 상태, 주문일 확인`,
              },
              {
                title: "주문 검색 및 필터링",
                content: `1. 검색: 주문번호, 고객명, 연락처
2. 브랜드 필터: 아람휴비스 / LILAI.AI
3. 채널 필터: 직접주문 / 카페24 / 홈페이지 / 전화주문 / 도매
4. 상태 필터: 주문접수 / 확인 / 처리중 / 배송중 / 배송완료`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    title: "Marketing팀",
    color: "border-purple-400",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    subCategories: [
      {
        id: "mkt-promotion",
        icon: Gift,
        title: "프로모션",
        items: [
          {
            id: "promotions",
            icon: Gift,
            title: "프로모션/할인 관리",
            subtitle: "고객 등급별 맞춤 할인 및 프로모션 운영",
            color: "bg-purple-100 text-purple-700",
            steps: [
              {
                title: "프로모션 목록 보기",
                content: `1. 사이드바에서 "Marketing팀" > "프로모션" > "프로모션 관리"를 클릭합니다.
2. 카드 형태로 모든 프로모션이 표시됩니다.
3. 상단 탭: 전체 / 진행중 / 예정 / 만료`,
              },
              {
                title: "새 프로모션 만들기",
                content: `1. "프로모션 생성" 버튼을 클릭합니다.
2. 기본 정보: 브랜드, 프로모션명, 코드, 유형
3. 할인 설정: 비율 할인(%) / 금액 할인(원) / N+1 증정
4. 기간 및 대상: 시작일, 종료일, 대상 등급, 사용 한도
5. "생성" 버튼을 클릭합니다.`,
                tips: "프로모션 코드는 영문 대문자 + 숫자 조합 권장 (예: SPRING2026)",
              },
            ],
          },
        ],
      },
      {
        id: "mkt-messaging",
        icon: Send,
        title: "대외 소통",
        items: [
          {
            id: "messaging",
            icon: Send,
            title: "멀티채널 메시징 허브",
            subtitle: "카카오톡, SMS, 이메일, 메신저, 슬랙으로 메시지 발송",
            color: "bg-pink-100 text-pink-700",
            steps: [
              {
                title: "메시징 허브 접속",
                content: `1. 사이드바에서 "Marketing팀" > "대외 소통" > "메시징 허브"를 클릭합니다.
2. 상단에 채널별 발송 통계: 카카오톡(K), SMS(S), 이메일(E), 메신저(M), 슬랙(#), 푸시(P)
3. 채널 카드를 클릭하면 해당 채널만 필터링됩니다.`,
              },
              {
                title: "메시지 발송하기",
                content: `1. "메시지 발송" 버튼을 클릭합니다.
2. 채널 선택 → 수신자 정보 → 메시지 내용 입력
3. "발송" 버튼을 클릭합니다.
4. 템플릿을 사용하면 채널과 내용이 자동으로 채워집니다.`,
                tips: "카카오톡/SMS 실제 발송은 API 키 설정이 필요합니다. 관리자에게 문의하세요.",
              },
            ],
          },
          {
            id: "campaigns",
            icon: Mail,
            title: "이메일 캠페인",
            subtitle: "대량 이메일 마케팅 캠페인 발송 및 추적",
            color: "bg-pink-100 text-pink-700",
            steps: [
              {
                title: "이메일 캠페인 사용하기",
                content: `1. 사이드바에서 "Marketing팀" > "대외 소통" > "이메일 캠페인"을 클릭합니다.
2. 캠페인 목록에서 기존 캠페인을 확인하거나 새로 생성합니다.
3. 캠페인 생성: 제목, 수신 대상, 이메일 내용 작성
4. "발송" 버튼으로 일괄 발송합니다.
5. 발송 후 오픈율, 클릭율 등 통계를 확인할 수 있습니다.`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "research",
    icon: FlaskConical,
    title: "연구소",
    color: "border-teal-400",
    bgColor: "bg-teal-50",
    textColor: "text-teal-700",
    subCategories: [
      {
        id: "research-production",
        icon: Factory,
        title: "생산/품질",
        items: [
          {
            id: "production",
            icon: Factory,
            title: "생산 공정 관리",
            subtitle: "제품 생산 진행 상황을 6단계로 추적",
            color: "bg-teal-100 text-teal-700",
            steps: [
              {
                title: "생산 주문 현황 보기",
                content: `1. 사이드바에서 "연구소" > "생산/품질" > "생산 관리"를 클릭합니다.
2. 상단에 상태별 건수: 계획, 자재 준비, 생산중, 품질 검사, 완료, 취소
3. 상태 카드를 클릭하면 해당 상태만 필터링됩니다.`,
              },
              {
                title: "생산 6단계 이해하기",
                content: `1단계: 원료 준비 - 원재료 입고 및 계량
2단계: 혼합/배합 - 원료를 비율에 맞게 배합
3단계: 충전/조립 - 용기에 충전 또는 기기 조립
4단계: 포장 - 라벨링, 박스 포장
5단계: 품질 검사 - 품질 기준 검사
6단계: 출고 대기 - 창고 입고, 출고 준비

아이콘: 회색=대기, 파란=진행중, 초록=완료, 빨강=실패`,
              },
              {
                title: "생산 단계 상태 변경",
                content: `1. 생산 주문 카드에서 각 단계 버튼을 클릭합니다.
2. 첫 클릭: 대기 → 진행 중 (파란색)
3. 두 번째 클릭: 진행 중 → 완료 (초록색)
4. 6단계 모두 완료 시 전체 주문도 자동으로 완료됩니다.`,
                tips: "진행률 바를 보면 전체 진행 상황을 한눈에 파악할 수 있습니다.",
              },
            ],
          },
          {
            id: "quality-control",
            icon: Shield,
            title: "품질 검사 및 인증",
            subtitle: "제품 품질 기준 관리 및 검사 절차",
            color: "bg-emerald-100 text-emerald-700",
            steps: [
              {
                title: "품질 검사 기준",
                content: `[진단기기 (아람휴비스)]
  - 외관, 기능(센서 정확도), 안전(전기/과열), 소프트웨어(앱 연동)

[화장품 (LILAI.AI)]
  - 성분(유해물질), 안정성(변색/변질), 용기(밀봉/라벨), 미생물`,
              },
              {
                title: "검사 결과 기록",
                content: `1. 생산 관리에서 "품질 검사" 단계 주문을 선택합니다.
2. 각 항목별 합격/불합격을 체크합니다.
3. 불합격 시 사유를 기록합니다.
4. 전체 합격 → 출고 대기로 이동
5. 불합격 → 재검사 또는 폐기 처리`,
                tips: "검사 결과는 수정 불가하며 감사 로그에 영구 기록됩니다.",
              },
            ],
          },
        ],
      },
    ],
  },
];

export default function ManualPage() {
  const [search, setSearch] = useState("");
  const [activeTeam, setActiveTeam] = useState<string>("crm-automation");
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleSub = (id: string) => setExpandedSubs((p) => ({ ...p, [id]: !p[id] }));
  const toggleItem = (id: string) => setExpandedItems((p) => ({ ...p, [id]: !p[id] }));
  const toggleStep = (key: string) => setExpandedSteps((p) => ({ ...p, [key]: !p[key] }));

  const filterTree = (teams: ManualTeam[]): ManualTeam[] => {
    if (!search) return teams;
    const q = search.toLowerCase();
    return teams
      .map((team) => ({
        ...team,
        subCategories: team.subCategories
          .map((sub) => ({
            ...sub,
            items: sub.items.filter(
              (item) =>
                item.title.toLowerCase().includes(q) ||
                item.subtitle.toLowerCase().includes(q) ||
                item.steps.some((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))
            ),
          }))
          .filter((sub) => sub.items.length > 0),
      }))
      .filter((team) => team.subCategories.length > 0);
  };

  const filteredTree = filterTree(manualTree);
  const activeTeamData = filteredTree.find((t) => t.id === activeTeam) || filteredTree[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#111] to-[#333] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">AramCRM 사용 매뉴얼</h1>
            <p className="text-white/50 text-xs">아람휴비스 & LILAI.AI CRM 시스템 가이드</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-xl border px-4 py-3">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="매뉴얼 검색... (예: AS 접수, 프로모션, 자동화)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* Team Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filteredTree.map((team) => {
          const isActive = activeTeamData?.id === team.id;
          const TeamIcon = team.icon;
          return (
            <button
              key={team.id}
              onClick={() => setActiveTeam(team.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                isActive
                  ? `${team.bgColor} ${team.textColor} ${team.color}`
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <TeamIcon size={16} />
              <span>{team.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTeamData && (
        <div className="space-y-4">
          {activeTeamData.subCategories.map((sub) => {
            const isSubOpen = expandedSubs[sub.id] !== false;
            const SubIcon = sub.icon;

            return (
              <div key={sub.id} className="bg-white rounded-2xl border">
                {/* Sub Category Header */}
                <button
                  onClick={() => toggleSub(sub.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors rounded-t-2xl"
                >
                  <SubIcon size={18} className="text-gray-400 shrink-0" />
                  <span className="text-sm font-bold text-[#111] flex-1 text-left">{sub.title}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {sub.items.length}개
                  </span>
                  {isSubOpen ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>

                {/* Items */}
                {isSubOpen && (
                  <div className="border-t px-5 pb-4 space-y-3 pt-3">
                    {sub.items.map((item) => {
                      const isItemOpen = expandedItems[item.id] !== false;
                      const ItemIcon = item.icon;

                      return (
                        <div key={item.id} className="border rounded-xl">
                          {/* Item Header */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                              <ItemIcon size={16} />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-semibold text-[#111]">{item.title}</p>
                              <p className="text-xs text-gray-400">{item.subtitle}</p>
                            </div>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg shrink-0">
                              {item.steps.length}단계
                            </span>
                            {isItemOpen ? (
                              <ChevronDown size={14} className="text-gray-400 shrink-0" />
                            ) : (
                              <ChevronRight size={14} className="text-gray-400 shrink-0" />
                            )}
                          </button>

                          {/* Steps */}
                          {isItemOpen && (
                            <div className="border-t px-4 pb-3 space-y-2 pt-2">
                              {item.steps.map((step, idx) => {
                                const stepKey = `${item.id}-${idx}`;
                                const isStepOpen = expandedSteps[stepKey];

                                return (
                                  <div key={idx} className="border rounded-lg">
                                    <button
                                      onClick={() => toggleStep(stepKey)}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {idx + 1}
                                      </div>
                                      <span className="text-sm font-medium text-[#111] flex-1">{step.title}</span>
                                      {isStepOpen ? (
                                        <ChevronDown size={14} className="text-gray-400" />
                                      ) : (
                                        <ChevronRight size={14} className="text-gray-400" />
                                      )}
                                    </button>

                                    {isStepOpen && (
                                      <div className="px-3 pb-3 border-t bg-gray-50/50">
                                        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-3 font-sans">
                                          {step.content}
                                        </pre>
                                        {step.tips && (
                                          <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                                            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700">{step.tips}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="bg-white rounded-2xl border p-5 text-center">
        <p className="text-xs text-gray-400">
          AramCRM v2.0 | 최종 업데이트: 2026년 3월 6일 | 추가 도움이 필요하시면 시스템 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
