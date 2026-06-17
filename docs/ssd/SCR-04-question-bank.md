# SCR-04. 문제은행 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 문제은행 목록(`/question-banks`) + 문제모음 상세(`/question-banks/:bankId`) + 가져오기/내보내기/일괄 업로드 모달 통합. 문제모음을 시험에 가져오는 모달(QuestionBankModal/RandomQuestionBankModal) 은 SCR-03 위임. 문항 작성 본체는 SCR-03 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-04-v1.1 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-001](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5075566595) v1.0 (그룹/필터), [XQ-URD-020](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5080055816) v1.0, [XQ-URD-029](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5082087432) v0.3 |
| 참조 코드 | `src/pages/QuestionBankList.jsx`, `src/pages/QuestionBank.jsx`, `src/components/BankUploadModal.jsx`, `src/components/QuestionBankModal.jsx`, `src/utils/excelUtils.js` (`parseExcelOrCsv`) |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
LTI 탭 "문제모음" → /question-banks (SCR-I-BANK-LIST)
                       ├── 현재 과목 문제모음 카드 목록
                       ├── "새 문제모음" (이름 + 난이도 입력)
                       └── 카드 클릭 → 문제모음 상세 (/question-banks/:bankId, SCR-I-BANK-DETAIL)
                            ├── 문제모음명 인라인 편집
                            ├── 문항 리스트 (탐색/필터/검색/난이도 배지)
                            ├── "새 문항 추가" → AddQuestionModal (SCR-03)
                            ├── "일괄 업로드" → SCR-I-BANK-UPLOAD (3단계 모달)
                            ├── "가져오기" → SCR-I-BANK-IMPORT
                            ├── "내보내기" → SCR-I-BANK-EXPORT
                            └── 복사 / 삭제

학생 (student):
LTI 탭 "문제모음" 진입점 미노출. 직접 URL 시 `<Navigate to="/" replace />`.

진입 경로: Canvas LTI 컨테이너가 상단 "퀴즈 / 문제모음" 탭을 제공 (xnquiz 프로토타입에는 좌측 사이드바 없음, D-006).

핵심 태스크 클릭 뎁스:
- 문제은행 진입: LTI 탭 → 문제모음 (1단계)
- 문항 추가: 문제모음 → 모음 → 새 문항 (3단계)
- 일괄 업로드: 문제모음 → 모음 → 일괄 업로드 (3단계)
- 다른 과목에서 가져오기: 문제모음 → 모음 → 가져오기 → 출처 → 문항 선택 → 추가 (6단계)
```

**도달 원칙**

- 교수자 전용. 학생은 진입점 미노출 + 직접 URL 리다이렉트.
- 현재 과목 자산을 단일 목록으로 표시. 다른 과목 자산은 가져오기 출처 / 내보내기 대상으로만 인지.
- 일괄 업로드: 차단 오류 1건 이상 → 전체 보류. 경고만 (난이도 불일치 등) → 사용자 확인 후 등록 진행 허용.
- 난이도 메타: 그룹 난이도와 문항 난이도는 **독립 입력값** (UX-P02-008/009).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트 / 진입** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-BANK-LIST | 문제은행 목록 | `/question-banks` | 교수자 | UX-P02-001~003/010~012/020~021/030~032 (URD-020), UX-P02-012/013 (URD-001) | P0 |
| SCR-I-BANK-DETAIL | 문제모음 상세 | `/question-banks/:bankId` | 교수자 | UX-P02-040~042/050~052/060~063/070/080~082 (URD-020), UX-P02-001~011 (URD-001) | P0 |
| SCR-I-BANK-IMPORT | 가져오기 모달 | 상세 안의 "가져오기" 액션 | 교수자 | UX-P02-040, UX-P03-001/002, UX-P02-042 (URD-020) | P0 |
| SCR-I-BANK-EXPORT | 내보내기 모달 | 상세 안의 "내보내기" 액션 | 교수자 | UX-P02-041/042 (URD-020) | P1 |
| SCR-I-BANK-UPLOAD | 일괄 업로드 모달 (3단계) | 상세 안의 "일괄 업로드" 액션 | 교수자 | UX-P02-001~002/010~011/020/030~031/040~043/050~053/060~061 (URD-029) | P0 |

---

## 3. 화면별 상세 설계

### SCR-I-BANK-LIST. 문제은행 목록

**구현 파일**: `src/pages/QuestionBankList.jsx`

**레이아웃**

```
[헤더]
  └── h1 "문제은행" + "새 문제모음" 버튼

[필터/검색 행]
  ├── 검색 (모음명)
  ├── 그룹 난이도 필터 (전체 / 미설정 / 상 / 중 / 하)
  └── 정렬 드롭다운

[목록]
  └── 문제모음 카드 × N
       ├── 문제모음명 (인라인 편집 가능)
       ├── 난이도 배지 (미설정 / 상 / 중 / 하)
       ├── 문항 수 (active 기준)
       └── 카드 메뉴 (복사 / 삭제 / 가져오기 / 상세 진입)

[빈 상태]
  ├── 문제모음 0개 → "첫 문제모음을 만들어보세요" CTA
  └── 조건 결과 0개 → "조건에 맞는 결과 없음" + 조건 해제 링크
```

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | "새 문제모음" 클릭 | 신규 생성 모달 (이름 + 난이도 입력). 이름 빈 값 시 생성 불가 |
| I-2 | 카드 클릭 | `/question-banks/:bankId` 이동 |
| I-3 | 문제모음명 인라인 편집 | 편집 중 / 저장 완료 / 저장 실패 / 취소 상태 구분 (UX-P02-021) |
| I-4 | 카드 메뉴 - 복사 | 복사 실행 → 결과 안내 (복사된 모음 위치 + 후속 이동 링크) |
| I-5 | 카드 메뉴 - 삭제 | ConfirmDialog → 삭제 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 | `listBanks()` | `GET /api/banks` (선택 `?courseId=`) | 카드 그리드 렌더. `usedInQuizIds` 파생 필드 표시 | QuestionBank |
| D-2 | "새 문제모음" 생성 | `createBank({ name, courseId, difficulty })` | `POST /api/banks` | 카드 추가 + Toast NOT-TOAST-07 + 바로가기 액션 | QuestionBank |
| D-3 | 인라인 편집 (이름 변경) | `updateBank(id, { name })` | `PATCH /api/banks/:id` | 카드 갱신 | QuestionBank |
| D-4 | 카드 메뉴 - 복사 | `getBankQuestions(srcId)` + `createBank` + 문항 일괄 복사 | `POST /api/banks/:id/copy` 권고 (단일 트랜잭션) | 신규 카드 추가 + Toast | QuestionBank, BankQuestion |
| D-5 | 카드 메뉴 - 삭제 | `deleteBank(id)` | `DELETE /api/banks/:id` | 카드 제거 + Toast. 사용 중인 시험 영향은 OQ-DD-05 정책 결정 의존 (CES-H-02) | QuestionBank |

**예상 권한 검증**: `(instructor || admin)` + 담당 코스 권한.

---

### SCR-I-BANK-DETAIL. 문제모음 상세

**구현 파일**: `src/pages/QuestionBank.jsx`

**레이아웃**

```
[헤더]
  ├── 좌측: 목록 복귀
  ├── 문제모음명 (인라인 편집)
  ├── 그룹 난이도 배지 (상/중/하/미설정)
  └── 우측 액션: 가져오기 / 내보내기 / 일괄 업로드 / 복사 / 삭제

[안내 박스] "문항 수정은 기존 퀴즈에 자동 반영되지 않습니다" (UX-P02-052)

[필터/검색 행]
  ├── 검색 (본문/제목)
  ├── 유형 필터 (12 유형)
  └── 난이도 필터 (전체 / 미설정 / 상 / 중 / 하) — UX-P02-010

[문항 리스트]
  ├── 문항 카드 × N
  │    ├── 번호 + 유형 배지 + 문항 난이도 배지 + 배점
  │    ├── 본문 요약 (htmlToPlainText, line-clamp)
  │    └── 액션 (편집 Pencil → SCR-03 / 삭제 Trash2)
  ├── 드래그 정렬 (필터/검색 미적용 시만)
  └── "새 문항 추가" 진입점 (AddQuestionModal, SCR-03)

[빈 상태]
  ├── 문항 0개 → "첫 문항을 추가하세요" CTA
  └── 검색/필터 결과 0개 → 조건 해제 안내
```

**난이도 상태 표시 (URD-001 흡수)**

| **상태** | **표현** |
|---|---|
| 그룹 난이도 미설정 | "미설정" 배지 (DropdownSelect 옵션 라벨) |
| 그룹 난이도 등록 | 상/중/하 배지 |
| 혼재 / 불일치 | 그룹 난이도와 하위 문항 난이도가 달라도 정상 (UX-P02-009) |
| 문항 난이도 미설정 | DropdownSelect 기본값 "미설정" |
| 필터 "미설정" 선택 | 미설정 문항만 노출 (UX-P02-011) |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 인라인 편집 | 문제모음명 갱신, 상태 표시 |
| I-2 | "가져오기" / "내보내기" 클릭 | 각 모달 진입 (SCR-I-BANK-IMPORT / EXPORT) |
| I-3 | "일괄 업로드" 클릭 | BankUploadModal 진입 (SCR-I-BANK-UPLOAD) |
| I-4 | 필터/검색 적용 | 결과 갱신. 드래그 정렬 비활성 (UX-P02-070) |
| I-5 | 문항 편집 (Pencil) | AddQuestionModal 수정 모드 (SCR-03). 유형 변경 차단 (UX-P02-081) |
| I-6 | 문항 키보드 진입 (Tab + Enter) | 편집 진입 가능 (UX-P02-082) |
| I-7 | "새 문항 추가" 클릭 | AddQuestionModal 신규 모드 (SCR-03) |
| I-8 | 난이도 지정 모음에 난이도 다른 문항 추가 시도 | 충돌 안내 (UX-COM-006). 일괄 업로드 흐름은 경고 후 진행 허용 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 (`/question-banks/:bankId`) | `MOCK_BANKS.find(bankId)` + `MOCK_BANK_QUESTIONS.filter(bankId)` | `GET /api/banks/:bankId` + `GET /api/banks/:bankId/questions` | 헤더 + 안내 박스 + 문항 리스트 렌더 | QuestionBank, BankQuestion |
| D-2 | 인라인 편집 (이름/난이도) | `updateBank(bankId, body)` | `PATCH /api/banks/:bankId` | 헤더 갱신 | QuestionBank |
| D-3 | "새 문항 추가" → AddQuestionModal | (SCR-03 D 흐름 참조). 콜백 후 `createBankQuestion(bankId, body)` | `POST /api/banks/:bankId/questions` | 문항 리스트에 추가 | BankQuestion |
| D-4 | 문항 편집 (Pencil) → AddQuestionModal | 콜백 후 `updateBankQuestion(qId, body)` | `PATCH /api/banks/:bankId/questions/:qId` | 카드 갱신. 본문 변경은 시험에 자동 반영 안 됨 (안내 박스 카피) | BankQuestion |
| D-5 | 문항 삭제 (Trash2) | mock 배열에서 제거 | `DELETE /api/banks/:bankId/questions/:qId` | 카드 제거 | BankQuestion |
| D-6 | 필터/검색 | 클라이언트 필터링 | 동일 (또는 서버 쿼리 파라미터) | 결과 갱신 | BankQuestion |

**예상 권한 검증**: D-1 (SCR-I-BANK-LIST) 와 동일.

---

### SCR-I-BANK-IMPORT. 가져오기 모달

**구현 파일**: `src/components/QuestionBankModal.jsx` (혹은 QuestionBank 자체 가져오기 분기)

**레이아웃 (요약)**

```
[Dialog]
[Body]
  ├── 출처 선택: 다른 과목 → 다른 문제모음 (권한 있는 범위만 노출)
  ├── 문항 리스트 (체크박스 다중 선택)
  └── 권한 없는 출처 안내 (UX-P03-001)
[Footer] 취소 / 선택 문항 가져오기
```

**상태**

| **상태** | **표현** |
|---|---|
| 권한 분기 | 권한 있는 출처만 노출. 권한 없는 출처는 비노출 또는 사유 안내 |
| 난이도 충돌 | 가져올 문항 난이도가 대상 모음 그룹 난이도와 다른 경우 안내 |
| 부분 실패 결과 | 성공 N건 / 실패 M건 + 실패 사유 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 모달 진입 | `listBanks()` (다른 과목 권한 분기) | `GET /api/banks?accessible=true` | 출처 후보 트리 렌더 | QuestionBank |
| D-2 | 출처 선택 | `getBankQuestions(srcBankId)` | `GET /api/banks/:srcBankId/questions` | 문항 리스트 렌더 | BankQuestion |
| D-3 | "선택 문항 가져오기" | 선택 문항을 대상 은행으로 `createBankQuestion` 반복 | `POST /api/banks/:targetBankId/import { sourceQuestionIds }` (단일 트랜잭션 권고) | 결과 안내 (성공/실패 카운트) + Toast NOT-TOAST-07 | BankQuestion |

---

### SCR-I-BANK-EXPORT. 내보내기 모달

**범위**: 대상 과목/모음 선택 또는 신규 생성 + 결과 안내 (UX-P02-041/042). 현재 프로토타입 구현 여부 확인 필요 → 간극 G-2.

**데이터 흐름** (구현 시 권고)

| **단계** | **트리거** | **호출 (api)** | **응답 처리** | **관련 엔티티** |
|---|---|---|---|---|
| D-1 | 모달 진입 | `GET /api/banks?accessible=true` | 대상 후보 트리 + 신규 생성 옵션 | QuestionBank |
| D-2 | 대상 선택 + 내보내기 | `POST /api/banks/:targetBankId/import { sourceBankId, questionIds }` 또는 신규 생성 후 동일 | 결과 안내 + Toast NOT-TOAST-07 | BankQuestion |

---

### SCR-I-BANK-UPLOAD. 일괄 업로드 모달 (3단계)

**구현 파일**: `src/components/BankUploadModal.jsx`

**목적**

대상 문제모음에 다량 문항을 양식 기반으로 등록. 사전 검증 결과를 행 단위로 안내. 차단 오류 시 전체 보류, 경고만 있는 경우 사용자 진행 허용.

**레이아웃 (3단계 분리)**

```
[Dialog]
[Header] DialogTitle "{모음명} 에 일괄 업로드"

[Step 1: 양식 안내]
  ├── 표준 양식 다운로드 버튼 (.xlsx)
  ├── 필수 정보 안내 (질문 / 정답 / 유형 / 난이도 선택 / 배점 선택)
  ├── 1차 지원 유형 안내 (객관식 / OX / 단답형)
  ├── 고급 요소 1차 미포함 안내 (이미지, 수식, 복합 피드백)
  ├── 지원 파일 형식 (.xlsx / .xls / .csv)
  └── "다음 단계: 파일 선택"

[Step 2: 파일 업로드 + 사전 검증]
  ├── 대상 모음명 확인 ("{모음명} 에 등록됩니다")
  ├── 파일 선택 영역 (drag&drop 또는 파일 선택 버튼)
  ├── 선택된 파일명 + 파일 크기
  ├── 검증 중 상태 (로딩)
  └── "검증 시작" / "이전 단계"

[Step 3: 검증 결과]
  ├── 요약 카드
  │    ├── 등록 가능 후보 N문항 (success)
  │    └── 수정 필요 M문항 (warning)
  ├── 차단 오류 안내 (있는 경우)
  │    ├── 전체 보류 안내 (warning-bg + AlertTriangle)
  │    └── "어떤 문항도 모음에 등록되지 않습니다" 카피
  ├── 경고 안내 (있는 경우, 난이도 불일치 등)
  │    └── "확인 후 등록 진행 가능" 카피
  ├── 행 단위 오류 리스트
  │    ├── 행 번호 / 열·정보 / 오류 종류 (차단/경고 배지) / 수정 안내
  └── 액션
       ├── 차단 오류 있음: "이전 단계 (수정 후 재업로드)" 만 활성
       └── 경고만 또는 오류 없음: "이전" + "등록 진행" 활성

[등록 완료]
  ├── AlertDialog "등록 완료" + N문항 등록됨
  └── 모달 닫힘 → 문제모음 상세에서 확인
```

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | Step 1 "다음 단계" | Step 2 로 전환 |
| I-2 | 표준 양식 다운로드 | `.xlsx` 양식 파일 다운로드 |
| I-3 | 파일 선택 (Step 2) | 파일명/크기 표시. 지원 형식 외 거부 + 안내 |
| I-4 | "검증 시작" | `parseExcelOrCsv` 실행 → 행 단위로 차단 / 경고 분류 |
| I-5 | Step 3 진입 | 요약 + 행 단위 오류 리스트 |
| I-6 | "이전" | 이전 단계 복귀 (파일/결과 보존) |
| I-7 | "등록 진행" (차단 0건) | 등록 실행 → 등록 완료 AlertDialog → 모달 닫힘 |
| I-8 | 차단 오류 있음 + 등록 시도 | 버튼 disabled |

**상태**

| **상태** | **표현** |
|---|---|
| Step 1 양식 안내 | 양식 다운로드 + 1차 지원 유형 안내 |
| Step 2 파일 미선택 | "검증 시작" disabled |
| Step 2 파일 선택됨 | 파일명/크기 표시 + 검증 시작 활성 |
| Step 2 검증 중 | 로딩 표시 |
| Step 3 결과 - 오류 0건 | success 요약 + "등록 진행" 활성 |
| Step 3 결과 - 경고만 | warning 요약 + "확인 후 등록 진행 가능" + "등록 진행" 활성 |
| Step 3 결과 - 차단 1건 이상 | warning-bg 전체 보류 + "등록 진행" disabled |
| 등록 완료 | AlertDialog + 모음 이동 안내 |
| 파일 형식 미지원 | "사용 가능한 형식: .xlsx / .xls / .csv" |
| 모음 난이도 미설정 | 난이도 일치 검증 미수행 안내 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 표준 양식 다운로드 | 정적 파일 응답 | `GET /api/banks/upload/template.xlsx` 또는 정적 호스팅 | 브라우저 다운로드 | (해당 없음) |
| D-2 | "검증 시작" (Step 2) | 클라이언트 `parseExcelOrCsv(file)` | (백엔드 권고) `POST /api/banks/:bankId/upload/dry-run { file }` 으로 서버 검증 | 행 단위 차단/경고 분류 결과 반환 | BankQuestion (검증만) |
| D-3 | "등록 진행" (Step 3, 차단 0건) | mock 배열에 일괄 추가 | `POST /api/banks/:bankId/upload { rows }` (트랜잭션) | 등록 완료 AlertDialog + 카운트 + Toast | BankQuestion |

**검증 룰** (서버 권고)

- 필수: 질문 / 정답 / 유형
- 선택: 난이도 / 배점
- 차단 (전체 보류): 필수 누락, 유형 비지원, 정답 파싱 실패
- 경고 (진행 허용): 난이도 불일치, 배점 미입력 (기본값 적용)

---

## 사용 컴포넌트 (DS Baseline 참조, 5 화면 공통)

| **컴포넌트** | **용도** |
|---|---|
| `Button` (shadcn) | 새 문제모음 / 카드 액션 / 단계 이동 / 양식 다운로드 |
| `Card` (shadcn) | 모음 카드 / 문항 카드 |
| `Badge` (shadcn) | 난이도 / 유형 / 차단 vs 경고 |
| `Input` (shadcn) | 검색 / 인라인 편집 |
| `DropdownSelect` (내부) | 정렬 / 유형 필터 / 난이도 필터 |
| `DropdownMenu` (shadcn) | 카드 메뉴 |
| `Dialog` / `DialogHeader` 외 (shadcn) | 가져오기 / 내보내기 / 일괄 업로드 모달 |
| native file input / drag&drop | 일괄 업로드 파일 선택 |
| `parseExcelOrCsv` | `src/utils/excelUtils.js` 의 검증 함수 |
| `AlertDialog` (내부) | 등록 완료 안내 |
| `ConfirmDialog` (내부) | 삭제 확인 |
| `Skeleton` (shadcn) | 초기 로딩 |
| `Toast` (shadcn) | 액션 결과 |
| Lucide icons | Upload / FileText / AlertTriangle / CheckCircle2 / Pencil / Trash2 / 등 |

---

## 4. 반응형 분기

| **디바이스** | **너비** | **목록** | **상세** | **일괄 업로드** |
|---|---|---|---|---|
| 모바일 | ~767px | 카드 1열, 메뉴 popover | 문항 카드 1열, 액션 자동 줄바꿈 | Dialog 전폭, 본문 1열, 오류 리스트 카드형 |
| 태블릿 | 768~1023px | 카드 2열 | 문항 카드 1열 | Dialog max-w-xl |
| 데스크톱 | 1024px~ | 카드 3~4열 | 문항 카드 1열 | Dialog max-w-2xl |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | 초기 fetch | Skeleton (목록/상세) |
| 빈 상태 (문제모음 없음) | mockBanks 0건 | "첫 문제모음을 만들어보세요" + CTA |
| 빈 상태 (조건 결과 없음) | 검색/필터 결과 0건 | "조건에 맞는 결과 없음" + 조건 해제 |
| 빈 상태 (문항 없음, 상세) | mockBankQuestions 0건 | "첫 문항을 추가하세요" + CTA |
| 에러 (자산 흐름 실패) | 복사/가져오기/내보내기 실패 | Toast 또는 결과 모달 |
| 에러 (자산 흐름 부분 실패) | 성공 + 실패 혼재 | "성공 N건 / 실패 M건" 분리 표시 + 실패 사유 |
| 에러 (일괄 업로드 차단 오류) | 검증 결과 차단 1건 이상 | 전체 보류 + "어떤 문항도 등록되지 않음" + 이전 복귀 |
| 에러 (양식 다운로드 실패) | 양식 다운로드 throw | Toast 안내 |
| 에러 (파일 형식 미지원) | 지원 외 확장자 선택 | "사용 가능한 형식: .xlsx / .xls / .csv" |
| 에러 (구조적 양식 오류) | parseExcelOrCsv 실패 | "양식이 일치하지 않습니다" + 양식 재다운로드 권장 |
| 권한 없음 (학생 직접 URL) | role !== 'instructor' | `<Navigate to="/" replace />` |
| 권한 불가 출처 (가져오기) | 모달 출처 분기 | 비노출 또는 사유 안내 (UX-P03-001) |
| 존재하지 않는 모음 진입 | bankId 일치 0건 | 회복 경로 (목록 페이지로 이동) |
| 오프라인 | API 모드 한정 | mock 모드 해당 없음 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | TA(P-03) / 운영자(P-05) 권한 분기 | (A) 충족 | Canvas 권한 비트 위임 (공통 권한 가이드 참조). 운영자=교수자 권한 동등 |
| G-2 | 내보내기 모달 구현 | (B) 백로그 확인 | 현재 프로토타입 별도 모달 구현 여부 확인 필요. 미구현 시 백로그 |
| G-3 | "미설정" 시각 위계 구분 (UX-COM-002 URD-001) | (A) 부분 충족 | 현재 DropdownSelect 옵션 라벨. 배지 시각 위계는 추가 검토 |
| G-4 | 키보드 진입 (UX-P02-082) | (A) 부분 충족 | 일반 keyboard accessibility 는 native button. 명시 shortcut 미구현 |
| G-5 | 자산 흐름 부분 실패 안내 (UX-COM-004) | (A) 부분 충족 | URD-020 v0.5 — mock 모드 한정 시뮬레이션. API 모드 보강 |
| G-6 | 파일 크기 / 문항 수 상한 (UX-P02-053) | (B) 정책 미확정 | 운영 정책 확정 후 반영 |
| G-7 | QTI 가져오기 경로 구분 (UX-P02-061) | (B) 백로그 | 현재 QTI 가져오기 미구현. base FRD-034 책임 |
| G-8 | 그룹-문항 정합 상태 표시 (혼재/불일치) | (A) 충족 | 운영상 정상 상태. URD-001 v1.0 본문 유지 |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 5 화면(BANK-LIST/BANK-DETAIL/BANK-IMPORT/BANK-EXPORT/BANK-UPLOAD) 각각에 데이터 흐름 절 추가. mock/api 분기 + 데이터 사전 v0.1 엔티티 매핑 + 권한 검증 + 검증 룰 권고 포함 | 김민주 (Creator/PD) |
