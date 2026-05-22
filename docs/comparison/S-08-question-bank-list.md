# S-08. 문제은행 목록 — Canvas / LearningX(LMS) / xnquiz 비교

> 화면 단위 3-way 비교. raw 출처:
> Canvas = `_drafts/canvas-spec.md` S-08
> LMS = `_drafts/lms-customs-spec.md` S-08 (delta 없음)
> xnquiz = `_drafts/xnquiz-spec.md` S-08

---

## 1. 개요

| **항목** | **Canvas (Classic Quizzes)** | **LearningX (LMS)** | **xnquiz** |
| --- | --- | --- | --- |
| 경로 | `/courses/:course_id/question_banks` | Canvas 와 동일 (Laravel 래퍼만, custom 없음) | `/question-banks` |
| 화면명 | "Course Question Banks" (User/Account 컨텍스트 별 분기) | 동일 | "문제모음" |
| 권한 | 교수자/조교/학생 모두 진입 가능 (액션은 권한 분기) | 동일 | 교수자 전용 (학생 진입 라우트 없음) |
| 진입 동선 | S-01 헤더 ⋮ "Manage Question Banks" (교수자), "View Question Banks" (학생), 편집 폼 "View Course Question Banks" | Canvas 와 동일 | Layout nav "문제모음" |
| 카드 단위 | 은행(bank) 카드 | 은행 카드 | 은행 카드 |
| 컨텍스트 | Course / User(북마크) / Account 3종 | 동일 | Course 단일 (현재 코스 하드코딩) |

---

## 2. 기능 매트릭스

표기 규칙
- O = 지원, X = 미지원, partial = 부분 지원
- 라벨 = "한국어 라벨" 그대로 인용. Canvas 는 영문 원문 + 한국어 의역
- `[A]` Canvas 기존 / `[B-#NN]` 학교 요구사항 신규 / `[C]` 자체 도출 개선

| **영역** | **세부 항목** | **Canvas** | **LMS (delta)** | **xnquiz** | **라벨/비고** |
| --- | --- | --- | --- | --- | --- |
| 진입점 | URL | O `/courses/:cid/question_banks` | = Canvas | O `/question-banks` | xnquiz 는 코스 prefix 없음 |
| 진입점 | S-01 헤더 메뉴 진입 | O ⋮ "Manage Question Banks" | = Canvas | X (nav 진입만) | xnquiz 는 nav 로 진입 |
| 진입점 | 학생용 진입 | O "View Question Banks" | = Canvas | X | xnquiz 학생 라우트 없음 |
| 진입점 | 사용자 컨텍스트 (북마크) | O `/users/:uid/question_banks` | = Canvas | X | xnquiz 미지원 |
| 진입점 | 계정 컨텍스트 | O `/accounts/:aid/question_banks` | = Canvas | X | xnquiz 미지원 |
| 헤더 | 페이지 타이틀 | O "Course Question Banks" | = Canvas | O "문제모음" `[A]` | xnquiz 단일 컨텍스트 |
| 헤더 | "새 은행" 진입 버튼 | O 우측 사이드바 "Add Question Bank" | = Canvas | O 헤더 "새 문제모음" (`Plus` 아이콘, default) `[A]` | Canvas 는 인라인 폼, xnquiz 는 모달 |
| 헤더 | "가져오기" 버튼 | X | X | O "가져오기" (outline, `FolderInput`) `[B/C]` | xnquiz 신규 |
| 헤더 | "내보내기" 버튼 | X | X | O "내보내기" (outline, `FolderOutput`) `[B/C]` | xnquiz 신규 |
| 사이드바 | "View Bookmarked Banks" | O (컨텍스트 ≠ 현재 사용자일 때) | = Canvas | X | xnquiz 북마크 개념 자체 없음 |
| 본 컨텍스트 vs 북마크 분리 | 본 과목 은행 / Bookmarked Banks 별도 진입 | O | = Canvas | X | xnquiz 단일 그리드 |
| 카드 | 레이아웃 | partial 리스트 (`.question_bank` partial 반복) | = Canvas | O 카드 그리드 1/2/3 열 반응형 `[A]` | xnquiz 가 더 카드형 |
| 카드 | 제목 | O `a.title` 또는 "No Name" | = Canvas | O 제목 텍스트 `[A]` | 무명 시 표기 차이 |
| 카드 | 인라인 편집 (이름) | X (사이드바 "Edit Bank Details" 진입 필요) | = Canvas | O 호버 시 연필 아이콘 → 인라인 편집 (Enter/Esc/blur) `[C]` | xnquiz UX 개선 |
| 카드 | "N Questions" / "No Questions" 카운트 | O `assessment_questions.active.count` | = Canvas | O "{N}개 문항" `[A]` | |
| 카드 | "Last Updated: {datetime}" | O | = Canvas | O "최종 수정 {updatedAt}" `[A]` | |
| 카드 | 난이도 메타 | X | X | O 난이도 배지 ("상" 빨강 / "중" 호박 / "하" 초록 / "미지정" 회색) `[B/C]` | xnquiz 신규 메타 |
| 카드 | 사용 중인 퀴즈 표기 | X | X | partial 데이터 모델에 `usedInQuizIds` 보유 (목록 카드 UI 노출은 미확인) | mockData 시드만 존재 |
| 카드 | 카드 클릭 → 상세 | O | = Canvas | O `/question-banks/:bankId` 이동 | |
| 카드 액션 | Bookmark / Unbookmark | O 호버 시 (`.bookmark_bank_link`) | = Canvas | X | xnquiz 미지원 |
| 카드 액션 | Edit | O `.edit_bank_link` (호버, `manage_assignments_edit && :update`) | = Canvas | O 인라인 편집으로 통합 `[A]` | 별도 버튼 없음 |
| 카드 액션 | Delete | O `.delete_bank_link` (호버, `manage_assignments_delete && :delete`) | = Canvas | O 카드 우상단 `Trash2` 아이콘 → `ConfirmDialog` `[A]` | xnquiz 는 항상 노출 |
| 카드 액션 | Copy (은행 복사) | X | X | O 카드 우상단 `Copy` 아이콘 → 복사 + 토스트 "바로가기" 액션 `[B/C]` | xnquiz 신규 |
| 카드 액션 | 호버 시 액션 노출 vs 항상 노출 | 호버 시 | = Canvas | 항상 노출 (아이콘 자체) | UX 차이 |
| 정렬 | 사용자 정렬 UI | X (서버 정렬 고정, 보통 updated_at desc 추정) | = Canvas | X (별도 정렬 컨트롤 없음) | 모두 미지원 |
| 정렬 | Outcomes 정렬 | partial (Aligned Outcomes 는 S-09 상세에서만) | = Canvas | X | 목록 단위 Outcomes 메뉴 없음 |
| 검색/필터 | 은행 이름 검색 | X | X | X (S-08 단위) | 모두 미지원 |
| 검색/필터 | 난이도 필터 | X | X | X (S-08 카드에 난이도 배지만, 필터는 없음) | xnquiz 도 목록 단위 필터 없음 |
| 빈 상태 | 은행 0개 | partial (그냥 빈 화면) | = Canvas | O `BookOpen` 아이콘 + "문제모음이 없습니다" + "새 문제모음을 만들어 문항을 관리하세요" + "첫 문제모음 만들기" 버튼 `[A]` | xnquiz 더 친절 |
| 빈 상태 | 점선 "+ 추가" 카드 | X | X | O 다른 카드 있을 때만 "+ 새 문제모음 추가" `[C]` | xnquiz 신규 |
| 모달 — 생성 | 새 은행 만들기 UI | partial (인라인 폼 `#edit_bank_form`, hidden → Add 클릭 시 노출) | = Canvas | O `AddBankModal` "새 문제모음 만들기" `[A]` | xnquiz 는 모달 |
| 모달 — 생성 | 이름 input | O `assessment_question_bank[title]` | = Canvas | O placeholder "문제모음 이름 (예: 기말고사 문제모음)" `[A]` | |
| 모달 — 생성 | 난이도 선택 | X | X | O 버튼 4종 "미지정/상/중/하" + 안내 "난이도 '{label}'인 문항만 추가할 수 있습니다" `[B/C]` | xnquiz 신규 |
| 모달 — 가져오기 | 외부 코스/은행에서 가져오기 | X (목록 화면 단위) | X | O `ImportBankModal` "가져오기" — 좌측 은행 선택 / 우측 문항 선택 패널 + 신규 은행 생성 모드 `[B/C]` | xnquiz 신규. 동선은 S-04 "Find Bank" 와 별개 |
| 모달 — 내보내기 | 다른 코스/은행으로 내보내기 | X | X | O `ExportBankModal` "내보내기" — 코스 → 은행 선택 + 신규 은행 생성 모드 `[B/C]` | xnquiz 신규 |
| 모달 — 일괄 업로드 | .xlsx/.csv 업로드 | X | X | X (S-08 단위. 업로드는 S-09 진입 후) | S-09 에서 다룸 |
| 토스트 | 복사 성공 | X | X | O "'{newName}' 문제모음이 생성되었습니다" + "바로가기" `[C]` | |
| 토스트 | 가져오기 성공 | X | X | O "'{name}' 문제모음에 {N}개 문항 가져오기 완료" + "바로가기" `[C]` | |
| 토스트 | 내보내기 성공 | X | X | O "'{name}' 문제모음에 {N}개 문항을 내보냈습니다" + "바로가기" `[C]` | |
| 토스트 | 생성/복사/삭제/가져오기/내보내기 실패 | X | X | O "{action} 중 오류가 발생했습니다" 패턴 `[C]` | |
| Edge case | 은행명 없음 | O "No Name" 표시 | = Canvas | partial (이름 없는 상태 진입 자체 어려움 — 모달에서 미입력 시 disabled) | |
| Edge case | 권한 없는 은행 | O Edit/Delete 숨김 | = Canvas | N/A (단일 역할) | |
| Edge case | User 컨텍스트 (북마크 전용) | O Add 버튼 숨김 / 북마크 목록만 | = Canvas | N/A | |
| 권한 | 학생 진입 가능 여부 | O (View Question Banks 메뉴) | = Canvas | X (instructor only) | xnquiz 학생 동선 자체 없음 |

---

## 3. 시스템별 상세

### 3-1. Canvas

- 소스: `app/views/question_banks/index.html.erb` + `_question_bank.html.erb`
- 페이지 타이틀이 컨텍스트별로 분기됨 ("Course Question Banks" / "User Question Banks" / "Account Question Banks")
- **우측 사이드바**에 2개 액션:
  - "Add Question Bank" — 컨텍스트 ≠ User && `:create` 권한
  - "View Bookmarked Banks" — 컨텍스트 ≠ 현재 사용자
- 카드는 **호버 시에만** 액션(Bookmark/Edit/Delete) 노출. 권한별로 숨김
- 새 은행 만들기는 **인라인 폼** `#edit_bank_form`. 평소 hidden, Add 클릭 시 노출
- 카드 카운트는 "N Questions" 또는 "No Questions" (zero 분기)
- "Last Updated" 표기

### 3-2. LearningX (LMS)

- **delta 없음.** Canvas 표준 그대로 사용
- 단, `routes/web.php` 라인 201 에 `Route::post('/question_banks', 'QuestionBanks\LTIController')` 가 있으나 LTI 진입용으로 본 화면 분석 범위 밖
- custom.js 도 S-08 영향 없음

### 3-3. xnquiz

- 소스: `src/pages/QuestionBankList.jsx`
- **교수자 전용** (학생 라우트 자체 없음)
- 헤더 액션 3종:
  - "가져오기" (outline)
  - "내보내기" (outline)
  - "새 문제모음" (default, `Plus` 아이콘)
- 카드 그리드 1/2/3 열 반응형 + 점선 "+ 새 문제모음 추가" 카드 (다른 카드 있을 때만)
- 각 카드:
  - 제목 + 호버 시 연필 아이콘으로 인라인 편집 (Enter/Esc/blur)
  - 우상단 액션 2개: `Copy` "복사" / `Trash2` "삭제"
  - 난이도 배지 + " · {N}개 문항"
  - "최종 수정 {updatedAt}"
- 빈 상태: `BookOpen` 아이콘 + "문제모음이 없습니다" + 첫 만들기 CTA
- 모달:
  - `AddBankModal` 새 만들기 (이름 + 난이도 4종 + 만들기)
  - `ImportBankModal` 외부 은행/문항 가져오기 (좌은행 / 우문항 패널)
  - `ExportBankModal` 다른 코스/은행으로 내보내기
- 토스트는 4초 자동 닫힘. 복사/가져오기/내보내기 성공 시 "바로가기" 액션 포함

---

## 4. 핵심 차이 요약

1. **북마크/멀티 컨텍스트 드롭** — Canvas 의 User/Account 컨텍스트, "View Bookmarked Banks" 는 xnquiz 미지원. 본 코스 은행 단일 그리드로 단순화.
2. **난이도 메타 신규** — Canvas/LMS 는 난이도 개념 없음. xnquiz 는 은행 단위 + 문항 단위 난이도 도입. 카드에 색상 배지로 시각화.
3. **가져오기/내보내기 헤더 액션 추가** — Canvas 는 목록 화면에서 cross-bank 이동 동선 없음. xnquiz 는 헤더에 모달 2종 추가.
4. **인라인 편집 + 카드 복사** — Canvas 는 Edit/Delete 만, xnquiz 는 카드에서 이름 인라인 편집 + 복사 액션 추가.
5. **빈 상태 친절 + 점선 추가 카드** — Canvas 는 단순 빈 화면, xnquiz 는 아이콘 + 안내 + CTA + 점선 카드로 진입 동선 강화.
6. **권한 단순화** — Canvas 는 manage/review/student 3단계 권한 분기, xnquiz 는 교수자 전용 (학생/조교 분기 없음).
7. **모달 vs 인라인 폼** — Canvas 새 은행 생성은 인라인 hidden 폼, xnquiz 는 정식 모달.

---

## 5. 누락 의심 / 확인 필요

| **항목** | **시스템** | **의심 사유** |
| --- | --- | --- |
| 은행 카드에 "사용 중인 퀴즈" 표기 | xnquiz | `Bank.usedInQuizIds` 필드는 시드에 있으나 S-08 카드 UI 노출 여부 미확인 |
| 은행 정렬 (이름/수정일/문항수) | xnquiz | 카드 그리드에 별도 정렬 컨트롤 없음. 단순 입력 순서로 추정 |
| 은행 검색 | xnquiz | S-08 단위 검색 인풋 없음 (S-09 안에서만 검색) |
| Account 레벨 은행 공유 | xnquiz | 코스 간 공유는 가져오기/내보내기로 대체. 글로벌 은행 개념 없음 |
| `ImportBankModal` / `ExportBankModal` step 흐름 | xnquiz | raw spec 에 "일부만 확인" 으로 표기됨. step 별 검증 룰 미확정 |
| Bookmark Banks 정책 | xnquiz | 도입 여부 자체가 결정 안 됨 |

---

## 6. 자기 점검 체크리스트

- [x] 경로/URL 라벨 일치 확인 (Canvas `/question_banks` vs xnquiz `/question-banks`)
- [x] 헤더 3액션 (가져오기/내보내기/새 문제모음) 모두 라벨 인용으로 매트릭스에 반영
- [x] 카드 5요소 (제목/인라인 편집/액션 2개/난이도 배지/문항 카운트/최종 수정일) 행으로 분리
- [x] 빈 상태 텍스트 원문 인용 ("문제모음이 없습니다" / "새 문제모음을 만들어 문항을 관리하세요")
- [x] 모달 3종 (Add/Import/Export) 각각 매트릭스 행 + 상세 절에 기재
- [x] Bookmark 기능 드롭 (X) 명시
- [x] 권한 차이 (Canvas multi role vs xnquiz instructor only) 명시
- [x] LMS delta 없음 명시 (S-08 은 custom.js 비대상)
- [x] [A]/[B]/[C] 라벨 매트릭스 셀에 부여
- [x] "·" (가운뎃점) 사용 없음 / 이모지 없음
- [x] 표 헤더 굵게
