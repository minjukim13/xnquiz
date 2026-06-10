# XQ-SSD-022. 재채점 일관성·응시자 있는 문항 수정 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-022 의 UX 요건을 RegradeOptionsModal (재채점 옵션 선택) 의 현재 프로토타입 기준으로 명세. 학생 측 결과 확인 본체는 SSD-025 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-022-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-022](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5079367688) v1.0 |
| 참조 FRD | XQ-FRD-022 |
| 참조 코드 | `src/components/RegradeOptionsModal.jsx`, `src/components/AddQuestionModal.jsx` (응시자 보유 시 분기), `src/pages/QuizEdit.jsx` (regradeMap state) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈 → 퀴즈 목록 → 카드 메뉴 → 편집 → 문항 추가 탭 → 문항 카드 Pencil
                                                       └ AddQuestionModal (수정 모드)
                                                              ├ 응시자 0명 + 정답 변경 → 즉시 반영
                                                              └ 응시자 1명 이상 + 정답 변경 → RegradeOptionsModal
                                                                     └ 4종 옵션 선택 → 옵션 저장 → 퀴즈 저장 시 일괄 재채점

핵심 태스크 클릭 뎁스:
- 응시자 있는 문항 정답 수정: 퀴즈 목록 → 카드 메뉴 → 편집 → 문항 추가 → Pencil → 수정 → 옵션 선택 (7단계)
```

**도달 원칙**

- 재채점 옵션 노출 조건: 발행된 퀴즈(`status !== 'draft'`) + 응시 1건 이상 + 정답/인정 답안 또는 채점 기준 변경 발생 (UX-P07-004).
- 응시자 0명이거나 정답 외 편집(본문/배점/피드백) 만인 경우 RegradeOptionsModal 미표시 (UX-P07-005).
- 옵션 선택 후 즉시 재채점 실행이 아니라 퀴즈 저장 시 일괄 처리 (mock 모드 한정). API 모드는 별도 엔드포인트 필요 (간극).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-REGRADE-OPTIONS | 재채점 옵션 선택 모달 | 응시자 있는 문항 정답 수정 후 "수정" 클릭 | 교수자 | UX-P07-001~005/010/011/020~022/030, UX-P09-001, UX-COM-001~006 | P0 |
| SCR-L-RESULT-REGRADED | 학생 결과 확인 (재채점 결과 인지) | 학생 결과 확인 맥락 | 학생 | UX-P08-001 (본체는 base FRD-022 / SSD-025) | P1 |

> SCR-L-RESULT-REGRADED 는 본 SSD 범위 외 (학생 결과 확인 화면 본체는 별도 SSD). 본 문서는 강사 측 옵션 선택 본체만 명세.

---

## 3. 화면별 상세 설계

### SCR-I-REGRADE-OPTIONS. 재채점 옵션 선택 모달

**구현 파일**: `src/components/RegradeOptionsModal.jsx`

**목적**

응시자가 있는 문항에서 정답/인정 답안 변경이 발생할 때, 교수자가 4종 재채점 옵션 중 하나를 선택. 응시자 수와 영향이 모달 상단에서 사전 인지됨 (UX-P07-010, UX-P07-020).

**레이아웃**

```
[Dialog (max-w-2xl)]
[DialogHeader]
  ├── DialogTitle "재채점 옵션 선택"
  └── DialogDescription "정답이 변경된 문항에 대해 재채점 방식을 선택하세요"

[Body]
  ├── 응시자 수 안내 박스 (bg-warning-bg/40 + border-warning-border)
  │    └── "이미 답안을 제출한 N명의 학생에 대한 재채점 옵션을 선택하십시오. 퀴즈 저장 시 일괄 재채점됩니다"
  └── 옵션 4종 (REGRADE_OPTIONS) - 라디오 버튼 카드
       ├── 1. 이전 정답과 수정된 정답 모두 인정 (award_both)
       │    ├── color: success
       │    └── desc: "기존 점수가 낮아지지 않습니다. 새 정답에 맞는 학생에게 추가 점수를 부여합니다"
       ├── 2. 수정된 정답 기준으로만 재채점 (new_answer_only)
       │    ├── color: warning
       │    └── desc: "새 정답 기준으로 자동 재채점됩니다. 일부 학생의 점수가 낮아질 수 있습니다"
       ├── 3. 모든 학생에게 만점 부여 (full_points)
       │    ├── color: primary
       │    └── desc: "이 문항에 응시한 학생 전원에게 만점을 부여합니다"
       └── 4. 재채점 없이 문제만 업데이트 (no_regrade)
            ├── color: secondary-foreground
            └── desc: "문제 내용만 변경하고 기존 채점 결과를 그대로 유지합니다"

[푸터]
  ├── 좌측: "이전" (ghost) → onCancel
  └── 우측: "옵션 적용" (default + 선택 옵션 색상) → onConfirm(selected)
```

**사용 컴포넌트**

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `Dialog` / `DialogHeader` / `DialogTitle` / `DialogDescription` | shadcn | 모달 컨테이너 |
| `Button` | shadcn | 이전 (ghost) / 옵션 적용 (default) |
| native `<button>` | — | 4종 옵션 카드 (라디오 형태, isActive border + bg) |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (AddQuestionModal 의 "수정" 클릭 + submittedCount > 0 + 정답 변경) | 모달 노출, 기본 선택 = `award_both` |
| I-2 | 옵션 카드 클릭 | `selected` state 갱신, isActive 시 border 색 + bg 변경 |
| I-3 | "이전" 클릭 / 외부 클릭 | `onCancel` 호출 → AddQuestionModal 로 복귀 (수정 내용 보존) |
| I-4 | "옵션 적용" 클릭 | `onConfirm(selected)` → 부모(QuizEdit) 의 `regradeMap[questionId] = { option: selected, oldQuestion }` 저장 → AddQuestionModal 닫힘 |
| I-5 | 퀴즈 저장 ("저장하기" 클릭) | regradeMap 의 각 항목별로 재채점 옵션에 따라 mock 데이터 점수 재계산 (`recalculateScorePolicy`, `regradeQuestion`) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 진입 시 기본 선택 | `award_both` | 첫 옵션에 activeBorder + bg 적용 |
| 옵션 변경 | 다른 카드 클릭 | 새 옵션에 activeBorder + bg, 이전 옵션 default 복귀 |
| 응시자 수 표시 | submittedCount prop | 상단 박스에 N명 강조 |
| 미진입 조건 | submittedCount === 0 또는 정답 미변경 | 모달 미노출, 수정 즉시 반영 |

---

### SCR-L-RESULT-REGRADED. 학생 결과 확인 (재채점 결과 인지)

**범위 분리**

학생 측 결과 확인 본체는 별도 SSD (학생 결과 확인 화면) 에서 다룸. 본 SSD 는 UX-P08-001 ("강사의 재채점 옵션 선택에 따른 결과임을 결과 확인 맥락에서 인지") 의 카피 측면만 명시.

**현재 프로토타입 동작**

학생 결과 화면 (QuizAttempt 결과 모드) 에서 재채점 결과의 출처 표시는 현재 별도 카피 없음 → "간극" 절 G-2.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **SCR-I-REGRADE-OPTIONS** |
|---|---|---|
| 모바일 | ~767px | Dialog 전폭, 옵션 카드 1열, 각 카드 padding 축소 |
| 태블릿 | 768~1023px | Dialog max-w-xl, 옵션 카드 1열 (가독성 우선) |
| 데스크톱 | 1024px~ | Dialog max-w-2xl, 옵션 카드 1열 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | (해당 없음) | 동기 렌더 |
| 응시자 0명 | submittedCount === 0 | 모달 미노출, AddQuestionModal 의 "수정" 클릭 즉시 반영 |
| 정답 미변경 | 본문/배점/피드백만 변경 | 모달 미노출 (UX-P07-005) |
| 재채점 실행 실패 | API 모드 미구현 | 현재 mock 모드 한정. API 모드 전환 시 별도 endpoint 필요 → 간극 G-1 |
| 부분 실패 인지 | (해당 없음) | 현재 미구현. base FRD-023 위임 → 간극 G-3 |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | API 모드 재채점 실행 | (B) 백로그 | mock 모드는 `recalculateScorePolicy` / `regradeQuestion` 으로 처리. API 모드는 서버 엔드포인트 미구현. base FRD-023 책임 |
| G-2 | 학생 결과 확인 화면의 "재채점 결과" 출처 카피 (UX-P08-001) | (B) URD 완화 또는 (A) 소규모 추가 | 현재 학생 결과 화면에 별도 카피 없음. 학생 결과 SSD 작성 시 결정 |
| G-3 | 재채점 부분 실패 인지 (UX-COM-006) | (B) URD 완화 | **URD-022 v0.5 정정 완료** (2026-06-05) — base FRD-023 위임 명시 |
| G-4 | 수정 전 영향 안내 단계 분리 (UX-P07-030, UX-COM-005) | (B) URD 완화 | **URD-022 v0.5 정정 완료** (2026-06-05) — "통합 다이얼로그 내 순서 구분" 으로 완화 |
| G-5 | 문제은행 그룹 출제 문항 재채점 (UX-P07-001) | (B) URD 완화 | **URD-022 v0.5 정정 완료** (2026-06-05) — "그룹 단위 일괄 재채점은 향후 작업" 명시 |
| G-6 | 빈칸채우기 / 복수빈칸 재채점 누락 부재 (UX-P07-002/003) | (A) 부분 충족 | 빈칸채우기 / 복수빈칸 문항도 정답 변경 시 RegradeOptionsModal 동일 분기됨. 누락 없음 — URD 요구사항 충족 |
| G-7 | 채점자(P-09) 권한 분기 | (B) URD 완화 | **URD-022 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-8 | 운영자(P-05) 운영 안내 일관성 | (B) URD 완화 | **URD-022 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-3/G-4/G-5/G-7/G-8 URD-022 정정 완료 반영 (v0.5/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
