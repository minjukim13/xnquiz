# XQ-SSD-028. 문항 유형별 작성·피드백·응시 후 수정 영향 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-028 의 12 유형 입력 양식 + 응답 피드백 3종 + 응시자 영향 인지 UX 요건을 AddQuestionModal 의 유형별 입력 영역에서 명세. 작성 흐름 본체는 SSD-024, 정답 판정은 SSD-005, 부분 점수는 SSD-010, 재채점은 SSD-022 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-028-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-028](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081563138) v1.0 |
| 참조 FRD | XQ-FRD-028 |
| 참조 코드 | `src/components/AddQuestionModal.jsx` (유형별 입력 영역 + initForm + isValid + buildQuestion), `src/utils/placeholderUtils.js`, `src/components/RichText.jsx` |

---

## 1. 역할별 네비게이션 구조

본 SSD 는 SSD-024 (문항 저작 흐름) 의 SCR-I-QUESTION-FORM 안의 **유형별 입력 영역**만 명세. 진입은 SSD-024 의 진입 흐름 따름.

```
교수자:
SSD-024 의 AddQuestionModal 진입 → 유형 선택 → [유형별 입력 영역, 본 SSD 범위]
                                                   ├ 본문 / 배점 / 난이도 (공통)
                                                   ├ 유형별 입력
                                                   ├ 응답 피드백 3종 (정답/오답/중립)
                                                   └ 저장
                                                       └ 응시자 보유 시 → SSD-022 분기
```

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-QFORM-TYPE-{TYPE} | 유형별 입력 영역 (12 유형) | AddQuestionModal 안 (SSD-024 위임) | 교수자 | UX-P07-001/002/003/004/020/021/030/031/032/040/041/050/051/060/070, UX-P05-001/002, UX-P08-001/002 | P0 |

> 12 유형 각각 별도 화면 ID 부여 가능하나, 본 SSD 는 공통 패턴 + 유형별 입력 차이로 다룸.

---

## 3. 화면별 상세 설계

### SCR-I-QFORM-TYPE-{TYPE}. 유형별 입력 영역

**구현 파일**: `src/components/AddQuestionModal.jsx` 의 유형별 분기 (`TYPE_META`, `initForm`, `isValid`, `buildQuestion`)

**공통 입력 영역 (모든 유형 공유)**

```
[공통 영역]
  ├── 제목 (form.title, 선택)
  ├── 본문 (form.text, RichTextEditor — HTML, 이미지/iframe 인라인)
  ├── 배점 (form.points, 0 이상 숫자, "안내문" 유형 한정 고정 0)
  └── 난이도 (form.difficulty, DropdownSelect, 미지정/상/중/하)

[피드백 영역 (선택)]
  ├── 정답 피드백 (form.correct_comments)
  ├── 오답 피드백 (form.incorrect_comments)
  └── 공통 피드백 (form.neutral_comments)
  + 안내: "결과 공개 정책에 따라 학생에게 노출될 수 있습니다" (UX-P07-041)
```

**12 유형별 입력 영역**

| **유형** | **TYPE_META.desc** | **입력 영역 (요약)** | **isValid 조건** |
|---|---|---|---|
| `multiple_choice` (객관식) | "보기 중 1개 선택" | 보기 N개 (RichTextEditor) + 정답 인덱스 (1개) | 보기 ≥ 2개 |
| `true_false` (참/거짓) | "참 또는 거짓 선택" | 참/거짓 라디오 | 항상 valid (배점 + 본문) |
| `multiple_answers` (다중 답안) | "보기 여러 개 동시 선택" | 보기 N개 + 정답 인덱스 배열 + (URD-010) 부분 점수 정책 오버라이드 | 보기 ≥ 2개 + 정답 ≥ 1개 |
| `short_answer` (단답형) | "짧은 텍스트로 답변" | 정답 후보 배열 (입력 추가/삭제) | 정답 후보 ≥ 1개 |
| `essay` (서술형) | "자유롭게 서술" | 채점 기준 (rubric, 비공개 — UX-P07-021 SSD-024 G-6) | 본문 입력 |
| `numerical` (수치형) | "숫자 정답 + 허용 오차 설정" | 정답 + 허용 오차 | correctNum 숫자 |
| `formula` (수식) | "변수로 학생마다 다른 답 생성" | 변수 N개 + 수식 + 오차 타입 + 답 자리수 + 미리보기 (`evalFormulaPreview`) | 변수 ≥ 1개 + 수식 평가 가능 |
| `matching` (짝짓기) | "왼쪽-오른쪽 항목 연결" | 좌-우 쌍 N개 + 오답 보기 (distractors) | 쌍 ≥ 2개 |
| `fill_in_multiple_blanks` (복수 빈칸) | "여러 빈칸 순서대로 채우기" | 본문에 `[1]` `[2]` placeholder + 빈칸별 정답 후보 배열 | placeholder 갯수 = blanks 갯수 + 모든 빈칸에 정답 1개 이상 |
| `multiple_dropdowns` (드롭다운) | "드롭다운에서 항목 선택" | 본문에 `[name]` placeholder + 드롭다운별 옵션 + 정답 인덱스 | placeholder 갯수 = dropdowns 갯수 + 각 드롭다운 옵션 ≥ 2개 |
| `file_upload` (파일 업로드) | "파일 업로드로 제출" | 추가 입력 없음 (본문만, 수동채점) | 본문 입력 |
| `text` (안내문) | "채점 없는 안내문 삽입" | 제목 + 본문만 (배점 0 고정, 채점 대상 아님 — UX-P07-060) | 본문 입력 |

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `RichTextEditor` | 본문 / 객관식 보기 / 빈칸 본문 / 드롭다운 본문 (HTML 인라인, 이미지/iframe 지원) |
| `richTextHasContent` | 입력 여부 검증 (HTML 안의 텍스트 추출) |
| `AnswerTextarea` (내부) | 단답형 / 빈칸 정답 후보 (자동 높이 조정 textarea) |
| `DropdownSelect` | 난이도 / 형식 선택 |
| `QuestionTypePreview` | 유형 선택 카드 미리보기 |
| Lucide icons | 유형별 아이콘 (TYPE_META) + 추가/삭제 |
| `placeholderUtils` | `countBlanks` / `countDropdowns` / `hasAllBlankPlaceholders` / `removeAndShiftBlank` 등 빈칸 placeholder 동기화 |
| `evalFormulaPreview` | 수식 미리보기 |

**인터랙션 (유형 공통)**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 유형 선택 변경 | `initForm(type)` 으로 초기화. 호환 안 되는 입력값 자동 폐기 (UX-P07-003) — 별도 경고 없음 → SSD-024 G-4 |
| I-2 | 본문 입력 (RichTextEditor) | HTML 저장. 줄바꿈/이미지/iframe 보존 (UX-P07-021) |
| I-3 | 보기/정답 후보/빈칸 입력 | 추가 (AddBtn) / 삭제 (TrashBtn) 가능. 빈칸은 placeholder 자동 동기화 |
| I-4 | 피드백 입력 (3종) | 독립 입력. 결과 공개 정책에 따라 노출 가능성 안내 |
| I-5 | "추가" 클릭 | `isValid(type, form)` 통과 시 `buildQuestion()` → 모달 닫힘. 미통과 시 disabled |
| I-6 | 응시자 보유 + 정답 변경 후 "수정" | RegradeOptionsModal 분기 (SSD-022) — UX-P07-050/051 |

**상태 (유형별 분기)**

| **유형** | **특이 상태** |
|---|---|
| `multiple_choice` | 정답 인덱스 1개 필수. 보기 삭제 시 정답 자동 이동 |
| `multiple_answers` | 정답 인덱스 배열. `overrideScoring` 토글로 URD-010 부분 점수 정책 오버라이드 |
| `short_answer` | 대소문자/공백 무시 정답 판정 — 본체는 SSD-005 |
| `essay` / `file_upload` | 수동 채점 배지 (SSD-008 QuestionsTab) |
| `formula` | 수식 평가 실패 시 `isValid=false` + 미리보기 영역에 에러 |
| `fill_in_multiple_blanks` / `multiple_dropdowns` | 본문 placeholder 갯수와 정답 배열 갯수 동기화 검증 |
| `text` | 채점 대상 아님. 학생 응시 화면에 답안 입력 영역 없음 (UX-P08-002) |

---

## 4. 반응형 분기

| **디바이스** | **너비** | **유형별 입력 영역** |
|---|---|---|
| 모바일 | ~767px | 보기/정답 후보 1열, AddBtn/TrashBtn 자동 줄바꿈 |
| 태블릿 | 768~1023px | 입력 영역 1열 (가독성) |
| 데스크톱 | 1024px~ | 입력 영역 1열, RichTextEditor 본문 폭 확장 |

---

## 5. 비정상 상태 UX

| **상태** | **현재 프로토타입 표현** |
|---|---|
| 유형 변경 시 호환 안 되는 입력값 폐기 | 자동 초기화 (안내 없음, SSD-024 G-4 위임) |
| 검증 실패 | "추가" 버튼 disabled. 누락 항목 안내 카피 없음 (SSD-024 G-1 위임) |
| 빈칸 placeholder 갯수 불일치 | `isValid=false` + placeholder 자동 정리 (`removeAndShiftBlank` 등) |
| 수식 평가 실패 | 미리보기 영역에 에러 노출 + `isValid=false` |
| 응시자 보유 + 정답 변경 후 저장 | RegradeOptionsModal 분기 (SSD-022) |
| 피드백 노출 가능성 사전 인지 | 피드백 입력 영역에 "결과 공개 정책에 따라 노출 가능" 카피 |
| 기존 문항 호환 (UX-P07-004) | 기존 답변값/정답 후보/표시 형식 변경 없이 유지 |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 유형 변경 시 호환 안 되는 입력값 처리 결과 사전 인지 (UX-P07-003) | (B) URD 완화 | **URD-028 본문은 그대로 유지** (사전 안내 강화는 향후 작업). SSD-024 G-4 와 동일 (URD-024 v0.3 정정 완료) |
| G-2 | 학생 공개 정보 / 비공개 채점 기준 시각 구분 (UX-P07-021) | (A) 부분 충족 | UI 라벨 추가는 C 분류 후속 카피 작업 |
| G-3 | 피드백 노출 정책 사전 인지 카피 (UX-P07-041) | (B) 후속 | 피드백 영역에 "결과 공개 정책에 따라 노출 가능" 카피 추가는 C 분류 후속 카피 작업 |
| G-4 | 필요 입력 누락 인지 (UX-P07-070) | (B) URD 완화 | **URD-028 v0.3 정정 완료** (2026-06-05) — "추가 액션 비활성으로 인지, 누락 항목별 개별 카피 안내는 향후 작업" 으로 완화 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-4 URD-028 정정 완료 반영 (v0.3). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
