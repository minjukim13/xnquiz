# XN Quizzes 종합검토보고서

> 작성일: 2026-04-07
> 작성 기준: PM1(디자인) / PM2(기획) / PM3(개발) / PM4(QA) / PM5(PO) 5개 보고서 교차 종합
> 작성자: Leader (총괄 검토자)

---

## 0. 총평

XN Quizzes 프로토타입은 퀴즈 생성-발행-응시-채점-통계 전 과정을 커버하는 기능 범위에서 MVP1 수준의 골격을 갖추고 있다. 그러나 전체 63개 QA 테스트 항목 중 통과율이 70%(44건)에 그치며, 보안 접근제어 영역에서는 0%로 Critical 보안 결함이 현재 노출 중이다. 5개 PM 검토를 교차 분석한 결과, 즉시 수정이 필요한 Critical 이슈 5건과 High 이슈 20건 이상이 식별되었다. 특히 "역할 기반 접근 제어 부재"와 "mockQuizzes 전역 배열 직접 변이"는 PM2-PM3-PM4-PM5 4개 보고서가 공통으로 지적한 최우선 수정 대상이다.

---

## 1. PM별 보고서 요약

### PM1 — 디자인 검토

Critical 이슈 4건을 포함해 총 39건의 디자인 이슈가 확인되었다. 가장 심각한 것은 `#9E9E9E`/`#BDBDBD` 텍스트 색상이 WCAG AA 기준(4.5:1 대비비)을 충족하지 못한 채 프로젝트 전체 40곳 이상에 분포한다는 점이다. 포커스 링 대비 미달(`indigo-100`)과 `focus:outline-none` 대체 인디케이터 부재로 키보드 전용 사용자 탐색이 사실상 불가능하다. 모바일(375px)에서 사이드바가 숨겨진 후 대체 네비게이션이 전혀 없다는 반응형 Critical 이슈도 확인되었다. 컴포넌트 차원에서는 Select 컴포넌트 3종 파편화, 인라인 hover 핸들러 30회 이상 남용, 버튼 스타일 이원화가 High 등급으로 분류되었다. 5가지 Quick Win(font-size 16px 수정, 텍스트 색상 상향, 포커스 링 강화, Primary 색 통일, QuizStats fallback 수정)은 1~2일 내 처리 가능한 수준이다.

### PM2 — 기획 검토

7개 검토 영역 중 "예외/엣지 케이스", "기능 정책 완결성", "권한 설계" 3개가 미흡 판정을 받았다. 교수자 시나리오에서는 임시저장 버튼이 onClick 핸들러 없이 렌더링만 되고 있어 작업 중 이탈 시 전체 내용이 소실된다. 학생 시나리오에서는 채점 완료 후 학생이 본인 점수와 정오답을 확인하는 독립 화면이 없다. `allowLateSubmit` 필드는 존재하나 마감 초과 여부 검증 로직이 전혀 없고, `accessCode` 설정값도 저장만 될 뿐 실제 응시 차단이 되지 않는다. 퀴즈 상태 전이(open→grading→closed)가 자동으로 작동하지 않아 마감 후에도 응시가 가능한 상태가 유지된다. Canvas LMS 대비 알림 정책은 전면 미구현이다.

### PM3 — 개발 검토

코드 품질 전반에서 `mockQuizzes` 전역 배열 직접 변이(Critical)가 가장 심각하다. `QuizList.jsx:95`에서 import된 모듈 레벨 배열을 직접 수정하여 React 렌더링 사이클 바깥에서 상태가 변경된다. 채점/응시 데이터가 `xnq_manual_grades`, `xnq_student_attempts`, `xnq_banks`, `xnq_bank_questions` 4개 localStorage 키에 컨텍스트 없이 분산되어 데이터 정합성 보장이 어렵다. `xlsx` 라이브러리(약 700KB)가 `manualChunks`에서 분리되지 않아 번들 최적화가 누락되었다. `mockData.js` 단일 파일에 1,000줄 이상이 혼재하며, `GradingDashboard.jsx`는 약 1,300줄 단일 파일로 모달과 채점 패널 분리가 필요하다. Canvas API 연동 전환 시 9개 파일의 mock import를 일괄 교체해야 하며, 마이그레이션 5단계 계획이 제시되었다.

### PM4 — QA 테스트

63개 항목 테스트 결과 통과 44건(70%), 실패/주의 19건(30%). 보안 접근제어 3개 항목 전체 실패(0%)가 가장 심각하다. 학생이 `/quiz/:id/grade`(채점 대시보드), `/quiz/new`(퀴즈 생성), `/question-banks`(문제은행)를 URL 직접 입력으로 접근할 수 있어 다른 학생의 응시 답안과 점수 열람, 사전 문항 노출이 가능한 상태다. 퀴즈 생성 시 `mockQuizzes.push()`로 메모리에만 저장되어 새로고침 시 소실된다. 잘못된 ID 접근 시 `배열[0]` fallback 패턴이 QuizEdit, QuizStats, QuestionBank 3곳에서 동일하게 반복된다. `xlsx` 미분리는 PM3와 동일하게 High로 지목되었다.

### PM5 — PO 스펙

5개 정책 공백(재응시, 지각 제출, 단답형 자동채점, 점수 공개, 퀴즈 상태 전이)에 대한 확정 룰을 수립하고, 6개 기능의 Acceptance Criteria를 "Given/When/Then + 체크리스트" 형식으로 명문화했다. 우선순위 매트릭스에서 Must-have 11개 항목 중 "교수자 전용 라우트 권한 가드"와 "지각 제출 검증 로직"이 현재 미완료 상태다. KPI는 현재 측정 가능 지표(채점 완료율, 문항 변별도 등)와 실데이터 연동 후 측정 가능 지표(실제 응시율, 재응시율 등)로 구분해 제시되었다. `localStorage` 기반 채점 저장의 브라우저 초기화 시 데이터 소실을 Critical 리스크로 명시했다.

---

## 2. 통합 이슈 목록

PM 간 중복 지적된 이슈는 교차 언급하여 통합했다.

### Critical (즉시 수정 필요)

| # | 이슈 | 관련 PM | 파일/위치 |
|---|---|---|---|
| **CR-01** | 학생 역할이 채점 대시보드(`/quiz/:id/grade`) URL 직접 접근 가능 — 다른 학생 답안/점수 노출 | PM2, PM3, PM4, PM5 공통 지적 | `GradingDashboard.jsx` |
| **CR-02** | 학생 역할이 퀴즈 생성(`/quiz/new`), 문제은행(`/question-banks`) URL 직접 접근 가능 — 사전 문항 노출 위험 | PM2, PM4 공통 지적 | `QuizCreate.jsx`, `QuestionBankList.jsx`, `QuestionBank.jsx` |
| **CR-03** | `mockQuizzes` 전역 배열 직접 변이 (`QuizList.jsx:95`) — React 렌더링 사이클 외 상태 변경으로 예기치 않은 동작 유발 | PM3, PM4 공통 지적 | `QuizList.jsx` |
| **CR-04** | 퀴즈 생성 시 `mockQuizzes.push()`로만 저장 — 새로고침 시 전체 소실 | PM3, PM4, PM5 공통 지적 | `QuizCreate.jsx` |
| **CR-05** | `#9E9E9E`/`#BDBDBD` 텍스트 색상 WCAG AA 미달 (대비비 1.6~2.85:1, 기준 4.5:1) — 프로젝트 전체 40곳 이상 | PM1 | 프로젝트 전체 |

### High

| # | 이슈 | 관련 PM | 파일/위치 |
|---|---|---|---|
| **H-01** | 임시저장 버튼 onClick 핸들러 없음 — 클릭 시 아무 동작 안 함, 교수자 작업 내용 소실 | PM2, PM4, PM5 공통 지적 | `QuizCreate.jsx` |
| **H-02** | `allowLateSubmit` 필드 존재하나 마감 초과 여부 검증 로직 전혀 없음 — 마감 후에도 응시 가능 | PM2, PM4, PM5 공통 지적 | `QuizAttempt.jsx` |
| **H-03** | `accessCode` 설정값 저장만 됨, 응시 진입 시 실제 차단 로직 없음 | PM2, PM5 공통 지적 | `QuizAttempt.jsx` |
| **H-04** | QuizStats 퀴즈 미발견 시 `mockQuizzes[0]` fallback — 오류 없이 첫 번째 퀴즈 데이터 노출 (QuizEdit, QuestionBank도 동일 패턴) | PM1, PM2, PM4 공통 지적 | `QuizStats.jsx`, `QuizEdit.jsx`, `QuestionBank.jsx` |
| **H-05** | 수동채점 포함 최종 점수 확정 흐름 없음 — "채점 완료" 액션 및 점수 확정 이벤트 미구현 | PM2, PM5 공통 지적 | `GradingDashboard.jsx` |
| **H-06** | `xlsx` 라이브러리(~700KB) `manualChunks` 미분리 — 미사용 페이지에서도 번들에 포함 | PM3, PM4 공통 지적 | `vite.config.js` |
| **H-07** | localStorage 4개 키 컨텍스트 없이 분산 관리 — 데이터 정합성 보장 불가 | PM3, PM4 공통 지적 | `GradingDashboard.jsx`, `QuestionBankContext.jsx` |
| **H-08** | 포커스 ring 대비 미달 (`indigo-100`) + `focus:outline-none` 대체 인디케이터 없음 — 키보드 사용자 탐색 불가 | PM1 | `index.css`, 드롭다운/버튼 전반 |
| **H-09** | 모바일 사이드바 숨김 후 대체 네비게이션 없음 — 375px에서 화면 이동 불가 | PM1 | `Layout.jsx` |
| **H-10** | Primary 색상 3종 혼용 (`#6366f1` / `#4f46e5` / `#4338ca`) | PM1 | `QuizList.jsx`, `QuizStats.jsx`, `index.css` |
| **H-11** | Status badge 색상 두 곳에서 중복 정의, green/red 시맨틱 색상 각 3~4종 혼용 | PM1 | `QuizList.jsx`, `GradingDashboard.jsx` |
| **H-12** | `html { font-size: 17px }` 설정으로 Tailwind 수치 전체 왜곡 | PM1 | `index.css` |
| **H-13** | Select 컴포넌트 3종 파편화 (`CustomSelect`, `DropdownSelect`, `AppSelect`) | PM1 | 전반 |
| **H-14** | `.btn-primary` 미준수 + `.btn-ghost` 정의됐으나 미사용, 인라인 hover 30회 이상 | PM1 | 전반 |
| **H-15** | 아이콘 전용 버튼 `aria-label` 없음, 탭 ARIA role(`tablist`/`tab`) 미적용, 드롭다운 `aria-expanded` 미적용 | PM1 | `QuestionBank.jsx`, `QuizStats.jsx`, `GradingDashboard.jsx` 등 |
| **H-16** | open → grading/closed 상태 자동 전이 로직 없음 — 마감 후에도 open 상태 유지 | PM2, PM5 공통 지적 | 상태 관리 전반 |
| **H-17** | `mockData.js` 단일 파일 1,000줄 이상 — 퀴즈/학생/채점 함수/문제은행 혼재 | PM3, PM4 공통 지적 | `mockData.js` |
| **H-18** | `GradingDashboard.jsx` 단일 파일 약 1,300줄 — 모달/채점패널 분리 필요 | PM3 | `GradingDashboard.jsx` |
| **H-19** | GradingDashboard `gradeVersion` 증가 시 `getLocalGrades()` JSON.parse 매번 호출 — 채점 빈번 시 체감 지연 | PM3, PM4 공통 지적 | `GradingDashboard.jsx` |
| **H-20** | max-width 6종 혼재 (narrow/medium/wide 기준 없음) | PM1 | 각 페이지 |

### Medium

| # | 이슈 | 관련 PM | 파일/위치 |
|---|---|---|---|
| **M-01** | 재응시 시 이전 응시 답안 확인 불가 | PM2, PM4 공통 지적 | `QuizAttempt.jsx` |
| **M-02** | 재채점 모달 UI만 존재, 실제 로직 미구현 | PM2, PM4 공통 지적 | `GradingDashboard.jsx` |
| **M-03** | 부분 점수(`partial credit`) `autoGrade: 'partial'` 정의는 있으나 실제 계산 로직 없음 | PM2, PM5 공통 지적 | 채점 로직 전반 |
| **M-04** | 단답형 자동채점이 정답 문자열 완전 일치만 체크 — 대소문자 무시/부분 일치 미지원 | PM2, PM5 공통 지적 | `autoGradeAnswer` 함수 |
| **M-05** | 뒤로가기 시 필터/선택 상태 초기화 (URL 상태 동기화 없음) | PM4 | 컴포넌트 로컬 상태 전반 |
| **M-06** | 82명 학생 목록 및 120개 문항 목록에 `React.memo`/가상 스크롤 미적용 | PM3, PM4 공통 지적 | `GradingDashboard.jsx`, `QuestionBankModal.jsx` |
| **M-07** | `autoGradeAnswer` 함수의 id 접두어 분기 방식(`q2_`, `q3_` 등) — 실데이터 전환 시 전면 재설계 필요 | PM3 | `mockData.js` |
| **M-08** | QuestionBankContext `useEffect` localStorage 동기화 — 전체 문항 직렬화 debounce 없음 | PM3 | `QuestionBankContext.jsx` |
| **M-09** | 모달 포커스 트랩 없음 — 모달 외부 탭 이동 가능, ESC 닫기 일부 미구현 | PM1 | `AddQuestionModal.jsx`, `QuestionBankModal.jsx` |
| **M-10** | 배지 컴포넌트 미통합(`.badge` dead code), 모달 공통 래퍼(`BaseModal`) 없음 | PM1 | 전반 |
| **M-11** | 빈 상태 CTA 없음 (교수자 뷰 빈 상태에서 "새 퀴즈 만들기" 버튼 미노출) | PM1 | `QuizList.jsx` |
| **M-12** | 로딩 상태/스켈레톤 UI 없음 — 실데이터 전환 시 빈 화면 순간 노출 | PM1 | 전체 페이지 |
| **M-13** | 점수 입력 상한값(배점 초과) 검증 없음 — 엑셀 업로드 일괄 채점 시 초과 점수 입력 가능 | PM3, PM4 공통 지적 | 채점 관련 입력 처리 전반 |
| **M-14** | localStorage JSON.parse 후 타입/구조 검증 없이 상태 사용 — DevTools 변조 시 state 오염 | PM3, PM4 공통 지적 | `QuestionBankContext.jsx`, `GradingDashboard.jsx` |
| **M-15** | `eslint-disable react-hooks/exhaustive-deps` 2건 — stale closure 버그 잠재 | PM3 | `GradingDashboard.jsx` 82행, 105행 |

### Low

| # | 이슈 | 관련 PM | 파일/위치 |
|---|---|---|---|
| **L-01** | Pretendard 폰트 CDN 의존 — 네트워크 지연 시 FOUT 발생 가능 | PM4 | `index.html` |
| **L-02** | `console.error` 2건 — 프로덕션 빌드 전 제거 또는 외부 로깅 도구 연동 필요 | PM4 | `QuizAttempt.jsx`, `mockData.js` |
| **L-03** | 배경색 CSS 토큰 미정의 (`--bg-page`, `--bg-surface` 등) | PM1 | `index.css` |
| **L-04** | 전역 Toast 시스템 없음 — 각 페이지 독립 구현 | PM1 | `QuestionBank.jsx` |
| **L-05** | 검색 결과 없음 상태에서 검색어 초기화 버튼 미제공 | PM1 | `QuestionBank.jsx`, `QuizStats.jsx` |
| **L-06** | 총 배점 0점인 퀴즈 발행 차단 검증 없음 | PM2 | 발행 검증 로직 |
| **L-07** | `getStudentAnswer` 함수의 결정론적 해시 답안 생성 — 채점 로직 테스트 혼동 가능 | PM3 | `mockData.js` |

---

## 3. Critical 이슈 — 긴급 수정 강조

아래 5건은 즉시 수정이 필요하다.

### CR-01 / CR-02 역할 기반 접근 제어 구현

PM2, PM3, PM4, PM5 4개 보고서가 동시에 지적한 최우선 이슈. 학생이 URL 직접 입력으로 채점 대시보드, 퀴즈 생성, 문제은행 화면에 접근할 수 있다.

수정 대상 4개 파일 진입부에 역할 가드 추가:
- `GradingDashboard.jsx`
- `QuizCreate.jsx`
- `QuestionBankList.jsx`
- `QuestionBank.jsx`

기존 구현 참조: `QuizAttempt.jsx`에 이미 동일 패턴(`!isPreview && role !== 'student'` → Navigate) 구현됨.

### CR-03 mockQuizzes 전역 배열 직접 변이

`QuizList.jsx:95`에서 import된 모듈 레벨 배열을 직접 수정. React 렌더링 외부에서 상태가 변경되어 예기치 않은 동작 유발. `mockQuizzes`를 `useState`로 올리거나 Context화하여 불변 업데이트 패턴을 적용해야 한다.

### CR-04 퀴즈 생성 영속성 확보

`mockQuizzes.push()`로만 저장되어 새로고침 시 소실. 기 구현된 QuestionBankContext의 localStorage 패턴을 참조해 최소한 localStorage 저장으로 새로고침 내구성을 확보해야 한다.

### CR-05 텍스트 색상 접근성 위반

`#9E9E9E`(대비비 2.85:1), `#BDBDBD`(대비비 1.6:1)가 프로젝트 전체 40곳 이상에 텍스트 색상으로 사용. WCAG AA 기준(4.5:1) 대폭 미달. `#767676` 이상으로 전체 파일 검색/치환으로 처리 가능하다.

---

## 4. MVP 로드맵

### MVP1 완료 현황

| 기능 영역 | 구현 완료 | 잔여 이슈 |
|---|---|---|
| 퀴즈 생성/편집/발행 | 완료 | 임시저장 미동작, 생성 데이터 영속성 없음 |
| 문항 구성 (문제은행 + 직접 입력) | 완료 | |
| 학생 응시 (타이머, 자동 제출) | 완료 | 지각 제출 검증 없음, accessCode 차단 없음 |
| 재응시 횟수 제한 | 완료 | 점수 정책 응시 화면 미표시 |
| 자동채점 | 완료 | 단답형 대소문자 무시 미지원, autoGrade 정책 불일치 |
| 수동채점 (문항 중심/학생 중심) | 완료 | 최종 점수 확정 트리거 없음 |
| 채점 통계 | 완료 | QuizStats fallback 버그 |
| 문제은행 CRUD | 완료 | |
| 주차/차시 필터 | 완료 | |
| 엑셀 다운로드 | 완료 | xlsx 번들 미분리 |
| 역할 분기 (교수자/학생) | 완료 | 4개 라우트 가드 미적용 |

MVP1 기능 구현 완성도는 약 80%이며, 역할 기반 접근 제어 구현이 즉시 완성도를 높일 수 있는 Quick Fix다.

---

### MVP2 우선순위 (다음 스프린트)

| 기능 | Impact | Effort | 우선순위 | 근거 |
|---|---|---|---|---|
| 역할 기반 라우트 가드 (CR-01/02) | 상 | 하 | 1순위 | Critical 보안, 4개 파일 각 1~2줄 추가 |
| mockQuizzes 전역 변이 제거 (CR-03) | 상 | 중 | 2순위 | 상태 관리 전체 안정성 영향 |
| 퀴즈 생성 localStorage 영속성 (CR-04) | 상 | 하 | 3순위 | UX 신뢰 손상 즉시 해소 |
| 텍스트 색상 접근성 수정 (CR-05) | 중 | 하 | 4순위 | 전체 파일 검색/치환으로 처리 |
| xlsx 청크 분리 (H-06) | 중 | 하 | 5순위 | `vite.config.js` 1줄 추가 |
| id 접근 fallback 제거 (H-04) | 중 | 하 | 6순위 | 3개 파일 동일 패턴 일괄 수정 |
| 임시저장 기능 구현 또는 disabled 처리 (H-01) | 중 | 중 | 7순위 | 기능 없는 버튼은 신뢰 저하 |
| 지각 제출 검증 로직 (H-02) | 중 | 중 | 8순위 | PM5 정책 확정 이후 구현 |
| 학생 성적 상세 확인 페이지 | 중 | 중 | 9순위 | PM2 지적 — 채점 완료 후 학생 경험 |
| open → grading/closed 자동 상태 전이 (H-16) | 중 | 중 | 10순위 | 마감 후 응시 가능 상태 해소 |
| 수동채점 최종 점수 확정 흐름 (H-05) | 중 | 중 | 11순위 | 채점 워크플로우 완결 |
| 모바일 네비게이션 대안 (H-09) | 중 | 중 | 12순위 | 반응형 필수 |

---

### MVP3 후보

| 기능 | 제외 사유 |
|---|---|
| 알림 정책 (발행/마감/채점 완료) | 인프라 연동 필요 |
| 재응시 시 이전 답안 공개 여부 설정 | PM2 정책 수립 선행 필요 |
| 단답형 부분 일치 자동채점 | NLP 정확도 이슈 |
| 부분 점수(partial credit) 구현 | 정책 정의 선행 필요 |
| 조교(TA) 역할 및 채점 위임 | 권한 체계 재설계 필요 |
| 학생 이의제기 기능 | 전체 이의 처리 플로우 설계 필요 |
| Canvas API 실 연동 (LTI) | 백엔드 인프라 구축 선행 |
| 복수 강좌 지원 | CS301 단일 하드코딩 해소 필요 |

---

## 5. 다음 스프린트 권고 작업 (Top 10)

| 순위 | 작업 항목 | 관련 이슈 | 예상 공수 | 비고 |
|---|---|---|---|---|
| **1** | GradingDashboard / QuizCreate / QuestionBankList / QuestionBank 4개 파일에 역할 가드 추가 | CR-01, CR-02 | 소 (1~2시간) | `QuizAttempt.jsx` 기존 패턴 복붙 수준 |
| **2** | `html { font-size: 16px }` 수정 + `#9E9E9E`/`#BDBDBD` 텍스트 전체 교체 | CR-05, H-12 | 소 (2~4시간) | 전체 파일 검색/치환 |
| **3** | `xlsx` `manualChunks` 분리 | H-06 | 소 (30분) | `vite.config.js` 조건 1줄 추가 |
| **4** | QuizStats / QuizEdit / QuestionBank `배열[0]` fallback 제거 후 404 처리 통일 | H-04 | 소 (2~3시간) | 3개 파일 동일 패턴 |
| **5** | `mockQuizzes` 전역 배열 직접 변이 제거 — `useState` 또는 Context 전환 | CR-03 | 중 (4~8시간) | QuizList 전체 상태 구조 변경 |
| **6** | 퀴즈 생성 데이터 localStorage 영속성 확보 | CR-04 | 중 (4~6시간) | QuestionBankContext 패턴 참조 |
| **7** | 임시저장 버튼 `disabled + "준비 중" 토스트` 처리 또는 localStorage 기반 실 구현 | H-01 | 소~중 | 기능 없는 버튼 즉시 해소 |
| **8** | `focus-visible:ring-2 focus-visible:ring-indigo-500` 전체 추가 + `focus:outline-none` 점검 | H-08 | 중 (2~4시간) | 전체 커스텀 버튼/드롭다운 대상 |
| **9** | `mockData.js` 관심사별 분리 (`quizData.js`, `studentData.js`, `bankData.js`, `gradingUtils.js`) | H-17 | 중 (4~6시간) | API 전환 전 필수 선행 작업 |
| **10** | Primary 색상 `#4f46e5` 단일 값으로 통일, `STATUS_STYLES` 상수 파일 추출 | H-10, H-11 | 소~중 (2~4시간) | 전체 파일 검색/치환 후 상수 파일 생성 |

---

## 6. PM 간 의견 교차 분석

### 중복 지적 이슈 (3개 이상 PM 공통)

| 이슈 | 공통 지적 PM | 핵심 결론 |
|---|---|---|
| 역할 기반 접근 제어 미적용 | PM2, PM3, PM4, PM5 | 즉시 수정. 보안과 기능 신뢰 모두 영향 |
| `xlsx` 청크 미분리 | PM3, PM4 | 1줄 수정으로 해결 가능한 Quick Win |
| `mockData.js` 단일 파일 과부하 | PM3, PM4 | API 전환 전 분리 권고 |
| localStorage 데이터 정합성 | PM3, PM4, PM5 | 실데이터 전환 시 가장 큰 구조 변경 필요 |
| 임시저장 미동작 | PM2, PM4, PM5 | 기능 없는 버튼은 UX 신뢰를 해침 |
| `배열[0]` fallback 패턴 | PM1, PM2, PM4 | 3개 파일 동일 수정 |
| 지각 제출 로직 미구현 | PM2, PM4, PM5 | PM5 정책 확정(3-2절) 후 구현 |

### PM 간 관점 차이 및 조율

| 이슈 | PM 관점 차이 | 최종 판단 |
|---|---|---|
| 임시저장 처리 방법 | PM4: 버튼 disabled + "준비 중" 토스트 권고 / PM2: beforeunload 이벤트 + 임시저장 구현 권고 | 단기: disabled + 토스트(Quick Fix) / 중기: localStorage 기반 draft 저장 구현 |
| 단답형 autoGrade 정책 | PM3: `autoGrade: 'partial'` 코드 불일치 수정 권고 / PM5: 완전 일치 + 대소문자 무시를 정책으로 확정 | PM5 정책 확정안 기준으로 코드 일원화 |
| 상태 전이 자동화 시점 | PM2: 실데이터 전환 전 dueDate 비교 로직이라도 즉시 추가 / PM5: MVP2 범위로 분류 | PM5 로드맵 기준 MVP2에 포함하되, dueDate 초과 시 응시 차단만 QuizAttempt에 즉시 추가 |
| `mockQuizzes` 구조 개선 | PM3: Context 전환 권고 / PM4: localStorage 최소 영속성만 먼저 | 단기: localStorage 영속성(CR-04) 우선 / 중기: QuizContext 전환(PM3 Phase 5) |

---

*본 보고서는 PM1~PM5 보고서의 교차 분석 기반으로 작성되었습니다. 실제 서비스 전환 시 각 PM 보고서의 상세 기준을 함께 참조하시기 바랍니다.*
