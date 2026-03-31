# PM3_개발검토보고서
**작성일**: 2026-03-31
**작성자**: PM3 — 시니어 개발자
**대상 프로젝트**: XN Quizzes Prototype (React 19 + Vite 8 + Tailwind CSS v4)

---

## 1. 빌드 번들 크기 분석

### 실측 빌드 결과 (vite build 기준)

| 청크명 | 크기 (raw) | 크기 (gzip) | 비고 |
|---|---:|---:|---|
| excelUtils | 429.04 kB | 143.65 kB | **Critical** — xlsx 라이브러리 전체 포함 |
| charts | 351.86 kB | 104.20 kB | **High** — recharts 전체 번들 |
| vendor | 219.44 kB | 70.41 kB | react + react-dom + react-router |
| GradingDashboard | 38.97 kB | 8.77 kB | 단일 페이지 최대 |
| AddQuestionModal | 30.47 kB | 6.55 kB | 모달인데 단독 청크로 분리됨 |
| QuizStats | 20.66 kB | 5.52 kB | - |
| QuizCreate | 20.11 kB | 5.72 kB | - |
| mockData | 15.01 kB | 5.71 kB | 런타임에 포함되는 목 데이터 |
| QuizList | 14.33 kB | 3.30 kB | - |
| QuestionBank | 17.99 kB | 4.38 kB | - |

**총 초기 다운로드 (최악 케이스, 비압축 기준)**: ~1.05 MB

### 핵심 이슈

**[Critical] xlsx 라이브러리 번들 크기 429 kB**
- `xlsx 0.18.5`는 트리쉐이킹이 적용되지 않는 구조. 기능 대부분이 전체 번들에 포함됨
- excelUtils.js가 xlsx를 import해 청크 분리는 됐으나, 해당 청크 자체가 전체 앱에서 가장 큰 파일
- 엑셀 다운로드/업로드 기능을 실제로 쓰는 페이지(GradingDashboard, QuizStats, QuestionBank)에서 공통으로 import하므로 필요 시점에 로드됨 — 초기 로딩에는 미포함, 그러나 해당 페이지 첫 진입 시 143 kB gzip 추가 로드

**[High] recharts 351 kB**
- QuizStats, GradingDashboard 두 페이지에서만 실제 차트 사용
- 현재는 `charts` 청크로 분리된 상태라 초기 로딩에 미포함 — 그러나 해당 페이지 진입 시 104 kB gzip 추가
- recharts 3.x는 트리쉐이킹 개선됐으나 여전히 대용량. 사용하는 컴포넌트(Bar, BarChart, XAxis, YAxis, Tooltip, Cell)만 놓고 보면 전체 번들의 60~70%가 미사용 코드

**[Medium] mockData 청크 15 kB**
- 실데이터 전환 시 이 청크는 제거되어야 함. 현재 런타임에 82명 학생 데이터, 문항 배열 등을 js 파일로 직접 포함
- `mockData-RgG_sBRO.js`가 독립 청크로 분리된 것은 다행이나, 실전 전환 시 완전히 API 호출로 대체 필요

**[Low] AddQuestionModal 30 kB 단독 청크**
- QuizCreate에서만 쓰이는 모달인데 별도 파일로 청크 분리됨 — 분리 효과보다 HTTP 요청 오버헤드가 더 클 수 있음

---

## 2. 렌더링 최적화

### 현재 상태 분석

**[High] GradingDashboard — 다중 useMemo 의존성 부적절**

```javascript
// GradingDashboard.jsx L70~81
const questionsWithLiveCounts = useMemo(() => {
  const grades = getLocalGrades()
  const submittedStudents = mockStudents.filter(s => s.submitted)
  return quizQuestions.map(q => { ... })
}, [quizQuestions, id, gradeVersion]) // eslint-disable-line react-hooks/exhaustive-deps
```
- `getLocalGrades()`가 memoization 외부 함수지만 의존성에 포함되지 않음 — eslint-disable로 경고를 억제 중
- 실질적으로 `gradeVersion` 카운터로 강제 재계산하는 방식 (workaround 패턴)
- API 연동 시 해당 패턴 전면 재설계 필요

**[Medium] GradingDashboard 상태 변수 과다**

```javascript
const [gradingMode, setGradingMode] = useState('question')
const [selectedQ, setSelectedQ] = useState(null)
const [sortBy, setSortBy] = useState('ungraded_first')
const [collapsedGraded, setCollapsedGraded] = useState(true)
const [activeTab, setActiveTab] = useState('responses')
const [selectedStudent, setSelectedStudent] = useState(null)
const [studentSearch, setStudentSearch] = useState('')
const [searchStudent, setSearchStudent] = useState('')  // 중복!
const [showExcelModal, setShowExcelModal] = useState(false)
// ... 이하 다수
```
- `searchStudent`와 `studentSearch` 두 개의 검색 상태가 공존 — 문항 중심/학생 중심 모드 각각 관리하는 의도이나 변수명이 혼동을 유발
- GradingDashboard 단일 컴포넌트가 너무 많은 역할 담당 → 하위 컴포넌트로 분리 권고

**[Medium] QuestionBank — 60개 문항 리스트 가상화 미적용**

60개 문항이 한 번에 DOM에 렌더링됨. 현재 규모(60개)에서는 체감 성능 이슈 없으나, 고객사 요구사항(복수 문제은행, 난이도 그룹핑 등)으로 문항 수가 200개 이상으로 늘어날 경우 레이아웃 스래싱 발생 가능. `react-window` 또는 `@tanstack/virtual` 도입 필요 시점 판단 기준: 문항 150개 이상

**[Low] QuizCreate — 문항 추가 시 불필요한 리렌더링**

```javascript
const addQuestion = useCallback((q) => {
  setQuestions(prev => prev.find(e => e.id === q.id) ? prev : [...prev, q])
}, [])
```
- `useCallback` 적용 양호. 그러나 `QuestionsTab` 컴포넌트가 `React.memo` 없이 부모 리렌더 시 재렌더링됨

**[Low] recharts ResponsiveContainer 사용 방식**
- `QuizStats`, `GradingDashboard`의 차트 컨테이너에 `width="100%"`, `height={200~260}` 고정 — 반응형 대응은 되어 있으나 ResizeObserver가 매 리사이즈마다 리렌더링 트리거함

---

## 3. 상태 관리 구조

### 현재 구조 평가

| 구분 | 현재 방식 | 평가 |
|---|---|---|
| 문제은행 전역 상태 | QuestionBankContext (banks, questions) | 적절 — localStorage 동기화 포함 |
| 역할/학생 정보 | RoleContext (role, currentStudent) | 적절 — 단순 전역 상태 |
| 퀴즈 목록 | mockQuizzes 모듈 변수 (직접 변이) | **Critical** — 불변성 위반 |
| 채점 결과 | localStorage xnq_manual_grades | 적절 (프로토타입 수준) |
| 응시 기록 | localStorage xnq_student_attempts | 적절 (프로토타입 수준) |
| 페이지별 UI 상태 | 로컬 useState | 적절 |

**[Critical] 모듈 변수 직접 변이 — mockQuizzes**

```javascript
// QuizCreate.jsx L124~141
mockQuizzes.push({ id: String(Date.now()), ... })

// QuizList.jsx L34
mockQuizzes[mockQuizzes.findIndex(q => q.id === quizId)] = updated[idx]
```
- `mockQuizzes`는 ES 모듈 export된 배열 — 직접 `push`/인덱스 교체로 변이
- React의 불변성 원칙 위반. 컴포넌트 간 상태 일관성 보장 불가
- 새로고침 시 변경사항 소실 (localStorage 미동기화)
- QuestionBankContext 패턴처럼 Context 또는 전역 상태로 전환 필요

**[High] Props Drilling 발생 구간**

- `GradingDashboard`: 채점 관련 핸들러(`onGradeSaved`, `onScoreChange` 등)가 하위 채점 패널까지 전달 — 현재 단일 파일 내에서 해결되고 있으나 파일 분리 시 drilling 문제 표면화 예상
- `QuizCreate` → `QuestionBankModal` → `onAdd` 콜백: 2단계 drilling, 현재는 허용 범위

**[Medium] QuestionBankContext — 전체 questions 배열 전역 노출**

현재 60개 문항이 Context로 전역 관리됨. 문항 수가 수백 개로 늘어나면 Context value 변경 시 해당 Context를 구독하는 모든 컴포넌트 리렌더링 발생. 필요 시 `banks`와 `questions`를 별도 Context로 분리 고려.

---

## 4. API 연동 전환 체크리스트

### 4-1. 교체 대상 파일 및 함수

| 현재 (mock) | 교체 대상 | 비고 |
|---|---|---|
| `src/data/mockData.js` 전체 | API 서비스 레이어 (src/api/) | 퀴즈, 문항, 학생, 채점 데이터 |
| `mockQuizzes` 배열 변이 | POST /quizzes, PATCH /quizzes/:id | QuizCreate, QuizList |
| `mockStudents` 정적 배열 | GET /quizzes/:id/submissions | GradingDashboard |
| `getQuizQuestions(quizId)` | GET /quizzes/:id/questions | GradingDashboard, QuizAttempt, QuizStats |
| `saveStudentAttempt()` | POST /quizzes/:id/attempts | QuizAttempt |
| `getStudentAttempts()` | GET /quizzes/:id/attempts | mockData.js |
| `localStorage xnq_manual_grades` | PATCH /attempts/:id/grades | GradingDashboard |
| `QuestionBankContext` 전체 | GET/POST/DELETE /question-banks | QuestionBankContext.jsx |
| `autoGradeAnswer()` | 서버사이드 자동채점 API | mockData.js |

### 4-2. 에러 핸들링 — 현재 미구현 영역

현재 모든 데이터 접근이 동기 처리(정적 배열 또는 localStorage). API 전환 시 아래 처리 필요:
- 전역 에러 바운더리 (React ErrorBoundary) 미존재
- fetch 실패 시 사용자 피드백 UI 없음 (toast, retry 버튼 등)
- 로딩 스켈레톤 UI: PageLoader(스피너)만 존재, 부분 로딩 상태 처리 없음
- 낙관적 업데이트(Optimistic update) 미적용 — 채점 저장 시 응답 대기 동안 UI 블로킹 예상

### 4-3. 권장 API 레이어 구조

```
src/
  api/
    quizApi.js          (퀴즈 CRUD)
    questionApi.js      (문항 CRUD)
    gradeApi.js         (채점 저장/조회)
    attemptApi.js       (응시 제출/조회)
    questionBankApi.js  (문제은행 CRUD)
  hooks/
    useQuizzes.js       (react-query 또는 SWR 연동)
    useGrading.js
    useAttempts.js
```

---

## 5. 동시 접속 / 부하 시나리오별 예상 병목

### 시나리오 분석표

| 시나리오 | 규모 | 예상 병목 | 위험도 | 대응 방안 |
|---|---|---|---|---|
| 학생 동시 응시 | 120명 동시 제출 | POST /attempts 쓰기 집중, DB 락 | High | 비동기 큐(Queue) 처리, 제출 결과 즉시 응답 후 채점 비동기 |
| 교수자 채점 동시 접속 | 조교 3~5명 동시 채점 | 동일 문항 동시 채점 시 last-write-wins 충돌 | Medium | 낙관적 락(ETag) 또는 채점 단위 락 |
| 자동채점 일괄 처리 | 120명 채점 요청 | 서버 CPU 집중, 응답 지연 | Medium | 서버사이드 배치 처리, 진행률 표시 |
| 엑셀 업로드 (대용량) | 300문항 xlsx | FileReader 메인스레드 블로킹 | Medium | Web Worker로 파싱 분리 |
| 문제은행 조회 | 500문항 이상 | Context 전체 리렌더 + DOM 렌더 지연 | Medium | 페이지네이션 API + 리스트 가상화 |
| 결과 통계 차트 | 300명 데이터 | 클라이언트 집계 연산 | Low | 서버사이드 집계 후 결과만 전달 |
| localStorage 용량 초과 | 응시 기록 누적 | QuotaExceededError (5~10MB 한계) | High | API 전환 시 해결. 현재 catch 처리됨 |

### 현재 프론트엔드 처리 한계

- 자동채점 `autoGradeAnswer()`가 클라이언트에서 실행됨 → 정답 데이터가 클라이언트 번들에 포함 (보안 이슈, 별도 항목에서 상세 기술)
- `getStudentAttempts()` 내 점수 정책 계산(최고점/평균/최신)이 클라이언트 연산 → 대용량 시 지연

---

## 6. XSS / 보안 취약점 점검

### 6-1. 입력값 XSS 취약점

| 위치 | 입력 요소 | 현재 처리 | 위험도 |
|---|---|---|---|
| QuizCreate — 퀴즈 제목 | `<input type="text">` | React JSX 자동 이스케이핑 | Low (안전) |
| QuizCreate — 공지사항 | `<textarea>` | React JSX 자동 이스케이핑 | Low (안전) |
| QuizAttempt — 단답형 응답 | `<input type="text">` | React JSX 자동 이스케이핑 | Low (안전) |
| QuizAttempt — 서술형 응답 | `<textarea>` | React JSX 자동 이스케이핑 | Low (안전) |
| excelUtils — xlsx 파싱 | 파일 업로드 | `String(v ?? '').trim()` 처리 | Medium |
| GradingDashboard — 학생 답안 표시 | 채점 패널 렌더 | React JSX 자동 이스케이핑 | Low (안전) |

**[Medium] 엑셀 업로드 파싱 시 입력값 검증 부분적**

```javascript
// excelUtils.js L284
const [typeRaw, textRaw, pointsRaw, answer = '', ...] = raw[i].map(v => String(v ?? '').trim())
```
- 유형(typeRaw) 화이트리스트 검증 있음
- 배점(pointsRaw) 양의 정수 검증 있음
- 문항 텍스트(textRaw) 길이 제한 없음 — 10만 자 이상 입력 시 렌더링 성능 저하 가능
- 정답(answer), 보기(c1~c5) 텍스트 길이 제한 없음

**[Critical] 자동채점 정답 데이터 클라이언트 번들 노출**

```javascript
// mockData.js L182~188
const AUTO_CORRECT_ANSWERS = {
  q1: ['SELECT', 'select'],
  q2: ['데이터 중복 최소화'],
  q4: ['CREATE, ALTER, DROP'],
  ...
}
```
- 정답 키가 `mockData-RgG_sBRO.js` 청크에 그대로 포함
- 개발자 도구에서 해당 청크 열람 시 모든 정답 확인 가능
- 프로토타입 단계에서는 불가피하나, 실데이터 전환 시 정답 검증은 반드시 서버사이드에서만 수행해야 함

**[High] URL 직접 접근 시 접근 제어 없음**

```javascript
// QuizAttempt.jsx L22~24
useEffect(() => {
  if (role !== 'student') navigate('/', { replace: true })
}, [role])
```
- 역할 체크가 클라이언트 상태 기반 — 새로고침 시 기본값 'instructor'로 초기화되어 보호 로직이 즉시 동작하지 않을 수 있음
- `/quiz/:id/attempt` URL 직접 입력 시 교수자 계정으로도 접근 가능 (브리프 순간)
- API 전환 시 서버사이드 인증/인가 필수

**[Medium] localStorage 데이터 조작 가능**

- `xnq_student_attempts` 직접 수정으로 점수 조작 가능 (프로토타입 한계)
- `xnq_manual_grades` 직접 수정으로 채점 결과 변경 가능
- 실운영에서는 서버 저장 및 서명(JWT/HMAC) 필수

### 6-2. 실데이터 사용 금지 정책 준수 여부

- 학생 이름: `학생 A ~ 학생 L` + 접미 숫자 → **준수**
- 학번: `2022XXXX` 패턴 (가상) → **준수**
- 이메일: 사용 없음 → **준수**
- 학과명: 가상 학과명 사용 → **준수**

---

## 7. 실데이터 전환 시 데이터 모델 변경 필요 항목

### 7-1. 현재 데이터 모델 vs 필요 모델

**Quiz 모델**

| 현재 필드 | 타입 | 변경 필요 사항 |
|---|---|---|
| id | string (임의) | UUID 또는 서버 발급 ID |
| status | 'draft'\|'open'\|'grading'\|'closed' | 상태 전이 규칙 서버 관리 |
| course | string (하드코딩) | courseId FK 참조 |
| totalStudents / submitted / graded | number (정적) | 실시간 집계 API |
| — | — | createdBy (교수자 ID) 추가 |
| — | — | updatedAt, createdAt 추가 |

**Question 모델**

| 현재 필드 | 타입 | 변경 필요 사항 |
|---|---|---|
| id | string (q1, q2...) | UUID |
| correctAnswer | string \| null | 서버사이드 전용 필드 (클라이언트 미노출) |
| autoGrade | boolean | 서버 채점 로직으로 이관 |
| — | — | difficulty (난이도) 추가 필요 (고객사 요구사항) |
| — | — | groupTag (그룹) 추가 필요 (고객사 요구사항) |
| — | — | mediaUrls (멀티미디어) 추가 필요 |

**Student Attempt 모델**

| 현재 필드 | 타입 | 변경 필요 사항 |
|---|---|---|
| id | `attempt_${Date.now()}` | UUID |
| answers | object (localStorage) | 서버 저장 |
| autoScores | object (클라이언트 계산) | 서버 자동채점 결과 |
| totalAutoScore | number | 서버 계산 |
| — | — | ipAddress 추가 (고객사 요구사항 — IP 제한) |
| — | — | attemptNumber (N번째 응시) 추가 |

---

## 8. 고객사 요구사항별 기술 구현 방안

| # | 요구사항 | 현재 상태 | 구현 방안 | 난이도 |
|---|---|---|---|---|
| 1 | 문항 메타데이터 (난이도, 그룹) | 미구현 | Question 모델에 `difficulty: 'easy'\|'medium'\|'hard'`, `groupTag: string` 필드 추가. 엑셀 템플릿 컬럼 확장 | Medium |
| 2 | 복수 문제은행 선택 | 단일 은행만 선택 가능 | QuestionBankModal을 다중 선택 체크박스 UI로 변경. 선택된 은행 배열로 getBankQuestions 병합 | Medium |
| 3 | 그룹별/난이도별 출제 비율 및 배점 | 미구현 | 랜덤 출제 설정 폼 추가 (각 그룹/난이도별 문항 수, 배점 지정). 서버사이드 랜덤 추출 알고리즘 필요 | High |
| 4 | 문항 순서 고정 ([a1], [a2]) | 현재 order 필드 존재 | 무작위 배열 토글과 독립적으로 [a1][a2] 고정 순서 보장 로직 추가. shuffleChoices는 허용하되 문항 순서는 고정 | Low |
| 5 | 엑셀 일괄 업로드 개선 | 기본 컬럼만 지원 | 엑셀 템플릿에 `난이도`, `그룹` 컬럼 추가. parseExcelOrCsv() 파싱 로직 확장 | Low |
| 6 | 멀티미디어 지원 | 미구현 | 문항 작성 폼에 파일 첨부 UI 추가. 서버 presigned URL 방식 권장. 클라이언트에서 FormData로 업로드 | High |
| 7 | 시험 복제 및 이관 | 미구현 | 퀴즈 카드에 "복제" 버튼 추가. 딥카피 함수 구현 (문항 포함). 다른 강좌 이관은 courseId 변경 API 필요 | Medium |
| 8 | 부분 점수 계산 다양화 | 단순 정/오 채점만 | 채점 모델에 `partialScoring: 'none'\|'proportional'\|'custom'` 추가. 문항 유형별(multiple_answers 등) 부분 점수 로직 재설계 | High |
| 9 | 문항별 일괄 채점 | 단일 문항 채점 패널 존재 | 현재 ExcelModal 방식(엑셀 업로드) 이미 존재. UI 개선: 그리드 인라인 편집 방식 추가 권고 | Medium |
| 10 | 응시 IP 제한/확인 | 미구현 | 프론트엔드로 완전 구현 불가 (클라이언트 IP 조작 가능). 서버사이드에서 제출 시 IP 로깅 및 검증. 프론트는 결과 표시만 | High |
| 11 | PDF 출력 | 미구현 | `@react-pdf/renderer` 또는 `jspdf` + `html2canvas` 도입. 브라우저 인쇄 CSS 대안도 고려 | Medium |

---

## 9. 코드 이슈 목록 (우선순위별)

### Critical

| ID | 파일 | 이슈 | 영향 |
|---|---|---|---|
| C-01 | mockData.js | 정답 데이터 클라이언트 번들 노출 | 보안 — 학생이 정답 열람 가능 |
| C-02 | QuizCreate.jsx, QuizList.jsx | mockQuizzes 배열 직접 변이 | 상태 일관성 파괴, 새로고침 시 소실 |

### High

| ID | 파일 | 이슈 | 영향 |
|---|---|---|---|
| H-01 | excelUtils.js | xlsx 라이브러리 429 kB 번들 | 해당 페이지 진입 시 143 kB 추가 로드 |
| H-02 | 전체 | 전역 에러 바운더리 없음 | 런타임 오류 시 흰 화면 (White Screen of Death) |
| H-03 | QuizAttempt.jsx | 클라이언트 역할 체크로 URL 직접 접근 보호 불완전 | 접근 제어 우회 가능 |
| H-04 | GradingDashboard.jsx | eslint-disable로 useMemo 의존성 억제 | 실데이터 전환 시 stale closure 버그 위험 |

### Medium

| ID | 파일 | 이슈 | 영향 |
|---|---|---|---|
| M-01 | QuizAttempt.jsx | 타이머 useEffect에서 handleSubmit 의존성 누락 | 클로저 stale 가능성 (현재는 callback 분리로 완화) |
| M-02 | GradingDashboard.jsx | 상태 변수 과다 및 searchStudent/studentSearch 중복 | 유지보수성 저하 |
| M-03 | excelUtils.js | 문항 텍스트 길이 제한 없음 | 과도한 입력 시 렌더링 성능 저하 |
| M-04 | QuestionBankContext.jsx | localStorage 직렬화 비용 — 문항 수 증가 시 매 변경마다 전체 배열 직렬화 | 300개 이상 시 체감 지연 |
| M-05 | vite.config.js | xlsx 청크 분리 미설정 | excelUtils 청크에 xlsx 전체 포함 |

### Low

| ID | 파일 | 이슈 | 영향 |
|---|---|---|---|
| L-01 | QuizCreate.jsx | QuestionsTab React.memo 미적용 | 폼 입력 시 문항 목록 불필요 리렌더 |
| L-02 | QuizCreate.jsx, QuizEdit.jsx | inline style 혼용 (Tailwind + style prop) | 스타일 일관성 저하 |
| L-03 | 전체 | PropTypes 또는 TypeScript 미도입 | 컴포넌트 인터페이스 타입 안전성 없음 |
| L-04 | GradingDashboard.jsx | 단일 파일 39 kB — 역할 분리 필요 | 유지보수성 저하 |

---

## 10. 성능 측정 기준 (참고)

| 지표 | 현재 (추정) | 권장 기준 | 측정 방법 |
|---|---|---|---|
| 초기 FCP (First Contentful Paint) | 빠름 (vendor 70 kB gzip만 초기 로드) | 1.5초 이내 | Lighthouse |
| 퀴즈 목록 페이지 JS 로드 | ~75 kB gzip (vendor + index + QuizList) | - | Network 탭 |
| GradingDashboard 진입 추가 로드 | ~113 kB gzip (GradingDashboard + charts + excelUtils) | - | Network 탭 |
| 60문항 목록 렌더 | 체감 없음 | 100ms 이하 | Chrome Performance |
| localStorage 읽기 (82명 데이터) | <5ms | - | console.time |

---

## 자체 리뷰 (잠재 리스크 및 개선 포인트)

**잠재 리스크**
1. mockQuizzes 직접 변이 패턴이 QuizCreate와 QuizList 양쪽에 분산되어 있어, API 전환 시 누락 포인트가 될 수 있음
2. localStorage 기반 채점 저장이 브라우저 탭/기기 간 공유 불가 — 조교 협업 채점 시나리오에서 동기화 문제 발생
3. excelUtils.js의 xlsx 라이브러리가 manualChunks 함수에서 별도 청크로 분리되지 않아 excelUtils 청크가 비대함 — vite.config.js에 `if (id.includes('xlsx')) return 'xlsx'` 조건 추가 고려 (현재 제약 내 함수 형식으로 추가 가능)

**개선 포인트 (우선순위)**
1. [즉시] mockQuizzes 배열 변이 → QuizContext 또는 useState 기반 관리로 전환
2. [즉시] 전역 ErrorBoundary 추가 (5줄 내외 코드)
3. [단기] xlsx manualChunks 분리 추가
4. [단기] 문항 텍스트 길이 제한 (maxLength 속성) 추가
5. [중기] API 레이어 추상화 (src/api/ 디렉토리 구성)

---

*다음 후속 질문*

**Q1.** GradingDashboard가 문항 중심/학생 중심 두 모드를 한 파일에서 관리하는 구조인데, 실제 조교 협업 채점 시나리오(여러 명이 동시에 채점)를 고려하면 "채점 락(lock)" 단위를 문항 단위로 할지, 학생 단위로 할지 정책 결정이 선행되어야 함 — 어느 방향으로 설계할 예정인가?

**Q2.** xlsx 라이브러리(0.18.5)는 CDN 라이선스 이슈가 있는 버전 계열인데, 상용 배포 전 `exceljs` 또는 `SheetJS Community Edition` 라이선스 검토를 했는가?

**Q3.** 정답 데이터가 클라이언트 번들에 노출되는 문제는 API 전환 전 프로토타입 단계에서도 완화할 수 있음 (정답 해시 비교 방식 등) — 현재 고객사 시연 대상이 실제 학생을 포함하는가, 아니면 내부 관계자만인가? 시연 범위에 따라 우선순위가 달라짐
