# XQ-SSD-011. 조건부 퀴즈 재응시 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-011 의 조건부 재응시 UX 를 ConditionalRetakeModal 의 현재 프로토타입 기준으로 명세. 추가 시도 부여 동작 본체와 응시 진입은 base FRD-024/025 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-011-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-011](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5078581261) v1.0 |
| 참조 FRD | XQ-FRD-011 |
| 참조 코드 | `src/components/ConditionalRetakeModal.jsx`, `src/pages/GradingDashboard/index.jsx` (진입점) |

---

## 1. 역할별 네비게이션 구조

```
교수자:
홈 → 퀴즈 목록 → 카드 메뉴 → "채점" → 채점 대시보드 → 액션 메뉴 → "조건부 재응시 부여" → ConditionalRetakeModal
                                                                                          ├ Step 1: 조건 입력 (미응시 / 점수 미달 / 점수 기준)
                                                                                          ├ Step 2: 자동 선별 결과 검토 + 제외 가능
                                                                                          └ Step 3: 횟수 / 기간 입력 + 확정

TA / 운영자:
- 자동 선별 대상자 목록 확인 (현재 권한 미분기, instructor 단독)

학생:
- 응시 화면에서 본인 재응시 기회 확인 (현재 기본 재응시 카운트만, 별도 안내 미구현)
```

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-CONDITIONAL-RETAKE | 조건부 재응시 모달 (3 step) | 채점 대시보드 액션 메뉴 | 교수자 | UX-P07-001~005/010~013/020~022, UX-P03-001~003 | P0 |
| SCR-L-RETAKE-INDICATOR | 학생 재응시 기회 확인 | 학생 응시 진입 또는 결과 화면 | 학생 | UX-P08-001~003 | P1 (부분 충족, 간극) |

---

## 3. 화면별 상세 설계

### SCR-I-CONDITIONAL-RETAKE. 조건부 재응시 모달 (3 step)

**구현 파일**: `src/components/ConditionalRetakeModal.jsx`

**레이아웃 (3 step)**

```
[Dialog (max-w-3xl)]
[DialogHeader]
  ├── DialogTitle "조건부 재응시 부여"
  └── DialogDescription "조건을 만족하는 학생들에게 자동으로 재응시 기회를 부여합니다"

[Step 1: 조건 입력]
  ├── 조건 종류 (Switch + 라벨)
  │    ├── "미응시 학생 포함" (Toggle: includeNotSubmitted)
  │    └── "점수 미달 학생 포함" (Toggle: includeScoreBelow)
  ├── 점수 미달 활성 시: 점수 기준 입력
  │    ├── % 입력 (scoreThreshold, 0~100)
  │    └── 환산 점수 표시 ("{thresholdScore}점 / 만점 {totalPoints}점")
  └── 다음 단계 버튼 (조건 1개 이상 선택 시 활성)

[Step 2: 자동 선별 결과 검토]
  ├── 요약 카드
  │    ├── 미응시 대상자 N명 (includeNotSubmitted 활성 시)
  │    ├── 점수 미달 대상자 M명 (includeScoreBelow 활성 시)
  │    └── 채점 미완료 영향 안내 (ungradedExcludedCount > 0 시 경고)
  ├── 학생 목록 (matchedStudents)
  │    ├── 이름 / 학번 / 선별 사유 (retakeReason)
  │    ├── 체크박스 (제외 토글, excludedIds Set)
  │    └── "제외" 표시 (체크된 항목)
  ├── 최종 대상자 카운트 (finalTargets.length)
  └── 이전 / 다음 단계 버튼

[Step 3: 횟수 / 기간 입력]
  ├── 추가 응시 횟수 입력 (additionalAttempts, 기본 1회)
  ├── 재응시 가능 기간 (retakeDeadline, DateTimePicker, 선택 - 미설정 시 기존 응시 기간 따름)
  ├── 최종 대상자 요약 (이름 N명 + 선별 사유 분포)
  └── 이전 / "재응시 부여" 버튼 (확정)

[부여 완료]
  ├── localStorage `xnq_conditional_retakes` 에 기록 저장
  └── Toast 또는 모달 닫힘 + onComplete 호출
```

**사용 컴포넌트**

| **컴포넌트** | **용도** |
|---|---|
| `Dialog` / `DialogHeader` / `DialogTitle` / `DialogDescription` | 모달 컨테이너 |
| `Switch` | 조건 종류 토글 |
| `Button` | step 이동 / 부여 확정 |
| `DateTimePicker` | 재응시 가능 기간 |
| 단계 인디케이터 (1 / 2 / 3) | 현재 step 표시 (UX-COM-003) |
| Lucide icons | `UserCheck` `ChevronRight` `ChevronLeft` `Check` |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | Step 1 조건 토글 | 미응시 / 점수 미달 / 두 조건 조합 결정 |
| I-2 | 점수 기준 입력 | thresholdScore 환산 표시 실시간 갱신 |
| I-3 | Step 2 학생 체크박스 | excludedIds Set 토글 (제외 / 포함) |
| I-4 | 채점 미완료 학생 있음 (ungradedExcludedCount > 0) | "채점 미완료 N명은 점수 미달 비교 대상에서 제외됨" 경고 |
| I-5 | Step 3 "재응시 부여" 확정 | finalTargets 에 대해 localStorage 기록 + 부여 완료 |
| I-6 | 이전 step 이동 | 입력값 보존 |

**상태**

| **상태** | **표현** |
|---|---|
| 조건 미선택 | 다음 단계 비활성. "조건을 1개 이상 선택해 주세요" 안내 |
| 점수 미달 + 기준 미입력 | scoreThreshold 기본값 60 사용 |
| 대상자 0명 | Step 2 빈 상태 ("조건에 맞는 학생이 없습니다") |
| 채점 미완료 영향 | Step 2 경고 박스 (UX-P07-011) |
| 기존 부여 학생 포함 | 재실행 시 기존 부여 영향 안내 미구현 → 간극 G-1 |
| 부여 완료 | localStorage 저장 + 모달 닫힘 |

---

### SCR-L-RETAKE-INDICATOR. 학생 재응시 기회 확인

**현재 프로토타입 동작**

학생 응시 화면에서 재응시 가능 횟수 표시는 기본 재응시 카운트(`allowAttempts`) 와 통합. 조건부 재응시 기회 별도 안내는 **부분 충족** (`xnq_conditional_retakes` 기록은 있으나 학생 측 명시적 UI 통합 미확인) → "간극" 절 G-2.

**목표 동작 (URD-011 UX-P08-001~003)**

```
[학생 응시 진입 또는 결과 확인 맥락]
  ├── 본인에게 부여된 재응시 기회 표시
  │    ├── 가능 횟수 N회
  │    └── 가능 기간 (~날짜)
  ├── 미부여 학생 → "본 시험 재응시 대상이 아닙니다" 안내
  ├── 기간 만료 → "재응시 기간이 종료되었습니다"
  └── 횟수 소진 → "재응시 횟수를 모두 사용했습니다"
```

---

## 4. 반응형 분기

| **디바이스** | **변화** |
|---|---|
| 모바일 | Dialog 전폭, step 인디케이터 상단 sticky, 학생 목록 1열 |
| 태블릿 / 데스크톱 | Dialog max-w-3xl, step 인디케이터 상단 inline, 학생 목록 1열 (가독성) |

---

## 5. 비정상 상태 UX

| **상태** | **현재 프로토타입 표현** |
|---|---|
| 조건 미선택 | "다음" 비활성 + 안내 카피 |
| 대상자 0명 | Step 2 빈 상태 안내 |
| 채점 미완료 학생 영향 | Step 2 경고 (UX-P07-011) |
| 기존 부여 학생 포함 재실행 | 영향 안내 미구현 → 간극 G-1 |
| 학생 측 재응시 안내 분기 (부여 / 미부여 / 기간 만료 / 횟수 소진) | 부분 충족 → 간극 G-2 |
| 운영자 부여 이력 확인 | 미구현 → 간극 G-3 |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 기존 부여 학생 재실행 영향 안내 (UX-P07-013) | (B) URD 완화 | **URD-011 v0.4 정정 완료** (2026-06-05) — "관련 안내 동반" 으로 완화 |
| G-2 | 학생 측 재응시 기회 명시 안내 (UX-P08-001~003) | (B) 후속 | localStorage 에 기록은 있으나 학생 응시 화면 명시 표시 미구현. C 분류 후속 카피 작업 |
| G-3 | 운영자 부여 이력 확인 (UX-P10-001/002) | (B) URD 완화 | **URD-011 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-4 | TA(P-03) 권한 분기 | (B) URD 완화 | **URD-011 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-5 | 부여 후 재응시 진입 시 성적 반영 기준 안내 (UX-COM-004) | (B) URD 완화 | **URD-011 v0.4 정정 완료** (2026-06-05) — "관련 안내 동반" 으로 완화 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-1/G-3/G-4/G-5 URD-011 정정 완료 반영 (v0.4/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
