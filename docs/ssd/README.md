# xnquiz SSD - Screen Spec Document

> **프로젝트**: xnquiz (LearningX 산하 Project, 2026-04~)
> **Creator**: 김민주
> **목적**: 현재까지 구현된 화면을 화면 단위로 명세화. 각 화면에서 **Canvas 기존 기능(A)** / **학교 요구사항(B)** / **자체 도출 개선(C)** 을 구분하여 기록.

## 라벨 규칙

| **라벨** | **의미** | **출처** |
|---|---|---|
| `[A]` | Canvas 기존 기능 - 기존 Canvas Quiz 가 제공하던 기능을 xn 퀴즈에서 다시 구현 | baseline-inventory.md |
| `[B-#NN]` | 학교 요구사항 반영 - Canvas 에 없던 / 부족했던 기능을 학교(고객)가 요구하여 xn 퀴즈에서 신규 제공 | R-B-01 ~ R-B-15 |
| `[C]` | 자체 도출 개선 - Canvas 기존 기능도 아니고 학교 요구사항도 아니지만, 프로젝트 진행 중 자체 발굴한 UX/UI 개선 (예: 문항 작성 시 우측 예시 문제 동시 노출, 카드 인라인 통계 등) | 프로젝트 자체 의사결정 |

> `[A]` = 기존 Canvas / `[B-#NN]` = 학교 요구 / `[C]` = 자체 개선

## 화면 인덱스

| **ID** | **화면명** | **라우트** | **진입 권한** | **문서** |
|---|---|---|---|---|
| S-01 | 퀴즈 목록 | `/` | 교수자 / 학생 | S-01-quiz-list.md |
| S-02 | 퀴즈 생성 | `/quiz/new` | 교수자 | S-02-quiz-create.md |
| S-03 | 퀴즈 상세 | `/quiz/:id` | 교수자 / 학생 | S-03-quiz-detail.md |
| S-04 | 퀴즈 편집 | `/quiz/:id/edit` | 교수자 | S-04-quiz-edit.md |
| S-05 | 채점 대시보드 | `/quiz/:id/grade` | 교수자 | S-05-grading-dashboard.md |
| S-06 | 통계/분석 | `/quiz/:id/stats` | 교수자 | S-06-quiz-stats.md |
| S-07 | 학생 응시 | `/quiz/:id/attempt` | 학생 | S-07-quiz-attempt.md |
| S-08 | 문제은행 목록 | `/question-banks` | 교수자 | S-08-question-bank-list.md |
| S-09 | 문제은행 상세 | `/question-banks/:bankId` | 교수자 | S-09-question-bank.md |

## 산출물 위치

```
docs/ssd/
├── README.md                       ← 본 문서 (인덱스)
├── _template.md                    ← SSD 템플릿
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

## 작성 원칙

1. **현재 구현 기준**으로 작성 (계획 / 백로그 항목은 미구현 / Open Issue 섹션에만 기록)
2. **화면 단위**로 명세 - 화면 1개 = 문서 1개
3. **A vs B vs C 구분 필수** - 표를 분리하여 한눈에 식별 가능하게 표기
4. 구현 위치는 컴포넌트/함수명만 텍스트로 기재 (소스 코드 링크 사용 금지)
5. 라벨은 FRD 와 일치 - 새로운 라벨 발명 금지
6. 미구현 / 백엔드 Creator 영역은 정직하게 명시
7. 권한 분기는 실제 로그인 기반(교수자/학생/조교/운영자) 으로 기술 - 프로토타입 전용 도구(예: 임의 역할 토글) 는 SSD 에 명시하지 않음
