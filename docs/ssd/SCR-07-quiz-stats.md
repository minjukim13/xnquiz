# SCR-07. 통계·분석 (Screen Spec)

> **참조 가이드**: XP2 [Designer] Screen Spec, DS Baseline 가이드 (페이지 5056888866)
> **본 SSD 범위**: 통계 페이지(`/quiz/:id/stats`) 의 현재 프로토타입 동작. 채점 화면 이동은 SCR-06 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | PRJ-XQ-BASE |
| 문서 ID | XQ-SSD-SCR-07-v1.2 |
| 작성자 | 김민주 (Creator/PD) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-09 |
| 상태 | Draft (PD 검토 전) |
| 흡수한 URD | [XQ-URD-026](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081399300) v1.0 |
| 참조 코드 | `src/pages/QuizStats.jsx`, `src/utils/excelUtils.js` (`downloadGradesXlsx`, `downloadItemAnalysisXlsx`), `src/utils/randomGroups.js` (`expandAllForInstructor`, `getRecipientStudents`, `isRandomGroup`) |
| 권한 가이드 | [공통 권한 모델 가이드 (5097160727)](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727) |

---

## 1. 역할별 네비게이션 구조

```
교수자 (instructor):
시험 목록(SCR-01) → 카드 메뉴 → "통계" → /quiz/:id/stats (SCR-07)
                                          ├── 퀴즈 기본 정보 영역 (채점 화면 이동 진입점)
                                          ├── 학생별 성적 조회 ↔ 퀴즈 전체 통계 (탭 전환)
                                          └── 다운로드 (학생 성적 Excel / 문항 분석 Excel)

핵심 태스크 클릭 뎁스:
- 통계 진입: 시험 목록 → 카드 메뉴 → 통계 (3단계)
- Excel 다운로드: 통계 → 다운로드 버튼 (4단계)
- 채점 화면 이동: 통계 → 퀴즈 기본 정보 영역 → 채점 진입 (4단계)
```

**도달 원칙**

- 권한: 교수자(instructor) / 운영자(admin). 학생 진입 차단.
- 학생별 성적 조회와 퀴즈 전체 통계는 동일 라우트 안에서 탭 전환.
- 측정학 지표(변별도 / 선택지별 응답 패턴 / 상중하위 정답률) 는 적용 가능한 문항 유형에 한정 노출.

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트** | **역할** | **흡수한 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-STATS | 통계·분석 통합 | `/quiz/:id/stats` | 교수자 | UX-P07-001~003/010~013/020/021/030/040~042/050/060/070~072/080, UX-P05-001/002/003 | P0 |

---

## 3. 화면별 상세 설계

### SCR-I-STATS. 통계·분석 통합

**구현 파일**: `src/pages/QuizStats.jsx`

**목적**

퀴즈 종료 후 학생별 성적, 응시 현황, 점수 분포, 문항별 분석, 측정학 지표를 동일 맥락에서 확인하고 Excel 다운로드.

**레이아웃**

```
[PageHeader] 시험명 + 통계 헤더

[퀴즈 기본 정보 영역]
  ├── 시험명 / 응시 기간 / 주차·차시 / 진행 상태
  ├── 설명 (CollapsibleDescription, 길면 line-clamp-2 + 펼치기)
  └── 채점 화면 이동 진입 (Button → /quiz/:id/grade)

[모드 탭]
  └── 학생별 성적 조회 ↔ 퀴즈 전체 통계

[학생별 성적 조회 모드]
  ├── 응시 현황 요약 카드
  │    ├── 수강 인원 / 응시 완료 / 미제출 / 채점 완료 / 채점 대기 (인원 + 비율)
  │    └── 분모 정의 안내 (응시자 수 vs 채점 완료 수)
  ├── 검색 / 정렬 / 필터 행
  │    ├── 검색 (이름 / 학번)
  │    ├── 정렬 (이름 / 학번 / 학과 / 소요 시간 / 제출일시 / 점수)
  │    └── 필터 (제출 상태 / 채점 상태)
  └── 학생 목록 테이블
       ├── 이름 / 학번 / 학과 / 점수 / 점수 구간 배지 (80↑ / 60~80 / 60↓)
       ├── 제출 일시 / 상태
       ├── 점수 미공개 / 수동채점 대기 / 점수 없음 분기 카피
       └── 답안 확인 / 채점 흐름 진입 (행 클릭 → SCR-06)

[퀴즈 전체 통계 모드]
  ├── 응시 요약 (Canvas 5 + 추가 2)
  │    ├── 평균 / 최고 / 최저 / 표준편차 / 평균 응시 시간
  │    └── 중앙값 / 참여율
  ├── 점수 분포 히스토그램
  │    ├── 상위 27% / 중위 46% / 하위 27% 구간별 점수 범위 + 평균 + 누적 추이
  │    └── recharts BarChart (구간별 색상 분기, ReferenceLine 표시)
  ├── 문항별 분석 테이블
  │    ├── 문항 / 유형 / 배점 / 평균 점수 / 득점률 / 난이도 / 채점 현황
  │    ├── 득점률 분류 (쉬움 70%↑ / 보통 / 어려움 40%↓ / 채점 전)
  │    └── 일부 채점 문항은 "채점 완료 N명 / 전체 M명" 동시 표시
  └── 측정학 지표 테이블 (적용 가능한 문항 유형 한정)
       ├── 변별도 (점이연 상관계수, -1~1)
       ├── 상위 27% 정답률 / 하위 27% 정답률 / 차이
       └── 선택지별 응답 패턴 (객관식 등)

[랜덤 출제 문항 표시 — 풀 전체 노출]
  ├── 문항 카드 / 테이블 행에 Shuffle 배지 + "랜덤" 라벨
  ├── 출제 은행명 (randomGroupBankName) 표시
  ├── 우측 컬럼에 "N명 출제" 카운트 (recipientCount, 풀에서 실제로 학생에게 출제된 수)
  └── 상세 Sheet 진입 시 RecipientSection (출제된 학생 명단 + 응시 상태)

[다운로드 영역]
  ├── 학생 성적 Excel (downloadGradesXlsx)
  ├── 문항 분석 Excel (downloadItemAnalysisXlsx)
  └── 파일 업로드 문항 단위 다운로드 (해당 문항만)

[빈 상태 분기]
  ├── 응시자 없음
  ├── 채점 완료자 없음
  ├── 검색 결과 없음
  └── 데이터 없음
```

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **용도** |
|---|---|
| `PageHeader` | 헤더 |
| `Card` / `CardContent` (shadcn) | 퀴즈 정보 / 통계 카드 |
| `Badge` (shadcn) | 점수 구간 / 득점률 분류 / 측정학 등급 |
| `Button` (shadcn) | 다운로드 / 채점 진입 / 정렬 토글 |
| recharts `BarChart` 외 | 점수 분포 히스토그램 |
| `CollapsibleDescription` (내부) | 시험 설명 펼치기 |
| `TypeBadge` (내부) | 문항 유형 배지 |
| Lucide icons | UI 아이콘 |
| `downloadGradesXlsx` / `downloadItemAnalysisXlsx` | Excel 생성 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 진입 (`/quiz/:id/stats`) | quiz / questions / attempts fetch |
| I-2 | 모드 탭 전환 | 학생별 성적 ↔ 퀴즈 전체 통계 |
| I-3 | 학생 검색 | 이름 / 학번 포함 검색 |
| I-4 | 정렬 변경 | 컬럼 헤더 클릭으로 토글 (asc / desc / off) |
| I-5 | 필터 변경 | 제출 상태 / 채점 상태 필터 적용 |
| I-6 | 학생 행 클릭 | SCR-06 학생 중심 모드 진입 (`/quiz/:id/grade?mode=student&studentId=...`) |
| I-7 | "학생 성적 Excel" 클릭 | `downloadGradesXlsx` 실행. 실패 시 Toast 안내 |
| I-8 | "문항 분석 Excel" 클릭 | `downloadItemAnalysisXlsx` 실행 |
| I-9 | 측정학 지표 호버 | "변별도는 점수가 높은 학생과 낮은 학생을 얼마나 잘 구분하는지의 지표입니다 (점이연 상관계수, -1~1)" 카피 노출 |
| I-10 | 시험 설명 펼치기 | line-clamp-2 → 전체 표시 토글 |
| I-11 | 랜덤 출제 문항 행 클릭 | 상세 Sheet 진입 시 `RecipientSection` 노출 + `QuestionStatsPanel` 분모를 출제된 학생만으로 필터링 |
| I-12 | RecipientSection 학생 행 클릭 | SCR-06 학생 중심 모드 진입 (해당 문항이 출제된 학생만 활성 표시) |
| I-13 | 문항별 분석 테이블 정렬 (랜덤 + 일반 혼재) | `expandAllForInstructor` 가 부여한 합성 order 기준 정렬 (그룹 위치 + 그룹 내 인덱스) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 점수 구간 80↑ | 점수 ≥ 80 | 상위 구간 배지 |
| 점수 구간 60-80 | 60 ≤ 점수 < 80 | 중간 구간 배지 |
| 점수 구간 60↓ | 점수 < 60 | 하위 구간 배지 |
| 득점률 쉬움 | 득점률 ≥ 70% | "쉬움" 배지 (success) |
| 득점률 보통 | 40% ~ 70% | "보통" 배지 |
| 득점률 어려움 | 득점률 < 40% | "어려움" 배지 (warning) |
| 득점률 채점 전 | 채점 완료자 없음 | "채점 전" 배지 (muted) |
| 변별도 우수 | discrimination ≥ 0.3 | 등급 배지 (success) |
| 변별도 보통 | 0.1 ~ 0.3 | 등급 배지 (warning) |
| 변별도 부족 | discrimination < 0.1 | 등급 배지 (destructive) |
| 일부 채점 문항 | gradedCount < totalCount | "N / M명 채점 완료" 표시 |
| 랜덤 출제 풀 문항 | `isRandomGroup(item)` true (`expandAllForInstructor` 펼침) | Shuffle 배지 + "랜덤 (은행명)" 라벨 + recipientCount 표시 + 통계 분모를 출제된 학생만으로 제한 |
| 랜덤 풀 문항 출제 0명 | 풀에 있지만 어떤 학생에게도 안 뽑힘 | "0명 출제" 표시 + 통계 카드 "데이터 없음" 분기 |
| 랜덤 풀 문항 부분 출제 | recipientCount < submittedStudents.length | 분모를 recipientCount 로 표시 + "전체 응시자 N명 중 출제 M명" 보조 안내 |

**데이터 흐름**

| **단계** | **트리거** | **호출 (mock)** | **호출 (api)** | **응답 처리** | **관련 엔티티 (데이터 사전 v0.1)** |
|---|---|---|---|---|---|
| D-1 | 페이지 진입 (`/quiz/:id/stats`) | `getQuiz(id)` + `getQuizQuestions(id)` + `getQuizStudents(id)` (mock 학생 중심 집계) | `GET /api/quizzes/:id` + `GET /api/quizzes/:id/questions` + `GET /api/attempts?quizId=:id&aggregate=true` (서버 집계 권고) | 평균/표준편차/점수 구간/문항별 통계/변별도 계산 후 차트 렌더 | Quiz, Question, Attempt, Answer |
| D-2 | 측정학 지표 계산 | 클라이언트 (변별도/난이도/평균/표준편차/구간 분포) | (백엔드 권고) 서버 집계 + 캐싱. 대량 응시 시 client 부담 큼 | 차트/카드/표 갱신 | Attempt (`totalScore`), Answer (문항별 점수) |
| D-3 | 학생 행 클릭 | `navigate('/quiz/:id/grade?mode=student&studentId=...')` | 동일 | SCR-06 학생 중심 모드 진입 | (네비게이션) |
| D-4 | "학생 성적 Excel" 다운로드 | 클라이언트 `downloadGradesXlsx(quiz, students)` (`xlsx` 라이브러리) | 동일 또는 `GET /api/quizzes/:id/grades.xlsx` 서버 생성 | 브라우저 다운로드 + 실패 시 Toast | Quiz, Attempt |
| D-5 | "문항 분석 Excel" 다운로드 | 클라이언트 `downloadItemAnalysisXlsx(quiz, questions, students)` | 동일 또는 서버 생성 | 브라우저 다운로드 | Quiz, Question, Answer |
| D-6 | random_group 풀 평면화 (통계 진입 시 자동) | `expandAllForInstructor(quiz.items)` — random_group 의 `bankSnapshot` 안 모든 문항을 합성 order 로 평면화 | (백엔드 권고) `GET /api/quizzes/:id/stats-questions` → 서버에서 random_group 풀 + 학생별 expand 매핑 일괄 반환 | 일반 문항 + 풀 전체 후보군 통합 리스트로 통계 표 렌더 | Question, BankQuestion, random_group placeholder |
| D-7 | 풀 문항별 출제 학생 명단 추출 | `getRecipientStudents(q, submittedStudents)` — 학생 응답(`answers/autoScores/manualScores/selections`) 중 q.id 보유한 학생만 필터 | (백엔드 권고) D-6 응답에 `recipientIds[]` 포함 (서버에서 응답 데이터 기준 사전 계산 권장) | 카드 우측 "N명 출제" 카운트 + 상세 Sheet RecipientSection 렌더 | Attempt, Answer |
| D-8 | 랜덤 문항 통계 계산 모집단 정의 | 풀 문항은 분모 = recipientCount (출제된 학생만), 일반 문항은 분모 = submittedStudents | 동일 | 평균/득점률/변별도가 풀 문항별로 다른 모집단 기준으로 표시 | Attempt, Answer |

**성능 권고**: 대량 응시(500+ 학생) 시 D-2 의 클라이언트 계산이 무거워질 수 있음. 서버 집계 + 캐싱 (재채점 시 무효화) 권고. random_group 의 풀 평면화(D-6) + 학생별 expand 매핑(D-7) 도 서버 사전 계산 권고 — 풀이 100+ 문항이면 client 메모리 부담 큼.

**랜덤 출제 통계 분모 정의** (중요)

| **문항 유형** | **분모 (population)** | **이유** |
|---|---|---|
| 일반 문항 (random_group 아님) | submittedStudents.length (제출 완료 학생) | 모든 학생이 동일 문항 응시 |
| random_group 풀 문항 | `getRecipientStudents(q, submittedStudents).length` (해당 문항 출제된 학생만) | 학생별로 풀에서 뽑힌 문항이 다르므로 분모 통일 시 평균/득점률 왜곡 |
| random_group 풀 문항 (출제 0명) | 0 (분모 정의 불가) | 풀에 존재하나 어떤 학생에게도 안 뽑힌 경우 "데이터 없음" 분기 |

**랜덤 출제 풀 visibility 정책**

- 통계 페이지는 학생 시점이 아닌 교수자/운영자 시점 → 풀 전체 노출 (학생 보안 영향 없음)
- 풀 안 문항 = 학생별 expand 결과의 합집합 + 미출제 후보
- "0명 출제" 문항도 통계 표에 노출 (어떤 문항이 안 뽑혔는지 인지 가능)

---

## 4. 반응형 분기

| **디바이스** | **너비** | **변화** |
|---|---|---|
| 모바일 | ~767px | 학생 목록 카드형, 통계 카드 1열, 히스토그램 가로 스크롤 |
| 태블릿 | 768~1023px | 학생 목록 테이블, 통계 카드 2열, 히스토그램 컨테이너 폭 |
| 데스크톱 | 1024px~ | 학생 목록 테이블 + 통계 카드 3~4열 + 히스토그램 풀폭 |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 | quiz / questions / attempts fetch | 동기 렌더 (별도 Skeleton 미구현) → 간극 G-1 |
| 빈 상태 (응시자 없음) | attempts 0건 | EmptyState 카피 |
| 빈 상태 (채점 완료자 없음) | 채점 완료 0명 | 통계 영역에 "채점 전" / 빈 상태 카피 |
| 빈 상태 (검색 결과 없음) | 검색/필터 결과 0건 | EmptyState 카피 |
| 측정학 지표 적용 불가 | 유형 미적용 (서술형 등) | 해당 행에 "-" 또는 미노출 |
| 에러 (Excel 생성 실패) | `downloadGradesXlsx` throw | Toast 에러 안내 + console.error |
| 권한 없음 | role !== 'instructor' (학생 직접 URL) | `<Navigate to="/" replace />` |
| 오프라인 | 해당 없음 (정적 데이터 기반) | 해당 없음 |

---

## 6. 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 통계 로딩 Skeleton (UX-P07-001 진입 직후 인지) | (B) 백로그 | 현재 별도 Skeleton 미구현. 로딩 시간이 짧다면 미필요. API 모드 전환 시 검토 |
| G-2 | Excel 생성 실패 사용자 안내 (UX-P07-073) | (A) 충족 | Toast 안내 구현됨 |
| G-3 | 학생 식별 정보 / 교수자 메모 접근 권한 (UX-P05-003, OQ-URD-026-03) | (B) 법무 검토 의존 | URD OQ 의존. 법무 검토 후 권한 분기 추가 |
| G-4 | 측정학 지표 적용 가능 문항 유형 안내 카피 | (B) C 분류 후속 카피 | 적용 불가 유형의 명시 카피는 후속 카피 작업 |
| G-5 | random_group 풀 변경(은행 문항 수정/삭제) 시 통계 영향 안내 | (B) Phase 2 후속 | 시험 정의 시점 `bankSnapshot` 과 현재 은행 상태 불일치 가능. 풀 변경 이력 추적 + 통계 시점 명시 카피 후속 |
| G-6 | 학생 단위 점수 합계 vs 풀 평균 차이 안내 | (B) C 분류 후속 카피 | 난이도별 차등 배점 ON 시 학생별 합계가 다를 수 있는데 통계 평균은 풀 평균이라 괴리 발생 → 카피로 해소 필요 |

---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-16 | v1.2 | 랜덤 출제 통계 처리 추가. (1) 레이아웃에 "랜덤 출제 문항 표시 — 풀 전체 노출" 섹션 신설. (2) 인터랙션 I-11~13 추가 (RecipientSection, 모집단 필터, 합성 order 정렬). (3) 상태 표에 랜덤 풀 문항 3종 분기. (4) 데이터 흐름 D-6~8 추가 (`expandAllForInstructor` 풀 평면화, `getRecipientStudents` 출제 학생 추출, 모집단 정의 분기). (5) "랜덤 출제 통계 분모 정의" + "풀 visibility 정책" 표 신설. (6) 간극 G-5/G-6 추가 (풀 변경 영향 / 학생별 합계 vs 풀 평균 괴리). 참조 코드에 `randomGroups.js` 추가. | 김민주 (Creator/PD) |
| 2026-06-09 | v1.1 | 백엔드 전달 산출물 보강. 데이터 흐름 절 추가. mock/api 분기 + 데이터 사전 v0.1 엔티티 매핑 + 권한 검증 + 성능 권고 (서버 집계 + 캐싱) 포함 | 김민주 (Creator/PD) |
