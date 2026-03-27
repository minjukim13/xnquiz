# PM1 디자인 검토 보고서 (2026-03-27 재검토)

**검토자**: PM1 (디자이너)
**검토일**: 2026-03-27
**검토 범위**: src/index.css, src/components/Layout.jsx, src/components/AddQuestionModal.jsx, src/pages/QuizList.jsx, src/pages/QuestionBank.jsx, src/pages/QuizCreate.jsx, src/pages/GradingDashboard.jsx, src/pages/QuizStats.jsx

---

## 총평

소스 코드를 직접 분석한 결과, 색상 시스템 혼용, 접근성 미비, 컴포넌트 이원화, "AI 디자인 티" 패턴이 전반적으로 확인된다. Critical 이슈 4건(포커스/색상 대비 WCAG AA 미달, 모바일 Nav 부재)이 즉각 수정 필요하며, 특히 #9E9E9E 텍스트 색상이 WCAG AA 기준(4.5:1)을 충족하지 못하는 상태가 프로젝트 전체 40+ 곳에 분포한다.

---

## 1. 색상 시스템 일관성

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| Primary 색상 혼용 | indigo-600(#4f46e5)과 #6366f1 혼재 | QuizList.jsx L.117, L.401에서 #4f46e5 직접 사용. index.css L.51은 indigo-600으로 정의. indigo-600=#4f46e5이고 #6366f1=indigo-500으로 서로 다른 값 | Primary를 indigo-600(#4f46e5) 하나로 통일하고 CSS 변수로 토큰화 | **High** |
| Green 계열 혼용 | #018600, #01A900, text-emerald-600 혼재 | QuizList.jsx L.13 #018600, QuizStats.jsx L.361 #01A900, QuizStats.jsx L.278 text-emerald-600. 3종류의 초록 혼용 | Semantic green을 #018600 하나로 통일 | **High** |
| Red 계열 혼용 | #B43200, #EF2B2A, #EF4444, text-red-600 혼재 | QuizList.jsx L.14 #B43200, QuestionBank.jsx L.305 #EF2B2A, AddQuestionModal.jsx L.8 #EF4444, QuizStats.jsx L.279 text-red-600. 위험/오류 시맨틱 컬러 4종 | Destructive=#EF2B2A, Warning(채점중)=#B43200으로 역할 분리 후 고정 | **High** |
| 탭 활성 색상 | QuizStats.jsx L.76, QuizCreate.jsx L.175에서 #6366f1 (indigo-500) 사용 | 활성 탭에 indigo-500 혼용. index.css L.51의 btn-primary는 indigo-600 | #4f46e5(indigo-600)로 통일 | **Medium** |
| 진행 바 색상 | QuizList.jsx L.258, GradingDashboard.jsx L.207에서 bg-indigo-500 | 주색 #4f46e5(indigo-600)와 미세 불일치 | bg-indigo-600으로 변경 | **Medium** |
| 배경색 혼용 | #F5F5F5와 #FAFAFA 혼재 | 역할은 구분되나 명시적 토큰 없음 | CSS 변수 --bg-page, --bg-surface로 의미 부여 | **Low** |

---

## 2. 타이포그래피 위계

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| h1 크기 불일치 | 페이지별 h1 크기가 다름 | QuizList.jsx L.50 text-2xl(24px), QuizCreate.jsx L.81 text-xl(20px). 동일 위계 페이지 제목인데 크기 다름 | h1 = text-2xl font-bold 로 전페이지 통일 | **High** |
| body 기본 폰트 크기 | index.css L.12 font-size: 14px | Tailwind 기본 16px인데 base를 14px로 오버라이드. text-sm이 사실상 12px로 렌더링되어 가독성 저하 | base를 16px로 복원하고 14px 필요한 곳만 text-sm 명시 | **High** |
| 임의 픽셀값 난립 | text-[10px], text-[11px], text-[13px], text-[15px], text-[17px], text-[18px] 혼재 | Layout.jsx L.189 text-[10px], GradingDashboard.jsx L.193 text-[11px], QuizStats.jsx L.296 text-xl. Tailwind 기본 스케일 외 임의값 산재 | caption = text-xs(12px), 숫자 강조 = text-xl로 2단계 정의. 10px 사용 금지 | **Medium** |
| 섹션 헤더 h2 크기 | QuizCreate.jsx L.428 text-sm font-semibold | 섹션 제목이 본문 텍스트와 동일한 14px. 위계 구분 불명확 | h2 = text-[15px] font-semibold 또는 text-base font-semibold로 상향 | **Medium** |
| line-height | index.css L.16-18: h1-h4 1.3, body 1.6 | 한글 장문에서 1.3은 타이트. 긴 퀴즈 제목(h3) 렌더링 시 불편 | 한글 텍스트는 line-height 1.5 이상 권장 | **Low** |

---

## 3. 컴포넌트 재사용성 및 일관성

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| 버튼 스타일 이원화 | .btn-primary 클래스 vs 인라인 style 혼재 | QuizList.jsx L.114-119 채점하기 버튼이 .btn-primary 없이 직접 bg-indigo-600 text-white px-3.5 py-2 조합. QuizStats.jsx L.47도 동일 반복 | 모든 CTA 버튼은 .btn-primary / .btn-secondary / .btn-ghost 클래스로 통일 | **High** |
| 인풋 스타일 이원화 | .input 클래스 vs 인라인 style 혼재 | QuestionBank.jsx L.192-193, L.198-200: .input 대신 style 직접 지정. AddQuestionModal.jsx L.247-249도 동일 패턴 | 모든 input, textarea, select는 .input 클래스 적용 | **High** |
| .btn-ghost 미사용 | index.css L.62-67에 .btn-ghost 정의됐으나 실제로 onMouseEnter/Leave 인라인 반복 | 정의된 유틸리티 클래스가 사용되지 않고 중복 코드 산재 (30회 이상) | 정의된 .btn-ghost 클래스 적극 사용. 인라인 hover 이벤트 제거 | **High** |
| 모달 구조 비일관성 | 4개 모달이 각각 독립 구현 | CsvUploadModal, CopyFromBankModal, QuestionBankModal, AddQuestionModal. 헤더-바디-푸터 구조 동일하나 spacing/shadow 미세하게 다름 | 공통 Modal 래퍼 컴포넌트 추출 | **Medium** |
| 배지 컴포넌트 미통일 | .badge 클래스 정의됐으나 실제 미사용 | index.css L.71에 .badge 정의. 전부 인라인 span+style로 구현. dead code | .badge 클래스 실제 적용 또는 배지 컴포넌트화 | **Medium** |
| 확인 인라인 UI 이원화 | 발행 확인(QuizList.jsx L.144-162)과 채점 종료 확인(GradingDashboard.jsx L.267-288) 각각 독립 구현 | 패턴 동일하나 spacing, 색상, 버튼 크기 미세하게 다름 | 공통 InlineConfirm 컴포넌트 추출 | **Low** |

---

## 4. 레이아웃 그리드 및 여백 체계

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| 페이지 max-width 비일관성 | 3가지 max-width 혼재 | QuizList.jsx L.45 max-w-[1600px], QuestionBank.jsx L.110 max-w-[1200px], QuizCreate.jsx L.80 max-w-2xl(672px). 콘텐츠 폭 편차 큼 | 넓은 레이아웃: max-w-[1280px], 좁은 폼: max-w-2xl로 2단계만 사용 | **High** |
| px 패딩 불일치 | px-6 sm:px-10 xl:px-16 vs px-4 sm:px-6 혼재 | QuizList.jsx L.45 vs QuizCreate.jsx L.80. 동일 래퍼에서 수평 패딩 다름 | px-4 sm:px-6 lg:px-10으로 통일 | **Medium** |
| 섹션 간격 혼재 | mb-8, mb-6, mb-5, mb-4, space-y-4, space-y-5 혼재 | 임의 값. QuizCreate.jsx L.187 space-y-5, GradingDashboard.jsx space-y-4 | 섹션 간격=24px(space-y-6), 항목 간격=16px(space-y-4)로 2단계 정의 | **Medium** |
| 사이드바 너비 | Layout.jsx L.180 width: 200 고정 픽셀 | 반응형 고려 없이 200px 고정 | w-48 Tailwind 클래스 또는 min-w-[180px]으로 유연하게 | **Low** |

---

## 5. 반응형 브레이크포인트 대응

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| 모바일(375px) 사이드바 | Layout.jsx L.178 hidden sm:flex | 모바일에서 사이드바 숨겨지고 하단 네비게이션 대안 없음. nav 접근 불가 | 모바일용 하단 탭바 또는 햄버거 메뉴 필요 | **Critical** |
| 통계 카드 그리드 | QuizStats.jsx L.287 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 | 375px에서 카드 1개 폭 약 150px로 text-xl 숫자 과하게 큼 | 카드 내부 폰트 clamp 적용 또는 내부 여백 조정 | **High** |
| GradingDashboard split-pane | GradingDashboard.jsx L.318 w-full sm:w-72 | 모바일 탭 전환 UI 구현됐으나 비활성 탭 스타일 완성도 낮음 | 비활성 탭 배경을 명확히 구분하는 스타일 추가 | **Medium** |
| 헤더 브레드크럼 | Layout.jsx L.63-75 overflow-hidden | 브레드크럼 길어질 경우 잘림. 375px에서 역할 토글과 공존 불가 | 모바일에서 마지막 breadcrumb 1개만 표시 | **Medium** |
| QuizCreate 날짜 인풋 | QuizCreate.jsx L.254 grid grid-cols-2 gap-4 | 375px에서 datetime-local 2개 나란히. 최소 140px 이상 필요해 잘림 가능 | grid-cols-1 sm:grid-cols-2로 변경 | **Medium** |

---

## 6. 접근성 (대비, 포커스, 스크린리더)

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| 포커스 링 미흡 | index.css L.27 focus:ring-2 focus:ring-indigo-100 | indigo-100은 매우 연해 포커스 거의 불가시. WCAG AA는 3:1 이상 대비비 필요 | focus:ring-2 focus:ring-indigo-500 또는 focus:ring-offset-2로 강화 | **Critical** |
| focus:outline-none 남발 | 다수 input/button에서 기본 outline 제거 | QuestionBank.jsx L.192, L.199, AddQuestionModal.jsx L.247 등 다수에서 outline 제거 후 대체 표시 없음 | focus:outline-none 사용 시 반드시 focus:ring-2 focus:ring-indigo-500 세트 적용 | **Critical** |
| #9E9E9E 텍스트 WCAG AA 미달 | 부제목, 레이블, 설명 텍스트에 광범위 사용 | 흰 배경 기준 대비비 약 2.85:1로 WCAG AA(4.5:1) 미달. Layout.jsx L.64, QuizList.jsx L.49, QuizCreate.jsx L.345 등 40+ 곳 | 일반 텍스트에 #9E9E9E 사용 금지. #757575(4.6:1) 이상으로 상향. 장식적 용도에만 허용 | **Critical** |
| 아이콘 전용 버튼 aria-label 없음 | 다수 아이콘 버튼에 텍스트 없음 | QuestionBank.jsx L.293-309 Edit2/Trash2 버튼, Layout.jsx L.94/L.105 역할 전환 버튼(모바일에서 hidden sm:block) 스크린리더 접근 불가 | aria-label="수정", aria-label="삭제" 등 추가 | **High** |
| 모달 focus trap 없음 | 모달 열릴 때 포커스 이동 없음 | CsvUploadModal, AddQuestionModal 등 focus trap 미구현. ESC 키 닫기도 미구현 | 모달 open 시 첫 번째 요소로 focus 이동, ESC keydown 핸들러 추가 | **High** |
| 탭 ARIA role 미적용 | QuizStats.jsx, QuizCreate.jsx, GradingDashboard.jsx 탭 컴포넌트 | 스크린리더가 탭 컴포넌트 인식 불가. WCAG 4.1.2 위반 | 컨테이너: role="tablist", 각 버튼: role="tab" aria-selected={active} | **High** |
| 색상만으로 상태 구분 | 일부 영역에서 색상만으로 상태 전달 | strong style 색상만 강조하는 패턴 혼재 | 색상 + 텍스트 레이블 + 아이콘 세트 사용 패턴으로 통일 | **Medium** |
| 폼 라벨-인풋 연결 누락 | QuizCreate.jsx Field 컴포넌트: htmlFor-id 연결 없이 텍스트만 표시 | 스크린리더가 라벨과 인풋 연결 불가 | label htmlFor={id} + input id={id} 명시적 연결 적용 | **Medium** |

---

## 7. 빈 상태(Empty state) 및 로딩 상태

| 항목 | 현재 상태 | 문제점 | 개선안 | 등급 |
|------|-----------|--------|--------|------|
| 빈 상태 일관성 부족 | 페이지마다 표현 방식이 다름 | QuizList.jsx L.331-335: 아이콘+텍스트. QuestionBank.jsx L.214-225: 텍스트+링크. GradingDashboard 내부: 텍스트만 | 공통 EmptyState 컴포넌트(icon, title, action props) 정의 및 통일 | **Medium** |
| 로딩 상태 전무 | Suspense fallback 외 로딩 UI 없음 | 페이지 전환 시 흰 화면 UX 단절 가능 | Suspense fallback에 skeleton shimmer 적용 | **Medium** |
| 검색 결과 없음 처리 불일치 | 텍스트만 노출 | QuestionBank.jsx L.215 vs QuizStats.jsx L.210: 동일 문구이나 여백 다름 (py-16 vs py-8) | 공통 EmptyState 컴포넌트로 통일 | **Low** |
| 에러 상태 처리 없음 | ErrorBoundary 없음 | 잘못된 퀴즈 ID 접근 시 mockQuizzes[0]으로 fallback하나 UX 피드백 없음 | 404 페이지 또는 인라인 에러 메시지 추가 | **Low** |

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

## 우선순위 요약

| 등급 | 항목 | 관련 파일 및 라인 |
|------|------|-------------------|
| **Critical** | 모바일 사이드바 대안 없음 | Layout.jsx L.178 |
| **Critical** | 포커스 링 대비 미달 (indigo-100) | index.css L.27 |
| **Critical** | focus:outline-none 대체 포커스 없음 | 전체 input/button 다수 |
| **Critical** | #9E9E9E 텍스트 WCAG AA 미달 (2.85:1) | 전체 40+ 곳 |
| **High** | Primary 색상 혼용 (#4f46e5 vs #6366f1) | QuizList.jsx L.117, L.401 |
| **High** | Green/Red 시맨틱 색상 3-4종 혼용 | QuizList.jsx L.13-14, QuizStats.jsx L.278-279 |
| **High** | h1 크기 불일치 (text-2xl vs text-xl) | QuizList.jsx L.50, QuizCreate.jsx L.81 |
| **High** | base font-size 14px 가독성 저하 | index.css L.12 |
| **High** | 버튼/인풋 클래스 vs 인라인 style 이원화 | QuizList.jsx L.114-119, QuestionBank.jsx L.192-200 |
| **High** | .btn-ghost 정의 존재하나 미사용 (30회+ 인라인) | index.css L.62-67, 전체 |
| **High** | 통계 카드 그리드 모바일 대응 미흡 | QuizStats.jsx L.287 |
| **High** | 아이콘 전용 버튼 aria-label 없음 | QuestionBank.jsx L.293-309, Layout.jsx L.94 |
| **High** | 모달 focus trap 없음 | AddQuestionModal.jsx, CsvUploadModal |
| **High** | 탭 ARIA role 미적용 | QuizStats.jsx, QuizCreate.jsx, GradingDashboard.jsx |
| **Medium** | 페이지 max-width 3종 혼재 | QuizList.jsx L.45, QuestionBank.jsx L.110, QuizCreate.jsx L.80 |
| **Medium** | 섹션 헤더 h2 본문과 동일 크기 | QuizCreate.jsx L.428 |
| **Medium** | 배지 컴포넌트 미통일 (.badge dead code) | index.css L.71, QuizList.jsx L.97-101 |
| **Medium** | 모달 공통 컴포넌트 부재 | 4개 모달 전체 |
| **Medium** | 빈 상태 EmptyState 비일관성 | QuizList.jsx L.331, QuestionBank.jsx L.214 |
| **Medium** | 로딩 상태 없음 | App.jsx Suspense |
| **Low** | caption/micro 임의 픽셀 혼재 | Layout.jsx L.189, GradingDashboard.jsx L.193 |
| **Low** | 사이드바 고정 픽셀 너비 | Layout.jsx L.180 |
| **Low** | 인라인 hover 스타일 JS 처리 30회+ | 전체 |

---

*본 보고서는 소스 코드 직접 분석 기반으로 작성되었으며, 실제 렌더링 화면 확인을 통해 보완 검토가 필요합니다.*
