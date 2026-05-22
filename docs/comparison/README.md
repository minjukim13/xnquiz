# Canvas / LearningX(LMS) / xnquiz — 퀴즈·문제은행 기능 스펙 3-way 비교

## 0. 본 문서의 목적

- 세 시스템의 퀴즈 + 문제은행 기능을 **화면 단위로** 비교
- 누락 없이, 작은 버튼/아이콘/안내문구까지 매트릭스에 반영
- xnquiz 가 어떤 Canvas 기능을 **드롭**했고 어떤 신규 `[B]`/`[C]` 기능을 추가했는지 추적 가능하도록 정리
- 분석 기준 시점: 2026-05-21
- 분석 범위: **Canvas Classic Quizzes** 만 (New Quizzes 제외)

---

## 1. 비교 대상 시스템 정의

| **시스템** | **정체** | **본 비교에서의 대상 영역** |
| --- | --- | --- |
| **Canvas** | Instructure Canvas LMS 의 Classic Quizzes 표준 (master branch 기준) | `/courses/:course_id/quizzes` ~ `/question_banks` 일체. 13개 문항 유형 (Classic) |
| **LMS (LearningX)** | Laravel 5.5 래퍼 (Xlearn) + Canvas 코어 + `custom.js` delta | Canvas 표준 위에 활성 custom 3개 + 예시 custom 4개 = 총 7개 custom.js 의 보강분 |
| **xnquiz** | React 19 + Vite 8 + Tailwind v4 프로토타입 (자사 차세대) | 9개 화면 (S-01 ~ S-09). 12개 문항 유형 |

---

## 2. 라벨 규칙 (xnquiz SSD 와 동일)

| **라벨** | **의미** |
| --- | --- |
| `[A]` | Canvas 기존 기능 (xnquiz 가 그대로 또는 의역으로 채택) |
| `[B-#NN]` | 학교 요구사항 신규 (URD 기반) |
| `[C]` | 자체 도출 개선 (UX / 정책 / 시각화 등 자체 판단) |

**매트릭스 셀 표기 규칙** (모든 S-XX 화면 파일 공통)

- `O` = 지원, `-` = 미지원
- `O (차이: ...)` = 지원하지만 동작/라벨/정책이 다름. 핵심 차이만 짧게
- `O+custom` 또는 `LMS delta:` = LMS 가 custom.js 로 보강
- `O (신규 [B-#NN])` = xnquiz 학교 요구사항 신규
- `O (신규 [C])` = xnquiz 자체 도출 개선
- Canvas 영문 라벨은 한국어 의역 + 영문 병기, xnquiz 한국어 라벨은 따옴표로 인용

---

## 3. 화면별 비교 문서

| **화면 ID** | **화면명** | **문서** |
| --- | --- | --- |
| S-01 | 퀴즈 목록 | [S-01-quiz-list.md](S-01-quiz-list.md) |
| S-02 | 퀴즈 생성 | [S-02-quiz-create.md](S-02-quiz-create.md) |
| S-03 | 퀴즈 상세 | [S-03-quiz-detail.md](S-03-quiz-detail.md) |
| S-04 | 퀴즈 편집 | [S-04-quiz-edit.md](S-04-quiz-edit.md) |
| S-05 | 채점 대시보드 | [S-05-grading-dashboard.md](S-05-grading-dashboard.md) |
| S-06 | 퀴즈 통계 | [S-06-quiz-stats.md](S-06-quiz-stats.md) |
| S-07 | 퀴즈 응시 | [S-07-quiz-attempt.md](S-07-quiz-attempt.md) |
| S-08 | 문제은행 목록 | [S-08-question-bank-list.md](S-08-question-bank-list.md) |
| S-09 | 문제은행 상세 | [S-09-question-bank.md](S-09-question-bank.md) |

9개 화면 모두 작성 완료. 각 파일은 1) 개요 2) 기능 매트릭스 3) 시스템별 상세 4) 핵심 차이 요약 5) 누락 의심 6) 자기 점검 6절 구조.

---

## 4. 전사 요약 — Canvas 대비 xnquiz 의 핵심 변화

| **#** | **변화 카테고리** | **사유 / 근거** | **영향 화면** | **라벨** |
| --- | --- | --- | --- | --- |
| 1 | 주차/차시 메타 + 필터/정렬 추가 | URD `[B-#12]` 학교 요구사항. Canvas 는 Module 로만 묶음 | S-01, S-02, S-04 | `[B]` |
| 2 | 지각 제출 정책 카드 노출 (`allowLateSubmit` + `lateSubmitDeadline`) | 학사 정책 명시화. Canvas 는 `due_at` 후 자동 late marking 만 | S-01, S-02, S-03, S-04 | `[B/C]` |
| 3 | 5단계 상태 시각화 (초안/예정/진행중/채점중/마감) + D-day 배지 | Canvas 는 published/unpublished 2종만 | S-01, S-03 | `[C]` |
| 4 | 성적 공개 4축 정책 (점수/정답/응답피드백/오답해설 별도 토글 + 시점) | Canvas `hide_results` 단일 옵션 매트릭스를 4축으로 분해 | S-02, S-03, S-04, S-07 | `[C]` |
| 5 | 가져오기 / 내보내기 (퀴즈, 문제은행) | Canvas Direct Share 대체 동선 | S-01, S-08 | `[B/C]` |
| 6 | 일괄 업로드 (.xlsx/.csv) + 템플릿 + 난이도 mismatch 검증 | Canvas 미지원. 문항 대량 등록 | S-09 | `[B/C]` |
| 7 | 난이도 메타 (은행/문항 + 통계 득점률 기반 분류) | Canvas 난이도 개념 없음 | S-02, S-04, S-06, S-08, S-09 | `[B/C]` |
| 8 | 문항 유형 13 → 12 (Missing Word 드롭, Multiple Dropdowns 로 흡수) | UX 단순화 | S-02, S-04, S-09 | `[C]` |
| 9 | 2-step 문항 추가 UI (유형 카드 + 미리보기 → 폼) | Canvas 단일 select 의 학습 비용 절감 | S-02, S-04, S-09 | `[C]` |
| 10 | 응답 피드백 아코디언 (정답/오답/무조건 표시 통합) | Canvas 의 평면 3종 코멘트를 묶고 공개 정책 안내 명시 | S-02, S-04, S-09 | `[C]` |
| 11 | 채점 대시보드 신설 (문항 중심 / 학생 중심 듀얼 모드) | Canvas SpeedGrader + Moderate 의 통합 | S-05 | `[C]` |
| 12 | 채점 일괄 처리 (전체 정답 / 전체 오답 / 미제출자만 0점) | Canvas 미지원 | S-05 | `[B/C]` |
| 13 | 가산점 (`fudgePoints`) UI 노출 + tooltip | Canvas 도 fudge 는 있으나 UI 가 SpeedGrader 안에만 | S-05 | `[A/C]` |
| 14 | 조건부 재응시 부여 (`ConditionalRetakeModal`) | Canvas Moderate 의 Extra Attempts 를 조건 기반으로 확장 | S-05 | `[B/C]` |
| 15 | 마감 후 자동 0점 처리 (`autoSubmitExpiredStudents`) | Canvas 의 autosubmit 정책 명시화 | S-05, S-07 | `[C]` |
| 16 | 응시 자동저장 + 활동 로그 (focus_loss/navigate/answer_change) | Canvas autosave 위에 부정행위 감지 보강 | S-07 | `[B/C]` |
| 17 | Mastery Paths / SIS / Direct Share / Outcomes 메뉴 제거 | LMS 통합 외 기능 단순화. xnquiz 가 코스 단위 가정 | S-01, S-03, S-04, S-08, S-09 | `[C]` (드롭) |
| 18 | Bookmark Banks / Account 컨텍스트 / User 컨텍스트 드롭 | xnquiz 는 코스 단일 컨텍스트 | S-08 | `[C]` (드롭) |
| 19 | Move/Copy 다이얼로그 드롭 (cross-bank 이동) | S-08 의 Import/Export 모달로 대체 | S-09 | `[C]` (드롭) |
| 20 | Practice 모드 + 호박 안내 | "성적에 반영되지 않습니다" 명시 | S-02, S-03 | `[C]` |
| 21 | 학생 학습 기여 표시 + 코멘트 thread (양방향) | Canvas 는 SpeedGrader 코멘트 단방향 위주 | S-05 | `[C]` |
| 22 | 추가 기간 설정 (`AssignmentOverrides`) UI 노출 | Canvas Overrides 의 UI 단순화 | S-02, S-04 | `[A]` |
| 23 | 응시 부정행위 방지 (우클릭/복붙 차단) | LMS 활성 custom 3종 중 1 | S-07 | `[B-LMS]` (LMS 보강 → xnquiz 미확인) |
| 24 | 응시 sticky 사이드바 (PC) / 모바일 fixed 50:50 레이아웃 | LMS 활성 custom 보강 | S-07 | `[B-LMS]` |
| 25 | 응시 제출 버튼 빨강 강조 | LMS 활성 custom 보강 | S-07 | `[B-LMS]` |

---

## 5. Canvas 대비 미지원 항목 (의도적 드롭)

xnquiz 가 **의도적으로** 채택하지 않은 Canvas 기능 + 사유 + 향후 검토 여부.

| **Canvas 기능** | **드롭 사유** | **향후 검토** |
| --- | --- | --- |
| Mastery Paths (조건부 진도) | 코스 학습 흐름 기능. 퀴즈 도구 범위 밖 | LMS 본체 영역. 미검토 |
| SIS / Sync to SIS | 학사 연계는 LearningX 본체 | LMS 본체 영역. 미검토 |
| Direct Share (Send to / Copy to) | 사용자 간 직접 공유. 코스 단위 가정과 충돌 | MVP2 검토 후보 |
| Aligned Outcomes (문제은행 단위) | 역량 기반 평가 미도입 | MVP3 후보 |
| Bookmark Banks | 다중 컨텍스트(User/Account) 가정에 결합 | 미검토 |
| Account / User 컨텍스트 은행 | 코스 단일 컨텍스트로 단순화 | 미검토 |
| Move/Copy 다이얼로그 (문제은행 상세) | S-08 Import/Export 로 대체 | 사용자 피드백 후 재검토 |
| Missing Word 문항 유형 | Multiple Dropdowns 로 흡수 가능 | 미검토 (드롭 확정) |
| Equations Help 모달 (LaTeX/MathJax) | 수식형 폼 내부에 변수+수식 input 으로 대체 | MVP2 검토 |
| 25개 초과 페이지네이션 (Show Question Details) | 단일 리스트 + 필터/검색으로 대체 | 100문항 이상 성능 검토 필요 (PM3) |
| Master Course 잠금 (`.uneditable`) | Blueprint Course 미도입 | LMS 본체 영역 |
| IP Filter 다이얼로그 도움말 | xnquiz 는 단순 CIDR 표기법 안내만 | 유지 |
| Find Questions / Find Bank 모달 (S-04) | xnquiz 는 `QuestionBankModal` / `RandomQuestionBankModal` 로 재설계 | 유지 |
| Quiz Restrictions 영역 (one_question_at_a_time, cant_go_back) | "문항 표시 설정" + "응시 설정" 으로 분리 + 한국어화 | 유지 |
| SpeedGrader (per-attempt 채점 UI) | 채점 대시보드 (문항 중심 / 학생 중심) 로 재구성 | 유지 |
| Moderate Quiz 별도 화면 | 채점 대시보드에 통합 | 유지 |

---

## 6. LearningX custom.js 가 보강한 항목 — xnquiz 의 처리

`lms-customs-spec.md` 의 7개 custom 별로 xnquiz 가 어떻게 다루는지.

| **custom** | **상태** | **영향 화면** | **요지** | **xnquiz 처리** |
| --- | --- | --- | --- | --- |
| `prevent-quiz-cnp.js` | 활성 | S-07 | 응시 중 우클릭/복붙/드래그 차단 + alert "시험화면내 복사/붙여넣기는 허용되지 않습니다." | 코드에서 미확인. SSD 정책 결정 필요 (xnquiz spec "누락 의심 영역" 에 명시) |
| `quiz-sticky-sidebar.js` | 활성 | S-07 | PC sticky / 모바일 fixed 상단 (문제목록+남은시간 50:50) | xnquiz 응시 화면 레이아웃 정책 별도. 검토 필요 |
| `quiz-submit-button-styling.js` | 활성 | S-07 | "퀴즈 제출" 버튼 빨강(#D9534F) + 중앙 정렬 | xnquiz 디자인 시스템 (Toss Blue) 과 충돌. destructive variant 채택 여부 검토 필요 |
| `quiz-details-guide.example.js` | 예시 | S-02, S-04 | 안내 박스 3종 자동 삽입 + 신규 퀴즈 "오답 여부 표시하기" 자동 해제 | xnquiz 는 신규 퀴즈도 성적 공개 4축 정책으로 명시 입력. 안내 박스는 미도입 |
| `quiz-erratum-download.example.js` | 예시 | S-03 | 우측 사이드바 "퀴즈 오답률 다운로드" 버튼 | xnquiz 는 S-06 통계 화면에서 `downloadItemAnalysisXlsx` 로 대체 |
| `quiz-rescore.example.js` | 예시 | S-04, S-06 | 재채점 안내 박스 + 단답형 [재채점] 버튼 + 통계 화면 문제은행 답안 수정 후 재채점 | xnquiz 는 `RegradeOptionsModal` 4종 (`award_both` / `new_answer_only` / `full_points` / `no_regrade`) 로 정형화 |
| `quiz-rescore.canvas2024.example.js` | 예시 | S-04, S-06 | 위 rescore 의 Canvas 2024 대응판 | xnquiz 는 React 자체 구현이므로 대응 불요 |

추가로 LearningX 자체 Blade 화면 (`cheating-prevention`, `pre-exam-consent`, TrustLock/ProctoringX 가이드) 은 본 비교 범위 밖 (xnquiz 도 AI 시험감독은 MVP 외).

---

## 7. 누락 의심 / 확인 필요 (전사 종합)

raw 스펙 3개의 "(미확인)" 항목 종합.

| **항목** | **시스템** | **사유** | **출처** |
| --- | --- | --- | --- |
| 응시 부정행위 방지 (우클릭/복붙 차단) | xnquiz | 코드에 없음. LMS custom 으로는 활성 | xnquiz-spec 누락 의심 |
| 채점 대시보드 키보드 단축키 | xnquiz | 명시적 코드 없음 | xnquiz-spec 누락 의심 |
| 답안지 PDF / 엑셀 출력 포맷 | xnquiz | `excelUtils.js` / `pdfUtils.js` 별도 정독 필요 | xnquiz-spec 누락 의심 |
| `RichTextEditor` 툴바 세부 (이미지/동영상) | xnquiz | `RichText.jsx` 추가 정독 필요 | xnquiz-spec 누락 의심 |
| `evalFormula` 지원 함수 (sqrt, ^, sin 등) | xnquiz | `utils/formulaEngine.js` 별도 | xnquiz-spec 누락 의심 |
| `ImportBankModal` / `ExportBankModal` step 흐름 | xnquiz | "일부만 확인" 표기 | xnquiz-spec 누락 의심 |
| LMS 학교별 custom.js 활성화 옵션 키 | LMS | 코드에 명시 안 됨 (학교별 빌드) | lms-customs-spec 0 |
| Bank `usedInQuizIds` 의 S-08 카드 UI 노출 여부 | xnquiz | 데이터 모델만 시드 존재 | S-08 매트릭스 |
| Numerical exact/range/precision 3종 분기 | xnquiz | Canvas 3종, xnquiz 단순 ±오차 | S-09 매트릭스 |
| Calculated "Generate possible solutions" 자동 해 생성 | xnquiz | 미확인 | S-09 매트릭스 |
| 다중 빈칸/드롭다운 캡 (6/4) 초과 시 동작 | xnquiz | "mismatch 경고" 만 표기 | S-09 매트릭스 |
| 100문항 이상 성능 (페이지네이션 없음) | xnquiz | PM3 부하 검토 필요 | S-09 매트릭스 |
| Move/Copy 다이얼로그 재도입 여부 | xnquiz | 사용자 피드백 후 재검토 | S-09 미지원 |
| Outcomes 도입 시점 | xnquiz | MVP3 후보로 추정 | S-09 미지원 |

---

## 8. raw 스펙 (참고용)

- [canvas-spec.md](_drafts/canvas-spec.md) — Canvas Classic Quizzes AS-IS (1326줄)
- [lms-customs-spec.md](_drafts/lms-customs-spec.md) — LearningX custom.js delta (242줄)
- [xnquiz-spec.md](_drafts/xnquiz-spec.md) — xnquiz 구현 스펙 (1726줄)

---

## 9. 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
| --- | --- | --- | --- |
| 2026-05-21 | v1 | 초안 작성. 9개 화면 (S-01~S-09) + 인덱스 + raw 스펙 3종 (canvas / lms-customs / xnquiz). 화면별 매트릭스 합계 약 870행, 총 분량 2,829줄 (인덱스+화면 9개) + 부록 3,294줄 (raw) = 6,123줄 | 김민주 |
