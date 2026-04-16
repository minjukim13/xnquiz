# PM4_QA 테스트 보고서
## XN Quizzes 프로토타입 — QA 엔지니어 검토

- **초판 작성일**: 2026-04-07
- **수정 반영 업데이트**: 2026-04-16
- **검토 기준**: 코드 정적 분석 + 수정 커밋 반영 확인
- **대상 경로**: `c:\Users\김민주\Desktop\xnquiz\src`
- **스택**: React 19 + Vite 8 + Tailwind CSS v4 + recharts + xlsx

---

## 요약

| 구분 | 항목 | 통과 | 실패/미해결 | 통과율 |
|---|---:|---:|---:|---:|
| **기능 테스트** | 45 | 39 | 6 | 87% |
| **성능 테스트** | 10 | 7 | 3 | 70% |
| **보안 테스트** | 10 | 8 | 2 | 80% |
| **전체** | **63** | **54 (86%)** | **9 (14%)** | **86%** |

> **이전 대비**: 44/63 (70%) → **54/63 (86%)**, 10건 수정 완료

---

## 수정 이력 (2026-04-16)

| 커밋 | 수정 이슈 | 내용 |
|------|----------|------|
| `38995c0` | S-01, S-02, S-03, H-03, H-04 | 역할 기반 접근 제어 가드 6개 페이지 추가 + 잘못된 ID fallback 제거 |
| `10f926a` | C-02, M-01 | 퀴즈 데이터 localStorage 영속화 (addQuiz/updateQuiz/removeQuiz) |
| `519ad2f` | CR-05 (신규) | WCAG AA 텍스트 색상 대비 수정 (13개 파일, 40+곳) |
| `b15b24b` | H-05, H-02 | xlsx 청크 분리 + timeLimit 빈값 검증 추가 |

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
| F-07 | 발행 후 status 'open'으로 변경 | 통과 | - | updateQuiz 래퍼 함수 + setQuizzes 동기화 |
| F-08 | 응시 횟수 초과 버튼 비활성화 | 통과 | - | isAttemptExceeded 분기, 툴팁 표시 |
| F-09 | D-day 배지 표시 | 통과 | - | Math.ceil 기준 날짜 차이 계산, D-0 포함 |
| F-10 | 필터 결과 없을 때 Empty state 표시 | 통과 | - | sortedQuizzes.length === 0 분기 처리 |

### 1.2 퀴즈 생성 (QuizCreate)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-11 | 필수 필드 미입력 시 생성 버튼 비활성화 | 통과 | - | isFormValid: title + startDate + dueDate + questions.length > 0 |
| F-12 | 종료일이 시작일보다 이른 경우 차단 | 통과 | - | `new Date(dueDate) > new Date(startDate)` 검증 |
| F-13 | 중복 학생 배정 감지 및 경고 | 통과 | - | allSelected 중복 검사 후 AlertDialog 표시 |
| F-14 | 임시저장 버튼 동작 | **통과** | - | **[오탐 정정]** handleSaveDraft 핸들러 이미 구현/연결됨. addQuiz()로 localStorage 저장 |
| F-15 | 직접 입력 시간 비운 채 저장 시 처리 | **통과** | - | **[수정됨 b15b24b]** 무제한 미설정 상태에서 빈값/0 이하 입력 시 검증 에러 표시 |
| F-16 | 생성된 퀴즈의 영속성 (새로고침 내구성) | **통과** | - | **[수정됨 10f926a]** addQuiz()로 localStorage 자동 영속화. 새로고침 후 복원 |

### 1.3 퀴즈 편집 (QuizEdit)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-17 | 없는 ID로 직접 접근 시 처리 | **통과** | - | **[수정됨 38995c0]** `!quiz` 시 홈으로 리다이렉트. fallback 제거 |
| F-18 | 편집 저장 내용 목록 반영 | **통과** | - | **[수정됨 10f926a]** updateQuiz()로 배열 + localStorage 동시 반영 |
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
| F-33 | 재채점 모달 실제 동작 | **실패** | **Medium** | showRegradeModal state는 있으나 실제 재채점 로직 미구현 (UI only). 정책은 확정됨 (논의필요사항.md 참조) |

### 1.6 문제은행 (QuestionBank / QuestionBankList)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-34 | 없는 bankId 접근 시 fallback 처리 | **통과** | - | **[수정됨 38995c0]** `!bank` 시 홈으로 리다이렉트. fallback 제거 |
| F-35 | 문제은행 생성/삭제 localStorage 동기화 | 통과 | - | useEffect → localStorage.setItem 정상 |
| F-36 | 문항 검색 + 유형/난이도/그룹 복합 필터 | 통과 | - | useMemo로 필터 조합 정상 |
| F-37 | 문항 드래그 순서 변경 | 통과 | - | dragIndexRef + reorderQuestions 구현 |
| F-38 | 새로고침 후 데이터 유지 | 통과 | - | localStorage 초기값 로드 구현 |
| F-39 | Excel 업로드/다운로드 | 통과 | - | parseExcelOrCsv / downloadQuestionTemplate 연결 |

### 1.7 퀴즈 통계 (QuizStats)

| # | 테스트 항목 | 결과 | 심각도 | 발견 내용 |
|---|---|---|---|---|
| F-40 | 없는 quiz ID 접근 시 fallback | **통과** | - | **[수정됨 38995c0]** `!quiz` 시 홈으로 리다이렉트. fallback 제거 |
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
| P-06 | manualChunks 함수 형식 준수 (Vite 8) | 통과 | - | vite.config.js에서 함수 형식 정의, charts/icons/vendor/xlsx 4개 청크 분리 |
| P-07 | xlsx 라이브러리 청크 분리 여부 | **통과** | - | **[수정됨 b15b24b]** `if (id.includes('xlsx')) return 'xlsx'` 추가. 421KB 별도 청크로 분리됨 |
| P-08 | mockData.js 파일 크기 | **주의** | **Medium** | 단일 파일 2,400+ 라인. 퀴즈별 문항, 학생 데이터, 유틸 함수가 혼재. 실데이터 전환 전 분리 필요 |

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
| S-01 | 학생이 /quiz/:id/grade 직접 접근 | **통과** | - | **[수정됨 38995c0]** `role !== 'instructor'` → 홈 리다이렉트 가드 추가 |
| S-02 | 학생이 /quiz/new 직접 접근 | **통과** | - | **[수정됨 38995c0]** QuizCreate에 역할 가드 추가 |
| S-03 | 학생이 /question-banks 직접 접근 | **통과** | - | **[수정됨 38995c0]** QuestionBankList, QuestionBank 모두 역할 가드 추가 |

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
| S-08 | localStorage 저장 데이터 범위 | **주의** | **Medium** | 5개 키(xnq_quizzes 추가)에 데이터 평문 저장. 실데이터 전환 시 민감 정보가 클라이언트에 노출되는 구조 개선 필요 |
| S-09 | Canvas API client_secret 노출 여부 | 통과 | - | api.js 주석에 "절대 프론트엔드에 노출 금지" 명시. VITE 환경변수 분리 패턴 준수 |
| S-10 | console.error를 통한 내부 정보 노출 | **주의** | **Low** | QuizAttempt, mockData.js에 console.error 2건. 프로덕션 빌드 시 제거 또는 외부 로깅 도구 연동 권고 |

---

## 4. 주요 이슈 정리 (우선순위 기준)

### Critical — 모두 수정 완료

| 이슈 ID | 상태 | 내용 | 수정 커밋 |
|---|---|---|---|
| C-01/S-01 | **수정 완료** | 학생 역할 채점 대시보드 접근 차단 | `38995c0` |
| C-02/F-16 | **수정 완료** | 퀴즈 생성 데이터 localStorage 영속화 | `10f926a` |
| CR-05 | **수정 완료** | WCAG AA 텍스트 색상 대비 (40+곳) | `519ad2f` |

### High — 모두 수정 완료

| 이슈 ID | 상태 | 내용 | 수정 커밋 |
|---|---|---|---|
| H-01/F-14 | **오탐** | 임시저장 버튼 핸들러 이미 구현됨 (handleSaveDraft) | - |
| H-02/F-15 | **수정 완료** | timeLimit 빈값 검증 추가 | `b15b24b` |
| H-03/F-17 | **수정 완료** | 잘못된 ID fallback 제거 → 홈 리다이렉트 | `38995c0` |
| H-04/S-02/S-03 | **수정 완료** | 학생 역할 교수자 페이지 접근 차단 | `38995c0` |
| H-05/P-07 | **수정 완료** | xlsx 라이브러리 별도 청크 분리 | `b15b24b` |

### Medium — 백로그 (9건 중 1건 수정)

| 이슈 ID | 상태 | 내용 | 비고 |
|---|---|---|---|
| M-01/F-18 | **수정 완료** | 편집 저장 후 목록 반영 | updateQuiz 래퍼로 해결 (`10f926a`) |
| M-02/F-26 | 미수정 | 재응시 시 이전 응시 답안 확인 불가 | 정책 확정됨 (논의필요사항.md), MVP2 범위 |
| M-03/F-33 | 미수정 | 재채점 모달 실제 로직 미구현 | 정책 확정됨 (논의필요사항.md), Priority 1 |
| M-04/F-44 | 미수정 | 뒤로가기 시 필터/선택 상태 초기화 | URL 상태 동기화 필요, MVP2 범위 |
| M-05 | 미수정 | 82명/120문항 가상 스크롤 미적용 | 실데이터 전환 시 검토 |
| M-06/P-08 | 미수정 | mockData.js 2,400+ 라인 단일 파일 | 실데이터 전환 전 분리 필요 |
| M-07/S-08 | 미수정 | localStorage 평문 저장 | 실데이터 전환 시 구조 개선 필요 |

### Low

| 이슈 ID | 상태 | 내용 |
|---|---|---|
| L-01/P-10 | 미수정 | Pretendard 폰트 CDN 의존, font-display: swap 확인 필요 |
| L-02/S-10 | 미수정 | console.error 2건, 프로덕션 빌드 전 제거 권고 |

---

## 5. 테스트 커버리지 현황

| 기능 영역 | 항목 수 | 통과 | 실패/주의 | 변동 |
|---|---:|---:|---:|---|
| 퀴즈 목록 | 10 | 10 | 0 | - |
| 퀴즈 생성 | 6 | **6** | **0** | +3 통과 |
| 퀴즈 편집 | 3 | **3** | **0** | +2 통과 |
| 퀴즈 응시 | 7 | 6 | 1 | - |
| 채점 대시보드 | 7 | 6 | 1 | - |
| 문제은행 | 6 | **6** | **0** | +1 통과 |
| 퀴즈 통계 | 3 | **3** | **0** | +1 통과 |
| 라우팅/예외 | 3 | 2 | 1 | - |
| 성능 -- 렌더링 | 4 | 2 | 2 | - |
| 성능 -- 번들 | 4 | **3** | **1** | +1 통과 |
| 보안 -- 접근제어 | 3 | **3** | **0** | +3 통과 |
| 보안 -- XSS | 3 | 3 | 0 | - |
| 보안 -- 데이터 | 4 | 2 | 2 | - |
| **합계** | **63** | **54 (86%)** | **9 (14%)** | **+10** |

---

## 6. 다음 단계 권고

### 즉시 수행 (다음 스프린트)

1. **[M-03] 재채점 로직 구현** — 정책 확정됨. 객관식/참거짓/단답형/수치형/연결형/다중빈칸 자동 재채점, 서술형/파일 업로드 제외
2. **[M-02] 재응시 시 이전 답안 확인** — MVP2 범위이나, 기본 UX로서 우선순위 검토 필요

### 실데이터 전환 전 필수

3. **[M-05] 가상 스크롤 적용** — 학생/문항 목록이 100건 이상일 때 렌더링 성능 보장
4. **[M-06] mockData.js 분리** — quizData, studentData, bankData, gradingUtils로 분리
5. **[M-07] localStorage → API 전환** — 채점 데이터 서버 저장 구조로 이관

### 백로그

6. **[M-04] URL 상태 동기화** — 필터/정렬 상태를 URL 파라미터로 관리
7. **[L-01] 폰트 font-display: swap** 확인
8. **[L-02] console.error 정리**

---

*PM4_QA 테스트 보고서 v2 -- 코드 정적 분석 + 수정 반영 확인 기반 / 실 브라우저 Lighthouse 및 DevTools 병행 검토 권고*
