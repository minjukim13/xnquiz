# XN Quizzes 종합 검토 보고서 — 모바일 반응형 점검 (Leader 종합)

**작성일**: 2026-05-07
**검토 트리거**: 어제오늘(05-06~07) 컴포넌트 15개 + 페이지 10개 수정 후 모바일 회귀 점검 요청

---

## 1. PM1~PM5 보고서 요약

| PM | 핵심 결론 |
|----|----------|
| **PM1 (디자인)** | 22개 모바일 이슈 식별 → 18건 즉시 수정, 2건 양호 확정, 2건 후순위. 디자인 시스템 정합성(시멘틱 컬러, DialogTitle, Button variant) 모두 유지 |
| **PM2 (기획)** | 학습자 응시(matching/numerical) + 교수자 채점 모니터링이 모바일 1순위. 응시/채점 시나리오 모두 수정 후 양호. 모바일 포커스 이탈 정책은 별도 결정 필요 |
| **PM3 (개발)** | className 위주 11개 파일 80줄 변경. 로직/state 무변경 → 회귀 리스크 낮음. shadcn Dialog 기본값과 충돌 없음. lazy loading/manualChunks 무영향 |
| **PM4 (QA)** | 기능 테스트 모바일 시나리오 모두 Pass (수정 후). 데스크톱 회귀 없음. 잔존 이슈는 aria-hidden 누락(Low) + 사이드바 검색 의존성(Medium) |
| **PM5 (PO)** | Must-have 6건 모두 처리 완료. PM6 안건 후보 3건(포커스 이탈 임계치, IP 제한, 일괄 재응시 UI). KPI 정량 지표 5종 정의 |

---

## 2. 통합 이슈 우선순위 (수정 완료)

### Critical — 즉시 처리됨

1. ConditionalRetakeModal:195 — 5컬럼 그리드를 모바일 카드형으로 분기
2. RandomQuestionBankModal:292 — 미리보기 테이블 가로 스크롤 + min-w 처리
3. QuestionBankModal:171 — 240px 사이드바를 모바일 상단 가로 스크롤로 전환

### High — 즉시 처리됨

4. AddQuestionModal — DialogContent 모바일 너비 + 유형 선택/numerical/matching grid 분기
5. AssignmentOverrides — grid-cols-3 모바일 stack
6. ExportBankModal/ImportBankModal — DialogContent 모바일 너비
7. BankWizardShared — 사이드바 모바일 분기 (Export/Import 모달 공통)
8. DateTimePicker — 시각 입력 flex-wrap

### Medium — 즉시 처리됨

9. QuizCreate/QuizEdit 3개 grid-cols-2 모바일 분기 (퀴즈 유형/주차차시/공개 범위)
10. ActivityLogPanel grid-cols-5 → 2/3/5 단계 분기
11. StatsTab grid-cols-4 → 2/4 단계 분기
12. RandomQuestionBankModal 난이도별 배점 grid-cols-3 분기
13. RandomQuestionBankModal step indicator + DialogContent 너비

---

## 3. 잔존 이슈 / 후속 작업

| 우선순위 | 이슈 | 다음 스프린트 처리 권고 |
|---------|------|----------------------|
| **Medium** | 모바일 사이드바 max-h-[180px] + 가로 스크롤 의존 | 은행 다수 시 검색 가이드 UI 강화 |
| **Low** | aria-hidden 누락 (sm:hidden / hidden sm:block 페어) | 접근성 스프린트에서 일괄 처리 |
| **Low** | DropdownSelect sm 사이즈 h-[30px] (터치 타겟 < 44px) | 모바일에서만 h-10 자동 적용 규칙 도입 검토 |
| **Policy** | 모바일 포커스 이탈 정책 | PM6 안건 후보, 사용자 결정 필요 |
| **Policy** | 모바일 IP 제한 안내 | 학생 안내 메시지 강화 (별도 이슈) |

---

## 4. MVP 로드맵 (모바일 관점)

### MVP1 (현재) — 완료

- ✅ 학습자 모바일 응시 전 문항 유형 (객관식/다중/연결/수치형/서술형)
- ✅ 교수자 모바일 채점 대시보드 모니터링 (탭 전환, 통계, 활동 로그)
- ✅ 교수자 모바일 보조 작업 (조건부 재응시, 문제모음 추가, 가져오기/내보내기)

### MVP2 (다음 스프린트 권고)

1. **실디바이스 회귀 매트릭스** 정립 (iPhone SE / Galaxy S / iPad mini)
2. **자동 시각 회귀** 도입 (Playwright + 모바일 뷰포트)
3. **접근성 일괄 점검** (aria-hidden, axe-core 자동화)
4. **포커스 이탈 정책 결정** (PM6 안건 처리 후)

### MVP3 (후순위)

- 모바일 전용 통계 차트 최적화
- 모바일 일괄 작업 UI 검토 (50명+ 재응시 등)
- LTI iframe 모바일 최적화 (Canvas iframe + xnquiz 결합 환경)

---

## 5. 다음 스프린트 권고 작업 (Top 7)

| 순위 | 작업 | 담당 | 예상 공수 |
|------|------|------|----------|
| 1 | 실디바이스 모바일 회귀 (iOS Safari + Android Chrome) | QA | 0.5d |
| 2 | aria-hidden 페어 처리 일괄 적용 | Dev | 0.3d |
| 3 | Playwright 시각 회귀 PoC (5개 핵심 화면) | Dev | 1d |
| 4 | 모바일 포커스 이탈 정책 결정 회의 | PM + 사용자 | 0.5d |
| 5 | 모바일 사이드바 검색 UX 강화 (필터 등) | Designer + Dev | 0.5d |
| 6 | DropdownSelect 모바일 자동 사이즈 규칙 | Dev | 0.3d |
| 7 | KPI 측정 지표 코드 instrumentation (실데이터 연동 시) | Dev | 1d |

---

## 6. 변경 파일 목록 (회귀 추적용)

```
src/components/AddQuestionModal.jsx
src/components/AssignmentOverrides.jsx
src/components/BankWizardShared.jsx
src/components/ConditionalRetakeModal.jsx
src/components/DateTimePicker.jsx
src/components/ExportBankModal.jsx
src/components/ImportBankModal.jsx
src/components/QuestionBankModal.jsx
src/components/RandomQuestionBankModal.jsx
src/pages/GradingDashboard/ActivityLogPanel.jsx
src/pages/GradingDashboard/StatsTab.jsx
src/pages/QuizCreate.jsx
src/pages/QuizEdit.jsx
```

---

## 7. PM 보고서 위치

```
docs/pm-reports/mobile-review-2026-05-07/
  ├── PM1_디자인검토보고서.md
  ├── PM2_기획검토보고서.md
  ├── PM3_개발검토보고서.md
  ├── PM4_QA테스트보고서.md
  ├── PM5_PO스펙보고서.md
  └── XN_Quizzes_종합검토보고서.md  (본 문서)
```
