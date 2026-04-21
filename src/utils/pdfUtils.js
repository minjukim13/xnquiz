import { QUIZ_TYPES } from '../data/mockData'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }

// A4 at 96 DPI: 794 x 1123 px, 여백 57px (15mm)
const A4_WIDTH_PX = 794
const MARGIN_PX = 57
const CONTENT_WIDTH_PX = A4_WIDTH_PX - MARGIN_PX * 2

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_MM = 15
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2

const PRETENDARD_CSS = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css'

const BASE_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body, div, span, p, h1, h2, h3 {
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  body { font-size: 13px; line-height: 1.6; color: #1e293b; background: white; }

  .pdf-root { padding: 0; }

  .header { border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 6px; color: #0f172a; }
  .header-meta { display: flex; gap: 20px; font-size: 12px; color: #64748b; }

  .info-line { margin-bottom: 24px; font-size: 13px; color: #64748b; }
  .info-line b { font-weight: 700; color: #1e293b; margin-left: 2px; }

  .student-info { display: flex; gap: 32px; margin-bottom: 28px; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
  .student-field { font-size: 13px; color: #475569; display: flex; align-items: center; gap: 4px; }
  .student-field-label { color: #94a3b8; }
  .student-field-blank { display: inline-block; width: 130px; border-bottom: 1px solid #94a3b8; }

  .question { margin-bottom: 22px; }
  .q-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .q-number {
    font-size: 14px; font-weight: 800; color: #1e293b;
    margin-right: 2px;
  }
  .q-meta { font-size: 12px; color: #94a3b8; font-weight: 500; }
  .q-text { font-size: 14px; line-height: 1.75; margin-bottom: 10px; padding-left: 34px; color: #1e293b; }

  .options { padding-left: 34px; }
  .option { padding: 4px 0; font-size: 13px; line-height: 1.6; color: #334155; }
  .option.selected { background: #e8f3ff; padding: 4px 10px; border-radius: 4px; font-weight: 600; }
  .option-label { font-weight: 600; color: #475569; margin-right: 6px; }

  .answer-blank { padding-left: 34px; font-size: 13px; color: #94a3b8; margin-top: 6px; }
  .essay-blank { margin-left: 34px; height: 90px; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px; }
  .student-answer { padding: 10px 14px; margin-left: 34px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; white-space: pre-wrap; max-height: 200px; overflow: hidden; color: #334155; }

  .q-score { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .q-score.correct { background: #dcfce7; color: #166534; }
  .q-score.wrong { background: #fee2e2; color: #991b1b; }
  .q-score.pending { background: #fef3c7; color: #92400e; }

  .student-box { display: flex; gap: 24px; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; font-size: 13px; align-items: center; }
  .student-item { display: flex; gap: 6px; align-items: center; }
  .student-label { color: #94a3b8; }
  .student-value { font-weight: 600; color: #1e293b; }
  .total-score { margin-left: auto; font-size: 16px; font-weight: 800; color: #3182F6; }

  .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
`

function buildQuestionHtml(q, i) {
  const typeLabel = QUIZ_TYPES[q.type]?.label || q.type
  const diffLabel = q.difficulty ? ` [${DIFFICULTY_LABELS[q.difficulty]}]` : ''

  let answerHtml = ''
  if (q.type === 'multiple_choice' || q.type === 'multiple_answers') {
    const opts = q.options || q.choices || []
    answerHtml = `<div class="options">${opts.map((opt, j) => `<div class="option"><span class="option-label">${String.fromCharCode(65 + j)}.</span> ${esc(String(opt))}</div>`).join('')}</div>`
  } else if (q.type === 'true_false') {
    answerHtml = `<div class="options"><div class="option"><span class="option-label">A.</span> 참 (True)</div><div class="option"><span class="option-label">B.</span> 거짓 (False)</div></div>`
  } else if (q.type === 'short_answer' || q.type === 'numerical') {
    answerHtml = `<div class="answer-blank">답: ____________________</div>`
  } else if (q.type === 'essay') {
    answerHtml = `<div class="essay-blank"></div>`
  } else if (q.type === 'file_upload') {
    const types = (q.allowedFileTypes || []).map(t => t.toUpperCase()).join(', ')
    answerHtml = `<div class="answer-blank" style="color:#64748b;">파일을 첨부하세요.${types ? ` (허용 형식: ${esc(types)})` : ''}</div>`
  } else {
    answerHtml = `<div class="answer-blank">답안을 작성하세요.</div>`
  }

  return `<div class="question"><div class="q-header"><span class="q-number">Q${i + 1}.</span><span class="q-meta">${typeLabel}${diffLabel} / ${q.points}점</span></div><div class="q-text">${esc(q.text)}</div>${answerHtml}</div>`
}

function buildAnswerQuestionHtml(q, i, answer, score, isCorrect) {
  const typeLabel = QUIZ_TYPES[q.type]?.label || q.type
  const scoreBadge = score !== null && score !== undefined
    ? `<span class="q-score ${isCorrect ? 'correct' : 'wrong'}">${score}점</span>`
    : '<span class="q-score pending">채점 대기</span>'

  let answerHtml = ''
  if (q.type === 'multiple_choice' || q.type === 'multiple_answers') {
    const opts = q.options || q.choices || []
    answerHtml = `<div class="options">${opts.map((opt, j) => {
      const isSelected = String(answer) === String(opt) || String(answer) === String(j)
      return `<div class="option ${isSelected ? 'selected' : ''}"><span class="option-label">${String.fromCharCode(65 + j)}.</span> ${esc(String(opt))}</div>`
    }).join('')}</div>`
  } else if (q.type === 'true_false') {
    const isTrue = String(answer).toLowerCase() === 'true' || answer === '참'
    const isFalse = String(answer).toLowerCase() === 'false' || answer === '거짓'
    answerHtml = `<div class="options"><div class="option ${isTrue ? 'selected' : ''}"><span class="option-label">A.</span> 참</div><div class="option ${isFalse ? 'selected' : ''}"><span class="option-label">B.</span> 거짓</div></div>`
  } else if (q.type === 'file_upload') {
    answerHtml = `<div class="student-answer" style="color:#64748b;">(파일 첨부 문항 - 별도 확인 필요)</div>`
  } else {
    answerHtml = `<div class="student-answer">${esc(String(answer || '(미응답)'))}</div>`
  }

  return `<div class="question"><div class="q-header"><span class="q-number">Q${i + 1}.</span><span class="q-meta">${typeLabel} / ${q.points}점</span>${scoreBadge}</div><div class="q-text">${esc(q.text)}</div>${answerHtml}</div>`
}

/**
 * iframe 내부에서 HTML을 렌더링하고 폰트 로딩 후 html2canvas로 캡처
 */
async function createIframeAndCapture(htmlContent) {
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, {
    position: 'absolute',
    left: '-9999px',
    top: '0',
    width: CONTENT_WIDTH_PX + 'px',
    border: 'none',
    visibility: 'hidden',
  })
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument
  iframeDoc.open()
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="${PRETENDARD_CSS}" crossorigin="anonymous">
</head>
<body style="margin:0;padding:0;background:white;width:${CONTENT_WIDTH_PX}px;">
  <div class="pdf-root">${htmlContent}</div>
</body>
</html>`)
  iframeDoc.close()

  // CSS stylesheet 로딩 대기
  const linkEl = iframeDoc.querySelector('link[rel="stylesheet"]')
  if (linkEl) {
    await new Promise((resolve) => {
      linkEl.addEventListener('load', resolve)
      linkEl.addEventListener('error', resolve)
      setTimeout(resolve, 3000)
    })
  }

  // 폰트 로딩 대기
  try {
    await iframeDoc.fonts.ready
    // 한글 폰트가 실제로 로딩될 때까지 체크
    const testLoaded = await Promise.race([
      iframeDoc.fonts.load('400 16px Pretendard').then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 2000)),
    ])
    if (!testLoaded) {
      // 폰트 로딩 실패해도 진행 (시스템 폰트 fallback)
      console.warn('Pretendard 폰트 로딩 타임아웃, fallback 폰트 사용')
    }
  } catch {
    // fonts API 지원하지 않는 경우 대기
    await new Promise(r => setTimeout(r, 1000))
  }

  // 레이아웃 반영 대기
  await new Promise(r => setTimeout(r, 100))

  const body = iframeDoc.body
  iframe.style.height = body.scrollHeight + 'px'
  iframe.style.visibility = 'visible'

  const canvas = await html2canvas(body, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: CONTENT_WIDTH_PX,
    windowWidth: CONTENT_WIDTH_PX,
    windowHeight: body.scrollHeight,
  })

  document.body.removeChild(iframe)
  return canvas
}

/**
 * canvas를 A4 PDF 페이지들로 분할하여 저장
 */
function canvasToPdf(canvas, _filename) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const imgWidth = CONTENT_WIDTH_MM
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  if (imgHeight <= CONTENT_HEIGHT_MM) {
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, imgWidth, imgHeight)
  } else {
    const totalPages = Math.ceil(imgHeight / CONTENT_HEIGHT_MM)
    const srcPageHeight = Math.floor(canvas.height / totalPages)

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage()

      const srcY = i * srcPageHeight
      const srcH = Math.min(srcPageHeight, canvas.height - srcY)

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = srcH
      const ctx = pageCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

      const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95)
      const pageH = (srcH * imgWidth) / canvas.width
      pdf.addImage(pageImg, 'JPEG', MARGIN_MM, MARGIN_MM, imgWidth, pageH)
    }
  }

  return pdf
}

/**
 * 시험 문제지 PDF 다운로드
 */
export async function printQuizQuestions(quiz, questions) {
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  const questionsHtml = questions.map((q, i) => buildQuestionHtml(q, i)).join('')

  const html = `<style>${BASE_STYLE}</style>
    <div class="header">
      <h1>${esc(quiz.title)}</h1>
      <div class="header-meta">
        <span>${esc(quiz.course || '')}</span>
        ${quiz.week ? `<span>${quiz.week}주차 ${quiz.session || ''}차시</span>` : ''}
      </div>
    </div>
    <p class="info-line">문항 수 <b>${questions.length}문항</b> &nbsp;&nbsp;&nbsp; 총점 <b>${totalPoints}점</b>${quiz.timeLimit ? ` &nbsp;&nbsp;&nbsp; 시간 제한 <b>${quiz.timeLimit}분</b>` : ''}</p>
    <div class="student-info">
      <div class="student-field"><span class="student-field-label">학번</span><span class="student-field-blank"></span></div>
      <div class="student-field"><span class="student-field-label">이름</span><span class="student-field-blank"></span></div>
      <div class="student-field"><span class="student-field-label">학과</span><span class="student-field-blank"></span></div>
    </div>
    ${questionsHtml}
    <div class="footer">- ${questions.length}문항 / ${totalPoints}점 -</div>`

  const canvas = await createIframeAndCapture(html)
  const pdf = canvasToPdf(canvas, `${quiz.title}_문제지.pdf`)
  pdf.save(`${quiz.title}_문제지.pdf`)
}

/**
 * 학생 개별 답안지 PDF 다운로드
 */
export async function printStudentAnswerSheet(quiz, questions, student, getAnswer) {
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  const totalScore = student.score !== null ? student.score : '채점 중'

  const questionsHtml = questions.map((q, i) => {
    const answer = getAnswer(q.id)
    const autoScore = student.autoScores?.[q.id]
    const manualScore = student.manualScores?.[q.id]
    const score = manualScore ?? autoScore
    const isCorrect = score !== null && score !== undefined && score > 0
    return buildAnswerQuestionHtml(q, i, answer, score, isCorrect)
  }).join('')

  const html = `<style>${BASE_STYLE}</style>
    <div class="header">
      <h1>${esc(quiz.title)}</h1>
      <div class="header-meta">${esc(quiz.course || '')} ${quiz.week ? `/ ${quiz.week}주차` : ''}</div>
    </div>
    <div class="student-box">
      <div class="student-item"><span class="student-label">학번</span><span class="student-value">${student.studentId}</span></div>
      <div class="student-item"><span class="student-label">이름</span><span class="student-value">${student.name}</span></div>
      <div class="student-item"><span class="student-label">학과</span><span class="student-value">${student.department}</span></div>
      <div class="student-item"><span class="student-label">제출</span><span class="student-value">${student.submittedAt || '-'}</span></div>
      <div class="total-score">${totalScore}${typeof totalScore === 'number' ? ` / ${totalPoints}` : ''}</div>
    </div>
    ${questionsHtml}
    <div class="footer">- ${student.name} (${student.studentId}) / ${questions.length}문항 -</div>`

  const canvas = await createIframeAndCapture(html)
  const pdf = canvasToPdf(canvas, `${quiz.title}_${student.name}_답안지.pdf`)
  pdf.save(`${quiz.title}_${student.name}_답안지.pdf`)
}

/**
 * 다수 학생 답안지 일괄 PDF 다운로드
 */
export async function printBulkAnswerSheets(quiz, questions, students, getAnswerFn) {
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  let pdf = null

  for (let si = 0; si < students.length; si++) {
    const student = students[si]
    const totalScore = student.score !== null ? student.score : '채점 중'
    const questionsHtml = questions.map((q, i) => {
      const answer = getAnswerFn(student, q.id)
      const autoScore = student.autoScores?.[q.id]
      const manualScore = student.manualScores?.[q.id]
      const score = manualScore ?? autoScore
      const isCorrect = score !== null && score !== undefined && score > 0
      return buildAnswerQuestionHtml(q, i, answer, score, isCorrect)
    }).join('')

    const sheetHtml = `<style>${BASE_STYLE}</style>
      <div class="header">
        <h1>${esc(quiz.title)}</h1>
        <div class="header-meta">${esc(quiz.course || '')} / ${si + 1} of ${students.length}</div>
      </div>
      <div class="student-box">
        <div class="student-item"><span class="student-label">학번</span><span class="student-value">${student.studentId}</span></div>
        <div class="student-item"><span class="student-label">이름</span><span class="student-value">${student.name}</span></div>
        <div class="student-item"><span class="student-label">학과</span><span class="student-value">${student.department}</span></div>
        <div class="total-score">${totalScore}${typeof totalScore === 'number' ? ` / ${totalPoints}` : ''}</div>
      </div>
      ${questionsHtml}
      <div class="footer">- ${si + 1} / ${students.length} - ${student.name} (${student.studentId}) -</div>`

    const canvas = await createIframeAndCapture(sheetHtml)

    if (si === 0) {
      pdf = canvasToPdf(canvas)
    } else {
      // 이후 학생은 기존 PDF에 페이지 추가
      const imgWidth = CONTENT_WIDTH_MM
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      if (imgHeight <= CONTENT_HEIGHT_MM) {
        pdf.addPage()
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, imgWidth, imgHeight)
      } else {
        const totalPages = Math.ceil(imgHeight / CONTENT_HEIGHT_MM)
        const srcPageHeight = Math.floor(canvas.height / totalPages)

        for (let p = 0; p < totalPages; p++) {
          pdf.addPage()
          const srcY = p * srcPageHeight
          const srcH = Math.min(srcPageHeight, canvas.height - srcY)

          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = canvas.width
          pageCanvas.height = srcH
          const ctx = pageCanvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

          const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95)
          const pageH = (srcH * imgWidth) / canvas.width
          pdf.addImage(pageImg, 'JPEG', MARGIN_MM, MARGIN_MM, imgWidth, pageH)
        }
      }
    }
  }

  if (pdf) pdf.save(`${quiz.title}_답안지_일괄(${students.length}명).pdf`)
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
