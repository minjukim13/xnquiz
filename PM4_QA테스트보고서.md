# PM4 QA 테스트 보고서

**검토자**: PM4 (QA 엔지니어)
**초판**: 2026-04-07 / **업데이트**: 2026-04-16
**검토 기준**: 코드 정적 분석 + 수정 커밋 반영 확인
**스택**: React 19 + Vite 8 + Tailwind CSS v4 + recharts + xlsx

---

## 요약

| 구분 | 항목 | 통과 | 실패 | 통과율 |
|---|---:|---:|---:|---:|
| **기능** | 45 | 40 | 5 | 89% |
| **성능** | 10 | 7 | 3 | 70% |
| **보안** | 10 | 8 | 2 | 80% |
| **전체** | **63** | **55** | **8** | **87%** |

> 초판 44/63 (70%) → **55/63 (87%)**, 11건 수정 완료

---

## 수정 이력

| 커밋 | 내용 |
|------|------|
| `38995c0` | 역할 기반 접근 제어 가드 6개 페이지 + 잘못된 ID fallback 제거 |
| `10f926a` | 퀴즈 데이터 localStorage 영속화 (addQuiz/updateQuiz/removeQuiz) |
| `519ad2f` | WCAG AA 텍스트 색상 대비 수정 (13개 파일, 40+곳) |
| `b15b24b` | xlsx 청크 분리 + timeLimit 빈값 검증 추가 |
| `0138d85` | 재채점 기능 구현 (regradeQuestionWithOption 4개 옵션) |
| `e507115` | 재채점 수정 |

---

## 추가 해결 이슈

| 이슈 | 해결 방법 |
|------|----------|
| **M-03** 재채점 모달 UI only, 로직 미구현 | `0138d85`, `e507115`: `regradeQuestionWithOption()` 4개 옵션(이전+신규 인정/신규 기준/만점/변경만) 구현. QuizEdit에서 정답 변경 시 RegradeOptionsModal 표시, 저장 시 일괄 재채점 수행, GradingDashboard에 재채점 로그 표시 |

---

## 미해결 이슈 (8건)

### Medium (6건)

| ID | 영역 | 내용 | 비고 |
|---|---|---|---|
| M-02 | 기능 | 재응시 시 이전 답안 확인 불가 | MVP2 범위 |
| M-04 | 기능 | 뒤로가기 시 필터/선택 상태 초기화 | URL 상태 동기화 필요 |
| M-05 | 성능 | 82명/120문항 가상 스크롤 미적용 | 실데이터 전환 시 검토 |
| M-06 | 성능 | mockData.js 2,400+줄 단일 파일 | 실데이터 전환 전 분리 |
| M-07 | 보안 | localStorage 5개 키 평문 저장 | 실데이터 전환 시 구조 개선 |
| P-02 | 성능 | GradingDashboard gradeVersion 변경 시 82명 전체 재계산 | React.memo/가상 스크롤 미적용 |

### Low (2건)

| ID | 영역 | 내용 |
|---|---|---|
| L-01 | 성능 | Pretendard 폰트 CDN 의존, font-display: swap 확인 필요 |
| L-02 | 보안 | console.error 2건, 프로덕션 빌드 전 제거 권고 |

---

## 다음 단계 권고

**실데이터 전환 전 필수**
1. [M-05] 가상 스크롤 적용 (100건+ 목록 대응)
2. [M-06] mockData.js 관심사별 분리
3. [M-07] localStorage → API 전환

---

## 회귀 테스트 시나리오 — 상태 배지 정확도 (2026-04-24 추가)

**배경**: dueDate 경과에도 DB `status='open'` 이 유지되어 목록/상세/채점 대시보드에 "진행중" 으로 잘못 표시되던 버그(`0a557bf`) 수정. 예약/지각/마감/재오픈 케이스가 향후 추가될 때마다 상태 배지가 다시 깨지기 쉬우므로 회귀 시나리오로 문서화.

**판정 규칙**
- DB `status` 는 유지, 표시만 전환 (`resolveDisplayStatus` 기반)
- `dueDate + gracePeriod` 경과 시 → `마감`
- 지각 제출 허용 + `lateSubmitDeadline` 지정 시 → 해당 시각까지 `진행중` 유지
- 지각 제출 허용 + `lateSubmitDeadline` 없음(무제한) → 영원히 `진행중`
- `startDate` 가 미래 + `status='open'` → `예정`

**시나리오 매트릭스**

| # | 케이스 | DB status | startDate | dueDate | allowLateSubmit | lateSubmitDeadline | 현재 시각 | 기대 배지 | 응시 버튼 |
|---|---|---|---|---|---|---|---|---|---|
| B-01 | 일반 진행중 | open | 과거 | 미래 | false | - | dueDate 이전 | 진행중 | 활성 |
| B-02 | 마감 경과 (지각 비허용) | open | 과거 | 과거 | false | - | dueDate + 1h | 마감 | 비활성 |
| B-03 | 마감 경과 (지각 허용, 기한 내) | open | 과거 | 과거 | true | 미래 | dueDate 이후 / lateDeadline 이전 | 진행중 | 활성 |
| B-04 | 마감 경과 (지각 허용, 기한 지남) | open | 과거 | 과거 | true | 과거 | lateDeadline + 1h | 마감 | 비활성 |
| B-05 | 마감 경과 (지각 허용, 무제한) | open | 과거 | 과거 | true | null | dueDate + 1d | 진행중 | 활성 |
| B-06 | 예약 발행 | open | 미래 | 미래 | false | - | startDate 이전 | 예정 | 비활성 (시작 안내) |
| B-07 | dueDate 없음 (상시) | open | 과거 | null | false | - | - | 진행중 | 활성 |
| B-08 | 임시저장 | draft | - | - | - | - | - | 임시저장 | 비활성 |
| B-09 | 교수자 수동 마감 | closed | - | - | - | - | - | 마감 | 비활성 |
| B-10 | 채점중(수동 전환) | grading | - | - | - | - | - | 진행중 (초록) | - |
| B-11 | 마감 후 dueDate 미래로 수정(재오픈) | open | 과거 | 미래 | false | - | dueDate 이전 | 진행중 | 활성 |

**검증 대상 화면**
- [QuizList.jsx](src/pages/QuizList.jsx) — 교수자 목록 카드 / 학생 목록 카드
- [QuizDetail.jsx](src/pages/QuizDetail.jsx) — 퀴즈 상세 헤더
- [GradingDashboard/QuizInfoCard.jsx](src/pages/GradingDashboard/QuizInfoCard.jsx) — 채점 대시보드 상단 카드
- (향후 추가 화면에서도 동일 규칙 재사용 — `resolveDisplayStatus` 헬퍼 참조)

**주의사항 (Known Limitations)**
- 현재 수정은 UI 레벨 표시만 전환. `GET /api/quizzes` 응답의 `status` 필드는 여전히 `open` 으로 반환됨
- Canvas LMS 외부 연동(AGS 점수 전송 등)에서는 "마감" 상태가 반영되지 않음 → LTI POC Stage 5 회귀 항목 "마감 퀴즈의 서버 status 반영" 에서 별도 처리 필요

---

*PM4 QA 테스트 보고서 v2 -- 코드 정적 분석 + 수정 반영 확인 기반*
