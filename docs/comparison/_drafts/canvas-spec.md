# Canvas Classic Quizzes 기능 스펙 (AS-IS, 화면 단위)

> 톤: 반말. 비개발자 가독성. 영문 식별자/라벨은 한국어 번역 + 영문 병기.
> 누락 금지 원칙: 작은 버튼/링크/체크박스/툴팁/안내문구도 빠뜨리지 말 것.
> 범위: Canvas Classic Quizzes 만 대상. New Quizzes / Quizzes Next / quiz_lti placement 는 제외.
> 작성자: Creator (xnquiz)
> 기준 소스: `C:\Users\김민주\Downloads\canvas-lms-master` (Classic Quizzes 영역)

## 0. 권한 키워드 및 공통 개념

Canvas 는 한 컴포넌트 안에서 사용자 권한(`can_do(@quiz, @current_user, :xxx)`) 별로 노출 요소를 분기한다. xnquiz 와 매핑할 때 반드시 봐야 할 권한 플래그는 다음과 같다.

| **권한 키** | **의미** | **주요 동작 영향** |
|---|---|---|
| `manage_assignments_add` | 과제/퀴즈 생성 권한 | "+ 퀴즈" 버튼 활성. `permissions.create` 로 매핑 |
| `manage_assignments_edit` | 과제/퀴즈 편집 권한 | 편집 폼 진입, 카드 편집/잠금/공개 토글 |
| `manage_assignments_delete` | 과제/퀴즈 삭제 권한 | 삭제 메뉴 활성. 응시 시작 후에도 가능 |
| `manage` | 퀴즈 관리(상위 액션) | 관리(Manage) 드롭다운, 일괄 공개 |
| `manage_assign_to` | 학생/섹션별 일정 부여 | "할당 대상(Assign To)" 트레이 |
| `read_question_banks` | 문제 은행 조회 | "문제 은행 보기/관리", 편집 폼의 "문제 찾기(Find Questions)" |
| `grade` | 채점 권한 | SpeedGrader, Speed Grader, "Show Student Quiz Results", "Message Students Who..." |
| `review_grades` | 점수 조회 권한 | 결과/통계 조회. 채점 권한이 없는 조교/뷰어가 본다 |
| `read_as_admin` | 관리자 시점 조회 | 학생 미리보기 분기 |
| `submit` | 응시 권한 | "Take this Quiz/Take Again" 버튼 |
| `add_attempts` | 응시 횟수 추가 권한 | "Allow this student an extra attempt" |
| `participate_as_student` | 수강생 권한 | 학생 응시/결과 조회 |

추가 키워드:
- `editing_restricted?(@quiz, :all|:content|:any)` — Master Course 잠금 상태 확인
- `MASTER_COURSE_DATA.master_course_restrictions.content / points / due_dates` — 잠금 단위
- `permissions.delete` — 카드 더보기 메뉴의 삭제 항목 표시 조건
- `DIRECT_SHARE_ENABLED` — Send to / Copy to 메뉴 노출 조건
- `editing_restricted?` (응시 시작 후 일부 필드 잠금)

---

## S-01. 퀴즈 목록 (`/courses/:course_id/quizzes`)

기존 `docs/urd/canvas-as-is/S-01-quiz-list.md` 보다 누락 항목을 추가 발굴해 재정리한다.

### S-01.1 진입 위치

| **경로** | **HTTP** | **조건** |
|---|---|---|
| `/courses/:course_id/quizzes` | GET | 과목 좌측 메뉴 "퀴즈(Quizzes)" 클릭. `Tabs::TAB_QUIZZES` 활성된 과목만 노출 |
| `POST /courses/:course_id/quizzes/new` | POST | 헤더 "퀴즈 추가(Create Quiz / Quiz)" 버튼이 호출. 빈 퀴즈 즉시 생성 후 편집 화면으로 이동 |
| `/courses/:course_id/question_banks` | GET | 학생/뷰어가 `read_question_banks` 권한이 있을 때 "문제 은행 보기(View Question Banks)" 버튼 |

### S-01.2 와이어프레임 (교수자 화면)

```
┌──────────────────────────────────────────────────────────────┐
│ Quizzes                                                      │
│ [🔍 Search for Quiz                ]   [⋮]   [+ Create Quiz] │
├──────────────────────────────────────────────────────────────┤
│ ▼ Assignment Quizzes                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📝  Midterm: DB Design                           [✓][⋮] │ │
│ │     Available until May 17 | Due May 17 | 100 pts | 30Q │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ ▼ Practice Quizzes              ▼ Surveys                    │
└──────────────────────────────────────────────────────────────┘
```

좌→우, 위→아래: 화면 제목 + 검색창 + 헤더 더보기 메뉴(⋮) + "퀴즈 추가" 버튼. 그 아래 4개 그룹(과제/연습/설문/빈 상태). 카드 오른쪽에 SIS/잠금/공개 아이콘과 카드 더보기 메뉴(⋮).

### S-01.3 헤더 영역

| **요소** | **표시 조건** | **동작 / 비고** |
|---|---|---|
| 스크린리더용 H1 "Quizzes" | 항상 (시각적으론 가려짐) | `screenreader-only` 클래스 |
| 검색창 ("Search for Quiz") | 항상 | `data-view="inputFilter"` 바인딩. 입력 즉시 클라이언트 사이드 제목 부분 일치 필터링 (서버 호출 없음) |
| 퀴즈 설정 더보기(⋮) | `permissions.create` 또는 `permissions.manage` 일 때 | `al-trigger btn`. 드롭다운 메뉴 노출 (S-01.4 참고) |
| 퀴즈 추가 (+ Create Quiz / + Quiz) | `permissions.create` 일 때 | `new-quiz-form` form 의 `POST /quizzes/new` 호출. 즉시 빈 퀴즈 생성 후 `/quizzes/:id/edit` 로 리디렉션 |
| 문제 은행 보기 (View Question Banks) | 학생/뷰어이면서 `permissions.read_question_banks` 일 때 | 헤더의 ⋮ 가 없는 사용자에게 단독 버튼으로 노출 |

### S-01.4 헤더 더보기 메뉴 (⋮)

| **메뉴 항목** | **표시 조건** | **동작** |
|---|---|---|
| 문제 은행 관리 (Manage Question Banks) | `permissions.read_question_banks && flags.question_banks` | `/question_banks` 로 이동 |
| 여러 퀴즈 일괄 공개 (Publish Multiple Quizzes) | `permissions.manage && flags.publish_multiple` | 일괄 공개 다이얼로그 오픈 |
| 외부 도구 (LTI placements) | `placement = quiz_index_menu` 등록된 도구 존재 시 | LTI launch. xnquiz 범위 외이지만 메뉴 항목으로 동적 추가됨 |

### S-01.5 와이어프레임 (학생 화면)

학생 화면은 검색창만 있고 더보기 메뉴/추가 버튼/카드 우측 액션이 일체 없다. 카드에는 제목과 응시 정보(이용 시작/마감/점수/문항 수)만 노출. 본인 응시 결과는 카드에 표시되지 않고 상세 진입 후 확인.

### S-01.6 퀴즈 그룹 (Item Group)

| **그룹** | **포함 조건** | **그룹 라벨** | **빈 상태 본문** |
|---|---|---|---|
| 과제 퀴즈 (Assignment Quizzes) | `quiz_type = assignment` (graded) | "Assignment Quizzes" | "No quizzes found" |
| 연습 퀴즈 (Practice Quizzes) | `quiz_type = practice_quiz` | "Practice Quizzes" | "No quizzes found" |
| 설문 (Surveys) | `quiz_type ∈ (survey, graded_survey)` | "Surveys" | "No surveys found" |
| 빈 상태 단독 그룹 | 위 세 그룹 모두 0건일 때 | "Course Quizzes" | "No quizzes available" |

> 그룹은 항상 노출되고, 0건이면 빈 상태 텍스트만 채워진다. 그룹은 접기/펼치기 가능하지만 새로고침하면 다시 펼쳐진다.

### S-01.7 카드 (QuizItemView) — 교수자

| **영역** | **요소** | **표시 조건** | **동작 / 비고** |
|---|---|---|---|
| 좌측 | 퀴즈 아이콘 (`icon-quiz`) | 항상 | 스크린리더에 "Quiz" 라벨 |
| 좌측 | 제목 링크 (`title_label`) | 항상 | 클릭 시 상세(`/quizzes/:id`) 이동 |
| 좌측 | 이용 시작일 (date-available) | `showAvailability` true | `unlock_at` 표시 |
| 좌측 | 마감일 (date-due) | `showDueDate` true | `due_at` 표시 |
| 좌측 | 배점 라벨 | `possible_points_label` 존재 | "X pts" |
| 좌측 | 문항 수 라벨 | `question_count_label` 존재 | "X Questions" |
| 우측 | Mastery Paths 라벨 | `cyoe.isTrigger` 또는 `cyoe.isReleased` | Conditional Release 알림. xnquiz 범위 외 |
| 우측 | SIS 버튼 | `postToSISEnabled && postToSIS !== null && published` | SIS 동기화 토글 |
| 우측 | 잠금 아이콘 | `can_update` | 클릭 시 잠금/해제 토글 |
| 우측 | 공개 아이콘 (✓ 공개 / ○ 비공개) | `can_update` | 클릭 시 공개/비공개 토글 |
| 우측 | 카드 더보기 메뉴 (⋮) | `canOpenManageOptions` | S-01.9 참고 |

#### 카드 임시 상태 (작업중 표시)

| **상태** | **표시** |
|---|---|
| isMigrating | 스피너 + "Migrating ..." (Migrate 메뉴 사용 시) |
| failedToMigrate | 오류 알림 + Retry/Cancel 버튼 |
| isDuplicating | 스피너 + "Making a copy of ..." |
| failedToDuplicate | 오류 알림 + Retry/Cancel |
| isCloningAlignment | 스피너 + "Cloning Alignments of ..." |
| failedToCloneAlignment | 오류 알림 + Retry/Cancel |
| isImporting | 스피너 + "Importing ..." |
| failedToImport | 오류 알림 + Cancel |

### S-01.8 카드 (학생)

학생은 카드 우측의 SIS/잠금/공개/더보기를 전부 못 본다. 좌측 영역(제목, 날짜, 점수, 문항 수)만 노출.

### S-01.9 카드 더보기 메뉴 (교수자, ⋮)

| **메뉴 항목** | **표시 조건** | **동작** |
|---|---|---|
| 편집 (Edit) | `can_update` | `/quizzes/:id/edit` 이동 |
| Build | `canShowQuizBuildShortCut` (New Quizzes 전용) | xnquiz 범위 외. Classic 에서는 노출 안 됨 |
| SpeedGrader | `assignment_id && showSpeedGraderLink && published` | `?assignment_id=...` 새 창 |
| 복제 (Duplicate) | `canDuplicate` | 동일 과목 내 복제 (현재 New Quizzes 위주, Classic 도 일부 노출) |
| 할당 대상 (Assign To...) | `canManageAssignTo` | Assign-To 트레이 (학생/섹션별 마감일) |
| 삭제 (Delete) | `permissions.delete && !is_locked` | 브라우저 `confirm` 후 DELETE API |
| Migrate | `can_update && migrateQuizEnabled` (New Quizzes 마이그레이션) | xnquiz 범위 외 |
| 보내기 (Send to...) | `DIRECT_SHARE_ENABLED` | 다른 사용자에게 직접 전송 모달 |
| 복사 (Copy to...) | `DIRECT_SHARE_ENABLED` | 다른 과목으로 복사 모달 |
| Mastery Paths | `can_update && cyoe.isCyoeAble` | 편집 화면의 mastery-paths-editor 앵커로 이동 |
| 외부 도구 (LTI) | `placement = quiz_menu` 등록 도구 | LTI launch |

### S-01.10 빈 상태 (NoQuizzesView)

| **항목** | **내용** |
|---|---|
| 그룹 헤더 | "Course Quizzes" |
| 본문 | "No quizzes available" |
| CTA / 일러스트 | 없음 |

### S-01.11 검색/필터/정렬

| **항목** | **지원 여부** |
|---|---|
| 제목 검색 | 지원 (클라이언트 사이드, 즉시 필터) |
| 주차/차시 필터 | 미지원 |
| 정렬 (마감 임박순, 최근 생성순) | 미지원. `position` 기본 순서 |
| 상태 필터 (공개/비공개) | 미지원 |
| 페이지네이션 | 미지원 (한 페이지 전체 노출) |

### S-01.12 키보드/접근성

| **요소** | **a11y 처리** |
|---|---|
| 검색 input | `<label class="screenreader-only">` + `aria-label` |
| 더보기 메뉴 ⋮ | `aria-haspopup="true"`, `aria-owns="toolbar-1"`, `role="menu"` |
| 카드 더보기 메뉴 | 같은 패턴, `aria-activedescendant` |
| 카드 우측 액션 아이콘 | `screenreader-only` 텍스트로 의미 부여 |
| 마이그레이션/복제 상태 | `aria-live="polite"` `aria-atomic="true"` |

### S-01.13 Edge case

| **시나리오** | **Canvas 동작** |
|---|---|
| 과목에 퀴즈 0건 | "Course Quizzes" 헤더 + "No quizzes available" |
| 한 그룹만 0건 | 그룹은 그대로 표시되고 "No quizzes found" 내부 텍스트 |
| 마감 지난 공개 퀴즈 | 카드에 별도 변화 없음. 마감 텍스트만 과거 시각 |
| LTI placement 추가 | 헤더/카드 더보기 메뉴에 동적 추가 |
| 응시 시작된 퀴즈 삭제 | `confirm()` 후 정상 삭제 가능 (학생 응시 기록도 같이 삭제) |
| Direct Share 비활성 | "Send to / Copy to" 항목 자체가 렌더되지 않음 |

---

## S-02. 퀴즈 생성 (`POST /courses/:course_id/quizzes/new` → edit redirect)

Classic Quizzes 는 생성/편집 한 화면. "S-02 = 생성" 은 사실 "빈 퀴즈 즉시 저장 후 편집 화면" 이다. 본 절은 "생성 직후" 진입에 한정된 차이를 정리하고 공통 사양은 S-04 와 함께 본다.

### S-02.1 생성 진입 동작

| **단계** | **동작** |
|---|---|
| 1 | 사용자가 목록 헤더의 "퀴즈 추가(+ Create Quiz / + Quiz)" 클릭 |
| 2 | 클라이언트가 `new-quiz-form` 의 hidden authenticity_token 과 함께 `POST /quizzes/new` 요청 |
| 3 | 서버가 빈 퀴즈 레코드 생성 (workflow_state=unpublished, 빈 제목 "") |
| 4 | `/courses/:course_id/quizzes/:quiz_id/edit` 로 302 리디렉션 |
| 5 | 편집 폼 렌더링. 제목 input 에 자동 포커스 (`autofocus`) |

### S-02.2 생성 직후 vs 편집 진입 차이

| **항목** | **생성 직후** | **기존 편집** |
|---|---|---|
| 폼 초기값 | 모든 필드 기본값/빈 값 | 저장된 값 |
| 제목 input autofocus | 적용 | 미적용 |
| 상단 게시 배지 | "Not Published" 고정 | 현 상태("Published" / "Not Published") |
| "Save & Publish" 버튼 | 노출 | unpublished 일 때만 노출 |
| 응시 시작 경고 배너 | 미노출 | 학생이 응시 시작/완료한 경우 노출 |
| Master Course 잠금 필드 | 없음 | 잠긴 필드 readonly 처리 |
| Cancel 동작 | `params[:return_to]` 또는 quiz show 로 이동. 빈 퀴즈는 DB 잔존 (수동 삭제 필요) | 마찬가지 |

### S-02.3 권한 분기 (S-04 와 공통)

| **권한** | **동작** |
|---|---|
| `permissions.create` | "+ 퀴즈" 버튼 노출, POST 허용 |
| 생성 권한 없는 학생 | URL 직접 진입 시 403. 별도 리디렉션 없음 |

> 본 화면의 폼 본체 사양은 S-04 와 동일하므로 S-04 에 통합 기재.

---

## S-03. 퀴즈 상세 (`/courses/:course_id/quizzes/:id`)

소스: `app/views/quizzes/quizzes/show.html.erb` (434줄)

### S-03.1 진입 위치

| **경로** | **조건** |
|---|---|
| `/courses/:course_id/quizzes/:id` | 목록 카드 제목 링크, 다른 화면의 "Back to Quiz" 링크, 직접 URL |

### S-03.2 권한 분기

| **사용자** | **노출 영역** |
|---|---|
| 교수자 (`can_do(:update)` 또는 `can_do(:manage)`) | `_quiz_show_teacher` 본문 + 헤더 액션바(공개 토글, Preview, Assign To, Edit, ⋮ Manage) + 우측 사이드바(Statistics, Moderate, SpeedGrader 등) |
| 채점자/리뷰어 (`:review_grades`) | 학생 결과 보기 메뉴 + "See Full Quiz" 링크 + Statistics |
| 학생 (`participate_as_student`) | `_quiz_show_student` 본문 + 우측 사이드바(응시 요약/Take 버튼) |
| Direct Share 권한만 있는 사용자 | 헤더에 ⋮ Send to / Copy to 만 노출 |

### S-03.3 헤더 액션바 (교수자)

| **요소** | **표시 조건** | **동작** |
|---|---|---|
| 게시 토글 (`#quiz-publish-link`) | `can_update` 또는 `can_manage` | 공개/비공개 토글. `disabled` 가 붙는 경우는 horizon_course 거나 `!can_unpublish?` (학생 응시 후 비공개 불가) |
| Preview 버튼 (`preview_quiz_button`) | 항상 (교수자) | `POST /take?preview=1`. 교수자 미리보기 모드 진입 |
| 할당 대상 (Assign To) | `manage_assign_to` 권한 | 학생/섹션별 마감일 트레이 (assign-to-mount-point 에 마운트) |
| 편집 (Edit) | `can_update` | `/quizzes/:id/edit` |
| 관리(⋮ Manage) 드롭다운 | `can_update` 또는 `:grade` 또는 `:review_grades` | S-03.4 참고 |

### S-03.4 관리(⋮ Manage) 드롭다운 메뉴

| **메뉴 항목** | **표시 조건** | **동작** |
|---|---|---|
| 채점 기준표 보기 (Show Rubric) | `can_update && @assignment && !enhanced_rubrics_assignments_enabled?` | 루브릭 모달 |
| Preview (관리 메뉴 내부) | `can_update && !needs_unpublished_warning?` | `POST .../take?preview=1` |
| 지금 학생이 풀게 하기 (Let Students Take this Quiz Now) | `can_update && !editing_restricted? && @quiz.locked?` | 잠금 해제. "No time limit / Until [date]" 다이얼로그 (`unlock_for_how_long_dialog`) |
| 지금 잠그기 (Lock this Quiz Now) | `can_update && !editing_restricted? && !@quiz.locked?` | 즉시 잠금 form 제출 |
| 학생 응시 결과 보기 (Show Student Quiz Results) | `(:grade 또는 :review_grades) && @quiz.available?` | 응시자 목록 패널 노출. 미채점 문항 있으면 ⚠ 아이콘. 부제목 "(N students submitted so far)" |
| Message Students Who... | `:grade && :send_messages && available? && !anonymous_submissions? && graded?` | 조건별 메시지 보내기 모달 |
| 삭제 (Delete) | `(:delete && !editing_restricted?) || (Master Course 자식이 아니면 비활성 항목으로 표시)` | DELETE API |
| Send to... / Copy to... | `can_direct_share` | Direct Share 모달 |
| 외부 도구 (LTI) | `placement = quiz_menu` 등록 도구 | LTI launch |

### S-03.5 헤더 경고/안내 배너

| **배너** | **조건** | **내용** |
|---|---|---|
| 재채점 경고 (`regraded-warning`) | `submission_has_regrade?(@submission)` | "This quiz has been regraded; your score was affected." 또는 "your score was not affected" (점수 영향 여부에 따라 분기) |
| 미공개 경고 (`alert`) | `needs_unpublished_warning?(@quiz)` | `quiz_published_state_warning` 텍스트 + "Save It Now" 버튼 (조건부) |
| 미리보기 안내 | `@submission && params[:preview]` | "This is a preview of the draft version of the quiz" |
| 잠금 사유 (`lock_explanation`) | 학생이고 응시 불가능한 경우 | `lock_explanation(@locked_reason, 'quiz', @context)` 텍스트 |
| 면제 안내 | 학생이 `excused?` | "This quiz has been excused" |
| 종강 안내 | `context.soft_concluded?` | "This quiz is no longer available as the course has been concluded." |

### S-03.6 본문 (교수자, `_quiz_show_teacher`)

설명(description) 본문 위에 다음 정보가 form-horizontal 표 형태로 렌더링된다.

| **라벨** | **표시 값** | **조건** |
|---|---|---|
| Quiz Type | Practice Quiz / Graded Assignment / Graded Survey / Survey | 항상 |
| Points | `points_possible_display` (예: "100") | 항상 |
| Assignment Group | 그룹명 | `graded? && assignment_group.present?` |
| Shuffle Answers | Yes / No | 항상 |
| Time Limit | "N Minutes" 또는 "No Time Limit" | 항상 (응시자 extra_time 합산) |
| Multiple Attempts | Yes / No | 항상 |
| Score to Keep | Keep Highest / Keep Latest / Average | `!single_attempt?` |
| Attempts | "N" 또는 "Unlimited" | `!single_attempt?` |
| View Responses | `render_show_responses(hide_results)` | 항상 |
| Show Correct Answers | `render_show_correct_answers` (공개 시작/종료 일정 포함 텍스트) | `hide_results != 'always'` |
| Access Code | 코드 평문 | `access_code.present?` |
| IP Filter | IP/CIDR 값 | `ip_filter.present?` |
| One Question at a Time | Yes / No | 항상 |
| Require Respondus LockDown Browser | Yes / No | `feature_enabled?(:lockdown_browser)` |
| Required to View Quiz Results | Yes / No | LDB 활성 시 |
| Monitor Required | Yes / No | `lockdown_browser_use_lti_tool?` |
| Lock Questions After Answering | Yes / No | `one_question_at_a_time` true 일 때 |
| Anonymous Submissions | Yes / No | `survey?` 일 때 |

### S-03.7 마감일 표 (교수자)

| **컬럼** | **내용** |
|---|---|
| Due | 마감일시 |
| For | Everyone / 학생/그룹 |
| Available from | 시작 일시 |
| Until | 종료 일시 |

> Course Paces 가 활성이면 `course_paces_due_date_notice` 노티스로 대체된다.

### S-03.8 본문 (학생, `_quiz_show_student`)

`_quiz_details` partial 을 통해 다음을 ul/li 형태로 보여준다.

| **항목** | **표시 값** |
|---|---|
| Due | 마감일 또는 "No due date" 또는 "Multiple Due Dates" |
| Points | 배점 (survey 면 숨김) |
| Questions | 문항 수 |
| Available dates (shared partial) | 시작~종료 |
| Time Limit | "N Minute" 또는 "None" |
| Allowed Attempts | "N" 또는 "Unlimited" (allowed_attempts ≠ 1 일 때) |
| Requires Respondus LockDown Browser | LDB 사용 시 |

본문 아래에 "Instructions" 헤더 + 설명 본문. `@locked` 이거나 `lock_at` 잠금이면 설명 숨김.

### S-03.9 우측 사이드바 (교수자)

| **링크/버튼** | **조건** |
|---|---|
| Quiz Statistics (`icon-stats`) | `can_update && can_manage && @submitted_student_count > 0` (또는 review_grades 권한) |
| Moderate This Quiz (`icon-settings`) | `can_manage && published?` |
| See Full Quiz (read-only) | `:review_grades` 만 있는 사용자 |
| SpeedGrader | `(:grade 또는 :review_grades) && available? && published && can_view_speed_grader?` |
| Download File Upload Submissions | `:review_grades` (`_download_file_upload_submissions`) |
| Mastery Paths 그래프 | `view_all_grades && triggers_mastery_paths?` |
| Keep Editing This Quiz (preview 중) | `@submission && params[:preview]` |

### S-03.10 우측 사이드바 (학생) — `_quiz_right_side`

학생이 `@submission` 이 완료된 상태일 때 노출.

| **블록** | **표시 내용** |
|---|---|
| Submission Details / Last Attempt Details (헤더) | `allowed_attempts == 1` 이면 "Submission Details", 아니면 "Last Attempt Details" |
| Time | 소요 시간 (분) |
| Current Score | 마지막 응시 점수 (survey 면 숨김). `pending_review` 일 때 `*` 표시 + "Some questions not yet graded" |
| Kept Score | 적용 점수 (정책에 따라) |
| 'This score was set by the teacher' | `manually_scored` |
| "1 Attempt so far" / "N Attempts so far" + View Previous Attempts 링크 | 응시 횟수 1 이상 |
| "Unlimited Attempts" 또는 "1/N More Attempts available" | 응시 여유 표시 |
| Take/Retake Quiz 버튼 | `allow_take && :submit && (unlimited 또는 attempts_left > 0)` |
| 점수 정책 안내 ("Keep Highest" 등) | Take 버튼 옆 작은 글씨 |

### S-03.11 하단 (학생 완료 시) — `_quiz_submission_results`

`@submission.posted? || was_preview?` 일 때 결과 본문(`_quiz_submission`)을 렌더. 아니면 `_muted` (점수 미공개 안내). 결과 본문에는 다음이 포함된다.

- "Score for this attempt/survey/quiz: N out of M" + 미채점 `*` 표시
- 정답 공개가 막힌 경우 `render_correct_answer_protection` 안내 (예: "정답은 시작일 이후에 공개됩니다")
- 재채점 필요 알림 + 미채점 문항 점프 링크 목록
- 응시한 문항 본문 + 학생 답안 + 정답/오답 표시 + 코멘트
- 시도 회차 선택 사이드바 ("Attempt N: 점수")

### S-03.12 Cant Go Back 경고

`@quiz.cant_go_back?` (한 문항씩 + 잠금 모드) 인 경우 응시 시작 직전 모달 (`_cant_go_back_warning`) 노출. 내용: "Once you have submitted an answer, you will not be able to change it later. You will not be able to view the previous question." + "Begin" 버튼.

### S-03.13 모달/마운트 포인트

| **id** | **용도** |
|---|---|
| `#direct-share-mount-point` | Send to/Copy to 모달 |
| `#assign-to-mount-point` | Assign To 트레이 |
| `#enhanced-rubric-assignment-edit-mount-point` | 새 루브릭 편집기 |
| `#module_sequence_footer` | 다음/이전 모듈 아이템 푸터 |

### S-03.14 Edge case

| **시나리오** | **동작** |
|---|---|
| 비로그인 + graded quiz | "Only registered, enrolled users can take graded quizzes" |
| 종강된 과목 | "This quiz is no longer available as the course has been concluded." (alert-danger) |
| 미공개 + 학생 진입 | `permissions` 부재로 403 또는 보이지 않음 |
| `editing_restricted?` 인 Master Course 자식 | Edit 메뉴/잠금 토글 비활성, Delete 메뉴 비활성 (회색) |
| Direct Share 만 활성 + 다른 권한 없음 | 헤더 ⋮ 에 Send to/Copy to 만 |

---

## S-04. 퀴즈 편집 (`/courses/:course_id/quizzes/:id/edit`)

소스: `app/views/quizzes/quizzes/_quiz_edit.erb` 외 7개 partial.

기존 `docs/urd/canvas-as-is/S-02-quiz-create.md` 가 통합 명세로 잘 정리돼 있어 본 절은 누락된 세부 요소(컴포넌트별 id, RCE 옵션, 검증 메시지, 잠금 매트릭스)를 추가한다.

### S-04.1 폼 컨테이너 구조

```
form (form-horizontal-quiz, #quiz_options_form, PUT /quizzes/:id)
├── 응시 시작 경고 (#student_submissions_warning, alert-info)
├── 헤더 영역 (.header-bar > _quiz_edit_header)
│   ├── points 표시 + 게시 배지
│   └── ⋮ Manage 드롭다운 (#manage-toolbar)
├── 탭 UI (#quiz_tabs, ui-tabs-minimal)
│   ├── #quiz_tabs_tab_list (Details / Questions / Mastery Paths)
│   ├── #options_tab (_quiz_edit_details)
│   ├── #questions_tab (_quiz_edit_questions)
│   └── #mastery-paths-editor (_quiz_edit_conditional_release)
└── form-actions (_quiz_edit_form_actions)
```

### S-04.2 _quiz_edit_header

| **요소** | **id / class** | **노출 조건** | **동작** |
|---|---|---|---|
| 배점 표시 | `#quiz_display_points_possible` > `.points_possible` | 항상 | 문항 점수 합 자동 표시 |
| 게시 배지 (Published) | `#quiz-draft-state.published-status.published` | published 일 때 | `icon-publish icon-Solid` + "Published" |
| 게시 배지 (Not Published) | `#quiz-draft-state.published-status.unpublished` | unpublished 일 때 | `icon-unpublished` + "Not Published" |
| ⋮ Manage 트리거 | `.al-trigger` `aria-owns="manage-toolbar"` | `can_update` 또는 `manage` | 드롭다운 |
| Show Rubric | `.show_rubric_link` | `@assignment` 존재 | 루브릭 모달 |
| SpeedGrader | `.speed-grader-link-quiz` | `additional_speedgrader_links && published && can_view_speed_grader?` | 새 창 |
| Delete | `.delete_quiz_link` | `:delete && !is_locked` | DELETE API |

### S-04.3 _quiz_edit_details (#options_tab)

#### 기본 정보

| **필드 id / name** | **타입** | **조건** | **검증/안내** |
|---|---|---|---|
| `quiz_title` / `quiz[title]` | text, maxlength=254, required, autofocus | content_lock 아닐 때 | `#quiz_title_message` (검증 실패 시 인라인) |
| `quiz_description` / `quiz[description]` | textarea → TinyMCE/RCE | content_lock 아닐 때 | 기본 높이 125px |
| `quiz[quiz_type]` / `#quiz_assignment_id` | select | 항상 | 옵션: practice_quiz / assignment / graded_survey / survey |
| `quiz[assignment_group_id]` / `#quiz_assignment_group_id` | select | 항상 (활성 그룹 목록) | 첫 active group 기본 |
| `quiz[points_possible]` / `#quiz_points_possible` | text + " pts" | `graded_survey?` 일 때만 노출 | 안내: "Students will automatically receive full credit once they take the survey" |
| `quiz[suppress_assignment]` / `#suppress_assignment_option` | checkbox | `root_account.suppress_assignments?` | "Hide from gradebook view and student grades view" |

#### Options 영역 ("p.option-caption: Options")

| **필드 id** | **input type** | **노출 조건** | **하위 동작** |
|---|---|---|---|
| `post_to_sis_option` | checkbox | `Assignment.sis_grade_export_enabled?` | "Sync to {SIS name}" |
| `quiz_shuffle_answers` | checkbox | 항상 | "Shuffle Answers" |
| `time_limit_option` (+ `quiz_time_limit`) | checkbox + text | 항상 | "Time Limit" + Minutes 입력. 검증 메시지 `#time_limit__message` |
| `quiz_disable_timer_autosubmission` | checkbox | `feature(:timer_without_autosubmission)` && 시간제한 ON | "Disable Automatic Submission" |
| `quiz_anonymous_submissions` | checkbox | `quiz.survey?` | "Keep Submissions Anonymous" |
| `multiple_attempts_option` | checkbox | 항상 | "Allow Multiple Attempts" |
| `keep_score_select` | select | 복수 응시 ON | "Quiz Score to Keep" — keep_highest / keep_latest / keep_average |
| `limit_attempts_option` + `quiz_allowed_attempts` | checkbox + text | 복수 응시 ON | "Allowed Attempts" + 숫자 (체크 해제 시 -1 = unlimited) |
| `never_hide_results` (`quiz[hide_results][never]`) | checkbox | concluded course 가 아닐 때 (concluded 면 disabled tooltip) | "Let Students See Their Quiz Responses (Incorrect Questions Will Be Marked in Student Feedback)" |
| `hide_results_only_after_last` (`quiz[hide_results][last_attempt]`) | checkbox | 응답 공개 ON | "Only After Their Last Attempt" |
| `quiz_one_time_results` | checkbox | 응답 공개 ON | "Only Once After Each Attempt" |
| `quiz_show_correct_answers` | checkbox | 응답 공개 ON | "Let Students See The Correct Answers" |
| `quiz_show_correct_answers_last_attempt` | checkbox | 정답 공개 ON | "Only After Their Last Attempt" |
| `quiz_show_correct_answers_at` | date_field | 정답 공개 ON | "Show Correct Answers at" |
| `quiz_hide_correct_answers_at` | date_field | 정답 공개 ON | "Hide Correct Answers at" |
| `quiz_one_question_at_a_time` | checkbox (element_toggler) | 항상 | "Show one question at a time" |
| `quiz_cant_go_back` | checkbox | 한 문항씩 ON | "Lock questions after answering" |

#### Quiz Restrictions 영역 ("p.option-caption: Quiz Restrictions")

| **필드 id** | **노출 조건** | **동작** |
|---|---|---|
| `enable_quiz_access_code` (체크박스) + `quiz_access_code` (text) | 항상 | "Require an access code" — 토글 시 `.access-code` 영역의 screenreader-only 해제. placeholder/help: "ex: Password85" |
| `enable_quiz_ip_filter` + `quiz_ip_filter` (text, maxlength=255) + Find IP icon (`.ip_filtering_link`) | 항상 | "Filter IP Addresses". help: "ex: 192.168.217.1". Find IP 아이콘은 IP 필터 다이얼로그 오픈 |
| `quiz_require_lockdown_browser` | `feature(:lockdown_browser) && !lockdown_browser_use_lti_tool?` | "Require Respondus LockDown Browser" |
| `quiz_require_lockdown_browser_for_results` | LDB ON | "Required to view quiz results" |

#### Assign 영역 (#overrides-wrapper)

| **요소** | **동작** |
|---|---|
| `#overrides-wrapper` | "Assign" 라벨 + `.js-assignment-overrides` mount point (React 컴포넌트가 Everyone / 학생 / 섹션별 Due / Available from / Until 카드 렌더) |
| Mastery Paths overrides | `course_pace_pacing_with_mastery_paths` && `enable_course_paces?` 일 때 `.js-assignment-overrides-mastery-paths` |

### S-04.4 _quiz_edit_questions (#questions_tab)

| **요소** | **id / class** | **조건** | **동작** |
|---|---|---|---|
| Show Question Details | `#show_question_details` (checkbox) | `active_quiz_questions.size <= QUIZ_QUESTIONS_DETAIL_LIMIT (25)` 면 활성. 초과 시 disabled + 안내 `#question-detail-disabled` "NOTE: Question details not available when more than 25." | 체크 시 문항 본문/선택지 인라인 표시 |
| 문항 리스트 (#questions) | 루트 엔트리(`@quiz.root_entries`) 별 그룹/문항 렌더 | 항상 | 그룹은 `_question_group`, 단일 문항은 `_display_question` 또는 `_question_teaser` (25개 초과 시) |
| New Question | `.add_question_link` | content_lock & points_lock 아닐 때 | 인라인 문항 작성 영역 |
| New Question Group | `.add_question_group_link` | 위와 동일 | 그룹 카드 추가 |
| Find Questions | `.find_question_link` | `feature(:question_banks) && :read_question_banks` | 문제 은행 모달 (S-09 참조) |

#### 지원 문항 유형 (Classic)

1. Multiple Choice (multiple_choice_question)
2. True/False (true_false_question)
3. Fill in the Blank (short_answer_question)
4. Fill in Multiple Blanks (fill_in_multiple_blanks_question) — `[blank_name]` 자리표시
5. Multiple Answers (multiple_answers_question)
6. Multiple Dropdowns (multiple_dropdowns_question) — `[dropdown_name]` 자리표시
7. Matching (matching_question)
8. Numerical Answer (numerical_question)
9. Formula Question / Calculated (calculated_question)
10. Missing Word (missing_word_question)
11. Essay (essay_question)
12. File Upload (file_upload_question)
13. Text (no question) (text_only_question)

문항별 옵션 (form_question/form_answer partial 기반):
- 문항 제목, 본문(RCE), 배점, 정답 1+
- 정답별 코멘트(Answer Comment), 오답별 코멘트, 일반 코멘트(General Comment) — 모두 RCE
- 객관식: 정답 표시 (단일 또는 복수)
- Matching: 좌-우 페어 + 함정 답(Distractors)
- Numerical: 정확값, 허용 범위, 정밀도
- Calculated: 변수 정의, 공식, 소수점 자릿수, 답 생성

#### 문항 그룹 (_question_group)

| **요소** | **동작** |
|---|---|
| 그룹 이동 핸들 (move_handle) | drag&drop |
| 그룹명 (`quiz_group[name]`) | text |
| Pick (`quiz_group[pick_count]`) + Points per question (`quiz_group[question_points]`) | 그룹 안 N개 무작위 추출, 동일 배점 |
| Link to a Question Bank (`.find_bank_link`) | 그룹을 문제 은행에 연결 (Find Bank 모달) — 그룹 본문에 문항을 넣지 않고 은행에서 추출 |
| Collapse/Expand 토글 | `.collapse_link` `.expand_link` |
| Add Question to this Group | `.add_question_link` |
| Edit Group Details | `.edit_group_link` |
| Delete Group | `.delete_group_link` (points 잠금 시 숨김) |
| insufficient_count_warning | pick > available 일 때 "This question group is set to pick more questions than are available." |
| Cancel / Update 버튼 | 그룹 편집 모드 |

#### Find Questions / Find Bank / Add Question Group (모달, _find_question_from_bank)

| **다이얼로그** | **id** | **요소** |
|---|---|---|
| 문제 찾기 | `#find_question_dialog` | 좌측 은행 목록 (`.bank_list`) + 우측 문항 체크리스트. "Select All" / "Clear All". 그룹 선택 select (`#quiz_group_select`) — `[ No Group ]` 또는 `[ Create Group ]`. "Add Questions" / Cancel |
| 외부 코스 은행 보기 링크 | `.find_question_banks_url` (View Course Question Banks) | |
| 은행 선택 | `#find_bank_dialog` | "Select a question bank from the list below to link it to the this quiz as a question group." + Select Bank / Cancel |
| 새 그룹 생성 (모달) | `#add_question_group_dialog` | Group Name, Pick (questions), Points per question — 셋 다 required, 검증 메시지 인라인. Create Group / Cancel |

### S-04.5 _quiz_edit_form_actions

| **요소** | **표시 조건** | **동작** |
|---|---|---|
| Notify users this quiz has changed (`quiz[notify_of_update]`) | 항상 | 저장과 함께 대상 학생에 알림 |
| Cancel (`#cancel_button`) | 항상 | `params[:return_to]` 또는 quiz show 로 이동. 확인 모달 없음 |
| Save & Publish (`.save_and_publish`) | `!@quiz.published && !horizon_course?` | submit + 공개 |
| Save (`.save_quiz_button`) | 항상 | submit (게시 상태 유지) |

### S-04.6 응시 시작 후 편집 동작

| **장치** | **동작** |
|---|---|
| `#student_submissions_warning` 배너 | "Students have either already taken or started taking this quiz, so be careful about editing it. If you change any quiz questions in a significant way, you may want to consider regrading students who took the old version of the quiz." |
| Regrade 옵션 | 문항 정답 변경 시 별도 regrade 정책 선택 (Regrade only those students who answered the changed answer / Regrade all students / Give everyone full credit / Update without regrading). 소스: `ui/features/quizzes/jst/regrade.handlebars` |
| 폼 잠금 | 없음. 필드는 그대로 편집 가능 |

### S-04.7 Master Course 잠금 매트릭스

| **잠금 종류** | **JS env 키** | **영향** |
|---|---|---|
| `restricted_by_master_course` | 보호 모드 ON | 일부 메뉴 비활성 |
| `master_course_restrictions.content` | content lock | 제목/설명/문항 추가 영역 readonly. Delete 메뉴 비활성. add_question 영역 숨김 |
| `master_course_restrictions.points` | points lock | 문항 점수, 그룹 pick/points 입력 readonly. add_question 영역 숨김 |
| `master_course_restrictions.due_dates` | due dates lock | Overrides 카드 readonly |

### S-04.8 IP Filter 다이얼로그 (`#ip_filters_dialog`)

| **요소** | **내용** |
|---|---|
| 헤더 | "What are Quiz IP Filters?" |
| 본문 | "Quiz IP filters are a way to limit access to quizzes to computers in a specified IP range. Filters can be a comma-separated list of addresses, or an address followed by a mask ("192.168.217.1", "192.168.217.1/24" or "192.168.217.1/255.255.255.0")." |
| 로딩 메시지 | "Retrieving Filters..." |
| 결과 테이블 | 계정 단위 등록된 IP filter 목록. 행 클릭 시 `quiz_ip_filter` input 에 자동 입력 |

### S-04.9 Mastery Paths 탭

조건부 콘텐츠 해제(Conditional Release) 가 활성화된 계정에서만 탭 노출. `#mastery-paths-editor` mount point. 점수 구간별 추천 콘텐츠 규칙 편집. 본 분석에서는 존재만 기록.

### S-04.10 Edge case

| **시나리오** | **동작** |
|---|---|
| Time limit 0 입력 | unlimited 와 동일 처리 |
| Show Correct Answers at > Hide Correct Answers at | 서버 검증 오류 |
| 동일 학생이 두 override 카드에 포함 | 서버 검증 오류 (클라 사전 차단 없음) |
| `editing_restricted?(:any)` Master Course 자식 | 제목/설명/문항 본문 readonly + Delete 비활성 |
| `horizon_course?` | Save & Publish 노출 안 됨 (Horizon은 별도 정책) |

---

## S-05. 채점 대시보드 (Quiz Submissions + Moderate + SpeedGrader)

Canvas 는 한 화면 단위가 아니라 다음 셋을 결합해 "채점 대시보드" 역할을 한다.

- `/courses/:course_id/quizzes/:id` 의 "Show Student Quiz Results" 패널 (응시자 점수 요약)
- `/courses/:course_id/quizzes/:id/moderate` (Moderate Quiz, 시간/시도 연장)
- `/courses/:course_id/gradebook/speed_grader?assignment_id=...` (학생별 채점)

### S-05.1 Show Student Quiz Results 패널

S-03 의 ⋮ Manage 메뉴 항목 클릭 시 노출. 다음 정보 표시.

| **요소** | **내용** |
|---|---|
| 미채점 경고 아이콘 (`icon-warning`) | `@any_submissions_pending_review` |
| 라벨 | "Show Student Quiz Results" (survey 면 "Show Student Survey Results") |
| 부제 | "(N students submitted so far)" |
| 노출 영역 | `#quiz_details_wrapper` (data-submitted-count) — React 컴포넌트가 마운트 |

### S-05.2 Moderate Quiz (`/quizzes/:id/moderate`)

소스: `app/views/quizzes/quizzes/moderate.html.erb`. 권한: `can_manage`.

#### 페이지 헤더

| **요소** | **id** | **노출 조건** |
|---|---|---|
| Outstanding Submissions 경고 | `#outstanding_quiz_submissions_found` | autosubmit 미처리 응시 존재 시 노출 |
| Check on outstanding quiz submissions 링크 | `#check_outstanding` | 클릭 시 `#autosubmit_form` 모달 |
| 페이지 제목 | h1 "Moderate Quiz" | 항상 |

#### 검색

| **필드** | **동작** |
|---|---|
| Search People (input `search_term`) | 학생명 클라이언트 사이드 필터 |
| Filter 버튼 | submit |

#### 학생 테이블 (`#students`)

| **컬럼** | **표시 내용** |
|---|---|
| `[ ]` Select/Deselect All (`#check_all`) | 행 선택 체크박스 |
| Student | "{student.last_name_first} gets N extra minutes on each attempt" (extra_time > 0 일 때 강조). 클릭 시 history 화면으로 이동 |
| Attempt | 응시 번호 |
| Time | "finished in {duration}" / "in progress" / "--" (overdue) |
| Attempts Left | 남은 응시 횟수 (allowed_attempts 무제한이면 숨김) |
| Score | `kept_score` |
| Manually Unlocked | `icon-unlock` (manually_unlocked 일 때) |
| Reload Table | 헤더에 reload 아이콘 (`.reload_link`) |
| Edit | `.moderate_student_link` (개별 조정 다이얼로그) |
| Add Time (개별 행) | `.extend_time_link` (개별 시간 추가) |

행 클래스 분기: `.extendable` (시간 연장 가능), `.in_progress` (untaken), `.manually_unlocked`

#### Change Extensions for N Selected Students

| **링크** | **표시 조건** |
|---|---|
| `.moderate_multiple_link` ("Change Extensions for {N} Selected Students") | 행 1개 이상 선택 시 |

#### Extend Time 다이얼로그 (`#extend_time_dialog`)

| **요소** | **내용** |
|---|---|
| 안내 | "You can give this student extra time on their current quiz attempt. How much time would you like to give them?" |
| Started / Ending 표시 | 응시 시작/현재 종료 시각 |
| End the quiz: [input] minutes from [select: now / the current end time] | 시간 연장 입력 |
| 주의 | "Maximum of 1440 minutes (24 hours)" |
| 버튼 | Cancel / Extend Time |

#### Student Extensions 다이얼로그 (`#moderate_student_dialog`)

| **필드** | **노출 조건** | **내용** |
|---|---|---|
| Extra Attempts (`extension_extra_attempts`) | `allowed_attempts > 0` | "Extra Attempts — everyone already gets N" + 숫자 입력 + "attempts" 단위 |
| Extra time on every attempt (`extension_extra_time`) | `time_limit` 설정 | "everyone already gets N minutes" + 숫자 입력 + "minutes" 단위 |
| cutoff_warning | time_limit 있을 때 | "Quiz attempts whose availability dates have passed will still auto-submit even if the extended time has not expired." |
| reset_has_seen_results (`extension_reset_has_seen_results`) | `quiz.one_time_results` | "Let the student see the results one more time" |
| manually_unlocked (`extension_manually_unlocked`) | 항상 | "Manually unlock the quiz for the next attempt" |
| 버튼 | 항상 | Cancel / Save |

#### Autosubmit 다이얼로그 (`#autosubmit_form`)

| **요소** | **내용** |
|---|---|
| 설명 | "These quiz submissions are outstanding, likely because a student left the quiz page prior to submission. If you would like to grade them, please press 'Submit' below." |
| 학생 체크리스트 | `.outstanding_submissions_list` |
| 버튼 | Cancel / Submit (`data-text-while-loading="Submitting..."`) |

### S-05.3 SpeedGrader (Quiz 응시 채점)

소스: `ui/features/speed_grader/`. 한 학생씩 채점하는 별도 SPA.

#### 진입

| **경로** | **조건** |
|---|---|
| `/courses/:course_id/gradebook/speed_grader?assignment_id=:assignment_id` | `(:grade 또는 :review_grades) && available? && published && can_view_speed_grader?` |
| 진입 트리거 | S-01 카드 메뉴, S-03 ⋮ Manage / 우측 사이드바, Moderate 화면 외부 |

#### 주요 영역 (Quiz 응시 채점 모드)

| **영역** | **요소** |
|---|---|
| 상단 헤더 | Gradebook 로고/홈 링크, 과제명, "Help" 링크, "Settings" 기어 (Options 모달), "Mute/Unmute" 토글, "Keyboard Shortcuts" 도움말, 코멘트 라이브러리 토글 |
| 학생 네비게이션 | "이전 학생" 화살표, 학생 선택 드롭다운 (이름/상태 표시), "다음 학생" 화살표. 익명 채점이면 익명화 |
| 좌측 (응시 본문) | 학생이 제출한 답안 (history.html.erb 기반 partial) — 문항별 답안, 정답/오답 색상 표시, 점수 input, 미채점 ⚠ 아이콘 |
| Grade By Question 모드 | 사용자 설정 `enable_speedgrader_grade_by_question` ON 일 때, 한 문항씩 학생을 넘기는 모드 활성. 상단 quiz-nav 좌우 화살표로 문항 번호 점프 |
| Quiz Group 경고 | 그룹 무작위 출제 + Grade by Question 모드 동시 사용 시 ".grade-by-question-warning" 패널 "The grade by question feature is affected by questions that are shuffled in a group." |
| 우측 사이드바 — 학생 영역 | 학생 사진/아바타, 이름 (anonymous 면 "Student"), 제출 시각, 응시 횟수, 채점 상태 라벨 (Submitted / Graded / Late / Excused 등) |
| 우측 사이드바 — 점수 영역 | 총점 input (text, points_possible 와 함께 표시), Excused 토글, Late 페널티 표시, 자동 채점 점수 / 수동 조정 점수 |
| 우측 사이드바 — 코멘트 영역 | 텍스트 코멘트 (textarea + 전송), 음성 메모 (Media Comment), 파일 첨부, 코멘트 라이브러리 (저장된 템플릿 선택) |
| 우측 사이드바 — Submission List | 시도별 점수 ("Attempt N: 점수") + 미채점 ⚠ 또는 ⏳ 아이콘 |
| Assessment Audit Tray | `additional_speedgrader_audit_logging` 활성 시 별도 트레이 (변경 로그) |
| Post Policies (점수 공개) | "Post Grades" 버튼 (Manual posting policy 일 때) — 학생에게 점수 공개 |
| 결과 업데이트 | "Update Scores" 로 점수/코멘트 저장 → 학생의 history.html.erb 데이터 갱신 |
| 사이드바 lock 아이콘 | 응시 잠금 상태 표시 |
| Rubric (있을 때) | "View Rubric" / "Show Rubric" → 루브릭 채점 UI |
| 키보드 단축키 | J / K (학생 이동), Ctrl+M (코멘트 포커스) 등 (도움말 모달에 명시) |

#### Quiz History 화면 (SpeedGrader 외부 진입)

`/courses/:course_id/quizzes/:id/history?quiz_submission_id=...` 직접 진입 (소스: `history.html.erb`).

| **영역** | **내용** |
|---|---|
| 페이지 타이틀 | "{user}'s Quiz History" (anonymous_survey 면 "Student") |
| Grade By Question 상단 nav | `enable_speedgrader_grade_by_question` 일 때만. 좌우 화살표 + 문항 번호 점프 |
| 우측 사이드바 (headless 아닐 때) | 안내 "Here's the latest quiz results for {user}. You can modify the points for any question and add more comments, then click "Update Scores" at the bottom of the page." |
| Quiz Submissions 리스트 (`#quiz_versions`) | 시도별 점수 + 미채점 시 ⚠ 아이콘 + pending review 일 때 `icon-hour-glass` |
| Allow extra attempt 폼 | `add_attempts` 권한 + attempts_left ≤ 0 | "{user} has no attempts left" + "Allow this student an extra attempt" 버튼 |
| 남은 시도 표시 | "{user} has N attempts left" 또는 "This quiz has unlimited attempts" |
| Back to Quiz 링크 | 항상 |
| View Log | `feature(:quiz_log_auditing) && :view_log` (`/quiz_submission_events`) |
| 본문 | `_quiz_submission` partial — 문항별 답안 + 점수 input + 코멘트 + 검토 필요 문항 점프 |
| Update Scores 버튼 (form) | submit 시 PUT `/quizzes/:id/quiz_submissions/:submission_id?override_scores=true` |

### S-05.4 Message Students Who...

S-03 ⋮ Manage 메뉴에서 진입. 조건: `:grade && :send_messages && available? && !anonymous_submissions? && graded?`. 모달 형태로 응시 여부/점수 기준으로 학생군에 메시지 발송.

### S-05.5 Edge case

| **시나리오** | **동작** |
|---|---|
| 마감 후에도 시간 연장 | "Quiz attempts whose availability dates have passed will still auto-submit even if the extended time has not expired." 경고 |
| anonymous_submissions 일 때 | Student 컬럼이 "Student 1, Student 2, ..." 로 익명화. Message Students Who 비활성 |
| 학생이 응시 중일 때 시도 추가 | `extendable` 상태로 행 강조 |
| Outstanding (학생이 페이지 떠나 자동 저장 안 됨) | 상단 알림 + Autosubmit 다이얼로그에서 일괄 처리 가능 |

---

## S-06. 통계/분석 (`/courses/:course_id/quizzes/:id/statistics`)

소스: `app/views/quizzes/quizzes/statistics_cqs.html.erb` + `ui/features/quiz_statistics/`.

### S-06.1 진입

| **경로** | **조건** |
|---|---|
| `/courses/:course_id/quizzes/:id/statistics` | `:update && :manage && @submitted_student_count > 0` (또는 review_grades) |
| 트리거 | S-03 우측 사이드바 "Quiz Statistics" |

### S-06.2 페이지 구조

```
#canvas-quiz-statistics
├── ScreenReaderContent h1 "Quiz Statistics"
├── section: Summary
│   ├── header
│   │   ├── h2 "Quiz Summary" + Spinner (loading 시)
│   │   └── pull-right: SectionSelect + Report 버튼 (Item Analysis / Student Analysis)
│   ├── table (5 컬럼)
│   │   ├── Average Score (icon: IconQuizStatsAvgLine, 강조)
│   │   ├── High Score
│   │   ├── Low Score
│   │   ├── Standard Deviation
│   │   └── Average Time (HH:MM:SS)
│   └── ScorePercentileChart (점수 분포 막대 그래프)
└── section #question-statistics-section
    ├── header h2 "Question Breakdown"
    └── 문항별 통계 카드 (유형별 Renderer)
```

### S-06.3 Summary 헤더

| **요소** | **내용 / 조건** |
|---|---|
| h2 "Quiz Summary" | 항상 |
| Spinner | `isLoading` true |
| Section Select | 학생 섹션 필터 (전체/특정 섹션) — `SectionSelect` 컴포넌트 |
| Generate / Download Report 버튼 (Item Analysis) | report.includesAllVersions === config.includesAllVersions. 미생성 시 "Item Analysis" 버튼(icon-analytics) → 생성 진행 상태 popup(Less than half-way to go / Almost done) → 생성 완료 시 "Download" 링크로 전환 |
| Generate / Download Report 버튼 (Student Analysis) | 동일 패턴 |
| Survey 일 때 | 버튼 disabled + tooltip "Report can not be generated for Survey Quizzes." |

### S-06.4 Summary 표 (NA 처리)

`isLoading` 또는 데이터 없음일 때 모든 셀에 "N/A" 표시.

| **컬럼** | **값** | **포맷** |
|---|---|---|
| Average Score | `scoreAverage / pointsPossible * 100` (반올림) | "X%" (강조 emphasized) |
| High Score | 최고 점수 비율 | "X%" |
| Low Score | 최저 점수 비율 | "X%" |
| Standard Deviation | `scoreStdev` | 소수 둘째 자리 |
| Average Time | `durationAverage` (초) → HH:MM:SS | secondsToTime |

### S-06.5 Score Percentile Chart

`/canvas-quiz-statistics` 내부에 막대 그래프. 점수 분포(scores)와 평균점 표시.

### S-06.6 Question Breakdown — 문항 유형별 렌더러

| **questionType** | **Renderer** | **표시 내용** |
|---|---|---|
| multiple_choice_question / true_false_question | MultipleChoiceRenderer | 선택지별 응답 비율 막대 + 정답률 도넛 + Discrimination Index |
| short_answer_question / multiple_answers_question / numerical_question | ShortAnswerRenderer | 답안별 빈도 + 정답률 |
| fill_in_multiple_blanks_question / multiple_dropdowns_question / matching_question | FillInMultipleBlanksRenderer | 빈칸/드롭다운별 응답 분포 |
| essay_question | EssayRenderer | 미채점/채점완료 수, 평균점, 답안 보기 링크 |
| calculated_question | CalculatedRenderer | 변수 분포 |
| file_upload_question | FileUploadRenderer | 제출 파일 수 + Submissions Zip 다운로드 링크 |
| 그 외 | 기본 QuestionRenderer | 텍스트만 |

#### 공통 문항 헤더

- 문항 번호, 문항 제목, 본문(HTML), 응시자 수(participantCount)
- 응답률 / 정답률
- Discrimination Index 도넛 (정답률에 따른 색)
- "Answered: N students" / "View these students" (응답자 클릭 시 user_list_dialog)

#### 빈 상태

| **조건** | **본문** |
|---|---|
| `isLoadingStatistics` | "Question statistics are being loaded. Please wait a while." |
| `questionStatistics.length === 0` | "There are no question statistics available." |
| `canBeLoaded` false (시스템 한계) | "Even awesomeness has limits. We can't render statistics for this quiz, but you can download the reports." + Report 다운로드 |

### S-06.7 보고서 종류 (CSV)

| **reportType** | **표시 라벨** | **생성 상태 라벨** |
|---|---|---|
| `student_analysis` | "Student Analysis" | "Generate student analysis report" / "Download student analysis report" / "Report has never been generated." / "Report is being generated." (< 50%) / "Less than half-way to go." (< 75%) / "Almost done." / "Generated: {date}" |
| `item_analysis` | "Item Analysis" | 위와 동일 패턴, 라벨만 item |

### S-06.8 Edge case

| **시나리오** | **동작** |
|---|---|
| Survey | 보고서 생성 불가 (`Report can not be generated for Survey Quizzes.`) |
| 응시자 0 | Question Breakdown 빈 상태. Summary 는 N/A |
| Section 필터 변경 | 데이터 재요청 |

---

## S-07. 학생 응시 (`/courses/:course_id/quizzes/:id/take` 외)

### S-07.1 진입 경로

| **경로** | **조건** | **동작** |
|---|---|---|
| `/quizzes/:id/take` (GET) | available? && submit 권한 && (unlimited 또는 attempts_left > 0) | 응시 가능 화면 (form action) |
| `POST /quizzes/:id/take` | 위 + 응시 시작 클릭 (link_to_take_or_retake_poll) | 새 attempt 생성 후 take 화면 |
| `/quizzes/:id/access_code` (GET) | `access_code` 설정된 퀴즈 | 코드 입력 화면 |
| `/quizzes/:id/take?preview=1` (POST) | 교수자 미리보기 | 학생 화면과 동일하되 결과는 preview submission |
| `/quizzes/:id/take_quiz_in_popup` | 일부 LDB 모드 | 팝업 응시 (별도 view) |
| `/quizzes/:id/refresh_quiz_after_popup` | LDB 종료 후 | 결과 화면 새로고침 |

### S-07.2 시작 전 — 상세(S-03)

학생은 응시 시작 전 S-03 상세를 본다. 상세에 노출되는 안내:
- Due, Points, Questions, Available dates, Time Limit, Allowed Attempts
- "Requires Respondus LockDown Browser" (LDB 사용 시)
- 잠금 사유 (마감 전, 마감 후, 응시 횟수 소진)
- "Take the Quiz / Take Quiz Again" 버튼

### S-07.3 Access Code 화면 (`access_code.html.erb`)

| **요소** | **내용** |
|---|---|
| 타이틀 | 퀴즈 제목 |
| 안내 | "This quiz is restricted by an access code. You'll need to ask your teacher or proctor to type in or tell you the access code in order to take the quiz." (survey 면 "This survey is restricted ...") |
| 입력 | password type + label "Access Code" |
| 버튼 | Submit (입력 전엔 disabled) |
| preview hidden | `params[:preview] && can_update` 일 때 preview=1 유지 |

### S-07.4 Invalid IP 화면 (`invalid_ip.html.erb`)

| **요소** | **내용** |
|---|---|
| 타이틀 | 퀴즈 제목 |
| 본문 | "This quiz is protected and is only available from certain locations. The computer you are currently using does not appear to be at a valid location for taking this quiz." (survey 면 survey 문구) |

### S-07.5 Take Quiz 화면 (`take_quiz.html.erb`)

#### 페이지 구조

```
header.quiz-header
├── h3.loading "Loading..."
├── h1 퀴즈 제목
├── (alert) "This is a preview of the published/draft version of the quiz" — 교수자 preview 시
├── "Started: {시작 시각}"
├── h2 "Quiz Instructions"
└── #quiz-instructions (user_content)
form#submit_quiz_form (POST 또는 PUT, @quiz_presenter.form_action)
├── hidden attempt, validation_token, preview
├── #quiz_urls (서버 동기화용 URL 메타데이터)
│   ├── backup_quiz_submission_url
│   ├── started_at / now / end_at / end_at_without_time_limit
│   ├── due_at / time_limit / timer_autosubmit_disabled / time_left
├── #questions (문항 본문 — _display_question 컬렉션)
├── 한 문항씩 모드 (one_question_at_a_time)
│   ├── Previous Question 버튼 (previous_question_viewable? 일 때)
│   └── Next Question 버튼 (next_question 존재 시) + hidden last_question_id
├── #times_up_dialog (display:none)
│   ├── "Time's Up!  Submitting results in"
│   ├── 카운트다운
│   └── "Ok, fine" 제출 버튼
└── form-actions
    ├── #last_saved_indicator ("Not saved" / "Saved at {time}")
    └── #submit_quiz_button "Submit Quiz"
form#deauthorized_dialog (hidden)
├── 타이틀 "Login Required"
└── "You have been logged out of canvas. To continue please log in"
```

#### Take Quiz 우측 사이드바 (`_take_quiz_right_side`)

| **블록** | **내용** | **조건** |
|---|---|---|
| Keep Editing This Quiz | preview 중 | 교수자 미리보기 |
| Questions 리스트 (`_question_list_right_side`) | 문항 번호 점프 링크 + 응답 여부 아이콘 | 항상. 한 문항씩 모드면 점프 비활성 |
| Score | 점수 | `@submission.finished_at` |
| Time Running / Time Elapsed | 남은 시간 또는 경과 시간 | time_limit ON 이면 Running, OFF 면 Elapsed |
| Hide Time 버튼 (`.hide_time_link`) | 시간 표시 숨기기 | 항상 |
| Attempt due | 마감일 | `@quiz.due_at` |

#### Question List 점프 사이드바 (`_question_list_right_side`)

| **요소** | **동작** |
|---|---|
| h3 "Questions" | 항상 |
| 문항 리스트 (#question_list) | 응답 여부 아이콘 + 문항명 + 마크 상태 |
| 한 문항씩 모드 + cant_go_back | 점프 비활성 (`read_only` 클래스) |
| 한 문항씩 모드 + 점프 가능 | 문항 path 로 이동 (form 재제출 + page=N) |
| 일반 모드 | 앵커 점프 (`#question_xxx`) |

#### 시간 안내 (screenreader)

`@quiz.time_limit` 있을 때 스크린리더 안내: "Note: this is a timed quiz. You may check the remaining time you have at any point while taking the quiz by pressing the keyboard combination SHIFT, ALT, and T..."

### S-07.6 자동 저장 / 자동 제출

| **메커니즘** | **동작** |
|---|---|
| Backup submission | `backup_quiz_submission_url` 로 주기적 POST. `#last_saved_indicator` 업데이트 |
| Times Up | 남은 시간 0 도달 시 `#times_up_dialog` 모달 + 자동 제출 카운트다운. `timer_autosubmit_disabled` 면 자동 제출 안 함 (수동 제출 대기) |
| Deauthorization | 세션 만료 시 `#deauthorized_dialog` 모달 |

### S-07.7 Cant Go Back 응시 시작 안내

`@quiz.cant_go_back?` 일 때 응시 시작 직전 모달 (`_cant_go_back_warning`):
- 타이틀 "Attention!"
- 본문 "Once you have submitted an answer, you will not be able to change it later. You will not be able to view the previous question."
- "Begin" 버튼 (POST 로 take_quiz_url 이동)

### S-07.8 결과 화면 (`/quizzes/:id/history`)

S-05.3 의 history 와 동일 화면이지만, 학생 본인이 진입하면 점수 input 이 readonly. 본문 (`_quiz_submission_results` → `_quiz_submission`):

| **표시 요소** | **조건** |
|---|---|
| `_muted` (점수 미공개 안내) | `posted?` 가 false 이고 `was_preview?` 도 false |
| 점수 ("Score for this attempt/survey/quiz: N out of M") | `results_visible?` |
| pending_review `*` + "Some questions not yet graded" | `pending_review?` |
| Show Correct Answers 차단 안내 | `show_correct_answers?` 가 false (`render_correct_answer_protection`) — 예: "Answers will be available from {date} to {date}" |
| 문항별 본문 + 학생 답안 + 정답 표시 (분기) | `results_visible?` |
| 코멘트 (교수자 작성) | 작성된 경우 |
| Attempt 선택 (사이드바) | `version_instances` 여러 개일 때 |

#### S-07.8.1 정답 공개 정책 매트릭스 (hide_results × show_correct_answers)

| **hide_results 값** | **show_correct_answers** | **결과 화면 동작** |
|---|---|---|
| (없음) = "never" 즉 always show | true | 점수, 학생 답안, 정답 모두 표시 |
| (없음) | false | 점수와 학생 답안만 표시, 정답 영역 숨김 |
| `until_after_last_attempt` | true | 마지막 시도 완료까지 결과 muted. 완료 후 정답 포함 결과 |
| `until_after_last_attempt` | false | 마지막 시도 후 결과 표시, 정답 숨김 |
| `always` (Let Students See ... 꺼짐) | n/a | 결과 화면 자체가 muted. "Your instructor has not made these results visible yet." |
| `one_time_results` | (별도) | 결과 1회만 조회 가능. 다시 진입 시 muted (Moderate 에서 `reset_has_seen_results` 로 재허용 가능) |

#### S-07.8.2 정답 공개 기간 (show_correct_answers_at / hide_correct_answers_at)

| **시점** | **표시** |
|---|---|
| now < `show_correct_answers_at` | 정답 영역 숨김 + 안내 "Answers will be available {date}" |
| `show_correct_answers_at` ≤ now ≤ `hide_correct_answers_at` | 정답 표시 |
| now > `hide_correct_answers_at` | 정답 영역 다시 숨김 + 안내 "Answers were available {start} to {end}" |
| 둘 다 빈 값 | 즉시/계속 공개 |

#### S-07.8.3 학생 결과 화면 본문 구성 (`_quiz_submission`)

- 상단 점수 박스 (".quiz_score") — 점수 + pending_review 표시
- "Time" — 응시 소요 시간
- "View Previous Attempts" 링크 (다중 시도일 때, 사이드바에서도 가능)
- 미채점 안내 + 검토 필요 문항 점프 목록
- 각 문항 본문 (display_question partial):
  - 문항 본문 (RCE 렌더링)
  - 학생 답안 영역 (정답이면 초록, 오답이면 빨강, 미응답이면 회색)
  - 정답 영역 (정책 충족 시) — "Correct Answer" 라벨
  - 정답/오답 코멘트 (있을 때)
  - 일반 코멘트
  - 교수자 코멘트 (수동 채점 시)
  - 부분 점수 (Fill in Multiple Blanks 등은 빈칸별 점수 표시)
- 결과 검토 후 "Back to Quiz" 링크

### S-07.9 Edge case

| **시나리오** | **동작** |
|---|---|
| 응시 가능 종료 (Until) 후 진입 | 401/403 + "Quiz is no longer available" |
| 응시 도중 시간 만료 + autosubmit 비활성 | 시간 표시는 멈추지만 수동 제출 가능 |
| 응시 도중 로그아웃 | `#deauthorized_dialog` 모달 노출, 재로그인 후 이어서 |
| Preview 모드 응시 결과 | 별도 submission (점수 영향 없음) |
| 마지막 시도 후 결과 공개 정책 (`until_after_last_attempt`) | 모든 시도 끝나기 전엔 결과 화면이 muted |
| `one_time_results` ON | 결과를 한 번만 본 후 다시는 못 봄 (Moderate 에서 reset_has_seen_results 로 재허용 가능) |
| LDB 미설치 | 응시 페이지 진입 차단 (`lockdown_browser_required.html.erb`) |

---

## S-08. 문제 은행 목록 (`/courses/:course_id/question_banks`)

소스: `app/views/question_banks/index.html.erb` + `_question_bank.html.erb`.

### S-08.1 진입

| **경로** | **조건** |
|---|---|
| `/courses/:course_id/question_banks` | S-01 헤더 ⋮ "Manage Question Banks" 또는 학생용 "View Question Banks", 편집 폼의 "View Course Question Banks" 링크 |
| `/users/:user_id/question_banks` | 사용자 메뉴에서 진입 (북마크된 은행) |
| `/accounts/:account_id/question_banks` | 계정 관리자 |

### S-08.2 페이지 타이틀

| **컨텍스트** | **타이틀** |
|---|---|
| Course | "Course Question Banks" |
| User | "User Question Banks" |
| Account | "Account Question Banks" |

### S-08.3 우측 사이드바

| **버튼** | **조건** |
|---|---|
| Add Question Bank (`.add_bank_link`) | 컨텍스트가 User 가 아니고 `:create` 권한 |
| View Bookmarked Banks (`.see_bookmarked_banks`) | 현재 컨텍스트 ≠ 현재 사용자 |

### S-08.4 은행 카드 (`_question_bank` partial)

```
.question_bank
├── .header
│   ├── .header_content > a.title (은행명 또는 "No Name") — 클릭 시 상세 이동
│   └── .links (호버 시 표시)
│       ├── Bookmark 버튼 (`.bookmark_bank_link`, icon-bookmark) — 미북마크 시
│       ├── Unbookmark 버튼 (icon-remove-bookmark) — 북마크된 경우
│       ├── Edit 버튼 (.edit_bank_link, icon-edit) — `manage_assignments_edit` && 같은 컨텍스트 && `:update`
│       └── Delete 버튼 (.delete_bank_link, icon-end) — `manage_assignments_delete` && `:delete`
└── .content (작은 글씨)
    ├── "N Questions" 또는 "No Questions" (assessment_questions.active.count)
    └── "Last Updated: {datetime}"
```

### S-08.5 새 은행 만들기 (인라인 폼)

| **요소** | **내용** |
|---|---|
| 폼 (`#edit_bank_form`) | hidden, Add 버튼 클릭 시 노출 |
| Bank Name (text) | `assessment_question_bank[title]` |

### S-08.6 Edge case

| **시나리오** | **동작** |
|---|---|
| 은행명 없음 | "No Name" 표시 |
| 권한 없는 은행 | Edit/Delete 버튼 숨김 |
| User 컨텍스트 | "Add Question Bank" 버튼 숨김, 북마크된 은행만 보임 |

---

## S-09. 문제 은행 상세 (`/courses/:course_id/question_banks/:id`)

소스: `app/views/question_banks/show.html.erb`.

### S-09.1 우측 사이드바 액션

| **버튼** | **조건** | **동작** |
|---|---|---|
| Add a Question (`.add_question_link`) | `assessment_questions.temp_record, :create` 권한 | 문항 작성 폼 인라인 추가 |
| Edit Bank Details (`.edit_bank_link`) | `:update` | 은행명 인라인 편집 모드 |
| Move Multiple Questions (`.move_questions_link`) | `:update` | 다중 문항 이동/복사 다이얼로그 |
| Delete Bank (`.delete_bank_link`) | `:delete` | 브라우저 confirm 후 DELETE |
| Bookmark this Bank (`.bookmark_bank_link`) | 미북마크 시 | POST bookmark |
| Already Bookmarked (disabled) | 이미 북마크된 경우 | 클릭 불가 |

### S-09.2 Aligned Outcomes 영역

| **요소** | **내용** |
|---|---|
| h2 "Aligned Outcomes" | 항상 |
| 정렬된 outcome 목록 | `short_description` + "mastery at X%" + 삭제 버튼 (`.delete_outcome_link`) |
| Align Outcome 버튼 (`.add_outcome_link`) | 항상 | `_find_outcome` partial 다이얼로그 |

### S-09.3 본문 헤더 (`.quiz-header`)

| **요소** | **내용** |
|---|---|
| h1 (displaying) | 은행명 |
| 인라인 편집 (editing) | "Bank Name" label + text input |
| 주의 문구 | "Remember, changes to question templates won't automatically update quizzes that are already using those questions." |
| Show Question Details (`#show_question_details`) | total_pages > 1 이면 자동 체크 + 안내 |

### S-09.4 문항 리스트 (#questions)

| **렌더링 분기** | **내용** |
|---|---|
| `total_pages <= 1` | `_display_question` collection (질문 본문/선택지 인라인) |
| `total_pages > 1` | `_question_teaser` collection (제목/유형만, 클릭 시 펼침) |
| 권한 없음 | `.uneditable` 클래스 추가 |
| 페이지네이션 | `#more_questions` "more questions" 링크 (data-current-page / data-total-pages) |

#### 각 문항 카드 (`_display_question` 편집 모드)

- 드래그 핸들 (순서 변경)
- 문항 제목 / 유형 배지
- 본문 (HTML)
- 선택지 + 정답 표시 (`show_correct_answers` 클래스)
- 정답/오답/일반 코멘트
- 배점
- 액션 (Edit, Move/Copy, Delete) — 호버 시

### S-09.5 Move/Copy 다이얼로그 (`#move_question_dialog`)

| **요소** | **내용** |
|---|---|
| 헤더 | "Move/Copy {question_name}" |
| 본문 | "Select the destination question bank for this question:" |
| 다중 선택 모드 | hidden `multiple_questions` |
| 은행 목록 (`.banks`) | 라디오. 첫 항목은 "[ New Question Bank ]" |
| Loading | "Loading banks..." |
| 새 은행명 입력 | `assessment_question_bank_name` (New Question Bank 선택 시 노출) |
| 복사 옵션 | "Keep a copy in this question bank as well" (`copy=1`, 기본 체크) |
| 버튼 | Cancel / Move/Copy Question |

### S-09.6 Add Question / Edit Question (form_question, form_answer)

소스: `_form_question.html.erb` (290줄). 인라인 폼 (`#question_form_template`, class `.question_form`).

#### 폼 헤더 (.header)

| **요소** | **name / class** | **동작** |
|---|---|---|
| 문항명 입력 | `question_name` (text, width 120px) | 문항 식별용 짧은 제목 |
| regrade hidden | `regrade_disabled` | 정답 변경 시 채점 정책 전달 |
| 문항 유형 select | `question_type` (.question_type) | 13개 옵션 (S-09.6.1 참조) |
| 배점 input | `question_points` (`.float_value`, width 25px) | 소수점 허용. points_lock 일 때 readonly. 검증 메시지 `#question_points_message` |

#### S-09.6.1 문항 유형 옵션 (영문 원문 + 한국어)

| **value** | **영문 라벨** | **한국어 번역** |
|---|---|---|
| multiple_choice_question | Multiple Choice | 객관식 (단일 정답) |
| true_false_question | True/False | 참/거짓 |
| short_answer_question | Fill In the Blank | 단답형 (한 칸) |
| fill_in_multiple_blanks_question | Fill In Multiple Blanks | 단답형 (복수) |
| multiple_answers_question | Multiple Answers | 객관식 (복수 정답) |
| multiple_dropdowns_question | Multiple Dropdowns | 드롭다운 (복수) |
| matching_question | Matching | 짝짓기 |
| numerical_question | Numerical Answer | 수치형 |
| calculated_question | Formula Question | 공식 문항 |
| missing_word_question | Missing Word | 빈칸 단어 |
| essay_question | Essay Question | 서술형 |
| file_upload_question | File Upload Question | 파일 업로드 |
| text_only_question | Text (no question) | 텍스트 (문항 아님) |

#### S-09.6.2 유형별 설명 텍스트 (.subheader.explanation)

설명 텍스트는 두 셋트가 있다. survey/ungraded 용은 "correct" 단어를 뺀 버전, 일반 graded 용은 정답 표시 포함.

| **유형** | **설명 (graded 기준)** |
|---|---|
| Multiple Choice | "Enter your question and multiple answers, then select the one correct answer." |
| True/False | "Enter your question text, then select if True or False is the correct answer." |
| Fill In the Blank | "Enter your question text, then define all possible correct answers for the blank. Students will see the question followed by a small text box to type their answer." |
| Fill In Multiple Blanks | "Enter your question, specifying where each blank should go. Then define the possible correct answer for each blank. Students must type correct answers into text boxes at each blank." |
| Multiple Answers | "This question will show a checkbox next to each answer, and the student must select ALL the answers you mark as correct." |
| Multiple Dropdowns | "Enter your question, specifying where each dropdown should go. Then define possible answers for each dropdown, with one correct answer per dropdown." |
| Matching | "Build pairs of matching values. Students will see values on the left and have to select the matching value on the right from a dropdown. Multiple rows can have the same answer, and you can add additional distractors to the right side." |
| Numerical | "Define the correct answer as any number within a range, or a number plus or minus some error margin. Student will be given an empty text box to type their numerical answer." |
| Calculated (Formula) | "Enter your question, build a formula, and generate a set of possible answer combinations. Students will see the question with a randomly selected set of variables filled in and have to type the correct numerical answer." |
| Missing Word | "Define text to go before and after the dropdown. Build a set of possible answers and select one correct answer." |
| Essay | "Students will be given a text field to compose their answer." |
| File Upload | "Students will be able to upload a file for their answer." |
| Text (no question) | (안내 텍스트 없음, 단순 본문만) |

#### S-09.6.3 폼 본문 (.text)

| **요소** | **내용** |
|---|---|
| 문항 본문 (RCE) | TinyMCE 로 변환되는 textarea. HTML 입력 지원 |
| 빈칸 자리표시 안내 | Fill In Multiple Blanks / Multiple Dropdowns 는 본문에 `[blank_name]` / `[dropdown_name]` 형식 자리표시 필요 |
| 선택지/답 영역 (`_form_answer` 컬렉션) | 유형별 동적 |
| Numerical 답안 유형 | exact (정확값 + 허용 오차), range (범위), precision (정밀도) |
| Calculated 변수 영역 | 변수명, min, max, decimals + "Generate possible solutions" 버튼 |
| 정답 코멘트 / 오답 코멘트 / 일반 코멘트 | 모두 RCE textarea |
| Show one question at a time 미리보기 알림 | 일부 유형 |
| 저장 / 취소 버튼 | "Update Question" / "Cancel" |

### S-09.7 Equations Help (수식 입력 도움말)

### S-09.7 Equations Help (수식 입력 도움말)

`_equations_help` partial 이 페이지 하단에 포함되어 LaTeX/MathJax 입력 도움말 모달을 제공.

### S-09.8 Edge case

| **시나리오** | **동작** |
|---|---|
| 빈 은행 | "No Questions" |
| 25개 초과 | 자동 페이지네이션 (페이지당 50문항). Show Question Details 기본 OFF |
| Master Course 잠금 | 편집 불가 (`.uneditable`) |
| Aligned Outcome 삭제 | 인라인 삭제. Outcome 카드 자체는 그대로 |

---

## 부록 A. 공통 모달/위젯 정리

| **다이얼로그 id / 마운트** | **사용 화면** | **용도** |
|---|---|---|
| `#direct-share-mount-point` | S-01, S-03 | Send to / Copy to (React) |
| `#assign-to-mount-point` | S-01, S-03, S-04 | Assign To 트레이 |
| `#quiz-modal-mount-point` | S-01 | 일괄 공개 등 React 모달 |
| `#find_question_dialog` | S-04 | 문제 찾기 |
| `#find_bank_dialog` | S-04 | 문제 그룹용 은행 연결 |
| `#add_question_group_dialog` | S-04 | 새 그룹 생성 |
| `#ip_filters_dialog` | S-04 | IP filter 도움말 |
| `#move_question_dialog` | S-09 | 문항 이동/복사 |
| `#extend_time_dialog` | S-05 | 응시 시간 연장 |
| `#moderate_student_dialog` | S-05 | 학생 시도/시간 추가 |
| `#autosubmit_form` | S-05 | outstanding 일괄 처리 |
| `#times_up_dialog` | S-07 | 시간 만료 자동 제출 |
| `#deauthorized_dialog` | S-07 | 세션 만료 |
| `#js-sequential-warning-dialogue` | S-07 (cant_go_back) | 잠금 모드 시작 경고 |
| `#unlock_for_how_long_dialog` | S-03 | "Let Students Take Now" |

## 부록 B. 권한 매트릭스 요약

| **사용자** | **S-01** | **S-03** | **S-04 (편집)** | **S-05 (Moderate)** | **S-06 (통계)** | **S-07 (응시)** | **S-08/S-09** |
|---|---|---|---|---|---|---|---|
| 교수자 (manage) | 전체 | 전체 액션 + 사이드바 | 가능 | 가능 | 가능 (응시 1+ 시) | preview 만 | 가능 |
| 조교 (review_grades, !grade) | 학생용 + bank 보기 | See Full Quiz + Statistics | 불가 | 불가 | 가능 | 불가 | 조회만 |
| 학생 | 학생 카드 + bank 보기 | _quiz_show_student + sidebar | 403 | 불가 | 불가 | 가능 (조건 충족 시) | bank 조회만 (권한 있을 때) |
| 비로그인 | "Only registered, enrolled users..." | 일부만 | 불가 | 불가 | 불가 | 불가 | 불가 |

## 부록 C. 핵심 안내 문구 모음 (영문 원문)

본 절은 한국어 번역의 출처를 빠르게 찾기 위한 영문 원문 모음.

- "Students have either already taken or started taking this quiz, so be careful about editing it. If you change any quiz questions in a significant way, you may want to consider regrading students who took the old version of the quiz."
- "This quiz has been regraded; your score was affected." / "This quiz has been regraded; your score was not affected." / "This quiz has been regraded; your new score reflects N questions that were affected."
- "Once you have submitted an answer, you will not be able to change it later. You will not be able to view the previous question."
- "This quiz is restricted by an access code. You'll need to ask your teacher or proctor to type in or tell you the access code in order to take the quiz."
- "This quiz is protected and is only available from certain locations. The computer you are currently using does not appear to be at a valid location for taking this quiz."
- "Note: this is a timed quiz. You may check the remaining time you have at any point while taking the quiz by pressing the keyboard combination SHIFT, ALT, and T..."
- "Quiz attempts whose availability dates have passed will still auto-submit even if the extended time has not expired."
- "Maximum of 1440 minutes (24 hours)"
- "These quiz submissions are outstanding, likely because a student left the quiz page prior to submission. If you would like to grade them, please press 'Submit' below."
- "Quiz IP filters are a way to limit access to quizzes to computers in a specified IP range. Filters can be a comma-separated list of addresses, or an address followed by a mask ("192.168.217.1", "192.168.217.1/24" or "192.168.217.1/255.255.255.0")."
- "Remember, changes to question templates won't automatically update quizzes that are already using those questions."
- "NOTE: Question details not available when more than 25." (실제 limit 은 `QUIZ_QUESTIONS_DETAIL_LIMIT` 상수)
- "Report can not be generated for Survey Quizzes."
- "Even awesomeness has limits. We can't render statistics for this quiz, but you can download the reports."
- "Students will automatically receive full credit once they take the survey"
- "Some questions not yet graded"
- "Manually unlock the quiz for the next attempt"
- "Let the student see the results one more time"

---

## 참고 소스 파일 (Canvas LMS master)

본 분석에서 직접 본 핵심 경로:

- `app/views/quizzes/quizzes/index.html.erb` (목록 컨테이너, IndexView 마운트)
- `app/views/quizzes/quizzes/show.html.erb` (퀴즈 상세, 434줄)
- `app/views/quizzes/quizzes/_quiz_show_teacher.html.erb` (교수자 본문)
- `app/views/quizzes/quizzes/_quiz_show_student.html.erb` (학생 본문)
- `app/views/quizzes/quizzes/_quiz_details.html.erb` (학생용 상세 메타)
- `app/views/quizzes/quizzes/_quiz_right_side.html.erb` (학생 사이드바)
- `app/views/quizzes/quizzes/_quiz_submission_results.html.erb` / `_quiz_submission.html.erb` (결과 본문)
- `app/views/quizzes/quizzes/_cant_go_back_warning.html.erb` (잠금 모드 안내)
- `app/views/quizzes/quizzes/new.html.erb` (생성/편집 컨테이너)
- `app/views/quizzes/quizzes/_quiz_edit.erb` (편집 폼 래퍼)
- `app/views/quizzes/quizzes/_quiz_edit_header.erb` (편집 폼 헤더)
- `app/views/quizzes/quizzes/_quiz_edit_details.erb` (Details 탭, 398줄)
- `app/views/quizzes/quizzes/_quiz_edit_questions.erb` (Questions 탭)
- `app/views/quizzes/quizzes/_quiz_edit_form_actions.erb` (Save/Cancel)
- `app/views/quizzes/quizzes/_question_group.html.erb` (문항 그룹)
- `app/views/quizzes/quizzes/_find_question_from_bank.html.erb` (문제 찾기 모달)
- `app/views/quizzes/quizzes/take_quiz.html.erb` (응시 본문, 143줄)
- `app/views/quizzes/quizzes/_take_quiz_right_side.html.erb` (응시 사이드바)
- `app/views/quizzes/quizzes/_question_list_right_side.html.erb` (응시 문항 점프)
- `app/views/quizzes/quizzes/access_code.html.erb` (코드 입력)
- `app/views/quizzes/quizzes/invalid_ip.html.erb` (IP 차단)
- `app/views/quizzes/quizzes/history.html.erb` (응시 이력/결과, 189줄)
- `app/views/quizzes/quizzes/moderate.html.erb` (Moderate Quiz, 264줄)
- `app/views/quizzes/quizzes/statistics_cqs.html.erb` (통계 컨테이너)
- `app/views/question_banks/index.html.erb` (은행 목록)
- `app/views/question_banks/show.html.erb` (은행 상세, 154줄)
- `app/views/question_banks/_question_bank.html.erb` (은행 카드)
- `ui/features/quizzes_index/jst/IndexView.handlebars` (목록 헤더 템플릿)
- `ui/features/quizzes_index/jst/QuizItemView.handlebars` (카드 템플릿, 301줄)
- `ui/features/quizzes_index/backbone/views/IndexView.jsx`
- `ui/features/quiz_statistics/react/components/app.jsx` (통계 SPA 루트)
- `ui/features/quiz_statistics/react/components/summary/index.tsx` (Summary)
- `ui/features/quiz_statistics/react/components/summary/report.jsx` (보고서 생성/다운로드)
- `ui/features/quiz_statistics/backbone/models/quiz_report_descriptor.js` (보고서 라벨)
- `ui/features/quizzes/jst/regrade.handlebars` (재채점 정책 선택)
- `ui/features/speed_grader/jquery/speed_grader.tsx` (SpeedGrader 본체)
- `app/controllers/quizzes/quizzes_controller.rb` (라우팅/권한)
- `app/controllers/quizzes/quiz_submissions_controller.rb`
- `app/controllers/quizzes/quiz_statistics_controller.rb`
- `app/controllers/quizzes/quiz_extensions_controller.rb` (시간/시도 연장)
- `app/controllers/question_banks_controller.rb`
