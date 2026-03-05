"use client";

import { useState } from "react";
import {
  BookOpen, ChevronRight, ChevronDown, Search,
  Layers, ShoppingBag, ShoppingCart, Gift, Factory, Send,
  LayoutDashboard, Users, MessageSquare, Wrench, Package, Truck,
  Settings, Monitor, ArrowRight, CheckCircle2, Info,
  Play, Clock, MousePointer, Keyboard
} from "lucide-react";

interface ManualSection {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  steps: {
    title: string;
    content: string;
    tips?: string;
  }[];
}

const manualSections: ManualSection[] = [
  {
    id: "login",
    icon: Monitor,
    title: "1. 시스템 접속 및 로그인",
    subtitle: "CRM 시스템에 접속하고 로그인하는 방법",
    color: "bg-gray-100 text-gray-700",
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
        content: `1. "이메일" 입력란에 회사 이메일(예: hyun@aramhubis.com)을 입력합니다.
2. "비밀번호" 입력란에 비밀번호를 입력합니다.
3. "로그인" 버튼을 클릭합니다.
4. 로그인에 성공하면 대시보드 화면으로 이동합니다.`,
        tips: "비밀번호를 잊었을 경우 관리자에게 초기화를 요청하세요.",
      },
      {
        title: "계정이 없는 경우 (회원가입)",
        content: `1. 로그인 페이지 하단의 "회원가입" 링크를 클릭합니다.
2. 이름, 회사 이메일, 비밀번호를 입력합니다.
3. "가입하기" 버튼을 클릭합니다.
4. 가입 후 자동으로 로그인됩니다.`,
      },
    ],
  },
  {
    id: "navigation",
    icon: LayoutDashboard,
    title: "2. 화면 구성 및 메뉴 이동",
    subtitle: "사이드바, 상단바, 메뉴 구조 이해하기",
    color: "bg-blue-100 text-blue-700",
    steps: [
      {
        title: "화면 구성 이해하기",
        content: `CRM 화면은 크게 3가지 영역으로 구성됩니다:

[왼쪽 사이드바] - 검은색 세로 메뉴 바
  - 모든 기능 메뉴가 카테고리별로 정리되어 있습니다.
  - "브랜드 CRM", "업무", "소통", "고객", "운영", "자료", "시스템" 그룹으로 나뉩니다.
  - 각 그룹을 클릭하면 접었다 펼 수 있습니다.

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
        content: `1. 왼쪽 사이드바에서 원하는 메뉴를 클릭합니다.
2. 예를 들어, "브랜드 대시보드"를 클릭하면 브랜드 통합 현황이 나타납니다.
3. 메뉴 그룹 이름(예: "브랜드 CRM")을 클릭하면 해당 그룹의 메뉴가 접히거나 펼쳐집니다.`,
        tips: "사이드바 상단의 화살표(<) 버튼을 누르면 사이드바를 접어 넓은 화면으로 사용할 수 있습니다.",
      },
      {
        title: "글로벌 검색 사용하기",
        content: `1. 상단 바의 "검색..." 영역을 클릭하거나 키보드에서 Ctrl+K를 누릅니다.
2. 검색창이 나타나면 찾고 싶은 키워드를 입력합니다.
3. 고객명, 주문번호, 메뉴 이름 등 다양한 항목을 검색할 수 있습니다.
4. 검색 결과를 클릭하면 해당 페이지로 이동합니다.`,
      },
    ],
  },
  {
    id: "brand-dashboard",
    icon: Layers,
    title: "3. 브랜드 통합 대시보드",
    subtitle: "아람휴비스 & LILAI.AI 전체 현황을 한눈에 파악",
    color: "bg-indigo-100 text-indigo-700",
    steps: [
      {
        title: "대시보드 접속하기",
        content: `1. 사이드바에서 "브랜드 CRM" > "브랜드 대시보드"를 클릭합니다.
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
  - 제품 수: 등록된 전체 제품 수
  - 활성 제품: 재고가 있는 제품 수
  - 총 주문: 전체 주문 건수
  - 대기 주문: 아직 처리되지 않은 주문
  - 진행 프로모션: 현재 진행 중인 프로모션 수
  - 생산 진행: 현재 생산 중인 제품
  - 메시지 발송: 발송된 메시지 총 건수

[매출 차트] - 최근 30일간의 일별 매출 추이 막대 그래프
  - 막대 위에 마우스를 올리면 해당 날짜의 매출과 주문 건수가 표시됩니다.

[주문 채널별 현황] - 어떤 경로로 주문이 들어왔는지 비율 표시
  (직접 주문, 카페24, 홈페이지, 전화 주문, 도매)

[최근 주문] - 가장 최근에 들어온 주문 10건

[재고 부족 제품] - 안전 재고 이하인 제품 목록 (빨간 경고)

[생산 현황] - 현재 생산 단계별 건수

[메시징 채널] - 채널별 메시지 발송 수`,
        tips: "새로고침(F5) 버튼이나 페이지 우상단의 새로고침 아이콘을 클릭하면 최신 데이터로 업데이트됩니다.",
      },
    ],
  },
  {
    id: "brand-products",
    icon: ShoppingBag,
    title: "4. 브랜드 제품 관리",
    subtitle: "진단기기 및 화장품 제품을 등록하고 관리",
    color: "bg-green-100 text-green-700",
    steps: [
      {
        title: "제품 목록 보기",
        content: `1. 사이드바에서 "브랜드 CRM" > "브랜드 제품"을 클릭합니다.
2. 등록된 모든 제품이 표 형태로 표시됩니다.
3. 각 행에는 브랜드(AH/LI), 제품명, SKU, 카테고리, 판매가, 원가, 재고, 상태가 표시됩니다.`,
      },
      {
        title: "제품 검색 및 필터링",
        content: `1. 상단 검색창에 제품명이나 SKU를 입력하면 실시간으로 필터링됩니다.
2. "전체 브랜드" 드롭다운: 아람휴비스 또는 LILAI.AI 제품만 필터
3. "전체 카테고리" 드롭다운: 특정 제품 종류만 필터
   - 아람휴비스: 두피 진단기, 모발 진단기, 피부 진단기
   - LILAI.AI: 샴푸, 세럼, 로션, 선크림, 맞춤형 화장품`,
      },
      {
        title: "새 제품 등록하기",
        content: `1. 페이지 우상단의 "제품 등록" 버튼을 클릭합니다.
2. 팝업 창이 나타나면 아래 정보를 입력합니다:

   [필수 항목]
   - 브랜드: 아람휴비스 또는 LILAI.AI 선택
   - 카테고리: 제품 종류 선택 (예: 샴푸, 두피 진단기 등)
   - 제품명 (한글): 예) 릴라이 수분 세럼
   - SKU: 제품 고유 코드 (예: LI-SR003)
   - 판매가: 소비자 판매 가격

   [선택 항목]
   - 제품명 (영문), 용량, 원가, 도매가, 소매가
   - 현재 재고, 안전 재고 (이 이하면 경고)
   - 설명

3. 모든 정보 입력 후 "등록" 버튼을 클릭합니다.
4. 제품이 목록에 추가됩니다.`,
        tips: "SKU는 중복될 수 없습니다. 아람휴비스는 AH-, LILAI는 LI-로 시작하는 규칙을 권장합니다.",
      },
      {
        title: "재고 부족 확인하기",
        content: `1. 제품 목록에서 "재고" 열을 확인합니다.
2. 빨간색 숫자로 표시된 제품은 안전 재고 이하입니다.
3. 해당 제품의 입고 또는 생산을 진행해야 합니다.`,
      },
    ],
  },
  {
    id: "brand-orders",
    icon: ShoppingCart,
    title: "5. 통합 주문 관리",
    subtitle: "카페24, 홈페이지, 직접 주문을 한곳에서 관리",
    color: "bg-orange-100 text-orange-700",
    steps: [
      {
        title: "주문 목록 보기",
        content: `1. 사이드바에서 "브랜드 CRM" > "통합 주문"을 클릭합니다.
2. 모든 주문이 최신순으로 표시됩니다.
3. 각 주문에는 다음 정보가 표시됩니다:
   - 브랜드 (AH/LI 뱃지)
   - 주문번호 (BO-로 시작: 직접주문, C24-: 카페24)
   - 고객명 및 연락처
   - 채널 (직접주문/카페24/홈페이지/전화주문/도매)
   - 금액
   - 결제 상태 (미결제/결제완료/부분결제)
   - 주문 상태 (주문접수/확인/처리중/배송중/배송완료 등)
   - 주문일`,
      },
      {
        title: "주문 검색 및 필터링",
        content: `1. 검색창: 주문번호, 고객명, 연락처로 검색
2. "전체 브랜드": 아람휴비스 또는 LILAI.AI만 필터
3. "전체 채널": 특정 주문 채널만 필터
   - 직접주문: 오프라인 또는 B2B 주문
   - 카페24: 온라인 쇼핑몰 주문
   - 홈페이지: 자사 웹사이트 주문
   - 전화주문: 전화 접수 주문
   - 도매: B2B 대량 주문
4. "전체 상태": 특정 주문 상태만 필터`,
      },
      {
        title: "주문 상세 보기",
        content: `1. 주문 목록에서 오른쪽 끝의 눈(👁) 아이콘을 클릭합니다.
2. 주문 상세 팝업이 열립니다.
3. 상세 정보에서 확인할 수 있는 내용:
   - 고객 정보 (이름, 전화번호, 이메일)
   - 배송 정보 (택배사, 운송장번호)
   - 주문 상품 목록 (상품명, 단가, 수량, 할인, 합계)
   - 총 주문 금액`,
      },
    ],
  },
  {
    id: "promotions",
    icon: Gift,
    title: "6. 프로모션/할인 관리",
    subtitle: "고객 등급별 맞춤 할인 및 프로모션 운영",
    color: "bg-purple-100 text-purple-700",
    steps: [
      {
        title: "프로모션 목록 보기",
        content: `1. 사이드바에서 "브랜드 CRM" > "프로모션"을 클릭합니다.
2. 카드 형태로 모든 프로모션이 표시됩니다.
3. 상단 탭으로 상태별 필터링:
   - "전체": 모든 프로모션
   - "진행중": 현재 활성화된 프로모션
   - "예정": 아직 시작하지 않은 프로모션
   - "만료": 기간이 종료된 프로모션`,
      },
      {
        title: "새 프로모션 만들기",
        content: `1. 우상단 "프로모션 생성" 버튼을 클릭합니다.
2. 팝업에서 아래 정보를 입력합니다:

   [기본 정보]
   - 브랜드: 적용할 브랜드 선택
   - 프로모션명: 예) "봄맞이 전품목 20% 할인"
   - 프로모션 코드: 고객이 입력할 코드 (예: SPRING2026)
   - 유형: 할인, 쿠폰, 번들, 로열티, 시즌 중 선택

   [할인 설정]
   - 할인 방식: "비율 할인"(%), "금액 할인"(원), "N+1 증정"
   - 할인 값: 예) 20 (=20% 할인) 또는 5000 (=5,000원 할인)

   [기간 및 대상]
   - 시작일 / 종료일: 프로모션 기간
   - 대상 고객 등급: 전체, VIP, Gold, 일반, 신규
   - 사용 한도: 총 사용 가능 횟수 (0=무제한)

3. "생성" 버튼을 클릭하면 프로모션이 등록됩니다.`,
        tips: "프로모션 코드는 영문 대문자와 숫자 조합으로 만드세요. 예: SUMMER2026, VIP30",
      },
      {
        title: "프로모션 카드 읽는 법",
        content: `각 프로모션 카드에 표시되는 정보:

- 좌상단 뱃지: 브랜드 (AH=아람휴비스, LI=LILAI)
- 우상단 뱃지: 상태 (진행중=초록, 예정=파랑, 만료=빨강)
- 프로모션명
- 프로모션 코드 (회색 박스)
- 할인 내용: "20% 할인" 또는 "5,000원 할인"
- 기간: 시작일 ~ 종료일
- 대상: VIP, Gold 등 타겟 고객층
- 사용 현황: 사용 건수 / 한도`,
      },
    ],
  },
  {
    id: "production",
    icon: Factory,
    title: "7. 생산 공정 관리",
    subtitle: "제품 생산 진행 상황을 6단계로 추적",
    color: "bg-teal-100 text-teal-700",
    steps: [
      {
        title: "생산 주문 현황 보기",
        content: `1. 사이드바에서 "브랜드 CRM" > "생산 관리"를 클릭합니다.
2. 상단에 상태별 건수가 표시됩니다:
   - 계획: 아직 시작하지 않은 생산
   - 자재 준비: 원료를 준비하는 단계
   - 생산중: 현재 생산이 진행 중
   - 품질 검사: 생산된 제품의 품질을 검사하는 단계
   - 완료: 생산이 완료된 건
   - 취소: 취소된 건
3. 각 상태 카드를 클릭하면 해당 상태의 주문만 필터링됩니다.`,
      },
      {
        title: "생산 진행 단계 이해하기",
        content: `각 생산 주문은 6단계로 진행됩니다:

  1단계: 원료 준비 ──> 원재료 입고 및 계량
  2단계: 혼합/배합 ──> 원료를 비율에 맞게 배합
  3단계: 충전/조립 ──> 용기에 충전 또는 기기 조립
  4단계: 포장 ──────> 라벨링, 박스 포장
  5단계: 품질 검사 ──> 품질 기준 검사
  6단계: 출고 대기 ──> 창고 입고, 출고 준비

각 단계의 아이콘 의미:
  - 회색 동그라미(○): 아직 시작 안 됨
  - 파란 재생(▶): 진행 중
  - 초록 체크(✓): 완료됨
  - 빨간 경고(⚠): 실패/문제 발생`,
      },
      {
        title: "생산 단계 상태 변경하기",
        content: `1. 생산 주문 카드에서 각 단계 버튼을 클릭합니다.
2. 클릭할 때마다 상태가 순서대로 변경됩니다:
   - 첫 번째 클릭: "대기" → "진행 중" (파란색으로 변경)
   - 두 번째 클릭: "진행 중" → "완료" (초록색으로 변경)
3. 모든 6단계가 "완료"되면 전체 생산 주문도 자동으로 "완료" 상태가 됩니다.`,
        tips: "진행률 바를 보면 전체 생산 진행 상황을 한눈에 파악할 수 있습니다.",
      },
    ],
  },
  {
    id: "messaging",
    icon: Send,
    title: "8. 멀티채널 메시징 허브",
    subtitle: "카카오톡, SMS, 이메일, 메신저, 슬랙으로 고객에게 메시지 발송",
    color: "bg-pink-100 text-pink-700",
    steps: [
      {
        title: "메시징 허브 접속",
        content: `1. 사이드바에서 "브랜드 CRM" > "메시징 허브"를 클릭합니다.
2. 상단에 채널별 발송 통계가 카드로 표시됩니다:
   - K: 카카오톡
   - S: SMS (문자)
   - E: 이메일
   - M: 메신저 (Facebook/Instagram)
   - #: 슬랙
   - P: 푸시 알림
3. 채널 카드를 클릭하면 해당 채널의 메시지만 필터링됩니다.`,
      },
      {
        title: "메시지 발송하기",
        content: `1. 우상단 "메시지 발송" 버튼을 클릭합니다.
2. 발송 팝업에서 아래 정보를 입력합니다:

   [채널 선택]
   - 카카오톡: 카카오 알림톡/친구톡 발송
   - SMS: 문자 메시지 발송
   - 이메일: 이메일 발송
   - 메신저: 페이스북/인스타 메시지
   - 슬랙: 슬랙 채널 메시지
   - 푸시 알림: 앱 푸시 알림

   [수신자 정보]
   - 수신자명: 고객 이름
   - 연락처: 전화번호 또는 이메일 (채널에 따라 다름)

   [메시지 내용]
   - 제목: (이메일, 슬랙의 경우)
   - 내용: 실제 발송될 메시지

3. "발송" 버튼을 클릭하면 메시지가 발송됩니다.`,
        tips: "실제 카카오톡/SMS 발송을 위해서는 각 서비스의 API 키 설정이 필요합니다. 관리자에게 문의하세요.",
      },
      {
        title: "메시지 템플릿 사용하기",
        content: `1. 메시지 발송 팝업에서 우상단 "템플릿" 버튼을 클릭합니다.
2. 미리 등록된 템플릿 목록이 나타납니다.
3. 원하는 템플릿을 클릭하면 채널과 내용이 자동으로 채워집니다.
4. {{customerName}}, {{orderNumber}} 같은 변수 부분을 실제 값으로 수정합니다.
5. 수정 후 "발송" 버튼을 클릭합니다.

등록된 템플릿 예시:
   - "주문 확인 (카카오)": 주문 접수 알림
   - "배송 알림 (SMS)": 배송 출발 알림
   - "프로모션 안내 (카카오)": 할인 이벤트 안내
   - "견적서 발송 (이메일)": B2B 견적서
   - "VIP 혜택 안내 (메신저)": VIP 고객 전용`,
      },
      {
        title: "발송 내역 확인하기",
        content: `1. 메시지 목록에서 과거 발송 내역을 확인합니다.
2. 각 메시지의 상태를 확인합니다:
   - 대기: 아직 발송되지 않음
   - 발송: 발송 완료
   - 수신: 고객이 수신함
   - 읽음: 고객이 읽음
   - 실패: 발송 실패 (번호 오류 등)`,
      },
    ],
  },
  {
    id: "customers",
    icon: Users,
    title: "9. 고객 관리",
    subtitle: "고객 정보 등록, 조회, 등급 관리",
    color: "bg-cyan-100 text-cyan-700",
    steps: [
      {
        title: "고객 목록 보기",
        content: `1. 사이드바에서 "고객" > "고객 관리"를 클릭합니다.
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
      {
        title: "고객 상세 정보 보기",
        content: `1. 고객 목록에서 고객명을 클릭합니다.
2. 고객 상세 페이지에서 아래 정보를 확인할 수 있습니다:
   - 기본 정보 (연락처, 회사, 주소)
   - 커뮤니케이션 이력 (전화, 이메일, 미팅 기록)
   - 주문 이력
   - AS 접수 이력
   - 고객 건강 점수
   - 활동 로그`,
      },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "10. 시스템 설정",
    subtitle: "사용자 관리, 메뉴 설정, 연동 설정",
    color: "bg-gray-100 text-gray-700",
    steps: [
      {
        title: "사용자 관리",
        content: `1. 사이드바 하단의 "설정"을 클릭합니다.
2. "사용자 관리" 탭에서 직원 계정을 관리합니다.
3. 각 직원에게 역할(관리자/부서장/팀장/직원)을 부여할 수 있습니다.
4. 부서를 지정하여 접근 권한을 설정합니다.`,
      },
      {
        title: "메뉴 커스터마이즈",
        content: `1. 설정 > "메뉴 관리"에서 사이드바에 표시할 메뉴를 선택합니다.
2. 사용하지 않는 기능의 메뉴를 숨길 수 있습니다.
3. 변경 후 "저장"을 클릭하면 즉시 반영됩니다.`,
      },
      {
        title: "카페24 연동 설정 (관리자)",
        content: `카페24 온라인 쇼핑몰과 주문을 연동하려면:

1. 카페24 관리자 페이지에서 API 키를 발급받습니다.
   - 카페24 어드민 > 앱스토어 > API 관리
   - Client ID와 Client Secret을 복사합니다.

2. CRM 시스템의 "외부 연동" 메뉴에서 카페24 설정을 입력합니다:
   - Mall ID: 카페24 쇼핑몰 ID
   - Client ID: 발급받은 클라이언트 ID
   - Client Secret: 발급받은 시크릿 키
   - 동기화 간격: 몇 분마다 주문을 가져올지 설정

3. "저장" 후 "동기화 테스트"를 실행합니다.
4. 연동이 완료되면 카페24 주문이 자동으로 "통합 주문"에 표시됩니다.`,
        tips: "카페24 API 연동에 대한 자세한 기술 설정은 관리자에게 문의하세요.",
      },
    ],
  },
];

export default function ManualPage() {
  const [search, setSearch] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("login");
  const [expandedStep, setExpandedStep] = useState<Record<string, number | null>>({});

  const filteredSections = search
    ? manualSections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.subtitle.toLowerCase().includes(search.toLowerCase()) ||
          s.steps.some(
            (step) =>
              step.title.toLowerCase().includes(search.toLowerCase()) ||
              step.content.toLowerCase().includes(search.toLowerCase())
          )
      )
    : manualSections;

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const toggleStep = (sectionId: string, stepIndex: number) => {
    setExpandedStep((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] === stepIndex ? null : stepIndex,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#111] to-[#333] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AramCRM 사용 매뉴얼</h1>
            <p className="text-white/60 text-sm">아람휴비스 & LILAI.AI CRM 시스템 완전 가이드</p>
          </div>
        </div>
        <p className="text-white/70 text-sm mt-4 leading-relaxed">
          이 매뉴얼은 CRM 시스템의 모든 기능을 단계별로 상세하게 설명합니다.
          각 섹션을 클릭하여 펼치고, 단계별 안내를 따라하세요.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-xl border px-4 py-3">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="매뉴얼 내 검색... (예: 제품 등록, 프로모션, 카카오톡)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* Quick Navigation */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-[#111] mb-4 flex items-center gap-2">
          <Keyboard size={16} className="text-gray-400" />
          빠른 이동
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {manualSections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setExpandedSection(section.id);
                document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors text-left"
            >
              <section.icon size={14} className="text-gray-500 shrink-0" />
              <span className="truncate">{section.title.replace(/^\d+\.\s*/, "")}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Sections */}
      <div className="space-y-3">
        {filteredSections.map((section) => {
          const isExpanded = expandedSection === section.id;

          return (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className="bg-white rounded-2xl border overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-4 p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${section.color} flex items-center justify-center shrink-0`}>
                  <section.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#111]">{section.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{section.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                    {section.steps.length}단계
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400" />
                  )}
                </div>
              </button>

              {/* Steps */}
              {isExpanded && (
                <div className="border-t px-6 pb-6">
                  <div className="space-y-2 mt-4">
                    {section.steps.map((step, idx) => {
                      const isStepExpanded = expandedStep[section.id] === idx;

                      return (
                        <div key={idx} className="border rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleStep(section.id, idx)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-medium text-[#111] flex-1">{step.title}</span>
                            {isStepExpanded ? (
                              <ChevronDown size={16} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-400" />
                            )}
                          </button>

                          {isStepExpanded && (
                            <div className="px-4 pb-4 border-t bg-gray-50">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-3 font-sans">
                                {step.content}
                              </pre>
                              {step.tips && (
                                <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                  <p className="text-sm text-blue-700">{step.tips}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-white rounded-2xl border p-6 text-center">
        <p className="text-sm text-gray-500 mb-2">
          추가 도움이 필요하시면 시스템 관리자에게 문의하세요.
        </p>
        <p className="text-xs text-gray-400">
          AramCRM v2.0 | 최종 업데이트: 2026년 3월 6일
        </p>
      </div>
    </div>
  );
}
