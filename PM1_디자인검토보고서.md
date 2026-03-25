# PM1 디자인 검토 보고서
**XN Quizzes Prototype — UI/UX Design Review**
검토일: 2026-03-25
검토자: PM1 (디자이너)
검토 범위: QuizList, GradingDashboard, QuizCreate, QuizEdit, QuestionBank, Layout, index.css

---

## 요약

전체적으로 모던하고 깔끔한 화이트 모드 기조는 잘 유지되어 있으며, indigo-600 주색과 slate 계열 보조색 사용도 대체로 일관적이다. 그러나 파일 간 컴포넌트 중복 정의, slate와 gray의 혼용, 인라인 스타일 및 임의 숫자 하드코딩 등 일관성 균열이 곳곳에 존재한다. 접근성(포커스 스타일, 색상 대비)과 반응형(태블릿 중간 구간, 버튼 텍스트 숨김 처리) 보완이 필요하다.

---

## 검토 항목별 현황

### 1. 색상 시스템 일관성

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| 주색 indigo-600, 배경 #F5F6F8, 카드 white 기조 잘 정립됨 | `slate`와 `gray`가 혼용됨. GradingDashboard는 `slate-*` 계열, QuizList는 `gray-*` 계열이 주로 사용됨 | 텍스트/보더/배경 전반을 `slate` 또는 `gray` 중 하나로 통일. 프로젝트 기준 `slate` 권장 (이미 index.css는 gray-900 기반이나 컴포넌트 대다수는 slate 사용) | **High** |
| LIGHT_COLORS (문항 유형 배지)가 여러 파일에 동일하게 중복 정의됨 | GradingDashboard.jsx L18-31, QuizCreate.jsx L48-61, QuizEdit.jsx L28-41, QuestionBank.jsx L9-22 — 총 4곳에 동일 객체 복사 존재. QuestionBank만 `border-*` 클래스를 추가 포함하여 미세한 불일치 발생 | `src/constants/questionTypes.js` (또는 기존 `mockData.js`) 로 LIGHT_COLORS를 단일 소스로 추출 후 import하여 사용 | **High** |
| 채점 완료 색: emerald-600, 미채점 색: amber-500/600 혼용 | QuizList L121 `text-emerald-600` / GradingDashboard L140 `text-emerald-600` — 이 부분은 일관. 그러나 미채점은 L120 `text-amber-500`, GradingDashboard L141 `text-amber-500`, StudentListItem L639 `text-amber-600` 으로 달라짐 | 미채점은 `amber-500`, 채점 완료는 `emerald-600`으로 시스템 확정 후 일괄 적용 | **Medium** |
| 진행률 바에 인라인 style로 gradient 사용 | QuizList.jsx L141, GradingDashboard.jsx L160: `style={{ background: 'linear-gradient(90deg, #818CF8, #6366F1)' }}` — Tailwind 토큰 외부에 하드코딩됨 | `bg-gradient-to-r from-indigo-400 to-indigo-600` 으로 Tailwind 클래스화하거나 index.css에 토큰 정의 | **Medium** |

---

### 2. 타이포그래피 위계

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| Pretendard CDN, body 14px/1.6, h1~h4 letter-spacing -0.025em 설정됨 | `h1` 크기가 페이지마다 다름. QuizList.jsx L24 `text-2xl`, QuizCreate.jsx L113 `text-xl`, QuizEdit.jsx L75 `text-lg`, QuestionBank.jsx L70 `text-2xl` — 같은 레벨의 페이지 제목이 24/20/18px로 혼재 | 페이지 타이틀(h1) = `text-2xl font-bold`로 통일. Layout에 `pageTitle` 헬퍼 컴포넌트 정의 추천 | **High** |
| 섹션 헤더(h2/h3) 크기도 불일치 | QuizCreate의 Section 컴포넌트 h2: `text-sm font-semibold` (L426). GradingDashboard의 패널 헤더: `text-sm font-medium` / `text-xs font-medium` 등 레벨 혼재 | h2 = `text-sm font-semibold`, h3 = `text-xs font-semibold`, body = `text-sm`, caption = `text-xs` 로 위계 고정 | **Medium** |
| 카드 내 수치 숫자에 임의 크기 사용 | QuizList.jsx L125 `text-[18px]`, GradingDashboard.jsx L144 `text-[18px]`, 하단 캡션 L127 `text-[11px]` — Tailwind 토큰 외 임의값 사용 | `text-lg`(18px), `text-[11px]` → `text-[11px]`는 `text-xs`(12px)로 근사하거나 index.css에 커스텀 토큰 정의 | **Low** |
| 브레드크럼 텍스트 크기 `text-[13px]` 하드코딩 | Layout.jsx L20, L33, L38: `text-[13px]` 3회 반복 | `text-xs`(12px) 또는 `text-[13px]`를 index.css에 `.text-breadcrumb` 유틸 정의 후 재사용 | **Low** |

---

### 3. 컴포넌트 재사용성 및 일관성

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| index.css에 `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.card`, `.badge` 잘 정의됨 | QuizCreate/QuizEdit의 인라인 버튼들이 `.btn-*` 클래스를 사용하지 않고 직접 클래스를 조합함. 예: QuizEdit.jsx L89 `flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg` — `.btn-secondary`와 유사하나 `rounded-lg`(8px) vs `.btn-secondary`의 `rounded-xl`(12px) 불일치 | QuizEdit/QuizCreate 내 버튼도 `.btn-primary`, `.btn-secondary` 클래스 활용. 불가피한 크기 차이만 `text-xs py-1.5` 오버라이드 처리 | **High** |
| AddQuestionModal, QuestionBankModal이 QuizCreate/QuizEdit 양쪽에 각각 중복 정의됨 | QuizCreate.jsx L461-647, QuizEdit.jsx L242-468 — 거의 동일한 모달 컴포넌트가 두 파일에 중복. 버그 수정 시 양쪽 반영이 누락될 위험 존재 | `src/components/modals/` 디렉토리로 AddQuestionModal, QuestionBankModal 추출하여 공유 | **Critical** |
| TabBtn 컴포넌트가 QuizCreate.jsx L180과 GradingDashboard.jsx에 각각 별도 정의됨 | QuizCreate의 TabBtn은 `border-b-2` 방식, GradingDashboard의 TabBtn은 `bg-slate-100` pill 방식 — 의도된 차이라면 허용, 아니라면 통일 필요 | 두 탭 스타일 유형(Underline Tab / Segmented Control)을 `src/components/Tabs.jsx`로 명시적으로 분리 정의 | **Medium** |
| CustomSelect가 QuizCreate에서만 사용되고 QuizEdit는 네이티브 `<select>` 사용 | QuizCreate.jsx L224, L287, L309: CustomSelect 사용. QuizEdit.jsx L181-199: 동일 목적의 드롭다운을 `<select>` 태그로 처리 — 시각적 일관성 파괴 | QuizEdit도 CustomSelect 또는 index.css로 스타일링된 `<select>`로 통일 | **High** |
| 채점 점수 입력 인풋이 `.input` 클래스 미사용 | GradingDashboard.jsx L590: 점수 입력용 `<input>`에 직접 클래스 조합 사용. `.input` 클래스와 테두리 색(`border-slate-300` vs `border-[#E5E7EB]`), 라운드값(`rounded-lg` vs `rounded-xl`) 불일치 | 소형 인풋에도 `.input` 적용 후 `w-16` 등 크기만 오버라이드 | **Medium** |

---

### 4. 레이아웃 그리드 및 여백 체계

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| 최대 너비 `max-w-screen-xl`, 페이지 패딩 `px-4 sm:px-6` 대체로 일관 | QuizCreate.jsx L112 `max-w-2xl` — 다른 페이지는 `max-w-screen-xl`인데 QuizCreate만 좁은 너비 사용. 폼 페이지 의도적 제한이라면 주석이나 정책 명시 필요 | 폼 레이아웃의 max-width 정책을 문서화. `max-w-2xl`이 의도라면 유지하되 QuizEdit 설정 패널과 비교 검토 필요 | **Low** |
| 카드 내 여백이 `p-4`/`p-5` 혼용 | GradingDashboard L119 `p-4 sm:p-5`, QuestionBankItem L167 `p-4`, QuizCreate의 Section L425 `p-5` — 소폭 혼용이나 패턴은 일관 | 카드 패딩을 `p-5` (데스크톱 기준)로 통일하거나 `p-4 sm:p-5` 패턴을 일관 적용 | **Low** |
| GradingDashboard의 split-pane 최소 높이 calc 하드코딩 | GradingDashboard.jsx L225 `min-h-[calc(100vh-360px)]` — 360px은 헤더+상단 요소 높이의 추정값. 헤더 높이가 변경되면 레이아웃 깨짐 | CSS 변수(`--header-height`)로 분리하거나 flex 기반 full-height 레이아웃으로 리팩토링 | **Medium** |

---

### 5. 반응형 브레이크포인트 대응

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| `sm:` 브레이크포인트(640px) 기반 반응형 기본 적용됨 | 태블릿(768px) 구간 전용 대응이 전무. `sm:` → `lg:` 사이에서 레이아웃 전환 없이 바로 3컬럼 전환됨. 예: QuizEdit.jsx L79 `grid lg:grid-cols-3` — 768~1024px 구간에서 2컬럼이 더 적합 | `md:grid-cols-2 lg:grid-cols-3` 패턴 적용. 태블릿 구간(768px) 중간 레이아웃 설계 필요 | **High** |
| 헤더 브레드크럼에서 퀴즈 제목이 긴 경우 넘침 처리 불완전 | Layout.jsx L38 `truncate` 적용됨. 그러나 브레드크럼 아이템이 3단계일 때 (GradingDashboard: 퀴즈 관리 / 긴 퀴즈 제목 / 채점 대시보드) 모바일에서 중간 항목이 화면 밖으로 밀릴 수 있음 | 마지막 브레드크럼 항목만 표시하는 모바일 축약 처리 또는 `max-w-[120px]` 제한 적용 | **Medium** |
| QuizList 헤더 버튼의 텍스트가 `sm:block`으로만 처리됨 | QuizList.jsx L29 `hidden sm:block`, L33 `hidden sm:block` — 375px 모바일에서 "문제은행", "새 퀴즈" 텍스트가 사라지고 아이콘만 남음. aria-label 없음 | `aria-label` 속성 추가. 아이콘 단독 노출 시 tooltip 또는 시각적 레이블 최소 보장 필요 | **High** |
| 모달이 모바일에서 bottom-sheet 스타일로 전환됨 | QuizCreate.jsx L473, QuizEdit.jsx L254: `items-end sm:items-center` — 의도된 bottom-sheet 패턴이나 모달 높이가 `85vh`로 고정될 때 소형 폰(812px 이하)에서 스크롤 영역이 부족할 수 있음 | `max-h-[85vh]`를 `max-h-[90dvh]`로 변경(dynamic viewport 대응) 및 최소 높이 보장 | **Medium** |

---

### 6. 접근성 (WCAG AA)

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| `.input` focus 링: `focus:ring-4 focus:ring-indigo-50` 정의됨 | 그러나 QuizCreate/QuizEdit/GradingDashboard 내 직접 정의된 인라인 인풋들은 `focus:outline-none` 만 적용되고 focus-visible 링 미적용. 예: QuizEdit.jsx L173, QuizCreate.jsx L514, GradingDashboard.jsx L590 | 모든 인터랙티브 요소에 `focus-visible:ring-2 focus-visible:ring-indigo-400` 일관 적용. `.input` 클래스 사용 확대로 자동 해결 | **Critical** |
| 버튼 아이콘 단독 사용 시 aria-label 없음 | Layout.jsx의 로고 링크, QuizCreate/QuizEdit의 모달 닫기(X) 버튼, QuestionBank의 Edit2/Trash2 아이콘 버튼 — 스크린리더 접근 불가 상태 | 아이콘 전용 버튼에 `aria-label="닫기"`, `aria-label="편집"`, `aria-label="삭제"` 추가 | **Critical** |
| 라디오 버튼 대체 구현(차시 선택)에 키보드 접근 불가 | QuizCreate.jsx L236-244: div 기반 커스텀 라디오 — `onClick` 만 있고 `onKeyDown`, `role="radio"`, `aria-checked` 미적용. Tab키로 포커스 이동 불가 | `<input type="radio">` + 커스텀 스타일 조합으로 변경하거나, `role="radio" tabIndex={0} onKeyDown` 처리 추가 | **Critical** |
| 색상만으로 상태 구분 (색맹 취약) | 미채점(amber) / 채점완료(emerald) 구분이 색상에만 의존. 예: QuizList.jsx L77 상태 dot, StudentRow L541 미채점 뱃지 | 색상에 더해 아이콘 또는 텍스트 레이블을 병기 — 이미 일부 구현됨(CheckCircle2, AlertCircle). 퀴즈 상태 dot(color-only)에 아이콘 추가 보완 필요 | **High** |
| Toggle 컴포넌트 `sr-only` input이 있으나 focus 스타일 없음 | QuizCreate.jsx L447: `className="sr-only"` — 화면에 숨겨진 checkbox라 키보드 포커스 시 시각적 피드백 없음 | `peer` 패턴 활용하여 `peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400` 토글 외부 div에 적용 | **High** |
| 텍스트 대비비 잠재 위험: gray-400/slate-400 텍스트 | `text-gray-400`(#9CA3AF)와 white 배경 대비비: 2.85:1 — WCAG AA 기준(4.5:1) 미달. QuizList.jsx L87, L53, GradingDashboard 전반에서 caption/meta 정보에 사용 | caption/보조 텍스트를 `text-gray-500`(#6B7280, 대비비 3.95:1)으로 상향. 또는 `text-slate-500` 활용. 완전 AA 준수는 `text-gray-600`(#4B5563) 이상 필요 | **High** |

---

### 7. 빈 상태(Empty State) 및 로딩 상태 처리

| 현재 상태 | 문제점 | 개선안 | 우선순위 |
|---|---|---|---|
| GradingDashboard에 EmptyState 컴포넌트 구현됨 (문항/학생 미선택 시) | QuizList.jsx에 퀴즈가 0개인 경우 Empty State 없음. `otherQuizzes` 빈 배열일 때 섹션 헤더("전체 퀴즈 (0)")만 표시됨 | 퀴즈가 없을 때 "아직 생성된 퀴즈가 없습니다" + 새 퀴즈 만들기 CTA 버튼을 포함한 Empty State 추가 | **High** |
| QuestionBank 검색 결과 없음 처리됨 (L129) | 정상 | — | — |
| 전체 페이지 및 컴포넌트에 로딩 스켈레톤 없음 | 현재 mock 데이터라 문제 없으나, 실데이터 전환 시 모든 리스트/카드가 빈 화면으로 깜빡임 발생 | 각 리스트 영역에 Skeleton 컴포넌트 설계(카드형 shimmer) 준비. `src/components/Skeleton.jsx` 미리 구현 권장 | **Medium** |
| GradingDashboard에서 문항 선택 전 EmptyState는 있으나 일러스트 또는 아이콘 없음 | EmptyState 컴포넌트가 텍스트만 표시 — 정보 전달은 되나 시각적 완성도 낮음 | 간단한 아이콘(FileText, Users 등 lucide 기반) + 텍스트 조합으로 Empty State 시각 보강 | **Low** |

---

## 우선순위 종합 요약

### Critical (즉시 수정)

| # | 항목 | 파일 |
|---|---|---|
| C-1 | AddQuestionModal / QuestionBankModal 중복 정의 — 단일 소스로 추출 | QuizCreate.jsx, QuizEdit.jsx |
| C-2 | focus-visible 스타일 미적용 인라인 인풋 전반 | QuizEdit.jsx L173, QuizCreate.jsx L514, GradingDashboard.jsx L590 등 |
| C-3 | 아이콘 전용 버튼 aria-label 누락 | Layout.jsx, QuizCreate.jsx L483, QuestionBank.jsx L186-193 등 |
| C-4 | 커스텀 라디오(차시 선택) 키보드 접근 불가 | QuizCreate.jsx L234-256 |

### High (이번 스프린트 내 처리)

| # | 항목 | 파일 |
|---|---|---|
| H-1 | LIGHT_COLORS 4중 중복 정의 → 단일 파일로 추출 | GradingDashboard.jsx L18, QuizCreate.jsx L48, QuizEdit.jsx L28, QuestionBank.jsx L9 |
| H-2 | slate / gray 텍스트 계열 혼용 정리 | 전체 |
| H-3 | 페이지 h1 타이틀 크기 불일치 통일 (text-2xl 기준) | QuizCreate.jsx L113, QuizEdit.jsx L75 |
| H-4 | QuizCreate/QuizEdit 버튼이 .btn-* 클래스 미사용 — rounded-lg(8px) vs rounded-xl(12px) 불일치 | QuizEdit.jsx L89-100, QuizCreate.jsx L360-370 |
| H-5 | CustomSelect vs 네이티브 select 혼용 | QuizEdit.jsx L184-199 |
| H-6 | 태블릿(768px) 구간 레이아웃 미대응 | QuizEdit.jsx L79 |
| H-7 | 모바일 아이콘 전용 버튼 텍스트 숨김 시 aria-label 누락 | QuizList.jsx L27-34 |
| H-8 | caption 텍스트 gray-400 대비비 WCAG AA 미달 | 전체 (text-gray-400 사용 위치) |
| H-9 | Toggle 컴포넌트 focus-visible 피드백 없음 | QuizCreate.jsx L443-458 |
| H-10 | QuizList 퀴즈 0건 Empty State 부재 | QuizList.jsx L52-59 |

### Medium (다음 스프린트)

| # | 항목 | 파일 |
|---|---|---|
| M-1 | 진행률 바 인라인 gradient → Tailwind 클래스화 | QuizList.jsx L141, GradingDashboard.jsx L160 |
| M-2 | 미채점 색 amber-500/600 혼용 통일 | QuizList.jsx L120, GradingDashboard.jsx L639 |
| M-3 | TabBtn 컴포넌트 두 유형 명시적 분리 정의 | QuizCreate.jsx L180, GradingDashboard.jsx |
| M-4 | 채점 인풋 .input 클래스 미사용 | GradingDashboard.jsx L590 |
| M-5 | split-pane 최소 높이 calc 하드코딩 제거 | GradingDashboard.jsx L225 |
| M-6 | 모달 max-h를 dvh 단위로 변경 | QuizCreate.jsx L475, QuizEdit.jsx L380 |
| M-7 | 브레드크럼 모바일 overflow 처리 개선 | Layout.jsx L24-43 |
| M-8 | 로딩 스켈레톤 컴포넌트 설계 준비 | src/components/Skeleton.jsx (신규) |

### Low (백로그)

| # | 항목 | 파일 |
|---|---|---|
| L-1 | 임의 숫자 text-[18px], text-[11px] Tailwind 토큰화 | QuizList.jsx L125-127, GradingDashboard.jsx L144-146 |
| L-2 | 브레드크럼 text-[13px] 유틸 클래스화 | Layout.jsx L20, L33, L38 |
| L-3 | QuizCreate max-w-2xl 정책 문서화 | QuizCreate.jsx L112 |
| L-4 | EmptyState 아이콘 시각 보강 | GradingDashboard.jsx (EmptyState 컴포넌트) |

---

## 주요 발견사항 상세

### 가장 시급한 구조 문제: 모달 컴포넌트 중복 (C-1)

```
QuizCreate.jsx L461-549  : AddQuestionModal
QuizCreate.jsx L551-647  : QuestionBankModal
QuizEdit.jsx L242-348    : AddQuestionModal (동일)
QuizEdit.jsx L350-468    : QuestionBankModal (동일)
```
두 파일의 모달이 동일한 UI이지만 별도로 유지됨. 향후 버그 수정이나 디자인 변경 시 두 파일을 동시에 수정해야 하며 누락 위험이 높다.

### 접근성 위험: 커스텀 라디오 (C-4)

`QuizCreate.jsx L236-244`: div에 onClick만 있고 `role`, `tabIndex`, `onKeyDown` 없음. 키보드 사용자와 스크린리더 사용자가 차시를 선택할 수 없는 상태다.

### 색상 대비비 위험 구체 수치

| 색상 | 배경 | 대비비 | WCAG AA(일반 텍스트) |
|---|---|---|---|
| gray-400 (#9CA3AF) | white | 2.85:1 | 실패 (기준: 4.5:1) |
| gray-500 (#6B7280) | white | 3.95:1 | 실패 |
| gray-600 (#4B5563) | white | 5.74:1 | 통과 |
| slate-400 (#94A3B8) | white | 2.98:1 | 실패 |
| slate-500 (#64748B) | white | 4.48:1 | 경계값 (주의) |

현재 caption 및 보조 텍스트 상당 부분이 gray-400/slate-400으로 처리되어 있어 WCAG AA 기준을 충족하지 못한다. gray-600 이상 또는 slate-600으로 상향이 필요하다.
