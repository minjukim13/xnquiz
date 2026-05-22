# S-07. 학생 응시 (Take Quiz + 결과 화면) - Canvas / LMS / xnquiz 비교

> Canvas Classic Quizzes 기준. 분석 시점 2026-05-21.

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
| --- | --- | --- |
| Canvas | `/courses/:cid/quizzes/:id/take` (GET/POST) / `/access_code` / `/take?preview=1` / `/take_quiz_in_popup` / `/refresh_quiz_after_popup` / `/history?quiz_submission_id=...` (결과) | `available? && submit 권한 && (unlimited 또는 attempts_left > 0)` |
| LearningX (LMS) | Canvas 와 동일 라우트. 활성 custom 3개 (`prevent-quiz-cnp`, `quiz-sticky-sidebar`, `quiz-submit-button-styling`) 가 응시 화면에 강제 적용. AI 시험감독, 응시 전 필수 동의 등 자체 화면도 보강 | Canvas 권한 + LearningX 자체 동의 |
| xnquiz | `/quiz/:id/attempt` (학생) / `?preview=true` (교수자 미리보기). 결과는 `ResultModal` + S-03 `StudentResultSection` 으로 분리 | role=STUDENT 또는 PROFESSOR(미리보기) |

**한줄 요약**
- **Canvas**: `take_quiz.html.erb` 한 페이지에 모든 기능 (문항, 사이드바, 시간 카운트다운, autosave, 한 문항씩 모드, Times Up 다이얼로그, deauthorized 다이얼로그) 통합. 결과는 `/history` 로 별도 라우트.
- **LMS**: Canvas 화면 위에 (1) 우클릭/복사/붙여넣기 차단, (2) 우측 사이드바 sticky/모바일 fixed 재배치, (3) 제출 버튼 빨강 강조 3종 custom 강제 적용. 자체 AI 시험감독 / 동의 화면도 옵션.
- **xnquiz**: React SPA. 진입 차단 분기 8종 + 자동저장 30초 인터벌 + 활동 로그 7종 이벤트 + 한 문항씩 모드 잠금 + 미리보기 모드 별도 처리. 결과는 ResultModal 즉시 표시 + 상세는 S-03 으로.

---

## 2. 기능 매트릭스

### 2-1. 시작 안내 / 시작 전 화면

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 시작 전 상세 (S-03) 안내 (Due/Points/Questions/Available/Time Limit/Allowed Attempts) | O | O | O | xnquiz 는 한국어 라벨 |
| "Requires Respondus LockDown Browser" 표시 | O (LDB 사용 시) | O | - | xnquiz 는 LDB 미지원 |
| "Take the Quiz / Take Quiz Again" 버튼 | O | O | O (차이: "응시하기" / "재응시", attempts 잔량 기반) | |
| Cant Go Back 응시 시작 안내 모달 | O (`_cant_go_back_warning`, "Attention!" + "Once you have submitted an answer, you will not be able to change it later.") | O | O (차이: AlertDialog "응답 후 문항 잠금" + "이 퀴즈는 한 문항씩 표시되며, 다음 문항으로 이동하면 이전 문항으로 돌아올 수 없습니다.\n각 문항을 신중히 답변해주세요.") | xnquiz 도 동일 정책 |
| "Begin" 버튼 (모달 확인) | O | O | O (차이: 모달 닫고 진행, 별도 라벨 없음) | |
| 응시 가능 횟수 초과 시 비활성 | O (S-03 잠금 사유) | O | O (차이: 비활성 "응시하기" + 호버 툴팁 "응시 가능 횟수({maxAttempts}회)를 초과했습니다") | |
| 미리보기 모드 진입 | O (교수자 `preview=1`) | O | O (차이: `?preview=true`, 호박 배너 + "미리보기 종료" 버튼) | |

### 2-2. 응시 진입 차단

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 응시 가능 종료 (마감 후) | O ("Quiz is no longer available", 401/403) | O | O (차이: Lock 아이콘 + "이용이 종료되었습니다" + "이용 종료 일시가 지나 퀴즈에 접근할 수 없습니다" + "퀴즈 목록으로") | |
| 시작 전 (startDate 미래) | O (S-03 잠금 사유) | O | O (차이: Clock 아이콘 + "응시 시작 전입니다" + "{startDate}부터 응시할 수 있습니다") | |
| draft (미게시) | O (학생 진입 불가, S-01/S-03 표시 안 됨) | O | O (차이: "응시 불가" + "아직 공개되지 않은 퀴즈입니다.") | xnquiz 만 진입 후 차단 화면 |
| grading (채점 중) | - (Canvas 에는 grading 상태 없음) | - | O (신규 [C]): "응시 불가" + "채점 중인 퀴즈로 응시가 마감되었습니다." | xnquiz 도메인 특화 |
| closed (마감 후) | O | O | O (차이: "응시 불가" + "종료된 퀴즈입니다.") | |
| 응시 횟수 소진 | O (S-03 잠금 사유 + take 라우트 자체 차단) | O | O (차이: S-03 에서 차단) | |
| Access Code 입력 화면 | O (`/quizzes/:id/access_code`, "This quiz is restricted by an access code...", password input + Submit) | O | O (차이: S-03 "접근 코드" 설정만 노출, 응시 진입 시 코드 입력 UI 코드상 미확인) | xnquiz UI 확인 필요 |
| Invalid IP 화면 | O (`invalid_ip.html.erb`, "This quiz is protected and is only available from certain locations.") | O | - (S-02/S-04 에서 "비워두면 모든 IP에서 접근 가능합니다. (CIDR 표기법 지원)" 정책만, 응시 차단 UI 미확인) | xnquiz 미구현 의심 |
| LDB 미설치 | O (`lockdown_browser_required.html.erb`) | O | - | xnquiz LDB 미지원 |
| 지각 제출 비허용 + dueDate 지남 | - (Canvas 는 지각 제출 정책 없음, 마감 후 응시 자체 차단) | - | O (신규 [C]): Clock 빨강 + "제출 기한이 종료되었습니다" + "마감일: {dueDate}" | |
| 지각 제출 허용 + lateSubmitDeadline 지남 | - | - | O (신규 [C]): "지각 제출 기한이 종료되었습니다" + "지각 제출 마감: {date}" | xnquiz 도메인 특화 |
| 로딩 중 | O (h3.loading "Loading...") | O | O (차이: "불러오는 중") | |
| 데이터 없음 | - | - | O (차이: "해당 퀴즈를 찾을 수 없거나 응시 가능한 문항이 없습니다.") | |
| Deauthorization (로그아웃) | O (`#deauthorized_dialog` 모달 "Login Required" + "You have been logged out of canvas. To continue please log in") | O | - | xnquiz 는 세션 만료 대응 명시 안 됨 |

### 2-3. 응시 중 헤더 / 카드

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 퀴즈 제목 (h1) | O | O | O | |
| 시작 시각 "Started: {시각}" | O | O | - (xnquiz 는 카드에 안 노출, 활동 로그에만) | |
| 안내문 (Quiz Instructions) | O (h2 + #quiz-instructions user_content) | O | O (차이: description 표시) | |
| Preview 안내 alert | O ("This is a preview of the published/draft version of the quiz") | O | O (차이: 호박 배너 "미리보기 모드 / 학생에게 보이는 실제 화면입니다. 답변 선택 및 제출을 테스트할 수 있습니다." + X 버튼) | |
| 주차/차시 + 총점 표시 | - | - | O (신규 [C]): "{week}주차 {session}차시 · {totalPoints}점" | xnquiz 도메인 특화 |
| 자동 저장 표시 | O (`#last_saved_indicator` "Not saved" / "Saved at {time}") | O+custom (`quiz-submit-button-styling.js` 가 가운데 정렬) | O (차이: CheckCircle2 + "자동 저장됨 · {시각}") | |
| 자동 저장 실패 배너 | - | - | O (신규 [C]): 빨강 "자동 저장 실패" + quota 분기 메시지 | xnquiz 도메인 특화 |
| 지각 제출 배너 | - (Canvas 에 지각 정책 없음) | - | O (신규 [C]): "지각 제출 / 마감일({dueDate})이 지났습니다. 제출 시 지각으로 기록됩니다." + lateSubmitDeadline 보조 | |
| 답변 완료 카운트 | - | - | O (신규 [C]): "답변 완료 {N}/{total}" (완료 시 초록) | |

### 2-4. 시간 / 카운트다운

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| time_limit ON: Time Running 표시 | O (사이드바 "Time Running") | O+custom (sticky sidebar 로 항상 보임) | O (차이: 시간 카운트다운 박스, 5분 미만 빨강) | |
| time_limit OFF: Time Elapsed 표시 | O | O+custom | O (차이: Clock 아이콘 + "제한 없음") | |
| Hide Time 버튼 | O (`.hide_time_link`, 시간 표시 숨기기) | O | - | xnquiz 미지원 |
| Attempt due (마감일 표시) | O (`@quiz.due_at`) | O | - (헤더에 직접 표시 안 함) | |
| 시간 종료 grace (5분 유예) | - (Canvas 는 즉시 자동 제출) | - | O (신규 [C]): `disableAutoSubmit=true` 일 때 5분(`GRACE_AFTER_TIMEOUT_SEC=300`) 카운트다운 + "시간 종료 — {grace} 내 제출" | xnquiz 도메인 특화 |
| Times Up 다이얼로그 | O (`#times_up_dialog`, "Time's Up!  Submitting results in" + 카운트다운 + "Ok, fine" 제출 버튼) | O | - (즉시 모달 없이 자동 제출) | xnquiz 는 ResultModal 로 통합 |
| timer_autosubmit_disabled (자동 제출 안 함) | O (수동 제출 대기) | O | O (차이: `disableAutoSubmit=true` 면 grace 5분 후 자동 제출) | 정책 다름 |
| 스크린리더 시간 안내 | O ("Note: this is a timed quiz. You may check the remaining time you have at any point while taking the quiz by pressing the keyboard combination SHIFT, ALT, and T...") | O | - | xnquiz 미구현 |

### 2-5. 문항 내비 / 사이드바

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Questions 사이드바 (문항 번호 점프) | O (`_question_list_right_side`, 응답 여부 아이콘 + 문항명) | O+custom (sticky sidebar) | - (xnquiz 는 사이드바 미사용) | |
| 응답 여부 아이콘 | O | O | O (차이: "답변 완료 {N}/{total}" 진행률 바) | |
| Score 표시 (제출 후) | O | O | O (차이: ResultModal 점수) | |
| Hide Time 버튼 | O | O | - | |
| Keep Editing This Quiz (preview 중) | O | O | O (차이: "미리보기 종료" 버튼) | |
| LMS 모바일 사이드바 50/50 재배치 | - | O+custom (`quiz-sticky-sidebar.js` 모바일 ≤768px: 문제 목록 + 남은 시간 50/50, #quiz-header-spacer 100px 삽입) | - | LMS 만 |
| LMS PC sticky sidebar | - | O+custom (`position: sticky; top: 0`) | - | LMS 만 |
| 한 문항씩 모드 점프 비활성 (cant_go_back) | O (`read_only` 클래스) | O | O (차이: lockAfter 시 "이전" 버튼 disabled) | |
| 한 문항씩 모드 점프 가능 | O (form 재제출 + page=N) | O | O (차이: 좌우 "이전/다음" 버튼) | |
| 일반 모드 앵커 점프 | O (`#question_xxx`) | O | - | xnquiz 는 페이지 스크롤 |

### 2-6. 문항 유형별 입력 UI (Canvas 11종 vs xnquiz 14종)

| **유형 (Canvas 키)** | **Canvas** | **LMS** | **xnquiz (키 매핑)** | **비고** |
| --- | --- | --- | --- | --- |
| multiple_choice_question (객관식 정답 하나) | O (라디오 + 선지) | O+custom (cnp 차단) | O (차이: `multiple_choice` "객관식", 라디오 + RichText 선지) | |
| true_false_question (참/거짓) | O | O | O (차이: `true_false` "참/거짓") | |
| multiple_answers_question (객관식 정답 다수) | O (체크박스) | O | O (차이: `multiple_answers` "복수 선택", 답안 쉼표 join) | |
| short_answer_question (빈칸 채우기 단답형) | O (text input) | O | O (차이: `short_answer` "단답형", placeholder "답안을 입력하세요") | |
| fill_in_multiple_blanks_question (복수 빈칸 단답형) | O | O | O (차이: `fill_in_multiple_blanks` "다중 빈칸", 본문 inline placeholder 또는 레거시 라벨+입력) | xnquiz 는 토큰 캡 6개 |
| multiple_dropdowns_question (목록에서 선택) | O (드롭다운) | O | O (차이: `multiple_dropdowns` "드롭다운 선택", inline 또는 레거시 모드 "선택하세요") | xnquiz 는 토큰 캡 4개 |
| matching_question (짝짓기) | O | O | O (차이: `matching` "연결형", 좌(고정) ↔ select + distractors 섞임, "선택하세요") | |
| numerical_question (숫자 답변) | O | O | O (차이: `numerical` "수치형", number input "숫자를 입력하세요") | |
| calculated_question (수식) | O (변수 + 계산) | O | O (차이: `formula` "수식형", 변수값 박스 "주어진 값: a = N, b = N" mono + number input "계산 결과를 입력하세요") | xnquiz 는 단일 변수 분포 미지원 |
| essay_question (작문/서술형) | O (textarea) | O | O (차이: `essay` "서술형", textarea rows=5) | |
| file_upload_question (파일 업로드) | O | O | O (차이: `file_upload` "파일 제출", placeholder "파일을 선택하세요" + "허용 파일: PDF, DOC, DOCX, HWP, ZIP") | |
| - (Canvas 없음) | - | - | O (신규 [B-#01]): `fill_in_blank` "빈칸 채우기" (레거시, short_answer 와 통합 예정) | xnquiz 만 |
| - | - | - | O (신규 [B-#02]): `ordering` "순서 배열" (레거시) | xnquiz 만 |
| - | - | - | O (신규 [B-#03]): `text` "안내" (응답 불요, Q번호 없음, 채점 가능 점수 없음) | xnquiz 만 |
| text_only_question (Canvas 의 안내 문항) | O (응답 불요) | O | O (차이: `text` 와 동등) | |

### 2-7. 자동 저장 / 활동 로그

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 자동 저장 (backup submission) | O (`backup_quiz_submission_url` 주기적 POST) | O | O (차이: `AUTOSAVE_INTERVAL_MS = 30000` 30초 인터벌, dirty 일 때만 flush) | Canvas 인터벌 명시 없음 |
| 저장 키 / 영속화 | O (서버) | O | O (차이: `xnq_attempt_session_{quizId}_{studentId}` localStorage) | xnquiz mock 모드 |
| beforeunload / pagehide 즉시 저장 | - (Canvas 는 서버 backup) | - | O (신규 [C]): dirty 면 즉시 flush | xnquiz 도메인 특화 |
| 저장 표시 UI | O ("Not saved" / "Saved at {time}") | O+custom (가운데 정렬) | O (차이: CheckCircle2 + "자동 저장됨 · {시각}") | |
| 저장 실패 배너 | - | - | O (신규 [C]): quota / 기타 분기 | |
| 활동 로그 (start) | - | - | O (신규 [C]): "응시 시작" (Play, emerald) — "응시 페이지 진입" | |
| 활동 로그 (navigate) | - | - | O (신규 [C]): "문항 이동" (ArrowRightLeft, blue) — "{from}번 → {to}번 ({본문 일부})" | |
| 활동 로그 (answer_change) | - | - | O (신규 [C]): "답변 변경" (Pencil, violet) — "Q{order} {본문 일부}", 1.5초 디바운스로 집계 | |
| 활동 로그 (focus_loss) | - | - | O (신규 [C]): "포커스 이탈" (EyeOff, amber) — "탭/창 전환" | `visibilitychange` 이벤트 |
| 활동 로그 (focus_gain) | - | - | O (신규 [C]): "포커스 복귀" (Eye, slate) — "화면으로 복귀" | |
| 활동 로그 (autosave) | - | - | O (신규 [C]): "자동 저장" (Save, slate) — "응시 세션 저장" | |
| 활동 로그 (submit) | - | - | O (신규 [C]): "제출" (Send, accent) — "시간 초과로 자동 제출" 또는 "학생 제출" | |
| 로그 영속화 | - | - | O (신규 [C]): `xnq_activity_log_{quizId}_{studentId}` | mock 시연용 시드 `xnq_activity_log_seed_v1` |
| Canvas Quiz Log Auditing | O (`feature(:quiz_log_auditing)`, `/quiz_submission_events`) | O | - (xnquiz 는 활동 로그로 대체) | Canvas 는 서버 기록 |

### 2-8. 한 문항씩 모드 / 잠금

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 한 문항씩 모드 (`one_question_at_a_time`) | O | O | O (차이: `oneAtATime` 설정) | |
| Previous Question 버튼 | O (`previous_question_viewable?` 일 때) | O | O (차이: "이전" `ChevronLeft`, 첫 문항 시 disabled) | |
| Next Question 버튼 | O (next_question 존재 시) | O | O (차이: "다음" `ChevronRight`) | |
| 마지막 문항 시 "Submit" 표시 | O | O | O (차이: "제출하기" `Send` 아이콘) | |
| Cant Go Back (lockAfter) | O (`cant_go_back?`) | O | O (차이: `lockAfter` 설정) | |
| 잠금 confirm (답변 있음 + 다음 클릭) | - (Canvas 는 무경고 진행) | - | O (신규 [C]): "다음 문항으로 이동" + "이 문항으로 돌아올 수 없습니다.\n이대로 다음 문항으로 이동할까요?" | "다음으로 이동" / "취소" |
| 잠금 confirm (답변 없음 + 다음 클릭) | - | - | O (신규 [C]): "답변 없이 이동" + "답변을 입력하지 않고 다음 문항으로 이동하면,\n이 문항으로 돌아와 답변할 수 없습니다." | "답변 없이 이동" (destructive) / "돌아가기" |
| Lock 아이콘 표시 | - | - | O (신규 [C]): "응답 후에는 이전 문항으로 돌아갈 수 없습니다" | |
| 진행률 바 (oneAtATime) | - | - | O (신규 [C]): "문항 {N} / {total}" | |
| 내비게이션 시 활동 로그 NAVIGATE | - | - | O (신규 [C]) | |

### 2-9. 부정행위 방지

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 우클릭 차단 (contextmenu) | - | O+custom (`prevent-quiz-cnp.js` 활성, 모든 학교 적용) | - | LMS 만 활성 |
| 복사/잘라내기/붙여넣기 차단 (cut/copy/paste) | - | O+custom (preventDefault + 클립보드 비우기 + alert "시험화면내 복사/붙여넣기는 허용되지 않습니다.") | - | LMS 만 |
| 드래그 방지 CSS | - | O+custom (`-webkit-user-drag: none; user-select: none`) | - | LMS 만 |
| 포커스 이탈 감지 (탭 전환) | - | - | O (신규 [C]): `visibilitychange` 이벤트 → focus_loss/focus_gain 활동 로그 | xnquiz 만 |
| LDB (Respondus LockDown Browser) | O | O | - | xnquiz 미지원 |
| AI 시험감독 (TrustLock / ProctoringX) | - | O+자체 (Blade 화면: `cheating-prevention-view/edit/prep`, `trustlock-browser`, `proctoring-x`) | - | LMS 자체 솔루션 |
| 응시 전 필수 동의 화면 | - | O+자체 (`/courses/:cid/quizzes/:qid/pre_exam_consent/edit`, `pre-exam-consent-edit`) | - | LMS 자체 |
| 호환성 안내 페이지 | - | O+자체 (`cheating-prevention-guide/compatibility`) | - | |

### 2-10. 제출 / 제출 버튼

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Submit Quiz 버튼 | O (`#submit_quiz_button`) | O+custom (`quiz-submit-button-styling.js`: 빨강 `#D9534F` + hover `#C9302C` + 흰 글씨 + 최소 너비 200px) | O (차이: "제출하기" `Send` 아이콘, default variant) | LMS 만 색 강조 |
| .form-actions 중앙 정렬 | - | O+custom (flex-direction: column + align-items: center + gap: 10px) | O (차이: 일반 모드 좌 안내 / 우 버튼) | |
| 미답변 카운트 안내 | - | - | O (신규 [C]): "{N}개 문항이 미답변 상태입니다." 또는 "모든 문항에 답변했습니다." | |
| 시간 만료 자동 제출 | O (즉시) | O | O (차이: `disableAutoSubmit=false` 즉시 / `=true` grace 5분 후) | |
| lockDate 도래 자동 제출 | - (Canvas 는 마감 후 응시 자체 차단) | - | O (신규 [C]): 응시 중이면 자동 제출 | |
| 제출 실패 alert | - (Canvas 는 form 재제출) | - | O (신규 [C]): "제출 실패 / 서버에 제출하지 못했습니다." | |

### 2-11. 제출 결과 (제출 직후 모달)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 제출 직후 모달 | - (Canvas 는 `/history` 페이지로 이동) | - | O (신규 [C]): `ResultModal` | |
| 타이틀 (수동 제출) | - | - | O (신규 [C]): 큰 체크 아이콘 + "제출 완료!" | |
| 타이틀 (시간 만료 자동) | - | - | O (신규 [C]): "시간 종료 — 자동 제출되었습니다" | |
| 제출일시 표시 | O (history) | O | O (차이: 모달에 표시) | |
| 지각 배지 | - | - | O (신규 [C]): isLate 일 때 | |
| 점수 영역 (showScoreNow) | O (history) | O | O (차이: "{autoTotal} / {autoMax}" 또는 "공개 예정" 또는 "점수 없음") | |
| 서술형 미채점 안내 | - (history 에 pending_review `*` + "Some questions not yet graded") | - | O (차이: "서술형 {N}개 문항은 채점이 완료되면 점수에 반영됩니다.") | |
| 메타 3열 (응시 시간 / 출제 수 / 만점) | - | - | O (신규 [C]): "응시 시간 {N}분 / 출제 수 {N}문항 / 만점 {N}점" | |
| CTA: 결과 자세히 보기 | O ("Back to Quiz") | O | O (차이: "결과 자세히 보기" → `/quiz/{id}`) | |
| CTA: 퀴즈 목록으로 | - | - | O (신규 [C]): outline "퀴즈 목록으로" → `/` | |

### 2-12. 결과 화면 / 정답 공개 정책

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 결과 화면 라우트 | O (`/quizzes/:id/history`) | O | O (차이: S-03 `StudentResultSection` 으로 통합) | |
| 점수 표시 ("Score for this attempt/survey/quiz: N out of M") | O (`results_visible?` 일 때) | O | O (차이: "점수 / {totalPoints}점" 라인 + 색 분기) | |
| 미공개 안내 (`_muted`) | O (`posted?` false && `was_preview?` false) | O | O (차이: EyeOff + "성적은 공개되지 않습니다" + "교수자가 설정한 공개 시점이 되면 문항별 채점 결과를 확인할 수 있습니다.") | |
| pending_review `*` + "Some questions not yet graded" | O | O | O (차이: "채점 대기" 배지 + 안내) | |
| Show Correct Answers 차단 안내 (`render_correct_answer_protection`) | O (예: "Answers will be available from {date} to {date}") | O | O (차이: 정책 라벨에 흡수) | |
| 문항별 본문 + 학생 답안 + 정답 표시 | O (`_quiz_submission`) | O | O (차이: 카드 단위, "Q{idx+1}" + 본문 line-clamp) | |
| 정답/오답 색상 (초록/빨강/회색) | O | O | O (차이: emerald/red, 미응답 회색) | |
| 정답 영역 ("Correct Answer" 라벨) | O (정책 충족 시) | O | O (차이: `QuestionAnswer` 컴포넌트, showAnswer && !isCorrect 일 때만) | |
| 정답/오답 코멘트 | O (correct_comments / incorrect_comments) | O | O (차이: 피드백 카드 — correct/incorrect/neutral_comments) | |
| 일반 코멘트 (neutral_comments) | O | O | O | |
| 교수자 코멘트 (수동 채점) | O | O | O (차이: `CommentThread` role="student") | |
| 부분 점수 (Fill in Multiple Blanks 등) | O (빈칸별 점수) | O | O (차이: "부분점수 {scored}/{points}" 배지) | |
| Attempt 선택 (사이드바) | O (`version_instances` 여러 개일 때) | O | - (xnquiz 는 최신 시도만, 정책 따라) | |
| Time (응시 소요 시간) | O | O | O (차이: 상세 카드 메타) | |
| View Previous Attempts 링크 | O (다중 시도일 때) | O | - | |
| 미채점 안내 + 검토 필요 문항 점프 | O | O | - | |
| Back to Quiz 링크 | O | O | O (차이: ResultModal CTA "결과 자세히 보기") | |

### 2-13. 정답 공개 정책 매트릭스 (hide_results × show_correct_answers)

| **시나리오** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| hide_results = "never" (always show) + show_correct_answers true | O (점수/학생 답안/정답 모두 표시) | O | O (차이: revealResults `enabled` + `with_answer`, 즉시 또는 정책 시점) | |
| hide_results = "never" + show_correct_answers false | O (점수/학생 답안만, 정답 숨김) | O | O (차이: revealResults `wrong_only` 또는 "점수만") | |
| hide_results = `until_after_last_attempt` + show_correct_answers true | O (마지막 시도 후 정답 포함 결과) | O | - (xnquiz 는 attempts 정책 미세 분리 안 됨) | xnquiz 확인 필요 |
| hide_results = `until_after_last_attempt` + show_correct_answers false | O (마지막 시도 후 결과, 정답 숨김) | O | - | |
| hide_results = `always` (Let Students See ... 꺼짐) | O (결과 화면 muted, "Your instructor has not made these results visible yet.") | O | O (차이: revealResults `disabled` + "비공개" 배지) | |
| `one_time_results` ON | O (결과 1회 조회, Moderate 에서 `reset_has_seen_results` 로 재허용 가능) | O | O (차이: oneTimeResults flag + `xnq_results_viewed` localStorage. "응답은 1회만 조회할 수 있습니다 / 이미 결과를 확인하여 더 이상 응답과 정답을 조회할 수 없습니다.") | xnquiz 는 재허용 UI 없음 |

### 2-14. 정답 공개 기간 (show_correct_answers_at / hide_correct_answers_at)

| **시점** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| now < `show_correct_answers_at` | O (정답 숨김 + "Answers will be available {date}") | O | O (차이: scoreRevealStart 기반 "기간 내 공개" 또는 "{M}/{D} 공개") | |
| `show_correct_answers_at` ≤ now ≤ `hide_correct_answers_at` | O (정답 표시) | O | O (차이: scoreRevealEnd 까지 공개) | |
| now > `hide_correct_answers_at` | O (정답 숨김 + "Answers were available {start} to {end}") | O | - (xnquiz 종료 후 라벨 미확인) | |
| 둘 다 빈 값 | O (즉시/계속 공개) | O | O (차이: "즉시 공개") | |

### 2-15. 미리보기 모드 (교수자 ?preview=true)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 미리보기 진입 | O (`/take?preview=1`, POST) | O | O (차이: `?preview=true` 쿼리) | |
| 미리보기 안내 alert | O ("This is a preview of the published/draft version of the quiz") | O | O (차이: 호박 배너 "미리보기 모드 / 학생에게 보이는 실제 화면입니다. 답변 선택 및 제출을 테스트할 수 있습니다.") | |
| 미리보기 종료 버튼 | O (사이드바 "Keep Editing This Quiz") | O | O (차이: 호박 배너 X 버튼 → navigate(-1)) | |
| 답안 저장 안 함 | O (preview submission 분리, 점수 영향 없음) | O | O (차이: `saveStudentAttempt` 호출 안 함, sessionKey/activityKey null) | |
| 활동 로그 / 자동 저장 비활성 | - (Canvas 는 별도 명시 없음) | - | O (신규 [C]) | |
| 시간 관련 검사 우회 | - | - | O (신규 [C]): isLate, lockDate 차단 우회 | |
| access_code 우회 | O (`params[:preview] && can_update` 일 때 preview=1 유지) | O | - (xnquiz preview 동작 확인 필요) | |

### 2-16. 활동 / 부가

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| screenreader / 접근성 | O (h3.loading, ScreenReaderContent 등) | O | O (차이: aria 라벨 일부) | xnquiz 접근성 미확인 |
| 모바일 응시 화면 재배치 | - | O+custom (모바일 ≤768px 시 상단 fixed 50/50 레이아웃 + spacer 100px) | - (반응형은 Tailwind 기본) | LMS 만 |
| LXCCUP 이슈 명시 | - | O+custom (LXCCUP-254 / LXCCUP-275 주석) | - | |
| 응시 횟수 무제한 표기 | O (allowed_attempts < 0 또는 unlimited) | O | O (차이: `allowAttempts === -1` → "무제한") | |
| 시간 제한 무제한 표기 | O | O | O (차이: `timeLimit === 0 \|\| null` → "제한 없음") | |
| 응시 기간 제한 없음 | O | O | O (차이: startDate/dueDate 둘 다 빈 값) | |
| 학생용 status 단순화 | - (Canvas 는 상태 노출 안 함) | - | O (신규 [C]): scheduled/open/closed 3종만, "채점중" 은 학생에게 비노출 | xnquiz 도메인 특화 |
| 채점 진행 중에도 학생 응시 가능 | - | - | O (신규 [C]): `(status === 'open' \|\| 'grading') && !scheduled && !pastDue` | xnquiz 도메인 특화 |
| Practice 모드 안내 | - | - | O (신규 [C]): `quizMode === 'practice'` 시 호박 안내 "연습용 퀴즈는 성적에 반영되지 않습니다." | xnquiz 도메인 특화 |

---

## 3. 시스템별 상세

### 3-1. Canvas 표준에만 있는 기능 (xnquiz 가 채택 안 한 것들)

- **`/access_code` 입력 화면**: password input + "This quiz is restricted by an access code. You'll need to ask your teacher or proctor to type in or tell you the access code in order to take the quiz."
- **`/invalid_ip.html.erb`**: IP 제한 위반 시 "This quiz is protected and is only available from certain locations. The computer you are currently using does not appear to be at a valid location for taking this quiz." 화면.
- **`/lockdown_browser_required.html.erb`**: Respondus LockDown Browser 미설치 시 차단.
- **`/take_quiz_in_popup`** / **`/refresh_quiz_after_popup`**: LDB 팝업 응시 모드.
- **`#deauthorized_dialog`**: 세션 만료 시 "Login Required" + "You have been logged out of canvas. To continue please log in" 모달.
- **`#times_up_dialog`**: 시간 종료 시 "Time's Up!  Submitting results in" + 카운트다운 + "Ok, fine" 제출 모달.
- **Hide Time 버튼** (`.hide_time_link`): 시간 표시 숨기기.
- **스크린리더 시간 안내**: "Note: this is a timed quiz. You may check the remaining time you have at any point while taking the quiz by pressing the keyboard combination SHIFT, ALT, and T..." (Shift+Alt+T 단축키).
- **사이드바 Questions 점프**: 일반 모드에서 앵커 점프 (`#question_xxx`), 한 문항씩 모드에서 form 재제출 + page=N.
- **응시 결과 사이드바 "View Previous Attempts" / 다중 시도 선택** (`version_instances`).
- **Quiz Log Auditing** (`feature(:quiz_log_auditing)`): `/quiz_submission_events` 응시 이벤트 서버 기록.
- **Validation token** (`hidden validation_token`): backup submission CSRF 보호.
- **`#quiz_urls`**: backup_quiz_submission_url, started_at/now/end_at/end_at_without_time_limit, due_at, time_limit, timer_autosubmit_disabled, time_left 등 서버 동기화용 메타데이터를 DOM 에 박아두는 패턴.
- **`one_time_results` 재허용**: Moderate Quiz 의 `reset_has_seen_results` 로 한 학생에게 결과 재조회 허용.
- **anonymous_survey**: survey 일 때 "{user}'s Quiz History" 대신 "Student" 익명화.
- **Show Correct Answers 차단 안내**: "Answers will be available {date}" / "Answers were available {start} to {end}".

### 3-2. LearningX custom.js delta (응시 화면에 적용되는 것들)

활성 custom 3종 (모든 학교 적용).

**`custom.prevent-quiz-cnp.js`**
- 적용 URL: `/courses/(\d+)/quizzes/(\d+)/take`
- `#submit_quiz_form` 전체에 적용:
  - 드래그 방지 CSS: `-webkit-user-drag: none; user-select: none` (+ vendor prefix 4종)
  - `contextmenu` 이벤트 무효화 (우클릭 메뉴 차단)
  - `cut / copy / paste` 이벤트에서 `preventDefault + stopPropagation`, 클립보드 비우기, alert "시험화면내 복사/붙여넣기는 허용되지 않습니다."
- 의도: 부정행위 방지 보강용. 운영 적용.

**`custom.quiz-sticky-sidebar.js`**
- 적용 URL: `/courses/\d+/quizzes/\d+/take` (정규식)
- PC (너비 > 768px): `#right-side-wrapper` 에 `position: sticky; top: 0; align-self: flex-start` 적용 → 우측 사이드바(문제 목록 / 남은 시간) 가 본문 스크롤 따라가지 않고 화면 상단 고정.
- 모바일 (너비 ≤ 768px):
  - `#right-side-wrapper` 를 `<body>` 자식으로 이동 후 `position: fixed; top:0; left:0; right:0; z-index:99999`
  - 좌 50% : 문제 목록 (`question_list` max-height 80px scroll), 우 50% : `quiz-time-elapsed` 로 2단 재구성
  - `.quiz-header > h1` 위에 `#quiz-header-spacer` 100px 삽입 (단, `.mobile-header-title.expandable` 있으면 0px) → 시험/설문일 때만 여백 확보
  - 1초 간격 `setInterval` 로 Canvas 가 DOM 재조작해도 상태 유지
  - 리사이즈 250ms debounce 후 재적용
- 관련 이슈: LXCCUP-254, LXCCUP-275.

**`custom.quiz-submit-button-styling.js`**
- 적용 URL: `/courses/(\d+)/quizzes/(\d+)/take` (preview 포함)
- `#submit_quiz_button` 색을 빨강 (`#D9534F`, hover `#C9302C`) + 흰 글씨로 변경, 최소 너비 200px.
- `.form-actions` 를 `display: flex; flex-direction: column; align-items: center; gap: 10px` 로 중앙 정렬.
- `#last_saved_indicator` (마지막 저장 표시) 도 가운데 정렬.
- 의도: 제출 버튼을 위험/주의 색으로 강조해 "확정 제출" 인식 강화.

**자체 화면 (LearningX Blade)**
- AI 시험감독 설정/현황/리포트: `/courses/:cid/quizzes/:qid/cheating-prevention` 외 다수.
- 응시 전 필수 동의: `/courses/:cid/quizzes/:qid/pre_exam_consent/edit`.
- TrustLock 브라우저 안내: `/cheating-prevention-guide/trustlock-browser`.
- ProctoringX 안내: `/cheating-prevention-guide/proctoring-x`.
- 호환성 안내: `/cheating-prevention-guide/compatibility`.

### 3-3. xnquiz 신규 기능

| **ID** | **라벨** | **기능** | **동작** |
| --- | --- | --- | --- |
| [C] | 진입 차단 분기 8종 | lockDate / 시작 전 / draft / grading / closed / 지각 비허용 / 지각 마감 / 로딩 / 데이터 없음 | 각각 별도 화면 + "퀴즈 목록으로" CTA |
| [C] | grading 상태 차단 | "채점 중인 퀴즈로 응시가 마감되었습니다." | xnquiz 도메인 특화 상태 |
| [C] | 자동 저장 30초 인터벌 | `AUTOSAVE_INTERVAL_MS = 30000`, dirty 일 때만 flush | `xnq_attempt_session_{quizId}_{studentId}` |
| [C] | beforeunload / pagehide 즉시 저장 | dirty 면 페이지 떠날 때 flush | |
| [C] | 자동 저장 실패 배너 | quota / 기타 분기 메시지 | |
| [C] | 시간 종료 grace 5분 | `disableAutoSubmit=true` 일 때 `GRACE_AFTER_TIMEOUT_SEC=300` | "시간 종료 — {grace} 내 제출" |
| [C] | lockDate 도래 자동 제출 | 응시 중이면 강제 제출 | |
| [C] | 활동 로그 7종 이벤트 | start / navigate / answer_change / focus_loss / focus_gain / autosave / submit | `xnq_activity_log_{quizId}_{studentId}` |
| [C] | answer_change 디바운스 집계 | 1.5초 디바운스 | |
| [C] | 포커스 이탈/복귀 감지 | `visibilitychange` 이벤트 | |
| [C] | 잠금 confirm (답변 있음/없음 분기) | "다음으로 이동" / "답변 없이 이동" (destructive) | xnquiz 만 confirm 단계 분기 |
| [C] | 진행률 바 + "답변 완료 {N}/{total}" | 완료 시 초록 | |
| [C] | 미답변 카운트 안내 | "{N}개 문항이 미답변 상태입니다." 또는 "모든 문항에 답변했습니다." | 일반 모드 제출 영역 |
| [C] | 지각 제출 배너 | "마감일({dueDate})이 지났습니다. 제출 시 지각으로 기록됩니다." | xnquiz 도메인 특화 |
| [C] | 지각 제출 마감 부착 | "지각 제출 마감: {date}" | |
| [C] | 미리보기 모드 호박 배너 + "미리보기 종료" | 활동 로그/자동 저장/시간 검사 모두 우회 | |
| [C] | ResultModal (제출 직후) | 큰 체크 아이콘 + 메타 3열 + CTA 2개 | "결과 자세히 보기" / "퀴즈 목록으로" |
| [C] | "공개 예정" / "점수 없음" 분기 | hasAutoGrade 없음 / showScoreNow / 그 외 | |
| [C] | 서술형 미채점 안내 | "서술형 {N}개 문항은 채점이 완료되면 점수에 반영됩니다." | |
| [C] | oneTimeResults 소진 안내 | "응답은 1회만 조회할 수 있습니다 / 이미 결과를 확인하여 더 이상 응답과 정답을 조회할 수 없습니다." | `xnq_results_viewed` localStorage |
| [C] | Practice 모드 안내 | "연습용 퀴즈는 성적에 반영되지 않습니다." | `quizMode === 'practice'` |
| [C] | 자동채점 정답 비교 정규화 | trim → caseSensitive 아니면 toLowerCase → whitespaceSensitive 아니면 공백 제거 | `_normalizeAnswer` |
| [C] | 응시 시간 클램프 | 무제한: 실제 경과 / 시간 제한: `min(timeLimit, elapsed)` | Canvas 정책 준수 |
| [C] | text 유형 (안내문) | 응답 불요, Q번호 없음, 채점 가능 점수 없음 | answeredCount 계산 제외 |
| [C] | fill_in_multiple_blanks / multiple_dropdowns inline placeholder | `[빈칸N]` / `[드롭다운N]` 토큰을 본문에 직접 입력, 토큰 수에 따라 폼 항목 자동 확장 (캡 6/4) | 캡 초과 시 mismatch 경고 |
| [C] | formula 변수값 박스 | "주어진 값: a = N, b = N" mono 폰트 | |

---

## 4. 핵심 차이 요약

**Canvas → LMS → xnquiz 진화 흐름**

**1단계 (Canvas 표준)**. Canvas Classic Quizzes 의 응시 화면 (`take_quiz.html.erb`) 은 한 페이지에 (1) 퀴즈 제목/안내, (2) 문항 본문, (3) 우측 사이드바 (Questions 점프 + Score + Time Running/Elapsed + Hide Time + Attempt due), (4) `#submit_quiz_button`, (5) `#times_up_dialog` (시간 종료 모달), (6) `#deauthorized_dialog` (로그아웃 모달) 을 모두 통합했다. 자동 저장은 `backup_quiz_submission_url` 로 주기적 POST. 결과는 `/history?quiz_submission_id=...` 별도 라우트로 분리. 진입 차단은 access_code, invalid_ip, LDB 미설치, 응시 횟수 소진 등으로 라우트 레벨에서 분기. 한 문항씩 모드 (`one_question_at_a_time`) + 못 돌아가기 (`cant_go_back`) 정책은 Canvas 가 원래 정책이며 xnquiz 가 이 정책을 그대로 흡수했다.

**2단계 (LearningX custom)**. LearningX 는 Canvas 응시 화면에 가장 많은 custom 을 박는다. 활성 3종이 모든 학교에 강제 적용된다. (1) 우클릭/복사/붙여넣기/드래그 차단 (cnp), (2) 우측 사이드바 sticky/모바일 fixed 재배치 (sticky-sidebar), (3) 제출 버튼 빨강 강조 (submit-button-styling). 그 외에 자체 Blade 화면으로 AI 시험감독 (TrustLock / ProctoringX) 과 응시 전 필수 동의 화면을 추가했다. 즉 Canvas 는 부정행위 방지에 비교적 관대한데, LearningX 는 한국 대학 시험 환경에 맞춰 강하게 잠그는 방향으로 보강.

**3단계 (xnquiz)**. xnquiz 는 응시 화면을 React SPA 로 재설계하면서 운영/시연 관점의 신기능을 대거 도입했다. (1) 진입 차단 분기를 8종으로 명시화 (Canvas 의 마감/시작 전 외에 grading, 지각 비허용, 지각 마감, 데이터 없음 추가). (2) 활동 로그 7종 이벤트 (start/navigate/answer_change/focus_loss/focus_gain/autosave/submit) 로 학생 응시 행동을 모두 기록. (3) 한 문항씩 + lockAfter 일 때 답변 있음/없음 별 confirm 다이얼로그를 분리해서 사용자 실수 방지. (4) ResultModal 로 제출 직후 즉시 점수/메타/CTA 노출. (5) 자동 저장에 30초 인터벌 + beforeunload 즉시 저장 + 실패 배너까지 추가. (6) 시간 종료 grace 5분 (`disableAutoSubmit=true` 시) 같은 운영 유연성. (7) 지각 제출 정책 (lateSubmitDeadline) 을 도입해서 Canvas 의 "마감 후 응시 불가" 보다 유연.

**xnquiz 가 의도적으로 뺀 것**. 부정행위 방지 (LMS 의 cnp 차단), LDB 통합, 사이드바 Questions 점프, Hide Time 버튼, 다중 시도 사이드바, Submission List, 익명 survey, IP 제한 응시 차단 UI 는 모두 미구현. xnquiz 는 mock/시연 단계라 부정행위 방지보다 활동 로그 기반 사후 검증에 무게를 두고 있고, LMS 의 cnp 차단을 도입할지가 결정 포인트다.

**LMS 의 강제 적용 vs xnquiz 의 시연 우선**. LMS 는 cnp 차단을 활성 custom 으로 모든 학교에 강제하지만 xnquiz 는 같은 차단을 미구현. 향후 운영 도입 시 LMS 의 cnp 차단 정책을 xnquiz 가 흡수할지 결정 필요.

---

## 5. 누락 의심 / 확인 필요

- **xnquiz 의 Access Code 입력 UI**: S-02/S-04 에서 "접근 코드" 설정만 노출. 학생이 응시 시작 시 코드 입력 화면이 실제로 있는지 코드 확인 필요. SSD 에 명시 없음.
- **xnquiz 의 IP 제한 차단 UI**: S-02/S-04 에서 "비워두면 모든 IP에서 접근 가능합니다. (CIDR 표기법 지원)" 정책만 있고, 위반 시 차단 화면 미확인.
- **xnquiz 의 세션 만료 / Deauthorization 처리**: Canvas 의 `#deauthorized_dialog` 같은 모달이 있는지 코드 확인 필요. localStorage 기반 자동 저장이 세션 만료를 어떻게 다루는지 정책 정의 필요.
- **xnquiz 의 다중 시도 (attempts > 1) 결과 화면 처리**: Canvas 는 `version_instances` 사이드바로 시도 선택. xnquiz 는 최신 시도만 보여주는 것으로 보이는데, `scorePolicy` (최고/평균/최신) 와의 연동 검증 필요.
- **xnquiz 의 hide_results = `until_after_last_attempt` 대응**: Canvas 정책. xnquiz 의 revealResults 가 이 시점을 분기로 처리하는지 미확인.
- **xnquiz 의 부정행위 방지 정책**: 활동 로그 기반 사후 검증만 있고 LMS 의 cnp 차단 같은 사전 차단은 없음. 운영 도입 시 정책 결정 필요. (xnquiz-spec 의 "누락 의심 영역" 에도 "응시 중 부정행위 방지 (우클릭/카피페이스트 차단): 코드에 없음" 명시)
- **xnquiz 의 LDB / TrustLock / ProctoringX 통합**: 미지원. 향후 LearningX 자체 솔루션과 어떻게 연결할지 결정 필요.
- **xnquiz 의 익명 응시 / survey 모드**: 미지원. Canvas anonymous_survey 와의 매핑 필요.
- **xnquiz 의 Hide Time / Show Time 토글**: 미구현. 학생이 시간 표시를 끄고 응시하고 싶은 시나리오 (시험 불안 완화) 대응 미정.
- **xnquiz 의 마감 후 정답 공개 종료 라벨**: Canvas "Answers were available {start} to {end}" 같은 종료 후 메시지가 있는지 확인 필요.
- **xnquiz 의 preview 모드 access_code 우회**: Canvas 처럼 preview=1 일 때 access_code 우회되는지 확인 필요.

---

## 6. 자기 점검 체크리스트

- [x] 진입 차단 분기 13종 (Canvas 6 + xnquiz 9, 일부 중복) 모두 행으로 분리
- [x] Canvas 11종 + xnquiz 14종 (text, fill_in_blank, ordering 포함) 문항 유형 매트릭스 매칭
- [x] 자동 저장 (인터벌, 트리거, 저장 표시 UI), 활동 로그 7종 이벤트, 한 문항씩 모드 잠금, 부정행위 방지 모두 행으로 분리
- [x] 결과 화면 (정답 공개 정책 매트릭스 6종, 정답 공개 기간 4시점, 점수/코멘트/부분점수/다중 시도) 모두 행으로 분리
- [x] LMS 활성 custom 3종 (cnp / sticky / submit) 모두 별도 상세 절로 분리
- [x] LMS 자체 Blade 화면 (AI 시험감독, 응시 전 동의, TrustLock, ProctoringX, 호환성) 모두 명시
- [x] xnquiz 신규 27개 [C] 별도 표로 정리
- [x] 영역 분리 표 16개 (시작 안내 / 진입 차단 / 응시 헤더 / 시간 / 문항 내비 / 문항 유형 / 자동 저장+활동 로그 / 한 문항씩 / 부정행위 방지 / 제출 / 제출 결과 모달 / 결과 화면 / 정답 공개 정책 / 정답 공개 기간 / 미리보기 / 활동 부가)
- [x] 표 헤더 굵게, 셀 표기 규칙 (O / O (차이: ~) / - / O+custom / O (신규 [C] 또는 [B-#NN])) 준수
- [x] 가운뎃점 미사용, 이모지 미사용
- [x] 한국어 UI 라벨 따옴표 인용 + Canvas 영문은 영문 그대로 + 한국어 번역 병기
