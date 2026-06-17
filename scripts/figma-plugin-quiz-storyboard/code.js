// XN Quiz 생성 스토리보드 빌더
// 명령:
//   - build: 22 슬라이드 골격을 격자로 배치 (텍스트 전용 슬라이드는 본문 자동 채움)
//   - import: 캡쳐 PNG 18장을 UI 에서 받아 해당 placeholder 위에 자동 배치

const SLIDE_W = 1920
const SLIDE_H = 1400 // 기능 명세 내용 증가로 1080 → 1400 으로 확장
const PAD = 40
const COL_GAP = 80
const ROW_GAP = 80
const COLS = 4
const HEADER_H = 110
const CONTENT_Y = HEADER_H + 20
const CAPTURE_W = 1100
const CAPTURE_H = 688 // 16:10 비율 매치 (1440x900 PNG)
const SPEC_X = PAD + CAPTURE_W + 40
const SPEC_W = SLIDE_W - PAD - CAPTURE_W - PAD - 40
const BODY_H = SLIDE_H - CONTENT_Y - PAD - 60 // 명세 영역 전체 높이

// 슬라이드 데이터 (기획안 양식)
// spec: { description, functions[], actions[], validation[], permission, dataModel }
const SLIDES = [
  {
    id: 'C-01', title: '커버', category: 'cover',
    spec: { kind: 'meta', description: '문서 표지. 작성자/날짜/버전 정보.' },
    code: '—',
  },
  {
    id: 'C-02', title: '목차', category: 'cover',
    spec: { kind: 'meta', description: '슬라이드 22장의 전체 목록.' },
    code: '—',
  },
  {
    id: 'C-03', title: '사용자 플로우 다이어그램', category: 'overview',
    spec: { kind: 'meta', description: '진입부터 완료까지 전 과정의 화면 전이 다이어그램.' },
    code: 'src/pages/QuizCreate.jsx:223-244',
  },
  {
    id: 'S-01', title: '진입점 (퀴즈 목록 → 새 퀴즈)', category: 'main',
    spec: {
      description: '교수자가 새 퀴즈를 만들기 시작하는 진입점. 퀴즈 목록 화면에서 [+ 새 퀴즈] 버튼을 클릭하면 퀴즈 생성 화면(/quiz/new)으로 이동한다.',
      functions: [
        '헤더 우상단 [+ 새 퀴즈] 버튼: 항상 표시되는 기본 CTA.',
        '헤더 우상단 [가져오기] 버튼: 다른 퀴즈를 가져와 복제하는 기능 (별도 모달).',
        '빈 상태 중앙 [+ 새 퀴즈 만들기] 버튼: 필터링 결과 0건일 때만 표시.',
        '상단 필터: 상태(전체/초안/게시/마감) + 주차/차시 + 검색어.',
        '퀴즈 카드 리스트: 각 카드에 상태 배지/제목/일정/응시율 표시.',
        '버튼 클릭 시 react-router 의 <Link to="/quiz/new"> 로 SPA 이동 (페이지 리로드 없음).',
      ],
      actions: [
        '[+ 새 퀴즈] 클릭 → /quiz/new 로 이동.',
        '[+ 새 퀴즈 만들기] 클릭 (빈 상태) → /quiz/new 로 이동.',
        '[가져오기] 클릭 → QuizImportModal 오픈.',
        '퀴즈 카드 클릭 → 해당 퀴즈 상세 (/quiz/:id) 로 이동.',
        '뒤로가기 시 퀴즈 목록 유지.',
      ],
      validation: [
        '학생(student) 역할로 /quiz/new 직접 URL 진입 시 자동으로 / 로 리다이렉트 (<Navigate to="/" replace />).',
      ],
      permission: '교수자(instructor) 또는 운영자(admin) 권한 필수.',
    },
    code: 'src/pages/QuizList.jsx:362-367\nsrc/pages/QuizCreate.jsx:194',
  },
  {
    id: 'S-02a', title: '시험 설정 ① 일정 중심', category: 'main',
    spec: {
      description: '퀴즈 생성의 1단계 "시험 설정" 탭 상단부. 퀴즈 유형, 기본 정보, 응시 기간, 추가 기간 설정 등 일정 중심 항목을 입력한다.',
      functions: [
        '[퀴즈 유형] 평가용/연습용 라디오 카드 2종. 평가용 선택 시에만 "평가 그룹" 셀렉트 노출 (퀴즈/과제/시험 등 선택, 각각 반영 비중 보유).',
        '[기본 정보 > 퀴즈 제목] 한 줄 입력 (필수). placeholder: "예) 중간고사 - 데이터베이스 설계".',
        '[기본 정보 > 설명] 멀티라인 textarea, 최소 높이 176px, 리사이즈 가능.',
        '[기본 정보 > 평가 그룹] 평가용 선택 시에만 표시되는 셀렉트. 옵션은 ASSIGNMENT_GROUPS 에서 로드.',
        '[기본 정보 > 주차/차시] WeekSessionPicker. 상단 라디오 "주차/차시 선택" vs "선택 안 함" 2종.',
        '[주차] 드롭다운 형식. 옵션 클릭 시 우측에 휴지통 아이콘 표시. 하단에 [+ 주차 추가] 버튼. 최대 99주차.',
        '[주차 추가] 클릭 → 최대 주차+1 추가 + 자동 선택. 최대 도달 시 disabled, tooltip "최대 99주차까지 추가할 수 있습니다".',
        '[주차 삭제] 휴지통 클릭 → 마지막 주차만 삭제 가능 (최소 1개 유지). disabled tooltip "마지막 주차만 삭제할 수 있습니다" 또는 "최소 1개는 남겨야 합니다".',
        '[차시] 리스트 형식 (라디오 + 행). 행 우측에 [삭제] 텍스트 버튼. 하단에 [+ 차시 추가] 버튼. 최대 99차시. 옵션 0개 시 "차시가 없습니다" 안내.',
        '[차시 추가] 클릭 → 최대 차시+1 추가 + 자동 선택.',
        '[차시 삭제] 마지막 차시만, 최소 1개 유지.',
        '[주차/차시 선택 안 함] 라디오 → 주차/차시 영역 숨김 (week=null, session=null).',
        '[응시 기간 > 시작 일시] DateTimePicker (필수 아님).',
        '[응시 기간 > 마감 일시] DateTimePicker + 우측 ⓘ 툴팁 "학생이 퀴즈를 제출해야 하는 기한입니다. 마감 이후에는 제출이 불가합니다.".',
        '[응시 기간 > 이용 종료 일시] DateTimePicker + 툴팁 "퀴즈 페이지 자체에 접근할 수 없게 되는 시점입니다. 마감 이후에도 결과 확인할 수 있도록 마감 이후로 설정 권장.".',
        '[응시 기간 안내문구] "미설정 시 응시 기간 제한 없이 학생이 언제든 응시할 수 있습니다.".',
        '[지각 제출 허용] 토글. ON 시 하위 영역 노출 (S-02d 참조).',
        '[추가 기간 설정] AssignmentOverrides 영역 (S-02f 참조).',
      ],
      actions: [
        '퀴즈 유형 카드 클릭 → 선택 + 평가 그룹 셀렉트 노출/숨김.',
        '제목/설명 입력 → form.title, form.description 갱신.',
        '주차/차시 picker 라디오 클릭 → 영역 노출 토글.',
        '주차 드롭다운 클릭 → 옵션 리스트 펼침. 옵션 클릭 → 선택 + 닫힘.',
        '차시 행 라디오 클릭 → 선택.',
        '주차/차시 [추가] 버튼 → 다음 번호 자동 생성 + 자동 선택, localStorage 영속화 (코스 단위).',
        '주차/차시 [삭제] 버튼 → 해당 행 제거. 선택 중이었으면 마지막 남은 값으로 이동.',
        '일시 picker 클릭 → DateTimePicker 팝업 (날짜 + 시간 분리 입력).',
      ],
      validation: [
        '제목 빈 값으로 저장 시도 → "퀴즈 제목을 입력해주세요" (저장하기/임시저장 공통).',
        '마감 일시 ≤ 시작 일시 → "마감 일시는 시작 일시 이후여야 합니다".',
        '이용 종료 일시 < 마감 일시 → 인라인 노란 경고 박스 + 저장 검증 오류 "이용 종료 일시는 마감 일시 이후로 설정해야 합니다".',
        '마감 일시 미설정 + 지각 제출 마감 일시 입력 → "지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용 가능".',
      ],
      permission: '교수자/운영자 권한 필수.',
    },
    code: 'src/pages/QuizCreate.jsx:265-346\nsrc/components/WeekSessionPicker.jsx',
  },
  {
    id: 'S-02b', title: '시험 설정 ② 응시 동작', category: 'main',
    spec: {
      description: '시험 설정 탭의 중단부. 학생이 응시할 때의 시간 제한, 재응시 정책, 보안/감독 옵션, 문항 표시 방식을 설정한다.',
      functions: [
        '[응시 설정 > 시간 제한 사용] 토글 (기본 ON). ON 시 분 입력 + 자동 제출 5분 유예 토글 노출 (S-02d 참조).',
        '[응시 설정 > 재응시 허용] 토글 (기본 OFF) + 설명 "학생이 같은 퀴즈에 여러 번 응시할 수 있습니다". ON 시 적용 점수 + 제출 횟수 셀렉트 노출 (S-02e 참조).',
        '[응시 보안 > 시험 전용 브라우저] 토글 (기본 OFF) + 설명 "학생은 지정된 안전 브라우저에서만 응시할 수 있으며 다른 응용프로그램이 제한됩니다.".',
        '[응시 보안 > AI 시험 감독] 토글 (기본 OFF) + 설명 "응시 중 학생 화면과 웹캠 영상을 AI 가 모니터링하여 이상 행동을 단서로 표시합니다.".',
        '[응시 보안 > 응시 전 필수 동의] 토글 (기본 OFF) + 설명 "학생이 동의하지 않으면 응시 화면에 진입할 수 없습니다.". ON 시 동의 안내문 textarea 노출 (5행, 기본 안내문 placeholder).',
        '[문항 표시 > 선지 순서 섞기] 토글 + 설명 "객관식 문항의 선지 순서가 학생마다 무작위로 표시됩니다".',
        '[문항 표시 > 문제 순서 섞기] 토글 + 설명 "문제 순서가 학생마다 무작위로 표시됩니다".',
        '[문항 표시 > 한 번에 한 문항씩 표시] 토글 + 설명 "학생에게 문항을 1개씩만 보여주고 이전/다음 버튼으로 이동합니다". ON 시 하위에 응답 후 문항 잠금 토글 노출.',
        '[문항 표시 > 응답 후 문항 잠금] 한 번에 한 문항 ON 일 때만 표시. 설명 "다음으로 이동하면 이전 문항으로 돌아갈 수 없습니다".',
      ],
      actions: [
        '각 토글 클릭 → 즉시 form state 갱신 + 하위 영역 펼침/접힘.',
        '시간 제한 사용 OFF → disableAutoSubmit 도 강제 OFF.',
        '한 번에 한 문항 OFF → lockAfterAnswer 도 강제 OFF.',
        '응시 전 필수 동의 ON 시 → 안내문 textarea 입력. 빈 값이면 placeholder 의 기본 안내문이 학생 화면에 노출됨.',
      ],
      validation: [],
      defaultValues: [
        '시간 제한 사용: ON (60분).',
        '재응시 허용: OFF (1회).',
        '시험 전용 브라우저 / AI 감독 / 필수 동의: 모두 OFF.',
        '선지 섞기 / 문제 섞기 / 한 번에 한 문항: 모두 OFF.',
        '응답 후 문항 잠금: OFF.',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:348-443\nsrc/components/quiz-form/SecuritySection.jsx',
  },
  {
    id: 'S-02c', title: '시험 설정 ③ 공개/접근/안내', category: 'main',
    spec: {
      description: '시험 설정 탭의 하단부. 성적 공개 범위/시점, 접근 제한(코드/IP), 안내사항 표시, 학생 공개 여부를 설정한다. 하단 [취소] [임시저장] [저장하기] 액션 버튼 위치.',
      functions: [
        '[성적 공개 정책 > 성적 공개] 토글 (기본 OFF) + 설명 "제출 후 학생에게 성적 정보를 공개합니다". ON 시 공개 범위 + 공개 시점 + 응답 1회 조회 영역 노출 (S-02e 참조).',
        '[퀴즈 접근 제한 > 접근 제한 사용] 토글 (기본 OFF) + 설명 "액세스 코드 또는 허용 IP 를 지정해 응시 가능 범위를 제한합니다.".',
        '[접근 제한 > 액세스 코드] ON 시 노출. 한 줄 입력 + placeholder "코드를 입력하면 응시 시 코드 입력이 필요합니다" + 안내 "비워두면 액세스 코드 없이 응시 가능합니다.".',
        '[접근 제한 > 접근 가능한 IP 주소] textarea 3행 + placeholder (예: 192.168.1.0/24, 203.0.113.10) + 안내 "비워두면 모든 IP에서 접근 가능합니다. (CIDR 표기법 지원)".',
        '[퀴즈 안내사항 > 안내사항 표시] 토글 (기본 OFF) + 설명 "응시 전 학생에게 표시될 안내 문구를 작성합니다.".',
        '[안내사항 textarea] ON 시 노출. 기본 문구 자동 입력 (제출 후 수정 불가, 협력 금지, 부정행위 0점 처리 3개 항목).',
        '[퀴즈 공개 여부 > 학생에게 퀴즈 공개] 토글 (기본 ON) + 설명 "비공개 시 학생 화면에 퀴즈가 표시되지 않습니다. 임시저장 상태는 자동 비공개입니다.".',
        '[하단 액션] 좌측 [취소] (ghost) + 우측 [임시저장] (outline) + [저장하기] (primary).',
      ],
      actions: [
        '[성적 공개] ON → S-02e 의 공개 범위/시점/1회 조회 영역 펼침.',
        '[접근 제한 사용] ON → 액세스 코드 입력 + IP textarea 노출.',
        '[안내사항 표시] ON → textarea 노출 (기본 문구 자동 채움).',
        '[학생 공개] OFF 시 → 저장 후 학생에게 노출 안 됨 (status=open 이어도).',
        '[취소] 클릭 → hasChanges (title || description || questions>0) 판정 → 있으면 ConfirmDialog, 없으면 즉시 / 이동.',
        '[임시저장] 클릭 → handleSaveDraft → 제목 검증 → persistQuiz("draft") → AlertDialog "임시저장 완료" → 페이지 유지.',
        '[저장하기] 클릭 → handlePublish → getValidationErrors → 첫 오류 AlertDialog 또는 PublishReviewModal 오픈.',
      ],
      validation: [
        '저장하기 시 직렬 검증 8종 (E-01 참조).',
        '임시저장 시 제목만 필수.',
      ],
      defaultValues: [
        '성적 공개: OFF.',
        '접근 제한: OFF.',
        '안내사항: OFF (기본 문구 미리 입력됨).',
        '학생 공개: ON.',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:445-553, 237-243 (하단 버튼)',
  },
  {
    id: 'S-02d', title: '시험 설정 토글 ON ① 지각/시간', category: 'main',
    spec: {
      description: '응시 기간의 [지각 제출 허용] 토글과 응시 설정의 [시간 제한 사용] / [자동 제출 5분 유예] 토글을 ON 했을 때 하위 입력 영역이 펼쳐지는 상태. 좌측에 verticle border 로 들여쓰기 시각화.',
      functions: [
        '[지각 제출 허용 ON 영역] 토글 아래 들여쓰기 박스. 라벨 "지각 제출 마감 일시" + DateTimePicker.',
        '[지각 제출 마감 일시 미설정 안내] "미설정 시 무제한 허용".',
        '[시간 제한 사용 ON 영역] 토글 아래 들여쓰기 박스. 분 입력 number input (placeholder "60", min=1, width 24) + "분" 단위 라벨.',
        '[자동 제출 5분 유예 토글] 시간 제한 사용 ON 일 때만 영역 내 표시. 라벨 우측에 ⓘ 툴팁 "이용 종료 일시 설정이 필수입니다.".',
        '[자동 제출 5분 유예 설명] "제한 시간이 끝난 후 5분간 직접 제출이 가능하고, 5분이 지나면 자동 제출됩니다".',
      ],
      actions: [
        '[지각 제출 허용] 토글 ON → form.allowLateSubmit=true → 하위 영역 펼침.',
        '지각 마감 일시 입력 → DateTimePicker 팝업 (min=form.dueDate 로 마감일 이후만 선택 가능).',
        '[시간 제한 사용] 토글 OFF → form.unlimitedTimeLimit=true → 분 입력/유예 영역 숨김 + disableAutoSubmit 강제 false 처리.',
        '분 입력 변경 → form.timeLimit 갱신 (string 으로 저장, 저장 시 Number 변환).',
        '[자동 제출 5분 유예] 토글 → form.disableAutoSubmit 갱신.',
      ],
      validation: [
        '시간 제한 분 빈 값 또는 0 이하 → 저장 시 "제한 시간을 입력하거나 무제한으로 설정해주세요".',
        '자동 제출 5분 유예 ON + lockDate (이용 종료 일시) 미설정 → 저장 시 "자동 제출 5분 유예 사용 시 이용 종료 일시를 반드시 설정해야 합니다".',
        '마감 일시 미설정 + 지각 제출 마감 일시 입력 → 저장 시 "지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용할 수 있습니다".',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:329-378',
  },
  {
    id: 'S-02e', title: '시험 설정 토글 ON ② 재응시/공개', category: 'main',
    spec: {
      description: '[재응시 허용] 토글, [성적 공개] 토글, 공개 시점 [기간 설정] 라디오를 모두 ON 했을 때 하위 옵션이 펼쳐지는 상태.',
      functions: [
        '[재응시 허용 ON 영역] 좌측 들여쓰기. 2개 입력: 적용 점수 + 제출 횟수 제한.',
        '[적용 점수 셀렉트] 라벨 width 24. 옵션 3종: 최고 점수 유지(기본) / 최신 점수 유지 / 평균 점수. 셀렉트 폭 48.',
        '[제출 횟수 제한 셀렉트] 옵션: 2회, 3회, ..., 10회, 무제한(-1). 무제한 선택 시 form.unlimitedAttempts=true.',
        '[성적 공개 ON 영역] 4가지 하위 영역: 공개 범위 + 공개 시점 + (기간 설정 시 추가 입력) + 응답 1회 조회.',
        '[공개 범위 라디오 카드] 2개 옵션: "오답 여부만" (기본) - 정오답 ✓/✗ + 점수, 정답 비공개 / "정답까지" - 정오답 + 점수 + 정답 공개. 라디오 카드 그리드.',
        '[공개 시점 라디오 리스트] 3개 옵션: 제출 즉시(기본) - 학생이 제출하는 순간 바로 공개 / 마감 후 - 퀴즈 마감일 지나면 자동 공개 / 기간 설정 - 지정 기간에만 공개.',
        '[공개 시점 = 기간 설정 영역] 그리드 2컬럼. 공개 시작일 DateTimePicker + 공개 종료일 DateTimePicker. 상단 구분선 (border-blue-100).',
        '[응답 1회만 조회 허용 토글] 설명 "제출 직후 1회만 응답과 정답을 보여주고 이후 재접근 시 비공개 처리합니다".',
      ],
      actions: [
        '[재응시 허용] 토글 ON → allowAttempts=2, scorePolicy 셀렉트 노출. OFF → allowAttempts=1.',
        '적용 점수 셀렉트 변경 → form.scorePolicy 갱신. 옵션 한국어 그대로 저장 (서버 매핑 필요).',
        '제출 횟수 셀렉트 변경 → 무제한 선택 시 unlimitedAttempts=true, 그 외 allowAttempts=N + unlimitedAttempts=false.',
        '[성적 공개] 토글 ON → scoreRevealEnabled=true → 공개 범위/시점/1회 조회 노출.',
        '공개 범위 카드 클릭 → scoreRevealScope 갱신 (wrong_only / with_answer).',
        '공개 시점 라디오 클릭 → scoreRevealTiming 갱신 (immediately / after_due / period).',
        '"기간 설정" 선택 시 시작/종료 일시 추가 입력 영역 노출.',
        '[응답 1회 조회] 토글 → oneTimeResults 갱신.',
      ],
      validation: [
        '본 토글 ON 자체로는 추가 검증 없음.',
        '단, 공개 모달(S-09)에서 "재응시 허용 + 즉시 공개" 조합 시 경고 표시: "재응시 허용 시 점수가 즉시 공개되면 후속 응시 전 정답이 알려질 수 있습니다.".',
      ],
      defaultValues: [
        '적용 점수: 최고 점수 유지.',
        '제출 횟수: 1회 (재응시 OFF). ON 시 기본 2회.',
        '공개 범위: 오답 여부만.',
        '공개 시점: 제출 즉시.',
        '응답 1회 조회: OFF.',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:380-413, 445-509',
  },
  {
    id: 'S-02f', title: '추가 기간 설정 + 대상 선택 모달', category: 'main',
    spec: {
      description: '학과 그룹/특정 학생에게 별도 응시 기간을 부여하는 Override 기능. 기본 응시 기간과 다른 시작/마감/이용 종료 일시를 대상별로 설정한다.',
      functions: [
        '[안내 문구] 섹션 상단에 "특정 학생 또는 학과(그룹)에 기본 응시 기간과 다른 마감일 또는 열람 기간을 개별 설정합니다.".',
        '[+ 추가 기간 설정 추가] 점선 박스 버튼 (가장 하단). 클릭 시 빈 행 카드 1개 추가.',
        '[각 행 카드] 헤더에 "추가 대상 N" 라벨 + 우측 [삭제] 텍스트 버튼 (행 전체 제거).',
        '[행 > 대상 학생/그룹] 영역. 우측에 선택 카운터 "(N)" + [+ 대상 선택] outline 버튼.',
        '[행 > 대상 리스트 (TargetTable)] 선택된 학과 그룹 + 학생 2 섹션으로 분리 표시. 그룹 행: "그룹" 배지 + 학과명. 학생 행: 이름/학번/학과 3컬럼.',
        '[행 > 대상 리스트 > 빈 상태] "선택된 대상이 없습니다. 아래 [대상 선택] 버튼으로 추가해주세요." 점선 박스.',
        '[행 > 일시 3종] 시작 / 마감 / 이용 종료 일시 DateTimePicker (작은 size).',
        '[행 인라인 검증] 마감 ≤ 시작 시 빨간 글씨 "마감 일시는 시작 일시 이후여야 합니다". 이용 종료 < 마감 시 빨간 글씨 "이용 종료 일시는 마감 일시 이후로 설정해주세요.".',
        '[AssignTargetModal] [대상 선택] 클릭 시 오픈. 좌측 탭 "학과 그룹" / "학생". 학생 탭에서 다른 행에 이미 포함된 학생은 disabled.',
        '[모달 > 다중 선택] 체크박스 + 검색어 + 학과 필터.',
        '[모달 푸터] [취소] / [확인] 버튼. 확인 시 result 가 해당 행의 assignTo 에 반영.',
        '[행 내 대상 제거] 각 대상 행 우측 X 아이콘 → 해당 대상만 제거.',
      ],
      actions: [
        '[+ 추가 기간 설정 추가] 클릭 → 빈 행 (assignTo=[], dates=null) 생성.',
        '[삭제] (행 우측) 클릭 → 행 전체 제거.',
        '[+ 대상 선택] 클릭 → AssignTargetModal 오픈. excludeStudentIds 로 다른 행 포함 학생 차단.',
        '모달 [확인] → 선택 결과를 행의 assignTo 에 반영 + 모달 닫힘.',
        '각 대상 행의 X 클릭 → 해당 대상만 제거.',
        '일시 입력 → 즉시 update 호출.',
      ],
      validation: [
        '인라인 즉시 검증: 행 내 마감/시작/이용 종료 일시 순서 위반 시 빨간 글씨.',
        '저장 시 검증: hasDuplicateStudent → "동일한 학생이 여러 추가 기간 설정에 포함되어 있습니다" (단, 모달에서 이미 disabled 처리되어 거의 발생 안 함).',
        '저장 시 sanitizeAssignments 로 정제: assignTo 빈 행 자동 제거, 일시 null 필드 정리.',
      ],
    },
    code: 'src/components/AssignmentOverrides.jsx\nsrc/components/AssignTargetModal.jsx\nsrc/utils/assignments.js',
  },
  {
    id: 'S-03', title: '문항 구성 빈 상태', category: 'main',
    spec: {
      description: '퀴즈 생성의 2단계 "문항 구성" 탭. 문항이 아직 추가되지 않은 빈 상태에서 문항 추가 진입점을 제공한다.',
      functions: [
        '[상단 StepIndicator] "시험 설정 (1)" / "문항 구성 (2)". 완료 단계는 체크 마크.',
        '[헤더 카운터] 좌측 "0문항 | 총 0점" (questions.length, totalPoints).',
        '[헤더 우측 액션] [문항 만들기] outline 버튼 + [문제모음에서 추가] primary 버튼.',
        '[빈 상태 박스] dashed border + 안내문 "아직 추가된 문항이 없습니다" + 부가 안내 "상단의 \'문항 만들기\' 또는 \'문제모음에서 추가\' 버튼으로 시작합니다".',
      ],
      actions: [
        '[문항 만들기] 클릭 → setShowAddModal(true) → AddQuestionModal (12개 유형 선택).',
        '[문제모음에서 추가] 클릭 → Popover 오픈 (직접 선택 / 랜덤 출제).',
        'StepIndicator "시험 설정" 탭 클릭 → 1단계로 복귀 (form state 유지).',
      ],
      validation: [
        '문항이 0개 상태에서 저장하기 클릭 → "최소 1개 이상의 문항을 추가해주세요" (8개 검증 중 마지막).',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:570-606',
  },
  {
    id: 'S-04', title: '문항 추가 진입점 (팝오버)', category: 'main',
    spec: {
      description: '"문제모음에서 추가" 버튼 클릭 시 노출되는 Radix Popover. 직접 선택과 랜덤 출제 두 가지 방식을 분기 제공한다.',
      functions: [
        '[Popover trigger] [문제모음에서 추가] 버튼.',
        '[Popover 위치] 트리거 버튼 우측 정렬 (align="end") + 폭 72 (w-72).',
        '[메뉴 1 - 직접 선택] 행: 굵은 글씨 "직접 선택" + 부가 설명 "문제모음에서 원하는 문항을 골라 추가합니다".',
        '[메뉴 2 - 랜덤 출제] 행: 굵은 글씨 "랜덤 출제" + 부가 설명 "조건에 맞는 문항을 자동으로 선택합니다".',
        '[Popover 닫힘] 외부 클릭, ESC, 메뉴 선택 시 닫힘.',
      ],
      actions: [
        '[직접 선택] 클릭 → onShowBank → setShowBankModal(true) → QuestionBankModal 오픈 (Popover 자동 닫힘).',
        '[랜덤 출제] 클릭 → onShowRandomBank → setShowRandomBankModal(true) → RandomQuestionBankModal 오픈.',
      ],
      validation: [],
    },
    code: 'src/pages/QuizCreate.jsx:580-598',
  },
  {
    id: 'S-05', title: '문항 만들기 모달 (12개 유형)', category: 'main',
    spec: {
      description: '교수자가 새 문항을 직접 작성하는 모달. 12개 문항 유형을 카드 그리드로 노출하고, 유형 선택 후 해당 유형 전용 폼으로 전환된다.',
      functions: [
        '[유형 카드 그리드] 12개 유형 카드. 각 카드: 유형 아이콘 + 유형명 + 짧은 설명.',
        '[유형 1] 객관식(단일) - 보기 중 1개 선택. 자동 채점.',
        '[유형 2] OX (참/거짓) - 참 또는 거짓 선택. 자동 채점.',
        '[유형 3] 객관식(복수) - 보기 여러 개 동시 선택. 자동 채점 + 부분 점수 정책 (URD-010).',
        '[유형 4] 단답형 - 짧은 텍스트로 답변. 허용 정답 N개 등록 가능. 자동 채점 (대소문자/공백 정규화).',
        '[유형 5] 서술형 - 자유 서술. 루브릭 등록. 수동 채점.',
        '[유형 6] 숫자형 - 숫자 정답 + 허용 오차 (절대값). 자동 채점.',
        '[유형 7] 수식형 - 변수 정의 + 수식 입력으로 학생마다 다른 값 생성. 허용 오차 (절대/상대). 자동 채점.',
        '[유형 8] 매칭형 - 왼쪽-오른쪽 항목 연결. 페어 + distractor (오답지). 자동 채점.',
        '[유형 9] 빈칸 채우기 - 본문에 {1}, {2} 플레이스홀더 삽입 + 각 빈칸에 허용 정답 N개. 자동 채점.',
        '[유형 10] 드롭다운 - 본문에 [1], [2] 플레이스홀더 삽입 + 각 드롭다운에 옵션 + 정답 인덱스. 자동 채점.',
        '[유형 11] 파일 업로드 - 학생이 파일로 제출. 수동 채점.',
        '[유형 12] 안내문 - 채점 없는 안내문 (점수 0, 난이도 없음). 학생에게 설명만 표시.',
        '[공통 폼 필드] 본문(RichTextEditor, 이미지/iframe 인라인 지원) + 제목(선택) + 배점(0 이상 정수) + 난이도(상/중/하/선택 안 함) + 정답 코멘트 / 오답 코멘트 / 일반 코멘트 (선택).',
        '[유형별 추가 필드] 옵션 리스트, 정답 인덱스, 허용 정답 배열, 루브릭, 허용 오차, 변수 정의, 매칭 페어 등.',
        '[복수 정답 부분 점수 정책 (URD-010)] 객관식(복수) 전용. "퀴즈 기본값 사용" / "이 문항만 다르게 설정" 선택. 다르게 설정 시 적용 모드 (미적용/적용) + 오답 처리 방법 (정답 비율만/오답 차감/추측 보정 감점).',
        '[편집 모드] 기존 문항의 연필 아이콘 클릭 시 초기값으로 폼이 채워진 채 모달 오픈.',
      ],
      actions: [
        '유형 카드 클릭 → 해당 유형 폼 화면으로 전환 (initForm 으로 초기값 세팅).',
        '본문 입력 → RichTextEditor 실시간 갱신.',
        '옵션 추가/삭제 (객관식): [+ 옵션 추가] / 휴지통 아이콘.',
        '정답 표시: 객관식은 라디오, 객관식(복수)는 체크박스, 매칭은 연결선, OX 는 토글.',
        '[저장] 클릭 → buildQuestion(type, form) → onAdd 호출 → 모달 닫힘.',
        '[취소] / X / ESC → 모달 닫기 (입력 내용 폐기).',
      ],
      validation: [
        '공통: 본문 필수, 배점 0 이상 (안내문 제외).',
        '객관식(단일): 옵션 최소 2개.',
        '객관식(복수): 옵션 최소 2개 + 정답 최소 1개.',
        '단답형: 허용 정답 최소 1개 입력.',
        '숫자형: 정답이 유효한 숫자.',
        '수식형: 변수 최소 1개 + 수식 입력 + evalFormulaPreview 통과.',
        '매칭형: 페어 최소 2개 (좌/우 모두 입력).',
        '빈칸 채우기: 본문의 {N} 플레이스홀더 개수 = 정답 배열 길이, 각 빈칸에 최소 1개 허용 정답.',
        '드롭다운: 본문의 [N] 플레이스홀더 개수 = 드롭다운 배열 길이, 각 드롭다운에 옵션 최소 2개.',
      ],
    },
    code: 'src/components/AddQuestionModal.jsx',
  },
  {
    id: 'S-06', title: '문제모음 직접 선택 모달', category: 'main',
    spec: {
      description: '문제은행에서 문항을 골라 직접 추가하는 모달. 좌측 사이드바에 과목별 그룹핑된 은행 목록, 중앙에 선택된 은행들의 문항 리스트가 표시된다.',
      functions: [
        '[모달 타이틀] "문제모음에서 추가" + 부제 "좌측에서 문제모음을 선택하고, 우측에서 추가할 문항을 골라주세요".',
        '[좌측 사이드바 > 상단 검색] 은행명 검색 input + 돋보기 아이콘.',
        '[좌측 사이드바 > 과목별 그룹] 현재 과목(currentCourse) 최상단, 다른 과목 하단. 그룹 헤더에 과목명 + 과목 코드 칩.',
        '[좌측 사이드바 > 은행 행] 체크박스 + 난이도 배지(DiffBadge) + 은행 이름 + 우측 문항 수 카운터.',
        '[좌측 사이드바 > 검색 0건] "검색 결과가 없습니다" / "등록된 문제모음이 없습니다".',
        '[좌측 사이드바 > 자동 선택] 모달 열림 시 현재 과목의 첫 번째 은행 자동 체크.',
        '[중앙 > 상단 필터 1] 문항 본문 검색 input.',
        '[중앙 > 상단 필터 2] 문항 유형 셀렉트 (전체/객관식/단답형/...).',
        '[중앙 > 상단 필터 3] 난이도 셀렉트 (전체/상/중/하).',
        '[중앙 > 전체 선택 체크박스] 필터된 결과 모두 선택. indeterminate 상태 지원 (일부 선택 시).',
        '[중앙 > 문항 카드] 체크박스 + 유형 배지(TypeBadge) + 본문 미리보기 + 난이도 배지(상/중/하 색상별 칩) + 출처 은행명.',
        '[중앙 > 이미 추가된 문항] 체크박스 disabled + 카드 강조색 (border-accent).',
        '[중앙 > 무한 스크롤] 20개씩 표시, 스크롤 끝(80px 이내)에서 15개 추가 로드.',
        '[중앙 > 검색 0건] "검색 결과가 없습니다".',
        '[하단 푸터] 좌측 [닫기] (ghost) + 우측 [N개 추가] (primary). N=0 시 비활성 + 라벨 "추가".',
      ],
      actions: [
        '은행 체크박스 클릭 → 해당 은행 문항이 중앙 리스트에 합산 표시. 해제 시 그 은행 문항의 선택도 자동 해제.',
        '전체 선택 체크박스 → 현재 필터 결과의 모든 선택 가능 문항을 일괄 선택/해제.',
        '문항 체크박스 클릭 → 선택 카운터 증가/감소.',
        '필터 변경 → 즉시 리스트 재계산. visibleCount 20 으로 리셋.',
        '[N개 추가] → handleConfirmAdd → 각 선택 문항 onAdd 호출 (bankName 메타데이터 포함) + handleClose (선택 상태 초기화 + 모달 닫힘).',
        '[닫기] / 모달 외부 클릭 (Radix interactOutside 차단) / ESC → handleClose.',
      ],
      validation: [
        '선택 0개 → [추가] disabled.',
        '이미 추가된 문항은 added prop 으로 disabled, onAdd 시점에서도 중복 검사.',
      ],
    },
    code: 'src/components/QuestionBankModal.jsx',
  },
  {
    id: 'S-07', title: '문제모음 랜덤 출제 모달 (Step 1/2)', category: 'main',
    spec: {
      description: '조건에 맞는 문항을 무작위로 추출하는 2단계 모달. Step 1 에서 은행을 다중 선택, Step 2 에서 은행별 출제 개수/배점을 설정한다.',
      functions: [
        '[모달 타이틀] "복수 문제모음 랜덤 출제" + 부제 "여러 문제모음에서 조건에 맞는 문항을 랜덤으로 출제합니다.".',
        '[단계 인디케이터] 상단에 "1. 문제모음 선택" → "2. 출제 옵션 설정" 단계 표시. 완료 단계는 체크 마크.',
        '[Step 1 > 현재 과목 섹션] 과목 코드 칩 + 과목명. 우측에 [전체 선택]/[전체 해제] 텍스트 버튼.',
        '[Step 1 > 은행 행] 체크박스 + 은행 이름 + 난이도 배지 + 우측 [N개 미리보기] 텍스트 버튼 (N=available 수, 이미 추가된 문항 제외).',
        '[Step 1 > 미리보기 패널] [N개 미리보기] 클릭 시 행 아래 인라인 펼침. 테이블 컬럼: 번호 / 문항 / 유형 / 난이도 / 배점. 최대 220px 스크롤.',
        '[Step 1 > 다른 과목 보기] 토글로 타 과목 은행 표시. 과목별 그룹핑.',
        '[Step 1 > 빈 상태] "이 과목에 등록된 문제모음이 없습니다".',
        '[Step 2 > 은행별 카드] 은행마다 1개. 카드 내: 출제 개수 number/slider, 기본 배점 number, 난이도별 가용 문항 수(상/중/하) 표시.',
        '[Step 2 > 난이도별 배점 사용] 토글 (기본 OFF). ON 시 상/중/하 배점 각각 입력 (기본 6/5/4). 총점 계산 시 가용 문항 비율 가중 평균.',
        '[Step 2 > 총 출제 문항 수 / 총점] 상단 또는 푸터에 동적 합계 표시.',
        '[푸터] Step 1: [취소] / [다음] (선택 0개일 때 disabled). Step 2: [이전] / [추가].',
      ],
      actions: [
        '은행 체크박스 클릭 → selectedBankIds 갱신.',
        '[전체 선택] / [전체 해제] → 현재 과목 은행 일괄 토글.',
        '[N개 미리보기] 클릭 → previewBankId 토글, 인라인 미리보기 펼침/접힘.',
        '[다음] 클릭 → goToStep2 → 선택된 각 은행에 대해 default config 생성 (출제 5개, 배점 5점, 난이도별 6/5/4) + Step 2 로 전환.',
        'Step 2 출제 개수 변경 → 즉시 config 갱신 + 총점 자동 재계산.',
        '난이도별 배점 사용 ON → 카드에 상/중/하 배점 input 노출.',
        '[이전] → Step 1 로 복귀 (config 유지).',
        '[추가] → handleConfirm → 각 은행에서 셔플 후 count 만큼 슬라이스 → onAdd 호출 (각 문항에 randomPicked=true, bankName 부여). 모달 닫힘 + 모든 state 리셋.',
      ],
      validation: [
        'Step 1 선택 은행 0개 → [다음] 비활성.',
        '출제 개수 > 가용 문항 수 (available) → 자동으로 maxCount 로 제한.',
        '난이도 정보 없는 문항은 기본 배점 적용 (난이도별 배점 사용 시).',
      ],
    },
    code: 'src/components/RandomQuestionBankModal.jsx',
  },
  {
    id: 'S-08', title: '문항 채워진 상태 + 드래그 정렬', category: 'main',
    spec: {
      description: '문항이 1개 이상 추가된 상태의 문항 구성 탭. 카드 리스트로 표시되며 드래그 정렬, 편집, 삭제가 가능하다.',
      functions: [
        '[상단 헤더] 좌측 "N문항 | 총 N점" 카운터 (questions.length, totalPoints 동적). 우측 액션 그룹.',
        '[상단 액션] [문항 만들기] outline 버튼 + [문제모음에서 추가] primary 버튼 (Popover trigger).',
        '[문항 카드 1행] 드래그 핸들 (GripVertical 아이콘) + 번호 (1~N) + 유형 배지 (예: "객관식", "단답형") + 점수 ("5점") + (자동 채점 X 유형일 때 "수동채점" warning 배지) + 우측 편집(연필)/삭제(휴지통) 아이콘.',
        '[문항 카드 2행] 문제 본문 미리보기 (HTML 제거 + 2줄 line-clamp, ml-8 들여쓰기).',
        '[문항 카드 3행] 정답 영역 (회색 박스). QuestionAnswer 컴포넌트로 유형별 정답 시각화.',
        '[유형별 정답 표시] 객관식: 정답 텍스트. 단답형: 허용 정답 칩 리스트. 숫자형: 정답 ± 오차. 매칭: 페어 리스트. 빈칸/드롭다운: 인라인 정답.',
        '[정답 영역 숨김 유형] essay (서술형), file_upload (파일 업로드), text (안내문).',
        '[드래그 정렬] HTML5 native drag. 드래그 중인 카드 opacity 40%. 드롭 타깃 카드 primary border + bg-accent/30. 다른 카드 hover 시 border-slate-300.',
      ],
      actions: [
        '드래그 핸들 잡기 → onDragStart(idx) → 드래그 시작.',
        '다른 카드 위로 → onDragOver → setOverIdx → 시각적 강조.',
        '드롭 → onDrop → moveQuestion(fromIdx, toIdx) → questions 배열 재정렬 (splice).',
        '연필 아이콘 클릭 → setEditingQuestion(q) → AddQuestionModal 편집 모드로 오픈. 저장 시 updateQuestion 으로 갱신 (id 유지).',
        '휴지통 아이콘 클릭 → removeQuestion(qId) 즉시 호출 (별도 confirm 없음).',
        '[문항 만들기] → AddQuestionModal 신규 모드 오픈.',
        '[문제모음에서 추가] → Popover (직접 선택 / 랜덤 출제 선택).',
      ],
      validation: [
        '드래그 정렬은 드롭 위치가 원래 위치와 같으면 무시 (dragIdx === overIdx).',
        '문항 삭제 시 별도 confirm 없음 (즉시 삭제). 실수 가능성 있음 — 향후 confirm 추가 검토 필요.',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:608-651\nsrc/components/QuestionAnswer.jsx',
  },
  {
    id: 'S-09', title: '공개 설정 확인 모달', category: 'main',
    spec: {
      description: '저장하기 클릭 → 검증 통과 후 노출되는 9개 항목 종합 확인 모달. 사용자가 변경한 항목과 경고 항목만 기본 노출, 기본값 유지 항목은 접힘 상태.',
      functions: [
        '[모달 타이틀] "공개 설정 확인" + 부제 "공개하면 학생이 즉시 응시할 수 있습니다. 아래 항목을 확인해 주세요.".',
        '[경고 요약 박스] severity=warning 항목들의 영향(warningImpact)을 노란 박스에 일괄 표시. AlertTriangle 아이콘 + 메시지 리스트.',
        '[9개 항목 카드 - 1] 시험 유형 및 평가 그룹: "평가용/연습용" + (평가 그룹명 + 반영 비중). 평가 그룹 미선택 시 경고.',
        '[9개 항목 카드 - 2] 응시 기간: 시작~마감 + 이용 종료. 둘 다 미설정 시 경고 ("응시 기간을 비워두면 학생이 언제든 응시할 수 있는 상태").',
        '[9개 항목 카드 - 3] 지각 제출 정책: "허용 (지각 마감: X)" / "허용 (지각 마감 무제한)" / "비허용". 비허용이 기본.',
        '[9개 항목 카드 - 4] 추가 기간 설정: "N건 (대상자별 별도 마감 적용)" / "없음". 없음이 기본.',
        '[9개 항목 카드 - 5] 응시 정책: 시간 제한 (분 / 무제한 / 자동 제출 5분 유예) + 재응시 (1회 / N회 또는 무제한 + 적용 점수).',
        '[9개 항목 카드 - 6] 문항 구성: "N문항 · 총 N점". 0문항 시 경고.',
        '[9개 항목 카드 - 7] 문항 표시 설정: 선지/문제/한 번에 한 문항/응답 후 잠금 옵션 나열. 모두 OFF 시 "기본 표시 (옵션 없음)".',
        '[9개 항목 카드 - 8] 응시 보안 및 감독: 전용 브라우저/AI 감독/필수 동의 옵션 나열. 모두 OFF 시 "사용 안 함".',
        '[9개 항목 카드 - 9] 성적 공개 정책: 공개 범위 + 공개 시점 + (응답 1회 조회). 미공개 시 "비공개". 재응시 + 즉시 공개 조합 시 경고.',
        '[기본값 접기 토글] "기본 설정 N개 보기" / "접기" 텍스트 버튼. 기본값 유지 항목 (예: 추가 기간 없음, 보안 OFF 등) 노출/숨김 토글.',
        '[푸터] 좌측 [← 돌아가서 수정] (ghost) + 우측 [이대로 공개] (primary).',
      ],
      actions: [
        '[돌아가서 수정] 클릭 → onOpenChange(false) → 모달 닫기, 폼 화면 유지.',
        '[이대로 공개] 클릭 → onConfirm → doPublish → status=open 저장 → navigate("/") → 목록 복귀.',
        '[기본 설정 N개 보기] 클릭 → showDefaults 토글 → 기본값 항목 펼침/접힘.',
        'X 버튼 / ESC → onOpenChange(false) → 모달 닫기.',
      ],
      validation: [
        '본 모달 진입 자체가 검증 통과 후만 가능 (handlePublish 에서 errors 빈 배열 시).',
        '경고 항목 (severity=warning) 은 닫혀있어도 사용자가 의사결정 가능하도록 상단 요약 박스에 명시.',
      ],
    },
    code: 'src/components/PublishReviewModal.jsx',
  },
  {
    id: 'S-10', title: '완료 처리 (임시저장 / 공개)', category: 'main',
    spec: {
      description: '하단 액션 버튼 클릭 시 완료 처리. 임시저장은 페이지 유지 + 알림, 공개는 검증 + 확인 모달 → 목록 복귀.',
      functions: [
        '[임시저장 흐름] [임시저장] 클릭 → handleSaveDraft → 제목 검증 (form.title 빈 값이면 AlertDialog 오류) → persistQuiz("draft") → AlertDialog "임시저장 완료 / 퀴즈가 임시저장되었습니다." → 페이지 유지.',
        '[임시저장 status] draft 로 저장. visible 토글 값과 무관하게 자동 비공개 처리.',
        '[공개 흐름] [저장하기] 클릭 → handlePublish → getValidationErrors → errors.length=0 이면 setShowPublishReview(true) → 공개 확인 모달.',
        '[공개 모달 확인] PublishReviewModal 의 [이대로 공개] → doPublish → persistQuiz("open") → navigate("/") → 목록 복귀.',
        '[목록 복귀 후] 새로 만든 퀴즈가 상단에 표시되며 status 배지가 "초안" 또는 "게시" 로 표시됨.',
        '[저장 실패] try/catch 에러 → AlertDialog "저장 실패 / (err.message 또는 \'저장 중 오류가 발생했습니다.\')" (variant=error).',
        '[persistQuiz 내부] createQuiz(body) → questions.length>0 시 setQuizQuestions(id, questions) (전체 삭제 후 재생성 방식). buildQuizBody 가 모든 form 상태를 정규화하여 payload 생성.',
      ],
      actions: [
        '[임시저장] 클릭 → 제목만 검증 → persistQuiz("draft") → AlertDialog → 페이지 유지 (다시 편집 가능).',
        '[저장하기] 클릭 → 전체 8종 검증 → 공개 모달 → [이대로 공개] → persistQuiz("open") → 목록 이동.',
        'AlertDialog [확인] 클릭 → 다이얼로그 닫힘.',
      ],
      validation: [
        '임시저장 제목 없음 → AlertDialog "임시저장 불가 / 퀴즈 제목을 입력해주세요." (variant=error).',
        '공개 시 전체 8종 검증 (E-01 참조). 첫 오류만 AlertDialog 로 노출.',
        '저장 API 실패 → AlertDialog "저장 실패 / err.message".',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:113-216',
  },
  {
    id: 'E-01', title: '검증 오류 모음', category: 'extra',
    spec: { kind: 'meta', description: '저장하기 시도 시 발생할 수 있는 8종 검증 오류 목록. 직렬 검증 방식이므로 첫 오류만 AlertDialog 로 표시된다.' },
    code: 'src/pages/QuizCreate.jsx:88-99',
  },
  {
    id: 'E-02', title: '작성 취소 확인', category: 'extra',
    spec: {
      description: '취소 버튼 클릭 시 변경 사항이 있으면 ConfirmDialog 로 확인을 요청한다. 변경 사항이 없으면 즉시 목록으로 이동한다.',
      functions: [
        '[hasChanges 판정] form.title (퀴즈 제목 입력 여부) || form.description (설명 입력 여부) || questions.length > 0 (문항 추가 여부).',
        '[변경 있음 케이스] ConfirmDialog 표시 — 제목 "작성 취소", 메시지 "작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?".',
        '[변경 없음 케이스] confirm 생략, 즉시 navigate("/") 호출.',
        '[ConfirmDialog 디자인] tone=info 기본. AlertCircle 아이콘 + 제목 + 메시지 + [취소] / [확인] 버튼.',
        '[감지 못하는 변경] 일정 설정, 토글 변경, Override 추가 등은 hasChanges 에서 감지하지 않음 — 향후 개선 필요한 영역.',
      ],
      actions: [
        '[취소] 버튼 클릭 → handleCancel → hasChanges 판정 분기.',
        'ConfirmDialog [확인] → setConfirmDialog(null) + navigate("/") → 작성 내용 폐기, 퀴즈 목록 복귀.',
        'ConfirmDialog [취소] / 우상단 X → setConfirmDialog(null) → 모달 닫기, 작성 화면 유지.',
      ],
      validation: [
        'hasChanges 가 false 면 confirm 없이 즉시 이동 — UX 측면에서 적절.',
        '향후 개선: 일정/토글/Override 변경도 hasChanges 에 포함 검토.',
      ],
    },
    code: 'src/pages/QuizCreate.jsx:86, 101-111',
  },
  {
    id: 'M-01', title: '컴포넌트 ↔ 코드 매핑표', category: 'extra',
    spec: { kind: 'meta', description: '화면 요소별 React 컴포넌트와 코드 위치(파일:라인) 매핑.' },
    code: 'src/pages/QuizCreate.jsx 외',
  },
  {
    id: 'M-02', title: '작성 메모 및 오픈 이슈', category: 'extra',
    spec: { kind: 'meta', description: '범위 외 항목, 알려진 제약, 후속 논의 후보 정리.' },
    code: '—',
  },
]

const COLOR = {
  bg: { r: 1, g: 1, b: 1 },
  border: { r: 0.898, g: 0.910, b: 0.922 },
  borderLight: { r: 0.949, g: 0.957, b: 0.965 },
  placeholderBg: { r: 0.949, g: 0.957, b: 0.965 },
  placeholderFg: { r: 0.545, g: 0.583, b: 0.631 },
  primary: { r: 0.192, g: 0.510, b: 0.965 },
  accent: { r: 0.910, g: 0.953, b: 1.0 },
  foreground: { r: 0.098, g: 0.122, b: 0.157 },
  secondaryFg: { r: 0.306, g: 0.349, b: 0.408 },
  mutedFg: { r: 0.545, g: 0.583, b: 0.631 },
  rowAlt: { r: 0.976, g: 0.980, b: 0.984 },
  warningFg: { r: 0.729, g: 0.353, b: 0.067 },
  categoryBadge: {
    cover: { r: 0.553, g: 0.357, b: 0.910 },
    overview: { r: 0.110, g: 0.659, b: 0.490 },
    main: { r: 0.192, g: 0.510, b: 0.965 },
    extra: { r: 0.949, g: 0.502, b: 0.149 },
  },
}

const CATEGORY_LABEL = {
  cover: '표지',
  overview: '개요',
  main: '본문',
  extra: '부록',
}

const FONT_CANDIDATES = ['Pretendard', 'Inter', 'Noto Sans KR', 'Noto Sans', 'Roboto', 'Arial']
const STYLE_NEEDED = ['Bold', 'Medium', 'Regular']
let FONT_FAMILY = null
const LOADED_STYLES = new Set()
const STYLE_MAP = {}
let CURRENT_STEP = 'init'

async function pickFontFamily() {
  const available = await figma.listAvailableFontsAsync()
  for (const candidate of FONT_CANDIDATES) {
    const styles = available
      .filter(f => f.fontName.family === candidate)
      .map(f => f.fontName.style)
    const hasAll = STYLE_NEEDED.every(s => styles.indexOf(s) !== -1)
    if (hasAll) return candidate
  }
  for (const candidate of FONT_CANDIDATES) {
    const hasRegular = available.some(f => f.fontName.family === candidate && f.fontName.style === 'Regular')
    if (hasRegular) return candidate
  }
  return (available[0] && available[0].fontName.family) || 'Roboto'
}

async function loadAllFonts(family) {
  const available = await figma.listAvailableFontsAsync()
  const familyStyles = available
    .filter(f => f.fontName.family === family)
    .map(f => f.fontName.style)
  for (const style of STYLE_NEEDED) {
    const useStyle = familyStyles.indexOf(style) !== -1 ? style : 'Regular'
    await figma.loadFontAsync({ family, style: useStyle })
    LOADED_STYLES.add(useStyle)
    STYLE_MAP[style] = useStyle
  }
  STYLE_MAP['Regular'] = 'Regular'
}

function styleFor(weight) {
  if (!weight) return STYLE_MAP['Regular'] || 'Regular'
  return STYLE_MAP[weight] || STYLE_MAP['Regular'] || 'Regular'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function makeRect(name, w, h, color, opts) {
  opts = opts || {}
  const rect = figma.createRectangle()
  rect.name = name
  rect.resize(w, h)
  rect.fills = [{ type: 'SOLID', color }]
  if (opts.cornerRadius != null) rect.cornerRadius = opts.cornerRadius
  if (opts.stroke) {
    rect.strokes = [{ type: 'SOLID', color: opts.stroke }]
    rect.strokeWeight = opts.strokeWeight || 1
  }
  if (opts.dashPattern) rect.dashPattern = opts.dashPattern
  return rect
}

function makeText(content, fontSize, opts) {
  opts = opts || {}
  const t = figma.createText()
  t.fontName = { family: FONT_FAMILY, style: styleFor(opts.weight) }
  t.fontSize = fontSize
  t.characters = content || ' '
  if (opts.color) t.fills = [{ type: 'SOLID', color: opts.color }]
  if (opts.lineHeight) {
    t.lineHeight = { value: opts.lineHeight, unit: 'PERCENT' }
  }
  if (opts.width) {
    t.textAutoResize = 'HEIGHT'
    t.resize(opts.width, t.height)
  }
  if (opts.align) t.textAlignHorizontal = opts.align
  return t
}

// ────────────────────────────────────────────────────────────
// 우측 패널 - 기능 명세 (기획안 양식) 렌더링
// ────────────────────────────────────────────────────────────

function renderSpec(slide, spec) {
  if (!spec) return
  // meta 슬라이드는 단순 description 만
  if (spec.kind === 'meta') {
    const desc = makeText(spec.description || '', 18, {
      weight: 'Regular',
      color: COLOR.secondaryFg,
      width: SPEC_W,
      lineHeight: 160,
    })
    desc.x = SPEC_X
    desc.y = CONTENT_Y
    slide.appendChild(desc)
    return
  }

  let cy = CONTENT_Y

  // 1. 화면 설명
  cy = addSection(slide, '화면 설명', spec.description, cy, 'paragraph')

  // 2. 주요 기능
  if (spec.functions && spec.functions.length) {
    cy = addSection(slide, '주요 기능', spec.functions, cy, 'numbered')
  }

  // 3. 기본값 (S-02b, S-02c, S-02e 처럼 default 항목이 있는 경우)
  if (spec.defaultValues && spec.defaultValues.length) {
    cy = addSection(slide, '기본값', spec.defaultValues, cy, 'bullet')
  }

  // 4. 사용자 액션 / 분기
  if (spec.actions && spec.actions.length) {
    cy = addSection(slide, '사용자 액션', spec.actions, cy, 'bullet')
  }

  // 5. 검증 / 예외
  if (spec.validation && spec.validation.length) {
    cy = addSection(slide, '검증 / 예외 처리', spec.validation, cy, 'bullet', COLOR.warningFg)
  }

  // 6. 권한
  if (spec.permission) {
    cy = addSection(slide, '권한', spec.permission, cy, 'paragraph')
  }
}

function addSection(slide, headerText, body, startY, mode, accentColor) {
  // 섹션 헤더: 좌측 컬러바 + 텍스트
  const headerColor = accentColor || COLOR.primary
  const bar = makeRect('컬러바', 4, 18, headerColor, { cornerRadius: 2 })
  bar.x = SPEC_X
  bar.y = startY + 4
  slide.appendChild(bar)

  const header = makeText(headerText, 15, { weight: 'Bold', color: headerColor })
  header.x = SPEC_X + 12
  header.y = startY
  slide.appendChild(header)

  let cy = startY + 30

  if (mode === 'paragraph') {
    const t = makeText(String(body), 14, {
      weight: 'Regular',
      color: COLOR.secondaryFg,
      width: SPEC_W,
      lineHeight: 165,
    })
    t.x = SPEC_X
    t.y = cy
    slide.appendChild(t)
    cy += t.height + 14
  } else if (mode === 'numbered' || mode === 'bullet') {
    const items = body
    for (let i = 0; i < items.length; i++) {
      const prefix = mode === 'numbered' ? `${i + 1}. ` : '• '
      const itemText = prefix + items[i]
      const t = makeText(itemText, 14, {
        weight: 'Regular',
        color: COLOR.secondaryFg,
        width: SPEC_W,
        lineHeight: 160,
      })
      t.x = SPEC_X
      t.y = cy
      slide.appendChild(t)
      cy += t.height + 6
    }
    cy += 8
  }

  return cy + 6
}

// 헤더용 보조 (사용 안 함)
function noopRect() {}

// ────────────────────────────────────────────────────────────
// 텍스트 전용 슬라이드 본문 콘텐츠 (좌측 영역)
// ────────────────────────────────────────────────────────────

function renderCover(slide, x, y, w, h) {
  const lines = [
    { text: '퀴즈 생성 화면', size: 64, weight: 'Bold', color: COLOR.foreground, top: 80 },
    { text: '스토리보드', size: 64, weight: 'Bold', color: COLOR.foreground, top: 160 },
    { text: 'XN Quizzes 프로토타입 v(현재) 기준', size: 22, weight: 'Regular', color: COLOR.mutedFg, top: 270 },
    { text: '대상: 개발팀', size: 18, weight: 'Medium', color: COLOR.secondaryFg, top: 380 },
    { text: '작성자: 김민주', size: 18, weight: 'Regular', color: COLOR.secondaryFg, top: 410 },
    { text: '작성일: 2026-06-11', size: 18, weight: 'Regular', color: COLOR.secondaryFg, top: 440 },
    { text: '버전: v0.1 (초안)', size: 18, weight: 'Regular', color: COLOR.secondaryFg, top: 470 },
  ]
  lines.forEach(l => {
    const t = makeText(l.text, l.size, { weight: l.weight, color: l.color, width: w - 80, align: 'CENTER' })
    t.x = x + 40
    t.y = y + l.top
    slide.appendChild(t)
  })
}

function renderTOC(slide, x, y, w, h) {
  const rows = SLIDES.map((s, i) => [pad(i + 1), s.id, s.title, CATEGORY_LABEL[s.category]])
  renderTable(slide, x + 40, y + 30, w - 80, ['#', 'ID', '제목', '카테고리'], rows, [60, 100, 600, 100])
}

function renderUserFlow(slide, x, y, w, h) {
  const flow = [
    '[ 퀴즈 목록 ]',
    '       │  새 퀴즈 클릭',
    '       ▼',
    '[ /quiz/new ]',
    '       │',
    '       ▼',
    '┌────────────────┐    StepIndicator    ┌────────────────┐',
    '│  1) 시험 설정   │ ─────────────────▶ │  2) 문항 구성   │',
    '└────────────────┘                     └────────────────┘',
    '       │                                       │',
    '       │  취소 / 임시저장 / 저장하기            │',
    '       ▼                                       ▼',
    '┌─────────────┐  ┌─────────────┐  ┌──────────────────┐',
    '│ Confirm     │  │ AlertDialog │  │ 공개 검토 모달    │',
    '│ (변경 시)   │  │ "임시저장   │  │ "이대로 공개"     │',
    '│ → /         │  │  완료"      │  │ → status=open    │',
    '│             │  │ → 페이지     │  │ → / 복귀         │',
    '│             │  │   유지       │  │                  │',
    '└─────────────┘  └─────────────┘  └──────────────────┘',
  ].join('\n')
  const t = makeText(flow, 18, { weight: 'Medium', color: COLOR.foreground, width: w - 80, lineHeight: 160 })
  t.x = x + 40
  t.y = y + 30
  slide.appendChild(t)
}

function renderMapping(slide, x, y, w, h) {
  const rows = [
    ['페이지 컨테이너', 'QuizCreate', 'src/pages/QuizCreate.jsx:53'],
    ['스텝 인디케이터', 'StepIndicator', 'src/components/StepIndicator.jsx'],
    ['시험 설정 탭', 'InfoTab', 'src/pages/QuizCreate.jsx:265-556'],
    ['문항 구성 탭', 'QuestionsTab', 'src/pages/QuizCreate.jsx:558-653'],
    ['응시 보안 섹션', 'SecuritySection', 'src/components/quiz-form/SecuritySection.jsx'],
    ['추가 기간 설정', 'AssignmentOverrides', 'src/components/AssignmentOverrides.jsx'],
    ['대상 선택 모달', 'AssignTargetModal', 'src/components/AssignTargetModal.jsx'],
    ['문항 만들기 모달', 'AddQuestionModal', 'src/components/AddQuestionModal.jsx'],
    ['직접 선택 모달', 'QuestionBankModal', 'src/components/QuestionBankModal.jsx'],
    ['랜덤 출제 모달', 'RandomQuestionBankModal', 'src/components/RandomQuestionBankModal.jsx'],
    ['공개 검토 모달', 'PublishReviewModal', 'src/components/PublishReviewModal.jsx'],
    ['확인/알림', 'ConfirmDialog/AlertDialog', 'src/components/ConfirmDialog.jsx'],
    ['주차/차시', 'WeekSessionPicker', 'src/components/WeekSessionPicker.jsx'],
    ['일시 선택', 'DateTimePicker', 'src/components/DateTimePicker.jsx'],
    ['셀렉트', 'CustomSelect', 'src/components/CustomSelect.jsx'],
    ['공통 컴포넌트', 'Toggle/Field/Section', 'src/components/quiz-form/*'],
    ['데이터 저장', 'createQuiz/setQuizQuestions', 'src/lib/data/quizzes.js'],
    ['진행도 계산', 'getCompletedSteps', 'src/utils/quizFormSteps.js'],
    ['Override 검증', 'hasDuplicateStudent', 'src/utils/assignments.js'],
  ]
  renderTable(slide, x + 40, y + 30, w - 80, ['화면 요소', '컴포넌트', '파일 위치'], rows, [220, 280, 480])
}

function renderNotes(slide, x, y, w, h) {
  const sections = [
    { title: '작성 범위 외', items: [
      '반응형 모바일/태블릿 레이아웃',
      'AddQuestionModal 12개 유형별 폼 상세',
      'DateTimePicker / WeekSessionPicker / CustomSelect 내부 동작',
      '데이터 레이어 mock/api 분기 동작',
    ]},
    { title: '알려진 제약/메모', items: [
      'setQuizQuestions 는 전체 삭제 후 재생성 방식',
      'mock 모드는 localStorage(xnq_* 키) 영속화',
      '학생 역할의 /quiz/new 진입은 컴포넌트 내부 Navigate 로 차단',
    ]},
    { title: '후속 논의 후보', items: [
      '검증 실패 시 직렬 vs 일괄 표시 방식',
      '임시저장 후 페이지 유지 vs 목록 복귀',
      'AddQuestionModal 12개 유형 별도 스토리보드 작성 일정',
      'mock → api 전환 시 검증 규칙 백엔드 동기화 범위',
    ]},
  ]
  let cy = y + 30
  sections.forEach(sec => {
    const head = makeText(sec.title, 22, { weight: 'Bold', color: COLOR.foreground, width: w - 80 })
    head.x = x + 40
    head.y = cy
    slide.appendChild(head)
    cy += 36
    sec.items.forEach(item => {
      const t = makeText('• ' + item, 17, { weight: 'Regular', color: COLOR.secondaryFg, width: w - 100, lineHeight: 155 })
      t.x = x + 60
      t.y = cy
      slide.appendChild(t)
      cy += 28
    })
    cy += 16
  })
}

function renderValidationErrors(slide, x, y, w, h) {
  const rows = [
    ['1', '퀴즈 제목 필수', '퀴즈 제목을 입력해주세요'],
    ['2', '마감 > 시작', '마감 일시는 시작 일시 이후여야 합니다'],
    ['3', '이용 종료 ≥ 마감', '이용 종료 일시는 마감 일시 이후로 설정해야 합니다'],
    ['4', '지각 제출 ↔ 마감', '지각 제출 마감 일시는 마감 일시가 설정되어 있을 때만 사용 가능'],
    ['5', '시간 제한 입력', '제한 시간을 입력하거나 무제한으로 설정해주세요'],
    ['6', '자동 제출 ↔ 종료', '자동 제출 5분 유예 사용 시 이용 종료 일시 필수'],
    ['7', '문항 최소 1개', '최소 1개 이상의 문항을 추가해주세요'],
    ['8', '학생 중복 Override', '동일한 학생이 여러 추가 기간 설정에 포함되어 있습니다'],
  ]
  renderTable(slide, x + 40, y + 30, w - 80, ['#', '검증 규칙', '오류 메시지'], rows, [60, 280, 660])
  const hint = makeText('표시 방식: getValidationErrors() 가 배열을 반환하고, 첫 번째 오류만 AlertDialog 로 표시. 직렬 검증 방식.', 16, { weight: 'Medium', color: COLOR.mutedFg, width: w - 80, lineHeight: 150 })
  hint.x = x + 40
  hint.y = y + h - 90
  slide.appendChild(hint)
}

function renderTable(slide, x, y, totalW, headers, rows, colWidths) {
  const rowH = 38
  const headerH = 44
  const headerBg = makeRect('표헤더', totalW, headerH, COLOR.placeholderBg, { cornerRadius: 6 })
  headerBg.x = x
  headerBg.y = y
  slide.appendChild(headerBg)
  let cx = x + 12
  headers.forEach((h, i) => {
    const t = makeText(h, 14, { weight: 'Bold', color: COLOR.foreground, width: colWidths[i] - 16 })
    t.x = cx
    t.y = y + 13
    slide.appendChild(t)
    cx += colWidths[i]
  })
  rows.forEach((row, ri) => {
    const ry = y + headerH + ri * rowH
    if (ri % 2 === 1) {
      const rowBg = makeRect('행배경', totalW, rowH, COLOR.rowAlt)
      rowBg.x = x
      rowBg.y = ry
      slide.appendChild(rowBg)
    }
    let rx = x + 12
    row.forEach((cell, ci) => {
      const t = makeText(String(cell), 13, { weight: 'Regular', color: COLOR.secondaryFg, width: colWidths[ci] - 16 })
      t.x = rx
      t.y = ry + 11
      slide.appendChild(t)
      rx += colWidths[ci]
    })
  })
}

// ────────────────────────────────────────────────────────────
// 슬라이드 빌더
// ────────────────────────────────────────────────────────────

const TEXT_ONLY_RENDERERS = {
  'C-01': renderCover,
  'C-02': renderTOC,
  'C-03': renderUserFlow,
  'M-01': renderMapping,
  'M-02': renderNotes,
  'E-01': renderValidationErrors,
}

function buildSlide(meta, idx) {
  const slide = figma.createFrame()
  slide.name = `${pad(idx + 1)}. ${meta.id} ${meta.title}`
  slide.resize(SLIDE_W, SLIDE_H)
  slide.fills = [{ type: 'SOLID', color: COLOR.bg }]
  slide.cornerRadius = 12
  slide.strokes = [{ type: 'SOLID', color: COLOR.border }]
  slide.strokeWeight = 1

  // 번호 배지
  const numBg = makeRect('번호배경', 72, 36, COLOR.accent, { cornerRadius: 18 })
  numBg.x = PAD
  numBg.y = PAD
  slide.appendChild(numBg)
  const numTxt = makeText(`${pad(idx + 1)} / 22`, 16, { weight: 'Bold', color: COLOR.primary })
  numTxt.x = PAD + 14
  numTxt.y = PAD + 8
  slide.appendChild(numTxt)

  // 카테고리 배지
  const catColor = COLOR.categoryBadge[meta.category] || COLOR.primary
  const catBg = makeRect('카테고리배경', 70, 36, catColor, { cornerRadius: 18 })
  catBg.opacity = 0.12
  catBg.x = PAD + 80
  catBg.y = PAD
  slide.appendChild(catBg)
  const catTxt = makeText(CATEGORY_LABEL[meta.category] || '본문', 14, { weight: 'Medium', color: catColor })
  catTxt.x = PAD + 80 + 18
  catTxt.y = PAD + 9
  slide.appendChild(catTxt)

  // ID 배지
  const idTxt = makeText(meta.id, 18, { weight: 'Bold', color: COLOR.secondaryFg })
  idTxt.x = PAD + 166
  idTxt.y = PAD + 8
  slide.appendChild(idTxt)

  // 제목
  const titleTxt = makeText(meta.title, 36, { weight: 'Bold', color: COLOR.foreground })
  titleTxt.x = PAD
  titleTxt.y = PAD + 52
  slide.appendChild(titleTxt)

  // 좌측 본문 영역
  const isTextOnly = TEXT_ONLY_RENDERERS.hasOwnProperty(meta.id)

  if (isTextOnly) {
    // 텍스트 전용 슬라이드는 본문 영역 전체 사용
    const bg = makeRect('본문배경', CAPTURE_W, BODY_H, COLOR.bg, { cornerRadius: 8, stroke: COLOR.border, strokeWeight: 1 })
    bg.x = PAD
    bg.y = CONTENT_Y
    slide.appendChild(bg)
    TEXT_ONLY_RENDERERS[meta.id](slide, PAD, CONTENT_Y, CAPTURE_W, BODY_H)
  } else {
    // 일반 슬라이드: 캡쳐 placeholder (좌측 상단)
    const captureBox = makeRect('캡쳐자리', CAPTURE_W, CAPTURE_H, COLOR.placeholderBg, {
      cornerRadius: 8,
      stroke: COLOR.border,
      strokeWeight: 2,
      dashPattern: [8, 6],
    })
    captureBox.x = PAD
    captureBox.y = CONTENT_Y
    slide.appendChild(captureBox)

    const hintLines = [
      '[캡쳐 첨부 자리]',
      '',
      '플러그인 메뉴 "2. 캡쳐 이미지 일괄 배치"로',
      `${meta.id} 자동 매칭 배치`,
    ]
    const captureHint = makeText(hintLines.join('\n'), 20, {
      weight: 'Medium',
      color: COLOR.placeholderFg,
      width: CAPTURE_W - 80,
      lineHeight: 160,
      align: 'CENTER',
    })
    captureHint.name = '캡쳐안내'
    captureHint.x = PAD + 40
    captureHint.y = CONTENT_Y + Math.max(60, (CAPTURE_H - 160) / 2)
    slide.appendChild(captureHint)
  }

  // 우측 기능 명세
  renderSpec(slide, meta.spec)

  // 하단 footer (코드 위치)
  const footerY = SLIDE_H - PAD - 36
  const footerSep = makeRect('구분선', SLIDE_W - PAD * 2, 1, COLOR.border)
  footerSep.x = PAD
  footerSep.y = footerY - 12
  slide.appendChild(footerSep)
  const footerTxt = makeText(`코드 위치: ${meta.code}`, 13, { weight: 'Regular', color: COLOR.mutedFg })
  footerTxt.x = PAD
  footerTxt.y = footerY
  slide.appendChild(footerTxt)

  return slide
}

// ────────────────────────────────────────────────────────────
// 명령 1: 골격 생성
// ────────────────────────────────────────────────────────────

async function commandBuild() {
  CURRENT_STEP = 'pickFontFamily'
  FONT_FAMILY = await pickFontFamily()
  console.log('[XN Storyboard] picked font:', FONT_FAMILY)

  CURRENT_STEP = 'loadAllFonts'
  await loadAllFonts(FONT_FAMILY)
  console.log('[XN Storyboard] loaded styles:', Array.from(LOADED_STYLES), 'map:', STYLE_MAP)

  CURRENT_STEP = 'getCurrentPage'
  const targetPage = figma.currentPage

  CURRENT_STEP = 'buildSlides'
  const slides = []
  for (let i = 0; i < SLIDES.length; i++) {
    CURRENT_STEP = `buildSlide_${i + 1}_${SLIDES[i].id}`
    const slide = buildSlide(SLIDES[i], i)
    const col = i % COLS
    const row = Math.floor(i / COLS)
    slide.x = col * (SLIDE_W + COL_GAP)
    slide.y = row * (SLIDE_H + ROW_GAP)
    targetPage.appendChild(slide)
    slides.push(slide)
  }

  CURRENT_STEP = 'pageTitle'
  const pageTitle = figma.createText()
  pageTitle.fontName = { family: FONT_FAMILY, style: styleFor('Bold') }
  pageTitle.fontSize = 64
  pageTitle.characters = '퀴즈 생성 화면 스토리보드 - 22 슬라이드'
  pageTitle.fills = [{ type: 'SOLID', color: COLOR.foreground }]
  pageTitle.x = 0
  pageTitle.y = -140
  targetPage.appendChild(pageTitle)

  const pageSub = figma.createText()
  pageSub.fontName = { family: FONT_FAMILY, style: styleFor('Regular') }
  pageSub.fontSize = 24
  pageSub.characters = `폰트: ${FONT_FAMILY} | 다음 단계: 플러그인 메뉴 "2. 캡쳐 이미지 일괄 배치" 실행하여 18장 자동 첨부`
  pageSub.fills = [{ type: 'SOLID', color: COLOR.secondaryFg }]
  pageSub.x = 0
  pageSub.y = -60
  pageSub.textAutoResize = 'HEIGHT'
  pageSub.resize(SLIDE_W * 2, pageSub.height)
  targetPage.appendChild(pageSub)

  figma.viewport.scrollAndZoomIntoView([slides[0]])
  figma.notify(`스토리보드 22장 생성 완료 (폰트: ${FONT_FAMILY})`)
  figma.closePlugin()
}

// ────────────────────────────────────────────────────────────
// 명령 2: 캡쳐 이미지 일괄 배치
// ────────────────────────────────────────────────────────────

function commandImport() {
  figma.showUI(__html__, { width: 480, height: 520, title: 'XN Storyboard 캡쳐 일괄 배치' })

  figma.ui.onmessage = async (msg) => {
    if (msg.type === 'cancel') {
      figma.closePlugin()
      return
    }
    if (msg.type === 'apply') {
      try {
        const result = await applyImages(msg.files)
        const summary = `완료: ${result.applied}장 배치, ${result.skipped.length}장 스킵, ${result.notFound.length}장 실패`
        figma.ui.postMessage({ type: 'done', text: summary })
        figma.notify(`캡쳐 ${result.applied}장 배치 완료`)
        if (result.skipped.length) console.log('[XN Storyboard] 스킵:', result.skipped)
        if (result.notFound.length) console.warn('[XN Storyboard] 실패:', result.notFound)
        setTimeout(() => figma.closePlugin(), 2500)
      } catch (err) {
        const m = (err && err.message) ? err.message : String(err)
        figma.ui.postMessage({ type: 'error', text: `실패: ${m}` })
        console.error('[XN Storyboard] import error:', err)
      }
    }
  }
}

function extractIdFromFilename(name) {
  const m = name.match(/^\d+_([A-Z]-\d+[a-z0-9]*)_/)
  return m ? m[1] : null
}

async function applyImages(files) {
  const slides = figma.currentPage.children.filter(n => n.type === 'FRAME')
  let applied = 0
  const notFound = []
  const skipped = []

  for (const file of files) {
    const id = extractIdFromFilename(file.name)
    if (!id) {
      notFound.push(`${file.name} (ID 추출 실패)`)
      continue
    }
    const slide = slides.find(s => {
      const parts = s.name.split(' ')
      return parts.length >= 2 && parts[1] === id
    })
    if (!slide) {
      const fallbackId = id.replace(/[a-z0-9]+$/, '')
      const fallback = slides.find(s => {
        const parts = s.name.split(' ')
        return parts.length >= 2 && parts[1].indexOf(fallbackId) === 0
      })
      if (!fallback) {
        notFound.push(`${file.name} (슬라이드 ${id} 없음)`)
        continue
      }
      const fbPlaceholder = fallback.children.find(c => c.name === '캡쳐자리')
      if (!fbPlaceholder || isImageFill(fbPlaceholder)) {
        skipped.push(`${file.name} → ${id} 슬라이드 없음, ${fallbackId} 도 이미 채워짐`)
        continue
      }
      applyToPlaceholder(fallback, file)
      applied++
      continue
    }
    const placeholder = slide.children.find(c => c.name === '캡쳐자리')
    if (!placeholder) {
      skipped.push(`${file.name} → ${id} 은 텍스트 전용 슬라이드 (자동 본문 채워짐)`)
      continue
    }
    if (isImageFill(placeholder)) {
      skipped.push(`${file.name} → ${id} 이미 이미지 있음`)
      continue
    }
    applyToPlaceholder(slide, file)
    applied++
  }

  return { applied, notFound, skipped }
}

function isImageFill(node) {
  const fills = node.fills
  if (!Array.isArray(fills)) return false
  return fills.some(f => f.type === 'IMAGE')
}

function applyToPlaceholder(slide, file) {
  const placeholder = slide.children.find(c => c.name === '캡쳐자리')
  const hint = slide.children.find(c => c.name === '캡쳐안내')
  const image = figma.createImage(file.bytes)
  placeholder.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FIT' }]
  placeholder.strokes = []
  placeholder.dashPattern = []
  if (hint) hint.remove()
}

// ────────────────────────────────────────────────────────────
// Dispatch
// ────────────────────────────────────────────────────────────

async function dispatch() {
  if (figma.command === 'import') {
    commandImport()
    return
  }
  await commandBuild()
}

dispatch().catch(err => {
  const msg = (err && err.message) ? err.message : String(err)
  console.error('[XN Storyboard] FAILED at step:', CURRENT_STEP)
  console.error('[XN Storyboard] Error:', err)
  if (err && err.stack) console.error('[XN Storyboard] Stack:', err.stack)
  try {
    figma.showUI(`<!DOCTYPE html><html><head><style>
      body { font-family: -apple-system, system-ui, sans-serif; padding: 16px; margin: 0; background: #fff; color: #191F28; font-size: 13px; line-height: 1.55; }
      h1 { font-size: 14px; color: #F04452; margin: 0 0 12px 0; }
      .step { font-weight: 600; margin-bottom: 8px; color: #4E5968; }
      .msg { background: #FFF5F5; border: 1px solid #FECDD3; padding: 10px; border-radius: 6px; color: #B91C1C; word-break: break-all; white-space: pre-wrap; }
      .hint { margin-top: 12px; font-size: 12px; color: #8B95A1; }
    </style></head><body>
      <h1>플러그인 실행 실패</h1>
      <div class="step">실패 지점: ${escapeHtml(CURRENT_STEP)}</div>
      <div class="msg">${escapeHtml(msg)}</div>
      <div class="hint">Plugins → Development → Open Console 에서 상세 스택을 확인할 수 있습니다.</div>
    </body></html>`, { width: 480, height: 240, title: 'XN Storyboard 오류' })
  } catch (uiErr) {
    figma.notify(`오류 (${CURRENT_STEP}): ${msg}`, { error: true, timeout: 20000 })
  }
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
