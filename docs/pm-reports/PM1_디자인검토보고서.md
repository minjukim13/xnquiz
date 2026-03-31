# PM1 디자인 검토 보고서

**작성일**: 2026-03-31
**작성자**: PM1 — 디자이너
**대상**: XN Quizzes 프로토타입 (React 19 + Vite + Tailwind CSS v4)
**검토 범위**: QuestionBankList, QuestionBank, QuizCreate, AddQuestionModal, index.css

---

## 요약

전반적으로 indigo-600 주색 기반의 모던 화이트 모드가 일관되게 적용되어 있고, 컴포넌트 토큰 구조(`.input`, `.btn-primary`, `.card-flat`)도 잘 정의되어 있다. 다만 인라인 스타일과 Tailwind 클래스가 혼용되는 패턴이 전 파일에 걸쳐 나타나며, 고객사 요구사항(난이도 표시, 그룹핑, 랜덤 출제 설정, 복수 문제은행 선택 등)에 해당하는 UI는 현재 전혀 구현되어 있지 않다.

---

## 1. 색상 시스템 일관성

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **Primary 색상** | indigo-600(#6366f1) / indigo-700 호버 일관 적용 | 일부 컴포넌트에서 `#4338ca`(indigo-700 hex)가 직접 하드코딩됨 (AddQuestionModal TYPE_META 등) | CSS 변수 또는 Tailwind 토큰으로 통일 | Medium |
| **Semantic 색상 (성공/오류)** | ExcelUploadModal: 오류 `#DC2626`, 성공 `#166534` 하드코딩 | `.badge` 클래스가 있지만 semantic 배지 variant(success/error/warning)가 정의되어 있지 않음 | `index.css`에 `.badge-success`, `.badge-error`, `.badge-warning` variant 추가 | High |
| **문항 유형 배지 색상** | AddQuestionModal의 `TYPE_META`에 12가지 유형별 color/bg 정의됨 | QuestionBank/QuestionItem의 유형 배지는 모두 `#F5F5F5 / #616161` 회색 단일 처리 — TYPE_META와 불일치 | QuestionItem, CopyFromBankModal, QuestionBankModal의 유형 배지에도 TYPE_META 색상 시스템 적용 | High |
| **Gray 스케일** | `#BDBDBD`, `#9E9E9E`, `#616161`, `#424242`, `#222222` 5단계 사용 | Tailwind slate 계열과 hex 코드 혼용 (예: `text-indigo-600` + `style={{color:'#616161'}}`) | 토큰 정리 후 Tailwind 클래스 우선 사용 권장 | Low |

---

## 2. 타이포그래피 위계

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **h1 (페이지 제목)** | `text-2xl font-bold` (QuestionBankList, QuestionBank) / `text-xl font-bold` (QuizCreate) | 동일 계층인데 크기가 다름 — 2xl vs xl | 페이지 h1은 `text-2xl font-bold`로 통일 | Medium |
| **h2 (섹션 제목)** | QuizCreate Section: `text-sm font-semibold` | 섹션 제목이 body text(text-sm)와 크기가 같아 위계가 약함 | `text-base font-semibold`로 상향 또는 상단 여백·구분선 강화로 보완 | Medium |
| **caption / 부연설명** | `text-xs` + `color: #9E9E9E` 일관 사용 | 일부에서 `text-xs`와 `text-[13px]`이 혼용됨 (QuestionBank 헤더 버튼 13px) | caption은 `text-xs`로 통일 | Low |
| **base font-size** | `html { font-size: 17px }` — 비표준 기준 | 브라우저 기본값(16px) 대비 1px 상향으로 모든 rem 값이 상대적으로 커짐. 의도된 설계라면 문서화 필요 | 의도 명시 또는 16px로 표준화 고려 | Low |
| **행간(line-height)** | body `1.6`, h1~h4 `1.3` 전역 설정 | 문항 텍스트(QuestionItem)는 `leading-relaxed` (1.625) 별도 적용 — 중복 | index.css body line-height와 `leading-relaxed` 중 하나로 통일 | Low |

---

## 3. 컴포넌트 재사용성 및 일관성

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **버튼 스타일** | `.btn-primary`, `.btn-secondary`, `.btn-ghost` index.css 정의 | QuestionBank 헤더 버튼들은 `.btn-secondary` 클래스 미사용, 인라인 스타일로 재구현 (`border: '1px solid #E0E0E0', borderRadius: 4`) | 모든 보조 버튼을 `.btn-secondary` 클래스로 통일 | High |
| **인풋/셀렉트** | `.input` 클래스 정의 (focus:ring-2 ring-indigo-100, border-indigo-600) | QuestionBank, CopyFromBankModal의 search input은 `.input` 미사용, 인라인 스타일 재정의 중. 특히 셀렉트(`<select>`)는 `.input` 없이 raw 스타일만 사용 | `<select>`도 `.input` 또는 `.select` 클래스로 포괄, 전 파일 통일 | High |
| **모달 구조** | ExcelUploadModal, CopyFromBankModal, AddBankModal, QuestionBankModal — 4개 모달이 각각 헤더/바디/푸터 구조를 반복 구현 | 모달 래퍼 컴포넌트(ModalShell) 부재 — 코드 중복, 일관성 유지 어려움 | `<ModalShell title onClose maxWidth>` 공용 컴포넌트 추출 | Medium |
| **문항 유형 배지** | AddQuestionModal만 유형별 컬러 배지 사용, 나머지는 회색 단일 배지 | 동일 유형인데 화면마다 다르게 보임 — 교수자 혼선 가능 | `<TypeBadge type />` 공용 컴포넌트 추출하여 전 화면 통일 | High |
| **토글 컴포넌트** | QuizCreate에 Toggle 함수 컴포넌트 정의, 재사용 가능 구조 | `src/components/`로 분리되지 않아 QuizCreate 전용으로만 사용됨 | `Toggle`을 `/components/Toggle.jsx`로 분리하여 공용화 | Low |
| **borderRadius 단위** | `borderRadius: 4` (인라인, px 암묵적), `style={{ borderRadius: 8 }}` 혼용 | Tailwind `rounded` (4px), `rounded-lg` (8px)와 혼용 — 통일 기준 없음 | Tailwind 유틸리티 클래스로 통일 (`rounded`, `rounded-md`, `rounded-lg`) | Medium |

---

## 4. 레이아웃 그리드 및 여백 체계

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **최대 너비** | QuestionBank: `max-w-[1200px]` / QuizCreate: `max-w-2xl (672px)` | 페이지별 max-width 기준이 상이하지만 의도적 구분으로 보임 (목록형 vs 폼형) — 문서화 필요 | 레이아웃 가이드에 목록형(1200px) / 폼형(672px) 기준 명시 | Low |
| **페이지 내부 여백** | `px-6 sm:px-10 xl:px-16` (QuestionBank) / `px-4 sm:px-6` (QuizCreate) | 동일 Layout 컴포넌트를 쓰지만 내부 px가 다름 — 시각적 불일치 | 페이지 유형별 padding 기준 정리 또는 Layout 컴포넌트에 variant prop 추가 | Medium |
| **카드 내부 여백** | `.card-flat p-4`, `.card-flat p-5` 혼용 | 동일 카드 유형인데 p-4/p-5가 혼재 — 필터 카드(p-4) vs 섹션 카드(p-5) | 컴포넌트 역할별 내부 여백 기준 통일 | Low |
| **QuestionBankList 카드 그리드** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | 카드 최소 높이 `min-h-[148px]`이 추가 카드(점선 버튼)에만 적용, 은행 카드에는 미적용 — 카드 높이 불균일 가능 | 은행 카드에도 `min-h-[148px]` 또는 동일 기준 적용 | Medium |

---

## 5. 반응형 브레이크포인트 대응

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **QuestionBank 헤더 버튼** | `<span className="hidden sm:block">다른 은행에서 복사</span>` — 모바일에서 텍스트 숨기고 아이콘만 노출 | 아이콘만 노출 시 aria-label 없음 — 스크린리더 및 마우스 tooltip 없음 | `aria-label="다른 은행에서 복사"` 추가 또는 `title` 속성 보완 | High |
| **CopyFromBankModal** | `flex items-end sm:items-center` — 모바일 바텀시트 방식 | max-height 85vh 고정인데 모바일에서 키보드 팝업 시 레이아웃 깨짐 가능 | iOS `env(safe-area-inset-bottom)` 또는 `pb-safe` 처리 고려 | Medium |
| **QuizCreate 문항 구성 그리드** | `grid-cols-2 gap-4` (문항 유형/배점 폼) — 반응형 없음 | 375px 모바일에서 두 컬럼이 너무 좁아짐 (각 약 160px) | `grid-cols-1 sm:grid-cols-2`로 변경 | High |
| **QuestionBankList 빈 상태** | 텍스트 중앙 정렬, 고정 버튼 1개 | 모바일 375px에서 문제없음 | 현재 양호 | — |
| **필터 영역** | `flex flex-col sm:flex-row gap-3` | 현재 양호 | — | — |

---

## 6. 접근성 (대비, 포커스, 스크린리더)

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **포커스 스타일 — 커스텀 버튼** | 인라인 스타일 hover 처리 버튼들은 `focus:outline-none` 없이도 브라우저 기본 outline 제거 가능성 | QuestionBank 헤더 보조 버튼: `.btn-secondary` 미사용, `focus` 스타일 별도 정의 없음 | `focus-visible:ring-2 focus-visible:ring-indigo-400` 추가 | High |
| **포커스 스타일 — Toggle** | `<input type="checkbox" className="sr-only" />` — 시각적 숨김 처리 | 커스텀 토글 div에 포커스가 전달되지 않음 — 키보드 접근 불가 | `<label>`에 포커스 링 또는 `tabIndex={0}` + `onKeyDown` 처리 | High |
| **아이콘 전용 버튼** | Trash2, Edit2, X 등 아이콘만 있는 버튼 다수 | `aria-label` 전혀 없음 — 스크린리더에서 버튼 목적 불명 | 모든 아이콘 전용 버튼에 `aria-label` 추가 (`aria-label="문항 삭제"` 등) | Critical |
| **색상 대비 — 비활성 텍스트** | `#9E9E9E` (gray-400 상당)를 흰 배경에 사용 | 흰 배경 기준 #9E9E9E의 대비비 약 2.85:1 — WCAG AA 기준(4.5:1) 미달 | caption/부연설명에서 `#9E9E9E` → `#757575`(3.88:1) 이상으로 상향, 또는 font-size 14px 이상 유지 시 3:1 기준 적용 | High |
| **색상 대비 — 배지 텍스트** | 유형 배지 `#616161` on `#F5F5F5` = 약 5.74:1 — AA 통과 | 현재 양호 | — | — |
| **체크박스 accent-color** | CopyFromBankModal: `accent-indigo-600` 사용 | `readOnly` 체크박스에 클릭 이벤트가 부모 div에만 있어 체크박스 자체는 비활성화 목적으로 readOnly 처리 — 보조기기에서 혼선 가능 | `<input type="checkbox" tabIndex={-1} aria-hidden="true" />` 처리 권장 | Medium |
| **모달 포커스 트랩** | 모달 열릴 때 autoFocus 일부 적용 | 모달 내 Tab 키 순환(focus trap) 구현 없음 — 모달 뒤 콘텐츠로 포커스 이탈 가능 | `react-focus-trap` 또는 수동 focus trap 로직 추가 | High |

---

## 7. 빈 상태 및 로딩 상태 처리

| 항목 | 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|---|
| **QuestionBankList 빈 상태** | BookOpen 아이콘 + 안내 텍스트 + 버튼 — 적절한 Empty state | 현재 양호 | — | — |
| **QuestionBank 빈 상태** | "아직 문항이 없습니다" 텍스트 + 추가 버튼 — 기본 처리 | 문제은행 상세 빈 상태에 아이콘 없음, 흰 배경에 회색 텍스트만 — 임팩트 약함 | BookOpen 또는 PlusCircle 아이콘 추가하여 QuestionBankList와 일관성 맞춤 | Low |
| **검색 결과 없음** | "검색 결과가 없습니다" 텍스트 처리 | 아이콘 없음, 검색어 초기화 버튼 없음 | 검색 무효 아이콘 + "검색어 초기화" 링크 추가 | Medium |
| **로딩 상태** | ExcelUploadModal만 `loading` 상태 텍스트 처리 | 그 외 모든 비동기 액션에 로딩 스피너/스켈레톤 없음. 현재는 mock data라 무관하나 실데이터 전환 시 필수 | 공용 Spinner 컴포넌트 및 Skeleton 컴포넌트 설계 사전 정의 | Medium |
| **삭제 확인 다이얼로그** | `deleteBank`, `deleteQuestion` 즉시 실행 — confirm 없음 | 실수로 은행/문항 삭제 시 복구 불가 (문제은행은 퀴즈에서 사용 중일 수도 있음) | 삭제 전 확인 모달 추가 (특히 퀴즈에서 사용 중인 문제은행 삭제) | Critical |

---

## 8. 고객사 요구사항 — 신규 UI 설계 방향

현재 데이터 모델에 `difficulty`, `group` 필드 자체가 없으며 관련 UI 전무. 아래는 각 요구사항별 UI 설계 방향 제안이다.

| 요구사항 | 현재 상태 | 설계 방향 | 우선순위 |
|---|---|---|---|
| **① 문항 메타데이터 (난이도, 그룹) 표시 UI** | 없음 — 데이터 모델에 difficulty/group 필드 없음 | QuestionItem에 난이도 배지(하/중/상, 3단계 컬러 — green/yellow/red 계열) + 그룹 태그 추가. QuestionForm에 난이도 셀렉트, 그룹 입력 필드 추가 | High |
| **② 복수 문제은행 선택 UI** | QuizCreate의 QuestionBankModal은 은행을 1개씩 순차 선택하는 2단계 구조 | 은행 선택 Step에서 다중 선택 가능하도록 체크박스 추가. 선택된 복수 은행의 문항을 탭 또는 필터로 구분하여 한 화면에서 탐색 | High |
| **③ 랜덤 출제 설정 UI (그룹별 출제 수, 난이도별 배점)** | 없음 — 현재 수동 문항 1개씩 추가만 가능 | QuizCreate 문항 구성 탭에 "랜덤 출제 설정" 섹션 추가: 문제은행 선택 → 그룹별 출제 수 입력 → 난이도별 배점 설정 → 미리보기 | High |
| **④ 엑셀 일괄 업로드 UI 개선** | 드래그앤드롭 미지원, 업로드 후 미리보기 5개만 표시 | 드래그앤드롭 영역 추가 (drag over 시 보더 컬러 변경). 미리보기를 전체 스크롤 테이블로 변경. 오류 행은 빨간색 하이라이트로 표시 | Medium |
| **⑤ 시험 출제 탭 명칭 직관성** | QuizCreate 탭: "기본 정보" / "문항 구성" | "기본 정보" → "퀴즈 설정", "문항 구성" → "문항 출제" 로 변경 고려. 또는 탭 위에 퀴즈 생성 프로세스(3단계 step indicator) 추가 | Medium |
| **⑥ 문항 순서 일관성** | GripVertical 아이콘 있으나 실제 DnD(drag-and-drop) 기능 미구현 — 시각적 힌트만 존재 | `@dnd-kit/core` 또는 `react-beautiful-dnd` 기반 실제 드래그 정렬 구현. 순서 번호(1, 2, 3...)와 함께 표시 | High |
| **⑦ 부분 점수 UI** | 현재 부분 점수 개념 없음 — 배점만 단순 숫자 입력 | multiple_answers 등 복수선택 유형에서 "부분 점수 허용" 토글 추가. 허용 시 정답 개수별 점수 비율 입력 필드 노출 (예: 정답 1개 선택 시 50%, 2개 모두 시 100%) | Medium |

---

## 종합 우선순위 요약

| 우선순위 | 항목 |
|---|---|
| **Critical** | 아이콘 전용 버튼 `aria-label` 누락 / 삭제 확인 모달 없음 |
| **High** | 문항 유형 배지 색상 시스템 불일치 / `.btn-secondary` 클래스 미사용 / 인풋 클래스 미통일 / 포커스 스타일 누락 (커스텀 버튼, Toggle) / 모달 포커스 트랩 없음 / 색상 대비 #9E9E9E WCAG AA 미달 / Semantic 배지 variant 미정의 / 모바일 grid-cols 반응형 누락 / 아이콘 버튼 모바일 aria-label 누락 / 고객사 요구사항 ①②③⑥ UI 설계 |
| **Medium** | h1 크기 불일치 / h2 위계 약함 / borderRadius 혼용 / 페이지 px 불일치 / 카드 높이 불균일 / 검색 결과 없음 Empty state 보완 / 로딩 Skeleton 사전 설계 / 체크박스 보조기기 처리 / CopyFromBankModal iOS safe-area / 고객사 요구사항 ④⑤⑦ |
| **Low** | 색상 토큰 정리 (hex → Tailwind) / base font-size 표준화 / caption 크기 혼용 / 카드 내부 여백 혼용 / Toggle 컴포넌트 공용 분리 / QuestionBank 빈 상태 아이콘 |
