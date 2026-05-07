# S-04. 퀴즈 편집

> **라벨 규칙**: `[A]` Canvas 기존 기능 / `[B-#NN]` 학교 요구사항 신규 / `[C]` 자체 도출 개선
>
> 본 화면은 S-02(퀴즈 생성) 와 폼/탭 구조가 동일. 이 문서는 **편집 화면에서만 추가되는 기능과 차이점** 위주로 명세하며, 공통 폼 동작은 S-02 를 참조.

## 1. 화면 정보

| **항목** | **내용** |
|---|---|
| 화면 ID | S-04 |
| 라우트 | `/quiz/:id/edit` |
| 진입 권한 | 교수자 (학생 접근 시 자동 리다이렉트) |
| 진입 경로 | 퀴즈 상세(S-03) → 편집 / 퀴즈 목록(S-01) 카드 메뉴 → 편집 |
| 구현 파일 | QuizEdit.jsx |
| 연계 FRD | A-01, R-B-10, R-B-11 |

## 2. 화면 목적

- 기존 퀴즈의 메타/문항/정책을 수정
- 게시(open) 이후에도 안전하게 수정할 수 있도록 영향 범위 명시 + 재채점 트리거

## 3. 영역 구성 (Region Map)

S-02 와 동일 (헤더 / 2탭(기본정보·문항구성) / 푸터 / 모달). 차이점만 명시:

| **영역** | **S-02 와 차이점** |
|---|---|
| 헤더 | "퀴즈 편집" 타이틀 + 현재 상태 배지 노출 |
| 푸터 | draft: "임시저장" 버튼 / open·closed: "임시저장" 버튼 숨김, "저장하기" 만 |
| 본문 | 문항 항목별 "재채점 예정" 배지 (regradeMap 매핑 항목) |
| 모달 | ConditionalRetakeModal 추가 (조건부 재응시 설정 진입) |

## 4. 기능 분류

### 4-1. [A] Canvas 기존 기능 - 기존 Canvas 제공 기능 재구현

| **ID** | **기능** | **동작** | **구현 위치** |
|---|---|---|---|
| A-04-1 | 기존 퀴즈 데이터 로드 | useParams 의 id 로 getQuiz / getQuizQuestions → 폼 hydrate | useEffect 초기 로드 |
| A-04-2 | 메타/정책/문항 수정 | S-02 와 동일한 폼 사용 | InfoTab, QuestionsTab |
| A-04-3 | 문항 추가/수정/삭제 | 기존 문항 클릭으로 수정 모달 진입 (S-02 는 신규만) | AddQuestionModal (편집 모드) |
| A-04-4 | 게시 상태별 공개여부 토글 | draft 일 땐 토글 비활성, open/closed 일 땐 활성 | InfoTab quizStatus 분기 |
| A-04-5 | 임시저장 (draft 만) | status=draft 인 경우만 임시저장 버튼 노출 | InfoTab |
| A-04-6 | 저장 → 변경 적용 | updateQuiz + setQuizQuestions (전체 재생성 방식) | handleSave |

### 4-2. [B] 학교 요구사항 반영 - Canvas 에 없거나 부족하여 학교가 요구한 신규 기능

| **ID** | **라벨** | **기능** | **동작** | **구현 위치** |
|---|---|---|---|---|
| F-04-1 | [B-#11] | 조건부 재응시 설정 진입 | 응시 정책 영역에서 ConditionalRetakeModal 진입. 미응시자/점수 미달자 자동 분류 후 재응시 허용 정책 설정 | ConditionalRetakeModal |
| F-04-2 | [B-#10] | 부분 점수 정책 변경 시 재채점 | 정답/배점 변경 시 기존 응시자에 대한 재채점 옵션 (이전 정답 유지/새 정답만/전원 만점) 선택 | regradeMap, regradeQuestion |

### 4-3. [C] 자체 도출 개선 - Canvas 기존 기능도 아니고 학교 요구도 아닌, 프로젝트 자체 발굴 개선

| **ID** | **라벨** | **기능** | **동작** | **구현 위치** |
|---|---|---|---|---|
| F-04-3 | [C] | 게시 후 편집 시 응시자 경고 | submittedCount > 0 인 문항 수정 시 AddQuestionModal 안에 "현재 n명이 응시 중/완료" 경고 노출 | AddQuestionModal submittedCount prop |
| F-04-4 | [C] | 재채점 예정 배지 | 수정한 문항을 문항 리스트에서 시각적으로 구분 (regradeMap 기반) | QuestionsTab regradeMap |
| F-04-5 | [C] | 마감 자동 재오픈 | closed 상태에서 마감일을 미래로 변경하면 status 가 자동 open 으로 복귀 | computeNextStatus |
| F-04-6 | [C] | 변경 사항 추적 + 페이지 이탈 경고 | useMemo 로 hasUnsavedChanges 계산. dirty 상태 + beforeunload 리스너로 새로고침/뒤로가기 보호 | hasUnsavedChanges |
| F-04-7 | [C] | 저장 후 재채점 결과 토스트 | "n개 문항 재채점 완료, m명에게 점수 변경 적용" 형식으로 영향 범위를 명시 | handleSave 토스트 |
| F-04-8 | [C] | 점수 정책 자동 재계산 | 문항 배점/점수 변경 시 학생별 totalScore 자동 재계산 | recalculateScorePolicy (mock 모드 한정) |

## 5. 화면 상태 (State)

| **상태** | **트리거** | **표현** |
|---|---|---|
| 로딩 | 초기 fetch 중 | 스켈레톤 |
| draft 편집 | quiz.status=draft | "임시저장" + "저장하기" 모두 활성, 공개여부 토글 비활성 |
| open 편집 | quiz.status=open | "저장하기" 만, 공개여부 토글 활성, 재채점 옵션 안내 |
| closed 편집 | quiz.status=closed | "저장하기" + 마감일 미래로 변경 시 재오픈 안내 |
| dirty | hasUnsavedChanges=true | beforeunload 경고 활성, 취소 시 ConfirmDialog |
| 재채점 트리거 | regradeMap 비어있지 않음 | 저장 직전 "재채점 옵션 적용" 안내 |
| 저장 진행 | API 호출 중 | 버튼 비활성 + 스피너 |

## 6. 주요 인터랙션

| **#** | **트리거** | **동작** | **결과** |
|---|---|---|---|
| I-1 | 기존 문항 클릭 | AddQuestionModal 편집 모드 + submittedCount 전달 | 응시자 있는 경우 경고 표시 |
| I-2 | 정답/배점 변경 후 모달 닫기 | regradeMap 에 항목 추가 + 재채점 옵션 캡처 | 문항 리스트에 "재채점 예정" 배지 |
| I-3 | 조건부 재응시 진입 | ConditionalRetakeModal 오픈 | 미응시/점수 미달자 자동 분류 + 정책 저장 |
| I-4 | 임시저장 (draft 일 때만) | 검증 skip + updateQuiz | 목록으로 이동 + 토스트 |
| I-5 | 저장하기 | 검증 → updateQuiz → setQuizQuestions → regradeMap 처리 | 토스트 (재채점 영향 명시) + 목록 |
| I-6 | 마감일 미래로 변경 (closed) | computeNextStatus → status=open | 저장 시 재오픈 안내 |
| I-7 | 페이지 이탈 시도 (dirty) | beforeunload 경고 + ConfirmDialog | 확인 시 변경 폐기 |

## 7. 예외/엣지 케이스

- 게시(open) 후 문항 삭제: 기존 응시자 답안에서 해당 문항 점수가 빠지므로 재채점 자동 트리거
- 응시 중인 학생 있음 + 문항 수정: 수정 후 다음 응시자부터 적용 (이미 제출한 응시자에는 재채점 옵션으로 적용)
- closed 상태에서 마감일 미설정 → "마감일 없이는 재오픈할 수 없음" 안내
- 임시저장 시도 시 status 가 draft 가 아니면 "임시저장은 초안 상태에서만 가능" 알림
- 폼이 dirty 인데 새로고침 시도 → 브라우저 native 경고 + 앱 내 ConfirmDialog
- 전체 문항 삭제 후 저장 → S-02 와 동일하게 검증 차단 (status 가 draft 아닌 경우)

## 8. 미구현 / Open Issue

- recalculateScorePolicy / regradeQuestion 은 mock 전용. api 모드는 서버 재채점 엔드포인트 추후 구현
- 재채점 진행 중 진척도(n/m 명 처리) UI 미구현 - 단순 토스트
- 게시 후 정책 변경 시 학생 측 알림(공지) 미구현
