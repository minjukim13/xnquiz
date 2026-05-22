# S-02. 퀴즈 생성 - Canvas / LMS / xnquiz 비교

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
|---|---|---|
| Canvas | `POST /courses/:course_id/quizzes/new` → `/quizzes/:id/edit` 302 리다이렉트 | `permissions.create` (`manage_assignments_add`) |
| LMS (LearningX) | Canvas 와 동일 + custom.js delta | `permissions.create` |
| xnquiz | `/quiz/new` | INSTRUCTOR only (학생 진입 시 `/` 리다이렉트) |

화면 한줄 요약:
- Canvas: 별도 "생성 화면" 이 없음. 헤더 "+ Quiz" 클릭 → 빈 퀴즈 즉시 DB 생성 → 편집 폼으로 302. 즉 S-04 와 본체 동일, "생성 직후" 만 차이 (제목 input autofocus / "Not Published" 고정 / "Save & Publish" 노출 / 응시 시작 경고 미노출 / Master Course 잠금 필드 없음).
- LMS: Canvas 표준 흐름 + `custom.quiz-details-guide.example.js` 가 편집 진입 직후 안내 박스 3종 자동 삽입 + 신규 퀴즈일 때 "오답 여부 표시하기" 자동 해제.
- xnquiz: 빈 퀴즈 사전 생성 없이 클라이언트에서 폼 작성 후 한번에 저장. 탭 2개 ("기본 정보" / "문항 구성"). 임시저장 / 저장하기 분리. ID 부여는 저장 시점.

## 2. 기능 매트릭스 (핵심)

### 2-1. 진입 / 라우팅

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 진입 시점 빈 퀴즈 즉시 생성 | O (`workflow_state=unpublished`, 빈 제목) | O | - | xnquiz 는 저장 시점에 생성 |
| 편집 폼 302 리다이렉트 | O (`/quizzes/:id/edit`) | O | - | xnquiz `/quiz/new` 별도 페이지 |
| 제목 input autofocus | O (`autofocus`) | O | O (마운트 시 InfoTab 첫 input) | - |
| URL 직접 진입 (권한 부족) → 403 | O | O | O (차이: `/` 리다이렉트) | xnquiz 는 클라이언트 가드 |
| 신규 진입 표시 ("Not Published" 고정) | O | O | - → "임시저장" 상태 도입 | xnquiz 는 별도 상태 모델 |
| 응시 시작 경고 배너 | - (생성 직후엔 미노출) | - | - | 동일 (생성은 응시자 없음) |

### 2-2. 헤더 / 페이지 구조

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 페이지 제목 텍스트 | - (탭만 노출) | - | O (신규 [C]) "새 퀴즈 만들기" | - |
| 배점 표시 (자동 합계) | O (`#quiz_display_points_possible`) | O | O ("{N}문항 \| 총 {N}점") | xnquiz 는 문항 탭 헤더 |
| 게시 배지 ("Published"/"Not Published") | O (`#quiz-draft-state`) | O | - → "임시저장" 토글로 대체 | - |
| ⋮ Manage 드롭다운 (편집 헤더) | O (`#manage-toolbar`) | O | - | xnquiz 생성 화면엔 없음 |
| 탭 UI ("Details / Questions / Mastery Paths") | O (`#quiz_tabs`, ui-tabs-minimal) | O | O (차이: "기본 정보" / "문항 구성" 2개만) | xnquiz 는 Mastery Paths 없음 |
| `student_submissions_warning` 배너 | - (생성 직후엔 미노출) | - | - | 동일 |

### 2-3. 기본 정보 (Details / 기본 정보 탭)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 제목 (`quiz_title`) | O (maxlength=254, required, autofocus) | O | O (필수, 빨간 별표) | placeholder: Canvas 없음 / xnquiz "예) 중간고사 - 데이터베이스 설계" |
| 설명 (`quiz_description`) | O (TinyMCE/RCE) | O | O (차이: textarea rows=8, RCE 아님) | xnquiz 는 plain text |
| 퀴즈 유형 (`quiz_type`) | O (practice_quiz / assignment / graded_survey / survey 4종) | O | O (차이: "평가용" / "연습용" 2종, 카드 라디오) | survey 계열 미지원 |
| 평가 그룹 (`assignment_group_id`) | O (셀렉트, active group 기본) | O | - | xnquiz 는 grade book 통합 없음 |
| 배점 직접 입력 (graded_survey 만) | O (`quiz_points_possible`) | O | - | xnquiz 는 문항 점수 합계만 |
| Suppress Assignment 체크박스 | O (`root_account.suppress_assignments?`) | O | - | xnquiz 범위 외 |
| 주차/차시 (`week`, `session`) | - | - | O (신규 [B-#01]) `WeekSessionPicker` | xnquiz 자체 메타 |
| 코스별 주차/차시 옵션 localStorage 저장 | - | - | O (신규 [C]) | - |

### 2-4. Options (응시 / 시간 / 재응시 / 셔플 / 결과 공개)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Shuffle Answers 체크박스 | O (`quiz_shuffle_answers`) | O | O ("선지 순서 섞기" 토글) | UI 차이 (checkbox vs toggle) |
| Shuffle Questions | - | - | O (신규 [C]) "문제 순서 섞기" 토글 | Canvas 미지원 |
| Time Limit (체크 + 분 입력) | O (`time_limit_option` + `quiz_time_limit`) | O | O ("시간 제한 사용" 토글 + 분 입력) | placeholder "60", min 1 |
| Disable Automatic Submission | O (`feature(:timer_without_autosubmission)` 필요) | O | O ("자동 제출 5분 유예" 토글) | xnquiz: 이용 종료 일시 필수 (검증 #6) |
| Anonymous Submissions (survey 만) | O (`quiz_anonymous_submissions`) | O | - | survey 미지원 |
| Allow Multiple Attempts | O (`multiple_attempts_option`) | O | O ("재응시 허용" 토글) | - |
| Quiz Score to Keep | O (keep_highest / keep_latest / keep_average) | O | O ("적용할 점수" 드롭다운, 3옵션) | 동일한 3옵션 |
| Allowed Attempts (숫자 / 무제한) | O (`limit_attempts_option` + `quiz_allowed_attempts`, -1=무제한) | O | O ("제출 횟수 제한" 드롭다운, 2~10회 + 무제한) | xnquiz 는 선택지 드롭다운 |
| One Question at a Time | O (`quiz_one_question_at_a_time`) | O | O ("한 번에 한 문항씩 표시" 토글) | - |
| Lock Questions After Answering | O (`quiz_cant_go_back`) | O | O ("응답 후 문항 잠금" 토글, 들여쓰기) | oneQuestionAtATime 필수 |
| "Let Students See Their Quiz Responses" | O (`never_hide_results`) | O | O ("성적 공개" 토글) | LearningX 는 신규 퀴즈에 자동 체크 해제 (delta) |
| LearningX delta: 자동 해제 (workflow_status=created) | - | O+custom (신규 퀴즈 진입 시 자동 click) | - | xnquiz 는 기본 OFF 로 시작 |
| "Only After Their Last Attempt" (결과) | O (`hide_results_only_after_last`) | O | - | xnquiz 는 별도 옵션 없음 |
| "Only Once After Each Attempt" | O (`quiz_one_time_results`) | O | O ("응답 1회만 조회 허용" 토글) | - |
| "Let Students See The Correct Answers" | O (`quiz_show_correct_answers`) | O | O (차이: "공개 범위" 카드 2개 — "오답 여부만" / "정답까지") | xnquiz 는 더 명확한 분기 UI |
| "Only After Their Last Attempt" (정답) | O (`quiz_show_correct_answers_last_attempt`) | O | - | xnquiz 미지원 |
| Show Correct Answers at (시작일) | O (`quiz_show_correct_answers_at`) | O | O ("공개 시작일", period 모드일 때) | - |
| Hide Correct Answers at (종료일) | O (`quiz_hide_correct_answers_at`) | O | O ("공개 종료일", period 모드일 때) | - |
| 공개 시점: "제출 즉시" | - (Canvas 는 묵시) | - | O (신규 [C]) "immediately" 라디오 | - |
| 공개 시점: "마감 후" | - | - | O (신규 [C]) "after_due" 라디오 | dueDate 경과 시 자동 공개 |
| 공개 시점: "기간 설정" | O (date_field 2개) | O | O ("period" 라디오) | xnquiz 는 명시적 라디오 |

### 2-5. Quiz Restrictions (접근 제어)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Require an Access Code (체크 + text) | O (`enable_quiz_access_code` + `quiz_access_code`) | O | O ("퀴즈 접근 제한" 우측 토글 + "액세스 코드" input) | xnquiz: placeholder "코드를 입력하면 응시 시 코드 입력이 필요합니다" |
| Filter IP Addresses (체크 + text) | O (`enable_quiz_ip_filter` + `quiz_ip_filter`, maxlength=255) | O | O ("접근 가능한 IP 주소" textarea rows=3) | xnquiz 는 한 줄에 하나, CIDR 지원 |
| Find IP 다이얼로그 (계정 단위) | O (`.ip_filtering_link`, `#ip_filters_dialog`) | O | - | xnquiz 미구현 |
| Require Respondus LockDown Browser | O (`quiz_require_lockdown_browser`) | O | - | xnquiz 범위 외 |
| Required to View Quiz Results (LDB) | O (`quiz_require_lockdown_browser_for_results`) | O | - | - |
| TrustLock Browser / ProctoringX (LMS 자체) | - | O+custom (Xlearn Blade 별도 화면) | - | LMS 자체 화면, xnquiz 범위 외 |
| AI 시험감독 설정 (LMS 자체) | - | O+custom (`cheating-prevention/edit`) | - | LMS 자체 화면, xnquiz 범위 외 |
| 응시 전 필수 동의 (LMS 자체) | - | O+custom (`pre_exam_consent/edit`) | - | LMS 자체 화면, xnquiz 범위 외 |

### 2-6. Assign (할당 / 추가 기간)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Assign 영역 React 마운트 | O (`#overrides-wrapper`, `.js-assignment-overrides`) | O | O ("추가 기간 설정" 섹션, AssignmentOverrides) | UI 다름 |
| Everyone 카드 (기본) | O | O | - (별도 카드 없음, 본 페이지의 "응시 기간" 이 Everyone) | - |
| 학생별/섹션별 override 카드 | O (Due / Available from / Until) | O | O ("추가 대상" 행, 동일 3컬럼) | xnquiz 는 학과 그룹 + 학생 |
| "추가 기간 설정 추가" 점선 버튼 | O (Canvas 는 "+ Add" 버튼) | O | O (신규 [C] 디자인) | - |
| `AssignTargetModal` (학생/그룹 선택) | O (Canvas 자체 검색 트레이) | O | O+custom (탭 2개: "학생" / "학과 그룹") | xnquiz 는 학과를 그룹 단위로 |
| 중복 학생 비활성 처리 | - (서버 검증) | - | O (신규 [C]) disabled + title "다른 추가 대상에 이미 포함된 학생입니다" | xnquiz 는 클라이언트 사전 차단 |
| Mastery Paths overrides | O (`course_pace_pacing_with_mastery_paths`) | O | - | xnquiz 범위 외 |
| 검증: "마감 일시는 시작 일시 이후여야 합니다" | - (서버 검증) | - | O (신규 [C]) 인라인 메시지 | - |
| 검증: "이용 종료 일시는 마감 일시 이후로 설정해주세요" | - | - | O (신규 [C]) 인라인 메시지 | - |
| 시작/마감/이용종료 3컬럼 | O (시작/마감만) | O | O (차이: 이용 종료 추가) | xnquiz 추가 필드 |

### 2-7. 응시 기간 / 이용 종료 / 지각 제출 (xnquiz 신규)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 시작 일시 (전체) | O (override 안에) | O | O (신규 [C] 위치) "응시 기간" 섹션 | xnquiz 는 별도 섹션 |
| 마감 일시 (전체) | O | O | O | - |
| 마감 일시 툴팁 안내 | - | - | O (신규 [C]) "학생이 퀴즈를 제출해야 하는 기한입니다.<br />마감 이후에는 제출이 불가합니다." | HelpCircle 아이콘 |
| 미설정 시 안내 ("응시 기간 제한 없음") | - | - | O (신규 [C]) | - |
| 이용 종료 일시 (`lockDate`) | O (Canvas `lock_at`) | O | O+custom (위치/툴팁 보강) | xnquiz: "퀴즈 페이지 자체에 접근할 수 없게 되는 시점" |
| 이용 종료 < 마감 시 경고 | - | - | O (신규 [C]) 호박 경고 "이용 종료 일시가 마감 일시보다 앞서 있습니다..." | - |
| 지각 제출 허용 토글 (`allowLateSubmit`) | - | - | O (신규 [B-#02]) "마감 후 지각 제출 허용" | Canvas 는 마감 = 응시 불가 |
| 지각 제출 마감 일시 (`lateSubmitDeadline`) | - | - | O (신규 [B-#02]) DateTimePicker (min=dueDate) | - |
| "미설정 시 무제한 허용" 안내 | - | - | O (신규 [B-#02]) | - |

### 2-8. Questions 탭 / 문항 작성

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Show Question Details 체크박스 (≤25문항) | O (`#show_question_details`) | O | - | xnquiz 는 항상 펼침 |
| 25문항 초과 disabled 안내 | O ("NOTE: Question details not available when more than 25.") | O | - | xnquiz 없음 |
| 문항 리스트 (`#questions`) | O (`@quiz.root_entries`) | O | O ("문항 구성" 탭, drag handle GripVertical) | - |
| New Question 버튼 | O (`.add_question_link`, 인라인 편집) | O | O ("문항 만들기", outline) → `AddQuestionModal` | xnquiz 는 모달 |
| New Question Group 버튼 | O (`.add_question_group_link`) | O | - | xnquiz 는 그룹 없음 |
| Find Questions 모달 | O (`#find_question_dialog`) | O | O+custom ("문제모음에서 추가" Popover → `QuestionBankModal`) | xnquiz 는 자체 Popover 분기 |
| Find Bank (그룹-은행 연결) | O (`#find_bank_dialog`) | O | - | xnquiz 는 직접 선택 / 랜덤 출제 모드로 단순화 |
| Random 출제 (`RandomQuestionBankModal`) | - (Canvas 는 그룹 + pick_count 로 표현) | - | O (신규 [C]) "복수 문제모음 랜덤 출제" | xnquiz 자체 UX |
| 직접 선택 (`QuestionBankModal`) | O (Find Questions 와 유사) | O | O (신규 [C]) | xnquiz: "문제모음에서 원하는 문항을 골라 추가" |
| LearningX delta: 안내 박스 ① "이미지 복사·붙여넣기 유의사항" | - | O+custom (분홍 배경 + 경고 아이콘 + 가이드 이미지) | - | xnquiz 미채택 |
| LearningX delta: 안내 박스 ② "문제그룹 이용 랜덤 출제 방법" | - | O+custom (파랑 + 4단계 가이드) | - | xnquiz 는 문제그룹 미사용으로 무의미 |
| LearningX delta: 안내 박스 ③ "시험(퀴즈) 출제 방법" 5단계 | - | O+custom (세부정보 탭 상단) | - | xnquiz 미채택 |
| 문항 행 표시: 드래그 핸들 (`GripVertical`) | O (Canvas 도 sortable) | O | O | - |
| 문항 행 번호 (1, 2, ...) | O | O | O | - |
| 문항 행 TypeBadge | O (Canvas 는 텍스트로) | O | O ("객관식" 등) | xnquiz 는 배지 형태 |
| 문항 행 "{points}점" | O ("X pts") | O | O | - |
| 수동채점 배지 (autoGrade=false) | - | - | O (신규 [C]) "수동채점" 호박 | - |
| 호버 시 편집/삭제 아이콘 | - (Canvas 는 항상 노출) | - | O (신규 [C]) Pencil / Trash2 | - |
| 정답 미리보기 (`QuestionAnswer`) | - (`Show Question Details` 켜야) | - | O (신규 [C]) essay/file_upload/text 제외 | xnquiz 는 기본 노출 |
| 문제 본문 line-clamp-2 | - | - | O (신규 [C]) | - |

### 2-9. 지원 문항 유형

| **유형** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Multiple Choice (객관식) | O (`multiple_choice_question`) | O | O (`multiple_choice`) | - |
| True/False (참/거짓) | O (`true_false_question`) | O | O (`true_false`) | - |
| Fill in the Blank (단답형) | O (`short_answer_question`) | O | O (`short_answer`) | xnquiz autoGrade='partial' (대체 정답 지원) |
| Fill in Multiple Blanks | O (`fill_in_multiple_blanks_question`, `[blank_name]` 자리표시) | O | O (`fill_in_multiple_blanks`, "본문에 빈칸 삽입" 버튼) | xnquiz 는 토큰 자동 확장 |
| Multiple Answers (복수 선택) | O (`multiple_answers_question`) | O | O (`multiple_answers`, scoringMode partial/all_correct) | xnquiz 는 전역 정책으로 채점 방식 결정 |
| Multiple Dropdowns | O (`multiple_dropdowns_question`) | O | O (`multiple_dropdowns`) | - |
| Matching (연결형) | O (`matching_question`, 좌-우 페어 + Distractors) | O | O (`matching`, pairs + distractors) | - |
| Numerical Answer | O (`numerical_question`, 허용 범위/정밀도) | O | O (`numerical`, tolerance) | - |
| Formula / Calculated | O (`calculated_question`, 변수+공식+소수점) | O | O (`formula`, variables/tolerance/toleranceType) | xnquiz 는 절대/% 분기 |
| Missing Word | O (`missing_word_question`) | O | - | xnquiz 미지원 |
| Essay (서술형) | O (`essay_question`) | O | O (`essay`) | - |
| File Upload (파일 첨부) | O (`file_upload_question`) | O | O (`file_upload`, allowedFileTypes/maxFileSize) | - |
| Text (no question) | O (`text_only_question`) | O | O (`text`, 점수/배점 숨김) | - |

### 2-10. 문항별 부가 옵션

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 정답별 코멘트 (Answer Comment) | O (RCE) | O | - (xnquiz 는 정답/오답/무조건 3종으로 통합) | - |
| 오답별 코멘트 | O | O | - | - |
| 일반 코멘트 (General Comment) | O | O | O ("무조건 표시" textarea) | - |
| 정답 시 피드백 (`correct_comments`) | O | O | O (신규 [C]) "정답 시" textarea | xnquiz 단순화 |
| 오답 시 피드백 (`incorrect_comments`) | O | O | O (신규 [C]) "오답 시" textarea | - |
| 응답 피드백 안내 ("결과 공개 시 함께 표시") | - | - | O (신규 [C]) | xnquiz 만 명시 |
| 난이도 (high/medium/low) | - | - | O (신규 [B-#03]) 드롭다운 | xnquiz 자체 메타 |
| 채점 기준 (rubric, 서술형) | O (별도 Rubric 시스템) | O | O (`AddQuestionModal` 안 textarea "학생에게는 표시되지 않음") | xnquiz 는 단순 textarea |

### 2-11. 응시 설정 / 문항 표시 (xnquiz 섹션 분리)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 시간 제한 사용 토글 | (위 2-4 항목과 동일) | (동일) | O ("시간 제한 사용") | 매트릭스 정리상 별도 노출 |
| 자동 제출 5분 유예 (`disableAutoSubmit`) | O (Canvas `timer_without_autosubmission` feature flag) | O | O (신규 [B-#04]) | xnquiz: 이용 종료 일시 필수 검증 |
| 재응시 점수 정책 (`scorePolicy`) | (위 2-4) | (동일) | O | - |
| 횟수 제한 (`allowAttempts`) | (위 2-4) | (동일) | O | - |
| 문항 표시: 선지 셔플 | (위 2-4) | (동일) | O | - |
| 문항 표시: 문제 셔플 | - | - | O (신규 [C]) | - |
| 문항 표시: 한 문항씩 | (위 2-4) | (동일) | O | - |
| 응답 후 문항 잠금 | (위 2-4) | (동일) | O (들여쓰기) | - |

### 2-12. 안내사항 / 공개 여부 / 액션바

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| "퀴즈 안내사항" 섹션 (응시 전 안내) | - (Description 에 묵시) | - | O (신규 [C]) 우측 헤더 스위치 + textarea | xnquiz 는 별도 분리 |
| 안내사항 기본값 (`DEFAULT_NOTICE`) | - | - | O (신규 [B-#05]) 3줄 (제출 후 답안 수정 불가, 협력 금지, 부정행위 0점) | - |
| 학생에게 퀴즈 공개 토글 (`visible`) | O (헤더 게시 토글) | O | O ("퀴즈 공개 여부" 섹션) | xnquiz 는 폼 안 |
| draft 자동 비공개 안내 | - | - | O (신규 [C]) "임시저장 상태는 자동 비공개입니다." | - |
| Notify users this quiz has changed | O (`quiz[notify_of_update]`) | O | - | 편집 시점에만 의미, 생성엔 무의미 |
| Cancel 버튼 | O (`#cancel_button`, 확인 모달 없음, `params[:return_to]` 또는 quiz show) | O | O (차이: 변경사항 있으면 ConfirmDialog "작성 취소" 띄움) | xnquiz 가 확인 단계 추가 |
| Save & Publish 버튼 | O (`.save_and_publish`, `!published && !horizon_course?`) | O | O ("저장하기" default) | xnquiz 는 분리 안 함 (저장=즉시 게시 또는 임시저장 토글) |
| Save 버튼 (게시 유지) | O (`.save_quiz_button`) | O | O ("임시저장", outline) | xnquiz 동작 차이: 임시저장=draft 로 명시 |
| 점수 공개 + 재응시 경고 (`handlePublish`) | - | - | O (신규 [B-#06]) ConfirmDialog "점수 공개 기간 미설정" | "1차 응시 마감 직후 점수(및 정답)가 공개되어 학생이 2차 응시 전에 정답을 확인할 수 있습니다" |
| 임시저장 검증 (제목만 필수) | - | - | O (신규 [C]) | "임시저장 불가" |
| 검증: 제목 미입력 | O (인라인 `#quiz_title_message`) | O | O (AlertDialog "퀴즈 제목을 입력해주세요") | - |
| 검증: 마감 < 시작 | O (서버 검증) | O | O (`getValidationErrors` 2번) | - |
| 검증: 이용 종료 < 마감 | - | - | O (`getValidationErrors` 3번) | xnquiz 자체 필드 |
| 검증: 지각 제출에 마감일 필수 | - | - | O (`getValidationErrors` 4번) | xnquiz: "지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용할 수 있습니다" |
| 검증: 시간 제한 미설정 | - | - | O (`getValidationErrors` 5번) | "제한 시간을 입력하거나 무제한으로 설정해주세요" |
| 검증: 자동 제출 유예에 이용 종료 필수 | - | - | O (`getValidationErrors` 6번) | "자동 제출 5분 유예 사용 시 이용 종료 일시를 반드시 설정해야 합니다" |
| 검증: 최소 1문항 | - | - | O (`getValidationErrors` 7번) | - |
| 검증: 동일 학생 중복 추가 기간 | - (서버 검증) | - | O (`getValidationErrors` 8번) | xnquiz 는 클라이언트 사전 차단 |
| 저장 성공 → 목록 이동 | O (Canvas 는 show 페이지) | O | O (차이: `/` 이동) | xnquiz 는 목록으로 |
| 임시저장 성공 AlertDialog | - | - | O (신규 [C]) "임시저장 완료" | - |

### 2-13. Mastery Paths 탭

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Mastery Paths 탭 자체 | O (`#mastery-paths-editor`, Conditional Release 활성 시) | O | - | xnquiz 범위 외 |

### 2-14. 접근성 / 기타

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 필드 인라인 검증 메시지 | O (`#quiz_title_message`, `#time_limit__message`) | O | O (`AlertDialog` 모달) | UX 다름 (인라인 vs 모달) |
| beforeunload (떠나기 확인) | - | - | O (신규 [C]) S-04 와 공통 | 변경사항 있을 때만 |
| 라우터 가드 (`role !== 'instructor'` 시 `/`) | - (서버 403) | - | O (신규 [C]) 클라이언트 가드 | - |
| `hasChanges` 판정 (title \|\| description \|\| questions.length>0) | - | - | O (신규 [C]) | - |

## 3. 시스템별 상세 (raw 스펙에서 발췌)

### 3-1. Canvas 표준에만 있는 기능

| **기능** | **동작** | **xnquiz 채택 여부 / 이유** |
|---|---|---|
| 빈 퀴즈 사전 생성 + 302 리다이렉트 | "+ Quiz" 클릭 즉시 DB 레코드 생성, 빈 제목으로 잔존 가능 | 미채택. xnquiz 는 저장 시점에 생성 (클라이언트 폼 모델) |
| Assignment Group 셀렉트 | gradebook 그룹 분류 | 미채택. xnquiz 는 gradebook 통합 없음 |
| Suppress Assignment 옵션 | gradebook 노출 숨김 | 미채택. xnquiz 범위 외 |
| Anonymous Submissions (survey) | 익명 응시 | 미채택. survey 자체 미지원 |
| Respondus LockDown Browser | 외부 도구 통합 | 미채택. xnquiz 범위 외 |
| Find IP 다이얼로그 | 계정 단위 등록 IP 목록 | 미채택. xnquiz 는 직접 입력만 |
| Mastery Paths (Conditional Release) | 점수별 후속 콘텐츠 | 미채택. xnquiz 범위 외 |
| Find Bank (그룹-은행 연결) | 문항 그룹을 은행에 연결 | 미채택. xnquiz 는 문항 그룹 자체 없음 |
| New Question Group + Pick Count | 그룹에서 N개 무작위 추출 | 미채택. xnquiz 는 `RandomQuestionBankModal` 로 대체 |
| Notify users this quiz has changed | 저장 시 알림 발송 | 미채택. 알림 기능 자체 미구현 |
| Missing Word 문항 유형 | 빈칸 단답 변형 | 미채택. 사용 빈도 낮음 |
| RCE (TinyMCE) 본문 에디터 | 리치 텍스트 | 부분 채택. xnquiz 는 `RichTextEditor` 컴포넌트 있으나 일부 유형은 textarea (토큰 자동 확장용) |
| `notify_of_update` 알림 옵션 | 학생에게 변경 알림 | 미채택. 알림 기능 없음 |
| 25문항 초과 시 Show Question Details 비활성 | 성능 보호 | 미채택. xnquiz 는 동적 로딩 없음 |

### 3-2. LearningX custom.js delta

`custom.quiz-details-guide.example.js` (S-02 / S-04 공통):
- 적용 URL `^/courses/(\d+)/quizzes/(\d+)/edit$`
- 문제 작성 탭 상단 안내 박스 2개 (이미지 복붙 유의사항 / 문제그룹 랜덤 출제)
- 세부 사항 탭 상단 안내 박스 1개 (5단계 출제 방법)
- 신규 퀴즈 (`workflow_status === "created"`) 자동 진입 시 `quiz[hide_results][never]` 자동 click 해제 → "신규 퀴즈 기본값을 오답 공개 ON 으로" 정책 뒤집기
- i18n ko/en, `<details>` 토글로 접기

`custom.quiz-rescore.example.js` 편집 화면 부분은 응시자가 이미 있을 때 한정이라 "신규 생성" 단계엔 영향 없음 (S-04 에서 다룸).

### 3-3. xnquiz 신규 기능 ([B] 학교 요구 + [C] 자체 도출)

| **ID** | **라벨** | **기능** | **동작** |
|---|---|---|---|
| [B-#01] | 주차/차시 메타 | week + session 자체 필드 | `WeekSessionPicker` 로 코스별 옵션 localStorage 저장 |
| [B-#02] | 지각 제출 정책 | allowLateSubmit + lateSubmitDeadline + gracePeriod | Canvas 의 마감 = 응시 불가 모델을 분기로 확장 |
| [B-#03] | 문항 난이도 | 상/중/하 메타 | 통계 화면에서 난이도 검증용 |
| [B-#04] | 자동 제출 유예 (5분) | disableAutoSubmit | 이용 종료 일시와 짝 정책 |
| [B-#05] | 응시 전 안내사항 기본값 | DEFAULT_NOTICE 3줄 | 제출 후 수정 불가/협력 금지/부정행위 0점 |
| [B-#06] | 재응시+점수공개 경고 | handlePublish ConfirmDialog | "1차 응시 정답 노출" 위험 방지 |
| [C] | 평가용/연습용 카드 라디오 | quizMode 단순화 | Canvas 4종 → 2종 |
| [C] | 응시 기간 / 이용 종료 별도 섹션 | startDate / dueDate / lockDate 분리 | Canvas 는 override 안에 합쳐 있음 |
| [C] | 임시저장 (draft) 상태 | 별도 status 값 + 자동 비공개 | Canvas 는 unpublished 단일 |
| [C] | 학과 그룹 단위 override | AssignTargetModal 탭 분기 | Canvas 는 학생/섹션 |
| [C] | 다른 추가 대상 중복 학생 차단 (클라) | disabled + title | Canvas 는 서버 검증만 |
| [C] | 검증 8종 사전 차단 | `getValidationErrors` 첫 오류만 AlertDialog | Canvas 는 폼 submit 후 인라인 |
| [C] | 임시저장 검증 (제목만) | 별도 분기 | Canvas 는 빈 제목도 unpublished 로 저장됨 |
| [C] | "공개 범위" 카드 2개 (오답 여부만/정답까지) | wrong_only / with_answer | Canvas 의 여러 체크박스 조합을 단순화 |
| [C] | "공개 시점" 라디오 3개 (즉시/마감 후/기간) | immediately / after_due / period | Canvas 는 묵시 동작 |
| [C] | 취소 시 ConfirmDialog | "작성 중인 내용이 있습니다" | Canvas 는 확인 없이 즉시 이동 |
| [C] | beforeunload 처리 | 변경사항 있을 때만 | - |

## 4. 핵심 차이 요약

**Canvas → LMS**: LearningX 가 편집 진입 직후 3개의 안내 박스를 자동 삽입해 "교수자 학습" 부분을 보강함. 단, 모두 `.example.js` 상태라 학교별 적용 옵션. 가장 큰 정책 변화는 "**신규 퀴즈 기본 정책 뒤집기**" — Canvas 는 신규 퀴즈에서 "오답 표시 안함" 이 기본인데, LearningX 는 신규 진입 시 자동 click 해제하여 "오답 표시 ON" 으로 뒤집음. 이는 Canvas 원본 동작과 다른 학교 요구가 반영된 흔적.

**Canvas → xnquiz**: 가장 큰 구조 차이는 (1) **빈 퀴즈 사전 생성 모델 폐기**: xnquiz 는 저장 시점에 ID 부여 (Cancel 시 DB 잔존 우려 해소). (2) **상태 모델 확장**: Canvas 의 unpublished/published 2값에서 draft/open/grading/closed 4값으로 세분화. (3) **검증 사전 차단**: Canvas 는 서버 검증 위주인데 xnquiz 는 `getValidationErrors` 8종을 클라이언트에서 사전 차단. (4) **공개 정책 분리 UI**: Canvas 의 여러 체크박스 조합("Let see responses" + "Only after last" + "Let see correct" + "Show at" + "Hide at") 을 "공개 범위 카드 2개 + 공개 시점 라디오 3개" 로 단순화. (5) **지각 제출** 별도 정책 (Canvas 는 마감 = 응시 불가). (6) Mastery Paths / LockDown Browser / Question Group / Find Bank / Anonymous Survey / SIS 일체 드롭.

**LMS → xnquiz**: LearningX custom 의 "신규 퀴즈 = 오답 공개 ON" 정책은 xnquiz 에서는 "성적 공개 토글이 명시적으로 OFF 기본" 으로 다시 뒤집힘. 즉 xnquiz 는 Canvas 보수적 기본값 + 학생 노출 시점/범위를 명시적 UI 로 강제. LearningX 의 안내 박스 3종은 xnquiz 에선 미채택 (대신 필드 라벨 옆 툴팁 + 호박 안내 + 검증 메시지로 분산 처리). 가장 본질적 차이는 정책 "전역화" — LearningX 는 화면 내 부가 안내인 반면, xnquiz 는 "복수선택 채점 방식 / 정답 판정" 을 S-01 전역 설정으로 끌어올림.

## 5. 누락 의심 / 확인 필요

- xnquiz `QuizCreate` 의 description 이 RCE 가 아닌 plain textarea 인데, 이미지/표 같은 풍부한 콘텐츠가 필요한 케이스의 정책 공백 (OQ-XN-03).
- Canvas 의 "Allowed Attempts" 는 무제한 = -1 표현, xnquiz 는 별도 드롭다운 옵션. mock 데이터에서 `allowAttempts: -1` 과 드롭다운 매핑이 raw 스펙에 명시되지만 UI 동기화 확인 필요.
- xnquiz 의 "성적 공개 기간 미설정" 경고는 timing=immediately 또는 미설정 시 발동인데, after_due 인데 dueDate 가 없으면 어떻게 처리하는지 정책 공백 (OQ-XN-04).
- LearningX delta 의 `quiz-details-guide.example.js` 가 학교별로 어떤 옵션 키로 활성화되는지 raw 스펙에서 "추측 금지" 라고 명시 → xnquiz 채택 여부 판단 시 추가 정보 필요.
- xnquiz 는 "문항 만들기" + "문제모음에서 추가" 2진입만 있는데, Canvas 의 "Question Group + Pick Count" (그룹에서 N개 무작위) 와 등가 동작이 `RandomQuestionBankModal` 인지 raw 에서 명확치 않음 (OQ-XN-05).
- Canvas Edge case "Time limit 0 = unlimited" 처리가 xnquiz 에선 어떻게 매핑되는지 raw 스펙에 명시 없음 (`timeLimit: 0 \|\| null` 모두 무제한이라고만).

## 6. 자기 점검 체크리스트

| **영역** | **raw 스펙 영역 수** | **매트릭스 반영 영역 수** | **상태** |
|---|---|---|---|
| 진입/라우팅 | Canvas 6 + xnquiz 4 = 10 | 6 | 완료 |
| 헤더/구조 | Canvas 5 + xnquiz 3 = 8 | 6 | 완료 |
| 기본 정보 (Details) | Canvas 6 + xnquiz 3 = 9 | 9 | 완료 |
| Options | Canvas 14 + xnquiz 6 + LMS 1 = 21 | 22 | 완료 |
| Restrictions | Canvas 5 + LMS 자체 3 + xnquiz 3 = 11 | 9 | LMS 자체 Blade 화면 일부 통합 |
| Assign / 추가 기간 | Canvas 4 + xnquiz 5 = 9 | 10 | 완료 |
| 응시 기간 / 지각 | Canvas 1 + xnquiz 7 = 8 | 10 | 완료 |
| Questions 탭 | Canvas 6 + LMS 3 + xnquiz 6 = 15 | 17 | 완료 |
| 문항 유형 | 13 유형 | 13 | 완료 |
| 문항별 부가 옵션 | Canvas 5 + xnquiz 4 = 9 | 9 | 완료 |
| 안내사항/공개/액션 | Canvas 6 + xnquiz 11 = 17 | 17 | 완료 |
| Mastery Paths | Canvas 1 | 1 | 완료 |
| 접근성/기타 | xnquiz 4 | 4 | 완료 |
| **합계 행 수** | **약 130행** | **약 130행** | - |

누락 의심 행:
- Canvas Regrade 정책 (정답 변경 시 4종 옵션) 은 응시자 있는 편집 시점이라 S-04 에서 다룸 → 본 매트릭스에서는 제외
- LMS 의 `cheating-prevention/edit` 등 Xlearn 자체 Blade 화면 5종은 "퀴즈 생성" 시점이 아닌 별도 진입이므로 1행으로 묶음 (개별 풀어쓰기 불필요)
- Canvas Edge case (Time limit 0, override 중복, horizon_course) 는 검증 매트릭스에 통합
