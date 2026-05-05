# Canvas Quiz Baseline 인벤토리

> xnquiz 가 재구현해야 하는 Canvas Quiz 의 기본 기능 목록 (Baseline). "기존 Canvas 기능을 빠짐없이 구현했다"의 검증 기준이 됨.
> 출처: [Canvas Instructor Guide — Quizzes](https://community.canvaslms.com/) (공식 사용자 가이드 기반 12개 상위 기능 정리).

## 분류 기준
- **B** = Canvas 기본 기능 재구현. UX 개선 여부와 무관하게 동작 자체가 baseline.
- 각 항목 아래에 xnquiz 구현 위치를 매핑 (코드 경로).
- 일부 항목은 R-C-NN(고객 요구) 또는 UX 개선과 통합 적용 — 라벨 표기.

## Baseline 항목 (12개)

| **ID** | **항목** | **xnquiz 구현 위치** | **연계 R-C** |
|---|---|---|---|
| **B-01** | 퀴즈 생성 (제목/설명/유형/일정) | [QuizCreate.jsx](../../src/pages/QuizCreate.jsx) | R-C-08 |
| **B-02** | 문항 작성 (12개 유형) | [AddQuestionModal.jsx](../../src/components/AddQuestionModal.jsx), [QuestionAnswer.jsx](../../src/components/QuestionAnswer.jsx) | R-C-05, R-C-06, R-C-14, R-C-15 |
| **B-03** | 문제은행 관리 | [QuestionBank.jsx](../../src/pages/QuestionBank.jsx), [QuestionBankList.jsx](../../src/pages/QuestionBankList.jsx) | R-C-01, R-C-02, R-C-04 |
| **B-04** | 문항 그룹화 및 랜덤 출제 | [RandomQuestionBankModal.jsx](../../src/components/RandomQuestionBankModal.jsx), [QuestionBankModal.jsx](../../src/components/QuestionBankModal.jsx) | R-C-07 |
| **B-05** | 학생 응시 화면 (시간 제한, 자동저장) | [QuizAttempt.jsx](../../src/pages/QuizAttempt.jsx) | - |
| **B-06** | 자동 채점 | (mock 데이터 레이어) | R-C-05, R-C-10 |
| **B-07** | 수동 채점 (서술형, 파일 업로드) | (GradingDashboard 영역, 백엔드 Creator) | R-C-10 |
| **B-08** | 점수 공개 및 피드백 | [QuizCreate.jsx](../../src/pages/QuizCreate.jsx) (scoreReveal 옵션) | - |
| **B-09** | 재응시 설정 및 실행 | [ConditionalRetakeModal.jsx](../../src/components/ConditionalRetakeModal.jsx) | R-C-11 |
| **B-10** | 통계/분석 (점수 분포, 문항 난이도) | [QuizStats.jsx](../../src/pages/QuizStats.jsx) | R-C-13 |
| **B-11** | 결과 출력/다운로드 | [QuizStats.jsx](../../src/pages/QuizStats.jsx) | R-C-09, R-C-13 |
| **B-12** | 권한 관리 (교수자/조교/학생) | [src/context/role.jsx](../../src/context/role.jsx) | - |

## 통과 기준 (Coverage)
- **목표**: 12개 항목 중 12개 모두 xnquiz 에서 동작 (100%)
- **검증 방식**: 항목별 화면 캡처 + 코드 매핑 확인
- **PD 검토**: 김범수 PD 가 baseline 기능 충족 여부 검토 후 승인

## 미구현 / Open Issue
- B-07 (수동 채점 처리 로직) 은 백엔드 Creator 책임 영역 (xnquiz UI 만 prototype)
- B-08 의 시간 기반 점수 공개 정책은 백엔드 Creator 영역
- B-12 의 조교(TA) 권한 세분화는 추후 단계
