# XN Quizzes — 종합 검토 보고서

작성일: 2026-03-25
검토 범위: PM1(디자인) + PM2(기획) + PM3(개발) + PM4(QA) + PM5(PO 스펙)
검토자: Leader (총괄)

---

## 1. PM별 검토 요약

### PM1 — 디자인 검토

전체적으로 indigo-600 주색 + slate 계열의 모던 화이트 모드 기조는 잘 유지되어 있다. 그러나 구조적 문제가 두 가지 존재한다. 첫째, AddQuestionModal과 QuestionBankModal이 QuizCreate.jsx와 QuizEdit.jsx에 각각 중복 정의되어 있어 향후 버그 수정 시 양쪽을 동시에 수정해야 하는 유지보수 위험이 있다. 둘째, 접근성(WCAG AA) 위반이 다수 발견되었는데, focus-visible 미적용 인풋, 아이콘 전용 버튼의 aria-label 누락, 커스텀 라디오의 키보드 접근 불가, gray-400 텍스트의 대비비 미달(2.85:1 vs 기준 4.5:1)이 핵심 이슈다. slate/gray 혼용, LIGHT_COLORS 4개 파일 중복, 페이지 타이틀 크기 불일치, 태블릿(768px) 구간 레이아웃 미대응 등 High 이슈도 상당수다.

### PM2 — 기획 검토

교수자 관점 핵심 플로우(생성-편집-채점-통계)는 UI 수준에서 대부분 구현되어 있으나, Happy Path에 치명적 단절이 있다. 채점 저장 기능이 없고(S5), 퀴즈 생성/편집 후 목록이 갱신되지 않는다(S1/S2). 정책 공백도 광범위하다. `published` 필드와 `status` 필드 이중 관리로 상태 전이 정합성 오류가 발생 가능하고, short_answer의 autoGrade='partial' 정의가 채점 대시보드의 수동 처리와 불일치한다. 재응시 간격, 지각 제출 세부 정책, 정답 공개 시점, 미제출 학생 점수 처리 정책이 모두 미정 상태이며, 역할 기반 권한 설계(교수자/조교/학습자)도 전무하다.

### PM3 — 개발 검토

번들 크기(약 208 KB gzip), lazy loading/Suspense 전면 적용, manualChunks 함수 형식 준수, useMemo/useCallback 핵심 위치 적용 등 긍정적인 면이 뚜렷하다. 그러나 채점 저장 로직이 로컬 state(`setSaved`)에만 머물러 새로고침 시 전체 채점 결과가 소실된다는 것이 가장 큰 Critical 이슈다(GradingDashboard.jsx L586~596, L783~788). QUESTION_BANK가 3개 파일에, LIGHT_COLORS가 5개 파일에 중복 정의되어 있어 유지보수 위험이 높다. QuizEdit.jsx에서 `useParams()`로 받은 `id`를 실제로 사용하지 않아 실데이터 연동이 불가능한 구조이며, `Math.max(...scores)` 스프레드 방식, `Date.now()` 기반 ID 생성 등 대규모 데이터 환경에서의 잠재적 결함도 존재한다.

### PM4 — QA 테스트

기능/성능/보안 3개 영역에서 총 28개 이슈가 발견되었으며 Critical 3건, High 9건이다. 기능 면에서 퀴즈 발행 버튼이 navigate만 실행하고 저장하지 않고(F-01), 퀴즈 편집이 URL :id를 무시하며(F-02), 문제은행 편집/삭제 버튼에 핸들러가 없다(F-05/06). 보안 면에서는 모든 라우트에 인증/인가 Guard가 없고(S-01), 학번 패턴이 실제 대학 학번 체계(2022XXX)와 구조적으로 유사하여 CLAUDE.md 정책 위반 소지가 있다(S-04). 성능 면에서는 82명 학생 목록과 60개 문항 전체가 가상화 없이 렌더링되며, 점수 분포 X축이 지나치게 세분화되어 있다.

### PM5 — PO 스펙 정의

PM1~PM4 검토 결과를 바탕으로 MVP1 완료 기준 9개 Must-have 항목을 확정하고, 8개 핵심 정책 결정 사항을 명문화했다. 주요 정책 결정: 채점 저장은 수동저장(localStorage persist) 방식, `status` 필드 단일 SSOT로 `published` 필드 폐기, short_answer는 수동채점 대상으로 분류(autoGrade='partial'은 MVP2에서 "AI 채점 제안" 워크플로우로 구현), 문제은행-퀴즈 연결은 복사본(Snapshot) 방식, 미제출 학생은 "결시" 상태로 별도 처리(0점 자동 부여 안 함). MVP1은 총 9개 Gap 항목 수정 완료 시 완료 선언 가능, MVP2는 학습자 응시 화면 및 상태 자동 전이를 포함하며 4~6주 예상이다.

---

## 2. 통합 이슈 목록

중복 이슈는 통합하고 출처 PM을 복수 표기하였다.

### Critical

| **ID** | **이슈** | **출처 PM** | **우선순위** | **수정 권고안** |
|---|---|---|:---:|---|
| C-01 | 채점 저장 로직이 로컬 state에만 머물러 새로고침 시 채점 결과 전부 소실 | PM2, PM3, PM4 | Critical | localStorage에 채점 결과 persist 구현 (PATCH API 연동 전 프로토타입 단계 방안) |
| C-02 | 퀴즈 발행 버튼이 navigate만 실행하고 저장 로직 없음. 생성 흐름 단절 | PM4 | Critical | 발행 클릭 시 form+questions 데이터를 전역 state 또는 mockData 배열에 추가 후 navigate |
| C-03 | 퀴즈 편집 페이지가 URL :id를 무시하고 항상 동일한 하드코딩 데이터 표시 | PM3, PM4 | Critical | `mockQuizzes.find(q => q.id === id)`로 데이터 조회, 초기 state에 반영. 없는 id면 404 처리 |
| C-04 | AddQuestionModal / QuestionBankModal이 QuizCreate.jsx와 QuizEdit.jsx에 각각 중복 정의 — 버그 수정 시 양쪽 동시 수정 필요 | PM1, PM3 | Critical | `src/components/modals/` 디렉토리로 추출하여 공유 컴포넌트화 (PM5: MVP2로 이관) |
| C-05 | focus-visible 스타일 미적용 인라인 인풋 — 키보드 사용자 포커스 피드백 없음 | PM1 | Critical | 모든 인터랙티브 요소에 `focus-visible:ring-2 focus-visible:ring-indigo-400` 적용 (PM5: MVP2) |
| C-06 | 아이콘 전용 버튼 aria-label 누락 전반 — 스크린리더 접근 불가 | PM1 | Critical | 모든 아이콘 버튼에 `aria-label` 속성 추가 (PM5: MVP2) |
| C-07 | 커스텀 라디오(차시 선택) 키보드 접근 불가 — div에 onClick만 있고 role/tabIndex/onKeyDown 미적용 | PM1 | Critical | `role="radio" tabIndex={0} onKeyDown` 처리 추가 또는 `<input type="radio">` + 커스텀 스타일로 교체 (PM5: MVP2) |
| C-08 | 모든 라우트에 인증/인가 Guard 없음 — URL 직접 접근으로 전체 페이지 무단 접근 가능 | PM4 | Critical | ProtectedRoute 컴포넌트 구현 (PM5: MVP3, 프로토타입 의도된 생략으로 분류) |

### High

| **ID** | **이슈** | **출처 PM** | **우선순위** | **수정 권고안** |
|---|---|---|:---:|---|
| H-01 | 문제은행 문항 추가/편집/삭제 버튼에 핸들러 없음 — 클릭 시 아무 반응 없음 | PM4 | High | onAdd/onEdit/onDelete 콜백 prop 연결, QuestionBank local state 배열 관리 |
| H-02 | 시작일 > 마감일 역순 입력 시 유효성 검증 없음 | PM2, PM4 | High | isFormValid에 `new Date(form.dueDate) > new Date(form.startDate)` 조건 추가, 인라인 오류 메시지 표시 |
| H-03 | QUESTION_BANK 3개 파일 중복 정의 (QuizCreate, QuizEdit, QuestionBank) | PM3, PM4 | High | `src/data/questionBankData.js`로 단일 통합 |
| H-04 | `published` 필드와 `status` 필드 이중 관리 — 상태 전이 정합성 오류 가능 | PM2, PM3 | High | `status`를 SSOT로 사용, `published` 필드 폐기 (PM5 정책 확정) |
| H-05 | short_answer autoGrade='partial' 정의와 채점 대시보드 수동 처리 간 불일치 | PM2, PM3 | High | short_answer는 수동채점 탭으로 분류. 'partial'은 MVP2에서 "AI 채점 제안" 워크플로우로 명문화 (PM5 정책 확정) |
| H-06 | StudentRow 컴포넌트에 React.memo 없음 — 82명 전체 불필요 재렌더링 가능성 | PM3, PM4 | High | `React.memo(StudentRow)` 적용 (PM5: MVP2) |
| H-07 | LIGHT_COLORS 5개 파일 중복 정의 | PM1, PM3 | High | `src/constants/quizTypeColors.js`로 단일 통합 (PM5: MVP2) |
| H-08 | slate/gray 텍스트 계열 혼용 — 일관성 파괴 | PM1 | High | 전체를 `slate` 계열로 통일 |
| H-09 | 페이지 h1 타이틀 크기 불일치 (24/20/18px 혼재) | PM1 | High | 페이지 타이틀 = `text-2xl font-bold`로 통일 |
| H-10 | QuizCreate/QuizEdit 버튼이 `.btn-*` 클래스 미사용 — rounded-lg(8px) vs rounded-xl(12px) 불일치 | PM1 | High | `.btn-primary`, `.btn-secondary` 클래스 활용, 불가피한 크기 차이만 오버라이드 |
| H-11 | CustomSelect(QuizCreate) vs 네이티브 select(QuizEdit) 혼용 | PM1 | High | QuizEdit도 CustomSelect 또는 스타일링된 select로 통일 |
| H-12 | 태블릿(768px) 구간 레이아웃 미대응 — sm → lg 사이에서 급격한 전환 발생 | PM1 | High | `md:grid-cols-2 lg:grid-cols-3` 패턴 적용 |
| H-13 | 모바일 아이콘 전용 버튼 텍스트 숨김 시 aria-label 미적용 | PM1 | High | QuizList.jsx L27-34 버튼에 `aria-label` 추가 |
| H-14 | caption 텍스트 gray-400 대비비 2.85:1 — WCAG AA 기준(4.5:1) 미달 | PM1 | High | caption/보조 텍스트를 `gray-600` 이상 또는 `slate-600`으로 상향 |
| H-15 | Toggle 컴포넌트 focus-visible 피드백 없음 | PM1 | High | `peer-focus-visible:ring-2` 패턴으로 시각적 피드백 추가 |
| H-16 | QuizList 퀴즈 0건 Empty State 부재 | PM1 | High | "아직 생성된 퀴즈가 없습니다" + 새 퀴즈 만들기 CTA 포함 Empty State 추가 |
| H-17 | 학번 패턴이 실번호 형식과 유사 (2022001~2022082) — CLAUDE.md 정책 위반 소지 | PM4 | High | `TEST-001` 또는 `DEMO1001` 형식으로 변경 |
| H-18 | GradingDashboard split-pane 최소 높이 calc 하드코딩 (`min-h-[calc(100vh-360px)]`) | PM1 | High | CSS 변수(`--header-height`) 분리 또는 flex 기반 full-height 레이아웃으로 리팩토링 |

### Medium

| **ID** | **이슈** | **출처 PM** | **우선순위** | **수정 권고안** |
|---|---|---|:---:|---|
| M-01 | 존재하지 않는 :id 접근 시 첫 번째 퀴즈로 무음 fallback — 잘못된 데이터 노출 | PM3, PM4 | Medium | fallback 제거, 404 처리 + 목록으로 이동 버튼 표시 |
| M-02 | 채점 점수 입력에서 소수점 허용 (step 속성 없음) | PM4 | Medium | `step={1}` 추가 또는 저장 시 `parseInt()` 처리 |
| M-03 | 임시저장 버튼에 onClick 핸들러 없음 | PM4 | Medium | localStorage 기반 임시저장 구현 및 "임시저장 완료" 토스트 표시 |
| M-04 | 미제출 학생 점수 처리 정책 미정 | PM2 | Medium | PM5 정책 확정: score=null, 표시 레이블="미제출", 교수자가 수동 0점 부여 가능 |
| M-05 | 채점 미완료 상태에서 통계 페이지 접근 시 데이터 기준 미표시 | PM2 | Medium | 통계 상단에 "채점 미완료: N명 미채점 — M명 기준 통계" 배너 추가 |
| M-06 | 채점 점수 입력 범위 검증이 클라이언트 HTML 속성만 의존 | PM4 | Medium | 저장 함수 내부에 범위 체크 추가, 실데이터 전환 시 서버 측 검증 필수 |
| M-07 | 문제은행 QuestionBankModal 내 filtered useMemo 미적용 | PM3, PM4 | Medium | `useMemo(() => ..., [search, filterType, filterBank])`로 감싸기 |
| M-08 | 진행률 바 인라인 gradient 하드코딩 | PM1 | Medium | `bg-gradient-to-r from-indigo-400 to-indigo-600` Tailwind 클래스로 변경 |
| M-09 | 모달 max-h가 dvh 단위 미사용 — 소형 폰 스크롤 영역 부족 | PM1 | Medium | `max-h-[85vh]` → `max-h-[90dvh]`로 변경 |
| M-10 | QuizStats 점수 분포 X축 지나치게 세분화 (1점 단위) | PM4 | Medium | 5점 또는 10점 단위 구간화(bucket)로 변경 |
| M-11 | QuizStats scores 빈 배열 시 distData에 0점 막대 1개 생성 | PM3, PM4 | Medium | distData 생성 조건에 `scores.length > 0` 가드 추가 |
| M-12 | `Math.max(...scores)` 스프레드 방식 — 대규모 배열 시 스택 오버플로우 가능 | PM3 | Medium | `scores.reduce((a, b) => Math.max(a, b))` 또는 동등한 방식으로 교체 |
| M-13 | `Date.now()` 기반 ID 생성 — 밀리초 충돌 가능성 | PM3 | Medium | `crypto.randomUUID()` 사용으로 교체 |
| M-14 | 발행된 퀴즈 편집 시 응시 중인 학생 영향 정책 미정 및 경고 없음 | PM2 | Medium | status='open'/'grading' 퀴즈 편집 시 경고 모달 표시 (AC-08) |
| M-15 | QuizStats 응시자 0명 Empty State 미처리 | PM2 | Medium | 차트 대신 "아직 제출한 학생이 없습니다" Empty State 표시 |
| M-16 | TabBtn 컴포넌트 두 유형(Underline Tab/Segmented Control) 명시적 분리 없음 | PM1 | Medium | `src/components/Tabs.jsx`로 두 유형 명시적 분리 정의 |
| M-17 | 로딩 스켈레톤 컴포넌트 부재 — 실데이터 전환 시 빈 화면 깜빡임 발생 예정 | PM1, PM3 | Medium | `src/components/Skeleton.jsx` 미리 구현 |
| M-18 | 채점 모드 전환(문항 중심 ↔ 학생 중심) 시 선택 상태 미초기화 | PM4 | Medium | 모드 전환 시 선택된 학생/문항 상태 초기화 처리 추가 |
| M-19 | 문항 0개 상태에서 발행 차단 로직 없음 | PM2 | Medium | questions.length === 0 또는 총 배점 === 0이면 발행 버튼 비활성화 |

### Low

| **ID** | **이슈** | **출처 PM** | **우선순위** | **수정 권고안** |
|---|---|---|:---:|---|
| L-01 | 임의 숫자 text-[18px], text-[11px] Tailwind 토큰 외 사용 | PM1 | Low | `text-lg`, `text-xs` 또는 index.css 커스텀 토큰 정의 |
| L-02 | 브레드크럼 text-[13px] 하드코딩 | PM1 | Low | `.text-breadcrumb` 유틸 클래스 정의 후 재사용 |
| L-03 | QuizList 상태 필터/검색 기능 없음 | PM4 | Low | 퀴즈 수 증가 대비 MVP2에서 구현 예정 |
| L-04 | 문제은행 검색 초기화 버튼 없음 | PM4 | Low | 검색 입력 우측에 X 버튼 추가 |
| L-05 | 응시 시간 계산이 string split 파싱 — 자정 넘김 시 오류 | PM3 | Low | `Date` 객체 기반 차이 계산으로 교체 |
| L-06 | Layout.jsx breadcrumbs 배열 인덱스를 key로 사용 | PM3 | Low | 고유 식별자(경로 등) 기반 key로 교체 |
| L-07 | GradingDashboard setTimeout 스크롤 150ms 하드코딩 | PM3 | Low | CSS transition 완료 이벤트 또는 requestAnimationFrame 활용 |
| L-08 | EmptyState 컴포넌트 텍스트만 표시 — 아이콘 없음 | PM1 | Low | lucide 아이콘(FileText, Users 등) + 텍스트 조합으로 시각 보강 |
| L-09 | 퀴즈 제목 글자 수 제한 및 카운터 없음 | PM2 | Low | maxLength 설정 및 남은 글자 수 카운터 표시 |
| L-10 | StatsTab 분포 계산 useMemo 미적용 | PM4 | Low | useMemo로 감싸 불필요한 재계산 방지 |

---

## 3. 긴급 수정 항목 (Critical)

### C-01: 채점 저장 로직 — 로컬 state에만 저장, 새로고침 시 소실

**문제 설명**: GradingDashboard.jsx에서 점수 저장 시 `setSaved(true)` UI 상태만 변경되며 실제 데이터 영속성이 없다. 브라우저 새로고침 즉시 모든 채점 결과가 초기화된다.

**영향 범위**: 문항 중심 모드(L586~596), 학생 중심 모드(L783~788) 두 경로 모두 해당. 채점 기능 전체가 실질적으로 동작하지 않는 상태.

**수정 방법**:
1. `src/data/gradingStore.js` 파일 생성 — localStorage read/write 함수 정의
2. GradingDashboard 마운트 시 `localStorage.getItem('gradingData_${quizId}')` 로드
3. 저장 버튼 클릭 시 localStorage에 채점 결과 저장 후 `setSaved(true)` 호출
4. 실데이터 전환 시 해당 함수를 `PATCH /api/submissions/:id/scores` 호출로 교체

**담당 파일**: `src/pages/GradingDashboard.jsx` L586~596, L783~788

---

### C-02: 퀴즈 생성 발행 버튼 — navigate만 실행, 저장 없음

**문제 설명**: 발행하기 버튼 클릭 시 `navigate('/')` 만 실행된다. 입력한 제목, 날짜, 문항 정보가 어디에도 저장되지 않아 QuizList로 이동 후 신규 퀴즈가 전혀 반영되지 않는다.

**영향 범위**: QuizCreate.jsx 전체. 프로토타입 데모 시 핵심 플로우 시연 불가.

**수정 방법**:
1. App.jsx 또는 Context에 quizzes 상태 배열 관리 추가 (또는 mockData.js를 module-level mutable 배열로 전환)
2. 발행하기 클릭 핸들러에서 `{ id: Date.now(), ...form, questions, status: 'open' }` 객체를 목록에 push
3. navigate('/') 이동 후 QuizList에서 신규 항목이 렌더링되는지 확인
4. 임시저장 버튼도 동일 구조에서 `status: 'draft'`로 저장

**담당 파일**: `src/pages/QuizCreate.jsx` L144, L152~155

---

### C-03: 퀴즈 편집 — URL :id 무시, 하드코딩 데이터 고정

**문제 설명**: QuizEdit.jsx에서 `const { id } = useParams()`로 id를 받으나 실제로 사용하지 않는다. 초기 questions state가 항상 `[QUESTION_BANK[0], QUESTION_BANK[2], QUESTION_BANK[4]]`로 고정되어 어떤 퀴즈를 편집해도 동일 화면이 표시된다.

**영향 범위**: QuizEdit.jsx 전체. 편집 기능이 실질적으로 무의미한 상태.

**수정 방법**:
1. `mockQuizzes.find(q => q.id === id)` 로 해당 퀴즈 데이터 조회
2. 찾은 퀴즈의 title, startDate, dueDate, questions를 초기 state에 반영
3. id에 해당하는 퀴즈가 없으면 "퀴즈를 찾을 수 없습니다" Empty State + 목록 이동 버튼 표시
4. GradingDashboard.jsx L35, QuizStats.jsx L37의 `?? mockQuizzes[0]` fallback도 동일하게 404 처리로 교체

**담당 파일**: `src/pages/QuizEdit.jsx` L43~49

---

### C-04: 모달 컴포넌트 중복 정의

**문제 설명**: AddQuestionModal(L461~549)과 QuestionBankModal(L551~647)이 QuizCreate.jsx와 QuizEdit.jsx에 각각 동일하게 정의되어 있다. 향후 디자인 수정 또는 버그 수정 시 두 파일을 동시에 수정해야 하며 한쪽 누락 위험이 상존한다.

**영향 범위**: QuizCreate.jsx, QuizEdit.jsx. 코드 약 400줄 중복 존재.

**수정 방법**:
1. `src/components/modals/AddQuestionModal.jsx` 생성
2. `src/components/modals/QuestionBankModal.jsx` 생성
3. 필요한 props(onAdd, questions, QUESTION_BANK 등)를 prop으로 주입받는 구조로 정의
4. QuizCreate.jsx, QuizEdit.jsx에서 import하여 사용

**담당 파일**: QuizCreate.jsx L461~647, QuizEdit.jsx L242~468

**PM5 판단**: Nice-to-have로 MVP2 이관 결정. MVP1에서는 기능 구현 우선.

---

### C-05 ~ C-07: 접근성 Critical (focus-visible / aria-label / 커스텀 라디오)

**문제 설명**: 세 가지 접근성 Critical 이슈가 키보드 사용자와 스크린리더 사용자의 핵심 기능 사용을 막는다.

**영향 범위**:
- C-05 focus-visible: QuizEdit.jsx L173, QuizCreate.jsx L514, GradingDashboard.jsx L590 등 인라인 인풋 전반
- C-06 aria-label: Layout.jsx 로고 링크, QuizCreate/QuizEdit 모달 닫기 버튼, QuestionBank 편집/삭제 버튼
- C-07 커스텀 라디오: QuizCreate.jsx L234~256 차시 선택 div

**수정 방법**:
- C-05: `focus-visible:ring-2 focus-visible:ring-indigo-400` 추가. `.input` 클래스 사용 확대로 자동 해결 가능
- C-06: 각 아이콘 버튼에 `aria-label="닫기"`, `aria-label="편집"`, `aria-label="삭제"` 추가
- C-07: `role="radio" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handler()}` 추가 또는 `<input type="radio">` 네이티브 요소 사용

**PM5 판단**: 세 항목 모두 Nice-to-have로 MVP2 이관 결정.

---

### C-08: 인증/인가 없음

**문제 설명**: App.jsx에 ProtectedRoute가 없어 채점 대시보드, 문제은행, 퀴즈 생성/편집 모두 URL 직접 입력으로 접근 가능하다.

**영향 범위**: 전체 라우트. 실서비스 배포 시 권한 없는 사용자의 교수자 기능 무단 접근 가능.

**수정 방법**: `<ProtectedRoute>` 컴포넌트 생성, 인증 여부 확인 후 미인증 시 `/login`으로 redirect.

**PM5 판단**: Out-of-scope — 프로토타입의 의도된 생략. MVP3(실데이터 연동) 단계에서 구현.

---

## 4. MVP 로드맵

### MVP1 완료 현황

현재 구현된 기능 목록과 완성도 평가:

| **기능** | **완성도** | **Gap** |
|---|:---:|---|
| 퀴즈 목록 조회 및 상태 표시 | 완료 | 필터/검색 없음 (Low) |
| 퀴즈 생성 UI 흐름 | 부분 완료 | 발행 후 목록 미반영 (C-02, Must-have) |
| 퀴즈 편집 UI 흐름 | 부분 완료 | URL :id 무시, 하드코딩 데이터 (C-03, Must-have) |
| 채점 대시보드 — 문항 중심 모드 | 완료 | 채점 저장 미연결 (C-01, Must-have) |
| 채점 대시보드 — 학생 중심 모드 | 완료 | 채점 저장 미연결 (C-01, Must-have) |
| 퀴즈 통계 페이지 | 완료 | 채점 미완료 배너 없음 (Medium) |
| 문제은행 — 목록/검색/필터 | 완료 | CRUD 핸들러 미연결 (H-01, Must-have) |
| 재채점 모달 | 완료 | 실제 재산출 로직 없음 (Medium) |

**MVP1 완료 판정 기준**: 아래 9개 Must-have Gap 항목 수정 완료 시 선언 가능.

1. 채점 저장 (localStorage persist)
2. 퀴즈 생성 발행 후 목록 반영
3. 퀴즈 편집 URL :id 연동
4. 문제은행 CRUD 핸들러 연결
5. 시작일 > 마감일 유효성 검증
6. status 단일 필드 통일 (published 폐기)
7. 잘못된 :id 접근 시 404 처리
8. short_answer 수동채점 대상 명확화 (PM5 정책 반영)
9. 학번 패턴 변경 (TEST-001 형식)

---

### MVP2 우선순위 (다음 스프린트, 4~6주 예상)

PM5 Must-have 매트릭스 기반으로 정렬:

**Phase 2-A (High 우선 — 2~3주)**

| **우선순위** | **기능** | **근거** |
|:---:|---|---|
| 1 | 학습자 응시 화면 (문항 유형별 UI + 타이머 + 제출 플로우) | 서비스 핵심 플로우 완성 |
| 2 | 발행 전 체크리스트 모달 (문항 수, 배점, 날짜 유효성 확인) | 교수자 실수 방지 |
| 3 | 퀴즈 상태 자동 전이 (마감일 기반 open→grading) | 운영 자동화 |
| 4 | 채점 완료 → 점수 공개 → 학생 결과 열람 플로우 | Happy Path 완성 |

**Phase 2-B (Medium 우선 — 3~4주)**

| **우선순위** | **기능** | **근거** |
|:---:|---|---|
| 5 | 조교 권한 설계 및 역할 기반 접근 제어 | 대학 LMS 운영 현실 |
| 6 | 정답 공개 시점 세분화 (4옵션) | Canvas LMS 표준 수준 |
| 7 | 지각 제출 허용 기간/감점 설정 UI | 정책 공백 해소 |
| 8 | 코드 품질 개선 (QUESTION_BANK/LIGHT_COLORS 상수 통합, React.memo, 모달 중복 제거) | 유지보수성 |
| 9 | 접근성 개선 (aria-label, focus-visible, WCAG AA) | 서비스 품질 |
| 10 | 알림 시스템 (마감 임박, 채점 완료 인앱 알림) | 사용자 참여율 |

---

### MVP3 후보

Nice-to-have + Out-of-scope 중 실서비스 전환 시 가치 높은 항목:

| **기능** | **분류** | **비고** |
|---|---|---|
| API 클라이언트 레이어 구축 및 실서버 연동 | Out-of-scope → MVP3 필수 | useQuiz, useSubmissions 커스텀 훅 레이어 |
| 인증/인가 시스템 (JWT 또는 세션 기반) | Out-of-scope → MVP3 필수 | ProtectedRoute 구현 |
| 로딩 스켈레톤 및 에러 핸들링 UI | Nice-to-have | 실데이터 전환 시 UX 필수 |
| 리스트 가상화 (react-window) | Nice-to-have | 수강생 300명+ 시나리오 대응 |
| AI 보조 채점 (short_answer 제안 채점) | Out-of-scope | 별도 AI 인프라 필요 |
| Canvas LMS / LTI 1.3 연동 | Out-of-scope | 별도 개발 트랙 |
| 채점 일관성 분석 (채점자 간 편차 통계) | Out-of-scope | 실데이터 누적 후 의미 있음 |

---

## 5. 다음 스프린트 권고 작업 (Top 10)

| **순위** | **작업명** | **예상 공수** | **담당 영역** | **기대 효과** |
|:---:|---|:---:|---|---|
| 1 | 채점 저장 localStorage persist 구현 | 0.5일 | 개발 | 채점 Happy Path 완성, 데모 신뢰도 확보 |
| 2 | 퀴즈 생성 발행 후 전역 state 반영 | 0.5일 | 개발 | 퀴즈 생성 플로우 완성 |
| 3 | 퀴즈 편집 URL :id 기반 데이터 로딩 | 0.5일 | 개발 | 편집 기능 실질적 동작, 가장 낮은 공수 대비 최대 효과 |
| 4 | 문제은행 CRUD 핸들러 연결 (추가/편집/삭제) | 1일 | 개발 | 문제은행 기능 완성 |
| 5 | 시작일 > 마감일 역순 유효성 검증 + 인라인 오류 | 0.25일 | 개발 | 데이터 오류 방지, 사용자 가이드 |
| 6 | status 단일 필드 통일 (published 폐기) | 0.25일 | 개발 | 상태 정합성 확보, mockData 정리 |
| 7 | 학번 패턴 변경 (TEST-001 형식) + 잘못된 :id 404 처리 | 0.25일 | 개발 | 정책 준수, 잘못된 데이터 노출 방지 |
| 8 | 문항 0개/총 배점 0점 발행 차단 | 0.25일 | 개발 | 데이터 정합성 오류 방지 |
| 9 | 채점 점수 소수점 차단 (step=1) + 이탈 전 경고 모달 | 0.5일 | 개발 | 채점 정확도, 데이터 유실 방지 UX |
| 10 | slate/gray 혼용 정리 + h1 타이틀 크기 통일 + gray-400→gray-600 상향 | 0.5일 | 디자인/개발 | 시각적 일관성 확보, WCAG AA 대비비 개선 |

**총 예상 공수**: 약 4.5일 (1인 기준). MVP1 완료 선언 가능.

---

## 6. PM 간 의견 충돌 및 조율

### 충돌 1: 모달 중복 정의 이슈의 MVP 단계 (PM1 C-1 vs PM5)

- **PM1 주장**: AddQuestionModal / QuestionBankModal 중복은 Critical 이슈이며 즉시 수정 필요
- **PM5 결정**: Nice-to-have로 MVP2 이관

**Leader 최종 판단**: PM5 결정을 지지한다. 현재 프로토타입 단계에서는 기능 동작 완성이 구조 정리보다 우선이다. 단, MVP2 Phase 2-B 작업 목록 상위에 고정하여 MVP2에서 반드시 처리해야 한다. 중복 파일이 존재하는 동안은 두 파일에 동일 변경을 적용하는 원칙을 팀 내 공유할 것을 권고한다.

---

### 충돌 2: 인증/인가 없음의 심각도 분류 (PM4 S-01 Critical vs PM5)

- **PM4 주장**: 인증/인가 없음은 Critical 보안 이슈
- **PM5 결정**: Out-of-scope — 프로토타입의 의도된 생략으로 분류

**Leader 최종 판단**: PM5 결정을 지지한다. 프로토타입은 기능 흐름 검증이 목적이므로 인증 Guard 부재는 의도된 범위 조정이다. 단, 실데이터 연동 착수 전 인증 레이어 설계를 선행 완료하는 조건을 명시적으로 MVP3 입구 조건으로 등록할 것을 권고한다.

---

### 충돌 3: short_answer autoGrade='partial' 처리 방식 (PM2 C-04, PM3 H-03 vs PM5)

- **PM2/PM3 주장**: mockData의 'partial' 정의와 채점 대시보드 수동 처리가 불일치하므로 즉시 정합성 수정 필요
- **PM5 결정**: 'partial'을 "AI 채점 제안 후 교수자 확인" 워크플로우로 재정의. MVP1에서는 수동채점으로 단순화, MVP2에서 'partial' 워크플로우 구현

**Leader 최종 판단**: PM5 결정을 지지한다. 'partial'의 동작을 명확히 정의함으로써 PM2/PM3의 불일치 우려가 해소된다. MVP1에서는 short_answer를 수동채점 탭으로 명확히 분류하는 것만으로 충분하며, 이를 코드에 주석으로 명시(TODO: MVP2 AI 채점 제안 워크플로우 연동)하는 것을 권고한다.

---

## 7. 총평

### 영역별 완성도 점수 (10점 만점)

| **영역** | **점수** | **평가 근거** |
|---|:---:|---|
| UI/UX 디자인 완성도 | 7 / 10 | 모던한 기조와 컴포넌트 구조는 훌륭하나 접근성, 일관성 균열 다수 |
| 기능 정책 완결성 | 4 / 10 | 채점 저장 미구현, 상태 전이 정책 공백, 편집 URL 연동 미작동 |
| 코드 품질 | 6 / 10 | 번들 최적화, useMemo/useCallback 적절한 활용. 그러나 중복 정의 다수 |
| 서비스 기획 완성도 | 5 / 10 | Happy Path UI는 갖춰졌으나 인터랙션 연결과 정책 명문화 부족 |
| QA 안정성 | 4 / 10 | Critical 3건, High 9건. 핵심 CRUD 핸들러 미연결 다수 |
| **종합** | **5.2 / 10** | — |

### 총평

XN Quizzes 프로토타입은 교수자 관점의 퀴즈 관리 전체 플로우를 시각적으로 구현하는 데 성공했으며, 5개 페이지의 UI 구조와 정보 설계 품질은 MVP 프로토타입 수준으로 완성도가 있다. 특히 채점 대시보드의 문항 중심/학생 중심 이중 뷰, 문제은행 검색/필터, 통계 시각화는 제품의 차별화 포인트로 기능할 수 있다.

그러나 채점 저장, 퀴즈 생성 발행, 문제은행 CRUD 등 핵심 인터랙션이 UI와 로직 사이에서 단절되어 있어 현재 상태로는 사용자에게 "동작하는 프로토타입"을 시연하기 어렵다. 이 간극은 약 4.5일의 집중 작업으로 해결 가능한 수준이며, 해당 작업 완료 시 MVP1 완료 선언과 함께 본격적인 사용자 테스트 진행이 가능하다.

다음 스프린트의 최우선 과제는 본 보고서의 Top 10 작업 목록 완료이며, 이를 통해 Happy Path 완주율 100% 달성을 목표로 한다. MVP2 착수 전 접근성(WCAG AA) 개선과 코드 중복 정리를 Phase 2-B에 반드시 포함하여 기술 부채가 누적되지 않도록 관리하는 것을 강력히 권고한다.

---

*본 보고서는 PM1~PM5 보고서를 종합하여 Leader 총괄 검토자 관점에서 작성되었습니다. 검토 기준일: 2026-03-25.*
