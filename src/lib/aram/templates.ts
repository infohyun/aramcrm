// 미팅 요약 템플릿 - 대화 성격에 맞춰 요약 구조를 다르게 생성
export interface AramTemplate {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

export const ARAM_TEMPLATES: AramTemplate[] = [
  {
    id: 'general',
    name: '일반 미팅',
    description: '배경 · 논의 · 결정 · 다음 단계',
    instructions: '요약은 "## 배경", "## 주요 논의", "## 결정 사항", "## 다음 단계" 섹션으로 구성한다.',
  },
  {
    id: 'sales',
    name: '영업 · 고객 미팅',
    description: '고객 니즈, 예산, 의사결정 구조, 경쟁사, 구매 시점',
    instructions:
      '요약은 "## 고객 현황과 니즈", "## 예산·일정(BANT)", "## 의사결정 구조와 키맨", "## 경쟁사·대안", "## 제안 내용과 반응", "## 거래 가능성 평가" 섹션으로 구성한다. 거래 단계(리드/상담/제안/협상/계약)를 추정해 명시한다.',
  },
  {
    id: 'partnership',
    name: '파트너십 · 해외 바이어',
    description: '상대사 소개, 협력 모델, 조건, 리스크',
    instructions:
      '요약은 "## 상대사 개요", "## 협력 모델 제안", "## 거래 조건(가격·수량·인증·물류)", "## 상호 기대사항", "## 리스크와 확인 필요사항", "## 후속 진행 로드맵" 섹션으로 구성한다.',
  },
  {
    id: 'investor',
    name: '투자 · IR',
    description: '투자자 관심사, 질문, 우려, 후속 자료',
    instructions:
      '요약은 "## 투자자 프로필", "## 관심 포인트", "## 질의응답", "## 우려 사항", "## 요청 자료와 후속 일정" 섹션으로 구성한다.',
  },
  {
    id: 'internal',
    name: '사내 회의',
    description: '안건별 논의, 결정, 담당자와 기한',
    instructions: '요약은 안건별 "## 안건: ..." 섹션으로 나누고 각 안건마다 논의 내용, 결정, 담당자를 정리한다.',
  },
  {
    id: 'one_on_one',
    name: '1:1 면담',
    description: '근황, 고민, 피드백, 성장 계획',
    instructions: '요약은 "## 근황", "## 고민·이슈", "## 피드백", "## 합의한 다음 행동" 섹션으로 구성한다.',
  },
  {
    id: 'interview',
    name: '인터뷰 · 채용',
    description: '후보자 경력, 역량 평가, 강점·우려',
    instructions:
      '요약은 "## 후보자 배경", "## 핵심 역량 근거", "## 강점", "## 우려 사항", "## 종합 의견" 섹션으로 구성한다.',
  },
  {
    id: 'cs',
    name: '고객 지원 · AS',
    description: '문제 증상, 원인, 조치, 재발 방지',
    instructions:
      '요약은 "## 고객 문의/증상", "## 원인 분석", "## 조치 내용", "## 고객 반응", "## 재발 방지·후속 조치" 섹션으로 구성한다.',
  },
  {
    id: 'lecture',
    name: '강의 · 세미나',
    description: '핵심 개념, 인사이트, 적용점',
    instructions: '요약은 "## 핵심 주제", "## 주요 개념과 인사이트", "## 아람휴비스 적용 포인트" 섹션으로 구성한다.',
  },
];

export function getTemplate(id?: string | null): AramTemplate {
  return ARAM_TEMPLATES.find((t) => t.id === id) ?? ARAM_TEMPLATES[0];
}
