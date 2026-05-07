# Canvas Quiz 기존 기능 인벤토리

> xnquiz 가 재구현해야 하는 Canvas Quiz 의 기본 기능 목록. "기존 Canvas 기능을 빠짐없이 구현했다"의 검증 기준이 됨.
> 출처: [Canvas Instructor Guide - Quizzes](https://community.canvaslms.com/) (공식 사용자 가이드 기반 12개 상위 기능 정리).

## 분류 기준
- **A** = Canvas 기본 기능 재구현. 동작 자체가 기존 Canvas 와 동일해야 함.
- 각 항목 아래에 xnquiz 구현 위치를 매핑 (코드 경로).
- 일부 항목은 R-B-NN(학교 요구) 또는 자체 도출 개선 항목과 통합 적용 - 라벨 표기.

## Canvas 기존 기능 항목 (12개)

| **ID** | **항목** | **xnquiz 구현 위치** | **연계 R-B** |
|---|---|---|---|
| **A-01** | 퀴즈 생성 (제목/설명/유형/일정) | QuizCreate.jsx | R-B-08 |
| **A-02** | 문항 작성 (12개 유형) | AddQuestionModal.jsx, QuestionAnswer.jsx | R-B-05, R-B-06, R-B-14, R-B-15 |
| **A-03** | 문제은행 관리 | QuestionBank.jsx, QuestionBankList.jsx | R-B-01, R-B-02, R-B-04 |
| **A-04** | 문항 그룹화 및 랜덤 출제 | RandomQuestionBankModal.jsx, QuestionBankModal.jsx | R-B-07 |
| **A-05** | 학생 응시 화면 (시간 제한, 자동저장) | QuizAttempt.jsx | - |
| **A-06** | 자동 채점 | (mock 데이터 레이어) | R-B-05, R-B-10 |
| **A-07** | 수동 채점 (서술형, 파일 업로드) | (GradingDashboard 영역, 백엔드 Creator) | R-B-10 |
| **A-08** | 점수 공개 및 피드백 | QuizCreate.jsx (scoreReveal 옵션) | - |
| **A-09** | 재응시 설정 및 실행 | ConditionalRetakeModal.jsx | R-B-11 |
| **A-10** | 통계/분석 (점수 분포, 문항 난이도) | QuizStats.jsx | R-B-13 |
| **A-11** | 결과 출력/다운로드 | QuizStats.jsx | R-B-09, R-B-13 |
| **A-12** | 권한 관리 (교수자/조교/학생) | 로그인 시 부여된 역할 기반 분기 (실제 구현은 인증 레이어 책임) | - |

## 통과 기준 (Coverage)
- **목표**: 12개 항목 중 12개 모두 xnquiz 에서 동작 (100%)
- **검증 방식**: 항목별 화면 캡처 + 코드 매핑 확인
- **PD 검토**: 김범수 PD 가 Canvas 기존 기능 충족 여부 검토 후 승인

## 미구현 / Open Issue
- A-07 (수동 채점 처리 로직) 은 백엔드 Creator 책임 영역 (xnquiz UI 만 prototype)
- A-08 의 시간 기반 점수 공개 정책은 백엔드 Creator 영역
- A-12 의 조교(TA) 권한 세분화는 추후 단계
