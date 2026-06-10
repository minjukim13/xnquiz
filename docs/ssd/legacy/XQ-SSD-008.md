# XQ-SSD-008. 시험 출제 단계 직관성 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-008 의 UX 요건을 시험 생성/편집 화면(`/quiz/new`, `/quiz/:id/edit`) 의 현재 프로토타입 동작 기준으로 명세. URD/가이드 중 프로토타입에 없는 항목은 본문에 포함하지 않고 "프로토타입과 URD 간극" 절에 분리 기록.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-008-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-008](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076418585) v1.0 |
| 참조 FRD | XQ-FRD-008 v0.3 |
| 참조 FSD | 해당 없음 (FSD 미작성, URD 직참조) |
| 참조 DS Baseline | LearningX DS Baseline 미확정. 임시 기준: 프로젝트 루트 `CLAUDE.md` Design System 절 (Toss style) |
| 참조 코드 | `src/pages/QuizCreate.jsx`, `src/pages/QuizEdit.jsx`, `src/components/StepIndicator.jsx`, `src/utils/quizFormSteps.js`, `src/components/quiz-form/*` |

---

## 1. 역할별 네비게이션 구조

본 SSD 범위에서 현재 프로토타입이 분기하는 역할은 **교수자(instructor) / 학생(student)** 두 종류. (URD-008 의 TA/운영자 역할은 프로토타입 미구현 → "간극" 절 참조)

```
교수자 (instructor) 네비게이션:
홈
└── 퀴즈 목록 (/)
     ├── [신규] "새 퀴즈" 버튼 → /quiz/new (시험 설정 탭 진입)
     │                            ├── 탭 1: 시험 설정
     │                            └── 탭 2: 문항 추가
     └── [기존] 카드 메뉴 → "편집" → /quiz/:id/edit (시험 설정 탭 진입)
                                       ├── 탭 1: 시험 설정
                                       └── 탭 2: 문항 추가

핵심 태스크 클릭 뎁스:
- 신규 시험 작성 시작: 퀴즈 목록 → 새 퀴즈 (2단계)
- 기존 시험 편집 시작: 퀴즈 목록 → 카드 메뉴 → 편집 (3단계)
- 문항 추가 탭 진입: 시험 편집 진입 후 1단계 (StepIndicator 클릭)


학생 (student):
본 화면 접근 권한 없음. /quiz/new 또는 /quiz/:id/edit 직접 URL 진입 시
즉시 홈(/) 으로 리다이렉트 (Navigate to="/" replace).
```

**도달 원칙 (프로토타입 동작 기준)**

- 신규 시험 작성은 P0. 2단계 도달 (가이드 권장 4단계 이내 만족).
- 두 탭 간 이동은 자유. StepIndicator 의 버튼 클릭으로 어느 방향으로든 전환 가능 (강제 순차 잠금 없음).
- 학생이 진입할 경우 별도 안내 화면 없이 즉시 홈으로 리다이렉트. (URD-008 의 "권한 제한 사유 안내" 와 다름 → "간극" 절 참조)

---

## 2. 화면 목록

본 SSD 가 다루는 화면은 시험 생성/편집 라우트의 **탭 2종**.

| **화면 ID** | **화면명** | **라우트** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-EDIT-INFO | 시험 설정 탭 | `/quiz/new` `/quiz/:id/edit` (tab=info) | 교수자 | UX-P07-001/002/003/010/011/020/021/022 | P0 |
| SCR-I-EDIT-QUESTIONS | 문항 추가 탭 | `/quiz/new` `/quiz/:id/edit` (tab=questions) | 교수자 | UX-P07-001/002/003/020/021/022 | P0 |

**화면 ID 규칙 적용 안내**

- 신규 가이드 규칙: `SCR-{역할 약자}-{번호}` (Instructor=I)
- 단일 라우트 내 탭 전환 구조이므로 `SCR-I-EDIT-{TAB}` 보조 키 사용.
- 기존 SSD 화면 키 `S-02` (QuizCreate) / `S-04` (QuizEdit) 와의 매핑은 각 화면 상세 헤더에 명시.

---

## 3. 화면별 상세 설계

### SCR-I-EDIT-INFO. 시험 설정 탭

**기존 화면 키 매핑**: S-02 (퀴즈 생성) tab=info / S-04 (퀴즈 편집) tab=info
**라우트**: `/quiz/new` `/quiz/:id/edit` (진입 직후 기본 탭)
**구현 파일**: `src/pages/QuizCreate.jsx` `QuizEdit.jsx` 의 `InfoTab` 함수

**목적**

교수자가 시험의 **운영 조건**(제목·설명·기간·응시 정책·결과 공개·보안·접근 제한 등) 을 입력하는 단계. 시험 내용(문항) 입력은 다음 탭(문항 추가) 으로 분리.

**레이아웃 (Region Map)**

```
[헤더]
  └── h1 "새 퀴즈 만들기" / "퀴즈 편집"

[StepIndicator]
  ├── ① 시험 설정 (현재 위치, 활성 강조)
  └── ② 문항 추가 (다음 단계, 약하게 / 완료 시 체크)
  + 활성 탭 설명 박스 (현재 탭의 label + desc 항상 표시)

[본문: InfoTab - Section 카드 7종 (graded 모드 기준)]
  ├── Section "퀴즈 유형" (평가용 / 연습용)
  ├── Section "기본 정보"
  │    ├── 퀴즈 제목 (required)
  │    ├── 설명 (textarea, 8행)
  │    ├── 평가 그룹 (graded 일 때만 노출, CustomSelect)
  │    ├── 평가 비중 안내
  │    └── 주차 / 차시 (WeekSessionPicker)
  ├── Section "응시 기간"
  │    ├── 시작 일시 (DateTimePicker)
  │    ├── 마감 일시 (DateTimePicker)
  │    ├── 이용 종료 일시 (DateTimePicker, 선택)
  │    └── 지각 제출 허용 (Toggle + lateSubmitDeadline)
  ├── Section "응시 설정"
  │    ├── 시간 제한 / 무제한
  │    ├── 자동 제출 5분 유예 (조건부)
  │    ├── 재응시 횟수 / 무제한
  │    ├── 점수 정책 (재응시 2회+ 일 때만)
  │    ├── 문항 순서 셔플 / 선택지 셔플
  │    └── 한 문항씩 표시 / 답안 확정 후 잠금
  ├── Section "성적 공개"
  │    ├── 학생에게 점수 공개 (Toggle)
  │    ├── 공개 범위 / 시점 / 기간
  │    └── 1회 조회 옵션
  ├── Section "응시 보안 및 감독"  (SecuritySection)
  │    ├── 시험 전용 브라우저 (Toggle)
  │    ├── AI 시험 감독 (Toggle)
  │    └── 응시 전 필수 동의 (Toggle + 동의 안내문)
  ├── Section "접근 제한"
  │    ├── 액세스 코드
  │    └── IP 제한
  ├── Section "추가 기간" (AssignmentOverrides)
  │    └── 학생별 추가 기간 부여
  ├── Section "안내사항"
  │    └── 사전 안내문 (Toggle + textarea)
  └── Section "공개 여부"
       └── 학생에게 공개 / 비공개 (Switch)

[푸터: 상단 border-t]
  ├── 좌측: "취소" (ghost)
  └── 우측: "임시저장" (outline) + "저장하기" (primary)
```

| **영역** | **설명** |
|---|---|
| 헤더 | 페이지 타이틀 h1 (커스텀 컴포넌트 없음, 인라인 스타일) |
| StepIndicator | 2단계 탭 표시 + 현재 탭 설명 항상 노출 |
| 본문 | Section 카드 묶음 (graded 모드 기준 9~10개, practice 모드는 일부 비노출) |
| 푸터 | 취소(좌) / 임시저장 + 저장하기(우). border-t 로 본문과 분리 |

**사용 컴포넌트 (DS Baseline 참조)**

DS Baseline 단일 문서가 확정될 때까지 본 표를 임시 기준으로 사용. 컴포넌트명은 실제 코드 컴포넌트 기준.

| **컴포넌트** | **위치 / variant** | **용도** |
|---|---|---|
| `StepIndicator` | `src/components/StepIndicator.jsx` | 2단계 탭 + 활성 탭 설명 (`desc` 항상 표시) |
| `Section` | `src/components/quiz-form/Section.jsx` | 설정 항목 그룹 카드 |
| `Field` | `src/components/quiz-form/Field.jsx` | 라벨 + 입력 영역 묶음 |
| `Toggle` | `src/components/quiz-form/Toggle.jsx` | 스위치 형태의 on/off 옵션 (label + description 항상 노출) |
| `SecuritySection` | `src/components/quiz-form/SecuritySection.jsx` | 보안/감독 옵션 묶음 |
| `CustomSelect` | `src/components/CustomSelect.jsx` | 평가 그룹 / 점수 정책 등 |
| `DateTimePicker` | `src/components/DateTimePicker.jsx` | 시작 / 마감 / 이용 종료 / 지각 마감 / 점수 공개 기간 |
| `WeekSessionPicker` | `src/components/WeekSessionPicker.jsx` | 주차 / 차시 선택 |
| `AssignmentOverrides` | `src/components/AssignmentOverrides.jsx` | 학생별 추가 기간 |
| `Button` | `@/components/ui/button` (size=lg, variant=ghost/outline/default) | 취소 / 임시저장 / 저장하기 |
| `Badge` | `@/components/ui/badge` | 평가 비중 안내 등 |
| `Tooltip` / `Popover` | shadcn | 일부 라벨의 보조 안내 |
| `ConfirmDialog` | `src/components/ConfirmDialog.jsx` | 작성 취소 확인 |
| `AlertDialog` | `src/components/ConfirmDialog.jsx` | 검증 실패 / 임시저장 결과 안내 (첫 에러 메시지) |
| `PublishReviewModal` | `src/components/PublishReviewModal.jsx` | 저장하기 클릭 시 게시 직전 9항목 종합 확인 |

> 본 SSD 가 참조한 컴포넌트는 모두 현재 프로토타입에 존재한다. DS Baseline 단일 문서 확정 후 갱신 절차에 따라 위 표를 옮긴다.

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | `/quiz/new` 또는 `/quiz/:id/edit` 진입 (학생) | `<Navigate to="/" replace />` (즉시 홈으로) |
| I-2 | StepIndicator "시험 설정" 클릭 | `tab='info'` 유지 (이미 활성) |
| I-3 | StepIndicator "문항 추가" 클릭 | `tab='questions'` 로 전환. 완료 여부 무관 (잠금 없음) |
| I-4 | "취소" 클릭 | hasChanges 시 ConfirmDialog ("작성 중인 내용이 있습니다") → 확인 시 `/` 이동. hasChanges 없으면 즉시 `/` |
| I-5 | "임시저장" 클릭 | 제목 미입력 시 AlertDialog. 입력됐으면 `persistQuiz('draft')` → 성공 시 "임시저장 완료" AlertDialog |
| I-6 | "저장하기" 클릭 | `getValidationErrors()` 첫 에러 있으면 AlertDialog. 통과 시 `PublishReviewModal` 오픈 → "이대로 게시" → `persistQuiz('open')` → `/` 이동 |
| I-7 | 각 Section 의 입력 변경 | `set(key, val)` → `form` 상태 갱신. 별도 자동저장 없음 (임시저장 버튼으로만 보존) |
| I-8 | 재응시 횟수 1 로 설정 | "점수 정책" Field 자동 비노출 (`allowAttempts >= 2` 조건) |
| I-9 | 시간 제한 무제한 토글 | "자동 제출 5분 유예" Toggle 비활성 (`!form.unlimitedTimeLimit` 조건) |

**상태 (StepIndicator 표시)**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 현재 위치 | `tab === 'info'` | StepIndicator ①번 강조 (bg-accent, 숫자 원에 primary 색) |
| 완료 단계 | `form.title` 입력됨 | `getCompletedSteps` 가 `'info'` 포함 시 ①번에 체크 마크 (다른 탭이 활성일 때만 가시) |
| 미완료 (활성 + 보완 필요) | `tab === 'info'` && `form.title` 미입력 | 활성 탭 desc 박스 안에 `requirement` 카피 노출 — "퀴즈 제목을 입력해주세요" (warning-foreground 색) |

> 완료 판정 로직: `src/utils/quizFormSteps.js` 의 `getCompletedSteps`. info = 제목 입력 / questions = 문항 1개 이상.
> Requirement 노출 로직: `StepIndicator` 가 활성 단계가 `completedSteps` 에 없을 때만 `requirement` 카피 노출 (2026-06-04 G-5 도입).

---

### SCR-I-EDIT-QUESTIONS. 문항 추가 탭

**기존 화면 키 매핑**: S-02 (퀴즈 생성) tab=questions / S-04 (퀴즈 편집) tab=questions
**라우트**: `/quiz/new` `/quiz/:id/edit` (tab=questions 로 전환)
**구현 파일**: `src/pages/QuizCreate.jsx` `QuizEdit.jsx` 의 `QuestionsTab` 함수

**목적**

교수자가 시험에 출제할 **문항**을 작성/가져오기/조합. 직접 작성·문제모음 가져오기·랜덤 출제 3가지 진입점 (상세 동작은 XQ-FRD-024 G7 범위, 본 SSD 는 진입점만 명세).

**레이아웃 (Region Map)**

```
[헤더 / StepIndicator]
  └── ① 시험 설정 (완료 시 체크) ← ② 문항 추가 (현재 위치, 활성 강조)
  + 활성 탭 설명 박스

[본문: QuestionsTab]
  ├── 헤더 행
  │    ├── 좌측: 문항 수 / 총점
  │    └── 우측: "문항 만들기" 버튼 (outline) + "문제모음에서 추가" 버튼 (Popover)
  │         └── Popover 안: "직접 선택" / "랜덤 출제" 두 옵션
  ├── 문항 리스트 (문항 1개 이상 시)
  │    ├── 드래그 정렬 (GripVertical)
  │    ├── 문항 카드 (번호 / 유형 배지 / 배점 / 수동채점 배지)
  │    ├── 본문 요약 (htmlToPlainText, line-clamp-2)
  │    ├── 정답 미리보기 (QuestionAnswer, 자동채점 유형만)
  │    └── 액션 (수정 Pencil / 삭제 Trash2)
  └── 빈 상태 (문항 0개 시)
       └── dashed border 박스 안에 안내 2줄 — "아직 추가된 문항이 없습니다" + 진입점 행동 카피

[푸터: 상단 border-t]
  ├── 좌측: "취소" (ghost)
  └── 우측: "임시저장" (outline) + "저장하기" (primary)
```

| **영역** | **설명** |
|---|---|
| StepIndicator | 시험 설정 탭과 공유. 현재 탭이 questions 로 강조 |
| 진입점 | 3종 버튼 (직접 / 은행 / 랜덤). 빈 상태 / 문항 보유 모두 동일 위치 |
| 문항 리스트 | 드래그 정렬 가능. 카드별 수정 / 삭제 |
| 푸터 | 시험 설정 탭과 공유. 어느 탭에서든 저장 가능 |

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `StepIndicator` | `src/components/StepIndicator.jsx` | 헤더 (시험 설정 탭과 공유) |
| `Button` | `@/components/ui/button` | "문항 만들기" (outline) / "문제모음에서 추가" (default) |
| `Popover` / `PopoverTrigger` / `PopoverContent` | shadcn | "문제모음에서 추가" 클릭 시 직접 선택 / 랜덤 출제 두 옵션 |
| `AddQuestionModal` | `src/components/AddQuestionModal.jsx` | 직접 작성 모달 |
| `QuestionBankModal` | `src/components/QuestionBankModal.jsx` | 문제모음 직접 선택 모달 |
| `RandomQuestionBankModal` | `src/components/RandomQuestionBankModal.jsx` | 랜덤 출제 모달 |
| `QuestionAnswer` | `src/components/QuestionAnswer.jsx` | 카드 안 정답 미리보기 (자동채점 유형만) |
| `Badge` | `@/components/ui/badge` | 문항 유형 배지 / 수동채점 배지 |
| Lucide icons | `GripVertical` `Pencil` `Trash2` `HelpCircle` | 드래그 / 수정 / 삭제 / 도움말 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | StepIndicator "시험 설정" 클릭 | `tab='info'` 로 복귀 (작업 손실 없음) |
| I-2 | "문항 만들기" 클릭 | `AddQuestionModal` 오픈 |
| I-3 | "문제모음에서 추가" 클릭 | Popover 노출 (직접 선택 / 랜덤 출제 두 옵션) |
| I-4 | Popover "직접 선택" 클릭 | `QuestionBankModal` 오픈 (현재 과목 기본 + 다른 과목 가능) |
| I-5 | Popover "랜덤 출제" 클릭 | `RandomQuestionBankModal` 오픈 |
| I-6 | 모달에서 문항 추가 | `addQuestion` / `addNewQuestion` 호출 → `questions` 배열 갱신 |
| I-7 | 문항 카드 GripVertical 드래그 | `moveQuestion(fromIdx, toIdx)` → 배열 재정렬 |
| I-8 | 카드 Pencil 클릭 | `editingQuestion` 세팅 → `AddQuestionModal` 재오픈 (initialQuestion 전달) |
| I-9 | 카드 Trash2 클릭 | `removeQuestion(qId)` → 즉시 삭제 (별도 확인 다이얼로그 없음) |
| I-10 | "저장하기" 클릭 (questions 탭에서도 가능) | SCR-I-EDIT-INFO I-6 와 동일 |

**상태 (StepIndicator 표시)**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 현재 위치 | `tab === 'questions'` | StepIndicator ②번 강조 |
| 완료 단계 | `questions.length > 0` | `getCompletedSteps` 가 `'questions'` 포함 시 ②번에 체크 마크 (info 탭에서 가시) |
| 미완료 (활성 + 보완 필요) | `tab === 'questions'` && `questions.length === 0` | 활성 탭 desc 박스 안에 `requirement` 카피 노출 — "최소 1개 문항을 추가해주세요" (warning-foreground 색) |

---

## 4. 반응형 분기

본 SSD 의 주 사용 디바이스는 **데스크톱** (교수자 작업 환경). 현재 프로토타입은 모바일/태블릿 전용 분기 코드를 명시적으로 두지는 않고 Tailwind 의 `sm:` 브레이크포인트로 자연 흐름 처리.

| **디바이스** | **너비** | **현재 프로토타입 동작** |
|---|---|---|
| 모바일 | ~767px | h1 폰트 축소 (`text-[20px]`). StepIndicator 의 단계 간 연결선 마진 축소 (`mx-1`). Section 카드 패딩 유지. 푸터 버튼은 자동 줄바꿈 (`flex-wrap`) |
| 태블릿 | 768~1023px | h1 폰트 확장 (`text-[22px]`). StepIndicator 연결선 마진 확대 (`mx-2`). Section 카드 1열 유지 |
| 데스크톱 | 1024px~ | 컨테이너 최대 너비 `max-w-5xl` 중앙 정렬. Section 카드 1열 유지 (가독성 우선). 일부 Field 내부에서 grid-cols-2 적용 |

**브레이크포인트 운영 원칙**

- StepIndicator 는 모든 디바이스에서 항상 노출. 현재 위치 인지가 핵심 UX 목표 (UX-P07-020).
- Section 카드는 단일 열을 유지. 시험 설정 항목이 많아도 1열 흐름으로 읽도록 설계.
- 푸터 버튼 영역은 `flex-wrap` 으로 좁은 화면에서 줄바꿈.

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 (QuizEdit) | 기존 시험 fetch 중 (`!loaded`) | `Skeleton` 컴포넌트 묶음 (h1 + StepIndicator 2칸 + Section 3개 + 푸터 버튼 3개) 노출. `aria-busy="true"` |
| 빈 상태 (시험 설정) | 신규 작성 진입 직후 | InfoTab 의 각 Section 이 default 값으로 표시. StepIndicator 활성 탭 설명("학생 응시 환경과 운영 규칙을 결정합니다...") 이 진입 안내 역할 + requirement 카피로 다음 행동 안내 ("퀴즈 제목을 입력해주세요") |
| 빈 상태 (문항 추가) | 문항 0개 상태 | dashed border 박스 + 안내 2줄 ("아직 추가된 문항이 없습니다" / "상단의 '문항 만들기' 또는 '문제모음에서 추가' 버튼으로 시작합니다") + StepIndicator desc 박스의 requirement 카피로 보강 |
| 검증 실패 (제목 미입력) | 임시저장 클릭 + 제목 빈 값 | `AlertDialog title="임시저장 불가"` |
| 검증 실패 (저장하기) | 저장하기 클릭 + 검증 미통과 | `AlertDialog title="필수 항목 미입력"` (첫 에러 메시지만) |
| 저장 에러 | persistQuiz API 실패 | `AlertDialog variant="error"` ("저장 중 오류가 발생했습니다") + 입력값은 유지 |
| 권한 없음 (학생 직접 URL 진입) | role !== 'instructor' | `<Navigate to="/" replace />` — 별도 안내 화면 없음 → "간극" 절 G-6 참조 (백로그) |
| 오프라인 | 네트워크 단절 | OfflineBanner 미구현 → "간극" 절 G-10 참조 (백로그) |

**ADD 권한 매트릭스와의 정합**

- 학생: 본 화면 진입 권한 없음. 현재 동작은 즉시 홈 리다이렉트. (URD-008 의 "사유 안내" 와 다름)
- TA / 운영자: 프로토타입 미구현. 현재 코드 상 instructor / student 두 역할만 존재.

---

## 프로토타입과 URD 간극 처리 결과

본 SSD 작성 과정에서 URD-008 (또는 가이드) 와 프로토타입 사이 간극 10건을 식별. 2026-06-04 사용자 결정에 따라 아래와 같이 정리.

(A) **프로토타입에 구현 추가** — 본 SSD 본문에 반영
(B) **URD 본문에서 표현 조정** — 프로토타입 동작에 맞춰 URD 표현 완화 또는 별도 백로그

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | TA(P-03) 역할 분기 | (B) URD 완화 | **URD-008 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 (공통 권한 모델 가이드 참조) |
| G-2 | 운영자(P-05) 검토 진입 | (B) URD 완화 | **URD-008 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 (공통 권한 모델 가이드 참조) |
| G-3 | 단계 진입 1회 안내 + 닫기 가능 | (B) URD 완화 | **URD-008 v0.9 정정 완료** (2026-06-05) — UX-COM-003 "활성 단계 설명 노출" 로 완화 |
| G-4 | 주요 설정 항목 안내 (필요 시점 확인 가능) | (B) URD 완화 | **URD-008 v0.9 정정 완료** (2026-06-05) — UX-P07-011 / UX-COM-004 "관련 안내 동반" 으로 완화 |
| G-5 | "보완 필요" 단서 / 다음 단계 이동 안내 | (A) 구현 완료 | 2026-06-04 `StepIndicator` 에 `requirement` 카피 도입. 활성 + 미완료 단계에서만 warning-foreground 톤으로 노출 |
| G-6 | 학생 직접 URL 진입 시 사유 안내 | (B) 별도 백로그 | URD-008 범위 외. C 분류 후속 카피 작업으로 분리 |
| G-7 | 라벨 어휘: "문제 구성" 대 "문항 추가" | (B) URD 정정 | **URD-008 v0.6 정정 완료** (2026-06-04) — "문항 추가 단계" 로 일관 정정 |
| G-8 | QuizEdit 진입 시 로딩 표현 | (A) 구현 완료 | 2026-06-04 `QuizEdit` 의 `!loaded` 상태를 `Skeleton` 묶음으로 교체 |
| G-9 | 문항 0개 빈 상태 안내 | (A) 구현 완료 | 2026-06-04 `QuestionsTab` 빈 상태 박스에 안내 2줄 추가 (QuizCreate / QuizEdit 양쪽) |
| G-10 | 오프라인 표시 | (B) 별도 백로그 | OfflineBanner 는 MVP 범위 외 백로그로 분리 |

**URD-008 본문 정정 완료**: 2026-06-04 v0.6 (G-7) + 2026-06-05 v0.9 (G-3/G-4) + v1.0 (G-1/G-2 권한 panel 가이드 참조). G-6 / G-10 은 별도 백로그.


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-1~G-7 URD-008 정정 완료 반영 (v0.6/v0.9/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
