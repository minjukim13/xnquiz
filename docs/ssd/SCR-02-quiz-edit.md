# SCR-02. 시험 작성·편집 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 시험 생성/편집(`/quiz/new`, `/quiz/:id/edit`) 의 2탭 흐름(시험 설정 / 문항 추가) + 게시 직전 확인 모달 + 응시 보안 섹션 본체. 학생 측 응시 진입 전 안내(notice) / PreflightGate 는 SCR-09 위임. 문항 작성 모달 본체는 SCR-03 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-02-v1.4 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-008](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076418585) v1.0, [XQ-URD-021](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081628677) v1.0, [XQ-URD-021-B](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081759746) v1.0 (교수자 부분) |
| 참조 코드 | `src/pages/QuizCreate.jsx`, `src/pages/QuizEdit.jsx`, `src/components/StepIndicator.jsx`, `src/components/PublishReviewModal.jsx`, `src/components/AssignmentOverrides.jsx`, `src/components/quiz-form/*`, `src/utils/randomGroups.js` (`isRandomGroup`, `summarizeQuizItems`) |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
시험 목록(SCR-01)
├── "새 시험" → /quiz/new (SCR-02)
│                ├── 탭 1: 시험 설정 (9 Section 운영 설정)
│                └── 탭 2: 문항 추가 (3 진입점)
└── 카드 메뉴 → "편집" → /quiz/:id/edit (SCR-02, 동일 흐름)
                          │
                          └── "저장하기" → PublishReviewModal (게시 직전 종합 확인 9항목)
                                ├── "돌아가서 수정" → 시험 설정 탭 복귀
                                └── "이대로 공개" → status=open 저장 → SCR-01 복귀

학생 (student):
본 화면 접근 권한 없음. 직접 URL 진입 시 `<Navigate to="/" replace />`.

핵심 태스크 클릭 뎁스:
- 신규 시험 작성 + 게시: 시험 목록 → 새 시험 → 저장하기 → 이대로 공개 (4단계)
- 신규 임시저장: 시험 목록 → 새 시험 → 임시저장 (3단계)
- 기존 편집 + 재게시: 시험 목록 → 카드 메뉴 → 편집 → 저장하기 → 공개 (5단계)
```

**도달 원칙**

- 두 탭 간 이동 자유. StepIndicator 의 버튼 클릭으로 어느 방향으로든 전환 가능 (강제 순차 잠금 없음).
- 종합 확인(PublishReviewModal) 은 저장하기 클릭 시 자동 노출. 누락/오설정 발견 시 "돌아가서 수정" 으로 무손실 복귀.
- 임시저장은 종합 확인을 거치지 않고 즉시 저장 (제목만 입력하면 가능). 임시저장 상태는 학생 자동 비공개.
- 응시 보안 옵션은 시험 설정 탭의 Section 6 안에 통합 (보안/감독 본체 = 본 SSD 단독 명세).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트 / 진입** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-EDIT-INFO | 시험 설정 탭 (9 Section 운영 설정) | `/quiz/new` `/quiz/:id/edit` (tab=info) | 교수자 | UX-P07-001~003/010~012/020~023/030~032/040/050~051 (URD-008/021) | P0 |
| SCR-I-EDIT-SECURITY | 응시 보안 및 감독 Section (Section 6 본체) | Section 6 영역 | 교수자 | UX-P07-001~003/010/011/020/021/030/031/040 (URD-021-B) | P0 |
| SCR-I-EDIT-QUESTIONS | 문항 추가 탭 (3 진입점) | `/quiz/new` `/quiz/:id/edit` (tab=questions) | 교수자 | UX-P07-001/002/003/020/021/022 (URD-008) | P0 |
| SCR-I-PUBLISH-REVIEW | 게시 직전 종합 확인 모달 | 저장하기 클릭 시 모달 | 교수자 | UX-P07-060/061 (URD-021) | P0 |

---

## 3. 화면별 상세 설계

### SCR-I-EDIT-INFO. 시험 설정 탭 (9 Section 운영 설정)

**구현 파일**: `src/pages/QuizCreate.jsx`, `QuizEdit.jsx` (InfoTab 함수)

**목적**

교수자가 시험의 운영 조건(제목·기간·정책·보안·접근 제한) 9 영역을 입력. StepIndicator 로 시험 설정 ↔ 문항 추가 단계 인지.

**레이아웃 (graded 모드 기준)**

```
[헤더]
  └── h1 "새 퀴즈 만들기" / "퀴즈 편집"

[StepIndicator]
  ├── ① 시험 설정 (현재 위치, 활성 강조)
  └── ② 문항 추가 (다음 단계, 약하게 / 완료 시 체크)
  + 활성 탭 설명 박스 (현재 탭의 label + desc 항상 표시)
  + 미완료 시 requirement 카피 (예: "퀴즈 제목을 입력해주세요")

[본문: InfoTab - Section 카드 9종]
  ├── Section 1. 퀴즈 유형 (평가용 / 연습용)
  ├── Section 2. 기본 정보 (제목 required / 설명 / 평가 그룹 graded만 / 주차·차시)
  ├── Section 3. 응시 기간 (시작 / 마감 / 이용 종료 / 지각 제출 Toggle + 지각 마감)
  ├── Section 4. 추가 기간 (AssignmentOverrides - 학생별 부여)
  ├── Section 5. 응시 설정 (시간 제한 + 자동 제출 5분 유예 / 재응시 횟수+점수 정책 / 셔플 / 한 문항씩)
  ├── Section 6. 응시 보안 및 감독 → SCR-I-EDIT-SECURITY
  ├── Section 7. 성적 공개 (Toggle + 범위 + 시점 + 1회 조회)
  ├── Section 8. 응시 전 안내사항 (Toggle + textarea)
  └── Section 9. 퀴즈 공개 여부 (Switch, "임시저장은 자동 비공개" 안내)

[푸터: 상단 border-t]
  ├── 좌측: "취소" (ghost)
  └── 우측: "임시저장" (outline) + "저장하기" (primary)
```

**퀴즈 유형(quizMode)별 조건부 노출**

| **Section** | **평가용 (graded)** | **연습용 (practice)** |
|---|---|---|
| Section 2 평가 그룹 (assignmentGroupId) | 노출 | 숨김 (성적 미반영) |
| Section 7 성적 공개 정책 | 노출 | **노출** |
| 성적표 반영 정책 (gradebookPolicy) | 노출 | 숨김 (성적표 미기록) |

- 성적 공개 정책은 연습용 퀴즈에서도 응시 결과(점수 · 정오답 ✓/✗ · 정답)를 학생에게 공개할지, 어느 시점에 공개할지를 정하므로 두 유형 모두에서 노출한다.
- `scoreReveal*` 필드는 `quizMode` 와 무관하게 항상 저장(`buildQuizBody`)되며, 게시 직전 종합 확인 모달의 9번 항목(성적 공개 정책)도 두 유형 모두 표시한다.
- 평가 그룹 선택과 성적표 반영 정책은 성적에 반영되는 평가용에서만 의미가 있어 연습용에서는 숨긴다.

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `StepIndicator` (내부) | 2단계 탭 + desc + requirement 카피 |
| `Section` / `Field` / `Toggle` (내부) | 설정 항목 그룹 |
| `CustomSelect` (내부) | 평가 그룹 / 점수 정책 / 제출 횟수 |
| `DateTimePicker` (내부) | 시작 / 마감 / 이용 종료 / 지각 마감 / 성적 공개 기간 |
| `WeekSessionPicker` (내부) | 주차 / 차시 |
| `AssignmentOverrides` (내부) | 학생별 추가 기간 |
| `SecuritySection` (내부) | Section 6 본체 (SCR-I-EDIT-SECURITY) |
| `Button` (shadcn) | 취소 / 임시저장 / 저장하기 |
| `ConfirmDialog` / `AlertDialog` (내부) | 작성 취소 확인 / 검증 실패 안내 |
| `PublishReviewModal` (내부) | 저장하기 클릭 시 종합 확인 |
| `Tooltip` / `Popover` (shadcn) | 마감 / 이용 종료 / 자동 제출 유예 보조 안내 |
| `Skeleton` (shadcn) | QuizEdit 초기 로딩 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 학생 직접 URL 진입 | `<Navigate to="/" replace />` |
| I-2 | StepIndicator "문항 추가" 클릭 | `tab='questions'` 전환 (잠금 없음) |
| I-3 | "취소" 클릭 (hasChanges) | ConfirmDialog "작성 중인 내용이 있습니다" → 확인 시 `/` |
| I-4 | "임시저장" 클릭 | 제목 미입력 → AlertDialog. 입력됐으면 `persistQuiz('draft')` + 학생 자동 비공개 안내 |
| I-5 | "저장하기" 클릭 | `getValidationErrors()` 첫 에러 → AlertDialog. 통과 → PublishReviewModal 오픈 |
| I-6 | 재응시 횟수 ≥ 2 | "점수 정책" Field 자동 노출 (`allowAttempts >= 2`) |
| I-7 | 시간 제한 무제한 토글 ON | "자동 제출 5분 유예" Toggle 비활성 |
| I-8 | 자동 제출 5분 유예 ON + lockDate 미설정 | 저장하기 검증 실패 → AlertDialog "이용 종료 일시 필수" |
| I-9 | 마감 일시 < 이용 종료 일시 | warning 박스 ("마감 전 접근 차단 가능") — 저장 가능 (소프트) |
| I-10 | 지각 제출 Toggle ON | 지각 마감 Field 노출 (`min=dueDate`). 미입력 시 "무제한 허용" 안내 |

**상태 (StepIndicator)**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 현재 위치 | `tab === 'info'` | ①번 강조 (bg-accent, 숫자 원 primary) |
| 완료 단계 | `form.title` 입력됨 | ①번 체크 마크 (다른 탭에서 가시) |
| 미완료 (활성 + 보완 필요) | tab=info + 제목 빈 값 | desc 박스에 requirement 카피 ("퀴즈 제목을 입력해주세요", warning-foreground) |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | `/quiz/new` 진입 | `listCourses()` + `ASSIGNMENT_GROUPS` 상수 | `GET /api/courses` + `GET /api/assignment-groups?courseId=:id` | 코스/그룹 옵션 채움. form state 초기화 (default 9 Section) | Course, AssignmentGroup |
| D-2 | `/quiz/:id/edit` 진입 | `getQuiz(id)` + `getQuizQuestions(id)` | `GET /api/quizzes/:id` + `GET /api/quizzes/:id/questions` | 기존 값으로 form state 채움 | Quiz (3.4 전체), Question |
| D-3 | "임시저장" 클릭 | `createQuiz({ ...form, status: 'draft' })` + `setQuizQuestions(newId, qs)` (신규) / `updateQuiz(id, form)` (편집) | `POST /api/quizzes` / `PATCH /api/quizzes/:id` (body: <code>toApiQuizBody</code>) | AlertDialog NOT-TOAST-02. 신규는 새 id 부여 후 편집 모드로 전환 가능 | Quiz |
| D-4 | "저장하기" → "이대로 공개" | `createQuiz({ ...form, status: 'open' })` + `setQuizQuestions` / `updateQuiz(id, { ...form, status: 'open' })` + `setQuizQuestions(id, qs)` | `POST /api/quizzes` + `PUT /api/quizzes/:id/questions` / `PATCH /api/quizzes/:id` + `PUT /api/quizzes/:id/questions` | 시험 목록 복귀. 응시자 보유 + 정답 변경 시 SCR-06 RegradeOptionsModal 자동 분기 | Quiz, Question |

**예상 권한 검증** (백엔드 권고): `(instructor || admin)` 한정. `PATCH/PUT` 시 `quiz.createdBy === currentUser.id || isAdmin` 또는 코스 권한 비트로 분기. CES-D-01 (응시자 보유 시 편집 제한) 검증 필요.

**에러 응답 권고**

| **상황** | **HTTP** | **클라이언트 처리** |
|---|---|---|
| 필수 필드 누락 | 400 | AlertDialog NOT-TOAST-15 |
| 응시자 보유 + 정답 변경 (no_regrade 옵션 미지정) | 409 | RegradeOptionsModal 강제 노출 |
| 권한 없음 | 403 | "권한이 없습니다" |

---

### SCR-I-EDIT-SECURITY. 응시 보안 및 감독 Section (Section 6 본체)

**구현 파일**: `src/components/quiz-form/SecuritySection.jsx`

**목적**

교수자가 3종 보안 옵션(시험 전용 브라우저 / AI 시험 감독 / 응시 전 필수 동의) 의 사용 여부를 시험 단위로 설정.

**레이아웃**

```
[Section "응시 보안 및 감독"]
  ├── Toggle 1. 시험 전용 브라우저
  │    └── description: "학생은 지정된 안전 브라우저에서만 응시할 수 있으며 다른 응용프로그램이 제한됩니다"
  ├── Toggle 2. AI 시험 감독
  │    └── description: "응시 중 학생 화면과 웹캠 영상을 AI 가 모니터링하여 이상 행동을 단서로 표시합니다"
  ├── Toggle 3. 응시 전 필수 동의
  │    └── description: "학생이 동의하지 않으면 응시 화면에 진입할 수 없습니다"
  └── (Toggle 3 활성 시) 동의 안내문 영역
       ├── 좌측 보조선 (border-l-2 border-border)
       ├── label "동의 안내문"
       ├── textarea (rows=5, placeholder=DEFAULT_CONSENT_TEXT)
       └── 하단 안내: "미입력 시 placeholder 의 기본 안내문이 학생 화면에 노출됩니다"
```

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | "시험 전용 브라우저" Toggle | `form.securityTrustLock` 토글. 즉시 반영 |
| I-2 | "AI 시험 감독" Toggle | `form.securityAiProctoring` 토글. 즉시 반영 |
| I-3 | "응시 전 필수 동의" Toggle ON | `form.securityRequireConsent=true` + 동의 안내문 영역 자동 노출 |
| I-4 | 동의 안내문 textarea | `form.securityConsentText` 갱신. 빈 값 시 학생 화면에 DEFAULT_CONSENT_TEXT 노출 |
| I-5 | "응시 전 필수 동의" Toggle OFF | 동의 안내문 영역 자동 비노출. 값은 보존 (재토글 시 복원) |

**상태**

| **상태** | **표현** |
|---|---|
| 3종 모두 OFF | Toggle 3개 노출. 동의 안내문 영역 비노출. PublishReviewModal 보안 카드는 "사용 안 함" 표기 |
| 일부 활성 | PublishReviewModal 보안 카드에 활성 옵션 나열 + 학생 PreflightGate(SCR-09) 에서 안내됨 |
| 동의 활성 + 안내문 미입력 | textarea 빈 상태. 학생 화면에선 DEFAULT_CONSENT_TEXT 자동 노출 |
| 동의 활성 + 안내문 입력 | 입력값이 학생 PreflightGate `<pre>` 영역에 whitespace-pre-wrap 으로 노출 |

**데이터 흐름**

SecuritySection 은 상위 InfoTab form state 의 4개 필드(`securityTrustLock` / `securityAiProctoring` / `securityRequireConsent` / `securityConsentText`) 를 controlled 로 다룸. 별도 fetch/mutation 없음. 저장은 D-3 / D-4 (SCR-I-EDIT-INFO) 에서 일괄.

| **단계** | **트리거** | **데이터 변경** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|
| D-1 | Toggle 변경 | 상위 form state 의 boolean 필드 갱신 | Quiz (3.4.6 보안/감독) |
| D-2 | 동의 안내문 입력 | `form.securityConsentText` 갱신 (빈 값 = DEFAULT_CONSENT_TEXT 로 대체) | Quiz (`securityConsentText`) |

---

### SCR-I-EDIT-QUESTIONS. 문항 추가 탭 (3 진입점)

**구현 파일**: `src/pages/QuizCreate.jsx`, `QuizEdit.jsx` (QuestionsTab 함수)

**목적**

교수자가 시험에 출제할 문항을 작성/가져오기/조합. 3가지 진입점 — 직접 작성 / 문제은행 직접 선택 / 랜덤 출제. 직접 작성 모달 본체는 SCR-03 위임.

**레이아웃**

```
[헤더 / StepIndicator]
  └── ① 시험 설정 (완료 시 체크) ← ② 문항 추가 (현재 위치, 활성 강조)
  + 활성 탭 설명 박스
  + 문항 0개 시 requirement 카피 ("최소 1개 문항을 추가해주세요", warning-foreground)

[본문: QuestionsTab]
  ├── 헤더 행
  │    ├── 좌측: 문항 수 / 총점 — `summarizeQuizItems(questions)` 로 일반 문항 + random_group placeholder 통합 합계 계산
  │    └── 우측: "문항 만들기" (outline) + "문제모음에서 추가" (Popover: 직접 선택 / 랜덤 출제)
  ├── 문항 리스트 (1개 이상 시)
  │    ├── 드래그 정렬 (GripVertical)
  │    ├── `isRandomGroup(q)` 분기로 카드 컴포넌트 선택
  │    ├── 일반 문항 카드 (번호 / 유형 배지 / 배점 / 수동채점 배지)
  │    │    ├── 본문 요약 (htmlToPlainText, line-clamp-2)
  │    │    ├── 정답 미리보기 (QuestionAnswer, 자동채점 유형만)
  │    │    └── 액션 (수정 Pencil → SCR-03 / 삭제 Trash2)
  │    └── 랜덤 출제 그룹 카드 (RandomGroupItemCard, placeholder 전용)
  │         ├── Shuffle 아이콘 + "랜덤 출제 그룹" 라벨 + 출제 은행명
  │         ├── 출제 문항 수 / 문항당 배점 / 차등 배점 활성 여부
  │         ├── 풀 전체 후보 수 (maxAvailable) 표시
  │         ├── 학생별로 다른 문항이 뽑힌다는 안내 카피
  │         └── 액션 (삭제 Trash2만 — 수정은 RandomQuestionBankModal 재실행으로 대체)
  └── 빈 상태 (0개)
       └── dashed border 박스 + 안내 2줄 — "아직 추가된 문항이 없습니다" / "상단의 '문항 만들기' 또는 '문제모음에서 추가' 버튼으로 시작합니다"

[푸터]
  ├── 좌측: "취소"
  └── 우측: "임시저장" + "저장하기"
```

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | StepIndicator "시험 설정" 클릭 | `tab='info'` 복귀 (작업 손실 없음) |
| I-2 | "문항 만들기" 클릭 | `AddQuestionModal` 오픈 (SCR-03) |
| I-3 | "문제모음에서 추가" 클릭 | Popover (직접 선택 / 랜덤 출제) |
| I-4 | Popover "직접 선택" 클릭 | `QuestionBankModal` 오픈 (SCR-04 위임) |
| I-5 | Popover "랜덤 출제" 클릭 | `RandomQuestionBankModal` 오픈 (SCR-03 위임 — 2-step 흐름) |
| I-6 | 모달에서 문항 추가 (일반) | `questions` 배열 갱신 |
| I-6b | 랜덤 출제 모달에서 "N문항 랜덤 출제" 클릭 | 선택 은행 개수만큼 `random_group` placeholder 객체 N개를 `questions` 배열에 누적 (`createRandomGroupItem`) |
| I-7 | 카드 GripVertical 드래그 | `moveQuestion(fromIdx, toIdx)` — 일반 문항과 random_group 카드 동일하게 정렬 가능 |
| I-8 | 일반 카드 Pencil 클릭 | AddQuestionModal 재오픈 (수정 모드, SCR-03 분기 — 응시자 있으면 RegradeOptionsModal) |
| I-9 | 카드 Trash2 클릭 | `removeQuestion(qId)` — 즉시 삭제 (일반 문항 / random_group placeholder 동일) |
| I-10 | 헤더 행 문항 수 / 총점 표시 | `summarizeQuizItems(questions)` 호출 — random_group placeholder 의 `count` 와 추정 `points` 가 총합에 포함됨 (학생별 실제 합계는 응시 시점에 결정) |

**데이터 흐름**

문항 추가/수정/삭제는 모달(SCR-03) 닫힘 후 상위 form state `questions[]` 배열만 갱신. 실제 서버 저장은 D-3 / D-4 (SCR-I-EDIT-INFO) 에서 `setQuizQuestions` 일괄. 미완료 임시저장 상태에서 새로고침 시 변경 분 손실 (현재 mock 동작).

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티** |
|---|---|---|---|---|---|
| D-1 | 모달에서 문항 추가/수정 (SCR-03) | 상위 `questions[]` state 배열 갱신만 | 동일. 서버 호출 없음 (저장 시점에 일괄) | 카드 리스트 즉시 갱신 | Question (in-memory) |
| D-2 | 카드 드래그 정렬 | `moveQuestion(fromIdx, toIdx)` 로 배열 순서 변경 | 동일 | 카드 순서 갱신 | Question (`order`) |
| D-3 | 카드 삭제 | `removeQuestion(qId)` 즉시 배열에서 제거 | 동일 | 카드 즉시 사라짐 | Question (in-memory) |
| D-4 | 랜덤 출제 모달 확정 | `RandomQuestionBankModal` 의 `onAdd` 콜백 → `random_group` placeholder N개를 `questions[]` 에 누적 (`createRandomGroupItem({ bankId, count, pointsPerQuestion, useDifficultyScoring, difficultyPoints, ... })`) | 동일. 서버 저장 시 placeholder 스키마 그대로 직렬화 (Phase 2: 백엔드 스키마 권고 `{ type:'random_group', ... }`) | 카드 리스트에 RandomGroupItemCard 추가 | random_group placeholder, BankQuestion (참조) |
| D-5 | 헤더 합계 갱신 | `summarizeQuizItems(questions)` — 일반 문항 + placeholder 의 `count` 합산, 점수도 합산 (placeholder 는 추정 `points`) | 동일 | 문항 수 / 총점 표기 갱신 | (계산만) |

---

### SCR-I-PUBLISH-REVIEW. 게시 직전 종합 확인 모달

**구현 파일**: `src/components/PublishReviewModal.jsx`

**목적**

운영 설정 9 항목을 게시 직전 종합 확인. 누락/오설정 발견 시 시험 설정 탭으로 무손실 복귀해 수정 가능 (UX-P07-060). 추가 기간 + 자동 제출 유예 + 지각 제출이 결합된 학생 측 최종 운영 결과 확인 (UX-P07-061).

**레이아웃**

```
[Dialog: max-w-2xl, max-h-[85vh]]
[DialogHeader]
  ├── DialogTitle "공개 설정 확인"
  └── DialogDescription "공개하면 학생이 즉시 응시할 수 있습니다. 아래 항목을 확인해 주세요"

[Body: overflow-y-auto]
  ├── (warning 항목 있을 시) 상단 warning 박스
  │    └── AlertTriangle + 항목별 영향 카피 리스트
  ├── ReviewItemCard × N (warning + 사용자가 변경한 항목)
  │    ├── 1. 시험 유형 및 평가 그룹
  │    ├── 2. 응시 기간 (시작 ~ 마감 + 이용 종료)
  │    ├── 3. 지각 제출 정책
  │    ├── 4. 추가 기간 설정 (N건 대상자별 / 없음)
  │    ├── 5. 응시 정책 (시간 제한 + 자동 제출 유예 + 재응시 + 적용 점수)
  │    ├── 6. 문항 구성 (N문항 · 총 N점)
  │    ├── 7. 문항 표시 설정 (셔플, 한 문항씩)
  │    ├── 8. 응시 보안 및 감독 (활성 옵션 나열)
  │    └── 9. 성적 공개 정책 (범위 + 시점 + 1회 조회)
  └── "기본 설정 N개 보기" 토글 → 기본값 항목 펼침

[Footer]
  ├── 좌측: "돌아가서 수정" (ghost + ArrowLeft)
  └── 우측: "이대로 공개" (default)
```

**검증 로직 (`buildReviewItems`)**

| **#** | **warning 조건** | **warning 카피** |
|---|---|---|
| 1 | graded + 평가 그룹 미선택 | "평가 그룹을 선택하지 않으면 성적에 반영되지 않습니다" |
| 2 | 시작 + 마감 모두 미설정 | "응시 기간을 비워두면 학생이 언제든 응시할 수 있는 상태로 공개됩니다" |
| 6 | questions.length === 0 | "문항이 비어 있어 학생이 응시할 수 없습니다" |
| 9 | 재응시 허용 + 즉시 공개 | "재응시 허용 + 제출 즉시 공개 조합은 다음 응시 전 정답이 알려질 수 있습니다" |

**상태**

| **상태** | **표현** |
|---|---|
| 기본 (전 항목 OK) | warning 박스 비노출 |
| 1건 이상 warning | 상단 warning 박스 + 해당 카드 강조 (warning-border + 번호 원) |
| 기본값 다수 | "기본 설정 N개 보기" 토글로 접힘 |

**데이터 흐름**

PublishReviewModal 은 상위 form state 만 입력받아 `buildReviewItems` 로 9개 카드 데이터를 클라이언트 단독 생성. 별도 fetch 없음. "이대로 공개" 클릭 시 D-4 (SCR-I-EDIT-INFO) 의 mutation 호출.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **레이아웃 변화** |
|---|---|---|
| 모바일 | ~767px | h1 폰트 축소, StepIndicator 마진 축소, Section 카드 1열, 푸터 flex-wrap, Dialog 본문 스크롤 |
| 태블릿 | 768~1023px | h1 확대, StepIndicator 마진 확대, Section 1열, 응시 기간 grid-cols-2 |
| 데스크톱 | 1024px~ | 컨테이너 max-w-5xl 중앙, Section 1열 유지 (가독성), Dialog max-w-2xl |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 (QuizEdit) | `!loaded` | Skeleton 묶음 (h1 + StepIndicator + Section 3 + 푸터) |
| 빈 상태 (시험 설정) | 신규 진입 직후 | 각 Section default 값. StepIndicator desc + requirement 카피 |
| 빈 상태 (문항 추가) | 문항 0개 | dashed border 안내 2줄 + requirement 카피 |
| 에러 (제목 미입력 임시저장) | 임시저장 + 빈 제목 | AlertDialog "임시저장 불가" |
| 에러 (저장하기 검증 실패) | 첫 에러 메시지 | AlertDialog "필수 항목 미입력" |
| 에러 (저장 API 실패) | persistQuiz throw | AlertDialog "저장 중 오류가 발생했습니다" + 입력값 유지 |
| 에러 (자동 제출 유예 + lockDate 미설정) | 저장하기 | AlertDialog "이용 종료 일시 필수" |
| 권한 없음 | role !== 'instructor' | `<Navigate to="/" replace />` — 사유 안내 없음 → 간극 G-1 |
| 오프라인 | 네트워크 단절 | OfflineBanner 미구현 → 간극 G-2 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 학생 직접 URL 진입 시 사유 안내 | (B) 백로그 | URD-008 범위 외. C 분류 후속 카피 작업으로 분리 |
| G-2 | 오프라인 표시 | (B) 백로그 | OfflineBanner 는 MVP 범위 외 |
| G-3 | TA / 운영자 / 일정 관리자 권한 분기 | (A) 충족 | Canvas 권한 비트 위임 (공통 권한 가이드 참조). 운영자=교수자 권한 동등 |
| G-4 | 설문 마이그레이션 데이터 표시/전환 | (B) 정책 미확정 | URD-021 본문 명시. 본 SSD 는 평가용/연습용 두 유형만 명세 |
| G-5 | 지각 제출 마감 < 일반 마감 거부 안내 (UX-P07-021) | (A) 부분 충족 | HTML5 native min 속성 + 관련 안내 동반 (URD-021 v0.6 완화 수렴) |
| G-6 | 보안 옵션 고객별 제공 / 권한별 설정 2단 분기 | (A) 충족 | Canvas 권한 비트 + 고객 옵션 위임 (URD-021-B v1.0) |
| G-7 | 동의 거부 후 영구 차단 정책 (UX-P08-011, URD-021-B OQ-01) | (B) 정책 미확정 | 학생 측 동의 처리는 SCR-09. 본 SSD 는 강사 측 보안 옵션 설정만 |
| G-8 | 외부 SaaS 안내 (웹캠 끊김 등) | (B) 외부 책임 | 학생 측 응시 화면은 SCR-09 위임 |
| G-9 | 응시 전 안내사항(notice) 학생 측 표시 | (A) 부분 충족 | Section 8 입력값이 SCR-09 PreflightGate / 응시 화면 인트로에서 노출. 표시 위치/형식 정합 확인은 SCR-09 |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-16 | v1.4 | 랜덤 출제 처리 추가. (1) QuestionsTab 레이아웃에 RandomGroupItemCard 분기 명시 (`isRandomGroup(q)` 기준). (2) 헤더 행 문항 수 / 총점 산정에 `summarizeQuizItems(questions)` 사용 — random_group placeholder 의 `count` + 추정 `points` 합산. (3) 인터랙션 I-5 (모달 SCR-03 위임 정정), I-6b (placeholder 누적), I-10 (요약 표시) 추가. (4) 데이터 흐름 D-4 (`createRandomGroupItem` 호출), D-5 (요약 갱신) 추가. 참조 코드에 `randomGroups.js` 추가. | 김민주 (Creator/PD) |
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 4 화면(EDIT-INFO/SECURITY/QUESTIONS/PUBLISH-REVIEW) 각각에 데이터 흐름 절 추가. mock/api 분기 + 데이터 사전 v0.1 엔티티 매핑 + 권한 검증 + 에러 응답 권고 포함 | 김민주 (Creator/PD) |
