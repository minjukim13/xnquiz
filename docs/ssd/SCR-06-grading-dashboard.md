# SCR-06. 채점 대시보드 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 채점 대시보드(`/quiz/:id/grade`) + 액션 메뉴에서 진입하는 모달(재채점 옵션 / 조건부 재응시) + PDF 산출(답안지 PDF / 일괄 답안지) + LX 학습활동현황 진입점 통합. 통계는 SCR-07 위임, 문제지 PDF 는 SCR-02 위임, 학생 결과 본체는 향후 학생 결과 SSD 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-06-v1.4 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-009](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076287491) v0.4 (답안지 PDF), [XQ-URD-011](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5078581261) v1.0 (교수자), [XQ-URD-019](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081825284) v1.0, [XQ-URD-022](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5079367688) v1.0, [XQ-URD-025](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081137159) v1.0 |
| 참조 코드 | `src/pages/GradingDashboard/*` (index, QuizInfoCard, StudentListPanel, QuestionItem, QuestionDetailPanel, StudentDetailPanel, ActivityLogPanel, CommentThread, AnswerCard, ResponsesTab, StatsTab, ExcelModal, EmptyState, utils), `src/components/RegradeOptionsModal.jsx`, `src/components/ConditionalRetakeModal.jsx`, `src/utils/pdfUtils.js` (`printBulkAnswerSheets`) |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
시험 목록(SCR-01) → 카드 메뉴 → "채점" → /quiz/:id/grade (SCR-06)
                                          ├ mode=question (문항 중심, 기본)
                                          │  ├ 좌측: 문항 목록
                                          │  ├ 중앙: 학생 목록 (선택 문항)
                                          │  └ 우측: 응답/통계 탭
                                          └ mode=student (학생 중심, ?mode=student)
                                             ├ 좌측: 학생 목록
                                             └ 우측: 학생 상세 (답안 + 활동 로그 + 코멘트)
                                                └ "학습활동현황으로 이동" 진입점 (LX)

[액션 메뉴 진입 모달]
  ├ 문제지 PDF 다운로드 (SCR-02 위임)
  ├ 답안지 PDF 다운로드 (응시자 분, 학생 상세)
  ├ 일괄 답안지 PDF 다운로드 (printBulkAnswerSheets)
  ├ 엑셀 답안 다운로드 (ExcelModal)
  ├ 조건부 재응시 부여 → ConditionalRetakeModal (3 step)
  └ 응시자 보유 문항 정답 수정 시 자동 → RegradeOptionsModal (4종 옵션)

핵심 태스크 클릭 뎁스:
- 채점 시작: 시험 목록 → 카드 메뉴 → 채점 (3단계)
- 학생 중심 전환: 채점 → "학생 중심" 탭 (4단계)
- 학생 답안 코멘트: 채점 → 학생 선택 → 코멘트 작성 (5단계)
- 조건부 재응시 부여: 채점 → 액션 메뉴 → 조건부 재응시 (3단계 모달)
- 재채점 옵션 적용: 문항 수정 후 저장 → RegradeOptionsModal → 4종 선택 (자동 분기)
```

**도달 원칙**

- 모드 분기 = URL 쿼리(`?mode=student`) + state. 모드 전환 시 선택 상태는 모드별 독립.
- 최초 로드 시 첫 번째 문항 자동 선택.
- 임시저장(`status === 'draft'`) 퀴즈 진입 시 EmptyState 안내 + 편집 진입 링크.
- 자동 0점 처리: `startTime` 없는 미응시자(응시 미시작)는 마감 후 자동 0점 분류 (목록상 "미제출").
- 재채점 옵션 모달: 응시자 1명 이상 + 정답 변경 시에만 자동 노출. 응시자 0명 또는 정답 외 편집은 즉시 반영.
- 조건부 재응시: 조건(미응시 / 점수 미달) 자동 선별 → 검토 → 횟수/기간 확정.

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트 / 진입** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-GRADE-DASHBOARD | 채점 대시보드 (모드 분기 포함) | `/quiz/:id/grade` | 교수자 | UX-P07-001~003/010~013/020~022/030/031/040~043/050~054/060~062/070~072 (URD-025), UX-P05-001/002 | P0 |
| SCR-I-REGRADE-OPTIONS | 재채점 옵션 선택 모달 (4종) | 문항 정답 수정 + 응시자 보유 시 자동 분기 | 교수자 | UX-P07-001~005/010/011/020~022/030 (URD-022) | P0 |
| SCR-I-CONDITIONAL-RETAKE | 조건부 재응시 부여 모달 (3 step) | 액션 메뉴 → "조건부 재응시" | 교수자 | UX-P07-001~005/010~013/020~022 (URD-011) | P0 |
| SCR-I-PRINT-ANSWER-SHEET | 개인 답안지 PDF 산출 | 학생 상세 → 답안지 PDF | 교수자 | UX-P03-001~003 (URD-009) | P1 |
| SCR-I-PRINT-BULK-ANSWER-SHEETS | 일괄 답안지 PDF 산출 | 액션 메뉴 → 일괄 답안지 | 교수자 | UX-P05-001~005 (URD-009) | P1 |
| SCR-I-LX-ACTIVITY-LINK | 학습활동현황 진입점 | 학생 상세 헤더 | 교수자 | UX-P07-001/002/003, UX-COM-010 (URD-019) | P0 (부분 충족) |

---

## 3. 화면별 상세 설계

### SCR-I-GRADE-DASHBOARD. 채점 대시보드

**구현 파일**: `src/pages/GradingDashboard/*`

**목적**

교수자/채점자가 통합 채점 정보(응시율 / 채점 완료 / 응시 기간 / 성적 공개 정책) 를 인지하고, 문항 중심 ↔ 학생 중심 관점을 전환하며 점수/가감점/코멘트를 일관 흐름으로 처리.

**레이아웃 (정상 상태)**

```
[퀴즈 정보 카드 (QuizInfoCard)]
  ├── 상단 배지 행: 상태 + 주차/차시 + 응시 기간
  ├── 시험 제목 (h1)
  └── 통계 4종 (StatCard × 4)
       ├── 응시율 (응시 시작 학생 / 전체 수강생)
       ├── 응시 인원
       ├── 채점 완료 (분모 = 전체 수강생, 마감 후 미응시자 자동 0점 반영)
       └── 평균 점수 (선택, 채점 완료 학생 기준)

[액션 바]
  ├── 좌측: 모드 탭 (문항 중심 / 학생 중심)
  └── 우측: DropdownMenu
       ├── 문제지 PDF 다운로드 (SCR-02 위임)
       ├── 답안지 PDF 다운로드 (응시자 분, 일괄)
       ├── 엑셀 답안 다운로드 (ExcelModal)
       └── 조건부 재응시 부여 (SCR-I-CONDITIONAL-RETAKE)

[split-pane 본문 (모드별 분기)]

  [mode=question (문항 중심)]
    [좌측 aside (w-72 lg:w-80)]
      ├── 정렬 드롭다운 (미채점 우선 / 문항 순)
      ├── 문항 목록 (QuestionItem × N)
      │    ├── 문항 번호 + 유형 배지 + 배점
      │    ├── 본문 요약 (line-clamp)
      │    └── 진행 막대 (gradedCount / totalCount, 색상 분기)
      └── 완료 문항 접기 토글
    [우측 main (flex-1)]
      ├── 선택 문항 헤더
      ├── 탭 (응답 / 통계)
      ├── [응답 탭 (ResponsesTab)]
      │    ├── 학생 검색 (이름 / 학번)
      │    └── 학생 목록 카드 (StudentRow × N, 답안 + 점수 입력)
      └── [통계 탭 (StatsTab)]
           ├── 평균 / 최고 / 최저 / 정답률 (모집단 = 채점 완료 학생)
           ├── 인라인 통계 카드 (수동채점: 채점 완료 인원 / 자동채점: 전체 응시)
           └── 빈 상태: 채점 완료 0명 시 "수치 대신 빈 상태"

  [mode=student (학생 중심)]
    [좌측 aside]
      ├── 학생 검색 (이름 / 학번)
      ├── 그룹 분기 (제출 학생 / 미제출 학생 자동 0점 포함)
      └── 학생 카드 (StudentListItem × N)
           ├── 이름 + 학번
           ├── 상태 배지 (정상 / 지각 / 미제출 / 자동 0점 / 예외 인정 / 재응시 보류)
           └── 점수 / 채점 완료
    [우측 main]
      └── 학생 상세 패널 (StudentDetailPanel)
           ├── 학생 기본 정보 (이름 + 학번 + 상태)
           ├── 우측 헤더: "학습활동현황으로 이동" (SCR-I-LX-ACTIVITY-LINK)
           ├── 점수 영역
           │    ├── 자동채점 + 수동 수정
           │    ├── 학생별 가산점 / 감점
           │    └── 총점 반영
           ├── 문항별 답안 (AnswerCard × N)
           │    ├── 답안 + 점수 입력 (0 ~ 배점)
           │    ├── 자동채점 결과 + 수동 수정 배지
           │    ├── 부분정답 배지
           │    └── 변경된 답안 우선 처리 배지 (재채점 대상)
           ├── 활동 로그 (ActivityLogPanel)
           └── 코멘트 (CommentThread, 텍스트 중심)
```

**인터랙션 (주요)**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (`/quiz/:id/grade`) | quiz / questions / attempts 3건 병렬 fetch. 로딩 중 Skeleton |
| I-2 | 임시저장 퀴즈 진입 | EmptyState + 편집 페이지 진입 링크 |
| I-3 | 모드 탭 클릭 | `gradingMode` 갱신. URL 쿼리 동기화. 모드별 selected 상태 독립 |
| I-4 | 문항 클릭 (mode=question) | `selectedQ` 갱신. 응답 탭으로 |
| I-5 | 문항 정렬 변경 | sortBy 갱신. 채점 완료 문항 접힘 가능 |
| I-6 | 응답 탭 점수 입력 | 0~배점 검증. 범위 밖 저장 차단 + 안내. 빈 값 저장 시 미채점 전환 안내 |
| I-7 | 통계 탭 클릭 | 평균/최고/최저/정답률. 모집단 = 채점 완료 학생 (SCR-07 단일화) |
| I-8 | 학생 클릭 (mode=student) | `selectedStudent` 갱신. URL `?studentId=` 동기화 |
| I-9 | 학생 상세 가산점/감점 입력 | `manualScores` 갱신. 총점 반영. 0점은 표시 생략 |
| I-10 | 코멘트 작성 | 텍스트 입력. 성적 공개 정책에 따라 학생 노출 시점 결정 |
| I-11 | 액션 메뉴 - PDF 다운로드 | pdfGenerating 진입. 완료 시 Toast |
| I-12 | 액션 메뉴 - 엑셀 답안 | ExcelModal 오픈 |
| I-13 | 액션 메뉴 - 조건부 재응시 | ConditionalRetakeModal 오픈 (SCR-I-CONDITIONAL-RETAKE) |
| I-14 | 채점 저장 (점수 입력 → blur) | `localStorage` 의 `xnq_quiz_grades_v1` 갱신. `gradeVersion` 증가 → 진행 막대 실시간 반영 |
| I-15 | 자동 0점 학생 재응시 부여 | 조건부 재응시 부여 시 자동 0점 결과 보류 (UX-P07-061) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 로딩 | 초기 fetch 중 | GradingDashboardSkeleton 전체 노출 |
| 퀴즈 없음 | quiz === null | AlertCircle + "퀴즈를 찾을 수 없습니다" + 목록 링크 |
| 임시저장 진입 | quiz.status === 'draft' | EmptyState - 응시 미개시 안내 + 편집 진입 |
| 응시자 0명 | quizStudents 0건 | EmptyState - "응시 데이터가 아직 없습니다" |
| 문항 미선택 (mode=question) | selectedQ 없음 | 최초 로드 시 첫 문항 자동 선택 |
| 채점 완료 0명 (통계 탭) | 수동채점 + 채점 학생 0명 | StatsTab 빈 상태 |
| 일부 채점된 문항 통계 | gradedCount > 0 && < totalCount | "채점 완료 N명 / 전체 M명" 동시 표시 |
| 자동 0점 학생 | startTime 없음 + 마감 경과 | "자동 0점" 배지. 점수 0 표기 |
| 재응시 보류 | 재응시 부여 + 자동 0점 대상 | "재응시 보류" 배지 |
| 변경된 답안 | 학생 측 답안 변경 후 재채점 대상 | "변경된 답안" 우선 처리 배지 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 (`/quiz/:id/grade`) | `getQuiz(id)` + `getQuizQuestions(id)` + `listAttempts({ quizId: id })` (mock 은 `getQuizStudents` 로 학생 중심 집계) | `GET /api/quizzes/:id` + `GET /api/quizzes/:id/questions` + `GET /api/attempts?quizId=:id` (서버에서 학생 중심 집계 + scorePolicy 반영) | 학생/문항 두 축 데이터 셋업. 자동 0점 학생 표시 | Quiz, Question, Attempt, Answer, ManualGrade |
| D-2 | 학생 행 선택 (mode=student) | 클라이언트 `selectedStudent` state | 동일 (또는 `GET /api/attempts/:attemptId` 로 상세 lazy 로드) | 학생별 답안/점수 우측 패널에 렌더 | Attempt, Answer, ManualGrade |
| D-3 | 문항 선택 (mode=question) | 클라이언트 `selectedQ` state | 동일 (또는 `GET /api/questions/:id` 상세) | 문항별 응답 분포 + 학생별 답안 우측 패널 | Question, Answer |
| D-4 | 수동채점 점수 입력 | mock `manualGrades` localStorage 갱신 + 학생 attempt 의 manualScores 객체 갱신 | `PATCH /api/attempts/:attemptId { grades: { questionId: score } }` 또는 ManualGrade 별도 `POST /api/manual-grades` | 학생/문항 점수 즉시 반영. 채점 완료 카운트 갱신 | ManualGrade (3.11), Attempt (`manualScore` 누적), Answer (`manualScore` 미러링) |
| D-5 | 자동채점 재실행 (정답 변경) | `regradeQuestionWithOption(quizId, question, option, oldQuestion)` mock | `POST /api/questions/:id/regrade { option, oldCorrectAnswer }` (서버 트랜잭션) | 응답: `{ changedAnswers, changedAttempts, regradedStudents }` 카운트. 영향받은 학생 점수 갱신 | Question, Answer (`autoScore`), Attempt (`autoScore`) |
| D-6 | scorePolicy 변경 | `recalculateScorePolicy(quizId, newPolicy)` mock | `PATCH /api/quizzes/:id { scorePolicy }` (조회 시 정책 적용. OD-CES-05 의존) | 학생 점수 표시 갱신 | Quiz (`scorePolicy`), Attempt (`scorePolicySnapshot` 정책 결정 의존) |
| D-7 | PDF 다운로드 (개인/일괄) | `printBulkAnswerSheets(quiz, students)` 클라이언트 jsPDF | 동일 (서버 PDF 생성도 옵션. 대량 학생 시 큐 권고) | 브라우저 다운로드 + Toast NOT-TOAST-14 | (해당 없음) |

**예상 권한 검증** (백엔드 권고)

- 모든 GET: `(instructor || admin || ta)` + 담당/할당 코스 권한
- 수동채점 (D-4): `(instructor || admin || ta)` + 채점 권한 비트
- 재채점 (D-5): `(instructor || admin)` 한정 (TA 제외)
- scorePolicy 변경 (D-6): `(instructor || admin)` 한정

**에러 응답 권고**

| **상황** | **HTTP** | **클라이언트 처리** |
|---|---|---|
| 채점 권한 없음 (학생/타 강사) | 403 | "권한이 없습니다" |
| 동시 채점 충돌 (CES-G-01) | 409 | "다른 채점자가 먼저 채점했습니다. 새로고침 후 다시 시도" |
| 재채점 트랜잭션 실패 | 5xx | "재채점 중 오류가 발생했습니다. 다시 시도해주세요" |

---

### SCR-I-REGRADE-OPTIONS. 재채점 옵션 선택 모달 (4종)

**구현 파일**: `src/components/RegradeOptionsModal.jsx`

**진입 조건**

발행된 퀴즈(`status !== 'draft'`) + 응시 1건 이상 + 정답/인정 답안 또는 채점 기준 변경 발생 시 (UX-P07-004). 응시자 0명 또는 정답 외 편집(본문/배점/피드백) 만인 경우 모달 미표시.

**레이아웃**

```
[Dialog (max-w-2xl)]
[DialogHeader]
  ├── DialogTitle "재채점 옵션 선택"
  └── DialogDescription "정답이 변경된 문항에 대해 재채점 방식을 선택하세요"

[Body]
  ├── 응시자 수 안내 박스 (bg-warning-bg/40 + border-warning-border)
  │    └── "이미 답안을 제출한 N명의 학생에 대한 재채점 옵션을 선택하십시오. 퀴즈 저장 시 일괄 재채점됩니다"
  └── 옵션 4종 (REGRADE_OPTIONS) - 라디오 버튼 카드
       ├── 1. 이전 정답과 수정된 정답 모두 인정 (award_both, success)
       │    └── "기존 점수가 낮아지지 않습니다. 새 정답에 맞는 학생에게 추가 점수 부여"
       ├── 2. 수정된 정답 기준으로만 재채점 (new_answer_only, warning)
       │    └── "새 정답 기준으로 자동 재채점. 일부 학생 점수가 낮아질 수 있음"
       ├── 3. 모든 학생에게 만점 부여 (full_points, primary)
       │    └── "이 문항에 응시한 학생 전원에게 만점 부여"
       └── 4. 재채점 없이 문제만 업데이트 (no_regrade, secondary)
            └── "문제 내용만 변경. 기존 채점 결과 유지"

[푸터]
  ├── 좌측: "이전" (ghost) → onCancel
  └── 우측: "옵션 적용" (default + 선택 옵션 색상) → onConfirm(selected)
```

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 ("수정" 클릭 + submittedCount > 0 + 정답 변경) | 모달 노출, 기본 선택 = `award_both` |
| I-2 | 옵션 카드 클릭 | `selected` state 갱신, isActive 시 border + bg 변경 |
| I-3 | "이전" 클릭 / 외부 클릭 | `onCancel` 호출 → AddQuestionModal 복귀 (SCR-03) |
| I-4 | "옵션 적용" 클릭 | `onConfirm(selected)` → 부모(QuizEdit) regradeMap[questionId] 저장 → AddQuestionModal 닫힘 |
| I-5 | 퀴즈 저장 ("저장하기") | regradeMap 각 항목별 mock 점수 재계산 (`recalculateScorePolicy`, `regradeQuestion`) |

**데이터 흐름**

RegradeOptionsModal 은 별도 fetch 없이 `selected` 옵션 결과만 부모(QuizEdit) 의 `regradeMap[questionId]` 에 전달. 실제 재채점은 SCR-I-GRADE-DASHBOARD 의 D-5 또는 SCR-02 D-4 의 "저장하기" 시점에 일괄 실행 (단일 트랜잭션 권고).

| **단계** | **트리거** | **호출** | **응답 처리** | **관련 엔티티** |
|---|---|---|---|---|
| D-1 | 모달 진입 | 없음 (옵션 4종 정적 표시) | `selected='award_both'` 기본값 | (해당 없음) |
| D-2 | "옵션 적용" | 부모 콜백 → `regradeMap[questionId] = option` | 모달 닫힘. 저장 시점에 D-5 (SCR-I-GRADE-DASHBOARD) 호출 | (저장 시점 트리거) |

---

### SCR-I-CONDITIONAL-RETAKE. 조건부 재응시 부여 모달 (3 step)

**구현 파일**: `src/components/ConditionalRetakeModal.jsx`

**레이아웃 (3 step)**

```
[Dialog (max-w-3xl)]
[DialogHeader]
  ├── DialogTitle "조건부 재응시 부여"
  └── DialogDescription "조건을 만족하는 학생들에게 자동으로 재응시 기회를 부여합니다"

[Step 1: 조건 입력]
  ├── 조건 종류 Switch
  │    ├── "미응시 학생 포함" (includeNotSubmitted)
  │    └── "점수 미달 학생 포함" (includeScoreBelow)
  ├── 점수 미달 활성 시: 점수 기준 입력
  │    ├── % 입력 (scoreThreshold, 0~100)
  │    └── 환산 점수 표시 ("{thresholdScore}점 / 만점 {totalPoints}점")
  └── 다음 단계 (조건 1개 이상 선택 시 활성)

[Step 2: 자동 선별 결과 검토]
  ├── 요약 카드
  │    ├── 미응시 대상자 N명
  │    ├── 점수 미달 대상자 M명
  │    └── 채점 미완료 영향 안내 (ungradedExcludedCount > 0 시 경고)
  ├── 학생 목록 (matchedStudents)
  │    ├── 이름 / 학번 / 선별 사유 (retakeReason)
  │    ├── 체크박스 (제외 토글, excludedIds Set)
  │    └── "제외" 표시
  ├── 최종 대상자 카운트 (finalTargets.length)
  └── 이전 / 다음

[Step 3: 횟수 / 기간 입력]
  ├── 추가 응시 횟수 (additionalAttempts, 기본 1)
  ├── 재응시 가능 기간 (retakeDeadline, DateTimePicker, 선택)
  ├── 최종 대상자 요약
  └── 이전 / "재응시 부여" 확정

[부여 완료]
  ├── localStorage `xnq_conditional_retakes` 기록
  └── Toast / 모달 닫힘 + onComplete
```

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | Step 1 조건 토글 | 미응시 / 점수 미달 / 조합 결정 |
| I-2 | 점수 기준 입력 | thresholdScore 환산 실시간 갱신 |
| I-3 | Step 2 학생 체크박스 | excludedIds Set 토글 |
| I-4 | 채점 미완료 학생 있음 | "채점 미완료 N명은 점수 미달 비교 대상에서 제외됨" 경고 |
| I-5 | Step 3 "재응시 부여" | localStorage 기록 + 부여 완료 |
| I-6 | 이전 step 이동 | 입력값 보존 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | Step 1 진입 | quiz + students 데이터는 부모(GradingDashboard) 에서 prop 전달 | 동일 | (해당 없음) | Quiz, Attempt |
| D-2 | Step 2 자동 선별 | 클라이언트 필터링 (미응시 / 점수 미달) | 동일 또는 `POST /api/quizzes/:id/conditional-retake/preview { criteria }` (서버 권고) | matchedStudents 리스트 + 사유 표시 | Attempt (`submitted`, `totalScore`) |
| D-3 | Step 3 "재응시 부여" | `localStorage.setItem('xnq_conditional_retakes', ...)` | `POST /api/quizzes/:id/conditional-retake { studentIds, additionalAttempts, retakeDeadline }` | 부여 완료 + Toast + 모달 닫힘. 영향: 해당 학생의 `allowAttempts` 개별 증가 (AssignmentPeriod 사용 권고) | AssignmentPeriod (3.5), Attempt |

**예상 권한 검증**: `(instructor || admin)` 한정.

---

### SCR-I-PRINT-ANSWER-SHEET. 개인 답안지 PDF

**구현**: 학생 상세 패널에서 진입 (별도 구현 여부 확인 — 현재는 일괄 답안지 PDF 한정).

**예외 상태 표시**

| **상태** | **표현** |
|---|---|
| 미제출 | "미제출" 표시 |
| 일부 미응답 | "미응답" 표시 |
| 채점 전 | "채점 전" 표시 |
| 첨부 답안 존재 | 별도 확보 안내 또는 PDF 포함 여부 |

**데이터 흐름**

| **단계** | **트리거** | **호출** | **응답 처리** | **관련 엔티티** |
|---|---|---|---|---|
| D-1 | 학생 패널 "답안지 PDF" 클릭 | 클라이언트 jsPDF 로 생성 (mock + api 공통) | 브라우저 다운로드 + Toast NOT-TOAST-14 | Attempt, Answer, ManualGrade |

---

### SCR-I-PRINT-BULK-ANSWER-SHEETS. 일괄 답안지 PDF

**구현**: `printBulkAnswerSheets(quiz, students)` (`src/utils/pdfUtils.js`)

**진입 동작**

```
1. 액션 메뉴 → "답안지 PDF 다운로드"
2. pdfGenerating state 진입 (로딩 표시)
3. PDF 생성 완료 → 다운로드
4. 완료 시 Toast 안내
```

**상태**

| **상태** | **표현** |
|---|---|
| 진행 중 | pdfGenerating=true. 액션 메뉴 disabled |
| 완료 | Toast 안내 |
| 부분 실패 | Toast "PDF 오류: {message}" + 분리 표시 (부분 충족, 간극 G-3) |
| 출력 권한 제한 | Canvas 권한 비트로 분기 (현재 instructor 단독) |

**데이터 흐름**

| **단계** | **트리거** | **호출** | **응답 처리** | **관련 엔티티** |
|---|---|---|---|---|
| D-1 | 액션 메뉴 "답안지 PDF 다운로드" | 클라이언트 `printBulkAnswerSheets(quiz, students)` (jsPDF) | pdfGenerating=true → 완료 시 다운로드 + Toast | Quiz, Attempt, Answer |
| D-1' | (대량 학생 시 권고) | `POST /api/quizzes/:id/bulk-pdf` 서버 큐 처리 → 완료 알림 또는 다운로드 링크 반환 | 클라이언트 polling 또는 알림 | Quiz, Attempt |

---

### SCR-I-LX-ACTIVITY-LINK. 학습활동현황 진입점

**구현**: 채점 대시보드의 학생 상세 패널 헤더에서 "학습활동현황으로 이동" 진입점.

**현재 프로토타입 동작**

진입점 구현 여부는 확인 필요. LearningX 통합은 Canvas 측에서 처리(`project_learningx_architecture.md`), xnquiz 측은 LX URL 구성 + 학생 ID 전달만 필요 → 간극 G-4.

**레이아웃 (목표 동작)**

```
[학생 상세 헤더]
  ├── 학생 이름 / 학번 / 상태
  └── 우측: "학습활동현황으로 이동" 진입점 (외부 링크 아이콘)
       └── 클릭 시 LX 화면 새 탭/창
```

**상태**

| **상태** | **표현** |
|---|---|
| 채점 권한 보유 + 학생 선택됨 | 진입점 노출 |
| 채점 권한 없음 | 진입점 숨김 |
| 학생 미선택 | 진입점 비활성 |
| LX 측 접근 거부 | LX 화면이 권한 거부 (Quiz 책임 아님) |

**데이터 흐름**

| **단계** | **트리거** | **호출** | **응답 처리** | **관련 엔티티** |
|---|---|---|---|---|
| D-1 | "학습활동현황으로 이동" 클릭 | LX URL 구성 (코스/학생 ID 쿼리) + `window.open(url, '_blank')` | 새 탭에서 LX 화면. 인증/권한은 LX 측 처리 | (외부 시스템) |

---

## 사용 컴포넌트 (DS Baseline 참조)

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `QuizInfoCard` / `StatCard` | `GradingDashboard/*` | 퀴즈 정보 + 통계 4종 |
| `QuestionItem` / `QuestionDetailPanel` | `GradingDashboard/*` | 문항 중심 모드 좌/우 |
| `StudentListPanel` / `StudentListItem` / `StudentDetailPanel` | `GradingDashboard/*` | 학생 중심 모드 좌/우 |
| `ResponsesTab` / `StatsTab` | `GradingDashboard/*` | 문항 중심 탭 |
| `AnswerCard` / `StudentRow` | `GradingDashboard/*` | 답안 / 학생 행 |
| `ActivityLogPanel` | `GradingDashboard/*` | 학생 활동 로그 |
| `CommentThread` | `GradingDashboard/*` | 코멘트 (텍스트 중심) |
| `ExcelModal` | `GradingDashboard/ExcelModal.jsx` | 엑셀 export |
| `RegradeOptionsModal` | `src/components/RegradeOptionsModal.jsx` | 재채점 옵션 (4종) |
| `ConditionalRetakeModal` | `src/components/ConditionalRetakeModal.jsx` | 조건부 재응시 (3 step) |
| `EmptyState` | `GradingDashboard/EmptyState.jsx` | 임시저장 / 미제출자 0명 빈 상태 |
| `DropdownMenu` (full) | shadcn | 액션 메뉴 |
| `DropdownSelect` | `src/components/DropdownSelect.jsx` | 정렬 / 모드 토글 |
| `Button` (shadcn) | — | 모드 탭 / 액션 버튼 |
| `Dialog` 외 (shadcn) | — | 재채점 / 조건부 재응시 모달 |
| `Switch` (shadcn) | — | 조건부 재응시 조건 |
| `Skeleton` (shadcn) | — | 로딩 (GradingDashboardSkeleton) |
| `Toast` (shadcn) | — | PDF 결과 / 채점 저장 |
| `DateTimePicker` (내부) | — | 조건부 재응시 기간 |
| `printBulkAnswerSheets` / `printQuizQuestions` | `src/utils/pdfUtils.js` | PDF 생성 |
| Lucide icons | — | 액션 / 단계 / 외부 링크 등 |

---

## 4. 반응형 분기

| **디바이스** | **너비** | **레이아웃 변화** |
|---|---|---|
| 모바일 | ~767px | split-pane 비활성. `mobileView` state 로 좌/우 토글. aside hidden, main 전폭. 모달 전폭 |
| 태블릿 | 768~1023px | split-pane 활성. aside w-72, main flex-1. Dialog max-w-xl |
| 데스크톱 | 1024px~ | split-pane. aside lg:w-80, main flex-1, 카드 통계 4열. Dialog max-w-2xl/3xl |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | fetch 중 | GradingDashboardSkeleton |
| 빈 상태 (임시저장 진입) | quiz.status === 'draft' | EmptyState - "응시 미개시" + 편집 진입 |
| 빈 상태 (응시자 0명) | attempts 0건 | EmptyState - "응시 데이터가 아직 없습니다" |
| 빈 상태 (채점 완료 0명, 통계) | 수동채점 + 미채점만 | StatsTab 내 빈 상태 카피 |
| 빈 상태 (조건부 재응시 대상자 0명) | matchedStudents 0건 | Step 2 빈 상태 "조건에 맞는 학생이 없습니다" |
| 에러 (퀴즈 없음) | quiz === null | AlertCircle + 목록 링크 |
| 에러 (PDF 생성 실패) | printBulkAnswerSheets throw | Toast "PDF 오류: {message}" + console.error |
| 에러 (점수 입력 범위 밖) | 입력값 < 0 또는 > 배점 | 저장 차단 + 허용 범위 안내 카피 |
| 에러 (빈 값 저장) | 점수 빈 칸 + blur | 미채점 전환 안내 |
| 에러 (재채점 실행 실패, API 모드) | API 모드 미구현 | mock 모드 한정. API 모드 별도 endpoint 필요 → 간극 G-3 |
| 권한 없음 | role !== 'instructor' | `<Navigate to="/" replace />` |
| 오프라인 | API 모드 한정 | mock 모드 해당 없음 |
| 자동 0점 처리 안내 | 마감 후 미응시자(startTime 없음) | StudentListItem 배지 + StatCard 분모 포함 (메모리 `project_grading_aggregation_policy.md`) |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 관점 전환 시 선택 맥락 유지 (URD-025 UX-P07-002) | (B) URD 완화 | URD-025 v0.3 정정 완료 — "현재 선택 상태 명확화" 표현 유지 |
| G-2 | 자동 0점 예외 인정 / 원복 (URD-025 UX-P07-062) | (B) URD 완화 | URD-025 v0.3 정정 완료 — "향후 작업" 명시 |
| G-3 | API 모드 재채점 실행 (URD-022) | (B) 백로그 | mock 모드는 `recalculateScorePolicy` / `regradeQuestion` 처리. API 모드는 서버 엔드포인트 미구현 |
| G-4 | 학습활동현황 진입점 구현 (URD-019 UX-P07-001~003) | (A) 후속 구현 | URL 구성 + 진입점 추가 필요. Sprint 4 후보 |
| G-5 | 학생 측 재응시 기회 명시 안내 (URD-011 UX-P08-001~003) | (B) C 분류 후속 | localStorage 기록은 있으나 학생 응시 화면 명시 표시 미구현. SCR-09 측 카피 추가 |
| G-6 | 일괄 답안지 부분 실패 분리 표시 (URD-009 UX-P05-002) | (A) 부분 충족 | Toast 안내만. 분리 표시 모달 미구현 |
| G-7 | 코멘트 첨부/미디어 (URD-025 UX-P08-001 후속) | (B) 후속 | URD 자체가 후속 확장. 현재 SSD 텍스트 중심만 |
| G-8 | 코멘트 수정/삭제 이력 (URD-025 UX-P07-072) | (B) URD 완화 | URD-025 v0.3 — "향후 작업" 명시 |
| G-9 | 채점자(P-09) / TA(P-03) / 운영자(P-05) 권한 분기 | (A) 충족 | Canvas 권한 비트 위임 (공통 권한 가이드 참조) |
| G-10 | 정답 포함 여부 옵션 (URD-009 UX-P07-005) | (B) 정책 미확정 | 운영 정책 확정 후 반영 |
| G-11 | random_group placeholder 채점 시 풀 평면화 미구현 | **(B) 코드 갭** | `GradingDashboard/index.jsx` 가 `getQuizQuestions` 결과를 그대로 사용 (expand 안 함). random_group placeholder 문항이 있으면 채점 대시보드에서 placeholder ID 가 그대로 노출되거나 답안 매핑이 어긋남. SCR-07 처럼 `expandAllForInstructor(items)` 호출 후 `getRecipientStudents(q, students)` 로 학생별 응답 매핑 필요. **Phase 2 우선 후보** |
| G-12 | random_group 재채점 범위 결정 | **(B) 정책 미확정** | RegradeOptionsModal 의 "이번 시도/전체 응시자" 옵션이 풀 문항에 적용될 때 "출제된 학생만" / "풀 전체 후보 문항 일괄" 중 어느 범위인지 PD 결정 필요 |
| G-13 | random_group 조건부 재응시 시 시드 처리 | **(B) 정책 미확정** | ConditionalRetakeModal 로 재응시 부여 시 동일 학생이 새 시드(`${studentId}_${quizId}_attemptN`?)로 다른 문항을 받을지, 동일 시드 유지할지 결정 필요. 재응시 정책 정합성 확인 |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-16 | v1.4 | random_group placeholder 처리 갭 명시. GradingDashboard 가 현재 `expandAllForInstructor` 미호출 → 채점 시 placeholder ID 노출 / 답안 매핑 어긋남 위험. 간극 G-11 (풀 평면화 미구현, Phase 2 우선), G-12 (재채점 범위 정책), G-13 (조건부 재응시 시드 처리 정책) 추가. SCR-03 v1.3 / SCR-07 v1.4 와의 정합성 확보를 위한 추가 작업 표시. | 김민주 (Creator/PD) |
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 6 화면(GRADE-DASHBOARD/REGRADE-OPTIONS/CONDITIONAL-RETAKE/PRINT-ANSWER-SHEET/PRINT-BULK/LX-ACTIVITY-LINK) 각각에 데이터 흐름 절 추가. GRADE-DASHBOARD 본체에 D-1~D-7 7단계 + 권한 검증 + 에러 응답 권고 포함. 데이터 사전 v0.1 엔티티 매핑 | 김민주 (Creator/PD) |
