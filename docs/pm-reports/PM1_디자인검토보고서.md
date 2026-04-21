# PM1 디자인 검토 보고서

**검토자**: PM1 (디자이너)
**초판**: 2026-04-07 / **업데이트**: 2026-04-16
**검토 범위**: 전체 소스 코드 직접 분석

---

## 총평

디자인 시스템이 Toss 스타일 기반 shadcn/radix UI로 전면 교체되어, 초판 Critical/High 이슈 대부분이 해결되었다. 색상 시스템은 CSS 변수(oklch) 기반 시맨틱 토큰으로 통일, Button/Badge/Dialog 등 21개 공통 UI 컴포넌트가 정비되었고, WCAG AA 색상 대비도 수정 완료되었다. 잔존 이슈는 반응형 모바일 내비게이션 부재(Critical)와 일부 컴포넌트 내 하드코딩 색상(Low) 정도.

---

## 해결 완료 이슈

| 이슈 | 해결 방법 |
|------|----------|
| Primary 색상 3종 혼용 | `--primary: #3182F6` 단일 토큰 통일 (oklch) |
| `#9E9E9E`/`#BDBDBD` WCAG AA 미달 | 커밋 `519ad2f`로 13개 파일 40+곳 수정 |
| Select 3종 파편화 | shadcn Select + DropdownMenu로 통합 |
| `.btn-primary` 미준수 / 인라인 hover 남용 | `<Button>` 6개 variant (CVA 기반)로 통일 |
| 모달 공통 래퍼 없음 | radix Dialog 기반 공통 컴포넌트 구축 |
| 포커스 링 대비 미달 | `focus-visible:ring-3 focus-visible:border-ring` 전역 적용 |
| `focus:outline-none` 대체 없음 | radix 컴포넌트 기본 포커스 처리로 해결 |
| 배지 컴포넌트 미통일 | `<Badge>` 7개 variant + `<StatusBadge>` 추출 |
| `html font-size: 17px` | 16px 기준 정상화 |
| 전역 토스트 시스템 없음 | sonner + 커스텀 Toast 컴포넌트 구현 |

---

## 잔존 이슈

| 항목 | 내용 | 등급 |
|------|------|------|
| **모바일 내비게이션 부재** | 사이드바 `hidden sm:flex` 후 대안 없음. 하단 탭 바 또는 햄버거 메뉴 필요 | **Critical** |
| **태블릿 GradingDashboard** | 768~1023px 구간 split-pane 좌측 패널 너비 고정으로 콘텐츠 압박 | **Medium** |
| **일부 하드코딩 hex** | ConfirmDialog `bg-[#F2F8FF]`, QuestionBankModal 난이도 배지 색상 3건 | **Low** |
| **헤더 브레드크럼 잘림** | 375px에서 overflow-hidden으로 잘림, 모바일 대응 필요 | **Low** |

---

## "AI 디자인 티" 개선 현황

| 항목 | 상태 |
|------|------|
| 과도한 색상 배지 (유형별 12색) | **일부 개선** - TypeBadge 컴포넌트 추출했으나 색상 수 자체는 유지 |
| 아이콘 남용 | **미개선** - GradingDashboard 15종+ import 여전 |
| 획일적 카드-배지-4칸 통계 패턴 | **미개선** - 구조 동일, 정보 위계 재설계 필요 |
| 통계 정보 과적재 (QuizStats) | **미개선** - 한 화면에 6개 차트/테이블 동시 노출 |

> 위 항목은 기능에 영향 없는 UX 개선 사항으로, 실사용 피드백 기반 점진 개선 권장.

---

*초판 대비 Critical 4건 → 1건, High 13건 → 0건으로 개선됨.*
