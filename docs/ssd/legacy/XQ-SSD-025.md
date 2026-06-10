# XQ-SSD-025. 채점 대시보드·미제출 자동 처리·코멘트 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-025 의 UX 요건을 채점 대시보드(`/quiz/:id/grade`) 의 현재 프로토타입 기준으로 명세. 산출 식/모집단 정의는 XQ-SSD-026 과 단일화. 재채점 본체는 XQ-SSD-022, 시험 상세는 XQ-SSD-018 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-025-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-025](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081137159) v1.0 |
| 참조 FRD | XQ-FRD-025 |
| 참조 DS Baseline | LearningX DS Baseline 미확정 |
| 참조 코드 | `src/pages/GradingDashboard/*` (index.jsx, QuizInfoCard, StudentListPanel, QuestionItem, QuestionDetailPanel, StudentDetailPanel, ActivityLogPanel, CommentThread, AnswerCard, ResponsesTab, StatsTab, ExcelModal, EmptyState, utils.js) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈 → 퀴즈 목록 → 카드 메뉴 → "채점" → /quiz/:id/grade
                                      ├ mode=question (기본, 문항 중심)
                                      │  ├ 좌측: 문항 목록
                                      │  ├ 중앙: 학생 목록 (선택 문항의 응시자)
                                      │  └ 우측: 문항 상세 패널 (응답/통계 탭)
                                      └ mode=student (학생 중심, ?mode=student)
                                         ├ 좌측: 학생 목록
                                         └ 우측: 학생 상세 패널 (전체 문항 답안 + 활동 로그 + 코멘트)

핵심 태스크 클릭 뎁스:
- 채점 시작: 퀴즈 목록 → 카드 메뉴 → 채점 (3단계)
- 학생 중심 전환: 채점 대시보드 → "학생 중심" 탭 (4단계)
- 학생 답안 코멘트: 채점 → 학생 선택 → 코멘트 작성 (5단계)

학생 (student):
홈 → 퀴즈 카드 → (성적 공개 정책 허용 시) 본인 결과 + 코멘트 확인
  (학생 측 화면은 본 SSD 범위 외 — 별도 결과 확인 화면 SSD 에서 다룸)
```

**도달 원칙 (프로토타입 동작 기준)**

- 모드 분기는 URL 쿼리(`?mode=student`) + state. 모드 전환 시 선택 상태는 모드별 독립 (선택 학생/문항 맥락 유지 안 됨 — UX-P07-002 부분 미충족, 간극).
- 최초 로드 시 첫 번째 문항 자동 선택 (UX-P07-012 의 "명시적 미선택 / 첫 미채점 학생 이동" 중 후자 채택).
- 임시저장(`status === 'draft'`) 퀴즈는 채점 진입 시 EmptyState 안내 + 편집 진입 링크 (UX-P07-003).
- 자동 0점 처리: `startTime` 없는 미시작자는 `unsubmittedStudents` 로 분류. 마감 후 자동 0점 정책 (메모리 `project_grading_aggregation_policy.md` 기준).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-GRADE-DASHBOARD | 채점 대시보드 (모드 분기 포함) | `/quiz/:id/grade` | 교수자 | UX-P07-001~003/010~013/020~022/030/031/040~043/050~054/060~062/070~072, UX-P05-001/002 | P0 |

> 본 SSD 는 단일 라우트 1개 화면을 모드/영역으로 분기해 명세. 각 영역은 §3 안에서 서브 섹션으로 다룸.

---

## 3. 화면별 상세 설계

### SCR-I-GRADE-DASHBOARD. 채점 대시보드

**구현 파일**: `src/pages/GradingDashboard/*`

**목적**

교수자/채점자가 통합 채점 정보(응시율 / 채점 완료 / 응시 기간 / 성적 공개 정책) 를 인지하고, 문항 중심 ↔ 학생 중심 관점을 전환하며 점수/가감점/코멘트를 일관 흐름으로 처리.

**레이아웃 (정상 상태)**

```
[퀴즈 정보 카드 (QuizInfoCard)]
  ├── 상단 배지 행: 상태 + 주차/차시 + 응시 기간 표시
  ├── 시험 제목 (h1)
  └── 통계 4종 (StatCard × 4)
       ├── 응시율 (응시 시작 학생 / 전체 수강생)
       ├── 응시 인원
       ├── 채점 완료 (분모 = 전체 수강생, 마감 후 미시작자 자동 0점 반영)
       └── 평균 점수 (선택, 채점 완료 학생 기준)

[액션 바]
  ├── 좌측: 모드 탭 (문항 중심 / 학생 중심)
  └── 우측: DropdownMenu (PDF 다운로드 / 엑셀 export / 조건부 재응시 일괄 부여)
       └── DropdownMenuItem
            ├── 문제지 PDF 다운로드
            ├── 답안지 PDF 다운로드 (응시자 분)
            ├── 엑셀 답안 다운로드 (ExcelModal)
            └── 조건부 재응시 부여 (ConditionalRetakeModal)

[split-pane 본문 (모드별 분기)]

  [mode=question (문항 중심)]
    [좌측 aside (w-72 lg:w-80)]
      ├── 정렬 드롭다운 (미채점 우선 / 문항 순)
      ├── 문항 목록 (QuestionItem × N)
      │    ├── 문항 번호 + 유형 배지 + 배점
      │    ├── 본문 요약 (line-clamp)
      │    └── 진행 막대 (gradedCount / totalCount, 색상 분기)
      └── 완료 문항 접기 토글 (collapsedGraded)
    [우측 main (flex-1)]
      ├── 선택 문항 헤더 (문항 번호 + 유형 + 배점)
      ├── 탭 (응답 / 통계)
      ├── [응답 탭 (ResponsesTab)]
      │    ├── 학생 검색 (이름 / 학번)
      │    └── 학생 목록 카드 (StudentRow × N, 각 카드에 답안 + 점수 입력)
      └── [통계 탭 (StatsTab)]
           ├── 평균 / 최고 / 최저 / 정답률 (모집단 = 채점 완료 학생, XQ-SSD-026 단일화)
           ├── 인라인 통계 카드 (수동채점: 채점 완료 인원 기준 / 자동채점: 전체 응시 기준)
           └── 빈 상태: 채점 완료 0명 시 "수치 대신 빈 상태"

  [mode=student (학생 중심)]
    [좌측 aside]
      ├── 학생 검색 (이름 / 학번)
      ├── 그룹 분기 (제출 학생 / 미제출 학생 자동 0점 포함)
      └── 학생 카드 (StudentListItem × N)
           ├── 이름 + 학번
           ├── 상태 배지 (정상 제출 / 지각 제출 / 미제출 / 자동 0점 / 예외 인정 / 재응시 보류)
           └── 점수 / 채점 완료 표시
    [우측 main]
      └── 학생 상세 패널 (StudentDetailPanel)
           ├── 학생 기본 정보 (이름 + 학번 + 상태)
           ├── 점수 영역
           │    ├── 자동채점 점수 + 수동 수정 점수
           │    ├── 학생별 가산점 / 감점 입력
           │    └── 총점 반영 안내
           ├── 문항별 답안 (AnswerCard × N)
           │    ├── 답안 + 점수 입력 (0 ~ 배점)
           │    ├── 자동채점 결과 + 수동 수정 상태 배지
           │    ├── 부분정답 배지 (해당 시)
           │    └── 변경된 답안 우선 처리 배지 (재채점 대상)
           ├── 활동 로그 (ActivityLogPanel)
           └── 코멘트 (CommentThread)
```

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `QuizInfoCard` | `src/pages/GradingDashboard/QuizInfoCard.jsx` | 퀴즈 기본 정보 카드 |
| `StatCard` | `src/pages/GradingDashboard/StatCard.jsx` | 응시율 / 인원 / 채점 완료 / 평균 |
| `Button` | shadcn | 모드 탭, 액션 버튼 |
| `DropdownMenu` (full) | shadcn | 액션 메뉴 (PDF / 엑셀 / 재응시) |
| `DropdownSelect` | `src/components/DropdownSelect.jsx` | 정렬 / 모드 토글 |
| `QuestionItem` / `QuestionDetailPanel` | `src/pages/GradingDashboard/*` | 문항 중심 모드 좌측/우측 |
| `StudentListPanel` / `StudentListItem` / `StudentDetailPanel` | `src/pages/GradingDashboard/*` | 학생 중심 모드 좌측/우측 |
| `ResponsesTab` / `StatsTab` | `src/pages/GradingDashboard/*` | 문항 중심 우측 탭 |
| `AnswerCard` / `StudentRow` | `src/pages/GradingDashboard/*` | 답안 카드 / 학생 행 |
| `ActivityLogPanel` | `src/pages/GradingDashboard/*` | 학생 중심 활동 로그 |
| `CommentThread` | `src/pages/GradingDashboard/*` | 코멘트 작성/표시 (텍스트 중심) |
| `ExcelModal` | `src/pages/GradingDashboard/ExcelModal.jsx` | 엑셀 export |
| `ConditionalRetakeModal` | `src/components/ConditionalRetakeModal.jsx` | 조건부 재응시 부여 |
| `EmptyState` | `src/pages/GradingDashboard/EmptyState.jsx` | 임시저장 / 미제출자 0명 등 빈 상태 |
| `Skeleton` | shadcn | 로딩 (GradingDashboardSkeleton 자체 구성) |
| `Toast` | shadcn | PDF 생성 결과 / 채점 저장 알림 |

**인터랙션 (주요)**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (`/quiz/:id/grade`) | quiz / questions / attempts 3건 병렬 fetch. 로딩 중 Skeleton |
| I-2 | 임시저장 퀴즈 진입 (`status === 'draft'`) | EmptyState 안내 + 편집 페이지 진입 링크 (UX-P07-003) |
| I-3 | 모드 탭 클릭 | `gradingMode` 갱신. URL 쿼리 동기화 (`?mode=student`). 모드별 selected 상태 유지 (서로 독립) |
| I-4 | 문항 클릭 (mode=question) | `selectedQ` 갱신. 우측 패널 응답 탭으로 |
| I-5 | 문항 정렬 변경 | `sortBy` 갱신 (미채점 우선 / 문항 순). 채점 완료 문항은 접힘(접기 토글) 가능 |
| I-6 | 응답 탭 - 학생 행 점수 입력 | 0~배점 범위 검증. 범위 밖 입력 시 저장 안 되고 안내 (UX-P07-040/041). 빈 값 저장 시 미채점 상태 전환 안내 (UX-P07-042) |
| I-7 | 통계 탭 클릭 | 평균/최고/최저/정답률 표시. 모집단 = 채점 완료 학생 (XQ-SSD-026 단일화). 채점 완료 0명 시 EmptyState |
| I-8 | 학생 클릭 (mode=student) | `selectedStudent` 갱신. 우측 학생 상세 패널 표시. URL `?studentId=` 동기화 |
| I-9 | 학생 상세 - 가산점/감점 입력 | `manualScores` 갱신. 총점 반영 안내. 0점은 표시 생략 (UX-P07-043) |
| I-10 | 코멘트 작성 (CommentThread) | 텍스트 입력. 성적 공개 정책에 따라 학생 노출 시점 결정. 1차 범위 텍스트 중심 (UX-P08-001 첨부/미디어 후속) |
| I-11 | 액션 메뉴 - PDF 다운로드 | pdfGenerating 상태로 진입. 완료 시 Toast |
| I-12 | 액션 메뉴 - 엑셀 답안 | ExcelModal 오픈 |
| I-13 | 액션 메뉴 - 조건부 재응시 | ConditionalRetakeModal 오픈. 자동 0점 학생 재응시 부여 시 자동 0점 결과 보류 (UX-P07-061) |
| I-14 | 채점 저장 (점수 입력 → blur) | `localStorage` 의 `xnq_quiz_grades_v1` 키 갱신. `gradeVersion` 증가 → 진행 막대 실시간 반영 |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 로딩 | 초기 fetch 중 | GradingDashboardSkeleton 전체 노출 |
| 퀴즈 없음 | quiz fetch 결과 null | AlertCircle + "퀴즈를 찾을 수 없습니다" + 목록 링크 |
| 임시저장 진입 | quiz.status === 'draft' | EmptyState - 응시 미개시 안내 + 편집 진입 (UX-P07-003) |
| 응시자 0명 | quizStudents 길이 0 | EmptyState - "응시 데이터가 아직 없습니다" |
| 문항 미선택 (mode=question) | selectedQ 없음 | 최초 로드 시 첫 문항 자동 선택. 사용자 수동 해제는 미구현 (UX-P07-012 첫 미채점 자동 선택 패턴 채택) |
| 채점 완료 0명 (통계 탭) | 수동채점 문항 + 채점 학생 0명 | StatsTab 안에서 수치 대신 빈 상태 (UX-P07-052) |
| 일부 채점된 문항 통계 | gradedCount > 0 && < totalCount | "채점 완료 N명 / 전체 M명" 동시 표시 → 평균/득점률이 진행 중 값임 안내 (UX-P07-053) |
| 자동 0점 학생 | startTime 없음 + 마감 경과 | StudentListItem 에 "자동 0점" 배지. 점수 0 표기 |
| 재응시 보류 | 재응시 부여 + 자동 0점 대상 | StudentListItem 에 "재응시 보류" 배지 (UX-P07-061) |
| 변경된 답안 | 학생 측 답안 변경 후 재채점 대상 | AnswerCard 에 "변경된 답안" 우선 처리 배지 (UX-P07-022) |

---

## 4. 반응형 분기

| **디바이스** | **너비** | **레이아웃 변화** |
|---|---|---|
| 모바일 | ~767px | split-pane 비활성. `mobileView` state 로 좌/우 토글 (questions / detail). aside hidden, main 전폭 |
| 태블릿 | 768~1023px | split-pane 활성. aside w-72, main flex-1 |
| 데스크톱 | 1024px~ | split-pane. aside lg:w-80, main flex-1, 카드 통계 4열 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | fetch 중 | GradingDashboardSkeleton (퀴즈 정보 + 액션 바 + split-pane placeholder) |
| 임시저장 진입 | quiz.status === 'draft' | EmptyState - "응시 미개시" + 편집 진입 링크 |
| 퀴즈 없음 | quiz === null | AlertCircle + "퀴즈를 찾을 수 없습니다" + 목록 링크 |
| 응시자 0명 | attempts 0건 | EmptyState - "응시 데이터가 아직 없습니다" |
| 채점 완료 0명 (통계) | 수동채점 문항 + 미채점만 | StatsTab 내 빈 상태 카피 (UX-P07-052) |
| 자동 0점 처리 안내 | 마감 후 미시작자 | StudentListItem 배지 + StatCard 의 채점 완료 분모에 포함 (메모리 `project_grading_aggregation_policy.md`) |
| 점수 입력 범위 밖 | 입력값 < 0 또는 > 배점 | 저장 차단 + 허용 범위 안내 카피 (UX-P07-041) |
| 빈 값 저장 | 점수 빈 칸 + blur | 미채점 상태 전환 — 저장 전 안내 (UX-P07-042) |
| PDF 생성 실패 | `printQuizQuestions` / `printBulkAnswerSheets` throw | Toast 에러 표시 + console.error |
| 권한 없음 (학생 직접 URL) | role !== 'instructor' | `<Navigate to="/" replace />` |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 관점 전환 시 선택 맥락 유지 (UX-P07-002) | (B) URD 완화 | **URD-025 v0.3 정정 완료** (2026-06-05) — "현재 선택 상태 명확화" 표현 유지 |
| G-2 | 학생 목록 명시적 미선택 상태 (UX-P07-012) | (B) URD 완화 | **URD-025 v0.3 정정 완료** (2026-06-05) — "첫 미채점 학생 자동 선택, 명시적 미선택은 향후 검토" 로 완화 |
| G-3 | 자동 0점 예외 인정 / 원복 (UX-P07-062) | (B) URD 완화 | **URD-025 v0.3 정정 완료** (2026-06-05) — "향후 작업" 명시 |
| G-4 | 코멘트 수정/삭제 이력 (UX-P07-072) | (B) URD 완화 | **URD-025 v0.3 정정 완료** (2026-06-05) — "향후 작업" 명시 |
| G-5 | 채점자(P-09) 권한 분기 | (B) URD 완화 | **URD-025 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-6 | 운영자(P-05) 통계 모집단 확인 (UX-P05-002) | (A) 부분 충족 | **URD-025 v1.0 권한 위임 명시 완료** (2026-06-05). 통계 모집단 단일화는 SSD-026 에서 처리 |
| G-7 | 코멘트 첨부/미디어 (UX-P08-001 후속) | (B) URD 완화 | URD 자체가 후속 확장으로 명시. 본 SSD 텍스트 중심만 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-1~G-5/G-6 URD-025 정정 완료 반영 (v0.3/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
