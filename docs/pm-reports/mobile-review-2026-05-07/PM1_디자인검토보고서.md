# PM1 디자인 검토 보고서 — 모바일 반응형 점검

**작성일**: 2026-05-07
**검토 범위**: 어제오늘(2026-05-06 ~ 05-07) 수정된 컴포넌트 15개 + 페이지 10개
**기준 뷰포트**: 모바일 375px / 태블릿 768px / 데스크톱 1280px+

---

## 1. 검토 요약

| 심각도 | 식별 개수 | 처리 결과 |
|--------|----------|----------|
| **Critical** | 3 | 3건 모두 수정 완료 |
| **High** | 7 | 7건 모두 수정 완료 |
| **Medium** | 10 | 8건 수정, 2건 패스(원래 양호) |
| **Low** | 2 | 영향 미미, 후순위 |

총 22건 식별 → **18건 즉시 수정**, 2건 분석 결과 양호로 확정, 2건 후순위.

---

## 2. Critical 이슈 (수정 완료)

| 위치 | 문제 | 수정 |
|------|------|------|
| ConditionalRetakeModal:195 | `grid-cols-[36px_1fr_1fr_1fr_0.7fr]` 5컬럼 강제 → 모바일에서 텍스트 잘림 | 모바일 전용 단일행 압축 카드 + 별도 모바일 헤더 추가 |
| RandomQuestionBankModal:292 | `<table>` 5컬럼 가로 overflow 미처리 | 부모 `overflow-auto` + `min-w-[480px]` 추가 |
| QuestionBankModal:171 | `w-[240px]` 사이드바 + 본문이 모바일에서 화면 초과 | `flex-col sm:flex-row`, 모바일에서 사이드바를 상단(180px) 가로 스크롤로 전환 |

---

## 3. High 이슈 (수정 완료)

| 위치 | 수정 내용 |
|------|----------|
| AddQuestionModal:919 (DialogContent) | `max-w-4xl` 유지 + `w-[calc(100vw-24px)] sm:w-auto`, max-h 90vh 추가 |
| AddQuestionModal:366 (numerical) | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| AddQuestionModal:394 (matching) | 좌-↔-우 한줄 → 모바일에서 stack(↕ 방향 표시) |
| AddQuestionModal:941 (유형 선택) | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| AssignmentOverrides:156 | `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| ExportBankModal/ImportBankModal:188/171 | DialogContent 모바일 너비 + 패딩 분기 |
| BankWizardShared:160 | `w-[200px]` 사이드바 → 모바일에서 상단 가로 collapsed 영역 |
| DateTimePicker:280 | 시각 입력행 `flex-wrap sm:flex-nowrap` 추가 |
| RandomQuestionBankModal:178 | DialogContent 모바일 너비 + min-h 480px(모바일)/600px(데스크) |

---

## 4. Medium 이슈 (수정 완료)

| 위치 | 수정 내용 |
|------|----------|
| QuizCreate:257, 285, 428 | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (퀴즈 유형/주차차시/공개 범위) |
| QuizEdit:444, 472, 615 | 동일 패턴 일괄 적용 |
| ActivityLogPanel:111 | `grid-cols-5` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` |
| StatsTab:33 | `grid-cols-4` → `grid-cols-2 sm:grid-cols-4` (요약 카드) |
| RandomQuestionBankModal:490 (난이도별 배점) | `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |

---

## 5. Medium 이슈 (분석 결과 양호 — 수정 불필요)

| 위치 | 판단 근거 |
|------|----------|
| QuizAttempt:1105 (메타 3열) | 짧은 숫자 정보(분/문항/점)라 375px에서도 가독 양호 |
| QuizList:670 (복사 시 초기화 안내) | 짧은 라벨/값 페어, 모바일 스택 시 카드 길어져 오히려 가독성 저하 |

---

## 6. Low 이슈 (후순위)

| 위치 | 비고 |
|------|------|
| index.css:117 (LTI 모드 px-4 sm:px-5 pt-1) | Canvas iframe 표준 여백과 정합, 변경 시 레이아웃 영향 큼 |
| DropdownSelect h-[30px] (sm 사이즈) | 터치 타겟 30px, WCAG 권장(44px) 미달이나 데스크톱 우선 컴포넌트라 보류 |

---

## 7. 디자인 시스템 정합성 확인

| 항목 | 결과 |
|------|------|
| 색상 시멘틱 클래스 사용 | 신규/수정 코드 모두 `primary`/`destructive`/`accent` 등 시멘틱 토큰 사용 |
| 모달 DialogTitle/DialogDescription | 모든 모달 컴포넌트 컴포넌트 활용, 인라인 fontSize 없음 |
| Button variant 사용 | 신규 액션 모두 `<Button>` 컴포넌트, raw `<button>` + Toss Blue 하드코딩 없음 |
| Pretendard 폰트 위계 | h1~h4 / body / caption 일관 적용 |

---

## 8. 다음 스프린트 권고 (디자인 관점)

1. **모바일 통합 회귀 테스트**: 실제 디바이스(iPhone SE 375px / Galaxy S 360px)에서 채점/응시 플로우 1회 점검
2. **터치 타겟 가이드라인 정립**: DropdownSelect sm 사이즈를 모바일에서만 h-10으로 자동 조정하는 규칙 도입 검토
3. **모달 모바일 전환 패턴 표준화**: 사이드바 형 모달(QuestionBank, Export/Import)이 모두 같은 모바일 전환 패턴(상단 collapsed) 사용하도록 가이드 문서화
