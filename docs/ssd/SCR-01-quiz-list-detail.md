# SCR-01. 시험 목록·상세 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 시험 목록(`/`) + 시험 상세(`/quiz/:id`) 의 교수자/학생 분기 명세. 작성·편집 본체는 SCR-02, 채점/통계/모니터 본체는 SCR-06/07/08 위임. 운영 설정 본체는 SCR-02 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-01-v1.1 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-018](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5082054658) v1.0 |
| 참조 코드 | `src/pages/QuizList.jsx`, `src/pages/QuizDetail.jsx`, `src/components/StatusBadge.jsx`, `src/components/QuizSettingsDialog.jsx` |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
홈(시험 목록 /) → [필터/정렬/검색] → 카드 클릭 → 시험 상세 (/quiz/:id)
                                                ├ 5그룹 정보 (주요/응시 조건/응시 정책/성적 공개/접근 제한)
                                                ├ 문항 구성 영역
                                                └ 작업 진입 (편집 SCR-02 / 채점 SCR-06 / 통계 SCR-07 / 삭제)
   ├ "새 시험" → SCR-02 (/quiz/new)
   ├ "가져오기" → 가져오기 모달
   └ 톱니바퀴 → SCR-05 (QuizSettingsDialog)

학생 (student):
홈(시험 목록 /) → 카드 클릭 → 학생 시험 상세 (/quiz/:id, 학생 뷰)
                              ├ 응시 정보 / 본인 응시 결과 / 접근 제한 안내
                              └ "응시 시작" → SCR-09

핵심 태스크 클릭 뎁스:
- 교수자: 채점 진입 = 시험 목록 → 카드 메뉴 → 채점 (3단계)
- 학생: 응시 시작 = 시험 목록 → 카드 → 응시 시작 (3단계)
```

**도달 원칙**

- 단일 라우트(`/quiz/:id`) 가 역할별 분기 (instructor → 교수자 뷰, student → 학생 뷰).
- 진행 상태(StatusBadge) 와 공개 상태(VisibilityBadge) 는 별도 컴포넌트로 분리 표시 (UX-COM-002).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-QUIZLIST | 시험 목록 (교수자) | `/` | 교수자 | UX-P07-001/002/010~012/020/021, UX-P05-010 | P0 |
| SCR-L-QUIZLIST | 시험 목록 (학생) | `/` | 학생 | UX-P08-001/002/003/004 | P0 |
| SCR-I-QUIZDETAIL | 시험 상세 (교수자) | `/quiz/:id` | 교수자 | UX-COM-010/011, UX-P07-030/040/041/050~052 | P0 |
| SCR-L-QUIZDETAIL | 시험 상세 (학생) | `/quiz/:id` | 학생 | UX-COM-010/011, UX-P08-010/011 | P0 |

---

## 3. 화면별 상세 설계

### SCR-I-QUIZLIST. 시험 목록 (교수자)

**구현 파일**: `src/pages/QuizList.jsx`

**레이아웃**

```
[헤더]
  ├── h1 "퀴즈 관리"
  └── 우측 액션: 톱니바퀴 (SCR-05 진입) + "가져오기" + "새 시험" (→ SCR-02)

[필터/정렬 행]
  ├── WeekSessionFilter (주차 / 차시 드롭다운, 미지정 옵션 포함)
  └── 정렬 드롭다운 (최근 생성 / 주차 오름차순 / 주차 내림차순 / 마감 임박순)

[카드 그리드]
  └── 퀴즈 카드 × N
       ├── 카드 헤더 (제목 + StatusBadge + D-day 배지)
       ├── 카드 메타 (주차/차시 / 응시 기간 / 지각 정책 / VisibilityBadge)
       ├── 인라인 운영 성과 (응시율 / 응시 인원 / 미제출 / 평균 점수)
       └── 카드 메뉴 (점 3개)
            ├── 편집 (status === 'draft' || (instructor && !응시자))
            ├── 미리보기
            ├── 복사
            ├── 학생에게 공개 / 숨기기 (visible 토글)
            ├── 채점 (status !== 'draft')
            ├── 통계 (마감 또는 진행 중)
            └── 삭제

[빈 상태]
  ├── 시험 없음 → "아직 등록된 퀴즈가 없습니다" + 새 시험 만들기 CTA
  └── 필터 결과 없음 → "해당 조건의 퀴즈가 없습니다" + 필터 초기화 링크
```

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 임시저장 | quiz.status === 'draft' | StatusBadge "초안" + 학생 자동 비공개 |
| 예정 | startDate 미래 | "예정" + 시작 D-day |
| 진행중 | 응시 가능 기간 중 | "진행중" + 마감 D-day |
| 마감 | 마감일 경과 | "마감" |
| 이용 종료 | lockDate 경과 | "이용 종료" (우선순위 적용) |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 | `listQuizzes()` → mockQuizzes 동기 반환 | `GET /api/quizzes` (선택 `?courseCode=`) | 카드 그리드 렌더. 필터/정렬은 클라이언트 처리 | Quiz (3.4 전체) |
| D-2 | 카드 "복사" | `mockAdd(quiz)` + `mockSetQuestions(newId, qs)` | `POST /api/quizzes` + `PUT /api/quizzes/:id/questions` | 신규 카드 추가 + Toast NOT-TOAST-03 | Quiz, Question |
| D-3 | 카드 "공개여부 토글" | `mockUpdate(id, { visible })` | `PATCH /api/quizzes/:id` | 카드 상태 갱신 + Toast NOT-TOAST-04 | Quiz (`visible`) |
| D-4 | 카드 "삭제" | `mockRemove(id)` | `DELETE /api/quizzes/:id` | 카드 제거 + Toast NOT-TOAST-05. 응시자 보유 시 차단 권고 (CES-D-06) | Quiz (응시자 보유 시 OD-CES-04 정책 결정 의존) |
| D-5 | "가져오기" | `listQuizzes` 결과에서 source 선택 + `mockSetQuestions(newId, sourceQs)` | `GET /api/quizzes` + `POST /api/quizzes` + `PUT /api/quizzes/:id/questions` | 신규 카드 추가 + Toast NOT-TOAST-06 | Quiz, Question |

**예상 권한 검증** (백엔드 권고)

- `GET /api/quizzes`: `(instructor || admin)` 시 담당 코스 + ta 시 부여된 코스 + student 시 응시 가능 시험만 필터
- 변경 액션은 `(instructor || admin)` 한정

---

### SCR-L-QUIZLIST. 시험 목록 (학생)

**구현 파일**: `src/pages/QuizList.jsx` (학생 뷰 분기)

**레이아웃**

```
[헤더]
  └── h1 "내 퀴즈"

[필터/정렬 행]
  ├── WeekSessionFilter (미지정 옵션 제외)
  └── 정렬 드롭다운

[카드 그리드]
  └── 응시 가능 퀴즈 카드 × N (status !== 'draft' + visible !== false)
       ├── 제목 + StatusBadge
       ├── 응시 기간 / 마감 / 이용 종료 / 지각 제출 정책
       ├── 본인 응시 정보
       │    ├── 점수 (성적 공개 정책 허용 시) / "점수 미공개" / "수동채점 대기" / "점수 없음"
       │    ├── 다회 응시 횟수 (있을 시)
       │    └── 제출 일자
       └── (이용 종료 시) 카드 자체가 lock 표시

[빈 상태]
  └── "현재 응시 가능한 퀴즈가 없습니다"
```

**상태**

| **상태** | **표현** |
|---|---|
| 점수 공개 | 점수 표시 |
| 점수 미공개 | "점수 미공개" 카피 |
| 수동채점 대기 | "수동채점 대기" 카피 |
| 점수 없음 | "점수 없음" 카피 |
| 이용 종료 | 카드 lock 표시 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 | `listQuizzes()` + `getMyAttempts(quizId)` 학생 본인 응시 이력 결합 | `GET /api/quizzes?studentVisible=true` + `GET /api/attempts?userId=me` (또는 단일 join 엔드포인트) | 학생 응시 가능 + 본인 점수 결합하여 카드 렌더. 비공개/draft/이용 종료 필터 적용 | Quiz, Attempt |
| D-2 | 카드 클릭 | `navigate('/quiz/:id')` | 동일 | SCR-L-QUIZDETAIL 진입 | (네비게이션) |

**예상 권한 검증**: `role === 'student'` + 수강 코스에 속한 Quiz 만 노출.

---

### SCR-I-QUIZDETAIL. 시험 상세 (교수자)

**구현 파일**: `src/pages/QuizDetail.jsx` (교수자 뷰)

**레이아웃**

```
[헤더 영역]
  ├── 좌측: ArrowLeft → 목록 복귀
  ├── 시험명 (h1)
  ├── 진행 상태 (StatusBadge) + 공개 상태 (VisibilityBadge) + 주차/차시
  └── 우측 작업 버튼 (편집 SCR-02 / 미리보기 / 채점 SCR-06 / 통계 SCR-07 / 삭제)

[5그룹 정보]
  ├── 주요 요약 (시험명 / 일정 / 진행 상태)
  ├── 응시 조건 (응시 기간 / 마감 / 이용 종료 / 지각 제출)
  ├── 응시 정책 (시간 제한 / 재응시 / 셔플 / 한 문항씩 표시 / 보안 옵션 요약)
  ├── 성적 공개 (범위 / 시점 / 기간 / 1회 조회)
  └── 접근 제한 (액세스 코드 / IP)

[문항 구성 영역]
  ├── 문항 수 / 총점 / 수동채점 필요 / 재채점 예정 표시
  └── 문항 목록 (편집/삭제 진입은 SCR-02 위임)

[교수자 작업 진입]
  ├── 응시자 있는 문항 편집 진입 시 영향 안내 (SCR-06 RegradeOptionsModal 위임)
  └── 제한 사유 안내 (편집/삭제 제한 시)
```

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 (`/quiz/:id`) | `getQuiz(id)` + `getQuizQuestions(id)` 동기 | `GET /api/quizzes/:id` + `GET /api/quizzes/:id/questions` | 5그룹 정보 + 문항 목록 렌더. 응시자 카운트로 편집/삭제 메뉴 분기 | Quiz (3.4 전체), Question |
| D-2 | "편집" 진입 | `navigate('/quiz/:id/edit')` | 동일 | SCR-02 진입 | (네비게이션) |
| D-3 | "삭제" | `removeQuiz(id)` | `DELETE /api/quizzes/:id` | 목록 복귀 + Toast NOT-TOAST-05. 응시자 보유 시 차단 권고 (CES-D-06) | Quiz |
| D-4 | 톱니바퀴 (코스 기본값) | QuizSettingsDialog 진입 (SCR-05 위임) | 동일 | (SCR-05 D 흐름 참조) | GlobalSettings |

**예상 권한 검증**: `(instructor || admin)` + 담당 코스 + ta 는 채점 권한만.

---

### SCR-L-QUIZDETAIL. 시험 상세 (학생)

**구현 파일**: `src/pages/QuizDetail.jsx` (학생 뷰)

**레이아웃**

```
[헤더]
  ├── 좌측: 목록 복귀
  └── 시험명 + StatusBadge + 주차/차시

[응시 정보 (간단)]
  ├── 응시 가능 기간
  ├── 마감 일시 / 이용 종료
  ├── 지각 제출 가능 기간 (해당 시)
  └── 응시 정책 요약 (시간 제한 / 재응시 횟수)

[본인 응시 결과]
  ├── 점수 (성적 공개 정책 허용 시)
  ├── 다회 응시 회차별 표시 (있을 시)
  ├── 수동채점 대기 안내 (해당 시)
  └── 회차별 공개 여부 (해당 시)

[안내 영역]
  ├── 접근 제한 / 결과 미공개 / 채점 대기 등 학생 행동 가이드 카피

[응시 시작 / 결과 확인 진입]
  └── 진행중 + 응시 가능 시 "응시 시작" CTA (→ SCR-09)
```

**상태**

| **상태** | **표현** |
|---|---|
| 응시 가능 | "응시 시작" CTA 활성 |
| 응시 완료 + 점수 공개 | 점수 + 결과 보기 진입 |
| 응시 완료 + 점수 미공개 | "점수 미공개" 안내 |
| 마감 + 채점 대기 | "수동채점 대기" 안내 |
| 이용 종료 | "이 시험은 이용이 종료되었습니다" + 진입 차단 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 (`/quiz/:id`) | `getQuiz(id)` + `getMyAttempts(id)` | `GET /api/quizzes/:id` + `GET /api/attempts?quizId=:id&userId=me` | 응시 정보 + 본인 응시 결과 렌더. `scoreRevealEnabled`/`scoreRevealScope`/`scoreRevealTiming` 으로 점수 표시 분기 (computeRevealStatus) | Quiz, Attempt |
| D-2 | "응시 시작" 클릭 | `navigate('/quiz/:id/attempt')` | 동일 | SCR-09 진입 | (네비게이션) |

**예상 권한 검증**: `role === 'student'` + 수강자 여부 + Quiz.visible + status 검증.

---

## 사용 컴포넌트 (DS Baseline 참조, 4 화면 공통)

| **컴포넌트** | **용도** |
|---|---|
| `Button` (shadcn) | 새 시험 / 가져오기 / 카드 액션 / 작업 진입 |
| `Card` (shadcn) | 시험 카드 / 5그룹 카드 |
| `StatusBadge` (내부) | 진행 상태 (임시저장 / 예정 / 진행중 / 마감 / 이용 종료) |
| `VisibilityBadge` (내부) | 공개 / 비공개 |
| `DropdownSelect` | 주차 / 차시 / 정렬 |
| `WeekSessionFilter` (내부) | 주차/차시 조합 필터 |
| `DropdownMenu` (shadcn) | 카드 메뉴 |
| `QuizSettingsDialog` (SCR-05) | 코스 기본값 설정 진입 |
| `ConfirmDialog` (내부) | 삭제 확인 |
| `Skeleton` (shadcn) | 초기 로딩 |
| `Toast` (shadcn) | 액션 결과 |
| `PageHeader` (내부) | 상세 헤더 |
| Lucide icons | ArrowLeft / Settings / Plus / MoreVertical / 등 |

---

## 4. 반응형 분기

| **디바이스** | **너비** | **목록** | **상세** |
|---|---|---|---|
| 모바일 | ~767px | 카드 1열, 필터 접힘, 카드 메뉴 popover | 5그룹 카드 1열, 작업 버튼 자동 줄바꿈 |
| 태블릿 | 768~1023px | 카드 2열, 필터 inline | 5그룹 카드 1~2열 |
| 데스크톱 | 1024px~ | 카드 3~4열 | 5그룹 카드 2열 가능 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | 초기 fetch (API 모드) | Skeleton 카드 그리드 |
| 빈 상태 (시험 없음, 교수자) | mockQuizzes 비어있음 | EmptyState + "새 시험 만들기" CTA |
| 빈 상태 (필터 결과 없음) | 필터 적용 후 0건 | "해당 조건의 퀴즈가 없습니다" + 필터 초기화 |
| 빈 상태 (학생 응시 가능 시험 없음) | 학생 + 필터 결과 0 | "현재 응시 가능한 퀴즈가 없습니다" |
| 에러 (시험 상세 진입 실패) | quiz === null | AlertCircle + "퀴즈를 찾을 수 없습니다" + 목록 링크 |
| 에러 (이용 종료 후 진입, 학생) | lockDate 경과 | 카드 lock + 상세 진입 차단 |
| 권한 없음 | role 미충족 (학생이 교수자 작업 직접 URL) | `<Navigate to="/" replace />` |
| 오프라인 | API 모드 한정 | mock 모드는 해당 없음 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | TA(P-03) / 운영자(P-05/P-06) 분기 | (A) 충족 | Canvas 권한 비트 위임 (공통 권한 가이드 참조). 운영자=교수자 권한 동등 |
| G-2 | 채점중 상태 자동 전환 | (B) 백로그 | 현재 mock 모드는 status 자동 전환 미구현. 화면 상태만 closed 표시 |
| G-3 | 주차/차시 미연결 시험의 일관 처리 (UX-P07-002) | (A) 부분 충족 | "미지정" 옵션 처리. 카피 보강 가능 |
| G-4 | 다회 응시 회차별 공개 여부 (UX-P08-001) | (A) 부분 충족 | 회차 표시는 있으나 회차별 공개 분기 카피 부족 |
| G-5 | 편집/삭제 제한 사유 카피 (UX-P07-041) | (A) 부분 충족 | 일부 제한은 메뉴 disable. 명시 사유 카피는 모든 케이스 미커버 |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 4 화면(I-QUIZLIST/L-QUIZLIST/I-QUIZDETAIL/L-QUIZDETAIL) 각각에 데이터 흐름 절 추가. mock/api 분기 + 데이터 사전 v0.1 엔티티 매핑 + 권한 검증 권고 포함 | 김민주 (Creator/PD) |
