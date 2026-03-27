# XN Quizzes Prototype — 전체 작업 정리

작성일: 2026-03-25
프로젝트 경로: `C:\Users\김민주\Desktop\프로젝트\ai퀴즈\xn-quiz-prototype`

---

## 1. 프로젝트 개요

**목적**: LMS(LearningX) 내 퀴즈 기능의 교수자용 관리 화면 프로토타입 제작

**주요 사용자**: 교수자(퀴즈 생성/편집/채점), 조교(채점 보조), 학습자(응시, MVP2 이후)

**기술 스택**

| 항목 | 내용 |
|---|---|
| **프레임워크** | React 19 + Vite 8 (rolldown 기반) |
| **스타일** | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **라우팅** | react-router-dom |
| **차트** | recharts |
| **폰트** | Pretendard (CDN) |
| **데이터** | mockData.js (ES Module, 배열 직접 뮤테이션) |
| **퍼시스턴스** | localStorage (채점 점수) |

---

## 2. 구현된 페이지 및 라우트

| 라우트 | 페이지 | 설명 |
|---|---|---|
| `/` | QuizList | 퀴즈 목록, 상태 배지, 필터/검색 |
| `/quiz/new` | QuizCreate | 퀴즈 생성 + 문항 추가/문제은행 불러오기 + 발행 |
| `/quiz/:id/edit` | QuizEdit | URL id 기반 퀴즈 조회 + 편집 + 저장 |
| `/quiz/:id/grade` | GradingDashboard | 문항별/학생별 채점, 점수 저장, 통계 |
| `/quiz/:id/stats` | QuizStats | 점수 분포, 문항별 정답률, 응시 통계 |
| `/question-bank` | QuestionBank | 문제은행 목록/필터 |

**공통 컴포넌트**
- `Layout.jsx`: 사이드바 + 헤더 래퍼
- `CustomSelect.jsx`: 커스텀 드롭다운

---

## 3. 커밋 이력 (최신순)

| 커밋 해시 | 메시지 | 주요 내용 |
|---|---|---|
| `3d753da` | fix: 채점 저장 시 총점 재계산 및 localStorage 키 퀴즈ID 포함 | student.score 자동 재계산, 키 형식 변경 |
| `5e68cec` | feat: PM 에이전트 검토 보고서 추가 및 Critical 이슈 수정 | 보고서 6개 생성, published 폐기, 발행/편집/채점 저장 구현 |
| `2c6984c` | fix: GradingDashboard quiz ID 동적 처리 및 재채점 정책 안내 추가 | quizId props 체인 구성 |
| `d592945` | fix: mockData 점수 체계 정합화 및 응시시간 데이터 보완 | autoScores/manualScores 구조 정비 |
| `737e27d` | feat: 퀴즈 통계 독립 페이지 신규 구현 및 네비게이션 연결 | QuizStats 페이지 신규 |
| `a5912f9` | feat: 퀴즈 생성/편집, 문제은행 페이지 및 공통 UI 초기 구현 | QuizCreate/Edit/QuestionBank 초기 구현 |
| `abda134` | feat: XN Quizzes 채점 대시보드 프로토타입 초기 구현 | GradingDashboard 초기 구현 |

---

## 4. 데이터 모델

### 퀴즈 (`mockQuizzes`)

```js
{
  id: String,
  title: String,
  course: String,           // 예: 'CS301 데이터베이스'
  status: 'draft' | 'open' | 'grading' | 'closed',  // published 필드 폐기, status 단일 SSOT
  startDate: String,        // 'YYYY-MM-DD HH:mm'
  dueDate: String,
  week: Number,
  session: Number,
  totalStudents: Number,
  submitted: Number,
  graded: Number,
  pendingGrade: Number,
  questions: Number,
  totalPoints: Number,
  timeLimit: Number,        // 분 단위
}
```

### 학생 (`mockStudents`)

```js
{
  id: String,
  name: String,             // 익명 처리: '학생 A' ~ '학생 L'
  studentId: String,        // 익명 처리: 예) 'STU-001'
  score: Number,            // 총점 (autoTotal + manualTotal 자동 재계산)
  submittedAt: String,
  timeSpent: Number,        // 분 단위
  answers: { [questionId]: String | String[] },
  autoScores: { [questionId]: Number },
  manualScores: { [questionId]: Number },
}
```

### 문항 유형 (`QUIZ_TYPES`)

| 유형 | label | autoGrade |
|---|---|---|
| multiple_choice | 객관식 | true |
| true_false | 참/거짓 | true |
| multiple_answers | 복수 선택 | true |
| short_answer | 단답형 | 'partial' (MVP2: AI 채점 제안) |
| essay | 서술형 | false |
| numerical | 수치형 | true |
| matching | 연결하기 | true |
| fill_in_blank | 빈칸 채우기 | true |
| fill_in_multiple_blanks | 다중 빈칸 채우기 | true |
| multiple_dropdowns | 드롭다운 선택 | true |
| ordering | 순서 배열 | true |
| file_upload | 파일 첨부 | false |

---

## 5. 주요 정책 결정 사항

| 항목 | 결정 내용 |
|---|---|
| **퀴즈 상태** | `status` 단일 필드 (`draft / open / grading / closed`), `published` 필드 폐기 |
| **채점 저장** | 수동 저장 방식 (저장 버튼 클릭) + localStorage 퍼시스턴스 |
| **localStorage 키** | `{quizId}_{studentId}_{questionId}` 형식으로 퀴즈 간 충돌 방지 |
| **총점 재계산** | 저장 시 `autoTotal + manualTotal` 자동 합산 → `student.score` 업데이트 |
| **강좌 연결** | MVP 제외. 현재 퀴즈는 과목과 독립적으로 생성 (`course` 필드 하드코딩 유지) |
| **short_answer** | MVP1에서는 수동 채점 대상. MVP2에서 AI 채점 제안 워크플로우로 구현 예정 |
| **문제은행 연결** | 복사본(Snapshot) 방식 — 원본 수정이 기출 퀴즈에 영향 없음 |
| **미제출 학생** | "결시" 상태로 별도 처리 (0점 자동 부여 없음) |
| **재응시** | 정책 미확정 (MVP2 논의 예정) |
| **지각 제출** | 정책 미확정 (MVP2 논의 예정) |

---

## 6. PM 에이전트 검토 결과 요약

PM1~PM5 + Leader 총 6개 보고서 생성 완료. 파일 위치: 프로젝트 루트

### Critical 이슈 수정 완료 목록

| 이슈 | 수정 내용 | 파일 |
|---|---|---|
| 채점 저장 미구현 | localStorage 저장 + manualScores 뮤테이션 + 총점 재계산 | GradingDashboard.jsx |
| 발행 저장 로직 없음 | `mockQuizzes.push()` 후 navigate | QuizCreate.jsx |
| 편집 URL :id 무시 | `mockQuizzes.find(q => q.id === id)` 연결 | QuizEdit.jsx |
| published/status 이중 관리 | `published` 필드 완전 폐기 | mockData.js, QuizList.jsx |

### 미수정 주요 이슈 (다음 스프린트 권고)

| 우선순위 | 이슈 | 대상 파일 |
|---|---|---|
| High | AddQuestionModal / QUESTION_BANK / LIGHT_COLORS 다중 파일 중복 | QuizCreate.jsx, QuizEdit.jsx |
| High | 인증/인가 Guard 미구현 (전 라우트 무방비) | App.jsx |
| High | 문제은행 편집/삭제 버튼 핸들러 없음 | QuestionBank.jsx |
| Medium | 대규모 목록 가상화 미적용 (82명 전체 렌더) | GradingDashboard.jsx |
| Medium | 접근성 위반: aria-label 누락, focus-visible 미적용 | 전체 |
| Medium | 태블릿(768px) 레이아웃 대응 미흡 | 전체 |

---

## 7. MVP 로드맵

### MVP1 (현재 — 교수자 관리 화면 완성)

- [x] 퀴즈 목록/상태 표시
- [x] 퀴즈 생성 + 문항 추가 + 발행
- [x] 퀴즈 편집 (URL id 연동)
- [x] 채점 대시보드 (문항별/학생별, 저장)
- [x] 채점 결과 총점 자동 재계산
- [x] 퀴즈 통계 페이지
- [x] 문제은행 목록
- [ ] 컴포넌트 중복 정리 (AddQuestionModal, QUESTION_BANK, LIGHT_COLORS)
- [ ] 문제은행 CRUD 핸들러 연결

### MVP2 (다음 스프린트 — 학습자 + 정책 완성)

- 학습자 응시 화면 (타이머, 문항 네비게이션)
- 퀴즈 상태 자동 전이 (open → grading → closed)
- 재응시/지각 제출 정책 결정 및 구현
- short_answer AI 채점 제안 워크플로우
- 알림 시스템 (마감 임박, 채점 완료, 점수 공개)
- 권한 설계 (교수자/조교/학습자 역할 분리)

### MVP3 (중장기)

- 강좌-퀴즈 연결 (특정 강의 시청 후 퀴즈 연계)
- 실데이터 API 연동
- 성능 최적화 (가상화, 스켈레톤)
- 접근성 WCAG AA 완전 준수

---

## 8. 환경 설정 메모

### Figma MCP

전역 설정 파일(`C:\Users\김민주\.claude\settings.json`)에 이미 구성됨.

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key", "figd_LLIx588CeJ5BOQeD7E8batsj4KB0BP_U3L5I4EfX", "--stdio"]
    }
  }
}
```

Claude Code 재시작 후 `/mcp` 명령어로 연결 상태 확인. Windows에서 npx 인식 오류 시:

```json
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "figma-developer-mcp", "--figma-api-key", "figd_LLIx588CeJ5BOQeD7E8batsj4KB0BP_U3L5I4EfX", "--stdio"]
}
```

### Vite 빌드 주의사항

- `manualChunks`는 반드시 **함수 형식**으로 작성 (object 형식 불가, rolldown 기반)
- `@apply`는 `@layer utilities` 안에서만 사용 (Tailwind v4)

---

## 9. 생성된 산출물 파일 목록

| 파일 | 설명 |
|---|---|
| `PM1_디자인검토보고서.md` | UI/UX 이슈 26건 (Critical 4) |
| `PM2_기획검토보고서.md` | 시나리오/정책 이슈, 예외 케이스 |
| `PM3_개발검토보고서.md` | 성능/코드 품질/API 전환 체크리스트 |
| `PM4_QA테스트보고서.md` | 기능/성능/보안 테스트 28건 (Critical 3) |
| `PM5_PO스펙보고서.md` | AC 20개, 우선순위 매트릭스, KPI |
| `XN_Quizzes_종합검토보고서.md` | 통합 이슈 55건, 완성도 5.2/10, 스프린트 권고 |
| `XN_Quizzes_작업정리.md` | 본 문서 |
