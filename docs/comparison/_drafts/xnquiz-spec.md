# xnquiz 구현 기능 스펙 (소스 기반, 화면 단위)

> 본 문서는 SSD 요약본이 아니라 React 소스를 직접 읽어 추출한 화면별 전체 기능 스펙임. 누락 방지를 최우선으로 함. 작은 토글 / 아이콘 버튼 / 안내문구 / 키보드 단축키 / 토스트 메시지까지 모두 포함.
> 대상 소스: `C:\Users\김민주\Desktop\xnquiz\src` (React 19 + Vite 8 + Tailwind v4)
> 작성일: 2026-05-21

---

## 0. 라우팅 / 전역 구조

### 0-1. 라우트 정의 (`src/App.jsx`)

| 경로 | 화면 ID | 컴포넌트 | 진입 권한 가드 |
| --- | --- | --- | --- |
| `/` | S-01 | `QuizList.jsx` | role 분기 — 학생/교수자 다른 뷰 |
| `/quiz/new` | S-02 | `QuizCreate.jsx` | `role !== 'instructor'` 이면 `/` 리다이렉트 |
| `/quiz/:id` | S-03 | `QuizDetail.jsx` | role 분기 — 학생/교수자 다른 뷰 |
| `/quiz/:id/edit` | S-04 | `QuizEdit.jsx` | `role !== 'instructor'` 이면 `/` 리다이렉트 |
| `/quiz/:id/grade` | S-05 | `GradingDashboard/index.jsx` | `role !== 'instructor'` 이면 `/` 리다이렉트 |
| `/quiz/:id/stats` | S-06 | `QuizStats.jsx` | `role !== 'instructor'` 이면 `/` 리다이렉트 |
| `/quiz/:id/attempt` | S-07 | `QuizAttempt.jsx` | `?preview=true` 일 땐 통과, 아니면 `role !== 'student'` 시 `/` 리다이렉트 |
| `/question-banks` | S-08 | `QuestionBankList.jsx` | `role !== 'instructor'` 이면 `/` 리다이렉트 |
| `/question-banks/:bankId` | S-09 | `QuestionBank.jsx` | `role !== 'instructor'` 또는 `bank` 미존재 시 `/` 리다이렉트 |
| `*` (그 외) | - | - | `/` 리다이렉트 |

추가 동작:
- 라우터는 `BrowserRouter` + `RoleProvider` + `QuestionBankProvider` 로 감싸짐
- `Layout` 라우트가 사이드바를 유지한 채 본문만 `Suspense` 로 lazy 전환 (스피너 폴백)
- 페이지 컴포넌트는 모두 `React.lazy()`. `prefetchRoute.quizList` / `prefetchRoute.questionBankList` 는 nav hover/focus/touchstart/idle 시점에 청크 프리페치

### 0-2. 전역 셸 (`src/components/Layout.jsx`)

**모바일 헤더 (≤sm)**

| 요소 | 동작 / 노출 조건 |
| --- | --- |
| 햄버거 버튼 (`Menu` 아이콘) | `Sheet` 형 좌측 슬라이드 메뉴 열기 |
| Sheet 상단 로고 + "XN Quiz" 텍스트 | 클릭 시 `/` 이동, Sheet 닫힘 |
| Sheet 내 `NavLinks` | 네비 항목들 (역할별 분기) |
| Sheet 하단 `RoleToggle` | 교수자 / 학생 전환 |
| 상단 작은 로고 + "XN Quiz" | 클릭 시 `/` 이동 |
| 학생 모드 안내 띠 | `role === 'student'` 일 때만 노출. "{name} ({studentId})" |

**데스크톱 사이드바 (≥sm, 200px 고정폭)**

| 요소 | 동작 / 노출 조건 |
| --- | --- |
| 로고 영역 | 4개 정사각형 컴포지트 + "XN Quiz" 텍스트, 클릭 시 `/` |
| 그룹 라벨 | 학생일 땐 "학습", 교수자일 땐 "강의" |
| 네비 링크 | 교수자: "퀴즈" `/`, "문제모음" `/question-banks` / 학생: "내 퀴즈" `/` 만 |
| 하단 고정 `RoleToggle` | 교수자 ↔ 학생 전환 (스위치 형태) |
| 학생 모드 안내 배너 (메인 본문 상단) | "학생 모드 - {name} ({studentId})" |

**RoleToggle**
- 좌: "교수자" 버튼, 우: "학생" 버튼. 두 토글로 `setRole('instructor' | 'student')` 호출
- 활성 상태일 때만 흰 배경 + 그림자 + 굵은 폰트

**Layout prefetch**
- 마운트 후 `requestIdleCallback` 으로 `prefetchRoute.quizList`, `prefetchRoute.questionBankList` 호출

### 0-3. 역할 컨텍스트 (`RoleContext`)
- 노출 값: `role` (`'instructor' | 'student'`), `setRole`, `currentStudent` (현재 로그인 가정한 학생 객체: `name`, `studentId`, `id`, `department`)
- 토글 시 자동 학생 선택은 `mockStudents` 의 첫 번째로 고정 (mock 모드)

### 0-4. 데이터 소스 (`src/lib/data/`)
- `index.js` 가 `VITE_DATA_SOURCE === 'api'` 면 api 어댑터, 아니면 mock 어댑터로 분기
- 페이지는 모두 `isApiMode()` 분기 후 `mockQuizzes` 동기 초기값 vs api 모드 `[]` + `loading=true` 처리
- mock 모드는 `localStorage` 영속화 (`xnq_quizzes`, `xnq_quiz_questions` 등)

---

## 0-1. 데이터 모델 핵심 필드 (mockData.js 기반)

### Quiz 객체 (mockQuizzes 시드 + addQuiz/updateQuiz 로 변경)

| 필드 | 타입 / 예시 | 비고 |
| --- | --- | --- |
| `id` | `'1'`, `'cs201_2'`, 신규 생성 시 `String(Date.now())` 기반 | mock 모드 정적 ID + localStorage 추가본 혼용 |
| `title` | 문자열 | 필수 |
| `description` | 문자열 \| 없음 | 학생에게 표시 (`whitespace-pre-wrap`) |
| `course` | `'CS301 데이터베이스'` 등 | 과목명 (mock 모드는 `CS301` 만 진입) |
| `courseCode` | `'CS301'` 등 | api 모드 추가 |
| `status` | `'draft' \| 'open' \| 'grading' \| 'closed'` | scheduled 는 status 가 아니라 `startDate` 미래 여부로 화면에서만 표시 |
| `visible` | `true \| false` | 학생 노출 여부. draft 는 자동 비공개 |
| `hasFileUpload` | bool | UI 비표시 (시드만) |
| `startDate` | `'2026-04-03 09:00'` 또는 `''` | 응시 가능 시작 |
| `dueDate` | `'2026-04-03 18:00'` 또는 `''` | 마감 |
| `lockDate` | `'2026-04-30 23:59'` 또는 `''` | 이용 종료 (페이지 접근 차단) |
| `week`, `session` | 정수 또는 `null` | 주차/차시 |
| `totalStudents` | 정수 | 수강생 총원 |
| `submitted` | 정수 | 제출 인원 |
| `graded` | 정수 | 채점 완료 인원 |
| `pendingGrade` | 정수 | 채점 대기 |
| `questions` | 정수 | 문항 수 |
| `totalPoints` | 정수 | 총점 |
| `avgScore` | 숫자 \| 없음 | 평균 점수 |
| `timeLimit` | 정수 분 \| `null` \| `0` | 제한시간. 0 또는 null 이면 무제한 |
| `scorePolicy` | `'최고 점수 유지' \| '평균 점수' \| '최신 점수 유지' \| null` | 다회 응시 시만 의미 |
| `allowAttempts` | 정수 \| `-1` (무제한) | 응시 허용 횟수 |
| `quizMode` | `'graded' \| 'practice'` | 평가용 / 연습용 |
| `shuffleChoices` | bool | 선지 셔플 |
| `shuffleQuestions` | bool | 문제 순서 셔플 |
| `oneQuestionAtATime` | bool | 한 문항씩 표시 |
| `lockAfterAnswer` | bool | 응답 후 잠금 (oneQuestionAtATime 필수) |
| `scoreRevealEnabled` | bool | 성적 공개 토글 |
| `scoreRevealScope` | `'wrong_only' \| 'with_answer' \| null` | 오답여부만 / 정답까지 |
| `scoreRevealTiming` | `'immediately' \| 'after_due' \| 'period' \| null` | 즉시 / 마감 후 / 기간 |
| `scoreRevealStart`, `scoreRevealEnd` | 일시 문자열 \| null | period 시점 |
| `oneTimeResults` | bool | 응답 1회만 조회 허용 |
| `accessCode` | 문자열 \| null | 액세스 코드 |
| `ipRestriction` | 문자열 \| null | 허용 IP (CIDR 멀티라인) |
| `allowLateSubmit` | bool | 지각 제출 허용 |
| `lateSubmitDeadline` | `'2026-04-20T23:59'` \| null | 지각 마감일 (null 이면 무제한) |
| `gracePeriod` | 정수 (분) | 마감 후 유예시간 |
| `disableAutoSubmit` | bool | 자동 제출 5분 유예 (이용 종료 일시 필수) |
| `assignments` | `[{id, assignTo:[{type, id, label}], dueDate, availableFrom, availableUntil}]` | 추가 기간 설정 |
| `notice` | 문자열 \| null | 응시 전 안내사항 |
| `createdAt` | ISO 문자열 (api 모드) | 정렬용 |

### Question 객체

공통 필드: `id`, `order`, `type` (QUIZ_TYPES 키), `title` (선택), `text` (HTML/문자열), `points`, `autoGrade` (bool/'partial'/null), `difficulty` (`'high'|'medium'|'low'|''`), `correct_comments`, `incorrect_comments`, `neutral_comments`, `gradedCount`, `totalCount`, `avgScore`.

유형별 추가 필드:

| 유형 | 추가 필드 |
| --- | --- |
| `multiple_choice` | `choices: []`, `correctAnswer` (텍스트 또는 인덱스) |
| `true_false` | `correctAnswer: '참'|'거짓'`, `choices: ['참','거짓']` |
| `multiple_answers` | `options: []` (또는 `choices`), `correctAnswer` (인덱스 배열 / 텍스트 배열 / `"A, B, C"` 문자열), `scoringMode: 'partial'|'all_correct'` |
| `short_answer` | `correctAnswer` (문자열 또는 `acceptedAnswers: []`) |
| `essay` | `correctAnswer: null` (수동채점, 채점 기준 `rubric` 별도) |
| `numerical` | `correctAnswer: '15'` 등 숫자 문자열, `tolerance` (허용 오차) |
| `formula` | `formula: 'sqrt(a^2+b^2)'`, `variables: [{name, min, max, decimals}]`, `tolerance`, `toleranceType: 'absolute'|'percent'` |
| `matching` | `pairs: [{left, right}]`, `distractors: []` (오답 보기) |
| `fill_in_multiple_blanks` | `blanks: [[정답1, 동의어...], ...]` 또는 `correctAnswer: [[...],...]` |
| `multiple_dropdowns` | `dropdowns: [{label, options:[], answerIdx}]` |
| `file_upload` | `allowedFileTypes: ['pdf','png','jpg','hwp']`, `maxFileSize: '10MB'` |
| `text` | 점수/배점 없음, 안내문 전용 |

### QUIZ_TYPES 매핑 (label, autoGrade)

| key | label | autoGrade |
| --- | --- | --- |
| `multiple_choice` | "객관식" | true |
| `true_false` | "참/거짓" | true |
| `multiple_answers` | "복수 선택" | true |
| `short_answer` | "단답형" | "partial" (부분 자동) |
| `essay` | "서술형" | false |
| `numerical` | "수치형" | true |
| `formula` | "수식형" | true |
| `matching` | "연결형" | true |
| `fill_in_multiple_blanks` | "다중 빈칸 채우기" | true |
| `multiple_dropdowns` | "드롭다운 선택" | true |
| `file_upload` | "파일 첨부" | false |
| `text` | "텍스트" | null (채점 없음) |

### Attempt 객체 (응시 결과, `xnq_student_attempts` 저장)

`{ id, studentId, studentName, studentNumber, department, quizId, answers: {qId: value}, autoScores: {qId: score}, totalAutoScore, totalPossibleAuto, manualPending, submittedAt, timeTaken (분), autoSubmitted (bool), isLate (bool), scorePolicy, manualScores: {qId: score} }`

### Bank / BankQuestion (`MOCK_BANKS`, `MOCK_BANK_QUESTIONS`)

- Bank: `{id, name, course, courseCode, difficulty: '|high|medium|low', updatedAt, usedInQuizIds: []}`
- BankQuestion: Question 공통 필드 + `bankId`, `usageCount`, `rubric` (서술형 채점 기준)

### 학생 객체 (`mockStudents`, `getQuizStudents(quizId)`)

`{ id: 's1', studentId: '2021001', name: '김민준', department: '컴퓨터공학과', score, startTime, endTime, submitted, submittedAt, response, autoScores: {...}, manualScores: {...} | null, selections: {qId: 학생답안}, isLate?: bool, autoSubmitted?: bool, fudgePoints?: 숫자 }`

### MOCK_COURSES
`[{id:'cs301', name:'CS301 데이터베이스'}, 'cs201 운영체제', 'cs401 알고리즘', 'cs102 자료구조']` 4개.

---

## S-01. 퀴즈 목록 (`/`)

`src/pages/QuizList.jsx` 가 `role` 분기. 교수자: `InstructorQuizList`, 학생: `StudentQuizList`.

현재 코스는 하드코딩: `const CURRENT_COURSE = 'CS301 데이터베이스'`. 목록은 이 코스만 노출.

### S-01-A. 교수자 뷰

#### 헤더 영역

| 요소 | 텍스트 / 노출 조건 | 동작 |
| --- | --- | --- |
| 페이지 제목 | "퀴즈 관리" | - |
| 전역 설정 톱니 아이콘 | `Settings2` 아이콘 (title="퀴즈 전역 설정") | `QuizSettingsDialog` 열림 |
| "가져오기" 버튼 | `outline` variant, `FolderInput` 아이콘 | `QuizImportModal` 열림 |
| "새 퀴즈" 버튼 | `default` variant, `Plus` 아이콘 | `<Link to="/quiz/new">` |

#### 필터 / 정렬 영역

| 요소 | 옵션 | 동작 |
| --- | --- | --- |
| 주차 드롭다운 (`WeekSessionFilter`) | "전체 주차", "미지정", "1주차"~"16주차" | 변경 시 차시는 "전체 차시" 로 리셋 |
| 차시 드롭다운 | "전체 차시" + 해당 주차의 차시들 | filterWeek === 'all' 일 때 비활성 |
| 정렬 드롭다운 | "최근생성순" (`recent`), "주차 오름차순" (`week-asc`), "주차 내림차순" (`week-desc`), "마감임박순" (`deadline`) | - |

마감임박순 동작: dueDate 없는 항목 뒤로, 이미 지난 마감 뒤로, 미래 마감 가까운 순.

#### 카드 (교수자 모드)

카드 클릭 → `/quiz/{id}` 이동. 카드 내부 `<DropdownMenu>` 와 인라인 통계는 stopPropagation.

**카드 상단 라인 (배지들)**
- `VisibilityBadge`: "공개" (Eye 아이콘) / "비공개" (EyeOff 아이콘). draft 면 미표시.
- `StatusBadge`: `displayStatus` 기준 — "진행중" (open, 초록), "채점중" (grading, 호박), "마감" (closed, 회색), "임시저장" (draft, 파랑), "예정" (scheduled, 호박)
- 주차/차시 회색 배지 (`{week}주차 {session}차시`)

**displayStatus 결정 로직**
- `isScheduled(quiz)` (open + startDate 미래) → `'scheduled'`
- open + `isDeadlinePassed(quiz)` → `'closed'`
- 그 외 → `quiz.status` 그대로

**카드 중단**
- 제목 (`text-base font-semibold`, truncate)
- 응시 기간: "{startDate} ~ {dueDate}", 둘 다 없으면 "응시 기간 제한 없음"
- 이용 종료 정보 (있을 때): " | 이용 종료: {lockDate}" + 지나면 "(종료됨)" 부착
- D-day 배지: status==='open' && !scheduled 일 때만. 0일 남으면 "D-0" 빨간색, 그 외 "D-{n}" 호박색
- 지각 제출 안내 (allowLateSubmit && lateSubmitDeadline): "지각 제출: {lateSubmitDeadline}까지" 호박색
- 지각 제출 무제한 (allowLateSubmit && !lateSubmitDeadline && dueDate): "지각 제출: 무제한 허용" 호박색

**카드 우측 인라인 통계 (hidden sm:flex, 모바일에서 숨김)**

`getInlineStats(quiz, scheduled)`:
- `draft` 또는 `scheduled` 인 경우 3지표:
  - "문항 수" `{questions}개`
  - "총점" `{totalPoints}점`
  - "제한시간" `{timeLimit}분` 또는 "없음"
- 그 외 4지표:
  - "응시율" `{submitRate}%`
  - "응시인원" `{submitted}명`
  - "미제출" `{unsubmitted}명` (>0 이면 `text-red-500` 빨강 강조)
  - "평균점수" `{avgScore}점` 또는 "-", `text-primary` 파랑 강조

**카드 메뉴 (점 3개, `MoreVertical`)**

| 항목 | 아이콘 | 노출 조건 | 동작 |
| --- | --- | --- | --- |
| "편집" | Pencil | 항상 | `/quiz/{id}/edit` |
| "미리보기" | Eye | 항상 | `/quiz/{id}/attempt?preview=true` |
| "복사" | Copy | 항상 | `QuizCopyModal` 열림 |
| "학생에게 숨기기" / "학생에게 공개" / "비공개 (임시저장)" | EyeOff/Eye | draft 면 disabled + 라벨 "비공개 (임시저장)" + title="임시저장 상태에선 자동 비공개입니다" | `handleToggleVisibility` 호출 + 토스트 |
| "채점" | ClipboardList | `canGrade` (scheduled 아님 + status `grading\|closed\|open`) | `/quiz/{id}/grade` |
| "통계" | BarChart3 | `canGrade` 와 동일 | `/quiz/{id}/stats` |
| "삭제" | Trash2 | 항상, `variant="destructive"` | `ConfirmDialog` 띄움 |

메뉴 항목 사이 `DropdownMenuSeparator` 가 그룹 구분.

#### 카드 스켈레톤
`QuizCardSkeleton` — api 모드 로딩 시 3개 렌더.

#### 빈 상태 (교수자)
- `<FileText size={32} className="mb-3 opacity-40" />`
- 텍스트: "해당 조건에 맞는 퀴즈가 없습니다."

#### S-01-A 모달 카탈로그

**(A) `QuizCopyModal` — 퀴즈 복사**
- 타이틀: "퀴즈 복사"
- 서브: 원본 퀴즈 제목 truncate
- 과목 검색 인풋 (placeholder "과목 검색")
- 검색 결과 없을 때: "검색 결과가 없습니다"
- 코스 카드 목록 (MOCK_COURSES). 현재 코스에는 우측에 "현재 과목" 라벨
- `ResetNotice mode="copy"`: "퀴즈를 복사한 후 아래 항목들은 초기화되므로 다시 설정해 주세요." + 6개 항목:
  - 주차/차시 → "미지정"
  - 응시 기간 → "설정 안함"
  - 성적 공개 정책 → "공개 안함"
  - 지각 제출 → "비활성화"
  - 접근 코드·IP 제한 → "제거"
  - 추가 기간 설정 → "설정 안함"
- 푸터: "취소" (ghost) / "복사하기" (default, 코스 미선택 시 disabled)
- 성공 토스트: "'{title}'을(를) {label}으로 복사했습니다" (label은 현재 과목이면 "현재 과목")
- 실패 토스트: "복사 중 오류가 발생했습니다"

**(B) `QuizImportModal` — 다른 과목 퀴즈 가져오기**
- 타이틀: "다른 과목 퀴즈 가져오기"
- 서브: "가져온 퀴즈는 임시저장 상태로 추가됩니다"
- 좌측 패널: 과목 검색 + 코스 목록 (현재 코스 제외). 로딩/에러/빈 상태 안내문구:
  - 로딩: "불러오는 중"
  - 에러: `loadError` 메시지
  - 빈: "다른 과목이 없습니다" / "검색 결과 없음"
- 우측 패널: 선택된 코스의 퀴즈 (draft 제외)
  - 미선택: "좌측에서 과목을 선택하세요"
  - 로딩: "불러오는 중"
  - 빈: "공개된 퀴즈가 없습니다"
  - 각 퀴즈 행: 체크박스 + StatusBadge + 제목 + "{questions}문항 · {totalPoints}점 · {dueDate}"
- `ResetNotice mode="import"` (체크된 항목 있을 때만 표시)
- 푸터: "{N}개 선택됨" / "취소" / "가져오기" (선택 0 이면 disabled)
- 성공 토스트:
  - 1개: "'{title}' 가져오기 완료 — 목록에서 편집하세요"
  - 2+개: "퀴즈 {N}개 가져오기 완료 — 임시저장 상태로 추가되었습니다"

**(C) `QuizSettingsDialog` — 퀴즈 전역 설정**

- 타이틀: "퀴즈 전역 설정"
- 서브: "이 설정은 모든 퀴즈에 공통으로 적용됩니다."
- 섹션 1: "복수선택 채점 방식"
  - 라디오 1: "전체 정답 시에만 만점" — 설명 "정답을 모두 맞혀야 점수를 받습니다. 하나라도 틀리면 0점."
  - 라디오 2: "정답 비율 배점 (부분 점수)" — 설명 "맞힌 정답 비율만큼 부분 점수를 받습니다."
  - partial 선택 시 "오답 감점 방식" 하위 라디오 3개:
    - "감점 없음" — "오답을 선택해도 감점하지 않습니다."
    - "오답 차감" — "오답 1개당 정답 1개분의 점수를 차감합니다." 공식 툴팁: "(정답 수 - 오답 수) / 전체 정답 수 x 배점 (최소 0점)"
    - "추측 보정 감점" — "선택지 수에 따라 감점을 자동 조절하여, 찍기를 억제합니다." 공식 툴팁: "(정답 수 - 오답 수 / (선택지 수 - 1)) / 전체 정답 수 x 배점 (최소 0점)"
  - partial 선택 시 "채점 시뮬레이션" 아코디언 (열림/접힘)
    - 배점/선택지/정답 수 인풋
    - 선택지 버튼 A~J (`CHOICE_LABELS`) — 정답은 "정답" 작은 라벨 부착, 선택 시 정/오답 색상 분기
    - 결과 3열: "감점 없음" / "오답 차감" / "추측 보정" 점수 비교, 현재 설정된 방식 강조
    - "선택지를 클릭해보세요" 또는 "정답 N개, 오답 N개 선택" / "초기화" 링크
- 섹션 2: "정답 판정"
  - 토글 "영문 대소문자 구분" + 설명. OFF 시 안내 "현재: \"Answer\"와 \"answer\"를 동일한 정답으로 처리합니다." / ON 시 호박 경고 박스 "\"Answer\"와 \"answer\"를 다른 답으로 처리합니다. 학생 혼란 방지를 위해 퀴즈 안내사항에 명시를 권장합니다."
  - 토글 "띄어쓰기 구분" + 동일 패턴 안내 ("key word"와 "keyword")
- 푸터: "취소" / "저장"
- 저장 시 `xnq_global_settings` 영속화 + `window.dispatchEvent('xnq-settings-changed')` 발행

**(D) `ConfirmDialog` — 퀴즈 삭제**
- 타이틀: "퀴즈 삭제"
- 메시지: "'{title}' 퀴즈를 삭제하시겠습니까?\n삭제된 퀴즈는 복구할 수 없습니다."
- 버튼: "취소" / "삭제" (destructive 변형)
- 성공 토스트: "'{title}' 퀴즈가 삭제되었습니다"
- 실패 토스트: "삭제 중 오류가 발생했습니다"

#### S-01-A 토스트 메시지 카탈로그

| 트리거 | 메시지 |
| --- | --- |
| 복사 성공 | "'{title}'을(를) {label}으로 복사했습니다" |
| 복사 실패 | "복사 중 오류가 발생했습니다" |
| 가져오기 1개 | "'{title}' 가져오기 완료 — 목록에서 편집하세요" |
| 가져오기 다수 | "퀴즈 {N}개 가져오기 완료 — 임시저장 상태로 추가되었습니다" |
| 가져오기 실패 | "가져오기 중 오류가 발생했습니다" |
| 공개 토글 ON | "'{title}'을(를) 학생에게 공개했습니다" |
| 공개 토글 OFF | "'{title}'을(를) 학생에게서 숨겼습니다" |
| 공개 토글 실패 | "공개여부 변경 중 오류가 발생했습니다" |
| 삭제 성공 | "'{title}' 퀴즈가 삭제되었습니다" |
| 삭제 실패 | "삭제 중 오류가 발생했습니다" |
| 다른 화면에서 전달된 토스트 | `sessionStorage.getItem('xnq_toast')` 1회 표시 후 제거 |

토스트 자동 닫힘: 4초.

### S-01-B. 학생 뷰 (`StudentQuizList`)

#### 헤더
- "내 퀴즈" 제목만. 새 퀴즈/가져오기/전역 설정 없음
- 학생 모드 안내 배너 (Layout에서 처리됨)

#### 필터 / 정렬
- WeekSessionFilter (위와 동일)
- 정렬 옵션 `STUDENT_SORT_OPTIONS`: "최근생성순", "주차 오름차순", "주차 내림차순", "마감임박순"

#### 카드 (학생 모드)

`isLockDatePassed(quiz)` 가 true 면 비활성 카드:
- `Lock` 아이콘 + 제목 (회색) + "이용이 종료되어 퀴즈 정보를 확인할 수 없습니다"
- `opacity-60`

그 외 `StudentQuizCard`:
- StatusBadge (`studentDisplayStatus` — scheduled / open / closed 만 표시, 채점중 노출 X)
- 응시 배지: `myAttempt` 있으면 "응시완료" 파란 배지 / 없으면 "미응시" 회색 배지 (단 scheduled 면 null)
- 주차/차시 배지
- 제목
- 응시 기간 + lockDate 정보
- D-day 배지

**우측 통계**
- 미응시: 3지표 "문항 수 {questions}개", "총점 {totalPoints}점" (모바일 숨김), "제한시간 {timeLimit}분 또는 없음"
- 응시 후: 1지표 "내 점수 {score}/{totalPossible}점" 또는 reveal.label ("비공개" / "공개 예정")

**카드 하단 푸터 (`StudentScoreFooter`, 조건부)**
- `myAttempt.manualPending > 0 && released`: "수동채점 {N}문항 대기 중 (0점 반영)" (호박색, AlertCircle 아이콘)
- 응시 2회 이상: "응시 기록 N회 ▼/▲" 토글 버튼
- 펼치면 회차별 점수/제출일시/공개여부, 마지막 "(최근)" 표시
- 미공개 회차는 "비공개"
- 수동채점 대기가 있는 회차 점수 옆 ` *` + 하단 안내 "* 수동채점 대기 0점 반영"

#### `computeScoreReveal(quiz, myAttempt)` 로직
- `scoreRevealEnabled` 모드: timing met = immediately(항상) / after_due(dueDate 경과) / period(기간 내)
- 결과: `{released, totalScore, totalPossible, label}` — label은 "비공개" 또는 "공개 예정"

#### 빈 상태 (학생)
- 필터 적용 시: "해당 조건에 맞는 퀴즈가 없습니다."
- 무 필터 + 0개: "현재 응시 가능한 퀴즈가 없습니다."

#### 반응형 분기 (S-01 공통)
- `sm:flex` (≥640px) 이상에서 인라인 통계 노출
- 모바일에서는 통계 3지표 중 일부만 노출 (`hideOnMobile` 플래그)
- `max-w-5xl` 컨테이너

---

## S-02. 퀴즈 생성 (`/quiz/new`)

`src/pages/QuizCreate.jsx`. 권한 가드: `role !== 'instructor'` 이면 `/` 리다이렉트.

### 페이지 헤더
- 제목: "새 퀴즈 만들기"
- 탭 2개 (라인 variant): "기본 정보" / "문항 구성"

### 하단 액션 바
- "취소" (ghost, 좌측, `text-muted-foreground`)
- "임시저장" (outline)
- "저장하기" (default)

취소 시 작성 중인 내용 있으면 `ConfirmDialog`:
- 타이틀: "작성 취소"
- 메시지: "작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?"

`hasChanges` = title || description || questions.length > 0

### 탭 1: 기본 정보 (`InfoTab`)

#### 섹션 "퀴즈 유형"
- 카드 2개 (큰 라디오):
  - "평가용 퀴즈" — "성적에 반영됩니다"
  - "연습용 퀴즈" — "성적에 반영되지 않습니다"
- `quizMode === 'practice'` 시 호박 안내: "연습용 퀴즈는 성적에 반영되지 않습니다."

#### 섹션 "기본 정보"
- 필드 "퀴즈 제목" (필수, 빨간 별표). placeholder "예) 중간고사 - 데이터베이스 설계"
- 필드 "설명". textarea rows=8, placeholder "학생에게 표시될 퀴즈 설명 (선택)"
- 라벨 "주차/차시" + `WeekSessionPicker` (코스별 주차/차시 옵션 localStorage 저장)

#### 섹션 "응시 기간"
- 그리드: "시작 일시" / "마감 일시" (마감 일시 라벨에 `HelpCircle` 툴팁: "학생이 퀴즈를 제출해야 하는 기한입니다.<br />마감 이후에는 제출이 불가합니다.")
- "미설정 시 응시 기간 제한 없이 학생이 언제든 응시할 수 있습니다."
- 필드 "이용 종료 일시" (툴팁: "퀴즈 페이지 자체에 접근할 수 없게 되는 시점입니다.<br />마감 이후에도 학생이 결과를 확인할 수 있도록<br />종료 일시는 마감 일시 이후로 설정하는 것을 권장합니다.") + "이용 종료 일시가 지나면 학생은 퀴즈 정보를 확인할 수 없습니다. 미설정 시 제한 없음."
- 이용 종료 < 마감일 시 호박 경고: "이용 종료 일시가 마감 일시보다 앞서 있습니다. 마감 전에 퀴즈 접근이 차단될 수 있습니다."
- 토글 "마감 후 지각 제출 허용"
- 지각 제출 ON 시 들여쓰기: 라벨 "지각 제출 마감 일시" + DateTimePicker (min=dueDate) + "미설정 시 무제한 허용"

#### 섹션 "추가 기간 설정" (`AssignmentOverrides`)
- 설명: "특정 학생 또는 학과(그룹)에 기본 응시 기간과 다른 마감일 또는 열람 기간을 개별 설정합니다."
- "+ 추가 기간 설정 추가" 점선 버튼
- 각 추가 행:
  - "추가 대상 {idx+1}" + "삭제" 버튼 (ghost)
  - "대상 학생/그룹" 라벨 + 선택 수 + "대상 선택" 버튼 (UserPlus 아이콘) → `AssignTargetModal`
  - 선택된 대상 테이블 (학과 그룹 / 학생 분리)
  - 비어있으면 "선택된 대상이 없습니다. 아래 [대상 선택] 버튼으로 추가해주세요."
  - 그리드 3열: "시작 일시" / "마감 일시" / "이용 종료 일시" (DateTimePicker size="sm")
  - 검증 메시지:
    - "마감 일시는 시작 일시 이후여야 합니다."
    - "이용 종료 일시는 마감 일시 이후로 설정해주세요."

`AssignTargetModal`:
- 타이틀 "추가 대상 선택" / 서브 "추가 기간을 적용할 학생 또는 학과(그룹)를 선택합니다."
- 탭: "학생" / "학과 그룹" (선택 카운트 배지)
- 검색 placeholder: "이름·학번·학과로 검색" 또는 "학과명으로 검색"
- 학생 탭 정렬 드롭다운 (placeholder "정렬")
- 표 컬럼: 체크박스 + 이름 / 학번 / 학과
- 다른 추가 대상에 이미 포함된 학생 disabled + title "다른 추가 대상에 이미 포함된 학생입니다"
- 푸터: "{N}개 선택됨 (학생 N명, 그룹 N개)" / "취소" / "완료"

#### 섹션 "응시 설정"
- 토글 "시간 제한 사용" (`!unlimitedTimeLimit`)
  - 들여쓰기: 분 입력 (placeholder "60", min 1) + "분" 단위
  - 토글 "자동 제출 5분 유예" (라벨에 툴팁 "이용 종료 일시 설정이 필수입니다.") + 설명 "제한 시간이 끝난 후 5분간 직접 제출이 가능하고, 5분이 지나면 자동 제출됩니다"
- 토글 "재응시 허용" + 설명 "학생이 같은 퀴즈에 여러 번 응시할 수 있습니다"
  - 들여쓰기: "적용할 점수" 드롭다운 (`SCORE_POLICIES`: 최고 점수 유지 / 최신 점수 유지 / 평균 점수)
  - "제출 횟수 제한" 드롭다운 (`ATTEMPT_OPTIONS`: 2회~10회, 무제한)

#### 섹션 "문항 표시 설정"
- 토글 "선지 순서 섞기" + "객관식 문항의 선지 순서가 학생마다 무작위로 표시됩니다"
- 토글 "문제 순서 섞기" + "문제 순서가 학생마다 무작위로 표시됩니다"
- 토글 "한 번에 한 문항씩 표시" + "학생에게 문항을 1개씩만 보여주고 이전/다음 버튼으로 이동합니다"
- 들여쓰기 (`oneQuestionAtATime` 일 때): 토글 "응답 후 문항 잠금" + "다음으로 이동하면 이전 문항으로 돌아갈 수 없습니다"

#### 섹션 "성적 공개 정책"
- 토글 "성적 공개" + "제출 후 학생에게 성적 정보를 공개합니다"
- ON 시:
  - "공개 범위" 라벨 + 카드 2개:
    - "오답 여부만" — "정오답(✓/✗) + 점수 표시\n정답은 공개하지 않습니다"
    - "정답까지" — "정오답(✓/✗) + 점수 + 정답 표시"
  - "공개 시점" 라벨 + 라디오 3개:
    - "제출 즉시" — "학생이 제출하는 순간 바로 공개됩니다"
    - "마감 후" — "퀴즈 마감일이 지나면 자동으로 공개됩니다"
    - "기간 설정" — "지정한 기간에만 공개됩니다"
  - 기간 설정 선택 시 "공개 시작일" / "공개 종료일" DateTimePicker 노출
  - 토글 "응답 1회만 조회 허용" + "제출 직후 1회만 응답과 정답을 보여주고 이후 재접근 시 비공개 처리합니다"

#### 섹션 "퀴즈 접근 제한" (우측 헤더 스위치)
- OFF 안내: "접근 제한이 필요한 경우 우측 토글로 활성화하세요."
- ON 시:
  - 필드 "액세스 코드" + placeholder "코드를 입력하면 응시 시 코드 입력이 필요합니다" + "비워두면 액세스 코드 없이 응시 가능합니다."
  - 필드 "접근 가능한 IP 주소" textarea rows=3, placeholder "허용할 IP 주소를 한 줄에 하나씩 입력하세요\n예) 192.168.1.0/24\n    203.0.113.10" + "비워두면 모든 IP에서 접근 가능합니다. (CIDR 표기법 지원)"

#### 섹션 "퀴즈 안내사항" (우측 헤더 스위치)
- OFF 안내: "안내사항을 표시하려면 우측 토글로 활성화하세요."
- ON 시: 안내 "응시 전 학생에게 표시될 안내 문구입니다." + textarea (DEFAULT_NOTICE 기본값:
  ```
  - 제출 후에는 답안을 수정할 수 없습니다.
  - 타인과의 협력 및 자료 공유는 금지됩니다.
  - 부정행위 적발 시 해당 퀴즈 점수는 0점 처리됩니다.
  ```
  )

#### 섹션 "퀴즈 공개 여부"
- 토글 "학생에게 퀴즈 공개" + "비공개 시 학생 화면에 퀴즈가 표시되지 않습니다. 임시저장 상태는 자동 비공개입니다."

### 탭 2: 문항 구성 (`QuestionsTab`)

#### 헤더 라인
- "{questions.length}문항 | 총 {totalPoints}점"
- 우측 버튼 2개:
  - "문항 만들기" (outline) → `AddQuestionModal`
  - "문제모음에서 추가" (default) → `Popover` 2개 메뉴:
    - "직접 선택 / 문제모음에서 원하는 문항을 골라 추가합니다" → `QuestionBankModal`
    - "랜덤 출제 / 조건에 맞는 문항을 자동으로 선택합니다" → `RandomQuestionBankModal`

#### 빈 상태
- 점선 박스 + "아직 추가된 문항이 없습니다"

#### 문항 행
- 드래그 핸들 (`GripVertical`)
- 번호 (1, 2, ...)
- TypeBadge (예: "객관식", "참/거짓", ...)
- "{points}점"
- 수동채점 배지 (autoGrade === false 시): "수동채점" 호박
- 호버 시 우측 아이콘 노출:
  - 편집 (`Pencil`) — QuizCreate 에선 실제 onClick 없음 (UI만)
  - 삭제 (`Trash2`) — `removeQuestion(q.id)`
- 문제 본문 (HTML 태그 제거, line-clamp-2)
- 정답 미리보기 (`QuestionAnswer`) — essay/file_upload/text 유형 제외

### 검증 (`getValidationErrors`)

순서대로 첫 오류만 AlertDialog 표시:
1. "퀴즈 제목을 입력해주세요"
2. "마감 일시는 시작 일시 이후여야 합니다"
3. "이용 종료 일시는 마감 일시 이후로 설정해야 합니다"
4. "지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용할 수 있습니다"
5. "제한 시간을 입력하거나 무제한으로 설정해주세요"
6. "자동 제출 5분 유예 사용 시 이용 종료 일시를 반드시 설정해야 합니다"
7. "최소 1개 이상의 문항을 추가해주세요"
8. "동일한 학생이 여러 추가 기간 설정에 포함되어 있습니다"

### 임시저장 검증
임시저장은 제목만 검증. 미입력 시 AlertDialog "임시저장 불가" / "퀴즈 제목을 입력해주세요."

### 저장 확인 (`handlePublish`)
재응시 허용 + 점수 공개 ON + timing이 period/after_due 아닌 경우 (= immediately) ConfirmDialog:
- 타이틀: "점수 공개 기간 미설정"
- 메시지: "재응시가 허용된 퀴즈에서 점수 공개 기간이 설정되지 않으면, 1차 응시 마감 직후 점수(및 정답)가 공개되어 학생이 2차 응시 전에 정답을 확인할 수 있습니다.\n\n점수 공개 기간을 설정하지 않고 저장하시겠습니까?"

성공 시 `/` 로 이동.
임시저장 성공 시 AlertDialog "임시저장 완료" / "퀴즈가 임시저장되었습니다."

---

## S-03. 퀴즈 상세 (`/quiz/:id`)

`src/pages/QuizDetail.jsx`. `role` 분기 — 학생/교수자.

### 공통: 로딩 / 미존재
- 로딩 중: "로딩 중"
- 미존재: "퀴즈를 찾을 수 없습니다."

### 교수자 헤더 (`PageHeader`)
- 뒤로가기 화살표 + "뒤로가기" 텍스트
- 제목 (퀴즈 제목)
- meta: StatusBadge + 주차/차시 배지 + `CalendarRange` 아이콘 배지 (응시 기간)
- 액션 우측:
  - "채점" 버튼 (`ClipboardCheck` 아이콘) — `canGrade` 일 때 (grading/closed/open + !scheduled)
  - "통계" 버튼 (`BarChart3` 아이콘) — `canStats` (status !== 'draft')
  - 점 3개 메뉴:
    - "편집" → `/quiz/{id}/edit`
    - "미리보기" → `/quiz/{id}/attempt?preview=true`
    - 구분선
    - "삭제" (destructive) → ConfirmDialog "퀴즈 삭제" + 동일 메시지 + 토스트는 `sessionStorage('xnq_toast')` 로 목록 이동 후 표시

### 학생 헤더
- 제목 영역 안에 StatusBadge (`studentDisplayStatus`) + 주차/차시 배지 + h1
- 액션:
  - scheduled 면: 호박색 작은 텍스트 "{startDate} 시작"
  - 응시 가능 + 횟수 미초과: "응시하기" 또는 "재응시" (attempts > 0)
  - 응시 가능 + 횟수 초과: 비활성 "응시하기" + 호버 툴팁 "응시 가능 횟수({maxAttempts}회)를 초과했습니다"
- meta: "응시 기간 {period}" + "지각 제출 {label}"

### 퀴즈 설명 카드
- description 있을 때만, `whitespace-pre-wrap` 으로 표시

### 요약 카드 (5열 학생 / 4열 교수자)

학생 5지표:
- "점수" {totalPoints}점
- "문제" {questions}개
- "시간 제한" {timeLimit}분 또는 "제한 없음"
- "응시 횟수" {allowAttempts}회 또는 "무제한"
- "성적 공개" `scoreRevealCardLabel`:
  - 미설정: "즉시 공개"
  - 비활성: "비공개"
  - after_due: "마감 후 공개"
  - period + scoreRevealStart 있음: "{M}/{D} 공개"
  - period + scoreRevealStart 없음: "기간 내 공개"
  - 그 외: "즉시 공개"

교수자 4지표: "문항 수", "총점", "제한 시간", "응시 횟수"

### 교수자 상세 섹션 (md 2열)

**"응시 조건"**
- "응시 기간"
- "이용 종료" (지나면 "(종료됨)")
- "지각 제출"
- "제한 시간"

**"응시 정책"**
- "응시 횟수"
- "점수 정책" (다회 응시 시만)
- "문항 셔플" 사용/사용 안함
- "보기 셔플" 사용/사용 안함
- "한 문항씩 표시" 사용/사용 안함
- "답변 후 잠금" 사용/사용 안함

**"성적 공개"**
- "공개 정책" — `scoreRevealBadge` 라벨:
  - 미설정: "설정 없음"
  - 비활성: "비공개"
  - after_due: "{점수만 또는 정답 포함} · 마감 후 공개"
  - period + 시작/종료 있음: "... · {start} ~ {end}"
  - period 그 외: "... · 공개 기간 지정"
  - 그 외: "... · 즉시 공개"
- "공개 시작" / "공개 종료" (period 일 때)
- "결과 확인" — "1회만 허용" 또는 "제한 없음"

**"접근 제한"**
- "접근 코드" — "설정됨" / "설정 안함"
- "IP 제한" — 텍스트 또는 "설정 안함"
- "학생 노출" — "숨김" / "공개"
- "추가 기간 설정" — "{N}건" (있을 때만)

### 학생 응시 결과 섹션 (`StudentResultSection`)

#### 최근 응시 결과 카드
- "최근 제출" + submittedAt (Date 객체면 ko-KR 변환)
- isLate 시: AlertCircle + "지각 제출" 호박 배지
- "점수" 우측: `reveal.showScore` 이면 `{autoScore} / {totalPoints}`, 아니면 "공개 예정". 채점 가능한 문제 없으면 "점수 없음"
- manualPending > 0 시 하단 띠: "서술형 {N}개 문항은 채점이 완료되면 점수에 반영됩니다."

#### oneTimeResults 처리
- 이미 1회 조회한 학생: 카드 표시
  - Eye 아이콘 + "응답은 1회만 조회할 수 있습니다" + "이미 결과를 확인하여 더 이상 응답과 정답을 조회할 수 없습니다."
- 새로 보는 경우 `markResultViewed(attempt.id)` 호출

#### 문항별 채점 결과
- showWrongAnswer 일 때만 렌더, 아니면 안내 카드 (EyeOff 아이콘 + "성적은 공개되지 않습니다" + "교수자가 설정한 공개 시점이 되면 문항별 채점 결과를 확인할 수 있습니다.")
- 각 문항 카드:
  - "Q{idx+1}" + 본문 요약 (line-clamp)
  - 우측 상태 배지: "채점 대기" / "정답" (emerald) / "부분점수 {scored}/{points}" (amber) / "오답" (red)
  - showAnswer && !isCorrect 시 정답 영역 (`QuestionAnswer`)
  - 피드백 (정답/오답/무조건) 카드 — correct_comments / incorrect_comments / neutral_comments

#### 교수자 코멘트 카드
- 제목 "교수자 코멘트"
- `CommentThread` 컴포넌트 (role="student")

---

## S-04. 퀴즈 편집 (`/quiz/:id/edit`)

`src/pages/QuizEdit.jsx`. 권한: instructor only.

S-02와 거의 동일 구조. 차이점:
- 제목: "퀴즈 편집"
- form 초기값을 기존 quiz 에서 채움
- 임시저장 버튼은 quiz.status === 'draft' 일 때만 노출
- 문항 탭 우측 "문제지 인쇄" 버튼 (`Printer` 아이콘) 추가, questions.length === 0 면 disabled
- 저장 시 status 자동 재오픈: closed + 마감일이 미래로 변경되면 status → 'open'

### 문항 행 추가 사항
- 정답 변경 시 "재채점 예정" 배지 (`RefreshCw` 아이콘)
- 호버 시 편집 아이콘 클릭 → `AddQuestionModal` 편집 모드

### 문항 편집 모달 (`AddQuestionModal`, 편집 모드)
- 제출 학생 있을 때 상단 호박 안내: "이 문항은 이미 {N}명이 응시했습니다. 수정 시 기존 제출 답안과 채점 결과에 영향을 줄 수 있습니다."
- 정답 변경됨 + 자동채점 유형 + 제출 학생 > 0 → 저장 시 `RegradeOptionsModal`:
  - 타이틀: "재채점 옵션 선택" / "정답이 변경된 문항에 대해 재채점 방식을 선택하세요"
  - 호박 안내: "이미 답안을 제출한 {N}명의 학생에 대한 재채점 옵션을 선택하십시오. 퀴즈 저장 시 일괄 재채점됩니다."
  - 라디오 4개:
    - "이전 정답과 수정된 정답 모두 인정" — "기존 점수가 낮아지지 않습니다. 새 정답에 맞는 학생에게 추가 점수를 부여합니다." (기본값)
    - "수정된 정답 기준으로만 재채점" — "새 정답 기준으로 자동 재채점됩니다. 일부 학생의 점수가 낮아질 수 있습니다."
    - "모든 학생에게 만점 부여" — "이 문항에 응시한 학생 전원에게 만점을 부여합니다."
    - "재채점 없이 문제만 업데이트" — "문제 내용만 변경하고 기존 채점 결과를 그대로 유지합니다."
  - "취소" / "업데이트"

### 비공개 토글 (Edit 전용)
- draft 일 때 토글 disabled + 라벨 동일 + 설명 "임시저장 상태에선 자동 비공개입니다. 게시 후 설정할 수 있습니다."

### 저장 후 동작
- 변경된 문항 정보 `localStorage('xnq_questions_modified')` 에 timestamp 저장
- 재채점 결과 `localStorage('xnq_regrade_log')` 에 저장
- 토스트 메시지:
  - 재채점 0명 + 재오픈 X: "저장되었습니다."
  - 재채점 0명 + 재오픈: "저장되었습니다. 마감 처리된 퀴즈가 다시 게시되었습니다."
  - 재채점 N명: "저장되었습니다. {N}명의 점수가 재채점되었습니다.{재오픈시 추가}"
- `sessionStorage('xnq_toast')` 에 저장 후 `/` 이동

### beforeunload 처리
변경사항 있을 때 `beforeunload` 등록 → 브라우저 기본 확인창.

### 취소 시
변경사항 있으면 ConfirmDialog:
- 타이틀 "편집 취소"
- 메시지 "저장하지 않은 변경사항이 있습니다. 저장하지 않고 나가시겠습니까?"

---

## S-05. 채점 대시보드 (`/quiz/:id/grade`)

`src/pages/GradingDashboard/index.jsx` + 12개 서브 파일.

### URL 파라미터
- `?mode=student` → 학생 중심 탭으로 시작 (기본은 문항 중심)
- `?studentId=...` → 학생 중심 모드일 때 자동 선택

### draft 차단 화면
status === 'draft' 시 전용 화면:
- 큰 원 아이콘 (`FileEdit`)
- 제목 "아직 응시가 시작되지 않았습니다"
- 본문 "이 퀴즈는 임시저장 상태입니다. 퀴즈를 공개하면 학생이 응시할 수 있습니다."
- 버튼 "퀴즈 편집하기" → `/quiz/{id}/edit`

### 상단 (`QuizInfoCard`)
- 뒤로가기 버튼 (페이지 자체 좌상단)
- 카드 좌측: 주차/차시 배지 + StatusBadge + 큰 제목 + 응시 기간 + 성적 공개 라인
- 카드 우측: 응시율 / 응시 인원 / 채점 완료 (3분할)
- 성적 공개 라인:
  - 비활성: "비공개" 회색 배지
  - 활성 + with_answer: "정답 포함" 파랑 + "{타이밍라벨}" 초록
  - 활성 + wrong_only: "점수만" + "{타이밍라벨}"
  - period: "{start} ~ {end}" 텍스트 부착

### 액션 바 (탭 + 우측 액션)

**탭 (line variant)**
- "문항 중심" / "학생 중심"

**우측 액션 버튼**
- "조건부 재응시" (`UserCheck` 아이콘) → `ConditionalRetakeModal`
- "내보내기" 드롭다운 (`Download` 아이콘 + `ChevronDown`):
  - 라벨 "문제지" + "문제지 PDF 다운로드"
  - 구분선
  - 라벨 "답안지" + "답안지 Excel 다운로드"
  - "답안지 PDF 일괄 다운로드"

PDF 생성 중에는 우하단 로딩 토스트: 회전 스피너 + "{type} PDF 생성 진행중"

### 모바일 탭 전환
- 모바일에서만 노출: "문항 목록" / "Q{n} 상세" 또는 "학생 목록" / "{name}" 토글 (`mobileView`)

### 문항 중심 모드

**좌측 패널 (`QuestionItem` 목록)**
- 헤더: "총 문항 {N}개" + 정렬 드롭다운 (`SORT_OPTIONS`): "미채점 우선", "문항 번호순"
- 미채점 문항 카드 → 채점 완료 그룹 (접힘 토글 "채점 완료 ({N}) ▼/▲")
- 각 QuestionItem:
  - "Q{order}" + TypeBadge + "완료" 초록 배지 (완료 시)
  - 본문 (line-clamp-1 제목 + line-clamp-2 본문)
  - "{points}점" 우측
  - 미완료 시 진행률 바 ("{graded}/{total}명" + "{progress}%")

**우측 패널 (`QuestionDetailPanel`)**
- 문항 정보 카드: Q번호 + TypeBadge + 점수 + 제목 + 본문 (RichText) + 선택지 (정답 강조) + 정답 안내 박스
- 재채점 안내 (있을 때): 호박 띠 "재채점 적용됨 | {옵션 라벨} ({N}명 점수 변경)"
- 탭 라인: "응시 현황" / "통계"
- 응시 현황 탭 우측 액션:
  - file_upload 일 때만 "제출물 일괄 다운로드" (`FolderDown` 아이콘) — 클릭 시 토스트 "프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다"
  - "전체 정답" (outline)
  - "전체 오답" 드롭다운: "전체 학생 0점 처리" / "미제출자만 0점 처리"
  - "엑셀 일괄 채점" (outline + Download)

`handleBulkGrade`:
- `window.confirm("{scope} {N}명 전원에게 {정답|오답}({score}점) 처리합니다.\n기존 채점 결과는 모두 덮어씁니다. 진행할까요?")`
- 토스트: "{scope} {N}명에게 {라벨} 처리했습니다" 또는 "{scope}가 없어 적용할 수 없습니다"

### 응시 현황 탭 (`ResponsesTab`)

**상단 필터 라인**
- 세그먼트 토글: "전체 / 정상제출 / 지각제출 / 미제출" 각 카운트 부착, 컬러 도트 (`bg-emerald-500` / `bg-amber-500` / `bg-gray-300`)
- "채점 상태" 필터 버튼 (`ListFilter` 아이콘) → 드롭다운 체크박스 "채점 완료" / "미채점"

**툴바**
- 검색 인풋 (placeholder "이름 또는 학번")
- 정렬 드롭다운 (`SORT_OPTIONS`): "이름순", "학번순", "제출일시순"
- 페이지 크기 드롭다운 (`PAGE_SIZE_OPTIONS`): "10명씩", "20명씩", "30명씩", "전체"

**StudentRow / UnsubmittedCard**
- 학생 메타: 이름 + 학번 회색 배지
- 제출 상태 배지 (SubmitBadge): "정상제출" 초록 / "지각제출" 호박 / "미제출" 회색
- 제출일시 (월-일 시:분만 표시)
- 자동채점 정답/오답 배지 (CorrectBadge): "정답" / "오답"
- 답안 영역: "제출한 답안" 회색 라벨 + 본문 (file_upload면 `FileSubmissionView`)
- 오답일 때 "정답 · {정답}" 부착
- 점수 컨트롤 (`ScoreControls`):
  - FudgeBadge (있을 때): `+{N}` 또는 `-{N}` 호박 + Sparkles 아이콘 + title "가산점 {N}점"
  - GradeStatusBadge: "미채점" 호박 / "채점완료" 회색
  - 점수 input (number, min 0, max points, step 0.5)
  - "/ {points}점" 단위
  - "저장" 버튼 (변경 없으면 disabled)
- 미제출 카드: "제출되지 않았습니다" 이탤릭 안내
- 변경/미채점 시 좌측 색 강조 바 (파랑/호박)

**페이지네이션**
- 1보다 큰 totalPages 일 때만 노출
- "{page} / {totalPages} 페이지" / "이전" / 페이지 번호 버튼 (최대 7개) / "다음"

### 통계 탭 (`StatsTab`)
- 요약 4지표: "문항 평균", "최고", "최저", "채점 완료" (/ N명)
- 점수 분포 차트 (BarChart) — 빈 상태: "채점 완료된 학생이 없습니다"
- 정답률 (자동채점 문항만): "{N}%" + 진행률 바 + "정답 {N}명 | 오답 {N}명"

### 학생 중심 모드

**좌측 패널 (`StudentListPanel`)**
- 검색 인풋 (placeholder "학생 이름 또는 학번 검색")
- 섹션 3개: "미채점" / "채점 완료" / "미제출" (각 N명) — 학생 없으면 미노출
- `StudentListItem` 각 행 클릭 → 우측 패널 전환

**우측 패널 (`StudentDetailPanel`)**
- 학생 정보 헤더: 아바타 (이름 첫 글자) + 이름 + 학번 + 점수 (큰 글씨 "{score} / {totalPoints}점") + 채점완료/미채점
- 제출 안한 학생: "제출된 답안이 없습니다"
- 탭 (line variant): "답안" / "활동 로그" / "코멘트" (안 읽은 개수 빨강 배지)
- 답안 탭 우측 액션:
  - "점수 저장 ({N})" 버튼 (변경 없으면 disabled)
  - 더보기 (`MoreVertical`) 드롭다운:
    - "모든 문항 정답"
    - "모든 문항 오답"
    - 구분선
    - "가산점{+N 또는 -N}" → 가산점 Popover
  - 가산점 Popover: "가산점 부여" + 설명 "총점에 +/- 점수를 가감합니다" + 마이너스 / 인풋 / 플러스 버튼 (step 0.5) / 취소 / 저장

`handleAllQuestionsGrade`: `window.confirm("{name} 학생의 모든 문항 {N}개를 {정답|오답} 처리합니다.\n기존 채점 결과는 모두 덮어씁니다. 진행할까요?")`

**답안 탭 (QuestionCard 목록)**
- 카드: Q번호 + TypeBadge + (정답/오답 / 미채점) + ("수정됨" 배지 — 자동채점 결과를 수동 오버라이드한 경우)
- 점수 입력 (변경 시 좌측 파랑 강조 바, 미채점이면 호박 강조 바)
- 문항 제목 + 본문
- 학생 답안 박스 ("제출한 답안" 회색 라벨)
- 답안 없음: "(답안 없음)" 이탤릭
- 자동채점 오답 시 "정답 · {정답}" 노출
- file_upload: `FileSubmissionView` 카드 (파일명 + 사이즈 + 다운로드 아이콘 버튼 title="파일 다운로드")

**활동 로그 탭 (`ActivityLogPanel`)**
- 빈 상태: FileText 아이콘 + "기록된 활동 로그가 없습니다" + "학생이 응시 페이지에서 수행한 행동(시작 / 문항 이동 / 답변 변경 / 포커스 이탈 / 제출)이 자동으로 기록됩니다. 이 학생은 본 화면에서 직접 응시하지 않아 기록이 없습니다."
- 통계 요약 5칸: "제출일시" (지각/자동 배지) / "응시 시작" / "소요 시간" / "포커스 이탈 ({N}회)" / "답변 변경 ({N}회)"
- 타임라인: 시:분:초 + 액션 배지 + 설명
- 액션 타입별 라벨:
  - `start`: "응시 시작" (Play, emerald) — "응시 페이지 진입"
  - `navigate`: "문항 이동" (ArrowRightLeft, blue) — "{from}번 → {to}번 ({본문 일부})"
  - `answer_change`: "답변 변경" (Pencil, violet) — "Q{order} {본문 일부}"
  - `focus_loss`: "포커스 이탈" (EyeOff, amber) — "탭/창 전환"
  - `focus_gain`: "포커스 복귀" (Eye, slate) — "화면으로 복귀"
  - `autosave`: "자동 저장" (Save, slate) — "응시 세션 저장"
  - `submit`: "제출" (Send, accent) — "시간 초과로 자동 제출" 또는 "학생 제출"

**코멘트 탭 (`CommentThread`)**
- 메시지 버블 (좌/우 분리, 발신자 라벨 + 본문 + 시간 stamp)
- 빈 상태: "아직 코멘트가 없습니다"
- textarea (placeholder "학생에게 전달할 코멘트" / "교수자에게 답변하기") + "전송" 버튼
- Enter = 전송 / Shift+Enter = 줄바꿈
- 탭 진입 시 자동 read 표시 (안 읽은 카운트 0)

### 모달 (`ExcelModal` — 엑셀 일괄 채점)
- 타이틀: "엑셀 일괄 채점"
- 가이드 박스: "일괄 채점 가이드" + "① 제공된 양식을 다운로드하여 점수를 입력해 주세요." + "② 파일을 저장한 뒤 업로드하면 완료됩니다." + "양식에 오류가 1개라도 포함되어 있으면 업로드되지 않습니다."
- 버튼 2개:
  - "양식 다운로드" (Download)
  - "파일 업로드" / "업로드 중" (Upload) — accept=".xlsx,.xls,.csv"
- 검증:
  - 점수가 배점 초과: "학번 {sid}: 점수({score})가 배점({maxPoints}점)을 초과합니다. 전체 업로드가 불가합니다."
  - 학번 매칭 실패: "학번 "{sid}"(이)가 수강생 목록에 없습니다. 채점 양식을 수정하지 마세요. 전체 업로드가 불가합니다."
- 오류 박스: "업로드 실패" + 위치 / 오류 내용 그리드
- 미리보기 박스: "업로드 내용 확인" + "{N}명 | {fileName}" + 이름/학번/점수 표 + "{N}명 점수 적용" 버튼

### 모달 (`ConditionalRetakeModal` — 조건부 재응시)

3-step 스테퍼: "조건 설정" → "대상자 확인" → "횟수 부여"

**Step 1: 조건 설정**
- 토글 "미응시자 포함" + "퀴즈에 응시하지 않은 학생을 재응시 대상에 포함합니다."
- 토글 "점수 미달자 포함" + "기준 점수 미만인 학생을 재응시 대상에 포함합니다."
  - ON 시: "기준 점수 [N]% 미만 ({thresholdScore}점 / {totalPoints}점)"
- 조건 미선택 시: "조건을 하나 이상 선택해주세요."
- 조건 충족 시: "총 {N}명 대상" + 세부 (미응시 N명 / 점수 미달 N명 / 채점 미완료 N명)

**Step 2: 대상자 확인**
- "총 {매칭}명 중 {최종}명 선택됨"
- 헤더: 전체 선택/해제 체크박스 + 이름 / 학번 / 학과 / 사유
- 사유 = "미응시" 회색 또는 "{N}점" / "채점 미완료" 빨강
- 빈: "조건에 해당하는 학생이 없습니다."

**Step 3: 횟수 부여**
- "{N}명에게 추가 응시 기회를 부여합니다." 헤더
- "추가 응시 횟수" + 마이너스/숫자/플러스 (1~5)
- "재응시 기한" + "미설정 시 기존 퀴즈 마감일을 따릅니다." + DateTimePicker
- 최종 요약: 대상 인원 / 추가 응시 횟수 / 재응시 기한 (또는 "퀴즈 마감일 따름") / 미응시자 N명 / 점수 미달 ({N}% 미만) N명

**하단 버튼 바**
- 좌: "이전" (step > 1)
- 우: "취소" + "다음" (또는 "재응시 부여" `UserCheck`)

저장 시 토스트: "{N}명에게 재응시 {N}회를 부여했습니다." (index.jsx)

### S-05 토스트 카탈로그

| 트리거 | 메시지 |
| --- | --- |
| 문제지 PDF 완료 | "문제지 PDF 다운로드 완료" |
| 답안지 PDF 완료 | "답안지 PDF 다운로드 완료" |
| PDF 실패 | "PDF 오류: {error}" |
| 일괄 채점 (전체 정답) | "{scope} {N}명에게 정답 처리했습니다" |
| 일괄 채점 (전체 오답) | "{scope} {N}명에게 오답 처리했습니다" |
| 대상 없음 | "{scope}가 없어 적용할 수 없습니다" |
| 파일 다운로드 알림 | "프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다" |
| 재응시 부여 | "{N}명에게 재응시 {N}회를 부여했습니다." |

### 학생 학습 기여 표시
- localStorage `xnq_manual_grades`, `xnq_fudge_points`, `xnq_student_comments` 영속화

---

## S-06. 퀴즈 통계 (`/quiz/:id/stats`)

`src/pages/QuizStats.jsx`. instructor only.

### 헤더 (`PageHeader`)
- 뒤로가기 + 제목 (퀴즈 제목, 클릭 시 `/quiz/{id}` 이동)
- 액션: "채점" 버튼 → `/quiz/{id}/grade`
- meta: 주차/차시 배지 + 응시 기간
- description: `CollapsibleDescription` — 2행 line-clamp + "펼치기" / "접기" 버튼 (Resize 감지로 자동 노출)

### 탭 라인
- "학생별 성적 조회" (`grades`)
- "퀴즈 통계" (`stats`)

### 학생별 성적 조회 (`GradesTab`)

**요약 필터 (세그먼트)**
- "전체 {N}" / "제출완료 {N}" (emerald) / "미제출 {N}" (gray)

**검색 + 다운로드**
- 검색 인풋 (placeholder "학생 이름 또는 학번 검색")
- "성적 다운로드" 버튼 (`Download`) — `downloadGradesXlsx` 호출

**테이블 컬럼**

| 컬럼 | 종류 | 비고 |
| --- | --- | --- |
| 이름 | 정렬 | - |
| 학번 | 정렬 | - |
| 학과 | 정렬 | - |
| 소요 시간 | 정렬 | `calcElapsed` (시간/분/초) |
| 제출 상태 | 필터 (체크박스) | 옵션: "정상제출", "지각제출", "미제출" |
| 제출 일시 | 정렬 | 시간만 표시 |
| 점수 / {totalPoints}점 | 정렬 | 색 분기: ≥80 파랑 / ≥60 회색 / <60 빨강 |
| 채점 상태 | 필터 (체크박스) | 옵션: "채점 완료", "미채점" |
| 답안 | (액션) | "답안 확인" 버튼 → `/quiz/{id}/grade?mode=student&studentId={id}` |

정렬 아이콘: 미정렬 `ArrowUpDown` (반투명) / desc `ArrowDown` / asc `ArrowUp`

빈: "검색 결과가 없습니다"

### 퀴즈 통계 (`StatsTab`)

**요약 카드** (큰 평균 점수 + 보조 5지표)
- 평균 점수 (큰 폰트 + "/ {totalPoints}점")
- 최고 / 최저 / 표준편차 / 응시율 / 평균 응시시간

**점수 분포 차트**
- `BarChart` (binSize: ≥80점 → 10, ≥30점 → 5, 그 외 → 1)
- 평균 위치에 점선 ReferenceLine "평균" 표시
- 빈: "채점 완료된 학생이 없습니다"
- 캡션: "응시 {N}명 중 채점 완료 {N}명 기준 (미채점 {N}명 제외)"

**응시 현황 카드**
- 5개 행 (라벨 / 인원 / 비율%)
  - "수강 인원" 회색 바
  - "응시 완료" 파랑 바
  - "미제출" 분홍 바
  - "채점 완료" 연파랑 바
  - "채점 대기" 분홍 바
- 하단 "점수 분포 구간 (채점 완료 기준)":
  - 상위 27% — "{p73}점 이상" 초록
  - 중위 46% — "{p27}~{p73}점" 회색
  - 하위 27% — "{p27}점 미만" 빨강

**문항별 득점률 차트**
- 가로 BarChart, ReferenceLine 70% (초록) / 40% (분홍)
- 색: ≥70% 초록 / 40~69% 호박 / <40% 분홍 / 데이터 없음 회색
- 범례 4종: "70% 이상 (쉬움)" / "40~69% (보통)" / "40% 미만 (어려움)" / "채점 전"

**문항별 상세 통계 테이블**
- 컬럼: 문항 / 유형 / 배점 / 평균 점수 / 득점률 / 난이도 (ⓘ 툴팁 "득점률 기준: ≥70% 쉬움 / 40~69% 보통 / <40% 어려움") / 채점 현황
- "문항 분석 (.xlsx)" 다운로드 버튼
- 난이도 배지 색: 쉬움 초록 / 보통 주황 / 어려움 빨강
- 채점 현황: "완료" (초록) 또는 "{graded}/{total}명" (주황)
- 하단 캡션: "난이도(득점률 기준): ≥70% 쉬움 / 40~69% 보통 / <40% 어려움"

---

## S-07. 퀴즈 응시 (`/quiz/:id/attempt`)

`src/pages/QuizAttempt.jsx`. 학생 또는 `?preview=true` 진입.

### 진입 차단 화면

| 조건 | 화면 |
| --- | --- |
| `lockDate` 지남 (응시 미시작) | Lock 아이콘 + "이용이 종료되었습니다" + "이용 종료 일시가 지나 퀴즈에 접근할 수 없습니다" + "퀴즈 목록으로" 버튼 |
| status `open` + startDate 미래 | Clock 아이콘 + "응시 시작 전입니다" + "{startDate}부터 응시할 수 있습니다" + "퀴즈 목록으로" |
| status `draft` | "응시 불가" + "아직 공개되지 않은 퀴즈입니다." |
| status `grading` | "응시 불가" + "채점 중인 퀴즈로 응시가 마감되었습니다." |
| status `closed` | "응시 불가" + "종료된 퀴즈입니다." |
| 지각 제출 비허용 + dueDate 지남 | Clock 빨강 + "제출 기한이 종료되었습니다" + "마감일: {dueDate}" |
| 지각 제출 허용 + lateSubmitDeadline 지남 | "지각 제출 기한이 종료되었습니다" + "지각 제출 마감: {date}" |
| 로딩 | "불러오는 중" |
| 데이터 없음 | "해당 퀴즈를 찾을 수 없거나 응시 가능한 문항이 없습니다." |

### 배너

**자동 저장 실패 배너** (saveError 시)
- "자동 저장 실패" 빨강
- `quota`: "브라우저 저장 공간이 부족합니다. 답변 유실을 막으려면 지금 제출하거나 중요한 답변을 별도로 복사해두세요."
- 기타: "답변이 자동 저장되지 않고 있습니다. 답변 유실을 막으려면 지금 제출하거나 중요한 답변을 별도로 복사해두세요."

**지각 제출 배너** (isLate)
- "지각 제출" + "마감일({dueDate})이 지났습니다. 제출 시 지각으로 기록됩니다."
- lateSubmitDeadline 있으면 부착: "지각 제출 마감: {date}"

**미리보기 배너** (isPreview)
- "미리보기 모드" + "학생에게 보이는 실제 화면입니다. 답변 선택 및 제출을 테스트할 수 있습니다."
- "미리보기 종료" 버튼 (X 아이콘) → navigate(-1)

### 퀴즈 헤더 카드
- "{week}주차 {session}차시 · {totalPoints}점"
- 제목 (h1) + description
- 자동 저장 표시: CheckCircle2 + "자동 저장됨 · {시각}"
- 시간 카운트다운 박스:
  - 무제한: Clock + "제한 없음"
  - 시간 종료 + disableAutoSubmit: 빨강 "시간 종료 — {grace} 내 제출"
  - 5분 미만: 빨강 / 그 외 회색
- "답변 완료 {N}/{total}" (완료 시 초록)

### 진행 표시 (oneAtATime 일 때)
- "문항 {N} / {total}"
- lockAfter 시: Lock + "응답 후에는 이전 문항으로 돌아갈 수 없습니다"
- 진행률 바

### 문항 카드 (`QuestionCard`)
- typeLabels 매핑 (Q번호 + 유형 배지):
  - `multiple_choice` "객관식"
  - `true_false` "참/거짓"
  - `short_answer` "단답형"
  - `essay` "서술형"
  - `numerical` "수치형"
  - `fill_in_blank` "빈칸 채우기" (레거시)
  - `multiple_answers` "복수 선택"
  - `ordering` "순서 배열" (레거시)
  - `matching` "연결형"
  - `multiple_dropdowns` "드롭다운 선택"
  - `fill_in_multiple_blanks` "다중 빈칸"
  - `formula` "수식형"
  - `text` "안내"
  - `file_upload` "파일 제출"
- text 유형: "안내" 배지만 + RichText 렌더, Q번호 없음

#### 유형별 입력 UI

- **multiple_choice / true_false**: 라디오 + RichText 렌더된 선지
- **multiple_answers**: 체크박스. 학생 답안은 쉼표 join 문자열
- **short_answer**: text input (placeholder "답안을 입력하세요")
- **essay**: textarea rows=5 (placeholder "답안을 입력하세요")
- **numerical**: number input (placeholder "숫자를 입력하세요")
- **formula**: 변수값 박스 ("주어진 값: a = N, b = N" 폰트 mono) + number input (placeholder "계산 결과를 입력하세요")
- **matching**: 좌(고정) ↔ select (오른쪽 + distractors 섞임) (placeholder "선택하세요")
- **multiple_dropdowns**: 본문 inline placeholder 모드 또는 레거시 모드 (라벨 + select) "선택하세요"
- **fill_in_multiple_blanks**: 본문 inline 또는 레거시 모드 ("빈칸 N" 라벨 + text input)
- **file_upload**: 파일 선택 박스. placeholder "파일을 선택하세요" + "허용 파일: PDF, DOC, DOCX, HWP, ZIP"

### 내비게이션 (oneAtATime 일 때)
- 좌측: "이전" (`ChevronLeft`) — lockAfter 또는 첫 문항 시 disabled
- 가운데: "답변 완료 {N} / {total}"
- 우측: "다음" (`ChevronRight`) 또는 마지막 문항이면 "제출하기" (Send 아이콘)

내비게이션 시 활동 로그 `NAVIGATE` 기록.

#### 잠금 confirm 다이얼로그
- **lockConfirm** (lockAfter + 답변 있음 + 다음 클릭):
  - 타이틀 "다음 문항으로 이동"
  - 메시지 "이 문항으로 돌아올 수 없습니다.\n이대로 다음 문항으로 이동할까요?"
  - 버튼 "다음으로 이동" / "취소"
- **blankSkipConfirm** (lockAfter + 답변 없음 + 다음 클릭):
  - 타이틀 "답변 없이 이동"
  - 메시지 "답변을 입력하지 않고 다음 문항으로 이동하면,\n이 문항으로 돌아와 답변할 수 없습니다."
  - 버튼 "답변 없이 이동" (destructive) / "돌아가기"

### 시작 안내 (startNotice — lockAfter 첫 진입 시)
- AlertDialog "응답 후 문항 잠금"
- 메시지: "이 퀴즈는 한 문항씩 표시되며, 다음 문항으로 이동하면 이전 문항으로 돌아올 수 없습니다.\n각 문항을 신중히 답변해주세요."

### 일반 모드 제출 영역
- 좌: "{N}개 문항이 미답변 상태입니다." 또는 "모든 문항에 답변했습니다."
- 우: "제출하기" 버튼 (`Send` 아이콘)

### 자동 저장 / 활동 로그 / 자동 제출

- **autosave 인터벌**: `AUTOSAVE_INTERVAL_MS` (30000ms = 30초). dirty 일 때만 flush. 키: `xnq_attempt_session_{quizId}_{studentId}`
- **beforeunload / pagehide**: dirty 면 즉시 저장
- **활동 로그**: `xnq_activity_log_{quizId}_{studentId}` 키, 1.5초 디바운스로 ANSWER_CHANGE 집계
- **포커스 이탈 감지**: `visibilitychange` 이벤트 → `FOCUS_LOSS` / `FOCUS_GAIN`
- **시간 만료 자동 제출**:
  - `disableAutoSubmit: false` → 즉시 자동 제출
  - `disableAutoSubmit: true` → grace 5분(`GRACE_AFTER_TIMEOUT_SEC = 300`) 카운트다운 후 자동 제출
- **lockDate 도래**: 응시 중이면 자동 제출

### 제출 결과 모달 (`ResultModal`)
- 큰 체크 아이콘 + 타이틀:
  - 자동 제출: "시간 종료 — 자동 제출되었습니다"
  - 수동 제출: "제출 완료!"
- 제출일시
- 지각 배지 (`isLate`)
- 점수 영역:
  - hasAutoGrade 없음: "점수 없음"
  - showScoreNow: "{autoTotal} / {autoMax}"
  - 그 외: "공개 예정"
- manualPending > 0: "서술형 {N}개 문항은 채점이 완료되면 점수에 반영됩니다."
- 메타 3열: "응시 시간 {N}분" / "출제 수 {N}문항" / "만점 {N}점"
- CTA 2개:
  - "결과 자세히 보기" → `/quiz/{id}`
  - "퀴즈 목록으로" (outline) → `/`

### 활동 로그 시드 (mock 전용)
`_seedActivityLogsOnce()` — mockData.js — 제출 완료 학생에게 그럴듯한 응시 행동 로그를 한 번만 생성 (시연용). `xnq_activity_log_seed_v1` 플래그.

---

## S-08. 문제모음 목록 (`/question-banks`)

`src/pages/QuestionBankList.jsx`. instructor only.

### 헤더
- 제목 "문제모음"
- 액션 3개:
  - "가져오기" (outline, `FolderInput`) → `ImportBankModal`
  - "내보내기" (outline, `FolderOutput`) → `ExportBankModal`
  - "새 문제모음" (default, `Plus`) → `AddBankModal`

### 카드 그리드 (1/2/3 열)

각 카드:
- 제목 (`text-[15px] font-semibold`) — 호버 시 옆에 연필 아이콘 노출 → 인라인 편집 모드 (Enter 저장 / Escape 취소 / blur 저장)
- 액션 아이콘 2개 (우상단):
  - `Copy` "복사" → `executeCopyBank` → 토스트 "'{newName}' 문제모음이 생성되었습니다" + "바로가기" 액션
  - `Trash2` "삭제" → `ConfirmDialog` "{name} 문제모음을 삭제할까요?" + "은행에 포함된 문항 {N}개가 함께 삭제되며 복구할 수 없습니다."
- 난이도 배지 + " · {N}개 문항"
  - "상" 빨강 / "중" 호박 / "하" 초록 / "미지정" 회색
- 최종 수정일: "최종 수정 {updatedAt}"

빈 카드 (점선):
- 다른 카드 있을 때만 "+ 새 문제모음 추가"

### 빈 상태 (banks.length === 0)
- BookOpen 아이콘 + "문제모음이 없습니다" + "새 문제모음을 만들어 문항을 관리하세요" + "첫 문제모음 만들기" 버튼

### 모달 (`AddBankModal`)
- 타이틀 "새 문제모음 만들기"
- 이름 input (placeholder "문제모음 이름 (예: 기말고사 문제모음)") + Enter 동작
- 난이도 버튼 4개: "미지정" / "상" / "중" / "하"
- 난이도 선택 시 안내: "난이도 '{label}'인 문항만 추가할 수 있습니다"
- 푸터: "취소" / "만들기" (이름 미입력 시 disabled)

### 모달 (`ImportBankModal`) — "가져오기"
- 타이틀 "가져오기"
- 좌측 은행 선택 / 우측 문항 선택 패널 (구조)
- 신규 은행 생성 모드 placeholder: "문제모음 이름"

### 모달 (`ExportBankModal`) — "내보내기"
- 타이틀 "내보내기"
- 코스 → 은행 선택. 신규 모드 placeholder "문제모음 이름"

### 토스트 카탈로그 (S-08)

| 트리거 | 메시지 |
| --- | --- |
| 은행 복사 | "'{newName}' 문제모음이 생성되었습니다" (+ "바로가기") |
| 은행 생성 실패 | "생성 중 오류가 발생했습니다" |
| 은행 삭제 실패 | "삭제 중 오류가 발생했습니다" |
| 가져오기 성공 | "'{name}' 문제모음에 {N}개 문항 가져오기 완료" (+ "바로가기") |
| 가져오기 실패 | "가져오기 중 오류가 발생했습니다" |
| 내보내기 성공 | "'{name}' 문제모음에 {N}개 문항을 내보냈습니다" (+ "바로가기") |
| 내보내기 실패 | "내보내기 중 오류가 발생했습니다" |
| 복사 실패 | "복사 중 오류가 발생했습니다" |

---

## S-09. 문제모음 상세 (`/question-banks/:bankId`)

`src/pages/QuestionBank.jsx`. instructor only. bank 미존재 시 `/` 리다이렉트.

### 헤더 (`PageHeader`)
- 제목: 은행 이름 (호버 시 `Edit2` 아이콘 노출 → 인라인 편집 — Enter 저장 / Escape 취소 / blur 저장)
- description: "문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다."
- 액션:
  - "일괄 업로드" (outline, `Upload`) → `ExcelUploadModal`
  - "문항 추가" (default, `Plus`) → `AddQuestionModal` (bankDifficulty 고정)

### 필터 / 검색 툴바
- 유형 드롭다운 (`DropdownSelect`, filterMode): "모든 유형" + 12 유형 라벨 전부
- 난이도 드롭다운: "모든 난이도" / "미지정" / "상" / "중" / "하"
- 검색 인풋 (placeholder "문항 내용 검색", Search 아이콘)
- 총 문항 표시: "총 {N}개 문항"

### 문항 리스트 (`QuestionItem`)
- 행 드래그 핸들 (`GripVertical`) — 필터 미적용 시만 노출, title="드래그하여 순서 변경"
- TypeBadge + "{points}점" + 난이도 배지 (상/중/하)
- 본문 (line-clamp-3, htmlToPlainText)
- 우측 휴지통 아이콘 → `ConfirmDialog` "문항을 삭제할까요?" / "삭제된 문항은 복구할 수 없습니다."
- 클릭 / Enter / Space → 편집 모달 열림

### 빈 상태
- questions.length === 0: "아직 추가된 문항이 없습니다" + "첫 문항 추가하기" 버튼
- 검색 결과 없음: "검색 결과가 없습니다"

### 모달 (`ExcelUploadModal` - 문항 일괄 업로드)
- 타이틀 "문항 일괄 업로드"
- 설명 "엑셀(.xlsx, .xls) 또는 CSV 파일을 업로드하세요."
- 점선 박스: Upload 아이콘 + "클릭하여 파일 선택" 또는 파일명
- 오류 박스: "{N}개 오류 — 수정 후 다시 업로드해 주세요" + 각 오류
- 좌하단: "템플릿 다운로드" 링크
- 푸터: "취소" / "업로드" (또는 "처리 중")
- 은행 난이도 미스매치 검증: "{N+1}행: 문제은행 난이도("{label}")와 다른 난이도("{label}")가 지정되어 있습니다"

### 모달 (`AddQuestionModal` — 문항 직접 추가)

2-step UI:
- **Step 1: 유형 선택** — 12개 유형 카드 + 호버 시 우측 미리보기 (`QuestionTypePreview`)
- **Step 2: 폼**
  - DialogTitle: 신규 "문항 직접 추가" / 편집 "문항 편집"
  - DialogDescription: 유형명 + (자동채점 / 부분자동 / 수동채점 / 채점 없음) 도트
  - 편집 모드 + 응시자 있을 때 호박 안내 (위 S-04 참조)
  - 제목 input (maxLength 120, placeholder "문제 제목을 입력하세요" 또는 "안내문 제목을 입력하세요")
  - 배점 input (text 유형이면 숨김) + 빨강 별표 필수
  - 난이도 드롭다운 (bankDifficulty 있으면 "상/중/하 고정" 회색 박스)
  - 문제 내용 (`RichTextEditor` 또는 textarea — fill_in_multiple_blanks/multiple_dropdowns/formula 는 textarea, 토큰 자동 확장)
  - 유형별 전용 폼 (객관식 보기 추가, 매칭 페어, 수식 변수 등)
  - 응답 피드백 아코디언:
    - "응답 피드백" + "학생에게 결과 공개 시 함께 표시됩니다. 결과 비공개 설정이면 노출되지 않습니다."
    - "정답 시" / "오답 시" / "무조건 표시" textarea
  - 푸터: "← 유형 변경" (편집 모드면 숨김) / "취소" / "추가" (또는 "변경")

#### 유형별 폼 라벨 (TypeForm)

- **multiple_choice**: 정답 라디오 + "보기 N" placeholder + "보기 추가" (~6개)
- **true_false**: "참" / "거짓" 버튼
- **multiple_answers**: 정답 체크 + "보기 N" + "보기 추가" (~8개)
- **short_answer**: "정답 입력 (예: 서울)" + "대체 정답 (예: Seoul)" + "대체 정답 추가" (~5개) + 채점기준 textarea "채점 기준을 입력하세요 (학생에게는 표시되지 않음)"
- **essay**: 채점기준 textarea만
- **numerical**: 정답 + 허용 오차 ("예: 3.14" / "예: 0.01")
- **matching**: 페어 입력 ("왼쪽 N" / "오른쪽 N") + "항목 추가" + 오답 보기 ("오답 보기 N") + "오답 보기 추가"
- **formula**: 변수 정의 (이름 placeholder "a" / 최소 "1" / 최대 "10" / 자릿수 0~4) + "변수 추가" + 수식 input (placeholder "예: sqrt(a^2 + b^2)") + 표시 자릿수 0~6 + 허용 오차 (절대값 / %) + 0
- **fill_in_multiple_blanks**: "본문에 빈칸 삽입" 버튼 + 각 빈칸별 정답 입력 (placeholder "정답 입력" / "대체 정답 (동의어 등)")
- **multiple_dropdowns**: "본문에 드롭다운 삽입" 버튼 + 각 드롭다운 정답 라디오 + 선택지 추가
- **file_upload**: 별도 UI 없음 (간단 안내만)
- **text**: 배점/난이도 숨김

---

## 부록 A. 공통 모달 카탈로그

| 모달 | 사용처 | 타이틀 |
| --- | --- | --- |
| `QuizCopyModal` | S-01 | "퀴즈 복사" |
| `QuizImportModal` | S-01 | "다른 과목 퀴즈 가져오기" |
| `QuizSettingsDialog` | S-01 | "퀴즈 전역 설정" |
| `ConfirmDialog` (삭제) | S-01, S-03, S-09 등 | "퀴즈 삭제" / "문항을 삭제할까요?" / "{name} 문제모음을 삭제할까요?" |
| `ConfirmDialog` (취소) | S-02, S-04 | "작성 취소" / "편집 취소" |
| `ConfirmDialog` (점수 공개 기간) | S-02 | "점수 공개 기간 미설정" |
| `AlertDialog` (임시저장 알림) | S-02, S-04 | "임시저장 불가" / "임시저장 완료" / "임시저장 실패" |
| `AlertDialog` (저장 실패) | S-02, S-04 | "저장 실패" / "필수 항목 미입력" |
| `AddQuestionModal` | S-02, S-04, S-09 | "문항 직접 추가" / "문항 편집" |
| `QuestionBankModal` | S-02, S-04 | (직접 선택) |
| `RandomQuestionBankModal` | S-02, S-04 | "복수 문제모음 랜덤 출제" |
| `RegradeOptionsModal` | S-04 | "재채점 옵션 선택" |
| `AssignTargetModal` | S-02, S-04 (AssignmentOverrides 내) | "추가 대상 선택" |
| `ExcelModal` | S-05 | "엑셀 일괄 채점" |
| `ConditionalRetakeModal` | S-05 | "조건부 재응시 부여" |
| `ResultModal` | S-07 | "제출 완료!" / "시간 종료 — 자동 제출되었습니다" |
| `AlertDialog` (응시 잠금 안내) | S-07 | "응답 후 문항 잠금" |
| `ConfirmDialog` (잠금 이동) | S-07 | "다음 문항으로 이동" / "답변 없이 이동" |
| `AlertDialog` (제출 실패) | S-07 | "제출 실패" / "저장 실패" |
| `AddBankModal` | S-08 | "새 문제모음 만들기" |
| `ImportBankModal` | S-08 | "가져오기" |
| `ExportBankModal` | S-08 | "내보내기" |
| `ExcelUploadModal` | S-09 | "문항 일괄 업로드" |

---

## 부록 B. 토스트 메시지 카탈로그

(`Toast` 컴포넌트 4초 자동 닫힘)

### S-01 (QuizList)
- "'{title}'을(를) {courseLabel}으로 복사했습니다"
- "복사 중 오류가 발생했습니다"
- "'{title}' 가져오기 완료 — 목록에서 편집하세요"
- "퀴즈 {N}개 가져오기 완료 — 임시저장 상태로 추가되었습니다"
- "가져오기 중 오류가 발생했습니다"
- "'{title}'을(를) 학생에게 공개했습니다"
- "'{title}'을(를) 학생에게서 숨겼습니다"
- "공개여부 변경 중 오류가 발생했습니다"
- "'{title}' 퀴즈가 삭제되었습니다"
- "삭제 중 오류가 발생했습니다"
- (다른 화면 → 목록 이동 시 sessionStorage `xnq_toast` 1회 표시)

### S-04 (QuizEdit, 목록으로 이동하며 표시)
- "저장되었습니다."
- "저장되었습니다. 마감 처리된 퀴즈가 다시 게시되었습니다."
- "저장되었습니다. {N}명의 점수가 재채점되었습니다."

### S-05 (GradingDashboard)
- "{type} PDF 다운로드 완료"
- "PDF 오류: {err}"
- "{N}명에게 재응시 {N}회를 부여했습니다."
- "{scope} {N}명에게 정답 처리했습니다"
- "{scope} {N}명에게 오답 처리했습니다"
- "{scope}가 없어 적용할 수 없습니다"
- "프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다"

### S-08 (QuestionBankList)
- "'{newName}' 문제모음이 생성되었습니다" (+ 바로가기 액션)
- "'{name}' 문제모음에 {N}개 문항 가져오기 완료" (+ 바로가기)
- "'{name}' 문제모음에 {N}개 문항을 내보냈습니다" (+ 바로가기)
- "생성 중 오류가 발생했습니다"
- "복사 중 오류가 발생했습니다"
- "삭제 중 오류가 발생했습니다"
- "가져오기 중 오류가 발생했습니다"
- "내보내기 중 오류가 발생했습니다"

---

## 부록 C. localStorage / sessionStorage 키 카탈로그

| 키 | 용도 |
| --- | --- |
| `xnq_quizzes` | 사용자가 추가/수정한 퀴즈 영속화 (mockData) |
| `xnq_quiz_questions` | 복사/가져오기로 추가된 퀴즈 ID 별 문항 매핑 |
| `xnq_student_attempts` | 학생 응시 기록 (Attempt 객체 배열) |
| `xnq_manual_grades` | 수동 채점 점수 (`{quizId}_{studentId}_{qId}: score`) |
| `xnq_fudge_points` | 가산점 (`{quizId}_{studentId}: value`) |
| `xnq_student_comments` | 교수자 ↔ 학생 코멘트 thread |
| `xnq_global_settings` | 복수선택 채점방식 / 정답 판정 (대소문자, 띄어쓰기) |
| `xnq_regrade_log` | 문항별 재채점 옵션 + 변경 카운트 + timestamp |
| `xnq_questions_modified` | 퀴즈 ID 별 문항 마지막 변경 timestamp |
| `xnq_conditional_retakes` | 조건부 재응시 부여 기록 |
| `xnq_results_viewed` | oneTimeResults 정책 — 본 attempt ID set |
| `xnq_attempt_session_{quizId}_{studentId}` | 응시 중 자동저장 세션 (answers, currentIndex, startedAt) |
| `xnq_activity_log_{quizId}_{studentId}` | 응시 활동 로그 (start/navigate/answer_change/focus_loss/...) |
| `xnq_activity_log_seed_v1` | mock 시연용 활동 로그 시드 플래그 |
| `xnq_banks_v3` | 문제모음 (QuestionBankContext) |
| `xnq_bank_questions_v4` | 문제모음 문항 |
| `xnq_week_options_v2__{course}` | 코스별 주차 옵션 (WeekSessionPicker) |
| `xnq_session_options_v2__{course}` | 코스별 차시 옵션 |
| `xnq_token` (api 모드) | 인증 토큰 |
| `xnq_toast` (sessionStorage) | 화면 이동 시 1회 토스트 전달 |

---

## 부록 D. 라벨 / 텍스트 카탈로그 (주요 안내문 원문)

### 빈 상태
- "해당 조건에 맞는 퀴즈가 없습니다." (S-01 교수자/학생 필터)
- "현재 응시 가능한 퀴즈가 없습니다." (S-01 학생, 무필터)
- "아직 추가된 문항이 없습니다" (S-02, S-04, S-09)
- "검색 결과가 없습니다" / "검색 결과 없음"
- "공개된 퀴즈가 없습니다"
- "다른 과목이 없습니다"
- "이 과목에 등록된 문제모음이 없습니다"
- "조건에 해당하는 학생이 없습니다."
- "문제모음이 없습니다" + "새 문제모음을 만들어 문항을 관리하세요"
- "기록된 활동 로그가 없습니다"
- "아직 코멘트가 없습니다"
- "제출되지 않았습니다"
- "(답안 없음)"
- "채점 완료된 학생이 없습니다"
- "문항을 선택하면 학생 답안을 채점할 수 있습니다"
- "학생을 선택하면 전체 문항 답안을 확인할 수 있습니다"

### 안내 / 도움말
- "미설정 시 응시 기간 제한 없이 학생이 언제든 응시할 수 있습니다."
- "이용 종료 일시가 지나면 학생은 퀴즈 정보를 확인할 수 없습니다. 미설정 시 제한 없음."
- "미설정 시 무제한 허용" (지각 제출)
- "비워두면 액세스 코드 없이 응시 가능합니다."
- "비워두면 모든 IP에서 접근 가능합니다. (CIDR 표기법 지원)"
- "응시 전 학생에게 표시될 안내 문구입니다."
- "비공개 시 학생 화면에 퀴즈가 표시되지 않습니다. 임시저장 상태는 자동 비공개입니다."
- "임시저장 상태에선 자동 비공개입니다. 게시 후 설정할 수 있습니다."
- "퀴즈를 {action} 후 아래 항목들은 초기화되므로 다시 설정해 주세요."
- "특정 학생 또는 학과(그룹)에 기본 응시 기간과 다른 마감일 또는 열람 기간을 개별 설정합니다."
- "선택된 대상이 없습니다. 아래 [대상 선택] 버튼으로 추가해주세요."
- "다른 추가 대상에 이미 포함된 학생입니다" (학생 선택 disabled tooltip)
- "이 설정은 모든 퀴즈에 공통으로 적용됩니다."
- "정답을 모두 맞혀야 점수를 받습니다. 하나라도 틀리면 0점."
- "맞힌 정답 비율만큼 부분 점수를 받습니다."
- "오답을 선택해도 감점하지 않습니다."
- "오답 1개당 정답 1개분의 점수를 차감합니다."
- "선택지 수에 따라 감점을 자동 조절하여, 찍기를 억제합니다."
- "단답형/수치형 등 자동채점 시 대소문자를 구분하여 정답을 판정합니다"
- "현재: \"Answer\"와 \"answer\"를 동일한 정답으로 처리합니다."
- "\"Answer\"와 \"answer\"를 다른 답으로 처리합니다. 학생 혼란 방지를 위해 퀴즈 안내사항에 명시를 권장합니다."
- "현재: \"key word\"와 \"keyword\"를 동일한 정답으로 처리합니다."
- "조건을 하나 이상 선택해주세요."
- "총점에 +/- 점수를 가감합니다" (가산점 팝오버)
- "양식에 오류가 1개라도 포함되어 있으면 업로드되지 않습니다."
- "문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다."
- "이 퀴즈는 한 문항씩 표시되며, 다음 문항으로 이동하면 이전 문항으로 돌아올 수 없습니다.\n각 문항을 신중히 답변해주세요."

### 검증 메시지
- "퀴즈 제목을 입력해주세요"
- "마감 일시는 시작 일시 이후여야 합니다"
- "이용 종료 일시는 마감 일시 이후로 설정해야 합니다"
- "지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용할 수 있습니다"
- "제한 시간을 입력하거나 무제한으로 설정해주세요"
- "자동 제출 5분 유예 사용 시 이용 종료 일시를 반드시 설정해야 합니다"
- "최소 1개 이상의 문항을 추가해주세요"
- "동일한 학생이 여러 추가 기간 설정에 포함되어 있습니다"
- "이용 종료 일시가 마감 일시보다 앞서 있습니다. 마감 전에 퀴즈 접근이 차단될 수 있습니다." (호박 경고)
- "이용 종료 일시는 마감 일시 이후로 설정해주세요." (AssignmentOverrides)
- "학번 {sid}: 점수({score})가 배점({maxPoints}점)을 초과합니다. 전체 업로드가 불가합니다."
- "학번 \"{sid}\"(이)가 수강생 목록에 없습니다. 채점 양식을 수정하지 마세요. 전체 업로드가 불가합니다."
- "{N+1}행: 문제은행 난이도(\"{label}\")와 다른 난이도(\"{label}\")가 지정되어 있습니다"

### 확인 다이얼로그
- "퀴즈 삭제 / '{title}' 퀴즈를 삭제하시겠습니까?\n삭제된 퀴즈는 복구할 수 없습니다."
- "작성 취소 / 작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?"
- "편집 취소 / 저장하지 않은 변경사항이 있습니다. 저장하지 않고 나가시겠습니까?"
- "점수 공개 기간 미설정 / 재응시가 허용된 퀴즈에서 점수 공개 기간이 설정되지 않으면, 1차 응시 마감 직후 점수(및 정답)가 공개되어 학생이 2차 응시 전에 정답을 확인할 수 있습니다.\n\n점수 공개 기간을 설정하지 않고 저장하시겠습니까?"
- "다음 문항으로 이동 / 이 문항으로 돌아올 수 없습니다.\n이대로 다음 문항으로 이동할까요?"
- "답변 없이 이동 / 답변을 입력하지 않고 다음 문항으로 이동하면,\n이 문항으로 돌아와 답변할 수 없습니다."
- "{name} 학생의 모든 문항 {N}개를 {정답|오답} 처리합니다.\n기존 채점 결과는 모두 덮어씁니다. 진행할까요?" (window.confirm)
- "{scope} {N}명 전원에게 {정답|오답}({score}점) 처리합니다.\n기존 채점 결과는 모두 덮어씁니다. 진행할까요?" (window.confirm)
- "문항을 삭제할까요? / 삭제된 문항은 복구할 수 없습니다."
- "{name} 문제모음을 삭제할까요? / 은행에 포함된 문항 {N}개가 함께 삭제되며 복구할 수 없습니다."

### Alert / 완료 다이얼로그
- "임시저장 불가 / 퀴즈 제목을 입력해주세요."
- "임시저장 완료 / 퀴즈가 임시저장되었습니다."
- "임시저장 완료 / 변경사항이 임시저장되었습니다." (Edit)
- "임시저장 실패 / 저장 중 오류가 발생했습니다."
- "저장 실패 / 서버에 제출하지 못했습니다."
- "필수 항목 미입력 / {첫 검증 메시지}"
- "저장 실패 / 응시 기록 저장에 실패했습니다.\n브라우저 저장 공간을 확인해주세요."

### 응시 진입 차단
- "이용이 종료되었습니다 / 이용 종료 일시가 지나 퀴즈에 접근할 수 없습니다"
- "응시 시작 전입니다 / {startDate}부터 응시할 수 있습니다"
- "응시 불가 / 아직 공개되지 않은 퀴즈입니다."
- "응시 불가 / 채점 중인 퀴즈로 응시가 마감되었습니다."
- "응시 불가 / 종료된 퀴즈입니다."
- "응시 불가 / 현재 응시할 수 없는 퀴즈입니다."
- "제출 기한이 종료되었습니다 / 마감일: {date}"
- "지각 제출 기한이 종료되었습니다 / 지각 제출 마감: {date}"

### 응시 중 안내
- "자동 저장 실패 / 브라우저 저장 공간이 부족합니다. 답변 유실을 막으려면 지금 제출하거나 중요한 답변을 별도로 복사해두세요."
- "자동 저장 실패 / 답변이 자동 저장되지 않고 있습니다. 답변 유실을 막으려면 지금 제출하거나 중요한 답변을 별도로 복사해두세요."
- "지각 제출 / 마감일({dueDate})이 지났습니다. 제출 시 지각으로 기록됩니다."
- "지각 제출 마감: {date}" (배너 보조)
- "미리보기 모드 / 학생에게 보이는 실제 화면입니다. 답변 선택 및 제출을 테스트할 수 있습니다."
- "응답 후에는 이전 문항으로 돌아갈 수 없습니다" (oneAtATime + lockAfter)
- "시간 종료 — {grace} 내 제출" (disableAutoSubmit grace)

### 응시 완료 모달
- "제출 완료!" / "시간 종료 — 자동 제출되었습니다"
- "공개 예정" (showScoreNow 거짓)
- "점수 없음" (총점 0)
- "서술형 {N}개 문항은 채점이 완료되면 점수에 반영됩니다."
- "지각 제출"

### 학생 결과 페이지
- "교수자가 설정한 공개 시점이 되면 문항별 채점 결과를 확인할 수 있습니다." (EyeOff)
- "응답은 1회만 조회할 수 있습니다 / 이미 결과를 확인하여 더 이상 응답과 정답을 조회할 수 없습니다." (oneTimeResults 소진)

### 채점 대시보드 빈/안내
- "이 퀴즈는 임시저장 상태입니다. 퀴즈를 공개하면 학생이 응시할 수 있습니다."
- "퀴즈 편집하기"
- "재채점 적용됨 | {옵션 라벨} ({N}명 점수 변경)"
- "프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다"

### 코멘트
- "교수자에게 답변하기" (placeholder, 학생)
- "학생에게 전달할 코멘트" (placeholder, 교수자)
- "이전 코멘트" (epoch 0 마이그레이션 메시지)

---

## 부록 E. 작은 기능들의 모음 (SSD에 없거나 누락되기 쉬운 것)

### 카드 / 인라인 통계 색 강조 룰 (S-01)
- "미제출" 인원 > 0 이면 `text-red-500` 빨강
- "평균점수" 는 항상 `text-primary` 파랑
- 응시율은 primary 색 적용 X (검정)

### D-day 색 임계치
- 0일 (D-0): `text-red-700 bg-red-50` 빨강 강조
- 그 외: `text-amber-600 bg-amber-50` 호박

### 카드 메뉴 항목 노출 조건
- 채점/통계: scheduled 아님 + (open/grading/closed)
- 학생 공개 토글: draft 면 disabled
- 미리보기: 항상 가능 (preview=true 라우트)

### 검증 모달 우선순위
`getValidationErrors()` 가 반환하는 배열의 첫 번째 항목만 표시. 8개 검증을 순차 적용.

### 임시저장 vs 저장의 검증 차이
- 임시저장: 제목만 검증
- 저장: 8개 전체 검증 + 다회응시+공개기간 미설정 시 확인 다이얼로그

### 미리보기 모드 (S-07 `?preview=true`)
- 호박 배너 표시 + "미리보기 종료" 버튼
- 답안 저장 안 함 (`saveStudentAttempt` 호출 안 함)
- 활동 로그 / 자동 저장 모두 비활성화 (sessionKey/activityKey null)
- isLate, lockDate 차단 등 시간 관련 검사 우회

### 키보드 단축키
- 코멘트 입력: Enter = 전송 / Shift+Enter = 줄바꿈
- 은행 이름 인라인 편집 (S-08, S-09): Enter = 저장 / Escape = 취소
- 새 문제모음 모달: Enter = 만들기
- 문제모음 문항 행: Enter / Space = 편집 모달 열기

### 응시 중 자동저장
- `AUTOSAVE_INTERVAL_MS = 30000` (30초)
- dirty 일 때만 저장. dirty = `answers`, `currentIndex`, `startedAt` 변경 감지
- `beforeunload`, `pagehide` 이벤트에서도 즉시 flush
- 실패 시 saveError 상태 → 배너

### 응시 중 활동 로그 항목
- start (응시 페이지 진입)
- navigate (문항 이동)
- answer_change (1.5초 디바운스로 집계)
- focus_loss / focus_gain (`visibilitychange` 이벤트)
- autosave (자동 저장 성공 시)
- submit (제출, auto bool 포함)

### 응시 중 부정행위 방지 기능 (미확인)
- 우클릭 차단, copy/paste 차단 등의 코드는 발견되지 않음. **(미확인)**
- 포커스 이탈 감지만 존재 (탭 전환 시 로그 기록).

### 채점 대시보드의 학생 정렬 옵션
- 응시 현황 탭: "이름순", "학번순", "제출일시순"
- 페이지 크기: 10/20/30/전체
- 문항 정렬: "미채점 우선" (기본), "문항 번호순"

### 채점 대시보드 키보드 네비
- 명시적 단축키 없음. **(미확인 — 코드상 미구현)**

### 통계의 차트 종류
- S-06: 점수 분포 (vertical BarChart) + 문항별 득점률 (horizontal BarChart, ReferenceLine 70/40%)
- S-05 통계 탭: 문항 점수 분포 (vertical BarChart) + 정답률 진행률 바

### 문제은행 검색/필터 옵션
- S-08: 코스별 카드만 (필터 없음, 카드 자체에 난이도 배지)
- S-09: 검색 + 유형 (전체+12개) + 난이도 (전체/미지정/상/중/하)

### 문제은행 가져오기/내보내기의 포맷
- 가져오기: 코스 → 은행 → 문항 선택 (체크박스) → 신규/기존 은행에 추가
- 내보내기: 현재 코스에서 문항 선택 → 타 코스/은행으로 복사 (id 새로 발급)
- 일괄 업로드: .xlsx / .xls / .csv (`parseExcelOrCsv`)
- 양식 다운로드: `downloadQuestionTemplate`

### 학생 점수 정책 (`scorePolicy`) 적용 시점
- mockData `getStudentAttempts` 가 학생별 attempts list 를 그룹화 후 정책 적용:
  - "최고 점수 유지": `totalAutoScore` 최대인 attempt
  - "평균 점수": 평균을 마지막 attempt 에 입혀 반환
  - "최신 점수 유지" / 기타: 마지막 attempt

### 자동채점 정답 비교 정규화
- `_normalizeAnswer(str, gs)`: trim → caseSensitive 아니면 toLowerCase → whitespaceSensitive 아니면 공백 모두 제거

### 가산점 (`fudgePoints`)
- 학생별 1개. -∞~+∞ step 0.5
- 0이면 미표시. 양수면 `+N`, 음수면 그대로
- 최종 점수: `max(0, autoTotal + manualTotal + fudge)`

### 재채점 옵션 4종 (RegradeOptionsModal)
- `award_both` / `new_answer_only` / `full_points` / `no_regrade`
- 기본 선택: `award_both`

### 응시 횟수 무제한 표기
- `allowAttempts === -1` → "무제한"

### 시간 제한 무제한 표기
- `timeLimit === 0 || null` → "제한 없음" 또는 "없음"

### 응시 기간 제한 없음
- `startDate`, `dueDate` 둘 다 빈 값일 때 "응시 기간 제한 없음" 단일 라벨

### 학생용 status 라벨 단순화
- scheduled / open / closed 3종만. "채점중"(grading) 은 학생에게 노출하지 않음 — `studentDisplayStatus` 로직.

### 채점 진행 중에도 학생 응시 가능
- 학생 카드 / 상세 / 응시 진입 모두 `(status === 'open' || status === 'grading') && !scheduled && !pastDue` 일 때 응시 허용

### Practice 모드
- `quizMode === 'practice'` 시 정보 카드에 호박 안내 "연습용 퀴즈는 성적에 반영되지 않습니다." 표시

### "수정됨" 배지 (StudentDetailPanel QuestionCard)
- 자동채점 결과를 수동으로 오버라이드한 경우 (grades 에 다른 값) "수정됨" 호박 배지 노출

### 좌측 강조 바 (StudentRow, QuestionCard)
- 변경됨 (pending) → 파랑 (`bg-primary`)
- 미채점 → 호박 (`bg-amber-300`)
- 둘 중 변경됨이 우선

### 코멘트 안 읽은 카운트
- 학생 탭 진입 시 0으로 리셋
- 다른 화면에서 진입할 때도 발신자 본인의 lastRead 기준으로 N 표시

### 마감 후 자동 0점 처리
- `autoSubmitExpiredStudents` (utils/deadlineUtils): 마감 경과 후 미시작자에게 0점 자동 처리. `submitted=true`, `autoSubmitted=true` 마킹
- 채점 대시보드 / 통계에서 "응시 시작 여부 기반 (startTime)" 으로 정상/미시작 분류 → 자동 0점은 미제출이 아니라 채점 완료로 집계됨

### 응시 시간 (timeTaken) Canvas 정책
- 무제한: 실제 경과 (분)
- 시간 제한: `min(timeLimit, elapsed)` 으로 클램프

### `text` 유형 (안내문)
- 응답 불요 (answeredCount 계산에서 제외)
- 채점 가능 점수 없음
- 배점/난이도/피드백 폼 모두 숨김

### 다중 빈칸/드롭다운 본문 placeholder
- `[빈칸N]` / `[드롭다운N]` 토큰을 본문에 직접 입력 가능
- 토큰 수에 따라 폼 항목 자동 확장 (캡 6 / 4)
- 캡 초과 시 mismatch 경고
- 본문에 placeholder 있으면 inline 입력 (input + select), 없으면 레거시 모드 (라벨 + 입력)

### Tooltip 사용처
- 마감 일시 / 이용 종료 / 자동 제출 5분 유예 (S-02, S-04)
- 가산점 ("가산점 {N}점")
- 학생 disabled ("다른 추가 대상에 이미 포함된 학생입니다")
- 호버 시 "응시 가능 횟수({N}회)를 초과했습니다" (S-03 학생)
- 문제은행 행 드래그 핸들 ("드래그하여 순서 변경")
- 통계 테이블 난이도 헤더 (ⓘ + "득점률 기준: ≥70% 쉬움 / 40~69% 보통 / <40% 어려움")
- 채점 시뮬레이션 공식 툴팁 (?)

### 다른 코스 가져오기 학생/교수 분리
- QuizImportModal: api 모드 `listCourses()` 호출 → 현재 코스 제외한 코스 목록
- mock 모드: MOCK_COURSES 그대로 사용

### 인라인 편집 패턴 (은행/문제모음 이름)
- 호버 시 연필 아이콘 노출 (`opacity-0 group-hover:opacity-100`)
- 클릭 시 input 으로 전환, autoFocus
- Enter / blur / Escape 종료 동작

### 미리보기 패널 (RandomQuestionBankModal)
- 은행 행에 "미리보기" 버튼 → 인라인 펼침
- 최대 10개 + "외 {N}개 문항"

### 문제지/답안지 PDF 생성 진행 토스트
- 우하단 고정, 회전 스피너 + "{type} PDF 생성 진행중"

### "전체 학생" / "미제출자만" 일괄 채점 분리
- 전체 정답: 전체 학생 만점
- 전체 오답: "전체 학생 0점 처리" / "미제출자만 0점 처리" 드롭다운

### scrollbar 스타일
- 채점 대시보드 / 응시 패널 등에서 `scrollbar-thin` 적용 (얇은 스크롤바)

### 토스트 컴포넌트 (ui/toast)
- 메시지 + 선택적 액션 ("바로가기" 등)
- 4초 후 자동 닫힘

### 답안지 / 성적 다운로드 포맷
- 성적: `downloadGradesXlsx` (.xlsx)
- 답안지: `downloadAnswerSheetsXlsx` (.xlsx) + `printBulkAnswerSheets` (PDF)
- 문항 분석: `downloadItemAnalysisXlsx` (.xlsx)
- 일괄 채점 양식: `downloadGradingSheetXlsx` (.xlsx)

### 응시 결과 모달 "결과 자세히 보기" CTA
- `/quiz/{id}` 로 이동. 학생 응시 결과 상세 (`StudentResultSection`) 표시

### 데이터 정렬 보조 — recent 정렬
- `createdAt` 있는 경우 (api 모드) timestamp 내림차순
- 없으면 id 수치 내림차순 (mock), 그 외 문자열 비교

### 카드 호버 효과
- 퀴즈 카드: `hover:shadow-md`
- 문제모음 카드: 동일
- 응시 카드: 답변 있으면 `border-blue-200`

### 잘 안 보이는 안내문구 (회색 작은 글씨)
- "* 수동채점 대기 0점 반영" (학생 응시 기록 펼침 시)
- "응시 {N}명 중 채점 완료 {N}명 기준 (미채점 {N}명 제외)" (점수 분포 캡션)
- "채점된 학생 기준 실시간 집계" (문항별 득점률)
- "총 {N}문항 · {totalPoints}점 만점" (문항별 상세 통계 헤더)

### 정답 UI 상수
- `CHOICE_LABELS = 'ABCDEFGHIJ'.split('')` — 채점 시뮬레이션 선택지 라벨

### DateTimePicker
- 자체 구현 컴포넌트 (날짜 + 시각). min 옵션으로 다른 필드 이후로 제한

### WeekSessionPicker
- 코스별 주차 옵션 localStorage 영속화 (`xnq_week_options_v2__{course}`)
- 차시 옵션도 동일

### Layout prefetch 우선순위
- 진입 시점에 hover/focus/touchstart 이벤트로 nav 청크 미리 로드
- 마운트 후 idle 시간에 모든 nav 청크 프리페치

---

## 누락 의심 영역 (확인 필요)

- 응시 중 부정행위 방지 (우클릭/카피페이스트 차단): 코드에 없음. SSD에 있다면 추가 검증 필요
- 채점 대시보드 키보드 단축키: 명시적 코드 없음
- 답안지 PDF / 엑셀의 실제 출력 포맷: `excelUtils.js` / `pdfUtils.js` 별도 정독 필요 (이 문서는 호출 위치만 정리)
- `RichTextEditor` 툴바 세부 (이미지/동영상 삽입): `RichText.jsx` 추가 정독 필요
- formula 유형의 `evalFormula` 지원 함수 (sqrt, ^ 등): `utils/formulaEngine.js` 별도
- BankWizardShared / ImportBankModal / ExportBankModal 의 세부 step 흐름: 일부만 확인

---

(끝)
