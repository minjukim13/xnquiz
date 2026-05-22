# S-02. 퀴즈 생성/편집 (Canvas Classic Quizzes 표준 AS-IS)

- **상위 문서**: [URD 통합 README](../README.md)
- **관점**: Canvas LMS Classic Quizzes 원본 동작. LearningX custom.js / xnquiz 개선 사항 포함하지 않음. New Quizzes (quiz_lti) 는 대상 외.
- **참고 소스**: Canvas LMS `app/controllers/quizzes/quizzes_controller.rb`, `app/views/quizzes/quizzes/new.html.erb`, `app/views/quizzes/quizzes/edit.html.erb`, `app/views/quizzes/quizzes/_form.html.erb`, `config/routes.rb` 의 `resources :quizzes` 블록
- **경로 (Canvas 원본)**: 생성 진입 `POST /courses/:course_id/quizzes/new`, 편집 화면 `GET /courses/:course_id/quizzes/:quiz_id/edit`
- **상태**: Draft

## 0. 통합 명세 범위 (생성 모드 / 편집 모드)

Canvas Classic Quizzes 는 **생성과 편집을 사실상 같은 폼 화면으로 처리**한다. 목록의 "+ 퀴즈(+ Quiz)" 버튼은 사용자에게는 "생성" 으로 보이지만, 내부적으로는 빈 퀴즈를 즉시 데이터베이스에 저장(`POST /quizzes/new`)한 다음 곧바로 편집 화면(`/quizzes/:quiz_id/edit`)으로 리디렉션한다. 따라서 본 문서는 편집 폼을 기준으로 한 번에 명세하고, "생성 직후 진입" 과 "기존 퀴즈 편집 진입" 의 차이는 별도 절로 다룬다.

| **모드** | **사용자 동선** | **폼 상태** | **하단 버튼 구성** |
|---|---|---|---|
| 생성 직후 (실제로는 편집 화면) | 목록에서 "+ 퀴즈" 클릭 → 자동 POST + 리디렉션 | 빈 폼 + 기본값 (미공개 상태로 이미 DB에 저장됨) | 취소(Cancel) / 저장 후 게시(Save & Publish) / 저장(Save) |
| 편집 진입 | 목록 카드의 편집(Edit) 메뉴 또는 상세에서 진입 | 기존 값 채워진 폼 | 취소(Cancel) / 저장 후 게시(Save & Publish, 미공개일 때만) / 저장(Save) |

> "+ 퀴즈" 클릭 즉시 DB 레코드가 생성된다는 점은 사용자가 모르고 지나가는 동작이다. 작성 도중 브라우저를 닫아도 "임시저장" 같은 별도 동작 없이 미공개(unpublished) 상태의 빈 퀴즈가 목록에 남는다. (xnquiz 의 "임시저장" 과 다른 개념이다.)

## 1. 진입 위치 및 권한 정책

### 진입 위치

| **경로** | **HTTP** | **동작** |
|---|---|---|
| `POST /courses/:course_id/quizzes/new` | POST | 빈 퀴즈 레코드 생성 후 `/quizzes/:quiz_id/edit` 로 리디렉션. 목록 헤더의 "+ 퀴즈(+ Quiz)" 버튼이 호출 |
| `GET /courses/:course_id/quizzes/:quiz_id/edit` | GET | 기존 퀴즈 편집 폼 렌더링. 목록 카드의 편집(Edit) 메뉴, 상세 화면의 편집 버튼, 또는 URL 직접 진입 |

### 권한 분기

| **권한 플래그** | **동작** |
|---|---|
| `permissions.create` (퀴즈 생성 권한) | "+ 퀴즈" 버튼 노출, `POST /quizzes/new` 호출 허용 |
| `permissions.update` (현재 퀴즈에 대한 수정 권한) | 편집 화면 정상 렌더링 |
| `permissions.manage` (퀴즈 관리 권한) | 상단 게시 토글, 관리(Manage) 드롭다운 활성 |
| `permissions.manage_assign_to` (할당 대상 관리) | "할당 대상(Assign To)" 버튼 활성 |
| `permissions.read_question_banks` (문제 은행 조회) | 문항 탭의 "문제 찾기(Find Questions)" 버튼 활성 |
| 권한 없음 (학생) | 직접 URL 진입 시 403 Forbidden. 별도 리디렉션 없음 |

## 2. 화면 구성

### 2.1 와이어프레임 (편집 폼)

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠ 일부 학생이 이미 응시했습니다. 문항을 수정하면 재채점을 검토하세요. │
│   (조건: 응시 시작된 퀴즈 편집 시에만 노출)                        │
├──────────────────────────────────────────────────────────────────┤
│ Quiz Title (제목) [_______________________________]              │
│ 100 pts | ⊘ Not Published | [Preview] [Assign To] [⋮ Manage]    │
├──────────────────────────────────────────────────────────────────┤
│ [Details]  [Questions]  [Mastery Paths] (조건부)                 │
├──────────────────────────────────────────────────────────────────┤
│ ▼ Details 탭                                                     │
│  Quiz Instructions (설명) [RCE 에디터, 125px]                    │
│  Quiz Type   [Practice Quiz ▼]                                   │
│  Assignment Group [Assignments ▼] (Graded/Graded Survey 일 때)   │
│  Options                                                         │
│   ☐ Shuffle Answers                                              │
│   ☐ Time Limit  [___] minutes                                    │
│   ☐ Allow Multiple Attempts                                      │
│       Quiz Score to Keep [Keep Highest ▼]                       │
│       Allowed Attempts  ☐ [___]                                  │
│   ☐ Let Students See Their Quiz Responses                       │
│       ☐ Only After Their Last Attempt                           │
│       ☐ Only Once After Each Attempt                            │
│       ☐ Let Students See The Correct Answers                    │
│           Show Correct Answers At [____]                        │
│           Hide Correct Answers At [____]                        │
│   ☐ Show one question at a time                                  │
│       ☐ Lock questions after answering                          │
│  Quiz Restrictions                                               │
│   ☐ Require an access code  [_______]                           │
│   ☐ Filter IP Addresses     [_______]                           │
│  Assign                                                          │
│   Assign to [Everyone ▼]  Due [____] Available [____] - [____]  │
│   [+ Add]   (학생 그룹별 별도 일정 추가)                          │
├──────────────────────────────────────────────────────────────────┤
│  ☐ Notify users this quiz has changed                            │
│  [Cancel]              [Save & Publish] [Save]                   │
└──────────────────────────────────────────────────────────────────┘
```

> 위에서 아래로: 응시 시작 후 경고 배너(조건부), 상단 헤더(제목 + 점수/공개 상태 + Preview/Assign To/Manage), 탭 메뉴, Details 탭 본문(설명, 유형, 옵션, 제한, 할당 영역), 하단 알림 체크박스와 액션 버튼 순서다.

### 2.2 와이어프레임 (학생 화면)

학생은 이 화면 자체에 접근할 수 없다. URL 직접 진입 시 즉시 **403 Forbidden** 이 발생한다 (목록이나 홈으로 리디렉션되지 않는다).

### 2.3 생성 직후 vs 편집 진입 차이

| **항목** | **생성 직후 (빈 폼)** | **기존 퀴즈 편집** |
|---|---|---|
| 폼 초기값 | 모든 필드 기본값/빈 값 | 기존 저장 값 |
| 제목 입력 자동 포커스 | 적용 | 미적용 |
| 게시 상태 배지 | "Not Published" 고정 (방금 생성되었으므로) | 현재 상태에 따라 "Published" 또는 "Not Published" |
| "Save & Publish" 버튼 | 노출 | 미공개(unpublished) 상태일 때만 노출 |
| 응시 시작 경고 배너 | 미노출 | 학생이 응시를 시작/완료한 경우 노출 |
| Master Course 잠금 | 미적용 | 마스터 코스 자식 콘텐츠인 경우, 잠긴 필드는 읽기 전용 처리 |

## 3. 상단 헤더 영역

| **요소** | **표시 조건** | **동작** |
|---|---|---|
| 제목 입력 | 항상 | 텍스트 입력. 최대 254자. 생성 직후에는 자동 포커스 |
| 점수 표시 (예: "100 pts") | 항상 | 문항 점수 합으로 자동 계산. 직접 편집 불가 |
| 공개 상태 배지 ("Published" / "Not Published") | 항상 | 현재 상태 표시. 클릭으로 토글되지 않음 (게시는 하단 버튼) |
| 미리보기 (Preview) 버튼 | `permissions.update` | 교수자 미리보기 모드로 진입 (`?preview=1`). 학생과 동일한 응시 화면을 보여주되 결과는 별도 저장됨 |
| 할당 대상 (Assign To) 버튼 | `permissions.manage_assign_to` | 학생/그룹별 마감일 트레이 오픈 |
| 관리(Manage) 드롭다운 (⋮) | `permissions.manage` | 아래 3.1 참고 |

### 3.1 관리(Manage) 드롭다운 메뉴

| **메뉴 항목** | **표시 조건** | **동작** |
|---|---|---|
| 채점기준표 보기 (Show Rubric) | 평가용 퀴즈에 루브릭이 연결된 경우 | 루브릭 모달 오픈 |
| SpeedGrader | `permissions.grade && published && submitted > 0` | SpeedGrader 새 창 |
| 퀴즈 삭제 (Delete Quiz) | `permissions.delete` | 브라우저 `confirm` 후 DELETE API 호출 |

> Mastery Paths 메뉴 항목은 Details 탭 안의 "Mastery Paths" 탭으로 이동하는 형태로 통합되어 있어, 관리 드롭다운에는 별도 표시되지 않는다.

## 4. Details 탭 컴포넌트별 상세

Canvas 표준 Details 탭은 한 페이지 안에 모든 설정을 세로로 배치한다. xnquiz 처럼 의미 단위로 카드를 나누지 않는다.

### 4.1 기본 정보

| **필드** | **타입** | **필수** | **검증 / 동작** |
|---|---|---|---|
| 퀴즈 제목 (Quiz Title) | text input | 필수 (저장 시) | 최대 254자. 생성 직후 자동 포커스 |
| 퀴즈 설명 (Quiz Instructions) | Rich Content Editor (RCE) | 선택 | HTML 입력 지원. 기본 높이 125px |
| 퀴즈 유형 (Quiz Type) | 드롭다운 | 필수 | 옵션 4종: 연습용 퀴즈(Practice Quiz), 평가용 과제(Graded Assignment), 설문(Survey), 평가용 설문(Graded Survey). 선택 값에 따라 하위 필드 일부가 조건부로 표시/숨김 |
| 과제 그룹 (Assignment Group) | 드롭다운 | 평가용 유형일 때 필수 | Graded Assignment 또는 Graded Survey 일 때만 표시. 기존 과제 그룹 목록에서 선택 |

### 4.2 옵션 영역 (Options)

체크박스가 켜지면 하위 입력이 단계적으로 펼쳐지는 구조다. 동일한 영역 안에 옵션과 그 의존 필드가 함께 배치된다.

| **체크박스** | **표시 조건** | **활성 시 추가 표시 / 동작** |
|---|---|---|
| 답안 순서 섞기 (Shuffle Answers) | 항상 | 객관식/참거짓 등의 선택지를 학생마다 무작위 정렬 |
| 시간 제한 (Time Limit) | 항상 | "Minutes" 정수 입력 노출. 0 또는 빈 값은 무제한과 동일하게 동작 |
| 자동 제출 비활성화 (Disable Automatic Submission) | 시간 제한 ON + 계정 기능 플래그 활성 | 시간이 끝나도 자동 제출하지 않고 학생이 수동 제출하도록 함 |
| 응시 익명 유지 (Keep Submissions Anonymous) | 퀴즈 유형이 Survey / Graded Survey 일 때만 | 교수자 화면에서 응시자 신원을 식별 불가하게 처리 |
| 복수 응시 허용 (Allow Multiple Attempts) | 항상 | 하위에 "Quiz Score to Keep", "Allowed Attempts" 노출 |
| 적용할 점수 (Quiz Score to Keep) | 복수 응시 허용 ON | 드롭다운: 최고 점수 유지(Keep Highest, 기본), 최근 점수 유지(Keep Latest), 평균 점수(Average) |
| 응시 횟수 (Allowed Attempts) | 복수 응시 허용 ON | 정수 입력. 비워두면 무제한 (`-1`) |
| 학생 응답 공개 (Let Students See Their Quiz Responses) | 항상 | 학생이 본인 답안과 정오 표시를 볼 수 있음. 하위 옵션 단계적 노출 |
| 마지막 응시 후만 (Only After Their Last Attempt) | 학생 응답 공개 ON | 모든 응시를 소진한 뒤에만 결과 노출 |
| 응시마다 1회만 (Only Once After Each Attempt) | 학생 응답 공개 ON | 매 응시 후 한 번만 결과 화면 조회 가능 |
| 정답 공개 (Let Students See The Correct Answers) | 학생 응답 공개 ON | 학생이 정답까지 볼 수 있음. 하위에 공개 기간 입력 노출 |
| 정답 공개 시작 (Show Correct Answers At) | 정답 공개 ON | 날짜/시간 입력. 비워두면 즉시 공개 |
| 정답 공개 종료 (Hide Correct Answers At) | 정답 공개 ON | 날짜/시간 입력. 시작보다 이후여야 함 (저장 시 검증) |
| 한 문항씩 표시 (Show one question at a time) | 항상 | 활성 시 하위에 잠금 옵션 노출 |
| 응답 후 문항 잠금 (Lock questions after answering) | 한 문항씩 표시 ON | 학생이 한 번 응답한 문항으로 뒤로 돌아가지 못함 |

### 4.3 퀴즈 제한 (Quiz Restrictions)

| **체크박스** | **활성 시 추가 표시 / 검증** |
|---|---|
| 응시 코드 요구 (Require an access code) | 텍스트 입력 노출. 학생이 응시 시작 시 같은 코드를 입력해야 함. 평문 저장 |
| IP 주소 필터 (Filter IP Addresses) | 텍스트 입력 노출. 형식: `192.168.217.1`, CIDR `192.168.217.1/24`, 서브넷 마스크 `192.168.217.1/255.255.255.0` 허용. 여러 값은 쉼표로 구분 |

### 4.4 할당 영역 (Assign)

학생/그룹별로 별도의 일정을 부여하는 영역이다. 한 카드 안에 마감일, 응시 가능 기간, 대상이 들어가고 "+ Add" 로 카드를 늘려간다.

| **필드** | **타입** | **동작** |
|---|---|---|
| 할당 대상 (Assign to) | 다중 선택 (학생/섹션/그룹) | 기본 카드는 "Everyone"(전체) |
| 마감 일시 (Due) | 날짜/시간 입력 | 학생이 늦지 않게 제출해야 하는 기한 |
| 응시 가능 시작 (Available from) | 날짜/시간 입력 | 학생 화면에 퀴즈가 보이기 시작하는 시점 |
| 응시 가능 종료 (Until) | 날짜/시간 입력 | 학생이 퀴즈 페이지 자체에 접근할 수 없게 되는 시점 |
| 추가 할당 (+ Add) | 버튼 | 카드 복제, 다른 학생 그룹에 다른 일정을 부여 가능 |

> 같은 학생이 두 카드에 포함되면 저장 시 서버 검증에서 오류가 발생한다 (클라이언트는 사전에 차단하지 않는다).

### 4.5 그 외 옵션

| **체크박스** | **표시 조건** | **동작** |
|---|---|---|
| 성적부에서 숨김 (Hide from gradebook view and student grades view) | 계정에서 해당 기능 활성화 시 | 성적부와 학생 성적 화면에서 이 퀴즈 점수를 숨김 |
| SIS 동기화 (Sync to [SIS Name]) | SIS 통합 활성 계정 | 점수를 학사 정보 시스템(SIS) 으로 전송 |
| Respondus LockDown Browser 요구 | LockDown Browser 통합 활성 계정 | 학생이 응시 시 전용 브라우저 필요. 결과 조회 시 LDB 요구 옵션도 함께 노출 |

## 5. Questions 탭

문항 자체의 작성 흐름은 본 화면 명세 범위를 넘어가므로, 본 절은 **탭 진입 시 보이는 헤더와 추가 진입 동선** 만 정리한다.

### 5.1 헤더 액션

| **버튼** | **표시 조건** | **동작** |
|---|---|---|
| Show Question Details | 문항 25개 이하 | 체크 시 문항 본문/선택지까지 인라인 노출. 26개 이상이면 성능을 이유로 자동 비활성 |
| 새 문항 (New Question) | `permissions.update` | 인라인 문항 작성 영역 추가 |
| 새 문항 그룹 (New Question Group) | `permissions.update` | 그룹 카드 추가. 그룹 안에서 "N개 중 M개 무작위 출제" 설정 가능 |
| 문제 찾기 (Find Questions) | `permissions.read_question_banks` | 문제 은행 모달 오픈. 기관/과정 수준 은행에서 문항 선택 |

### 5.2 문항 그룹 (Question Group)

| **필드** | **동작** |
|---|---|
| 그룹명 | 자유 입력 |
| Pick (선택 문항 수) | 그룹 안 문항 중 무작위로 N개를 학생에게 출제 |
| Points per question | 그룹 내 모든 선택 문항에 동일하게 적용되는 배점 |
| Question Bank Link | 그룹을 특정 문제 은행과 연결. 그룹 본문에 문항을 직접 넣지 않고 은행에서 추출 |

### 5.3 지원 문항 유형 (Classic Quizzes 기준)

| **유형 (원문)** | **설명** |
|---|---|
| Multiple Choice | 단일 정답 객관식 |
| True/False | 참거짓 |
| Fill in the Blank | 단답 (한 칸) |
| Fill in Multiple Blanks | 복수 단답. `[blank_name]` 형식 자리표시 |
| Multiple Answers | 복수 정답 객관식. 모든 정답 체크해야 정답 |
| Multiple Dropdowns | 본문 안 여러 위치에 드롭다운. `[dropdown_name]` 형식 |
| Matching | 좌측 항목과 우측 항목 짝짓기. 우측에 함정(distractor) 추가 가능 |
| Numerical Answer | 숫자 답안. 정확 값 또는 허용 범위 지정 |
| Formula Question | 변수 포함 공식. 학생마다 다른 값으로 자동 생성 |
| Missing Word | 본문 중간에 단어 드롭다운 하나 |
| Essay Question | 서술형. 자동 채점 불가, 수동 채점 필요 |
| File Upload Question | 파일 업로드. 자동 채점 불가 |
| Text (no question) | 채점 대상 아닌 텍스트 (안내/구분 용도) |

### 5.4 정렬

문항과 그룹은 드래그 핸들로 순서 변경 가능. 마스터 코스 잠금이 걸린 경우 드래그가 비활성된다.

## 6. Mastery Paths 탭

조건부 콘텐츠 해제(Conditional Release) 기능이 활성화된 계정에서만 탭이 노출된다. 점수 구간별로 다른 후속 콘텐츠를 학생에게 자동 추천하는 규칙을 설정한다. 한국 대학 LMS 운영에서 거의 사용되지 않는 영역이라, 본 URD 에서는 탭의 존재만 기록하고 세부 명세는 생략한다.

## 7. 하단 액션

| **요소** | **표시 조건** | **동작** |
|---|---|---|
| 변경 알림 체크박스 (Notify users this quiz has changed) | 항상 | 활성 시 저장과 함께 응시 대상 학생에게 알림 이메일 발송. 기본 비활성 |
| 취소 (Cancel) | 항상 | 변경사항 폐기, 퀴즈 상세 화면으로 이동. 별도 확인 모달 없음 (브라우저 페이지 이동만) |
| 저장 후 게시 (Save & Publish) | 현재 unpublished 상태일 때만 | 폼 저장 + `workflow_state='published'` 로 전환. 학생 화면에 즉시 노출 |
| 저장 (Save) | 항상 | 폼 저장만. 게시 상태는 변경하지 않음 (unpublished 면 그대로 unpublished) |

### 7.1 저장 검증

Canvas 표준 폼은 클라이언트 검증이 약하다. 대부분 서버에서 검증하고, 실패 시 상단에 오류 메시지를 띄운 채로 화면을 다시 렌더링한다.

| **검증** | **처리 위치** |
|---|---|
| 제목 길이 (254자 초과) | 서버 |
| 시간 제한 음수/문자 | 서버 |
| 정답 공개 종료가 시작보다 빠름 | 서버 |
| Assign 카드에 동일 학생 중복 | 서버 |
| IP 필터 형식 | 서버 |
| Access code 길이/문자 | 별도 검증 없음 (자유 입력) |

## 8. 게시 후 편집 제약

학생 응시가 이미 시작된 퀴즈를 편집할 때, Canvas 는 폼 자체를 잠그지 않는다. 대신 다음 두 가지 안전장치만 제공한다.

| **장치** | **동작** |
|---|---|
| 상단 경고 배너 | "Students have either already taken or started taking this quiz, so be careful about editing it..." 텍스트 노출 (한국어 번역본은 yml 의 학습/응시 안내 문구에 맞춰 표시됨) |
| 재채점 권유 | 문항이나 정답을 바꾼 뒤 저장하면, 이미 응시한 학생을 재채점(regrade)할지 묻는 모달이 표시될 수 있음 |

> 폼 필드 자체는 거의 모두 편집 가능 상태로 유지된다. 수정 내용이 기존 응시 점수에 미치는 영향을 교수자가 판단해야 한다.

## 9. 현재 UI 의 개선 필요 포인트

이 절은 Canvas 표준 퀴즈 생성/편집 화면을 한국 대학 LMS 운영자/교수자 관점에서 사용했을 때 드러나는 UI/UX 개선 포인트를 정리한다.

### 9.1 흐름/구조 측면

| **이슈** | **현재 상태** | **개선 필요 이유** |
|---|---|---|
| 생성 진입 즉시 DB 저장 | "+ 퀴즈" 클릭만으로 빈 퀴즈가 목록에 생성됨 | 사용자가 "취소" 로 이탈해도 빈 퀴즈가 미공개 상태로 남아 목록을 어지럽힌다. "임시저장" 개념이 명시되지 않는다 |
| 모든 옵션이 한 페이지에 세로 나열 | Details 탭 하나에 20개 이상 필드가 펼쳐짐 | 정보 위계가 약해 어떤 옵션이 어떤 상황에 필요한지 한눈에 안 들어온다 |
| 의미 단위 그룹화 부족 | 옵션이 체크박스 + 들여쓰기로만 묶임 | "응시 기간", "응시 설정", "성적 공개", "접근 제한" 같은 의미 단위 카드 구분이 없다 |
| 탭 명칭의 모호성 | "Details" / "Questions" / "Mastery Paths" | "Details" 는 일반 명칭이라 내부에 어떤 설정이 들어가는지 추측이 어렵다 |

### 9.2 정책/옵션 측면

| **이슈** | **현재 상태** | **개선 필요 이유** |
|---|---|---|
| 지각 제출 정책 없음 | 마감(Due) 과 응시 가능 종료(Until) 만 있고, "지각 허용" 개념이 분리되지 않음 | 한국 대학 운영 관행("마감 후 지각 24시간 허용" 등) 을 옵션화하기 어렵다 |
| 위험 조합 경고 없음 | "재응시 허용" + "즉시 정답 공개" 같은 위험 조합도 그냥 저장됨 | 학생이 1차 응시 후 정답을 본 상태로 2차 응시할 수 있는 구조가 무경고로 생성된다 |
| 주차/차시 개념 없음 | 라벨이나 메타 필드로 주차/차시가 없음 | 한국 대학 LMS 의 주차 운영에 매핑할 수 있는 표준 필드가 없다 |
| 안내사항 영역 없음 | 응시 직전 학생에게 보여줄 별도 "안내사항" 입력이 없음 | "제출 후 수정 불가", "협력 금지" 같은 상시 안내를 매번 설명(Instructions) 에 직접 적어야 한다 |
| 자동 제출 유예 시간 없음 | 시간 만료 시 즉시 자동 제출 또는 자동 제출 비활성 두 가지만 존재 | "5분 유예 후 자동 제출" 같은 중간 정책이 없다 |
| 점수 정책 라벨이 영문 중심 | "Keep Highest / Keep Latest / Average" 식 표현 | 비영어권 교수자가 직관적으로 선택하기 어렵다 |

### 9.3 액션/검증 측면

| **이슈** | **현재 상태** | **개선 필요 이유** |
|---|---|---|
| 클라이언트 검증 약함 | 대부분 서버에서 검증되어 실패 시 전체 페이지 재렌더링 | 입력 직후 즉시 피드백을 받지 못해 작성 흐름이 끊긴다 |
| 검증 실패 메시지 위치 | 페이지 상단에 한꺼번에 표시 | 어느 필드가 문제인지 시각적으로 매칭하기 어렵다 |
| 취소 버튼 확인 모달 없음 | "Cancel" 즉시 페이지 이탈 | 실수로 누르면 작성 내용이 그대로 사라진다 (단, 생성 직후 진입의 경우 빈 퀴즈는 DB 에 남아 있음) |
| 변경 알림이 단일 체크박스 | "Notify users this quiz has changed" 하나로 모든 변경을 통보 | 점수 정책 변경과 본문 오타 수정이 같은 강도로 알림 처리된다 |
| 저장 성공 후 토스트 부재 | 저장 후 상세 페이지로 리디렉션될 뿐, 별도 피드백 없음 | 사용자가 저장이 정상 처리됐는지 즉각적으로 확인할 단서가 부족하다 |

### 9.4 게시 후 편집 측면

| **이슈** | **현재 상태** | **개선 필요 이유** |
|---|---|---|
| 응시 시작 후 폼이 사실상 무방비 | 모든 필드가 편집 가능 + 경고 배너 한 줄 | 점수 정책, 문항 점수, 시간 제한을 실수로 바꾸면 기존 응시에 영향이 그대로 누적된다 |
| 재채점 흐름이 모호 | 저장 시 모달로 재채점 여부를 묻는 정도 | 변경 직후 어떤 학생이 어떤 점수로 재계산될지 미리 확인할 동선이 부족하다 |
| 미리보기와 편집 화면 사이 동선이 단절 | Preview 진입 후 사이드바 버튼으로 다시 편집 화면으로 돌아옴 | 편집 도중 "현재 상태로 어떻게 보이는지" 빠르게 확인하는 흐름이 매끄럽지 않다 |

### 9.5 접근성/반응형 측면

| **이슈** | **현재 상태** | **개선 필요 이유** |
|---|---|---|
| 모바일 폼 사용성 | 데스크톱 너비 기준 폼이 그대로 노출됨 | 좁은 뷰포트에서 라벨과 입력이 줄바꿈되어 보기 어렵다 |
| RCE(설명) 영역 키보드 접근 | 에디터 자체는 접근성을 지원하나 폼 흐름 안에서의 탭 이동이 매끄럽지 않음 | 스크린리더 사용자에게 옵션 영역과 본문 영역의 경계가 약하다 |

## 10. Edge Case 및 데이터 처리

| **시나리오** | **Canvas 동작** |
|---|---|
| "+ 퀴즈" 클릭 후 편집 화면에서 곧바로 이탈 | 미공개 상태의 빈 퀴즈가 목록에 그대로 남는다 (이후 사용자가 수동 삭제해야 함) |
| 시간 제한에 0 입력 | 무제한과 동일하게 처리 |
| 응시 가능 종료가 마감보다 이른 경우 | 별도 경고 없이 저장됨. 학생은 마감 전에 퀴즈에 접근하지 못하게 된다 |
| 정답 공개 종료가 시작보다 이르면 | 서버에서 검증 오류 반환 |
| 동일 학생이 두 Assign 카드에 포함 | 서버에서 검증 오류 반환 |
| 학생이 응시를 시작한 후 점수 변경 저장 | 경고 배너 + 재채점 권유 모달 (필드 잠금은 없음) |
| Master Course 의 자식 콘텐츠 편집 | 잠긴 필드(content_is_locked, points_are_locked) 는 읽기 전용 처리 |
| LTI 외부 도구 진입 | Classic Quizzes 의 생성/편집 화면 자체에는 LTI 도구 placement 가 없음 |

## 11. xnquiz (TO-BE) 와 매핑 시 참고할 점

xnquiz 의 코드는 `QuizCreate.jsx` 와 `QuizEdit.jsx` 로 분리되어 있고, SSD 도 S-02 (생성) 와 S-04 (편집) 로 분리되어 있다. 본 URD 는 README 의 통합 룰에 따라 Canvas (AS-IS) 기준 한 화면으로 명세했지만, xnquiz 본문 명세는 두 화면 차이를 그대로 유지한다. 추후 SSD 통합 정리 스프린트에서 같은 통합 룰로 맞출 예정이다.

추가로 본 URD 본문에는 변경 이력 표를 두지 않는다. 변경 사유는 Confluence 페이지 히스토리의 versionMessage 로만 추적한다.
