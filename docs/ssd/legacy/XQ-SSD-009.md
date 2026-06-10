# XQ-SSD-009. 문제지·답안지 출력·다운로드 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 가이드 (5056888866)
> **본 SSD 범위**: XQ-URD-009 의 시험 문제지 / 학생 개인 답안지 / 다수 학생 일괄 답안지 PDF 산출을 현재 프로토타입 기준으로 명세. 채점 / 응시 본체는 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-009-v0.1 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 참조 URD | [XQ-URD-009](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5076287491) v0.4 |
| 참조 FRD | XQ-FRD-009 v0.2 |
| 참조 코드 | `src/utils/pdfUtils.js` (`printQuizQuestions`, `printBulkAnswerSheets`), `src/pages/QuizEdit.jsx` (문제지 출력 진입), `src/pages/GradingDashboard/index.jsx` (액션 메뉴) |

---

## 1. 역할별 네비게이션 구조

```
교수자:
- 문제지: QuizEdit 의 액션 또는 QuizDetail → 인쇄 진입 (`printQuizQuestions`)
- 개인 답안지: 채점 대시보드 학생 상세 → 답안지 PDF 진입
- 일괄 답안지: 채점 대시보드 액션 메뉴 → "답안지 PDF 다운로드" (`printBulkAnswerSheets`)
```

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **진입** | **연결 URD** | **우선순위** |
|---|---|---|---|---|
| SCR-I-PRINT-QUESTIONS | 문제지 PDF 산출 | QuizEdit / QuizDetail 액션 | UX-P07-001~005 | P0 |
| SCR-I-PRINT-ANSWER-SHEET | 개인 답안지 PDF 산출 | 채점 대시보드 학생 상세 | UX-P03-001~003 | P0 |
| SCR-I-PRINT-BULK-ANSWER-SHEETS | 다수 학생 일괄 답안지 PDF | 채점 대시보드 액션 메뉴 | UX-P05-001~005 | P1 |

---

## 3. 화면별 상세 설계

### SCR-I-PRINT-QUESTIONS. 문제지 PDF

**구현**: `printQuizQuestions(quiz, questions, options)` (`src/utils/pdfUtils.js`)

**진입 동작**

```
1. 사용자 액션 (예: QuizEdit 의 "문제지 PDF 다운로드")
2. 포함 정보 사전 확인 (옵션 다이얼로그, 또는 즉시 생성 - 현재 즉시 생성)
3. PDF 생성 진행 (loading state)
4. 완료 시 다운로드 또는 인쇄 다이얼로그
```

**포함 정보 사전 확인 상태** (UX-P07-002): 현재 옵션 다이얼로그 미구현 → 간극 G-1.

**기본 포함**: 문제 본문 / 배점 / 문항 메타.
**권한/시점 포함**: 정답 포함 여부 (현재 옵션 선택 UI 없음, 기본 포함 또는 미포함 정책 확정 필요 → 간극 G-2).
**제외**: 학생 응시 정보.

---

### SCR-I-PRINT-ANSWER-SHEET. 개인 답안지 PDF

**구현**: 채점 대시보드 학생 상세에서 진입 (개별 학생 인쇄 - 현재 별도 구현 여부 확인 필요).

**예외 상태 표시**

| 상태 | 표현 |
|---|---|
| 미제출 | "미제출" 표시 |
| 일부 미응답 | "미응답" 표시 |
| 채점 전 | "채점 전" 표시 |
| 첨부 답안 존재 | 별도 확보 필요 안내 또는 PDF 포함 여부 |

---

### SCR-I-PRINT-BULK-ANSWER-SHEETS. 다수 학생 일괄

**구현**: `printBulkAnswerSheets` (채점 대시보드 액션 메뉴 "답안지 PDF 다운로드")

**진입 동작**

```
1. 채점 대시보드 액션 메뉴 → "답안지 PDF 다운로드"
2. 진행 중 상태 (pdfGenerating state)
3. 완료 시 Toast
```

**포함 / 제외 학생 구분** (UX-P05-002): 현재 부분 충족. 진행 중 실패 학생 분리 표시 → 간극 G-3.

---

## 4. 반응형 분기

PDF 산출은 디바이스 무관 (다운로드 결과물).

---

## 5. 비정상 상태 UX

| 상태 | 표현 |
|---|---|
| PDF 생성 실패 | Toast "PDF 오류: {message}" + console.error |
| 부분 실패 (일괄) | 포함/제외 대상 구분 안내 (UX-COM-004) — 현재 부분 충족 |
| 출력 권한 제한 | 권한 분기 미구현 (간극 G-4) |
| 비공개 시험의 정답 포함 정책 | 운영 정책 의존 (UX-P05-005) → 간극 G-5 |

---

## 프로토타입과 URD 간극

| # | 항목 | 결정 | 상태 |
|---|---|---|---|
| G-1 | 출력 전 포함 정보 사전 확인 단계 (UX-P07-002, 가이드 §5) | (B) URD 명시 후속 | 메모리 Sprint 4 후보. 현재 즉시 생성. 옵션 다이얼로그 추가 검토 |
| G-2 | 정답 포함 여부 옵션 선택 (UX-P07-005, UX-P05-005) | (B) URD 완화 | 현재 옵션 미구현. 운영 정책 확정 후 반영 |
| G-3 | 일괄 부분 실패 학생 분리 표시 (UX-P05-002, UX-COM-004) | (A) 부분 충족 | Toast 안내만. 분리 표시 모달 미구현 |
| G-4 | 출력 권한 / 민감 정보 노출 기준 (UX-P05-004) | (B) 권한 분기 미구현 | instructor 단독 |
| G-5 | 비공개 시험 문서 확보 가능 여부 (UX-P05-005) | (B) 운영 정책 미확정 | 정책 확정 후 반영 |
| G-6 | 미제출 / 일부 미응답 / 채점 전 표시 (UX-P03-003) | (A) 부분 충족 | 답안지 PDF 안에 상태 표시 여부는 `printBulkAnswerSheets` 구현 확인 필요 |
| G-7 | 첨부 답안 존재 안내 (UX-P03-003) | (B) URD 완화 | 현재 첨부 답안 PDF 포함 여부 정책 미확정 |


| 날짜 | 버전 | 변경 내용 | 변경자 |
|---|---|---|---|
| 2026-06-04 | v0.1 | 초안 작성. 3 산출물 (문제지 / 개인 답안지 / 일괄 답안지) | 김민주 (Creator) |
