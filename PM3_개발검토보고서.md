# PM3 — 개발검토보고서

**작성일**: 2026-04-07
**작성자**: PM3 (시니어 개발자 역할)
**검토 대상**: XN Quizzes 프로토타입 전체 소스 (코드 직접 분석 기반)

---

## 요약

| 구분 | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| 번들/성능 | 0 | 1 | 2 | 1 |
| 상태 관리 | 1 | 1 | 2 | 0 |
| 보안 | 0 | 2 | 1 | 1 |
| 실데이터 전환 | 0 | 3 | 3 | 2 |
| 코드 품질 | 0 | 1 | 2 | 2 |

---

## 1. 빌드 번들 크기 분석

### 현황

`vite.config.js`의 `manualChunks`는 CLAUDE.md 제약을 준수하여 함수 형식으로 작성되어 있다. 청크 분리 전략은 아래와 같다.

| 청크명 | 포함 라이브러리 | 예상 크기 (gzip) |
|--------|---------------|-----------------|
| `vendor` | react, react-dom, react-router-dom | ~150 KB |
| `charts` | recharts | ~120 KB |
| `icons` | lucide-react | ~50~80 KB |
| 미분리 | xlsx 라이브러리 | ~200 KB — **문제** |
| 각 페이지 청크 | 8개 페이지 lazy | ~10~30 KB 각 |

### 이슈

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| **High** | xlsx 청크 미분리 | `xlsx` 라이브러리(~200 KB gzip)가 `manualChunks`에서 분리되지 않아 첫 방문 시 사용하지 않는 페이지에서도 번들에 포함될 수 있음. `excelUtils.js`를 dynamic import로 전환하거나 `manualChunks`에 `xlsx` 조건 추가 필요 |
| **Medium** | lucide-react 아이콘 수량 | 각 파일에서 named import 방식으로 사용 중이어서 트리쉐이킹은 동작하나, GradingDashboard 단일 파일에 15개 이상 아이콘이 import됨. 미사용 아이콘 일제 정리 후 재측정 권고 |
| **Medium** | mockData.js 번들 비대 | 단일 파일 약 1,000줄 이상. 120개 문제은행 문항 + 5개 퀴즈별 문항 배열이 모두 포함되어 초기 파싱 비용 발생. 청크별 분리 또는 lazy import 구조 전환 권고 |
| **Low** | chunkSizeWarningLimit 상향 | 600KB로 설정되어 실제 문제가 되는 청크를 경고 억제로 숨기는 형태. xlsx 분리가 선행되어야 의미가 있음 |

---

## 2. 렌더링 최적화

### 현황

- 페이지 단위 `lazy` + 단일 `<Suspense>` 구성: 적절
- `useMemo` / `useCallback` 사용: GradingDashboard, QuizList, QuestionBankModal 등 주요 연산에 적용되어 있음
- `React.memo`는 어디에도 사용되지 않음

### 이슈

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| **High** | GradingDashboard 렌더링 비용 | 82명 학생 목록 + 문항별 필터 + 채점 입력 폼이 단일 컴포넌트 내 존재(약 1,300줄). `gradeVersion` 카운터가 증가할 때마다 `questionsWithLiveCounts` useMemo 전체 재계산이 발생하며, 내부에서 매번 `getLocalGrades()`(JSON.parse)를 호출함. 채점 저장이 빈번한 상황에서 체감 지연 가능 |
| **Medium** | QuizCard 미메모이제이션 | `InstructorQuizList`에서 퀴즈 목록 리렌더링 시 각 `QuizCard`가 `React.memo` 없이 모두 재렌더링됨. 현재 8개로 문제없으나 퀴즈 수 증가 시 체감됨 |
| **Medium** | QuestionBankModal 가상화 부재 | `visibleCount` 15개씩 슬라이스로 제어하고 있어 현재는 문제없음. 단, 120개 문항을 한번에 메모리에 로드하는 구조이며 실데이터 규모 증가 시 react-virtual 등 도입 필요 |
| **Low** | eslint-disable react-hooks/exhaustive-deps 2건 | GradingDashboard 82행, 105행에서 의존성 배열을 의도적으로 억제. 실데이터 전환 시 stale closure 버그로 이어질 수 있어 근본 구조 개선 필요 |

---

## 3. 상태 관리 구조

### 현황

| 레이어 | 상태 관리 방식 |
|--------|---------------|
| 역할/학생 선택 | RoleContext 전역 |
| 문제은행 | QuestionBankContext 전역 + localStorage 동기화 |
| 퀴즈 목록 | QuizList 내 로컬 state |
| 채점 기록 | localStorage (xnq_manual_grades) — 컨텍스트 없음 |
| 응시 기록 | localStorage (xnq_student_attempts) — 컨텍스트 없음 |

### 이슈

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| **Critical** | mockQuizzes 전역 객체 직접 변이 | `QuizList.jsx:95` — `mockQuizzes[mockQuizzes.findIndex(...)] = updated[idx]` 로 import된 모듈 레벨 배열을 직접 수정하고 있음. React 렌더링 사이클 바깥에서 상태를 변경하는 패턴으로, 새로고침 없이는 다른 페이지에서 변경이 반영되지 않거나 예기치 않은 동작을 유발할 수 있음. mockQuizzes를 Context나 별도 상태로 올려야 함 |
| **High** | 채점/응시 상태의 localStorage 분산 | `xnq_manual_grades`, `xnq_student_attempts`, `xnq_banks`, `xnq_bank_questions` 4개의 localStorage 키가 컨텍스트 없이 각 컴포넌트/유틸에서 독립적으로 읽고 씀. 데이터 정합성 보장이 어렵고 동일 데이터를 여러 곳에서 읽을 때 최신성 보장이 안 됨 |
| **Medium** | QuestionBankContext useEffect 동기화 비용 | banks, questions 상태 변경 시마다 120개 문항 전체를 직렬화하여 localStorage에 씀. debounce 또는 쓰로틀링 적용 권고 |
| **Medium** | QuizCreate/QuizEdit 저장 미구현 | 생성/편집 후 저장 버튼 클릭 시 실제 상태 반영 없이 navigate('/')로 이동만 함. 실데이터 전환 전 Context 또는 API 연동으로 교체 필요 |

---

## 4. API 연동 전환 체크리스트

`api.js`에 Canvas LMS 연동 구조가 문서화되어 있으나, 실제 각 페이지는 `mockData.js`를 직접 import하고 있어 API 전환 시 파일별 수정이 필요하다.

### 전환 필요 파일 목록

| 파일 | 현재 mock import | 전환 대상 함수 | 비고 |
|------|-----------------|----------------|------|
| `pages/QuizList.jsx` | mockQuizzes | fetchQuizzes(courseId) | 발행 상태 변경도 API PUT 필요 |
| `pages/QuizCreate.jsx` | mockQuizzes, mockStudents | createQuiz(courseId, payload) | 저장 로직 자체가 미구현 상태 |
| `pages/QuizEdit.jsx` | mockQuizzes, getQuizQuestions, mockStudents | fetchQuiz, updateQuiz, fetchQuestions | 저장 로직 미구현 |
| `pages/GradingDashboard.jsx` | getQuizStudents, mockQuizzes, getStudentAnswer, getQuizQuestions | fetchSubmissions, gradeSubmission | localStorage 채점 저장도 API 저장으로 전환 |
| `pages/QuizStats.jsx` | mockQuizzes, getQuizStudents, getQuizQuestions | fetchQuiz, fetchSubmissions | 통계 집계 로직은 프론트 유지 가능 |
| `pages/QuizAttempt.jsx` | mockQuizzes, getQuizQuestions, saveStudentAttempt | fetchQuiz, submitAttempt | 응시 기록 저장을 API로 전환 |
| `pages/QuestionBank.jsx` | QUIZ_TYPES, MOCK_COURSES | fetchBanks(courseId), fetchBankQuestions(bankId) | QuestionBankContext 교체 또는 내부 API 래핑 |
| `context/QuestionBankContext.jsx` | MOCK_BANKS, MOCK_BANK_QUESTIONS | Canvas API 또는 자체 백엔드 | localStorage 동기화 전체 제거 |
| `utils/excelUtils.js` | QUIZ_TYPES 상수만 참조 | 상수 별도 파일 분리 시 독립 가능 | 연동 후에도 그대로 사용 가능 |

### Canvas API 연동 추가 작업

| 항목 | 내용 |
|------|------|
| Vercel API Route 구현 | `api.js` 주석에 명시된 `/api/canvas/*` 프록시 서버리스 함수 작성 필요 |
| OAuth 2.0 토큰 관리 | client_secret은 프론트 미노출 원칙 준수(현재 코드에서 준수됨). Vercel 환경변수로 관리 필요 |
| courseId 컨텍스트화 | 현재 과목이 CS301 데이터베이스 단일 하드코딩. 다과목 지원 시 courseId를 URL 파라미터 또는 별도 Context로 관리 필요 |
| 페이지네이션 | Canvas API는 대량 응답에 Link 헤더 기반 페이지네이션 적용. 현재 프론트에 페이지네이션 로직 없음 |
| 에러 핸들링 | canvasFetch에 기본 에러 처리는 있으나 각 페이지에 로딩/에러 상태 UI가 없음. ErrorBoundary 패턴 도입 권고 |

---

## 5. 동시 접속/부하 시나리오별 예상 병목

현재는 프론트엔드 단독 구조이므로 실데이터 전환 후의 예상 병목을 시나리오별로 분석.

| 시나리오 | 예상 병목 | 현재 코드 위험 요소 |
|----------|----------|-------------------|
| 120명 학생 동시 응시 | Canvas API submissions 엔드포인트 burst 요청. 브라우저 타이머 기반 자동 제출이 정각에 집중됨 | QuizAttempt.jsx의 setInterval 1초 단위 타이머. 자동 제출 시 모든 학생이 동시에 submitAttempt 호출 |
| 교수자 동시 채점 | 채점 결과 저장 시 충돌(Last-Write-Wins) | 현재 localStorage에 저장하므로 실데이터 전환 시 낙관적 잠금(Optimistic Locking) 또는 서버 병합 정책 필요 |
| 문제은행 120개 문항 일괄 렌더링 | Context에서 questions 전체 배열을 한 번에 메모리에 유지 | QuestionBankContext가 모든 bank의 모든 문항을 단일 배열로 관리. bank별 지연 로드 구조 필요 |
| GradingDashboard 82명 + 10문항 | useMemo 연산이 동기 실행. 느린 디바이스에서 입력 지연 | questionsWithLiveCounts 계산 시 getLocalGrades() 호출이 매번 JSON.parse 수행 |
| Excel 다운로드 (학생 100명 이상) | xlsx 라이브러리의 동기 파일 생성이 메인 스레드 블로킹 | excelUtils.js의 XLSX.writeFile이 동기 실행. 규모 커질 경우 Web Worker 분리 필요 |

---

## 6. XSS/인젝션 취약점 점검

### 점검 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| dangerouslySetInnerHTML 사용 여부 | **없음** | 전체 코드 검색 결과 0건 |
| innerHTML 직접 조작 | **없음** | — |
| eval() 사용 | **없음** | — |
| JSX 텍스트 렌더링 | **안전** | 모두 {변수} 형식으로 React 자동 이스케이프 |

### 이슈

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| **High** | localStorage JSON 역직렬화 무검증 | QuestionBankContext, GradingDashboard, mockData.js에서 localStorage 값을 JSON.parse 후 타입/구조 검증 없이 바로 상태로 사용함. 브라우저 DevTools에서 localStorage를 임의 변조하면 내부 state가 오염됨. 실데이터 전환 후 서버 응답 파싱에도 동일 패턴이 이어질 경우 위험 |
| **High** | 엑셀 파일 파싱 최솟값 검증만 존재 | parseGradingSheet에서 score >= 0 검증은 있으나 최댓값 초과 여부(question.points 초과) 검증이 없음. 실데이터 전환 시 서버 측 재검증 필수 |
| **Medium** | 점수 입력값 상한 검증 부재 | 엑셀 업로드 일괄 채점 시 배점 초과 점수를 입력해도 프론트에서 차단하지 않음 |
| **Low** | 민감 정보 localStorage 평문 저장 | xnq_manual_grades(채점 기록), xnq_student_attempts(응시 기록)가 암호화 없이 저장됨. 공용 PC 환경에서 민감 데이터 노출 가능. 프로토타입이므로 현재는 허용 |

---

## 7. 실데이터 전환 시 데이터 모델 변경 필요 항목

### 현재 mockData 구조와 Canvas API 구조 비교

| 항목 | 현재 구조 | Canvas API 실제 구조 | 변경 필요 사항 |
|------|----------|---------------------|--------------|
| 퀴즈 식별자 | id: '1' (문자열 숫자) | Canvas quiz id는 정수 | Number(id) 처리 일괄 확인 |
| 문항 식별자 | q1, q2_1, q3_1 등 접두어 패턴 | Canvas question_id는 정수 | autoGradeAnswer의 접두어 분기 방식 전면 재설계 필요 |
| 학생 데이터 | id, name, studentId, department | Canvas user: id, name, sortable_name, sis_user_id 등 | 필드명 매핑 필요. studentId(학번)는 sis_user_id에 해당 |
| 채점 데이터 | autoScores, manualScores를 학생 오브젝트 내부 중첩 | Canvas QuizSubmissionQuestion 별도 API | 채점 데이터를 학생 오브젝트에서 분리하여 별도 관리 구조 필요 |
| 퀴즈 상태 | draft, open, grading, closed | Canvas: unpublished, active (별도 submission 상태) | 상태 매핑 레이어 필요. grading은 Canvas에 없는 커스텀 상태 |
| 문항 유형 | 12종 내부 정의 | New Quizzes와 Classic Quizzes의 API 엔드포인트가 다름 | 어느 쪽을 타겟으로 할지 결정 필요 |
| 자동채점 결과 | 프론트에서 autoGradeAnswer() 직접 계산 | Canvas가 서버에서 자동채점 후 반환 | 프론트 자동채점 함수는 프리뷰/검증용으로만 축소 필요 |
| 응시 횟수 관리 | localStorage 누적 후 읽기 시점에 정책 적용 | Canvas QuizSubmission.attempts_left 필드 | 응시 횟수 제한 로직을 Canvas API에 위임하고 프론트는 UI 표시만 담당 |
| 문제은행 | 자체 MOCK_BANKS 구조 | Canvas QuestionBank API | bankId, groupTag를 Canvas의 question_group 구조로 매핑 필요 |

### 마이그레이션 단계 권고

| 단계 | 작업 | 선행 조건 |
|------|------|----------|
| Phase 1 | mockData.js 상수(QUIZ_TYPES, MOCK_COURSES)를 별도 constants.js로 분리 | 없음 |
| Phase 2 | api.js의 주석 처리된 fetch 함수 구현, isMock 분기 활성화 | Vercel API Route 구현 |
| Phase 3 | 각 페이지의 mockData 직접 import를 api.js 함수 호출로 교체 | Phase 2 완료 |
| Phase 4 | QuestionBankContext를 API 연동 구조로 전환, localStorage 제거 | Phase 2 완료 |
| Phase 5 | mockQuizzes 전역 변이 버그 수정, QuizContext 도입 | Phase 3 완료 |

---

## 8. 종합 코드 품질 이슈

| 우선순위 | 위치 | 내용 |
|----------|------|------|
| **High** | mockData.js 단일 파일 과부하 | 1,000줄 이상의 단일 파일에 퀴즈 목록, 문항 데이터, 학생 데이터, 채점 함수, 문제은행 데이터가 혼재. 최소 quizData.js, studentData.js, bankData.js, gradingUtils.js로 분리 권고 |
| **Medium** | GradingDashboard.jsx 단일 파일 과부하 | 약 1,300줄 추정. 문항/학생 중심 모드, 엑셀 모달, PDF 모달, 재채점 모달이 단일 파일에 존재. 각 모달과 채점 패널을 별도 컴포넌트로 분리 필요 |
| **Medium** | autoGradeAnswer 함수의 id 접두어 분기 | question.id.startsWith('q2_') 패턴으로 퀴즈별 정답 맵을 분기하는 설계가 취약함. 문항 오브젝트에 correctAnswers 배열을 직접 포함시키는 방식으로 개선 필요 |
| **Low** | getStudentAnswer 함수의 결정론적 답안 생성 | (studentIdx * 3 + idNum) % pool.length 해시로 답안을 생성하여 같은 학생이 항상 같은 답을 제출하는 것처럼 보임. 채점 로직 테스트 시 혼동 가능 |
| **Low** | QuizCreate/QuizEdit 저장 미완성 안내 부재 | 저장 버튼이 있으나 실제 저장 없이 화면만 이동함. 사용자에게 프로토타입임을 명시하는 안내 문구가 없어 혼동 가능 |

---

## 9. 즉시 조치 권고

### Critical (바로 수정)
1. `QuizList.jsx:95` — `mockQuizzes` 전역 배열 직접 변이 제거. mockQuizzes를 useState로 올리거나 Context화

### High (다음 스프린트 내)
2. xlsx 라이브러리를 manualChunks에 추가하여 별도 청크 분리
3. localStorage 4개 키의 읽기/쓰기를 단일 서비스 레이어로 통합
4. localStorage JSON 파싱 후 기본 구조 검증 추가
5. mockData.js를 관심사별 파일로 분리

### Medium (API 연동 전 준비)
6. autoGradeAnswer 함수의 id 접두어 분기 방식 리팩토링
7. GradingDashboard.jsx 모달 및 패널 컴포넌트 분리
8. eslint-disable react-hooks/exhaustive-deps 2건 근본 해결
9. 점수 입력 상한값 검증 추가

---

*본 보고서는 소스 코드 정적 분석 기반으로 작성되었으며, 빌드 결과물 측정은 빌드 실행 권한 부재로 코드 분석 추정치를 사용함.*
