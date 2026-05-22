# LearningX (LMS) custom.js delta - 퀴즈/문제은행 기능 스펙

> 본 문서는 "Canvas 표준 화면 + LearningX custom.js 보강분" 중 보강분 (delta) 만 정리. Canvas 표준 기능은 별도 산출물 (`canvas-spec.md`) 참조.
> 화면 ID 는 xnquiz SSD 와 동일 (S-01~S-09). 화면별로 어떤 custom 이 영향을 주는지 매핑.
> 분석 기준 시점: 2026-05-21 / 분석 대상 = Canvas Classic Quizzes 만 (New Quizzes 제외)
> 회사 내부 분석 자료. 외부 공유 금지.

---

## 0. custom.js 카탈로그

| 파일 | 상태 | 역할 한줄 요약 | 영향 화면 (S-XX) |
| --- | --- | --- | --- |
| `custom.prevent-quiz-cnp.js` | **활성 (운영)** | 응시 화면에서 우클릭/복사/붙여넣기/드래그 차단 | S-07 |
| `custom.quiz-sticky-sidebar.js` | **활성 (운영)** | 응시 화면 우측 사이드바를 PC=sticky / 모바일=상단 fixed 로 고정. 모바일은 문제목록+남은시간 50/50 레이아웃으로 재구성 | S-07 |
| `custom.quiz-submit-button-styling.js` | **활성 (운영)** | 응시 화면의 "퀴즈 제출" 버튼을 중앙 정렬 + 빨간색(#D9534F)로 강조 | S-07 |
| `custom.quiz-details-guide.example.js` | 예시(.example) | 편집 화면(문제 작성/세부 사항) 에 안내 박스 3종 자동 삽입 + 신규 퀴즈일 때 "오답 여부 표시하기" 자동 해제 | S-02, S-04 |
| `custom.quiz-erratum-download.example.js` | 예시(.example) | 퀴즈 상세 우측 사이드바에 "퀴즈 오답률 다운로드" 버튼 추가 (교수자만) | S-03 |
| `custom.quiz-rescore.example.js` | 예시(.example) | 편집/통계 화면에 재채점 안내 박스 + 문제 유형 라벨 + 단답형(short_answer) 재채점 버튼 + 문제은행 답안 수정 버튼 | S-04, S-06 |
| `custom.quiz-rescore.canvas2024.example.js` | 예시(.example) | 위 rescore 의 Canvas 2024 대응판 (data-reactid 제거 환경에서 Statistics API 로 question ID 매칭) | S-04, S-06 |

> .gitignore 상 `public/customs/canvas/custom.js` (집합 진입점) 은 학교별로 별도 빌드되어 어떤 .example 을 포함할지가 결정됨. 위 표의 "활성/예시" 는 파일명 기준이며, 학교별 활성화 옵션 키는 코드에 명시되어 있지 않아 본 분석에서는 추측 금지.

---

## S-01. 퀴즈 목록 - delta

해당 custom 없음. Canvas 표준 `/courses/:id/quizzes` 화면 그대로.

---

## S-02 / S-04. 퀴즈 생성 · 편집 - delta

### `custom.quiz-details-guide.example.js` (예시)

**적용 URL**: `^/courses/(\d+)/quizzes/(\d+)/edit$`

**훅 / 변경 포인트**

1. **문제 작성 탭 (`#questions_tab`) 상단에 안내 박스 2개 자동 삽입**
   - 앵커: `#xn-auto-rescore-message` 가 있으면 그 위, 없으면 `#show_question_details_wrap` 위
   - 박스 ①: **"이미지 복사·붙여넣기 유의사항"** (분홍 배경 + 경고 아이콘)
     - 메시지: 복붙으로 이미지를 넣으면 일부 PC 에서 표시 안 될 수 있으니 에디터 상단 '첨부' 메뉴 사용 권장
     - 가이드 이미지: `/learningx/customs/canvas/images/quiz-editor-image-upload.png`
   - 박스 ②: **"문제그룹 이용하여 무작위 랜덤 퀴즈 출제 방법"** (파랑 배경 + 정보 아이콘)
     - 절차 4단계: 새 문제 그룹 → 세부 정보 설정 → 문제은행으로 링크 → 그룹 만들기

2. **세부 사항 탭 (`#quiz_options_form`) 상단에 안내 박스 1개**
   - 박스: **"시험(퀴즈) 출제 방법"** 5단계 안내 (세부 정보 → 유형 → 평가 그룹 → 옵션 → 이용 기간)

3. **신규 퀴즈일 때 "오답 여부 표시하기" 자동 해제**
   - 진입 시 `GET /learningx/api/v1/courses/:cid/quizzes/:qid/workflow_status` 호출
   - 응답 `workflow_status === "created"` 이면 (= 아직 게시 안 됨, 즉 새로 만든 직후)
   - `input[name="quiz[hide_results][never]"]` 체크박스가 체크 상태면 자동 click 으로 해제
   - 효과: Canvas 기본값은 학생에게 점수/오답을 안 보여주는데, LearningX 는 "신규 퀴즈는 기본으로 오답 공개" 로 정책을 뒤집음

**모두 i18n 지원** (ENV.LOCALE 로 ko/en 분기). 안내 박스는 `<details>` 토글로 접고 펴기 가능.

### `custom.quiz-rescore.example.js` / `.canvas2024.example.js` (편집 화면 부분)

**적용 URL**: `/courses/(\d+)/quizzes/(\d+)/edit`

**훅 / 변경 포인트**

1. **이미 응시한 학생이 있을 때만 (`#student_submissions_warning` 존재)** `#questions_tab` 안에 **"재채점 기능 안내"** 박스 자동 삽입
   - 내용: 객관식은 정답 수정 후 재채점 옵션 선택 → 저장 시 자동 / 빈칸채우기(단답형) 는 문항별 [재채점] 클릭 / 복수빈칸채우기는 미지원

2. **모든 문제(.display_question) 헤더에 `xn-question-header-sub` 추가**
   - **문제 유형 라벨** (`xn-question-type`): 객관식(정답하나), 객관식(정답 다수), 참/거짓, 빈칸 채우기(단답형), 복수 빈칸 채우기(단답형), 목록에서 선택, 짝짓기, 숫자 답변, 수식, 작문(서술형), 파일 업로드
   - **단답형(short_answer_question) + 응시자 있음** 조건일 때만 **[재채점] 버튼** (`xn-common-btn-blue`) 추가
     - 클릭 → `POST /learningx/api/v1/courses/:cid/quizzes/:qid/questions/:question_id/force-rescore` (Authorization: `Bearer <xn_api_token>` 쿠키 추출)
     - 성공 시 버튼에 `.submitted` 클래스 부여로 색 변경 (페이지 리로드 안 함)
   - 점수 요소(`.question_points_holder`) 를 sub 헤더 마지막 자식으로 이동시켜 정렬 통일

> `.canvas2024.example.js` 는 동일 기능이지만 Canvas 2024 환경에서 `data-reactid` 가 사라진 것에 대응해 `GET /api/v1/courses/:cid/quizzes/:qid/statistics` 응답의 question 배열 인덱스로 매칭. (해당 응답은 CSRF 보호 prefix `while(1);` 제거 후 파싱)

---

## S-03. 퀴즈 상세 - delta

### `custom.quiz-erratum-download.example.js` (예시)

**적용 URL**: `^/courses/(\d+)/quizzes/(\d+)$`

**훅 / 변경 포인트**

- 교수자만 (`.btn.edit_assignment_link` 존재 여부로 판단) 우측 사이드바 `#right-side-wrapper .page-action-list` 끝에 **"퀴즈 오답률 다운로드"** (en: "Download quiz erratum") 회색 버튼(`rgb(120,120,120)`) 추가
- 클릭 시 단순 링크 이동: `GET /learningx/api/v1/courses/:cid/quizzes/:qid/erratum/download`
- Xlearn 서버 측 라우트: `routes/api.php` 의 `Api\v1\component\QuizErratumApiController@downloadQuizErratum`. 즉 LearningX 자체 엔드포인트로, Canvas API 가 아님

---

## S-05. 채점 대시보드 - delta

해당 custom 없음. SpeedGrader (`/courses/:id/gradebook/speed_grader`) 는 Canvas 표준 그대로 사용.

---

## S-06. 통계 - delta

### `custom.quiz-rescore.example.js` / `.canvas2024.example.js` (통계 화면 부분)

**적용 URL**: `/courses/(\d+)/quizzes/(\d+)/statistics`

**훅 / 변경 포인트**

1. **`#question-statistics-section header.padded` 안에 "재채점 기능 안내" 박스 추가** (편집 화면과 동일 카피, `<details>` 토글 / canvas2024 버전은 정적 표시)
2. **각 문항 통계 카드(`.question-statistics.content-box`) header 에 `xn-question-bank-rescore-buttons-wrapper` 주입**
   - 문제별로 LearningX 서버에서 `GET /learningx/courses/:cid/quizzes/:qid/quiz-questions/:question_id/question-banks/rescore-buttons` 를 호출해 받은 HTML 을 그대로 삽입
   - 서버에서 내려오는 버튼 중 `#xn-btn-rescore` 가 있으면 클릭 핸들러 바인딩
     - confirm 다이얼로그: "문제은행에서 수정한 답안으로 재채점을 진행합니다…"
     - 확인 시 `POST /learningx/api/v1/courses/:cid/quizzes/:qid/questions/:question_id/rescore` (Bearer 토큰)
     - 성공 시 alert("재채점이 완료되었습니다.") → 페이지 리로드
   - 즉 "**문제은행에 링크된 문제** 에 한해, 통계 화면에서 문제은행 답안 수정 결과를 학생들에게 다시 적용" 하는 기능
   - 질문 ID 식별:
     - 일반판 = DOM 의 `data-reactid` 에서 `$question-(\d+)` 추출
     - canvas2024판 = Canvas Statistics API 호출해서 인덱스 매칭

---

## S-07. 학생 응시 - delta

### `custom.prevent-quiz-cnp.js` (활성)

**적용 URL**: `/courses/(\d+)/quizzes/(\d+)/take`

**훅 / 변경 포인트**

- `#submit_quiz_form` 전체에 다음 적용
  - 드래그 방지 CSS: `-webkit-user-drag: none; user-select: none` (+ vendor prefix 4종)
  - `contextmenu` 이벤트 무효화 (우클릭 메뉴 차단)
  - `cut / copy / paste` 이벤트에서 `preventDefault + stopPropagation`, 클립보드 비우기, alert("시험화면내 복사/붙여넣기는 허용되지 않습니다.")
- **부정행위 방지 보강용. 운영 적용 3종 중 1.** 모든 학교에 적용 중

### `custom.quiz-sticky-sidebar.js` (활성)

**적용 URL**: `/courses/\d+/quizzes/\d+/take` (정규식)

**훅 / 변경 포인트 (PC, 너비 > 768px)**

- `#right-side-wrapper` 에 `position: sticky; top: 0; align-self: flex-start` 만 적용 → 우측 사이드바(문제 목록 / 남은 시간) 가 본문 스크롤 따라가지 않고 화면 상단 고정

**훅 / 변경 포인트 (모바일, 너비 ≤ 768px)**

- `#right-side-wrapper` 를 `<body>` 자식으로 이동 후 `position: fixed; top:0; left:0; right:0; z-index:99999`
- 좌 50% : 문제 목록 (`question_list` 가 max-height 80px scroll), 우 50% : `quiz-time-elapsed` 로 2단 재구성
- `.quiz-header > h1` 위에 `#quiz-header-spacer` 100px 삽입 (단, `.mobile-header-title.expandable` 가 있으면 0px) → 시험/설문일 때만 여백 확보
- 1초 간격 `setInterval` 로 Canvas 가 DOM 재조작해도 상태 유지
- 리사이즈 250ms debounce 후 재적용

**관련 이슈**: 코드 주석에 LXCCUP-254, LXCCUP-275 명시.

### `custom.quiz-submit-button-styling.js` (활성)

**적용 URL**: `/courses/(\d+)/quizzes/(\d+)/take` (preview 포함)

**훅 / 변경 포인트**

- `#submit_quiz_button` 색을 빨강(`#D9534F`, hover `#C9302C`) + 흰 글씨로 변경, 최소 너비 200px
- `.form-actions` 를 `display: flex; flex-direction: column; align-items: center; gap: 10px` 로 중앙 정렬
- `#last_saved_indicator` (마지막 저장 표시) 도 가운데 정렬
- 의도: 제출 버튼을 위험/주의 색으로 강조해 "확정 제출" 인식 강화

---

## S-08. 문제은행 목록 - delta

해당 custom 없음. Canvas 표준 `/courses/:id/question_banks` 그대로.

> 단, `routes/web.php` 라인 201 에 `Route::post('/question_banks', 'QuestionBanks\LTIController')` 가 있는데 이는 LTI 진입용이라 본 분석 범위 밖.

---

## S-09. 문제은행 상세 - delta

해당 custom 없음.

> 단, S-06 의 재채점 기능이 사실상 "문제은행 답안 수정 → 적용" 흐름과 직결되므로, 문제은행 자체 화면에 보강은 없지만 **문제은행 수정의 효과를 응시 결과에 반영하는 후공정** 이 S-06 에서 일어남.

---

## A. Xlearn (Laravel) 자체 화면이 있는 경우

`routes/web.php` 의 `Route::group(['prefix' => 'courses/{course_id}/quizzes/{quiz_id}'])` 그룹 (line 588~603) 에서 Canvas 가 아닌 LearningX 자체 Blade 화면을 제공:

| URL 패턴 | 컨트롤러 메서드 | 권한 | 화면 |
| --- | --- | --- | --- |
| `GET /courses/:cid/quizzes/:qid/quiz-questions/:qqid/question-banks/rescore-buttons` | `Canvas\QuizController@viewQuestionBankRescoreButtons` | 강좌 운영자 | 통계 화면에 주입할 **재채점 버튼 fragment** (Blade view: `quiz.question-bank-rescore-buttons`). S-06 custom.js 가 fetch 해서 innerHTML 로 박음 |
| `GET /courses/:cid/quizzes/:qid/cheating-prevention` | `viewCheatingPrevention` | 강좌 운영자 | **AI 시험감독** 설정/현황 화면 (Blade: `quiz.cheating-prevention-view`) |
| `GET /courses/:cid/quizzes/:qid/cheating-prevention/view-reports/:reportName` | `viewReportsOfCheatingPrevention` | 강좌 운영자 | AI 시험감독 리포트 상세 |
| `GET /courses/:cid/quizzes/:qid/cheating-prevention/edit` | `editCheatingPrevention` | 강좌 운영자 | AI 시험감독 설정 편집 (Blade: `quiz.cheating-prevention-edit`) |
| `GET /courses/:cid/quizzes/:qid/cheating-prevention/prep` | `viewCheatingPreventionPrepInfo` | 인증 | 학생용 사전 안내 (Blade: `quiz.cheating-prevention-prep-view`) |
| `GET /courses/:cid/quizzes/:qid/pre_exam_consent/edit` | `editPreExamConsent` | 강좌 운영자 | **시험 응시 전 필수 동의** 설정 (Blade: `quiz.pre-exam-consent-edit`) |
| `GET /cheating-prevention-guide/trustlock-browser` | `viewTrustLockBrowserGuide` | 공개 | TrustLock 브라우저 안내 |
| `GET /cheating-prevention-guide/proctoring-x` | `viewProctoringXGuide` | 공개 | ProctoringX 안내 |
| `GET /cheating-prevention-guide/compatibility` | `viewCompatibilityGuide` | 공개 | 호환성 안내 |

**자체 API 라우트** (`routes/api.php`) :
- `GET /learningx/api/v1/courses/:cid/quizzes/:qid/workflow_status` - 신규/게시 여부 확인
- `POST /learningx/api/v1/courses/:cid/quizzes/:qid/questions/new` - 문제 새로 추가 (Canvas wrapper)
- `POST /learningx/api/v1/courses/:cid/quizzes/:qid/publish` - 게시 트리거
- `POST .../questions/:qid/rescore` - 단일 문항 재채점 (문제은행 답 수정 반영)
- `POST .../questions/:qid/force-rescore` - 단답형 강제 재채점
- `POST .../rescore-without-partial-points` - 부분점수 없이 재채점
- `GET .../erratum/download` - 오답률 엑셀 다운로드

**자체 Blade 화면**: 위 그룹 외에 `quizmon` 같은 자체 모니터 화면은 현재 `routes/` 에서 확인 불가. (브랜치 LXCCUP / DKUQMON 키워드도 코드에 안 잡힘. 본 시점 main 트렁크에 머지 안 됨)

---

## B. 캡쳐 매핑

`C:\Users\김민주\Downloads\quiz` 의 파일을 화면별로 분류 (파일명 기반 추정. 이미지 직접 확인 X).

| 파일 | 추정 화면 | 권한 / 모드 |
| --- | --- | --- |
| `01-list.png`, `quizlist.png` | S-01 퀴즈 목록 | 교수자 |
| `02-detail.png`, `03-edit-details.png` | S-03 퀴즈 상세 | 교수자 |
| `03-edit.png`, `04-edit-questions.png` | S-02/S-04 편집 | 교수자 |
| `01-entry.png` | S-07 진입 / 응시 시작 | 학생 |
| `01-mc.png`, `02-tf.png`, `03-sa.png`, `04-fimb.png`, `05-ma.png`, `06-md.png`, `07-matching.png`, `08-numerical.png`, `09-calculated.png`, `10-essay.png`, `11-file-upload.png.png` | S-07 응시 - 문제 유형별 | 학생 |
| `02-first-question.png`, `03-answering.png`, `04-progress.png`, `05-multi-page.png` | S-07 응시 진행 | 학생 |
| `08-submit-confirm.png` | S-07 제출 확인 | 학생 |
| `canvas-dev.xinics.kr_courses_3_quizzes_5_take.png` | S-07 응시 (실 URL) | 학생 |
| `04-instructor-view.png`, `05-show-instructor.png` | S-07 교수자 미리보기 | 교수자 |
| `01-moderate.png` | S-07/Moderate Quiz | 교수자 (응시 관리) |
| `01-speed-grader.png` | S-05 SpeedGrader | 교수자 |
| `01-stats.png` | S-06 통계 | 교수자 |
| `01-student-quiz-result.png`, `02-student-quiz-history.png`, `03-student-score-only.png` | S-07 응시 결과 | 학생 |
| `04-account.png` | 계정 화면 (범위 외) | - |
| `canvas-dev.xinics.kr_courses_3_question_banks_4.png` | S-09 문제은행 상세 | 교수자 |

---

## 분석 환경

- 본 산출물은 회사 내부 분석 목적임. 외부 공유 / 업로드 금지.
- 분석 대상 소스: `C:\Users\김민주\Desktop\Xlearn\Xlearn` (Laravel 5.5 래퍼) / `public/customs/canvas/*.js`
- 분석 대상 범위: **Canvas Classic Quizzes** 만. New Quizzes 는 LearningX 가 미사용이므로 제외.
- 활성(.js) 3개 + 적용 가능성 높은 .example.js 4개 = 총 **7개 custom 분석**.
- .example.js 의 학교별 활성화 옵션 키는 코드에 명시 안 되어 추측하지 않음.
- 코드 raw 복사 없음. 동작 요약과 셀렉터/URL 패턴만 인용.
