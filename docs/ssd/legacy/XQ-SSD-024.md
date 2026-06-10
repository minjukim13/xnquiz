# XQ-SSD-024. 문항 저작 흐름 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-024 의 UX 요건을 현재 프로토타입 기준으로 명세. 작성 진입 분리(직접 작성 / 재사용 / 랜덤 출제) + 유형 선택 + 작성 단계의 정보 범위. **유형별 입력 양식 본체는 XQ-SSD-028 위임, 랜덤 출제 본체는 XQ-SSD-007 위임**.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-024-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-024](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5078974484) v1.0 |
| 참조 FRD | XQ-FRD-024 |
| 참조 DS Baseline | LearningX DS Baseline 미확정 |
| 참조 코드 | `src/components/AddQuestionModal.jsx`, `src/components/QuestionBankModal.jsx`, `src/components/RandomQuestionBankModal.jsx`, `src/pages/QuizCreate.jsx` `QuizEdit.jsx` 의 `QuestionsTab` |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈 → 퀴즈 목록 → 새 퀴즈 / 카드 메뉴 → 편집 → 문항 추가 탭
                                              ├ "문항 만들기" → AddQuestionModal (직접 작성)
                                              │     └ 유형 선택 → 입력 양식 → 추가
                                              └ "문제모음에서 추가" Popover
                                                    ├ "직접 선택" → QuestionBankModal (재사용)
                                                    └ "랜덤 출제" → RandomQuestionBankModal (조건 설정)

핵심 태스크 클릭 뎁스:
- 새 문항 직접 작성: 문항 추가 탭 → 문항 만들기 → 유형 선택 → 추가 (4단계)
- 기존 문제모음 재사용: 문항 추가 탭 → 문제모음에서 추가 → 직접 선택 → 문항 선택 → 추가 (5단계)
- 랜덤 출제: 문항 추가 탭 → 문제모음에서 추가 → 랜덤 출제 → 조건 설정 → 추가 (5단계)

학생 (student):
홈 → 퀴즈 카드 → 응시 화면 (최종 저장 + 공개 조건 충족 문항만 노출)
```

**도달 원칙 (프로토타입 동작 기준)**

- 목적별 진입 3종이 한 화면(문항 추가 탭) 에 노출 (UX-P07-001/002). "문항 만들기" 와 "문제모음에서 추가" 두 버튼 분리.
- "문제모음에서 추가" 는 Popover 안에 "직접 선택" / "랜덤 출제" 두 옵션. 재사용 단위(문항 / 시험 전체 / 문제모음 그룹) 중 현재는 문항 단위 + 시험 전체 단위(가져오기 별도 흐름, SSD-018) 만 구현 (간극).
- AddQuestionModal 은 모달 내부 useState 로 form 상태 보유. 닫으면 사라짐 — UX-P07-031/032/033 의 자동 보존 / 이탈 후 복귀 / 임시 저장 구분 미구현 (간극).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-QUESTION-ADD-ENTRY | 문항 추가 진입점 (3종) | 문항 추가 탭 헤더 | 교수자 | UX-P07-001/002/050 | P0 |
| SCR-I-QUESTION-FORM | 문항 작성 모달 (AddQuestionModal) | "문항 만들기" 클릭 / 문항 수정 (Pencil) | 교수자 | UX-P07-010~012/020~022/030/035 | P0 |
| SCR-I-QUESTION-BANK-SELECT | 문제모음 직접 선택 모달 | Popover "직접 선택" 클릭 | 교수자 | UX-P07-040/041, UX-P03-001 | P0 |
| SCR-I-QUESTION-RANDOM-ENTRY | 랜덤 출제 모달 진입 | Popover "랜덤 출제" 클릭 | 교수자 | UX-P07-050 (본체는 SSD-007) | P1 |

**화면 ID 공유 안내**

- `SCR-I-QUESTION-ADD-ENTRY` 는 SSD-008 의 SCR-I-EDIT-QUESTIONS 안의 진입점 영역. 본 SSD 가 진입 분리 관점에서 단독 명세.

---

## 3. 화면별 상세 설계

### SCR-I-QUESTION-ADD-ENTRY. 문항 추가 진입점 (3종)

**구현 파일**: `src/pages/QuizCreate.jsx` `QuizEdit.jsx` 의 `QuestionsTab` 헤더 영역

**목적**

목적별 3진입(직접 작성 / 재사용 / 랜덤 출제) 을 문항 추가 탭 진입과 동시에 분리 인지 (UX-P07-001/002). 다른 목적의 작성 폼을 먼저 거치지 않도록 시작점 자체를 분리.

**레이아웃**

```
[QuestionsTab 헤더 행]
  ├── 좌측: 문항 수 / 총점
  └── 우측: 진입점 2개
       ├── "문항 만들기" (Button outline) → 직접 작성 진입 (AddQuestionModal)
       └── "문제모음에서 추가" (Button default + Popover)
            └── Popover 본문
                 ├── "직접 선택" 옵션 → QuestionBankModal
                 │    └── 설명 "문제모음에서 원하는 문항을 골라 추가합니다"
                 └── "랜덤 출제" 옵션 → RandomQuestionBankModal
                      └── 설명 "조건에 맞는 문항을 자동으로 선택합니다"
```

**사용 컴포넌트**

| **컴포넌트** | **용도** |
|---|---|
| `Button` (outline, default) | 진입점 2개 |
| `Popover` / `PopoverTrigger` / `PopoverContent` | 재사용 + 랜덤 출제 두 옵션 표출 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | "문항 만들기" 클릭 | AddQuestionModal 오픈 → SCR-I-QUESTION-FORM |
| I-2 | "문제모음에서 추가" 클릭 | Popover 노출 |
| I-3 | Popover "직접 선택" | QuestionBankModal 오픈 → SCR-I-QUESTION-BANK-SELECT |
| I-4 | Popover "랜덤 출제" | RandomQuestionBankModal 오픈 → SCR-I-QUESTION-RANDOM-ENTRY |

---

### SCR-I-QUESTION-FORM. 문항 작성 모달 (AddQuestionModal)

**구현 파일**: `src/components/AddQuestionModal.jsx`

**목적**

직접 작성 진입 후 유형 선택 → 입력 단계까지 한 모달 안에서 처리. URD-024 UX-P07-010 (유형 선택 전 응답/채점/예시 인지), UX-P07-020 (제목·본문·배점·난이도·정답·피드백·유형 통합), UX-P07-035 (검증 실패 시 보완 항목 인지) 충족.

**레이아웃**

```
[Dialog (모달 컨테이너)]
[DialogHeader]
  ├── DialogTitle "문항 만들기" / "문항 수정" (initialQuestion 분기)
  └── DialogDescription "유형을 선택하고 내용을 입력해 주세요"

[유형 선택 영역 (유형 미선택 상태)]
  └── 12종 유형 카드 그리드
       ├── 객관식 (multiple_choice) - CircleDot 아이콘 - "보기 중 1개 선택"
       ├── 참/거짓 (true_false) - ToggleLeft - "참 또는 거짓 선택"
       ├── 다중 답안 (multiple_answers) - ListChecks - "보기 여러 개 동시 선택"
       ├── 단답형 (short_answer) - PenLine - "짧은 텍스트로 답변"
       ├── 서술형 (essay) - AlignLeft - "자유롭게 서술"
       ├── 수치형 (numerical) - Hash - "숫자 정답 + 허용 오차 설정"
       ├── 수식 (formula) - Sigma - "변수로 학생마다 다른 답 생성"
       ├── 짝짓기 (matching) - ArrowLeftRight - "왼쪽-오른쪽 항목 연결"
       ├── 빈칸 채우기 (fill_in_multiple_blanks) - AlignJustify - "여러 빈칸 순서대로 채우기"
       ├── 드롭다운 (multiple_dropdowns) - ChevronDown - "드롭다운에서 항목 선택"
       ├── 파일 업로드 (file_upload) - Paperclip - "파일 업로드로 제출"
       └── 안내문 (text) - Type - "채점 없는 안내문 삽입"

[입력 단계 (유형 선택 후)]
  ├── 유형 표시 (변경 가능, 변경 시 호환 안 되는 입력값 초기화 — UX-P07-012)
  ├── 공통 입력 영역
  │    ├── 제목 (title, 선택)
  │    ├── 본문 (text, RichTextEditor — 이미지/iframe 인라인 지원)
  │    ├── 배점 (points, 0 이상 숫자)
  │    └── 난이도 (difficulty, DropdownSelect)
  ├── 유형별 입력 영역 (XQ-SSD-028 위임)
  │    ├── 객관식: 보기 N개 + 정답 인덱스
  │    ├── 참/거짓: 참/거짓 라디오
  │    ├── 다중 답안: 보기 N개 + 정답 인덱스 배열 + 부분 점수 정책 오버라이드 (URD-010)
  │    ├── 단답형: 정답 후보 배열
  │    ├── 서술형: 채점 기준 (rubric, 비공개 — UX-P07-021)
  │    ├── 수치형: 정답 + 허용 오차
  │    ├── 수식: 변수 + 식 + 오차 + 미리보기
  │    ├── 짝짓기: 좌-우 쌍 + 오답 보기
  │    ├── 빈칸 채우기: 본문 placeholder + 빈칸별 정답
  │    ├── 드롭다운: 본문 placeholder + 드롭다운별 옵션
  │    ├── 파일 업로드: 추가 입력 없음
  │    └── 안내문: 본문만 (배점 0 고정)
  └── 피드백 영역 (선택)
       ├── 정답 시 코멘트 (correct_comments)
       ├── 오답 시 코멘트 (incorrect_comments)
       └── 공통 코멘트 (neutral_comments)

[푸터]
  ├── 좌측: "취소" (ghost)
  └── 우측: "추가" / "수정" (default + isValid 분기 disabled)
       └── 수정 모드 + 응시자 보유 시: RegradeOptionsModal 분기 (재채점 정책 선택)
```

**사용 컴포넌트**

| **컴포넌트** | **용도** |
|---|---|
| `Dialog` / `DialogHeader` / `DialogTitle` / `DialogDescription` | 모달 컨테이너 |
| `DropdownSelect` | 난이도 / 유형 변경 등 |
| `Button` | 취소 (ghost) / 추가·수정 (default) |
| `RichTextEditor` | 본문 / 객관식 보기 / 빈칸 본문 (HTML 인라인) |
| `QuestionTypePreview` | 유형 선택 카드 미리보기 |
| `RegradeOptionsModal` | 수정 + 응시자 보유 시 재채점 정책 선택 (SSD-022 위임) |
| Lucide icons | 12 유형 아이콘 + UI 아이콘 다수 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 모달 진입 (신규) | 유형 미선택 상태로 12종 유형 카드 그리드 노출 |
| I-2 | 모달 진입 (수정, `initialQuestion` 전달) | 해당 유형의 입력 단계로 바로 진입. 기존 값 보존 |
| I-3 | 유형 카드 클릭 | 해당 유형의 `initForm()` 으로 form state 초기화 → 입력 단계 전환 |
| I-4 | 유형 변경 | 새 유형의 `initForm()` 으로 초기화. 호환 안 되는 입력값은 사라짐 (UX-P07-012 인지 — 현재 별도 경고 없음, 간극) |
| I-5 | 입력값 변경 | form state 갱신. 자동 보존 없음 (간극) |
| I-6 | "추가" 클릭 (isValid 통과) | `buildQuestion()` 으로 문항 객체 생성 → 부모(QuizCreate/Edit) onAdd 호출 → 모달 닫힘 |
| I-7 | "추가" 클릭 (isValid 실패) | 버튼 disabled. 별도 검증 실패 안내 카피 없음 (간극) |
| I-8 | "취소" 클릭 / 외부 클릭 | 모달 닫힘. form state 사라짐. 작성 중 입력값 보존 안 됨 (간극) |
| I-9 | "수정" 클릭 (응시자 보유 시) | RegradeOptionsModal 분기 → 재채점 정책 선택 (SSD-022) |

**상태**

| **상태** | **표현** |
|---|---|
| 유형 미선택 | 12종 카드 그리드. 각 카드 아이콘 + 라벨 + 응답 방식 설명 |
| 유형 선택 + 입력 중 | 입력 영역 노출. isValid 통과 여부에 따라 "추가" 버튼 활성/비활성 |
| 검증 실패 | "추가" 버튼 disabled. 누락 항목 안내 카피는 현재 없음 (간극 G-1) |
| 수정 모드 + 응시자 0명 | "수정" 버튼 클릭 시 즉시 반영 |
| 수정 모드 + 응시자 1명 이상 | "수정" 버튼 클릭 시 RegradeOptionsModal 노출 |

---

### SCR-I-QUESTION-BANK-SELECT. 문제모음 직접 선택 모달

**구현 파일**: `src/components/QuestionBankModal.jsx`

**목적**

기존 문제모음에서 문항 단위로 골라 재사용 (UX-P07-040). 다른 과목의 문제모음도 접근 가능 (UX-P03-001 다강의 보조).

**레이아웃 (간략)**

```
[Dialog]
[Header] 문제모음에서 추가
[Body]
  ├── 과목 / 문제모음 트리 (현재 과목 기본 + 다른 과목 가능)
  ├── 문항 리스트 (체크박스 다중 선택)
  └── 이미 추가된 문항은 "추가됨" 표시 (added prop)
[Footer] 취소 / 선택한 문항 추가
```

**사용 컴포넌트** (요약)

`Dialog`, `Button`, 트리/리스트 UI, Lucide icons.

> 상세 레이아웃과 인터랙션은 SSD-020 (문제모음 G1) 에서 본체 명세 예정. 본 SSD 는 진입 + 재사용 단위(문항) 만 명시.

---

### SCR-I-QUESTION-RANDOM-ENTRY. 랜덤 출제 모달 진입

**구현 파일**: `src/components/RandomQuestionBankModal.jsx`

**목적**

조건 기반 자동 추출 (UX-P07-050). 조건 설정 본체는 XQ-URD-007 / XQ-SSD-007 위임. 본 SSD 는 진입 시점만 명세.

> 상세 레이아웃과 조건 설정 패턴은 SSD-007 (랜덤 출제 고도화) 에서 본체 명세.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **SCR-I-QUESTION-ADD-ENTRY** | **SCR-I-QUESTION-FORM** |
|---|---|---|---|
| 모바일 | ~767px | 진입점 버튼 자동 줄바꿈 (flex-wrap), Popover 너비 자동 | Dialog 전폭, 유형 카드 그리드 1~2열, 본문 RichText 영역 자동 축소 |
| 태블릿 | 768~1023px | 진입점 inline | Dialog max-w 적용, 유형 카드 3열 |
| 데스크톱 | 1024px~ | 진입점 inline (Popover align=end) | Dialog max-w-4xl 정도, 유형 카드 4열 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | AddQuestionModal 진입 | 즉시 렌더 (별도 fetch 없음) |
| 빈 상태 (유형 미선택) | 모달 진입 직후 | 12종 유형 카드 그리드 (안내 카피 + 카드 자체가 빈 상태 보완) |
| 검증 실패 | isValid 미통과 | "추가" 버튼 disabled. 누락 항목 안내 카피 없음 → 간극 G-1 |
| 자동 보존 / 이탈 후 복귀 | 모달 닫기 | 미구현 → 간극 G-2 |
| 임시 저장 / 최종 저장 구분 | (해당 없음) | 미구현 → 간극 G-3 |
| 유형 변경 시 호환 안 되는 입력값 처리 | 유형 변경 | 자동 초기화 (안내 없음) → 간극 G-4 |
| 권한 없음 (학생 직접 진입) | role !== 'instructor' | `<Navigate to="/" replace />` (QuizCreate/Edit 가드) |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 검증 실패 시 보완 항목 안내 (UX-P07-035) | (B) URD 완화 | **URD-024 v0.3 정정 완료** (2026-06-05) — "추가 액션 비활성으로 인지, 항목별 보완 안내는 향후 작업" 으로 완화 |
| G-2 | 작성 중 자동 보존 / 이탈 후 복귀 (UX-P07-031/032/034) | (B) URD 완화 | **URD-024 v0.3 정정 완료** (2026-06-05) — "퀴즈 단위 임시저장 기반" 으로 완화 (문항 단위 자동 보존은 향후) |
| G-3 | 임시 저장 / 최종 저장 구분 (UX-P07-033) | (B) URD 완화 | **URD-024 v0.3 정정 완료** (2026-06-05) — "퀴즈 단위 임시저장" 으로 완화 (문항 단위 임시저장은 향후) |
| G-4 | 유형 변경 시 호환 안 되는 입력값 처리 결과 인지 (UX-P07-012) | (B) URD 완화 | **URD-024 v0.3 정정 완료** (2026-06-05) — "자동 초기화 명시, 사전 안내 강화는 향후" 로 완화 |
| G-5 | 재사용 단위 3종(문항/시험 전체/문제모음 그룹) 구분 (UX-P07-040/041) | (B) URD 완화 | **URD-024 v0.3 정정 완료** (2026-06-05) — 2종(문항/시험전체)으로 완화, 그룹 단위는 향후 작업 명시 |
| G-6 | 학생 공개 정보 / 비공개 채점 기준 시각 구분 (UX-P07-021) | (A) 부분 충족 | 서술형 rubric / 코멘트는 작성 단계에서 입력. UI 라벨 추가는 C 분류 후속 카피 작업 |
| G-7 | TA(P-03) 다강의 분기 | (B) URD 완화 | **URD-024 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-8 | 운영자(P-05) 재사용 안내 일관성 (UX-P05-001) | (B) URD 완화 | **URD-024 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-1~G-5/G-7/G-8 URD-024 정정 완료 반영 (v0.3/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
