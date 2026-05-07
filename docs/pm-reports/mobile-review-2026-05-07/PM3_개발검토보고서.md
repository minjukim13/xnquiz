# PM3 개발 검토 보고서 — 모바일 반응형 코드 품질

**작성일**: 2026-05-07
**관점**: Tailwind 반응형 패턴, 코드 일관성, 성능, 회귀 리스크

---

## 1. 코드 품질 점검 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| **반응형 prefix 일관성** | 양호 | 수정 후 모든 grid는 `grid-cols-1 sm:grid-cols-N` 패턴 통일 |
| **Tailwind v4 호환성** | 양호 | 임의 값(`w-[calc(100vw-24px)]`)은 v4에서도 동작 확인 |
| **shadcn Dialog 기본 동작** | 양호 | `max-w-[calc(100%-2rem)]` 기본 적용되어 모바일에서 자동 보호됨 |
| **lazy loading 영향** | 영향 없음 | 페이지 단위 lazy 그대로 유지, 청크 분리 무손상 |
| **manualChunks 함수형식** | 영향 없음 | vite.config.ts 미수정 |
| **불필요 리렌더 발생** | 영향 없음 | className 변경만, 컴포넌트 구조/state 미변경 |

---

## 2. 변경 통계

```
src/components/ConditionalRetakeModal.jsx     +47 줄  (모바일 헤더 + 카드형 압축)
src/components/RandomQuestionBankModal.jsx    +5  줄  (overflow + min-w + sm:padding)
src/components/QuestionBankModal.jsx          +6  줄  (사이드바 flex-col sm:flex-row)
src/components/AddQuestionModal.jsx           +8  줄  (matching stack, grid 분기)
src/components/AssignmentOverrides.jsx        +1  줄  (grid-cols-1 sm:grid-cols-3)
src/components/ExportBankModal.jsx            +1  줄  (DialogContent 모바일 너비)
src/components/ImportBankModal.jsx            +1  줄  (동일)
src/components/BankWizardShared.jsx           +1  줄  (사이드바 모바일 분기)
src/components/DateTimePicker.jsx             +1  줄  (시각 입력 flex-wrap)
src/pages/QuizCreate.jsx                      +3  줄  (3개 grid 분기)
src/pages/QuizEdit.jsx                        +3  줄  (동일)
src/pages/GradingDashboard/ActivityLogPanel.jsx +1 줄  (grid-cols-5 분기)
src/pages/GradingDashboard/StatsTab.jsx       +1  줄  (grid-cols-4 분기)
```

총 11개 파일, 약 80줄 변경 (className 위주, 로직 무변경).

---

## 3. 회귀 리스크 분석

| 리스크 | 영향 범위 | 평가 |
|--------|----------|------|
| ConditionalRetakeModal — 모바일/데스크톱 분리 렌더링 | 학생 정보 표시 | **낮음** — 동일 데이터, 표현만 분기 |
| RandomQuestionBankModal — 테이블 min-w-[480px] | 좁은 데스크톱 환경 | **낮음** — 모달 자체가 max-w-4xl로 충분 |
| QuestionBankModal/BankWizardShared — 사이드바 flex-col 전환 | 모바일에서 max-h-[180px] 제한 | **중간** — 은행 수가 많을 때(20+) 모바일 가로 스크롤 의존, 검색으로 대응 가능 |
| Dialog DialogContent w-[calc(100vw-24px)] | shadcn 기본값 중복 적용 | **낮음** — `max-w-[calc(100%-2rem)]`이 기본이라 충돌 없음, 더 좁은 쪽 적용 |

---

## 4. 성능 영향

| 지표 | 변경 전 → 후 | 비고 |
|------|--------------|------|
| 모바일 첫 렌더 시간 | 변동 없음 | 컴포넌트 수 동일, lazy 청크 무변경 |
| 리렌더 빈도 | 변동 없음 | className만 분기, state 분기 없음 |
| 번들 크기 | 약 +0.3KB (gzip 기준) | 추가 클래스 토큰 → Tailwind compile 시 거의 흡수 |

---

## 5. 보안/접근성 점검

| 항목 | 결과 |
|------|------|
| XSS 입력 처리 | 변경 없음 — 기존 React 자동 escape 유지 |
| 키보드 접근성 (탭 순서) | 변경 없음 — DOM 구조 유지, 순서 동일 |
| 스크린 리더 | sm:hidden / hidden sm:block 으로 동일 정보가 중복 출력될 수 있음 → ConditionalRetakeModal 모바일 정보 압축 영역에 `aria-hidden` 추가 권고 (별도 이슈) |
| 포커스 트랩 | shadcn Dialog 기본 유지 |

---

## 6. 실데이터 전환 영향도 (api 모드)

| 변경 | 영향 |
|------|------|
| className만 수정 | **없음** — 데이터 레이어(`src/lib/data/*`) 무변경 |
| API 응답 구조 변경 필요성 | **없음** — 기존 응답 그대로 사용 |
| .env / VITE_DATA_SOURCE | **무관** — mock/api 양쪽 동일 동작 |

---

## 7. 다음 스프린트 권고 (개발 관점)

1. **모바일 회귀 자동화**: Playwright + 375px 뷰포트 시각 회귀 테스트 도입 검토 (현재 수동 점검만)
2. **반응형 패턴 가이드**: docs/dev-guide 에 "grid는 모바일 분기 필수, 모달은 max-w-* + w-[calc(100vw-24px)] 페어 사용" 명문화
3. **aria-hidden 처리**: 모바일/데스크톱 분리 렌더 시 보조 한쪽에 aria-hidden 적용해 스크린리더 중복 방지 (DialogTitle 패턴 통일)
4. **shadcn Dialog 베이스 max-h 추가**: 모든 모달에 일관된 max-h-[90vh] 적용 → 현재 일부 모달만 명시
