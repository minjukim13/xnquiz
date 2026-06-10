# SCR-05. 퀴즈 기본값 설정 다이얼로그 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: QuizSettingsDialog (퀴즈 목록 톱니바퀴 진입) 의 코스 단위 기본값 설정. 문항 단위 오버라이드(부분 점수 / 정답 판정) 는 SCR-03 위임. 학생 결과 카피는 SCR-09 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-05-v1.1 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-005](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076615169) v1.0 (전역 부분), [XQ-URD-010](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076549642) v1.0 (전역 부분) |
| 참조 코드 | `src/components/QuizSettingsDialog.jsx` (정답 판정 절 + 복수 정답 문항 부분 점수 절 + 기타) |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
시험 목록(SCR-01) 헤더 → 톱니바퀴 → QuizSettingsDialog (모달)
                                       ├── 정답 판정 절 (입력형 문항 4종 토글)
                                       ├── 복수 정답 문항 부분 점수 절
                                       └── (기타: 응시 보안, 시간, 기본값 등)

핵심 태스크 클릭 뎁스:
- 정답 판정 기본값 변경: 시험 목록 → 톱니바퀴 → 정답 판정 절 (3단계)
- 부분 점수 정책 변경: 시험 목록 → 톱니바퀴 → 복수 정답 부분 점수 절 (3단계)
```

**도달 원칙**

- 적용 단위: **코스(Canvas Course)** 단위 기본값. 본 화면에서 변경한 값은 신규 문항에만 기본값으로 적용 (UX-COM-002).
- 적용 대상 유형 한정: 정답 판정 4종 토글은 입력형(단답 / 빈칸 채우기 / 복수 빈칸) 만 (UX-COM-005). 부분 점수 정책은 복수 정답 / 짝짓기 / 복수 빈칸 / 목록 선택 4유형.
- 변경된 값은 기존 문항의 채점 결과 변경 없음. 문항 단위 오버라이드는 SCR-03 (문항 작성 모달) 에서.

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-QUIZ-SETTINGS | 퀴즈 기본값 설정 다이얼로그 | 시험 목록 헤더 톱니바퀴 | 교수자 | UX-P07-001/002 (URD-005), UX-COM-001/002/005 (URD-010), UX-P07-001/002 (URD-010) | P1 |

---

## 3. 화면별 상세 설계

### SCR-I-QUIZ-SETTINGS. 퀴즈 기본값 설정 다이얼로그

**구현 파일**: `src/components/QuizSettingsDialog.jsx`

**목적**

코스 단위로 신규 문항/시험 작성 시 적용될 기본값(정답 판정 / 복수 정답 문항 부분 점수 / 응시 보안 등) 을 일괄 설정.

**레이아웃**

```
[Dialog (DialogContent)]
[DialogHeader]
  ├── DialogTitle "퀴즈 기본값 설정"
  └── DialogDescription "신규 문항/시험 작성 시 기본값으로 적용됩니다"

[본문 — SettingsSection 그룹]

  [SettingsSection "정답 판정" (입력형 문항)]
    ├── 대소문자 (Switch: 무시 / 구분)
    ├── 앞뒤 공백 (Switch: 무시 / 구분)
    ├── 연속 공백 (Switch: 무시 / 구분)
    ├── 모든 공백 제거 (Switch: 끔 / 켬)
    └── 안내 카피
         └── "단답형 / 빈칸 채우기 / 복수 빈칸 문항에 적용됩니다"

  [SettingsSection "복수 정답 문항 부분 점수"]
    ├── 적용 여부 선택 카드
    │    ├── all_correct: 미적용 ("모든 정답 일치 시 만점, 그 외 0점")
    │    └── partial: 적용 ("정답 비율에 따라 부분 점수")
    ├── partial 선택 시 산정 방식 선택 카드
    │    ├── none: 정답 비율만 반영
    │    ├── right_minus_wrong: 정답 비율 + 오답 차감 (Canvas 표준)
    │    └── formula_scoring: 정답 비율 + 추측 보정 감점
    └── ScoringSimulation
         └── 선택한 방식의 점수 계산 예시 (시각화)

  [SettingsSection "기타" (응시 보안 등)]
    └── (응시 보안 / 시간 기본값 등 화면 단위로는 본 SSD 범위 외 — 본문은 시험 작성/편집 SCR-02 에서 적용)

[푸터]
  ├── 좌측: 취소 (ghost)
  └── 우측: 저장 (primary)
```

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `Dialog` / `DialogHeader` / `DialogTitle` / `DialogDescription` (shadcn) | 모달 컨테이너 |
| `SettingsSection` (내부) | 절 단위 그룹 |
| `Switch` (shadcn) | 정답 판정 4종 토글 |
| 선택 카드 (native button + isActive 스타일) | 부분 점수 적용 여부 / 산정 방식 |
| `ScoringSimulation` (내부) | 산정 방식 시각화 |
| `Button` (shadcn) | 취소 / 저장 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (시험 목록 톱니바퀴) | 다이얼로그 오픈. 현재 코스 설정값 prefill |
| I-2 | 정답 판정 토글 변경 | 4종 Switch 개별 갱신. 입력형 문항 신규 작성 시 기본값으로 사용 |
| I-3 | 부분 점수 적용 여부 변경 | all_correct ↔ partial. partial 선택 시 산정 방식 영역 노출 |
| I-4 | 산정 방식 변경 | none / right_minus_wrong / formula_scoring 선택. ScoringSimulation 실시간 갱신 |
| I-5 | "저장" 클릭 | 코스 단위 settings 갱신. 다이얼로그 닫힘. 기존 문항 채점 결과 변경 없음 (UX-COM-002) |
| I-6 | "취소" 클릭 / Esc | 변경 폐기. 다이얼로그 닫힘 (단순 설정 화면이라 confirm 미사용 — 메모리 `feedback_confirm_dialog_scope.md`) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 기본값 (저장 없음) | 코스 settings 초기값 | 정답 판정 4종 토글: 대소문자/앞뒤 공백/연속 공백 모두 "무시", 모든 공백 제거 OFF (Canvas 기본값). 부분 점수: `all_correct` (미적용) |
| 정답 판정 변경 | 사용자가 Switch 토글 | 신규 문항 작성 시 기본값으로 사용됨 (안내 카피 노출) |
| 부분 점수 partial 활성 | partial 선택 | 산정 방식 영역 노출 + ScoringSimulation 활성 |
| 부분 점수 미적용 | all_correct 선택 | 산정 방식 영역 비노출 |
| 변경 적용 범위 | 신규 문항만 | 안내 카피: "본 설정은 신규 문항에 적용됩니다. 기존 문항은 영향받지 않습니다" |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 다이얼로그 진입 | `localStorage.getItem('xnq_global_settings')` 동기 로드 | `GET /api/courses/:id/global-settings` | 4종 토글 + 부분 점수 + 산정 방식 초기값 채움 | GlobalSettings (3.12) |
| D-2 | "저장" 클릭 | `localStorage.setItem('xnq_global_settings', JSON.stringify(settings))` | `PUT /api/courses/:id/global-settings` (body: 전체 settings) | 다이얼로그 닫힘. 기존 문항 채점 결과 영향 없음 | GlobalSettings (`caseSensitive` / `whitespaceSensitive` / `multipleAnswersScoringMode` / `penaltyMethod`) |
| D-3 | "취소" / Esc | 변경 폐기 (서버 호출 없음) | 동일 | 다이얼로그 닫힘 | (해당 없음) |

**예상 권한 검증**: `(instructor || admin)` + 담당 코스 권한. ta 는 읽기만 권고.

**적용 범위 권고**: GlobalSettings 는 코스 단위 1:1. 시험 단위 override 가 필요한 경우 Question 의 `scoringMode` / `penaltyMethod` 필드로 fallback (데이터 사전 3.6.2 multiple_answers 참조).

---

## 4. 반응형 분기

| **디바이스** | **너비** | **레이아웃 변화** |
|---|---|---|
| 모바일 | ~767px | 모달 전폭, 선택 카드 1열, ScoringSimulation 카드 너비 축소 |
| 태블릿 | 768~1023px | 모달 max-w-xl, 선택 카드 1열 |
| 데스크톱 | 1024px~ | 모달 max-w-2xl, 정답 판정 토글 inline 가능 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | 해당 없음 | 다이얼로그는 로컬 settings 동기 렌더 |
| 빈 상태 | 해당 없음 | 본 화면은 항상 settings 폼 노출 |
| 에러 (저장 실패) | API 모드 한정 | mock 모드는 발생 안 함. API 모드 전환 시 Toast 안내 필요 → 간극 G-3 |
| 권한 없음 | role !== 'instructor' | 시험 목록 헤더에서 톱니바퀴 미노출 |
| 오프라인 | API 모드 한정 | mock 모드 해당 없음 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 문항 단위 정답 판정 옵션 개별 설정 (UX-P07-001 URD-005) | (B) 후속 (SCR-03 위임) | 본 SCR-05 는 코스 기본값만. 문항 단위 오버라이드는 SCR-03 에서 정의 — 현재 프로토타입 미구현 (URD-005 Phase 2) |
| G-2 | 학생 측 부분 점수 산정 출처 안내 (URD-010 UX-P08-001/002) | (B) C 분류 후속 카피 | 학생 결과 화면 카피 (SCR-09 또는 학생 결과 SSD 보강 시 추가) |
| G-3 | API 모드 저장 실패 안내 | (B) 백로그 | mock 모드 기본 운영. API 모드 전환 시 Toast 안내 |
| G-4 | TA / 운영자 적용 정책 확인 (URD-005, URD-010) | (A) 충족 | Canvas 권한 비트 위임 (공통 권한 가이드 참조) |
| G-5 | 4유형 동일 정책 구조 (URD-010 UX-P07-006) | (A) 부분 충족 | URD-010 v0.2 명시: 복수 선택만 문항 단위 변경, 나머지 3유형은 퀴즈 기본값 |
| G-6 | 응시 데이터 존재 시 본 설정 변경 영향 안내 | (A) 충족 | 본 설정은 신규 문항만 적용 안내 카피 노출 (UX-COM-002) |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 데이터 흐름 절 추가. mock localStorage / api `GET-PUT /api/courses/:id/global-settings` 분기 + 데이터 사전 v0.1 GlobalSettings 엔티티 매핑 + 권한 검증 권고 포함 | 김민주 (Creator/PD) |
