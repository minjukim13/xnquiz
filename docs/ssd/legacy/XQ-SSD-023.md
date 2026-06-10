# XQ-SSD-023. 진행 중 응시 모니터링·이상 후보 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-023 의 UX 요건을 진행 중 응시 모니터링(`/quiz/:id/monitor`) 의 현재 프로토타입 기준으로 명세. 종료 후 통계는 XQ-SSD-026, 채점 시점 이벤트 타임라인 진입은 XQ-SSD-025 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-023-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-023](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5082218497) v1.0 |
| 참조 FRD | XQ-FRD-023 v0.2 |
| 참조 코드 | `src/pages/QuizMonitor.jsx`, `src/pages/GradingDashboard/ActivityLogPanel.jsx`, `src/utils/activityLog.js` |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈 → 퀴즈 목록 → 카드 → 퀴즈 상세 (QuizDetail) → "응시 모니터" 진입점 → /quiz/:id/monitor
                                                                          ├ 좌측: 학생 목록 + 필터 (전체/응시 중/미시작/제출 완료/이상 후보)
                                                                          └ 우측: 학생 상세 (ActivityLogPanel)

핵심 태스크 클릭 뎁스:
- 모니터링 진입: 퀴즈 목록 → 카드 클릭 → 응시 모니터 (3단계)
- 이상 후보 확인: 모니터 → 필터 "이상 후보" → 학생 선택 → 타임라인 (5단계)
```

**도달 원칙**

- 진입 권한은 instructor 단독. 학생/채점 권한 없는 사용자는 진입 차단 (`<Navigate to="/" replace />`).
- 자동 갱신 30초 주기 (REFRESH_INTERVAL_MS), 토글 가능 (`autoRefresh` state).
- 이상 후보 단서 기준: 화면 이탈 ≥ 3회 (FOCUS_LOSS_ANOMALY_THRESHOLD) / 마지막 활동 후 10분 무활동 (IDLE_ANOMALY_THRESHOLD_SEC). 단정이 아닌 단서로 표시 (UX-COM-002).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-MONITOR | 진행 중 응시 모니터 | `/quiz/:id/monitor` | 교수자 | UX-P07-001/002/003/004/010/020 | P0 |
| SCR-L-CONSENT-NOTICE | 학생 응시 전 수집 고지 영역 | 학생 응시 진입 전 (PreflightGate 동의 안내문 안) | 학생 | UX-STD-001/002/003 | P1 |

> SCR-L-CONSENT-NOTICE 는 SSD-021-B 의 PreflightGate 와 영역 공유. 본 SSD 는 응시 로그 수집 고지 카피 측면만 명세.

---

## 3. 화면별 상세 설계

### SCR-I-MONITOR. 진행 중 응시 모니터

**구현 파일**: `src/pages/QuizMonitor.jsx`

**목적**

진행 중 응시 현황(응시 중 / 미시작 / 제출 완료 / 이상 후보) 을 동일 흐름에서 인지하고, 학생별 이벤트 타임라인으로 진입해 응시 흐름 맥락을 확인.

**레이아웃**

```
[PageHeader] 시험명 + 응시 모니터링
[헤더 우측] 자동 갱신 Toggle + 마감까지 남은 시간 표시

[상단 통계 카드 영역]
  ├── 응시 중 (Users 아이콘 + 카운트)
  ├── 미시작 (Hourglass 아이콘 + 카운트, 마감 후엔 시간 만료 후 미제출 포함)
  ├── 제출 완료 (CheckCircle2 아이콘 + 카운트)
  └── 이상 후보 (AlertTriangle 아이콘 + 카운트, warning 색)

[필터 / 검색 행]
  ├── 좌측: DropdownSelect (전체 상태 / 응시 중 / 미시작 / 제출 완료 / 이상 후보)
  └── 우측: 검색 입력 (이름 / 학번)

[split-pane 본문]
  [좌측 aside: 학생 목록]
    └── 학생 카드 × N
         ├── 이름 + 학번
         ├── 상태 배지 (응시 중 / 미시작 / 제출 완료)
         ├── 경과 시간 표시 (응시 중인 경우, 분 단위)
         └── 이상 후보 단서 배지 (해당 시: "화면 이탈 N회" 또는 "10분 무활동")
  [우측 main: 학생 상세 (선택 시)]
    ├── 학생 기본 정보 (이름 + 학번 + 상태 + 시작 시각)
    ├── 이상 후보 단서 안내 (해당 시, warning 박스 + 단서 종류 + "추가 확인 단서" 카피)
    └── ActivityLogPanel
         ├── 이벤트 타임라인 (시간순)
         │    ├── 세션 시작
         │    ├── 문항 조회 / 답안 변경 / 플래그 / 페이지 이동
         │    ├── 화면 이탈 / 복귀
         │    └── 제출 / 자동 제출
         └── 이벤트 메타 (시각 + 종류 + 대상 문항 번호)
```

**사용 컴포넌트**

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `PageHeader` | `src/components/PageHeader.jsx` | 페이지 헤더 |
| `Card` | shadcn | 통계 카드 / 학생 카드 / 상세 영역 |
| `Button` | shadcn | 자동 갱신 토글 / 액션 |
| `DropdownSelect` | `src/components/DropdownSelect.jsx` | 상태 필터 |
| `Dialog` | shadcn | (필요 시 학생 상세 모달, 현재는 인라인) |
| `ActivityLogPanel` | `src/pages/GradingDashboard/ActivityLogPanel.jsx` | 이벤트 타임라인 (채점 대시보드와 공유) |
| Lucide icons | `Users` `Clock` `Hourglass` `AlertTriangle` `RefreshCw` `Search` `CheckCircle2` `Activity` `Info` `ShieldCheck` | 통계/상태 아이콘 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (`/quiz/:id/monitor`) | quiz / questions / students 로드. role 미충족 시 홈으로 리다이렉트 |
| I-2 | 자동 갱신 Toggle ON | 30초 주기로 `nowMs` 갱신 → 경과 시간 / 이상 후보 카운트 재계산 |
| I-3 | 자동 갱신 Toggle OFF | 갱신 중단. 수동 새로고침 버튼으로 강제 갱신 가능 |
| I-4 | 필터 변경 | 학생 목록 필터링. "이상 후보" 선택 시 anomaly 조건 충족 학생만 노출 |
| I-5 | 검색 입력 | 이름 / 학번 포함 검색 |
| I-6 | 학생 카드 클릭 | `selectedStudent` 갱신 → 우측 상세 패널 렌더 → ActivityLogPanel 로 이벤트 표시 |
| I-7 | 모니터 → 채점 진입 | (현재 별도 진입점 없음, QuizDetail 의 채점 진입 사용) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 응시 중 | startTime 있음 + submitted 없음 | "응시 중" 배지 + 경과 시간 |
| 미시작 | startTime 없음 + 마감 전 | "미시작" 배지 |
| 시간 만료 후 미제출 | startTime 없음 + 마감 경과 | "미시작" 배지 + 보조 안내 "시간 만료 후 미제출" |
| 제출 완료 | submitted 있음 | "제출 완료" 배지 |
| 이상 후보 단서 | activityLog 의 focusLoss ≥ 3 또는 idle ≥ 10분 | warning 배지 + 단서 종류 명시 ("추가 확인 단서", 단정 아님) |
| 권한 없음 | role !== 'instructor' | `<Navigate to="/" replace />` |

---

### SCR-L-CONSENT-NOTICE. 학생 응시 전 수집 고지 영역

**범위 분리**

학생 응시 전 수집 고지(UX-STD-001/002/003) 의 표시는 PreflightGate(SSD-021-B 본체) 의 동의 안내문 영역에서 노출. 본 SSD 는 카피 내용만 명세.

**현재 프로토타입 카피 (DEFAULT_CONSENT_TEXT)**

```
- 응시 중 화면, 웹캠 이미지, 시스템 활동 로그가 본 시험의 부정행위 검증 목적으로 기록됩니다.
- 수집된 정보는 시험 종료 후 6개월간 보관 후 안전하게 삭제됩니다.
- 응시 중 다른 응용프로그램 사용/외부 통신은 부정행위로 판단될 수 있습니다.
```

URD-023 의 UX-STD-001/002/003 (수집 항목 / 사용 목적 / 보존 기간 / 접근 권한 / 활용 범위) 중 보존(6개월) + 목적(부정행위 검증) 은 카피에 포함. 접근 권한 / 활용 범위 제한은 미포함 → "간극" 절 G-1.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **SCR-I-MONITOR** |
|---|---|---|
| 모바일 | ~767px | 통계 카드 2x2 그리드, split-pane 비활성, 학생 목록 / 상세 토글 |
| 태블릿 | 768~1023px | 통계 카드 4열, split-pane 비활성 또는 좁은 aside |
| 데스크톱 | 1024px~ | 통계 카드 4열, split-pane 활성 (aside w-80 + main flex-1) |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | 진입 직후 quiz fetch | mock 데이터 동기 로드, 별도 Skeleton 미구현 (mock 모드 한정) |
| 퀴즈 없음 | `mockQuizzes.find(...)` null | (별도 처리 미확인, QuizDetail 의 진입점에서 차단) |
| 응시자 0명 | quizStudents 0건 | 통계 카드 모두 0, 학생 목록 빈 상태 안내 필요 → 간극 G-2 (현재 빈 상태 카피 명시 부족) |
| 이상 후보 0명 | anomaly 조건 미충족 학생 0명 | "이상 후보" 카드 0 표시. 필터 "이상 후보" 선택 시 빈 목록 → 간극 G-2 |
| 권한 없음 (학생 직접 URL) | role !== 'instructor' | `<Navigate to="/" replace />` |
| 자동 갱신 중 fetch 실패 | (현재 mock 모드라 미적용) | API 모드 전환 시 fetch 실패 처리 필요 → 간극 G-3 |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 응시 로그 접근 권한 / 활용 범위 제한 카피 (UX-STD-003) | (B) URD 보강 | **URD-023 v0.4 정정 완료** (2026-06-05) — 법무 검토 의존 명시 (URD-021-B OQ-02) |
| G-2 | 응시자/이상 후보 0명 시 빈 상태 카피 명시 | (B) URD 완화 또는 (A) 소규모 추가 | 현재는 카운트 0 표시만. 빈 상태 안내 카피 추가는 C 분류 후속 카피 작업 |
| G-3 | API 모드 자동 갱신 시 fetch 실패 처리 | (B) 백로그 | mock 모드 기본 운영 중. API 모드 전환 시 별도 작업 |
| G-4 | 채점 권한 없는 사용자 접근 차단 UX (UX-COM-003) | (B) URD 완화 | **URD-023 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트(`manage_grades`) 차단 + 접근 불가 안내 동반으로 완화 |
| G-5 | 모니터 → 채점 진입 직접 링크 | (B) URD 완화 | **URD-023 v0.4 정정 완료** (2026-06-05) — UX-P07-021 표현을 "Screen Spec 영역" 으로 완화 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-1/G-4/G-5 URD-023 정정 완료 반영 (v0.4/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
