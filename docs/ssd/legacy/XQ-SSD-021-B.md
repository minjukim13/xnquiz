# XQ-SSD-021-B. 시험 응시 보안·감독·동의 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-021-B 의 UX 요건을 현재 프로토타입 3 지점(시험 설정 탭 SecuritySection / 응시 진입 PreflightGate / 응시 중 SecurityActiveBadges) 에서 명세. 외부 SaaS 통합·QR 발급·매핑 테이블 등 외부 책임 영역은 본 SSD 범위 외.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-021-B-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-021-B](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081759746) v1.0 |
| 참조 FRD | XQ-FRD-021-B v0.1 |
| 참조 DS Baseline | LearningX DS Baseline 미확정. 임시 기준: `CLAUDE.md` Design System 절 |
| 참조 코드 | `src/components/quiz-form/SecuritySection.jsx`, `src/components/PreflightGate.jsx` (SecurityActiveBadges 포함), `src/pages/QuizAttempt.jsx` |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈 → 퀴즈 목록 → 새 퀴즈 / 카드 메뉴 → 편집 → 시험 설정 탭 → "응시 보안 및 감독" Section
                                                                ├ 시험 전용 브라우저 Toggle
                                                                ├ AI 시험 감독 Toggle
                                                                └ 응시 전 필수 동의 Toggle
                                                                  └ 동의 안내문 textarea (활성 시)

학생 (student):
홈 → 퀴즈 카드 → 응시 진입 (/quiz/:id/attempt)
                  ├ 보안 옵션 0개 시 → 응시 화면 직진
                  └ 보안 옵션 1개 이상 시 → PreflightGate 노출 (응시 진입 전 안내 + 동의)
                                            ├ "응시 취소" → 홈
                                            └ "동의하고 응시 시작" → 응시 화면 + SecurityActiveBadges 노출

핵심 태스크 클릭 뎁스:
- 강사 보안 옵션 설정 (신규): 새 퀴즈 → Section 6 토글 (3단계)
- 학생 응시 진입 (보안 활성): 퀴즈 카드 → PreflightGate → 동의 → 응시 시작 (4단계)
```

**도달 원칙 (프로토타입 동작 기준)**

- 보안 옵션은 시험 설정 탭의 Section 6 (`응시 보안 및 감독`) 안에 3종 Toggle 로 모두 노출. 고객 미제공 / 권한 없음 분기는 프로토타입 미구현 (간극).
- 학생은 보안 옵션이 1개 이상 활성된 시험에 진입 시 PreflightGate 로 자동 전환. 보안 옵션이 0개면 바로 응시.
- 미리보기 모드(`?preview=true`) 는 PreflightGate 건너뛰고 응시 화면으로 직진 (교수자 검토 편의).
- 응시 화면 안에는 활성 보안 옵션 배지(`SecurityActiveBadges`) 만 노출. 이상 후보 / 판정 단서는 학생에게 노출 금지 (UX-COM-003).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트 / 진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-EDIT-SECURITY | 시험 설정 탭 - 응시 보안 및 감독 Section | `/quiz/new` `/quiz/:id/edit` Section 6 영역 | 교수자 | UX-P07-001~003/010/011/020/021/030/031/040 | P0 |
| SCR-L-PREFLIGHT | 학생 응시 진입 전 안내 + 동의 | `/quiz/:id/attempt` 진입 시 hasSecurity 조건 | 학생 | UX-P08-001/002/003/010/011/030 | P0 |
| SCR-L-ATTEMPT-SECURITY-BADGE | 응시 중 활성 보안 옵션 배지 | 응시 화면 내 인라인 영역 | 학생 | UX-P08-020/021, UX-COM-003 | P1 |

**화면 ID 공유 안내**

- `SCR-I-EDIT-SECURITY` 는 SCR-I-EDIT-INFO 의 한 Section 으로, SSD-021 의 "Section 6 (응시 보안)" 위임 영역. 본 SSD 가 단독 명세.
- `SCR-L-PREFLIGHT` 는 SSD-021 의 SCR-L-ATTEMPT-INTRO 와 화면 영역 일부 공유 (응시 진입 전 단계). 본 SSD 는 보안 옵션 안내/동의 본체 책임.

---

## 3. 화면별 상세 설계

### SCR-I-EDIT-SECURITY. 시험 설정 탭 - 응시 보안 및 감독 Section

**구현 파일**: `src/components/quiz-form/SecuritySection.jsx`

**목적**

교수자가 3종 보안 옵션(시험 전용 브라우저 / AI 시험 감독 / 응시 전 필수 동의) 의 사용 여부를 시험 단위로 설정. URD-021-B 가 정의한 "고객 제공 + 권한 보유 + 활성" 의 3단 분기 중 현재 프로토타입은 항상 활성 형태로 노출 (간극).

**레이아웃**

```
[Section "응시 보안 및 감독"]
  ├── Toggle 1. 시험 전용 브라우저
  │    └── description: "학생은 지정된 안전 브라우저에서만 응시할 수 있으며 다른 응용프로그램이 제한됩니다"
  ├── Toggle 2. AI 시험 감독
  │    └── description: "응시 중 학생 화면과 웹캠 영상을 AI 가 모니터링하여 이상 행동을 단서로 표시합니다"
  ├── Toggle 3. 응시 전 필수 동의
  │    └── description: "학생이 동의하지 않으면 응시 화면에 진입할 수 없습니다"
  └── (Toggle 3 활성 시 노출) 동의 안내문 영역
       ├── 좌측 보조선 (border-l-2 border-border)
       ├── label: "동의 안내문"
       ├── textarea (rows=5, placeholder=DEFAULT_CONSENT_TEXT)
       └── 하단 안내: "미입력 시 placeholder 의 기본 안내문이 학생 화면에 노출됩니다"
```

**사용 컴포넌트**

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `Section` | `src/components/quiz-form/Section.jsx` | "응시 보안 및 감독" 영역 카드 |
| `Toggle` | `src/components/quiz-form/Toggle.jsx` | 3종 옵션 스위치 (label + description 항상 노출) |
| native `textarea` | — | 동의 안내문 입력 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | "시험 전용 브라우저" Toggle | `form.securityTrustLock` 토글. 단일 옵션. 즉시 반영 |
| I-2 | "AI 시험 감독" Toggle | `form.securityAiProctoring` 토글. 단일 옵션. 즉시 반영 |
| I-3 | "응시 전 필수 동의" Toggle ON | `form.securityRequireConsent=true` + 동의 안내문 영역 자동 노출 |
| I-4 | 동의 안내문 textarea 변경 | `form.securityConsentText` 갱신. 빈 값 시 학생 화면에 DEFAULT_CONSENT_TEXT 노출 |
| I-5 | "응시 전 필수 동의" Toggle OFF | 동의 안내문 영역 자동 비노출. `form.securityConsentText` 값은 보존 (재토글 시 복원) |

**상태**

| **상태** | **표현** |
|---|---|
| 3종 모두 OFF | Toggle 3개 노출. 동의 안내문 영역 비노출. PublishReview 의 보안 카드는 "사용 안 함" 표기 |
| 일부 활성 | 활성된 옵션만 학생 PreflightGate 에서 안내됨 (UX-P08-002) |
| 동의 활성 + 안내문 미입력 | textarea 빈 상태. 학생 화면에선 DEFAULT_CONSENT_TEXT 자동 노출 |
| 동의 활성 + 안내문 입력 | 입력값이 학생 PreflightGate 의 `<pre>` 영역에 whitespace-pre-wrap 으로 노출 |

---

### SCR-L-PREFLIGHT. 학생 응시 진입 전 안내 + 동의

**구현 파일**: `src/components/PreflightGate.jsx`

**목적**

보안 옵션 1개 이상 활성된 시험에서 학생이 응시 진입 전에 (1) 활성된 옵션 종류와 자신이 충족해야 할 조건을 인지하고 (2) 동의 후 응시 시작. 응시 보안 옵션이 활성된 시험만 진입 (`hasSecurity = quiz.securityTrustLock || securityAiProctoring || securityRequireConsent`).

**레이아웃**

```
[max-w-2xl 컨테이너]
[헤더]
  ├── ShieldCheck 아이콘 + h1 "응시 전 필수 안내"
  └── 보조 카피: "이 시험은 응시 전에 확인해야 하는 보안/감독 항목이 있습니다..."

[Card (mb-4 p-5 gap-4)]
  ├── 시험명 영역
  │    ├── 라벨 "시험명"
  │    └── 시험 제목 (text-base font-semibold)
  ├── SecurityItemCard × N (활성 옵션만)
  │    ├── 시험 전용 브라우저 (Lock 아이콘)
  │    │    ├── title + detail
  │    │    └── checklist (2개): 설치 / 닫기 금지
  │    ├── AI 시험 감독 (Camera 아이콘)
  │    │    ├── title + detail
  │    │    └── checklist (3개): 웹캠 허용 / 카메라 위치 / 환경 준비
  │    └── 응시 전 필수 동의 (FileCheck2 아이콘)
  │         ├── title + detail
  │         └── checklist (0개, 동의 안내문 별도 영역)
  ├── (필수 동의 활성 시) 동의 안내문 영역
  │    ├── 상단 border-t-secondary 구분선
  │    ├── 라벨 "동의 안내문"
  │    └── <pre> (whitespace-pre-wrap, bg-secondary, font-sans, text-xs leading-relaxed)
  ├── 동의 체크박스 영역
  │    ├── native checkbox (accent-primary)
  │    └── 카피 "위 안내 사항을 모두 읽었으며, 응시 중 보안 옵션이 활성화되는 데 동의합니다"
  └── warning 박스
       ├── AlertTriangle 아이콘
       └── "동의하지 않으면 응시 화면으로 진입할 수 없습니다. 동의 후에는 응시가 종료될 때까지 보안 옵션이 활성 상태로 유지됩니다"

[하단 액션 (justify-end)]
  ├── "응시 취소" (ghost) → onCancel
  └── "동의하고 응시 시작" (default) → onConsent
       └── 체크박스 미선택 시 disabled
```

**사용 컴포넌트**

| **컴포넌트** | **위치** | **용도** |
|---|---|---|
| `Card` | `@/components/ui/card` | 컨테이너 카드 |
| `Button` | `@/components/ui/button` | 응시 취소 (ghost) / 동의하고 응시 시작 (default + disabled 분기) |
| `SecurityItemCard` (내부 정의) | `PreflightGate.jsx` 내부 | 활성 옵션별 카드 (아이콘 + title + detail + checklist) |
| native `<pre>` | — | 동의 안내문 (whitespace-pre-wrap) |
| native `<input type="checkbox">` | — | 동의 체크박스 (accent-primary) |
| Lucide icons | `ShieldCheck` `Lock` `Camera` `FileCheck2` `AlertTriangle` | 헤더 / 옵션 아이콘 / warning |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | `hasSecurity && !consentGiven && !submitted && !restored` | 응시 화면 진입 전 자동 노출 (QuizAttempt 의 가드 분기) |
| I-2 | 체크박스 변경 | `confirmed` state 갱신. "동의하고 응시 시작" disabled 해제/적용 |
| I-3 | "동의하고 응시 시작" 클릭 (confirmed=true) | `onConsent` 호출 → 부모(QuizAttempt) 가 `consentGiven=true` 설정 → 응시 화면 렌더 |
| I-4 | "응시 취소" 클릭 | `onCancel` 호출 → 홈(/) 으로 이동 |

**상태**

| **상태** | **표현** |
|---|---|
| 보안 옵션 0개 | PreflightGate 미노출, 응시 화면 직진 |
| 보안 옵션 1개 이상 + consentGiven=false | PreflightGate 노출. 활성 옵션만 SecurityItemCard 로 렌더 |
| 보안 옵션 활성 + 미리보기 모드 | PreflightGate 건너뜀 (`!isPreview` 조건) |
| 동의 미체크 | "동의하고 응시 시작" 버튼 disabled |
| 동의 체크 완료 | 버튼 활성, 클릭 시 응시 시작 |
| 동의 거부 후 복귀 | 홈 이동 → 다시 진입 시 PreflightGate 재노출. 영구 차단은 미구현 (URD OQ-01 의존) → 간극 참조 |

---

### SCR-L-ATTEMPT-SECURITY-BADGE. 응시 중 활성 보안 옵션 배지

**구현 파일**: `src/components/PreflightGate.jsx` 의 `SecurityActiveBadges` export

**목적**

응시 중 학생이 자신의 응시가 어떤 보안 조건 아래 진행되는지 인지하도록, 활성 보안 옵션을 배지로 표시 (UX-P08-020). 이상 후보 판정 / 부정행위 단정은 표시 금지 (UX-COM-003).

**레이아웃**

```
[활성 옵션 1개 이상 시]
  └── 배지 묶음 (flex-wrap gap-1.5)
       ├── 시험 전용 브라우저 활성 시: "Lock 아이콘 + 전용 브라우저 활성"
       ├── AI 시험 감독 활성 시: "Camera 아이콘 + AI 감독 동작 중"
       └── 응시 전 필수 동의 활성 시: "FileCheck2 아이콘 + 동의 완료"

[활성 옵션 0개 시]
  └── 배지 묶음 비노출 (null 반환)
```

**배지 스타일**

- `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium`
- `bg-accent text-primary`
- `title="응시 중 활성 보안 옵션"` (호버 시 의미 안내)

**사용 컴포넌트**

| **컴포넌트** | **용도** |
|---|---|
| `SecurityActiveBadges` (export from PreflightGate.jsx) | 응시 화면 인라인 영역에서 호출 |
| Lucide icons | `Lock` `Camera` `FileCheck2` |

**인터랙션**

해당 없음 (정적 표시. 클릭/호버 외 인터랙션 없음).

**상태**

| **상태** | **표현** |
|---|---|
| 활성 옵션 0개 | null 반환, 영역 자체가 렌더되지 않음 |
| 1~3개 활성 | 활성된 옵션만 배지로 노출. 비활성 옵션은 배지 표시 안 함 |

---

## 4. 반응형 분기

| **디바이스** | **너비** | **SCR-I-EDIT-SECURITY** | **SCR-L-PREFLIGHT** | **SCR-L-ATTEMPT-SECURITY-BADGE** |
|---|---|---|---|---|
| 모바일 | ~767px | Toggle 1열, description 자동 줄바꿈, textarea 전폭 | max-w-2xl 자동, SecurityItemCard 카드별 1열, 액션 버튼 우측 정렬 유지 | 배지 자동 줄바꿈 (flex-wrap) |
| 태블릿 | 768~1023px | Section 단일 열 유지 | max-w-2xl 중앙 | 인라인 유지 |
| 데스크톱 | 1024px~ | Section 단일 열 유지 | max-w-2xl 중앙 | 인라인 유지 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 (PreflightGate 진입) | quiz 데이터 fetch 중 | 부모(QuizAttempt) 의 로딩 상태 처리. PreflightGate 자체는 quiz prop 받아서 동기 렌더 |
| 동의 거부 후 영구 차단 | 학생 동의 거부 + 정책 결정 미완 | 현재 프로토타입은 홈으로 보내고 재진입 가능. "영구 차단" 정책은 URD OQ-01 의존 → 간극 G-1 |
| 외부 SaaS 안내 (웹캠 끊김 등) | AI 감독 옵션 활성 + 외부 SaaS 신호 | 현재 프로토타입 미통합 (외부 책임). UX-P08-021 의 조치 안내 미구현 → 간극 G-2 |
| 권한 없음 / 고객 미제공 | 보안 옵션이 고객에게 미제공 | 현재 프로토타입은 항상 노출. 권한/제공 분기 미구현 → 간극 G-3 |
| 개인정보 처리 안내 (보존/접근/삭제) | 법무 검토 완료 후 안내 필요 | DEFAULT_CONSENT_TEXT 에 보존 6개월 카피 포함. 정책 확정 후 추가 안내는 URD OQ-02 의존 → 간극 G-4 |
| 응시 중 표시 경계 위반 | (해당 없음) | SecurityActiveBadges 는 활성 사실만 노출. 이상 후보 / 판정은 학생에게 노출되지 않음 (UX-COM-003 충족) |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 동의 거부 후 복귀 정책 (UX-P08-011, OQ-01) | (B) 정책 미확정 | URD OQ-XQ-URD-021-B-01 의존. 정책 확정 후 SSD 보강 |
| G-2 | 외부 SaaS 안내 (웹캠 끊김 등 조치 안내, UX-P08-021) | (B) 외부 책임 | 외부 SaaS 통합 시점에 별도 SSD 보강 |
| G-3 | 고객별 제공 / 권한별 설정 가능 2단 분기 (UX-P07-001/002/003/020/021, UX-COM-002) | (B) URD 완화 | **URD-021-B v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 + 고객 옵션 위임으로 정리 (공통 권한 모델 가이드 참조) |
| G-4 | 개인정보 처리 안내 (보존/접근/삭제, UX-P08-030, OQ-02) | (B) 법무 검토 의존 | URD OQ-XQ-URD-021-B-02 의존. 법무 검토 후 동의 안내문 갱신 |
| G-5 | 시험 전용 브라우저 기본값 적용 (UX-P05-001, UX-P07-030/031) | (B) URD 완화 | **URD-021-B v0.5 정정 완료** (2026-06-05) — "운영자 권한 분기 도입 후 활성" 으로 완화 |
| G-6 | 본인 권한으로 수정 불가 옵션의 읽기 전용 표시 (UX-P07-020 의 "비활성/읽기 전용") | (B) URD 완화 | **URD-021-B v0.5 정정 완료** (2026-06-05) — "권한 분기 도입 후 활성" 으로 완화 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-3/G-5/G-6 URD-021-B 정정 완료 반영 (v0.5/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
