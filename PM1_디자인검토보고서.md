# PM1 디자인 검토 보고서

**작성자**: PM1 — 디자이너
**검토 기준일**: 2026-03-26
**검토 대상**: XN Quizzes 프로토타입 전체 UI/UX (GDS 기반 재작업 완료 버전)
**검토 파일**: index.css / Layout.jsx / CustomSelect.jsx / QuizList.jsx / QuizStats.jsx / GradingDashboard.jsx / QuizCreate.jsx / QuizEdit.jsx / QuestionBank.jsx

---

## 총평

GDS(G-Market Design System) 토큰을 기준으로 전면 재작업이 완료된 상태로, 색상 시스템과 컴포넌트 기반 구조는 전반적으로 양호하다. 다만 몇 가지 GDS 토큰 이탈, 컴포넌트 혼용, 접근성 미비 영역이 잔존한다. Critical 이슈는 없으나 High 등급 이슈 10건이 실사용 품질에 직접 영향을 준다.

---

## 1. 색상 시스템 일관성 (GDS 토큰 준수 여부)

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 1-1 | 차트 축 tick 색상 (XAxis) | QuizStats.jsx: `fill: '#94a3b8'` (Tailwind slate-400) | GDS 토큰 외 색상 사용 | `fill: '#9E9E9E'` 로 통일 | **High** |
| 1-2 | 차트 축 tick 색상 (YAxis) | GradingDashboard 차트: `fill: '#64748b'` (slate-500) | GDS 토큰 이탈 | `fill: '#616161'` 로 통일 | **High** |
| 1-3 | 응시 현황 바 차트 색상 | QuizStats.jsx: `#01A900`, `#EF2B2A` 사용 | GDS 시맨틱 `#018600` / `#B43200` 과 불일치 | `#018600`, `#B43200` 으로 통일 | **High** |
| 1-4 | 삭제 버튼 hover 색상 | QuizEdit.jsx, QuestionBank.jsx: `#EF2B2A` | GDS에 danger 토큰 미정의 상태에서 혼용 | GDS에 `danger: #EF2B2A` 추가 또는 `#B43200` 으로 대체 후 토큰화 | **Medium** |
| 1-5 | 탭 활성 색상 | QuizStats.jsx, QuizCreate.jsx: `#6366f1` (indigo-500) | GDS 주색은 `#4f46e5`(indigo-600). 활성 탭에 indigo-500 혼용 | `#4f46e5` 로 통일 | **Medium** |
| 1-6 | 문항 유형 배지 | 전체: `background: #F5F5F5, color: #616161` 단일 색상 | GDS 준수. 자동/수동/부분자동 구분 없이 단일 색상 | 현재 유지 가능. 유형별 색상 차별화는 추후 고려 | Low |
| 1-7 | 진행 바 색상 | QuizList.jsx, GradingDashboard.jsx: `bg-indigo-500` | GDS 주색 `#4f46e5`(indigo-600) 와 미세 불일치 | `bg-indigo-600` 으로 변경 | **Medium** |
| 1-8 | btn-secondary 텍스트 색상 | index.css: `color: #424242` | GDS 미정의 토큰. secondary 텍스트는 `#616161` 권장 | `color: #616161` 로 변경 또는 GDS에 `#424242` 명시 추가 | Low |
| 1-9 | 난이도 '보통' 배지 색상 | QuizStats.jsx: `background: #FFF6F2, color: #B43200` | 채점중 상태 배지와 동일한 색 — 의미 혼동 가능 | '보통'은 amber 계열(`#FFFBEB / #B45309`)로 분리 | **High** |

---

## 2. 타이포그래피 위계

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 2-1 | 페이지 h1 크기 불일치 | QuizList.jsx: `text-2xl(24px)` / QuestionBank.jsx: `text-2xl(24px)` / QuizEdit.jsx: `text-lg(18px)` / QuizCreate.jsx: `text-xl(20px)` | 동일 레벨 페이지 제목임에도 크기 불일치 | 모든 페이지 h1을 `text-xl(20px) font-bold` 로 통일 | **High** |
| 2-2 | 카드 내 제목 크기 | GradingDashboard: `text-[15px] font-bold` / QuizStats: `text-base font-bold` / 기타: `text-sm font-semibold` | 카드 헤더 레벨이 컴포넌트마다 다름 | 카드 제목: `text-sm font-semibold`, 상세 패널 제목: `text-[15px] font-bold` 2단계로 고정 | **Medium** |
| 2-3 | 임의 픽셀 단위 하드코딩 | 전체 파일: `text-[15px]`, `text-[17px]`, `text-[18px]`, `text-[11px]`, `text-[13px]`, `text-[10px]` 다수 | Tailwind 기본 스케일 외 임의 픽셀값 산재. 타입 스케일 관리 불가 | 기본 스케일 체계 사용: `text-xs(12px)`, `text-sm(14px)`, `text-base(16px)`, `text-lg(18px)`. 불가피한 예외만 CSS 변수로 토큰화 | **Medium** |
| 2-4 | line-height 혼용 | 컴포넌트마다 `leading-snug`, `leading-relaxed`, `leading-none` 혼용 | 용도 기준 없이 혼용 | 제목 `leading-tight(1.25)`, 본문 `leading-normal(1.5)`, 숫자 `leading-none(1)` 로 정리 | Low |

---

## 3. 컴포넌트 재사용성 및 일관성

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 3-1 | 탭(Tab) 컴포넌트 3중 분기 | QuizCreate.jsx: `TabBtn` 컴포넌트 정의 / GradingDashboard.jsx: 동명의 `TabBtn` 별도 정의 / QuizStats.jsx: inline 스타일로 구현 | 탭 UI 3가지 구현 방식 혼재. 스타일 미세 불일치 | `src/components/Tab.jsx` 로 추출. 활성: `border-b-2 color #4f46e5`, 비활성: `color #9E9E9E` 통일 | **High** |
| 3-2 | `.btn-ghost` 미사용 | index.css: `.btn-ghost` 클래스 정의 / 실제 코드: `onMouseEnter/Leave` 인라인으로 반복 구현 | 정의된 유틸리티 클래스가 사용되지 않고 중복 코드 산재 | 정의된 `.btn-ghost` 클래스 적극 사용. 인라인 hover 이벤트 제거 | **High** |
| 3-3 | TypeBadge 컴포넌트 중복 | QuizStats.jsx와 GradingDashboard.jsx에 각각 `TypeBadge` 컴포넌트 중복 정의 | 변경 시 두 파일 모두 수정 필요 | `src/components/TypeBadge.jsx` 로 추출 | **Medium** |
| 3-4 | CustomSelect vs native select 혼용 | QuizCreate.jsx: `CustomSelect` / QuizEdit.jsx 설정 패널: native `<select>` / QuestionBank.jsx 필터: native `<select>` | 동일 기능에 UI가 다름. 사용자 경험 불일치 | 폼 내 선택 필드: `CustomSelect` / 인라인 필터: native `<select>` 로 기준 명시 및 문서화 | **Medium** |
| 3-5 | EmptyState 표현 방식 3종 | GradingDashboard.jsx: `EmptyState` 컴포넌트 / QuizEdit.jsx: 인라인 dashed border / QuizStats.jsx: 인라인 텍스트 | 빈 상태 표현 방식 혼재 | `src/components/EmptyState.jsx` 공통 추출. props: `message`, `action(선택)` | **Medium** |
| 3-6 | 모달 구조 반복 | GradingDashboard, QuizEdit, QuizCreate, QuestionBank: 모달 오버레이/닫기/제목 구조 반복 구현 | 동일 구조 중복 | `src/components/Modal.jsx` 공통 추출 | Low |
| 3-7 | QuestionBankModal 양쪽 중복 | QuizCreate.jsx와 QuizEdit.jsx에 동일한 `QuestionBankModal` 각각 구현 | 코드 중복 최다 지점 | `src/components/QuestionBankModal.jsx` 로 추출 | **Medium** |

---

## 4. 레이아웃 그리드 및 여백 체계 (8px 기준)

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 4-1 | 페이지 상단 여백 불일치 | QuizList: `py-10(40px)` / QuizCreate: `py-8(32px)` / GradingDashboard: `py-6(24px)` / QuizStats: `py-6(24px)` | 동급 페이지 간 상단 여백 제각각. 8px 그리드 준수이나 기준 없음 | 상세/채점 페이지: `py-6`, 목록/생성 페이지: `py-8` 로 2단계 통일 | **Medium** |
| 4-2 | 섹션/카드 간격 혼용 | QuizList: `mb-8` / QuizStats: `space-y-4` / GradingDashboard: `mb-4`, `mb-5` 혼용 | 카드/섹션 간격 기준값 없음 | 카드 간격: `gap-3(12px)`, 섹션 간격: `mb-6(24px)` 기준 수립 | Low |
| 4-3 | 카드 내부 패딩 혼용 | `p-4`, `p-5`, `px-5 pt-5 pb-4`, `p-3` 혼용 | 카드 내부 패딩 기준 없음 | 기본 카드: `p-5`, 컴팩트: `p-4`, 아이템: `p-3` 3단계 기준 정립 | Low |
| 4-4 | max-width 혼용 | QuizCreate.jsx: `max-w-2xl` / 기타: `max-w-screen-xl` | 생성 폼만 좁은 레이아웃 | 의도적 설계이면 문서화. 아니면 `max-w-screen-xl` 통일 | Low |

---

## 5. 반응형 브레이크포인트 대응

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 5-1 | GradingDashboard 최소 높이 하드코딩 | `min-h-[calc(100vh-360px)]` | `100vh` 사용 — iOS Safari 주소창 고려 시 오버플로우 가능 | `min-h-[calc(100svh-360px)]` 로 변경 | **Medium** |
| 5-2 | 통계 요약 카드 그리드 | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (카드 5개) | 5개 카드가 6열 그리드에서 1개 단독 배치되는 레이아웃 깨짐 발생 | 카드 6개로 고정(평균 응시 시간 카드 포함 시 6개) 또는 `lg:grid-cols-5` 로 변경 | **Medium** |
| 5-3 | 아이콘 전용 버튼 모바일 처리 | `hidden sm:block` 으로 버튼 텍스트 숨김 다수 | aria-label 미적용 (접근성 항목 6-2와 중복) | 접근성 항목에서 통합 처리 | - |
| 5-4 | 테이블 가로 스크롤 힌트 없음 | `overflow-x-auto` 적용 | 모바일에서 가로 스크롤 가능하나 힌트 없음 | 테이블 컨테이너 우측 fade 그라데이션 힌트 추가 검토 | Low |

---

## 6. 접근성 (대비, 포커스, 스크린리더)

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 6-1 | CustomSelect 포커스 스타일 | `focus:outline-none`. 열림 시에만 ring 표시 | 키보드 탐색 시 닫힌 상태 포커스 불명확. WCAG 2.4.7 위반 | `focus-visible:ring-2 focus-visible:ring-indigo-500` 추가 | **High** |
| 6-2 | 아이콘 전용 버튼 aria-label 누락 | 모달 X 버튼, 모바일 아이콘만 표시 버튼 등 다수 | 스크린리더 사용자가 버튼 목적 파악 불가 | 모든 아이콘 전용 버튼에 `aria-label` 추가. 텍스트 숨김 버튼은 `<span className="sr-only">` 활용 | **High** |
| 6-3 | caption 색상 대비비 | `#BDBDBD` on 흰색 배경: 대비비 약 1.6:1 | WCAG AA 기준(4.5:1) 미달. StatChip muted, 미채점 '-' 표시 등에 적용 | `#BDBDBD` 는 장식용으로만 제한. 읽어야 할 텍스트는 최소 `#9E9E9E`(3.0:1) 이상 | **High** |
| 6-4 | 탭 ARIA role 미적용 | QuizStats, QuizCreate, GradingDashboard 탭: role 미적용 | 스크린리더가 탭 컴포넌트 인식 불가. WCAG 4.1.2 위반 | 컨테이너: `role="tablist"`, 각 버튼: `role="tab" aria-selected={active}` | **High** |
| 6-5 | 색상만으로 상태 구분 | 미제출/미채점을 숫자 색상(`#B43200`)만으로 구분 | 색맹 사용자 구분 불가. WCAG 1.4.1 위반 | 아이콘 또는 텍스트 레이블 병행 (일부 `AlertCircle` 적용된 패턴 확장) | **Medium** |
| 6-6 | 폼 라벨-인풋 연결 누락 | QuizCreate.jsx `<Field>` 컴포넌트: htmlFor-id 연결 없이 텍스트만 표시 | 스크린리더가 라벨과 인풋 연결 불가 | `<label htmlFor={id}>` + `<input id={id}>` 명시적 연결 적용 | **Medium** |
| 6-7 | 모달 포커스 트랩 미구현 | GradingDashboard, QuizEdit 등: 포커스 트랩 없음 | 모달 열린 상태에서 Tab으로 모달 외부 요소 포커스 가능 | `focus-trap-react` 또는 수동 포커스 트랩 구현 | **Medium** |

---

## 7. 빈 상태 및 로딩 상태 처리

| # | 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|---|------|-----------|--------|--------|------|
| 7-1 | 로딩 상태 전무 | 전체 파일: 로딩 스켈레톤/스피너 없음 | 목업 데이터라 현재 무관하나, 실 API 전환 시 빈 화면 노출 | 주요 컴포넌트에 `<Skeleton>` 또는 pulse 애니메이션 상태 추가 준비 | **Medium** |
| 7-2 | GradingDashboard empty 안내 | 미선택 시 텍스트 메시지만 표시 | 행동 유도 없음 | 화살표 아이콘 + "좌측에서 문항을 선택하세요" 유도 문구 추가 | Low |
| 7-3 | QuizList 퀴즈 0건 처리 없음 | `otherQuizzes.length === 0` 이면 빈 `<div>` 렌더링 | 빈 화면에서 UI 단절 | "아직 등록된 퀴즈가 없습니다 + 새 퀴즈 만들기" 버튼 포함 Empty state 추가 | **Medium** |
| 7-4 | GradingDashboard 검색 빈 결과 누락 | QuizStats, QuestionBank는 empty 처리 / GradingDashboard ResponsesTab은 미처리 | students 배열 빈 경우 아무것도 렌더링되지 않음 | ResponsesTab에 empty 처리 추가. 전체 empty 메시지 문구 통일 | **Medium** |
| 7-5 | 채점 저장 후 피드백 없음 | StudentRow: 점수 저장 후 시각적 피드백 없음 | 저장 성공 여부 인지 어려움 | `saved` state 이미 존재 — 저장 후 체크 아이콘 + "저장됨" 텍스트 표시 | Low |

---

## 우선순위 종합 요약

### Critical (0건)
없음

### High (10건)
| ID | 내용 |
|----|------|
| 1-1, 1-2 | 차트 tick 색상 GDS 이탈 (`#94a3b8`, `#64748b`) |
| 1-3 | 응시 현황 바 색상 GDS 불일치 (`#01A900`, `#EF2B2A`) |
| 1-9 | '보통' 난이도 배지 = '채점중' 상태 배지 동일 색상 — 의미 혼동 |
| 2-1 | 페이지 h1 크기 불일치 (text-lg ~ text-2xl 혼재) |
| 3-1 | 탭 컴포넌트 3가지 방식 혼재 |
| 3-2 | `.btn-ghost` 정의 존재하나 미사용, 인라인 반복 |
| 6-1 | CustomSelect 키보드 포커스 스타일 불명확 |
| 6-2 | 아이콘 전용 버튼 `aria-label` 누락 |
| 6-3 | `#BDBDBD` 텍스트 대비비 WCAG AA 미달 (1.6:1) |
| 6-4 | 탭 컴포넌트 ARIA role 미적용 |

### Medium (13건)
1-4, 1-5, 1-7 / 2-2, 2-3 / 3-3, 3-4, 3-5, 3-7 / 4-1 / 5-1, 5-2 / 6-5, 6-6, 6-7 / 7-1, 7-3, 7-4

### Low (9건)
1-6, 1-8 / 2-4 / 3-6 / 4-2, 4-3, 4-4 / 5-4 / 7-2, 7-5

---

## 다음 스프린트 권고 수정 항목 (Top 5)

1. **차트 색상 GDS 토큰 통일** (1-1, 1-2, 1-3) — 코드 수정 공수 최소, 시각 일관성 즉각 개선
2. **탭 공통 컴포넌트 추출** (3-1) — 3개 파일 분산 구현을 `Tab.jsx` 단일화
3. **aria-label 일괄 추가** (6-2) — 접근성 리스크 대응, 변경 공수 낮음
4. **`#BDBDBD` 텍스트 대비 개선** (6-3) — WCAG AA 준수, caption 색상 사용 기준 가이드 수립
5. **QuizList Empty state 추가** (7-3) — 데이터 0건 시 UI 단절 방지

---

*본 보고서는 실제 소스 파일을 직접 코드 분석하여 도출된 결과입니다. 추측 또는 시각적 스크린샷 없이 작성되었습니다.*
