# PM4_QA 테스트 보고서
## XN Quizzes 프로토타입 — QA 엔지니어 검토

- **작성일**: 2026-04-07
- **검토 기준**: 코드 정적 분석 (소스 직접 분석 기반)
- **대상 경로**: `c:\Users\김민주\Desktop\xnquiz\src`
- **스택**: React 19 + Vite 8 + Tailwind CSS v4 + recharts + xlsx

---

## 요약

| 구분 | Critical | High | Medium | Low | 합계 |
|---|---:|---:|---:|---:|---:|
| **기능 테스트** | 2 | 3 | 5 | 0 | 10 |
| **성능 테스트** | 0 | 1 | 3 | 2 | 6 |
| **보안 테스트** | 1 | 2 | 1 | 1 | 5 |
| **전체** | **3** | **6** | **9** | **3** | **21** |

---

## 1. 기능 테스트 (Functional Test)

### 1.1 퀴즈 목록 (QuizList)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-01 | 교수자 뷰 퀴즈 목록 렌더링 | 통과 | - | mockQuizzes 정상 바인딩, status별 배지 표시 |
| F-02 | 학생 뷰에서 draft 퀴즈 미노출 | 통과 | - | `status !== 'draft'` 필터 정상 작동 |
| F-03 | 주차 필터 1~16 + 미지정 고정 표시 | 통과 | - | WEEK_OPTIONS 배열 정상 정의 |
| F-04 | 주차 미선택 시 차시 필터 비활성화 | 통과 | - | `filterWeek === 'all'` → disabled 처리 |
| F-05 | 주차 변경 시 차시 자동 초기화 | 통과 | - | onWeekChange 콜백에서 onSessionChange('all') 연결 |
| F-06 | 발행 버튼 2단계 확인 (confirmPublish) | 통과 | - | confirmPublish state로 확인/취소 분기 구현 |
| F-07 | 발행 후 status 'open'으로 변경 | 통과 | - | mockQuizzes 배열 직접 수정 + setQuizzes 동기화 |
| F-08 | 응시 횟수 초과 버튼 비활성화 | 통과 | - | isAttemptExceeded 분기, 툴팁 표시 |
| F-09 | D-day 배지 표시 | 통과 | - | Math.ceil 기준 날짜 차이 계산, D-0 포함 |
| F-10 | 필터 결과 없을 때 Empty state 표시 | 통과 | - | sortedQuizzes.length === 0 분기 처리 |

### 1.2 퀴즈 생성 (QuizCreate)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-11 | 필수 필드 미입력 시 생성 버튼 비활성화 | 통과 | - | isFormValid: title + startDate + dueDate + questions.length > 0 |
| F-12 | 종료일이 시작일보다 이른 경우 차단 | 통과 | - | `new Date(dueDate) > new Date(startDate)` 검증 |
| F-13 | 중복 학생 배정 감지 및 경고 | 통과 | - | allSelected 중복 검사 후 AlertDialog 표시 |
| F-14 | 임시저장 버튼 동작 | **실패** | **High** | 버튼 존재하나 onClick 핸들러 없음. 클릭해도 아무 동작 안 함 |
| F-15 | 직접 입력 시간 비운 채 저장 시 처리 | **실패** | **High** | `Number('') \|\| 0` → timeLimit 0(무제한)으로 저장, 사용자에게 경고 없음 |
| F-16 | 생성된 퀴즈의 영속성 (새로고침 내구성) | **실패** | **Critical** | `mockQuizzes.push()`로 메모리에만 저장, 새로고침 시 소실 |

### 1.3 퀴즈 편집 (QuizEdit)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-17 | 없는 ID로 직접 접근 시 처리 | **실패** | **High** | `mockQuizzes.find() ?? mockQuizzes[0]` — 잘못된 ID 접근 시 첫 번째 퀴즈 데이터가 기본값으로 표시됨 |
| F-18 | 편집 저장 내용 목록 반영 | **실패** | **Medium** | 저장 버튼 클릭 시 mockQuizzes 원본 배열에 반영하는 로직 불명확. 편집 결과가 목록으로 돌아왔을 때 반영되지 않을 수 있음 |
| F-19 | 문항 드래그앤드롭 순서 변경 | 통과 | - | moveQuestion useCallback 구현 |

### 1.4 퀴즈 응시 (QuizAttempt)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-20 | 교수자 역할로 응시 URL 직접 접근 시 홈 리다이렉트 | 통과 | - | `!isPreview && role !== 'student'` → Navigate to="/" |
| F-21 | closed/draft 상태 퀴즈 응시 차단 | 통과 | - | 상태별 statusMsg 분기, 응시 불가 화면 표시 |
| F-22 | 미리보기 모드에서 실제 제출 차단 | 통과 | - | isPreview true 시 제출 버튼 미노출 |
| F-23 | 타이머 만료 시 자동 제출 | 통과 | - | timeRemaining <= 1 → handleSubmit(true) 호출 |
| F-24 | localStorage 저장 실패 시 에러 알림 | 통과 | - | catch 블록에서 AlertDialog 표시 |
| F-25 | 문항 없는 퀴즈 응시 시 안내 메시지 | 통과 | - | questions.length === 0 → 안내 화면 표시 |
| F-26 | 재응시 후 이전 제출 답안 확인 | **실패** | **Medium** | saveStudentAttempt는 append만 수행. 학생이 이전 응시 답안을 확인할 방법 없음 |

### 1.5 채점 대시보드 (GradingDashboard)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-27 | 없는 quiz ID 접근 시 에러 화면 표시 | 통과 | - | !QUIZ_INFO 체크 후 AlertCircle + 목록 링크 |
| F-28 | 문항 중심 ↔ 학생 중심 모드 전환 | 통과 | - | setGradingMode + setMobileView('questions') |
| F-29 | 수동 채점 저장 후 실시간 카운트 갱신 | 통과 | - | gradeVersion 카운터로 questionsWithLiveCounts 재계산 |
| F-30 | 학생 검색 (이름/학번) | 통과 | - | s.name.includes + s.studentId.includes 분기 |
| F-31 | 미채점 우선 정렬 | 통과 | - | gradedCount < totalCount 기준 정렬 |
| F-32 | 답안지 Excel 다운로드 | 통과 | - | downloadAnswerSheetsXlsx 연결 |
| F-33 | 재채점 모달 실제 동작 | **실패** | **Medium** | showRegradeModal state는 있으나 실제 재채점 로직 미구현 (UI only) |

### 1.6 문제은행 (QuestionBank / QuestionBankList)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-34 | 없는 bankId 접근 시 fallback 처리 | **실패** | **Medium** | `banks.find() ?? banks[0]` — QuizEdit과 동일한 패턴. 의도하지 않은 데이터 기본 노출 |
| F-35 | 문제은행 생성/삭제 localStorage 동기화 | 통과 | - | useEffect → localStorage.setItem 정상 |
| F-36 | 문항 검색 + 유형/난이도/그룹 복합 필터 | 통과 | - | useMemo로 필터 조합 정상 |
| F-37 | 문항 드래그 순서 변경 | 통과 | - | dragIndexRef + reorderQuestions 구현 |
| F-38 | 새로고침 후 데이터 유지 | 통과 | - | localStorage 초기값 로드 구현 |
| F-39 | Excel 업로드/다운로드 | 통과 | - | parseExcelOrCsv / downloadQuestionTemplate 연결 |

### 1.7 퀴즈 통계 (QuizStats)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-40 | 없는 quiz ID 접근 시 fallback | **실패** | **Medium** | `mockQuizzes.find() ?? mockQuizzes[0]` — 오류 없이 첫 번째 퀴즈 통계 표시. 사용자 혼동 가능 |
| F-41 | 채점 완료 전 Excel 다운로드 요청 | 통과 | - | graded.length === 0 시 downloadItemAnalysisXlsx 조기 반환 |
| F-42 | 학생별 성적 정렬 (이름/점수/시간) | 통과 | - | ArrowUp/Down 정렬 버튼 구현 |

### 1.8 라우팅 및 예외 플로우

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-43 | 정의되지 않은 URL 접근 | 통과 | - | `path="*"` → Navigate to="/" replace |
| F-44 | 뒤로가기 후 필터/선택 상태 유지 | **실패** | **Medium** | 컴포넌트 로컬 상태 기반이므로 뒤로가기 시 필터/선택 상태 초기화됨 |
| F-45 | 역할 전환 후 화면 즉시 갱신 | 통과 | - | RoleContext 전역 상태, QuizList에서 role 기반 분기 정상 |

---

## 2. 성능 테스트 (Performance Test)

> 측정 기준: 코드 정적 분석 기반. 실제 수치는 브라우저 실행 환경에서 Lighthouse / DevTools Performance 탭으로 별도 확인 필요.

### 2.1 렌더링 성능

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| P-01 | 문항 60개 이상 렌더링 지연 여부 | 해당없음 | - | 현재 최대 문항수: mockQuiz4Questions 25문항. 60개 이상 케이스 없음. 실데이터 전환 시 가상화 검토 필요 |
| P-02 | 학생 82명 목록 렌더링 최적화 | **주의** | **Medium** | mockStudents 82명 전체 map() 렌더링. React.memo/가상 스크롤 미적용. 채점 대시보드에서 gradeVersion 변경 시 82명 전체 재계산 발생 |
| P-03 | 문제은행 120문항 렌더링 | **주의** | **Medium** | MOCK_BANK_QUESTIONS 120개 전체 map() 렌더링, 가상 스크롤 미적용. 실데이터에서 문항 수 증가 시 FPS 저하 가능성 |
| P-04 | 필터/검색 조작 시 응답성 | 통과 | Low | 핵심 필터 연산 useMemo 처리. 과도한 의존성은 없음 |

### 2.2 번들 및 로딩

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| P-05 | 페이지 단위 lazy loading 적용 | 통과 | - | App.jsx: 8개 페이지 전체 lazy() 처리, Suspense 래핑 |
| P-06 | manualChunks 함수 형식 준수 (Vite 8) | 통과 | - | vite.config.js에서 함수 형식 정의, charts/icons/vendor 3개 청크 분리 |
| P-07 | xlsx 라이브러리 청크 분리 여부 | **실패** | **High** | xlsx 패키지(~700KB)가 manualChunks에 미포함. 해당 패키지를 사용하는 페이지 청크에 통합되어 로딩 부담 발생. `if (id.includes('xlsx')) return 'xlsx'` 추가 필요 |
| P-08 | mockData.js 파일 크기 | **주의** | **Medium** | 단일 파일 1,000라인 이상. 퀴즈별 문항, 학생 데이터, 유틸 함수가 혼재. 실데이터 전환 전 분리 필요 |

### 2.3 초기 로딩

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| P-09 | Suspense fallback PageLoader 구현 | 통과 | - | 스피너 UI 구현, 화면 중앙 정렬 |
| P-10 | Pretendard 폰트 CDN 의존성 | **주의** | **Low** | CDN 의존이므로 네트워크 지연 시 FOUT(Flash of Unstyled Text) 발생 가능. font-display: swap 처리 여부 확인 필요 |

---

## 3. 보안 테스트 (Security Test)

### 3.1 접근 제어 및 권한

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| S-01 | 학생이 /quiz/:id/grade (채점 대시보드) 직접 접근 | **실패** | **Critical** | GradingDashboard에 역할 가드 없음. 학생이 URL 직접 입력 시 채점 화면 전체 접근 가능. 다른 학생의 응시 답안 및 점수 열람 가능 |
| S-02 | 학생이 /quiz/new (퀴즈 생성) 직접 접근 | **실패** | **High** | QuizCreate에 역할 가드 없음. 학생이 URL 직접 입력 시 퀴즈 생성 화면 진입 가능 |
| S-03 | 학생이 /question-banks (문제은행) 직접 접근 | **실패** | **High** | QuestionBankList, QuestionBank에 역할 가드 없음. 학생이 문제 목록 전체 열람 가능 — 사전 문항 노출 위험 |

### 3.2 XSS 취약점

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| S-04 | dangerouslySetInnerHTML / innerHTML / eval 사용 여부 | 통과 | - | 전체 소스 grep 결과 해당 패턴 미발견 |
| S-05 | 텍스트 입력값 렌더링 방식 | 통과 | - | React JSX 기반 텍스트 렌더링이므로 자동 이스케이프 적용 |
| S-06 | 접근 코드(accessCode) 입력 처리 | 통과 | - | accessCode는 state에만 저장, 별도 위험 렌더링 없음 |

### 3.3 민감 데이터 보호

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| S-07 | 실데이터 사용 금지 정책 준수 | 통과 | - | 전체 학생 데이터 익명 처리(학생 A~O), 학번도 가상(2022XXXX), 실명/이메일 미발견 |
| S-08 | localStorage 저장 데이터 범위 | **주의** | **Medium** | 4개 키(xnq_manual_grades, xnq_student_attempts, xnq_banks, xnq_bank_questions)에 채점 데이터 평문 저장. 실데이터 전환 시 민감 정보가 클라이언트에 노출되는 구조 개선 필요 |
| S-09 | Canvas API client_secret 노출 여부 | 통과 | - | api.js 주석에 "절대 프론트엔드에 노출 금지" 명시. VITE 환경변수 분리 패턴 준수 |
| S-10 | console.error를 통한 내부 정보 노출 | **주의** | **Low** | QuizAttempt, mockData.js에 console.error 2건. 프로덕션 빌드 시 제거 또는 외부 로깅 도구 연동 권고 |

---

## 4. 주요 이슈 정리 (우선순위 기준)

### Critical (즉시 수정)

| 이슈 ID | 파일 | 내용 | 재현 방법 |
|---|---|---|---|
| C-01 | GradingDashboard.jsx | 학생 역할 사용자가 채점 대시보드 URL 직접 접근 가능. 다른 학생 점수/답안 노출 | 역할 전환 → 학생 선택 후 /quiz/1/grade 직접 입력 |
| C-02 | QuizCreate.jsx | 신규 생성 퀴즈가 mockQuizzes.push()로만 저장. 새로고침 시 소실 | 퀴즈 생성 후 F5 새로고침 |

### High

| 이슈 ID | 파일 | 내용 |
|---|---|---|
| H-01 | QuizCreate.jsx | 임시저장 버튼 onClick 핸들러 없음 (UI만 존재) |
| H-02 | QuizCreate.jsx | 직접 입력 시간 비우고 저장 시 timeLimit 0으로 저장, 경고 없음 |
| H-03 | QuizEdit.jsx, QuizStats.jsx, QuestionBank.jsx | 잘못된 ID 접근 시 index[0] fallback — 의도하지 않은 데이터 노출 |
| H-04 | QuizCreate.jsx, QuestionBankList.jsx, QuestionBank.jsx | 학생 역할로 교수자 전용 화면 URL 직접 접근 가능 |
| H-05 | vite.config.js | xlsx 라이브러리 manualChunks 미포함으로 번들 최적화 누락 |

### Medium

| 이슈 ID | 파일 | 내용 |
|---|---|---|
| M-01 | QuizEdit.jsx | 편집 저장 후 목록 반영 여부 불명확 |
| M-02 | QuizAttempt.jsx | 재응시 시 이전 응시 답안 확인 불가 |
| M-03 | GradingDashboard.jsx | 재채점 모달 UI만 있고 실제 로직 미구현 |
| M-04 | 전체 페이지 | 뒤로가기 시 필터/선택 상태 초기화 (URL 상태 동기화 없음) |
| M-05 | GradingDashboard.jsx, QuestionBank.jsx | 82명/120문항 목록 가상 스크롤 미적용 |
| M-06 | mockData.js | 1,000+ 라인 단일 파일. 실데이터 전환 시 구조 분리 필요 |
| M-07 | 전체 localStorage 사용 코드 | 실데이터 전환 시 채점 데이터 클라이언트 평문 저장 개선 필요 |

### Low

| 이슈 ID | 파일 | 내용 |
|---|---|---|
| L-01 | index.css / CDN | Pretendard 폰트 CDN 의존, font-display: swap 처리 여부 확인 필요 |
| L-02 | QuizAttempt.jsx, mockData.js | console.error 2건, 프로덕션 빌드 전 제거 또는 대체 권고 |

---

## 5. 테스트 커버리지 현황

| 기능 영역 | 항목 수 | 통과 | 실패/주의 |
|---|---:|---:|---:|
| 퀴즈 목록 | 10 | 10 | 0 |
| 퀴즈 생성 | 6 | 3 | 3 |
| 퀴즈 편집 | 3 | 1 | 2 |
| 퀴즈 응시 | 7 | 6 | 1 |
| 채점 대시보드 | 7 | 6 | 1 |
| 문제은행 | 6 | 5 | 1 |
| 퀴즈 통계 | 3 | 2 | 1 |
| 라우팅/예외 | 3 | 2 | 1 |
| 성능 — 렌더링 | 4 | 2 | 2 |
| 성능 — 번들 | 4 | 2 | 2 |
| 보안 — 접근제어 | 3 | 0 | 3 |
| 보안 — XSS | 3 | 3 | 0 |
| 보안 — 데이터 | 4 | 2 | 2 |
| **합계** | **63** | **44 (70%)** | **19 (30%)** |

---

## 6. 수정 우선순위 Top 5

1. **[C-01] 역할 기반 접근 제어 구현** — GradingDashboard, QuizCreate, QuestionBankList, QuestionBank 4개 페이지에 `if (role !== 'instructor') return <Navigate to="/" replace />` 가드 추가. 실데이터 연동 시 치명적 보안 결함으로 직결됨

2. **[C-02] 생성/편집 저장 영속성 확보** — mockQuizzes.push() 패턴은 프로토타입 한계이나 UX 혼란을 유발. 최소한 localStorage 저장으로 새로고침 내구성 확보 권고

3. **[H-03] 잘못된 ID 접근 시 fallback 제거** — QuizEdit, QuizStats, QuestionBank 3곳에서 동일한 `?? 배열[0]` 패턴 사용. `!quiz` 시 404 에러 화면 또는 홈 리다이렉트로 일관 처리

4. **[H-01] 임시저장 기능 구현 또는 버튼 제거** — 기능 없는 버튼은 사용자 신뢰를 해침. 구현 전까지 disabled + "준비 중" 토스트 처리 권고

5. **[H-05] xlsx 청크 분리** — vite.config.js manualChunks 함수에 `if (id.includes('xlsx')) return 'xlsx'` 한 줄 추가로 해결 가능. xlsx는 약 700KB 규모로 번들 영향 큼

---

*PM4_QA 테스트 보고서 — 코드 정적 분석 기반 / 실 브라우저 Lighthouse 및 DevTools 병행 검토 권고*
