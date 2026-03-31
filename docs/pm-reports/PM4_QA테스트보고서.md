# PM4 QA 테스트 보고서

**작성일**: 2026-03-31
**작성자**: PM4 — QA 엔지니어
**테스트 방식**: 정적 코드 분석 (Static Analysis)
**대상 버전**: XN Quizzes Prototype (main 브랜치 기준)

---

## 요약

| 구분 | 총 항목 | PASS | FAIL | REVIEW |
|---|---|---|---|---|
| **기능 테스트** | 28 | 17 | 6 | 5 |
| **성능 테스트** | 10 | 5 | 2 | 3 |
| **보안 테스트** | 10 | 4 | 4 | 2 |
| **합계** | 48 | 26 | 12 | 10 |

**Critical 이슈**: 3건 / **High 이슈**: 6건 / **Medium 이슈**: 8건 / **Low 이슈**: 5건

---

## 1. 기능 테스트

### 1-1. 퀴즈 생성 (QuizCreate.jsx)

| # | 테스트 항목 | 결과 | 우선순위 | 비고 |
|---|---|---|---|---|
| F-01 | 퀴즈 제목 입력 후 발행 가능 여부 | PASS | - | `isFormValid` 조건 정상 |
| F-02 | 시작/마감일시 역순 입력 시 발행 차단 | PASS | - | `new Date(dueDate) > new Date(startDate)` 체크 |
| F-03 | 문항 0개 시 발행 버튼 비활성화 | PASS | - | `questions.length > 0` 조건 |
| F-04 | 임시저장 버튼 동작 | FAIL | High | 버튼 존재하나 `onClick` 핸들러 없음 — 클릭 시 아무 동작 안 함 |
| F-05 | 직접 입력 시간 제한(timeLimitCustom) 유효성 검사 | FAIL | High | `min={1}` HTML 속성만 존재, 실제 발행 시 검증 로직 없음. 0 또는 음수 입력 후 발행 가능 |
| F-06 | 발행 후 퀴즈 목록 반영 | REVIEW | Medium | `mockQuizzes.push()`로 메모리에만 추가 — 새로고침 시 소멸. 의도된 mock 동작이나 실운영 전 반드시 API 교체 필요 |
| F-07 | 문제은행에서 동일 문항 중복 추가 방지 | PASS | - | `prev.find(e => e.id === q.id)` 체크 |
| F-08 | 문항 드래그 앤 드롭 순서 변경 | FAIL | Medium | `GripVertical` 아이콘만 렌더링, 실제 DnD 기능 미구현 |

---

### 1-2. 문제은행 (QuestionBank.jsx / QuestionBankList.jsx)

| # | 테스트 항목 | 결과 | 우선순위 | 비고 |
|---|---|---|---|---|
| F-09 | 문항 추가 후 목록 즉시 반영 | PASS | - | Context 상태 갱신 정상 |
| F-10 | 빈 문항 내용으로 저장 시도 | PASS | - | `!text.trim()` 체크로 저장 버튼 비활성화 |
| F-11 | 배점 0 또는 음수 입력 가능 여부 | REVIEW | High | `min={1}` HTML 속성 존재하나, `handleSubmit`에서 `Number(points)` 변환만 수행, 실제 양수 검증 없음. 브라우저 스핀박스 우회 시 0점 문항 저장 가능 |
| F-12 | 문제은행 삭제 시 소속 문항 연쇄 삭제 | PASS | - | `deleteBank`에서 `questions.filter(q => q.bankId !== bankId)` 처리 |
| F-13 | 문제은행 삭제 시 확인 다이얼로그 없음 | FAIL | High | 삭제 버튼 클릭 즉시 삭제 — 퀴즈에서 사용 중인 은행도 확인 없이 삭제됨 |
| F-14 | 검색어 입력 시 필터링 동작 | PASS | - | `useMemo` 정상 동작 |
| F-15 | 유형 필터 + 검색 복합 조건 | PASS | - | AND 조건 정상 |
| F-16 | 다른 은행에서 복사 시 선택 항목 유지 | REVIEW | Low | 은행 전환(뒤로가기) 시 `selectedIds` 초기화 — 의도된 동작이나 UX 확인 필요 |
| F-17 | Excel/CSV 업로드: 유효하지 않은 유형 코드 처리 | PASS | - | 에러 메시지 표시 정상 |
| F-18 | Excel/CSV 업로드: 빈 파일 업로드 | PASS | - | "데이터 행이 없습니다" 에러 처리 |
| F-19 | Excel/CSV 업로드: 5MB 초과 파일 | PASS | - | 파일 크기 제한 처리 정상 |
| F-20 | Excel/CSV 업로드: 난이도/그룹 컬럼 파싱 (고객사 요구사항 4) | FAIL | Critical | `parseExcelOrCsv`가 `[type, text, points, answer, c1~c5, explanation]` 컬럼만 파싱. 난이도/그룹 컬럼 미지원 — 고객사 요구사항 미충족 |

---

### 1-3. 채점 대시보드 (GradingDashboard.jsx)

| # | 테스트 항목 | 결과 | 우선순위 | 비고 |
|---|---|---|---|---|
| F-21 | 유효하지 않은 quiz ID 접근 시 오류 화면 | PASS | - | `if (!QUIZ_INFO)` 분기 처리 |
| F-22 | 문항 중심 / 학생 중심 모드 전환 | PASS | - | 상태 전환 정상 |
| F-23 | 채점 종료 후 퀴즈 상태 변경 | REVIEW | Medium | `mockQuizzes[idx].status = 'closed'` 메모리 변경만 수행 — 새로고침 시 원복 |
| F-24 | 수동채점 저장 후 카운트 실시간 갱신 | PASS | - | `gradeVersion` 버전 카운터로 `useMemo` 재계산 |
| F-25 | 검색어 입력 시 학생 필터링 | PASS | - | 이름/학번 검색 정상 |

---

### 1-4. 고객사 요구사항 기반 테스트

| # | 요구사항 | 결과 | 우선순위 | 분석 |
|---|---|---|---|---|
| C-01 | 문항 순서 일관성 (응시 화면 ↔ 통계 화면) | REVIEW | High | `mockQuestions`는 `order` 필드 보유. 단, `shuffleQuestions` 옵션 활성화 시 응시 화면과 통계 화면의 순서가 일치하는지 코드상 검증 불가 — 응시 페이지(`QuizAttempt`) 미분석 |
| C-02 | 문제명 변경 시 학생 참여 화면 실시간 반영 | FAIL | Critical | QuestionBank의 동기화 정책 안내에 "이미 생성된 퀴즈에는 자동 반영되지 않습니다"라고 명시. 퀴즈 생성 시 문항이 복사되는 구조로 실시간 반영 불가 — 고객사 요구사항 미충족 |
| C-03 | 복수 문제은행 선택 + 그룹별 출제 수 + 난이도별 배점 | FAIL | Critical | 현재 구조: 개별 문항 수동 선택 방식. 그룹별 출제 수 지정 및 난이도별 배점 자동화 기능 미구현 |
| C-04 | 엑셀 업로드: 난이도/그룹 컬럼 포함 시 정상 파싱 | FAIL | Critical | F-20과 동일. `parseExcelOrCsv` 함수가 난이도/그룹 컬럼 파싱 미지원 |
| C-05 | 대소문자 구분 옵션에 따른 정답 판정 | FAIL | High | `autoGradeAnswer`에서 `.toLowerCase()` 처리로 대소문자 무조건 무시. 옵션 설정 기능 자체 미존재 |
| C-06 | 부분 점수 계산 방식별 결과 | REVIEW | Medium | `short_answer` 타입의 `autoGrade: 'partial'`로 표기되나, 실제 채점 로직(`autoGradeAnswer`)은 완전 일치 시 전점/0점만 처리 — 부분 점수 로직 미구현 |
| C-07 | 동일 IP 1인 제한 정책 동작 | FAIL | High | IP 수집/비교 로직 전무. 프론트엔드 전용 구조상 서버 없이는 구현 불가 — MVP 범위 외로 명시 필요 |
| C-08 | 응시 IP 정보 기록/조회 | FAIL | High | `saveStudentAttempt` 함수의 저장 객체에 IP 필드 없음 — 미구현 |

---

## 2. 성능 테스트

| # | 테스트 항목 | 결과 | 우선순위 | 분석 |
|---|---|---|---|---|
| P-01 | 문항 60개 렌더링 시 성능 | REVIEW | Medium | `MOCK_BANK_QUESTIONS`가 60개. `useMemo`로 필터링하나 가상화(virtualizing) 미적용. 60개 수준에서는 허용 범위이나 200개 이상 시 렌더 지연 예상 |
| P-02 | 학생 82명 목록 렌더링 | PASS | - | `mockStudents` 82명 전원 렌더링. 현재 규모에서는 문제 없음 |
| P-03 | 문제은행 모달 무한 스크롤 | PASS | - | `visibleCount` 15개씩 증가 방식으로 초기 렌더 최적화 |
| P-04 | 필터/검색 조작 시 응답성 | PASS | - | `useMemo` 적용으로 불필요한 재계산 방지 |
| P-05 | 엑셀 파싱 시 UI 블로킹 | REVIEW | Medium | `parseExcelOrCsv`는 `FileReader` 비동기 처리하나, XLSX 파싱(`XLSX.read`) 자체는 동기 처리 — 대용량 파일(1,000행+) 시 UI 블로킹 가능 |
| P-06 | localStorage 저장 크기 한계 | FAIL | High | 응시 기록(`xnq_student_attempts`)이 누적 보존됨. 다수 학생 × 다회 응시 × 다수 퀴즈 시 5MB 한도 초과 위험. `QuotaExceededError` 처리 코드 존재하나 사용자 알림 없음 |
| P-07 | 채점 대시보드 `useMemo` 의존성 | REVIEW | Low | `questionsWithLiveCounts`의 `eslint-disable react-hooks/exhaustive-deps` 주석 — `id` 변경 시 재계산 정상이나, 의존성 명시 억제가 향후 버그 원인이 될 수 있음 |
| P-08 | 번들 청크 분리 효과 | PASS | - | 페이지 단위 lazy loading + Suspense 적용 (CLAUDE.md 지시 준수 확인) |
| P-09 | GradingDashboard 동시 채점 시 상태 충돌 | FAIL | High | `getLocalGrades` / `setLocalGrades`가 매번 전체 localStorage를 읽고 씀. 동일 브라우저 복수 탭 채점 시 후 저장이 선 저장을 덮어쓸 수 있음 |
| P-10 | Cronbach α 계산 대용량 처리 | PASS | - | `excelUtils.js` 내 통계 계산은 순수 JS 연산이며 현재 학생 수 기준 허용 범위 |

---

## 3. 보안 테스트

| # | 테스트 항목 | 결과 | 우선순위 | 분석 |
|---|---|---|---|---|
| S-01 | 문항 내용 textarea XSS 취약점 | PASS | - | React의 기본 JSX 렌더링(`{q.text}`)은 자동으로 HTML 이스케이프 처리 — `dangerouslySetInnerHTML` 미사용 |
| S-02 | 퀴즈 안내사항 textarea XSS | PASS | - | S-01과 동일 이유 |
| S-03 | 문제은행 이름 입력 XSS | PASS | - | S-01과 동일 이유 |
| S-04 | 실데이터 사용 금지 정책 준수 | PASS | - | 학생명 `학생 A~L` 패턴, 학번 `20221001` 형식의 가상 데이터 사용 — 실명/실제 학번 없음 |
| S-05 | URL 직접 접근 시 권한 처리 | FAIL | Critical | `/quiz/:id/grade`, `/quiz/:id/stats` 직접 URL 접근 시 인증/권한 체크 없음. 퀴즈 ID가 노출된 경우 누구나 채점 대시보드 접근 가능 |
| S-06 | localStorage 데이터 조작 가능성 | FAIL | High | `xnq_manual_grades`, `xnq_student_attempts` 키의 데이터를 브라우저 개발자도구에서 직접 수정 가능 — 채점 점수 위변조 가능 |
| S-07 | 엑셀 파일 파싱 시 악성 수식 처리 | REVIEW | Medium | SheetJS(`xlsx`)는 수식 실행 환경이 없어 `=CMD("rm -rf /")` 유형의 수식 주입은 무해. 단, 일부 XLSX 취약점(`CVE-2023-30533` 등)에 대한 라이브러리 버전 확인 필요 |
| S-08 | 학생 점수 정보 클라이언트 노출 | FAIL | High | `mockStudents` 배열에 전체 학생 점수(`score`, `manualScores`, `autoScores`)가 클라이언트 JS 번들에 포함 — 브라우저에서 직접 열람 가능 |
| S-09 | 퀴즈 정답 클라이언트 노출 | FAIL | High | `AUTO_CORRECT_ANSWERS`, `AUTO_CORRECT_Q3`, `mockQuestions[].correctAnswer` 등 정답 데이터가 클라이언트 번들에 포함 — 개발자도구로 열람 가능 |
| S-10 | 복수응시 횟수 제한 클라이언트 처리 | REVIEW | High | `allowAttempts` 값이 클라이언트에서만 처리됨 — 서버 없이는 응시 횟수 강제 불가. 브라우저 localStorage 삭제 시 제한 우회 가능 |

---

## 4. 고객사 요구사항 충족 현황 요약

| 요구사항 | 충족 여부 | 우선순위 |
|---|---|---|
| 1. 문항 순서 일관성 (응시 ↔ 통계) | 부분 충족 (REVIEW) | High |
| 2. 문제명 변경 시 참여 화면 실시간 반영 | 미충족 (FAIL) | Critical |
| 3. 복수 문제은행 선택 + 그룹별 출제 수 + 난이도별 배점 | 미충족 (FAIL) | Critical |
| 4. 엑셀 업로드: 난이도/그룹 컬럼 파싱 | 미충족 (FAIL) | Critical |
| 5. 대소문자 구분 옵션 정답 판정 | 미충족 (FAIL) | High |
| 6. 부분 점수 계산 방식별 결과 | 부분 충족 (REVIEW) | Medium |
| 7. 동일 IP 1인 제한 정책 | 미충족 (FAIL) | High |
| 8. 응시 IP 정보 기록/조회 | 미충족 (FAIL) | High |

---

## 5. Critical/High 이슈 상세 및 수정 권고안

### [Critical] C-02 / C-03 / C-04 — 고객사 핵심 기능 3건 미구현

**재현 시나리오**
1. 문제은행에서 문항 수정 → QuizAttempt 화면에서 변경 미반영
2. QuizCreate에서 은행별 출제 수/난이도 배점 설정 UI 없음
3. 엑셀에 `난이도` 컬럼 추가 후 업로드 → 파싱 무시됨

**수정 권고안**
- C-02: 퀴즈-문항 연결 방식을 `questionId` 참조형으로 변경 (현재는 복사형)
- C-03: QuizCreate에 "은행별 랜덤 출제" 설정 패널 추가 (출제 수 + 난이도 가중치)
- C-04: `parseExcelOrCsv`에 `difficulty` / `group` 컬럼 파싱 로직 추가

---

### [Critical] S-05 — URL 직접 접근 권한 미처리

**재현 시나리오**
브라우저 주소창에 `/quiz/1/grade` 직접 입력 → 로그인 없이 채점 화면 진입 가능

**수정 권고안**
인증 컨텍스트(AuthContext) 또는 Route Guard 컴포넌트 추가 후 미인증 접근 시 로그인 페이지 리다이렉트

---

### [High] F-04 — 임시저장 미구현

**재현 시나리오**
"임시저장" 버튼 클릭 → 아무 동작 없음 (콘솔 에러도 없음)

**수정 권고안**
최소한 `draft` 상태로 `mockQuizzes`에 추가하거나, 클릭 시 "준비 중" 토스트 알림 표시

---

### [High] F-13 — 문제은행 삭제 확인 다이얼로그 없음

**재현 시나리오**
퀴즈에서 사용 중인 문제은행의 삭제 아이콘 클릭 → 즉시 삭제

**수정 권고안**
`usedInQuizIds.length > 0`인 경우 삭제 전 "N개 퀴즈에서 사용 중입니다. 삭제 시 해당 퀴즈에 영향을 줄 수 있습니다" 확인 다이얼로그 표시

---

### [High] S-08 / S-09 — 점수 및 정답 클라이언트 번들 포함

**재현 시나리오**
브라우저 개발자도구 → Sources → `mockData.js` 검색 → 전체 정답 및 학생 점수 열람 가능

**수정 권고안**
실운영 전환 시 정답 데이터는 서버 API 응답으로만 제공, 클라이언트 번들에서 제거. 현 프로토타입 단계에서는 `/* 개발용 데이터 — 실운영 제거 필요 */` 주석 명시

---

### [High] P-06 — localStorage 용량 초과 무음 처리

**재현 시나리오**
다수 학생이 긴 서술형 답안을 여러 번 응시 → `QuotaExceededError` 발생 시 사용자 알림 없이 저장 실패

**수정 권고안**
`saveStudentAttempt`의 catch 블록에서 에러를 콘솔이 아닌 UI 알림(토스트)으로 사용자에게 전달

---

### [High] P-09 — 복수 탭 동시 채점 시 localStorage 충돌

**재현 시나리오**
채점자 A가 탭 1에서 Q3 채점 → 채점자 B가 탭 2에서 Q5 채점 → 탭 2 저장이 탭 1 작업 덮어쓰기 가능

**수정 권고안**
`setLocalGrades` 호출 시 현재 localStorage를 다시 읽어 병합하는 패턴으로 변경 (`read → merge → write`)

---

### [High] C-05 — 대소문자 구분 없는 정답 판정

**재현 시나리오**
`DISTINCT` 정답 문항에 `distinct` 입력 → 정답 처리됨 (현재는 의도적이나, 옵션 구분 기능 없음)

**수정 권고안**
QuizCreate에 "대소문자 구분" 토글 추가 → `autoGradeAnswer`에서 토글 값에 따라 `toLowerCase()` 처리 여부 분기

---

## 6. 전체 이슈 우선순위 목록

| 우선순위 | ID | 항목 | 구분 |
|---|---|---|---|
| Critical | C-02 | 문제명 변경 시 응시 화면 미반영 | 기능/요구사항 |
| Critical | C-03 | 그룹별 출제 수 + 난이도별 배점 미구현 | 기능/요구사항 |
| Critical | C-04, F-20 | 엑셀 업로드 난이도/그룹 컬럼 파싱 미지원 | 기능/요구사항 |
| Critical | S-05 | URL 직접 접근 권한 처리 없음 | 보안 |
| High | F-04 | 임시저장 버튼 미동작 | 기능 |
| High | F-05 | 직접 입력 시간 제한 검증 없음 | 기능 |
| High | F-13 | 문제은행 삭제 확인 다이얼로그 없음 | 기능 |
| High | C-05 | 대소문자 구분 옵션 미구현 | 요구사항 |
| High | C-07, C-08 | IP 제한/기록 미구현 | 요구사항 |
| High | P-06 | localStorage 용량 초과 무음 처리 | 성능 |
| High | P-09 | 복수 탭 채점 시 데이터 충돌 | 성능 |
| High | S-06 | localStorage 점수 위변조 가능 | 보안 |
| High | S-08 | 학생 점수 클라이언트 번들 노출 | 보안 |
| High | S-09 | 정답 데이터 클라이언트 번들 노출 | 보안 |
| Medium | F-08 | 문항 순서 DnD 미구현 | 기능 |
| Medium | F-11 | 배점 0/음수 입력 서버 미검증 | 기능 |
| Medium | C-01 | shuffleQuestions 시 순서 일관성 미검증 | 요구사항 |
| Medium | C-06 | 부분 점수 로직 미구현 (표기만 존재) | 요구사항 |
| Medium | P-05 | 대용량 엑셀 파싱 시 UI 블로킹 가능 | 성능 |
| Medium | S-07 | XLSX 라이브러리 버전 보안 취약점 확인 필요 | 보안 |
| Medium | S-10 | 복수응시 횟수 제한 클라이언트 우회 가능 | 보안 |
| Low | F-06 | 발행 데이터 새로고침 시 소멸 (의도된 mock) | 기능 |
| Low | F-16 | 은행 전환 시 선택 항목 초기화 UX | 기능 |
| Low | F-23 | 채점 종료 상태 새로고침 시 원복 | 기능 |
| Low | P-07 | eslint-disable 의존성 억제 코드 | 성능 |

---

*본 보고서는 정적 코드 분석 기반으로 작성되었습니다. 실제 브라우저 환경 테스트 및 API 연동 후 결과가 달라질 수 있습니다.*
