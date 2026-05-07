# xnquiz FRD - UX 개선 프로토타입

> **프로젝트**: xnquiz (LearningX 산하 Project, 2026-04)
> **Creator**: 김민주 (UX 개선 디자이너/기획자)
> **PD**: 김범수 (PCD 폴더 [5003018244](https://xinics.atlassian.net/wiki/spaces/XP2/folder/5003018244))
> **목적**: Canvas 기존 기능 재구현 + 학교 요구사항 15건 반영 + 자체 도출 UX/UI 개선 적용

## 분류 체계

| **카테고리** | **의미** | **개수** | **출처** |
|---|---|---|---|
| **A** (Canvas 기존 기능) | Canvas Quiz 가 제공하던 기능을 xn 퀴즈에서 재구현 | 12 | [Canvas 공식 가이드](https://community.canvaslms.com/) |
| **B** (학교 요구사항) | 학교가 PCD 로 요구한 신규 기능 | 15 | PCD 폴더 [5003018244](https://xinics.atlassian.net/wiki/spaces/XP2/folder/5003018244) |
| **C** (자체 도출 개선) | Canvas 기존 기능도 학교 요구도 아닌, 프로젝트 진행 중 자체 발굴한 UX/UI 개선 | 화면별 다수 | 프로젝트 자체 의사결정 |

라벨 규칙: `[A]` / `[B-#NN]` / `[C]` 를 F/D 항목 헤더에 표기.

## 산출물 위치

```
docs/frd/
├── README.md                ← 본 문서 (인덱스)
├── _template.md             ← FRD 템플릿
├── baseline-inventory.md    ← Canvas 기존 기능 12개 매핑
├── R-B-01.md                ← 학교 요구사항 #01
├── R-B-02.md                ← 학교 요구사항 #02
├── ...
└── R-B-15.md                ← 학교 요구사항 #15
```

## 학교 요구사항 (R-B) 인덱스

| **ID** | **카테고리(PCD)** | **제목** | **PCD 페이지** |
|---|---|---|---|
| R-B-01 | 문제은행/문항 자산 | 문항 메타데이터 및 분류 강화 | [5000691857](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5000691857) |
| R-B-02 | 문제은행/문항 자산 | 문제은행 그룹 복사 개선 | [5002657805](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5002657805) |
| R-B-03 | 문제은행/문항 자산 | 시험 문제 복사 개선 | [5002428457](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5002428457) |
| R-B-04 | 문제은행/문항 자산 | 문항 등록 효율화 | [5004656658](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5004656658) |
| R-B-05 | 문제은행/문항 자산 | 정답 판정 옵션 | [5004787746](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5004787746) |
| R-B-06 | 문제은행/문항 자산 | 문항 제목 설정 | [5005148199](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5005148199) |
| R-B-07 | 시험 설계/랜덤 출제 | 랜덤 출제 고도화 | [5005246509](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5005246509) |
| R-B-08 | 시험 설계/랜덤 출제 | 시험 출제 기능 직관성 개선 | [5004656675](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5004656675) |
| R-B-09 | 출력/문서화 | 출력 및 다운로드 기능 개선 | [5004722209](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5004722209) |
| R-B-10 | 채점/성적/재응시 | 부분 점수 정책 개선 | [5013635098](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5013635098) |
| R-B-11 | 채점/성적/재응시 | 조건부 퀴즈 재응시 | [5014224922](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5014224922) |
| R-B-12 | 제출물/목록 관리 | 시험 목록 화면 제공 | [5017829388](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5017829388) |
| R-B-13 | 제출물/목록 관리 | 제출물 다운로드 | [5016715342](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5016715342) |
| R-B-14 | 제출물/목록 관리 | 답변 입력 설정창 확대 | [5017567266](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5017567266) |
| R-B-15 | 제출물/목록 관리 | 답변 입력창 줄바꿈 | [5017698320](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5017698320) |

## 통과 기준 (Acceptance Criteria) 원칙

UX 개선 프로젝트라 일반 FRD 와 다르게 다음 4가지 검증 방식만 사용 (실사용자 측정 도구 없음):

| **방식** | **수행자** | **반영 위치** |
|---|---|---|
| 코드/화면 캡처 확인 | Creator 자체 | 각 R 항목 AC |
| Nielsen 휴리스틱 체크리스트 | Creator + PD | 각 R 항목 AC |
| 디자인 일관성 자체 점검 | Creator | SSD + Decision Log |
| PD 정성 검토 | PD (김범수) | 최종 승인 |

**제외**: 클릭/시간/에러율 정량 추적, A/B 테스트, 사용자 만족도 점수, 사용자 인터뷰

## 커버리지 통과 기준

| **카테고리** | **목표** |
|---|---|
| Canvas 기존 기능 (A) | 12개 중 12개 재구현 = 100% |
| 학교 요구사항 (B) | 15건 중 15건 반영 = 100% |
| 자체 도출 개선 (C) | 화면별 일관 적용 (SSD 4-3 항목 합계로 추적) |

## 작업 흐름 / 후속 산출물

1. **FRD** (현재 문서) ← 완료 1차본 (PD 검토 대기)
2. **FCL** (`plan/feature-list.json`) - FRD 에서 자동 파생 (다음 단계)
3. **FSD** (`docs/fsd/`) - 기능별 Before/After 플로우 비교
4. **SSD** (`docs/ssd/`) - 화면별 Before/After 캡처 + UI 변경 포인트
5. **Decision Log** (`docs/decision-log/`) - 디자인 의사결정 누적

## 산출물 책임 분담

| **산출물** | **담당** |
|---|---|
| FRD, FCL, FSD, SSD, Decision Log | 본 Creator (UX 디자이너) |
| ARD (Architecture) | 백엔드 Creator + LearningX Product 단위 |
| ASD (API), DSD (Data) | 백엔드 Creator |
| PCD, USD | PD (김범수) |
| Eval Report | Creator (반드시 새 Claude 세션에서 작성) |
