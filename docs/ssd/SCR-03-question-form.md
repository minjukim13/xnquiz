# SCR-03. 문항 작성 모달 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 문항 작성/편집 모달(AddQuestionModal) + 12 유형별 입력 + 공통 필드(제목/배점/난이도/정답 판정/부분 점수/피드백) + 진입점(직접 작성 / 문제모음 직접 선택 / 랜덤 출제) 통합. 재채점 옵션 모달은 SCR-06 위임 (수정 모드 진입 분기). 문제은행 본체는 SCR-04 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-03-v1.1 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-001](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5075566595) v1.0 (문항 단위 난이도 / Find Questions 필터), [XQ-URD-005](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076615169) v1.0 (문항 단위 정답 판정), [XQ-URD-006](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076877315) v1.0 (교수자 제목 입력), [XQ-URD-007](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076025365) v1.0 (랜덤 출제), [XQ-URD-010](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076549642) v1.0 (문항 단위 부분 점수), [XQ-URD-024](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5078974484) v1.0, [XQ-URD-028](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081563138) v1.0 |
| 참조 코드 | `src/components/AddQuestionModal.jsx`, `src/components/QuestionBankModal.jsx`, `src/components/RandomQuestionBankModal.jsx`, `src/utils/placeholderUtils.js`, `src/components/RichText.jsx` |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
SCR-02 (시험 작성/편집) 의 문항 추가 탭 → 진입점 3종
  ├── "문항 만들기" → AddQuestionModal (직접 작성, SCR-I-QUESTION-FORM)
  │     └── 유형 선택 → 12 유형별 입력 단계 → 추가
  └── "문제모음에서 추가" Popover
        ├── "직접 선택" → QuestionBankModal (SCR-I-QUESTION-BANK-SELECT)
        └── "랜덤 출제" → RandomQuestionBankModal (SCR-I-RANDOM-COMPOSE, 3 step)

SCR-04 (문제은행) 의 문제모음 상세 → "새 문항 추가" → AddQuestionModal (직접 작성)

[수정 모드]
SCR-02 문항 카드 Pencil → AddQuestionModal (수정 모드)
  └── 응시자 보유 + 정답 변경 후 "수정" → RegradeOptionsModal 자동 분기 (SCR-06)

핵심 태스크 클릭 뎁스:
- 새 문항 직접 작성: 문항 추가 탭 → 문항 만들기 → 유형 선택 → 추가 (4단계)
- 기존 모음 재사용: 문항 추가 탭 → 문제모음에서 추가 → 직접 선택 → 문항 선택 → 추가 (5단계)
- 랜덤 출제: 문항 추가 탭 → 문제모음에서 추가 → 랜덤 출제 → 그룹 선택 → 조건 → 검토 → 확정 (7단계)
```

**도달 원칙**

- 목적별 진입 3종이 한 화면에 노출. "문항 만들기" 와 "문제모음에서 추가" 두 버튼 분리.
- AddQuestionModal 은 모달 내부 useState 로 form 상태 보유. 닫으면 사라짐 (퀴즈 단위 임시저장은 SCR-02 의 "임시저장" 버튼으로).
- 수정 모드 + 응시자 보유 시 정답 변경 후 "수정" 클릭은 RegradeOptionsModal 분기 (SCR-06).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-QUESTION-FORM | 문항 작성 모달 (AddQuestionModal, 12 유형 + 공통 필드) | "문항 만들기" / 카드 Pencil | 교수자 | URD-024 UX-P07-010~012/020~022/030/035, URD-028 (12 유형), URD-001 (문항 난이도), URD-005 (문항 단위 정답 판정), URD-006 (제목), URD-010 (문항 단위 부분 점수) | P0 |
| SCR-I-QUESTION-BANK-SELECT | 문제모음 직접 선택 모달 | "문제모음에서 추가" → "직접 선택" | 교수자 | URD-024 UX-P07-040/041, UX-P03-001, URD-001 (난이도 필터) | P0 |
| SCR-I-RANDOM-COMPOSE | 랜덤 출제 조합 모달 (3 step) | "문제모음에서 추가" → "랜덤 출제" | 교수자 | URD-007 UX-P07-001~003/010~013/020~022/030, UX-P05-001~005 | P1 |

---

## 3. 화면별 상세 설계

### SCR-I-QUESTION-FORM. 문항 작성 모달 (AddQuestionModal)

**구현 파일**: `src/components/AddQuestionModal.jsx`

**목적**

직접 작성 진입 후 유형 선택 → 입력 단계까지 한 모달 안에서 처리. 12 유형 + 공통 필드(제목/본문/배점/난이도/피드백) + 유형별 특수 옵션(정답 판정 / 부분 점수 / 채점 기준 등) 통합.

**레이아웃**

```
[Dialog (모달 컨테이너)]
[DialogHeader]
  ├── DialogTitle "문항 만들기" / "문항 수정" (initialQuestion 분기)
  └── DialogDescription "유형을 선택하고 내용을 입력해 주세요"

[유형 선택 영역 (유형 미선택 상태)]
  └── 12종 유형 카드 그리드 (QuestionTypePreview)
       ├── 객관식 (multiple_choice) — CircleDot — "보기 중 1개 선택"
       ├── 참/거짓 (true_false) — ToggleLeft — "참 또는 거짓 선택"
       ├── 다중 답안 (multiple_answers) — ListChecks — "보기 여러 개 동시 선택"
       ├── 단답형 (short_answer) — PenLine — "짧은 텍스트로 답변"
       ├── 서술형 (essay) — AlignLeft — "자유롭게 서술"
       ├── 수치형 (numerical) — Hash — "숫자 정답 + 허용 오차 설정"
       ├── 수식 (formula) — Sigma — "변수로 학생마다 다른 답 생성"
       ├── 짝짓기 (matching) — ArrowLeftRight — "왼쪽-오른쪽 항목 연결"
       ├── 빈칸 채우기 (fill_in_multiple_blanks) — AlignJustify — "여러 빈칸 순서대로 채우기"
       ├── 드롭다운 (multiple_dropdowns) — ChevronDown — "드롭다운에서 항목 선택"
       ├── 파일 업로드 (file_upload) — Paperclip — "파일 업로드로 제출"
       └── 안내문 (text) — Type — "채점 없는 안내문 삽입"

[입력 단계 (유형 선택 후)]
  ├── 유형 표시 (변경 가능, 변경 시 호환 안 되는 입력값 초기화)
  ├── 공통 입력 영역
  │    ├── 제목 (form.title, 선택, URD-006)
  │    │    ├── 미입력 가능
  │    │    └── 입력값은 응시 화면 헤더에 "번호 + 제목" 결합 표시 (SCR-09)
  │    ├── 본문 (form.text, RichTextEditor — HTML, 이미지/iframe 인라인)
  │    ├── 배점 (form.points, 0 이상 숫자, 안내문은 0 고정)
  │    └── 난이도 (form.difficulty, DropdownSelect 4 옵션 — 미설정/상/중/하, URD-001)
  ├── 유형별 입력 영역 (TYPE_META + initForm + isValid + buildQuestion 분기)
  └── 피드백 영역 (선택)
       ├── 정답 시 코멘트 (correct_comments)
       ├── 오답 시 코멘트 (incorrect_comments)
       └── 공통 코멘트 (neutral_comments)
       + 안내: "결과 공개 정책에 따라 학생에게 노출될 수 있습니다"

[푸터]
  ├── 좌측: "취소" (ghost)
  └── 우측: "추가" / "수정" (default + isValid 분기 disabled)
       └── 수정 + 응시자 보유 + 정답 변경 시: RegradeOptionsModal 자동 분기 (SCR-06)
```

**12 유형별 입력 영역**

| **유형** | **TYPE_META.desc** | **입력 영역 요약** | **isValid 조건** | **특수 옵션** |
|---|---|---|---|---|
| `multiple_choice` (객관식) | "보기 중 1개 선택" | 보기 N개 (RichTextEditor) + 정답 인덱스 (1개) | 보기 ≥ 2개 | — |
| `true_false` (참/거짓) | "참 또는 거짓 선택" | 참/거짓 라디오 | 항상 valid (배점 + 본문) | — |
| `multiple_answers` (다중 답안) | "보기 여러 개 동시 선택" | 보기 N개 + 정답 인덱스 배열 + 부분 점수 정책 오버라이드 | 보기 ≥ 2개 + 정답 ≥ 1개 | **부분 점수 정책** (URD-010): `overrideScoring` Toggle → all_correct / partial (none / right_minus_wrong / formula_scoring) |
| `short_answer` (단답형) | "짧은 텍스트로 답변" | 정답 후보 배열 (추가/삭제) | 정답 후보 ≥ 1개 | **정답 판정 옵션** (URD-005): 4종 Toggle(대소문자/앞뒤 공백/연속 공백/모든 공백 제거) — 현재 미구현, 전역 기본값(SCR-05) 사용 |
| `essay` (서술형) | "자유롭게 서술" | 채점 기준 (rubric, 비공개) | 본문 입력 | 수동채점 |
| `numerical` (수치형) | "숫자 정답 + 허용 오차 설정" | 정답 + 허용 오차 | correctNum 숫자 | — |
| `formula` (수식) | "변수로 학생마다 다른 답 생성" | 변수 N개 + 수식 + 오차 타입 + 답 자리수 + 미리보기 | 변수 ≥ 1개 + 수식 평가 가능 | `evalFormulaPreview` 미리보기 |
| `matching` (짝짓기) | "왼쪽-오른쪽 항목 연결" | 좌-우 쌍 N개 + 오답 보기 (distractors) | 쌍 ≥ 2개 | 부분 점수 적용 가능 |
| `fill_in_multiple_blanks` (복수 빈칸) | "여러 빈칸 순서대로 채우기" | 본문 `[1]` `[2]` placeholder + 빈칸별 정답 후보 | placeholder 갯수 = blanks 갯수 + 모든 빈칸에 정답 1개 이상 | 정답 판정 옵션 (URD-005): 전역 기본값 적용. 복수 빈칸 일괄 적용 (UX-P07-004) |
| `multiple_dropdowns` (드롭다운) | "드롭다운에서 항목 선택" | 본문 `[name]` placeholder + 드롭다운별 옵션 + 정답 인덱스 | placeholder 갯수 = dropdowns 갯수 + 각 드롭다운 옵션 ≥ 2개 | 부분 점수 적용 가능 |
| `file_upload` (파일 업로드) | "파일 업로드로 제출" | 추가 입력 없음 (본문만) | 본문 입력 | 수동채점 |
| `text` (안내문) | "채점 없는 안내문 삽입" | 제목 + 본문만 (배점 0 고정) | 본문 입력 | 채점 대상 아님. 학생 응시 화면에 답안 입력 영역 없음 |

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `Dialog` / `DialogHeader` / `DialogTitle` / `DialogDescription` (shadcn) | 모달 컨테이너 |
| `DropdownSelect` (내부) | 난이도 / 유형 변경 등 |
| `Button` (shadcn) | 취소 / 추가·수정 |
| `RichTextEditor` (내부) | 본문 / 객관식 보기 / 빈칸 본문 (HTML 인라인) |
| `richTextHasContent` (유틸) | 입력 여부 검증 |
| `AnswerTextarea` (내부) | 단답형 / 빈칸 정답 후보 (자동 높이) |
| `QuestionTypePreview` (내부) | 12 유형 카드 |
| `placeholderUtils` | `countBlanks` / `countDropdowns` / `hasAllBlankPlaceholders` / `removeAndShiftBlank` |
| `evalFormulaPreview` (내부) | 수식 미리보기 |
| `Switch` (shadcn) | 부분 점수 `overrideScoring` 토글 |
| `RegradeOptionsModal` | 수정 + 응시자 보유 시 자동 분기 (SCR-06 위임) |
| Lucide icons | 12 유형 아이콘 + UI 아이콘 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 모달 진입 (신규) | 유형 미선택 상태로 12종 카드 그리드 노출 |
| I-2 | 모달 진입 (수정, `initialQuestion`) | 해당 유형 입력 단계로 바로 진입. 기존 값 보존 |
| I-3 | 유형 카드 클릭 | `initForm(type)` 으로 form state 초기화 → 입력 단계 |
| I-4 | 유형 변경 | 새 유형의 `initForm()` 으로 초기화. 호환 안 되는 입력값 자동 폐기 (별도 사전 안내 없음) |
| I-5 | 본문 입력 (RichTextEditor) | HTML 저장. 줄바꿈/이미지/iframe 보존 |
| I-6 | 보기/정답 후보/빈칸 입력 | 추가 (AddBtn) / 삭제 (TrashBtn). 빈칸 placeholder 자동 동기화 |
| I-7 | 다중 답안 `overrideScoring` Toggle | 부분 점수 정책 입력 영역 노출. all_correct → penaltyMethod 강제 none |
| I-8 | 피드백 입력 | 독립 입력. 결과 공개 정책에 따라 노출 가능성 안내 |
| I-9 | "추가" 클릭 (isValid 통과) | `buildQuestion()` → 부모 onAdd → 모달 닫힘 |
| I-10 | "추가" 클릭 (isValid 미통과) | 버튼 disabled. 누락 항목 안내 카피 없음 (간극 G-1) |
| I-11 | "수정" 클릭 (응시자 0명) | 즉시 반영 |
| I-12 | "수정" 클릭 (응시자 보유 + 정답 변경) | RegradeOptionsModal 자동 분기 (SCR-06) |
| I-13 | "취소" / 외부 클릭 | 모달 닫힘. form state 사라짐 (간극 G-2) |

**상태 (유형별 분기)**

| **유형** | **특이 상태** |
|---|---|
| `multiple_choice` | 정답 인덱스 1개 필수. 보기 삭제 시 정답 자동 이동 |
| `multiple_answers` | 정답 인덱스 배열. `overrideScoring` 으로 URD-010 정책 오버라이드 |
| `short_answer` | 대소문자/공백 무시 정답 판정. 본체는 자동채점 엔진 |
| `essay` / `file_upload` | 수동채점 배지 (SCR-02 QuestionsTab 카드에) |
| `formula` | 수식 평가 실패 시 isValid=false + 미리보기 영역에 에러 |
| `fill_in_multiple_blanks` / `multiple_dropdowns` | 본문 placeholder 갯수와 정답 배열 갯수 동기화 검증 |
| `text` | 채점 대상 아님. 학생 응시 화면 답안 입력 영역 없음 |

**데이터 흐름**

AddQuestionModal 은 별도 fetch 없이 form state 만 보유. 추가/수정 결과는 상위(QuizCreate/Edit)의 `questions[]` 배열에 콜백으로 전달되어 누적. 실제 DB 저장은 SCR-02 D-3/D-4 의 `setQuizQuestions` 일괄. 단, 수정 모드 + 응시자 보유 + 정답 변경 시 RegradeOptionsModal 분기 (SCR-06).

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 신규 모달 진입 | 없음. `initForm(type)` 만 호출 | 동일 | 유형 카드 그리드 렌더 | (해당 없음) |
| D-2 | 수정 모달 진입 (`initialQuestion`) | 전달받은 question 객체로 form 초기화 | 동일 | 입력 단계 직진 | Question (3.6 전체) |
| D-3 | "추가" / "수정" 클릭 (isValid 통과) | `buildQuestion()` → 부모 `onAdd` 콜백 → 모달 닫힘 | 동일 (서버 호출 없음) | 상위 `questions[]` 배열 갱신 | Question (in-memory) |
| D-4 | 수정 + 응시자 보유 + 정답 변경 | RegradeOptionsModal 자동 분기 (SCR-06 위임) | 동일 | (SCR-06 D 흐름 참조) | Question, Attempt, Answer |

**검증 룰** (클라이언트 → 서버 동일 적용 권고)

| **필드** | **클라이언트 검증** | **서버 검증 권고** | **에러 카피** |
|---|---|---|---|
| `text` | `richTextHasContent()` true | NOT NULL + sanitize | "문항 본문을 입력해주세요" |
| `points` | `>= 0`. `type='text'` 는 0 고정 | 동일 + 정수/0.5 단위 권고 | "배점은 0 이상이어야 합니다" |
| `choices` (mc/ma) | 2개 이상 | 동일 | "보기를 2개 이상 입력해주세요" |
| `correctAnswer` (mc/ma) | 1개 이상 선택 | 동일. `text` 또는 인덱스 일관성 OQ-DD-04 결정 의존 | "정답을 1개 이상 선택해주세요" |
| `correctAnswer` (sa) | 정답 후보 1개 이상 | 동일 | "정답 후보를 1개 이상 입력해주세요" |
| `correctAnswer` (numerical) | 숫자 파싱 가능 | 동일 | "숫자 정답을 입력해주세요" |
| `variables` + `formula` | 변수 1개 이상 + 수식 평가 성공 | 동일 + 수식 평가 timeout 보호 | "수식을 검토해주세요" |
| placeholder 갯수 (fill_in_blanks / dropdowns) | 본문 `[N]`/`[name]` 갯수 = 정답 배열 갯수 | 동일 | (제출 차단, 명시 카피 미구현 G-1) |

---

### SCR-I-QUESTION-BANK-SELECT. 문제모음 직접 선택 모달

**구현 파일**: `src/components/QuestionBankModal.jsx`

**목적**

기존 문제모음에서 문항 단위로 골라 재사용. 다른 과목의 문제모음도 권한 범위 내에서 접근 가능 (UX-P03-001 다강의 보조).

**레이아웃**

```
[Dialog]
[DialogHeader] DialogTitle "문제모음에서 추가"

[Body]
  ├── 과목 / 문제모음 트리 (현재 과목 기본 + 다른 과목 가능)
  ├── 필터 (난이도 — URD-001, 유형, 검색)
  ├── 문항 리스트 (체크박스 다중 선택)
  └── 이미 추가된 문항은 "추가됨" 표시 (added prop)

[Footer]
  ├── 취소
  └── "선택한 문항 추가" (선택 0건 시 disabled)
```

**상태**

| **상태** | **표현** |
|---|---|
| 현재 과목 기본 | 진입 시 현재 과목 모음 노출 |
| 다른 과목 권한 있음 | 트리에서 선택 가능 |
| 다른 과목 권한 없음 | 비노출 또는 사유 안내 (UX-P03-001) |
| 난이도 필터 적용 | 결과 갱신. 미설정/상/중/하 4종 + 전체 |
| 이미 추가된 문항 | "추가됨" 배지 + 체크박스 disable 또는 가시 비활성 |
| 선택 0건 | "선택한 문항 추가" disabled |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 모달 진입 | `listBanks()` + 현재 코스 기본 선택 | `GET /api/banks?courseId=:id` (다른 과목 권한은 별도 ACL 검증) | 코스/은행 트리 렌더 | Course, QuestionBank |
| D-2 | 은행 선택 | `getBankQuestions(bankId)` | `GET /api/banks/:bankId/questions` | 문항 리스트 렌더. `added` prop 으로 이미 추가된 문항 표시 | BankQuestion |
| D-3 | 필터 (난이도/유형/검색) | 클라이언트 필터링 | 동일 (또는 서버 쿼리 파라미터) | 결과 갱신 | BankQuestion (`difficulty`, `type`) |
| D-4 | "선택한 문항 추가" | 선택된 BankQuestion[] 을 Question[] 으로 변환 후 상위 콜백 전달 | 동일 (출제 방식 OQ-DD-05 의존: 복사 vs 참조) | 상위 `questions[]` 배열 누적 | Question, BankQuestion |

**예상 권한 검증**: `(instructor || admin)` + 다른 과목 은행 접근 권한 (UX-P03-001 정책 결정 필요).

---

### SCR-I-RANDOM-COMPOSE. 랜덤 출제 조합 모달 (3 step)

**구현 파일**: `src/components/RandomQuestionBankModal.jsx`

**목적**

복수 문제모음에서 조건 기반 자동 추출 (UX-P07-050). 그룹별 조건 일괄 구성 + 출제 전 통합 검토.

**레이아웃 (3 step)**

```
[Dialog]
[DialogHeader]
  ├── DialogTitle "랜덤 출제"
  └── 단계 인디케이터 (1 / 2 / 3)

[Step 1: 그룹 선택]
  ├── 접근 가능 문제모음 후보 목록 (분류 정보 함께)
  ├── 다중 선택 (체크박스)
  └── 다음 (선택 1개 이상 시 활성)

[Step 2: 그룹별 조건 일괄 구성]
  └── 선택된 그룹별 행
       ├── 그룹명 + 실제 문항 수
       ├── 추출 문항 수 입력 (1 이상 정수)
       ├── 배점 입력
       └── 합계 정보 (총 출제 문항 수 / 총 배점)

[Step 3: 출제 전 통합 검토]
  ├── 포함 그룹 요약
  ├── 그룹별 상태 (완료 / 일부 설정 / 미설정, 충분 / 부족)
  ├── 4종 안내 (문항 수 부족 / 배점 미입력 / 조건 불완전 / 그룹 점검)
  ├── 출제 전 문항 미리보기 (확인 보조, 편집 불가)
  └── "이전" / "확정"
```

**상태**

| **상태** | **표현** |
|---|---|
| Step 1 그룹 0개 | "다음" 비활성 |
| Step 2 조건 미설정 | 해당 그룹 "미설정" 표시 + 검토 단계 안내 |
| Step 2 추출 문항 수 < 1 | 입력 거부 + 사유 안내 |
| Step 2 추출 문항 수 > 실제 | "부족" 경고 (UX-P07-022, FRD-007-04 PD 결정) |
| Step 3 4종 안내 | 어느 그룹에 어떤 문제 + 어떻게 수정 (UX-COM-005) |
| 발행 후 출제 조합 수정 | 영향 안내 미구현 → 간극 G-3 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 모달 진입 (Step 1) | `listBanks()` | `GET /api/banks?courseId=:id` | 접근 가능 은행 목록 렌더 | QuestionBank |
| D-2 | 그룹 선택 후 Step 2 | 선택된 은행별 `getBankQuestions(bankId)` 동기 (mock) 또는 lazy 로드 | 동일. 또는 단일 `POST /api/banks/random-preview` 로 한 번에 | 그룹별 실제 문항 수 표시 + 조건 입력 폼 | BankQuestion |
| D-3 | "확정" (Step 3) | 클라이언트에서 그룹별 추출 후 상위 `questions[]` 콜백 전달 | (백엔드 권고) `POST /api/banks/random-compose { groups: [{ bankId, count, points }] }` 로 서버 추출 + 결과 반환 | 추출된 Question[] 배열을 상위 `questions[]` 에 누적 | Question, BankQuestion |

**예상 권한 검증**: D-2 (SCR-I-QUESTION-BANK-SELECT) 와 동일.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **AddQuestionModal** | **BankSelect** | **RandomCompose** |
|---|---|---|---|---|
| 모바일 | ~767px | Dialog 전폭, 유형 카드 1~2열, RichText 자동 축소 | Dialog 전폭, 트리 sticky 상단, 리스트 카드형 | 그룹 카드 1열, 조건 입력 1행 1그룹, 단계 인디케이터 sticky |
| 태블릿 | 768~1023px | Dialog max-w 적용, 유형 카드 3열 | Dialog max-w-2xl | 그룹 카드 1~2열, 조건 표 형태 |
| 데스크톱 | 1024px~ | Dialog max-w-4xl, 유형 카드 4열 | Dialog max-w-3xl | 그룹 카드 2열 가능 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | AddQuestionModal 진입 | 즉시 렌더 (별도 fetch 없음) |
| 빈 상태 (유형 미선택) | 모달 진입 직후 | 12종 카드 그리드 (안내 카피 + 카드 자체) |
| 빈 상태 (재사용 결과 없음) | 필터 결과 0건 | "조건에 맞는 결과 없음" + 조건 해제 링크 |
| 빈 상태 (접근 가능 그룹 0개) | RandomCompose Step 1 | "접근 가능한 문제모음이 없습니다" |
| 에러 (검증 실패) | isValid 미통과 | "추가" disabled. 누락 항목 안내 카피 없음 → 간극 G-1 |
| 에러 (수식 평가 실패) | formula 변수/식 오류 | 미리보기 영역 에러 + isValid=false |
| 에러 (빈칸 placeholder 갯수 불일치) | 본문 placeholder ≠ 정답 배열 | isValid=false + placeholder 자동 정리 (`removeAndShiftBlank`) |
| 에러 (유형 변경 시 호환 안 되는 입력값 폐기) | 유형 변경 | 자동 초기화 (안내 없음) → 간극 G-4 |
| 에러 (다른 과목 권한 없음) | BankSelect 트리 분기 | 비노출 또는 사유 안내 (UX-P03-001) |
| 에러 (랜덤 추출 문항 수 부족) | 추출 수 > 실제 수 | "부족" 경고 (UX-P07-022) |
| 권한 없음 (학생 진입) | role !== 'instructor' | 부모(QuizCreate/Edit) 가드로 `<Navigate to="/" replace />` |
| 오프라인 | 해당 없음 | 모달은 동기 렌더 |
| 자동 보존 / 이탈 후 복귀 | 모달 닫기 | 미구현 (퀴즈 단위 임시저장은 SCR-02 의 "임시저장") → 간극 G-2 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 검증 실패 시 보완 항목 안내 (URD-024 UX-P07-035, URD-028 UX-P07-070) | (B) URD 완화 | URD-024/028 v0.3 정정 완료 — "추가 액션 비활성으로 인지, 항목별 보완 안내는 향후 작업" 으로 완화 |
| G-2 | 작성 중 자동 보존 / 이탈 후 복귀 (URD-024 UX-P07-031/032/034) | (B) URD 완화 | URD-024 v0.3 — "퀴즈 단위 임시저장 기반" 으로 완화 (문항 단위 자동 보존은 향후) |
| G-3 | 발행 후 랜덤 출제 조합 변경 영향 안내 (URD-007 UX-P07-030) | (B) URD 명시 후속 | URD-007 OQ 의존. 후속 작업 |
| G-4 | 유형 변경 시 호환 안 되는 입력값 처리 결과 인지 (URD-024 UX-P07-012) | (B) URD 완화 | URD-024 v0.3 — "자동 초기화 명시, 사전 안내 강화는 향후" |
| G-5 | 재사용 단위 3종(문항/시험 전체/문제모음 그룹) 구분 | (B) URD 완화 | URD-024 v0.3 — 2종(문항/시험전체)으로 완화. 그룹 단위는 향후 |
| G-6 | 문항 단위 정답 판정 옵션 개별 설정 (URD-005 UX-P07-001) | (B) 후속 | 현재 프로토타입 미구현. 전역 기본값(SCR-05) 적용. Phase 2 |
| G-7 | 학생 측 오답 사유 안내 (URD-005 UX-P08-002) | (B) C 분류 후속 | 학생 결과 화면 카피 (SCR-09 / 학생 결과 SSD 보강 시) |
| G-8 | 응시 발생 후 제목 변경 시 안내 (URD-006 UX-P02-010) | (B) C 분류 후속 카피 | 강사 측 변경 시 학생 응시 화면 영향 안내 |
| G-9 | 기본값 수준 제목 학생 비노출 판별 (URD-006 UX-P02-011) | (B) 후속 | 판별 로직 + 안내 카피 미구현 |
| G-10 | 학생 측 부분 점수 산정 출처 안내 (URD-010 UX-P08-001/002) | (B) C 분류 후속 카피 | 학생 결과 화면 카피 |
| G-11 | "미설정" 시각 위계 구분 (URD-001 UX-COM-002) | (A) 부분 충족 | DropdownSelect 옵션 라벨. 배지 시각 위계 추가 검토 |
| G-12 | TA / 운영자 권한 분기 | (A) 충족 | Canvas 권한 비트 위임 (공통 권한 가이드 참조) |
| G-13 | 학생 공개 정보 / 비공개 채점 기준 시각 구분 (URD-024 UX-P07-021) | (A) 부분 충족 | 서술형 rubric / 코멘트는 작성 단계에서 입력. UI 라벨 추가는 후속 카피 |
| G-14 | 피드백 노출 정책 사전 인지 카피 (URD-028 UX-P07-041) | (B) 후속 카피 | "결과 공개 정책에 따라 노출 가능" 카피 추가 |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 3 화면(QUESTION-FORM/QUESTION-BANK-SELECT/RANDOM-COMPOSE) 각각에 데이터 흐름 절 추가. QUESTION-FORM 에 12 유형별 검증 룰 표 통합. 데이터 사전 v0.1 엔티티 매핑 + 권한 검증 권고 포함 | 김민주 (Creator/PD) |
