# SCR-09. 학생 응시·동의 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 학생 응시 흐름(`/quiz/:id/attempt`) 의 현재 프로토타입 동작. 진입 전 PreflightGate(동의/보안 안내) + 응시 중 본체(답안 입력/저장/제출) + 수집 고지 카피 통합. 결과 확인 본체는 향후 학생 결과 SSD 위임 (현재 보류).

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-09-v1.1 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-006](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076877315) v1.0 (학생 측 문항 헤더), [XQ-URD-021-B](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081759746) v1.0 (학생 측), [XQ-URD-023](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5082218497) v1.0 (학생 측 수집 고지) |
| 참조 코드 | `src/pages/QuizAttempt.jsx`, `src/components/PreflightGate.jsx` (SecurityActiveBadges 포함) |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
학생 (student):
시험 목록(SCR-01) → 시험 카드 클릭 → /quiz/:id/attempt (SCR-09)
                                       ├ 보안 옵션 0개 → 응시 화면 직진 (SCR-L-ATTEMPT)
                                       └ 보안 옵션 1개 이상 → PreflightGate (SCR-L-PREFLIGHT)
                                          ├ "응시 취소" → 홈
                                          └ "동의하고 응시 시작" → SCR-L-ATTEMPT + SecurityActiveBadges 노출
                                                                  └ 제출 → 결과 화면 (향후 학생 결과 SSD)

교수자 (instructor) 미리보기:
시험 편집(SCR-02) → "미리보기" → /quiz/:id/attempt?preview=true → PreflightGate 건너뛰고 SCR-L-ATTEMPT 직진

핵심 태스크 클릭 뎁스:
- 응시 시작 (보안 0개): 시험 카드 → 응시 시작 (2단계)
- 응시 시작 (보안 활성): 시험 카드 → PreflightGate → 동의 → 응시 시작 (4단계)
```

**도달 원칙**

- 진입 권한: 학생(student) — 본인 수강 시험만. 교수자는 `?preview=true` 미리보기 모드로 진입 가능 (응시 데이터 기록 없음).
- 보안 옵션 1개 이상 활성된 시험은 PreflightGate 자동 노출. 0개면 응시 화면 직진.
- 미리보기 모드는 PreflightGate 건너뜀.
- 응시 중 활성 보안 옵션 배지(`SecurityActiveBadges`) 만 노출. 이상 후보 단서 / 부정행위 단정은 학생 화면 표시 금지 (UX-COM-003).
- 자동 저장: 답안 입력 시 `localStorage` (`xnq_attempt_session_*`) 에 영속. 새로고침 시 복원 (mock 모드).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트 / 진입** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-L-PREFLIGHT | 응시 진입 전 안내 + 동의 | `/quiz/:id/attempt` 진입 시 hasSecurity 조건 | 학생 | UX-P08-001/002/003/010/011/030 (URD-021-B), UX-STD-001/002/003 (URD-023) | P0 |
| SCR-L-ATTEMPT | 학생 응시 본체 | `/quiz/:id/attempt` 본문 | 학생 | UX-P08-001~005 (URD-006, 문항 헤더) | P0 |
| SCR-L-ATTEMPT-SECURITY-BADGE | 응시 중 활성 보안 옵션 배지 | 응시 화면 인라인 영역 | 학생 | UX-P08-020/021, UX-COM-003 (URD-021-B) | P1 |

---

## 3. 화면별 상세 설계

### SCR-L-PREFLIGHT. 응시 진입 전 안내 + 동의

**구현 파일**: `src/components/PreflightGate.jsx`

**목적**

보안 옵션 1개 이상 활성된 시험에서 학생이 응시 진입 전에 (1) 활성 옵션 종류와 자신이 충족해야 할 조건을 인지하고 (2) 응시 로그 수집 고지를 확인한 뒤 (3) 동의 후 응시 시작.

**진입 조건**: `hasSecurity = quiz.securityTrustLock || quiz.securityAiProctoring || quiz.securityRequireConsent`. 그리고 `!consentGiven && !submitted && !restored && !isPreview`.

**레이아웃**

```
[max-w-2xl 컨테이너]
[헤더]
  ├── ShieldCheck 아이콘 + h1 "응시 전 필수 안내"
  └── 보조 카피: "이 시험은 응시 전에 확인해야 하는 보안/감독 항목이 있습니다..."

[Card]
  ├── 시험명 영역
  │    ├── 라벨 "시험명"
  │    └── 시험 제목
  ├── SecurityItemCard × N (활성 옵션만)
  │    ├── 시험 전용 브라우저 (Lock 아이콘)
  │    │    └── title + detail + checklist (설치 / 닫기 금지)
  │    ├── AI 시험 감독 (Camera 아이콘)
  │    │    └── title + detail + checklist (웹캠 허용 / 카메라 위치 / 환경 준비)
  │    └── 응시 전 필수 동의 (FileCheck2 아이콘)
  │         └── title + detail
  ├── (필수 동의 활성 시) 동의 안내문 영역
  │    ├── 라벨 "동의 안내문"
  │    └── <pre> (whitespace-pre-wrap, DEFAULT_CONSENT_TEXT 또는 강사 입력값)
  ├── 동의 체크박스 영역
  │    ├── native checkbox (accent-primary)
  │    └── 카피 "위 안내 사항을 모두 읽었으며, 응시 중 보안 옵션이 활성화되는 데 동의합니다"
  └── warning 박스
       └── AlertTriangle + "동의하지 않으면 응시 화면으로 진입할 수 없습니다..."

[하단 액션 (justify-end)]
  ├── "응시 취소" (ghost) → onCancel (→ 홈)
  └── "동의하고 응시 시작" (default) → onConsent
       └── 체크박스 미선택 시 disabled
```

**동의 안내문 기본 카피 (DEFAULT_CONSENT_TEXT)**

```
- 응시 중 화면, 웹캠 이미지, 시스템 활동 로그가 본 시험의 부정행위 검증 목적으로 기록됩니다.
- 수집된 정보는 시험 종료 후 6개월간 보관 후 안전하게 삭제됩니다.
- 응시 중 다른 응용프로그램 사용/외부 통신은 부정행위로 판단될 수 있습니다.
```

URD-023 의 UX-STD-001/002/003 (수집 항목 / 사용 목적 / 보존 기간 / 접근 권한 / 활용 범위) 중 보존(6개월) + 목적(부정행위 검증) 은 카피에 포함. 접근 권한 / 활용 범위 제한은 미포함 → 간극 G-1 (법무 검토 의존).

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `Card` (shadcn) | 컨테이너 카드 |
| `Button` (shadcn) | 응시 취소 (ghost) / 동의하고 응시 시작 (default + disabled 분기) |
| `SecurityItemCard` (PreflightGate.jsx 내부) | 활성 옵션별 카드 |
| native `<pre>` | 동의 안내문 (whitespace-pre-wrap) |
| native `<input type="checkbox">` | 동의 체크박스 |
| Lucide icons | ShieldCheck / Lock / Camera / FileCheck2 / AlertTriangle |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | `hasSecurity && !consentGiven && !submitted && !restored && !isPreview` | 응시 화면 진입 전 자동 노출 |
| I-2 | 체크박스 변경 | `confirmed` state 갱신. "동의하고 응시 시작" disabled 해제/적용 |
| I-3 | "동의하고 응시 시작" 클릭 (confirmed=true) | `onConsent` 호출 → 부모(QuizAttempt) 가 `consentGiven=true` 설정 → SCR-L-ATTEMPT 렌더 |
| I-4 | "응시 취소" 클릭 | `onCancel` → 홈(/) |

**상태**

| **상태** | **표현** |
|---|---|
| 보안 옵션 0개 | PreflightGate 미노출, SCR-L-ATTEMPT 직진 |
| 보안 옵션 1개 이상 + consentGiven=false | PreflightGate 노출. 활성 옵션만 SecurityItemCard 로 렌더 |
| 미리보기 모드 (?preview=true) | PreflightGate 건너뜀 |
| 동의 미체크 | "동의하고 응시 시작" disabled |
| 동의 체크 완료 | 버튼 활성, 클릭 시 응시 시작 |
| 동의 거부 후 복귀 | 홈 이동 → 다시 진입 시 PreflightGate 재노출 (영구 차단 정책 미구현 → 간극 G-2) |

**데이터 흐름**

PreflightGate 는 별도 fetch 없이 상위(QuizAttempt)에서 받은 `quiz` 객체만 사용. 동의 결과는 상위 state(`consentGiven`) 에 반영.

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 부모 진입 직후 | 없음. `quiz` prop 만 사용 | 없음. `quiz` prop 만 사용 | `securityTrustLock` / `securityAiProctoring` / `securityRequireConsent` / `securityConsentText` 읽어 SecurityItemCard 렌더 | Quiz (3.4.6 보안/감독 필드) |
| D-2 | "동의하고 응시 시작" 클릭 | 부모 state `consentGiven=true` 설정. 서버 호출 없음 | 부모 state `consentGiven=true` 설정. 서버 호출 없음 | SCR-L-ATTEMPT 로 전환 | (해당 없음) |
| D-3 | "응시 취소" 클릭 | `navigate('/')` | `navigate('/')` | 홈 이동 | (해당 없음) |

**예상 권한 검증** (백엔드 권고): 부모 `QuizAttempt` 진입 시 이미 `role === 'student'` 검증 + Quiz 조회 권한 검증 완료. PreflightGate 단독 권한 검증 불요.

---

### SCR-L-ATTEMPT. 학생 응시 본체

**구현 파일**: `src/pages/QuizAttempt.jsx`

**목적**

학생이 시험 응시를 진행하며 문항을 순회하고 답안을 입력/저장하고 제출. mock 모드는 `localStorage` 에 자동 저장 (`xnq_attempt_session_*`), API 모드는 서버 호출(`POST /attempts` → `PUT /answers` → `POST /submit`).

**레이아웃 (정상 상태)**

```
[헤더 영역]
  ├── 시험 제목 + 응시자 정보 (이름)
  ├── 남은 시간 (제한 시간 활성 시) — 카운트다운
  ├── SecurityActiveBadges (보안 활성 옵션) — SCR-L-ATTEMPT-SECURITY-BADGE
  └── 진행률 (현재 문항 / 전체 문항)

[본문 (문항 표시)]
  └── 현재 문항 카드
       ├── 문항 헤더
       │    ├── 번호 (예: "문제 1")
       │    └── 제목 (입력값 있을 때만, 예: ". 데이터베이스 정규화") — UX-P08-001
       ├── 본문 (RichText 렌더, HTML/이미지/iframe)
       ├── 배점 표시
       └── 답안 입력 영역 (유형별)
            ├── multiple_choice: 라디오 보기 N개
            ├── true_false: 참/거짓 라디오
            ├── multiple_answers: 체크박스 보기 N개
            ├── short_answer: 텍스트 input
            ├── essay: textarea
            ├── numerical: 숫자 input
            ├── formula: 숫자 input
            ├── matching: 좌-우 선택 드롭다운
            ├── fill_in_multiple_blanks: 빈칸별 input
            ├── multiple_dropdowns: 본문 안 드롭다운
            ├── file_upload: 파일 선택
            └── text (안내문): 답안 입력 영역 없음 (UX-P08-002)

[하단 액션]
  ├── 이전 문항 (Button ghost)
  ├── 문항 인덱스 (1 / N)
  └── 다음 문항 / 제출 (Button primary)

[제출 후 결과 화면 (현재 프로토타입)]
  └── 결과 영역 (간단한 점수 / 답안 표시)
       └── 본격 결과 화면은 향후 학생 결과 SSD 에서 보강
```

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `Card` (shadcn) | 문항 카드 |
| `Button` (shadcn) | 이전 / 다음 / 제출 |
| `Input` / `Textarea` (shadcn) | 답안 입력 |
| `Checkbox` / `RadioGroup` (shadcn) | 객관식 / 다중 답안 |
| `RichText` (내부) | 본문 HTML 렌더 |
| `SecurityActiveBadges` (PreflightGate.jsx export) | 응시 중 활성 보안 옵션 배지 |
| Lucide icons | Clock / ChevronLeft / ChevronRight / CheckCircle2 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (`/quiz/:id/attempt`) | quiz / questions 로드. consentGiven 분기에 따라 PreflightGate or 응시 화면 |
| I-2 | 답안 입력 | mock: `localStorage` (xnq_attempt_session_*) 자동 저장. API: `PUT /answers/:id` 호출 |
| I-3 | 이전/다음 문항 | currentIndex 갱신. 답안 보존 |
| I-4 | 제한 시간 만료 | 자동 제출. Toast 안내 |
| I-5 | 제출 클릭 | 확인 다이얼로그 → 확인 시 `POST /submit` (API) 또는 mock 채점. 결과 화면 전환 |
| I-6 | 응시 중 새로고침 | mock: localStorage 복원 → `restored=true`. PreflightGate 건너뜀 |
| I-7 | 응시 중 화면 이탈 | activityLog 에 focusLoss 이벤트 기록 (학생 화면엔 미노출, 교수자 채점 화면 ActivityLogPanel 에서 확인) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 응시 중 | startTime 있음, submitted 없음 | 정상 응시 화면 |
| 시간 만료 임박 | 남은 시간 < 5분 | 카운트다운 색상 변경 (warning) |
| 시간 만료 | 남은 시간 = 0 | 자동 제출 + Toast |
| 제출 완료 | submitted=true | 결과 화면 전환 |
| 응시 중 복원 | localStorage 세션 있음 | 마지막 답안 복원, restored=true |
| 답안 자동 저장 안내 | 답안 입력 후 blur | (현재 별도 Toast 없음, 상시 저장) |

**데이터 흐름**

응시 본체의 핵심 데이터 흐름. mock/api 분기 명확.

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 라우트 진입 (`/quiz/:id/attempt`) | `mockQuizzes.find(id)` + `mockGetQuestions(id)` 동기 | `Promise.all([getQuiz(id), getQuizQuestions(id)])` → `GET /api/quizzes/:id` + `GET /api/quizzes/:id/questions` | `setQuiz` + `setQuestions`. 실패 시 console 에러 + 로딩 종료 | Quiz, Question |
| D-2 | 진입 시 세션 복원 검사 | `loadAttemptSession(sessionKey)` from localStorage | (서버 권위 권고) `GET /api/attempts?quizId={id}&submitted=false` 로 미제출 attempt 조회 후 재개 | 복원 데이터 있으면 `answers`/`currentIndex`/`startedAt` 초기값에 주입, `restored=true` 표시 | Attempt, Answer |
| D-3 | 답안 변경 (사용자 입력) | `setAnswers` + `snapshotRef` 갱신 + `dirtyRef=true`. 30초 주기 또는 페이지 이탈 시 `saveAttemptSession(sessionKey, snapshot)` to localStorage | 동일 트리거에 `PUT /api/attempts/:attemptId/answers` 멱등 호출 (현재 mock 은 호출 시점이 제출 시이지만, 백엔드 권고는 autosave 시점 PUT) | 성공 시 `lastSavedAt` 갱신 + `saveError=null`. 실패 시 `saveError='quota' \| 'error'` 표시 | Answer (`response`, `autoSavedAt`) |
| D-4 | 답안 변경 시 활동 로그 기록 | `appendActivityLog(activityKey, { type: ANSWER_CHANGE, qId })` to localStorage (1.5초 디바운스) | (백엔드 권고) `POST /api/attempts/:id/activity` 비동기. 또는 클라이언트 일괄 수집 후 제출 시 일괄 전송 | 실패 시 silent fail | ActivityLog |
| D-5 | 포커스 이탈/복귀 | `appendActivityLog` (FOCUS_LOSS / FOCUS_GAIN) | 동일. 비동기 POST 또는 일괄 전송 | silent | ActivityLog |
| D-6 | 제한 시간 만료 또는 lockDate 도래 | `handleSubmit(auto=true)` 호출 | 동일 + 서버 권위 자동 제출 (서버 cron 또는 lazy check, CES-A-01/A-03) | 결과 화면 전환 | Attempt (`autoSubmitted=true`) |
| D-7 | "제출" 클릭 (사용자) | 확인 다이얼로그 → `saveStudentAttempt(id, attempt)` to localStorage | 1) `startAttempt(id)` if `!apiAttemptId` → `POST /api/attempts`<br/>2) `saveAnswers(attemptId, answerArr)` → `PUT /api/attempts/:id/answers`<br/>3) `submitAttempt(attemptId)` → `POST /api/attempts/:id/submit` | 응답 받아 `autoScores`/`totalAutoScore`/`manualPending`/`submittedAt`/`isLate`/`graded`/`totalScore` 재동기화. 실패 시 AlertDialog `제출 실패` 표시 | Attempt (`submitted=true`, `submittedAt`, `autoScore`, `late`), Answer (`autoScore`) |
| D-8 | 제출 직후 정리 | `clearAttemptSession(sessionKey)` from localStorage. `appendActivityLog(SUBMIT)` 1회 | 동일. 서버 권위 attempt 가 submitted=true 상태로 갱신됨 | 결과 화면 전환 | Attempt, ActivityLog |

**예상 권한 검증** (백엔드 권고)

- `POST /api/attempts`: `(quizId, userId)` 로 (가) Quiz.status 가 `open` 이고 응시 가능 기간 + (나) IP/accessCode 제한 통과 + (다) `allowAttempts` 회차 미초과 검증 (CES-A-07, E-01, F-01, F-02)
- `PUT /api/attempts/:id/answers`: `attempt.userId === currentUser.id` + `attempt.submitted === false` 검증
- `POST /api/attempts/:id/submit`: 동일 + 멱등성 보장 (이미 제출된 attempt 재제출 시 4xx)

**에러 응답 권고**

| **상황** | **HTTP** | **클라이언트 처리** |
|---|---|---|
| Quiz 미존재 또는 권한 없음 | 404 | "퀴즈를 찾을 수 없습니다" |
| Quiz.status 가 `open` 아님 | 409 | 상태별 안내 카피 (draft/grading/closed) |
| `allowAttempts` 회차 초과 | 409 | "응시 가능 횟수를 초과했습니다" |
| 액세스 코드 불일치 | 401 | "응시 코드가 올바르지 않습니다" |
| IP 제한 위반 | 403 | "허용되지 않은 위치에서의 응시입니다" |
| 시간 만료 후 제출 시도 | 409 | "응시 시간이 종료되었습니다" |
| 서버 오류 | 5xx | AlertDialog `제출 실패` + 재시도 안내 |

---

### SCR-L-ATTEMPT-SECURITY-BADGE. 응시 중 활성 보안 옵션 배지

**구현 파일**: `src/components/PreflightGate.jsx` 의 `SecurityActiveBadges` export

**목적**

응시 중 학생이 자신의 응시가 어떤 보안 조건 아래 진행되는지 인지하도록 활성 보안 옵션을 배지로 표시 (UX-P08-020). 이상 후보 판정 / 부정행위 단정은 표시 금지 (UX-COM-003).

**레이아웃**

```
[활성 옵션 1개 이상 시]
  └── 배지 묶음 (flex-wrap gap-1.5)
       ├── 시험 전용 브라우저 활성: "Lock 아이콘 + 전용 브라우저 활성"
       ├── AI 시험 감독 활성: "Camera 아이콘 + AI 감독 동작 중"
       └── 응시 전 필수 동의 활성: "FileCheck2 아이콘 + 동의 완료"

[활성 옵션 0개 시]
  └── 배지 묶음 비노출 (null 반환)
```

**배지 스타일**

- `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium`
- `bg-accent text-primary`
- `title="응시 중 활성 보안 옵션"` (호버 안내)

**상태**

| **상태** | **표현** |
|---|---|
| 활성 옵션 0개 | null 반환, 영역 자체 미렌더 |
| 1~3개 활성 | 활성된 옵션만 배지로 노출 |

**데이터 흐름**

상위 컴포넌트(QuizAttempt)에서 `quiz` prop 만 받음. 별도 fetch 없음. 데이터 사전 Quiz 의 보안 필드(3.4.6) 만 참조.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **SCR-L-PREFLIGHT** | **SCR-L-ATTEMPT** | **SECURITY-BADGE** |
|---|---|---|---|---|
| 모바일 | ~767px | max-w-2xl 자동, SecurityItemCard 1열, 액션 우측 정렬 | 헤더 sticky, 답안 영역 전폭, 하단 액션 sticky | 배지 자동 줄바꿈 |
| 태블릿 | 768~1023px | max-w-2xl 중앙 | 본문 중앙 정렬, 양 옆 여백 | 인라인 |
| 데스크톱 | 1024px~ | max-w-2xl 중앙 | 본문 max-w-3xl 중앙 | 인라인 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | quiz / questions fetch 중 | Skeleton 또는 로딩 카피 |
| 빈 상태 (문항 0개) | quiz 에 questions 없음 | "아직 등록된 문항이 없습니다" 안내 |
| 에러 (외부 SaaS 안내) | AI 감독 외부 신호 (웹캠 끊김 등) | 현재 미통합 (외부 책임) → 간극 G-3 |
| 권한 없음 | role !== 'student' (교수자 직접 URL, 미리보기 아닌 경우) | 안내 또는 차단 |
| 오프라인 | API 모드 한정 | mock 모드는 localStorage 자동 저장으로 복원 가능. API 모드는 후속 검토 |
| 동의 거부 후 복귀 | 학생이 응시 취소 후 다시 진입 | PreflightGate 재노출 (영구 차단 정책 미구현 → 간극 G-2) |
| 응시 중 표시 경계 위반 | (해당 없음) | SecurityActiveBadges 는 활성 사실만 노출. 이상 후보 / 판정 단서는 학생에게 노출되지 않음 (UX-COM-003 충족) |
| 응시 발생 후 강사 측 변경 | 강사가 응시 시작 후 문항 수정 | 응시 시작 시점 문항 유지 (UX-P08-005). 제목 변경 안내 카피 미구현 → 간극 G-4 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 개인정보 처리 안내 (보존/접근/삭제, UX-P08-030, URD-021-B OQ-02) | (B) 법무 검토 의존 | URD OQ-XQ-URD-021-B-02 의존. 법무 검토 후 동의 안내문 갱신 |
| G-2 | 동의 거부 후 복귀 정책 (UX-P08-011, URD-021-B OQ-01) | (B) 정책 미확정 | URD OQ-XQ-URD-021-B-01 의존. 정책 확정 후 SSD 보강 |
| G-3 | 외부 SaaS 안내 (웹캠 끊김 등 조치 안내, UX-P08-021) | (B) 외부 책임 | 외부 SaaS 통합 시점에 별도 SSD 보강 |
| G-4 | 응시 발생 후 제목 변경 시 안내 카피 (URD-006 UX-P02-010) | (B) C 분류 후속 카피 | 강사 측 변경 시 학생 응시 화면 영향 안내. 후속 카피 작업 |
| G-5 | 기본값 수준 제목 학생 비노출 판별 (URD-006 UX-P02-011) | (B) 후속 | 판별 로직 + 안내 카피 미구현 |
| G-6 | 학생 결과 화면 본체 | (B) 보류 | 학생 결과 화면 SSD 보강 시 추가 (현재 보류, README §2 참조) |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 3개 화면(PREFLIGHT/ATTEMPT/SECURITY-BADGE) 각각에 데이터 흐름 절 추가. ATTEMPT 본체에 D-1~D-8 단계별 mock/api 호출 + 데이터 사전 v0.1 엔티티 매핑 + 권한 검증 + 에러 응답 권고 통합 | 김민주 (Creator/PD) |
