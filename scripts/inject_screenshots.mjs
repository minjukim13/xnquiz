import { readFileSync, writeFileSync } from 'fs'

let html = readFileSync('XNQuizzes_구현현황_보고.html', 'utf-8')

const replacements = [
  { route: '/quiz</div>', file: 'feature01_quiz_list' },
  { route: '/question-bank/:id</div>', file: 'feature02_question_bank' },
  { route: '/question-bank/:id → 업로드</div>', file: 'feature03_upload_modal' },
  { route: '/question-bank/:id → 가져오기</div>', file: 'feature04_import_modal' },
  { route: '/grading/:id → 엑셀 채점</div>', file: 'feature06_excel_grading_modal' },
]

for (const r of replacements) {
  const b64 = readFileSync('screenshots/' + r.file + '.b64', 'utf-8')

  // Find the screenshot-box containing this route text
  const idx = html.indexOf(r.route)
  if (idx === -1) {
    console.log('NOT FOUND:', r.route)
    continue
  }

  // Find the enclosing screenshot-box div
  // Search backwards for <div class="screenshot-box">
  const boxStart = html.lastIndexOf('<div class="screenshot-box">', idx)
  if (boxStart === -1) {
    console.log('BOX NOT FOUND for:', r.route)
    continue
  }

  // Find the closing tags - we need the content between screenshot-box open and its close
  // The inner content is: <div class="screenshot-placeholder">...</div></div>
  // We need to find the screenshot-placeholder div and replace it with img
  const placeholderStart = html.indexOf('<div class="screenshot-placeholder">', boxStart)
  if (placeholderStart === -1 || placeholderStart > idx + 200) {
    console.log('PLACEHOLDER NOT FOUND for:', r.route)
    continue
  }

  // Find end: after the route div closes, there's </div> for placeholder
  const routeEnd = html.indexOf('</div>', idx)
  // Then </div> for screenshot-placeholder
  const placeholderEnd = html.indexOf('</div>', routeEnd + 6) + 6

  const oldContent = html.substring(placeholderStart, placeholderEnd)
  const imgTag = `<img src="data:image/png;base64,${b64}" alt="${r.file}" />`

  html = html.substring(0, placeholderStart) + imgTag + html.substring(placeholderEnd)
  console.log('Replaced:', r.file)
}

writeFileSync('XNQuizzes_구현현황_보고.html', html, 'utf-8')
console.log('Done - all screenshots injected')
