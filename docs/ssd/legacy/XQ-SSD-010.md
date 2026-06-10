# XQ-SSD-010. 부분 점수 정책 선택 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-010 의 부분 점수 정책을 퀴즈 기본 설정 + 문항 단위 변경 + 학생 결과 + 문의 대응 4 맥락에서 명세. 재계산 실행은 본 SSD 범위 외 (regrading 도메인 위임).

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-010-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-010](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076549642) v1.0 |
| 참조 FRD | XQ-FRD-010 |
| 참조 코드 | `src/components/QuizSettingsDialog.jsx` (복수 정답 문항 부분 점수 절), `src/components/AddQuestionModal.jsx` (multiple_answers 유형 - `overrideScoring`, `scoringMode`, `penaltyMethod`) |

---

## 1. 역할별 네비게이션 구조

```
교수자:
- 전역 기본값: 퀴즈 목록 톱니바퀴 → QuizSettingsDialog → "복수 정답 문항 부분 점수" 절
- 문항 단위 변경: 문항 작성/편집 (AddQuestionModal) 안의 multiple_answers 유형 → "이 문항만 다르게 설정" Toggle → scoringMode / penaltyMethod 선택

학생:
- 응시 결과 확인 맥락에서 적용 정책에 따른 점수 산정 인지 (현재 별도 카피 미명시, 간극)

TA / 운영자:
- 문의 대응 시 적용 정책 확인 (현재 권한 미분기, instructor 단독)
```

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-GLOBAL-PARTIAL-SCORING | 전역 부분 점수 기본값 (QuizSettingsDialog) | 퀴즈 목록 톱니바퀴 → "복수 정답 문항 부분 점수" 절 | 교수자 | UX-P07-001/002, UX-COM-001 | P0 |
| SCR-I-QFORM-PARTIAL-SCORING | 복수 선택 문항 단위 정책 변경 (AddQuestionModal) | multiple_answers 유형 작성/편집 | 교수자 | UX-P07-003/004/005, UX-COM-002/003 | P0 |
| SCR-L-RESULT-PARTIAL-SCORING | 학생 결과 - 부분 점수 산정 인지 | 응시 결과 확인 맥락 | 학생 | UX-P08-001~004 | P1 (현재 부분 충족, 간극) |

---

## 3. 화면별 상세 설계

### SCR-I-GLOBAL-PARTIAL-SCORING. 전역 부분 점수 기본값

**구현 파일**: `src/components/QuizSettingsDialog.jsx` 의 "복수 정답 문항 부분 점수" 절

**레이아웃**

```
[QuizSettingsDialog → SettingsSection "복수 정답 문항 부분 점수"]
  ├── 적용 여부 선택
  │    ├── all_correct: 미적용 (모든 정답을 맞혀야 만점, 그 외 0점)
  │    └── partial: 적용 (정답 비율에 따라 부분 점수)
  ├── partial 선택 시: 산정 방식 선택
  │    ├── none: 정답 비율만 반영 (오답 차감 없음)
  │    ├── right_minus_wrong: 정답 비율 + 오답 차감 (Canvas 표준)
  │    └── formula_scoring: 정답 비율 + 추측 보정 감점
  └── ScoringSimulation
       └── 선택한 산정 방식 기준 점수 계산 예시 (시각화)
```

**사용 컴포넌트**: `Dialog`, `SettingsSection` (내부), 선택 카드 (`active` 스타일), `ScoringSimulation` (내부 컴포넌트, 시각화).

**상태**

| **상태** | **표현** |
|---|---|
| 기본값 (저장 없음) | `multipleAnswersScoringMode='all_correct'`, `penaltyMethod='none'` (미적용) |
| 미적용 선택 | partial 영역 비노출. 모든 부분 정답 시 0점 |
| 적용 선택 | partial 산정 방식 3종 노출. ScoringSimulation 실시간 계산 |
| 변경 적용 범위 | 본 옵션은 기본값. 기존 문항의 채점 결과 변경 없음 (UX-COM-002) |

---

### SCR-I-QFORM-PARTIAL-SCORING. 복수 선택 문항 단위 정책 변경

**구현 파일**: `src/components/AddQuestionModal.jsx` 의 multiple_answers 유형 입력 영역

**레이아웃**

```
[AddQuestionModal - multiple_answers 유형 입력 영역]
  ├── 본문 / 배점 / 보기 N개 / 정답 인덱스 배열
  └── 부분 점수 정책 영역
       ├── "퀴즈 기본값 사용 (현재: ..)" 표시
       ├── "이 문항만 다르게 설정" Toggle (`overrideScoring`)
       └── Toggle ON 시
            ├── 적용 여부 (미적용 / 적용)
            └── 적용 시 산정 방식 (정답 비율만 / 오답 차감 / 추측 보정)
```

**사용 컴포넌트**: `Toggle`, 선택 카드 (활성/비활성), 안내 카피.

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | "이 문항만 다르게 설정" Toggle ON | `overrideScoring=true` + scoringMode / penaltyMethod 입력 영역 노출. 미선택 시 퀴즈 기본값 사용 (UX-P07-004) |
| I-2 | scoringMode 변경 | `scoringMode` 갱신. `all_correct` 선택 시 `penaltyMethod='none'` 강제 |
| I-3 | penaltyMethod 변경 | `penaltyMethod` 갱신 (partial 일 때만) |
| I-4 | 응시자 있음 + 정책 변경 후 저장 | 영향 안내 (UX-COM-002) → SSD-022 분기 (RegradeOptionsModal) |

**상태**

| **상태** | **표현** |
|---|---|
| 퀴즈 기본값 사용 (기본) | overrideScoring=false. 퀴즈 기본값 표시 + "기본값 사용 중" 안내 |
| 문항 단위 변경 활성 | overrideScoring=true. 선택 영역 노출 + 활성 강조 |
| 응시자 있음 + 변경 | 저장 시 RegradeOptionsModal 분기 (SSD-022 G-4 동일 케이스) |

---

### SCR-L-RESULT-PARTIAL-SCORING. 학생 결과 - 부분 점수 산정 인지

**현재 프로토타입 동작**

학생 결과 화면에서 부분 점수 산정 인지 카피는 **현재 부분 충족**. 문항 점수 (받은 점수 / 만점) 만 표시. 산정 방식 출처 ("일부 정답에 따른 점수" / "오답 차감으로 낮아진 점수") 별도 안내는 미구현 → "간극" 절 G-1.

**0점 하한**: 자동 채점 엔진에서 보장 (오답 차감 적용 시에도 0점 미만 미산정).

---

## 4. 반응형 분기

| **디바이스** | **변화** |
|---|---|
| 모바일 | 선택 카드 1열, ScoringSimulation 카드 너비 축소 |
| 태블릿 / 데스크톱 | 선택 카드 inline 또는 1열 (가독성 우선) |

---

## 5. 비정상 상태 UX

| **상태** | **현재 프로토타입 표현** |
|---|---|
| 적용 대상 유형 외 | 본 UX 비대상 (객관식 정답 다수 / 짝짓기 / 복수 빈칸 / 목록 선택 4유형 한정) |
| 응시자 있음 + 변경 | 저장 시 SSD-022 의 RegradeOptionsModal 분기 |
| 학생 측 산정 출처 안내 | 미명시 → 간극 G-1 |
| TA / 운영자 적용 정책 확인 | 미구현 → 간극 G-2 |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 학생 측 부분 점수 산정 출처 안내 (UX-P08-001/002) | (B) 후속 | 학생 결과 화면에 "일부 정답에 따른 점수" / "오답 차감으로 낮아진 점수" 카피 추가 필요. C 분류 후속 카피 작업 |
| G-2 | TA / 운영자 적용 정책 확인 (UX-P03-001, UX-P05-001) | (B) URD 완화 | **URD-010 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-3 | 4유형 동일 정책 구조 (UX-P07-006) | (A) 부분 충족 | **URD-010 v0.2 정정 완료** (2026-06-05) — "복수 선택만 문항 단위 변경, 나머지 3유형은 퀴즈 기본값" 명시 |
| G-4 | 0점 하한 보장 (UX-P08-004) | (A) 충족 | 자동 채점 엔진에서 보장 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-2/G-3 URD-010 정정 완료 반영 (v0.2/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
