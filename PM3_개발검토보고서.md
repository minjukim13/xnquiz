# PM3 개발검토보고서 — XN Quizzes Prototype

> 검토 기준일: 2026-03-25
> 검토자: PM3 시니어 개발자
> 검토 범위: src/App.jsx, src/pages/*.jsx, src/data/mockData.js, src/components/*.jsx, vite.config.js, package.json

---

## 1. 빌드 번들 크기 분석

### 의존성 패키지 추정 크기 (minified + gzip 기준)

| 청크 이름 | 포함 패키지 | 추정 크기(gzip) | 비고 |
|---|---|---:|---|
| **vendor** | react 19 + react-dom + react-router-dom 7 | ~50 KB | react-router v7은 v6 대비 번들 경량화 |
| **charts** | recharts 3.x | ~95 KB | D3 의존성 포함, 가장 무거운 청크 |
| **icons** | lucide-react 0.577 | ~18 KB | tree-shaking 적용 시 |
| **page chunks** | 6개 페이지 (lazy) | ~30 KB | GradingDashboard가 단일 최대 페이지 |
| **CSS** | Tailwind v4 (lightningcss) | ~15 KB | 사용 클래스만 purge |
| **합계 추정** | | **~208 KB** | chunkSizeWarningLimit 600 KB 기준 여유 있음 |

### 코드 스플리팅 평가

```
App.jsx — 6개 페이지 전부 lazy() + Suspense 적용됨 (양호)
manualChunks — 함수 형식으로 작성됨, Vite 8 rolldown 규칙 준수 (양호)
```

**이슈**: recharts가 GradingDashboard와 QuizStats 두 페이지에서 import됨에도 하나의 `charts` 청크로 분리되어 있어 실제 효과는 양호. 단, recharts 내부의 D3 패키지(d3-scale, d3-shape 등)가 manualChunks에서 명시적으로 처리되지 않아 charts 청크에 암묵적으로 포함됨 — 추후 번들 분석 시 확인 필요.

---

## 2. 렌더링 최적화

### 현황 평가표

| 항목 | 파일 | 현재 상태 | 평가 |
|---|---|---|---|
| useMemo 적용 | GradingDashboard.jsx:59, 74, 84 | sortedQuestions, questionStudents, allStudents | 양호 |
| useMemo 적용 | QuizStats.jsx:46 | stdev 계산 | 양호 |
| useMemo 적용 | QuestionBank.jsx:54 | filtered 목록 | 양호 |
| useCallback 적용 | QuizCreate.jsx:96, 100 | addQuestion, addNewQuestion | 양호 |
| useCallback 적용 | GradingDashboard.jsx:652 | handleSaved (StudentDetailPanel) | 양호 |
| React.memo | 전 컴포넌트 | 미적용 | 결함 — 하위 항목 참고 |
| 리스트 가상화 | 전 페이지 | 미적용 | Medium 이슈 |

### 리렌더링 위험 지점

**[High] GradingDashboard.jsx:489~503 — StudentRow 컴포넌트**
- `StudentRow`가 `React.memo` 없이 82명 학생 전체를 렌더링
- `score`, `saved`, `expanded` 상태가 개별 컴포넌트 내부에 있어서 한 명의 점수 입력 시 형제 컴포넌트가 불필요하게 재렌더링될 가능성 존재
- 실데이터 전환 후 학생 수 증가 시(120명+ 수강 강좌) 체감 성능 저하 예상

**[Medium] QuestionBank.jsx:131~141 — filtered 목록 렌더링**
- 60개 문항 전체를 DOM에 렌더링
- 검색/필터 시 useMemo로 재계산은 최적화되어 있으나 DOM 노드 자체는 매번 전체 마운트
- 가상화(virtualization) 없이 실데이터 500개+ 문항 처리 시 병목 예상

**[Low] GradingDashboard.jsx:693~697 — questions.map() 반복 렌더링**
- StudentDetailPanel 내 모든 문항을 한 번에 렌더링
- 10문항 기준 현재는 문제없으나, 30문항 이상 퀴즈에서는 스크롤 성능 고려 필요

### 리스트 가상화 필요 여부 판단

| 목록 | 현재 최대 아이템 수 | 가상화 필요 임계값 | 판단 |
|---|---:|---:|---|
| 학생 목록 (GradingDashboard) | 82명 | 100명 | 현재 불필요, MVP2에서 재검토 |
| 문제은행 목록 (QuestionBank) | 60문항 | 200문항 | 현재 불필요, 실데이터 전환 후 재검토 |
| 퀴즈 목록 (QuizList) | 4개 | 50개 | 불필요 |

---

## 3. 상태 관리 구조

### 현황

전 컴포넌트가 로컬 `useState` 중심으로 구성되어 있으며, Context API 및 전역 상태 관리 라이브러리는 미사용.

### Props Drilling 평가

| 경로 | 깊이 | 판단 |
|---|---:|---|
| GradingDashboard → QuestionDetailPanel → ResponsesTab → StudentRow | 3단계 | 허용 수준 |
| GradingDashboard → StudentDetailPanel → AnswerCard | 2단계 | 양호 |
| QuizCreate → InfoTab → Field | 2단계 (`set` 함수 전달) | 양호 |

현재 규모에서는 props drilling이 관리 가능 수준. 단, 채점 상태(score, saved)가 각 `StudentRow` / `AnswerCard`에 분산되어 있어 "전체 채점 완료" 같은 집계 연산 시 상태 끌어올리기(lifting state)가 불가피.

### 실데이터 전환 시 컨텍스트 도입 검토 필요 시점

- 채점 결과를 여러 컴포넌트에서 읽어야 하는 경우 (예: 채점 진행률 실시간 업데이트)
- 유저 권한/세션 정보 전역 참조 시
- 퀴즈 상태(draft/open/closed/grading) 변경이 여러 페이지에 반영되어야 할 때

---

## 4. API 연동 전환 체크리스트

### 4-1. 교체 대상 파일 및 함수

| 파일 | 현재 (mock) | 교체 대상 | 우선순위 |
|---|---|---|---|
| `src/data/mockData.js` | `mockQuizzes` | `GET /api/quizzes` | High |
| `src/data/mockData.js` | `mockQuestions` | `GET /api/quizzes/:id/questions` | High |
| `src/data/mockData.js` | `mockStudents` | `GET /api/quizzes/:id/submissions` | High |
| `src/data/mockData.js` | `getStudentAnswer()` | `GET /api/submissions/:id/answers` | High |
| `src/data/mockData.js` | `isAnswerCorrect()` | 서버사이드 자동채점 결과 수신으로 대체 | High |
| `GradingDashboard.jsx:586~596` | `setSaved(true)` (UI 로컬 상태) | `PATCH /api/submissions/:id/scores` 호출 | Critical |
| `QuizCreate.jsx:152` | `navigate('/')` (로컬 상태 소멸) | `POST /api/quizzes` 호출 후 redirect | High |
| `QuizEdit.jsx:53~64` | `setQuestions()` (로컬) | `PUT /api/quizzes/:id/questions` | High |

### 4-2. 추가 구현 필요 항목

| 항목 | 현재 상태 | API 연동 시 필요 작업 |
|---|---|---|
| 로딩 상태 처리 | 미구현 (즉시 mock 데이터 반환) | Suspense 또는 isLoading 상태 + 스켈레톤 UI |
| 에러 핸들링 | 미구현 | try/catch + ErrorBoundary 또는 에러 토스트 |
| 낙관적 업데이트 | 미구현 | 채점 저장 시 UI 즉시 반영 + 실패 롤백 |
| 페이지네이션 | 미구현 | 학생 목록, 문제은행 목록에 cursor 또는 page 기반 페이징 |
| 인증/인가 헤더 | 미구현 | Authorization: Bearer {token} 헤더 삽입 레이어 |
| 실시간 채점 상태 동기화 | 미구현 | WebSocket 또는 polling으로 다른 채점자와 충돌 방지 |

### 4-3. 권장 API 연동 구조 (참고)

```
현재: 페이지 컴포넌트 → mockData.js (직접 import)
권장: 페이지 컴포넌트 → hooks/useQuiz.js, hooks/useSubmissions.js → api/client.js → 실서버
```

mockData.js를 곧바로 API 호출 함수로 교체하는 방식보다, 커스텀 훅 레이어를 두는 것이 테스트 및 점진적 전환에 유리.

---

## 5. 동시 접속 및 부하 시나리오

### 시나리오별 예상 병목

| 시나리오 | 예상 병목 | 심각도 |
|---|---|---|
| 시험 종료 후 교수자 2명 이상 동시 채점 | 같은 학생 답안에 점수 중복 저장 (race condition) | Critical |
| 학생 120명 동시 응시 및 제출 | 제출 API 동시 요청 폭증 — DB write 병목 | High |
| 채점 대시보드 접속 중 실시간 진행률 갱신 | polling 미구현 상태에서 stale data 표시 | High |
| 문제은행 500문항 이상 전체 렌더링 | DOM 과부하, 필터 useMemo 재계산 비용 증가 | Medium |
| 모바일 저사양 기기에서 GradingDashboard 렌더링 | recharts + 82명 리스트 동시 렌더링 시 메모리 압박 | Medium |

### 현재 코드 기준 가장 큰 위험

GradingDashboard.jsx 내 채점 저장 로직(`setSaved(true)`)이 완전히 로컬 상태이므로, **실데이터 전환 시 낙관적 업데이트 실패(서버 저장 실패 후 UI는 저장됨으로 표시) 시나리오가 사용자에게 데이터 손실처럼 느껴질 수 있음.**

---

## 6. XSS / 인젝션 취약점 점검

### 점검 결과

| 위치 | 코드 패턴 | 판단 |
|---|---|---|
| GradingDashboard.jsx:553 | `<p>{answer}</p>` — 학생 제출 답안 직접 렌더링 | 안전 (JSX 자동 이스케이프) |
| GradingDashboard.jsx:746 | `<div>{answer}</div>` | 안전 (JSX 자동 이스케이프) |
| QuizCreate.jsx:204~208 | `<input value={form.title}>` | 안전 (controlled input) |
| QuizCreate.jsx:214~218 | `<textarea value={form.description}>` | 안전 (controlled textarea) |
| QuizStats.jsx 전체 | 데이터 직접 렌더링 | 안전 (JSX 이스케이프) |
| mockData.js:187 | `answer.toLowerCase().includes(c.toLowerCase())` | 안전 (문자열 비교만 수행) |

**dangerouslySetInnerHTML 사용: 전무** — XSS 직접 취약점 없음.

### 실데이터 전환 후 주의 항목

| 항목 | 위험 | 대응 방안 |
|---|---|---|
| 학생 제출 서술형 답안 렌더링 | 서버에서 HTML 마크업 허용 시 XSS 가능 | 서버 응답 값을 plain text로만 수신하거나 DOMPurify로 sanitize |
| 파일 첨부(file_upload 유형) 처리 | 악성 파일 업로드 | 서버사이드 파일 타입 검증 필수 (클라이언트 검증만으로 불충분) |
| 점수 입력 number 필드 | 음수, 소수, 문자열 주입 | `min={0} max={question.points}` 이미 적용됨. 서버사이드 추가 검증 필요 |
| URL 파라미터 `:id` 직접 사용 | `GradingDashboard.jsx:35` — `mockQuizzes.find(q => q.id === id)` | 실 API 전환 시 서버가 권한 검증해야 함. 클라이언트에서 별도 처리 불필요 |

### 민감 데이터 노출

- **실명/실학번 없음** — DEMO_NAMES 익명 처리 준수 (`mockData.js:207`)
- 학번 패턴 `2022${...}` 은 실제 학번 체계를 흉내 내지만 완전 가상 값으로 문제없음
- 브라우저 DevTools에서 mockData.js 전체가 소스맵으로 노출될 수 있음 — **프로덕션 빌드 시 source map 비활성화 권장**

---

## 7. 실데이터 전환 시 데이터 모델 변경 필요 항목

### 7-1. mockData 구조 vs. 실서버 예상 구조 차이

| 항목 | mockData 현재 | 실서버 예상 필드 | 변경 필요 |
|---|---|---|---|
| `mockStudents[].score` | 총점 단일 숫자 또는 null | 서버에서 autoScores + manualScores 합산 후 반환 | 합산 로직 서버 이전 |
| `mockStudents[].autoScores` | `{ q1: 5, q2: 5, ... }` 클라이언트 내장 | 서버 자동채점 결과 API로 수신 | `getStudentAnswer()`, `isAnswerCorrect()` 제거 |
| `mockStudents[].manualScores` | null 또는 `{ q3: 8, ... }` | `PATCH /submissions/:id/manual-scores` 결과 | 채점 저장 API 연동 |
| `mockQuestions[].gradedCount` | 하드코딩 (45명) | 서버 실시간 집계 | 별도 API 또는 submission 목록에서 클라이언트 집계 |
| `mockQuestions[].avgScore` | 하드코딩 | 서버 집계 또는 클라이언트 계산 | QuizStats.jsx 계산 로직 재검토 |
| `ANSWER_POOL` / `AUTO_CORRECT_ANSWERS` | 클라이언트 내 하드코딩 | 서버 응답 제거 | mockData.js에서 완전 삭제 |
| `mockQuizzes[].status` | 문자열 상수 | Enum 타입으로 서버 정의 | 상태 전이 로직을 서버에서 관리 |

### 7-2. QUESTION_BANK 중복 정의 문제

**[High]** `QUESTION_BANK` 배열이 아래 3개 파일에 **각각 독립적으로** 하드코딩되어 있음.

- `src/pages/QuizCreate.jsx:29~46`
- `src/pages/QuizEdit.jsx:9~26`
- `src/pages/QuestionBank.jsx:25~43`

실데이터 전환 전이라도 **mockData.js로 통합 또는 별도 constants 파일로 분리**해야 유지보수 가능.

### 7-3. LIGHT_COLORS 중복 정의 문제

**[Medium]** 문항 유형별 배지 색상 매핑 `LIGHT_COLORS` 객체가 아래 4개 파일에 중복 선언됨.

- `src/pages/GradingDashboard.jsx:18~31`
- `src/pages/QuizCreate.jsx:48~61`
- `src/pages/QuizEdit.jsx:28~41`
- `src/pages/QuizStats.jsx:10~23`
- `src/pages/QuestionBank.jsx:9~22` (border 클래스 포함 변형)

공통 상수 파일(`src/constants/quizTypes.js` 등)로 분리 필요.

---

## 8. 코드 이슈 목록 (우선순위 기준)

### Critical

| 번호 | 파일명:라인 | 이슈 내용 | 영향 |
|---|---|---|---|
| C-01 | `GradingDashboard.jsx:586~596` | 채점 저장 로직이 UI 로컬 상태(`setSaved`)만 갱신하고 서버 통신 없음. 페이지 새로고침 시 채점 결과 전부 소실 | 채점 데이터 손실 |
| C-02 | `GradingDashboard.jsx:783~788` (AnswerCard) | 동일 이슈 — 학생 중심 모드의 채점 저장도 로컬 상태만 변경 | 채점 데이터 손실 |

### High

| 번호 | 파일명:라인 | 이슈 내용 | 영향 |
|---|---|---|---|
| H-01 | `QuizCreate.jsx:29~46`, `QuizEdit.jsx:9~26`, `QuestionBank.jsx:25~43` | QUESTION_BANK 3중 중복 정의 | 유지보수성 저하, 데이터 불일치 위험 |
| H-02 | `GradingDashboard.jsx:489~503` | `StudentRow` 컴포넌트에 `React.memo` 없음. 82명 전체 불필요 재렌더링 가능성 | 렌더링 성능 |
| H-03 | `QuizEdit.jsx:44` | `const { id } = useParams()` 선언 후 페이지 내에서 미사용 (하드코딩된 breadcrumb 제목 사용) | 실데이터 연동 불가 |
| H-04 | `vite.config.js` | `source map` 설정 없음 — 프로덕션 빌드 시 기본적으로 소스맵 미생성이나, 명시적 `sourcemap: false` 선언 권장 | 민감 정보 노출 위험 |

### Medium

| 번호 | 파일명:라인 | 이슈 내용 | 영향 |
|---|---|---|---|
| M-01 | `GradingDashboard.jsx:18~31`, `QuizCreate.jsx:48~61`, `QuizEdit.jsx:28~41`, `QuizStats.jsx:10~23`, `QuestionBank.jsx:9~22` | LIGHT_COLORS 5중 중복 정의 | 유지보수성 저하 |
| M-02 | `GradingDashboard.jsx:51` | `searchStudent`(학생 중심 모드)와 `searchStudent` 기능이 동일한데 `52:searchStudent`(공통)으로 중복 상태 변수 선언 — 실제로는 `studentSearch(line:49)`와 `searchStudent(line:51)`이 별도로 존재 | 혼란, 잠재적 버그 |
| M-03 | `QuizStats.jsx:44` | `Math.max(...scores)` — 스프레드 방식은 배열 크기가 클 때(수만 개) 스택 오버플로우 가능. `scores.reduce()`로 교체 권장 | 대규모 데이터 시 잠재적 오류 |
| M-04 | `QuizCreate.jsx:101` | `id: \`new_q${Date.now()}\`` — Date.now()는 밀리초 충돌 가능성 존재. `crypto.randomUUID()` 권장 | 중복 ID 위험 |
| M-05 | `CustomSelect.jsx:34~56` | 드롭다운 열린 상태에서 키보드 접근성(arrow key, escape key) 미구현 | 접근성(a11y) |
| M-06 | `QuestionBank.jsx:54` | useMemo 의존성 배열 `[search, filterType, filterBank]`는 올바르나 `QUESTION_BANK`가 모듈 스코프 상수 — 실데이터 전환 시 useState로 이동 필요 | 실데이터 전환 시 버그 |

### Low

| 번호 | 파일명:라인 | 이슈 내용 | 영향 |
|---|---|---|---|
| L-01 | `GradingDashboard.jsx:660~665` | `setTimeout(() => scrollIntoView(...), 150)` — 하드코딩 타임아웃. 저사양 기기에서 애니메이션 미완료 시점에 스크롤 실행될 수 있음 | UX |
| L-02 | `QuizStats.jsx:56~65` | 응시 시간 계산이 `string split`으로 직접 파싱. 날짜가 자정을 넘기면 오류 (예: 23:50 시작 → 00:10 종료) | 엣지 케이스 버그 |
| L-03 | `Layout.jsx:28` | `breadcrumbs.map((b, i) => ...)` — 배열 인덱스를 key로 사용. 동적 변경 시 React key 경고 가능 | 잠재적 렌더링 경고 |
| L-04 | `mockData.js:187` | `answer.toLowerCase().includes(c.toLowerCase())` — 부분 문자열 매칭으로 오답이 정답 처리될 가능성 존재 (예: "SELECT *"이 "SELECT" 정답을 포함) | 자동채점 정확도 |
| L-05 | `GradingDashboard.jsx:35`, `QuizStats.jsx:37` | `?? mockQuizzes[0]` — 존재하지 않는 퀴즈 ID 접근 시 첫 번째 퀴즈로 폴백. 사용자에게 잘못된 데이터 표시 | UX 혼란 |

---

## 9. 실데이터 전환 체크리스트

### Phase 1: 코드 정리 (API 연동 전 선행 필수)

- [ ] `QUESTION_BANK` 중복 정의 → `src/data/questionBankData.js`로 통합
- [ ] `LIGHT_COLORS` 중복 정의 → `src/constants/quizTypeColors.js`로 통합
- [ ] `src/data/mockData.js`를 `src/data/` 내부에 유지하되, 각 export를 API 호출 함수로 교체하는 커스텀 훅 레이어 설계
- [ ] `QuizEdit.jsx`에서 미사용 `id` 파라미터 활용하도록 breadcrumb 및 초기 데이터 로딩 로직 연결

### Phase 2: API 클라이언트 레이어 구축

- [ ] `src/api/client.js` 생성 (fetch wrapper, auth 헤더 주입, 에러 핸들링 공통화)
- [ ] `src/hooks/useQuizzes.js` — 퀴즈 목록/상세 조회
- [ ] `src/hooks/useSubmissions.js` — 제출 목록, 답안 조회, 채점 결과 저장
- [ ] `src/hooks/useQuestionBank.js` — 문제은행 CRUD

### Phase 3: 페이지별 교체

- [ ] `QuizList.jsx` — `mockQuizzes` → `useQuizzes()` 훅으로 교체, 로딩/에러 상태 처리
- [ ] `GradingDashboard.jsx` — `mockStudents`, `mockQuestions` 교체, 채점 저장 API 연동
- [ ] `QuizStats.jsx` — `mockStudents`, `mockQuestions` 교체, 통계 집계 서버/클라이언트 역할 분리
- [ ] `QuestionBank.jsx` — `QUESTION_BANK` 상수 → API 호출로 교체, 페이지네이션 추가
- [ ] `QuizCreate.jsx` — 폼 제출 시 `POST /api/quizzes` 연동, 임시저장 기능 실제 동작화
- [ ] `QuizEdit.jsx` — `useParams().id` 기반 퀴즈 데이터 로딩, `PUT /api/quizzes/:id` 연동

### Phase 4: 보안 및 안정화

- [ ] 프로덕션 빌드에서 `sourcemap: false` 명시
- [ ] 서술형 답안 렌더링 시 DOMPurify 또는 plain text 강제 처리
- [ ] 파일 첨부 유형(file_upload) 서버사이드 검증 구현
- [ ] 채점 동시 수정 방지 — 낙관적 잠금(optimistic locking) 또는 마지막 저장 기준 정책 결정
- [ ] `Math.max(...scores)` → `scores.reduce()` 교체
- [ ] `Date.now()` ID → `crypto.randomUUID()` 교체

---

## 10. 총평

**잘된 점**
- Vite 8 rolldown 규칙을 준수한 `manualChunks` 함수 형식 적용
- 6개 페이지 전부 lazy loading + Suspense 적용으로 초기 로딩 최적화
- useMemo, useCallback 핵심 연산에 적절히 적용
- 익명 처리 정책 준수 (실명/실학번 없음)
- JSX 자동 이스케이프로 XSS 기본 방어 구조 유지

**즉시 개선 필요 항목**
- **C-01, C-02**: 채점 저장 로직 — 로컬 상태에만 저장되어 새로고침 시 전부 소실. 프로토타입이더라도 사용자에게 데이터 유실로 인지되어 UX 신뢰 저하
- **H-01**: QUESTION_BANK 3중 중복 — 지금 당장 단일 파일로 통합해도 리소스 부담 없음

**MVP2 진입 전 선행 권고**
- React.memo 적용 (StudentRow, AnswerCard)
- LIGHT_COLORS / QUESTION_BANK 공통 상수 분리
- API 클라이언트 레이어 설계 확정

---

*생성: PM3 시니어 개발자 에이전트 | XN Quizzes Prototype v0.0.0*
