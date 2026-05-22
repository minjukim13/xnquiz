# S-04. 퀴즈 편집 - Canvas / LMS / xnquiz 비교

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
|---|---|---|
| Canvas | `/courses/:course_id/quizzes/:id/edit` | `can_update` (`manage_assignments_edit`). Master Course 자식이면 `editing_restricted?` 매트릭스 적용 |
| LMS (LearningX) | Canvas 와 동일 + custom.js delta | (동일) |
| xnquiz | `/quiz/:id/edit` | INSTRUCTOR only (학생 진입 시 `/` 리다이렉트) |

화면 한줄 요약:
- Canvas: `_quiz_edit.erb` + 7개 partial. 응시 시작 경고 배너 → 헤더 (`_quiz_edit_header`) → 탭 3개 (Details / Questions / Mastery Paths) → form-actions. S-02 와 본체 동일이지만 응시자 있을 때 regrade 정책 / Master Course 잠금 매트릭스가 추가됨.
- LMS: Canvas 표준 + 2종 custom 영향 (`custom.quiz-details-guide.example.js` 안내 박스 + `custom.quiz-rescore.example.js` 문제 유형 라벨/단답형 강제 재채점 버튼).
- xnquiz: S-02 와 거의 동일 구조 + 차이점 6가지 (제목 "퀴즈 편집" / 임시저장 버튼 draft 일 때만 / "문제지 인쇄" 추가 / 정답 변경 시 "재채점 예정" 배지 / `RegradeOptionsModal` / 비공개 토글 draft 시 disabled).

## 2. 기능 매트릭스 (핵심)

### 2-1. 진입 / 권한 / 잠금

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| URL 직접 진입 권한 검증 | O (서버 검증, 403) | O | O (차이: 클라이언트 가드 `/` 리다이렉트) | - |
| 폼 초기값 (저장된 값) | O | O | O | - |
| 응시 시작 경고 배너 (`#student_submissions_warning`) | O ("Students have either already taken or started taking this quiz...") | O | - → 문항 모달 안 호박 안내로 대체 | xnquiz: "이 문항은 이미 {N}명이 응시했습니다. 수정 시 기존 제출 답안과 채점 결과에 영향을 줄 수 있습니다." |
| Master Course 자식 - content lock | O (`restricted_by_master_course` + `master_course_restrictions.content` → 제목/설명/문항 readonly) | O | - | xnquiz 범위 외 |
| Master Course 자식 - points lock | O (문항 점수, 그룹 pick/points readonly) | O | - | - |
| Master Course 자식 - due_dates lock | O (Overrides 카드 readonly) | O | - | - |
| `horizon_course?` (Save & Publish 미노출) | O | O | - | xnquiz 범위 외 |
| editing_restricted? 안내 (라벨 옆) | O (Canvas tooltip) | O | - | xnquiz 범위 외 |

### 2-2. 헤더 (`_quiz_edit_header`)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 페이지 제목 | - (탭 위 영역) | - | O (신규 [C]) "퀴즈 편집" | - |
| 배점 표시 (자동 합계, `#quiz_display_points_possible`) | O (`.points_possible` 자동 갱신) | O | O ("문항 구성" 탭 헤더 "{N}문항 \| 총 {N}점") | - |
| 게시 배지 "Published" (`#quiz-draft-state.published`) | O (`icon-publish icon-Solid`) | O | - → S-01 카드 StatusBadge 로 대체 | - |
| 게시 배지 "Not Published" | O (`icon-unpublished`) | O | - | - |
| ⋮ Manage 트리거 (`.al-trigger`, `aria-owns="manage-toolbar"`) | O (`can_update \|\| manage`) | O | - | xnquiz 편집 헤더엔 없음 |
| Show Rubric (.show_rubric_link) | O (`@assignment` 존재) | O | - | xnquiz 범위 외 |
| SpeedGrader 링크 (.speed-grader-link-quiz) | O (`additional_speedgrader_links && published`) | O | - | xnquiz 는 S-05 별도 화면 |
| Delete (.delete_quiz_link) | O (`:delete && !is_locked`) | O | - → 액션바에 없고 S-03 상세 메뉴에 있음 | - |

### 2-3. 탭 구조

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 탭 UI (`#quiz_tabs`, ui-tabs-minimal) | O (`#quiz_tabs_tab_list`) | O | O ("기본 정보" / "문항 구성" 2개) | xnquiz 는 Mastery Paths 없음 |
| Details 탭 (`#options_tab`) | O | O | O ("기본 정보") | 본체는 S-02 와 동일 |
| Questions 탭 (`#questions_tab`) | O | O | O ("문항 구성") | - |
| Mastery Paths 탭 (`#mastery-paths-editor`) | O (Conditional Release 활성 시) | O | - | xnquiz 범위 외 |

### 2-4. Details 탭 (기본 정보) — 차이는 S-02 와 거의 동일, 변동 항목만

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 모든 기본 정보 / Options / Restrictions / Assign 필드 | O (S-02 와 동일) | O | O (S-02 와 동일) | S-02 매트릭스 참조 |
| `notify_of_update` 알림 옵션 | O (편집 시점에만 의미) | O | - | xnquiz 알림 기능 없음 |
| LMS delta: 세부사항 탭 상단 "시험(퀴즈) 출제 방법" 안내 박스 | - | O+custom | - | xnquiz 미채택 |
| 편집 모드 분기: `quiz.status === 'draft'` 일 때 임시저장 노출 | - (Canvas 는 unpublished 단일) | - | O (신규 [C]) draft 일 때만 "임시저장" 버튼 | - |
| 비공개 토글 (visible) draft 시 disabled | - | - | O (신규 [C]) "임시저장 상태에선 자동 비공개입니다. 게시 후 설정할 수 있습니다." | - |
| 마감일 변경 → status 재오픈 (closed → open) | - | - | O (신규 [C]) 저장 시 자동 | - |

### 2-5. Questions 탭 — 문항 리스트 (응시자 있을 때)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Show Question Details (≤25문항 활성) | O (`#show_question_details`) | O | - | xnquiz 는 항상 펼침 |
| 25문항 초과 disabled + 안내 | O ("NOTE: Question details not available when more than 25.") | O | - | - |
| 문항 리스트 렌더 | O (`@quiz.root_entries` 별 그룹/문항) | O | O | - |
| New Question 인라인 작성 | O (`.add_question_link` + content_lock 아닐 때) | O | O ("문항 만들기" 모달) | xnquiz 는 모달, Canvas 는 인라인 |
| New Question Group | O (`.add_question_group_link`) | O | - | xnquiz 는 그룹 없음 |
| Find Questions 모달 | O (`feature(:question_banks) && :read_question_banks`) | O | O+custom (`QuestionBankModal` / `RandomQuestionBankModal`) | xnquiz 는 2진입 분기 |
| 문제지 인쇄 버튼 | - | - | O (신규 [C]) `Printer` 아이콘, questions.length=0 시 disabled | xnquiz 만 |
| 문항 행: 드래그 핸들 | O (sortable) | O | O (`GripVertical`) | - |
| 문항 행: 번호 | O | O | O | - |
| 문항 행: TypeBadge | - (Canvas 텍스트) | - | O (배지) | - |
| 문항 행: "{points}점" | O ("X pts") | O | O | - |
| 문항 행: 수동채점 배지 | - | - | O (신규 [C]) 호박 | - |
| 문항 행: "재채점 예정" 배지 (정답 변경 시) | - (Canvas 는 저장 시점 modal) | - | O (신규 [B-#07]) `RefreshCw` 아이콘 | xnquiz 만 |
| 호버 시 편집/삭제 아이콘 | - (Canvas 는 항상 노출) | - | O (`Pencil` / `Trash2`) | - |
| 호버 편집 → `AddQuestionModal` 편집 모드 | - (Canvas 는 인라인 편집) | - | O (신규 [C]) | - |
| LMS delta: 모든 문제 헤더에 `xn-question-header-sub` 추가 | - | O+custom (모든 문항에 적용) | - | xnquiz 는 typeBadge 자체 내장 |
| LMS delta: 문제 유형 라벨 (객관식, 단답형 등) | - (Canvas 는 본문에서 추정) | O+custom (`xn-question-type` 클래스) | O (TypeBadge 컴포넌트) | xnquiz 는 React 컴포넌트로 처리 |
| LMS delta: 단답형 + 응시자 있음 → [재채점] 버튼 | - | O+custom (`xn-common-btn-blue`, force-rescore API 호출) | - → `RegradeOptionsModal` 로 일반화 | xnquiz 는 유형 제한 없이 전 자동채점 유형 |
| LMS delta: 점수 요소 sub 헤더 마지막으로 이동 | - | O+custom | - (xnquiz 는 자체 디자인) | - |

### 2-6. 문항 그룹 (Question Group) — Canvas 만

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 그룹 이동 핸들 (drag&drop) | O | O | - | xnquiz 범위 외 |
| 그룹명 (`quiz_group[name]`) | O | O | - | - |
| Pick (`pick_count`) + Points per question | O | O | - | - |
| Link to a Question Bank (`.find_bank_link`) | O (그룹-은행 연결, Find Bank 모달) | O | - → `RandomQuestionBankModal` 로 대체 | xnquiz 단순화 |
| Collapse/Expand 토글 | O (`.collapse_link` `.expand_link`) | O | - | - |
| Add Question to this Group | O | O | - | - |
| Edit Group Details | O (`.edit_group_link`) | O | - | - |
| Delete Group | O (`.delete_group_link`, points 잠금 시 숨김) | O | - | - |
| insufficient_count_warning | O ("This question group is set to pick more questions than are available.") | O | - | xnquiz 는 별도 검증 |
| Cancel / Update 버튼 | O | O | - | - |

### 2-7. Find Questions / Find Bank / Add Question Group 모달

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 문제 찾기 다이얼로그 (`#find_question_dialog`) | O (좌: 은행 목록, 우: 문항 체크리스트) | O | O+custom (`QuestionBankModal`) | UX 다름 |
| Select All / Clear All | O (체크리스트) | O | - (xnquiz 는 다중 선택만) | - |
| 그룹 선택 select (`#quiz_group_select`) | O ("[ No Group ]", "[ Create Group ]") | O | - | xnquiz 그룹 없음 |
| "Add Questions" / Cancel | O | O | O ("추가" / "취소") | - |
| 외부 코스 은행 보기 링크 (`.find_question_banks_url`) | O | O | - | xnquiz 미구현 |
| Select Bank 다이얼로그 (`#find_bank_dialog`) | O ("Select a question bank...") | O | - | xnquiz 그룹 없음 |
| 새 그룹 생성 다이얼로그 (`#add_question_group_dialog`) | O (Group Name, Pick, Points per question 필수) | O | - | - |
| `RandomQuestionBankModal` (랜덤 출제, xnquiz) | - | - | O (신규 [C]) "복수 문제모음 랜덤 출제" | xnquiz 자체 UX |

### 2-8. form-actions

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Notify users this quiz has changed | O (`quiz[notify_of_update]`) | O | - | xnquiz 알림 없음 |
| Cancel (`#cancel_button`) | O (`params[:return_to]` 또는 quiz show 로 이동, 확인 모달 없음) | O | O (차이: 변경사항 있으면 ConfirmDialog "편집 취소") | xnquiz: "저장하지 않은 변경사항이 있습니다. 저장하지 않고 나가시겠습니까?" |
| Save & Publish (`.save_and_publish`) | O (`!published && !horizon_course?`) | O | O ("저장하기" default, draft 시 별도 분기) | - |
| Save (`.save_quiz_button`, 게시 유지) | O | O | O ("임시저장", draft 일 때만) | - |
| 저장 후 status 자동 재오픈 | - | - | O (신규 [C]) closed + 마감일 미래 → 'open' | - |
| 저장 후 토스트 | - | - | O (신규 [C]) `sessionStorage('xnq_toast')` | "저장되었습니다." 등 |
| 저장 후 `/` 이동 | - (Canvas 는 show 페이지) | - | O (차이) | xnquiz 는 목록으로 |
| beforeunload (떠나기 확인) | - | - | O (신규 [C]) 변경사항 있을 때 | - |

### 2-9. 응시 시작 후 편집 동작 / Regrade 정책

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 응시 시작 경고 배너 | O (`#student_submissions_warning`) | O | - → 문항 모달 안 호박 안내로 위치 변경 | - |
| Regrade 옵션 — "Regrade only those students who answered the changed answer" | O (Canvas 기본 옵션, 소스 `regrade.handlebars`) | O | O (`RegradeOptionsModal` 라디오 1: "이전 정답과 수정된 정답 모두 인정") | xnquiz 가 기본값 |
| Regrade 옵션 — "Regrade all students" | O | O | O (라디오 2: "수정된 정답 기준으로만 재채점") | "일부 학생의 점수가 낮아질 수 있습니다" 경고 부착 |
| Regrade 옵션 — "Give everyone full credit" | O | O | O (라디오 3: "모든 학생에게 만점 부여") | - |
| Regrade 옵션 — "Update without regrading" | O | O | O (라디오 4: "재채점 없이 문제만 업데이트") | - |
| Regrade 모달 헤더 안내 | - (Canvas 는 정답 변경한 문항에 인라인) | - | O (신규 [C]) "이미 답안을 제출한 {N}명의 학생에 대한 재채점 옵션을 선택하십시오. 퀴즈 저장 시 일괄 재채점됩니다." | - |
| Regrade 모달 타이틀 | - (Canvas 는 문항 내 인라인) | - | O (신규 [C]) "재채점 옵션 선택" | - |
| Regrade 적용 조건 | (Canvas: 정답 변경) | (동일) | (정답 변경 + 자동채점 유형 + 제출 학생 > 0) | xnquiz 는 자동채점 유형으로 한정 |
| 폼 필드 잠금 (응시자 있어도) | - (Canvas 는 그대로 편집 가능) | - | - | 동일 (잠금 없음, 안내만) |
| LMS delta: "재채점 기능 안내" 박스 (응시자 있을 때) | - | O+custom (`#student_submissions_warning` 존재 시) | O (RegradeOptionsModal 안 호박 안내) | xnquiz 는 모달 내부 |
| LMS delta: 단답형 [재채점] 버튼 | - | O+custom (force-rescore API) | - (RegradeOptionsModal 의 라디오 4 와 등가) | - |
| LMS delta: 복수빈칸채우기 재채점 미지원 안내 | - | O+custom (안내 박스 본문) | - | xnquiz 도 미지원이지만 별도 안내 없음 |
| 저장 후 재채점 결과 토스트 | - | - | O (신규 [C]) "저장되었습니다. {N}명의 점수가 재채점되었습니다." | xnquiz 자체 |
| 저장 후 재오픈 토스트 | - | - | O (신규 [C]) "마감 처리된 퀴즈가 다시 게시되었습니다" | - |
| localStorage `xnq_questions_modified` | - | - | O (신규 [C]) timestamp 저장 | - |
| localStorage `xnq_regrade_log` | - | - | O (신규 [C]) 재채점 결과 저장 | - |

### 2-10. IP Filter / 검증 / Edge case

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| IP Filter 다이얼로그 (`#ip_filters_dialog`) | O (계정 등록 IP 목록, Retrieving Filters... 로딩) | O | - | xnquiz 는 직접 입력만 |
| 행 클릭 → `quiz_ip_filter` 자동 입력 | O | O | - | - |
| Time limit 0 = unlimited | O | O | O (`timeLimit: 0 \|\| null` 모두 무제한) | 동일 |
| Show Correct Answers at > Hide Correct Answers at | O (서버 검증 오류) | O | - | xnquiz 는 사전 차단 없음 (S-02 검증 #3 와 별개) |
| 동일 학생 두 override 카드 | O (서버 검증, 클라 차단 없음) | O | O (차이: 클라 사전 차단, `getValidationErrors` #8) | xnquiz 는 클라 우선 |
| `editing_restricted?(:any)` 자식 | O (제목/설명/문항 본문 readonly + Delete 비활성) | O | - | xnquiz 범위 외 |
| `horizon_course?` | O (Save & Publish 노출 안 됨) | O | - | xnquiz 범위 외 |

### 2-11. 문항 편집 모달 (`AddQuestionModal`, 편집 모드) — xnquiz

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 편집 모드 진입 | O (인라인) | O | O (모달, hover Pencil 클릭) | UX 다름 |
| 제출 학생 있을 때 상단 호박 안내 | - (Canvas 는 페이지 배너로 통합) | - | O (신규 [C]) "이 문항은 이미 {N}명이 응시했습니다..." | xnquiz 는 문항 단위 |
| 정답 변경 + 자동채점 유형 + 제출자 > 0 → 저장 시 RegradeOptionsModal | - (Canvas 는 정답 변경 검출 시 인라인) | - | O (신규 [C]) | xnquiz 는 모달 |
| RegradeOptionsModal 라디오 4종 | (Canvas 의 4종과 매핑) | (동일) | O (신규 [C]) | 위 2-9 참조 |
| "취소" / "업데이트" 버튼 | O | O | O ("변경") | - |

### 2-12. 접근성 / 기타

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 필드 인라인 검증 (`#quiz_title_message` 등) | O | O | - → AlertDialog | xnquiz 는 모달 |
| 인라인 검증: `#time_limit__message` | O | O | - | xnquiz 는 모달 |
| `aria-haspopup` / `aria-owns` 메뉴 | O | O | O (Radix 기본) | - |
| `aria-live` 안내 (마이그레이션 등) | O (`aria-live="polite"`) | O | - | xnquiz 마이그레이션 없음 |
| 라우터 가드 (학생 진입 시 `/`) | - (서버 403) | - | O (신규 [C]) | - |
| beforeunload (변경사항 있을 때) | - | - | O (신규 [C]) | - |

### 2-13. Mastery Paths 탭 — Canvas / LMS 만

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| Mastery Paths 탭 자체 (#mastery-paths-editor) | O (`course_pace_pacing_with_mastery_paths` && `enable_course_paces?`) | O | - | xnquiz 범위 외 |

## 3. 시스템별 상세 (raw 스펙에서 발췌)

### 3-1. Canvas 표준에만 있는 기능

| **기능** | **동작** | **xnquiz 채택 여부 / 이유** |
|---|---|---|
| 헤더 ⋮ Manage 드롭다운 (편집 화면 내) | Show Rubric / SpeedGrader / Delete 단축 | 미채택. xnquiz 는 S-03 상세 메뉴로 통합 |
| Master Course 잠금 매트릭스 (content/points/due_dates) | LMS 본체 기능 | 미채택. xnquiz 범위 외 |
| `notify_of_update` 알림 | 저장과 함께 학생에 알림 발송 | 미채택. 알림 기능 미구현 |
| Show Question Details 25문항 초과 비활성 | 성능 보호 | 미채택. xnquiz 는 동적 로딩 없음 |
| 인라인 문항 작성 (`.add_question_link`) | 모달이 아닌 인라인 폼 | 미채택. xnquiz 는 모달 |
| New Question Group (그룹) | Question Group 시스템 | 미채택. xnquiz 는 `RandomQuestionBankModal` 로 대체 |
| Find Bank (그룹-은행 연결) | 그룹을 은행에 연결 | 미채택 (그룹 없음) |
| `#ip_filters_dialog` (계정 등록 IP 목록) | 사전 등록된 IP 선택 | 미채택. xnquiz 는 직접 입력만 |
| Mastery Paths 탭 | Conditional Release | 미채택. xnquiz 범위 외 |
| `horizon_course?` (Horizon 별도 정책) | Save & Publish 미노출 | 미채택. xnquiz 범위 외 |
| `editing_restricted?` Master Course 자식 readonly | LMS 본체 기능 | 미채택. xnquiz 범위 외 |
| Course Paces 노티스 | 페이싱 기능 | 미채택 |
| Show Correct Answers at > Hide 서버 검증 | 일정 무결성 | 부분 채택. xnquiz 는 사전 차단 없음 (검증 공백) |
| Time limit 0 = unlimited 자동 처리 | 묵시 동작 | 채택. xnquiz 도 동일 (`timeLimit: 0 \|\| null` 모두 무제한) |

### 3-2. LearningX custom.js delta

`custom.quiz-details-guide.example.js` (편집 화면 부분):
- 문제 작성 탭 상단에 안내 박스 2개 자동 삽입 (이미지 복붙 유의사항 / 문제그룹 랜덤 출제)
- 세부 사항 탭 상단에 안내 박스 1개 (5단계 출제 방법)
- 신규 퀴즈 (`workflow_status === "created"`) 자동 진입 시 `quiz[hide_results][never]` 자동 해제
- 모두 i18n ko/en, `<details>` 토글
- **xnquiz 미채택**

`custom.quiz-rescore.example.js` (편집 화면 부분):
- 응시자 있음 (`#student_submissions_warning` 존재) 조건 → `#questions_tab` 안에 "재채점 기능 안내" 박스 자동 삽입
- 모든 문제(.display_question) 헤더에 `xn-question-header-sub` 추가
  - 문제 유형 라벨 (`xn-question-type`): 11종 매핑
  - 단답형 + 응시자 있을 때 [재채점] 버튼 추가 (`POST .../questions/:id/force-rescore`)
  - 점수 요소를 sub 헤더 마지막 자식으로 이동
- canvas2024 버전은 `data-reactid` 없는 환경 대응 (Statistics API 로 질문 ID 매칭)
- **xnquiz 부분 채택**: 문제 유형 라벨은 TypeBadge 컴포넌트로 내장. 단답형 강제 재채점은 `RegradeOptionsModal` 의 4번 옵션 ("재채점 없이 문제만 업데이트") + 정답 변경 시 자동 재채점 흐름으로 일반화. LearningX 의 force-rescore 별도 버튼은 없음.

### 3-3. xnquiz 신규 기능 ([B] 학교 요구 + [C] 자체 도출)

| **ID** | **라벨** | **기능** | **동작** |
|---|---|---|---|
| [B-#07] | 재채점 예정 배지 | 정답 변경 + 자동채점 유형 + 응시자 > 0 시 문항 행에 표시 | `RefreshCw` 아이콘. 저장 시 RegradeOptionsModal 트리거 |
| [B-#08] | RegradeOptionsModal | 정답 변경 시 재채점 정책 선택 모달 | 4종 라디오 (Canvas 정책과 매핑) |
| [C] | 페이지 제목 "퀴즈 편집" | 명시적 컨텍스트 | Canvas 는 헤더 게시 배지로만 표시 |
| [C] | 임시저장 버튼 draft 조건부 | quiz.status === 'draft' 일 때만 | Canvas 는 항상 노출 |
| [C] | 문제지 인쇄 버튼 | Printer 아이콘, questions=0 시 disabled | Canvas 미구현 |
| [C] | 호버 시 문항 편집/삭제 아이콘 | 깔끔한 UI | Canvas 는 항상 노출 |
| [C] | 문항 행 단위 편집 모달 진입 | `AddQuestionModal` 편집 모드 | Canvas 는 인라인 편집 |
| [C] | 정답 변경 사전 추적 | 모달 안 변경 검출 | Canvas 는 폼 submit 시 검출 |
| [C] | RegradeOptionsModal 호박 안내 | "이미 답안을 제출한 {N}명의 학생..." | xnquiz 자체 |
| [C] | 저장 후 status 자동 재오픈 | closed + 마감일 미래 → open | Canvas 묵시 |
| [C] | 저장 후 토스트 (재채점 결과 / 재오픈) | 명시적 안내 | Canvas 는 페이지 리로드 |
| [C] | localStorage `xnq_questions_modified` | timestamp 영속화 | mock 모드용 |
| [C] | localStorage `xnq_regrade_log` | 재채점 이력 영속화 | mock 모드용 |
| [C] | beforeunload 변경 확인 | 작업 유실 방지 | - |
| [C] | 취소 시 ConfirmDialog "편집 취소" | hasChanges 일 때만 | Canvas 는 무조건 즉시 이동 |
| [C] | 클라이언트 사전 검증 (8종) | AlertDialog (S-02 와 공통) | - |
| [C] | 비공개 토글 draft 시 disabled + 안내 | "임시저장 상태에선 자동 비공개입니다. 게시 후 설정할 수 있습니다." | - |
| [C] | 응시자 있을 때 문항 모달 안 호박 안내 | 위치 변경 (페이지 → 문항 단위) | Canvas 는 페이지 상단 배너 |

## 4. 핵심 차이 요약

**Canvas → LMS**: 편집 화면에서 LearningX 가 가장 적극적으로 보강한 영역. 핵심은 (1) **안내 박스 3종 주입** (이미지 복붙 / 문제그룹 랜덤 / 출제 방법 5단계) — 교수자 학습 부담 완화. (2) **신규 퀴즈 기본 정책 뒤집기** — "오답 표시 안함" → "오답 공개 ON" 자동. (3) **문제 유형 라벨 표시** (`xn-question-type`) — Canvas 는 본문에서 추정만, LearningX 는 헤더 라벨화. (4) **단답형 강제 재채점 버튼** — Canvas 의 regrade 4종 옵션과 별개로 단답형 한정 force-rescore API 직접 호출. (5) **재채점 기능 안내 박스** — 응시자 있을 때 자동 표시. 모두 `.example.js` 라 학교별 적용.

**Canvas → xnquiz**: (1) **인라인 편집 → 모달 편집** 으로 전환: 문항 단위로 `AddQuestionModal` 진입. (2) **Question Group / Find Bank 폐기**: `RandomQuestionBankModal` 단순화. (3) **Regrade 정책 4종은 Canvas 와 1:1 매핑하면서 모달 UI 로 일반화**: LearningX 의 단답형 한정 force-rescore 를 모든 자동채점 유형으로 확장. (4) **"재채점 예정" 배지** 사전 표시: Canvas 는 저장 시점에 알지만 xnquiz 는 문항 행에 미리 표시. (5) **Master Course 잠금 매트릭스 / Mastery Paths / horizon_course / IP Filter 다이얼로그 / notify_of_update 일체 드롭**. (6) **status 자동 재오픈** (closed + 마감일 미래 → open) — Canvas 는 묵시인데 xnquiz 는 토스트로 명시. (7) **클라이언트 사전 검증 8종** (S-02 와 공통) + **변경사항 확인 / beforeunload**.

**LMS → xnquiz**: 가장 큰 변화는 "재채점 UX 일반화". LearningX 가 단답형에만 [재채점] 버튼을 추가하고 다른 유형은 Canvas 표준 regrade.handlebars 에 의존했다면, xnquiz 는 모든 자동채점 유형에 대해 `RegradeOptionsModal` 단일 모달로 통합 — 정책 자체는 Canvas 4종 그대로 유지하면서 진입점만 모달화. 또한 LearningX 의 "재채점 기능 안내 박스" 는 xnquiz 에서 `RegradeOptionsModal` 의 호박 안내로 위치 이동 (필요할 때만 노출). 안내 박스 3종 (이미지 복붙 / 문제그룹 / 출제 방법) 은 xnquiz 에서 필드 라벨 옆 툴팁 + 검증 메시지 + 첫 진입 가이드로 분산 처리. 정책적으로 xnquiz 는 "신규 퀴즈 기본값" 을 학교 요구 (LearningX) 가 아닌 Canvas 보수적 기본 (성적 공개 OFF) 으로 다시 되돌리고, 대신 명시적 UI 토글로 강제.

## 5. 누락 의심 / 확인 필요

- Canvas 의 "Show Correct Answers at > Hide Correct Answers at" 서버 검증 오류가 xnquiz 에서는 사전 차단 없음 → 정책 공백 (OQ-XN-10).
- xnquiz 의 `RegradeOptionsModal` 이 자동채점 유형으로만 트리거되는데, Canvas 의 regrade 가 단답형/복수빈칸채우기 같은 부분 자동 유형도 포함하는지 raw 스펙에 매핑 불명확. LearningX delta 는 "복수빈칸채우기 미지원" 명시 → xnquiz 도 동일한지 검증 필요 (OQ-XN-11).
- xnquiz 의 "status 자동 재오픈" 정책 (closed + 마감일 미래 → open) 이 학생 알림과 어떻게 연동되는지 — 알림 시스템 자체가 없으므로 학생은 새로 게시된 사실을 모를 수 있음 (OQ-XN-12).
- Canvas `editing_restricted?` 매트릭스가 LearningX 운영 학교에서 실제로 작동하는지 (Master Course 사용 여부) 확인 필요. xnquiz 가 LTI 통합 시 잠금 정책 미정 (OQ-XN-13).
- LearningX 의 force-rescore API (`POST .../force-rescore`) 가 단답형만 처리하는지, 다른 유형도 가능한지 raw 스펙에 명확하지 않음.
- xnquiz 의 `localStorage('xnq_questions_modified')` 는 mock 모드 전용으로 보이는데, api 모드에서는 어떤 키/방식으로 추적하는지 raw 스펙 미명시 (OQ-XN-14).

## 6. 자기 점검 체크리스트

| **영역** | **raw 스펙 영역 수** | **매트릭스 반영 영역 수** | **상태** |
|---|---|---|---|
| 진입/권한/잠금 | Canvas 7 + xnquiz 1 = 8 | 9 | 완료 |
| 헤더 | Canvas 8 + xnquiz 1 = 9 | 9 | 완료 |
| 탭 구조 | Canvas 4 + xnquiz 0 = 4 | 4 | 완료 |
| Details 탭 (변동분) | Canvas 1 + LMS 1 + xnquiz 3 = 5 | 5 | S-02 매트릭스 참조로 본체 생략 |
| Questions 탭 - 문항 리스트 | Canvas 8 + LMS 4 + xnquiz 8 = 20 | 19 | 완료 |
| 문항 그룹 | Canvas 10 | 10 | 완료 |
| Find Questions 모달 | Canvas 7 + xnquiz 1 = 8 | 8 | 완료 |
| form-actions | Canvas 4 + xnquiz 4 = 8 | 8 | 완료 |
| Regrade 정책 | Canvas 5 + LMS 3 + xnquiz 7 = 15 | 15 | 완료 |
| IP Filter / Edge case | Canvas 6 + xnquiz 1 = 7 | 7 | 완료 |
| 문항 편집 모달 (xnquiz) | xnquiz 5 (Canvas 매칭) | 5 | 완료 |
| 접근성/기타 | Canvas 4 + xnquiz 2 = 6 | 6 | 완료 |
| Mastery Paths 탭 | Canvas 1 | 1 | 완료 |
| **합계 행 수** | **약 106행** | **약 106행** | - |

누락 의심 행:
- Canvas 의 _quiz_edit_details / _quiz_edit_questions 의 본체 (필드/입력 매트릭스 자체) 는 S-02 와 동일하므로 S-02 매트릭스 참조로 정리하고, 본 화면에서는 "편집 모드 특화 차이" 만 다뤘음
- 문항 유형별 form_question/form_answer partial 의 세부 (정답별 코멘트, 일반 코멘트, 정답 표시 모드 등) 는 S-02 에서 다룬 항목이라 본 매트릭스에서 제외
- LearningX 의 `xn-question-bank-rescore-buttons-wrapper` 는 S-06 통계 화면 영역이라 본 매트릭스 제외 (해당 화면 비교 시 다뤄야 함)
