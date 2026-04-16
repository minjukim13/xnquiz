# Canvas Classic Quizzes vs XN Quiz 갭 분석 보고서

**작성일**: 2026-04-16
**목적**: Canvas Classic Quizzes 대비 XN Quiz의 기능 누락 사항을 체계적으로 식별하고 우선순위를 매긴다
**분석 기준**: Canvas Classic Quizzes 공식 가이드 + ANALYSIS-PROMPT.md 14개 영역 체계 (New Quizzes 제외, Canvas 2020 기준 - 2021년 이후 도입 기능 제외)
**현재 XN Quiz 상태**: MVP1 완료, PM4 QA 통과율 87% (55/63)

---

## 분석 요약

| 구분 | 건수 |
|------|------|
| **구현 완료** | 34개 기능 |
| **부분 구현** (필드만 존재, 검증 로직 없음 등) | 11개 기능 |
| **미구현** (Canvas에 있으나 XN에 없음) | 23개 기능 |
| **XN 고유 기능** (Canvas에 없음) | 8개 기능 |

| 우선순위 | 건수 | 설명 |
|---------|------|------|
| **Must-have** | 9건 | 즉시 구현 필요 |
| **Should-have** | 7건 | MVP2, 다음 스프린트 |
| **Nice-to-have** | 5건 | MVP3 이후 |
| **Out-of-scope** | 3건 | 구현 불필요 또는 기존 기능으로 대체 |

---

## 1. 퀴즈 타입

Canvas Classic Quizzes는 4가지 퀴즈 타입을 지원한다. XN Quiz는 Graded Quiz만 완전 구현된 상태.

| Canvas 타입 | 설명 | XN 현황 | 상태 | 우선순위 |
|------------|------|---------|------|---------|
| **Graded Quiz** | 성적 반영, Assignment 자동 생성, 자동/수동 채점 | `status: open/grading/closed` | 구현 완료 | - |
| **Practice Quiz** | 성적 미반영, 즉시 정답 표시, 무제한 재시도 권장 | `quizMode: practice` 필드만 존재 | **부분 구현** | Should-have |
| **Graded Survey** | 정답 없음, 완료 시 만점 자동 부여, Assignment 연동 | 없음 | **미구현** | Nice-to-have |
| **Ungraded Survey** | 정답 없음, 성적 미반영, 익명 응답 가능 | 없음 | **미구현** | Nice-to-have |

**Practice Quiz 부분 구현 상세:**
- 현재: `quizMode` 필드가 mockData에 존재하나, practice 선택 시 전용 동작이 없음
- 누락 동작: 응시 직후 정답 즉시 표시, 성적표(Gradebook) 미반영, 무제한 재시도 기본값

**참고**: Canvas에서 Practice Quiz와 Survey는 사용 빈도가 Graded Quiz 대비 낮음. 단, Practice Quiz는 학습용 자가진단 도구로 교수자 요구가 높은 편.

---

## 2. 퀴즈 설정

### 2.1 구현 완료된 설정

| Canvas 설정 | XN 구현 | 비고 |
|------------|---------|------|
| Time Limit (분 단위) | `timeLimit` + 무제한 옵션 | 클라이언트 타이머, 만료 시 자동 제출 |
| Shuffle Answers | `shuffleChoices` | 선택지 순서 랜덤 |
| Shuffle Questions | `shuffleQuestions` | 문항 순서 랜덤 |
| Multiple Attempts | `allowAttempts` (1~99, -1=무제한) | 재응시 횟수 제어 |
| Score to Keep | `scorePolicy` (최고/최신/평균) | `recalculateScorePolicy` 함수 구현 |
| Show Correct Answers | `scoreRevealEnabled` + `scope` + `timing` | 범위(오답만/정답포함), 시점(즉시/마감후/기간) |
| Show Correct Answers at/until | `scoreRevealStart` / `scoreRevealEnd` | 기간 제한 정답 공개 |
| Due Date / Available From / Until | `startDate` / `dueDate` / `lockDate` | 날짜 필드 존재 (서버 강제 차단은 미구현) |

### 2.2 부분 구현된 설정

| Canvas 설정 | XN 현황 | 누락 사항 | 우선순위 |
|------------|---------|----------|---------|
| **Access Code** | `accessCode` 필드 저장됨 | 응시 진입 시 코드 입력/검증 UI와 로직 없음 | **Must-have** |
| **IP Filter** | `ipRestriction` 필드 저장됨 | 서버사이드 IP 검증 불가 (프론트엔드 한계), 프로토타입에서는 UI 안내만 가능 | Must-have (서버 전환 시) |

### 2.3 미구현된 설정

| Canvas 설정 | 동작 설명 | XN 현황 | 우선순위 | Effort |
|------------|----------|---------|---------|--------|
| **One Question at a Time** | 한 번에 하나의 문항만 표시. 학생이 "다음"을 눌러야 다음 문항 노출 | 없음 | **Must-have** | 중 |
| **Lock Questions After Answering** | One Question at a Time 활성화 시 추가 옵션. 답변 후 이전 문항으로 돌아갈 수 없음 | 없음 (위 설정 전제) | **Must-have** | 하 (위 구현 후 추가) |
| **Let Students See Their Quiz Responses** (`hide_results`) | 학생이 제출 후 자신의 응답을 볼 수 있는지 제어. "Always", "Only Once", "Until", "Never" 옵션 | 없음 | **Must-have** | 하 |
| **Only Once After Each Attempt** (`one_time_results`) | 결과를 시도당 1회만 조회 가능 | 없음 | **Must-have** | 하 |
| **Assign To** (차등 날짜) | 특정 학생/그룹에 다른 Due Date / Available From / Until 설정 | 이전에 구현 후 제거됨, 재구현 필요 | **Must-have** | 중 (기존 구현 경험 있음) |
| ~~Assignment Group~~ | 성적 계산을 위한 과제 그룹 지정 (Gradebook 연동) | 없음 | **Out-of-scope** | - |

**One Question at a Time 상세:**
- Canvas에서는 서버사이드에서 강제됨 (클라이언트가 다음 문항 데이터를 미리 받지 않음)
- XN 프로토타입에서는 클라이언트사이드 구현만 가능하나, UI/UX 측면에서는 충분히 구현 가능
- 부정행위 방지 효과가 높아 시험 모드에서 교수자 요구가 많음

---

## 3. 문항 유형

### 3.1 구현 현황 (12/12 타입, Missing Word 제외)

| Canvas 타입 | XN 타입 | 상태 |
|------------|---------|------|
| Multiple Choice | `multiple_choice` | 구현 완료 |
| True/False | `true_false` | 구현 완료 |
| Multiple Answers | `multiple_answers` | 구현 완료 |
| Short Answer (Fill in the Blank) | `short_answer` | 구현 완료 |
| Essay | `essay` | 구현 완료 |
| Numerical Answer | `numerical` | 구현 완료 |
| Formula (Calculated) | `formula` | 구현 완료 |
| Matching | `matching` | 구현 완료 |
| Fill in Multiple Blanks | `fill_in_multiple_blanks` | 구현 완료 |
| Multiple Dropdowns | `multiple_dropdowns` | 구현 완료 |
| File Upload | `file_upload` | 구현 완료 |
| Text (No Question) | `text` | 구현 완료 |
| ~~Missing Word~~ | 없음 | **Out-of-scope** (Multiple Dropdowns로 대체 가능) |

### 3.2 채점 알고리즘 Edge Case 검증 필요 항목

Canvas 소스코드 기준으로 XN과 동작이 다를 수 있는 부분:

| 문항 유형 | Canvas 동작 | XN 현황 | 검증 필요 |
|----------|------------|---------|----------|
| **Short Answer** | 정답을 여러 개 등록 가능 (multiple correct answers). 학생 답이 그 중 하나와 일치하면 정답 | 단일 정답 + 유사도 기반 | 정답 여러 개 등록 기능 확인 필요 |
| **Matching** | Distractor(오답 보기) 추가 지원. 좌측보다 우측이 더 많을 수 있음 | 좌우 1:1 매칭만 확인 필요 | Distractor 지원 여부 확인 |
| **Fill in Multiple Blanks** | 각 blank별로 복수 정답 등록 가능 | 단일 정답만 지원 (blank당 1개) | **구현 필요** (Short Answer의 `acceptedAnswers` 패턴 적용, Effort 하) |
| **Formula (Calculated)** | 변수 범위/소수점/허용오차 설정, 문항 생성 시 여러 세트 자동 생성 | 기본 수식 계산만 | 변수 세트 자동 생성 기능 확인 필요 |

---

## 4. Moderate 기능 (응시 관리) -- **XN 조건부 재응시 + Assign To로 대체**

Canvas의 Moderate This Quiz는 교수자가 개별 학생의 응시 조건을 실시간으로 조정하는 기능이다. XN Quiz에서는 **조건부 재응시(`ConditionalRetakeModal`)** + **Assign To(차등 날짜)**로 대체한다.

### 4.1 Canvas Moderate 기능 vs XN 대체 방안

**Canvas 접근 방법:** 퀴즈 상세 페이지 > 우측 사이드바 "Moderate This Quiz" 링크 > 학생 목록 + 개별 설정

| Moderate 기능 | Canvas 동작 | XN 대체 방안 | 상태 |
|--------------|------------|-------------|------|
| **학생별 추가 시도** (extra_attempts) | 특정 학생에게 N회 추가 시도 부여 | 조건부 재응시 (점수 미달/미응시 자동 선별 + 일괄 부여) | **대체 완료** |
| **학생별 잠금 해제** (manually_unlock) | lock_at 경과 후에도 특정 학생에게 퀴즈 재개방 | Assign To로 해당 학생의 Until 날짜를 개별 연장 | **Assign To 재구현 시 대체 가능** |
| **학생별 추가 시간** (extra_time) | 특정 학생에게 각 시도당 N분 추가 | 조건부 재응시 시 시간 재설정으로 대체 | **대체 가능** |
| **미제출 퀴즈 수동 제출** | 교수자가 미제출 상태의 학생 퀴즈를 강제 제출 처리 | 타이머 만료 시 auto-submit으로 대체 | **대체 가능** |
| **진행 중 학생 모니터링** | 현재 응시 중인 학생 목록, 시작 시간, 남은 시간 표시 | 별도 구현 불필요 (서버 연동 후 재검토) | **Out-of-scope** |

### 4.2 대체 전략 요약

| 비교 항목 | Canvas Moderate | XN 대체 기능 |
|----------|----------------|-------------|
| 대상 선별 | 교수자가 개별 학생 수동 선택 | 조건부 재응시: 점수 미달/미응시 자동 선별 |
| 추가 시도 | 개별 N회 부여 | 조건부 재응시: 조건 기반 일괄 부여 |
| 잠금 해제 | 개별 학생 수동 해제 | Assign To: 해당 학생 Until 날짜 연장 |
| 추가 시간 | 타이머 분 단위 추가 | 조건부 재응시 시 시간 재설정 |

**결론:** Canvas Moderate의 핵심 시나리오(재시도 부여, 마감 연장)는 XN의 조건부 재응시 + Assign To 조합으로 충분히 대체 가능하다. Moderate 페이지를 별도 구현하지 않고 기존 XN 고유 기능을 활용한다.

---

## 5. 채점 및 점수 관리

### 5.1 구현 완료

| 기능 | XN 구현 | 비고 |
|------|---------|------|
| 자동채점 (11개 유형) | `autoGradeAnswer` 함수 | 객관식, 참/거짓, 수치형, 매칭 등 |
| 수동채점 (2가지 모드) | GradingDashboard (문항 중심/학생 중심) | **Canvas SpeedGrader보다 우수한 UX** |
| 재채점 4옵션 | `regradeQuestionWithOption` | 이전+새 정답 모두 인정 / 새 정답만 / 만점 / 변경 없음 |
| kept_score 계산 | `recalculateScorePolicy` | 최고/최신/평균 |
| score_before_regrade 보존 | `xnq_regrade_log` | 재채점 전 원점수 기록 |

### 5.2 미구현

| Canvas 기능 | 동작 설명 | XN 현황 | 우선순위 | Effort |
|------------|----------|---------|---------|--------|
| **Fudge Points** | 자동채점 결과에 교수자가 전체 가감점 적용. 예: 자동채점 85점 + fudge +3점 = 88점. 출제 오류 보상, 참여 보너스 등에 활용 | 없음 | **Should-have** | 하 |
| **문항별 코멘트 3종** | `correct_comments` (정답 시 표시), `incorrect_comments` (오답 시 표시), `neutral_comments` (무조건 표시). 문항 생성 시 미리 설정 | 없음 | **Should-have** | 중 |
| **채점 완료 확정 흐름** | `pending_review` → `complete` 상태 전이. 수동채점 항목이 모두 완료되면 "채점 확정" 트리거 발동, 최종 점수 산출 | 수동채점 저장은 되나, 확정 트리거/최종 합산 없음 | **Must-have** | 중 |
| 전체 코멘트 (Submission Comment) | SpeedGrader에서 학생 전체 제출물에 대한 종합 코멘트 | 학생별 코멘트 1개만 (`xnq_student_comments`) | 부분 구현 | - |

**Fudge Points 상세:**
- Canvas SpeedGrader 하단에 "Fudge Points" 입력 필드가 있음
- 양수(+) 또는 음수(-) 입력 가능
- 자동채점 점수 + fudge_points = 최종 점수
- 적용 후 Gradebook에 최종 점수가 반영됨
- XN 구현 시: GradingDashboard의 StudentDetailPanel에 "점수 보정" 입력 필드 추가

**문항별 코멘트 3종 상세:**
- Canvas 문항 생성 시 각 문항에 대해 3가지 피드백 텍스트를 사전 설정
- `correct_comments`: 학생이 정답을 맞혔을 때 표시되는 피드백
- `incorrect_comments`: 학생이 오답일 때 표시되는 피드백
- `neutral_comments`: 정답 여부와 관계없이 항상 표시되는 피드백
- 정답 공개(Show Correct Answers) 설정과 연동
- XN 구현 시: AddQuestionModal에서 문항 생성 시 3가지 코멘트 입력 필드 추가, QuizAttempt 결과 화면에서 조건부 표시

---

## 6. 제출 생명주기

### 6.1 구현 완료

| 기능 | XN 구현 |
|------|---------|
| 발행/비발행 | `status` + `visible` 토글 |
| 퀴즈 미리보기 | `?preview=true` 파라미터, QuizAttempt에서 isPreview 처리 |
| 타이머 기반 자동 제출 | 시간 만료 시 응답 자동 저장 및 제출 |

### 6.2 부분 구현/미구현

| Canvas 기능 | 동작 설명 | XN 현황 | 우선순위 | Effort |
|------------|----------|---------|---------|--------|
| **상태 자동 전이** | 시간 기반으로 draft→open→grading→closed 자동 전이. open: startDate 도래, grading: dueDate 도래+제출 존재, closed: 모든 채점 완료 | draft→open만 구현 | **Must-have** | 중 |
| **지각 제출 검증** | dueDate 경과 후 응시 시 차단 또는 지각 표시(late). `allowLateSubmit` 설정에 따라 동작 | 필드만 존재, 검증 로직 없음. 마감 후에도 응시 가능 | **Must-have** | 하 |
| **답변 자동 저장** (Autosave) | 응시 중 주기적으로(30초~2분) 현재 응답을 서버에 자동 저장. 브라우저 충돌/네트워크 단절 시 복구 가능 | 없음 (메모리 상태만) | **Should-have** | 중 |
| **예약 발행** (scheduled) | unlock_at 시점에 자동으로 퀴즈가 학생에게 공개됨. 교수자가 미리 설정 후 자동 발행 | 필드만 존재, scheduled 상태/자동 전이 없음 | **Should-have** | 중 |
| **마감 후 미제출자 일괄 자동 제출** | Outstanding Quiz Submission Manager가 마감 후 미제출 학생의 응시를 자동 제출 처리 | 타이머 만료 시 개별 auto-submit만 | **Should-have** | 중 |
| **Grace Period** | 제출 지연 허용 시간 (예: 마감 후 5분까지 허용). Canvas에서는 quiz_submission.end_at + grace_period까지 허용 | 없음 | Nice-to-have | 하 |

**상태 자동 전이 상세:**
```
Canvas 상태 전이:
  created → unpublished → published → (학생 응시 가능)
                                    ↓ (dueDate 경과 + 미채점 존재)
                                  grading
                                    ↓ (모든 채점 완료)
                                  closed

XN 현재 상태:
  draft → open (수동 발행만)
  grading, closed 상태 전이 없음
```

---

## 7. 문제은행

### 7.1 구현 완료

| 기능 | XN 구현 |
|------|---------|
| Course-level Bank CRUD | QuestionBankContext (localStorage 기반) |
| 문항 추가/수정/삭제 | 12가지 유형 지원 |
| 은행에서 퀴즈로 문항 추가 | QuestionBankModal |
| 무작위 출제 (단일 은행) | RandomQuestionBankModal |
| CSV 임포트/내보내기 | 문항 일괄 등록 |
| 은행 복사 | 은행 전체 복제 |

### 7.2 미구현

| Canvas 기능 | 동작 설명 | XN 현황 | 우선순위 | Effort |
|------------|----------|---------|---------|--------|
| **복수 은행 동시 랜덤 출제** | Question Group에 여러 은행을 연결하여 은행별 N개씩 랜덤 추출 | 단일 은행만 | **Should-have** | 상 |
| **Question Group 별 배점 차등** | Group 내 모든 문항에 동일 배점 지정 (points_per_question). 개별 문항 배점과 독립 | 없음 | **Should-have** | 중 |
| **Account-level Bank** | 기관(학교) 전체에서 공유하는 문제은행. 과목을 넘어 재사용 | 없음 | Nice-to-have | 상 |
| **Bank Bookmarking** | 다른 과목의 문제은행을 북마크하여 내 과목에서 참조 | 없음 | Nice-to-have | 중 |
| **Bank 참조 공유** (cross-course) | 복사가 아닌 참조로 과목 간 은행 공유. 원본 수정 시 참조처에 반영 | 내보내기/가져오기(복사)만 가능 | Nice-to-have | 상 |

---

## 8. 통계 및 보고서

### 8.1 구현 완료

| 기능 | XN 구현 | 비고 |
|------|---------|------|
| 성적 분포 차트 | QuizStats (BarChart) | Recharts 기반 |
| 문항별 정답률 | StatsTab | 문항별 정답/오답 비율 |
| 차별도 (Discrimination Index) | excelUtils.js | 상/하위 27% 비교 |
| 점이황상관 (Point Biserial, Rpb) | excelUtils.js | 문항-전체점수 상관 |
| Cronbach Alpha | excelUtils.js | 내적 일관성 신뢰도 |
| Student Analysis (학생별 응답) | downloadGradesXlsx | Excel 형태 |
| Item Analysis (문항 분석) | downloadItemAnalysisXlsx | Excel 형태 |

### 8.2 미구현

| Canvas 기능 | 동작 설명 | XN 현황 | 우선순위 | Effort |
|------------|----------|---------|---------|--------|
| **Quiz Log (활동 로그)** | 학생의 응시 행동 추적: 시작 시간, 각 문항 이동 시간, 답변 변경 기록, 포커스 이탈 등. 부정행위 탐지에 활용 | 없음 | Nice-to-have | 상 |

**비고:** XN Quiz는 통계 영역이 Canvas 대비 동등하거나 우수함. Cronbach Alpha, 점이황상관 등 Canvas 기본 UI에서 직접 제공하지 않는 고급 지표를 Excel 내보내기에 포함하고 있음.

---

## 9. 연동 (MVP3 범위)

현시점에서는 참조 분석 수준. 서버 전환 시 필요.

| Canvas 기능 | 설명 | XN 현황 |
|------------|------|---------|
| Quiz → Assignment 자동 생성 | Graded Quiz 발행 시 Assignment 자동 생성, Gradebook 열 추가 | 없음 |
| Gradebook 점수 동기화 | 채점 완료 시 Gradebook에 자동 반영 | 없음 |
| Section별 날짜 차등 | 분반별 다른 마감일/공개일 설정 | 없음 |
| LTI Grade Passback | 외부 도구에서 Canvas Gradebook으로 점수 전달 | 없음 |
| REST API (40+ endpoints) | Quiz/Question/Submission/Statistics 전체 API | api.js stub만 |

---

## 10. 우선순위 종합

### Must-have (즉시 구현)

| # | 기능 | 현황 | Effort | 비고 |
|---|------|------|--------|------|
| 1 | **접근 코드 검증** | 필드만 존재, 응시 시 검증 로직 없음 | 하 | PM2 E-14 |
| 2 | **지각 제출 검증** | `allowLateSubmit` 필드만, 마감 후 응시 가능 | 하 | PM2 E-04 (High) |
| 3 | **채점 완료 확정 흐름** | 수동채점 저장만, 최종 합산 트리거 없음 | 중 | PM2 E-08, PM5 High |
| 4 | **상태 자동 전이** | draft→open만, grading/closed 전이 없음 | 중 | PM2 E-10, PM5 High |
| 5 | **One Question at a Time** | 한 번에 하나의 문항만 표시 | 중 | 시험 모드 핵심 |
| 6 | **Lock Questions After Answering** | 답변 후 이전 문항 잠금 (#5 전제) | 하 | #5 구현 후 추가 |
| 7 | **Let Students See Their Quiz Responses** (`hide_results`) | 학생 응답 조회 제어 (Always/Once/Until/Never) | 하 | |
| 8 | **Only Once After Each Attempt** (`one_time_results`) | 결과를 시도당 1회만 조회 | 하 | #7과 연동 |
| 9 | **Assign To** (차등 날짜) | 학생/그룹별 다른 Due Date / Available From / Until | 중 | 이전 구현 후 제거됨, 재구현 |

### Should-have (MVP2 -- 다음 스프린트)

| # | 기능 | 설명 | Effort |
|---|------|------|--------|
| 10 | **Fudge Points** | 전체 점수 가감점 (출제 오류 보상, 참여 보너스) | 하 |
| 11 | **문항별 코멘트 3종** | correct/incorrect/neutral 피드백 사전 설정 | 중 |
| 12 | **Practice Quiz 전용 동작** | 즉시 정답 표시, 성적 미반영, 무제한 재시도 기본 | 하 |
| 13 | **답변 자동 저장 (Autosave)** | 응시 중 주기적 자동 저장. 데이터 손실 방지 | 중 |
| 14 | **마감 후 미제출자 일괄 자동 제출** | Outstanding submissions 처리 | 중 |
| 15 | **복수 은행 동시 랜덤 출제** | 여러 은행에서 은행별 N개 랜덤 추출 | 상 |
| 16 | **예약 발행 (scheduled)** | unlock_at 시점 자동 공개 | 중 |

### Nice-to-have (MVP3+)

| # | 기능 | 설명 | Effort |
|---|------|------|--------|
| 17 | Graded Survey / Ungraded Survey | 설문 타입 2종 | 중 |
| 18 | Quiz Log (활동 로그) | 응시 행동 추적, 부정행위 탐지 | 상 |
| 19 | Account-level Bank / Bookmarking / Sharing | 기관 단위 문제은행 공유 체계 | 상 |
| 20 | Gradebook / Assignment 연동 | 점수 동기화, 과제 자동 생성 | 상 |
| 21 | Grace Period | 제출 유예 시간 | 하 |

### Out-of-scope (구현 불필요)

| 기능 | 사유 |
|------|------|
| **Assignment Group** | Gradebook 연동 전제 기능. XN Quiz 독립 운영 범위에서 불필요 |
| **Missing Word** | Multiple Dropdowns 유형으로 완전 대체 가능. Canvas 고유 유형이며 사용 빈도 극히 낮음 |
| **Moderate (전체)** | 조건부 재응시 + Assign To로 대체. 추가 시도/시간/잠금 해제/수동 제출/모니터링 전부 포함 |

---

## 11. XN Quiz 고유 기능 (Canvas 대비 차별점)

Canvas Classic Quizzes에는 없지만 XN Quiz에만 있는 기능들:

| 기능 | 설명 | 가치 |
|------|------|------|
| **문항 중심 채점 모드** | 한 문항에 대해 전체 학생 답안을 나열하며 일괄 채점. Canvas SpeedGrader는 학생 중심만 지원 | 서술형/주관식 일괄 채점 효율 극대화 |
| **조건부 재응시** | 점수 미달/미응시 학생을 자동 선별하여 일괄 재응시 부여 | 대규모 수업에서 개별 설정 부담 감소 |
| **복수선택 채점 전역 설정** | 부분점수/감점 정책 3종 (all_correct, partial, formula_scoring) | Canvas는 복수선택 시 all-or-nothing만 지원 |
| **대소문자 구분 전역 설정** | 단답형 caseSensitive ON/OFF 전역 제어 | Canvas는 문항별 개별 설정 |
| **채점 진행률 실시간 표시** | 문항별/학생별 채점 완료 비율 대시보드 | 대규모 수업 채점 현황 파악 |
| **Excel 일괄 채점 업로드** | Excel 파일로 점수 일괄 입력 | 오프라인 채점 후 업로드 |
| **주차/차시 필터** | 퀴즈를 주차/차시 기준으로 분류 및 필터링 | 한국 대학 수업 구조에 최적화 |
| **PDF 시험지/답안지 출력** | 시험지 및 학생 답안지 PDF 다운로드 | 오프라인 시험 겸용 |

---

## 12. 기존 PM 보고서와 교차 검증

| 갭 분석 항목 | PM 보고서 기존 이슈 | 일치 여부 |
|-------------|-------------------|----------|
| 접근 코드 검증 | PM2 E-14 (Medium) | 일치 (우선순위 상향: Must-have) |
| 지각 제출 검증 | PM2 E-04 (High) | 일치 |
| 채점 완료 확정 | PM2 E-08, PM5 High | 일치 |
| 상태 자동 전이 | PM2 E-10 (High) | 일치 |
| 모바일 내비게이션 | PM1 Critical-1 | Canvas 갭 아닌 UX 이슈 (본 보고서 범위 외) |
| Fudge Points | 신규 발견 | PM 보고서 미언급 |
| 문항별 코멘트 3종 | 신규 발견 | PM 보고서 미언급 |
| ~~Quiz Extension (Moderate)~~ | 신규 발견 | 조건부 재응시 + Assign To로 대체 → **Out-of-scope** |
| One Question at a Time | 신규 발견 | PM 보고서 미언급 → **Must-have로 확정** |
| Lock Questions After Answering | 신규 발견 | PM 보고서 미언급 → **Must-have로 확정** |
| hide_results | 신규 발견 | PM 보고서 미언급 → **Must-have로 확정** |
| one_time_results | 신규 발견 | PM 보고서 미언급 → **Must-have로 확정** |
| Assign To (차등 날짜) | 이전 구현 후 제거됨 | **Must-have로 확정** (재구현) |
| Autosave | 신규 발견 | PM 보고서 미언급 |
| Assignment Group | - | **Out-of-scope 확정** |

**신규 발견 7건 + 우선순위 재조정**: 기존 PM 검토에서는 Canvas 대비 비교를 하지 않았기 때문에 누락되었던 기능들이 식별됨. 이 중 5건(One Question at a Time, Lock Questions, hide_results, one_time_results, Assign To)은 기획자 판단으로 Must-have로 상향 조정됨. Quiz Extension(Moderate)은 조건부 재응시 + Assign To로 대체 결정.

---

## 13. 다음 단계 권고

### 즉시 구현 (Must-have 9건)

**기존 PM High 이슈 (4건)** -- `fix/critical-high-issues` 브랜치에서 연속 작업:
1. 접근 코드 검증 (하)
2. 지각 제출 검증 (하)
3. 채점 완료 확정 흐름 (중)
4. 상태 자동 전이 (중)

**갭 분석 신규 식별 (5건)** -- 권고 구현 순서:
5. **hide_results + one_time_results** (하) -- 설정 필드 추가 + QuizAttempt 결과 화면 조건부 렌더링. 두 기능이 연동되므로 함께 구현
6. **One Question at a Time** (중) -- QuizAttempt 페이지에 단일 문항 표시 모드 추가. 문항 네비게이션 UI 필요
7. **Lock Questions After Answering** (하) -- #6 구현 후 "이전 문항 잠금" 옵션 추가
8. **Assign To (차등 날짜)** (중) -- 이전 구현 경험 있음, 재구현

### MVP2 스프린트 (권고 순서)
1. **Fudge Points** (하) -- 가장 적은 노력으로 교수자 만족도 높임
2. **Practice Quiz 전용 동작** (하) -- 기존 필드 활용, 분기 로직 추가
3. **문항별 코멘트 3종** (중) -- AddQuestionModal + QuizAttempt 결과 화면 수정
4. **Autosave** (중) -- localStorage 기반 임시 저장 후 서버 전환 시 API 교체
5. **예약 발행** (중) -- 상태 전이 로직 확장
6. **마감 후 일괄 자동 제출** (중) -- 상태 전이와 연동
7. **복수 은행 랜덤 출제** (상) -- 문제은행 구조 확장 필요

---

## 부록: 참고 자료

| 자료 | URL/경로 |
|------|---------|
| Canvas Instructor Guide - Quizzes | https://community.instructure.com/en/kb/canvas-lms-instructor-guide#category-quizzes-141 |
| What options can I set in a quiz? | https://community.instructure.com/en/kb/articles/660995 |
| What quiz types can I create? | https://community.instructure.com/en/kb/articles/660994 |
| How to give students extra time | https://community.instructure.com/en/kb/articles/661034 |
| Canvas LMS GitHub | https://github.com/instructure/canvas-lms |
| ANALYSIS-PROMPT.md | 프로젝트 첨부 문서 |
| XN Quiz PM1~PM5 보고서 | 프로젝트 루트 |
| XN Quizzes 종합검토보고서 | 프로젝트 루트 |
