# xnquiz SSD - Screen Spec Document

> **프로젝트**: xnquiz (PRJ-XQ-BASE, LearningX 산하 Project, 2026-04 ~)
> **Creator/PD**: 김민주
> **목적**: 현재까지 구현된 화면을 화면 단위로 명세화. Canvas Classic Quizzes 기준 기능(A) / 학교 요구사항(B) / 자체 도출 개선(C) 을 구분하여 기록하고, XP2 [Designer] Screen Spec, DS Baseline 작성 가이드 (2026-05-26 도입) 의 5섹션 + 헤더 + 변경 이력 구조에 맞춰 보강.
> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 작성 가이드
> **연결 자산**:
> - FRD: PRJ-XQ-BASE-FRD-001 ~ (Confluence 폴더 [5060853766](https://xinics.atlassian.net/wiki/spaces/XP2/folder/5060853766))
> - URD: 동일 폴더 내 URD 시리즈 (박성운 작성, base 추출)
> - DS Baseline: 제품 단위 단일 문서 (별도 산출물 예정). 본 README §디바이스 분기점 / §컴포넌트 사용 원칙 이 잠정 기준
> - 프로토타입 코드: xnquiz Repo (React 19 + Vite 8 + Tailwind v4)

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | PRJ-XQ-BASE-SSD-vN |
| 작성자 | 김민주 (Creator/PD) |
| 참조 FRD | PRJ-XQ-BASE-FRD-001 ~ 005 (Confluence 폴더 [5060853766](https://xinics.atlassian.net/wiki/spaces/XP2/folder/5060853766)) |
| 참조 DS Baseline | LearningX DS Baseline (예정). 임시: 본 README §디바이스 분기점 + §컴포넌트 사용 원칙 |

## 1. 라벨 규칙

| **라벨** | **의미** | **출처** |
|---|---|---|
| `[A]` | Canvas 기존 기능 - 기존 Canvas Classic Quizzes 가 제공하던 기능을 xnquiz 에서 다시 구현 | Canvas Classic Quizzes 공식 |
| `[B-#NN]` | 학교 요구사항 반영 - Canvas 에 없던 / 부족했던 기능을 학교(고객)가 요구하여 xnquiz 에서 신규 제공 | R-B-01 ~ R-B-15 |
| `[C]` | 자체 도출 개선 - Canvas 기존 기능도 아니고 학교 요구사항도 아니지만, 프로젝트 진행 중 자체 발굴한 UX/UI 개선 | 프로젝트 자체 의사결정 |

> Canvas 기능 + UI 라벨/배지 표현은 `[A]`. `[C]` 는 Canvas 에 없는 신규 또는 재조합.

## 2. 역할별 네비게이션 구조

각 역할이 핵심 태스크에 도달하는 경로와 클릭 뎁스. P0 태스크는 4단계 이내 권장.

```
교수자 네비게이션:
홈
├── 퀴즈 (S-01) → 퀴즈 상세 (S-03)
│                  ├── 편집 (S-04)
│                  ├── 채점 (S-05)
│                  └── 통계 (S-06)
├── 새 퀴즈 (S-02)
└── 문제은행 (S-08) → 문제은행 상세 (S-09)

핵심 태스크 클릭 뎁스:
- 퀴즈 생성: 퀴즈 → 새 퀴즈 (2단계)
- 채점: 퀴즈 → 카드 메뉴 → 채점 (3단계)
- 통계 확인: 퀴즈 → 카드 메뉴 → 통계 (3단계)
- 문항 추가: 문제은행 → 문제은행 상세 (2단계)

학생 네비게이션:
홈
└── 퀴즈 (S-01) → 응시 (S-07)
                  └── 응시 결과 (S-07 결과 모드)

핵심 태스크 클릭 뎁스:
- 응시 시작: 퀴즈 → 응시 (2단계)
- 결과 확인: 퀴즈 → 카드 (2단계)
```

권한 분기 규칙: 교수자 전용 기능은 `(INSTRUCTOR || ADMIN)` 조건으로 처리. ADMIN 단독 분기는 사용하지 않음.

## 3. 화면 목록 (인벤토리)

| **ID** | **화면명** | **라우트** | **진입 권한** | **우선순위** | **연결 FRD** | **문서** |
|---|---|---|---|---|---|---|
| S-01 | 퀴즈 목록 | `/` | 교수자 / 학생 | P0 | (TBD) | [S-01-quiz-list.md](S-01-quiz-list.md) |
| S-02 | 퀴즈 생성 | `/quiz/new` | 교수자 | P0 | (TBD) | [S-02-quiz-create.md](S-02-quiz-create.md) |
| S-03 | 퀴즈 상세 | `/quiz/:id` | 교수자 / 학생 | P0 | (TBD) | [S-03-quiz-detail.md](S-03-quiz-detail.md) |
| S-04 | 퀴즈 편집 | `/quiz/:id/edit` | 교수자 | P0 | (TBD) | [S-04-quiz-edit.md](S-04-quiz-edit.md) |
| S-05 | 채점 대시보드 | `/quiz/:id/grade` | 교수자 | P0 | (TBD) | [S-05-grading-dashboard.md](S-05-grading-dashboard.md) |
| S-06 | 통계/분석 | `/quiz/:id/stats` | 교수자 | P1 | (TBD) | [S-06-quiz-stats.md](S-06-quiz-stats.md) |
| S-07 | 학생 응시 | `/quiz/:id/attempt` | 학생 (교수자 미리보기) | P0 | FRD-001 등 | [S-07-quiz-attempt.md](S-07-quiz-attempt.md) |
| S-08 | 문제은행 목록 | `/question-banks` | 교수자 | P1 | FRD-001 | [S-08-question-bank-list.md](S-08-question-bank-list.md) |
| S-09 | 문제은행 상세 | `/question-banks/:bankId` | 교수자 | P1 | FRD-002, FRD-003 | [S-09-question-bank.md](S-09-question-bank.md) |

> 화면 ID 규칙: `S-{NN}` (현 체계 유지). XP2 가이드의 `SCR-{역할}-{NN}` 체계는 도입 검토 중 — 도입 시 S-XX 와 매핑 표 별도 작성.

## 4. 디바이스 분기점 (DS Baseline 임시 기준)

xnquiz 프로토타입의 주 사용 디바이스는 데스크톱(교수자) / 데스크톱·태블릿(학생). DS Baseline 이 확정될 때까지 본 표를 잠정 기준으로 사용한다.

| **디바이스** | **너비** | **주 사용자** |
|---|---|---|
| 모바일 | ~767px | 학생 (응시 일부) |
| 태블릿 | 768 ~ 1023px | 학생 (응시) |
| 데스크톱 | 1024px ~ | 교수자 (전 화면), 학생 (전 화면 가능) |

## 5. 컴포넌트 사용 원칙 (DS Baseline 임시 기준)

DS Baseline 단일 문서가 확정되기 전까지 본 절을 잠정 기준으로 사용. 새 컴포넌트 필요 시 DS Baseline 갱신 절차 (PART 2-6) 따름.

- **색상**: 시맨틱 Tailwind 클래스 사용. hex 하드코딩 금지 (`bg-primary`, `text-foreground` 등)
- **버튼**: 기본 액션은 `<Button>` 컴포넌트, 한 화면에 primary 1개 원칙
- **모달**: `<DialogTitle>` / `<DialogDescription>` 컴포넌트 사용, 인라인 fontSize·borderRadius 금지
- **빈 상태 / 에러 / 권한 없음 / 로딩 / 오프라인**: 가이드 §5 비정상 상태 UX 5종 모두 정의

상세 색상·타이포·간격 토큰은 프로젝트 루트 `CLAUDE.md` 의 Design System 절 참조 (Toss style 기반).

## 6. 산출물 위치

```
docs/ssd/
├── README.md                       ← 본 문서 (인덱스)
├── _template.md                    ← SSD 화면별 상세 설계서 템플릿
├── S-01-quiz-list.md
├── S-02-quiz-create.md
├── S-03-quiz-detail.md
├── S-04-quiz-edit.md
├── S-05-grading-dashboard.md
├── S-06-quiz-stats.md
├── S-07-quiz-attempt.md
├── S-08-question-bank-list.md
└── S-09-question-bank.md
```

## 7. 작성 원칙

1. **현재 구현 기준**으로 작성 (계획 / 백로그 항목은 별도 트래커에서 관리, SSD 본문에는 미구현 섹션 두지 않음)
2. **화면 단위** 명세 - 화면 1개 = 문서 1개
3. **5섹션 + 헤더 + 변경 이력 + 기능 분류(자체 자산)** 구조 준수
   - 0. 문서 헤더 / 1. 화면 정보 / 2. 화면 목적 / 3. 레이아웃 / 4. 사용 컴포넌트 / 5. 기능 분류(A·B·C) / 6. 주요 인터랙션 / 7. 반응형 분기 / 8. 비정상 상태 UX / 9. 예외 / 10. 변경 이력
4. **A·B·C 분류 필수** - 표를 분리하여 한눈에 식별 가능하게 표기 (xnquiz 자체 자산이므로 가이드 외에도 보존)
5. 사용 컴포넌트는 텍스트로만 기재. 소스 코드 링크 사용 금지
6. 라벨은 FRD 와 일치 - 새로운 라벨 발명 금지
7. 권한 분기는 실제 로그인 기반(교수자/학생/조교/운영자)으로 기술. 프로토타입 전용 도구(예: 임의 역할 토글) 는 SSD 에 명시하지 않음
8. 반응형 분기는 §4 디바이스 분기점 기준
9. 비정상 상태 UX 는 5종 (로딩 / 빈 상태 / 에러 / 권한 없음 / 오프라인) 모두 정의. 해당 없는 상태는 "해당 없음" 명시
10. 컴포넌트명·구현 방식 표현은 §5 사용 컴포넌트 표에만. 4-9 섹션 본문에서는 와이어프레임적 컴포넌트명 남발 금지

## 8. 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** | **근거** |
|---|---|---|---|---|
| 2026-04-XX | v1 | 초안 작성. S-00 ~ S-09 화면 단위 명세 (A·B·C 라벨 + 화면 정보 / 영역 구성 / 기능 분류 / 화면 상태 / 인터랙션 / 예외) | 김민주 (Creator/PD) | 초기 SSD 구축 |
| 2026-05-11 | v2 | 외부 공유용 정리 - S-00 페이지 제거 (셸 동작이라 화면 단위 명세와 결이 다름), 구현 위치 컬럼 제거, 미구현 / Open Issue 섹션 제거, [C]→[A] 재분류 13건 | 김민주 (Creator/PD) | 보고용 단독 가독성 + Canvas 기능 + UI 라벨/배지 = [A] 원칙 |
| 2026-05-21 | v3 | XP2 [Designer] Screen Spec, DS Baseline 작성 가이드 (2026-05-26 도입) 의 5섹션 + 헤더 + 변경 이력 구조에 맞춰 README 보강. 역할별 네비게이션 / 디바이스 분기점 / 컴포넌트 사용 원칙 절 신설. 각 S-XX 페이지는 사용 컴포넌트(DS Baseline 참조) / 반응형 분기 / 비정상 상태 UX / 변경 이력 4개 절 추가 예정 | 김민주 (Creator/PD) | XP2 [Designer] 가이드 + 기존 SSD 가 "빈약하다" 는 내부 피드백 반영 |
