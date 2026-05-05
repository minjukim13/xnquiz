// 발표대본.md → PDF 친화 HTML 래퍼 생성
// Pretendard, 격자 없는 클린 스타일, A4 portrait 인쇄용
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const mdPath = resolve(root, '발표대본.md')
const outHtml = resolve(root, '발표대본_print.html')

const md = readFileSync(mdPath, 'utf8')

// ── 미니 마크다운 파서 (필요한 문법만 처리) ──
function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s) {
  // **bold** 처리 (escape 후 별도 토큰화)
  let r = escape(s)
  r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return r
}

const lines = md.split(/\r?\n/)
let html = ''
let inList = false
let inBlockquote = false

function closeList() { if (inList) { html += '</ul>\n'; inList = false } }
function closeBq() { if (inBlockquote) { html += '</blockquote>\n'; inBlockquote = false } }

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // 빈 줄
  if (/^\s*$/.test(line)) {
    closeList(); closeBq()
    continue
  }

  // 수평선 ---
  if (/^---\s*$/.test(line)) {
    closeList(); closeBq()
    html += '<hr/>\n'
    continue
  }

  // 헤딩
  const h = line.match(/^(#{1,4})\s+(.*)$/)
  if (h) {
    closeList(); closeBq()
    const lvl = h[1].length
    html += `<h${lvl}>${inline(h[2])}</h${lvl}>\n`
    continue
  }

  // 블록 인용
  if (/^>\s?/.test(line)) {
    closeList()
    if (!inBlockquote) { html += '<blockquote>'; inBlockquote = true }
    html += inline(line.replace(/^>\s?/, '')) + '<br/>'
    continue
  } else {
    closeBq()
  }

  // 리스트 (- )
  if (/^- /.test(line)) {
    if (!inList) { html += '<ul>'; inList = true }
    html += `<li>${inline(line.replace(/^- /, ''))}</li>`
    continue
  } else {
    closeList()
  }

  // 일반 문단
  html += `<p>${inline(line)}</p>\n`
}
closeList(); closeBq()

const wrapped = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>XN Quiz 발표 대본</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page { size: A4; margin: 22mm 18mm; }

  html, body {
    font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
    color: #0f172a;
    background: #ffffff;
    font-size: 11.5pt;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  main { max-width: 720px; margin: 0 auto; padding: 0; }

  h1 {
    font-size: 22pt;
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: -0.01em;
    margin: 0 0 14pt;
    padding-bottom: 10pt;
    border-bottom: 2px solid #0f172a;
  }
  h2 {
    font-size: 14pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.35;
    margin: 22pt 0 8pt;
    padding-top: 8pt;
    border-top: 1px solid #e2e8f0;
    page-break-after: avoid;
  }
  h2:first-of-type { border-top: none; padding-top: 0; }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    color: #1e293b;
    margin: 14pt 0 6pt;
    page-break-after: avoid;
  }

  p { margin: 6pt 0; color: #1e293b; }

  blockquote {
    background: #f8fafc;
    border-left: 3px solid #0f172a;
    padding: 8pt 12pt;
    margin: 8pt 0 12pt;
    font-size: 11pt;
    color: #334155;
    page-break-inside: avoid;
  }
  blockquote strong { color: #0f172a; }

  ul { margin: 6pt 0 6pt 18pt; }
  li { margin: 3pt 0; color: #334155; }
  li strong { color: #0f172a; }

  strong { font-weight: 700; color: #0f172a; }

  hr {
    border: 0;
    border-top: 1px dashed #cbd5e1;
    margin: 16pt 0;
  }

  /* 첫 번째 hr (제목 직후 안내문 다음) 은 숨김 처리 */
  h1 + blockquote + hr { display: none; }
  h1 + blockquote { border-left-color: #64748b; background: #f1f5f9; }

  /* 슬라이드 단위 단락 보호 */
  h2 + blockquote + p,
  h2 + blockquote { page-break-inside: avoid; }
</style>
</head>
<body>
<main>
${html}
</main>
</body>
</html>
`

writeFileSync(outHtml, wrapped, 'utf8')
console.log('생성 완료:', outHtml)
