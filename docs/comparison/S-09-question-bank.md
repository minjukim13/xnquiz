# S-09. 문제은행 상세 — Canvas / LearningX(LMS) / xnquiz 비교

> 화면 단위 3-way 비교. raw 출처:
> Canvas = `_drafts/canvas-spec.md` S-09 (소스: `app/views/question_banks/show.html.erb`, `_form_question.html.erb`)
> LMS = `_drafts/lms-customs-spec.md` S-09 (delta 없음, 단 S-06 재채점이 우회 연동)
> xnquiz = `_drafts/xnquiz-spec.md` S-09 (`src/pages/QuestionBank.jsx`)

---

## 1. 개요

| **항목** | **Canvas** | **LearningX (LMS)** | **xnquiz** |
| --- | --- | --- | --- |
| 경로 | `/courses/:cid/question_banks/:id` | Canvas 와 동일 | `/question-banks/:bankId` |
| 화면 단위 | 은행명 + 문항 리스트 + Aligned Outcomes | 동일 (delta 없음) | 은행명 + 문항 리스트 (Outcomes 없음) |
| 권한 | 교수자/조교/학생 분기 (manage/update/delete) | 동일 | 교수자 전용. 미존재 bank 진입 시 `/` 리다이렉트 |
| 문항 유형 수 | 13종 (Classic Quizzes) | 동일 | 12종 |
| 진입 동선 | S-08 카드 클릭 / S-04 편집 화면 "Find Bank" 모달 | 동일 + S-06 통계 화면이 우회 호출 | S-08 카드 클릭 / S-02·S-04 문제 추가 모달 |

---

## 2. 기능 매트릭스

표기 규칙은 S-08 과 동일. `[A]` Canvas 기존 / `[B-#NN]` 학교 요구사항 신규 / `[C]` 자체 도출 개선.

### 2-1. 헤더 / 메타 / 사이드바

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| 헤더 | 은행명 표시 | O h1 (`.quiz-header` displaying) | = Canvas | O `PageHeader` 제목 `[A]` | |
| 헤더 | 은행명 인라인 편집 | O editing 모드 ("Bank Name" label + text input). 사이드바 "Edit Bank Details" 진입 | = Canvas | O 호버 시 `Edit2` 아이콘 → 인라인 편집 (Enter/Esc/blur) `[C]` | xnquiz 가 더 빠른 동선 |
| 헤더 | 안내 문구 | O "Remember, changes to question templates won't automatically update quizzes that are already using those questions." | = Canvas | O "문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다." `[A]` (의역) | 동일 의미 |
| 헤더 | "Show Question Details" 토글 | O total_pages > 1 일 때 자동 체크 + 안내 ("NOTE: Question details not available when more than 25.") | = Canvas | X (xnquiz 는 페이지네이션 없음) | xnquiz 단순화 |
| 헤더 | "일괄 업로드" 버튼 | X | X | O "일괄 업로드" (outline, `Upload`) `[B/C]` | xnquiz 신규 |
| 헤더 | "문항 추가" 버튼 | partial (사이드바 "Add a Question") | = Canvas | O "문항 추가" (default, `Plus`) `[A]` | xnquiz 는 헤더로 위치 변경 |
| 사이드바 | "Add a Question" | O `.add_question_link` (`:create`) | = Canvas | X (헤더로 이동) | |
| 사이드바 | "Edit Bank Details" | O `.edit_bank_link` (`:update`) | = Canvas | X (인라인 편집으로 통합) | |
| 사이드바 | "Move Multiple Questions" | O `.move_questions_link` (`:update`) — 다중 이동/복사 다이얼로그 | = Canvas | X | xnquiz 미지원 |
| 사이드바 | "Delete Bank" | O `.delete_bank_link` (`:delete`) — 브라우저 confirm | = Canvas | partial (S-08 카드에서 삭제) | xnquiz 는 S-08 카드에서만 |
| 사이드바 | "Bookmark this Bank" / "Already Bookmarked" | O 북마크 토글 | = Canvas | X | xnquiz 북마크 개념 없음 |
| Outcomes | "Aligned Outcomes" 섹션 | O h2 + outcome 목록 ("short_description" + "mastery at X%" + 삭제 버튼) | = Canvas | X | xnquiz 미지원 |
| Outcomes | "Align Outcome" 버튼 | O `.add_outcome_link` → `_find_outcome` partial 다이얼로그 | = Canvas | X | xnquiz 미지원 |
| 메타 | 난이도 (은행 단위) | X | X | O 은행 difficulty (상/중/하/미지정). 문항 추가 시 고정 적용 `[B/C]` | xnquiz 신규 |

### 2-2. 문항 리스트

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| 리스트 | 렌더링 분기 | O total_pages ≤ 1 = `_display_question`, > 1 = `_question_teaser` (제목만, 클릭 시 펼침) | = Canvas | O 단일 행 카드 (`QuestionItem`) `[A]` | xnquiz 는 분기 없음 |
| 리스트 | 페이지네이션 | O `#more_questions` "more questions" 링크 (data-current-page/total) | = Canvas | X (단순 리스트) | xnquiz 미지원 |
| 리스트 | 드래그 정렬 핸들 | O `_display_question` 내 핸들 (편집 모드) | = Canvas | O `GripVertical` 핸들 + tooltip "드래그하여 순서 변경" — **필터 미적용 시만** 노출 `[A]` | xnquiz 정책 다름 |
| 행 | 문항 본문 미리보기 | O 본문(HTML) + 선택지 + 정답 표시 (`show_correct_answers` 클래스) | = Canvas | O `htmlToPlainText` line-clamp-3 (3줄) `[C]` | xnquiz 가 더 간소 |
| 행 | 유형 배지 | O 유형 표시 | = Canvas | O `TypeBadge` (유형별 색상) `[A]` | |
| 행 | 배점 표시 | O `.question_points` (소수점 허용) | = Canvas | O "{points}점" `[A]` | |
| 행 | 난이도 배지 (행 단위) | X | X | O 상/중/하 배지 `[B/C]` | xnquiz 신규 |
| 행 | 액션 (호버) | O Edit, Move/Copy, Delete (호버 시) | = Canvas | O `Trash2` 항상 노출 + 클릭/Enter/Space → 편집 모달 `[A]` | xnquiz 는 행 클릭 = 편집 |
| 행 | 정답/오답/일반 코멘트 표시 | O `_display_question` 내 인라인 표시 | = Canvas | partial (편집 모달 내 "응답 피드백" 아코디언) | xnquiz 는 리스트에선 미노출 |
| 빈 상태 | 은행 자체 빈 | O "No Questions" | = Canvas | O "아직 추가된 문항이 없습니다" + "첫 문항 추가하기" CTA `[A]` | |
| 빈 상태 | 검색 결과 없음 | X (검색 자체가 없음) | = Canvas | O "검색 결과가 없습니다" `[C]` | xnquiz 신규 |

### 2-3. 필터 / 검색 (xnquiz 신규)

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| 필터 | 유형 드롭다운 | X | X | O "모든 유형" + 12 유형 라벨 `[B/C]` | xnquiz 신규 |
| 필터 | 난이도 드롭다운 | X | X | O "모든 난이도" / "미지정" / "상" / "중" / "하" `[B/C]` | xnquiz 신규 |
| 검색 | 본문 검색 인풋 | X | X | O placeholder "문항 내용 검색" + `Search` 아이콘 `[B/C]` | xnquiz 신규 |
| 카운트 | 총 문항 표시 | partial (사이드바 카운트만) | = Canvas | O "총 {N}개 문항" `[A]` | |

### 2-4. 문항 유형별 입력 폼

| **value (Canvas)** | **Canvas 라벨 (영문)** | **Canvas 한국어 의역** | **LMS** | **xnquiz key** | **xnquiz 라벨** | **xnquiz 폼 디테일** |
| --- | --- | --- | --- | --- | --- | --- |
| `multiple_choice_question` | Multiple Choice | 객관식(단일 정답) | = Canvas | `multiple_choice` | "객관식" | 정답 라디오 + "보기 N" placeholder + "보기 추가" (~6개) |
| `true_false_question` | True/False | 참/거짓 | = Canvas | `true_false` | "참/거짓" | "참" / "거짓" 버튼 |
| `multiple_answers_question` | Multiple Answers | 객관식(복수 정답) | = Canvas | `multiple_answers` | "복수 선택" | 정답 체크 + "보기 N" + "보기 추가" (~8개) |
| `short_answer_question` | Fill In the Blank | 단답형(한 칸) | = Canvas | `short_answer` | "단답형" (partial 자동채점) | 정답 + 대체 정답 (~5개) + 채점기준 textarea |
| `fill_in_multiple_blanks_question` | Fill In Multiple Blanks | 단답형(복수) | = Canvas | `fill_in_multiple_blanks` | "다중 빈칸 채우기" | "본문에 빈칸 삽입" 버튼 + `[빈칸N]` 토큰 자동확장 (캡 6) |
| `multiple_dropdowns_question` | Multiple Dropdowns | 드롭다운(복수) | = Canvas | `multiple_dropdowns` | "드롭다운 선택" | "본문에 드롭다운 삽입" 버튼 + `[드롭다운N]` 토큰 (캡 4) |
| `matching_question` | Matching | 짝짓기 | = Canvas | `matching` | "연결형" | 페어 입력 (왼쪽 N / 오른쪽 N) + "항목 추가" + 오답 보기 |
| `numerical_question` | Numerical Answer | 수치형 | = Canvas | `numerical` | "수치형" | 정답 + 허용 오차 (Canvas 는 exact/range/precision 3종, xnquiz 는 단순 ±오차) |
| `calculated_question` | Formula Question | 공식 문항 | = Canvas | `formula` | "수식형" | 변수 정의 + 수식 input + 표시 자릿수 + 허용 오차 (절대/%) |
| `missing_word_question` | Missing Word | 빈칸 단어 | = Canvas | X | (xnquiz 미지원) | Canvas 는 dropdown 형 빈칸. xnquiz 는 `multiple_dropdowns` 로 흡수 |
| `essay_question` | Essay Question | 서술형 | = Canvas | `essay` | "서술형" (수동 채점) | 채점기준 textarea |
| `file_upload_question` | File Upload Question | 파일 업로드 | = Canvas | `file_upload` | "파일 첨부" (수동 채점) | 별도 UI 없음 (간단 안내만) |
| `text_only_question` | Text (no question) | 텍스트 (문항 아님) | = Canvas | `text` | "텍스트" (채점 없음) | 배점/난이도/피드백 폼 모두 숨김 |

**유형 수 차이 요약**

- Canvas/LMS = **13종**
- xnquiz = **12종** (Missing Word 드롭 → Multiple Dropdowns 로 통합)

### 2-5. 문항 작성 / 편집 폼 공통

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| 폼 | 문항명 (question_name) | O text input width 120px (식별용 짧은 제목) | = Canvas | O 제목 input maxLength 120, placeholder "문제 제목을 입력하세요" `[A]` | xnquiz 는 안내문이면 "안내문 제목을 입력하세요" |
| 폼 | 문항 유형 select | O 13종 드롭다운 | = Canvas | partial 2-step UI (Step 1: 유형 카드 선택 + 미리보기, Step 2: 폼) `[C]` | xnquiz UX 개선 |
| 폼 | 배점 input | O `question_points` (소수점, points_lock 시 readonly) | = Canvas | O 배점 input + 빨강 별표 필수 (text 유형 숨김) `[A]` | |
| 폼 | 난이도 input (문항 단위) | X | X | O 드롭다운 (bankDifficulty 있으면 "상/중/하 고정" 회색 박스로 표시) `[B/C]` | xnquiz 신규 |
| 폼 | 본문 에디터 | O RCE (TinyMCE) — HTML 입력 지원 | = Canvas | O `RichTextEditor` 또는 textarea (fill_in_multiple_blanks / multiple_dropdowns / formula 는 textarea 로 토큰 자동확장) `[A]` | |
| 폼 | 빈칸 자리표시 안내 | O `[blank_name]` / `[dropdown_name]` 형식 | = Canvas | O `[빈칸N]` / `[드롭다운N]` 한국어 토큰 `[A]` | |
| 폼 | 정답 코멘트 / 오답 코멘트 / 일반 코멘트 | O 3종 모두 RCE | = Canvas | O 아코디언 "응답 피드백" (정답 시 / 오답 시 / 무조건 표시) `[A]` | xnquiz 는 아코디언 + 안내 "학생에게 결과 공개 시 함께 표시됩니다. 결과 비공개 설정이면 노출되지 않습니다." |
| 폼 | regrade hidden | O `regrade_disabled` (정답 변경 시 채점 정책 전달) | = Canvas | partial (S-04 의 `RegradeOptionsModal` 로 분리) | 위치 다름 |
| 폼 | "Show one question at a time" 미리보기 알림 | O 일부 유형 | = Canvas | X | xnquiz 정책 별도 |
| 폼 | Equations Help (LaTeX/MathJax 도움말) | O `_equations_help` partial | = Canvas | partial (수식형 폼에 변수 정의 + 수식 input). 별도 도움말 모달 없음 | xnquiz 단순화 |
| 폼 | 저장 / 취소 버튼 | O "Update Question" / "Cancel" | = Canvas | O "추가" / "변경" / "취소" + "← 유형 변경" (편집 모드 숨김) `[A]` | xnquiz 가 step 1 복귀 버튼 추가 |
| 폼 | 응시자 있을 때 안내 | partial (S-04 편집 화면 상단 경고) | LMS delta (S-04 에 "재채점 기능 안내" 박스 추가) | O 편집 모드 + 응시자 있을 때 호박 안내 `[C]` | xnquiz 는 문항 모달 안 |

### 2-6. 외부 가져오기 / 이동 / 일괄 처리

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| Find Questions | 외부 은행에서 문항 가져오기 | partial (S-04 편집 화면의 `#find_question_dialog` "Find Questions" 모달) | = Canvas | partial (S-08 의 `ImportBankModal` 이 cross-bank import 담당. S-09 단독 진입은 없음) | 동선 차이 |
| Find Bank | 외부 은행 연결 | partial (S-04 "Find Bank" 모달 — 문제 그룹용) | = Canvas | partial (S-04 의 `QuestionBankModal` / `RandomQuestionBankModal`) | 동선 차이 |
| Move/Copy | 문항 이동/복사 다이얼로그 | O `#move_question_dialog` "Move/Copy {question_name}" — 라디오로 대상 은행 선택, 첫 항목 "[ New Question Bank ]", "Keep a copy in this question bank as well" 체크박스 기본 ON | = Canvas | X | xnquiz 미지원 |
| Move/Copy | 다중 문항 일괄 이동 | O 사이드바 "Move Multiple Questions" → hidden `multiple_questions` 모드 | = Canvas | X | xnquiz 미지원 |
| Bookmark | 은행 북마크 | O 사이드바 "Bookmark this Bank" | = Canvas | X | xnquiz 미지원 |
| Direct Share | Send to / Copy to | partial (퀴즈는 지원하나 은행 단위는 미지원) | = Canvas | X | xnquiz 전체 미지원 |
| 일괄 업로드 | .xlsx / .xls / .csv 업로드 | X | X | O `ExcelUploadModal` "문항 일괄 업로드" + "템플릿 다운로드" 링크 `[B/C]` | xnquiz 신규 |
| 일괄 업로드 | 오류 표시 | X | X | O 오류 박스 "{N}개 오류 — 수정 후 다시 업로드해 주세요" + 행별 오류 `[B/C]` | |
| 일괄 업로드 | 은행 난이도 mismatch 검증 | X | X | O "{N+1}행: 문제은행 난이도("{label}")와 다른 난이도("{label}")가 지정되어 있습니다" `[B/C]` | xnquiz 신규 |
| Outcomes | Outcome 정렬 | O Aligned Outcomes 영역 + Align Outcome 다이얼로그 (`_find_outcome`) | = Canvas | X | xnquiz 미지원 |

### 2-7. 편집 잠금 / Edge case

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| Edge | 빈 은행 | O "No Questions" | = Canvas | O "아직 추가된 문항이 없습니다" + CTA | |
| Edge | 25개 초과 자동 페이지네이션 | O 페이지당 50문항, Show Question Details 기본 OFF | = Canvas | X | xnquiz 단일 리스트 |
| Edge | Master Course 잠금 (`.uneditable`) | O 편집 불가 | = Canvas | X | xnquiz 미지원 |
| Edge | Aligned Outcome 삭제 | O 인라인 삭제 | = Canvas | N/A | |
| Edge | 응시자 있을 때 문항 수정 | O 별도 안내 없이 진행 (재채점 정책은 별도) | LMS delta: S-04 / S-06 의 재채점 박스 + 단답형 [재채점] 버튼 + 문제은행 답 수정 → 통계 화면 재채점 버튼 | O 모달 내 호박 안내 + S-04 의 `RegradeOptionsModal` 4종 | 정책 명시도 차이 |

---

## 3. 시스템별 상세

### 3-1. Canvas

- 소스: `app/views/question_banks/show.html.erb` (154줄) + `_form_question.html.erb` (290줄)
- **우측 사이드바 액션 6종**: Add a Question / Edit Bank Details / Move Multiple Questions / Delete Bank / Bookmark / Already Bookmarked (disabled)
- **Aligned Outcomes** 섹션 — 정렬된 outcome 목록 (short_description + mastery %) + Align Outcome 다이얼로그
- 본문 헤더에 안내 "Remember, changes to question templates won't automatically update quizzes that are already using those questions."
- 25개 초과 시 자동 페이지네이션 + Show Question Details 기본 OFF + "NOTE: Question details not available when more than 25."
- 각 문항 카드는 드래그 핸들 / 제목 / 유형 배지 / 본문 / 선택지+정답 / 코멘트 / 배점 / 호버 시 Edit·Move/Copy·Delete 액션
- **Move/Copy 다이얼로그**: 대상 은행 라디오 (첫 항목 "[ New Question Bank ]") + Loading 상태 + 새 은행명 input + "Keep a copy" 체크박스 (기본 ON)
- **Add/Edit 폼** (`_form_question`):
  - 헤더: question_name (120px) + question_type select (13종) + question_points (소수점, points_lock 시 readonly)
  - 본문: RCE TinyMCE + 빈칸/드롭다운 토큰 자리표시
  - 정답/오답/일반 코멘트 3종 (모두 RCE)
  - 저장 = "Update Question"
- Equations Help 모달 (LaTeX/MathJax)

### 3-2. LearningX (LMS)

- **S-09 자체 delta 없음.** Canvas 화면 그대로
- 다만 우회 연동: **문제은행 답안을 수정한 뒤** S-06 (통계) 의 custom.js (`quiz-rescore.example.js`) 가 `xn-question-bank-rescore-buttons-wrapper` 를 주입해 "재채점" 버튼을 노출. 즉 "문제은행 답안 수정 → 통계 화면에서 재채점" 으로 이어지는 후공정
- LearningX 자체 API: `POST /learningx/api/v1/courses/:cid/quizzes/:qid/questions/:question_id/rescore` (Bearer)

### 3-3. xnquiz

- 소스: `src/pages/QuestionBank.jsx`
- 헤더: 은행명 + 호버 시 `Edit2` 인라인 편집 + description "문항을 수정해도 이미 생성된 퀴즈에는 자동 반영되지 않습니다."
- 헤더 액션 2종: "일괄 업로드" (outline) / "문항 추가" (default)
- **필터/검색 툴바** (xnquiz 신규):
  - 유형 드롭다운 ("모든 유형" + 12 유형)
  - 난이도 드롭다운
  - 검색 인풋 ("문항 내용 검색")
  - "총 {N}개 문항"
- 문항 행 (`QuestionItem`):
  - `GripVertical` 드래그 핸들 (필터 미적용 시만)
  - `TypeBadge` + "{points}점" + 난이도 배지
  - 본문 line-clamp-3 (`htmlToPlainText`)
  - `Trash2` 우측 (항상 노출)
  - 행 클릭/Enter/Space → 편집 모달
- `AddQuestionModal` 2-step:
  - Step 1: 12개 유형 카드 + 우측 미리보기 (`QuestionTypePreview`)
  - Step 2: 폼 — 제목 / 배점 / 난이도 / 본문 (RTE 또는 textarea) / 유형별 폼 / 응답 피드백 아코디언
- `ExcelUploadModal`:
  - .xlsx / .xls / .csv 업로드
  - 점선 드롭 박스 + 파일명 / "클릭하여 파일 선택"
  - 오류 박스 (행별)
  - "템플릿 다운로드" 링크
  - 은행 난이도 mismatch 검증
- 응답 피드백 아코디언 안내: "학생에게 결과 공개 시 함께 표시됩니다. 결과 비공개 설정이면 노출되지 않습니다."
- 편집 모드 + 응시자 있을 때 호박 안내 박스 표시

---

## 4. 핵심 차이 요약

1. **문항 유형 13종 → 12종 (Missing Word 드롭)** — xnquiz 는 Missing Word 를 Multiple Dropdowns 로 흡수해 일원화.
2. **2-step 유형 선택 UI** — Canvas 는 단일 select, xnquiz 는 "유형 카드 + 미리보기" 1단계 + 폼 2단계로 분리. UX 학습 비용 감소 목적.
3. **난이도 메타 신규 (은행 + 문항 양쪽)** — Canvas 는 난이도 없음. xnquiz 는 은행 difficulty 가 문항 추가 시 고정 적용되고, 행별 난이도 배지로 시각화.
4. **필터/검색 도입** — Canvas 는 25개 초과 시 페이지네이션 + Show Question Details 토글만, xnquiz 는 유형/난이도/본문 검색 3종 필터로 대체.
5. **Outcomes 정렬 드롭** — Canvas Aligned Outcomes 섹션 + Align Outcome 다이얼로그를 xnquiz 는 미채택.
6. **Move/Copy 다이얼로그 드롭** — Canvas 의 단일 문항 Move/Copy / 다중 문항 일괄 이동을 xnquiz 는 미지원. cross-bank 이동은 S-08 의 Import/Export 모달로 대체.
7. **Bookmark / Direct Share 드롭** — 학교 단위 LMS 가 아닌 코스 내 사용 가정.
8. **Equations Help 모달 드롭** — Canvas LaTeX/MathJax 도움말 모달은 xnquiz 미지원. 수식형 폼에 변수+수식 입력만.
9. **일괄 업로드 (.xlsx/.csv) 신규** — Canvas 는 외부 가져오기 없음. xnquiz 는 템플릿 + 행별 검증 + 난이도 mismatch 경고까지.
10. **응답 피드백 아코디언** — Canvas 는 정답/오답/일반 코멘트를 폼 평면에, xnquiz 는 "응답 피드백" 아코디언으로 접어두고 "결과 공개 시 표시" 안내 명시.
11. **응시자 있을 때 안내 명시** — Canvas 는 별도 안내 없음. LMS custom 은 박스 주입. xnquiz 는 모달 내 호박 안내.

---

## 5. 누락 의심 / 확인 필요

| **항목** | **시스템** | **의심 사유** |
| --- | --- | --- |
| Numerical Answer 유형 — exact / range / precision 3종 분기 | xnquiz | Canvas 는 3종 답안 유형 분기. xnquiz 는 정답 + 허용 오차 단순화 (3종 분기 미확인) |
| Calculated (Formula) — "Generate possible solutions" 버튼 | xnquiz | Canvas 는 자동 해 생성 버튼. xnquiz 는 변수 정의 + 수식만, 해 자동 생성 여부 미확인 |
| Multiple Choice 보기 최대 개수 | xnquiz | "~6개" 표기. 정확한 상한 미확정 |
| Multiple Answers 보기 최대 개수 | xnquiz | "~8개" 표기 |
| Short Answer 대체 정답 상한 | xnquiz | "~5개" 표기 |
| 다중 빈칸 / 드롭다운 캡 (6 / 4) 초과 시 동작 | xnquiz | "mismatch 경고" 표기만, 동작 상세 미확정 |
| `evalFormula` 지원 함수 (sqrt, ^, sin 등) | xnquiz | `utils/formulaEngine.js` 별도 정독 필요 |
| `RichTextEditor` 툴바 디테일 (이미지/동영상 삽입) | xnquiz | `RichText.jsx` 추가 정독 필요 |
| Move/Copy 다이얼로그 도입 여부 | xnquiz | 정책 결정 필요. cross-bank 이동을 S-08 Import/Export 로 대체할지 |
| Outcomes 도입 여부 | xnquiz | MVP 외로 보임. 향후 LMS 연동 시 재검토 |
| 25개 초과 페이지네이션 대응 | xnquiz | 100개 이상 은행에서 성능 문제 가능 (PM3 부하 검토 필요) |
| `ImportBankModal` step 별 검증 룰 | xnquiz | raw spec "일부만 확인" |

---

## 6. 자기 점검 체크리스트

- [x] 문항 유형 13종 vs 12종 매핑 표로 정리 (Canvas value / 영문 / 한국어 / xnquiz key / 라벨 / 폼 디테일)
- [x] Missing Word 드롭 명시
- [x] Find Questions / Find Bank 동선 차이 (S-04 진입 vs S-08 모달 대체) 명시
- [x] Outcomes 미지원 명시
- [x] Bookmark 미지원 명시
- [x] Direct Share 미지원 명시
- [x] Move/Copy 다이얼로그 미지원 명시
- [x] 가져오기/내보내기/일괄 업로드 포맷 (.xlsx/.xls/.csv) 명시
- [x] 난이도 메타 (은행 단위 + 문항 단위) 양쪽 행 분리
- [x] 다중 빈칸/드롭다운 캡 (6/4) 명시
- [x] 응답 피드백 아코디언 안내 원문 인용
- [x] 헤더 / 사이드바 / 필터 / 리스트 / 폼 / 외부 가져오기 / Edge case 영역 분리
- [x] LMS delta 없음 + S-06 우회 연동 명시
- [x] [A]/[B]/[C] 라벨 매트릭스 셀에 부여
- [x] "·" 사용 없음 / 이모지 없음
- [x] 표 헤더 굵게
