# S-01. 퀴즈 목록 - Canvas / LMS / xnquiz 비교

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
|---|---|---|
| Canvas | `/courses/:course_id/quizzes` | `manage_assignments_add/edit/delete` / `manage` / `read_question_banks` / `participate_as_student` |
| LMS (LearningX) | Canvas 와 동일 + custom.js delta | (동일) - S-01 영향 custom 없음 |
| xnquiz | `/` | INSTRUCTOR / STUDENT (RoleContext) |

화면 한줄 요약:
- Canvas: 한 코스의 퀴즈를 "과제(Assignment) / 연습(Practice) / 설문(Survey)" 3그룹으로 한 페이지에 다 렌더링. 검색만 클라이언트 필터링이고 정렬/페이지네이션은 없음. 헤더에 "퀴즈 추가(+ Quiz)" 와 더보기 메뉴(⋮).
- LMS: Canvas 표준 그대로 사용. custom.js 영향 없음.
- xnquiz: 현재 코스(`CS301`) 하드코딩 노출. 주차/차시 필터 + 4종 정렬 + 카드 우측에 응시율/제출/평균 인라인 통계 추가. 가져오기/전역 설정 모달 신규.

## 2. 기능 매트릭스 (핵심)

### 2-1. 헤더 영역

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 페이지 제목 텍스트 | O ("Quizzes", screenreader-only H1) | O | O ("퀴즈 관리" / 학생 "내 퀴즈") | xnquiz 는 시각적으로도 노출 |
| 퀴즈 추가 버튼 | O ("+ Create Quiz" / "+ Quiz") | O | O ("새 퀴즈", Plus 아이콘) | Canvas 는 POST 즉시 빈 퀴즈 생성 후 edit 리다이렉트, xnquiz 는 `/quiz/new` 빈 폼 |
| 검색창 (제목 부분 일치) | O (입력 즉시 클라이언트 필터) | O | - | xnquiz 는 검색 미지원 |
| 헤더 더보기 메뉴 (⋮) | O (`permissions.create \|\| manage`) | O | - | xnquiz 는 톱니 + "가져오기" 단독 버튼으로 대체 |
| "문제 은행 관리" 메뉴 | O (헤더 ⋮ 안) | O | - → 사이드바 "문제모음" 으로 대체 | xnquiz 는 좌측 nav 에 상시 노출 |
| "여러 퀴즈 일괄 공개" 메뉴 | O (`permissions.manage`) | O | - | xnquiz 미구현 |
| 외부 도구 (LTI placement) | O (`quiz_index_menu` 등록 시) | O | - | xnquiz 범위 외 |
| "문제 은행 보기" 학생 버튼 | O (학생/뷰어 + `read_question_banks`) | O | - | xnquiz 학생은 문제모음 진입 불가 |
| 전역 설정 톱니 | - | - | O (신규 [C]) "퀴즈 전역 설정" 다이얼로그 | 복수선택 채점 방식 + 정답 판정 공통 정책 |
| "가져오기" 버튼 | - | - | O (신규 [C]) "다른 과목 퀴즈 가져오기" 모달 | Canvas 의 Copy to 와는 방향 반대 (자기에게 끌어옴) |

### 2-2. 검색 / 필터 / 정렬

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 제목 검색 (즉시 필터) | O (클라이언트, 부분 일치) | O | - | xnquiz 미구현 |
| 주차 필터 (`week`) | - | - | O (신규 [C]) "전체/미지정/1~16주차" | xnquiz 자체 메타필드 |
| 차시 필터 (`session`) | - | - | O (신규 [C]) 주차 선택 후 활성 | 주차 변경 시 자동 "전체 차시" 리셋 |
| 정렬: 최근생성순 | - (position 기본) | - | O (신규 [C]) `recent` | createdAt 기준 |
| 정렬: 주차 오름차순 | - | - | O (신규 [C]) `week-asc` | - |
| 정렬: 주차 내림차순 | - | - | O (신규 [C]) `week-desc` | - |
| 정렬: 마감임박순 | - | - | O (신규 [C]) `deadline` | 마감 없는 항목/지난 마감 뒤로 |
| 상태 필터 (공개/비공개) | - | - | - | 셋 다 미지원 |
| 페이지네이션 | - (전체 노출) | - | - (전체 노출) | 동일 |

### 2-3. 퀴즈 그룹 / 분류

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| "Assignment Quizzes" 그룹 | O (graded) | O | - | xnquiz 는 그룹 분리 안 함 |
| "Practice Quizzes" 그룹 | O (`practice_quiz`) | O | O (차이: `quizMode='practice'` 메타필드, 카드 안 안내만) | xnquiz 는 그룹 분리 없이 카드 정보로 표시 |
| "Surveys" 그룹 | O (survey / graded_survey) | O | - | xnquiz 는 설문 유형 자체 없음 |
| 빈 상태 단독 그룹 ("Course Quizzes") | O | O | - | xnquiz 는 단일 통합 빈 상태 |
| 그룹 접기/펼치기 | O (새로고침 시 재펼침) | O | - | xnquiz 는 그룹 없음 |
| 그룹별 빈 텍스트 ("No quizzes found") | O | O | - | xnquiz 통합 메시지로 갈음 |

### 2-4. 카드 (교수자)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 퀴즈 아이콘 (좌) | O (`icon-quiz`) | O | - | xnquiz 는 아이콘 없이 텍스트 배지 |
| 제목 링크 (클릭 → 상세) | O | O | O | xnquiz 는 카드 전체가 클릭 영역 |
| 이용 시작일 (`unlock_at` / startDate) | O (showAvailability) | O | O | xnquiz 라벨 "응시 기간" |
| 마감일 (`due_at` / dueDate) | O (showDueDate) | O | O | - |
| 이용 종료 (lockDate) | - | - | O (신규 [C]) "이용 종료: {lockDate}" | Canvas `lock_at` 과 유사하지만 별도 필드 |
| "(종료됨)" 부착 (lockDate 지남) | - | - | O (신규 [C]) | - |
| 배점 라벨 ("X pts" / "X점") | O | O | O (인라인 통계 "총점 {N}점") | xnquiz 는 우측 인라인 영역 |
| 문항 수 라벨 ("X Questions") | O | O | O (인라인 통계 "문항 수 {N}개") | - |
| 응시율 표시 | - | - | O (신규 [C]) "응시율 {N}%" | open/grading/closed 일 때만 |
| 응시인원 표시 | - | - | O (신규 [C]) "응시인원 {N}명" | 동일 조건 |
| 미제출 인원 (빨강 강조) | - | - | O (신규 [C]) "미제출 {N}명" | >0 빨강 |
| 평균점수 | - | - | O (신규 [C]) "평균점수 {N}점" | 파랑 강조 |
| 제한시간 표시 | - | - | O (신규 [C]) "제한시간 {N}분" | draft/scheduled 일 때 노출 |
| Mastery Paths 라벨 | O (cyoe trigger/released) | O | - | xnquiz 범위 외 |
| SIS 동기화 버튼 | O (`postToSISEnabled`) | O | - | xnquiz 범위 외 |
| 잠금 아이콘 토글 (`can_update`) | O | O | - | xnquiz 는 카드 메뉴로만 제공 |
| 공개 아이콘 토글 (✓/○) | O | O | - → 카드 메뉴 "학생에게 공개/숨기기" | xnquiz 는 아이콘 토글 없이 메뉴 안 |
| `VisibilityBadge` (공개/비공개 배지) | - | - | O (신규 [C]) Eye/EyeOff + 라벨 | draft 면 미표시 |
| `StatusBadge` (진행중/채점중/마감/임시저장/예정) | - | - | O (신규 [B-#01]) | xnquiz 자체 상태 모델 |
| 주차/차시 회색 배지 | - | - | O (신규 [C]) `{w}주차 {s}차시` | - |
| D-day 배지 (D-0 빨강, D-{n} 호박) | - | - | O (신규 [C]) | open + !scheduled 일 때만 |
| 지각 제출 안내 라벨 | - | - | O (신규 [B-#02]) "지각 제출: {date}까지" | allowLateSubmit ON 일 때 |
| 지각 제출 무제한 라벨 | - | - | O (신규 [B-#02]) "지각 제출: 무제한 허용" | lateSubmitDeadline 없을 때 |
| 카드 임시 상태: isMigrating | O (스피너+"Migrating ...") | O | - | xnquiz 범위 외 |
| 카드 임시 상태: isDuplicating | O (스피너+"Making a copy of ...") | O | - | xnquiz 는 즉시 복제 (모달 닫힘) |
| 카드 임시 상태: isCloningAlignment | O | O | - | - |
| 카드 임시 상태: isImporting | O (스피너+"Importing ...") | O | - | xnquiz 는 모달 안에서 처리 |
| 카드 실패 상태 + Retry/Cancel | O | O | - | xnquiz 는 토스트로만 알림 |

### 2-5. 카드 더보기 메뉴 (교수자, ⋮)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 편집 (Edit) | O (`can_update`) | O | O ("편집", Pencil) | - |
| Build (New Quizzes 전용) | O (조건부) | O | - | xnquiz 범위 외 (Classic 만) |
| SpeedGrader 링크 | O (`assignment_id` 있고 published) | O | - → "채점" 으로 대체 | xnquiz 는 자체 채점 대시보드 |
| 미리보기 (Preview) | - (S-03 의 헤더에 있음) | - | O (신규 [C]) "미리보기" → `/quiz/{id}/attempt?preview=true` | Canvas 는 카드 메뉴엔 없음 |
| 복제 (Duplicate) | O (`canDuplicate`) | O | O ("복사", Copy 아이콘) → `QuizCopyModal` | Canvas 는 동일 코스만, xnquiz 는 코스 선택 가능 |
| 할당 대상 (Assign To...) | O (`canManageAssignTo`) | O | - → S-02/S-04 "추가 기간 설정" 안에 통합 | xnquiz 는 카드 메뉴 미노출 |
| 학생 공개/숨기기 토글 | O (아이콘 토글) | O | O (차이: 메뉴 안 항목, draft 시 disabled) | draft 면 자동 비공개 |
| 채점 (xnquiz) | - | - | O (신규 [C]) `canGrade` 일 때 → `/quiz/{id}/grade` | scheduled/draft 제외 |
| 통계 (xnquiz) | - | - | O (신규 [C]) `canGrade` 동일 조건 → `/quiz/{id}/stats` | - |
| 삭제 (Delete) | O (`permissions.delete && !is_locked`) | O | O (destructive, ConfirmDialog) | Canvas 는 브라우저 `confirm()`, xnquiz 는 커스텀 다이얼로그 |
| Migrate (Classic→New) | O | O | - | xnquiz 범위 외 |
| Send to... | O (`DIRECT_SHARE_ENABLED`) | O | - | xnquiz 미구현 |
| Copy to... (다른 코스) | O | O | O+custom (차이: `QuizCopyModal` 에 코스 선택 통합) | 방향: Canvas 는 본 코스 → 타 코스, xnquiz 도 동일 |
| Mastery Paths 항목 | O (`cyoe.isCyoeAble`) | O | - | xnquiz 범위 외 |
| 외부 도구 (LTI quiz_menu) | O | O | - | xnquiz 범위 외 |

### 2-6. 카드 (학생)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 제목 / 응시 기간 / 점수 / 문항 수 | O | O | O | 공통 |
| 우측 SIS/잠금/공개/⋮ 액션 | - (학생 미노출) | - | - | 셋 다 미노출 |
| 본인 응시 결과 카드 표시 | - (상세 진입 후) | - | O (신규 [C]) "내 점수 {score}/{total}점" | xnquiz 는 카드에서 바로 |
| "응시완료" / "미응시" 배지 | - | - | O (신규 [C]) | scheduled 면 미표시 |
| `studentDisplayStatus` (예정/진행중/마감) | - | - | O (신규 [B-#01]) | 채점중은 학생에게 미노출 |
| 비활성 카드 (lockDate 지남) | - | - | O (신규 [C]) "이용이 종료되어 퀴즈 정보를 확인할 수 없습니다" | Lock 아이콘 + opacity-60 |
| 응시 기록 N회 토글 | - | - | O (신규 [C]) `StudentScoreFooter` | 다회 응시 시 펼치기 |
| 수동채점 대기 띠 | - | - | O (신규 [C]) "수동채점 {N}문항 대기 중 (0점 반영)" | manualPending>0+released |
| 회차별 공개여부 라벨 ("비공개"/"공개 예정") | - | - | O (신규 [C]) | computeScoreReveal 기반 |

### 2-7. 모달 / 다이얼로그

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 일괄 공개 다이얼로그 | O | O | - | 미구현 |
| Send to 모달 | O | O | - | - |
| Copy to 모달 (다른 코스) | O | O | O+custom (`QuizCopyModal`) | xnquiz 는 ResetNotice 6항목 초기화 안내 추가 |
| Copy to 모달 - 코스 검색 | - (`select` 박스) | - | O (신규 [C]) 검색 인풋 | UX 차이 |
| Copy to 모달 - "현재 과목" 라벨 | - | - | O (신규 [C]) | - |
| Copy to 모달 - ResetNotice 6항목 | - | - | O (신규 [C]) | 주차/응시기간/공개/지각/접근코드/추가기간 |
| Copy 성공 토스트 | - | - | O (신규 [C]) "'{title}'을(를) {label}으로 복사했습니다" | - |
| Import 모달 (다른 과목 → 본 과목) | - | - | O (신규 [C]) `QuizImportModal` | 임시저장 상태로 추가 |
| Import 모달 - 다중 선택 | - | - | O (신규 [C]) 체크박스 | "{N}개 선택됨" |
| Import 모달 - draft 제외 | - | - | O (신규 [C]) | 공개된 퀴즈만 |
| Import 성공 토스트 (1개) | - | - | O (신규 [C]) "'{title}' 가져오기 완료" | - |
| Import 성공 토스트 (다수) | - | - | O (신규 [C]) "퀴즈 {N}개 가져오기 완료" | - |
| 전역 설정 다이얼로그 | - | - | O (신규 [B-#03]) `QuizSettingsDialog` | 복수선택 채점 방식 + 정답 판정 |
| 전역설정: 복수선택 "전체 정답 시 만점" | - | - | O (신규 [B-#03]) | 라디오 1 |
| 전역설정: 복수선택 "부분 점수" | - | - | O (신규 [B-#03]) | 라디오 2 |
| 전역설정: "감점 없음" 하위 라디오 | - | - | O (신규 [B-#03]) | - |
| 전역설정: "오답 차감" 하위 라디오 | - | - | O (신규 [B-#03]) | 공식 툴팁 포함 |
| 전역설정: "추측 보정 감점" 라디오 | - | - | O (신규 [B-#03]) | 공식 툴팁 포함 |
| 전역설정: 채점 시뮬레이션 아코디언 | - | - | O (신규 [C]) | 3방식 점수 비교 |
| 전역설정: "영문 대소문자 구분" 토글 | - | - | O (신규 [B-#04]) | - |
| 전역설정: "띄어쓰기 구분" 토글 | - | - | O (신규 [B-#04]) | - |
| 삭제 확인 다이얼로그 | O (브라우저 `confirm()`) | O | O (차이: 커스텀 ConfirmDialog) | xnquiz: "'{title}' 퀴즈를 삭제하시겠습니까?\n삭제된 퀴즈는 복구할 수 없습니다." |

### 2-8. 빈 상태 / 토스트 / 접근성

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 빈 상태 헤더 ("Course Quizzes") | O | O | - | xnquiz 통합 메시지 |
| 빈 상태 본문 ("No quizzes available") | O | O | O (차이: 필터 적용 시 "해당 조건에 맞는 퀴즈가 없습니다." / 무 필터 0개 시 학생용 "현재 응시 가능한 퀴즈가 없습니다.") | xnquiz 는 분기 메시지 |
| 빈 상태 일러스트/CTA | - | - | O (FileText 아이콘 + opacity-40) | xnquiz 만 아이콘 |
| 카드 스켈레톤 (로딩 중) | - | - | O (신규 [C]) `QuizCardSkeleton` x3 | api 모드 로딩 표시 |
| `sessionStorage('xnq_toast')` 1회 표시 | - | - | O (신규 [C]) | 화면 이동 후 토스트 |
| 토스트 자동 닫힘 (4초) | - | - | O (신규 [C]) | - |
| 검색 input a11y (`screenreader-only` 라벨) | O | O | - | xnquiz 검색 없음 |
| 더보기 메뉴 `aria-haspopup` | O | O | O (Radix DropdownMenu 기본) | - |
| 카드 임시 상태 `aria-live="polite"` | O | O | - | xnquiz 임시 상태 미구현 |

### 2-9. 키보드 / 라우팅 / 기타

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
|---|---|---|---|---|
| 카드 키보드 포커스 → Enter 진입 | O | O | O (Link 컴포넌트) | - |
| 메뉴 ESC 닫기 | O | O | O (Radix 기본) | - |
| 검색 즉시 필터 | O | O | - | - |
| 필터 변경 → URL 쿼리 반영 | - | - | - | xnquiz 도 로컬 상태만 |
| 새로고침 시 필터 유지 | - (검색어 비움) | - | - (필터 비움) | 동일 |
| prefetch (nav hover/idle) | - | - | O (신규 [C]) `prefetchRoute.quizList` | requestIdleCallback |

## 3. 시스템별 상세 (raw 스펙에서 발췌)

### 3-1. Canvas 표준에만 있는 기능

| **기능** | **동작** | **xnquiz 채택 여부 / 이유** |
|---|---|---|
| 검색창 (제목 부분 일치 즉시 필터) | 입력 즉시 클라이언트 사이드 부분 일치 | 미채택. 카드 수 적으면 필터로 갈음, 추후 추가 가능 |
| 3그룹 분리 (Assignment / Practice / Surveys) | 그룹 헤더 + 그룹별 빈 텍스트 + 접기/펼치기 | 미채택. xnquiz 는 설문 유형 없고, 연습/평가는 카드 배지로 구분 |
| 헤더 더보기 메뉴 ⋮ | 문제 은행 관리 / 일괄 공개 / LTI 도구 | 부분 채택. "문제모음" 은 좌측 nav 로 상시 노출, 일괄 공개/LTI 는 미구현 |
| Send to / Copy to (Direct Share) | 다른 사용자/코스로 직접 공유 | 미채택. xnquiz 는 코스 간 "복사" 만 지원 (사용자 간 공유 없음) |
| Mastery Paths (Conditional Release) | 점수에 따른 후속 콘텐츠 추천 | 미채택. xnquiz 범위 외 (LMS 본체 기능) |
| LTI placement (quiz_index_menu / quiz_menu) | 외부 도구 동적 메뉴 | 미채택. xnquiz 범위 외 |
| SIS 동기화 토글 | Student Information System 연동 | 미채택. xnquiz 범위 외 |
| 카드 임시 상태 (Migrating / Duplicating / Cloning Alignment / Importing) | 스피너 + 진행 메시지 + Retry/Cancel | 미채택. xnquiz 는 즉시 동작 + 토스트로 갈음 |
| 일괄 공개 다이얼로그 (Publish Multiple) | 다중 선택 후 일괄 공개 | 미채택. 카드 메뉴별 단일 토글로 갈음 |
| 학생용 "View Question Banks" 단독 버튼 | 학생/뷰어가 문제은행 조회 | 미채택. xnquiz 학생은 문제모음 진입 불가 |

### 3-2. LearningX custom.js delta

해당 custom 없음 (`lms-customs-spec.md` 의 S-01 절 명시). Canvas 표준 그대로.

### 3-3. xnquiz 신규 기능 ([B] 학교 요구 + [C] 자체 도출)

| **ID** | **라벨** | **기능** | **동작** |
|---|---|---|---|
| [C] | 전역 설정 톱니 | 퀴즈 전역 정책 모달 | 헤더 우측, Settings2 아이콘. 클릭 → `QuizSettingsDialog` |
| [B-#01] | StatusBadge | 자체 상태 모델 | 진행중/채점중/마감/임시저장/예정 5가지. displayStatus 계산 (scheduled, isDeadlinePassed 동적 판정) |
| [B-#02] | 지각 제출 안내 | allowLateSubmit + lateSubmitDeadline 카드 표시 | "지각 제출: {date}까지" 또는 "무제한 허용" 호박 |
| [B-#03] | 복수선택 채점 방식 (전역) | 전체 정답/부분 점수/오답 차감/추측 보정 4가지 | 전역설정 모달, partial 시 시뮬레이션 아코디언 |
| [B-#04] | 정답 판정 정책 (전역) | 대소문자 / 띄어쓰기 토글 | 전역설정 모달. 학생 혼란 방지 안내 부착 |
| [C] | 가져오기 (Import) | 다른 과목 퀴즈를 본 코스로 끌어옴 | `QuizImportModal`. 다중 선택, draft 제외, 임시저장 상태로 추가 |
| [C] | ResetNotice (복사/가져오기) | 초기화될 6항목 명시 | 주차/응시기간/공개/지각/접근코드/추가기간 |
| [C] | 인라인 통계 (응시율/응시인원/미제출/평균) | 카드 우측 4지표 | 모바일 숨김 (`sm:flex`) |
| [C] | 주차/차시 필터 + 정렬 | 자체 메타 활용 | 정렬 4종 (최근/주차 asc/desc/마감임박) |
| [C] | 미리보기 메뉴 | 카드 메뉴에서 응시 화면 미리보기 | `?preview=true` 쿼리 |
| [C] | D-day 배지 | open + !scheduled 시 자동 계산 | D-0 빨강 / D-{n} 호박 |
| [C] | 학생 카드 본인 점수 표시 | `myAttempt` 기준 카드에서 바로 노출 | Canvas 는 상세 진입 후만 |
| [C] | 학생 응시 기록 다회차 펼침 | StudentScoreFooter | 회차별 점수 + 공개여부 |
| [C] | lockDate 지나면 비활성 카드 | 학생 보호 | "이용이 종료되어 퀴즈 정보를 확인할 수 없습니다" |

## 4. 핵심 차이 요약

**Canvas → LMS**: 목록 화면은 LearningX custom.js 가 일체 손대지 않음. 즉 LMS 사용자도 Canvas 표준 목록을 그대로 본다. 보강은 모두 응시/통계/편집 단계에서 일어남.

**Canvas → xnquiz**: 가장 큰 변화는 (1) 3그룹 분리 폐기 (Practice/Survey 그룹 자체 없음, Assignment 만 단일 리스트로 노출), (2) 카드에 자체 상태 모델(StatusBadge) + 인라인 통계(응시율/평균) + D-day 직접 노출, (3) Canvas 의 Send to/Mastery Paths/SIS/LTI placement/일괄 공개/Migrate 일체 드롭. 신규로 가져오기(Import) 모달과 전역 설정 모달 도입. 검색은 Canvas 만 있고 xnquiz 는 미구현.

**LMS → xnquiz**: 정책 측면에서 가장 두드러진 차이는 "복수선택 채점 방식" 과 "정답 판정" 을 **전역 설정** 으로 끌어올린 것. LearningX 의 quiz-details-guide custom 은 편집 페이지 안내문에 그쳤다면, xnquiz 는 코스 전체에 적용되는 정책으로 격상시켜 일관성 확보. 시각화는 카드 우측 인라인 통계로 "응시 현황을 한눈에" 라는 방향. 동선은 Canvas/LMS 가 "목록 → 상세 → 채점 단계 별도 이동" 인 반면 xnquiz 는 카드 메뉴에서 "채점/통계" 로 1클릭 점프 가능.

## 5. 누락 의심 / 확인 필요

- raw 스펙 (canvas-spec.md) 의 "Migrate" / "Mastery Paths" / "Direct Share" 메뉴는 LearningX 에서 활성 상태인지 미확인. xnquiz 는 모두 드롭.
- xnquiz `QuizImportModal` 의 "공개된 퀴즈가 없습니다" 문구가 "draft 제외" 만 의미하는지, 다른 비공개 조건도 포함하는지 raw 에 명시 없음.
- 학생 카드에서 "채점중" 상태를 노출 안 한다고 했는데, 채점중에도 응시 결과(임시 점수) 가 있을 수 있는 경우 어떻게 표시되는지 정책 공백 (OQ-XN-01).
- Canvas "Course Paces" 활성 시 카드/그룹 동작 변화는 raw 에 없음 (Canvas 본체 기능). xnquiz 영향 없으니 비고만.
- xnquiz mock 모드에서 `CURRENT_COURSE = 'CS301 데이터베이스'` 하드코딩 → 다중 코스 진입 UX 미확인 (OQ-XN-02).

## 6. 자기 점검 체크리스트

| **영역** | **raw 스펙 영역 수** | **매트릭스 반영 영역 수** | **상태** |
|---|---|---|---|
| 헤더 영역 | Canvas 5 + xnquiz 4 + LMS 0 = 9 | 10 | 완료 |
| 검색/필터/정렬 | Canvas 1 + xnquiz 4 = 5 | 9 (미지원 항목 포함) | 완료 |
| 그룹 분류 | Canvas 4 + xnquiz 0 = 4 | 6 | 완료 |
| 카드 (교수자) | Canvas 14 + xnquiz 8 = 22 | 24 | 완료 |
| 카드 메뉴 | Canvas 12 + xnquiz 5 = 17 | 17 | 완료 |
| 카드 (학생) | Canvas 1 + xnquiz 8 = 9 | 9 | 완료 |
| 모달 | Canvas 2 + xnquiz 4 = 6 | 16 (전역설정 세부 포함) | 완료 |
| 빈 상태/토스트 | Canvas 3 + xnquiz 5 = 8 | 9 | 완료 |
| 키보드/라우팅 | Canvas 5 + xnquiz 3 = 8 | 6 | 일부 a11y 항목 통합 |
| **합계 행 수** | **약 95행** | **95행** | - |

누락 의심 행:
- Canvas "Course Paces" 관련 그룹 변화 (xnquiz 영향 없어 매트릭스 제외, 5절에 기록)
- LTI 외부 도구 placement 세부 (xnquiz 범위 외이므로 단일 행으로 통합)
