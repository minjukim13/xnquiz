# xnquiz SSD — Screen Spec Document

> **프로젝트**: xnquiz (PRJ-XQ-BASE, LearningX 산하 Project, 2026-04 ~)
> **Creator/PD**: 김민주
> **목적**: 현재 프로토타입의 화면을 화면 단위로 명세. XP2 [Designer] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866) 의 5섹션 + 헤더 + 변경 이력 구조 준수.
> **2026-06-05 v3 재편**: URD 1:1 매핑(20건) → 화면 단위(9건) 으로 통합. 가이드 `SCR-{역할}-{semantic}` 화면 ID 체계 도입. 기존 자료는 `legacy/` 보존.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID 체계 | `XQ-SSD-SCR-{NN}-vN` (화면 단위 9건) |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD), 박성운 (Architect) |
| 참조 URD | [XP2 URD 폴더 5075632129](https://xinics.atlassian.net/wiki/spaces/XP2/folder/5075632129) (14건 v1.0) |
| 참조 FRD | [XP2 FRD 폴더 5074550792](https://xinics.atlassian.net/wiki/spaces/XP2/folder/5074550792) |
| 참조 DS Baseline | LearningX DS Baseline (예정). 임시: 본 README §디바이스 분기점 + §컴포넌트 사용 원칙 |
| 권한 가이드 | [XQ-URD 공통 권한 모델 가이드 (페이지 5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈 (시험 목록 SCR-I-QUIZLIST)
├── 새 시험 (SCR-01) → 시험 상세 (SCR-01)
├── 시험 상세 (SCR-01) → 카드 메뉴
│   ├── 편집 (SCR-02) → 문항 추가 → 문항 작성 모달 (SCR-03)
│   ├── 채점 (SCR-06) → 재채점·조건부 재응시 모달 (SCR-06 내부)
│   └── 통계 (SCR-07)
├── 문제은행 (SCR-04) → 일괄 업로드 / 가져오기 / 내보내기 (SCR-04 내부)
└── 퀴즈 기본값 설정 (SCR-05, 톱니바퀴)

학생 (student):
홈 (시험 목록 SCR-L-QUIZLIST)
└── 시험 상세 (SCR-01)
    └── 응시 (SCR-09)
         ├── PreflightGate 동의 (SCR-09 내부)
         └── 응시·결과 (SCR-09)

핵심 태스크 클릭 뎁스:
- 퀴즈 생성: 시험 목록 → 새 시험 (2단계)
- 채점: 시험 목록 → 카드 메뉴 → 채점 (3단계)
- 문항 추가: 시험 편집 → 문항 추가 탭 → 문항 만들기 (4단계)
- 응시: 시험 카드 → 응시 (2단계)
- 일괄 업로드: 문제은행 → 상세 → 일괄 업로드 (4단계)
```

권한 분기 규칙: 교수자 전용 기능은 `(INSTRUCTOR || ADMIN)` 조건. ADMIN 단독 분기는 사용하지 않음 (메모리 `feedback_admin_includes_professor.md`). 채점자(P-09) / TA(P-03) 등 USD 페르소나는 Canvas 권한 비트 위임 — 공통 권한 가이드 (페이지 5097160727) 참조.

## 2. 화면 목록 (인벤토리)

| **문서 ID** | **화면명** | **라우트** | **주 진입 권한** | **우선순위** | **흡수한 URD** | **파일** |
|---|---|---|---|---|---|---|
| SCR-01 | 시험 목록·상세 | `/`, `/quiz/:id` | 교수자 / 학생 | P0 | URD-018 | [SCR-01-quiz-list-detail.md](SCR-01-quiz-list-detail.md) |
| SCR-02 | 시험 작성·편집 | `/quiz/new`, `/quiz/:id/edit` | 교수자 | P0 | URD-008, URD-021, URD-021-B (교수자 부분) | [SCR-02-quiz-edit.md](SCR-02-quiz-edit.md) |
| SCR-03 | 문항 작성 모달 | AddQuestionModal (모달) | 교수자 | P0 | URD-001 (문항), URD-005, URD-006 (교수자), URD-010 (문항), URD-024, URD-028 | [SCR-03-question-form.md](SCR-03-question-form.md) |
| SCR-04 | 문제은행 | `/question-banks`, `/question-banks/:bankId` | 교수자 | P0 | URD-001 (그룹/필터), URD-020, URD-029 | [SCR-04-question-bank.md](SCR-04-question-bank.md) |
| SCR-05 | 퀴즈 기본값 설정 다이얼로그 | QuizSettingsDialog (모달) | 교수자 | P1 | URD-005 (전역), URD-010 (전역) | [SCR-05-quiz-settings.md](SCR-05-quiz-settings.md) |
| SCR-06 | 채점 대시보드 | `/quiz/:id/grade` | 교수자 | P0 | URD-009, URD-011 (교수자), URD-019, URD-022, URD-025 | [SCR-06-grading-dashboard.md](SCR-06-grading-dashboard.md) |
| SCR-07 | 통계·분석 | `/quiz/:id/stats` | 교수자 | P1 | URD-026 | [SCR-07-quiz-stats.md](SCR-07-quiz-stats.md) |
| SCR-09 | 학생 응시·동의 | `/quiz/:id/attempt` | 학생 (교수자 미리보기) | P0 | URD-006 (학생), URD-007, URD-021-B (학생), URD-023 (학생) | [SCR-09-quiz-attempt.md](SCR-09-quiz-attempt.md) |

> 화면 단위 1 SSD 원칙. 단일 화면 안에 여러 SCR (교/학 분기, 모달 진입 등) 이 있는 경우, 본문 §3 안에 SCR-{역할}-{semantic} 단위로 서브 섹션을 둠.
> SSD-S10 (학생 결과 확인) 은 현재 프로토타입 구현이 약하므로 보류. 보강 후 추가.

## 3. 디바이스 분기점 (DS Baseline 임시 기준)

| **디바이스** | **너비** | **주 사용자** |
|---|---|---|
| 모바일 | ~767px | 학생 (응시 일부) |
| 태블릿 | 768 ~ 1023px | 학생 (응시) |
| 데스크톱 | 1024px ~ | 교수자 (전 화면), 학생 (전 화면 가능) |

## 4. 컴포넌트 사용 원칙 (DS Baseline 임시 기준)

DS Baseline 단일 문서가 확정되기 전까지 본 절을 잠정 기준으로 사용.

- **색상**: 시맨틱 Tailwind 클래스 사용. hex 하드코딩 금지 (`bg-primary`, `text-foreground` 등). 상세 토큰 표는 프로젝트 루트 `CLAUDE.md` 의 Design System 절 참조 (Toss style)
- **버튼**: 기본 액션은 `<Button>` 컴포넌트. 한 화면에 primary 1개 원칙
- **모달**: `<DialogTitle>` / `<DialogDescription>` 컴포넌트 사용. 인라인 fontSize·borderRadius 금지
- **비정상 상태**: 5종 모두 정의 (로딩 / 빈 상태 / 에러 / 권한 없음 / 오프라인). 해당 없는 상태는 "해당 없음" 명시

## 5. 작성 원칙

1. **현재 프로토타입 동작 기준**으로 작성. 미구현 항목은 §6 프로토타입과 URD 간극 표에 분리 기록 (메모리 `feedback_ssd_match_prototype.md`)
2. **화면 단위 1 SSD** — 한 화면(라우트 또는 큰 모달) = 한 문서. 같은 라우트 안의 교/학 뷰는 동일 문서의 별도 SCR ID 로 분리
3. **본문 5섹션 + 헤더 + 변경 이력 + 간극 표** 구조 준수
4. **권한 분기 규칙**: 교수자 전용은 `(INSTRUCTOR || ADMIN)`. P-NN 페르소나는 공통 권한 가이드 위임
5. **컴포넌트명**: §3 사용 컴포넌트 표에만 기재. 본문 다른 절에서는 와이어프레임적 컴포넌트명 남발 금지
6. **반응형 분기**: §3 디바이스 분기점 기준
7. **변경 이력**: 현재 시점 1행만 (메모리 `feedback_artifact_current_state_only.md`)

## 6. 산출물 위치

```
docs/ssd/
├── README.md                        ← 본 문서 (인덱스)
├── _template.md                     ← 화면 단위 SSD 템플릿
├── SCR-01-quiz-list-detail.md
├── SCR-02-quiz-edit.md
├── SCR-03-question-form.md
├── SCR-04-question-bank.md
├── SCR-05-quiz-settings.md
├── SCR-06-grading-dashboard.md
├── SCR-07-quiz-stats.md
├── SCR-09-quiz-attempt.md
└── legacy/                          ← 2026-06-05 v3 재편 이전 자료 (XQ-SSD-NNN 20건 + 기존 S-NN 9건)
```

## 7. 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-10 | v3.1 | SCR-08 (응시 모니터) 제거. 기능 일시 보류 | 김민주 (Creator/PD) |
