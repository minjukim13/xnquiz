# S-05. 채점 대시보드 - Canvas / LMS / xnquiz 비교

> Canvas Classic Quizzes 기준. 분석 시점 2026-05-21.

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
| --- | --- | --- |
| Canvas | `/courses/:cid/quizzes/:id` 의 "Show Student Quiz Results" 패널 + `/quizzes/:id/moderate` (Moderate Quiz) + `/courses/:cid/gradebook/speed_grader?assignment_id=...` (SpeedGrader) + `/quizzes/:id/history?quiz_submission_id=...` (Quiz History) | `:grade` 또는 `:review_grades`, Moderate 는 `:manage`, SpeedGrader 는 `available? && published && can_view_speed_grader?` |
| LearningX (LMS) | Canvas 와 동일 라우트 그대로 사용. custom.js 없음 | Canvas 권한 그대로 |
| xnquiz | `/quiz/:id/grade` 단일 SPA (`?mode=student` / `?studentId=` 쿼리로 시작 모드/학생 지정) | role=PROFESSOR 또는 ADMIN |

**한줄 요약**
- **Canvas**: "응시 리스트(상세 패널) + Moderate(시간/시도 연장) + SpeedGrader(한 학생씩 채점) + Quiz History(한 시도 채점)" 4개 화면이 따로 분산되어 있고, SpeedGrader 가 한 명씩 채점하는 메인 도구.
- **LMS**: Canvas 화면을 그대로 쓴다. custom.js 보강분 없음 (편집/통계 화면에는 있음).
- **xnquiz**: 한 화면에서 "문항 중심 / 학생 중심" 두 모드를 탭으로 토글. 일괄 채점 / 엑셀 일괄 채점 / 조건부 재응시 / 활동 로그 / 코멘트 스레드가 신규 통합.

---

## 2. 기능 매트릭스

### 2-1. 화면 구조 / 헤더

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 단일 화면으로 통합 | - (4개 화면 분산) | - | O (신규 [C]) | xnquiz 가 가장 큰 차이. 모드 탭으로 토글 |
| 응시자 점수 요약 패널 (Show Student Quiz Results) | O | O | O (차이: QuizInfoCard 의 응시율/응시 인원/채점 완료 3분할) | xnquiz 는 헤더 카드에 상시 노출 |
| draft (임시저장) 진입 시 전용 화면 | - (응시 안 함 = 채점 화면 자체 비활성) | - | O (신규 [C]) | "아직 응시가 시작되지 않았습니다" 안내 + "퀴즈 편집하기" CTA |
| 주차/차시 + StatusBadge | - | - | O (신규 [C]) | xnquiz 도메인 특화 |
| 응시 기간 + 성적 공개 라인 | - (별도 화면에서 확인) | - | O (신규 [C]) | with_answer/wrong_only/period 라벨 분기 |
| 뒤로가기 / 페이지 헤더 | O | O | O | |

### 2-2. 학생 리스트

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 학생 검색 | O (Moderate 의 search_term, 클라이언트 사이드) | O | O (차이: placeholder "이름 또는 학번") | |
| 학생 정렬 | - (Moderate 는 정렬 옵션 없음) | - | O (신규 [C]): "이름순" / "학번순" / "제출일시순" | |
| 응시 번호 (Attempt) 컬럼 | O | O | - | xnquiz 는 응시 횟수를 attempts 카드에서 별도 노출 |
| Time (응시 소요 시간) | O ("finished in {duration}" / "in progress" / "--") | O | O (차이: 활동 로그 탭에서만 노출) | |
| Attempts Left | O (allowed_attempts 무제한이면 숨김) | O | - | xnquiz 는 ConditionalRetakeModal 로 별도 부여 |
| Score | O (`kept_score`) | O | O (차이: 미채점/완료 배지 + 가산점 표시) | |
| 제출 상태 배지 | - (Canvas 는 Late/Excused 등 라벨) | - | O (신규 [C]): "정상제출" / "지각제출" / "미제출" 컬러 도트 | xnquiz 만 미제출을 한 행으로 명시 표시 |
| 자동채점 정답/오답 배지 | - | - | O (신규 [C]): CorrectBadge | |
| 페이지네이션 | - (Moderate 는 단일 페이지 + 클라이언트 필터) | - | O (신규 [C]): 10/20/30/전체 | |
| 행 선택 체크박스 (일괄 처리) | O (#check_all + 일괄 시간/시도 연장) | O | - | xnquiz 는 학생 일괄 선택 없음 (일괄 채점은 전체/미제출자만 분기) |

### 2-3. 응답 보기 (한 학생 / 한 문항)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 학생별 답안 조회 | O (SpeedGrader / Quiz History) | O | O (차이: "학생 중심" 모드 → StudentDetailPanel) | |
| 문항별 답안 조회 (모든 학생) | - (Canvas 는 학생 단위가 기본) | - | O (신규 [C]): "문항 중심" 모드 → QuestionDetailPanel | xnquiz 만 1-N 단위로 한 문항을 전 학생에 걸쳐 채점 가능 |
| Grade By Question 모드 | O (user 설정 `enable_speedgrader_grade_by_question` ON 일 때) | O | O (차이: "문항 중심" 탭으로 동등 기능, 사용자 설정 불필요) | |
| Grade by Question 경고 (Group 무작위 출제 시) | O (".grade-by-question-warning") | O | - | xnquiz 는 그룹 무작위 출제 미지원이라 해당 없음 |
| 학생 네비 (이전/다음 학생) | O (J/K 단축키 + 드롭다운) | O | O (차이: 좌측 리스트 클릭만, 단축키 없음) | |
| 익명 채점 | O (anonymous_submissions, "Student 1, 2..." 익명화) | O | - | xnquiz 는 익명 채점 미지원 |
| 미채점 ⚠ 아이콘 | O | O | O (차이: "미채점" 호박 배지 + 좌측 호박 강조 바) | |
| 정답/오답 색상 표시 | O (초록/빨강/회색) | O | O (차이: emerald/red, 자동채점만) | |
| 부분 점수 표시 | O (Fill in Multiple Blanks 등 빈칸별 점수) | O | O (차이: 점수 input 으로 직접 입력 + "수정됨" 배지) | |

### 2-4. 점수 조정 / 채점

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 점수 input (총점) | O (text input + points_possible 표시) | O | O (차이: 문항별 number input, min 0 max points step 0.5) | |
| Update Scores 버튼 | O (form submit, `PUT /quizzes/:id/quiz_submissions/:sid?override_scores=true`) | O | O (차이: "저장" 버튼 + "점수 저장 ({N})" 배치) | |
| 자동 채점 / 수동 조정 점수 분리 | O (사이드바 표시) | O | O (차이: 가산점(`fudgePoints`) 별도 표시) | |
| Excused 토글 | O | O | - | xnquiz 는 면제 처리 미지원 |
| Late 페널티 | O (라벨 표시) | O | O (차이: "지각 제출" 배지만, 자동 감점 정책 없음) | |
| Post Grades 버튼 (Manual posting policy) | O (학생에게 점수 공개) | O | - (정책 차이) | xnquiz 는 점수 공개를 별도 정책으로 (revealResults) |
| 가산점 (fudge points) | - (별도 UI 없음, 수동 점수 조정으로만) | - | O (신규 [C]): 학생별 1개, 마이너스/숫자/플러스, 0이면 미표시 | "총점에 +/- 점수를 가감합니다" 팝오버 |
| "수정됨" 배지 | - | - | O (신규 [C]): 자동채점 결과를 수동 오버라이드한 경우 | |
| 좌측 강조 바 (변경/미채점) | - | - | O (신규 [C]): 변경=파랑 / 미채점=호박 | |

### 2-5. 일괄 채점

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 문항 전체 학생 정답 처리 | - | - | O (신규 [C]): "전체 정답" 버튼 | |
| 문항 전체 학생 오답 처리 | - | - | O (신규 [C]): "전체 학생 0점 처리" 드롭다운 | |
| 문항 미제출자만 0점 처리 | - | - | O (신규 [C]): "미제출자만 0점 처리" 드롭다운 | |
| 학생의 모든 문항 정답/오답 처리 | - | - | O (신규 [C]): "모든 문항 정답" / "모든 문항 오답" 더보기 메뉴 | |
| 엑셀 일괄 채점 (xlsx 업로드) | - (Canvas 는 Gradebook 의 CSV import 로만, 퀴즈 단위는 없음) | - | O (신규 [C]): `ExcelModal` "엑셀 일괄 채점" | 양식 다운로드 + 업로드 + 검증 |
| 양식 검증 (배점 초과 / 학번 매칭 실패) | - | - | O (신규 [C]): 오류 시 전체 업로드 불가 | |
| 일괄 채점 확인 다이얼로그 | - | - | O (신규 [C]): `window.confirm("{scope} {N}명 전원에게 ...")` | "기존 채점 결과는 모두 덮어씁니다" |

### 2-6. 모더레이션 (시간 연장 / 시도 추가)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Moderate Quiz 화면 | O (`/quizzes/:id/moderate`) | O | - | xnquiz 는 ConditionalRetakeModal 로 일부 대체 |
| Extra Attempts (개별 학생) | O (`extension_extra_attempts`, allowed_attempts > 0) | O | O (차이: 조건부 재응시 모달의 "추가 응시 횟수" 1~5) | xnquiz 는 조건 기반 일괄 부여 |
| Extra time on every attempt | O (time_limit > 0) | O | - | xnquiz 는 개별 시간 연장 미지원 |
| Extend Time (이번 시도만 시간 추가) | O (`#extend_time_dialog`, "Maximum of 1440 minutes (24 hours)") | O | - | |
| Manually Unlock for next attempt | O (`extension_manually_unlocked`) | O | - | |
| Let student see results one more time | O (`extension_reset_has_seen_results`, one_time_results 일 때) | O | - | |
| Change Extensions for N Selected (일괄) | O (`.moderate_multiple_link`) | O | O (차이: 조건부 재응시 일괄 부여) | |
| Outstanding Submissions 처리 (autosubmit) | O (학생이 페이지 떠나 자동 저장 안 됨 → 일괄 제출) | O | - | xnquiz 는 마감 후 자동 0점 처리로 대응 |
| 조건부 재응시 부여 (미응시 / 점수 미달) | - | - | O (신규 [C]): 3-step 스테퍼 | "조건 설정 → 대상자 확인 → 횟수 부여" |
| 재응시 기한 별도 지정 | - | - | O (신규 [C]): DateTimePicker, "미설정 시 기존 퀴즈 마감일을 따릅니다" | |
| 마감 후 자동 0점 처리 | - (Outstanding 알림으로만) | - | O (신규 [C]): `autoSubmitExpiredStudents` 유틸 | 채점 완료로 집계 |

### 2-7. SpeedGrader 고유 기능

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| SpeedGrader 별도 SPA | O (`/courses/:cid/gradebook/speed_grader`) | O | - | xnquiz 는 단일 화면 통합 |
| 학생 사진/아바타 | O | O | O (차이: 이름 첫 글자 텍스트 아바타) | |
| 음성 메모 (Media Comment) | O | O | - | xnquiz 미지원 |
| 파일 첨부 (코멘트에) | O | O | - | |
| 코멘트 라이브러리 (저장된 템플릿) | O | O | - | |
| Rubric (루브릭 채점) | O ("View Rubric" / "Show Rubric") | O | - | xnquiz 는 루브릭 미지원 |
| Assessment Audit Tray | O (`additional_speedgrader_audit_logging`) | O | O (차이: 활동 로그 탭으로 분리) | xnquiz 는 학생 응시 행동 로그, Canvas 는 채점 변경 로그 |
| 키보드 단축키 (J/K, Ctrl+M) | O | O | - | xnquiz 미구현 |
| Submission List (시도별 점수) | O ("Attempt N: 점수") | O | - | |
| Settings 기어 (Options 모달) | O | O | - | |
| Help 링크 / Keyboard Shortcuts | O | O | - | |
| Mute/Unmute 토글 | O (점수 공개 음소거) | O | - (정책 차이) | |
| 사이드바 lock 아이콘 | O (응시 잠금 상태) | O | - | |

### 2-8. 코멘트

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 텍스트 코멘트 (단방향) | O (SpeedGrader textarea) | O | - | |
| 코멘트 스레드 (양방향 메시징) | - | - | O (신규 [C]): `CommentThread`, 좌/우 분리 버블 | "교수자에게 답변하기" / "학생에게 전달할 코멘트" |
| 안 읽은 카운트 배지 | - | - | O (신규 [C]): 탭에 빨강 배지 | 탭 진입 시 자동 read |
| Enter = 전송 / Shift+Enter = 줄바꿈 | - (Canvas 는 buttons) | - | O (신규 [C]) | |
| 빈 상태 메시지 | O | O | O (차이: "아직 코멘트가 없습니다") | |

### 2-9. Message Students Who

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 조건 기반 학생군 메시지 발송 | O (S-03 메뉴에서 진입, `:grade && :send_messages && available? && !anonymous_submissions? && graded?`) | O | - | xnquiz 미지원 |
| anonymous_submissions 일 때 비활성 | O | O | - | |

### 2-10. 활동 로그

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| View Log (Quiz Log Auditing) | O (`feature(:quiz_log_auditing) && :view_log`, `/quiz_submission_events`) | O | - | Canvas 의 quiz_log_auditing 기능 |
| 응시 행동 로그 (start / navigate / answer_change / focus_loss / focus_gain / autosave / submit) | - | - | O (신규 [C]): `ActivityLogPanel` | 학생 중심 모드 탭으로 노출 |
| 통계 요약 5칸 (제출일시 / 응시 시작 / 소요 시간 / 포커스 이탈 N회 / 답변 변경 N회) | - | - | O (신규 [C]) | |
| 타임라인 (시:분:초 + 액션 배지 + 설명) | - | - | O (신규 [C]) | |
| 빈 상태 안내 (응시하지 않은 학생) | - | - | O (신규 [C]): "이 학생은 본 화면에서 직접 응시하지 않아 기록이 없습니다." | |

### 2-11. 다운로드

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Submissions Zip (file_upload 문항) | O (S-06 통계의 FileUploadRenderer 에서 "Submissions Zip" 링크) | O | O (차이: file_upload 일 때만 "제출물 일괄 다운로드" 버튼 + 토스트 "프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다") | |
| 문제지 PDF | - | - | O (신규 [C]): "내보내기" 드롭다운 | |
| 답안지 Excel | - | - | O (신규 [C]): "답안지 Excel 다운로드" | |
| 답안지 PDF 일괄 | - | - | O (신규 [C]): "답안지 PDF 일괄 다운로드" | |
| PDF 생성 진행 토스트 | - | - | O (신규 [C]): 우하단 회전 스피너 + "{type} PDF 생성 진행중" | |

### 2-12. 통계 탭 (S-05 내부)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 요약 4지표 (문항 평균 / 최고 / 최저 / 채점 완료) | - (S-06 통계에 있음, 채점에는 없음) | - | O (신규 [C]): 문항 중심 모드 통계 탭 | |
| 점수 분포 차트 (BarChart) | - | - | O (신규 [C]) | "채점 완료된 학생이 없습니다" 빈 상태 |
| 정답률 진행률 바 (자동채점 문항만) | - | - | O (신규 [C]): "{N}%" + "정답 {N}명 \| 오답 {N}명" | |

### 2-13. 빈 상태 / 엣지 케이스

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| anonymous_submissions 행 익명화 | O | O | - | |
| 학생이 응시 중일 때 시도 추가 | O (`extendable` 상태 강조) | O | - | |
| Outstanding (학생이 페이지 떠남) | O (상단 알림 + Autosubmit 다이얼로그) | O | - (정책 차이) | xnquiz 는 마감 후 자동 0점 |
| draft 상태 진입 | - (응시 자체가 안 됨) | - | O (신규 [C]): 전용 안내 화면 | |
| 마감 후에도 시간 연장 경고 | O ("Quiz attempts whose availability dates have passed will still auto-submit even if the extended time has not expired.") | O | - | |
| 검색 결과 없음 | - | - | O (차이: "검색 결과가 없습니다") | |
| 학생 미선택 시 우측 패널 | - (SpeedGrader 는 항상 첫 학생) | - | O (차이: "학생을 선택하면 전체 문항 답안을 확인할 수 있습니다") | |
| 문항 미선택 시 우측 패널 | - | - | O (차이: "문항을 선택하면 학생 답안을 채점할 수 있습니다") | |

### 2-14. 모바일 / 반응형

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 모바일 탭 전환 (목록 ↔ 상세) | - | - | O (신규 [C]): "문항 목록 / Q{n} 상세" 또는 "학생 목록 / {name}" | |

---

## 3. 시스템별 상세

### 3-1. Canvas 표준에만 있는 기능 (xnquiz 가 채택 안 한 것들)

- **SpeedGrader 별도 SPA**: 학생 한 명씩 좌측 답안 / 우측 사이드바(점수+코멘트)로 채점하는 메인 도구. xnquiz 는 단일 화면 통합으로 대체.
- **음성 메모 (Media Comment)**, **파일 첨부 코멘트**, **코멘트 라이브러리** (저장된 템플릿).
- **Rubric** (루브릭 채점 UI). "View Rubric" / "Show Rubric".
- **Assessment Audit Tray** (`additional_speedgrader_audit_logging`). 채점자 변경 로그.
- **키보드 단축키**: J/K (학생 이동), Ctrl+M (코멘트 포커스) 등.
- **Excused 토글**: 학생 면제 처리.
- **Post Grades 버튼** (Manual posting policy): 학생에게 점수 공개 시점 제어.
- **Mute/Unmute 토글**.
- **익명 채점** (anonymous_submissions): "Student 1, 2..." 익명화.
- **Moderate Quiz 화면 전반**: Extra Attempts / Extra Time / Manually Unlocked / Reset has seen results / Outstanding Submissions(autosubmit) 다이얼로그.
- **Message Students Who...**: 조건 기반 학생군 메시지 발송.
- **View Log** (`quiz_log_auditing` 기능 flag): `/quiz_submission_events` 응시 이벤트 로그.
- **시도별 Submission List** (사이드바): "Attempt N: 점수" + 미채점/pending review 아이콘.
- **Allow extra attempt 폼** (Quiz History): "{user} has no attempts left" + "Allow this student an extra attempt".
- **Section Select**: Moderate / SpeedGrader 에서 강좌 섹션별 필터.

### 3-2. LearningX custom.js delta

- **S-05 채점 화면 자체에는 적용되는 custom 없음**. Canvas 의 SpeedGrader / Moderate Quiz / Quiz History 화면을 그대로 사용.
- 단, 채점 결과에 영향을 주는 흐름은 S-04 편집 화면과 S-06 통계 화면의 custom 에 있음:
  - `custom.quiz-rescore.example.js`: 단답형 강제 재채점 버튼 (편집 화면) + 문제은행 답안 수정 재채점 버튼 (통계 화면). 둘 다 LearningX 자체 엔드포인트 (`/learningx/api/v1/.../questions/:qid/rescore` 또는 `force-rescore`) 를 호출.
  - 이 재채점이 실행되면 S-05 의 학생 점수가 변하지만, S-05 화면 자체에 버튼/안내가 추가되지는 않음.

### 3-3. xnquiz 신규 기능

| **ID** | **라벨** | **기능** | **동작** |
| --- | --- | --- | --- |
| [C] | 단일 화면 통합 | 응시자 리스트 + 학생별 채점 + 문항별 채점 + 모더레이션 + 활동 로그 + 코멘트 + 통계를 하나의 SPA 로 통합 | `/quiz/:id/grade` |
| [C] | 문항 중심 모드 | 한 문항에 대한 전체 학생 답안을 한 화면에서 채점 | 좌측 QuestionItem 목록 + 우측 QuestionDetailPanel |
| [C] | 학생 중심 모드 | 한 학생의 전체 문항 답안을 한 화면에서 채점 | 좌측 StudentListPanel + 우측 StudentDetailPanel (답안/활동 로그/코멘트 탭) |
| [C] | 문항 정렬 옵션 | "미채점 우선" (기본) / "문항 번호순" | QuestionItem 좌측 패널 |
| [C] | 채점 상태 필터 | "채점 완료" / "미채점" 체크박스 드롭다운 | ResponsesTab |
| [C] | 제출 상태 세그먼트 | "전체 / 정상제출 / 지각제출 / 미제출" 카운트 토글 | ResponsesTab |
| [C] | 가산점 (Fudge points) | 학생별 1개, step 0.5. 양수 `+N` / 음수 그대로 | ScoreControls + 가산점 Popover |
| [C] | 문항 전체 정답/오답 일괄 처리 | 한 문항을 전 학생 만점 또는 0점으로 | "전체 정답" / "전체 오답" 드롭다운 |
| [C] | 미제출자만 0점 처리 | 미제출 학생만 0점 처리 | "전체 오답" 드롭다운 옵션 |
| [C] | 학생의 모든 문항 정답/오답 | 한 학생의 모든 문항을 정답 또는 오답 처리 | 더보기 메뉴 |
| [C] | 엑셀 일괄 채점 | 양식 다운로드 → 점수 입력 → 업로드. 검증 후 미리보기 → 적용 | `ExcelModal` |
| [C] | 조건부 재응시 | 3-step 스테퍼로 조건 설정 → 대상자 확인 → 횟수/기한 부여 | `ConditionalRetakeModal` |
| [C] | 마감 후 자동 0점 처리 | `autoSubmitExpiredStudents` 유틸이 마감 경과 후 미시작자에게 0점 마킹 (`submitted=true, autoSubmitted=true`) | `utils/deadlineUtils` |
| [C] | 활동 로그 (응시 행동) | start / navigate / answer_change / focus_loss / focus_gain / autosave / submit 타임라인 | `ActivityLogPanel` |
| [C] | 코멘트 스레드 (양방향) | 교수자 ↔ 학생 메시지 thread, 안 읽은 카운트 배지 | `CommentThread` |
| [C] | 통계 탭 (문항 단위) | 4지표 + 점수 분포 차트 + 정답률 진행률 바 | 문항 중심 모드 내부 탭 |
| [C] | "수정됨" 배지 | 자동채점 결과를 수동 오버라이드한 경우 호박 배지 | QuestionCard |
| [C] | 좌측 색 강조 바 | 변경됨 = 파랑 / 미채점 = 호박, 변경이 우선 | StudentRow / QuestionCard |
| [C] | 학생 학번 표기 | 이름 옆 학번 회색 배지 | 도메인 특화 (Canvas 는 SIS ID 별도) |
| [C] | 문제지 PDF / 답안지 Excel / PDF 일괄 다운로드 | "내보내기" 드롭다운 | |
| [C] | 모바일 탭 전환 | "문항 목록 / Q{n} 상세" 또는 "학생 목록 / {name}" | mobileView state |
| [C] | draft 전용 차단 화면 | 임시저장 상태일 때 채점 화면 대신 안내 | "퀴즈 편집하기" CTA |
| [C] | 미제출자 카드 (UnsubmittedCard) | 미제출 학생을 응시 현황 리스트에 한 행으로 표시 | "제출되지 않았습니다" 이탤릭 |
| [C] | scrollbar-thin 스타일 | 채점 패널에 얇은 스크롤바 | |

---

## 4. 핵심 차이 요약

**Canvas → LMS → xnquiz 진화 흐름**

**1단계 (Canvas 표준)**. Canvas 는 "학생 한 명씩, 한 시도씩" 채점을 전제로 SpeedGrader 라는 별도 SPA 를 메인 도구로 둔다. 응시자 리스트, 시간/시도 연장 (Moderate Quiz), 한 시도 채점 (Quiz History), 학생군 메시지 (Message Students Who...) 가 모두 별도 화면이라 채점 한 번에 화면 4개를 오가야 한다. 대신 익명 채점, 루브릭, 음성/파일 코멘트, 키보드 단축키, Excused 처리 등 채점자 워크플로우는 깊다.

**2단계 (LearningX custom)**. LearningX 는 S-05 채점 화면 자체에는 손대지 않았다. custom.js 보강은 S-04 편집 화면과 S-06 통계 화면의 "재채점" 기능에 집중되어 있어서, 채점 결과에 영향은 주지만 채점 화면 UI 는 Canvas 그대로다. 즉 LMS 단계는 "Canvas 채점 화면 = OK" 라는 정책 판단으로 보인다.

**3단계 (xnquiz)**. xnquiz 는 채점 화면을 단일 SPA 로 완전히 재설계했다. 핵심 변화는 4가지. (1) "문항 중심" 모드를 추가해서 한 문항에 대한 전 학생 답안을 한 번에 채점 가능 (Canvas 의 Grade by Question 을 화면 단위로 격상). (2) 일괄 채점 (전체 정답/전체 오답/미제출자만 0점/엑셀 업로드) 으로 운영 효율 향상. (3) 조건부 재응시 (미응시/점수 미달 기반 일괄 부여) 로 Moderate Quiz 의 개별 조정을 일괄 대체. (4) 활동 로그 (학생 응시 행동) + 코멘트 스레드 (양방향) 로 부정행위 추적 + 학생 소통을 통합.

**트레이드오프**. xnquiz 는 SpeedGrader 의 깊이 (익명 채점, 루브릭, 음성/파일 코멘트, 키보드 단축키, Excused, Section 필터) 를 포기하고, 한국 대학 운영 시나리오 (대규모 학생 일괄 처리, 학번/주차 기반 식별, 자동 0점 처리, 활동 로그 기반 부정행위 의심 검토) 에 최적화했다. 모더레이션은 "개별 시간 연장" 을 완전히 빼고 "조건부 재응시 일괄 부여" 만 남겼다.

**남은 격차**. Canvas 의 익명 채점, Excused, Rubric 은 향후 도입 검토 필요. Moderate Quiz 의 "개별 학생 시간 연장" 은 한국 대학에서도 종종 필요한 기능 (장애 학생 / 시험 도중 기술적 문제) 인데 xnquiz 가 누락한 부분.

---

## 5. 누락 의심 / 확인 필요

- **Canvas 의 "Mute/Unmute" 토글이 xnquiz 의 점수 공개 정책 (revealResults) 과 어떻게 매핑되는지** 불명확. xnquiz 는 정책 기반이라 학생별 토글이 없는데, 교수자가 "이 학생만 점수 보류" 같은 케이스를 다룰 수 있는지 확인 필요.
- **xnquiz 의 "프로토타입: 실제 파일 다운로드는 API 연동 후 지원됩니다" 토스트**: file_upload 문항 답안 일괄 다운로드는 mock 단계에서 미구현. API 연동 후 동작 검증 필요.
- **Canvas 의 Quiz Log Auditing (`/quiz_submission_events`) 과 xnquiz 의 활동 로그 비교**: 둘 다 응시 이벤트 로그지만, Canvas 는 서버에 모두 기록 / xnquiz 는 localStorage 기반 (mock 모드). API 모드에서 어떤 이벤트가 서버에 영속화되는지 확인 필요.
- **익명 채점 / Excused / Rubric**: xnquiz SSD 에 명시 없음. 의도적 미지원인지 향후 추가 예정인지 결정 필요.
- **LearningX 자체 화면 영역**: AI 시험감독, 시험 응시 전 필수 동의, TrustLock / ProctoringX 안내 페이지가 LMS 에 있는데, xnquiz 가 이걸 어떻게 흡수할지 (자체 구현 / Canvas 위임 / 미지원) 미정.
- **xnquiz 의 학생별 시간 연장 미지원**: Canvas Moderate Quiz 의 "Extra time on every attempt" + "Extend Time" 이 둘 다 없음. 장애 학생 / 사고 학생 대응을 어떻게 할지 정책 필요.

---

## 6. 자기 점검 체크리스트

- [x] Canvas SpeedGrader / Moderate Quiz / Quiz History 의 핵심 영역 (헤더 / 학생 리스트 / 응답 보기 / 점수 조정 / 모더레이션 / 코멘트 / Message Students Who / View Log / 엣지 케이스) 모두 행으로 분리
- [x] xnquiz 의 모드 2개 (문항 중심 / 학생 중심), 패널 (QuestionItem / QuestionDetailPanel / StudentListPanel / StudentDetailPanel), 일괄 채점 (3종), 활동 로그 (7종 이벤트), 코멘트, 통계 탭 모두 매트릭스에 포함
- [x] LMS delta = "없음" 을 명시하고 S-04/S-06 의 재채점 흐름이 S-05 점수에 영향을 준다는 점 보강 설명
- [x] [C] 신규 기능 24개를 별도 표로 정리
- [x] 영역 분리 표 14개 (한 표 몰빵 금지)
- [x] 표 헤더 굵게, 셀 표기 규칙 (O / O (차이: ~) / - / O+custom / O (신규 [C])) 준수
- [x] 가운뎃점 미사용, 이모지 미사용
- [x] 한국어 UI 라벨 따옴표 인용 + Canvas 영문은 영문 그대로 / 한글 번역 병기
