import { QUIZ_TYPES } from '../data/mockData'

const DIFFICULTY_LABELS = { high: '상', medium: '중', low: '하' }

// html2pdf.js 동적 import (번들 분리)
async function getHtml2Pdf() {
  const mod = await import('html2pdf.js')
  return mod.default
}

const BASE_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; color: #1e293b; font-size: 13px; line-height: 1.6; }

  .header { border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
  .header-meta { display: flex; gap: 20px; font-size: 12px; color: #64748b; }

  .info-row { display: flex; gap: 32px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; }
  .info-item { display: flex; gap: 6px; }
  .info-label { color: #94a3b8; }
  .info-value { font-weight: 600; color: #334155; }

  .student-info { display: flex; gap: 24px; margin-bottom: 24px; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
  .student-field { font-size: 13px; color: #475569; }
  .student-field-label { color: #94a3b8; margin-right: 4px; }
  .student-field-blank { display: inline-block; width: 120px; border-bottom: 1px solid #94a3b8; }

  .question { margin-bottom: 20px; page-break-inside: avoid; }
  .q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .q-number { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #1e293b; color: white; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .q-meta { font-size: 11px; color: #94a3b8; }
  .q-text { font-size: 13.5px; line-height: 1.7; margin-bottom: 8px; padding-left: 30px; }

  .options { padding-left: 30px; }
  .option { padding: 3px 0; font-size: 13px; }
  .option.selected { background: #e8f3ff; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
  .option-label { font-weight: 600; color: #475569; margin-right: 4px; }

  .answer-blank { padding-left: 30px; font-size: 13px; color: #94a3b8; margin-top: 4px; }
  .essay-blank { margin-left: 30px; height: 80px; border: 1px solid #e2e8f0; border-radius: 4px; margin-top: 4px; }
  .student-answer { padding: 8px 12px; margin-left: 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px; white-space: pre-wrap; max-height: 200px; overflow: hidden; }

  .q-score { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
  .q-score.correct { background: #dcfce7; color: #166534; }
  .q-score.wrong { background: #fee2e2; color: #991b1b; }
  .q-score.pending { background: #fef3c7; color: #92400e; }

  .student-box { display: flex; gap: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
  .student-item { display: flex; gap: 6px; }
  .student-label { color: #94a3b8; }
  .student-value { font-weight: 600; }
  .total-score { margin-left: auto; font-size: 15px; font-weight: 800; color: #3182F6; }

  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
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

  return `<div class="question"><div class="q-header"><span class="q-number">${i + 1}</span><span class="q-meta">${typeLabel}${diffLabel} / ${q.points}점</span></div><div class="q-text">${esc(q.text)}</div>${answerHtml}</div>`
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

  return `<div class="question"><div class="q-header"><span class="q-number">${i + 1}</span><span class="q-meta">${typeLabel} / ${q.points}점</span>${scoreBadge}</div><div class="q-text">${esc(q.text)}</div>${answerHtml}</div>`
}

async function renderToPdf(htmlContent, filename) {
  const html2pdf = await getHtml2Pdf()
  const container = document.createElement('div')
  container.innerHTML = htmlContent
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '210mm'
  document.body.appendChild(container)

  try {
    await html2pdf().set({
      margin: [15, 15, 15, 15],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(container).save()
  } finally {
    document.body.removeChild(container)
  }
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
    <div class="info-row">
      <div class="info-item"><span class="info-label">문항 수</span><span class="info-value">${questions.length}문항</span></div>
      <div class="info-item"><span class="info-label">총점</span><span class="info-value">${totalPoints}점</span></div>
      ${quiz.timeLimit ? `<div class="info-item"><span class="info-label">시간 제한</span><span class="info-value">${quiz.timeLimit}분</span></div>` : ''}
    </div>
    <div class="student-info">
      <div class="student-field"><span class="student-field-label">학번</span><span class="student-field-blank"></span></div>
      <div class="student-field"><span class="student-field-label">이름</span><span class="student-field-blank"></span></div>
      <div class="student-field"><span class="student-field-label">학과</span><span class="student-field-blank"></span></div>
    </div>
    ${questionsHtml}
    <div class="footer">- ${questions.length}문항 / ${totalPoints}점 -</div>`

  await renderToPdf(html, `${quiz.title}_문제지.pdf`)
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

  await renderToPdf(html, `${quiz.title}_${student.name}_답안지.pdf`)
}

/**
 * 다수 학생 답안지 일괄 PDF 다운로드 (page-break로 분리)
 */
export async function printBulkAnswerSheets(quiz, questions, students, getAnswerFn) {
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)

  const sheetsHtml = students.map((student, si) => {
    const totalScore = student.score !== null ? student.score : '채점 중'
    const questionsHtml = questions.map((q, i) => {
      const answer = getAnswerFn(student, q.id)
      const autoScore = student.autoScores?.[q.id]
      const manualScore = student.manualScores?.[q.id]
      const score = manualScore ?? autoScore
      const isCorrect = score !== null && score !== undefined && score > 0
      return buildAnswerQuestionHtml(q, i, answer, score, isCorrect)
    }).join('')

    return `<div ${si > 0 ? 'style="page-break-before:always;"' : ''}>
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
      <div class="footer">- ${si + 1} / ${students.length} - ${student.name} (${student.studentId}) -</div>
    </div>`
  }).join('')

  const html = `<style>${BASE_STYLE}</style>${sheetsHtml}`
  await renderToPdf(html, `${quiz.title}_답안지_일괄(${students.length}명).pdf`)
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
