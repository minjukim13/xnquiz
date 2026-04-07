# PM1 디자인 검토 보고서

**검토자**: PM1 (디자이너)
**검토일**: 2026-04-07
**검토 범위**: `src/pages/`, `src/components/`, `src/index.css` (전체 파일 직접 분석)

---

## 총평

소스 코드를 전체 파일 기준으로 직접 분석한 결과, 색상 시스템 혼용, 접근성 미비, 컴포넌트 파편화, 인라인 스타일 남용이 전반에 걸쳐 확인된다. Critical 이슈 4건(포커스 인디케이터 부재, 색상 대비 WCAG AA 미달, 모바일 Nav 부재)이 즉각 수정 필요하며, 특히 `#9E9E9E` 텍스트 색상이 흰 배경 대비 2.85:1로 WCAG AA 기준(4.5:1)을 충족하지 못하는 상태가 프로젝트 전체 40+ 곳에 분포한다. Select 컴포넌트 3종 파편화(`CustomSelect`, `DropdownSelect`, `AppSelect`)와 `btn-primary` 미준수 버튼 산재도 High 등급 이슈로 분류된다.

---

## 1. 색상 시스템 일관성

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **Primary 색상 3종 혼용** | `#6366f1`(indigo-500), `#4f46e5`(indigo-600), `#4338ca`(indigo-700)이 동시에 사용됨 | `QuizList.jsx` 채점 버튼 `#4F46E5`, `QuizStats.jsx` 채점 대시보드 버튼 `bg-indigo-600`(Tailwind 클래스), `index.css` 탭 활성 상태 `#6366f1` — 동일 역할에 3가지 값 혼재. `indigo-500(#6366f1)`과 `indigo-600(#4f46e5)`은 서로 다른 색 | Primary를 `indigo-600(#4f46e5)` 단일 값으로 통일, CSS 변수 `--color-primary` 토큰화 | **High** |
| **Status badge 색상 중복 정의** | `STATUS_CONFIG`(QuizList)와 `STATUS_MAP`(GradingDashboard)에 동일 상태에 대해 별도 객체 분리 | `open` 상태 배경이 QuizList `#F0FDF4`(green-50), StudentQuizCard `#E5FCE3`(커스텀)으로 다름. Green 계열도 `#018600`, `#16A34A`, `#018600` 3종 혼용 | 상태별 색상을 단일 `STATUS_STYLES` 상수 파일로 추출해 전체 공유 | **High** |
| **Red 계열 4종 혼용** | `#B43200`, `#EF4444`, `#B91C1C`, `text-red-600` 혼재 | `QuizList.jsx` D-day 배지 `#B43200`, `AddQuestionModal.jsx` essay 유형 `#EF4444`, `QuestionBank.jsx` 난이도 HIGH `#DC2626`, `QuizStats.jsx` — 오류/위험 의미인지 강조 의미인지 불분명 | Destructive(오류) = `#EF4444`, Warning(D-day, 마감 임박) = `#B45309`으로 역할 분리 후 고정 | **High** |
| **회색 계열 7종 이상 혼재** | `#9E9E9E`, `#BDBDBD`, `#616161`, `#424242`, `#757575`, `#9CA3AF`, `#6B7280` 등 | Tailwind gray와 Material gray(#9E9E9E 계열)가 혼용되어 시각적 미세 차이 발생 | slate-400/500/600 또는 3~4단계 회색 토큰으로 정리 | **Medium** |
| **탭 활성 색상** | `QuizStats.jsx`, `QuizCreate.jsx`에서 활성 탭 border/text에 `#6366f1`(indigo-500) 사용 | `btn-primary`는 `indigo-600(#4f46e5)`인데 탭 활성 색상은 `indigo-500(#6366f1)` — 미세한 불일치 | `#4f46e5(indigo-600)`으로 통일 | **Medium** |
| **배경색 토큰 없음** | body `#F5F5F5`, 카드 푸터 `#FAFAFA`, 학생 응시 결과 `#F5F7FF` 혼재 | 역할은 구분되나 명시적 토큰 없이 각 파일에서 임의 사용 | CSS 변수 `--bg-page: #F5F5F5`, `--bg-surface: #FAFAFA`, `--bg-accent: #F5F7FF`로 의미 부여 | **Low** |

---

## 2. 타이포그래피 위계

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **기본 폰트 크기 17px 설정** | `index.css` `html { font-size: 17px }` | 1rem = 17px로 환산되어 `text-sm`(0.875rem = 14.875px), `text-xs`(0.75rem = 12.75px) 등 Tailwind 유틸리티 수치가 표준과 달라짐. Tailwind 기본 16px 기준으로 설계된 spacing/sizing도 영향 받음 | `html { font-size: 16px }`로 수정하거나 모든 폰트 크기를 px로 명시 | **High** |
| **H1 크기 불일치** | QuizList 교수자 뷰 `text-xl`, 학생 뷰 `text-2xl`, QuestionBankList `text-2xl` — 페이지마다 다름 | 동일 레벨(리스트 페이지 타이틀)에 xl/2xl 혼용. GradingDashboard 퀴즈 제목은 `text-xl font-bold`, QuizStats 퀴즈 제목은 `text-base font-bold` — 위계 불명확 | 페이지 타이틀 = `text-xl font-bold`, 카드 제목 = `text-base font-semibold`, 서브 정보 = `text-sm`으로 3단계 확정 | **High** |
| **폰트 크기 px 직접 입력 산재** | `style={{ fontSize: 11 }}`, `style={{ fontSize: 12 }}` 다수 사용 | `QuizList.jsx` 학생 스펙 `fontSize: 11`, `GradingDashboard.jsx` 일부 `fontSize: 12` 직접 지정 — Tailwind `text-xs`(12.75px)와 불일치 | `style={{ fontSize }}` 직접 사용 금지, Tailwind text 클래스로 통일 | **Medium** |
| **섹션 헤더 h2 크기** | `QuizCreate.jsx` 섹션 제목 `text-sm font-semibold` | 섹션 제목이 본문 텍스트와 동일한 크기 — 위계 구분 불명확 | 섹션 제목 `text-base font-semibold` 또는 `text-sm font-semibold + 상단 border-t`로 시각 구분 | **Medium** |
| **line-height** | `index.css` `h1~h4 { line-height: 1.3 }`, body `1.6` | 카드 제목이 div 내 p/h3 태그로 구현되어 1.3 설정 미적용 구간 존재. 한글 장문에서 1.3은 타이트 | 카드 타이틀 `leading-snug(1.375)` Tailwind 클래스로 명시, 한글 제목은 1.4 이상 권장 | **Low** |

---

## 3. 컴포넌트 재사용성 및 일관성

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **Select 컴포넌트 3종 파편화** | `CustomSelect`(폼용, 텍스트 스타일 기반), `DropdownSelect`(툴바 필터용, size prop), `AppSelect`(native select 래핑) 3종 공존 | `CustomSelect`와 `DropdownSelect`는 거의 동일한 드롭다운 UX를 중복 구현. 사용처가 기준 없이 혼재 | `DropdownSelect`(size prop 지원)로 통합, `AppSelect`는 네이티브 select가 꼭 필요한 곳에만 유지 | **High** |
| **버튼 스타일 이원화** | `.btn-primary` 클래스 vs 인라인 style 혼재 | `QuestionBankList.jsx` "새 문제은행" 버튼은 `bg-indigo-600 hover:bg-indigo-700` Tailwind 직접 사용. `QuizStats.jsx` "채점 대시보드" 링크는 인라인 스타일로 구현 — `btn-primary` 클래스 미사용 | 모든 CTA 버튼은 `.btn-primary` / `.btn-secondary` / `.btn-ghost` 클래스로 통일 | **High** |
| **`.btn-ghost` 정의됐으나 미사용** | `index.css`에 `.btn-ghost` 정의됐으나 실제로 `onMouseEnter`/`onMouseLeave` 인라인 반복 | 정의된 유틸리티 클래스가 사용되지 않고 인라인 hover 이벤트 코드 30회+ 산재 | `.btn-ghost` 클래스 적극 사용, 인라인 hover 이벤트 제거 | **High** |
| **배지 컴포넌트 미통일** | `index.css`에 `.badge` 클래스 정의됐으나 실제 미사용 — dead code | 전체 상태/유형 배지가 모두 인라인 span+style로 구현. STATUS_CONFIG, StudentQuizCard, GradingDashboard에서 각각 다른 방식으로 배지 구현 | `<StatusBadge status="open" />` 형태의 컴포넌트 추출 또는 `.badge-open`, `.badge-closed` 변형 클래스 정의 | **Medium** |
| **모달 공통 래퍼 없음** | `AddQuestionModal`, `QuestionBankModal`, `ConfirmDialog` 등 모달 UI 각기 독립 구현 | 모달 오버레이 스타일, z-index, 닫기 버튼 위치, 헤더-바디-푸터 spacing이 모달마다 다름 | 공통 `BaseModal` 래퍼 컴포넌트 추출 후 공유 | **Medium** |
| **인라인 hover 핸들러 남용** | 링크/버튼 대부분에 `onMouseEnter`/`onMouseLeave`로 style 직접 조작 | CSS transition이 있음에도 hover 상태를 JS로 처리 — 성능 비효율, 코드 중복 방대. 30회+ 반복 패턴 | Tailwind `hover:` 유틸리티 클래스로 대체 가능한 부분 정리 | **Medium** |
| **전역 토스트 시스템 없음** | `QuestionBank.jsx`에 로컬 `toast` state로만 구현 | 전역 알림 시스템 없이 각 페이지 독립 구현. 다른 페이지에서 토스트 필요 시 재구현 필요 | 전역 Toast Context 또는 `useToast` Custom Hook으로 통합 | **Low** |

---

## 4. 레이아웃 그리드 및 여백 체계

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **max-width 6종 혼재** | QuizList 교수자 `max-w-4xl(896px)`, 학생 `max-w-[760px]`, GradingDashboard `max-w-[1600px]`, QuizCreate `max-w-2xl(672px)`, QuizStats `max-w-[1600px]`, QuestionBankList `max-w-[1200px]` | 페이지마다 다른 max-width — 콘텐츠 너비 기준 없음. 특히 교수자 QuizList와 학생 QuizList가 다른 max-width 사용 | narrow(672px, 폼), medium(896px, 목록), wide(1200px, 대시보드) 3단계 정의 | **High** |
| **수평 패딩 불일치** | `px-6 sm:px-10 xl:px-16`(GradingDashboard, QuizStats) vs `px-4 sm:px-6`(QuizCreate, QuizAttempt) 혼재 | 동일 사이드바 레이아웃 내에서 콘텐츠 내부 패딩이 페이지마다 다름 | `px-6 sm:px-8` 단일 기준으로 통일 | **Medium** |
| **카드 내부 패딩 4종** | QuizCard `px-6 pt-6 pb-5`, StudentQuizCard `px-5 pt-5 pb-4`, GradingDashboard 정보 카드 `p-5 sm:p-6`, QuizStats 카드 `p-4 sm:p-5` | 카드 내부 패딩이 4가지 이상 패턴으로 분산 | 카드 표준 패딩 `p-5` 단일화, 컴팩트 변형 필요 시 `p-4` 허용 | **Medium** |
| **섹션 간격 임의 사용** | `mb-5`, `mb-6`, `mb-8`, `space-y-4`, `space-y-5` 등 다양한 margin 혼용 | 명확한 spacing scale 없이 임의 값 사용 | 섹션 간 `mb-6`, 컴포넌트 간 `mb-4`, 내부 요소 간 `mb-2`로 3단계 정의 | **Low** |
| **사이드바 고정 픽셀 너비** | `Layout.jsx` `width: 200` 고정 픽셀 | 반응형 고려 없이 200px 고정 | `w-48` Tailwind 클래스 또는 `min-w-[180px]`으로 유연하게 | **Low** |

---

## 5. 반응형 브레이크포인트 대응

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **모바일 네비게이션 대안 없음** | `Layout.jsx` 사이드바 `hidden sm:flex` | 모바일에서 사이드바가 사라진 후 네비게이션 대안 없음 — 하단 탭 바 또는 햄버거 메뉴 미구현. 학생/교수자 역할 토글과 네비게이션이 헤더에 혼재 | 모바일용 하단 탭 바 추가 또는 헤더 내 햄버거 메뉴 구현 | **Critical** |
| **헤더 역할 토글 아이콘 직관성** | `sm:block`으로 '교수자'/'학생' 텍스트 숨기고 아이콘만 표시 | `BookOpen`(교수자)과 `GraduationCap`(학생) 아이콘만으로는 역할 구분이 직관적이지 않음 | 툴팁(`title` 속성 또는 aria-label) 추가 또는 모바일에서도 짧은 텍스트 유지 | **Low** |
| **GradingDashboard split-pane 태블릿** | `sm:hidden` 모바일 탭, 데스크톱 2-pane 분리 구현 완료 | 태블릿(768~1023px) 구간에서 split-pane 좌측 패널 너비가 고정되어 콘텐츠 압박 발생 가능 | 태블릿 구간 `md:w-64 lg:w-72` flex 비율 조정 | **Medium** |
| **헤더 브레드크럼 잘림** | `Layout.jsx` 브레드크럼 `overflow-hidden` | 브레드크럼이 길어질 경우 잘림. 375px에서 역할 토글과 공존 불가 | 모바일에서 마지막 breadcrumb 1개만 표시 | **Medium** |
| **QuizAttempt 타이머 레이아웃** | 헤더 우측 타이머 영역 `shrink-0` 처리 | 타이틀이 길 경우 타이머와 겹치는 레이아웃 깨짐 발생 가능 | 타이머와 타이틀 영역을 명시적 `grid` 레이아웃으로 분리 | **Low** |

---

## 6. 접근성 (대비, 포커스, 스크린리더)

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **포커스 링 대비 미달** | `index.css` `focus:ring-2 focus:ring-indigo-100` | `indigo-100`은 매우 연해 포커스 거의 불가시. WCAG SC 2.4.7 기준 3:1 이상 대비비 필요 | `focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`로 강화 | **Critical** |
| **`focus:outline-none` 남발** | 다수 input/button에서 기본 outline 제거 | `DropdownSelect`, `CustomSelect`, `GroupCombobox` 모두 `focus:outline-none`만 있고 대체 포커스 인디케이터 없음. 키보드 전용 사용자 탐색 불가 | `focus:outline-none` 사용 시 반드시 `focus-visible:ring-2 focus-visible:ring-indigo-500` 세트 적용 | **Critical** |
| **`#BDBDBD`/`#9E9E9E` 텍스트 WCAG AA 미달** | 부제목, 날짜, 설명 텍스트에 광범위 사용 | `#BDBDBD` on white 대비비 약 1.6:1, `#9E9E9E` on white 약 2.85:1 — WCAG AA(4.5:1) 대폭 미달. `QuizList.jsx`, `Layout.jsx` 등 40+ 곳 | 일반 텍스트 최소 `#767676`(AA 통과 4.6:1) 이상으로 상향. 완전 장식 용도에만 `#BDBDBD` 허용 | **Critical** |
| **아이콘 전용 버튼 aria-label 없음** | 다수 아이콘 버튼에 텍스트 없음 | `QuestionBank.jsx` Edit/Trash 버튼, `Layout.jsx` 역할 전환 버튼(모바일에서 텍스트 `hidden sm:block`) — 스크린리더 접근 불가 | `aria-label="수정"`, `aria-label="삭제"` 등 추가 | **High** |
| **모달 포커스 트랩 없음** | `AddQuestionModal`, `QuestionBankModal` 등 포커스 트랩 미구현 | 모달 열린 상태에서 Tab으로 모달 외부 요소 포커스 이동 가능. ESC 키 닫기도 일부 미구현 | 모달 open 시 첫 번째 요소로 focus 이동, ESC keydown 핸들러 추가 또는 `react-focus-lock` 도입 | **High** |
| **탭 ARIA role 미적용** | `QuizStats.jsx`, `QuizCreate.jsx`, `GradingDashboard.jsx` 탭 컴포넌트 | 스크린리더가 탭 컴포넌트 인식 불가. WCAG 4.1.2 위반 | 컨테이너: `role="tablist"`, 각 버튼: `role="tab" aria-selected={active}` | **High** |
| **드롭다운 aria 속성 미적용** | `DropdownSelect`, `CustomSelect`, `GroupCombobox` 트리거 버튼 | `aria-expanded`, `aria-haspopup` 미적용 — 스크린리더가 드롭다운 열림/닫힘 상태 인지 불가 | `<button aria-expanded={open} aria-haspopup="listbox">` 패턴 전체 적용 | **High** |
| **폼 라벨-인풋 연결 누락** | `QuizCreate.jsx` 내 레이블 텍스트가 인풋과 연결 없이 독립 렌더링 | 스크린리더가 라벨과 인풋 연결 불가 | `label htmlFor={id}` + `input id={id}` 명시적 연결 적용 | **Medium** |
| **장식용 아이콘 `aria-hidden` 미적용** | lucide-react 아이콘 전반에 `aria-hidden` 미적용 | 장식용 아이콘이 스크린리더에 불필요하게 노출될 수 있음 | 장식 아이콘 전체 `aria-hidden="true"` 추가, 의미 있는 아이콘은 `aria-label` 지정 | **Medium** |

---

## 7. 빈 상태(Empty state) 및 로딩 상태 처리

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| **QuizStats silent failure** | `QuizStats.jsx`에서 quiz not found 시 `mockQuizzes[0]`을 fallback으로 반환 | 잘못된 URL 접근 시 오류 메시지 없이 첫 번째 퀴즈를 그대로 보여주는 오동작. 사용자가 잘못된 데이터를 올바른 것으로 인식할 위험 | `quiz ?? null`로 변경 후 명시적 에러 화면(GradingDashboard의 처리 방식과 동일하게) 연결 | **High** |
| **빈 상태 CTA 없음** | `QuizList.jsx` 교수자/학생 뷰 빈 상태 텍스트 + FileText 아이콘 처리는 있음 | 교수자 뷰 빈 상태에서 "새 퀴즈 만들기" CTA 버튼 미노출. 사용자가 다음 행동을 유도받지 못함 | 빈 상태에 CTA 버튼 추가 — 교수자: "새 퀴즈 만들기", 문제은행: "새 문제은행 만들기" | **Medium** |
| **로딩 상태 없음** | mock 데이터 기반으로 로딩 상태 처리 없음 | 실데이터 전환 시 빈 화면이 순간 노출될 수 있음. Suspense fallback 외 페이지 내 로딩 UI 없음 | 각 페이지에 스켈레톤 UI(카드 형태) 또는 스피너 Placeholder 컴포넌트 준비 | **Medium** |
| **빈 상태 표현 방식 불일치** | 페이지마다 표현 방식이 다름 | `QuizList.jsx` 아이콘+텍스트, `QuestionBank.jsx` 텍스트+링크, `GradingDashboard` 내부 텍스트만 — 동일 패턴이지만 여백과 구성 다름 | 공통 `EmptyState` 컴포넌트(icon, title, description, action props) 정의 및 통일 | **Medium** |
| **에러 토스트 없음** | `QuestionBank.jsx` 문항 복사/추가 성공 시 4초 토스트 표시 | 실패(에러) 상태 토스트 없음 — 성공 케이스만 알림 처리 | 성공/실패 토스트 구분 처리 | **Low** |
| **검색 결과 없음 초기화 버튼 없음** | 주차/차시 필터 결과 없음 텍스트 처리는 있음 | 문제은행 내 검색 결과 없을 때 검색어 초기화 버튼 미제공 | 검색 결과 없음 상태에서 "검색어 초기화" 버튼 제공 | **Low** |

---

## 8. "AI 디자인 티가 난다" — 원인 분석

### 8-1. 과도한 색상 배지 시스템 (AddQuestionModal.jsx L.6-18)

12개 문항 유형마다 각기 다른 색상을 부여했다. multiple_choice #6366f1, true_false #059669, short_answer #F59E0B, essay #EF4444, numerical #8B5CF6, matching #0891B2 등. 유형 선택 화면이 무지개처럼 보인다. 실제 사용자가 유형을 색상으로 구별할 필요가 없음에도 시각적 화려함을 위해 색을 남발한 전형적인 AI 디자인 패턴이다. Canvas, Moodle 등 실무 LMS는 유형 배지에 1-2가지 중성 색상만 사용한다.

**개선안**: 자동채점(indigo), 수동채점(slate), 부분채점(amber) — 채점 방식 기준 3색으로 압축

### 8-2. 아이콘 남용

- Layout.jsx: 헤더 한 줄에 GraduationCap, BookOpen, LayoutList, ChevronRight, ChevronDown 5종
- GradingDashboard.jsx L.3-7: 단일 페이지에 ArrowUpDown, CheckCircle2, AlertCircle, Download, Upload, FileDown, ChevronDown, ChevronUp, X, BarChart3, Users, RefreshCw, FileText, Search, FileEdit, Circle 16종 import
- AddQuestionModal.jsx L.1: 12종 유형별 전용 아이콘

아이콘이 의미 전달 보조가 아니라 장식으로 사용되고 있다. 아이콘 밀도가 높을수록 실제 중요한 요소가 묻힌다.

**개선안**: 텍스트만으로 의미가 불명확한 경우에만 아이콘 사용. 액션 버튼은 아이콘 최대 1개/버튼 원칙

### 8-3. 획일적인 카드-배지-4칸 통계 트리오 패턴

거의 모든 카드가 [색상 배지] + [회색 부제목] + [굵은 제목] + [통계 4칸 그리드] 구조를 반복한다.

- QuizList.jsx QuizCard L.88-195
- GradingDashboard.jsx 퀴즈 정보 카드 L.167-212
- QuizStats.jsx 요약 카드 L.287-313

이 패턴이 반복되면 페이지 간 구분이 없어지고 전체가 단조롭다. 정보를 최대한 많이 보여주려는 AI의 설계 습관이 반영된 결과다.

**개선안**: 목록 페이지는 스캐너블한 리스트 중심, 상세 페이지는 핵심 지표 1-2개를 크게 강조하는 히어로 영역 도입

### 8-4. 인라인 hover 스타일 JS 처리 (전체 30회 이상)

```
// QuestionBank.jsx L.296-297 예시 (동일 패턴 30회+ 반복)
onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#EEF2FF' }}
onMouseLeave={e => { e.currentTarget.style.color = '#9E9E9E'; e.currentTarget.style.background = 'transparent' }}
```

Tailwind의 hover: 접두사로 처리할 수 있는 것을 JS 이벤트로 구현한 빠른 AI 생성 코드의 전형적 특징이다. 코드 가독성을 해치고 중복이 심하다.

**개선안**: Tailwind hover variant 또는 CSS 클래스 확장으로 전환

### 8-5. 통계 정보 과적재 (QuizStats.jsx StatsTab)

6칸 요약 카드(L.287) + 점수 분포 BarChart(L.327) + 응시 현황 바차트(L.354) + 문항별 정답률 차트 + P27/P73 지표 + 문항별 난이도 테이블을 한 화면에 모두 노출한다. 교수자가 가장 중요한 것을 파악하기 어렵다. 정보 우선순위 없이 나열하는 것은 AI 디자인의 전형적 패턴이다.

**개선안**: 평균/응시율을 히어로 영역으로 강조, 나머지는 스크롤 또는 탭으로 분리. "채점 직후 교수자가 가장 먼저 보고 싶은 것"을 기준으로 정보 위계 재설계

---

## 우선순위 종합 요약

| 등급 | 항목 | 관련 파일/위치 |
|------|------|----------------|
| **Critical** | 모바일 사이드바 숨김 후 네비게이션 대안 없음 | `Layout.jsx` |
| **Critical** | 포커스 링 대비 미달 (`indigo-100`) | `index.css` |
| **Critical** | `focus:outline-none` 대체 포커스 인디케이터 없음 | 드롭다운/버튼 전반 |
| **Critical** | `#9E9E9E` / `#BDBDBD` 텍스트 WCAG AA 미달 | 프로젝트 전체 40+ 곳 |
| **High** | Primary 색상 3종 혼재 (`#6366f1` / `#4f46e5` / `#4338ca`) | `QuizList.jsx`, `QuizStats.jsx`, `index.css` |
| **High** | Status badge 색상 중복 정의 및 불일치 | `QuizList.jsx`, `GradingDashboard.jsx` |
| **High** | Green/Red 시맨틱 색상 3~4종 혼용 | `QuizList.jsx`, `AddQuestionModal.jsx`, `QuestionBank.jsx` |
| **High** | `html font-size: 17px` — Tailwind 수치 왜곡 | `index.css` |
| **High** | H1 크기 불일치 (xl/2xl 혼용) | `QuizList.jsx`, `QuizCreate.jsx`, `QuestionBankList.jsx` |
| **High** | Select 컴포넌트 3종 파편화 | `CustomSelect`, `DropdownSelect`, `AppSelect` |
| **High** | `.btn-primary` 미준수 버튼 산재 | `QuestionBankList.jsx`, `QuizStats.jsx` 외 |
| **High** | `.btn-ghost` 정의됐으나 미사용 — 인라인 30회+ | `index.css`, 전체 |
| **High** | max-width 6종 혼재 | 각 페이지 |
| **High** | 아이콘 전용 버튼 `aria-label` 없음 | `QuestionBank.jsx`, `Layout.jsx` |
| **High** | 모달 포커스 트랩 없음 | `AddQuestionModal.jsx`, `QuestionBankModal.jsx` |
| **High** | 탭 ARIA role 미적용 (`role="tablist"` 등) | `QuizStats.jsx`, `QuizCreate.jsx`, `GradingDashboard.jsx` |
| **High** | 드롭다운 `aria-expanded`/`aria-haspopup` 미적용 | `DropdownSelect`, `CustomSelect`, `GroupCombobox` |
| **High** | `QuizStats` silent failure (not found 시 첫 번째 퀴즈 fallback) | `QuizStats.jsx` |
| **Medium** | 회색 계열 7종 이상 혼재 | 전체 |
| **Medium** | 폰트 크기 px 직접 입력 산재 (`fontSize: 11`, `12`) | `QuizList.jsx`, `GradingDashboard.jsx` 외 |
| **Medium** | 섹션 헤더 크기 미구분 | `QuizCreate.jsx` |
| **Medium** | 배지 컴포넌트 미통합 (`.badge` dead code) | `index.css`, 각 페이지 |
| **Medium** | 모달 공통 래퍼(`BaseModal`) 없음 | 4개 모달 전체 |
| **Medium** | 인라인 hover 핸들러 남용 | 전체 |
| **Medium** | 카드 내부 패딩 4종 이상 혼재 | `QuizList.jsx`, `GradingDashboard.jsx`, `QuizStats.jsx` |
| **Medium** | 수평 패딩 기준 불일치 | 각 페이지 |
| **Medium** | 태블릿 구간 GradingDashboard split-pane 압박 | `GradingDashboard.jsx` |
| **Medium** | 폼 라벨-인풋 연결 누락 | `QuizCreate.jsx` |
| **Medium** | 장식용 아이콘 `aria-hidden` 미적용 | 전체 |
| **Medium** | 빈 상태 CTA 버튼 없음 | `QuizList.jsx` |
| **Medium** | 로딩 상태/스켈레톤 없음 | 전체 |
| **Medium** | 빈 상태 표현 방식 불일치 | `QuizList.jsx`, `QuestionBank.jsx`, `GradingDashboard.jsx` |
| **Low** | 배경색 토큰 미정의 | `index.css` |
| **Low** | 카드 타이틀 `line-height` 명시 부재 | 전체 카드 |
| **Low** | 섹션 간격 spacing scale 미정의 | 전체 |
| **Low** | 사이드바 고정 픽셀 너비 | `Layout.jsx` |
| **Low** | 헤더 역할 토글 아이콘 직관성 부족 | `Layout.jsx` |
| **Low** | 전역 토스트 시스템 없음 | `QuestionBank.jsx` |
| **Low** | 에러 토스트 미구분 | `QuestionBank.jsx` |
| **Low** | 검색 결과 없음 초기화 버튼 없음 | `QuestionBank.jsx`, `QuizStats.jsx` |

---

## 8. 빠른 실행 권고 (Quick Wins — 1~2일 내 처리 가능)

아래 5건은 코드 검색/치환 수준으로 빠르게 처리 가능하며, Critical 이슈를 즉시 해소한다.

1. `index.css` `html { font-size: 16px }`로 수정 — 타이포그래피 위계 왜곡 즉시 해소
2. `#BDBDBD`, `#9E9E9E` 텍스트를 최소 `#767676` 이상으로 전체 교체 — 접근성 Critical 해소
3. 모든 커스텀 버튼/드롭다운에 `focus-visible:ring-2 focus-visible:ring-indigo-500` 추가 — 접근성 Critical 해소
4. Primary 색상 `#4f46e5` 단일 값으로 통일 (전체 파일 검색/치환으로 처리 가능)
5. `QuizStats.jsx` `quiz ?? null` fallback 수정 후 에러 화면 연결 — High 이슈 즉시 해소

---

## 9. 스크린샷 관찰 이슈 (2026-04-07 추가)

아래 4건은 코드 검토와 스크린샷 관찰 양쪽에서 확인된 이슈다.

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| 정렬 아이콘 상시 노출 | QuizStats GradesTab 테이블 헤더 6개 컬럼 모두에 `ArrowUpDown` 상시 표시 (`opacity: 0.4`) | 정렬 미선택 상태에서도 모든 컬럼에 아이콘이 노출되어 시각적 노이즈 발생. 현재 어느 컬럼이 정렬 기준인지 한눈에 파악 어려움 | 기본 상태에서는 아이콘 숨김, 컬럼 hover 시만 `ArrowUpDown` 표시, 활성 정렬 컬럼만 `ArrowUp/ArrowDown` 상시 표시 | **High** |
| "미채점만 보기" 레이블 크기 | `QuizStats.jsx:180` label 요소 내 텍스트가 인접 버튼 대비 작게 인식됨 | 코드상 label은 `text-sm`이나 내부에 `fontSize: 10` 뱃지와 혼재하여 시각적 불균형 발생. 스크린샷에서 레이블이 주변 UI 대비 눈에 잘 안 들어옴 | 레이블 `text-sm font-medium` 유지, 카운트 배지 `text-xs`로 통일. 레이블-배지 간 수직 정렬 `items-center` 확인 | **High** |
| 브라우저 기본 체크박스 | `QuizStats.jsx:181` `className="w-4 h-4 rounded accent-indigo-600"` | `accent-color`는 브라우저별 렌더링 차이 존재. 디자인 시스템의 indigo-600 (#4f46e5)과 시각적으로 정확히 일치하지 않으며, 체크박스 형태가 디자인 시스템 컴포넌트와 불일치 | 커스텀 체크박스 구현: indigo-600 배경 + 흰색 체크마크 SVG 방식. 또는 headlessui Checkbox 컴포넌트 활용 | **High** |
| 검색 인풋 폰트 불일치 | `GradingDashboard.jsx:382` 학생 검색 인풋 `text-xs`, 테이블 셀 `text-sm` | 동일 화면에서 검색 인풋(12px)과 테이블 데이터 셀(14px) 간 폰트 크기 불일치. `.input` 유틸리티 클래스(`text-sm` 정의)를 쓰지 않고 인라인으로 직접 `text-xs` 지정하여 발생 | 검색 인풋에 `.input` 클래스 적용 (`text-sm` 포함). `text-xs` 인라인 오버라이드 제거. 검색 인풋과 테이블 셀 폰트 통일 | **High** |

---

*본 보고서는 소스 코드 직접 분석 기반으로 작성되었으며, 실제 렌더링 화면 확인을 통해 보완 검토가 필요합니다.*
