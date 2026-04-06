# PM4 QA 테스트 보고서 — XN Quizzes Prototype

**작성일**: 2026-04-03  
**작성자**: PM4 (QA 엔지니어)  
**대상**: XN Quizzes Prototype v0.0.0 (React 19 + Vite 8 + Tailwind CSS v4)  
**분석 방법**: 코드베이스 정적 분석 (src/pages, src/data, src/utils, src/components, src/context 전체 직접 열람)

---

## 테스트 범위 요약

| **영역** | **파일** |
|---|---|
| 라우팅/레이아웃 | App.jsx, Layout.jsx |
| 퀴즈 관리 | QuizList.jsx, QuizCreate.jsx, QuizEdit.jsx |
| 채점 | GradingDashboard.jsx |
| 통계 | QuizStats.jsx |
| 응시 | QuizAttempt.jsx |
| 문제은행 | QuestionBank.jsx, QuestionBankList.jsx |
| 데이터 | mockData.js, api.js |
| 유틸 | excelUtils.js |
| 컨텍스트 | RoleContext.jsx, QuestionBankContext.jsx |
| 컴포넌트 | AddQuestionModal.jsx, QuestionBankModal.jsx, ConfirmDialog.jsx, CustomSelect.jsx |

---

## 1. 기능 테스트

### 1-1. 라우팅 및 상태 전이

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| R-01 | 존재하지 않는 URL 접근 시 홈으로 리다이렉트 | PASS | - | 브라우저에서 `/quiz/999/edit` 직접 입력 → App.jsx의 `<Route path="*">` 가 `/`로 redirect |
| R-02 | 학생 모드에서 교수자 전용 페이지 URL 직접 접근 | FAIL | High | 학생 모드로 전환 후 `/quiz/1/grade` 직접 입력 → GradingDashboard, QuizCreate, QuizEdit, QuizStats, QuestionBank, QuestionBankList에 role 체크 로직 없음. QuizAttempt만 role 체크 존재 |
| R-03 | `/quiz/:id/attempt` 에서 교수자 모드 진입 시 홈 리다이렉트 | PASS | - | QuizAttempt.jsx의 useEffect로 `role !== 'student'` 이면 navigate('/') 처리 |
| R-04 | 새로고침 시 퀴즈 상태 유지 여부 | FAIL | High | mockQuizzes/mockStudents는 모듈 레벨 메모리 변수. 페이지 새로고침 시 초기값으로 복원. localStorage 채점 데이터는 유지되나 quiz status 변경(draft→open 등)은 소실 |
| R-05 | 퀴즈 편집 미저장 상태에서 뒤로가기 시 경고 | FAIL | Medium | 뒤로가기 동작하나 QuizEdit에서 변경사항 미저장 상태로 이탈해도 경고 없음 — 미저장 데이터 소실 위험 |
| R-06 | 유효하지 않은 quizId로 채점 대시보드 접근 | PASS | - | GradingDashboard: `!QUIZ_INFO` 체크 후 에러 UI 표시 |
| R-07 | 유효하지 않은 bankId로 문제은행 상세 접근 | FAIL | Medium | QuestionBank.jsx: `banks.find(b => b.id === bankId) ?? banks[0]` — 존재하지 않는 bankId 시 첫 번째 은행으로 폴백. 의도된 동작인지 스펙 불명확 |
| R-08 | 유효하지 않은 quizId로 퀴즈 통계/편집 접근 | FAIL | Medium | QuizStats, QuizEdit: `mockQuizzes.find() ?? mockQuizzes[0]` — 존재하지 않는 ID면 첫 번째 퀴즈 데이터로 폴백. 잘못된 데이터 그대로 표시 |

---

### 1-2. 퀴즈 생성 (QuizCreate)

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| C-01 | 필수값 미입력 시 발행 버튼 비활성화 | PASS | - | isFormValid: title, startDate, dueDate, questions.length > 0 모두 충족 필요 |
| C-02 | 마감일이 시작일보다 이른 경우 발행 불가 | PASS | - | `new Date(form.dueDate) > new Date(form.startDate)` 조건 적용 |
| C-03 | 시간 제한 직접 입력 시 음수/0 입력 | FAIL | Medium | timeLimitCustom 입력 필드에 min=1이 있으나 브라우저 기본 유효성 검사 우회 가능. 저장 시 `Number(form.timeLimitCustom) || 0` 으로 처리되어 실제 timeLimit=0으로 저장 → BUG-01 연계 |
| C-04 | 문항 0개 상태에서 발행 불가 | PASS | - | isFormValid 조건 `questions.length > 0` |
| C-05 | 동일 문항 중복 추가 방지 | PASS | - | addQuestion: `prev.find(e => e.id === q.id)` 로 중복 방지 |
| C-06 | 재응시 허용 + 점수공개 미설정 시 경고 | PASS | - | `isMultiAttempt && noRevealPeriod` 조건으로 ConfirmDialog 표시 |
| C-07 | 추가 기간에 동일 학생 중복 포함 시 경고 | PASS | - | hasDuplicate 체크 후 AlertDialog 표시 |
| C-08 | 임시저장 버튼 기능 없음 | FAIL | High | "임시저장" 버튼 UI 존재하나 onClick 핸들러 미구현. 클릭 시 아무 동작 없음 |
| C-09 | 퀴즈 발행 후 과목명 하드코딩 | FAIL | Low | `course: 'CS301 데이터베이스'` 고정값 저장. 다과목 지원 시 문제 발생 |
| C-10 | 총점 0점 퀴즈(text 유형만 포함) 발행 가능 | FAIL | Medium | points:0인 text 유형만 추가한 경우 totalPoints=0으로 발행 가능. 응시 결과 화면에서 나눗셈 오류 발생 가능 |

---

### 1-3. 퀴즈 편집 (QuizEdit)

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| E-01 | 편집 저장 시 draft → open 자동 전환 | PASS | - | `status: quiz.status === 'draft' ? 'open' : quiz.status` |
| E-02 | 편집 페이지에서 기존 설정값 불러오기 | FAIL | Medium | shuffleChoices, shuffleQuestions, showWrongAnswer, showScore 등 항상 false 초기값. 기존 저장값 미반영 |
| E-03 | quizMode(퀴즈 유형)도 항상 'graded'로 초기화 | FAIL | Low | `const [quizMode, setQuizMode] = useState('graded')` — 기존 quiz.quizMode 무시 |
| E-04 | 드래그 중 ESC 키/포커스 이탈 시 상태 불일치 | FAIL | Low | handleDragEnd는 dragIdx/overIdx만 null 처리. 드래그 도중 비정상 이탈 시 dragIdx가 잔류할 수 있음 |
| E-05 | 저장 후 문항 데이터 연결 끊김 | FAIL | Medium | handleSave 시 questions.length, totalPoints만 mockQuizzes에 업데이트. 실제 문항 내용은 저장 구조 없어 getQuizQuestions는 여전히 mockData 고정 배열 반환 |

---

### 1-4. 학생 응시 (QuizAttempt)

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| A-01 | 타이머 종료 시 자동 제출 | PASS | - | timeRemaining <= 1 시 handleSubmit(true) 호출 |
| A-02 | 이미 제출한 후 재제출 방지 | PASS | - | `if (submitted) return` 가드 |
| A-03 | `multiple_answers` 유형 응시 UI 미지원 | FAIL | High | QuestionCard에서 multiple_answers 케이스 없음. 해당 유형 문항 포함 퀴즈 응시 시 입력 UI 미렌더링 |
| A-04 | `numerical` 유형 — 소수 입력 시 정답 불일치 | FAIL | Medium | e.target.value는 string. "15.0" vs "15" 비교 시 불일치. 현재 정답 "15"/"15개" 등 문자열 배열 비교 방식이라 소수 입력 케이스 미처리 |
| A-05 | timeLimit=0 (제한 없음) 설정 퀴즈 응시 시 즉시 자동 제출 | FAIL | Critical | `setTimeRemaining((quiz?.timeLimit ?? 30) * 60)`: timeLimit=0이면 0초 초기화. 타이머 즉시 만료 → handleSubmit(true) 자동 호출 |
| A-06 | localStorage QuotaExceededError 처리 | PASS | - | saveStudentAttempt에서 QuotaExceededError 캐치 후 AlertDialog 표시 |
| A-07 | 자동채점 문항 없는 퀴즈 응시 후 결과 모달 0/0점 나눗셈 | FAIL | High | ResultModal: `Math.round((autoTotal / autoMax) * 100)` — autoMax=0이면 NaN/Infinity 표시 (서술형/essay만 있는 퀴즈 응시 시) |
| A-08 | draft 상태 퀴즈 URL 직접 입력으로 학생 응시 가능 | FAIL | High | 학생 모드에서 `/quiz/4/attempt` 직접 입력 시 미발행 퀴즈 응시 가능. QuizAttempt에 status 체크 없음 |
| A-09 | 문항 없는 퀴즈 응시 시 에러 처리 | PASS | - | getQuizQuestions 빈 배열 반환 시 "응시 가능한 문항이 없습니다" 표시 |
| A-10 | 응시 횟수 제한 초과 후에도 재응시 가능 | FAIL | High | QuizAttempt에 allowAttempts 체크 로직 없음. allowAttempts=1 퀴즈도 무제한 응시 가능 |

---

### 1-5. 채점 대시보드 (GradingDashboard)

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| G-01 | 수동채점 점수 저장 후 즉시 UI 반영 | PASS | - | gradeVersion 카운터로 questionsWithLiveCounts 재계산 트리거 |
| G-02 | 점수 입력 후 배점 초과 저장 방지 | PASS | - | `Number(score) > question.points` 시 저장 버튼 disabled |
| G-03 | 점수 소수점 입력 허용 | FAIL | Medium | input type="number"에 step 미정의. 0.5, 1.7 등 소수점 점수 저장 가능. 정책 미정의 |
| G-04 | 엑셀 업로드 성공 후 실제 점수 미반영 | FAIL | Critical | ExcelModal의 handleUpload는 파싱/검증만 수행. "82명의 점수가 성공적으로 반영되었습니다" 메시지는 표시되지만 실제로 mockStudents에 점수를 적용하는 코드가 없음 |
| G-05 | 채점 종료(closed) 후 GradingDashboard 재접근 시 채점 가능 | FAIL | Medium | 채점 종료 후 QuizList로 이동하나 `/quiz/1/grade` 직접 접근 시 채점 UI 그대로 표시. status 체크 없음 |
| G-06 | 학생 중심 모드에서 채점 저장 시 총점 즉시 반영 | PASS | - | AnswerCard의 handleSave에서 student.score 직접 변경 후 onSaved() 호출 |
| G-07 | 재채점 모달 기능 미구현 | FAIL | Medium | showRegradeModal true로 오픈만 되며 실제 재채점 로직(점수 재계산/초기화) 없음 |
| G-08 | 미제출 학생이 채점 목록에 미포함 | PASS | - | `mockStudents.filter(s => s.submitted)` 필터링 |
| G-09 | 문항 통계 탭 — 문항별 점수가 아닌 총점 분포 표시 | FAIL | Low | GradingDashboard StatsTab의 `scores = gradedStudents.map(s => s.score)` — 개별 문항 점수가 아닌 총점. 문항별 점수 분포를 의도했다면 잘못된 데이터 |

---

### 1-6. 퀴즈 통계 (QuizStats)

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| S-01 | 유효하지 않은 quizId 접근 시 첫 번째 퀴즈 폴백 | FAIL | Medium | `mockQuizzes.find() ?? mockQuizzes[0]` — R-08과 동일 이슈 |
| S-02 | 성적 다운로드(.xlsx) 동작 | PASS | - | downloadGradesXlsx 호출, XLSX 파일 생성 |
| S-03 | 문항 분석 다운로드 — 채점 완료 학생 없을 때 조기 종료 | PASS | - | `if (!graded.length) return` 처리 |
| S-04 | Cronbach α 계산 시 분산 0 처리 | PASS | - | `if (totalVar > 0)` 조건으로 나눗셈 보호 |
| S-05 | quiz.totalStudents=0 일 때 submitRate NaN 발생 가능 | FAIL | Medium | `quiz.submitted / quiz.totalStudents * 100`: totalStudents=0이면 NaN. 신규 생성 퀴즈(totalStudents:0) 통계 페이지에서 발생 가능 |
| S-06 | 학생 검색 — 대소문자 구분 처리 | PASS | - | `s.name.toLowerCase().includes(search.toLowerCase())` |

---

### 1-7. 문제은행 (QuestionBank / QuestionBankList)

| **#** | **테스트 항목** | **결과** | **심각도** | **재현 시나리오** |
|---|---|---|---|---|
| QB-01 | 문제은행 삭제 시 확인 다이얼로그 없음 | FAIL | High | 삭제 아이콘 클릭 → e.stopPropagation() 후 deleteBank() 즉시 호출. 문항 전체 포함 즉시 삭제 |
| QB-02 | 엑셀 업로드 — 5MB 초과 파일 에러 처리 | PASS | - | `file.size > 5 * 1024 * 1024` 체크 |
| QB-03 | 엑셀 업로드 — 지원 유형 외 입력 에러 처리 | PASS | - | EXCEL_SUPPORTED_TYPES 체크 후 명확한 에러 메시지 반환 |
| QB-04 | `multiple_choice` 보기 2개 미만 업로드 에러 처리 | PASS | - | choices.length < 2 검증 적용 (이번 세션 반영) |
| QB-05 | `short_answer` 정답 빈칸 업로드 에러 처리 | PASS | - | `!answer` 검증 적용 (이번 세션 반영) |
| QB-06 | 엑셀 빈 행 건너뜀 처리 | PASS | - | `if (!typeRaw && !textRaw && !pointsRaw) continue` |
| QB-07 | 문항 삭제 시 확인 다이얼로그 없음 | FAIL | Medium | QuestionBank.jsx handleDelete: deleteQuestion(id) 직접 호출, 확인 없음 |
| QB-08 | 문제은행 문항 수정 후 localStorage 즉시 동기화 | PASS | - | QuestionBankContext의 useEffect로 questions 변경 시 localStorage 저장 |
| QB-09 | 유효하지 않은 bankId — 첫 번째 은행으로 폴백 | FAIL | Medium | R-07과 동일. banks[0]으로 폴백하여 잘못된 은행 데이터 표시 |
| QB-10 | 엑셀 업로드로 추가한 문항에 choices/correctAnswer 미저장 | FAIL | High | handleCsvImport에서 text/type/points/bankId/usageCount/difficulty/groupTag만 저장. answer(정답)과 choices(보기)가 누락됨. 해당 문항을 퀴즈에 사용 시 보기/정답 없는 문항이 됨 |
| QB-11 | AddQuestionModal에서 배점 0 이하 입력 시 검증 없음 | FAIL | Low | initForm 기본값 points:5이나 사용자가 0이나 음수 입력 후 저장 가능 여부 확인 필요 (isValid 함수에 points 범위 체크 없음) |

---

### 1-8. 필터/검색/정렬

| **#** | **테스트 항목** | **결과** | **심각도** |
|---|---|---|---|
| F-01 | 문제은행 텍스트 검색 | PASS | - |
| F-02 | 문제은행 유형/난이도/그룹 복합 필터 | PASS | - |
| F-03 | 채점 대시보드 학생 검색 (이름/학번) | PASS | - |
| F-04 | 문항 정렬 (미채점 우선 / 문항 번호순) | PASS | - |
| F-05 | 성적 조회 미채점만 보기 필터 | PASS | - |

---

## 2. 성능 테스트

### 2-1. 렌더링 성능

| **#** | **항목** | **진단** | **심각도** |
|---|---|---|---|
| P-01 | 문제은행 60개 문항 렌더링 | 가상화 미적용. 필터 변경 시 filtered useMemo 재계산 후 전체 DOM re-render. 현재 60개로는 문제없으나 대규모 확장 시 지연 가능 | Medium |
| P-02 | 채점 대시보드 82명 학생 목록 | useMemo 적용으로 불필요한 재계산 방지. 리스트 가상화 없으나 82명 수준은 수용 가능 | Low |
| P-03 | 채점 저장 시 gradeVersion 트리거 | 채점 저장 시마다 questionsWithLiveCounts 전체 재계산. 82명 × 4문항 반복 연산. 현재 빈도 낮아 무리 없음 | Low |
| P-04 | QuizStats 문항 분석 엑셀 다운로드 | Cronbach α, 이분상관계수 등 복잡한 연산을 메인 스레드 동기 처리. 45명 × 10문항 기준 무리 없으나 300명+ 시 UI 블로킹 가능 | Low |
| P-05 | lazy loading + Suspense 적용 | PASS — 모든 페이지 lazy import + Suspense 처리 | - |
| P-06 | manualChunks 함수 형식 적용 | PASS — vite.config.js에서 함수 형식 사용 (Vite 8 규칙 준수) | - |
| P-07 | 번들 청크 분리 (charts, icons, vendor) | PASS — recharts, lucide-react, react/react-dom/react-router 분리 | - |
| P-08 | xlsx 라이브러리 chunk 미분리 | xlsx(SheetJS)를 manualChunks에서 별도 분리하지 않음. 문제은행/채점 페이지 청크에 xlsx 포함되어 번들 크기 증가 | Medium |

---

### 2-2. 저사양/반복 호출

| **#** | **항목** | **진단** | **심각도** |
|---|---|---|---|
| P-09 | getLocalGrades() 반복 localStorage.getItem 호출 | StudentRow/AnswerCard 각 인스턴스에서 독립적으로 localStorage.getItem 호출. 82명 × 4문항 렌더링 시 최대 328번 JSON.parse 발생. 캐싱 구조 필요 | Medium |
| P-10 | 타이머 setInterval 정리 | PASS — submitted 또는 timeRemaining<=0 시 clearInterval 처리 |

---

## 3. 보안 테스트

| **#** | **항목** | **결과** | **심각도** | **상세** |
|---|---|---|---|---|
| SEC-01 | 교수자 전용 페이지 역할 접근 제어 없음 | FAIL | High | GradingDashboard, QuizCreate, QuizEdit, QuizStats, QuestionBank, QuestionBankList 모두 role 검사 없음. 학생 모드에서 URL 직접 입력 시 접근 가능 |
| SEC-02 | draft 퀴즈 학생 URL 직접 접근 응시 | FAIL | High | `/quiz/4/attempt` 직접 입력 시 미발행 퀴즈 응시 가능. status 검증 없음 |
| SEC-03 | XSS — 텍스트 입력 렌더링 | PASS (제한적) | - | React JSX 기본 escape 처리. dangerouslySetInnerHTML 사용 없음. 단, AddQuestionModal formula 미리보기에서 `Function('"use strict"; return (' + expr + ')')()` 사용 — 현재 정규식 필터링 있으나 우회 가능성 잔존 |
| SEC-04 | 엑셀 업로드 MIME 타입 검증 | PASS (제한적) | Low | accept=".xlsx,.xls,.csv"는 UI 힌트. 실제 MIME 타입 서버 검증 없음. XLSX.read 파싱 실패 시 에러 처리 |
| SEC-05 | 실데이터 사용 금지 정책 준수 | PASS | - | mockData.js 내 학생 데이터 모두 가명(학생 A~L+suffix). 실명/실제 학번/이메일 없음 |
| SEC-06 | localStorage에 학생 응시 답안/개인정보 저장 | 주의 필요 | Medium | xnq_student_attempts에 학생 이름, 학번, 학과, 답안, 점수 전체 저장. 실서비스 전환 시 localStorage 저장 방식 재설계 필요 |
| SEC-07 | Canvas OAuth client_secret 프론트엔드 노출 위험 | PASS | - | api.js에 "client_secret은 프론트엔드 노출 금지" 명시. 현재 코드상 노출 없음 |
| SEC-08 | 역할 전환이 UI 토글로만 관리 | FAIL | Medium | RoleContext의 role은 클라이언트 메모리에만 존재. 세션 인증/서버 검증 없음. 데모 환경에서는 의도된 구조이나 실서비스 전환 시 반드시 서버사이드 인증으로 교체 필요 |

---

## 4. 스펙 미정의 / 논의 필요 항목

아래 항목은 코드 구현은 되어 있으나 정책/스펙이 명시되지 않아 예외 케이스 처리 방향 결정이 필요합니다.

| **#** | **항목** | **현재 구현 상태** | **논의 필요 내용** |
|---|---|---|---|
| SPEC-01 | 유효하지 않은 quizId/bankId 접근 시 폴백 정책 | 첫 번째 데이터로 폴백 | 에러 UI 표시 vs 리다이렉트 vs 폴백 중 어떤 방식이 올바른가 |
| SPEC-02 | 응시 횟수 제한 초과 후 재응시 시도 시 처리 | 미구현 (무제한 응시 가능) | 차단 메시지 표시 후 응시 불가 처리 필요 여부 |
| SPEC-03 | timeLimit=0 (제한 없음) 일 때 응시 화면 동작 | 0초 타이머로 즉시 자동 제출됨 (버그) | timeLimit=0은 타이머 비표시 + 무제한 응시로 처리해야 함 |
| SPEC-04 | 총점 0점 퀴즈 발행/응시 허용 여부 | 발행 가능. 응시 시 결과 화면에서 NaN 가능 | 배점 없는 퀴즈 허용 여부 및 결과 표시 방법 정의 필요 |
| SPEC-05 | 수동채점 점수 소수점 허용 여부 | 소수점 입력 가능 (step 미정의) | 정수 점수만 허용할지, 소수점 허용 시 반올림 기준 정의 |
| SPEC-06 | 엑셀 업로드 문항에 choices/correctAnswer 미저장 | 업로드되나 보기/정답 데이터 없음 | 엑셀 업로드로 추가된 문항을 퀴즈에 사용할 때의 동작 정의 |
| SPEC-07 | 문제은행 문항 수정 시 이미 생성된 퀴즈 반영 여부 | 미반영 (안내 문구 존재) | 퀴즈 생성 시점 문항 스냅샷 저장 vs 실시간 참조 방식 결정 필요 |
| SPEC-08 | 임시저장 기능 스펙 | 버튼 존재, 기능 미구현 | localStorage 임시저장 vs 서버 저장 방식 정의 필요 |
| SPEC-09 | draft 퀴즈에 대한 응시 차단 기준 | URL 직접 접근 시 응시 가능 | QuizAttempt에서 status 체크 및 차단 로직 추가 필요 |
| SPEC-10 | 재채점(RegradeModal) 기능 범위 | 모달 오픈만 구현, 내부 로직 없음 | 재채점 대상(전체/선택 문항), 방식(자동채점 재실행/수동채점 초기화) 스펙 정의 필요 |
| SPEC-11 | 엑셀 일괄 채점 업로드 결과 실제 반영 여부 | 파싱/검증만 수행, 반영 로직 없음 | "성공" 메시지 후 실제 점수 적용 로직 구현 필요 |
| SPEC-12 | 채점 종료 후 채점 대시보드 재진입 허용 여부 | 허용됨 (status 체크 없음) | 종료 후 수정 불가로 막을지, 읽기 전용으로 열지 정의 필요 |

---

## 5. 통합 이슈 목록 (우선순위별)

### Critical (2건)

| **ID** | **이슈** | **위치** | **재현 방법** |
|---|---|---|---|
| BUG-01 | timeLimit=0 설정 퀴즈 응시 시 즉시 자동 제출 | QuizAttempt.jsx L20 | "제한 없음" 설정 퀴즈 응시하기 클릭 → 화면 표시 없이 즉시 제출 완료 |
| BUG-02 | 엑셀 일괄 채점 업로드 — 성공 메시지는 표시되나 점수 미반영 | GradingDashboard.jsx ExcelModal handleUpload | 채점 양식 다운로드 → 점수 입력 후 업로드 → "완료" 표시되나 학생 점수 변화 없음 |

### High (8건)

| **ID** | **이슈** | **위치** |
|---|---|---|
| BUG-03 | 자동채점 문항 없는 퀴즈 응시 시 결과 모달 NaN 표시 | QuizAttempt.jsx ResultModal L297 |
| BUG-04 | multiple_answers 유형 응시 UI 미구현 | QuizAttempt.jsx QuestionCard |
| BUG-05 | 응시 횟수 제한 초과 후에도 재응시 가능 | QuizAttempt.jsx |
| BUG-06 | draft 퀴즈 URL 직접 입력으로 학생 응시 가능 | QuizAttempt.jsx |
| BUG-07 | 교수자 전용 페이지에 role 접근 제어 없음 | GradingDashboard, QuizCreate, QuizEdit 등 |
| BUG-08 | 임시저장 버튼 기능 미구현 | QuizCreate.jsx L150 |
| BUG-09 | 엑셀 업로드 문항에 choices/correctAnswer 미저장 | QuestionBank.jsx handleCsvImport L61-74 |
| BUG-10 | 문제은행 삭제 시 확인 없이 즉시 삭제 | QuestionBankList.jsx |

### Medium (10건)

| **ID** | **이슈** | **위치** |
|---|---|---|
| BUG-11 | 유효하지 않은 quizId/bankId 접근 시 첫 번째 데이터로 폴백 | QuizEdit, QuizStats, QuestionBank |
| BUG-12 | QuizEdit — 기존 설정값(shuffle, showScore 등) 편집 화면 미반영 | QuizEdit.jsx |
| BUG-13 | 새로고침 시 quiz status 등 메모리 상태 소실 | mockData.js (모듈 레벨 변수) |
| BUG-14 | QuizEdit 미저장 상태 뒤로가기 시 경고 없음 | QuizEdit.jsx |
| BUG-15 | 소수점 채점 점수 입력 허용 — 정책 미정의 | GradingDashboard StudentRow, AnswerCard |
| BUG-16 | 채점 대시보드 문항 통계 탭이 문항별 점수가 아닌 총점 분포 표시 | GradingDashboard StatsTab L970-978 |
| BUG-17 | 채점 종료 후 채점 대시보드 재접근 시 채점 가능 상태 유지 | GradingDashboard.jsx |
| BUG-18 | QuizStats의 totalStudents=0 시 submitRate NaN | QuizStats.jsx |
| BUG-19 | xlsx 라이브러리 chunk 미분리로 번들 크기 증가 | vite.config.js |
| BUG-20 | localStorage에 학생 응시 답안/개인정보 저장 — 실서비스 전환 시 재설계 필요 | mockData.js saveStudentAttempt |

### Low (5건)

| **ID** | **이슈** | **위치** |
|---|---|---|
| BUG-21 | 과목명 'CS301 데이터베이스' 하드코딩 | QuizCreate.jsx L178 |
| BUG-22 | QuizEdit에서 quizMode(graded/practice) 저장값 미반영 | QuizEdit.jsx L56 |
| BUG-23 | formula evalFormulaPreview의 Function() 사용 XSS 우회 가능성 | AddQuestionModal.jsx L245 |
| BUG-24 | 문항 삭제 시 확인 다이얼로그 없음 | QuestionBank.jsx |
| BUG-25 | getLocalGrades()가 각 StudentRow/AnswerCard 인스턴스에서 반복 localStorage.getItem 호출 | GradingDashboard.jsx |

---

## 6. 자체 리뷰

**잘 구현된 부분**
- lazy loading + Suspense + manualChunks 함수 형식으로 Vite 8 제약 준수
- localStorage QuotaExceededError 처리
- 엑셀 업로드 파싱 에러 처리 (행 번호 명시, 유형별 안내 메시지)
- 복수 응시 점수 정책(최고/최신/평균) 처리 구조
- 타이머 자동 제출 및 clearInterval 정리
- 실데이터 사용 금지 정책 준수

**주요 리스크 요약**
- Critical 2건(BUG-01, BUG-02)은 현재 응시 및 채점 핵심 플로우를 직접 망가뜨리는 버그로 즉시 수정 필요
- High 8건 중 역할 접근 제어 미비(BUG-07)는 실서비스 전환 전 가장 우선순위 높은 보안 이슈
- 스펙 미정의 12건은 개발 착수 전 PM/PO 확정 필요

---

Q1. BUG-01(timeLimit=0 즉시 자동 제출)과 BUG-02(엑셀 일괄 채점 점수 미반영)는 Critical로 분류했는데, 이번 스프린트에서 바로 수정할지 아니면 실서비스 전환 전 픽스 목록으로 넘길지 어떻게 볼거야?

Q2. SPEC-06(엑셀 업로드 문항의 choices/correctAnswer 미저장)과 SPEC-07(문제은행 문항 수정 시 기존 퀴즈 미반영 정책)은 서로 연결된 이슈인데, 퀴즈 생성 시점에 문항 스냅샷을 찍는 방식으로 갈지 문제은행 참조 ID만 저장하는 방식으로 갈지 — Canvas LMS 표준 관점에서 어느 쪽이 더 맞아?

Q3. 역할 접근 제어(BUG-07)가 현재 없는 상태인데, 프로토타입 시연용으로는 큰 문제가 아니더라도 실제 LTI 연동 전에는 Canvas OAuth 세션 기반으로 교체가 필수잖아 — 이걸 MVP2 Acceptance Criteria에 명시적으로 올려놓는 게 맞지 않을까?
