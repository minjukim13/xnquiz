# XQ-SSD-001. 문항·문제은행 난이도 메타데이터 관리 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 가이드 (5056888866)
> **본 SSD 범위**: XQ-URD-001 의 난이도 메타데이터(상/중/하/미설정) 를 문항 작성 / 문제모음 그룹 / Bank 안 문항 목록 / Quiz 편집 Find Questions 4 지점에 명세. 작성 본체는 SSD-024/028, 문제모음 화면은 SSD-020 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-001-v0.1 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-001](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5075566595) v0.x |
| 참조 FRD | XQ-FRD-001 v0.5 |
| 참조 코드 | `src/components/AddQuestionModal.jsx` (difficulty 필드), `src/pages/QuestionBank.jsx`, `src/pages/QuestionBankList.jsx`, `src/components/QuestionBankModal.jsx`, `src/components/RandomQuestionBankModal.jsx` |

---

## 1. 역할별 네비게이션 구조 (요약)

본 SSD 는 난이도 표시/조작이 노출되는 4 지점만 다룸. 각 지점의 진입 본체는 위임 SSD 참조.

```
교수자:
- 문항 단위 난이도 등록/수정: AddQuestionModal (SSD-024 의 difficulty 필드)
- 그룹 난이도 등록/수정: QuestionBankList 카드 / QuestionBank 상세 (SSD-020)
- Bank 안 문항 목록 난이도 필터: QuestionBank 상세 필터 (SSD-020)
- Quiz Find Questions 난이도 필터: QuestionBankModal / RandomQuestionBankModal (SSD-024)

학생: 난이도 표시 대상 외 (학생 응시 화면에는 난이도 미노출)
```

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **위치** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|
| SCR-I-DIFFICULTY-QUESTION | 문항 단위 난이도 등록 | AddQuestionModal 안 (SSD-024 위임) | UX-P02-001~005 | P0 |
| SCR-I-DIFFICULTY-GROUP | 문제모음 그룹 난이도 등록 | QuestionBankList / QuestionBank 상세 | UX-P02-006~009 | P0 |
| SCR-I-DIFFICULTY-FILTER-BANK | Bank 안 문항 목록 난이도 필터 | QuestionBank 상세 필터 영역 | UX-P02-010/011, UX-P03-001 | P0 |
| SCR-I-DIFFICULTY-FILTER-GROUP | 문제은행 목록 그룹 난이도 필터 | QuestionBankList 필터 영역 | UX-P02-012/013 | P1 |
| SCR-I-DIFFICULTY-FILTER-FIND | Find Questions 난이도 필터 | QuestionBankModal / RandomQuestionBankModal | UX-P02-014 | P0 |

---

## 3. 화면별 상세 설계

### SCR-I-DIFFICULTY-QUESTION. 문항 단위 난이도 등록

**구현**: AddQuestionModal 의 `form.difficulty` 필드 (DropdownSelect). 4 옵션 (미설정 / 상 / 중 / 하).

| 상태 | 표현 |
|---|---|
| 미설정 | DropdownSelect 기본값 "미설정" 노출 (4번째 단계 아님, 배지 시각 위계 구분 — 간극 G-1) |
| 상/중/하 | 단계 라벨 표시 |
| "미설정으로 되돌리기" | DropdownSelect 에서 "미설정" 재선택 (UX-P02-004) |
| 읽기 전용 | (현재 권한 분기 미구현, 간극 G-2) |

---

### SCR-I-DIFFICULTY-GROUP. 그룹 난이도 등록

**구현**: QuestionBankList / QuestionBank 의 모음 카드 또는 상세 헤더의 난이도 입력. 그룹 난이도는 **독립 입력값** (UX-P02-008/009 — 하위 문항 변경 시 자동 변경 안 됨).

| 상태 | 표현 |
|---|---|
| 그룹 난이도 미설정 | "미설정" 배지 |
| 그룹 난이도 등록 | 상/중/하 배지 |
| 혼재 / 불일치 허용 | 그룹 난이도와 하위 문항 난이도가 달라도 정상 (UX-P02-009) |

---

### SCR-I-DIFFICULTY-FILTER-BANK / GROUP / FIND. 난이도 필터

**구현 (Bank 문항)**: QuestionBank 상세의 난이도 필터 DropdownSelect (전체 / 상 / 중 / 하 / 미설정 5종)
**구현 (그룹 목록)**: QuestionBankList 의 그룹 난이도 필터
**구현 (Find Questions)**: QuestionBankModal / RandomQuestionBankModal 의 난이도 필터

| 상태 | 표현 |
|---|---|
| 결과 있음 | 필터링된 문항/그룹 노출 |
| 결과 없음 | "조건에 맞는 결과 없음" 빈 상태 |
| 미설정 한정 | 필터 옵션 "미설정" 선택 시 미설정 항목만 (UX-P02-011/013) |
| 필터 유지 | 화면 간 이동 시 사용자가 변경할 때까지 유지 (UX-COM-006) |

---

## 4. 반응형 분기

| 디바이스 | 변화 |
|---|---|
| 모바일 | 필터 DropdownSelect 1열, 난이도 배지 자동 줄바꿈 |
| 태블릿/데스크톱 | 필터 inline |

---

## 5. 비정상 상태 UX

| 상태 | 표현 |
|---|---|
| 필터 결과 없음 | "조건에 맞는 결과 없음" + 조건 해제 링크 |
| 권한 없는 사용자 | 등록/수정 UI 비활성 (간극 G-2) |
| "미설정" 시각 위계 | 4번째 단계로 오해되지 않게 표현 — 현재 시각 위계 구분 명확성 확인 필요 (간극 G-1) |

---

## 프로토타입과 URD 간극

| # | 항목 | 결정 | 상태 |
|---|---|---|---|
| G-1 | "미설정" 시각 위계 구분 (UX-COM-002) | (A) 부분 충족 | 현재 DropdownSelect 옵션 라벨로 표시. 배지 시각 위계는 추가 검토 |
| G-2 | 읽기 전용 권한 분기 (UX-P05-004) | (B) URD 완화 | **URD-001 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 (공통 권한 모델 가이드 참조) |
| G-3 | 그룹-문항 정합 상태 표시 (혼재/불일치) | (B) URD 완화 | 현재 별도 시각 표시 없음. 운영상 정상 상태로 처리. URD 본문 그대로 유지 |
| G-4 | 다강의 강사(P-03) 공용 풀 탐색 | (B) URD 완화 | **URD-001 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 (공통 권한 모델 가이드 참조) |


| 날짜 | 버전 | 변경 내용 | 변경자 |
|---|---|---|---|
| 2026-06-04 | v0.1 | 초안 작성. 난이도 등록 2 화면 + 필터 3 화면. 그룹-문항 독립 입력값 원칙 반영 | 김민주 (Creator) |
