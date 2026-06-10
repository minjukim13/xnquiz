# XQ-SSD-021. 운영 설정·임시저장·게시·기간 정책 (Screen Spec)

> **참조 가이드**: XP2 \[Designer\] Screen Spec, DS Baseline 작성 가이드 (페이지 ID 5056888866)
> **본 SSD 범위**: XQ-URD-021 의 UX 요건 9 영역(퀴즈 유형, 평가 그룹, 응시 기간/마감/이용 종료, 지각 제출, 추가 기간/자동 제출 유예, 문항 표시/공정성, 응시 전 안내사항, 임시저장/게시/공개, 종합 확인) 을 현재 프로토타입 기준으로 명세. **응시 보안/감독/동의 본체는 XQ-SSD-021-B 위임**. 단계 인지(시험 설정 / 문항 추가) 의 UX 는 XQ-SSD-008 위임.

## 0. 문서 헤더

| **항목** | **내용** |
|---|---|
| 프로젝트 ID | XQ-202604_01 |
| 문서 ID | XQ-SSD-021-v0.2 |
| 작성자 | 김민주 (Creator) |
| 검토자 | 김범수 (PD) |
| 작성일 | 2026-06-04 |
| 상태 | Draft (PD 검토 전) |
| 참조 URD | [XQ-URD-021](https://xinics.atlassian.net/wiki/spaces/XP2/pages/5081628677) v1.0 |
| 참조 FRD | XQ-FRD-021 v0.2 |
| 참조 DS Baseline | LearningX DS Baseline 미확정. 임시 기준: `CLAUDE.md` Design System 절 |
| 참조 코드 | `src/pages/QuizCreate.jsx` `QuizEdit.jsx`, `src/components/PublishReviewModal.jsx`, `src/components/AssignmentOverrides.jsx`, `src/components/quiz-form/*` |

---

## 1. 역할별 네비게이션 구조

본 SSD 범위에서 분기하는 역할: **교수자(instructor) / 학생(student)**. TA(P-03) / 운영자(P-05) / 일정 관리자(P-13) 는 프로토타입 미구현 → "간극" 절 참조.

```
교수자 (instructor) 네비게이션:
홈
└── 퀴즈 목록 (/)
     ├── [신규 운영 설정] "새 퀴즈" → /quiz/new (시험 설정 탭 - 9 영역 입력)
     │                              ↓ "저장하기"
     │                              └── PublishReviewModal (게시 직전 종합 확인 9항목)
     │                                  ├── "돌아가서 수정" → 시험 설정 탭 복귀
     │                                  └── "이대로 공개" → 게시 + 공개 처리 → /
     │
     ├── [신규 임시저장] "새 퀴즈" → /quiz/new → "임시저장"
     │                              └── 임시저장 완료 안내 (학생 자동 비공개)
     │
     └── [기존 운영 변경] 카드 메뉴 → 편집 → /quiz/:id/edit
                                            └── 같은 흐름 (PublishReviewModal 공유)

학생 (student) 네비게이션:
홈
└── 퀴즈 목록 (/) — 게시 + 공개 두 조건 충족 퀴즈만 노출
     └── 퀴즈 카드 → 응시 화면 진입 전 안내(notice) 노출 (위치: 응시 인트로 영역)
                    └── 응시 시작

핵심 태스크 클릭 뎁스:
- 신규 운영 설정 + 게시: 퀴즈 목록 → 새 퀴즈 → 저장하기 → 이대로 공개 (4단계)
- 신규 임시저장: 퀴즈 목록 → 새 퀴즈 → 임시저장 (3단계)
- 기존 설정 변경 + 재게시: 퀴즈 목록 → 카드 메뉴 → 편집 → 저장하기 → 이대로 공개 (5단계)
```

**도달 원칙 (프로토타입 동작 기준)**

- 신규 운영 설정 + 게시 까지의 최대 클릭 뎁스 4단계 (가이드 권장 4단계 내).
- 종합 확인(PublishReviewModal) 은 저장하기 클릭 시 자동 노출. 누락/오설정 발견 시 "돌아가서 수정" 으로 무손실 복귀.
- 임시저장 흐름은 종합 확인을 거치지 않고 즉시 저장 (제목만 입력하면 가능).
- 학생은 게시 + 공개 두 조건이 모두 충족된 퀴즈만 목록에서 확인 가능 (UX-P08-001).

---

## 2. 화면 목록

| **화면 ID** | **화면명** | **라우트 / 진입** | **역할** | **연결 URD 요구사항** | **우선순위** |
|---|---|---|---|---|---|
| SCR-I-EDIT-INFO | 시험 설정 탭 (운영 설정 9 영역) | `/quiz/new` `/quiz/:id/edit` (tab=info) | 교수자 | UX-P07-001~003/010~012/020~023/030~032/040/050~051 | P0 |
| SCR-I-PUBLISH-REVIEW | 게시 직전 종합 확인 모달 | 저장하기 클릭 시 모달 오버레이 | 교수자 | UX-P07-060/061 | P0 |
| SCR-L-ATTEMPT-INTRO | 학생 응시 진입 전 안내 영역 | `/quiz/:id/attempt` 진입 시 노출 | 학생 | UX-P08-001/002/003/004 | P0 |

**화면 ID 공유 안내**

- `SCR-I-EDIT-INFO` 는 SSD-008(단계 인지 관점) 과 공유. 본 SSD 는 9 영역 운영 설정 내용 / 임시저장-게시-공개 / 종합 확인 관점만 명세.
- `SCR-L-ATTEMPT-INTRO` 는 SSD-021-B(응시 보안/감독/동의) 와 공유. 본 SSD 는 응시 전 안내사항(notice) 표시 시점만 명세.

---

## 3. 화면별 상세 설계

### SCR-I-EDIT-INFO. 시험 설정 탭 (운영 설정 9 영역)

**구현 파일**: `src/pages/QuizCreate.jsx` `QuizEdit.jsx` 의 `InfoTab`

**목적**

교수자가 9 영역 운영 설정을 입력. 각 영역의 학생 측 영향이 설정 과정에서 사전 인지되도록 안내. 단계 인지(StepIndicator) 는 SSD-008 위임, 본 절은 영역별 입력/안내 패턴만 다룸.

**레이아웃 (9 영역 - graded 모드 기준 노출 순서)**

```
[Section 1: 퀴즈 유형]
  ├── 평가용 퀴즈 / 연습용 퀴즈 두 카드 (border 강조로 선택)
  └── 각 카드 안에 "성적에 반영" / "성적에 반영되지 않음" 안내

[Section 2: 기본 정보]
  ├── 퀴즈 제목 (required, 입력 시 StepIndicator info 단계 완료 판정)
  ├── 설명 (textarea, 8행)
  ├── 평가 그룹 (graded 모드만 노출)
  │    └── CustomSelect (중간고사 / 기말고사 / 퀴즈 / 과제 / 출석 5종, LX 가 비중 관리)
  └── 주차/차시 (WeekSessionPicker)

[Section 3: 응시 기간]
  ├── 시작 일시 (DateTimePicker)
  ├── 마감 일시 (DateTimePicker + HelpCircle Tooltip "정규 제출 기한")
  ├── "미설정 시 응시 기간 제한 없음" 하단 안내
  ├── 이용 종료 일시 (DateTimePicker + HelpCircle Tooltip "접근 종료 시점, 마감 이후 권장")
  │    └── lockDate < dueDate 시 warning 박스 ("마감 전에 접근 차단 가능")
  └── 지각 제출 허용 Toggle
       └── 허용 시: 지각 제출 마감 일시 (DateTimePicker, min=dueDate) + "미설정 시 무제한" 안내

[Section 4: 추가 기간 설정]
  └── AssignmentOverrides 컴포넌트 (학생별 추가 기간 / 마감 / 이용 종료 변경)

[Section 5: 응시 설정]
  ├── 시간 제한 사용 Toggle
  │    └── 분 입력 + 자동 제출 5분 유예 Toggle (Tooltip "이용 종료 일시 필수")
  ├── 재응시 허용 Toggle
  │    └── 허용 시: 적용 점수 (최고/최신/평균) + 제출 횟수 (2~10회 / 무제한) CustomSelect
  └── 문항 표시 옵션
       ├── 선지 순서 섞기 / 문제 순서 섞기 (Toggle)
       └── 한 번에 한 문제만 표시 / 응답 후 문항 잠금 (Toggle)

[Section 6: 응시 보안 및 감독 (SecuritySection)]
  └── XQ-SSD-021-B 위임. 본 SSD 에서는 영역 존재만 명시

[Section 7: 성적 공개]
  ├── 학생에게 점수 공개 Toggle
  └── 활성 시: 범위 (오답만 / 정답까지) + 시점 (즉시 / 마감 후 / 기간 지정) + 1회 조회 옵션

[Section 8: 응시 전 안내사항]
  ├── 사전 안내 사용 Toggle
  └── 활성 시: textarea (기본 카피 자동 채움, 학생 응시 진입 전 표시)

[Section 9: 퀴즈 공개 여부]
  └── 학생에게 퀴즈 공개 Toggle (description: "비공개 시 학생 화면에 표시되지 않음. 임시저장 상태는 자동 비공개")

[푸터: 취소 / 임시저장 / 저장하기]
```

| **영역** | **URD 요구사항 매핑** |
|---|---|
| 퀴즈 유형 (Section 1) | UX-P07-001/002/003 |
| 기본 정보 / 평가 그룹 (Section 2) | UX-P07-003 |
| 응시 기간 (Section 3) | UX-P07-010/011/012 + UX-COM-003 |
| 지각 제출 (Section 3 하단) | UX-P07-020/021/022/023 |
| 추가 기간 (Section 4) | UX-P05-001/002/003 (운영자 P-05 권한은 미구현 → 간극 G-1) |
| 응시 설정 (Section 5) | UX-P07-030/031, 자동 제출 유예 UX-P05-004 |
| 응시 보안 (Section 6) | XQ-SSD-021-B 위임 (UX-P07-032 명시 분리 원칙) |
| 성적 공개 (Section 7) | URD-022/025 영역 (본 SSD 범위 외) |
| 응시 전 안내사항 (Section 8) | UX-P07-040 |
| 공개 여부 (Section 9) | UX-P07-050/051 |
| 종합 확인 (Section 9 다음, 모달) | UX-P07-060/061 → SCR-I-PUBLISH-REVIEW |

**사용 컴포넌트 (DS Baseline 참조)**

| **컴포넌트** | **위치** | **본 SSD 범위 내 용도** |
|---|---|---|
| `Section` / `Field` / `Toggle` | `src/components/quiz-form/*` | 9 영역 카드 + 항목 + 스위치 |
| `CustomSelect` | `src/components/CustomSelect.jsx` | 평가 그룹 / 점수 정책 / 제출 횟수 |
| `DateTimePicker` | `src/components/DateTimePicker.jsx` | 시작 / 마감 / 이용 종료 / 지각 마감 / 성적 공개 기간 |
| `WeekSessionPicker` | `src/components/WeekSessionPicker.jsx` | 주차 / 차시 |
| `AssignmentOverrides` | `src/components/AssignmentOverrides.jsx` | 추가 기간 대상자 부여 |
| `Tooltip` / `TooltipTrigger` / `TooltipContent` | shadcn | 마감 / 이용 종료 / 자동 제출 유예 의미 안내 (HelpCircle 아이콘) |
| `Button` | `@/components/ui/button` | 취소 (ghost) / 임시저장 (outline) / 저장하기 (default) |
| `ConfirmDialog` / `AlertDialog` | `src/components/ConfirmDialog.jsx` | 작성 취소 확인 / 검증 실패 안내 |

**인터랙션**

| **#** | **트리거** | **동작** |
|---|---|---|
| I-1 | 퀴즈 유형 카드 클릭 | `quizMode` 갱신. graded 선택 시 평가 그룹 Field 노출, practice 시 비노출 |
| I-2 | 마감 일시 입력 후 이용 종료 일시 < 마감 일시 | warning 박스 노출 ("마감 전에 접근 차단 가능") — 입력 자체는 허용 (소프트 경고) |
| I-3 | 지각 제출 허용 Toggle ON | 지각 제출 마감 Field 노출. 마감 일시 입력 시 `min=dueDate` 로 일반 마감 이전 설정 거부 (HTML5 native) |
| I-4 | 지각 제출 마감 미입력 + 허용 ON | "미설정 시 무제한 허용" 하단 안내 노출 |
| I-5 | 시간 제한 무제한 Toggle | 자동 제출 5분 유예 Toggle 강제 OFF (`!unlimitedTimeLimit` 조건) |
| I-6 | 자동 제출 5분 유예 ON + lockDate 미설정 | "저장하기" 클릭 시 검증 실패 → AlertDialog "이용 종료 일시 반드시 설정" |
| I-7 | "임시저장" 클릭 | 제목 미입력 시 AlertDialog. 입력됐으면 status=draft 로 저장 → 학생 자동 비공개 |
| I-8 | "저장하기" 클릭 | 검증 실패 시 AlertDialog 첫 에러. 통과 시 `PublishReviewModal` 오픈 (→ SCR-I-PUBLISH-REVIEW) |
| I-9 | 공개 여부 Toggle (Section 9) | `form.visible` 갱신. 임시저장 상태에선 무관 (자동 비공개 원칙) |

**상태**

| **상태** | **트리거** | **표현** |
|---|---|---|
| 운영 설정 입력 중 | tab=info | InfoTab 의 9 Section 노출. 입력값 변경 시 즉시 form state 갱신 |
| 임시저장 완료 | "임시저장" 성공 | AlertDialog "임시저장 완료" — 학생 자동 비공개 안내 카피 동반 |
| 검증 실패 | 저장하기 클릭 + 첫 에러 | AlertDialog "필수 항목 미입력" + 에러 메시지 |
| 공개 여부 (게시 후) | form.visible 토글 | description "임시저장 상태는 자동 비공개" 안내 항상 노출 |

---

### SCR-I-PUBLISH-REVIEW. 게시 직전 종합 확인 모달

**구현 파일**: `src/components/PublishReviewModal.jsx`

**목적**

운영 설정 9 항목을 게시 직전 종합 확인. 누락/오설정 발견 시 시험 설정 탭으로 무손실 복귀해 수정 가능 (UX-P07-060). 추가 기간 + 자동 제출 유예 + 지각 제출이 결합된 학생 측 최종 운영 결과 확인 (UX-P07-061).

**레이아웃**

```
[Dialog: max-w-2xl, max-h-[85vh]]
[Header]
  ├── DialogTitle "공개 설정 확인"
  └── DialogDescription "공개하면 학생이 즉시 응시할 수 있습니다. 아래 항목을 확인해 주세요"

[Body: overflow-y-auto]
  ├── (warning 항목 있을 시) 상단 warning 박스
  │    └── warning-bg + AlertTriangle + 항목별 영향 카피 리스트
  ├── ReviewItemCard × N (warning + 사용자가 변경한 항목 노출)
  │    ├── 1. 시험 유형 및 평가 그룹
  │    ├── 2. 응시 기간 (시작 ~ 마감 + 이용 종료)
  │    ├── 3. 지각 제출 정책 (비허용 / 허용 (지각 마감 시각) / 허용 (무제한))
  │    ├── 4. 추가 기간 설정 (N건 대상자별 별도 마감 / 없음)
  │    ├── 5. 응시 정책 (시간 제한 + 자동 제출 유예 + 재응시 횟수 + 적용 점수)
  │    ├── 6. 문항 구성 (N문항 · 총 N점)
  │    ├── 7. 문항 표시 설정 (선지/문제 셔플, 한 문항씩, 응답 후 잠금)
  │    ├── 8. 응시 보안 및 감독 (활성 옵션 나열) — XQ-SSD-021-B 영역
  │    └── 9. 성적 공개 정책 (범위 + 시점 + 1회 조회)
  └── (기본 설정 N개 접힘) "기본 설정 N개 보기" 토글 → 기본값 항목 추가 노출

[Footer]
  ├── 좌측: "돌아가서 수정" (ghost + ArrowLeft) → onOpenChange(false), 시험 설정 탭 복귀
  └── 우측: "이대로 공개" (default) → onConfirm → status=open 저장 + 목록 이동
```

**ReviewItemCard 구조**

```
[ReviewItemCard]
  ├── 좌측 번호 원 (1~9, warning 시 bg-warning text-white)
  ├── 제목 + (warning 시) "확인 필요" 배지 (bg-warning + AlertCircle)
  ├── value (whitespace-pre-line, 다중 행 표시)
  └── note (선택, 보조 안내)
```

**사용 컴포넌트**

| **컴포넌트** | **용도** |
|---|---|
| `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` / `DialogDescription` | 모달 컨테이너 + 헤더 |
| `Button` | 돌아가서 수정 (ghost size=sm) / 이대로 공개 (default size=sm) |
| Lucide icons | `AlertCircle` `AlertTriangle` `ArrowLeft` `ChevronDown` `ChevronUp` |

**인터랙션 + 검증 로직 (`buildReviewItems`)**

| **#** | **항목** | **warning 조건** | **warning 카피** |
|---|---|---|---|
| 1 | 평가 그룹 | graded + assignmentGroupId 미선택 | "평가 그룹을 선택하지 않으면 성적에 반영되지 않습니다" |
| 2 | 응시 기간 | 시작 + 마감 모두 미설정 | "응시 기간을 비워두면 학생이 언제든 응시할 수 있는 상태로 공개됩니다" |
| 6 | 문항 구성 | questions.length === 0 | "문항이 비어 있어 학생이 응시할 수 없습니다" |
| 9 | 성적 공개 | 재응시 허용 + 즉시 공개 조합 | "재응시 허용 + 제출 즉시 공개 조합은 다음 응시 전 정답이 알려질 수 있습니다" |

**상태**

| **상태** | **표현** |
|---|---|
| 기본 (전 항목 OK) | warning 박스 비노출. ReviewItemCard 만 노출 |
| 1건 이상 warning | 상단 warning 박스에 영향 카피 누적 노출 + 해당 카드는 warning-border + 번호 원 강조 |
| 기본값 다수 (변경 안 한 항목) | "기본 설정 N개 보기" 토글로 접힘. 사용자 클릭 시 펼침 |

---

### SCR-L-ATTEMPT-INTRO. 학생 응시 진입 전 안내 영역

**범위 분리**: 본 SSD 는 운영 설정에서 입력한 **응시 전 안내사항(notice)** 의 표시 시점만 명세. 응시 보안/감독/동의 영역은 XQ-SSD-021-B 의 PreflightGate 위임.

**현재 프로토타입 동작**

응시 전 안내사항은 운영 설정 Section 8(`form.notice`) 에서 입력. 학생 측에서는 응시 진입 전 노출 — 현재 프로토타입에서는 PreflightGate(보안 옵션 활성 시) 또는 QuizAttempt 인트로 영역에서 노출.

**간극 항목**

본 SSD 범위에서 응시 전 안내사항(notice) 의 학생 측 표시 위치/형식이 현재 프로토타입에서 어디에 노출되는지 정합 확인 필요. UX-P08-002 ("응시 진입 전 안내사항 확인") 요구사항이 충족되는지 → "간극" 절 G-A 참조.

---

## 4. 반응형 분기

| **디바이스** | **너비** | **SCR-I-EDIT-INFO** | **SCR-I-PUBLISH-REVIEW** |
|---|---|---|---|
| 모바일 | ~767px | Section 카드 1열, 응시 기간 grid-cols-1, 푸터 flex-wrap | Dialog max-w 모바일 폭 따름, 본문 스크롤 |
| 태블릿 | 768~1023px | Section 1열, 응시 기간 grid-cols-2 | Dialog max-w-2xl |
| 데스크톱 | 1024px~ | 컨테이너 max-w-5xl 중앙, Section 1열 유지 | Dialog max-w-2xl |

---

## 5. 비정상 상태 UX

| **상태** | **트리거** | **현재 프로토타입 표현** |
|---|---|---|
| 로딩 (QuizEdit 진입) | `!loaded` | Skeleton 묶음 (G-8 도입, SSD-008 §5 참조) |
| 검증 실패 (자동 제출 유예 + lockDate 미설정) | 저장하기 클릭 | AlertDialog "자동 제출 5분 유예 사용 시 이용 종료 일시를 반드시 설정해야 합니다" |
| warning (이용 종료 < 마감) | 입력 변경 즉시 | 인라인 warning 박스 (warning-bg + warning-border + 카피) — 저장 가능 (소프트) |
| warning (PublishReview, 평가 그룹 미선택) | 종합 확인 진입 시 | 상단 warning 박스 + 카드 9-no-1 강조 — "돌아가서 수정" 으로 복귀 가능 |
| warning (PublishReview, 응시 기간 미설정) | 종합 확인 진입 시 | 상단 warning 박스 + 카드 2 강조 |
| warning (PublishReview, 문항 0개) | 종합 확인 진입 시 | 상단 warning 박스 + 카드 6 강조 |
| warning (PublishReview, 재응시 + 즉시 공개) | 종합 확인 진입 시 | 상단 warning 박스 + 카드 9 강조 |
| 임시저장 시 학생 자동 비공개 | 임시저장 성공 | AlertDialog 안내 카피 + Section 9 description 항상 노출 ("임시저장 상태는 자동 비공개") |
| 게시 + 비공개 | 공개 여부 OFF + 저장 | 학생 목록에서 비노출. 교수자 목록 카드 메뉴에 비공개 배지 (XQ-SSD-018 위임) |
| 권한 없음 (학생 직접 URL 진입) | role !== 'instructor' | `<Navigate to="/" replace />` — 사유 안내 없음 (G-6, SSD-008 와 공통) |

---

## 프로토타입과 URD 간극

| **#** | **간극 항목** | **결정** | **처리 상태** |
|---|---|---|---|
| G-1 | 운영자(P-05) / 일정 관리자(P-13) 역할 분기 | (B) URD 완화 | **URD-021 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리. P-13 은 강사의 일정 운영 측면 페르소나임을 명시 |
| G-2 | TA(P-03) 분기 (UX-P03-001/002) | (B) URD 완화 | **URD-021 v1.0 정정 완료** (2026-06-05) — Canvas 권한 비트 위임으로 정리 |
| G-3 | 설문 마이그레이션 데이터 표시/전환 | (B) 정책 미확정 | URD-021 본문에 "마이그레이션 정책 확정 후 UX 반영" 명시되어 있음. 본 SSD 는 평가용/연습용 두 유형만 명세 |
| G-4 | 지각 제출 마감 < 일반 마감 거부 안내 (UX-P07-021) | (B) URD 완화 | **URD-021 v0.6 정정 완료** (2026-06-05) — "입력 제약 + 관련 안내 동반" 으로 완화 |
| G-5 | 응시 전 안내사항(notice) 학생 측 표시 위치/형식 (UX-P08-002) | (B) URD 보강 | 본 SSD 의 SCR-L-ATTEMPT-INTRO 영역에서 표시 시점만 명세. 상세 노출 위치/형식은 응시 화면 SSD(SSD-007 또는 SSD-021-B) 에서 정합 확인 |
| G-6 | 학생 직접 URL 진입 시 사유 안내 | (B) 백로그 | SSD-008 G-6 와 동일 |


---

## 변경 이력

| **날짜** | **버전** | **변경 내용** | **변경자** |
|---|---|---|---|
| 2026-06-05 | v0.2 | 간극 표 G-1/G-2/G-4 URD-021 정정 완료 반영 (v0.6/v1.0). 참조 URD 버전 v1.0 으로 갱신 | 김민주 (Creator) |
