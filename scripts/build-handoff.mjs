// XQ Screen Spec 핸드오프 패키지 생성기
// 사용: node scripts/build-handoff.mjs [출력디렉터리] [--screens=01,06]
//   - 선행: dist-singlefile/index.html (vite build --config vite.config.singlefile.js)
//   - 구조:
//     · scr-01 = 앱 패키지: standalone xnquiz.html + 전체 src/ + design-system/ (전체 화면 실행/코드). 코드가 바뀌면 항상 갱신
//     · scr-02~09 = 경량 패키지: 해당 화면 소스 + README + 진입 안내(screen-preview). 그 화면을 건드릴 때만 갱신
//   - --screens=01,06 처럼 일부만 (재)생성 가능 (코드 변경 시 앱 01 + 바뀐 화면만 다시 빌드)
import { copyFileSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import JSZip from 'jszip'

// cpSync 재귀가 Windows(OneDrive/락)에서 EIO 를 내므로 파일 단위 수동 복사 사용
function copyTree(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true })
  for (const name of readdirSync(srcDir)) {
    const s = path.join(srcDir, name)
    const d = path.join(destDir, name)
    if (statSync(s).isDirectory()) copyTree(s, d)
    else copyFileSync(s, d)
  }
}

// 프로젝트 루트 기준 상대경로(파일/디렉터리)를 패키지 폴더 안에 동일 경로로 복사
function copyRel(rel, destDir) {
  const abs = path.join(ROOT, rel)
  const dest = path.join(destDir, rel)
  if (statSync(abs).isDirectory()) copyTree(abs, dest)
  else { mkdirSync(path.dirname(dest), { recursive: true }); copyFileSync(abs, dest) }
}

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const STANDALONE = path.join(ROOT, 'dist-singlefile', 'index.html')
const ASSETS = path.join(ROOT, 'scripts', 'handoff-assets')
const rawArgs = process.argv.slice(2)
const outArg = rawArgs.find(a => !a.startsWith('--'))
const screensArg = rawArgs.find(a => a.startsWith('--screens='))
const onlyScreens = screensArg ? screensArg.split('=')[1].split(',').map(x => x.trim()).filter(Boolean) : null
const OUT = outArg ? path.resolve(outArg) : path.join(ROOT, 'dist-handoff')
const stamp = new Date().toISOString().slice(0, 10)

if (!existsSync(STANDALONE)) {
  console.error('[handoff] dist-singlefile/index.html 없음. 먼저: vite build --config vite.config.singlefile.js')
  process.exit(1)
}

// 앱 패키지(실행/전체 코드 담당) 번호와 추출 시 폴더명
const APP_NUM = '01'
const APP_FOLDER = `xq-scr-${APP_NUM}-handoff_${stamp}/scr-01-quiz-list-detail`

const SCREENS = [
  { num: '01', slug: 'quiz-list-detail', title: '퀴즈 목록·상세', route: '#/', routeDisplay: '/ , /quiz/:id', spec: '5146181672', ver: 'v1.2',
    main: 'src/pages/QuizList.jsx · src/pages/QuizDetail.jsx',
    files: ['src/pages/QuizList.jsx', 'src/pages/QuizDetail.jsx'],
    purpose: '코스 내 퀴즈 목록 조회·탐색(평가용/연습용 그룹, 상태 필터, 검색/정렬)과 퀴즈 상세 진입. 작성·편집은 SCR-02, 채점/통계/모니터는 SCR-06/07/08 위임.' },
  { num: '02', slug: 'quiz-edit', title: '시험 작성·편집', route: '#/quiz/new', routeDisplay: '/quiz/new , /quiz/:id/edit', spec: '5146378267', ver: 'v1.1',
    main: 'src/pages/QuizCreate.jsx · src/pages/QuizEdit.jsx',
    files: ['src/pages/QuizCreate.jsx', 'src/pages/QuizEdit.jsx'],
    purpose: '퀴즈 생성/편집 2탭 흐름(시험 설정 / 문항 추가) + 게시 확인 모달 + 응시 보안 섹션. 문항 작성·편집기는 SCR-03, 학생 PreflightGate는 SCR-09 위임.' },
  { num: '03', slug: 'question-form', title: '문항 작성·편집 (인라인 편집기)', route: '#/quiz/1/edit', routeDisplay: '/quiz/:id/edit (문항 인라인 편집기)', spec: '5146968124', ver: 'v1.1',
    main: 'src/components/InlineQuestionEditor.jsx',
    files: ['src/components/InlineQuestionEditor.jsx', 'src/components/AddQuestionModal.jsx'],
    purpose: '문항 1건 작성·편집 인라인 편집기(12개 유형별 입력, 공통 필드=제목/배점/난이도/정답 판정/부분 점수/피드백). 모달이 아니라 시험 편집(SCR-02) 문항 목록 안에 카드형으로 펼쳐지며 유형 선택은 인라인 드롭다운. 문제은행 직접 선택/랜덤 출제 진입은 SCR-04 위임. (AddQuestionModal.jsx 는 입력 폼·헬퍼 모듈로만 사용, 모달 자체는 미사용)' },
  { num: '04', slug: 'question-bank', title: '문제은행', route: '#/question-banks', routeDisplay: '/question-banks , /question-banks/:bankId', spec: '5147590709', ver: 'v1.1',
    main: 'src/pages/QuestionBankList.jsx · src/pages/QuestionBank.jsx',
    files: ['src/pages/QuestionBankList.jsx', 'src/pages/QuestionBank.jsx'],
    purpose: '문제은행 목록 + 문제모음 상세 + 일괄 업로드/이동·복사 모달. 문항 작성 본체는 SCR-03 위임.' },
  { num: '05', slug: 'quiz-settings', title: '퀴즈 기본값 설정', route: '#/?modal=global-settings', routeDisplay: '/ (퀴즈 기본 설정 다이얼로그)', spec: '5147000912', ver: 'v1.0',
    main: 'src/components/QuizSettingsDialog.jsx',
    files: ['src/components/QuizSettingsDialog.jsx'],
    purpose: '퀴즈 목록 톱니에서 진입하는 코스 단위 퀴즈 기본값 설정(복수선택 채점 / 정답 판정 / 신규 퀴즈 기본값 / 응시 편의 지원). 문항 단위 오버라이드는 SCR-03 위임.' },
  { num: '06', slug: 'grading-dashboard', title: '채점 대시보드', route: '#/quiz/1/grade', routeDisplay: '/quiz/:id/grade', spec: '5146443856', ver: 'v1.2',
    main: 'src/pages/GradingDashboard/',
    files: ['src/pages/GradingDashboard'],
    purpose: '채점 대시보드(응답별/학생별 탭, 수동 채점, 재채점 옵션, 조건부 재응시, 점수 집계, 답안지 PDF, 활동 로그). 통계는 SCR-07, 문제지 PDF는 SCR-02 위임.' },
  { num: '07', slug: 'quiz-stats', title: '통계·분석', route: '#/quiz/1/stats', routeDisplay: '/quiz/:id/stats', spec: '5146705955', ver: 'v1.0',
    main: 'src/pages/QuizStats.jsx',
    files: ['src/pages/QuizStats.jsx'],
    purpose: '통계 페이지(요약 지표 / 점수 분포 / 문항별 득점률 / 측정학 지표 / 선택지 응답 패턴 / Excel 출력). 랜덤 출제 풀 평면화 + 모집단 필터링. 채점 이동은 SCR-06 위임.' },
  { num: '08', slug: 'quiz-monitor', title: '진행 중 응시 모니터링', route: '#/quiz/1/moderate', routeDisplay: '/quiz/:id/moderate', spec: '5146476604', ver: 'v1.1',
    main: 'src/pages/QuizMonitor.jsx',
    files: ['src/pages/QuizMonitor.jsx'],
    purpose: '진행 중 응시 모니터링(응시자 현황, 이상 후보 판정, 수동 새로고침, 개별 응시 기회 부여). 자동 폴링 없음. 학생 수집 고지는 SCR-09 위임.' },
  { num: '09', slug: 'quiz-attempt', title: '학생 응시·동의', route: '#/quiz/1/attempt', routeDisplay: '/quiz/:id/attempt', spec: '5147656220', ver: 'v1.0',
    main: 'src/pages/QuizAttempt.jsx',
    files: ['src/pages/QuizAttempt.jsx'],
    purpose: '학생 응시 흐름(진입 가드 / 액세스 코드 / PreflightGate 동의·보안 안내 + 답안 입력/자동저장/제출 + 결과 모달). 조건부 재응시 진입점은 SCR-06 위임.' },
]

const PERMISSION_GUIDE = 'https://xinics.atlassian.net/wiki/spaces/XP2/pages/5097160727'
const roleCell = (s) => `교수자 / 운영자${s.num === '09' ? ' / 학생' : ''}`

// 앱 패키지(scr-01) 진입 셔틀: standalone 으로 자동 이동
function appPreviewHtml(s) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>SCR-${s.num} ${s.title} 미리보기 - XN Quizzes</title>
<meta http-equiv="refresh" content="0; url=./xnquiz.html${s.route}">
<style>
  body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 48px; text-align: center; color: #4E5968; background: #F9FAFB; }
  a { color: #3182F6; }
</style>
</head>
<body>
<h2 style="color:#191F28;font-weight:600;margin-bottom:8px;">SCR-${s.num} ${s.title} 화면 로딩중</h2>
<p>잠시 후 자동으로 이동합니다. 이동되지 않으면 <a href="./xnquiz.html${s.route}">여기를 클릭</a>하세요.</p>
</body>
</html>
`
}

// 경량 패키지 진입 안내: 실행 파일이 없으므로 앱 패키지로 안내 (자동 이동 없음)
function thinPreviewHtml(s) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>SCR-${s.num} ${s.title} 진입 안내 - XN Quizzes</title>
<style>
  body { font-family: 'Pretendard', -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 48px 24px; color: #4E5968; background: #F9FAFB; line-height: 1.7; }
  h2 { color: #191F28; font-weight: 600; margin-bottom: 16px; }
  code { background: #F2F4F6; border-radius: 4px; padding: 2px 6px; font-size: 0.92em; color: #191F28; }
  a { color: #3182F6; }
  .route { display: inline-block; margin: 4px 0; }
</style>
</head>
<body>
<h2>SCR-${s.num} ${s.title}</h2>
<p>이 패키지에는 실행 파일이 없습니다. 실행은 <strong>앱 패키지</strong> <code>xq-scr-${APP_NUM}-handoff_${stamp}</code> 의 <code>xnquiz.html</code> 을 사용하세요.</p>
<p>앱을 연 뒤 주소창의 해시 경로를 <code class="route">${s.route}</code> 로 이동하면 본 화면이 열립니다 (HashRouter, 서버 불필요).</p>
<p>앱 패키지를 이 패키지와 같은 위치에 나란히 풀었다면 <a href="../../${APP_FOLDER}/xnquiz.html${s.route}">여기를 눌러 바로 이동</a>할 수 있습니다.</p>
</body>
</html>
`
}

// 앱 패키지(scr-01) README: 전체 화면 실행 + 전체 코드
function appReadme(s) {
  const specUrl = `https://xinics.atlassian.net/wiki/spaces/XP2/pages/${s.spec}`
  return `# XQ-SCR-${s.num} ${s.title} 핸드오프 패키지 (App + Code)

| 항목 | 내용 |
| --- | --- |
| 프로젝트 ID | XQ-202606_01 |
| Screen Spec | XQ-202606_01-ScreenSpec-SCR${s.num}-${s.ver} ([Confluence ${s.spec}](${specUrl})) |
| 패키지 버전 | ${stamp} (현재 프로토타입 기준, R-001 양식 Screen Spec 동반) |
| 패키지 유형 | App + Code (standalone 실행 + 전체 코드) |
| 빌드 환경 | React 19 + Vite 8 + Tailwind CSS v4 |

> 본 패키지는 SCR-01 화면 핸드오프이자, **모든 화면(SCR-01~09)의 실행/전체 코드 패키지**를 겸합니다. 다른 화면(SCR-02~09) 경량 패키지의 \`screen-preview.html\` 은 이 패키지의 \`xnquiz.html\` 로 연결됩니다.

## 화면 목적

${s.purpose}

## 진입 라우트

| 라우트 | 화면 | 역할 |
| --- | --- | --- |
| \`${s.routeDisplay}\` | ${s.title} | ${roleCell(s)} |

## 사용 방법

**미리보기 (가장 빠른 진입)**: \`screen-preview.html\` 더블클릭 → 본 SCR 화면으로 자동 이동.

**미리보기 (전체 라우트 진입)**: \`xnquiz.html\` 더블클릭 → 브라우저에서 즉시 실행 (서버 불필요, HashRouter 기반, 모든 SCR 라우트 진입 가능). 다른 화면은 주소창 해시를 해당 라우트(예: 채점 \`#/quiz/1/grade\`)로 바꾸면 됩니다.

**개발자 통합**: xnquiz 프로토타입 저장소에 통합하여 빌드.

\`\`\`
git clone <xnquiz repo>
cd xnquiz && npm install && npm run dev
\`\`\`

**경로 매핑**: \`src/\` 폴더는 xnquiz 프로토타입의 \`src/\` 와 1:1 동일 구조입니다. 페이지의 \`@/components/ui/...\`, \`@/lib/data\`, \`@/utils/...\` 등의 alias 는 \`jsconfig.json\` 의 \`"@/*": ["./src/*"]\` 매핑으로 본 패키지의 \`src/\` 폴더에서 그대로 해석됩니다.

## 파일 구성

| 경로 | 설명 |
| --- | --- |
| \`xnquiz.html\` | 단일 standalone 빌드 (Vite production + HashRouter). 더블클릭으로 즉시 실행, 모든 SCR 화면 라우트 진입 가능 (단일 파일, 약 4.7MB) |
| \`screen-preview.html\` | 본 화면(\`${s.route.replace('#', '')}\`) 으로 자동 이동하는 진입 셔틀 |
| \`${s.main}\` | 본 화면 본체 |
| \`src/pages/*\` | 다른 SCR 화면 (참고용) |
| \`src/components/Layout.jsx\`, \`PageHeader.jsx\` | 공통 레이아웃 |
| \`src/components/ui/*.jsx\` | shadcn 기반 공통 UI (\`@/components/ui/...\`) |
| \`src/lib/data/*.js\` | 데이터 레이어 (mock/api 자동 분기) |
| \`src/context/*\` | 역할·문제은행 컨텍스트 |
| \`src/data/mockData.js\` | mock 모드 시드 데이터 |
| \`src/index.css\` | Tailwind v4 진입 CSS (디자인 토큰 + 전역 스타일 + 커스텀 유틸리티) |
| \`design-system/tokens.css\`, \`global.css\` | Xinics Design System 원본 (참고용) |

## CSS 정책

본 패키지는 Xinics Design System 의 색상/타이포 토큰을 기반으로 합니다. \`design-system/tokens.css\` 가 단독 출처(레퍼런스)이며, 실제 런타임 스타일은 \`src/index.css\` (Tailwind v4 + 디자인 토큰 매핑 + 커스텀 유틸리티) 에서 빌드됩니다. \`xnquiz.html\` 은 이 둘을 합쳐 생성된 1차 결과물(단일 HTML, 스타일 인라인 포함) 입니다. 별도 신규 CSS 는 작성되지 않았습니다.

## 참고

- [Screen Spec 본문](${specUrl}) — 화면 구성·인터랙션·데이터 모델·정책 규칙
- [공통 권한 모델 가이드](${PERMISSION_GUIDE})
`
}

// 경량 패키지(scr-02~09) README: 해당 화면 소스 + Spec (실행은 앱 패키지)
function thinReadme(s) {
  const specUrl = `https://xinics.atlassian.net/wiki/spaces/XP2/pages/${s.spec}`
  return `# XQ-SCR-${s.num} ${s.title} 핸드오프 패키지 (Code + Spec)

| 항목 | 내용 |
| --- | --- |
| 프로젝트 ID | XQ-202606_01 |
| Screen Spec | XQ-202606_01-ScreenSpec-SCR${s.num}-${s.ver} ([Confluence ${s.spec}](${specUrl})) |
| 패키지 버전 | ${stamp} (현재 프로토타입 기준, R-001 양식 Screen Spec 동반) |
| 패키지 유형 | Code (화면 소스) + Screen Spec |
| 빌드 환경 | React 19 + Vite 8 + Tailwind CSS v4 |
| 실행 패키지 | \`xq-scr-${APP_NUM}-handoff_${stamp}\` (standalone \`xnquiz.html\` 포함, 전체 화면 실행) |

> 본 패키지는 **해당 화면의 소스와 Screen Spec 검토용**입니다. 실행 파일(\`xnquiz.html\`)과 전체 코드는 앱 패키지 \`xq-scr-${APP_NUM}-handoff_${stamp}\` 에 있습니다. 화면 동작이 바뀔 때 앱 패키지와 본 패키지만 갱신하면 됩니다.

## 화면 목적

${s.purpose}

## 진입 라우트

| 라우트 | 화면 | 역할 |
| --- | --- | --- |
| \`${s.routeDisplay}\` | ${s.title} | ${roleCell(s)} |

## 사용 방법

**실행 미리보기**: 앱 패키지 \`xq-scr-${APP_NUM}-handoff_${stamp}\` 를 풀어 그 안의 \`xnquiz.html\` 을 더블클릭한 뒤, 주소창 해시를 \`${s.route}\` 로 이동하면 본 화면이 열립니다 (HashRouter, 서버 불필요). 앱 패키지와 본 패키지를 같은 위치에 나란히 풀면 \`screen-preview.html\` 의 바로가기로도 진입할 수 있습니다.

**코드 검토**: \`src/\` 에는 **본 화면 소스만** 담겨 있습니다. 공통 UI(\`@/components/ui\`), 데이터 레이어(\`@/lib/data\`), 유틸 등 전체 의존성과 실행 코드는 앱 패키지(\`xq-scr-${APP_NUM}-handoff\`)의 \`src/\` 를 참조하세요. 경로 alias(\`@/*\`)는 앱 패키지의 \`jsconfig.json\` 매핑을 따릅니다.

## 파일 구성

| 경로 | 설명 |
| --- | --- |
| \`screen-preview.html\` | 본 화면 진입 안내 (앱 패키지의 \`xnquiz.html\` 로 연결) |
| \`${s.main}\` | 본 화면 본체 (이 패키지에 포함된 유일한 소스) |
| \`README.md\` | 본 문서 |

## 참고

- [Screen Spec 본문](${specUrl}) — 화면 구성·인터랙션·데이터 모델·정책 규칙
- [공통 권한 모델 가이드](${PERMISSION_GUIDE})
- 전체 실행/코드: 앱 패키지 \`xq-scr-${APP_NUM}-handoff_${stamp}\`
`
}

function addDir(zip, absDir, base) {
  for (const name of readdirSync(absDir)) {
    const abs = path.join(absDir, name)
    const rel = base ? `${base}/${name}` : name
    if (statSync(abs).isDirectory()) addDir(zip, abs, rel)
    else zip.file(rel, readFileSync(abs))
  }
}

mkdirSync(OUT, { recursive: true })
const targets = onlyScreens ? SCREENS.filter(s => onlyScreens.includes(s.num)) : SCREENS
if (onlyScreens) {
  console.log(`[handoff] 선택 생성: ${targets.map(s => s.num).join(', ') || '(없음)'}`)
  if (!onlyScreens.includes(APP_NUM)) {
    console.log(`[handoff] 주의: 앱 패키지(${APP_NUM})를 제외했습니다. 코드가 바뀌었다면 --screens 에 ${APP_NUM} 을 포함해 함께 갱신하세요.`)
  }
}

for (const s of targets) {
  const folderName = `scr-${s.num}-${s.slug}`
  const dir = path.join(OUT, folderName)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  if (s.num === APP_NUM) {
    // 앱 패키지: standalone + 전체 src + design-system + jsconfig
    copyFileSync(STANDALONE, path.join(dir, 'xnquiz.html'))
    copyTree(SRC, path.join(dir, 'src'))
    copyTree(path.join(ASSETS, 'design-system'), path.join(dir, 'design-system'))
    copyFileSync(path.join(ASSETS, 'jsconfig.json'), path.join(dir, 'jsconfig.json'))
    writeFileSync(path.join(dir, 'screen-preview.html'), appPreviewHtml(s))
    writeFileSync(path.join(dir, 'README.md'), appReadme(s))
  } else {
    // 경량 패키지: 해당 화면 소스만 + 진입 안내 + README
    for (const rel of s.files) copyRel(rel, dir)
    writeFileSync(path.join(dir, 'screen-preview.html'), thinPreviewHtml(s))
    writeFileSync(path.join(dir, 'README.md'), thinReadme(s))
  }

  const zip = new JSZip()
  addDir(zip, dir, folderName)
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  writeFileSync(path.join(OUT, `xq-scr-${s.num}-handoff_${stamp}.zip`), buf)
  const kind = s.num === APP_NUM ? '앱' : '경량'
  console.log(`[handoff] ${folderName} (${kind}) → xq-scr-${s.num}-handoff_${stamp}.zip`)
}
console.log(`[handoff] 완료: ${OUT}`)
