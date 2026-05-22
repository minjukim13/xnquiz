# xnquiz URD: UI 요구사항 명세

> **프로젝트**: xnquiz (PRJ-XQ-BASE, LearningX 산하, 2026-04 ~)
> **작성자**: 김민주 (Creator/PD)
> **작성 목적**: xnquiz 가 대체하는 영역의 (AS-IS) 상태와 (TO-BE) 목표 상태를 함께 기록하여, 어떤 문제를 어떻게 개선했는지 추적 가능하도록 한다.
> **준수 가이드**: XP2 [PD] URD 작성 가이드 (2026-05-26 도입). 본문 6섹션 + UX-[P-NN]-NNN ID 체계 + FRD R-NNN 매핑.
> **참조 산출물 (Confluence)**:
> - FRD: [PRJ-XQ-BASE-FRD-001 ~ 005](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5061115933) (박성운 작성, base 추출)
> - USD: [PRJ-XQ-BASE-USD](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5062459402) (P-02 ~ P-09 페르소나, SC-01 ~ SC-76 시나리오)
> - 공통 상태: [PRJ-XQ-BASE-COMMON-STATES](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5060558872)
> - 박성운 URD-001 ~ 005 (base 추출, 참고용. _삭제·수정 금지_)

## 문서 구조

xnquiz 는 Canvas LMS 의 퀴즈 화면을 LearningX 가 custom.js 로 보강한 형태(AS-IS)를 고객사 요구사항 반영 화면(TO-BE)으로 대체한다. 따라서 본 URD 는 세 가지 관점을 분리하여 작성한다.

| **폴더** | **관점** | **설명** |
|---|---|---|
| `canvas-as-is/` | Canvas 표준 (AS-IS) | Instructure Canvas LMS 원본의 동일 화면. xnquiz 가 대체하기 전 기본 동작. |
| `customjs-as-is/` | LearningX custom.js 보강분 (AS-IS) | Canvas 원본 위에 LearningX 가 `public/customs/canvas/*.js` 로 덧붙여 사용자에게 노출했던 추가 기능. 해당 화면에 적용된 custom.js 가 없으면 파일 자체를 생성하지 않는다. |
| `xnquiz-to-be/` | xnquiz (TO-BE) | 고객사 요구사항을 반영한 xnquiz 의 최종 화면. (AS-IS) 대비 개선 포인트를 본문 상단에 명시한다. |

## 작성 단위 (2026-05-21 재시작)

xnquiz URD 는 **FRD 와 함께 처음부터 같이 작성**한다. 박성운 작성 base URD 는 Canvas baseline 추출이므로 참고만 하고, PD URD 는 FRD 의 _PCD 반영 / xnquiz 자체 도출 [C] 개선_ 이 확정된 시점에 작성한다. 즉 FRD 와 URD 를 동시 진행하며, _FRD 의 R 항목과 URD 의 UX-NNN 항목이 한 사이클에서 정합_ 되도록 한다.

기존 화면 ID 기반 URD (S-01, S-02) 는 일단 유지하되, FRD 매핑이 결정되는 시점에 통합 정리한다.

## FRD-URD 동시 작성 현황

(작성 시작 전. FRD 부터 PD 관점에서 새로 작성)

| **FRD ID** | **영역** | **FRD 상태** | **Canvas (AS-IS) URD** | **custom.js (AS-IS) URD** | **xnquiz (TO-BE) URD** |
|---|---|---|---|---|---|
| (TBD) | (Question Bank 도메인부터 진행 예정) | 미작성 | 미작성 | 미작성 | 미작성 |

> **작성 룰**: 한 FRD ID 를 잡으면 FRD 작성 → URD 3관점 (canvas-as-is / customjs-as-is / xnquiz-to-be) 동시 진행. AS-IS / TO-BE 세트 작성 룰은 그대로 유지 (메모리 `feedback_urd_asis_tobe_pair`).

## 화면 ID 기반 작성 현황 (구 체계)

| **ID** | **화면명** | **경로** | **Canvas (AS-IS)** | **custom.js (AS-IS)** | **xnquiz (TO-BE)** |
|---|---|---|---|---|---|
| S-01 | 퀴즈 목록 | `/` | [작성 완료](canvas-as-is/S-01-quiz-list.md) | 해당 없음 (스킵 룰) | [작성 완료](xnquiz-to-be/S-01-quiz-list.md) |
| S-02 | 퀴즈 생성/편집 | `/quiz/new`, `/quiz/:id/edit` | [작성 완료](canvas-as-is/S-02-quiz-create.md) | 해당 없음 (스킵 룰) | [작성 완료](xnquiz-to-be/S-02-quiz-create.md) |
| S-03 | 퀴즈 상세 | `/quiz/:id` | 추후 | 추후 | 추후 |
| S-04 | 채점 대시보드 | `/quiz/:id/grade` | 추후 | 추후 | 추후 |
| S-05 | 통계 | `/quiz/:id/stats` | 추후 | 추후 | 추후 |
| S-06 | 퀴즈 응시 | `/quiz/:id/attempt` | 추후 | 추후 | 추후 |
| S-07 | 문제은행 목록 | `/question-banks` | 추후 | 추후 | 추후 |
| S-08 | 문제은행 상세 | `/question-banks/:id` | 추후 | 추후 | 추후 |

> **화면 ID 통합 룰 (기존)**: Canvas/custom.js (AS-IS) 가 동일 화면인데 xnquiz (TO-BE) 가 분리한 경우 (예: 생성/편집), URD 는 (AS-IS) 기준으로 하나의 화면으로 통합 명세한다.

## 작성 원칙

### 공통 (XP2 [PD] URD 작성 가이드 준수)
- 본문은 6섹션 고정: ① UX 설계 목표 ② 공통 상태 정의 ③ 역할별 UX 요구사항 ④ 공통 UX 요구사항 ⑤ 화면 구조 제안(선택) ⑥ 변경 이력
- UX 요구사항 ID 체계: `UX-[P-NN]-NNN` (역할별), `UX-COM-NNN` (공통). USD 페르소나 ID 그대로 사용
- 컴포넌트명·구현 방식 표현 금지 (예: `DateTimePicker`, `Switch`, `ConfirmDialog` 등은 본문에 쓰지 않는다). 가이드의 "URD ≠ 와이어프레임 설명서" 원칙
- 각 UX 요구사항은 FRD 의 R-NNN 항목과 매핑한다
- 항목 폐기 시 삭제하지 않고 `archived` 상태로 변경

### Canvas (AS-IS)
- Canvas Classic Quizzes 공식 소스의 동일 영역 동작만 기술한다. New Quizzes 는 대상 외
- 우리가 추가/개선한 내용을 섞지 않는다
- 박성운 작성 URD (base 추출) 의 6섹션 구조를 참고하되, _xnquiz Creator/PD 관점_ 에서 재정리한다

### custom.js (AS-IS)
- LearningX 가 `public/customs/canvas/*.js` 로 덧붙인 부분만 다룬다
- 소스 코드 자체는 본 문서에 복붙하지 않는다. 동작 명세만 요약한다
- **본 영역 URL 패턴에 직접 적용되는 custom.js 가 없으면 본 폴더에 파일을 만들지 않는다 (스킵 룰).** 운영 적용 확정인 `.example.js` 가 아닌 스크립트가 있어야 작성

### xnquiz (TO-BE)
- 본문 최상단에 "0. (AS-IS) 대비 개선 / 차이 포인트" 절을 둔다
- (AS-IS) 와의 차이를 _단순화 / 미지원 / 정책 변경 / 자체 도출 [C]_ 네 가지 성격으로 구분 표기
- xnquiz 가 결정해야 할 정책 공백은 `OQ-XN-NN` 으로 명시 (박성운의 `OQ-R-NN` / `OQ-CS-NN` 과 구분)

## 공통 사용자 역할 정의

| **코드** | **역할** | **설명** |
|---|---|---|
| **INSTRUCTOR** | 교수자 | 퀴즈 생성/편집/채점, 본인 과목 데이터 전체 권한 |
| **TA** | 조교 | 본 프로토타입 범위 외 (교수자 권한 일부 위임 예정) |
| **STUDENT** | 학습자 | 본인에게 공개된 퀴즈 응시, 본인 응시 결과 조회 |
| **ADMIN** | 운영자 | 교수자 권한 전부 포함, 추가로 시스템/학교 단위 운영 권한 |

> 권한 분기 규칙: 교수자 전용 기능은 `(INSTRUCTOR || ADMIN)` 조건으로 처리한다. ADMIN 단독 분기는 사용하지 않는다.

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** | **근거** |
|---|---|---|---|---|
| 2026-05-20 | v1 | 초안 작성. Canvas (AS-IS) / custom.js (AS-IS) / xnquiz (TO-BE) 3관점 분리. S-01 (퀴즈 목록) 작성 | 김민주 (Creator) | 초기 화면 ID(S-XX) 기반 구조 |
| 2026-05-20 | v2 | S-02 (퀴즈 생성/편집) Canvas (AS-IS) 추가. README 작성 현황 표 갱신 | 김민주 (Creator) | (AS-IS) / (TO-BE) 세트 진도 정렬 |
| 2026-05-20 | v3 | FRD 기반 작성 단위로 전환. FRD-001 (Question Bank 라이프사이클) Canvas (AS-IS) + xnquiz (TO-BE) 세트 작성. 작성 원칙을 XP2 [PD] URD 작성 가이드 (6섹션 + UX-[P-NN]-NNN ID 체계) 에 맞춰 갱신 | 김민주 (Creator/PD) | XP2 [PD] URD 작성 가이드 (2026-05-26 도입) 준수, Confluence 박성운 작성 자산(FRD-001 ~ 005 + USD + COMMON-STATES) 매핑 |
| 2026-05-20 | v4 | FRD-002 ~ FRD-005 의 Canvas (AS-IS) + xnquiz (TO-BE) 8개 문서 일괄 작성. xnquiz [C] 자체 도출 개선 (검색·필터, 일괄 업로드, 가져오기·내보내기, 랜덤 출제 다중 Bank, 난이도 메타) 반영. OQ-XN-05 ~ 11 등록 (11종 문항 / 빈 답안 자동 제거 / 영구 안내 / 문항 카드 이동·복사 / 학생별 무작위 추출 / Bank 부족 시 처리 / Learning Outcome 도입) | 김민주 (Creator/PD) | 박성운 작성 FRD-002 ~ 005 + xnquiz 현재 구현 ([QuestionBank.jsx](../../src/pages/QuestionBank.jsx), [QuestionBankList.jsx](../../src/pages/QuestionBankList.jsx), [RandomQuestionBankModal.jsx](../../src/components/RandomQuestionBankModal.jsx)) 분석 |
| 2026-05-21 | v5 | Confluence 업로드 완료. 부모 페이지 [PD URD (FRD 기반, 김민주 작성)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5064720410) 신설 + Canvas (AS-IS) / xnquiz (TO-BE) 카테고리 분리 + 10개 페이지 업로드. 로컬 README 의 작성 현황 표에 Confluence 페이지 링크 병기 | 김민주 (Creator/PD) | 박성운 작성 자산과 충돌 없는 별도 트리로 격리. 부모 페이지 [xnquiz URD - UI](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5056987161) 하위 |
| 2026-05-21 | v6 | **방향 전환**. v3~v5 에서 작성한 FRD 기반 PD URD 10개 (FRD-001 ~ 005 × Canvas AS-IS / xnquiz TO-BE) 전부 폐기. _FRD 부터 같이 작성_ 방식으로 전환 (박성운 base URD 참고만, PCD 반영된 FRD 와 URD 를 한 사이클에서 정합). Confluence 의 13개 페이지는 사용자가 UI 에서 직접 휴지통으로 이동 | 김민주 (Creator/PD) | URD 부터 작성하는 흐름의 한계 (FRD 가 base 추출 단계라 PCD/[C] 반영 전임) — FRD 부터 다시 시작 |
