# S-03. 퀴즈 상세 - Canvas / LMS / xnquiz 비교

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
|---|---|---|
| Canvas | `/courses/:course_id/quizzes/:id` | 교수자(`can_do(:update)` / `:manage`) / 채점자(`:review_grades`) / 학생(`participate_as_student`) / Direct Share 권한자 |
| LMS (LearningX) | Canvas 와 동일 + custom.js delta | (동일) |
| xnquiz | `/quiz/:id` | INSTRUCTOR / STUDENT (RoleContext 분기) |

화면 한줄 요약:
- Canvas: 한 화면에 (1) 헤더 액션바 (게시/Preview/Edit/Assign To/⋮ Manage) (2) 본문 폼-horizontal 표 (Quiz Type / Points / Shuffle / Time Limit ...) (3) 마감일 표 (4) 우측 사이드바 (Statistics / Moderate / SpeedGrader) (5) 학생용 응시 요약/Take 버튼. show.html.erb 434줄.
- LMS: Canvas 표준 + `custom.quiz-erratum-download.example.js` 가 교수자 우측 사이드바에 "퀴즈 오답률 다운로드" 버튼 추가.
- xnquiz: 교수자/학생 분리 뷰. 교수자는 PageHeader + 요약 카드 4지표 + 응시 조건/응시 정책/성적 공개/접근 제한 4섹션. 학생은 5지표 + 응시 결과 섹션 (자체 점수/오답 노출).

## 2. 기능 매트릭스 (핵심)

### 2-1. 헤더 / 액션 바 (교수자)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 게시 토글 버튼 (`#quiz-publish-link`) | O (`can_update \|\| can_manage`, disabled: horizon_course / `!can_unpublish?`) | O | - → 카드 메뉴 "학생에게 공개/숨기기" 로 대체 | xnquiz 상세 헤더엔 토글 없음 |
| Preview 버튼 (교수자 미리보기) | O (`preview_quiz_button`, `POST .../take?preview=1`) | O | O ("미리보기" 점3 메뉴 → `/quiz/{id}/attempt?preview=true`) | xnquiz 는 메뉴 안에 있음 |
| Assign To (학생/섹션 트레이) | O (`manage_assign_to`, `#assign-to-mount-point`) | O | - (S-04 의 "추가 기간 설정" 안에 통합) | xnquiz 는 상세 화면엔 없음 |
| Edit 버튼 | O (`can_update`) | O | O ("편집" 점3 메뉴) | xnquiz 는 메뉴 안 |
| ⋮ Manage 드롭다운 | O (`can_update \|\| :grade \|\| :review_grades`) | O | O (점 3개 메뉴, 단 항목 다름) | - |
| "채점" 버튼 (xnquiz) | - | - | O (신규 [C]) `canGrade` 일 때 → `/quiz/{id}/grade` | scheduled/draft 제외 |
| "통계" 버튼 (xnquiz) | - | - | O (신규 [C]) `canStats` (status !== 'draft') | - |
| 뒤로가기 버튼 | - (Canvas 는 브라우저 뒤로가기) | - | O (신규 [C]) "← 뒤로가기" 텍스트 | - |
| StatusBadge (헤더) | - | - | O (신규 [B-#01]) 진행중/채점중/마감/임시저장/예정 | - |
| 주차/차시 배지 (헤더) | - | - | O (신규 [C]) | - |
| 응시 기간 배지 (`CalendarRange` 아이콘) | - | - | O (신규 [C]) | - |

### 2-2. ⋮ Manage 드롭다운 항목

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Show Rubric (루브릭 모달) | O (`can_update && @assignment && !enhanced_rubrics_assignments_enabled?`) | O | - | xnquiz 는 별도 루브릭 시스템 없음 |
| Preview (관리 메뉴 내부) | O (`can_update && !needs_unpublished_warning?`) | O | - (이미 헤더에 있음) | xnquiz 는 헤더 메뉴에서 처리 |
| "Let Students Take this Quiz Now" (잠금 해제) | O (`can_update && !editing_restricted? && @quiz.locked?`) | O | - | xnquiz 는 lockDate 기반, 즉시 토글 없음 |
| "Lock this Quiz Now" (즉시 잠금) | O (`can_update && !editing_restricted? && !@quiz.locked?`) | O | - | - |
| "Show Student Quiz Results" 패널 | O ((:grade \|\| :review_grades) && available?) | O | - → "채점" 버튼으로 대체 | xnquiz 는 별도 화면 (S-05) |
| "Message Students Who..." (조건별 메시지) | O (`:grade && :send_messages && available? && !anonymous_submissions? && graded?`) | O | - (S-05 의 "조건부 재응시" 와 일부 유사) | xnquiz 는 메시지 직접 발송 없음 |
| Delete | O (`:delete && !editing_restricted?`) | O | O (destructive, ConfirmDialog) | xnquiz: "퀴즈 삭제" 다이얼로그 |
| Send to... / Copy to... | O (`can_direct_share`) | O | - (S-01 카드 메뉴에 일부 있음) | xnquiz 상세 메뉴엔 없음 |
| 외부 도구 (LTI `placement = quiz_menu`) | O | O | - | xnquiz 범위 외 |
| 편집 (`Edit`) | - (헤더 별도 버튼) | - | O ("편집" 메뉴 항목) | xnquiz 는 메뉴 통합 |
| 미리보기 | - (헤더 Preview 와 같지만 별도 항목 아님) | - | O ("미리보기" 메뉴 항목) | - |

### 2-3. 헤더 경고 / 안내 배너

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 재채점 경고 (`regraded-warning`) | O (`submission_has_regrade?(@submission)`, "your score was affected/not affected") | O | - | xnquiz 는 S-05 채점 화면에 있음 |
| 미공개 경고 (`needs_unpublished_warning?`) | O (`quiz_published_state_warning` + "Save It Now" 버튼) | O | - | xnquiz 는 draft 별도 상태로 처리 |
| 미리보기 안내 (`@submission && params[:preview]`) | O ("This is a preview of the draft version of the quiz") | O | O (응시 화면에서, 본 화면 아님) | xnquiz 는 S-07 응시 화면에서만 |
| 잠금 사유 (`lock_explanation`) | O (학생, 응시 불가 시) | O | - (xnquiz 학생 진입 차단은 응시 화면에서) | - |
| 면제 안내 (excused?) | O ("This quiz has been excused") | O | - | xnquiz 범위 외 |
| 종강 안내 (`context.soft_concluded?`) | O ("This quiz is no longer available...") | O | - | xnquiz 범위 외 (coursework concluded 미구현) |

### 2-4. 본문 (교수자) — Canvas form-horizontal 표 vs xnquiz 섹션 카드

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Quiz Type 표시 | O ("Practice Quiz / Graded Assignment / Graded Survey / Survey") | O | O (`quizMode` 메타에 따라 표시) | xnquiz 는 2종만 |
| Points 표시 | O (`points_possible_display`, "100") | O | O (요약 카드 "총점") | - |
| Assignment Group | O (`graded? && assignment_group.present?`) | O | - | xnquiz 범위 외 |
| Shuffle Answers Yes/No | O | O | O ("응시 정책" 섹션 "보기 셔플") | - |
| Time Limit ("N Minutes" / "No Time Limit") | O (응시자 extra_time 합산) | O | O ("응시 조건" 섹션 "제한 시간") | xnquiz 는 extra_time 미구현 |
| Multiple Attempts Yes/No | O | O | O ("응시 정책" 섹션 "응시 횟수") | - |
| Score to Keep (Keep Highest/Latest/Average) | O (`!single_attempt?`) | O | O ("점수 정책", 다회 응시 시만) | - |
| Attempts (N / Unlimited) | O | O | O | - |
| View Responses (`render_show_responses`) | O | O | O ("성적 공개" 섹션 "공개 정책") | UI 형식 다름 |
| Show Correct Answers (공개 시작/종료 일정 포함) | O (`hide_results != 'always'`) | O | O ("공개 시작" / "공개 종료") | - |
| Access Code (코드 평문) | O (`access_code.present?`) | O | O ("접근 제한" 섹션 "접근 코드 — 설정됨 / 설정 안함") | xnquiz 는 평문 노출 안 함 |
| IP Filter (값 텍스트) | O (`ip_filter.present?`) | O | O ("접근 제한" 섹션 "IP 제한") | - |
| One Question at a Time Yes/No | O | O | O ("응시 정책" 섹션 "한 문항씩 표시") | - |
| Require Respondus LockDown Browser | O (`feature_enabled?(:lockdown_browser)`) | O | - | xnquiz 범위 외 |
| Required to View Quiz Results | O (LDB 활성) | O | - | - |
| Monitor Required | O (`lockdown_browser_use_lti_tool?`) | O | - | - |
| Lock Questions After Answering | O (oneQuestionAtATime ON 일 때) | O | O ("응시 정책" 섹션 "답변 후 잠금") | - |
| Anonymous Submissions (survey) | O | O | - | - |
| 마감일 표 (Due/For/Available from/Until) | O | O | - → "응시 조건" 섹션 단일 라인 | xnquiz 는 단순화 |
| Course Paces 노티스 | O (`course_paces_due_date_notice`) | O | - | xnquiz 범위 외 |
| 이용 종료 표시 | - | - | O (신규 [C]) "이용 종료" + 지나면 "(종료됨)" | xnquiz 자체 메타 |
| 지각 제출 표시 | - | - | O (신규 [B-#02]) "지각 제출" 라벨 | - |
| 학생 노출 (visible) 표시 | - (게시 토글 = 노출) | - | O (신규 [C]) "학생 노출 — 숨김 / 공개" | xnquiz 는 visible 별도 |
| 추가 기간 설정 카운트 | - | - | O (신규 [C]) "{N}건" (있을 때만) | - |
| 결과 확인 (oneTimeResults) | O (Canvas 의 "Only Once After Each Attempt") | O | O ("결과 확인 — 1회만 허용 / 제한 없음") | - |

### 2-5. 본문 (학생) — Canvas `_quiz_show_student` vs xnquiz StudentResultSection

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Due (마감일 / "No due date" / "Multiple Due Dates") | O (`_quiz_details` partial) | O | O (요약 카드 "응시 기간") | - |
| Points (배점, survey 면 숨김) | O | O | O (요약 카드 "점수") | - |
| Questions (문항 수) | O | O | O (요약 카드 "문제") | - |
| Available dates (시작~종료) | O | O | O (응시 기간 라인) | - |
| Time Limit ("N Minute" / "None") | O | O | O (요약 카드 "시간 제한") | - |
| Allowed Attempts (N / Unlimited) | O (`allowed_attempts ≠ 1`) | O | O (요약 카드 "응시 횟수") | - |
| Requires Respondus LockDown Browser | O (LDB 사용 시) | O | - | xnquiz 범위 외 |
| "Instructions" 헤더 + 설명 본문 | O (`@locked` 이면 숨김) | O | O ("퀴즈 설명 카드", description 있을 때만, `whitespace-pre-wrap`) | - |
| 성적 공개 라벨 (`scoreRevealCardLabel`) | - (Canvas 는 묵시) | - | O (신규 [C]) "즉시 공개" / "마감 후 공개" / "{M}/{D} 공개" / "비공개" | xnquiz 자체 라벨 |

### 2-6. 우측 사이드바 (교수자)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Quiz Statistics 링크 (`icon-stats`) | O (`can_update && can_manage && @submitted_student_count > 0`) | O | O (헤더 "통계" 버튼) | xnquiz 는 헤더로 위치 변경 |
| Moderate This Quiz | O (`can_manage && published?`) | O | - | xnquiz 는 미구현 (조건부 재응시는 S-05 안) |
| See Full Quiz (read-only, 뷰어용) | O (`:review_grades` 만) | O | - | xnquiz 는 별도 뷰어 권한 없음 |
| SpeedGrader 링크 | O ((:grade \|\| :review_grades) && available? && published && can_view_speed_grader?) | O | - → "채점" 버튼으로 대체 | xnquiz 는 자체 채점 대시보드 (S-05) |
| Download File Upload Submissions | O (`:review_grades`) | O | - (S-05 채점에서 처리) | - |
| Mastery Paths 그래프 | O (`view_all_grades && triggers_mastery_paths?`) | O | - | xnquiz 범위 외 |
| Keep Editing This Quiz (preview 중) | O (`@submission && params[:preview]`) | O | - | xnquiz 는 미리보기 모드에서 "미리보기 종료" 버튼으로 대체 |
| **LMS delta: "퀴즈 오답률 다운로드" 버튼** | - | O+custom (`custom.quiz-erratum-download.example.js`) | - | 교수자만, `GET /learningx/api/v1/.../erratum/download` |

### 2-7. 우측 사이드바 (학생, `_quiz_right_side`) — Canvas

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 헤더 ("Submission Details" / "Last Attempt Details") | O (`allowed_attempts == 1` 분기) | O | O ("최근 응시 결과" 카드) | xnquiz 는 본문 안 |
| Time (소요 시간 분) | O | O | - | xnquiz 는 응시 결과 본문에 없음 |
| Current Score (마지막 응시 점수) | O (`pending_review` 일 때 `*` + "Some questions not yet graded") | O | O (`reveal.showScore` 이면 점수, 아니면 "공개 예정") | - |
| Kept Score (적용 점수) | O | O | - | xnquiz 는 회차별 표시 (S-01 카드) |
| 'This score was set by the teacher' | O (`manually_scored`) | O | - | xnquiz 미표시 |
| "N Attempts so far" + View Previous Attempts | O (응시 1회 이상) | O | O (S-01 학생 카드 `StudentScoreFooter`) | xnquiz 는 목록 카드에서 처리 |
| "Unlimited Attempts" / "1/N More Attempts available" | O | O | O (요약 카드 "응시 횟수") | - |
| Take/Retake Quiz 버튼 | O (`allow_take && :submit && (unlimited \|\| attempts_left > 0)`) | O | O ("응시하기" / "재응시", 횟수 초과 시 비활성 + 툴팁) | xnquiz: "응시 가능 횟수({maxAttempts}회)를 초과했습니다" |
| 점수 정책 안내 (Take 버튼 옆) | O ("Keep Highest" 등 작은 글씨) | O | - | xnquiz 는 미표시 |
| scheduled 시작 안내 ("{startDate} 시작") | - | - | O (신규 [C]) 호박 작은 텍스트 | - |
| 지각 제출 라벨 (응시 가능 학생) | - | - | O (신규 [B-#02]) "지각 제출 {label}" | - |

### 2-8. 학생 응시 결과 섹션 (xnquiz 신규)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 최근 제출 일시 표시 | O (사이드바 안) | O | O (신규 [C]) "최근 제출" + submittedAt | xnquiz 는 본문 카드 |
| 지각 제출 배지 (`isLate`) | - | - | O (신규 [B-#02]) AlertCircle + "지각 제출" 호박 | - |
| 점수 우측 (`{autoScore} / {totalPoints}`) | O (사이드바) | O | O | - |
| "점수 없음" (autoGrade 가능 문제 없을 때) | - | - | O (신규 [C]) | xnquiz 자체 처리 |
| "공개 예정" (released=false) | - | - | O (신규 [C]) | - |
| manualPending 안내 (서술형 N개 채점 완료 시 반영) | O ("Some questions not yet graded") | O | O (신규 [C]) "서술형 {N}개 문항은 채점이 완료되면 점수에 반영됩니다." | - |
| oneTimeResults 1회 조회 처리 (`markResultViewed`) | O (`quiz_one_time_results`) | O | O (신규 [C]) | xnquiz 는 localStorage 기록 |
| oneTimeResults 후 카드 ("이미 결과를 확인...") | O (서버 검증, 본문 미렌더) | O | O (신규 [C]) Eye 아이콘 + 안내 카드 | - |
| 문항별 채점 결과 (`showWrongAnswer`) | O (`_quiz_submission_results`) | O | O (신규 [C]) | - |
| 비공개 안내 카드 (정답 보호) | O (`render_correct_answer_protection`) | O | O (신규 [C]) EyeOff + "성적은 공개되지 않습니다" | xnquiz: "교수자가 설정한 공개 시점이 되면 문항별 채점 결과를 확인할 수 있습니다." |
| 문항 카드: "Q{idx+1}" + 본문 line-clamp | - | - | O (신규 [C]) | - |
| 상태 배지: 채점 대기 / 정답 / 부분점수 / 오답 | O (Canvas 도 정답/오답 마크) | O | O (신규 [C]) "부분점수 {scored}/{points}" | xnquiz 가 부분점수 표시 정밀 |
| showAnswer && !isCorrect 정답 표시 | O (`show_correct_answers` ON) | O | O (신규 [C]) `QuestionAnswer` | - |
| 피드백 (정답/오답/무조건) 카드 | O (Canvas: Answer Comment / General Comment) | O | O (신규 [C]) | xnquiz 통합 카드 |
| 교수자 코멘트 카드 (`CommentThread`) | O (Canvas 는 SpeedGrader 코멘트와 일부 연동) | O | O (신규 [C]) role="student" | xnquiz 자체 채팅 |

### 2-9. Cant Go Back / 응시 시작 전 모달

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Cant Go Back 경고 모달 (`_cant_go_back_warning`) | O ("Once you have submitted an answer..." + "Begin") | O | O (응시 화면 시작 시 AlertDialog "응답 후 문항 잠금") | xnquiz 는 위치가 S-07 |
| Begin 버튼 | O | O | - (xnquiz 는 닫기 버튼만) | - |

### 2-10. 모달 / 마운트 포인트

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| `#direct-share-mount-point` (Send to/Copy to) | O | O | - | xnquiz 상세에 없음 |
| `#assign-to-mount-point` (Assign To 트레이) | O | O | - | xnquiz 는 S-04 편집에 통합 |
| `#enhanced-rubric-assignment-edit-mount-point` | O | O | - | xnquiz 범위 외 |
| `#module_sequence_footer` (다음/이전 모듈 푸터) | O | O | - | xnquiz 범위 외 (LMS 본체 기능) |
| 삭제 ConfirmDialog | - (Canvas 는 브라우저 confirm) | - | O (커스텀 "퀴즈 삭제" + 메시지) | xnquiz: "삭제된 퀴즈는 복구할 수 없습니다." |
| 삭제 후 토스트 (목록 이동 후) | - | - | O (신규 [C]) `sessionStorage('xnq_toast')` | - |

### 2-11. Edge case / 권한 분기

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 비로그인 + graded quiz | O ("Only registered, enrolled users can take graded quizzes") | O | - (xnquiz 는 로그인 가드 없음) | - |
| 종강된 과목 | O ("This quiz is no longer available as the course has been concluded.") | O | - | xnquiz 범위 외 |
| 미공개 + 학생 진입 | O (403 또는 미노출) | O | O (차이: `studentDisplayStatus` 가 visible 분기) | - |
| Master Course 자식 (`editing_restricted?`) | O (Edit/잠금/Delete 비활성) | O | - | xnquiz 범위 외 |
| Direct Share 만 활성 + 다른 권한 없음 | O (헤더 ⋮ Send/Copy 만) | O | - | - |
| 로딩 상태 | - (서버 렌더링) | - | O (신규 [C]) "로딩 중" | - |
| 미존재 (404) | - (서버 404) | - | O (신규 [C]) "퀴즈를 찾을 수 없습니다." | - |

### 2-12. 학생 헤더 (xnquiz 분리)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 제목 h1 | O | O | O | - |
| StatusBadge (학생용) | - | - | O (신규 [C]) `studentDisplayStatus` | scheduled / open / closed 만 |
| 주차/차시 배지 | - | - | O (신규 [C]) | - |
| "응시하기" / "재응시" 버튼 | O (사이드바 Take 버튼) | O | O (헤더 우측) | xnquiz 는 헤더 우측 |
| 응시 횟수 초과 비활성 + 툴팁 | O (Canvas 도 비활성) | O | O (신규 [C]) 호버 툴팁 "응시 가능 횟수({maxAttempts}회)를 초과했습니다" | - |
| meta: 응시 기간 + 지각 제출 라벨 | - | - | O (신규 [C]) 한 줄 표시 | - |

## 3. 시스템별 상세 (raw 스펙에서 발췌)

### 3-1. Canvas 표준에만 있는 기능

| **기능** | **동작** | **xnquiz 채택 여부 / 이유** |
|---|---|---|
| 게시 토글 (#quiz-publish-link) | 헤더에서 즉시 공개/비공개 토글 | 부분 채택. xnquiz 는 카드 메뉴 / 편집 폼에서 처리 |
| Assign To 트레이 (#assign-to-mount-point) | 학생/섹션별 마감일 별도 트레이 | 미채택. S-04 편집의 "추가 기간 설정" 섹션으로 통합 |
| Show Rubric (루브릭 모달) | 별도 채점 기준표 모달 | 미채택. xnquiz 는 문항별 채점 기준 textarea |
| "Let Students Take this Quiz Now" / "Lock this Quiz Now" | 잠금 토글 + "No time limit / Until [date]" 다이얼로그 | 미채택. xnquiz 는 lockDate 기반 자동 |
| Show Student Quiz Results 패널 | 응시자 목록 인라인 패널 | 미채택. xnquiz 는 별도 화면 (S-05) |
| Message Students Who... 모달 | 조건별 메시지 발송 | 미채택. xnquiz 는 알림/메시지 기능 미구현 |
| Direct Share (Send to / Copy to) | 다른 사용자/코스로 직접 공유 | 미채택. xnquiz 는 S-01 카드 메뉴에 "복사" 만 |
| Statistics / Moderate / SpeedGrader 사이드바 링크 3종 | 상세 화면에서 채점/통계 분기 | 부분 채택. "채점"/"통계" 헤더 버튼으로 단순화 |
| Mastery Paths 그래프 | 사이드바 |  미채택. xnquiz 범위 외 |
| Download File Upload Submissions | 사이드바 단축키 | 미채택. xnquiz 는 S-05 안에 처리 |
| Master Course 잠금 매트릭스 (Edit/Delete 비활성) | LMS 본체 기능 | 미채택. xnquiz 범위 외 |
| 종강된 과목 안내 | "no longer available..." | 미채택. xnquiz 는 coursework concluded 미구현 |
| `_cant_go_back_warning` 모달 | 응시 시작 전 잠금 안내 | 채택 (위치 다름). xnquiz 는 S-07 응시 화면 진입 시 AlertDialog |
| `regraded-warning` 배너 | 재채점 결과 학생 알림 | 미채택. xnquiz 는 학생 채팅/카드 안에서 처리 |
| Course Paces 노티스 | 페이싱 기능 통합 | 미채택. xnquiz 범위 외 |

### 3-2. LearningX custom.js delta

`custom.quiz-erratum-download.example.js` (예시):
- 적용 URL: `^/courses/(\d+)/quizzes/(\d+)$`
- 교수자만 (`.btn.edit_assignment_link` 존재 여부 판정) 우측 사이드바 끝에 "퀴즈 오답률 다운로드" 회색 버튼 추가
- 클릭 시 `GET /learningx/api/v1/courses/:cid/quizzes/:qid/erratum/download` (Xlearn 자체 엔드포인트)
- xnquiz 미채택 (별도 화면 S-06 통계에서 처리 가능)

### 3-3. xnquiz 신규 기능 ([B] 학교 요구 + [C] 자체 도출)

| **ID** | **라벨** | **기능** | **동작** |
|---|---|---|---|
| [B-#01] | StatusBadge / studentDisplayStatus | 진행중/채점중/마감/임시저장/예정 | 헤더 + 학생 분기 |
| [B-#02] | 지각 제출 라벨 + 지각 배지 | allowLateSubmit / isLate | "지각 제출" 호박 |
| [C] | 뒤로가기 버튼 (페이지 자체) | 명시적 UI | Canvas 는 브라우저 뒤로가기 |
| [C] | "채점" / "통계" 헤더 버튼 | 단축키 | Canvas 는 사이드바 링크 + ⋮ 메뉴 분산 |
| [C] | 요약 카드 5지표 (학생) / 4지표 (교수자) | 한눈에 보기 | Canvas 는 form-horizontal 표 |
| [C] | "응시 조건" / "응시 정책" / "성적 공개" / "접근 제한" 4섹션 (교수자) | 그룹화 | Canvas 는 단일 표 |
| [C] | scoreRevealCardLabel (학생용) | 공개 시점 사전 안내 | Canvas 는 묵시 |
| [C] | scoreRevealBadge (교수자용) | "{점수만 또는 정답 포함} · {시점}" | xnquiz 자체 |
| [C] | 학생 응시 결과 본문 섹션 | StudentResultSection | Canvas 는 별도 결과 페이지 (`_quiz_submission_results`) |
| [C] | oneTimeResults 1회 조회 안내 카드 | Eye 아이콘 카드 | Canvas 는 본문 미렌더로 처리 |
| [C] | 부분점수 배지 ("부분점수 {scored}/{points}") | 단답형/복수선택 정밀 표시 | Canvas 는 정답/오답 마크만 |
| [C] | 응답 피드백 통합 카드 (정답/오답/무조건) | correct/incorrect/neutral 한 카드에 | Canvas 는 분산 |
| [C] | 교수자 코멘트 카드 (CommentThread) | 학생-교수자 1:1 채팅 | xnquiz 자체 기능 |
| [C] | scheduled 학생 "{startDate} 시작" | 응시 전 안내 | Canvas 는 사이드바 없음 |
| [C] | 응시 횟수 초과 비활성 + 툴팁 | 명시적 사유 | Canvas 는 버튼 미노출 |
| [C] | 미존재 / 로딩 안내 | 클라이언트 SPA 상태 | Canvas 는 서버 렌더링 |
| [C] | 삭제 ConfirmDialog (커스텀) | 다이얼로그 + sessionStorage 토스트 | Canvas 는 브라우저 confirm |

## 4. 핵심 차이 요약

**Canvas → LMS**: 상세 화면 보강은 `custom.quiz-erratum-download.example.js` 단 1개 — 우측 사이드바에 "퀴즈 오답률 다운로드" 회색 버튼 추가. LearningX 자체 엔드포인트로 엑셀 다운로드. 그 외 본문/액션바/모달은 Canvas 표준 그대로 사용. .example 상태라 학교별 적용.

**Canvas → xnquiz**: 상세 화면 정보 구조를 가장 크게 재편한 화면. (1) **요약 카드 + 4섹션 그룹** 으로 form-horizontal 표를 분해 (응시 조건/응시 정책/성적 공개/접근 제한). (2) **사이드바 폐기**: Canvas 의 Statistics/Moderate/SpeedGrader/Download File 사이드바 링크를 헤더 "채점"/"통계" 2버튼으로 통합, 점3 메뉴는 편집/미리보기/삭제 3가지로 단순화. (3) **Assign To 트레이 폐기**: S-04 편집의 "추가 기간 설정" 섹션으로 단일화. (4) **Show Student Quiz Results / Message Students / Direct Share / Mastery Paths / Rubric 모달 일체 드롭**. (5) **학생 응시 결과 본문 통합**: Canvas 는 별도 결과 페이지로 가야 했던 학생 점수/문항별 채점 결과를 본 화면 본문에 통합 (StudentResultSection). (6) **명시적 비공개/공개 시점 라벨**: scoreRevealCardLabel/scoreRevealBadge 로 정책 라벨링 자체를 시각화.

**LMS → xnquiz**: LearningX 의 "퀴즈 오답률 다운로드" 사이드바 버튼은 xnquiz 에서 S-06 통계 화면의 "성적 다운로드" 버튼으로 위치 변경. 즉 "상세에서 분석 분기" 대신 "통계 화면에서 통합 처리" 로 동선 변경. 정책적으로는 xnquiz 가 "학생 응시 결과 노출 정책" 을 더 정교화 — Canvas 의 묵시 동작 (`hide_results`, `show_correct_answers_at/at` 조합) 을 명시적 라벨 + 카드 UI 로 시각화하여 교수자/학생 모두 한눈에 공개 정책을 파악할 수 있게 함. oneTimeResults 안내 카드는 xnquiz 만의 디테일.

## 5. 누락 의심 / 확인 필요

- xnquiz 학생 헤더의 "응시하기" / "재응시" 버튼 노출 조건: `scheduled` 면 미노출인데, `lockDate` 와 `dueDate` 간 우선순위가 raw 에 명시 없음 (OQ-XN-06).
- Canvas 의 `regraded-warning` (재채점 결과 학생 알림) 이 xnquiz 에선 어디서 노출되는지 — S-05 채점 화면이 아닌 학생 화면에서의 알림이 raw 에 없음 (OQ-XN-07).
- 교수자가 학생 응시 결과 패널에서 (S-05 가 아닌) 즉시 점수 확인하는 동선이 xnquiz 에 없는데, S-03 → S-05 1클릭 점프가 충분한지 검증 필요.
- LearningX delta "퀴즈 오답률 다운로드" 가 .example 인데, 실제 활성 학교 비율 확인 필요 (xnquiz 채택 우선순위 판단).
- Canvas 의 Master Course 잠금 (`editing_restricted?`) 에서 xnquiz 대응 방안 없음 — LMS 본체 기능이라 미구현이 자연스럽지만, LTI 통합 시 어떻게 처리할지 미정 (OQ-XN-08).
- xnquiz 의 `markResultViewed` 가 localStorage 기반인데, 브라우저/디바이스 바뀌면 재조회 가능 — oneTimeResults 정책의 실효성 검토 필요 (OQ-XN-09).

## 6. 자기 점검 체크리스트

| **영역** | **raw 스펙 영역 수** | **매트릭스 반영 영역 수** | **상태** |
|---|---|---|---|
| 헤더 액션바 | Canvas 5 + xnquiz 6 = 11 | 11 | 완료 |
| ⋮ Manage 드롭다운 | Canvas 9 + xnquiz 2 = 11 | 11 | 완료 |
| 경고/안내 배너 | Canvas 6 + xnquiz 0 = 6 | 6 | 완료 |
| 본문 (교수자) | Canvas 18 + xnquiz 4 = 22 | 22 | 완료 |
| 본문 (학생) | Canvas 7 + xnquiz 2 = 9 | 9 | 완료 |
| 우측 사이드바 (교수자) | Canvas 7 + LMS 1 = 8 | 8 | 완료 |
| 우측 사이드바 (학생) | Canvas 8 + xnquiz 2 = 10 | 10 | 완료 |
| 학생 응시 결과 섹션 | xnquiz 14 (Canvas 일부 매칭) | 14 | 완료 |
| Cant Go Back 모달 | Canvas 2 | 2 | 완료 |
| 모달/마운트 | Canvas 4 + xnquiz 2 = 6 | 6 | 완료 |
| Edge case / 권한 | Canvas 5 + xnquiz 2 = 7 | 7 | 완료 |
| 학생 헤더 | xnquiz 6 (Canvas 1 매칭) | 6 | 완료 |
| **합계 행 수** | **약 112행** | **약 112행** | - |

누락 의심 행:
- Canvas show.html.erb 의 434줄 중 일부 fragment (`_quiz_details`, `_quiz_submission` 등 partial 의 세부 항목) 는 본 매트릭스에선 항목 단위로 통합 (한 행 = 한 partial 의 핵심 동작)
- Canvas "Outcome" 연결, "Rubric" 연결 등 LMS 본체 기능은 xnquiz 범위 외라 매트릭스에서 1행으로 묶음
- `module_sequence_footer` 는 LMS 본체 (모듈 시스템) 기능이라 별도 분석 불필요로 1행만
