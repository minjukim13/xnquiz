# S-06. 통계/분석 - Canvas / LMS / xnquiz 비교

> Canvas Classic Quizzes 기준. 분석 시점 2026-05-21.

## 1. 개요

| **시스템** | **라우트** | **접근 권한** |
| --- | --- | --- |
| Canvas | `/courses/:cid/quizzes/:id/statistics` | `:update && :manage && @submitted_student_count > 0` (또는 review_grades) |
| LearningX (LMS) | Canvas 와 동일. `custom.quiz-rescore.example.js` / `.canvas2024.example.js` 로 재채점 안내 박스 + 문제은행 재채점 버튼 주입 | Canvas 권한 + 강좌 운영자 |
| xnquiz | `/quiz/:id/stats` 단일 SPA, 탭 2개 ("학생별 성적 조회" / "퀴즈 통계") | role=PROFESSOR 또는 ADMIN |

**한줄 요약**
- **Canvas**: "Quiz Summary" (5지표 + 점수분포 차트) + "Question Breakdown" (문항 유형별 Renderer) + Item Analysis / Student Analysis 보고서 CSV 두 종류.
- **LMS**: Canvas 통계 화면 위에 "재채점 안내 박스" + "문제은행 답안 수정 → 재채점" 버튼 주입. 문제은행 답안을 고치면 통계 화면에서 학생 점수에 일괄 반영.
- **xnquiz**: "학생별 성적 조회" + "퀴즈 통계" 탭으로 재구성. 점수 분포 / 응시 현황 카드 / 문항별 득점률 / 문항별 상세 통계 + 난이도 자동 분류 (≥70% 쉬움 / 40~69% 보통 / <40% 어려움).

---

## 2. 기능 매트릭스

### 2-1. 헤더 / 진입

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 페이지 제목 | O ("Quiz Statistics", screenreader h1) | O | O (차이: 퀴즈 제목 + 뒤로가기) | |
| 진입 트리거 | O (S-03 사이드바 "Quiz Statistics") | O | O (차이: S-03 헤더 "통계" 버튼) | |
| 응시자 0명일 때 진입 차단 | O (`@submitted_student_count > 0` 조건) | O | - (xnquiz 는 빈 상태 노출) | |
| Section Select (강좌 섹션 필터) | O (`SectionSelect` 컴포넌트) | O | - | xnquiz 는 섹션 개념 없음 |
| 응시 기간 / 주차/차시 표시 | - (Canvas 는 별도) | - | O (신규 [C]): meta 영역 | |
| description 펼치기/접기 | - | - | O (신규 [C]): `CollapsibleDescription` 2행 line-clamp | |
| 채점 화면 이동 액션 | - (Canvas 는 SpeedGrader 별도) | - | O (신규 [C]): "채점" 버튼 → `/quiz/{id}/grade` | |

### 2-2. 요약 지표

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Average Score (평균점수) | O ("X%", emphasized, `scoreAverage / pointsPossible * 100`) | O | O (차이: 큰 폰트 "평균 점수 / {totalPoints}점", 절대값 표기) | |
| High Score (최고) | O ("X%") | O | O (차이: 절대 점수) | |
| Low Score (최저) | O ("X%") | O | O (차이: 절대 점수) | |
| Standard Deviation (표준편차) | O (`scoreStdev`, 소수 둘째 자리) | O | O (차이: 표준편차) | |
| Average Time (평균 응시시간) | O (`durationAverage` 초 → HH:MM:SS) | O | O (차이: "평균 응시시간" 분/초) | |
| 응시율 (참여율) | - | - | O (신규 [C]): "응시율" % | |
| isLoading / 데이터 없음 N/A | O (모든 셀 "N/A") | O | - (별도 빈 상태) | |
| Spinner 로딩 표시 | O (header h2 옆) | O | - | |

### 2-3. 차트

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Score Percentile Chart (점수 분포 막대) | O | O | O (차이: `BarChart`, binSize 동적 조정 ≥80→10/≥30→5/그 외→1, 평균 ReferenceLine) | xnquiz 만 평균 점선 표시 |
| 빈 상태 (채점 완료 0명) | O ("There are no question statistics available.") | O | O (차이: "채점 완료된 학생이 없습니다") | |
| 캡션 (집계 기준 안내) | - | - | O (신규 [C]): "응시 {N}명 중 채점 완료 {N}명 기준 (미채점 {N}명 제외)" | |
| 응시 현황 카드 (5행 라벨/인원/비율) | - | - | O (신규 [C]): 수강 인원 / 응시 완료 / 미제출 / 채점 완료 / 채점 대기 | |
| 점수 분포 구간 (상위 27% / 중위 46% / 하위 27%) | - | - | O (신규 [C]): "{p73}점 이상" / "{p27}~{p73}점" / "{p27}점 미만" | xnquiz 도메인 특화 |
| 문항별 득점률 차트 (가로 BarChart) | - | - | O (신규 [C]): ReferenceLine 70% / 40%, 색 분기 | |
| 문항별 득점률 범례 4종 | - | - | O (신규 [C]): "70% 이상 (쉬움)" / "40~69% (보통)" / "40% 미만 (어려움)" / "채점 전" | |

### 2-4. 문항별 통계 (Question Breakdown)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| 섹션 헤더 "Question Breakdown" | O | O+custom (header 안에 "재채점 안내" 박스 주입) | O (차이: "문항별 상세 통계 테이블") | |
| 문항 번호 + 제목 + 본문 (HTML) | O | O | O (차이: 컬럼 "문항" 텍스트만, 본문은 다른 영역) | |
| 응시자 수 (participantCount) | O ("Answered: N students") | O | O (차이: "채점 현황" 컬럼 "{graded}/{total}명") | |
| "View these students" (응답자 user_list_dialog) | O | O | - | xnquiz 는 채점 대시보드에서 별도 |
| 응답률 / 정답률 | O | O | O (차이: "득점률" 컬럼 + 진행률 바) | |
| Discrimination Index (변별도 도넛) | O (정답률에 따른 색) | O | - | xnquiz 미지원 |
| **multiple_choice / true_false** Renderer | O (`MultipleChoiceRenderer`: 선택지별 응답 비율 막대 + 정답률 도넛 + Discrimination Index) | O | - (테이블만, 선택지별 분포 미노출) | |
| **short_answer / multiple_answers / numerical** Renderer | O (`ShortAnswerRenderer`: 답안별 빈도 + 정답률) | O | - | |
| **fill_in_multiple_blanks / multiple_dropdowns / matching** Renderer | O (`FillInMultipleBlanksRenderer`: 빈칸/드롭다운별 응답 분포) | O | - | |
| **essay** Renderer | O (`EssayRenderer`: 미채점/채점완료 수, 평균점, 답안 보기 링크) | O | - (테이블 "채점 현황" 으로 통합) | |
| **calculated** Renderer | O (`CalculatedRenderer`: 변수 분포) | O | - | |
| **file_upload** Renderer | O (`FileUploadRenderer`: 제출 파일 수 + Submissions Zip 다운로드 링크) | O | - (xnquiz 는 채점 대시보드에서 "제출물 일괄 다운로드") | |
| 기본 QuestionRenderer (그 외) | O (텍스트만) | O | - | |
| 난이도 자동 분류 (쉬움/보통/어려움) | - | - | O (신규 [C]): 득점률 ≥70% 쉬움 / 40~69% 보통 / <40% 어려움 | xnquiz 만 자동 라벨링 |
| 난이도 배지 색 | - | - | O (신규 [C]): 쉬움 초록 / 보통 주황 / 어려움 빨강 | |
| 난이도 헤더 툴팁 (ⓘ) | - | - | O (신규 [C]): "득점률 기준: ≥70% 쉬움 / 40~69% 보통 / <40% 어려움" | |
| 평균 점수 컬럼 | - | - | O (신규 [C]) | |
| 배점 컬럼 | - | - | O (신규 [C]) | |
| 채점 현황 컬럼 | - | - | O (신규 [C]): "완료" 초록 또는 "{graded}/{total}명" 주황 | |
| 하단 캡션 (난이도 기준) | - | - | O (신규 [C]): "난이도(득점률 기준): ≥70% 쉬움 / 40~69% 보통 / <40% 어려움" | |
| LMS 문항 카드 헤더 재채점 버튼 (`#xn-btn-rescore`) | - | O+custom (`custom.quiz-rescore.example.js`: 문제은행 답안 수정 후 재채점 트리거) | - | LMS 만 |

### 2-5. 학생별 성적 조회 (xnquiz 신규 탭)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| "학생별 성적 조회" 탭 자체 | - (Canvas 는 Student Analysis CSV 다운로드만) | - | O (신규 [C]): `GradesTab` | |
| 요약 세그먼트 (전체/제출완료/미제출) | - | - | O (신규 [C]): 컬러 도트 + 카운트 | |
| 학생 검색 (이름/학번) | - | - | O (신규 [C]) | |
| 정렬 (이름/학번/학과/소요 시간/제출일시/점수) | - | - | O (신규 [C]): 컬럼 헤더 클릭 토글 | |
| 정렬 아이콘 (ArrowUpDown/ArrowDown/ArrowUp) | - | - | O (신규 [C]) | |
| 점수 색 분기 (≥80 파랑 / ≥60 회색 / <60 빨강) | - | - | O (신규 [C]) | |
| 제출 상태 필터 (체크박스 드롭다운) | - | - | O (신규 [C]): "정상제출" / "지각제출" / "미제출" | |
| 채점 상태 필터 (체크박스 드롭다운) | - | - | O (신규 [C]): "채점 완료" / "미채점" | |
| "답안 확인" 버튼 (행별) | - | - | O (신규 [C]): → `/quiz/{id}/grade?mode=student&studentId={id}` | |
| 빈 상태 ("검색 결과가 없습니다") | - | - | O (신규 [C]) | |

### 2-6. 다운로드 (CSV / XLSX)

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| Item Analysis 보고서 (CSV) | O ("Item Analysis" 버튼, includesAllVersions 옵션) | O | - | Canvas 만 |
| Student Analysis 보고서 (CSV) | O ("Student Analysis" 버튼) | O | - | Canvas 만 |
| 생성 진행 popup ("Less than half-way to go" / "Almost done") | O | O | - | |
| 생성 완료 → "Download" 링크 전환 | O | O | - | |
| 생성 완료 표시 ("Generated: {date}") | O | O | - | |
| Survey 시 disabled + tooltip | O ("Report can not be generated for Survey Quizzes.") | O | - (xnquiz 는 survey 모드 없음) | |
| 성적 다운로드 (.xlsx) | - | - | O (신규 [C]): "성적 다운로드" 버튼, `downloadGradesXlsx` | xnquiz 만 |
| 문항 분석 다운로드 (.xlsx) | - | - | O (신규 [C]): "문항 분석 (.xlsx)" 버튼, `downloadItemAnalysisXlsx` | |
| LMS 퀴즈 오답률 다운로드 | - | O+custom (`custom.quiz-erratum-download.example.js`: S-03 사이드바 "퀴즈 오답률 다운로드" 버튼, `/learningx/api/v1/.../erratum/download`) | - | LMS 자체 엔드포인트 |

### 2-7. 빈 상태 / 엣지 케이스

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| `isLoadingStatistics` 빈 상태 | O ("Question statistics are being loaded. Please wait a while.") | O | - | |
| `questionStatistics.length === 0` 빈 상태 | O ("There are no question statistics available.") | O | O (차이: "채점 완료된 학생이 없습니다") | |
| `canBeLoaded` false (시스템 한계) | O ("Even awesomeness has limits. We can't render statistics for this quiz, but you can download the reports.") | O | - | |
| Survey 모드 | O (보고서 생성 불가) | O | - (xnquiz 는 survey 모드 없음) | |
| 응시자 0명 | O (Summary N/A) | O | O (차이: 빈 상태 메시지 + 통계 카드 0 표기) | |
| Section 필터 변경 시 데이터 재요청 | O | O | - | |

### 2-8. LMS custom.js 재채점 통합

| **세부 기능** | **Canvas** | **LMS** | **xnquiz** | **비고** |
| --- | --- | --- | --- | --- |
| `#question-statistics-section` 헤더에 "재채점 안내" 박스 주입 | - | O+custom (`<details>` 토글, canvas2024 은 정적) | - | |
| 각 문항 통계 카드 헤더에 `xn-question-bank-rescore-buttons-wrapper` 주입 | - | O+custom | - | |
| 문제별 LMS 서버에서 HTML fragment fetch | - | O+custom (`GET /learningx/courses/:cid/quizzes/:qid/quiz-questions/:qid/question-banks/rescore-buttons`) | - | |
| `#xn-btn-rescore` 클릭 confirm 다이얼로그 | - | O+custom ("문제은행에서 수정한 답안으로 재채점을 진행합니다…") | - | |
| 재채점 호출 | - | O+custom (`POST /learningx/api/v1/.../questions/:qid/rescore`) | - | |
| 완료 alert + 페이지 리로드 | - | O+custom ("재채점이 완료되었습니다.") | - | |
| 질문 ID 식별 (일반판 / canvas2024판) | - | O+custom (DOM `data-reactid` 또는 Statistics API 인덱스) | - | |

---

## 3. 시스템별 상세

### 3-1. Canvas 표준에만 있는 기능 (xnquiz 가 채택 안 한 것들)

- **Item Analysis 보고서 (CSV)**: 문항별 응답 분포, 난이도, 변별도 (Discrimination Index) 포함. includesAllVersions 옵션으로 모든 시도 / 마지막 시도만 분기.
- **Student Analysis 보고서 (CSV)**: 학생별 답안과 점수를 행 단위로 export.
- **보고서 생성 상태 라벨**: "Report has never been generated." / "Report is being generated." / "Less than half-way to go." / "Almost done." / "Generated: {date}".
- **Discrimination Index (변별도)**: 상위/하위 응답자 정답률 차이로 문항 변별력 측정. xnquiz 는 난이도만 자동 분류하고 변별도는 미산출.
- **문항 유형별 Renderer (8종)**:
  - MultipleChoiceRenderer (선택지별 응답 비율 막대 + 정답률 도넛)
  - ShortAnswerRenderer (답안별 빈도 표)
  - FillInMultipleBlanksRenderer (빈칸별 응답 분포)
  - EssayRenderer (미채점/완료/평균점 + 답안 보기 링크)
  - CalculatedRenderer (변수 분포)
  - FileUploadRenderer (제출 파일 수 + Submissions Zip 링크)
  - 기본 QuestionRenderer (텍스트만)
- **Section Select**: 강좌 섹션별 통계 필터.
- **응시자 클릭 → user_list_dialog**: "View these students" 로 해당 응답한 학생 목록 popup.
- **응시자 0명 진입 차단**: `@submitted_student_count > 0` 조건. 응시 전에는 통계 진입 자체가 안 됨.
- **Survey 모드 분기**: Survey 일 때 보고서 버튼 disabled + tooltip.
- **N/A 처리**: 로딩 또는 데이터 없을 때 모든 셀에 "N/A".

### 3-2. LearningX custom.js delta

S-06 통계 화면에 직접 적용되는 custom 2개 (`custom.quiz-rescore.example.js` / `.canvas2024.example.js`).

- **재채점 안내 박스**: `#question-statistics-section header.padded` 안에 자동 삽입. 편집 화면과 동일한 카피. `<details>` 토글 (canvas2024 버전은 정적).
- **각 문항 통계 카드 헤더에 재채점 버튼 fragment 주입**: 문제별로 `GET /learningx/courses/:cid/quizzes/:qid/quiz-questions/:qid/question-banks/rescore-buttons` 호출 → 받은 HTML 을 `innerHTML` 로 박음.
- **`#xn-btn-rescore` 클릭 핸들러**: confirm 다이얼로그 "문제은행에서 수정한 답안으로 재채점을 진행합니다…" → `POST /learningx/api/v1/.../questions/:qid/rescore` (Bearer 토큰) → alert "재채점이 완료되었습니다." → 페이지 리로드.
- **의도**: 문제은행에 링크된 문제에 한해, 문제은행 답안을 수정하면 통계 화면에서 학생 점수에 일괄 반영하는 후공정.
- **질문 ID 식별 방식**:
  - 일반판: DOM 의 `data-reactid` 에서 `$question-(\d+)` 추출.
  - canvas2024 판: Canvas Statistics API (`/api/v1/courses/:cid/quizzes/:qid/statistics`) 응답의 question 배열 인덱스로 매칭. 응답에 `while(1);` CSRF prefix 가 있어 제거 후 파싱.

### 3-3. xnquiz 신규 기능

| **ID** | **라벨** | **기능** | **동작** |
| --- | --- | --- | --- |
| [C] | 탭 분리 ("학생별 성적 조회" / "퀴즈 통계") | 두 가지 관점을 한 화면 안에서 토글 | |
| [C] | 학생별 성적 조회 테이블 | 9컬럼 (이름/학번/학과/소요 시간/제출 상태/제출 일시/점수/채점 상태/답안) | `GradesTab` |
| [C] | 학생 정렬 + 필터 (제출 상태/채점 상태) | 컬럼 헤더 클릭 + 체크박스 드롭다운 | |
| [C] | "답안 확인" 버튼 (행별) | 채점 화면으로 학생 직접 진입 | `/quiz/{id}/grade?mode=student&studentId={id}` |
| [C] | 점수 색 분기 | ≥80 파랑 / ≥60 회색 / <60 빨강 | |
| [C] | 큰 평균 점수 표기 | 절대값 + "/ {totalPoints}점" | StatsTab |
| [C] | 응시 현황 카드 (5행 라벨/인원/비율) | "수강 인원 / 응시 완료 / 미제출 / 채점 완료 / 채점 대기" | |
| [C] | 점수 분포 구간 (상위 27% / 중위 46% / 하위 27%) | "{p73}점 이상 / {p27}~{p73}점 / {p27}점 미만" | |
| [C] | 점수 분포 차트 + 평균 ReferenceLine | binSize 동적 조정 | `BarChart` |
| [C] | 문항별 득점률 가로 차트 | ReferenceLine 70% / 40%, 색 분기 (초록/호박/분홍/회색) | |
| [C] | 문항별 득점률 범례 4종 | "70% 이상 (쉬움) / 40~69% (보통) / 40% 미만 (어려움) / 채점 전" | |
| [C] | 문항별 상세 통계 테이블 | 7컬럼 (문항/유형/배점/평균 점수/득점률/난이도/채점 현황) | |
| [C] | 난이도 자동 분류 | 득점률 기준 ≥70% 쉬움 / 40~69% 보통 / <40% 어려움 | |
| [C] | 난이도 헤더 ⓘ 툴팁 | 기준 설명 | |
| [C] | 채점 현황 컬럼 | "완료" 초록 또는 "{graded}/{total}명" 주황 | |
| [C] | 성적 다운로드 (.xlsx) | `downloadGradesXlsx` | xnquiz 만 |
| [C] | 문항 분석 다운로드 (.xlsx) | `downloadItemAnalysisXlsx` | xnquiz 만 |
| [C] | 응시율 지표 | 5지표에 추가 | |
| [C] | 캡션 (집계 기준 안내) | "응시 {N}명 중 채점 완료 {N}명 기준 (미채점 {N}명 제외)" + "채점된 학생 기준 실시간 집계" | |

---

## 4. 핵심 차이 요약

**Canvas → LMS → xnquiz 진화 흐름**

**1단계 (Canvas 표준)**. Canvas 통계는 두 축으로 설계됐다. 화면(Quiz Statistics) 은 "교수자가 한눈에 보는 요약 + 문항 유형별 시각화", 보고서 (Item Analysis / Student Analysis CSV) 는 "심층 분석 / 외부 저장". 화면 쪽은 문항 유형별 Renderer 가 8종 있어서 객관식은 선택지별 응답 비율 막대 + 정답률 도넛 + Discrimination Index, 빈칸은 빈칸별 분포, 에세이는 미채점/완료 수처럼 유형 특성에 맞춘 시각화를 제공한다. 보고서는 CSV 라 외부 통계 도구로 가공 가능. 단점은 학생별 점수 리스트 UI 가 없어서 학생 단위로 보려면 SpeedGrader 로 가야 한다.

**2단계 (LearningX custom)**. LearningX 는 Canvas 통계 화면을 "재채점 진입점" 으로 활용한다. 문제은행에 링크된 문제는 통계 화면 문항 카드 헤더에서 바로 "문제은행 답안 수정 → 학생 점수 일괄 반영" 을 호출할 수 있다. 즉 통계 화면이 단순 조회가 아니라 "통계 보고 → 문제 답이 잘못됐다고 판단 → 그 자리에서 재채점" 워크플로우의 거점이 된다. Canvas 표준에는 없는 운영 시나리오.

**3단계 (xnquiz)**. xnquiz 는 통계 화면을 학생/문항 두 관점으로 명시 분리했다. "학생별 성적 조회" 탭은 Canvas Student Analysis CSV 가 화면으로 올라온 셈 (검색/정렬/필터 + 답안 확인 진입). "퀴즈 통계" 탭은 Canvas Quiz Summary 를 한국 대학 운영 관점으로 재구성. 핵심 추가는 (1) 난이도 자동 분류 (≥70% 쉬움 / 40~69% 보통 / <40% 어려움) 로 문항 품질을 즉시 판단 가능, (2) 점수 분포 구간 (상위 27% / 중위 46% / 하위 27%) 로 학생 군집 파악, (3) 응시 현황 카드 5행으로 응시율 추적, (4) 성적/문항 분석 xlsx 다운로드.

**트레이드오프**. xnquiz 는 Canvas 의 문항 유형별 Renderer (선택지별 응답 비율 막대, 정답률 도넛, Discrimination Index, 빈칸별 분포, 변수 분포 등) 를 통째로 포기하고 "테이블 + 가로 BarChart + 난이도 라벨" 로 단순화했다. 운영자가 "이 문항이 쉬운지 어려운지" 만 빠르게 보면 되는 시나리오에 맞춘 결정. 반면 "왜 어려운가" (어떤 오답이 많은가, 변별도가 어떤가) 를 알기 위해 답안별 분포가 필요한 시점이 오면 Canvas Item Analysis 같은 깊이가 필요해진다.

**남은 격차**. Item Analysis / Student Analysis CSV 의 모든 시도 / 마지막 시도 분기, Discrimination Index, 객관식 선택지별 분포 막대, 빈칸/드롭다운별 응답 분포 등 Canvas 의 통계 깊이는 xnquiz 가 미구현. xnquiz 가 도입한 난이도 자동 분류, 점수 분포 구간, 응시 현황 5행은 Canvas 에 없어서 역수입할 가치가 있다.

---

## 5. 누락 의심 / 확인 필요

- **xnquiz 의 평균 응시시간 계산 기준**: Canvas 는 `durationAverage` (초) 를 HH:MM:SS 로 표시. xnquiz 는 "분" 단위인지, 시간/분/초 분기인지 코드 확인 필요.
- **Canvas 의 includesAllVersions 옵션 대응**: xnquiz 의 학생별 성적 조회는 최신 시도만 표시인지, 모든 시도를 행으로 노출하는지 명시 필요. mockData 의 `scorePolicy` (최고/평균/최신) 와의 정합성 확인.
- **LMS 의 재채점 흐름이 xnquiz 에서 어떻게 대체되는지**: xnquiz 는 S-04 편집 화면의 `RegradeOptionsModal` 로 재채점을 트리거. LMS 처럼 "통계 화면에서 바로 재채점" 진입점이 필요한지 정책 결정.
- **점수 분포 구간 (상위 27% / 중위 46% / 하위 27%)**: 통계학적 표준 (예: Cronbach 변별도 산출 시 상위/하위 27% 비교) 기반인지, xnquiz 자체 기준인지 출처 명시 필요.
- **Survey / 설문 모드**: Canvas 는 survey 보고서 disabled. xnquiz 는 survey 모드 자체가 없는데, 향후 도입 시 통계 정책 결정 필요.
- **Section / 분반 필터**: xnquiz 의 강좌 모델에 section 개념이 있는지 확인. 대규모 강좌에서 section 별 통계 비교가 필요할 수 있음.
- **Discrimination Index (변별도) 도입 여부**: 문항 품질 평가의 표준 지표. 난이도와 별개로 추가할지 결정 필요.

---

## 6. 자기 점검 체크리스트

- [x] Canvas 의 Quiz Summary (5지표) + Score Percentile Chart + Question Breakdown (8개 Renderer) + Item Analysis / Student Analysis 보고서 모두 행으로 분리
- [x] LMS 재채점 통합 (8개 세부 동작) 별도 표로 분리
- [x] xnquiz 의 학생별 성적 조회 탭 (10개 세부 기능) + 퀴즈 통계 탭 (8개 차트/카드/테이블) + 다운로드 (2종) 모두 매트릭스에 포함
- [x] xnquiz 의 난이도 자동 분류 / 점수 분포 구간 / 응시 현황 카드 / 문항별 득점률 ReferenceLine 등 도메인 특화 기능을 [C] 신규로 명시
- [x] 영역 분리 표 8개 (헤더 / 요약 / 차트 / 문항별 / 학생별 탭 / 다운로드 / 빈 상태 / LMS 재채점)
- [x] 표 헤더 굵게, 셀 표기 규칙 (O / O (차이: ~) / - / O+custom / O (신규 [C])) 준수
- [x] 가운뎃점 미사용, 이모지 미사용
- [x] 한국어 UI 라벨 따옴표 인용 + Canvas 영문은 영문 그대로
