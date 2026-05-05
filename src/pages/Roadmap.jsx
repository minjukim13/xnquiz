import { Flag, CheckCircle2, Loader2, MapPin, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STAGES = [
  // ── 완료 ──
  {
    phase: 'done',
    title: 'Canvas 기본 퀴즈 기능 구현',
    summary: '퀴즈 서비스의 뼈대가 되는 핵심 기능을 갖췄습니다.',
    bullets: [
      '문항 유형(객관식, 주관식, OX, 빈칸 등) 작성 및 배포',
      '학생 응시 → 자동 채점 → 결과 확인까지의 기본 플로우',
      '퀴즈 상태(초안/게시/마감) 관리와 마감 처리',
    ],
  },
  {
    phase: 'done',
    title: '고객사 요구사항 반영',
    summary: '실제 운영 현장에서 요구된 기능을 우선 적용했습니다.',
    bullets: [
      '주차/차시 기반 퀴즈 분류 및 필터',
      '점수 공개 범위 및 시점 제어, 지각 제출 정책',
      '학생/교수자/운영자 역할별 화면 분기',
    ],
  },
  {
    phase: 'done',
    title: 'Canvas 기능 보완',
    summary: 'Canvas에는 있었지만 XN 퀴즈에는 없던 보조 기능을 채웠습니다.',
    bullets: [
      '가산점, 부분점수 등 채점 관련 보조 기능',
      '문제은행 가져오기/내보내기 등 운영 편의 기능',
      '필수는 아니지만 없으면 어색한 기본기 보완',
    ],
  },
  {
    phase: 'done',
    title: '백엔드 구현',
    summary: 'Mock 기반 프로토타입에서 실 API 연동 가능한 구조로 전환했습니다.',
    bullets: [
      '퀴즈/문항/응시/채점 API 스키마 정의 및 연결',
      'LTI 1.3 진입 및 Canvas 성적 메뉴 연동 확인',
      '개발자 후속 마무리 작업 일부 잔존',
    ],
    note: '개발자가 후속으로 받아 마무리할 작업이 일부 남아있습니다.',
  },

  // ── 진행중 ──
  {
    phase: 'doing',
    title: '다중 PM 에이전트 검토 체계 운영',
    summary: '디자인 / 기획 / 개발 / QA / PO 다섯 관점의 AI 에이전트로 교차 검토를 자동화합니다.',
    bullets: [
      'PM1(디자인) ~ PM5(PO) + Leader 가 영역별 독립 검토 후 종합 보고',
      '한 사람이 놓치기 쉬운 정합성/예외 케이스를 다관점으로 보완',
      '동일 산출물에 대해 매번 같은 기준으로 검토 가능 → 품질 균질화',
    ],
  },
  {
    phase: 'doing',
    title: '시스템 UX 재검증',
    summary: '전체 화면 흐름과 인터랙션을 UX 관점에서 다시 점검합니다.',
    bullets: [
      '교수자/학생 핵심 시나리오의 가독성, 학습성, 효율성 점검',
      'UX 검증 기법(휴리스틱 평가, 사용성 점검) 활용',
      '체감 속도, 빈 상태/오류 상태, 안내 문구 일관성 확인',
    ],
  },
  {
    phase: 'doing',
    title: '디자인 시스템 구축',
    summary: '색/타이포/컴포넌트를 토큰화하여 일관된 UI 기반을 마련합니다.',
    bullets: [
      '시맨틱 컬러 토큰, 타이포 위계, 간격 체계 정리',
      '버튼/모달/배지 등 공용 컴포넌트 사용 규칙 정의',
      '확장 시 디자이너/개발자가 함께 참조할 단일 기준 마련',
    ],
  },

  // ── 예정 ──
  {
    phase: 'next',
    title: '실제 LMS 환경 호환성 검증',
    summary: '실제 LMS에 붙였을 때 주변 LTI/모듈과의 정합성을 확인합니다.',
    bullets: [
      '주차학습, 학습활동현황, 진단평가 등 기존 LTI와의 호환성 점검',
      '기존 퀴즈를 활용하던 학습 활동에서의 동작 검증',
      '프로토타입이 아닌 실 LMS에 기능을 붙인 상태에서의 통합 테스트',
    ],
    note: '프로토타입 단독 검증으로는 한계가 있어 실 LMS 환경에서의 검증이 필요합니다.',
  },
  {
    phase: 'next',
    title: '내부 선제 기능 발굴 및 고도화',
    summary: '고객사 요청 외, 내부 아이디어 기반의 추가 가치를 탐구합니다.',
    bullets: [
      '운영자 관점 기능 강화: 통계/현황 모니터링, 문항 품질 점검 도구',
      '교수자 효율 도구: 응시 결과 인사이트, 문항 재사용 권장',
      '학습자 측면: 응시 후 피드백/복습 흐름 보완',
    ],
  },
  {
    phase: 'next',
    title: '비즈니스 측면 확장',
    summary: '기능 고도화 너머의 사업 가치를 함께 설계합니다.',
    bullets: [
      '대학/학과 단위의 사용 현황 리포트로 도입 효과 가시화',
      '문항 공유/재사용 자산화(공동 문제은행, 우수 문항 큐레이션)',
      '타 LMS(예: Moodle, Blackboard) 연계 가능성 검토 및 확장 전략',
    ],
  },
]

const PHASE_META = {
  done: {
    label: '완료',
    badgeClass: 'bg-primary text-white border-transparent',
    flagClass: 'bg-primary text-white',
    lineClass: 'bg-primary',
    icon: CheckCircle2,
    summaryLabel: '완료',
  },
  doing: {
    label: '진행중',
    badgeClass: 'bg-accent text-primary border-transparent',
    flagClass: 'bg-accent text-primary ring-4 ring-accent/40',
    lineClass: 'bg-gradient-to-b from-primary to-border',
    icon: Loader2,
    summaryLabel: '진행중',
  },
  next: {
    label: '예정',
    badgeClass: 'bg-secondary text-secondary-foreground border-transparent',
    flagClass: 'bg-secondary text-muted-foreground',
    lineClass: 'bg-border',
    icon: Flag,
    summaryLabel: '예정',
  },
}

function SummaryCard({ phase, count }) {
  const meta = PHASE_META[phase]
  const Icon = meta.icon
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center gap-3 py-1">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', meta.flagClass)}>
          <Icon size={16} className={phase === 'doing' ? 'animate-spin' : ''} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{meta.summaryLabel}</div>
          <div className="text-lg font-bold text-foreground leading-tight">
            {count}<span className="text-sm font-medium text-muted-foreground ml-1">단계</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StageNode({ stage, isLast }) {
  const meta = PHASE_META[stage.phase]
  const Icon = meta.icon
  return (
    <li className="relative pl-12 sm:pl-14 pb-8 last:pb-0">
      {/* 여정 라인 */}
      {!isLast && (
        <span
          aria-hidden
          className={cn(
            'absolute left-[18px] sm:left-[22px] top-9 bottom-0 w-0.5',
            meta.lineClass,
            stage.phase === 'next' && 'opacity-60',
          )}
          style={stage.phase === 'next' ? { backgroundImage: 'linear-gradient(to bottom, var(--border) 50%, transparent 50%)', backgroundSize: '2px 8px', backgroundColor: 'transparent' } : undefined}
        />
      )}

      {/* 깃발 마커 */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-sm',
          meta.flagClass,
        )}
      >
        <Icon size={18} className={stage.phase === 'doing' ? 'animate-spin' : ''} />
      </span>

      {/* 카드 */}
      <Card>
        <CardContent className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-[11px] font-semibold', meta.badgeClass)}>
              {meta.label}
            </Badge>
            <h3 className="text-base font-semibold text-foreground leading-snug">
              {stage.title}
            </h3>
          </div>
          <p className="text-sm text-secondary-foreground">{stage.summary}</p>
          <ul className="space-y-1 pl-1">
            {stage.bullets.map((b, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                <span className="text-muted-foreground/50 shrink-0">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {stage.note && (
            <div className="mt-2 px-3 py-2 rounded-md bg-secondary text-xs text-secondary-foreground">
              {stage.note}
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  )
}

export default function Roadmap() {
  const counts = STAGES.reduce(
    (acc, s) => ({ ...acc, [s.phase]: (acc[s.phase] || 0) + 1 }),
    {},
  )

  return (
    <div className="max-w-4xl mx-auto pt-2 pb-8">
      {/* 헤더 */}
      <div className="pt-2 pb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <MapPin size={13} />
          <span>Product Roadmap</span>
        </div>
        <h1 className="text-[22px] sm:text-[24px] font-bold text-foreground leading-tight">
          XN 퀴즈 로드맵
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          어디까지 왔고, 지금 무엇을 다듬고 있으며, 다음에 무엇을 향해 갈지 한눈에 보여주는 여정 지도입니다.
        </p>
      </div>

      {/* 진행 요약 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <SummaryCard phase="done" count={counts.done || 0} />
        <SummaryCard phase="doing" count={counts.doing || 0} />
        <SummaryCard phase="next" count={counts.next || 0} />
      </div>

      {/* 여정 타임라인 */}
      <ol className="relative">
        {STAGES.map((stage, idx) => (
          <StageNode key={idx} stage={stage} isLast={idx === STAGES.length - 1} />
        ))}
      </ol>

      {/* 마무리 카피 */}
      <div className="mt-10 px-5 py-5 rounded-xl bg-accent flex items-start gap-3">
        <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-primary leading-relaxed">
          기능을 더 쌓는 것보다, 사용자와 운영자 모두에게 의미 있는 가치를 만드는 방향으로 다음 단계를 설계하고 있습니다.
        </div>
      </div>
    </div>
  )
}
