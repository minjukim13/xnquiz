# PM3 — 개발검토보고서

**검토자**: PM3 (시니어 개발자)
**초판**: 2026-04-07 / **업데이트**: 2026-04-16
**검토 대상**: 전체 소스 코드 정적 분석

---

## 요약

초판 Critical 1건(mockQuizzes 전역 변이), High 5건 중 3건 해결 완료. 디자인 시스템이 shadcn/radix 기반으로 전면 교체되어 컴포넌트 품질이 크게 개선됨. 잔존 이슈는 API 전환 준비 및 코드 분리 영역에 집중.

---

## 해결 완료 이슈

| 이슈 | 해결 방법 |
|------|----------|
| **[Critical]** mockQuizzes 전역 배열 직접 변이 | `10f926a`: addQuiz/updateQuiz/removeQuiz 래퍼 + `_persistQuizzes()` localStorage 영속화 |
| **[High]** xlsx 청크 미분리 (~200KB) | `b15b24b`: manualChunks에 xlsx 조건 추가, 421KB 별도 청크 분리 |
| **[High]** timeLimit 빈값 검증 없음 | `b15b24b`: 무제한 미설정 시 빈값/0 이하 입력 검증 추가 |
| **[High]** 버튼/Select/모달 파편화 | Toss 스타일 shadcn/radix UI 21개 컴포넌트로 통합 |
| **[Medium]** 재채점 로직 미구현 | `0138d85`: regradeQuestionWithOption 4개 옵션 + QuizEdit 연동 + 재채점 로그 구현 |

---

## 잔존 이슈

### High

| 항목 | 내용 |
|------|------|
| **GradingDashboard 단일 파일 과부하** | ~1,300줄. 문항/학생 모드, 엑셀/PDF/재채점 모달이 한 파일에 존재. 모달/패널 별도 컴포넌트 분리 필요 |
| **mockData.js 단일 파일 과부하** | 2,400+줄. 퀴즈/문항/학생/함수 혼재. 실데이터 전환 전 관심사별 분리 필요 |
| **localStorage JSON 역직렬화 무검증** | 5개 키에서 JSON.parse 후 타입/구조 검증 없이 바로 state에 사용. 변조 시 오염 가능 |

### Medium

| 항목 | 내용 |
|------|------|
| GradingDashboard 렌더링 비용 | gradeVersion 변경 시 `getLocalGrades()` (JSON.parse) 매번 호출. 채점 빈번 시 지연 가능 |
| QuestionBankContext 동기화 비용 | 120개 문항 전체를 매번 직렬화하여 localStorage에 저장. debounce 미적용 |
| autoGradeAnswer id 접두어 분기 | `question.id.startsWith('q2_')` 패턴으로 정답 맵 분기 -- 실데이터 전환 시 전면 재설계 필요 |
| 점수 입력 상한 검증 부재 | 엑셀 업로드 시 배점 초과 점수 입력해도 프론트에서 차단 안됨 |

---

## API 전환 체크리스트 (핵심만)

| 파일 | 전환 대상 |
|------|----------|
| `QuizList.jsx` | mockQuizzes → fetchQuizzes(courseId) |
| `QuizCreate.jsx` | addQuiz → createQuiz API |
| `GradingDashboard/` | localStorage 채점 → gradeSubmission API |
| `QuizAttempt.jsx` | saveStudentAttempt → submitAttempt API |
| `QuestionBankContext.jsx` | localStorage → Canvas QuestionBank API |

**선행 조건**: Vercel API Route(`/api/canvas/*`) 구현, OAuth 토큰 관리, courseId 다강좌 지원

---

## 빌드 현황

| 청크 | 라이브러리 | 상태 |
|------|-----------|------|
| `vendor` | react, react-dom, react-router-dom | 정상 |
| `charts` | recharts | 정상 |
| `icons` | lucide-react | 정상 |
| `xlsx` | xlsx | **신규 분리 완료** |
| 8개 페이지 | lazy loading | 정상 |

---

*초판 대비 Critical 1건 → 0건, High 5건 → 3건으로 개선됨. 잔존 이슈는 API 전환 전 준비 작업에 집중.*
