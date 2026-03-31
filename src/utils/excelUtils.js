import * as XLSX from 'xlsx'
import { QUIZ_TYPES } from '../data/mockData'

// ── 성적 다운로드 (QuizStats) ───────────────────────────────────────────────
export function downloadGradesXlsx(quiz, students) {
  const headers = ['이름', '학번', '학과', `점수 (/${quiz.totalPoints}점)`, '자동채점', '수동채점', '채점 상태']
  const rows = students.map(s => {
    const autoTotal = s.autoScores ? Object.values(s.autoScores).reduce((a, b) => a + b, 0) : ''
    const manualTotal = s.manualScores ? Object.values(s.manualScores).reduce((a, b) => a + b, 0) : ''
    return [
      s.name,
      s.studentId,
      s.department,
      s.score ?? '',
      autoTotal,
      manualTotal,
      s.score !== null && s.score !== undefined ? '채점 완료' : '미채점',
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]

  // 헤더 행 볼드
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '성적')
  XLSX.writeFile(wb, `성적_${quiz.title}.xlsx`)
}

// ── 답안지 다운로드 (GradingDashboard) ────────────────────────────────────
export function downloadAnswerSheetsXlsx(quizInfo, students, questions, { getStudentAnswer } = {}) {
  if (!questions.length) return

  // localStorage 실제 제출 답안 로드
  let localAttempts = []
  try {
    const raw = localStorage.getItem('xnq_student_attempts')
    const all = raw ? JSON.parse(raw) : {}
    localAttempts = all[quizInfo.id] || []
  } catch { /* ignore */ }

  const qHeaders = questions.map(q => `Q${q.order}(${q.points}점)`)
  const headers = ['이름', '학번', '학과', '제출경로', ...qHeaders, '자동채점합계', '수동채점합계', '총점']

  const mockRows = students.map((s, idx) => {
    const answers = questions.map(q => (getStudentAnswer ? getStudentAnswer(idx, q.id) : '') ?? '')
    const autoTotal = s.autoScores ? Object.values(s.autoScores).reduce((a, b) => a + b, 0) : ''
    const manualTotal = s.manualScores ? Object.values(s.manualScores).reduce((a, b) => a + b, 0) : ''
    return [s.name, s.studentId, s.department, '기존데이터', ...answers, autoTotal, manualTotal, s.score ?? '']
  })

  const localRows = localAttempts.map(attempt => {
    const answers = questions.map(q => attempt.answers?.[q.id] ?? '')
    const autoTotal = attempt.totalAutoScore ?? ''
    return [attempt.studentName, attempt.studentNumber, attempt.department, '학생직접제출', ...answers, autoTotal, '', autoTotal]
  })

  const allRows = [...mockRows, ...localRows]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...allRows])

  // 컬럼 너비
  const colWidths = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }]
  questions.forEach(() => colWidths.push({ wch: 16 }))
  colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 8 })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '답안지')
  XLSX.writeFile(wb, `답안지_${quizInfo.title}.xlsx`)
}

// ── 일괄 채점 양식 다운로드 (ExcelModal) ──────────────────────────────────
export function downloadGradingSheetXlsx(question, students) {
  if (!question) return
  const headers = ['이름', '학번', '학과', '현재 점수', `새 점수 (0~${question.points}점 입력)`]
  const rows = students.map(s => {
    const currentScore = s.manualScores?.[question.id] ?? ''
    return [s.name, s.studentId, s.department, currentScore, '']
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 22 }]
  // 헤더 볼드
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '채점양식')
  XLSX.writeFile(wb, `채점양식_Q${question.order}.xlsx`)
}

// ── 문항 업로드 템플릿 다운로드 (QuestionBank) ────────────────────────────
export function downloadQuestionTemplate() {
  const headers = ['유형', '문항 내용', '배점', '정답(선택)', '보기1', '보기2', '보기3', '보기4', '보기5', '해설(선택)']
  const exampleRows = [
    ['multiple_choice', 'SQL에서 테이블을 생성하는 명령어는?', 5, 'CREATE TABLE', 'SELECT', 'INSERT', 'CREATE TABLE', 'DROP', '', ''],
    ['true_false', 'PRIMARY KEY는 NULL 값을 허용한다.', 5, '거짓', '', '', '', '', '', ''],
    ['short_answer', 'DDL의 약자를 쓰시오.', 5, 'Data Definition Language', '', '', '', '', '', ''],
    ['essay', '트랜잭션의 ACID 속성에 대해 서술하시오.', 15, '', '', '', '', '', '', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])
  ws['!cols'] = [{ wch: 24 }, { wch: 40 }, { wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 30 }]
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })

  // 두 번째 시트: 유효한 유형 코드
  const typeHeaders = ['유형 코드', '한국어 이름', '자동채점 여부']
  const typeRows = Object.entries(QUIZ_TYPES).map(([k, v]) => [
    k,
    v.label,
    v.autoGrade === true ? '자동' : v.autoGrade === 'partial' ? '부분 자동' : '수동',
  ])
  const ws2 = XLSX.utils.aoa_to_sheet([typeHeaders, ...typeRows])
  ws2['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '문항 데이터')
  XLSX.utils.book_append_sheet(wb, ws2, '유효한 유형 코드')
  XLSX.writeFile(wb, '문항_업로드_템플릿.xlsx')
}

// ── 엑셀/CSV 파싱 (QuestionBank 업로드) ───────────────────────────────────
export function parseExcelOrCsv(file) {
  return new Promise((resolve) => {
    if (file.size > 5 * 1024 * 1024) {
      resolve({ error: '파일 크기가 5MB를 초과합니다.' })
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (raw.length < 2) {
          resolve({ error: '데이터 행이 없습니다.' })
          return
        }

        const validTypes = Object.keys(QUIZ_TYPES)
        const rows = []

        for (let i = 1; i < raw.length; i++) {
          const [typeRaw, textRaw, pointsRaw, answer = '', c1 = '', c2 = '', c3 = '', c4 = '', c5 = '', explanation = ''] = raw[i].map(v => String(v ?? '').trim())
          const rowNum = i + 1

          if (!typeRaw && !textRaw && !pointsRaw) continue // 빈 행 건너뜀

          if (!validTypes.includes(typeRaw)) {
            resolve({ error: `${rowNum}행: 지원하지 않는 유형 "${typeRaw}"입니다.` })
            return
          }
          if (!textRaw) {
            resolve({ error: `${rowNum}행: 문항 내용이 비어있습니다.` })
            return
          }
          const points = parseInt(pointsRaw, 10)
          if (isNaN(points) || points <= 0) {
            resolve({ error: `${rowNum}행: 배점이 유효하지 않습니다 (양의 정수여야 합니다).` })
            return
          }

          const choices = [c1, c2, c3, c4, c5].filter(Boolean)
          rows.push({ type: typeRaw, text: textRaw, points, answer, choices, explanation })
        }

        if (rows.length === 0) {
          resolve({ error: '데이터 행이 없습니다.' })
          return
        }

        resolve({ rows })
      } catch {
        resolve({ error: '파일을 읽을 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식입니다.' })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}
